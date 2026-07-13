'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'
import { DEPT_LABEL, deptEmoji, type DbListing } from '@/lib/listingMap'

// A department/category now opens its own page (matching /jobs and /property)
// instead of the old modal. Same site shell (Topbar + app-shell + Footer) with
// the category search inputs on top and the listing grid below.
const SUBCATS: Record<string, string[]> = {
  'Electronics':        ['All', 'Phones', 'Laptops', 'Audio', 'Cameras', 'Gaming', 'Wearables'],
  'Fashion':            ['All', "Women's", "Men's", "Kids'", 'Shoes', 'Accessories', 'Vintage'],
  'Home & Garden':      ['All', 'Furniture', 'Kitchen', 'Garden', 'Decor', 'DIY', 'Lighting'],
  'Sport':              ['All', 'Water Sports', 'Cycling', 'Football', 'Tennis', 'Gym', 'Golf'],
  'Gaming':             ['All', 'Consoles', 'Games', 'Accessories', 'PC Gaming', 'Retro'],
  'Health, Fitness & Diet': ['All', 'Gym', 'Supplements', 'Running', 'Yoga', 'Medical'],
  'Kids & Baby':        ['All', 'Toys', 'Clothing', 'Prams', 'Books', 'Nursery'],
  'Pet Shop':           ['All', 'Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles', 'Services'],
  'Handy Help':         ['All', 'Plumbing', 'Electric', 'Cleaning', 'Building', 'Gardening'],
  'Food Store':         ['All', 'Bakery', 'Dairy', 'Wine', 'Oils', 'Coffee', 'Organic'],
  'Retro & Vintage':    ['All', 'Vinyl', 'Clothing', 'Electronics', 'Instruments', 'Collectables'],
  'Gift Ideas':         ['All', 'Experiences', 'Hampers', 'Beauty', 'Books', 'Jewellery'],
  'Grab It Now':        ['All', 'Electronics', 'Furniture', 'Fashion', 'Sport', 'Other'],
}

export default function CategoryPage() {
  const params = useParams()
  const slug = String(params?.slug ?? '')
  const label = DEPT_LABEL[slug] ?? 'Listings'
  const emoji = deptEmoji(slug)
  const subcats = SUBCATS[label] ?? ['All']

  const [query, setQuery] = useState('')
  const [activeSub, setActiveSub] = useState('All')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [items, setItems] = useState<DbListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    createTrpcClient().listings.getByDept.query({ department: slug as never, sort })
      .then(res => { setItems(((res as { items?: DbListing[] }).items ?? []) as DbListing[]); setLoading(false) })
      .catch(() => { setItems([]); setLoading(false) })
  }, [slug, sort])

  // Free-text + subcategory filtering happens client-side over the fetched set.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sub = activeSub !== 'All' ? activeSub.toLowerCase() : ''
    return items.filter(l => {
      const title = (l.title || '').toLowerCase()
      if (q && !title.includes(q)) return false
      if (sub && !title.includes(sub)) return false
      return true
    })
  }, [items, query, activeSub])

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar />

      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>{emoji} {label}</span>
          <Link href="/" style={{ marginLeft: 'auto', textDecoration: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#9a8b74' }}>‹ All departments</Link>
        </div>

        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${label}…`} style={inp} />

        {subcats.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingTop: 10 }}>
            {subcats.map(sub => <Chip key={sub} active={activeSub === sub} onClick={() => setActiveSub(sub)}>{sub}</Chip>)}
          </div>
        )}
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? 'Loading…' : `${filtered.length} listing${filtered.length === 1 ? '' : 's'}`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={sel}>
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <div className="category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 12px' }}>
        {filtered.map(l => {
          const img = Array.isArray(l.images) ? l.images[0] : null
          return (
            <Link key={l.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
              <div style={card}>
                <div style={{ width: '100%', paddingTop: '72%', position: 'relative', background: 'var(--sand)' }}>
                  {img
                    ? <img src={img} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{emoji}</div>}
                </div>
                <div style={{ padding: '10px 11px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)', margin: '3px 0' }}>€{Number(l.price ?? 0).toLocaleString()}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#9a8b74' }}>📍 {l.location ?? 'Gran Canaria'}</div>
                </div>
              </div>
            </Link>
          )
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No listings in {label} yet</div>
          </div>
        )}
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
    </main>
    </PanelProvider>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', border: `1.5px solid ${active ? 'var(--orange)' : '#e5dccd'}`, background: active ? 'var(--orange)' : '#fff',
      color: active ? '#fff' : '#555', borderRadius: 50, padding: '6px 13px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }
const sel: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '7px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fff' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
