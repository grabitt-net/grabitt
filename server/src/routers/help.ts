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
})
