'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { DEPT_ENUM } from '@/lib/listingMap'

// Category tiles use Steve's circular illustrated artwork (name baked into the
// image, cream ground, sage brush stroke + heart). Categories he hasn't supplied
// art for yet get a matching circular placeholder so the whole grid reads as one
// set — swap in a real image at /public/categories when it arrives.
type Cat = { name: string; img?: string }

const categories: Cat[] = [
  { name: 'Home & Garden', img: '/categories/home-garden.jpg' },
  { name: 'Fashion', img: '/categories/fashion.jpg' },
  { name: 'Sport', img: '/categories/sport.jpg' },
  { name: 'Gaming', img: '/categories/gaming.jpg' },
  { name: 'Electronics', img: '/categories/electronics.jpg' },
  { name: 'Gift Ideas', img: '/categories/gift-ideas.jpg' },
  { name: 'Kids & Baby', img: '/categories/kids-baby.jpg' },
  { name: 'Health, Fitness & Diet', img: '/categories/health-beauty.jpg' },
  { name: 'Retro & Vintage', img: '/categories/retro.jpg' },
  { name: 'Handy Help', img: '/categories/handy-help.jpg' },
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
  const { openPanel } = usePanel()
  const router = useRouter()

  const handleTap = (cat: Cat) => {
    setActive(cat.name)
    // Jobs and Property have dedicated full pages with advanced search.
    if (cat.name === 'Jobs') return void router.push('/jobs')
    if (cat.name === 'Property') return void router.push('/property')
    if (cat.name === 'Grab It Now') return void router.push('/grabit')
    const slug = DEPT_ENUM[cat.name]
    if (slug) router.push(`/category/${slug}`)
    else openPanel('dept', { name: cat.name })
  }

  return (
    <section className="dept-grid-wrap" style={{ paddingTop: 16 }}>
      <div className="dept-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '0 12px' }}>
        {categories.map(cat => {
          const showImg = cat.img && !failed[cat.name]
          const isActive = active === cat.name
          return (
            <button
              key={cat.name}
              onClick={() => handleTap(cat)}
              aria-label={cat.name}
              className="cat-card"
              style={{
                position: 'relative', border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: '50%', overflow: 'hidden', aspectRatio: '1 / 1', background: '#f6f1e6',
                boxShadow: isActive ? '0 0 0 3px rgba(245,84,10,0.55)' : '0 2px 8px rgba(0,0,0,0.12)',
                outline: '1px solid #e8ddc7', outlineOffset: -1,
                transition: 'transform .15s ease, box-shadow .15s ease',
              }}
            >
              {showImg
                ? <img
                    src={cat.img}
                    alt={cat.name}
                    loading="lazy"
                    onError={() => setFailed(f => ({ ...f, [cat.name]: true }))}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                : <Placeholder name={cat.name} />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
