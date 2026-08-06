'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { createLooseTrpcClient } from '@/lib/trpc'

type Listing = { id: string; name: string; category: string | null; description: string | null; phone: string | null; email: string | null; website: string | null; logoUrl: string | null; location: string | null }
type Mine = { isAdvertiser: boolean; isBusiness: boolean; listing: Listing | null; live: boolean; paidUntil: string | null }
type Term = { term: 'month' | 'quarter' | 'year'; cents: number; months: number; label: string }
type Booking = { id: string; position: string; pageTarget: string | null; startsAt: string; endsAt: string; hasCreative: boolean; approved: boolean }

const EMPTY: Listing = { id: '', name: '', category: '', description: '', phone: '', email: '', website: '', logoUrl: '', location: '' }

export default function AdvertiserPage() {
  return <PanelProvider><Inner /></PanelProvider>
}

function Inner() {
  const { openPanel } = usePanel()
  const [gate, setGate] = useState<'loading' | 'signed_out' | 'business' | 'need_join' | 'advertiser'>('loading')
  const [mine, setMine] = useState<Mine | null>(null)

  const loadMine = () => trpcAuthed().directory.mine.query()
    .then((d: any) => {
      setMine(d as Mine)
      // Businesses and advertisers both manage a directory listing here; everyone
      // else is offered the advertiser sign-up.
      setGate(d.isBusiness || d.isAdvertiser ? 'advertiser' : 'need_join')
    })
    .catch(() => setGate('signed_out'))

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { setGate('signed_out'); return }
      loadMine()
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 60, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Advertiser Centre" />
      <QuickActions />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 14px' }}>
        <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.6, marginBottom: 16 }}>
          Advertise on Grabitt without a seller account. Take out a <Link href="/directory" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>business directory</Link> listing and/or book banners. Your directory entry is live while your directory subscription is paid.
        </p>

        {gate === 'loading' && <Muted>Loading…</Muted>}

        {gate === 'signed_out' && (
          <Card>
            <H>Sign in to advertise</H>
            <p style={sub}>Create an advertiser login (or sign in) to book banners and manage your directory listing.</p>
            <button onClick={() => openPanel('login')} style={cta}>Sign in / Register →</button>
          </Card>
        )}

        {gate === 'business' && (
          <Card>
            <H>You already have a business account</H>
            <p style={sub}>Businesses book banners and manage advertising from the business dashboard.</p>
            <Link href="/account?tab=business" style={{ ...cta, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Go to Business dashboard →</Link>
          </Card>
        )}

        {gate === 'need_join' && <JoinCard onDone={loadMine} />}

        {gate === 'advertiser' && mine && <Dashboard mine={mine} onReload={loadMine} />}
      </div>
      <Footer />
      <PanelHost />
    </main>
  )
}

