import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../../lib/auth'
import { apiClient } from '../../lib/trpc'

type Thread = {
  id: string
  lastMessageAt: string | null
  participants: { userId: string; user: { id: string; displayName: string } }[]
  messages: { senderId: string; body: string; blocked: boolean; readAt: string | null }[]
}

export default function MessagesScreen() {
  const { user, token } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) { setThreads([]); setLoading(false); return }
    try {
      const api = apiClient(token)
      const [t, u] = await Promise.all([
        api.messages.myThreads.query() as Promise<Thread[]>,
        api.users.me.query().catch(() => null) as Promise<any>,
      ])
      setThreads(t ?? [])
      // resolve my prisma id from the thread participants isn't direct; use users.me id
      if (u?.id) setMe(u.id)
    } catch { setThreads([]) } finally { setLoading(false) }
  }, [token])

  useFocusEffect(useCallback(() => { load() }, [load]))
  useEffect(() => { load() }, [load])

  if (!user) {
    return (
      <View style={s.screen}>
        <Text style={s.heading}>Messages</Text>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Log in to see your messages</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/auth')}><Text style={s.loginBtnText}>Log In</Text></TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={s.screen}>
      <Text style={s.heading}>Messages</Text>
      {loading ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 30 }} />
      ) : threads.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptySub}>Message a seller from any listing to start a chat.</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={t => t.id}
          renderItem={({ item }) => {
            const other = item.participants.find(p => p.userId !== me)?.user
            const last = item.messages?.[0]
            const unread = !!last && last.senderId !== me && !last.readAt
            const preview = last ? (last.blocked ? '⚠️ Message hidden' : last.body) : 'Start chatting…'
            return (
              <TouchableOpacity style={s.row} onPress={() => router.push(`/chat/${item.id}?name=${encodeURIComponent(other?.displayName ?? 'Chat')}`)}>
                <View style={s.avatar}><Text style={{ color: '#fff', fontWeight: '900' }}>{(other?.displayName ?? '?')[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, unread && { fontWeight: '900' }]}>{other?.displayName ?? 'Grabitt user'}</Text>
                  <Text style={[s.preview, unread && { color: colors.dark, fontWeight: '700' }]} numberOfLines={1}>{preview}</Text>
                </View>
                {unread && <View style={s.dot} />}
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: colors.sand2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'Nunito', fontSize: 16, fontWeight: '900', color: colors.dark, marginBottom: 8 },
  emptySub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
  loginBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 11, marginTop: 14 },
  loginBtnText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '700', color: colors.dark },
  preview: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange },
})
