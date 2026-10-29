import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../../lib/layout'
import { useLocalSearchParams, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'

// Decode the anti-harvest base64 the API uses for contact email/website.
function decodeB64(b64?: string | null): string | null {
  if (!b64) return null
  try { return typeof atob === 'function' ? atob(b64) : null } catch { return null }
}

// Native business directory listing (parity with web /directory/[slug]).
export default function DirectoryListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [biz, setBiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    apiClient().directory.get.query({ id: id as string })
      .then((d: any) => setBiz(d)).catch(() => setNotFound(true)).finally(() => setLoading(false))
  }, [id])

  const website = decodeB64(biz?.websiteB64)
  const email = decodeB64(biz?.emailB64)
  const mapQ = biz?.lat != null && biz?.lng != null ? `${biz.lat},${biz.lng}` : (biz?.location ?? '')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading} numberOfLines={1}>{biz?.name ?? 'Business'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View>
      : notFound ? <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🏢</Text><Text style={s.emptyText}>This listing isn't available.</Text></View>
      : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={s.top}>
            <View style={s.logo}>{biz?.logoUrl ? <Image source={{ uri: biz.logoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 30 }}>🏢</Text>}</View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{biz?.name}</Text>
              {!!biz?.category && <Text style={s.cat}>{biz.category}</Text>}
              {!!biz?.location && <Text style={s.loc}>📍 {biz.location}</Text>}
            </View>
          </View>

          {!!biz?.description && <Text style={s.desc}>{biz.description}</Text>}

          <View style={s.actions}>
            {!!biz?.phone && <TouchableOpacity style={s.actBtn} onPress={() => Linking.openURL(`tel:${biz.phone}`)}><Text style={s.actText}>📞 Call</Text></TouchableOpacity>}
            {!!website && <TouchableOpacity style={s.actBtn} onPress={() => WebBrowser.openBrowserAsync(/^https?:\/\//.test(website) ? website : `https://${website}`)}><Text style={s.actText}>🌐 Website</Text></TouchableOpacity>}
            {!!email && <TouchableOpacity style={s.actBtn} onPress={() => Linking.openURL(`mailto:${email}`)}><Text style={s.actText}>✉️ Email</Text></TouchableOpacity>}
          </View>

          {!!mapQ && (
            <TouchableOpacity style={s.mapBtn} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ)}`)}>
              <Text style={s.mapText}>📍 Open in Maps</Text>
            </TouchableOpacity>
          )}

          {!!biz?.shopSlug && (
            <TouchableOpacity style={s.shopLink} onPress={() => router.push(`/shop/${biz.shopSlug}` as any)}><Text style={s.shopLinkText}>Visit their Grabitt shop ›</Text></TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  top: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  cat: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: colors.orange, marginTop: 2 },
  loc: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginTop: 2 },
  desc: { fontFamily: 'Nunito', fontSize: 14, color: '#555', lineHeight: 21, marginTop: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  actBtn: { backgroundColor: colors.sage, borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10 },
  actText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: '#fff' },
  mapBtn: { marginTop: 16, backgroundColor: '#f9f6f2', borderWidth: 1, borderColor: '#ece3d7', borderRadius: 12, padding: 14, alignItems: 'center' },
  mapText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.orange },
  shopLink: { marginTop: 18, alignItems: 'center' },
  shopLinkText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.orange },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
