'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import { createTrpcClient } from '@/lib/trpc'
import { toPanelItem, type DbListing } from '@/lib/listingMap'

// The main browse experience for the homepage: a big responsive grid of real
// listings with a category filter bar. On desktop this reads like a proper
// marketplace site; on mobile it's a stacked 2-column grid.

const CATS: { label: string; dept?: string }[] = [
  { label: 'All' },
  { label: 'Electronics', dept: 'electronics' },
  { label: 'Fashion', dept: 'fashion' },
  { label: 'Home & Garden', dept: 'home_garden' },
  { label: 'Sport', dept: 'sport' },
  { label: 'Gaming', dept: 'gaming' },
  { label: 'Retro & Vintage', dept: 'retro_vintage' },
  { label: 'Motors', dept: 'motors' },
  { label: 'Pet Shop', dept: 'pet_shop' },
  { label: 'Kids & Baby', dept: 'kids_baby' },
  { label: 'Collectables', dept: 'collectables' },
]

export default function ListingsGrid() {
  const { openPanel } = usePanel()
  const [cat, setCat] = useState(0)
  const [sort, setSort] = useState('newest')
  const [items, setItems] = useState<DbListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const dept = CATS[cat].dept
    const srt = (sort === 'price_asc' || sort === 'price_desc') ? sort : 'newest'
    createTrpcClient().listings.search
      .query({ department: dept as never, sort: srt as never, limit: 50 })
      .then(res => { setItems((res.items ?? []) as unknown as DbListing[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cat, sort])

  return (
    <section style={{ padding: '18px 14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>Browse listings</span>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: '1px solid #e0d8d0', borderRadius: 8, padding: '5px 8px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--dark)', background: '#fff' }}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>
      </div>

      {/* Category filter bar */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 12 }}>
        {CATS.map((c, i) => (
          <button key={c.label} onClick={() => setCat(i)} style={{ flex: '0 0 auto', background: cat === i ? 'var(--orange)' : '#fff', color: cat === i ? '#fff' : '#555', border: `1.5px solid ${cat === i ? 'var(--orange)' : '#e5e7eb'}`, borderRadius: 50, padding: '7px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading listings…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No listings in this category yet.</div>
      ) : (
        <div className="listing-grid" style={{ paddingBottom: 8 }}>
          {items.map(l => {
            const item = toPanelItem(l)
            return (
              <div key={l.id} onClick={() => openPanel('listing', item)} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                <div style={{ width: '100%', paddingTop: '75%', background: '#f5f0e8', position: 'relative' }}>
                  {item.image
                    ? <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{item.emoji}</div>}
                  {item.isFeatured && <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--orange)', color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 8px', borderRadius: 50 }}>👀 FEATURED</div>}
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: 'var(--orange)' }}>{item.price}</div>
                    <div style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-ui)' }}>📍 {item.location}</div>
                  </div>
                  {item.condition && <div style={{ display: 'inline-block', marginTop: 6, background: '#edf7ed', color: 'var(--sage)', border: '1px solid var(--sage)', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '2px 8px', borderRadius: 50 }}>{item.condition}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
