import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'
import { BUSINESS_TIERS, businessTierForGrade } from '@grabitt/design-tokens'

// Monthly listing allowances for Business accounts. Each tier includes a set
// number of item / job / property listings per calendar month; once the tier
// allowance is used up the business can keep listing by spending listing
// credits (1 credit = 1 extra listing). Personal accounts are governed by the
// separate grade LISTING_CAPS (items only) and are not limited here.
export type ListingKind = 'items' | 'jobs' | 'property'

const CREDIT_PER_EXTRA_LISTING = 1

const KIND_LABEL: Record<ListingKind, string> = { items: 'item', jobs: 'job', property: 'property' }

/**
 * Enforce a Business account's monthly allowance for the given listing kind.
 * Within allowance: no-op. Over allowance: spends one listing credit if the
 * business has any (recording a CreditEvent), otherwise throws FORBIDDEN telling
 * them to top up. No-op for non-business accounts.
 */
export async function enforceBusinessListingAllowance(
  prisma: PrismaClient,
  userId: string,
  kind: ListingKind,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBusiness: true, grade: true, credits: true },
  })
  if (!user?.isBusiness) return

  const cap = businessTierForGrade(user.grade).caps[kind]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const used = kind === 'items'
    ? await prisma.listing.count({ where: { sellerId: userId, createdAt: { gte: monthStart }, department: { notIn: ['jobs', 'property'] } } })
    : kind === 'jobs'
      ? await prisma.jobListing.count({ where: { listing: { sellerId: userId }, createdAt: { gte: monthStart } } })
      : await prisma.propertyListing.count({ where: { listing: { sellerId: userId }, createdAt: { gte: monthStart } } })

  if (used < cap) return

  // Over the monthly allowance — fall back to listing credits.
  if ((user.credits ?? 0) < CREDIT_PER_EXTRA_LISTING) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You’ve used all ${cap} ${KIND_LABEL[kind]} listings included with your ${businessTierForGrade(user.grade).label} plan this month. Buy listing credits to add more, or upgrade your level.`,
    })
  }
  const newBalance = (user.credits ?? 0) - CREDIT_PER_EXTRA_LISTING
  await prisma.user.update({ where: { id: userId }, data: { credits: newBalance } })
  await prisma.creditEvent.create({
    data: {
      userId, kind: 'extra_listing', delta: -CREDIT_PER_EXTRA_LISTING, balance: newBalance,
      note: `Extra ${KIND_LABEL[kind]} listing beyond ${businessTierForGrade(user.grade).label} monthly allowance`,
    },
  }).catch(() => {})
}

// Re-exported so callers can reference the caps without a second import.
export { BUSINESS_TIERS }
