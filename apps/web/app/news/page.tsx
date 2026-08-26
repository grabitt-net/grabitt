'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// News & Events — Grabitt's blog + local events. Public. Both are CommunityPost
// rows (section = "news" / "events"), created in the Executive Suite.
type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null; createdAt: string }

const NEWS_CATS = ['All', 'Announcements', 'Island News', 'Features', 'Updates']
const EVENT_CATS = ['All', 'Markets', 'Music & Nightlife', 'Family', 'Food & Drink', 'Community', 'Sport']

export default function NewsPage() {
  const [tab, setTab] = useState<'news' | 'events'>('news')
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [cat, setCat] = useState('All')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setPosts(null); setCat('All')
    createLooseTrpcClient().community.list.query({ limit: 30, section: tab })
      .then(p => setPosts(p as Post[])).catch(() => setPosts([]))
  }, [tab])

  const cats = tab === 'events' ? EVENT_CATS : NEWS_CATS
  const shown = posts && cat !== 'All' ? posts.filter(p => p.category === cat) : posts
  const isEvents = tab === 'events'

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
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>{cat === 'All' ? (isEvents ? 'No events listed yet — check back soon.' : 'No news yet — check back soon.') : `No ${cat} ${isEvents ? 'events' : 'articles'} yet.`}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {shown.map(p => (
            <Link key={p.id} href={`/news/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(30,43,85,0.05)', height: '100%' }}>
                <div style={{ height: 130, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48 }}>{p.emoji}</span>}
                </div>
                <div style={{ padding: '13px 15px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{p.category} · {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
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
