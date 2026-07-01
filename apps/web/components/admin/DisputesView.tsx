'use client'
import { useState } from 'react'
import { useCrmApi } from './AdminApp'

const OUTCOMES = [
  { value: 'resolved_buyer',  label: 'Resolve — Refund buyer' },
  { value: 'resolved_seller', label: 'Resolve — Release to seller' },
  { value: 'escalated',       label: 'Escalate' },
]

interface Props { disputes: any[]; onUpdate: (disputes: any[]) => void }

export default function DisputesView({ disputes: initial, onUpdate }: Props) {
  const api = useCrmApi()
  const [disputes, setDisputes] = useState(initial)
  const [filter, setFilter] = useState('open')

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  async function resolve(id: string, resolution: string, outcome: string) {
    const updated = await api.resolveDispute(id, resolution, outcome)
    const next = disputes.map(d => d.id === id ? { ...d, status: outcome, resolution } : d)
    setDisputes(next)
    onUpdate(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>Disputes</span>
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['open', 'under_review', 'resolved_buyer', 'resolved_seller', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 10,
              background: filter === f ? 'var(--orange)' : '#fff',
              color: filter === f ? '#fff' : '#666',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize',
            }}>{f.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚖️</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, color: '#aaa' }}>No {filter} disputes</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => (
            <DisputeCard key={d.id} dispute={d} onResolve={resolve} />
          ))}
        </div>
      )}
    </div>
  )
}

function DisputeCard({ dispute: d, onResolve }: { dispute: any; onResolve: (id: string, notes: string, outcome: string) => Promise<void> }) {
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('resolved_buyer')
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOpen = d.status === 'open' || d.status === 'under_review'

  const statusColor: Record<string, string> = {
    open: '#ef4444', under_review: '#f59e0b',
    resolved_buyer: '#16a34a', resolved_seller: '#16a34a', escalated: '#7c3aed',
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: `${statusColor[d.status] ?? '#888'}22`,
              color: statusColor[d.status] ?? '#888',
              borderRadius: 50, padding: '2px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)',
            }}>{d.status?.replace('_', ' ') ?? 'open'}</span>
            {d.transaction?.amount && (
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 13, color: 'var(--orange)' }}>
                €{Number(d.transaction.amount).toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
            {d.reason ?? d.transaction?.listing?.title ?? 'Dispute'}
          </div>
          <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-ui)' }}>
            {d.raisedBy?.displayName ?? d.raisedBy?.email ?? 'Unknown'}
            {' · '}{new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
          {d.evidence && <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic', marginTop: 4 }}>"{d.evidence}"</div>}
        </div>
        {isOpen && (
          <button onClick={() => setExpanded(!expanded)} style={{
            padding: '7px 14px', borderRadius: 50, border: 'none', flexShrink: 0,
            background: expanded ? '#f0f0f0' : 'var(--orange)', color: expanded ? '#555' : '#fff',
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, cursor: 'pointer',
          }}>
            {expanded ? 'Cancel' : 'Resolve'}
          </button>
        )}
        {!isOpen && d.resolution && (
          <div style={{ fontSize: 10, color: '#888', maxWidth: 200, fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
            "{d.resolution}"
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {OUTCOMES.map(o => (
              <button key={o.value} onClick={() => setOutcome(o.value)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 8, border: `1.5px solid ${outcome === o.value ? 'var(--orange)' : '#e5e7eb'}`,
                background: outcome === o.value ? '#FFF3EE' : '#fff',
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, cursor: 'pointer',
                color: outcome === o.value ? 'var(--orange)' : '#666',
              }}>{o.label}</button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Resolution notes…"
            rows={2}
            style={{ width: '100%', padding: 8, border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
          />
          <button
            onClick={async () => { setSaving(true); await onResolve(d.id, notes, outcome); setSaving(false); setExpanded(false) }}
            disabled={!notes.trim() || saving}
            style={{
              padding: '7px 18px', borderRadius: 50, border: 'none',
              background: '#16a34a', color: '#fff',
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer',
              opacity: notes.trim() && !saving ? 1 : 0.5,
            }}>
            {saving ? 'Saving…' : 'Confirm Resolution'}
          </button>
        </div>
      )}
    </div>
  )
}
