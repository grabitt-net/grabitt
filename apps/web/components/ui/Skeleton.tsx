'use client'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, #f0ebe4 25%, #e8e0d5 50%, #f0ebe4 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  )
}

export function ListingCardSkeleton() {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #f0ebe4', background: '#fff' }}>
      <Skeleton height={160} borderRadius={0} />
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={20} width="40%" />
        <Skeleton height={11} width="55%" />
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`}</style>
    </div>
  )
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <ListingCardSkeleton key={i} />)}
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`}</style>
    </div>
  )
}

export function NotificationSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center' }}>
      <Skeleton width={40} height={40} borderRadius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={13} width="60%" />
        <Skeleton height={11} width="80%" />
      </div>
    </div>
  )
}
