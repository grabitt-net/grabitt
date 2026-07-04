'use client'
import { useEffect, useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'

type Banner = { id: string; title: string; imageUrl: string; linkUrl: string | null }
type Position = 'home_top' | 'home_mid' | 'category' | 'checkout'

// CMS-driven banner slot. Renders the active banners for a given position
// (managed from the admin Banners view). Rotates if more than one. Renders
// nothing when there are no active banners, so the layout stays clean.
export default function BannerSlot({ position, aspect = '3.4 / 1', radius = 16 }: { position: Position; aspect?: string; radius?: number }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    createTrpcClient().banners.active.query({ position })
      .then(d => setBanners(d as unknown as Banner[]))
      .catch(() => {})
  }, [position])

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  if (banners.length === 0) return null
  const b = banners[idx % banners.length]

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
    <div style={{ padding: '14px 14px 0' }}>
      {b.linkUrl
        ? <a href={b.linkUrl} target={b.linkUrl.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>
        : inner}
    </div>
  )
}
