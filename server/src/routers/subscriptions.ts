import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { SUBSCRIPTION_PLANS, BUSINESS_ADDONS, BUSINESS_ADDON_IDS, isBusinessAddon, businessMonthlyTotalCents, FOUNDING_BUSINESS_CAP } from '@grabitt/design-tokens'
import { reconcileSubscriptionAddons } from '../lib/businessAddons'
import type { PrismaClient } from '@prisma/client'

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
  // no dashboard Price setup is needed). Business includes the 7-day trial.
  createCheckout: protectedProcedure
    .input(z.object({
      plan: z.enum(PLAN_IDS as [string, ...string[]]),
      // Business plan only: optional recurring add-ons to bill on top of the base.
      // Stored on the user and attached to the subscription once it exists (webhook).
      addons: z.array(z.enum(BUSINESS_ADDON_IDS as [string, ...string[]])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = SUBSCRIPTION_PLANS[input.plan as keyof typeof SUBSCRIPTION_PLANS]

      // The Founding Business annual plan is limited to the first N businesses.
      if (input.plan === 'business_founding_annual') {
        const taken = await ctx.prisma.subscription.count({ where: { plan: 'business_founding_annual' } })
        if (taken >= FOUNDING_BUSINESS_CAP) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'The Founding Business plan is fully subscribed. Please choose the standard monthly plan.' })
        }
      }

      const customer = await getOrCreateCustomer(ctx.prisma, ctx.user.id)

      // Record the chosen add-ons up front. The webhook reconciles the Stripe
      // subscription items to this set once the base subscription is created.
      if (input.plan === 'business') {
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { businessAddons: (input.addons ?? []).filter(isBusinessAddon) },
        })
      }

      const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        customer,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: plan.amountCents,
            recurring: { interval: plan.interval as 'month' | 'year' },
            product_data: { name: `Grabitt — ${plan.label}` },
          },
        }],
        subscription_data: {
          ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
          metadata: { userId: ctx.user.id, plan: input.plan },
        },
        // Land business signups on the account page so we can prompt for their
        // business details on first login.
        success_url: `${appUrl()}/${input.plan.startsWith('business') ? 'account?welcome=business' : '?sub=success'}`,
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

  // Current business plan + add-on selection and the resulting monthly total.
  myBusiness: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { isBusiness: true, businessAddons: true, businessOnboardedAt: true },
    })
    const selected = (user.businessAddons ?? []).filter(isBusinessAddon)
    return {
      isBusiness: user.isBusiness,
      onboarded: user.businessOnboardedAt != null,
      addons: selected,
      baseCents: SUBSCRIPTION_PLANS.business.amountCents,
      monthlyTotalCents: businessMonthlyTotalCents(selected),
    }
  }),

  // Opt in/out of add-ons from the dashboard. Persists the new set and reconciles
  // the live Stripe subscription so the monthly charge updates immediately.
  updateAddons: protectedProcedure
    .input(z.object({ addons: z.array(z.enum(BUSINESS_ADDON_IDS as [string, ...string[]])) }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true } })
      if (!me.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business account is required' })
      const addons = input.addons.filter(isBusinessAddon)
      await ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { businessAddons: addons } })
      try {
        await reconcileSubscriptionAddons(ctx.prisma, ctx.user.id)
      } catch {
        // The selection is saved; if Stripe reconcile fails (e.g. no live sub yet)
        // it will be re-applied on the next subscription webhook.
      }
      return { addons, monthlyTotalCents: businessMonthlyTotalCents(addons) }
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
