import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

export default function EditProfileScreen() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [fullName, setFullName] = useState('')
  const [openToWork, setOpenToWork] = useState(false)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    apiClient(token).users.me.query().then((u: any) => {
      setDisplayName(u?.displayName ?? '')
      setFullName(u?.fullName ?? '')
      setOpenToWork(!!u?.openToWork)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const save = async () => {
    if (displayName.trim().length < 2) { Alert.alert('Name too short', 'Your display name needs at least 2 characters.'); return }
    setSaving(true)
    try {
      await apiClient(token!).users.updateProfile.mutate({ displayName: displayName.trim(), fullName: fullName.trim() || null, openToWork })
      Alert.alert('Saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }])
    } catch (e: any) { Alert.alert('Could not save', e?.message ?? 'Try again') }
    finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>Edit profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={s.label}>Display name</Text>
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="How you appear to others" placeholderTextColor="#aaa" style={s.input} />

          <Text style={s.label}>Full name (private)</Text>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Your legal name — never shown publicly" placeholderTextColor="#aaa" style={s.input} />

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Open to work</Text>
              <Text style={s.switchSub}>Show recruiters you're looking for work.</Text>
            </View>
            <Switch value={openToWork} onValueChange={setOpenToWork} trackColor={{ true: colors.orange }} />
          </View>

          <TouchableOpacity style={[s.save, saving && { opacity: 0.6 }]} disabled={saving} onPress={save}>
            <Text style={s.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#e5e0d8', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 15, color: colors.dark },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, backgroundColor: '#faf6ef', borderRadius: 12, padding: 14 },
  switchLabel: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  switchSub: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 2 },
  save: { backgroundColor: colors.orange, borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 28 },
  saveText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
})
