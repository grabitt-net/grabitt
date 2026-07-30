'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'
import { MEMBER_STATUSES } from '@grabitt/design-tokens'

// Review queue for special-status applications (Student / Blue Light / Charity).
// Approving grants the status + benefit; rejecting notifies the member.
interface App {
  id: string; kind: string; status: string; details: string | null; evidenceUrl: string | null
  reviewNote: string | null; createdAt: string
  user: { id: string; displayName?: string; email?: string; memberStatus?: string | null }
}
const TABS = ['pending', 'approved', 'rejected', 'all'] as const
const meta = (k: string) => (MEMBER_STATUSES as any)[k] ?? { label: k, badge: '•', blurb: '' }

export default function StatusApplicationsView() {
  const api = useCrmApi()
  const [tab, setTab] = useState<typeof TABS[number]>('pending')
  const [apps, setApps] = useState<App[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => api.statusApplications(tab).then(a => setApps((a ?? []) as App[])).catch(() => {})
  useEffect(() => { load() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    let note: string | undefined
    if (decision === 'rejected') { note = prompt('Reason for rejection (optional):') || undefined }
    setBusy(id)
    try { await api.reviewStatusApplication(id, decision, note); load() } finally { setBusy(null) }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Status applications</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 14 }}>Validate Student, Blue Light and Charity applications. Approving grants the discount / free charity account automatically.</div>

      <div style={{ display: 'flex', gap: 6, background: '#f0ece5', borderRadius: 50, padding: 4, marginBottom: 16, maxWidth: 380 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1a1a1a' : '#888', borderRadius: 50, padding: '7px 0', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {apps.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: '30px 0', textAlign: 'center' }}>No {tab === 'all' ? '' : tab} applications.</div>}

      {apps.map(a => {
        const m = meta(a.kind)
        return (
          <div key={a.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{m.badge}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>{m.label} · {a.user.displayName ?? a.user.email ?? a.user.id}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#888' }}>{a.user.email} · applied {new Date(a.createdAt).toLocaleDateString('en-GB')}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 50, background: a.status === 'approved' ? '#dcfce7' : a.status === 'rejected' ? '#fee2e2' : '#fef9c3', color: a.status === 'approved' ? '#16a34a' : a.status === 'rejected' ? '#ef4444' : '#a16207' }}>{a.status}</span>
            </div>
            {a.details && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#555', marginTop: 8, background: '#f9f7f2', borderRadius: 8, padding: '8px 10px' }}><b>Details:</b> {a.details}</div>}
            {a.evidenceUrl && <a href={a.evidenceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#FF4500' }}>📎 View evidence →</a>}
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa', marginTop: 6 }}>{m.blurb}</div>
            {a.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => review(a.id, 'approved')} disabled={busy === a.id} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Approve</button>
                <button onClick={() => review(a.id, 'rejected')} disabled={busy === a.id} style={{ background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Reject</button>
              </div>
            )}
            {a.reviewNote && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#888', marginTop: 8 }}>Note: {a.reviewNote}</div>}
          </div>
        )
      })}
    </div>
  )
}
