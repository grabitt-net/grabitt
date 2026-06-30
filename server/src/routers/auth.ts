import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, execProcedure } from '../trpc'
import { prisma } from '../db'
import { signConsumerJwt, signExecJwt } from '../middleware/auth'
import { RegisterInputSchema, LoginInputSchema } from '@grabitt/types'
import { PRICES } from '@grabitt/design-tokens'

export const authRouter = router({
  register: publicProcedure
    .input(RegisterInputSchema)
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findUnique({ where: { email: input.email } })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' })

      const supabaseId = input.email // replaced by actual Supabase auth flow
      const user = await prisma.user.create({
        data: {
          supabaseId,
          email: input.email,
          displayName: input.displayName,
          locale: input.locale,
          credits: PRICES.registrationBonus,
        },
      })

      // Registration bonus credit event
      await prisma.creditEvent.create({
        data: {
          userId: user.id,
          kind: 'registration_bonus',
          delta: PRICES.registrationBonus,
          balance: PRICES.registrationBonus,
          note: 'Welcome bonus',
        },
      })

      const token = signConsumerJwt({ id: user.id, grade: user.grade })
      return { token, user }
    }),

  login: publicProcedure
    .input(LoginInputSchema)
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { email: input.email } })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
      const token = signConsumerJwt({ id: user.id, grade: user.grade })
      return { token, user }
    }),

  execLogin: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const execUser = await prisma.execUser.findUnique({ where: { email: input.email } })
      if (!execUser) throw new TRPCError({ code: 'UNAUTHORIZED' })
      // 4-hour session, no silent refresh
      const token = signExecJwt({ id: execUser.id, role: execUser.role })
      return { token, execUser }
    }),
})
