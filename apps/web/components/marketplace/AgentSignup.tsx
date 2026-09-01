'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { AGENTS_ENABLED } from '@/lib/flags'

// "Agent Signup" on the Property page. Lets a member apply for a standalone
// property-agent profile (property-only). Applications are reviewed and
// authorised manually by an admin. Shows the current state (apply / pending /
// approved) and hides itself for business accounts (agents are separate).
type Me = { isBusiness?: boolean; isPropertyAgent?: boolean; agentStatus?: string | null; agencyName?: string | null; agentWhatsapp?: string | null; agentEmail?: string | null }

export default function AgentSignup() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null | undefined>(undefined) // undefined = loading, null = logged out
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ agencyName: '', agentWhatsapp: '', agentEmail: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!AGENTS_ENABLED) { setMe(null); return }
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { setMe(null); return }
    try {
      const u = await (trpcAuthed() as any).users.me.query()
      setMe(u as Me)
      setF({ agencyName: u?.agencyName ?? '', agentWhatsapp: u?.agentWhatsapp ?? '', agentEmail: u?.agentEmail ?? '' })
    } catch { setMe(null) }
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    setErr(''); setBusy(true)
    try {
      await (trpcAuthed() as any).users.applyAsAgent.mutate({
        agencyName: f.agencyName.trim() || undefined,
        agentWhatsapp: f.agentWhatsapp.trim() || undefined,
        agentEmail: f.agentEmail.trim() || undefined,
      })
      setOpen(false)
      await load()
    } catch (e: any) { setErr(e?.message ? String(e.message) : 'Could not submit') }
    finally { setBusy(false) }
  }

  // Business accounts can't be agents (separate profiles); loading shows nothing.
  if (me === undefined || (me && me.isBusiness)) return null

  const pill: React.CSSProperties = { flexShrink: 0, border: '1.5px solid var(--orange)', background: '#fff', color: 'var(--orange)', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer' }

  // Approved agent → straight to their Agent Hub.
  if (me?.isPropertyAgent) {
    return <button onClick={() => router.push('/account')} style={pill}>🏠 Agent Hub</button>
  }
  // Application under review.
  if (me?.agentStatus === 'pending') {
    return <span style={{ ...pill, cursor: 'default', color: '#a16207', borderColor: '#f0d98a', background: '#fffbeb' }}>⏳ Agent — in review</span>
  }

  return (
    <>
      <button onClick={() => (me ? setOpen(true) : router.push('/auth?next=/property'))} style={pill}>🏠 Agent signup</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Become a property agent</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.5, marginBottom: 14 }}>
              A property-agent account lists property only, with your agency details shown on your listings. Applications are reviewed and approved by our team.
            </div>
            <input value={f.agencyName} onChange={e => setF(p => ({ ...p, agencyName: e.target.value }))} placeholder="Agency name" style={field} />
            <input value={f.agentWhatsapp} onChange={e => setF(p => ({ ...p, agentWhatsapp: e.target.value }))} placeholder="WhatsApp number" inputMode="tel" style={field} />
            <input value={f.agentEmail} onChange={e => setF(p => ({ ...p, agentEmail: e.target.value }))} placeholder="Contact email" inputMode="email" style={field} />
            {err && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submit} disabled={busy} style={{ flex: 2, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Submitting…' : 'Submit application'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 12, padding: '11px 13px', fontFamily: 'var(--font-ui)', fontSize: 13.5, outline: 'none', background: '#fff', marginBottom: 8 }
