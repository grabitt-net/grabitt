'use client'
import { createTrpcClient } from '@/lib/trpc'

// Consumer app JWT (minted by /api/auth/token from the Supabase session) lives
// in localStorage alongside grabitt_uid. `trpcAuthed()` returns a tRPC client
// that sends it as a Bearer token so protected procedures resolve ctx.user.
const KEY = 'grabitt_jwt'

export function getAuthToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(KEY) : null
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(KEY, token)
  else localStorage.removeItem(KEY)
}

// Fetches (and stores) a fresh app JWT from the current Supabase session.
// Returns the token, or null if the user isn't authenticated / not provisioned.
export async function refreshAuthToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/token', { method: 'POST' })
    if (!res.ok) return null
    const { token } = await res.json()
    if (typeof token === 'string') { setAuthToken(token); return token }
  } catch { /* offline / transient — keep any existing token */ }
  return null
}

export function trpcAuthed() {
  return createTrpcClient(getAuthToken() ?? undefined)
}
