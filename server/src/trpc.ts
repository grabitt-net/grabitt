import { initTRPC, TRPCError } from '@trpc/server'
import { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  // An erased or suspended account must lose access immediately. The JWT stays
  // valid until it expires, so a token check alone isn't enough — verify the
  // account state on each call. (Indexed primary-key lookup.)
  const account = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { deletedAt: true, suspendedUntil: true, suspendedReason: true },
  })
  if (!account || account.deletedAt) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'This account has been deleted' })
  }
  if (account.suspendedUntil && account.suspendedUntil > new Date()) {
    const until = account.suspendedUntil.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Your account is suspended until ${until}${account.suspendedReason ? ` — ${account.suspendedReason}` : ''}. Contact support@grabitt.net if you believe this is a mistake.`,
    })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const execProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.execUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Exec access required' })
  }
  return next({ ctx: { ...ctx, execUser: ctx.execUser } })
})
