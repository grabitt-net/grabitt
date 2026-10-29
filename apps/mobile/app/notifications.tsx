import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

type Note = { id: string; kind: string; title: string; body: string; readAt: string | null; createdAt: string }

function relTime(d: string): string {
  const secs = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

export default function NotificationsScreen() {
  const { token } = useAuth()
  const [items, setItems] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!token) { setItems([]); setLoading(false); return }
    apiClient(token).notifications.list.query({ unreadOnly: false })
      .then((r: any[]) => setItems(r as Note[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const markAll = async () => {
    if (!token) return
    try { await apiClient(token).notifications.markAllRead.mutate(); setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))) } catch {}
  }

  const tap = async (n: Note) => {
    if (!token || n.readAt) return
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
    try { await apiClient(token).notifications.markRead.mutate({ ids: [n.id] }) } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 20, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🔔 Notifications</Text>
        {items.some(n => !n.readAt) ? (
          <TouchableOpacity onPress={markAll}><Text style={s.markAll}>Mark all read</Text></TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
      </View>

      {!token ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>🔒</Text>
          <Text style={s.emptyText}>Log in to see your notifications.</Text>
          <TouchableOpacity style={s.cta} onPress={() => router.push('/auth')}><Text style={s.ctaText}>Log in</Text></TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={s.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          onRefresh={load}
          refreshing={loading}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.row, !item.readAt && s.rowUnread]} onPress={() => tap(item)}>
              {!item.readAt && <View style={s.dot} />}
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                <Text style={s.body} numberOfLines={2}>{item.body}</Text>
              </View>
              <Text style={s.time}>{relTime(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🔔</Text><Text style={s.emptyText}>No notifications yet.</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark },
  markAll: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '900', color: colors.orange },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowUnread: { backgroundColor: '#FFF9F5' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  body: { fontFamily: 'Nunito', fontSize: 12, color: '#666', marginTop: 2, lineHeight: 17 },
  time: { fontFamily: 'Nunito', fontSize: 11, color: '#aaa' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  cta: { marginTop: 18, backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 22, paddingVertical: 11 },
  ctaText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: '#fff' },
})
