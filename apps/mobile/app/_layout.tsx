import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { MaybeStripeProvider } from '../lib/stripe'
import { AuthProvider } from '../lib/auth'
import ConsentGate from '../components/ConsentGate'

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
  || 'pk_test_51ToglgLj1cI4cCytLRwZRhN6gVi1YvWzSEF7jz0OF5Hxe88ACDLaU1IcYOY9TNFwDlnZQzczxpAw1Ft23Dk0n7bh00I6XH7UxH'

export default function RootLayout() {
  return (
    <MaybeStripeProvider publishableKey={STRIPE_PK}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
        <ConsentGate />
      </AuthProvider>
    </MaybeStripeProvider>
  )
}
