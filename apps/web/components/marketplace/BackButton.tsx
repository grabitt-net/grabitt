'use client'
import { useRouter } from 'next/navigation'
import Icon from './Icon'
import { t } from '@/lib/i18n'

// Persistent "back to previous page" control for the sticky Topbar. Lives on
// deep pages (listing / job / property detail) so it stays pinned while the
// user scrolls. Uses real browser history, but falls back to a sensible parent
// route when there is none — e.g. the user arrived via a shared link or a
// notification — so it never dead-ends or steps outside the app.
export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(fallback)
  }
  return (
    <button
      onClick={goBack}
      aria-label={t('Back')}
      style={{
        flexShrink: 0,
        width: 44,
        height: 44,
        marginLeft: -8,          // optical alignment to the leading edge
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--dark)',
        padding: 0,
      }}
    >
      <Icon name="arrowLeft" size={22} strokeWidth={2.2} />
    </button>
  )
}
