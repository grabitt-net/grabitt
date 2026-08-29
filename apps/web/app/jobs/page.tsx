'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createLooseTrpcClient } from '@/lib/trpc'
import { geocodeGC } from '@/lib/gcGeo'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PageHero from '@/components/marketplace/PageHero'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import BannerSlot from '@/components/marketplace/BannerSlot'
import type { JobPoint } from '@/components/marketplace/JobsMap'

// Map is client-only (Leaflet needs window) — load without SSR.
const JobsMap = dynamic(() => import('@/components/marketplace/JobsMap'), { ssr: false, loading: () => <MapSkeleton /> })

const TYPES: { label: string; value?: string }[] = [
  { label: 'All types' }, { label: 'Full Time', value: 'full_time' }, { label: 'Part Time', value: 'part_time' },
  { label: 'Contract', value: 'contract' }, { label: 'Temp', value: 'temporary' }, { label: 'Volunteer', value: 'volunteer' },
]
const TYPE_LABEL: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', temporary: 'Temp', volunteer: 'Volunteer' }
const PERIOD: Record<string, string> = { month: '/mo', year: '/yr', hour: '/hr' }

function salaryLabel(min?: number | string | null, max?: number | string | null, period?: string | null) {
  const p = PERIOD[period ?? 'month'] ?? '/mo'
  const lo = min != null ? Number(min) : null, hi = max != null ? Number(max) : null
  if (lo && hi) return `€${lo.toLocaleString()}–${hi.toLocaleString()}${p}`
  if (lo) return `€${lo.toLocaleString()}${p}`
  if (hi) return `up to €${hi.toLocaleString()}${p}`
  return 'Negotiable'
}

