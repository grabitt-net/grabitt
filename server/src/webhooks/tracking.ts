import type { Request, Response } from 'express'
import { prisma } from '../db'
import { markCourierDelivered, markCourierShipped } from '../routers/transactions'

// Courier tracking webhook. A tracking provider (AfterShip, EasyPost, etc.) or
// the carrier posts status events here.
//
// IMPORTANT: a DELIVERED event is what starts the payment clock — funds release
// 48h later, and the buyer's 24h dispute window opens. In-transit events only
// record dispatch. (This used to release funds on the first scan, paying the
// seller while the parcel was still in the van.)

const IN_TRANSIT_STATUSES = new Set([
  'in_transit', 'intransit', 'in transit', 'transit',
  'accepted', 'picked_up', 'pickup', 'collected', 'out_for_delivery',
])

const DELIVERED_STATUSES = new Set([
  'delivered', 'delivery', 'completed', 'signed', 'collected_by_recipient',
])

function pick(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

type TrackingResult = { status: number; body: Record<string, unknown> }

// Processes a tracking payload. Shared by the Express server and the Next.js
// /api/webhooks/tracking route handler. `secretOk` must already be validated.
export async function handleTrackingPayload(body: Record<string, unknown>): Promise<TrackingResult> {
  const inner = (body.data as Record<string, unknown>) ?? (body.msg as Record<string, unknown>) ?? body
  const trackingNumber = pick(inner, ['trackingNumber', 'tracking_number', 'number', 'tracking'])
  const status = (pick(inner, ['status', 'tag', 'checkpoint_status', 'current_status']) ?? '').toLowerCase()

  if (!trackingNumber) return { status: 400, body: { error: 'Missing tracking number' } }

  if (DELIVERED_STATUSES.has(status)) {
    const delivered = await markCourierDelivered(prisma, trackingNumber)
    return { status: 200, body: { ok: true, delivered } }
  }
  if (IN_TRANSIT_STATUSES.has(status)) {
    const shipped = await markCourierShipped(prisma, trackingNumber)
    return { status: 200, body: { ok: true, shipped, delivered: false } }
  }
  return { status: 200, body: { ok: true, ignored: `status "${status}" is not a tracked event` } }
}

// Fails CLOSED: without a configured secret we reject everything. Previously an
// unset secret accepted any request, so anyone who could guess a tracking
// number could fake a delivery event and trigger a payout.
export function trackingSecretValid(provided: string | undefined | null): boolean {
  const expected = process.env.TRACKING_WEBHOOK_SECRET
  if (!expected) return false
  return provided === expected
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
