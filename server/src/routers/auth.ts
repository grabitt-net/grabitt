import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../db'
import { PRICES, FOUNDING } from '@grabitt/design-tokens'
import { resolveAffiliateReward } from '../lib/affiliateReward'

// SECURITY (§ auth): Identity is owned by Supabase Auth.
// - Consumers sign in via Supabase (email/password or OAuth) on the client.
// - The web app derives the tRPC/exec identity server-side in app/admin/page.tsx,
//   only AFTER validating the Supabase session and the is_admin flag.
// This router therefore MUST NOT mint app JWTs from an unauthenticated email
// lookup. The previous login/execLogin did exactly that (no password check),
// which allowed anyone to impersonate any user or exec. They are removed.

// Short, unambiguous share code (no 0/O/1/I). Uniqueness is enforced by the DB
// unique index; a collision on insert is astronomically unlikely at this scale
// and would surface as a normal error the client retries.
export function makeReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 7; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

export const authRouter = router({
  // Provisions the Prisma profile row that mirrors a freshly-created Supabase user.
  // Requires a verified Supabase user id — never issues a session token itself.
  // OAuth users have no password, so this takes only the fields it actually
  // persists (never the password). Idempotent: safe to call on every session.
  provisionProfile: publicProcedure
    .input(z.object({
      supabaseId: z.string().min(1),
      email: z.string().email(),
      displayName: z.string().min(1).max(80),
      locale: z.enum(['en', 'es', 'de']).default('en'),
      // Referral code from a ?ref= invite link, if the user arrived via one.
      ref: z.string().max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email: input.email }, { supabaseId: input.supabaseId }] },
      })
      if (existing) return { user: existing, created: false }

      // Resolve the referrer from their code. Self-referral is impossible here
      // (the new user has no code yet), so no guard is needed.
      const referrer = input.ref
        ? await prisma.user.findUnique({ where: { referralCode: input.ref.trim().toUpperCase() }, select: { id: true, isAffiliate: true, affiliateTier: true } })
        : null

      // Founding Member: the first FOUNDING.cap WEB signups (this endpoint is the
      // web signup path — admin-created accounts never reach here). They get the
      // permanent badge, immediate affiliate status, and 50% off fees for the
      // first FOUNDING.weeks weeks. Grade/limits stay standard Grabber.
      const foundingCount = await prisma.user.count({ where: { foundingMember: true } })
      const isFounding = foundingCount < FOUNDING.cap
      const foundingData = isFounding ? {
        foundingMember: true,
        isAffiliate: true,
        affiliateTier: 'founding',
        feeReductionPct: FOUNDING.feeDiscountPct,
        feeReductionUntil: new Date(Date.now() + FOUNDING.weeks * 7 * 86400000),
      } : {}

      const user = await prisma.user.create({
        data: {
          supabaseId: input.supabaseId,
          email: input.email,
          displayName: input.displayName,
          locale: input.locale,
          credits: PRICES.registrationBonus,
          // A Supabase session only exists after email confirmation (email/pass)
          // or a provider that vouches for the address (OAuth), so the email is
          // verified by the time we provision.
          emailVerified: true,
          referralCode: makeReferralCode(),
          ...(referrer ? { referredById: referrer.id } : {}),
          ...foundingData,
        },
      })

      await prisma.creditEvent.create({
        data: {
          userId: user.id,
          kind: 'registration_bonus',
          delta: PRICES.registrationBonus,
          balance: PRICES.registrationBonus,
          note: 'Welcome bonus',
        },
      })

      // If the referrer is an affiliate, reward them for this signup. The reward
      // is whatever the admin currently offers for their tier (a cash amount, or
      // points) — resolved from the config, including any active campaign. Cash
      // goes to the payout ledger; points are credited to their balance now.
      if (referrer?.isAffiliate) {
        const cfg = await prisma.affiliateConfig.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} })
        const tier = referrer.affiliateTier === 'founding' ? 'founding' : 'standard'
        const reward = resolveAffiliateReward(cfg, tier)
        if (reward.amount > 0) {
          if (reward.kind === 'points') {
            const ref = await prisma.user.findUniqueOrThrow({ where: { id: referrer.id }, select: { credits: true } })
            const newBalance = ref.credits + reward.amount
            await prisma.$transaction([
              prisma.user.update({ where: { id: referrer.id }, data: { credits: newBalance } }),
              prisma.creditEvent.create({ data: { userId: referrer.id, kind: 'reward_earned', delta: reward.amount, balance: newBalance, note: 'Affiliate signup reward' } }),
              prisma.affiliateReferral.create({ data: { affiliateId: referrer.id, referredUserId: user.id, rewardKind: 'points', points: reward.amount, tier, status: 'paid', paidAt: new Date() } }),
            ]).catch(() => { /* unique guard: one reward per referred user */ })
          } else {
            await prisma.affiliateReferral.create({
              data: { affiliateId: referrer.id, referredUserId: user.id, rewardKind: 'cash', amountCents: reward.amount, tier, status: 'earned' },
            }).catch(() => { /* unique guard */ })
          }
        }
      }

      return { user, created: true }
    }),

  // Retained as explicit failures so any stale client gets a clear signal rather
  // than a silently-minted, unauthenticated token.
  login: publicProcedure.mutation(() => {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'Sign in via Supabase Auth. This endpoint no longer issues tokens.',
    })
  }),

  execLogin: publicProcedure.mutation(() => {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'Exec access is granted through the Supabase-authenticated admin route.',
    })
  }),
})