export default function JobsPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [remote, setRemote] = useState(false)
  const [minSalary, setMinSalary] = useState('')
  const [maxSalary, setMaxSalary] = useState('')
  const [salaryPeriod, setSalaryPeriod] = useState('')
  const [location, setLocation] = useState('')
  const [sector, setSector] = useState('')
  const [postedWithin, setPostedWithin] = useState('')
  const [sort, setSort] = useState('newest')
  const [rows, setRows] = useState<any[]>([])
  const [locations, setLocations] = useState<{ location: string; count: number }[]>([])
  const [remoteCount, setRemoteCount] = useState(0)
  const [sectors, setSectors] = useState<{ sector: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [mapView, setMapView] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const res = await createLooseTrpcClient().jobs.list.query({
        ...(query.trim() && { query: query.trim() }),
        ...(type && { type: type as never }),
        // Remote is its own filter: the Remote pill shows only remote jobs; a town
        // pill shows only on-site jobs in that town; the default view shows both.
        ...(remote ? { remote: true } : location ? { remote: false } : {}),
        ...(minSalary && { minSalary: Number(minSalary) }),
        ...(maxSalary && { maxSalary: Number(maxSalary) }),
        ...(salaryPeriod && { salaryPeriod: salaryPeriod as never }),
        ...(location && { location }),
        ...(sector && { sector }),
        ...(postedWithin && { postedWithinDays: Number(postedWithin) }),
        sort: sort as never,
      })
      setRows(res as any[])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [query, type, remote, minSalary, maxSalary, salaryPeriod, location, sector, postedWithin, sort])

  useEffect(() => { run() }, [type, remote, location, sector, salaryPeriod, postedWithin, sort]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    createLooseTrpcClient().jobs.locations.query().then((d: any) => { setLocations(d.locations ?? []); setRemoteCount(d.remote ?? 0) }).catch(() => {})
    createLooseTrpcClient().jobs.sectors.query().then(d => setSectors(d as any[])).catch(() => {})
  }, [])

  // Geocode job locations to pins for the map view.
  const points = useMemo<JobPoint[]>(() => rows.flatMap(j => {
    const coords: [number, number] | null = (j.listing?.lat != null && j.listing?.lng != null)
      ? [j.listing.lat, j.listing.lng]
      : geocodeGC(j.listing?.location)
    if (!coords) return []
    return [{
      id: j.listing?.id, title: j.jobTitle, company: j.company,
      location: j.remote ? 'Remote' : (j.listing?.location ?? 'Canary Islands'),
      salary: salaryLabel(j.salaryMin, j.salaryMax, j.salaryPeriod),
      lat: coords[0], lng: coords[1],
    }]
  }), [rows])

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Recruitment" />
      <QuickActions belowPromo={<PageHero title="Recruitment" tagline="Island jobs, island talent." body="Browse vacancies across the Canary Islands and apply in a couple of taps — or post a role and hire from the community." />} />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
        <form onSubmit={e => { e.preventDefault(); run() }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Compact search + filters on one line to free up a banner slot */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search jobs…" style={{ ...inp, flex: '1 1 180px', minWidth: 140, padding: '7px 12px' }} />
            <button type="submit" style={{ ...btn, padding: '7px 14px' }}>Search</button>
            <select value={type} onChange={e => setType(e.target.value)} style={sel}>
              {TYPES.map(t => <option key={t.label} value={t.value ?? ''}>{t.label}</option>)}
            </select>
            <select value={sector} onChange={e => setSector(e.target.value)} style={sel}>
              <option value="">All sectors</option>
              {sectors.map(sc => <option key={sc.sector} value={sc.sector}>{sc.sector} ({sc.count})</option>)}
            </select>
            <button type="button" onClick={() => setShowAdvanced(v => !v)} style={{ ...sel, color: 'var(--orange)', borderColor: 'var(--orange)' }}>
              {showAdvanced ? 'Fewer filters ▲' : 'More filters ▼'}
            </button>
            <select value={sort} onChange={e => setSort(e.target.value)} style={sel}>
              <option value="newest">Newest</option>
              <option value="salary_high">Highest paid</option>
              <option value="salary_low">Lowest paid</option>
              <option value="soonest">Starting soonest</option>
            </select>
            {/* Seeker + employer CTAs sit on the filter line, pushed to the right */}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <SeekerCta />
              <Link href="/jobs/new" style={{ background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '8px 14px', textDecoration: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>+ Post a Job</Link>
            </span>
          </div>

          {showAdvanced && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 10 }}>
              <input value={minSalary} onChange={e => setMinSalary(e.target.value)} inputMode="numeric" placeholder="Min €" style={{ ...inp, width: 90 }} />
              <input value={maxSalary} onChange={e => setMaxSalary(e.target.value)} inputMode="numeric" placeholder="Max €" style={{ ...inp, width: 90 }} />
              <select value={salaryPeriod} onChange={e => setSalaryPeriod(e.target.value)} style={sel}>
                <option value="">Any period</option>
                <option value="hour">per hour</option>
                <option value="month">per month</option>
                <option value="year">per year</option>
              </select>
              <select value={postedWithin} onChange={e => setPostedWithin(e.target.value)} style={sel}>
                <option value="">Any time</option>
                <option value="1">Last 24 hours</option>
                <option value="3">Last 3 days</option>
                <option value="7">Last week</option>
                <option value="30">Last month</option>
              </select>
              <button type="button" onClick={() => { setMinSalary(''); setMaxSalary(''); setSalaryPeriod(''); setPostedWithin(''); setSector(''); setType(''); setRemote(false); setQuery('') }} style={{ background: 'none', border: 'none', color: '#888', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Clear all</button>
            </div>
          )}
        </form>

        {/* Dynamic location filters — update as jobs are posted */}
        {(locations.length > 0 || remoteCount > 0) && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingTop: 10 }}>
            <Chip active={!location && !remote} onClick={() => { setLocation(''); setRemote(false) }}>All areas</Chip>
            {remoteCount > 0 && (
              <Chip active={remote} onClick={() => { setRemote(!remote); setLocation('') }}>Remote ({remoteCount})</Chip>
            )}
            {locations.map(l => (
              <Chip key={l.location} active={location === l.location && !remote} onClick={() => { setLocation(l.location); setRemote(false) }}>{l.location} ({l.count})</Chip>
            ))}
          </div>
        )}
      </header>

      {/* Sellable recruitment banner — renders only when an active banner exists */}
      <BannerSlot position="jobs" aspect="5 / 1" />

      {/* Count + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {loading ? 'Searching…' : `${rows.length} job${rows.length === 1 ? '' : 's'}`}
        </span>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e5dccd', borderRadius: 50, overflow: 'hidden' }}>
          <Toggle active={!mapView} onClick={() => setMapView(false)}>List</Toggle>
          <Toggle active={mapView} onClick={() => setMapView(true)}>Map</Toggle>
        </div>
      </div>

      {mapView ? (
        <div style={{ padding: '0 12px' }}>
          <JobsMap points={points} />
          {points.length < rows.length && (
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>
              {rows.length - points.length} job(s) without a recognised location aren’t shown on the map.
            </div>
          )}
        </div>
      ) : (
        <div className="category-grid">
          {rows.map(j => {
            const l = j.listing ?? {}
            const img = Array.isArray(l.images) ? l.images[0] : null
            return (
              <Link key={j.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                <div style={card}>
                  <div style={{ width: '100%', paddingTop: '72%', position: 'relative', background: 'linear-gradient(135deg,#2193b0,#6dd5ed)' }}>
                    {img
                      ? <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>💼</div>}
                    <span style={typeBadge}>{(TYPE_LABEL[j.type] ?? j.type).toUpperCase()}</span>
                    {j.remote && <span style={{ ...typeBadge, left: 8, right: 'auto', background: 'rgba(27,108,168,0.9)' }}>REMOTE</span>}
                  </div>
                  <div style={{ padding: '10px 11px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.jobTitle}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)', margin: '3px 0' }}>{salaryLabel(j.salaryMin, j.salaryMax, j.salaryPeriod)}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#1a1a1a' }}>{j.company}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#1a1a1a' }}>📍 {j.remote ? 'Remote' : (l.location ?? 'Canary Islands')}</div>
                  </div>
                </div>
              </Link>
            )
          })}
          {!loading && rows.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💼</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>No jobs match your search</div>
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

// "List yourself for work" — opens the seeker profile editor. Must live inside
// PanelProvider (JobsPage renders the provider, so it can't call usePanel itself).
function SeekerCta() {
  const { openPanel } = usePanel()
  return (
    <button onClick={() => openPanel('seekerProfile')} style={{ marginLeft: 'auto', border: '1.5px solid var(--orange)', background: '#fff', color: 'var(--orange)', borderRadius: 50, padding: '8px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>🙋 Find me work</button>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', border: `1.5px solid ${active ? 'var(--orange)' : '#e5dccd'}`, background: active ? 'var(--orange)' : '#fff',
      color: active ? '#fff' : '#555', borderRadius: 50, padding: '6px 13px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}
function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ border: 'none', background: active ? 'var(--orange)' : 'transparent', color: active ? '#fff' : '#888', padding: '6px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{children}</button>
  )
}
function MapSkeleton() {
  return <div style={{ width: '100%', height: 380, borderRadius: 14, background: '#ece3d7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#a99', fontSize: 13 }}>Loading map…</div>
}

const inp: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer', fontWeight: 700 }
const btn: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const typeBadge: React.CSSProperties = { position: 'absolute', top: 8, right: 8, background: 'rgba(26,26,26,0.82)', color: '#fff', fontSize: 8.5, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 7px', borderRadius: 50, letterSpacing: 0.3 }
