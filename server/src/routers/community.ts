import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

// Community content — editorial posts (island tips, economy write-ups, guides)
// shown on the homepage. Public reads; admin (exec) manages.
export const communityRouter = router({
  // Public: published posts for a section (guide = Grabitt Guides, news = News).
  list: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(30).default(12), section: z.enum(['guide', 'news', 'economic', 'events']).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.communityPost.findMany({
        where: { published: true, ...(input?.section ? { section: input.section } : {}) },
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

  // Admin: everything (optionally one section), for management.
  all: execProcedure
    .input(z.object({ section: z.enum(['guide', 'news', 'economic', 'events']).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.communityPost.findMany({ where: input?.section ? { section: input.section } : {}, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })
    ),

  upsert: execProcedure
    .input(z.object({
      id: z.string().optional(),
      title: z.string().min(3).max(140),
      excerpt: z.string().min(3).max(300),
      body: z.string().min(3),
      category: z.string().max(40).default('Guide'),
      section: z.enum(['guide', 'news', 'economic', 'events']).default('guide'),
      emoji: z.string().max(8).default('📰'),
      imageUrl: z.string().url().nullable().optional(),
      published: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
      // Explicit tags typed by the editor (with or without a leading #). Merged
      // with any #hashtags found in the title/body.
      tags: z.array(z.string().max(40)).max(30).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, tags: explicit, ...data } = input
      // Tags are entered by the editor — normalise (strip #, lowercase, dedupe).
      const seen = new Set<string>()
      const tags = (explicit ?? [])
        .map(t => t.trim().replace(/^#/, '').toLowerCase())
        .filter(t => t && (seen.has(t) ? false : (seen.add(t), true)))
      return id
        ? ctx.prisma.communityPost.update({ where: { id }, data: { ...data, tags } })
        : ctx.prisma.communityPost.create({ data: { ...data, tags } as typeof data & { title: string; excerpt: string; body: string } })
    }),

  // Public: posts carrying a given hashtag (or whose body still mentions it) —
  // powers the unified #tag discovery page alongside item results.
  byTag: publicProcedure
    .input(z.object({ tag: z.string().min(1).max(40), limit: z.number().int().min(1).max(50).default(30) }))
    .query(({ ctx, input }) => {
      const tag = input.tag.toLowerCase().replace(/^#/, '')
      return ctx.prisma.communityPost.findMany({
        where: { published: true, OR: [{ tags: { has: tag } }, { body: { contains: `#${tag}`, mode: 'insensitive' } }] },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: input.limit,
      })
    }),

  remove: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.communityPost.delete({ where: { id: input.id } })),
})
