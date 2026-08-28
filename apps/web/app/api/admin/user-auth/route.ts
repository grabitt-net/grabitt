import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'
import { verifyExecJwt } from 'server/src/middleware/auth'
import { writeAudit } from 'server/src/routers/crm'
import { serviceKeyProblem } from '@/lib/supabaseServiceKey'
import { sendEmail } from 'server/src/lib/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Supabase's own auth emails (invite / recovery) only send when SMTP is
// configured on the project, so for a custom domain they can silently fail.
// We instead generate the set-password link ourselves and deliver it through
// the app's Resend pipeline (noreply@grabitt.net) — the same channel every
// other Grabitt email uses. Returns true if the branded email was sent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSetPasswordEmail(admin: any, email: string, origin: string, name: string, welcome: boolean): Promise<boolean> {
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/auth/set-password` },
    })
    // Build a link through our own callback using the hashed token (the pattern
    // this app already verifies for email confirmations) rather than Supabase's
    // hosted action_link — so the session is established server-side via cookies
    // and the user lands on the set-password page ready to go.
    const hashed = (data as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token
    if (error || !hashed) return false
    const link = `${origin}/auth/callback?token_hash=${encodeURIComponent(hashed)}&type=recovery&next=${encodeURIComponent('/auth/set-password')}`
    const subject = welcome ? 'Welcome to Grabitt — set your password' : 'Set your Grabitt password'
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#f5540a">Welcome to Grabitt${name ? `, ${name}` : ''} 👋</h2>
        <p>${welcome ? 'An account has been created for you on Grabitt, the Canary Islands marketplace.' : 'You asked to set a new password for your Grabitt account.'}</p>
        <p>Click the button below to set your password and sign in:</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#f5540a;color:#fff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px;display:inline-block">Set my password</a>
        </p>
        <p style="font-size:12px;color:#888">If the button doesn't work, copy this link into your browser:<br>${link}</p>
        <p style="font-size:12px;color:#888">If you weren't expecting this, you can ignore this email.</p>
      </div>`
    await sendEmail(email, subject, html)
    return true
  } catch { return false }
}

