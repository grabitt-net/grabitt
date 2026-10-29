import { useEffect, useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

export default function BusinessCentreScreen() {
  const { token } = useAuth()
  const [data, setData] = useState<any>(null)
  const [tier, setTier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tagline, setTagline] = useState('')
  const [about, setAbout] = useState('')
  const [published, setPublished] = useState(false)

  const load = useCallback(() => {
    if (!token) { setLoading(false); return }
    Promise.all([
      apiClient(token).business.myStorefront.query(),
      apiClient(token).business.tierStatus.query().catch(() => null),
    ]).then(([d, t]: any[]) => {
      setData(d); setTier(t)
      const shop = d?.shop
      if (shop) { setTagline(shop.tagline ?? ''); setAbout(shop.about ?? ''); setPublished(!!shop.published) }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await apiClient(token!).business.upsertStorefront.mutate({ tagline: tagline.trim(), about: about.trim(), published } as any)
      Alert.alert('Saved', 'Your storefront has been updated.'); load()
    } catch (e: any) { Alert.alert('Could not save', e?.message ?? 'Try again') }
    finally { setSaving(false) }
  }

  const isBusiness = data?.isBusiness ?? tier?.isBusiness
  const slug = data?.shop?.slug

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🏢 Business Centre</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : !token ? (
        <View style={s.body}><Text style={s.sub}>Log in to access the Business Centre.</Text><TouchableOpacity style={s.cta} onPress={() => router.push('/auth')}><Text style={s.ctaText}>Log in</Text></TouchableOpacity></View>
      ) : !isBusiness ? (
        <View style={s.body}>
          <Text style={{ fontSize: 44, marginBottom: 8 }}>🏢</Text>
          <Text style={s.title}>Grabitt for Business</Text>
          <Text style={s.sub}>Upgrade to a business account for a storefront, a directory listing, bulk tools and lower fees.</Text>
          <TouchableOpacity style={s.cta} onPress={() => router.push('/(tabs)/profile')}><Text style={s.ctaText}>Manage subscription</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {!!tier && (
            <View style={s.tierCard}>
              <Text style={s.tierLabel}>Your plan</Text>
              <Text style={s.tierValue}>{(tier.tier ?? tier.grade ?? 'Business')}</Text>
              {tier.itemsUsed != null && <Text style={s.tierSub}>{tier.itemsUsed} items listed this month</Text>}
            </View>
          )}

          <Text style={s.sectionTitle}>Storefront</Text>
          <View style={[s.pill, { backgroundColor: published ? '#e7f6ec' : '#FFF3EE' }]}>
            <Text style={[s.pillText, { color: published ? '#16a34a' : colors.orange }]}>{published ? '✓ Published' : '○ Not published'}</Text>
          </View>

          <Text style={s.label}>Tagline</Text>
          <TextInput value={tagline} onChangeText={setTagline} placeholder="e.g. Gran Canaria's friendliest electronics shop" placeholderTextColor="#aaa" style={s.input} />

          <Text style={s.label}>About</Text>
          <TextInput value={about} onChangeText={setAbout} placeholder="Tell customers about your business…" placeholderTextColor="#aaa" style={[s.input, { height: 110, textAlignVertical: 'top' }]} multiline />

          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Publish storefront</Text>
            <Switch value={published} onValueChange={setPublished} trackColor={{ true: colors.orange }} />
          </View>

          <TouchableOpacity style={[s.cta, saving && { opacity: 0.6 }, { alignSelf: 'stretch' }]} disabled={saving} onPress={save}><Text style={s.ctaText}>{saving ? 'Saving…' : 'Save storefront'}</Text></TouchableOpacity>

          {!!slug && published && (
            <TouchableOpacity style={s.linkRow} onPress={() => router.push(`/shop/${slug}` as any)}><Text style={s.linkText}>View my shop page</Text><Text style={s.chev}>›</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={s.linkRow} onPress={() => router.push('/(tabs)/profile')}><Text style={s.linkText}>Business subscription</Text><Text style={s.chev}>›</Text></TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  body: { padding: 24, alignItems: 'center', paddingTop: 50 },
  title: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  sub: { fontFamily: 'Nunito', fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginTop: 10 },
  tierCard: { backgroundColor: '#faf6ef', borderRadius: 14, padding: 16, marginBottom: 6 },
  tierLabel: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  tierValue: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark, marginTop: 2 },
  tierSub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginTop: 2 },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: colors.dark, marginTop: 22, marginBottom: 8 },
  pill: { alignSelf: 'flex-start', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '900' },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#e5e0d8', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 15, color: colors.dark },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  switchLabel: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  cta: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  ctaText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f5f0e8', marginTop: 6 },
  linkText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '700', color: colors.dark },
  chev: { color: '#ccc', fontSize: 18 },
})
