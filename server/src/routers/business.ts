import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { scoreSeller, type SellerScore } from '../lib/sellerScore'
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER, qualifyingBusinessGrade, type BusinessGrade } from '@grabitt/design-tokens'

// Shape returned by business.tierStatus. Explicit so the client call site does
// not trip the deep-instantiation guard.
export type BusinessTierStatus =
  | { isBusiness: false }
  | {
      isBusiness: true
      grade: BusinessGrade
      label: string
      feePct: number
      caps: { items: number; jobs: number; property: number }
      usage: { items: number; jobs: number; property: number }
      sales90d: number
      rating: number
      ratingCount: number
      next: { label: string; feePct: number; needSales: number; needRating: number } | null
      maintaining: boolean
    }

export type BusinessPostings = {
  jobs: { id: string; title: string; location: string; status: string; applications: number; createdAt: Date }[]
  properties: { id: string; title: string; location: string; status: string; price: number; image: string | null; createdAt: Date }[]
  unlockedCandidates: { seekerId: string; name: string; headline: string | null; sector: string | null; unlockedAt: Date }[]
}

// Business accounts: proving you are one, and the shop you get once you have.
//
// Verification is deliberately manual. A Business account carries a badge, a
// storefront and the right to run multibuy, so "I ticked the business box" is
// not enough — we ask for the same paperwork a bank would.

const socialsSchema = z.object({
  instagram: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  linkedin: z.string().max(200).optional(),
  x: z.string().max(200).optional(),
}).partial()

/** A url-safe shop address derived from the business name. */
function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'shop'
}

// Explicit shapes for the procedures below. Without these the router's inferred
// type grows deep enough that TypeScript gives up on client call sites with
// "Type instantiation is excessively deep".
export type StorefrontPublic = {
  shop: {
    id: string; userId: string; slug: string; template: string
    tagline: string | null; about: string | null; bannerUrl: string | null
    logoUrl: string | null; accentColour: string | null
    categories: string[]; featuredIds: string[]
    shippingPolicy: string | null; returnsPolicy: string | null; paymentPolicy: string | null
    published: boolean
  }
  seller: {
    id: string; name: string; avatar: string | null; grade: string
    verified: boolean; salesCount: number; memberSince: Date
  }
  followers: number
  rating: SellerScore
  listings: {
    id: string; title: string; price: number; images: string[]; location: string
    department: string; condition: string | null; status: string
    multibuyTiers: unknown; isFeatured: boolean; stock: number
    createdAt: Date; isGrabItNow: boolean
  }[]
}

export type VerificationStatusView = {
  status: string
  hasRegistration: boolean; hasModelo036: boolean; hasProofOfAddress: boolean
  legalName: string | null; taxId: string | null; website: string | null
  socials: unknown; rejectionReason: string | null; submittedAt: Date | null
  isBusiness: boolean; businessVerified: boolean; businessName: string | null
}

export type PendingVerification = {
  userId: string; status: string; legalName: string | null; taxId: string | null
  website: string | null; socials: unknown; submittedAt: Date | null
  hasRegistration: boolean; hasModelo036: boolean; hasProofOfAddress: boolean
  user: { id: string; displayName: string; email: string; businessName: string | null; createdAt: Date }
}

export type MyStorefront = {
  shop: StorefrontPublic['shop'] | null
  isBusiness: boolean; businessVerified: boolean; businessName: string | null
  memberStatus: string | null
}

