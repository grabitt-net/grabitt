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
    { label: 'Find Home', action: () => router.push('/property') },
    { label: 'Employers', action: () => openPanel('employers') },
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
    </section>
  )
}
