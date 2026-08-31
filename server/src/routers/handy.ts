import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { HANDY_PRICING } from '@grabitt/design-tokens'
import { applyPromo } from '../lib/discounts'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'
const VALIDITY_MS = HANDY_PRICING.validityDays * 86_400_000
const expiryOf = (createdAt: Date) => new Date(createdAt.getTime() + VALIDITY_MS)

export const handyRouter = router({
  // Legacy provider list (kept for the old panel until the classified UI lands).
  list: publicProcedure
    .input(z.object({
      category: z.enum(['plumbing','electrical','cleaning','painting','gardening','moving','assembly','it_support','tutoring','beauty','other']).optional(),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.handyListing.findMany({
        where: { ...(input.category && { category: input.category }), listing: { status: 'active' } },
        include: { listing: true, provider: { select: { id: true, displayName: true, avatar: true, avgRating: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),

  // The classified feed: live Handy Help posts. A post stays live until the
  // poster marks it done or the 7-day confirm/drop-off sweep expires it, so we
  // filter on status alone (a post in its confirmation grace window is still
  // live). Poster contact is NEVER included here — revealed only on accept.
  feed: publicProcedure
    .input(z.object({ page: z.number().default(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.listing.findMany({
        where: { department: 'handy_help', status: 'active' },
        orderBy: { bumpedAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
        select: { id: true, title: true, description: true, images: true, location: true, price: true, createdAt: true, handyKind: true },
      })
      return rows.map(l => ({
        id: l.id, title: l.title, description: l.description,
        image: Array.isArray(l.images) ? (l.images[0] ?? null) : null,
        location: l.location, price: Number(l.price),
        kind: l.handyKind ?? 'request',
        expiresAt: expiryOf(l.createdAt),
      }))
    }),

  // Respond to a Handy Help post. Business Lite / Directory accounts pay €2.99
  // to unlock and send a proposal (via Stripe → webhook creates the proposal);
  // personal accounts respond free. Poster contact stays hidden until they
  // accept. One proposal per responder per listing.
  respond: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), message: z.string().min(3).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({
        where: { id: input.listingId },
        select: { id: true, title: true, sellerId: true, department: true, status: true, createdAt: true },
      })
      if (!listing || listing.department !== 'handy_help') throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      if (listing.sellerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot respond to your own post' })
      // A post is open while it's active — expiry is now driven by the poster
      // marking it done, or the 7-day confirm/drop-off sweep flipping its status.
      if (listing.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This post is no longer live.' })
      }
      const existing = await ctx.prisma.handyProposal.findUnique({
        where: { listingId_responderId: { listingId: listing.id, responderId: ctx.user.id } },
        select: { id: true },
      })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: "You've already responded to this post." })

      const me = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { isBusiness: true, businessLight: true, email: true, stripeCustomerId: true },
      })
      const mustPay = me.isBusiness || me.businessLight

      // Free (personal) — create the proposal now and notify the poster.
      if (!mustPay) {
        const proposal = await ctx.prisma.handyProposal.create({
          data: { listingId: listing.id, responderId: ctx.user.id, message: input.message.trim() },
        })
        await ctx.prisma.notification.create({
          data: { userId: listing.sellerId, kind: 'system', title: '🔧 New response to your Handy Help post', body: `Someone responded to "${listing.title}". Review it and accept to share your contact.`, actionUrl: '/account?section=activity' },
        })
        return { paid: false, proposalId: proposal.id }
      }

      // Business — €2.99 to unlock. The proposal is created by the webhook on
      // successful payment (kind: handy_unlock).
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(me.stripeCustomerId ? { customer: me.stripeCustomerId } : { customer_email: me.email ?? undefined }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: HANDY_PRICING.businessUnlockCents, product_data: { name: `Grabitt Handy Help — respond to "${listing.title}"` } } }],
        payment_intent_data: { metadata: { kind: 'handy_unlock', listingId: listing.id, responderId: ctx.user.id, message: input.message.trim().slice(0, 480) } },
        success_url: `${appUrl()}/handy?responded=1`,
        cancel_url: `${appUrl()}/handy?cancelled=1`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { paid: true, checkoutUrl: session.url }
    }),

  // Proposals on my own Handy Help post — I (the poster) review them and accept
  // one. Responder name/rating shown so I can choose; contact swaps on accept.
  proposalsForListing: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true } })
      if (!listing || listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      const proposals = await ctx.prisma.handyProposal.findMany({
        where: { listingId: input.listingId },
        orderBy: { createdAt: 'desc' },
        include: { responder: { select: { id: true, displayName: true, avatar: true, avgRating: true, email: true, phone: true } } },
      })
      return proposals.map(p => ({
        id: p.id, message: p.message, status: p.status, createdAt: p.createdAt,
        responder: { id: p.responder.id, displayName: p.responder.displayName, avatar: p.responder.avatar, rating: p.responder.avgRating,
          // Contact revealed to the poster only once accepted.
          ...(p.status === 'accepted' ? { email: p.responder.email, phone: p.responder.phone } : {}) },
      }))
    }),

  // Accept a proposal on my post — reveals contact both ways.
  acceptProposal: protectedProcedure
    .input(z.object({ proposalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.prisma.handyProposal.findUnique({
        where: { id: input.proposalId },
        include: { listing: { select: { id: true, title: true, sellerId: true } } },
      })
      if (!proposal || proposal.listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (proposal.status === 'accepted') return { ok: true }

      const poster = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { displayName: true, email: true, phone: true } })
      await ctx.prisma.handyProposal.update({ where: { id: proposal.id }, data: { status: 'accepted' } })
      // Reveal contact both ways via notifications.
      const contact = [poster.phone, poster.email].filter(Boolean).join(' · ')
      await ctx.prisma.notification.create({
        data: { userId: proposal.responderId, kind: 'system', title: '✅ Your Handy Help proposal was accepted', body: `${poster.displayName} accepted your proposal for "${proposal.listing.title}". Get in touch: ${contact}`, actionUrl: '/account?section=activity' },
      })
      return { ok: true }
    }),

  // All proposals across the Handy Help posts I placed — for my inbox, where I
  // review and accept. Responder contact is included only once accepted.
  receivedProposals: protectedProcedure.query(async ({ ctx }) => {
    const proposals = await ctx.prisma.handyProposal.findMany({
      where: { listing: { sellerId: ctx.user.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true } },
        responder: { select: { id: true, displayName: true, avatar: true, avgRating: true, email: true, phone: true } },
      },
    })
    return proposals.map(p => ({
      id: p.id, status: p.status, message: p.message, createdAt: p.createdAt,
      listing: { id: p.listing.id, title: p.listing.title },
      responder: { id: p.responder.id, displayName: p.responder.displayName, avatar: p.responder.avatar, rating: p.responder.avgRating,
        ...(p.status === 'accepted' ? { email: p.responder.email, phone: p.responder.phone } : {}) },
    }))
  }),

  // Place a Handy Help post. Two shapes:
  //  • 'request' — a person describes a service they NEED (free).
  //  • 'offer'   — a business advertises a service they PROVIDE (€9.99).
  // The €9.99 is charged only for a business "offer"; the draft is published by
  // the Stripe webhook (kind: listing_publish). Everything else goes live now.
  createPost: protectedProcedure
    .input(z.object({
      kind: z.enum(['request', 'offer']),
      title: z.string().min(4).max(100),
      description: z.string().min(1).max(2000),
      location: z.string().max(100).optional(),
      price: z.number().min(0).optional(),
      images: z.array(z.string().url()).max(8).optional(),
      discountCode: z.string().max(40).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { isBusiness: true, businessLight: true, isPropertyAgent: true, email: true, stripeCustomerId: true },
      })
      if (me.isPropertyAgent) throw new TRPCError({ code: 'FORBIDDEN', message: 'Property agent accounts can only list property.' })
      const business = me.isBusiness || me.businessLight
      // Only a business "offer" advert is charged; personal requests are free.
      const paid = business && input.kind === 'offer'

      const listing = await ctx.prisma.listing.create({
        data: {
          sellerId: ctx.user.id,
          title: input.title.trim(),
          description: input.description.trim(),
          price: input.price ?? 0,
          department: 'handy_help',
          condition: 'new',
          location: (input.location ?? '').trim() || 'Canary Islands',
          images: input.images ?? [],
          handyKind: input.kind,
          status: paid ? 'draft' : 'active',
        },
        select: { id: true },
      })

      if (paid) {
        const promo = await applyPromo(ctx.prisma, input.discountCode, ctx.user.id, 'handy_place', HANDY_PRICING.businessPlaceCents)
        const fee = HANDY_PRICING.businessPlaceCents - promo.discountCents
        const session = await getStripe().checkout.sessions.create({
          mode: 'payment',
          ...(me.stripeCustomerId ? { customer: me.stripeCustomerId } : { customer_email: me.email ?? undefined }),
          line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: fee, product_data: { name: `Grabitt Handy Help advert — ${input.title.trim()}` } } }],
          payment_intent_data: { metadata: { kind: 'listing_publish', listingId: listing.id, ...promo.meta } },
          success_url: `${appUrl()}/handy?placed=1`,
          cancel_url: `${appUrl()}/handy?cancelled=1`,
        })
        if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
        return { paid: true as const, checkoutUrl: session.url }
      }
      return { paid: false as const, id: listing.id }
    }),

  // Proposals I've sent (as a responder).
  myProposals: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.handyProposal.findMany({
      where: { responderId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: { select: { id: true, title: true, images: true } } },
    })
  ),

  // The Handy Help posts I placed, for managing them: mark as sorted, or answer
  // the 7-day "do you still need help?" prompt. `awaitingConfirm` is true once
  // the sweep has asked and is waiting for my yes/no.
  myPosts: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.listing.findMany({
      where: { department: 'handy_help', sellerId: ctx.user.id, status: { in: ['active', 'expired'] } },
      orderBy: { bumpedAt: 'desc' },
      select: { id: true, title: true, images: true, status: true, createdAt: true, handyAskedAt: true },
    })
    return rows.map(l => ({
      id: l.id, title: l.title,
      image: Array.isArray(l.images) ? (l.images[0] ?? null) : null,
      status: l.status,
      createdAt: l.createdAt,
      expiresAt: expiryOf(l.createdAt),
      awaitingConfirm: l.status === 'active' && !!l.handyAskedAt,
    }))
  }),

  // Poster marks that they've now received the help they needed — the post
  // closes and drops out of the feed.
  markResolved: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true, department: true } })
      if (!listing || listing.sellerId !== ctx.user.id || listing.department !== 'handy_help') throw new TRPCError({ code: 'FORBIDDEN' })
      await ctx.prisma.listing.update({ where: { id: input.listingId }, data: { status: 'removed', handyAskedAt: null } })
      return { ok: true }
    }),

  // Poster answers the 7-day prompt. "Yes, still need help" relists for another
  // 7 days and the cycle continues; "no" closes the post.
  confirmStillNeeded: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), stillNeeded: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true, department: true, status: true } })
      if (!listing || listing.sellerId !== ctx.user.id || listing.department !== 'handy_help') throw new TRPCError({ code: 'FORBIDDEN' })
      if (listing.status !== 'active') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This post is no longer live.' })
      if (input.stillNeeded) {
        // Relist: reset the 7-day clock, clear the prompt, bump to the top.
        await ctx.prisma.listing.update({
          where: { id: input.listingId },
          data: { createdAt: new Date(), bumpedAt: new Date(), handyAskedAt: null },
        })
        return { ok: true, relisted: true }
      }
      await ctx.prisma.listing.update({ where: { id: input.listingId }, data: { status: 'removed', handyAskedAt: null } })
      return { ok: true, relisted: false }
    }),
})
