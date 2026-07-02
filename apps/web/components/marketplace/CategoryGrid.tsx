'use client'
import { useState } from 'react'
import { usePanel } from '@/context/PanelContext'

const categories = [
  { icon: '🏡', name: 'Home & Garden', grad: 'linear-gradient(135deg,#56ab2f,#a8e063)' },
  { icon: '💼', name: 'Jobs', grad: 'linear-gradient(135deg,#2193b0,#6dd5ed)' },
  { icon: '👗', name: 'Fashion', grad: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  { icon: '⚽', name: 'Sport', grad: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { icon: '🎮', name: 'Gaming', grad: 'linear-gradient(135deg,#8E2DE2,#c471f5)' },
  { icon: '📱', name: 'Electronics', grad: 'linear-gradient(135deg,#4776E6,#8E54E9)' },
  { icon: '🎁', name: 'Gift Ideas', grad: 'linear-gradient(135deg,#f953c6,#b91d73)' },
  { icon: '🧸', name: 'Kids & Baby', grad: 'linear-gradient(135deg,#f9d423,#ff4e50)' },
  { icon: '🏠', name: 'Property', grad: 'linear-gradient(135deg,#e96c2a,#f5a623)' },
  { icon: '💊', name: 'Health, Fitness & Diet', grad: 'linear-gradient(135deg,#43cea2,#185a9d)' },
  { icon: '🥖', name: 'Food Store', grad: 'linear-gradient(135deg,#8e44ad,#c0392b)' },
  { icon: '🕺', name: 'Retro & Vintage', grad: 'linear-gradient(135deg,#d35400,#7a4419)' },
  { icon: '🛍️', name: 'Grab It Now', grad: 'linear-gradient(135deg,#FF4500,#FF8C00)' },
  { icon: '🔧', name: 'Handy Help', grad: 'linear-gradient(135deg,#00b09b,#96c93d)' },
  { icon: '🐾', name: 'Pet Shop', grad: 'linear-gradient(135deg,#f093fb,#f5576c)' },
]

export default function CategoryGrid() {
  const [active, setActive] = useState<string | null>(null)
  const { openPanel } = usePanel()

  const handleTap = (cat: typeof categories[0]) => {
    setActive(cat.name)
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
          Categories
        </span>
      </div>

      <div className="dept-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6, padding: '0 12px',
      }}>
        {categories.map(cat => (
          <div
            key={cat.name}
            onClick={() => handleTap(cat)}
            style={{
              borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
              border: active === cat.name ? '2px solid var(--orange)' : '1px solid #eee',
              background: active === cat.name ? '#FFF3EE' : '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 0, padding: '9px 4px',
              boxShadow: active === cat.name ? '0 0 0 2px rgba(255,69,0,0.2)' : undefined,
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 21, marginBottom: 5, boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              background: cat.grad,
            }}>
              {cat.icon}
            </div>
            <span style={{
              fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 900,
              color: '#1a1a1a', textAlign: 'center', lineHeight: 1.1,
            }}>
              {cat.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
