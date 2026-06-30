import { z } from 'zod'
import { router, execProcedure } from '../trpc'

export const eshotsRouter = router({
  list: execProcedure.query(({ ctx }) =>
    ctx.prisma.eshot.findMany({ orderBy: { createdAt: 'desc' } })
  ),

  create: execProcedure
    .input(z.object({
      subject: z.string(),
      bodyHtml: z.string(),
      segment: z.enum(['all','grabber','dealer','trader','pro','business','inactive']),
    }))
    .mutation(({ ctx, input }) => ctx.prisma.eshot.create({ data: input })),

  send: execProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const eshot = await ctx.prisma.eshot.findUniqueOrThrow({ where: { id: input.id } })
      if (eshot.sentAt) throw new Error('Already sent')
      // Resend integration dispatched via pg-boss job queue
      const { boss } = await import('../jobs/index')
      await boss.send('send-eshot', { eshotId: eshot.id, segment: eshot.segment })
      return ctx.prisma.eshot.update({ where: { id: input.id }, data: { sentAt: new Date() } })
    }),
})
