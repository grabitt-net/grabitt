import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { getSponsorshipCatalog, sponsorshipTotalCents, sponsorMonthlyCents, SPONSOR_DURATIONS } from '../lib/sponsorshipPricing'
import { BUSINESS_ADDON_IDS } from '@grabitt/design-tokens'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// Sponsorship & advertising sold as one-off, timed purchases through a basket
// (a Stripe Checkout in payment mode with one line item per basket item). This
// avoids mixing intervals on the recurring business subscription — each item
// runs for the number of months bought. Prices are admin-editable.
export const sponsorshipRouter = router({
  // Public catalogue + buyable durations for the For Business page.
  catalog: publicProcedure.query(async ({ ctx }) => ({
    items: (await getSponsorshipCatalog(ctx.prisma)).filter(i => i.active),
    durations: SPONSOR_DURATIONS,
  })),

  // The signed-in business's live sponsorships.
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.sponsorshipGrant.findMany({
      where: { userId: ctx.user.id, status: 'active', endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
    })
  ),

  // Basket checkout: pay once for a set of { addonId, months } items.
  checkout: protectedProcedure
    .input(z.object({ items: z.array(z.object({ addonId: z.enum(BUSINESS_ADDON_IDS as [string, ...string[]]), months: z.number().int().refine(m => (SPONSOR_DURATIONS as readonly number[]).includes(m), 'Invalid duration') })).min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, displayName: true, stripeCustomerId: true } })
      const catalog = await getSponsorshipCatalog(ctx.prisma)

      const lineItems = [] as { price_data: { currency: string; unit_amount: number; product_data: { name: string } }; quantity: number }[]
      const basketParts: string[] = []
      for (const item of input.items) {
        const monthly = await sponsorMonthlyCents(ctx.prisma, item.addonId)
        if (monthly == null) throw new TRPCError({ code: 'BAD_REQUEST', message: `${item.addonId} is not available` })
        const total = sponsorshipTotalCents(monthly, item.months)
        const label = catalog.find(c => c.id === item.addonId)?.label ?? item.addonId
        lineItems.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: total, product_data: { name: `Grabitt — ${label} (${item.months} ${item.months === 1 ? 'month' : 'months'})` } } })
        basketParts.push(`${item.addonId}:${item.months}:${total}`)
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

  // ── Admin ───────────────────────────────────────────────────────────────────
  adminCatalog: execProcedure.query(({ ctx }) => getSponsorshipCatalog(ctx.prisma)),

  saveConfig: execProcedure
    .input(z.object({ addons: z.record(z.object({ monthlyCents: z.number().int().min(0), active: z.boolean() })) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.sponsorshipConfig.upsert({ where: { id: 'default' }, create: { id: 'default', data: input }, update: { data: input } })
    ),

  // All live sponsorships across businesses.
  grants: execProcedure.query(({ ctx }) =>
    ctx.prisma.sponsorshipGrant.findMany({
      where: { status: 'active', endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'asc' },
      include: { user: { select: { displayName: true, email: true, businessName: true } } },
    })
  ),

  cancelGrant: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.sponsorshipGrant.update({ where: { id: input.id }, data: { status: 'cancelled' } })),
})
