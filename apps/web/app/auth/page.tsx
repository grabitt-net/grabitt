'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Google "G" mark (official multi-colour logo) — replaces the emoji globe.
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.6C41.4 36.6 44 30.9 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  )
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  // On Sign Up the member first picks an account type (Individual vs Business),
  // mirroring the prototype's account-type chooser. null = chooser not yet made.
  const [acctType, setAcctType] = useState<'personal' | 'business' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Surface errors bounced back from the OAuth / email-confirm callback, and the
  // success banner after a new user clicks their email-confirmation link.
  useEffect(() => {
    if (searchParams.get('error')) {
      setError('We could not complete sign-in. Please try again.')
    }
    if (searchParams.get('confirmed')) {
      setMode('login')
      setMessage('Your email is confirmed — you can now log in.')
    }
  }, [searchParams])

  const supabase = createClient()

  // Where to land after auth. A Business signup goes straight into the business
  // upgrade panel (/?business=1, opened by PanelDeepLink); everyone else honours
  // ?next= or falls back home.
  const nextParam = searchParams.get('next')
  const safeNext = nextParam && nextParam.startsWith('/') ? nextParam : '/'
  const destination = acctType === 'business' ? '/?business=1' : safeNext

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      })
      if (error) setError(error.message)
      else setMessage(acctType === 'business'
        ? 'Check your email to confirm your account — then we’ll set up your business.'
        : 'Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push(destination)
    }

    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--sand)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/grabitt-logo.png" alt="Grabitt" style={{ height: 48, width: 'auto', display: 'block' }} />
      </Link>

      <div style={{
        background: '#fff', borderRadius: 24, padding: '28px 24px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(28,16,8,0.12)',
      }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: '#f5f5f5', borderRadius: 50,
          padding: 4, marginBottom: 24,
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setAcctType(null); setError(null); setMessage(null) }} style={{
              flex: 1, padding: '8px 0', borderRadius: 50, border: 'none',
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              background: mode === m ? 'var(--orange)' : 'transparent',
              color: mode === m ? '#fff' : '#888', transition: 'all 0.2s',
            }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Sign Up starts with the account-type chooser (benefits of each). */}
        {mode === 'signup' && !acctType ? (
          <AccountTypeChooser onPick={setAcctType} onLogin={() => { setMode('login'); setError(null) }} />
        ) : (
        <>
        {mode === 'signup' && acctType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: acctType === 'business' ? 'linear-gradient(135deg,#FFF3EE,#FFE4D6)' : '#FFF6F2', border: '1.5px solid #FFD9C2', borderRadius: 12, padding: '9px 12px', marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>{acctType === 'business' ? '🏢' : '🧡'}</span>
            <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)' }}>
              {acctType === 'business' ? 'Business account' : 'Individual account'}
            </span>
            <button onClick={() => { setAcctType(null); setError(null); setMessage(null) }} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Change</button>
          </div>
        )}

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '12px 20px', borderRadius: 12,
          border: '1.5px solid #eee', background: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700,
          color: 'var(--dark)', marginBottom: 16, opacity: loading ? 0.6 : 1,
        }}>
          <GoogleLogo />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'var(--font-nunito)', fontWeight: 700 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
        </div>

        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input
              type="text"
              name="name"
              id="name"
              autoComplete="name"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            name="email"
            id="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            name="password"
            id="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{
              background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 10,
              padding: '10px 12px', fontSize: 12, color: '#c62828',
              fontFamily: 'var(--font-nunito)',
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              background: '#f0fff4', border: '1px solid #c8e6c9', borderRadius: 10,
              padding: '10px 12px', fontSize: 12, color: '#2e7d32',
              fontFamily: 'var(--font-nunito)',
            }}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: 'var(--orange)', color: '#fff', border: 'none',
            borderRadius: 12, padding: '13px 20px', width: '100%',
            fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900,
            cursor: 'pointer', marginTop: 4, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', fontSize: 11, color: '#bbb',
          fontFamily: 'var(--font-nunito)', marginTop: 16,
        }}>
          By continuing you agree to Grabitt&apos;s{' '}
          <Link href="/terms" style={{ color: 'var(--orange)' }}>Terms</Link> &amp;{' '}
          <Link href="/privacy" style={{ color: 'var(--orange)' }}>Privacy Policy</Link>
        </p>
        </>
        )}
      </div>
    </main>
  )
}

// The "How would you like to join?" step — Individual vs Business, each with its
// benefits, mirroring the prototype's account-type chooser.
function AccountTypeChooser({ onPick, onLogin }: { onPick: (t: 'personal' | 'business') => void; onLogin: () => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 14 }}>How would you like to join?</div>

      {/* Individual */}
      <button onClick={() => onPick('personal')} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: '2px solid var(--orange)', borderRadius: 14, padding: 16, marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 10px rgba(255,69,0,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>🧡</span>
          <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>Individual</span>
          <span style={{ fontSize: 20, color: 'var(--orange)' }}>›</span>
        </div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#666', lineHeight: 1.5 }}>Buy and sell as a person.</div>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#555', lineHeight: 1.7 }}>
          <li>Free to join · 50 welcome credits</li>
          <li>First sale is fee-free</li>
          <li>Buyer protection with Stripe escrow</li>
        </ul>
      </button>

      {/* Business */}
      <button onClick={() => onPick('business')} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'linear-gradient(135deg,#FFF3EE,#FFE4D6)', border: '2px solid var(--orange2)', borderRadius: 14, padding: 16, marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 10px rgba(255,140,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>🏢</span>
          <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>Business Seller</span>
          <span style={{ fontSize: 20, color: 'var(--orange)' }}>›</span>
        </div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#8a5a2a', lineHeight: 1.5 }}>Sell under your business name. 14 days free, then €29/mo.</div>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#7a4419', lineHeight: 1.7 }}>
          <li>Your own storefront &amp; 🏢 verified badge</li>
          <li>Instant Dealer status · multibuy pricing</li>
          <li>Bulk import your whole catalogue</li>
        </ul>
      </button>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#999', fontFamily: 'var(--font-comfortaa)', marginTop: 6 }}>
        Already a member? <span onClick={onLogin} style={{ color: 'var(--orange)', fontWeight: 700, cursor: 'pointer' }}>Log in</span>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #eee', borderRadius: 12, padding: '12px 14px',
  fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: 'var(--dark)',
  outline: 'none', width: '100%',
}
