'use client'
import { useState } from 'react'

const navSections = [
  {
    label: 'Executive',
    items: [
      { icon: '🚰', label: 'Pipeline', id: 'funnel' },
      { icon: '🤞', label: 'Prospects', id: 'pipeline' },
      { icon: '🙋', label: 'Contacts', id: 'contacts' },
      { icon: '📈', label: 'Forecast', id: 'forecast' },
      { icon: '🪪', label: 'Members', id: 'members' },
      { icon: '⚖️', label: 'Disputes', id: 'disputes' },
      { icon: '🚨', label: 'Reports', id: 'reports' },
      { icon: '🎁', label: 'Rewards', id: 'rewards' },
      { icon: '💰', label: 'Financials', id: 'financials' },
      { icon: '📊', label: 'Retention', id: 'retention' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { icon: '📅', label: 'Calendar', id: 'calendar' },
      { icon: '✅', label: 'To Do', id: 'todo' },
      { icon: '💬', label: 'Chats', id: 'messages' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: '📧', label: 'E-shots', id: 'emails' },
      { icon: '🎯', label: 'Banners', id: 'banners' },
    ],
  },
]

export default function AdminSidebar() {
  const [active, setActive] = useState('funnel')

  return (
    <aside style={{
      background: '#fff', borderRight: '1px solid #eee',
      padding: '16px 0', display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 48px)',
    }}>
      {navSections.map(section => (
        <div key={section.label} style={{ padding: '0 8px', marginBottom: 20 }}>
          <div style={{
            fontSize: 9, letterSpacing: 2, color: '#FF4500',
            textTransform: 'uppercase', marginBottom: 6,
            fontFamily: 'var(--font-nunito)', fontWeight: 800,
            padding: '0 4px', textAlign: 'center',
          }}>
            {section.label}
          </div>
          {section.items.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '8px 4px', borderRadius: 10, width: '100%',
                fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 700,
                color: active === item.id ? '#FF4500' : '#555',
                background: active === item.id ? '#FFF3EE' : 'none',
                border: 'none', cursor: 'pointer', marginBottom: 2,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ))}

      {/* Toolbox pinned at bottom */}
      <div style={{ padding: 8, marginTop: 'auto', borderTop: '1px solid #f0f0f0' }}>
        <button
          onClick={() => setActive('toolbox')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '8px 4px', borderRadius: 10, width: '100%',
            fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 800,
            color: '#FF4500', background: '#FFF3EE',
            border: '1.5px solid #FF4500', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 20 }}>🧰</span>
          Toolbox
        </button>
      </div>
    </aside>
  )
}
