'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'
import { toast, confirmDialog } from '@/lib/ui'
import { DEPT_LABEL, COND_LABEL } from '@/lib/listingMap'
import { compressAndUpload, listingPhotoPath } from '@/lib/storage'

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
  const [editId, setEditId] = useState<string | null>(null)

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

  // Per-row show/hide toggle — disabled = status 'removed' (kept, not deleted).
  const toggleStatus = async (r: Row) => {
    setBusy(true)
    try {
      await api.listingsBulk([r.id], r.status === 'removed' ? 'activate' : 'remove')
      toast(r.status === 'removed' ? '✓ Listing enabled' : '✓ Listing disabled (hidden)')
      load()
    } catch (e: any) { toast(e?.message ?? 'Action failed') }
    finally { setBusy(false) }
  }

  const actions = useMemo(() => ([
    { a: 'renew' as const, label: 'Renew', bg: '#eef7ff', color: '#1e6fd0' },
    { a: 'feature' as const, label: 'Feature', bg: '#fff3ee', color: 'var(--orange)' },
    { a: 'unfeature' as const, label: 'Unfeature', bg: '#f5f0e8', color: '#8a6d3b' },
    { a: 'activate' as const, label: 'Reactivate', bg: '#f0faf4', color: '#16a34a' },
    { a: 'remove' as const, label: 'Deactivate', bg: '#fef7ed', color: '#c2410c' },
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
                <th style={th}>Actions</th>
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
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditId(r.id)} style={rowBtn('#eef2f8', '#1e2b55')}>Edit</button>
                      <button onClick={() => toggleStatus(r)} disabled={busy || r.status === 'sold'} style={rowBtn(r.status === 'removed' ? '#f0faf4' : '#fef7ed', r.status === 'removed' ? '#16a34a' : '#c2410c')}>{r.status === 'removed' ? 'Enable' : 'Disable'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editId && <EditModal id={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); load() }} />}
    </div>
  )
}

// ── Admin listing editor ──────────────────────────────────────────────────────
type Detail = {
  id: string; title: string; description: string; price: number; department: string; subcategory: string | null
  condition: string | null; brand: string | null; colour: string | null; size: string | null; images: string[]
  location: string; stock: number; deliveryFee: number | null; deliveryMethod: string | null; status: string
  seller: { displayName: string | null; email: string | null } | null
}
function EditModal({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const api = useCrmApi()
  const [d, setD] = useState<Detail | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { api.listingAdminDetail(id).then(r => setD(r as Detail)).catch(() => setErr('Could not load listing.')) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<Detail>) => setD(prev => prev ? { ...prev, ...patch } : prev)

  const addImages = async (files: FileList | null) => {
    if (!files || !d) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const f of Array.from(files).slice(0, 8)) urls.push(await compressAndUpload(f, listingPhotoPath(d.id)))
      set({ images: [...d.images, ...urls].slice(0, 8) })
    } catch { toast('Image upload failed') }
    finally { setUploading(false) }
  }

  const save = async () => {
    if (!d) return
    if (d.images.length === 0) { setErr('At least one photo is required.'); return }
    setErr(''); setSaving(true)
    try {
      await api.updateListingAdmin({
        id: d.id, title: d.title, description: d.description, price: d.price, department: d.department,
        subcategory: d.subcategory || null, condition: d.condition || undefined, brand: d.brand || null,
        colour: d.colour || null, size: d.size || null, images: d.images, location: d.location,
        stock: d.stock, deliveryFee: d.deliveryFee, deliveryMethod: (d.deliveryMethod as 'courier' | 'in_person' | null) || null,
        status: d.status as 'active' | 'draft' | 'removed',
      })
      toast('✓ Listing updated')
      onSaved()
    } catch (e: any) { setErr(e?.message ?? 'Could not save.') }
    finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 22, width: 'min(680px, 100%)', margin: 'auto', fontFamily: 'var(--font-ui)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a', margin: 0 }}>Edit listing</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        {!d ? (
          <div style={{ padding: 30, color: '#aaa' }}>{err || 'Loading…'}</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {d.seller && <div style={{ fontSize: 12, color: '#888' }}>Seller: {d.seller.displayName || d.seller.email}</div>}
            <Field label="Title"><input value={d.title} onChange={e => set({ title: e.target.value })} style={inp} /></Field>
            <Field label="Description"><textarea value={d.description} onChange={e => set({ description: e.target.value })} rows={5} style={{ ...inp, resize: 'vertical' }} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Price (€)"><input type="number" value={d.price} onChange={e => set({ price: Number(e.target.value) })} style={inp} /></Field>
              <Field label="Stock"><input type="number" value={d.stock} onChange={e => set({ stock: Number(e.target.value) })} style={inp} /></Field>
              <Field label="Department">
                <select value={d.department} onChange={e => set({ department: e.target.value })} style={inp}>
                  {Object.entries(DEPT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Condition">
                <select value={d.condition ?? ''} onChange={e => set({ condition: e.target.value || null })} style={inp}>
                  <option value="">—</option>
                  {Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Brand"><input value={d.brand ?? ''} onChange={e => set({ brand: e.target.value })} style={inp} /></Field>
              <Field label="Colour"><input value={d.colour ?? ''} onChange={e => set({ colour: e.target.value })} style={inp} /></Field>
              <Field label="Size"><input value={d.size ?? ''} onChange={e => set({ size: e.target.value })} style={inp} /></Field>
              <Field label="Location"><input value={d.location} onChange={e => set({ location: e.target.value })} style={inp} /></Field>
              <Field label="Delivery method">
                <select value={d.deliveryMethod ?? ''} onChange={e => set({ deliveryMethod: e.target.value || null })} style={inp}>
                  <option value="">Collection only</option>
                  <option value="in_person">In person</option>
                  <option value="courier">Courier</option>
                </select>
              </Field>
              <Field label="Delivery fee (€)"><input type="number" value={d.deliveryFee ?? 0} onChange={e => set({ deliveryFee: Number(e.target.value) })} style={inp} /></Field>
              <Field label="Status">
                <select value={d.status} onChange={e => set({ status: e.target.value })} style={inp}>
                  <option value="active">Active (visible)</option>
                  <option value="draft">Draft</option>
                  <option value="removed">Disabled (hidden)</option>
                </select>
              </Field>
            </div>
            <Field label="Photos">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {d.images.map((src, i) => (
                  <div key={src + i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0d8d0' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => set({ images: d.images.filter((_, j) => j !== i) })} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                <label style={{ width: 72, height: 72, borderRadius: 8, border: '1.5px dashed #cbb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8a7a63', fontSize: 11, textAlign: 'center' }}>
                  {uploading ? '…' : '+ Add'}
                  <input type="file" accept="image/*" multiple hidden onChange={e => addImages(e.target.files)} />
                </label>
              </div>
            </Field>
            {err && <div style={{ color: '#c0392b', fontSize: 12.5, fontWeight: 700 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={{ background: '#fff', color: '#555', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 18px', fontWeight: 900, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || uploading} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 900, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</label>{children}</div>
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 900, color: '#555', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 12px', color: '#333', whiteSpace: 'nowrap' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff' }
const rowBtn = (bg: string, color: string): React.CSSProperties => ({ background: bg, color, border: 'none', borderRadius: 7, padding: '5px 10px', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 900, cursor: 'pointer' })
const badge = (bg: string, color: string): React.CSSProperties => ({ marginLeft: 6, background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 900 })
