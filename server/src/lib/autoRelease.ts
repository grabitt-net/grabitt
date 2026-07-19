import type { PrismaClient } from '@prisma/client'
import { releaseFundsToSeller, markCourierDelivered } from '../routers/transactions'

// Safety net for postal orders where no delivery was ever confirmed — 17TRACK
// never reported (carrier didn't scan, number mistyped) and the buyer never
// tapped "I've received this". Without this the money would sit held forever.
// After this long from dispatch we treat it as delivered, which still gives the
// buyer their full 24h window before anything is paid out.
const ASSUME_DELIVERED_AFTER_DAYS = 14

/**
 * Starts the delivery clock on postal orders that were dispatched long ago but
 * never got a delivery confirmation. Returns how many were nudged.
 */
export async function assumeStalePostalDeliveries(prisma: PrismaClient) {
  const cutoff = new Date(Date.now() - ASSUME_DELIVERED_AFTER_DAYS * 86400_000)
  const stale = await prisma.transaction.findMany({
    where: {
      status: 'held',
      fulfilmentType: 'courier',
      deliveredAt: null,
      shippedAt: { not: null, lte: cutoff },
      trackingNumber: { not: null },
      dispute: { is: null },
    },
    select: { trackingNumber: true },
    take: 100,
  })

  let started = 0
  for (const tx of stale) {
    if (tx.trackingNumber && await markCourierDelivered(prisma, tx.trackingNumber)) started++
  }
  return started
}

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
  // First, rescue any postal orders stuck with no delivery confirmation. They
  // won't release on this run — the buyer's 24h window opens now — but they
  // stop being stranded.
  const assumedDelivered = await assumeStalePostalDeliveries(prisma)

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

  return { due: due.length, released, failed: failures.length, assumedDelivered, failures }
}
