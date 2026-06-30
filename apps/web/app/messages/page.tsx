import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/marketplace/BottomNav'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, last_message_at,
      listings!listing_id (id, title, price, listing_type, categories!category_id(icon)),
      buyer:profiles!buyer_id (id, full_name, grade),
      seller:profiles!seller_id (id, full_name, grade),
      messages (id, body, is_read, sender_id, created_at)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(1, { referencedTable: 'messages' })

  return (
    <main style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 90 }}>
      <header style={{
        background: 'var(--sand)', padding: '14px 16px',
        borderBottom: '1.5px solid var(--sand2)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
          💬 Messages
        </span>
      </header>

      <div style={{ padding: '12px 0' }}>
        {!conversations || conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 800, color: '#aaa', marginBottom: 6 }}>
              No conversations yet
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#bbb', marginBottom: 20 }}>
              Message a seller from any listing
            </div>
            <Link href="/listings" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'var(--orange)', color: '#fff', border: 'none',
                borderRadius: 50, padding: '12px 24px',
                fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
              }}>Browse Listings</button>
            </Link>
          </div>
        ) : (
          conversations.map((conv: any) => {
            const other = conv.buyer?.id === user.id ? conv.seller : conv.buyer
            const lastMsg = conv.messages?.[0]
            const isUnread = lastMsg && !lastMsg.is_read && lastMsg.sender_id !== user.id
            const listing = conv.listings

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', padding: '14px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  borderLeft: isUnread ? '3px solid var(--orange)' : '3px solid transparent',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--orange)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#fff', fontWeight: 900,
                    fontFamily: 'var(--font-nunito)',
                  }}>
                    {other?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: isUnread ? 900 : 700,
                        color: 'var(--dark)',
                      }}>
                        {other?.full_name ?? 'Grabitt User'}
                      </span>
                      <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0, marginLeft: 8 }}>
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                      </span>
                    </div>
                    {listing && (
                      <div style={{
                        fontSize: 10, color: 'var(--orange)', fontFamily: 'var(--font-nunito)',
                        fontWeight: 700, marginBottom: 2,
                      }}>
                        {listing.categories?.icon} {listing.title}
                      </div>
                    )}
                    <div style={{
                      fontFamily: 'var(--font-nunito)', fontSize: 12,
                      color: isUnread ? 'var(--dark)' : '#888',
                      fontWeight: isUnread ? 700 : 400,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {lastMsg ? (lastMsg.sender_id === user.id ? 'You: ' : '') + lastMsg.body : 'Start chatting…'}
                    </div>
                  </div>

                  {isUnread && (
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--orange)', flexShrink: 0,
                    }} />
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>

      <BottomNav />
    </main>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}
