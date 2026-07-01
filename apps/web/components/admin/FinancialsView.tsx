'use client'
import { useState, useEffect } from 'react'
import { useCrmApi } from './AdminApp'

const PRESETS = [
  { label: 'Today',      days: 0 },
  { label: 'Last 7d',   days: 7 },
  { label: 'Last 30d',  days: 30 },
  { label: 'Last 90d',  days: 90 },
]

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function fmt(n: number) {
  return `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function FinancialsView() {
  const api = useCrmApi()
  const [preset, setPreset] = useState(1)
  const [data, setData] = useState<{ gmv: number; revenue: number; transactionCount: number; newMembers: number; disputes: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const days = PRESETS[preset].days
    const from = days === 0 ? daysAgo(0) + 'T00:00:00Z' : daysAgo(days) + 'T00:00:00Z'
    const to = new Date().toISOString()
    api.financialsSummary(from, to)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset])

  const STUB = { gmv: 18420.50, revenue: 1473.64, transactionCount: 47, newMembers: 12, disputes: 1 }
  const d = data ?? STUB

  const CARDS = [
    { label: 'Gross Merchandise Value', value: fmt(d.gmv),     color: 'var(--orange)', icon: '💶' },
    { label: 'Platform Revenue',        value: fmt(d.revenue), color: 'var(--sage)',   icon: '💰' },
    { label: 'Transactions',            value: String(d.transactionCount), color: '#3b82f6', icon: '🤝' },
    { label: 'New Members',             value: String(d.newMembers),       color: '#8b5cf6', icon: '👤' },
    { label: 'Disputes',                value: String(d.disputes),         color: d.disputes > 0 ? '#ef4444' : '#aaa', icon: '⚖️' },
    { label: 'Avg Order Value',         value: d.transactionCount ? fmt(d.gmv / d.transactionCount) : '€0.00', color: '#f59e0b', icon: '📊' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>Financial</span> Overview
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setPreset(i)} style={{
              padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
              background: preset === i ? 'var(--orange)' : '#fff',
              color: preset === i ? '#fff' : '#666',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ background: '#fff5f5', borderRadius: 10, padding: 12, color: '#ef4444', fontFamily: 'var(--font-ui)', fontSize: 12, marginBottom: 14 }}>⚠️ {error} — showing stub data</div>}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {CARDS.map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '18px 16px', borderTop: `4px solid ${card.color}`, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: card.color, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '20px 20px 10px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenue breakdown by grade</div>
        {[
          { grade: '🟠 Grabber', rate: '8%',   est: d.revenue * 0.55 },
          { grade: '🟡 Dealer',  rate: '6%',   est: d.revenue * 0.25 },
          { grade: '🔵 Trader',  rate: '4%',   est: d.revenue * 0.15 },
          { grade: '⭐ Pro',     rate: '2.5%', est: d.revenue * 0.05 },
        ].map(row => (
          <div key={row.grade} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', width: 120, flexShrink: 0 }}>{row.grade}</div>
            <div style={{ flex: 1, height: 8, background: '#f5f0e8', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(row.est / Math.max(d.revenue, 0.01)) * 100}%`, background: 'var(--orange)', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', width: 40, textAlign: 'right' }}>{row.rate}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: 'var(--dark)', width: 80, textAlign: 'right' }}>{fmt(row.est)}</div>
          </div>
        ))}
      </div>

      {!data && !loading && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 11, color: '#bbb', marginTop: 12 }}>
          * Showing estimated data — connect tRPC server to see live figures
        </div>
      )}
    </div>
  )
}
