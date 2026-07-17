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
    }))
    .mutation(async ({ ctx, input }) => {
      // Only Business accounts (agents) may list property.
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true } })
      if (!me.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business account is required to list property' })

      return ctx.prisma.listing.create({
        data: {
          sellerId: ctx.user.id,
          title: input.title,
          description: input.description || input.title,
          price: input.price,
          department: 'property',
          condition: 'good',
          status: 'active',
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
            },
          },
        },
        include: { propertyListing: true },
      })
    }),

  // Exec suite: every property listing on the platform, for admin monitoring.
  adminList: execProcedure
    .input(z.object({ status: z.enum(['all', 'active', 'sold', 'expired']).default('all') }).optional())
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? 'all'
      const rows = await ctx.prisma.propertyListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
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
        .filter(r => status === 'all' || r.listing.status === status)
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
