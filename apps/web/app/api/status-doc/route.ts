import { NextResponse } from 'next/server'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Signed URL for a status application's uploaded evidence (e.g. a charity's
// proof of registration) held in the private `verification` bucket. Only the
// applicant or an admin reviewer may open it. Identified by application id so
// the raw storage path never has to be passed by the client.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const [me, isAdmin] = await Promise.all([
    prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } }),
    supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(r => !!r.data?.is_admin),
  ])
  if (!me) return NextResponse.json({ error: 'Unknown user' }, { status: 401 })

  const app = await prisma.statusApplication.findUnique({ where: { id }, select: { userId: true, evidenceUrl: true } })
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (me.id !== app.userId && !isAdmin) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const path = app.evidenceUrl
  if (!path) return NextResponse.json({ error: 'No document on file' }, { status: 404 })
  // If it's already a full URL (an external evidence link), just send them there.
  if (/^https?:\/\//i.test(path)) return NextResponse.redirect(path)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Verification storage is not configured' }, { status: 500 })
  const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await admin.storage.from('verification').createSignedUrl(path, 600)
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Could not open document' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
