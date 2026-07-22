'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'
import Icon from './Icon'

export default function FeaturedStrip() {
  const router = useRouter()
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 12px' }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>Featured</h2>
        <button onClick={() => router.push('/search?featured=1')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--orange)', fontWeight: 800, cursor: 'pointer' }}>See all <Icon name="arrowRight" size={15} /></button>
      </div>
      <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 10, padding: '0 14px 4px' }}>
        {items.map(l => {
          const item = toPanelItem(l)
          return (
            <div key={l.id} onClick={() => router.push(`/listings/${l.id}`)} style={{ flex: '0 0 150px', background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(26,26,26,0.82)', color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 8px', borderRadius: 50, zIndex: 1, letterSpacing: 0.3 }}><Icon name="star" size={10} strokeWidth={0} style={{ fill: '#FFB800' }} /> FEATURED</div>
              <div style={{ width: '100%', paddingTop: '78%', background: '#f5f0e8', position: 'relative' }}>
                {item.image
                  ? <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{item.emoji}</div>}
              </div>
              <div style={{ padding: '10px 10px 12px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{item.price}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500, color: '#9a8b74', marginTop: 4 }}><Icon name="mapPin" size={11} /> {item.location}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
