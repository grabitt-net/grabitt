import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'
import { Prisma, type PrismaClient } from '@prisma/client'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { RateTransactionInputSchema } from '@grabitt/types'
import { FEE_RATES, FUND_RELEASE_AUTO_DAYS, COURIER_RELEASE_HOURS, COURIER_DISPUTE_WINDOW_HOURS } from '@grabitt/design-tokens'
import { trackingUrlFor, CARRIERS } from '../lib/tracking'
import { registerTracking } from '../lib/track17'


// Handover token lives for 30 minutes — long enough for an in-person meetup
const HANDOVER_TOKEN_TTL_SECS = 30 * 60
const HANDOVER_JWT_SECRET = () => process.env.HANDOVER_JWT_SECRET ?? process.env.JWT_SECRET!

interface HandoverPayload {
  txn: string  // transaction id
  sel: string  // seller id — only seller can generate, only buyer can consume
}

function signHandoverToken(payload: HandoverPayload): string {
  return jwt.sign(payload, HANDOVER_JWT_SECRET(), { expiresIn: HANDOVER_TOKEN_TTL_SECS })
}

function verifyHandoverToken(token: string): HandoverPayload | null {
  try {
    return jwt.verify(token, HANDOVER_JWT_SECRET()) as HandoverPayload
  } catch {
    return null
  }
}

// Derive a human-readable 6-char code from the full JWT for manual entry
function shortCode(token: string): string {
  // Last 6 chars of the JWT signature segment are URL-safe base64 — readable enough
  const parts = token.split('.')
  const sig = parts[2] ?? ''
  return sig.slice(-6).toUpperCase()
}

// ── SHARED FUND RELEASE ────────────────────────────────────────────────────────
// The single place that captures the Stripe payment and pays the seller. Reached
// by two gates only: (1) QR handover scan — collection & in-person delivery;
// (2) courier first-waypoint scan — tracked delivery. Never call from anywhere else.
type ReleasableTx = {
  id: string; buyerId: string; sellerId: string; listingId: string
  sellerNet: unknown; stripePaymentIntentId: string | null; quantity: number
}

export async function releaseFundsToSeller(
  prisma: PrismaClient,
  tx: ReleasableTx,
  via: 'handover' | 'courier',
) {
  // Capture the held PaymentIntent — funds are NEVER released without this (§10.2)
  if (tx.stripePaymentIntentId) {
    await getStripe().paymentIntents.capture(tx.stripePaymentIntentId)
  }

  // Transfer net proceeds to the seller's connected Stripe account
  let transferId: string | null = null
  const seller = await prisma.user.findUnique({
    where: { id: tx.sellerId },
    select: { stripeAccountId: true },
  })
  if (tx.stripePaymentIntentId && seller?.stripeAccountId) {
    const transfer = await getStripe().transfers.create({
      amount: Math.round(Number(tx.sellerNet) * 100),
      currency: 'eur',
      destination: seller.stripeAccountId,
      metadata: { transactionId: tx.id },
    })
    transferId = transfer.id
  }

  const listing = await prisma.listing.findUnique({ where: { id: tx.listingId }, select: { title: true, stock: true } })
  const now = new Date()

  // Multi-buy: this sale consumes `quantity` units. Mark the listing sold only
  // when the last unit goes; otherwise keep it live with reduced stock.
  const remaining = Math.max(0, (listing?.stock ?? 1) - tx.quantity)
  const listingUpdate = remaining <= 0
    ? { status: 'sold' as const, stock: 0 }
    : { stock: remaining }

  const txData: Prisma.TransactionUpdateInput = {
    status: 'released',
    fundsReleasedAt: now,
    ...(transferId ? { stripeTransferId: transferId } : {}),
    ...(via === 'handover' ? { handoverConfirmedAt: now, handoverQrToken: null } : { firstScanAt: now }),
  }

  await prisma.$transaction([
    prisma.transaction.update({ where: { id: tx.id }, data: txData }),
    prisma.listing.update({ where: { id: tx.listingId }, data: listingUpdate }),
    prisma.user.update({ where: { id: tx.sellerId }, data: { salesCount: { increment: 1 } } }),
    prisma.notification.create({
      data: {
        userId: tx.sellerId,
        kind: 'funds_released',
        title: '💰 Funds released!',
        body: `€${Number(tx.sellerNet).toFixed(2)} for "${listing?.title}" is on its way to you.`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: tx.buyerId,
        kind: via === 'courier' ? 'funds_released' : 'handover_confirmed',
        title: via === 'courier' ? '📦 On its way' : '✅ Handover confirmed',
        body: via === 'courier'
          ? `"${listing?.title}" is in transit. Funds have been released to the seller.`
          : `Your purchase of "${listing?.title}" is complete. Why not leave a review?`,
      },
    }),
  ])

  return { ok: true, sellerNet: Number(tx.sellerNet) }
}

