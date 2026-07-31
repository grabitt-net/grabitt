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
import { BUSINESS_TIERS, BUSINESS_TIER_ORDER, BUSINESS_ADDONS, BUSINESS_ADDON_IDS, businessMonthlyTotalCents } from '@grabitt/design-tokens'
import { t } from '@/lib/i18n'

// The For Business page is a marketing / sign-up page and stays the SAME whether
// or not someone is signed in. A signed-in business just gets a button to their
// dashboard at the top — the page itself never turns into the dashboard.
type Gate = 'loading' | 'business' | 'not_business' | 'signed_out'

export default function EmployersPage() {
  return <PanelProvider><EmployersInner /></PanelProvider>
}

const TIER_EMOJI: Record<string, string> = { dealer: '🟡', trader: '🔵', pro: '⭐' }
const feePct = (r: number) => `${(r * 100).toFixed(r * 100 % 1 ? 1 : 0)}%`
const eur = (cents: number) => `€${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`

function EmployersInner() {
  const { openPanel } = usePanel()
  const [gate, setGate] = useState<Gate>('loading')
  const [wantBusiness, setWantBusiness] = useState(true)
  const [addons, setAddons] = useState<string[]>([])

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

  const toggleAddon = (id: string) => setAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const monthlyTotal = businessMonthlyTotalCents(wantBusiness ? addons : []) / 100

  // Carry the selection into the business signup panel.
  const startSignup = () => {
    try { sessionStorage.setItem('grabitt_biz_addons', JSON.stringify(addons)) } catch {}
    if (gate === 'signed_out') openPanel('login')
    else openPanel('business')
  }

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="For Business" />
      <QuickActions />

      {/* Signed-in business: a button to their dashboard. The page below is identical for everyone. */}
      {gate === 'business' && (
        <div style={{ background: 'var(--sand)', padding: '10px 14px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/account?tab=business" style={{ textDecoration: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '9px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800 }}>🏢 {t('My Business Dashboard')} →</Link>
        </div>
      )}

      {/* Hero */}
      <header style={{ background: 'var(--sand)', padding: '22px 14px', borderBottom: '1.5px solid var(--sand2)', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🏢</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>{t('Grabitt for Business')}</div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#6b5d48', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          {t('A storefront, lower fees, hiring and property — plus optional sponsorship to put your brand in front of the whole island.')}
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 14px 0' }}>
        {/* Perks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {([
            ['💼', t('Post job adverts'), t('Advertise roles and manage every applicant in one board.')],
            ['🔍', t('Find staff directly'), t('Search people available for work and unlock their contact details.')],
            ['🏠', t('List property'), t('Advertise rentals and sales alongside your listings.')],
            ['🏪', t('Your own storefront'), t('A branded shop page with your logo, banner and followers.')],
            ['🛡️', t('Verified business badge'), t('The 🏢 shield that tells buyers you are a registered business.')],
            ['⭐', t('Lower selling fees'), t('Start at Business rates and earn your way to lower fees.')],
          ] as [string, string, string][]).map(([icon, title, desc]) => (
            <div key={title} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#6b5d48', lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Business levels — names, rates, what you get, criteria */}
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
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', textAlign: 'center', marginTop: 8 }}>{t('Levels are held on a rolling 90-day basis — keep your numbers up to hold your level. Fees apply to item sales only, never to property or job listings.')}</div>
        </div>

        {/* Sign up + sponsorship extras, together */}
        <div style={{ background: 'linear-gradient(135deg,#FFF3EE,#FFE4D6)', border: '2px solid #FF8C00', borderRadius: 18, padding: '20px 18px', marginTop: 18 }}>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>{t('Start your Business account')}</div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#8a5a2a', marginTop: 4 }}>{t('7 days free, then €29/mo. Add sponsorship & advertising below — pay for only what you pick.')}</div>
          </div>

          <label style={chkRow(wantBusiness)}>
            <input type="checkbox" checked={wantBusiness} onChange={e => setWantBusiness(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--orange)' }} />
            <span style={{ flex: 1 }}><b>{t('Open a Business account')}</b> — €29/mo <span style={{ color: '#8a7d68' }}>({t('7-day free trial')})</span></span>
          </label>

          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#8a5a2a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '12px 0 6px' }}>{t('Sponsorship & advertising (optional)')}</div>
          {BUSINESS_ADDON_IDS.map(id => {
            const a = BUSINESS_ADDONS[id]
            const on = addons.includes(id)
            const soon = 'comingSoon' in a && a.comingSoon
            return (
              <label key={id} style={chkRow(on)}>
                <input type="checkbox" checked={on} onChange={() => toggleAddon(id)} style={{ width: 18, height: 18, accentColor: 'var(--orange)' }} />
                <span style={{ flex: 1 }}>
                  <b>{a.icon} {a.label}</b>{soon ? <span style={{ marginLeft: 6, background: '#eef2ff', color: '#4f46e5', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 50, textTransform: 'uppercase' }}>{t('Coming soon')}</span> : null}
                  <span style={{ display: 'block', fontSize: 11, color: '#8a7d68', marginTop: 1 }}>{a.blurb}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>{eur(a.amountCents)}/mo</span>
              </label>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 12, padding: '12px 14px', margin: '12px 0' }}>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#555' }}>{t('Monthly total after trial')}</span>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>€{monthlyTotal % 1 ? monthlyTotal.toFixed(2) : monthlyTotal}/mo</span>
          </div>

          {gate === 'business' ? (
            <Link href="/account?tab=business" style={{ ...cta, display: 'block', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>{t('Manage your add-ons')} →</Link>
          ) : (
            <>
              <button onClick={startSignup} style={cta}>{t('Sign up')} →</button>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#8a5a2a', textAlign: 'center', marginTop: 10 }}>
                {t('Already have an account?')} <button onClick={() => openPanel('login')} style={linkBtn}>{t('Log in')}</button>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Link href="/jobs" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#9a8b74', textDecoration: 'none' }}>{t('Looking for work instead?')} ›</Link>
        </div>
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
    </main>
  )
}

const chkRow = (on: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 11, background: on ? '#fff' : 'rgba(255,255,255,0.5)', border: `1.5px solid ${on ? 'var(--orange)' : '#f0d9c4'}`, borderRadius: 12, padding: '11px 13px', marginBottom: 8, cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'var(--dark)' })
const cta: React.CSSProperties = { width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline' }
