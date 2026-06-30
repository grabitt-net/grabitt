import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from '@/components/marketplace/ChatWindow'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id,
      listings!listing_id (id, title, price, listing_type, categories!category_id(icon, name)),
      buyer:profiles!buyer_id (id, full_name),
      seller:profiles!seller_id (id, full_name)
    `)
    .eq('id', id)
    .single()

  if (!conv) notFound()

  const conv_any = conv as any
  const isBuyer = conv_any.buyer?.id === user.id
  const isSeller = conv_any.seller?.id === user.id
  if (!isBuyer && !isSeller) redirect('/messages')

  const other = isBuyer ? conv_any.seller : conv_any.buyer

  // Fetch initial messages
  const { data: initialMessages } = await supabase
    .from('messages')
    .select('id, body, sender_id, is_read, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // Mark unread messages as read
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  const listing = conv_any.listings

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        background: 'var(--sand)', padding: '12px 16px',
        borderBottom: '1.5px solid var(--sand2)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <Link href="/messages" style={{ fontSize: 22, textDecoration: 'none', color: 'var(--dark)' }}>←</Link>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--orange)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-nunito)', flexShrink: 0,
        }}>
          {other?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>
            {other?.full_name ?? 'Grabitt User'}
          </div>
          {listing && (
            <div style={{ fontSize: 10, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontWeight: 700 }}>
              {listing.categories?.icon} {listing.title}
              {listing.price && ` · €${Number(listing.price).toLocaleString()}`}
            </div>
          )}
        </div>
        {listing && (
          <Link href={`/listings/${listing.id}`} style={{
            background: '#f0f0f0', color: '#555', borderRadius: 50,
            padding: '6px 12px', fontSize: 11, fontWeight: 800,
            fontFamily: 'var(--font-nunito)', textDecoration: 'none', flexShrink: 0,
          }}>View</Link>
        )}
      </header>

      <ChatWindow
        conversationId={id}
        userId={user.id}
        initialMessages={initialMessages ?? []}
      />
    </main>
  )
}
