'use client'
import { useState } from 'react'

const MOCK_AUDIT = [
  { id: 'a1', member: 'Alex Thompson', initial: 'A', action: 'Listing approved: "Sony PlayStation 5"', time: '2 min ago', by: 'Admin' },
  { id: 'a2', member: 'Sarah Mitchell', initial: 'S', action: 'Account suspended for 7 days — repeated no-shows', time: '18 min ago', by: 'Admin' },
  { id: 'a3', member: 'James Rodriguez', initial: 'J', action: 'Dispute resolved — refund issued to buyer', time: '1 hour ago', by: 'Admin' },
  { id: 'a4', member: 'Emma Wilson', initial: 'E', action: 'Grade upgraded: Grabber → Dealer', time: '3 hours ago', by: 'System' },
  { id: 'a5', member: 'Mark Davies', initial: 'M', action: 'Ban applied — fraudulent listings', time: '5 hours ago', by: 'Admin' },
  { id: 'a6', member: 'Laura Chen', initial: 'L', action: 'Follow-up scheduled: 15 Jul 2026', time: 'Yesterday', by: 'Admin' },
  { id: 'a7', member: 'Peter Novak', initial: 'P', action: 'Listing removed: "Fake Rolex Watch"', time: 'Yesterday', by: 'Admin' },
  { id: 'a8', member: 'Niamh Brady', initial: 'N', action: 'Strike issued — misleading description', time: '2 days ago', by: 'Admin' },
  { id: 'a9', member: 'Carlos Pérez', initial: 'C', action: 'Message sent via WhatsApp re: handover', time: '2 days ago', by: 'Admin' },
  { id: 'a10', member: 'Fiona Campbell', initial: 'F', action: 'Review flag cleared — resolved by seller', time: '3 days ago', by: 'System' },
]

interface AuditEntry {
  id: string
  member: string
  initial: string
  action: string
  time: string
  by: string
}

interface Props {
  onViewMember?: (name: string) => void
}

export default function AuditTrailView({ onViewMember }: Props) {
  const [entries] = useState<AuditEntry[]>(MOCK_AUDIT)
  const [search, setSearch] = useState('')

  const filtered = search
    ? entries.filter(e => [e.member, e.action].some(v => v.toLowerCase().includes(search.toLowerCase())))
    : entries

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Audit</span> Trail
        </h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit log…"
          style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 50, fontFamily: 'var(--font-ui)', fontSize: 12, width: 200, outline: 'none' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#ccc', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No audit entries found</div>
        ) : (
          filtered.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              {/* Avatar */}
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#FF4500', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {e.initial}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 13, color: '#1a1a1a' }}>{e.member}</div>
                <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 11, color: '#555', marginTop: 2, lineHeight: 1.4 }}>{e.action}</div>
              </div>
              {/* Time + by */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, color: '#bbb' }}>{e.time}</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, color: '#ccc', marginTop: 2 }}>by {e.by}</div>
                {onViewMember && (
                  <button onClick={() => onViewMember(e.member)} style={{ background: 'none', border: 'none', color: '#FF4500', fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, cursor: 'pointer', marginTop: 4, padding: 0 }}>
                    View →
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
