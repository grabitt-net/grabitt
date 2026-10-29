import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient, API_URL } from '../lib/trpc'

type Post = {
  id: string; title: string; description?: string | null; image?: string | null
  location?: string | null; price: number; kind: string
}

// Handy Help classified board (parity with web /handy). Posting and paid
// replies are handled on the web; browsing + opening a post is in-app.
export default function HandyScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient().handy.feed.query({ page: 1 })
      .then((r: any[]) => setPosts(r as Post[]))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 20, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🛠️ Handy Help</Text>
        <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/handy`)}><Text style={s.post}>+ Post</Text></TouchableOpacity>
      </View>

      <Text style={s.sub}>Local help wanted & offered across Gran Canaria.</Text>

      {loading ? (
        <View style={s.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.id}`)}>
              <View style={s.thumb}>
                {item.image ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 26 }}>🛠️</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[s.kind, item.kind === 'offer' && { backgroundColor: '#EAF4FF' }]}>
                    <Text style={[s.kindText, item.kind === 'offer' && { color: colors.ocean }]}>{item.kind === 'offer' ? 'OFFERING' : 'WANTED'}</Text>
                  </View>
                  {item.price > 0 && <Text style={s.price}>€{item.price.toLocaleString()}</Text>}
                </View>
                <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                {!!item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
                {!!item.location && <Text style={s.loc}>📍 {item.location}</Text>}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🛠️</Text><Text style={s.emptyText}>No Handy Help posts right now.</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark },
  post: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.orange },
  sub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', paddingHorizontal: 14, paddingTop: 10 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f0ebe4', padding: 12 },
  thumb: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  kind: { backgroundColor: '#FFF3EE', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  kindText: { fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: colors.orange },
  price: { fontFamily: 'Georgia', fontSize: 14, fontWeight: '700', color: colors.dark },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark, marginTop: 3 },
  desc: { fontFamily: 'Nunito', fontSize: 12, color: '#666', marginTop: 2, lineHeight: 17 },
  loc: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 3 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
