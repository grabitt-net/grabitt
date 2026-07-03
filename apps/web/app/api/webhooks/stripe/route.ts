import { verifyAndHandleStripe } from 'server/src/webhooks/stripe'

// Stripe webhook — receives payment/transfer events. Needs the RAW body for
// signature verification, so we read req.text() (Next doesn't pre-parse here).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Missing signature', { status: 400 })
  const body = await req.text()
  try {
    await verifyAndHandleStripe(body, sig)
  } catch (err) {
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 })
  }
  return Response.json({ received: true })
}
