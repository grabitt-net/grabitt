'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

type Consent = { id: string; userId: string; kind: string; email: string; displayName: string; acceptedAt: string; version: string }
type Deletion = { id: string; userId: string; email: string; displayName: string; status: string; requestedAt: string; completedAt: string | null }

type Tab = 'gdpr' | 'withdrawal_waiver' | 'deletions'
const TABS: { id: Tab; label: string }[] = [
  { id: 'gdpr', label: 'GDPR consents' },
  { id: 'withdrawal_waiver', label: 'Right-to-withdraw waivers' },
  { id: 'deletions', label: 'Deletion requests' },
]

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function ComplianceView() {
  const api = useCrmApi()
  const [tab, setTab] = useState<Tab>('gdpr')
  const [consents, setConsents] = useState<Consent[]>([])
  const [deletions, setDeletions] = useState<Deletion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (tab === 'deletions') {
      api.deletionRequests().then(d => setDeletions((d ?? []) as Deletion[])).catch(() => setDeletions([])).finally(() => setLoading(false))
    } else {
      api.consentLog(tab).then(d => setConsents((d ?? []) as Consent[])).catch(() => setConsents([])).finally(() => setLoading(false))
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#FF4500' }}>Compliance</span> & GDPR</h2>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Immutable record of consent acceptances and data-erasure requests.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? '#FF4500' : '#fff', color: tab === t.id ? '#fff' : '#555', border: `1.5px solid ${tab === t.id ? '#FF4500' : '#e5e7eb'}`, borderRadius: 50, padding: '7px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading…</div>
        ) : tab === 'deletions' ? (
          <Table
            cols={['User', 'Email (at request)', 'Requested', 'Status', 'Completed']}
            rows={deletions.map(d => [d.displayName, d.email, fmt(d.requestedAt), d.status === 'completed' ? '✅ Completed' : '⏳ ' + d.status, fmt(d.completedAt)])}
            empty="No deletion requests."
          />
        ) : (
          <Table
            cols={['User', 'Email', 'Accepted at', 'Version']}
            rows={consents.map(c => [c.displayName, c.email, fmt(c.acceptedAt), 'v' + c.version])}
            empty={`No ${tab === 'gdpr' ? 'GDPR' : 'waiver'} acceptances recorded yet.`}
          />
        )}
      </div>
    </div>
  )
}

function Table({ cols, rows, empty }: { cols: string[]; rows: (string)[][]; empty: string }) {
  if (rows.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>{empty}</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)' }}>
      <thead>
        <tr style={{ background: '#faf7f3' }}>
          {cols.map(c => <th key={c} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: '1px solid #f0ebe4' }}>
            {r.map((cell, j) => <td key={j} style={{ padding: '10px 14px', fontSize: 12.5, color: j === 0 ? 'var(--dark)' : '#555', fontWeight: j === 0 ? 800 : 400 }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
