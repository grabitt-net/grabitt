import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native'
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
  // Handover-code entry (cross-platform modal — Alert.prompt is iOS-only).
  const [codeFor, setCodeFor] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)
  // Open-dispute modal.
  const [disputeFor, setDisputeFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [disputeBusy, setDisputeBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return }
    try { setItems(await apiClient(token).transactions.myPurchases.query() as Purchase[]) }
    catch { setItems([]) } finally { setLoading(false) }
  }, [token])
  useEffect(() => { load() }, [load])

  const submitCode = async () => {
    if (code.trim().length !== 6 || !token || !codeFor) { Alert.alert('Enter the 6-digit code', 'The seller shows this at handover.'); return }
    setCodeBusy(true)
    try {
      await apiClient(token).transactions.confirmHandoverByCode.mutate({ transactionId: codeFor, code: code.trim() })
      setCodeFor(null); setCode('')
      Alert.alert('✅ Confirmed', 'Funds released to the seller.'); load()
    } catch (e: any) { Alert.alert('Could not confirm', e?.message ?? 'Check the code and try again') }
    finally { setCodeBusy(false) }
  }

  const submitDispute = async () => {
    if (reason.trim().length < 10 || !token || !disputeFor) { Alert.alert('Tell us what went wrong', 'Please describe the problem (at least 10 characters).'); return }
    setDisputeBusy(true)
    try {
      await apiClient(token).disputes.open.mutate({ transactionId: disputeFor, reason: reason.trim(), evidence: [] })
      setDisputeFor(null); setReason('')
      Alert.alert('Dispute opened', 'Funds stay held while our team reviews. We’ll be in touch via chat.'); load()
    } catch (e: any) { Alert.alert('Could not open dispute', e?.message ?? 'Try again') }
    finally { setDisputeBusy(false) }
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
            const canConfirm = item.status === 'held'
            const canDispute = item.status === 'held' || item.status === 'confirmed_handover'
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
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {canConfirm && (
                      <TouchableOpacity style={s.confirmBtn} onPress={() => { setCodeFor(item.id); setCode('') }}><Text style={s.confirmText}>Confirm handover</Text></TouchableOpacity>
                    )}
                    {canDispute && (
                      <TouchableOpacity style={s.disputeBtn} onPress={() => { setDisputeFor(item.id); setReason('') }}><Text style={s.disputeText}>Report a problem</Text></TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={s.amount}>€{Number(item.amount).toFixed(2)}</Text>
              </View>
            )
          }}
        />
      )}

      {/* Handover-code modal */}
      <Modal visible={!!codeFor} transparent animationType="fade" onRequestClose={() => setCodeFor(null)}>
        <View style={s.backdrop}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Confirm handover</Text>
            <Text style={s.cardSub}>Enter the 6-digit code the seller shows at handover. This releases the escrowed funds.</Text>
            <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="______" placeholderTextColor="#ccc" style={s.codeInput} autoFocus />
            <View style={s.btnRow}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setCodeFor(null)}><Text style={[s.modalBtnText, { color: '#555' }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#16a34a', opacity: codeBusy ? 0.6 : 1 }]} disabled={codeBusy} onPress={submitCode}><Text style={s.modalBtnText}>{codeBusy ? '…' : 'Confirm'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Open-dispute modal */}
      <Modal visible={!!disputeFor} transparent animationType="fade" onRequestClose={() => setDisputeFor(null)}>
        <View style={s.backdrop}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Report a problem</Text>
            <Text style={s.cardSub}>Describe what went wrong. Your payment stays held in escrow while our team reviews.</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="e.g. Item not as described / not received…" placeholderTextColor="#aaa" style={s.reasonInput} multiline autoFocus />
            <View style={s.btnRow}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setDisputeFor(null)}><Text style={[s.modalBtnText, { color: '#555' }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#ef4444', opacity: disputeBusy ? 0.6 : 1 }]} disabled={disputeBusy} onPress={submitDispute}><Text style={s.modalBtnText}>{disputeBusy ? '…' : 'Open dispute'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  confirmBtn: { alignSelf: 'flex-start', backgroundColor: '#16a34a', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  confirmText: { color: '#fff', fontFamily: 'Nunito', fontSize: 10, fontWeight: '900' },
  disputeBtn: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  disputeText: { color: '#ef4444', fontFamily: 'Nunito', fontSize: 10, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  cardTitle: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  cardSub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 17 },
  codeInput: { backgroundColor: '#f5f0e8', borderRadius: 12, paddingVertical: 14, textAlign: 'center', fontFamily: 'Courier', fontSize: 24, fontWeight: '900', letterSpacing: 8, color: colors.dark, borderWidth: 1, borderColor: '#ece3d7' },
  reasonInput: { backgroundColor: '#f5f0e8', borderRadius: 12, padding: 14, minHeight: 90, textAlignVertical: 'top', fontFamily: 'Nunito', fontSize: 14, color: colors.dark, borderWidth: 1, borderColor: '#ece3d7' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  modalBtnText: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: '#fff' },
})
