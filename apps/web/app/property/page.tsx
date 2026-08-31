'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/ui'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createLooseTrpcClient } from '@/lib/trpc'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PageHero from '@/components/marketplace/PageHero'
import BannerSlot from '@/components/marketplace/BannerSlot'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import { geocodeGC } from '@/lib/gcGeo'
import { FILTERABLE_FEATURES, featureIcon, featureLabel } from '@/lib/propertyFeatures'
import type { PropertyPoint } from '@/components/marketplace/PropertyMap'

const PropertyMap = dynamic(() => import('@/components/marketplace/PropertyMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: 420, borderRadius: 14, background: '#ece3d7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#a99', fontSize: 13 }}>Loading map…</div>,
})

const RADII = [5, 10, 25, 50, 0]
const radiusLabel = (km: number) => (km === 0 ? 'Whole island' : `${km} km`)
function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const TYPES: { label: string; value?: string }[] = [
  { label: 'All' }, { label: 'For Sale', value: 'sale' }, { label: 'To Rent', value: 'rent' },
  { label: 'Holiday', value: 'holiday' }, { label: 'Commercial', value: 'commercial' },
  { label: 'Land', value: 'land' }, { label: 'New Build', value: 'new_build' },
]

const PROP_LABEL: Record<string, string> = {
  sale: 'For Sale', rent: 'To Let', holiday: 'Holiday Let',
  commercial: 'Commercial', land: 'Land', new_build: 'New Build',
}

// Multi-select area pills — the main towns/resorts across Gran Canaria.
const GC_TOWNS = [
  'Las Palmas', 'Telde', 'Vecindario', 'Maspalomas', 'Playa del Inglés', 'Meloneras',
  'San Agustín', 'Puerto Rico', 'Arguineguín', 'Mogán', 'Puerto de Mogán', 'Arucas',
  'Gáldar', 'Santa Lucía', 'Agüimes', 'Ingenio', 'Firgas', 'Teror',
]

