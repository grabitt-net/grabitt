import { NextResponse } from 'next/server'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'
import { anonymiseUser } from 'server/src/routers/compliance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Complete GDPR erasure, self-service (no admin step).
//
// Two stores hold personal data and BOTH must be cleared:
//   1. our database  — anonymiseUser() strips PII, keeps Transactions
//   2. Supabase Auth — still holds the email and the user's live sessions
//
// Deleting the auth identity does both jobs at once: it removes the email from
// auth.users and immediately revokes every session, so an unexpired JWT can't
// be used to keep browsing after erasure.
export async function POST() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // 1. Application data.
  await anonymiseUser(prisma, me.id)

  // 2. Auth identity. If this fails the account is already anonymised and
  //    locked out by the deletedAt check, so report it rather than silently
  //    leaving the email in auth.users.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { ok: true, authErased: false, warning: 'Account data erased, but the sign-in identity could not be removed. Contact privacy@grabitt.net.' },
      { status: 200 },
    )
  }

  const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json(
      { ok: true, authErased: false, warning: 'Account data erased, but the sign-in identity could not be removed. Contact privacy@grabitt.net.' },
      { status: 200 },
    )
  }

  return NextResponse.json({ ok: true, authErased: true })
}
