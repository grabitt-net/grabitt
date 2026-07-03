import type { Request, Response } from 'express'
import { prisma } from '../db'
import { releaseCourierByTracking } from '../routers/transactions'

// Courier tracking webhook. A tracking provider (AfterShip, EasyPost, etc.) or
// the carrier posts status events here. When an event reports the FIRST waypoint
// scan — i.e. the parcel is now "in transit" — we release the held funds to the
// seller for the matching courier order (§ delivery fund-release rule).
//
// Payload is provider-agnostic: we read a tracking number and a status from the
// common field names. Secure with TRACKING_WEBHOOK_SECRET (sent as the
// `x-tracking-secret` header) so only the provider can trigger releases.

// Statuses that mean the parcel has had its first scan / is moving.
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

export async function trackingWebhookHandler(req: Request, res: Response) {
  const expected = process.env.TRACKING_WEBHOOK_SECRET
  if (expected && req.header('x-tracking-secret') !== expected) {
    return res.status(401).json({ error: 'Invalid tracking webhook secret' })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  // Some providers nest the event under `msg` / `data`.
  const inner = (body.data as Record<string, unknown>) ?? (body.msg as Record<string, unknown>) ?? body

  const trackingNumber = pick(inner, ['trackingNumber', 'tracking_number', 'number', 'tracking'])
  const status = (pick(inner, ['status', 'tag', 'checkpoint_status', 'current_status']) ?? '').toLowerCase()

  if (!trackingNumber) {
    return res.status(400).json({ error: 'Missing tracking number' })
  }

  if (!IN_TRANSIT_STATUSES.has(status)) {
    // Not a first-scan / in-transit event — acknowledge without releasing.
    return res.json({ ok: true, released: false, reason: `status "${status}" is not an in-transit event` })
  }

  try {
    const released = await releaseCourierByTracking(prisma, trackingNumber)
    return res.json({ ok: true, released })
  } catch (err) {
    console.error('tracking webhook release failed', err)
    return res.status(500).json({ error: 'Fund release failed' })
  }
}
