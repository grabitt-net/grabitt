'use client'
import type { CSSProperties, ReactNode } from 'react'
import Icon from './Icon'

// Location label with the map-pin SVG icon (replaces the 📍 emoji used across
// listing cards and detail pages). Inherits colour/size from its parent via
// currentColor + em-relative icon sizing.
export default function Place({ children, size = 12, style, wrap = false }: { children: ReactNode; size?: number; style?: CSSProperties; wrap?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: wrap ? 'flex-start' : 'center', gap: 4, minWidth: 0, ...style }}>
      <Icon name="mapPin" size={size} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.75, marginTop: wrap ? 2 : 0 }} />
      {wrap
        ? <span style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{children}</span>
        : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>}
    </span>
  )
}
