import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(({ ctx, input }) =>
      ctx.prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.unreadOnly && { readAt: null }),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    ),

  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.notification.updateMany({
        where: { id: { in: input.ids }, userId: ctx.user.id },
        data: { readAt: new Date() },
      })
    ),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.notification.updateMany({
      where: { userId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    })
  ),
})
