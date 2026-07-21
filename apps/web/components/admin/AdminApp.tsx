'use client'
import { useState, useEffect, useRef, createContext, useContext } from 'react'
import AdminSidebar from './Sidebar'
import FunnelView from './FunnelView'
import PipelineView from './PipelineView'
import ContactsView from './ContactsView'
import MembersView from './MembersView'
import DisputesView from './DisputesView'
import ReportsView from './ReportsView'
import BannersView from './BannersView'
import ForecastView from './ForecastView'
import FinancialsView from './FinancialsView'
import RetentionView from './RetentionView'
import CalendarView from './CalendarView'
import TodoView from './TodoView'
import CrmMessagesView from './CrmMessagesView'
import EshotsView from './EshotsView'
import CommunityView from './CommunityView'
import ToolboxView from './ToolboxView'
import JobsView from './JobsView'
import PropertyView from './PropertyView'
import AuditTrailView from './AuditTrailView'
import ComplianceView from './ComplianceView'
import HomepageView from './HomepageView'
import { makeCrmApi, CrmApi } from '@/lib/admin-api'

// Context so child components can call the API without prop-drilling
export const CrmApiContext = createContext<CrmApi | null>(null)
export function useCrmApi() {
  const ctx = useContext(CrmApiContext)
  if (!ctx) throw new Error('useCrmApi must be used inside AdminApp')
  return ctx
}

export type View = 'funnel' | 'pipeline' | 'contacts' | 'forecast' | 'members' | 'disputes' | 'reports' | 'rewards' | 'financials' | 'retention' | 'calendar' | 'todo' | 'messages' | 'emails' | 'banners' | 'toolbox' | 'jobs' | 'property' | 'audit' | 'compliance' | 'homepage' | 'community'

interface Props { execToken: string; execEmail?: string; execRole?: string }

export default function AdminApp({ execToken, execEmail, execRole }: Props) {
  const api = makeCrmApi(execToken)
  const [view, setView] = useState<View>('funnel')
  const mainRef = useRef<HTMLElement>(null)

  // Return to the top of the page whenever the active view changes, so lower
  // menu items don't leave the user scrolled halfway down the previous view.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    mainRef.current?.scrollTo({ top: 0 })
  }, [view])

  const [contacts, setContacts] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [focusMemberId, setFocusMemberId] = useState<string | null>(null)
  const [bannerPosition, setBannerPosition] = useState<string | null>(null)
  const [disputes, setDisputes] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [reportsOpen, setReportsOpen] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.contacts(), api.members(), api.disputes(), api.ordersThisYear(), api.reports('open')])
      .then(([c, m, d, o, r]) => {
        setContacts(c ?? []); setMembers(m ?? []); setDisputes(d ?? [])
        setOrders(o ?? []); setReportsOpen((r ?? []).length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDisputeCount = disputes.filter(d => d.status === 'open').length

  return (
    <CrmApiContext.Provider value={api}>
      <div style={{ background: '#f0f2f5', fontFamily: 'var(--font-body)', minHeight: '100vh' }}>
        {/* Topbar */}
        <header style={{
          background: '#E8DDD5', padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/grabitt-logo.png" alt="Grabitt" style={{ height: 26, width: 'auto', display: 'block' }} />
            <span style={{ color: '#999', fontSize: 13, fontWeight: 400 }}>/ Exec</span>
            {execEmail && (
              <span title={`Signed in as ${execEmail}`} style={{ marginLeft: 10, fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#999', fontWeight: 700 }}>
                {execEmail}
                {execRole && <span style={{ background: '#f0ece5', color: '#888', borderRadius: 50, padding: '1px 6px', fontSize: 9, fontWeight: 800, marginLeft: 5 }}>{execRole}</span>}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {loading ? (
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#999' }}>Loading…</span>
            ) : (
              <>
                <StatChip label="Members"   value={members.length}    onClick={() => setView('members')} />
                <StatChip label="Prospects" value={contacts.length}   onClick={() => setView('pipeline')} />
                {openDisputeCount > 0 && <StatChip label="Disputes" value={openDisputeCount} onClick={() => setView('disputes')} urgent />}
              </>
            )}
            <button
              onClick={() => setView('contacts')}
              style={{
                background: 'var(--orange)', color: '#fff', border: 'none',
                borderRadius: 50, padding: '8px 16px',
                fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}>
              + New Contact
            </button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', minHeight: 'calc(100vh - 52px)' }}>
          <AdminSidebar
            activeView={view}
            onViewChange={setView}
            counts={{ pipeline: contacts.length, disputes: openDisputeCount, reports: reportsOpen }}
          />

          <main ref={mainRef} style={{ padding: '24px 20px 40px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading data…</div>
            ) : (
              <>
                {view === 'funnel'      && <FunnelView    contacts={contacts} onNavigate={setView} />}
                {view === 'pipeline'   && <PipelineView  contacts={contacts} onUpdate={setContacts} />}
                {view === 'contacts'   && <ContactsView  contacts={contacts} onUpdate={setContacts} />}
                {view === 'forecast'   && <ForecastView  contacts={contacts} orders={orders} />}
                {view === 'members'    && <MembersView   members={members} focusUserId={focusMemberId} />}
                {view === 'disputes'   && <DisputesView  disputes={disputes} onUpdate={setDisputes} />}
                {view === 'reports'    && <ReportsView   onCountChange={setReportsOpen} />}
                {view === 'banners'    && <BannersView initialPosition={bannerPosition} />}
                {view === 'financials' && <FinancialsView />}
                {view === 'retention'  && <RetentionView />}
                {view === 'calendar'   && <CalendarView />}
                {view === 'todo'       && <TodoView />}
                {view === 'messages'   && <CrmMessagesView />}
                {view === 'emails'     && <EshotsView />}
                {view === 'toolbox'    && <ToolboxView />}
                {view === 'jobs'       && <JobsView />}
                {view === 'property'   && <PropertyView />}
                {view === 'audit'      && <AuditTrailView onViewMember={(id) => { setFocusMemberId(id); setView('members') }} />}
                {view === 'compliance' && <ComplianceView onViewMember={(id) => { setFocusMemberId(id); setView('members') }} />}
                {view === 'homepage'   && <HomepageView onEditBanners={(pos) => { setBannerPosition(pos); setView('banners') }} />}
                {view === 'community'  && <CommunityView />}
              </>
            )}
          </main>
        </div>
      </div>
    </CrmApiContext.Provider>
  )
}

function StatChip({ label, value, onClick, urgent }: { label: string; value: number; onClick: () => void; urgent?: boolean }) {
  return (
    <div onClick={onClick} style={{
      background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(255,69,0,0.12)',
      borderRadius: 50, padding: '5px 12px', textAlign: 'center', cursor: 'pointer',
    }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: urgent ? '#ef4444' : 'var(--orange)' }}>{value}</div>
      <div style={{ fontSize: 8, color: '#555', fontFamily: 'var(--font-ui)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
}

function Placeholder({ view }: { view: string }) {
  const labels: Record<string, string> = {
    rewards: '🎁 Rewards & Accounts', retention: '📊 Retention & LTV',
    calendar: '📅 Calendar', todo: '✅ To Do',
    messages: '💬 Chats', emails: '📧 E-shots', toolbox: '🧰 Toolbox',
  }
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{labels[view]?.split(' ')[0]}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#aaa', marginBottom: 6 }}>{labels[view]?.slice(2)}</div>
      <div style={{ fontSize: 12, color: '#bbb' }}>Coming soon</div>
    </div>
  )
}
