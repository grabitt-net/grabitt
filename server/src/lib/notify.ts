import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY!)

function getTwilio() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({
    from: 'Grabitt <noreply@grabitt.net>',
    to,
    subject,
    html,
  })
}

export async function sendSms(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return
  const client = getTwilio()
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
    body,
  })
}

export async function sendWhatsApp(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return
  const client = getTwilio()
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!}`,
    to: `whatsapp:${to}`,
    body,
  })
}

// Convenience: notify a user via all configured channels
export async function notifyUser(opts: {
  email?: string
  phone?: string
  subject: string
  bodyText: string
  bodyHtml?: string
}) {
  const ps: Promise<any>[] = []
  if (opts.email) ps.push(sendEmail(opts.email, opts.subject, opts.bodyHtml ?? `<p>${opts.bodyText}</p>`))
  if (opts.phone) ps.push(sendSms(opts.phone, opts.bodyText))
  await Promise.allSettled(ps)
}
