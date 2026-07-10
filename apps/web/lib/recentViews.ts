// Client-side "recently viewed" — a small ring buffer of compact listing cards
// in localStorage. No backend needed (mirrors the prototype's in-memory list).

export type RecentCard = { id: string; title: string; price: string; image?: string | null; emoji?: string; location?: string }
const KEY = 'grabitt_recent'
const MAX = 12

export function pushView(card: RecentCard) {
  if (typeof window === 'undefined' || !card?.id) return
  try {
    const list = getViews().filter(c => c.id !== card.id)
    list.unshift(card)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch { /* storage full / disabled — ignore */ }
}

export function getViews(): RecentCard[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
