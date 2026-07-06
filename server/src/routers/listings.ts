import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { CreateListingInputSchema, SearchInputSchema } from '@grabitt/types'
import { LISTING_CAPS, GRADE_THRESHOLDS, PRICES } from '@grabitt/design-tokens'

export const listingsRouter = router({
  search: publicProcedure
    .input(SearchInputSchema)
    .query(async ({ ctx, input }) => {
      const { query, department, minPrice, maxPrice, sort, page, limit } = input
      const skip = (page - 1) * limit

      const where: Record<string, unknown> = {
        status: 'active',
        ...(department && { department }),
        ...(query && { title: { contains: query, mode: 'insensitive' } }),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? { price: { ...(minPrice && { gte: minPrice }), ...(maxPrice && { lte: maxPrice }) } }
          : {}),
      }

      const [items, total] = await Promise.all([
        ctx.prisma.listing.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort === 'price_asc'
            ? { price: 'asc' }
            : sort === 'price_desc'
            ? { price: 'desc' }
            : { createdAt: 'desc' },
          include: { seller: { select: { id: true, displayName: true, avatar: true, grade: true, avgRating: true } } },
        }),
        ctx.prisma.listing.count({ where }),
      ])

      return { items, total, page, limit }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({
        where: { id: input.id },
        include: {
          seller: { select: { id: true, displayName: true, avatar: true, grade: true, avgRating: true, salesCount: true } },
          jobListing: true,
          propertyListing: true,
        },
      })
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.prisma.listing.update({ where: { id: input.id }, data: { viewCount: { increment: 1 } } })
      return listing
    }),

  // A seller's public storefront: their profile + active listings.
  bySeller: publicProcedure
    .input(z.object({ sellerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const seller = await ctx.prisma.user.findUnique({
        where: { id: input.sellerId },
        select: { id: true, displayName: true, avatar: true, grade: true, avgRating: true, salesCount: true, createdAt: true, isBusiness: true, businessVerified: true, businessName: true, businessBio: true, businessBanner: true },
      })
      if (!seller) throw new TRPCError({ code: 'NOT_FOUND' })
      const listings = await ctx.prisma.listing.findMany({
        where: { sellerId: input.sellerId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { id: true, title: true, price: true, images: true, location: true, department: true },
      })
      return { seller, listings }
    }),

  create: protectedProcedure
    .input(CreateListingInputSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })

      // Enforce monthly listing cap per grade
      const cap = LISTING_CAPS[user.grade as keyof typeof LISTING_CAPS]
      if (cap !== Infinity) {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        const count = await ctx.prisma.listing.count({
          where: { sellerId: user.id, createdAt: { gte: monthStart } },
        })
        if (count >= cap) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Your ${user.grade} grade allows ${cap} listings per month`,
          })
        }
      }

      // Check grade upgrade eligibility on every submit
      await checkGradeUpgrade(ctx.prisma, user)

      return ctx.prisma.listing.create({
        data: { ...input, sellerId: user.id, status: 'active' },
      })
    }),

  featured: publicProcedure
    .query(({ ctx }) =>
      ctx.prisma.listing.findMany({
        where: { status: 'active', isFeatured: true, featuredUntil: { gt: new Date() } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { seller: { select: { id: true, displayName: true, avatar: true, grade: true } } },
      })
    ),

  recent: publicProcedure
    .query(({ ctx }) =>
      ctx.prisma.listing.findMany({
        where: { status: 'active' },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { seller: { select: { id: true, displayName: true, avatar: true, grade: true } } },
      })
    ),

  // ── §3.1 extended procedures ─────────────────────────────────────────────

  getByDept: publicProcedure
    .input(z.object({
      department: z.string(),
      subcategory: z.string().optional(),
      sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { department, subcategory, sort, page, limit } = input
      const skip = (page - 1) * limit
      const where: Record<string, unknown> = {
        status: 'active',
        department,
        ...(subcategory && subcategory !== 'All' && { subcategory }),
      }
      const orderBy = sort === 'price_asc'
        ? { price: 'asc' as const }
        : sort === 'price_desc'
        ? { price: 'desc' as const }
        : { createdAt: 'desc' as const }

      const [items, total] = await Promise.all([
        ctx.prisma.listing.findMany({ where, skip, take: limit, orderBy, include: { seller: { select: { id: true, displayName: true, grade: true, avgRating: true } } } }),
        ctx.prisma.listing.count({ where }),
      ])
      return { items, total, page, limit }
    }),

  featureListing: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), weeks: z.number().int().min(1).max(4) }))
    .mutation(async ({ ctx, input }) => {
      const { listingId, weeks } = input
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: listingId } })
      if (listing.sellerId !== ctx.user.id)
        throw new TRPCError({ code: 'FORBIDDEN' })

      // Fee is always calculated server-side — never trust client-sent amounts (§10.2)
      const feeEur = PRICES.featuredPerWeek * weeks
      const featuredUntil = new Date()
      featuredUntil.setDate(featuredUntil.getDate() + weeks * 7)

      await ctx.prisma.listing.update({
        where: { id: listingId },
        data: { isFeatured: true, featuredUntil },
      })
      // 20 credits per euro (400 credits = €20)
      const creditCost = Math.round(feeEur * 20)
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { credits: { decrement: creditCost } },
      })
      await ctx.prisma.creditEvent.create({
        data: {
          userId: ctx.user.id,
          kind: 'featured_listing',
          delta: -creditCost,
          balance: updatedUser.credits,
          note: `Featured listing ×${weeks}wk`,
        },
      })
      return { featuredUntil, feeEur }
    }),

  createGrabit: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      windowHours: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(12), z.literal(24)]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { listingId, windowHours } = input
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: listingId } })
      if (listing.sellerId !== ctx.user.id)
        throw new TRPCError({ code: 'FORBIDDEN' })
      if (listing.grabItNowPrice === null)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Set a Grab It Now price first' })

      // Fee always server-side (§10.2)
      const feeEur = PRICES.grabItNow
      const expiresAt = new Date(Date.now() + windowHours * 60 * 60 * 1000)

      await ctx.prisma.listing.update({
        where: { id: listingId },
        data: { grabItNowUntil: expiresAt, grabItNowWindow: windowHours },
      })
      const creditCost = Math.round(feeEur * 20)
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { credits: { decrement: creditCost } },
      })
      await ctx.prisma.creditEvent.create({
        data: { userId: ctx.user.id, kind: 'grab_it_now', delta: -creditCost, balance: updatedUser.credits, note: `Grab It Now ${windowHours}h` },
      })
      return { expiresAt, feeEur }
    }),

  expireGrabit: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } })
      if (listing.sellerId !== ctx.user.id)
        throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.listing.update({
        where: { id: input.listingId },
        data: { grabItNowUntil: null, grabItNowWindow: null },
      })
    }),

  getGrabitActive: publicProcedure
    .query(({ ctx }) =>
      ctx.prisma.listing.findMany({
        where: { status: 'active', grabItNowUntil: { gt: new Date() } },
        orderBy: { grabItNowUntil: 'asc' },
        take: 20,
        include: { seller: { select: { id: true, displayName: true, grade: true } } },
      })
    ),
})

async function checkGradeUpgrade(prisma: typeof import('../db').prisma, user: { id: string; grade: string; salesCount: number; avgRating: number | null }) {
  const { salesCount, avgRating, grade } = user
  const rating = avgRating ?? 0

  let newGrade = grade
  if (grade === 'grabber' && salesCount >= GRADE_THRESHOLDS.dealer.sales && rating >= GRADE_THRESHOLDS.dealer.rating) {
    newGrade = 'dealer'
  } else if (grade === 'dealer' && salesCount >= GRADE_THRESHOLDS.trader.sales && rating >= GRADE_THRESHOLDS.trader.rating) {
    newGrade = 'trader'
  } else if (grade === 'trader' && salesCount >= GRADE_THRESHOLDS.pro.sales && rating >= GRADE_THRESHOLDS.pro.rating) {
    newGrade = 'pro'
  }

  if (newGrade !== grade) {
    await prisma.user.update({ where: { id: user.id }, data: { grade: newGrade as 'grabber' | 'dealer' | 'trader' | 'pro' } })
    await prisma.notification.create({
      data: {
        userId: user.id,
        kind: 'grade_upgrade',
        title: 'Grade upgraded!',
        body: `Congratulations! You are now a ${newGrade}.`,
      },
    })
  }
}
