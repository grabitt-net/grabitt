'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAuthToken, trpcAuthed } from '@/lib/authToken'

export interface AppNotification {
  id: string
  kind: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

const KIND_ICON: Record<string, string> = {
  offer_received:    '💰',
  offer_accepted:    '✅',
  offer_declined:    '❌',
  payment_held:      '🔒',
  payment_released:  '💸',
  handover_reminder: '📦',
  new_message:       '💬',
  price_drop:        '📉',
  saved_search:      '🔖',
  review_received:   '⭐',
  dispute_opened:    '🚨',
  dispute_resolved:  '✅',
  listing_expiring:  '⏰',
  trial_expiring:    '⚠️',
  grab_it_now:       '⚡',
}

export function kindIcon(kind: string) {
  return KIND_ICON[kind] ?? '🔔'
}

export function kindTab(kind: string): 'bid' | 'messages' | 'price' | 'all' {
  if (['offer_received','offer_accepted','offer_declined','payment_held','payment_released','handover_reminder','dispute_opened','dispute_resolved'].includes(kind)) return 'bid'
  if (kind === 'new_message') return 'messages'
  if (['price_drop','saved_search'].includes(kind)) return 'price'
  return 'all'
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000)   return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// Reads notifications for the signed-in user through the protected tRPC
// endpoint, authenticated with the consumer app JWT (see lib/authToken). When
// no token is present (logged out) it stays a quiet empty state.
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!userId || !getAuthToken()) return
    setLoading(true)
    try {
      const rows = await trpcAuthed().notifications.list.query({ unreadOnly: false })
      setNotifications((rows as Array<{ id: string; kind: string; title: string; body: string; readAt: string | null; createdAt: string }>).map(r => ({
        id: r.id, kind: r.kind, title: r.title, body: r.body,
        readAt: r.readAt ? String(r.readAt) : null,
        createdAt: String(r.createdAt),
      })))
    } catch { /* unauthenticated or transient — leave state as-is */ }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n))
    try { await trpcAuthed().notifications.markRead.mutate({ ids }) } catch { /* optimistic */ }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    try { await trpcAuthed().notifications.markAllRead.mutate() } catch { /* optimistic */ }
  }, [])

  const unreadCount = notifications.filter(n => !n.readAt).length

  return { notifications, loading, unreadCount, markRead, markAllRead }
}
