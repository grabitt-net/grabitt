import {
  BUSINESS_TIERS,
  BUSINESS_TIER_ORDER,
  FEE_RATES,
  GRADE_THRESHOLDS,
  LISTING_CAPS,
  MEMBER_STATUSES,
  MEMBER_STATUS_IDS,
  type BusinessGrade,
  qualifyingBusinessGrade,
} from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

export type PersonalGrade = 'grabber' | 'dealer' | 'trader' | 'pro'
export type StatusId = 'student' | 'blue_light' | 'charity'

export type PersonalLevelConfig = {
  label: string
  feePct: number
  listingCap: number
  /** Lifetime sales needed to reach this grade (grabber = entry, no criteria). */
  criteriaSales: number
  criteriaRating: number
}

export type BusinessLevelConfig = {
  label: string
  feePct: number
  caps: { items: number; jobs: number; property: number }
  criteriaSales90d: number
  criteriaRating: number
}

export type StatusLevelConfig = {
  label: string
  badge: string
  feeDiscountPct: number
  listingCap: number | null
  freeBusiness: boolean
  evidence: string
  blurb: string
}

export type AccountLevelsData = {
  personal: Record<PersonalGrade, PersonalLevelConfig>
  business: Record<BusinessGrade, BusinessLevelConfig>
  statuses: Record<StatusId, StatusLevelConfig>
}

const PERSONAL_LABELS: Record<PersonalGrade, string> = {
  grabber: 'Grabber',
  dealer: 'Dealer',
  trader: 'Trader',
  pro: 'Pro',
}

/** Built-in defaults — used when nothing is saved in the database yet. */
export function defaultAccountLevels(): AccountLevelsData {
  return {
    personal: {
      grabber: {
        label: PERSONAL_LABELS.grabber,
        feePct: FEE_RATES.grabber * 100,
        listingCap: LISTING_CAPS.grabber === Infinity ? 999999 : LISTING_CAPS.grabber,
        criteriaSales: 0,
        criteriaRating: 0,
      },
      dealer: {
        label: PERSONAL_LABELS.dealer,
        feePct: FEE_RATES.dealer * 100,
        listingCap: LISTING_CAPS.dealer,
        criteriaSales: GRADE_THRESHOLDS.dealer.sales,
        criteriaRating: GRADE_THRESHOLDS.dealer.rating,
      },
      trader: {
        label: PERSONAL_LABELS.trader,
        feePct: FEE_RATES.trader * 100,
        listingCap: LISTING_CAPS.trader,
        criteriaSales: GRADE_THRESHOLDS.trader.sales,
        criteriaRating: GRADE_THRESHOLDS.trader.rating,
      },
      pro: {
        label: PERSONAL_LABELS.pro,
        feePct: FEE_RATES.pro * 100,
        listingCap: LISTING_CAPS.pro === Infinity ? 999999 : LISTING_CAPS.pro,
        criteriaSales: GRADE_THRESHOLDS.pro.sales,
        criteriaRating: GRADE_THRESHOLDS.pro.rating,
      },
    },
    business: {
      dealer: {
        label: BUSINESS_TIERS.dealer.label,
        feePct: BUSINESS_TIERS.dealer.feeRate * 100,
        caps: { ...BUSINESS_TIERS.dealer.caps },
        criteriaSales90d: BUSINESS_TIERS.dealer.criteria.sales90d,
        criteriaRating: BUSINESS_TIERS.dealer.criteria.rating,
      },
      trader: {
        label: BUSINESS_TIERS.trader.label,
        feePct: BUSINESS_TIERS.trader.feeRate * 100,
        caps: { ...BUSINESS_TIERS.trader.caps },
        criteriaSales90d: BUSINESS_TIERS.trader.criteria.sales90d,
        criteriaRating: BUSINESS_TIERS.trader.criteria.rating,
      },
      pro: {
        label: BUSINESS_TIERS.pro.label,
        feePct: BUSINESS_TIERS.pro.feeRate * 100,
        caps: { ...BUSINESS_TIERS.pro.caps },
        criteriaSales90d: BUSINESS_TIERS.pro.criteria.sales90d,
        criteriaRating: BUSINESS_TIERS.pro.criteria.rating,
      },
    },
    statuses: {
      student: {
        label: MEMBER_STATUSES.student.label,
        badge: MEMBER_STATUSES.student.badge,
        feeDiscountPct: MEMBER_STATUSES.student.feeDiscountPct,
        listingCap: null,
        freeBusiness: false,
        evidence: MEMBER_STATUSES.student.evidence,
        blurb: MEMBER_STATUSES.student.blurb,
      },
      blue_light: {
        label: MEMBER_STATUSES.blue_light.label,
        badge: MEMBER_STATUSES.blue_light.badge,
        feeDiscountPct: MEMBER_STATUSES.blue_light.feeDiscountPct,
        listingCap: null,
        freeBusiness: false,
        evidence: MEMBER_STATUSES.blue_light.evidence,
        blurb: MEMBER_STATUSES.blue_light.blurb,
      },
      charity: {
        label: MEMBER_STATUSES.charity.label,
        badge: MEMBER_STATUSES.charity.badge,
        feeDiscountPct: MEMBER_STATUSES.charity.feeDiscountPct,
        listingCap: MEMBER_STATUSES.charity.listingCap,
        freeBusiness: MEMBER_STATUSES.charity.freeBusiness,
        evidence: MEMBER_STATUSES.charity.evidence,
        blurb: MEMBER_STATUSES.charity.blurb,
      },
    },
  }
}

