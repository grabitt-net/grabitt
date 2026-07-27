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

// Reuse one authed client per token so concurrent protected queries batch into
// a single /api/trpc request (via httpBatchLink) instead of one per call. The
// client is only rebuilt when the token actually changes (login/logout/refresh).
let _authedClient: ReturnType<typeof createTrpcClient> | null = null
let _authedToken: string | undefined
export function trpcAuthed() {
  const token = getAuthToken() ?? undefined
  if (!_authedClient || token !== _authedToken) {
    _authedToken = token
    _authedClient = createTrpcClient(token)
  }
  return _authedClient
}
