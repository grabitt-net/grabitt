'use client'
import { useState, useEffect, useRef, createContext, useContext } from 'react'
import AdminSidebar from './Sidebar'
import FunnelView from './FunnelView'
import PipelineView from './PipelineView'
import ContactsView from './ContactsView'
import SupportInboxView from './SupportInboxView'
import MembersView from './MembersView'
import CandidatesView from './CandidatesView'
import BusinessView from './BusinessView'
import DiscountsView from './DiscountsView'
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
import HelpView from './HelpView'
import ToolboxView from './ToolboxView'
import JobsView from './JobsView'
import PropertyView from './PropertyView'
import AuditTrailView from './AuditTrailView'
import ComplianceView from './ComplianceView'
import HomepageView from './HomepageView'
import TodayView from './TodayView'
import RewardsView from './RewardsView'
import PlannerView from './PlannerView'
import StatusApplicationsView from './StatusApplicationsView'
import AffiliatesView from './AffiliatesView'
import LevelsView from './LevelsView'
import SponsorshipView from './SponsorshipView'
import DirectoryView from './DirectoryView'
import BlastsView from './BlastsView'
import CommandPalette, { type Command } from './CommandPalette'
import { makeCrmApi, CrmApi } from '@/lib/admin-api'

// Every navigable view — powers the ⌘K palette and URL-hash routing.
const COMMANDS: Command[] = [
  { id: 'today', label: 'Today', icon: '🧭', group: 'Overview' },
  { id: 'funnel', label: 'Pipeline', icon: '🚰', group: 'Overview' },
  { id: 'forecast', label: 'Forecast', icon: '📈', group: 'Overview' },
  { id: 'planner', label: 'Planner', icon: '🧮', group: 'Overview', keywords: 'forecast p&l pnl costs budget export' },
  { id: 'financials', label: 'Financials', icon: '💰', group: 'Overview' },
  { id: 'levels', label: 'Levels & Fees', icon: '🏅', group: 'Overview', keywords: 'fee percentage grade tier criteria student charity blue light business allowance' },
  { id: 'retention', label: 'Retention', icon: '📊', group: 'Overview' },
  { id: 'members', label: 'Members', icon: '🪪', group: 'People' },
  { id: 'business', label: 'Business', icon: '🏢', group: 'People' },
  { id: 'discounts', label: 'Discount codes', icon: '🏷️', group: 'Content', keywords: 'promo promotion coupon voucher discount codes' },
  { id: 'candidates', label: 'Candidates', icon: '🙋', group: 'People' },
  { id: 'contacts', label: 'Contacts', icon: '📇', group: 'People' },
  { id: 'pipeline', label: 'Prospects', icon: '🤞', group: 'People', keywords: 'crm deals' },
  { id: 'statusapps', label: 'Status applications', icon: '🎓', group: 'People', keywords: 'student blue light charity discount verify' },
  { id: 'affiliates', label: 'Affiliates', icon: '🔗', group: 'People', keywords: 'referral founding payout stripe rate' },
  { id: 'jobs', label: 'Jobs', icon: '💼', group: 'Marketplace' },
  { id: 'property', label: 'Property', icon: '🏠', group: 'Marketplace', keywords: 'approvals' },
  { id: 'disputes', label: 'Disputes', icon: '⚖️', group: 'Marketplace' },
  { id: 'reports', label: 'Reports', icon: '🚨', group: 'Marketplace', keywords: 'moderation' },
  { id: 'homepage', label: 'Homepage', icon: '🖼️', group: 'Content' },
  { id: 'banners', label: 'Banners', icon: '🎯', group: 'Content', keywords: 'ads sponsor' },
  { id: 'community', label: 'Guides', icon: '📰', group: 'Content' },
  { id: 'news', label: 'News', icon: '🗞️', group: 'Content', keywords: 'blog articles' },
  { id: 'economic', label: 'Economic Living', icon: '💡', group: 'Content', keywords: 'economic living money saving articles' },
  { id: 'events', label: 'Events', icon: '📅', group: 'Content', keywords: 'events whats on listings calendar' },
  { id: 'help', label: 'Help', icon: '❓', group: 'Content', keywords: 'faq support' },
  { id: 'support', label: 'Support inbox', icon: '📨', group: 'People', keywords: 'help contact enquiries suggestions tickets' },
  { id: 'sponsorship', label: 'Sponsorship', icon: '📣', group: 'Content', keywords: 'advertising banner price sponsor placement' },
  { id: 'directory', label: 'Directory', icon: '📒', group: 'Content', keywords: 'advertiser business directory listing' },
  { id: 'blasts', label: 'Blasts', icon: '📣', group: 'Content', keywords: 'email whatsapp direct marketing blast send' },
  { id: 'rewards', label: 'Rewards', icon: '🎁', group: 'Content', keywords: 'credits earn redeem upgrade fee' },
  { id: 'emails', label: 'E-shots', icon: '📧', group: 'Content' },
  { id: 'calendar', label: 'Calendar', icon: '📅', group: 'Workspace' },
  { id: 'todo', label: 'To Do', icon: '✅', group: 'Workspace' },
  { id: 'messages', label: 'Chats', icon: '💬', group: 'Workspace' },
  { id: 'audit', label: 'Audit', icon: '📋', group: 'Workspace' },
  { id: 'compliance', label: 'Compliance', icon: '🛡️', group: 'Workspace' },
  { id: 'toolbox', label: 'Toolbox', icon: '🧰', group: 'Workspace' },
]
const ALL_VIEWS = new Set<string>(COMMANDS.map(c => c.id))

