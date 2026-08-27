'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
import { usePanel } from '@/context/PanelContext'
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER, BUSINESS_ADDONS } from '@grabitt/design-tokens'
import { t } from '@/lib/i18n'
import Icon from './Icon'

// Email/WhatsApp blasts are hidden from customers pending legal review.
const BLASTS_ENABLED = process.env.NEXT_PUBLIC_BLASTS_ENABLED === '1'

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
  // Active one-off sponsorship placements (bought via the basket).
  const [sponsorships, setSponsorships] = useState<{ id: string; addonId: string; endsAt: string; pageTarget: string | null; hasCreative: boolean; needsPageBanner: boolean }[] | null>(null)
  const [creativeFor, setCreativeFor] = useState<string | null>(null)
  const [creativeImg, setCreativeImg] = useState(''); const [creativeLink, setCreativeLink] = useState('')
  const [creativeBusy, setCreativeBusy] = useState(false); const [creativeMsg, setCreativeMsg] = useState('')
  // Paid banner bookings (bought via /advertise) awaiting / holding a creative.
  const [bookings, setBookings] = useState<{ id: string; position: string; pageTarget: string | null; startsAt: string; endsAt: string; hasCreative: boolean; approved: boolean }[] | null>(null)
  const [bkFor, setBkFor] = useState<string | null>(null)
  const [bkImg, setBkImg] = useState(''); const [bkLink, setBkLink] = useState('')
  const [bkBusy, setBkBusy] = useState(false); const [bkMsg, setBkMsg] = useState('')
  // Direct-marketing blast bundles + remaining sends.
  const [bundles, setBundles] = useState<{ email: { qty: number; cents: number }[]; whatsapp: { qty: number; cents: number }[] } | null>(null)
  const [blasts, setBlasts] = useState<{ email: number; whatsapp: number } | null>(null)
  const [blastBusy, setBlastBusy] = useState('')
  const buyBlast = async (channel: 'email' | 'whatsapp', qty: number) => {
    setBlastBusy(`${channel}:${qty}`)
    try {
      const res = await (trpcAuthed() as any).sponsorship.buyBlast.mutate({ channel, qty }) as { url?: string }
      if (res?.url) window.location.href = res.url; else setBlastBusy('')
    } catch { setBlastBusy('') }
  }
  // Compose a blast (spends a send; queues for an admin to send).
  const [composeCh, setComposeCh] = useState<'email' | 'whatsapp' | null>(null)
  const [cMsg, setCMsg] = useState(''); const [cSubj, setCSubj] = useState(''); const [cLink, setCLink] = useState(''); const [cAud, setCAud] = useState('')
  const [cBusy, setCBusy] = useState(false); const [cNote, setCNote] = useState('')
  const submitBlast = async () => {
    if (!composeCh || cMsg.trim().length < 5) return
    setCBusy(true); setCNote('')
    try {
      await (trpcAuthed() as any).sponsorship.submitBlast.mutate({ channel: composeCh, subject: cSubj.trim() || undefined, message: cMsg.trim(), linkUrl: cLink.trim() || undefined, audience: cAud.trim() || undefined })
      setCNote('✓ Submitted — our team will send it shortly.'); setComposeCh(null); setCMsg(''); setCSubj(''); setCLink(''); setCAud('')
      ;(trpcAuthed() as any).sponsorship.myBlasts.query().then((d: any) => setBlasts(d)).catch(() => {})
    } catch (e: any) { setCNote(e?.message ?? 'Could not submit') } finally { setCBusy(false) }
  }

  useEffect(() => {
    trpcAuthed().business.tierStatus.query()
      .then(d => setData(d as unknown as TierStatus))
      .catch(() => {})
    trpcAuthed().business.myPostings.query()
      .then(d => setPostings(d as unknown as Postings))
      .catch(() => {})
    trpcAuthed().sponsorship.mine.query()
      .then((d: any) => setSponsorships(d ?? []))
      .catch(() => setSponsorships([]))
    trpcAuthed().banners.myBookings.query()
      .then((d: any) => setBookings(d ?? []))
      .catch(() => setBookings([]))
    ;(trpcAuthed() as any).sponsorship.blastBundles.query().then((d: any) => setBundles(d)).catch(() => {})
    ;(trpcAuthed() as any).sponsorship.myBlasts.query().then((d: any) => setBlasts(d)).catch(() => {})
  }, [])

  if (!data || !data.isBusiness) return null
  const s = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Tier + fee ── (blue-grey, matching the Business Hub dashboard). */}
      <div style={{ ...card, background: '#eef3fc', border: '1.5px solid #d7deec' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: '#1e2b55', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="building" size={24} strokeWidth={2} /></div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 19, fontWeight: 700, color: '#1e2b55' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#5a6b8c' }}>{t('Your business level')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 22, fontWeight: 900, color: 'var(--orange)' }}>{fmtPct(s.feePct)}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#7a8299', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('fee on item sales')}</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#5a6b8c', marginTop: 8, lineHeight: 1.5 }}>
          {t('The item-sale fee. Property and job listings are never charged a sales fee.')}
        </div>

        {/* Current standing — rating + trailing sales at a glance */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #d7deec', borderRadius: 12, padding: '11px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: '#1e2b55' }}>
              {s.ratingCount > 0 ? `★ ${s.rating.toFixed(1)}` : '★ —'}
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#7a8299', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {t('rating')}{s.ratingCount > 0 ? ` · ${s.ratingCount}` : ''}
            </div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #d7deec', borderRadius: 12, padding: '11px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: '#1e2b55' }}>{s.sales90d}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#7a8299', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('sales · 90 days')}</div>
          </div>
        </div>

        {/* Level ladder */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {BUSINESS_TIER_ORDER.map(g => {
            const tier = BUSINESS_TIERS[g]
            const on = g === s.grade
            const reached = BUSINESS_TIER_ORDER.indexOf(g) <= BUSINESS_TIER_ORDER.indexOf(s.grade)
            return (
              <div key={g} style={{ flex: 1, textAlign: 'center', background: on ? '#eef3fc' : reached ? `${TIER_COLOR[g]}22` : '#f5f0e8', border: on ? '1.5px solid var(--orange)' : '1.5px solid transparent', borderRadius: 10, padding: '9px 4px' }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: on ? '#1e2b55' : reached ? TIER_COLOR[g] : '#b7ab98' }}>{tier.label}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: on ? '#5a6b8c' : '#a99', marginTop: 2 }}>{fmtPct(tier.feeRate * 100)}</div>
              </div>
            )
          })}
        </div>

        {/* Progress to / maintenance of the next level */}
        {s.next ? (
          <div style={{ marginTop: 14, background: '#fff', border: '1px solid #d7deec', borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>
              {t('Climb to')} {s.next.label} — {fmtPct(s.next.feePct)} {t('fee')}
            </div>
            <Criterion label={t('Sales (last 90 days)')} have={s.sales90d} need={s.next.needSales} />
            <Criterion label={t('Average rating')} have={s.rating} need={s.next.needRating} decimals />
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#1a1a1a', marginTop: 8, lineHeight: 1.5 }}>
              {t('Levels are earned on a rolling 90-day basis — keep your numbers up to hold your level. If they slip, your level drops automatically.')}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, background: '#fff', border: '1px solid #d7deec', borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--dark)' }}>{t('Top level reached 🎉')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', marginTop: 4, lineHeight: 1.5 }}>
              {t('Keep {s} sales in every rolling 90 days and a {r}★ rating to hold Business Pro.')
                .replace('{s}', String(BUSINESS_TIERS.pro.criteria.sales90d)).replace('{r}', String(BUSINESS_TIERS.pro.criteria.rating))}
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly listing allowance ── (dashboard-style stat cards) */}
      <Collapsible title={t('This month’s listing allowance')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <AllowanceCard label={t('Items')} icon="🛍️" used={s.usage.items} cap={s.caps.items} color="var(--orange)" />
          <AllowanceCard label={t('Job adverts')} icon="💼" used={s.usage.jobs} cap={s.caps.jobs} color="#3b82f6" />
          <AllowanceCard label={t('Property')} icon="🏠" used={s.usage.property} cap={s.caps.property} color="#0f766e" />
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#7a8299', marginTop: 10, lineHeight: 1.5 }}>
          {t('Allowances reset on the 1st of each month. Once you hit a cap, extra listings are simply charged per listing.')}
        </div>
      </Collapsible>

      {/* ── Posted jobs ── */}
      <Collapsible
        title={<>💼 {t('Posted jobs')}{postings ? ` · ${postings.jobs.length}` : ''}</>}
        right={<button onClick={() => router.push('/jobs/new')} style={miniBtn}>+ {t('Post')}</button>}
      >
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
      </Collapsible>

      {/* ── Property listings ── */}
      <Collapsible
        title={<>🏠 {t('Property listings')}{postings ? ` · ${postings.properties.length}` : ''}</>}
        right={<button onClick={() => router.push('/property/new')} style={miniBtn}>+ {t('List')}</button>}
      >
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
      </Collapsible>

      {/* ── Purchased CV views ── */}
      <Collapsible
        defaultOpen={false}
        title={<>🔓 {t('Purchased CV views')}{postings ? ` · ${postings.unlockedCandidates.length}` : ''}</>}
        right={<button onClick={() => openPanel('findStaff')} style={miniBtn}>{t('Search')}</button>}
      >
        {!postings ? <Muted>{t('Loading…')}</Muted> : postings.unlockedCandidates.length === 0 ? <Muted>{t('You haven’t unlocked any candidate CVs yet.')}</Muted> : postings.unlockedCandidates.map(c => (
          <div key={c.seekerId} style={row}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-nunito)', flexShrink: 0 }}>{(c.name ?? '?')[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={rowTitle}>{c.name}</div>
              <div style={rowSub}>{c.headline || c.sector || t('Candidate')}</div>
            </div>
          </div>
        ))}
      </Collapsible>

      {/* ── Sponsorship & advertising (one-off, timed) ── */}
      <Collapsible defaultOpen={false} title={<>📣 {t('Sponsorship & advertising')}</>}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', marginBottom: 10, lineHeight: 1.5 }}>
          {t('Buy homepage, category and featured banner placements for a set number of months — a one-off payment, not a subscription.')}
        </div>
        {sponsorships === null ? <Muted>{t('Loading…')}</Muted> : sponsorships.length === 0 ? (
          <Muted>{t('No active placements.')}</Muted>
        ) : sponsorships.map(g => {
          const a = (BUSINESS_ADDONS as any)[g.addonId]
          const submit = async () => {
            setCreativeBusy(true); setCreativeMsg('')
            try {
              await trpcAuthed().sponsorship.setCreative.mutate({ grantId: g.id, imageUrl: creativeImg.trim(), linkUrl: creativeLink.trim() })
              setCreativeMsg('✓ Banner live'); setCreativeFor(null); setCreativeImg(''); setCreativeLink('')
              trpcAuthed().sponsorship.mine.query().then((d: any) => setSponsorships(d ?? [])).catch(() => {})
            } catch (e: any) { setCreativeMsg(e?.message ?? 'Could not upload') } finally { setCreativeBusy(false) }
          }
          return (
            <div key={g.id} style={{ borderBottom: '1px solid #f4efe8', padding: '9px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{a?.icon ?? '📢'}</span>
                <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)' }}>{a?.label ?? g.addonId}{g.pageTarget ? ` · ${g.pageTarget}` : ''}</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#16a34a', fontWeight: 800 }}>{t('until')} {new Date(g.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                {g.needsPageBanner && <button onClick={() => { setCreativeFor(creativeFor === g.id ? null : g.id); setCreativeMsg('') }} style={{ background: g.hasCreative ? '#f0fdf4' : '#FFF3EE', border: `1px solid ${g.hasCreative ? '#bbf7d0' : '#FFD4A0'}`, color: g.hasCreative ? '#16a34a' : '#1e2b55', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.hasCreative ? t('Edit banner') : t('Upload banner')}</button>}
              </div>
              {creativeFor === g.id && (
                <div style={{ marginTop: 8, background: '#f4f6fb', borderRadius: 10, padding: 10 }}>
                  <input value={creativeImg} onChange={e => setCreativeImg(e.target.value)} placeholder={t('Banner image URL (wide)')} style={miniInput} />
                  <input value={creativeLink} onChange={e => setCreativeLink(e.target.value)} placeholder={t('Link URL (e.g. your storefront)')} style={miniInput} />
                  {creativeMsg && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: creativeMsg.startsWith('✓') ? '#16a34a' : '#ef4444', marginBottom: 6 }}>{creativeMsg}</div>}
                  <button onClick={submit} disabled={creativeBusy || !creativeImg.trim() || !creativeLink.trim()} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 900, cursor: 'pointer' }}>{creativeBusy ? t('Saving…') : t('Go live')}</button>
                </div>
              )}
            </div>
          )
        })}
        {/* Paid banner bookings (via /advertise) — upload the creative here */}
        {bookings && bookings.length > 0 && bookings.map(b => {
          const submit = async () => {
            setBkBusy(true); setBkMsg('')
            try {
              await trpcAuthed().banners.setBookingCreative.mutate({ bookingId: b.id, imageUrl: bkImg.trim(), linkUrl: bkLink.trim() })
              setBkMsg('✓ Submitted for approval'); setBkFor(null); setBkImg(''); setBkLink('')
              trpcAuthed().banners.myBookings.query().then((d: any) => setBookings(d ?? [])).catch(() => {})
            } catch (e: any) { setBkMsg(e?.message ?? 'Could not upload') } finally { setBkBusy(false) }
          }
          const status = b.hasCreative ? (b.approved ? '✓ Live' : '⏳ In review') : 'Upload needed'
          return (
            <div key={b.id} style={{ borderBottom: '1px solid #f4efe8', padding: '9px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🖼️</span>
                <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)' }}>{b.position.replace(/_/g, ' ')}{b.pageTarget ? ` · ${b.pageTarget}` : ''}</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: b.approved ? '#16a34a' : '#9a5b1a', fontWeight: 800 }}>{status}</span>
                <button onClick={() => { setBkFor(bkFor === b.id ? null : b.id); setBkMsg('') }} style={{ background: b.hasCreative ? '#f0fdf4' : '#FFF3EE', border: `1px solid ${b.hasCreative ? '#bbf7d0' : '#FFD4A0'}`, color: b.hasCreative ? '#16a34a' : '#1e2b55', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{b.hasCreative ? t('Edit banner') : t('Upload banner')}</button>
              </div>
              {bkFor === b.id && (
                <div style={{ marginTop: 8, background: '#f4f6fb', borderRadius: 10, padding: 10 }}>
                  <input value={bkImg} onChange={e => setBkImg(e.target.value)} placeholder={t('Banner image URL (wide)')} style={miniInput} />
                  <input value={bkLink} onChange={e => setBkLink(e.target.value)} placeholder={t('Link URL (e.g. your storefront)')} style={miniInput} />
                  {bkMsg && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: bkMsg.startsWith('✓') ? '#16a34a' : '#ef4444', marginBottom: 6 }}>{bkMsg}</div>}
                  <button onClick={submit} disabled={bkBusy || !bkImg.trim() || !bkLink.trim()} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 900, cursor: 'pointer' }}>{bkBusy ? t('Saving…') : t('Submit for approval')}</button>
                </div>
              )}
            </div>
          )
        })}
        <Link href="/advertise" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 12, background: '#f4f6fb', border: '1px dashed #c3cee0', borderRadius: 12, padding: '11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: '#1e2b55' }}>
          ➕ {t('Buy a banner placement')}
        </Link>
      </Collapsible>

      {/* ── Direct marketing blasts (double opt-in) ──
           Hidden from customers pending legal review — set NEXT_PUBLIC_BLASTS_ENABLED=1 to re-enable. */}
      {BLASTS_ENABLED && (
      <Collapsible defaultOpen={false} title={<>📣 {t('Direct marketing')}</>}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', marginBottom: 10, lineHeight: 1.5 }}>
          {t('Send promotions to opted-in members. Buy a bundle of sends; use them any time.')}
          {blasts && <span style={{ display: 'block', marginTop: 4, fontWeight: 800, color: '#16a34a' }}>{t('You have')} {blasts?.email} {t('email')} · {blasts?.whatsapp} {t('WhatsApp')} {t('sends left')}.</span>}
        </div>
        {(['email', 'whatsapp'] as const).map(ch => {
          const left = blasts ? (ch === 'email' ? blasts.email : blasts.whatsapp) : 0
          return (
            <div key={ch} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--dark)' }}>{ch === 'email' ? '📧 Email blast' : '💬 WhatsApp blast'}</div>
                {left > 0 && <button onClick={() => { setComposeCh(composeCh === ch ? null : ch); setCNote('') }} style={{ background: '#FFF3EE', border: '1px solid #FFD4A0', color: '#1e2b55', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>✍️ {t('Compose')} ({left})</button>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(bundles?.[ch] ?? []).map(b => (
                  <button key={b.qty} onClick={() => buyBlast(ch, b.qty)} disabled={blastBusy !== ''} style={{ flex: 1, minWidth: 90, border: '1.5px solid #d7deec', background: '#fff', borderRadius: 10, padding: '8px 6px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--orange)' }}>€{(b.cents / 100).toFixed(0)}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, color: '#1a1a1a' }}>{blastBusy === `${ch}:${b.qty}` ? 'Opening…' : `${b.qty} send${b.qty > 1 ? 's' : ''}`}</div>
                  </button>
                ))}
              </div>
              {composeCh === ch && (
                <div style={{ marginTop: 8, background: '#f4f6fb', borderRadius: 10, padding: 10 }}>
                  {ch === 'email' && <input value={cSubj} onChange={e => setCSubj(e.target.value)} placeholder={t('Subject')} style={miniInput} />}
                  <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} placeholder={t('Your message, offer or news…')} rows={3} style={{ ...miniInput, resize: 'vertical' }} />
                  <input value={cLink} onChange={e => setCLink(e.target.value)} placeholder={t('Link (optional)')} style={miniInput} />
                  <input value={cAud} onChange={e => setCAud(e.target.value)} placeholder={t('Who to reach (e.g. Las Palmas, all)')} style={miniInput} />
                  {cNote && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: cNote.startsWith('✓') ? '#16a34a' : '#ef4444', marginBottom: 6 }}>{cNote}</div>}
                  <button onClick={submitBlast} disabled={cBusy || cMsg.trim().length < 5} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 900, cursor: 'pointer' }}>{cBusy ? t('Submitting…') : t('Submit — our team sends it')}</button>
                </div>
              )}
            </div>
          )
        })}
        {cNote && composeCh === null && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: cNote.startsWith('✓') ? '#16a34a' : '#ef4444', marginTop: 4 }}>{cNote}</div>}
      </Collapsible>
      )}

      {/* ── Business tools ── */}
      <Collapsible title={t('Business tools')}>
        <div style={{ display: 'grid', gap: 8 }}>
          {!businessVerified && <Tool icon="🛡️" title={t('Verify your business')} sub={t('Required before your shop can go live.')} onClick={() => openPanel('businessVerify')} highlight />}
          <Tool icon="🏪" title={t('My storefront')} sub={t('Layout, branding, featured items and policies.')} onClick={() => openPanel('storefrontEdit')} />
          <Tool icon="📢" title={t('Place a job advert')} sub={t('Candidates apply straight to you.')} onClick={() => router.push('/jobs/new')} />
          <Tool icon="📋" title={t('Applicants')} sub={t('Review and move candidates through your pipeline.')} onClick={() => openPanel('applications')} />
          <Tool icon="🔍" title={t('Search candidates')} sub={t('Add-on to a live advert — free to browse, pay per CV unlock.')} onClick={() => openPanel('findStaff')} />
          <Tool icon="📖" title={t('Directory listing')} sub={t('List your business in the Grabitt directory — from €15/mo.')} onClick={() => router.push('/advertiser')} />
        </div>
      </Collapsible>
    </div>
  )
}

