import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import { prisma } from '../db'
import { grantCreditPack } from '../routers/credits'
import { SUBSCRIPTION_PLANS } from '@grabitt/design-tokens'

// Map Stripe subscription status → our SubStatus enum.
function mapSubStatus(s: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' {
  if (s === 'trialing') return 'trialing'
  if (s === 'active') return 'active'
  if (s === 'paused') return 'paused'
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled'
  return 'past_due' // past_due, unpaid, incomplete
}

// A paid Business subscription includes a directory listing. Keep it live
// through `until`, seeding the entry from the business profile if there isn't
// one yet. Extend only — never shorten a longer window the business may have
// bought separately via the sponsorship basket.
async function grantDirectoryForBusiness(userId: string, until: Date) {
  const existing = await prisma.directoryListing.findUnique({ where: { userId }, select: { id: true, paidUntil: true } })
  if (existing) {
    if (!existing.paidUntil || existing.paidUntil < until) {
      await prisma.directoryListing.update({ where: { id: existing.id }, data: { paidUntil: until } }).catch(() => {})
    }
    return
  }
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { businessName: true, displayName: true } })
  const name = u?.businessName || u?.displayName || 'Business'
  await prisma.directoryListing.create({ data: { userId, name, paidUntil: until } }).catch(() => {})
}

// Upsert the Subscription row from a Stripe subscription and apply entitlements
// (the Business plan flips isBusiness + a Dealer grade floor while active).
async function applySubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId
  const plan = sub.metadata?.plan as keyof typeof SUBSCRIPTION_PLANS | undefined
  if (!userId || !plan || !SUBSCRIPTION_PLANS[plan]) return

  const status = mapSubStatus(sub.status)
  const periodEndUnix = (sub as unknown as { current_period_end?: number }).current_period_end
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null
  const active = status === 'active' || status === 'trialing'

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId, plan, status,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: String(sub.customer),
      currentPeriodEnd, trialEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
    update: { status, currentPeriodEnd, trialEnd, cancelAtPeriodEnd: sub.cancel_at_period_end ?? false },
  })

  if (plan.startsWith('business')) {
    if (active) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { grade: true } })
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBusiness: true,
          businessTrialEnds: trialEnd,
          ...(u?.grade === 'grabber' ? { grade: 'dealer' } : {}),
        },
      })
      // Paid Business includes a directory listing — keep it live through the
      // current period. The next renewal webhook extends it again.
      const until = currentPeriodEnd ?? trialEnd ?? new Date(Date.now() + 30 * 86400000)
      await grantDirectoryForBusiness(userId, until)
    } else {
      await prisma.user.update({ where: { id: userId }, data: { isBusiness: false } })
    }
  }

  // Property-agent plans include an active-listing allowance. Grant it while the
  // subscription is active; clear it (to 0) when it lapses/cancels.
  const planDef = SUBSCRIPTION_PLANS[plan] as { propertyAllowance?: number }
  if (planDef.propertyAllowance != null) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        propertyListingAllowance: active ? planDef.propertyAllowance : 0,
        // An agent on a paid plan is a business seller.
        ...(active ? { isBusiness: true, isPropertyAgent: true } : {}),
      },
    })
  }
}


// Processes a verified Stripe event. Shared by the Express server and the
// Next.js /api/webhooks/stripe route handler.
// Grant timed sponsorship placements from an "addonId:months:amountCents:page,…"
// basket (page is the Category Sponsor's target slug; empty otherwise).
async function grantSponsorships(userId: string, basket: string) {
  for (const part of basket.split(',')) {
    const [addonId, monthsStr, amountStr, page] = part.split(':')
    const months = Number(monthsStr)
    if (!addonId || !months) continue
    // The Business Directory isn't a timed banner placement — it extends the
    // advertiser's directory subscription instead of creating a grant.
    if (addonId === 'directory') { await extendDirectory(userId, months); continue }
    const endsAt = new Date(Date.now() + months * 30 * 86400000)
    await prisma.sponsorshipGrant.create({
      data: { userId, addonId, months, amountCents: Number(amountStr) || 0, pageTarget: page || null, endsAt },
    }).catch(() => {})
  }
}

// Banner advertising order — the basket encodes `position|page|months|startISO`
// lines. Each becomes an active BannerBooking; the buyer uploads a creative
// afterwards (the banner is provisioned unapproved and reviewed by an admin).
async function provisionBannerOrder(userId: string, basket: string) {
  for (const part of basket.split(',')) {
    const [position, page, monthsStr, startIso] = part.split('|')
    const months = Number(monthsStr)
    if (!position || !months || !startIso) continue
    const startsAt = new Date(startIso)
    const endsAt = new Date(startsAt)
    endsAt.setMonth(endsAt.getMonth() + months)
    await prisma.bannerBooking.create({
      data: { userId, position: position as never, pageTarget: page || null, months, startsAt, endsAt, amountCents: 0, status: 'active' },
    }).catch(() => {})
  }
}