export const businessRouter = router({
  // ── Verification ───────────────────────────────────────────────────────────
  verificationStatus: protectedProcedure.query(async ({ ctx }): Promise<VerificationStatusView> => {
    const [v, user] = await Promise.all([
      ctx.prisma.businessVerification.findUnique({ where: { userId: ctx.user.id } }),
      ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, businessVerified: true, businessName: true } }),
    ])
    return {
      status: v?.status ?? 'not_started',
      // Which documents are on file — never the paths themselves.
      hasRegistration: !!v?.registrationDocPath,
      hasModelo036: !!v?.modelo036DocPath,
      hasProofOfAddress: !!v?.proofOfAddressPath,
      legalName: v?.legalName ?? null,
      taxId: v?.taxId ?? null,
      website: v?.website ?? null,
      socials: v?.socials ?? null,
      rejectionReason: v?.rejectionReason ?? null,
      submittedAt: v?.submittedAt ?? null,
      isBusiness: user.isBusiness,
      businessVerified: user.businessVerified,
      businessName: user.businessName,
    }
  }),

  saveVerification: protectedProcedure
    .input(z.object({
      legalName: z.string().max(160).optional(),
      taxId: z.string().max(40).optional(),
      website: z.string().max(200).optional(),
      socials: socialsSchema.optional(),
      registrationDocPath: z.string().max(300).optional(),
      modelo036DocPath: z.string().max(300).optional(),
      proofOfAddressPath: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      const data = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
      await ctx.prisma.businessVerification.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...data },
        update: data,
      })
      return { ok: true }
    }),

  submitVerification: protectedProcedure.mutation(async ({ ctx }): Promise<{ ok: true }> => {
    const v = await ctx.prisma.businessVerification.findUnique({ where: { userId: ctx.user.id } })
    if (!v) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Fill in your business details first' })

    // A company files registration papers; an autónomo files a Modelo 036/037.
    // One or the other, plus proof of address — checked here so an incomplete
    // application never reaches the review queue.
    if (!v.registrationDocPath && !v.modelo036DocPath) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Upload your company registration, or your Modelo 036/037 if you trade as an autónomo' })
    }
    if (!v.proofOfAddressPath) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Upload a recent utility bill or invoice in the business name' })
    }
    if (!v.legalName?.trim()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Enter the registered business name' })
    }

    await ctx.prisma.businessVerification.update({
      where: { userId: ctx.user.id },
      data: { status: 'pending', submittedAt: new Date(), rejectionReason: null },
    })
    return { ok: true }
  }),

  // ── Admin review ───────────────────────────────────────────────────────────
  adminPending: execProcedure
    .input(z.object({ status: z.enum(['not_started', 'pending', 'approved', 'rejected']).optional() }))
    .query(async ({ ctx, input }): Promise<PendingVerification[]> => {
      const rows = await ctx.prisma.businessVerification.findMany({
        where: input.status ? { status: input.status } : { status: 'pending' },
        orderBy: { submittedAt: 'asc' },
        include: { user: { select: { id: true, displayName: true, email: true, businessName: true, createdAt: true } } },
      })
      // Document paths are never sent to the client — only whether each is on
      // file. Admins fetch a document through its own signed-URL route.
      return rows.map(r => ({
        userId: r.userId, status: r.status, legalName: r.legalName, taxId: r.taxId,
        website: r.website, socials: r.socials, submittedAt: r.submittedAt,
        hasRegistration: !!r.registrationDocPath,
        hasModelo036: !!r.modelo036DocPath,
        hasProofOfAddress: !!r.proofOfAddressPath,
        user: r.user,
      }))
    }),

  adminReview: execProcedure
    .input(z.object({
      userId: z.string().uuid(),
      decision: z.enum(['approved', 'rejected']),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      if (input.decision === 'rejected' && !input.reason?.trim()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A reason is required when rejecting an application' })
      }
      const approved = input.decision === 'approved'

      await ctx.prisma.$transaction([
        ctx.prisma.businessVerification.update({
          where: { userId: input.userId },
          data: {
            status: input.decision,
            reviewedAt: new Date(),
            rejectionReason: approved ? null : input.reason!.trim(),
          },
        }),
        // Approval is what actually grants the badge.
        ctx.prisma.user.update({
          where: { id: input.userId },
          data: { businessVerified: approved },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: input.userId,
            kind: 'system',
            title: approved ? '🏢 Business verified' : '🏢 Business application needs attention',
            body: approved
              ? 'Your business is verified. Your storefront, badge and multibuy pricing are now available.'
              : `We couldn't verify your business: ${input.reason!.trim()}`,
            actionUrl: '/account?tab=business',
          },
        }),
      ])
      return { ok: true }
    }),

  // Set the trading/business name. Used by the storefront editor (full business
  // accounts) and, for Business Light — who have no storefront — the editable
  // name field on the Business Hub. This is the name shown across Grabitt.
  setBusinessName: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, businessLight: true } })
      if (!user.isBusiness && !user.businessLight) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'A business name is a Business account feature' })
      }
      await ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { businessName: input.name.trim() } })
      return { ok: true as const, businessName: input.name.trim() }
    }),

  // ── Storefront ─────────────────────────────────────────────────────────────
  myStorefront: protectedProcedure.query(async ({ ctx }): Promise<MyStorefront> => {
    const [shop, user] = await Promise.all([
      ctx.prisma.storefront.findUnique({ where: { userId: ctx.user.id } }),
      ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, businessVerified: true, businessName: true, memberStatus: true } }),
    ])
    return { shop: shop as unknown as MyStorefront['shop'], ...user }
  }),

  upsertStorefront: protectedProcedure
    .input(z.object({
      template: z.enum(['classic', 'grid', 'showcase', 'minimal']).optional(),
      tagline: z.string().max(120).optional(),
      about: z.string().max(2000).optional(),
      bannerUrl: z.string().max(400).optional(),
      logoUrl: z.string().max(400).optional(),
      accentColour: z.string().max(20).optional(),
      categories: z.array(z.string().max(40)).max(20).optional(),
      featuredIds: z.array(z.string().uuid()).max(12).optional(),
      shippingPolicy: z.string().max(3000).optional(),
      returnsPolicy: z.string().max(3000).optional(),
      paymentPolicy: z.string().max(3000).optional(),
      published: z.boolean().optional(),
      slug: z.string().max(50).optional(),
    }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { isBusiness: true, businessName: true, memberStatus: true, charityRegName: true },
      })
      // Charity accounts get a storefront on the same footing as a business.
      if (!user.isBusiness && user.memberStatus !== 'charity') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'A storefront is a Business or Charity account feature' })
      }

      const { slug, ...rest } = input
      const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))

      const existing = await ctx.prisma.storefront.findUnique({ where: { userId: ctx.user.id } })
      // Returns only an acknowledgement — the client refetches — which keeps
      // this mutation out of the router's inferred type weight.
      if (existing) {
        // Changing the address would break every link already shared, so it's
        // only settable while the shop is unpublished.
        if (slug && slug !== existing.slug) {
          if (existing.published) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unpublish the shop before changing its web address' })
          }
          const taken = await ctx.prisma.storefront.findUnique({ where: { slug: slugify(slug) } })
          if (taken) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That web address is already taken' })
          Object.assign(data, { slug: slugify(slug) })
        }
        await ctx.prisma.storefront.update({ where: { userId: ctx.user.id }, data })
        return { ok: true as const }
      }

      // First save: derive a free address from the business/charity name.
      const baseName = user.businessName || user.charityRegName || 'shop'
      let candidate = slugify(slug || baseName)
      for (let n = 2; await ctx.prisma.storefront.findUnique({ where: { slug: candidate } }); n++) {
        candidate = `${slugify(slug || baseName)}-${n}`
      }
      await ctx.prisma.storefront.create({ data: { userId: ctx.user.id, slug: candidate, ...data } })
      return { ok: true as const }
    }),

  // The public shop page.
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().max(60) }))
    .query(async ({ ctx, input }): Promise<StorefrontPublic> => {
      const shop = await ctx.prisma.storefront.findUnique({
        where: { slug: input.slug },
        include: {
          user: {
            select: {
              id: true, displayName: true, businessName: true, avatar: true, grade: true,
              avgRating: true, salesCount: true, isVerified: true, businessVerified: true, createdAt: true,
            },
          },
        },
      })
      if (!shop || !shop.published) throw new TRPCError({ code: 'NOT_FOUND', message: 'Shop not found' })

      const [listings, followers, score] = await Promise.all([
        ctx.prisma.listing.findMany({
          where: { sellerId: shop.userId, status: { in: ['active', 'grab_it_now'] } },
          orderBy: { createdAt: 'desc' },
          take: 120,
          select: {
            id: true, title: true, price: true, images: true, location: true, department: true,
            condition: true, status: true, grabItNowUntil: true, multibuyTiers: true,
            isFeatured: true, stock: true, createdAt: true,
          },
        }),
        ctx.prisma.following.count({ where: { followingId: shop.userId } }).catch(() => 0),
        sellerScoreFor(ctx.prisma, shop.userId),
      ])

      return {
        shop: { ...shop, user: undefined } as unknown as StorefrontPublic['shop'],
        seller: {
          id: shop.user.id,
          name: shop.user.businessName || shop.user.displayName,
          avatar: shop.user.avatar,
          grade: shop.user.grade,
          verified: shop.user.isVerified || shop.user.businessVerified,
          salesCount: shop.user.salesCount,
          memberSince: shop.user.createdAt,
        },
        followers,
        rating: score,
        listings: listings.map((l: typeof listings[number]) => ({
          ...l,
          price: Number(l.price),
          isGrabItNow: !!l.grabItNowUntil && l.grabItNowUntil > new Date(),
        })) as unknown as StorefrontPublic['listings'],
      }
    }),

  // Everything a business has posted or paid to reveal: their job adverts, their
  // property listings, and the candidate CVs they've unlocked with credits.
  myPostings: protectedProcedure
    .query(async ({ ctx }): Promise<BusinessPostings> => {
      const [jobs, properties, unlocks] = await Promise.all([
        ctx.prisma.listing.findMany({
          where: { sellerId: ctx.user.id, department: 'jobs' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, location: true, status: true, createdAt: true, jobListing: { select: { _count: { select: { applications: true } } } } },
        }),
        ctx.prisma.listing.findMany({
          where: { sellerId: ctx.user.id, department: 'property' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, location: true, status: true, price: true, images: true, createdAt: true },
        }),
        ctx.prisma.candidateUnlock.findMany({
          where: { employerId: ctx.user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, seeker: { select: { id: true, displayName: true, seekerProfile: { select: { headline: true, sector: true } } } } },
        }),
      ])
      return {
        jobs: jobs.map(j => ({ id: j.id, title: j.title, location: j.location, status: j.status, applications: j.jobListing?._count.applications ?? 0, createdAt: j.createdAt })),
        properties: properties.map(p => ({ id: p.id, title: p.title, location: p.location, status: p.status, price: Number(p.price), image: Array.isArray(p.images) ? (p.images[0] ?? null) : null, createdAt: p.createdAt })),
        unlockedCandidates: unlocks.map(u => ({ seekerId: u.seeker.id, name: u.seeker.displayName, headline: u.seeker.seekerProfile?.headline ?? null, sector: u.seeker.seekerProfile?.sector ?? null, unlockedAt: u.createdAt })),
      }
    }),

  // Admin: set a member's business level (grade) and/or an absolute per-account
  // fee override. Pass feeOverridePct: null to clear the override.
  setAccountLevel: execProcedure
    .input(z.object({
      userId: z.string(),
      grade: z.enum(['grabber', 'dealer', 'trader', 'pro']).optional(),
      isBusiness: z.boolean().optional(),
      feeOverridePct: z.number().min(0).max(100).nullable().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          ...(input.grade ? { grade: input.grade } : {}),
          ...(input.isBusiness != null ? { isBusiness: input.isBusiness } : {}),
          ...(input.feeOverridePct !== undefined ? { feeOverridePct: input.feeOverridePct } : {}),
        },
      })
    ),

  // The shop's rating, and what moved it.
  sellerRating: publicProcedure
    .input(z.object({ sellerId: z.string().uuid() }))
    .query(({ ctx, input }): Promise<SellerScore> => sellerScoreFor(ctx.prisma, input.sellerId)),

  // Business tier status: the level held, the fee, this month's listing usage
  // against the tier allowances, and progress toward the next level. Doubles as
  // the lazy reconcile point — every time a business opens their account we
  // re-check the trailing-90-day criteria and promote OR demote accordingly, so
  // a business that stops maintaining its numbers slips back a level.
  tierStatus: protectedProcedure
    .query(async ({ ctx }): Promise<BusinessTierStatus> => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, grade: true, avgRating: true, isBusiness: true },
      })
      if (!user?.isBusiness) return { isBusiness: false } as BusinessTierStatus

      const now = new Date()
      const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const [sales90d, ratingCount, itemsUsed, jobsUsed, propertyUsed] = await Promise.all([
        ctx.prisma.transaction.count({ where: { sellerId: user.id, status: { in: ['completed', 'released'] }, createdAt: { gte: since90 } } }),
        ctx.prisma.review.count({ where: { subjectId: user.id } }),
        // Items = everything the seller listed this month that is NOT a job or property post.
        ctx.prisma.listing.count({ where: { sellerId: user.id, createdAt: { gte: monthStart }, department: { notIn: ['jobs', 'property'] } } }),
        ctx.prisma.jobListing.count({ where: { listing: { sellerId: user.id }, createdAt: { gte: monthStart } } }),
        ctx.prisma.propertyListing.count({ where: { listing: { sellerId: user.id }, createdAt: { gte: monthStart } } }),
      ])

      const rating = Number(user.avgRating ?? 0)
      const target = qualifyingBusinessGrade(sales90d, rating)
      // Reconcile the stored grade if the qualifying tier has changed. Never drop
      // below dealer (Business) while the account is a business.
      if (target !== user.grade && ['dealer', 'trader', 'pro'].includes(user.grade)) {
        const up = BUSINESS_TIER_ORDER.indexOf(target) > BUSINESS_TIER_ORDER.indexOf(user.grade as BusinessGrade)
        await ctx.prisma.user.update({ where: { id: user.id }, data: { grade: target } })
        await ctx.prisma.notification.create({
          data: {
            userId: user.id,
            kind: up ? 'grade_upgrade' : 'grade_downgrade',
            title: up ? `Upgraded to ${BUSINESS_TIERS[target].label}!` : `Moved to ${BUSINESS_TIERS[target].label}`,
            body: up
              ? `You now pay just ${(BUSINESS_TIERS[target].feeRate * 100).toFixed(1).replace('.0', '')}% on item sales and get a bigger listing allowance.`
              : `Your trailing 90-day sales no longer meet the criteria for your previous tier. Keep selling to climb back up.`,
          },
        }).catch(() => {})
      }
      const grade = target as BusinessGrade
      const tier = BUSINESS_TIERS[grade]
      const nextGrade = BUSINESS_TIER_ORDER[BUSINESS_TIER_ORDER.indexOf(grade) + 1] as BusinessGrade | undefined
      const next = nextGrade ? BUSINESS_TIERS[nextGrade] : null

      return {
        isBusiness: true,
        grade,
        label: tier.label,
        feePct: tier.feeRate * 100,
        caps: tier.caps,
        usage: { items: itemsUsed, jobs: jobsUsed, property: propertyUsed },
        sales90d,
        rating,
        ratingCount,
        next: next ? { label: next.label, feePct: next.feeRate * 100, needSales: next.criteria.sales90d, needRating: next.criteria.rating } : null,
        // Are they at risk of dropping? True when they hold a tier above the one
        // their current numbers qualify for (only possible transiently before
        // this reconcile runs, but also surfaced as "keep it up" guidance).
        maintaining: true,
      }
    }),
})

