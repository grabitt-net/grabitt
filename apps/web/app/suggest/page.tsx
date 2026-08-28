'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import InfoPage from '@/components/marketplace/InfoPage'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

// Footer → Help & guides → Suggest Ideas (item 20). Intro copy is Steve's, used
// exactly as written. The "Suggest an Idea" button on the Why Us? page links here.

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', outline: 'none', background: '#fff' }
const label: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }

export default function SuggestPage() {
  const router = useRouter()
  const [category, setCategory] = useState<'suggestion' | 'bug'>('suggestion')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  // Suggesting an idea requires being signed in — the confirmation lands in the
  // member's own inbox, so we need to know who they are.
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      setAuthed(!!token)
    })()
  }, [])

  const submit = async () => {
    if (message.trim().length < 3) { setErr('Please tell us a little more.'); return }
    setErr(''); setBusy(true)
    try {
      await trpcAuthed().crm.submitIdea.mutate({
        message: `[${category === 'bug' ? 'Error / bug' : 'Suggestion'}] ${message.trim()}`,
      })
      setDone(true); setMessage('')
    } catch { setErr('Something went wrong — please try again.') }
    finally { setBusy(false) }
  }

  return (
    <InfoPage
      title="Suggest Ideas"
      topbarTitle="Suggest Ideas"
      intro={
        <>
          <p style={{ margin: '0 0 12px' }}>We&apos;re constantly working to improve this site. We&apos;ll get some things wrong, and we want to be told — so we can put fast fixes in place and keep Grabitt relevant and fully focused on you, the user.</p>
          <p style={{ margin: 0 }}>We usually update immediately when an error is detected or reported, but please allow up to 24 hours.</p>
        </>
      }
      pills={['Community built', 'Fast fixes', 'Always improving', 'Your voice counts']}
    >
      <div style={{ maxWidth: 620, margin: '0 auto', background: '#fff', border: '1px solid #ece3d7', borderRadius: 20, padding: 'clamp(18px, 3vw, 28px)', boxShadow: '0 6px 24px rgba(30,43,85,0.06)' }}>
        {authed === false ? (
          <div style={{ textAlign: 'center', padding: '20px 4px' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🔒</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900, color: 'var(--dark)', marginBottom: 6 }}>Sign in to suggest an idea</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: '#3a3a3a', lineHeight: 1.6, marginBottom: 16 }}>So we can reply and drop a copy in your inbox, please sign in first.</div>
            <button onClick={() => router.push('/auth?next=/suggest')} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Sign in</button>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900, color: 'var(--dark)', marginBottom: 6 }}>Thank you!</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: '#3a3a3a', lineHeight: 1.6 }}>Your message has reached the team, and a copy is in your inbox. We usually act on things straight away — please allow up to 24 hours.</div>
            <button onClick={() => setDone(false)} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Send another</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <span style={label}>What is this?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['suggestion', '💡 Suggestion'], ['bug', '🐞 Error / bug']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setCategory(v)} style={{
                    flex: 1, border: `1.5px solid ${category === v ? 'var(--orange)' : '#e5dccd'}`, background: category === v ? '#FFF3EE' : '#fff',
                    color: category === v ? 'var(--orange)' : 'var(--dark)', borderRadius: 12, padding: '11px', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={label}>Your message</span>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Tell us your idea, or describe the problem…" style={{ ...field, resize: 'vertical', minHeight: 110 }} />
            </div>
            {err && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#ef4444', fontWeight: 700, marginBottom: 10 }}>{err}</div>}
            <button onClick={submit} disabled={busy} style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Sending…' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </InfoPage>
  )
}
