import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SiteHeader from '@/components/marketplace/SiteHeader'
import BottomNav from '@/components/marketplace/BottomNav'
import WishManager from '@/components/marketplace/WishManager'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Grabitt Alerts — a dedicated channel for listing alerts (price drops,
// wishlist/saved-search matches, expiring listings), separate from chats.
const ALERT_KINDS = ['price_drop', 'wish_matched', 'listing_expiring'] as const
const ICON: Record<string, string> = { price_drop: '📉', wish_matched: '✨', listing_expiring: '⏳' }

export default async function GrabittAlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  const me = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } })
  if (!me) redirect('/auth')

  const alerts = await prisma.notification.findMany({
    where: { userId: me.id, kind: { in: ALERT_KINDS as unknown as never[] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  // Mark them read now that they've been opened.
  await prisma.notification.updateMany({
    where: { userId: me.id, kind: { in: ALERT_KINDS as unknown as never[] }, readAt: null },
    data: { readAt: new Date() },
  })

  return (
    <main style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 90 }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '12px 16px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/messages" style={{ fontSize: 22, textDecoration: 'none', color: 'var(--dark)', lineHeight: 1 }}>←</Link>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFF3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔔</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>Grabitt Alerts</div>
      </header>

      <WishManager />

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 6 }}>No alerts yet</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#888', lineHeight: 1.5 }}>Save items to your favourites and we&apos;ll let you know here when their price drops or a match appears.</div>
        </div>
      ) : (
        <div style={{ padding: '10px 0' }}>
          {alerts.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 12, background: '#fff', padding: '13px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFF3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{ICON[a.kind] ?? '🔔'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{a.title}</div>
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.5 }}>{a.body}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#bbb', marginTop: 4 }}>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  )
}
