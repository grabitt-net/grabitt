'use client'
import { useEffect, useState } from 'react'
import { confirmDialog, toast } from '@/lib/ui'
import { useCrmApi } from './AdminApp'
import { DEPT_LABEL } from '@/lib/listingMap'

// Promotional discount codes. Generate codes, scope where they apply, set
// validity and usage limits, and see how many times each has been redeemed.
interface Code {
  id: string; code: string; description: string | null
  percentOff: number | null; amountOffCents: number | null
  startsAt: string | null; endsAt: string | null; active: boolean
  maxUses: number | null; usedCount: number; oncePerCustomer: boolean
  appliesTo: string[]; categories: string[]; isTest: boolean
}

const KINDS: [string, string][] = [
  ['all', 'Everything'],
  ['listing_publish', 'Item listing fee'],
  ['listing_promo', 'Featured / Grabitt NOW'],
  ['business_upgrade', 'Business upgrade / plan'],
  ['handy_place', 'Handy Help — place'],
  ['handy_unlock', 'Handy Help — unlock'],
  ['job', 'Job advert'],
  ['property', 'Property listing'],
  ['cv_unlock', 'CV unlock'],
  ['sponsorship', 'Sponsorship / banners'],
  ['directory', 'Business directory'],
]
const CAT_SLUGS = Object.keys(DEPT_LABEL).filter(s => !['jobs', 'property'].includes(s))

const EMPTY = {
  code: '', description: '', discType: 'percent' as 'percent' | 'amount', percentOff: 10, amountEuros: '',
  startsAt: '', endsAt: '', active: true, maxUses: '', oncePerCustomer: true,
  appliesTo: ['all'] as string[], categories: [] as string[], isTest: false,
}

