import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import type { PrismaClient } from '@prisma/client'

// Rewards = the credits wallet. Members EARN credits (ways-to-earn rules, all
// admin-managed) and REDEEM them for listing upgrades or a temporary selling-fee
// reduction (redemption options, also admin-managed). Admins can additionally
// grant an upgrade to any account or listing by hand.

const DAY = 86400000

// Apply a listing upgrade (used by both self-redeem and admin grant).
async function applyListingUpgrade(prisma: PrismaClient, listingId: string, cfg: { upgrade?: string; weeks?: number; hours?: number }) {
  const now = Date.now()
  if (cfg.upgrade === 'featured') {
    const until = new Date(now + (cfg.weeks ?? 1) * 7 * DAY)
    await prisma.listing.update({ where: { id: listingId }, data: { isFeatured: true, featuredUntil: until } })
  } else if (cfg.upgrade === 'grab_it_now') {
    const hours = cfg.hours ?? 24
    await prisma.listing.update({ where: { id: listingId }, data: { grabItNowUntil: new Date(now + hours * 3600000), grabItNowWindow: hours } })
  } else if (cfg.upgrade === 'bump') {
    await prisma.listing.update({ where: { id: listingId }, data: { updatedAt: new Date() } })
  } else {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown listing upgrade' })
  }
}

// Grant a fee reduction: subtract `pct` points for `days` days. Extends the
// window and keeps the more generous percentage if one is already active.
async function applyFeeReduction(prisma: PrismaClient, userId: string, pct: number, days: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { feeReductionPct: true, feeReductionUntil: true } })
  const base = user.feeReductionUntil && new Date(user.feeReductionUntil).getTime() > Date.now() ? new Date(user.feeReductionUntil).getTime() : Date.now()
  const existingPct = Number(user.feeReductionPct ?? 0)
  await prisma.user.update({
    where: { id: userId },
    data: { feeReductionPct: Math.max(existingPct, pct), feeReductionUntil: new Date(base + days * DAY) },
  })
}

