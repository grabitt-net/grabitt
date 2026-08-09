'use client'
import { useEffect, useState } from 'react'

// Imperative toast + confirm so any module can call them without threading a
// hook through props — replaces the native alert()/confirm() dialogs. A single
// <UiHost/> (mounted in the root layout) registers the handlers and renders the
// toast stack + the styled confirm modal.

type ToastType = 'info' | 'success' | 'error'
type ConfirmOpts = { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }

let _toast: ((msg: string, type: ToastType) => void) | null = null
let _confirm: ((opts: ConfirmOpts) => Promise<boolean>) | null = null

/** Non-blocking toast. Falls back to alert() only if the host isn't mounted. */
export function toast(msg: string, type: ToastType = 'info') {
  if (_toast) _toast(msg, type)
  else if (typeof window !== 'undefined') window.alert(msg)
}

/** Styled confirm dialog → Promise<boolean>. Accepts a string or options. */
export function confirmDialog(opts: ConfirmOpts | string): Promise<boolean> {
  const o = typeof opts === 'string' ? { message: opts } : opts
  if (_confirm) return _confirm(o)
  return Promise.resolve(typeof window !== 'undefined' ? window.confirm(o.message) : false)
}

type ToastItem = { id: number; msg: string; type: ToastType }

export function UiHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialog, setDialog] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null)

  useEffect(() => {
    _toast = (msg, type) => {
      const id = Date.now() + Math.random()
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200)
    }
    _confirm = opts => new Promise<boolean>(resolve => setDialog({ opts, resolve }))
    return () => { _toast = null; _confirm = null }
  }, [])

  const close = (v: boolean) => { dialog?.resolve(v); setDialog(null) }

  return (
    <>
      {/* Toasts — polite live region, never steal focus */}
      <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', left: 0, right: 0, bottom: 18, zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none', padding: '0 12px' }}>
        {toasts.map(t => {
          const c = t.type === 'error' ? '#DC2626' : t.type === 'success' ? '#16A34A' : '#0F172A'
          return (
            <div key={t.id} role={t.type === 'error' ? 'alert' : undefined} style={{
              pointerEvents: 'auto', maxWidth: 420, width: 'fit-content',
              background: '#fff', color: 'var(--dark)', border: `1px solid var(--line)`, borderLeft: `4px solid ${c}`,
              borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: '11px 15px',
              fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 600, lineHeight: 1.4,
              animation: 'toastIn 0.22s ease',
            }}>{t.msg}</div>
          )
        })}
      </div>

      {/* Confirm modal */}
      {dialog && (
        <div onClick={() => close(false)} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 400, padding: 22, animation: 'dialogIn 0.2s ease' }}>
            {dialog.opts.title && <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>{dialog.opts.title}</div>}
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 20 }}>{dialog.opts.message}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary btn--md" onClick={() => close(false)}>{dialog.opts.cancelLabel ?? 'Cancel'}</button>
              <button className={`btn btn--md ${dialog.opts.danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => close(true)} autoFocus>{dialog.opts.confirmLabel ?? 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes dialogIn { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { [style*="toastIn"], [style*="dialogIn"] { animation: none !important } }
      `}</style>
    </>
  )
}
