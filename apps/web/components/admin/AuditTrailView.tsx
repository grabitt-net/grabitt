'use client'
import { useCallback, useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Exec suite — the real audit trail: every privileged admin action, attributed
// to the admin who performed it (see ExecAuditLog / crm.auditTrail).
interface AuditEntry {
  id: string
  action: string
  detail: Record<string, unknown> | null
  createdAt: string
  by: string
  byRole: string
  targetId: string | null
  target: string | null
  targetEmail: string | null
}

// Known actions get a friendly label + icon; anything else falls back to the raw
// action name, so new actions still show up rather than silently vanishing.
const ACTIONS: Record<string, { label: string; icon: string; color: string }> = {
  member_update: { label: 'Member updated', icon: '✏️', color: '#3b82f6' },
  member_created: { label: 'Member created', icon: '➕', color: '#16a34a' },
  admin_granted: { label: 'Admin access granted', icon: '🔐', color: '#7c3aed' },
  admin_revoked: { label: 'Admin access revoked', icon: '🔓', color: '#ef4444' },
  email_changed: { label: 'Email changed', icon: '📧', color: '#f59e0b' },
  password_reset_sent: { label: 'Password reset sent', icon: '🔑', color: '#f59e0b' },
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function summarise(e: AuditEntry): string {
  const d = e.detail ?? {}
  if (e.action === 'member_update' && Array.isArray(d.fields)) return `Changed: ${(d.fields as string[]).join(', ')}`
  if (e.action === 'email_changed') return `${d.from ?? '?'} → ${d.to ?? '?'}`
  if (e.action === 'password_reset_sent') return `Sent to ${d.to ?? '—'}`
  if (e.action === 'member_created') return `Invited ${d.email ?? '—'}`
  if (e.action === 'admin_granted' || e.action === 'admin_revoked') return String(d.email ?? '')
  return ''
}

interface Props { onViewMember?: (id: string) => void }

export default function AuditTrailView({ onViewMember }: Props) {
  const api = useCrmApi()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setEntries((await api.auditTrail()) as AuditEntry[]) }
    catch { setError('Could not load the audit trail.') }
    finally { setLoading(false) }
  }, [api])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>📋 Audit Trail</h1>
        <button onClick={load} style={chip}>↻ Refresh</button>
      </div>
      <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#888', margin: '0 0 16px' }}>
        Every privileged action taken in the executive suite, and who took it.
      </p>

      {loading ? <div style={empty}>Loading…</div>
        : error ? <div style={{ ...empty, color: '#ef4444' }}>{error}</div>
        : entries.length === 0 ? <div style={empty}>No admin actions recorded yet.</div>
        : (
        <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden' }}>
          {entries.map(e => {
            const meta = ACTIONS[e.action] ?? { label: e.action, icon: '•', color: '#888' }
            const note = summarise(e)
            return (
              <div key={e.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: '1px solid #f6f3ee', alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>
                    {meta.label}
                    {e.target && <span style={{ fontWeight: 600, color: '#666' }}> — {e.target}</span>}
                  </div>
                  {note && <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#777', marginTop: 2 }}>{note}</div>}
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#aaa', marginTop: 3 }}>
                    by <strong style={{ color: '#888' }}>{e.by}</strong>
                    <span style={{ background: '#f0ece5', color: '#888', borderRadius: 50, padding: '1px 6px', fontSize: 9, fontWeight: 800, marginLeft: 5 }}>{e.byRole}</span>
                  </div>
                  {onViewMember && e.targetId && (
                    <button onClick={() => onViewMember(e.targetId!)} style={{ background: 'none', border: 'none', color: '#FF4500', fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, cursor: 'pointer', marginTop: 4, padding: 0 }}>
                      View member →
                    </button>
                  )}
                </div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10.5, color: '#bbb', flexShrink: 0, whiteSpace: 'nowrap' }}>{relative(e.createdAt)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const empty: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888', fontFamily: 'Nunito, sans-serif', fontSize: 13 }
const chip: React.CSSProperties = { background: '#fff', color: '#666', border: '1px solid #ece3d7', borderRadius: 50, padding: '6px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
