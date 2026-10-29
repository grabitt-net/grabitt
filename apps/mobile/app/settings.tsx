import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { API_URL } from '../lib/trpc'
import { supabase } from '../lib/supabase'

export default function SettingsScreen() {
  const { user } = useAuth()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  const changePassword = async () => {
    if (pw.length < 8) { Alert.alert('Password too short', 'Use at least 8 characters.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setPw(''); Alert.alert('Password updated', 'Your password has been changed.')
    } catch (e: any) { Alert.alert('Could not update', e?.message ?? 'Try again') }
    finally { setBusy(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>⚙️ Account settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.field}><Text style={s.fieldLabel}>Email</Text><Text style={s.fieldValue}>{user?.email ?? '—'}</Text></View>

        <Text style={s.sectionTitle}>Change password</Text>
        <TextInput value={pw} onChangeText={setPw} placeholder="New password (min 8 characters)" placeholderTextColor="#aaa" secureTextEntry style={s.input} />
        <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={changePassword}><Text style={s.btnText}>{busy ? 'Updating…' : 'Update password'}</Text></TouchableOpacity>

        <Text style={s.sectionTitle}>Legal</Text>
        <TouchableOpacity style={s.linkRow} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}><Text style={s.linkText}>Privacy Policy</Text><Text style={s.chev}>›</Text></TouchableOpacity>
        <TouchableOpacity style={s.linkRow} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/terms`)}><Text style={s.linkText}>Terms of Service</Text><Text style={s.chev}>›</Text></TouchableOpacity>

        <Text style={s.sectionTitle}>Your data</Text>
        <TouchableOpacity style={s.linkRow} onPress={() => router.push('/(tabs)/profile')}><Text style={[s.linkText, { color: '#b4433a' }]}>Delete account & data</Text><Text style={s.chev}>›</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '900', color: '#9a8b74', marginTop: 22, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  field: { backgroundColor: '#faf6ef', borderRadius: 12, padding: 14 },
  fieldLabel: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  fieldValue: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '800', color: colors.dark, marginTop: 2 },
  input: { borderWidth: 1.5, borderColor: '#e5e0d8', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 15, color: colors.dark },
  btn: { backgroundColor: colors.orange, borderRadius: 50, padding: 14, alignItems: 'center', marginTop: 12 },
  btnText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: '#fff' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f0e8' },
  linkText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '700', color: colors.dark },
  chev: { color: '#ccc', fontSize: 18 },
})
