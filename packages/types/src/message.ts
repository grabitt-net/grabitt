import { z } from 'zod'

export const MessageChannel = z.enum(['in_app', 'sms', 'whatsapp'])
export type MessageChannel = z.infer<typeof MessageChannel>

export const MessageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().max(2000),
  channel: MessageChannel,
  blocked: z.boolean().default(false),
  blockedReason: z.string().nullable(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
})
export type Message = z.infer<typeof MessageSchema>

export const ThreadSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()),
  lastMessageAt: z.date().nullable(),
  createdAt: z.date(),
})
export type Thread = z.infer<typeof ThreadSchema>

export const SendMessageInputSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(2000),
  channel: MessageChannel.default('in_app'),
})
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>
