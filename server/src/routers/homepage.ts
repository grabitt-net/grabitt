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

  // ── Parallax hero slider ────────────────────────────────────────────────────
  // Public: active slides in order (what the homepage hero rotates through).
  heroSlides: publicProcedure.query(({ ctx }) =>
    ctx.prisma.heroSlide.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })
  ),

  // Exec: all slides for the editor.
  allHeroSlides: execProcedure.query(({ ctx }) =>
    ctx.prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } })
  ),

  upsertHeroSlide: execProcedure
    .input(z.object({
      id: z.string().optional(),
      // nullish so clearing the field on an edit actually blanks it (null),
      // not just omits it (which would keep the old value). Image-only slides.
      heading: z.string().max(120).nullish(),
      subheading: z.string().max(200).nullish(),
      imageUrl: z.string().url(),
      linkUrl: z.string().optional(),
      active: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return id
        ? ctx.prisma.heroSlide.update({ where: { id }, data })
        : ctx.prisma.heroSlide.create({ data })
    }),

  removeHeroSlide: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.heroSlide.delete({ where: { id: input.id } })),
})
