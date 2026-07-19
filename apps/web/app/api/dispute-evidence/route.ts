import { NextResponse } from 'next/server'
import { createClient as createSupabaseServer } from '@/lib/supabase-server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from 'server/src/db'
import { verifyExecJwt } from 'server/src/middleware/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Serves a dispute evidence photo from the private bucket, but only to people
// entitled to see it: the buyer, the seller, or an admin.
//
// Evidence commonly includes receipts and correspondence, so it must not sit at
// a public URL. Callers pass the dispute id and the index of the photo; we
// resolve the stored path ourselves rather than trusting a path from the client
// (which would let anyone read any object in the bucket).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const disputeId = url.searchParams.get('disputeId')
  const index = Number(url.searchParams.get('i') ?? '0')
  if (!disputeId || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: 'Missing disputeId or index' }, { status: 400 })
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { evidence: true, transaction: { select: { buyerId: true, sellerId: true } } },
  })
  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  const path = dispute.evidence[index]
  if (!path) return NextResponse.json({ error: 'No such evidence' }, { status: 404 })

  // Admins (exec token) may view any dispute's evidence.
  const auth = req.headers.get('authorization')
  const execToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  let allowed = !!(execToken && verifyExecJwt(execToken))

  // Otherwise the viewer must be a party to the disputed trade.
  if (!allowed) {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
    allowed = !!me && (me.id === dispute.transaction.buyerId || me.id === dispute.transaction.sellerId)
  }
  if (!allowed) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Evidence storage is not configured' }, { status: 500 })

  const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await admin.storage.from('dispute-evidence').createSignedUrl(path, 600)
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Could not open the evidence' }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
