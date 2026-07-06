'use client'
import { useCallback, useEffect, useState } from 'react'
import { getAuthToken, trpcAuthed } from '@/lib/authToken'

// Blocking first-login consent flow. When a signed-in user hasn't yet accepted
// the GDPR notice and/or the EU right-to-withdraw waiver, this shows two
// non-dismissable modals in sequence (GDPR first, then the waiver). It renders
// on top of everything and cannot be bypassed until both are accepted.
type Status = { gdprAccepted: boolean; withdrawalWaiverAccepted: boolean; deleted: boolean }

export default function ConsentGate() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(false)

  const refresh = useCallback(async () => {
    if (!getAuthToken()) { setStatus(null); return }
    try {
      const s = await trpcAuthed().compliance.status.query()
      setStatus(s as Status)
    } catch { setStatus(null) }
  }, [])

  useEffect(() => {
    refresh()
    const h = () => refresh()
    window.addEventListener('grabitt-auth', h)
    return () => window.removeEventListener('grabitt-auth', h)
  }, [refresh])

  if (!status || status.deleted) return null
  if (status.gdprAccepted && status.withdrawalWaiverAccepted) return null

  const kind: 'gdpr' | 'withdrawal_waiver' = !status.gdprAccepted ? 'gdpr' : 'withdrawal_waiver'

  const accept = async () => {
    setBusy(true)
    try {
      await trpcAuthed().compliance.accept.mutate({ kind })
      setChecked(false)
      await refresh()
    } finally { setBusy(false) }
  }

  const content = kind === 'gdpr'
    ? {
        title: 'Your privacy & data (GDPR)',
        body: (
          <>
            <p style={p}>To run the Grabitt marketplace we process your personal data — your account details, listings, orders, messages and payments. We use it only to operate the service and keep it safe.</p>
            <p style={p}>By accepting, you consent to this processing under the GDPR and agree to our <a href="/privacy" target="_blank" style={link}>Privacy Policy</a>. You can request permanent deletion of your account data at any time from your Account page.</p>
          </>
        ),
        check: 'I have read and accept the Privacy Policy and consent to my data being processed.',
        cta: 'Accept & continue',
      }
    : {
        title: 'Right to withdraw — important notice',
        body: (
          <>
            <p style={p}><strong>Sales made on Grabitt are exempt from the EU right of withdrawal.</strong> Grabitt is a digital marketplace that connects buyers and sellers — we do not hold, own, or handle the physical goods sold on the platform.</p>
            <p style={p}>Any request to withdraw from, cancel, or return a sale is the sole responsibility of the buying and selling parties directly, and must be arranged between them. Grabitt is not a party to the sale and provides no right of withdrawal in respect of it.</p>
          </>
        ),
        check: 'I understand and accept that Grabitt sales are exempt from the right of withdrawal, and that withdrawals are strictly between buyer and seller.',
        cta: 'I understand & accept',
      }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(20,12,6,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', padding: '26px 24px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Step {kind === 'gdpr' ? '1' : '2'} of 2 · Required
        </div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--dark)', margin: '0 0 14px' }}>{content.title}</h2>
        <div>{content.body}</div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0 18px', cursor: 'pointer' }}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#444', lineHeight: 1.5 }}>{content.check}</span>
        </label>
        <button
          onClick={accept}
          disabled={!checked || busy}
          style={{ width: '100%', background: !checked || busy ? '#ccc' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: !checked || busy ? 'default' : 'pointer' }}
        >
          {busy ? 'Saving…' : content.cta}
        </button>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#999', textAlign: 'center', marginTop: 12 }}>
          You must accept both notices to use Grabitt. Your acceptance is recorded with a timestamp.
        </div>
      </div>
    </div>
  )
}

const p: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 13.5, color: '#444', lineHeight: 1.6, margin: '0 0 10px' }
const link: React.CSSProperties = { color: 'var(--orange)', fontWeight: 700 }
