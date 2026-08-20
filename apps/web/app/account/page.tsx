'use client'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast, confirmDialog } from '@/lib/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthToken, refreshAuthToken, setAuthToken, trpcAuthed } from '@/lib/authToken'
import { createClient } from '@/lib/supabase'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import BannerSlot from '@/components/marketplace/BannerSlot'
import Icon from '@/components/marketplace/Icon'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import SellerCentre from '@/components/marketplace/SellerCentre'
import BusinessCentre from '@/components/marketplace/BusinessCentre'
import MemberDashboard from '@/components/marketplace/MemberDashboard'
import MyHub from '@/components/marketplace/MyHub'
import InboxClient from '@/components/marketplace/InboxClient'
import RewardsCard from '@/components/marketplace/RewardsCard'
import MemberStatusCard from '@/components/marketplace/MemberStatusCard'
import AffiliateCard from '@/components/marketplace/AffiliateCard'
import { MEMBER_STATUSES } from '@grabitt/design-tokens'
import AttributesCard from '@/components/marketplace/AttributesCard'
import AgentProfileCard from '@/components/marketplace/AgentProfileCard'
import TenantProfileCard from '@/components/marketplace/TenantProfileCard'
import { deptEmoji } from '@/lib/listingMap'
import { t } from '@/lib/i18n'

// A real, deep-linkable account hub (route, not a modal). Desktop shows a sticky
// sidebar; mobile stacks. Icons are inline SVG (Lucide-style) — no emoji.

