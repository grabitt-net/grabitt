'use client'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { t } from '@/lib/i18n'

// Persistent quick-actions bar — Sponsorship / Find Work / Find Home / Employers
// / Business. Rendered under the header on every main page (home, jobs, property,
// category) so the "Find Work"/"Find Home" shortcuts are always reachable.
export default function QuickActions() {
  const { openPanel } = usePanel()
  const router = useRouter()

  const actions = [
    { label: 'Sponsorship', action: () => openPanel('advertise') },
    { label: 'Find Work', action: () => router.push('/jobs') },
    { label: 'Find Staff', action: () => openPanel('findStaff') },
    { label: 'Find Home', action: () => router.push('/property') },
    { label: 'Employers', action: () => router.push('/employers') },
    { label: 'Business', action: () => openPanel('business') },
  ]

  return (
    <section style={{ padding: '12px 14px 4px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.action}
            style={{
              flex: '1 1 auto', background: '#fff', color: '#3a3226',
              border: '1px solid #e5dccd', borderRadius: 50,
              padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {t(a.label)}
          </button>
        ))}
      </div>

      {/* Grabitt Now promo — shown on every page, below the pills */}
      <button
        onClick={() => openPanel('grabit')}
        style={{
          width: '100%', marginTop: 10, background: 'linear-gradient(135deg, #FF4500, #FF8C00)',
          color: '#fff', border: 'none', borderRadius: 14,
          padding: '15px 18px', fontFamily: 'var(--font-ui)', fontSize: 18,
          fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,69,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>⚡</span>
        <span>{t('Grabitt Now — limited-time offers')}</span>
        <span style={{ fontSize: 20, lineHeight: 1 }}>⚡</span>
      </button>
    </section>
  )
}
