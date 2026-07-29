'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
import { usePanel } from '@/context/PanelContext'
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER, BUSINESS_ADDONS, BUSINESS_ADDON_IDS } from '@grabitt/design-tokens'
import { t } from '@/lib/i18n'

type Postings = {
  jobs: { id: string; title: string; location: string; status: string; applications: number }[]
  properties: { id: string; title: string; location: string; status: string; price: number; image: string | null }[]
  unlockedCandidates: { seekerId: string; name: string; headline: string | null; sector: string | null }[]
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: '#dcfce7', fg: '#16a34a', label: 'Live' },
  draft: { bg: '#fef9c3', fg: '#a16207', label: 'Pending' },
  sold: { bg: '#f0f0f0', fg: '#888', label: 'Closed' },
}

// The single, de-duplicated home for a Business account: the level held (and the
// fee it earns), the rolling criteria to reach AND MAINTAIN the next level, this
// month's listing allowance across items / jobs / property, and every business
// tool in one grid. Replaces the old split between the sidebar "manage business"
// button, the SellerCentre ladder and the separate Recruitment tab.

type TierStatus = {
  isBusiness: true
  grade: 'dealer' | 'trader' | 'pro'
  label: string
  feePct: number
  caps: { items: number; jobs: number; property: number }
  usage: { items: number; jobs: number; property: number }
  sales90d: number
  rating: number
  ratingCount: number
  next: { label: string; feePct: number; needSales: number; needRating: number } | null
} | { isBusiness: false }

const TIER_COLOR: Record<string, string> = { dealer: '#EAB308', trader: '#3b82f6', pro: '#a855f7' }
const fmtPct = (n: number) => `${n.toFixed(n % 1 ? 1 : 0)}%`

