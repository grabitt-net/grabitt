'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import {
  validateRows, templateCsv, IMPORT_COLUMNS, DEPARTMENT_HINT, CONDITION_HINT,
  type ParsedRow,
} from '@/lib/bulkImport'

// Bulk listing importer — Business accounts only. Paste or upload a CSV, see a
// validated preview, then import every valid row in one go. Invalid rows are
// flagged inline so the seller can fix and re-import just those.

export default function BulkImportPage() {
  return <PanelProvider><Inner /></PanelProvider>
}

type ImportResult = { created: number; failed: number; results: { index: number; ok: boolean; id?: string; error?: string }[] }

function Inner() {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [ready, setReady] = useState(false)
  const [isBusiness, setIsBusiness] = useState(false)
  const [csv, setCsv] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/sell/import'); return }
      try {
        const u = await (trpcAuthed() as any).users.me.query()
        setIsBusiness(!!u?.isBusiness)
      } catch { /* treat as non-business */ }
      finally { setReady(true) }
    })()
  }, [router])

  const parsed = useMemo(() => csv.trim() ? validateRows(csv) : null, [csv])
  const validRows = parsed?.rows.filter(r => r.errors.length === 0) ?? []
  const invalidRows = parsed?.rows.filter(r => r.errors.length > 0) ?? []

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([templateCsv()], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'grabitt-listings-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCsv(String(ev.target?.result ?? ''))
    reader.readAsText(file)
  }, [])

  const runImport = useCallback(async () => {
    if (!validRows.length) return
    setImporting(true); setErr(''); setResult(null)
    try {
      const res = await (trpcAuthed() as any).listings.bulkImport.mutate({
        rows: validRows.map(r => r.mapped),
      })
      setResult(res as ImportResult)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed. Please try again.')
    } finally { setImporting(false) }
  }, [validRows])

  if (!ready) return <Shell><div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontFamily: 'var(--font-nunito)' }}>Loading…</div></Shell>

  if (!isBusiness) return (
    <Shell>
      <div style={{ ...card, textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏢</div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', marginBottom: 6 }}>Bulk import is a Business feature</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
          Import your whole catalogue from a spreadsheet in one go. Upgrade to a Business account to unlock bulk import, multibuy pricing and a storefront.
        </div>
        <button onClick={() => openPanel('business')} style={primaryBtn}>Open a Business account</button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Step 1 — template */}
        <div style={card}>
          <div style={stepTitle}>1 · Download the template</div>
          <p style={para}>One row per listing. Fill it in your spreadsheet app, then export as CSV.</p>
          <button onClick={downloadTemplate} style={secondaryBtn}>⬇️ Download CSV template</button>
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--orange)', cursor: 'pointer' }}>Column guide</summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#555', lineHeight: 1.7 }}>
              <li><b>title, description, price, location</b> — required.</li>
              <li><b>department</b> — one of: {DEPARTMENT_HINT}.</li>
              <li><b>condition</b> — one of: {CONDITION_HINT}.</li>
              <li><b>images</b> — one or more public image URLs, separated by <code>|</code>.</li>
              <li><b>stock, brand, colour, size, deliveryFee, autoAcceptMin</b> — optional.</li>
              <li><b>deliveryMethod</b> — <code>courier</code> or <code>in_person</code> (optional).</li>
            </ul>
          </details>
        </div>

        {/* Step 2 — provide the CSV */}
        <div style={card}>
          <div style={stepTitle}>2 · Upload or paste your CSV</div>
          <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, marginBottom: 10 }} />
          <textarea
            value={csv} onChange={e => setCsv(e.target.value)}
            placeholder={`Or paste CSV here — first line must be the header:\n${IMPORT_COLUMNS.join(',')}`}
            rows={6}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: 10, fontFamily: 'monospace', fontSize: 12, outline: 'none', resize: 'vertical' }}
          />
        </div>

        {/* Step 3 — preview + import */}
        {parsed && (
          <div style={card}>
            <div style={stepTitle}>3 · Review &amp; import</div>
            {!parsed.headerOk ? (
              <div style={errorBox}>Your file is missing required column(s): <b>{parsed.missingColumns.join(', ')}</b>. Download the template and match the header row.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <Stat n={validRows.length} label="ready to import" tone="ok" />
                  <Stat n={invalidRows.length} label="need fixing" tone={invalidRows.length ? 'bad' : 'muted'} />
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #ece3d7', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-nunito)', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#faf6f0', textAlign: 'left' }}>
                        <th style={th}>#</th><th style={th}>Status</th><th style={th}>Title</th><th style={th}>Price</th><th style={th}>Dept</th><th style={th}>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.map(r => <Row key={r.index} r={r} />)}
                    </tbody>
                  </table>
                </div>

                {err && <div style={{ ...errorBox, marginTop: 10 }}>{err}</div>}

                <button onClick={runImport} disabled={!validRows.length || importing}
                  style={{ ...primaryBtn, width: '100%', marginTop: 12, opacity: (!validRows.length || importing) ? 0.5 : 1, cursor: (!validRows.length || importing) ? 'default' : 'pointer' }}>
                  {importing ? 'Importing…' : `Import ${validRows.length} listing${validRows.length === 1 ? '' : 's'}`}
                </button>
              </>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={card}>
            <div style={stepTitle}>Import complete</div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: '#333', lineHeight: 1.7 }}>
              ✅ <b>{result.created}</b> listing{result.created === 1 ? '' : 's'} created{result.failed ? <> · ❌ <b>{result.failed}</b> failed</> : ''}.
            </div>
            {result.failed > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#c0392b', lineHeight: 1.6 }}>
                {result.results.filter(x => !x.ok).map(x => <li key={x.index}>Row {x.index + 1}: {x.error}</li>)}
              </ul>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Link href="/account" style={{ ...secondaryBtn, textDecoration: 'none', textAlign: 'center' }}>View my listings</Link>
              <button onClick={() => { setCsv(''); setResult(null) }} style={secondaryBtn}>Import more</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Row({ r }: { r: ParsedRow }) {
  const ok = r.errors.length === 0
  return (
    <tr style={{ borderTop: '1px solid #f0ebe3', background: ok ? '#fff' : '#fff7f6' }}>
      <td style={td}>{r.index + 1}</td>
      <td style={td}>{ok ? <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span> : <span style={{ color: '#c0392b', fontWeight: 900 }}>✕</span>}</td>
      <td style={{ ...td, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.raw.title || '—'}</td>
      <td style={td}>{r.raw.price || '—'}</td>
      <td style={td}>{r.raw.department || '—'}</td>
      <td style={{ ...td, color: '#c0392b', fontSize: 11 }}>{r.errors.join('; ')}</td>
    </tr>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone: 'ok' | 'bad' | 'muted' }) {
  const c = tone === 'ok' ? '#16a34a' : tone === 'bad' ? '#c0392b' : '#999'
  return (
    <div style={{ background: '#faf6f0', borderRadius: 10, padding: '8px 14px', minWidth: 90 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: c }}>{n}</div>
      <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 10.5, color: '#777' }}>{label}</div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Bulk import" />
      <div style={{ padding: '14px' }}>{children}</div>
      <Footer />
      <PanelHost />
    </main>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }
const stepTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--orange)', marginBottom: 8 }
const para: React.CSSProperties = { fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#555', lineHeight: 1.6, margin: '0 0 12px' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { background: '#fff', color: '#555', border: '1.5px solid var(--sand2)', borderRadius: 12, padding: '10px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }
const errorBox: React.CSSProperties = { background: '#fff2f2', border: '1px solid #f5c6c6', borderRadius: 10, padding: 12, fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#a11', lineHeight: 1.55 }
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 800, color: '#777', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '7px 10px', color: 'var(--dark)', verticalAlign: 'top' }
