'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Affiliate programme admin: choose what an affiliate earns per signup — cash OR
// points — per tier, schedule date-scoped campaigns that override the base (e.g.
// "€1 per signup for these dates"), watch the founding cohort, and pay cash
// earnings (off-platform or via Stripe Connect).
interface Aff { id: string; name?: string; email?: string; tier: string | null; code: string | null; hasPayoutAccount: boolean; signups: number; owedCents: number; paidCents: number; pointsEarned: number }
interface Campaign { name?: string; from?: string; to?: string; tier: 'all' | 'founding' | 'standard'; kind: 'cash' | 'points'; amount: number }
interface Cfg { foundingKind: 'cash' | 'points'; foundingAmount: number; standardKind: 'cash' | 'points'; standardAmount: number; foundingCap: number; campaigns: Campaign[] }
const eur = (c: number) => `€${(c / 100).toFixed(2)}`
// Amount is stored in cents when cash, whole points when points.
const amtToInput = (kind: string, amount: number) => kind === 'cash' ? (amount / 100).toString() : String(amount)
const inputToAmt = (kind: string, v: string) => kind === 'cash' ? Math.round(Number(v) * 100) : Math.round(Number(v))
const rewardLabel = (kind: string, amount: number) => kind === 'cash' ? `${eur(amount)} cash` : `${amount} points`

