'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpcAuthed, setAuthToken } from '@/lib/authToken'
import { compressAndUpload } from '@/lib/storage'
import { createClient } from '@/lib/supabase'
import { toast, confirmDialog } from '@/lib/ui'
import { usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import Icon, { type IconName } from './Icon'
import AttributesCard from './AttributesCard'
import TenantProfileCard from './TenantProfileCard'
import MemberStatusCard from './MemberStatusCard'
import RewardsCard from './RewardsCard'
import AffiliateCard from './AffiliateCard'
import InboxClient from './InboxClient'
import BannerSlot from './BannerSlot'
import BusinessCentre from './BusinessCentre'
import AgentProfileCard from './AgentProfileCard'
import JobCategories from './JobCategories'
import { deptEmoji, toPanelItem } from '@/lib/listingMap'
import { getViews, type RecentCard } from '@/lib/recentViews'
import { t } from '@/lib/i18n'

// ── Personal member dashboard ────────────────────────────────────────────────
// Steve's hand-drawn "Member Zone" layout, personal accounts only (business
// accounts keep their own hub). A three-box top strip (profile · selling
// snapshot · dashboard pills) over an 8-section left menu that swaps the right
// panel. It sits BELOW the existing header + Grabitt NOW promo.

type SectionId = 'business' | 'messages' | 'employment' | 'aboutme' | 'listings' | 'disputes' | 'admin' | 'saved' | 'recommended' | 'recent' | 'loyalty' | 'addbiz' | 'activity' | 'gdpr' | 'suggest' | 'hub'
type Seg = 'active' | 'sold' | 'draft' | 'buying'

const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: 'messages', label: 'Message Centre', icon: 'message' },
  { id: 'employment', label: 'Employment & CV', icon: 'briefcase' },
  { id: 'aboutme', label: 'About Me', icon: 'star' },
  { id: 'listings', label: 'Trading', icon: 'tag' },
  { id: 'disputes', label: 'Disputes', icon: 'shield' },
  { id: 'admin', label: 'Admin Centre', icon: 'user' },
  { id: 'saved', label: 'Saved Listings & Offers', icon: 'heart' },
  { id: 'recommended', label: 'Recommended for You', icon: 'sparkle' },
  { id: 'recent', label: 'Recently Viewed', icon: 'search' },
  { id: 'loyalty', label: 'Loyalty Centre', icon: 'coins' },
  { id: 'addbiz', label: 'Add Business or Charity', icon: 'building' },
  { id: 'activity', label: 'Activity Centre', icon: 'package' },
  { id: 'gdpr', label: 'Privacy & GDPR', icon: 'lock' },
  { id: 'suggest', label: 'Suggest ideas', icon: 'sparkle' },
]

// Activity Centre feed (rendered inline in the right panel — no pop-up).
const ACTIVITY = [
  { icon: '🛒', title: 'Purchased PS5 Console', detail: 'from @gc_gaming_shop', time: '2h ago', color: '#3b82f6' },
  { icon: '💬', title: 'Message sent to María R.', detail: 'Re: Cleaning — Handy Help', time: '4h ago', color: '#8b5cf6' },
  { icon: '💰', title: 'Offer received on Surfboard', detail: 'Dave M. offered €85', time: '6h ago', color: 'var(--orange)' },
  { icon: '⭐', title: 'Review left for @seller_anna', detail: '5★ — Great seller!', time: '1d ago', color: '#eab308' },
  { icon: '📦', title: 'Listed IKEA Sofa', detail: '€180 · Las Palmas', time: '2d ago', color: 'var(--sage)' },
  { icon: '✅', title: 'Handover confirmed', detail: 'iPhone 13 — Released to @seller_mike', time: '3d ago', color: '#16a34a' },
]

const bucket = (s: string) => (s === 'sold' ? 'sold' : (s === 'active' || s === 'grab_it_now') ? 'active' : 'draft')
const TX_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment', held: 'Paid — in escrow', confirmed_handover: 'Handover confirmed',
  completed: 'Completed', released: 'Funds released', disputed: 'In dispute', refunded: 'Refunded', cancelled: 'Cancelled',
}

