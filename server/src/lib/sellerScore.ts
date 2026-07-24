// A business seller's shop rating.
//
// Star reviews alone are a poor measure of a shop: a seller can hold five stars
// while leaving buyers waiting days and losing disputes. This blends what
// actually matters to a buyer deciding whether to order —
//
//   reviews    (60%) — what buyers said after the sale
//   disputes   (25%) — how often orders went wrong, weighted by who was at fault
//   responses  (15%) — how quickly the shop replies to messages
//
// Sellers with almost no history are not punished for it: each component falls
// back to neutral until there's enough to judge, so a new shop starts fair
// rather than at zero.

export type SellerScoreInput = {
  avgRating: number | null       // 1–5 from reviews
  reviewCount: number
  salesCount: number
  disputesTotal: number
  disputesLostBySeller: number   // resolved in the buyer's favour
  medianResponseMins: number | null
  repliedWithin24h: number       // threads replied to within a day
  threadsTotal: number
}

export type SellerScore = {
  score: number                  // 0–100
  stars: number                  // 0–5, for display
  parts: { key: string; label: string; score: number; weight: number; detail: string }[]
  provisional: boolean           // too little history to be meaningful
}

export function scoreSeller(i: SellerScoreInput): SellerScore {
  const parts: SellerScore['parts'] = []

  // ── Reviews (60) ───────────────────────────────────────────────────────────
  // Below three reviews an average swings wildly, so blend toward neutral.
  const reviewRaw = i.avgRating != null ? (i.avgRating / 5) * 100 : 70
  const reviewConfidence = Math.min(1, i.reviewCount / 5)
  const reviews = Math.round(reviewRaw * reviewConfidence + 70 * (1 - reviewConfidence))
  parts.push({
    key: 'reviews', label: 'Buyer reviews', score: reviews, weight: 60,
    detail: i.reviewCount ? `${i.avgRating?.toFixed(1)}★ from ${i.reviewCount} reviews` : 'No reviews yet',
  })

  // ── Disputes (25) ──────────────────────────────────────────────────────────
  // A dispute raised is a mark against the shop; one lost is a much bigger one.
  const orders = Math.max(i.salesCount, i.disputesTotal)
  let disputes = 85
  if (orders > 0) {
    const rate = i.disputesTotal / orders
    const lostRate = i.disputesLostBySeller / orders
    disputes = Math.round(Math.max(0, 100 - rate * 120 - lostRate * 200))
  }
  parts.push({
    key: 'disputes', label: 'Order disputes', score: disputes, weight: 25,
    detail: orders === 0
      ? 'No completed orders yet'
      : `${i.disputesTotal} dispute${i.disputesTotal === 1 ? '' : 's'} in ${orders} orders${i.disputesLostBySeller ? `, ${i.disputesLostBySeller} found against the shop` : ''}`,
  })

  // ── Response time (15) ─────────────────────────────────────────────────────
  let responses = 80
  if (i.threadsTotal >= 3) {
    const within = i.repliedWithin24h / i.threadsTotal
    const speed = i.medianResponseMins == null ? 0.6
      : i.medianResponseMins <= 60 ? 1
      : i.medianResponseMins <= 240 ? 0.9
      : i.medianResponseMins <= 720 ? 0.75
      : i.medianResponseMins <= 1440 ? 0.6
      : 0.35
    responses = Math.round((within * 0.5 + speed * 0.5) * 100)
  }
  parts.push({
    key: 'responses', label: 'Reply speed', score: responses, weight: 15,
    detail: i.threadsTotal < 3
      ? 'Not enough conversations yet'
      : i.medianResponseMins == null ? 'No replies recorded'
      : i.medianResponseMins < 60 ? 'Usually replies within the hour'
      : i.medianResponseMins < 1440 ? `Usually replies in about ${Math.round(i.medianResponseMins / 60)} hours`
      : `Usually replies in about ${Math.round(i.medianResponseMins / 1440)} days`,
  })

  const score = Math.round(parts.reduce((a, p) => a + p.score * (p.weight / 100), 0))
  return {
    score,
    stars: Math.round((score / 100) * 5 * 10) / 10,
    parts,
    provisional: i.reviewCount < 3 && i.salesCount < 3,
  }
}
