import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

// Blocking first-login consent flow (parity with web): GDPR then the EU
// right-to-withdraw waiver. Non-dismissable until both are accepted.
type Status = { gdprAccepted: boolean; withdrawalWaiverAccepted: boolean; deleted: boolean }

export default function ConsentGate() {
  const { token } = useAuth()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) { setStatus(null); return }
    try { setStatus(await apiClient(token).compliance.status.query() as Status) } catch { setStatus(null) }
  }, [token])

  useEffect(() => { refresh() }, [refresh])

  if (!token || !status || status.deleted) return null
  if (status.gdprAccepted && status.withdrawalWaiverAccepted) return null

  const kind: 'gdpr' | 'withdrawal_waiver' = !status.gdprAccepted ? 'gdpr' : 'withdrawal_waiver'
  const accept = async () => {
    setBusy(true)
    try { await apiClient(token).compliance.accept.mutate({ kind }); await refresh() } finally { setBusy(false) }
  }

  const c = kind === 'gdpr'
    ? { title: 'Your privacy & data (GDPR)', body: 'To run Grabitt we process your account details, listings, orders, messages and payments — only to operate the service. By accepting you consent to this processing under the GDPR and our Privacy Policy. You can delete your account data anytime from your Account.', cta: 'Accept & continue' }
    : { title: 'Right to withdraw — important', body: 'Sales made on Grabitt are exempt from the EU right of withdrawal. Grabitt is a digital marketplace and does not hold the physical goods. Any request to withdraw, cancel or return a sale is strictly between the buying and selling parties directly.', cta: 'I understand & accept' }

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.step}>STEP {kind === 'gdpr' ? '1' : '2'} OF 2 · REQUIRED</Text>
          <Text style={s.title}>{c.title}</Text>
          <ScrollView style={{ maxHeight: 260 }}><Text style={s.body}>{c.body}</Text></ScrollView>
          <TouchableOpacity onPress={accept} disabled={busy} style={[s.btn, busy && { opacity: 0.6 }]}>
            <Text style={s.btnText}>{busy ? 'Saving…' : c.cta}</Text>
          </TouchableOpacity>
          <Text style={s.note}>You must accept both notices to use Grabitt. Your acceptance is recorded with a timestamp.</Text>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,12,6,0.75)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  step: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900', color: colors.orange, letterSpacing: 1, marginBottom: 6 },
  title: { fontFamily: 'Nunito', fontSize: 20, fontWeight: '800', color: colors.dark, marginBottom: 10 },
  body: { fontFamily: 'Nunito', fontSize: 14, color: '#444', lineHeight: 21 },
  btn: { backgroundColor: colors.orange, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15, fontFamily: 'Nunito' },
  note: { fontFamily: 'Nunito', fontSize: 10.5, color: '#999', textAlign: 'center', marginTop: 12 },
})
