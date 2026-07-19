import type { PrismaClient } from '@prisma/client'
import { releaseFundsToSeller } from '../routers/transactions'

/**
 * Releases every payment that has become due, and skips anything disputed.
 *
 * Due means:
 *   • courier    — autoReleaseAt (deliveredAt + 48h) has passed
 *   • collection — autoReleaseAt (handoverConfirmedAt + 14 days) has passed
 *
 * Both cases are represented by autoReleaseAt, so one query covers them. Each
 * release is attempted independently: a Stripe failure on one order must not
 * stop the rest from paying out.
 */
export async function autoReleaseDueFunds(prisma: PrismaClient) {
  const due = await prisma.transaction.findMany({
    where: {
      status: 'held',
      autoReleaseAt: { not: null, lte: new Date() },
      fundsReleasedAt: null,
      // Never pay out while a dispute is open — the money is the leverage.
      dispute: { is: null },
    },
    take: 200,
  })

  let released = 0
  const failures: { transactionId: string; error: string }[] = []

  for (const tx of due) {
    try {
      await releaseFundsToSeller(prisma, tx, tx.fulfilmentType === 'courier' ? 'courier' : 'handover')
      released++
    } catch (err) {
      failures.push({ transactionId: tx.id, error: err instanceof Error ? err.message : 'unknown' })
    }
  }

  return { due: due.length, released, failed: failures.length, failures }
}
