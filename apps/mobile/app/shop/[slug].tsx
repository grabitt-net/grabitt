import { useEffect, useState } from 'react'
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../../lib/layout'
import { useLocalSearchParams, router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { toCard, type Card } from '../../lib/listingMap'
import { ListingCard } from '../../components/ListingCard'

const pretty = (g: string) => (g ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// Native seller storefront (parity with the web /shop/[slug] page).
export default function ShopScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    apiClient().business.bySlug.query({ slug: slug as string })
      .then((d: any) => setData(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const shop = data?.shop
  const seller = data?.seller
  const items: Card[] = (data?.listings ?? []).map(toCard)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading} numberOfLines={1}>{seller?.name ?? 'Shop'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View>
      : notFound ? <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🏪</Text><Text style={s.emptyText}>This shop isn't available.</Text></View>
      : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={i => i.ref}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          ListHeaderComponent={
            <View>
              {!!shop?.bannerUrl && <Image source={{ uri: shop.bannerUrl }} style={s.banner} resizeMode="cover" />}
              <View style={s.shopHead}>
                <View style={s.logo}>
                  {shop?.logoUrl ? <Image source={{ uri: shop.logoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 28 }}>🏪</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{seller?.name}{seller?.verified ? ' ✓' : ''}</Text>
                  {!!shop?.tagline && <Text style={s.tagline}>{shop.tagline}</Text>}
                  <Text style={s.stats}>{pretty(seller?.grade ?? '')} · ⭐ {data?.score ? Number(data.score).toFixed(1) : '—'} · {seller?.salesCount ?? 0} sales · {data?.followers ?? 0} followers</Text>
                </View>
              </View>
              {!!shop?.about && <Text style={s.about}>{shop.about}</Text>}
              <Text style={s.listingsTitle}>{items.length} listing{items.length === 1 ? '' : 's'}</Text>
            </View>
          }
          renderItem={({ item }) => <ListingCard item={item} />}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No active listings right now.</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  banner: { width: '100%', aspectRatio: 1053 / 320, backgroundColor: '#f5f0e8', borderRadius: 12, marginBottom: 12 },
  shopHead: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  logo: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden', backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark },
  tagline: { fontFamily: 'Nunito', fontSize: 12, color: '#666', marginTop: 2 },
  stats: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 4 },
  about: { fontFamily: 'Nunito', fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 12 },
  listingsTitle: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: colors.dark, marginBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 50, width: '100%' },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
