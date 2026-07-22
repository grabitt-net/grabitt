'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'

// Search-first marketplace hero (per the UI/UX marketplace pattern: the search
// bar is the primary CTA). Branded band with headline, big search, popular
// category chips, and a "List your item" call to action.
const POPULAR = ['iPhone', 'Bike', 'Sofa', 'PS5', 'Surfboard', 'Guitar']

export default function HomeHero() {
  const { openPanel } = usePanel()
  const router = useRouter()
  const [q, setQ] = useState('')
  const search = (term?: string) => {
    const term2 = (term ?? q).trim()
    if (term2) router.push(`/search?q=${encodeURIComponent(term2)}`)
  }

  return (
    <section style={{ padding: '28px 16px 8px' }}>
      <div style={{ background: 'linear-gradient(135deg, #FF4500 0%, #FF8C00 100%)', borderRadius: 20, padding: 'clamp(24px, 5vw, 44px) clamp(18px, 4vw, 40px)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', maxWidth: 640 }}>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(24px, 4.2vw, 40px)', fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            Gran Canaria&apos;s local marketplace
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(13px, 1.6vw, 16px)', fontWeight: 600, opacity: 0.95, margin: '10px 0 20px' }}>
            Buy &amp; sell locally — safely. Funds held in escrow until you confirm handover.
          </p>

          {/* Search — the primary CTA */}
          <div style={{ display: 'flex', gap: 8, background: '#fff', borderRadius: 50, padding: 6, boxShadow: '0 8px 30px rgba(0,0,0,0.18)', maxWidth: 560 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') search() }}
              placeholder="Search for anything…"
              aria-label="Search listings"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '10px 16px', fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--dark)', minWidth: 0 }}
            />
            <button onClick={() => search()} style={{ flexShrink: 0, background: 'var(--dark, #1a1a1a)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 22px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>Search</button>
          </div>

          {/* Popular searches */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Popular:</span>
            {POPULAR.map(t => (
              <button key={t} onClick={() => search(t)} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
            ))}
          </div>

          <button onClick={() => openPanel('sell')} style={{ marginTop: 20, background: '#fff', color: 'var(--orange)', border: 'none', borderRadius: 50, padding: '12px 26px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            + List your item — it&apos;s free
          </button>
        </div>
      </div>
    </section>
  )
}
