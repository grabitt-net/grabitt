import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

export const bannersRouter = router({
  // Admin: all banners for management (any status/position).
  all: execProcedure.query(({ ctx }) =>
    ctx.prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] })
  ),

  // Public: record a banner click and return where to send the visitor. All
  // banners are click-tracked so their performance is quantifiable.
  trackClick: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.prisma.banner.update({ where: { id: input.id }, data: { clickCount: { increment: 1 } }, select: { linkUrl: true } }).catch(() => null)
      return { url: b?.linkUrl ?? null }
    }),

  // Public: record impressions (fire-and-forget from the client).
  trackImpression: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.prisma.banner.update({ where: { id: input.id }, data: { impressions: { increment: 1 } } }).then(() => ({ ok: true })).catch(() => ({ ok: false }))),

  // Admin: approve (or un-approve) a banner so it can go live.
  setApproved: execProcedure
    .input(z.object({ id: z.string().uuid(), approved: z.boolean() }))
    .mutation(({ ctx, input }) => ctx.prisma.banner.update({ where: { id: input.id }, data: { approved: input.approved } })),

  // Admin: remove a banner.
  remove: execProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.prisma.banner.delete({ where: { id: input.id } })),

  active: publicProcedure
    .input(z.object({
      position: z.enum(['home_top','home_mid','category','checkout','jobs','sponsor_top','sponsor_footer','messages','notifications']),
      // Optional page/category slug. When given, returns banners targeting that
      // page plus site-wide ones (pageTarget null); when omitted, only site-wide.
      page: z.string().optional(),
    }))
    .query(({ ctx, input }) => {
      const now = new Date()
      return ctx.prisma.banner.findMany({
        where: {
          position: input.position,
          active: true,
          approved: true, // never show a banner that an admin hasn't approved
          ...(input.page ? { OR: [{ pageTarget: input.page }, { pageTarget: null }] } : { pageTarget: null }),
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      })
    }),

  upsert: execProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      title: z.string(),
      imageUrl: z.string().url(),
      linkUrl: z.string().url().optional(),
      active: z.boolean(),
      position: z.enum(['home_top','home_mid','category','checkout','jobs','sponsor_top','sponsor_footer','messages','notifications']),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      const parsed = {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      }
      // Admin-created/edited banners are approved by the act of an admin saving them.
      if (id) return ctx.prisma.banner.update({ where: { id }, data: parsed })
      return ctx.prisma.banner.create({ data: { ...parsed, approved: true } })
    }),
})
