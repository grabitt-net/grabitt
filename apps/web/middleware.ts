import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Next.js only runs a file literally named `middleware.ts`. This refreshes the
// Supabase session on every request and syncs the auth cookies so Server
// Components (e.g. /admin, /messages, /profile) can read a valid session —
// without it, getUser() returns null server-side and those pages redirect away.
const PROTECTED_ROUTES = ['/profile', '/messages', '/listings/new', '/orders']
const ADMIN_ROUTES = ['/admin']
const AUTH_ROUTES = ['/auth']

export async function middleware(request: NextRequest) {
  // The OAuth / email-confirm callback must exchange its PKCE code untouched —
  // running getUser() + rewriting cookies here can drop the code-verifier
  // cookie ("OAuth state has expired"). Let the route handler own it.
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }

  // PERF: getUser() is a network round-trip to Supabase Auth. Running it on every
  // navigation (incl. RSC prefetches) makes public page switches slow. Only the
  // routes that actually need the server-side session — protected pages, the
  // admin suite, the auth page — pay that cost (plus maintenance-mode, which
  // gates the whole site). Public browse pages skip it entirely and stay fast;
  // their auth uses the client JWT + supabase-js client-side refresh.
  const p = request.nextUrl.pathname
  const needsSession = process.env.MAINTENANCE_MODE === '1'
    || PROTECTED_ROUTES.some(r => p.startsWith(r))
    || ADMIN_ROUTES.some(r => p.startsWith(r))
    || AUTH_ROUTES.some(r => p.startsWith(r))
  if (!needsSession) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: refreshes the session + writes refreshed cookies onto the response.
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // ── Pre-launch lockdown ──────────────────────────────────────────────────────
  // While MAINTENANCE_MODE is on, the public site is hidden: everyone is sent to
  // /coming-soon EXCEPT admins (profiles.is_admin), and anyone holding the
  // preview secret (?preview=SECRET sets a cookie so you/Steve can browse). The
  // admin suite, auth and API stay reachable so admins can still sign in + work.
  if (process.env.MAINTENANCE_MODE === '1') {
    const allow = path === '/coming-soon'
      || path.startsWith('/admin') || path.startsWith('/auth') || path.startsWith('/api')
      || path.startsWith('/_next') || path === '/favicon.ico' || path === '/robots.txt' || path === '/manifest.webmanifest'
    if (!allow) {
      const secret = process.env.PREVIEW_SECRET
      const provided = request.nextUrl.searchParams.get('preview')
      const hasCookie = request.cookies.get('grabitt_preview')?.value === secret
      let isAdmin = false
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        isAdmin = !!prof?.is_admin
      }
      const bypass = isAdmin || (!!secret && (provided === secret || hasCookie))
      if (!bypass) {
        const url = request.nextUrl.clone(); url.pathname = '/coming-soon'; url.search = ''
        return NextResponse.rewrite(url)
      }
      // Persist the preview grant so the secret only needs to be used once.
      if (secret && provided === secret) supabaseResponse.cookies.set('grabitt_preview', secret, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' })
    }
  }

  // Redirect logged-in users away from the auth page
  if (user && AUTH_ROUTES.some(r => path.startsWith(r))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect user routes
  if (!user && PROTECTED_ROUTES.some(r => path.startsWith(r))) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Protect admin routes (the is_admin role check also happens in the page)
  if (ADMIN_ROUTES.some(r => path.startsWith(r))) {
    if (!user) return NextResponse.redirect(new URL('/auth', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
