import { FEE_RATES, GRADE_THRESHOLDS } from '@grabitt/design-tokens'

// Format currency in EUR
export function formatEur(amount: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Calculate platform fee — server-side only, exported for validation
export function calcFee(amount: number, grade: keyof typeof FEE_RATES): { fee: number; net: number } {
  const rate = FEE_RATES[grade]
  const fee = Math.round(amount * rate * 100) / 100
  const net = Math.round((amount - fee) * 100) / 100
  return { fee, net }
}

// Distance between two lat/lng points in km (Haversine)
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Truncate text for previews
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

// Relative time (e.g. "2h ago")
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

// Grade upgrade eligibility check (read-only — write happens server-side)
export function nextGrade(grade: string, salesCount: number, avgRating: number | null): string | null {
  const rating = avgRating ?? 0
  if (grade === 'grabber' && salesCount >= GRADE_THRESHOLDS.dealer.sales && rating >= GRADE_THRESHOLDS.dealer.rating) return 'dealer'
  if (grade === 'dealer' && salesCount >= GRADE_THRESHOLDS.trader.sales && rating >= GRADE_THRESHOLDS.trader.rating) return 'trader'
  if (grade === 'trader' && salesCount >= GRADE_THRESHOLDS.pro.sales && rating >= GRADE_THRESHOLDS.pro.rating) return 'pro'
  return null
}

// Photo compression — client-side BEFORE upload (§10.2)
export async function compressImage(file: File, maxPx = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed')), 'image/webp', 0.82)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
