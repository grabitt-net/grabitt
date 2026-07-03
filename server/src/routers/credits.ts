import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import type { PrismaClient } from '@prisma/client'
import { router, protectedProcedure } from '../trpc'
import { PRICES } from '@grabitt/design-tokens'


// Credit packs — prices are server-owned (§10.2). Bigger packs include bonus credits.
export const CREDIT_PACKS: Record<string, { credits: number; eur: number }> = {
  p100: { credits: 100, eur: 5 },
  p550: { credits: 550, eur: 20 },
  p1400: { credits: 1400, eur: 45 },
  p3000: { credits: 3000, eur: 90 },
}

// Grants a credit pack — called by the Stripe webhook once payment succeeds.
// Idempotent: skips if a CreditEvent already exists for this PaymentIntent.
export async function grantCreditPack(prisma: PrismaClient, userId: string, packId: string, paymentIntentId: string) {
  const pack = CREDIT_PACKS[packId]
  if (!pack) return
  const already = await prisma.creditEvent.findFirst({ where: { note: { contains: paymentIntentId } } })
  if (already) return
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return
  const newBalance = user.credits + pack.credits
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { credits: newBalance } }),
    prisma.creditEvent.create({
      data: { userId, kind: 'purchase', delta: pack.credits, balance: newBalance, note: `Bought ${pack.credits} credits (€${pack.eur}) · ${paymentIntentId}` },
    }),
  ])
}

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

  // Creates a Stripe PaymentIntent for a credit pack. Credits are granted by the
  // webhook once payment succeeds (never on the unauthenticated client). Returns
  // the client secret for Stripe Elements.
  buyPackIntent: protectedProcedure
    .input(z.object({ packId: z.enum(['p100', 'p550', 'p1400', 'p3000']) }))
    .mutation(async ({ ctx, input }) => {
      const pack = CREDIT_PACKS[input.packId]
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: Math.round(pack.eur * 100),
        currency: 'eur',
        metadata: { kind: 'credit_pack', userId: ctx.user.id, packId: input.packId },
      })
      return { clientSecret: paymentIntent.client_secret, credits: pack.credits, eur: pack.eur }
    }),
})
