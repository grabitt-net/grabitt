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

      // Funds already paid out — there's nothing left to hold.
      if (tx.status === 'released' || tx.fundsReleasedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This payment has already been released. Contact support@grabitt.net.' })
      }

      // Postal orders: the buyer has 24 hours from delivery to report a problem,
      // after which the item is deemed accepted.
      if (tx.disputeWindowEndsAt && new Date() > tx.disputeWindowEndsAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The 24-hour window to report a problem closed on '
            + tx.disputeWindowEndsAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            + ', so the item is treated as accepted. Contact support@grabitt.net if you believe this is wrong.',
        })
      }

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
