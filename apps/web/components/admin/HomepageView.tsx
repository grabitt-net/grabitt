'use client'
import { useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

type Section = { key: string; label: string; enabled: boolean; sortOrder: number }

export default function HomepageView() {
  const api = useCrmApi()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.homeSections()
      .then(d => setSections(((d ?? []) as Section[]).sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch(() => setSections([]))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next); setDirty(true); setSaved(false)
  }
  const toggle = (i: number) => {
    const next = sections.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s)
    setSections(next); setDirty(true); setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.saveHomeSections(sections.map((s, i) => ({ key: s.key, enabled: s.enabled, sortOrder: i })))
      setDirty(false); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#FF4500' }}>Homepage</span> layout</h2>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Show/hide and reorder the sections of the public homepage.</div>
        </div>
        <button onClick={save} disabled={!dirty || saving} style={{ background: !dirty || saving ? '#e5e7eb' : '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '9px 20px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: !dirty || saving ? 'default' : 'pointer' }}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save layout'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ maxWidth: 560, marginTop: 12 }}>
          {sections.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #ece3d7', borderRadius: 12, padding: '12px 14px', marginBottom: 8, opacity: s.enabled ? 1 : 0.6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={arrow(i === 0)}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} style={arrow(i === sections.length - 1)}>▼</button>
              </div>
              <div style={{ width: 22, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#bbb' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, color: 'var(--dark)' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa' }}>{s.key}</div>
              </div>
              <button onClick={() => toggle(i)} style={{ background: s.enabled ? '#f0faf4' : '#f5f5f5', color: s.enabled ? '#16a34a' : '#aaa', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                {s.enabled ? '● Visible' : '○ Hidden'}
              </button>
            </div>
          ))}
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#999', marginTop: 10 }}>
            Tip: the Hero banner and Mid banner pull their images from the <strong>Banners</strong> tab.
          </div>
        </div>
      )}
    </div>
  )
}

const arrow = (disabled: boolean): React.CSSProperties => ({
  background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
  color: disabled ? '#ddd' : '#FF4500', fontSize: 11, lineHeight: 1, padding: 2,
})
