'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Exec suite — e-marketing. Real campaigns against real, consent-filtered
// audiences, with delivery and engagement from the Resend webhook.

interface Eshot {
  id: string
  subject: string
  bodyHtml: string
  preheader: string | null
  fromName: string | null
  segment: string
  status: string
  sentAt: string | null
  createdAt: string
  recipientCount: number
  deliveredCount: number
  bounceCount: number
  complaintCount: number
  openCount: number
  clickCount: number
  openRate: number
  clickRate: number
  bounceRate: number
}

const SEGMENTS: [string, string][] = [
  ['all', 'Everyone (opted in)'], ['grabber', 'Grabbers'], ['dealer', 'Dealers'],
  ['trader', 'Traders'], ['pro', 'Pros'], ['business', 'Business accounts'],
  ['new_members', 'New members (30 days)'], ['inactive_30', 'Inactive 30 days'], ['inactive_60', 'Inactive 60 days'],
]
const SEGMENT_LABEL = Object.fromEntries(SEGMENTS)

const TEMPLATES: { name: string; subject: string; body: string }[] = [
  { name: 'Newsletter', subject: 'What’s new on Grabitt this month', body: '<h2>Hello 👋</h2>\n<p>Here’s what’s new on Grabitt this month.</p>\n<ul>\n<li>Something new</li>\n<li>Something else</li>\n</ul>\n<p><a href="https://www.grabitt.net">Browse the marketplace →</a></p>' },
  { name: 'Promotion', subject: '☀️ Deals are live — grab them now', body: '<h2>Deals are live</h2>\n<p>Big savings across the island, for a limited time.</p>\n<p><a href="https://www.grabitt.net">See the deals →</a></p>' },
  { name: 'Re-engage', subject: 'We miss you — here’s what’s new', body: '<h2>It’s been a while</h2>\n<p>Plenty has changed on Grabitt since your last visit.</p>\n<p><a href="https://www.grabitt.net">Take a look →</a></p>' },
  { name: 'Seller tips', subject: 'Sell faster: 5 tips that work', body: '<h2>Sell faster</h2>\n<p>Five things our best sellers do differently.</p>\n<p><a href="https://www.grabitt.net">Start selling →</a></p>' },
]

