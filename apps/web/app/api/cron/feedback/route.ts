import { prisma } from 'server/src/db'
import { sweepFeedback } from 'server/src/lib/feedbackSweep'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Terms Rule A/B — feedback auto-completion sweep. For released sales the buyer
// hasn't reviewed: sends a 24h final warning at 3 days, then auto-completes as a
// deemed-positive at 4 days (and docks the buyer's standing). Triggered by
// Vercel Cron (see vercel.json); protected by CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }
  try {
    const result = await sweepFeedback(prisma)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('feedback sweep failed', err)
    return Response.json({ ok: false, error: 'Feedback sweep failed' }, { status: 500 })
  }
}
