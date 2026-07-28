import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'

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
    }))
    .mutation(async ({ ctx, input }) => {
      // Only Business accounts (agents) may list property.
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, propertyListingAllowance: true } })
      if (!me.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business account is required to list property' })

      // A property-agent plan (monthly allowance) is required to list property.
      // Active + pending listings both count toward the allowance.
      if (me.propertyListingAllowance < 1) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'A property-agent plan is required to list property. Choose a plan to get started.' })
      }
      const inUse = await ctx.prisma.listing.count({
        where: { sellerId: ctx.user.id, department: 'property', status: { in: ['active', 'draft'] } },
      })
      if (inUse >= me.propertyListingAllowance) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `Your plan allows ${me.propertyListingAllowance} active listings. Remove one or upgrade your plan to list more.` })
      }

      return ctx.prisma.listing.create({
        data: {
          sellerId: ctx.user.id,
          title: input.title,
          description: input.description || input.title,
          price: input.price,
          department: 'property',
          condition: 'good',
          // Property listings are held for admin approval before going public.
          status: 'draft',
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
            },
          },
        },
        include: { propertyListing: true },
      })
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
        data: { status: 'active' },
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
          listing: {
            status: 'active',
            ...((input.minPrice || input.maxPrice) && {
              price: {
                ...(input.minPrice && { gte: input.minPrice }),
                ...(input.maxPrice && { lte: input.maxPrice }),
              },
            }),
            ...(input.location && { location: { contains: input.location, mode: 'insensitive' } }),
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
