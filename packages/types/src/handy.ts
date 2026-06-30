import { z } from 'zod'

export const HandyCategory = z.enum([
  'plumbing', 'electrical', 'cleaning', 'painting', 'gardening',
  'moving', 'assembly', 'it_support', 'tutoring', 'beauty', 'other',
])
export type HandyCategory = z.infer<typeof HandyCategory>

export const HandyListingSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  providerId: z.string().uuid(),
  category: HandyCategory,
  pricePerHour: z.number().nullable(),
  priceFixed: z.number().nullable(),
  availableDays: z.array(z.number().int().min(0).max(6)),
  responseTimeHours: z.number().int().min(1).nullable(),
  insured: z.boolean().default(false),
  createdAt: z.date(),
})
export type HandyListing = z.infer<typeof HandyListingSchema>
