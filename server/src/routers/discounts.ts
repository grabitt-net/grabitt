import { z } from 'zod'
import { router, execProcedure, protectedProcedure } from '../trpc'
import { validateDiscount } from '../lib/discounts'

// The checkout flows a code can be scoped to.
export const DISCOUNT_KINDS = [
  'all', 'listing_publish', 'listing_promo', 'business_upgrade', 'handy_place',
  'handy_unlock', 'job', 'property', 'cv_unlock', 'sponsorship', 'directory', 'credit_pack',
] as const

const rand = (n: number) => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < n; i++) s += A[Math.floor(Math.random() * A.length)]
  return s
}

export const discountsRouter = router({
  // Admin: every code with its redemption count.
  list: execProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } })
    return rows
  }),

  // Admin: create or edit a code. If no code is supplied on create, one is
  // generated. The code is always stored uppercase.
  upsert: execProcedure
    .input(z.object({
      id: z.string().optional(),
      code: z.string().max(40).regex(/^[A-Za-z0-9-]*$/,'letters, numbers and hyphens only').optional(),
      description: z.string().max(200).nullish(),
      percentOff: z.number().int().min(1).max(100).nullish(),
      amountOffCents: z.number().int().min(1).max(1_000_000).nullish(),
      startsAt: z.string().datetime().nullish(),
      endsAt: z.string().datetime().nullish(),
      active: z.boolean().default(true),
      maxUses: z.number().int().min(1).nullish(),
      oncePerCustomer: z.boolean().default(true),
      appliesTo: z.array(z.string()).default([]),
      categories: z.array(z.string()).default([]),
      isTest: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, code, startsAt, endsAt, ...rest } = input
      const data = {
        ...rest,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      }
      if (id) {
        return ctx.prisma.discountCode.update({ where: { id }, data })
      }
      // New code — use the supplied code or generate a unique one.
      let finalCode = (code ?? '').trim().toUpperCase()
      if (!finalCode) {
        do { finalCode = `GRAB-${rand(6)}` } while (await ctx.prisma.discountCode.findUnique({ where: { code: finalCode }, select: { id: true } }))
      } else if (await ctx.prisma.discountCode.findUnique({ where: { code: finalCode }, select: { id: true } })) {
        throw new Error('That code already exists')
      }
      return ctx.prisma.discountCode.create({ data: { ...data, code: finalCode } })
    }),

  remove: execProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.prisma.discountCode.delete({ where: { id: input.id } })),

  // Admin: redemptions for one code (who used it, when, how much).
  redemptions: execProcedure
    .input(z.object({ codeId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.discountRedemption.findMany({ where: { codeId: input.codeId }, orderBy: { createdAt: 'desc' }, take: 200 })
    ),

  // Customer-facing: preview whether a code applies to a purchase, without
  // redeeming it. Used to show "code applied — €X off" before checkout.
  validate: protectedProcedure
    .input(z.object({ code: z.string().max(40), kind: z.string(), category: z.string().nullish(), amountCents: z.number().int().min(0) }))
    .query(async ({ ctx, input }) => {
      const res = await validateDiscount(ctx.prisma, { code: input.code, userId: ctx.user.id, kind: input.kind, category: input.category ?? null, amountCents: input.amountCents })
      if (!res.ok) return { valid: false as const, reason: res.reason }
      return { valid: true as const, code: res.code, discountCents: res.discountCents, finalCents: Math.max(0, input.amountCents - res.discountCents) }
    }),
})
