import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { getStripe } from '../lib/stripe'
import { prisma } from '../db'
import { grantCreditPack } from '../routers/credits'


// Processes a verified Stripe event. Shared by the Express server and the
// Next.js /api/webhooks/stripe route handler.
export async function handleStripeEvent(event: Stripe.Event) {
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
