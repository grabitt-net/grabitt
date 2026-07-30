'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Financial planner: an editable 6-month forecast + P&L. Assumptions and revenue
// drivers feed formula-computed revenue; cost lines (add your own) drive the P&L,
// net and break-even. Persisted to the DB and exportable to CSV.

const MONTHS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
type Line = { label: string; kind: 'fixed' | 'pct_gmv'; monthly: number[]; pct?: number }
type Model = {
  gmv: number[]
  takeRate: number[]
  subPrice: number
  agentPrice: number
  subCounts: number[]
  agentCounts: number[]
  addons: number[]
  promos: number[]
  credits: number[]
  verify: number[]
  costs: Line[]
}

const DEFAULT_MODEL: Model = {
  gmv: [22000, 68000, 155000, 300000, 450000, 640000],
  takeRate: [0.015, 0.025, 0.035, 0.06, 0.06, 0.06],
  subPrice: 29,
  agentPrice: 65,
  subCounts: [0, 18, 45, 95, 155, 230],
  agentCounts: [0, 3, 7, 13, 20, 28],
  addons: [149, 650, 1600, 3800, 5600, 8200],
  promos: [120, 380, 820, 1700, 2600, 3700],
  credits: [150, 450, 950, 1700, 2500, 3400],
  verify: [0, 150, 300, 500, 650, 800],
  costs: [
    { label: 'Marketing spend', kind: 'fixed', monthly: [6000, 6000, 6000, 6000, 6000, 6000] },
    { label: 'Team & contractors', kind: 'fixed', monthly: [9000, 9000, 9000, 9000, 9000, 9000] },
    { label: 'Platform & tooling', kind: 'fixed', monthly: [1200, 1200, 1200, 1200, 1200, 1200] },
    { label: 'Payment processing (% of GMV)', kind: 'pct_gmv', monthly: [0, 0, 0, 0, 0, 0], pct: 0.015 },
  ],
}

const fmt = (n: number) => `€${Math.round(n).toLocaleString()}`
const arr6 = (a: any): number[] => Array.isArray(a) && a.length === 6 ? a.map(Number) : [0, 0, 0, 0, 0, 0]
function normalise(d: any): Model {
  if (!d) return JSON.parse(JSON.stringify(DEFAULT_MODEL))
  return {
    gmv: arr6(d.gmv), takeRate: arr6(d.takeRate), subPrice: Number(d.subPrice ?? 29), agentPrice: Number(d.agentPrice ?? 65),
    subCounts: arr6(d.subCounts), agentCounts: arr6(d.agentCounts), addons: arr6(d.addons), promos: arr6(d.promos),
    credits: arr6(d.credits), verify: arr6(d.verify),
    costs: Array.isArray(d.costs) && d.costs.length ? d.costs.map((c: any) => ({ label: String(c.label ?? 'Cost'), kind: c.kind === 'pct_gmv' ? 'pct_gmv' : 'fixed', monthly: arr6(c.monthly), pct: c.pct != null ? Number(c.pct) : undefined })) : JSON.parse(JSON.stringify(DEFAULT_MODEL.costs)),
  }
}

