'use client'
import type { ReactNode } from 'react'

// 50-per-page pager shared by the category and search result pages. Shows
// Prev/Next plus a window of nearby page numbers with First/Last shortcuts.
export default function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  const span = 2
  const from = Math.max(1, page - span)
  const to = Math.min(totalPages, page + span)
  const nums: number[] = []
  for (let i = from; i <= to; i++) nums.push(i)
  const btn = (label: ReactNode, target: number, disabled: boolean, active = false): ReactNode => (
    <button key={`${label}-${target}`} disabled={disabled} onClick={() => onChange(target)} style={{
      minWidth: 34, padding: '7px 11px', borderRadius: 9, cursor: disabled ? 'default' : 'pointer',
      border: `1.5px solid ${active ? 'var(--orange)' : '#e5dccd'}`, background: active ? 'var(--orange)' : '#fff',
      color: active ? '#fff' : disabled ? '#ccc' : '#1a1a1a', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800,
    }}>{label}</button>
  )
  const dots = (k: string) => <span key={k} style={{ color: '#bbb', fontFamily: 'var(--font-nunito)' }}>…</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center', padding: '22px 14px 6px' }}>
      {btn('‹ Prev', page - 1, page <= 1)}
      {from > 1 && btn(1, 1, false, page === 1)}
      {from > 2 && dots('l')}
      {nums.map(n => btn(n, n, false, n === page))}
      {to < totalPages - 1 && dots('r')}
      {to < totalPages && btn(totalPages, totalPages, false, page === totalPages)}
      {btn('Next ›', page + 1, page >= totalPages)}
    </div>
  )
}
