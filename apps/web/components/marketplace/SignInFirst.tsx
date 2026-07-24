'use client'
import { t } from '@/lib/i18n'

// Shown in place of a panel that writes to someone's account when they aren't
// signed in. Better than opening the form and failing on save, or silently
// swapping to the login panel with no explanation of why.
export default function SignInFirst({ what, onClose, onSignIn }: {
  what: string
  onClose: () => void
  onSignIn: () => void
}) {
  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🔒</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 6 }}>
          {t('Sign in first')}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#666', lineHeight: 1.55, marginBottom: 18 }}>
          {t('You need an account to {what} — it is saved to your profile so you can edit or pause it any time.').replace('{what}', what)}
        </div>
        <button onClick={onSignIn} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 50, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
          {t('Sign in or join')}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#888', padding: 10, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          {t('Cancel')}
        </button>
      </div>
    </div>
  )
}
