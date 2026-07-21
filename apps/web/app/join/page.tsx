'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Landing target for referral links (/join?ref=CODE). Stashes the code so
// AuthBootstrap can attach it when the Prisma profile is first provisioned,
// then sends the visitor to the home page to sign up / browse.
function JoinInner() {
  const router = useRouter()
  const params = useSearchParams()
  useEffect(() => {
    const ref = params.get('ref')
    if (ref) {
      try { localStorage.setItem('grabitt_ref', ref.trim().toUpperCase()) } catch { /* private mode */ }
    }
    router.replace('/')
  }, [params, router])
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui, sans-serif)', color: '#8a7d68' }}>
      Welcome to Grabitt — taking you in…
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  )
}
