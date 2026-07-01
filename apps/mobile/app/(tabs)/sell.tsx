import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '@grabitt/design-tokens'

const OPTIONS = [
  { icon: '🏡', title: 'Sell an item',    desc: 'List anything from furniture to electronics' },
  { icon: '💼', title: 'Post a job',      desc: 'Find staff or freelancers on Gran Canaria' },
  { icon: '🏠', title: 'List a property', desc: 'Rent or sell a home or room' },
  { icon: '🔧', title: 'Offer a service', desc: 'Plumbers, cleaners, tutors and more' },
]

export default function SellScreen() {
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.heading}>📦 Sell on Grabitt</Text>
        <Text style={s.sub}>Fees from 2.5% · Secure payments</Text>
      </View>
      <View style={s.options}>
        {OPTIONS.map(opt => (
          <TouchableOpacity key={opt.title} style={s.optionRow}>
            <View style={s.optionIcon}><Text style={{ fontSize: 24 }}>{opt.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionTitle}>{opt.title}</Text>
              <Text style={s.optionDesc}>{opt.desc}</Text>
            </View>
            <Text style={{ color: colors.orange, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={s.cta}>
        <Text style={s.ctaText}>🚀 Start Listing</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16 },
  header: { alignItems: 'center', marginBottom: 28 },
  heading: { fontFamily: 'Comfortaa', fontSize: 22, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  sub: { fontFamily: 'Nunito', fontSize: 12, color: '#888' },
  options: { gap: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  optionIcon: { width: 48, height: 48, backgroundColor: colors.orange, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark, marginBottom: 2 },
  optionDesc: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  cta: { backgroundColor: colors.orange, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  ctaText: { color: '#fff', fontFamily: 'Nunito', fontSize: 16, fontWeight: '900' },
})
