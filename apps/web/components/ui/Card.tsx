'use client'
import type { CSSProperties, ReactNode } from 'react'

// Token-driven surface primitive: consistent border, radius and shadow. Prefer
// this over re-declaring the same card style inline on every screen.
export default function Card({ children, style, padded = true, className }: {
  children: ReactNode; style?: CSSProperties; padded?: boolean; className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)', padding: padded ? 18 : 0, ...style,
      }}
    >
      {children}
    </div>
  )
}
