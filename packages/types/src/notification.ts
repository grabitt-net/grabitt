import { z } from 'zod'

export const NotificationKind = z.enum([
  'new_message', 'offer_received', 'offer_accepted', 'offer_declined',
  'payment_held', 'handover_confirmed', 'funds_released', 'new_review',
  'listing_expiring', 'grade_upgrade', 'credits_received', 'dispute_opened',
  'dispute_resolved', 'system',
])
export type NotificationKind = z.infer<typeof NotificationKind>

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  actionUrl: z.string().nullable(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
})
export type Notification = z.infer<typeof NotificationSchema>
