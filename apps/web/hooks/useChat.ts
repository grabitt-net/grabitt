'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAuthToken, trpcAuthed } from '@/lib/authToken'

// Prisma/tRPC-backed chat message (camelCase). `blocked` is set server-side by
// the §10.2 contact-info scan in messages.send.
export interface ChatMessage {
  id: string
  threadId: string
  senderId: string
  body: string
  blocked: boolean
  blockedReason: string | null
  readAt: string | null
  createdAt: string
}

type Raw = {
  id: string; threadId: string; senderId: string; body: string
  blocked: boolean; blockedReason: string | null; readAt: string | null; createdAt: string
}
const normalize = (r: Raw): ChatMessage => ({
  id: r.id, threadId: r.threadId, senderId: r.senderId, body: r.body,
  blocked: !!r.blocked, blockedReason: r.blockedReason ?? null,
  readAt: r.readAt ? String(r.readAt) : null, createdAt: String(r.createdAt),
})

// Loads/sends messages through the protected messages tRPC router (authed with
// the consumer app JWT). Contact-info enforcement (§10.2) happens server-side.
// Live updates via short polling — the Prisma tables aren't in the Supabase
// realtime publication and identity is app-JWT based, not the anon key.
export function useChat(threadId: string | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!threadId || !getAuthToken()) return
    try {
      const rows = await trpcAuthed().messages.threadMessages.query({ threadId })
      setMessages((rows as Raw[]).map(normalize))
      trpcAuthed().messages.markThreadRead.mutate({ threadId }).catch(() => {})
    } catch { /* unauthenticated / transient */ }
  }, [threadId])

  useEffect(() => {
    if (!threadId) { setMessages([]); return }
    setLoading(true)
    load().finally(() => setLoading(false))
    const iv = setInterval(load, 4000)
    return () => clearInterval(iv)
  }, [threadId, load])

  const sendMessage = useCallback(async (body: string) => {
    const text = body.trim()
    if (!threadId || !currentUserId || !text) return

    const optimisticId = `opt_${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId, threadId, senderId: currentUserId, body: text,
      blocked: false, blockedReason: null, readAt: null, createdAt: new Date().toISOString(),
    }])

    try {
      const saved = await trpcAuthed().messages.send.mutate({ threadId, body: text, channel: 'in_app' })
      setMessages(prev => prev.map(m => m.id === optimisticId ? normalize(saved as Raw) : m))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    }
  }, [threadId, currentUserId])

  return { messages, loading, sendMessage }
}