export default function DiscountsView() {
  const api = useCrmApi()
  const [codes, setCodes] = useState<Code[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [f, setF] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const load = () => api.discountCodes().then(c => setCodes((c ?? []) as Code[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setF({ ...EMPTY }); setEditing('new') }
  const openEdit = (c: Code) => {
    setF({
      code: c.code, description: c.description ?? '',
      discType: c.percentOff != null ? 'percent' : 'amount',
      percentOff: c.percentOff ?? 10, amountEuros: c.amountOffCents != null ? String(c.amountOffCents / 100) : '',
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : '', endsAt: c.endsAt ? c.endsAt.slice(0, 10) : '',
      active: c.active, maxUses: c.maxUses != null ? String(c.maxUses) : '', oncePerCustomer: c.oncePerCustomer,
      appliesTo: c.appliesTo.length ? c.appliesTo : ['all'], categories: c.categories, isTest: c.isTest,
    })
    setEditing(c.id)
  }
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }))
  const toggleIn = (key: 'appliesTo' | 'categories', v: string) =>
    setF(p => ({ ...p, [key]: p[key].includes(v) ? p[key].filter(x => x !== v) : [...p[key], v] }))

  const save = async () => {
    setSaving(true)
    try {
      await api.upsertDiscount({
        ...(editing !== 'new' ? { id: editing } : {}),
        code: f.code.trim() || undefined,
        description: f.description.trim() || null,
        percentOff: f.discType === 'percent' ? Number(f.percentOff) || 1 : null,
        amountOffCents: f.discType === 'amount' ? Math.round((Number(f.amountEuros) || 0) * 100) || null : null,
        startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
        endsAt: f.endsAt ? new Date(f.endsAt + 'T23:59:59').toISOString() : null,
        active: f.active,
        maxUses: f.maxUses ? Number(f.maxUses) : null,
        oncePerCustomer: f.oncePerCustomer,
        appliesTo: f.appliesTo,
        categories: f.appliesTo.includes('all') || f.appliesTo.includes('listing_publish') || f.appliesTo.includes('listing_promo') ? f.categories : [],
        isTest: f.isTest,
      })
      setEditing(null); load()
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save') } finally { setSaving(false) }
  }
  const remove = async (c: Code) => {
    if (!(await confirmDialog({ message: `Delete code ${c.code}? This can't be undone.`, confirmLabel: 'Delete', danger: true }))) return
    await api.removeDiscount(c.id); load()
  }
  const copy = (code: string) => { try { navigator.clipboard.writeText(code); toast(`Copied ${code}`) } catch { /* ignore */ } }

  const discLabel = (c: Code) => c.percentOff != null ? `${c.percentOff}% off` : c.amountOffCents != null ? `€${(c.amountOffCents / 100).toFixed(2)} off` : '—'
  const showCats = f.appliesTo.includes('all') || f.appliesTo.includes('listing_publish') || f.appliesTo.includes('listing_promo')

  return (
    <div style={{ padding: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900 }}><span style={{ color: 'var(--orange)' }}>Discount</span> codes</h2>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Run promotions and generate test codes for the Stripe flow.</div>
        </div>
        <button onClick={openNew} style={btnPrimary}>+ New code</button>
      </div>

      {editing && (
        <div style={{ background: '#fff', border: '1.5px solid #d7deec', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(30,43,85,0.06)' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, marginBottom: 10 }}>{editing === 'new' ? 'New code' : 'Edit code'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            <div><L>Code (blank = auto-generate)</L><input value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="SUMMER25" style={inp} /></div>
            <div><L>Description</L><input value={f.description} onChange={e => set('description', e.target.value)} placeholder="Summer promo" style={inp} /></div>
            <div>
              <L>Discount</L>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={f.discType} onChange={e => set('discType', e.target.value as 'percent' | 'amount')} style={{ ...inp, width: 110 }}>
                  <option value="percent">% off</option><option value="amount">€ off</option>
                </select>
                {f.discType === 'percent'
                  ? <input type="number" min={1} max={100} value={f.percentOff} onChange={e => set('percentOff', Number(e.target.value))} style={inp} />
                  : <input type="number" min={0} step="0.01" value={f.amountEuros} onChange={e => set('amountEuros', e.target.value)} placeholder="5.00" style={inp} />}
              </div>
            </div>
            <div><L>Max total uses (blank = unlimited)</L><input type="number" min={1} value={f.maxUses} onChange={e => set('maxUses', e.target.value)} placeholder="∞" style={inp} /></div>
            <div><L>Starts</L><input type="date" value={f.startsAt} onChange={e => set('startsAt', e.target.value)} style={inp} /></div>
            <div><L>Ends</L><input type="date" value={f.endsAt} onChange={e => set('endsAt', e.target.value)} style={inp} /></div>
          </div>

          <L>Applies to</L>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {KINDS.map(([id, label]) => (
              <Chip key={id} on={f.appliesTo.includes(id)} onClick={() => { if (id === 'all') set('appliesTo', ['all']); else toggleIn('appliesTo', id) }}>{label}</Chip>
            ))}
          </div>

          {showCats && (
            <>
              <L>Limit to item categories (none = any category)</L>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {CAT_SLUGS.map(s => <Chip key={s} on={f.categories.includes(s)} onClick={() => toggleIn('categories', s)}>{DEPT_LABEL[s]}</Chip>)}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 6 }}>
            <Check label="One use per customer" checked={f.oncePerCustomer} onChange={v => set('oncePerCustomer', v)} />
            <Check label="Active" checked={f.active} onChange={v => set('active', v)} />
            <Check label="Test code (pre-launch)" checked={f.isTest} onChange={v => set('isTest', v)} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => setEditing(null)} style={btnGhost}>Cancel</button>
            <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : 'Save code'}</button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12.5 }}>
          <thead><tr style={{ textAlign: 'left', color: '#999', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {['Code', 'Discount', 'Applies to', 'Validity', 'Uses', 'Status', ''].map(h => <th key={h} style={{ padding: '10px 12px' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {codes.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f5f0e8' }}>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => copy(c.code)} title="Copy" style={{ background: '#eef4ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '3px 9px', fontWeight: 900, fontSize: 12.5, cursor: 'pointer', fontFamily: 'monospace' }}>{c.code}</button>
                  {c.isTest && <span style={{ marginLeft: 6, background: '#fff6e6', color: '#8a6d3b', border: '1px solid #f0e0bd', borderRadius: 50, padding: '1px 7px', fontSize: 9, fontWeight: 900 }}>TEST</span>}
                  {c.description && <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>{c.description}</div>}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#1e2b55' }}>{discLabel(c)}</td>
                <td style={{ padding: '10px 12px', color: '#666', maxWidth: 220 }}>{c.appliesTo.includes('all') || c.appliesTo.length === 0 ? 'Everything' : c.appliesTo.map(k => KINDS.find(x => x[0] === k)?.[1] ?? k).join(', ')}{c.categories.length ? ` · ${c.categories.length} cat.` : ''}</td>
                <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{c.startsAt ? new Date(c.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'now'} → {c.endsAt ? new Date(c.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '∞'}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800 }}>{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}{c.oncePerCustomer ? ' · 1pp' : ''}</td>
                <td style={{ padding: '10px 12px' }}><span style={{ background: c.active ? '#f0faf4' : '#f5f5f5', color: c.active ? '#16a34a' : '#aaa', borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 900 }}>{c.active ? 'Active' : 'Off'}</span></td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => openEdit(c)} style={mini('#eef4ff', '#2563eb')}>Edit</button>
                    <button onClick={() => remove(c)} style={mini('#fef2f2', '#ef4444')}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>No codes yet — create one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function L({ children }: { children: React.ReactNode }) { return <label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: '#888', margin: '8px 0 3px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</label> }
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ border: on ? '1.5px solid var(--orange)' : '1.5px solid #e2ddd3', background: on ? '#FFF3EE' : '#fff', color: on ? 'var(--orange)' : '#8a8378', borderRadius: 50, padding: '5px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>{on ? '✓ ' : ''}{children}</button>
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555', cursor: 'pointer' }}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {label}</label>
}
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', background: '#fff' }
const btnPrimary: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const mini = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-ui)' })
