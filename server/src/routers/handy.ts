import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { HANDY_PRICING } from '@grabitt/design-tokens'

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

  // The classified feed: active Handy Help posts within their 30-day validity.
  // Poster contact is NEVER included here — it's revealed only when the poster
  // accepts a proposal.
  feed: publicProcedure
    .input(z.object({ page: z.number().default(1) }))
    .query(async ({ ctx, input }) => {
      const cutoff = new Date(Date.now() - VALIDITY_MS)
      const rows = await ctx.prisma.listing.findMany({
        where: { department: 'handy_help', status: 'active', createdAt: { gte: cutoff } },
        orderBy: { bumpedAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
        select: { id: true, title: true, description: true, images: true, location: true, price: true, createdAt: true },
      })
      return rows.map(l => ({
        id: l.id, title: l.title, description: l.description,
        image: Array.isArray(l.images) ? (l.images[0] ?? null) : null,
        location: l.location, price: Number(l.price),
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
      if (listing.status !== 'active' || expiryOf(listing.createdAt) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This post has expired.' })
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

  // Proposals I've sent (as a responder).
  myProposals: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.handyProposal.findMany({
      where: { responderId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: { select: { id: true, title: true, images: true } } },
    })
  ),
})
