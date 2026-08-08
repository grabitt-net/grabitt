'use client'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { t } from '@/lib/i18n'
import BannerSlot from './BannerSlot'
import Icon, { type IconName } from './Icon'

// Persistent quick-actions bar — Sponsorship / Recruitment / Property / For
// Business. Rendered under the header on every main page. Find Work + Find Staff
// are consolidated into the Recruitment page; For Business points at /employers.
export default function QuickActions() {
  const { openPanel } = usePanel()
  const router = useRouter()

  const actions: { label: string; icon: IconName; action: () => void }[] = [
    { label: 'Recruitment', icon: 'briefcase', action: () => router.push('/recruitment') },
    { label: 'Property', icon: 'building', action: () => router.push('/property') },
    // Sponsorship now lives inside the For Business page.
    { label: 'For Business', icon: 'star', action: () => router.push('/employers') },
  ]

  return (
    <section style={{ padding: '12px 14px 4px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.action}
            style={{
              flex: '1 1 auto', background: '#fff', color: 'var(--ink-2)',
              border: '1px solid var(--line)', borderRadius: 50,
              padding: '9px 14px', fontFamily: 'var(--font-ui)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Icon name={a.icon} size={15} strokeWidth={2} /> {t(a.label)}
          </button>
        ))}
      </div>

      {/* Grabitt Now promo — shown on every page, below the pills */}
      <button
        onClick={() => router.push('/grabit')}
        style={{
          width: '100%', marginTop: 10, background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
          color: '#fff', border: 'none', borderRadius: 'var(--radius)',
          padding: '15px 18px', fontFamily: 'var(--font-display)', fontSize: 17,
          fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', boxShadow: '0 6px 18px rgba(245,84,10,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <Icon name="zap" size={19} strokeWidth={2} />
        <span>{t('Grabitt Now — limited-time offers')}</span>
      </button>

      {/* Sponsor banner — every page, below the Grabitt Now promo. Renders
          nothing when no sponsor banner is active. */}
      <div style={{ margin: '0 -14px' }}><BannerSlot position="sponsor_top" aspect="4.5 / 1" /></div>
    </section>
  )
}
