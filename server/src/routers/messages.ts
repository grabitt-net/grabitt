import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { SendMessageInputSchema } from '@grabitt/types'
import { containsContactInfo } from '../lib/contactScan'

// Withholds a blocked message's text from anyone other than its sender. Keeping
// the row (rather than dropping it) preserves the audit trail for disputes and
// lets the sender see that their message was stopped.
const WITHHELD = 'This message was hidden because it contained contact details. Keep deals on Grabitt so your payment stays protected.'

function maskBlocked<T extends { body: string; blocked: boolean; senderId: string }>(m: T, viewerId: string): T {
  if (!m.blocked || m.senderId === viewerId) return m
  return { ...m, body: WITHHELD }
}

export const messagesRouter = router({
  thread: protectedProcedure
    .input(z.object({ listingId: z.string().min(1), sellerId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.sellerId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot message yourself' })
      }

      const existing = await ctx.prisma.thread.findFirst({
        where: {
          listingId: input.listingId,
          participants: { some: { userId: ctx.user.id } },
        },
      })
      if (existing) return existing

      return ctx.prisma.thread.create({
        data: {
          listingId: input.listingId,
          participants: {
            create: [{ userId: ctx.user.id }, { userId: input.sellerId }],
          },
        },
      })
    }),

  send: protectedProcedure
    .input(SendMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.prisma.thread.findUnique({
        where: { id: input.threadId },
        include: { participants: true },
      })

      if (!thread) throw new TRPCError({ code: 'NOT_FOUND' })
      const isParticipant = thread.participants.some(p => p.userId === ctx.user.id)
      if (!isParticipant) throw new TRPCError({ code: 'FORBIDDEN' })

      // Scan message for contact info BEFORE sending (§10.2)
      const blocked = containsContactInfo(input.body)
      const message = await ctx.prisma.message.create({
        data: {
          threadId: input.threadId,
          senderId: ctx.user.id,
          body: input.body,
          channel: input.channel,
          blocked,
          blockedReason: blocked ? 'Contact information detected' : null,
        },
      })

      if (!blocked) {
        await ctx.prisma.thread.update({
          where: { id: input.threadId },
          data: { lastMessageAt: new Date() },
        })
      }

      return message
    }),

  threadMessages: protectedProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.prisma.thread.findUniqueOrThrow({
        where: { id: input.threadId },
        include: { participants: true },
      })
      if (!thread.participants.some(p => p.userId === ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const rows = await ctx.prisma.message.findMany({
        where: { threadId: input.threadId },
        orderBy: { createdAt: 'asc' },
      })
      // A blocked message is withheld from the RECIPIENT — previously the flag
      // was set but the full text was still delivered, so contact details (and
      // therefore off-platform deals) got through anyway. The sender still sees
      // their own text, with a note that it wasn't delivered.
      return rows.map(m => maskBlocked(m, ctx.user.id))
    }),

  myThreads: protectedProcedure.query(async ({ ctx }) => {
    const threads = await ctx.prisma.thread.findMany({
      where: { participants: { some: { userId: ctx.user.id } } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })
    // Thread.listingId is a plain column, not a relation, so the listings the
    // inbox labels each conversation with are fetched in one extra query.
    const listings = await ctx.prisma.listing.findMany({
      where: { id: { in: [...new Set(threads.map(t => t.listingId))] } },
      select: { id: true, title: true, price: true, images: true, department: true, sellerId: true },
    })
    const listingById = new Map(listings.map(l => [l.id, l]))
    // Job messages are managed inside the employer's Candidate Management area,
    // not the general inbox — so hide the employer's OWN job threads here. The
    // candidate still sees them in their inbox.
    const jobOwnerHidden = new Set(
      threads.filter(t => { const l = listingById.get(t.listingId); return l?.department === 'jobs' && l.sellerId === ctx.user.id }).map(t => t.id)
    )
    // Unread count per thread — messages sent by the other party, not yet read.
    const unreadRows = threads.length ? await ctx.prisma.message.groupBy({
      by: ['threadId'],
      where: { threadId: { in: threads.map(t => t.id) }, senderId: { not: ctx.user.id }, readAt: null },
      _count: { _all: true },
    }) : []
    const unreadByThread = new Map(unreadRows.map(r => [r.threadId, r._count._all]))
    // The inbox preview shows the last message — mask it too, or blocked
    // contact details leak through the preview even though the thread hides them.
    return threads.filter(t => !jobOwnerHidden.has(t.id)).map(t => ({
      ...t,
      unreadCount: unreadByThread.get(t.id) ?? 0,
      messages: t.messages.map(m => maskBlocked(m, ctx.user.id)),
      listing: listingById.get(t.listingId) ?? null,
    }))
  }),

  // Threads for one specific job advert (its listingId) that the caller takes
  // part in — powers the per-job Messages view in Candidate Management, kept
  // separate from the general inbox.
  jobThreads: protectedProcedure
    .input(z.object({ listingId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const threads = await ctx.prisma.thread.findMany({
        where: { listingId: input.listingId, participants: { some: { userId: ctx.user.id } } },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          participants: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      })
      const unreadRows = threads.length ? await ctx.prisma.message.groupBy({
        by: ['threadId'],
        where: { threadId: { in: threads.map(t => t.id) }, senderId: { not: ctx.user.id }, readAt: null },
        _count: { _all: true },
      }) : []
      const unreadByThread = new Map(unreadRows.map(r => [r.threadId, r._count._all]))
      return threads.map(t => ({
        ...t,
        unreadCount: unreadByThread.get(t.id) ?? 0,
        messages: t.messages.map(m => maskBlocked(m, ctx.user.id)),
      }))
    }),

  // Total unread messages for the signed-in user (for the nav Alerts badge).
  unreadCount: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.message.count({
      where: {
        thread: { participants: { some: { userId: ctx.user.id } } },
        senderId: { not: ctx.user.id },
        readAt: null,
      },
    })
  ),

  // Marks every message in a thread NOT sent by the caller as read.
  markThreadRead: protectedProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.prisma.thread.findUnique({
        where: { id: input.threadId },
        include: { participants: true },
      })
      if (!thread) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!thread.participants.some(p => p.userId === ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      await ctx.prisma.message.updateMany({
        where: { threadId: input.threadId, senderId: { not: ctx.user.id }, readAt: null },
        data: { readAt: new Date() },
      })
      return { ok: true }
    }),
})
