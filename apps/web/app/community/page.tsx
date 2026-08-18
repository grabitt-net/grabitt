'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createLooseTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken } from '@/lib/authToken'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import EconomicLiving from '@/components/marketplace/EconomicLiving'

type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null }

export default function CommunityIndexPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [authed, setAuthed] = useState(false)

  // Grabitt Guides is member-only — send signed-out visitors to sign in first.
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.replace('/auth?next=/community'); return }
      setAuthed(true)
      createLooseTrpcClient().community.list.query({ limit: 30 }).then(p => setPosts(p as Post[])).catch(() => {})
    })()
  }, [router])

  if (!authed) return <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#888' }}>Loading…</main>

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Grabitt Guides" />
      <QuickActions />

      <header style={{ background: 'var(--sand)', padding: '14px', borderBottom: '1.5px solid var(--sand2)' }}>
        <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 22, fontWeight: 900, color: 'var(--dark)', margin: '0 0 4px' }}>📰 Grabitt Guides</h1>
        <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#1a1a1a', margin: 0 }}>Island tips, selling advice and the Canary Islands second-hand economy.</p>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 14px 40px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {posts.map(p => (
            <Link key={p.id} href={`/community/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
                <div style={{ height: 120, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48 }}>{p.emoji}</span>}
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{p.category}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#1a1a1a', lineHeight: 1.5 }}>{p.excerpt}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <EconomicLiving />
      </div>

      <Footer />
      <CartFab />
      <PanelHost />
    </main>
    </PanelProvider>
  )
}
