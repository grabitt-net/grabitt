import { z } from 'zod'

export const CreditEventKind = z.enum([
  'registration_bonus', 'share_reward', 'referral', 'purchase',
  'featured_listing', 'grab_it_now', 'refund', 'admin_adjustment',
])
export type CreditEventKind = z.infer<typeof CreditEventKind>

export const CreditEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: CreditEventKind,
  delta: z.number().int(),
  balance: z.number().int().min(0),
  note: z.string().nullable(),
  createdAt: z.date(),
})
export type CreditEvent = z.infer<typeof CreditEventSchema>
