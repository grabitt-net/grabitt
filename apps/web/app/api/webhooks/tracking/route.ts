import { handleTrackingPayload, trackingSecretValid } from 'server/src/webhooks/tracking'

// 17TRACK courier tracking webhook. A DELIVERED event starts the buyer's 24h
// window to report a problem and the seller's 48h payout clock; in-transit
// events only record dispatch. Funds are released by /api/cron/release-funds,
// never here.
//
// Configure in 17TRACK as:
//   https://www.grabitt.net/api/webhooks/tracking?secret=<TRACKING_WEBHOOK_SECRET>
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // 17TRACK can't send custom headers, so accept the secret from the query
  // string as well as the header.
  const secret = new URL(req.url).searchParams.get('secret') ?? req.headers.get('x-tracking-secret')
  if (!trackingSecretValid(secret)) {
    return Response.json({ error: 'Invalid tracking webhook secret' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* empty/invalid body */ }

  try {
    const result = await handleTrackingPayload(body)
    return Response.json(result.body, { status: result.status })
  } catch (err) {
    console.error('tracking webhook failed', err)
    return Response.json({ error: 'Tracking update failed' }, { status: 500 })
  }
}
