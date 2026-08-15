'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER, BLAST_BUNDLES } from '@grabitt/design-tokens'
import { createLooseTrpcClient } from '@/lib/trpc'
import { t } from '@/lib/i18n'

// The For Business page is a marketing / sign-up page. A signed-in business only
// picks sponsorship & advertising add-ons; a signed-out visitor also opens the
// account. The sponsorship & advertising details live in the Help Centre.
type Gate = 'loading' | 'business' | 'not_business' | 'signed_out'

export default function EmployersPage() {
  return <PanelProvider><EmployersInner /></PanelProvider>
}

const TIER_EMOJI: Record<string, string> = { dealer: '🟡', trader: '🔵', pro: '⭐' }
const TIER_COLOR: Record<string, string> = { dealer: '#EAB308', trader: '#3b82f6', pro: '#a855f7' }
const feePct = (r: number) => `${(r * 100).toFixed(r * 100 % 1 ? 1 : 0)}%`
const eur = (cents: number) => `€${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`
// Human-friendly page name for the Category Sponsor picker: sentence case, with
// the Grab It Now slug shown as the brand name "Grabitt Now".
const pageLabel = (pg: string) => pg === 'grab_it_now' ? 'Grabitt Now' : pg === 'home' ? 'Homepage' : pg.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
const HELP = '/help#business-advertising'

type SponsorItem = { id: string; label: string; icon: string; blurb: string; comingSoon: boolean; monthlyCents: number }
const sponsorTotalCents = (monthly: number, months: number) => monthly * (months >= 12 ? 10 : months)

// Blasts are priced by send-quantity bundles, not months (see BLAST_BUNDLES).
const blastKind = (id: string): 'email' | 'whatsapp' | null => id === 'email_blast' ? 'email' : id === 'whatsapp_blast' ? 'whatsapp' : null
const blastQtys = (id: string): number[] => { const k = blastKind(id); return k ? Object.keys(BLAST_BUNDLES[k]).map(Number).sort((a, b) => a - b) : [] }
const blastPrice = (id: string, qty: number): number => { const k = blastKind(id); return k ? (BLAST_BUNDLES[k][qty] ?? 0) : 0 }
// Line total for an add-on: bundle price for blasts, months × monthly otherwise.
const lineCents = (id: string, monthlyCents: number, n: number): number => blastKind(id) ? blastPrice(id, n) : sponsorTotalCents(monthlyCents, n)

