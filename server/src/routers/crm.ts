import { z } from 'zod'
import { router, execProcedure, publicProcedure } from '../trpc'

export const crmRouter = router({
  // Public inbound submissions from the footer info panels (suggestions,
  // money-saving tips, free-listings applications, contact) — captured as CRM
  // leads so the exec team receives them in the pipeline.
  submit: publicProcedure
    .input(z.object({
      type: z.enum(['suggestion', 'economic_tip', 'free_listings', 'contact']),
      message: z.string().min(1).max(4000),
      name: z.string().max(120).optional(),
      email: z.string().email().optional(),
      company: z.string().max(160).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const LABEL: Record<string, string> = {
        suggestion: 'Feature suggestion', economic_tip: 'Money-saving tip',
        free_listings: 'Free-listings application', contact: 'Contact enquiry',
      }
      return ctx.prisma.crmContact.create({
        data: {
          name: input.name?.trim() || 'Website visitor',
          email: input.email,
          company: input.company,
          stage: 'lead',
          notes: `[${LABEL[input.type]}] ${input.message}`,
          tags: ['inbound', input.type],
        },
        select: { id: true },
      })
    }),

  contacts: execProcedure
    .input(z.object({ stage: z.enum(['lead','qualified','pitch','proposal','close','won','nurture']).optional(), page: z.number().default(1) }))
    .query(({ ctx, input }) =>
      ctx.prisma.crmContact.findMany({
        where: input.stage ? { stage: input.stage } : {},
        orderBy: { updatedAt: 'desc' },
        skip: (input.page - 1) * 50,
        take: 50,
      })
    ),

  upsertContact: execProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      stage: z.enum(['lead','qualified','pitch','proposal','close','won','nurture']).optional(),
      value: z.number().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      if (id) return ctx.prisma.crmContact.update({ where: { id }, data })
      return ctx.prisma.crmContact.create({ data })
    }),

  moveStage: execProcedure
    .input(z.object({ id: z.string().uuid(), stage: z.enum(['lead','qualified','pitch','proposal','close','won','nurture']) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.crmContact.update({ where: { id: input.id }, data: { stage: input.stage } })
    ),

  members: execProcedure
    .input(z.object({ grade: z.enum(['grabber','dealer','trader','pro']).optional(), page: z.number().default(1) }))
    .query(({ ctx, input }) =>
      ctx.prisma.user.findMany({
        where: input.grade ? { grade: input.grade } : {},
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 50,
        take: 50,
        select: { id: true, displayName: true, email: true, grade: true, salesCount: true, avgRating: true, credits: true, createdAt: true },
      })
    ),

  disputes: execProcedure
    .input(z.object({ status: z.enum(['open','under_review','resolved_buyer','resolved_seller','escalated']).optional() }))
    .query(({ ctx, input }) =>
      ctx.prisma.dispute.findMany({
        where: input.status ? { status: input.status } : {},
        include: { transaction: { include: { listing: true } }, raisedBy: { select: { id: true, displayName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      })
    ),

  resolveDispute: execProcedure
    .input(z.object({ id: z.string().uuid(), resolution: z.string(), outcome: z.enum(['resolved_buyer','resolved_seller','escalated']) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.dispute.update({
        where: { id: input.id },
        data: { status: input.outcome, resolution: input.resolution, resolvedAt: new Date() },
      })
    ),

  financials: execProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.from)
      const to = new Date(input.to)
      const txs = await ctx.prisma.transaction.findMany({
        where: { createdAt: { gte: from, lte: to }, status: { in: ['completed', 'released'] } },
        select: { amount: true, platformFee: true, sellerNet: true, createdAt: true },
      })
      const totalGmv = txs.reduce((s, t) => s + Number(t.amount), 0)
      const totalFees = txs.reduce((s, t) => s + Number(t.platformFee), 0)
      return { totalGmv, totalFees, count: txs.length, byDay: txs }
    }),
})
