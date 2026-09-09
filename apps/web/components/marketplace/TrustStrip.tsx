'use client'
import Icon, { IconName } from './Icon'

// Trust/USP strip (marketplace pattern): a small set of reassurance badges with
// consistent SVG icons — replaces the old emoji-link grid, whose links now live
// in the site Footer. Communicates why Grabitt is safe at a glance.
const BADGES: { icon: IconName; tag: string; title: string; body: string }[] = [
  { icon: 'shield', tag: 'Escrow', title: 'Secure escrow', body: 'Payment is held safely until you confirm handover.' },
  { icon: 'mapPin', tag: 'Local', title: 'Local to the Canaries', body: 'Buy and sell with people near you across the Canary Islands.' },
  { icon: 'check', tag: 'Protection', title: 'Buyer protection', body: 'Every order is covered by the Grabitt Guarantee.' },
  { icon: 'truck', tag: 'Delivery', title: 'Tracked delivery', body: 'Funds release to sellers once an item is in transit.' },
]

// Styled to match the "Grabitt Guides" cards (CommunityStrip): same card chrome
// (border #ece3d7, radius 14, soft shadow) and the same kicker → title → body
// hierarchy, laid out vertically with the icon standing in for the banner.
export default function TrustStrip() {
  return (
    <section style={{ padding: '16px 0 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, padding: '0 14px' }}>
        {BADGES.map(b => (
          <div key={b.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '14px 14px 16px', height: '100%' }}>
            <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, background: 'var(--sand)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={b.icon} size={21} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{b.tag}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 5 }}>{b.title}</div>
              <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#1a1a1a', lineHeight: 1.45 }}>{b.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
