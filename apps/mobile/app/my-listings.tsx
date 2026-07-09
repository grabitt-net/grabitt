import { useEffect, useMemo, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'
import { toCard, type Card } from '../lib/listingMap'
import { ListingCard } from '../components/ListingCard'

type Row = { id: string; status: string; isFeatured?: boolean; images?: string[]; department?: string; price?: any; title?: string; location?: string }
const SEGS: [string, string][] = [['active', 'On sale'], ['sold', 'Sold'], ['draft', 'Drafts']]
const bucket = (s: string) => (s === 'sold' ? 'sold' : (s === 'active' || s === 'grab_it_now') ? 'active' : 'draft')

// The seller's own listings, segmented Active / Sold / Drafts (account hub).
export default function MyListingsScreen() {
  const { token } = useAuth()
  const params = useLocalSearchParams<{ seg?: string }>()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [seg, setSeg] = useState(params.seg && ['active', 'sold', 'draft'].includes(params.seg) ? params.seg : 'active')

  useEffect(() => {
    (async () => {
      if (!token) { setRows([]); return }
      try { setRows(await apiClient(token).listings.mine.query() as Row[]) } catch { setRows([]) }
    })()
  }, [token])

  const counts = useMemo(() => {
    const r = rows ?? []
    return { active: r.filter(l => bucket(l.status) === 'active').length, sold: r.filter(l => bucket(l.status) === 'sold').length, draft: r.filter(l => bucket(l.status) === 'draft').length }
  }, [rows])
  const shown: Card[] = useMemo(() => (rows ?? []).filter(l => bucket(l.status) === seg).map(toCard), [rows, seg])

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>📋 My Listings</Text>
      </View>

      <View style={s.segRow}>
        {SEGS.map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setSeg(id)} style={[s.seg, seg === id && s.segOn]}>
            <Text style={[s.segText, seg === id && s.segTextOn]}>{label}{counts[id as keyof typeof counts] > 0 ? ` ${counts[id as keyof typeof counts]}` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {rows === null ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 30 }} />
      ) : shown.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
          <Text style={s.emptyText}>{seg === 'sold' ? 'No sold items yet.' : seg === 'draft' ? 'No drafts.' : 'Nothing on sale yet.'}</Text>
          {seg !== 'sold' && <TouchableOpacity style={s.sellBtn} onPress={() => router.push('/(tabs)/sell')}><Text style={s.sellBtnText}>+ New Listing</Text></TouchableOpacity>}
        </View>
      ) : (
        <FlatList
          data={shown}
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
  segRow: { flexDirection: 'row', backgroundColor: '#f5f0e8', borderRadius: 50, padding: 4, margin: 12 },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 50 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#888' },
  segTextOn: { color: colors.dark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontFamily: 'Nunito', fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 14 },
  sellBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 11 },
  sellBtnText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
})
