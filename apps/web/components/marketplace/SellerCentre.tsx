'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trpcAuthed } from '@/lib/authToken'
import { FEE_RATES, LISTING_CAPS, GRADE_THRESHOLDS } from '@grabitt/design-tokens'
import { t } from '@/lib/i18n'

// The seller info centre from the prototype's profile hero: which grade you're
// on and what it costs you, how far off the next one you are, the full ladder so
// the upgrade path is visible, how complete your profile is, and how your
// listings are actually performing.
//
// Grades are earned, never bought — the ladder is shown as progress, not as
// plans to purchase.

type Grade = 'grabber' | 'dealer' | 'trader' | 'pro'

const GRADES: { id: Grade; name: string; emoji: string; color: string; next: Grade | null }[] = [
  { id: 'grabber', name: 'Grabber', emoji: '🟠', color: '#FF4500', next: 'dealer' },
  { id: 'dealer', name: 'Dealer', emoji: '🟡', color: '#EAB308', next: 'trader' },
  { id: 'trader', name: 'Trader', emoji: '🔵', color: '#3b82f6', next: 'pro' },
  { id: 'pro', name: 'Pro', emoji: '⭐', color: '#a855f7', next: null },
]

type Centre = {
  grade: Grade
  salesCount: number
  avgRating: number | null
  ratingCount: number
  listingsThisMonth: number
  isBusiness: boolean
  isVerified: boolean
  completion: { pct: number; missing: string[] }
  performance: {
    totalViews: number; totalOffers: number; convertPct: number; live: number; sold: number
    listings: { id: string; title: string; status: string; price: number; image: string | null; views: number; offers: number }[]
  }
}

const cap = (g: Grade) => (LISTING_CAPS[g] === Infinity ? '∞' : String(LISTING_CAPS[g]))
const feePct = (g: Grade) => `${(FEE_RATES[g] * 100).toFixed(FEE_RATES[g] * 100 % 1 ? 1 : 0)}%`

