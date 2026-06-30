import { initTRPC, TRPCError } from '@trpc/server'
import { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const execProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.execUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Exec access required' })
  }
  return next({ ctx: { ...ctx, execUser: ctx.execUser } })
})
