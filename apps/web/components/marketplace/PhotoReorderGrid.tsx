'use client'
import { useRef, useState } from 'react'

// A drag-and-drop reorderable photo grid used by the item add + edit flows.
// Works with both mouse and touch via Pointer Events (native HTML5 drag doesn't
// fire on touch), so a lister can reorder photos on any device. The parent owns
// the array and upload; this component only handles ordering and removal.
//
// `coverCount` tiles are badged as covers (the first photos shown on the card).
// Reordering is live: as you drag over another tile, the array is spliced so the
// grid reflows under your finger/cursor.
export default function PhotoReorderGrid({
  value,
  onChange,
  coverCount = 3,
  columns = 4,
  tileSize,
  showCoverBadges = true,
}: {
  value: string[]
  onChange: (next: string[]) => void
  coverCount?: number
  columns?: number
  tileSize?: number // fixed px tiles (edit page); omit for a fluid grid
  showCoverBadges?: boolean
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return
    const next = value.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))

  // Which tile is under the given client point (for touch/pointer dragging).
  const indexAtPoint = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)
    const tile = el?.closest('[data-photo-idx]') as HTMLElement | null
    if (!tile) return null
    const idx = Number(tile.dataset.photoIdx)
    return Number.isNaN(idx) ? null : idx
  }

  // ── Pointer (mouse + touch) dragging ──────────────────────────────────────
  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    // Ignore the remove button.
    if ((e.target as HTMLElement).closest('[data-remove]')) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDragIndex(i)
    setOverIndex(i)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null) return
    const over = indexAtPoint(e.clientX, e.clientY)
    if (over !== null && over !== overIndex) setOverIndex(over)
  }
  const onPointerUp = () => {
    if (dragIndex !== null && overIndex !== null) move(dragIndex, overIndex)
    setDragIndex(null)
    setOverIndex(null)
  }

  const tile = (src: string, i: number) => {
    const isCover = showCoverBadges && i < coverCount
    const dragging = dragIndex === i
    const dropTarget = overIndex === i && dragIndex !== null && dragIndex !== i
    const fixed = tileSize != null
    return (
      <div
        key={src + i}
        data-photo-idx={i}
        onPointerDown={onPointerDown(i)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // Also support native HTML5 drag for desktop mice (belt and braces).
        draggable
        onDragStart={() => { setDragIndex(i); setOverIndex(i) }}
        onDragOver={e => { e.preventDefault(); if (overIndex !== i) setOverIndex(i) }}
        onDrop={e => { e.preventDefault(); onPointerUp() }}
        onDragEnd={onPointerUp}
        title="Drag to reorder"
        style={{
          position: 'relative',
          ...(fixed
            ? { width: tileSize, height: tileSize }
            : { paddingTop: '100%' }),
          borderRadius: 10,
          overflow: 'hidden',
          background: '#f5f0e8',
          border: dropTarget ? '2px solid var(--orange)' : isCover ? '2px solid var(--orange)' : '2px solid transparent',
          opacity: dragging ? 0.4 : 1,
          cursor: 'grab',
          touchAction: 'none', // let us drive the drag, not the browser scroll
          transition: 'opacity 0.12s',
        }}
      >
        <img src={src} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
        {isCover && (
          <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'var(--orange)', color: '#fff', fontSize: 8, fontFamily: 'var(--font-ui)', fontWeight: 900, padding: '2px 5px', borderRadius: 4, pointerEvents: 'none' }}>
            {i === 0 ? 'COVER 1 · MAIN' : `COVER ${i + 1}`}
          </div>
        )}
        <button
          data-remove
          onClick={e => { e.stopPropagation(); remove(i) }}
          onPointerDown={e => e.stopPropagation()}
          title="Remove"
          style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>
    )
  }

  if (value.length === 0) return null

  return (
    <div
      ref={containerRef}
      style={tileSize != null
        ? { display: 'flex', gap: 8, flexWrap: 'wrap' }
        : { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}
    >
      {value.map((src, i) => tile(src, i))}
    </div>
  )
}
