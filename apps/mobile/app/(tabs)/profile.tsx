import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../../lib/auth'
import { apiClient, API_URL } from '../../lib/trpc'

type Me = { displayName: string; grade: string; salesCount: number; avgRating: number | null; credits: number; isBusiness: boolean }
type Sub = { plan: string; status: string; trialEnd: string | null; currentPeriodEnd: string | null }

export default function ProfileScreen() {
  const { user, token, signOut } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [subs, setSubs] = useState<Sub[]>([])
  const [dash, setDash] = useState<{ active: number; sold: number; unread: number; offers: number; saved: number } | null>(null)
  const [threads, setThreads] = useState<any[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setMe(null); setSubs([]); setDash(null); setThreads([]); return }
    setLoading(true)
    const api = apiClient(token)
    api.users.dashboard.query().then((d: any) => setDash(d)).catch(() => {})
    api.messages.myThreads.query().then((d: any[]) => setThreads(d ?? [])).catch(() => {})
    Promise.all([
      api.users.me.query().then((u: any) => { setMe(u); setMeId(u?.id ?? null) }).catch(() => {}),
      api.subscriptions.mine.query().then((d: any[]) => setSubs(d)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [token])

  // Not logged in
  if (!user) {
    return (
      <View style={s.screen}>
        <View style={s.hero}>
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

  const startBusiness = async () => {
    if (!token) return
    try {
      const res = await apiClient(token).subscriptions.createCheckout.mutate({ plan: 'business' })
      if (res.url) Linking.openURL(res.url)
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not start checkout') }
  }
  const manageBilling = async () => {
    if (!token) return
    try { const res = await apiClient(token).subscriptions.portal.mutate(); if (res.url) Linking.openURL(res.url) }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not open billing') }
  }
  const deleteAccount = () => {
    Alert.alert('Delete account & data (GDPR)', 'This permanently deletes your personal data and signs you out. Your past sales/purchase records are kept as required by law. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { if (token) await apiClient(token).compliance.requestDeletion.mutate() } catch {}
        await signOut(); router.replace('/(tabs)')
      } },
    ])
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.hero}>
        <View style={s.avatar}><Text style={{ fontSize: 36 }}>{me?.isBusiness ? '🏢' : '👤'}</Text></View>
        <Text style={s.name}>{me?.displayName ?? user.email}</Text>
        <Text style={s.sub}>{me ? `${prettyGrade(me.grade)} · ⭐ ${me.avgRating ? Number(me.avgRating).toFixed(1) : '—'} · ${me.salesCount} sales · ${me.credits} credits` : ' '}</Text>
      </View>

      {loading && <ActivityIndicator color={colors.orange} style={{ marginVertical: 10 }} />}

      {/* At-a-glance overview — real counts, tap to open the area */}
      <View style={s.statGrid}>
        {[
          { label: 'On sale', value: dash?.active, go: () => router.push('/my-listings?seg=active' as any) },
          { label: 'Sold', value: dash?.sold, go: () => router.push('/my-listings?seg=sold' as any) },
          { label: 'Messages', value: dash?.unread, badge: !!dash?.unread, go: () => router.push('/(tabs)/messages') },
          { label: 'Offers', value: dash?.offers, badge: !!dash?.offers, go: () => router.push('/offers' as any) },
          { label: 'Saved', value: dash?.saved, go: () => {} },
          { label: 'Purchases', value: undefined as any, go: () => router.push('/purchases') },
        ].map(t => (
          <TouchableOpacity key={t.label} style={s.statTile} onPress={t.go}>
            <Text style={s.statValue}>{t.value ?? (t.label === 'Purchases' ? '›' : '—')}</Text>
            <Text style={s.statLabel}>{t.label}</Text>
            {t.badge && <View style={s.statDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent messages */}
      {threads.length > 0 && (
        <View style={{ marginHorizontal: 14, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={s.sectionLabel}>RECENT MESSAGES</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/messages')}><Text style={s.seeAll}>See all ›</Text></TouchableOpacity>
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
      <View style={s.block}>
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

      {/* Actions */}
      {[
        { icon: '🛒', label: 'My Purchases & Handovers', onPress: () => router.push('/purchases') },
        { icon: '📋', label: 'My Listings', onPress: () => router.push('/my-listings' as any) },
      ].map(item => (
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
          <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/privacy`)}><Text style={s.legalLink}>Privacy Policy</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/terms`)}><Text style={s.legalLink}>Terms of Service</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const prettyGrade = (g: string) => (g ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  hero: { backgroundColor: colors.sand, alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name: { fontFamily: 'Nunito', fontSize: 18, fontWeight: '800', color: colors.dark },
  sub: { fontFamily: 'Nunito', fontSize: 12, color: '#7a6a55', marginTop: 4 },
  loginBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 11, marginTop: 12 },
  loginBtnText: { color: '#fff', fontWeight: '900', fontFamily: 'Nunito' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 12, gap: 8 },
  statTile: { width: '31%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#efe7db', position: 'relative' },
  statValue: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark },
  statLabel: { fontFamily: 'Nunito', fontSize: 9.5, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  statDot: { position: 'absolute', top: 8, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  sectionLabel: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1 },
  seeAll: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.orange },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  msgAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  msgName: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '700', color: colors.dark },
  msgPreview: { fontFamily: 'Nunito', fontSize: 11.5, color: '#888', marginTop: 1 },
  msgDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.orange },
  block: { backgroundColor: '#fff', margin: 14, borderRadius: 14, padding: 16 },
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
