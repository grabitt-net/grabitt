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
        take: 500,
        select: {
          id: true, displayName: true, email: true, grade: true, salesCount: true, avgRating: true,
          credits: true, createdAt: true, phone: true, collectionAddress: true, avatar: true,
          isBusiness: true, businessVerified: true, businessName: true, isVerified: true,
          emailVerified: true, phoneVerified: true, idVerified: true, addressVerified: true,
          strikeCount: true, suspendedUntil: true, suspendedReason: true, deletedAt: true, locale: true,
        },
      })
    ),

  // Exec suite: full member edit — profile details, account level, verification,
  // credits and suspension. Email/password are handled by /api/admin/user-auth
  // because they live in Supabase Auth, not just our DB.
  updateMember: execProcedure
    .input(z.object({
      userId: z.string().uuid(),
      displayName: z.string().min(2).max(60).optional(),
      phone: z.string().max(40).nullable().optional(),
      collectionAddress: z.string().max(300).nullable().optional(),
      businessName: z.string().max(80).nullable().optional(),
      grade: z.enum(['grabber', 'dealer', 'trader', 'pro']).optional(),
      isBusiness: z.boolean().optional(),
      businessVerified: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      emailVerified: z.boolean().optional(),
      phoneVerified: z.boolean().optional(),
      idVerified: z.boolean().optional(),
      addressVerified: z.boolean().optional(),
      credits: z.number().int().min(0).max(1_000_000).optional(),
      // Suspension: pass a date to suspend, or null to lift.
      suspendedUntil: z.string().datetime().nullable().optional(),
      suspendedReason: z.string().max(300).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, suspendedUntil, ...rest } = input
      const data: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) data[k] = v
      if (suspendedUntil !== undefined) {
        data.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null
        data.suspendedAt = suspendedUntil ? new Date() : null
      }
      if (Object.keys(data).length === 0) return { ok: true }

      const updated = await ctx.prisma.user.update({ where: { id: userId }, data })
      await ctx.prisma.execAuditLog.create({
        data: {
          execUserId: ctx.execUser.id,
          targetUserId: userId,
          action: 'member_update',
          detail: { fields: Object.keys(data) },
        },
      }).catch(() => { /* audit is best-effort */ })
      return { ok: true, id: updated.id }
    }),

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
