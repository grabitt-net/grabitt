import { z } from 'zod'

export const TransactionStatus = z.enum([
  'pending_payment', 'held', 'confirmed_handover',
  'completed', 'released', 'disputed', 'refunded', 'cancelled',
])
export type TransactionStatus = z.infer<typeof TransactionStatus>

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  amount: z.number().min(0),
  platformFee: z.number().min(0),
  sellerNet: z.number().min(0),
  status: TransactionStatus,
  stripePaymentIntentId: z.string().nullable(),
  buyerRating: z.number().min(1).max(5).nullable(),
  sellerRating: z.number().min(1).max(5).nullable(),
  handoverConfirmedAt: z.date().nullable(),
  fundsReleasedAt: z.date().nullable(),
  autoReleaseAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const RateTransactionInputSchema = z.object({
  transactionId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
})
export type RateTransactionInput = z.infer<typeof RateTransactionInputSchema>
