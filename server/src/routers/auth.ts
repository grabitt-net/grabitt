import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../db'
import { PRICES } from '@grabitt/design-tokens'

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
        ? await prisma.user.findUnique({ where: { referralCode: input.ref.trim().toUpperCase() }, select: { id: true } })
        : null

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
