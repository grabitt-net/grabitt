'use client'
import Icon, { IconName } from './Icon'

// Trust/USP strip (marketplace pattern): a small set of reassurance badges with
// consistent SVG icons — replaces the old emoji-link grid, whose links now live
// in the site Footer. Communicates why Grabitt is safe at a glance.
const BADGES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shield', title: 'Secure escrow', body: 'Payment is held safely until you confirm handover.' },
  { icon: 'mapPin', title: 'Local to Gran Canaria', body: 'Buy and sell with people near you across the island.' },
  { icon: 'check', title: 'Buyer protection', body: 'Every order is covered by the Grabitt Guarantee.' },
  { icon: 'truck', title: 'Tracked delivery', body: 'Funds release to sellers once an item is in transit.' },
]

export default function TrustStrip() {
  return (
    <section style={{ margin: '28px 14px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {BADGES.map(b => (
          <div key={b.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: '16px 16px' }}>
            <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, background: '#FFF3EE', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={b.icon} size={21} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 3 }}>{b.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500, color: '#7a6d58', lineHeight: 1.45 }}>{b.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
