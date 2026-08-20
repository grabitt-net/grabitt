'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
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
import { deptEmoji, toPanelItem } from '@/lib/listingMap'
import { getViews, type RecentCard } from '@/lib/recentViews'
import { t } from '@/lib/i18n'

// ── Personal member dashboard ────────────────────────────────────────────────
// Steve's hand-drawn "Member Zone" layout, personal accounts only (business
// accounts keep their own hub). A three-box top strip (profile · selling
// snapshot · dashboard pills) over an 8-section left menu that swaps the right
// panel. It sits BELOW the existing header + Grabitt NOW promo.

type SectionId = 'messages' | 'employment' | 'listings' | 'admin' | 'saved' | 'recommended' | 'recent' | 'loyalty' | 'addbiz' | 'activity'
type Seg = 'active' | 'sold' | 'draft' | 'buying'

const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: 'messages', label: 'Message Centre', icon: 'message' },
  { id: 'employment', label: 'Employment & CV', icon: 'briefcase' },
  { id: 'listings', label: 'Listings & Disputes', icon: 'tag' },
  { id: 'admin', label: 'Admin Centre', icon: 'user' },
  { id: 'saved', label: 'Saved Listings & Offers', icon: 'heart' },
  { id: 'recommended', label: 'Recommended for You', icon: 'sparkle' },
  { id: 'recent', label: 'Recently Viewed', icon: 'search' },
  { id: 'loyalty', label: 'Loyalty Centre', icon: 'coins' },
  { id: 'addbiz', label: 'Add Business or Charity', icon: 'building' },
  { id: 'activity', label: 'Activity Centre', icon: 'package' },
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

