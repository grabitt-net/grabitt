import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

export default function RewardsScreen() {
  const { token } = useAuth()
  const [mine, setMine] = useState<any>(null)
  const [options, setOptions] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    const api = apiClient(token ?? undefined)
    Promise.all([
      token ? apiClient(token).rewards.mine.query() : Promise.resolve(null),
      api.rewards.redeemOptions.query(),
      api.rewards.earnRules.query(),
    ]).then(([m, o, r]: any[]) => { setMine(m); setOptions(o ?? []); setRules(r ?? []) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])

  const redeem = (opt: any) => {
    if (!token) { router.push('/auth'); return }
    Alert.alert('Redeem reward', `Spend ${opt.costCredits} credits on "${opt.title}"?`, [
      { text: 'Cancel' },
      { text: 'Redeem', onPress: async () => {
        setBusy(opt.id)
        try { await apiClient(token).rewards.redeem.mutate({ optionId: opt.id }); Alert.alert('Redeemed', 'Your reward has been applied.'); load() }
        catch (e: any) { Alert.alert('Could not redeem', e?.message ?? 'Try again') }
        finally { setBusy(null) }
      } },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>⭐ Rewards & credits</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Balance */}
          <View style={s.balanceCard}>
            <Text style={s.balanceLabel}>Your balance</Text>
            <Text style={s.balanceValue}>{mine?.balance ?? 0} <Text style={{ fontSize: 16 }}>credits</Text></Text>
            {mine?.totalEarned != null && <Text style={s.balanceSub}>{mine.totalEarned} earned all-time</Text>}
            {mine?.feeReduction && <Text style={s.feeBadge}>🏷 {mine.feeReduction.pct}% fee reduction active</Text>}
          </View>

          {rules.length > 0 && <>
            <Text style={s.sectionTitle}>How to earn</Text>
            {rules.map(r => (
              <View key={r.id} style={s.ruleRow}>
                <Text style={s.ruleTitle}>{r.title}</Text>
                {!!r.subtitle && <Text style={s.ruleSub}>{r.subtitle}</Text>}
              </View>
            ))}
          </>}

          {options.length > 0 && <>
            <Text style={s.sectionTitle}>Redeem</Text>
            {options.map(o => (
              <View key={o.id} style={s.optRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.optTitle}>{o.title}</Text>
                  {!!o.description && <Text style={s.optDesc}>{o.description}</Text>}
                </View>
                <TouchableOpacity style={[s.redeemBtn, (busy === o.id || (mine && mine.balance < o.costCredits)) && { opacity: 0.5 }]} disabled={busy === o.id || (mine && mine.balance < o.costCredits)} onPress={() => redeem(o)}>
                  <Text style={s.redeemText}>{busy === o.id ? '…' : `${o.costCredits}`}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>}

          {mine?.events?.length > 0 && <>
            <Text style={s.sectionTitle}>Recent activity</Text>
            {mine.events.map((e: any) => (
              <View key={e.id} style={s.eventRow}>
                <Text style={s.eventNote} numberOfLines={1}>{e.note ?? e.kind}</Text>
                <Text style={[s.eventDelta, { color: e.delta >= 0 ? '#16a34a' : '#ef4444' }]}>{e.delta >= 0 ? '+' : ''}{e.delta}</Text>
              </View>
            ))}
          </>}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  balanceCard: { backgroundColor: colors.orange, borderRadius: 18, padding: 20, alignItems: 'center' },
  balanceLabel: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  balanceValue: { fontFamily: 'Georgia', fontSize: 40, fontWeight: '700', color: '#fff', marginTop: 4 },
  balanceSub: { fontFamily: 'Nunito', fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  feeBadge: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#fff', marginTop: 8, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: colors.dark, marginTop: 22, marginBottom: 8 },
  ruleRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f0e8' },
  ruleTitle: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.dark },
  ruleSub: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 1 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f0e8' },
  optTitle: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  optDesc: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 2 },
  redeemBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8, minWidth: 54, alignItems: 'center' },
  redeemText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: '#fff' },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f5f0e8' },
  eventNote: { flex: 1, fontFamily: 'Nunito', fontSize: 12, color: '#555', marginRight: 10 },
  eventDelta: { fontFamily: 'Georgia', fontSize: 14, fontWeight: '700' },
})
