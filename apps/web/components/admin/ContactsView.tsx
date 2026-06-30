'use client'
import { useState } from 'react'
import ContactModal from './ContactModal'

const stageColors: Record<string, string> = {
  prospect: '#94a3b8', 'free-trial': '#14b8a6', contacted: '#3b82f6',
  interested: '#eab308', negotiating: '#f97316', 'highly-likely': '#FF4500', signed: '#22c55e',
}

interface Props { contacts: any[]; onUpdate: (contacts: any[]) => void }

export default function ContactsView({ contacts, onUpdate }: Props) {
  const [search, setSearch] = useState('')
  const [editingContact, setEditingContact] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)

  const filtered = contacts.filter(c =>
    [c.name, c.company, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700 }}>
          All <span style={{ color: '#FF4500' }}>Contacts</span>
        </h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            style={{
              padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 50,
              fontFamily: 'var(--font-nunito)', fontSize: 12, width: 200,
            }}
          />
          <button onClick={() => { setEditingContact(null); setShowModal(true) }} style={{
            background: '#FF4500', color: '#fff', border: 'none',
            borderRadius: 50, padding: '8px 16px',
            fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          }}>
            + Add
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {['Name', 'Company', 'Email', 'Stage', '€/mo', 'Follow-up', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontSize: 9, fontWeight: 800, color: '#aaa',
                  fontFamily: 'var(--font-nunito)', textTransform: 'uppercase', letterSpacing: 0.5,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const followUp = c.follow_up_date ? new Date(c.follow_up_date) : null
              const isOverdue = followUp && followUp < new Date()
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 13 }}>{c.name}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666' }}>{c.company ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888' }}>{c.email ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: `${stageColors[c.stage] ?? '#ccc'}22`,
                      color: stageColors[c.stage] ?? '#ccc',
                      borderRadius: 50, padding: '3px 10px',
                      fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-nunito)',
                    }}>{c.stage}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 12, color: '#16a34a' }}>
                    {c.monthly_value ? `€${Number(c.monthly_value).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11, color: isOverdue ? '#ef4444' : '#666' }}>
                    {followUp ? followUp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => { setEditingContact(c); setShowModal(true) }} style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
                      padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#555',
                      fontFamily: 'var(--font-nunito)', fontWeight: 700,
                    }}>Edit</button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', color: '#ccc', fontFamily: 'var(--font-nunito)', fontSize: 13 }}>
                  No contacts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ContactModal
          contact={editingContact}
          onClose={() => { setShowModal(false); setEditingContact(null) }}
          onSave={updated => {
            if (editingContact) {
              onUpdate(contacts.map(c => c.id === updated.id ? updated : c))
            } else {
              onUpdate([updated, ...contacts])
            }
            setShowModal(false)
            setEditingContact(null)
          }}
        />
      )}
    </div>
  )
}