// Collapsible card: a tap-to-toggle header (title + optional action on the
// right) over content that folds away — keeps the Business Centre compact.
function Collapsible({ title, right, defaultOpen = true, children }: { title: React.ReactNode; right?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={card}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <span style={{ ...cardHead, marginBottom: 0, flex: 1 }}>{title}</span>
        {right && <span onClick={e => e.stopPropagation()}>{right}</span>}
        <span style={{ color: '#9aa3ba', fontSize: 16, fontWeight: 900, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
      </div>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  )
}

function Criterion({ label, have, need, decimals }: { label: string; have: number; need: number; decimals?: boolean }) {
  const met = have >= need
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100
  const fmt = (n: number) => (decimals ? n.toFixed(1) : String(n))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: met ? 'var(--sage)' : '#1a1a1a', marginBottom: 3 }}>
        <span>{met ? '✓ ' : ''}{label}</span>
        <span>{fmt(have)} / {fmt(need)}</span>
      </div>
      <div style={{ height: 6, background: '#f0eae0', borderRadius: 50, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: met ? 'var(--sage)' : 'var(--orange)' }} />
      </div>
    </div>
  )
}

// Dashboard-style allowance stat card: big used/cap figure, a slim progress
// bar and a label — three sit side by side in a grid.
function AllowanceCard({ label, icon, used, cap, color }: { label: string; icon: string; used: number; cap: number; color: string }) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0
  const over = used >= cap
  return (
    <div style={{ background: '#fff', border: '1px solid #d7deec', borderRadius: 12, padding: '11px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 19, fontWeight: 900, color: over ? '#ef4444' : '#1e2b55', marginTop: 5 }}>
        {used}<span style={{ fontSize: 13, color: '#9aa3ba', fontWeight: 800 }}> / {cap}</span>
      </div>
      <div style={{ height: 6, background: '#f0eae0', borderRadius: 50, overflow: 'hidden', margin: '6px 2px 0' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: over ? '#ef4444' : color, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#7a8299', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 6 }}>{label}</div>
    </div>
  )
}

function Tool({ icon, title, sub, onClick, highlight }: { icon: string; title: string; sub: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: highlight ? '#f0fdf4' : '#f4f6fb', border: `1px solid ${highlight ? '#bbf7d0' : '#d7deec'}`, borderRadius: 12, padding: '12px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
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

// Cards match the Business Hub dashboard: navy headings, the hub's pale border.
const card: React.CSSProperties = { background: '#fff', border: '1.5px solid #d7deec', borderRadius: 16, padding: 16, boxShadow: '0 4px 18px rgba(30,43,85,0.06)' }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#1e2b55', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const miniBtn: React.CSSProperties = { background: '#eef2f8', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#1e2b55', cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }
const miniInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #d7deec', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, outline: 'none', background: '#fff', marginBottom: 7 }
const row: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f0e8' }
const rowTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const rowSub: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }
