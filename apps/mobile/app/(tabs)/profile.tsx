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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setMe(null); setSubs([]); return }
    setLoading(true)
    const api = apiClient(token)
    Promise.all([
      api.users.me.query().then((u: any) => setMe(u)).catch(() => {}),
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
        { icon: '🛒', label: 'My Purchases & Handovers', onPress: () => router.push('/(tabs)/index') },
        { icon: '📋', label: 'My Listings', onPress: () => {} },
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
