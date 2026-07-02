import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

const TABS = ['For Sale', 'To Let', 'Commercial', 'Land', 'New Builds', 'Wanted']

const PROPS = [
  { ref: 'P1', emoji: '🏢', title: 'Luxury 2-Bed Apartment', location: 'Playa del Inglés', price: '€185,000', beds: 2, baths: 1, m2: 85, tab: 'For Sale', tag: 'Pool' },
  { ref: 'P2', emoji: '🏡', title: 'Villa with Sea View', location: 'Mogán', price: '€380,000', beds: 4, baths: 3, m2: 220, tab: 'For Sale', tag: 'Sea view' },
  { ref: 'P3', emoji: '🏠', title: 'Studio to Rent', location: 'Las Palmas', price: '€550/mo', beds: 0, baths: 1, m2: 38, tab: 'To Let', tag: 'Furnished' },
  { ref: 'P4', emoji: '🏘️', title: '2-Bed Bungalow', location: 'Maspalomas', price: '€950/mo', beds: 2, baths: 1, m2: 90, tab: 'To Let', tag: 'Garden' },
  { ref: 'P5', emoji: '🏢', title: 'Office Space 120m²', location: 'Las Palmas', price: '€1,200/mo', beds: 0, baths: 0, m2: 120, tab: 'Commercial', tag: 'A/C' },
  { ref: 'P6', emoji: '🌍', title: 'Building Plot 800m²', location: 'Tejeda', price: '€45,000', beds: 0, baths: 0, m2: 800, tab: 'Land', tag: 'Rural' },
  { ref: 'P7', emoji: '🏗️', title: 'New Build 3-Bed', location: 'Arguineguín', price: '€295,000', beds: 3, baths: 2, m2: 140, tab: 'New Builds', tag: 'Off-plan' },
]

export default function PropertyScreen() {
  const [tab, setTab] = useState('For Sale')
  const shown = PROPS.filter(p => p.tab === tab)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>🏠 Property</Text>
      </View>

      <View style={{ paddingVertical: 8 }}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          keyExtractor={i => i}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setTab(item)} style={[s.chip, tab === item && s.chipActive]}>
              <Text style={[s.chipLabel, tab === item && s.chipLabelActive]}>{item}</Text>
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
            <View style={s.thumb}>
              <Text style={{ fontSize: 50 }}>{item.emoji}</Text>
              <View style={s.tag}><Text style={s.tagText}>{item.tag}</Text></View>
            </View>
            <View style={{ padding: 12 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.location}>📍 {item.location}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={s.price}>{item.price}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.beds > 0 && <Text style={s.spec}>🛏 {item.beds}</Text>}
                  {item.baths > 0 && <Text style={s.spec}>🚿 {item.baths}</Text>}
                  {item.m2 > 0 && <Text style={s.spec}>📐 {item.m2}m²</Text>}
                </View>
              </View>
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
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  chipActive: { backgroundColor: colors.orange },
  chipLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  chipLabelActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0ebe4', overflow: 'hidden' },
  thumb: { height: 120, backgroundColor: '#f5f0e8', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tag: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900', color: '#fff' },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark, marginBottom: 2 },
  location: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  price: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: colors.orange },
  spec: { fontFamily: 'Nunito', fontSize: 10, color: '#888' },
})
