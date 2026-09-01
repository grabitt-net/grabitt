import { z } from 'zod'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { makeReferralCode } from './auth'
import { PRICES, LISTING_CAPS, GRADE_THRESHOLDS, FEE_RATES, PROPERTY_PRICING } from '@grabitt/design-tokens'
import { sendSms } from '../lib/notify'
import { createHash } from 'node:crypto'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const smsConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
const hashOtp = (code: string, userId: string) => createHash('sha256').update(`${code}:${userId}`).digest('hex')
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/

export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
  ),

  // A personal account's monthly free listing allowance, for the dashboard.
  // Grade-based: grabber 10, dealer 50, trader 200, pro unlimited. (Business
  // accounts run on their tier allowance, shown in the Business Centre.)
  myAllowance: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { grade: true, isBusiness: true, salesCount: true, avgRating: true },
    })
    const ORDER = ['grabber', 'dealer', 'trader', 'pro'] as const
    const LABELS: Record<string, string> = { grabber: 'Grabber', dealer: 'Dealer', trader: 'Trader', pro: 'Pro' }
    const grade = (ORDER.includes(user.grade as typeof ORDER[number]) ? user.grade : 'grabber') as typeof ORDER[number]

    const rawCap = LISTING_CAPS[grade]
    const itemCap = rawCap === Infinity ? null : rawCap

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const resetsAt = new Date(monthStart); resetsAt.setMonth(resetsAt.getMonth() + 1)
    const [itemsUsed, propertyUsed] = await Promise.all([
      // Items = everything except property/jobs (jobs aren't available to
      // personal accounts anyway).
      ctx.prisma.listing.count({ where: { sellerId: ctx.user.id, createdAt: { gte: monthStart }, department: { notIn: ['property', 'jobs'] } } }),
      ctx.prisma.listing.count({ where: { sellerId: ctx.user.id, createdAt: { gte: monthStart }, department: 'property' } }),
    ])

    const idx = ORDER.indexOf(grade)
    const nextGrade = idx < ORDER.length - 1 ? ORDER[idx + 1] : null
    const th = nextGrade ? GRADE_THRESHOLDS[nextGrade as keyof typeof GRADE_THRESHOLDS] : null
    const sales = user.salesCount ?? 0

    return {
      grade,
      gradeLabel: LABELS[grade],
      isBusiness: user.isBusiness,
      feePct: FEE_RATES[grade] * 100,
      rating: user.avgRating != null ? Number(user.avgRating) : null,
      salesCount: sales,
      // Personal free monthly caps: grade-based items, no jobs (business-only),
      // 1 property. null = unlimited.
      caps: { items: itemCap, jobs: 0, property: PROPERTY_PRICING.privateFreePerMonth },
      usage: { items: itemsUsed, jobs: 0, property: propertyUsed },
      resetsAt: resetsAt.toISOString(),
      // The full grade ladder with fees, for the level indicator.
      ladder: ORDER.map(g => ({ grade: g, label: LABELS[g], feePct: FEE_RATES[g] * 100 })),
      next: nextGrade && th ? { grade: nextGrade, label: LABELS[nextGrade], feePct: FEE_RATES[nextGrade] * 100, needSales: th.sales, needRating: th.rating } : null,
    }
  }),

  // Business Light — the free entry business tier (8% fee, €0.99 per item
  // listing, no free allowance). No payment: just flags the account. A full
  // (€29/mo) Business subscription supersedes it.
  becomeBusinessLight: protectedProcedure.mutation(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true } })
    if (me.isBusiness) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already have a full Business account.' })
    return ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { businessLight: true }, select: { businessLight: true } })
  }),

  // The user's referral code + link and how it's performing. Backfills a code
  // for accounts created before referrals existed, on first open.
  myReferral: protectedProcedure.query(async ({ ctx }) => {
    let me = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { referralCode: true },
    })
    if (!me.referralCode) {
      // Retry a couple of times on the unlikely unique collision.
      for (let attempt = 0; attempt < 3 && !me.referralCode; attempt++) {
        try {
          me = await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: { referralCode: makeReferralCode() },
            select: { referralCode: true },
          })
        } catch { /* collision — try again */ }
      }
    }

    const [joined, credited] = await Promise.all([
      ctx.prisma.user.count({ where: { referredById: ctx.user.id } }),
      ctx.prisma.user.count({ where: { referredById: ctx.user.id, referralRewarded: true } }),
    ])
    const code = me.referralCode ?? ''
    return {
      code,
      link: `${APP_URL()}/join?ref=${code}`,
      joined,          // how many signed up with my code
      credited,        // how many have listed their first item (bonus paid)
      creditsEarned: credited * PRICES.referralBonus,
    }
  }),

  // ── VERIFICATION ─────────────────────────────────────────────────────────────
  // The four trust signals, with real state. ID/address are reviewed by the team
  // (docStatus 'pending' after upload); email/phone are self-service.
  verificationStatus: protectedProcedure.query(async ({ ctx }) => {
    const u = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: {
        emailVerified: true, phoneVerified: true, idVerified: true, addressVerified: true,
        isVerified: true, phone: true, idDocStatus: true, addressDocStatus: true,
      },
    })
    return {
      email: u.emailVerified,
      phone: u.phoneVerified,
      id: u.idVerified ? 'verified' : u.idDocStatus, // 'verified' | 'pending' | 'none'
      address: u.addressVerified ? 'verified' : u.addressDocStatus,
      overall: u.isVerified,
      phoneNumber: u.phone,
      smsAvailable: smsConfigured(),
    }
  }),

  // Send a 6-digit code by SMS to prove the phone number. Stored hashed with a
  // 10-minute expiry; the plaintext never touches the DB.
  startPhoneVerify: protectedProcedure
    .input(z.object({ phone: z.string().regex(PHONE_RE, 'Enter a valid phone number') }))
    .mutation(async ({ ctx, input }) => {
      if (!smsConfigured()) return { sent: false, reason: 'sms_unavailable' as const }
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const phone = input.phone.replace(/[\s-]/g, '')
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          phone,
          phoneOtpHash: hashOtp(code, ctx.user.id),
          phoneOtpExpiresAt: new Date(Date.now() + 10 * 60_000),
        },
      })
      await sendSms(phone, `Your Grabitt verification code is ${code}. It expires in 10 minutes.`)
      return { sent: true as const }
    }),

  confirmPhoneVerify: protectedProcedure
    .input(z.object({ code: z.string().min(4).max(8) }))
    .mutation(async ({ ctx, input }) => {
      const u = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { phoneOtpHash: true, phoneOtpExpiresAt: true, emailVerified: true },
      })
      if (!u.phoneOtpHash || !u.phoneOtpExpiresAt || u.phoneOtpExpiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your code has expired — request a new one.' })
      }
      if (hashOtp(input.code.trim(), ctx.user.id) !== u.phoneOtpHash) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That code is not correct.' })
      }
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          phoneVerified: true,
          phoneOtpHash: null,
          phoneOtpExpiresAt: null,
          // Basic verified badge once email + phone are both confirmed.
          ...(u.emailVerified ? { isVerified: true } : {}),
        },
      })
      return { ok: true }
    }),

  // Record that an ID or proof-of-address document has been uploaded to the
  // private verification bucket, and flag it for the team to review. The path is
  // resolved and the file is only ever served to the owner or an admin via a
  // signed URL — never made public.
  submitVerificationDoc: protectedProcedure
    .input(z.object({ kind: z.enum(['id', 'address']), path: z.string().min(1).max(300) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input.kind === 'id'
          ? { idDocPath: input.path, idDocStatus: 'pending' }
          : { addressDocPath: input.path, addressDocStatus: 'pending' },
      })
      return { ok: true }
    }),

  // Public: reviews received by a user (seller or buyer), plus a rating summary.
  reviews: publicProcedure
    .input(z.object({ userId: z.string().uuid(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const [rows, total, agg] = await Promise.all([
        ctx.prisma.review.findMany({
          where: { subjectId: input.userId },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * 20,
          take: 20,
          include: { author: { select: { id: true, displayName: true, avatar: true } } },
        }),
        ctx.prisma.review.count({ where: { subjectId: input.userId } }),
        ctx.prisma.review.aggregate({ where: { subjectId: input.userId }, _avg: { rating: true, accuracyRating: true, communicationRating: true, speedRating: true } }),
      ])
      return {
        total,
        avg: agg._avg.rating,
        breakdown: { accuracy: agg._avg.accuracyRating, communication: agg._avg.communicationRating, speed: agg._avg.speedRating },
        reviews: rows.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          authorName: r.author.displayName,
          authorAvatar: r.author.avatar,
        })),
      }
    }),

  // At-a-glance counts for the account dashboard — active/sold listings, unread
  // messages, pending offers on your listings, and saved (favourite) items.
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const uid = ctx.user.id
    const [active, sold, unread, offers, saved, beingWatched, toShip, payDue, purchases, toPay] = await Promise.all([
      // "On sale" / "Sold" count ITEMS only — job and property listings are Listing
      // rows too, but they belong in the business hub, not the sell dashboard.
      ctx.prisma.listing.count({ where: { sellerId: uid, status: 'active', department: { notIn: ['jobs', 'property'] } } }),
      ctx.prisma.listing.count({ where: { sellerId: uid, status: 'sold', department: { notIn: ['jobs', 'property'] } } }),
      ctx.prisma.message.count({ where: { senderId: { not: uid }, readAt: null, thread: { participants: { some: { userId: uid } } } } }),
      ctx.prisma.offer.count({ where: { status: 'pending', listing: { sellerId: uid } } }),
      // Saved / "Watching" — items this member has favourited.
      ctx.prisma.wishlistItem.count({ where: { userId: uid } }),
      // "Being watched" — how many people are watching THIS member's listings.
      ctx.prisma.wishlistItem.count({ where: { listing: { sellerId: uid } } }),
      // "To ship" — the member's courier sales that are paid (held) but not yet dispatched.
      ctx.prisma.transaction.count({ where: { sellerId: uid, fulfilmentType: 'courier', status: 'held', shippedAt: null } }),
      // "Pay due" — funds due to the member (seller) but not yet released to them.
      ctx.prisma.transaction.count({ where: { sellerId: uid, status: { in: ['held', 'confirmed_handover', 'completed'] }, fundsReleasedAt: null } }),
      // "Purchases" — items the member has bought (excludes unpaid / cancelled / refunded).
      ctx.prisma.transaction.count({ where: { buyerId: uid, status: { notIn: ['pending_payment', 'cancelled', 'refunded'] } } }),
      // "To pay" — the member's own purchases still awaiting payment.
      ctx.prisma.transaction.count({ where: { buyerId: uid, status: 'pending_payment' } }),
    ])
    // "Watching" is the same underlying figure as saved favourites.
    return { active, sold, unread, offers, saved, watching: saved, beingWatched, toShip, payDue, purchases, toPay }
  }),

  // A single "My Hub" pill metric, scoped to an optional date window (days back;
  // 0 = all time). Each pill on the member hub fetches its own value so every
  // pill can carry its own date range. Currency metrics return euros; the rest
  // return a count.
  hubMetric: protectedProcedure
    .input(z.object({
      key: z.enum(['sales', 'sold', 'beingWatched', 'orders', 'toShip', 'incomeDue', 'purchased', 'watching', 'toPay']),
      // Optional ISO date window; omit both for all-time.
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const uid = ctx.user.id
      const range: { gte?: Date; lte?: Date } = {}
      if (input.from) range.gte = new Date(input.from)
      if (input.to) range.lte = new Date(input.to)
      const created = (range.gte || range.lte) ? { createdAt: range } : {}
      const num = (n: unknown) => Number(n ?? 0)

      switch (input.key) {
        case 'sales': {
          const r = await ctx.prisma.transaction.aggregate({ _sum: { amount: true }, where: { sellerId: uid, status: { notIn: ['pending_payment', 'cancelled', 'refunded'] }, ...created } })
          return { value: num(r._sum.amount), currency: true }
        }
        case 'sold': {
          // Items you've sold (listings marked sold — excludes jobs/property).
          const c = await ctx.prisma.listing.count({ where: { sellerId: uid, status: 'sold', department: { notIn: ['jobs', 'property'] }, ...created } })
          return { value: c, currency: false }
        }
        case 'beingWatched': {
          // How many of YOUR listings are being watched by other people.
          const rows = await ctx.prisma.wishlistItem.findMany({ where: { listing: { sellerId: uid }, ...created }, select: { listingId: true }, distinct: ['listingId'] })
          return { value: rows.length, currency: false }
        }
        case 'orders': {
          // Completed orders (money changed hands / delivered).
          const c = await ctx.prisma.transaction.count({ where: { sellerId: uid, status: { in: ['completed', 'released', 'confirmed_handover'] }, ...created } })
          return { value: c, currency: false }
        }
        case 'toShip': {
          const c = await ctx.prisma.transaction.count({ where: { sellerId: uid, fulfilmentType: 'courier', status: 'held', shippedAt: null, ...created } })
          return { value: c, currency: false }
        }
        case 'incomeDue': {
          const r = await ctx.prisma.transaction.aggregate({ _sum: { sellerNet: true }, where: { sellerId: uid, status: { in: ['held', 'confirmed_handover', 'completed'] }, fundsReleasedAt: null, ...created } })
          return { value: num(r._sum.sellerNet), currency: true }
        }
        case 'purchased': {
          const c = await ctx.prisma.transaction.count({ where: { buyerId: uid, status: { notIn: ['pending_payment', 'cancelled', 'refunded'] }, ...created } })
          return { value: c, currency: false }
        }
        case 'watching': {
          const c = await ctx.prisma.wishlistItem.count({ where: { userId: uid, ...created } })
          return { value: c, currency: false }
        }
        case 'toPay': {
          const r = await ctx.prisma.transaction.aggregate({ _sum: { amount: true }, where: { buyerId: uid, status: 'pending_payment', ...created } })
          return { value: num(r._sum.amount), currency: true }
        }
      }
    }),

  // The list of items behind a My Hub pill — what the lower panel shows when a
  // card is clicked. Returns a normalised row set for the chosen metric.
  hubList: protectedProcedure
    .input(z.object({ key: z.enum(['sales', 'sold', 'beingWatched', 'orders', 'toShip', 'incomeDue', 'purchased', 'watching', 'toPay']) }))
    .query(async ({ ctx, input }) => {
      const uid = ctx.user.id
      const img = (images: unknown) => (Array.isArray(images) ? (images[0] as string | undefined) ?? null : null)
      const eur = (n: unknown) => `€${Number(n ?? 0).toLocaleString()}`
      const TX: Record<string, string> = { pending_payment: 'Awaiting payment', held: 'Paid — in escrow', confirmed_handover: 'Handover confirmed', completed: 'Completed', released: 'Funds released', disputed: 'In dispute', refunded: 'Refunded', cancelled: 'Cancelled' }

      // Transaction-backed lists.
      const txList = async (where: Record<string, unknown>, subtitle?: (t: any) => string) => {
        const rows = await ctx.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, include: { listing: { select: { id: true, title: true, images: true } } } })
        return rows.map(t => ({ listingId: t.listingId, title: t.listing?.title ?? 'Item', image: img(t.listing?.images), price: eur(t.amount), subtitle: subtitle ? subtitle(t) : (TX[t.status] ?? t.status) }))
      }

      switch (input.key) {
        case 'sales': return txList({ sellerId: uid, status: { notIn: ['pending_payment', 'cancelled', 'refunded'] } })
        case 'orders': return txList({ sellerId: uid, status: { in: ['completed', 'released', 'confirmed_handover'] } })
        case 'toShip': return txList({ sellerId: uid, fulfilmentType: 'courier', status: 'held', shippedAt: null }, () => 'Awaiting dispatch')
        case 'incomeDue': return txList({ sellerId: uid, status: { in: ['held', 'confirmed_handover', 'completed'] }, fundsReleasedAt: null }, t => `${eur(t.sellerNet)} due to you`)
        case 'purchased': return txList({ buyerId: uid, status: { notIn: ['pending_payment', 'cancelled', 'refunded'] } })
        case 'toPay': return txList({ buyerId: uid, status: 'pending_payment' }, () => 'Payment due')
        case 'sold': {
          const rows = await ctx.prisma.listing.findMany({ where: { sellerId: uid, status: 'sold', department: { notIn: ['jobs', 'property'] } }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, images: true, price: true } })
          return rows.map(l => ({ listingId: l.id, title: l.title, image: img(l.images), price: eur(l.price), subtitle: 'Sold' }))
        }
        case 'watching': {
          const rows = await ctx.prisma.wishlistItem.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, include: { listing: { select: { id: true, title: true, images: true, price: true } } } })
          return rows.map(w => ({ listingId: w.listingId, title: w.listing?.title ?? 'Item', image: img(w.listing?.images), price: eur(w.listing?.price), subtitle: 'Watching' }))
        }
        case 'beingWatched': {
          const groups = await ctx.prisma.wishlistItem.groupBy({ by: ['listingId'], where: { listing: { sellerId: uid } }, _count: { _all: true } })
          if (!groups.length) return []
          const listings = await ctx.prisma.listing.findMany({ where: { id: { in: groups.map(g => g.listingId) } }, select: { id: true, title: true, images: true, price: true } })
          const byId = new Map(listings.map(l => [l.id, l]))
          return groups.map(g => {
            const l = byId.get(g.listingId)
            const n = g._count._all
            return { listingId: g.listingId, title: l?.title ?? 'Item', image: img(l?.images), price: eur(l?.price), subtitle: `${n} ${n === 1 ? 'person' : 'people'} watching` }
          })
        }
      }
    }),

  // The seller info centre: current grade and fee, progress to the next grade,
  // profile completion, and per-listing performance. Everything the prototype's
  // profile hero and Seller Dashboard showed, from real data.
  sellerCentre: protectedProcedure.query(async ({ ctx }) => {
    const uid = ctx.user.id
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [user, listingsThisMonth, reviewCount, listings, offerCounts] = await Promise.all([
      ctx.prisma.user.findUniqueOrThrow({
        where: { id: uid },
        select: {
          grade: true, salesCount: true, avgRating: true, displayName: true, avatar: true,
          phone: true, collectionAddress: true, interests: true, isVerified: true,
          subInterests: true, hobbies: true, skills: true,
          phoneVerified: true, emailVerified: true, isBusiness: true,
        },
      }),
      ctx.prisma.listing.count({ where: { sellerId: uid, createdAt: { gte: monthStart } } }),
      ctx.prisma.review.count({ where: { subjectId: uid } }),
      ctx.prisma.listing.findMany({
        where: { sellerId: uid, status: { in: ['active', 'sold', 'grab_it_now'] } },
        orderBy: { viewCount: 'desc' },
        select: { id: true, title: true, status: true, viewCount: true, price: true, images: true },
      }),
      ctx.prisma.offer.groupBy({
        by: ['listingId'],
        where: { listing: { sellerId: uid } },
        _count: { _all: true },
      }),
    ])

    const offersByListing = new Map(offerCounts.map(o => [o.listingId, o._count._all]))
    const perListing = listings.map(l => ({
      id: l.id,
      title: l.title,
      status: l.status,
      price: Number(l.price),
      image: Array.isArray(l.images) ? l.images[0] ?? null : null,
      views: l.viewCount,
      offers: offersByListing.get(l.id) ?? 0,
    }))

    const totalViews = perListing.reduce((a, l) => a + l.views, 0)
    const totalOffers = perListing.reduce((a, l) => a + l.offers, 0)

    // Profile completion — the fields that make a member findable and credible.
    // Reaching 100% is what the prototype rewarded with a badge and credit.
    const checks: { label: string; done: boolean }[] = [
      { label: 'Display name', done: !!user.displayName?.trim() },
      { label: 'Photo', done: !!user.avatar },
      { label: 'Phone number', done: !!user.phone },
      { label: 'Phone verified', done: !!user.phoneVerified },
      { label: 'Collection address', done: !!user.collectionAddress?.trim() },
      { label: 'Interests', done: (user.interests ?? []).length > 0 },
      { label: 'Hobbies', done: (user.hobbies ?? []).length > 0 },
      { label: 'Skills', done: (user.skills ?? []).length > 0 },
      { label: 'ID verified', done: !!user.isVerified },
    ]
    const done = checks.filter(c => c.done).length
    const completion = {
      pct: Math.round((done / checks.length) * 100),
      missing: checks.filter(c => !c.done).map(c => c.label),
    }

    return {
      grade: user.grade,
      salesCount: user.salesCount,
      avgRating: user.avgRating,
      ratingCount: reviewCount,
      listingsThisMonth,
      isBusiness: user.isBusiness,
      isVerified: user.isVerified,
      completion,
      performance: {
        totalViews,
        totalOffers,
        convertPct: totalViews ? Math.round((totalOffers / totalViews) * 100) : 0,
        live: perListing.filter(l => l.status === 'active' || l.status === 'grab_it_now').length,
        sold: perListing.filter(l => l.status === 'sold').length,
        listings: perListing,
      },
    }
  }),

  profile: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.prisma.user.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true, displayName: true, avatar: true,
          grade: true, salesCount: true, avgRating: true,
          isBusiness: true, businessVerified: true,
          createdAt: true,
        },
      })
    ),

  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(50).optional(),
      // Private real/legal name — never shown publicly.
      fullName: z.string().max(80).nullish(),
      // Member dashboard "Looking for work" toggle.
      openToWork: z.boolean().optional(),
      // Recruitment taxonomy: languages + months of experience per job key.
      // Kept loose (z.any) so the large AppRouter type stays within the
      // compiler's instantiation-depth limit.
      jobProfile: z.any().optional(),
      // Flattened form of jobProfile the client derives from the ticked roles,
      // used to keep the seeker profile (recruiter search + generated CV) in
      // step with the tick-boxes. Jobseekers only; ignored for business accounts.
      seekerDerived: z.object({
        sectors: z.array(z.string().max(80)).max(20),
        roles: z.array(z.string().max(140)).max(200),
        experienceMonths: z.number().int().min(0).max(600),
        languages: z.array(z.string().max(40)).max(10),
        languageLevels: z.array(z.object({ language: z.string().max(40), level: z.string().max(20) })).max(10).optional(),
        // About Me
        bio: z.string().max(2000).optional(),
        location: z.string().max(120).optional(),
        nationality: z.string().max(60).optional(),
        drives: z.boolean().optional(),
        hasCar: z.boolean().optional(),
        canWorkGC: z.boolean().optional(),
        allowUnlock: z.boolean().optional(),
        uploadedCvPath: z.string().max(300).nullish(),
        uploadedCvName: z.string().max(200).nullish(),
      }).optional(),
      avatar: z.string().url().optional(),
      locale: z.enum(['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt']).optional(),
      // Attributes & preferences — feed personalisation, job matching and
      // marketing segmentation.
      interests: z.array(z.string()).max(30).optional(),
      subInterests: z.array(z.string()).max(200).optional(),
      hobbies: z.array(z.string()).max(40).optional(),
      skills: z.array(z.string()).max(40).optional(),
      phone: z.string().max(40).optional(),
      collectionAddress: z.string().max(400).optional(),
      marketingConsent: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { marketingConsent, jobProfile, seekerDerived, openToWork, ...rest } = input
      const user = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...rest,
          ...(openToWork !== undefined ? { openToWork } : {}),
          // Recruitment taxonomy is stored as a JSON string.
          ...(jobProfile != null ? { jobProfile: JSON.stringify(jobProfile) } : {}),
          // Stamp when consent was given — GDPR requires us to evidence it.
          ...(marketingConsent !== undefined
            ? { marketingConsent, marketingConsentAt: marketingConsent ? new Date() : null }
            : {}),
        },
      })

      // Bridge the tick-box recruitment data into the seeker profile that the
      // employer Find Staff search and the generated CV read from. Jobseekers
      // only — a business ticking roles in "employer" mode must not become a
      // searchable candidate. `active` tracks the "looking for work" toggle.
      if ((seekerDerived || openToWork !== undefined) && !user.isBusiness) {
        const data: Record<string, unknown> = {}
        if (seekerDerived) {
          data.sectors = seekerDerived.sectors
          data.sector = seekerDerived.sectors[0] ?? null
          data.roles = seekerDerived.roles
          data.experienceMonths = seekerDerived.experienceMonths
          data.languages = seekerDerived.languages
          if (seekerDerived.languageLevels !== undefined) data.languageLevels = seekerDerived.languageLevels
          if (seekerDerived.bio !== undefined) data.summary = seekerDerived.bio || null
          if (seekerDerived.location !== undefined) data.location = seekerDerived.location || null
          if (seekerDerived.nationality !== undefined) data.nationality = seekerDerived.nationality || null
          if (seekerDerived.drives !== undefined) data.drives = seekerDerived.drives
          if (seekerDerived.hasCar !== undefined) data.hasCar = seekerDerived.hasCar
          if (seekerDerived.canWorkGC !== undefined) data.rightToWork = seekerDerived.canWorkGC ? 'Permitted to work in Gran Canaria' : 'Work permission not confirmed'
          if (seekerDerived.allowUnlock !== undefined) data.contactUnlockable = seekerDerived.allowUnlock
          if (seekerDerived.uploadedCvPath !== undefined) data.uploadedCvPath = seekerDerived.uploadedCvPath || null
          if (seekerDerived.uploadedCvName !== undefined) data.uploadedCvName = seekerDerived.uploadedCvName || null
        }
        if (openToWork !== undefined) data.active = openToWork
        await ctx.prisma.seekerProfile.upsert({
          where: { userId: ctx.user.id },
          create: { userId: ctx.user.id, ...data },
          update: data,
        })
      }

      return user
    }),

  // Property-agent profile. When enabled, the agent's WhatsApp/email/agency are
  // shown on their property listings so buyers can contact them directly.
  // Self-signup as a property agent — requests the standalone agent profile,
  // pending manual admin review. Grants nothing yet; an admin authorises it.
  applyAsAgent: protectedProcedure
    .input(z.object({
      agencyName: z.string().max(120).optional(),
      agentWhatsapp: z.string().max(40).optional(),
      agentEmail: z.string().email().max(120).optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, isPropertyAgent: true, agentStatus: true } })
      if (me.isBusiness) throw new TRPCError({ code: 'BAD_REQUEST', message: 'A business account cannot also be a property agent. Agent accounts are separate.' })
      if (me.isPropertyAgent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You are already a property agent.' })
      if (me.agentStatus === 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your agent application is already under review.' })
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          agentStatus: 'pending',
          ...(input.agencyName ? { agencyName: input.agencyName.trim() } : {}),
          ...(input.agentWhatsapp ? { agentWhatsapp: input.agentWhatsapp.trim() } : {}),
          ...(input.agentEmail ? { agentEmail: (input.agentEmail as string).trim() } : {}),
        },
      })
      return { ok: true as const }
    }),

  updateAgentProfile: protectedProcedure
    .input(z.object({
      isPropertyAgent: z.boolean().optional(),
      agencyName: z.string().max(120).nullish(),
      agentWhatsapp: z.string().max(40).nullish(),
      agentEmail: z.string().email().max(120).nullish().or(z.literal('')),
    }))
    .mutation(({ ctx, input }) => {
      const data: Record<string, unknown> = {}
      if (input.isPropertyAgent !== undefined) data.isPropertyAgent = input.isPropertyAgent
      if (input.agencyName !== undefined) data.agencyName = input.agencyName || null
      if (input.agentWhatsapp !== undefined) data.agentWhatsapp = input.agentWhatsapp || null
      if (input.agentEmail !== undefined) data.agentEmail = (input.agentEmail as string) || null
      return ctx.prisma.user.update({ where: { id: ctx.user.id }, data })
    }),

  // Tenant profile — a renter's details, shown to an agent when they enquire on
  // a rental so the agent can pre-qualify them.
  updateTenantProfile: protectedProcedure
    .input(z.object({
      tenantBudget: z.number().int().min(0).max(100000).nullish(),
      tenantMoveIn: z.string().max(60).nullish(),
      tenantOccupants: z.number().int().min(1).max(20).nullish(),
      tenantEmployment: z.string().max(60).nullish(),
      tenantHasPets: z.boolean().optional(),
      tenantSmoker: z.boolean().optional(),
      tenantAbout: z.string().max(600).nullish(),
    }))
    .mutation(({ ctx, input }) => {
      const data: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(input)) if (v !== undefined) data[k] = v === '' ? null : v
      return ctx.prisma.user.update({ where: { id: ctx.user.id }, data })
    }),

  // Business storefront customisation — only for active Business accounts.
  updateBusinessProfile: protectedProcedure
    .input(z.object({
      businessName: z.string().min(2).max(60).optional(),
      businessBio: z.string().max(500).optional(),
      businessBanner: z.string().url().optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true } })
      if (!user.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business subscription is required to set up a storefront' })
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
          ...(input.businessBio !== undefined ? { businessBio: input.businessBio } : {}),
          ...(input.businessBanner !== undefined ? { businessBanner: input.businessBanner || null } : {}),
        },
      })
    }),

  // ── STRIPE CONNECT (seller payouts) ──────────────────────────────────────────
  // Whether the seller can receive payouts yet.
  payoutStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { stripeAccountId: true } })
    if (!user.stripeAccountId) return { connected: false, payoutsEnabled: false, chargesEnabled: false }
    const acct = await getStripe().accounts.retrieve(user.stripeAccountId)
    return {
      connected: true,
      payoutsEnabled: acct.payouts_enabled ?? false,
      chargesEnabled: acct.charges_enabled ?? false,
      detailsSubmitted: acct.details_submitted ?? false,
    }
  }),

  // Creates (or reuses) the seller's Express connected account and returns a
  // hosted onboarding link. Sellers must complete this before funds can be
  // transferred to them at handover/tracking release.
  createPayoutOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
    try {
      let accountId = user.stripeAccountId
      if (!accountId) {
        const account = await getStripe().accounts.create({
          type: 'express',
          email: user.email,
          // Sellers only receive payouts (transfers). Requesting card_payments
          // is unnecessary and can fail platform capability checks.
          capabilities: { transfers: { requested: true } },
          business_type: 'individual',
          metadata: { userId: user.id },
        })
        accountId = account.id
        await ctx.prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } })
      }
      const link = await getStripe().accountLinks.create({
        account: accountId,
        refresh_url: `${APP_URL()}/?payout=refresh`,
        return_url: `${APP_URL()}/?payout=done`,
        type: 'account_onboarding',
      })
      return { url: link.url }
    } catch (e) {
      // Surface Stripe's real reason (e.g. "complete your platform profile").
      throw new TRPCError({ code: 'BAD_REQUEST', message: e instanceof Error ? e.message : 'Stripe payout setup failed' })
    }
  }),

  // Opens the Express dashboard for a seller who has already onboarded.
  payoutDashboardLink: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { stripeAccountId: true } })
    if (!user.stripeAccountId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No payout account yet' })
    const link = await getStripe().accounts.createLoginLink(user.stripeAccountId)
    return { url: link.url }
  }),
})
