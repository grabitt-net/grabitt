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
import EmployerDashboardContent from '@/components/marketplace/EmployerDashboardContent'
import { t } from '@/lib/i18n'

// Employer Dashboard, gated on being a business account. Employers is a paid
// business feature, so anyone who isn't a signed-in business sees what the
// account unlocks and how to upgrade, rather than an empty dashboard.
type Gate = 'loading' | 'business' | 'not_business' | 'signed_out'

export default function EmployersPage() {
  return <PanelProvider><EmployersInner /></PanelProvider>
}

function EmployersInner() {
  const [gate, setGate] = useState<Gate>('loading')

  useEffect(() => {
    let live = true
    ;(async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { if (live) setGate('signed_out'); return }
      try {
        const me = await (trpcAuthed() as any).users.me.query()
        if (live) setGate(me?.isBusiness ? 'business' : 'not_business')
      } catch {
        if (live) setGate('signed_out')
      }
    })()
    return () => { live = false }
  }, [])

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar />
      <QuickActions />

      {gate === 'business' ? (
        <>
          <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>🏢 {t('Employer Dashboard')}</span>
              <Link href="/jobs/new" style={{ marginLeft: 'auto', textDecoration: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>+ {t('Post a Job')}</Link>
            </div>
          </header>
          <EmployerDashboardContent />
        </>
      ) : gate === 'loading' ? (
        <div style={{ textAlign: 'center', padding: 80, fontFamily: 'var(--font-nunito)', color: '#aaa', fontSize: 13 }}>{t('Loading…')}</div>
      ) : (
        <BusinessUpsell signedOut={gate === 'signed_out'} />
      )}

      <Footer />
      <CartFab />
      <PanelHost />
    </main>
  )
}

// Shown to visitors and non-business members: what a Business account unlocks,
// and the way in.
function BusinessUpsell({ signedOut }: { signedOut: boolean }) {
  const { openPanel } = usePanel()

  const perks: [string, string, string][] = [
    ['💼', t('Post job adverts'), t('Advertise roles to jobseekers across Gran Canaria and manage every applicant in one board.')],
    ['🔍', t('Find staff directly'), t('Search people who have listed themselves as available for work and unlock their contact details.')],
    ['🏠', t('List property'), t('Advertise rentals and sales alongside your other listings.')],
    ['🏪', t('Your own storefront'), t('A branded shop page with your logo, banner and followers.')],
    ['🛡️', t('Verified business badge'), t('The 🏢 shield that tells buyers you are a registered business.')],
    ['⭐', t('Instant Dealer grade'), t('Lower selling fees from day one, without waiting to climb the grades.')],
  ]

  return (
    <>
      <header style={{ background: 'var(--sand)', padding: '22px 14px', borderBottom: '1.5px solid var(--sand2)', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🏢</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>{t('Grabitt for Business')}</div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, color: '#6b5d48', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          {t('Hiring, property and a storefront of your own — the Employer Dashboard is part of a Grabitt Business account.')}
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 14px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {perks.map(([icon, title, desc]) => (
            <div key={title} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#6b5d48', lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Price + call to action */}
        <div style={{ background: '#fff', border: '2px solid var(--orange)', borderRadius: 16, padding: 20, marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 30, fontWeight: 700, color: 'var(--orange)' }}>€29<span style={{ fontSize: 15, color: '#8a7d68', fontWeight: 400 }}>/{t('month')}</span></div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#6b5d48', marginTop: 4, marginBottom: 16 }}>{t('7 days free — cancel any time.')}</div>

          {signedOut ? (
            <>
              <button onClick={() => openPanel('login')} style={cta}>{t('Log in to continue')}</button>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#8a7d68', marginTop: 10 }}>
                {t('New to Grabitt?')} <button onClick={() => openPanel('login')} style={linkBtn}>{t('Create account')}</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => openPanel('business')} style={cta}>{t('Upgrade to Business')}</button>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#8a7d68', marginTop: 10 }}>
                {t('Already upgraded? Refresh this page to open your dashboard.')}
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/jobs" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#9a8b74', textDecoration: 'none' }}>{t('Looking for work instead?')} ›</Link>
        </div>
      </div>
    </>
  )
}

const cta: React.CSSProperties = {
  width: '100%', maxWidth: 320, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff',
  border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer',
}
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline',
}
