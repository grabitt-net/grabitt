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
  else {
    localStorage.removeItem(KEY)
    // Signing out ends any account switch too, so the next login re-mints from
    // the real Supabase session rather than staying pinned to a switched token.
    localStorage.removeItem('grabitt_switched')
  }
}

// Switch the app into a linked account (personal ↔ business, etc.) without
// re-logging in. Mints a token for the target via the server (authorised only
// if the accounts are linked), stores it, and flags the switch so the token
// isn't re-minted back to the Supabase-session account. Returns the new uid.
export async function switchAccount(targetId: string): Promise<string> {
  const res = await trpcAuthed().account.switchTo.mutate({ targetId }) as { token: string; userId: string }
  setAuthToken(res.token)
  localStorage.setItem('grabitt_uid', res.userId)
  localStorage.setItem('grabitt_switched', '1')
  window.dispatchEvent(new Event('grabitt-auth'))
  return res.userId
}

// Fetches (and stores) a fresh app JWT from the current Supabase session.
// Returns the token, or null if the user isn't authenticated / not provisioned.
export async function refreshAuthToken(): Promise<string | null> {
  // While an admin is impersonating a member, the app JWT is the member's token.
  // Never re-mint from /api/auth/token here — that reads the admin's Supabase
  // session and would clobber the impersonation. Keep the member token as-is.
  // The same applies while the user has switched into a linked account: the
  // Supabase session still belongs to the account they logged in with, so
  // re-minting would silently drop them back to it.
  if (typeof window !== 'undefined' && (localStorage.getItem('grabitt_impersonating') || localStorage.getItem('grabitt_switched'))) {
    return getAuthToken()
  }
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
