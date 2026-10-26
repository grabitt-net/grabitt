import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'
import { useSafeStripe } from '../lib/stripe'

type Line = {
  id: string; listingId: string; qty: number; title: string; price: number
  image: string | null; stock: number; sellerId: string; sellerName: string
}

export default function CartScreen() {
  const { token } = useAuth()
  const { initPaymentSheet, presentPaymentSheet, retrieveSetupIntent } = useSafeStripe()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!token) { setItems([]); setLoading(false); return }
    apiClient(token).cart.items.query()
      .then((r: any[]) => setItems(r as Line[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])

  const subtotal = items.reduce((sum, l) => sum + l.price * l.qty, 0)

  const setQty = async (l: Line, qty: number) => {
    if (qty < 1 || qty > l.stock) return
    setItems(prev => prev.map(x => x.id === l.id ? { ...x, qty } : x)) // optimistic
    try { await apiClient(token!).cart.setItemQty.mutate({ listingId: l.listingId, qty }) } catch { load() }
  }
  const remove = async (l: Line) => {
    setItems(prev => prev.filter(x => x.id !== l.id))
    try { await apiClient(token!).cart.removeItem.mutate({ listingId: l.listingId }) } catch { load() }
  }

  const checkout = async () => {
    if (!token) { router.push('/auth'); return }
    if (!initPaymentSheet || !presentPaymentSheet || !retrieveSetupIntent) {
      Alert.alert('Card payment unavailable here', 'Checkout needs the full Grabitt app (a dev/production build).'); return
    }
    setBusy(true)
    try {
      // 1. Save a card once (SetupIntent) via the native sheet.
      const setup: any = await apiClient(token).transactions.startCartCheckout.mutate()
      const clientSecret = setup?.clientSecret
      if (!clientSecret) throw new Error('Could not start checkout')
      const init = await initPaymentSheet({ merchantDisplayName: 'Grabitt', setupIntentClientSecret: clientSecret })
      if (init.error) throw new Error(init.error.message)
      const pres = await presentPaymentSheet()
      if (pres.error) { setBusy(false); return } // user cancelled
      // 2. Retrieve the saved card and authorise each basket item server-side.
      const ret = await retrieveSetupIntent(clientSecret)
      const pmId = ret?.setupIntent?.paymentMethodId
      if (!pmId) throw new Error('Could not read your saved card')
      const res: any = await apiClient(token).transactions.finishCartCheckout.mutate({ paymentMethodId: pmId })
      load()
      const ok = res?.succeeded?.length ?? 0
      const bad = res?.failed ?? []
      if (bad.length) {
        Alert.alert(`${ok} item${ok === 1 ? '' : 's'} secured`, `Some items could not be charged:\n${bad.map((f: any) => `• ${f.title}: ${f.reason}`).join('\n')}`)
      } else {
        Alert.alert('Payment secured', `${ok} item${ok === 1 ? '' : 's'} held in escrow. Sellers will arrange handover via chat.`, [{ text: 'View purchases', onPress: () => router.replace('/purchases') }, { text: 'OK' }])
      }
    } catch (e: any) { Alert.alert('Checkout failed', e?.message ?? 'Please try again') }
    finally { setBusy(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 20, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🧺 Basket</Text>
        <View style={{ width: 36 }} />
      </View>

      {!token ? (
        <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🔒</Text><Text style={s.emptyText}>Log in to use your basket.</Text><TouchableOpacity style={s.cta} onPress={() => router.push('/auth')}><Text style={s.ctaText}>Log in</Text></TouchableOpacity></View>
      ) : loading ? (
        <View style={s.empty}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 12, gap: 12 }}
            renderItem={({ item }) => (
              <View style={s.row}>
                <TouchableOpacity style={s.thumb} onPress={() => router.push(`/listing/${item.listingId}`)}>
                  {item.image ? <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={{ fontSize: 24 }}>🛍️</Text>}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.seller}>{item.sellerName}</Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(item, item.qty - 1)}><Text style={s.qtyBtnText}>−</Text></TouchableOpacity>
                    <Text style={s.qtyVal}>{item.qty}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => setQty(item, item.qty + 1)}><Text style={s.qtyBtnText}>+</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)} style={{ marginLeft: 12 }}><Text style={s.remove}>Remove</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={s.price}>€{(item.price * item.qty).toLocaleString()}</Text>
              </View>
            )}
            ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>🧺</Text><Text style={s.emptyText}>Your basket is empty.</Text><TouchableOpacity style={s.cta} onPress={() => router.replace('/(tabs)')}><Text style={s.ctaText}>Browse listings</Text></TouchableOpacity></View>}
          />
          {items.length > 0 && (
            <View style={[s.footer, { paddingBottom: 14 + insets.bottom }]}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal ({items.reduce((n, l) => n + l.qty, 0)} item{items.reduce((n, l) => n + l.qty, 0) === 1 ? '' : 's'})</Text>
                <Text style={s.totalVal}>€{subtotal.toLocaleString()}</Text>
              </View>
              <Text style={s.note}>Collection basket — delivery, if any, is arranged with each seller. Payment is held in escrow until handover.</Text>
              <TouchableOpacity style={[s.checkout, busy && { opacity: 0.6 }]} disabled={busy} onPress={checkout}>
                <Text style={s.checkoutText}>{busy ? 'Processing…' : `Checkout · €${subtotal.toLocaleString()}`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f0ebe4', padding: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  seller: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 1 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: colors.dark },
  qtyVal: { fontFamily: 'Georgia', fontSize: 15, fontWeight: '700', color: colors.dark, minWidth: 20, textAlign: 'center' },
  remove: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#b4433a' },
  price: { fontFamily: 'Georgia', fontSize: 15, fontWeight: '700', color: colors.orange },
  footer: { borderTopWidth: 1, borderTopColor: '#f0ebe4', padding: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: '#555' },
  totalVal: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '700', color: colors.dark },
  note: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 6, lineHeight: 16 },
  checkout: { backgroundColor: colors.orange, borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 12 },
  checkoutText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  cta: { marginTop: 18, backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 22, paddingVertical: 11 },
  ctaText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: '#fff' },
})
