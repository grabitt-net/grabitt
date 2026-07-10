import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

// Community content — editorial posts (island tips, economy write-ups, guides)
// shown on the homepage. Public reads; admin (exec) manages.
export const communityRouter = router({
  // Public: published posts for the homepage strip / index.
  list: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(30).default(12) }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.communityPost.findMany({
        where: { published: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: input?.limit ?? 12,
      })
    ),

  // Public: a single post for the reader view.
  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ ctx, input }) =>
      ctx.prisma.communityPost.findFirstOrThrow({ where: { id: input.id, published: true } })
    ),

  // Admin: everything, for management.
  all: execProcedure.query(({ ctx }) =>
    ctx.prisma.communityPost.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
  ),

  upsert: execProcedure
    .input(z.object({
      id: z.string().optional(),
      title: z.string().min(3).max(140),
      excerpt: z.string().min(3).max(300),
      body: z.string().min(3),
      category: z.string().max(40).default('Guide'),
      emoji: z.string().max(8).default('📰'),
      imageUrl: z.string().url().nullable().optional(),
      published: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return id
        ? ctx.prisma.communityPost.update({ where: { id }, data })
        : ctx.prisma.communityPost.create({ data: data as typeof data & { title: string; excerpt: string; body: string } })
    }),

  remove: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.communityPost.delete({ where: { id: input.id } })),
})
