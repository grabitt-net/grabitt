'use client'
import { useEffect, useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'

type Slide = { id: string; heading: string | null; subheading: string | null; imageUrl: string; linkUrl: string | null }

// CMS-driven hero header. Reads the hero slides (managed from Admin → Homepage),
// so the header image, headline and link are all updatable from the backend.
// The image is fixed within the header (no parallax movement). Falls back to a
// branded gradient when no slide is set, so the page never looks empty.
export default function ParallaxHeader() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    createTrpcClient().homepage.heroSlides.query()
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
  const heading = slide ? (slide.heading ?? '') : "Gran Canaria's local marketplace"
  const subheading = slide ? (slide.subheading ?? '') : 'Buy & sell locally — safely. Funds held in escrow until handover.'
  const hasText = !!(heading || subheading)

  const inner = (
    <section className="parallax-header" style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'linear-gradient(135deg,#2a2118,#4a3826)' }}>
      {/* Background layer (image or gradient) — fixed within the header */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {hasImg && <img src={slide!.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        {!hasImg && <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#FF4500 0%,#FF8C00 100%)' }} />}
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

  if (slide?.linkUrl) {
    return (
      <a href={slide.linkUrl} target={slide.linkUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </a>
    )
  }
  return inner
}
