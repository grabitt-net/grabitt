import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createClient } from '@/lib/supabase-server'
import { prisma } from 'server/src/db'

// Mints a consumer app JWT for the logged-in Supabase user so the web client
// can call protected tRPC procedures (notifications, offers, transactions…).
// Security: the identity comes ONLY from the server-validated Supabase session
// (httpOnly cookies) — never from client input — then we sign with JWT_SECRET,
// matching server/src/middleware/auth.ts verifyConsumerJwt.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  // Web sends the session via httpOnly cookies; mobile (no cookies) sends the
  // Supabase access token as a Bearer header. getUser(jwt?) handles both.
  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(bearer)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, grade: true, deletedAt: true },
  })
  // Profile is provisioned separately (AuthBootstrap → auth.provisionProfile)
  // before this is called; 404 signals "retry after provisioning".
  if (!dbUser) return NextResponse.json({ error: 'no_profile' }, { status: 404 })

  // GDPR erasure: a deleted account must not receive an app token (no access).
  if (dbUser.deletedAt) return NextResponse.json({ error: 'account_deleted' }, { status: 403 })

  const secret = process.env.JWT_SECRET
  if (!secret) return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })

  const token = await new SignJWT({ id: dbUser.id, grade: dbUser.grade })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(secret))

  return NextResponse.json({ token, userId: dbUser.id })
}
