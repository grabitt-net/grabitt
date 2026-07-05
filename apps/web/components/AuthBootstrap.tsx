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
        // Signed out — clear identity + app JWT and refresh the chrome if set.
        setAuthToken(null)
        if (localStorage.getItem('grabitt_uid')) {
          localStorage.removeItem('grabitt_uid')
          location.reload()
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
        const uid = res?.user?.id
        // Mint the app JWT now that the Prisma profile exists, so protected
        // tRPC calls (notifications etc.) work immediately after this load.
        await refreshAuthToken()
        if (cancelled) return
        if (uid && localStorage.getItem('grabitt_uid') !== uid) {
          localStorage.setItem('grabitt_uid', uid)
          // Chrome (IconRail/DesktopNav/PanelHost) reads grabitt_uid on mount,
          // so reload once to reflect the freshly-established identity.
          location.reload()
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
