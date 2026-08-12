import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'
import { BUSINESS_TIERS, businessTierForGrade, MEMBER_STATUSES, BUSINESS_LIGHT } from '@grabitt/design-tokens'

// A business is "on trial" while its subscription is still trialing. During the
// trial the account is capped at the free (Business Light) allowance; the full
// tier caps only unlock once the trial ends and billing begins.
async function isOnBusinessTrial(prisma: PrismaClient, userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({ where: { userId, status: 'trialing' }, select: { id: true } })
  return !!sub
}

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
    select: { isBusiness: true, grade: true, credits: true, memberStatus: true },
  })
  if (!user?.isBusiness) return

  // During the free trial, cap at the free (Business Light) allowance — the full
  // tier caps only apply once billing starts. Otherwise use the tier caps (with
  // the larger charity item allowance where applicable).
  const onTrial = await isOnBusinessTrial(prisma, userId)
  const planLabel = onTrial ? `${BUSINESS_LIGHT.label} (free trial)` : businessTierForGrade(user.grade).label
  const cap = onTrial
    ? BUSINESS_LIGHT.caps[kind]
    : (kind === 'items' && user.memberStatus === 'charity')
      ? MEMBER_STATUSES.charity.listingCap
      : businessTierForGrade(user.grade).caps[kind]
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
      message: onTrial
        ? `Your free trial includes ${cap} ${KIND_LABEL[kind]} listing${cap === 1 ? '' : 's'} a month — the full allowance unlocks when your trial ends. Buy listing credits to add more now.`
        : `You’ve used all ${cap} ${KIND_LABEL[kind]} listings included with your ${planLabel} plan this month. Buy listing credits to add more, or upgrade your level.`,
    })
  }
  const newBalance = (user.credits ?? 0) - CREDIT_PER_EXTRA_LISTING
  await prisma.user.update({ where: { id: userId }, data: { credits: newBalance } })
  await prisma.creditEvent.create({
    data: {
      userId, kind: 'extra_listing', delta: -CREDIT_PER_EXTRA_LISTING, balance: newBalance,
      note: `Extra ${KIND_LABEL[kind]} listing beyond ${planLabel} monthly allowance`,
    },
  }).catch(() => {})
}

/**
 * Flat overflow fee (in cents) for a jobs/property listing beyond the business's
 * monthly allowance. Returns 0 within allowance or for non-business accounts.
 * Callers gate publishing on payment when this is > 0. (Replaces the old
 * credit-spend model for jobs & property per the revenue model.)
 */
export async function overflowFeeCents(
  prisma: PrismaClient,
  userId: string,
  kind: 'jobs' | 'property',
  feeCents: number,
): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBusiness: true, grade: true } })
  if (!user?.isBusiness) return 0
  // On trial the free-tier cap applies (0 for jobs/property), so overflow is due
  // from the first one; the included allowance unlocks after the trial.
  const cap = (await isOnBusinessTrial(prisma, userId)) ? BUSINESS_LIGHT.caps[kind] : businessTierForGrade(user.grade).caps[kind]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const used = kind === 'jobs'
    ? await prisma.jobListing.count({ where: { listing: { sellerId: userId }, createdAt: { gte: monthStart } } })
    : await prisma.propertyListing.count({ where: { listing: { sellerId: userId }, createdAt: { gte: monthStart } } })
  return used < cap ? 0 : feeCents
}

// Re-exported so callers can reference the caps without a second import.
export { BUSINESS_TIERS }