// Context so child components can call the API without prop-drilling
export const CrmApiContext = createContext<CrmApi | null>(null)
export function useCrmApi() {
  const ctx = useContext(CrmApiContext)
  if (!ctx) throw new Error('useCrmApi must be used inside AdminApp')
  return ctx
}

export type View = 'today' | 'funnel' | 'pipeline' | 'contacts' | 'forecast' | 'members' | 'candidates' | 'business' | 'disputes' | 'reports' | 'financials' | 'retention' | 'calendar' | 'todo' | 'messages' | 'emails' | 'banners' | 'toolbox' | 'jobs' | 'property' | 'audit' | 'compliance' | 'homepage' | 'community' | 'news' | 'economic' | 'events' | 'help' | 'support' | 'discounts' | 'rewards' | 'planner' | 'statusapps' | 'affiliates' | 'levels' | 'sponsorship' | 'directory' | 'blasts'

interface Props { execToken: string; execEmail?: string; execRole?: string }

export default function AdminApp({ execToken, execEmail, execRole }: Props) {
  const api = makeCrmApi(execToken)
  const [view, setViewState] = useState<View>('today')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  // Views are URL-hash routed (#members, #help, …) so they're deep-linkable and
  // the browser back button works. setView is the single entry point.
  const setView = (v: View) => {
    setViewState(v)
    if (typeof window !== 'undefined' && window.location.hash.slice(1) !== v) {
      window.history.pushState(null, '', `#${v}`)
    }
  }
  useEffect(() => {
    const fromHash = () => { const h = window.location.hash.slice(1); if (ALL_VIEWS.has(h)) setViewState(h as View) }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    window.addEventListener('popstate', fromHash)
    return () => { window.removeEventListener('hashchange', fromHash); window.removeEventListener('popstate', fromHash) }
  }, [])

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
            <button
              onClick={() => setPaletteOpen(true)}
              title="Search / jump to (⌘K)"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #ddd', borderRadius: 50, padding: '6px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#999', fontWeight: 700, cursor: 'pointer' }}>
              🔍 Jump to… <span style={{ background: '#f0ece5', borderRadius: 6, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>⌘K</span>
            </button>
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

        <div style={{ display: 'grid', gridTemplateColumns: '212px 1fr', minHeight: 'calc(100vh - 52px)' }}>
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
                {view === 'today'       && <TodayView     contacts={contacts} members={members} disputes={disputes} orders={orders} reportsOpen={reportsOpen} onNavigate={setView} />}
                {view === 'funnel'      && <FunnelView    contacts={contacts} onNavigate={setView} />}
                {view === 'pipeline'   && <PipelineView  contacts={contacts} onUpdate={setContacts} />}
                {view === 'contacts'   && <ContactsView  contacts={contacts} onUpdate={setContacts} />}
                {view === 'forecast'   && <ForecastView  contacts={contacts} orders={orders} />}
                {view === 'members'    && <MembersView   members={members} focusUserId={focusMemberId} />}
                {view === 'candidates' && <CandidatesView execToken={execToken} onOpenMember={(id) => { setFocusMemberId(id); setView('members') }} />}
                {view === 'business'   && <BusinessView   execToken={execToken} onOpenMember={(id) => { setFocusMemberId(id); setView('members') }} />}
                {view === 'discounts'  && <DiscountsView />}
                {view === 'disputes'   && <DisputesView  disputes={disputes} onUpdate={setDisputes} />}
                {view === 'reports'    && <ReportsView   onCountChange={setReportsOpen} />}
                {view === 'banners'    && <BannersView initialPosition={bannerPosition} />}
                {view === 'directory'  && <DirectoryView />}
                {view === 'blasts'     && <BlastsView />}
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
                {view === 'community'  && <CommunityView section="guide" />}
                {view === 'news'       && <CommunityView section="news" />}
                {view === 'economic'   && <CommunityView section="economic" />}
                {view === 'events'     && <CommunityView section="events" />}
                {view === 'help'       && <HelpView />}
                {view === 'support'    && <SupportInboxView />}
                {view === 'rewards'    && <RewardsView />}
                {view === 'planner'    && <PlannerView />}
                {view === 'statusapps' && <StatusApplicationsView />}
                {view === 'affiliates' && <AffiliatesView />}
                {view === 'levels'     && <LevelsView />}
                {view === 'sponsorship' && <SponsorshipView />}
              </>
            )}
          </main>
        </div>
      </div>
      <CommandPalette commands={COMMANDS} onRun={setView} open={paletteOpen} setOpen={setPaletteOpen} />
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