// Exec-only auth actions on a member. These can't live in the tRPC routers
// because they touch Supabase Auth (the identity), not just our User table:
//   - create_member:  invites a new member (auth identity + our User row)
//   - change_email:   updates the Supabase identity + our User.email in step
//   - reset_password: sends the member a password-reset email (we never see it)
export async function POST(req: Request) {
  // Exec gate — same JWT the admin app uses for tRPC.
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const actor = token ? verifyExecJwt(token) : null
  if (!actor) {
    return NextResponse.json({ error: 'Exec access required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { action, userId, email } = body
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const origin = new URL(req.url).origin

  // ── Create a member ────────────────────────────────────────────────────────
  if (action === 'create_member') {
    const addr = String(email ?? '').trim().toLowerCase()
    const displayName = String(body.displayName ?? '').trim()
    if (!EMAIL_RE.test(addr)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    if (displayName.length < 2) return NextResponse.json({ error: 'Enter a name (2+ characters)' }, { status: 400 })
    const keyProblem = serviceKeyProblem(url, serviceKey)
    if (keyProblem || !serviceKey) return NextResponse.json({ error: keyProblem ?? 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 })

    const existing = await prisma.user.findUnique({ where: { email: addr }, select: { id: true } })
    if (existing) return NextResponse.json({ error: 'A member with that email already exists' }, { status: 400 })

    const admin = createSupabaseAdmin(url, serviceKey)
    // Invite: creates the auth identity AND emails them a link to set a password.
    // We never set a password on their behalf.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(addr, {
      redirectTo: `${origin}/auth/callback?next=/account`,
    })
    if (error || !data?.user) {
      return NextResponse.json({ error: error?.message ?? 'Could not invite that address' }, { status: 400 })
    }

    try {
      const created = await prisma.user.create({
        data: {
          supabaseId: data.user.id,
          email: addr,
          displayName,
          // A full business account needs a valid business tier — floor the grade
          // to Dealer when creating a business without an explicit higher grade.
          ...((() => {
            const g = body.grade || (body.isBusiness ? 'dealer' : undefined)
            const grade = body.isBusiness && (!g || g === 'grabber') ? 'dealer' : g
            return grade ? { grade } : {}
          })()),
          ...(typeof body.isBusiness === 'boolean' ? { isBusiness: body.isBusiness } : {}),
          // An admin-created business is trusted — verify it on creation so it can
          // publish its storefront without going through the document review flow.
          ...(body.isBusiness ? { businessVerified: true } : {}),
          ...(body.feeOverridePct !== undefined && body.feeOverridePct !== null && body.feeOverridePct !== ''
            ? { feeOverridePct: Number(body.feeOverridePct) } : {}),
          ...(body.phone ? { phone: String(body.phone).trim() } : {}),
          ...(body.businessName ? { businessName: String(body.businessName).trim() } : {}),
        },
        select: { id: true, email: true, displayName: true },
      })
      // Deliver the set-password link via our own Resend pipeline (Supabase's
      // invite email is unreliable without project SMTP). Falls back silently to
      // the Supabase invite already triggered above.
      const emailed = await sendSetPasswordEmail(admin, addr, origin, displayName, true)
      await writeAudit(prisma, actor.id, created.id, 'member_created', { email: addr, invited: true, emailed })
      return NextResponse.json({ ok: true, ...created, invited: true, emailed })
    } catch (e) {
      // Don't leave an orphaned auth identity behind if our row failed.
      await admin.auth.admin.deleteUser(data.user.id).catch(() => {})
      return NextResponse.json({ error: 'Could not create the member record' }, { status: 400 })
    }
  }

  // ── Actions on an existing member ──────────────────────────────────────────
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { supabaseId: true, email: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (action === 'reset_password') {
    // Prefer our own Resend delivery (reliable, branded). Only if the service
    // key is present can we generate the link; otherwise fall back to Supabase's
    // built-in recovery email via the anon client.
    const keyProblem = serviceKeyProblem(url, serviceKey)
    if (!keyProblem && serviceKey) {
      const admin = createSupabaseAdmin(url, serviceKey)
      const emailed = await sendSetPasswordEmail(admin, user.email, origin, '', false)
      if (emailed) {
        await writeAudit(prisma, actor.id, userId, 'password_reset_sent', { to: user.email, via: 'resend' })
        return NextResponse.json({ ok: true, sentTo: user.email })
      }
    }
    // Fallback: Supabase's own recovery email (needs project SMTP to actually send).
    const anon = createSupabaseAdmin(url, anonKey)
    const { error } = await anon.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${origin}/auth/callback?next=/account`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAudit(prisma, actor.id, userId, 'password_reset_sent', { to: user.email, via: 'supabase' })
    return NextResponse.json({ ok: true, sentTo: user.email })
  }

  // Grant/revoke admin access. This flips Supabase `profiles.is_admin`, which is
  // what /admin actually gates on (the ExecUser table is not used for auth).
  if (action === 'set_admin') {
    const isAdmin = body.isAdmin === true
    const keyProblem = serviceKeyProblem(url, serviceKey)
    if (keyProblem || !serviceKey) return NextResponse.json({ error: keyProblem ?? 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 })

    const admin = createSupabaseAdmin(url, serviceKey)
    // Upsert so members without a profiles row can still be granted access.
    const { error } = await admin
      .from('profiles')
      .upsert({ id: user.supabaseId, email: user.email, is_admin: isAdmin }, { onConflict: 'id' })
    if (error) {
      // Supabase says only "Invalid API key" here; name the setting at fault.
      const msg = /invalid api key/i.test(error.message)
        ? 'Supabase rejected SUPABASE_SERVICE_ROLE_KEY. Check that this deployment has the service role key from the same Supabase project as NEXT_PUBLIC_SUPABASE_URL.'
        : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    await writeAudit(prisma, actor.id, userId, isAdmin ? 'admin_granted' : 'admin_revoked', { email: user.email })
    return NextResponse.json({ ok: true, isAdmin })
  }

  if (action === 'change_email') {
    const next = String(email ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(next)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    const keyProblem = serviceKeyProblem(url, serviceKey)
    if (keyProblem || !serviceKey) return NextResponse.json({ error: keyProblem ?? 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 })

    const admin = createSupabaseAdmin(url, serviceKey)
    // email_confirm: true — an admin-set address is trusted, so no re-confirmation.
    const { error } = await admin.auth.admin.updateUserById(user.supabaseId, { email: next, email_confirm: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    try {
      await prisma.user.update({ where: { id: userId }, data: { email: next } })
    } catch {
      return NextResponse.json({ error: 'That email is already used by another account' }, { status: 400 })
    }
    await writeAudit(prisma, actor.id, userId, 'email_changed', { from: user.email, to: next })
    return NextResponse.json({ ok: true, email: next })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
