import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { SearchInputSchema } from '@grabitt/types'

export const savedSearchesRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.savedSearch.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })
  ),

  save: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50), query: SearchInputSchema, alertsOn: z.boolean().default(true) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.savedSearch.create({
        data: { userId: ctx.user.id, name: input.name, query: input.query, alertsOn: input.alertsOn },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.savedSearch.delete({ where: { id: input.id, userId: ctx.user.id } })
    ),
})
