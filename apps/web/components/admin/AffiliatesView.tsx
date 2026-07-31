'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Affiliate programme admin: set the per-signup payout rates and founding cap,
// watch how many founding slots remain, and pay affiliates their earnings
// (off-platform, or via a Stripe Connect transfer to their connected account).
interface Aff { id: string; name?: string; email?: string; tier: string | null; code: string | null; hasPayoutAccount: boolean; signups: number; owedCents: number; paidCents: number }
const eur = (c: number) => `€${(c / 100).toFixed(2)}`

export default function AffiliatesView() {
  const api = useCrmApi()
  const [cfg, setCfg] = useState<{ foundingRateCents: number; standardRateCents: number; foundingCap: number } | null>(null)
  const [founding, setFounding] = useState<{ count: number; cap: number; remaining: number } | null>(null)
  const [list, setList] = useState<Aff[]>([])
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    api.affiliateConfig().then(c => setCfg({ foundingRateCents: c.foundingRateCents, standardRateCents: c.standardRateCents, foundingCap: c.foundingCap })).catch(() => {})
    api.affiliateFoundingStatus().then(setFounding).catch(() => {})
    api.affiliates().then(a => setList((a ?? []) as Aff[])).catch(() => {})
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCfg = async () => {
    if (!cfg) return
    setSaving(true)
    try { await api.saveAffiliateConfig(cfg); load() } finally { setSaving(false) }
  }

  const pay = async (id: string, viaStripe: boolean) => {
    setBusy(id)
    try { const r = await api.payOutAffiliate(id, viaStripe); alert(`Paid ${eur(r.amountCents)}${viaStripe ? ' via Stripe' : ' (recorded)'}.`); load() }
    catch (e: any) { alert(e?.message ?? 'Payout failed') }
    finally { setBusy(null) }
  }

  return (
    <div style={{ padding: 20, maxWidth: 940 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Affiliates</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 14 }}>Per-signup payout rates, founding cohort, and affiliate payouts.</div>

      {/* Founding cohort */}
      {founding && (
        <div style={{ background: 'linear-gradient(135deg,#FFF3EE,#FFE4D6)', border: '1px solid #FFD4A0', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 26 }}>⭐</div>
          <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: '#8a5a2a' }}>{founding.count} / {founding.cap}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#8a5a2a' }}>Founding members claimed</div></div>
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: founding.remaining > 0 ? '#16a34a' : '#ef4444' }}>{founding.remaining} slots remaining</div>
        </div>
      )}

      {/* Rates */}
      {cfg && (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 10 }}>Payout structure</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Founding rate (€ per signup)"><input type="number" step="0.01" value={(cfg.foundingRateCents / 100).toString()} onChange={e => setCfg({ ...cfg, foundingRateCents: Math.round(Number(e.target.value) * 100) })} style={inp} /></Field>
            <Field label="Standard rate (€ per signup)"><input type="number" step="0.01" value={(cfg.standardRateCents / 100).toString()} onChange={e => setCfg({ ...cfg, standardRateCents: Math.round(Number(e.target.value) * 100) })} style={inp} /></Field>
            <Field label="Founding member cap"><input type="number" value={cfg.foundingCap} onChange={e => setCfg({ ...cfg, foundingCap: Number(e.target.value) })} style={inp} /></Field>
            <button onClick={saveCfg} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : 'Save rates'}</button>
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa', marginTop: 8 }}>Rates apply to future signups. Founding affiliates earn the founding rate; everyone else the standard rate.</div>
        </div>
      )}

      {/* Affiliate list */}
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>Affiliates ({list.length})</div>
      {list.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: '20px 0', textAlign: 'center' }}>No affiliates yet.</div>}
      {list.map(a => (
        <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '11px 13px', marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{a.name} {a.tier === 'founding' && <span style={{ fontSize: 10, color: '#8a5a2a', fontWeight: 900 }}>⭐ FOUNDING</span>}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{a.email} · code {a.code} · {a.signups} signups</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: a.owedCents > 0 ? '#16a34a' : '#999' }}>{eur(a.owedCents)} owed</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa' }}>{eur(a.paidCents)} paid</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={a.owedCents <= 0 || busy === a.id} onClick={() => pay(a.id, false)} style={btnGhost} title="Record an off-platform (bank) payout">Mark paid</button>
            <button disabled={a.owedCents <= 0 || !a.hasPayoutAccount || busy === a.id} onClick={() => pay(a.id, true)} style={{ ...btnPrimary, opacity: a.hasPayoutAccount ? 1 : 0.4 }} title={a.hasPayoutAccount ? 'Transfer via Stripe Connect' : 'Affiliate has not connected a payout account'}>Pay via Stripe</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 4 }}>{label}</label>{children}</div>
}
const inp: React.CSSProperties = { border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', background: '#fff', width: 160 }
const btnPrimary: React.CSSProperties = { background: '#FF4500', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
