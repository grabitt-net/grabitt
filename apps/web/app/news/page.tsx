'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// News & Events — Grabitt's blog + local events. Public. Both are CommunityPost
// rows (section = "news" / "events"), created in the Executive Suite.
type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null; createdAt: string; eventDate?: string | null; eventEndDate?: string | null; eventUrl?: string | null }

// Format an event's date, spanning start→end for multi-day events.
function eventWhen(start: string, end?: string | null): string {
  const s = new Date(start)
  const sFmt = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  if (!end) return `${sFmt}, ${s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  const e = new Date(end)
  const sameDay = s.toDateString() === e.toDateString()
  if (sameDay) return `${sFmt}, ${s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  return `${sFmt} – ${e.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
}

const NEWS_CATS = ['All', 'Announcements', 'Island News', 'Features', 'Updates']
const EVENT_CATS = ['All', 'Markets', 'Music & Nightlife', 'Family', 'Food & Drink', 'Community', 'Sport']

// Compute a [from, to] ISO range for the events date filter.
type RangeMode = 'all' | 'week' | 'month' | 'year' | 'pick' | 'custom'
function computeRange(mode: RangeMode, pick: { m: number; y: number }, custom: { from: string; to: string }): { from?: string; to?: string } {
  const now = new Date()
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  if (mode === 'week') {
    const d = startOfDay(now); const day = (d.getDay() + 6) % 7 // Mon=0
    const from = new Date(d); from.setDate(d.getDate() - day)
    const to = endOfDay(new Date(from)); to.setDate(from.getDate() + 6)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (mode === 'month') return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(), to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)).toISOString() }
  if (mode === 'year') return { from: startOfDay(new Date(now.getFullYear(), 0, 1)).toISOString(), to: endOfDay(new Date(now.getFullYear(), 11, 31)).toISOString() }
  if (mode === 'pick') return { from: startOfDay(new Date(pick.y, pick.m, 1)).toISOString(), to: endOfDay(new Date(pick.y, pick.m + 1, 0)).toISOString() }
  if (mode === 'custom') return { from: custom.from ? startOfDay(new Date(custom.from)).toISOString() : undefined, to: custom.to ? endOfDay(new Date(custom.to)).toISOString() : undefined }
  return {}
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dateInp: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '7px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', color: 'var(--dark)', outline: 'none' }
const dateLbl: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#666' }

export default function NewsPage() {
  const [tab, setTab] = useState<'news' | 'events'>('news')
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [cat, setCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  // Events date selector.
  const now = new Date()
  const [dateMode, setDateMode] = useState<RangeMode>('all')
  const [pick, setPick] = useState({ m: now.getMonth(), y: now.getFullYear() })
  const [custom, setCustom] = useState({ from: '', to: '' })

  const isEvents = tab === 'events'
  const range = isEvents ? computeRange(dateMode, pick, custom) : {}

  useEffect(() => {
    setPosts(null)
    createLooseTrpcClient().community.list.query({ limit: 100, section: tab, ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) })
      .then(p => setPosts(p as Post[])).catch(() => setPosts([]))
  }, [tab, range.from, range.to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCat('All') }, [tab])

  const cats = tab === 'events' ? EVENT_CATS : NEWS_CATS
  const shown = posts && cat !== 'All' ? posts.filter(p => p.category === cat) : posts

  return (
    <InfoPage
      title="Grabitt News"
      topbarTitle="News"
      intro="The latest from Grabitt and the Canary Islands — updates, announcements, features, and what's on near you."
    >
      {/* News / Events tabs */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        {(['news', 'events'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            border: 'none', borderRadius: 999, padding: '9px 22px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 900,
            background: tab === t ? 'var(--orange)' : '#f0ece5', color: tab === t ? '#fff' : '#666',
          }}>{t === 'news' ? '📰 News' : '📅 Events'}</button>
        ))}
      </div>

      {isEvents && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={() => setShowForm(v => !v)} style={{ background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
            {showForm ? 'Close' : '📣 Tell us about an event'}
          </button>
          {showForm && <EventForm onDone={() => setShowForm(false)} />}
        </div>
      )}

      {/* Events date selector — presets, month/year picker, or a custom range. */}
      {isEvents && (
        <div style={{ maxWidth: 640, margin: '0 auto 16px', background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
            {([['all', 'All upcoming'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['pick', 'Pick month'], ['custom', 'Date range']] as [RangeMode, string][]).map(([m, label]) => {
              const on = dateMode === m
              return (
                <button key={m} onClick={() => setDateMode(m)} style={{
                  border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? 'var(--orange)' : '#fff', color: on ? '#fff' : 'var(--dark)',
                  borderRadius: 999, padding: '6px 13px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}>{label}</button>
              )
            })}
          </div>
          {dateMode === 'pick' && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <select value={pick.m} onChange={e => setPick(p => ({ ...p, m: Number(e.target.value) }))} style={dateInp}>
                {MONTHS.map((mn, i) => <option key={mn} value={i}>{mn}</option>)}
              </select>
              <select value={pick.y} onChange={e => setPick(p => ({ ...p, y: Number(e.target.value) }))} style={dateInp}>
                {Array.from({ length: 4 }, (_, i) => now.getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {dateMode === 'custom' && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={dateLbl}>From <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} style={dateInp} /></label>
              <label style={dateLbl}>To <input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} style={dateInp} /></label>
            </div>
          )}
        </div>
      )}

      {/* Category filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
        {cats.map(c => {
          const on = cat === c
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? 'var(--orange)' : '#fff', color: on ? '#fff' : 'var(--dark)',
              borderRadius: 999, padding: '7px 15px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            }}>{c}</button>
          )
        })}
      </div>

      {shown === null ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>Loading…</div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>{isEvents && dateMode !== 'all' ? 'No events in the selected dates — try a wider range.' : cat === 'All' ? (isEvents ? 'No events listed yet — check back soon.' : 'No news yet — check back soon.') : `No ${cat} ${isEvents ? 'events' : 'articles'} yet.`}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {shown.map(p => (
            <Link key={p.id} href={`/news/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(30,43,85,0.05)', height: '100%' }}>
                <div style={{ height: 130, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48 }}>{p.emoji}</span>}
                </div>
                <div style={{ padding: '13px 15px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{p.category} · {isEvents && p.eventDate
                    ? eventWhen(p.eventDate, p.eventEndDate)
                    : new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>{p.excerpt}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </InfoPage>
  )
}

// "Tell us about an event" — sends the details to the team (CRM support inbox).
function EventForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (details.trim().length < 5) { setErr('Please add a few details about the event.'); return }
    setErr(''); setBusy(true)
    try {
      await createLooseTrpcClient().crm.submit.mutate({
        type: 'event',
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        message: details.trim(),
      })
      setDone(true)
      setTimeout(onDone, 2500)
    } catch { setErr('Something went wrong — please try again.') }
    finally { setBusy(false) }
  }

  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 12, padding: '11px 13px', fontFamily: 'var(--font-ui)', fontSize: 13.5, outline: 'none', background: '#fff', marginBottom: 8, textAlign: 'left' }

  if (done) {
    return <div style={{ maxWidth: 480, margin: '14px auto 0', background: '#f0faf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 16, fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, color: '#16a34a' }}>✓ Thanks! Your event has been sent to the team for review.</div>
  }
  return (
    <div style={{ maxWidth: 480, margin: '14px auto 0', background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, boxShadow: '0 4px 18px rgba(30,43,85,0.06)' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 10, textAlign: 'left' }}>Tell us about an event</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" style={field} />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email (optional)" style={field} />
      <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} placeholder="What's the event? Where and when? Add a link if there is one." style={{ ...field, resize: 'vertical', minHeight: 90 }} />
      {err && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 8, textAlign: 'left' }}>{err}</div>}
      <button onClick={submit} disabled={busy} style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Sending…' : 'Send to the team'}</button>
    </div>
  )
}
