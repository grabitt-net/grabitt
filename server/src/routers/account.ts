import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { signConsumerJwt } from '../middleware/auth'

// In-app account switching. A user can hold more than one Grabitt identity — for
// example a personal account linked to its business account — and hop between
// them without logging out. Links are mutual (each account lists the others),
// and switching only ever mints a token for an account already linked to the
// caller, so one member can never assume an unrelated account.

const label = (u: { businessName: string | null; displayName: string; memberStatus: string | null }) =>
  u.businessName?.trim() || u.displayName

const kindOf = (u: { isBusiness: boolean; memberStatus: string | null }) =>
  u.memberStatus === 'charity' ? 'charity' : u.isBusiness ? 'business' : 'personal'

export const accountRouter = router({
  // The caller's own account plus every account it can switch into, each with a
  // display label and kind so the switcher can render them.
  linked: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { id: true, displayName: true, businessName: true, avatar: true, isBusiness: true, memberStatus: true, linkedAccountIds: true },
    })
    const others = me.linkedAccountIds.length
      ? await ctx.prisma.user.findMany({
          where: { id: { in: me.linkedAccountIds }, deletedAt: null },
          select: { id: true, displayName: true, businessName: true, avatar: true, isBusiness: true, memberStatus: true },
        })
      : []
    const toRow = (u: typeof others[number] | typeof me, current: boolean) => ({
      id: u.id, label: label(u), kind: kindOf(u), avatar: u.avatar, current,
    })
    return { accounts: [toRow(me, true), ...others.map(u => toRow(u, false))] }
  }),

  // Mint an app token for a linked account so the client can switch to it.
  // Authorised only when the target is in the caller's linked list.
  switchTo: protectedProcedure
    .input(z.object({ targetId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.targetId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already on that account' })
      }
      const me = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { linkedAccountIds: true },
      })
      if (!me.linkedAccountIds.includes(input.targetId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'That account is not linked to yours' })
      }
      const target = await ctx.prisma.user.findUnique({
        where: { id: input.targetId },
        select: { id: true, grade: true, deletedAt: true, linkedAccountIds: true },
      })
      if (!target || target.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })
      // Defence in depth: the link must be mutual.
      if (!target.linkedAccountIds.includes(ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'That account is not linked to yours' })
      }
      const token = signConsumerJwt({ id: target.id, grade: target.grade })
      return { token, userId: target.id }
    }),
})
