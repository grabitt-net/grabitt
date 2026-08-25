'use client'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createLooseTrpcClient } from '@/lib/trpc'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import BannerSlot from '@/components/marketplace/BannerSlot'
import Pagination from '@/components/marketplace/Pagination'
import Place from '@/components/marketplace/Place'
import { DEPT_LABEL, deptEmoji, type DbListing } from '@/lib/listingMap'

// A department/category now opens its own page (matching /jobs and /property)
// instead of the old modal. Same site shell (Topbar + app-shell + Footer) with
// the category search inputs on top and the listing grid below.
// Per-category description shown above the subcategory pills. Copy supplied by
// Steve per category — add entries keyed by department slug as they arrive.
const CATEGORY_DESC: Record<string, string> = {}

const SUBCATS: Record<string, string[]> = {
  // Exact subcategories from the V20 prototype's deptConfig, each with an 'All'
  // pill prepended. Departments the prototype didn't define keep a sensible set.
  'Electronics':            ['All', 'Phones', 'Laptops & Mac', 'TVs', 'Cameras', 'Audio', 'Gaming', 'Tablets', 'Accessories'],
  'Fashion':                ['All', 'Womens Clothing', 'Mens Clothing', 'Shoes', 'Bags', 'Jewellery', 'Kids Fashion', 'Vintage', 'Accessories', 'Sportswear', 'Fancy Dress', 'Uniforms'],
  'Home & Garden':          ['All', 'Soft Furnishings', 'Furniture', 'Wall Art', 'Ceramics', 'Home Office', 'Lighting', 'Kitchenware', 'Kitchen Electricals', 'Household Electricals', 'Dining Utensils', 'Bathroom', 'Flooring', 'Bedroom', 'Plants', 'Garden Furniture', 'Garden Equipment'],
  'Sport':                  ['All', 'Cycling', 'Water Sports', 'Football', 'Golf', 'Gym & Fitness', 'Running', 'Tennis', 'Winter Sports', 'Volleyball', 'Sportswear', 'Basketball'],
  'Gaming':                 ['All', 'PlayStation', 'Xbox', 'Nintendo', 'PC Gaming', 'Board Games', 'Trading Cards', 'Instruments', 'Drones'],
  'Food Store':             ['All', 'Wine & Spirits', 'International Food', 'Coffee & Tea', 'Organic', 'BBQ', 'Cheese', 'Craft Beer', 'Oils & Sauces'],
  'Gift Ideas':             ['All', 'Jewellery', 'Watches', 'Art', 'Candles & Scents', 'Gift Boxes', 'Ceramics', 'Handmade', 'Crystals'],
  'Kids & Baby':            ['All', 'Toys', 'Baby Gear', 'Kids Bikes', 'Clothes 0-3', 'Clothes 4-12', 'Books', 'School Supplies', 'Games'],
  'Health, Fitness & Diet': ['All', 'Skincare', 'Vitamins', 'Fitness', 'Equipment', 'Massage', 'Yoga', 'Dental', 'Optical', 'Hair Care', 'Beauty', 'Muscle Care'],
  'Retro & Vintage':        ['All', 'Mid Century', 'Funky Stuff!', 'Vintage Clothing', 'Antiques', 'Furniture', 'Electrical', 'Kitchenware', 'Ceramics', 'Glassware', 'Records', 'Office'],
  'Handy Help':             ['All', 'Plumbers', 'Carpenter', 'Sewing', 'Metalwork', 'Gardening', 'Cleaning', 'Roofing', 'Electrics', 'Building', 'Windows & Doors', 'Car Repair', 'Removals & Storage', 'Translation Services', 'Personal Assist'],
  'Pet Supplies':               ['All', 'Dog Food', 'Cat Food', 'Toys', 'Bedding', 'Collars', 'Treats', 'Accessories', 'Fish tanks'],
  // Not defined in the prototype — kept from the earlier build.
  'Grab It Now':            ['All', 'Electronics', 'Furniture', 'Fashion', 'Sport', 'Other'],
  'Hobbies & Crafts':       ['All', 'Wool & Yarn', 'Fabric & Sewing', 'Art Supplies', 'Model Making', 'Scrapbooking', 'Beads & Jewellery', 'Tools'],
  'Motors':                 ['All', 'Cars', 'Motorbikes', 'Scooters', 'Vans', 'Parts', 'Accessories', 'Bicycles'],
  'Collectables':           ['All', 'Coins', 'Stamps', 'Trading Cards', 'Memorabilia', 'Antiques', 'Art', 'Militaria'],
  'Services':               ['All', 'Tuition', 'Beauty', 'Events', 'Photography', 'Design', 'Repairs'],
}

