'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createLooseTrpcClient } from '@/lib/trpc'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'

const TYPES: { label: string; value?: string }[] = [
  { label: 'All' }, { label: 'For Sale', value: 'sale' }, { label: 'To Rent', value: 'rent' },
  { label: 'Holiday', value: 'holiday' }, { label: 'Commercial', value: 'commercial' },
  { label: 'Land', value: 'land' }, { label: 'New Build', value: 'new_build' },
]

const PROP_LABEL: Record<string, string> = {
  sale: 'For Sale', rent: 'To Let', holiday: 'Holiday Let',
  commercial: 'Commercial', land: 'Land', new_build: 'New Build',
}

export default function PropertyPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('sale')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [minBathrooms, setMinBathrooms] = useState('')
  const [hasPool, setHasPool] = useState(false)
  const [hasGarage, setHasGarage] = useState(false)
  const [location, setLocation] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const res = await createLooseTrpcClient().property.list.query({
        ...(query.trim() && { query: query.trim() }),
        ...(type && { type: type as never }),
        ...(minPrice && { minPrice: Number(minPrice) }),
        ...(maxPrice && { maxPrice: Number(maxPrice) }),
        ...(minBedrooms && { minBedrooms: Number(minBedrooms) }),
        ...(minBathrooms && { minBathrooms: Number(minBathrooms) }),
        ...(hasPool && { hasPool: true }),
        ...(hasGarage && { hasGarage: true }),
        ...(location.trim() && { location: location.trim() }),
      })
      setRows(res as any[])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [query, type, minPrice, maxPrice, minBedrooms, minBathrooms, hasPool, hasGarage, location])

  // Re-run on structured toggles; text/number ranges run on submit.
  useEffect(() => { run() }, [type, minBedrooms, minBathrooms, hasPool, hasGarage]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Property" />
      <QuickActions />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        {/* Type tabs + List-a-property on one line — pills scroll, button stays put */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TYPES.map(t => (
              <button key={t.label} onClick={() => setType(t.value ?? '')} style={{
                flex: '0 0 auto', border: `1.5px solid ${type === (t.value ?? '') ? 'var(--orange)' : '#e5dccd'}`,
                background: type === (t.value ?? '') ? 'var(--orange)' : '#fff', color: type === (t.value ?? '') ? '#fff' : '#555',
                borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{t.label}</button>
            ))}
          </div>
          <Link href="/property/new" style={{ flexShrink: 0, textDecoration: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>+ List a Property</Link>
        </div>

        {/* Advanced search */}
        <form onSubmit={e => { e.preventDefault(); run() }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search property…" style={inp} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" style={{ ...inp, flex: 1, minWidth: 110 }} />
            <input value={minPrice} onChange={e => setMinPrice(e.target.value)} inputMode="numeric" placeholder="Min €" style={{ ...inp, width: 90 }} />
            <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} inputMode="numeric" placeholder="Max €" style={{ ...inp, width: 90 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={minBedrooms} onChange={e => setMinBedrooms(e.target.value)} style={sel}>
              <option value="">Beds: any</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+ beds</option>)}
            </select>
            <select value={minBathrooms} onChange={e => setMinBathrooms(e.target.value)} style={sel}>
              <option value="">Baths: any</option>{[1, 2, 3].map(n => <option key={n} value={n}>{n}+ baths</option>)}
            </select>
            <label style={chk}><input type="checkbox" checked={hasPool} onChange={e => setHasPool(e.target.checked)} /> Pool</label>
            <label style={chk}><input type="checkbox" checked={hasGarage} onChange={e => setHasGarage(e.target.checked)} /> Garage</label>
            <button type="submit" style={btn}>Search</button>
          </div>
        </form>
      </header>

      <div style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
        {loading ? 'Searching…' : `${rows.length} propert${rows.length === 1 ? 'y' : 'ies'}`}
      </div>

      {/* Idealista / Fotocasa-style horizontal snapshot cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 14px', maxWidth: 760, margin: '0 auto' }}>
        {rows.map(p => {
          const l = p.listing ?? {}
          const isRent = p.type === 'rent' || p.type === 'holiday'
          const imgs: string[] = Array.isArray(l.images) ? l.images.filter(Boolean) : []
          const termLabel = ({ short_term: 'Short-term', long_term: 'Long-term', holiday: 'Holiday rental' } as Record<string, string>)[p.rentalTerm as string]
          const chips = [termLabel && `⏳ ${termLabel}`, p.furnished === 'furnished' && '🛋 Furnished', p.hasPool && '🏊 Pool', p.hasGarage && '🚗 Garage', p.energyRating && `⚡ ${p.energyRating}`].filter(Boolean) as string[]
          return (
            <Link key={p.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', background: '#fff', borderRadius: 14, border: '1px solid #ece3d7', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* Photo */}
                <div style={{ position: 'relative', flex: '0 0 42%', maxWidth: 220, minHeight: 150, background: 'var(--sand)' }}>
                  {imgs[0]
                    ? <img src={imgs[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🏠</div>}
                  <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(26,26,26,0.85)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 50, textTransform: 'uppercase', letterSpacing: 0.3 }}>{PROP_LABEL[p.type] ?? p.type}</span>
                  {imgs.length > 1 && <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(26,26,26,0.7)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>📷 {imgs.length}</span>}
                </div>

                {/* Snapshot */}
                <div style={{ flex: 1, minWidth: 0, padding: '11px 12px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 19, fontWeight: 900, color: 'var(--dark)' }}>
                    €{Number(l.price ?? 0).toLocaleString()}<span style={{ fontSize: 12, fontWeight: 700, color: '#9a8b74' }}>{isRent ? '/mo' : ''}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{l.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>📍 {l.location ?? 'Gran Canaria'}{p.community ? ` · ${p.community}` : ''}</div>

                  {/* Key facts row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: '#4a4034', marginTop: 6 }}>
                    {p.bedrooms > 0 && <span>🛏 {p.bedrooms} {p.bedrooms === 1 ? 'bed' : 'beds'}</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms} {p.bathrooms === 1 ? 'bath' : 'baths'}</span>}
                    {p.m2 && <span>📐 {Number(p.m2)} m²</span>}
                    {p.floor != null && <span>🏢 Floor {p.floor}</span>}
                  </div>

                  {/* Description snippet */}
                  {l.description && (
                    <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#7a6f60', lineHeight: 1.5, marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.description}</div>
                  )}

                  {chips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto', paddingTop: 8 }}>
                      {chips.map(c => <span key={c} style={{ background: '#f5efe6', color: '#6b5d48', fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 50 }}>{c}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No property matches your search</div>
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

const inp: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer', fontWeight: 700 }
const btn: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const chk: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#555' }
