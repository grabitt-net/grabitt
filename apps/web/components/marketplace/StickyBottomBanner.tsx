'use client'
import { useEffect, useRef, useState } from 'react'
import { createLooseTrpcClient } from '@/lib/trpc'

type Banner = { id: string; title: string; imageUrl: string; linkUrl: string | null }

// Site-wide sticky bottom advertising bar. Exclusive (one advertiser). Sits
// above the fold at the bottom of the viewport, dismissible per session so it
// never nags. Renders nothing when there's no active banner (and, unlike inline
// slots, shows no placeholder — a fixed placeholder would obscure the whole UI).
export default function StickyBottomBanner() {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [closed, setClosed] = useState(false)
  const seen = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('grabitt_sticky_closed') === '1') { setClosed(true); return }
    createLooseTrpcClient().banners.active.query({ position: 'sticky_bottom' })
      .then(d => { const list = d as unknown as Banner[]; if (list?.length) setBanner(list[0]) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (banner && !seen.current) { seen.current = true; createLooseTrpcClient().banners.trackImpression.mutate({ id: banner.id }).catch(() => {}) }
  }, [banner])

  if (!banner || closed) return null

  const onClick = async () => {
    try {
      const res = await createLooseTrpcClient().banners.trackClick.mutate({ id: banner.id }) as { url?: string | null }
      const url = res?.url ?? banner.linkUrl
      if (url) { if (url.startsWith('http')) window.open(url, '_blank', 'noopener'); else window.location.href = url }
    } catch { if (banner.linkUrl) window.location.href = banner.linkUrl }
  }
  const close = () => { setClosed(true); try { sessionStorage.setItem('grabitt_sticky_closed', '1') } catch {} }

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 1120, margin: '0 12px 12px', pointerEvents: 'auto' }}>
        <div onClick={banner.linkUrl ? onClick : undefined} role={banner.linkUrl ? 'link' : undefined} tabIndex={banner.linkUrl ? 0 : undefined}
          style={{ cursor: banner.linkUrl ? 'pointer' : 'default', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.22)', aspectRatio: '9 / 1', background: '#f5f0e8' }}>
          <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <button onClick={close} aria-label="Dismiss" style={{ position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#1a1a1a', color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>×</button>
      </div>
    </div>
  )
}
