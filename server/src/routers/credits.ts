import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { PRICES } from '@grabitt/design-tokens'

export const creditsRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { credits: true },
    })
    return user.credits
  }),

  history: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.creditEvent.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  ),

  share: protectedProcedure
    .input(z.object({ platform: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const sharesThisMonth = await ctx.prisma.creditEvent.count({
        where: {
          userId: ctx.user.id,
          kind: 'share_reward',
          createdAt: { gte: monthStart },
        },
      })

      if (sharesThisMonth >= PRICES.maxSharesPerMonth) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Maximum ${PRICES.maxSharesPerMonth} share rewards per month`,
        })
      }

      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
      const newBalance = user.credits + PRICES.creditsPerShare

      await ctx.prisma.$transaction([
        ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { credits: newBalance } }),
        ctx.prisma.creditEvent.create({
          data: {
            userId: ctx.user.id,
            kind: 'share_reward',
            delta: PRICES.creditsPerShare,
            balance: newBalance,
            note: `Shared on ${input.platform}`,
          },
        }),
      ])

      return { credits: newBalance }
    }),

  // Credit packs — prices are server-owned; the client only sends a pack id (§10.2).
  buyPack: protectedProcedure
    .input(z.object({ packId: z.enum(['p100', 'p550', 'p1400', 'p3000']) }))
    .mutation(async ({ ctx, input }) => {
      // { credits granted, € price }. Bigger packs include bonus credits.
      const PACKS: Record<string, { credits: number; eur: number }> = {
        p100: { credits: 100, eur: 5 },
        p550: { credits: 550, eur: 20 },
        p1400: { credits: 1400, eur: 45 },
        p3000: { credits: 3000, eur: 90 },
      }
      const pack = PACKS[input.packId]

      // NOTE: in production the credit grant must be gated on a confirmed Stripe
      // PaymentIntent (Elements on the client). This mirrors the app's current
      // simulated-card checkout and grants on submit.
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
      const newBalance = user.credits + pack.credits

      await ctx.prisma.$transaction([
        ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { credits: newBalance } }),
        ctx.prisma.creditEvent.create({
          data: {
            userId: ctx.user.id,
            kind: 'purchase',
            delta: pack.credits,
            balance: newBalance,
            note: `Bought ${pack.credits} credits (€${pack.eur})`,
          },
        }),
      ])

      return { credits: newBalance, granted: pack.credits }
    }),
})
