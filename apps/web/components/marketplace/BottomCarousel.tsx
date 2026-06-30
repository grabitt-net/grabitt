'use client'
import { usePanel } from '@/context/PanelContext'

const ITEMS = [
  { emoji: '🏄', title: 'Surfboard', price: '€120' },
  { emoji: '🛵', title: 'Vespa 2021', price: '€2,400' },
  { emoji: '📱', title: 'iPhone 14', price: '€620' },
  { emoji: '🎸', title: 'Stratocaster', price: '€340' },
  { emoji: '🪴', title: 'Snake Plant', price: '€12' },
  { emoji: '💻', title: 'MacBook M2', price: '€890' },
  { emoji: '🚴', title: 'Mtn Bike', price: '€340' },
  { emoji: '📷', title: 'Canon R6', price: '€1,800' },
  { emoji: '🧸', title: 'LEGO City', price: '€45' },
  { emoji: '🐾', title: 'GR Puppy', price: '€600' },
]

export default function BottomCarousel() {
  const { openPanel } = usePanel()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 250,
      background: '#fff', borderTop: '2px solid #E0E0E0',
      borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>🆕 Just Listed</div>
          <button
            onClick={() => openPanel('justlisted')}
            style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '3px 12px', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
          >
            See all
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 9px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {ITEMS.map((item, i) => (
          <div key={i} onClick={() => openPanel('justlisted')} style={{ flexShrink: 0, width: 72, cursor: 'pointer' }}>
            <div style={{
              position: 'relative', width: 72, height: 72,
              background: 'linear-gradient(145deg,#FFF3EE,#FFE4D6)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, marginBottom: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #1a1a1a', overflow: 'hidden',
            }}>
              {item.emoji}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.62)', color: '#fff',
                fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 900,
                textAlign: 'center', padding: '2px 0',
              }}>
                {item.price}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800,
              color: '#1a1a1a', textAlign: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {item.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
