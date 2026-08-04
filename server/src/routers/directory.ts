import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import type { PrismaClient } from '@prisma/client'

// The set of advertiser userIds whose banner is currently paid & running. A
// directory entry is ONLY visible while its owner has such a booking.
async function activeAdvertiserIds(prisma: PrismaClient): Promise<Set<string>> {
  const now = new Date()
  const rows = await prisma.bannerBooking.findMany({
    where: { status: 'active', startsAt: { lte: now }, endsAt: { gte: now } },
    select: { userId: true },
  })
  return new Set(rows.map(r => r.userId))
}

const listingInput = z.object({
  name: z.string().min(2).max(80),
  category: z.string().max(60).optional(),
  description: z.string().max(600).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  location: z.string().max(80).optional(),
})

export const directoryRouter = router({
  // Public: the live directory — only advertisers with a running paid banner.
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const active = await activeAdvertiserIds(ctx.prisma)
      if (active.size === 0) return []
      const listings = await ctx.prisma.directoryListing.findMany({
        where: { userId: { in: [...active] }, ...(input?.category ? { category: input.category } : {}) },
        orderBy: { name: 'asc' },
      })
      return listings
    }),

  // Public: one listing — only while its advertiser's banner is running.
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.prisma.directoryListing.findUnique({ where: { id: input.id } })
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found.' })
      const active = await activeAdvertiserIds(ctx.prisma)
      if (!active.has(listing.userId)) throw new TRPCError({ code: 'NOT_FOUND', message: 'This listing is not currently live.' })
      return listing
    }),

  // Advertiser: my listing + whether it's currently live (banner running).
  mine: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isAdvertiser: true, isBusiness: true } })
    const listing = await ctx.prisma.directoryListing.findUnique({ where: { userId: ctx.user.id } })
    const active = await activeAdvertiserIds(ctx.prisma)
    return { isAdvertiser: me.isAdvertiser, isBusiness: me.isBusiness, listing, live: active.has(ctx.user.id) }
  }),

  // Turn the current account into an advertiser account (external advertiser —
  // no selling, no business account) and seed a draft directory listing. Sellers
  // and businesses can't become advertisers on the same account.
  becomeAdvertiser: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, displayName: true } })
      if (me.isBusiness) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Business accounts already advertise from their dashboard.' })
      await ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { isAdvertiser: true } })
      return ctx.prisma.directoryListing.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, name: input.name },
        update: {},
      })
    }),

  // Advertiser: create/update my directory entry.
  upsert: protectedProcedure
    .input(listingInput)
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isAdvertiser: true } })
      if (!me.isAdvertiser) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only advertiser accounts have a directory listing.' })
      const data = {
        name: input.name,
        category: input.category || null,
        description: input.description || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        logoUrl: input.logoUrl || null,
        location: input.location || null,
      }
      return ctx.prisma.directoryListing.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...data },
        update: data,
      })
    }),
})
