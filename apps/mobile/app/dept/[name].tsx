import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { toCard, type Card, DEPT_ENUM } from '../../lib/listingMap'
import { ListingCard } from '../../components/ListingCard'

const SUBCATS: Record<string, string[]> = {
  'Electronics':    ['All', 'Phones', 'Laptops', 'Audio', 'Cameras', 'Gaming', 'Wearables'],
  'Fashion':        ['All', "Women's", "Men's", "Shoes", 'Accessories', 'Vintage'],
  'Home & Garden':  ['All', 'Furniture', 'Kitchen', 'Garden', 'Decor', 'DIY'],
  'Sport':          ['All', 'Water Sports', 'Cycling', 'Football', 'Tennis', 'Gym'],
  'Property':       ['All', 'Rent', 'For Sale', 'Rooms', 'Commercial'],
}

export default function DeptScreen() {
  const { name } = useLocalSearchParams<{ name: string }>()
  const deptName = name ? decodeURIComponent(name) : 'Listings'
  const subcats = SUBCATS[deptName] || ['All']
  const [activeSub, setActiveSub] = useState('All')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [items, setItems] = useState<Card[]>([])

  // Live listings for this department (falls back to nothing if unmapped).
  useEffect(() => {
    const department = DEPT_ENUM[deptName]
    apiClient().listings.search.query({ ...(department ? { department } : {}), sort, limit: 50 } as any)
      .then((res: any) => {
        const list = (res?.items ?? res ?? []) as any[]
        setItems(list.map(toCard))
      })
      .catch(() => setItems([]))
  }, [deptName, sort])

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ fontSize: 20, color: colors.orange }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.heading} numberOfLines={1}>{deptName}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Subcategory chips */}
      <FlatList
        data={subcats}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
        keyExtractor={i => i}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveSub(item)}
            style={[s.chip, activeSub === item && s.chipActive]}
          >
            <Text style={[s.chipText, activeSub === item && s.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
        style={s.chipRow}
      />

      {/* Sort + count */}
      <View style={s.sortRow}>
        <Text style={s.countText}>{items.length} listings</Text>
        <View style={s.sortBtns}>
          {(['newest', 'price_asc', 'price_desc'] as const).map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setSort(opt)}
              style={[s.sortBtn, sort === opt && s.sortBtnActive]}
            >
              <Text style={[s.sortBtnText, sort === opt && s.sortBtnTextActive]}>
                {opt === 'newest' ? 'New' : opt === 'price_asc' ? '↑ Price' : '↓ Price'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={items}
        numColumns={2}
        contentContainerStyle={{ padding: 10, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        keyExtractor={(it) => it.ref}
        renderItem={({ item }) => <ListingCard item={item} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>😕</Text>
            <Text style={s.emptyText}>No listings in {deptName} right now.</Text>
          </View>
        }
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 10, paddingHorizontal: 14, borderBottomWidth: 1.5, borderBottomColor: colors.sand2, backgroundColor: colors.sand },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 17, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  chipRow: { backgroundColor: colors.sand, borderBottomWidth: 1, borderBottomColor: colors.sand2, flexGrow: 0 },
  chip: { backgroundColor: '#FFF3EE', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.orange },
  chipText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.orange },
  chipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  countText: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortBtn: { backgroundColor: '#f5f5f5', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  sortBtnActive: { backgroundColor: colors.orange },
  sortBtnText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#555' },
  sortBtnTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
