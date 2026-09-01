import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

// Community content — editorial posts (island tips, economy write-ups, guides)
// shown on the homepage. Public reads; admin (exec) manages.
export const communityRouter = router({
  // Public: published posts for a section (guide = Grabitt Guides, news = News).
  list: publicProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(12),
      section: z.enum(['guide', 'news', 'economic', 'events']).optional(),
      // Event-date range filter (ISO). Used by the Events tab's date selector;
      // only applied to the events section.
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).optional())
    .query(({ ctx, input }) => {
      const isEvents = input?.section === 'events'
      // An event OVERLAPS the selected window if it starts on/before the window
      // end AND finishes on/after the window start. Single-day events (no end)
      // are treated as ending on their start date.
      const overlap: any[] = []
      if (isEvents && input?.to) overlap.push({ eventDate: { lte: new Date(input.to) } })
      if (isEvents && input?.from) {
        const from = new Date(input.from)
        overlap.push({ OR: [{ eventEndDate: { gte: from } }, { AND: [{ eventEndDate: null }, { eventDate: { gte: from } }] }] })
      }
      const dateFilter = overlap.length ? { AND: overlap } : {}
      return ctx.prisma.communityPost.findMany({
        where: { published: true, ...(input?.section ? { section: input.section } : {}), ...dateFilter },
        // Events sort by when they happen (soonest first); everything else by the
        // editor's order then newest.
        orderBy: isEvents ? [{ eventDate: 'asc' }, { createdAt: 'desc' }] : [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: input?.limit ?? 12,
      })
    }),

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
      // Event dates (events section). ISO strings or null. eventDate = start,
      // eventEndDate = end (multi-day). eventUrl = optional link.
      eventDate: z.string().datetime().nullable().optional(),
      eventEndDate: z.string().datetime().nullable().optional(),
      eventUrl: z.string().url().max(500).nullable().optional().or(z.literal('')),
      // Explicit tags typed by the editor (with or without a leading #). Merged
      // with any #hashtags found in the title/body.
      tags: z.array(z.string().max(40)).max(30).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, tags: explicit, eventDate, eventEndDate, eventUrl, ...data } = input
      // Tags are entered by the editor — normalise (strip #, lowercase, dedupe).
      const seen = new Set<string>()
      const tags = (explicit ?? [])
        .map(t => t.trim().replace(/^#/, '').toLowerCase())
        .filter(t => t && (seen.has(t) ? false : (seen.add(t), true)))
      const ev: { eventDate?: Date | null; eventEndDate?: Date | null; eventUrl?: string | null } = {}
      if (eventDate !== undefined) ev.eventDate = eventDate ? new Date(eventDate) : null
      if (eventEndDate !== undefined) ev.eventEndDate = eventEndDate ? new Date(eventEndDate) : null
      if (eventUrl !== undefined) ev.eventUrl = eventUrl ? String(eventUrl) : null
      return id
        ? ctx.prisma.communityPost.update({ where: { id }, data: { ...data, ...ev, tags } })
        : ctx.prisma.communityPost.create({ data: { ...data, ...ev, tags } as typeof data & { title: string; excerpt: string; body: string; eventDate?: Date | null; eventEndDate?: Date | null; eventUrl?: string | null } })
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
