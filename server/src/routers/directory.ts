import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { getStripe } from '../lib/stripe'
import { DIRECTORY_PRICING } from '@grabitt/design-tokens'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

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

// Build a URL-safe slug from a business name.
function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'business'
}

// A slug unique across the directory. Appends a short id-based suffix on clash.
async function uniqueSlug(prisma: any, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name)
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    const clash = await prisma.directoryListing.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!clash || clash.id === excludeId) return candidate
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

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
        where: { paidUntil: { gt: new Date() }, reviewStatus: 'approved', disabled: false, ...(input?.category ? { category: input.category } : {}) },
        orderBy: { name: 'asc' },
      })
      // Attach the owner's published storefront slug (if any) so the card can link
      // through to their shop page. One query for all owners, not N.
      const ownerIds = listings.map(l => l.userId).filter((v): v is string => !!v)
      const shops = ownerIds.length
        ? await ctx.prisma.storefront.findMany({ where: { userId: { in: ownerIds }, published: true }, select: { userId: true, slug: true } })
        : []
      const shopByUser = new Map(shops.map(s => [s.userId, s.slug]))
      return listings.map(l => ({ ...l, shopSlug: l.userId ? (shopByUser.get(l.userId) ?? null) : null }))
    }),

  // Public: one listing — only while its subscription is paid AND approved.
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Accept the canonical slug or the raw id (old links / freshly created rows).
      const listing = await ctx.prisma.directoryListing.findFirst({ where: { OR: [{ slug: input.id }, { id: input.id }] } })
      if (!listing || listing.disabled || !isLive(listing.paidUntil) || listing.reviewStatus !== 'approved') throw new TRPCError({ code: 'NOT_FOUND', message: 'This listing is not currently live.' })
      // Anti-harvest: never send the raw email/website in the public payload —
      // base64-encode them so a scraper scanning the HTML or API JSON for an
      // address or URL finds nothing usable. The browser decodes them for display.
      const enc = (s: string | null) => (s ? Buffer.from(s, 'utf8').toString('base64') : null)
      const { email, website, ...rest } = listing
      // If the owner has a published storefront, expose its slug so the listing
      // can link through to their shop page.
      let shopSlug: string | null = null
      if (listing.userId) {
        const shop = await ctx.prisma.storefront.findUnique({ where: { userId: listing.userId }, select: { slug: true, published: true } })
        shopSlug = shop?.published ? shop.slug : null
      }
      // Admin-seeded listings with no owner yet can be claimed by a business.
      return { ...rest, emailB64: enc(email), websiteB64: enc(website), shopSlug, claimable: listing.adminCreated && !listing.userId }
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
        create: { userId: ctx.user.id, name: input.name, slug: await uniqueSlug(ctx.prisma, input.name) },
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
        create: { userId: ctx.user.id, ...data, slug: await uniqueSlug(ctx.prisma, input.name), reviewStatus: 'pending', adminNote: null },
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
      const slug = await uniqueSlug(ctx.prisma, (data as { name: string }).name)

      // With an owner email: attach the listing to that member (their one listing).
      if (ownerEmail && ownerEmail.trim()) {
        const user = await ctx.prisma.user.findUnique({ where: { email: ownerEmail.trim().toLowerCase() }, select: { id: true } })
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'No member with that email. Leave it blank to create an unclaimed listing, or create the member first.' })
        return ctx.prisma.directoryListing.upsert({
          where: { userId: user.id },
          update: { ...data, adminCreated: false, reviewStatus: 'approved', ...(paidUntil ? { paidUntil } : {}) },
          create: { userId: user.id, ...(data as { name: string }), slug, adminCreated: false, reviewStatus: 'approved', paidUntil },
        })
      }

      // No owner: an unclaimed, admin-seeded listing that a business can claim.
      return ctx.prisma.directoryListing.create({
        data: { ...(data as { name: string }), slug, adminCreated: true, reviewStatus: 'approved', paidUntil },
      })
    }),

  // Admin: grant a directory listing to a business, PULLING its details from the
  // business profile + storefront — business name, storefront logo, and the shop's
  // "about" text as the description. Approved and granted a free window so it goes
  // live immediately. Upserts, so re-running refreshes it from the current profile.
  grantForUser: execProcedure
    .input(z.object({ userId: z.string(), paidMonths: z.number().int().min(0).max(60).default(12) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: input.userId }, select: { businessName: true, displayName: true, phone: true } })
      const shop = await ctx.prisma.storefront.findUnique({ where: { userId: input.userId }, select: { about: true, tagline: true, logoUrl: true, contactPhone: true, contactEmail: true, contactWebsite: true, location: true, lat: true, lng: true } })
      const name = (user.businessName || user.displayName || 'Business').trim()
      const description = (shop?.about || shop?.tagline || '').trim().slice(0, 600) || null
      const paidUntil = input.paidMonths > 0 ? new Date(Date.now() + input.paidMonths * 30 * 86400000) : null
      const data = {
        name, description,
        logoUrl: shop?.logoUrl || null,
        phone: shop?.contactPhone || user.phone || null,
        email: shop?.contactEmail || null,
        website: shop?.contactWebsite || null,
        location: shop?.location || null,
        lat: shop?.lat ?? null,
        lng: shop?.lng ?? null,
        adminCreated: false, reviewStatus: 'approved',
      }
      const existing = await ctx.prisma.directoryListing.findUnique({ where: { userId: input.userId }, select: { id: true } })
      if (existing) {
        return ctx.prisma.directoryListing.update({ where: { userId: input.userId }, data: { ...data, ...(paidUntil ? { paidUntil } : {}) } })
      }
      return ctx.prisma.directoryListing.create({ data: { userId: input.userId, ...data, slug: await uniqueSlug(ctx.prisma, name), paidUntil } })
    }),

  // Admin remove a listing entirely.
  adminRemove: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.directoryListing.delete({ where: { id: input.id } })),

  // Admin: disable / re-enable a listing (kill-switch; hides it publicly without
  // deleting it or touching its paid window).
  adminSetDisabled: execProcedure
    .input(z.object({ id: z.string(), disabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.directoryListing.update({ where: { id: input.id }, data: { disabled: input.disabled } })
    ),

  // Admin: grant free months — extend the paid window by N months from now (or
  // from the current expiry if it's still in the future, so a comp never shortens
  // an active subscription). A listing must be live to show, so this is how we
  // gift time.
  adminGrantMonths: execProcedure
    .input(z.object({ id: z.string(), months: z.number().int().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const l = await ctx.prisma.directoryListing.findUniqueOrThrow({ where: { id: input.id }, select: { paidUntil: true } })
      const base = l.paidUntil && l.paidUntil.getTime() > Date.now() ? l.paidUntil.getTime() : Date.now()
      const paidUntil = new Date(base + input.months * 30 * 86400000)
      return ctx.prisma.directoryListing.update({ where: { id: input.id }, data: { paidUntil } })
    }),

  // ── Directory categories (admin-managed, merged with the built-in defaults) ──
  // Public: the custom categories admins have added. The client merges these with
  // BUSINESS_CATEGORIES so the dropdowns show both.
  categories: publicProcedure.query(({ ctx }) =>
    ctx.prisma.directoryCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { name: true } })
  ),

  // Admin: every category for management (always shown alphabetically).
  adminCategories: execProcedure.query(({ ctx }) =>
    ctx.prisma.directoryCategory.findMany({ orderBy: { name: 'asc' } })
  ),

  // Admin: add or rename a custom category.
  upsertCategory: execProcedure
    .input(z.object({ id: z.string().optional(), name: z.string().min(2).max(60), sortOrder: z.number().int().default(0), active: z.boolean().default(true) }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      const name = data.name.trim()
      return id
        ? ctx.prisma.directoryCategory.update({ where: { id }, data: { ...data, name } })
        : ctx.prisma.directoryCategory.create({ data: { ...data, name } })
    }),

  // Admin: remove a custom category. Existing listings keep whatever category
  // string they already hold; only the dropdown option goes away.
  removeCategory: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.directoryCategory.delete({ where: { id: input.id } })),
})
