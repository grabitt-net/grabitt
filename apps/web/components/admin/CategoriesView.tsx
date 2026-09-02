'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'
import { confirmDialog, toast } from '@/lib/ui'
import ImageUploadField from './ImageUploadField'
import { DEPT_LABEL } from '@/lib/listingMap'

// Manage the marketplace categories (the homepage tiles + category pages):
// add / amend / delete, reorder, show-hide, set the round icon and the header
// background image. Deleting a category moves its ads to another category.
type Cat = { id: string; name: string; department: string | null; img: string | null; bgImage: string | null; enabled: boolean; sortOrder: number }

const DEPT_OPTIONS = Object.entries(DEPT_LABEL) as [string, string][]

export default function CategoriesView() {
  const api = useCrmApi()
  const [rows, setRows] = useState<Cat[]>([])
  const [editing, setEditing] = useState<Cat | 'new' | null>(null)

  const load = () => api.homeCategories().then(r => setRows((r ?? []) as Cat[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistOrder = async (list: Cat[]) => {
    setRows(list)
    await api.saveHomeCategories(list.map((c, i) => ({ name: c.name, enabled: c.enabled, sortOrder: i }))).catch(() => {})
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const list = [...rows];[list[i], list[j]] = [list[j], list[i]]; persistOrder(list)
  }
  const toggle = (c: Cat) => persistOrder(rows.map(r => r.id === c.id ? { ...r, enabled: !r.enabled } : r))

  const del = async (c: Cat) => {
    const others = rows.filter(r => r.id !== c.id)
    // Ask where to move any ads currently in this category.
    const moveTo = await pickMoveTarget(c, others)
    if (moveTo === null) return
    try { await api.deleteCategory(c.id, moveTo); toast('Category deleted — ads moved.'); load() }
    catch (e: any) { toast(e?.message ?? 'Could not delete') }
  }

  return (
    <div style={{ padding: 20, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Categories</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Add, amend, reorder or delete the marketplace categories. Set each one’s icon and its page-header background.</div>
        </div>
        <button onClick={() => setEditing('new')} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '9px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Add category</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 10, opacity: c.enabled ? 1 : 0.55 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={arrow}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} style={arrow}>▼</button>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#f5f0e8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {c.img ? <img src={c.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏷️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, color: '#1a1a1a' }}>{c.name}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#999' }}>{c.department ?? '—'}{c.bgImage ? ' · bg ✓' : ''}</div>
            </div>
            <button onClick={() => toggle(c)} style={{ ...pill, background: c.enabled ? '#f0faf4' : '#fef2f2', color: c.enabled ? '#16a34a' : '#ef4444' }}>{c.enabled ? '● On' : '○ Off'}</button>
            <button onClick={() => setEditing(c)} style={{ ...pill, background: '#eef2f8', color: '#1e2b55' }}>Edit</button>
            <button onClick={() => del(c)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Delete</button>
          </div>
        ))}
      </div>

      {editing && <EditModal cat={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} api={api} />}
    </div>
  )
}

function EditModal({ cat, onClose, onSaved, api }: { cat: Cat | null; onClose: () => void; onSaved: () => void; api: ReturnType<typeof useCrmApi> }) {
  const [name, setName] = useState(cat?.name ?? '')
  const [department, setDepartment] = useState(cat?.department ?? '')
  const [img, setImg] = useState(cat?.img ?? '')
  const [bgImage, setBgImage] = useState(cat?.bgImage ?? '')
  const [enabled, setEnabled] = useState(cat?.enabled ?? true)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim() || !department) { toast('Name and department are required.'); return }
    setBusy(true)
    try {
      await api.upsertCategory({ ...(cat ? { id: cat.id } : {}), name: name.trim(), department, img: img || null, bgImage: bgImage || null, enabled })
      onSaved()
    } catch (e: any) { toast(e?.message ?? 'Could not save'); setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99997, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 460 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 900, color: '#1a1a1a', marginBottom: 12 }}>{cat ? 'Edit category' : 'Add category'}</div>
        <L>Name (shown on the tile)</L>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Home & Garden" style={inp} />
        <L>Department (maps ads + the /category page)</L>
        <select value={department} onChange={e => setDepartment(e.target.value)} style={inp}>
          <option value="">Choose a department…</option>
          {DEPT_OPTIONS.map(([slug, label]) => <option key={slug} value={slug}>{label} ({slug})</option>)}
        </select>
        <div style={{ marginTop: 10 }}><ImageUploadField label="Round tile icon" kind="category" value={img} onChange={setImg} /></div>
        <div style={{ marginTop: 10 }}><ImageUploadField label="Header background image (shown faded behind the category header text & icon)" kind="category" value={bgImage} onChange={setBgImage} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer' }}>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Show on the homepage
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ flex: 2, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Saving…' : 'Save category'}</button>
        </div>
      </div>
    </div>
  )
}

// Ask which category to move ads into before deleting. Uses a simple prompt-like
// confirm flow via window.prompt for the target department.
async function pickMoveTarget(cat: Cat, others: Cat[]): Promise<string | null> {
  if (others.length === 0) { toast('Add another category first — ads need somewhere to go.'); return null }
  const list = others.filter(o => o.department).map(o => `${o.department} — ${o.name}`).join('\n')
  const ok = await confirmDialog({ message: `Delete “${cat.name}”?\n\nAny ads in it will be MOVED to the category you pick next. Categories:\n${list}`, confirmLabel: 'Choose destination', danger: true })
  if (!ok) return null
  const answer = window.prompt(`Move ads to which department? Type one of:\n${others.filter(o => o.department).map(o => o.department).join(', ')}`, others.find(o => o.id !== cat.id && o.department)?.department ?? '')
  const dep = (answer ?? '').trim()
  if (!dep) return null
  if (!others.some(o => o.department === dep)) { toast('That department isn’t in the list.'); return null }
  return dep
}

const arrow: React.CSSProperties = { background: '#f0ece5', border: 'none', borderRadius: 5, width: 22, height: 16, fontSize: 8, cursor: 'pointer', color: '#666', lineHeight: 1 }
const pill: React.CSSProperties = { border: 'none', borderRadius: 50, padding: '6px 11px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontFamily: 'var(--font-ui)', fontSize: 13, boxSizing: 'border-box', marginBottom: 2 }
function L({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#666', margin: '10px 0 4px' }}>{children}</div>
}
