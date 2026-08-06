'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import { createLooseTrpcClient } from '@/lib/trpc'

type Listing = { id: string; name: string; category: string | null; description: string | null; location: string | null; logoUrl: string | null; website: string | null }

export default function DirectoryPage() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [cat, setCat] = useState<string>('All')

  useEffect(() => {
    createLooseTrpcClient().directory.list.query()
      .then(d => setListings(d as unknown as Listing[])).catch(() => setListings([]))
  }, [])

  // Category filter chips, derived from whatever categories advertisers set.
  const categories = ['All', ...Array.from(new Set((listings ?? []).map(l => l.category).filter((c): c is string => !!c))).sort()]
  const shown = (listings ?? []).filter(l => cat === 'All' || l.category === cat)

  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 60, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar title="Business Directory" />
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 14px' }}>
          <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.6, marginBottom: 16 }}>
            Local businesses advertising on Grabitt. Want to appear here? <Link href="/advertiser" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>List your business ›</Link>
          </p>

          {categories.length > 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ border: `1.5px solid ${cat === c ? 'var(--orange)' : '#e5dccd'}`, background: cat === c ? 'var(--orange)' : '#fff', color: cat === c ? '#fff' : '#555', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>{c}</button>
              ))}
            </div>
          )}

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
                      {l.logoUrl ? <img src={l.logoUrl} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 34 }}>🏢</span>}
                    </div>
                    <div style={{ padding: '11px 12px 14px' }}>
                      {l.category && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l.category}</div>}
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14.5, fontWeight: 900, color: 'var(--dark)', marginTop: 2 }}>{l.name}</div>
                      {l.location && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', marginTop: 2 }}>📍 {l.location}</div>}
                      {l.description && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#1a1a1a', marginTop: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.description}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </main>
    </PanelProvider>
  )
}
