import { z } from 'zod'

export const PropertyType = z.enum(['sale', 'rent', 'holiday', 'commercial'])
export type PropertyType = z.infer<typeof PropertyType>

export const PropertyListingSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  type: PropertyType,
  bedrooms: z.number().int().min(0).nullable(),
  bathrooms: z.number().int().min(0).nullable(),
  m2: z.number().min(0).nullable(),
  community: z.string().nullable(),
  floor: z.number().int().nullable(),
  hasPool: z.boolean().default(false),
  hasGarage: z.boolean().default(false),
  energyRating: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  createdAt: z.date(),
})
export type PropertyListing = z.infer<typeof PropertyListingSchema>
