'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { View } from './AdminApp'

// ⌘K / Ctrl-K command palette — jump to any view by typing. Keeps the growing
// suite navigable without hunting the sidebar.
export type Command = { id: View; label: string; icon: string; group: string; keywords?: string }

export default function CommandPalette({ commands, onRun, open, setOpen }: { commands: Command[]; onRun: (v: View) => void; open: boolean; setOpen: (v: boolean) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global hotkey: ⌘K / Ctrl-K toggles, "/" opens when not typing elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setOpen(!open)
      } else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 20) } }, [open])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return commands
    return commands.filter(c => (c.label + ' ' + c.group + ' ' + (c.keywords ?? '')).toLowerCase().includes(s))
  }, [q, commands])

  useEffect(() => { if (active >= results.length) setActive(0) }, [results.length, active])

  const run = (v: View) => { onRun(v); setOpen(false) }

  if (!open) return null
  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 92vw)', background: '#fff', borderRadius: 14, boxShadow: '0 24px 70px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setActive(0) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && results[active]) { e.preventDefault(); run(results[active].id) }
          }}
          placeholder="Jump to… (type a view name)"
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', borderBottom: '1px solid #eee', padding: '16px 18px', fontFamily: 'var(--font-ui)', fontSize: 15, outline: 'none' }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 && <div style={{ padding: 22, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa' }}>No matches.</div>}
          {results.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: i === active ? '#FFF3EE' : 'none', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 700, color: '#1a1a1a' }}>{c.label}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.group}</span>
            </button>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 14px', display: 'flex', gap: 14, fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa' }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span><span style={{ marginLeft: 'auto' }}>⌘K</span>
        </div>
      </div>
    </div>
  )
}
