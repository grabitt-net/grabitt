'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

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

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = useRef(createClient())

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.current
      .from('notifications')
      .select('id, kind, title, body, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      setNotifications(data.map(r => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        readAt: r.read_at,
        createdAt: r.created_at,
      })))
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime — new notification rows pushed by the server
  useEffect(() => {
    if (!userId) return
    const channel = supabase.current
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const r = payload.new as { id: string; kind: string; title: string; body: string; read_at: string | null; created_at: string }
          setNotifications(prev => [{
            id: r.id, kind: r.kind, title: r.title, body: r.body,
            readAt: r.read_at, createdAt: r.created_at,
          }, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const r = payload.new as { id: string; read_at: string | null }
          setNotifications(prev => prev.map(n => n.id === r.id ? { ...n, readAt: r.read_at } : n))
        }
      )
      .subscribe()
    return () => { supabase.current.removeChannel(channel) }
  }, [userId])

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n))
    await supabase.current
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
  }, [])

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id)
    await markRead(unreadIds)
  }, [notifications, markRead])

  const unreadCount = notifications.filter(n => !n.readAt).length

  return { notifications, loading, unreadCount, markRead, markAllRead }
}
