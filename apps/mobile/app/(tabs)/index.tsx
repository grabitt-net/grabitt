import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'

// Maps a live DB listing to the card shape used on this screen.
type Card = { ref: string; title: string; price: string; location: string; emoji?: string; image?: string }
function toCard(l: any): Card {
  return {
    ref: l.id,
    title: l.title,
    price: `€${Number(l.price).toLocaleString()}`,
    location: l.location ?? 'Gran Canaria',
    image: Array.isArray(l.images) ? l.images[0] : undefined,
    emoji: '🛍️',
  }
}

const { width: SCREEN_W } = Dimensions.get('window')

// ── Data ─────────────────────────────────────────────────────────────────────

const DEPTS = [
  { icon: '🏡', name: 'Home & Garden', grad: ['#56ab2f', '#a8e063'] },
  { icon: '💼', name: 'Jobs',          grad: ['#2193b0', '#6dd5ed'] },
  { icon: '👗', name: 'Fashion',       grad: ['#f7971e', '#ffd200'] },
  { icon: '⚽', name: 'Sport',         grad: ['#11998e', '#38ef7d'] },
  { icon: '🎮', name: 'Gaming',        grad: ['#8E2DE2', '#c471f5'] },
  { icon: '📱', name: 'Electronics',   grad: ['#4776E6', '#8E54E9'] },
  { icon: '🎁', name: 'Gift Ideas',    grad: ['#f953c6', '#b91d73'] },
  { icon: '🧸', name: 'Kids & Baby',   grad: ['#f9d423', '#ff4e50'] },
  { icon: '🏠', name: 'Property',      grad: ['#e96c2a', '#f5a623'] },
  { icon: '💊', name: 'Health & Fitness', grad: ['#43cea2', '#185a9d'] },
  { icon: '🥖', name: 'Food Store',    grad: ['#8e44ad', '#c0392b'] },
  { icon: '🕺', name: 'Retro & Vintage', grad: ['#d35400', '#7a4419'] },
  { icon: '🛍️', name: 'Grab It Now',  grad: [colors.orange, colors.orange2] },
  { icon: '🔧', name: 'Handy Help',    grad: ['#00b09b', '#96c93d'] },
  { icon: '🐾', name: 'Pet Shop',      grad: ['#f093fb', '#f5576c'] },
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

// ── Mini card ─────────────────────────────────────────────────────────────────

function MiniCard({ item, onPress }: { item: Card; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.miniCard}>
      <View style={s.miniCardThumb}>
        {item.image
          ? <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} resizeMode="cover" />
          : <Text style={{ fontSize: 36 }}>{item.emoji}</Text>}
      </View>
      <View style={s.miniCardBody}>
        <Text style={s.miniCardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.miniCardPrice}>{item.price}</Text>
        <Text style={s.miniCardLocation}>📍 {item.location}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [query, setQuery] = useState('')
  const countdown = useCountdown()
  const [featured, setFeatured] = useState<Card[]>([])
  const [justListed, setJustListed] = useState<Card[]>([])

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
        <Image source={require('../../assets/logo.png')} style={{ height: 28, width: 28 * (1470 / 472), resizeMode: 'contain' }} />
        <TouchableOpacity style={s.memberBtn}>
          <Text style={s.memberBtnText}>Member</Text>
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
          {DEPTS.map(dept => (
            <TouchableOpacity
              key={dept.name}
              style={s.deptTile}
              onPress={() => router.push(`/dept/${encodeURIComponent(dept.name)}`)}
            >
              <View style={[s.deptIcon, { backgroundColor: dept.grad[0] }]}>
                <Text style={{ fontSize: 20 }}>{dept.icon}</Text>
              </View>
              <Text style={s.deptName} numberOfLines={2}>{dept.name}</Text>
            </TouchableOpacity>
          ))}
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
          renderItem={({ item }) => (
            <MiniCard
              item={item}
              onPress={() => router.push(`/listing/${item.ref}`)}
            />
          )}
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
          renderItem={({ item }) => (
            <MiniCard
              item={item}
              onPress={() => router.push(`/listing/${item.ref}`)}
            />
          )}
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
  deptTile: { width: (SCREEN_W - 20 - 12) / 3, backgroundColor: '#fff', borderRadius: 12, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#eee', marginBottom: 0 },
  deptIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  deptName: { fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: colors.dark, textAlign: 'center', lineHeight: 12 },
  miniCard: { width: 145, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e0d5', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  miniCardThumb: { width: '100%', aspectRatio: 1.4, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  miniCardBody: { padding: 8 },
  miniCardTitle: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.dark, marginBottom: 2 },
  miniCardPrice: { fontFamily: 'Georgia', fontSize: 13, fontWeight: '700', color: colors.orange },
  miniCardLocation: { fontFamily: 'Nunito', fontSize: 9, color: '#888', marginTop: 2 },
})
