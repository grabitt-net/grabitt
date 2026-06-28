'use client'
import { useState } from 'react'
import Link from 'next/link'

const categories = [
  { icon: '🏠', name: 'Property', slug: 'property' },
  { icon: '🚗', name: 'Vehicles', slug: 'vehicles' },
  { icon: '💼', name: 'Jobs', slug: 'jobs' },
  { icon: '🛍️', name: 'Fashion', slug: 'fashion' },
  { icon: '📱', name: 'Tech', slug: 'tech' },
  { icon: '🍽️', name: 'Food', slug: 'food' },
  { icon: '🔧', name: 'Services', slug: 'services' },
  { icon: '🎨', name: 'Art', slug: 'art' },
  { icon: '🌿', name: 'Garden', slug: 'garden' },
  { icon: '👶', name: 'Baby', slug: 'baby' },
  { icon: '⚽', name: 'Sport', slug: 'sport' },
  { icon: '🎵', name: 'Music', slug: 'music' },
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
                background: '#f9f9f9',
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
