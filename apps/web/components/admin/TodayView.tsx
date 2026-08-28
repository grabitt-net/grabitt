'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'
import type { View } from './AdminApp'

// The executive suite's landing view: the state of the business at a glance, and
// a short "needs attention" list, each tile deep-linking into the relevant area.
// Built from the data already loaded by AdminApp plus a cheap pending-property
// count, so it's the fast front door rather than dumping the user mid-screen.

interface Props {
  contacts: any[]
  members: any[]
  disputes: any[]
  orders: any[]
  reportsOpen: number
  onNavigate: (v: View) => void
}

const within = (iso: string | undefined, days: number) => {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return !Number.isNaN(t) && t >= Date.now() - days * 86400000
}

export default function TodayView({ contacts, members, disputes, orders, reportsOpen, onNavigate }: Props) {
  const api = useCrmApi()
  const [pendingProperty, setPendingProperty] = useState<number | null>(null)

  useEffect(() => {
    api.adminProperties('draft').then((p: any[]) => setPendingProperty((p ?? []).length)).catch(() => setPendingProperty(0))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const openDisputes = disputes.filter(d => d.status === 'open').length
    const newMembers7d = members.filter(m => within(m.createdAt ?? m.created_at, 7)).length
    const orders7d = orders.filter(o => within(o.createdAt ?? o.created_at, 7))
    const revenue7d = orders7d.reduce((s, o) => s + Number(o.amount ?? 0), 0)
    return { openDisputes, newMembers7d, orders7d: orders7d.length, revenue7d }
  }, [disputes, members, orders])

  const recentMembers = useMemo(() =>
    [...members]
      .sort((a, b) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime())
      .slice(0, 6),
  [members])

  const attention = [
    { label: 'Disputes to resolve', count: stats.openDisputes, icon: '⚖️', view: 'disputes' as View, tone: '#ef4444' },
    { label: 'Reports to review', count: reportsOpen, icon: '🚨', view: 'reports' as View, tone: '#ef4444' },
    { label: 'Property awaiting approval', count: pendingProperty ?? 0, icon: '🏠', view: 'property' as View, tone: '#f59e0b' },
  ].filter(a => a.count > 0)

  const tiles = [
    { label: 'Members', value: members.length.toLocaleString(), sub: `+${stats.newMembers7d} this week`, icon: '🪪', view: 'members' as View, color: '#3b82f6' },
    { label: 'Revenue (7 days)', value: `€${Math.round(stats.revenue7d).toLocaleString()}`, sub: `${stats.orders7d} orders`, icon: '💰', view: 'financials' as View, color: '#16a34a' },
    { label: 'Prospects', value: contacts.length.toLocaleString(), sub: 'in the pipeline', icon: '🤞', view: 'pipeline' as View, color: '#a855f7' },
    { label: 'Open disputes', value: String(stats.openDisputes), sub: stats.openDisputes ? 'need attention' : 'all clear', icon: '⚖️', view: 'disputes' as View, color: stats.openDisputes ? '#ef4444' : '#16a34a' },
  ]

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 900, color: '#1a1a1a' }}>{greeting} 👋</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#888', marginBottom: 18 }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · here’s the state of Grabitt today.
      </div>

      {/* Headline tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {tiles.map(t => (
          <button key={t.label} onClick={() => onNavigate(t.view)} style={{ textAlign: 'left', background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ color: '#ccc', fontSize: 16 }}>›</span>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 26, fontWeight: 900, color: t.color, marginTop: 8 }}>{t.value}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#1a1a1a' }}>{t.label}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#999', marginTop: 1 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Needs attention */}
        <div style={card}>
          <div style={cardHead}>Needs attention</div>
          {attention.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#16a34a', padding: '18px 0', textAlign: 'center' }}>✅ Nothing outstanding — you’re all caught up.</div>
          ) : attention.map(a => (
            <button key={a.label} onClick={() => onNavigate(a.view)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderBottom: '1px solid #f4efe8', padding: '11px 2px', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{a.label}</span>
              <span style={{ background: a.tone, color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, borderRadius: 50, minWidth: 22, textAlign: 'center', padding: '2px 8px' }}>{a.count}</span>
            </button>
          ))}
        </div>

        {/* Recent members */}
        <div style={card}>
          <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Newest members</span>
            <button onClick={() => onNavigate('members')} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>See all</button>
          </div>
          {recentMembers.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#aaa', padding: '18px 0', textAlign: 'center' }}>No members yet.</div>
          ) : recentMembers.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: '1px solid #f4efe8' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-ui)', fontSize: 13, flexShrink: 0 }}>{(m.displayName ?? m.email ?? '?')[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.displayName ?? m.email ?? 'Member'}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#999' }}>{m.grade ?? 'grabber'}{m.isBusiness ? ' · 🏢' : ''}</div>
              </div>
              {(m.createdAt ?? m.created_at) && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{new Date(m.createdAt ?? m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick jumps */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={cardHead}>Jump to</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {([
            ['🖼️', 'Homepage', 'homepage'], ['🎯', 'Banners', 'banners'], ['📰', 'Guides', 'community'], ['❓', 'Help', 'help'],
            ['📧', 'E-shots', 'emails'], ['💼', 'Jobs', 'jobs'], ['📈', 'Forecast', 'forecast'], ['✅', 'To Do', 'todo'],
          ] as [string, string, View][]).map(([icon, label, v]) => (
            <button key={v} onClick={() => onNavigate(v)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f7f4ee', border: '1px solid #eee', borderRadius: 50, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: '#444', cursor: 'pointer' }}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }
