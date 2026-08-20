'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'

// The multibuy tier editor: "buy N, save X%". A Business-only feature — the
// server enforces that too, so for anyone else this renders a short upgrade
// nudge rather than an input that would be rejected on save.

export type MultibuyTier = { qty: number; discountPct: number }

export default function MultibuyEditor({ value, onChange }: {
  value: MultibuyTier[]
  onChange: (tiers: MultibuyTier[]) => void
}) {
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null)

  useEffect(() => {
    (trpcAuthed() as any).users.me.query()
      .then((u: any) => setIsBusiness(!!(u as { isBusiness?: boolean }).isBusiness))
      .catch(() => setIsBusiness(false))
  }, [])

  if (isBusiness === null) return null

  if (!isBusiness) {
    return (
      <div style={{ marginBottom: 14 }}>
        <Label>Multibuy pricing</Label>
        <div style={{ background: '#FFF7ED', border: '1px solid #FFD4A0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#9a5b1a', lineHeight: 1.5 }}>
          🏢 Offering bulk discounts is a Business account feature.
        </div>
      </div>
    )
  }

  const add = () => onChange([...value, { qty: 2, discountPct: 10 }].slice(0, 4))
  const update = (i: number, patch: Partial<MultibuyTier>) => onChange(value.map((t, j) => j === i ? { ...t, ...patch } : t))
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))

  return (
    <div style={{ marginBottom: 14 }}>
      <Label>Multibuy pricing (optional)</Label>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888', marginBottom: 8 }}>
        Reward bulk buyers — e.g. buy 3, save 10%. Applied automatically at checkout.
      </div>

      {value.map((t, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555' }}>Buy</span>
          <input type="number" min={2} max={99} value={t.qty} onChange={e => update(i, { qty: Math.max(2, Math.min(99, Number(e.target.value) || 2)) })}
            style={{ width: 56, border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 8px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555' }}>save</span>
          <div style={{ position: 'relative', width: 72 }}>
            <input type="number" min={1} max={90} value={t.discountPct} onChange={e => update(i, { discountPct: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })}
              style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 20px 8px 8px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>%</span>
          </div>
          <button onClick={() => remove(i)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c0392b', fontSize: 16, cursor: 'pointer', padding: 4 }}>×</button>
        </div>
      ))}

      {value.length < 4 && (
        <button onClick={add} style={{ background: '#FFF3EE', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 50, padding: '7px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          + Add a tier
        </button>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>{children}</div>
}
