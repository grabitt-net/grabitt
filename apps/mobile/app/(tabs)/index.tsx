import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { toCard, type Card } from '../../lib/listingMap'
import { ListingCard } from '../../components/ListingCard'

const { width: SCREEN_W } = Dimensions.get('window')

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
  const { user } = useAuth()
  const [featured, setFeatured] = useState<Card[]>([])
  const [justListed, setJustListed] = useState<Card[]>([])
  const [deptFailed, setDeptFailed] = useState<Record<string, boolean>>({})

  // Live data from the backend (public endpoints — same as web).
  useEffect(() => {
    const api = apiClient()
    api.listings.featured.query().then((d: any[]) => setFeatured(d.map(toCard))).catch(() => {})
    api.listings.recent.query().then((d: any[]) => setJustListed(d.map(toCard))).catch(() => {})
  }, [])

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
                onPress={() => router.push(`/dept/${encodeURIComponent(dept.name)}`)}
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

        {/* Featured strip */}
        <View style={s.sectionHeader}>
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
