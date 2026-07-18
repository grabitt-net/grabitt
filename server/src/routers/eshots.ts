import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, execProcedure } from '../trpc'
import { countAudience, sendEshot, type Segment } from '../lib/eshotSend'

const SEGMENTS = ['all', 'grabber', 'dealer', 'trader', 'pro', 'business', 'inactive_30', 'inactive_60', 'new_members'] as const

export const eshotsRouter = router({
  list: execProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.eshot.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(e => ({
      ...e,
      // Rates are derived, never stored — recipientCount is the honest
      // denominator (using delivered would flatter the numbers).
      openRate: e.recipientCount ? Math.round((e.openCount / e.recipientCount) * 1000) / 10 : 0,
      clickRate: e.recipientCount ? Math.round((e.clickCount / e.recipientCount) * 1000) / 10 : 0,
      bounceRate: e.recipientCount ? Math.round((e.bounceCount / e.recipientCount) * 1000) / 10 : 0,
    }))
  }),

  // How many people a segment would actually reach right now (consent-filtered).
  audienceSize: execProcedure
    .input(z.object({ segment: z.enum(SEGMENTS) }))
    .query(({ ctx, input }) => countAudience(ctx.prisma, input.segment as Segment)),

  create: execProcedure
    .input(z.object({
      subject: z.string().min(1).max(200),
      bodyHtml: z.string().min(1),
      preheader: z.string().max(200).optional(),
      fromName: z.string().max(60).optional(),
      segment: z.enum(SEGMENTS),
    }))
    .mutation(({ ctx, input }) => ctx.prisma.eshot.create({ data: input })),

  update: execProcedure
    .input(z.object({
      id: z.string().uuid(),
      subject: z.string().min(1).max(200).optional(),
      bodyHtml: z.string().min(1).optional(),
      preheader: z.string().max(200).nullable().optional(),
      fromName: z.string().max(60).nullable().optional(),
      segment: z.enum(SEGMENTS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const existing = await ctx.prisma.eshot.findUniqueOrThrow({ where: { id }, select: { sentAt: true } })
      if (existing.sentAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A sent campaign cannot be edited' })
      return ctx.prisma.eshot.update({ where: { id }, data })
    }),

  remove: execProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const e = await ctx.prisma.eshot.findUniqueOrThrow({ where: { id: input.id }, select: { sentAt: true } })
      if (e.sentAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A sent campaign is kept as a record and cannot be deleted' })
      await ctx.prisma.eshot.delete({ where: { id: input.id } })
      return { ok: true }
    }),

  // Test send to one address — never touches the audience or the stats.
  sendTest: execProcedure
    .input(z.object({ id: z.string().uuid(), to: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const eshot = await ctx.prisma.eshot.findUniqueOrThrow({ where: { id: input.id } })
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY!)
      const { error } = await resend.emails.send({
        from: `${eshot.fromName?.trim() || 'Grabitt'} <noreply@grabitt.net>`,
        to: input.to,
        subject: `[TEST] ${eshot.subject}`,
        html: eshot.bodyHtml,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  send: execProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => sendEshot(ctx.prisma, input.id)),

  // Per-recipient delivery + engagement for one campaign.
  recipients: execProcedure
    .input(z.object({ id: z.string().uuid(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const take = 50
      const rows = await ctx.prisma.eshotRecipient.findMany({
        where: { eshotId: input.id },
        orderBy: [{ openCount: 'desc' }, { createdAt: 'asc' }],
        skip: (input.page - 1) * take,
        take,
        include: { user: { select: { id: true, displayName: true } } },
      })
      return {
        rows: rows.map(r => ({
          id: r.id, email: r.email, name: r.user?.displayName ?? null, userId: r.userId,
          status: r.status, openCount: r.openCount, clickCount: r.clickCount,
          openedAt: r.openedAt, clickedAt: r.clickedAt, error: r.error,
        })),
        page: input.page,
        hasMore: rows.length === take,
      }
    }),
})
