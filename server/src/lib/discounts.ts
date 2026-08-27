import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Applying a promo code at checkout. `kind` is the checkout flow (e.g.
// 'business_upgrade', 'listing_publish'); `category` is the item department slug
// where relevant. Returns the discount to subtract, or a reason it can't apply.

export type DiscountContext = {
  code: string
  userId: string
  kind: string
  category?: string | null
  amountCents: number
}

export type DiscountResult =
  | { ok: true; codeId: string; code: string; discountCents: number; isTest: boolean }
  | { ok: false; reason: string }

export async function validateDiscount(prisma: PrismaClient, ctx: DiscountContext): Promise<DiscountResult> {
  const code = ctx.code.trim().toUpperCase()
  if (!code) return { ok: false, reason: 'Enter a code' }

  const dc = await prisma.discountCode.findUnique({ where: { code } })
  if (!dc || !dc.active) return { ok: false, reason: 'That code isn’t valid' }

  const now = new Date()
  if (dc.startsAt && dc.startsAt > now) return { ok: false, reason: 'This code isn’t active yet' }
  if (dc.endsAt && dc.endsAt < now) return { ok: false, reason: 'This code has expired' }
  if (dc.maxUses != null && dc.usedCount >= dc.maxUses) return { ok: false, reason: 'This code has been fully used' }

  if (dc.oncePerCustomer) {
    const used = await prisma.discountRedemption.findFirst({ where: { codeId: dc.id, userId: ctx.userId }, select: { id: true } })
    if (used) return { ok: false, reason: 'You’ve already used this code' }
  }

  const appliesTo = dc.appliesTo ?? []
  if (appliesTo.length > 0 && !appliesTo.includes('all') && !appliesTo.includes(ctx.kind)) {
    return { ok: false, reason: 'This code can’t be used here' }
  }

  // Category restriction applies only to item-listing flows.
  const cats = dc.categories ?? []
  if (cats.length > 0 && ctx.category && !cats.includes(ctx.category)) {
    return { ok: false, reason: 'This code isn’t valid for that category' }
  }

  let discountCents = 0
  if (dc.percentOff != null && dc.percentOff > 0) discountCents = Math.round((ctx.amountCents * dc.percentOff) / 100)
  else if (dc.amountOffCents != null) discountCents = dc.amountOffCents
  discountCents = Math.max(0, Math.min(discountCents, ctx.amountCents))

  return { ok: true, codeId: dc.id, code, discountCents, isTest: dc.isTest }
}

// Reusable helper for a one-off (payment-mode) checkout: validate an optional
// code, return the discount to subtract and the Stripe metadata to attach (so
// the webhook records the redemption). Throws a user-facing error on an invalid
// code, or when the discounted total would fall below Stripe's €0.50 minimum.
const STRIPE_MIN_CENTS = 50
export async function applyPromo(
  prisma: PrismaClient,
  code: string | undefined | null,
  userId: string,
  kind: string,
  amountCents: number,
  category?: string | null,
): Promise<{ codeId: string | null; discountCents: number; meta: Record<string, string> }> {
  if (!code || !code.trim()) return { codeId: null, discountCents: 0, meta: {} }
  const res = await validateDiscount(prisma, { code, userId, kind, category: category ?? null, amountCents })
  if (!res.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: res.reason })
  if (res.discountCents <= 0) return { codeId: null, discountCents: 0, meta: {} }
  const finalCents = amountCents - res.discountCents
  if (finalCents < STRIPE_MIN_CENTS) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The discounted amount is below Stripe’s €0.50 minimum for this purchase — use a code that leaves at least €0.50.' })
  }
  return {
    codeId: res.codeId,
    discountCents: res.discountCents,
    meta: { discountCodeId: res.codeId, discountCents: String(res.discountCents), originalCents: String(amountCents), discountUserId: userId },
  }
}

// Record a redemption and bump the code's used count. Call after a successful
// (or free) checkout.
export async function recordRedemption(
  prisma: PrismaClient,
  args: { codeId: string; userId: string; appliedTo: string; originalCents: number; discountCents: number },
) {
  await prisma.$transaction([
    prisma.discountRedemption.create({ data: args }),
    prisma.discountCode.update({ where: { id: args.codeId }, data: { usedCount: { increment: 1 } } }),
  ])
}
