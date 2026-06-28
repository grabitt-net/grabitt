import type { View } from './AdminApp'

const stages = [
  { id: 'prospect', label: 'Prospect', color: '#94a3b8', weight: 0.05 },
  { id: 'free-trial', label: 'Free Trial', color: '#14b8a6', weight: 0.1 },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6', weight: 0.2 },
  { id: 'interested', label: 'Interested', color: '#eab308', weight: 0.35 },
  { id: 'negotiating', label: 'Negotiating', color: '#f97316', weight: 0.6 },
  { id: 'highly-likely', label: 'Highly Likely', color: '#FF4500', weight: 0.85 },
  { id: 'signed', label: 'Signed ✅', color: '#22c55e', weight: 1.0 },
]

const widths = ['100%','88%','76%','64%','52%','40%','28%']

interface Props { contacts: any[]; onNavigate: (v: View) => void }

export default function FunnelView({ contacts, onNavigate }: Props) {
  const byStageCounts = Object.fromEntries(stages.map(s => [s.id, 0]))
  const byStageValue = Object.fromEntries(stages.map(s => [s.id, 0]))
  contacts.forEach(c => {
    if (byStageCounts[c.stage] !== undefined) {
      byStageCounts[c.stage]++
      byStageValue[c.stage] += Number(c.monthly_value ?? 0)
    }
  })

  const totalCount = contacts.length
  const signedMRR = byStageValue['signed']
  const weightedPipeline = stages.reduce((sum, s) => sum + byStageValue[s.id] * s.weight, 0)
  const conversionRate = totalCount > 0 ? Math.round((byStageCounts['signed'] / totalCount) * 100) : 0

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: '#FF4500' }}>Affiliate</span> Pipeline
      </h2>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 20 }}>
        {stages.map((stage, i) => {
          const count = byStageCounts[stage.id]
          const value = byStageValue[stage.id]
          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0

          return (
            <div key={stage.id} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div
                  onClick={() => onNavigate('pipeline')}
                  style={{
                    height: 40, width: widths[i], minWidth: 180,
                    borderRadius: 6, background: stage.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 12px', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                    {stage.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>
                    {count} · €{value.toLocaleString()}
                  </span>
                </div>
                <div style={{ minWidth: 55, textAlign: 'right', marginLeft: 'auto' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>{count}</div>
                  <div style={{ fontSize: 9, color: '#aaa' }}>{pct}%</div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div style={{ paddingLeft: 8, fontSize: 9, color: '#ef4444' }}>▼</div>
              )}
            </div>
          )
        })}

        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between',
        }}>
          {[
            { val: `${conversionRate}%`, lbl: 'Conversion' },
            { val: `€${(totalCount > 0 ? contacts.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0) / totalCount : 0).toFixed(0)}`, lbl: 'Avg prospect' },
            { val: `€${signedMRR.toLocaleString()}`, lbl: 'MRR signed' },
            { val: `€${Math.round(weightedPipeline).toLocaleString()}`, lbl: 'Weighted' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: i === 0 ? 'left' : i === 3 ? 'right' : 'center', flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: '#FF4500' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: '#aaa' }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
