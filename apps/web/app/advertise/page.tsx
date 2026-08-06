'use client'
import { useEffect, useMemo, useState } from 'react'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'
import { createLooseTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

type Slot = { id: string; label: string; monthlyCents: number; cap: number; exclusive: boolean; perPage: boolean; scope: string }
type Catalog = { slots: Slot[]; durations: number[]; maxMonths: number; pages: string[] }
type Line = { position: string; pageTarget: string; months: number; startsAt: string }
type Quote = { subtotalCents: number; discountPct: number; totalCents: number; lines: { position: string; grossCents: number }[] }
type Range = { startsAt: string; endsAt: string }

const eur = (c: number) => `€${(c / 100).toFixed(2)}`
const todayISO = () => new Date().toISOString().slice(0, 10)
// End = start + whole months (matches the server's bookingEnd).
const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d }
const overlaps = (aS: Date, aE: Date, bS: Date, bE: Date) => aS < bE && aE > bS

export default function AdvertisePage() {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 60, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar title="Advertise on Grabitt" />
        <QuickActions />
        <Inner />
        <Footer />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}

function Inner() {
  const { openPanel } = usePanel()
  const [cat, setCat] = useState<Catalog | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [ranges, setRanges] = useState<Record<number, Range[]>>({})
  const [paying, setPaying] = useState(false)
  const [err, setErr] = useState('')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  // Know up front whether the visitor can pay, so we prompt sign-in rather than
  // failing at the checkout step.
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      setSignedIn(!!token)
    })()
  }, [])

  useEffect(() => {
    createLooseTrpcClient().banners.catalog.query()
      .then(d => setCat(d as unknown as Catalog)).catch(() => {})
  }, [])

  // Add a first line once the catalogue arrives.
  useEffect(() => {
    if (cat && lines.length === 0 && cat.slots[0]) {
      setLines([{ position: cat.slots[0].id, pageTarget: '', months: 1, startsAt: todayISO() }])
    }
  }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps

  const slotById = useMemo(() => Object.fromEntries((cat?.slots ?? []).map(s => [s.id, s])), [cat])

  // Re-quote whenever the basket changes (proration + auto-discounts, server-side).
  useEffect(() => {
    if (!lines.length) { setQuote(null); return }
    const payload = { lines: lines.map(l => ({ position: l.position, pageTarget: l.pageTarget || undefined, months: l.months, startsAt: new Date(l.startsAt).toISOString() })) }
    createLooseTrpcClient().banners.quote.query(payload).then(d => setQuote(d as unknown as Quote)).catch(() => setQuote(null))
  }, [lines])

  // Fetch booked windows for each line's slot+page so we can flag clashes.
  useEffect(() => {
    lines.forEach((l, i) => {
      createLooseTrpcClient().banners.availability.query({ position: l.position, pageTarget: l.pageTarget || undefined })
        .then(d => setRanges(prev => ({ ...prev, [i]: ((d as { ranges?: Range[] })?.ranges ?? []) })))
        .catch(() => {})
    })
  }, [lines])

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l))
  const addLine = () => { if (cat?.slots[0]) setLines(ls => [...ls, { position: cat.slots[0].id, pageTarget: '', months: 1, startsAt: todayISO() }]) }
  const removeLine = (i: number) => setLines(ls => ls.filter((_, j) => j !== i))

  // Client-side clash check mirrors the server's availability rule.
  const clashOf = (i: number): boolean => {
    const l = lines[i]; const slot = slotById[l.position]; if (!slot) return false
    const s = new Date(l.startsAt), e = addMonths(l.startsAt, l.months)
    const taken = (ranges[i] ?? []).filter(r => overlaps(s, e, new Date(r.startsAt), new Date(r.endsAt))).length
    return taken >= slot.cap
  }
  const anyClash = lines.some((_, i) => clashOf(i))
  const missingPage = lines.some(l => slotById[l.position]?.perPage && !l.pageTarget)

  const pay = async () => {
    if (!signedIn) { openPanel('login'); return }
    setErr(''); setPaying(true)
    try {
      const payload = { lines: lines.map(l => ({ position: l.position, pageTarget: l.pageTarget || undefined, months: l.months, startsAt: new Date(l.startsAt).toISOString() })) }
      const res = await trpcAuthed().banners.order.mutate(payload) as { url?: string }
      if (res?.url) window.location.href = res.url
      else setErr('Could not start checkout — please sign in as a business and try again.')
    } catch (e) { setErr((e as Error).message || 'Could not start checkout. Make sure you are signed in.') }
    finally { setPaying(false) }
  }

  if (!cat) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#1a1a1a' }}>Loading advertising options…</div>

  return (
    <div style={{ padding: '16px 14px', maxWidth: 900, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.6, marginBottom: 16 }}>
        Put your business in front of Gran Canaria. Pick your placements and dates below — book up to <b>{cat.maxMonths} months</b> at a time.
        The first month is charged pro-rata from your start date, and you save automatically when you book multiple slots or longer runs.
        Every banner is quantifiably click- and impression-tracked.
      </p>

      {signedIn === false && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#FFF7ED', border: '1.5px solid #FFD4A0', borderRadius: 12, padding: '11px 14px', marginBottom: 16 }}>
          <span style={{ flex: 1, minWidth: 180, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#9a5b1a' }}>Sign in (or create an advertiser account) to book. You can build your basket first.</span>
          <button onClick={() => openPanel('login')} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>Sign in / Register</button>
        </div>
      )}

      {lines.map((l, i) => {
        const slot = slotById[l.position]
        const clash = clashOf(i)
        const booked = ranges[i] ?? []
        return (
          <div key={i} style={{ background: '#fff', border: `1.5px solid ${clash ? '#fecaca' : '#ece3d7'}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 0.4 }}>Placement {i + 1}</span>
              {lines.length > 1 && <button onClick={() => removeLine(i)} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 12 }}>Remove</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Where">
                <select value={l.position} onChange={e => setLine(i, { position: e.target.value, pageTarget: '' })} style={inp}>
                  {cat.slots.map(s => <option key={s.id} value={s.id}>{s.label} — {eur(s.monthlyCents)}/mo</option>)}
                </select>
              </Field>
              {slot?.perPage ? (
                <Field label="Category page">
                  <select value={l.pageTarget} onChange={e => setLine(i, { pageTarget: e.target.value })} style={inp}>
                    <option value="">Choose a page…</option>
                    {cat.pages.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              ) : <div />}
              <Field label="Duration">
                <select value={l.months} onChange={e => setLine(i, { months: Number(e.target.value) })} style={inp}>
                  {cat.durations.map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                </select>
              </Field>
              <Field label="Start date">
                <input type="date" min={todayISO()} value={l.startsAt} onChange={e => setLine(i, { startsAt: e.target.value })} style={inp} />
              </Field>
            </div>
            {slot && (
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#1a1a1a', marginTop: 8, lineHeight: 1.5 }}>
                {slot.scope} {slot.exclusive ? '· Exclusive — one advertiser at a time.' : `· Shared by up to ${slot.cap} advertisers (rotating).`}
              </div>
            )}
            {booked.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'var(--font-nunito)', fontSize: 11, color: clash ? '#b91c1c' : '#9a5b1a' }}>
                {clash ? '✗ Taken for your dates: ' : 'ℹ Already booked: '}
                {booked.map((r, k) => <span key={k}>{new Date(r.startsAt).toLocaleDateString('en-GB')}–{new Date(r.endsAt).toLocaleDateString('en-GB')}{k < booked.length - 1 ? ', ' : ''}</span>)}
              </div>
            )}
            {clash && <div style={{ marginTop: 6, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#b91c1c' }}>Please pick different dates or another placement.</div>}
          </div>
        )
      })}

      <button onClick={addLine} style={{ width: '100%', border: '1.5px dashed #FF7A00', background: '#fff7ed', color: '#c2410c', borderRadius: 12, padding: 12, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 16 }}>+ Add another placement</button>

      {/* Live quote */}
      {quote && (
        <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#1a1a1a', marginBottom: 6 }}>
            <span>Subtotal (first month pro-rata)</span><b>{eur(quote.subtotalCents)}</b>
          </div>
          {quote.discountPct > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#16a34a', marginBottom: 6, fontWeight: 800 }}>
              <span>Multi-placement / duration discount</span><span>−{quote.discountPct}%</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: '#1a1a1a', borderTop: '1px solid #f0ebe4', paddingTop: 8, marginTop: 4 }}>
            <span>Total today</span><span style={{ color: 'var(--orange)' }}>{eur(quote.totalCents)}</span>
          </div>
        </div>
      )}

      {err && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#b91c1c', marginBottom: 10, fontWeight: 700 }}>{err}</div>}

      <button onClick={pay} disabled={paying || anyClash || missingPage || !lines.length}
        style={{ width: '100%', background: anyClash || missingPage ? '#e5e7eb' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: anyClash || missingPage ? '#999' : '#fff', border: 'none', borderRadius: 14, padding: 16, fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: anyClash || missingPage ? 'default' : 'pointer' }}>
        {paying ? 'Starting checkout…' : missingPage ? 'Choose a page for each category slot' : anyClash ? 'Fix the date clashes above' : signedIn === false ? 'Sign in to book' : quote ? `Pay ${eur(quote.totalCents)} & book` : 'Continue'}
      </button>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', textAlign: 'center', marginTop: 10 }}>
        After payment you’ll upload your banner image from your business dashboard. Banners go live once approved by our team.
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, background: '#fff' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
