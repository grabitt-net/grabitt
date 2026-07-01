'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const reasons = ['spam', 'counterfeit', 'prohibited', 'misleading', 'other']

interface Props { reports: any[] }

export default function ReportsView({ reports: initial }: Props) {
  const [reports, setReports] = useState(initial)
  const [filter, setFilter] = useState('open')

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  async function dismiss(id: string) {
    const supabase = createClient()
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'dismissed' } : r))
  }

  async function takeDown(id: string, listingId: string) {
    const supabase = createClient()
    await Promise.all([
      supabase.from('reports').update({ status: 'actioned' }).eq('id', id),
      supabase.from('listings').update({ status: 'removed' }).eq('id', listingId),
    ])
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'actioned' } : r))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Reports</span>
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['open', 'actioned', 'dismissed', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11,
              background: filter === f ? '#FF4500' : '#fff', color: filter === f ? '#fff' : '#666',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🚨</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, color: '#aaa' }}>No {filter} reports</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                {['Listing', 'Reason', 'Reported by', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13 }}>
                    {r.listings?.title ?? r.listing_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: '#fff3ee', color: '#FF4500',
                      borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)',
                    }}>{r.reason ?? '—'}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>
                    {r.reported_by?.full_name ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa' }}>
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)',
                      background: r.status === 'open' ? '#fef2f2' : r.status === 'actioned' ? '#f0faf4' : '#f5f5f5',
                      color: r.status === 'open' ? '#ef4444' : r.status === 'actioned' ? '#16a34a' : '#aaa',
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {r.status === 'open' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => dismiss(r.id)} style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#888',
                        }}>Dismiss</button>
                        <button onClick={() => takeDown(r.id, r.listing_id)} style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: '#ef4444', color: '#fff',
                          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>Remove</button>
                      </div>
                    )}
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
