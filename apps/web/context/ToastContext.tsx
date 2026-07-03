'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Toast { id: number; msg: string }

const ToastContext = createContext<{ toast: (msg: string) => void }>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 88, left: 0, right: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: 50,
            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, maxWidth: '88%',
            boxShadow: '0 6px 24px rgba(0,0,0,0.3)', animation: 'fadeUp 0.25s ease both',
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext).toast
}