export default function SellerCentre() {
  const [data, setData] = useState<Centre | null>(null)
  const [tab, setTab] = useState<'level' | 'profile' | 'dashboard'>('level')

  useEffect(() => {
    trpcAuthed().users.sellerCentre.query()
      .then(d => setData(d as unknown as Centre))
      .catch(() => { /* leave the centre hidden */ })
  }, [])

  if (!data) return null

  const g = GRADES.find(x => x.id === data.grade) ?? GRADES[0]
  const nextGrade = g.next ? GRADES.find(x => x.id === g.next)! : null
  const need = nextGrade ? GRADE_THRESHOLDS[nextGrade.id as keyof typeof GRADE_THRESHOLDS] : null
  const salesNeeded = need ? Math.max(0, need.sales - data.salesCount) : 0
  const ratingOk = need ? (data.avgRating ?? 0) >= need.rating : true
  const salesPct = need ? Math.min(100, Math.round((data.salesCount / need.sales) * 100)) : 100
  const perf = data.performance

  return (
    <div id="seller-centre" style={cardBox}>
      {/* Current level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${g.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{g.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: g.color }}>{g.name} {t('grade')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#777' }}>
            {data.salesCount} {t('sales')} · {data.avgRating ? `${Number(data.avgRating).toFixed(1)}★` : t('no ratings yet')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 19, fontWeight: 900, color: 'var(--dark)' }}>{feePct(g.id)}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, color: '#888', fontWeight: 800 }}>{t('SELLER FEE')}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Stat value={String(data.salesCount)} label={t('SALES')} />
        <Stat value={data.avgRating ? `${Number(data.avgRating).toFixed(1)}★` : '—'} label={`${data.ratingCount} ${t('RATINGS')}`} />
        <Stat value={`${data.listingsThisMonth}/${cap(g.id)}`} label={t('LISTINGS/MO')} />
      </div>

      {/* Pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([['level', `${g.emoji} ${t('My level')}`], ['profile', `🏅 ${t('Profile')} ${data.completion.pct}%`], ['dashboard', `📊 ${t('Seller dashboard')}`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, border: `1.5px solid ${tab === id ? 'var(--orange)' : '#e5dccd'}`,
            background: tab === id ? 'var(--orange)' : '#fff', color: tab === id ? '#fff' : '#666',
            borderRadius: 50, padding: '7px 6px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* ── My level: progress + the ladder ───────────────────────────────── */}
      {tab === 'level' && (
        <>
          {nextGrade && need ? (
            <div style={{ borderTop: '1px solid #f0ece5', paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)', marginBottom: 7 }}>
                {t('Progress to')} {nextGrade.emoji} {nextGrade.name} ({feePct(nextGrade.id)} {t('fee')})
              </div>
              <div style={{ height: 9, background: '#f0ece5', borderRadius: 50, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${salesPct}%`, background: nextGrade.color, borderRadius: 50, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 11 }}>
                <div style={{ flex: 1, color: salesNeeded === 0 ? '#22c55e' : '#888' }}>
                  {salesNeeded === 0 ? `✓ ${t('Sales target met')}` : `${salesNeeded} ${t('more sales')}`}
                </div>
                <div style={{ flex: 1, textAlign: 'right', color: ratingOk ? '#22c55e' : '#ef4444' }}>
                  {ratingOk ? '✓ ' : ''}{need.rating}★+ {ratingOk ? t('rating met') : t('rating needed')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #f0ece5', paddingTop: 12, marginBottom: 12, textAlign: 'center', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: '#a855f7' }}>
              ⭐ {t('Top grade — the lowest fees on Grabitt')}
            </div>
          )}

          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t('All grades')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {GRADES.map(x => {
              const isMe = x.id === g.id
              const th = GRADE_THRESHOLDS[x.id as keyof typeof GRADE_THRESHOLDS]
              return (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isMe ? '#FFF8F0' : '#fff', border: `${isMe ? 2 : 1}px solid ${isMe ? x.color : '#ece3d7'}`, borderRadius: 12, padding: '10px 11px' }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{x.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: x.color }}>
                      {x.name}
                      {isMe && <span style={{ marginLeft: 6, fontSize: 8.5, background: x.color, color: '#fff', padding: '2px 7px', borderRadius: 50, verticalAlign: 'middle' }}>{t('YOU')}</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#777' }}>
                      {th ? `${th.sales}+ ${t('sales')} · ${th.rating}★+` : t('Everyone starts here')} · {t('up to')} {cap(x.id)} {t('listings/mo')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{feePct(x.id)}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 8.5, color: '#888' }}>{t('fee')}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#888', marginTop: 9, lineHeight: 1.5 }}>
            {t('Grades are earned through sales and ratings — they can’t be bought.')}
          </div>
        </>
      )}

      {/* ── Profile completion ────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div style={{ borderTop: '1px solid #f0ece5', paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)' }}>
              {data.completion.pct >= 100 ? `🏅 ${t('Profile complete')}` : t('Complete your profile')}
            </span>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--orange)' }}>{data.completion.pct}%</span>
          </div>
          <div style={{ height: 9, background: '#f0ece5', borderRadius: 50, overflow: 'hidden', marginBottom: 9 }}>
            <div style={{ height: '100%', width: `${data.completion.pct}%`, background: 'linear-gradient(90deg,#FF4500,#FF8C00)', borderRadius: 50, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#666', lineHeight: 1.55, marginBottom: 10 }}>
            {data.completion.pct >= 100
              ? t('Everything is filled in — buyers see a complete, trusted profile.')
              : t('A fuller profile earns more trust, better matches and more offers.')}
          </div>
          {data.completion.missing.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.completion.missing.map(m => (
                <span key={m} style={{ background: '#FFF3EE', color: 'var(--orange)', border: '1px solid #FFD4C0', borderRadius: 50, padding: '4px 11px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800 }}>{t(m)}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Seller dashboard ──────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div style={{ borderTop: '1px solid #f0ece5', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
            <Stat value={String(perf.totalViews)} label={t('VIEWS')} color="#8b5cf6" />
            <Stat value={String(perf.totalOffers)} label={t('OFFERS')} color="var(--orange)" />
            <Stat value={`${perf.convertPct}%`} label={t('CONVERT')} color="#16a34a" />
          </div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            <Stat value={String(perf.live)} label={t('LIVE')} color="#1B6CA8" />
            <Stat value={String(perf.sold)} label={t('SOLD')} color="#16a34a" />
            <Stat value={String(data.salesCount)} label={t('TOTAL SALES')} />
          </div>

          {perf.listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 22, fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#999' }}>
              {t('No listings yet — list an item to start tracking performance.')}
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t('Per listing')}</div>
              {perf.listings.map(l => (
                <Link key={l.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: 11, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</span>
                      <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 8.5, fontWeight: 800, color: '#fff', background: l.status === 'sold' ? '#999' : '#16a34a', padding: '2px 8px', borderRadius: 50, textTransform: 'uppercase' }}>{l.status === 'sold' ? t('sold') : t('live')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#555' }}>
                      <span>👁️ <b>{l.views}</b> {t('views')}</span>
                      <span>💸 <b>{l.offers}</b> {t('offers')}</span>
                      <span>📈 <b>{l.views ? Math.round((l.offers / l.views) * 100) : 0}%</b></span>
                    </div>
                    {l.views > 5 && l.offers === 0 && l.status !== 'sold' && (
                      <div style={{ marginTop: 8, background: '#fff8f0', border: '1px solid #ffd4a0', borderRadius: 8, padding: '7px 9px', fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#9a6a30', lineHeight: 1.45 }}>
                        💡 {t('Plenty of views but no offers — a small price drop often converts.')}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: '#f9f6f2', border: '1px solid #efe7db', borderRadius: 12, padding: '10px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: color ?? 'var(--dark)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 8.5, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 }}>{label}</div>
    </div>
  )
}

const cardBox: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
