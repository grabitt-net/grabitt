import type { Request, Response } from 'express'
import { prisma } from '../db'
import { markCourierDelivered, markCourierShipped } from '../routers/transactions'
import { parseTrack17Webhook } from '../lib/track17'

// Courier tracking webhook — 17TRACK pushes parcel status events here.
//
// IMPORTANT: a DELIVERED event is what starts the payment clock — funds release
// 48h later, and the buyer's 24h dispute window opens. In-transit events only
// record dispatch. (This used to release funds on the first scan, paying the
// seller while the parcel was still in the van.)

type TrackingResult = { status: number; body: Record<string, unknown> }

// Processes a tracking payload. Shared by the Express server and the Next.js
// /api/webhooks/tracking route handler. The secret must already be validated.
export async function handleTrackingPayload(body: Record<string, unknown>): Promise<TrackingResult> {
  const event = parseTrack17Webhook(body)
  if (!event) return { status: 400, body: { error: 'Missing tracking number' } }

  if (event.state === 'delivered') {
    const delivered = await markCourierDelivered(prisma, event.trackingNumber)
    return { status: 200, body: { ok: true, delivered } }
  }
  if (event.state === 'in_transit') {
    const shipped = await markCourierShipped(prisma, event.trackingNumber)
    return { status: 200, body: { ok: true, shipped, delivered: false } }
  }
  // Exceptions, failed delivery attempts etc. are recorded by 17TRACK but don't
  // move money either way — acknowledge so they aren't retried forever.
  return { status: 200, body: { ok: true, ignored: `status "${event.raw}" does not affect release` } }
}

// Fails CLOSED: without a configured secret we reject everything. Previously an
// unset secret accepted any request, so anyone who could guess a tracking
// number could fake a delivery event and trigger a payout.
//
// 17TRACK posts to a URL you configure and doesn't let you set custom headers,
// so the secret travels in the query string:
//   https://www.grabitt.net/api/webhooks/tracking?secret=…
// The header form is still accepted for anything that can send one.
export function trackingSecretValid(provided: string | undefined | null): boolean {
  const expected = process.env.TRACKING_WEBHOOK_SECRET
  if (!expected || !provided) return false
  // Constant-time-ish: compare lengths first, then contents.
  return provided.length === expected.length && provided === expected
}

// Express adapter (standalone server)
export async function trackingWebhookHandler(req: Request, res: Response) {
  if (!trackingSecretValid(req.header('x-tracking-secret'))) {
    return res.status(401).json({ error: 'Invalid tracking webhook secret' })
  }
  try {
    const result = await handleTrackingPayload((req.body ?? {}) as Record<string, unknown>)
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('tracking webhook failed', err)
    return res.status(500).json({ error: 'Tracking update failed' })
  }
}
