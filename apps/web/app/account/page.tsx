'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, setAuthToken, trpcAuthed } from '@/lib/authToken'
import { createClient } from '@/lib/supabase'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'
import { deptEmoji } from '@/lib/listingMap'

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
  return <PanelProvider><AccountInner /></PanelProvider>
}

function AccountInner() {
  const router = useRouter()
  const { openPanel } = usePanel()
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
    if (!confirm('This permanently anonymises your account and signs you out. It cannot be undone. Continue?')) return
    setDeleting(true)
    try {
      // Erases both our record and the Supabase Auth identity (email + sessions).
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? 'failed')
      if (json?.warning) alert(json.warning)
      await createClient().auth.signOut()
      window.location.href = '/?deleted=1'
    } catch {
      alert('Could not complete the deletion. Please contact privacy@grabitt.net.')
      setDeleting(false)
    }
  }

  const changeEmail = async () => {
    const next = newEmail.trim().toLowerCase()
    setEmailError('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) { setEmailError('Enter a valid email address.'); return }
    if (next === (me?.email ?? '').toLowerCase()) { setEmailError('That is already your email address.'); return }
    setEmailState('saving')
    try {
      // Land the confirmation on our callback so User.email is synced there.
      const { error } = await createClient().auth.updateUser(
        { email: next },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      )
      if (error) { setEmailError(error.message); setEmailState('idle'); return }
      setEmailState('sent')
    } catch { setEmailError('Could not start the email change. Please try again.'); setEmailState('idle') }
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
    try { await trpcAuthed().offers.respond.mutate({ offerId, action }); trpcAuthed().offers.received.query().then(d => setOffers(d as any[])) }
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

  if (!ready) return <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#888' }}>Loading your account…</main>

  const grade = me?.grade ?? 'grabber'
  const memberSince = me?.createdAt ? new Date(me.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'
  const tiles = [
    { label: 'On sale', value: dash?.active, icon: I.tag, onClick: () => setSeg('active') },
    { label: 'Sold', value: dash?.sold, icon: I.check, onClick: () => setSeg('sold') },
    { label: 'Messages', value: dash?.unread, icon: I.message, dot: !!dash?.unread, href: '/messages' },
    { label: 'Offers', value: dash?.offers, icon: I.offer, dot: !!dash?.offers },
    { label: 'Saved', value: dash?.saved, icon: I.heart, onClick: () => openPanel('favourites') },
    { label: 'Payouts', value: payout?.payoutsEnabled ? '✓' : '—', icon: I.wallet },
  ]

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar />
      <QuickActions />
      <div style={{ padding: '16px 14px', display: 'grid', gap: 18, gridTemplateColumns: '1fr' }} className="account-grid">
        {/* Sidebar / identity */}
        <aside style={{ alignSelf: 'start' }} className="account-side">
          <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, fontFamily: 'var(--font-nunito)' }}>{(me?.displayName ?? '?')[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>{me?.displayName ?? 'Your account'}</div>
                {me?.email && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666', wordBreak: 'break-all' }}>{me.email}</div>}
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888' }}>{grade.charAt(0).toUpperCase() + grade.slice(1)} · ⭐ {me?.avgRating ? Number(me.avgRating).toFixed(1) : '—'} · since {memberSince}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
              {tiles.map(t => {
                const inner = (
                  <div style={{ position: 'relative', background: '#f9f6f2', border: '1px solid #efe7db', borderRadius: 12, padding: '12px 6px', textAlign: 'center', cursor: (t.onClick || t.href) ? 'pointer' : 'default' }}>
                    <span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Svg d={t.icon} /></span>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{t.value ?? '—'}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>{t.label}</div>
                    {t.dot && <span style={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }} />}
                  </div>
                )
                return t.href ? <Link key={t.label} href={t.href} style={{ textDecoration: 'none' }}>{inner}</Link>
                  : <button key={t.label} onClick={t.onClick} style={{ border: 'none', background: 'none', padding: 0, width: '100%' }}>{inner}</button>
              })}
            </div>
            {/* Payouts — links to Stripe onboarding (or the Express dashboard once set up) */}
            <button onClick={setupPayouts} disabled={payoutBusy} style={{ width: '100%', textAlign: 'left', marginTop: 14, background: payout?.payoutsEnabled ? '#f0fdf4' : '#FFF3EE', border: `1px solid ${payout?.payoutsEnabled ? '#bbf7d0' : '#FFD4A0'}`, borderRadius: 12, padding: 12, cursor: payoutBusy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: payout?.payoutsEnabled ? 'var(--sage)' : 'var(--orange)' }}>{payoutBusy ? 'Opening Stripe…' : payout?.payoutsEnabled ? 'Payouts active — manage' : 'Set up payouts'}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666', marginTop: 3 }}>{payout?.payoutsEnabled ? 'Sales pay out to you at handover. Tap to manage.' : 'Connect Stripe to receive money from sales.'}</div>
              </div>
              <span style={{ color: payout?.payoutsEnabled ? 'var(--sage)' : 'var(--orange)', fontWeight: 900, fontSize: 16 }}>›</span>
            </button>
            {payoutError && <div style={{ marginTop: 8, background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#ef4444', lineHeight: 1.5 }}>{payoutError}</div>}
            {/* Log out */}
            <button onClick={logout} style={{ width: '100%', marginTop: 14, background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 12, padding: '11px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
              Log out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Account email — changing it re-verifies via Supabase Auth */}
          <div style={card}>
            <div style={cardHead}>Account email</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', lineHeight: 1.5, marginBottom: 12 }}>
              This is the address you sign in with. Changing it sends a confirmation link to the new address — your email only changes once you click that link.
            </div>
            <label style={fieldLabel}>Current email</label>
            <div style={{ ...field, background: '#f7f4ee', color: '#555', display: 'flex', alignItems: 'center' }}>{me?.email ?? '—'}</div>
            {emailState === 'sent' ? (
              <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#16a34a', lineHeight: 1.5 }}>
                ✓ Confirmation sent to <strong>{newEmail.trim().toLowerCase()}</strong>. Click the link in that email to finish the change. (Check spam if it doesn&apos;t arrive.)
              </div>
            ) : (
              <>
                <label style={fieldLabel}>New email</label>
                <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailError('') }} type="email" placeholder="you@example.com" style={field} />
                {emailError && <div style={{ marginTop: 6, fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#ef4444' }}>{emailError}</div>}
                <button onClick={changeEmail} disabled={emailState === 'saving'} style={{ marginTop: 10, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: emailState === 'saving' ? 'wait' : 'pointer' }}>
                  {emailState === 'saving' ? 'Sending…' : 'Send confirmation link'}
                </button>
              </>
            )}
          </div>

          {/* Marketing email — GDPR consent, freely given and withdrawable */}
          <div style={card}>
            <div style={cardHead}>Email preferences</div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!me?.marketingConsent}
                onChange={async e => {
                  const next = e.target.checked
                  setMe((m: any) => ({ ...m, marketingConsent: next }))
                  try { await trpcAuthed().users.updateProfile.mutate({ marketingConsent: next }) }
                  catch { setMe((m: any) => ({ ...m, marketingConsent: !next })) }
                }}
                style={{ width: 17, height: 17, accentColor: 'var(--orange)', marginTop: 1, flexShrink: 0 }}
              />
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                <strong>Send me Grabitt news &amp; offers</strong><br />
                <span style={{ color: '#777', fontSize: 12 }}>
                  Island deals, new features and seller tips. You can unsubscribe any time — from here or the link in any email.
                </span>
              </span>
            </label>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#999', marginTop: 10, lineHeight: 1.5 }}>
              This doesn&apos;t affect essential emails about your orders, offers and account.
            </div>
          </div>

          {/* Collection details — auto-shared with a buyer only after a completed collection sale */}
          <div style={card}>
            <div style={cardHead}>Collection details</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', lineHeight: 1.5, marginBottom: 12 }}>
              Your address &amp; phone are shared with a buyer <strong>only after</strong> they complete a purchase where collection is selected. Buyers never see these before a sale. You can update them any time.
            </div>
            <label style={fieldLabel}>Contact phone</label>
            <input value={phone} onChange={e => { setPhone(e.target.value); setContactState('idle') }} type="tel" placeholder="e.g. +34 600 000 000" style={field} />
            <label style={fieldLabel}>Collection address</label>
            <textarea value={address} onChange={e => { setAddress(e.target.value); setContactState('idle') }} placeholder="Street, town, postcode — where buyers collect" style={{ ...field, minHeight: 72, resize: 'vertical' }} />
            <button onClick={saveContact} disabled={contactState === 'saving'} style={{ marginTop: 4, background: contactState === 'saved' ? 'var(--sage)' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: contactState === 'saving' ? 'wait' : 'pointer' }}>
              {contactState === 'saving' ? 'Saving…' : contactState === 'saved' ? '✓ Saved' : 'Save collection details'}
            </button>
          </div>

          {/* My Listings */}
          <div style={card}>
            <div style={cardHead}>My Listings</div>
            <div style={{ display: 'flex', background: '#f5f0e8', borderRadius: 50, padding: 4, marginBottom: 12 }}>
              {([['active', 'On sale'], ['sold', 'Sold'], ['draft', 'Drafts']] as [typeof seg, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setSeg(id)} style={{ flex: 1, border: 'none', background: seg === id ? '#fff' : 'transparent', color: seg === id ? 'var(--dark)' : '#888', borderRadius: 50, padding: '7px 0', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{label}{counts[id] > 0 ? ` ${counts[id]}` : ''}</button>
              ))}
            </div>
            {listings === null ? <Muted>Loading…</Muted> : shown.length === 0 ? <Muted>{seg === 'sold' ? 'No sold items yet.' : 'Nothing here yet.'}</Muted> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {shown.map(c => (
                  <Link key={c.ref} href={`/listings/${c.ref}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                        {c.image ? <img src={c.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{c.emoji}</div>}
                      </div>
                      <div style={{ padding: 8 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>{c.price}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Offers received */}
          <div style={card}>
            <div style={cardHead}>Offers received</div>
            {offers === null ? <Muted>Loading…</Muted> : offers.length === 0 ? <Muted>No offers to review.</Muted> : offers.map(o => (
              <div key={o.id} style={{ borderBottom: '1px solid #f5f5f5', padding: '10px 0' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.listing?.images?.[0] ? <img src={o.listing.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.listing?.title}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>A buyer offered · {STATUS_LABEL[o.status] ?? o.status}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)' }}>€{Number(o.amount).toLocaleString()}</div>
                </div>
                {o.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => respond(o.id, 'accept')} disabled={busyId === o.id} style={{ flex: 1, background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>{busyId === o.id ? '…' : 'Accept'}</button>
                    <button onClick={() => respond(o.id, 'decline')} disabled={busyId === o.id} style={{ flex: 1, background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, padding: '8px 0', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Messages */}
          <div style={card}>
            <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between' }}><span>Recent messages</span><Link href="/messages" style={{ color: 'var(--orange)', fontSize: 12, textDecoration: 'none' }}>See all →</Link></div>
            {threads === null ? <Muted>Loading…</Muted> : threads.length === 0 ? <Muted>No conversations yet.</Muted> : threads.slice(0, 4).map((t: any) => {
              const other = t.participants?.find((p: any) => p.userId !== me?.id)?.user
              const last = t.messages?.[0]
              const unread = !!last && last.senderId !== me?.id && !last.readAt
              const preview = last ? (last.blocked ? '⚠️ Message hidden' : (last.senderId === me?.id ? 'You: ' : '') + last.body) : 'Start chatting…'
              return (
                <Link key={t.id} href={`/messages/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-nunito)' }}>{(other?.displayName ?? '?')[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: unread ? 900 : 700, color: 'var(--dark)' }}>{other?.displayName ?? 'Grabitt user'}</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: unread ? 'var(--dark)' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
                    </div>
                    {unread && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--orange)' }} />}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* GDPR erasure — self-service, no admin step */}
          <div style={{ ...card, border: '1px solid #fecaca' }}>
            <div style={{ ...cardHead, color: '#ef4444' }}>Delete my account &amp; data</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', lineHeight: 1.6, marginBottom: 10 }}>
              Under the GDPR you can erase your personal data at any time. This happens <strong>immediately</strong> — no request queue, no admin approval.
            </div>
            <div style={{ background: '#f9f6f2', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#555', lineHeight: 1.6 }}>
                <strong>Erased:</strong> your name, email, phone, address, avatar and business details.<br />
                <strong>Retained:</strong> sales and purchase records, which we&apos;re legally required to keep for tax and accounting and which the other party to each trade also has rights over. They are detached from your identity.
              </div>
            </div>
            <label style={fieldLabel}>Type DELETE to confirm</label>
            <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder="DELETE" style={field} />
            <button
              onClick={deleteAccount}
              disabled={deleting || confirmDelete.trim().toUpperCase() !== 'DELETE'}
              style={{
                width: '100%', marginTop: 10, background: confirmDelete.trim().toUpperCase() === 'DELETE' ? '#ef4444' : '#f0f0f0',
                color: confirmDelete.trim().toUpperCase() === 'DELETE' ? '#fff' : '#aaa',
                border: 'none', borderRadius: 12, padding: '12px', fontFamily: 'var(--font-nunito)',
                fontSize: 13, fontWeight: 900, cursor: confirmDelete.trim().toUpperCase() === 'DELETE' ? 'pointer' : 'not-allowed',
              }}>
              {deleting ? 'Deleting…' : 'Permanently delete my data'}
            </button>
          </div>
        </section>
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
      <style>{`@media (min-width: 900px){ .account-grid{ grid-template-columns: 320px 1fr !important; } .account-side > div{ position: sticky; top: 70px; } }`}</style>
    </main>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const fieldLabel: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5 }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', marginBottom: 12 }
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '16px 0', textAlign: 'center' }}>{children}</div> }