function EmployersInner() {
  const { openPanel } = usePanel()
  const [gate, setGate] = useState<Gate>('loading')
  // Sponsorship basket: addonId -> chosen months (absent = not in basket).
  const [basket, setBasket] = useState<Record<string, number>>({})
  const [pageFor, setPageFor] = useState<Record<string, string>>({})
  const [catalog, setCatalog] = useState<SponsorItem[]>([])
  const [durations, setDurations] = useState<number[]>([1, 3, 6, 12])
  const [pages, setPages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  // The subscription is the first basket item for a new business: monthly or yearly.
  const [plan, setPlan] = useState<'month' | 'year' | 'light'>('month')
  // The monthly/yearly toggle for the paid plan — drives the paid card's price.
  const [billing, setBilling] = useState<'month' | 'year'>('month')
  const SUB_CENTS = { month: 2900, year: 29000 } as const

  useEffect(() => {
    let live = true
    ;(async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { if (live) setGate('signed_out') }
      else {
        try {
          const me = await (trpcAuthed() as any).users.me.query()
          if (live) setGate(me?.isBusiness ? 'business' : 'not_business')
        } catch { if (live) setGate('signed_out') }
      }
    })()
    createLooseTrpcClient().sponsorship.catalog.query()
      .then((d: any) => { if (live) { setCatalog(d.items as SponsorItem[]); if (Array.isArray(d.durations)) setDurations(d.durations); if (Array.isArray(d.pages)) setPages(d.pages) } })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const isBiz = gate === 'business'
  const inBasket = (id: string) => basket[id] != null
  const toggleAddon = (id: string) => setBasket(p => { const n = { ...p }; if (n[id] != null) delete n[id]; else n[id] = durations[0] ?? 1; return n })
  const setMonths = (id: string, m: number) => setBasket(p => ({ ...p, [id]: m }))
  const basketTotal = Object.entries(basket).reduce((s, [id, m]) => { const c = catalog.find(x => x.id === id); return s + (c ? lineCents(id, c.monthlyCents, m) : 0) }, 0)
  const basketItems = Object.entries(basket).map(([addonId, months]) => ({ addonId, months, ...(addonId === 'category_sponsor' && pageFor[addonId] ? { pageTarget: pageFor[addonId] } : {}) }))

  // Carry the whole basket (subscription plan + sponsorship placements) into the
  // signup panel so it's reviewed and paid in one go.
  const stashBasket = () => { try { sessionStorage.setItem('grabitt_biz_sponsorship', JSON.stringify(basket)); sessionStorage.setItem('grabitt_biz_sponsorship_pages', JSON.stringify(pageFor)); sessionStorage.setItem('grabitt_biz_interval', plan) } catch {} }

  // One CTA for everyone. A new/prospective business goes to the account step
  // with the basket carried over (subscription + upgrades paid together). An
  // existing business just buys the selected upgrades one-off.
  const continueToCheckout = async () => {
    stashBasket()
    if (!isBiz) { openPanel(gate === 'signed_out' ? 'login' : 'business'); return }
    if (basketItems.length === 0) return
    setBusy(true)
    try {
      const res = await (trpcAuthed() as any).sponsorship.checkout.mutate({ items: basketItems })
      if (res?.url) window.location.href = res.url
    } catch { setBusy(false) }
  }
  const subDueLabel = plan === 'light' ? t('Free') : plan === 'year' ? `${eur(SUB_CENTS.year)}/yr` : `${eur(SUB_CENTS.month)}/mo`

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="For Business" />
      <QuickActions />

      {/* Signed-in business: a button to their dashboard. */}
      {isBiz && (
        <div style={{ background: 'var(--sand)', padding: '10px 14px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/account?tab=business" style={{ textDecoration: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '9px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800 }}>🏢 {t('My Business Dashboard')} →</Link>
        </div>
      )}

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '18px 14px 0' }}>
        {/* Business levels */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="biz-levels">
            {/* Business Light — the free entry account, shown first in the row. */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#fff', border: '1.5px solid var(--line)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ height: 4, background: '#94a3b8' }} />
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 19 }}>🆓</span>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{t('Business Light')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                  <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 30, fontWeight: 700, color: 'var(--orange)', lineHeight: 1 }}>8%</span>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#6a6a6a', fontWeight: 700 }}>{t('sales fee')}</span>
                </div>
                <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#000', letterSpacing: 0.3, marginBottom: 8 }}>{t('What you get')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[t('No monthly fee'), t('3 free listings per month')].map(line => (
                    <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a' }}>
                      <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', background: '#eaf7ee', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>✓</span>
                      {line}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <div style={{ background: '#f8f6f2', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontWeight: 900, color: '#000', fontSize: 11, marginBottom: 4 }}>{t('Have a free test')}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#000', lineHeight: 1.45 }}>{t('Recruitment and property ads not included')}</span>
                  </div>
                </div>
              </div>
            </div>
            {BUSINESS_TIER_ORDER.map((g, i) => {
              const tier = BUSINESS_TIERS[g]
              const start = i === 0
              // Per-tier footer copy, exactly as specified on the lander.
              const promo = g === 'pro'
                ? { label: t('Hold onto it'), lines: [t('75 minimum sales with no refunds in 90 days'), t('Maintain 4.9 rating consistently')] }
                : g === 'trader'
                ? { label: t('How to get promoted'), lines: [t('25 min sales with no refunds in 90 days'), t('Maintain 4.7 or above rating in 90 days')] }
                : { label: t('How to get promoted'), lines: [t('Start growing your online business here.')] }
              return (
                <div key={g} style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#fff', border: `1.5px solid ${start ? 'var(--orange)' : 'var(--line)'}`, borderRadius: 16, overflow: 'visible', boxShadow: start ? '0 8px 24px rgba(245,84,10,0.13)' : 'var(--shadow-sm)' }}>
                  {/* Promotion arrow to the next paid tier (shown in the 4-up row). */}
                  {i < BUSINESS_TIER_ORDER.length - 1 && (
                    <span className="tier-arrow" style={{ position: 'absolute', right: -13, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '1.5px solid #f0d9c4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontSize: 13, fontWeight: 900, boxShadow: 'var(--shadow-sm)' }} aria-hidden>→</span>
                  )}
                  {/* Tier accent bar */}
                  <div style={{ height: 4, borderRadius: '15px 15px 0 0', background: start ? 'linear-gradient(90deg,var(--orange),var(--orange2))' : TIER_COLOR[g] }} />
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 19 }}>{TIER_EMOJI[g]}</span>
                      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{tier.label}</span>
                      {start && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-nunito)', fontSize: 8.5, fontWeight: 900, color: '#fff', background: 'var(--orange)', borderRadius: 50, padding: '3px 9px', textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('Start here')}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                      <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 30, fontWeight: 700, color: 'var(--orange)', lineHeight: 1 }}>{feePct(tier.feeRate)}</span>
                      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#6a6a6a', fontWeight: 700 }}>{t('sales fee')}</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#000', letterSpacing: 0.3, marginBottom: 8 }}>{t('Included each month')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {[`${tier.caps.items} ${t('item listings')}`, `${tier.caps.jobs} ${t('job adverts')}`, `${tier.caps.property} ${t('property listings')}`, t('Storefront'), t('Free directory listing')].map(line => (
                        <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a' }}>
                          <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', background: '#eaf7ee', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>✓</span>
                          {line}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                      <div style={{ background: start ? '#FFF7F0' : '#f8f6f2', border: `1px solid ${start ? '#FFE0C7' : 'var(--line)'}`, borderRadius: 10, padding: '9px 11px' }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontWeight: 900, color: '#000', fontSize: 11, marginBottom: 4 }}>{promo.label}</span>
                        {promo.lines.map(l => <span key={l} style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#000', lineHeight: 1.45, marginBottom: 2 }}>{l}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', textAlign: 'center', marginTop: 8 }}>{t('Levels are held on a rolling 90-day basis. Fees apply to item sales only, never to property or job listings.')}</div>
        </div>

        {/* Key features for paid business accounts — each led by a large green
            tick to draw the eye. */}
        <div style={{ marginTop: 22, fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', textAlign: 'center', marginBottom: 12 }}>{t('Key Features for Paid Business Accounts')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }} className="biz-perks">
          {([
            [t('Storefront'), t('Your own branded shop page with logo, banner and all your listings.')],
            [t('Recruitment'), t('Post jobs, search the candidate database and track applicants.')],
            [t('List property'), t('Advertise property for sale or rent — commission-free.')],
            [t('Verified badge'), t('A 🏢 badge that shows buyers you’re a genuine business.')],
            [t('Lower fees'), t('Selling fees from 6%, dropping to as low as 2.5%.')],
            [t('Stats & Analytics'), t('Views, offers and conversion for every listing.')],
          ] as [string, string][]).map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 14px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: '#eaf7ee', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900 }}>✓</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{title}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#6a6a6a', lineHeight: 1.4, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Build-a-basket: subscription (new business) + upgrades, paid together */}
        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          {/* 1) Business subscription — choose monthly or yearly (new businesses only) */}
          {!isBiz && (
            <div style={card}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>{t('1. Your Business account')}</div>
              <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#8a5a2a', margin: '6px 0 12px' }}>{t('14 days free, then choose monthly or yearly. Storefront, badge, hiring, property and lower fees.')}</div>
              {/* Monthly / yearly toggle — centered; drives the paid card's price. */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ display: 'inline-flex', background: '#f5f0e8', borderRadius: 50, padding: 3 }}>
                  {(['month', 'year'] as const).map(b => (
                    <button key={b} onClick={() => { setBilling(b); setPlan(p => (p === 'light' ? 'light' : b)) }} style={{ border: 'none', borderRadius: 50, padding: '5px 16px', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, background: billing === b ? '#fff' : 'transparent', color: billing === b ? 'var(--dark)' : '#888', boxShadow: billing === b ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      {b === 'month' ? t('Monthly') : t('Yearly')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free account first, paid second — the paid card updates with the toggle. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => setPlan('light')} style={{ textAlign: 'left', border: `2px solid ${plan === 'light' ? 'var(--orange)' : '#f0ebe4'}`, background: plan === 'light' ? '#FFF7F0' : '#fff', borderRadius: 14, padding: 14, cursor: 'pointer' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>🆓 {t('Business Light')}</div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700, color: plan === 'light' ? 'var(--orange)' : 'var(--dark)', margin: '6px 0 2px' }}>{t('Free')}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#8a5a2a', lineHeight: 1.4 }}>{t('No monthly fee · 8% fee · €0.99 per item listing')}</div>
                </button>
                <button onClick={() => setPlan(billing)} style={{ textAlign: 'left', border: `2px solid ${plan !== 'light' ? 'var(--orange)' : '#f0ebe4'}`, background: plan !== 'light' ? '#FFF7F0' : '#fff', borderRadius: 14, padding: 14, cursor: 'pointer' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>🏢 {t('Business')}</div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700, color: plan !== 'light' ? 'var(--orange)' : 'var(--dark)', margin: '6px 0 2px' }}>{billing === 'year' ? '€290' : '€29'}<span style={{ fontSize: 12, color: '#6a6a6a', fontWeight: 400 }}>{billing === 'year' ? `/${t('year')}` : `/${t('month')}`}</span></div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#16a34a', fontWeight: 800, lineHeight: 1.4 }}>{t('14 days free')}{billing === 'year' ? ` · ${t('2 months free')}` : ''}</div>
                </button>
              </div>
              <ul style={{ margin: '14px 0 0', paddingLeft: 18, fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a', lineHeight: 1.8 }}>
                <li>{t('Your own branded storefront')} · {t('Verified 🏢 business badge')}</li>
                <li>{t('Post jobs & list property')} · {t('Bulk import & multibuy')}</li>
              </ul>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#8a5a2a', marginTop: 10 }}>
                {t('Already have an account?')} <button onClick={() => openPanel('login')} style={linkBtn}>{t('Log in')}</button>
              </div>
            </div>
          )}

          {/* 2) Upgrades — 2 per line, as cards */}
          <div style={card}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>{isBiz ? t('Sponsorship & advertising') : t('2. Add upgrades (optional)')}</div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#8a5a2a', margin: '6px 0 12px' }}>
              {t('One-off, timed placements — pick the months you want (12 = 2 months free).')}
              {' '}<Link href={HELP} style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>{t('How it works')} ›</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="biz-upgrades">
              {catalog.map(a => {
                const on = inBasket(a.id)
                const months = basket[a.id] ?? durations[0] ?? 1
                const lineTotal = lineCents(a.id, a.monthlyCents, months)
                return (
                  <div key={a.id} onClick={() => !a.comingSoon && toggleAddon(a.id)} style={{ ...upgradeCard(on), opacity: a.comingSoon ? 0.6 : 1, cursor: a.comingSoon ? 'default' : 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: `2px solid ${on ? 'var(--orange)' : '#d8cbb5'}`, background: on ? 'var(--orange)' : '#fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>{on ? '✓' : ''}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{a.icon} {a.label}
                          {a.comingSoon && <span style={{ marginLeft: 6, background: '#eef2ff', color: '#4f46e5', fontSize: 8.5, fontWeight: 900, padding: '2px 6px', borderRadius: 50, textTransform: 'uppercase' }}>{t('Soon')}</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', marginTop: 2, lineHeight: 1.4 }}>{a.blurb}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>{on ? eur(lineTotal) : blastKind(a.id) ? `${eur(blastPrice(a.id, 1))}/send` : `${eur(a.monthlyCents)}/mo`}</span>
                    </div>
                    {on && (
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #eaddc9' }}>
                        <select value={months} onChange={e => setMonths(a.id, Number(e.target.value))} style={miniSel}>
                          {(blastKind(a.id) ? blastQtys(a.id) : durations).map(d => <option key={d} value={d}>{blastKind(a.id) ? `${d} ${d === 1 ? t('send') : t('sends')} · ${eur(blastPrice(a.id, d))}` : `${d} ${d === 1 ? t('month') : t('months')}`}</option>)}
                        </select>
                        {a.id === 'category_sponsor' && (
                          <select value={pageFor[a.id] ?? ''} onChange={e => setPageFor(p => ({ ...p, [a.id]: e.target.value }))} style={miniSel}>
                            <option value="">{t('Choose a page…')}</option>
                            {pages.map(pg => <option key={pg} value={pg}>{pageLabel(pg)}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {catalog.length === 0 && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '10px 0', textAlign: 'center' }}>{t('Loading…')}</div>}

            {/* Directory is bought in the basket like any add-on; its details
                (phone, website, logo…) are completed afterwards. */}
            {inBasket('directory') && (
              <div style={{ marginTop: 10, background: '#FFF7F0', border: '1px dashed #f0c9a5', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#8a5a2a', lineHeight: 1.45 }}>
                📖 {t('After checkout, add your directory details (phone, website, logo) from Business → Directory listing.')}
              </div>
            )}
          </div>

          {/* 3) Unified basket + single CTA */}
          <div style={card}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', marginBottom: 10 }}>{t('Your basket')}</div>
            {!isBiz && (
              <div style={basketRow}>
                <span>🏢 {t('Business account')} · {plan === 'light' ? t('Business Light') : plan === 'year' ? t('Yearly') : t('Monthly')}</span>
                <span style={{ fontWeight: 900 }}>{subDueLabel}{plan !== 'light' && <span style={{ color: '#16a34a', fontWeight: 800 }}> ({t('14 days free')})</span>}</span>
              </div>
            )}
            {basketItems.length === 0 && isBiz && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '6px 0' }}>{t('No upgrades selected yet.')}</div>}
            {Object.entries(basket).map(([id, m]) => {
              const c = catalog.find(x => x.id === id); if (!c) return null
              return (
                <div key={id} style={basketRow}>
                  <span>{c.icon} {c.label}{id === 'category_sponsor' && pageFor[id] ? ` · ${pageLabel(pageFor[id])}` : ''} · {m} {blastKind(id) ? (m === 1 ? t('send') : t('sends')) : (m === 1 ? t('month') : t('months'))}</span>
                  <span style={{ fontWeight: 900 }}>{eur(lineCents(id, c.monthlyCents, m))}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0ebe4', marginTop: 8, paddingTop: 10 }}>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: '#555' }}>{isBiz ? t('Upgrades total (one-off)') : t('Upgrades (one-off, on first invoice)')}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900, color: 'var(--orange)' }}>{eur(basketTotal)}</span>
            </div>

            <button onClick={continueToCheckout} disabled={busy || (isBiz && basketItems.length === 0)} style={{ ...cta, marginTop: 14, opacity: (isBiz && basketItems.length === 0) ? 0.5 : 1 }}>
              {busy ? t('Opening checkout…') : isBiz ? `${t('Pay & activate')} →` : `${t('Continue to checkout')} →`}
            </button>
            {!isBiz && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#8a5a2a', textAlign: 'center', marginTop: 8 }}>{t('Next: create your account, then your subscription and any upgrades are paid together.')}</div>}
            <Link href="/advertise" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 12, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--orange)' }}>
              🎯 {t('Or book banner advertising with a date picker')} ›
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Link href="/jobs" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#1a1a1a', textDecoration: 'none' }}>{t('Looking for work instead?')} ›</Link>
        </div>
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
      <style>{`
        @media (max-width: 760px){ .biz-perks{ grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 620px){ .biz-upgrades{ grid-template-columns: 1fr !important; } }
        @media (max-width: 480px){ .biz-perks{ grid-template-columns: 1fr !important; } }
        @media (max-width: 880px){ .biz-levels{ grid-template-columns: repeat(2, 1fr) !important; } .tier-arrow{ display: none !important; } }
        @media (max-width: 480px){ .biz-levels{ grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const upgradeCard = (on: boolean): React.CSSProperties => ({ background: on ? '#FFF7F0' : '#fff', border: `1.5px solid ${on ? 'var(--orange)' : '#f0ebe4'}`, borderRadius: 12, padding: '12px 13px' })
const miniSel: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 8, padding: '5px 8px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 700, background: '#fff' }
const basketRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#1a1a1a', padding: '5px 0' }
const cta: React.CSSProperties = { width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }
