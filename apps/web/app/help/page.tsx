'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createLooseTrpcClient } from '@/lib/trpc'
import InfoPage from '@/components/marketplace/InfoPage'
import { HELP_TOPICS, HELP_CATEGORIES, helpCategory, type HelpTopic } from '@/lib/helpContent'

// Full Help Centre: an AI assistant on top, searchable topic categories below.
// Uses the standard footer-page template (logo, title, hero, pills).
export default function HelpPage() {
  return <Inner />
}

type Msg = { role: 'user' | 'assistant'; content: string }
type LArticle = { q: string; a: string; id?: string }
type LTopic = { id: string; icon: string; title: string; blurb: string; articles: LArticle[] }

function Inner() {
  const [query, setQuery] = useState('')
  // Helpdesk navigation: category grid → category's article list → one article.
  const [catId, setCatId] = useState<string | null>(null)
  const [article, setArticle] = useState<{ q: string; a: string; id?: string; topic: LTopic } | null>(null)
  // Admin-managed articles from the database, grouped into topics using the
  // category metadata. Falls back to the built-in content if the DB is empty
  // or unreachable, so the Help Centre is never blank.
  const [allTopics, setAllTopics] = useState<LTopic[]>(HELP_TOPICS)

  useEffect(() => {
    const client = createLooseTrpcClient()
    Promise.all([
      client.help.articles.query().catch(() => []),
      client.help.categories.query().catch(() => []),
    ]).then(([artRes, catRes]) => {
      const rows = artRes as { id: string; category: string; question: string; answer: string }[]
      if (!Array.isArray(rows) || rows.length === 0) return
      // Admin-managed category metadata (title/blurb/icon/order); fall back to
      // the built-in metadata for any category not in the table.
      const cats = catRes as { slug: string; title: string; blurb: string; icon: string }[]
      const meta = new Map(cats.map(c => [c.slug, c]))
      const order = cats.length ? cats.map(c => c.slug) : HELP_CATEGORIES.map(c => c.id)
      const byCat = new Map<string, LTopic>()
      rows.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
      for (const r of rows) {
        let topic = byCat.get(r.category)
        if (!topic) {
          const m = meta.get(r.category)
          const fb = helpCategory(r.category)
          topic = { id: r.category, icon: m?.icon || fb.icon, title: m?.title || fb.title, blurb: m?.blurb ?? fb.blurb, articles: [] }
          byCat.set(r.category, topic)
        }
        topic.articles.push({ q: r.question, a: r.answer, id: r.id })
      }
      setAllTopics(Array.from(byCat.values()))
    }).catch(() => {})
  }, [])

  const q = query.trim().toLowerCase()
  // Flat search results across every article (helpdesk-style search).
  const results = useMemo(() => {
    if (!q) return [] as { q: string; a: string; topic: HelpTopic }[]
    const out: { q: string; a: string; topic: HelpTopic }[] = []
    for (const t of allTopics) for (const a of t.articles) {
      if ((a.q + ' ' + a.a + ' ' + t.title).toLowerCase().includes(q)) out.push({ q: a.q, a: a.a, topic: t })
    }
    return out
  }, [q, allTopics])

  const currentTopic = catId ? allTopics.find(t => t.id === catId) ?? null : null
  const openArticle = (a: { q: string; a: string; id?: string }, topic: LTopic) => setArticle({ ...a, topic })

  return (
    <InfoPage
      title="Help Centre"
      topbarTitle="Help Centre"
      intro="Search our guides, ask the assistant, or browse by topic."
      pills={['AI assistant', 'Searchable guides', 'Buyer & seller help', 'Live chat']}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <AiAssistant />

        {/* Search */}
        <input
          value={query} onChange={e => { setQuery(e.target.value); setCatId(null); setArticle(null) }}
          placeholder="Search the Help Centre…"
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 12, padding: '13px 16px', fontFamily: 'var(--font-nunito)', fontSize: 14.5, outline: 'none', background: '#fff', margin: '20px 0 16px' }}
        />

        {q ? (
          /* ── Search results ── */
          results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              No articles match “{query}”. Try the assistant above, or contact support.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700, marginBottom: 2 }}>{results.length} result{results.length === 1 ? '' : 's'}</div>
              {results.map((r, i) => <ArticleRow key={i} q={r.q} icon={r.topic.icon} sub={r.topic.title} onClick={() => openArticle(r, r.topic)} />)}
            </div>
          )
        ) : article ? (
          /* ── One article ── */
          <div>
            <Crumb onClick={() => setArticle(null)}>{article.topic.icon} {article.topic.title}</Crumb>
            <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(30,43,85,0.05)' }}>
              <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900, color: 'var(--dark)', margin: '0 0 12px', lineHeight: 1.3 }}>{article.q}</h2>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, color: '#333', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{article.a}</p>
              {article.id && <HelpfulVote articleId={article.id} />}
            </div>
          </div>
        ) : currentTopic ? (
          /* ── One category's articles ── */
          <div>
            <Crumb onClick={() => setCatId(null)}>All topics</Crumb>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 14px' }}>
              <span style={{ fontSize: 30 }}>{currentTopic.icon}</span>
              <span>
                <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>{currentTopic.title}</span>
                <span style={{ display: 'block', fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#888' }}>{currentTopic.blurb}</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentTopic.articles.map((a, i) => <ArticleRow key={i} q={a.q} onClick={() => openArticle(a, currentTopic)} />)}
            </div>
          </div>
        ) : (
          /* ── Category grid ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {allTopics.map(t => (
              <button key={t.id} onClick={() => setCatId(t.id)} style={{ textAlign: 'left', background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: '18px 16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(30,43,85,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 30 }}>{t.icon}</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 15.5, fontWeight: 900, color: 'var(--dark)' }}>{t.title}</span>
                <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#888', lineHeight: 1.45 }}>{t.blurb}</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: 'var(--orange)', marginTop: 2 }}>{t.articles.length} article{t.articles.length === 1 ? '' : 's'}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#888' }}>
          Still stuck? <Link href="/contact" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>Email the Grabitt team</Link>.
        </div>
      </div>
    </InfoPage>
  )
}

// One clickable article row (used in category lists and search results).
function ArticleRow({ q, icon, sub, onClick }: { q: string; icon?: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {icon && <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{q}</span>
        {sub && <span style={{ display: 'block', fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#999' }}>{sub}</span>}
      </span>
      <span style={{ color: 'var(--orange)', fontWeight: 900, flexShrink: 0 }}>›</span>
    </button>
  )
}

// "Was this helpful?" — records a deflection signal for the article.
function HelpfulVote({ articleId }: { articleId: string }) {
  const [voted, setVoted] = useState<null | boolean>(null)
  const vote = (helpful: boolean) => {
    setVoted(helpful)
    createLooseTrpcClient().help.rate.mutate({ id: articleId, helpful }).catch(() => {})
  }
  return (
    <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f0eae0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {voted === null ? (
        <>
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#888' }}>Was this helpful?</span>
          <button onClick={() => vote(true)} style={voteBtn}>👍 Yes</button>
          <button onClick={() => vote(false)} style={voteBtn}>👎 No</button>
        </>
      ) : (
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>{voted ? '✓ Thanks for your feedback!' : 'Thanks — we’ll improve this article.'}</span>
      )}
    </div>
  )
}
const voteBtn: React.CSSProperties = { background: '#fff', border: '1.5px solid #e5dccd', borderRadius: 999, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', cursor: 'pointer' }

function Crumb({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', padding: '0 0 12px', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--orange)' }}>{children}</button>
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