export default function CategoryPage() {
  const params = useParams()
  const slug = String(params?.slug ?? '')
  const label = DEPT_LABEL[slug] ?? 'Listings'
  const emoji = deptEmoji(slug)
  const subcats = SUBCATS[label] ?? ['All']

  const [activeSub, setActiveSub] = useState('All')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [items, setItems] = useState<DbListing[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PER_PAGE = 50

  // Reset to the first page whenever the category or sort order changes.
  useEffect(() => { setPage(1) }, [slug, sort])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    createLooseTrpcClient().listings.getByDept.query({ department: slug, sort, page, limit: PER_PAGE })
      .then(res => {
        const r = res as { items?: DbListing[]; total?: number }
        setItems((r.items ?? []) as DbListing[]); setTotal(r.total ?? 0); setLoading(false)
      })
      .catch(() => { setItems([]); setTotal(0); setLoading(false) })
  }, [slug, sort, page])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  // In-feed banner cadence — an admin-set number of listing rows (~4 cards each).
  const [infeedEvery, setInfeedEvery] = useState(3)
  useEffect(() => {
    createLooseTrpcClient().banners.infeedConfig.query()
      .then(d => setInfeedEvery((d as { everyRows?: number })?.everyRows ?? 3)).catch(() => {})
  }, [])

  // Free-text + subcategory filtering happens client-side over the fetched set.
  // There is no real "subcategory" column, so a pill matches when any of its
  // meaningful words appears in the listing's title, description or auto-tags.
  const filtered = useMemo(() => {
    const subWords = activeSub !== 'All'
      ? activeSub.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 3)
      : []
    return items.filter(l => {
      const li = l as DbListing & { description?: string; tags?: string[] }
      const haystack = [li.title, li.description, ...(li.tags ?? [])].join(' ').toLowerCase()
      if (subWords.length && !subWords.some(w => haystack.includes(w))) return false
      return true
    })
  }, [items, activeSub])

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title={label} />
      <QuickActions />

      {/* Category Sponsor — the fixed top banner for this category (1 advertiser) */}
      <BannerSlot position="category" page={slug} aspect="5 / 1" />


      <header style={{ background: 'var(--sand)', padding: '14px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        {/* Category description — copy supplied per category (CATEGORY_DESC).
            Sits above the subcategory pills; the search lives in the header bar. */}
        {CATEGORY_DESC[slug] && (
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.6, margin: '0 0 12px', maxWidth: 760 }}>{CATEGORY_DESC[slug]}</p>
        )}

        {/* Wrap onto multiple lines rather than a slidable bar, so every
            subcategory is visible at once (nothing cut off). Small screens
            flow to a few rows; wide screens fit on one. On the Handy Help
            lander the "Place an ad" button sits in line with the pills. */}
        {(subcats.length > 1 || slug === 'handy_help') && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
            {slug === 'handy_help' && <PlaceHandyAdButton />}
            {subcats.map(sub => <Chip key={sub} active={activeSub === sub} onClick={() => setActiveSub(sub)}>{sub}</Chip>)}
          </div>
        )}
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? 'Loading…' : `${total} listing${total === 1 ? '' : 's'}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={sel}>
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <div className="category-grid">
        {filtered.map((l, i) => {
          const img = Array.isArray(l.images) ? l.images[0] : null
          // A full-width in-feed sponsor banner after every `infeedEvery` rows
          // (~4 cards per row), so it breaks the grid at a natural cadence.
          const rowBreak = infeedEvery > 0 && i > 0 && i % (infeedEvery * 4) === 0
          return (
            <Fragment key={l.id}>
              {rowBreak && (
                <div style={{ gridColumn: '1/-1' }}>
                  <BannerSlot position="category_infeed" page={slug} aspect="7 / 1" label="Category — in-feed" padded={false} />
                </div>
              )}
              <Link href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                <div className="product-card" style={card}>
                  <div style={{ width: '100%', paddingTop: '72%', position: 'relative', background: 'var(--sand)' }}>
                    {img
                      ? <img loading="lazy" decoding="async" src={img} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{emoji}</div>}
                  </div>
                  <div style={{ padding: '10px 11px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)', margin: '3px 0' }}>€{Number(l.price ?? 0).toLocaleString()}</div>
                    <Place style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: 'var(--ink-2)' }}>{l.location ?? 'Canary Islands'}</Place>
                  </div>
                </div>
              </Link>
            </Fragment>
          )
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No listings in {label} yet</div>
          </div>
        )}
      </div>

      {/* Category — bottom banner (rotating Featured Partners for this page) */}
      <BannerSlot position="category_footer" page={slug} aspect="6 / 1" label="Category — bottom" />

      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      )}

      <Footer />
      <CartFab />
      <PanelHost />
    </main>
    </PanelProvider>
  )
}

// "Place an ad" for the Handy Help lander — opens the two-part Handy Help post
// form (business €9.99 gate applies to a business offer). Sized to sit in line
// with the subcategory pills.
function PlaceHandyAdButton() {
  const { openPanel } = usePanel()
  return (
    <button onClick={() => openPanel('handyPost', { kind: 'request' })} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--orange)', color: '#fff',
      border: 'none', borderRadius: 999, padding: '6px 13px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>🔧 Place an ad</button>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', border: `1.5px solid ${active ? 'var(--orange)' : '#e5dccd'}`, background: active ? 'var(--orange)' : '#fff',
      color: active ? '#fff' : '#555', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }
const sel: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '7px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fff' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }
