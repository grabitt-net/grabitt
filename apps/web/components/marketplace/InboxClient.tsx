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
  unreadCount?: number
  archived?: boolean
  pinned?: boolean
  flagged?: boolean
  participants: { userId: string; user: { id: string; displayName: string; avatar: string | null } }[]
  messages: { id: string; senderId: string; body: string; blocked: boolean; readAt: string | null; createdAt: string }[]
  listing: { id: string; title: string; price: unknown; images: string[] } | null
}

type Alert = { id: string; kind: string; title: string; body: string; actionUrl: string | null; readAt: string | null; createdAt: string }

// Alerts are grouped into persistent channels, each pinned at the top of the
// inbox. An alert is placed in the FIRST category whose `match` returns true, so
// the catch-all "Other alerts" (last) collects anything not covered above.
// An alert is placed in the FIRST category whose `match` returns true. Matching
// looks at both the notification `kind` AND its text, so relist/expiry notices
// posted under a generic kind (e.g. 'system') still land in Relisting.
type AlertCat = { key: string; label: string; emoji: string; sub: string; match: (a: Alert) => boolean }
const txt = (a: Alert) => `${a.title} ${a.body}`.toLowerCase()
const RELIST_KINDS = ['listing_expiring', 'relist', 'relisted', 'listing_relisted', 'expiring', 'expired']
const ALERT_CATS: AlertCat[] = [
  { key: 'relist', label: 'Relisting alerts', emoji: '🔁', sub: 'Listings due to relist or expire', match: a => RELIST_KINDS.includes(a.kind) || /relist|expir/.test(txt(a)) },
  { key: 'offers', label: 'Offer alerts', emoji: '💰', sub: 'Offers on your items', match: a => a.kind.startsWith('offer') || /\boffer\b/.test(txt(a)) },
  { key: 'price', label: 'Price drops', emoji: '📉', sub: 'Saved items that dropped in price', match: a => a.kind === 'price_drop' || /price drop|price dropped|now cheaper|reduced/.test(txt(a)) },
  { key: 'other', label: 'Other alerts', emoji: '🔔', sub: 'Saved-item matches & updates', match: () => true },
]
// The three persistent channels always show (even when empty); "other" only when
// it has something.
const PERSISTENT_CATS = ['relist', 'offers', 'price']
const ALERT_ICON: Record<string, string> = { price_drop: '📉', wish_matched: '✨', listing_expiring: '⏳', relist: '🔁', relisted: '🔁' }
const catFor = (a: Alert) => ALERT_CATS.find(c => c.match(a)) ?? ALERT_CATS[ALERT_CATS.length - 1]
const TEAM_MESSAGES = [
  "👋 Welcome to Grabitt — the Canary Islands' local marketplace!",
  'Buy and sell safely: payments are held securely until you confirm handover, and our Safety Shield is one tap away any time.',
  'Got a question about buying, selling, jobs, property or safety? Reply here and our team will help. We usually respond within 24 hours (Mon–Fri).',
]

function ChannelHeader({ emoji, bg, title, sub, onBack }: { emoji: string; bg: string; title: string; sub: string; onBack: () => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)', background: 'var(--sand)', flexShrink: 0 }}>
      <button onClick={onBack} className="inbox__back" aria-label="Back to conversations"
        style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--dark)', padding: 0 }}>←</button>
      <div style={{ ...avatarCircle, background: bg }}>{emoji}</div>
      <div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#16a34a', fontWeight: 800 }}>{sub}</div>
      </div>
    </header>
  )
}

