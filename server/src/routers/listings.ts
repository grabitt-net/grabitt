import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { CreateListingInputSchema, SearchInputSchema } from '@grabitt/types'
import { LISTING_CAPS, GRADE_THRESHOLDS, PRICES } from '@grabitt/design-tokens'
import { getStripe } from '../lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// Credit both the referred user and their referrer, once, and mark it done so it
// can never fire twice. Each side gets a CreditEvent with the running balance.
async function awardReferral(
  prisma: { user: any; creditEvent: any; notification: any; $transaction: any },
  referredId: string,
  referrerId: string,
) {
  const bonus = PRICES.referralBonus
  const [referred, referrer] = await Promise.all([
    prisma.user.findUnique({ where: { id: referredId }, select: { credits: true, displayName: true } }),
    prisma.user.findUnique({ where: { id: referrerId }, select: { credits: true } }),
  ])
  if (!referred || !referrer) return

  await prisma.$transaction([
    prisma.user.update({ where: { id: referredId }, data: { credits: { increment: bonus }, referralRewarded: true } }),
    prisma.user.update({ where: { id: referrerId }, data: { credits: { increment: bonus } } }),
    prisma.creditEvent.create({ data: { userId: referredId, kind: 'referral', delta: bonus, balance: referred.credits + bonus, note: 'Referral welcome — first listing' } }),
    prisma.creditEvent.create({ data: { userId: referrerId, kind: 'referral', delta: bonus, balance: referrer.credits + bonus, note: `Referral reward — ${referred.displayName} listed their first item` } }),
    prisma.notification.create({ data: { userId: referrerId, kind: 'credits_received', title: '🎁 Referral reward!', body: `${referred.displayName} just listed their first item — you both earned ${bonus} credits.` } }),
  ])
}

