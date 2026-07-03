import type { Request, Response } from 'express'
import { prisma } from '../db'
import { releaseCourierByTracking } from '../routers/transactions'

// Courier tracking webhook. A tracking provider (AfterShip, EasyPost, etc.) or
// the carrier posts status events here. When an event reports the FIRST waypoint
// scan — i.e. the parcel is now "in transit" — we release the held funds to the
// seller for the matching courier order (§ delivery fund-release rule).

const IN_TRANSIT_STATUSES = new Set([
  'in_transit', 'intransit', 'in transit', 'transit',
  'accepted', 'picked_up', 'pickup', 'collected', 'out_for_delivery',
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
  if (!IN_TRANSIT_STATUSES.has(status)) {
    return { status: 200, body: { ok: true, released: false, reason: `status "${status}" is not an in-transit event` } }
  }
  const released = await releaseCourierByTracking(prisma, trackingNumber)
  return { status: 200, body: { ok: true, released } }
}

export function trackingSecretValid(provided: string | undefined | null): boolean {
  const expected = process.env.TRACKING_WEBHOOK_SECRET
  return !expected || provided === expected
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
    console.error('tracking webhook release failed', err)
    return res.status(500).json({ error: 'Fund release failed' })
  }
}
