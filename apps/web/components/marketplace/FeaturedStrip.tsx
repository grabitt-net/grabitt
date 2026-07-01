'use client'
import { useEffect, useRef } from 'react'
import { usePanel } from '@/context/PanelContext'

const FEATURED = [
  { ref: 'F1', emoji: '📱', title: 'iPhone 14 — Unlocked',         price: '€620',    location: 'Las Palmas',      category: 'Electronics',   condition: 'Excellent' },
  { ref: 'F2', emoji: '🚴', title: 'Mountain Bike — 21sp Shimano', price: '€340',    location: 'Maspalomas',      category: 'Sport',         condition: 'Good' },
  { ref: 'F3', emoji: '🏠', title: 'Studio Flat to Rent',          price: '€650/mo', location: 'Playa del Inglés', category: 'Property' },
  { ref: 'F4', emoji: '💻', title: 'MacBook Air M2 — 8GB',        price: '€890',    location: 'Las Palmas',      category: 'Electronics',   condition: 'Like New' },
  { ref: 'F5', emoji: '🛋️', title: 'IKEA Corner Sofa — Grey',     price: '€180',    location: 'Telde',           category: 'Home & Garden', condition: 'Good' },
  { ref: 'F6', emoji: '🏄', title: 'Surfboard 6ft + GoPro',        price: '€120',    location: 'Las Palmas',      category: 'Sport',         condition: 'Good' },
  { ref: 'F7', emoji: '🎸', title: 'Fender Stratocaster 2020',     price: '€340',    location: 'Las Palmas',      category: 'Retro & Vintage', condition: 'Very Good' },
  { ref: 'F8', emoji: '🐾', title: 'Golden Retriever Pup — KC',    price: '€600',    location: 'Maspalomas',      category: 'Pet Shop' },
]

export default function FeaturedStrip() {
  const { openPanel } = usePanel()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const id = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: 155, behavior: 'smooth' })
      }
    }, 3200)
    return () => clearInterval(id)
  }, [])

  return (
    <section style={{ padding: '16px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 14px 10px' }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>👀 Featured</span>
        <button
          onClick={() => openPanel('search', { featured: true })}
          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--orange)', fontWeight: 800, cursor: 'pointer' }}
        >
          See all
        </button>
      </div>
      <div
        ref={scrollRef}
        style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 10, padding: '0 14px 4px' }}
      >
        {FEATURED.map(item => (
          <div
            key={item.ref}
            onClick={() => openPanel('listing', { ...item, isFeatured: true })}
            style={{ flex: '0 0 140px', background: '#fff', border: '1px solid #e8e0d5', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50, zIndex: 1 }}>
              👀 FEATURED
            </div>
            <div style={{ width: '100%', paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{item.emoji}</div>
            </div>
            <div style={{ padding: '8px 8px 10px' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{item.price}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#888', marginTop: 2 }}>📍 {item.location}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
