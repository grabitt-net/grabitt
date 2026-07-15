import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Basket lifecycle: warn at 6h and 10h, auto-clear at 12h, and drop items whose
// listing is no longer buyable. Triggered by Vercel Cron (hourly); protected by
// CRON_SECRET. On Hobby (daily cron only) trigger from an external scheduler.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const sixHoursLeft = new Date(now.getTime() + 6 * 3600_000)   // expires within 6h → ~6h in basket
  const twoHoursLeft = new Date(now.getTime() + 2 * 3600_000)   // expires within 2h → ~10h in basket

  // Drop items whose listing is no longer active (sold/removed).
  const dead = await prisma.cartItem.findMany({
    where: { listing: { OR: [{ status: { not: 'active' } }, { stock: { lt: 1 } }] } },
    select: { id: true },
  })
  if (dead.length) await prisma.cartItem.deleteMany({ where: { id: { in: dead.map(d => d.id) } } })

  // 12h expiry — remove and notify.
  const expired = await prisma.cartItem.findMany({
    where: { expiresAt: { lte: now } },
    include: { listing: { select: { title: true } } },
  })
  for (const c of expired) {
    await prisma.notification.create({
      data: { userId: c.userId, kind: 'system', title: '🛒 Removed from your basket', body: `"${c.listing.title}" was removed from your basket after 12 hours. Add it again to buy.` },
    })
  }
  if (expired.length) await prisma.cartItem.deleteMany({ where: { id: { in: expired.map(c => c.id) } } })

  // 6h warning.
  const warn6 = await prisma.cartItem.findMany({
    where: { warn6SentAt: null, expiresAt: { gt: now, lte: sixHoursLeft } },
    include: { listing: { select: { title: true } } },
  })
  for (const c of warn6) {
    await prisma.notification.create({
      data: { userId: c.userId, kind: 'system', title: '⏳ Basket reminder', body: `"${c.listing.title}" will be removed from your basket in about 6 hours. Check out to secure it.` },
    })
  }
  if (warn6.length) await prisma.cartItem.updateMany({ where: { id: { in: warn6.map(c => c.id) } }, data: { warn6SentAt: now } })

  // 10h warning (≈2h left).
  const warn10 = await prisma.cartItem.findMany({
    where: { warn10SentAt: null, expiresAt: { gt: now, lte: twoHoursLeft } },
    include: { listing: { select: { title: true } } },
  })
  for (const c of warn10) {
    await prisma.notification.create({
      data: { userId: c.userId, kind: 'system', title: '⚠️ Basket about to clear', body: `"${c.listing.title}" will be removed from your basket in ~2 hours. Complete checkout now.` },
    })
  }
  if (warn10.length) await prisma.cartItem.updateMany({ where: { id: { in: warn10.map(c => c.id) } }, data: { warn10SentAt: now } })

  return Response.json({ ok: true, dropped: dead.length, expired: expired.length, warned6: warn6.length, warned10: warn10.length })
}
