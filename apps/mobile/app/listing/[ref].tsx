import { useEffect, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image, Modal, TextInput, Dimensions } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Alert, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { colors, PRICES } from '@grabitt/design-tokens'

const SCREEN_W = Dimensions.get('window').width
import { apiClient } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { toCard } from '../../lib/listingMap'
import { pushView } from '../../lib/recentViews'

const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

type Item = { emoji: string; title: string; price: string; location: string; category: string; condition?: string; isFeatured?: boolean; image?: string; images?: string[]; lat?: number | null; lng?: number | null; offersCollection?: boolean; description?: string; tags?: string[]; stock?: number; viewCount?: number; watching?: number; sellerOther?: any[]; sellerId?: string; seller?: { name: string; grade: string; rating: number | null; sales: number }; job?: any }

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

export default function ListingScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>()
  const { token } = useAuth()
  const [fetched, setFetched] = useState<Item | null>(null)
  const [meId, setMeId] = useState<string | null>(null)
  const [comps, setComps] = useState<any>(null)
  const [rawPrice, setRawPrice] = useState<number | null>(null)
  const [dept, setDept] = useState<string | null>(null)
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [following, setFollowing] = useState(false)
  const insets = useSafeAreaInsets()

  const toggleFollow = async () => {
    const sid = fetched?.sellerId
    if (!sid) return
    if (!token) { Alert.alert('Please log in', 'Log in to follow sellers.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    const next = !following
    setFollowing(next) // optimistic
    try {
      if (next) await apiClient(token).follow.follow.mutate({ sellerId: sid })
      else await apiClient(token).follow.unfollow.mutate({ sellerId: sid })
    } catch { setFollowing(!next) }
  }

  // Report reasons — ids must match the server REASON_MAP / web report panel.
  const REPORT_REASONS: [string, string][] = [
    ['scam', 'Scam or fraud'],
    ['counterfeit', 'Counterfeit item'],
    ['prohibited', 'Prohibited/illegal item'],
    ['misleading', 'Misleading or fake listing'],
    ['price_gouging', 'Unfair pricing'],
    ['duplicate', 'Duplicate listing'],
    ['contact_info_leak', 'Shares contact details'],
    ['other', 'Something else'],
  ]
  const submitReport = async (reason: string) => {
    if (!token) { setReportOpen(false); Alert.alert('Please log in', 'Log in to report a listing.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    setReportBusy(true)
    try {
      await apiClient(token).reports.create.mutate({ listingId: ref as string, reason })
      setReportOpen(false)
      Alert.alert('Report sent', 'Thanks — our team will review this listing.')
    } catch (e: any) { Alert.alert('Could not send report', e?.message ?? 'Try again') }
    finally { setReportBusy(false) }
  }

  useEffect(() => {
    if (token) apiClient(token).users.me.query().then((u: any) => setMeId(u?.id ?? null)).catch(() => {})
  }, [token])

  const isOwner = !!meId && !!fetched?.sellerId && meId === fetched.sellerId

  // Follow state for the seller (public query; reflects my follow if logged in).
  useEffect(() => {
    const sid = fetched?.sellerId
    if (!sid || isOwner) return
    apiClient(token ?? undefined).follow.status.query({ sellerId: sid })
      .then((r: any) => setFollowing(!!r.following)).catch(() => {})
  }, [fetched?.sellerId, isOwner, token])
  // Jobs and property use their own CTAs, not Buy/Offer.
  const isBuyable = dept !== 'jobs' && dept !== 'property'

  // Buy Now → the escrow checkout flow (payment held until handover).
  const buyNow = () => {
    if (!token) { Alert.alert('Please log in', 'Log in to buy this item.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    router.push(`/checkout/${ref}`)
  }

  // Make Offer → offers.make, after collecting an amount.
  const submitOffer = async () => {
    const amount = Number(offerAmount)
    if (!amount || amount <= 0) { Alert.alert('Enter an amount', 'Please enter a valid offer amount.'); return }
    setOfferBusy(true)
    try {
      await apiClient(token!).offers.make.mutate({ listingId: ref as string, amount })
      setOfferOpen(false); setOfferAmount('')
      Alert.alert('Offer sent', 'The seller has been notified of your offer.')
    } catch (e: any) { Alert.alert('Could not send offer', e?.message ?? 'Try again') }
    finally { setOfferBusy(false) }
  }
  const openOffer = () => {
    if (!token) { Alert.alert('Please log in', 'Log in to make an offer.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    setOfferOpen(true)
  }

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
    apiClient().listings.comparables.query({ id: ref as string })
      .then((c: any) => { if (c && c.count > 0) setComps(c) })
      .catch(() => {})
    apiClient().listings.byId.query({ id: ref as string })
      .then((l: any) => { pushView(toCard(l)); setRawPrice(Number(l.price)); setDept(l.department); setFetched({
        emoji: '🛍️',
        title: l.title,
        price: `€${Number(l.price).toLocaleString()}`,
        location: l.location ?? 'Gran Canaria',
        category: pretty(l.department),
        condition: l.condition ? pretty(l.condition) : undefined,
        isFeatured: l.isFeatured,
        image: Array.isArray(l.images) ? l.images[0] : undefined,
        images: Array.isArray(l.images) ? l.images : [],
        lat: l.lat ?? null,
        lng: l.lng ?? null,
        offersCollection: l.offersCollection !== false,
        viewCount: typeof l.viewCount === 'number' ? l.viewCount : undefined,
        watching: l._count?.wishlistItems,
        sellerOther: Array.isArray(l.sellerOther) ? l.sellerOther : [],
        description: l.description,
        tags: Array.isArray(l.tags) ? l.tags : [],
        stock: typeof l.stock === 'number' ? l.stock : undefined,
        sellerId: l.seller?.id,
        seller: l.seller ? { name: l.seller.displayName, grade: l.seller.grade, rating: l.seller.avgRating, sales: l.seller.salesCount } : undefined,
        job: l.jobListing ?? undefined,
      }) })
      .catch(() => {})
  }, [ref])

  const item: Item = fetched || {
    emoji: '🛍️',
    title: decodeURIComponent(ref || 'Item'),
    price: 'POA',
    location: 'Gran Canaria',
    category: 'General',
  }
  const imgs: string[] = (item.images && item.images.length ? item.images : (item.image ? [item.image] : []))

  return (
    <View style={s.screen}>
      {/* Back button floated over hero */}
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={{ color: colors.orange, fontSize: 22 }}>‹</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero — swipeable gallery; images shown in full (contain) over the
            brand sand, so nothing is cropped. */}
        <View style={s.hero}>
          {imgs.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setGalleryIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
              >
                {imgs.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={{ width: SCREEN_W, height: '100%' }} resizeMode="contain" />
                ))}
              </ScrollView>
              {imgs.length > 1 && (
                <View style={s.dots}>
                  {imgs.map((_, i) => <View key={i} style={[s.dot, i === galleryIdx && s.dotActive]} />)}
                </View>
              )}
            </>
          ) : (
            <Text style={{ fontSize: 90 }}>{item.emoji}</Text>
          )}
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
          {/* Demand signals — real counts from the listing */}
          {(item.viewCount != null || !!item.watching) && (
            <View style={s.signals}>
              {item.viewCount != null && <View style={s.signalPill}><Text style={s.signalText}>👁 {item.viewCount.toLocaleString()} view{item.viewCount === 1 ? '' : 's'}</Text></View>}
              {!!item.watching && <View style={s.signalPill}><Text style={s.signalText}>⚡ {item.watching} watching</Text></View>}
            </View>
          )}

          {/* Title + price */}
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.price}>{item.price}</Text>
          {dept !== 'jobs' && dept !== 'property' && typeof item.stock === 'number' && (
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: item.stock > 0 ? '#2d996b' : '#c1121f', marginTop: 4 }}>
              {item.stock > 0 ? `${item.stock} in stock${item.stock > 1 ? ' — multi-buy available' : ''}` : 'Out of stock'}
            </Text>
          )}

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
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              {!isOwner && (
                <TouchableOpacity style={[s.followBtn, following && s.followBtnOn]} onPress={toggleFollow}>
                  <Text style={[s.followBtnText, following && s.followBtnTextOn]}>{following ? '✓ Following' : '+ Follow'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.msgBtn} onPress={startChat}><Text style={s.msgBtnText}>Message</Text></TouchableOpacity>
            </View>
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

          {/* Sold-price comparables */}
          {comps && dept !== 'jobs' && dept !== 'property' && (
            <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ece3d7', padding: 14, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#2b2b2b', marginBottom: 10 }}>Recently sold — similar items</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[{ k: 'Average', v: comps.avg }, { k: 'Lowest', v: comps.min }, { k: 'Highest', v: comps.max }].map(m => (
                  <View key={m.k} style={{ flex: 1, backgroundColor: '#f5f0e8', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10.5, color: '#9a8b74', marginBottom: 2 }}>{m.k}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#2b2b2b' }}>€{Number(m.v).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
              {!!comps.avg && !!rawPrice && (() => {
                const diff = Math.round(((rawPrice - comps.avg) / comps.avg) * 100)
                const good = diff <= 0
                return (
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: good ? '#2d996b' : '#c1121f', marginBottom: 8 }}>
                    {diff === 0 ? 'Priced right at the average' : `${Math.abs(diff)}% ${good ? 'below' : 'above'} the average sold price`}
                  </Text>
                )
              })()}
              {comps.recent.map((r: any, i: number) => (
                <TouchableOpacity key={i} onPress={() => router.push(`/listing/${r.id}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < comps.recent.length - 1 ? 1 : 0, borderBottomColor: '#f0e9df' }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: '#555', marginRight: 8 }}>{r.title}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#2b2b2b' }}>€{Number(r.amount).toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
              <Text style={{ fontSize: 10.5, color: '#9a8b74', marginTop: 8 }}>Based on {comps.count} recent sale{comps.count === 1 ? '' : 's'}.</Text>
            </View>
          )}

          {/* Location — inline Google Maps embed (same as web; no API key needed),
              with a tap-through to open the pin in the device maps app. */}
          {(() => {
            const hasPin = item.lat != null && item.lng != null
            const q = hasPin
              ? `${item.lat},${item.lng}`
              : (item.job?.address || `${item.location}, Gran Canaria`).trim()
            return (
              <View style={s.mapWrap}>
                <WebView
                  style={s.mapEmbed}
                  source={{ uri: `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${hasPin ? 16 : 13}&output=embed` }}
                  scrollEnabled={false}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  style={s.mapOpen}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)}
                >
                  <Text style={s.mapOpenText}>📍 {item.job?.address || `${item.location}, Gran Canaria`} · Open in Maps</Text>
                </TouchableOpacity>
              </View>
            )
          })()}

          {/* Report — safety action for non-owners */}
          {!isOwner && (
            <TouchableOpacity onPress={() => setReportOpen(true)} style={s.reportLink}>
              <Text style={s.reportLinkText}>🚩 Report this listing</Text>
            </TouchableOpacity>
          )}

          {/* More from this seller — real live items */}
          {Array.isArray(item.sellerOther) && item.sellerOther.length > 0 && (
            <>
              <Text style={s.similarHeading}>More from this seller</Text>
              <View style={s.similarRow}>
                {item.sellerOther.slice(0, 3).map((sim: any) => {
                  const thumb = Array.isArray(sim.images) ? sim.images[0] : undefined
                  return (
                    <TouchableOpacity key={sim.id} style={s.simCard} onPress={() => router.push(`/listing/${sim.id}`)}>
                      <View style={s.simThumb}>
                        {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 28 }}>🛍️</Text>}
                      </View>
                      <Text style={s.simTitle} numberOfLines={1}>{sim.title}</Text>
                      <Text style={s.simPrice}>€{Number(sim.price).toLocaleString()}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Fixed action buttons — padded above the Android system-nav bar. */}
      <View style={[s.actions, { paddingBottom: 14 + insets.bottom }]}>
        {isOwner ? (
          <>
            <TouchableOpacity style={s.buyBtn} onPress={() => promote('grab_it_now')}>
              <Text style={s.buyBtnText}>⚡ Grab It Now €{PRICES.grabItNow}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.offerBtn} onPress={() => promote('featured')}>
              <Text style={s.offerBtnText}>👀 Feature €{PRICES.featuredPerWeek}/wk</Text>
            </TouchableOpacity>
          </>
        ) : isBuyable ? (
          <>
            <TouchableOpacity style={s.buyBtn} onPress={buyNow}>
              <Text style={s.buyBtnText}>Buy Now · {item.price}</Text>
            </TouchableOpacity>
            {item.offersCollection !== false && (
              <TouchableOpacity style={s.offerBtn} onPress={openOffer}>
                <Text style={s.offerBtnText}>Make Offer</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity style={s.buyBtn} onPress={startChat}>
            <Text style={s.buyBtnText}>{dept === 'jobs' ? 'Apply / Message' : 'Enquire'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Make-offer modal */}
      <Modal visible={offerOpen} transparent animationType="fade" onRequestClose={() => setOfferOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Make an offer</Text>
            <Text style={s.modalSub}>{item.title} · asking {item.price}</Text>
            <View style={s.offerInputRow}>
              <Text style={s.offerCurrency}>€</Text>
              <TextInput
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholder="Your offer"
                placeholderTextColor="#aaa"
                style={s.offerInput}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[s.offerBtn, { flex: 1 }]} onPress={() => setOfferOpen(false)}>
                <Text style={s.offerBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.buyBtn, { flex: 1, opacity: offerBusy ? 0.6 : 1 }]} disabled={offerBusy} onPress={submitOffer}>
                <Text style={s.buyBtnText}>{offerBusy ? 'Sending…' : 'Send offer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report modal */}
      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Report this listing</Text>
            <Text style={s.modalSub}>Why are you reporting it?</Text>
            {REPORT_REASONS.map(([id, label]) => (
              <TouchableOpacity key={id} style={s.reasonRow} disabled={reportBusy} onPress={() => submitReport(id)}>
                <Text style={s.reasonText}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.offerBtn, { marginTop: 12 }]} onPress={() => setReportOpen(false)}>
              <Text style={s.offerBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  backBtn: { position: 'absolute', top: 52, left: 14, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)' },
  dotActive: { backgroundColor: colors.orange, width: 9, height: 9, borderRadius: 5 },
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
  mapWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 18, borderWidth: 1, borderColor: '#ece3d7', backgroundColor: '#f5f0e8' },
  mapEmbed: { width: '100%', height: 200, backgroundColor: '#f5f0e8' },
  mapOpen: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f9f6f2', borderTopWidth: 1, borderTopColor: '#ece3d7' },
  mapOpenText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: colors.orange },
  followBtn: { borderWidth: 1.5, borderColor: colors.orange, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  followBtnOn: { backgroundColor: colors.orange },
  followBtnText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '900', color: colors.orange },
  followBtnTextOn: { color: '#fff' },
  reportLink: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 6 },
  reportLinkText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#b4433a' },
  reasonRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  reasonText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '700', color: colors.dark },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  modalTitle: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  modalSub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginBottom: 16 },
  offerInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f0e8', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#ece3d7' },
  offerCurrency: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark, marginRight: 6 },
  offerInput: { flex: 1, fontFamily: 'Nunito', fontSize: 18, fontWeight: '800', color: colors.dark, paddingVertical: 12 },
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
