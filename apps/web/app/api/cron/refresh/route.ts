import { prisma } from 'server/src/db'
import { rotateCovers } from '@/lib/rotateCovers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Weekly freshness refresh (Steve): every 7 days an active listing is bumped
// back to the top of the feed with a new main photo, so the site keeps looking
// fresh. This is separate from the relist/expiry cron — it only touches bumpedAt
// (the sort clock) and rotates the photo; it does NOT change createdAt or
// relistCount, so the 21-day (standard) / 30-day (Handy Help) relist cycle is
// unaffected. Runs daily and refreshes each listing whose last bump is 7+ days
// old, so cadence is robust regardless of exact cron timing.
// Excludes jobs & property (those have their own lifecycles).
const REFRESH_DAYS = 7
const EXCLUDED = ['jobs', 'property'] as const

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - REFRESH_DAYS)

  let refreshed = 0
  let scanned = 0
  const BATCH = 500
  for (;;) {
    const due = await prisma.listing.findMany({
      where: {
        status: 'active',
        department: { notIn: EXCLUDED as unknown as never[] },
        bumpedAt: { lt: cutoff },
      },
      select: { id: true, images: true },
      take: BATCH,
    })
    if (due.length === 0) break
    scanned += due.length
    for (const l of due) {
      // Rotate the cover among the first 3 photos (the designated front covers)
      // so a refreshed listing looks new without disturbing the gallery order of
      // the rest. Fewer than 3 photos: rotate what's there.
      const rotated = rotateCovers(l.images)
      await prisma.listing.update({ where: { id: l.id }, data: { bumpedAt: new Date(), images: rotated } })
      refreshed++
    }
    if (due.length < BATCH) break
  }

  return Response.json({ ok: true, scanned, refreshed })
}