function JoinCard({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const join = async () => {
    if (name.trim().length < 2) return
    setBusy(true); setErr('')
    try { await trpcAuthed().directory.becomeAdvertiser.mutate({ name: name.trim() }); onDone() }
    catch (e: any) { setErr(e?.message ?? 'Could not set up advertiser account'); setBusy(false) }
  }
  return (
    <Card>
      <H>Become an advertiser</H>
      <p style={sub}>Advertiser accounts buy advertising and a directory entry only — no selling. Enter your business name to get started.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your business name" style={inp} />
      {err && <div style={errStyle}>{err}</div>}
      <button onClick={join} disabled={busy || name.trim().length < 2} style={{ ...cta, marginTop: 10, opacity: busy || name.trim().length < 2 ? 0.6 : 1 }}>{busy ? 'Setting up…' : 'Create advertiser account →'}</button>
    </Card>
  )
}

function Dashboard({ mine, onReload }: { mine: Mine; onReload: () => void }) {
  const [f, setF] = useState<Listing>({ ...EMPTY, ...(mine.listing ?? {}) })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [bkFor, setBkFor] = useState<string | null>(null)
  const [bkImg, setBkImg] = useState(''); const [bkBusy, setBkBusy] = useState(false); const [bkMsg, setBkMsg] = useState('')
  const [terms, setTerms] = useState<Term[]>([])
  const [subBusy, setSubBusy] = useState<string>('')

  useEffect(() => {
    trpcAuthed().banners.myBookings.query().then((d: any) => setBookings(d ?? [])).catch(() => setBookings([]))
    createLooseTrpcClient().directory.terms.query().then((d: any) => setTerms(d ?? [])).catch(() => {})
  }, [])

  const subscribe = async (term: string) => {
    setSubBusy(term)
    try {
      const res = await trpcAuthed().directory.checkout.mutate({ term: term as Term['term'] }) as { url?: string }
      if (res?.url) window.location.href = res.url; else setSubBusy('')
    } catch { setSubBusy('') }
  }

  const save = async () => {
    setBusy(true); setMsg('')
    try {
      await trpcAuthed().directory.upsert.mutate({
        name: f.name, category: f.category || undefined, description: f.description || undefined,
        phone: f.phone || undefined, email: f.email || undefined, website: f.website || undefined,
        logoUrl: f.logoUrl || undefined, location: f.location || undefined,
      })
      setMsg('✓ Saved'); onReload()
    } catch (e: any) { setMsg(e?.message ?? 'Could not save') } finally { setBusy(false) }
  }
  const set = (k: keyof Listing, v: string) => setF(p => ({ ...p, [k]: v }))

  const uploadCreative = async (id: string) => {
    setBkBusy(true); setBkMsg('')
    try {
      await trpcAuthed().banners.setBookingCreative.mutate({ bookingId: id, imageUrl: bkImg.trim() })
      setBkMsg('✓ Submitted for approval'); setBkFor(null); setBkImg('')
      trpcAuthed().banners.myBookings.query().then((d: any) => setBookings(d ?? [])).catch(() => {})
    } catch (e: any) { setBkMsg(e?.message ?? 'Could not upload') } finally { setBkBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: mine.live ? '#f0fdf4' : '#fff7ed', border: `1px solid ${mine.live ? '#bbf7d0' : '#FFD4A0'}`, borderRadius: 12, padding: '11px 14px' }}>
        <span style={{ fontSize: 18 }}>{mine.live ? '🟢' : '🟠'}</span>
        <div style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: mine.live ? '#16a34a' : '#9a5b1a' }}>
          {mine.live
            ? `Your listing is live in the directory${mine.paidUntil ? ` until ${new Date(mine.paidUntil).toLocaleDateString('en-GB')}` : ''}.`
            : 'Your listing is hidden — subscribe below to appear in the directory.'}
        </div>
        {mine.listing && mine.live && <Link href={`/directory/${mine.listing.id}`} style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 900, color: 'var(--orange)', textDecoration: 'none' }}>View ›</Link>}
      </div>

      <Card>
        <H>Directory subscription</H>
        <p style={sub}>List your business (name, phone, email, website, logo, short description) in the public directory. Not a storefront.{mine.paidUntil ? ` Paid until ${new Date(mine.paidUntil).toLocaleDateString('en-GB')}.` : ''}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {terms.map(tm => (
            <button key={tm.term} onClick={() => subscribe(tm.term)} disabled={!!subBusy || mine.listing?.name === undefined} style={{ border: '1.5px solid #e5dccd', background: '#fff', borderRadius: 12, padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>€{(tm.cents / 100).toFixed(0)}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, color: '#1a1a1a' }}>{subBusy === tm.term ? 'Opening…' : tm.term === 'month' ? 'per month' : tm.term === 'quarter' ? 'per quarter' : 'per year'}</div>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#1a1a1a', marginTop: 8 }}>Save your listing details below first, then subscribe. Renewing adds to any remaining time.</div>
      </Card>

      <Card>
        <H>Your directory listing</H>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <F label="Business name"><input value={f.name} onChange={e => set('name', e.target.value)} style={inp} /></F>
          <F label="Category"><input value={f.category ?? ''} onChange={e => set('category', e.target.value)} placeholder="e.g. Restaurant" style={inp} /></F>
          <F label="Location"><input value={f.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="e.g. Las Palmas" style={inp} /></F>
          <F label="Phone"><input value={f.phone ?? ''} onChange={e => set('phone', e.target.value)} style={inp} /></F>
          <F label="Email"><input value={f.email ?? ''} onChange={e => set('email', e.target.value)} style={inp} /></F>
          <F label="Website"><input value={f.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://…" style={inp} /></F>
          <div style={{ gridColumn: '1/-1' }}><F label="Logo image URL"><input value={f.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} placeholder="https://…" style={inp} /></F></div>
          <div style={{ gridColumn: '1/-1' }}><F label="Description"><textarea value={f.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></F></div>
        </div>
        {msg && <div style={{ ...errStyle, color: msg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{msg}</div>}
        <button onClick={save} disabled={busy || f.name.trim().length < 2} style={{ ...cta, marginTop: 12, opacity: busy || f.name.trim().length < 2 ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save listing'}</button>
      </Card>

      <Card>
        <H>Your banners</H>
        <p style={sub}>Book a banner from the shared advertising calendar. Your banner links to your directory listing.</p>
        <Link href="/advertise" style={{ ...cta, display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 12 }}>🎯 Book a banner →</Link>
        {bookings === null ? <Muted>Loading…</Muted> : bookings.length === 0 ? <Muted>No banners booked yet.</Muted> : bookings.map(b => (
          <div key={b.id} style={{ borderTop: '1px solid #f4efe8', padding: '10px 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)' }}>{b.position.replace(/_/g, ' ')}{b.pageTarget ? ` · ${b.pageTarget}` : ''}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: b.approved ? '#16a34a' : '#9a5b1a', fontWeight: 800 }}>{b.hasCreative ? (b.approved ? '✓ Live' : '⏳ In review') : 'Upload needed'}</span>
              <button onClick={() => { setBkFor(bkFor === b.id ? null : b.id); setBkMsg('') }} style={{ background: b.hasCreative ? '#f0fdf4' : '#FFF3EE', border: `1px solid ${b.hasCreative ? '#bbf7d0' : '#FFD4A0'}`, color: b.hasCreative ? '#16a34a' : '#8a5a2a', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>{b.hasCreative ? 'Edit image' : 'Upload image'}</button>
            </div>
            {bkFor === b.id && (
              <div style={{ marginTop: 8, background: '#f9f6f2', borderRadius: 10, padding: 10 }}>
                <input value={bkImg} onChange={e => setBkImg(e.target.value)} placeholder="Banner image URL (wide)" style={inp} />
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#1a1a1a', margin: '6px 0' }}>Clicks go to your directory listing automatically.</div>
                {bkMsg && <div style={{ ...errStyle, color: bkMsg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{bkMsg}</div>}
                <button onClick={() => uploadCreative(b.id)} disabled={bkBusy || !bkImg.trim()} style={{ ...cta, marginTop: 6, padding: '9px 14px', fontSize: 12.5 }}>{bkBusy ? 'Saving…' : 'Submit for approval'}</button>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const cta: React.CSSProperties = { width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '13px 20px', fontFamily: 'var(--font-nunito)', fontSize: 14.5, fontWeight: 900, cursor: 'pointer' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, background: '#fff' }
const sub: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.5, margin: '4px 0 12px' }
const errStyle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#ef4444', marginTop: 8 }
function Card({ children }: { children: React.ReactNode }) { return <div style={cardStyle}>{children}</div> }
function H({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{children}</div> }
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '8px 0' }}>{children}</div> }
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</label>{children}</div>
}