// Directory subscription purchase — extend the listing's paidUntil by `months`,
// stacking on any remaining time so a renewal adds rather than resets.
async function extendDirectory(userId: string, months: number) {
  let listing = await prisma.directoryListing.findUnique({ where: { userId }, select: { id: true, paidUntil: true } })
  // Bought via the sponsorship basket without a listing yet — seed one from the
  // business profile so the paid entry exists; the business fills in the rest
  // (phone, website, logo…) afterwards in the directory manager.
  if (!listing) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { businessName: true, displayName: true } })
    const name = u?.businessName || u?.displayName || 'Business'
    listing = await prisma.directoryListing.create({ data: { userId, name }, select: { id: true, paidUntil: true } }).catch(() => null)
    if (!listing) return
  }
  const base = listing.paidUntil && listing.paidUntil.getTime() > Date.now() ? new Date(listing.paidUntil) : new Date()
  base.setMonth(base.getMonth() + months)
  await prisma.directoryListing.update({ where: { id: listing.id }, data: { paidUntil: base } }).catch(() => {})
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    // Combined business signup basket (subscription + one-off sponsorship items):
    // the session carries the sponsorship basket in its metadata.
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session
      if (s.metadata?.kind === 'sponsorship' && s.metadata.userId && s.metadata.basket) {
        await grantSponsorships(s.metadata.userId, s.metadata.basket)
      }
      if (s.metadata?.kind === 'banner_order' && s.metadata.userId && s.metadata.basket) {
        await provisionBannerOrder(s.metadata.userId, s.metadata.basket)
      }
      break
    }
    // Escrow purchases use capture_method: 'manual'. When the buyer authorises
    // the card, Stripe fires amount_capturable_updated — funds are now HELD
    // (not yet captured). Capture happens later at handover/tracking release.
    case 'payment_intent.amount_capturable_updated': {
      const pi = event.data.object as Stripe.PaymentIntent
      // One PaymentIntent = one escrow transaction. Reserving stock here — the
      // moment the card is authorised — is what stops two buyers securing the
      // same last unit: the conditional decrement is an atomic lock. (Filtering
      // on status='pending_payment' also makes a redelivered webhook a no-op.)
      const pending = await prisma.transaction.findMany({
        where: { stripePaymentIntentId: pi.id, status: 'pending_payment' },
        select: {
          id: true, listingId: true, quantity: true, buyerId: true, fulfilmentType: true,
          listing: { select: { title: true } },
          seller: { select: { displayName: true, phone: true, collectionAddress: true } },
        },
      })

      for (const tx of pending) {
        // Atomic reserve: succeeds only while the listing is still buyable AND has
        // the units. Marks it sold when the last unit goes.
        const reserved = await prisma.$executeRaw`
          UPDATE "Listing"
          SET stock = stock - ${tx.quantity},
              status = CASE WHEN stock - ${tx.quantity} <= 0 THEN 'sold'::"ListingStatus" ELSE status END
          WHERE id = ${tx.listingId}
            AND status IN ('active', 'grab_it_now')
            AND stock >= ${tx.quantity}`

        if (reserved === 0) {
          // Sold out from under this buyer between authorising and now. Void the
          // authorisation so their card is never charged, and tell them.
          try { await getStripe().paymentIntents.cancel(pi.id) } catch { /* already voided */ }
          await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'cancelled' } })
          await prisma.notification.create({
            data: {
              userId: tx.buyerId, kind: 'system',
              title: 'Sold out — you were not charged',
              body: `"${tx.listing.title}" sold out before your payment completed, so no money was taken.`,
            },
          })
          continue
        }

        // Reserved — the purchase is now held in escrow.
        await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'held' } })

        // Collection sales: release the seller's collection address + phone to the
        // buyer. These are hidden until the purchase is secured.
        if (tx.fulfilmentType === 'collection' && (tx.seller.collectionAddress || tx.seller.phone)) {
          await prisma.notification.create({
            data: {
              userId: tx.buyerId, kind: 'system',
              title: '📍 Collection details for your purchase',
              body: `Collect "${tx.listing.title}" from ${tx.seller.displayName}.`
                + (tx.seller.collectionAddress ? ` Address: ${tx.seller.collectionAddress}.` : '')
                + (tx.seller.phone ? ` Phone: ${tx.seller.phone}.` : ''),
            },
          })
        }

        // If that reservation emptied the listing, drop it from everyone's basket.
        const fresh = await prisma.listing.findUnique({ where: { id: tx.listingId }, select: { stock: true } })
        if ((fresh?.stock ?? 0) <= 0) {
          await prisma.cartItem.deleteMany({ where: { listingId: tx.listingId } })
        }
      }
      break
    }
    // Fires after capture (purchase release) OR immediately for auto-capture
    // intents such as credit-pack top-ups. Only credit packs need action here.
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.kind === 'credit_pack' && pi.metadata.userId && pi.metadata.packId) {
        await grantCreditPack(prisma, pi.metadata.userId, pi.metadata.packId, pi.id)
      }
      // One-off business verification (€19) → unlock the shield.
      if (pi.metadata?.kind === 'business_verify' && pi.metadata.userId) {
        await prisma.user.update({ where: { id: pi.metadata.userId }, data: { businessVerified: true } })
      }
      // One-off sponsorship basket → grant each timed placement.
      if (pi.metadata?.kind === 'sponsorship' && pi.metadata.userId && pi.metadata.basket) {
        await grantSponsorships(pi.metadata.userId, pi.metadata.basket)
      }
      if (pi.metadata?.kind === 'banner_order' && pi.metadata.userId && pi.metadata.basket) {
        await provisionBannerOrder(pi.metadata.userId, pi.metadata.basket)
      }
      if (pi.metadata?.kind === 'directory' && pi.metadata.userId && pi.metadata.months) {
        await extendDirectory(pi.metadata.userId, Number(pi.metadata.months) || 1)
      }
      // A job/property advert bought beyond the free allowance — publish it.
      if (pi.metadata?.kind === 'listing_publish' && pi.metadata.listingId) {
        await prisma.listing.update({ where: { id: pi.metadata.listingId }, data: { status: 'active' } }).catch(() => {})
      }
      // A direct-marketing blast bundle — credit the sends.
      if (pi.metadata?.kind === 'blast' && pi.metadata.userId && pi.metadata.qty) {
        const n = Number(pi.metadata.qty) || 0
        const field = pi.metadata.channel === 'whatsapp' ? 'whatsappBlastsLeft' : 'emailBlastsLeft'
        await prisma.user.update({ where: { id: pi.metadata.userId }, data: { [field]: { increment: n } } }).catch(() => {})
      }
      // Paid listing promotion → apply the option now that payment succeeded.
      if (pi.metadata?.kind === 'listing_promo' && pi.metadata.listingId && pi.metadata.userId) {
        const target = await prisma.listing.findUnique({ where: { id: pi.metadata.listingId }, select: { sellerId: true } })
        if (target?.sellerId === pi.metadata.userId) {
          if (pi.metadata.option === 'grab_it_now') {
            const until = new Date(); until.setHours(24, 0, 0, 0) // expires tonight
            await prisma.listing.update({ where: { id: pi.metadata.listingId }, data: { status: 'grab_it_now', grabItNowUntil: until } })
          } else {
            const weeks = Number(pi.metadata.weeks) || 1
            const until = new Date(Date.now() + weeks * 7 * 86400000)
            await prisma.listing.update({ where: { id: pi.metadata.listingId }, data: { isFeatured: true, featuredUntil: until } })
          }
        }
      }
      break
    }
    // Subscription lifecycle (trial start, activation, renewal, cancel, pause).
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await applySubscription(event.data.object as Stripe.Subscription)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.transaction.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'cancelled' },
      })
      break
    }
    // A held (reserved) authorisation is being voided — Stripe auto-cancels an
    // uncaptured manual-capture PI after 7 days, or we cancel it ourselves. Give
    // the reserved stock back and re-list it if that unit had sold the item out.
    // Only rows still 'held' are restored, so this can't double-refund stock
    // against the sold-out branch above (which never reached 'held').
    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent
      const held = await prisma.transaction.findMany({
        where: { stripePaymentIntentId: pi.id, status: 'held' },
        select: { id: true, listingId: true, quantity: true },
      })
      for (const tx of held) {
        await prisma.$executeRaw`
          UPDATE "Listing"
          SET stock = stock + ${tx.quantity},
              status = CASE WHEN status = 'sold' THEN 'active'::"ListingStatus" ELSE status END
          WHERE id = ${tx.listingId}`
        await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'cancelled' } })
      }
      break
    }
    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer
      if (transfer.metadata?.transactionId) {
        await prisma.transaction.update({
          where: { id: transfer.metadata.transactionId },
          data: { stripeTransferId: transfer.id },
        })
      }
      break
    }
  }
}

// Verifies the signature then processes. Throws on bad signature.
export async function verifyAndHandleStripe(rawBody: string | Buffer, signature: string) {
  const event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  await handleStripeEvent(event)
}

// Express adapter (standalone server)
export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).send('Missing signature')
  try {
    await verifyAndHandleStripe(req.body, sig as string)
  } catch (err) {
    return res.status(400).send(`Webhook error: ${(err as Error).message}`)
  }
  res.json({ received: true })
}
