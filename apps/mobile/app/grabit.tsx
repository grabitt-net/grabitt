import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

const DEALS = [
  { ref: 'G1', emoji: '🎮', title: 'PS5 + 2 Controllers', price: 299, original: 380, location: 'Las Palmas', expiresIn: 7200 },
  { ref: 'G2', emoji: '📱', title: 'iPhone 13 — Unlocked', price: 399, original: 550, location: 'Maspalomas', expiresIn: 16200 },
  { ref: 'G3', emoji: '🛋️', title: 'Clearance Sofa', price: 95, original: 320, location: 'Telde', expiresIn: 4200 },
  { ref: 'G4', emoji: '💻', title: 'MacBook Air M1', price: 599, original: 899, location: 'Las Palmas', expiresIn: 21600 },
  { ref: 'G5', emoji: '🚴', title: 'Mountain Bike', price: 180, original: 340, location: 'Arucas', expiresIn: 1800 },
]

function Countdown({ secs: initSecs }: { secs: number }) {
  const [secs, setSecs] = useState(initSecs)
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(secs / 3600).toString().padStart(2, '0')
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  const isUrgent = secs < 1800
  return <Text style={{ fontFamily: 'Courier', fontWeight: '900', fontSize: 14, color: isUrgent ? '#ef4444' : colors.orange, letterSpacing: 1 }}>{h}:{m}:{s}</Text>
}

export default function GrabitScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>⚡ Grab It Now</Text>
      </View>

      <View style={s.banner}>
        <Text style={s.bannerTitle}>⚡ FLASH DEALS — TODAY ONLY</Text>
        <Text style={s.bannerSub}>Grab before they're gone!</Text>
      </View>

      <FlatList
        data={DEALS}
        keyExtractor={i => i.ref}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const saving = item.original - item.price
          const pct = Math.round((saving / item.original) * 100)
          return (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.ref}`)}>
              <View style={s.thumb}>
                <Text style={{ fontSize: 50 }}>{item.emoji}</Text>
                <View style={s.discountBadge}><Text style={s.discountText}>-{pct}% OFF</Text></View>
              </View>
              <View style={{ padding: 12 }}>
                <Text style={s.title}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={s.price}>€{item.price}</Text>
                    <Text style={s.original}>€{item.original}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.expiresLabel}>Expires in</Text>
                    <Countdown secs={item.expiresIn} />
                  </View>
                </View>
                <Text style={s.location}>📍 {item.location}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  banner: { backgroundColor: colors.orange, padding: 16, alignItems: 'center' },
  bannerTitle: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  bannerSub: { fontFamily: 'Comfortaa', fontSize: 14, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0ebe4', overflow: 'hidden' },
  thumb: { height: 120, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  discountBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#ef4444', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  discountText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900', color: '#fff' },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark },
  price: { fontFamily: 'Georgia', fontSize: 22, fontWeight: '700', color: colors.orange },
  original: { fontFamily: 'Nunito', fontSize: 12, color: '#bbb', textDecorationLine: 'line-through' },
  expiresLabel: { fontFamily: 'Nunito', fontSize: 9, color: '#888', marginBottom: 2 },
  location: { fontFamily: 'Nunito', fontSize: 10, color: '#888', marginTop: 4 },
})
