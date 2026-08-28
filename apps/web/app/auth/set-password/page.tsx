'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Where an invited / reset member lands after clicking their email link. The
// /auth/callback has already established the recovery session (cookies), so we
// just need them to choose a password — no email/sign-up step.
export default function SetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'ok' | 'nosession'>('checking')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // The session may arrive via cookies (callback) or a URL fragment; give the
    // client a moment to pick it up, then confirm we have a user to update.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setEmail(data.session.user.email ?? ''); setReady('ok') }
      else setReady('nosession')
    })
  }, [])

  const submit = async () => {
    setErr('')
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return }
    if (pw !== pw2) { setErr('Those passwords don’t match.'); return }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) { setErr(error.message); setBusy(false); return }
      setDone(true)
      setTimeout(() => router.push('/account'), 1200)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not set your password'); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream, #fbf7f1)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--orange, #f5540a)' }}>Grabitt</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#666', marginTop: 4 }}>Set your password</div>
        </div>

        {ready === 'checking' ? (
          <div style={{ textAlign: 'center', color: '#999', fontFamily: 'Nunito, sans-serif', fontSize: 13, padding: 20 }}>Loading…</div>
        ) : ready === 'nosession' ? (
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13.5, color: '#444', lineHeight: 1.6, textAlign: 'center' }}>
            This link has expired or was already used. <Link href="/auth" style={{ color: 'var(--orange, #f5540a)', fontWeight: 800 }}>Go to sign in</Link> and use “Forgot password” to get a fresh link.
          </div>
        ) : done ? (
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#16a34a', fontWeight: 800, textAlign: 'center', padding: 10 }}>✓ Password set — taking you to your account…</div>
        ) : (
          <>
            {email && <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12.5, color: '#888', textAlign: 'center', marginBottom: 14 }}>for <strong style={{ color: '#444' }}>{email}</strong></div>}
            {err && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, marginBottom: 12, fontFamily: 'Nunito, sans-serif' }}>{err}</div>}
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password (min 8 characters)" style={field} />
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }} placeholder="Confirm password" style={field} />
            <button onClick={submit} disabled={busy} style={{ width: '100%', background: 'var(--orange, #f5540a)', color: '#fff', border: 'none', borderRadius: 999, padding: 13, fontFamily: 'Nunito, sans-serif', fontSize: 14.5, fontWeight: 900, cursor: 'pointer', opacity: busy ? 0.7 : 1, marginTop: 4 }}>
              {busy ? 'Setting…' : 'Set password & continue'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '11px 13px', fontFamily: 'Nunito, sans-serif', fontSize: 14, outline: 'none', marginBottom: 10 }
