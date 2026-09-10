'use client'
import { useEffect, useState } from 'react'
import { createLooseTrpcClient } from '@/lib/trpc'
import { usePanel } from '@/context/PanelContext'
import { PARAM_TO_PANEL } from './PanelDeepLink'

type Slide = { id: string; heading: string | null; subheading: string | null; imageUrl: string; linkUrl: string | null }

// If a slide's Link URL points at a known panel deep-link (e.g. "/?sell=1",
// "?sell=1" or just "sell"), return that panel id so clicking the banner opens
// the popup client-side instead of doing a full navigation. Admin-controlled —
// nothing about which banner is hardcoded here.
function panelFromLink(linkUrl: string | null | undefined) {
  if (!linkUrl) return null
  const raw = linkUrl.trim()
  const bare = raw.replace(/^[/?#]+/, '').toLowerCase()
  if (PARAM_TO_PANEL[bare]) return PARAM_TO_PANEL[bare]
  const qs = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : ''
  if (qs) {
    const params = new URLSearchParams(qs)
    for (const key of Object.keys(PARAM_TO_PANEL)) if (params.has(key)) return PARAM_TO_PANEL[key]
  }
  return null
}

// CMS-driven hero header. Reads the hero slides (managed from Admin → Homepage),
// so the header image, headline and link are all updatable from the backend.
// The image is fixed within the header (no parallax movement). Falls back to a
// branded gradient when no slide is set, so the page never looks empty.
export default function ParallaxHeader() {
  const { openPanel } = usePanel()
  const [slides, setSlides] = useState<Slide[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    createLooseTrpcClient().homepage.heroSlides.query()
      .then(d => setSlides((d as unknown as Slide[]) ?? []))
      .catch(() => {})
  }, [])

  // Slider: rotate through the hero slides.
  useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [slides.length])

  const slide = slides.length ? slides[idx % slides.length] : null

  const hasImg = !!slide?.imageUrl
  // With no CMS slides at all, show the branded default copy. Once slides exist,
  // respect each slide exactly — an image-only slide (no heading) shows no text.
  const heading = slide ? (slide.heading ?? '') : "The Canary Islands' local marketplace"
  const subheading = slide ? (slide.subheading ?? '') : 'Buy & sell locally — safely. Funds held in escrow until handover.'
  const hasText = !!(heading || subheading)

  const inner = (
    <section className="parallax-header" style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'linear-gradient(135deg,var(--orange) 0%,var(--orange2) 100%)' }}>
      {/* Background layer (image over the branded gradient). The gradient shows
          while slides load, so the hero never flashes a black/dark screen — it
          looks like a full branded slide until the image paints over it. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {hasImg && <img src={slide!.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      {/* Legibility scrim — only when there's text to keep readable */}
      {hasText && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.30), rgba(0,0,0,0.55))' }} />}
      {/* Content */}
      {hasText && (
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 22px 26px' }}>
          {heading && (
            <h1 style={{ fontFamily: 'var(--font-body)', color: '#fff', fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700, lineHeight: 1.1, margin: 0, maxWidth: 640, textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              {heading}
            </h1>
          )}
          {subheading && (
            <p style={{ fontFamily: 'var(--font-ui)', color: 'rgba(255,255,255,0.92)', fontSize: 'clamp(13px, 1.6vw, 16px)', fontWeight: 600, margin: heading ? '8px 0 0' : 0, maxWidth: 560, textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              {subheading}
            </p>
          )}
        </div>
      )}
      {/* Slider dots */}
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 12, right: 18, display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === (idx % slides.length) ? '#fff' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
      )}
    </section>
  )

  // A link that maps to a panel (e.g. "/?sell=1") opens the popup in-place.
  const linkPanel = panelFromLink(slide?.linkUrl)
  if (linkPanel) {
    return (
      <div role="button" tabIndex={0} onClick={() => openPanel(linkPanel)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openPanel(linkPanel) }} style={{ cursor: 'pointer', display: 'block' }}>
        {inner}
      </div>
    )
  }

  if (slide?.linkUrl) {
    return (
      <a href={slide.linkUrl} target={slide.linkUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </a>
    )
  }
  return inner
}
