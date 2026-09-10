'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { createLooseTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'
import Icon from './Icon'

// "Just Listed" — previously a fixed bottom bar; now an inline banner-style
// section in the page flow (a full-width strip with its own tinted surface).
export default function BottomCarousel() {
  const { openPanel } = usePanel()
  const router = useRouter()
  const [items, setItems] = useState<DbListing[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createLooseTrpcClient().listings.recent.query()
      .then(d => setItems(d as unknown as DbListing[]))
      .catch(() => {})
  }, [])

  // Manual navigation — Just listed does not auto-scroll; the arrows nudge the
  // strip left/right by roughly one card-and-a-half.
  const nudge = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  const arrow: React.CSSProperties = { width: 30, height: 30, borderRadius: '50%', background: '#fff', color: 'var(--orange)', border: '1px solid #FFD9C2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', padding: 0, flexShrink: 0 }

  if (items.length === 0) return null

  return (
    <section style={{ margin: '24px 14px 0' }}>
      <div style={{ background: 'linear-gradient(180deg,#fff,#faf6f0)', border: '1px solid #ece3d7', borderRadius: 16, padding: '16px 16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>🆕 Just listed</h2>
          <button
            onClick={() => openPanel('justlisted')}
            style={{ background: '#FFF3EE', color: 'var(--orange)', border: '1px solid #FFD9C2', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}
          >
            See all
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button aria-label="Scroll left" onClick={() => nudge(-1)} style={arrow}><Icon name="arrowLeft" size={16} /></button>
            <button aria-label="Scroll right" onClick={() => nudge(1)} style={arrow}><Icon name="arrowRight" size={16} /></button>
          </div>
        </div>
        <div ref={scrollRef} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, paddingTop: 2, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {items.map(l => {
            const item = toPanelItem(l)
            return (
              <button key={l.id} className="mini-card" onClick={() => router.push(`/listings/${l.id}`)} style={{ flexShrink: 0, width: 132, background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, overflow: 'hidden', padding: 0, cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', width: '100%', paddingTop: '82%', background: 'linear-gradient(135deg,#f5f0e8,#efe7db)' }}>
                  {item.image
                    ? <img loading="lazy" decoding="async" src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{item.emoji}</div>}
                </div>
                <div style={{ padding: '9px 10px 11px' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>{item.price}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-2)', marginTop: 3 }}><Icon name="mapPin" size={11} /> {item.location}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
