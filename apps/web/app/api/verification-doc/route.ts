import { NextResponse } from 'next/server'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Signed URL for an ID / proof-of-address document in the private `verification`
// bucket. Only the owner or an admin can open it — these are sensitive identity
// documents and must never sit in a public URL space.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const kind = url.searchParams.get('kind') // 'id' | 'address'
  if (!userId || (kind !== 'id' && kind !== 'address')) {
    return NextResponse.json({ error: 'Missing userId/kind' }, { status: 400 })
  }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const [me, isAdmin] = await Promise.all([
    prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } }),
    supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(r => !!r.data?.is_admin),
  ])
  if (!me) return NextResponse.json({ error: 'Unknown user' }, { status: 401 })
  // Only the document's owner or an admin reviewer may view it.
  if (me.id !== userId && !isAdmin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { idDocPath: true, addressDocPath: true },
  })
  const path = kind === 'id' ? target?.idDocPath : target?.addressDocPath
  if (!path) return NextResponse.json({ error: 'No document on file' }, { status: 404 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Verification storage is not configured' }, { status: 500 })

  const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await admin.storage.from('verification').createSignedUrl(path, 600)
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Could not open document' }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
