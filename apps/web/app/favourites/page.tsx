'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'

// Favourites now open as their own page (matching a category page) rather than a
// slide-in panel: same site shell, a search box, and the saved listings in the
// standard listing grid — with a heart to remove one.
type Fav = { listingId: string; listing: { id: string; title: string; price: number; location: string; status: string; images: string[] } }

export default function FavouritesPage() {
  const router = useRouter()
  const [items, setItems] = useState<Fav[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/favourites'); return }
      try {
        const data = await trpcAuthed().wishlist.list.query()
        setItems(data as unknown as Fav[])
      } catch { setItems([]) } finally { setLoading(false) }
    })()
  }, [router])

  const unfavourite = async (listingId: string) => {
    setItems(prev => prev?.filter(f => f.listingId !== listingId) ?? null)
    try { await trpcAuthed().wishlist.toggle.mutate({ listingId }) } catch {}
  }

  const shown = useMemo(() => {
    let list = (items ?? [])
    if (sort === 'price_asc') list = [...list].sort((a, b) => Number(a.listing.price) - Number(b.listing.price))
    else if (sort === 'price_desc') list = [...list].sort((a, b) => Number(b.listing.price) - Number(a.listing.price))
    return list
  }, [items, sort])

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Favourites" />
      <QuickActions />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 10px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? 'Loading…' : `${shown.length} favourite${shown.length === 1 ? '' : 's'}`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={sel}>
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <div className="category-grid">
        {shown.map(f => {
          const l = f.listing
          const img = Array.isArray(l.images) ? l.images[0] : null
          const isSold = l.status === 'sold'
          return (
            <div key={f.listingId} style={{ position: 'relative' }}>
              <Link href={isSold ? '#' : `/listings/${l.id}`} style={{ textDecoration: 'none', pointerEvents: isSold ? 'none' : 'auto' }}>
                <div style={{ ...card, opacity: isSold ? 0.6 : 1 }}>
                  <div style={{ width: '100%', paddingTop: '72%', position: 'relative', background: 'var(--sand)' }}>
                    {img
                      ? <img loading="lazy" decoding="async" src={img} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>🖼️</div>}
                    {isSold && <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(26,26,26,0.85)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 50 }}>SOLD</span>}
                  </div>
                  <div style={{ padding: '10px 11px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)', margin: '3px 0' }}>€{Number(l.price ?? 0).toLocaleString()}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#1a1a1a' }}>📍 {l.location ?? 'Canary Islands'}</div>
                  </div>
                </div>
              </Link>
              {/* Remove from favourites */}
              <button onClick={() => unfavourite(f.listingId)} title="Remove from favourites" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 50, width: 30, height: 30, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>❤️</button>
            </div>
          )
        })}
        {!loading && shown.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🤍</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No favourites yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Tap ❤️ on any listing to save it here.</div>
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

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }
const sel: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '7px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fff' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
