'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import PageHeroBanner from '@/components/marketplace/PageHeroBanner'
import Place from '@/components/marketplace/Place'
import { createLooseTrpcClient } from '@/lib/trpc'

type Listing = { id: string; name: string; category: string | null; description: string | null; location: string | null; logoUrl: string | null; website: string | null }

export default function DirectoryPage() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [cat, setCat] = useState<string>('All')
  const [loc, setLoc] = useState<string>('All')

  useEffect(() => {
    createLooseTrpcClient().directory.list.query()
      .then(d => setListings(d as unknown as Listing[])).catch(() => setListings([]))
  }, [])

  // Filters derived from the live listings (business type + location).
  const categories = ['All', ...Array.from(new Set((listings ?? []).map(l => l.category).filter((c): c is string => !!c))).sort()]
  const locations = ['All', ...Array.from(new Set((listings ?? []).map(l => l.location).filter((c): c is string => !!c))).sort()]
  const shown = (listings ?? []).filter(l => (cat === 'All' || l.category === cat) && (loc === 'All' || l.location === loc))

  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 60, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar title="Business Directory" />
        <QuickActions />
        <PageHeroBanner dept="directory" alt="Business Directory" maxWidth={960} />
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 14px' }}>
          {/* Prominent, eye-catching call to action — much larger than the old inline link. */}
          <Link href="/advertiser" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', boxSizing: 'border-box', background: 'linear-gradient(135deg, var(--orange), var(--orange2, #ff8a3d))', color: '#fff', borderRadius: 999, padding: '16px 22px', fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, textDecoration: 'none', boxShadow: '0 6px 18px rgba(245,84,10,0.28)', marginBottom: 18 }}>
            📖 List your business ›
          </Link>

          {/* Filters — business type and location. */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <label style={{ flex: '1 1 200px', minWidth: 160 }}>
              <span style={filterLbl}>Business type</span>
              <select value={cat} onChange={e => setCat(e.target.value)} style={filterSel}>
                {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All business types' : c}</option>)}
              </select>
            </label>
            <label style={{ flex: '1 1 200px', minWidth: 160 }}>
              <span style={filterLbl}>Location</span>
              <select value={loc} onChange={e => setLoc(e.target.value)} style={filterSel}>
                {locations.map(c => <option key={c} value={c}>{c === 'All' ? 'All locations' : c}</option>)}
              </select>
            </label>
          </div>

          {listings === null ? (
            <div style={{ padding: 50, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#1a1a1a' }}>Loading…</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#aaa' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📒</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>No businesses listed yet</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {shown.map(l => (
                <Link key={l.id} href={`/directory/${l.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}>
                    <div style={{ height: 90, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {l.logoUrl ? <img loading="lazy" decoding="async" src={l.logoUrl} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 34 }}>🏢</span>}
                    </div>
                    <div style={{ padding: '11px 12px 14px' }}>
                      {l.category && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l.category}</div>}
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14.5, fontWeight: 900, color: 'var(--dark)', marginTop: 2 }}>{l.name}</div>
                      {l.location && <Place style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{l.location}</Place>}
                      {l.description && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#1a1a1a', marginTop: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.description}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Footer />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}

const filterLbl: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#8a6d3b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }
const filterSel: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, background: '#fff', color: 'var(--dark)' }
