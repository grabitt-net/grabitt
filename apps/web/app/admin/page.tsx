import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminApp from '@/components/admin/AdminApp'
import { SignJWT } from 'jose'

async function makeExecToken(): Promise<string> {
  // Fail hard if the secret is missing — never fall back to a predictable value,
  // or exec/admin tokens could be forged by anyone who knows the default.
  const rawSecret = process.env.EXEC_JWT_SECRET
  if (!rawSecret) throw new Error('EXEC_JWT_SECRET is not configured')
  const secret = new TextEncoder().encode(rawSecret)
  return new SignJWT({ role: 'admin', id: 'admin-page' })
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

  const execToken = await makeExecToken()

  return <AdminApp execToken={execToken} />
}
