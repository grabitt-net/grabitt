import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { businessTierForGrade, PROPERTY_PRICING } from '@grabitt/design-tokens'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

export const propertyRouter = router({
  // Agents/business accounts list a property. Creates the Listing + its
  // PropertyListing detail row (the /property search reads the latter).
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(4).max(120),
      description: z.string().max(4000).optional(),
      price: z.number().min(0),
      location: z.string().min(1).max(120),
      images: z.array(z.string().url()).max(8).optional(),
      type: z.enum(['sale', 'rent', 'holiday', 'commercial', 'land', 'new_build']),
      bedrooms: z.number().int().min(0).max(50).optional(),
      bathrooms: z.number().int().min(0).max(50).optional(),
      m2: z.number().min(0).max(1_000_000).optional(),
      community: z.string().max(120).optional(),
      floor: z.number().int().min(-5).max(200).optional(),
      hasPool: z.boolean().default(false),
      hasGarage: z.boolean().default(false),
      energyRating: z.string().max(4).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      // Rental terms + extended portal details.
      rentalTerm: z.enum(['short_term', 'long_term', 'holiday']).optional(),
      touristLicence: z.string().max(60).optional(),
      plotM2: z.number().min(0).max(10_000_000).optional(),
      terraceM2: z.number().int().min(0).max(100000).optional(),
      furnished: z.enum(['furnished', 'part_furnished', 'unfurnished']).optional(),
      orientation: z.string().max(30).optional(),
      yearBuilt: z.number().int().min(1500).max(2100).optional(),
      communityFees: z.number().int().min(0).max(100000).optional(),
      condition: z.enum(['new', 'good', 'needs_reform']).optional(),
      views: z.string().max(60).optional(),
      // Full agent-listing detail.
      reference: z.string().max(60).optional(),
      address: z.string().max(300).optional(),
      city: z.string().max(120).optional(),
      coveredM2: z.number().min(0).max(1_000_000).optional(),
      landM2: z.number().min(0).max(100_000_000).optional(),
      distShops: z.number().int().min(0).max(1_000_000).optional(),
      distSchools: z.number().int().min(0).max(1_000_000).optional(),
      distBeach: z.number().int().min(0).max(1_000_000).optional(),
      distTown: z.number().int().min(0).max(1_000_000).optional(),
      features: z.array(z.string().max(40)).max(40).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Anyone can advertise property (advertising only — no commission). The
      // free allowance depends on the account: private users get 1/month; a
      // Business account gets its tier allowance (plus any property-agent plan
      // top-up). Beyond the free allowance each listing is €39.
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, grade: true, propertyListingAllowance: true, email: true, stripeCustomerId: true } })

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      // Business allowance = tier cap (+ any agent-plan allowance); private = 1/mo.
      const freeAllowance = me.isBusiness
        ? businessTierForGrade(me.grade).caps.property + (me.propertyListingAllowance ?? 0)
        : PROPERTY_PRICING.privateFreePerMonth
      const usedThisMonth = await ctx.prisma.listing.count({
        where: { sellerId: ctx.user.id, department: 'property', createdAt: { gte: monthStart } },
      })
      const fee = usedThisMonth >= freeAllowance ? PROPERTY_PRICING.privateExtraListingCents : 0

      const created = await ctx.prisma.listing.create({
        data: {
          sellerId: ctx.user.id,
          title: input.title,
          description: input.description || input.title,
          price: input.price,
          department: 'property',
          condition: 'good',
          // Within allowance: live straight away. Over allowance: held as a draft
          // until the €39 fee is paid (webhook publishes it).
          status: fee > 0 ? 'draft' : 'active',
          images: input.images ?? [],
          location: input.location,
          ...(input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : {}),
          propertyListing: {
            create: {
              type: input.type,
              bedrooms: input.bedrooms,
              bathrooms: input.bathrooms,
              m2: input.m2,
              community: input.community,
              floor: input.floor,
              hasPool: input.hasPool,
              hasGarage: input.hasGarage,
              energyRating: input.energyRating,
              lat: input.lat,
              lng: input.lng,
              rentalTerm: input.rentalTerm,
              touristLicence: input.touristLicence,
              plotM2: input.plotM2,
              terraceM2: input.terraceM2,
              furnished: input.furnished,
              orientation: input.orientation,
              yearBuilt: input.yearBuilt,
              communityFees: input.communityFees,
              condition: input.condition,
              views: input.views,
              reference: input.reference,
              address: input.address,
              city: input.city,
              coveredM2: input.coveredM2,
              landM2: input.landM2,
              distShops: input.distShops,
              distSchools: input.distSchools,
              distBeach: input.distBeach,
              distTown: input.distTown,
              features: input.features ?? [],
            },
          },
        },
        include: { propertyListing: true },
      })

      if (fee === 0) return created

      // Over the free allowance — €39 to publish. Webhook flips draft→active.
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(me.stripeCustomerId ? { customer: me.stripeCustomerId } : { customer_email: me.email }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: fee, product_data: { name: `Grabitt property advert — ${input.title}` } } }],
        payment_intent_data: { metadata: { kind: 'listing_publish', listingId: created.id } },
        success_url: `${appUrl()}/listings/${created.id}?published=1`,
        cancel_url: `${appUrl()}/property/new?cancelled=1`,
      })
      return { ...created, pendingPayment: true, checkoutUrl: session.url }
    }),

  // €9 featured boost for one of my property adverts (4 weeks). Reuses the
  // listing_promo webhook path to set isFeatured / featuredUntil on payment.
  boost: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true, department: true, title: true } })
      if (!listing || listing.sellerId !== ctx.user.id || listing.department !== 'property') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'That is not your property advert.' })
      }
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true } })
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(me.stripeCustomerId ? { customer: me.stripeCustomerId } : { customer_email: me.email }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: PROPERTY_PRICING.privateFeaturedBoostCents, product_data: { name: `Grabitt property featured boost — ${listing.title} (4 weeks)` } } }],
        payment_intent_data: { metadata: { kind: 'listing_promo', userId: ctx.user.id, listingId: input.listingId, option: 'featured', weeks: '4' } },
        success_url: `${appUrl()}/listings/${input.listingId}?boosted=1`,
        cancel_url: `${appUrl()}/listings/${input.listingId}`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
    }),

  // Exec suite: every property listing on the platform, for admin monitoring.
  // Edit a property listing you own. Writes the parent Listing and the
  // PropertyListing detail together, mirroring create's mapping.
  update: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      title: z.string().min(4).max(120).optional(),
      description: z.string().max(4000).optional(),
      price: z.number().min(0).optional(),
      location: z.string().min(1).max(120).optional(),
      images: z.array(z.string().url()).max(8).optional(),
      type: z.enum(['sale', 'rent', 'holiday', 'commercial', 'land', 'new_build']).optional(),
      bedrooms: z.number().int().min(0).max(50).nullable().optional(),
      bathrooms: z.number().int().min(0).max(50).nullable().optional(),
      m2: z.number().min(0).max(1_000_000).nullable().optional(),
      community: z.string().max(120).nullable().optional(),
      floor: z.number().int().min(-5).max(200).nullable().optional(),
      hasPool: z.boolean().optional(),
      hasGarage: z.boolean().optional(),
      energyRating: z.string().max(4).nullable().optional(),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({
        where: { id: input.listingId },
        include: { propertyListing: true },
      })
      if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the agent can edit this property' })
      if (!listing.propertyListing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This listing is not a property' })

      await ctx.prisma.$transaction([
        ctx.prisma.listing.update({
          where: { id: listing.id },
          data: {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.description !== undefined ? { description: input.description || listing.title } : {}),
            ...(input.price !== undefined ? { price: input.price } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.images !== undefined ? { images: input.images } : {}),
          },
        }),
        ctx.prisma.propertyListing.update({
          where: { id: listing.propertyListing.id },
          data: {
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
            ...(input.bathrooms !== undefined ? { bathrooms: input.bathrooms } : {}),
            ...(input.m2 !== undefined ? { m2: input.m2 } : {}),
            ...(input.community !== undefined ? { community: input.community } : {}),
            ...(input.floor !== undefined ? { floor: input.floor } : {}),
            ...(input.hasPool !== undefined ? { hasPool: input.hasPool } : {}),
            ...(input.hasGarage !== undefined ? { hasGarage: input.hasGarage } : {}),
            ...(input.energyRating !== undefined ? { energyRating: input.energyRating } : {}),
            ...(input.lat !== undefined ? { lat: input.lat } : {}),
            ...(input.lng !== undefined ? { lng: input.lng } : {}),
          },
        }),
      ])
      return { ok: true, id: listing.id }
    }),

  adminList: execProcedure
    .input(z.object({ status: z.enum(['all', 'pending', 'active', 'sold', 'expired']).default('all') }).optional())
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? 'all'
      // "pending" is the draft state property listings sit in until an admin
      // approves them.
      const wantStatus = status === 'pending' ? 'draft' : status
      const rows = await ctx.prisma.propertyListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          listing: {
            select: {
              id: true, title: true, price: true, status: true, location: true, createdAt: true, viewCount: true,
              seller: { select: { id: true, displayName: true, email: true, isBusiness: true } },
            },
          },
        },
      })
      return rows
        .filter(r => status === 'all' || r.listing.status === wantStatus)
        .map(r => ({
          id: r.id,
          listingId: r.listingId,
          title: r.listing.title,
          price: Number(r.listing.price),
          status: r.listing.status,
          location: r.listing.location,
          createdAt: r.listing.createdAt,
          views: r.listing.viewCount,
          type: r.type,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          m2: r.m2 ? Number(r.m2) : null,
          hasPool: r.hasPool,
          hasGarage: r.hasGarage,
          agent: r.listing.seller.displayName,
          agentEmail: r.listing.seller.email,
          agentIsBusiness: r.listing.seller.isBusiness,
        }))
    }),

  // The signed-in agent's plan allowance and how much of it is in use (active +
  // pending listings). Drives the "list a property" gate and usage display.
  myAllowance: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { propertyListingAllowance: true, isBusiness: true } })
    const inUse = await ctx.prisma.listing.count({
      where: { sellerId: ctx.user.id, department: 'property', status: { in: ['active', 'draft'] } },
    })
    return { allowance: me.propertyListingAllowance, inUse, isBusiness: me.isBusiness, remaining: Math.max(0, me.propertyListingAllowance - inUse) }
  }),

  // Admin approval — a property goes live only once an admin approves it.
  approve: execProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.update({
        where: { id: input.listingId },
        // Start the 30-day live term from approval (go-live), not from when the
        // listing was first submitted for review.
        data: { status: 'active', createdAt: new Date(), bumpedAt: new Date() },
        select: { id: true, title: true, sellerId: true },
      })
      await ctx.prisma.notification.create({
        data: {
          userId: listing.sellerId, kind: 'system',
          title: '✅ Property approved',
          body: `"${listing.title}" has been approved and is now live on Grabitt.`,
          actionUrl: `/listings/${listing.id}`,
        },
      })
      return { ok: true }
    }),

  reject: execProcedure
    .input(z.object({ listingId: z.string().uuid(), reason: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.update({
        where: { id: input.listingId },
        data: { status: 'removed' },
        select: { id: true, title: true, sellerId: true },
      })
      await ctx.prisma.notification.create({
        data: {
          userId: listing.sellerId, kind: 'system',
          title: '⚠️ Property not approved',
          body: `"${listing.title}" was not approved${input.reason ? `: ${input.reason}` : ''}. Please review and re-list.`,
          actionUrl: `/listings/${listing.id}`,
        },
      })
      return { ok: true }
    }),

  list: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.enum(['sale', 'rent', 'holiday', 'commercial', 'land', 'new_build']).optional(),
      minBedrooms: z.number().optional(),
      minBathrooms: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      hasPool: z.boolean().optional(),
      hasGarage: z.boolean().optional(),
      location: z.string().optional(),
      locations: z.array(z.string()).optional(),   // multi-select areas
      features: z.array(z.string()).optional(),     // must have ALL of these
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.propertyListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.minBedrooms && { bedrooms: { gte: input.minBedrooms } }),
          ...(input.minBathrooms && { bathrooms: { gte: input.minBathrooms } }),
          ...(input.hasPool && { hasPool: true }),
          ...(input.hasGarage && { hasGarage: true }),
          ...(input.features?.length && { features: { hasEvery: input.features } }),
          listing: {
            status: 'active',
            ...((input.minPrice || input.maxPrice) && {
              price: {
                ...(input.minPrice && { gte: input.minPrice }),
                ...(input.maxPrice && { lte: input.maxPrice }),
              },
            }),
            ...(input.locations?.length
              ? { OR: input.locations.map(loc => ({ location: { contains: loc, mode: 'insensitive' as const } })) }
              : input.location ? { location: { contains: input.location, mode: 'insensitive' } } : {}),
            ...(input.query && { title: { contains: input.query, mode: 'insensitive' } }),
          },
        },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),
})