// Courier dispatch. Records that the parcel is moving — this does NOT pay the
// seller. (It used to: funds were released on the first carrier scan, i.e.
// before the buyer had the item. Payment now waits for delivery.)
export async function markCourierShipped(prisma: PrismaClient, trackingNumber: string): Promise<boolean> {
  const res = await prisma.transaction.updateMany({
    where: { trackingNumber, fulfilmentType: 'courier', status: 'held', shippedAt: null },
    data: { shippedAt: new Date() },
  })
  return res.count > 0
}

/**
 * Courier delivery confirmed. Starts both clocks:
 *   • buyer has COURIER_DISPUTE_WINDOW_HOURS (24h) to raise a dispute
 *   • funds auto-release COURIER_RELEASE_HOURS (48h) later, via the cron
 * Idempotent — a repeated delivery event won't restart the timers.
 */
export async function markCourierDelivered(prisma: PrismaClient, trackingNumber: string): Promise<boolean> {
  const tx = await prisma.transaction.findFirst({
    where: { trackingNumber, fulfilmentType: 'courier', status: 'held', deliveredAt: null },
    include: { listing: { select: { title: true } } },
  })
  if (!tx) return false

  const now = new Date()
  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      deliveredAt: now,
      disputeWindowEndsAt: new Date(now.getTime() + COURIER_DISPUTE_WINDOW_HOURS * 3600_000),
      autoReleaseAt: new Date(now.getTime() + COURIER_RELEASE_HOURS * 3600_000),
      ...(tx.shippedAt ? {} : { shippedAt: now }),
    },
  })

  // Tell the buyer their window has started — they must act inside it.
  await prisma.notification.create({
    data: {
      userId: tx.buyerId,
      kind: 'system',
      title: '📦 Delivered — please check your item',
      body: `"${tx.listing.title}" is marked delivered. If something's wrong, raise a dispute within ${COURIER_DISPUTE_WINDOW_HOURS} hours; after that the item is treated as accepted.`,
      actionUrl: '/account',
    },
  })
  return true
}

