import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import {
  getBannerCatalog, getSlot, getInfeedEveryRows, isTestMode,
  quoteOrder, bookedRanges, overlapCount, bookingEnd,
  type OrderLine,
} from '../lib/bannerAdvertising'
import { BANNER_SLOT_IDS, BANNER_MAX_MONTHS, BANNER_DURATIONS } from '@grabitt/design-tokens'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'
const POSITIONS = BANNER_SLOT_IDS as unknown as [string, ...string[]]

// A line the buyer wants: slot, optional page, months, and an ISO start date.
const OrderLineInput = z.object({
  position: z.enum(POSITIONS),
  pageTarget: z.string().optional(),
  months: z.number().int().min(1).max(BANNER_MAX_MONTHS),
  startsAt: z.string(),
})

export const bannersRouter = router({
  // Admin: all banners for management (any status/position).
  all: execProcedure.query(({ ctx }) =>
    ctx.prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] })
  ),

  // Public: the sellable slot catalogue (active slots only) + buyable durations.
  catalog: publicProcedure.query(async ({ ctx }) => ({
    slots: (await getBannerCatalog(ctx.prisma)).filter(s => s.active),
    durations: BANNER_DURATIONS,
    maxMonths: BANNER_MAX_MONTHS,
  })),

  // Public: how many listing rows between in-feed category banners.
  infeedConfig: publicProcedure.query(async ({ ctx }) => ({ everyRows: await getInfeedEveryRows(ctx.prisma) })),

  // Public: whether admin test/preview mode is on (empty slots render a labelled
  // placeholder so admins can see every banner position pre-launch).
  previewMode: publicProcedure.query(async ({ ctx }) => ({ on: await isTestMode(ctx.prisma) })),

  // Public: booked date ranges for a slot+page (feeds the order date picker so a
  // buyer can't pick a taken window on an exclusive slot).
  availability: publicProcedure
    .input(z.object({ position: z.enum(POSITIONS), pageTarget: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const slot = await getSlot(ctx.prisma, input.position)
      const ranges = await bookedRanges(ctx.prisma, input.position, input.pageTarget ?? null)
      return { cap: slot?.cap ?? 1, exclusive: slot?.exclusive ?? false, ranges }
    }),

  // Public: price an order (proration + auto-discounts) without committing.
  quote: publicProcedure
    .input(z.object({ lines: z.array(OrderLineInput).min(1).max(12) }))
    .query(({ ctx, input }) => quoteOrder(ctx.prisma, input.lines.map(toLine))),

  // Buyer: place a banner order. Re-quotes server-side, checks availability for
  // every line, then starts a Stripe payment. Bookings + banners are provisioned
  // by the webhook on payment success (banners start unapproved for review).
  order: protectedProcedure
    .input(z.object({ lines: z.array(OrderLineInput).min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true } })
      const lines = input.lines.map(toLine)
      const catalog = await getBannerCatalog(ctx.prisma)

      for (const l of lines) {
        const slot = catalog.find(s => s.id === l.position)
        if (!slot || !slot.active) throw new TRPCError({ code: 'BAD_REQUEST', message: `Slot ${l.position} is not available.` })
        if (slot.perPage && !l.pageTarget) throw new TRPCError({ code: 'BAD_REQUEST', message: `${slot.label} needs a page.` })
        const end = bookingEnd(l.startsAt, l.months)
        const taken = await overlapCount(ctx.prisma, l.position, l.pageTarget ?? null, l.startsAt, end)
        if (taken >= slot.cap) throw new TRPCError({ code: 'CONFLICT', message: `${slot.label}${l.pageTarget ? ` · ${l.pageTarget}` : ''} is fully booked for those dates.` })
      }

      const quote = await quoteOrder(ctx.prisma, lines)
      const basket = lines.map(l => `${l.position}|${l.pageTarget ?? ''}|${l.months}|${l.startsAt.toISOString()}`).join(',')

      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: quote.totalCents, product_data: { name: `Grabitt banner advertising — ${lines.length} placement${lines.length === 1 ? '' : 's'}${quote.discountPct ? ` (−${quote.discountPct}%)` : ''}` } } }],
        payment_intent_data: { metadata: { kind: 'banner_order', userId: ctx.user.id, basket } },
        success_url: `${appUrl()}/account?tab=business&banner=success`,
        cancel_url: `${appUrl()}/employers?banner=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url, quote }
    }),

  // Public: record a banner click and return where to send the visitor.
  trackClick: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.prisma.banner.update({ where: { id: input.id }, data: { clickCount: { increment: 1 } }, select: { linkUrl: true } }).catch(() => null)
      return { url: b?.linkUrl ?? null }
    }),

  // Public: record impressions (fire-and-forget from the client).
  trackImpression: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.prisma.banner.update({ where: { id: input.id }, data: { impressions: { increment: 1 } } }).then(() => ({ ok: true })).catch(() => ({ ok: false }))),

  // Admin: approve (or un-approve) a banner so it can go live.
  setApproved: execProcedure
    .input(z.object({ id: z.string().uuid(), approved: z.boolean() }))
    .mutation(({ ctx, input }) => ctx.prisma.banner.update({ where: { id: input.id }, data: { approved: input.approved } })),

  // Admin: remove a banner.
  remove: execProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.prisma.banner.delete({ where: { id: input.id } })),

  active: publicProcedure
    .input(z.object({
      position: z.enum(POSITIONS),
      // Optional page/category slug. When given, returns banners targeting that
      // page plus site-wide ones (pageTarget null); when omitted, only site-wide.
      page: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const testMode = await isTestMode(ctx.prisma)
      return ctx.prisma.banner.findMany({
        where: {
          position: input.position as never,
          active: true,
          AND: [
            // Approved real banners always show. Test banners show only in test mode.
            testMode ? { OR: [{ approved: true, isTest: false }, { isTest: true }] } : { approved: true, isTest: false },
            input.page ? { OR: [{ pageTarget: input.page }, { pageTarget: null }] } : { pageTarget: null },
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      })
    }),

  upsert: execProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      title: z.string(),
      imageUrl: z.string().url(),
      linkUrl: z.string().url().optional(),
      active: z.boolean(),
      isTest: z.boolean().optional(),
      position: z.enum(POSITIONS),
      pageTarget: z.string().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      const parsed = {
        ...data,
        pageTarget: data.pageTarget || null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      }
      // Admin-created/edited banners are approved by the act of an admin saving them.
      if (id) return ctx.prisma.banner.update({ where: { id }, data: parsed as never })
      return ctx.prisma.banner.create({ data: { ...(parsed as never as object), approved: true } as never })
    }),

  // ── Admin: pricing, config & test mode ──────────────────────────────────────
  adminCatalog: execProcedure.query(({ ctx }) => getBannerCatalog(ctx.prisma)),

  config: execProcedure.query(async ({ ctx }) => {
    const row = await ctx.prisma.bannerConfig.findUnique({ where: { id: 'default' } })
    const data = (row?.data as Record<string, unknown> | undefined) ?? {}
    return { testMode: data.testMode === true, infeedEveryRows: await getInfeedEveryRows(ctx.prisma), discounts: data.discounts ?? null }
  }),

  saveConfig: execProcedure
    .input(z.object({
      slots: z.record(z.object({ monthlyCents: z.number().int().min(0).optional(), cap: z.number().int().min(1).optional(), active: z.boolean().optional() })).optional(),
      infeedEveryRows: z.number().int().min(1).max(20).optional(),
      testMode: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.bannerConfig.findUnique({ where: { id: 'default' } })
      const cur = (row?.data as Record<string, unknown> | undefined) ?? {}
      const next = {
        ...cur,
        ...(input.slots ? { slots: { ...(cur.slots as object ?? {}), ...input.slots } } : {}),
        ...(input.infeedEveryRows != null ? { infeedEveryRows: input.infeedEveryRows } : {}),
        ...(input.testMode != null ? { testMode: input.testMode } : {}),
      }
      return ctx.prisma.bannerConfig.upsert({ where: { id: 'default' }, create: { id: 'default', data: next }, update: { data: next } })
    }),

  // ── Admin: bookings & override ───────────────────────────────────────────────
  bookings: execProcedure.query(({ ctx }) =>
    ctx.prisma.bannerBooking.findMany({
      where: { status: 'active', endsAt: { gt: new Date() } },
      orderBy: { startsAt: 'asc' },
      include: { user: { select: { displayName: true, email: true, businessName: true } } },
    })
  ),

  // Admin override: book a slot for any user directly (bypasses payment and can
  // ignore availability). Optionally provisions an approved banner immediately.
  createBooking: execProcedure
    .input(z.object({
      userId: z.string(),
      position: z.enum(POSITIONS),
      pageTarget: z.string().optional(),
      months: z.number().int().min(1).max(BANNER_MAX_MONTHS),
      startsAt: z.string(),
      amountCents: z.number().int().min(0).optional(),
      imageUrl: z.string().url().optional(),
      linkUrl: z.string().url().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.startsAt)
      const end = bookingEnd(start, input.months)
      const slot = await getSlot(ctx.prisma, input.position)
      const booking = await ctx.prisma.bannerBooking.create({
        data: {
          userId: input.userId, position: input.position as never, pageTarget: input.pageTarget || null,
          months: input.months, startsAt: start, endsAt: end,
          amountCents: input.amountCents ?? (slot ? slot.monthlyCents * input.months : 0),
          status: 'active', createdByAdmin: true,
        },
      })
      if (input.imageUrl) {
        await ctx.prisma.banner.create({
          data: {
            title: input.title ?? slot?.label ?? 'Sponsor', imageUrl: input.imageUrl, linkUrl: input.linkUrl ?? null,
            position: input.position as never, pageTarget: input.pageTarget || null,
            active: true, approved: true, bookingId: booking.id, startsAt: start, endsAt: end,
          } as never,
        })
      }
      return booking
    }),

  cancelBooking: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.banner.updateMany({ where: { bookingId: input.id }, data: { active: false } })
      return ctx.prisma.bannerBooking.update({ where: { id: input.id }, data: { status: 'cancelled' } })
    }),
})

function toLine(l: z.infer<typeof OrderLineInput>): OrderLine {
  return { position: l.position, pageTarget: l.pageTarget ?? null, months: l.months, startsAt: new Date(l.startsAt) }
}
