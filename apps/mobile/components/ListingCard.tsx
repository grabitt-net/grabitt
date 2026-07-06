import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import type { Card } from '../lib/listingMap'

// Shared listing card — matches the web ListingsGrid/FeaturedStrip card:
// photo (or department emoji fallback), FEATURED badge, title, dark price,
// location pin and a condition chip.
//   - default: vertical card (grids + horizontal strips). Pass `width` for a
//     fixed-width strip item, omit it to flex inside a grid column.
//   - `layout="row"`: compact horizontal card for the search results list.

function Thumb({ item, style }: { item: Card; style?: object }) {
  return (
    <View style={[s.thumb, style]}>
      {item.image
        ? <Image source={{ uri: item.image }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        : <View style={s.emojiWrap}><Text style={{ fontSize: 34 }}>{item.emoji}</Text></View>}
      {item.isFeatured && (
        <View style={s.badge}>
          <Text style={s.badgeStar}>★</Text>
          <Text style={s.badgeText}>FEATURED</Text>
        </View>
      )}
    </View>
  )
}

export function ListingCard({ item, width, layout = 'card' }: { item: Card; width?: number; layout?: 'card' | 'row' }) {
  const go = () => router.push(`/listing/${item.ref}`)

  if (layout === 'row') {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={go} style={s.rowCard}>
        <Thumb item={item} style={s.rowThumb} />
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          <Text style={s.price}>{item.price}</Text>
          <View style={s.chips}>
            <Text style={s.chip}>📍 {item.location}</Text>
            {!!item.condition && <Text style={s.chip}>{item.condition}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={go} style={[s.card, width ? { width } : { flex: 1 }]}>
      <Thumb item={item} />
      <View style={s.body}>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        <View style={s.priceRow}>
          <Text style={s.price}>{item.price}</Text>
          <Text style={s.location} numberOfLines={1}>📍 {item.location}</Text>
        </View>
        {!!item.condition && <Text style={s.condition}>{item.condition}</Text>}
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#ece3d7',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  thumb: { width: '100%', aspectRatio: 1.28, backgroundColor: '#f5f0e8', position: 'relative' },
  emojiWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(26,26,26,0.82)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 50,
  },
  badgeStar: { color: '#FFB800', fontSize: 9 },
  badgeText: { color: '#fff', fontSize: 8.5, fontWeight: '800', fontFamily: 'Nunito', letterSpacing: 0.3 },
  body: { padding: 10 },
  title: { fontFamily: 'Nunito', fontSize: 12.5, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontFamily: 'Nunito', fontSize: 16, fontWeight: '900', color: colors.dark },
  location: { fontFamily: 'Nunito', fontSize: 10.5, fontWeight: '500', color: '#9a8b74', flexShrink: 1, textAlign: 'right', marginLeft: 6 },
  condition: {
    alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#f2f7f2', color: colors.sage,
    fontSize: 10, fontWeight: '700', fontFamily: 'Nunito', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 50,
    overflow: 'hidden',
  },
  // Row (search) variant
  rowCard: {
    flexDirection: 'row', gap: 12, padding: 10, backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#f0ebe4', alignItems: 'center',
  },
  rowThumb: { width: 66, height: 66, aspectRatio: undefined, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  chip: { fontFamily: 'Nunito', fontSize: 9, color: '#888', backgroundColor: '#f5f0e8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50, fontWeight: '700', overflow: 'hidden' },
})
