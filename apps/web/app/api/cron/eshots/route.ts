import { prisma } from 'server/src/db'
import { runDueEshots } from 'server/src/lib/eshotSend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sends scheduled e-shots whose time has arrived (one-off and recurring).
// Call this hourly from the external scheduler (same as the other /api/cron/*
// endpoints); protected by CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }
  const res = await runDueEshots(prisma)
  return Response.json({ ok: true, ...res })
}
