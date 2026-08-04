import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { getSponsorshipCatalog, sponsorshipTotalCents, sponsorMonthlyCents, SPONSOR_DURATIONS, SPONSOR_PAGES, bannerForAddon } from '../lib/sponsorshipPricing'
import { BUSINESS_ADDON_IDS } from '@grabitt/design-tokens'
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
      months: z.number().int().refine(m => (SPONSOR_DURATIONS as readonly number[]).includes(m), 'Invalid duration'),
      pageTarget: z.enum(SPONSOR_PAGES as unknown as [string, ...string[]]).optional(),
    })).min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true } })
      const catalog = await getSponsorshipCatalog(ctx.prisma)

      const lineItems: any[] = []
      const basketParts: string[] = []
      for (const item of input.items) {
        const b = bannerForAddon(item.addonId)
        if (b?.needsPage) await assertCategoryFree(ctx.prisma, item.pageTarget)
        const monthly = await sponsorMonthlyCents(ctx.prisma, item.addonId)
        if (monthly == null) throw new TRPCError({ code: 'BAD_REQUEST', message: `${item.addonId} is not available` })
        const total = sponsorshipTotalCents(monthly, item.months)
        const label = catalog.find(c => c.id === item.addonId)?.label ?? item.addonId
        const page = b?.needsPage ? (item.pageTarget ?? '') : ''
        lineItems.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: total, product_data: { name: `Grabitt — ${label} (${item.months} ${item.months === 1 ? 'month' : 'months'})${page ? ` · ${page}` : ''}` } } })
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
