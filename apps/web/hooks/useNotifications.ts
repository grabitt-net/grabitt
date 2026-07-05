'use client'
import { useState, useCallback } from 'react'

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

// NOTE: The in-app notifications feature is not yet wired for the consumer web
// client. The `Notification` table is RLS deny-all and not in the realtime
// publication, so direct Supabase access can't work; the `notifications` tRPC
// router is a protectedProcedure and the web client holds no app JWT yet. This
// hook therefore returns a safe empty state (no network calls, no console
// errors). To enable: issue an app JWT after Supabase auth, then swap the body
// for `createTrpcClient(token).notifications.list.query()` + `.markRead` /
// `.markAllRead`. The public API below is intentionally unchanged so callers
// (IconRail / DesktopNav / PanelHost) need no edits when it's wired up.
export function useNotifications(_userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n))
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
  }, [])

  const unreadCount = notifications.filter(n => !n.readAt).length

  return { notifications, loading: false, unreadCount, markRead, markAllRead }
}
