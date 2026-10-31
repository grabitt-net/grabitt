import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image, Alert } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient, API_URL } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { toCard, type Card, DEPT_ENUM } from '../../lib/listingMap'
import { ListingCard } from '../../components/ListingCard'
import { getViews } from '../../lib/recentViews'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Location from 'expo-location'

// Main Gran Canaria towns with coordinates, for resolving "Near Me" to the
// nearest town (mirrors the web Topbar list).
const NEAR_TOWNS: { name: string; lat: number; lng: number }[] = [
  { name: 'Las Palmas de Gran Canaria', lat: 28.1235, lng: -15.4363 },
  { name: 'Telde', lat: 27.9985, lng: -15.4197 },
  { name: 'Maspalomas', lat: 27.7606, lng: -15.586 },
  { name: 'Playa del Inglés', lat: 27.756, lng: -15.573 },
  { name: 'Vecindario', lat: 27.816, lng: -15.447 },
  { name: 'Arguineguín', lat: 27.76, lng: -15.685 },
  { name: 'Puerto Rico', lat: 27.79, lng: -15.71 },
  { name: 'Mogán', lat: 27.887, lng: -15.723 },
  { name: 'Gáldar', lat: 28.144, lng: -15.651 },
  { name: 'Arucas', lat: 28.119, lng: -15.523 },
]
function nearestTown(lat: number, lng: number): string {
  let best = NEAR_TOWNS[0], bestD = Infinity
  for (const t of NEAR_TOWNS) { const d = (lat - t.lat) ** 2 + (lng - t.lng) ** 2; if (d < bestD) { bestD = d; best = t } }
  return best.name
}

const { width: SCREEN_W } = Dimensions.get('window')

