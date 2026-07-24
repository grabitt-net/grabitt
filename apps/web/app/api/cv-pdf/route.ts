import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'
import { prisma } from 'server/src/db'
import CvDocument, { type CvData } from '@/lib/CvDocument'
import { buildCvSnapshot } from 'server/src/lib/cvSnapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Renders a candidate's CV to PDF.
//   ?applicationId=…  → the CV submitted with that application, for the employer
//                       who owns the job (or an admin). Anonymised until the
//                       application is shortlisted/hired or the candidate is
//                       unlocked, then full.
//   ?preview=me       → the caller's own current CV, full — for previewing.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const applicationId = url.searchParams.get('applicationId')
  const seekerId = url.searchParams.get('seekerId')
  const preview = url.searchParams.get('preview')

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) return NextResponse.json({ error: 'Unknown user' }, { status: 401 })

  let data: CvData
  let revealed: boolean
  // Matches the reference shown on the employer's applications board.
  let reference: string | undefined

  if (preview === 'me') {
    // The candidate previewing their own live CV — always full.
    const [u, p] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { displayName: true, email: true, phone: true } }),
      prisma.seekerProfile.findUnique({ where: { userId: me.id } }),
    ])
    data = buildCvSnapshot(u, p as never) as unknown as CvData
    revealed = true
  } else if (seekerId) {
    // An employer viewing a candidate found through the database search. They
    // must already have paid to open this profile; contact details appear only
    // if they've also paid the separate unlock.
    const [viewed, unlocked, u, prof] = await Promise.all([
      prisma.candidateView.findUnique({ where: { employerId_seekerId: { employerId: me.id, seekerId } }, select: { id: true } }),
      prisma.candidateUnlock.findUnique({ where: { employerId_seekerId: { employerId: me.id, seekerId } }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: seekerId }, select: { displayName: true, email: true, phone: true } }),
      prisma.seekerProfile.findUnique({ where: { userId: seekerId } }),
    ])
    if (!u || !prof) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    if (!viewed && !unlocked && me.id !== seekerId) {
      return NextResponse.json({ error: 'Open this profile first' }, { status: 403 })
    }
    data = buildCvSnapshot(u, prof as never) as unknown as CvData
    revealed = !!unlocked || me.id === seekerId
    reference = 'Candidate ' + seekerId.slice(-4).toUpperCase()
  } else if (applicationId) {
    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        applicantId: true, status: true, cvSnapshot: true,
        jobListing: { select: { employerId: true } },
      },
    })
    if (!app || !app.cvSnapshot) return NextResponse.json({ error: 'No CV on file' }, { status: 404 })

    const isApplicant = me.id === app.applicantId
    const isEmployer = me.id === app.jobListing.employerId
    const isAdmin = await supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(r => !!r.data?.is_admin)
    if (!isApplicant && !isEmployer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
    }

    // Identity is revealed to the applicant themselves and to admins always; to
    // the employer only once they've shortlisted/hired or unlocked the candidate.
    let employerRevealed = false
    if (isEmployer) {
      const unlocked = await prisma.candidateUnlock.findUnique({
        where: { employerId_seekerId: { employerId: app.jobListing.employerId, seekerId: app.applicantId } },
        select: { id: true },
      }).catch(() => null)
      employerRevealed = app.status === 'shortlisted' || app.status === 'hired' || !!unlocked
    }
    revealed = isApplicant || isAdmin || employerRevealed
    reference = 'Candidate ' + app.applicantId.slice(-4).toUpperCase()
    data = app.cvSnapshot as unknown as CvData
  } else {
    return NextResponse.json({ error: 'Missing applicationId or seekerId' }, { status: 400 })
  }

  // CvDocument returns a <Document>; renderToBuffer's types want that element
  // directly, so cast the wrapper element (runtime is correct either way).
  const buffer = await renderToBuffer(createElement(CvDocument, { data, revealed, reference }) as never)
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="grabitt-cv.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
