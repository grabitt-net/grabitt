import type { PrismaClient } from '@prisma/client'

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
