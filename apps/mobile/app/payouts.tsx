import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

export default function PayoutsScreen() {
  const { token } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!token) { setLoading(false); return }
    apiClient(token).users.payoutStatus.query()
      .then((s: any) => setStatus(s)).catch(() => {}).finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])

  const onboard = async () => {
    setBusy(true)
    try {
      const res: any = await apiClient(token!).users.createPayoutOnboarding.mutate()
      if (res?.url) { await WebBrowser.openBrowserAsync(res.url); load() }
    } catch (e: any) { Alert.alert('Could not start setup', e?.message ?? 'Try again') }
    finally { setBusy(false) }
  }

  const openDashboard = async () => {
    setBusy(true)
    try {
      const res: any = await apiClient(token!).users.payoutDashboardLink.mutate()
      if (res?.url) await WebBrowser.openBrowserAsync(res.url)
    } catch (e: any) { Alert.alert('Could not open dashboard', e?.message ?? 'Try again') }
    finally { setBusy(false) }
  }

  const ready = status?.payoutsEnabled
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>💰 Payouts</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : !token ? (
        <View style={s.body}><Text style={s.sub}>Log in to set up payouts.</Text><TouchableOpacity style={s.cta} onPress={() => router.push('/auth')}><Text style={s.ctaText}>Log in</Text></TouchableOpacity></View>
      ) : (
        <View style={s.body}>
          <View style={[s.statusPill, { backgroundColor: ready ? '#e7f6ec' : '#FFF3EE' }]}>
            <Text style={[s.statusText, { color: ready ? '#16a34a' : colors.orange }]}>
              {ready ? '✓ Payouts enabled' : status?.connected ? '⏳ Setup incomplete' : '○ Not set up'}
            </Text>
          </View>
          <Text style={s.title}>{ready ? 'You can receive funds' : 'Get paid for your sales'}</Text>
          <Text style={s.sub}>
            {ready
              ? 'Your Stripe account is connected. Funds from completed sales are paid out to your bank automatically.'
              : 'Grabitt uses Stripe to pay sellers securely. Set up your payout account (bank details, ID) so escrowed funds can be released to you after each handover.'}
          </Text>
          {ready ? (
            <TouchableOpacity style={[s.cta, busy && { opacity: 0.6 }]} disabled={busy} onPress={openDashboard}><Text style={s.ctaText}>{busy ? 'Opening…' : 'Open payout dashboard'}</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.cta, busy && { opacity: 0.6 }]} disabled={busy} onPress={onboard}><Text style={s.ctaText}>{busy ? 'Starting…' : status?.connected ? 'Finish setup' : 'Set up payouts'}</Text></TouchableOpacity>
          )}
          <Text style={s.note}>Opens Stripe's secure setup. Come back to this screen when you're done.</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  body: { padding: 24, alignItems: 'center' },
  statusPill: { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, marginTop: 10 },
  statusText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900' },
  title: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark, marginTop: 18, textAlign: 'center' },
  sub: { fontFamily: 'Nunito', fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginTop: 10 },
  cta: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 14, marginTop: 24 },
  ctaText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  note: { fontFamily: 'Nunito', fontSize: 11, color: '#999', textAlign: 'center', marginTop: 14 },
})
