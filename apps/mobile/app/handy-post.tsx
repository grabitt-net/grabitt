import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { colors } from '@grabitt/design-tokens'
import { SAFE_TOP } from '../lib/layout'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

// Native Handy Help post form. Personal "requests" are free and created
// directly; a business "offer" advert is paid, so the API returns a Stripe
// checkout URL we open in the in-app browser.
export default function HandyPostScreen() {
  const { token } = useAuth()
  const [kind, setKind] = useState<'request' | 'offer'>('request')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!token) { router.push('/auth'); return }
    if (title.trim().length < 4) { Alert.alert('Add a title', 'Give your post a short title (at least 4 characters).'); return }
    if (description.trim().length < 1) { Alert.alert('Add a description', 'Describe what you need or offer.'); return }
    setBusy(true)
    try {
      const res: any = await apiClient(token).handy.createPost.mutate({
        kind,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        price: price ? Number(price) : undefined,
      })
      if (res?.paid && res.checkoutUrl) {
        await WebBrowser.openBrowserAsync(res.checkoutUrl)
        router.replace('/handy')
      } else {
        Alert.alert('Posted', 'Your Handy Help post is live.', [{ text: 'OK', onPress: () => router.replace('/handy') }])
      }
    } catch (e: any) { Alert.alert('Could not post', e?.message ?? 'Try again') }
    finally { setBusy(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🛠️ Post Handy Help</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.label}>I want to…</Text>
        <View style={s.kindRow}>
          <TouchableOpacity style={[s.kindBtn, kind === 'request' && s.kindBtnOn]} onPress={() => setKind('request')}>
            <Text style={[s.kindText, kind === 'request' && s.kindTextOn]}>Request help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.kindBtn, kind === 'offer' && s.kindBtnOn]} onPress={() => setKind('offer')}>
            <Text style={[s.kindText, kind === 'offer' && s.kindTextOn]}>Offer a service</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={kind === 'request' ? 'e.g. Need a plumber in Las Palmas' : 'e.g. Experienced handyman available'} placeholderTextColor="#aaa" style={s.input} />

        <Text style={s.label}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Describe the job, timing and any details…" placeholderTextColor="#aaa" style={[s.input, { height: 110, textAlignVertical: 'top' }]} multiline />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 2 }}>
            <Text style={s.label}>Location</Text>
            <TextInput value={location} onChangeText={setLocation} placeholder="Town / area" placeholderTextColor="#aaa" style={s.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Budget €</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="optional" placeholderTextColor="#aaa" style={s.input} />
          </View>
        </View>

        <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Post</Text>}
        </TouchableOpacity>
        <Text style={s.note}>Personal requests are free. A business service advert is a paid placement (checkout opens securely).</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 16 },
  kindRow: { flexDirection: 'row', gap: 10 },
  kindBtn: { flex: 1, borderWidth: 2, borderColor: '#eee', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  kindBtnOn: { borderColor: colors.orange, backgroundColor: '#FFF3EE' },
  kindText: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: '#888' },
  kindTextOn: { color: colors.orange },
  input: { borderWidth: 1.5, borderColor: '#e5e0d8', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 15, color: colors.dark },
  submit: { backgroundColor: colors.orange, borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 26 },
  submitText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  note: { fontFamily: 'Nunito', fontSize: 11, color: '#999', textAlign: 'center', marginTop: 12, lineHeight: 16 },
})
