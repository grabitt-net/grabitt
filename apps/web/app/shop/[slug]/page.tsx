'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import { createLooseTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { toast } from '@/lib/ui'
import { deptEmoji, DEPT_LABEL } from '@/lib/listingMap'
import { useGrabittUid } from '@/hooks/useGrabittUid'

// A business's public shop page: full banner, the seller's identity + service
// rating, a Follow button, category shelves derived from what they actually
// sell, featured items pinned up top, and their policies.
type Rating = { score: number; stars: number; provisional: boolean; parts: { key: string; label: string; score: number; weight: number; detail: string }[] }
type Item = {
  id: string; title: string; price: number; images: string[]; location: string
  department: string; condition: string | null; status: string; isFeatured: boolean
  isGrabItNow: boolean; multibuyTiers: { qty: number; discountPct: number }[] | null
}
type Shop = {
  shop: {
    slug: string; template: string; tagline: string | null; about: string | null
    bannerUrl: string | null; logoUrl: string | null; accentColour: string | null; categories: string[]; featuredIds: string[]
    shippingPolicy: string | null; returnsPolicy: string | null; paymentPolicy: string | null
  }
  seller: { id: string; name: string; avatar: string | null; verified: boolean; salesCount: number; memberSince: string }
  followers: number
  rating: Rating
  listings: Item[]
}

const catOf = (l: Item) => DEPT_LABEL[l.department] ?? l.department

// Each storefront template is a distinct layout. `minCol` sets grid column
// density, `featuredPx` the width of featured cards (bigger = more of a hero
// row), and the flags toggle the category chips / featured shelf / policies.
type Tpl = { minCol: number; gap: number; featuredPx: number; showFeatured: boolean; showCats: boolean; showPolicies: boolean }
const TEMPLATES: Record<string, Tpl> = {
  classic:  { minCol: 150, gap: 10, featuredPx: 150, showFeatured: true,  showCats: true,  showPolicies: true },
  grid:     { minCol: 118, gap: 8,  featuredPx: 132, showFeatured: true,  showCats: true,  showPolicies: true },
  showcase: { minCol: 168, gap: 12, featuredPx: 230, showFeatured: true,  showCats: true,  showPolicies: true },
  minimal:  { minCol: 180, gap: 12, featuredPx: 150, showFeatured: false, showCats: false, showPolicies: false },
}

export default function ShopPage() {
  return <PanelProvider><ShopInner /></PanelProvider>
}

