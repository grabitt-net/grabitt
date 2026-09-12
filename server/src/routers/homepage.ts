import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'

// Homepage layout CMS — admins choose which sections show and in what order.
export const homepageRouter = router({
  // Public: the live layout the homepage renders from.
  layout: publicProcedure.query(({ ctx }) =>
    ctx.prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } })
  ),

  // ── Editable page copy (whole-page rich text, CRM-managed) ──────────────────
  // Public: the admin-set HTML body for a page, or null to use the built copy.
  pageContent: publicProcedure
    .input(z.object({ pageKey: z.string().max(60) }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.prisma.pageContent.findUnique({ where: { pageKey: input.pageKey }, select: { html: true } })
      return row ?? null
    }),

  // Exec: every stored page body, for the admin editor.
  allPageContent: execProcedure.query(({ ctx }) =>
    ctx.prisma.pageContent.findMany({ select: { pageKey: true, html: true, updatedAt: true } })
  ),

  // Exec: save (or clear) a page's body. Empty html removes the override so the
  // page falls back to its built-in copy.
  upsertPageContent: execProcedure
    .input(z.object({ pageKey: z.string().min(1).max(60), html: z.string().max(200000) }))
    .mutation(async ({ ctx, input }) => {
      const html = input.html.trim()
      if (!html) { await ctx.prisma.pageContent.deleteMany({ where: { pageKey: input.pageKey } }); return { ok: true, cleared: true } }
      await ctx.prisma.pageContent.upsert({ where: { pageKey: input.pageKey }, update: { html }, create: { pageKey: input.pageKey, html } })
      return { ok: true }
    }),

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

  // ── Homepage category tiles ─────────────────────────────────────────────────
  // Public: enabled tiles in admin order (the homepage grid renders from this).
  categories: publicProcedure.query(({ ctx }) =>
    ctx.prisma.homeCategory.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' }, select: { name: true, img: true, department: true } })
  ),

  // Public: admin-added subcategories (merged with the built-in defaults on the
  // client). Returned as { department, name } rows.
  subcategories: publicProcedure.query(({ ctx }) =>
    ctx.prisma.subcategory.findMany({ orderBy: [{ department: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, department: true, name: true } })
  ),

  // Public: header artwork for one category page (by department slug).
  categoryHeader: publicProcedure
    .input(z.object({ department: z.string() }))
    .query(async ({ ctx, input }) => {
      const c = await ctx.prisma.homeCategory.findFirst({ where: { department: input.department }, select: { name: true, img: true, bgImage: true, heroBanner: true } })
      return c ?? null
    }),

  // Exec: the full tile list for the admin editor.
  allCategories: execProcedure.query(({ ctx }) =>
    ctx.prisma.homeCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  ),

  // Exec: create or amend a category (name, department, icon, background, on/off).
  upsertCategory: execProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(2).max(60),
      department: z.string().max(40),
      img: z.string().max(500).nullable().optional(),
      bgImage: z.string().max(500).nullable().optional(),
      heroBanner: z.string().max(500).nullable().optional(),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      if (id) { await ctx.prisma.homeCategory.update({ where: { id }, data }); return { ok: true } }
      const max = await ctx.prisma.homeCategory.aggregate({ _max: { sortOrder: true } })
      await ctx.prisma.homeCategory.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } })
      return { ok: true }
    }),

  // Exec: delete a category. Any listings in it are moved to `moveTo` first so no
  // ads are orphaned.
  deleteCategory: execProcedure
    .input(z.object({ id: z.string(), moveTo: z.string().max(40) }))
    .mutation(async ({ ctx, input }) => {
      const cat = await ctx.prisma.homeCategory.findUniqueOrThrow({ where: { id: input.id }, select: { department: true } })
      if (cat.department && cat.department !== input.moveTo) {
        await ctx.prisma.listing.updateMany({ where: { department: cat.department as never }, data: { department: input.moveTo as never } })
      }
      await ctx.prisma.homeCategory.delete({ where: { id: input.id } })
      return { ok: true }
    }),

  // Exec: add a subcategory to a department (on top of the built-in defaults).
  addSubcategory: execProcedure
    .input(z.object({ department: z.string().max(40), name: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const name = input.name.trim()
      if (!name) return { ok: false as const }
      const max = await ctx.prisma.subcategory.aggregate({ where: { department: input.department }, _max: { sortOrder: true } })
      await ctx.prisma.subcategory.upsert({
        where: { department_name: { department: input.department, name } },
        create: { department: input.department, name, sortOrder: (max._max.sortOrder ?? 0) + 1 },
        update: {},
      })
      return { ok: true as const }
    }),

  // Exec: remove an admin-added subcategory (defaults can't be removed here).
  deleteSubcategory: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.subcategory.delete({ where: { id: input.id } }).catch(() => {})
      return { ok: true as const }
    }),

  // Exec: persist the reordered / toggled tiles.
  saveCategories: execProcedure
    .input(z.object({
      categories: z.array(z.object({
        name: z.string(),
        enabled: z.boolean(),
        sortOrder: z.number().int(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.categories.map(c =>
          ctx.prisma.homeCategory.update({
            where: { name: c.name },
            data: { enabled: c.enabled, sortOrder: c.sortOrder },
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
