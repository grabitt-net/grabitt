import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

// Help Centre articles (Q + A), grouped by category. Public reads (active only);
// admin (exec) manages add/edit/remove/reorder from the executive suite.
export const helpRouter = router({
  // Public: active articles for the /help page and the AI assistant.
  articles: publicProcedure.query(({ ctx }) =>
    ctx.prisma.helpArticle.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, category: true, question: true, answer: true },
    })
  ),

  // Admin: every article for management.
  all: execProcedure.query(({ ctx }) =>
    ctx.prisma.helpArticle.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  ),

  upsert: execProcedure
    .input(z.object({
      id: z.string().optional(),
      category: z.string().min(1).max(60),
      question: z.string().min(2).max(300),
      answer: z.string().min(2).max(4000),
      sortOrder: z.number().int().default(0),
      active: z.boolean().default(true),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return id
        ? ctx.prisma.helpArticle.update({ where: { id }, data })
        : ctx.prisma.helpArticle.create({ data })
    }),

  remove: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.helpArticle.delete({ where: { id: input.id } })),

  // "Was this helpful?" — public deflection signal from the article view.
  rate: publicProcedure
    .input(z.object({ id: z.string(), helpful: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.helpArticle.update({
        where: { id: input.id },
        data: input.helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } },
        select: { id: true },
      })
    ),

  // ── Categories (the helpdesk sections) ──────────────────────────────────────
  // Public: active categories in order (drives the Help Centre grid).
  categories: publicProcedure.query(({ ctx }) =>
    ctx.prisma.helpCategory.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true, blurb: true, icon: true } })
  ),

  // Admin: every category for management (incl. article counts, added below).
  allCategories: execProcedure.query(({ ctx }) =>
    ctx.prisma.helpCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  ),

  upsertCategory: execProcedure
    .input(z.object({
      id: z.string().optional(),
      slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and hyphens only'),
      title: z.string().min(1).max(80),
      blurb: z.string().max(160).default(''),
      icon: z.string().max(8).default('📄'),
      sortOrder: z.number().int().default(0),
      active: z.boolean().default(true),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return id
        ? ctx.prisma.helpCategory.update({ where: { id }, data })
        : ctx.prisma.helpCategory.create({ data })
    }),

  removeCategory: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.helpCategory.delete({ where: { id: input.id } })),

  // ── Unanswered questions (gaps) ─────────────────────────────────────────────
  // Admin: questions the AI couldn't answer from the Help Centre, so an article
  // can be added. `open` hides ones already marked resolved.
  gaps: execProcedure
    .input(z.object({ status: z.enum(['open', 'resolved', 'all']).default('open') }).optional())
    .query(({ ctx, input }) => {
      const status = input?.status ?? 'open'
      return ctx.prisma.helpGap.findMany({
        where: status === 'all' ? {} : { resolved: status === 'resolved' },
        orderBy: [{ askedCount: 'desc' }, { lastAskedAt: 'desc' }],
        take: 300,
      })
    }),

  resolveGap: execProcedure
    .input(z.object({ id: z.string(), resolved: z.boolean() }))
    .mutation(({ ctx, input }) => ctx.prisma.helpGap.update({ where: { id: input.id }, data: { resolved: input.resolved }, select: { id: true } })),

  removeGap: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.helpGap.delete({ where: { id: input.id } })),
})
