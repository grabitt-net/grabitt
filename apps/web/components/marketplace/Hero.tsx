'use client'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import Icon from './Icon'

export default function Hero() {
  const { openPanel } = usePanel()
  const router = useRouter()

  const quickActions = [
    { label: 'Sponsorship', action: () => openPanel('advertise') },
    { label: 'Find Work', action: () => router.push('/jobs') },
    { label: 'Find Home', action: () => router.push('/property') },
    { label: 'Employers', action: () => openPanel('employers') },
    { label: 'Business', action: () => openPanel('business') },
  ]

  return (
    <section style={{ padding: '12px 14px 4px' }} className="hero">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {quickActions.map(a => (
            <button
              key={a.label}
              onClick={a.action}
              style={{
                flex: '0 0 auto', background: '#fff', color: '#3a3226',
                border: '1px solid #e5dccd', borderRadius: 50,
                padding: '9px 18px', fontFamily: 'var(--font-ui)', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => openPanel('grabit')}
          style={{
            width: '100%', background: 'linear-gradient(135deg, #FF4500, #FF8C00)',
            color: '#fff', border: 'none', borderRadius: 14,
            padding: '13px 18px', fontFamily: 'var(--font-ui)', fontSize: 14,
            fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,69,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          }}
        >
          <Icon name="sparkle" size={18} strokeWidth={0} style={{ fill: '#fff' }} />
          <span>Grabitt Now — limited-time offers</span>
        </button>
      </div>
    </section>
  )
}
