import Topbar from '@/components/marketplace/Topbar'
import Hero from '@/components/marketplace/Hero'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import ListingsRow from '@/components/marketplace/ListingsRow'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomNav from '@/components/marketplace/BottomNav'

export default function HomePage() {
  return (
    <main style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 90 }}>
      <Topbar />
      <Hero />
      <CategoryGrid />
      <ListingsRow title="Featured" seeAllHref="/listings" />
      <ListingsRow title="Near You" seeAllHref="/listings?sort=nearby" />
      <TrustStrip />
      <BottomNav />
    </main>
  )
}
