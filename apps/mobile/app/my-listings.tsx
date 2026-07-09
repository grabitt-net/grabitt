import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'
import { toCard, type Card } from '../lib/listingMap'
import { ListingCard } from '../components/ListingCard'

// The seller's own listings (parity with web "My Listings").
export default function MyListingsScreen() {
  const { token } = useAuth()
  const [items, setItems] = useState<Card[] | null>(null)

  useEffect(() => {
    (async () => {
      if (!token) { setItems([]); return }
      try {
        const api = apiClient(token)
        const me: any = await api.users.me.query()
        if (!me?.id) { setItems([]); return }
        const res: any = await api.listings.bySeller.query({ sellerId: me.id })
        setItems((res?.listings ?? []).map(toCard))
      } catch { setItems([]) }
    })()
  }, [token])

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>📋 My Listings</Text>
      </View>
      {items === null ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 30 }} />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
          <Text style={s.emptyText}>You have no active listings yet.</Text>
          <TouchableOpacity style={s.sellBtn} onPress={() => router.push('/(tabs)/sell')}><Text style={s.sellBtnText}>+ New Listing</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(i, idx) => i.ref + idx}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => <ListingCard item={item} />}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontFamily: 'Nunito', fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 14 },
  sellBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 11 },
  sellBtnText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
})
