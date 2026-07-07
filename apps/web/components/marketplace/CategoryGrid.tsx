'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'

// Category tiles now use real photography (Unsplash) layered over the brand
// gradient. The gradient stays as a base so a failed image simply falls back to
// gradient + emoji — the card never renders broken. `img` param sizes are small
// + cropped for fast loading.
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=320&h=320&fit=crop&q=55&auto=format`

const categories = [
  { icon: '🏡', name: 'Home & Garden', grad: 'linear-gradient(135deg,#56ab2f,#a8e063)', img: IMG('photo-1416879595882-3373a0480b5b') },
  { icon: '💼', name: 'Jobs', grad: 'linear-gradient(135deg,#2193b0,#6dd5ed)', img: IMG('photo-1521737604893-d14cc237f11d') },
  { icon: '👗', name: 'Fashion', grad: 'linear-gradient(135deg,#f7971e,#ffd200)', img: IMG('photo-1445205170230-053b83016050') },
  { icon: '⚽', name: 'Sport', grad: 'linear-gradient(135deg,#11998e,#38ef7d)', img: IMG('photo-1461896836934-ffe607ba8211') },
  { icon: '🎮', name: 'Gaming', grad: 'linear-gradient(135deg,#8E2DE2,#c471f5)', img: IMG('photo-1542751371-adc38448a05e') },
  { icon: '📱', name: 'Electronics', grad: 'linear-gradient(135deg,#4776E6,#8E54E9)', img: IMG('photo-1498049794561-7780e7231661') },
  { icon: '🎁', name: 'Gift Ideas', grad: 'linear-gradient(135deg,#f953c6,#b91d73)', img: IMG('photo-1513885535751-8b9238bd345a') },
  { icon: '🧸', name: 'Kids & Baby', grad: 'linear-gradient(135deg,#f9d423,#ff4e50)', img: IMG('photo-1515488042361-ee00e0ddd4e4') },
  { icon: '🏠', name: 'Property', grad: 'linear-gradient(135deg,#e96c2a,#f5a623)', img: IMG('photo-1560518883-ce09059eeffa') },
  { icon: '💊', name: 'Health, Fitness & Diet', grad: 'linear-gradient(135deg,#43cea2,#185a9d)', img: IMG('photo-1571019613454-1cb2f99b2d8b') },
  { icon: '🥖', name: 'Food Store', grad: 'linear-gradient(135deg,#8e44ad,#c0392b)', img: IMG('photo-1542838132-92c53300491e') },
  { icon: '🕺', name: 'Retro & Vintage', grad: 'linear-gradient(135deg,#d35400,#7a4419)', img: IMG('photo-1489599849927-2ee91cede3ba') },
  { icon: '🛍️', name: 'Grab It Now', grad: 'linear-gradient(135deg,#FF4500,#FF8C00)', img: '' }, // brand tile — no photo
  { icon: '🔧', name: 'Handy Help', grad: 'linear-gradient(135deg,#00b09b,#96c93d)', img: IMG('photo-1581578731548-c64695cc6952') },
  { icon: '🐾', name: 'Pet Shop', grad: 'linear-gradient(135deg,#f093fb,#f5576c)', img: IMG('photo-1425082661705-1834bfd09dca') },
]

export default function CategoryGrid() {
  const [active, setActive] = useState<string | null>(null)
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const { openPanel } = usePanel()
  const router = useRouter()

  const handleTap = (cat: typeof categories[0]) => {
    setActive(cat.name)
    // Jobs and Property have dedicated full pages with advanced search.
    if (cat.name === 'Jobs') return void router.push('/jobs')
    if (cat.name === 'Property') return void router.push('/property')
    if (cat.name === 'Grab It Now') {
      openPanel('grabit')
    } else {
      openPanel('dept', { name: cat.name, icon: cat.icon, grad: cat.grad })
    }
  }

  return (
    <section className="dept-grid-wrap">
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '20px 16px 10px',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
          Departments
        </span>
      </div>

      <div className="dept-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8, padding: '0 12px',
      }}>
        {categories.map(cat => {
          const showImg = cat.img && !failed[cat.name]
          const isActive = active === cat.name
          return (
            <button
              key={cat.name}
              onClick={() => handleTap(cat)}
              className="cat-card"
              style={{
                position: 'relative', border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: 14, overflow: 'hidden', aspectRatio: '1 / 1',
                background: cat.grad, textAlign: 'left',
                boxShadow: isActive ? '0 0 0 3px rgba(255,69,0,0.55)' : '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'transform .15s ease, box-shadow .15s ease',
              }}
            >
              {showImg && (
                <img
                  src={cat.img}
                  alt=""
                  loading="lazy"
                  onError={() => setFailed(f => ({ ...f, [cat.name]: true }))}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              {/* Dark scrim for text legibility (contrast) */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 70%)' }} />
              {/* Emoji fallback badge when no photo */}
              {!showImg && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                  {cat.icon}
                </div>
              )}
              <span style={{
                position: 'absolute', left: 8, right: 8, bottom: 7,
                fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900,
                color: '#fff', textAlign: 'left', lineHeight: 1.12,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