export default function MemberDashboard({ me, onReload }: { me: any; onReload: () => void }) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [section, setSection] = useState<SectionId>('listings')
  const [seg, setSeg] = useState<Seg>('active')
  const sortNewest = true // My Listings default to newest-first

  const [dash, setDash] = useState<any>(null)
  const [listings, setListings] = useState<any[] | null>(null)
  const [offers, setOffers] = useState<any[] | null>(null)
  const [threads, setThreads] = useState<any[] | null>(null)
  const [purchases, setPurchases] = useState<any[] | null>(null)
  const [watched, setWatched] = useState<any[] | null>(null)
  const [recommended, setRecommended] = useState<any[] | null>(null)
  const [payout, setPayout] = useState<any>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
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

  const toggleOpenToWork = async () => {
    const next = !me?.openToWork
    try {
      await trpcAuthed().users.updateProfile.mutate({ openToWork: next })
      onReload()
      // Choosing "looking for work" jumps straight to attributes (per Steve).
      if (next) setSection('employment')
    } catch { toast(t('Could not update. Please try again.')) }
  }

  // Identity helpers
  const memberSince = me?.createdAt ? new Date(me.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'
  const memberRef = me?.id ? `M${String(me.id).replace(/-/g, '').slice(0, 6).toUpperCase()}` : ''
  const accountType = me?.memberStatus === 'blue_light' ? 'Bluelight' : me?.memberStatus === 'student' ? 'Student' : me?.memberStatus === 'charity' ? 'Charity' : 'Regular'

  return (
    <>
      {/* ── MY HUB — profile column + Sales/Purchasing pills (per Steve) ─────── */}
      <div style={{ border: '3px solid #111', borderRadius: 16, padding: '14px 14px 14px', background: '#fff' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 12 }}>{t('My Hub')}</div>
        <div style={{ display: 'grid', gap: 0, gridTemplateColumns: '1fr' }} className="member-hub">
          {/* Profile — thick black border */}
          <div style={{ border: '2px solid #111', borderRadius: 12, padding: 12, alignSelf: 'start' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--sand)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontWeight: 900, fontSize: 19, fontFamily: 'var(--font-nunito)' }}>
                {me?.avatar ? <img src={me.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (me?.displayName ?? '?')[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 14.5, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me?.displayName ?? t('Your account')}</div>
                <button onClick={() => openPanel('myRatings' as PanelId)} style={{ ...linkBtn, fontSize: 11.5 }}>⭐ {me?.avgRating ? Number(me.avgRating).toFixed(1) : '—'}</button>
              </div>
            </div>
            <Row label={t('Account type')} value={accountType} />
            <Row label={t('Account ref')} value={memberRef} />
            <Row label={t('Verified')} value={me?.isVerified
              ? <span style={{ color: '#16a34a', fontWeight: 800 }}>{t('Yes')}</span>
              : <button onClick={() => openPanel('verifyMe' as PanelId)} style={linkBtn}>{t('Get verified')}</button>} />
            <Row label={t('Work required')} value={
              <button onClick={toggleOpenToWork} style={{ background: me?.openToWork ? '#eef7f0' : '#f5f0e8', border: 'none', borderRadius: 50, padding: '4px 12px', cursor: 'pointer', color: me?.openToWork ? '#16a34a' : '#777', fontWeight: 800, fontFamily: 'var(--font-nunito)', fontSize: 11.5 }}>
                {me?.openToWork ? t('Looking for work') : t('Not looking')}
              </button>} />
            <Row label={t('Business A/C')} value={
              <button onClick={() => me?.isBusiness ? router.push('/account?tab=business') : openPanel('business' as PanelId)} style={linkBtn}>
                {me?.isBusiness ? t('Open') : t('Add / Upgrade')}
              </button>} last />
          </div>

          {/* Sales — two divided columns of clickable oval pills */}
          <div className="hub-col">
            <div style={{ ...hubGroupHead, marginBottom: 12 }}>{t('Sales')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ display: 'grid', gap: 12, alignContent: 'start', paddingRight: 16 }}>
                <HubPill metricKey="sales" label={t('Sales')} onClick={() => { setSeg('sold'); setSection('listings') }} />
                <HubPill metricKey="sold" label={t('Sold')} onClick={() => { setSeg('sold'); setSection('listings') }} />
                <HubPill metricKey="beingWatched" label={t('Being watched')} onClick={() => setSection('listings')} />
              </div>
              <div className="sales-b" style={{ display: 'grid', gap: 12, alignContent: 'start', paddingLeft: 16 }}>
                <HubPill metricKey="orders" label={t('Orders')} onClick={() => setSection('listings')} />
                <HubPill metricKey="toShip" label={t('To ship')} onClick={() => setSection('listings')} />
                <HubPill metricKey="incomeDue" label={t('Income due')} onClick={() => setSection('listings')} />
              </div>
            </div>
          </div>

          {/* Purchasing */}
          <div className="hub-col">
            <div style={{ ...hubGroupHead, marginBottom: 12 }}>{t('Purchasing')}</div>
            <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
              <HubPill metricKey="purchased" label={t('Purchased')} onClick={() => { setSeg('buying'); setSection('listings') }} />
              <HubPill metricKey="watching" label={t('Watching')} onClick={() => setSection('saved')} />
              <HubPill metricKey="toPay" label={t('To pay')} onClick={() => { setSeg('buying'); setSection('listings') }} />
            </div>
          </div>
        </div>

      </div>

      {/* ── MENU + PANEL ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr', marginTop: 14 }} className="member-body">
        <nav style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'start' }} className="member-menu">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', borderRadius: 12, padding: '11px 12px', cursor: 'pointer',
              background: section === s.id ? 'var(--sand)' : 'transparent', color: 'var(--dark)',
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900,
            }}>
              <span style={{ color: section === s.id ? 'var(--orange)' : '#9a8f7f', display: 'inline-flex' }}><Icon name={s.icon} size={17} strokeWidth={2} /></span>
              {t(s.label)}
            </button>
          ))}
        </nav>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {section === 'messages' && (<>
            <Link href="/messages/alerts" style={{ textDecoration: 'none' }}>
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <Icon name="bell" size={20} strokeWidth={2} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Grabitt Alerts')}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Match alerts, price drops and your saved searches.')}</div>
                </div>
                <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
              </div>
            </Link>
            <div style={card}>
              <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between' }}><span>{t('Message Centre')}</span><Link href="/messages" style={{ color: 'var(--orange)', fontSize: 12, textDecoration: 'none' }}>{t('See all →')}</Link></div>
              {threads === null ? <Muted>{t('Loading…')}</Muted> : threads.length === 0 ? <Muted>{t('No conversations yet.')}</Muted> : threads.slice(0, 6).map((th: any) => {
                const other = th.participants?.find((p: any) => p.userId !== me?.id)?.user
                const last = th.messages?.[0]
                const unread = !!last && last.senderId !== me?.id && !last.readAt
                const preview = last ? (last.blocked ? t('Message hidden') : (last.senderId === me?.id ? t('You: ') : '') + last.body) : t('Start chatting…')
                return (
                  <Link key={th.id} href={`/messages/${th.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-nunito)' }}>{(other?.displayName ?? '?')[0]?.toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: unread ? 900 : 700, color: 'var(--dark)' }}>{other?.displayName ?? t('Grabitt user')}</div>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: unread ? 'var(--dark)' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
                      </div>
                      {unread && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--orange)' }} />}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>)}

          {section === 'employment' && (<>
            <div style={card}>
              <div style={cardHead}>{t('Employment & CV')}</div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{t('I am looking for work')}</span>
                <input type="checkbox" checked={!!me?.openToWork} onChange={toggleOpenToWork} style={{ width: 18, height: 18, accentColor: 'var(--orange)' }} />
              </label>
              <Link href="/cv" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9f6f2', border: '1px solid #efe7db', borderRadius: 12, padding: 12, cursor: 'pointer' }}>
                  <Icon name="briefcase" size={20} strokeWidth={2} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Build CV')}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('The CV recruiters get when you apply for jobs.')}</div>
                  </div>
                  <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
                </div>
              </Link>
            </div>
            <AttributesCard />
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
                        <Link href={`/listings/${c.ref}`} style={{ textDecoration: 'none' }}>
                          <div style={{ paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                            {c.image ? <img src={c.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{c.emoji}</div>}
                          </div>
                          <div style={{ padding: '8px 8px 4px' }}>
                            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>{c.price}</div>
                          </div>
                        </Link>
                        {seg !== 'sold' && <Link href={`/listings/${c.ref}/edit`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', borderTop: '1px solid #f3ede4', padding: '7px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#1a1a1a' }}>{t('Edit')}</Link>}
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

            <button onClick={() => openPanel('myDisputes' as PanelId)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
              <Icon name="shield" size={20} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('My Disputes')}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Open a dispute or track one in progress.')}</div>
              </div>
              <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
            </button>
          </>)}

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
            <div style={card}>
              <div style={cardHead}>{t('Orders')}</div>
              {purchases === null ? <Muted>{t('Loading…')}</Muted> : purchases.length === 0 ? <Muted>{t('No orders yet.')}</Muted> : purchases.slice(0, 8).map((p: any) => (
                <Link key={p.id} href={`/listings/${p.listing?.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.listing?.images?.[0] ? <img src={p.listing.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.listing?.title ?? t('Item')}</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{t(TX_LABEL[p.status] ?? p.status)}</div>
                    </div>
                  </div>
                </Link>
              ))}
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
            <button onClick={() => router.push('/employers')} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
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
        </section>
      </div>

      <style>{`
        .member-hub .hub-col{ padding-top: 12px; margin-top: 12px; border-top: 1px dashed #ddd; }
        .member-hub .sales-b{ border-left: 1px solid #cfcfcf; }
        @media (min-width: 820px){
          .member-hub{ grid-template-columns: minmax(160px, 0.8fr) 1.7fr 1fr !important; align-items: stretch; }
          .member-hub .hub-col{ border-top: none; margin-top: 0; padding-top: 0; padding-left: 16px; border-left: 1px solid #cfcfcf; }
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
const hubGroupHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }

// One clickable "My Hub" pill — an oval showing "Label — value" with its own
// date-range selector (per Steve). Each pill fetches its own scoped metric.
type MetricKey = 'sales' | 'sold' | 'beingWatched' | 'orders' | 'toShip' | 'incomeDue' | 'purchased' | 'watching' | 'toPay'
const RANGES: [number, string][] = [[0, 'All'], [1, '24h'], [7, '7d'], [30, '30d'], [90, '90d']]

function HubPill({ metricKey, label, onClick }: { metricKey: MetricKey; label: string; onClick: () => void }) {
  const [rangeIdx, setRangeIdx] = useState(0)
  const days = RANGES[rangeIdx][0]
  const [data, setData] = useState<{ value: number; currency: boolean } | null>(null)
  useEffect(() => {
    let live = true
    ;(trpcAuthed() as any).users.hubMetric.query({ key: metricKey, days }).then((d: any) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [metricKey, days])
  const val = data ? (data.currency ? `€${Number(data.value).toLocaleString()}` : String(data.value)) : '—'
  return (
    // Clean clickable oval: "Label — value", with a small per-pill date-range
    // chip at the right that cycles All → 24h → 7d → 30d → 90d.
    <button onClick={onClick} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #111', borderRadius: 999, padding: '10px 34px 10px 14px', background: '#fff', cursor: 'pointer', minWidth: 0, width: '100%' }}>
      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label} — <span style={{ color: 'var(--orange)', fontWeight: 900 }}>{val}</span>
      </span>
      <span
        role="button"
        aria-label={`${label} date range: ${RANGES[rangeIdx][1]}`}
        onClick={e => { e.stopPropagation(); setRangeIdx(i => (i + 1) % RANGES.length) }}
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: '#f0ece3', borderRadius: 999, padding: '1px 6px', fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 800, color: '#8a7f6b', cursor: 'pointer' }}
      >{RANGES[rangeIdx][1]}</span>
    </button>
  )
}

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

      {/* Add business */}
      <button onClick={() => openPanel('business' as PanelId)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
        <Icon name="building" size={20} strokeWidth={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Add business')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Open a business account and storefront.')}</div>
        </div>
        <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
      </button>

      {/* Areas of interest */}
      <button onClick={goInterests} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
        <Icon name="star" size={20} strokeWidth={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Areas of interest')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Tune your feed, alerts and job matches.')}</div>
        </div>
        <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
      </button>

      {/* Tenant profile */}
      <TenantProfileCard />

      {/* Close account */}
      <div style={{ ...card, border: '1px solid #fecaca' }}>
        <div style={{ ...cardHead, color: '#ef4444' }}>{t('Close account')}</div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', lineHeight: 1.6, marginBottom: 10 }}>{t('Under the GDPR you can erase your personal data at any time. This happens immediately.')}</div>
        <label style={fieldLabel}>{t('Type DELETE to confirm')}</label>
        <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder="DELETE" style={field} />
        <button onClick={deleteAccount} disabled={deleting || confirmDelete.trim().toUpperCase() !== 'DELETE'} style={{ width: '100%', background: confirmDelete.trim().toUpperCase() === 'DELETE' ? '#ef4444' : '#f0f0f0', color: confirmDelete.trim().toUpperCase() === 'DELETE' ? '#fff' : '#aaa', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: confirmDelete.trim().toUpperCase() === 'DELETE' ? 'pointer' : 'not-allowed' }}>{deleting ? t('Deleting…') : t('Permanently delete my data')}</button>
      </div>
    </>
  )
}
