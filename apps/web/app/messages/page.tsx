import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/marketplace/BottomNav'
import SiteHeader from '@/components/marketplace/SiteHeader'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) redirect('/auth')

  const threads = await prisma.thread.findMany({
    where: { participants: { some: { userId: me.id } } },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      participants: { include: { user: { select: { id: true, displayName: true } } } },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  })

  const listingIds = [...new Set(threads.map(t => t.listingId))]
  const listings = await prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } })
  const titleOf = new Map(listings.map(l => [l.id, l.title]))

  return (
    <main style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 90 }}>
      <SiteHeader />
      <header style={{
        background: 'var(--sand)', padding: '14px 16px',
        borderBottom: '1.5px solid var(--sand2)',
      }}>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
          Messages
        </span>
      </header>

      <div style={{ padding: '12px 0' }}>
        {threads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
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
          threads.map(thread => {
            const other = thread.participants.find(p => p.userId !== me.id)?.user
            const lastMsg = thread.messages[0]
            const isUnread = !!lastMsg && lastMsg.senderId !== me.id && !lastMsg.readAt
            const title = titleOf.get(thread.listingId)
            const preview = lastMsg
              ? (lastMsg.blocked ? '⚠️ Message hidden — contact details are not allowed'
                : (lastMsg.senderId === me.id ? 'You: ' : '') + lastMsg.body)
              : 'Start chatting…'

            return (
              <Link key={thread.id} href={`/messages/${thread.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', padding: '14px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  borderLeft: isUnread ? '3px solid var(--orange)' : '3px solid transparent',
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--orange)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-nunito)',
                  }}>
                    {other?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: isUnread ? 900 : 700,
                        color: 'var(--dark)',
                      }}>
                        {other?.displayName ?? 'Grabitt User'}
                      </span>
                      <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0, marginLeft: 8 }}>
                        {thread.lastMessageAt ? formatTime(thread.lastMessageAt.toISOString()) : ''}
                      </span>
                    </div>
                    {title && (
                      <div style={{
                        fontSize: 10, color: 'var(--orange)', fontFamily: 'var(--font-nunito)',
                        fontWeight: 700, marginBottom: 2,
                      }}>
                        {title}
                      </div>
                    )}
                    <div style={{
                      fontFamily: 'var(--font-nunito)', fontSize: 12,
                      color: isUnread ? 'var(--dark)' : '#888',
                      fontWeight: isUnread ? 700 : 400,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {preview}
                    </div>
                  </div>

                  {isUnread && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
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
