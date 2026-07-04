'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

const POSITIONS: [string, string][] = [
  ['home_top', 'Home — Hero (top)'],
  ['home_mid', 'Home — Mid ad'],
  ['category', 'Category pages'],
  ['checkout', 'Checkout'],
]
const POS_LABEL = Object.fromEntries(POSITIONS)

interface Banner { id: string; title: string; imageUrl: string; linkUrl: string | null; active: boolean; position: string; startsAt: string | null; endsAt: string | null }

const EMPTY = { title: '', imageUrl: '', linkUrl: '', position: 'home_top', active: true, startsAt: '', endsAt: '' }

export default function BannersView() {
  const api = useCrmApi()
  const [banners, setBanners] = useState<Banner[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => api.banners().then(b => setBanners((b ?? []) as Banner[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form.title.trim() || !form.imageUrl.trim()) return
    setSaving(true)
    try {
      await api.upsertBanner({
        title: form.title.trim(),
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim() || undefined,
        position: form.position,
        active: form.active,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      })
      setForm({ ...EMPTY }); setShowAdd(false); await load()
    } finally { setSaving(false) }
  }

  async function toggle(b: Banner) {
    await api.upsertBanner({ id: b.id, title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl || undefined, position: b.position, active: !b.active })
    load()
  }
  async function remove(id: string) { await api.removeBanner(id); load() }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#FF4500' }}>Banners</span> & Placements</h2>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>These appear live on the website by position.</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ New Banner</button>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 12 }}>Add banner</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
            <Field label="Title">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} />
            </Field>
            <Field label="Placement">
              <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} style={inp}>
                {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: '1/-1' }}><Field label="Image URL">
              <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://…" style={inp} />
            </Field></div>
            <div style={{ gridColumn: '1/-1' }}><Field label="Link URL (optional)">
              <input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://… or /listings" style={inp} />
            </Field></div>
            <Field label="Start date"><input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} style={inp} /></Field>
            <Field label="End date"><input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} style={inp} /></Field>
          </div>
          {form.imageUrl && <img src={form.imageUrl} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, marginTop: 12 }} />}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Live immediately
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title || !form.imageUrl} style={{ padding: '7px 18px', borderRadius: 50, border: 'none', background: '#FF4500', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving || !form.title || !form.imageUrl ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add banner'}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {banners.map(b => (
          <div key={b.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `4px solid ${b.active ? '#FF4500' : '#e5e7eb'}` }}>
            <img src={b.imageUrl} alt={b.title} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
            <div style={{ padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 10, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 0.5 }}>{POS_LABEL[b.position] ?? b.position}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, marginTop: 2, marginBottom: 8 }}>{b.title}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggle(b)} style={{ flex: 1, padding: '5px 10px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', background: b.active ? '#f0faf4' : '#f5f5f5', color: b.active ? '#16a34a' : '#aaa' }}>{b.active ? '● Live' : '○ Off'}</button>
                <button onClick={() => remove(b.id)} style={{ padding: '5px 12px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', background: '#fef2f2', color: '#ef4444' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#ccc', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>No banners yet — add one to show it on the site</div>
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 12, boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  )
}
