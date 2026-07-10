import { useEffect, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Alert, Linking } from 'react-native'
import { colors, PRICES } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { toCard } from '../../lib/listingMap'
import { pushView } from '../../lib/recentViews'

const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

type Item = { emoji: string; title: string; price: string; location: string; category: string; condition?: string; isFeatured?: boolean; image?: string; description?: string; tags?: string[]; sellerId?: string; seller?: { name: string; grade: string; rating: number | null; sales: number }; job?: any }

const PERIOD: Record<string, string> = { month: '/mo', year: '/yr', hour: '/hr' }
function salaryLabel(min?: any, max?: any, period?: string | null) {
  const p = PERIOD[period ?? 'month'] ?? '/mo'
  const lo = min != null ? Number(min) : null, hi = max != null ? Number(max) : null
  if (lo && hi) return `€${lo.toLocaleString()}–${hi.toLocaleString()}${p}`
  if (lo) return `€${lo.toLocaleString()}${p}`
  if (hi) return `up to €${hi.toLocaleString()}${p}`
  return 'Negotiable'
}

// Fallback demo lookup for the old ref-keyed cards (F1, JL1…).
const LISTINGS: Record<string, { emoji: string; title: string; price: string; location: string; category: string; condition?: string; isFeatured?: boolean }> = {
  F1: { emoji: '📱', title: 'iPhone 14 — Unlocked',         price: '€620',    location: 'Las Palmas',      category: 'Electronics',   condition: 'Excellent', isFeatured: true },
  F2: { emoji: '🚴', title: 'Mountain Bike — 21sp Shimano', price: '€340',    location: 'Maspalomas',      category: 'Sport',         condition: 'Good',      isFeatured: true },
  F3: { emoji: '💻', title: 'MacBook Air M2 — 8GB',         price: '€890',    location: 'Las Palmas',      category: 'Electronics',   condition: 'Like New',  isFeatured: true },
  F4: { emoji: '🏄', title: 'Surfboard 6ft + GoPro',        price: '€120',    location: 'Las Palmas',      category: 'Sport',         condition: 'Good' },
  F5: { emoji: '🎸', title: 'Fender Stratocaster 2020',     price: '€340',    location: 'Las Palmas',      category: 'Retro & Vintage', condition: 'Very Good' },
  JL1: { emoji: '🎮', title: 'PS5 + 2 Controllers',         price: '€380',    location: 'Las Palmas',      category: 'Gaming',        condition: 'Like New' },
  JL2: { emoji: '🐱', title: 'Bengal Kitten — 10 weeks',    price: '€450',    location: 'Maspalomas',      category: 'Pet Shop' },
  JL3: { emoji: '👗', title: 'Summer Dress — Size M',       price: '€22',     location: 'Playa del Inglés', category: 'Fashion',       condition: 'New' },
  JL4: { emoji: '🔧', title: 'Plumber — Emergency',         price: '€35/hr',  location: 'Las Palmas',      category: 'Handy Help' },
  JL5: { emoji: '🪴', title: 'Indoor Plant Collection',     price: '€18',     location: 'Telde',           category: 'Home & Garden' },
}

const SIMILAR = [
  { emoji: '📱', title: 'Samsung S24',      price: '€580' },
  { emoji: '💻', title: 'iPad Pro 12.9"',   price: '€720' },
  { emoji: '🎧', title: 'Sony WH-1000XM5', price: '€220' },
]