function ShopInner() {
  const slug = String(useParams().slug ?? '')
  const uid = useGrabittUid()
  const { panel, openPanel } = usePanel()
  const [data, setData] = useState<Shop | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [cat, setCat] = useState('All')

  const fetchShop = useCallback(() => {
    if (!slug) return
    createLooseTrpcClient().business.bySlug.query({ slug })
      .then(d => { setData(d as Shop); setState('ready') })
      .catch(() => setState('notfound'))
  }, [slug])

  useEffect(() => { fetchShop() }, [fetchShop])

  // When the owner finishes editing (the storefront editor panel closes),
  // pull the shop again so their changes show without a manual refresh.
  const wasEditing = useRef(false)
  useEffect(() => {
    if (panel.id === 'storefrontEdit') wasEditing.current = true
    else if (wasEditing.current) { wasEditing.current = false; fetchShop() }
  }, [panel.id, fetchShop])

  const accent = data?.shop.accentColour || 'var(--orange)'
  const featured = useMemo(() => {
    if (!data) return []
    const ids = new Set(data.shop.featuredIds)
    return data.listings.filter(l => ids.has(l.id))
  }, [data])
  // Category chips come from what the shop actually sells (so they always work),
  // falling back to any custom categories the seller configured.
  const cats = useMemo(() => {
    if (!data) return []
    const fromItems = Array.from(new Set(data.listings.map(catOf)))
    return fromItems.length ? fromItems : data.shop.categories
  }, [data])
  const visible = useMemo(() => {
    if (!data) return []
    // When the template shows a separate Featured shelf, featured items are
    // pulled out of the main grid (on All) to avoid duplication. When it doesn't
    // (e.g. Minimal), they stay in the grid so they aren't hidden.
    const showsFeaturedRow = (TEMPLATES[data.shop.template] ?? TEMPLATES.classic).showFeatured
    const featIds = new Set(data.shop.featuredIds)
    return data.listings.filter(l => (cat === 'All' || catOf(l) === cat) && !(cat === 'All' && showsFeaturedRow && featIds.has(l.id)))
  }, [data, cat])

  if (state === 'loading') return <Shell><div style={pad}>Loading…</div></Shell>
  if (state === 'notfound' || !data) return <Shell><div style={pad}>This shop isn&apos;t available. <Link href="/" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back home</Link></div></Shell>

  const { shop, seller, rating, followers } = data
  const logo = shop.logoUrl || (seller.avatar && seller.avatar.length > 2 ? seller.avatar : null)
  const isOwner = !!uid && uid === seller.id
  // The chosen layout template actually reshapes the shop: column density, how
  // prominent the featured row is, and which chrome (category chips, policies)
  // shows. See the labels in the storefront editor.
  const tpl = TEMPLATES[shop.template] ?? TEMPLATES.classic
  const featSet = new Set(shop.featuredIds)

  // Owner: toggle an item's Featured status straight from the shop page. Updates
  // optimistically, then persists the new featured list to the storefront.
  const toggleFeatured = async (id: string) => {
    if (!data) return
    const cur = new Set(data.shop.featuredIds)
    if (cur.has(id)) cur.delete(id); else cur.add(id)
    const next = [...cur].slice(0, 12)
    setData({ ...data, shop: { ...data.shop, featuredIds: next } })
    try { await trpcAuthed().business.upsertStorefront.mutate({ featuredIds: next }) }
    catch { toast('Could not update featured items.'); fetchShop() }
  }

  return (
    <Shell>
      {/* Banner — full width, fills the space edge-to-edge (no black bars). A
          light ground shows only behind any transparency in the artwork. */}
      <div style={{ width: '100%', background: shop.bannerUrl ? '#fff' : `linear-gradient(135deg,${accent},var(--orange2))`, aspectRatio: '1053 / 300', maxHeight: 340, overflow: 'hidden' }}>
        {shop.bannerUrl && <img src={shop.bannerUrl} alt={`${seller.name} banner`} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>

      {/* Identity: only the logo overlaps the banner — the name sits below it on
          the page so it can never be clipped by the banner edge. */}
      <div style={{ padding: '0 16px', position: 'relative' }}>
        <div style={{ marginTop: -34, width: 72, height: 72, borderRadius: 18, background: '#fff', boxShadow: '0 3px 12px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, overflow: 'hidden' }}>
          {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 28, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.15 }}>{seller.name}</span>
            {seller.verified && <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '4px 11px', borderRadius: 50 }}>🛡️ Verified</span>}
          </div>
          {shop.tagline && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#666', marginTop: 4 }}>{shop.tagline}</div>}
        </div>

        {/* Actions — the owner sees an Edit button to change everything; visitors
            see Follow + Share. */}
        {isOwner ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => openPanel('storefrontEdit')} style={{ flex: 1, border: 'none', background: accent, color: '#fff', borderRadius: 50, padding: '11px 0', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, cursor: 'pointer' }}>✏️ Edit shop</button>
            <ShareButton name={seller.name} />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <FollowButton sellerId={seller.id} accent={accent} onCount={() => {}} />
            <ShareButton name={seller.name} />
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Stat value={rating.provisional ? 'New' : `${rating.stars.toFixed(1)}★`} label={rating.provisional ? 'No ratings yet' : 'Rating'} title={rating.provisional ? 'Rating appears once this shop has sales and reviews' : rating.parts.map(p => `${p.label}: ${p.score}/100 (${p.weight}%) — ${p.detail}`).join('\n')} />
          <Stat value={String(followers)} label="Followers" />
          <Stat value={String(seller.salesCount)} label="Sales" />
          <Stat value={new Date(seller.memberSince).getFullYear().toString()} label="Since" />
        </div>

        {shop.about && (
          <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: '13px 15px', marginTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>About</div>
            <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#444', lineHeight: 1.6, margin: 0 }}>{shop.about}</p>
          </div>
        )}

        {/* Category shelves */}
        {tpl.showCats && cats.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '14px 0 4px' }}>
            {['All', ...cats].map(c => (
              <button key={c} onClick={() => setCat(c)} style={{ flexShrink: 0, border: `1.5px solid ${cat === c ? accent : '#e5dccd'}`, background: cat === c ? accent : '#fff', color: cat === c ? '#fff' : '#555', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* Featured row (only on All) */}
      {tpl.showFeatured && featured.length > 0 && cat === 'All' && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: shop.template === 'showcase' ? 16 : 13, fontWeight: 900, color: accent, marginBottom: 10 }}>⭐ Featured</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {featured.map(l => <ItemCard key={l.id} l={l} accent={accent} widePx={tpl.featuredPx} owner={isOwner} featured={featSet.has(l.id)} onToggleFeatured={toggleFeatured} />)}
          </div>
        </section>
      )}

      {/* Items */}
      <section style={{ padding: '16px 16px 0' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)', marginBottom: 10 }}>
          {cat === 'All' ? `${data.listings.length} item${data.listings.length === 1 ? '' : 's'}` : `${visible.length} in ${cat}`}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${tpl.minCol}px, 1fr))`, gap: tpl.gap }}>
          {visible.length === 0
            ? <div style={{ gridColumn: '1/-1', padding: 30, textAlign: 'center', color: '#aaa', fontFamily: 'var(--font-nunito)' }}>Nothing here yet.</div>
            : visible.map(l => <ItemCard key={l.id} l={l} accent={accent} owner={isOwner} featured={featSet.has(l.id)} onToggleFeatured={toggleFeatured} />)}
        </div>
      </section>

      {/* Policies */}
      {tpl.showPolicies && (shop.shippingPolicy || shop.returnsPolicy || shop.paymentPolicy) && (
        <section style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>Shop info</div>
          {shop.shippingPolicy && <Policy icon="🚚" title="Delivery" body={shop.shippingPolicy} />}
          {shop.returnsPolicy && <Policy icon="↩️" title="Returns" body={shop.returnsPolicy} />}
          {shop.paymentPolicy && <Policy icon="💳" title="Payment" body={shop.paymentPolicy} />}
        </section>
      )}

      <Footer />
    </Shell>
  )
}

function FollowButton({ sellerId, accent }: { sellerId: string; accent: string; onCount?: () => void }) {
  const router = useRouter()
  const [following, setFollowing] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { setFollowing(false); return }
    try { const r = await (trpcAuthed() as any).follow.status.query({ sellerId }); setFollowing(!!r?.following) } catch { setFollowing(false) }
  }, [sellerId])
  useEffect(() => { load() }, [load])

  const toggle = async () => {
    const token = getAuthToken() ?? await refreshAuthToken()
    if (!token) { router.push(`/auth?next=${encodeURIComponent(location.pathname)}`); return }
    setBusy(true)
    try {
      if (following) { await (trpcAuthed() as any).follow.unfollow.mutate({ sellerId }); setFollowing(false) }
      else { await (trpcAuthed() as any).follow.follow.mutate({ sellerId }); setFollowing(true); toast('Following — you’ll see their new listings.') }
    } catch { toast('Could not update. Please try again.') } finally { setBusy(false) }
  }

  const on = following === true
  return (
    <button onClick={toggle} disabled={busy} style={{
      flex: 1, border: on ? '1.5px solid #ccc' : 'none', background: on ? '#fff' : accent, color: on ? '#555' : '#fff',
      borderRadius: 50, padding: '11px 0', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, cursor: busy ? 'wait' : 'pointer',
    }}>{on ? '✓ Following' : '＋ Follow shop'}</button>
  )
}

function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && 'share' in navigator) { try { await (navigator as any).share({ title: name, url }); return } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* blocked */ }
  }
  return (
    <button onClick={share} style={{ flexShrink: 0, border: '1.5px solid #e5dccd', background: '#fff', color: 'var(--dark)', borderRadius: 50, padding: '11px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, cursor: 'pointer' }}>{copied ? 'Copied ✓' : '🔗 Share'}</button>
  )
}

function ItemCard({ l, accent, widePx, owner, featured, onToggleFeatured }: { l: Item; accent: string; widePx?: number; owner?: boolean; featured?: boolean; onToggleFeatured?: (id: string) => void }) {
  return (
    <Link href={`/listings/${l.id}`} style={{ textDecoration: 'none', ...(widePx ? { flex: `0 0 ${widePx}px` } : {}) }}>
      <div style={{ background: '#fff', border: `1px solid ${featured ? accent : '#ece3d7'}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '100%', paddingTop: '78%', position: 'relative', background: '#f5f0e8' }}>
          {l.images?.[0]
            ? <img src={l.images[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>{deptEmoji(l.department)}</div>}
          {l.isGrabItNow && <span style={{ position: 'absolute', top: 8, left: 8, background: accent, color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 8px', borderRadius: 50 }}>⚡ GRAB IT NOW</span>}
          {!!l.multibuyTiers?.length && <span style={{ position: 'absolute', bottom: 8, left: 8, background: '#fff', color: accent, fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 8px', borderRadius: 50, border: `1px solid ${accent}` }}>🏷️ Multibuy</span>}
          {/* Owner-only: star toggle to feature/unfeature this item on the shop. */}
          {owner && onToggleFeatured && (
            <span
              role="button"
              tabIndex={0}
              title={featured ? 'Remove from your shop’s Featured shelf' : 'Feature on your shop (storefront only)'}
              aria-label={featured ? 'Remove from your shop’s Featured shelf' : 'Feature on your shop'}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFeatured(l.id) }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleFeatured(l.id) } }}
              style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: featured ? accent : 'rgba(255,255,255,0.92)', color: featured ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
            >{featured ? '★' : '☆'}</span>
          )}
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
