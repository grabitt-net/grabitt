'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createLooseTrpcClient } from '@/lib/trpc'
import { bannerPageKey } from '@/lib/bannerPages'
import { BANNER_SLOTS } from '@grabitt/design-tokens'

// The exact slot name shown in Admin → Banners → Slots & pricing, so the
// preview placeholder is identifiable and you can find its row to toggle on/off.
const slotLabel = (position: string): string =>
  (BANNER_SLOTS as Record<string, { label?: string }>)[position]?.label ?? position

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
// Every banner slot scales responsively (width:100% + aspect-ratio + cover), so
// an advertiser only needs ONE image per slot at the slot's aspect ratio — no
// separate mobile/desktop versions. We recommend a source ~2000px wide so it
// stays crisp on the widest (desktop) layout at retina density; height follows
// the slot's aspect. This turns an aspect string like "5 / 1" into that advice.
// The aspect ratio each slot renders at (mirrors the `aspect` prop passed at
// every usage site). Central so the admin editor can show advertisers the exact
// recommended image size per placement.
export const BANNER_ASPECTS: Record<string, string> = {
  home_top: '5 / 1', home_mid: '3.4 / 1', home_hero: '3.4 / 1',
  category: '5 / 1', category_top: '5 / 1', category_infeed: '7 / 1', category_footer: '6 / 1',
  search_top: '5 / 1', search_footer: '6 / 1', sticky_bottom: '6 / 1',
  similar_items: '5 / 1', seller_dashboard: '6 / 1', user_dashboard: '6 / 1',
  checkout: '6 / 1', jobs: '5 / 1', sponsor_top: '4.5 / 1', sponsor_footer: '4.5 / 1',
  messages: '6 / 1', notifications: '5 / 1',
}

const REC_WIDTH = 2000
export function recommendedSize(aspect: string): { w: number; h: number; label: string } {
  const [wR, hR] = aspect.split('/').map(s => parseFloat(s.trim()))
  const ratio = wR && hR ? wR / hR : 3.4
  const h = Math.round(REC_WIDTH / ratio)
  return { w: REC_WIDTH, h, label: `${REC_WIDTH} × ${h} px` }
}

export default function BannerSlot({ position, page, aspect = '3.4 / 1', radius = 16, padded = true, label }: { position: Position; page?: string; aspect?: string; radius?: number; padded?: boolean; label?: string }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [preview, setPreview] = useState(false)
  // Whether this slot is switched on for the current page (admin On/Off + pages).
  const [slotOn, setSlotOn] = useState(true)
  const [idx, setIdx] = useState(0)
  const seen = useRef<Set<string>>(new Set())
  const pathname = usePathname()
  // Every slot now reports the page it's on, so per-page targeting (Banner.pages)
  // works for ALL placements — not just the site-wide sponsor rails. An explicit
  // `page` prop (category slug) still wins.
  const effectivePage = page ?? bannerPageKey(pathname)

  useEffect(() => {
    const c = createLooseTrpcClient()
    c.banners.active.query({ position, page: effectivePage }).then(d => setBanners(d as unknown as Banner[])).catch(() => {})
    c.banners.previewMode.query().then(d => setPreview(!!(d as { on?: boolean })?.on)).catch(() => {})
    c.banners.slotActive.query({ position, page: effectivePage }).then(d => setSlotOn(d !== false)).catch(() => {})
  }, [position, effectivePage])

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  // Empty + preview mode → labelled placeholder marking the slot.
  if (banners.length === 0) {
    // Preview shows a placeholder only for slots that are actually switched on
    // for this page, so preview mirrors exactly what's live here.
    if (!preview || !slotOn) return null
    return (
      <div style={{ padding: padded ? '14px 14px 0' : 0 }}>
        <div style={{ width: '100%', aspectRatio: aspect, borderRadius: radius, border: '2px dashed var(--orange2)', background: 'repeating-linear-gradient(45deg,#fff7ed,#fff7ed 12px,#ffedd5 12px,#ffedd5 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center', padding: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.6 }}>Banner slot</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#9a3412' }}>{slotLabel(position)}{page ? ` · ${page}` : ''}</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: '#b45309' }}>Admin → Banners → Slots &amp; pricing · id: {position}</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: '#c2410c' }}>{recommendedSize(aspect).label} · {aspect.replace(/\s/g, '')}</span>
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
