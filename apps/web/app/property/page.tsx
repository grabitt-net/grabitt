'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import BottomNav from '@/components/marketplace/BottomNav'
import SiteHeader from '@/components/marketplace/SiteHeader'

const TYPES: { label: string; value?: string }[] = [
  { label: 'All' }, { label: 'For Sale', value: 'sale' }, { label: 'To Rent', value: 'rent' },
  { label: 'Holiday', value: 'holiday' }, { label: 'Commercial', value: 'commercial' },
  { label: 'Land', value: 'land' }, { label: 'New Build', value: 'new_build' },
]

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
      const res = await createTrpcClient().property.list.query({
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
    <main style={{ background: '#f7f4ee', minHeight: '100dvh', paddingBottom: 90 }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>🏠 Property</span>
        </div>

        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
          {TYPES.map(t => (
            <button key={t.label} onClick={() => setType(t.value ?? '')} style={{
              flex: '0 0 auto', border: `1.5px solid ${type === (t.value ?? '') ? 'var(--orange)' : '#e5dccd'}`,
              background: type === (t.value ?? '') ? 'var(--orange)' : '#fff', color: type === (t.value ?? '') ? '#fff' : '#555',
              borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, padding: '0 12px' }}>
        {rows.map(p => {
          const l = p.listing ?? {}
          const isRent = p.type === 'rent'
          const tag = p.hasPool ? 'Pool' : p.hasGarage ? 'Garage' : (p.community || '')
          return (
            <Link key={p.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ece3d7', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ height: 150, background: 'var(--sand)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 }}>
                  {Array.isArray(l.images) && l.images[0]
                    ? <img src={l.images[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🏠'}
                  {tag && <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 50 }}>{tag}</span>}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{l.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', marginTop: 1 }}>📍 {l.location ?? 'Gran Canaria'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--orange)' }}>€{Number(l.price ?? 0).toLocaleString()}{isRent ? '/mo' : ''}</span>
                    <span style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>
                      {p.bedrooms > 0 && <span>🛏 {p.bedrooms}</span>}
                      {p.bathrooms > 0 && <span>🚿 {p.bathrooms}</span>}
                      {p.m2 && <span>📐 {Number(p.m2)}m²</span>}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
        {!loading && rows.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No property matches your search</div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}

const inp: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer', fontWeight: 700 }
const btn: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const chk: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#555' }
