'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const stages = ['prospect','free-trial','contacted','interested','negotiating','highly-likely','signed']

interface Props {
  contact: any | null
  onClose: () => void
  onSave: (contact: any) => void
}

export default function ContactModal({ contact, onClose, onSave }: Props) {
  const isNew = !contact
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    company: contact?.company ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    stage: contact?.stage ?? 'prospect',
    monthly_value: contact?.monthly_value ?? '',
    notes: contact?.notes ?? '',
    follow_up_date: contact?.follow_up_date ? contact.follow_up_date.slice(0, 10) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const field = (key: keyof typeof form, label: string, type = 'text', opts?: any) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#888', fontFamily: 'var(--font-nunito)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {opts?.type === 'select' ? (
        <select
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-nunito)', fontSize: 13 }}
        >
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : opts?.type === 'textarea' ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={3}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, boxSizing: 'border-box' }}
        />
      )}
    </div>
  )

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      ...form,
      monthly_value: form.monthly_value ? Number(form.monthly_value) : null,
      follow_up_date: form.follow_up_date || null,
    }

    let result
    if (isNew) {
      result = await supabase.from('crm_contacts').insert(payload).select().single()
    } else {
      result = await supabase.from('crm_contacts').update(payload).eq('id', contact.id).select().single()
    }

    if (result.error) { setError(result.error.message); setSaving(false); return }
    onSave(result.data)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700 }}>
            {isNew ? 'Add Contact' : 'Edit Contact'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div style={{ gridColumn: '1/-1' }}>{field('name', 'Full Name')}</div>
          {field('company', 'Company')}
          {field('email', 'Email', 'email')}
          {field('phone', 'Phone', 'tel')}
          <div>{field('stage', 'Stage', 'text', { type: 'select' })}</div>
          <div>{field('monthly_value', 'Monthly Value (€)', 'number')}</div>
          <div>{field('follow_up_date', 'Follow-up Date', 'date')}</div>
          <div style={{ gridColumn: '1/-1' }}>{field('notes', 'Notes', 'text', { type: 'textarea' })}</div>
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'var(--font-nunito)', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 22px', borderRadius: 50, border: 'none',
            background: '#FF4500', color: '#fff',
            fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : isNew ? 'Add Contact' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
