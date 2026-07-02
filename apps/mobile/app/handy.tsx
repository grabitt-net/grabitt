import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

const TRADES = [
  { id: 'all', label: 'All', emoji: '🤝' },
  { id: 'plumbing', label: 'Plumbing', emoji: '🔧' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { id: 'painting', label: 'Painting', emoji: '🎨' },
  { id: 'gardening', label: 'Gardening', emoji: '🌿' },
  { id: 'it', label: 'IT Support', emoji: '💻' },
  { id: 'beauty', label: 'Beauty', emoji: '💅' },
  { id: 'other', label: 'Other', emoji: '🛠️' },
]

const PROVIDERS = [
  { ref: 'H1', name: 'Carlos M.', trade: 'plumbing', rate: '€35/hr', location: 'Las Palmas', rating: 4.9, jobs: 47, available: true },
  { ref: 'H2', name: 'Ana L.', trade: 'cleaning', rate: '€12/hr', location: 'Maspalomas', rating: 4.8, jobs: 123, available: true },
  { ref: 'H3', name: 'Juan P.', trade: 'electrical', rate: '€40/hr', location: 'Telde', rating: 4.7, jobs: 62, available: false },
  { ref: 'H4', name: 'María R.', trade: 'painting', rate: '€25/hr', location: 'Vecindario', rating: 5.0, jobs: 28, available: true },
  { ref: 'H5', name: 'Ahmed K.', trade: 'gardening', rate: '€15/hr', location: 'Arucas', rating: 4.6, jobs: 89, available: true },
]

export default function HandyScreen() {
  const [trade, setTrade] = useState('all')
  const shown = trade === 'all' ? PROVIDERS : PROVIDERS.filter(p => p.trade === trade)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🔧 Handy Help</Text>
      </View>

      <View style={{ paddingVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, flexDirection: 'row' }}>
          {TRADES.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTrade(t.id)} style={[s.chip, trade === t.id && s.chipActive]}>
              <Text style={{ fontSize: 14, marginRight: 4 }}>{t.emoji}</Text>
              <Text style={[s.chipLabel, trade === t.id && s.chipLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={shown}
        keyExtractor={i => i.ref}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.ref}`)}>
            <View style={[s.avatar, { backgroundColor: item.available ? '#f0fdf4' : '#f0f0f0' }]}>
              <Text style={{ fontSize: 26 }}>{TRADES.find(t => t.id === item.trade)?.emoji ?? '🤝'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={s.name}>{item.name}</Text>
                {item.available && <View style={s.availBadge}><Text style={s.availText}>Available</Text></View>}
              </View>
              <Text style={s.meta}>⭐ {item.rating} · {item.jobs} jobs · 📍 {item.location}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.rate}>{item.rate}</Text>
              <TouchableOpacity style={s.contactBtn}><Text style={s.contactText}>Contact</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  chipActive: { backgroundColor: colors.orange },
  chipLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  chipLabelActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0ebe4', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark },
  availBadge: { backgroundColor: '#d1fae5', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  availText: { fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: '#065f46' },
  meta: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  rate: { fontFamily: 'Georgia', fontSize: 16, fontWeight: '700', color: colors.orange, marginBottom: 4 },
  contactBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  contactText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900', color: '#fff' },
})
