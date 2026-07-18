'use client'
import { useCallback, useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Exec suite — the 360° view of one member: everything they've listed, traded,
// posted, applied for, said and been recorded doing. Read-only; account
// management lives in the Manage tab of the drawer.

type Tab = 'overview' | 'listings' | 'trades' | 'jobs' | 'property' | 'messages' | 'records'
const TABS: [Tab, string][] = [
  ['overview', 'Overview'], ['listings', 'Listings'], ['trades', 'Sales & purchases'],
  ['jobs', 'Jobs'], ['property', 'Property'], ['messages', 'Messages'], ['records', 'Records'],
]

const money = (n: number | null | undefined) => (n == null ? '—' : `€${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const date = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function MemberActivity({ userId }: { userId: string }) {
  const api = useCrmApi()
  const [tab, setTab] = useState<Tab>('overview')
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Extra pages fetched per section, appended to the first page from memberDetail.
  const [pages, setPages] = useState<Record<string, { page: number; hasMore: boolean }>>({})
  const [extra, setExtra] = useState<Record<string, any[]>>({})
  const [loadingMore, setLoadingMore] = useState('')
  const [transcript, setTranscript] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setD(await api.memberDetail(userId)); setPages({}); setExtra({}) }
    catch { setError('Could not load this member’s activity.') }
    finally { setLoading(false) }
  }, [api, userId])
  useEffect(() => { load() }, [load])

  // Rows for a section = first page (from memberDetail) + any pages loaded since.
  const rowsFor = (section: string, base: any[]) => [...(base ?? []), ...(extra[section] ?? [])]
  const moreFor = (section: string, base: any[], total: number) => {
    const state = pages[section]
    if (state) return state.hasMore
    return (base?.length ?? 0) < total
  }
  const loadMore = async (section: string) => {
    setLoadingMore(section)
    try {
      const next = (pages[section]?.page ?? 1) + 1
      const res = await api.memberSection(userId, section, next)
      setExtra(e => ({ ...e, [section]: [...(e[section] ?? []), ...res.rows] }))
      setPages(p => ({ ...p, [section]: { page: next, hasMore: res.hasMore } }))
    } catch { /* leave what we have */ }
    finally { setLoadingMore('') }
  }
  const More = ({ section, base, total }: { section: string; base: any[]; total: number }) =>
    moreFor(section, base, total)
      ? <button onClick={() => loadMore(section)} disabled={loadingMore === section} style={moreBtn}>
          {loadingMore === section ? 'Loading…' : `Load more (${rowsFor(section, base).length} of ${total})`}
        </button>
      : null

  const openTranscript = async (disputeId: string) => {
    setTranscript({ loading: true })
    try { setTranscript(await api.disputeTranscript(disputeId)) }
    catch { setTranscript({ error: 'Could not load the transcript.' }) }
  }

  if (loading) return <div style={empty}>Loading activity…</div>
  if (error || !d) return <div style={{ ...empty, color: '#ef4444' }}>{error || 'No data'}</div>

  const t = d.totals

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map(([id, label]) => {
          const count = id === 'listings' ? t.listings : id === 'trades' ? t.sales + t.purchases
            : id === 'jobs' ? t.jobsPosted + t.applications : id === 'property' ? t.properties
            : id === 'messages' ? t.threads : null
          return (
            <button key={id} onClick={() => setTab(id)} style={chip(tab === id)}>
              {label}{count != null && count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <>
          <div style={grid}>
            <Stat label="Listings" value={String(t.listings)} sub={`${t.liveListings} live`} />
            <Stat label="Sales" value={String(t.sales)} sub={money(t.salesValue)} color="#16a34a" />
            <Stat label="Purchases" value={String(t.purchases)} sub={money(t.purchaseValue)} />
            <Stat label="Fees paid" value={money(t.feesPaid)} color="#FF4500" />
            <Stat label="Jobs posted" value={String(t.jobsPosted)} />
            <Stat label="Applications" value={String(t.applications)} />
            <Stat label="Property" value={String(t.properties)} />
            <Stat label="Messages" value={String(t.messagesSent)} sub={`${t.threads} threads`} />
            <Stat label="Disputes" value={String(t.disputes)} color={t.disputes ? '#ef4444' : undefined} />
            <Stat label="Strikes" value={String(t.strikes)} color={t.strikes ? '#ef4444' : undefined} />
          </div>

          {d.seekerProfile && (
            <Section title="Work profile">
              <Row k="Headline" v={d.seekerProfile.headline ?? '—'} />
              <Row k="Sector" v={d.seekerProfile.sector ?? '—'} />
              <Row k="Roles" v={(d.seekerProfile.roles ?? []).join(', ') || '—'} />
              <Row k="Languages" v={(d.seekerProfile.languages ?? []).join(', ') || '—'} />
              <Row k="Visible to employers" v={d.seekerProfile.active ? 'Yes' : 'Paused'} />
            </Section>
          )}

          {d.subscriptions.length > 0 && (
            <Section title="Subscriptions">
              {d.subscriptions.map((s: any) => (
                <Row key={s.id} k={s.plan} v={`${s.status}${s.currentPeriodEnd ? ` · renews ${date(s.currentPeriodEnd)}` : ''}${s.cancelAtPeriodEnd ? ' · cancelling' : ''}`} />
              ))}
            </Section>
          )}
        </>
      )}

      {tab === 'listings' && (
        <>
          <Table head={['Item', 'Type', 'Price', 'Views', 'Saves', 'Status', '']} rows={rowsFor('listings', d.listings)} empty="No listings."
            row={(l: any) => [
              <>{l.title}<br /><span style={dim}>{l.location} · {date(l.createdAt)}</span></>,
              l.kind, money(l.price), l.views, l.saves,
              <span style={pill(l.status === 'active' ? '#16a34a' : '#888')}>{l.status}</span>,
              <a href={`/listings/${l.id}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>,
            ]} />
          <More section="listings" base={d.listings} total={t.listings} />
        </>
      )}

      {tab === 'trades' && (
        <>
          <h4 style={h4}>Sales ({t.sales})</h4>
          <Table head={['Item', 'Buyer', 'Amount', 'Fee', 'Net', 'Status', 'Date']} rows={rowsFor('sales', d.sales)} empty="No sales."
            row={(s: any) => [s.item, s.counterparty, money(s.amount), money(s.fee), money(s.net),
              <span style={pill(s.status === 'released' ? '#16a34a' : s.status === 'cancelled' ? '#ef4444' : '#f59e0b')}>{s.status}</span>, date(s.createdAt)]} />
          <More section="sales" base={d.sales} total={t.sales} />
          <h4 style={h4}>Purchases ({t.purchases})</h4>
          <Table head={['Item', 'Seller', 'Amount', 'Status', 'Date']} rows={rowsFor('purchases', d.purchases)} empty="No purchases."
            row={(p: any) => [p.item, p.counterparty, money(p.amount),
              <span style={pill(p.status === 'released' ? '#16a34a' : p.status === 'cancelled' ? '#ef4444' : '#f59e0b')}>{p.status}</span>, date(p.createdAt)]} />
          <More section="purchases" base={d.purchases} total={t.purchases} />
        </>
      )}

      {tab === 'jobs' && (
        <>
          <h4 style={h4}>Jobs posted ({t.jobsPosted})</h4>
          <Table head={['Role', 'Company', 'Type', 'Applicants', 'Status', '']} rows={rowsFor('jobsPosted', d.jobsPosted)} empty="No jobs posted."
            row={(j: any) => [j.jobTitle, j.company, String(j.type).replace('_', ' '), j.applicants,
              <span style={pill(j.status === 'active' ? '#16a34a' : '#888')}>{j.status}</span>,
              <a href={`/listings/${j.listingId}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>]} />
          <More section="jobsPosted" base={d.jobsPosted} total={t.jobsPosted} />
          <h4 style={h4}>Applications made ({t.applications})</h4>
          <Table head={['Role', 'Company', 'CV', 'Status', 'Date', '']} rows={rowsFor('applications', d.applications)} empty="No applications."
            row={(a: any) => [a.jobTitle, a.company, a.cvOnFile ? '📄 Yes' : '—',
              <span style={pill(a.status === 'hired' ? '#16a34a' : a.status === 'rejected' ? '#ef4444' : '#3b82f6')}>{a.status}</span>,
              date(a.createdAt),
              <a href={`/listings/${a.listingId}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>]} />
          <More section="applications" base={d.applications} total={t.applications} />
        </>
      )}

      {tab === 'property' && (
        <>
        <Table head={['Property', 'Type', 'Spec', 'Price', 'Status', '']} rows={rowsFor('properties', d.properties)} empty="No property listed."
          row={(p: any) => [
            <>{p.title}<br /><span style={dim}>{p.location} · {date(p.createdAt)}</span></>,
            p.type,
            [p.bedrooms != null ? `${p.bedrooms} bed` : null, p.bathrooms != null ? `${p.bathrooms} bath` : null, p.m2 ? `${p.m2} m²` : null].filter(Boolean).join(' · ') || '—',
            money(p.price),
            <span style={pill(p.status === 'active' ? '#16a34a' : '#888')}>{p.status}</span>,
            <a href={`/listings/${p.id}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>,
          ]} />
        <More section="properties" base={d.properties} total={t.properties} />
        </>
      )}

      {tab === 'messages' && (
        <>
          <div style={{ ...dim, marginBottom: 8 }}>
            {t.messagesSent} messages sent across {t.threads} conversations. Previews only —
            full transcripts are available for disputed trades, under Records.
          </div>
          <Table head={['With', 'Messages', 'Last message', 'When']} rows={rowsFor('threads', d.threads)} empty="No conversations."
            row={(th: any) => [th.with, th.messages,
              <span style={{ color: '#666' }}>{th.lastPreview ?? '—'}</span>, date(th.lastAt)]} />
          <More section="threads" base={d.threads} total={t.threads} />
        </>
      )}

      {tab === 'records' && (
        <>
          <h4 style={h4}>Reviews received ({t.reviewsReceived})</h4>
          <Table head={['By', 'Rating', 'Comment', 'Date']} rows={rowsFor('reviewsReceived', d.reviewsReceived)} empty="None."
            row={(r: any) => [r.by, `★ ${r.rating}`, r.comment ?? '—', date(r.createdAt)]} />
          <More section="reviewsReceived" base={d.reviewsReceived} total={t.reviewsReceived} />

          <h4 style={h4}>Reviews given ({t.reviewsGiven})</h4>
          <Table head={['About', 'Rating', 'Comment', 'Date']} rows={rowsFor('reviewsGiven', d.reviewsGiven)} empty="None."
            row={(r: any) => [r.about, `★ ${r.rating}`, r.comment ?? '—', date(r.createdAt)]} />
          <More section="reviewsGiven" base={d.reviewsGiven} total={t.reviewsGiven} />

          <h4 style={h4}>Disputes raised ({t.disputes})</h4>
          <Table head={['Item', 'Reason', 'Status', 'Date', '']} rows={rowsFor('disputes', d.disputes)} empty="None."
            row={(x: any) => [x.item, x.reason, <span style={pill('#f59e0b')}>{x.status}</span>, date(x.createdAt),
              <button onClick={() => openTranscript(x.id)} style={{ ...link, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>💬 Transcript</button>]} />
          <More section="disputes" base={d.disputes} total={t.disputes} />

          <h4 style={h4}>Strikes ({t.strikes})</h4>
          <Table head={['Reason', 'Date']} rows={rowsFor('strikes', d.strikes)} empty="None."
            row={(s: any) => [s.reason, date(s.createdAt)]} />
          <More section="strikes" base={d.strikes} total={t.strikes} />
          <h4 style={h4}>Credit history</h4>
          <Table head={['Type', 'Change', 'Balance', 'Note', 'Date']} rows={rowsFor('credits', d.credits)} empty="None."
            row={(c: any) => [c.kind, <span style={{ color: c.delta < 0 ? '#ef4444' : '#16a34a', fontWeight: 800 }}>{c.delta > 0 ? '+' : ''}{c.delta}</span>, c.balance, c.note ?? '—', date(c.createdAt)]} />
          {(pages.credits?.hasMore ?? d.credits.length >= d.pageSize) && (
            <button onClick={() => loadMore('credits')} disabled={loadingMore === 'credits'} style={moreBtn}>
              {loadingMore === 'credits' ? 'Loading…' : 'Load more'}
            </button>
          )}
          <h4 style={h4}>Consents (GDPR &amp; withdrawal)</h4>
          <Table head={['Consent', 'Accepted', 'IP']} rows={d.consents} empty="No consents recorded."
            row={(c: any) => [c.kind === 'gdpr' ? 'GDPR / privacy' : 'Right-of-withdrawal notice', date(c.acceptedAt), c.ipAddress ?? '—']} />
        </>
      )}

      {transcript && <TranscriptModal data={transcript} onClose={() => setTranscript(null)} />}
    </div>
  )
}

// Full conversation for a disputed trade. Only reachable from a dispute, and
// opening it is written to the audit trail.
function TranscriptModal({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 620, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>💬 Dispute transcript</div>
            {data.item && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{data.item} · {data.buyer} ↔ {data.seller}</div>}
          </div>
          <button onClick={onClose} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {data.loading ? <div style={empty}>Loading transcript…</div>
            : data.error ? <div style={{ ...empty, color: '#ef4444' }}>{data.error}</div>
            : (
            <>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '9px 11px', marginBottom: 12, fontFamily: 'Nunito, sans-serif', fontSize: 11.5, color: '#9a3412', lineHeight: 1.5 }}>
                Private messages, shown because this trade is disputed ({data.dispute?.reason}). Viewing is recorded in the audit trail.
              </div>
              {data.messages?.length === 0 && <div style={empty}>No messages between these parties about this listing.</div>}
              {data.messages?.map((m: any) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.side === 'buyer' ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
                  <div style={{ maxWidth: '78%', background: m.side === 'buyer' ? '#f2ede6' : '#FFF3EE', border: `1px solid ${m.side === 'buyer' ? '#e5ddd2' : '#FFD4C0'}`, borderRadius: 12, padding: '8px 11px' }}>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 900, color: m.side === 'buyer' ? '#666' : '#FF4500', marginBottom: 2 }}>
                      {m.sender} · {m.side}
                    </div>
                    <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9.5, color: '#aaa', marginTop: 3 }}>
                      {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Table({ head, rows, row, empty: emptyText }: { head: string[]; rows: any[]; row: (r: any) => React.ReactNode[]; empty: string }) {
  if (!rows || rows.length === 0) return <div style={{ ...dim, padding: '8px 0 14px' }}>{emptyText}</div>
  return (
    <div style={{ overflowX: 'auto', marginBottom: 14 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Nunito, sans-serif', fontSize: 12 }}>
        <thead><tr>{head.map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} style={{ borderTop: '1px solid #f2ede6' }}>
              {row(r).map((cell, j) => <td key={j} style={td}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#faf8f5', border: '1px solid #ece3d7', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 18, fontWeight: 900, color: color ?? '#1a1a1a' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h4 style={h4}>{title}</h4>
      <div style={{ background: '#faf8f5', border: '1px solid #ece3d7', borderRadius: 10, padding: '4px 12px' }}>{children}</div>
    </div>
  )
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #f2ede6', fontFamily: 'Nunito, sans-serif', fontSize: 12 }}>
      <span style={{ color: '#888', fontWeight: 700, minWidth: 130 }}>{k}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{v}</span>
    </div>
  )
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8 }
const h4: React.CSSProperties = { fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 900, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 6px' }
const th: React.CSSProperties = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '7px 8px', color: '#555', verticalAlign: 'top', lineHeight: 1.4 }
const dim: React.CSSProperties = { fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#aaa' }
const link: React.CSSProperties = { color: '#FF4500', fontWeight: 800, textDecoration: 'none', fontSize: 11, whiteSpace: 'nowrap' }
const empty: React.CSSProperties = { padding: 30, textAlign: 'center', color: '#888', fontFamily: 'Nunito, sans-serif', fontSize: 12.5 }
const moreBtn: React.CSSProperties = {
  display: 'block', width: '100%', background: '#fff', color: '#666',
  border: '1px solid #ece3d7', borderRadius: 10, padding: '9px 12px',
  fontFamily: 'Nunito, sans-serif', fontSize: 11.5, fontWeight: 800,
  cursor: 'pointer', marginBottom: 14,
}
const chip = (active: boolean): React.CSSProperties => ({
  padding: '5px 11px', borderRadius: 50, border: 'none', cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
  background: active ? '#1a1a1a' : '#f2ede6', color: active ? '#fff' : '#666',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}18`, color, borderRadius: 50, padding: '2px 8px',
  fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
})
