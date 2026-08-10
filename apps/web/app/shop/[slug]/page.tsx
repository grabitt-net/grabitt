'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import { createLooseTrpcClient } from '@/lib/trpc'
import { deptEmoji } from '@/lib/listingMap'

// A business's public shop page. Its own address (/shop/<slug>), the layout the
// seller chose, their category shelves, featured items pinned to the top, the
// rating that reflects real service, and the policies a buyer wants before they
// order.

type Rating = { score: number; stars: number; provisional: boolean; parts: { key: string; label: string; score: number; weight: number; detail: string }[] }
type Item = {
  id: string; title: string; price: number; images: string[]; location: string
  department: string; condition: string | null; status: string; isFeatured: boolean
  isGrabItNow: boolean; multibuyTiers: { qty: number; discountPct: number }[] | null
}
type Shop = {
  shop: {
    slug: string; template: string; tagline: string | null; about: string | null
    bannerUrl: string | null; accentColour: string | null; categories: string[]; featuredIds: string[]
    shippingPolicy: string | null; returnsPolicy: string | null; paymentPolicy: string | null
  }
  seller: { id: string; name: string; avatar: string | null; verified: boolean; salesCount: number; memberSince: string }
  followers: number
  rating: Rating
  listings: Item[]
}

export default function ShopPage() {
  return <PanelProvider><ShopInner /></PanelProvider>
}

function ShopInner() {
  const slug = String(useParams().slug ?? '')
  const [data, setData] = useState<Shop | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [cat, setCat] = useState('All')

  useEffect(() => {
    if (!slug) return
    createLooseTrpcClient().business.bySlug.query({ slug })
      .then(d => { setData(d as Shop); setState('ready') })
      .catch(() => setState('notfound'))
  }, [slug])

  const accent = data?.shop.accentColour || 'var(--orange)'
  const featured = useMemo(() => {
    if (!data) return []
    const ids = new Set(data.shop.featuredIds)
    return data.listings.filter(l => ids.has(l.id))
  }, [data])
  const rest = useMemo(() => {
    if (!data) return []
    const feat = new Set(data.shop.featuredIds)
    return data.listings.filter(l => !feat.has(l.id))
  }, [data])

  if (state === 'loading') return <Shell><div style={pad}>Loading…</div></Shell>
  if (state === 'notfound' || !data) return <Shell><div style={pad}>This shop isn&apos;t available. <Link href="/" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back home</Link></div></Shell>

  const { shop, seller, rating, followers } = data
  const showFeaturedFirst = shop.template === 'showcase' || featured.length > 0

  return (
    <Shell>
      {/* Banner */}
      <div style={{ position: 'relative', height: 130, background: shop.bannerUrl ? `center/cover no-repeat url(${shop.bannerUrl})` : `linear-gradient(135deg,${accent},#FF8C00)` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }} />
      </div>

      <div style={{ padding: '0 16px', marginTop: -34, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: '#fff', boxShadow: '0 3px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
            {seller.avatar && seller.avatar.length > 2 ? <img src={seller.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} /> : '🏪'}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 19, fontWeight: 700, color: 'var(--dark)' }}>{seller.name}</span>
              {seller.verified && <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '2px 7px', borderRadius: 50 }}>🛡️ Verified</span>}
            </div>
            {shop.tagline && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#666', marginTop: 2 }}>{shop.tagline}</div>}
          </div>
        </div>

        {/* Stats: rating · followers · sales */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Stat value={`${rating.stars.toFixed(1)}★`} label={rating.provisional ? 'New shop' : 'Rating'} title={rating.parts.map(p => `${p.label}: ${p.score}/100 (${p.weight}%) — ${p.detail}`).join('\n')} />
          <Stat value={String(followers)} label="Followers" />
          <Stat value={String(seller.salesCount)} label="Sales" />
        </div>

        {shop.about && <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#444', lineHeight: 1.6, marginTop: 14 }}>{shop.about}</p>}

        {/* Category shelves */}
        {shop.categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '14px 0 4px' }}>
            {['All', ...shop.categories].map(c => (
              <button key={c} onClick={() => setCat(c)} style={{ flexShrink: 0, border: `1.5px solid ${cat === c ? accent : '#e5dccd'}`, background: cat === c ? accent : '#fff', color: cat === c ? '#fff' : '#555', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* Featured row */}
      {showFeaturedFirst && featured.length > 0 && cat === 'All' && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: accent, marginBottom: 10 }}>⭐ Featured</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {featured.map(l => <ItemCard key={l.id} l={l} accent={accent} wide />)}
          </div>
        </section>
      )}

      {/* All items */}
      <section style={{ padding: '16px 16px 0' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)', marginBottom: 10 }}>
          {cat === 'All' ? `${data.listings.length} items` : cat}
        </div>
        <div className={shop.template === 'minimal' ? '' : 'listing-grid'} style={{ display: shop.template === 'minimal' ? 'flex' : undefined, flexDirection: 'column', gap: shop.template === 'minimal' ? 8 : undefined }}>
          {(cat === 'All' ? rest : data.listings).length === 0
            ? <div style={{ gridColumn: '1/-1', padding: 30, textAlign: 'center', color: '#aaa', fontFamily: 'var(--font-nunito)' }}>Nothing here yet.</div>
            : (cat === 'All' ? rest : data.listings).map(l => <ItemCard key={l.id} l={l} accent={accent} />)}
        </div>
      </section>

      {/* Policies */}
      {(shop.shippingPolicy || shop.returnsPolicy || shop.paymentPolicy) && (
        <section style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shop.shippingPolicy && <Policy icon="🚚" title="Shipping" body={shop.shippingPolicy} />}
          {shop.returnsPolicy && <Policy icon="↩️" title="Returns" body={shop.returnsPolicy} />}
          {shop.paymentPolicy && <Policy icon="💳" title="Payment" body={shop.paymentPolicy} />}
        </section>
      )}

      <Footer />
    </Shell>
  )
}

function ItemCard({ l, accent, wide }: { l: Item; accent: string; wide?: boolean }) {
  return (
    <Link href={`/listings/${l.id}`} style={{ textDecoration: 'none', ...(wide ? { flex: '0 0 150px' } : {}) }}>
      <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '100%', paddingTop: '78%', position: 'relative', background: '#f5f0e8' }}>
          {l.images?.[0]
            ? <img src={l.images[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>{deptEmoji(l.department)}</div>}
          {l.isGrabItNow && <span style={{ position: 'absolute', top: 8, left: 8, background: accent, color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 8px', borderRadius: 50 }}>⚡ GRAB IT NOW</span>}
          {!!l.multibuyTiers?.length && <span style={{ position: 'absolute', bottom: 8, left: 8, background: '#fff', color: accent, fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 8px', borderRadius: 50, border: `1px solid ${accent}` }}>🏷️ Multibuy</span>}
        </div>
        <div style={{ padding: '10px 11px 12px' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: accent, marginTop: 2 }}>€{l.price.toLocaleString()}</div>
        </div>
      </div>
    </Link>
  )
}

function Stat({ value, label, title }: { value: string; label: string; title?: string }) {
  return (
    <div title={title} style={{ flex: 1, background: '#f9f6f2', border: '1px solid #efe7db', borderRadius: 12, padding: '9px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, color: '#888', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  )
}
function Policy({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{icon} {title}</div>
      <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</div>
    </div>
  )
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar />
      {children}
      <PanelHost />
    </main>
  )
}
const pad: React.CSSProperties = { padding: 50, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#888' }
