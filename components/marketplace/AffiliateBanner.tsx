'use client'
import { usePanel } from '@/context/PanelContext'

export default function AffiliateBanner() {
  const { openPanel } = usePanel()
  return (
    <div
      onClick={() => openPanel('sponsors')}
      style={{
        margin: '6px 12px 16px', borderRadius: 16,
        background: 'linear-gradient(135deg,#1B6CA8,#0D4F80)',
        padding: 16, display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 36, flexShrink: 0 }}>📦</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
          Storage needed?
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-nunito)' }}>
          Book now with Stash &amp; Go!
        </div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.2)', color: '#fff',
        fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-nunito)',
        padding: '3px 8px', borderRadius: 6, flexShrink: 0,
      }}>
        Ad
      </div>
    </div>
  )
}
