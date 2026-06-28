const stages = [
  { id: 'prospect', label: 'Prospect', color: '#94a3b8', width: '100%' },
  { id: 'free-trial', label: 'Free Trial', color: '#14b8a6', width: '88%' },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6', width: '76%' },
  { id: 'interested', label: 'Interested', color: '#eab308', width: '64%' },
  { id: 'negotiating', label: 'Negotiating', color: '#f97316', width: '52%' },
  { id: 'highly-likely', label: 'Highly Likely', color: '#FF4500', width: '40%' },
  { id: 'signed', label: 'Signed ✅', color: '#22c55e', width: '28%' },
]

export default function FunnelView() {
  return (
    <div>
      <h2 style={{
        fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700, marginBottom: 20,
        paddingLeft: 20,
      }}>
        <span style={{ color: '#FF4500' }}>Affiliate</span> Pipeline
      </h2>

      <div style={{
        background: '#fff', borderRadius: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 20,
      }}>
        {stages.map((stage, i) => (
          <div key={stage.id} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{
                height: 40, width: stage.width, minWidth: 180,
                borderRadius: 6, background: stage.color,
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '0 12px',
                cursor: 'pointer',
              }}>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                  {stage.label}
                </span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>
                  0 · €0
                </span>
              </div>
              <div style={{ minWidth: 55, textAlign: 'right', marginLeft: 'auto' }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>0</div>
                <div style={{ fontSize: 9, color: '#aaa' }}>0%</div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ paddingLeft: 8, fontSize: 9, color: '#ef4444' }}>▼</div>
            )}
          </div>
        ))}

        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {[
            { val: '0%', lbl: 'Conversion' },
            { val: '€199', lbl: 'Avg prospect' },
            { val: '€0', lbl: 'MRR signed' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center', flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: '#FF4500' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: '#aaa' }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
