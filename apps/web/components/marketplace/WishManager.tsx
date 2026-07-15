'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { DEPT_LABEL } from '@/lib/listingMap'

// Manage "I'm looking for X" wishes. When a new listing matches an active wish,
// the server fires a wish_matched alert into this same Grabitt Alerts channel.
type Wish = { id: string; title: string; department: string | null; maxPrice: string | number | null; keywords: string[]; active: boolean }

const DEPTS = Object.keys(DEPT_LABEL)

export default function WishManager() {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [keywords, setKeywords] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try { setWishes(await trpcAuthed().wishlist.myWishes.query() as any) } catch { /* not signed in */ }
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (title.trim().length < 2) { alert('Give your wish a short title, e.g. "PS5 console".'); return }
    setBusy(true)
    try {
      await trpcAuthed().wishlist.createWish.mutate({
        title: title.trim(),
        department: department || undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      })
      setTitle(''); setDepartment(''); setMaxPrice(''); setKeywords(''); setOpen(false)
      await load()
    } catch { alert('Could not save your wish. Please try again.') }
    finally { setBusy(false) }
  }

  const toggle = async (w: Wish) => { await trpcAuthed().wishlist.toggleWishActive.mutate({ id: w.id }); await load() }
  const remove = async (w: Wish) => { if (!confirm(`Remove wish "${w.title}"?`)) return; await trpcAuthed().wishlist.deleteWish.mutate({ id: w.id }); await load() }

  const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid var(--sand2)', borderRadius: 10, padding: '9px 10px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }

  return (
    <div style={{ background: '#fff', margin: '10px 12px', borderRadius: 14, border: '1px solid #eee', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 20 }}>✨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>Wish alerts</div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#888' }}>Tell us what you want — we&apos;ll alert you when it&apos;s listed.</div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ background: open ? '#eee' : 'var(--orange)', color: open ? '#555' : '#fff', border: 'none', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>{open ? 'Close' : '+ New wish'}</button>
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you looking for? e.g. PS5 console" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={department} onChange={e => setDepartment(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Any category</option>
              {DEPTS.map(d => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
            </select>
            <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} type="number" min={0} placeholder="Max €" style={{ ...inputStyle, width: 100 }} />
          </div>
          <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Keywords (comma separated) — optional" style={inputStyle} />
          <button onClick={create} disabled={busy} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Create wish alert'}</button>
        </div>
      )}

      {wishes.length > 0 && (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
          {wishes.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid #f6f6f6' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: w.active ? 'var(--dark)' : '#aaa' }}>{w.title}</div>
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 10.5, color: '#999', marginTop: 1 }}>
                  {w.department ? (DEPT_LABEL[w.department] ?? w.department) : 'Any category'}
                  {w.maxPrice != null ? ` · up to €${Number(w.maxPrice).toLocaleString()}` : ''}
                  {w.keywords.length ? ` · ${w.keywords.join(', ')}` : ''}
                </div>
              </div>
              <button onClick={() => toggle(w)} style={{ background: 'transparent', border: '1.5px solid var(--sand2)', borderRadius: 8, padding: '5px 9px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#666', cursor: 'pointer' }}>{w.active ? 'Pause' : 'Resume'}</button>
              <button onClick={() => remove(w)} style={{ background: 'transparent', border: 'none', fontSize: 15, cursor: 'pointer', color: '#c00' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
