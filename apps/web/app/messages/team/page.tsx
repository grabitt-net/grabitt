import Link from 'next/link'
import SiteHeader from '@/components/marketplace/SiteHeader'
import BottomNav from '@/components/marketplace/BottomNav'

export const dynamic = 'force-dynamic'

// Grabitt Team — a persistent, always-present welcome/support conversation.
// Static content for now; a real support inbox can be wired in later.
const MESSAGES = [
  "👋 Welcome to Grabitt — Gran Canaria's local marketplace!",
  'Buy and sell safely: payments are held securely until you confirm handover, and our Safety Shield is one tap away any time.',
  'Got a question about buying, selling, jobs, property or safety? Reply here and our team will help. We usually respond within 24 hours (Mon–Fri).',
]

export default function GrabittTeamPage() {
  return (
    <main style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 90 }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '12px 16px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/messages" style={{ fontSize: 22, textDecoration: 'none', color: 'var(--dark)', lineHeight: 1 }}>←</Link>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
        <div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 16, fontWeight: 700, color: 'var(--dark)' }}>Grabitt Team</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#16a34a', fontWeight: 800 }}>● Official · here to help</div>
        </div>
      </header>

      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MESSAGES.map((m, i) => (
          <div key={i} style={{ maxWidth: '85%', background: '#fff', border: '1px solid #eee', borderRadius: '4px 16px 16px 16px', padding: '11px 14px', fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#333', lineHeight: 1.55, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>{m}</div>
        ))}
        <Link href="/?help=1" style={{ alignSelf: 'flex-start', marginTop: 4, textDecoration: 'none' }}>
          <span style={{ display: 'inline-block', background: '#FFF3EE', color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, padding: '9px 16px', borderRadius: 50 }}>🆘 Open the Help Centre</span>
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}