// Lightweight auto-tagging: derive up to 8 keyword tags from a listing's title +
// description. Strips punctuation, drops stop-words and short tokens, dedupes.
const STOP_WORDS = new Set(['the','and','for','with','this','that','your','you','are','has','have','from','was','will','can','all','new','used','one','two','our','out','get','not','but','they','use','very','good','great','perfect','condition','sale','selling','includes','included','comes','like'])
export function autoTags(title: string, description: string): string[] {
  const words = `${title} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
  const seen = new Set<string>()
  const tags: string[] = []
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); tags.push(w) }
    if (tags.length >= 8) break
  }
  return tags
}

// Notify buyers whose active WishItem ("I'm looking for X") is satisfied by a new
// listing. A wish matches when department + max-price fit and at least one of its
// keywords (or its title words, if it has none) appears in the listing text.
async function notifyWishMatches(
  prisma: { wishItem: any; notification: any },
  listing: { id: string; title: string; description: string; department: string; price: any; sellerId: string; tags: string[] },
  // When set (the item's previous, higher price), only alert wishes that have
  // just become affordable — i.e. their budget sits between new and old price.
  // This is used on price drops so we don't re-alert wishes already in range.
  newlyAffordableBelow?: number,
) {
  const wishes = await prisma.wishItem.findMany({
    where: {
      active: true,
      userId: { not: listing.sellerId },
      OR: [{ department: null }, { department: listing.department }],
    },
  })
  if (!wishes.length) return

  const haystack = `${listing.title} ${listing.description} ${listing.tags.join(' ')}`.toLowerCase()
  const price = Number(listing.price)
  const matched = wishes.filter((w: any) => {
    if (w.maxPrice != null && price > Number(w.maxPrice)) return false
    if (newlyAffordableBelow !== undefined) {
      // Only wishes with a budget the OLD price exceeded (now newly in reach).
      if (w.maxPrice == null || Number(w.maxPrice) >= newlyAffordableBelow) return false
    }
    const terms: string[] = (w.keywords?.length ? w.keywords : String(w.title).split(/\s+/))
      .map((t: string) => t.toLowerCase().trim())
      .filter((t: string) => t.length >= 3)
    if (!terms.length) return true
    return terms.some(t => haystack.includes(t))
  })
  if (!matched.length) return

  await prisma.notification.createMany({
    data: matched.map((w: any) => ({
      userId: w.userId,
      kind: 'wish_matched' as const,
      title: '✨ We found something you\'re after',
      body: `A new listing "${listing.title}" (€${price.toLocaleString()}) matches your wish "${w.title}".`,
      actionUrl: `/listings/${listing.id}`,
    })),
  })
  await prisma.wishItem.updateMany({
    where: { id: { in: matched.map((w: any) => w.id) } },
    data: { lastMatchAt: new Date() },
  })
}

export const listingsRouter = router({
  search: publicProcedure
    .input(SearchInputSchema)
    .query(async ({ ctx, input }) => {
      const { query, department, minPrice, maxPrice, sort, page, limit } = input
      const skip = (page - 1) * limit

      const where: Record<string, unknown> = {
        status: 'active',
        ...(department && { department }),
        ...(query && { OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ] }),
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

  // "Recommended for you" — active listings in the departments the user marked
  // as interests (falls back to newest active listings when no interests set).
  recommended: protectedProcedure.query(async ({ ctx }) => {
    const INTEREST_TO_DEPT: Record<string, string> = {
      'Electronics': 'electronics', 'Fashion': 'fashion', 'Home & Garden': 'home_garden',
      'Sport': 'sport', 'Gaming': 'gaming', 'Motors': 'motors', 'Kids & Baby': 'kids_baby',
      'Property': 'property', 'Pet Shop': 'pet_shop', 'Retro & Vintage': 'retro_vintage',
      'Gift Ideas': 'gift_ideas', 'Health & Fitness': 'health_fitness', 'Food Store': 'food_store',
      'Handy Help': 'handy_help', 'Collectables': 'collectables', 'Jobs': 'jobs',
    }
    const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { interests: true } })
    const depts = (user?.interests ?? []).map(l => INTEREST_TO_DEPT[l]).filter(Boolean)
    return ctx.prisma.listing.findMany({
      where: {
        status: 'active',
        sellerId: { not: ctx.user.id },
        ...(depts.length ? { department: { in: depts as never } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { seller: { select: { id: true, displayName: true, avatar: true, grade: true } } },
    })
  }),

  // The current user's own listings across all statuses (for the account hub —
  // segmented into Active / Sold / Drafts client-side).
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.listing.findMany({
      where: { sellerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, price: true, images: true, location: true,
        department: true, status: true, isFeatured: true, createdAt: true,
      },
    })
  ),

  // Paid promotion for a listing (Grab It Now flash deal or Featured/Sponsored).
  // Returns a Stripe Checkout URL; the option is applied by the webhook once the
  // payment succeeds (§10.2 — money handled server-side).
  promote: protectedProcedure
    .input(z.object({
      listingId: z.string().min(1),
      option: z.enum(['grab_it_now', 'featured']),
      weeks: z.number().int().min(1).max(8).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({
        where: { id: input.listingId }, select: { sellerId: true, title: true },
      })
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND' })
      if (listing.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only promote your own listing' })
      }
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id }, select: { stripeCustomerId: true },
      })
      const amountCents = input.option === 'grab_it_now'
        ? Math.round(PRICES.grabItNow * 100)
        : Math.round(PRICES.featuredPerWeek * input.weeks * 100)
      const label = input.option === 'grab_it_now'
        ? 'Grab It Now — 24-hour flash deal'
        : `Featured listing — ${input.weeks} week${input.weeks > 1 ? 's' : ''}`

      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(user?.stripeCustomerId ? { customer: user.stripeCustomerId } : {}),
        line_items: [{
          quantity: 1,
          price_data: { currency: 'eur', unit_amount: amountCents, product_data: { name: `Grabitt — ${label}` } },
        }],
        payment_intent_data: {
          metadata: {
            kind: 'listing_promo', userId: ctx.user.id, listingId: input.listingId,
            option: input.option, weeks: String(input.weeks),
          },
        },
        success_url: `${APP_URL}/listings/${input.listingId}?promo=success`,
        cancel_url: `${APP_URL}/listings/${input.listingId}?promo=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({
        where: { id: input.id },
        include: {
          seller: { select: { id: true, displayName: true, avatar: true, grade: true, avgRating: true, salesCount: true } },
          jobListing: true,
          propertyListing: true,
          _count: { select: { wishlistItems: true } }, // real "watching" count for the In-Demand box
        },
      })
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.prisma.listing.update({ where: { id: input.id }, data: { viewCount: { increment: 1 } } })
      // Real "wanted" count for the In-Demand box: active wishes whose category
      // and budget this listing satisfies (people actively looking for it).
      const wantedCount = await ctx.prisma.wishItem.count({
        where: {
          active: true,
          AND: [
            { OR: [{ department: null }, { department: listing.department }] },
            { OR: [{ maxPrice: null }, { maxPrice: { gte: listing.price } }] },
          ],
        },
      })
      return { ...listing, wantedCount }
    }),

  // Sold-price comparables: recent completed sales for similar items, so a buyer
  // can gauge whether a listing is fairly priced. Matches on department; items
  // that share a tag with this listing are surfaced first as closer comps.
  comparables: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({
        where: { id: input.id },
        select: { department: true, tags: true },
      })
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND' })

      const SOLD = ['confirmed_handover', 'completed', 'released'] as const
      const txns = await ctx.prisma.transaction.findMany({
        where: { status: { in: SOLD as unknown as never }, listing: { department: listing.department } },
        orderBy: { updatedAt: 'desc' },
        take: 60,
        select: { amount: true, updatedAt: true, listing: { select: { id: true, title: true, tags: true } } },
      })
      if (txns.length === 0) return { count: 0, avg: null, min: null, max: null, recent: [] as { id: string; title: string; amount: number; soldAt: Date; matchedTags: number }[] }

      const tagSet = new Set(listing.tags ?? [])
      const rows = txns.map(t => ({
        id: t.listing.id,
        title: t.listing.title,
        amount: Number(t.amount),
        soldAt: t.updatedAt,
        matchedTags: (t.listing.tags ?? []).filter(tg => tagSet.has(tg)).length,
      }))
      const amounts = rows.map(r => r.amount)
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
      // Closest comps first: more shared tags, then most recent.
      const recent = [...rows]
        .sort((a, b) => b.matchedTags - a.matchedTags || b.soldAt.getTime() - a.soldAt.getTime())
        .slice(0, 5)
      return {
        count: rows.length,
        avg: Math.round(avg * 100) / 100,
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        recent,
      }
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

      const listing = await ctx.prisma.listing.create({
        data: { ...input, tags: autoTags(input.title, input.description), sellerId: user.id, status: 'active' },
      })

      // Wish matching: alert buyers whose active "I'm looking for X" wish this
      // new listing satisfies. Fires a wish_matched notification (Grabitt Alerts).
      await notifyWishMatches(ctx.prisma, listing)

      // Referral reward: the promise is "when they list their first item, you both
      // earn 50 credits". Fire once, on this user's very first listing.
      if (user.referredById && !user.referralRewarded) {
        const totalListings = await ctx.prisma.listing.count({ where: { sellerId: user.id } })
        if (totalListings === 1) {
          await awardReferral(ctx.prisma, user.id, user.referredById)
        }
      }

      return listing
    }),

  // Change a listing's price (owner only). A price DROP notifies everyone who has
  // the item in their favourites/wishlist — these land in the Grabitt Alerts feed.
  updatePrice: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), price: z.number().min(0).max(9_999_999) }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } })
      if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the seller can change the price' })

      const oldPrice = Number(listing.price)
      const newPrice = Math.round(input.price * 100) / 100
      const updated = await ctx.prisma.listing.update({ where: { id: listing.id }, data: { price: newPrice } })

      if (newPrice < oldPrice) {
        const watchers = await ctx.prisma.wishlistItem.findMany({ where: { listingId: listing.id }, select: { userId: true } })
        const pct = oldPrice > 0 ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0
        await ctx.prisma.notification.createMany({
          data: watchers.map(w => ({
            userId: w.userId,
            kind: 'price_drop' as const,
            title: '📉 Price drop on a saved item',
            body: `"${listing.title}" dropped from €${oldPrice.toLocaleString()} to €${newPrice.toLocaleString()}${pct > 0 ? ` (−${pct}%)` : ''}.`,
            actionUrl: `/listings/${listing.id}`,
          })),
        })
        // Also alert buyers whose "looking for X" wish just became affordable —
        // the item now sits within a budget the old price exceeded.
        await notifyWishMatches(ctx.prisma, updated as any, oldPrice)
      }
      return { ok: true, price: newPrice, dropped: newPrice < oldPrice }
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
