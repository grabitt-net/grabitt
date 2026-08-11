'use client'
import { useEffect, useState } from 'react'
import { confirmDialog } from '@/lib/ui'
import { useCrmApi } from './AdminApp'

// Sponsorship & advertising admin: set the monthly base price for each placement
// (businesses buy them one-off for a chosen number of months through the basket)
// and see who currently holds a live placement.
interface Item { id: string; label: string; icon: string; blurb: string; comingSoon: boolean; monthlyCents: number; active: boolean }
interface Grant { id: string; addonId: string; months: number; amountCents: number; startsAt: string; endsAt: string; user: { displayName?: string; email?: string; businessName?: string } }
const eur = (c: number) => `€${(c / 100).toFixed(2)}`

export default function SponsorshipView() {
  const api = useCrmApi()
  const [items, setItems] = useState<Item[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    api.sponsorshipCatalog().then(c => setItems((c ?? []) as Item[])).catch(() => {})
    api.sponsorshipGrants().then(g => setGrants((g ?? []) as Grant[])).catch(() => {})
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setItem = (id: string, patch: Partial<Item>) => { setItems(list => list.map(i => i.id === id ? { ...i, ...patch } : i)); setDirty(true); setMsg('') }

  const save = async () => {
    setSaving(true)
    try {
      const addons = Object.fromEntries(items.map(i => [i.id, { monthlyCents: i.monthlyCents, active: i.active }]))
      await api.saveSponsorship(addons); setDirty(false); setMsg('✓ Saved — prices are live.')
    } catch (e: any) { setMsg(e?.message ?? 'Save failed') } finally { setSaving(false) }
  }

  const cancel = async (id: string) => { if (await confirmDialog({ message: 'Cancel this live sponsorship?', confirmLabel: 'Cancel sponsorship', danger: true })) { await api.cancelSponsorship(id); load() } }

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Sponsorship &amp; advertising</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Set the monthly base price for each placement. Businesses buy them one-off, per month, from the For Business page.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: msg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{msg}</span>}
          <button onClick={save} disabled={saving || !dirty} style={{ ...btnPrimary, opacity: dirty ? 1 : 0.5 }}>{saving ? 'Saving…' : dirty ? 'Save prices' : 'Saved ✓'}</button>
        </div>
      </div>

      {/* Prices */}
      <div style={{ marginTop: 16 }}>
        {items.map(i => (
          <div key={i.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '11px 13px', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>{i.icon}</span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{i.label}{i.comingSoon && <span style={{ marginLeft: 6, background: '#eef2ff', color: '#4f46e5', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 50, textTransform: 'uppercase' }}>Coming soon</span>}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{i.blurb}</div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#888' }}>
              €/month
              <input type="number" step="0.01" value={(i.monthlyCents / 100).toString()} onChange={e => setItem(i.id, { monthlyCents: Math.round(Number(e.target.value) * 100) })} style={inp} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555' }}>
              <input type="checkbox" checked={i.active} onChange={e => setItem(i.id, { active: e.target.checked })} /> Available
            </label>
          </div>
        ))}
      </div>

      {/* Live placements */}
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', margin: '20px 0 8px' }}>Live placements ({grants.length})</div>
      {grants.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: '16px 0', textAlign: 'center' }}>No active sponsorships.</div>}
      {grants.map(g => {
        const item = items.find(i => i.id === g.addonId)
        return (
          <div key={g.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '10px 13px', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{item?.icon ?? '📢'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{item?.label ?? g.addonId} · {g.user.businessName ?? g.user.displayName ?? g.user.email}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{g.months} mth · {eur(g.amountCents)} · until {new Date(g.endsAt).toLocaleDateString('en-GB')}</div>
            </div>
            <button onClick={() => cancel(g.id)} style={{ ...btnGhost, color: '#ef4444' }}>Cancel</button>
          </div>
        )
      })}
    </div>
  )
}

const inp: React.CSSProperties = { border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '6px 8px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', background: '#fff', width: 90, marginTop: 3 }
const btnPrimary: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '7px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
