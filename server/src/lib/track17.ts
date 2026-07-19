// 17TRACK integration — the delivery detection behind postal fund release.
//
// Flow:
//   1. Seller submits tracking  → we REGISTER the number with 17TRACK
//   2. 17TRACK polls the carrier → pushes status events to our webhook
//   3. A "Delivered" event       → starts the buyer's 24h window + 48h payout
//
// Docs: https://api.17track.net/en/doc?version=v2.2
const API_BASE = 'https://api.17track.net/track/v2.2'

/**
 * Registers a tracking number so 17TRACK starts watching it and pushes events.
 *
 * The carrier is deliberately NOT sent: 17TRACK auto-detects it from the number
 * format, which is more reliable than mapping our carrier list onto their
 * numeric codes and getting one wrong.
 *
 * Returns false rather than throwing — a registration failure must not stop the
 * seller adding tracking. The buyer can still confirm receipt manually, and the
 * parcel is still trackable via the carrier link.
 */
export async function registerTracking(trackingNumber: string): Promise<boolean> {
  const key = process.env.TRACK17_API_KEY
  if (!key) return false

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { '17token': key, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ number: trackingNumber }]),
    })
    if (!res.ok) return false
    const json = await res.json() as { code?: number; data?: { accepted?: unknown[]; rejected?: unknown[] } }
    // code 0 = OK. A number already registered comes back rejected, which is
    // still a success from our point of view — it's being watched either way.
    return json?.code === 0 && (json.data?.accepted?.length ?? 0) + (json.data?.rejected?.length ?? 0) > 0
  } catch {
    return false
  }
}

/** Stops tracking a number — used once funds are released and we're done. */
export async function stopTracking(trackingNumber: string): Promise<boolean> {
  const key = process.env.TRACK17_API_KEY
  if (!key) return false
  try {
    const res = await fetch(`${API_BASE}/stoptrack`, {
      method: 'POST',
      headers: { '17token': key, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ number: trackingNumber }]),
    })
    return res.ok
  } catch {
    return false
  }
}

// 17TRACK's status vocabulary.
const DELIVERED = new Set(['delivered'])
const IN_TRANSIT = new Set(['inforeceived', 'intransit', 'availableforpickup', 'outfordelivery'])

export type TrackEvent = { trackingNumber: string; state: 'delivered' | 'in_transit' | 'other'; raw: string }

/**
 * Parses a 17TRACK webhook body into something we can act on.
 *
 * Expected shape (v2.2):
 *   { event: "TRACKING_UPDATED", data: { number, track_info: { latest_status: { status } } } }
 *
 * Falls back to looser field names so a payload tweak on their side, or a
 * different provider posting here, still resolves rather than silently failing.
 */
export function parseTrack17Webhook(body: Record<string, unknown>): TrackEvent | null {
  const data = (body.data ?? body) as Record<string, unknown>
  const trackingNumber = firstString(data, ['number', 'trackingNumber', 'tracking_number'])
  if (!trackingNumber) return null

  const trackInfo = (data.track_info ?? {}) as Record<string, unknown>
  const latest = (trackInfo.latest_status ?? {}) as Record<string, unknown>
  const raw = (
    firstString(latest, ['status']) ??
    firstString(data, ['status', 'tag', 'current_status']) ??
    ''
  )
  const norm = raw.toLowerCase().replace(/[\s_-]/g, '')

  return {
    trackingNumber,
    state: DELIVERED.has(norm) ? 'delivered' : IN_TRANSIT.has(norm) ? 'in_transit' : 'other',
    raw,
  }
}

function firstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
  }
  return undefined
}
