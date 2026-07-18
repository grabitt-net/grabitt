import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, execProcedure, publicProcedure } from '../trpc'
import type { PrismaClient, Prisma } from '@prisma/client'

// Records a privileged action against the acting admin. Best-effort: an audit
// failure must never break the action the admin actually asked for.
export async function writeAudit(
  prisma: PrismaClient,
  execUserId: string,
  targetUserId: string | null,
  action: string,
  detail?: Prisma.InputJsonValue,
) {
  try {
    await prisma.execAuditLog.create({
      data: { execUserId, targetUserId, action, ...(detail ? { detail } : {}) },
    })
  } catch { /* never block the action on audit */ }
}

// Rows per page in the member detail view. memberDetail returns page 1 of each
// section; memberSection pages through the rest.
const MEMBER_PAGE_SIZE = 25

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
    .query(async ({ ctx, input }) => {
      const users = await ctx.prisma.user.findMany({
        where: input.grade ? { grade: input.grade } : {},
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 50,
        take: 500,
        select: {
          id: true, supabaseId: true, displayName: true, email: true, grade: true, salesCount: true,
          avgRating: true, credits: true, createdAt: true, phone: true, collectionAddress: true, avatar: true,
          isBusiness: true, businessVerified: true, businessName: true, isVerified: true,
          emailVerified: true, phoneVerified: true, idVerified: true, addressVerified: true,
          strikeCount: true, suspendedUntil: true, suspendedReason: true, deletedAt: true, locale: true,
        },
      })
      // Admin access lives in Supabase's `profiles.is_admin` (that's what gates
      // /admin), not on our User table — so read it alongside.
      const adminRows = await ctx.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM profiles WHERE is_admin = true`
      const adminIds = new Set(adminRows.map(r => r.id))
      return users.map(({ supabaseId, ...u }) => ({ ...u, isAdmin: adminIds.has(supabaseId) }))
    }),

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
      await writeAudit(ctx.prisma, ctx.execUser.id, userId, 'member_update', { fields: Object.keys(data) })
      return { ok: true, id: updated.id }
    }),

  // Exec suite: everything about one member, for the 360° detail view —
  // listings, sales, purchases, jobs, applications, property, messages,
  // reviews, disputes, credits and consents.
  memberDetail: execProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const id = input.userId
      const PAGE = MEMBER_PAGE_SIZE
      const [
        user, listings, sales, purchases, jobsPosted, applications,
        reviewsGiven, reviewsReceived, disputes, credits, threads,
        messageCount, consents, subscriptions, seeker, strikes,
      ] = await Promise.all([
        ctx.prisma.user.findUniqueOrThrow({ where: { id } }),
        ctx.prisma.listing.findMany({
          where: { sellerId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { jobListing: true, propertyListing: true, _count: { select: { wishlistItems: true } } },
        }),
        ctx.prisma.transaction.findMany({
          where: { sellerId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { listing: { select: { title: true } }, buyer: { select: { id: true, displayName: true } } },
        }),
        ctx.prisma.transaction.findMany({
          where: { buyerId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { listing: { select: { title: true } }, seller: { select: { id: true, displayName: true } } },
        }),
        ctx.prisma.jobListing.findMany({
          where: { employerId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { listing: { select: { id: true, status: true } }, _count: { select: { applications: true } } },
        }),
        ctx.prisma.jobApplication.findMany({
          where: { applicantId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { jobListing: { select: { jobTitle: true, company: true, listingId: true } } },
        }),
        ctx.prisma.review.findMany({
          where: { authorId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { subject: { select: { id: true, displayName: true } } },
        }),
        ctx.prisma.review.findMany({
          where: { subjectId: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { author: { select: { id: true, displayName: true } } },
        }),
        ctx.prisma.dispute.findMany({
          where: { raisedById: id }, orderBy: { createdAt: 'desc' }, take: PAGE,
          include: { transaction: { include: { listing: { select: { title: true } } } } },
        }),
        ctx.prisma.creditEvent.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: PAGE }),
        ctx.prisma.threadParticipant.findMany({
          where: { userId: id }, take: PAGE,
          include: {
            thread: {
              include: {
                participants: { include: { user: { select: { id: true, displayName: true } } } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                _count: { select: { messages: true } },
              },
            },
          },
        }),
        ctx.prisma.message.count({ where: { senderId: id } }),
        ctx.prisma.consent.findMany({ where: { userId: id }, orderBy: { acceptedAt: 'desc' } }),
        ctx.prisma.subscription.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
        ctx.prisma.seekerProfile.findUnique({ where: { userId: id } }),
        ctx.prisma.userStrike.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: PAGE }),
      ])

      // Totals come from count/aggregate queries, NOT from the arrays above —
      // those are only the first page, so counting them would under-report.
      const [
        cListings, cLive, cProperties, cJobs, cApplications,
        cSales, cPurchases, cThreads, cDisputes, cStrikes,
        salesAgg, purchaseAgg,
      ] = await Promise.all([
        ctx.prisma.listing.count({ where: { sellerId: id } }),
        ctx.prisma.listing.count({ where: { sellerId: id, status: 'active' } }),
        ctx.prisma.propertyListing.count({ where: { listing: { sellerId: id } } }),
        ctx.prisma.jobListing.count({ where: { employerId: id } }),
        ctx.prisma.jobApplication.count({ where: { applicantId: id } }),
        ctx.prisma.transaction.count({ where: { sellerId: id } }),
        ctx.prisma.transaction.count({ where: { buyerId: id } }),
        ctx.prisma.threadParticipant.count({ where: { userId: id } }),
        ctx.prisma.dispute.count({ where: { raisedById: id } }),
        ctx.prisma.userStrike.count({ where: { userId: id } }),
        ctx.prisma.transaction.aggregate({ where: { sellerId: id }, _sum: { amount: true, platformFee: true } }),
        ctx.prisma.transaction.aggregate({ where: { buyerId: id }, _sum: { amount: true } }),
      ])

      const money = (v: unknown) => (v == null ? null : Number(v))
      const properties = listings.filter(l => l.propertyListing)

      return {
        user: {
          ...user,
          credits: user.credits,
          avgRating: user.avgRating,
        },
        pageSize: PAGE,
        totals: {
          listings: cListings,
          liveListings: cLive,
          properties: cProperties,
          jobsPosted: cJobs,
          applications: cApplications,
          sales: cSales,
          purchases: cPurchases,
          salesValue: Number(salesAgg._sum.amount ?? 0),
          purchaseValue: Number(purchaseAgg._sum.amount ?? 0),
          feesPaid: Number(salesAgg._sum.platformFee ?? 0),
          messagesSent: messageCount,
          threads: cThreads,
          disputes: cDisputes,
          strikes: cStrikes,
        },
        listings: listings.map(l => ({
          id: l.id, title: l.title, price: money(l.price), status: l.status,
          department: l.department, location: l.location, createdAt: l.createdAt,
          views: l.viewCount, saves: l._count.wishlistItems,
          kind: l.jobListing ? 'job' : l.propertyListing ? 'property' : 'item',
        })),
        properties: properties.map(l => ({
          id: l.id, title: l.title, price: money(l.price), status: l.status, location: l.location,
          type: l.propertyListing!.type, bedrooms: l.propertyListing!.bedrooms,
          bathrooms: l.propertyListing!.bathrooms, m2: money(l.propertyListing!.m2),
          createdAt: l.createdAt,
        })),
        jobsPosted: jobsPosted.map(j => ({
          id: j.id, listingId: j.listingId, jobTitle: j.jobTitle, company: j.company,
          type: j.type, status: j.listing.status, applicants: j._count.applications, createdAt: j.createdAt,
        })),
        applications: applications.map(a => ({
          id: a.id, status: a.status, createdAt: a.createdAt,
          jobTitle: a.jobListing.jobTitle, company: a.jobListing.company, listingId: a.jobListing.listingId,
          coverNote: a.coverNote, cvOnFile: !!a.cvUrl,
        })),
        sales: sales.map(t => ({
          id: t.id, item: t.listing.title, amount: money(t.amount), fee: money(t.platformFee),
          net: money(t.sellerNet), status: t.status, createdAt: t.createdAt,
          counterparty: t.buyer.displayName, counterpartyId: t.buyer.id,
        })),
        purchases: purchases.map(t => ({
          id: t.id, item: t.listing.title, amount: money(t.amount), status: t.status,
          createdAt: t.createdAt, counterparty: t.seller.displayName, counterpartyId: t.seller.id,
        })),
        threads: threads.map(tp => {
          const other = tp.thread.participants.find(p => p.userId !== id)
          const last = tp.thread.messages[0]
          return {
            id: tp.thread.id,
            with: other?.user.displayName ?? 'Unknown',
            withId: other?.user.id ?? null,
            messages: tp.thread._count.messages,
            lastAt: last?.createdAt ?? null,
            lastPreview: last ? last.body.slice(0, 120) : null,
          }
        }).sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0)),
        reviewsGiven: reviewsGiven.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, about: r.subject.displayName, createdAt: r.createdAt })),
        reviewsReceived: reviewsReceived.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, by: r.author.displayName, createdAt: r.createdAt })),
        disputes: disputes.map(d => ({ id: d.id, status: d.status, reason: d.reason, item: d.transaction.listing.title, createdAt: d.createdAt })),
        credits: credits.map(c => ({ id: c.id, kind: c.kind, delta: c.delta, balance: c.balance, note: c.note, createdAt: c.createdAt })),
        consents: consents.map(c => ({ id: c.id, kind: c.kind, acceptedAt: c.acceptedAt, ipAddress: c.ipAddress })),
        subscriptions: subscriptions.map(s => ({ id: s.id, plan: s.plan, status: s.status, currentPeriodEnd: s.currentPeriodEnd, cancelAtPeriodEnd: s.cancelAtPeriodEnd })),
        strikes: strikes.map(s => ({ id: s.id, reason: s.reason, createdAt: s.createdAt })),
        seekerProfile: seeker,
      }
    }),

  // Pages through one section of the member detail view. memberDetail returns
  // page 1; this fetches the rest on demand.
  memberSection: execProcedure
    .input(z.object({
      userId: z.string().uuid(),
      section: z.enum(['listings', 'sales', 'purchases', 'jobsPosted', 'applications', 'properties', 'threads', 'credits']),
      page: z.number().int().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const id = input.userId
      const take = MEMBER_PAGE_SIZE
      const skip = (input.page - 1) * take
      const money = (v: unknown) => (v == null ? null : Number(v))
      const page = <T>(rows: T[]) => ({ rows, page: input.page, hasMore: rows.length === take })

      switch (input.section) {
        case 'listings': {
          const rows = await ctx.prisma.listing.findMany({
            where: { sellerId: id }, orderBy: { createdAt: 'desc' }, skip, take,
            include: { jobListing: true, propertyListing: true, _count: { select: { wishlistItems: true } } },
          })
          return page(rows.map(l => ({
            id: l.id, title: l.title, price: money(l.price), status: l.status, department: l.department,
            location: l.location, createdAt: l.createdAt, views: l.viewCount, saves: l._count.wishlistItems,
            kind: l.jobListing ? 'job' : l.propertyListing ? 'property' : 'item',
          })))
        }
        case 'properties': {
          const rows = await ctx.prisma.propertyListing.findMany({
            where: { listing: { sellerId: id } }, orderBy: { createdAt: 'desc' }, skip, take,
            include: { listing: { select: { id: true, title: true, price: true, status: true, location: true, createdAt: true } } },
          })
          return page(rows.map(p => ({
            id: p.listing.id, title: p.listing.title, price: money(p.listing.price), status: p.listing.status,
            location: p.listing.location, createdAt: p.listing.createdAt,
            type: p.type, bedrooms: p.bedrooms, bathrooms: p.bathrooms, m2: money(p.m2),
          })))
        }
        case 'sales': {
          const rows = await ctx.prisma.transaction.findMany({
            where: { sellerId: id }, orderBy: { createdAt: 'desc' }, skip, take,
            include: { listing: { select: { title: true } }, buyer: { select: { id: true, displayName: true } } },
          })
          return page(rows.map(t => ({
            id: t.id, item: t.listing.title, amount: money(t.amount), fee: money(t.platformFee),
            net: money(t.sellerNet), status: t.status, createdAt: t.createdAt,
            counterparty: t.buyer.displayName, counterpartyId: t.buyer.id,
          })))
        }
        case 'purchases': {
          const rows = await ctx.prisma.transaction.findMany({
            where: { buyerId: id }, orderBy: { createdAt: 'desc' }, skip, take,
            include: { listing: { select: { title: true } }, seller: { select: { id: true, displayName: true } } },
          })
          return page(rows.map(t => ({
            id: t.id, item: t.listing.title, amount: money(t.amount), status: t.status,
            createdAt: t.createdAt, counterparty: t.seller.displayName, counterpartyId: t.seller.id,
          })))
        }
        case 'jobsPosted': {
          const rows = await ctx.prisma.jobListing.findMany({
            where: { employerId: id }, orderBy: { createdAt: 'desc' }, skip, take,
            include: { listing: { select: { id: true, status: true } }, _count: { select: { applications: true } } },
          })
          return page(rows.map(j => ({
            id: j.id, listingId: j.listingId, jobTitle: j.jobTitle, company: j.company,
            type: j.type, status: j.listing.status, applicants: j._count.applications, createdAt: j.createdAt,
          })))
        }
        case 'applications': {
          const rows = await ctx.prisma.jobApplication.findMany({
            where: { applicantId: id }, orderBy: { createdAt: 'desc' }, skip, take,
            include: { jobListing: { select: { jobTitle: true, company: true, listingId: true } } },
          })
          return page(rows.map(a => ({
            id: a.id, status: a.status, createdAt: a.createdAt, jobTitle: a.jobListing.jobTitle,
            company: a.jobListing.company, listingId: a.jobListing.listingId,
            coverNote: a.coverNote, cvOnFile: !!a.cvUrl,
          })))
        }
        case 'threads': {
          const rows = await ctx.prisma.threadParticipant.findMany({
            where: { userId: id }, skip, take,
            include: {
              thread: {
                include: {
                  participants: { include: { user: { select: { id: true, displayName: true } } } },
                  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                  _count: { select: { messages: true } },
                },
              },
            },
          })
          return page(rows.map(tp => {
            const other = tp.thread.participants.find(p => p.userId !== id)
            const last = tp.thread.messages[0]
            return {
              id: tp.thread.id, with: other?.user.displayName ?? 'Unknown', withId: other?.user.id ?? null,
              messages: tp.thread._count.messages, lastAt: last?.createdAt ?? null,
              lastPreview: last ? last.body.slice(0, 120) : null,
            }
          }))
        }
        case 'credits': {
          const rows = await ctx.prisma.creditEvent.findMany({
            where: { userId: id }, orderBy: { createdAt: 'desc' }, skip, take,
          })
          return page(rows.map(c => ({ id: c.id, kind: c.kind, delta: c.delta, balance: c.balance, note: c.note, createdAt: c.createdAt })))
        }
      }
    }),

  // Full message transcript for a DISPUTED transaction only.
  //
  // Deliberately scoped: reading private conversations is intrusive, so this is
  // limited to threads about the disputed listing between the two parties to
  // that trade, and only while a dispute exists. It is not a general message
  // reader. Access is audit-logged.
  disputeTranscript: execProcedure
    .input(z.object({ disputeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const dispute = await ctx.prisma.dispute.findUnique({
        where: { id: input.disputeId },
        include: {
          transaction: {
            include: {
              listing: { select: { id: true, title: true } },
              buyer: { select: { id: true, displayName: true } },
              seller: { select: { id: true, displayName: true } },
            },
          },
        },
      })
      if (!dispute) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dispute not found' })

      const { listing, buyer, seller } = dispute.transaction
      // Threads about this listing that both parties to the trade are in.
      const threads = await ctx.prisma.thread.findMany({
        where: {
          listingId: listing.id,
          AND: [
            { participants: { some: { userId: buyer.id } } },
            { participants: { some: { userId: seller.id } } },
          ],
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, displayName: true } } },
          },
        },
      })

      await writeAudit(ctx.prisma, ctx.execUser.id, dispute.raisedById, 'dispute_transcript_viewed', {
        disputeId: dispute.id, listingId: listing.id,
      })

      return {
        dispute: { id: dispute.id, reason: dispute.reason, status: dispute.status, createdAt: dispute.createdAt },
        item: listing.title,
        buyer: buyer.displayName,
        seller: seller.displayName,
        messages: threads.flatMap(t => t.messages).map(m => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          sender: m.sender.displayName,
          side: m.senderId === buyer.id ? 'buyer' : m.senderId === seller.id ? 'seller' : 'other',
          createdAt: m.createdAt,
          readAt: m.readAt,
        })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      }
    }),

  // Exec suite: who did what, to whom, when.
  auditTrail: execProcedure
    .input(z.object({ targetUserId: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).default(100) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.execAuditLog.findMany({
        where: input?.targetUserId ? { targetUserId: input.targetUserId } : {},
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 100,
        include: {
          execUser: { select: { email: true, role: true } },
          targetUser: { select: { id: true, displayName: true, email: true } },
        },
      })
      return rows.map(r => ({
        id: r.id,
        action: r.action,
        detail: r.detail as Record<string, unknown> | null,
        createdAt: r.createdAt,
        by: r.execUser.email,
        byRole: r.execUser.role,
        targetId: r.targetUser?.id ?? null,
        target: r.targetUser?.displayName ?? null,
        targetEmail: r.targetUser?.email ?? null,
      }))
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
