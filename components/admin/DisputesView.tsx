'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props { disputes: any[] }

export default function DisputesView({ disputes: initial }: Props) {
  const [disputes, setDisputes] = useState(initial)
  const [filter, setFilter] = useState('open')

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  async function resolve(id: string, resolution: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('disputes')
      .update({ status: 'resolved', resolution_notes: resolution, resolved_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved', resolution_notes: resolution } : d))
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Disputes</span>
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['open', 'resolved', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 11,
              background: filter === f ? '#FF4500' : '#fff', color: filter === f ? '#fff' : '#666',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚖️</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, color: '#aaa' }}>No {filter} disputes</div>
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

function DisputeCard({ dispute: d, onResolve }: { dispute: any; onResolve: (id: string, notes: string) => void }) {
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: d.status === 'open' ? '#fef2f2' : '#f0faf4',
              color: d.status === 'open' ? '#ef4444' : '#16a34a',
              borderRadius: 50, padding: '2px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-nunito)',
            }}>{d.status}</span>
            {d.orders?.amount && (
              <span style={{ fontFamily: 'var(--font-nunito)', fontWeight: 900, fontSize: 13, color: '#FF4500' }}>
                €{Number(d.orders.amount).toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
            {d.reason ?? 'Dispute'}
          </div>
          <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-nunito)' }}>
            Raised by: {d.raised_by?.full_name ?? d.raised_by?.email ?? 'Unknown'}
            {' · '}{new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        {d.status === 'open' && (
          <button onClick={() => setExpanded(!expanded)} style={{
            padding: '7px 14px', borderRadius: 50, border: 'none',
            background: expanded ? '#f0f0f0' : '#FF4500', color: expanded ? '#555' : '#fff',
            fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 11, cursor: 'pointer',
          }}>
            {expanded ? 'Cancel' : 'Resolve'}
          </button>
        )}
        {d.status === 'resolved' && d.resolution_notes && (
          <div style={{ fontSize: 10, color: '#888', maxWidth: 200, fontFamily: 'var(--font-nunito)', fontStyle: 'italic' }}>
            "{d.resolution_notes}"
          </div>
        )}
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px', background: '#fafafa' }}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Resolution notes…"
            rows={2}
            style={{ width: '100%', padding: 8, border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-nunito)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
          />
          <button
            onClick={() => onResolve(d.id, notes)}
            disabled={!notes.trim()}
            style={{
              padding: '7px 18px', borderRadius: 50, border: 'none',
              background: '#16a34a', color: '#fff',
              fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 12, cursor: 'pointer',
              opacity: notes.trim() ? 1 : 0.5,
            }}>
            Mark Resolved
          </button>
        </div>
      )}
    </div>
  )
}
