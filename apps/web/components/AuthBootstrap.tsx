'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { createTrpcClient } from '@/lib/trpc'
import { refreshAuthToken, setAuthToken } from '@/lib/authToken'

// Bridges Supabase Auth → the app's Prisma profile + client identity.
//
// After ANY successful auth (email confirm, password login, or Google OAuth)
// the user has a Supabase session but no Prisma `user` row and no
// `grabitt_uid`. This provisions the profile (idempotent — grants the welcome
// bonus once) and stores the Prisma user id that the panel UI reads. Runs on
// every page load and on auth-state changes, so it self-heals for existing
// accounts too.
export default function AuthBootstrap() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function sync() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Signed out — clear identity + app JWT and notify the chrome.
        setAuthToken(null)
        if (localStorage.getItem('grabitt_uid')) {
          localStorage.removeItem('grabitt_uid')
          window.dispatchEvent(new Event('grabitt-auth'))
        }
        return
      }

      const displayName =
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        (user.user_metadata?.name as string | undefined)?.trim() ||
        user.email?.split('@')[0] ||
        'Grabitt user'

      try {
        const res = await createTrpcClient().auth.provisionProfile.mutate({
          supabaseId: user.id,
          email: user.email ?? '',
          displayName,
          locale: 'en',
        })
        if (cancelled) return
        // GDPR-erased account: block access — sign out, don't establish identity.
        if ((res?.user as { deletedAt?: string | null } | undefined)?.deletedAt) {
          setAuthToken(null)
          localStorage.removeItem('grabitt_uid')
          try { await supabase.auth.signOut() } catch { /* noop */ }
          window.dispatchEvent(new Event('grabitt-auth'))
          return
        }
        const uid = res?.user?.id
        // Mint the app JWT now that the Prisma profile exists, so protected
        // tRPC calls (notifications etc.) work immediately after this load.
        await refreshAuthToken()
        if (cancelled) return
        if (uid && localStorage.getItem('grabitt_uid') !== uid) {
          localStorage.setItem('grabitt_uid', uid)
          // Notify the chrome (IconRail/DesktopNav/PanelHost) to re-read the
          // identity reactively — no page reload (which caused a reload loop).
          window.dispatchEvent(new Event('grabitt-auth'))
        }
      } catch {
        // Non-fatal: the user is still authenticated at the Supabase layer.
      }
    }

    sync()
    const { data: sub } = supabase.auth.onAuthStateChange(() => { sync() })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])

  return null
}
