'use client'
import { useEffect, useRef, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import { createTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'

export default function FeaturedStrip() {
  const { openPanel } = usePanel()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<DbListing[]>([])

  useEffect(() => {
    createTrpcClient().listings.featured.query()
      .then(d => setItems(d as unknown as DbListing[]))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || items.length === 0) return
    const id = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) el.scrollTo({ left: 0, behavior: 'smooth' })
      else el.scrollBy({ left: 155, behavior: 'smooth' })
    }, 3200)
    return () => clearInterval(id)
  }, [items.length])

  if (items.length === 0) return null

  return (
    <section style={{ padding: '16px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 14px 10px' }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>👀 Featured</span>
        <button onClick={() => openPanel('search', { featured: true })} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--orange)', fontWeight: 800, cursor: 'pointer' }}>See all</button>
      </div>
      <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 10, padding: '0 14px 4px' }}>
        {items.map(l => {
          const item = toPanelItem(l)
          return (
            <div key={l.id} onClick={() => openPanel('listing', item)} style={{ flex: '0 0 140px', background: '#fff', border: '1px solid #e8e0d5', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50, zIndex: 1 }}>👀 FEATURED</div>
              <div style={{ width: '100%', paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                {item.image
                  ? <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{item.emoji}</div>}
              </div>
              <div style={{ padding: '8px 8px 10px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{item.price}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#888', marginTop: 2 }}>📍 {item.location}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