export const rewardsRouter = router({
  // Public: active ways to earn, for the account rewards dashboard.
  earnRules: publicProcedure.query(({ ctx }) =>
    ctx.prisma.rewardRule.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  ),

  // Active redemption options.
  redeemOptions: publicProcedure.query(({ ctx }) =>
    ctx.prisma.rewardOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  ),

  // The signed-in member's balance, active fee reduction and recent ledger.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { credits: true, feeReductionPct: true, feeReductionUntil: true },
    })
    const events = await ctx.prisma.creditEvent.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, kind: true, delta: true, note: true, createdAt: true },
    })
    const earned = await ctx.prisma.creditEvent.aggregate({ where: { userId: ctx.user.id, delta: { gt: 0 } }, _sum: { delta: true } })
    const active = user.feeReductionUntil && new Date(user.feeReductionUntil).getTime() > Date.now()
    return {
      balance: user.credits,
      totalEarned: earned._sum.delta ?? 0,
      feeReduction: active ? { pct: Number(user.feeReductionPct ?? 0), until: user.feeReductionUntil } : null,
      events,
    }
  }),

  // Redeem credits for a reward option.
  redeem: protectedProcedure
    .input(z.object({ optionId: z.string(), listingId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const opt = await ctx.prisma.rewardOption.findUniqueOrThrow({ where: { id: input.optionId } })
      if (!opt.active) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reward is no longer available' })

      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { credits: true } })
      if (me.credits < opt.costCredits) throw new TRPCError({ code: 'FORBIDDEN', message: `You need ${opt.costCredits} credits to redeem this` })

      const cfg = (opt.config ?? {}) as { upgrade?: string; weeks?: number; hours?: number; pct?: number; days?: number }

      if (opt.kind === 'listing_upgrade') {
        if (!input.listingId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose a listing to upgrade' })
        const listing = await ctx.prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true } })
        if (!listing || listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'That is not your listing' })
        await applyListingUpgrade(ctx.prisma, input.listingId, cfg)
      } else if (opt.kind === 'fee_reduction') {
        await applyFeeReduction(ctx.prisma, ctx.user.id, Number(cfg.pct ?? 0), Number(cfg.days ?? 30))
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown reward type' })
      }

      const newBalance = me.credits - opt.costCredits
      await ctx.prisma.$transaction([
        ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { credits: newBalance } }),
        ctx.prisma.creditEvent.create({ data: { userId: ctx.user.id, kind: 'reward_redeemed', delta: -opt.costCredits, balance: newBalance, note: `Redeemed: ${opt.title}` } }),
      ])
      return { ok: true, balance: newBalance }
    }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  allRules: execProcedure.query(({ ctx }) =>
    ctx.prisma.rewardRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  ),
  upsertRule: execProcedure
    .input(z.object({
      id: z.string().optional(),
      code: z.string().min(2).max(60),
      icon: z.string().max(8).default('🎁'),
      title: z.string().min(2).max(120),
      subtitle: z.string().min(2).max(200),
      amount: z.number().int().min(0).max(100000),
      actionLabel: z.string().max(40).nullable().optional(),
      actionKey: z.string().max(40).nullable().optional(),
      active: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return id ? ctx.prisma.rewardRule.update({ where: { id }, data }) : ctx.prisma.rewardRule.create({ data })
    }),
  removeRule: execProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.rewardRule.delete({ where: { id: input.id } })),

  allOptions: execProcedure.query(({ ctx }) =>
    ctx.prisma.rewardOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  ),
  upsertOption: execProcedure
    .input(z.object({
      id: z.string().optional(),
      kind: z.enum(['listing_upgrade', 'fee_reduction']),
      title: z.string().min(2).max(120),
      description: z.string().min(2).max(300),
      costCredits: z.number().int().min(1).max(1000000),
      config: z.record(z.any()).optional(),
      active: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(({ ctx, input }) => {
      const { id, config, ...rest } = input
      const data = { ...rest, config: config ?? undefined }
      return id ? ctx.prisma.rewardOption.update({ where: { id }, data }) : ctx.prisma.rewardOption.create({ data })
    }),
  removeOption: execProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.rewardOption.delete({ where: { id: input.id } })),

  // Admin: a member's current rewards standing (balance, fee reduction, recent ledger).
  memberSummary: execProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const u = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: input.userId },
        select: { credits: true, feeReductionPct: true, feeReductionUntil: true, displayName: true, email: true },
      })
      const events = await ctx.prisma.creditEvent.findMany({
        where: { userId: input.userId }, orderBy: { createdAt: 'desc' }, take: 10,
        select: { kind: true, delta: true, note: true, createdAt: true },
      })
      const active = u.feeReductionUntil && new Date(u.feeReductionUntil).getTime() > Date.now()
      return {
        name: u.displayName ?? u.email,
        credits: u.credits,
        feeReduction: active ? { pct: Number(u.feeReductionPct ?? 0), until: u.feeReductionUntil } : null,
        events,
      }
    }),

  // Admin: manually grant an upgrade/credits/fee reduction to a member or listing.
  grantManual: execProcedure
    .input(z.object({
      userId: z.string(),
      type: z.enum(['credits', 'fee_reduction', 'listing_upgrade']),
      credits: z.number().int().optional(),
      // For credits: when true, set the balance to `credits`; otherwise add it.
      absolute: z.boolean().optional(),
      pct: z.number().optional(),
      days: z.number().int().optional(),
      listingId: z.string().optional(),
      upgrade: z.enum(['featured', 'grab_it_now', 'bump']).optional(),
      weeks: z.number().int().optional(),
      hours: z.number().int().optional(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'credits') {
        const u = await ctx.prisma.user.findUniqueOrThrow({ where: { id: input.userId }, select: { credits: true } })
        // absolute: set the balance to `credits`; otherwise add `credits` (may be negative).
        const newBalance = Math.max(0, input.absolute ? (input.credits ?? 0) : u.credits + (input.credits ?? 0))
        const delta = newBalance - u.credits
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({ where: { id: input.userId }, data: { credits: newBalance } }),
          ctx.prisma.creditEvent.create({ data: { userId: input.userId, kind: 'admin_adjustment', delta, balance: newBalance, note: input.note ?? (input.absolute ? 'Balance set by admin' : 'Manual credit adjustment') } }),
        ])
      } else if (input.type === 'fee_reduction') {
        await applyFeeReduction(ctx.prisma, input.userId, input.pct ?? 0, input.days ?? 30)
      } else if (input.type === 'listing_upgrade') {
        if (!input.listingId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A listing is required' })
        await applyListingUpgrade(ctx.prisma, input.listingId, { upgrade: input.upgrade, weeks: input.weeks, hours: input.hours })
      }
      return { ok: true }
    }),
})
