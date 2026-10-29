import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../../lib/layout'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../../lib/trpc'
import { useAuth } from '../../lib/auth'
import { useSafeStripe } from '../../lib/stripe'

const STEPS = ['Confirm', 'Payment', 'Done']

type L = {
  title: string
  price: number
  image?: string
  stock: number
  offersCollection: boolean
  deliveryMethods: string[]
  deliveryFees: Record<string, number> | null
  deliveryFee: number
}

export default function CheckoutScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>()
  const { token } = useAuth()
  const { initPaymentSheet, presentPaymentSheet } = useSafeStripe()
  const insets = useSafeAreaInsets()
  const [listing, setListing] = useState<L | null>(null)
  const [step, setStep] = useState(0)
  const [fulfilment, setFulfilment] = useState<'collection' | 'delivery'>('collection')
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [paidAmount, setPaidAmount] = useState<number | null>(null)

  // Real listing — price, stock and fulfilment options come from the backend.
  useEffect(() => {
    if (!ref) return
    apiClient().listings.byId.query({ id: ref as string }).then((l: any) => {
      const offered: string[] = l.deliveryMethods?.length ? l.deliveryMethods : (l.deliveryMethod ? [l.deliveryMethod] : [])
      setListing({
        title: l.title,
        price: Number(l.price),
        image: Array.isArray(l.images) ? l.images[0] : undefined,
        stock: typeof l.stock === 'number' ? l.stock : 1,
        offersCollection: l.offersCollection !== false,
        deliveryMethods: offered,
        deliveryFees: (l.deliveryFees ?? null) as Record<string, number> | null,
        deliveryFee: Number(l.deliveryFee ?? 0),
      })
      // Default fulfilment to whatever the listing actually offers.
      if (l.offersCollection === false && offered.length) setFulfilment('delivery')
    }).catch(() => {})
  }, [ref])

  const canDeliver = !!listing && listing.deliveryMethods.length > 0
  const deliveryFee = (() => {
    if (!listing || fulfilment !== 'delivery' || !canDeliver) return 0
    const m = listing.deliveryMethods[0]
    return listing.deliveryFees?.[m] ?? listing.deliveryFee ?? 0
  })()
  const subtotal = listing ? Math.round(listing.price * qty * 100) / 100 : 0
  const total = Math.round((subtotal + deliveryFee) * 100) / 100

  async function handleNext() {
    if (step === 1) {
      if (!token) { Alert.alert('Please log in', 'You need an account to buy.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
      if (!ref) return
      setLoading(true)
      try {
        // 1. Create the escrow PaymentIntent (funds held until handover).
        const result = await apiClient(token).transactions.initiate.mutate({ listingId: ref, quantity: qty, fulfilment: fulfilment as any })
        setTransactionId(result.transaction.id)
        setPaidAmount(Number((result.transaction as any).amount))
        const clientSecret = (result as any).clientSecret
        if (!clientSecret) throw new Error('Could not start payment')

        // Card entry needs the native Stripe SDK (not available in Expo Go).
        if (!initPaymentSheet || !presentPaymentSheet) {
          Alert.alert('Card payment unavailable here', 'Your order is reserved. Card payment needs the full Grabitt app (a dev/production build).')
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

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.orange} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: Math.max(insets.top, SAFE_TOP) }}>
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
            {/* Real item */}
            <View style={s.itemRow}>
              <View style={s.itemThumb}>
                {listing.image ? <Image source={{ uri: listing.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 26 }}>🛍️</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle} numberOfLines={2}>{listing.title}</Text>
                <Text style={s.itemPrice}>€{listing.price.toLocaleString()}</Text>
              </View>
            </View>

            {/* Fulfilment — only the options this listing actually offers */}
            <Text style={s.label}>Fulfilment</Text>
            <View style={s.row}>
              {listing.offersCollection && (
                <TouchableOpacity style={[s.optBtn, fulfilment === 'collection' && s.optBtnActive]} onPress={() => setFulfilment('collection')}>
                  <Text style={s.optEmoji}>📦</Text>
                  <Text style={[s.optLabel, fulfilment === 'collection' && s.optLabelActive]}>Collection</Text>
                  <Text style={s.optMeta}>Free</Text>
                </TouchableOpacity>
              )}
              {canDeliver && (
                <TouchableOpacity style={[s.optBtn, fulfilment === 'delivery' && s.optBtnActive]} onPress={() => setFulfilment('delivery')}>
                  <Text style={s.optEmoji}>🚚</Text>
                  <Text style={[s.optLabel, fulfilment === 'delivery' && s.optLabelActive]}>Delivery</Text>
                  <Text style={s.optMeta}>{(listing.deliveryFees?.[listing.deliveryMethods[0]] ?? listing.deliveryFee ?? 0) > 0 ? `+€${(listing.deliveryFees?.[listing.deliveryMethods[0]] ?? listing.deliveryFee).toLocaleString()}` : 'Free'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Qty (capped at stock) */}
            <Text style={s.label}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qtyValue}>{qty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(q => Math.min(listing.stock, q + 1))}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
              {listing.stock > 1 && <Text style={s.stockNote}>{listing.stock} in stock</Text>}
            </View>

            {/* Summary — buyer pays item subtotal + delivery (no platform fee) */}
            <View style={s.summaryBox}>
              <SummaryRow label={`Item${qty > 1 ? ` × ${qty}` : ''}`} value={`€${subtotal.toLocaleString()}`} />
              {fulfilment === 'delivery' && <SummaryRow label="Delivery" value={deliveryFee > 0 ? `€${deliveryFee.toLocaleString()}` : 'Free'} />}
              <View style={s.divider} />
              <SummaryRow label="Total" value={`€${total.toLocaleString()}`} bold />
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={s.sectionTitle}>Payment</Text>
            <View style={s.summaryBox}>
              <SummaryRow label={listing.title} value={`€${subtotal.toLocaleString()}`} />
              {fulfilment === 'delivery' && <SummaryRow label="Delivery" value={deliveryFee > 0 ? `€${deliveryFee.toLocaleString()}` : 'Free'} />}
              <View style={s.divider} />
              <SummaryRow label="Total due" value={`€${total.toLocaleString()}`} bold />
            </View>
            <View style={s.secureRow}>
              <Text style={{ fontSize: 14 }}>🔒</Text>
              <Text style={s.secureText}>Tap Pay Now to enter your card securely via Stripe. Funds are held in escrow until the item is handed over.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 72, marginBottom: 16 }}>✅</Text>
            <Text style={s.doneTitle}>Payment Secured!</Text>
            <Text style={s.doneSub}>€{(paidAmount ?? total).toLocaleString()} is held safely in escrow. The seller will arrange {fulfilment === 'collection' ? 'a collection time' : 'delivery'} with you via chat.</Text>
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
        <View style={{ padding: 20, paddingBottom: 20 + insets.bottom }}>
          <TouchableOpacity style={[s.cta, loading && { opacity: 0.7 }]} onPress={handleNext} disabled={loading}>
            <Text style={s.ctaText}>{loading ? 'Processing…' : step === 0 ? 'Continue to Payment' : `Pay €${total.toLocaleString()}`}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={{ padding: 20, paddingBottom: 20 + insets.bottom }}>
          <TouchableOpacity style={s.cta} onPress={() => router.replace('/(tabs)')}>
            <Text style={s.ctaText}>Back to Browse</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Nunito', fontSize: 13, color: '#666', fontWeight: bold ? '900' : '600' }}>{label}</Text>
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
  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  itemThumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  itemPrice: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.orange, marginTop: 2 },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 16 },
  row: { flexDirection: 'row', gap: 10 },
  optBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#eee', alignItems: 'center' },
  optBtnActive: { borderColor: colors.orange, backgroundColor: '#FFF3EE' },
  optEmoji: { fontSize: 28, marginBottom: 4 },
  optLabel: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#888' },
  optLabelActive: { color: colors.orange },
  optMeta: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '700', color: '#aaa', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: colors.dark },
  qtyValue: { fontFamily: 'Georgia', fontSize: 22, fontWeight: '700', color: colors.dark, minWidth: 32, textAlign: 'center' },
  stockNote: { fontFamily: 'Nunito', fontSize: 11, color: '#9a8b74', fontWeight: '700' },
  summaryBox: { backgroundColor: '#faf9f7', borderRadius: 12, padding: 16, marginTop: 20 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  secureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  secureText: { flex: 1, fontFamily: 'Nunito', fontSize: 11, color: '#888', lineHeight: 16 },
  cta: { backgroundColor: colors.orange, borderRadius: 50, padding: 16, alignItems: 'center' },
  ctaText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  doneTitle: { fontFamily: 'Comfortaa', fontSize: 22, fontWeight: '700', color: colors.dark, marginBottom: 8, textAlign: 'center' },
  doneSub: { fontFamily: 'Nunito', fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  refBox: { backgroundColor: '#f5f0e8', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' },
})
