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

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setD(await api.memberDetail(userId)) }
    catch { setError('Could not load this member&apos;s activity.') }
    finally { setLoading(false) }
  }, [api, userId])
  useEffect(() => { load() }, [load])

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
        <Table head={['Item', 'Type', 'Price', 'Views', 'Saves', 'Status', '']} rows={d.listings} empty="No listings."
          row={(l: any) => [
            <>{l.title}<br /><span style={dim}>{l.location} · {date(l.createdAt)}</span></>,
            l.kind, money(l.price), l.views, l.saves,
            <span style={pill(l.status === 'active' ? '#16a34a' : '#888')}>{l.status}</span>,
            <a href={`/listings/${l.id}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>,
          ]} />
      )}

      {tab === 'trades' && (
        <>
          <h4 style={h4}>Sales ({d.sales.length})</h4>
          <Table head={['Item', 'Buyer', 'Amount', 'Fee', 'Net', 'Status', 'Date']} rows={d.sales} empty="No sales."
            row={(s: any) => [s.item, s.counterparty, money(s.amount), money(s.fee), money(s.net),
              <span style={pill(s.status === 'released' ? '#16a34a' : s.status === 'cancelled' ? '#ef4444' : '#f59e0b')}>{s.status}</span>, date(s.createdAt)]} />
          <h4 style={h4}>Purchases ({d.purchases.length})</h4>
          <Table head={['Item', 'Seller', 'Amount', 'Status', 'Date']} rows={d.purchases} empty="No purchases."
            row={(p: any) => [p.item, p.counterparty, money(p.amount),
              <span style={pill(p.status === 'released' ? '#16a34a' : p.status === 'cancelled' ? '#ef4444' : '#f59e0b')}>{p.status}</span>, date(p.createdAt)]} />
        </>
      )}

      {tab === 'jobs' && (
        <>
          <h4 style={h4}>Jobs posted ({d.jobsPosted.length})</h4>
          <Table head={['Role', 'Company', 'Type', 'Applicants', 'Status', '']} rows={d.jobsPosted} empty="No jobs posted."
            row={(j: any) => [j.jobTitle, j.company, String(j.type).replace('_', ' '), j.applicants,
              <span style={pill(j.status === 'active' ? '#16a34a' : '#888')}>{j.status}</span>,
              <a href={`/listings/${j.listingId}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>]} />
          <h4 style={h4}>Applications made ({d.applications.length})</h4>
          <Table head={['Role', 'Company', 'CV', 'Status', 'Date', '']} rows={d.applications} empty="No applications."
            row={(a: any) => [a.jobTitle, a.company, a.cvOnFile ? '📄 Yes' : '—',
              <span style={pill(a.status === 'hired' ? '#16a34a' : a.status === 'rejected' ? '#ef4444' : '#3b82f6')}>{a.status}</span>,
              date(a.createdAt),
              <a href={`/listings/${a.listingId}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>]} />
        </>
      )}

      {tab === 'property' && (
        <Table head={['Property', 'Type', 'Spec', 'Price', 'Status', '']} rows={d.properties} empty="No property listed."
          row={(p: any) => [
            <>{p.title}<br /><span style={dim}>{p.location} · {date(p.createdAt)}</span></>,
            p.type,
            [p.bedrooms != null ? `${p.bedrooms} bed` : null, p.bathrooms != null ? `${p.bathrooms} bath` : null, p.m2 ? `${p.m2} m²` : null].filter(Boolean).join(' · ') || '—',
            money(p.price),
            <span style={pill(p.status === 'active' ? '#16a34a' : '#888')}>{p.status}</span>,
            <a href={`/listings/${p.id}`} target="_blank" rel="noreferrer" style={link}>View ↗</a>,
          ]} />
      )}

      {tab === 'messages' && (
        <>
          <div style={{ ...dim, marginBottom: 8 }}>{t.messagesSent} messages sent across {t.threads} conversations.</div>
          <Table head={['With', 'Messages', 'Last message', 'When']} rows={d.threads} empty="No conversations."
            row={(th: any) => [th.with, th.messages,
              <span style={{ color: '#666' }}>{th.lastPreview ?? '—'}</span>, date(th.lastAt)]} />
        </>
      )}

      {tab === 'records' && (
        <>
          <h4 style={h4}>Reviews received ({d.reviewsReceived.length})</h4>
          <Table head={['By', 'Rating', 'Comment', 'Date']} rows={d.reviewsReceived} empty="None."
            row={(r: any) => [r.by, `★ ${r.rating}`, r.comment ?? '—', date(r.createdAt)]} />
          <h4 style={h4}>Reviews given ({d.reviewsGiven.length})</h4>
          <Table head={['About', 'Rating', 'Comment', 'Date']} rows={d.reviewsGiven} empty="None."
            row={(r: any) => [r.about, `★ ${r.rating}`, r.comment ?? '—', date(r.createdAt)]} />
          <h4 style={h4}>Disputes raised ({d.disputes.length})</h4>
          <Table head={['Item', 'Reason', 'Status', 'Date']} rows={d.disputes} empty="None."
            row={(x: any) => [x.item, x.reason, <span style={pill('#f59e0b')}>{x.status}</span>, date(x.createdAt)]} />
          <h4 style={h4}>Strikes ({d.strikes.length})</h4>
          <Table head={['Reason', 'Date']} rows={d.strikes} empty="None."
            row={(s: any) => [s.reason, date(s.createdAt)]} />
          <h4 style={h4}>Credit history ({d.credits.length})</h4>
          <Table head={['Type', 'Change', 'Balance', 'Note', 'Date']} rows={d.credits} empty="None."
            row={(c: any) => [c.kind, <span style={{ color: c.delta < 0 ? '#ef4444' : '#16a34a', fontWeight: 800 }}>{c.delta > 0 ? '+' : ''}{c.delta}</span>, c.balance, c.note ?? '—', date(c.createdAt)]} />
          <h4 style={h4}>Consents (GDPR &amp; withdrawal)</h4>
          <Table head={['Consent', 'Accepted', 'IP']} rows={d.consents} empty="No consents recorded."
            row={(c: any) => [c.kind === 'gdpr' ? 'GDPR / privacy' : 'Right-of-withdrawal notice', date(c.acceptedAt), c.ipAddress ?? '—']} />
        </>
      )}
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
const chip = (active: boolean): React.CSSProperties => ({
  padding: '5px 11px', borderRadius: 50, border: 'none', cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
  background: active ? '#1a1a1a' : '#f2ede6', color: active ? '#fff' : '#666',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}18`, color, borderRadius: 50, padding: '2px 8px',
  fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
})
