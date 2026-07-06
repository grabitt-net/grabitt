import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

type Purchase = { id: string; amount: string | number; status: string; createdAt: string; listing: { title: string; images: string[] } }

const STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '⏳ Payment pending', color: '#888' },
  held: { label: '🔒 Awaiting handover', color: colors.orange },
  confirmed_handover: { label: '🤝 Handover confirmed', color: '#3b82f6' },
  released: { label: '✅ Complete', color: '#16a34a' },
  disputed: { label: '🚨 Disputed', color: '#ef4444' },
  cancelled: { label: '✖ Cancelled', color: '#aaa' },
}

export default function PurchasesScreen() {
  const { token } = useAuth()
  const [items, setItems] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return }
    try { setItems(await apiClient(token).transactions.myPurchases.query() as Purchase[]) }
    catch { setItems([]) } finally { setLoading(false) }
  }, [token])
  useEffect(() => { load() }, [load])

  const confirmHandover = (p: Purchase) => {
    // Buyer confirms collection/in-person delivery with the 6-digit code the
    // seller shows at handover — this releases the escrowed funds.
    if (typeof Alert.prompt === 'function') {
      Alert.prompt('Confirm handover', "Enter the 6-digit code from the seller's QR/screen.", async (code?: string) => {
        if (!code || code.length !== 6 || !token) return
        try { await apiClient(token).transactions.confirmHandoverByCode.mutate({ transactionId: p.id, code }); Alert.alert('✅ Confirmed', 'Funds released to the seller.'); load() }
        catch (e: any) { Alert.alert('Could not confirm', e?.message ?? 'Check the code and try again') }
      }, 'plain-text', '', 'number-pad')
    } else {
      Alert.alert('Confirm handover', 'Open the seller QR link they send you, or use the app on iOS to enter the code.')
    }
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 24, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>My Purchases</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 30 }} />
      ) : items.length === 0 ? (
        <View style={s.empty}><Text style={s.emptyText}>No purchases yet.</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => {
            const st = STATUS[item.status] ?? { label: item.status, color: '#888' }
            return (
              <View style={s.row}>
                <View style={s.thumb}>
                  {item.listing.images?.[0]
                    ? <Image source={{ uri: item.listing.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                    : <Text style={{ fontSize: 24 }}>🛍️</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>{item.listing.title}</Text>
                  <Text style={[s.status, { color: st.color }]}>{st.label}</Text>
                  {item.status === 'held' && (
                    <TouchableOpacity style={s.confirmBtn} onPress={() => confirmHandover(item)}><Text style={s.confirmText}>Confirm handover ✅</Text></TouchableOpacity>
                  )}
                </View>
                <Text style={s.amount}>€{Number(item.amount).toFixed(2)}</Text>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Nunito', fontSize: 20, fontWeight: '800', color: colors.dark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Nunito', fontSize: 14, color: '#999' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.dark },
  status: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', marginTop: 3 },
  amount: { fontFamily: 'Georgia', fontSize: 15, fontWeight: '700', color: colors.dark },
  confirmBtn: { alignSelf: 'flex-start', backgroundColor: '#16a34a', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 },
  confirmText: { color: '#fff', fontFamily: 'Nunito', fontSize: 10, fontWeight: '900' },
})
