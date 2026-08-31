import { prisma } from 'server/src/db'
import { rotateCovers } from '@/lib/rotateCovers'
import { sendEmail } from 'server/src/lib/notify'
import { HANDY_PRICING } from '@grabitt/design-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Auto-relist standard listings (not jobs/property/handy). Every 21 days an
// active standard listing is refreshed (bumped to the top by resetting
// createdAt) for free, up to 3 times. After the 3rd relist + 21 more days it
// expires. Property and Handy Help run their own terms, below.
// Triggered by Vercel Cron (see vercel.json); protected by CRON_SECRET.
const RELIST_DAYS = 21
const PROPERTY_DAYS = 30       // Property listings run a flat 30-day term
const MAX_RELISTS = 3
const EXCLUDED = ['jobs', 'property', 'handy_help'] as const

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RELIST_DAYS)

  // Page through every due listing, not just the first 500 — otherwise a busy
  // day could leave items sitting expired-but-unswept until a later run. We keep
  // pulling batches until none remain. Each processed listing either has its
  // createdAt reset (relist) or its status flipped to 'expired', so it drops out
  // of this query on the next batch and the loop always terminates.
  let relisted = 0
  let expired = 0
  let scanned = 0
  const BATCH = 500
  for (;;) {
    const due = await prisma.listing.findMany({
      where: {
        status: 'active',
        department: { notIn: EXCLUDED as unknown as never[] },
        createdAt: { lt: cutoff },
      },
      select: { id: true, sellerId: true, title: true, relistCount: true, images: true, department: true, createdAt: true },
      take: BATCH,
    })
    if (due.length === 0) break
    scanned += due.length
    for (const l of due) {
    if (l.relistCount < MAX_RELISTS) {
      // Rotate the cover among the first 3 photos (front covers) on each relist.
      const rotated = rotateCovers(l.images)
      await prisma.listing.update({
        where: { id: l.id },
        data: { relistCount: { increment: 1 }, createdAt: new Date(), bumpedAt: new Date(), images: rotated },
      })
      await prisma.notification.create({
        data: {
          userId: l.sellerId,
          kind: 'system',
          title: '🔄 Listing auto-relisted',
          body: `"${l.title}" was refreshed to the top for free (relist ${l.relistCount + 1} of ${MAX_RELISTS}).`,
          actionUrl: `/listings/${l.id}`,
        },
      })
      relisted++
    } else {
      await prisma.listing.update({ where: { id: l.id }, data: { status: 'expired' } })
      await prisma.notification.create({
        data: {
          userId: l.sellerId,
          kind: 'listing_expiring',
          title: 'Listing expired',
          body: `"${l.title}" has expired after its free relists. Re-list it any time to sell.`,
          actionUrl: `/listings/${l.id}`,
        },
      })
      expired++
    }
    }
    if (due.length < BATCH) break
  }

  // Property has no auto-relist — it runs a flat 30-day term, then expires.
  const propCutoff = new Date(); propCutoff.setDate(propCutoff.getDate() - PROPERTY_DAYS)
  let propertyExpired = 0
  for (;;) {
    const due = await prisma.listing.findMany({
      where: { status: 'active', department: 'property', createdAt: { lt: propCutoff } },
      select: { id: true, sellerId: true, title: true },
      take: BATCH,
    })
    if (due.length === 0) break
    for (const l of due) {
      await prisma.listing.update({ where: { id: l.id }, data: { status: 'expired' } })
      await prisma.notification.create({
        data: {
          userId: l.sellerId,
          kind: 'listing_expiring',
          title: 'Property listing expired',
          body: `"${l.title}" has reached its 30-day limit. Re-list it any time to keep it live.`,
          actionUrl: `/listings/${l.id}`,
        },
      })
      propertyExpired++
    }
    if (due.length < BATCH) break
  }

  // ── Handy Help lifecycle ───────────────────────────────────────────────────
  // A post runs 30 days. At 30 days, if still active and not yet asked, we send
  // the poster a message + email: "do you still need help?". If they reply yes
  // (handy.confirmStillNeeded) the post relists; if they reply no, or don't
  // reply within the grace window, it drops off here.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.net'
  const askCutoff = new Date(); askCutoff.setDate(askCutoff.getDate() - HANDY_PRICING.validityDays)
  const dropCutoff = new Date(); dropCutoff.setDate(dropCutoff.getDate() - HANDY_PRICING.confirmGraceDays)
  let handyAsked = 0
  let handyDropped = 0

  // 1) Ask: 30 days old, still active, not yet prompted.
  for (;;) {
    const due = await prisma.listing.findMany({
      where: { department: 'handy_help', status: 'active', handyAskedAt: null, createdAt: { lt: askCutoff } },
      select: { id: true, sellerId: true, title: true, seller: { select: { email: true } } },
      take: BATCH,
    })
    if (due.length === 0) break
    for (const l of due) {
      await prisma.listing.update({ where: { id: l.id }, data: { handyAskedAt: new Date() } })
      await prisma.notification.create({
        data: {
          userId: l.sellerId,
          kind: 'system',
          title: '🔧 Do you still need help?',
          body: `Your Handy Help post "${l.title}" has been live for ${HANDY_PRICING.validityDays} days. Tap Yes to keep it live for another ${HANDY_PRICING.validityDays} days, or let us know it's sorted.`,
          actionUrl: '/account?section=activity',
        },
      })
      if (l.seller?.email) {
        await sendEmail(
          l.seller.email,
          'Do you still need help? — Grabitt Handy Help',
          `<p>Your Handy Help post <strong>"${l.title}"</strong> has been live for ${HANDY_PRICING.validityDays} days.</p>
           <p>Do you still need help?</p>
           <p><a href="${appUrl}/account?section=activity" style="display:inline-block;background:#f5540a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;">Yes — keep it live</a></p>
           <p>If it's sorted, or you don't reply within ${HANDY_PRICING.confirmGraceDays} days, we'll close the post for you.</p>`,
        ).catch(() => {})
      }
      handyAsked++
    }
    if (due.length < BATCH) break
  }

  // 2) Drop off: prompted more than the grace window ago with no "yes" reply
  //    (a "yes" clears handyAskedAt, a "no" already removed it).
  for (;;) {
    const due = await prisma.listing.findMany({
      where: { department: 'handy_help', status: 'active', handyAskedAt: { lt: dropCutoff } },
      select: { id: true, sellerId: true, title: true },
      take: BATCH,
    })
    if (due.length === 0) break
    for (const l of due) {
      await prisma.listing.update({ where: { id: l.id }, data: { status: 'expired', handyAskedAt: null } })
      await prisma.notification.create({
        data: {
          userId: l.sellerId,
          kind: 'listing_expiring',
          title: 'Handy Help post closed',
          body: `"${l.title}" has been closed as we didn't hear that you still need help. Re-post any time.`,
          actionUrl: '/handy',
        },
      })
      handyDropped++
    }
    if (due.length < BATCH) break
  }

  return Response.json({ ok: true, scanned, relisted, expired, propertyExpired, handyAsked, handyDropped })
}
