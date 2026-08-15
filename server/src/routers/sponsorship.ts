import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { getSponsorshipCatalog, sponsorMonthlyCents, SPONSOR_DURATIONS, SPONSOR_PAGES, bannerForAddon, blastKind, addonLineCents, isValidAddonQty } from '../lib/sponsorshipPricing'
import { BUSINESS_ADDON_IDS, BLAST_BUNDLES } from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// Category Sponsor is exclusive — one advertiser per page for any overlapping
// period. Throws if the page is already taken.
async function assertCategoryFree(prisma: PrismaClient, pageTarget: string | undefined) {
  if (!pageTarget) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick which category page to sponsor.' })
  const clash = await prisma.sponsorshipGrant.findFirst({ where: { addonId: 'category_sponsor', pageTarget, status: 'active', endsAt: { gt: new Date() } } })
  if (clash) throw new TRPCError({ code: 'CONFLICT', message: `That category is already sponsored until ${clash.endsAt.toLocaleDateString('en-GB')}. Choose another page or come back later.` })
}

export const sponsorshipRouter = router({
  catalog: publicProcedure.query(async ({ ctx }) => ({
    items: (await getSponsorshipCatalog(ctx.prisma)).filter(i => i.active),
    durations: SPONSOR_DURATIONS,
    pages: SPONSOR_PAGES,
  })),

  // Direct-marketing blast bundles (email/whatsapp) + the buyer's remaining sends.
  blastBundles: publicProcedure.query(() => ({
    email: Object.entries(BLAST_BUNDLES.email).map(([qty, cents]) => ({ qty: Number(qty), cents })),
    whatsapp: Object.entries(BLAST_BUNDLES.whatsapp).map(([qty, cents]) => ({ qty: Number(qty), cents })),
  })),

  myBlasts: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { emailBlastsLeft: true, whatsappBlastsLeft: true } })
    const requests = await ctx.prisma.blastRequest.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' }, take: 20 })
    return { email: me.emailBlastsLeft, whatsapp: me.whatsappBlastsLeft, requests }
  }),

  // Business composes a blast; it spends one purchased send and queues for an
  // admin to review and actually send (clients never send directly).
  submitBlast: protectedProcedure
    .input(z.object({
      channel: z.enum(['email', 'whatsapp']),
      subject: z.string().max(140).optional(),
      message: z.string().min(5).max(2000),
      linkUrl: z.string().url().optional().or(z.literal('')),
      audience: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const field = input.channel === 'whatsapp' ? 'whatsappBlastsLeft' : 'emailBlastsLeft'
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { emailBlastsLeft: true, whatsappBlastsLeft: true } })
      const left = input.channel === 'whatsapp' ? me.whatsappBlastsLeft : me.emailBlastsLeft
      if (left < 1) throw new TRPCError({ code: 'BAD_REQUEST', message: `You have no ${input.channel} sends left — buy a bundle first.` })
      await ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { [field]: { decrement: 1 } } })
      return ctx.prisma.blastRequest.create({
        data: { userId: ctx.user.id, channel: input.channel, subject: input.subject || null, message: input.message, linkUrl: input.linkUrl || null, audience: input.audience || null },
      })
    }),

  // ── Admin: the blast send queue ──────────────────────────────────────────────
  blastRequests: execProcedure
    .input(z.object({ status: z.enum(['queued', 'sent', 'rejected', 'all']).default('queued') }).optional())
    .query(({ ctx, input }) => ctx.prisma.blastRequest.findMany({
      where: input?.status && input.status !== 'all' ? { status: input.status } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { displayName: true, email: true, businessName: true } } },
    })),

  markBlastSent: execProcedure
    .input(z.object({ id: z.string(), adminNote: z.string().max(300).optional() }))
    .mutation(({ ctx, input }) => ctx.prisma.blastRequest.update({ where: { id: input.id }, data: { status: 'sent', sentAt: new Date(), adminNote: input.adminNote || null } })),

  // Reject and refund the send to the business.
  rejectBlast: execProcedure
    .input(z.object({ id: z.string(), adminNote: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.blastRequest.findUniqueOrThrow({ where: { id: input.id } })
      if (req.status === 'queued') {
        const field = req.channel === 'whatsapp' ? 'whatsappBlastsLeft' : 'emailBlastsLeft'
        await ctx.prisma.user.update({ where: { id: req.userId }, data: { [field]: { increment: 1 } } }).catch(() => {})
      }
      return ctx.prisma.blastRequest.update({ where: { id: input.id }, data: { status: 'rejected', adminNote: input.adminNote || null } })
    }),

  // Buy a blast bundle (all double opt-in). Sends are credited on payment.
  buyBlast: protectedProcedure
    .input(z.object({ channel: z.enum(['email', 'whatsapp']), qty: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const table = BLAST_BUNDLES[input.channel] as Record<number, number>
      const cents = table[input.qty]
      if (!cents) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That bundle is not available.' })
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true } })
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: cents, product_data: { name: `Grabitt ${input.channel === 'email' ? 'Email' : 'WhatsApp'} blast — ${input.qty} send${input.qty > 1 ? 's' : ''}` } } }],
        payment_intent_data: { metadata: { kind: 'blast', userId: ctx.user.id, channel: input.channel, qty: String(input.qty) } },
        success_url: `${appUrl()}/account?tab=business&blast=success`,
        cancel_url: `${appUrl()}/account?tab=business&blast=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
    }),

  // The signed-in business's live sponsorships, with whether a creative is up.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const grants = await ctx.prisma.sponsorshipGrant.findMany({
      where: { userId: ctx.user.id, status: 'active', endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
    })
    const banners = await ctx.prisma.banner.findMany({ where: { grantId: { in: grants.map(g => g.id) } }, select: { grantId: true } })
    const withCreative = new Set(banners.map(b => b.grantId))
    return grants.map(g => ({ ...g, hasCreative: withCreative.has(g.id), needsPageBanner: !!bannerForAddon(g.addonId) }))
  }),

  // Basket checkout for an existing business buying more sponsorship (one-off).
  checkout: protectedProcedure
    .input(z.object({ items: z.array(z.object({
      addonId: z.enum(BUSINESS_ADDON_IDS as [string, ...string[]]),
      // Months for timed placements; send-quantity for blasts. Validated per
      // addon type below.
      months: z.number().int().min(1),
      pageTarget: z.enum(SPONSOR_PAGES as unknown as [string, ...string[]]).optional(),
    })).min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true, isBusiness: true, businessLight: true } })
      const catalog = await getSponsorshipCatalog(ctx.prisma)
      const quarterAgo = new Date(Date.now() - 90 * 86400000)

      const lineItems: any[] = []
      const basketParts: string[] = []
      for (const item of input.items) {
        const label = catalog.find(c => c.id === item.addonId)?.label ?? item.addonId
        if (!isValidAddonQty(item.addonId, item.months)) throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid amount for ${label}` })

        // Minimum account level per Steve's terms.
        if (item.addonId === 'homepage_sponsor' && !user.isBusiness && !user.businessLight) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Homepage Sponsor needs at least a Business Light account.' })
        }
        if (blastKind(item.addonId) && !user.isBusiness) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `${label} needs a Business account.` })
        }
        // Blasts are limited to once per quarter (per blast type).
        if (blastKind(item.addonId)) {
          const recent = await ctx.prisma.sponsorshipGrant.findFirst({ where: { userId: ctx.user.id, addonId: item.addonId, createdAt: { gte: quarterAgo } }, select: { id: true } })
          if (recent) throw new TRPCError({ code: 'CONFLICT', message: `${label} is limited to once per quarter — you've already sent one in the last 90 days.` })
        }
        const b = bannerForAddon(item.addonId)
        if (b?.needsPage) await assertCategoryFree(ctx.prisma, item.pageTarget)
        const monthly = await sponsorMonthlyCents(ctx.prisma, item.addonId)
        if (monthly == null) throw new TRPCError({ code: 'BAD_REQUEST', message: `${item.addonId} is not available` })
        const total = addonLineCents(item.addonId, monthly, item.months)
        const unitWord = blastKind(item.addonId) ? (item.months === 1 ? 'send' : 'sends') : (item.months === 1 ? 'month' : 'months')
        const page = b?.needsPage ? (item.pageTarget ?? '') : ''
        lineItems.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: total, product_data: { name: `Grabitt — ${label} (${item.months} ${unitWord})${page ? ` · ${page}` : ''}` } } })
        basketParts.push(`${item.addonId}:${item.months}:${total}:${page}`)
      }

      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
        line_items: lineItems,
        payment_intent_data: { metadata: { kind: 'sponsorship', userId: ctx.user.id, basket: basketParts.join(',') } },
        success_url: `${appUrl()}/account?tab=business&sponsor=success`,
        cancel_url: `${appUrl()}/employers?sponsor=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
    }),

  // Upload / update the banner creative for a placement you bought. Provisions
  // the actual Banner in the right slot for the grant's page & window, enforcing
  // the Featured Partner cap (7 rotating per page).
  setCreative: protectedProcedure
    .input(z.object({ grantId: z.string(), imageUrl: z.string().url(), linkUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const grant = await ctx.prisma.sponsorshipGrant.findFirstOrThrow({ where: { id: input.grantId, userId: ctx.user.id } })
      const b = bannerForAddon(grant.addonId)
      if (!b) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This placement does not have a banner.' })

      const existing = await ctx.prisma.banner.findUnique({ where: { grantId: grant.id } })
      // Featured Partner rotates up to `cap` per page — don't exceed it.
      if (!existing && b.cap > 1) {
        const live = await ctx.prisma.banner.count({ where: { position: b.position as never, pageTarget: grant.pageTarget ?? null, active: true } })
        if (live >= b.cap) throw new TRPCError({ code: 'CONFLICT', message: `This slot is full (${b.cap} advertisers). Please try again when one expires.` })
      }
      const data = {
        title: `Sponsor — ${grant.addonId}`,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
        position: b.position as never,
        pageTarget: grant.pageTarget ?? null,
        active: true,
        startsAt: grant.startsAt,
        endsAt: grant.endsAt,
        grantId: grant.id,
      }
      // Self-serve banners (new or a changed creative) go to the admin approval
      // queue — they never show until approved. `data` omits `approved`, so a new
      // banner defaults to unapproved; on edit we reset it for re-review.
      return existing
        ? ctx.prisma.banner.update({ where: { id: existing.id }, data: { imageUrl: data.imageUrl, linkUrl: data.linkUrl, approved: false } })
        : ctx.prisma.banner.create({ data })
    }),

  // ── Admin ───────────────────────────────────────────────────────────────────
  adminCatalog: execProcedure.query(({ ctx }) => getSponsorshipCatalog(ctx.prisma)),

  saveConfig: execProcedure
    .input(z.object({ addons: z.record(z.object({ monthlyCents: z.number().int().min(0), active: z.boolean() })) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.sponsorshipConfig.upsert({ where: { id: 'default' }, create: { id: 'default', data: input }, update: { data: input } })
    ),

  grants: execProcedure.query(({ ctx }) =>
    ctx.prisma.sponsorshipGrant.findMany({
      where: { status: 'active', endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'asc' },
      include: { user: { select: { displayName: true, email: true, businessName: true } } },
    })
  ),

  cancelGrant: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.banner.updateMany({ where: { grantId: input.id }, data: { active: false } })
      return ctx.prisma.sponsorshipGrant.update({ where: { id: input.id }, data: { status: 'cancelled' } })
    }),
})
