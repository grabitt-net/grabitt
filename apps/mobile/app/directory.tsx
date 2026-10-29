import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient, API_URL } from '../lib/trpc'

type Biz = {
  id: string; slug?: string | null; name: string; category?: string | null
  description?: string | null; location?: string | null; phone?: string | null; logoUrl?: string | null
}

// Public business directory (parity with web /directory). Paid advertiser signup
// is handled on the web — see the Advertise link.
export default function DirectoryScreen() {
  const [cats, setCats] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<Biz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient().directory.categories.query()
      .then((r: any[]) => setCats(r.map(c => c.name))).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    apiClient().directory.list.query(active ? { category: active } : undefined)
      .then((r: any[]) => setItems(r as Biz[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [active])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 20, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🏢 Directory</Text>
        <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/advertise-enquiry`)}><Text style={s.advertise}>Advertise</Text></TouchableOpacity>
      </View>

      {/* Category chips */}
      <View style={{ paddingVertical: 8 }}>
        <FlatList
          data={[null, ...cats]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          keyExtractor={(i, idx) => i ?? `all-${idx}`}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setActive(item)} style={[s.chip, active === item && s.chipActive]}>
              <Text style={[s.chipText, active === item && s.chipTextActive]}>{item ?? 'All'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={s.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.logo}>
                {item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 26 }}>🏢</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                {!!item.category && <Text style={s.cat}>{item.category}{item.location ? ` · 📍 ${item.location}` : ''}</Text>}
                {!!item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
                <View style={s.actions}>
                  {!!item.phone && (
                    <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}><Text style={s.callText}>📞 Call</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.infoBtn} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/directory/${item.slug ?? item.id}`)}><Text style={s.infoText}>More info</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🏢</Text><Text style={s.emptyText}>No businesses listed{active ? ` in ${active}` : ''} yet.</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark },
  advertise: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.orange },
  chip: { backgroundColor: '#f5f0e8', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.orange },
  chipText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f0ebe4', padding: 12 },
  logo: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: colors.dark },
  cat: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 2 },
  desc: { fontFamily: 'Nunito', fontSize: 12, color: '#666', marginTop: 4, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  callBtn: { backgroundColor: colors.sage, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  callText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#fff' },
  infoBtn: { borderWidth: 1.5, borderColor: '#e5dccd', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  infoText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