const date = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function EshotsView() {
  const api = useCrmApi()
  const [tab, setTab] = useState<'campaigns' | 'compose'>('campaigns')
  const [eshots, setEshots] = useState<Eshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Eshot | null>(null)
  const [editing, setEditing] = useState<Eshot | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setEshots((await api.eshots()) as Eshot[]) }
    catch { setError('Could not load campaigns.') }
    finally { setLoading(false) }
  }, [api])
  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const sent = eshots.filter(e => e.sentAt)
    const recipients = sent.reduce((n, e) => n + e.recipientCount, 0)
    const opens = sent.reduce((n, e) => n + e.openCount, 0)
    const clicks = sent.reduce((n, e) => n + e.clickCount, 0)
    return {
      campaigns: sent.length,
      recipients,
      openRate: recipients ? Math.round((opens / recipients) * 1000) / 10 : 0,
      clickRate: recipients ? Math.round((clicks / recipients) * 1000) / 10 : 0,
    }
  }, [eshots])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={h1}>📧 E-marketing</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setTab('campaigns')} style={chip(tab === 'campaigns')}>Campaigns</button>
          <button onClick={() => { setEditing(null); setTab('compose') }} style={chip(tab === 'compose')}>+ New campaign</button>
        </div>
      </div>
      <p style={sub}>Campaigns go only to members who opted in to marketing. Every email carries an unsubscribe link.</p>

      {tab === 'campaigns' && (
        <>
          <div style={statRow}>
            <Stat label="Campaigns sent" value={String(stats.campaigns)} />
            <Stat label="Emails delivered" value={String(stats.recipients)} />
            <Stat label="Avg open rate" value={`${stats.openRate}%`} color="#16a34a" />
            <Stat label="Avg click rate" value={`${stats.clickRate}%`} color="#FF4500" />
          </div>

          {loading ? <div style={empty}>Loading…</div>
            : error ? <div style={{ ...empty, color: '#ef4444' }}>{error}</div>
            : eshots.length === 0 ? <div style={empty}>No campaigns yet. Create your first one.</div>
            : (
            <div style={{ overflowX: 'auto' }}>
              <table style={table}>
                <thead><tr>{['Campaign', 'Segment', 'Recipients', 'Opens', 'Clicks', 'Bounces', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {eshots.map(e => (
                    <tr key={e.id} style={{ borderTop: '1px solid #f0ece5' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 800, color: '#1a1a1a' }}>{e.subject}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{e.sentAt ? `Sent ${date(e.sentAt)}` : `Draft · ${date(e.createdAt)}`}</div>
                      </td>
                      <td style={td}>{SEGMENT_LABEL[e.segment] ?? e.segment}</td>
                      <td style={td}>{e.recipientCount || '—'}</td>
                      <td style={td}>{e.sentAt ? <><strong>{e.openRate}%</strong> <span style={{ color: '#aaa' }}>({e.openCount})</span></> : '—'}</td>
                      <td style={td}>{e.sentAt ? <><strong>{e.clickRate}%</strong> <span style={{ color: '#aaa' }}>({e.clickCount})</span></> : '—'}</td>
                      <td style={{ ...td, color: e.bounceCount ? '#ef4444' : '#aaa' }}>{e.sentAt ? e.bounceCount : '—'}</td>
                      <td style={td}><span style={pill(e.status === 'sent' ? '#16a34a' : e.status === 'sending' ? '#f59e0b' : e.status === 'failed' ? '#ef4444' : '#888')}>{e.status}</span></td>
                      <td style={td}>
                        {e.sentAt
                          ? <button onClick={() => setDetail(e)} style={linkBtn}>Results →</button>
                          : <button onClick={() => { setEditing(e); setTab('compose') }} style={linkBtn}>Edit →</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'compose' && (
        <Compose
          api={api}
          existing={editing}
          onDone={() => { setEditing(null); setTab('campaigns'); load() }}
          onCancel={() => { setEditing(null); setTab('campaigns') }}
        />
      )}

      {detail && <Results api={api} eshot={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function Compose({ api, existing, onDone, onCancel }: { api: any; existing: Eshot | null; onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(existing?.subject ?? '')
  const [preheader, setPreheader] = useState(existing?.preheader ?? '')
  const [fromName, setFromName] = useState(existing?.fromName ?? 'Grabitt')
  const [segment, setSegment] = useState(existing?.segment ?? 'all')
  const [body, setBody] = useState(existing?.bodyHtml ?? '')
  const [audience, setAudience] = useState<number | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [testTo, setTestTo] = useState('')

  useEffect(() => {
    api.eshotAudienceSize(segment).then(setAudience).catch(() => setAudience(null))
  }, [api, segment])

  const save = async () => {
    setBusy('save'); setErr('')
    try {
      const payload = { subject, bodyHtml: body, preheader: preheader || undefined, fromName: fromName || undefined, segment }
      const saved = existing
        ? await api.updateEshot({ id: existing.id, ...payload })
        : await api.createEshot(payload)
      setMsg('✓ Saved')
      return saved
    } catch (e: any) { setErr(e?.message ?? 'Could not save'); return null }
    finally { setBusy('') }
  }

  const sendTest = async () => {
    if (!testTo.trim()) { setErr('Enter an address to send the test to.'); return }
    setBusy('test'); setErr('')
    try {
      const saved = existing ?? await api.createEshot({ subject, bodyHtml: body, preheader: preheader || undefined, fromName: fromName || undefined, segment })
      await api.sendEshotTest(saved.id, testTo.trim())
      setMsg(`✓ Test sent to ${testTo.trim()}`)
    } catch (e: any) { setErr(e?.message ?? 'Could not send the test') }
    finally { setBusy('') }
  }

  const send = async () => {
    if (!confirm(`Send "${subject}" to ${audience ?? '?'} opted-in members?\n\nThis cannot be undone.`)) return
    setBusy('send'); setErr('')
    try {
      const saved = existing ?? await api.createEshot({ subject, bodyHtml: body, preheader: preheader || undefined, fromName: fromName || undefined, segment })
      if (existing) await api.updateEshot({ id: existing.id, subject, bodyHtml: body, preheader: preheader || null, fromName: fromName || null, segment })
      const res = await api.sendEshot(saved.id)
      alert(`Sent to ${res.sent} of ${res.recipients} recipients${res.failed ? ` · ${res.failed} failed` : ''}.`)
      onDone()
    } catch (e: any) { setErr(e?.message ?? 'Could not send'); setBusy('') }
  }

  const canSend = subject.trim() && body.trim() && (audience ?? 0) > 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)', gap: 16, alignItems: 'start' }}>
      <div style={card}>
        {msg && <Banner color="#16a34a" bg="#f0fdf4" border="#bbf7d0">{msg}</Banner>}
        {err && <Banner color="#b91c1c" bg="#fef2f2" border="#fecaca">{err}</Banner>}

        <L>Templates</L>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => { setSubject(t.subject); setBody(t.body) }} style={chip(false)}>{t.name}</button>
          ))}
        </div>

        <L>From name</L><input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Grabitt" style={inp} />
        <L>Subject *</L><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What’s new on Grabitt this month" style={inp} />
        <L>Preheader (inbox preview)</L><input value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="A short line shown after the subject" style={inp} />
        <L>Audience</L>
        <select value={segment} onChange={e => setSegment(e.target.value)} style={inp}>
          {SEGMENTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: audience === 0 ? '#ef4444' : '#888', margin: '6px 0 12px' }}>
          {audience === null ? 'Checking audience…'
            : audience === 0 ? 'No opted-in members match this segment — nothing would be sent.'
            : `${audience} opted-in member${audience === 1 ? '' : 's'} will receive this.`}
        </div>

        <L>Body (HTML)</L>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={14}
          placeholder="<h2>Hello</h2><p>Your message…</p>"
          style={{ ...inp, fontFamily: 'ui-monospace, monospace', fontSize: 12, resize: 'vertical' }} />
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#999', marginBottom: 12 }}>
          An unsubscribe footer is added automatically — you don’t need to include one.
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@example.com" style={{ ...inp, flex: 1, marginBottom: 0 }} />
          <button onClick={sendTest} disabled={!!busy} style={secondary}>{busy === 'test' ? 'Sending…' : 'Send test'}</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={!!busy || !subject.trim()} style={{ ...secondary, flex: 1 }}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
          <button onClick={send} disabled={!!busy || !canSend} style={{ ...primary, flex: 1, opacity: canSend ? 1 : 0.5 }}>
            {busy === 'send' ? 'Sending…' : `Send${audience ? ` to ${audience}` : ''}`}
          </button>
          <button onClick={onCancel} style={secondary}>Cancel</button>
        </div>
      </div>

      {/* Live preview */}
      <div style={card}>
        <L>Preview</L>
        <div style={{ border: '1px solid #ece3d7', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: '#faf8f5', padding: '10px 12px', borderBottom: '1px solid #ece3d7' }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>{fromName || 'Grabitt'}</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, color: '#1a1a1a', marginTop: 2 }}>{subject || <span style={{ color: '#bbb' }}>Subject…</span>}</div>
            {preheader && <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#999', marginTop: 1 }}>{preheader}</div>}
          </div>
          <div style={{ padding: 14, background: '#fff', fontFamily: 'Nunito, Arial, sans-serif', fontSize: 13, lineHeight: 1.6, color: '#1a1a1a', minHeight: 200 }}
            dangerouslySetInnerHTML={{ __html: body || '<p style="color:#bbb">Your email body will appear here…</p>' }} />
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f0ece5', fontSize: 10.5, color: '#8a7d68', background: '#fafafa' }}>
            You’re receiving this because you opted in to Grabitt updates. <u>Unsubscribe</u> at any time.
          </div>
        </div>
      </div>
    </div>
  )
}

function Results({ api, eshot, onClose }: { api: any; eshot: Eshot; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.eshotRecipients(eshot.id, 1).then((r: any) => setRows(r.rows)).catch(() => {}).finally(() => setLoading(false))
  }, [api, eshot.id])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 760, maxWidth: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{eshot.subject}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Sent {date(eshot.sentAt)} · {SEGMENT_LABEL[eshot.segment] ?? eshot.segment}</div>
          </div>
          <button onClick={onClose} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          <div style={statRow}>
            <Stat label="Recipients" value={String(eshot.recipientCount)} />
            <Stat label="Delivered" value={String(eshot.deliveredCount)} />
            <Stat label="Open rate" value={`${eshot.openRate}%`} sub={`${eshot.openCount} opened`} color="#16a34a" />
            <Stat label="Click rate" value={`${eshot.clickRate}%`} sub={`${eshot.clickCount} clicked`} color="#FF4500" />
            <Stat label="Bounces" value={String(eshot.bounceCount)} color={eshot.bounceCount ? '#ef4444' : undefined} />
            <Stat label="Complaints" value={String(eshot.complaintCount)} color={eshot.complaintCount ? '#ef4444' : undefined} />
          </div>

          {loading ? <div style={empty}>Loading recipients…</div> : (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={table}>
                <thead><tr>{['Recipient', 'Status', 'Opens', 'Clicks'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid #f0ece5' }}>
                      <td style={td}>{r.name ?? r.email}<div style={{ fontSize: 11, color: '#999' }}>{r.email}</div></td>
                      <td style={td}><span style={pill(r.status === 'delivered' ? '#16a34a' : r.status === 'bounced' || r.status === 'failed' ? '#ef4444' : '#888')}>{r.status}</span></td>
                      <td style={td}>{r.openCount || '—'}</td>
                      <td style={td}>{r.clickCount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 20, fontWeight: 900, color: color ?? '#1a1a1a' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
function Banner({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return <div style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: 10, padding: '9px 11px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{children}</div>
}
function L({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, margin: '10px 0 4px' }}>{children}</label>
}

const h1: React.CSSProperties = { fontFamily: 'Comfortaa, sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }
const sub: React.CSSProperties = { fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#888', margin: '0 0 16px' }
const statRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8, marginBottom: 16 }
const statCard: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 12, textAlign: 'center' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 16 }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, fontFamily: 'Nunito, sans-serif', fontSize: 12.5 }
const th: React.CSSProperties = { textAlign: 'left', padding: '9px 11px', fontSize: 9.5, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 11px', color: '#555', verticalAlign: 'top' }
const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '9px 11px', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, boxSizing: 'border-box', background: '#fff', outline: 'none', marginBottom: 4 }
const primary: React.CSSProperties = { background: '#FF4500', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const secondary: React.CSSProperties = { background: '#fff', color: '#1a1a1a', border: '1.5px solid #1a1a1a', borderRadius: 10, padding: '10px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#FF4500', fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: 0 }
const empty: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 40, textAlign: 'center', color: '#888', fontFamily: 'Nunito, sans-serif', fontSize: 13 }
const chip = (active: boolean): React.CSSProperties => ({
  background: active ? '#FF4500' : '#fff', color: active ? '#fff' : '#666',
  border: '1px solid #ece3d7', borderRadius: 50, padding: '6px 14px',
  fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}18`, color, borderRadius: 50, padding: '2px 9px',
  fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
})