export default function PlannerView() {
  const api = useCrmApi()
  const [model, setModel] = useState<Model>(() => JSON.parse(JSON.stringify(DEFAULT_MODEL)))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    api.plannerGet().then(r => { if (r?.data) { setModel(normalise(r.data)); setSavedAt(r.updatedAt) } }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (fn: (m: Model) => void) => { setModel(m => { const n = JSON.parse(JSON.stringify(m)) as Model; fn(n); return n }); setDirty(true) }
  const setCell = (key: keyof Model, i: number, v: number) => edit(m => { (m[key] as number[])[i] = v })

  // ── Computed ──────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const commission = model.gmv.map((g, i) => g * model.takeRate[i])
    const subs = model.subCounts.map(c => c * model.subPrice)
    const agents = model.agentCounts.map(c => c * model.agentPrice)
    const revLines: [string, number[]][] = [
      ['Marketplace commission', commission],
      ['Business subscriptions', subs],
      ['Property agent plans', agents],
      ['Add-ons & sponsorship', model.addons],
      ['Listing promotions', model.promos],
      ['Credits economy', model.credits],
      ['Business verification', model.verify],
    ]
    const revenue = MONTHS.map((_, i) => revLines.reduce((s, [, v]) => s + v[i], 0))
    const costLines = model.costs.map(c => ({ label: c.label, kind: c.kind, pct: c.pct, monthly: MONTHS.map((_, i) => c.kind === 'pct_gmv' ? model.gmv[i] * (c.pct ?? 0) : c.monthly[i]) }))
    const totalCost = MONTHS.map((_, i) => costLines.reduce((s, c) => s + c.monthly[i], 0))
    const net = MONTHS.map((_, i) => revenue[i] - totalCost[i])
    let run = 0; const cumulative = net.map(n => (run += n))
    const breakEven = net.findIndex(n => n > 0)
    return { commission, subs, agents, revLines, revenue, costLines, totalCost, net, cumulative, breakEven }
  }, [model])

  const save = async () => {
    setSaving(true)
    try { const r = await api.plannerSave(model); setSavedAt(r.updatedAt); setDirty(false) } finally { setSaving(false) }
  }

  const exportCsv = () => {
    const rows: (string | number)[][] = [['', ...MONTHS, '6-mo total']]
    const push = (label: string, vals: number[]) => rows.push([label, ...vals.map(v => Math.round(v)), Math.round(vals.reduce((a, b) => a + b, 0))])
    calc.revLines.forEach(([l, v]) => push(l, v))
    push('TOTAL REVENUE', calc.revenue)
    rows.push([])
    calc.costLines.forEach(c => push(c.label, c.monthly))
    push('TOTAL COSTS', calc.totalCost)
    push('NET', calc.net)
    rows.push(['Cumulative net', ...calc.cumulative.map(v => Math.round(v)), ''])
    const csv = rows.map(r => r.map(c => typeof c === 'string' && c.includes(',') ? `"${c}"` : c).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'grabitt-forecast.csv'; a.click()
  }

  const totalRev = calc.revenue.reduce((a, b) => a + b, 0)
  const totalNet = calc.net.reduce((a, b) => a + b, 0)

  return (
    <div style={{ padding: 20, maxWidth: 1040 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Financial planner</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Editable 6-month forecast &amp; P&amp;L. {savedAt ? `Last saved ${new Date(savedAt).toLocaleString('en-GB')}` : 'Not saved yet'}{dirty ? ' · unsaved changes' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCsv} style={btnGhost}>⭳ Export CSV</button>
          <button onClick={() => { if (confirm('Reset to default assumptions?')) { setModel(JSON.parse(JSON.stringify(DEFAULT_MODEL))); setDirty(true) } }} style={btnGhost}>Reset</button>
          <button onClick={save} disabled={saving || !dirty} style={{ ...btnPrimary, opacity: !dirty ? 0.5 : 1 }}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved ✓'}</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
        <Kpi label="6-mo revenue" value={fmt(totalRev)} color="#1B8F63" />
        <Kpi label="Month-6 revenue" value={fmt(calc.revenue[5])} color="#FF5A1F" />
        <Kpi label="6-mo net" value={fmt(totalNet)} color={totalNet >= 0 ? '#1B8F63' : '#ef4444'} />
        <Kpi label="Break-even" value={calc.breakEven >= 0 ? MONTHS[calc.breakEven] : '—'} color="#1a1a1a" />
      </div>

      {/* Assumptions */}
      <Section title="Assumptions (per month)">
        <Grid>
          <HeadRow />
          <EditRow label="GMV transacted (€)" vals={model.gmv} onSet={(i, v) => setCell('gmv', i, v)} />
          <EditRow label="Take rate (%)" vals={model.takeRate} pct onSet={(i, v) => setCell('takeRate', i, v)} />
        </Grid>
        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
          <Inline label="Business sub price (€/mo)"><NumCell value={model.subPrice} onSet={v => edit(m => { m.subPrice = v })} w={80} /></Inline>
          <Inline label="Agent plan price (€/mo)"><NumCell value={model.agentPrice} onSet={v => edit(m => { m.agentPrice = v })} w={80} /></Inline>
        </div>
      </Section>

      {/* Revenue drivers */}
      <Section title="Revenue drivers (editable)">
        <Grid>
          <HeadRow />
          <EditRow label="Paying business accounts (#)" vals={model.subCounts} onSet={(i, v) => setCell('subCounts', i, v)} />
          <EditRow label="Property agent plans (#)" vals={model.agentCounts} onSet={(i, v) => setCell('agentCounts', i, v)} />
          <EditRow label="Add-ons & sponsorship (€)" vals={model.addons} onSet={(i, v) => setCell('addons', i, v)} />
          <EditRow label="Listing promotions (€)" vals={model.promos} onSet={(i, v) => setCell('promos', i, v)} />
          <EditRow label="Credits economy (€)" vals={model.credits} onSet={(i, v) => setCell('credits', i, v)} />
          <EditRow label="Business verification (€)" vals={model.verify} onSet={(i, v) => setCell('verify', i, v)} />
        </Grid>
      </Section>

      {/* Computed revenue */}
      <Section title="Revenue (computed)">
        <Grid>
          <HeadRow total />
          {calc.revLines.map(([l, v]) => <CalcRow key={l} label={l} vals={v} />)}
          <CalcRow label="Total revenue" vals={calc.revenue} bold color="#1B8F63" />
        </Grid>
      </Section>

      {/* P&L costs */}
      <Section title="Costs / P&L (add your own lines)">
        <Grid>
          <HeadRow total del />
          {model.costs.map((c, ci) => (
            <div key={ci} style={rowStyle}>
              <input value={c.label} onChange={e => edit(m => { m.costs[ci].label = e.target.value })} style={{ ...labelInput }} />
              {c.kind === 'pct_gmv' ? (
                <div style={{ gridColumn: '2 / 8', display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>% of GMV:</span>
                  <NumCell value={(c.pct ?? 0) * 100} onSet={v => edit(m => { m.costs[ci].pct = v / 100 })} w={64} suffix="%" />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa' }}>→ {MONTHS.map((mn, i) => fmt(calc.costLines[ci].monthly[i])).join(' · ')}</span>
                </div>
              ) : (
                MONTHS.map((_, i) => <NumCell key={i} value={c.monthly[i]} onSet={v => edit(m => { m.costs[ci].monthly[i] = v })} />)
              )}
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555' }}>{fmt(calc.costLines[ci].monthly.reduce((a, b) => a + b, 0))}</div>
              <button onClick={() => edit(m => { m.costs.splice(ci, 1) })} title="Remove" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          ))}
          <CalcRow label="Total costs" vals={calc.totalCost} bold color="#ef4444" del />
        </Grid>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => edit(m => { m.costs.push({ label: 'New cost', kind: 'fixed', monthly: [0, 0, 0, 0, 0, 0] }) })} style={btnGhost}>+ Add cost line</button>
          <button onClick={() => edit(m => { m.costs.push({ label: 'New % cost', kind: 'pct_gmv', monthly: [0, 0, 0, 0, 0, 0], pct: 0.01 }) })} style={btnGhost}>+ Add % of GMV cost</button>
        </div>
      </Section>

      {/* Bottom line */}
      <Section title="Bottom line">
        <Grid>
          <HeadRow total />
          <CalcRow label="Net (monthly)" vals={calc.net} bold color="#1B8F63" />
          <CalcRow label="Cumulative net" vals={calc.cumulative} muted noTotal />
        </Grid>
      </Section>
    </div>
  )
}

// ── Small building blocks ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12, overflowX: 'auto' }}>{children}</div>
    </div>
  )
}
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ minWidth: 620 }}>{children}</div> }
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.6fr repeat(6, 1fr) 1fr 20px', gap: 4, alignItems: 'center', padding: '3px 0' }
function HeadRow({ total, del }: { total?: boolean; del?: boolean }) {
  return (
    <div style={{ ...rowStyle, gridTemplateColumns: `1.6fr repeat(6, 1fr) ${total ? '1fr' : '0px'} ${del ? '20px' : '0px'}` }}>
      <div />
      {MONTHS.map(m => <div key={m} style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#aaa', paddingRight: 6 }}>{m}</div>)}
      {total ? <div style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#aaa' }}>Total</div> : <div />}
      {del ? <div /> : <div />}
    </div>
  )
}
function EditRow({ label, vals, onSet, pct }: { label: string; vals: number[]; onSet: (i: number, v: number) => void; pct?: boolean }) {
  return (
    <div style={{ ...rowStyle, gridTemplateColumns: '1.6fr repeat(6, 1fr)' }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: '#333' }}>{label}</div>
      {vals.map((v, i) => <NumCell key={i} value={pct ? v * 100 : v} onSet={x => onSet(i, pct ? x / 100 : x)} suffix={pct ? '%' : undefined} />)}
    </div>
  )
}
function CalcRow({ label, vals, bold, color, muted, noTotal, del }: { label: string; vals: number[]; bold?: boolean; color?: string; muted?: boolean; noTotal?: boolean; del?: boolean }) {
  const total = vals.reduce((a, b) => a + b, 0)
  return (
    <div style={{ ...rowStyle, gridTemplateColumns: `1.6fr repeat(6, 1fr) 1fr ${del ? '20px' : '0px'}`, borderTop: bold ? '1px solid #eee' : 'none' }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: bold ? 800 : 600, color: muted ? '#999' : (color || '#333') }}>{label}</div>
      {vals.map((v, i) => <div key={i} style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: bold ? 800 : 500, color: muted ? '#999' : (color || '#333'), fontVariantNumeric: 'tabular-nums', paddingRight: 6 }}>{fmt(v)}</div>)}
      {noTotal ? <div /> : <div style={{ textAlign: 'right', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: color || '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>}
      {del ? <div /> : null}
    </div>
  )
}
function NumCell({ value, onSet, w, suffix }: { value: number; onSet: (v: number) => void; w?: number; suffix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
      <input type="number" value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0} onChange={e => onSet(Number(e.target.value))}
        style={{ width: w ?? '100%', maxWidth: 90, textAlign: 'right', border: '1px solid #e6e0d6', borderRadius: 6, padding: '4px 6px', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontVariantNumeric: 'tabular-nums', outline: 'none', background: '#fff' }} />
      {suffix && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#aaa' }}>{suffix}</span>}
    </div>
  )
}
function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '12px 16px', minWidth: 130 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{label}</div>
    </div>
  )
}
function Inline({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: '#555' }}>{label} {children}</label>
}
const labelInput: React.CSSProperties = { border: '1px solid #eee', borderRadius: 6, padding: '4px 8px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: '#333', outline: 'none', background: '#fafafa' }
const btnPrimary: React.CSSProperties = { background: '#FF4500', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
