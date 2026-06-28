'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

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
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    }

    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
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
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
          <span style={{ color: 'var(--orange)' }}>G</span>
          <span style={{ color: 'var(--dark)' }}>rabitt</span>
        </span>
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
            <button key={m} onClick={() => { setMode(m); setError(null); setMessage(null) }} style={{
              flex: 1, padding: '8px 0', borderRadius: 50, border: 'none',
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              background: mode === m ? 'var(--orange)' : 'transparent',
              color: mode === m ? '#fff' : '#888', transition: 'all 0.2s',
            }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '12px 20px', borderRadius: 12,
          border: '1.5px solid #eee', background: '#fff', cursor: 'pointer',
          fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700,
          color: 'var(--dark)', marginBottom: 16, opacity: loading ? 0.6 : 1,
        }}>
          <span style={{ fontSize: 18 }}>🌐</span>
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
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
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
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #eee', borderRadius: 12, padding: '12px 14px',
  fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: 'var(--dark)',
  outline: 'none', width: '100%',
}
