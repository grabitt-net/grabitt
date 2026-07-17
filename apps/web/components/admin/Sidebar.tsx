'use client'
import type { View } from './AdminApp'

const sections = [
  {
    label: 'Executive',
    items: [
      { icon: '🚰', label: 'Pipeline', id: 'funnel' as View },
      { icon: '🤞', label: 'Prospects', id: 'pipeline' as View, countKey: 'pipeline' },
      { icon: '🙋', label: 'Contacts', id: 'contacts' as View },
      { icon: '📈', label: 'Forecast', id: 'forecast' as View },
      { icon: '🪪', label: 'Members', id: 'members' as View },
      { icon: '⚖️', label: 'Disputes', id: 'disputes' as View, countKey: 'disputes' },
      { icon: '🚨', label: 'Reports', id: 'reports' as View, countKey: 'reports' },
      { icon: '💰', label: 'Financials', id: 'financials' as View },
      { icon: '📊', label: 'Retention', id: 'retention' as View },
      { icon: '💼', label: 'Jobs', id: 'jobs' as View },
      { icon: '🏠', label: 'Property', id: 'property' as View },
      { icon: '📋', label: 'Audit', id: 'audit' as View },
      { icon: '🛡️', label: 'Compliance', id: 'compliance' as View },
    ],
  },
  {
    label: 'Activity',
    items: [
      { icon: '📅', label: 'Calendar', id: 'calendar' as View },
      { icon: '✅', label: 'To Do', id: 'todo' as View },
      { icon: '💬', label: 'Chats', id: 'messages' as View },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: '📧', label: 'E-shots', id: 'emails' as View },
      { icon: '🏠', label: 'Homepage', id: 'homepage' as View },
      { icon: '🎯', label: 'Banners', id: 'banners' as View },
      { icon: '📰', label: 'Guides', id: 'community' as View },
    ],
  },
]

interface Props {
  activeView: View
  onViewChange: (v: View) => void
  counts: { pipeline: number; disputes: number; reports: number }
}

export default function AdminSidebar({ activeView, onViewChange, counts }: Props) {
  return (
    <aside style={{
      background: '#fff', borderRight: '1px solid #eee',
      padding: '16px 0', display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 52px)', position: 'sticky', top: 52,
    }}>
      {sections.map(section => (
        <div key={section.label} style={{ padding: '0 8px', marginBottom: 20 }}>
          <div style={{
            fontSize: 9, letterSpacing: 2, color: '#FF4500', textTransform: 'uppercase',
            marginBottom: 6, fontFamily: 'var(--font-ui)', fontWeight: 800,
            padding: '0 4px', textAlign: 'center',
          }}>
            {section.label}
          </div>
          {section.items.map(item => {
            const count = item.countKey ? counts[item.countKey as keyof typeof counts] : 0
            const isActive = activeView === item.id
            return (
              <button key={item.id} onClick={() => onViewChange(item.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 4px', borderRadius: 10, width: '100%',
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                color: isActive ? '#FF4500' : '#555',
                background: isActive ? '#FFF3EE' : 'none',
                border: 'none', cursor: 'pointer', marginBottom: 2,
                textAlign: 'center', position: 'relative',
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
                {count > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 6,
                    background: '#FF4500', color: '#fff',
                    borderRadius: 50, padding: '1px 5px', fontSize: 8, fontWeight: 900,
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      ))}
      <div style={{ padding: 8, marginTop: 'auto', borderTop: '1px solid #f0f0f0' }}>
        <button onClick={() => onViewChange('toolbox')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 4, padding: '8px 4px', borderRadius: 10, width: '100%',
          fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800,
          color: '#FF4500', background: '#FFF3EE', border: '1.5px solid #FF4500', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 20 }}>🧰</span>
          Toolbox
        </button>
      </div>
    </aside>
  )
}
