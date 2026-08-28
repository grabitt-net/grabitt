'use client'
import type { ReactNode } from 'react'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from './Topbar'
import QuickActions from './QuickActions'
import Footer from './Footer'
import CartFab from './CartFab'
import PanelHost from './PanelHostLazy'

// ── Shared footer-page template ──────────────────────────────────────────────
// One standard, clean "story page" layout for every footer link page (About Us,
// Why Us?, Pricing, Contact, and the rest as they are written). Modelled on the
// Pip's Snacks about-page approach Steve referenced: logo at the top, a large
// prominent title, a full-width hero band, alternating content bands down the
// page, short punchy sub-headings, a row of highlight "pills", and generous
// white space. Each page drops its own title, pills and bands into this shell so
// every page inherits the same format automatically.

export function Pills({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', margin: '4px auto 8px', maxWidth: 820 }}>
      {items.map(p => (
        <span key={p} style={{
          fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)',
          background: '#fff', border: '1.5px solid var(--orange)', borderRadius: 999,
          padding: '7px 14px', whiteSpace: 'nowrap',
        }}>{p}</span>
      ))}
    </div>
  )
}

// One alternating content band. Provide `image` (a URL) to show a visual beside
// the text; without one, the band renders as a clean full-width text section on
// a tint that alternates with its neighbours so the page never reads as a wall
// of text. `reverse` flips the text/image order for the zig-zag rhythm.
export function Band({ heading, children, image, imageAlt, reverse, tint }: {
  heading?: string
  children?: ReactNode
  image?: string
  imageAlt?: string
  reverse?: boolean
  tint?: boolean
}) {
  const text = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {heading && <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(19px, 2.4vw, 26px)', fontWeight: 900, color: 'var(--dark)', margin: '0 0 12px' }}>{heading}</h2>}
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.7, color: '#2a2a2a' }}>{children}</div>
    </div>
  )
  const visual = image ? (
    <div style={{ flex: 1, minWidth: 0 }}>
      <img src={image} alt={imageAlt || ''} style={{ width: '100%', borderRadius: 16, display: 'block', objectFit: 'cover', maxHeight: 340 }} />
    </div>
  ) : null

  return (
    <section style={{ background: tint ? 'var(--sand)' : 'transparent', borderRadius: 20, padding: image ? 'clamp(18px, 3vw, 30px)' : 'clamp(16px, 2.6vw, 26px)', margin: '14px 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(18px, 3vw, 36px)', alignItems: 'center', flexDirection: reverse ? 'row-reverse' : 'row' }}>
        {text}
        {visual}
      </div>
    </section>
  )
}

export default function InfoPage({ title, intro, pills, hero, topbarTitle, children }: {
  title: string
  intro?: ReactNode
  pills?: string[]
  hero?: string        // optional hero image/video-poster URL
  topbarTitle?: string
  children: ReactNode
}) {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar title={topbarTitle || title} back backFallback="/" />
        <QuickActions />

        {/* Hero header — the orange banner is the background for the page title,
            subheading and pills, all centred on it. A real hero image (when
            supplied) sits behind a scrim for readability. */}
        <div style={{ maxWidth: 1000, margin: '18px auto 6px', padding: '0 18px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 20,
            background: hero ? '#1a1a1a' : 'linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%)',
            padding: 'clamp(14px, 2.5vw, 26px) clamp(18px, 4vw, 40px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            boxShadow: '0 8px 26px rgba(245,84,10,0.18)',
          }}>
            {hero && <img src={hero} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />}
            {!hero && <>
              <div aria-hidden style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, background: 'rgba(255,255,255,0.10)', borderRadius: '50%' }} />
              <div aria-hidden style={{ position: 'absolute', left: -20, bottom: -40, width: 160, height: 160, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
            </>}
            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
              <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, color: '#fff', lineHeight: 1.12, margin: '0 auto', maxWidth: 820, textShadow: hero ? '0 2px 12px rgba(0,0,0,0.5)' : 'none' }}>{title}</h1>
              {intro && (
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.5, color: 'rgba(255,255,255,0.95)', maxWidth: 700, margin: '7px auto 0', textShadow: hero ? '0 1px 8px rgba(0,0,0,0.5)' : 'none' }}>{intro}</div>
              )}
              {pills && pills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '16px auto 0', maxWidth: 780 }}>
                  {pills.map(p => (
                    <span key={p} style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.45)', borderRadius: 999, padding: '7px 14px', whiteSpace: 'nowrap' }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content bands */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 18px 44px', width: '100%', boxSizing: 'border-box' }}>
          {children}
        </div>

        <Footer />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
