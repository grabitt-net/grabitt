import { NextResponse } from 'next/server'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// One-click unsubscribe. Must work with NO login — the recipient may not be
// signed in, or may not even still have an account. The token is unguessable
// and per-user, so it authenticates the request on its own.
//
// GET  — the link in the email footer (browsers follow it, we show a page).
// POST — RFC 8058 one-click, used by Gmail/Outlook's native unsubscribe button.

async function optOut(token: string | null): Promise<boolean> {
  if (!token) return false
  const res = await prisma.user.updateMany({
    where: { unsubscribeToken: token },
    data: { marketingConsent: false, marketingConsentAt: null },
  })
  return res.count > 0
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  const ok = await optOut(token)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  const ok = await optOut(token)

  const body = ok
    ? `<h1>You're unsubscribed</h1>
       <p>You won't receive marketing emails from Grabitt again.</p>
       <p class="muted">You'll still get essential messages about your orders, offers and account — those aren't marketing and can't be turned off while you have an account.</p>
       <p><a href="/account">Manage email preferences</a> · <a href="/">Back to Grabitt</a></p>`
    : `<h1>Link not recognised</h1>
       <p>That unsubscribe link is invalid or has already been used.</p>
       <p><a href="/account">Manage email preferences</a> · <a href="/">Back to Grabitt</a></p>`

  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8" />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <title>Email preferences — Grabitt</title>
     <style>
       body{margin:0;background:#FBF7F0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
            display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
       .card{background:#fff;border-radius:20px;padding:36px 32px;max-width:520px;
             box-shadow:0 4px 30px rgba(0,0,0,.06);text-align:center}
       h1{font-size:22px;margin:0 0 12px;color:#1a1a1a}
       p{font-size:14.5px;line-height:1.7;color:#444;margin:0 0 10px}
       .muted{font-size:13px;color:#8a7d68}
       a{color:#FF4500;font-weight:700;text-decoration:none}
     </style></head>
     <body><div class="card">${body}</div></body></html>`,
    { status: ok ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
