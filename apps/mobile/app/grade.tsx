import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

// The grade ladder — personal-account progression (names + monthly free-listing
// allowance are product constants; the member's current grade comes from the API).
const GRADES = [
  { key: 'grabber', label: 'Grabber', allowance: '10 listings/mo', blurb: 'New members start here.' },
  { key: 'dealer', label: 'Dealer', allowance: '50 listings/mo', blurb: 'Regular sellers with a few sales.' },
  { key: 'trader', label: 'Trader', allowance: '200 listings/mo', blurb: 'Established, well-rated sellers.' },
  { key: 'pro', label: 'Pro', allowance: 'Unlimited listings', blurb: 'Top-tier sellers.' },
]

const pretty = (g: string) => (g ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function GradeScreen() {
  const { token } = useAuth()
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    apiClient(token).users.me.query().then((u: any) => setMe(u)).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const currentIdx = GRADES.findIndex(g => g.key === (me?.grade ?? '').toLowerCase())

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🏅 My grade</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Your grade</Text>
            <Text style={s.cardGrade}>{pretty(me?.grade ?? 'Grabber')}</Text>
            <Text style={s.cardStats}>⭐ {me?.avgRating ? Number(me.avgRating).toFixed(1) : '—'} · {me?.salesCount ?? 0} sales · {me?.credits ?? 0} credits</Text>
          </View>

          <Text style={s.sectionTitle}>The ladder</Text>
          {GRADES.map((g, i) => {
            const isCurrent = i === currentIdx
            return (
              <View key={g.key} style={[s.gradeRow, isCurrent && s.gradeRowActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.gradeLabel, isCurrent && { color: colors.orange }]}>{g.label}{isCurrent ? '  ·  You' : ''}</Text>
                  <Text style={s.gradeBlurb}>{g.blurb}</Text>
                </View>
                <Text style={s.gradeAllowance}>{g.allowance}</Text>
              </View>
            )
          })}
          <Text style={s.note}>Grades rise with completed sales and good reviews, unlocking a bigger free-listing allowance and lower fees.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  card: { backgroundColor: colors.orange, borderRadius: 18, padding: 20, alignItems: 'center' },
  cardLabel: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  cardGrade: { fontFamily: 'Georgia', fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 4 },
  cardStats: { fontFamily: 'Nunito', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: colors.dark, marginTop: 22, marginBottom: 8 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f0ebe4', marginBottom: 8 },
  gradeRowActive: { borderColor: colors.orange, backgroundColor: '#FFF3EE' },
  gradeLabel: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark },
  gradeBlurb: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 2 },
  gradeAllowance: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#6b5a41', textAlign: 'right' },
  note: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginTop: 14, lineHeight: 18 },
})
