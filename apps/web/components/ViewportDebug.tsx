'use client'
import { useEffect, useState } from 'react'

// Temporary diagnostic: shows the real CSS viewport width, physical pixels and
// which header layout is active. Only rendered when the URL contains ?vw, so it
// is invisible to normal visitors. Used to diagnose why tablets render the
// phone chrome. Safe to delete once the responsive breakpoint is confirmed.
export default function ViewportDebug() {
  const [info, setInfo] = useState<string>('')

  useEffect(() => {
    if (!new URLSearchParams(location.search).has('vw')) return
    const update = () => {
      const w = window.innerWidth
      const dpr = window.devicePixelRatio
      const nav = document.querySelector('.desktop-nav')
      const layout = nav && getComputedStyle(nav).display !== 'none' ? 'DESKTOP' : 'MOBILE'
      setInfo(
        `CSS width: ${w}px · DPR: ${dpr} · physical: ${Math.round(w * dpr)}px\n` +
        `screen: ${window.screen.width}×${window.screen.height} · layout: ${layout}`
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!info) return null
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.85)', color: '#0f0', font: '12px/1.4 monospace',
      padding: '8px 12px', whiteSpace: 'pre-wrap', textAlign: 'center',
    }}>{info}</div>
  )
}
