import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

export default function ReviewsScreen() {
  const { token } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    apiClient(token).users.me.query()
      .then((u: any) => apiClient().users.reviews.query({ userId: u.id }))
      .then((r: any) => setData(r))
      .catch(() => {}).finally(() => setLoading(false))
  }, [token])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>⭐ My reviews</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : (
        <FlatList
          data={data?.reviews ?? []}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <View style={s.summary}>
              <Text style={s.avg}>{data?.avg ? Number(data.avg).toFixed(1) : '—'}</Text>
              <Text style={s.avgStars}>{data?.avg ? stars(Number(data.avg)) : '☆☆☆☆☆'}</Text>
              <Text style={s.count}>{data?.reviews?.length ?? 0} review{(data?.reviews?.length ?? 0) === 1 ? '' : 's'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowTop}>
                <Text style={s.author}>{item.authorName ?? 'Buyer'}</Text>
                <Text style={s.rowStars}>{stars(item.rating)}</Text>
              </View>
              {!!item.comment && <Text style={s.comment}>{item.comment}</Text>}
              <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>⭐</Text><Text style={s.emptyText}>No reviews yet.</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  summary: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#faf6ef', borderRadius: 16, marginBottom: 16 },
  avg: { fontFamily: 'Georgia', fontSize: 44, fontWeight: '700', color: colors.dark },
  avgStars: { fontSize: 20, color: colors.orange, marginTop: 2 },
  count: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginTop: 4 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f0e8' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  rowStars: { fontSize: 14, color: colors.orange },
  comment: { fontFamily: 'Nunito', fontSize: 13, color: '#555', marginTop: 4, lineHeight: 19 },
  date: { fontFamily: 'Nunito', fontSize: 11, color: '#aaa', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyText: { fontFamily: 'Nunito', fontSize: 14, color: '#888' },
})
