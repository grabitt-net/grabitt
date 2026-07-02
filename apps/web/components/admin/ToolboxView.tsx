'use client'
import { useState, useEffect } from 'react'

type ToolboxTab = 'theme' | 'layout' | 'content'

const THEME_PRESETS = [
  { name: 'Grabitt', primary: '#FF4500', secondary: '#FF8C00', bg: '#F9F5F0', dark: '#1a1a1a' },
  { name: 'Ocean', primary: '#0066cc', secondary: '#00a8e8', bg: '#F0F6FF', dark: '#0a1628' },
  { name: 'Midnight', primary: '#7c3aed', secondary: '#a855f7', bg: '#F5F0FF', dark: '#1e1b4b' },
  { name: 'Forest', primary: '#16a34a', secondary: '#22c55e', bg: '#F0FDF4', dark: '#052e16' },
]

const DEFAULT_LAYOUT = [
  { id: 'funnel', label: '🚰 Pipeline', visible: true },
  { id: 'pipeline', label: '🤞 Prospects', visible: true },
  { id: 'contacts', label: '🙋 Contacts', visible: true },
  { id: 'forecast', label: '📈 Forecast', visible: true },
  { id: 'members', label: '🪪 Members', visible: true },
  { id: 'disputes', label: '⚖️ Disputes', visible: true },
  { id: 'reports', label: '🚨 Reports', visible: true },
  { id: 'rewards', label: '🎁 Rewards', visible: false },
  { id: 'financials', label: '💰 Financials', visible: true },
  { id: 'retention', label: '📊 Retention', visible: true },
]

function calcPaleTint(hex: string, factor = 0.9): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const blend = (c: number) => Math.round(c + (255 - c) * factor)
  return `#${blend(r).toString(16).padStart(2, '0')}${blend(g).toString(16).padStart(2, '0')}${blend(b).toString(16).padStart(2, '0')}`
}

export default function ToolboxView() {
  const [tab, setTab] = useState<ToolboxTab>('theme')
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customPrimary, setCustomPrimary] = useState('#FF4500')
  const [customSecondary, setCustomSecondary] = useState('#FF8C00')
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [saved, setSaved] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const currentPreset = THEME_PRESETS[selectedPreset]

  function applyColour(preset: typeof THEME_PRESETS[0]) {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--orange', preset.primary)
    document.documentElement.style.setProperty('--orange2', preset.secondary)
    document.documentElement.style.setProperty('--sand', preset.bg)
    document.documentElement.style.setProperty('--dark', preset.dark)
    localStorage.setItem('grabitt_exec_theme', JSON.stringify(preset))
  }

  function saveTheme() {
    const preset = selectedPreset === -1
      ? { name: 'Custom', primary: customPrimary, secondary: customSecondary, bg: calcPaleTint(customPrimary), dark: '#1a1a1a' }
      : THEME_PRESETS[selectedPreset]
    applyColour(preset)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleVisible(id: string) {
    setLayout(l => l.map(item => item.id === id ? { ...item, visible: !item.visible } : item))
  }

  function moveUp(id: string) {
    setLayout(l => {
      const idx = l.findIndex(item => item.id === id)
      if (idx <= 0) return l
      const next = [...l]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDown(id: string) {
    setLayout(l => {
      const idx = l.findIndex(item => item.id === id)
      if (idx >= l.length - 1) return l
      const next = [...l]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>🧰 Toolbox</span>
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['theme', 'layout', 'content'] as ToolboxTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, background: tab === t ? 'var(--orange)' : '#fff', color: tab === t ? '#fff' : '#666', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === 'theme' && (
        <>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preset themes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {THEME_PRESETS.map((preset, i) => (
                <button key={preset.name} onClick={() => setSelectedPreset(i)} style={{ padding: 14, borderRadius: 12, border: `2px solid ${selectedPreset === i ? preset.primary : '#e5e7eb'}`, background: selectedPreset === i ? `${preset.primary}12` : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: preset.primary }} />
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: preset.secondary }} />
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: preset.bg, border: '1px solid #e0d8d0' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: selectedPreset === i ? preset.primary : 'var(--dark)' }}>{preset.name}</span>
                  </div>
                  <div style={{ height: 6, background: calcPaleTint(preset.primary), borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', background: preset.primary, borderRadius: 3 }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Custom colours</div>
            {[['Primary', customPrimary, setCustomPrimary], ['Secondary', customSecondary, setCustomSecondary]].map(([label, val, setter]) => (
              <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', width: 80 }}>{String(label)}</div>
                <input type="color" value={val as string} onChange={e => { (setter as (v: string) => void)(e.target.value); setSelectedPreset(-1 as unknown as number) }} style={{ width: 40, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#888' }}>{String(val)}</span>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: String(val) }} />
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#aaa' }}>Tint: {calcPaleTint(String(val))}</div>
              </div>
            ))}
          </div>

          <button onClick={saveTheme} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
            {saved ? '✅ Theme applied!' : '🎨 Apply Theme'}
          </button>
        </>
      )}

      {tab === 'layout' && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sidebar order</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 16 }}>Reorder views. Hidden views won't appear in the sidebar.</div>
          {layout.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => moveUp(item.id)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#e0d8d0' : '#666', fontSize: 12, padding: '1px 4px' }}>▲</button>
                <button onClick={() => moveDown(item.id)} disabled={i === layout.length - 1} style={{ background: 'none', border: 'none', cursor: i === layout.length - 1 ? 'default' : 'pointer', color: i === layout.length - 1 ? '#e0d8d0' : '#666', fontSize: 12, padding: '1px 4px' }}>▼</button>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 13, color: item.visible ? 'var(--dark)' : '#bbb', fontWeight: item.visible ? 800 : 400 }}>{item.label}</div>
              <button onClick={() => toggleVisible(item.id)} style={{ background: item.visible ? '#d1fae5' : '#f0f0f0', color: item.visible ? '#065f46' : '#888', border: 'none', borderRadius: 50, padding: '4px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}>{item.visible ? 'Visible' : 'Hidden'}</button>
            </div>
          ))}
          <button onClick={() => setSaved(true)} style={{ marginTop: 16, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
            {saved ? '✅ Saved!' : 'Save Layout'}
          </button>
        </div>
      )}

      {tab === 'content' && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Platform content</div>
          {[
            { label: 'Welcome message', placeholder: 'Message shown on homepage to new visitors…', rows: 3 },
            { label: 'Seller fees copy', placeholder: 'Fee description shown in the listing form…', rows: 2 },
            { label: 'Footer announcement', placeholder: 'e.g. "Summer sale — fees reduced until August!"', rows: 2 },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>{f.label}</div>
              <textarea placeholder={f.placeholder} rows={f.rows} style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Save Content</button>
        </div>
      )}
    </div>
  )
}
