'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props { banners: any[]; contacts: any[] }

export default function BannersView({ banners: initial, contacts }: Props) {
  const [banners, setBanners] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ slot: '', title: '', link_url: '', rented_to: '', monthly_rate: '', starts_at: '', ends_at: '', active: true })
  const [saving, setSaving] = useState(false)

  const totalMRR = banners.filter(b => b.active).reduce((s, b) => s + Number(b.monthly_rate ?? 0), 0)

  async function addBanner() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('banners').insert({
      ...form,
      monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : null,
      rented_to: form.rented_to || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    }).select('*, crm_contacts!rented_to(name, company)').single()
    setSaving(false)
    if (!error && data) {
      setBanners(prev => [data, ...prev])
      setShowAdd(false)
      setForm({ slot: '', title: '', link_url: '', rented_to: '', monthly_rate: '', starts_at: '', ends_at: '', active: true })
    }
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('banners').update({ active: !active }).eq('id', id)
    setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !active } : b))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700 }}>
            <span style={{ color: '#FF4500' }}>Banner</span> Inventory
          </h2>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888' }}>
            Ad MRR: <strong style={{ color: '#16a34a' }}>€{totalMRR.toLocaleString()}</strong>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: '#FF4500', color: '#fff', border: 'none',
          borderRadius: 50, padding: '8px 16px',
          fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        }}>+ New Slot</button>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, marginBottom: 12 }}>Add Banner Slot</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            {[
              ['slot', 'Slot ID', 'text'],
              ['title', 'Title / Description', 'text'],
              ['link_url', 'Destination URL', 'url'],
              ['monthly_rate', 'Monthly Rate (€)', 'number'],
              ['starts_at', 'Start Date', 'date'],
              ['ends_at', 'End Date', 'date'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-nunito)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-nunito)', fontSize: 12, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-nunito)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rented To</label>
              <select value={form.rented_to} onChange={e => setForm(f => ({ ...f, rented_to: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-nunito)', fontSize: 12 }}>
                <option value="">None / Available</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            <button onClick={addBanner} disabled={saving || !form.slot} style={{ padding: '7px 18px', borderRadius: 50, border: 'none', background: '#FF4500', color: '#fff', fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: saving || !form.slot ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add Slot'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {banners.map(b => (
          <div key={b.id} style={{
            background: '#fff', borderRadius: 12, padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            borderTop: `4px solid ${b.active ? '#FF4500' : '#e5e7eb'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 900, fontSize: 12, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 0.5 }}>{b.slot}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 13, marginTop: 2 }}>{b.title ?? '—'}</div>
              </div>
              <button onClick={() => toggle(b.id, b.active)} style={{
                padding: '3px 10px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-nunito)',
                background: b.active ? '#f0faf4' : '#f5f5f5', color: b.active ? '#16a34a' : '#aaa',
              }}>{b.active ? 'Live' : 'Off'}</button>
            </div>
            {b.crm_contacts && (
              <div style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-nunito)', marginBottom: 4 }}>
                📌 {b.crm_contacts.name} — {b.crm_contacts.company}
              </div>
            )}
            {b.monthly_rate && (
              <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 900, fontSize: 14, color: '#16a34a' }}>
                €{Number(b.monthly_rate).toLocaleString()}/mo
              </div>
            )}
            {(b.starts_at || b.ends_at) && (
              <div style={{ fontSize: 9, color: '#aaa', marginTop: 4, fontFamily: 'var(--font-nunito)' }}>
                {b.starts_at ? new Date(b.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '?'}
                {' → '}
                {b.ends_at ? new Date(b.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '?'}
              </div>
            )}
          </div>
        ))}
        {banners.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#ccc', fontFamily: 'var(--font-nunito)', fontWeight: 800 }}>
            No banner slots yet
          </div>
        )}
      </div>
    </div>
  )
}
