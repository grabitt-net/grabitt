'use client'
import { useState, useEffect, useCallback } from 'react'
import { useCrmApi } from './AdminApp'

type Filter = 'open' | 'actioned' | 'dismissed' | 'all'

const REASON_LABEL: Record<string, string> = {
  scam: 'Scam / fraud',
  counterfeit: 'Counterfeit',
  prohibited: 'Prohibited item',
  misleading: 'Misleading / fake',
  price_gouging: 'Price gouging',
  duplicate: 'Duplicate',
  contact_info_leak: 'Contact info leak',
  other: 'Other',
}

interface Props { onCountChange?: (open: number) => void }

export default function ReportsView({ onCountChange }: Props) {
  const api = useCrmApi()
  const [reports, setReports] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.reports(filter)
      .then(rows => setReports(rows ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [api, filter])

  useEffect(() => { load() }, [load])

  async function act(id: string, action: 'dismiss' | 'takedown') {
    setBusyId(id)
    try {
      await api.resolveReport(id, action)
      // Drop it from the current view unless we're looking at everything.
      setReports(prev => filter === 'all'
        ? prev.map(r => r.id === id ? { ...r, status: action === 'takedown' ? 'actioned' : 'dismissed' } : r)
        : prev.filter(r => r.id !== id))
      if (action === 'takedown') onCountChange?.(reports.filter(r => r.id !== id && r.status === 'open').length)
    } catch {
      // leave the row; a failed action shouldn't look like a success
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Reports</span> & moderation
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['open', 'actioned', 'dismissed', 'all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11,
              background: filter === f ? '#FF4500' : '#fff', color: filter === f ? '#fff' : '#666',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading reports…</div>
      ) : reports.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🚨</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, color: '#aaa' }}>No {filter} reports</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                {['Listing', 'Reason', 'Seller', 'Reported by', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f9f9f9', verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13 }}>
                    {r.listingTitle ?? (r.listingId ? r.listingId.slice(0, 8) : '—')}
                    {r.notes && <div style={{ fontWeight: 400, fontSize: 11, color: '#888', marginTop: 3, fontStyle: 'italic', maxWidth: 240 }}>&ldquo;{r.notes}&rdquo;</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: '#fff3ee', color: '#FF4500', borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>{r.reportedName ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>{r.reporterName ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
                        <button disabled={busyId === r.id} onClick={() => act(r.id, 'dismiss')} style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#888', background: '#fff',
                        }}>Dismiss</button>
                        <button disabled={busyId === r.id || !r.listingId} title={!r.listingId ? 'No listing attached' : 'Remove listing'} onClick={() => act(r.id, 'takedown')} style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: !r.listingId ? '#f0c0c0' : '#ef4444', color: '#fff',
                          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, cursor: r.listingId ? 'pointer' : 'not-allowed',
                        }}>{busyId === r.id ? '…' : 'Remove'}</button>
                      </div>
                    )}
                    {r.status !== 'open' && r.actionTaken && (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa' }}>{r.actionTaken}</span>
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
