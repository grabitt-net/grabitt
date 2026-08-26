'use client'
import { useEffect, useState } from 'react'
import type { View } from './AdminApp'

// Collapsible, grouped navigation. Each section expands/collapses so the rail
// stays short and scannable instead of one long wall of icons. Groups follow
// the executive structure; items not in a named group are slotted into the
// closest section so nothing is lost.
type Item = { icon: string; label: string; id: View; countKey?: 'pipeline' | 'disputes' | 'reports' }
type Section = { label: string; items: Item[] }

const SECTIONS: Section[] = [
  {
    label: 'Workspace',
    items: [
      { icon: '📅', label: 'Calendar', id: 'calendar' },
      { icon: '✅', label: 'To Do', id: 'todo' },
      { icon: '💬', label: 'Chats', id: 'messages' },
      { icon: '📋', label: 'Audit', id: 'audit' },
      { icon: '🛡️', label: 'Compliance', id: 'compliance' },
    ],
  },
  {
    label: 'Financials',
    items: [
      { icon: '🚰', label: 'Pipeline', id: 'funnel' },
      { icon: '📈', label: 'Forecast', id: 'forecast' },
      { icon: '🧮', label: 'Planner', id: 'planner' },
      { icon: '💰', label: 'Financials', id: 'financials' },
      { icon: '🏅', label: 'Levels & Fees', id: 'levels' },
      { icon: '📊', label: 'Retention', id: 'retention' },
      { icon: '🔗', label: 'Affiliates', id: 'affiliates' },
    ],
  },
  {
    label: 'People',
    items: [
      { icon: '🪪', label: 'Members', id: 'members' },
      { icon: '🏢', label: 'Business', id: 'business' },
      { icon: '🙋', label: 'Candidates', id: 'candidates' },
      { icon: '🎓', label: 'Applications', id: 'statusapps' },
      { icon: '🎁', label: 'Rewards', id: 'rewards' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { icon: '🤞', label: 'Prospects', id: 'pipeline', countKey: 'pipeline' },
      { icon: '📇', label: 'Contacts', id: 'contacts' },
      { icon: '📨', label: 'Support inbox', id: 'support' },
      { icon: '🖼️', label: 'Homepage', id: 'homepage' },
      { icon: '🎯', label: 'Banners', id: 'banners' },
      { icon: '📰', label: 'Guides', id: 'community' },
      { icon: '🗞️', label: 'News', id: 'news' },
      { icon: '💡', label: 'Economic Living', id: 'economic' },
      { icon: '📅', label: 'Events', id: 'events' },
      { icon: '❓', label: 'Help', id: 'help' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { icon: '💼', label: 'Jobs', id: 'jobs' },
      { icon: '🏠', label: 'Property', id: 'property' },
      { icon: '⚖️', label: 'Disputes', id: 'disputes', countKey: 'disputes' },
      { icon: '🚨', label: 'Reports', id: 'reports', countKey: 'reports' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: '📣', label: 'Sponsorship', id: 'sponsorship' },
      { icon: '📒', label: 'Directory', id: 'directory' },
      { icon: '📨', label: 'Blasts', id: 'blasts' },
      { icon: '📧', label: 'E-shots', id: 'emails' },
    ],
  },
]

const sectionOf = (v: View) => SECTIONS.find(s => s.items.some(i => i.id === v))?.label

interface Props {
  activeView: View
  onViewChange: (v: View) => void
  counts: { pipeline: number; disputes: number; reports: number }
}

export default function AdminSidebar({ activeView, onViewChange, counts }: Props) {
  // Start with only the active view's section open; others collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const active = sectionOf(activeView)
    return Object.fromEntries(SECTIONS.map(s => [s.label, s.label === active]))
  })

  // Navigating (e.g. via ⌘K) into a collapsed section should reveal it.
  useEffect(() => {
    const active = sectionOf(activeView)
    if (active) setOpen(p => (p[active] ? p : { ...p, [active]: true }))
  }, [activeView])

  const toggle = (label: string) => setOpen(p => ({ ...p, [label]: !p[label] }))

  return (
    <aside style={{
      background: '#fff', borderRight: '1px solid var(--line)',
      padding: '10px 8px 8px', display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100vh - 52px)', position: 'sticky', top: 52,
    }}>
      {/* Today — the dashboard, always one click away */}
      <NavRow icon="🧭" label="Today" active={activeView === 'today'} onClick={() => onViewChange('today')} bold />

      <div style={{ height: 6 }} />

      {SECTIONS.map(section => {
        const isOpen = !!open[section.label]
        const hasActive = section.items.some(i => i.id === activeView)
        return (
          <div key={section.label} style={{ marginBottom: 2 }}>
            <button onClick={() => toggle(section.label)} style={{
              display: 'flex', alignItems: 'center', width: '100%', gap: 6,
              padding: '8px 8px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
              textTransform: 'uppercase', color: hasActive ? 'var(--orange)' : '#94A3B8',
            }}>
              <Chevron open={isOpen} />
              <span style={{ flex: 1, textAlign: 'left' }}>{section.label}</span>
            </button>
            {isOpen && (
              <div style={{ paddingBottom: 4 }}>
                {section.items.map(item => (
                  <NavRow
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeView === item.id}
                    count={item.countKey ? counts[item.countKey] : 0}
                    onClick={() => onViewChange(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
        <NavRow icon="🧰" label="Toolbox" active={activeView === 'toolbox'} onClick={() => onViewChange('toolbox')} pinned />
      </div>
    </aside>
  )
}

function NavRow({ icon, label, active, count = 0, onClick, bold, pinned }: {
  icon: string; label: string; active: boolean; count?: number; onClick: () => void; bold?: boolean; pinned?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%',
      padding: bold ? '9px 10px' : '7px 10px 7px 24px', borderRadius: 9,
      fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: active || bold ? 700 : 500,
      color: active ? 'var(--orange)' : pinned ? 'var(--orange)' : 'var(--dark)',
      background: active ? '#FFF3EE' : pinned ? '#FFF7F2' : 'none',
      border: pinned ? '1.5px solid #FFD9C7' : 'none', cursor: 'pointer', marginBottom: 1,
      textAlign: 'left', position: 'relative', transition: 'background 0.12s ease',
    }}>
      <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count > 0 && (
        <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: 50, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{count}</span>
      )}
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
