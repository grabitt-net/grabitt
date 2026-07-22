import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Email confirmation / recovery links arrive as a token_hash + type, NOT a
  // PKCE code. Handling only `code` bounced every email confirmation to the
  // error page even though the account was fine.
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Neither param: this is the implicit flow, where the session arrives in the
  // URL fragment (#access_token=…). A fragment never reaches the server, so
  // there is nothing to exchange here — send them on and let supabase-js pick it
  // up client-side rather than showing a false "could not complete sign-in".
  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: (type ?? 'email') as never, token_hash: tokenHash! })

  if (!error) {
    // Keep our User.email in step with Supabase Auth. This is what completes an
    // email change: the user confirms via the emailed link, which lands here.
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        await prisma.user.updateMany({
          where: { supabaseId: user.id, email: { not: user.email } },
          data: { email: user.email },
        })
      }
    } catch { /* never block sign-in on a sync failure */ }
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`)
}
