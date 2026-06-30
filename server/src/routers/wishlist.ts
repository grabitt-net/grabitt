import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const wishlistRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.wishlistItem.findMany({
      where: { userId: ctx.user.id },
      include: { listing: { include: { seller: { select: { id: true, displayName: true, avatar: true, grade: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  ),

  toggle: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.wishlistItem.findUnique({
        where: { userId_listingId: { userId: ctx.user.id, listingId: input.listingId } },
      })

      if (existing) {
        await ctx.prisma.wishlistItem.delete({
          where: { userId_listingId: { userId: ctx.user.id, listingId: input.listingId } },
        })
        return { saved: false }
      }

      await ctx.prisma.wishlistItem.create({
        data: { userId: ctx.user.id, listingId: input.listingId },
      })
      return { saved: true }
    }),
})
