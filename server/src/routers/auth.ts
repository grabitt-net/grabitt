import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { prisma } from '../db'
import { RegisterInputSchema } from '@grabitt/types'
import { PRICES } from '@grabitt/design-tokens'

// SECURITY (§ auth): Identity is owned by Supabase Auth.
// - Consumers sign in via Supabase (email/password or OAuth) on the client.
// - The web app derives the tRPC/exec identity server-side in app/admin/page.tsx,
//   only AFTER validating the Supabase session and the is_admin flag.
// This router therefore MUST NOT mint app JWTs from an unauthenticated email
// lookup. The previous login/execLogin did exactly that (no password check),
// which allowed anyone to impersonate any user or exec. They are removed.

export const authRouter = router({
  // Provisions the Prisma profile row that mirrors a freshly-created Supabase user.
  // Requires a verified Supabase user id — never issues a session token itself.
  provisionProfile: publicProcedure
    .input(RegisterInputSchema.extend({ supabaseId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email: input.email }, { supabaseId: input.supabaseId }] },
      })
      if (existing) return { user: existing, created: false }

      const user = await prisma.user.create({
        data: {
          supabaseId: input.supabaseId,
          email: input.email,
          displayName: input.displayName,
          locale: input.locale,
          credits: PRICES.registrationBonus,
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
