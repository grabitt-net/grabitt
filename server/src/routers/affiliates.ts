import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { FOUNDING } from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

const getConfig = (prisma: PrismaClient) =>
  prisma.affiliateConfig.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} })

async function earnings(prisma: PrismaClient, affiliateId: string) {
  const [earned, paid] = await Promise.all([
    prisma.affiliateReferral.aggregate({ where: { affiliateId, status: 'earned' }, _sum: { amountCents: true }, _count: true }),
    prisma.affiliateReferral.aggregate({ where: { affiliateId, status: 'paid' }, _sum: { amountCents: true }, _count: true }),
  ])
  return {
    signups: (earned._count ?? 0) + (paid._count ?? 0),
    owedCents: earned._sum.amountCents ?? 0,
    paidCents: paid._sum.amountCents ?? 0,
  }
}

export const affiliatesRouter = router({
  // The member's affiliate dashboard: their link, tier, signups and earnings.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { isAffiliate: true, affiliateTier: true, referralCode: true, stripeAccountId: true, foundingMember: true },
    })
    const e = user.isAffiliate ? await earnings(ctx.prisma, ctx.user.id) : { signups: 0, owedCents: 0, paidCents: 0 }
    return {
      isAffiliate: user.isAffiliate,
      tier: user.affiliateTier,
      code: user.referralCode,
      hasPayoutAccount: !!user.stripeAccountId,
      foundingMember: user.foundingMember,
      ...e,
    }
  }),

  // ── Admin ───────────────────────────────────────────────────────────────────
  config: execProcedure.query(({ ctx }) => getConfig(ctx.prisma)),
  saveConfig: execProcedure
    .input(z.object({ foundingRateCents: z.number().int().min(0), standardRateCents: z.number().int().min(0), foundingCap: z.number().int().min(0) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.affiliateConfig.upsert({ where: { id: 'default' }, create: { id: 'default', ...input }, update: input })
    ),

  // Founding-signup counter (so admins can see how many of the cap remain).
  foundingStatus: execProcedure.query(async ({ ctx }) => {
    const cfg = await getConfig(ctx.prisma)
    const count = await ctx.prisma.user.count({ where: { foundingMember: true } })
    return { count, cap: cfg.foundingCap, remaining: Math.max(0, cfg.foundingCap - count) }
  }),

  // All affiliates with their earnings.
  list: execProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: { isAffiliate: true },
      select: { id: true, displayName: true, email: true, affiliateTier: true, referralCode: true, stripeAccountId: true },
      orderBy: { createdAt: 'desc' },
    })
    return Promise.all(users.map(async u => ({
      id: u.id, name: u.displayName ?? u.email, email: u.email, tier: u.affiliateTier,
      code: u.referralCode, hasPayoutAccount: !!u.stripeAccountId, ...(await earnings(ctx.prisma, u.id)),
    })))
  }),

  // Grant / revoke affiliate status and set the tier.
  setAffiliate: execProcedure
    .input(z.object({ userId: z.string(), isAffiliate: z.boolean(), tier: z.enum(['founding', 'standard']).optional() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({ where: { id: input.userId }, data: { isAffiliate: input.isAffiliate, affiliateTier: input.isAffiliate ? (input.tier ?? 'standard') : null } })
    ),

  // Manually assign the Founding Member badge (e.g. to an admin-created account
  // that never went through web signup). Also flips on founding affiliate status.
  grantFounding: execProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({ where: { id: input.userId }, data: { foundingMember: true, isAffiliate: true, affiliateTier: 'founding' } })
    ),
  revokeFounding: execProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.user.update({ where: { id: input.userId }, data: { foundingMember: false } })),

  // Mark an affiliate's outstanding earnings as paid. `viaStripe` attempts a
  // Stripe Connect transfer to their connected account; otherwise it records an
  // off-platform (bank) payout.
  payOut: execProcedure
    .input(z.object({ affiliateId: z.string(), viaStripe: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const owed = await ctx.prisma.affiliateReferral.aggregate({ where: { affiliateId: input.affiliateId, status: 'earned' }, _sum: { amountCents: true } })
      const amount = owed._sum.amountCents ?? 0
      if (amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing outstanding to pay.' })

      if (input.viaStripe) {
        const u = await ctx.prisma.user.findUniqueOrThrow({ where: { id: input.affiliateId }, select: { stripeAccountId: true } })
        if (!u.stripeAccountId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Affiliate has not connected a Stripe payout account yet.' })
        // Transfer platform funds to the affiliate's connected account.
        await getStripe().transfers.create({
          amount, currency: 'eur', destination: u.stripeAccountId,
          description: 'Grabitt affiliate payout',
        })
      }

      await ctx.prisma.affiliateReferral.updateMany({
        where: { affiliateId: input.affiliateId, status: 'earned' },
        data: { status: 'paid', paidAt: new Date() },
      })
      return { ok: true, amountCents: amount }
    }),
})

// Re-export so callers can reference the founding cap without a second import.
export { FOUNDING }
