'use client'
import { useState } from 'react'
import Link from 'next/link'

const categories = [
  { icon: '🏡', name: 'Home & Garden', slug: 'home-garden', grad: 'linear-gradient(135deg,#56ab2f,#a8e063)' },
  { icon: '💼', name: 'Jobs', slug: 'jobs', grad: 'linear-gradient(135deg,#2193b0,#6dd5ed)' },
  { icon: '👗', name: 'Fashion', slug: 'fashion', grad: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  { icon: '⚽', name: 'Sport', slug: 'sport', grad: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { icon: '🎮', name: 'Gaming', slug: 'gaming', grad: 'linear-gradient(135deg,#8E2DE2,#c471f5)' },
  { icon: '📱', name: 'Electronics', slug: 'electronics', grad: 'linear-gradient(135deg,#4776E6,#8E54E9)' },
  { icon: '🎁', name: 'Gift Ideas', slug: 'gifts', grad: 'linear-gradient(135deg,#f953c6,#b91d73)' },
  { icon: '🧸', name: 'Kids & Baby', slug: 'kids', grad: 'linear-gradient(135deg,#f9d423,#ff4e50)' },
  { icon: '🏠', name: 'Property', slug: 'property', grad: 'linear-gradient(135deg,#e96c2a,#f5a623)' },
  { icon: '💊', name: 'Health & Fitness', slug: 'health', grad: 'linear-gradient(135deg,#43cea2,#185a9d)' },
  { icon: '🥖', name: 'Food Store', slug: 'food', grad: 'linear-gradient(135deg,#8e44ad,#c0392b)' },
  { icon: '🕺', name: 'Retro & Vintage', slug: 'vintage', grad: 'linear-gradient(135deg,#d35400,#7a4419)' },
  { icon: '🛍️', name: 'Grab It Now', slug: 'now', grad: 'linear-gradient(135deg,#FF4500,#FF8C00)' },
  { icon: '🔧', name: 'Handy Help', slug: 'services', grad: 'linear-gradient(135deg,#00b09b,#96c93d)' },
  { icon: '🐾', name: 'Pet Shop', slug: 'pets', grad: 'linear-gradient(135deg,#f093fb,#f5576c)' },
]

export default function CategoryGrid() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '20px 16px 10px',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
          Categories
        </span>
        <Link href="/categories" style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>
          See all
        </Link>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6, padding: '0 12px',
      }}>
        {categories.map(cat => (
          <Link key={cat.slug} href={`/listings?category=${cat.slug}`} style={{ textDecoration: 'none' }}>
            <div
              onClick={() => setActive(cat.slug)}
              style={{
                borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                border: active === cat.slug ? '2px solid var(--orange)' : '1px solid #eee',
                background: active === cat.slug ? '#FFF3EE' : '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 0, padding: '9px 4px',
                boxShadow: active === cat.slug ? '0 0 0 2px rgba(255,69,0,0.2)' : undefined,
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
          </Link>
        ))}
      </div>
    </section>
  )
}
