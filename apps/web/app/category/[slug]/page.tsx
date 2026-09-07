'use client'
import { useEffect, useMemo, useState } from 'react'
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
  // Admin-managed header artwork for this category (the wide hero banner).
  const [hdr, setHdr] = useState<{ img: string | null; bgImage: string | null; heroBanner: string | null } | null>(null)
  useEffect(() => {
    if (!slug) return
    createLooseTrpcClient().homepage.categoryHeader.query({ department: slug })
      .then(h => setHdr(h as { img: string | null; bgImage: string | null; heroBanner: string | null } | null)).catch(() => {})
  }, [slug])
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
      <QuickActions belowPromo={
        <CategoryHero banner={hdr?.heroBanner || null} title={label} />
      } />

      {/* Sold banner placements — the paid category sponsor banner, below the hero.
          Constrained to the SAME centred 1000px footprint as the hero above it so
          the two line up (a 1053×163 creative at this width is ~155px tall, matching
          the hero height — no cropping). */}
      <div style={{ maxWidth: 1000, margin: '10px auto 0', padding: '0 18px', width: '100%', boxSizing: 'border-box' }}>
        <BannerSlot position="category" page={slug} aspect="1053 / 163" padded={false} />
      </div>


      <header style={{ background: 'var(--sand)', padding: '14px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        {/* Wrap onto multiple lines rather than a slidable bar, so every
            subcategory is visible at once (nothing cut off). Small screens
            flow to a few rows; wide screens fit on one. On the Handy Help
            lander the "Place an ad" button sits in line with the pills. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
          {subcats.length > 1 && subcats.map(sub => <Chip key={sub} active={activeSub === sub} onClick={() => setActiveSub(sub)}>{sub}</Chip>)}
          <span style={{ marginLeft: 'auto' }}>
            {slug === 'handy_help' ? <PlaceHandyAdButton /> : <PlaceListingButton category={SELL_DEPT[slug]} />}
          </span>
        </div>
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
        {filtered.map((l) => {
          const img = Array.isArray(l.images) ? l.images[0] : null
          return (
              <Link key={l.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
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
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 18px', width: '100%', boxSizing: 'border-box' }}>
        <BannerSlot position="category_footer" page={slug} aspect="1053 / 163" padded={false} label="Category — bottom" />
      </div>

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

// Category page hero: a wide banner (uploaded per-category in the Categories
// admin) shown full-width. The old round-icon + text header has been retired —
// the banner carries the branding. Renders nothing until a banner is set.
function CategoryHero({ banner, title }: { banner: string | null; title: string }) {
  if (!banner) return null
  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <img src={banner} alt={title} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 16 }} />
    </div>
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

// Map a category slug → the exact department label the add-a-listing form uses,
// so the picker pre-selects it (and it never mis-saves as "Other"). Slugs the
// sell form doesn't offer (Gift Ideas, Health, Food, Grab It Now, Jobs,
// Property) are left out — the button still opens the form, just unfilled.
const SELL_DEPT: Record<string, string> = {
  electronics: 'Electronics', fashion: 'Fashion', home_garden: 'Home & Garden', sport: 'Sport & Leisure',
  retro_vintage: 'Retro & Vintage', gaming: 'Gaming', pet_shop: 'Pet Supplies', motors: 'Motors',
  kids_baby: 'Kids & Baby', handy_help: 'Handy Help', hobbies_crafts: 'Hobbies & Crafts',
  services: 'Services', collectables: 'Collectables',
}

// Same pill as Handy Help's "Place an ad", but opens the add-a-listing flow
// pre-set to this category page's department (when the form supports it).
function PlaceListingButton({ category }: { category?: string }) {
  const { openPanel } = usePanel()
  return (
    <button onClick={() => openPanel('createListing', category ? { category } : undefined)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--orange)', color: '#fff',
      border: 'none', borderRadius: 999, padding: '6px 13px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>List an item</button>
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
