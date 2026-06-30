'use client'
import { useState } from 'react'
import AdminSidebar from './Sidebar'
import FunnelView from './FunnelView'
import PipelineView from './PipelineView'
import ContactsView from './ContactsView'
import MembersView from './MembersView'
import DisputesView from './DisputesView'
import ReportsView from './ReportsView'
import BannersView from './BannersView'
import ForecastView from './ForecastView'

interface Props {
  contacts: any[]
  members: any[]
  disputes: any[]
  reports: any[]
  banners: any[]
  orders: any[]
  listings: any[]
}

export type View = 'funnel' | 'pipeline' | 'contacts' | 'forecast' | 'members' | 'disputes' | 'reports' | 'rewards' | 'financials' | 'retention' | 'calendar' | 'todo' | 'messages' | 'emails' | 'banners' | 'toolbox'

export default function AdminApp({ contacts, members, disputes, reports, banners, orders, listings }: Props) {
  const [view, setView] = useState<View>('funnel')
  const [contactList, setContactList] = useState(contacts)

  const openDisputeCount = disputes.filter(d => d.status === 'open').length
  const openReportCount = reports.filter(r => r.status === 'open').length

  return (
    <div style={{ background: '#f0f2f5', fontFamily: 'var(--font-comfortaa)', minHeight: '100vh' }}>
      {/* Topbar */}
      <header style={{
        background: '#E8DDD5', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Grab</span>
          <span style={{ color: '#2a2a2a' }}>itt</span>
          <span style={{ color: '#999', fontSize: 13, marginLeft: 6, fontWeight: 400 }}>/ Exec</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <StatChip label="Members" value={members.length} onClick={() => setView('members')} />
          <StatChip label="Prospects" value={contactList.length} onClick={() => setView('pipeline')} />
          {openDisputeCount > 0 && <StatChip label="Disputes" value={openDisputeCount} onClick={() => setView('disputes')} urgent />}
          <button
            onClick={() => setView('contacts')}
            style={{
              background: '#FF4500', color: '#fff', border: 'none',
              borderRadius: 50, padding: '8px 16px',
              fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}>
            + New Contact
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', minHeight: 'calc(100vh - 52px)' }}>
        <AdminSidebar
          activeView={view}
          onViewChange={setView}
          counts={{
            pipeline: contactList.length,
            disputes: openDisputeCount,
            reports: openReportCount,
          }}
        />

        <main style={{ padding: '24px 20px 40px', overflowY: 'auto' }}>
          {view === 'funnel' && <FunnelView contacts={contactList} onNavigate={setView} />}
          {view === 'pipeline' && <PipelineView contacts={contactList} onUpdate={setContactList} />}
          {view === 'contacts' && <ContactsView contacts={contactList} onUpdate={setContactList} />}
          {view === 'forecast' && <ForecastView contacts={contactList} orders={orders} />}
          {view === 'members' && <MembersView members={members} />}
          {view === 'disputes' && <DisputesView disputes={disputes} />}
          {view === 'reports' && <ReportsView reports={reports} />}
          {view === 'banners' && <BannersView banners={banners} contacts={contactList} />}
          {['rewards','financials','retention','calendar','todo','messages','emails','toolbox'].includes(view) && (
            <Placeholder view={view} />
          )}
        </main>
      </div>
    </div>
  )
}

function StatChip({ label, value, onClick, urgent }: { label: string; value: number; onClick: () => void; urgent?: boolean }) {
  return (
    <div onClick={onClick} style={{
      background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(255,69,0,0.12)',
      borderRadius: 50, padding: '5px 12px', textAlign: 'center', cursor: 'pointer',
    }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: urgent ? '#ef4444' : '#FF4500' }}>{value}</div>
      <div style={{ fontSize: 8, color: '#555', fontFamily: 'var(--font-nunito)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
}

function Placeholder({ view }: { view: string }) {
  const labels: Record<string, string> = {
    rewards: '🎁 Rewards & Accounts', financials: '💰 Financials',
    retention: '📊 Retention & LTV', calendar: '📅 Calendar',
    todo: '✅ To Do', messages: '💬 Chats', emails: '📧 E-shots', toolbox: '🧰 Toolbox',
  }
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{labels[view]?.split(' ')[0]}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: '#aaa', marginBottom: 6 }}>{labels[view]?.slice(2)}</div>
      <div style={{ fontSize: 12, color: '#bbb' }}>Coming soon</div>
    </div>
  )
}
