import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { prisma } from '../db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

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
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.transaction.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'held' },
      })
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
