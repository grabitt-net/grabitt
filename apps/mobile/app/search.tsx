import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Image } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'

const SORT_OPTIONS: [string, 'newest' | 'price_asc' | 'price_desc'][] = [['Newest', 'newest'], ['Price ↑', 'price_asc'], ['Price ↓', 'price_desc']]
type Result = { ref: string; image?: string; title: string; price: string; location: string; condition?: string }
const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>()
  const [query, setQuery] = useState(q ?? '')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [results, setResults] = useState<Result[]>([])

  const run = useCallback(async () => {
    try {
      const res: any = await apiClient().listings.search.query({ query: query.trim() || undefined, sort, limit: 50 } as any)
      const items = (res?.items ?? res ?? []) as any[]
      setResults(items.map(l => ({
        ref: l.id, title: l.title, price: `€${Number(l.price).toLocaleString()}`,
        location: l.location ?? 'Gran Canaria', condition: l.condition ? pretty(l.condition) : undefined,
        image: Array.isArray(l.images) ? l.images[0] : undefined,
      })))
    } catch { setResults([]) }
  }, [query, sort])

  useEffect(() => { run() }, [sort]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Search bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
          <Text style={{ fontSize: 22, color: colors.orange }}>‹</Text>
        </TouchableOpacity>
        <View style={s.searchBox}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Gran Canaria..."
            placeholderTextColor="#aaa"
            style={s.input}
            returnKeyType="search"
            autoFocus={!q}
            onSubmitEditing={run}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}><Text style={{ color: '#aaa', fontSize: 16 }}>✕</Text></TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort */}
      <View style={s.sortRow}>
        {SORT_OPTIONS.map(([label, val]) => (
          <TouchableOpacity key={val} onPress={() => setSort(val)} style={[s.sortBtn, sort === val && s.sortBtnActive]}>
            <Text style={[s.sortLabel, sort === val && s.sortLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <View style={{ padding: 10, paddingBottom: 2 }}>
        <Text style={s.resultsCount}>{results.length} results{query ? ` for "${query}"` : ''}</Text>
      </View>
      <FlatList
        data={results}
        keyExtractor={i => i.ref}
        contentContainerStyle={{ padding: 10, paddingTop: 4 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.ref}`)}>
            <View style={s.thumb}>
              {item.image
                ? <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                : <Text style={{ fontSize: 36 }}>🛍️</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.price}>{item.price}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Text style={s.tag}>📍 {item.location}</Text>
                <Text style={s.tag}>{item.condition}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f0e8', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8 },
  input: { flex: 1, fontFamily: 'Nunito', fontSize: 14, color: colors.dark },
  sortRow: { flexDirection: 'row', gap: 6, padding: 10, paddingTop: 8 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, backgroundColor: '#f5f0e8' },
  sortBtnActive: { backgroundColor: colors.orange },
  sortLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  sortLabelActive: { color: '#fff' },
  resultsCount: { fontFamily: 'Nunito', fontSize: 11, color: '#888', fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f0ebe4', alignItems: 'center' },
  thumb: { width: 60, height: 60, backgroundColor: '#f5f0e8', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.dark, marginBottom: 2 },
  price: { fontFamily: 'Georgia', fontSize: 16, fontWeight: '700', color: colors.orange },
  tag: { fontFamily: 'Nunito', fontSize: 9, color: '#888', backgroundColor: '#f5f0e8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, fontWeight: '700' },
})
