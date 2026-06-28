'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Topbar() {
  const [query, setQuery] = useState('')

  return (
    <header style={{
      background: 'var(--sand)',
      padding: '10px 14px 8px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1.5px solid var(--sand2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>
            <span style={{ color: 'var(--orange)' }}>G</span>
            <span style={{ color: 'var(--dark)' }}>rabitt</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={iconBtn}>🔔</button>
          <button style={iconBtn}>💬</button>
          <Link href="/auth">
            <button style={iconBtn}>👤</button>
          </Link>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', borderRadius: 50, padding: '10px 16px',
        gap: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search Grabitt..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontFamily: 'var(--font-nunito)', fontSize: 14,
            color: 'var(--dark)', background: 'transparent',
          }}
        />
        <button style={{
          background: 'var(--orange)', border: 'none', borderRadius: 50,
          padding: '6px 14px', fontFamily: 'var(--font-nunito)',
          fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer',
        }}>Search</button>
      </div>
    </header>
  )
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%',
  background: '#fff', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}
