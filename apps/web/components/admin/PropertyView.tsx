'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Exec suite — oversight of every property listing on the platform (real data).
interface AdminProperty {
  id: string
  listingId: string
  title: string
  price: number
  status: string
  location: string
  createdAt: string
  views: number
  type: string
  bedrooms: number | null
  bathrooms: number | null
  m2: number | null
  hasPool: boolean
  hasGarage: boolean
  agent: string
  agentEmail: string
  agentIsBusiness: boolean
}

const FILTERS = ['all', 'active', 'sold', 'expired'] as const
const TYPE_LABEL: Record<string, string> = {
  sale: 'For Sale', rent: 'To Let', holiday: 'Holiday Let',
  commercial: 'Commercial', land: 'Land', new_build: 'New Build',
}
const isRental = (t: string) => t === 'rent' || t === 'holiday'

export default function PropertyView() {
  const api = useCrmApi()
  const [rows, setRows] = useState<AdminProperty[]>([])
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setRows((await api.adminProperties(filter)) as AdminProperty[]) }
    catch { setError('Could not load property listings.') }
    finally { setLoading(false) }
  }, [api, filter])
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const live = rows.filter(r => r.status === 'active')
    const sale = live.filter(r => !isRental(r.type))
    const avg = sale.length ? Math.round(sale.reduce((n, r) => n + r.price, 0) / sale.length) : 0
    return { total: rows.length, live: live.length, avg, views: rows.reduce((n, r) => n + r.views, 0) }
  }, [rows])

  return (
    <div>
      <h1 style={h1}>🏠 Property Listings</h1>
      <p style={sub}>Every property listed on Grabitt by agents and business accounts.</p>

      <div style={statRow}>
        <Stat label="Listings" value={String(stats.total)} />
        <Stat label="Live" value={String(stats.live)} color="#16a34a" />
        <Stat label="Avg sale price" value={stats.avg ? `€${stats.avg.toLocaleString()}` : '—'} color="#FF4500" />
        <Stat label="Views" value={String(stats.views)} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
        <button onClick={load} style={{ ...chip(false), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {loading ? <div style={empty}>Loading…</div>
        : error ? <div style={{ ...empty, color: '#ef4444' }}>{error}</div>
        : rows.length === 0 ? <div style={empty}>No property listings yet.</div>
        : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                {['Property', 'Agent', 'Location', 'Type', 'Spec', 'Price', 'Views', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #f0ece5' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 800, color: '#1a1a1a' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  </td>
                  <td style={td}>
                    <div>{r.agent}{!r.agentIsBusiness && <span style={warnPill}>not business</span>}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{r.agentEmail}</div>
                  </td>
                  <td style={td}>{r.location}</td>
                  <td style={td}><span style={pill('#2193b0')}>{TYPE_LABEL[r.type] ?? r.type}</span></td>
                  <td style={td}>
                    {[r.bedrooms != null ? `${r.bedrooms} bed` : null, r.bathrooms != null ? `${r.bathrooms} bath` : null, r.m2 ? `${r.m2} m²` : null]
                      .filter(Boolean).join(' · ') || '—'}
                    <div style={{ fontSize: 11, color: '#999' }}>{[r.hasPool && 'Pool', r.hasGarage && 'Garage'].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{ ...td, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                    €{r.price.toLocaleString()}{isRental(r.type) ? '/mo' : ''}
                  </td>
                  <td style={td}>{r.views}</td>
                  <td style={td}><span style={pill(r.status === 'active' ? '#16a34a' : '#888')}>{r.status}</span></td>
                  <td style={td}>
                    <a href={`/listings/${r.listingId}`} target="_blank" rel="noreferrer" style={{ color: '#FF4500', fontWeight: 800, textDecoration: 'none', fontSize: 12 }}>View ↗</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 20, fontWeight: 900, color: color ?? '#1a1a1a' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#888', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

const h1: React.CSSProperties = { fontFamily: 'Comfortaa, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }
const sub: React.CSSProperties = { fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#888', margin: '0 0 16px' }
const statRow: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }
const statCard: React.CSSProperties = { flex: 1, minWidth: 110, background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 12, textAlign: 'center' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, fontFamily: 'Nunito, sans-serif', fontSize: 13 }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 12px', color: '#555', verticalAlign: 'top' }
const empty: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888', fontFamily: 'Nunito, sans-serif', fontSize: 13 }
const warnPill: React.CSSProperties = { marginLeft: 6, background: '#fef2f2', color: '#b91c1c', borderRadius: 50, padding: '1px 6px', fontSize: 9, fontWeight: 800 }
const chip = (active: boolean): React.CSSProperties => ({
  background: active ? '#FF4500' : '#fff', color: active ? '#fff' : '#666',
  border: '1px solid #ece3d7', borderRadius: 50, padding: '6px 14px',
  fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}1a`, color, borderRadius: 50, padding: '3px 9px',
  fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
})