const I = {
  tag: 'M7.5 7.5h.01M3 6.4v4.79a2 2 0 0 0 .59 1.42l7.6 7.6a2 2 0 0 0 2.82 0l4.8-4.8a2 2 0 0 0 0-2.82l-7.6-7.6A2 2 0 0 0 11.79 3H7a2 2 0 0 0-2 2v.4', // tag-ish
  check: 'M9 12l2 2 4-4 M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  offer: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5 M16 12h.01',
}
function Svg({ d, size = 18, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d.split(' M').map((p, i) => <path key={i} d={i === 0 ? p : 'M' + p} />)}</svg>
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined', countered: 'Countered', expired: 'Expired', withdrawn: 'Withdrawn' }
const bucket = (s: string) => (s === 'sold' ? 'sold' : (s === 'active' || s === 'grab_it_now') ? 'active' : 'draft')

export default function AccountPage() {
  // AccountInner reads ?offer= via useSearchParams, which Next requires to sit
  // inside a Suspense boundary.
  return (
    <PanelProvider>
      <Suspense fallback={null}>
        <AccountInner />
      </Suspense>
    </PanelProvider>
  )
}

function AccountInner() {
  const router = useRouter()
  const { openPanel } = usePanel()
  // A seller tapping an offer notification lands on ?offer=<id>#offers — bring
  // that offer into view and mark it, rather than dropping them at the top of
  // the account page to hunt for it.
  const params = useSearchParams()
  const focusOffer = params.get('offer')
  // ?tab=recruitment — how the Employers entry points land here.
  const wantTab = params.get('tab')
  const focusRef = useRef<HTMLDivElement | null>(null)
  const [mainTab, setMainTab] = useState<'business' | 'selling' | 'inbox' | 'recruitment' | 'settings'>('selling')
  // Long sections are split into sub-tabs so the right panel only ever shows one
  // thing at a time, rather than a deep single scroll.
  const [sellingTab, setSellingTab] = useState<'listings' | 'grade' | 'offers' | 'rewards'>('listings')
  const [settingsTab, setSettingsTab] = useState<'account' | 'profile' | 'collection' | 'danger'>('account')
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [dash, setDash] = useState<any>(null)
  const [payout, setPayout] = useState<any>(null)
  const [listings, setListings] = useState<any[] | null>(null)
  const [offers, setOffers] = useState<any[] | null>(null)
  const [threads, setThreads] = useState<any[] | null>(null)
  const [seg, setSeg] = useState<'active' | 'sold' | 'draft'>('active')
  const [busyId, setBusyId] = useState<string | null>(null)
  // Collection contact details (phone + address) — editable any time.
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [contactState, setContactState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  // Account email change — Supabase owns the identity, so this sends a
  // confirmation link; the address only changes once the user clicks it.
  const [newEmail, setNewEmail] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'sent'>('idle')
  const [emailError, setEmailError] = useState('')

  // GDPR erasure — anonymises the account immediately (no admin step). Sales and
  // purchase records are retained: we're legally required to keep them, and the
  // other party to each trade has rights over them too.
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)
  const deleteAccount = async () => {
    if (confirmDelete.trim().toUpperCase() !== 'DELETE') return
    if (!(await confirmDialog({ title: t('Delete account?'), message: t('This permanently anonymises your account and signs you out. It cannot be undone. Continue?'), confirmLabel: t('Delete'), danger: true }))) return
    setDeleting(true)
    try {
      // Erases both our record and the Supabase Auth identity (email + sessions).
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'failed')
      if (json?.warning) toast(json.warning)
      await createClient().auth.signOut()
      window.location.href = '/?deleted=1'
    } catch {
      toast(t('Could not complete the deletion. Please contact privacy@grabitt.net.'))
      setDeleting(false)
    }
  }

  const changeEmail = async () => {
    const next = newEmail.trim().toLowerCase()
    setEmailError('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) { setEmailError(t('Enter a valid email address.')); return }
    if (next === (me?.email ?? '').toLowerCase()) { setEmailError(t('That is already your email address.')); return }
    setEmailState('saving')
    try {
      // Land the confirmation on our callback so User.email is synced there.
      const { error } = await createClient().auth.updateUser(
        { email: next },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      )
      if (error) { setEmailError(error.message); setEmailState('idle'); return }
      setEmailState('sent')
    } catch { setEmailError(t('Could not start the email change. Please try again.')); setEmailState('idle') }
  }

  const load = useCallback(async () => {
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { router.push('/auth?next=/account'); return }
    const c: any = trpcAuthed()
    setReady(true)
    c.users.me.query().then((u: any) => { setMe(u); setPhone(u?.phone ?? ''); setAddress(u?.collectionAddress ?? '') }).catch(() => {})
    c.users.dashboard.query().then(setDash).catch(() => {})
    c.users.payoutStatus.query().then(setPayout).catch(() => {})
    c.listings.mine.query().then((d: any) => setListings(d as any[])).catch(() => setListings([]))
    c.offers.received.query().then((d: any) => setOffers(d as any[])).catch(() => setOffers([]))
    c.messages.myThreads.query().then((d: any) => setThreads(d as any[])).catch(() => setThreads([]))
  }, [router])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    // Recruitment is now folded into the Business hub.
    if (wantTab === 'recruitment') { setMainTab(me?.isBusiness ? 'business' : 'selling'); return }
    if (wantTab === 'business' || wantTab === 'inbox' || wantTab === 'settings' || wantTab === 'selling') {
      setMainTab(wantTab as typeof mainTab)
    }
  }, [wantTab, me?.isBusiness])

  // Email-change confirmation lands here as ?emailChanged=1 (set by the auth
  // callback). Tell the user it worked and drop them on Settings → Account so
  // they see the new address.
  useEffect(() => {
    if (!params.get('emailChanged')) return
    toast(t('Your email address has been updated.'))
    setMainTab('settings'); setSettingsTab('account')
    // Clean the flag out of the URL so a refresh doesn't re-toast.
    router.replace('/account')
  }, [params, router])

  // Scroll the deep-linked offer into view once the offers have loaded.
  useEffect(() => {
    if (!focusOffer || !offers?.length) return
    setMainTab('selling'); setSellingTab('offers')
    setTimeout(() => focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }, [focusOffer, offers])

  const logout = async () => {
    try { await createClient().auth.signOut() } catch {}
    setAuthToken(null)
    if (typeof window !== 'undefined') localStorage.removeItem('grabitt_uid')
    router.push('/')
  }

  const saveContact = async () => {
    setContactState('saving')
    try {
      await trpcAuthed().users.updateProfile.mutate({ phone: phone.trim(), collectionAddress: address.trim() })
      setContactState('saved')
      setTimeout(() => setContactState('idle'), 2500)
    } catch { setContactState('idle') }
  }

  const setupPayouts = async () => {
    setPayoutBusy(true)
    setPayoutError('')
    try {
      const c: any = trpcAuthed()
      // Only open the Express dashboard once payouts are fully enabled; otherwise
      // (re)open onboarding — createPayoutOnboarding reuses an existing but
      // incomplete account and returns a link to finish it. Opening the dashboard
      // on an un-onboarded account errors (500).
      const res = payout?.payoutsEnabled ? await c.users.payoutDashboardLink.mutate() : await c.users.createPayoutOnboarding.mutate()
      if (res?.url) { window.location.href = res.url; return }
      setPayoutError('Stripe did not return an onboarding link. Please try again.')
      setPayoutBusy(false)
    } catch (e: any) {
      setPayoutError(e?.message ? String(e.message) : 'Could not open Stripe. Please try again.')
      setPayoutBusy(false)
    }
  }

  const respond = async (offerId: string, action: 'accept' | 'decline') => {
    setBusyId(offerId)
    try { await (trpcAuthed() as any).offers.respond.mutate({ offerId, action }); (trpcAuthed() as any).offers.received.query().then((d: unknown) => setOffers(d as any[])) }
    finally { setBusyId(null) }
  }

  const counts = useMemo(() => {
    const l = listings ?? []
    return { active: l.filter(x => bucket(x.status) === 'active').length, sold: l.filter(x => bucket(x.status) === 'sold').length, draft: l.filter(x => bucket(x.status) === 'draft').length }
  }, [listings])
  const shown = (listings ?? []).filter(l => bucket(l.status) === seg).map((l: any) => ({
    ref: l.id, title: l.title, price: `€${Number(l.price).toLocaleString()}`,
    image: Array.isArray(l.images) ? l.images[0] : null, emoji: deptEmoji(l.department),
  }))

  if (!ready) return <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#888' }}>{t('Loading your account…')}</main>

  // First-login business onboarding: a business that hasn't entered its details
  // yet (e.g. just came back from Stripe) is prompted before anything else.
  const needsBizOnboarding = !!me?.isBusiness && !me?.businessOnboardedAt

  const grade = me?.grade ?? 'grabber'
  const memberSince = me?.createdAt ? new Date(me.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'
  const verified = !!me?.isVerified
  // Member reference, the M###### the prototype showed on the profile.
  const memberRef = me?.id ? `M${String(me.id).replace(/-/g, '').slice(0, 6).toUpperCase()}` : ''
  // Tiles are the dashboard's navigation, so each one has to go somewhere.
  // Filtering the list below without scrolling to it looks like nothing
  // happened, so the list tiles do both.
  // Tiles now have to switch tab as well as scroll, or they would point at a
  // card the current tab isn't showing.
  const goTo = (tab: 'selling' | 'inbox' | 'settings', id: string) => {
    setMainTab(tab)
    // Open the sub-tab that actually contains the target card, or it would stay
    // hidden and the scroll would land on nothing.
    if (tab === 'selling') setSellingTab(id === 'offers' ? 'offers' : id === 'rewards' ? 'rewards' : 'listings')
    if (tab === 'settings') setSettingsTab(id === 'attributes' ? 'profile' : 'account')
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const tiles = [
    { label: t('On sale'), value: dash?.active, icon: I.tag, onClick: () => { setSeg('active'); goTo('selling', 'my-listings') } },
    { label: t('Sold'), value: dash?.sold, icon: I.check, onClick: () => { setSeg('sold'); goTo('selling', 'my-listings') } },
    { label: t('Messages'), value: dash?.unread, icon: I.message, dot: !!dash?.unread, href: '/messages' },
    { label: t('Offers'), value: dash?.offers, icon: I.offer, dot: !!dash?.offers, onClick: () => goTo('selling', 'offers') },
    { label: t('Saved'), value: dash?.saved, icon: I.heart, href: '/favourites' },
    { label: t('Payouts'), value: payout?.payoutsEnabled ? '✓' : '—', icon: I.wallet, onClick: setupPayouts },
  ]

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar />
      <QuickActions />
      {needsBizOnboarding && <BusinessOnboardingModal onDone={() => load()} />}

      {/* Both personal and business accounts use the same Member Zone dashboard;
          business accounts get an extra Business Centre section inside it. */}
      <div style={{ padding: '16px 14px' }}>
        <MemberDashboard me={me} onReload={load} />
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
      <style>{`@media (min-width: 900px){ .account-grid{ grid-template-columns: 320px 1fr !important; } .account-side{ position: sticky; top: 70px; } }`}</style>
    </main>
  )
}

// Sub-navigation within a section (My Listings / Grade / Offers …). Scrolls
// horizontally on narrow screens rather than wrapping.
function SubTabs({ tabs, active, onPick }: { tabs: [string, string][]; active: string; onPick: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: '#fff', border: '1px solid #ece3d7', borderRadius: 50, padding: 5, overflowX: 'auto' }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onPick(id)} style={{
          flex: '1 0 auto', border: 'none', borderRadius: 50, padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
          background: active === id ? 'linear-gradient(135deg,var(--orange),var(--orange2))' : 'transparent',
          color: active === id ? '#fff' : '#7a6a55', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900,
        }}>{label}</button>
      ))}
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const fieldLabel: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5 }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', marginBottom: 12 }
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '16px 0', textAlign: 'center' }}>{children}</div> }

