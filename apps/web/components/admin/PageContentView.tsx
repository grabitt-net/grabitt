'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCrmApi } from './AdminApp'
import RichTextEditor from './RichTextEditor'
import { EDITABLE_PAGES } from '@/lib/editablePages'
import { toast } from '@/lib/ui'

// Admin → Page Content. Steve picks a page and edits its whole-page rich text.
// When saved, that page renders this copy instead of the built-in text; clearing
// it (Reset to built-in) removes the override so the original copy returns.
export default function PageContentView() {
  const api = useCrmApi()
  const [sel, setSel] = useState(EDITABLE_PAGES[0].key)
  const [stored, setStored] = useState<Record<string, string>>({})
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = () => {
    setLoading(true)
    api.pageContentAll()
      .then(rows => {
        const map: Record<string, string> = {}
        for (const r of rows) map[r.pageKey] = r.html
        setStored(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When the selected page changes, load its stored copy into the editor.
  useEffect(() => { setHtml(stored[sel] ?? ''); setDirty(false) }, [sel, stored])

  const page = useMemo(() => EDITABLE_PAGES.find(p => p.key === sel)!, [sel])
  const hasOverride = !!stored[sel]

  const save = async () => {
    setSaving(true)
    try {
      await api.savePageContent(sel, html)
      toast(html.trim() ? '✓ Page saved' : '✓ Reset to built-in copy')
      setStored(s => { const n = { ...s }; if (html.trim()) n[sel] = html; else delete n[sel]; return n })
      setDirty(false)
    } catch (e: any) { toast(e?.message ?? 'Could not save.') }
    finally { setSaving(false) }
  }
  const reset = async () => {
    if (!confirm('Reset this page to the original built-in text? Your edits will be removed.')) return
    setHtml(''); setSaving(true)
    try { await api.savePageContent(sel, ''); toast('✓ Reset to built-in copy'); setStored(s => { const n = { ...s }; delete n[sel]; return n }); setDirty(false) }
    catch (e: any) { toast(e?.message ?? 'Could not reset.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a', margin: '0 0 4px' }}>Page Content</h2>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#777', margin: '0 0 16px' }}>
        Edit the words on a page. Pick a page, change the text, and Save — the live page updates. Leave a page untouched and it keeps the copy from the build. Use “Reset to built-in” to undo your edits on a page.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <label style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555' }}>Page</label>
        <select value={sel} onChange={e => setSel(e.target.value)} style={{ border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff' }}>
          {EDITABLE_PAGES.map(p => <option key={p.key} value={p.key}>{p.label}{stored[p.key] ? '  • edited' : ''}</option>)}
        </select>
        <a href={page.path} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--orange)' }}>Open page ↗</a>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 11.5, color: hasOverride ? '#16a34a' : '#999' }}>{hasOverride ? 'Showing your edited copy' : 'Showing the built-in copy'}</span>
      </div>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#aaa', padding: 20 }}>Loading…</div>
      ) : (
        <>
          {!hasOverride && (
            <div style={{ background: '#fff8e6', border: '1px solid #f0e0bd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8a6d3b', marginBottom: 10 }}>
              This page currently uses its original built-in text. Type below and Save to replace it. (The editor starts blank because the built-in copy lives in the app — once you save, your version takes over.)
            </div>
          )}
          <RichTextEditor value={html} onChange={v => { setHtml(v); setDirty(true) }} placeholder="Write this page's content…" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={save} disabled={saving || !dirty} style={{ background: dirty ? '#16a34a' : '#cbd5c0', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: saving || !dirty ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
            {hasOverride && <button onClick={reset} disabled={saving} style={{ background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Reset to built-in</button>}
          </div>
        </>
      )}
    </div>
  )
}
