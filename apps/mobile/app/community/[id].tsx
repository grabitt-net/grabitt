import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'

export default function CommunityPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  useEffect(() => {
    if (!id) return
    apiClient().community.byId.query({ id: id as string })
      .then((p: any) => { setPost(p); setState('ready') })
      .catch(() => setState('notfound'))
  }, [id])

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingTop: 52, paddingBottom: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 22, color: colors.orange }}>‹</Text>
      </TouchableOpacity>
      {state === 'loading' && <Text style={s.muted}>Loading…</Text>}
      {state === 'notfound' && <Text style={s.muted}>Article not found.</Text>}
      {state === 'ready' && post && (
        <>
          <View style={s.hero}><Text style={{ fontSize: 56 }}>{post.emoji}</Text></View>
          <Text style={s.cat}>{post.category}</Text>
          <Text style={s.title}>{post.title}</Text>
          <Text style={s.excerpt}>{post.excerpt}</Text>
          <Text style={s.body}>{post.body}</Text>
        </>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf6ef' },
  muted: { color: '#888', fontFamily: 'Comfortaa', marginTop: 20 },
  hero: { height: 130, borderRadius: 16, backgroundColor: '#f0e7d8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cat: { fontFamily: 'Comfortaa', fontSize: 11, fontWeight: '800', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  title: { fontFamily: 'Comfortaa', fontSize: 23, fontWeight: '800', color: '#2b2b2b', lineHeight: 29, marginBottom: 12 },
  excerpt: { fontFamily: 'Comfortaa', fontSize: 14.5, fontWeight: '700', color: '#5a4d3a', lineHeight: 21, marginBottom: 16 },
  body: { fontFamily: 'Comfortaa', fontSize: 14, color: '#444', lineHeight: 23 },
})
