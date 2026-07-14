import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Auto-relist standard listings (not jobs/property). Every 21 days an active
// standard listing is refreshed (bumped to the top by resetting createdAt) for
// free, up to 3 times. After the 3rd relist + 21 more days it expires.
// Triggered by Vercel Cron (see vercel.json); protected by CRON_SECRET.
const RELIST_DAYS = 21
const MAX_RELISTS = 3
const EXCLUDED = ['jobs', 'property'] as const

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RELIST_DAYS)

  const due = await prisma.listing.findMany({
    where: {
      status: 'active',
      department: { notIn: EXCLUDED as unknown as never[] },
      createdAt: { lt: cutoff },
    },
    select: { id: true, sellerId: true, title: true, relistCount: true },
    take: 500,
  })

  let relisted = 0
  let expired = 0
  for (const l of due) {
    if (l.relistCount < MAX_RELISTS) {
      await prisma.listing.update({
        where: { id: l.id },
        data: { relistCount: { increment: 1 }, createdAt: new Date() },
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

  return Response.json({ ok: true, scanned: due.length, relisted, expired })
}
