import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const jobsRouter = router({
  list: publicProcedure
    .input(z.object({ type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).optional(), remote: z.boolean().optional(), page: z.number().default(1) }))
    .query(({ ctx, input }) =>
      ctx.prisma.jobListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.remote !== undefined && { remote: input.remote }),
          listing: { status: 'active' },
        },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),
})
