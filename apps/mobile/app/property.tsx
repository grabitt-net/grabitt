import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Image } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'

// Bespoke Property board with advanced search (parity with web /property).
const TABS: [string, string][] = [
  ['For Sale', 'sale'], ['To Rent', 'rent'], ['Holiday', 'holiday'],
  ['Commercial', 'commercial'], ['Land', 'land'], ['New Build', 'new_build'],
]

type Prop = {
  ref: string; title: string; location: string; price: string
  beds: number; baths: number; m2: number; tag: string; image?: string
}

export default function PropertyScreen() {
  const [tab, setTab] = useState(0)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minBedrooms, setMinBedrooms] = useState(0)
  const [minBathrooms, setMinBathrooms] = useState(0)
  const [hasPool, setHasPool] = useState(false)
  const [hasGarage, setHasGarage] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [items, setItems] = useState<Prop[]>([])

  const run = useCallback(async () => {
    const type = TABS[tab][1]
    try {
      const rows: any[] = await apiClient().property.list.query({
        type,
        ...(query.trim() ? { query: query.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
        ...(minBedrooms ? { minBedrooms } : {}),
        ...(minBathrooms ? { minBathrooms } : {}),
        ...(hasPool ? { hasPool: true } : {}),
        ...(hasGarage ? { hasGarage: true } : {}),
      } as any)
      setItems(rows.map(p => {
        const l = p.listing ?? {}
        const price = Number(l.price ?? 0)
        const tag = p.hasPool ? 'Pool' : p.hasGarage ? 'Garage' : p.community || (p.m2 ? `${Number(p.m2)}m²` : '')
        return {
          ref: l.id ?? p.listingId ?? p.id,
          title: l.title ?? 'Property',
          location: l.location ?? 'Gran Canaria',
          price: `€${price.toLocaleString()}${type === 'rent' ? '/mo' : ''}`,
          beds: p.bedrooms ?? 0,
          baths: p.bathrooms ?? 0,
          m2: p.m2 ? Number(p.m2) : 0,
          tag,
          image: Array.isArray(l.images) ? l.images[0] : undefined,
        }
      }))
    } catch { setItems([]) }
  }, [tab, query, location, minPrice, maxPrice, minBedrooms, minBathrooms, hasPool, hasGarage])

  // Structured filters re-run immediately; free text / price run on submit.
  useEffect(() => { run() }, [tab, minBedrooms, minBathrooms, hasPool, hasGarage]) // eslint-disable-line react-hooks/exhaustive-deps

  const stepper = (label: string, val: number, set: (n: number) => void, max: number) => (
    <View style={s.stepper}>
      <Text style={s.stepperLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TouchableOpacity onPress={() => set(Math.max(0, val - 1))} style={s.stepBtn}><Text style={s.stepBtnText}>−</Text></TouchableOpacity>
        <Text style={s.stepVal}>{val === 0 ? 'Any' : `${val}+`}</Text>
        <TouchableOpacity onPress={() => set(Math.min(max, val + 1))} style={s.stepBtn}><Text style={s.stepBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🏠 Property</Text>
        <TouchableOpacity onPress={() => setShowFilters(v => !v)}><Text style={s.filterToggle}>{showFilters ? 'Hide' : 'Filters'}</Text></TouchableOpacity>
      </View>

      {/* Keyword search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search property…" placeholderTextColor="#aaa"
            style={s.searchInput} returnKeyType="search" onSubmitEditing={run} />
        </View>
      </View>

      {/* Advanced filters */}
      {showFilters && (
        <View style={s.filters}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor="#aaa" style={[s.input, { flex: 1 }]} onSubmitEditing={run} returnKeyType="search" />
            <TextInput value={minPrice} onChangeText={setMinPrice} placeholder="Min €" placeholderTextColor="#aaa" keyboardType="numeric" style={[s.input, { width: 80 }]} onSubmitEditing={run} returnKeyType="search" />
            <TextInput value={maxPrice} onChangeText={setMaxPrice} placeholder="Max €" placeholderTextColor="#aaa" keyboardType="numeric" style={[s.input, { width: 80 }]} onSubmitEditing={run} returnKeyType="search" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {stepper('Beds', minBedrooms, setMinBedrooms, 6)}
            {stepper('Baths', minBathrooms, setMinBathrooms, 4)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <TouchableOpacity onPress={() => setHasPool(v => !v)} style={[s.checkChip, hasPool && s.checkChipOn]}><Text style={[s.checkChipText, hasPool && s.checkChipTextOn]}>{hasPool ? '✓ ' : ''}Pool</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setHasGarage(v => !v)} style={[s.checkChip, hasGarage && s.checkChipOn]}><Text style={[s.checkChipText, hasGarage && s.checkChipTextOn]}>{hasGarage ? '✓ ' : ''}Garage</Text></TouchableOpacity>
            <TouchableOpacity onPress={run} style={s.searchBtn}><Text style={s.searchBtnText}>Search</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Type tabs */}
      <View style={{ paddingVertical: 8 }}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          keyExtractor={i => i[0]}
          renderItem={({ item, index }) => (
            <TouchableOpacity onPress={() => setTab(index)} style={[s.chip, tab === index && s.chipActive]}>
              <Text style={[s.chipLabel, tab === index && s.chipLabelActive]}>{item[0]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i, idx) => i.ref + idx}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.ref}`)}>
            <View style={s.thumb}>
              {item.image
                ? <Image source={{ uri: item.image }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                : <Text style={{ fontSize: 50 }}>🏠</Text>}
              {!!item.tag && <View style={s.tag}><Text style={s.tagText}>{item.tag}</Text></View>}
            </View>
            <View style={{ padding: 12 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.location}>📍 {item.location}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={s.price}>{item.price}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.beds > 0 && <Text style={s.spec}>🛏 {item.beds}</Text>}
                  {item.baths > 0 && <Text style={s.spec}>🚿 {item.baths}</Text>}
                  {item.m2 > 0 && <Text style={s.spec}>📐 {item.m2}m²</Text>}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🏠</Text><Text style={s.emptyText}>No property matches your search.</Text></View>}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  filterToggle: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.orange },
  searchRow: { paddingHorizontal: 12, paddingTop: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f0e8', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8 },
  searchInput: { flex: 1, fontFamily: 'Nunito', fontSize: 14, color: colors.dark },
  filters: { paddingHorizontal: 12, paddingTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5dccd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'Nunito', fontSize: 13, color: colors.dark },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#faf6ef', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: '#e5dccd' },
  stepperLabel: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555' },
  stepBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5dccd', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '900', color: colors.orange, lineHeight: 18 },
  stepVal: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: colors.dark, minWidth: 30, textAlign: 'center' },
  checkChip: { borderWidth: 1.5, borderColor: '#e5dccd', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  checkChipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  checkChipText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555' },
  checkChipTextOn: { color: '#fff' },
  searchBtn: { marginLeft: 'auto', backgroundColor: colors.orange, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  searchBtnText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: '#fff' },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  chipActive: { backgroundColor: colors.orange },
  chipLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  chipLabelActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0ebe4', overflow: 'hidden' },
  thumb: { height: 120, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tag: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900', color: '#fff' },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark, marginBottom: 2 },
  location: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  price: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.orange },
  spec: { fontFamily: 'Nunito', fontSize: 10, color: '#888' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
