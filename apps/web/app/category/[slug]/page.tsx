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
import PageHero from '@/components/marketplace/PageHero'
import HomeGardenHero from '@/components/marketplace/HomeGardenHero'
import Pagination from '@/components/marketplace/Pagination'
import Place from '@/components/marketplace/Place'
import { DEPT_LABEL, deptEmoji, type DbListing } from '@/lib/listingMap'

// A department/category now opens its own page (matching /jobs and /property)
// instead of the old modal. Same site shell (Topbar + app-shell + Footer) with
// the category search inputs on top and the listing grid below.
// Per-category description shown above the subcategory pills. Copy supplied by
// Steve per category — add entries keyed by department slug as they arrive.
// Department page intros — Steve's lander copy, used verbatim. Headline + body
// sit under the page title, above the subcategory pills.
const CATEGORY_DESC: Record<string, { title: string; body: string }> = {
  home_garden: { title: 'Make your space feel like home.', body: "Sofas, tables, tools, plants and everything in between — kit out your home and garden for less, or sell the pieces you've outgrown. One person's clear-out is another's perfect find. Refresh your space, free up a room, and pocket some cash while you're at it." },
  fashion: { title: 'Look good, spend less, sell smart.', body: "Refresh your wardrobe without the price tag — or turn last season's finds into cash. From everyday staples to standout pieces, buy pre-loved fashion near you and give great clothes a second life. Clear out the closet, make some space, and stay stylish for less." },
  sport: { title: 'Get out, get active, get a bargain.', body: "Bikes, boards, boots and gear for every sport under the Canarian sun. Whether you're kitting out for a new hobby or selling the gear gathering dust in the garage, it's all here. Buy smart, sell easy, and get back out there." },
  gaming: { title: 'Level up for less.', body: "Consoles, games, controllers and collectibles — grab your next gaming fix without paying full price, or cash in the kit you've finished with. Trade up, clear the shelf, and keep playing. Game on!" },
  electronics: { title: 'Tech that works for you — and your wallet.', body: "Phones, laptops, TVs, gadgets and more, all from people near you. Upgrade for less, or sell your old tech and turn it into cash instead of clutter. Smart buys, quick sells, no drama." },
  gift_ideas: { title: 'The perfect gift is closer than you think.', body: "Stuck for ideas? Browse thoughtful, unique and budget-friendly gifts for every occasion, all sourced locally. Find something special, support island sellers, and make someone's day — without blowing the budget." },
  kids_baby: { title: 'Big savings for little ones.', body: "Kids grow fast — and so does the pile of stuff they've outgrown! Grab prams, toys, clothes and gear for a fraction of the price, or sell on what your little ones no longer need. Save money, free up space, and pass it on." },
  health_fitness: { title: 'Look after yourself for less.', body: "Skincare, haircare, wellness and beauty finds to help you feel your best. Discover great products from local sellers, or pass on the bits that weren't for you. Treat yourself, save a little, and glow on." },
  retro_vintage: { title: "Old soul? You'll love it here.", body: "Timeless furniture, vintage finds and mid-century treasures with real character. Hunt down that one-of-a-kind piece, or sell the classics you're ready to part with to someone who'll cherish them. History, style, and a great deal — all in one." },
  handy_help: { title: 'Need a hand? Find it here.', body: 'Your local classifieds for domestic and personal help — builders, joiners, electricians, plumbers, cleaners, gardeners, lawyers, dentists, doctors, nurses and more. Whatever the job, big or small, connect with trusted local people ready to help. Problem solved, the island way.' },
  pet_shop: { title: 'Everything for your best friend.', body: "Beds, bowls, toys, tanks and treats — spoil your pets for less, or sell on the supplies they no longer use. Great gear for happy pets, all from fellow island animal lovers. Because they deserve the best (for a bit less)." },
  hobbies_crafts: { title: 'Feed your passion for less.', body: "Art supplies, instruments, model kits, craft materials and more — whatever your hobby, stock up affordably or sell the kit you're no longer using. Start something new, clear out the old, and let your creativity loose." },
}

// The category hero image (the same artwork used for the round homepage tiles),
// shown oblong at the top of each category page. Slugs without an image fall
// back to the plain header. Keep in sync with /public/categories.
const CATEGORY_HERO: Record<string, string> = {
  home_garden: '/categories/home-garden.jpg',
  fashion: '/categories/fashion.jpg',
  sport: '/categories/sport.jpg',
  gaming: '/categories/gaming.jpg',
  electronics: '/categories/electronics.jpg',
  gift_ideas: '/categories/gift-ideas.jpg',
  kids_baby: '/categories/kids-baby.jpg',
  health_fitness: '/categories/health-beauty.jpg',
  retro_vintage: '/categories/retro.jpg',
  handy_help: '/categories/handy-help.jpg',
  pet_shop: '/categories/pet-supplies.jpg',
  hobbies_crafts: '/categories/hobbies-crafts.jpg',
}

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
  // Whether the in-feed sponsor slot actually has something to show on this page
  // (a live banner, or preview mode for admins). We only break the grid when it
  // does — otherwise the full-width wrapper would occupy an empty grid cell and
  // leave a gap, pushing the trailing cards onto a short line.
  const [infeedActive, setInfeedActive] = useState(false)
  useEffect(() => {
    const c = createLooseTrpcClient()
    c.banners.infeedConfig.query()
      .then(d => setInfeedEvery((d as { everyRows?: number })?.everyRows ?? 3)).catch(() => {})
    Promise.all([
      c.banners.active.query({ position: 'category_infeed', page: slug }).then(d => (d as unknown[])?.length > 0).catch(() => false),
      c.banners.previewMode.query().then(d => !!(d as { on?: boolean })?.on).catch(() => false),
    ]).then(([hasBanner, preview]) => setInfeedActive(hasBanner || preview))
  }, [slug])

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
        slug === 'home_garden'
          ? <HomeGardenHero image={CATEGORY_HERO[slug] || undefined} />
          : <PageHero title={label} tagline={CATEGORY_DESC[slug]?.title} body={CATEGORY_DESC[slug]?.body} image={CATEGORY_HERO[slug] || undefined} />
      } />

      {/* Sold banner placements — the paid category sponsor banner, below the hero */}
      <BannerSlot position="category" page={slug} aspect="1053 / 163" />


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
        {filtered.map((l, i) => {
          const img = Array.isArray(l.images) ? l.images[0] : null
          // A full-width in-feed sponsor banner after every `infeedEvery` rows
          // (~4 cards per row), so it breaks the grid at a natural cadence.
          const rowBreak = infeedActive && infeedEvery > 0 && i > 0 && i % (infeedEvery * 4) === 0
          return (
            <Fragment key={l.id}>
              {rowBreak && (
                <div style={{ gridColumn: '1/-1' }}>
                  <BannerSlot position="category_infeed" page={slug} aspect="1053 / 163" label="Category — in-feed" padded={false} />
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
      <BannerSlot position="category_footer" page={slug} aspect="1053 / 163" label="Category — bottom" />

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
    }}>➕ List an item</button>
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
