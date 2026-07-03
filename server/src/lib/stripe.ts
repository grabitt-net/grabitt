import Stripe from 'stripe'

// Lazily construct the Stripe client so that merely importing a router/webhook
// does NOT require STRIPE_SECRET_KEY to be set (it would throw at import/build
// time otherwise). The client is created on first actual use, at runtime.
let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-02-24.acacia' })
  }
  return client
}
