'use client'
import { useCallback, useEffect, useState } from 'react'
import { makeCrmApi } from '@/lib/admin-api'

// The candidate register: everyone who has listed themselves for work. Employers
// pay to search this pool, so the team needs its own view of it — to see how
// deep the supply is per sector, spot profiles with no CV behind them, and open
// a candidate's member record.

type Candidate = {
  id: string; userId: string; name: string; email: string; phone: string | null
  verified: boolean; joined: string; headline: string | null
  sectors: string[]; roles: string[]; experienceMonths: number
  languages: string[]; hours: string[]; availability: string | null
  rightToWork: string | null; location: string; skills: string[]
  active: boolean; hasCv: boolean; applications: number; updatedAt: string
}

const SECTORS = ['Hospitality', 'Office', 'Legal', 'Retail', 'Construction', 'Healthcare',
  'Education', 'Technology', 'Marine', 'Property', 'Sales & Marketing']

export default function CandidatesView({ execToken, onOpenMember }: {
  execToken: string
  onOpenMember?: (userId: string) => void
}) {
  const [rows, setRows] = useState<Candidate[] | null>(null)
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const data = await makeCrmApi(execToken).candidates({
        query: query.trim() || undefined,
        sector: sector || undefined,
        activeOnly,
      })
      setRows(data as Candidate[])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load candidates')
      setRows([])
    }
  }, [execToken, query, sector, activeOnly])

  useEffect(() => { load() }, [load])

  const years = (m: number) => m >= 12 ? `${Math.floor(m / 12)}y` : `${m}m`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Candidates</h2>
        <span style={{ fontSize: 12, color: '#888' }}>{rows ? `${rows.length} listed for work` : 'Loading…'}</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, email or headline"
          style={{ marginLeft: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 220 }}
        />
        <select value={sector} onChange={e => setSector(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
          <option value="">All sectors</option>
          {SECTORS.map(s => <option key={s}>{s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#555', cursor: 'pointer' }}>
          <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />
          Visible only
        </label>
      </div>

      {err && <div style={{ background: '#fff5f5', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, marginBottom: 12 }}>{err}</div>}

      {!rows ? null : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
          No candidates match. Members appear here once they list themselves for work.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                {['Candidate', 'Sectors', 'Roles', 'Exp', 'Location', 'Skills', 'CV', 'Apps', 'Status'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={td}>
                    <button
                      onClick={() => onOpenMember?.(c.userId)}
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: onOpenMember ? 'pointer' : 'default', color: onOpenMember ? '#1B6CA8' : 'inherit', fontWeight: 700, fontSize: 12.5 }}
                    >
                      {c.name}{c.verified ? ' 🛡️' : ''}
                    </button>
                    <div style={{ color: '#999', fontSize: 11 }}>{c.email}</div>
                    {c.headline && <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{c.headline}</div>}
                  </td>
                  <td style={td}>{c.sectors.join(', ') || '—'}</td>
                  <td style={{ ...td, maxWidth: 200 }}>{c.roles.slice(0, 4).join(', ') || '—'}{c.roles.length > 4 ? ` +${c.roles.length - 4}` : ''}</td>
                  <td style={td}>{years(c.experienceMonths)}</td>
                  <td style={td}>{c.location || '—'}</td>
                  <td style={{ ...td, maxWidth: 180 }}>{c.skills.slice(0, 3).join(', ') || '—'}{c.skills.length > 3 ? ` +${c.skills.length - 3}` : ''}</td>
                  <td style={td}>{c.hasCv ? '✅' : '—'}</td>
                  <td style={td}>{c.applications}</td>
                  <td style={td}>
                    <span style={{ background: c.active ? '#dcfce7' : '#f0f0f0', color: c.active ? '#16a34a' : '#888', borderRadius: 50, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                      {c.active ? 'Visible' : 'Paused'}
                    </span>
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

const th: React.CSSProperties = { padding: '9px 10px', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 10px', verticalAlign: 'top', color: '#333' }