function mergeLevels(stored: unknown): AccountLevelsData {
  const base = defaultAccountLevels()
  if (!stored || typeof stored !== 'object') return base
  const s = stored as Partial<AccountLevelsData>
  return {
    personal: { ...base.personal, ...(s.personal as typeof base.personal) },
    business: { ...base.business, ...(s.business as typeof base.business) },
    statuses: { ...base.statuses, ...(s.statuses as typeof base.statuses) },
  }
}

export async function getAccountLevels(prisma: PrismaClient): Promise<AccountLevelsData> {
  const row = await prisma.accountLevelsConfig.findUnique({ where: { id: 'default' } })
  return mergeLevels(row?.data)
}

export function personalFeeRate(levels: AccountLevelsData, grade: string): number {
  const g = grade as PersonalGrade
  return (levels.personal[g]?.feePct ?? levels.personal.grabber.feePct) / 100
}

export function personalListingCap(levels: AccountLevelsData, grade: string): number {
  const g = grade as PersonalGrade
  return levels.personal[g]?.listingCap ?? levels.personal.grabber.listingCap
}

export function statusDiscountPct(levels: AccountLevelsData, memberStatus: string | null | undefined): number {
  if (!memberStatus) return 0
  const s = levels.statuses[memberStatus as StatusId]
  return s?.feeDiscountPct ?? 0
}

export function qualifyingPersonalGrade(
  levels: AccountLevelsData,
  salesCount: number,
  rating: number,
  current: string,
): PersonalGrade {
  let grade = current as PersonalGrade
  const order: PersonalGrade[] = ['grabber', 'dealer', 'trader', 'pro']
  for (let i = order.length - 1; i >= 0; i--) {
    const g = order[i]
    const t = levels.personal[g]
    if (salesCount >= t.criteriaSales && rating >= t.criteriaRating) {
      grade = g
      break
    }
  }
  return grade
}

export function qualifyingBusinessGradeFromLevels(
  levels: AccountLevelsData,
  sales90d: number,
  rating: number,
): BusinessGrade {
  if (sales90d >= levels.business.pro.criteriaSales90d && rating >= levels.business.pro.criteriaRating) return 'pro'
  if (sales90d >= levels.business.trader.criteriaSales90d && rating >= levels.business.trader.criteriaRating) return 'trader'
  return 'dealer'
}

export function businessTierFromLevels(levels: AccountLevelsData, grade: string) {
  const key: BusinessGrade = grade === 'pro' ? 'pro' : grade === 'trader' ? 'trader' : 'dealer'
  const t = levels.business[key]
  return { key, label: t.label, feeRate: t.feePct / 100, caps: t.caps, criteria: { sales90d: t.criteriaSales90d, rating: t.criteriaRating } }
}

export { BUSINESS_TIER_ORDER, qualifyingBusinessGrade, MEMBER_STATUS_IDS }
