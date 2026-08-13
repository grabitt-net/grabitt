import type { PrismaClient } from '@prisma/client'

// E-shot delivery. Replaces the old pg-boss job, which never ran (nothing called
// initJobs, and pg-boss needs a long-running worker — impossible on serverless).
//
// Two rules are non-negotiable here:
//   1. Marketing goes ONLY to users with marketingConsent = true. Consent is the
//      GDPR lawful basis stated in our Privacy Policy.
//   2. Every email carries a working unsubscribe link and List-Unsubscribe
//      headers, which is both a legal requirement and a deliverability signal.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'
const FROM_EMAIL = 'noreply@grabitt.net'
const BATCH = 100 // Resend's per-call batch limit

export type Segment =
  | 'all' | 'grabber' | 'dealer' | 'trader' | 'pro' | 'business'
  | 'inactive_30' | 'inactive_60' | 'new_members'

// Everyone in a segment who may lawfully be emailed marketing.
export function segmentWhere(segment: Segment) {
  const days = (n: number) => new Date(Date.now() - n * 86400000)
  const base = {
    marketingConsent: true,   // lawful basis
    deletedAt: null,          // erased accounts
  } as Record<string, unknown>

  switch (segment) {
    case 'all': return base
    case 'business': return { ...base, isBusiness: true }
    case 'new_members': return { ...base, createdAt: { gte: days(30) } }
    // "Inactive" = joined a while ago and has never sold. A lastSeenAt field
    // would be better; we don't track one yet.
    case 'inactive_30': return { ...base, createdAt: { lte: days(30) }, salesCount: 0 }
    case 'inactive_60': return { ...base, createdAt: { lte: days(60) }, salesCount: 0 }
    default: return { ...base, grade: segment }
  }
}

export function countAudience(prisma: PrismaClient, segment: Segment) {
  return prisma.user.count({ where: segmentWhere(segment) as never })
}

// Wraps the campaign body in a shell carrying the unsubscribe footer.
function wrap(bodyHtml: string, unsubUrl: string, preheader?: string | null) {
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>`
    : ''
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f4ee">
${pre}
<div style="max-width:600px;margin:0 auto;padding:20px;font-family:Nunito,Arial,sans-serif;color:#1a1a1a">
${bodyHtml}
<hr style="border:none;border-top:1px solid #e8dcc0;margin:28px 0 14px" />
<p style="font-size:11px;color:#8a7d68;line-height:1.6;margin:0">
You're receiving this because you opted in to Grabitt updates.
<a href="${unsubUrl}" style="color:#8a7d68">Unsubscribe</a> at any time.<br />
Grabitt · Gran Canaria, Canary Islands
</p>
</div></body></html>`
}

/**
 * Sends a campaign. Returns per-recipient results; the caller records them.
 * Recipients are resolved at send time so a stale draft can't email someone who
 * has since withdrawn consent.
 */
export async function sendEshot(prisma: PrismaClient, eshotId: string) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY!)

  const eshot = await prisma.eshot.findUniqueOrThrow({ where: { id: eshotId } })
  if (eshot.sentAt) throw new Error('This campaign has already been sent')

  const audience = await prisma.user.findMany({
    where: segmentWhere(eshot.segment as Segment) as never,
    select: { id: true, email: true, displayName: true, unsubscribeToken: true },
  })

  if (audience.length === 0) {
    await prisma.eshot.update({
      where: { id: eshotId },
      data: { status: 'sent', sentAt: new Date(), recipientCount: 0 },
    })
    return { sent: 0, failed: 0, recipients: 0 }
  }

  await prisma.eshot.update({
    where: { id: eshotId },
    data: { status: 'sending', recipientCount: audience.length },
  })

  const from = `${eshot.fromName?.trim() || 'Grabitt'} <${FROM_EMAIL}>`
  let sent = 0
  let failed = 0

  for (let i = 0; i < audience.length; i += BATCH) {
    const slice = audience.slice(i, i + BATCH)
    const payload = slice.map(u => {
      const unsub = `${APP_URL}/api/unsubscribe?token=${u.unsubscribeToken}`
      return {
        from,
        to: u.email,
        subject: eshot.subject,
        html: wrap(eshot.bodyHtml, unsub, eshot.preheader),
        headers: {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    try {
      const res = await resend.batch.send(payload)
      const ids = (res.data?.data ?? []) as { id: string }[]
      await Promise.all(slice.map((u, idx) => {
        const resendId = ids[idx]?.id ?? null
        sent += resendId ? 1 : 0
        failed += resendId ? 0 : 1
        return prisma.eshotRecipient.upsert({
          where: { eshotId_email: { eshotId, email: u.email } },
          create: {
            eshotId, userId: u.id, email: u.email, resendId,
            status: resendId ? 'sent' : 'failed',
            ...(resendId ? {} : { error: 'No id returned by Resend' }),
          },
          update: { resendId, status: resendId ? 'sent' : 'failed' },
        })
      }))
    } catch (err) {
      // Record the whole batch as failed rather than losing the audit trail.
      failed += slice.length
      const message = err instanceof Error ? err.message : 'Send failed'
      await Promise.all(slice.map(u =>
        prisma.eshotRecipient.upsert({
          where: { eshotId_email: { eshotId, email: u.email } },
          create: { eshotId, userId: u.id, email: u.email, status: 'failed', error: message },
          update: { status: 'failed', error: message },
        }),
      ))
    }
  }

  await prisma.eshot.update({
    where: { id: eshotId },
    data: { status: failed === audience.length ? 'failed' : 'sent', sentAt: new Date() },
  })

  return { sent, failed, recipients: audience.length }
}

// The next send time for a recurring campaign after `from`.
function nextOccurrence(from: Date, repeat: string): Date {
  const d = new Date(from)
  if (repeat === 'daily') d.setDate(d.getDate() + 1)
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7)
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 100) // unknown cadence: park it far out
  return d
}

// Send every scheduled campaign whose time has arrived. Called by the hourly
// cron (/api/cron/eshots). One-off campaigns send and are done; recurring ones
// spawn a dated copy (so each send keeps its own stats) and the template rolls
// forward to its next occurrence, stopping once past repeatUntil.
export async function runDueEshots(prisma: PrismaClient) {
  const now = new Date()
  const due = await prisma.eshot.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    take: 50,
  })
  let sent = 0
  for (const e of due) {
    try {
      if (!e.repeat || e.repeat === 'none') {
        await sendEshot(prisma, e.id) // flips status → sending → sent
        sent++
        continue
      }
      // Recurring: clone the content into a fresh campaign and send that, so the
      // template's own counters stay clean and each occurrence has its own stats.
      const copy = await prisma.eshot.create({
        data: {
          subject: e.subject, bodyHtml: e.bodyHtml, preheader: e.preheader,
          fromName: e.fromName, segment: e.segment, status: 'draft',
        },
      })
      await sendEshot(prisma, copy.id)
      sent++
      // Advance the template to the next future occurrence (catch up if a run
      // was missed), or finish it once past its end date.
      let next = nextOccurrence(e.scheduledAt ?? now, e.repeat)
      while (next <= now) next = nextOccurrence(next, e.repeat)
      if (e.repeatUntil && next > e.repeatUntil) {
        await prisma.eshot.update({ where: { id: e.id }, data: { status: 'done', scheduledAt: null } })
      } else {
        await prisma.eshot.update({ where: { id: e.id }, data: { scheduledAt: next } })
      }
    } catch { /* leave this one scheduled; the next run retries it */ }
  }
  return { due: due.length, sent }
}
