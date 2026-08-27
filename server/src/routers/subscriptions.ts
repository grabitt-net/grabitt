import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { SUBSCRIPTION_PLANS, FOUNDING_BUSINESS_CAP } from '@grabitt/design-tokens'
import { getSponsorshipCatalog, sponsorMonthlyCents, bannerForAddon, blastKind, addonLineCents, isValidAddonQty } from '../lib/sponsorshipPricing'
import type { PrismaClient } from '@prisma/client'
import { validateDiscount } from '../lib/discounts'

const PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS) as (keyof typeof SUBSCRIPTION_PLANS)[]
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// Get-or-create the Stripe customer for a user and persist its id.
async function getOrCreateCustomer(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, stripeCustomerId: true },
  })
  if (user.stripeCustomerId) return user.stripeCustomerId
  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.displayName,
    metadata: { userId: user.id },
  })
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } })
  return customer.id
}

export const subscriptionsRouter = router({
  // Public plan catalogue (labels/prices for the UI).
  plans: publicProcedure.query(() =>
    PLAN_IDS.map(id => ({ id, ...SUBSCRIPTION_PLANS[id] }))
  ),

  // The signed-in user's subscriptions.
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.subscription.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })
  ),

  // Starts a Stripe Checkout session for a recurring plan (inline price_data so
  // no dashboard Price setup is needed). Business includes the 14-day trial.
  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(PLAN_IDS as [string, ...string[]]),
      // Business plans only: optional one-off sponsorship placements to buy in the
      // SAME basket. These are added as one-time line items on the subscription
      // checkout and granted (as timed SponsorshipGrants) on completion.
      sponsorship: z.array(z.object({ addonId: z.string(), months: z.number().int(), pageTarget: z.string().optional() })).optional(),
      discountCode: z.string().max(40).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = SUBSCRIPTION_PLANS[input.plan as keyof typeof SUBSCRIPTION_PLANS]
      const isBusinessPlan = input.plan.startsWith('business')

      // Promo code on the plan itself — validated for the business_upgrade flow,
      // applied as a one-time Stripe coupon on the first invoice. A code (e.g.
      // "€28.99 off" to make the first month 1c) skips the trial so the reduced
      // amount charges immediately.
      let discountCodeId: string | null = null
      let discountCents = 0
      let couponId: string | undefined
      if (input.discountCode) {
        const dr = await validateDiscount(ctx.prisma, { code: input.discountCode, userId: ctx.user.id, kind: 'business_upgrade', amountCents: plan.amountCents })
        if (!dr.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: dr.reason })
        // The business plan already comes with a free trial, so it's the offer —
        // real promo codes can't be stacked on it. Only test codes are honoured
        // here (they skip the trial to charge the reduced amount for live-Stripe
        // testing).
        if (!dr.isTest) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Business plans already include a free trial, so a discount code can’t be applied here.' })
        if (dr.discountCents > 0) {
          discountCodeId = dr.codeId; discountCents = dr.discountCents
          const coupon = await getStripe().coupons.create({ amount_off: discountCents, currency: 'eur', duration: 'once', name: `Grabitt ${dr.code}` })
          couponId = coupon.id
        }
      }

      // The Founding Business annual plan is limited to the first N businesses.
      if (input.plan === 'business_founding_annual') {
        const taken = await ctx.prisma.subscription.count({ where: { plan: 'business_founding_annual' } })
        if (taken >= FOUNDING_BUSINESS_CAP) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'The Founding Business plan is fully subscribed. Please choose the standard monthly plan.' })
        }
      }

      const customer = await getOrCreateCustomer(ctx.prisma, ctx.user.id)

      const lineItems: any[] = [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: plan.amountCents,
          recurring: { interval: plan.interval as 'month' | 'year' },
          product_data: { name: `Grabitt — ${plan.label}` },
        },
      }]

      // Add any sponsorship placements to the same basket as one-time line items.
      const basketParts: string[] = []
      if (isBusinessPlan && input.sponsorship?.length) {
        const catalog = await getSponsorshipCatalog(ctx.prisma)
        for (const item of input.sponsorship) {
          const label = catalog.find(c => c.id === item.addonId)?.label ?? item.addonId
          if (!isValidAddonQty(item.addonId, item.months)) continue
          const b = bannerForAddon(item.addonId)
          if (b?.needsPage) {
            if (!item.pageTarget) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick which category page to sponsor.' })
            const clash = await ctx.prisma.sponsorshipGrant.findFirst({ where: { addonId: 'category_sponsor', pageTarget: item.pageTarget, status: 'active', endsAt: { gt: new Date() } } })
            if (clash) throw new TRPCError({ code: 'CONFLICT', message: 'That category is already sponsored for this period.' })
          }
          const monthly = await sponsorMonthlyCents(ctx.prisma, item.addonId)
          if (monthly == null) continue
          const total = addonLineCents(item.addonId, monthly, item.months)
          const unitWord = blastKind(item.addonId) ? (item.months === 1 ? 'send' : 'sends') : (item.months === 1 ? 'month' : 'months')
          const page = b?.needsPage ? (item.pageTarget ?? '') : ''
          lineItems.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: total, product_data: { name: `Grabitt — ${label} (${item.months} ${unitWord})${page ? ` · ${page}` : ''}` } } })
          basketParts.push(`${item.addonId}:${item.months}:${total}:${page}`)
        }
      }

      const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        customer,
        line_items: lineItems,
        // A promo coupon applies to the plan's first invoice.
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
        subscription_data: {
          // A discount charges immediately (no trial) so the reduced amount can
          // be tested / taken now.
          ...(plan.trialDays && !discountCodeId ? { trial_period_days: plan.trialDays } : {}),
          metadata: { userId: ctx.user.id, plan: input.plan },
        },
        // Session metadata drives the sponsorship grants + promo redemption on
        // checkout.session.completed.
        metadata: {
          ...(basketParts.length ? { kind: 'sponsorship', userId: ctx.user.id, basket: basketParts.join(',') } : {}),
          ...(discountCodeId ? { discountCodeId, discountCents: String(discountCents), originalCents: String(plan.amountCents), discountUserId: ctx.user.id } : {}),
        },
        // Land business signups on the account page so we can prompt for their
        // business details on first login.
        success_url: `${appUrl()}/${isBusinessPlan ? 'account?welcome=business' : '?sub=success'}`,
        cancel_url: `${appUrl()}/?sub=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
    }),

  // How many of the founding-business annual slots remain (public — drives the UI).
  foundingBusinessStatus: publicProcedure.query(async ({ ctx }) => {
    const taken = await ctx.prisma.subscription.count({ where: { plan: 'business_founding_annual' } })
    return { taken, cap: FOUNDING_BUSINESS_CAP, remaining: Math.max(0, FOUNDING_BUSINESS_CAP - taken) }
  }),

  // Current business standing. (Sponsorship extras are now one-off basket
  // purchases via the sponsorship router, not recurring subscription add-ons.)
  myBusiness: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { isBusiness: true, businessOnboardedAt: true },
    })
    return {
      isBusiness: user.isBusiness,
      onboarded: user.businessOnboardedAt != null,
      baseCents: SUBSCRIPTION_PLANS.business.amountCents,
    }
  }),

  // Mark the first-login business-details step complete.
  completeOnboarding: protectedProcedure
    .input(z.object({ businessName: z.string().min(1).max(120), businessType: z.string().max(60).optional(), businessBio: z.string().max(600).optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          businessName: input.businessName.trim(),
          ...(input.businessBio ? { businessBio: input.businessBio.trim() } : {}),
          businessOnboardedAt: new Date(),
        },
      })
      return { ok: true }
    }),

  // One-off business verification (€19) — unlocks the 🛡️ shield on the storefront.
  verifyCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const plan = SUBSCRIPTION_PLANS.business
    const customer = await getOrCreateCustomer(ctx.prisma, ctx.user.id)
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: plan.verifyFeeCents,
          product_data: { name: 'Grabitt — Business verification' },
        },
      }],
      payment_intent_data: { metadata: { kind: 'business_verify', userId: ctx.user.id } },
      success_url: `${appUrl()}/?verify=success`,
      cancel_url: `${appUrl()}/?verify=cancelled`,
    })
    if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
    return { url: session.url }
  }),

  // Stripe billing portal — manage/cancel subscriptions and payment methods.
  portal: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id }, select: { stripeCustomerId: true },
    })
    if (!user.stripeCustomerId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No billing account yet' })
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl()}/`,
    })
    return { url: session.url }
  }),
})
