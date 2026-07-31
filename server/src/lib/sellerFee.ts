import { FEE_RATES } from '@grabitt/design-tokens'

// The item-sale fee rate for a seller, after discounts. Two can apply:
//  • a temporary redeemed reward (feeReductionPct until feeReductionUntil), and
//  • an ongoing special-status discount (statusDiscountPct — student / blue-light
//    / charity), held for as long as the status is granted.
// The larger of the two applies (they don't stack); the result is floored at 0.
export function effectiveFeeRate(seller: {
  grade: string
  feeReductionPct?: unknown
  feeReductionUntil?: Date | null
  statusDiscountPct?: unknown
  feeOverridePct?: unknown
}): number {
  // An admin per-account override replaces the grade rate as the base.
  const override = seller.feeOverridePct != null ? Number(seller.feeOverridePct) : null
  const base = override != null && override >= 0
    ? override / 100
    : (FEE_RATES[seller.grade as keyof typeof FEE_RATES] ?? FEE_RATES.grabber)
  let discountPts = Number(seller.statusDiscountPct ?? 0) // ongoing, in percentage points
  const until = seller.feeReductionUntil ? new Date(seller.feeReductionUntil) : null
  if (until && until.getTime() > Date.now()) {
    discountPts = Math.max(discountPts, Number(seller.feeReductionPct ?? 0))
  }
  return discountPts > 0 ? Math.max(0, base - discountPts / 100) : base
}
