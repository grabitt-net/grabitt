import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, execProcedure } from '../trpc'
import { writeAudit } from './crm'

// User-facing reason ids (from the report panel) → Prisma ReportReason enum.
// The panel speaks in friendly ids; the DB stores the canonical value.
const REASON_MAP = {
  scam: 'scam',
  counterfeit: 'counterfeit',
  prohibited: 'prohibited',
  fake: 'misleading',
  misleading: 'misleading',
  price: 'price_gouging',
  price_gouging: 'price_gouging',
  duplicate: 'duplicate',
  contact_info_leak: 'contact_info_leak',
  other: 'other',
} as const

export const reportsRouter = router({
  // A signed-in user reports a listing (and, through it, its seller). Previously
  // the panel faked success with a timeout and no row was ever written, so every
  // report was silently discarded — this creates the real record admins act on.
  create: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid().optional(),
      reason: z.string(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reason = REASON_MAP[input.reason as keyof typeof REASON_MAP] ?? 'other'

      // Resolve the reported seller from the listing, so reports are attributable
      // to a user even when the listing is later removed.
      let reportedUserId: string | null = null
      if (input.listingId) {
        const listing = await ctx.prisma.listing.findUnique({
          where: { id: input.listingId },
          select: { sellerId: true },
        })
        reportedUserId = listing?.sellerId ?? null
        // You can't report your own listing — usually a misclick, but it would
        // also let a seller pad their own report count.
        if (reportedUserId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: "You can't report your own listing." })
        }
      }

      const report = await ctx.prisma.report.create({
        data: {
          reporterId: ctx.user.id,
          reportedUserId,
          listingId: input.listingId ?? null,
          reason: reason as never,
          notes: input.notes?.trim() || null,
        },
        select: { id: true },
      })
      return { ok: true, id: report.id }
    }),

  // ── Exec moderation queue ───────────────────────────────────────────────────
  adminList: execProcedure
    .input(z.object({ status: z.enum(['all', 'open', 'under_review', 'actioned', 'dismissed']).default('open') }).optional())
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? 'open'
      const rows = await ctx.prisma.report.findMany({
        where: status === 'all' ? {} : { status },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          reporter: { select: { id: true, displayName: true, email: true } },
          reportedUser: { select: { id: true, displayName: true, email: true } },
          listing: { select: { id: true, title: true, status: true, price: true } },
        },
      })
      return rows.map(r => ({
        id: r.id,
        reason: r.reason,
        notes: r.notes,
        status: r.status,
        actionTaken: r.actionTaken,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        listingId: r.listingId,
        listingTitle: r.listing?.title ?? null,
        listingStatus: r.listing?.status ?? null,
        reporterName: r.reporter?.displayName ?? r.reporter?.email ?? '—',
        reportedUserId: r.reportedUserId,
        reportedName: r.reportedUser?.displayName ?? r.reportedUser?.email ?? null,
      }))
    }),

  // Resolve a report: dismiss it, or take the listing down. Both are recorded
  // in the exec audit trail against the reported user.
  resolve: execProcedure
    .input(z.object({
      id: z.string().uuid(),
      action: z.enum(['dismiss', 'takedown']),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findUnique({
        where: { id: input.id },
        select: { id: true, listingId: true, reportedUserId: true, status: true },
      })
      if (!report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' })

      const newStatus = input.action === 'takedown' ? 'actioned' : 'dismissed'

      await ctx.prisma.$transaction(async tx => {
        await tx.report.update({
          where: { id: report.id },
          data: {
            status: newStatus,
            actionTaken: input.action === 'takedown' ? 'Listing removed' : (input.note?.trim() || 'Dismissed — no action'),
            resolvedAt: new Date(),
          },
        })
        // A takedown removes the listing so it stops appearing anywhere public.
        if (input.action === 'takedown' && report.listingId) {
          await tx.listing.update({
            where: { id: report.listingId },
            data: { status: 'removed' },
          })
        }
      })

      await writeAudit(
        ctx.prisma,
        ctx.execUser.id,
        report.reportedUserId,
        input.action === 'takedown' ? 'report_takedown' : 'report_dismiss',
        { reportId: report.id, listingId: report.listingId, note: input.note ?? null },
      )
      return { ok: true, status: newStatus }
    }),
})
