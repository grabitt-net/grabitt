'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import ChatWindow from './ChatWindow'

// The Messages centre, laid out like an email inbox: conversations down the
// left, the selected conversation and its reply box on the right. Picking a
// thread swaps the right pane rather than navigating, so you keep your place in
// the list. Below 860px it collapses to one pane at a time — list, then
// conversation with a back control.

type Thread = {
  id: string
  listingId: string
  lastMessageAt: string | null
  participants: { userId: string; user: { id: string; displayName: string; avatar: string | null } }[]
  messages: { id: string; senderId: string; body: string; blocked: boolean; readAt: string | null; createdAt: string }[]
  listing: { id: string; title: string; price: unknown; images: string[] } | null
}

export default function InboxClient({ me, alertUnread }: { me: string; alertUnread: number }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { setLoaded(true); return }
    try {
      const rows = await trpcAuthed().messages.myThreads.query()
      setThreads(rows as unknown as Thread[])
    } catch { /* leave the list empty */ }
    finally { setLoaded(true) }
  }, [])

  useEffect(() => { load() }, [load])

  // Opening a conversation clears its unread state, here and in the list.
  const open = async (id: string) => {
    setSelected(id)
    try { await trpcAuthed().messages.markThreadRead.mutate({ threadId: id }) } catch { /* non-fatal */ }
    setThreads(ts => ts.map(t => t.id === id
      ? { ...t, messages: t.messages.map(m => (m.senderId !== me ? { ...m, readAt: new Date().toISOString() } : m)) }
      : t))
  }

  const current = threads.find(t => t.id === selected) ?? null
  const otherOf = (t: Thread) => t.participants.find(p => p.userId !== me)?.user

  return (
    <div className={`inbox ${selected ? 'inbox--reading' : ''}`}>
      {/* ── Left: conversations ─────────────────────────────────────────── */}
      <aside className="inbox__list">
        <Link href="/messages/team" style={pinned}>
          <div style={{ ...avatarCircle, background: 'linear-gradient(135deg,#FF4500,#FF8C00)' }}>💬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={nameRow}>Grabitt Team</div>
            <div style={preview}>Questions about buying, selling or safety?</div>
          </div>
        </Link>
        <Link href="/messages/alerts" style={pinned}>
          <div style={{ ...avatarCircle, background: '#FFF3EE' }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={nameRow}>Grabitt Alerts</div>
            <div style={preview}>Price drops & saved-item alerts.</div>
          </div>
          {alertUnread > 0 && <span style={badge}>{alertUnread > 99 ? '99+' : alertUnread}</span>}
        </Link>

        {!loaded ? (
          <div style={empty}>Loading…</div>
        ) : threads.length === 0 ? (
          <div style={empty}>No conversations yet — message a seller from any listing.</div>
        ) : threads.map(t => {
          const other = otherOf(t)
          const last = t.messages[0]
          const unread = !!last && last.senderId !== me && !last.readAt
          const active = t.id === selected
          return (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              style={{
                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px',
                borderBottom: '1px solid #f0ece5',
                borderLeft: `3px solid ${active ? 'var(--orange)' : 'transparent'}`,
                background: active ? '#FFF8F4' : '#fff',
              }}
            >
              <div style={{ ...avatarCircle, background: '#FFF3EE', color: 'var(--orange)', fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-nunito)' }}>
                {other?.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...nameRow, fontWeight: unread ? 900 : 700 }}>{other?.displayName ?? 'Grabitt User'}</div>
                {t.listing && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: 'var(--orange)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.listing.title}</div>}
                <div style={{ ...preview, fontWeight: unread ? 800 : 500, color: unread ? '#444' : '#999' }}>
                  {last ? (last.blocked ? '⚠️ Message hidden' : last.body) : 'Start chatting…'}
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 9.5, color: '#bbb' }}>{shortDate(t.lastMessageAt)}</span>
                {unread && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--orange)' }} />}
              </div>
            </button>
          )
        })}
      </aside>

      {/* ── Right: the selected conversation ────────────────────────────── */}
      <section className="inbox__reader">
        {!current ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: 40, fontFamily: 'var(--font-nunito)', color: '#bbb' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>✉️</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Select a conversation</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>Pick a message on the left to read and reply.</div>
          </div>
        ) : (
          <>
            <header style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)', background: 'var(--sand)', flexShrink: 0 }}>
              <button onClick={() => setSelected(null)} className="inbox__back" aria-label="Back to conversations"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--dark)', padding: 0 }}>←</button>
              <div style={{ ...avatarCircle, background: 'var(--orange)', color: '#fff', fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-nunito)' }}>
                {otherOf(current)?.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{otherOf(current)?.displayName ?? 'Grabitt User'}</div>
                {current.listing && (
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: 'var(--orange)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {current.listing.title}
                    {current.listing.price != null && ` · €${Number(current.listing.price).toLocaleString()}`}
                  </div>
                )}
              </div>
              {current.listing && (
                <Link href={`/listings/${current.listing.id}`} style={{ flexShrink: 0, background: '#fff', border: '1px solid var(--sand2)', color: '#555', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-nunito)', textDecoration: 'none' }}>
                  View listing
                </Link>
              )}
            </header>
            {/* Keyed so switching conversation resets the message list cleanly. */}
            <ChatWindow key={current.id} threadId={current.id} userId={me} initialMessages={[]} />
          </>
        )}
      </section>
    </div>
  )
}

function shortDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

const avatarCircle: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }
const nameRow: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const preview: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }
const pinned: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid #f0ece5', borderLeft: '3px solid transparent', background: '#fff', textDecoration: 'none' }
const badge: React.CSSProperties = { flexShrink: 0, background: 'var(--orange)', color: '#fff', fontSize: 10.5, fontWeight: 900, fontFamily: 'var(--font-nunito)', minWidth: 20, height: 20, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }
const empty: React.CSSProperties = { padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa' }