// Styles shared with the rest of the account surfaces.
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const fieldLabel: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5 }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', marginBottom: 12 }
const primaryBtn: React.CSSProperties = { background: '#fff', color: 'var(--orange)', border: '2px solid #111', borderRadius: 12, padding: '11px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '16px 0', textAlign: 'center' }}>{children}</div> }

const SECTION_IDS = new Set<string>(['business', 'messages', 'employment', 'aboutme', 'listings', 'disputes', 'admin', 'saved', 'recommended', 'recent', 'loyalty', 'addbiz', 'activity', 'gdpr'])

export default function MemberDashboard({ me, onReload }: { me: any; onReload: () => void }) {
  const router = useRouter()
  const params = useSearchParams()
  const { openPanel } = usePanel()
  // Business users can flip their hub to a personal view (and back). effBiz is
  // "show the business hub" — used for all layout decisions below.
  const [personalView, setPersonalView] = useState(false)
  const effBiz = !!me?.isBusiness && !personalView
  // Land on the account's own home — Business Centre for business, the My Hub
  // overview for everyone else — rather than dropping straight into Messages.
  const [section, setSection] = useState<SectionId>(me?.isBusiness ? 'business' : 'hub')
  // `me` loads async, so the initial default above can be wrong (defaults to
  // 'hub' before we know it's a business account). Set the landing section once,
  // when `me` first resolves — Business Centre for business, My Hub otherwise —
  // unless a ?section= deep-link is present. `didInitSection` stops it from
  // stomping later navigation.
  const didInitSection = useRef(false)
  // Deep-link a section via ?section= (e.g. the top rail's Saved / Messages).
  useEffect(() => {
    const s = params.get('section')
    if (s && SECTION_IDS.has(s)) { setSection(s as SectionId); didInitSection.current = true; return }
    if (me && !didInitSection.current) {
      didInitSection.current = true
      setSection(me.isBusiness ? 'business' : 'hub')
    }
  }, [params, me])
  const [seg, setSeg] = useState<Seg>('active')
  const sortNewest = true // My Listings default to newest-first

  // Business accounts get a Business Centre section (and no "add business"); the
  // rest of the menu is shared with personal accounts.
  const sections: { id: SectionId; label: string; icon: IconName }[] = effBiz
    ? [{ id: 'business', label: 'Business Centre', icon: 'building' },
       // Business hub: no "add business", no personal "About Me" (handled in the
       // Business Centre) and no separate Admin Centre (folded into Business
       // Centre). "Employment & CV" becomes the employer recruiting view.
       ...SECTIONS.filter(s => !['addbiz', 'aboutme', 'admin'].includes(s.id)).map(s => s.id === 'employment' ? { ...s, label: 'Recruitment' } : s)]
    : SECTIONS

  // Clicking a My Hub card opens its list in the panel below.
  const [hubView, setHubView] = useState<MetricKey | null>(null)
  const [hubTitle, setHubTitle] = useState('')
  const openHub = (key: MetricKey, title: string) => {
    // Just swap the lower panel's content — don't move the page.
    setHubView(key); setHubTitle(title); setSection('hub')
  }

  const [dash, setDash] = useState<any>(null)
  const [listings, setListings] = useState<any[] | null>(null)
  const [offers, setOffers] = useState<any[] | null>(null)
  const [threads, setThreads] = useState<any[] | null>(null)
  const [purchases, setPurchases] = useState<any[] | null>(null)
  const [watched, setWatched] = useState<any[] | null>(null)
  const [recommended, setRecommended] = useState<any[] | null>(null)
  const [payout, setPayout] = useState<any>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Business-only: the account's tier label and storefront slug.
  const [bizTier, setBizTier] = useState<string | null>(null)
  const [storefront, setStorefront] = useState<{ slug: string } | null>(null)
  useEffect(() => {
    if (!me?.isBusiness) return
    const c: any = trpcAuthed()
    c.business.tierStatus.query().then((d: any) => { if (d?.isBusiness) setBizTier(d.label) }).catch(() => {})
    c.business.myStorefront.query().then((d: any) => setStorefront(d?.shop ?? null)).catch(() => {})
  }, [me?.isBusiness])
  // Recently viewed lives in localStorage — read after mount to avoid a
  // server/client hydration mismatch.
  const [recent, setRecent] = useState<RecentCard[]>([])
  useEffect(() => { setRecent(getViews()) }, [])

  const load = useCallback(() => {
    const c: any = trpcAuthed()
    c.users.dashboard.query().then(setDash).catch(() => {})
    c.users.payoutStatus.query().then(setPayout).catch(() => {})
    c.listings.mine.query().then((d: any) => setListings(d as any[])).catch(() => setListings([]))
    c.offers.received.query().then((d: any) => setOffers(d as any[])).catch(() => setOffers([]))
    c.messages.myThreads.query().then((d: any) => setThreads(d as any[])).catch(() => setThreads([]))
    c.transactions.myPurchases.query().then((d: any) => setPurchases(d as any[])).catch(() => setPurchases([]))
    c.wishlist.list.query().then((d: any) => setWatched(d as any[])).catch(() => setWatched([]))
    c.listings.recommended.query().then((d: any) => setRecommended((d as any[]).map(toPanelItem))).catch(() => setRecommended([]))
  }, [])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const l = listings ?? []
    return { active: l.filter(x => bucket(x.status) === 'active').length, sold: l.filter(x => bucket(x.status) === 'sold').length, draft: l.filter(x => bucket(x.status) === 'draft').length }
  }, [listings])

  const shown = (listings ?? [])
    .filter(l => bucket(l.status) === (seg === 'buying' ? 'active' : seg))
    .sort((a, b) => sortNewest
      ? new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      : new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
    .map((l: any) => ({ ref: l.id, title: l.title, price: `€${Number(l.price).toLocaleString()}`, image: Array.isArray(l.images) ? l.images[0] : null, emoji: deptEmoji(l.department) }))

  const respond = async (offerId: string, action: 'accept' | 'decline') => {
    setBusyId(offerId)
    try { await (trpcAuthed() as any).offers.respond.mutate({ offerId, action }); (trpcAuthed() as any).offers.received.query().then((d: unknown) => setOffers(d as any[])) }
    finally { setBusyId(null) }
  }

  const setupPayouts = async () => {
    try {
      const c: any = trpcAuthed()
      const res = payout?.payoutsEnabled ? await c.users.payoutDashboardLink.mutate() : await c.users.createPayoutOnboarding.mutate()
      if (res?.url) window.location.href = res.url
      else toast(t('Stripe did not return a link. Please try again.'))
    } catch { toast(t('Could not open Stripe. Please try again.')) }
  }

  // Profile photo upload — compress client-side, store in the photos bucket, then
  // save the public URL to the account.
  const avatarInput = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !me?.id) return
    setAvatarBusy(true)
    try {
      const url = await compressAndUpload(file, `avatars/${me.id}/${crypto.randomUUID()}.jpg`)
      await trpcAuthed().users.updateProfile.mutate({ avatar: url })
      onReload()
    } catch { toast(t('Could not upload your photo. Please try again.')) }
    finally { setAvatarBusy(false); if (avatarInput.current) avatarInput.current.value = '' }
  }

  const toggleOpenToWork = async () => {
    const next = !me?.openToWork
    try {
      await trpcAuthed().users.updateProfile.mutate({ openToWork: next })
      onReload()
      // Choosing "looking for work" jumps straight to attributes (per Steve).
      if (next) setSection('employment')
    } catch { toast(t('Could not update. Please try again.')) }
  }
  const logout = async () => {
    try { await createClient().auth.signOut() } catch {}
    setAuthToken(null)
    if (typeof window !== 'undefined') localStorage.removeItem('grabitt_uid')
    router.push('/')
  }

  // Identity helpers
  const memberSince = me?.createdAt ? new Date(me.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'
  const memberRef = me?.id ? `M${String(me.id).replace(/-/g, '').slice(0, 6).toUpperCase()}` : ''
  const accountType = me?.memberStatus === 'blue_light' ? 'Bluelight' : me?.memberStatus === 'student' ? 'Student' : me?.memberStatus === 'charity' ? 'Charity' : 'Regular'

  // Stable date-window bounds for the two headline pills in each metric column:
  // "This month" (from the 1st) and "Year so far" (from January 1st).
  const { monthStart, yearStart } = useMemo(() => {
    const now = new Date()
    return {
      monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      yearStart: new Date(now.getFullYear(), 0, 1).toISOString(),
    }
  }, [])

  return (
    <>
      {/* ── MY HUB ──────────────────────────────────────────────────────────── */}
      {/* Title with flanking rules */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '10px 0 42px' }}>
        <span style={{ width: 34, height: 3, borderRadius: 2, background: '#1e2b55' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 900, color: '#1e2b55', letterSpacing: 3 }}>{effBiz ? t('BUSINESS HUB') : t('MY HUB')}</span>
        <span style={{ width: 34, height: 3, borderRadius: 2, background: '#1e2b55' }} />
      </div>

      <div style={{ position: 'relative', background: '#f4f6fb', borderRadius: 20, padding: '48px 16px 22px', boxShadow: '0 6px 24px rgba(30,43,85,0.07)', border: '1.5px solid #d7deec' }}>
        {/* Dashboard pill — pale orange, matching the profile box */}
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#ffe0bb', color: 'var(--orange)', borderRadius: 999, padding: '8px 22px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>{t('Dashboard')}</div>

        <div className="member-hub" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
          {/* Profile sidebar — pale orange */}
          <div style={{ background: '#ffe0bb', borderRadius: 16, padding: 16, color: 'var(--dark)', alignSelf: 'stretch' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <button onClick={() => avatarInput.current?.click()} title={t('Change photo')} aria-label={t('Change photo')} style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', background: 'var(--orange)', overflow: 'hidden', flexShrink: 0, border: 'none', padding: 0, cursor: 'pointer' }}>
                {me?.avatar
                  ? <img src={me.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="user" size={22} strokeWidth={2} /></span>}
                <span style={{ position: 'absolute', right: -1, bottom: -1, width: 18, height: 18, borderRadius: '50%', background: 'var(--dark)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ffe0bb' }}><Icon name="pencil" size={9} strokeWidth={2.5} /></span>
                {avatarBusy && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, color: '#fff' }}>…</span>}
              </button>
              <input ref={avatarInput} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 900, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me?.displayName ?? t('Your account')}</div>
                {effBiz && (me?.businessLight
                  ? <EditableBusinessName initial={me?.businessName ?? ''} />
                  : me?.businessName ? <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--orange)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏢 {me.businessName}</div> : null)}
                <button onClick={() => openPanel('myRatings' as PanelId)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: '#8a6d3b' }}>{t('Rating')} ⭐ {me?.avgRating ? Number(me.avgRating).toFixed(1) : '—'}</button>
              </div>
            </div>
            <HubNavRow icon="user" label={t('Account type')} value={effBiz ? (bizTier ?? t('Business')) : me?.businessLight && !personalView ? t('Business Light') : accountType} />
            <HubNavRow icon="file" label={t('Account ref')} value={memberRef} />
            <HubNavRow icon="shield" iconColor="#16a34a" label={t('Verified')} value={me?.isVerified
              ? <span style={{ color: '#16a34a', fontWeight: 800 }}>{t('Yes')}</span>
              : <button onClick={() => openPanel('verifyMe' as PanelId)} style={navLinkBtn}>{t('Get verified')}</button>} />
            {/* Business hub: staff required (recruit). Personal: looking-for-work toggle. */}
            {effBiz ? (
              <HubNavRow icon="wrench" label={t('Staff required')} value={
                <button onClick={() => router.push('/jobs')} style={navLinkBtn}>{t('Recruit')}</button>} />
            ) : !me?.isBusiness ? (
              <HubNavRow icon="wrench" label={t('Work required')} value={
                <button onClick={toggleOpenToWork} style={{ ...navLinkBtn, color: me?.openToWork ? '#16a34a' : '#6a5a48' }}>
                  {me?.openToWork ? t('Looking') : t('Not looking')}
                </button>} />
            ) : null}
            {me?.isBusiness ? (
              /* Switch easily between the business and personal profile. */
              <HubNavRow icon="briefcase" label={effBiz ? t('Personal account') : t('Business account')} last={!effBiz} value={
                <button onClick={() => { const goPersonal = !personalView; setPersonalView(goPersonal); setSection(goPersonal ? 'hub' : 'business'); didInitSection.current = true }} style={navLinkBtn}>{t('Switch')}</button>} />
            ) : (
              <HubNavRow icon="briefcase" label={t('Business acc')} last value={
                <button onClick={() => router.push('/for-business')} style={navLinkBtn}>{t('Add / Upgrade')}</button>} />
            )}
            {effBiz && (
              <HubNavRow icon="building" label={t('Storefront')} last value={
                storefront?.slug
                  ? <button onClick={() => router.push(`/shop/${storefront.slug}`)} style={navLinkBtn}>{t('View shop')}</button>
                  : <button onClick={() => openPanel('storefrontEdit' as PanelId)} style={navLinkBtn}>{t('Set up')}</button>} />
            )}
          </div>

          {/* Sales — headline split into This month / Year so far */}
          <div className="hub-mcol">
            <ColHeader icon="chart" title={t('Sales')} {...SALES_C} />
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricCard metricKey="sales" label={t('This month')} icon="trendingUp" {...SALES_C} from={monthStart} onClick={() => openHub('sales', t('Sales'))} />
              <MetricCard metricKey="sales" label={t('Year so far')} icon="trendingUp" {...SALES_C} from={yearStart} onClick={() => openHub('sales', t('Sales'))} />
              <MetricCard metricKey="sold" label={t('Sold')} icon="cart" {...SALES_C} onClick={() => openHub('sold', t('Sold'))} />
              <MetricCard metricKey="beingWatched" label={t('Being watched')} icon="heart" {...SALES_C} onClick={() => openHub('beingWatched', t('Being watched'))} />
            </div>
          </div>

          {/* Orders — headline split into This month / Year so far */}
          <div className="hub-mcol">
            <ColHeader icon="clipboard" title={t('Orders')} {...ORDERS_C} />
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricCard metricKey="orders" label={t('This month')} icon="package" {...ORDERS_C} from={monthStart} onClick={() => openHub('orders', t('Orders'))} />
              <MetricCard metricKey="orders" label={t('Year so far')} icon="package" {...ORDERS_C} from={yearStart} onClick={() => openHub('orders', t('Orders'))} />
              <MetricCard metricKey="toShip" label={t('To ship')} icon="truck" {...ORDERS_C} onClick={() => openHub('toShip', t('To ship'))} />
              <MetricCard metricKey="incomeDue" label={t('Income due')} icon="coins" {...ORDERS_C} onClick={() => openHub('incomeDue', t('Income due'))} />
            </div>
          </div>

          {/* Purchasing — headline split into This month / Year so far */}
          <div className="hub-mcol">
            <ColHeader icon="award" title={t('Purchasing')} {...PURCH_C} />
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricCard metricKey="purchased" label={t('This month')} icon="tag" {...PURCH_C} from={monthStart} onClick={() => openHub('purchased', t('Purchased'))} />
              <MetricCard metricKey="purchased" label={t('Year so far')} icon="tag" {...PURCH_C} from={yearStart} onClick={() => openHub('purchased', t('Purchased'))} />
              <MetricCard metricKey="watching" label={t('Watching')} icon="eye" {...PURCH_C} onClick={() => openHub('watching', t('Watching'))} />
              <MetricCard metricKey="toPay" label={t('To pay')} icon="wallet" {...PURCH_C} onClick={() => openHub('toPay', t('To pay'))} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MENU + PANEL ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr', marginTop: 14 }} className="member-body">
        <nav style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'start' }} className="member-menu">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', borderRadius: 12, padding: '11px 12px', cursor: 'pointer',
              background: section === s.id ? 'var(--sand)' : 'transparent', color: 'var(--dark)',
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900,
            }}>
              <span style={{ color: section === s.id ? 'var(--orange)' : '#9a8f7f', display: 'inline-flex' }}><Icon name={s.icon} size={17} strokeWidth={2} /></span>
              {t(s.label)}
            </button>
          ))}
          {/* Log out — always the last option. */}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', borderRadius: 12, padding: '11px 12px', cursor: 'pointer',
            background: 'transparent', color: '#ef4444', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, marginTop: 4,
          }}>
            <span style={{ color: '#ef4444', display: 'inline-flex' }}><Icon name="login" size={17} strokeWidth={2} /></span>
            {t('Log out')}
          </button>
        </nav>

        <section id="hub-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Quick-action pills — centred directly over the sponsor banner.
              Both hubs get Sell now + Offer a service (Handy Help); the Business
              Hub adds the business-only shortcuts. */}
          {(
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {([
                ['🏷️', t('Sell now'), () => openPanel('sell' as PanelId)],
                effBiz
                  ? ['🧰', t('Offer a service'), () => openPanel('handyPost' as PanelId, { kind: 'offer' })]
                  : ['🙋', t('Request a service'), () => openPanel('handyPost' as PanelId, { kind: 'request' })],
                ...(effBiz ? [
                  ['💼', t('Recruit'), () => router.push('/jobs')],
                  ['🏠', t('Property'), () => router.push('/property/new')],
                  ['📣', t('Buy banners'), () => router.push('/advertise')],
                  ['⚡', t('Grabitt now'), () => router.push('/grabitt-now')],
                ] as [string, string, () => void][] : []),
              ] as [string, string, () => void][]).map(([, label, onClick]) => (
                <button key={label} onClick={onClick} style={{
                  background: '#ffe0bb', color: 'var(--orange)', border: 'none',
                  borderRadius: 999, padding: '6px 13px', fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 900, letterSpacing: 0.5, cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>{label}</button>
              ))}
            </div>
          )}
          {/* Advertising banner at the top of every menu section. */}
          <BannerSlot position="user_dashboard" aspect="4.5 / 1" label="Dashboard" padded={false} />

          {section === 'hub' && hubView && <HubListView hubKey={hubView} title={hubTitle} />}

          {section === 'business' && me?.isBusiness && (<>
            <BusinessCentre businessVerified={me?.businessVerified} />
            {/* Admin Centre folded into the Business Centre (bank/payouts, profile,
                verification, account) — no separate menu item on the business hub. */}
            <AdminCentre me={me} onReload={onReload} payout={payout} setupPayouts={setupPayouts} openPanel={openPanel} goInterests={() => setSection('employment')} />
          </>)}

          {section === 'messages' && (
            /* Advertising banner on top, then the full inbox (list + preview),
               all in one rounded container. */
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {me?.id && <InboxClient me={me.id} alertUnread={0} />}
            </div>
          )}

          {section === 'aboutme' && <AttributesCard />}

          {section === 'employment' && (<>
            <div style={card}>
              {effBiz ? (
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.5 }}>
                  {t('Tag the roles you hire for and the experience and languages you need. Post a job advert or search the candidate database from the Recruit pill or the Business Centre.')}
                </div>
              ) : (<>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{t('I am looking for work')}</span>
                  <input type="checkbox" checked={!!me?.openToWork} onChange={toggleOpenToWork} style={{ width: 18, height: 18, accentColor: 'var(--orange)' }} />
                </label>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#1a1a1a', marginTop: 8, lineHeight: 1.5 }}>
                  {t('Your CV is built automatically from the roles, experience and details you add below. Use “Show my CV” to preview what recruiters see.')}
                </div>
              </>)}
            </div>
            <JobCategories me={me} onReload={onReload} mode={effBiz ? 'employer' : 'seeker'} />
          </>)}

          {section === 'listings' && (<>
            <div style={{ display: 'flex', gap: 6, background: '#fff', border: '1px solid #ece3d7', borderRadius: 50, padding: 5, overflowX: 'auto' }}>
              {(([['active', t('On sale')], ['sold', t('Sold')], ['draft', t('Drafts')], ['buying', t('Buying')]]) as [Seg, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setSeg(id)} style={{ flex: '1 0 auto', border: 'none', borderRadius: 50, padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap', background: seg === id ? 'var(--sand)' : 'transparent', color: seg === id ? 'var(--dark)' : '#7a6a55', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900 }}>{label}</button>
              ))}
            </div>

            {seg !== 'buying' ? (
              <div style={card}>
                <div style={cardHead}>{t('My Listings')}</div>
                {listings === null ? <Muted>{t('Loading…')}</Muted> : shown.length === 0 ? <Muted>{t('Nothing here yet.')}</Muted> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                    {shown.map(c => (
                      <div key={c.ref} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
                        <Link href={seg === 'draft' ? `/listings/${c.ref}/edit` : `/listings/${c.ref}`} style={{ textDecoration: 'none' }}>
                          <div style={{ paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                            {c.image ? <img src={c.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{c.emoji}</div>}
                          </div>
                          <div style={{ padding: '8px 8px 4px' }}>
                            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>{c.price}</div>
                          </div>
                        </Link>
                        {seg === 'draft' ? (
                          <div style={{ display: 'flex', borderTop: '1px solid #f3ede4' }}>
                            <Link href={`/listings/${c.ref}/edit`} style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '7px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: 'var(--orange)' }}>{t('Resume')}</Link>
                            <button onClick={async () => { if (!(await confirmDialog({ message: t('Delete this draft?'), confirmLabel: t('Delete'), danger: true }))) return; try { await (trpcAuthed() as any).listings.deleteDraft.mutate({ id: c.ref }); setListings(prev => (prev ?? []).filter((x: any) => x.id !== c.ref)) } catch {} }} style={{ flexShrink: 0, background: 'none', border: 'none', borderLeft: '1px solid #f3ede4', padding: '7px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#ef4444', cursor: 'pointer' }}>{t('Delete')}</button>
                          </div>
                        ) : seg !== 'sold' && <Link href={`/listings/${c.ref}/edit`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', borderTop: '1px solid #f3ede4', padding: '7px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#1a1a1a' }}>{t('Edit')}</Link>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={card}>
                <div style={cardHead}>{t('Buying')}</div>
                {purchases === null ? <Muted>{t('Loading…')}</Muted> : purchases.length === 0 ? <Muted>{t('No purchases yet.')}</Muted> : purchases.map((p: any) => (
                  <Link key={p.id} href={`/listings/${p.listing?.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.listing?.images?.[0] ? <img src={p.listing.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.listing?.title ?? t('Item')}</div>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{t(TX_LABEL[p.status] ?? p.status)}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>€{Number(p.amount).toLocaleString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Offers received */}
            <div style={card}>
              <div style={cardHead}>{t('Offers received')}</div>
              {offers === null ? <Muted>{t('Loading…')}</Muted> : offers.length === 0 ? <Muted>{t('No offers to review.')}</Muted> : offers.map((o: any) => (
                <div key={o.id} style={{ borderBottom: '1px solid #f5f5f5', padding: '10px 0' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.listing?.images?.[0] ? <img src={o.listing.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.listing?.title}</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{t('A buyer offered')}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)' }}>€{Number(o.amount).toLocaleString()}</div>
                  </div>
                  {o.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => respond(o.id, 'accept')} disabled={busyId === o.id} style={{ flex: 1, background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>{busyId === o.id ? '…' : t('Accept')}</button>
                      <button onClick={() => respond(o.id, 'decline')} disabled={busyId === o.id} style={{ flex: 1, background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, padding: '8px 0', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>{t('Decline')}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </>)}

          {section === 'disputes' && <DisputesList />}

          {section === 'suggest' && <SuggestIdeas me={me} />}

          {section === 'admin' && (
            <AdminCentre me={me} onReload={onReload} payout={payout} setupPayouts={setupPayouts} openPanel={openPanel} goInterests={() => setSection('employment')} />
          )}

          {section === 'saved' && (<>
            {/* Saved / watching — rendered inline (the Watching pill lands here). */}
            <div style={card}>
              <div style={cardHead}>{t('Saved & watching')}</div>
              {watched === null ? <Muted>{t('Loading…')}</Muted> : watched.length === 0 ? <Muted>{t('Nothing saved yet.')}</Muted> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {watched.map((f: any) => {
                    const l = f.listing
                    const img = Array.isArray(l?.images) ? l.images[0] : null
                    return (
                      <Link key={f.listingId ?? l?.id} href={`/listings/${l?.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
                          <div style={{ paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                            {img ? <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🛍️</div>}
                          </div>
                          <div style={{ padding: '8px 8px 6px' }}>
                            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l?.title}</div>
                            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>€{Number(l?.price ?? 0).toLocaleString()}</div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </>)}

          {section === 'recommended' && (
            <div style={card}>
              <div style={cardHead}>{t('Recommended for you')}</div>
              {recommended === null ? <Muted>{t('Loading…')}</Muted> : recommended.length === 0 ? <Muted>{t('Recommendations will appear as you browse.')}</Muted> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {recommended.map((it: any) => (
                    <Link key={it.id} href={`/listings/${it.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                          {it.image ? <img src={it.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{it.emoji ?? '🛍️'}</div>}
                        </div>
                        <div style={{ padding: '8px 8px 6px' }}>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>{it.price}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'recent' && (
            <div style={card}>
              <div style={cardHead}>{t('Recently viewed')}</div>
              {recent.length === 0 ? <Muted>{t('Items you view will appear here.')}</Muted> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {recent.map(r => (
                    <Link key={r.id} href={`/listings/${r.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                          {r.image ? <img src={r.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{r.emoji ?? '🛍️'}</div>}
                        </div>
                        <div style={{ padding: '8px 8px 6px' }}>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>{r.price}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'loyalty' && (<>
            <RewardsCard />
            <AffiliateCard />
          </>)}

          {section === 'addbiz' && (<>
            <button onClick={() => router.push('/for-business')} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
              <Icon name="building" size={20} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Go to Business')}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Open a storefront, upgrade and see plans.')}</div>
              </div>
              <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
            </button>
            {/* Apply as charity (and Student / Blue Light) */}
            <MemberStatusCard />
          </>)}

          {section === 'activity' && <HandyMyPostsCard />}
          {section === 'activity' && <HandyProposalsCard />}
          {section === 'activity' && <HandyMyProposalsCard />}

          {section === 'activity' && (
            <div style={card}>
              <div style={cardHead}>{t('Activity Centre')}</div>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: i === ACTIVITY.length - 1 ? 'none' : '1px solid #f5f5f5', alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, background: `${a.color}18`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{a.detail}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{a.time}</div>
                </div>
              ))}
            </div>
          )}

          {section === 'gdpr' && <GdprView />}
        </section>
      </div>

      <style>{`
        .member-hub .hub-mcol{ padding-top: 12px; margin-top: 12px; border-top: 1px dashed #e2e6ef; }
        @media (min-width: 880px){
          .member-hub{ grid-template-columns: 240px 1fr 1fr 1fr !important; align-items: start; }
          .member-hub .hub-mcol{ border-top: none; margin-top: 0; padding: 0 16px; }
          /* Vertical dividers only between the three metric columns. */
          .member-hub .hub-mcol + .hub-mcol{ border-left: 1px solid #e2e6ef; }
        }
        @media (min-width: 900px){ .member-body{ grid-template-columns: 240px 1fr !important; } .member-menu{ position: sticky; top: 70px; } }
      `}</style>
    </>
  )
}

function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: last ? 'none' : '1px solid #f5f0e8' }}>
      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#888', fontWeight: 700 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: 'var(--dark)', fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--orange)', fontWeight: 800, fontFamily: 'var(--font-nunito)', fontSize: 12.5 }
const navLinkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--orange)', fontWeight: 800, fontFamily: 'var(--font-nunito)', fontSize: 11.5, whiteSpace: 'nowrap' }

// One row of the profile sidebar: icon + label + value, kept to a single line.
// Inline-editable business name for the Business Hub. Business Light accounts
// have no storefront, so this is where they set the name shown across Grabitt.
function EditableBusinessName({ initial }: { initial: string }) {
  const [name, setName] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const v = draft.trim()
    if (v.length < 2) { toast(t('Enter a business name (2+ characters).')); return }
    setBusy(true)
    try { await (trpcAuthed() as any).business.setBusinessName.mutate({ name: v }); setName(v); setEditing(false) }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save.') } finally { setBusy(false) }
  }
  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('Business name')} autoFocus
          style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--orange)', borderRadius: 8, padding: '4px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, background: '#fff', color: 'var(--dark)' }} />
        <button onClick={save} disabled={busy} style={{ flexShrink: 0, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 9px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>{busy ? '…' : '✓'}</button>
      </div>
    )
  }
  return (
    <button onClick={() => { setDraft(name); setEditing(true) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--orange)', maxWidth: '100%' }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏢 {name || t('Add business name')}</span>
      <Icon name="pencil" size={10} strokeWidth={2.5} />
    </button>
  )
}

function HubNavRow({ icon, label, value, iconColor, last }: { icon: IconName; label: string; value: React.ReactNode; iconColor?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 2px', borderBottom: last ? 'none' : '1px dotted rgba(180,120,60,0.35)' }}>
      <span style={{ color: iconColor ?? 'var(--orange)', display: 'inline-flex', flexShrink: 0 }}><Icon name={icon} size={16} strokeWidth={2} /></span>
      <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: '#6a5a48', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  )
}

// One clickable "My Hub" pill — an oval showing "Label — value" with its own
// date-range selector (per Steve). Each pill fetches its own scoped metric.
type MetricKey = 'sales' | 'sold' | 'beingWatched' | 'orders' | 'toShip' | 'incomeDue' | 'purchased' | 'watching' | 'toPay'

// One white metric card: a tinted circular icon, the label, and the value in the
// column's theme colour.
function MetricCard({ metricKey, label, icon, color, tint, onClick, from }: { metricKey: MetricKey; label: string; icon: IconName; color: string; tint: string; onClick: () => void; from?: string }) {
  const [data, setData] = useState<{ value: number; currency: boolean } | null>(null)
  useEffect(() => {
    let live = true
    ;(trpcAuthed() as any).users.hubMetric.query({ key: metricKey, ...(from ? { from } : {}) }).then((d: any) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [metricKey, from])
  const val = data ? (data.currency ? `€${Number(data.value).toLocaleString()}` : String(data.value)) : '—'
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: '#fff', border: '1px solid #eef0f4', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(30,43,85,0.05)', textAlign: 'left' }}>
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: tint, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={19} strokeWidth={2} /></span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#334', letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color, textAlign: 'right' }}>{val}</span>
    </button>
  )
}

// The list behind a hub card, shown in the panel below when a card is clicked.
function HubListView({ hubKey, title }: { hubKey: MetricKey; title: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    let live = true
    setRows(null)
    ;(trpcAuthed() as any).users.hubList.query({ key: hubKey }).then((d: any) => { if (live) setRows(d as any[]) }).catch(() => { if (live) setRows([]) })
    return () => { live = false }
  }, [hubKey])
  return (
    <div style={card}>
      <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between' }}><span>{title}</span>{rows && <span style={{ color: 'var(--orange)' }}>{rows.length}</span>}</div>
      {rows === null ? <Muted>{t('Loading…')}</Muted> : rows.length === 0 ? <Muted>{t('Nothing here yet.')}</Muted> : rows.map((r: any, i: number) => (
        <Link key={r.listingId + i} href={`/listings/${r.listingId}`} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.image ? <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{r.subtitle}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>{r.price}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

// My disputes — rendered inline (like the messages list), not a pop-up.
const DISPUTE_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: '#ef4444' },
  under_review: { label: 'Under review', color: '#d97706' },
  awaiting_response: { label: 'Awaiting response', color: '#d97706' },
  resolved: { label: 'Resolved', color: '#16a34a' },
  rejected: { label: 'Rejected', color: '#888' },
  closed: { label: 'Closed', color: '#888' },
}
function DisputesList() {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    let live = true
    ;(trpcAuthed() as any).disputes.mine.query().then((d: any) => { if (live) setRows(d as any[]) }).catch(() => { if (live) setRows([]) })
    return () => { live = false }
  }, [])
  return (
    <div style={card}>
      <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between' }}><span>{t('My Disputes')}</span>{rows && <span style={{ color: 'var(--orange)' }}>{rows.length}</span>}</div>
      {rows === null ? <Muted>{t('Loading…')}</Muted> : rows.length === 0 ? <Muted>{t('No disputes — nice and smooth.')}</Muted> : rows.map((d: any) => {
        const l = d.transaction?.listing
        const image = Array.isArray(l?.images) ? l.images[0] : null
        const st = DISPUTE_STATUS[d.status] ?? { label: String(d.status ?? '').replace(/_/g, ' '), color: '#888' }
        return (
          <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{image ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛡️'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l?.title ?? t('Item')}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.reason || t('Dispute raised')}</div>
            </div>
            <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: st.color, background: `${st.color}18`, borderRadius: 50, padding: '3px 10px' }}>{st.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Handy Help — proposals received on my posts. Review and accept; contact is
// revealed to the responder (and shown here) once accepted.
function HandyProposalsCard() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState('')
  const load = () => { (trpcAuthed() as any).handy.receivedProposals.query().then((d: any) => setRows(d as any[])).catch(() => setRows([])) }
  useEffect(() => { load() }, [])
  const accept = async (id: string) => {
    setBusy(id)
    try { await (trpcAuthed() as any).handy.acceptProposal.mutate({ proposalId: id }); load() }
    catch { toast(t('Could not accept. Please try again.')) } finally { setBusy('') }
  }
  if (rows !== null && rows.length === 0) return null
  return (
    <div style={card}>
      <div style={cardHead}>🔧 {t('Handy Help — responses to your posts')}</div>
      {rows === null ? <Muted>{t('Loading…')}</Muted> : rows.map((p: any) => (
        <div key={p.id} style={{ padding: '11px 0', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.responder.displayName}{p.responder.rating ? ` · ★ ${Number(p.responder.rating).toFixed(1)}` : ''}</span>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#888', whiteSpace: 'nowrap' }}>{t('re')}: {p.listing.title}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#444', lineHeight: 1.5, marginBottom: 8 }}>{p.message}</div>
          {p.status === 'accepted' ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#16a34a' }}>
              ✓ {t('Accepted')} — {[p.responder.phone, p.responder.email].filter(Boolean).join(' · ') || t('contact shared')}
            </div>
          ) : (
            <button onClick={() => accept(p.id)} disabled={busy === p.id} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: busy === p.id ? 'wait' : 'pointer' }}>{busy === p.id ? t('Accepting…') : t('Accept & share my contact')}</button>
          )}
        </div>
      ))}
    </div>
  )
}

// Handy Help — proposals I've sent as a responder, and their status.
function HandyMyProposalsCard() {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => { (trpcAuthed() as any).handy.myProposals.query().then((d: any) => setRows(d as any[])).catch(() => setRows([])) }, [])
  if (rows !== null && rows.length === 0) return null
  const STATUS: Record<string, { label: string; color: string }> = {
    sent: { label: 'Awaiting reply', color: '#3b82f6' }, accepted: { label: 'Accepted ✓', color: '#16a34a' }, declined: { label: 'Declined', color: '#888' },
  }
  return (
    <div style={card}>
      <div style={cardHead}>🔧 {t('Handy Help — your responses')}</div>
      {rows === null ? <Muted>{t('Loading…')}</Muted> : rows.map((p: any) => {
        const st = STATUS[p.status] ?? STATUS.sent
        const img = Array.isArray(p.listing?.images) ? p.listing.images[0] : null
        return (
          <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔧'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.listing?.title ?? t('Post')}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.message}</div>
            </div>
            <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: st.color, background: `${st.color}18`, borderRadius: 50, padding: '3px 10px' }}>{st.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Handy Help — the posts I placed. Mark one as sorted, or answer the 7-day
// "do you still need help?" prompt (Yes relists for another 7 days, No closes it).
function HandyMyPostsCard() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState('')
  const load = () => { (trpcAuthed() as any).handy.myPosts.query().then((d: any) => setRows(d as any[])).catch(() => setRows([])) }
  useEffect(() => { load() }, [])
  const resolve = async (id: string) => {
    setBusy(id)
    try { await (trpcAuthed() as any).handy.markResolved.mutate({ listingId: id }); load() }
    catch { toast(t('Could not update. Please try again.')) } finally { setBusy('') }
  }
  const confirm = async (id: string, stillNeeded: boolean) => {
    setBusy(id)
    try { await (trpcAuthed() as any).handy.confirmStillNeeded.mutate({ listingId: id, stillNeeded }); load() }
    catch { toast(t('Could not update. Please try again.')) } finally { setBusy('') }
  }
  const active = (rows ?? []).filter((r: any) => r.status === 'active')
  if (rows !== null && active.length === 0) return null
  return (
    <div style={card}>
      <div style={cardHead}>🔧 {t('Handy Help — your posts')}</div>
      {rows === null ? <Muted>{t('Loading…')}</Muted> : active.map((p: any) => {
        const daysLeft = Math.max(0, Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 86400000))
        return (
          <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔧'}</div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: p.awaitingConfirm ? '#b45309' : '#888' }}>{p.awaitingConfirm ? t('Do you still need help?') : `${daysLeft} ${daysLeft === 1 ? t('day') : t('days')} ${t('left')}`}</div>
            </div>
            {p.awaitingConfirm ? (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => confirm(p.id, true)} disabled={busy === p.id} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>{t('Yes, keep it live')}</button>
                <button onClick={() => confirm(p.id, false)} disabled={busy === p.id} style={{ background: '#fff', color: '#888', border: '1.5px solid #e5e5e5', borderRadius: 10, padding: '7px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{t('No')}</button>
              </div>
            ) : (
              <button onClick={() => resolve(p.id)} disabled={busy === p.id} style={{ flexShrink: 0, background: '#fff', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '7px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{t('Got the help ✓')}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Suggest ideas — a quick note that lands in the CRM as a feature suggestion.
function SuggestIdeas({ me }: { me: any }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const submit = async () => {
    if (msg.trim().length < 3) return
    setBusy(true)
    try {
      await (trpcAuthed() as any).crm.submitIdea.mutate({ message: msg.trim() })
      setDone(true); setMsg('')
    } catch { toast(t('Could not send. Please try again.')) }
    finally { setBusy(false) }
  }
  return (
    <div style={card}>
      <div style={cardHead}>{t('Suggest ideas')}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.6, marginBottom: 10 }}>
        {t('Got an idea to make Grabitt better? Tell us — every suggestion goes straight to the team.')}
      </div>
      {done ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#16a34a' }}>
          ✓ {t('Thanks! Your idea has been sent to the team — a copy is in your inbox.')}
          <button onClick={() => setDone(false)} style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}>{t('Suggest another')}</button>
        </div>
      ) : (
        <>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} placeholder={t('Your idea…')}
            style={{ ...field, resize: 'vertical', minHeight: 100, marginBottom: 10 }} />
          <button onClick={submit} disabled={busy || msg.trim().length < 3} style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: busy ? 'wait' : 'pointer', opacity: msg.trim().length < 3 ? 0.6 : 1 }}>
            {busy ? t('Sending…') : t('Send idea')}
          </button>
        </>
      )}
    </div>
  )
}

// Privacy & GDPR — consent record (when policies were accepted) + a GDPR
// deletion request.
function GdprView() {
  const [status, setStatus] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    let live = true
    ;(trpcAuthed() as any).compliance.status.query().then((d: any) => { if (live) setStatus(d) }).catch(() => { if (live) setStatus({}) })
    return () => { live = false }
  }, [])
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const canDelete = confirmDelete.trim().toUpperCase() === 'DELETE'
  const deleteAccount = async () => {
    if (!canDelete) return
    if (!(await confirmDialog({ title: t('Delete account?'), message: t('This permanently anonymises your account and signs you out. It cannot be undone. Continue?'), confirmLabel: t('Delete'), danger: true }))) return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'failed')
      await createClient().auth.signOut()
      window.location.href = '/?deleted=1'
    } catch { toast(t('Could not complete the deletion. Please contact privacy@grabitt.net.')); setDeleting(false) }
  }
  return (<>
    <div style={card}>
      <div style={cardHead}>{t('Your privacy record')}</div>
      <Row label={t('Account created')} value={fmt(status?.accountCreatedAt)} />
      <Row label={t('Terms & GDPR accepted')} value={status?.gdprAccepted ? fmt(status?.gdprAcceptedAt ?? status?.accountCreatedAt) : t('At sign-up')} />
      <Row label={t('Right-to-withdraw waiver')} value={status?.withdrawalWaiverAccepted ? fmt(status?.withdrawalWaiverAcceptedAt) : t('Not accepted')} />
      <Row label={t('Marketing emails')} value={status?.marketingConsent ? `${t('Opted in')} · ${fmt(status?.marketingConsentAt)}` : t('Not opted in')} last />
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#999', marginTop: 10, lineHeight: 1.5 }}>{t('These are the consents on record for your account. You can change your marketing choice any time in Admin Centre → Email preferences.')}</div>
    </div>
    <div style={{ ...card, border: '1px solid #fecaca' }}>
      <div style={{ ...cardHead, color: '#ef4444' }}>{t('Request deletion (GDPR)')}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', lineHeight: 1.6, marginBottom: 10 }}>{t('Under the GDPR you can erase your personal data at any time. This happens immediately — your name, contact details and avatar are removed. Sales and purchase records are retained (legally required, and the other party has rights over them) but detached from your identity.')}</div>
      <label style={fieldLabel}>{t('Type DELETE to confirm')}</label>
      <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder="DELETE" style={field} />
      <button onClick={deleteAccount} disabled={deleting || !canDelete} style={{ width: '100%', background: canDelete ? '#ef4444' : '#f0f0f0', color: canDelete ? '#fff' : '#aaa', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: canDelete ? 'pointer' : 'not-allowed' }}>{deleting ? t('Deleting…') : t('Permanently delete my data')}</button>
    </div>
  </>)
}

// Column theme + a heading with an icon in a coloured circle.
function ColHeader({ icon, title, color, tint }: { icon: IconName; title: string; color: string; tint: string }) {
  // Left padding matches the metric pills' inner padding so the header icon
  // (and text) line up exactly with the pill icons/text below.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '0 14px' }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', background: tint, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={18} strokeWidth={2.2} /></span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 900, color: '#1e2b55', letterSpacing: 0.5 }}>{title}</span>
    </div>
  )
}

const SALES_C = { color: '#2e8b3d', tint: '#e8f3e9' }
const ORDERS_C = { color: '#3b6fd4', tint: '#e8effb' }
const PURCH_C = { color: '#7b4fc9', tint: '#f0eaf9' }

// Admin Centre — profile & details, payouts, verify, add business, tenant
// profile, member status and close account, per Steve's Admin column.
function AdminCentre({ me, onReload, payout, setupPayouts, openPanel, goInterests }: {
  me: any; onReload: () => void; payout: any; setupPayouts: () => void; openPanel: (id: PanelId) => void; goInterests: () => void
}) {
  const [fullName, setFullName] = useState(me?.fullName ?? '')
  const [displayName, setDisplayName] = useState(me?.displayName ?? '')
  const [phone, setPhone] = useState(me?.phone ?? '')
  const [address, setAddress] = useState(me?.collectionAddress ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [newEmail, setNewEmail] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'sent'>('idle')
  const [emailError, setEmailError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)

  const save = async () => {
    setState('saving')
    try {
      await trpcAuthed().users.updateProfile.mutate({
        fullName: fullName.trim() || null,
        displayName: displayName.trim() || undefined,
        phone: phone.trim(),
        collectionAddress: address.trim(),
      })
      setState('saved'); onReload(); setTimeout(() => setState('idle'), 2500)
    } catch { setState('idle'); toast(t('Could not save. Please try again.')) }
  }

  const changeEmail = async () => {
    const next = newEmail.trim().toLowerCase()
    setEmailError('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) { setEmailError(t('Enter a valid email address.')); return }
    if (next === (me?.email ?? '').toLowerCase()) { setEmailError(t('That is already your email address.')); return }
    setEmailState('saving')
    try {
      const { error } = await createClient().auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` })
      if (error) { setEmailError(error.message); setEmailState('idle'); return }
      setEmailState('sent')
    } catch { setEmailError(t('Could not start the email change. Please try again.')); setEmailState('idle') }
  }

  const deleteAccount = async () => {
    if (confirmDelete.trim().toUpperCase() !== 'DELETE') return
    if (!(await confirmDialog({ title: t('Delete account?'), message: t('This permanently anonymises your account and signs you out. It cannot be undone. Continue?'), confirmLabel: t('Delete'), danger: true }))) return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'failed')
      await createClient().auth.signOut()
      window.location.href = '/?deleted=1'
    } catch { toast(t('Could not complete the deletion. Please contact privacy@grabitt.net.')); setDeleting(false) }
  }

  return (
    <>
      {/* Profile & details */}
      <div style={card}>
        <div style={cardHead}>{t('Profile & details')}</div>
        <label style={fieldLabel}>{t('Name')} <span style={{ color: '#bbb' }}>({t('private')})</span></label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('Your full name')} style={field} />
        <label style={fieldLabel}>{t('Screen name')}</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('Shown on your listings')} style={field} />
        <label style={fieldLabel}>{t('Contact phone')}</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+34 600 000 000" style={field} />
        <label style={fieldLabel}>{t('Collection address')}</label>
        <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder={t('Street, town, postcode')} style={{ ...field, minHeight: 64, resize: 'vertical' }} />
        <button onClick={save} disabled={state === 'saving'} style={{ ...primaryBtn, ...(state === 'saved' ? { color: 'var(--sage)' } : {}) }}>{state === 'saving' ? t('Saving…') : state === 'saved' ? t('Saved ✓') : t('Save details')}</button>
      </div>

      {/* Account email */}
      <div style={card}>
        <div style={cardHead}>{t('Account email')}</div>
        <label style={fieldLabel}>{t('Current email')}</label>
        <div style={{ ...field, background: '#f7f4ee', color: '#555', display: 'flex', alignItems: 'center' }}>{me?.email ?? '—'}</div>
        {emailState === 'sent' ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#16a34a', lineHeight: 1.5 }}>{t('Confirmation sent. Click the link in that email to finish the change.')}</div>
        ) : (<>
          <label style={fieldLabel}>{t('New email')}</label>
          <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailError('') }} type="email" placeholder="you@example.com" style={field} />
          {emailError && <div style={{ marginTop: -6, marginBottom: 8, fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#ef4444' }}>{emailError}</div>}
          <button onClick={changeEmail} disabled={emailState === 'saving'} style={primaryBtn}>{emailState === 'saving' ? t('Sending…') : t('Send confirmation link')}</button>
        </>)}
      </div>

      {/* Bank / Card / Payouts */}
      <button onClick={setupPayouts} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
        <Icon name="coins" size={20} strokeWidth={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{payout?.payoutsEnabled ? t('Bank & payouts — manage') : t('Bank details, card & payouts')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{payout?.payoutsEnabled ? t('Sales pay out to you at handover.') : t('Connect Stripe to receive money from sales.')}</div>
        </div>
        <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
      </button>

      {/* Verify */}
      {!me?.isVerified && (
        <button onClick={() => openPanel('verifyMe' as PanelId)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
          <Icon name="shield" size={20} strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Verify — people')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Get the shield buyers look for.')}</div>
          </div>
          <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
        </button>
      )}

      {/* Add business — personal accounts only (a business already has one) */}
      {!me?.isBusiness && (
      <button onClick={() => openPanel('business' as PanelId)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
        <Icon name="building" size={20} strokeWidth={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Add business')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Open a business account and storefront.')}</div>
        </div>
        <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
      </button>
      )}

      {/* Areas of interest */}
      <button onClick={goInterests} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
        <Icon name="star" size={20} strokeWidth={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Areas of interest')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Tune your feed, alerts and job matches.')}</div>
        </div>
        <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
      </button>

      {/* Tenant profile — renters only, not relevant for a business account */}
      {!me?.isBusiness && <TenantProfileCard />}

      {/* Property-agent contact — business/agent accounts only */}
      {me?.isBusiness && <AgentProfileCard />}

      {/* Account deletion lives under Privacy & GDPR. */}
    </>
  )
}
