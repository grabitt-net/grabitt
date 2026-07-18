import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'
import { router, protectedProcedure, execProcedure } from '../trpc'

// GDPR erasure of the application record: strips PII from the User row and logs
// the request. Transactions are deliberately KEPT (legal retention + the other
// party's rights) — the row is anonymised, not deleted, so those records stay
// intact but are detached from a real person.
//
// NOTE: this only covers OUR database. The Supabase Auth identity still holds
// the user's email and active sessions, so callers must also erase that — see
// apps/web/app/api/account/delete/route.ts, which is the complete flow.
export async function anonymiseUser(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.deletedAt) return { alreadyDeleted: true, supabaseId: user.supabaseId }

  await prisma.deletionRequest.create({
    data: {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      status: 'completed',
      completedAt: new Date(),
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: `deleted+${user.id}@grabitt.invalid`,
      displayName: 'Deleted user',
      avatar: null,
      phone: null,
      collectionAddress: null,
      businessName: null,
      businessBio: null,
      businessBanner: null,
      isBusiness: false,
      interests: [],
      deletedAt: new Date(),
    },
  })
  return { alreadyDeleted: false, supabaseId: user.supabaseId }
}

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
        data: {
          userId: ctx.user.id, kind: input.kind, email: user.email, displayName: user.displayName,
          ipAddress: ctx.ip, userAgent: ctx.userAgent,
        },
      })
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input.kind === 'gdpr' ? { gdprAcceptedAt: new Date() } : { withdrawalWaiverAcceptedAt: new Date() },
      })
      return { ok: true }
    }),

  // Database-side erasure only. Prefer POST /api/account/delete, which runs this
  // AND erases the Supabase Auth identity (email + sessions). Kept for the
  // mobile client until it moves to the full flow.
  requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const res = await anonymiseUser(ctx.prisma, ctx.user.id)
    return { ok: true, alreadyDeleted: res.alreadyDeleted }
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
