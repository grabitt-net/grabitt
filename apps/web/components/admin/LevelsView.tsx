'use client'
import { useEffect, useState } from 'react'
import { confirmDialog } from '@/lib/ui'
import { useCrmApi } from './AdminApp'

// Levels & Fees: one place to amend the percentage fees, monthly listing
// allowances, and the criteria to reach the next level, across every account
// type — personal grades, business tiers, and the special statuses (student /
// blue light / charity). Saves to AccountLevelsConfig; the fee engine, tier
// promote/demote and status grants all read it live.

type Personal = { label: string; feePct: number; listingCap: number; criteriaSales: number; criteriaRating: number }
type Business = { label: string; feePct: number; caps: { items: number; jobs: number; property: number }; criteriaSales90d: number; criteriaRating: number }
type Status = { label: string; badge: string; feeDiscountPct: number; listingCap: number | null; freeBusiness: boolean; evidence: string; blurb: string }
type Data = { personal: Record<string, Personal>; business: Record<string, Business>; statuses: Record<string, Status> }

const PERSONAL_ORDER = ['grabber', 'dealer', 'trader', 'pro']
const BUSINESS_ORDER = ['dealer', 'trader', 'pro']
const STATUS_ORDER = ['student', 'blue_light', 'charity']

export default function LevelsView() {
  const api = useCrmApi()
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState<'personal' | 'business' | 'statuses'>('personal')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => api.accountLevels().then((d: any) => setData(d as Data)).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (fn: (d: Data) => void) => { setData(d => { if (!d) return d; const n = JSON.parse(JSON.stringify(d)) as Data; fn(n); return n }); setDirty(true); setMsg('') }

  const save = async () => {
    if (!data) return
    setSaving(true)
    try { await api.saveAccountLevels(data); setDirty(false); setMsg('✓ Saved — new fees & criteria are live.') }
    catch (e: any) { setMsg(e?.message ?? 'Save failed') } finally { setSaving(false) }
  }
  const reset = async () => {
    if (!(await confirmDialog({ message: 'Reset all levels to the built-in defaults?', confirmLabel: 'Reset' }))) return
    const d = await api.accountLevelDefaults(); setData(d as Data); setDirty(true)
  }

  if (!data) return <div style={{ padding: 20, color: '#aaa', fontFamily: 'var(--font-ui)' }}>Loading…</div>

  return (
    <div style={{ padding: 20, maxWidth: 940 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Levels &amp; Fees</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Amend the % fee, listing allowances and level-up criteria for every account type. Changes apply immediately.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: msg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{msg}</span>}
          <button onClick={reset} style={btnGhost}>Reset defaults</button>
          <button onClick={save} disabled={saving || !dirty} style={{ ...btnPrimary, opacity: dirty ? 1 : 0.5 }}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved ✓'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, background: '#f0ece5', borderRadius: 50, padding: 4, margin: '16px 0', maxWidth: 460 }}>
        {([['personal', 'Personal grades'], ['business', 'Business tiers'], ['statuses', 'Special statuses']] as [typeof tab, string][]).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#1a1a1a' : '#888', borderRadius: 50, padding: '8px 0', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {tab === 'personal' && PERSONAL_ORDER.map((g, i) => {
        const p = data.personal[g]; if (!p) return null
        return (
          <Card key={g} title={`${p.label}${i === 0 ? ' (entry level)' : ''}`}>
            <Row>
              <Num label="Sales fee %" value={p.feePct} onSet={v => edit(d => { d.personal[g].feePct = v })} step={0.1} />
              <Num label="Listings / month" value={p.listingCap} onSet={v => edit(d => { d.personal[g].listingCap = v })} />
            </Row>
            {i > 0 && (
              <Row>
                <Num label="Criteria: lifetime sales" value={p.criteriaSales} onSet={v => edit(d => { d.personal[g].criteriaSales = v })} />
                <Num label="Criteria: min rating" value={p.criteriaRating} onSet={v => edit(d => { d.personal[g].criteriaRating = v })} step={0.1} />
                <Hint>Reached automatically once a seller meets both.</Hint>
              </Row>
            )}
          </Card>
        )
      })}

      {tab === 'business' && BUSINESS_ORDER.map((g, i) => {
        const b = data.business[g]; if (!b) return null
        return (
          <Card key={g} title={`${b.label}${i === 0 ? ' (entry tier)' : ''}`}>
            <Row>
              <Num label="Sales fee %" value={b.feePct} onSet={v => edit(d => { d.business[g].feePct = v })} step={0.1} />
              <Num label="Items / month" value={b.caps.items} onSet={v => edit(d => { d.business[g].caps.items = v })} />
              <Num label="Jobs / month" value={b.caps.jobs} onSet={v => edit(d => { d.business[g].caps.jobs = v })} />
              <Num label="Property / month" value={b.caps.property} onSet={v => edit(d => { d.business[g].caps.property = v })} />
            </Row>
            {i > 0 && (
              <Row>
                <Num label="Maintain: sales (90 days)" value={b.criteriaSales90d} onSet={v => edit(d => { d.business[g].criteriaSales90d = v })} />
                <Num label="Maintain: min rating" value={b.criteriaRating} onSet={v => edit(d => { d.business[g].criteriaRating = v })} step={0.1} />
                <Hint>Held on a rolling 90-day basis — drop below and the tier steps down.</Hint>
              </Row>
            )}
          </Card>
        )
      })}

      {tab === 'statuses' && STATUS_ORDER.map(s => {
        const st = data.statuses[s]; if (!st) return null
        return (
          <Card key={s} title={`${st.badge} ${st.label}`}>
            <Row>
              <Num label="Fee discount (percentage points)" value={st.feeDiscountPct} onSet={v => edit(d => { d.statuses[s].feeDiscountPct = v })} step={0.5} />
              {st.freeBusiness && <Num label="Listing cap" value={st.listingCap ?? 0} onSet={v => edit(d => { d.statuses[s].listingCap = v })} />}
              {st.freeBusiness && <Toggle label="Free business account" checked={st.freeBusiness} onSet={v => edit(d => { d.statuses[s].freeBusiness = v })} />}
            </Row>
            <label style={lbl}>Evidence required</label>
            <input value={st.evidence} onChange={e => edit(d => { d.statuses[s].evidence = e.target.value })} style={inpFull} />
            <label style={lbl}>Member-facing blurb</label>
            <input value={st.blurb} onChange={e => edit(d => { d.statuses[s].blurb = e.target.value })} style={inpFull} />
            <Hint>{st.freeBusiness ? 'A fee discount of 100 = 0% fees (charity fundraising).' : 'Subtracted from the seller’s normal fee. E.g. 3 turns an 8% fee into 5%.'}</Hint>
          </Card>
        )
      })}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 6 }}>{children}</div> }
function Num({ label, value, onSet, step }: { label: string; value: number; onSet: (v: number) => void; step?: number }) {
  return (
    <div><label style={lbl}>{label}</label>
      <input type="number" step={step ?? 1} value={value} onChange={e => onSet(Number(e.target.value))} style={inp} />
    </div>
  )
}
function Toggle({ label, checked, onSet }: { label: string; checked: boolean; onSet: (v: boolean) => void }) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555', paddingBottom: 8 }}><input type="checkbox" checked={checked} onChange={e => onSet(e.target.checked)} /> {label}</label>
}
function Hint({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa', alignSelf: 'flex-end', paddingBottom: 8, flex: 1, minWidth: 180 }}>{children}</div> }

const lbl: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#888', margin: '6px 0 4px' }
const inp: React.CSSProperties = { border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', background: '#fff', width: 130 }
const inpFull: React.CSSProperties = { ...inp, width: '100%', boxSizing: 'border-box' }
const btnPrimary: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
