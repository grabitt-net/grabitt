'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'
import { toast, confirmDialog } from '@/lib/ui'

type Row = {
  id: string; title: string; price: string | number; department: string; status: string
  isFeatured: boolean; sponsoredUntil: string | null; stock: number; createdAt: string; bumpedAt: string
  seller: { id: string; displayName: string | null; email: string | null } | null
  _count: { transactions: number }
}
type Status = 'all' | 'active' | 'draft' | 'sold' | 'removed'
const STATUSES: Status[] = ['all', 'active', 'draft', 'sold', 'removed']
const statusColor: Record<string, string> = { active: '#16a34a', draft: '#f59e0b', sold: '#6b7280', removed: '#ef4444' }

// Admin → Listings. All listings with search/status filters, select + bulk
// actions (renew, feature, activate, remove, delete).
export default function ListingsView() {
  const api = useCrmApi()
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())

  const load = () => {
    setLoading(true)
    api.listingsAdmin({ q: q.trim() || undefined, status, take: 300 })
      .then(d => { setRows(d.rows as Row[]); setTotal(d.total); setSel(new Set()) })
      .catch(() => { setRows([]); setTotal(0) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const allChecked = rows.length > 0 && sel.size === rows.length
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(rows.map(r => r.id)))

  const bulk = async (action: 'delete' | 'renew' | 'feature' | 'unfeature' | 'activate' | 'remove', label: string) => {
    if (sel.size === 0) return
    if (action === 'delete' && !(await confirmDialog(`Delete ${sel.size} listing(s)? Ads with sales are archived (removed) instead of deleted. This cannot be undone.`))) return
    setBusy(true)
    try {
      const res = await api.listingsBulk(Array.from(sel), action)
      if (action === 'delete') toast(`✓ Deleted ${res.deleted ?? 0}${res.removed ? `, archived ${res.removed}` : ''}`)
      else toast(`✓ ${label} ${sel.size} listing(s)`)
      load()
    } catch (e: any) { toast(e?.message ?? 'Action failed') }
    finally { setBusy(false) }
  }

  const eur = (p: string | number) => `€${Number(p).toLocaleString()}`
  const selCount = sel.size

  const actions = useMemo(() => ([
    { a: 'renew' as const, label: 'Renew', bg: '#eef7ff', color: '#1e6fd0' },
    { a: 'feature' as const, label: 'Feature', bg: '#fff3ee', color: 'var(--orange)' },
    { a: 'unfeature' as const, label: 'Unfeature', bg: '#f5f0e8', color: '#8a6d3b' },
    { a: 'activate' as const, label: 'Activate', bg: '#f0faf4', color: '#16a34a' },
    { a: 'remove' as const, label: 'Remove', bg: '#fef7ed', color: '#c2410c' },
    { a: 'delete' as const, label: 'Delete', bg: '#fef2f2', color: '#ef4444' },
  ]), [])

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a', margin: '0 0 4px' }}>Listings</h2>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#777', margin: '0 0 14px' }}>All marketplace listings. Select rows to renew, feature, activate/remove, or delete in bulk. {total} total.</p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load() }} placeholder="Search title…" style={{ border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 11px', fontFamily: 'var(--font-ui)', fontSize: 13, minWidth: 220 }} />
        <button onClick={load} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>Search</button>
        <div style={{ display: 'flex', gap: 6, marginLeft: 6 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ border: `1.5px solid ${status === s ? 'var(--orange)' : '#e5dccd'}`, background: status === s ? 'var(--orange)' : '#fff', color: status === s ? '#fff' : '#555', borderRadius: 999, padding: '6px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, opacity: selCount ? 1 : 0.5, pointerEvents: selCount && !busy ? 'auto' : 'none' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555' }}>{selCount} selected</span>
        {actions.map(x => (
          <button key={x.a} onClick={() => bulk(x.a, x.label)} style={{ background: x.bg, color: x.color, border: 'none', borderRadius: 8, padding: '7px 13px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>{x.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: 24 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#999', padding: 24 }}>No listings match.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #ece3d7', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#faf7f3', textAlign: 'left' }}>
                <th style={th}><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th style={th}>Title</th>
                <th style={th}>Price</th>
                <th style={th}>Dept</th>
                <th style={th}>Status</th>
                <th style={th}>Seller</th>
                <th style={th}>Sales</th>
                <th style={th}>Listed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #f0ebe4', background: sel.has(r.id) ? '#fff8f4' : '#fff' }}>
                  <td style={td}><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td style={td}>
                    <a href={`/listings/${r.id}`} target="_blank" rel="noreferrer" style={{ color: '#1a1a1a', fontWeight: 700, textDecoration: 'none' }}>{r.title}</a>
                    {r.isFeatured && <span style={badge('#fff3ee', 'var(--orange)')}>Featured</span>}
                    {r.sponsoredUntil && new Date(r.sponsoredUntil) > new Date() && <span style={badge('#eef7ff', '#1e6fd0')}>Sponsored</span>}
                  </td>
                  <td style={td}>{eur(r.price)}</td>
                  <td style={{ ...td, textTransform: 'capitalize' }}>{r.department.replace(/_/g, ' ')}</td>
                  <td style={td}><span style={{ color: statusColor[r.status] ?? '#555', fontWeight: 800, textTransform: 'capitalize' }}>{r.status}</span></td>
                  <td style={td}>{r.seller?.displayName || r.seller?.email || '—'}</td>
                  <td style={td}>{r._count.transactions}</td>
                  <td style={td}>{new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 900, color: '#555', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 12px', color: '#333', whiteSpace: 'nowrap' }
const badge = (bg: string, color: string): React.CSSProperties => ({ marginLeft: 6, background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 900 })
