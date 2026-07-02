import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

const JOB_TYPES = ['All', 'Full Time', 'Part Time', 'Contract', 'Temp', 'Volunteer']

const JOBS = [
  { ref: 'J1', emoji: '🍺', title: 'Bar Staff Needed', company: 'The Irish Rover', location: 'Playa del Inglés', salary: '€1,200/mo', type: 'Full Time', posted: '2h ago' },
  { ref: 'J2', emoji: '🍳', title: 'Chef — Italian Restaurant', company: 'La Trattoria', location: 'Maspalomas', salary: '€1,600/mo', type: 'Full Time', posted: '4h ago' },
  { ref: 'J3', emoji: '🧹', title: 'Housekeeper (Part Time)', company: 'Hotel Gran Canaria', location: 'Las Palmas', salary: '€800/mo', type: 'Part Time', posted: '1d ago' },
  { ref: 'J4', emoji: '🚗', title: 'Driver Wanted', company: 'FastDeliver GC', location: 'Vecindario', salary: '€1,100/mo', type: 'Contract', posted: '2d ago' },
  { ref: 'J5', emoji: '💻', title: 'Web Developer — Remote', company: 'TechGC', location: 'Remote', salary: '€2,400/mo', type: 'Contract', posted: '3d ago' },
]

export default function JobsScreen() {
  const [filter, setFilter] = useState('All')
  const shown = filter === 'All' ? JOBS : JOBS.filter(j => j.type === filter)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>💼 Jobs</Text>
      </View>

      <View style={{ paddingVertical: 8 }}>
        <FlatList
          data={JOB_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          keyExtractor={i => i}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setFilter(item)} style={[s.chip, filter === item && s.chipActive]}>
              <Text style={[s.chipLabel, filter === item && s.chipLabelActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={shown}
        keyExtractor={i => i.ref}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.ref}`)}>
            <View style={s.icon}><Text style={{ fontSize: 28 }}>{item.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.company}>{item.company} · 📍 {item.location}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={s.salary}>{item.salary}</Text>
                <View style={s.badge}><Text style={s.badgeText}>{item.type.toUpperCase()}</Text></View>
              </View>
            </View>
            <Text style={s.posted}>{item.posted}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  chipActive: { backgroundColor: colors.orange },
  chipLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  chipLabelActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0ebe4', alignItems: 'flex-start' },
  icon: { width: 48, height: 48, backgroundColor: '#f5f0e8', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark, marginBottom: 2 },
  company: { fontFamily: 'Nunito', fontSize: 11, color: '#666' },
  salary: { fontFamily: 'Georgia', fontSize: 14, fontWeight: '700', color: colors.orange },
  badge: { backgroundColor: '#f5f0e8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50 },
  badgeText: { fontFamily: 'Nunito', fontSize: 8, fontWeight: '900', color: '#888' },
  posted: { fontFamily: 'Nunito', fontSize: 10, color: '#bbb' },
})
