'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import BottomNav from '@/components/marketplace/BottomNav'

const TYPES: { label: string; value?: string }[] = [
  { label: 'All types' }, { label: 'Full Time', value: 'full_time' }, { label: 'Part Time', value: 'part_time' },
  { label: 'Contract', value: 'contract' }, { label: 'Temp', value: 'temporary' }, { label: 'Volunteer', value: 'volunteer' },
]
const TYPE_LABEL: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', temporary: 'Temp', volunteer: 'Volunteer' }

function salaryLabel(min?: number | string | null, max?: number | string | null) {
  const lo = min != null ? Number(min) : null
  const hi = max != null ? Number(max) : null
  if (lo && hi) return `€${lo.toLocaleString()}–${hi.toLocaleString()}/mo`
  if (lo) return `€${lo.toLocaleString()}/mo`
  if (hi) return `up to €${hi.toLocaleString()}/mo`
  return 'Negotiable'
}

export default function JobsPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [remote, setRemote] = useState(false)
  const [minSalary, setMinSalary] = useState('')
  const [location, setLocation] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const res = await createTrpcClient().jobs.list.query({
        ...(query.trim() && { query: query.trim() }),
        ...(type && { type: type as never }),
        ...(remote && { remote: true }),
        ...(minSalary && { minSalary: Number(minSalary) }),
        ...(location.trim() && { location: location.trim() }),
      })
      setRows(res as any[])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [query, type, remote, minSalary, location])

  // Re-run when the structured filters change; keyword/salary run on submit.
  useEffect(() => { run() }, [type, remote]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ background: '#f7f4ee', minHeight: '100dvh', paddingBottom: 90 }}>
      <header style={{ background: 'var(--sand)', padding: '12px 14px', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1.5px solid var(--sand2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', fontSize: 22, color: 'var(--orange)', fontWeight: 700 }}>‹</Link>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>💼 Jobs</span>
          <Link href="/jobs/new" style={{ marginLeft: 'auto', textDecoration: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>+ Post a Job</Link>
        </div>

        {/* Advanced search */}
        <form onSubmit={e => { e.preventDefault(); run() }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search job title or company…"
            style={inp} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={type} onChange={e => setType(e.target.value)} style={sel}>
              {TYPES.map(t => <option key={t.label} value={t.value ?? ''}>{t.label}</option>)}
            </select>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" style={{ ...inp, flex: 1, minWidth: 120 }} />
            <input value={minSalary} onChange={e => setMinSalary(e.target.value)} inputMode="numeric" placeholder="Min €/mo" style={{ ...inp, width: 110 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#555' }}>
              <input type="checkbox" checked={remote} onChange={e => setRemote(e.target.checked)} /> Remote
            </label>
            <button type="submit" style={btn}>Search</button>
          </div>
        </form>
      </header>

      <div style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
        {loading ? 'Searching…' : `${rows.length} job${rows.length === 1 ? '' : 's'}`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px' }}>
        {rows.map(j => {
          const l = j.listing ?? {}
          return (
            <Link key={j.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
              <div style={card}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={iconBox}>💼</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{j.jobTitle}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666', marginTop: 1 }}>{j.company} · 📍 {j.remote ? 'Remote' : (l.location ?? 'Gran Canaria')}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>{salaryLabel(j.salaryMin, j.salaryMax)}</span>
                      {j.type && <span style={badge}>{(TYPE_LABEL[j.type] ?? j.type).toUpperCase()}</span>}
                      {j.remote && <span style={{ ...badge, background: '#EAF4FF', color: '#1B6CA8' }}>REMOTE</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💼</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>No jobs match your search</div>
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
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #ece3d7', padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const iconBox: React.CSSProperties = { width: 48, height: 48, background: 'var(--sand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }
const badge: React.CSSProperties = { background: 'var(--sand)', color: '#888', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 8px', borderRadius: 50 }
