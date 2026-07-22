'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { createTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'
import Icon from './Icon'

// "Just Listed" — previously a fixed bottom bar; now an inline banner-style
// section in the page flow (a full-width strip with its own tinted surface).
export default function BottomCarousel() {
  const { openPanel } = usePanel()
  const router = useRouter()
  const [items, setItems] = useState<DbListing[]>([])

  useEffect(() => {
    createTrpcClient().listings.recent.query()
      .then(d => setItems(d as unknown as DbListing[]))
      .catch(() => {})
  }, [])

  if (items.length === 0) return null

  return (
    <section style={{ margin: '24px 14px 0' }}>
      <div style={{ background: 'linear-gradient(180deg,#fff,#faf6f0)', border: '1px solid #ece3d7', borderRadius: 16, padding: '16px 16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--orange)', display: 'flex' }}><Icon name="sparkle" size={17} /></span>
            <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>Just listed</h2>
          </div>
          <button
            onClick={() => openPanel('justlisted')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', color: 'var(--orange)', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
          >
            See all <Icon name="arrowRight" size={15} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {items.map(l => {
            const item = toPanelItem(l)
            return (
              <button key={l.id} onClick={() => router.push(`/listings/${l.id}`)} style={{ flexShrink: 0, width: 104, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ position: 'relative', width: 104, height: 104, background: '#f3ede4', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {item.image
                    ? <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{item.emoji}</div>}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginTop: 6 }}>{item.price}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: '#8a7d68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
