'use client'
import { useState } from 'react'
import ContactCard from './ContactCard'
import ContactModal from './ContactModal'
import { useCrmApi } from './AdminApp'

const stages = [
  { id: 'lead', label: 'Lead', color: '#94a3b8' },
  { id: 'qualified', label: 'Qualified', color: '#14b8a6' },
  { id: 'pitch', label: 'Pitch', color: '#3b82f6' },
  { id: 'proposal', label: 'Proposal', color: '#eab308' },
  { id: 'close', label: 'Close', color: '#f97316' },
  { id: 'won', label: 'Won ✅', color: '#22c55e' },
  { id: 'nurture', label: 'Nurture', color: '#a855f7' },
]

interface Props { contacts: any[]; onUpdate: (contacts: any[]) => void }

export default function PipelineView({ contacts, onUpdate }: Props) {
  const api = useCrmApi()
  const [activeStage, setActiveStage] = useState('lead')
  const [editingContact, setEditingContact] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)

  const filtered = contacts.filter(c => c.stage === activeStage)
  const stageInfo = stages.find(s => s.id === activeStage)!

  return (
    <div>
      {/* Stage tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
        {stages.map(s => {
          const count = contacts.filter(c => c.stage === s.id).length
          const isActive = activeStage === s.id
          return (
            <button key={s.id} onClick={() => setActiveStage(s.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '8px 6px', borderRadius: 50, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
              background: isActive ? s.color : '#fff', color: isActive ? '#fff' : '#666',
              border: `2px solid ${isActive ? s.color : 'transparent'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.6)' : s.color }} />
              {s.label}
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : '#f0f0f0',
                borderRadius: 50, padding: '1px 7px', fontSize: 10,
                color: isActive ? '#fff' : '#666',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: stageInfo.color }}>{stageInfo.label}</span>
        </h2>
        <span style={{ fontSize: 12, color: '#aaa', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>
          {filtered.length} contacts
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#bbb' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🤞</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700 }}>No contacts in this stage</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {filtered.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              stageColor={stageInfo.color}
              onClick={() => { setEditingContact(contact); setShowModal(true) }}
              onStageChange={async (id, newStage) => {
                onUpdate(contacts.map(c => c.id === id ? { ...c, stage: newStage } : c))
                await api.moveStage(id, newStage)
              }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ContactModal
          contact={editingContact}
          onClose={() => { setShowModal(false); setEditingContact(null) }}
          onSave={async (updated) => {
            const saved = await api.upsertContact(updated)
            onUpdate(contacts.map(c => c.id === (saved?.id ?? updated.id) ? { ...c, ...saved } : c))
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
