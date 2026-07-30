import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, execProcedure } from '../trpc'
import { MEMBER_STATUSES, MEMBER_STATUS_IDS, isMemberStatus } from '@grabitt/design-tokens'

// Special-status applications: a member applies for Student / Blue Light /
// Charity, an admin validates the evidence, and approval grants the status and
// its benefit (a selling-fee discount, or a free charity Business account).

export const statusRouter = router({
  // The member's current status + any application in flight.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const [user, apps] = await Promise.all([
      ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { memberStatus: true, statusDiscountPct: true, foundingMember: true } }),
      ctx.prisma.statusApplication.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' } }),
    ])
    return { memberStatus: user.memberStatus, foundingMember: user.foundingMember, applications: apps }
  }),

  // Apply for a status. One open application per kind at a time.
  apply: protectedProcedure
    .input(z.object({
      kind: z.enum(MEMBER_STATUS_IDS as [string, ...string[]]),
      details: z.string().max(300).optional(),
      evidenceUrl: z.string().url().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.statusApplication.findFirst({ where: { userId: ctx.user.id, kind: input.kind, status: 'pending' } })
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already have an application in review for this status.' })
      return ctx.prisma.statusApplication.create({ data: { userId: ctx.user.id, kind: input.kind, details: input.details, evidenceUrl: input.evidenceUrl } })
    }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminList: execProcedure
    .input(z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending') }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.statusApplication.findMany({
        where: input?.status && input.status !== 'all' ? { status: input.status } : {},
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: { user: { select: { id: true, displayName: true, email: true, memberStatus: true } } },
      })
    ),

  review: execProcedure
    .input(z.object({ id: z.string(), decision: z.enum(['approved', 'rejected']), note: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.statusApplication.findUniqueOrThrow({ where: { id: input.id } })
      await ctx.prisma.statusApplication.update({ where: { id: input.id }, data: { status: input.decision, reviewNote: input.note, reviewedAt: new Date() } })

      if (input.decision === 'approved' && isMemberStatus(app.kind)) {
        const s = MEMBER_STATUSES[app.kind]
        await ctx.prisma.user.update({
          where: { id: app.userId },
          data: {
            memberStatus: app.kind,
            statusDiscountPct: s.feeDiscountPct,
            // Charity is a free Business account.
            ...('freeBusiness' in s && s.freeBusiness ? { isBusiness: true } : {}),
          },
        })
      }
      await ctx.prisma.notification.create({
        data: {
          userId: app.userId,
          kind: 'system',
          title: input.decision === 'approved' ? `✅ ${statusLabel(app.kind)} status approved` : `${statusLabel(app.kind)} application update`,
          body: input.decision === 'approved'
            ? `Your ${statusLabel(app.kind)} status is now active on your account.`
            : `Your ${statusLabel(app.kind)} application wasn’t approved${input.note ? `: ${input.note}` : '.'}`,
          actionUrl: '/account',
        },
      }).catch(() => {})
      return { ok: true }
    }),

  // Admin: revoke a granted status.
  revoke: execProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({ where: { id: input.userId }, data: { memberStatus: null, statusDiscountPct: null } })
      return { ok: true }
    }),
})

function statusLabel(kind: string): string {
  return isMemberStatus(kind) ? MEMBER_STATUSES[kind].label : kind
}
