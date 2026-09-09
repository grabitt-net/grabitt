'use client'
import { useEffect, useState } from 'react'
import { createLooseTrpcClient } from '@/lib/trpc'

// Standalone admin-set page header banner for footer pages that don't use the
// InfoPage shell (Terms, Business Directory, Advertise, etc.). Fetches the wide
// hero banner for `dept` from Categories → Page hero banners and renders it in
// the same full-width style as the category/InfoPage banners. Renders nothing
// until an image is set, so pages without a banner are unaffected.
export default function PageHeroBanner({ dept, alt, maxWidth = 1000 }: { dept: string; alt?: string; maxWidth?: number }) {
  const [banner, setBanner] = useState<string | null>(null)
  useEffect(() => {
    createLooseTrpcClient().homepage.categoryHeader.query({ department: dept })
      .then(h => setBanner((h as { heroBanner?: string | null } | null)?.heroBanner ?? null))
      .catch(() => {})
  }, [dept])

  if (!banner) return null
  return (
    <div style={{ maxWidth, margin: '14px auto 6px', padding: '0 18px', width: '100%', boxSizing: 'border-box' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner} alt={alt || ''} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 16 }} />
    </div>
  )
}