// Jobs and Property have bespoke screens (salary/beds/baths etc.); everything
// else uses the generic department grid.
function catRoute(cat: Cat): string {
  // Route by the stored department slug (survives renames); fall back to the
  // display-name lookup for any tile without one — same logic as the web.
  const slug = cat.department || DEPT_ENUM[cat.name]
  if (slug === 'jobs') return '/jobs'
  if (slug === 'property') return '/property'
  if (slug === 'handy_help') return '/handy'
  // Mobile department screen is keyed by display name.
  return `/dept/${encodeURIComponent(cat.name)}`
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


// Department tiles — mirrors the web CategoryGrid. The admin-ordered list comes
// from homepage.categories at runtime; this is the fallback/default order and
// shape. Artwork lives on the web public folder (/categories/*.jpg) with the
// category name baked in, so mobile loads it from the web origin.
type Cat = { name: string; img?: string | null; imgEs?: string | null; department?: string | null }

const DEFAULT_CATEGORIES: Cat[] = [
  { name: 'Home & Garden', img: '/categories/home-garden.jpg' },
  { name: 'Fashion', img: '/categories/fashion.jpg' },
  { name: 'Sport', img: '/categories/sport.jpg' },
  { name: 'Gaming', img: '/categories/gaming.jpg' },
  { name: 'Electronics', img: '/categories/electronics.jpg' },
  { name: 'Gift Ideas', img: '/categories/gift-ideas.jpg' },
  { name: 'Kids & Baby', img: '/categories/kids-baby.jpg' },
  { name: 'Health, Fitness & Diet', img: '/categories/health-beauty.jpg' },
  { name: 'Retro & Vintage', img: '/categories/retro.jpg' },
  { name: 'Handy Help', img: '/categories/handy-help-v2.jpg' },
  { name: 'Pet Supplies', img: '/categories/pet-supplies.jpg' },
  { name: 'Hobbies & Crafts', img: '/categories/hobbies-crafts.jpg' },
]

// Category artwork is served from the web public folder — turn the stored
// relative path into an absolute URL against the web/API origin.
function catImg(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

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

// Default section order when no admin layout is configured — mirrors the web
// HomeSections DEFAULT_ORDER so mobile and web agree out of the box.
const DEFAULT_SECTIONS = ['hero_banner', 'featured', 'departments', 'recommended', 'recently_viewed', 'seasonal_banner', 'mid_banner', 'listings', 'just_listed', 'community', 'trust']

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [query, setQuery] = useState('')
  const { user, token } = useAuth()
  const [featured, setFeatured] = useState<Card[]>([])
  const [justListed, setJustListed] = useState<Card[]>([])
  const [recommended, setRecommended] = useState<Card[]>([])
  const [recent, setRecent] = useState<Card[]>([])
  const [guides, setGuides] = useState<any[]>([])
  const [categories, setCategories] = useState<Cat[]>(DEFAULT_CATEGORIES)
  const [deptFailed, setDeptFailed] = useState<Record<string, boolean>>({})
  // Admin-controlled homepage layout (same source as the web HomeSections).
  const [layoutKeys, setLayoutKeys] = useState<string[] | null>(null)
  const [hero, setHero] = useState<any[]>([])
  const [topBanners, setTopBanners] = useState<any[]>([])
  const [midBanners, setMidBanners] = useState<any[]>([])

  // Live data from the backend (public endpoints — same as web).
  useEffect(() => {
    const api = apiClient()
    api.listings.featured.query().then((d: any[]) => setFeatured(d.map(toCard))).catch(() => {})
    api.listings.recent.query().then((d: any[]) => setJustListed(d.map(toCard))).catch(() => {})
    getViews().then(setRecent).catch(() => {})
    api.community.list.query({ limit: 8 }).then((d: any[]) => setGuides(d)).catch(() => {})
    // Admin-ordered department tiles — same source as the web CategoryGrid.
    api.homepage.categories.query().then((rows: Cat[]) => { if (rows?.length) setCategories(rows) }).catch(() => {})
    // Hero slides + sponsor banner slots (same sources as the web homepage).
    api.homepage.heroSlides.query().then((d: any[]) => setHero(d)).catch(() => {})
    api.banners.active.query({ position: 'home_top' } as any).then((d: any[]) => setTopBanners(d)).catch(() => {})
    api.banners.active.query({ position: 'home_mid' } as any).then((d: any[]) => setMidBanners(d)).catch(() => {})
    // Admin homepage layout: which sections show, in what order. Fall back to the
    // web's default order if nothing is configured or the fetch fails.
    api.homepage.layout.query()
      .then((rows: any[]) => {
        const list = (rows ?? []) as { key: string; enabled: boolean }[]
        setLayoutKeys(list.length ? list.filter(r => r.enabled).map(r => r.key) : DEFAULT_SECTIONS)
      })
      .catch(() => setLayoutKeys(DEFAULT_SECTIONS))
  }, [])

  // Personalised "Recommended for you" (needs login — uses your interests).
  useEffect(() => {
    if (!token) { setRecommended([]); return }
    apiClient(token).listings.recommended.query().then((d: any[]) => setRecommended(d.map(toCard))).catch(() => {})
  }, [token])

  // A horizontal strip of listing cards (Featured / Recommended / Recently viewed).
  const strip = (title: string, data: Card[]) => data.length === 0 ? null : (
    <>
      <View style={[s.sectionHeader, { marginTop: 20 }]}><Text style={s.sectionTitle}>{title}</Text></View>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
        keyExtractor={(i, idx) => i.ref + idx}
        renderItem={({ item }) => <ListingCard item={item} width={158} />}
      />
    </>
  )

  // A sponsor banner slot (admin-managed) — renders the first active banner.
  // Open a banner/hero link: internal app paths navigate natively, external
  // URLs open in the in-app browser (never kick the user out to the OS browser).
  const openLink = (url?: string | null) => {
    if (!url) return
    if (/^https?:\/\//.test(url)) WebBrowser.openBrowserAsync(url)
    else if (url.startsWith('/')) router.push(url as any)
    else WebBrowser.openBrowserAsync(`${API_URL}/${url.replace(/^\//, '')}`)
  }

  // Near Me — resolve the device location to the nearest Gran Canaria town and
  // search there (server has no radius filter, so we search by town).
  const nearMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Location off', 'Allow location access to find listings near you.'); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      const town = nearestTown(pos.coords.latitude, pos.coords.longitude)
      router.push(`/search?q=${encodeURIComponent(town)}` as any)
    } catch { Alert.alert('Could not get location', 'Please try again.') }
  }

  const bannerSlot = (list: any[]) => {
    const b = list?.[0]
    if (!b?.imageUrl) return null
    return (
      <TouchableOpacity style={s.sponsorBanner} activeOpacity={0.9} onPress={() => openLink(b.linkUrl)}>
        <Image source={{ uri: b.imageUrl }} style={{ width: '100%', aspectRatio: 1053 / 163 }} resizeMode="cover" />
      </TouchableOpacity>
    )
  }

  // Render one homepage section by its admin key (mirrors web HomeSections).
  const renderSection = (key: string) => {
    switch (key) {
      case 'hero_banner': {
        const h = hero?.[0]
        if (!h?.imageUrl) return null
        return (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openLink(h.linkUrl)}>
            <Image source={{ uri: h.imageUrl }} style={{ width: '100%', aspectRatio: 1053 / 320 }} resizeMode="cover" />
          </TouchableOpacity>
        )
      }
      case 'seasonal_banner': {
        const c = currentSeasonal()
        return (
          <TouchableOpacity style={[s.seasonalBanner, { backgroundColor: c.grad }]} onPress={() => router.push(catRoute({ name: c.dept }) as any)}>
            <Text style={{ fontSize: 34 }}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.seasonalTitle}>{c.title}</Text>
              <Text style={s.seasonalSub}>{c.sub}</Text>
            </View>
            <Text style={s.seasonalCta}>Shop</Text>
          </TouchableOpacity>
        )
      }
      case 'quick_actions':
        return (
          <View style={s.quickRow}>
            {[
              { icon: 'briefcase-outline', label: 'Recruitment', go: () => router.push('/jobs') },
              { icon: 'business-outline', label: 'Property', go: () => router.push('/property') },
              { icon: 'star-outline', label: 'For Business', go: () => WebBrowser.openBrowserAsync(`${API_URL}/for-business`) },
              { icon: 'clipboard-outline', label: 'Business Directory', go: () => router.push('/directory') },
            ].map(q => (
              <TouchableOpacity key={q.label} style={s.quickPill} onPress={q.go as any}>
                <Ionicons name={q.icon as any} size={15} color={colors.orange} />
                <Text style={s.quickPillText} numberOfLines={2}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      case 'mid_banner': return bannerSlot(midBanners)
      case 'featured': return strip('👀 Featured', featured)
      case 'recommended': return strip('✨ Recommended for you', recommended)
      case 'recently_viewed': return strip('🕘 Recently viewed', recent)
      case 'just_listed': return strip('🆕 Just Listed', justListed)
      case 'listings': return strip('🛍️ Fresh on Grabitt', justListed)
      case 'departments':
        return (
          <>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Departments</Text></View>
            <View style={s.deptGrid}>
              {categories.map(cat => {
                const uri = catImg(cat.imgEs || cat.img)
                const showImg = !!uri && !deptFailed[cat.name]
                return (
                  <TouchableOpacity key={cat.name} style={s.deptTile} activeOpacity={0.85} onPress={() => router.push(catRoute(cat) as any)}>
                    {showImg
                      ? <Image source={{ uri: uri! }} resizeMode="cover" onError={() => setDeptFailed(f => ({ ...f, [cat.name]: true }))} style={StyleSheet.absoluteFill} />
                      : <View style={s.deptPlaceholder}>
                          <Text style={s.deptPlaceholderText} numberOfLines={2}>{cat.name.toUpperCase()}</Text>
                          <Text style={s.deptPlaceholderHeart}>♥</Text>
                        </View>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )
      case 'community':
        return guides.length === 0 ? null : (
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
        )
      case 'trust':
        return (
          <View style={s.trustRow}>
            {[['🔒', 'Secure escrow'], ['🤝', 'Safe handovers'], ['⭐', 'Rated sellers']].map(([e, t]) => (
              <View key={t} style={s.trustItem}><Text style={{ fontSize: 20 }}>{e}</Text><Text style={s.trustText}>{t}</Text></View>
            ))}
          </View>
        )
      default: return null
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Topbar — logo + tagline (matches the web header) */}
      <View style={s.topbar}>
        <Image source={require('../../assets/logo.png')} resizeMode="contain" style={{ height: 28, width: 28 * (1470 / 472) }} />
        <Text style={s.tagline}>Your Everything, Local</Text>
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
            <TouchableOpacity style={s.nearBtn} onPress={nearMe}>
              <Text style={s.nearBtnText}>📍 Near Me</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Icon rail — matches the web top nav (Alerts, Saved, Login, Messages, Sell, Help) */}
        <View style={s.rail}>
          {[
            { icon: 'notifications-outline', label: 'Alerts', go: () => router.push('/notifications' as any) },
            { icon: 'heart-outline', label: 'Saved', go: () => router.push('/wishlist' as any) },
            { icon: user ? 'person-outline' : 'log-in-outline', label: user ? 'Account' : 'Login', go: () => router.push(user ? '/(tabs)/profile' : '/auth') },
            { icon: 'chatbubble-outline', label: 'Messages', go: () => router.push('/(tabs)/messages') },
            { icon: 'cube', label: 'Sell', go: () => router.push('/(tabs)/sell'), hot: true },
            { icon: 'help-buoy-outline', label: 'Help', go: () => WebBrowser.openBrowserAsync(`${API_URL}/help`) },
          ].map(r => (
            <TouchableOpacity key={r.label} style={s.railItem} onPress={r.go as any}>
              <View style={[s.railIcon, (r as any).hot && s.railIconHot]}>
                <Ionicons name={r.icon as any} size={19} color={(r as any).hot ? '#fff' : colors.dark} />
              </View>
              <Text style={[s.railLabel, (r as any).hot && { color: colors.orange }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grabitt NOW promo bar (matches the web home banner) */}
        <TouchableOpacity style={s.grabittNow} activeOpacity={0.9} onPress={() => router.push('/dept/Grab%20It%20Now' as any)}>
          <Text style={s.grabittNowText}>⚡  Grabitt NOW! Limited Time Offers  ⚡</Text>
        </TouchableOpacity>

        {/* Sponsor hero banner — admin-managed (web home_top slot) */}
        {bannerSlot(topBanners)}

        {/* Admin-controlled homepage sections, in order (mirrors web HomeSections) */}
        {(layoutKeys ?? []).map(k => <View key={k}>{renderSection(k)}</View>)}

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
  searchRow: { backgroundColor: colors.sand, padding: 10, borderBottomWidth: 1.5, borderBottomColor: colors.sand2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sand2 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 50, paddingLeft: 14, paddingRight: 6, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
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
  // 4 columns of wide banner tiles (2.35:1), matching the web CategoryGrid.
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  grabittNow: { backgroundColor: colors.orange, marginHorizontal: 14, marginTop: 14, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  grabittNowText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  sponsorBanner: { marginHorizontal: 14, marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#faf6ef', marginHorizontal: 14, marginTop: 20, borderRadius: 14, paddingVertical: 16 },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#6b5a41' },
  quickRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 16 },
  quickPill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#FFF3EE', borderRadius: 12, paddingHorizontal: 4, paddingVertical: 8 },
  quickPillText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: colors.dark, textAlign: 'center', lineHeight: 12 },
  tagline: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#9a8b74' },
  rail: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.sand, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: colors.sand2 },
  railItem: { alignItems: 'center', gap: 3, flex: 1 },
  railIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sand2 },
  railIconHot: { backgroundColor: colors.orange, borderColor: colors.orange },
  railLabel: { fontFamily: 'Nunito', fontSize: 9.5, fontWeight: '800', color: colors.dark },
  deptTile: {
    // Explicit height (not aspectRatio): the tile's only child is an
    // absoluteFill image, and on Android aspectRatio with no in-flow child
    // collapses the height to ~0 (tiles showed as thin lines).
    width: (SCREEN_W - 24 - 10) / 2, height: ((SCREEN_W - 24 - 10) / 2) / 2.35, borderRadius: 16, overflow: 'hidden',
    position: 'relative', backgroundColor: '#f6f1e6',
    borderWidth: 1, borderColor: '#e8ddc7',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  deptPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 4, backgroundColor: '#f6f1e6' },
  deptPlaceholderText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: '#33352f', textAlign: 'center', lineHeight: 15, letterSpacing: 0.2 },
  deptPlaceholderHeart: { color: '#8a9a5b', fontSize: 11, marginTop: 1 },
})
