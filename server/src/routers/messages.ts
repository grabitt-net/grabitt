import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { SendMessageInputSchema } from '@grabitt/types'

// Regex patterns for contact info scan (§10.2 — scan BEFORE sending)
const CONTACT_PATTERNS = [
  /\b(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, // phone
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /wa\.me\/\d+|whatsapp/i, // WhatsApp links
]

function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some(p => p.test(text))
}

export const messagesRouter = router({
  thread: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), sellerId: z.string().uuid() }))
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
      return ctx.prisma.message.findMany({
        where: { threadId: input.threadId },
        orderBy: { createdAt: 'asc' },
      })
    }),

  myThreads: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.thread.findMany({
      where: { participants: { some: { userId: ctx.user.id } } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: { include: { user: { select: { id: true, displayName: true, avatar: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })
  ),
})
