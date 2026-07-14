'use client'
import { useEffect, useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'
import ParallaxHeader from './ParallaxHeader'
import CategoryGrid from './CategoryGrid'
import FeaturedStrip from './FeaturedStrip'
import BannerSlot from './BannerSlot'
import ListingsGrid from './ListingsGrid'
import BottomCarousel from './BottomCarousel'
import TrustStrip from './TrustStrip'
import SeasonalBanner from './SeasonalBanner'
import { RecommendedStrip, RecentlyViewedStrip } from './PersonalStrips'
import CommunityStrip from './CommunityStrip'

// Homepage body rendered from the admin-controlled layout (Admin → Homepage).
// The registry maps a section key to its component; order + visibility come
// from homepage.layout. Falls back to the default order if the fetch fails.
const REGISTRY: Record<string, React.ReactNode> = {
  hero_banner: <ParallaxHeader />,
  departments: <CategoryGrid />,
  recommended: <RecommendedStrip />,
  recently_viewed: <RecentlyViewedStrip />,
  seasonal_banner: <SeasonalBanner />,
  featured: <FeaturedStrip />,
  mid_banner: <BannerSlot position="home_mid" />,
  listings: <ListingsGrid />,
  just_listed: <BottomCarousel />,
  community: <CommunityStrip />,
  trust: <TrustStrip />,
}

// Mirrors the v3 homepage template's flow: hero → quick actions → featured →
// departments → discovery strips → mid banner → just listed → guides → trust.
const DEFAULT_ORDER = ['hero_banner', 'featured', 'departments', 'recommended', 'recently_viewed', 'seasonal_banner', 'mid_banner', 'listings', 'just_listed', 'community', 'trust']

export default function HomeSections() {
  // Start empty so no section renders until the admin layout resolves — this
  // avoids flashing default sections (e.g. a disabled hero banner) on load.
  // Only fall back to the default order if the layout fetch actually fails.
  const [keys, setKeys] = useState<string[] | null>(null)

  useEffect(() => {
    createTrpcClient().homepage.layout.query()
      .then(rows => {
        const list = rows as { key: string; enabled: boolean }[]
        // No layout configured yet → default order; otherwise honour the
        // admin's enabled set exactly (including "everything disabled").
        if (!list.length) { setKeys(DEFAULT_ORDER); return }
        setKeys(list.filter(r => r.enabled && REGISTRY[r.key]).map(r => r.key))
      })
      .catch(() => setKeys(DEFAULT_ORDER))
  }, [])

  if (!keys) return null
  return <>{keys.map(k => (REGISTRY[k] ? <div key={k}>{REGISTRY[k]}</div> : null))}</>
}
