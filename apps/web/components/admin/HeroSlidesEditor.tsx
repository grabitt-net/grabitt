'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'
import ImageUploadField from './ImageUploadField'

type Slide = { id: string; heading: string; subheading: string | null; imageUrl: string; linkUrl: string | null; active: boolean; sortOrder: number }
const EMPTY = { heading: '', subheading: '', imageUrl: '', linkUrl: '', active: true }

// Inline editor for the parallax hero slider — add/edit/remove/reorder slides.
export default function HeroSlidesEditor() {
  const api = useCrmApi()
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // slide id or 'new'
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => api.heroSlides()
    .then(d => setSlides(((d ?? []) as Slide[]).sort((a, b) => a.sortOrder - b.sortOrder)))
    .catch(() => setSlides([]))
    .finally(() => setLoading(false))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = () => { setForm({ ...EMPTY }); setEditing('new') }
  const startEdit = (s: Slide) => { setForm({ heading: s.heading, subheading: s.subheading ?? '', imageUrl: s.imageUrl, linkUrl: s.linkUrl ?? '', active: s.active }); setEditing(s.id) }

  const save = async () => {
    if (!form.heading.trim() || !form.imageUrl.trim()) return
    setSaving(true)
    try {
      const sortOrder = editing === 'new' ? slides.length : (slides.find(s => s.id === editing)?.sortOrder ?? 0)
      await api.upsertHeroSlide({
        ...(editing !== 'new' ? { id: editing } : {}),
        heading: form.heading.trim(),
        subheading: form.subheading.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim() || undefined,
        active: form.active,
        sortOrder,
      })
      setEditing(null); await load()
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => { await api.removeHeroSlide(id); load() }
  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    const a = slides[i], b = slides[j]
    await api.upsertHeroSlide({ id: a.id, heading: a.heading, imageUrl: a.imageUrl, subheading: a.subheading ?? undefined, linkUrl: a.linkUrl ?? undefined, active: a.active, sortOrder: b.sortOrder })
    await api.upsertHeroSlide({ id: b.id, heading: b.heading, imageUrl: b.imageUrl, subheading: b.subheading ?? undefined, linkUrl: b.linkUrl ?? undefined, active: b.active, sortOrder: a.sortOrder })
    load()
  }

  return (
    <div style={{ background: '#faf7f3', border: '1px solid #ece3d7', borderRadius: 12, padding: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: 'var(--dark)' }}>Hero slides <span style={{ color: '#aaa', fontWeight: 600 }}>· rotate automatically</span></div>
        {editing === null && <button onClick={startNew} style={btn('#FF4500', '#fff')}>+ Add slide</button>}
      </div>

      {editing !== null ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <Field label="Heading"><input value={form.heading} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))} style={inp} placeholder="Gran Canaria's local marketplace" /></Field>
          <Field label="Subheading"><input value={form.subheading} onChange={e => setForm(f => ({ ...f, subheading: e.target.value }))} style={inp} placeholder="Buy & sell locally — safely." /></Field>
          <ImageUploadField label="Image" kind="hero" hint="Wide landscape works best." value={form.imageUrl} onChange={url => setForm(f => ({ ...f, imageUrl: url }))} />
          <Field label="Link URL (optional)"><input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} style={inp} placeholder="/listings or https://…" /></Field>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Show this slide
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(null)} style={btn('#fff', '#555', '#e5e7eb')}>Cancel</button>
            <button onClick={save} disabled={saving || !form.heading || !form.imageUrl} style={btn('#16a34a', '#fff')}>{saving ? 'Saving…' : 'Save slide'}</button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#aaa', padding: 10 }}>Loading…</div>
      ) : slides.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#999', padding: 10 }}>No slides yet — add one to show the parallax hero.</div>
      ) : (
        slides.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid #ece3d7', borderRadius: 10, padding: 8, marginBottom: 6, opacity: s.active ? 1 : 0.55 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={arrow(i === 0)}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} style={arrow(i === slides.length - 1)}>▼</button>
            </div>
            <div style={{ width: 64, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f0ebe4' }}>
              <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.heading}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa' }}>{s.active ? 'Visible' : 'Hidden'}</div>
            </div>
            <button onClick={() => startEdit(s)} style={btn('#fff', '#FF4500', '#FF4500')}>Edit</button>
            <button onClick={() => remove(s.id)} style={btn('#fef2f2', '#ef4444', '#fecaca')}>Delete</button>
          </div>
        ))
      )}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 12.5, boxSizing: 'border-box' }
const btn = (bg: string, color: string, border?: string): React.CSSProperties => ({ background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: 50, padding: '6px 12px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' })
const arrow = (disabled: boolean): React.CSSProperties => ({ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ddd' : '#FF4500', fontSize: 10, lineHeight: 1, padding: 1 })
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</label>{children}</div>
}
