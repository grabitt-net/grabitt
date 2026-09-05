'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { createLooseTrpcClient } from '@/lib/trpc'
import { DEPT_ENUM } from '@/lib/listingMap'

// Category tiles use Steve's circular illustrated artwork (name baked into the
// image, cream ground, sage brush stroke + heart). Categories he hasn't supplied
// art for yet get a matching circular placeholder so the whole grid reads as one
// set — swap in a real image at /public/categories when it arrives.
type Cat = { name: string; img?: string | null }

// Default order — also the fallback if the admin-controlled list can't be
// fetched, and the seed shape for the HomeCategory table.
const DEFAULT_CATEGORIES: Cat[] = [
  { name: 'Home & Garden', img: '/categories/home-garden.jpg' },
  { name: 'Fashion', img: '/categories/fashion.jpg' },
  { name: 'Sport', img: '/categories/sport.jpg' },
  { name: 'Gaming', img: '/categories/gaming.jpg' },
  { name: 'Electronics', img: '/categories/electronics.jpg' },
  { name: 'Gift Ideas', img: '/categories/gift-ideas.jpg' },
  { name: 'Kids & Baby', img: '/categories/kids-baby.jpg' },
  { name: 'Health, Fitness & Diet', img: '/categories/health-beauty.jpg' },
  { name: 'Retro & Vintage', img: '/categories/retro.jpg' },
  { name: 'Handy Help', img: '/categories/handy-help-v2.jpg' },
  { name: 'Pet Supplies', img: '/categories/pet-supplies.jpg' },
  { name: 'Hobbies & Crafts', img: '/categories/hobbies-crafts.jpg' },
]

// Circular placeholder matching the artwork style — cream ground, a soft sage
// brush blob, the category name and a little heart.
function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#f6f1e6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '78%', height: '34%', background: '#c7cf9f', opacity: 0.55, borderRadius: '45% 55% 48% 52%', filter: 'blur(3px)' }} />
      <span style={{ position: 'relative', fontFamily: 'var(--font-nunito)', fontWeight: 900, fontSize: 'clamp(10px, 2.3vw, 16px)', color: '#33352f', textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.08, letterSpacing: 0.2 }}>{name}</span>
      <span style={{ position: 'relative', color: '#8a9a5b', fontSize: 'clamp(11px, 2vw, 15px)', marginTop: 3, lineHeight: 1 }}>♥</span>
    </div>
  )
}

export default function CategoryGrid() {
  const [active, setActive] = useState<string | null>(null)
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  // Admin-ordered tiles from homepage.categories; falls back to the default set
  // if the fetch fails or nothing is configured yet.
  const [categories, setCategories] = useState<Cat[]>(DEFAULT_CATEGORIES)
  const { openPanel } = usePanel()
  const router = useRouter()

  useEffect(() => {
    createLooseTrpcClient().homepage.categories.query()
      .then(rows => {
        const list = rows as Cat[]
        if (list.length) setCategories(list)
      })
      .catch(() => {})
  }, [])

  const handleTap = (cat: Cat) => {
    setActive(cat.name)
    // Jobs and Property have dedicated full pages with advanced search.
    if (cat.name === 'Jobs') return void router.push('/jobs')
    if (cat.name === 'Property') return void router.push('/property')
    if (cat.name === 'Grab It Now') return void router.push('/grabitt-now')
    const slug = DEPT_ENUM[cat.name]
    if (slug) router.push(`/category/${slug}`)
    else openPanel('dept', { name: cat.name })
  }

  return (
    <section className="dept-grid-wrap" style={{ paddingTop: 16 }}>
      <div className="dept-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '0 12px' }}>
        {categories.map(cat => {
          // ── TEMPORARY TEST (for Steve) ──────────────────────────────────────
          // Force EVERY tile to the recently-uploaded rectangular artwork so he
          // can see how the whole grid would look rectangular. Revert by deleting
          // these two lines (restores per-category images + round tiles).
          const TEST_RECT_ALL = true
          const img = TEST_RECT_ALL ? '/categories/handy-help-v2.jpg' : cat.img
          const showImg = img && !failed[cat.name]
          const isActive = active === cat.name
          // Handy Help is trialled as a full-width RECTANGULAR banner tile (so
          // Steve can compare it against the round tiles). The rest stay round.
          const rect = TEST_RECT_ALL || cat.name === 'Handy Help'
          const radius = rect ? 16 : '50%'
          return (
            <button
              key={cat.name}
              onClick={() => handleTap(cat)}
              aria-label={cat.name}
              className="cat-card"
              style={{
                position: 'relative', border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: radius, overflow: 'hidden', background: '#f6f1e6',
                aspectRatio: '1 / 1',
                boxShadow: isActive ? '0 0 0 3px rgba(245,84,10,0.55)' : '0 2px 8px rgba(0,0,0,0.12)',
                outline: '1px solid #e8ddc7', outlineOffset: -1,
                transition: 'transform .15s ease, box-shadow .15s ease',
              }}
            >
              {showImg
                ? <img
                    src={img ?? undefined}
                    alt={cat.name}
                    loading="lazy"
                    onError={() => setFailed(f => ({ ...f, [cat.name]: true }))}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius }}
                  />
                : <Placeholder name={cat.name} />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
