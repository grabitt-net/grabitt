import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

export const bannersRouter = router({
  active: publicProcedure
    .input(z.object({ position: z.enum(['home_top','home_mid','category','checkout']) }))
    .query(({ ctx, input }) => {
      const now = new Date()
      return ctx.prisma.banner.findMany({
        where: {
          position: input.position,
          active: true,
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
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
      position: z.enum(['home_top','home_mid','category','checkout']),
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
      if (id) return ctx.prisma.banner.update({ where: { id }, data: parsed })
      return ctx.prisma.banner.create({ data: parsed })
    }),
})
