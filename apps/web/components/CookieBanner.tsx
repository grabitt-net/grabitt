'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Cookie notice. Grabitt currently sets only strictly-necessary cookies (auth
// session, basket, CSRF), which under the ePrivacy Directive / LSSI-CE do NOT
// require consent — so this is an informational notice with an acknowledgement,
// not a consent gate, and nothing is blocked before it's dismissed.
//
// If analytics or advertising cookies are ever added, this must become a real
// consent banner: non-essential scripts must not run until the user opts in,
// "Reject" must be as easy as "Accept", and the choice must be re-changeable.
const KEY = 'grabitt_cookie_notice_v1'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true) } catch { /* storage blocked */ }
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9998,
        maxWidth: 720, margin: '0 auto', background: '#fff',
        border: '1px solid #e8dcc0', borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)', padding: '14px 16px',
        display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1 }}>🍪</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)', marginBottom: 2 }}>
          Cookies on Grabitt
        </div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#6b5d48', lineHeight: 1.5 }}>
          We only use cookies that are strictly necessary to run the site — keeping you signed in and holding your basket.
          We don&apos;t use advertising or tracking cookies. See our{' '}
          <Link href="/privacy" style={{ color: 'var(--orange)', fontWeight: 700 }}>Privacy Policy</Link>.
        </div>
      </div>
      <button
        onClick={dismiss}
        style={{
          background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50,
          padding: '10px 20px', fontFamily: 'var(--font-nunito)', fontSize: 12.5,
          fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Got it
      </button>
    </div>
  )
}
