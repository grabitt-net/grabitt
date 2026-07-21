'use client'
import { useState, useEffect, useCallback } from 'react'
import { useCrmApi } from './AdminApp'

interface AtRisk { id: string; name: string; email: string; hasPhone: boolean; grade: string; sales: number; value: number; daysSince: number; risk: string }
interface Data {
  totalMembers: number; avgLtv: number; churnRate: number
  gradeDistribution: { grade: string; color: string; count: number; pct: number }[]
  atRisk: AtRisk[]
}

const fmt = (n: number) => `€${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

export default function RetentionView() {
  const api = useCrmApi()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [riskFilter, setRiskFilter] = useState('all')
  const [nudged, setNudged] = useState<Set<string>>(new Set())
  const [nudging, setNudging] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.retention().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [api])
  useEffect(() => { load() }, [load])

  async function nudge(m: AtRisk) {
    setNudging(m.id)
    try {
      await api.messageMember({
        userId: m.id,
        channel: 'grabitt',
        subject: 'We miss you at Grabitt',
        message: `Hi ${m.name}, it's been a little while since your last sale. New buyers are searching every day — relist an item or add something new and get back in front of them.`,
      })
      setNudged(prev => new Set(prev).add(m.id))
    } catch { /* leave un-nudged so it can be retried */ }
    finally { setNudging(null) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading retention data…</div>
  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Couldn&rsquo;t load retention data.</div>

  const shownRisk = riskFilter === 'all' ? data.atRisk : data.atRisk.filter(m => m.risk === riskFilter)

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: 'var(--orange)' }}>Retention</span> & LTV
      </h2>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Seller churn (30d)', value: `${data.churnRate}%`, color: '#ef4444', icon: '📉' },
          { label: 'Total Members', value: String(data.totalMembers), color: 'var(--orange)', icon: '👤' },
          { label: 'Avg. buyer LTV', value: fmt(data.avgLtv), color: '#8b5cf6', icon: '💶' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '16px 14px', borderTop: `4px solid ${kpi.color}` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Grade distribution */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Grade distribution</div>
        {data.gradeDistribution.map(g => (
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

      {/* At-risk sellers */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>At-risk sellers</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setRiskFilter(f)} style={{ padding: '4px 10px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, background: riskFilter === f ? 'var(--orange)' : '#f5f0e8', color: riskFilter === f ? '#fff' : '#666', textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>
        </div>
        {shownRisk.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb', textAlign: 'center', padding: '20px 0' }}>
            {data.atRisk.length === 0 ? 'No at-risk sellers — nobody active has gone quiet.' : 'None in this band.'}
          </div>
        ) : shownRisk.map(m => {
          const riskColor = m.risk === 'high' ? '#ef4444' : m.risk === 'medium' ? '#f59e0b' : '#16a34a'
          const done = nudged.has(m.id)
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 36, height: 36, background: `${riskColor}18`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{m.name}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>Last sale {m.daysSince}d ago · {m.sales} sales · {fmt(m.value)} lifetime</div>
              </div>
              <span style={{ background: `${riskColor}18`, color: riskColor, fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50, textTransform: 'uppercase' }}>{m.risk}</span>
              <button onClick={() => nudge(m)} disabled={done || nudging === m.id} style={{ background: done ? '#f0faf4' : 'var(--orange)', color: done ? '#16a34a' : '#fff', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, cursor: done ? 'default' : 'pointer', flexShrink: 0 }}>
                {done ? '✓ Nudged' : nudging === m.id ? '…' : 'Nudge'}
              </button>
            </div>
          )
        })}
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', marginTop: 12 }}>
          Nudge sends the member an in-app message inviting them back.
        </div>
      </div>
    </div>
  )
}
