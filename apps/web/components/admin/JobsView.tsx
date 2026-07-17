'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Exec suite — oversight of every job listing on the platform (real data).
interface AdminJob {
  id: string
  listingId: string
  jobTitle: string
  company: string
  type: string
  sector: string | null
  salaryMin: number | null
  salaryMax: number | null
  status: string
  location: string
  createdAt: string
  views: number
  applicants: number
  employer: string
  employerEmail: string
  employerIsBusiness: boolean
}

const FILTERS = ['all', 'active', 'expired'] as const
const JOB_LIFE_DAYS = 21

function daysLeft(createdAt: string) {
  return Math.ceil((new Date(createdAt).getTime() + JOB_LIFE_DAYS * 86400000 - Date.now()) / 86400000)
}
function salary(j: AdminJob) {
  if (j.salaryMin && j.salaryMax) return `€${j.salaryMin.toLocaleString()}–${j.salaryMax.toLocaleString()}`
  if (j.salaryMin) return `€${j.salaryMin.toLocaleString()}+`
  if (j.salaryMax) return `up to €${j.salaryMax.toLocaleString()}`
  return '—'
}

export default function JobsView() {
  const api = useCrmApi()
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setJobs((await api.adminJobs(filter)) as AdminJob[]) }
    catch { setError('Could not load job listings.') }
    finally { setLoading(false) }
  }, [api, filter])
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => ({
    total: jobs.length,
    live: jobs.filter(j => j.status === 'active' && daysLeft(j.createdAt) > 0).length,
    applicants: jobs.reduce((n, j) => n + j.applicants, 0),
    views: jobs.reduce((n, j) => n + j.views, 0),
  }), [jobs])

  return (
    <div>
      <h1 style={h1}>💼 Job Listings</h1>
      <p style={sub}>Every job posted on Grabitt. Listings run for {JOB_LIFE_DAYS} days.</p>

      <div style={statRow}>
        <Stat label="Listings" value={stats.total} />
        <Stat label="Live" value={stats.live} color="#16a34a" />
        <Stat label="Applicants" value={stats.applicants} color="#FF4500" />
        <Stat label="Views" value={stats.views} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
        <button onClick={load} style={{ ...chip(false), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      {loading ? <div style={empty}>Loading…</div>
        : error ? <div style={{ ...empty, color: '#ef4444' }}>{error}</div>
        : jobs.length === 0 ? <div style={empty}>No job listings yet.</div>
        : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                {['Role', 'Employer', 'Location', 'Salary', 'Applicants', 'Views', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => {
                const d = daysLeft(j.createdAt)
                const expired = j.status !== 'active' || d <= 0
                return (
                  <tr key={j.id} style={{ borderTop: '1px solid #f0ece5' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 800, color: '#1a1a1a' }}>{j.jobTitle}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{j.sector ?? j.type.replace('_', ' ')}</div>
                    </td>
                    <td style={td}>
                      <div>{j.company}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {j.employer}{!j.employerIsBusiness && <span style={warnPill}>not business</span>}
                      </div>
                    </td>
                    <td style={td}>{j.location}</td>
                    <td style={td}>{salary(j)}</td>
                    <td style={{ ...td, fontWeight: 800, color: j.applicants ? '#FF4500' : '#bbb' }}>{j.applicants}</td>
                    <td style={td}>{j.views}</td>
                    <td style={td}>
                      {expired
                        ? <span style={pill('#ef4444')}>Expired</span>
                        : <span style={pill(d <= 3 ? '#f59e0b' : '#16a34a')}>{d}d left</span>}
                    </td>
                    <td style={td}>
                      <a href={`/listings/${j.listingId}`} target="_blank" rel="noreferrer" style={{ color: '#FF4500', fontWeight: 800, textDecoration: 'none', fontSize: 12 }}>View ↗</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 22, fontWeight: 900, color: color ?? '#1a1a1a' }}>{value}</div>
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
