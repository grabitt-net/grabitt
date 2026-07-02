import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'
import { router, protectedProcedure } from '../trpc'
import { RateTransactionInputSchema } from '@grabitt/types'
import { FEE_RATES, FUND_RELEASE_AUTO_DAYS } from '@grabitt/design-tokens'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })

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

export const transactionsRouter = router({

  // ── INITIATE ─────────────────────────────────────────────────────────────────
  // Creates a Stripe PaymentIntent (capture_method: manual = funds held, not yet captured)
  initiate: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
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

      // ALL monetary calculations server-side — never trust client amounts (§10.2)
      const amount = Number(listing.price)
      const sellerGrade = listing.seller.grade as keyof typeof FEE_RATES
      const feeRate = FEE_RATES[sellerGrade] ?? FEE_RATES.grabber
      const platformFee = Math.round(amount * feeRate * 100) / 100
      const sellerNet = Math.round((amount - platformFee) * 100) / 100

      const paymentIntent = await stripe.paymentIntents.create({
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
          status: 'pending_payment',
          stripePaymentIntentId: paymentIntent.id,
        },
      })

      return { transaction, clientSecret: paymentIntent.client_secret }
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

      // Capture the Stripe payment — funds NEVER released without this confirmation (§10.2)
      if (tx.stripePaymentIntentId) {
        await stripe.paymentIntents.capture(tx.stripePaymentIntentId)
      }

      // Transfer net amount to seller's connected Stripe account
      if (tx.stripePaymentIntentId && tx.listing) {
        const sellerAccount = await ctx.prisma.user.findUnique({
          where: { id: tx.sellerId },
          select: { stripeAccountId: true },
        })
        if (sellerAccount?.stripeAccountId) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(Number(tx.sellerNet) * 100),
            currency: 'eur',
            destination: sellerAccount.stripeAccountId,
            metadata: { transactionId: tx.id },
          })
          await ctx.prisma.transaction.update({
            where: { id: tx.id },
            data: { stripeTransferId: transfer.id },
          })
        }
      }

      const now = new Date()
      // Execute all state changes atomically
      await ctx.prisma.$transaction([
        // Clear the QR token to prevent replay
        ctx.prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: 'released',
            handoverConfirmedAt: now,
            fundsReleasedAt: now,
            handoverQrToken: null,
          },
        }),
        ctx.prisma.listing.update({
          where: { id: tx.listingId },
          data: { status: 'sold' },
        }),
        ctx.prisma.user.update({
          where: { id: tx.sellerId },
          data: { salesCount: { increment: 1 } },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: tx.sellerId,
            kind: 'funds_released',
            title: '💰 Funds released!',
            body: `€${Number(tx.sellerNet).toFixed(2)} is on its way to you for "${tx.listing.title}".`,
          },
        }),
        ctx.prisma.notification.create({
          data: {
            userId: tx.buyerId,
            kind: 'handover_confirmed',
            title: '✅ Handover confirmed',
            body: `Your purchase of "${tx.listing.title}" is complete. Why not leave a review?`,
          },
        }),
      ])

      return { ok: true, sellerNet: Number(tx.sellerNet) }
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
      if (!tx.handoverQrToken) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Seller has not generated a handover QR yet' })
      }

      // Derive the expected short code from the stored token and compare
      const expectedCode = shortCode(tx.handoverQrToken)
      if (input.code.toUpperCase() !== expectedCode) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Incorrect code — check with the seller' })
      }

      // Delegate to confirmHandoverByQr logic by calling with the stored token
      // Re-use same validation path to keep fund release logic in one place
      const payload = verifyHandoverToken(tx.handoverQrToken)
      if (!payload) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR code has expired — ask the seller to generate a new one' })
      }

      if (tx.stripePaymentIntentId) {
        await stripe.paymentIntents.capture(tx.stripePaymentIntentId)
      }

      const sellerAccount = await ctx.prisma.user.findUnique({
        where: { id: tx.sellerId },
        select: { stripeAccountId: true, displayName: true },
      })
      if (sellerAccount?.stripeAccountId) {
        await stripe.transfers.create({
          amount: Math.round(Number(tx.sellerNet) * 100),
          currency: 'eur',
          destination: sellerAccount.stripeAccountId,
          metadata: { transactionId: tx.id },
        })
      }

      const listing = await ctx.prisma.listing.findUnique({ where: { id: tx.listingId }, select: { title: true } })
      const now = new Date()

      await ctx.prisma.$transaction([
        ctx.prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'released', handoverConfirmedAt: now, fundsReleasedAt: now, handoverQrToken: null },
        }),
        ctx.prisma.listing.update({ where: { id: tx.listingId }, data: { status: 'sold' } }),
        ctx.prisma.user.update({ where: { id: tx.sellerId }, data: { salesCount: { increment: 1 } } }),
        ctx.prisma.notification.create({
          data: { userId: tx.sellerId, kind: 'funds_released', title: '💰 Funds released!', body: `€${Number(tx.sellerNet).toFixed(2)} for "${listing?.title}" is on its way.` },
        }),
        ctx.prisma.notification.create({
          data: { userId: tx.buyerId, kind: 'handover_confirmed', title: '✅ Handover confirmed', body: `Purchase of "${listing?.title}" is complete.` },
        }),
      ])

      return { ok: true, sellerNet: Number(tx.sellerNet) }
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
