'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import { createLooseTrpcClient } from '@/lib/trpc'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'
import { HELP_TOPICS, HELP_CATEGORIES, helpCategory, type HelpTopic } from '@/lib/helpContent'

// Full Help Centre: an AI assistant on top, searchable topic categories below.
export default function HelpPage() {
  return <PanelProvider><Inner /></PanelProvider>
}

type Msg = { role: 'user' | 'assistant'; content: string }

function Inner() {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  // Admin-managed articles from the database, grouped into topics using the
  // category metadata. Falls back to the built-in content if the DB is empty
  // or unreachable, so the Help Centre is never blank.
  const [allTopics, setAllTopics] = useState<HelpTopic[]>(HELP_TOPICS)

  useEffect(() => {
    createLooseTrpcClient().help.articles.query()
      .then((res) => {
        const rows = res as { category: string; question: string; answer: string }[]
        if (!Array.isArray(rows) || rows.length === 0) return
        const byCat = new Map<string, HelpTopic>()
        // Preserve the category order from HELP_CATEGORIES, then any extras.
        const order = HELP_CATEGORIES.map(c => c.id)
        rows.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
        for (const r of rows) {
          let topic = byCat.get(r.category)
          if (!topic) {
            const meta = helpCategory(r.category)
            topic = { id: meta.id, icon: meta.icon, title: meta.title, blurb: meta.blurb, articles: [] }
            byCat.set(r.category, topic)
          }
          topic.articles.push({ q: r.question, a: r.answer })
        }
        setAllTopics(Array.from(byCat.values()))
      })
      .catch(() => {})
  }, [])

  // Filter topics/articles by the search box.
  const topics = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allTopics
    return allTopics
      .map(t => ({ ...t, articles: t.articles.filter(a => (a.q + ' ' + a.a + ' ' + t.title).toLowerCase().includes(q)) }))
      .filter(t => t.articles.length > 0 || t.title.toLowerCase().includes(q))
  }, [query, allTopics])

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Help Centre" />
      <div style={{ padding: '18px 16px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 40 }}>❓</div>
          <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 24, fontWeight: 900, color: 'var(--dark)', margin: '4px 0 0' }}>How can we help?</h1>
          <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#666', margin: '6px 0 0' }}>Ask our assistant, or browse the topics below.</p>
        </div>

        <AiAssistant />

        {/* Search */}
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search help articles…"
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-nunito)', fontSize: 14, outline: 'none', background: '#fff', margin: '20px 0 14px' }}
        />

        {/* Topics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topics.map(t => (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <button onClick={() => setOpenId(openId === t.id ? null : t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{t.title}</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#1a1a1a' }}>{t.blurb}</span>
                </span>
                <span style={{ color: 'var(--orange)', fontWeight: 900, transform: openId === t.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
              </button>
              {(openId === t.id || query.trim()) && (
                <div style={{ padding: '0 16px 8px' }}>
                  {t.articles.map((a, i) => (
                    <details key={i} style={{ borderTop: '1px solid #f4efe8' }}>
                      <summary style={{ padding: '11px 0', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', cursor: 'pointer' }}>{a.q}</summary>
                      <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#555', lineHeight: 1.6 }}>{a.a}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          ))}
          {topics.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              No articles match “{query}”. Try the assistant above, or contact support.
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#888' }}>
          Still stuck? <Link href="/messages/team" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>Message the Grabitt team</Link>.
        </div>
      </div>

      <Footer />
      <PanelHost />
    </main>
  )
}

function AiAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const suggestions = ['How does escrow work?', 'How do I sell an item?', 'Can I get a refund?', 'How do I list a property?']

  const ask = async (q: string) => {
    const question = q.trim()
    if (!question || busy) return
    const history = msgs
    setMsgs(m => [...m, { role: 'user', content: question }])
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/help-ai', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', content: data?.answer ?? "Sorry, I couldn't answer that." }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Sorry — the assistant is unavailable right now. Try the topics below.' }])
    } finally {
      setBusy(false)
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg,#FFF3EE,#FFE4D6)', border: '1.5px solid #FFD9C2', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>Ask the Grabitt Assistant</span>
      </div>

      {msgs.length > 0 && (
        <div ref={scrollRef} style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? 'var(--orange)' : '#fff', color: m.role === 'user' ? '#fff' : '#333', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '9px 12px', fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          ))}
          {busy && <div style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#1a1a1a', padding: '4px 6px' }}>Thinking…</div>}
        </div>
      )}

      {msgs.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => ask(s)} style={{ background: '#fff', border: '1px solid #FFD9C2', color: 'var(--orange)', borderRadius: 50, padding: '6px 11px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); ask(input) }} style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your question…" style={{ flex: 1, minWidth: 0, border: '1.5px solid #FFD9C2', borderRadius: 50, padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }} />
        <button type="submit" disabled={busy || !input.trim()} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: busy ? 'default' : 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}>Ask</button>
      </form>
    </div>
  )
}
