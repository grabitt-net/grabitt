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
