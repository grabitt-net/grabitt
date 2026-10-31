import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { SAFE_TOP } from '../../lib/layout'
import { useAuth } from '../../lib/auth'
import { apiClient, API_URL } from '../../lib/trpc'

type Me = { id?: string; displayName: string; grade: string; salesCount: number; avgRating: number | null; credits: number; isBusiness: boolean; isVerified?: boolean }
type Sub = { plan: string; status: string; trialEnd: string | null; currentPeriodEnd: string | null }

// A single hub metric card — fetches its own value from users.hubMetric.
function MetricCard({ mkey, label, icon, tint, color, token, go }: { mkey: string; label: string; icon: string; tint: string; color: string; token: string; go: () => void }) {
  const [v, setV] = useState<{ value: number; currency: boolean } | null>(null)
  useEffect(() => {
    let live = true
    apiClient(token).users.hubMetric.query({ key: mkey as any }).then((d: any) => { if (live) setV(d) }).catch(() => {})
    return () => { live = false }
  }, [mkey, token])
  const display = v ? (v.currency ? `€${Number(v.value).toLocaleString()}` : String(v.value)) : '—'
  return (
    <TouchableOpacity style={s.metricCard} onPress={go}>
      <View style={[s.metricIcon, { backgroundColor: tint }]}><Text style={{ fontSize: 17 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.metricLabel}>{label}</Text>
        <Text style={[s.metricValue, { color }]}>{display}</Text>
      </View>
      <Text style={{ color: '#ccc', fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const { user, token, signOut } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [subs, setSubs] = useState<Sub[]>([])
  const [threads, setThreads] = useState<any[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'personal' | 'business'>('personal')

  useEffect(() => {
    if (!token) { setMe(null); setSubs([]); setThreads([]); return }
    setLoading(true)
    const api = apiClient(token)
    api.messages.myThreads.query().then((d: any[]) => setThreads(d ?? [])).catch(() => {})
    Promise.all([
      api.users.me.query().then((u: any) => { setMe(u); setMeId(u?.id ?? null); if (u?.isBusiness) setView('business') }).catch(() => {}),
      api.subscriptions.mine.query().then((d: any[]) => setSubs(d)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [token])

  if (!user) {
    return (
      <View style={s.screen}>
        <View style={[s.hero, { paddingTop: SAFE_TOP + 40 }]}>
          <View style={s.avatar}><Text style={{ fontSize: 36 }}>👤</Text></View>
          <Text style={s.name}>Welcome to Grabitt</Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/auth')}>
            <Text style={s.loginBtnText}>Log In / Join</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const activeSub = subs.find(x => ['trialing', 'active', 'past_due'].includes(x.status))
  const daysLeft = (iso: string | null) => iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)) : 0
  const business = view === 'business'

  const startBusiness = async () => {
    if (!token) return
    try { const res = await apiClient(token).subscriptions.createCheckout.mutate({ plan: 'business' }); if (res.url) WebBrowser.openBrowserAsync(res.url) }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not start checkout') }
  }
  const manageBilling = async () => {
    if (!token) return
    try { const res = await apiClient(token).subscriptions.portal.mutate(); if (res.url) WebBrowser.openBrowserAsync(res.url) }
    catch (e: any) { if (/billing account/i.test(e?.message ?? '')) { startBusiness(); return } Alert.alert('Error', e?.message ?? 'Could not open billing') }
  }
  const deleteAccount = () => {
    Alert.alert('Delete account & data (GDPR)', 'This permanently deletes your personal data and signs you out. Your past sales/purchase records are kept as required by law. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { if (token) await apiClient(token).compliance.requestDeletion.mutate() } catch {} await signOut(); router.replace('/(tabs)') } },
    ])
  }

  const SALES = { tint: '#FFF3EE', color: colors.orange }
  const ORDERS = { tint: '#EAF4FF', color: '#2563eb' }
  const PURCH = { tint: '#EAF7EE', color: '#16a34a' }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Hub header */}
      <View style={[s.hero, { paddingTop: SAFE_TOP + 20 }]}>
        <Text style={s.hubTitle}>{me?.isBusiness && business ? 'Business Hub' : 'My Hub'}</Text>
        {/* Personal ↔ Business switcher (business accounts only) */}
        {me?.isBusiness && (
          <View style={s.switcher}>
            {(['personal', 'business'] as const).map(v => (
              <TouchableOpacity key={v} style={[s.switchBtn, view === v && s.switchBtnOn]} onPress={() => setView(v)}>
                <Text style={[s.switchText, view === v && s.switchTextOn]}>{v === 'personal' ? '👤 Personal' : '🏢 Business'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Profile card */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.avatarSm}><Text style={{ fontSize: 26 }}>{me?.isBusiness && business ? '🏢' : '👤'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{me?.displayName ?? user.email}</Text>
            <Text style={s.sub}>{me ? `${prettyGrade(me.grade)} · ⭐ ${me.avgRating ? Number(me.avgRating).toFixed(1) : '—'} · ${me.salesCount} sales` : ' '}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/edit-profile' as any)}><Text style={s.editLink}>Edit</Text></TouchableOpacity>
        </View>
        <View style={s.cardMeta}>
          <Text style={s.metaItem}>{me?.isBusiness ? 'Business' : 'Personal'} account</Text>
          <Text style={s.metaItem}>{me?.isVerified ? '✓ Verified' : 'Not verified'}</Text>
          <Text style={s.metaItem}>{me?.credits ?? 0} credits</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={colors.orange} style={{ marginVertical: 10 }} />}

      {token && (
        <>
          {/* Sales */}
          <Text style={s.colHeader}>📈  Sales</Text>
          <View style={s.metricGroup}>
            <MetricCard mkey="sales" label="Sales" icon="📈" {...SALES} token={token} go={() => router.push('/my-listings?seg=sold' as any)} />
            <MetricCard mkey="sold" label="Sold" icon="🛒" {...SALES} token={token} go={() => router.push('/my-listings?seg=sold' as any)} />
            <MetricCard mkey="beingWatched" label="Being watched" icon="👁" {...SALES} token={token} go={() => router.push('/my-listings?seg=active' as any)} />
          </View>

          {/* Orders */}
          <Text style={s.colHeader}>📦  Orders</Text>
          <View style={s.metricGroup}>
            <MetricCard mkey="orders" label="Orders" icon="📦" {...ORDERS} token={token} go={() => router.push('/my-listings?seg=sold' as any)} />
            <MetricCard mkey="toShip" label="To ship" icon="🚚" {...ORDERS} token={token} go={() => router.push('/my-listings?seg=sold' as any)} />
            <MetricCard mkey="incomeDue" label="Income due" icon="💶" {...ORDERS} token={token} go={() => router.push('/payouts' as any)} />
          </View>

          {/* Purchasing */}
          <Text style={s.colHeader}>🛍️  Purchasing</Text>
          <View style={s.metricGroup}>
            <MetricCard mkey="purchased" label="Purchased" icon="🏷" {...PURCH} token={token} go={() => router.push('/purchases')} />
            <MetricCard mkey="watching" label="Watching" icon="👀" {...PURCH} token={token} go={() => router.push('/wishlist' as any)} />
            <MetricCard mkey="toPay" label="To pay" icon="💳" {...PURCH} token={token} go={() => router.push('/purchases')} />
          </View>
        </>
      )}

      {/* Recent messages */}
      {threads.length > 0 && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={s.sectionLabel}>RECENT MESSAGES</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/messages')}><Text style={s.seeAll}>See all</Text></TouchableOpacity>
          </View>
          {threads.slice(0, 3).map((t: any) => {
            const other = t.participants?.find((p: any) => p.userId !== meId)?.user
            const last = t.messages?.[0]
            const unread = !!last && last.senderId !== meId && !last.readAt
            const preview = last ? (last.blocked ? '⚠️ Message hidden' : (last.senderId === meId ? 'You: ' : '') + last.body) : 'Start chatting…'
            return (
              <TouchableOpacity key={t.id} style={s.msgRow} onPress={() => router.push(`/chat/${t.id}?name=${encodeURIComponent(other?.displayName ?? 'Chat')}`)}>
                <View style={s.msgAvatar}><Text style={{ color: '#fff', fontWeight: '900' }}>{(other?.displayName ?? '?')[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.msgName, unread && { fontWeight: '900' }]} numberOfLines={1}>{other?.displayName ?? 'Grabitt user'}</Text>
                  <Text style={[s.msgPreview, unread && { color: colors.dark, fontWeight: '700' }]} numberOfLines={1}>{preview}</Text>
                </View>
                {unread && <View style={s.msgDot} />}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Subscription */}
      <View style={s.card}>
        {activeSub ? (
          <>
            <Text style={s.blockTitle}>🏢 {prettyGrade(activeSub.plan)} subscription</Text>
            <Text style={s.blockSub}>{activeSub.status === 'trialing' ? `Free trial · ${daysLeft(activeSub.trialEnd)} days left` : activeSub.status === 'active' ? `Active${activeSub.currentPeriodEnd ? ` · renews ${new Date(activeSub.currentPeriodEnd).toLocaleDateString()}` : ''}` : activeSub.status}</Text>
            <TouchableOpacity style={s.outlineBtn} onPress={manageBilling}><Text style={s.outlineBtnText}>Manage subscription</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.blockTitle}>🏢 Upgrade to Business</Text>
            <Text style={s.blockSub}>Storefront + Dealer status · 7 days free, then €29/mo</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={startBusiness}><Text style={s.primaryBtnText}>Start free trial</Text></TouchableOpacity>
          </>
        )}
      </View>

      {/* Menu — business items first in business view */}
      {(business
        ? [
            { icon: '🏢', label: 'Business Centre', onPress: () => router.push('/business-centre' as any) },
            { icon: '💰', label: 'Payouts (get paid)', onPress: () => router.push('/payouts' as any) },
            { icon: '📋', label: 'My Listings', onPress: () => router.push('/my-listings' as any) },
            { icon: '🛒', label: 'My Purchases & Handovers', onPress: () => router.push('/purchases') },
            { icon: '🌟', label: 'My reviews', onPress: () => router.push('/reviews' as any) },
            { icon: '⭐', label: 'Rewards & credits', onPress: () => router.push('/rewards' as any) },
            { icon: '🏅', label: 'My grade', onPress: () => router.push('/grade' as any) },
            { icon: '❤️', label: 'Saved items', onPress: () => router.push('/wishlist' as any) },
            { icon: '🔔', label: 'Notifications', onPress: () => router.push('/notifications' as any) },
            { icon: '✏️', label: 'Edit profile', onPress: () => router.push('/edit-profile' as any) },
            { icon: '⚙️', label: 'Account settings', onPress: () => router.push('/settings' as any) },
          ]
        : [
            { icon: '🛒', label: 'My Purchases & Handovers', onPress: () => router.push('/purchases') },
            { icon: '📋', label: 'My Listings', onPress: () => router.push('/my-listings' as any) },
            { icon: '❤️', label: 'Saved items', onPress: () => router.push('/wishlist' as any) },
            { icon: '🔔', label: 'Notifications', onPress: () => router.push('/notifications' as any) },
            { icon: '⭐', label: 'Rewards & credits', onPress: () => router.push('/rewards' as any) },
            { icon: '🏅', label: 'My grade', onPress: () => router.push('/grade' as any) },
            { icon: '🌟', label: 'My reviews', onPress: () => router.push('/reviews' as any) },
            { icon: '💰', label: 'Payouts (get paid)', onPress: () => router.push('/payouts' as any) },
            { icon: '💼', label: 'Work profile', onPress: () => router.push('/recruitment' as any) },
            { icon: '🏢', label: 'Business Centre', onPress: () => router.push('/business-centre' as any) },
            { icon: '✏️', label: 'Edit profile', onPress: () => router.push('/edit-profile' as any) },
            { icon: '⚙️', label: 'Account settings', onPress: () => router.push('/settings' as any) },
          ]
      ).map(item => (
        <TouchableOpacity key={item.label} style={s.menuRow} onPress={item.onPress}>
          <Text style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.icon}</Text>
          <Text style={s.menuLabel}>{item.label}</Text>
          <Text style={{ color: '#ccc', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.logout} onPress={async () => { await signOut() }}><Text style={s.logoutText}>Log out</Text></TouchableOpacity>

      <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
        <Text style={s.gdprLabel}>YOUR DATA (GDPR)</Text>
        <Text style={s.gdprNote}>Permanently delete your account and personal data. Past sales/purchase records are retained as required by law.</Text>
        <TouchableOpacity style={s.deleteBtn} onPress={deleteAccount}><Text style={s.deleteText}>🗑 Delete my account & data</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 20 }}>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}><Text style={s.legalLink}>Privacy Policy</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/terms`)}><Text style={s.legalLink}>Terms of Service</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const prettyGrade = (g: string) => (g ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f3ef' },
  hero: { backgroundColor: colors.sand, alignItems: 'center', paddingBottom: 18, paddingHorizontal: 16 },
  hubTitle: { fontFamily: 'Comfortaa', fontSize: 22, fontWeight: '700', color: colors.dark },
  switcher: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 50, padding: 3, marginTop: 12, borderWidth: 1, borderColor: colors.sand2 },
  switchBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 50 },
  switchBtnOn: { backgroundColor: colors.orange },
  switchText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '900', color: '#7a6a55' },
  switchTextOn: { color: '#fff' },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarSm: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Nunito', fontSize: 17, fontWeight: '800', color: colors.dark },
  sub: { fontFamily: 'Nunito', fontSize: 12, color: '#7a6a55', marginTop: 3 },
  editLink: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.orange },
  loginBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 11, marginTop: 12 },
  loginBtnText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
  card: { backgroundColor: '#fff', marginHorizontal: 14, marginTop: 14, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ece3d7' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0ebe4' },
  metaItem: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#6a5a48', backgroundColor: '#faf6ef', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  colHeader: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.dark, marginHorizontal: 18, marginTop: 20, marginBottom: 8 },
  metricGroup: { marginHorizontal: 14, gap: 10 },
  metricCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#eef0f4' },
  metricIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#888' },
  metricValue: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', marginTop: 1 },
  sectionLabel: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1 },
  seeAll: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.orange },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  msgAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  msgName: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '700', color: colors.dark },
  msgPreview: { fontFamily: 'Nunito', fontSize: 11.5, color: '#888', marginTop: 1 },
  msgDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.orange },
  blockTitle: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark },
  blockSub: { fontFamily: 'Nunito', fontSize: 12, color: '#777', marginTop: 4, marginBottom: 10 },
  primaryBtn: { backgroundColor: colors.orange, borderRadius: 12, padding: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
  outlineBtn: { borderWidth: 1.5, borderColor: colors.orange, borderRadius: 12, padding: 11, alignItems: 'center' },
  outlineBtnText: { color: colors.orange, fontWeight: '900', fontFamily: 'Nunito' },
  menuRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuLabel: { flex: 1, fontFamily: 'Nunito', fontSize: 14, color: colors.dark, fontWeight: '600', marginLeft: 6 },
  logout: { alignItems: 'center', padding: 16, marginTop: 8 },
  logoutText: { color: '#ef4444', fontWeight: '800', fontFamily: 'Nunito', fontSize: 14 },
  gdprLabel: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 6 },
  gdprNote: { fontFamily: 'Nunito', fontSize: 12, color: '#888', lineHeight: 18, marginBottom: 10 },
  deleteBtn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 13, alignItems: 'center' },
  deleteText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
  legalLink: { fontFamily: 'Nunito', fontSize: 12, color: '#999', textDecorationLine: 'underline' },
})
