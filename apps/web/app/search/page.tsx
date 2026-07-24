'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'
import AddToCartButton from '@/components/marketplace/AddToCartButton'
import { deptEmoji, isGrabItNow, type DbListing } from '@/lib/listingMap'
import { t } from '@/lib/i18n'

// Search results as a real, deep-linkable page (/search?q=…), replacing the old
// in-app panel. Cards link straight to /listings/[id] so a result opens the same
// full listing page as a category browse — one listing layout, everywhere.

const FILTERS = ['All', 'Electronics', 'Fashion', 'Sport', 'Home', 'Jobs', 'Property'] as const
const FILTER_ENUM: Record<string, string | undefined> = {
  All: undefined, Electronics: 'electronics', Fashion: 'fashion', Sport: 'sport',
  Home: 'home_garden', Jobs: 'jobs', Property: 'property',
}

export default function SearchPage() {
  return (
    <PanelProvider>
      <Suspense fallback={null}>
        <SearchInner />
      </Suspense>
    </PanelProvider>
  )
}

function SearchInner() {
  const params = useSearchParams()
  const { openPanel } = usePanel()
  const q = params.get('q') ?? ''
  const featured = params.get('featured') === '1'

  const [items, setItems] = useState<DbListing[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [filterIdx, setFilterIdx] = useState(0)

  useEffect(() => {
    setLoading(true)
    const dept = FILTER_ENUM[FILTERS[filterIdx]]
    const client = createTrpcClient()
    const run = featured
      ? client.listings.featured.query().then(d => ({ items: d }))
      : client.listings.search.query({ query: q || undefined, department: dept as never, sort: sort as never })
    Promise.resolve(run)
      .then(res => setItems((((res as { items?: unknown }).items) ?? []) as unknown as DbListing[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q, sort, filterIdx, featured])

  // The featured feed isn't department-filtered server-side, so apply the chip here.
  const shown = useMemo(() => {
    if (!featured || filterIdx === 0) return items
    const dept = FILTER_ENUM[FILTERS[filterIdx]]
    return items.filter(l => l.department === dept)
  }, [items, featured, filterIdx])

  const heading = featured ? t('Featured') : q ? `“${q}”` : t('Search')

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar />
      <QuickActions />

      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
            {featured ? '👀' : '🔍'} {heading}
          </span>
          <Link href="/" style={{ marginLeft: 'auto', textDecoration: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#9a8b74' }}>‹ {t('Home')}</Link>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map((f, i) => (
            <button key={f} onClick={() => setFilterIdx(i)} style={{
              flex: '0 0 auto', border: `1.5px solid ${filterIdx === i ? 'var(--orange)' : '#e5dccd'}`,
              background: filterIdx === i ? 'var(--orange)' : '#fff', color: filterIdx === i ? '#fff' : '#555',
              borderRadius: 50, padding: '6px 13px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{f === 'All' ? t('All') : f}</button>
          ))}
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? t('Loading…') : `${shown.length} ${shown.length === 1 ? t('listing') : t('listings')}`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ ...sel, marginLeft: 'auto' }}>
          <option value="newest">{t('Newest first')}</option>
          <option value="price_asc">{t('Price: low to high')}</option>
          <option value="price_desc">{t('Price: high to low')}</option>
        </select>
        <button
          onClick={() => openPanel('savesearch', { q, category: FILTERS[filterIdx] })}
          style={{ flexShrink: 0, background: '#FFF3EE', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 50, padding: '7px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >🔖 {t('Save')}</button>
      </div>

      <div className="category-grid">
        {shown.map(l => {
          const img = Array.isArray(l.images) ? l.images[0] : null
          const emoji = deptEmoji(l.department)
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
                  <AddToCartButton listingId={l.id} department={l.department} sellerId={l.sellerId} isGrabItNow={isGrabItNow(l)} size="sm" />
                </div>
              </div>
            </Link>
          )
        })}
        {!loading && shown.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{t('No results found')}</div>
          </div>
        )}
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
    </main>
  )
}

const sel: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '7px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fff' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
