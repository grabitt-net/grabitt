import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { prisma } from '../db'
import { grantCreditPack } from '../routers/credits'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).send('Missing signature')

  let event: Stripe.Event
  try {
    // Signature validation MUST happen before any processing (§10.2)
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return res.status(400).send(`Webhook error: ${(err as Error).message}`)
  }

  switch (event.type) {
    // Escrow purchases use capture_method: 'manual'. When the buyer authorises
    // the card, Stripe fires amount_capturable_updated — funds are now HELD
    // (not yet captured). Capture happens later at handover/tracking release.
    case 'payment_intent.amount_capturable_updated': {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.transaction.updateMany({
        where: { stripePaymentIntentId: pi.id, status: 'pending_payment' },
        data: { status: 'held' },
      })
      break
    }
    // Fires after capture (purchase release) OR immediately for auto-capture
    // intents such as credit-pack top-ups. Only credit packs need action here.
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.kind === 'credit_pack' && pi.metadata.userId && pi.metadata.packId) {
        await grantCreditPack(prisma, pi.metadata.userId, pi.metadata.packId, pi.id)
      }
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

  res.json({ received: true })
}
