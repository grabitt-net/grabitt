'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

interface Blast {
  id: string; channel: string; subject: string | null; message: string; linkUrl: string | null
  audience: string | null; status: string; adminNote: string | null; createdAt: string; sentAt: string | null
  user?: { displayName?: string; email?: string; businessName?: string }
}

const STATUSES = ['queued', 'sent', 'rejected', 'all'] as const

export default function BlastsView() {
  const api = useCrmApi()
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('queued')
  const [rows, setRows] = useState<Blast[]>([])

  const load = () => api.blastRequests(status).then(d => setRows((d ?? []) as Blast[])).catch(() => {})
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const markSent = async (b: Blast) => { await api.markBlastSent(b.id); load() }
  const reject = async (b: Blast) => { const note = window.prompt('Reason (refunds the send):') ?? undefined; await api.rejectBlast(b.id, note); load() }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#FF4500' }}>Direct-marketing</span> Blasts</h2>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Businesses compose and pay; you send. Mark each sent once it goes out — rejecting refunds the send.</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{ border: 'none', borderRadius: 50, padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, background: status === s ? '#1a1a1a' : '#f0ece5', color: status === s ? '#fff' : '#666', textTransform: 'capitalize' }}>{s}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map(b => (
          <div key={b.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${b.status === 'queued' ? '#f59e0b' : b.status === 'sent' ? '#16a34a' : '#ef4444'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#fff', background: b.channel === 'whatsapp' ? '#22c55e' : '#3b82f6', padding: '3px 8px', borderRadius: 50 }}>{b.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800 }}>{b.user?.businessName || b.user?.displayName || b.user?.email}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: b.status === 'queued' ? '#b45309' : b.status === 'sent' ? '#16a34a' : '#ef4444', textTransform: 'capitalize' }}>{b.status}{b.sentAt ? ` · ${new Date(b.sentAt).toLocaleDateString('en-GB')}` : ''}</span>
            </div>
            {b.subject && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{b.subject}</div>}
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{b.message}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', flexWrap: 'wrap' }}>
              {b.linkUrl && <a href={b.linkUrl} target="_blank" rel="noopener" style={{ color: '#3b82f6' }}>🔗 {b.linkUrl}</a>}
              {b.audience && <span>🎯 {b.audience}</span>}
              <span>🕑 {new Date(b.createdAt).toLocaleString('en-GB')}</span>
            </div>
            {b.adminNote && <div style={{ marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 11, color: '#b45309' }}>Note: {b.adminNote}</div>}
            {b.status === 'queued' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => markSent(b)} style={{ padding: '7px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, fontFamily: 'var(--font-ui)', background: '#16a34a', color: '#fff' }}>✓ Mark sent</button>
                <button onClick={() => reject(b)} style={{ padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-ui)', background: '#fef2f2', color: '#ef4444' }}>Reject & refund</button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>No {status === 'all' ? '' : status} blasts</div>}
      </div>
    </div>
  )
}
