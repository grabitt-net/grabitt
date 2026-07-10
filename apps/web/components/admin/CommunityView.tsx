'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'
import ImageUploadField from './ImageUploadField'

interface Post {
  id: string; title: string; excerpt: string; body: string; category: string
  emoji: string; imageUrl: string | null; published: boolean; sortOrder: number
}

const CATEGORIES = ['Guide', 'Island Tips', 'Economy', 'Selling', 'Safety', 'News']
const EMOJIS = ['📰', '🏷️', '📊', '🛡️', '💼', '🌴', '💡', '🛒', '📈', '✨']
const EMPTY = { title: '', excerpt: '', body: '', category: 'Guide', emoji: '📰', imageUrl: '', published: true, sortOrder: 0 }

export default function CommunityView() {
  const api = useCrmApi()
  const [posts, setPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => api.communityPosts().then(p => setPosts((p ?? []) as Post[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() { setForm({ ...EMPTY, sortOrder: posts.length + 1 }); setEditing('new') }
  function openEdit(p: Post) {
    setForm({ title: p.title, excerpt: p.excerpt, body: p.body, category: p.category, emoji: p.emoji, imageUrl: p.imageUrl ?? '', published: p.published, sortOrder: p.sortOrder })
    setEditing(p.id)
  }

  async function save() {
    if (!form.title.trim() || !form.excerpt.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      await api.upsertCommunityPost({
        ...(editing !== 'new' ? { id: editing } : {}),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body.trim(),
        category: form.category,
        emoji: form.emoji,
        imageUrl: form.imageUrl.trim() || null,
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
      })
      setEditing(null); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function togglePublished(p: Post) {
    await api.upsertCommunityPost({ id: p.id, title: p.title, excerpt: p.excerpt, body: p.body, category: p.category, emoji: p.emoji, imageUrl: p.imageUrl, published: !p.published, sortOrder: p.sortOrder })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this guide? This cannot be undone.')) return
    await api.removeCommunityPost(id); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#FF4500' }}>Grabitt Guides</span> — community content</h2>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Published guides appear on the homepage and at /community.</div>
        </div>
        <button onClick={openNew} style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ New Guide</button>
      </div>

      {editing && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 12 }}>{editing === 'new' ? 'New guide' : 'Edit guide'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
            <div style={{ gridColumn: '1/-1' }}><Field label="Title">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} />
            </Field></div>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Icon">
              <select value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} style={inp}>
                {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: '1/-1' }}><Field label="Excerpt (teaser shown on the card)">
              <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
            </Field></div>
            <div style={{ gridColumn: '1/-1' }}><Field label="Body (full article)">
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={8} style={{ ...inp, resize: 'vertical' }} />
            </Field></div>
            <div style={{ gridColumn: '1/-1' }}>
              <ImageUploadField label="Cover image (optional)" kind="banner" value={form.imageUrl} onChange={url => setForm(f => ({ ...f, imageUrl: url }))} />
            </div>
            <Field label="Sort order"><input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} style={inp} /></Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} /> Published (visible on the site)
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => setEditing(null)} style={{ padding: '7px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title || !form.excerpt || !form.body} style={{ padding: '7px 18px', borderRadius: 50, border: 'none', background: '#FF4500', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving || !form.title || !form.excerpt || !form.body ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save guide'}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {posts.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `4px solid ${p.published ? '#FF4500' : '#e5e7eb'}` }}>
            <div style={{ height: 90, background: p.imageUrl ? undefined : 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40 }}>{p.emoji}</span>}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 10, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.category}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, marginTop: 2, marginBottom: 8 }}>{p.title}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(p)} style={{ padding: '5px 12px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', background: '#f3f4f6', color: '#555' }}>Edit</button>
                <button onClick={() => togglePublished(p)} style={{ flex: 1, padding: '5px 10px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', background: p.published ? '#f0faf4' : '#f5f5f5', color: p.published ? '#16a34a' : '#aaa' }}>{p.published ? '● Live' : '○ Draft'}</button>
                <button onClick={() => remove(p.id)} style={{ padding: '5px 12px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', background: '#fef2f2', color: '#ef4444' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#ccc', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>No guides yet — add one to show it on the site</div>
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
