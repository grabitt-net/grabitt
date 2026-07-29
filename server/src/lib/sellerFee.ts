import { FEE_RATES } from '@grabitt/design-tokens'

// The item-sale fee rate for a seller, after any active reward fee-reduction.
// A redeemed 'fee_reduction' reward subtracts feeReductionPct percentage points
// from the grade rate until feeReductionUntil; expired/absent = grade rate.
export function effectiveFeeRate(seller: {
  grade: string
  feeReductionPct?: unknown
  feeReductionUntil?: Date | null
}): number {
  const base = FEE_RATES[seller.grade as keyof typeof FEE_RATES] ?? FEE_RATES.grabber
  const until = seller.feeReductionUntil ? new Date(seller.feeReductionUntil) : null
  if (until && until.getTime() > Date.now()) {
    const pct = Number(seller.feeReductionPct ?? 0)
    if (pct > 0) return Math.max(0, base - pct / 100)
  }
  return base
}
