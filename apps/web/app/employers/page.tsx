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
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER, BUSINESS_ADDONS, BUSINESS_ADDON_IDS, addonPriceCents, addonsTotalCents, type BillingInterval } from '@grabitt/design-tokens'
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

function EmployersInner() {
  const { openPanel } = usePanel()
  const [gate, setGate] = useState<Gate>('loading')
  const [addons, setAddons] = useState<string[]>([])
  const [interval, setBilling] = useState<BillingInterval>('month')

  useEffect(() => {
    let live = true
    ;(async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { if (live) setGate('signed_out'); return }
      try {
        const me = await (trpcAuthed() as any).users.me.query()
        if (live) setGate(me?.isBusiness ? 'business' : 'not_business')
      } catch { if (live) setGate('signed_out') }
    })()
    return () => { live = false }
  }, [])

  const isBiz = gate === 'business'
  const toggleAddon = (id: string) => setAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const addonTotal = addonsTotalCents(addons, interval)
  const per = interval === 'year' ? t('/yr') : t('/mo')

  const startSignup = () => {
    try { sessionStorage.setItem('grabitt_biz_addons', JSON.stringify(addons)) } catch {}
    if (gate === 'signed_out') openPanel('login')
    else openPanel('business')
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
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#6b5d48', textAlign: 'center', marginBottom: 12 }}>{t('Every business starts at Business. The lower-fee levels are earned — and maintained — through sales and rating.')}</div>
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
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, color: 'var(--orange)', margin: '8px 0 2px' }}>{feePct(tier.feeRate)}<span style={{ fontSize: 12, color: '#9a8b74', fontWeight: 400 }}> {t('sales fee')}</span></div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, margin: '10px 0 4px' }}>{t('You get')}</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#4a4034', lineHeight: 1.7 }}>
                    <li>{tier.caps.items} {t('item listings / month')}</li>
                    <li>{tier.caps.jobs} {t('job adverts / month')}</li>
                    <li>{tier.caps.property} {t('property listings / month')}</li>
                  </ul>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, margin: '10px 0 4px' }}>{t('Criteria')}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#6b5d48', lineHeight: 1.5 }}>
                    {tier.criteria.sales90d === 0
                      ? t('Included with any Business account.')
                      : `${tier.criteria.sales90d}+ ${t('sales in 90 days')} · ${tier.criteria.rating}★ ${t('rating')}`}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', textAlign: 'center', marginTop: 8 }}>{t('Levels are held on a rolling 90-day basis. Fees apply to item sales only, never to property or job listings.')}</div>
        </div>

        {/* Two side-by-side cards: account (signed-out only) + sponsorship */}
        <div style={{ display: 'grid', gridTemplateColumns: isBiz ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 18 }}>
          {/* Account card — hidden for a signed-in business (they already have one) */}
          {!isBiz && (
            <div style={card}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>{t('Open a Business account')}</div>
              <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#8a5a2a', margin: '6px 0 14px' }}>{t('7 days free, then €29/mo. Storefront, badge, hiring, property and lower fees.')}</div>
              <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#4a4034', lineHeight: 1.9 }}>
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

          {/* Sponsorship & advertising card */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>{t('Sponsorship & advertising')}</div>
              {/* Monthly / yearly toggle */}
              <div style={{ display: 'flex', background: '#f5f0e8', borderRadius: 50, padding: 3 }}>
                {(['month', 'year'] as BillingInterval[]).map(iv => (
                  <button key={iv} onClick={() => setBilling(iv)} style={{ border: 'none', background: interval === iv ? 'var(--orange)' : 'transparent', color: interval === iv ? '#fff' : '#8a7d68', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>{iv === 'month' ? t('Monthly') : t('Yearly · 2 mths free')}</button>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#8a5a2a', margin: '6px 0 12px' }}>
              {isBiz ? t('Add these to your subscription — pick what you want.') : t('Optional — add any of these to put your brand across the island.')}
              {' '}<Link href={HELP} style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>{t('How it works')} ›</Link>
            </div>

            {BUSINESS_ADDON_IDS.map(id => {
              const a = BUSINESS_ADDONS[id]
              const on = addons.includes(id)
              const soon = 'comingSoon' in a && a.comingSoon
              return (
                <label key={id} title={a.blurb} style={chkRow(on)}>
                  <input type="checkbox" checked={on} onChange={() => toggleAddon(id)} style={{ width: 18, height: 18, accentColor: 'var(--orange)', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 800 }}>{a.icon} {a.label}</span>
                    {soon ? <span style={{ marginLeft: 6, background: '#eef2ff', color: '#4f46e5', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 50, textTransform: 'uppercase' }}>{t('Coming soon')}</span> : null}
                    <Link href={HELP} onClick={e => e.stopPropagation()} title={t('Learn more in the Help Centre')} style={{ marginLeft: 6, color: '#b7a98e', textDecoration: 'none', fontWeight: 900 }}>ⓘ</Link>
                    <span style={{ display: 'block', fontSize: 11, color: '#8a7d68', marginTop: 1, lineHeight: 1.4 }}>{a.blurb}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>{eur(addonPriceCents(id, interval))}{per}</span>
                </label>
              )
            })}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f6f2', borderRadius: 12, padding: '11px 13px', margin: '10px 0' }}>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#555' }}>{t('Add-ons total')}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900, color: 'var(--dark)' }}>{eur(addonTotal)}{per}</span>
            </div>

            {isBiz ? (
              <Link href="/account?tab=business" style={{ ...cta, display: 'block', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>{t('Add to my subscription')} →</Link>
            ) : (
              <button onClick={startSignup} style={cta}>{t('Sign up & add these')} →</button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Link href="/jobs" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#9a8b74', textDecoration: 'none' }}>{t('Looking for work instead?')} ›</Link>
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
