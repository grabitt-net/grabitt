import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const propertyRouter = router({
  list: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.enum(['sale', 'rent', 'holiday', 'commercial', 'land', 'new_build']).optional(),
      minBedrooms: z.number().optional(),
      minBathrooms: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      hasPool: z.boolean().optional(),
      hasGarage: z.boolean().optional(),
      location: z.string().optional(),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.propertyListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.minBedrooms && { bedrooms: { gte: input.minBedrooms } }),
          ...(input.minBathrooms && { bathrooms: { gte: input.minBathrooms } }),
          ...(input.hasPool && { hasPool: true }),
          ...(input.hasGarage && { hasGarage: true }),
          listing: {
            status: 'active',
            ...((input.minPrice || input.maxPrice) && {
              price: {
                ...(input.minPrice && { gte: input.minPrice }),
                ...(input.maxPrice && { lte: input.maxPrice }),
              },
            }),
            ...(input.location && { location: { contains: input.location, mode: 'insensitive' } }),
            ...(input.query && { title: { contains: input.query, mode: 'insensitive' } }),
          },
        },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),
})
