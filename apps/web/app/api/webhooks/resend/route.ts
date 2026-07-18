import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verifies a Svix-signed webhook (the scheme Resend uses), implemented directly
// so we don't add a dependency — CI installs with --frozen-lockfile.
//
// Signature base is `${id}.${timestamp}.${body}`, HMAC-SHA256 with the secret's
// base64 payload, compared in constant time against any v1 signature offered.
function verifySignature(secret: string, id: string, timestamp: string, body: string, header: string): boolean {
  // Reject replays: Svix recommends a 5-minute tolerance.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
  const expectedBuf = Buffer.from(expected)

  // Header is space-separated "v1,<sig>" pairs — any match is valid.
  return header.split(' ').some(part => {
    const sig = part.split(',')[1]
    if (!sig) return false
    const sigBuf = Buffer.from(sig)
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)
  })
}

// Resend delivery + engagement events. This is what makes open/click rates real:
// we match each event back to its EshotRecipient via the Resend email id we
// stored at send time, then roll the counters up onto the campaign.
//
// Resend signs webhooks with Svix. Verification is mandatory — without it anyone
// could POST fake opens and corrupt your reporting.
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })

  const payload = await req.text()
  const id = req.headers.get('svix-id') ?? ''
  const timestamp = req.headers.get('svix-timestamp') ?? ''
  const signature = req.headers.get('svix-signature') ?? ''

  if (!id || !timestamp || !signature || !verifySignature(secret, id, timestamp, payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { type: string; data: { email_id?: string } }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const resendId = event.data?.email_id
  if (!resendId) return NextResponse.json({ ok: true, ignored: 'no email id' })

  const recipient = await prisma.eshotRecipient.findUnique({ where: { resendId } })
  // Not one of ours (e.g. a transactional email) — acknowledge and move on.
  if (!recipient) return NextResponse.json({ ok: true, ignored: 'not a campaign email' })

  const now = new Date()

  switch (event.type) {
    case 'email.delivered':
      await prisma.$transaction([
        prisma.eshotRecipient.update({ where: { id: recipient.id }, data: { status: 'delivered' } }),
        prisma.eshot.update({ where: { id: recipient.eshotId }, data: { deliveredCount: { increment: 1 } } }),
      ])
      break

    case 'email.opened':
      await prisma.$transaction([
        prisma.eshotRecipient.update({
          where: { id: recipient.id },
          data: { openCount: { increment: 1 }, ...(recipient.openedAt ? {} : { openedAt: now }) },
        }),
        // Campaign openCount counts UNIQUE openers, so only the first open of
        // each recipient increments it — otherwise one person refreshing would
        // push the rate over 100%.
        ...(recipient.openedAt ? [] : [
          prisma.eshot.update({ where: { id: recipient.eshotId }, data: { openCount: { increment: 1 } } }),
        ]),
      ])
      break

    case 'email.clicked':
      await prisma.$transaction([
        prisma.eshotRecipient.update({
          where: { id: recipient.id },
          data: { clickCount: { increment: 1 }, ...(recipient.clickedAt ? {} : { clickedAt: now }) },
        }),
        ...(recipient.clickedAt ? [] : [
          prisma.eshot.update({ where: { id: recipient.eshotId }, data: { clickCount: { increment: 1 } } }),
        ]),
      ])
      break

    case 'email.bounced':
      await prisma.$transaction([
        prisma.eshotRecipient.update({ where: { id: recipient.id }, data: { status: 'bounced', bouncedAt: now } }),
        prisma.eshot.update({ where: { id: recipient.eshotId }, data: { bounceCount: { increment: 1 } } }),
      ])
      break

    case 'email.complained':
      // A spam complaint is an unambiguous withdrawal of consent — stop
      // marketing to them immediately, regardless of what the flag said.
      await prisma.$transaction([
        prisma.eshotRecipient.update({ where: { id: recipient.id }, data: { status: 'complained' } }),
        prisma.eshot.update({ where: { id: recipient.eshotId }, data: { complaintCount: { increment: 1 } } }),
        ...(recipient.userId ? [
          prisma.user.update({
            where: { id: recipient.userId },
            data: { marketingConsent: false, marketingConsentAt: null },
          }),
        ] : []),
      ])
      break
  }

  return NextResponse.json({ ok: true })
}
