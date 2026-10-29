import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

// OAuth redirect target (grabitt://auth-callback). The Supabase code exchange is
// handled in signInWithGoogle via WebBrowser.openAuthSessionAsync; if the OS also
// deep-links here, this route quietly sends the user home instead of showing the
// expo-router "Unmatched Route" screen.
export default function AuthCallback() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(tabs)'), 150)
    return () => clearTimeout(t)
  }, [])
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator color={colors.orange} />
    </View>
  )
}
