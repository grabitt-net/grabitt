'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createLooseTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken } from '@/lib/authToken'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'

export default function CommunityPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [post, setPost] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  // Member-only, like the Guides index.
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.replace(`/auth?next=/community/${id}`); return }
      setAuthed(true)
      createLooseTrpcClient().community.byId.query({ id })
        .then((p: any) => { setPost(p); setState('ready') })
        .catch(() => setState('notfound'))
    })()
  }, [id, router])

  if (!authed) return <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', color: '#888' }}>Loading…</main>

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Grabitt Guides" back />
      <QuickActions />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '18px 16px 40px', width: '100%', boxSizing: 'border-box' }}>
        <Link href="/community" style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>Grabitt Guides</Link>
        {state === 'loading' && <div style={{ marginTop: 30, color: '#888', fontFamily: 'var(--font-comfortaa)' }}>Loading…</div>}
        {state === 'notfound' && <div style={{ marginTop: 30, color: '#888', fontFamily: 'var(--font-comfortaa)' }}>Article not found.</div>}
        {state === 'ready' && post && (
          <article style={{ marginTop: 16 }}>
            {post.imageUrl
              ? <img src={post.imageUrl} alt={post.title} style={{ width: '100%', borderRadius: 16, marginBottom: 18 }} />
              : <div style={{ height: 140, borderRadius: 16, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, marginBottom: 18 }}>{post.emoji}</div>}
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{post.category}</div>
            <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 28, fontWeight: 900, color: 'var(--dark)', lineHeight: 1.2, margin: '0 0 14px' }}>{post.title}</h1>
            <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 15, color: '#5a4d3a', lineHeight: 1.5, fontWeight: 700, marginBottom: 20 }}>{post.excerpt}</p>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 14.5, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{post.body}</div>
          </article>
        )}
      </div>
      <Footer />
      <CartFab />
      <PanelHost />
    </main>
    </PanelProvider>
  )
}
