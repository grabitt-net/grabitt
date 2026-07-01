'use client'
import { usePanel } from '@/context/PanelContext'

const ITEMS = [
  { ref: 'JL1', emoji: '🎮', title: 'PS5 + 2 Controllers',       price: '€380', location: 'Las Palmas',       category: 'Gaming',          condition: 'Like New', isNew: true },
  { ref: 'JL2', emoji: '🐱', title: 'Bengal Kitten — 10 weeks',  price: '€450', location: 'Maspalomas',       category: 'Pet Shop',                             isNew: true },
  { ref: 'JL3', emoji: '👗', title: 'Summer Dress — Size M',     price: '€22',  location: 'Playa del Inglés', category: 'Fashion',          condition: 'New',      isNew: true },
  { ref: 'JL4', emoji: '🔧', title: 'Plumber — Emergency',       price: '€35/hr',location: 'Las Palmas',      category: 'Handy Help',                           isNew: true },
  { ref: 'JL5', emoji: '🪴', title: 'Indoor Plant Collection',   price: '€18',  location: 'Telde',            category: 'Home & Garden',                        isNew: true },
  { ref: 'JL6', emoji: '🎸', title: 'Acoustic Guitar + Case',    price: '€85',  location: 'Arucas',           category: 'Retro & Vintage',  condition: 'Good',     isNew: true },
  { ref: 'JL7', emoji: '🚗', title: 'VW Golf 2021 — Low miles',  price: '€14,500', location: 'Las Palmas',   category: 'Electronics',      condition: 'Excellent',isNew: true },
  { ref: 'JL8', emoji: '🏋️', title: 'Home Gym — Full Set',      price: '€320', location: 'Vecindario',       category: 'Health & Fitness', condition: 'Good',     isNew: true },
]

export default function JustListed() {
  const { openPanel } = usePanel()

  return (
    <section style={{ padding: '16px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 14px 10px' }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>🆕 Just Listed</span>
        <button
          onClick={() => openPanel('justlisted')}
          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--orange)', fontWeight: 800, cursor: 'pointer' }}
        >
          See all
        </button>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 10, padding: '0 14px 4px' }}>
        {ITEMS.map(item => (
          <div
            key={item.ref}
            onClick={() => openPanel('listing', item)}
            style={{ flex: '0 0 140px', background: '#fff', border: '1px solid #e8e0d5', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--sage)', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50, zIndex: 1 }}>
              NEW
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
