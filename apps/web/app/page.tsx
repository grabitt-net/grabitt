import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import HomeSections from '@/components/marketplace/HomeSections'
import { RecentlyViewedStrip } from '@/components/marketplace/PersonalStrips'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'

// The homepage body (hero, departments, featured, banners, listings, etc.) is
// rendered by <HomeSections/> from the admin-controlled layout (Admin → Homepage),
// so admins can toggle and reorder sections. Topbar and Footer are fixed chrome.
export default function HomePage() {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar />
        <RecentlyViewedStrip />
        <HomeSections />
        <Footer />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
