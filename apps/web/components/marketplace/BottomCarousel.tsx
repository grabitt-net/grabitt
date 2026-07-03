'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import { createTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'

export default function BottomCarousel() {
  const { openPanel } = usePanel()
  const [items, setItems] = useState<DbListing[]>([])

  useEffect(() => {
    createTrpcClient().listings.recent.query()
      .then(d => setItems(d as unknown as DbListing[]))
      .catch(() => {})
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 250,
      background: '#fff', borderTop: '2px solid #E0E0E0',
      borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>🆕 Just Listed</div>
          <button
            onClick={() => openPanel('justlisted')}
            style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '3px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
          >
            See all
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 9px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {items.map(l => {
          const item = toPanelItem(l)
          return (
            <div key={l.id} onClick={() => openPanel('listing', item)} style={{ flexShrink: 0, width: 72, cursor: 'pointer' }}>
              <div style={{
                position: 'relative', width: 72, height: 72,
                background: 'linear-gradient(145deg,#FFF3EE,#FFE4D6)',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, marginBottom: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #1a1a1a', overflow: 'hidden',
              }}>
                {item.image
                  ? <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : item.emoji}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.62)', color: '#fff',
                  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900,
                  textAlign: 'center', padding: '2px 0',
                }}>
                  {item.price}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
                color: '#1a1a1a', textAlign: 'center',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.title}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
