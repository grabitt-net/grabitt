'use client'
import { useEffect, useMemo, useState } from 'react'
import { confirmDialog } from '@/lib/ui'
import { useCrmApi } from './AdminApp'
import { HELP_CATEGORIES, helpCategory } from '@/lib/helpContent'

interface Article {
  id: string; category: string; question: string; answer: string
  sortOrder: number; active: boolean
}

const EMPTY = { category: HELP_CATEGORIES[0]?.id ?? 'getting-started', question: '', answer: '', sortOrder: 0, active: true }

// Help Centre editor — add / edit / remove / reorder the Q&A articles that power
// the public /help page and the AI assistant. Grouped by category.
export default function HelpView() {
  const api = useCrmApi()
  const [articles, setArticles] = useState<Article[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => api.helpArticles().then(a => setArticles((a ?? []) as Article[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const order = HELP_CATEGORIES.map(c => c.id)
    const byCat = new Map<string, Article[]>()
    for (const a of articles) { const arr = byCat.get(a.category) ?? []; arr.push(a); byCat.set(a.category, arr) }
    return Array.from(byCat.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  }, [articles])

  function openNew(category?: string) { setForm({ ...EMPTY, category: category ?? EMPTY.category, sortOrder: articles.filter(a => a.category === (category ?? EMPTY.category)).length }); setEditing('new') }
  function openEdit(a: Article) { setForm({ category: a.category, question: a.question, answer: a.answer, sortOrder: a.sortOrder, active: a.active }); setEditing(a.id) }

  async function save() {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaving(true)
    try {
      await api.upsertHelpArticle({
        ...(editing !== 'new' ? { id: editing } : {}),
        category: form.category, question: form.question.trim(), answer: form.answer.trim(),
        sortOrder: Number(form.sortOrder) || 0, active: form.active,
      })
      setEditing(null); load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!(await confirmDialog({ message: 'Delete this help article? This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return
    await api.removeHelpArticle(id); load()
  }

  async function toggleActive(a: Article) {
    await api.upsertHelpArticle({ id: a.id, category: a.category, question: a.question, answer: a.answer, sortOrder: a.sortOrder, active: !a.active })
    load()
  }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Help Centre</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Articles shown on the public Help Centre and used by the AI assistant.</div>
        </div>
        <button onClick={() => openNew()} style={btnPrimary}>+ New article</button>
      </div>

      {editing && (
        <div style={{ background: '#FFF9F5', border: '1.5px solid #FFD9C2', borderRadius: 12, padding: 16, margin: '14px 0' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 10 }}>{editing === 'new' ? 'New article' : 'Edit article'}</div>
          <label style={lbl}>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
            {HELP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
          </select>
          <label style={lbl}>Question</label>
          <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. How do I get a refund?" style={inp} />
          <label style={lbl}>Answer</label>
          <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="A short, plain-text answer." style={{ ...inp, minHeight: 90, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              <label style={lbl}>Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} style={{ ...inp, width: 80 }} />
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555', marginTop: 18 }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Visible on site
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={save} disabled={saving || !form.question.trim() || !form.answer.trim()} style={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} style={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {grouped.map(([cat, items]) => {
        const meta = helpCategory(cat)
        return (
          <div key={cat} style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>{meta.icon} {meta.title} <span style={{ color: '#bbb', fontWeight: 700 }}>· {items.length}</span></div>
              <button onClick={() => openNew(cat)} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>+ Add here</button>
            </div>
            {items.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '10px 12px', marginBottom: 6, opacity: a.active ? 1 : 0.55 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{a.question}{!a.active && <span style={{ marginLeft: 8, background: '#f0f0f0', color: '#999', fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 50, textTransform: 'uppercase' }}>Hidden</span>}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#777', marginTop: 3, lineHeight: 1.5 }}>{a.answer}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(a)} title={a.active ? 'Hide' : 'Show'} style={iconBtn}>{a.active ? '🙈' : '👁️'}</button>
                  <button onClick={() => openEdit(a)} title="Edit" style={iconBtn}>✏️</button>
                  <button onClick={() => remove(a.id)} title="Delete" style={{ ...iconBtn, color: '#ef4444' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
      {articles.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: '30px 0', textAlign: 'center' }}>No help articles yet. Add your first one.</div>}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#888', margin: '8px 0 4px' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', background: '#fff' }
const btnPrimary: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const iconBtn: React.CSSProperties = { background: '#f7f4ee', border: '1px solid #eee', borderRadius: 8, padding: '5px 8px', fontSize: 13, cursor: 'pointer' }
