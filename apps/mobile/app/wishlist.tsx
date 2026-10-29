import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'
import { useAuth } from '../lib/auth'
import { toCard, type Card } from '../lib/listingMap'
import { ListingCard } from '../components/ListingCard'

// Saved items — the listings the user has favourited (heart) across the app.
export default function WishlistScreen() {
  const { token } = useAuth()
  const [items, setItems] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    try {
      const rows: any[] = await apiClient(token).wishlist.list.query()
      setItems(rows.map(w => toCard(w.listing)).filter(c => c.ref))
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ fontSize: 20, color: colors.orange }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.heading}>❤️ Saved items</Text>
        <View style={{ width: 36 }} />
      </View>

      {!token ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>🔒</Text>
          <Text style={s.emptyText}>Log in to see your saved items.</Text>
          <TouchableOpacity style={s.cta} onPress={() => router.push('/auth')}><Text style={s.ctaText}>Log in</Text></TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={s.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          keyExtractor={i => i.ref}
          onRefresh={load}
          refreshing={loading}
          renderItem={({ item }) => <ListingCard item={item} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🤍</Text>
              <Text style={s.emptyText}>No saved items yet.</Text>
              <Text style={s.emptySub}>Tap the heart on any listing to save it here.</Text>
              <TouchableOpacity style={s.cta} onPress={() => router.replace('/(tabs)')}><Text style={s.ctaText}>Browse listings</Text></TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '800', color: colors.dark, textAlign: 'center' },
  emptySub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', textAlign: 'center', marginTop: 6 },
  cta: { marginTop: 18, backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 22, paddingVertical: 11 },
  ctaText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: '#fff' },
})
