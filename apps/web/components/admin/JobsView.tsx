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
  const [viewJob, setViewJob] = useState<AdminJob | null>(null)

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
        <Stat label="Applicants" value={stats.applicants} color="var(--orange)" />
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
                    <td style={td}>{j.applicants ? <button onClick={() => setViewJob(j)} style={{ background: '#fff3ee', color: 'var(--orange)', border: '1px solid #ffd9c2', borderRadius: 50, padding: '3px 10px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>{j.applicants} ›</button> : <span style={{ color: '#bbb', fontWeight: 800 }}>0</span>}</td>
                    <td style={td}>{j.views}</td>
                    <td style={td}>
                      {expired
                        ? <span style={pill('#ef4444')}>Expired</span>
                        : <span style={pill(d <= 3 ? '#f59e0b' : '#16a34a')}>{d}d left</span>}
                    </td>
                    <td style={td}>
                      <a href={`/listings/${j.listingId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none', fontSize: 12 }}>View ↗</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewJob && <AdminApplicantsModal api={api} job={viewJob} onClose={() => setViewJob(null)} />}
    </div>
  )
}

// Read-only applicant monitor for one job (admin oversight / security).
const ADMIN_STAGES: [string, string][] = [
  ['applied', 'New'], ['viewed', 'Reviewing'], ['invited', 'Invited'], ['arranged', 'Interview'],
  ['offer', 'Offer'], ['accepted', 'Hired'], ['rejected_pre', 'Rejected'],
]
const ADMIN_FOLD: Record<string, string> = { shortlisted: 'invited', hired: 'accepted', rejected: 'rejected_pre', rejected_post: 'rejected_pre' }
function AdminApplicantsModal({ api, job, onClose }: { api: ReturnType<typeof useCrmApi>; job: AdminJob; onClose: () => void }) {
  const [data, setData] = useState<any | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api.adminJobApplicants(job.id).then(setData).catch(() => setErr('Could not load applicants.')) }, [api, job.id])
  const apps: any[] = data?.applications ?? []
  const group = (s: string) => apps.filter(a => (ADMIN_FOLD[a.status] ?? a.status) === s)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f0ece5' }}>
          <div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{job.jobTitle} — applicants</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#999' }}>{job.company} · {apps.length} applicant{apps.length === 1 ? '' : 's'} · admin oversight</div>
          </div>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflow: 'auto', padding: 16 }}>
          {err ? <div style={{ ...empty, color: '#ef4444' }}>{err}</div> : !data ? <div style={empty}>Loading…</div> : apps.length === 0 ? <div style={empty}>No applicants.</div> : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
              {ADMIN_STAGES.map(([key, label]) => {
                const cards = group(key)
                return (
                  <div key={key} style={{ flex: '0 0 220px', background: '#f8f9fa', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 900, color: '#555', marginBottom: 8 }}>{label} ({cards.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cards.map(a => (
                        <div key={a.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 9 }}>
                          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, color: '#1a1a1a' }}>{a.fullName || a.applicant}</div>
                          {a.email && <div style={{ fontSize: 10.5, color: '#888' }}>{a.email}</div>}
                          {a.phone && <div style={{ fontSize: 10.5, color: '#888' }}>{a.phone}</div>}
                          {a.currentRole && <div style={{ fontSize: 10.5, color: '#666', marginTop: 2 }}>💼 {a.currentRole}</div>}
                          {a.location && <div style={{ fontSize: 10.5, color: '#666' }}>📍 {a.location}</div>}
                          {a.employerNote && <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 4 }}>📝 {a.employerNote}</div>}
                          <a href={`/api/cv-pdf?applicationId=${a.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--orange)' }}>CV ↗</a>{a.cvUrl && <> · <a href={`/api/cv?applicationId=${a.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, fontWeight: 800, color: '#555' }}>file</a></>}
                        </div>
                      ))}
                      {cards.length === 0 && <div style={{ fontSize: 10, color: '#bbb', textAlign: 'center' }}>—</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
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
  background: active ? 'var(--orange)' : '#fff', color: active ? '#fff' : '#666',
  border: '1px solid #ece3d7', borderRadius: 50, padding: '6px 14px',
  fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}1a`, color, borderRadius: 50, padding: '3px 9px',
  fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
})
