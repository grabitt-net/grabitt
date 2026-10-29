import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'
import { useAuth } from '../lib/auth'
import { toCard, type Card } from '../lib/listingMap'
import { ListingCard } from '../components/ListingCard'

const SORT_OPTIONS: [string, 'newest' | 'price_asc' | 'price_desc'][] = [['Newest', 'newest'], ['Price ↑', 'price_asc'], ['Price ↓', 'price_desc']]

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>()
  const { token } = useAuth()
  const [query, setQuery] = useState(q ?? '')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')
  const [results, setResults] = useState<Card[]>([])
  const [saved, setSaved] = useState<any[]>([])
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  const run = useCallback(async () => {
    try {
      const res: any = await apiClient().listings.search.query({ query: query.trim() || undefined, sort, limit: 50 } as any)
      const items = (res?.items ?? res ?? []) as any[]
      setResults(items.map(toCard))
    } catch { setResults([]) }
  }, [query, sort])

  const loadSaved = useCallback(() => {
    if (!token) { setSaved([]); return }
    apiClient(token).savedSearches.list.query().then((r: any[]) => setSaved(r)).catch(() => {})
  }, [token])

  const saveSearch = async () => {
    const name = saveName.trim()
    if (!name) { Alert.alert('Name your search', 'Give this search a short name.'); return }
    try {
      await apiClient(token!).savedSearches.save.mutate({ name, query: { query: query.trim() || undefined, sort } as any, alertsOn: true })
      setSaveOpen(false); setSaveName(''); loadSaved()
      Alert.alert('Saved', 'We’ll alert you when new matches are listed.')
    } catch (e: any) { Alert.alert('Could not save', e?.message ?? 'Try again') }
  }

  const runSaved = (ss: any) => {
    setQuery(ss.query?.query ?? '')
    setSort(ss.query?.sort ?? 'newest')
  }

  const deleteSaved = (id: string) =>
    apiClient(token!).savedSearches.delete.mutate({ id }).then(loadSaved).catch(() => {})

  useEffect(() => { const t = setTimeout(run, 300); return () => clearTimeout(t) }, [sort, query]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadSaved() }, [loadSaved])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Search bar */}
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
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

      {/* Sort + save */}
      <View style={s.sortRow}>
        {SORT_OPTIONS.map(([label, val]) => (
          <TouchableOpacity key={val} onPress={() => setSort(val)} style={[s.sortBtn, sort === val && s.sortBtnActive]}>
            <Text style={[s.sortLabel, sort === val && s.sortLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
        {query.trim().length > 0 && (
          <TouchableOpacity onPress={() => token ? setSaveOpen(true) : router.push('/auth')} style={[s.sortBtn, { marginLeft: 'auto' }]}>
            <Text style={s.sortLabel}>🔖 Save</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Saved searches — tap to re-run, backed by alerts */}
      {saved.length > 0 && (
        <FlatList
          data={saved}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 8, paddingBottom: 4 }}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.savedChip} onPress={() => runSaved(item)} onLongPress={() => Alert.alert('Remove saved search?', item.name, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => deleteSaved(item.id) }])}>
              <Text style={s.savedChipText}>🔖 {item.name}</Text>
            </TouchableOpacity>
          )}
          style={{ flexGrow: 0 }}
        />
      )}

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

      {/* Save-search modal */}
      <Modal visible={saveOpen} transparent animationType="fade" onRequestClose={() => setSaveOpen(false)}>
        <View style={s.backdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Save this search</Text>
            <Text style={s.modalSub}>We’ll alert you when new matches are listed.</Text>
            <TextInput value={saveName} onChangeText={setSaveName} placeholder="e.g. iPhones under €500" placeholderTextColor="#aaa" style={s.modalInput} autoFocus />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setSaveOpen(false)}><Text style={[s.modalBtnText, { color: '#555' }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.orange }]} onPress={saveSearch}><Text style={s.modalBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  savedChip: { backgroundColor: '#FFF3EE', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  savedChipText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.orange },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  modalTitle: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  modalSub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginBottom: 14 },
  modalInput: { backgroundColor: '#f5f0e8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Nunito', fontSize: 15, color: colors.dark, borderWidth: 1, borderColor: '#ece3d7' },
  modalBtn: { flex: 1, borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  modalBtnText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: '#fff' },
})
