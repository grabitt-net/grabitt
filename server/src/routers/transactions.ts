import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'
import { router, protectedProcedure } from '../trpc'
import { RateTransactionInputSchema } from '@grabitt/types'
import { FEE_RATES, FUND_RELEASE_AUTO_DAYS } from '@grabitt/design-tokens'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

export const transactionsRouter = router({
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

      // ALL monetary calculations server-side — never trust client amounts
      const amount = Number(listing.price)
      const sellerGrade = listing.seller.grade as keyof typeof FEE_RATES
      const feeRate = FEE_RATES[sellerGrade] ?? FEE_RATES.grabber
      const platformFee = Math.round(amount * feeRate * 100) / 100
      const sellerNet = Math.round((amount - platformFee) * 100) / 100

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'eur',
        capture_method: 'manual', // held, not captured immediately
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

  confirmHandover: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: input.transactionId } })

      if (tx.buyerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      if (tx.status !== 'held') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment not held' })
      }

      const autoReleaseAt = new Date()
      autoReleaseAt.setDate(autoReleaseAt.getDate() + FUND_RELEASE_AUTO_DAYS)

      return ctx.prisma.transaction.update({
        where: { id: input.transactionId },
        data: {
          status: 'confirmed_handover',
          handoverConfirmedAt: new Date(),
          autoReleaseAt,
        },
      })
    }),

  rate: protectedProcedure
    .input(RateTransactionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: input.transactionId } })
      const isBuyer = tx.buyerId === ctx.user.id
      const isSeller = tx.sellerId === ctx.user.id

      if (!isBuyer && !isSeller) throw new TRPCError({ code: 'FORBIDDEN' })

      const subjectId = isBuyer ? tx.sellerId : tx.buyerId

      await ctx.prisma.review.create({
        data: {
          transactionId: tx.id,
          authorId: ctx.user.id,
          subjectId,
          rating: input.rating,
          comment: input.comment,
        },
      })

      // Recalculate subject avg rating
      const agg = await ctx.prisma.review.aggregate({
        where: { subjectId },
        _avg: { rating: true },
      })
      await ctx.prisma.user.update({
        where: { id: subjectId },
        data: { avgRating: agg._avg.rating },
      })

      // Update transaction rating field
      await ctx.prisma.transaction.update({
        where: { id: tx.id },
        data: isBuyer ? { buyerRating: input.rating } : { sellerRating: input.rating },
      })

      return { ok: true }
    }),

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
})