export default function AffiliatesView() {
  const api = useCrmApi()
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [offer, setOffer] = useState<any>(null)
  const [founding, setFounding] = useState<{ count: number; cap: number; remaining: number } | null>(null)
  const [list, setList] = useState<Aff[]>([])
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    api.affiliateConfig().then((c: any) => setCfg({ foundingKind: c.foundingKind, foundingAmount: c.foundingAmount, standardKind: c.standardKind, standardAmount: c.standardAmount, foundingCap: c.foundingCap, campaigns: Array.isArray(c.campaigns) ? c.campaigns : [] })).catch(() => {})
    api.affiliateCurrentOffer().then(setOffer).catch(() => {})
    api.affiliateFoundingStatus().then(setFounding).catch(() => {})
    api.affiliates().then(a => setList((a ?? []) as Aff[])).catch(() => {})
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCfg = async () => {
    if (!cfg) return
    setSaving(true)
    try { await api.saveAffiliateConfig(cfg as any); load() } finally { setSaving(false) }
  }
  const setC = (patch: Partial<Cfg>) => setCfg(c => c ? { ...c, ...patch } : c)
  const addCampaign = () => setCfg(c => c ? { ...c, campaigns: [...c.campaigns, { name: 'Promo', tier: 'all', kind: 'cash', amount: 100 }] } : c)
  const setCamp = (i: number, patch: Partial<Campaign>) => setCfg(c => c ? { ...c, campaigns: c.campaigns.map((x, j) => j === i ? { ...x, ...patch } : x) } : c)
  const delCamp = (i: number) => setCfg(c => c ? { ...c, campaigns: c.campaigns.filter((_, j) => j !== i) } : c)

  const pay = async (id: string, viaStripe: boolean) => {
    setBusy(id)
    try { const r = await api.payOutAffiliate(id, viaStripe); alert(`Paid ${eur(r.amountCents)}${viaStripe ? ' via Stripe' : ' (recorded)'}.`); load() }
    catch (e: any) { alert(e?.message ?? 'Payout failed') }
    finally { setBusy(null) }
  }

  return (
    <div style={{ padding: 20, maxWidth: 960 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Affiliates</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 14 }}>Choose what affiliates earn per signup — cash or points — and schedule promotions.</div>

      {founding && (
        <div style={{ background: 'linear-gradient(135deg,#FFF3EE,#FFE4D6)', border: '1px solid #FFD4A0', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 26 }}>⭐</div>
          <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: '#8a5a2a' }}>{founding.count} / {founding.cap}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#8a5a2a' }}>Founding members claimed</div></div>
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: founding.remaining > 0 ? '#16a34a' : '#ef4444' }}>{founding.remaining} slots remaining</div>
        </div>
      )}

      {cfg && (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a' }}>What affiliates earn per signup</div>
            {offer && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#16a34a', fontWeight: 800 }}>Now offering — Founding: {rewardLabel(offer.founding.kind, offer.founding.amount)} · Standard: {rewardLabel(offer.standard.kind, offer.standard.amount)}</div>}
          </div>

          {/* Per-tier base reward */}
          {(['founding', 'standard'] as const).map(tier => {
            const kind = tier === 'founding' ? cfg.foundingKind : cfg.standardKind
            const amount = tier === 'founding' ? cfg.foundingAmount : cfg.standardAmount
            return (
              <div key={tier} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ width: 100, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: '#333', textTransform: 'capitalize', paddingBottom: 8 }}>{tier}</div>
                <Field label="Reward">
                  <select value={kind} onChange={e => setC(tier === 'founding' ? { foundingKind: e.target.value as any } : { standardKind: e.target.value as any })} style={inp}>
                    <option value="cash">Cash (€)</option><option value="points">Points</option>
                  </select>
                </Field>
                <Field label={kind === 'cash' ? 'Amount (€)' : 'Points'}>
                  <input type="number" step={kind === 'cash' ? '0.01' : '1'} value={amtToInput(kind, amount)} onChange={e => setC(tier === 'founding' ? { foundingAmount: inputToAmt(kind, e.target.value) } : { standardAmount: inputToAmt(kind, e.target.value) })} style={{ ...inp, width: 120 }} />
                </Field>
              </div>
            )
          })}

          <Field label="Founding member cap"><input type="number" value={cfg.foundingCap} onChange={e => setC({ foundingCap: Number(e.target.value) })} style={{ ...inp, width: 120 }} /></Field>

          {/* Campaigns */}
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: '#1a1a1a', margin: '16px 0 6px' }}>Scheduled promotions (override the base while active)</div>
          {cfg.campaigns.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#aaa', marginBottom: 6 }}>None — the base reward above always applies.</div>}
          {cfg.campaigns.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', background: '#faf7f2', border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 6 }}>
              <Field label="Name"><input value={c.name ?? ''} onChange={e => setCamp(i, { name: e.target.value })} style={{ ...inp, width: 120 }} /></Field>
              <Field label="From"><input type="date" value={(c.from ?? '').slice(0, 10)} onChange={e => setCamp(i, { from: e.target.value })} style={inp} /></Field>
              <Field label="To"><input type="date" value={(c.to ?? '').slice(0, 10)} onChange={e => setCamp(i, { to: e.target.value })} style={inp} /></Field>
              <Field label="Tier"><select value={c.tier} onChange={e => setCamp(i, { tier: e.target.value as any })} style={inp}><option value="all">All</option><option value="founding">Founding</option><option value="standard">Standard</option></select></Field>
              <Field label="Reward"><select value={c.kind} onChange={e => setCamp(i, { kind: e.target.value as any })} style={inp}><option value="cash">Cash (€)</option><option value="points">Points</option></select></Field>
              <Field label={c.kind === 'cash' ? '€' : 'Points'}><input type="number" step={c.kind === 'cash' ? '0.01' : '1'} value={amtToInput(c.kind, c.amount)} onChange={e => setCamp(i, { amount: inputToAmt(c.kind, e.target.value) })} style={{ ...inp, width: 90 }} /></Field>
              <button onClick={() => delCamp(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, paddingBottom: 8 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={addCampaign} style={btnGhost}>+ Add promotion</button>
            <button onClick={saveCfg} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}

      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>Affiliates ({list.length})</div>
      {list.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: '20px 0', textAlign: 'center' }}>No affiliates yet.</div>}
      {list.map(a => (
        <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '11px 13px', marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{a.name} {a.tier === 'founding' && <span style={{ fontSize: 10, color: '#8a5a2a', fontWeight: 900 }}>⭐ FOUNDING</span>}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{a.email} · code {a.code} · {a.signups} signups{a.pointsEarned > 0 ? ` · ${a.pointsEarned} pts` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: a.owedCents > 0 ? '#16a34a' : '#999' }}>{eur(a.owedCents)} owed</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa' }}>{eur(a.paidCents)} paid</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={a.owedCents <= 0 || busy === a.id} onClick={() => pay(a.id, false)} style={btnGhost} title="Record an off-platform (bank) payout">Mark paid</button>
            <button disabled={a.owedCents <= 0 || !a.hasPayoutAccount || busy === a.id} onClick={() => pay(a.id, true)} style={{ ...btnPrimary, opacity: a.hasPayoutAccount ? 1 : 0.4 }} title={a.hasPayoutAccount ? 'Transfer via Stripe Connect' : 'No connected payout account'}>Pay via Stripe</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#888', marginBottom: 3 }}>{label}</label>{children}</div>
}
const inp: React.CSSProperties = { border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '7px 9px', fontFamily: 'var(--font-ui)', fontSize: 12.5, outline: 'none', background: '#fff' }
const btnPrimary: React.CSSProperties = { background: '#FF4500', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
