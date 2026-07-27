'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelProvider } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'

// Recruitment hub — the single entry point that replaces the old Find Work +
// Find Staff pills. Job seekers browse jobs; employers post a job, but posting
// is a Business feature, so non-business visitors are sent to /employers (the
// "For Business" page) to upgrade first.
export default function RecruitmentPage() {
  return <PanelProvider><Inner /></PanelProvider>
}

function Inner() {
  const router = useRouter()
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { if (live) setIsBusiness(false); return }
      try {
        const me = await (trpcAuthed() as any).users.me.query()
        if (live) setIsBusiness(!!me?.isBusiness)
      } catch { if (live) setIsBusiness(false) }
    })()
    return () => { live = false }
  }, [])

  // Business users post directly; everyone else is routed to the For Business
  // page to open a business account first.
  const postAJob = () => router.push(isBusiness ? '/jobs/new' : '/employers')

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Recruitment" />
      <QuickActions />

      <div style={{ padding: '18px 16px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 26, fontWeight: 900, color: 'var(--dark)', margin: 0 }}>Recruitment</h1>
          <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13.5, color: '#666', lineHeight: 1.6, margin: '8px 0 0' }}>
            Connecting employers with workers across every industry.
          </p>
        </div>

        <div style={{ height: 1, background: '#e9e0d4', margin: '4px 0 22px' }} />

        <div style={{ display: 'grid', gap: 14 }}>
          {/* Seeker */}
          <div style={card}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🙋</div>
            <div style={cardTitle}>I am looking for work</div>
            <p style={cardText}>Browse jobs across Gran Canaria and apply in a couple of taps — free.</p>
            <button onClick={() => router.push('/jobs')} style={primaryBtn}>Browse Jobs</button>
          </div>

          {/* Employer */}
          <div style={card}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🏢</div>
            <div style={cardTitle}>I am hiring staff</div>
            <p style={cardText}>Post a role and reach local candidates. Posting jobs is a Business feature.</p>
            <button onClick={postAJob} disabled={isBusiness === null} style={{ ...primaryBtn, opacity: isBusiness === null ? 0.6 : 1 }}>
              Post a Job
            </button>
            {isBusiness === false && (
              <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#9a6a30', marginTop: 8 }}>
                Business account required — we’ll help you set one up.
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <PanelHost />
    </main>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 20, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }
const cardTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', marginBottom: 6 }
const cardText: React.CSSProperties = { fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#666', lineHeight: 1.6, margin: '0 0 16px' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 28px', fontFamily: 'var(--font-nunito)', fontSize: 14.5, fontWeight: 900, cursor: 'pointer' }
