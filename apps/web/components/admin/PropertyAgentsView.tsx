'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Review queue for property-agent self-signups. Approving grants the standalone
// agent profile (property-only, never a business); rejecting notifies them.
interface Applicant {
  id: string; displayName?: string; email?: string
  agencyName?: string | null; agentWhatsapp?: string | null; agentEmail?: string | null
  agentStatus?: string | null; isPropertyAgent?: boolean; isBusiness?: boolean; createdAt: string
}
const TABS = ['pending', 'approved', 'rejected', 'all'] as const

export default function PropertyAgentsView() {
  const api = useCrmApi()
  const [tab, setTab] = useState<typeof TABS[number]>('pending')
  const [rows, setRows] = useState<Applicant[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => api.agentApplicants(tab).then(a => setRows((a ?? []) as Applicant[])).catch(() => {})
  useEffect(() => { load() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (userId: string, decision: 'approved' | 'rejected') => {
    setBusy(userId)
    try { await api.reviewAgent(userId, decision); load() } finally { setBusy(null) }
  }

  const pill = (bg: string, fg: string, label: string) => <span style={{ background: bg, color: fg, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 50 }}>{label}</span>

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Property agents</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 14 }}>Review property-agent sign-ups. Approving grants a standalone agent account that can list property only (never a business).</div>

      <div style={{ display: 'flex', gap: 6, background: '#f0ece5', borderRadius: 50, padding: 4, marginBottom: 16, maxWidth: 380 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1a1a1a' : '#888', borderRadius: 50, padding: '7px 0', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#999', padding: 24, textAlign: 'center' }}>No {tab === 'all' ? '' : tab} agent applications.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>{r.agencyName || r.displayName || 'Agent'}</div>
                {r.isPropertyAgent
                  ? pill('#dcfce7', '#16a34a', 'active agent')
                  : r.agentStatus === 'pending' ? pill('#fef9c3', '#a16207', 'pending')
                  : r.agentStatus === 'rejected' ? pill('#fee2e2', '#ef4444', 'rejected') : pill('#f0f0f0', '#888', r.agentStatus ?? '—')}
                {r.isBusiness && pill('#ede9fe', '#7c3aed', 'business')}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666', marginTop: 6 }}>
                {r.displayName} · {r.email}
                {r.agentWhatsapp ? ` · 📱 ${r.agentWhatsapp}` : ''}{r.agentEmail ? ` · ✉️ ${r.agentEmail}` : ''}
              </div>
              {(tab === 'pending' || (!r.isPropertyAgent && r.agentStatus === 'pending')) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => review(r.id, 'approved')} disabled={busy === r.id} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>{busy === r.id ? '…' : 'Approve'}</button>
                  <button onClick={() => review(r.id, 'rejected')} disabled={busy === r.id} style={{ background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Reject</button>
                </div>
              )}
              {r.isPropertyAgent && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => review(r.id, 'rejected')} disabled={busy === r.id} style={{ background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, padding: '7px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Revoke agent status</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