export default function PropertyPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('sale')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [minBathrooms, setMinBathrooms] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [features, setFeatures] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Locate-me + map/list view.
  const [view, setView] = useState<'list' | 'map'>('list')
  const [centre, setCentre] = useState<[number, number] | null>(null)
  const [nearActive, setNearActive] = useState(false)
  const [radius, setRadius] = useState(10)
  const [locating, setLocating] = useState(false)

  const locateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setCentre([pos.coords.latitude, pos.coords.longitude]); setNearActive(true); setLocating(false) },
      () => { setLocating(false); toast('Could not get your location. Please allow location access.') },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

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
        ...(locations.length && { locations }),
        ...(features.length && { features }),
      })
      setRows(res as any[])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [query, type, minPrice, maxPrice, minBedrooms, minBathrooms, locations, features])

  const toggleLocation = (t: string) => setLocations(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const toggleFeature = (f: string) => setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  // Re-run on structured toggles; text/number ranges run on submit.
  useEffect(() => { run() }, [type, minBedrooms, minBathrooms, locations, features]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve coords (exact pin, else town centroid) and apply the "near me"
  // distance filter when the viewer has shared their location.
  const withCoords = useMemo(() => rows.map(p => {
    const l = p.listing ?? {}
    const coords: [number, number] | null = (p.lat != null && p.lng != null) ? [p.lat, p.lng] : geocodeGC(l.location)
    return { ...p, coords }
  }), [rows])

  const displayed = useMemo(() => {
    if (!nearActive || !centre || radius === 0) return withCoords
    return withCoords.filter(p => p.coords && distanceKm(centre, p.coords) <= radius)
  }, [withCoords, nearActive, centre, radius])

  const points: PropertyPoint[] = displayed
    .filter(p => p.coords)
    .map(p => ({ id: p.listing?.id, title: p.listing?.title ?? 'Property', price: `€${Number(p.listing?.price ?? 0).toLocaleString()}${(p.type === 'rent' || p.type === 'holiday') ? '/mo' : ''}`, location: p.listing?.location ?? 'Canary Islands', lat: p.coords![0], lng: p.coords![1] }))

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Property" />
      <QuickActions belowPromo={<PageHero title="Property" tagline="Find your place in the sun." body="Buying, selling, renting, or letting — your next home or investment is right here on the islands. Browse houses, apartments and holiday lets across the Canaries, or list your own property to reach local buyers and tenants directly. No jargon, no faff — just island living made simple." />} />

      {/* Sellable property banner — sits above the search options */}
      <BannerSlot position="property" aspect="1053 / 163" />

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

        {/* Compact search — everything on one wrapping line */}
        <form onSubmit={e => { e.preventDefault(); run() }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Search property…" style={{ ...inp, flex: 1, minWidth: 150, padding: '7px 11px' }} />
          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} inputMode="numeric" placeholder="Min €" style={{ ...inp, width: 78, padding: '7px 10px' }} />
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} inputMode="numeric" placeholder="Max €" style={{ ...inp, width: 78, padding: '7px 10px' }} />
          <select value={minBedrooms} onChange={e => setMinBedrooms(e.target.value)} style={{ ...sel, padding: '7px 8px' }}>
            <option value="">Beds</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+ beds</option>)}
          </select>
          <select value={minBathrooms} onChange={e => setMinBathrooms(e.target.value)} style={{ ...sel, padding: '7px 8px' }}>
            <option value="">Baths</option>{[1, 2, 3].map(n => <option key={n} value={n}>{n}+ baths</option>)}
          </select>
          <button type="submit" style={{ ...btn, padding: '7px 16px' }}>Search</button>
        </form>

        {/* Multi-select area pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {GC_TOWNS.map(t => {
            const on = locations.includes(t)
            return (
              <button key={t} onClick={() => toggleLocation(t)} style={{
                border: `1px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? 'var(--orange)' : '#fff',
                color: on ? '#fff' : '#1a1a1a', borderRadius: 50, padding: '4px 11px', fontFamily: 'var(--font-nunito)',
                fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{on ? '✓ ' : ''}{t}</button>
            )
          })}
          {locations.length > 0 && <button onClick={() => setLocations([])} style={{ border: 'none', background: 'none', color: '#1a1a1a', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Clear areas</button>}
        </div>

        {/* Feature quick filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {FILTERABLE_FEATURES.map(f => {
            const on = features.includes(f)
            return (
              <button key={f} onClick={() => toggleFeature(f)} style={{
                border: `1px solid ${on ? 'var(--teal, #0f766e)' : '#e5dccd'}`, background: on ? 'var(--teal, #0f766e)' : '#fff',
                color: on ? '#fff' : '#1a1a1a', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-nunito)',
                fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{featureIcon(f)} {featureLabel(f)}</button>
            )
          })}
        </div>
      </header>

      {/* Locate-me + radius + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? 'Searching…' : `${displayed.length} propert${displayed.length === 1 ? 'y' : 'ies'}`}
          {nearActive && centre && radius !== 0 && ` within ${radiusLabel(radius)}`}
        </span>
        <button onClick={locateMe} disabled={locating} style={{ background: nearActive ? 'var(--orange)' : '#fff', color: nearActive ? '#fff' : 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 50, padding: '7px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          📍 {locating ? 'Locating…' : nearActive ? 'Near me' : 'Locate me'}
        </button>
        {nearActive && (
          <select value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ ...sel, padding: '7px 8px' }}>
            {RADII.map(r => <option key={r} value={r}>{radiusLabel(r)}</option>)}
          </select>
        )}
        {nearActive && <button onClick={() => { setNearActive(false); setCentre(null) }} style={{ background: 'none', border: 'none', color: '#888', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>Clear</button>}
        <div style={{ marginLeft: 'auto', display: 'flex', background: '#fff', border: '1px solid #e5dccd', borderRadius: 50, overflow: 'hidden' }}>
          <button onClick={() => setView('list')} style={{ border: 'none', background: view === 'list' ? 'var(--orange)' : 'transparent', color: view === 'list' ? '#fff' : '#888', padding: '6px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>List</button>
          <button onClick={() => setView('map')} style={{ border: 'none', background: view === 'map' ? 'var(--orange)' : 'transparent', color: view === 'map' ? '#fff' : '#888', padding: '6px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Map</button>
        </div>
      </div>

      {view === 'map' ? (
        <div style={{ padding: '0 14px', maxWidth: 760, margin: '0 auto' }}>
          <PropertyMap points={points} centre={nearActive ? centre : null} radiusKm={radius === 0 ? 100 : radius} />
          {points.length < displayed.length && (
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>
              {displayed.length - points.length} propert{displayed.length - points.length === 1 ? 'y' : 'ies'} without a mappable location aren’t shown on the map.
            </div>
          )}
        </div>
      ) : (
      /* Idealista / Fotocasa-style horizontal snapshot cards */
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 14px', maxWidth: 760, margin: '0 auto' }}>
        {displayed.map(p => {
          const l = p.listing ?? {}
          const isRent = p.type === 'rent' || p.type === 'holiday'
          const imgs: string[] = Array.isArray(l.images) ? l.images.filter(Boolean) : []
          const termLabel = ({ short_term: 'Short-term', long_term: 'Long-term', holiday: 'Holiday rental' } as Record<string, string>)[p.rentalTerm as string]
          const feats: string[] = (Array.isArray(p.features) && p.features.length)
            ? p.features
            : [p.hasPool && 'pool', p.hasGarage && 'garage', p.furnished === 'furnished' && 'furnished'].filter(Boolean) as string[]
          const chips = [termLabel && `⏳ ${termLabel}`, ...feats.slice(0, 4).map(s => `${featureIcon(s)} ${featureLabel(s)}`), p.energyRating && `⚡ ${p.energyRating}`].filter(Boolean) as string[]
          return (
            <Link key={p.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
              {/* Fixed height keeps every card a uniform snapshot */}
              <div style={{ display: 'flex', height: 150, background: '#fff', borderRadius: 14, border: '1px solid #ece3d7', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* Photo */}
                <div style={{ position: 'relative', flex: '0 0 42%', maxWidth: 220, background: 'var(--sand)' }}>
                  {imgs[0]
                    ? <img src={imgs[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🏠</div>}
                  <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(26,26,26,0.85)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 50, textTransform: 'uppercase', letterSpacing: 0.3 }}>{PROP_LABEL[p.type] ?? p.type}</span>
                  {imgs.length > 1 && <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(26,26,26,0.7)', color: '#fff', fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>📷 {imgs.length}</span>}
                </div>

                {/* Snapshot */}
                <div style={{ flex: 1, minWidth: 0, padding: '11px 12px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 19, fontWeight: 900, color: 'var(--dark)' }}>
                    €{Number(l.price ?? 0).toLocaleString()}<span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{isRent ? '/mo' : ''}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{l.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>📍 {l.location ?? 'Canary Islands'}{p.community ? ` · ${p.community}` : ''}</div>

                  {/* Key facts row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginTop: 6 }}>
                    {p.bedrooms > 0 && <span>🛏 {p.bedrooms} {p.bedrooms === 1 ? 'bed' : 'beds'}</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms} {p.bathrooms === 1 ? 'bath' : 'baths'}</span>}
                    {p.m2 && <span>📐 {Number(p.m2)} m²</span>}
                    {p.floor != null && <span>🏢 Floor {p.floor}</span>}
                  </div>

                  {chips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto', paddingTop: 8 }}>
                      {chips.map(c => <span key={c} style={{ background: '#f5efe6', color: '#1a1a1a', fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 50 }}>{c}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
        {!loading && displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No property matches your search</div>
            {nearActive && <div style={{ fontSize: 12, marginTop: 4 }}>Try widening the search area.</div>}
          </div>
        )}
      </div>
      )}

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
