import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error, needsConfirm } = await signUp(email.trim(), password, name.trim())
        if (error) { setError(error); return }
        if (needsConfirm) { Alert.alert('Check your email', 'Confirm your account, then log in.'); setMode('login'); return }
        router.back()
      } else {
        const { error } = await signIn(email.trim(), password)
        if (error) { setError(error); return }
        router.back()
      }
    } finally { setLoading(false) }
  }

  return (
    <View style={s.screen}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={{ color: colors.orange, fontSize: 24 }}>‹</Text></TouchableOpacity>
      <Image source={require('../assets/logo.png')} style={{ height: 44, width: 44 * (1470 / 472), resizeMode: 'contain', alignSelf: 'center', marginBottom: 24 }} />

      <View style={s.toggle}>
        {(['login', 'signup'] as const).map(m => (
          <TouchableOpacity key={m} onPress={() => { setMode(m); setError('') }} style={[s.toggleBtn, mode === m && s.toggleBtnActive]}>
            <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>{m === 'login' ? 'Log In' : 'Sign Up'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.google} onPress={async () => { setError(''); const { error } = await signInWithGoogle(); if (error) setError(error); else router.back() }}>
        <Text style={s.googleText}>Continue with Google</Text>
      </TouchableOpacity>
      <View style={s.divider}><View style={s.line} /><Text style={s.or}>or</Text><View style={s.line} /></View>

      {mode === 'signup' && (
        <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#aaa" style={s.input} />
      )}
      <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#aaa" autoCapitalize="none" keyboardType="email-address" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#aaa" secureTextEntry style={s.input} />

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity onPress={submit} disabled={loading || !email || !password} style={[s.submit, (loading || !email || !password) && { opacity: 0.6 }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{mode === 'login' ? 'Log In' : 'Create Account'}</Text>}
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sand, padding: 22, paddingTop: 70 },
  back: { position: 'absolute', top: 50, left: 16, zIndex: 2 },
  toggle: { flexDirection: 'row', backgroundColor: '#00000010', borderRadius: 50, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 50, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.orange },
  toggleText: { fontFamily: 'Nunito', fontWeight: '800', color: '#888', fontSize: 14 },
  toggleTextActive: { color: '#fff' },
  google: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#eadfce', marginBottom: 16 },
  googleText: { fontFamily: 'Nunito', fontWeight: '800', color: colors.dark, fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#e0d5c0' },
  or: { fontFamily: 'Nunito', fontSize: 11, color: '#aaa', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: colors.dark, marginBottom: 12, borderWidth: 1, borderColor: '#eadfce' },
  error: { color: '#c62828', fontSize: 13, marginBottom: 10, fontFamily: 'Nunito' },
  submit: { backgroundColor: colors.orange, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 15, fontFamily: 'Nunito' },
})
