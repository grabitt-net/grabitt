import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
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
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`)
}
