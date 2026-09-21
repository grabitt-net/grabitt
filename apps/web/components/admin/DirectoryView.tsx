'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useCrmApi } from './AdminApp'
import AddressAutocomplete from '@/components/marketplace/AddressAutocomplete'
import { BUSINESS_CATEGORIES } from '@/lib/businessCategories'
import { compressAndUpload, cmsImagePath } from '@/lib/storage'

const MapPicker = dynamic(() => import('@/components/marketplace/MapPicker'), { ssr: false })

interface Listing {
  id: string; userId: string; name: string; category: string | null; description: string | null
  phone: string | null; email: string | null; website: string | null; logoUrl: string | null; location: string | null
  live: boolean; disabled?: boolean; reviewStatus?: string; adminNote?: string | null; user?: { email?: string; displayName?: string }
}
interface DirCategory { id: string; name: string; sortOrder: number; active: boolean }

// Categories are DB-driven (seeded from the built-in defaults). The dropdowns use
// the active ones in admin order; the static defaults are only a fallback for the
// brief case where the table is somehow empty.
function mergeCategories(custom: DirCategory[]): string[] {
  const active = custom.filter(c => c.active).map(c => c.name)
  return active.length ? active : [...BUSINESS_CATEGORIES]
}

export default function DirectoryView() {
  const api = useCrmApi()
  const [rows, setRows] = useState<Listing[]>([])
  const [editing, setEditing] = useState<Listing | null>(null)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [customCats, setCustomCats] = useState<DirCategory[]>([])
  const cats = mergeCategories(customCats)

  const load = () => api.directoryListings().then(d => {
    // Surface listings awaiting review first, then rejected, then the rest.
    const order = (s?: string) => (s === 'pending' ? 0 : s === 'rejected' ? 1 : 2)
    setRows(((d ?? []) as Listing[]).slice().sort((a, b) => order(a.reviewStatus) - order(b.reviewStatus)))
  }).catch(() => {})
  const loadCats = () => api.directoryCategories().then(c => setCustomCats((c ?? []) as DirCategory[])).catch(() => {})
  useEffect(() => { load(); loadCats() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (id: string) => { if (!window.confirm('Delete this listing permanently? This cannot be undone.')) return; await api.removeDirectoryListing(id); load() }
  const approve = async (id: string) => { await api.reviewDirectoryListing(id, 'approved'); load() }
  const reject = async (id: string) => {
    const note = window.prompt('Reason for rejection (shown to the advertiser so they can fix & resubmit):', '')
    if (note === null) return
    await api.reviewDirectoryListing(id, 'rejected', note || undefined); load()
  }
  const toggleDisabled = async (l: Listing) => {
    if (!l.disabled && !window.confirm(`Disable “${l.name}”? It will be hidden from the public directory until you re-enable it. Its paid time is not affected.`)) return
    await api.setDirectoryDisabled(l.id, !l.disabled); load()
  }
  const grantMonths = async (l: Listing) => {
    const raw = window.prompt(`Grant free months to “${l.name}” — how many? (extends from its current expiry if still active)`, '1')
    if (raw === null) return
    const months = Math.floor(Number(raw))
    if (!Number.isFinite(months) || months < 1 || months > 60) { window.alert('Enter a whole number of months between 1 and 60.'); return }
    await api.grantDirectoryMonths(l.id, months); load()
  }
  const clearPaid = async (id: string) => { if (!window.confirm('Clear the paid window? The listing will stop showing publicly.')) return; await api.setDirectoryPaidUntil(id, null); load() }
  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await api.updateDirectoryListing({
        id: editing.id, name: editing.name, category: editing.category ?? '', description: editing.description ?? '',
        phone: editing.phone ?? '', email: editing.email ?? '', website: editing.website ?? '', logoUrl: editing.logoUrl ?? '', location: editing.location ?? '',
      })
      setEditing(null); await load()
    } finally { setSaving(false) }
  }
  const set = (k: keyof Listing, v: string) => setEditing(e => e ? { ...e, [k]: v } : e)
  const uploadEditLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoBusy(true)
    try { const url = await compressAndUpload(file, cmsImagePath('directory'), { maxDim: 2400, quality: 0.92 }); set('logoUrl', url) }
    catch { window.alert('Could not upload the logo. Please try again.') }
    finally { setLogoBusy(false) }
  }

  const liveCount = rows.filter(r => r.live).length
  const pendingCount = rows.filter(r => r.reviewStatus === 'pending').length

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: 'var(--orange)' }}>Business</span> Directory</h2>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>{rows.length} listing{rows.length === 1 ? '' : 's'} · {liveCount} live · {pendingCount > 0 ? <span style={{ color: '#b45309', fontWeight: 800 }}>{pendingCount} awaiting review</span> : 'none awaiting review'} (a listing shows only while paid and approved).</div>
        </div>
        <button onClick={() => setCreating(true)} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '9px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ New listing</button>
      </div>

      <CategoryManager api={api} custom={customCats} reload={loadCats} />


      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12.5 }}>
          <thead><tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <th style={th}>Business</th><th style={th}>Owner</th><th style={th}>Category</th><th style={th}>Status</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} style={{ borderTop: '1px solid #f5f0e8' }}>
                <td style={td}><div style={{ fontWeight: 800 }}>{l.name}</div>{l.location && <div style={{ color: '#aaa', fontSize: 10.5 }}>📍 {l.location}</div>}</td>
                <td style={{ ...td, color: '#888' }}>{l.user?.email ?? l.userId}</td>
                <td style={{ ...td, color: '#888' }}>{l.category ?? '—'}</td>
                <td style={td}>
                  {l.reviewStatus === 'pending'
                    ? <span style={{ color: '#b45309', fontWeight: 800 }}>🟠 Awaiting review</span>
                    : l.reviewStatus === 'rejected'
                      ? <span style={{ color: '#ef4444', fontWeight: 800 }} title={l.adminNote ?? ''}>⛔ Rejected</span>
                      : l.live ? <span style={{ color: '#16a34a', fontWeight: 800 }}>🟢 Live</span> : <span style={{ color: '#888', fontWeight: 800 }}>⚪ Approved · unpaid</span>}
                  {l.disabled && <div style={{ color: '#ef4444', fontWeight: 800, marginTop: 3 }}>🚫 Disabled</div>}
                  {l.reviewStatus === 'rejected' && l.adminNote && <div style={{ color: '#aaa', fontSize: 10, marginTop: 3, maxWidth: 200 }}>“{l.adminNote}”</div>}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {l.reviewStatus === 'pending' && <button onClick={() => approve(l.id)} style={{ ...pill, background: '#16a34a', color: '#fff' }}>✓ Approve</button>}
                    {l.reviewStatus === 'pending' && <button onClick={() => reject(l.id)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Reject</button>}
                    {l.reviewStatus === 'approved' && <button onClick={() => reject(l.id)} title="Send back for changes" style={{ ...pill, background: '#fff7ed', color: '#b45309' }}>Unapprove</button>}
                    {l.reviewStatus === 'rejected' && <button onClick={() => approve(l.id)} style={{ ...pill, background: '#f0faf4', color: '#16a34a' }}>Approve</button>}
                    <button onClick={() => setEditing(l)} style={{ ...pill, background: '#f0f0f0', color: '#555' }}>Edit</button>
                    <a href={`/directory/${l.id}`} target="_blank" rel="noopener" style={{ ...pill, background: '#fff7ed', color: '#c2410c', textDecoration: 'none', display: 'inline-block' }}>View</a>
                    <button onClick={() => grantMonths(l)} title="Grant free months" style={{ ...pill, background: '#f0faf4', color: '#16a34a' }}>+ Free months</button>
                    {l.live && <button onClick={() => clearPaid(l.id)} style={{ ...pill, background: '#f5f5f5', color: '#888' }}>Clear paid</button>}
                    <button onClick={() => toggleDisabled(l)} style={{ ...pill, background: l.disabled ? '#f0faf4' : '#fff7ed', color: l.disabled ? '#16a34a' : '#b45309' }}>{l.disabled ? 'Enable' : 'Disable'}</button>
                    <button onClick={() => remove(l.id)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#bbb', padding: 40 }}>No directory listings yet</td></tr>}
          </tbody>
        </table>
      </div>

      {creating && <CreateListingModal api={api} cats={cats} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load() }} />}

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 12 }}>Edit listing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <F label="Name"><input value={editing.name} onChange={e => set('name', e.target.value)} style={inp} /></F>
              <F label="Category">
                <select value={editing.category ?? ''} onChange={e => set('category', e.target.value)} style={inp}>
                  <option value="">Select a category…</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  {editing.category && !cats.includes(editing.category) && <option value={editing.category}>{editing.category}</option>}
                </select>
              </F>
              <F label="Location"><input value={editing.location ?? ''} onChange={e => set('location', e.target.value)} style={inp} /></F>
              <F label="Phone"><input value={editing.phone ?? ''} onChange={e => set('phone', e.target.value)} style={inp} /></F>
              <F label="Email"><input value={editing.email ?? ''} onChange={e => set('email', e.target.value)} style={inp} /></F>
              <F label="Website"><input value={editing.website ?? ''} onChange={e => set('website', e.target.value)} style={inp} /></F>
              <div style={{ gridColumn: '1/-1' }}>
                <F label="Logo">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {editing.logoUrl ? <img src={editing.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} /> : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏢</div>}
                    <label style={{ display: 'inline-block', background: '#FFF3EE', color: 'var(--orange)', border: '1.5px solid #FFD9C2', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: logoBusy ? 'default' : 'pointer' }}>
                      {logoBusy ? 'Uploading…' : editing.logoUrl ? 'Change logo' : 'Upload logo'}
                      <input type="file" accept="image/*" hidden onChange={e => uploadEditLogo(e.target.files?.[0])} />
                    </label>
                    {editing.logoUrl && <button onClick={() => set('logoUrl', '')} style={{ background: '#fff', color: '#888', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Remove</button>}
                  </div>
                </F>
              </div>
              <div style={{ gridColumn: '1/-1' }}><F label="Description"><textarea value={editing.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></F></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !editing.name.trim()} style={{ padding: '8px 18px', borderRadius: 50, border: 'none', background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', fontFamily: 'var(--font-ui)', fontWeight: 800 }
const td: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'top' }
const pill: React.CSSProperties = { padding: '5px 11px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)' }
const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 12, boxSizing: 'border-box' }
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>{children}</div>
}

// Admin-managed custom categories. Built-in defaults always show in the
// dropdowns and can't be removed here; this adds/removes the extra ones.
function CategoryManager({ api, custom, reload }: { api: ReturnType<typeof useCrmApi>; custom: DirCategory[]; reload: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const add = async () => {
    const n = name.trim()
    if (n.length < 2) return
    setBusy(true)
    try { await api.upsertDirectoryCategory({ name: n, sortOrder: custom.length }); setName(''); reload() }
    finally { setBusy(false) }
  }
  const remove = async (c: DirCategory) => {
    if (!window.confirm(`Remove the category “${c.name}” from the dropdowns? Existing listings keep their category text.`)) return
    await api.removeDirectoryCategory(c.id); reload()
  }
  const toggle = async (c: DirCategory) => { await api.upsertDirectoryCategory({ id: c.id, name: c.name, sortOrder: c.sortOrder, active: !c.active }); reload() }

  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>Categories <span style={{ color: '#aaa', fontWeight: 700 }}>· {custom.length}</span></div>
        <button onClick={() => setOpen(o => !o)} style={{ ...pill, background: '#f0f0f0', color: '#555' }}>{open ? 'Hide' : 'Manage'}</button>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="New category name" style={{ ...inp, flex: 1, marginBottom: 0 }} />
            <button onClick={add} disabled={busy || name.trim().length < 2} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Add</button>
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#999', marginBottom: 8 }}>These are the categories advertisers can choose. Add new ones, hide (👁) or remove (×) any you don’t want. Removing one only drops the dropdown option — listings already on it keep their text.</div>
          {custom.length === 0
            ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb' }}>No categories yet — add your first above.</div>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {custom.map(c => (
                  <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: c.active ? '#f0ebe4' : '#f5f5f5', color: c.active ? '#1a1a1a' : '#aaa', borderRadius: 50, padding: '5px 8px 5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 700 }}>
                    {c.name}
                    <button onClick={() => toggle(c)} title={c.active ? 'Hide from dropdowns' : 'Show in dropdowns'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0 }}>{c.active ? '🙈' : '👁️'}</button>
                    <button onClick={() => remove(c)} title="Remove" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>}
        </div>
      )}
    </div>
  )
}

