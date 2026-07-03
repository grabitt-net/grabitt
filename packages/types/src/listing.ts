import { z } from 'zod'

export const Department = z.enum([
  'home_garden', 'jobs', 'fashion', 'sport', 'gaming',
  'electronics', 'gift_ideas', 'kids_baby', 'property',
  'health_fitness', 'food_store', 'retro_vintage',
  'grab_it_now', 'handy_help', 'pet_shop',
])
export type Department = z.infer<typeof Department>

export const ListingCondition = z.enum(['new', 'like_new', 'good', 'fair', 'spares'])
export type ListingCondition = z.infer<typeof ListingCondition>

export const ListingStatus = z.enum([
  'draft', 'active', 'grab_it_now', 'sold', 'expired', 'removed',
])
export type ListingStatus = z.infer<typeof ListingStatus>

export const ListingSchema = z.object({
  id: z.string().uuid(),
  sellerId: z.string().uuid(),
  title: z.string().min(4).max(100),
  description: z.string().max(2000),
  price: z.number().min(0),
  department: Department,
  condition: ListingCondition,
  status: ListingStatus,
  images: z.array(z.string().url()).max(8),
  location: z.string().max(100),
  isFeatured: z.boolean().default(false),
  featuredUntil: z.date().nullable(),
  grabItNowUntil: z.date().nullable(),
  grabItNowWindow: z.number().nullable(),
  viewCount: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Listing = z.infer<typeof ListingSchema>

export const CreateListingInputSchema = z.object({
  title: z.string().min(4).max(100),
  description: z.string().max(2000),
  price: z.number().min(0),
  department: Department,
  condition: ListingCondition,
  images: z.array(z.string().url()).min(1).max(8),
  location: z.string().max(100),
  deliveryFee: z.number().min(0).default(0),
  deliveryMethod: z.enum(['courier', 'in_person']).optional(),
})
export type CreateListingInput = z.infer<typeof CreateListingInputSchema>

export const SearchInputSchema = z.object({
  query: z.string().optional(),
  department: Department.optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  condition: ListingCondition.optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().default(25),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'nearby']).default('newest'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
})
export type SearchInput = z.infer<typeof SearchInputSchema>
