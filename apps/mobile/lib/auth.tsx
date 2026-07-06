import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { apiClient, API_URL } from './trpc'

type Ctx = {
  user: User | null
  token: string | null        // consumer app JWT for protected tRPC calls
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirm?: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<Ctx>({
  user: null, token: null, loading: true,
  signIn: async () => ({}), signUp: async () => ({}), signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // After any Supabase session change: provision the Prisma profile + mint the
  // app JWT (mobile sends the Supabase access token as a Bearer header).
  const bootstrap = useCallback(async (session: Session | null) => {
    if (!session?.user) { setUser(null); setToken(null); return }
    setUser(session.user)
    const displayName =
      (session.user.user_metadata?.full_name as string | undefined)?.trim()
      || session.user.email?.split('@')[0] || 'Grabitt user'
    try {
      await apiClient().auth.provisionProfile.mutate({
        supabaseId: session.user.id, email: session.user.email ?? '', displayName, locale: 'en',
      })
    } catch { /* non-fatal */ }
    try {
      const res = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) { const j = await res.json(); setToken(j.token ?? null) }
      else setToken(null)
    } catch { setToken(null) }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => bootstrap(data.session).finally(() => setLoading(false)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { bootstrap(session) })
    return () => sub.subscription.unsubscribe()
  }, [bootstrap])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }
  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) return { error: error.message }
    return { needsConfirm: !data.session }
  }
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setToken(null) }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
