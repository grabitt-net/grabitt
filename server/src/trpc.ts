import { initTRPC, TRPCError } from '@trpc/server'
import { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  // A GDPR-erased account must lose access immediately. The JWT stays valid
  // until it expires, so a token check alone isn't enough — verify the account
  // still exists and hasn't been erased. (Indexed primary-key lookup.)
  const account = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { deletedAt: true },
  })
  if (!account || account.deletedAt) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'This account has been deleted' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const execProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.execUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Exec access required' })
  }
  return next({ ctx: { ...ctx, execUser: ctx.execUser } })
})
