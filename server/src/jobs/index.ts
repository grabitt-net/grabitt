import PgBoss from 'pg-boss'

export let boss: PgBoss

export async function initJobs() {
  boss = new PgBoss(process.env.DATABASE_URL!)
  await boss.start()

  // Register all 11 scheduled jobs from §8 build plan

  // 1. Auto-release funds 14 days after handover confirmation
  await boss.schedule('auto-release-funds', '0 * * * *', {}) // every hour
  boss.work('auto-release-funds', async () => {
    const { prisma } = await import('../db')
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })

    const eligible = await prisma.transaction.findMany({
      where: {
        status: 'confirmed_handover',
        autoReleaseAt: { lte: new Date() },
      },
    })

    for (const tx of eligible) {
      if (tx.stripePaymentIntentId) {
        // Capture + transfer to seller
        await stripe.paymentIntents.capture(tx.stripePaymentIntentId)
      }
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'released', fundsReleasedAt: new Date() },
      })
    }
  })

  // 2. Expire listings older than 90 days
  await boss.schedule('expire-listings', '0 3 * * *', {})
  boss.work('expire-listings', async () => {
    const { prisma } = await import('../db')
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    await prisma.listing.updateMany({
      where: { status: 'active', createdAt: { lt: cutoff } },
      data: { status: 'expired' },
    })
  })

  // 3. Send listing-expiring notifications (7 days warning)
  await boss.schedule('listing-expiry-alerts', '0 9 * * *', {})
  boss.work('listing-expiry-alerts', async () => {
    const { prisma } = await import('../db')
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 83) // 83 days old = 7 days to expiry
    const expiring = await prisma.listing.findMany({
      where: { status: 'active', createdAt: { lte: cutoff } },
      select: { id: true, sellerId: true, title: true },
    })
    for (const l of expiring) {
      await prisma.notification.create({
        data: {
          userId: l.sellerId,
          kind: 'listing_expiring',
          title: 'Listing expiring soon',
          body: `"${l.title}" expires in 7 days — renew to keep it active.`,
          actionUrl: `/listings/${l.id}`,
        },
      })
    }
  })

  // 4. Expire Grab It Now listings
  await boss.schedule('expire-grab-it-now', '*/15 * * * *', {})
  boss.work('expire-grab-it-now', async () => {
    const { prisma } = await import('../db')
    await prisma.listing.updateMany({
      where: { status: 'grab_it_now', grabItNowUntil: { lte: new Date() } },
      data: { status: 'active', grabItNowUntil: null, grabItNowWindow: null },
    })
  })

  // 5. Expire featured listings
  await boss.schedule('expire-featured', '*/30 * * * *', {})
  boss.work('expire-featured', async () => {
    const { prisma } = await import('../db')
    await prisma.listing.updateMany({
      where: { isFeatured: true, featuredUntil: { lte: new Date() } },
      data: { isFeatured: false, featuredUntil: null },
    })
  })

  // 6. Reset monthly share credits counter (tracked via DB, handled at query time)

  // 7. Send saved-search alerts
  await boss.schedule('saved-search-alerts', '0 8 * * *', {})
  boss.work('saved-search-alerts', async () => {
    // TODO: Phase 4 — query new listings matching each saved search, notify users
  })

  // 8. Expire pending offers after 48h
  await boss.schedule('expire-offers', '0 * * * *', {})
  boss.work('expire-offers', async () => {
    const { prisma } = await import('../db')
    await prisma.offer.updateMany({
      where: { status: 'pending', expiresAt: { lte: new Date() } },
      data: { status: 'expired' },
    })
  })

  // 9. Send e-shot batches
  // NOTE: the 'send-eshot' worker was removed. It never ran (nothing calls
  // initJobs, and pg-boss needs a long-running worker, which serverless can't
  // provide) AND it ignored marketing consent and sent no unsubscribe link.
  // Campaigns now send synchronously via server/src/lib/eshotSend.ts, called
  // from the eshots router. Do not reinstate a queue worker here without
  // removing that path first, or campaigns will send twice.

  // 10. Daily financials snapshot
  await boss.schedule('daily-snapshot', '0 1 * * *', {})
  boss.work('daily-snapshot', async () => {
    // TODO: Phase 7 — aggregate and store daily GMV/revenue snapshot
  })

  // 11. Business trial expiry
  await boss.schedule('trial-expiry', '0 6 * * *', {})
  boss.work('trial-expiry', async () => {
    const { prisma } = await import('../db')
    const expired = await prisma.user.findMany({
      where: { isBusiness: true, businessTrialEnds: { lte: new Date() } },
      select: { id: true },
    })
    for (const u of expired) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          kind: 'system',
          title: 'Business trial ended',
          body: 'Your 7-day trial has ended. Subscribe to continue enjoying Business features.',
          actionUrl: '/account/billing',
        },
      })
    }
  })

  console.log('pg-boss jobs registered (11 jobs)')
}
