import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'
import { verifyExecJwt } from 'server/src/middleware/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Exec-only auth actions on a member. These can't live in the tRPC routers
// because they touch Supabase Auth (the identity), not just our User table:
//   - create_member:  invites a new member (auth identity + our User row)
//   - change_email:   updates the Supabase identity + our User.email in step
//   - reset_password: sends the member a password-reset email (we never see it)
export async function POST(req: Request) {
  // Exec gate — same JWT the admin app uses for tRPC.
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token || !verifyExecJwt(token)) {
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
    if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })

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
          ...(body.grade ? { grade: body.grade } : {}),
          ...(typeof body.isBusiness === 'boolean' ? { isBusiness: body.isBusiness } : {}),
          ...(body.phone ? { phone: String(body.phone).trim() } : {}),
          ...(body.businessName ? { businessName: String(body.businessName).trim() } : {}),
        },
        select: { id: true, email: true, displayName: true },
      })
      return NextResponse.json({ ok: true, ...created, invited: true })
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
    // Sends a recovery email to the member — the admin never sets/sees a password.
    const anon = createSupabaseAdmin(url, anonKey)
    const { error } = await anon.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${origin}/auth/callback?next=/account`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, sentTo: user.email })
  }

  // Grant/revoke admin access. This flips Supabase `profiles.is_admin`, which is
  // what /admin actually gates on (the ExecUser table is not used for auth).
  if (action === 'set_admin') {
    const isAdmin = body.isAdmin === true
    if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })

    const admin = createSupabaseAdmin(url, serviceKey)
    // Upsert so members without a profiles row can still be granted access.
    const { error } = await admin
      .from('profiles')
      .upsert({ id: user.supabaseId, email: user.email, is_admin: isAdmin }, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, isAdmin })
  }

  if (action === 'change_email') {
    const next = String(email ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(next)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })

    const admin = createSupabaseAdmin(url, serviceKey)
    // email_confirm: true — an admin-set address is trusted, so no re-confirmation.
    const { error } = await admin.auth.admin.updateUserById(user.supabaseId, { email: next, email_confirm: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    try {
      await prisma.user.update({ where: { id: userId }, data: { email: next } })
    } catch {
      return NextResponse.json({ error: 'That email is already used by another account' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, email: next })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
