import { z } from 'zod'

export const DisputeStatus = z.enum(['open', 'under_review', 'resolved_buyer', 'resolved_seller', 'escalated'])
export type DisputeStatus = z.infer<typeof DisputeStatus>

export const DisputeSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  raisedBy: z.string().uuid(),
  reason: z.string().max(2000),
  evidence: z.array(z.string().url()),
  status: DisputeStatus,
  resolution: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Dispute = z.infer<typeof DisputeSchema>

export const OpenDisputeInputSchema = z.object({
  transactionId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).max(5),
})
export type OpenDisputeInput = z.infer<typeof OpenDisputeInputSchema>
