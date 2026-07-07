import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Image } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'

// Bespoke Property board (parity with the web/HTML build) — live PropertyListings
// via property.list, not the old static demo data.
const TABS: [string, string][] = [
  ['For Sale', 'sale'], ['To Rent', 'rent'], ['Holiday', 'holiday'], ['Commercial', 'commercial'],
]

type Prop = {
  ref: string; title: string; location: string; price: string
  beds: number; baths: number; m2: number; tag: string; image?: string
}

export default function PropertyScreen() {
  const [tab, setTab] = useState(0)
  const [items, setItems] = useState<Prop[]>([])

  useEffect(() => {
    const type = TABS[tab][1]
    apiClient().property.list.query({ type } as any)
      .then((rows: any[]) => setItems(rows.map(p => {
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
      })))
      .catch(() => setItems([]))
  }, [tab])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🏠 Property</Text>
      </View>

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
        ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🏠</Text><Text style={s.emptyText}>No property listed here right now.</Text></View>}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
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
