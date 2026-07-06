import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../../lib/auth'
import { apiClient } from '../../lib/trpc'

type Msg = { id: string; senderId: string; body: string; blocked: boolean; readAt: string | null; createdAt: string }

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>()
  const { token } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  const load = useCallback(async () => {
    if (!token || !id) return
    try {
      const api = apiClient(token)
      const rows = await api.messages.threadMessages.query({ threadId: id }) as Msg[]
      setMessages(rows)
      api.messages.markThreadRead.mutate({ threadId: id }).catch(() => {})
    } catch { /* ignore */ }
  }, [token, id])

  useEffect(() => {
    if (token) apiClient(token).users.me.query().then((u: any) => setMeId(u?.id ?? null)).catch(() => {})
  }, [token])

  useEffect(() => {
    load()
    const iv = setInterval(load, 4000)
    return () => clearInterval(iv)
  }, [load])

  const send = async () => {
    const body = draft.trim()
    if (!body || !token || !id || sending) return
    setDraft(''); setSending(true)
    try { await apiClient(token).messages.send.mutate({ threadId: id, body, channel: 'in_app' }); await load() }
    finally { setSending(false) }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f5f5f5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 24, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.title}>{name ? decodeURIComponent(name) : 'Chat'}</Text>
      </View>
      <View style={s.guard}><Text style={s.guardText}>🔒 Keep conversations on Grabitt — sharing phone/email is not allowed.</Text></View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 14, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === meId
          if (item.blocked) return (
            <View style={{ alignItems: 'center' }}><Text style={s.blocked}>⚠️ Message hidden — contact details aren&apos;t allowed.</Text></View>
          )
          return (
            <View style={[s.bubble, mine ? s.mine : s.theirs]}>
              <Text style={[s.bubbleText, mine && { color: '#fff' }]}>{item.body}</Text>
            </View>
          )
        }}
      />

      <View style={s.composer}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Message…" placeholderTextColor="#aaa" style={s.input} multiline />
        <TouchableOpacity onPress={send} disabled={!draft.trim() || sending} style={[s.sendBtn, (!draft.trim() || sending) && { opacity: 0.5 }]}>
          <Text style={{ color: '#fff', fontSize: 18 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 52, paddingBottom: 12, paddingHorizontal: 14, backgroundColor: colors.sand, borderBottomWidth: 1, borderBottomColor: colors.sand2 },
  title: { fontFamily: 'Nunito', fontSize: 16, fontWeight: '800', color: colors.dark },
  guard: { backgroundColor: '#FFF3EE', paddingVertical: 6, paddingHorizontal: 14 },
  guardText: { fontFamily: 'Nunito', fontSize: 10, color: '#a8460f' },
  bubble: { maxWidth: '78%', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.orange, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: 'Nunito', fontSize: 14, color: colors.dark, lineHeight: 20 },
  blocked: { backgroundColor: '#fff4f4', borderColor: '#ffd5d5', borderWidth: 1, color: '#c0392b', fontFamily: 'Nunito', fontSize: 11, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, textAlign: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, backgroundColor: '#fafafa', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Nunito', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#eee' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
})
