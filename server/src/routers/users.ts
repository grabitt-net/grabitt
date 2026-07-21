import { z } from 'zod'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { makeReferralCode } from './auth'
import { PRICES } from '@grabitt/design-tokens'
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
    const [active, sold, unread, offers, saved] = await Promise.all([
      ctx.prisma.listing.count({ where: { sellerId: uid, status: 'active' } }),
      ctx.prisma.listing.count({ where: { sellerId: uid, status: 'sold' } }),
      ctx.prisma.message.count({ where: { senderId: { not: uid }, readAt: null, thread: { participants: { some: { userId: uid } } } } }),
      ctx.prisma.offer.count({ where: { status: 'pending', listing: { sellerId: uid } } }),
      ctx.prisma.wishlistItem.count({ where: { userId: uid } }),
    ])
    return { active, sold, unread, offers, saved }
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
      avatar: z.string().url().optional(),
      locale: z.enum(['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt']).optional(),
      interests: z.array(z.string()).max(20).optional(),
      phone: z.string().max(40).optional(),
      collectionAddress: z.string().max(400).optional(),
      marketingConsent: z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { marketingConsent, ...rest } = input
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...rest,
          // Stamp when consent was given — GDPR requires us to evidence it.
          ...(marketingConsent !== undefined
            ? { marketingConsent, marketingConsentAt: marketingConsent ? new Date() : null }
            : {}),
        },
      })
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
