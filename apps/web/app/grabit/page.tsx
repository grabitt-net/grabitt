'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { PanelProvider } from '@/context/PanelContext'
import { createLooseTrpcClient } from '@/lib/trpc'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'
import { geocodeGC } from '@/lib/gcGeo'
import { DEPT_LABEL, deptEmoji } from '@/lib/listingMap'
import type { GrabitPoint } from '@/components/marketplace/GrabitMap'

const GrabitMap = dynamic(() => import('@/components/marketplace/GrabitMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: 380, borderRadius: 14, background: '#ece3d7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#a99', fontSize: 13 }}>Loading map…</div>,
})

type Offer = {
  id: string; title: string; price: number; department: string; location: string
  lat: number | null; lng: number | null; images: string[]; grabItNowUntil: string
}

const RADII = [5, 10, 25, 50, 0] // 0 = whole island (no distance filter)
const radiusLabel = (km: number) => (km === 0 ? 'Whole island' : `${km} km`)

// Great-circle distance in km.
function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function endsIn(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'ended'
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function GrabitPage() {
  return <PanelProvider><Inner /></PanelProvider>
}

function Inner() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [centre, setCentre] = useState<[number, number] | null>(null)
  const [geoTried, setGeoTried] = useState(false)

  const [view, setView] = useState<'map' | 'list'>('map')
  const [radius, setRadius] = useState(5)
  const [dept, setDept] = useState('')
  const [town, setTown] = useState('')
  const [sort, setSort] = useState<'ending' | 'price_asc' | 'price_desc' | 'newest'>('ending')

  useEffect(() => {
    createLooseTrpcClient().listings.getGrabitActive.query()
      .then(d => setOffers((d as Offer[]) ?? []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false))
  }, [])

  // Ask for the viewer's location once so we can default to the 5km area.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoTried(true); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setCentre([pos.coords.latitude, pos.coords.longitude]); setGeoTried(true) },
      () => setGeoTried(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  // Resolve coordinates for every offer (exact pin, else town centroid).
  const withCoords = useMemo(() => offers.map(o => {
    const coords: [number, number] | null = (o.lat != null && o.lng != null) ? [o.lat, o.lng] : geocodeGC(o.location)
    return { ...o, coords }
  }), [offers])

  // Filter + sort. Distance only applies when we know where the viewer is and
  // they haven't chosen "whole island".
  const filtered = useMemo(() => {
    let list = withCoords.filter(o => {
      if (dept && o.department !== dept) return false
      if (town && (o.location ?? '').toLowerCase() !== town.toLowerCase()) return false
      if (radius !== 0 && centre && o.coords) return distanceKm(centre, o.coords) <= radius
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price
      if (sort === 'price_desc') return b.price - a.price
      if (sort === 'newest') return new Date(b.grabItNowUntil).getTime() - new Date(a.grabItNowUntil).getTime()
      return new Date(a.grabItNowUntil).getTime() - new Date(b.grabItNowUntil).getTime() // ending soon
    })
    return list
  }, [withCoords, dept, town, radius, centre, sort])

  const points: GrabitPoint[] = filtered
    .filter(o => o.coords)
    .map(o => ({ id: o.id, title: o.title, price: `€${Number(o.price).toLocaleString()}`, location: o.location, ends: endsIn(o.grabItNowUntil), lat: o.coords![0], lng: o.coords![1] }))

  const towns = useMemo(() => Array.from(new Set(offers.map(o => o.location).filter(Boolean))).sort(), [offers])
  const depts = useMemo(() => Array.from(new Set(offers.map(o => o.department).filter(Boolean))).sort(), [offers])

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Grabitt Now" />
      <QuickActions />

      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#6b5d48', marginBottom: 10 }}>
          ⚡ {geoTried && !centre
            ? 'Limited-time offers across Gran Canaria. Enable location to see what’s near you.'
            : centre ? `Limited-time offers within ${radiusLabel(radius)} of you.` : 'Finding offers near you…'}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={radius} onChange={e => setRadius(Number(e.target.value))} style={sel} disabled={!centre} title={!centre ? 'Enable location to filter by distance' : undefined}>
            {RADII.map(r => <option key={r} value={r}>{radiusLabel(r)}</option>)}
          </select>
          <select value={dept} onChange={e => setDept(e.target.value)} style={sel}>
            <option value="">All types</option>
            {depts.map(d => <option key={d} value={d}>{DEPT_LABEL[d] ?? d}</option>)}
          </select>
          <select value={town} onChange={e => setTown(e.target.value)} style={sel}>
            <option value="">All locations</option>
            {towns.map(tn => <option key={tn} value={tn}>{tn}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ ...sel, marginLeft: 'auto' }}>
            <option value="ending">Ending soon</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </header>

      {/* Count + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? 'Loading…' : `${filtered.length} offer${filtered.length === 1 ? '' : 's'}`}
        </span>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e5dccd', borderRadius: 50, overflow: 'hidden' }}>
          <Toggle active={view === 'map'} onClick={() => setView('map')}>Map</Toggle>
          <Toggle active={view === 'list'} onClick={() => setView('list')}>List</Toggle>
        </div>
      </div>

      {view === 'map' ? (
        <div style={{ padding: '0 12px' }}>
          <GrabitMap points={points} centre={centre} radiusKm={radius === 0 ? 100 : radius} />
          {points.length < filtered.length && (
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>
              {filtered.length - points.length} offer(s) without a mappable location aren’t shown on the map.
            </div>
          )}
        </div>
      ) : (
        <div className="category-grid">
          {filtered.map(o => (
            <Link key={o.id} href={`/listings/${o.id}`} style={{ textDecoration: 'none' }}>
              <div style={card}>
                <div style={{ width: '100%', paddingTop: '72%', position: 'relative', background: 'linear-gradient(135deg,#FF4500,#FF8C00)' }}>
                  {o.images?.[0]
                    ? <img src={o.images[0]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{deptEmoji(o.department)}</div>}
                  <span style={badge}>⚡ ENDS {endsIn(o.grabItNowUntil)}</span>
                </div>
                <div style={{ padding: '10px 11px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)', margin: '3px 0' }}>€{Number(o.price).toLocaleString()}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#9a8b74' }}>📍 {o.location ?? 'Gran Canaria'}</div>
                </div>
              </div>
            </Link>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>No offers match your filters</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try widening the search area.</div>
            </div>
          )}
        </div>
      )}

      <Footer />
      <PanelHost />
    </main>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ border: 'none', background: active ? 'var(--orange)' : 'transparent', color: active ? '#fff' : '#888', padding: '6px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{children}</button>
  )
}

const sel: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '8px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: '#fff', color: 'var(--dark)' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const badge: React.CSSProperties = { position: 'absolute', top: 8, left: 8, background: 'rgba(26,26,26,0.85)', color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 8px', borderRadius: 50 }
