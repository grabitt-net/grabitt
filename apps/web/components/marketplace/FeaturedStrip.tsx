'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLooseTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'
import Icon from './Icon'

export default function FeaturedStrip() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<DbListing[]>([])

  useEffect(() => {
    createLooseTrpcClient().listings.featured.query()
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px 12px' }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>⭐ Featured</h2>
        <button onClick={() => router.push('/search?featured=1')} style={{ background: '#FFF3EE', border: '1px solid #FFD9C2', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--orange)', fontWeight: 800, cursor: 'pointer' }}>See all</button>
      </div>
      <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 12, padding: '2px 14px 6px' }}>
        {items.map(l => {
          const item = toPanelItem(l)
          return (
            <div key={l.id} className="mini-card" onClick={() => router.push(`/listings/${l.id}`)} style={{ flex: '0 0 156px', background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 3, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50, zIndex: 1, letterSpacing: 0.3, boxShadow: '0 2px 6px rgba(245,84,10,0.35)' }}><Icon name="star" size={10} strokeWidth={0} style={{ fill: '#fff' }} /> FEATURED</div>
              <div style={{ width: '100%', paddingTop: '80%', background: 'linear-gradient(135deg,#f5f0e8,#efe7db)', position: 'relative' }}>
                {item.image
                  ? <img loading="lazy" decoding="async" src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{item.emoji}</div>}
              </div>
              <div style={{ padding: '10px 11px 12px' }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)' }}>{item.price}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-2)', marginTop: 4 }}><Icon name="mapPin" size={11} /> {item.location}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
