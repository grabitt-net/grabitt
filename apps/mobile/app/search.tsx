import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'
import { toCard, type Card } from '../lib/listingMap'
import { ListingCard } from '../components/ListingCard'

const SORT_OPTIONS: [string, 'newest' | 'price_asc' | 'price_desc'][] = [['Newest', 'newest'], ['Price ↑', 'price_asc'], ['Price ↓', 'price_desc']]

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>()
  const [query, setQuery] = useState(q ?? '')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [results, setResults] = useState<Card[]>([])

  const run = useCallback(async () => {
    try {
      const res: any = await apiClient().listings.search.query({ query: query.trim() || undefined, sort, limit: 50 } as any)
      const items = (res?.items ?? res ?? []) as any[]
      setResults(items.map(toCard))
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
        renderItem={({ item }) => <ListingCard item={item} layout="row" />}
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
})
