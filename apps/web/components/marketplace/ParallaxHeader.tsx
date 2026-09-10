'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createLooseTrpcClient } from '@/lib/trpc'
import { usePanel } from '@/context/PanelContext'
import { PARAM_TO_PANEL } from './PanelDeepLink'
import Icon from './Icon'

type Slide = { id: string; heading: string | null; subheading: string | null; imageUrl: string; linkUrl: string | null }

// If a slide's Link URL points at a known panel deep-link (e.g. "/?sell=1",
// "?sell=1" or just "sell"), return that panel id so clicking the slide opens
// the popup client-side instead of a full navigation. Admin-controlled.
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

// Homepage hero — a standard image carousel (replaces the old parallax header).
// Slides are managed in Admin → Homepage → Hero slides (image, optional heading/
// subheading and a link). Manual arrows + dots, auto-advances, and each slide is
// clickable through to its link (a panel deep-link opens that popup in place).
export default function CarouselHeader() {
  const { openPanel } = usePanel()
  const [slides, setSlides] = useState<Slide[]>([])
  const [idx, setIdx] = useState(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    createLooseTrpcClient().homepage.heroSlides.query()
      .then(d => setSlides((d as unknown as Slide[]) ?? []))
      .catch(() => {})
  }, [])

  const count = slides.length
  const go = useCallback((i: number) => setIdx(((i % count) + count) % count), [count])
  const next = useCallback(() => go(idx + 1), [go, idx])
  const prev = useCallback(() => go(idx - 1), [go, idx])

  // Auto-advance (pauses on hover / touch), only with more than one slide.
  useEffect(() => {
    if (count < 2) return
    const t = setInterval(() => { if (!pausedRef.current) setIdx(i => (i + 1) % count) }, 6000)
    return () => clearInterval(t)
  }, [count])

  const activate = (s: Slide) => {
    const panel = panelFromLink(s.linkUrl)
    if (panel) { openPanel(panel); return }
    if (s.linkUrl) {
      if (s.linkUrl.startsWith('http')) window.open(s.linkUrl, '_blank', 'noopener,noreferrer')
      else window.location.href = s.linkUrl
    }
  }

  if (count === 0) return null

  return (
    <section
      style={{ position: 'relative', width: '100%', margin: '0 0 4px' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      onTouchStart={() => { pausedRef.current = true }}
    >
      {/* Viewport */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', aspectRatio: '1053 / 320', background: 'linear-gradient(135deg,var(--orange) 0%,var(--orange2) 100%)' }}>
        {/* Track */}
        <div style={{ display: 'flex', height: '100%', transform: `translateX(-${idx * 100}%)`, transition: 'transform 0.5s ease' }}>
          {slides.map(s => {
            const clickable = !!(s.linkUrl && s.linkUrl.trim())
            const hasText = !!(s.heading || s.subheading)
            return (
              <div
                key={s.id}
                onClick={clickable ? () => activate(s) : undefined}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={clickable ? (e => { if (e.key === 'Enter' || e.key === ' ') activate(s) }) : undefined}
                style={{ position: 'relative', flexShrink: 0, width: '100%', height: '100%', cursor: clickable ? 'pointer' : 'default' }}
              >
                <img src={s.imageUrl} alt={s.heading ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {hasText && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />}
                {hasText && (
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 clamp(16px,4vw,48px) clamp(14px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {s.heading && <h2 style={{ fontFamily: 'var(--font-body)', color: '#fff', fontSize: 'clamp(20px, 3.6vw, 36px)', fontWeight: 800, lineHeight: 1.1, margin: 0, maxWidth: 640, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>{s.heading}</h2>}
                    {s.subheading && <p style={{ fontFamily: 'var(--font-ui)', color: 'rgba(255,255,255,0.94)', fontSize: 'clamp(12px, 1.6vw, 16px)', fontWeight: 600, margin: 0, maxWidth: 560, textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>{s.subheading}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Arrows */}
        {count > 1 && (
          <>
            <button aria-label="Previous slide" onClick={prev} style={arrow('left')}><Icon name="arrowLeft" size={20} /></button>
            <button aria-label="Next slide" onClick={next} style={arrow('right')}><Icon name="arrowRight" size={20} /></button>
          </>
        )}

        {/* Dots */}
        {count > 1 && (
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 7 }}>
            {slides.map((_, i) => (
              <button key={i} aria-label={`Go to slide ${i + 1}`} onClick={() => go(i)}
                style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 50, border: 'none', padding: 0, cursor: 'pointer', background: i === idx ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'width 0.3s ease' }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const arrow = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 10,
  width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.85)', color: 'var(--dark)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', zIndex: 2,
})
