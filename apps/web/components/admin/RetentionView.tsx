'use client'
import { useState } from 'react'

const GRADE_DATA = [
  { grade: 'Pro', color: '#8b5cf6', count: 12, pct: 4 },
  { grade: 'Trader', color: '#3b82f6', count: 47, pct: 15 },
  { grade: 'Dealer', color: '#eab308', count: 89, pct: 28 },
  { grade: 'Grabber', color: 'var(--orange)', count: 170, pct: 53 },
]

const AT_RISK = [
  { name: 'John S.', lastSeen: '22 days ago', sales: 8, grade: 'grabber', risk: 'high' },
  { name: 'Karim A.', lastSeen: '18 days ago', sales: 34, grade: 'dealer', risk: 'medium' },
  { name: 'Lucia P.', lastSeen: '14 days ago', sales: 5, grade: 'grabber', risk: 'medium' },
  { name: 'Peter M.', lastSeen: '12 days ago', sales: 67, grade: 'trader', risk: 'low' },
]

const SNOWBIRDS = [
  { name: 'Dave W.', homeCountry: '🇬🇧 UK', arrivedAt: 'Nov 2025', leavesAt: 'Apr 2026', status: 'present' },
  { name: 'Klaus B.', homeCountry: '🇩🇪 Germany', arrivedAt: 'Dec 2025', leavesAt: 'Mar 2026', status: 'left' },
  { name: 'Anna L.', homeCountry: '🇸🇪 Sweden', arrivedAt: 'Jan 2026', leavesAt: 'May 2026', status: 'present' },
]

export default function RetentionView() {
  const [riskFilter, setRiskFilter] = useState('all')

  const shownRisk = riskFilter === 'all' ? AT_RISK : AT_RISK.filter(m => m.risk === riskFilter)
  const churnRate = 3.2
  const totalMembers = 318

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: 'var(--orange)' }}>Retention</span> & LTV
      </h2>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Churn Rate (30d)', value: `${churnRate}%`, color: '#ef4444', icon: '📉' },
          { label: 'Total Members', value: totalMembers, color: 'var(--orange)', icon: '👤' },
          { label: 'Avg. LTV', value: '€142', color: '#8b5cf6', icon: '💶' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '16px 14px', borderTop: `4px solid ${kpi.color}` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Grade donut */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Grade distribution</div>
        {GRADE_DATA.map(g => (
          <div key={g.grade} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', width: 60, flexShrink: 0 }}>{g.grade}</div>
            <div style={{ flex: 1, height: 10, background: '#f5f0e8', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${g.pct}%`, background: g.color, borderRadius: 5, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', width: 40, textAlign: 'right' }}>{g.count}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: g.color, width: 36, textAlign: 'right', fontWeight: 900 }}>{g.pct}%</div>
          </div>
        ))}
      </div>

      {/* At-risk members */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>At-risk members</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setRiskFilter(f)} style={{ padding: '4px 10px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, background: riskFilter === f ? 'var(--orange)' : '#f5f0e8', color: riskFilter === f ? '#fff' : '#666', textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>
        </div>
        {shownRisk.map(m => {
          const riskColor = m.risk === 'high' ? '#ef4444' : m.risk === 'medium' ? '#f59e0b' : '#16a34a'
          return (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 36, height: 36, background: `${riskColor}18`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{m.name}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>Last seen {m.lastSeen} · {m.sales} sales</div>
              </div>
              <span style={{ background: `${riskColor}18`, color: riskColor, fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50, textTransform: 'uppercase' }}>{m.risk}</span>
              <button style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}>Nudge</button>
            </div>
          )
        })}
      </div>

      {/* Snowbird tracker */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Snowbird tracker 🐦</div>
        {SNOWBIRDS.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{s.name}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>{s.homeCountry} · Arrived {s.arrivedAt} · Leaves {s.leavesAt}</div>
            </div>
            <span style={{ background: s.status === 'present' ? '#d1fae5' : '#f0f0f0', color: s.status === 'present' ? '#065f46' : '#888', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50 }}>
              {s.status === 'present' ? '🌴 On island' : '✈️ Away'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
