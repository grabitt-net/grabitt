'use client'

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Props { contacts: any[]; orders: any[] }

export default function ForecastView({ contacts, orders }: Props) {
  const now = new Date()
  const thisYear = now.getFullYear()

  // Revenue from orders per month (current year). Orders arrive already
  // filtered to settled transactions from financials.ordersThisYear.
  const revenueByMonth = Array(12).fill(0)
  orders.forEach(o => {
    const d = new Date(o.createdAt ?? o.created_at)
    if (d.getFullYear() === thisYear) {
      revenueByMonth[d.getMonth()] += Number(o.amount ?? 0)
    }
  })

  // Weighted affiliate pipeline forecast
  const stageWeights: Record<string, number> = {
    lead: 0.05, qualified: 0.15, pitch: 0.30, proposal: 0.50,
    close: 0.75, won: 1.0, nurture: 0.10,
  }
  const totalMRR = contacts.reduce((s, c) => s + Number(c.monthly_value ?? 0) * (stageWeights[c.stage] ?? 0), 0)
  const signedMRR = contacts.filter(c => c.stage === 'won').reduce((s, c) => s + Number(c.monthly_value ?? 0), 0)

  // Marketplace revenue (GMV 10% commission)
  const totalGMV = orders.reduce((s, o) => s + Number(o.amount ?? 0), 0)
  const commissionRevenue = totalGMV * 0.1

  const maxBar = Math.max(...revenueByMonth, 1)

  const kpis = [
    { label: 'Signed MRR', value: `€${signedMRR.toLocaleString()}`, sub: 'Confirmed affiliate', color: '#22c55e' },
    { label: 'Weighted Pipeline', value: `€${Math.round(totalMRR).toLocaleString()}`, sub: 'Probability-adjusted', color: '#FF4500' },
    { label: 'Marketplace GMV', value: `€${Math.round(totalGMV).toLocaleString()}`, sub: 'All-time', color: '#3b82f6' },
    { label: 'Commission Revenue', value: `€${Math.round(commissionRevenue).toLocaleString()}`, sub: '10% of GMV', color: '#f59e0b' },
  ]

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
        Revenue <span style={{ color: '#FF4500' }}>Forecast</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 22, color: k.color }}>{k.value}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, color: '#333', marginTop: 2 }}>{k.label}</div>
            <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'var(--font-ui)', marginTop: 1 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 14, marginBottom: 16, color: '#1a1a1a' }}>
          Marketplace Revenue — {thisYear}
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
          {revenueByMonth.map((v, i) => {
            const barH = maxBar > 0 ? Math.max(4, (v / maxBar) * 120) : 4
            const isFuture = i > now.getMonth()
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {v > 0 && (
                  <div style={{ fontSize: 8, fontFamily: 'var(--font-ui)', fontWeight: 900, color: '#555' }}>
                    €{v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}
                  </div>
                )}
                <div style={{
                  width: '100%', height: barH,
                  background: isFuture ? '#f0f2f5' : 'linear-gradient(180deg, #FF4500, #FF7A00)',
                  borderRadius: '4px 4px 0 0',
                  border: isFuture ? '1.5px dashed #d1d5db' : 'none',
                }} />
                <div style={{ fontSize: 9, fontFamily: 'var(--font-ui)', color: i === now.getMonth() ? '#FF4500' : '#aaa', fontWeight: i === now.getMonth() ? 900 : 400 }}>
                  {months[i]}
                </div>
              </div>
            )
          })}
        </div>
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 20, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ccc' }}>
            No completed orders yet — revenue will appear here
          </div>
        )}
      </div>
    </div>
  )
}
