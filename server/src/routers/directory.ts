import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { DIRECTORY_PRICING } from '@grabitt/design-tokens'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// A directory listing is live only while its standalone subscription is paid
// (paidUntil in the future) — this is a separate income stream from banner ads.
const isLive = (paidUntil: Date | null | undefined) => !!paidUntil && paidUntil.getTime() > Date.now()

// Directory subscription terms → price + months added to paidUntil.
const DIRECTORY_TERMS = {
  month:   { cents: DIRECTORY_PRICING.monthlyCents,   months: 1,  label: 'Monthly (€15/mo)' },
  quarter: { cents: DIRECTORY_PRICING.quarterlyCents, months: 3,  label: 'Quarterly (€40)' },
  year:    { cents: DIRECTORY_PRICING.yearlyCents,     months: 12, label: 'Yearly (€150)' },
} as const
export type DirectoryTerm = keyof typeof DIRECTORY_TERMS

// Turn a bare domain into a full URL (https://), leaving valid URLs untouched.
function normalizeWebsite(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  if (!s) return null
  return /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, '')}`
}

const listingInput = z.object({
  name: z.string().min(2).max(80),
  category: z.string().max(60).optional(),
  description: z.string().max(600).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  // Accept a bare domain (e.g. "grabitt.net") — normalised to a full URL on save
  // so advertisers don't have to type https:// or www.
  website: z.string().max(200).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  location: z.string().max(120).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

export const directoryRouter = router({
  // Public: the live directory — listings with a paid subscription in force.
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const listings = await ctx.prisma.directoryListing.findMany({
        where: { paidUntil: { gt: new Date() }, reviewStatus: 'approved', ...(input?.category ? { category: input.category } : {}) },
        orderBy: { name: 'asc' },
      })
      return listings
    }),

  // Public: one listing — only while its subscription is paid AND approved.
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.prisma.directoryListing.findUnique({ where: { id: input.id } })
      if (!listing || !isLive(listing.paidUntil) || listing.reviewStatus !== 'approved') throw new TRPCError({ code: 'NOT_FOUND', message: 'This listing is not currently live.' })
      // Admin-seeded listings with no owner yet can be claimed by a business.
      return { ...listing, claimable: listing.adminCreated && !listing.userId }
    }),

  // A business owner claims an admin-created (unclaimed) listing as their own.
  // They get a free month; from then on they choose a subscription. Marks them
  // as an advertiser so they can manage it from the Advertiser Centre.
  claim: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const l = await ctx.prisma.directoryListing.findUnique({ where: { id: input.listingId }, select: { id: true, userId: true, adminCreated: true, name: true } })
      if (!l) throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found.' })
      if (l.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This listing has already been claimed.' })
      const mine = await ctx.prisma.directoryListing.findUnique({ where: { userId: ctx.user.id }, select: { id: true } })
      if (mine) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your account already has a directory listing.' })
      const paidUntil = new Date(Date.now() + 30 * 86400000) // 1 month free from claim
      await ctx.prisma.$transaction([
        ctx.prisma.directoryListing.update({ where: { id: l.id }, data: { userId: ctx.user.id, adminCreated: false, reviewStatus: 'approved', paidUntil } }),
        ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { isAdvertiser: true } }),
      ])
      return { ok: true, freeUntil: paidUntil }
    }),

  // Prices for the directory subscription terms (public, for the buy UI).
  terms: publicProcedure.query(() =>
    (Object.keys(DIRECTORY_TERMS) as DirectoryTerm[]).map(k => ({ term: k, ...DIRECTORY_TERMS[k] }))
  ),

  // Advertiser: my listing + whether its subscription is live + when it ends.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isAdvertiser: true, isBusiness: true } })
    const listing = await ctx.prisma.directoryListing.findUnique({ where: { userId: ctx.user.id } })
    return { isAdvertiser: me.isAdvertiser, isBusiness: me.isBusiness, listing, live: isLive(listing?.paidUntil) && listing?.reviewStatus === 'approved', paidUntil: listing?.paidUntil ?? null, reviewStatus: listing?.reviewStatus ?? null, adminNote: listing?.adminNote ?? null }
  }),

  // Advertiser/business: buy or renew the directory subscription (one-off payment
  // per term; extends paidUntil). Webhook applies the extension on success.
  checkout: protectedProcedure
    .input(z.object({ term: z.enum(['month', 'quarter', 'year']) }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.directoryListing.findUnique({ where: { userId: ctx.user.id } })
      if (!listing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Create your directory listing first.' })
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true } })
      const t = DIRECTORY_TERMS[input.term]
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: t.cents, product_data: { name: `Grabitt Business Directory — ${t.label}` } } }],
        payment_intent_data: { metadata: { kind: 'directory', userId: ctx.user.id, months: String(t.months) } },
        success_url: `${appUrl()}/advertiser?directory=success`,
        cancel_url: `${appUrl()}/advertiser?directory=cancelled`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { url: session.url }
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

  // Advertiser OR business: create/update my directory entry. (Businesses can
  // take a directory listing too — it is a separate paid product.)
  upsert: protectedProcedure
    .input(listingInput)
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isAdvertiser: true, isBusiness: true } })
      // Businesses and advertisers can manage a listing; so can anyone who has
      // one already — e.g. a Business Light account that PAID for a directory via
      // the basket (a listing was seeded on payment). Business Light gets no
      // listing until they pay, but once paid they can fill in its details.
      const owned = await ctx.prisma.directoryListing.findUnique({ where: { userId: ctx.user.id }, select: { id: true } })
      if (!me.isAdvertiser && !me.isBusiness && !owned) throw new TRPCError({ code: 'FORBIDDEN', message: 'Buy a directory listing first, then you can edit its details.' })
      const data = {
        name: input.name,
        category: input.category || null,
        description: input.description || null,
        phone: input.phone || null,
        email: input.email || null,
        website: normalizeWebsite(input.website),
        logoUrl: input.logoUrl || null,
        location: input.location || null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      }
      // Submitting/editing the business info sends it (back) to admin review —
      // it stays hidden until an admin approves. Clear any prior rejection note.
      return ctx.prisma.directoryListing.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...data, reviewStatus: 'pending', adminNote: null },
        update: { ...data, reviewStatus: 'pending', adminNote: null },
      })
    }),

  // ── Admin moderation ─────────────────────────────────────────────────────────
  // Every directory listing (any status), with owner + whether its subscription
  // is currently live (paidUntil in the future).
  adminList: execProcedure.query(async ({ ctx }) => {
    const listings = await ctx.prisma.directoryListing.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, displayName: true } } },
    })
    return listings.map(l => ({ ...l, live: isLive(l.paidUntil) }))
  }),

  // Admin: grant/extend or clear a listing's paid window (comp or correction).
  adminSetPaidUntil: execProcedure
    .input(z.object({ id: z.string(), paidUntil: z.string().nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.directoryListing.update({ where: { id: input.id }, data: { paidUntil: input.paidUntil ? new Date(input.paidUntil) : null } })
    ),

  // Admin edit — fix or moderate any listing's details.
  adminUpdate: execProcedure
    .input(listingInput.partial().extend({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input
      const data = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v]))
      if ('website' in data) data.website = normalizeWebsite(data.website as string | null)
      return ctx.prisma.directoryListing.update({ where: { id }, data })
    }),

  // Admin: approve or reject the submitted business info. Approving makes the
  // listing public (while paid); rejecting keeps it hidden with a note the
  // advertiser sees so they can fix and resubmit.
  adminReview: execProcedure
    .input(z.object({ id: z.string(), status: z.enum(['approved', 'rejected', 'pending']), note: z.string().max(400).optional() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.directoryListing.update({
        where: { id: input.id },
        data: { reviewStatus: input.status, adminNote: input.status === 'rejected' ? (input.note || null) : null },
      })
    ),

  // Admin: create a directory listing on behalf of a member (by their email).
  // Admin-created listings are trusted, so they're approved immediately; a paid
  // window is opened (default 12 months) so the listing shows publicly.
  adminCreate: execProcedure
    .input(listingInput.extend({ ownerEmail: z.string().email().optional().or(z.literal('')), paidMonths: z.number().int().min(0).max(36).default(12) }))
    .mutation(async ({ ctx, input }) => {
      const { ownerEmail, paidMonths, ...rest } = input
      const data = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v]))
      if ('website' in data) data.website = normalizeWebsite(data.website as string | null)
      const paidUntil = paidMonths > 0 ? new Date(Date.now() + paidMonths * 30 * 86400000) : null

      // With an owner email: attach the listing to that member (their one listing).
      if (ownerEmail && ownerEmail.trim()) {
        const user = await ctx.prisma.user.findUnique({ where: { email: ownerEmail.trim().toLowerCase() }, select: { id: true } })
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'No member with that email. Leave it blank to create an unclaimed listing, or create the member first.' })
        return ctx.prisma.directoryListing.upsert({
          where: { userId: user.id },
          update: { ...data, adminCreated: false, reviewStatus: 'approved', ...(paidUntil ? { paidUntil } : {}) },
          create: { userId: user.id, ...(data as { name: string }), adminCreated: false, reviewStatus: 'approved', paidUntil },
        })
      }

      // No owner: an unclaimed, admin-seeded listing that a business can claim.
      return ctx.prisma.directoryListing.create({
        data: { ...(data as { name: string }), adminCreated: true, reviewStatus: 'approved', paidUntil },
      })
    }),

  // Admin remove a listing entirely.
  adminRemove: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.directoryListing.delete({ where: { id: input.id } })),
})