export default function ListingScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>()
  const { token } = useAuth()
  const [fetched, setFetched] = useState<Item | null>(null)
  const [meId, setMeId] = useState<string | null>(null)

  useEffect(() => {
    if (token) apiClient(token).users.me.query().then((u: any) => setMeId(u?.id ?? null)).catch(() => {})
  }, [token])

  const isOwner = !!meId && !!fetched?.sellerId && meId === fetched.sellerId

  const promote = async (option: 'grab_it_now' | 'featured') => {
    if (!token) { Alert.alert('Please log in', 'Log in to promote your listing.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    try {
      const res: any = await apiClient(token).listings.promote.mutate({ listingId: ref as string, option, weeks: 1 })
      if (res?.url) Linking.openURL(res.url)
    } catch (e: any) { Alert.alert('Could not start payment', e?.message ?? 'Try again') }
  }

  const startChat = async () => {
    // Messaging is for logged-in users only — prompt sign-in otherwise.
    if (!token) { Alert.alert('Please log in', 'Log in to message the seller.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    if (!fetched?.sellerId) { Alert.alert('Unavailable', 'This listing can’t be messaged.'); return }
    try {
      const thread = await apiClient(token).messages.thread.mutate({ listingId: ref as string, sellerId: fetched.sellerId })
      if (thread?.id) router.push(`/chat/${thread.id}?name=${encodeURIComponent(fetched.seller?.name ?? 'Seller')}`)
    } catch (e: any) { Alert.alert('Could not start chat', e?.message ?? 'Try again') }
  }

  // Fetch the real listing (any id). Falls back to the demo lookup on failure.
  useEffect(() => {
    if (!ref) return
    apiClient().listings.byId.query({ id: ref as string })
      .then((l: any) => { pushView(toCard(l)); setFetched({
        emoji: '🛍️',
        title: l.title,
        price: `€${Number(l.price).toLocaleString()}`,
        location: l.location ?? 'Gran Canaria',
        category: pretty(l.department),
        condition: l.condition ? pretty(l.condition) : undefined,
        isFeatured: l.isFeatured,
        image: Array.isArray(l.images) ? l.images[0] : undefined,
        description: l.description,
        tags: Array.isArray(l.tags) ? l.tags : [],
        sellerId: l.seller?.id,
        seller: l.seller ? { name: l.seller.displayName, grade: l.seller.grade, rating: l.seller.avgRating, sales: l.seller.salesCount } : undefined,
        job: l.jobListing ?? undefined,
      }) })
      .catch(() => {})
  }, [ref])

  const item: Item = fetched || LISTINGS[ref as string] || {
    emoji: '🛍️',
    title: decodeURIComponent(ref || 'Item'),
    price: 'POA',
    location: 'Gran Canaria',
    category: 'General',
  }

  return (
    <View style={s.screen}>
      {/* Back button floated over hero */}
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={{ color: colors.orange, fontSize: 22 }}>‹</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={s.hero}>
          {item.image
            ? <Image source={{ uri: item.image }} style={{ ...StyleSheet.absoluteFillObject }} resizeMode="cover" />
            : <Text style={{ fontSize: 90 }}>{item.emoji}</Text>}
          {item.isFeatured && (
            <View style={s.featuredBadge}><Text style={s.featuredBadgeText}>👀 FEATURED</Text></View>
          )}
          <TouchableOpacity
            style={s.heartBtn}
            onPress={async () => {
              if (!token) { Alert.alert('Please log in', 'Log in to save favourites.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
              try { await apiClient(token).wishlist.toggle.mutate({ listingId: ref as string }); Alert.alert('Saved', 'Updated your favourites.') }
              catch (e: any) { Alert.alert('Could not save', e?.message ?? 'Try again') }
            }}
          ><Text style={{ fontSize: 18 }}>🤍</Text></TouchableOpacity>
        </View>

        <View style={s.body}>
          {/* Demand signals */}
          <View style={s.signals}>
            <View style={s.signalPill}><Text style={s.signalText}>👁 42 views today</Text></View>
            <View style={s.signalPill}><Text style={s.signalText}>⚡ 7 watching</Text></View>
          </View>

          {/* Title + price */}
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.price}>{item.price}</Text>

          {/* Seller */}
          <View style={s.sellerRow}>
            <View style={s.sellerAvatar}><Text style={{ fontSize: 22 }}>👤</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.sellerHandle}>{item.seller?.name ?? '@seller_GC'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View style={s.gradeBadge}><Text style={s.gradeBadgeText}>{pretty(item.seller?.grade ?? 'grabber')}</Text></View>
                <Text style={s.sellerStats}>⭐ {item.seller?.rating ? Number(item.seller.rating).toFixed(1) : '—'} · {item.seller?.sales ?? 0} sales</Text>
              </View>
            </View>
            <TouchableOpacity style={s.msgBtn} onPress={startChat}><Text style={s.msgBtnText}>Message</Text></TouchableOpacity>
          </View>

          {/* Tag pills */}
          <View style={s.pills}>
            {item.condition && <View style={s.pill}><Text style={[s.pillText, { color: colors.sage }]}>{item.condition}</Text></View>}
            <View style={s.pill}><Text style={s.pillText}>{item.category}</Text></View>
            <View style={s.pill}><Text style={s.pillText}>📍 {item.location}</Text></View>
            <View style={s.pill}><Text style={s.pillText}>🤝 Collection</Text></View>
          </View>

          {/* Job details */}
          {item.job && (
            <View style={s.jobBox}>
              <Text style={s.jobBoxTitle}>Job details</Text>
              <Text style={s.jobSalary}>{salaryLabel(item.job.salaryMin, item.job.salaryMax, item.job.salaryPeriod)}</Text>
              {[
                ['Employer', item.job.company],
                ['Category', item.job.sector],
                ['Hours', item.job.hours],
                ['Starts', item.job.startDate ? new Date(item.job.startDate).toLocaleDateString() : ''],
                ['Payments/yr', item.job.payments ? String(item.job.payments) : ''],
                ['Extras', [item.job.overtime && 'Overtime', item.job.tips && 'Tips'].filter(Boolean).join(' · ')],
                ['Remote', item.job.remote ? 'Yes' : ''],
                ['Address', item.job.address],
              ].filter(([, v]) => !!v).map(([k, v]) => (
                <View key={k as string} style={s.jobRow}>
                  <Text style={s.jobKey}>{k}</Text>
                  <Text style={s.jobVal}>{v as string}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          <Text style={s.desc}>
            {item.description ?? 'Great condition. Message the seller via Grabitt chat with any questions. Collection or local delivery available.'}
          </Text>

          {/* Tags */}
          {Array.isArray(item.tags) && item.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {item.tags.map((t) => (
                <View key={t} style={{ backgroundColor: '#f5f0e8', borderColor: '#ece3d7', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ color: '#6b5a41', fontSize: 12, fontWeight: '600' }}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Map — opens the location in the device maps app */}
          <TouchableOpacity
            style={s.mapPlaceholder}
            onPress={() => {
              const q = (item.job?.address || item.location || '').trim()
              if (q) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)
            }}
          >
            <Text style={{ fontSize: 28, marginBottom: 4 }}>📍</Text>
            <Text style={s.mapText}>{item.job?.address || `${item.location}, Gran Canaria`}</Text>
            <Text style={s.mapLink}>View on map ›</Text>
          </TouchableOpacity>

          {/* Similar listings */}
          <Text style={s.similarHeading}>Similar listings</Text>
          <View style={s.similarRow}>
            {SIMILAR.map((sim, i) => (
              <TouchableOpacity key={i} style={s.simCard}>
                <View style={s.simThumb}><Text style={{ fontSize: 28 }}>{sim.emoji}</Text></View>
                <Text style={s.simTitle} numberOfLines={1}>{sim.title}</Text>
                <Text style={s.simPrice}>{sim.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed action buttons */}
      <View style={s.actions}>
        {isOwner ? (
          <>
            <TouchableOpacity style={s.buyBtn} onPress={() => promote('grab_it_now')}>
              <Text style={s.buyBtnText}>⚡ Grab It Now €{PRICES.grabItNow}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.offerBtn} onPress={() => promote('featured')}>
              <Text style={s.offerBtnText}>👀 Feature €{PRICES.featuredPerWeek}/wk</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={s.buyBtn}>
              <Text style={s.buyBtnText}>Buy Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.offerBtn}>
              <Text style={s.offerBtnText}>Make Offer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  backBtn: { position: 'absolute', top: 52, left: 14, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', aspectRatio: 1.8, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  featuredBadge: { position: 'absolute', top: 12, left: 14, backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  featuredBadgeText: { color: '#fff', fontFamily: 'Nunito', fontSize: 9, fontWeight: '900' },
  heartBtn: { position: 'absolute', top: 12, right: 56, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  signals: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  signalPill: { backgroundColor: '#FFF3EE', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  signalText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: colors.orange },
  title: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark, lineHeight: 26, marginBottom: 6 },
  price: { fontFamily: 'Georgia', fontSize: 28, fontWeight: '700', color: colors.orange, marginBottom: 14 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9f6f2', borderRadius: 12, padding: 12, marginBottom: 14 },
  sellerAvatar: { width: 44, height: 44, backgroundColor: colors.orange, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sellerHandle: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.dark },
  gradeBadge: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 8, paddingVertical: 1 },
  gradeBadgeText: { color: '#fff', fontFamily: 'Nunito', fontSize: 9, fontWeight: '900' },
  sellerStats: { fontFamily: 'Nunito', fontSize: 10, color: '#888' },
  msgBtn: { backgroundColor: colors.ocean, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  msgBtnText: { color: '#fff', fontFamily: 'Nunito', fontSize: 11, fontWeight: '800' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill: { backgroundColor: '#f5f0e8', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#555' },
  desc: { fontFamily: 'Nunito', fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 14 },
  mapPlaceholder: { backgroundColor: '#eee', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 18 },
  mapText: { fontFamily: 'Nunito', fontSize: 12, color: '#666', textAlign: 'center' },
  mapLink: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: colors.orange, marginTop: 6 },
  jobBox: { backgroundColor: '#f9f6f2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#ece3d7' },
  jobBoxTitle: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  jobSalary: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 10 },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#efe7db', gap: 12 },
  jobKey: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#999' },
  jobVal: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '700', color: colors.dark, flexShrink: 1, textAlign: 'right' },
  similarHeading: { fontFamily: 'Georgia', fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 10 },
  similarRow: { flexDirection: 'row', gap: 10 },
  simCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e0d5' },
  simThumb: { width: '100%', aspectRatio: 1.4, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  simTitle: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: colors.dark, padding: 6, paddingBottom: 2 },
  simPrice: { fontFamily: 'Georgia', fontSize: 11, fontWeight: '700', color: colors.orange, paddingHorizontal: 6, paddingBottom: 8 },
  actions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 28 },
  buyBtn: { flex: 1, backgroundColor: colors.orange, borderRadius: 14, padding: 15, alignItems: 'center' },
  buyBtnText: { color: '#fff', fontFamily: 'Nunito', fontSize: 15, fontWeight: '900' },
  offerBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 2, borderColor: colors.orange },
  offerBtnText: { color: colors.orange, fontFamily: 'Nunito', fontSize: 15, fontWeight: '900' },
})
