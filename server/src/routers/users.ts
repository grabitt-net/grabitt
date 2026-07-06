import { z } from 'zod'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
  ),

  profile: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.prisma.user.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true, displayName: true, avatar: true,
          grade: true, salesCount: true, avgRating: true,
          isBusiness: true, businessVerified: true,
          createdAt: true,
        },
      })
    ),

  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(50).optional(),
      avatar: z.string().url().optional(),
      locale: z.enum(['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt']).optional(),
      interests: z.array(z.string()).max(20).optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({ where: { id: ctx.user.id }, data: input })
    ),

  // Business storefront customisation — only for active Business accounts.
  updateBusinessProfile: protectedProcedure
    .input(z.object({
      businessName: z.string().min(2).max(60).optional(),
      businessBio: z.string().max(500).optional(),
      businessBanner: z.string().url().optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true } })
      if (!user.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business subscription is required to set up a storefront' })
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
          ...(input.businessBio !== undefined ? { businessBio: input.businessBio } : {}),
          ...(input.businessBanner !== undefined ? { businessBanner: input.businessBanner || null } : {}),
        },
      })
    }),

  // ── STRIPE CONNECT (seller payouts) ──────────────────────────────────────────
  // Whether the seller can receive payouts yet.
  payoutStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { stripeAccountId: true } })
    if (!user.stripeAccountId) return { connected: false, payoutsEnabled: false, chargesEnabled: false }
    const acct = await getStripe().accounts.retrieve(user.stripeAccountId)
    return {
      connected: true,
      payoutsEnabled: acct.payouts_enabled ?? false,
      chargesEnabled: acct.charges_enabled ?? false,
      detailsSubmitted: acct.details_submitted ?? false,
    }
  }),

  // Creates (or reuses) the seller's Express connected account and returns a
  // hosted onboarding link. Sellers must complete this before funds can be
  // transferred to them at handover/tracking release.
  createPayoutOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
    try {
      let accountId = user.stripeAccountId
      if (!accountId) {
        const account = await getStripe().accounts.create({
          type: 'express',
          email: user.email,
          // Sellers only receive payouts (transfers). Requesting card_payments
          // is unnecessary and can fail platform capability checks.
          capabilities: { transfers: { requested: true } },
          business_type: 'individual',
          metadata: { userId: user.id },
        })
        accountId = account.id
        await ctx.prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } })
      }
      const link = await getStripe().accountLinks.create({
        account: accountId,
        refresh_url: `${APP_URL()}/?payout=refresh`,
        return_url: `${APP_URL()}/?payout=done`,
        type: 'account_onboarding',
      })
      return { url: link.url }
    } catch (e) {
      // Surface Stripe's real reason (e.g. "complete your platform profile").
      throw new TRPCError({ code: 'BAD_REQUEST', message: e instanceof Error ? e.message : 'Stripe payout setup failed' })
    }
  }),

  // Opens the Express dashboard for a seller who has already onboarded.
  payoutDashboardLink: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { stripeAccountId: true } })
    if (!user.stripeAccountId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No payout account yet' })
    const link = await getStripe().accounts.createLoginLink(user.stripeAccountId)
    return { url: link.url }
  }),
})
