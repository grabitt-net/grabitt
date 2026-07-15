import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

// Seller following: buyers follow sellers to keep up with their new listings.
export const followRouter = router({
  follow: protectedProcedure
    .input(z.object({ sellerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.sellerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: "You can't follow yourself" })
      await ctx.prisma.following.upsert({
        where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.sellerId } },
        create: { followerId: ctx.user.id, followingId: input.sellerId },
        update: {},
      })
      await ctx.prisma.notification.create({
        data: { userId: input.sellerId, kind: 'system', title: '👤 New follower', body: 'Someone started following your listings.' },
      })
      return { following: true }
    }),

  unfollow: protectedProcedure
    .input(z.object({ sellerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.following.deleteMany({ where: { followerId: ctx.user.id, followingId: input.sellerId } })
      return { following: false }
    }),

  // Is the current user following this seller? (+ the seller's follower count)
  status: publicProcedure
    .input(z.object({ sellerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.prisma.following.count({ where: { followingId: input.sellerId } })
      let following = false
      if (ctx.user) {
        following = !!(await ctx.prisma.following.findUnique({
          where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.sellerId } },
        }))
      }
      return { following, followers }
    }),

  // Sellers the current user follows (for a "Following" list).
  myFollowing: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.following.findMany({
      where: { followerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: { id: true, displayName: true, avatar: true, grade: true, avgRating: true, salesCount: true } } },
    })
    return rows.map(r => r.following)
  }),
})
