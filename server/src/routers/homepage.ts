import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

// Homepage layout CMS — admins choose which sections show and in what order.
export const homepageRouter = router({
  // Public: the live layout the homepage renders from.
  layout: publicProcedure.query(({ ctx }) =>
    ctx.prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } })
  ),

  // Exec: full section list for the admin editor.
  sections: execProcedure.query(({ ctx }) =>
    ctx.prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } })
  ),

  // Exec: persist the reordered / toggled sections.
  save: execProcedure
    .input(z.object({
      sections: z.array(z.object({
        key: z.string(),
        enabled: z.boolean(),
        sortOrder: z.number().int(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.sections.map(s =>
          ctx.prisma.homeSection.update({
            where: { key: s.key },
            data: { enabled: s.enabled, sortOrder: s.sortOrder },
          })
        )
      )
      return { ok: true }
    }),
})
