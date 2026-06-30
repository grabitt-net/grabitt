import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const handyRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.enum(['plumbing','electrical','cleaning','painting','gardening','moving','assembly','it_support','tutoring','beauty','other']).optional(),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.handyListing.findMany({
        where: {
          ...(input.category && { category: input.category }),
          listing: { status: 'active' },
        },
        include: {
          listing: true,
          provider: { select: { id: true, displayName: true, avatar: true, avgRating: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),
})
