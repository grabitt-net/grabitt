import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const propertyRouter = router({
  list: publicProcedure
    .input(z.object({
      type: z.enum(['sale', 'rent', 'holiday', 'commercial']).optional(),
      minBedrooms: z.number().optional(),
      maxPrice: z.number().optional(),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.propertyListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.minBedrooms && { bedrooms: { gte: input.minBedrooms } }),
          listing: {
            status: 'active',
            ...(input.maxPrice && { price: { lte: input.maxPrice } }),
          },
        },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),
})
