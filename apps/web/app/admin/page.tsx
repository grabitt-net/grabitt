import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminApp from '@/components/admin/AdminApp'
import { SignJWT } from 'jose'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mints an exec token for THIS admin, so every privileged action is attributable
// to a real ExecUser (and can be written to the audit trail).
async function makeExecToken(execUserId: string, role: string): Promise<string> {
  // Fail hard if the secret is missing — never fall back to a predictable value,
  // or exec/admin tokens could be forged by anyone who knows the default.
  const rawSecret = process.env.EXEC_JWT_SECRET
  if (!rawSecret) throw new Error('EXEC_JWT_SECRET is not configured')
  const secret = new TextEncoder().encode(rawSecret)
  return new SignJWT({ role, id: execUserId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('4h')
    .sign(secret)
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/?error=unauthorized')

  // profiles.is_admin is the gate; ExecUser is the identity we attribute actions
  // to. Resolve (or create) this admin's ExecUser row so the audit trail names
  // a real person rather than a shared token.
  const email = user.email!
  const execUser = await prisma.execUser.upsert({
    where: { email },
    create: { email, role: 'admin' },
    update: {},
    select: { id: true, role: true },
  })

  const execToken = await makeExecToken(execUser.id, execUser.role)

  return <AdminApp execToken={execToken} execEmail={email} execRole={execUser.role} />
}
