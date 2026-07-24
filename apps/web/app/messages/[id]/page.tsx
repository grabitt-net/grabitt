import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from '@/components/marketplace/ChatWindow'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) redirect('/auth')

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: { participants: { include: { user: { select: { id: true, displayName: true } } } } },
  })
  if (!thread) notFound()
  if (!thread.participants.some(p => p.userId === me.id)) redirect('/messages')

  const other = thread.participants.find(p => p.userId !== me.id)?.user
  const listing = await prisma.listing.findUnique({
    where: { id: thread.listingId },
    select: { id: true, title: true, price: true },
  })

  const rows = await prisma.message.findMany({
    where: { threadId: id },
    orderBy: { createdAt: 'asc' },
  })
  const initialMessages = rows.map(m => ({
    id: m.id, threadId: m.threadId, senderId: m.senderId, body: m.body,
    blocked: m.blocked, blockedReason: m.blockedReason,
    readAt: m.readAt ? m.readAt.toISOString() : null, createdAt: m.createdAt.toISOString(),
  }))

  // Mark incoming messages read now that the thread is open.
  await prisma.message.updateMany({
    where: { threadId: id, senderId: { not: me.id }, readAt: null },
    data: { readAt: new Date() },
  })

  return (
    <main className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f5f5f5', boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
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
          {other?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>
            {other?.displayName ?? 'Grabitt User'}
          </div>
          {listing && (
            <div style={{ fontSize: 10, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontWeight: 700 }}>
              {listing.title}
              {listing.price != null && ` · €${Number(listing.price).toLocaleString()}`}
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

      <ChatWindow threadId={id} userId={me.id} initialMessages={initialMessages} />
    </main>
  )
}
