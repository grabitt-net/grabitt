import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { createTrpcClient } from '@grabitt/api-client'

// Opened via grabitt://handover?token=<jwt>&txn=<uuid>
export default function HandoverScreen() {
  const { token, txn } = useLocalSearchParams<{ token: string; txn: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [sellerNet, setSellerNet] = useState<number | null>(null)

  const confirm = async () => {
    if (!token || !txn) {
      Alert.alert('Invalid link', 'This handover link is missing required data.')
      return
    }
    setStatus('loading')
    try {
      const client = createTrpcClient()
      const result = await client.transactions.confirmHandoverByQr.mutate({
        transactionId: txn,
        token,
      })
      setSellerNet(result.sellerNet)
      setStatus('success')
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Handover confirmation failed')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.heading}>Handover confirmed!</Text>
        <Text style={styles.sub}>
          Payment released to the seller.{'\n'}Why not leave a review?
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>❌</Text>
        <Text style={styles.heading}>Confirmation failed</Text>
        <Text style={styles.sub}>{errorMsg}</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#888' }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🤝</Text>
      <Text style={styles.heading}>Confirm handover</Text>
      <Text style={styles.sub}>
        By confirming, you're telling Grabitt you've received the item and the seller's funds should be released.
      </Text>
      <View style={styles.checklist}>
        {[
          'I have received the item',
          'The item matches the listing description',
          'I am happy to release payment to the seller',
        ].map((item, i) => (
          <Text key={i} style={styles.checkItem}>✅ {item}</Text>
        ))}
      </View>
      {status === 'loading' ? (
        <ActivityIndicator size="large" color="#E8621A" style={{ marginTop: 24 }} />
      ) : (
        <TouchableOpacity style={styles.btn} onPress={confirm}>
          <Text style={styles.btnText}>Confirm & release payment</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F4', alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 64, marginBottom: 16 },
  heading: { fontFamily: 'System', fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  sub: { fontFamily: 'System', fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  checklist: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24 },
  checkItem: { fontFamily: 'System', fontSize: 13, color: '#333', paddingVertical: 6 },
  btn: { backgroundColor: '#E8621A', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignSelf: 'stretch', alignItems: 'center' },
  btnText: { fontFamily: 'System', fontSize: 16, fontWeight: '900', color: '#fff' },
})
