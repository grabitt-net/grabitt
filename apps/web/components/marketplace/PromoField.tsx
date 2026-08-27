'use client'
import { useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'

// A discount-code field with an explicit Apply button: it validates the code
// against the given checkout (kind + amount) and reports the result to the
// parent so the shown total can update BEFORE the customer proceeds. The parent
// only sends the code to checkout once it's applied.
const euro = (c: number) => `€${(c / 100).toFixed(2)}`

export default function PromoField({ kind, category, amountCents, onApplied }: {
  kind: string
  category?: string | null
  amountCents: number
  onApplied: (applied: { code: string; discountCents: number } | null) => void
}) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'applied' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const apply = async () => {
    const c = code.trim().toUpperCase()
    if (!c) return
    setState('checking'); setMsg('')
    try {
      const res = await trpcAuthed().discounts.validate.query({ code: c, kind, category: category ?? undefined, amountCents }) as
        { valid: boolean; reason?: string; discountCents?: number; finalCents?: number }
      if (res.valid) {
        setState('applied'); setMsg(`✓ Applied — ${euro(res.discountCents ?? 0)} off · new total ${euro(res.finalCents ?? amountCents)}`)
        onApplied({ code: c, discountCents: res.discountCents ?? 0 })
      } else {
        setState('error'); setMsg(res.reason ?? 'That code isn’t valid'); onApplied(null)
      }
    } catch {
      setState('error'); setMsg('Could not check that code'); onApplied(null)
    }
  }
  const clear = () => { setCode(''); setState('idle'); setMsg(''); onApplied(null) }

  const applied = state === 'applied'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); if (state !== 'idle') { setState('idle'); setMsg(''); onApplied(null) } }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply() } }}
          placeholder="Discount code (optional)"
          disabled={applied}
          style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', border: `1.5px solid ${applied ? '#bbf7d0' : '#e0d8d0'}`, borderRadius: 12, padding: '11px 13px', fontFamily: 'var(--font-ui)', fontSize: 13.5, letterSpacing: 1, textTransform: 'uppercase', outline: 'none', background: applied ? '#f0faf4' : '#fff' }}
        />
        {applied
          ? <button type="button" onClick={clear} style={{ flexShrink: 0, background: '#fff', color: '#888', border: '1.5px solid #e5e5e5', borderRadius: 12, padding: '0 16px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Remove</button>
          : <button type="button" onClick={apply} disabled={state === 'checking' || !code.trim()} style={{ flexShrink: 0, background: !code.trim() ? '#e5e7eb' : 'var(--orange)', color: !code.trim() ? '#999' : '#fff', border: 'none', borderRadius: 12, padding: '0 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: code.trim() ? 'pointer' : 'default' }}>{state === 'checking' ? '…' : 'Apply'}</button>}
      </div>
      {msg && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, color: applied ? '#16a34a' : '#ef4444', marginTop: 5 }}>{msg}</div>}
    </div>
  )
}
