import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Image, Alert } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined', countered: 'Countered', expired: 'Expired', withdrawn: 'Withdrawn' }

// Offers hub (parity with web): received (accept/decline) + sent.
export default function OffersScreen() {
  const { token } = useAuth()
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [received, setReceived] = useState<any[] | null>(null)
  const [sent, setSent] = useState<any[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) { setReceived([]); setSent([]); return }
    try {
      const api = apiClient(token)
      const [r, s] = await Promise.all([api.offers.received.query(), api.offers.sent.query()])
      setReceived(r as any[]); setSent(s as any[])
    } catch { setReceived([]); setSent([]) }
  }, [token])
  useEffect(() => { load() }, [load])

  const respond = async (offerId: string, action: 'accept' | 'decline') => {
    if (!token) return
    setBusyId(offerId)
    try { await apiClient(token).offers.respond.mutate({ offerId, action }); await load() }
    catch (e: any) { Alert.alert('Could not respond', e?.message ?? 'Try again') }
    finally { setBusyId(null) }
  }

  const list = tab === 'received' ? received : sent

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>💰 Offers</Text>
      </View>

      <View style={s.segRow}>
        {(['received', 'sent'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.seg, tab === t && s.segOn]}>
            <Text style={[s.segText, tab === t && s.segTextOn]}>{t === 'received' ? 'Received' : 'Sent'}{t === 'received' && received && received.length > 0 ? ` ${received.length}` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {list === null ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 30 }} />
      ) : list.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>💰</Text>
          <Text style={s.emptyText}>{tab === 'received' ? 'No offers to review.' : 'You haven’t made any offers.'}</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: o }) => (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={s.thumb}>
                  {o.listing?.images?.[0] ? <Image source={{ uri: o.listing.images[0] }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 22 }}>🛍️</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>{o.listing?.title}</Text>
                  <Text style={s.meta}>{tab === 'received' ? 'A buyer offered' : 'Your offer'} · <Text style={{ fontWeight: '800', color: tab === 'received' ? '#555' : colors.orange }}>{STATUS_LABEL[o.status] ?? o.status}</Text></Text>
                </View>
                <Text style={s.amount}>€{Number(o.amount).toLocaleString()}</Text>
              </View>
              {o.message ? <Text style={s.message}>“{o.message}”</Text> : null}
              {tab === 'received' && o.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => respond(o.id, 'accept')} disabled={busyId === o.id} style={s.acceptBtn}><Text style={s.acceptText}>{busyId === o.id ? '…' : 'Accept'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => respond(o.id, 'decline')} disabled={busyId === o.id} style={s.declineBtn}><Text style={s.declineText}>Decline</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  segRow: { flexDirection: 'row', backgroundColor: '#f5f0e8', borderRadius: 50, padding: 4, margin: 12 },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 50 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#888' },
  segTextOn: { color: colors.dark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontFamily: 'Nunito', fontSize: 14, color: '#888', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0ebe4', borderRadius: 12, padding: 12, marginBottom: 10 },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f5f0e8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '800', color: colors.dark },
  meta: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 2 },
  amount: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.orange },
  message: { fontFamily: 'Nunito', fontSize: 11.5, color: '#666', marginTop: 6, backgroundColor: '#faf7f2', borderRadius: 8, padding: 8 },
  acceptBtn: { flex: 1, backgroundColor: colors.sage, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  acceptText: { color: '#fff', fontFamily: 'Nunito', fontSize: 12.5, fontWeight: '900' },
  declineBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  declineText: { color: '#ef4444', fontFamily: 'Nunito', fontSize: 12.5, fontWeight: '900' },
})
