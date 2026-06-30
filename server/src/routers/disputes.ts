import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { OpenDisputeInputSchema } from '@grabitt/types'

export const disputesRouter = router({
  open: protectedProcedure
    .input(OpenDisputeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: input.transactionId } })
      if (tx.buyerId !== ctx.user.id && tx.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const existing = await ctx.prisma.dispute.findUnique({ where: { transactionId: input.transactionId } })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Dispute already open' })

      // Freeze funds
      await ctx.prisma.transaction.update({ where: { id: input.transactionId }, data: { status: 'disputed' } })

      return ctx.prisma.dispute.create({
        data: {
          transactionId: input.transactionId,
          raisedById: ctx.user.id,
          reason: input.reason,
          evidence: input.evidence,
        },
      })
    }),

  mine: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.dispute.findMany({
      where: { raisedById: ctx.user.id },
      include: { transaction: { include: { listing: true } } },
      orderBy: { createdAt: 'desc' },
    })
  ),
})
