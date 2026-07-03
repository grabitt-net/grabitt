import { handleTrackingPayload, trackingSecretValid } from 'server/src/webhooks/tracking'

// Courier tracking webhook — releases held funds on the first waypoint scan.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!trackingSecretValid(req.headers.get('x-tracking-secret'))) {
    return Response.json({ error: 'Invalid tracking webhook secret' }, { status: 401 })
  }
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* empty/invalid body */ }
  try {
    const result = await handleTrackingPayload(body)
    return Response.json(result.body, { status: result.status })
  } catch (err) {
    console.error('tracking webhook release failed', err)
    return Response.json({ error: 'Fund release failed' }, { status: 500 })
  }
}
