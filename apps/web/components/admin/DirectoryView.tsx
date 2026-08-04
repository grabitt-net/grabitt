'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

interface Listing {
  id: string; userId: string; name: string; category: string | null; description: string | null
  phone: string | null; email: string | null; website: string | null; logoUrl: string | null; location: string | null
  live: boolean; user?: { email?: string; displayName?: string }
}

export default function DirectoryView() {
  const api = useCrmApi()
  const [rows, setRows] = useState<Listing[]>([])
  const [editing, setEditing] = useState<Listing | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => api.directoryListings().then(d => setRows((d ?? []) as Listing[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (id: string) => { await api.removeDirectoryListing(id); load() }
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

  const liveCount = rows.filter(r => r.live).length

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#FF4500' }}>Business</span> Directory</h2>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>{rows.length} advertiser listing{rows.length === 1 ? '' : 's'} · {liveCount} live now (a listing shows only while a paid banner runs).</div>
      </div>

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
                <td style={td}>{l.live ? <span style={{ color: '#16a34a', fontWeight: 800 }}>🟢 Live</span> : <span style={{ color: '#b45309', fontWeight: 800 }}>🟠 Hidden</span>}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditing(l)} style={{ ...pill, background: '#f0f0f0', color: '#555' }}>Edit</button>
                    <a href={`/directory/${l.id}`} target="_blank" rel="noopener" style={{ ...pill, background: '#fff7ed', color: '#c2410c', textDecoration: 'none', display: 'inline-block' }}>View</a>
                    <button onClick={() => remove(l.id)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#bbb', padding: 40 }}>No directory listings yet</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 12 }}>Edit listing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <F label="Name"><input value={editing.name} onChange={e => set('name', e.target.value)} style={inp} /></F>
              <F label="Category"><input value={editing.category ?? ''} onChange={e => set('category', e.target.value)} style={inp} /></F>
              <F label="Location"><input value={editing.location ?? ''} onChange={e => set('location', e.target.value)} style={inp} /></F>
              <F label="Phone"><input value={editing.phone ?? ''} onChange={e => set('phone', e.target.value)} style={inp} /></F>
              <F label="Email"><input value={editing.email ?? ''} onChange={e => set('email', e.target.value)} style={inp} /></F>
              <F label="Website"><input value={editing.website ?? ''} onChange={e => set('website', e.target.value)} style={inp} /></F>
              <div style={{ gridColumn: '1/-1' }}><F label="Logo URL"><input value={editing.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} style={inp} /></F></div>
              <div style={{ gridColumn: '1/-1' }}><F label="Description"><textarea value={editing.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></F></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !editing.name.trim()} style={{ padding: '8px 18px', borderRadius: 50, border: 'none', background: '#FF4500', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
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
