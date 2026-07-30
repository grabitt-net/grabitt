import { z } from 'zod'
import { router, execProcedure } from '../trpc'

// Financial planner — a single editable model (assumptions, revenue streams and
// cost lines) persisted as JSON. Exec-only; the executive suite reads, edits and
// exports it. The client owns the default shape, so `get` may return null.
export const plannerRouter = router({
  get: execProcedure.query(async ({ ctx }) => {
    const row = await ctx.prisma.forecastModel.findUnique({ where: { id: 'default' } })
    return row ? { data: row.data, updatedAt: row.updatedAt } : null
  }),

  save: execProcedure
    .input(z.object({ data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.forecastModel.upsert({
        where: { id: 'default' },
        create: { id: 'default', data: input.data },
        update: { data: input.data },
      })
      return { ok: true, updatedAt: row.updatedAt }
    }),
})
