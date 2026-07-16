'use client'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'
import EmployerDashboardContent from '@/components/marketplace/EmployerDashboardContent'

// Employer Dashboard as a full page (previously a modal panel) with the standard
// header/footer, matching the rest of the site.
export default function EmployersPage() {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar />
        <QuickActions />
        <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>🏢 Employer Dashboard</span>
            <Link href="/jobs/new" style={{ marginLeft: 'auto', textDecoration: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>+ Post a Job</Link>
          </div>
        </header>

        <EmployerDashboardContent />

        <Footer />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
