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
      select: { id: true, title: true, price: true, images: true },
    })
    const listingById = new Map(listings.map(l => [l.id, l]))
    // The inbox preview shows the last message — mask it too, or blocked
    // contact details leak through the preview even though the thread hides them.
    return threads.map(t => ({
      ...t,
      messages: t.messages.map(m => maskBlocked(m, ctx.user.id)),
      listing: listingById.get(t.listingId) ?? null,
    }))
  }),

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
