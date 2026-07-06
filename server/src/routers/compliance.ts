import { z } from 'zod'
import { router, protectedProcedure, execProcedure } from '../trpc'

export const complianceRouter = router({
  // Current user's consent status — decides which blocking modals to show.
  status: protectedProcedure.query(async ({ ctx }) => {
    const u = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { gdprAcceptedAt: true, withdrawalWaiverAcceptedAt: true, deletedAt: true },
    })
    return {
      gdprAccepted: !!u.gdprAcceptedAt,
      withdrawalWaiverAccepted: !!u.withdrawalWaiverAcceptedAt,
      deleted: !!u.deletedAt,
    }
  }),

  // Record acceptance of a consent (GDPR or the right-to-withdraw waiver).
  accept: protectedProcedure
    .input(z.object({ kind: z.enum(['gdpr', 'withdrawal_waiver']) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { email: true, displayName: true },
      })
      await ctx.prisma.consent.create({
        data: { userId: ctx.user.id, kind: input.kind, email: user.email, displayName: user.displayName },
      })
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input.kind === 'gdpr' ? { gdprAcceptedAt: new Date() } : { withdrawalWaiverAcceptedAt: new Date() },
      })
      return { ok: true }
    }),

  // GDPR erasure: record the request, anonymise PII, revoke access. Sales and
  // purchase records (Transactions) are intentionally KEPT — the User row is
  // anonymised, not deleted, to preserve those records' integrity.
  requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
    if (user.deletedAt) return { ok: true, alreadyDeleted: true }

    await ctx.prisma.deletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    await ctx.prisma.user.update({
      where: { id: user.id },
      data: {
        email: `deleted+${user.id}@grabitt.invalid`,
        displayName: 'Deleted user',
        avatar: null,
        businessName: null,
        businessBio: null,
        businessBanner: null,
        isBusiness: false,
        interests: [],
        deletedAt: new Date(),
      },
    })
    return { ok: true }
  }),

  // ── Exec / admin views ──────────────────────────────────────────────────────
  consentLog: execProcedure
    .input(z.object({ kind: z.enum(['gdpr', 'withdrawal_waiver']).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.consent.findMany({
        where: input?.kind ? { kind: input.kind } : {},
        orderBy: { acceptedAt: 'desc' },
        take: 1000,
      })
    ),

  deletionRequests: execProcedure.query(({ ctx }) =>
    ctx.prisma.deletionRequest.findMany({ orderBy: { requestedAt: 'desc' }, take: 1000 })
  ),
})
