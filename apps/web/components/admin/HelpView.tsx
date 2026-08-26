'use client'
import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/marketplace/Icon'
import { confirmDialog } from '@/lib/ui'
import { useCrmApi } from './AdminApp'
import { HELP_CATEGORIES, helpCategory } from '@/lib/helpContent'

interface Article {
  id: string; category: string; question: string; answer: string
  sortOrder: number; active: boolean; helpfulYes?: number; helpfulNo?: number
}
interface Category { id: string; slug: string; title: string; blurb: string; icon: string; sortOrder: number; active: boolean }

const EMPTY = { category: HELP_CATEGORIES[0]?.id ?? 'getting-started', question: '', answer: '', sortOrder: 0, active: true }
const EMPTY_CAT = { slug: '', title: '', blurb: '', icon: '📄', sortOrder: 0, active: true }

// Help Centre editor — add / edit / remove / reorder the Q&A articles that power
// the public /help page and the AI assistant. Grouped by category.
export default function HelpView() {
  const api = useCrmApi()
  const [articles, setArticles] = useState<Article[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => api.helpArticles().then(a => setArticles((a ?? []) as Article[])).catch(() => {})
  const loadCats = () => api.helpCategories().then(c => setCats((c ?? []) as Category[])).catch(() => {})
  useEffect(() => { load(); loadCats() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Category options for the dropdown — DB categories, falling back to built-ins.
  const catOpts = cats.length ? cats.map(c => ({ id: c.slug, icon: c.icon, title: c.title })) : HELP_CATEGORIES

  const grouped = useMemo(() => {
    const order = cats.length ? cats.map(c => c.slug) : HELP_CATEGORIES.map(c => c.id)
    const byCat = new Map<string, Article[]>()
    for (const a of articles) { const arr = byCat.get(a.category) ?? []; arr.push(a); byCat.set(a.category, arr) }
    return Array.from(byCat.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  }, [articles, cats])

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

  // ── Categories ──
  const [catEditing, setCatEditing] = useState<string | 'new' | null>(null)
  const [catForm, setCatForm] = useState({ ...EMPTY_CAT })
  const [catSaving, setCatSaving] = useState(false)
  function openCatNew() { setCatForm({ ...EMPTY_CAT, sortOrder: cats.length }); setCatEditing('new') }
  function openCatEdit(c: Category) { setCatForm({ slug: c.slug, title: c.title, blurb: c.blurb, icon: c.icon, sortOrder: c.sortOrder, active: c.active }); setCatEditing(c.id) }
  async function saveCat() {
    if (!catForm.slug.trim() || !catForm.title.trim()) return
    setCatSaving(true)
    try {
      await api.upsertHelpCategory({ ...(catEditing !== 'new' ? { id: catEditing } : {}), slug: catForm.slug.trim(), title: catForm.title.trim(), blurb: catForm.blurb.trim(), icon: catForm.icon.trim() || '📄', sortOrder: Number(catForm.sortOrder) || 0, active: catForm.active })
      setCatEditing(null); loadCats()
    } finally { setCatSaving(false) }
  }
  async function removeCat(c: Category) {
    const n = articles.filter(a => a.category === c.slug).length
    if (!(await confirmDialog({ message: n > 0 ? `“${c.title}” has ${n} article${n === 1 ? '' : 's'} — they’ll be left without a category. Delete anyway?` : `Delete the “${c.title}” category?`, confirmLabel: 'Delete', danger: true }))) return
    await api.removeHelpCategory(c.id); loadCats()
  }

  return (
    <div style={{ padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Help Centre</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Articles shown on the public Help Centre and used by the AI assistant.</div>
        </div>
        <button onClick={() => openNew()} style={btnPrimary}>+ New article</button>
      </div>

      {/* ── Categories (helpdesk sections) ── */}
      <div style={{ background: '#f7f9fc', border: '1px solid #e3e9f2', borderRadius: 12, padding: 14, margin: '14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1e2b55' }}>Categories <span style={{ color: '#aaa', fontWeight: 700 }}>· {cats.length}</span></div>
          <button onClick={openCatNew} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>+ New category</button>
        </div>
        {catEditing && (
          <div style={{ background: '#fff', border: '1.5px solid #d7deec', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '8px 10px' }}>
              <span><label style={lbl}>Icon</label><input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} style={{ ...inp, textAlign: 'center' }} /></span>
              <span><label style={lbl}>Title</label><input value={catForm.title} onChange={e => setCatForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Payments & escrow" style={inp} /></span>
              <span style={{ gridColumn: '1/-1' }}><label style={lbl}>Slug (used in links; lowercase-hyphenated)</label><input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="payments" style={inp} disabled={catEditing !== 'new'} /></span>
              <span style={{ gridColumn: '1/-1' }}><label style={lbl}>Blurb</label><input value={catForm.blurb} onChange={e => setCatForm(f => ({ ...f, blurb: e.target.value }))} placeholder="Secure payments and refunds." style={inp} /></span>
              <span><label style={lbl}>Order</label><input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} style={{ ...inp, width: 80 }} /></span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555', marginTop: 18 }}><input type="checkbox" checked={catForm.active} onChange={e => setCatForm(f => ({ ...f, active: e.target.checked }))} /> Visible</label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={saveCat} disabled={catSaving || !catForm.slug.trim() || !catForm.title.trim()} style={btnPrimary}>{catSaving ? 'Saving…' : 'Save category'}</button>
              <button onClick={() => setCatEditing(null)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cats.map(c => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #d7deec', borderRadius: 999, padding: '5px 6px 5px 11px', opacity: c.active ? 1 : 0.5 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#1e2b55' }}>{c.icon} {c.title}</span>
              <button onClick={() => openCatEdit(c)} title="Edit" style={{ ...iconBtn, padding: '3px 6px' }}><Icon name="pencil" size={12} strokeWidth={2} /></button>
              <button onClick={() => removeCat(c)} title="Delete" style={{ ...iconBtn, padding: '3px 6px', color: '#ef4444' }}><Icon name="trash" size={12} strokeWidth={2} /></button>
            </span>
          ))}
        </div>
      </div>

      {editing && (
        <div style={{ background: '#FFF9F5', border: '1.5px solid #FFD9C2', borderRadius: 12, padding: 16, margin: '14px 0' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 10 }}>{editing === 'new' ? 'New article' : 'Edit article'}</div>
          <label style={lbl}>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
            {catOpts.map(c => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
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
        const meta = cats.find(c => c.slug === cat) ?? helpCategory(cat)
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
                  {((a.helpfulYes ?? 0) + (a.helpfulNo ?? 0)) > 0 && (
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#999', marginTop: 5 }}>
                      👍 {a.helpfulYes ?? 0} · 👎 {a.helpfulNo ?? 0}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(a)} title={a.active ? 'Hide' : 'Show'} style={iconBtn}>{a.active ? '🙈' : '👁️'}</button>
                  <button onClick={() => openEdit(a)} title="Edit" style={iconBtn}><Icon name="pencil" size={15} strokeWidth={2} /></button>
                  <button onClick={() => remove(a.id)} title="Delete" style={{ ...iconBtn, color: '#ef4444' }}><Icon name="trash" size={15} strokeWidth={2} /></button>
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