export default function BusinessCentre({ businessVerified }: { businessVerified?: boolean }) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [data, setData] = useState<TierStatus | null>(null)
  const [postings, setPostings] = useState<Postings | null>(null)
  const [addons, setAddons] = useState<string[] | null>(null)
  const [addonTotalCents, setAddonTotalCents] = useState(0)
  const [savingAddon, setSavingAddon] = useState<string | null>(null)

  useEffect(() => {
    trpcAuthed().business.tierStatus.query()
      .then(d => setData(d as unknown as TierStatus))
      .catch(() => {})
    trpcAuthed().business.myPostings.query()
      .then(d => setPostings(d as unknown as Postings))
      .catch(() => {})
    trpcAuthed().subscriptions.myBusiness.query()
      .then((d: any) => { setAddons(d.addons ?? []); setAddonTotalCents(d.monthlyTotalCents ?? 0) })
      .catch(() => setAddons([]))
  }, [])

  // Toggle an add-on: persist + reconcile the Stripe subscription immediately.
  const toggleAddon = async (id: string) => {
    if (!addons || savingAddon) return
    const next = addons.includes(id) ? addons.filter(x => x !== id) : [...addons, id]
    setSavingAddon(id)
    setAddons(next) // optimistic
    try {
      const res: any = await trpcAuthed().subscriptions.updateAddons.mutate({ addons: next as never })
      setAddons(res.addons)
      setAddonTotalCents(res.monthlyTotalCents)
    } catch {
      setAddons(addons) // revert
    } finally { setSavingAddon(null) }
  }

  if (!data || !data.isBusiness) return null
  const s = data
  const color = TIER_COLOR[s.grade] ?? 'var(--orange)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Tier + fee ── */}
      <div style={{ ...card, background: `linear-gradient(135deg, ${color}14, #fff)`, borderColor: `${color}55` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>🏢</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 19, fontWeight: 700, color: 'var(--dark)' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#6b5d48' }}>{t('Your business level')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 22, fontWeight: 900, color }}>{fmtPct(s.feePct)}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('fee on item sales')}</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', marginTop: 8, lineHeight: 1.5 }}>
          {t('The item-sale fee. Property and job listings are never charged a sales fee.')}
        </div>

        {/* Current standing — rating + trailing sales at a glance */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #efe7db', borderRadius: 12, padding: '11px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>
              {s.ratingCount > 0 ? `★ ${s.rating.toFixed(1)}` : '★ —'}
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {t('rating')}{s.ratingCount > 0 ? ` · ${s.ratingCount}` : ''}
            </div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #efe7db', borderRadius: 12, padding: '11px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>{s.sales90d}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('sales · 90 days')}</div>
          </div>
        </div>

        {/* Level ladder */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {BUSINESS_TIER_ORDER.map(g => {
            const tier = BUSINESS_TIERS[g]
            const on = g === s.grade
            const reached = BUSINESS_TIER_ORDER.indexOf(g) <= BUSINESS_TIER_ORDER.indexOf(s.grade)
            return (
              <div key={g} style={{ flex: 1, textAlign: 'center', background: on ? color : reached ? `${TIER_COLOR[g]}22` : '#f5f0e8', borderRadius: 10, padding: '9px 4px' }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: on ? '#fff' : reached ? TIER_COLOR[g] : '#b7ab98' }}>{tier.label}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: on ? '#fff' : '#a99', marginTop: 2 }}>{fmtPct(tier.feeRate * 100)}</div>
              </div>
            )
          })}
        </div>

        {/* Progress to / maintenance of the next level */}
        {s.next ? (
          <div style={{ marginTop: 14, background: '#fff', border: '1px solid #efe7db', borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>
              {t('Climb to')} {s.next.label} — {fmtPct(s.next.feePct)} {t('fee')}
            </div>
            <Criterion label={t('Sales (last 90 days)')} have={s.sales90d} need={s.next.needSales} />
            <Criterion label={t('Average rating')} have={s.rating} need={s.next.needRating} decimals />
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#9a8b74', marginTop: 8, lineHeight: 1.5 }}>
              {t('Levels are earned on a rolling 90-day basis — keep your numbers up to hold your level. If they slip, your level drops automatically.')}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, background: '#fff', border: '1px solid #efe7db', borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)' }}>{t('Top level reached 🎉')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', marginTop: 4, lineHeight: 1.5 }}>
              {t('Keep {s} sales in every rolling 90 days and a {r}★ rating to hold Business Pro.')
                .replace('{s}', String(BUSINESS_TIERS.pro.criteria.sales90d)).replace('{r}', String(BUSINESS_TIERS.pro.criteria.rating))}
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly listing allowance ── */}
      <div style={card}>
        <div style={cardHead}>{t('This month’s listing allowance')}</div>
        <AllowanceBar label={t('Items')} icon="🛍️" used={s.usage.items} cap={s.caps.items} color="var(--orange)" />
        <AllowanceBar label={t('Job adverts')} icon="💼" used={s.usage.jobs} cap={s.caps.jobs} color="#3b82f6" />
        <AllowanceBar label={t('Property listings')} icon="🏠" used={s.usage.property} cap={s.caps.property} color="#0f766e" />
        <button onClick={() => openPanel('buyCredits')} style={{ width: '100%', marginTop: 12, background: '#f9f6f2', border: '1px dashed #d8cbb5', borderRadius: 12, padding: '11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: '#8a5a2a', cursor: 'pointer' }}>
          ➕ {t('Buy extra listing credits')}
        </button>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#9a8b74', marginTop: 8, lineHeight: 1.5 }}>
          {t('Allowances reset on the 1st of each month. Once you hit a cap, top up with credits to keep listing.')}
        </div>
      </div>

      {/* ── Posted jobs ── */}
      <div style={card}>
        <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>💼 {t('Posted jobs')}{postings ? ` · ${postings.jobs.length}` : ''}</span>
          <button onClick={() => router.push('/jobs/new')} style={miniBtn}>+ {t('Post')}</button>
        </div>
        {!postings ? <Muted>{t('Loading…')}</Muted> : postings.jobs.length === 0 ? <Muted>{t('No job adverts yet.')}</Muted> : postings.jobs.map(j => (
          <Link key={j.id} href={`/listings/${j.id}`} style={{ textDecoration: 'none' }}>
            <div style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{j.title}</div>
                <div style={rowSub}>📍 {j.location} · {j.applications} {j.applications === 1 ? t('applicant') : t('applicants')}</div>
              </div>
              <StatusPill status={j.status} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Property listings ── */}
      <div style={card}>
        <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🏠 {t('Property listings')}{postings ? ` · ${postings.properties.length}` : ''}</span>
          <button onClick={() => router.push('/property/new')} style={miniBtn}>+ {t('List')}</button>
        </div>
        {!postings ? <Muted>{t('Loading…')}</Muted> : postings.properties.length === 0 ? <Muted>{t('No property listings yet.')}</Muted> : postings.properties.map(p => (
          <Link key={p.id} href={`/listings/${p.id}`} style={{ textDecoration: 'none' }}>
            <div style={row}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏠'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{p.title}</div>
                <div style={rowSub}>📍 {p.location} · €{p.price.toLocaleString()}</div>
              </div>
              <StatusPill status={p.status} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Purchased CV views ── */}
      <div style={card}>
        <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔓 {t('Purchased CV views')}{postings ? ` · ${postings.unlockedCandidates.length}` : ''}</span>
          <button onClick={() => openPanel('findStaff')} style={miniBtn}>{t('Search')}</button>
        </div>
        {!postings ? <Muted>{t('Loading…')}</Muted> : postings.unlockedCandidates.length === 0 ? <Muted>{t('You haven’t unlocked any candidate CVs yet.')}</Muted> : postings.unlockedCandidates.map(c => (
          <div key={c.seekerId} style={row}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-nunito)', flexShrink: 0 }}>{(c.name ?? '?')[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={rowTitle}>{c.name}</div>
              <div style={rowSub}>{c.headline || c.sector || t('Candidate')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add-ons & extras ── */}
      <div style={card}>
        <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✨ {t('Extras & add-ons')}</span>
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)', textTransform: 'none', letterSpacing: 0 }}>€{(addonTotalCents / 100) % 1 ? (addonTotalCents / 100).toFixed(2) : addonTotalCents / 100}/mo {t('total')}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', marginBottom: 10, lineHeight: 1.5 }}>
          {t('Opt in or out any time — your subscription and monthly total update automatically.')}
        </div>
        {addons === null ? <Muted>{t('Loading…')}</Muted> : BUSINESS_ADDON_IDS.map(id => {
          const a = BUSINESS_ADDONS[id]
          const on = addons.includes(id)
          const soon = 'comingSoon' in a && a.comingSoon
          const busy = savingAddon === id
          return (
            <button key={id} onClick={() => toggleAddon(id)} disabled={!!savingAddon} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: on ? '#FFF7F0' : '#fff', border: `1.5px solid ${on ? 'var(--orange)' : '#f0ebe4'}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8, cursor: savingAddon ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              <span style={{ width: 34, height: 20, flexShrink: 0, borderRadius: 50, background: on ? 'var(--orange)' : '#d8cbb5', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)' }}>{a.icon} {a.label}{soon ? <span style={{ marginLeft: 6, background: '#eef2ff', color: '#4f46e5', fontSize: 8.5, fontWeight: 900, padding: '2px 6px', borderRadius: 50, textTransform: 'uppercase' }}>{t('Coming soon')}</span> : null}</span>
                <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#9a8b74', marginTop: 1, lineHeight: 1.4 }}>{a.blurb}</span>
              </span>
              <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 900, color: 'var(--orange)' }}>€{(a.amountCents / 100) % 1 ? (a.amountCents / 100).toFixed(2) : a.amountCents / 100}/mo</span>
            </button>
          )
        })}
      </div>

      {/* ── Business tools ── */}
      <div style={card}>
        <div style={cardHead}>{t('Business tools')}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {!businessVerified && <Tool icon="🛡️" title={t('Verify your business')} sub={t('Required before your shop can go live.')} onClick={() => openPanel('businessVerify')} highlight />}
          <Tool icon="🏪" title={t('My storefront')} sub={t('Layout, branding, featured items and policies.')} onClick={() => openPanel('storefrontEdit')} />
          <Tool icon="📢" title={t('Place a job advert')} sub={t('Candidates apply straight to you.')} onClick={() => router.push('/jobs/new')} />
          <Tool icon="📋" title={t('Applicants')} sub={t('Review and move candidates through your pipeline.')} onClick={() => openPanel('applications')} />
          <Tool icon="🔍" title={t('Search candidates')} sub={t('Searching is free — credits open a profile.')} onClick={() => openPanel('findStaff')} />
          <Tool icon="📖" title={t('Directory listing')} sub={t('List your business in the Grabitt directory.')} onClick={() => openPanel('advertise')} />
          <Tool icon="💳" title={t('Credits')} sub={t('Top up credits for searches and extra listings.')} onClick={() => openPanel('buyCredits')} />
        </div>
      </div>
    </div>
  )
}

function Criterion({ label, have, need, decimals }: { label: string; have: number; need: number; decimals?: boolean }) {
  const met = have >= need
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100
  const fmt = (n: number) => (decimals ? n.toFixed(1) : String(n))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: met ? 'var(--sage)' : '#6b5d48', marginBottom: 3 }}>
        <span>{met ? '✓ ' : ''}{label}</span>
        <span>{fmt(have)} / {fmt(need)}</span>
      </div>
      <div style={{ height: 6, background: '#f0eae0', borderRadius: 50, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: met ? 'var(--sage)' : 'var(--orange)' }} />
      </div>
    </div>
  )
}

function AllowanceBar({ label, icon, used, cap, color }: { label: string; icon: string; used: number; cap: number; color: string }) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0
  const over = used >= cap
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>
        <span>{icon} {label}</span>
        <span style={{ color: over ? '#ef4444' : '#6b5d48' }}>{used} / {cap}</span>
      </div>
      <div style={{ height: 8, background: '#f0eae0', borderRadius: 50, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: over ? '#ef4444' : color, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function Tool({ icon, title, sub, onClick, highlight }: { icon: string; title: string; sub: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: highlight ? '#f0fdf4' : '#f9f6f2', border: `1px solid ${highlight ? '#bbf7d0' : '#efe7db'}`, borderRadius: 12, padding: '12px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{title}</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', marginTop: 2 }}>{sub}</span>
      </span>
      <span style={{ color: highlight ? 'var(--sage)' : 'var(--orange)', fontWeight: 900, fontSize: 16 }}>›</span>
    </button>
  )
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_PILL[status] ?? { bg: '#f0f0f0', fg: '#888', label: status }
  return <span style={{ background: s.bg, color: s.fg, fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 900, padding: '3px 9px', borderRadius: 50, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 0 }}>{s.label}</span>
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '10px 0', textAlign: 'center' }}>{children}</div>
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const miniBtn: React.CSSProperties = { background: '#f5efe6', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#8a5a2a', cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }
const row: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f0e8' }
const rowTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const rowSub: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }
