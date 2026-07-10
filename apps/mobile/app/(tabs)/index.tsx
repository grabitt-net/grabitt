import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { toCard, type Card } from '../../lib/listingMap'
import { ListingCard } from '../../components/ListingCard'
import { getViews } from '../../lib/recentViews'

const { width: SCREEN_W } = Dimensions.get('window')

// Jobs and Property have bespoke screens (salary/beds/baths etc.); everything
// else uses the generic department grid.
function deptRoute(name: string): string {
  if (name === 'Jobs') return '/jobs'
  if (name === 'Property') return '/property'
  return `/dept/${encodeURIComponent(name)}`
}

// Seasonal promo banner — date-driven campaign (parity with the web
// SeasonalBanner). Tapping opens the featured department.
const SEASONAL = [
  { months: [12, 1], emoji: '🎄', title: 'Christmas Gifting', sub: 'Find the perfect present on Gran Canaria', grad: '#c0392b', dept: 'Gift Ideas' },
  { months: [2],     emoji: '🎭', title: 'Carnival Season!',  sub: 'Gran Canaria Carnival deals & costumes',  grad: '#b91d73', dept: 'Fashion' },
  { months: [3, 4],  emoji: '🌸', title: 'Spring Refresh',    sub: 'New season, new home',                   grad: '#56ab2f', dept: 'Home & Garden' },
  { months: [5],     emoji: '🌻', title: 'Pre-Summer',        sub: 'Get ready for the season',               grad: '#ff4e50', dept: 'Sport' },
  { months: [6, 7, 8], emoji: '☀️', title: 'Summer Clearance', sub: 'Sun, sea & savings — shop the island',  grad: '#f7971e', dept: 'Sport' },
  { months: [9, 10], emoji: '🍂', title: 'Autumn Deals',      sub: 'Cosy up for the cooler months',          grad: '#d35400', dept: 'Home & Garden' },
  { months: [11],    emoji: '🎁', title: 'Pre-Christmas Hunt', sub: 'Get ahead of the Christmas rush',        grad: '#8e44ad', dept: 'Gift Ideas' },
]
function currentSeasonal() {
  const m = new Date().getMonth() + 1
  return SEASONAL.find(c => c.months.includes(m)) ?? SEASONAL[4]
}

// ── Data ─────────────────────────────────────────────────────────────────────

// Department tiles use real photography (Unsplash) over the brand gradient —
// same image set as the web CategoryGrid. A failed image falls back to the
// gradient + emoji so a card never renders broken.
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=320&h=320&fit=crop&q=55&auto=format`

const DEPTS = [
  { icon: '🏡', name: 'Home & Garden', color: '#56ab2f', img: IMG('photo-1416879595882-3373a0480b5b') },
  { icon: '💼', name: 'Jobs',          color: '#2193b0', img: IMG('photo-1521737604893-d14cc237f11d') },
  { icon: '👗', name: 'Fashion',       color: '#f7971e', img: IMG('photo-1445205170230-053b83016050') },
  { icon: '⚽', name: 'Sport',         color: '#11998e', img: IMG('photo-1461896836934-ffe607ba8211') },
  { icon: '🎮', name: 'Gaming',        color: '#8E2DE2', img: IMG('photo-1542751371-adc38448a05e') },
  { icon: '📱', name: 'Electronics',   color: '#4776E6', img: IMG('photo-1498049794561-7780e7231661') },
  { icon: '🎁', name: 'Gift Ideas',    color: '#f953c6', img: IMG('photo-1513885535751-8b9238bd345a') },
  { icon: '🧸', name: 'Kids & Baby',   color: '#f9d423', img: IMG('photo-1515488042361-ee00e0ddd4e4') },
  { icon: '🏠', name: 'Property',      color: '#e96c2a', img: IMG('photo-1560518883-ce09059eeffa') },
  { icon: '💊', name: 'Health & Fitness', color: '#43cea2', img: IMG('photo-1571019613454-1cb2f99b2d8b') },
  { icon: '🥖', name: 'Food Store',    color: '#8e44ad', img: IMG('photo-1542838132-92c53300491e') },
  { icon: '🕺', name: 'Retro & Vintage', color: '#d35400', img: IMG('photo-1489599849927-2ee91cede3ba') },
  { icon: '🛍️', name: 'Grab It Now',  color: colors.orange, img: '' }, // brand tile — no photo
  { icon: '🔧', name: 'Handy Help',    color: '#00b09b', img: IMG('photo-1581578731548-c64695cc6952') },
  { icon: '🐾', name: 'Pet Shop',      color: '#f093fb', img: IMG('photo-1425082661705-1834bfd09dca') },
]

const FEATURED = [
  { ref: 'F1', emoji: '📱', title: 'iPhone 14 — Unlocked',        price: '€620',    location: 'Las Palmas' },
  { ref: 'F2', emoji: '🚴', title: 'Mountain Bike — 21sp',        price: '€340',    location: 'Maspalomas' },
  { ref: 'F3', emoji: '💻', title: 'MacBook Air M2',              price: '€890',    location: 'Las Palmas' },
  { ref: 'F4', emoji: '🏄', title: 'Surfboard 6ft + GoPro',       price: '€120',    location: 'Las Palmas' },
  { ref: 'F5', emoji: '🎸', title: 'Fender Stratocaster 2020',    price: '€340',    location: 'Las Palmas' },
]

const JUST_LISTED = [
  { ref: 'JL1', emoji: '🎮', title: 'PS5 + 2 Controllers',        price: '€380', location: 'Las Palmas' },
  { ref: 'JL2', emoji: '🐱', title: 'Bengal Kitten — 10 weeks',   price: '€450', location: 'Maspalomas' },
  { ref: 'JL3', emoji: '👗', title: 'Summer Dress — Size M',      price: '€22',  location: 'Playa del Inglés' },
  { ref: 'JL4', emoji: '🔧', title: 'Plumber — Emergency',        price: '€35/hr', location: 'Las Palmas' },
  { ref: 'JL5', emoji: '🪴', title: 'Indoor Plant Collection',    price: '€18',  location: 'Telde' },
]

// ── Grab It Now countdown ─────────────────────────────────────────────────────

function useCountdown() {
  const [secs, setSecs] = useState(() => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return Math.floor((midnight.getTime() - now.getTime()) / 1000)
  })
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(secs / 3600).toString().padStart(2, '0')
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [query, setQuery] = useState('')
  const countdown = useCountdown()
  const { user, token } = useAuth()
  const [featured, setFeatured] = useState<Card[]>([])
  const [justListed, setJustListed] = useState<Card[]>([])
  const [recommended, setRecommended] = useState<Card[]>([])
  const [recent, setRecent] = useState<Card[]>([])
  const [guides, setGuides] = useState<any[]>([])
  const [deptFailed, setDeptFailed] = useState<Record<string, boolean>>({})

  // Live data from the backend (public endpoints — same as web).
  useEffect(() => {
    const api = apiClient()
    api.listings.featured.query().then((d: any[]) => setFeatured(d.map(toCard))).catch(() => {})
    api.listings.recent.query().then((d: any[]) => setJustListed(d.map(toCard))).catch(() => {})
    getViews().then(setRecent).catch(() => {})
    api.community.list.query({ limit: 8 }).then((d: any[]) => setGuides(d)).catch(() => {})
  }, [])

  // Personalised "Recommended for you" (needs login — uses your interests).
  useEffect(() => {
    if (!token) { setRecommended([]); return }
    apiClient(token).listings.recommended.query().then((d: any[]) => setRecommended(d.map(toCard))).catch(() => {})
  }, [token])

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Topbar */}
      <View style={s.topbar}>
        <Image source={require('../../assets/logo.png')} resizeMode="contain" style={{ height: 28, width: 28 * (1470 / 472) }} />
        <TouchableOpacity style={s.memberBtn} onPress={() => router.push(user ? '/(tabs)/profile' : '/auth')}>
          <Text style={s.memberBtnText}>{user ? 'Account' : 'Log in'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Search row */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search Gran Canaria..."
              placeholderTextColor="#aaa"
              style={s.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => query.trim() && router.push(`/search?q=${encodeURIComponent(query)}`)}
            />
            <TouchableOpacity style={s.nearBtn}>
              <Text style={s.nearBtnText}>📍 Near Me</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seasonal promo banner (date-driven) */}
        {(() => {
          const c = currentSeasonal()
          return (
            <TouchableOpacity style={[s.seasonalBanner, { backgroundColor: c.grad }]} onPress={() => router.push(deptRoute(c.dept) as any)}>
              <Text style={{ fontSize: 34 }}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.seasonalTitle}>{c.title}</Text>
                <Text style={s.seasonalSub}>{c.sub}</Text>
              </View>
              <Text style={s.seasonalCta}>Shop →</Text>
            </TouchableOpacity>
          )
        })()}

        {/* Grab It Now strip */}
        <TouchableOpacity style={s.grabitStrip} onPress={() => router.push('/dept/Grab%20It%20Now')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>⚡</Text>
            <View>
              <Text style={s.grabitTitle}>Grab It Now!</Text>
              <Text style={s.grabitSub}>Flash deals — today only</Text>
            </View>
          </View>
          <View style={s.countdownBox}>
            <Text style={s.countdownText}>{countdown}</Text>
            <Text style={s.countdownLabel}>ENDS MIDNIGHT</Text>
          </View>
        </TouchableOpacity>

        {/* Dept grid — 3 col */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Departments</Text>
        </View>
        <View style={s.deptGrid}>
          {DEPTS.map(dept => {
            const showImg = !!dept.img && !deptFailed[dept.name]
            return (
              <TouchableOpacity
                key={dept.name}
                style={[s.deptTile, { backgroundColor: dept.color }]}
                onPress={() => router.push(deptRoute(dept.name) as any)}
              >
                {showImg && (
                  <Image
                    source={{ uri: dept.img }}
                    resizeMode="cover"
                    onError={() => setDeptFailed(f => ({ ...f, [dept.name]: true }))}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {/* Dark scrim so the label stays legible over any photo */}
                <View style={s.deptScrim} />
                {!showImg && (
                  <View style={s.deptEmojiWrap}><Text style={{ fontSize: 26 }}>{dept.icon}</Text></View>
                )}
                <Text style={s.deptName} numberOfLines={2}>{dept.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Recommended for you (personalised — logged-in) */}
        {recommended.length > 0 && (
          <>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>✨ Recommended for you</Text></View>
            <FlatList
              data={recommended}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
              keyExtractor={(i, idx) => i.ref + idx}
              renderItem={({ item }) => <ListingCard item={item} width={158} />}
            />
          </>
        )}

        {/* Featured strip */}
        <View style={[s.sectionHeader, recommended.length > 0 && { marginTop: 20 }]}>
          <Text style={s.sectionTitle}>👀 Featured</Text>
          <TouchableOpacity><Text style={s.seeAll}>See all</Text></TouchableOpacity>
        </View>
        <FlatList
          data={(featured.length ? featured : FEATURED) as Card[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
          keyExtractor={i => i.ref}
          renderItem={({ item }) => <ListingCard item={item} width={158} />}
        />

        {/* Just Listed */}
        <View style={[s.sectionHeader, { marginTop: 20 }]}>
          <Text style={s.sectionTitle}>🆕 Just Listed</Text>
          <TouchableOpacity><Text style={s.seeAll}>See all</Text></TouchableOpacity>
        </View>
        <FlatList
          data={(justListed.length ? justListed : JUST_LISTED) as Card[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
          keyExtractor={i => i.ref}
          renderItem={({ item }) => <ListingCard item={item} width={158} />}
        />

        {/* Recently viewed */}
        {recent.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 20 }]}><Text style={s.sectionTitle}>🕘 Recently viewed</Text></View>
            <FlatList
              data={recent}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
              keyExtractor={(i, idx) => i.ref + idx}
              renderItem={({ item }) => <ListingCard item={item} width={158} />}
            />
          </>
        )}

        {/* Grabitt Guides (community content) */}
        {guides.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 20 }]}><Text style={s.sectionTitle}>📰 Grabitt Guides</Text></View>
            <FlatList
              data={guides}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => router.push(`/community/${item.id}` as any)} style={s.guideCard}>
                  <View style={s.guideThumb}><Text style={{ fontSize: 34 }}>{item.emoji}</Text></View>
                  <View style={{ padding: 10 }}>
                    <Text style={s.guideCat}>{item.category}</Text>
                    <Text numberOfLines={2} style={s.guideTitle}>{item.title}</Text>
                    <Text numberOfLines={3} style={s.guideExcerpt}>{item.excerpt}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  topbar: {
    backgroundColor: colors.sand,
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.sand2,
  },
  wordmark: { fontFamily: 'Comfortaa', fontSize: 24, fontWeight: '700', color: colors.dark },
  memberBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8 },
  memberBtnText: { color: '#fff', fontFamily: 'Nunito', fontSize: 13, fontWeight: '900' },
  searchRow: { backgroundColor: colors.sand, padding: 10, borderBottomWidth: 1.5, borderBottomColor: colors.sand2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 50, paddingLeft: 14, paddingRight: 6, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  searchInput: { flex: 1, fontFamily: 'Nunito', fontSize: 14, color: colors.dark },
  nearBtn: { backgroundColor: '#FFF3EE', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 6 },
  nearBtnText: { color: colors.orange, fontFamily: 'Nunito', fontSize: 11, fontWeight: '900' },
  seasonalBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  seasonalTitle: { color: '#fff', fontFamily: 'Comfortaa', fontSize: 16, fontWeight: '700' },
  seasonalSub: { color: 'rgba(255,255,255,0.92)', fontFamily: 'Comfortaa', fontSize: 11.5, marginTop: 2 },
  seasonalCta: { color: '#fff', fontFamily: 'Comfortaa', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden' },
  guideCard: { width: 220, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ece3d7', overflow: 'hidden' },
  guideThumb: { height: 84, backgroundColor: '#f0e7d8', alignItems: 'center', justifyContent: 'center' },
  guideCat: { fontFamily: 'Comfortaa', fontSize: 10, fontWeight: '800', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  guideTitle: { fontFamily: 'Comfortaa', fontSize: 13, fontWeight: '700', color: '#2b2b2b', marginBottom: 4 },
  guideExcerpt: { fontFamily: 'Comfortaa', fontSize: 11, color: '#7a6c56', lineHeight: 15 },
  grabitStrip: { backgroundColor: colors.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  grabitTitle: { color: '#fff', fontFamily: 'Comfortaa', fontSize: 13, fontWeight: '700' },
  grabitSub: { color: 'rgba(255,255,255,0.85)', fontFamily: 'Nunito', fontSize: 10, marginTop: 1 },
  countdownBox: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  countdownText: { color: '#fff', fontFamily: 'Courier', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  countdownLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Nunito', fontSize: 7, marginTop: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark },
  seeAll: { fontFamily: 'Nunito', fontSize: 12, color: colors.orange, fontWeight: '800' },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 6 },
  deptTile: {
    width: (SCREEN_W - 20 - 18) / 4, aspectRatio: 1, borderRadius: 12, overflow: 'hidden',
    position: 'relative', marginBottom: 6, justifyContent: 'flex-end',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  deptScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  deptEmojiWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  deptName: {
    fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: '#fff', lineHeight: 11,
    paddingHorizontal: 5, paddingBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
})
