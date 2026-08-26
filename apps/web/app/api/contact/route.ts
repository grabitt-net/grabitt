import { sendEmail } from 'server/src/lib/notify'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPPORT_TO = 'support@grabitt.net'
const escape = (s: string) => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c))

// Footer → Grabitt → Contact. Receives the on-page contact form and emails it to
// the support inbox via Resend (same sender the rest of the app uses).
export async function POST(req: Request) {
  let body: { name?: string; email?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const email = (body.email || '').trim()
  const message = (body.message || '').trim()

  if (!name || !email || !message) {
    return Response.json({ ok: false, error: 'Please fill in your name, email and message.' }, { status: 400 })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return Response.json({ ok: false, error: 'Message is too long.' }, { status: 400 })
  }

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
      <p><strong>New contact form message</strong></p>
      <p><strong>Name:</strong> ${escape(name)}</p>
      <p><strong>Email:</strong> ${escape(email)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;">${escape(message)}</p>
    </div>`

  // Capture the enquiry as a CRM lead so the team sees it in the pipeline...
  try {
    await prisma.crmContact.create({
      data: {
        name,
        email,
        stage: 'lead',
        notes: `[Contact enquiry] ${message}`,
        tags: ['inbound', 'contact'],
      },
    })
  } catch { /* non-fatal — still try to email */ }

  // ...and email support as a heads-up (best-effort).
  try {
    await sendEmail(SUPPORT_TO, `Contact form — ${name}`, html)
  } catch { /* the CRM lead is the source of truth; email is a bonus */ }

  return Response.json({ ok: true })
}
