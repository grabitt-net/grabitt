import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const offersRouter = router({
  make: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      amount: z.number().min(0.01),
      message: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } })
      if (listing.sellerId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot make offer on own listing' })
      }
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)
      return ctx.prisma.offer.create({
        data: { listingId: input.listingId, buyerId: ctx.user.id, amount: input.amount, message: input.message, expiresAt },
      })
    }),

  respond: protectedProcedure
    .input(z.object({ offerId: z.string().uuid(), action: z.enum(['accept', 'decline', 'counter']), counterAmount: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUniqueOrThrow({
        where: { id: input.offerId },
        include: { listing: true },
      })
      if (offer.listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      const status = input.action === 'accept' ? 'accepted' : input.action === 'decline' ? 'declined' : 'countered'
      return ctx.prisma.offer.update({ where: { id: input.offerId }, data: { status } })
    }),

  received: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.offer.findMany({
      where: { listing: { sellerId: ctx.user.id }, status: 'pending' },
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    })
  ),

  sent: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.offer.findMany({
      where: { buyerId: ctx.user.id },
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    })
  ),
})
