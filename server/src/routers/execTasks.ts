import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, execProcedure } from '../trpc'

// Internal exec to-do / calendar tasks, scoped to the signed-in admin. Backs
// both the To-Do board (grouped by tier) and the Calendar (placed by dueDate),
// replacing the local-state-only versions that reset on every refresh.
export const execTasksRouter = router({
  list: execProcedure.query(({ ctx }) =>
    ctx.prisma.execTask.findMany({
      where: { execUserId: ctx.execUser.id },
      orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
    }).then(rows => rows.map(r => ({
      id: r.id,
      text: r.text,
      tier: r.tier,
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
      color: r.color,
      done: r.done,
    }))),
  ),

  create: execProcedure
    .input(z.object({
      text: z.string().min(1).max(300),
      tier: z.enum(['urgent', 'soon', 'someday']).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      color: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.prisma.execTask.create({
        data: {
          execUserId: ctx.execUser.id,
          text: input.text.trim(),
          tier: input.tier ?? null,
          dueDate: input.dueDate ? new Date(input.dueDate + 'T00:00:00Z') : null,
          color: input.color ?? null,
        },
      })
      return {
        id: row.id, text: row.text, tier: row.tier,
        dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
        color: row.color, done: row.done,
      }
    }),

  toggle: execProcedure
    .input(z.object({ id: z.string().uuid(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Scope the update to this admin's own tasks so ids can't be guessed.
      const res = await ctx.prisma.execTask.updateMany({
        where: { id: input.id, execUserId: ctx.execUser.id },
        data: { done: input.done },
      })
      if (res.count === 0) throw new TRPCError({ code: 'NOT_FOUND' })
      return { ok: true }
    }),

  remove: execProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.execTask.deleteMany({ where: { id: input.id, execUserId: ctx.execUser.id } })
      return { ok: true }
    }),
})
