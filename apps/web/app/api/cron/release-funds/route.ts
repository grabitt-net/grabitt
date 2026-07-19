import { prisma } from 'server/src/db'
import { autoReleaseDueFunds } from 'server/src/lib/autoRelease'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Releasing money must not be cut short half-way through a batch.
export const maxDuration = 60

// Pays sellers whose funds are due for release:
//   • Postal/courier — 48h after delivery was confirmed
//   • Collection     — 14 days after handover, if the buyer never confirmed
//
// Orders with an open dispute are always skipped: money stays held until the
// dispute is resolved.
//
// This exists because the original auto-release lived in a pg-boss job that was
// never started (nothing calls initJobs, and pg-boss needs a long-running
// worker that serverless can't provide) — so funds were never auto-released at
// all. Triggered by Vercel Cron (see vercel.json); protected by CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await autoReleaseDueFunds(prisma)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('auto-release failed', err)
    return Response.json({ ok: false, error: 'Auto-release failed' }, { status: 500 })
  }
}
