'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Dedicated support inbox — inbound Help Centre contact-form enquiries and
// member Suggest-Ideas submissions, separated from the sales pipeline so they
// don't get lost. Mark each one resolved once handled.
interface Item {
  id: string; name: string; email: string | null; notes: string | null
  createdAt: string; kind: 'contact' | 'suggestion' | 'event'; resolved: boolean
}
const KIND_META: Record<Item['kind'], { icon: string; label: string }> = {
  contact: { icon: '✉️', label: 'Enquiry' },
  suggestion: { icon: '💡', label: 'Idea' },
  event: { icon: '📅', label: 'Event' },
}

const TABS: { id: 'open' | 'resolved' | 'all'; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

export default function SupportInboxView() {
  const api = useCrmApi()
  const [items, setItems] = useState<Item[] | null>(null)
  const [status, setStatus] = useState<'open' | 'resolved' | 'all'>('open')
  const [busy, setBusy] = useState('')

  const load = () => { setItems(null); api.supportInbox(status).then(d => setItems((d ?? []) as Item[])).catch(() => setItems([])) }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolve = async (it: Item, resolved: boolean) => {
    setBusy(it.id)
    try { await api.resolveSupport(it.id, resolved); load() } finally { setBusy('') }
  }

  // Strip the leading "[Contact enquiry]" / "[Feature suggestion]" tag from notes.
  const body = (notes: string | null) => (notes ?? '').replace(/^\[[^\]]+\]\s*/, '')

  return (
    <div style={{ padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Support inbox</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Help Centre enquiries &amp; member ideas. Also saved as CRM leads.</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setStatus(tb.id)} style={{ border: 'none', borderRadius: 50, padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, background: status === tb.id ? '#1a1a1a' : '#f0ece5', color: status === tb.id ? '#fff' : '#666' }}>{tb.label}</button>
          ))}
        </div>
      </div>

      {items === null ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          {status === 'open' ? 'No open enquiries — all caught up.' : status === 'resolved' ? 'Nothing resolved yet.' : 'No support enquiries yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(it => (
            <div key={it.id} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: it.resolved ? 0.65 : 1 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{KIND_META[it.kind]?.icon ?? '✉️'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 900, color: '#1a1a1a' }}>{it.name || 'Member'}</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, color: '#8a6d3b', background: '#fff6e6', border: '1px solid #f0e0bd', borderRadius: 50, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>{KIND_META[it.kind]?.label ?? 'Enquiry'}</span>
                  {it.resolved && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, color: '#16a34a', background: '#f0faf4', borderRadius: 50, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>Resolved</span>}
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{new Date(it.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {it.email && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#888', marginTop: 1 }}><a href={`mailto:${it.email}`} style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 800 }}>{it.email}</a></div>}
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#333', lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{body(it.notes)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {it.email && <a href={`mailto:${it.email}?subject=${encodeURIComponent('Re: your Grabitt enquiry')}`} style={{ background: 'var(--orange)', color: '#fff', borderRadius: 8, padding: '6px 13px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Reply by email</a>}
                  <button onClick={() => resolve(it, !it.resolved)} disabled={busy === it.id} style={{ background: it.resolved ? '#f5f5f5' : '#f0faf4', color: it.resolved ? '#888' : '#16a34a', border: 'none', borderRadius: 8, padding: '6px 13px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    {busy === it.id ? '…' : it.resolved ? 'Reopen' : '✓ Mark resolved'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
