'use client'
import { usePanel } from '@/context/PanelContext'

export default function Topbar() {
  const { openPanel } = usePanel()

  return (
    <header style={{
      background: 'var(--sand)',
      padding: '10px 14px',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      borderBottom: '1.5px solid var(--sand2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div onClick={() => openPanel('menu')} style={{ cursor: 'pointer' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>
          <span style={{ color: 'var(--orange)' }}>Grab</span>
          <span style={{ color: 'var(--dark)' }}>itt</span>
          <span style={{ color: 'var(--orange)' }}>!</span>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: '#7a6a55', fontWeight: 700, marginTop: 1 }}>
          Your local everything
        </div>
      </div>

      <button
        onClick={() => openPanel('login')}
        style={{
          background: 'var(--orange)',
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          padding: '9px 18px',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        Member
      </button>
    </header>
  )
}
