import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'
import { verifyExecJwt } from 'server/src/middleware/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Exec-only auth actions on a member. These can't live in the tRPC routers
// because they touch Supabase Auth (the identity), not just our User table:
//   - change_email:   updates the Supabase identity + our User.email in step
//   - reset_password: sends the member a password-reset email (we never see it)
export async function POST(req: Request) {
  // Exec gate — same JWT the admin app uses for tRPC.
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token || !verifyExecJwt(token)) {
    return NextResponse.json({ error: 'Exec access required' }, { status: 401 })
  }

  const { action, userId, email } = await req.json().catch(() => ({}))
  if (!action || !userId) return NextResponse.json({ error: 'Missing action or userId' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { supabaseId: true, email: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (action === 'reset_password') {
    // Sends a recovery email to the member — the admin never sets/sees a password.
    const anon = createSupabaseAdmin(url, anonKey)
    const { error } = await anon.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${new URL(req.url).origin}/auth/callback?next=/account`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, sentTo: user.email })
  }

  if (action === 'change_email') {
    const next = String(email ?? '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
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
