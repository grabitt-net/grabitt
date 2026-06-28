import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/conversations — find or create a conversation, return its id
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, seller_id } = await request.json()
  if (!seller_id) return NextResponse.json({ error: 'seller_id required' }, { status: 400 })
  if (seller_id === user.id) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })

  // Find existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('seller_id', seller_id)
    .eq('listing_id', listing_id ?? null)
    .maybeSingle()

  if (existing) return NextResponse.json({ id: existing.id })

  // Create new conversation
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listing_id ?? null, buyer_id: user.id, seller_id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: created.id })
}
