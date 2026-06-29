'use client'
import { usePanel } from '@/context/PanelContext'

export default function Hero() {
  const { openPanel } = usePanel()

  const quickActions = [
    { label: 'Sponsors', action: () => openPanel('sponsors') },
    { label: 'Find Work', action: () => openPanel('dept', { name: 'Jobs', icon: '💼', grad: 'linear-gradient(135deg,#2193b0,#6dd5ed)' }) },
    { label: 'Find Home', action: () => openPanel('dept', { name: 'Property', icon: '🏠', grad: 'linear-gradient(135deg,#e96c2a,#f5a623)' }) },
    { label: 'Employers', action: () => openPanel('employers') },
    { label: 'Business', action: () => openPanel('business') },
  ]

  return (
    <section style={{ padding: '8px 14px' }} className="hero">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '6px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={a.action}
                style={{
                  flex: 1, minWidth: 0, background: '#fff', color: '#1a1a1a',
                  border: '2px solid var(--orange)', borderRadius: 10,
                  padding: '9px 2px', fontFamily: 'var(--font-nunito)', fontSize: 9,
                  fontWeight: 900, cursor: 'pointer', lineHeight: 1.15,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => openPanel('grabit')}
          style={{
            width: '100%', background: 'linear-gradient(135deg, #FF4500, #FF8C00)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '9px 13px', fontFamily: 'var(--font-nunito)', fontSize: 14,
            fontWeight: 900, cursor: 'pointer', boxShadow: '0 3px 12px rgba(255,69,0,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          <span>Grabitt Now! · Limited time offers!</span>
          <span style={{ fontSize: 16 }}>⚡</span>
        </button>
      </div>
    </section>
  )
}
