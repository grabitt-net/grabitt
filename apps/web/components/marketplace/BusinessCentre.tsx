'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
import { usePanel } from '@/context/PanelContext'
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER } from '@grabitt/design-tokens'
import { t } from '@/lib/i18n'

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

  useEffect(() => {
    trpcAuthed().business.tierStatus.query()
      .then(d => setData(d as unknown as TierStatus))
      .catch(() => {})
  }, [])

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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
