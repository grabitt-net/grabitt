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

  // "I'm looking for X" wishes — when a new listing matches, we fire a
  // wish_matched alert (see listings.create → notifyWishMatches).
  myWishes: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.wishItem.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })
  ),

  createWish: protectedProcedure
    .input(z.object({
      title: z.string().min(2).max(100),
      department: z.string().optional(),
      maxPrice: z.number().min(0).max(9_999_999).optional(),
      keywords: z.array(z.string().min(1).max(40)).max(10).optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.wishItem.create({
        data: {
          userId: ctx.user.id,
          title: input.title.trim(),
          department: (input.department as any) || null,
          maxPrice: input.maxPrice ?? null,
          keywords: input.keywords ?? [],
        },
      })
    ),

  toggleWishActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const wish = await ctx.prisma.wishItem.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!wish) return { ok: false }
      await ctx.prisma.wishItem.update({ where: { id: wish.id }, data: { active: !wish.active } })
      return { ok: true, active: !wish.active }
    }),

  deleteWish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.wishItem.deleteMany({ where: { id: input.id, userId: ctx.user.id } })
      return { ok: true }
    }),
})
