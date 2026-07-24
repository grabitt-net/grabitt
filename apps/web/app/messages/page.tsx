import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/marketplace/BottomNav'
import SiteHeader from '@/components/marketplace/SiteHeader'
import InboxClient from '@/components/marketplace/InboxClient'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The Messages centre. Auth and the alert count are resolved here; the inbox
// itself is a client component so selecting a conversation swaps the right pane
// instead of navigating away from the list.
export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) redirect('/auth')

  // Listing alerts (price drops, saved-search / wishlist matches, expiring) are
  // surfaced in a dedicated "Grabitt Alerts" channel, separate from chats.
  const ALERT_KINDS = ['price_drop', 'wish_matched', 'listing_expiring'] as const
  const alertUnread = await prisma.notification.count({
    where: { userId: me.id, kind: { in: ALERT_KINDS as unknown as never[] }, readAt: null },
  })

  return (
    <main style={{ background: '#f5f2ec', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '14px 16px', borderBottom: '1.5px solid var(--sand2)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
          Messages
        </span>
      </header>

      <InboxClient me={me.id} alertUnread={alertUnread} />

      <BottomNav />
    </main>
  )
}
