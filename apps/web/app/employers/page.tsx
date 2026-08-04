'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER } from '@grabitt/design-tokens'
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
const feePct = (r: number) => `${(r * 100).toFixed(r * 100 % 1 ? 1 : 0)}%`
const eur = (cents: number) => `€${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`
const HELP = '/help#business-advertising'

type SponsorItem = { id: string; label: string; icon: string; blurb: string; comingSoon: boolean; monthlyCents: number }
const sponsorTotalCents = (monthly: number, months: number) => monthly * (months >= 12 ? 10 : months)

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
  const basketTotal = Object.entries(basket).reduce((s, [id, m]) => { const c = catalog.find(x => x.id === id); return s + (c ? sponsorTotalCents(c.monthlyCents, m) : 0) }, 0)
  const basketItems = Object.entries(basket).map(([addonId, months]) => ({ addonId, months, ...(addonId === 'category_sponsor' && pageFor[addonId] ? { pageTarget: pageFor[addonId] } : {}) }))

  // Carry the sponsorship basket into the signup panel so it's paid in one go.
  const stashBasket = () => { try { sessionStorage.setItem('grabitt_biz_sponsorship', JSON.stringify(basket)); sessionStorage.setItem('grabitt_biz_sponsorship_pages', JSON.stringify(pageFor)) } catch {} }

  const startSignup = () => {
    stashBasket()
    if (gate === 'signed_out') openPanel('login'); else openPanel('business')
  }

  // Existing business → buy the sponsorship basket one-off. Everyone else →
  // combine it with opening the account (paid together at signup).
  const buySponsorship = async () => {
    if (basketItems.length === 0) return
    if (!isBiz) { startSignup(); return }
    setBusy(true)
    try {
      const res = await (trpcAuthed() as any).sponsorship.checkout.mutate({ items: basketItems })
      if (res?.url) window.location.href = res.url
    } catch { setBusy(false) }
  }

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
        {/* Perks — compact, one line on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }} className="biz-perks">
          {([
            ['💼', t('Post jobs')],
            ['🔍', t('Find staff')],
            ['🏠', t('List property')],
            ['🏪', t('Storefront')],
            ['🛡️', t('Verified badge')],
            ['⭐', t('Lower fees')],
          ] as [string, string][]).map(([icon, title]) => (
            <div key={title} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: '12px 6px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: 'var(--dark)', marginTop: 4, lineHeight: 1.25 }}>{title}</div>
            </div>
          ))}
        </div>

        {/* Business levels */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', textAlign: 'center', marginBottom: 4 }}>{t('Business levels')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#1a1a1a', textAlign: 'center', marginBottom: 12 }}>{t('Every business starts at Business. The lower-fee levels are earned — and maintained — through sales and rating.')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {BUSINESS_TIER_ORDER.map((g, i) => {
              const tier = BUSINESS_TIERS[g]
              const start = i === 0
              return (
                <div key={g} style={{ background: start ? '#FFF7F0' : '#fff', border: `1.5px solid ${start ? 'var(--orange)' : '#ece3d7'}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{TIER_EMOJI[g]}</span>
                    <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{tier.label}</span>
                    {start && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-nunito)', fontSize: 8.5, fontWeight: 900, color: '#fff', background: 'var(--orange)', borderRadius: 50, padding: '2px 7px', textTransform: 'uppercase' }}>{t('Start here')}</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, color: 'var(--orange)', margin: '8px 0 2px' }}>{feePct(tier.feeRate)}<span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 400 }}> {t('sales fee')}</span></div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, margin: '10px 0 4px' }}>{t('You get')}</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#1a1a1a', lineHeight: 1.7 }}>
                    <li>{tier.caps.items} {t('item listings / month')}</li>
                    <li>{tier.caps.jobs} {t('job adverts / month')}</li>
                    <li>{tier.caps.property} {t('property listings / month')}</li>
                  </ul>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, margin: '10px 0 4px' }}>{t('Criteria')}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#1a1a1a', lineHeight: 1.5 }}>
                    {tier.criteria.sales90d === 0
                      ? t('Included with any Business account.')
                      : `${tier.criteria.sales90d}+ ${t('sales in 90 days')} · ${tier.criteria.rating}★ ${t('rating')}`}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', textAlign: 'center', marginTop: 8 }}>{t('Levels are held on a rolling 90-day basis. Fees apply to item sales only, never to property or job listings.')}</div>
        </div>

        {/* Two side-by-side cards: account (signed-out only) + sponsorship */}
        <div style={{ display: 'grid', gridTemplateColumns: isBiz ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 18 }}>
          {/* Account card — hidden for a signed-in business (they already have one) */}
          {!isBiz && (
            <div style={card}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>{t('Open a Business account')}</div>
              <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#8a5a2a', margin: '6px 0 14px' }}>{t('7 days free, then €29/mo. Storefront, badge, hiring, property and lower fees.')}</div>
              <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#1a1a1a', lineHeight: 1.9 }}>
                <li>{t('Your own branded storefront')}</li>
                <li>{t('Verified 🏢 business badge')}</li>
                <li>{t('Post jobs & list property')}</li>
                <li>{t('Bulk import & multibuy')}</li>
              </ul>
              <button onClick={startSignup} style={cta}>{t('Start free trial')} →</button>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#8a5a2a', textAlign: 'center', marginTop: 10 }}>
                {t('Already have an account?')} <button onClick={() => openPanel('login')} style={linkBtn}>{t('Log in')}</button>
              </div>
            </div>
          )}

          {/* Sponsorship & advertising — one-off, timed placements bought as a basket */}
          <div style={card}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>{t('Sponsorship & advertising')}</div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#8a5a2a', margin: '6px 0 12px' }}>
              {t('Buy a placement for a set number of months — a one-off payment, no subscription. 12 months = 2 months free.')}
              {' '}<Link href={HELP} style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>{t('How it works')} ›</Link>
            </div>

            {catalog.map(a => {
              const on = inBasket(a.id)
              const months = basket[a.id] ?? durations[0] ?? 1
              const lineTotal = sponsorTotalCents(a.monthlyCents, months)
              return (
                <div key={a.id} title={a.blurb} style={chkRow(on)}>
                  <input type="checkbox" checked={on} disabled={a.comingSoon} onChange={() => toggleAddon(a.id)} style={{ width: 18, height: 18, accentColor: 'var(--orange)', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 800 }}>{a.icon} {a.label}</span>
                    {a.comingSoon ? <span style={{ marginLeft: 6, background: '#eef2ff', color: '#4f46e5', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 50, textTransform: 'uppercase' }}>{t('Coming soon')}</span> : null}
                    <Link href={HELP} onClick={e => e.stopPropagation()} title={t('Learn more in the Help Centre')} style={{ marginLeft: 6, color: '#b7a98e', textDecoration: 'none', fontWeight: 900 }}>ⓘ</Link>
                    <span style={{ display: 'block', fontSize: 11, color: '#1a1a1a', marginTop: 1, lineHeight: 1.4 }}>{a.blurb}</span>
                    {on && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <select value={months} onChange={e => setMonths(a.id, Number(e.target.value))} style={{ border: '1.5px solid #e5dccd', borderRadius: 8, padding: '5px 8px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 700, background: '#fff' }}>
                          {durations.map(d => <option key={d} value={d}>{d} {d === 1 ? t('month') : t('months')}</option>)}
                        </select>
                        {a.id === 'category_sponsor' && (
                          <select value={pageFor[a.id] ?? ''} onChange={e => setPageFor(p => ({ ...p, [a.id]: e.target.value }))} style={{ border: '1.5px solid #e5dccd', borderRadius: 8, padding: '5px 8px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 700, background: '#fff' }}>
                            <option value="">{t('Choose a page…')}</option>
                            {pages.map(pg => <option key={pg} value={pg}>{pg.replace('_', ' ')}</option>)}
                          </select>
                        )}
                        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a' }}>{eur(a.monthlyCents)}/mo</span>
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>{on ? eur(lineTotal) : `${eur(a.monthlyCents)}/mo`}</span>
                </div>
              )
            })}
            {catalog.length === 0 && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '10px 0', textAlign: 'center' }}>{t('Loading…')}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f6f2', borderRadius: 12, padding: '11px 13px', margin: '10px 0' }}>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#555' }}>{t('Basket total (one-off)')}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900, color: 'var(--dark)' }}>{eur(basketTotal)}</span>
            </div>

            <button onClick={buySponsorship} disabled={busy || basketItems.length === 0} style={{ ...cta, opacity: basketItems.length === 0 ? 0.5 : 1 }}>
              {busy ? t('Opening checkout…') : isBiz ? `${t('Pay & activate')} →` : `${t('Sign up & pay')} →`}
            </button>
            {!isBiz && basketItems.length > 0 && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#8a5a2a', textAlign: 'center', marginTop: 6 }}>{t('Your account + these placements are paid together at checkout.')}</div>}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Link href="/jobs" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#1a1a1a', textDecoration: 'none' }}>{t('Looking for work instead?')} ›</Link>
        </div>
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
      <style>{`@media (max-width: 620px){ .biz-perks{ grid-template-columns: repeat(3, 1fr) !important; } }`}</style>
    </main>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const chkRow = (on: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'flex-start', gap: 11, background: on ? '#FFF7F0' : '#fff', border: `1.5px solid ${on ? 'var(--orange)' : '#f0ebe4'}`, borderRadius: 12, padding: '11px 13px', marginBottom: 8, cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'var(--dark)' })
const cta: React.CSSProperties = { width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }
