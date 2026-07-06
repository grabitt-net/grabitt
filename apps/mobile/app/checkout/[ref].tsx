import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { useSafeStripe } from '../../lib/stripe'

const STEPS = ['Confirm', 'Payment', 'Done']

export default function CheckoutScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>()
  const { token } = useAuth()
  const { initPaymentSheet, presentPaymentSheet } = useSafeStripe()
  const [step, setStep] = useState(0)
  const [fulfilment, setFulfilment] = useState<'collection' | 'delivery'>('collection')
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [transactionId, setTransactionId] = useState<string | null>(null)

  const PRICE = 149
  const total = PRICE * qty

  async function handleNext() {
    if (step === 1) {
      if (!token) { Alert.alert('Please log in', 'You need an account to buy.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
      if (!ref) return
      setLoading(true)
      try {
        // 1. Create the escrow PaymentIntent (funds held until handover).
        const result = await apiClient(token).transactions.initiate.mutate({ listingId: ref, quantity: qty, fulfilment: fulfilment as any })
        setTransactionId(result.transaction.id)
        const clientSecret = (result as any).clientSecret
        if (!clientSecret) throw new Error('Could not start payment')

        // Card entry needs the native Stripe SDK (not available in Expo Go).
        if (!initPaymentSheet || !presentPaymentSheet) {
          Alert.alert('Card payment unavailable here', 'Your order is reserved. Card payment needs the full Grabitt app (a dev/production build) — it is disabled in Expo Go.')
          return
        }

        // 2. Present Stripe's native payment sheet to collect + authorise the card.
        const init = await initPaymentSheet({ merchantDisplayName: 'Grabitt', paymentIntentClientSecret: clientSecret })
        if (init.error) throw new Error(init.error.message)
        const { error } = await presentPaymentSheet()
        if (error) { Alert.alert('Payment cancelled', error.message); return }

        // Authorised — the webhook marks the transaction "held" (escrow).
        setStep(2)
      } catch (err: any) {
        Alert.alert('Payment failed', err?.message ?? 'Please try again')
      } finally {
        setLoading(false)
      }
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        {step < 2 && <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>}
        <Text style={s.heading}>Checkout</Text>
      </View>

      {/* Step indicator */}
      <View style={s.steps}>
        {STEPS.map((label, i) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <View style={[s.stepDot, i <= step && s.stepDotActive]}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: i <= step ? '#fff' : '#aaa' }}>{i + 1}</Text>
            </View>
            <Text style={[s.stepLabel, i <= step && s.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {step === 0 && (
          <View>
            <Text style={s.sectionTitle}>Item ref #{ref}</Text>

            {/* Fulfilment */}
            <Text style={s.label}>Fulfilment</Text>
            <View style={s.row}>
              <TouchableOpacity style={[s.optBtn, fulfilment === 'collection' && s.optBtnActive]} onPress={() => setFulfilment('collection')}>
                <Text style={s.optEmoji}>📦</Text>
                <Text style={[s.optLabel, fulfilment === 'collection' && s.optLabelActive]}>Collection</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.optBtn, fulfilment === 'delivery' && s.optBtnActive]} onPress={() => setFulfilment('delivery')}>
                <Text style={s.optEmoji}>🚚</Text>
                <Text style={[s.optLabel, fulfilment === 'delivery' && s.optLabelActive]}>Delivery</Text>
              </TouchableOpacity>
            </View>

            {/* Qty */}
            <Text style={s.label}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qtyValue}>{qty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(q => q + 1)}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={s.summaryBox}>
              <SummaryRow label="Price" value={`€${PRICE}`} />
              {qty > 1 && <SummaryRow label={`× ${qty}`} value={`€${total}`} />}
              <SummaryRow label="Platform fee (8%)" value={`€${(total * 0.08).toFixed(2)}`} />
              <View style={s.divider} />
              <SummaryRow label="Total" value={`€${(total * 1.08).toFixed(2)}`} bold />
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={s.sectionTitle}>Payment</Text>
            <Text style={s.label}>Card number</Text>
            <TextInput style={s.input} placeholder="1234 5678 9012 3456" keyboardType="numeric" placeholderTextColor="#aaa" />
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Expiry</Text>
                <TextInput style={s.input} placeholder="MM / YY" keyboardType="numeric" placeholderTextColor="#aaa" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>CVC</Text>
                <TextInput style={s.input} placeholder="•••" keyboardType="numeric" secureTextEntry placeholderTextColor="#aaa" />
              </View>
            </View>
            <View style={s.summaryBox}>
              <SummaryRow label="Total due" value={`€${(total * 1.08).toFixed(2)}`} bold />
            </View>
            <View style={s.secureRow}>
              <Text style={{ fontSize: 14 }}>🔒</Text>
              <Text style={s.secureText}>Payments are secured by Stripe. Funds held in escrow until handover.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 72, marginBottom: 16 }}>✅</Text>
            <Text style={s.doneTitle}>Payment Secured!</Text>
            <Text style={s.doneSub}>Your payment is held safely in escrow. The seller will arrange {fulfilment === 'collection' ? 'a collection time' : 'delivery'} with you via chat.</Text>
            {transactionId && (
              <View style={s.refBox}>
                <Text style={{ fontFamily: 'Nunito', fontSize: 11, color: '#888', marginBottom: 2 }}>Transaction ID</Text>
                <Text style={{ fontFamily: 'Courier', fontSize: 13, fontWeight: '900', color: colors.dark }}>{transactionId}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {step < 2 && (
        <View style={{ padding: 20, paddingBottom: 32 }}>
          <TouchableOpacity style={[s.cta, loading && { opacity: 0.7 }]} onPress={handleNext} disabled={loading}>
            <Text style={s.ctaText}>{loading ? 'Processing…' : step === 0 ? 'Continue to Payment →' : 'Pay Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={{ padding: 20, paddingBottom: 32 }}>
          <TouchableOpacity style={s.cta} onPress={() => router.replace('/(tabs)')}>
            <Text style={s.ctaText}>Back to Browse</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontFamily: 'Nunito', fontSize: 13, color: '#666', fontWeight: bold ? '900' : '600' }}>{label}</Text>
      <Text style={{ fontFamily: 'Georgia', fontSize: 13, color: bold ? colors.orange : '#444', fontWeight: bold ? '700' : '400' }}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  steps: { flexDirection: 'row', padding: 20, paddingBottom: 12 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDotActive: { backgroundColor: colors.orange },
  stepLabel: { fontFamily: 'Nunito', fontSize: 10, color: '#aaa', fontWeight: '700' },
  stepLabelActive: { color: colors.orange },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 16, fontWeight: '900', color: colors.dark, marginBottom: 16 },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  optBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#eee', alignItems: 'center' },
  optBtnActive: { borderColor: colors.orange, backgroundColor: '#FFF3EE' },
  optEmoji: { fontSize: 28, marginBottom: 4 },
  optLabel: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#888' },
  optLabelActive: { color: colors.orange },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: colors.dark },
  qtyValue: { fontFamily: 'Georgia', fontSize: 22, fontWeight: '700', color: colors.dark, minWidth: 32, textAlign: 'center' },
  summaryBox: { backgroundColor: '#faf9f7', borderRadius: 12, padding: 16, marginTop: 20 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  input: { borderWidth: 1.5, borderColor: '#e5e0d8', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 14, color: colors.dark, marginBottom: 4 },
  secureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  secureText: { flex: 1, fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  cta: { backgroundColor: colors.orange, borderRadius: 50, padding: 16, alignItems: 'center' },
  ctaText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  doneTitle: { fontFamily: 'Comfortaa', fontSize: 22, fontWeight: '700', color: colors.dark, marginBottom: 8, textAlign: 'center' },
  doneSub: { fontFamily: 'Nunito', fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  refBox: { backgroundColor: '#f5f0e8', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' },
})
