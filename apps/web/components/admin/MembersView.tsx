'use client'
import { useState } from 'react'

const filters = ['All', 'Active', 'Sellers', 'Buyers', 'New']

const gradeColors: Record<string, string> = {
  bronze: '#cd7f32', silver: '#999', gold: '#f59e0b', platinum: '#7c3aed',
}

interface Props { members: any[] }

export default function MembersView({ members }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const filtered = members.filter(m => {
    const matchSearch = [m.full_name, m.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    if (!matchSearch) return false
    if (filter === 'Sellers') return m.is_seller
    if (filter === 'Buyers') return !m.is_seller
    if (filter === 'Active') return m.status === 'active'
    if (filter === 'New') return new Date(m.created_at) > thirtyDaysAgo
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Members</span>
          <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>{members.length} total</span>
        </h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search members…"
          style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 50, fontFamily: 'var(--font-ui)', fontSize: 12, width: 200 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11,
            background: filter === f ? '#FF4500' : '#fff', color: filter === f ? '#fff' : '#666',
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {['Member', 'Email', 'Grade', 'Type', 'Joined', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13 }}>
                  {m.full_name ?? 'Anonymous'}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>{m.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  {m.grade && (
                    <span style={{
                      color: gradeColors[m.grade] ?? '#aaa',
                      fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 11,
                      textTransform: 'capitalize',
                    }}>{m.grade}</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: m.is_seller ? '#f0faf4' : '#eff6ff',
                    color: m.is_seller ? '#16a34a' : '#2563eb',
                    borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)',
                  }}>
                    {m.is_seller ? 'Seller' : 'Buyer'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, color: '#999' }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: (m.status ?? 'active') === 'active' ? '#f0faf4' : '#fef2f2',
                    color: (m.status ?? 'active') === 'active' ? '#16a34a' : '#ef4444',
                    borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)',
                  }}>
                    {m.status ?? 'active'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', color: '#ccc', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