// First-login business details. Blocks the account until the business tells us
// who they are — this is the step deferred from the streamlined signup flow.
const BIZ_TYPES = [
  { id: 'shop', label: '🏪 Retail Shop' }, { id: 'trade', label: '🔧 Trade & Services' },
  { id: 'restaurant', label: '🍽️ Restaurant / Bar' }, { id: 'agency', label: '🏠 Estate Agent' },
  { id: 'recruiter', label: '💼 Recruitment / HR' }, { id: 'other', label: '📋 Other' },
]
function BusinessOnboardingModal({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [bio, setBio] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!name.trim() || !type) return
    setBusy(true)
    try {
      await trpcAuthed().subscriptions.completeOnboarding.mutate({ businessName: name.trim(), businessType: type, businessBio: bio.trim() || undefined })
      onDone()
    } catch { setBusy(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,12,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 22, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 40, textAlign: 'center' }}>🏢</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 19, fontWeight: 700, color: 'var(--dark)', textAlign: 'center', marginTop: 6 }}>{t('Welcome to Business!')}</div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a', textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 1.5 }}>
          {t('Tell us about your business so we can set up your storefront. You sell under this name.')}
        </div>
        <label style={fieldLabel}>{t('Business name')} *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g. Playa Surf Shop')} style={field} />
        <label style={fieldLabel}>{t('Business type')} *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {BIZ_TYPES.map(b => (
            <button key={b.id} onClick={() => setType(b.id)} style={{ border: `1.5px solid ${type === b.id ? 'var(--orange)' : '#e5dccd'}`, background: type === b.id ? '#FFF3EE' : '#fff', color: type === b.id ? 'var(--orange)' : '#1a1a1a', borderRadius: 50, padding: '7px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{b.label}</button>
          ))}
        </div>
        <label style={fieldLabel}>{t('Short bio')} ({t('optional')})</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t('What you sell or offer, in a sentence.')} style={{ ...field, minHeight: 64, resize: 'vertical' }} />
        <button onClick={save} disabled={busy || !name.trim() || !type} style={{ width: '100%', marginTop: 6, background: (!name.trim() || !type) ? '#e6ddce' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: (busy || !name.trim() || !type) ? 'default' : 'pointer' }}>
          {busy ? t('Saving…') : t('Save & continue')}
        </button>
      </div>
    </div>
  )
}
