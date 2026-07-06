import React from 'react'
import Constants from 'expo-constants'

// @stripe/stripe-react-native is a NATIVE module — it is not available in Expo
// Go, and touching it there crashes the app. We only load it in a dev/EAS/
// production build. In Expo Go, StripeProvider is a passthrough and useStripe
// returns nulls so the checkout can gracefully explain the card step needs the
// full build.
export const isExpoGo = Constants.executionEnvironment === 'storeClient'

type StripeFns = {
  initPaymentSheet: ((opts: any) => Promise<{ error?: { message: string } }>) | null
  presentPaymentSheet: (() => Promise<{ error?: { message: string } }>) | null
}

let RealStripeProvider: React.ComponentType<any> | null = null
let realUseStripe: (() => StripeFns) | null = null
if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@stripe/stripe-react-native')
  RealStripeProvider = mod.StripeProvider
  realUseStripe = mod.useStripe
}

export function MaybeStripeProvider({ publishableKey, children }: { publishableKey: string; children: React.ReactNode }) {
  if (isExpoGo || !RealStripeProvider) return <>{children}</>
  return <RealStripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.net.grabitt.app">{children}</RealStripeProvider>
}

export function useSafeStripe(): StripeFns {
  if (isExpoGo || !realUseStripe) return { initPaymentSheet: null, presentPaymentSheet: null }
  return realUseStripe()
}
