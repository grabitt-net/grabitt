import { NextResponse } from 'next/server'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mints a short-lived signed URL for a candidate CV in the private `cvs` bucket,
// but only for the applicant themselves or the employer who owns the job. This
// keeps CVs out of any public URL space.
export async function GET(req: Request) {
  const applicationId = new URL(req.url).searchParams.get('applicationId')
  if (!applicationId) return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })

  // Who's asking?
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) return NextResponse.json({ error: 'Unknown user' }, { status: 401 })

  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    select: { cvUrl: true, applicantId: true, jobListing: { select: { employerId: true } } },
  })
  if (!app || !app.cvUrl) return NextResponse.json({ error: 'No CV on file' }, { status: 404 })
  if (me.id !== app.applicantId && me.id !== app.jobListing.employerId) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'CV storage is not configured' }, { status: 500 })

  const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await admin.storage.from('cvs').createSignedUrl(app.cvUrl, 600)
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Could not open CV' }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