// Gathers the real signals behind a shop's rating: reviews, disputes and how
// quickly they reply.
async function sellerScoreFor(prisma: typeof import('../db').prisma, sellerId: string): Promise<SellerScore> {
  const [user, reviews, disputes, lost, threads] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: sellerId }, select: { avgRating: true, salesCount: true } }),
    prisma.review.count({ where: { subjectId: sellerId } }),
    prisma.dispute.count({ where: { transaction: { sellerId } } }),
    prisma.dispute.count({ where: { transaction: { sellerId }, status: 'resolved_buyer' } }),
    prisma.thread.findMany({
      where: { participants: { some: { userId: sellerId } } },
      select: { id: true, messages: { orderBy: { createdAt: 'asc' }, select: { senderId: true, createdAt: true } } },
      take: 200,
    }),
  ])

  // For each conversation, how long the seller took to reply to the first
  // message that wasn't theirs.
  const gaps: number[] = []
  let within24h = 0
  for (const t of threads) {
    const firstIn = t.messages.find(m => m.senderId !== sellerId)
    if (!firstIn) continue
    const reply = t.messages.find(m => m.senderId === sellerId && m.createdAt > firstIn.createdAt)
    if (!reply) continue
    const mins = (reply.createdAt.getTime() - firstIn.createdAt.getTime()) / 60000
    gaps.push(mins)
    if (mins <= 1440) within24h++
  }
  gaps.sort((a, b) => a - b)
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null

  return scoreSeller({
    avgRating: user.avgRating,
    reviewCount: reviews,
    salesCount: user.salesCount,
    disputesTotal: disputes,
    disputesLostBySeller: lost,
    medianResponseMins: median,
    repliedWithin24h: within24h,
    threadsTotal: gaps.length,
  })
}
