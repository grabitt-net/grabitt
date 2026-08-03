import { FEE_RATES } from '@grabitt/design-tokens'
import type { AccountLevelsData } from './accountLevels'
import { personalFeeRate, statusDiscountPct } from './accountLevels'

// The item-sale fee rate for a seller, after discounts. Two can apply:
//  • a temporary redeemed reward (feeReductionPct until feeReductionUntil), and
//  • an ongoing special-status discount (student / blue-light / charity).
// The larger of the two applies (they don't stack); the result is floored at 0.
export function effectiveFeeRate(seller: {
  grade: string
  memberStatus?: string | null
  feeReductionPct?: unknown
  feeReductionUntil?: Date | null
  statusDiscountPct?: unknown
  feeOverridePct?: unknown
}, levels?: AccountLevelsData): number {
  // An admin per-account override replaces the grade rate as the base.
  const override = seller.feeOverridePct != null ? Number(seller.feeOverridePct) : null
  const base = override != null && override >= 0
    ? override / 100
    : levels
      ? personalFeeRate(levels, seller.grade)
      : (FEE_RATES[seller.grade as keyof typeof FEE_RATES] ?? FEE_RATES.grabber)
  const fromStatus = levels
    ? statusDiscountPct(levels, seller.memberStatus)
    : Number(seller.statusDiscountPct ?? 0)
  let discountPts = fromStatus
  const until = seller.feeReductionUntil ? new Date(seller.feeReductionUntil) : null
  if (until && until.getTime() > Date.now()) {
    discountPts = Math.max(discountPts, Number(seller.feeReductionPct ?? 0))
  }
  return discountPts > 0 ? Math.max(0, base - discountPts / 100) : base
}