// Admin creates a directory listing for an existing member (by their email).
function CreateListingModal({ api, cats, onClose, onCreated }: { api: ReturnType<typeof useCrmApi>; cats: string[]; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ ownerEmail: '', name: '', category: '', location: '', phone: '', email: '', website: '', logoUrl: '', description: '', paidMonths: 12 })
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f, v: string | number) => setF(p => ({ ...p, [k]: v }))
  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoBusy(true); setErr('')
    try { set('logoUrl', await compressAndUpload(file, cmsImagePath('directory'))) }
    catch { setErr('Could not upload the logo.') } finally { setLogoBusy(false) }
  }
  const create = async () => {
    if (!f.name.trim()) { setErr('Business name is required.'); return }
    setErr(''); setSaving(true)
    try {
      await api.createDirectoryListing({
        ownerEmail: f.ownerEmail.trim(), name: f.name.trim(), category: f.category, location: f.location,
        phone: f.phone, email: f.email, website: f.website, logoUrl: f.logoUrl, description: f.description,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        paidMonths: Number(f.paidMonths) || 0,
      })
      onCreated()
    } catch (e: any) { setErr(e?.message ?? 'Could not create the listing.') }
    finally { setSaving(false) }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 4 }}>New directory listing</h3>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 12 }}>Leave the owner email blank to create an <strong>unclaimed</strong> listing that populates the directory — the business can later claim it (getting 1 month free). Or enter an existing member&apos;s email to attach it to their account. Admin-created listings are approved automatically.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: '1/-1' }}><F label="Owner email (optional — blank = unclaimed)"><input value={f.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} placeholder="Leave blank to create an unclaimed listing" style={inp} /></F></div>
          <F label="Business name"><input value={f.name} onChange={e => set('name', e.target.value)} style={inp} /></F>
          <F label="Category">
            <select value={f.category} onChange={e => set('category', e.target.value)} style={inp}>
              <option value="">Select a category…</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </F>
          <F label="Phone"><input value={f.phone} onChange={e => set('phone', e.target.value)} style={inp} /></F>
          <F label="Email"><input value={f.email} onChange={e => set('email', e.target.value)} style={inp} /></F>
          <F label="Website"><input value={f.website} onChange={e => set('website', e.target.value)} placeholder="yourbusiness.com" style={inp} /></F>
          <F label="Paid months"><input type="number" value={f.paidMonths} onChange={e => set('paidMonths', Number(e.target.value))} style={inp} /></F>
          <div style={{ gridColumn: '1/-1' }}>
            <F label="Location / address">
              <AddressAutocomplete value={f.location} onChange={v => set('location', v)} onSelect={pick => { set('location', pick.address); setCoords({ lat: pick.lat, lng: pick.lng }) }} placeholder="Start typing the address…" />
            </F>
            <div style={{ marginTop: 8 }}>
              <MapPicker value={coords} onChange={setCoords} height={200} />
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 4 }}>{coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Search the address or tap the map to drop a pin.'}</div>
            </div>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <F label="Logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {f.logoUrl ? <img src={f.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }} /> : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>}
                <label style={{ display: 'inline-block', background: '#FFF3EE', color: 'var(--orange)', border: '1.5px solid #FFD9C2', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: logoBusy ? 'default' : 'pointer' }}>
                  {logoBusy ? 'Uploading…' : f.logoUrl ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/*" hidden onChange={e => uploadLogo(e.target.files?.[0])} />
                </label>
              </div>
            </F>
          </div>
          <div style={{ gridColumn: '1/-1' }}><F label="Description"><textarea value={f.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></F></div>
        </div>
        {err && <div style={{ color: '#c0392b', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)', marginTop: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          <button onClick={create} disabled={saving} style={{ padding: '8px 18px', borderRadius: 50, border: 'none', background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Creating…' : 'Create listing'}</button>
        </div>
      </div>
    </div>
  )
}
