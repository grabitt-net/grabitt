import type { PrismaClient } from '@prisma/client'

// Terms Rule A — feedback auto-completion.
// After a sale's funds are released, the buyer has 3 days to leave feedback (or
// raise a dispute). A 24-hour warning is sent, then — if they still do nothing —
// the review auto-completes as a DEEMED POSITIVE that counts fully toward the
// seller's rating and promotion chain. Repeated misses dock the buyer's standing
// (Rule B).
export const FEEDBACK_WINDOW_DAYS = 3
export const FEEDBACK_WARN_GRACE_HOURS = 24

export async function sweepFeedback(prisma: PrismaClient) {
  const now = Date.now()
  const warnAfter = new Date(now - FEEDBACK_WINDOW_DAYS * 86_400_000)
  const completeAfter = new Date(now - (FEEDBACK_WINDOW_DAYS * 86_400_000 + FEEDBACK_WARN_GRACE_HOURS * 3_600_000))

  let warned = 0
  let completed = 0

  // Candidates: released sales still awaiting the buyer's feedback, no open
  // dispute, that have passed the 3-day mark. We resolve "buyer hasn't reviewed"
  // in code because the filter depends on each row's own buyerId.
  const candidates = await prisma.transaction.findMany({
    where: {
      status: 'released',
      fundsReleasedAt: { lte: warnAfter },
      feedbackAutoCompletedAt: null,
      dispute: null,
    },
    select: {
      id: true, buyerId: true, sellerId: true, fundsReleasedAt: true, feedbackWarnedAt: true,
      listing: { select: { title: true } },
      reviews: { select: { authorId: true } },
    },
    take: 500,
  })

  for (const tx of candidates) {
    if (!tx.fundsReleasedAt) continue
    // Buyer already left feedback → nothing to do.
    if (tx.reviews.some(r => r.authorId === tx.buyerId)) continue
    const title = tx.listing?.title ?? 'your item'

    const dueForCompletion = tx.fundsReleasedAt <= completeAfter && !!tx.feedbackWarnedAt

    if (dueForCompletion) {
      // Auto-complete: create the deemed-positive, recompute the seller's rating,
      // and dock the buyer's standing.
      await prisma.$transaction([
        prisma.review.create({
          data: {
            transactionId: tx.id, authorId: tx.buyerId, subjectId: tx.sellerId,
            rating: 5, accuracyRating: 5, communicationRating: 5, speedRating: 5,
            comment: null, deemed: true,
          },
        }),
        prisma.transaction.update({ where: { id: tx.id }, data: { feedbackAutoCompletedAt: new Date() } }),
        prisma.user.update({ where: { id: tx.buyerId }, data: { feedbackMissed: { increment: 1 } } }),
      ])
      const agg = await prisma.review.aggregate({ where: { subjectId: tx.sellerId }, _avg: { rating: true } })
      await prisma.user.update({ where: { id: tx.sellerId }, data: { avgRating: agg._avg.rating } })
      await prisma.notification.create({
        data: {
          userId: tx.sellerId, kind: 'system', title: '⭐ Positive feedback (auto-confirmed)',
          body: `The buyer didn't respond in time, so "${title}" auto-completed as a positive — it counts fully toward your rating and progression.`,
          actionUrl: '/account',
        },
      })
      completed++
    } else if (!tx.feedbackWarnedAt) {
      // Send the 24-hour final warning.
      await prisma.transaction.update({ where: { id: tx.id }, data: { feedbackWarnedAt: new Date() } })
      await prisma.notification.create({
        data: {
          userId: tx.buyerId, kind: 'system', title: '⏳ Leave feedback within 24 hours',
          body: `Please rate your purchase of "${title}" or raise a dispute. If you don't within 24 hours, the sale completes automatically and is recorded as a positive review.`,
          actionUrl: '/account',
        },
      })
      warned++
    }
  }

  return { warned, completed, scanned: candidates.length }
}
