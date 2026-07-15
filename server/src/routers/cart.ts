import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const CART_TTL_HOURS = 12

// Server-side basket. Standard items are added here for multi-item checkout;
// Grab It Now items and accepted offers go straight to immediate payment and are
// never basketed. Items expire 12h after being added (warnings at 6h/10h), and
// are dropped as soon as the listing is no longer buyable (sold/removed).
export const cartRouter = router({
  addItem: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), qty: z.number().int().min(1).max(99).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } })
      if (listing.sellerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This is your own listing' })
      if (listing.status !== 'active') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This item is no longer available' })
      if (listing.department === 'jobs' || listing.department === 'property') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This listing type cannot be added to a basket' })
      if (listing.grabItNowUntil && listing.grabItNowUntil > new Date()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Grab It Now items are bought immediately' })
      if (input.qty > listing.stock) throw new TRPCError({ code: 'BAD_REQUEST', message: `Only ${listing.stock} in stock` })

      const expiresAt = new Date(Date.now() + CART_TTL_HOURS * 3600_000)
      return ctx.prisma.cartItem.upsert({
        where: { userId_listingId: { userId: ctx.user.id, listingId: input.listingId } },
        create: { userId: ctx.user.id, listingId: input.listingId, qty: input.qty, expiresAt },
        // Re-adding refreshes the 12h window and resets the warning flags.
        update: { qty: Math.min(listing.stock, input.qty), expiresAt, warn6SentAt: null, warn10SentAt: null },
      })
    }),

  // The user's basket, joined with live listing data. Items whose listing is no
  // longer active (bought by someone else, removed) are filtered out here and
  // hard-deleted so the basket self-heals.
  items: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.cartItem.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: { include: { seller: { select: { id: true, displayName: true } } } } },
    })
    const dead = rows.filter(r => r.listing.status !== 'active' || r.listing.stock < 1)
    if (dead.length) await ctx.prisma.cartItem.deleteMany({ where: { id: { in: dead.map(d => d.id) } } })
    return rows
      .filter(r => r.listing.status === 'active' && r.listing.stock >= 1)
      .map(r => ({
        id: r.id,
        listingId: r.listingId,
        qty: Math.min(r.qty, r.listing.stock),
        expiresAt: r.expiresAt,
        title: r.listing.title,
        price: Number(r.listing.price),
        image: Array.isArray(r.listing.images) ? r.listing.images[0] ?? null : null,
        location: r.listing.location,
        stock: r.listing.stock,
        deliveryFee: Number(r.listing.deliveryFee),
        deliveryMethod: r.listing.deliveryMethod,
        sellerId: r.listing.sellerId,
        sellerName: r.listing.seller.displayName,
      }))
  }),

  setItemQty: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), qty: z.number().int().min(1).max(99) }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: input.listingId }, select: { stock: true } })
      return ctx.prisma.cartItem.update({
        where: { userId_listingId: { userId: ctx.user.id, listingId: input.listingId } },
        data: { qty: Math.min(input.qty, listing.stock) },
      })
    }),

  removeItem: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.cartItem.deleteMany({ where: { userId: ctx.user.id, listingId: input.listingId } })
    ),

  clearAll: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.cartItem.deleteMany({ where: { userId: ctx.user.id } })
  ),

  count: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.cartItem.count({ where: { userId: ctx.user.id, listing: { status: 'active' } } })
  ),
})
