import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Singleton Stripe.js loader. The publishable key is safe to expose client-side.
let stripePromise: Promise<Stripe | null> | null = null

export function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    stripePromise = key ? loadStripe(key) : Promise.resolve(null)
  }
  return stripePromise
}
