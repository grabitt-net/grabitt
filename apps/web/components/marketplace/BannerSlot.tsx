'use client'
import { useEffect, useRef, useState } from 'react'
import { createLooseTrpcClient } from '@/lib/trpc'

type Banner = { id: string; title: string; imageUrl: string; linkUrl: string | null }
type Position =
  | 'home_top' | 'home_mid' | 'home_hero' | 'category' | 'category_top' | 'category_infeed' | 'category_footer'
  | 'search_top' | 'search_footer' | 'sticky_bottom' | 'similar_items' | 'seller_dashboard' | 'user_dashboard'
  | 'checkout' | 'jobs' | 'sponsor_top' | 'sponsor_footer' | 'messages' | 'notifications'

// CMS-driven banner slot. Renders the active banners for a given position
// (managed from the admin Banners view). Rotates if more than one. Every view
// and click is tracked so sponsorship performance is quantifiable. Renders
// nothing when there are no active banners — UNLESS admin preview/test mode is
// on, in which case an empty slot shows a labelled placeholder so admins can see
// where every banner sits before launch.
export default function BannerSlot({ position, page, aspect = '3.4 / 1', radius = 16, padded = true, label }: { position: Position; page?: string; aspect?: string; radius?: number; padded?: boolean; label?: string }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [preview, setPreview] = useState(false)
  const [idx, setIdx] = useState(0)
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    const c = createLooseTrpcClient()
    c.banners.active.query({ position, ...(page ? { page } : {}) }).then(d => setBanners(d as unknown as Banner[])).catch(() => {})
    c.banners.previewMode.query().then(d => setPreview(!!(d as { on?: boolean })?.on)).catch(() => {})
  }, [position, page])

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  // Empty + preview mode → labelled placeholder marking the slot.
  if (banners.length === 0) {
    if (!preview) return null
    return (
      <div style={{ padding: padded ? '14px 14px 0' : 0 }}>
        <div style={{ width: '100%', aspectRatio: aspect, borderRadius: radius, border: '2px dashed #FF7A00', background: 'repeating-linear-gradient(45deg,#fff7ed,#fff7ed 12px,#ffedd5 12px,#ffedd5 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.6 }}>Banner slot</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: '#9a3412' }}>{label ?? position}{page ? ` · ${page}` : ''}</span>
        </div>
      </div>
    )
  }

  const b = banners[idx % banners.length]

  // Count one impression per banner shown (fire-and-forget).
  if (b && !seen.current.has(b.id)) {
    seen.current.add(b.id)
    createLooseTrpcClient().banners.trackImpression.mutate({ id: b.id }).catch(() => {})
  }

  // Record the click, then send the visitor to the advertiser's link (storefront).
  const onClick = async () => {
    try {
      const res = await createLooseTrpcClient().banners.trackClick.mutate({ id: b.id }) as { url?: string | null }
      const url = res?.url ?? b.linkUrl
      if (url) { if (url.startsWith('http')) window.open(url, '_blank', 'noopener'); else window.location.href = url }
    } catch { if (b.linkUrl) window.location.href = b.linkUrl }
  }

  const inner = (
    <div style={{ position: 'relative', width: '100%', aspectRatio: aspect, borderRadius: radius, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: '#f5f0e8' }}>
      <img src={b.imageUrl} alt={b.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {banners.length > 1 && (
        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {banners.map((_, i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === (idx % banners.length) ? '#fff' : 'rgba(255,255,255,0.5)' }} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding: padded ? '14px 14px 0' : 0 }}>
      {b.linkUrl
        ? <div role="link" tabIndex={0} onClick={onClick} onKeyDown={e => { if (e.key === 'Enter') onClick() }} style={{ cursor: 'pointer', display: 'block' }}>{inner}</div>
        : inner}
    </div>
  )
}
