import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { SUBSCRIPTION_PLANS } from '@grabitt/design-tokens'
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
  // no dashboard Price setup is needed). Business includes the 21-day trial.
  createCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(PLAN_IDS as [string, ...string[]]) }))
    .mutation(async ({ ctx, input }) => {
      const plan = SUBSCRIPTION_PLANS[input.plan as keyof typeof SUBSCRIPTION_PLANS]
      const customer = await getOrCreateCustomer(ctx.prisma, ctx.user.id)

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
        success_url: `${appUrl()}/?sub=success`,
        cancel_url: `${appUrl()}/?sub=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
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
