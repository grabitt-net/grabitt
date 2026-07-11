'use client'
import { useEffect, useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'
import ParallaxHeader from './ParallaxHeader'
import Hero from './Hero'
import CategoryGrid from './CategoryGrid'
import FeaturedStrip from './FeaturedStrip'
import BannerSlot from './BannerSlot'
import ListingsGrid from './ListingsGrid'
import BottomCarousel from './BottomCarousel'
import TrustStrip from './TrustStrip'
import SeasonalBanner from './SeasonalBanner'
import { RecommendedStrip } from './PersonalStrips'

// Homepage body rendered from the admin-controlled layout (Admin → Homepage).
// The registry maps a section key to its component; order + visibility come
// from homepage.layout. Falls back to the default order if the fetch fails.
const REGISTRY: Record<string, React.ReactNode> = {
  hero_banner: <ParallaxHeader />,
  quick_actions: <Hero />,
  departments: <CategoryGrid />,
  recommended: <RecommendedStrip />,
  seasonal_banner: <SeasonalBanner />,
  featured: <FeaturedStrip />,
  mid_banner: <BannerSlot position="home_mid" />,
  listings: <ListingsGrid />,
  just_listed: <BottomCarousel />,
  trust: <TrustStrip />,
}

const DEFAULT_ORDER = ['hero_banner', 'quick_actions', 'departments', 'recommended', 'seasonal_banner', 'featured', 'mid_banner', 'listings', 'just_listed', 'trust']

export default function HomeSections() {
  const [keys, setKeys] = useState<string[]>(DEFAULT_ORDER)

  useEffect(() => {
    createTrpcClient().homepage.layout.query()
      .then(rows => {
        const enabled = (rows as { key: string; enabled: boolean }[])
          .filter(r => r.enabled && REGISTRY[r.key])
          .map(r => r.key)
        if (enabled.length) setKeys(enabled)
      })
      .catch(() => { /* keep default order */ })
  }, [])

  return <>{keys.map(k => (REGISTRY[k] ? <div key={k}>{REGISTRY[k]}</div> : null))}</>
}
