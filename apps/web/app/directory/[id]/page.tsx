'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import Place from '@/components/marketplace/Place'
import { createLooseTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

type Listing = { id: string; name: string; category: string | null; description: string | null; phone: string | null; email: string | null; website: string | null; logoUrl: string | null; location: string | null; claimable?: boolean }

export default function DirectoryListingPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')
  const [listing, setListing] = useState<Listing | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'unavailable'>('loading')
  const [claiming, setClaiming] = useState(false)
  const [claimErr, setClaimErr] = useState('')

  useEffect(() => {
    if (!id) return
    createLooseTrpcClient().directory.get.query({ id })
      .then(d => { setListing(d as unknown as Listing); setState('ok') })
      .catch(() => setState('unavailable'))
  }, [id])

  const claim = async () => {
    setClaimErr(''); setClaiming(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      // Not signed in — send them to register/sign in, then back here to claim.
      if (!token) { router.push(`/auth?next=${encodeURIComponent(`/directory/${id}`)}`); return }
      await trpcAuthed().directory.claim.mutate({ listingId: id })
      // Claimed — off to the Advertiser Centre to manage it and pick a plan.
      router.push('/advertiser?claimed=1')
    } catch (e: any) {
      setClaimErr(e?.message ?? 'Could not claim this listing.'); setClaiming(false)
    }
  }

  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 60, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar title="Business Directory" back backFallback="/directory" />
        <QuickActions />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 14px' }}>
          <Link href="/directory" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#1a1a1a', textDecoration: 'none' }}>Directory</Link>

          {state === 'loading' && <div style={{ padding: 50, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#1a1a1a' }}>Loading…</div>}
          {state === 'unavailable' && (
            <div style={{ padding: 50, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#aaa' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🚫</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>This listing isn’t currently live</div>
            </div>
          )}
          {state === 'ok' && listing && (
            <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, overflow: 'hidden', marginTop: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 150, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {listing.logoUrl ? <img src={listing.logoUrl} alt={listing.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 54 }}>🏢</span>}
              </div>
              <div style={{ padding: 18 }}>
                {listing.category && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{listing.category}</div>}
                <h1 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, color: 'var(--dark)', margin: '4px 0' }}>{listing.name}</h1>
                {listing.location && <Place style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'var(--ink-2)', marginBottom: 10 }}>{listing.location}</Place>}
                {listing.description && <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, color: '#1a1a1a', lineHeight: 1.7, marginBottom: 14 }}>{listing.description}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {listing.phone && <Contact icon="📞" text={listing.phone} href={`tel:${listing.phone}`} />}
                  {listing.email && <Contact icon="✉️" text={listing.email} href={`mailto:${listing.email}`} />}
                  {listing.website && <Contact icon="🌐" text={listing.website.replace(/^https?:\/\//, '')} href={listing.website} external />}
                </div>

                {/* Unclaimed (admin-seeded) listing — the business owner can claim it. */}
                {listing.claimable && (
                  <div style={{ marginTop: 16, background: '#FFF8F4', border: '1px solid #FFD4C0', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Is this your business?</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#555', lineHeight: 1.6, marginBottom: 10 }}>Claim this listing to manage it yourself. You&apos;ll get <strong>1 month free</strong>, then choose a subscription to keep it live.</div>
                    {claimErr && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>{claimErr}</div>}
                    <button onClick={claim} disabled={claiming} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2,#ff8a3d))', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: claiming ? 'wait' : 'pointer' }}>{claiming ? 'Claiming…' : '✋ Claim this listing'}</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Footer />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}

function Contact({ icon, text, href, external }: { icon: string; text: string; href: string; external?: boolean }) {
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener' } : {})} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', background: '#f9f6f2', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 800, color: 'var(--dark)' }}>
      <span>{icon}</span><span style={{ color: 'var(--orange)' }}>{text}</span>
    </a>
  )
}
