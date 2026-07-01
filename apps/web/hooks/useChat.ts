'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  body: string
  created_at: string
}

export function useChat(threadId: string | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabase = useRef(createClient())

  // Initial load
  useEffect(() => {
    if (!threadId) return
    setLoading(true)
    supabase.current
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[])
        setLoading(false)
      })
  }, [threadId])

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return

    const channel = supabase.current
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages(prev => {
            // Deduplicate — optimistic message already added by sendMessage
            const incoming = payload.new as ChatMessage
            if (prev.some(m => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.current.removeChannel(channel) }
  }, [threadId])

  const sendMessage = useCallback(async (body: string) => {
    if (!threadId || !currentUserId || !body.trim()) return

    // Optimistic update — server will broadcast the real row via Realtime
    const optimisticId = `opt_${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      thread_id: threadId,
      sender_id: currentUserId,
      body: body.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase.current
      .from('messages')
      .insert({ thread_id: threadId, sender_id: currentUserId, body: body.trim() })
      .select()
      .single()

    if (error) {
      // Roll back optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      console.error('sendMessage failed:', error.message)
      return
    }

    // Replace optimistic row with real row
    setMessages(prev => prev.map(m => m.id === optimisticId ? (data as ChatMessage) : m))
  }, [threadId, currentUserId])

  return { messages, loading, sendMessage }
}
