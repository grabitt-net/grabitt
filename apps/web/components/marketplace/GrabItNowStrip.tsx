'use client'
import { useState, useEffect } from 'react'
import { usePanel } from '@/context/PanelContext'

function getSecondsUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

function formatCountdown(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, '0')
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function GrabItNowStrip() {
  const { openPanel } = usePanel()
  // Seed with null so the server-rendered HTML and the first client render
  // match (both show the placeholder). Computing the live countdown during the
  // initial render would differ between server and client time → hydration
  // mismatch (React #418/#423/#425). The real value is set after mount.
  const [secs, setSecs] = useState<number | null>(null)

  useEffect(() => {
    setSecs(getSecondsUntilMidnight())
    const id = setInterval(() => setSecs(s => (s !== null && s > 0) ? s - 1 : getSecondsUntilMidnight()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      onClick={() => openPanel('grabit')}
      style={{
        background: 'linear-gradient(90deg,var(--orange),var(--orange2))',
        padding: '10px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            Grab It Now!
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
            Flash deals — today only
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '5px 10px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>
          {secs === null ? '--:--:--' : formatCountdown(secs)}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
          ENDS MIDNIGHT
        </div>
      </div>
    </div>
  )
}
