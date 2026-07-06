'use client'
import { useEffect, useRef, useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'

type Banner = { id: string; title: string; imageUrl: string; linkUrl: string | null }

// CMS-driven parallax hero header. Reads the active `home_top` banner (managed
// from Admin → Banners), so the header image, headline and link are all
// updatable from the backend. The background image scrolls slower than the
// page for a subtle parallax effect. Falls back to a branded gradient when no
// banner is set, so the page never looks empty.
export default function ParallaxHeader() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [idx, setIdx] = useState(0)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createTrpcClient().banners.active.query({ position: 'home_top' })
      .then(d => setBanners((d as unknown as Banner[]) ?? []))
      .catch(() => {})
  }, [])

  // Slider: rotate through the hero banners.
  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 6000)
    return () => clearInterval(t)
  }, [banners.length])

  const banner = banners.length ? banners[idx % banners.length] : null

  // Parallax: translate the background slower than scroll (transform only).
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      raf = requestAnimationFrame(() => {
        if (imgRef.current) imgRef.current.style.transform = `translate3d(0, ${window.scrollY * 0.35}px, 0)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const hasImg = !!banner?.imageUrl

  const inner = (
    <section className="parallax-header" style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'linear-gradient(135deg,#2a2118,#4a3826)' }}>
      {/* Background layer (image or gradient) — over-sized for parallax travel */}
      <div ref={imgRef} style={{ position: 'absolute', top: -60, left: 0, right: 0, bottom: -60, willChange: 'transform' }}>
        {hasImg && <img src={banner!.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {!hasImg && <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#FF4500 0%,#FF8C00 100%)' }} />}
      </div>
      {/* Legibility scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.30), rgba(0,0,0,0.55))' }} />
      {/* Content */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 22px 26px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', color: '#fff', fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700, lineHeight: 1.1, margin: 0, maxWidth: 640, textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
          {banner?.title || "Gran Canaria's local marketplace"}
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', color: 'rgba(255,255,255,0.92)', fontSize: 'clamp(13px, 1.6vw, 16px)', fontWeight: 600, margin: '8px 0 0', maxWidth: 560, textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          Buy &amp; sell locally — safely. Funds held in escrow until handover.
        </p>
      </div>
      {/* Slider dots */}
      {banners.length > 1 && (
        <div style={{ position: 'absolute', bottom: 12, right: 18, display: 'flex', gap: 6 }}>
          {banners.map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === (idx % banners.length) ? '#fff' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
      )}
    </section>
  )

  if (banner?.linkUrl) {
    return (
      <a href={banner.linkUrl} target={banner.linkUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </a>
    )
  }
  return inner
}
