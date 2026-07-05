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