// `initial` opens a specific conversation on mount — a thread id, or the pinned
// 'team' / 'alerts' channels — so deep links resolve inside the hub inbox.
export default function InboxClient({ me, initial }: { me: string; alertUnread?: number; initial?: string | null }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loaded, setLoaded] = useState(false)
  // A deep link of 'alerts' opens the first alert channel; a category key
  // ('alert:offers' etc.) opens that one directly.
  const [selected, setSelected] = useState<string | null>(initial === 'alerts' ? 'alert:relist' : (initial ?? null))
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [view, setView] = useState<'inbox' | 'archive'>('inbox')

  // Group alerts into their channels; compute unread counts per channel.
  const grouped: Record<string, Alert[]> = {}
  for (const a of alerts ?? []) (grouped[catFor(a).key] ??= []).push(a)
  const unreadByCat = (key: string) => (grouped[key] ?? []).filter(a => !a.readAt).length

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

  // Keep the conversation list live — poll and refresh on focus so new messages
  // and their unread counts appear without a manual reload.
  useEffect(() => {
    const timer = setInterval(load, 25000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [load])

  // Load all notifications up front so the pinned channels show unread counts.
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { setAlerts([]); return }
      try { setAlerts(await trpcAuthed().notifications.list.query({ unreadOnly: false }) as Alert[]) }
      catch { setAlerts([]) }
    })()
  }, [])

  // Opening an alert channel marks its unread items read.
  const openAlertCat = async (key: string) => {
    setSelected('alert:' + key)
    const unread = (grouped[key] ?? []).filter(a => !a.readAt).map(a => a.id)
    if (unread.length) {
      try { await trpcAuthed().notifications.markRead.mutate({ ids: unread }) } catch { /* non-fatal */ }
      setAlerts(prev => prev ? prev.map(a => unread.includes(a.id) ? { ...a, readAt: new Date().toISOString() } : a) : prev)
    }
  }

  // Opening a conversation clears its unread state, here and in the list.
  const open = async (id: string) => {
    setSelected(id)
    try { await trpcAuthed().messages.markThreadRead.mutate({ threadId: id }) } catch { /* non-fatal */ }
    setThreads(ts => ts.map(t => t.id === id
      ? { ...t, unreadCount: 0, messages: t.messages.map(m => (m.senderId !== me ? { ...m, readAt: new Date().toISOString() } : m)) }
      : t))
  }

  const current = threads.find(t => t.id === selected) ?? null
  const otherOf = (t: Thread) => t.participants.find(p => p.userId !== me)?.user
  const archivedCount = threads.filter(t => t.archived).length
  // Pinned first, then most recent. Applies within whichever view is showing.
  const visibleThreads = threads
    .filter(t => (view === 'archive' ? t.archived : !t.archived))
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
      return new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
    })

  // Archive / restore a conversation (moves it between Inbox and Archive).
  const setArchived = async (id: string, archived: boolean) => {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, archived } : t))
    if (selected === id) setSelected(null)
    try { await trpcAuthed().messages.setArchived.mutate({ threadId: id, archived }) } catch { /* revert on failure */ load() }
  }

  // Pin / unpin — keeps a conversation at the top of the list.
  const setPinned = async (id: string, pinned: boolean) => {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, pinned } : t))
    try { await trpcAuthed().messages.setPinned.mutate({ threadId: id, pinned }) } catch { load() }
  }

  // Flag / unflag — a star for follow-up.
  const setFlagged = async (id: string, flagged: boolean) => {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, flagged } : t))
    try { await trpcAuthed().messages.setFlagged.mutate({ threadId: id, flagged }) } catch { load() }
  }

  // Mark a conversation read or unread from the list (like email).
  const setRead = async (id: string, read: boolean) => {
    setThreads(ts => ts.map(t => t.id === id
      ? { ...t, unreadCount: read ? 0 : Math.max(1, t.unreadCount ?? 0), messages: read ? t.messages.map(m => m.senderId !== me ? { ...m, readAt: new Date().toISOString() } : m) : t.messages }
      : t))
    try { await trpcAuthed().messages.setThreadRead.mutate({ threadId: id, read }) } catch { load() }
  }

  return (
    <div className={`inbox ${selected ? 'inbox--reading' : ''}`}>
      {/* ── Left: conversations ─────────────────────────────────────────── */}
      <aside className="inbox__list">
        {/* Inbox / Archive switch */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid #f0ece5' }}>
          {(['inbox', 'archive'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setSelected(null) }} style={{ flex: 1, border: `1.5px solid ${view === v ? 'var(--orange)' : '#e5dccd'}`, background: view === v ? 'var(--orange)' : '#fff', color: view === v ? '#fff' : '#555', borderRadius: 50, padding: '7px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{v === 'inbox' ? 'Inbox' : `Archive${archivedCount ? ` (${archivedCount})` : ''}`}</button>
          ))}
        </div>
        {view === 'inbox' && <button onClick={() => setSelected('team')} style={{ ...pinned, ...(selected === 'team' ? pinnedActive : null) }}>
          <div style={{ ...avatarCircle, background: 'linear-gradient(135deg,var(--orange),var(--orange2))' }}>💬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={nameRow}>Grabitt Team</div>
            <div style={preview}>Questions about buying, selling or safety?</div>
          </div>
        </button>}
        {/* Persistent alert channels — one per alert type, pinned above chats. */}
        {view === 'inbox' && ALERT_CATS.filter(c => PERSISTENT_CATS.includes(c.key) || (grouped[c.key]?.length ?? 0) > 0).map(c => {
          const n = unreadByCat(c.key)
          return (
            <button key={c.key} onClick={() => openAlertCat(c.key)} style={{ ...pinned, ...(selected === 'alert:' + c.key ? pinnedActive : null) }}>
              <div style={{ ...avatarCircle, background: '#FFF3EE' }}>{c.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={nameRow}>{c.label}</div>
                <div style={preview}>{c.sub}</div>
              </div>
              {n > 0 && <span style={badge}>{n > 99 ? '99+' : n}</span>}
            </button>
          )
        })}

        {!loaded ? (
          <div style={empty}>Loading…</div>
        ) : visibleThreads.length === 0 ? (
          <div style={empty}>{view === 'archive' ? 'No archived conversations.' : 'No conversations yet — message a seller from any listing.'}</div>
        ) : visibleThreads.map(t => {
          const other = otherOf(t)
          const last = t.messages[0]
          const unreadN = t.unreadCount ?? (last && last.senderId !== me && !last.readAt ? 1 : 0)
          const unread = unreadN > 0
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
              {/* Unread dot — the at-a-glance "new" marker, like email. */}
              <span style={{ flexShrink: 0, width: 9, height: 9, borderRadius: '50%', background: unread ? 'var(--orange)' : 'transparent', alignSelf: 'flex-start', marginTop: 6 }} />
              <div style={{ ...avatarCircle, background: '#FFF3EE', color: 'var(--orange)', fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-nunito)' }}>
                {other?.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t.pinned && <span title="Pinned" style={{ fontSize: 11, flexShrink: 0 }}>📌</span>}
                  {t.flagged && <span title="Flagged" style={{ fontSize: 11, flexShrink: 0 }}>⭐</span>}
                  <div style={{ ...nameRow, fontWeight: unread ? 900 : 700 }}>{other?.displayName ?? 'Grabitt User'}</div>
                </div>
                {t.listing && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: 'var(--orange)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.listing.title}</div>}
                <div style={{ ...preview, fontWeight: unread ? 800 : 500, color: unread ? '#444' : '#999' }}>
                  {last ? (last.blocked ? '⚠️ Message hidden' : last.body) : 'Start chatting…'}
                </div>
                {/* Row actions — flag, pin, mark read/unread, archive. */}
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  <RowAction title={t.flagged ? 'Unflag' : 'Flag for follow-up'} active={!!t.flagged} onClick={e => { e.stopPropagation(); setFlagged(t.id, !t.flagged) }}>{t.flagged ? '⭐' : '☆'}</RowAction>
                  <RowAction title={t.pinned ? 'Unpin' : 'Pin to top'} active={!!t.pinned} onClick={e => { e.stopPropagation(); setPinned(t.id, !t.pinned) }}>📌</RowAction>
                  <RowAction title={unread ? 'Mark as read' : 'Mark as unread'} onClick={e => { e.stopPropagation(); setRead(t.id, unread) }}>{unread ? '✓' : '✉️'}</RowAction>
                  <RowAction title={view === 'archive' ? 'Restore to inbox' : 'Archive'} onClick={e => { e.stopPropagation(); setArchived(t.id, view !== 'archive') }}>{view === 'archive' ? '↩️' : '🗄️'}</RowAction>
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 9.5, color: '#bbb' }}>{shortDate(t.lastMessageAt)}</span>
                {unreadN > 0 && <span style={badge}>{unreadN > 99 ? '99+' : unreadN}</span>}
              </div>
            </button>
          )
        })}
      </aside>

      {/* ── Right: the selected conversation ────────────────────────────── */}
      <section className="inbox__reader">
        {selected === 'team' ? (
          <>
            <ChannelHeader emoji="💬" bg="linear-gradient(135deg,var(--orange),var(--orange2))" title="Grabitt Team" sub="● Official · here to help" onBack={() => setSelected(null)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TEAM_MESSAGES.map((m, i) => (
                <div key={i} style={{ maxWidth: '85%', background: '#fff', border: '1px solid #eee', borderRadius: '4px 16px 16px 16px', padding: '11px 14px', fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#333', lineHeight: 1.55, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>{m}</div>
              ))}
              <Link href="/help" style={{ alignSelf: 'flex-start', marginTop: 4, textDecoration: 'none' }}>
                <span style={{ display: 'inline-block', background: '#FFF3EE', color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, padding: '9px 16px', borderRadius: 50 }}>🆘 Open the Help Centre</span>
              </Link>
            </div>
          </>
        ) : selected?.startsWith('alert:') ? (() => {
          const cat = ALERT_CATS.find(c => 'alert:' + c.key === selected) ?? ALERT_CATS[0]
          const list = grouped[cat.key] ?? []
          return (
          <>
            <ChannelHeader emoji={cat.emoji} bg="#FFF3EE" title={cat.label} sub={cat.sub} onBack={() => setSelected(null)} />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {alerts === null ? (
                <div style={empty}>Loading…</div>
              ) : list.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 24px' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{cat.emoji}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14.5, fontWeight: 900, color: 'var(--dark)', marginBottom: 5 }}>No {cat.label.toLowerCase()} yet</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#888', lineHeight: 1.5 }}>{cat.sub}. We&apos;ll post them here as they happen.</div>
                </div>
              ) : list.map(a => {
                const inner = (
                  <>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFF3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{ALERT_ICON[a.kind] ?? '🔔'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)' }}>{a.title}</div>
                      <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#666', marginTop: 2, lineHeight: 1.5 }}>{a.body}</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#bbb', marginTop: 4 }}>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    {a.actionUrl && <div style={{ alignSelf: 'center', color: 'var(--orange)', fontWeight: 800, fontSize: 16 }}>›</div>}
                  </>
                )
                const rowStyle: React.CSSProperties = { display: 'flex', gap: 11, background: '#fff', padding: '12px 14px', borderBottom: '1px solid #f0ece5', textDecoration: 'none' }
                return a.actionUrl
                  ? <Link key={a.id} href={a.actionUrl} style={rowStyle}>{inner}</Link>
                  : <div key={a.id} style={rowStyle}>{inner}</div>
              })}
            </div>
          </>
          )
        })() : !current ? (
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

// A small inline action on a conversation row. Rendered as a span (not a button)
// because the row itself is a <button> and nesting buttons is invalid HTML.
function RowAction({ title, active, onClick, children }: { title: string; active?: boolean; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={title}
      aria-label={title}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e as unknown as React.MouseEvent) } }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 7, cursor: 'pointer', fontSize: 12,
        background: active ? '#FFF3EE' : '#f6f2ec', color: '#555', userSelect: 'none',
      }}
    >{children}</span>
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
const pinned: React.CSSProperties = { width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid #f0ece5', borderLeft: '3px solid transparent', background: '#fff', textDecoration: 'none' }
const pinnedActive: React.CSSProperties = { borderLeftColor: 'var(--orange)', background: '#FFF8F4' }
const badge: React.CSSProperties = { flexShrink: 0, background: 'var(--orange)', color: '#fff', fontSize: 10.5, fontWeight: 900, fontFamily: 'var(--font-nunito)', minWidth: 20, height: 20, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }
const empty: React.CSSProperties = { padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa' }