export const transactionsRouter = router({

  // ── INITIATE ─────────────────────────────────────────────────────────────────
  // Creates a Stripe PaymentIntent (capture_method: manual = funds held, not yet captured)
  initiate: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99).default(1),
      // Buyer intent only: collection vs delivery. The concrete fulfilment
      // (courier vs in-person delivery) is resolved server-side from the listing.
      fulfilment: z.enum(['collection', 'delivery']).default('collection'),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({
        where: { id: input.listingId },
        include: { seller: true },
      })

      if (listing.status !== 'active' && listing.status !== 'grab_it_now') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Listing not available' })
      }
      if (listing.sellerId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot buy your own listing' })
      }
      if (input.quantity > listing.stock) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Only ${listing.stock} in stock` })
      }

      // Resolve fulfilment server-side. If the buyer wants delivery, the listing
      // must offer it; the stored type is courier or in-person per the listing.
      let fulfilmentType: 'collection' | 'courier' | 'delivery' = 'collection'
      let deliveryFee = 0
      if (input.fulfilment === 'delivery') {
        if (!listing.deliveryMethod) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This listing does not offer delivery' })
        }
        fulfilmentType = listing.deliveryMethod === 'courier' ? 'courier' : 'delivery'
        deliveryFee = Number(listing.deliveryFee)
      }

      // ALL monetary calculations server-side — never trust client amounts (§10.2)
      const itemSubtotal = Math.round(Number(listing.price) * input.quantity * 100) / 100
      // Platform fee applies to the item subtotal, not delivery.
      const amount = Math.round((itemSubtotal + deliveryFee) * 100) / 100
      const sellerGrade = listing.seller.grade as keyof typeof FEE_RATES
      const feeRate = FEE_RATES[sellerGrade] ?? FEE_RATES.grabber
      const platformFee = Math.round(itemSubtotal * feeRate * 100) / 100
      const sellerNet = Math.round((amount - platformFee) * 100) / 100

      const paymentIntent = await getStripe().paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'eur',
        capture_method: 'manual', // held in escrow — captured only after QR handover
        metadata: { listingId: listing.id, buyerId: ctx.user.id, sellerId: listing.sellerId },
      })

      const transaction = await ctx.prisma.transaction.create({
        data: {
          listingId: listing.id,
          buyerId: ctx.user.id,
          sellerId: listing.sellerId,
          amount,
          platformFee,
          sellerNet,
          quantity: input.quantity,
          fulfilmentType,
          status: 'pending_payment',
          stripePaymentIntentId: paymentIntent.id,
        },
      })

      return { transaction, clientSecret: paymentIntent.client_secret }
    }),

  // ── MULTI-SELLER CART CHECKOUT ────────────────────────────────────────────────
  // Step 1: collect the buyer's card ONCE. Returns a SetupIntent to save a card
  // against the buyer's Stripe customer; the saved PaymentMethod is then used to
  // authorise each item's escrow PaymentIntent server-side.
  startCartCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await ctx.prisma.cartItem.count({ where: { userId: ctx.user.id } })
    if (count === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your basket is empty' })

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await getStripe().customers.create({ email: user.email, metadata: { userId: user.id } })
      customerId = customer.id
      await ctx.prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }
    const setupIntent = await getStripe().setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
    })
    return { clientSecret: setupIntent.client_secret }
  }),

  // Step 2: with the saved card, create + confirm one manual-capture (escrow)
  // PaymentIntent per basket item. Each becomes its own held transaction released
  // at that item's handover. Per-item failures (declines / SCA) are reported and
  // those items are left in the basket.
  finishCartCheckout: protectedProcedure
    .input(z.object({ paymentMethodId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
      if (!user.stripeCustomerId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No saved card' })

      const cart = await ctx.prisma.cartItem.findMany({
        where: { userId: ctx.user.id },
        include: { listing: { include: { seller: true } } },
      })

      const succeeded: string[] = []
      const failed: { title: string; reason: string }[] = []

      for (const line of cart) {
        const listing = line.listing
        try {
          if (listing.status !== 'active') throw new Error('No longer available')
          if (listing.sellerId === ctx.user.id) throw new Error('Your own listing')
          const qty = Math.min(line.qty, listing.stock)
          if (qty < 1) throw new Error('Out of stock')

          const itemSubtotal = Math.round(Number(listing.price) * qty * 100) / 100
          const amount = itemSubtotal // basket items are collection; delivery handled per-item elsewhere
          const feeRate = FEE_RATES[listing.seller.grade as keyof typeof FEE_RATES] ?? FEE_RATES.grabber
          const platformFee = Math.round(itemSubtotal * feeRate * 100) / 100
          const sellerNet = Math.round((amount - platformFee) * 100) / 100

          const pi = await getStripe().paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'eur',
            capture_method: 'manual',
            customer: user.stripeCustomerId,
            payment_method: input.paymentMethodId,
            confirm: true,
            off_session: true,
            metadata: { listingId: listing.id, buyerId: ctx.user.id, sellerId: listing.sellerId },
          })
          if (pi.status !== 'requires_capture') throw new Error('Card needs authentication — buy this item on its own')

          await ctx.prisma.transaction.create({
            data: {
              listingId: listing.id, buyerId: ctx.user.id, sellerId: listing.sellerId,
              amount, platformFee, sellerNet, quantity: qty, fulfilmentType: 'collection',
              status: 'pending_payment', stripePaymentIntentId: pi.id,
            },
          })
          await ctx.prisma.cartItem.delete({ where: { id: line.id } })
          succeeded.push(listing.title)
        } catch (e) {
          failed.push({ title: listing.title, reason: e instanceof Error ? e.message : 'Payment failed' })
        }
      }

      return { succeeded, failed }
    }),

  // ── GENERATE HANDOVER QR ──────────────────────────────────────────────────────
  // Called by the SELLER once the buyer's payment is held.
  // Returns a QR code image (dataURL) + 6-char short code for manual entry.
  // Funds CANNOT be released without this token being presented by the buyer.
  generateHandoverQr: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({
        where: { id: input.transactionId },
        include: { listing: true },
      })

      if (tx.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the seller can generate a handover QR' })
      }
      if (tx.status !== 'held') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment must be held before generating handover QR' })
      }
      if (tx.fulfilmentType === 'courier') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Courier orders use tracked shipping, not a QR handover. Submit a tracking number instead.' })
      }

      const token = signHandoverToken({ txn: tx.id, sel: tx.sellerId })
      const code = shortCode(token)

      // Store token so confirmHandoverByQr can validate it and prevent replay
      await ctx.prisma.transaction.update({
        where: { id: tx.id },
        data: { handoverQrToken: token },
      })

      // QR encodes a deep link — grabitt://handover?token=<jwt>
      // The manual fallback is the 6-char code shown beneath the QR
      const qrContent = `grabitt://handover?token=${token}&txn=${tx.id}`
      const qrDataUrl = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
      })

      return {
        qrDataUrl,
        shortCode: code,
        expiresInSecs: HANDOVER_TOKEN_TTL_SECS,
        listingTitle: tx.listing.title,
        amount: Number(tx.amount),
      }
    }),

  // ── CONFIRM HANDOVER BY QR ────────────────────────────────────────────────────
  // Called by the BUYER after scanning the seller's QR or entering the short code.
  // This is the single gate for fund release — no other path captures the payment.
  confirmHandoverByQr: protectedProcedure
    .input(z.object({
      transactionId: z.string().uuid(),
      token: z.string().min(1),  // full JWT from QR scan
    }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({
        where: { id: input.transactionId },
        include: { listing: { select: { title: true, id: true } } },
      })

      if (tx.buyerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the buyer can confirm handover' })
      }
      if (tx.status !== 'held') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transaction is not in a held state' })
      }
      if (tx.fulfilmentType === 'courier') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Courier orders release automatically once tracking shows the item in transit — no QR scan is used.' })
      }

      // Validate token
      const payload = verifyHandoverToken(input.token)
      if (!payload) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code has expired or is invalid — ask the seller to generate a new one' })
      }
      if (payload.txn !== tx.id || payload.sel !== tx.sellerId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code does not match this transaction' })
      }
      // Ensure the token stored in DB matches — prevents replay of a previously issued token
      if (tx.handoverQrToken !== input.token) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code has already been used or superseded' })
      }

      // Single fund-release path — captures Stripe payment + pays the seller (§10.2)
      return releaseFundsToSeller(ctx.prisma, tx, 'handover')
    }),

  // ── CONFIRM HANDOVER BY SHORT CODE ───────────────────────────────────────────
  // Manual fallback — buyer types the 6-char code shown beneath the QR.
  confirmHandoverByCode: protectedProcedure
    .input(z.object({
      transactionId: z.string().uuid(),
      code: z.string().length(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({
        where: { id: input.transactionId },
      })

      if (tx.buyerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      if (tx.status !== 'held') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transaction is not in a held state' })
      }
      if (tx.fulfilmentType === 'courier') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Courier orders release automatically once tracking shows the item in transit — no code is used.' })
      }
      if (!tx.handoverQrToken) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Seller has not generated a handover QR yet' })
      }

      // Derive the expected short code from the stored token and compare
      const expectedCode = shortCode(tx.handoverQrToken)
      if (input.code.toUpperCase() !== expectedCode) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Incorrect code — check with the seller' })
      }
      if (!verifyHandoverToken(tx.handoverQrToken)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code has expired — ask the seller to generate a new one' })
      }

      // Single fund-release path — same as the QR scan
      return releaseFundsToSeller(ctx.prisma, tx, 'handover')
    }),

  // Carriers the seller can pick from when adding tracking.
  carriers: publicProcedure.query(() => CARRIERS.map(c => ({ slug: c.slug, name: c.name }))),

  // ── SUBMIT TRACKING (courier fulfilment) ─────────────────────────────────────
  // Postal orders MUST use a tracked service — the tracking number is what
  // proves delivery, which is what starts the payment clock. Funds are not
  // released here, nor on dispatch: see markCourierDelivered.
  submitTracking: protectedProcedure
    .input(z.object({
      transactionId: z.string().uuid(),
      carrier: z.string().min(1).max(60),
      trackingNumber: z.string().min(3).max(60),
    }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({
        where: { id: input.transactionId },
        include: { listing: { select: { title: true } } },
      })
      if (tx.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the seller can submit tracking' })
      }
      if (tx.fulfilmentType !== 'courier') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tracking only applies to courier orders' })
      }
      if (tx.status !== 'held') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment must be held before adding tracking' })
      }

      const carrier = input.carrier.trim()
      const number = input.trackingNumber.trim()
      await ctx.prisma.transaction.update({
        where: { id: tx.id },
        data: { trackingCarrier: carrier, trackingNumber: number, shippedAt: tx.shippedAt ?? new Date() },
      })

      // Ask 17TRACK to watch this parcel; its delivery event is what starts the
      // payout clock. Best-effort — if registration fails the seller isn't
      // blocked, and the buyer can still confirm receipt manually.
      const registered = await registerTracking(number)
      await ctx.prisma.notification.create({
        data: {
          userId: tx.buyerId,
          kind: 'system',
          title: '📦 Your order has shipped',
          body: `"${tx.listing.title}" is on its way via ${carrier} (${number}). You'll have ${COURIER_DISPUTE_WINDOW_HOURS} hours after delivery to report a problem.`,
          actionUrl: '/account',
        },
      })
      return { ok: true, trackingUrl: trackingUrlFor(carrier, number), autoTracked: registered }
    }),

  // ── CONFIRM DELIVERY (courier) ───────────────────────────────────────────────
  // The buyer can confirm receipt themselves rather than waiting for the
  // carrier's event — useful when the carrier doesn't report, or reports late.
  // This starts the same two clocks; it does NOT pay the seller immediately,
  // so the buyer keeps their full dispute window.
  confirmDelivery: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: input.transactionId } })
      if (tx.buyerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the buyer can confirm delivery' })
      }
      if (tx.fulfilmentType !== 'courier') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This order is not a postal delivery' })
      }
      if (tx.status !== 'held') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This order is not awaiting delivery' })
      }
      if (tx.deliveredAt) return { ok: true, alreadyConfirmed: true }
      if (!tx.trackingNumber) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'The seller has not added tracking yet' })
      }
      await markCourierDelivered(ctx.prisma, tx.trackingNumber)
      return { ok: true }
    }),

  // ── RATE ─────────────────────────────────────────────────────────────────────
  rate: protectedProcedure
    .input(RateTransactionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: input.transactionId } })
      const isBuyer = tx.buyerId === ctx.user.id
      const isSeller = tx.sellerId === ctx.user.id

      if (!isBuyer && !isSeller) throw new TRPCError({ code: 'FORBIDDEN' })
      if (tx.status !== 'released') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only rate after handover' })

      const subjectId = isBuyer ? tx.sellerId : tx.buyerId

      try {
        await ctx.prisma.review.create({
          data: {
            transactionId: tx.id,
            authorId: ctx.user.id,
            subjectId,
            rating: input.rating,
            accuracyRating: input.accuracyRating ?? null,
            communicationRating: input.communicationRating ?? null,
            speedRating: input.speedRating ?? null,
            comment: input.comment ?? null,
          },
        })
      } catch (err) {
        // One review per person per order (unique transactionId+authorId).
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new TRPCError({ code: 'CONFLICT', message: "You've already reviewed this order." })
        }
        throw err
      }

      const agg = await ctx.prisma.review.aggregate({
        where: { subjectId },
        _avg: { rating: true },
      })
      await ctx.prisma.user.update({
        where: { id: subjectId },
        data: { avgRating: agg._avg.rating },
      })

      return { ok: true }
    }),

  // ── QUERIES ───────────────────────────────────────────────────────────────────
  myPurchases: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.transaction.findMany({
      where: { buyerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: true },
    })
  ),

  mySales: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.transaction.findMany({
      where: { sellerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { listing: true },
    })
  ),

  // Single transaction detail — buyer or seller only.
  getById: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({
        where: { id: input.transactionId },
        include: {
          listing: { select: { title: true, images: true } },
          buyer: { select: { id: true, displayName: true } },
          seller: { select: { id: true, displayName: true, phone: true, collectionAddress: true } },
          dispute: { select: { status: true, reason: true } },
        },
      })
      if (tx.buyerId !== ctx.user.id && tx.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const isBuyer = tx.buyerId === ctx.user.id
      // Has this user already left their review for this order? Drives the
      // "Leave a review" vs "✓ Reviewed" state, so they can't hit the unique
      // constraint by opening the panel twice.
      const myReview = await ctx.prisma.review.findUnique({
        where: { transactionId_authorId: { transactionId: tx.id, authorId: ctx.user.id } },
        select: { id: true },
      })
      // Seller's collection details are released to the BUYER only once the sale
      // is paid (held onward) and it's a collection fulfilment — never before.
      const paidStatuses = ['held', 'confirmed_handover', 'completed', 'released']
      const collectionRevealed = isBuyer && tx.fulfilmentType === 'collection' && paidStatuses.includes(tx.status)
      return {
        id: tx.id,
        status: tx.status,
        role: isBuyer ? 'buyer' : 'seller',
        hasReviewed: !!myReview,
        title: tx.listing.title,
        image: tx.listing.images?.[0] ?? null,
        amount: Number(tx.amount),
        sellerNet: Number(tx.sellerNet),
        quantity: tx.quantity,
        fulfilmentType: tx.fulfilmentType,
        trackingCarrier: tx.trackingCarrier,
        trackingNumber: tx.trackingNumber,
        trackingUrl: tx.trackingCarrier && tx.trackingNumber ? trackingUrlFor(tx.trackingCarrier, tx.trackingNumber) : null,
        shippedAt: tx.shippedAt,
        deliveredAt: tx.deliveredAt,
        // Buyer's window to report a problem; once past, the item is accepted.
        disputeWindowEndsAt: tx.disputeWindowEndsAt,
        disputeWindowOpen: !!tx.disputeWindowEndsAt && new Date() < tx.disputeWindowEndsAt,
        // When the seller gets paid if nothing is raised.
        autoReleaseAt: tx.autoReleaseAt,
        counterparty: isBuyer ? tx.seller.displayName : tx.buyer.displayName,
        collectionDetails: collectionRevealed
          ? { sellerName: tx.seller.displayName, phone: tx.seller.phone ?? null, address: tx.seller.collectionAddress ?? null }
          : null,
        dispute: tx.dispute,
        createdAt: tx.createdAt,
      }
    }),

  getHandoverStatus: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({
        where: { id: input.transactionId },
        include: { listing: { select: { title: true } } },
      })
      const isBuyer = tx.buyerId === ctx.user.id
      const isSeller = tx.sellerId === ctx.user.id
      if (!isBuyer && !isSeller) throw new TRPCError({ code: 'FORBIDDEN' })

      return {
        status: tx.status,
        role: isBuyer ? 'buyer' : 'seller',
        hasQrReady: !!tx.handoverQrToken,
        listingTitle: tx.listing.title,
        amount: Number(tx.amount),
        sellerNet: Number(tx.sellerNet),
      }
    }),
})
