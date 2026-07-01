import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Pressable } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

// Stub listings per dept — same as web PanelHost
const DEPT_LISTINGS: Record<string, [string, string, string, string][]> = {
  'Home & Garden': [['🪴','Snake Plant','€12','Las Palmas'],['🛋️','IKEA Sofa','€180','Maspalomas'],['🔨','Dewalt Drill','€85','Telde'],['🌿','Garden Tools Set','€40','Arucas'],['🪟','Venetian Blinds','€55','Las Palmas']],
  'Jobs': [['💼','Bar Staff Needed','€1,200/mo','Las Palmas'],['🍳','Chef — Italian Rest.','€1,600/mo','Playa del Inglés'],['🧹','Housekeeper','€950/mo','Maspalomas'],['🚗','Driver Wanted','€1,100/mo','Vecindario'],['💻','Web Dev — Remote','€2,400/mo','Online']],
  'Fashion': [['👟','Nike Air Max 90','€75','Las Palmas'],['👗','Summer Dress','€22','Maspalomas'],['🧳','Louis Vuitton Bag','€320','Playa del Inglés'],['🧢','Vintage Cap','€15','Telde'],['💍','Silver Ring','€28','Las Palmas']],
  'Sport': [['🏄','Surfboard 6ft','€120','Las Palmas'],['🚴','Mountain Bike','€340','Maspalomas'],['⚽','Football Boots','€45','Arucas'],['🎾','Tennis Racket','€60','Telde'],['🏋️','Dumbbells Set','€95','Vecindario']],
  'Gaming': [['🎮','PS5 Console','€380','Las Palmas'],['🕹️','Nintendo Switch','€220','Maspalomas'],['🎧','Gaming Headset','€55','Telde'],['🖥️','Gaming Chair','€150','Playa del Inglés'],['📀','FIFA 25','€25','Las Palmas']],
  'Electronics': [['📱','iPhone 14','€620','Las Palmas'],['💻','MacBook Air M2','€890','Maspalomas'],['📷','Canon R6 + Lens','€1,800','Telde'],['🎵','Sony WH-1000XM5','€220','Playa del Inglés'],['⌨️','Mechanical Keyboard','€75','Arucas']],
  'Gift Ideas': [['🎁','Spa Gift Voucher','€50','Las Palmas'],['🍷','Wine Hamper','€65','Maspalomas'],['🕯️','Candle Set','€18','Telde'],['📚','Book Collection','€35','Playa del Inglés'],['🧴','Beauty Box','€42','Las Palmas']],
  'Kids & Baby': [['🧸','LEGO City Set','€45','Las Palmas'],['🚲','Kids Bike 16"','€85','Maspalomas'],['👶','Mothercare Pram','€120','Telde'],['🎨','Art Supplies','€22','Playa del Inglés'],["📚","Children's Books",'€12','Arucas']],
  'Property': [['🏠','Studio Flat','€650/mo','Playa del Inglés'],['🏡','2-Bed Bungalow','€950/mo','Maspalomas'],['🏢','Office Space','€400/mo','Las Palmas'],['🌴','Villa for Sale','€285,000','Puerto Rico'],['🛏️','Room to Rent','€380/mo','Vecindario']],
  'Health & Fitness': [['💊','Vitamin D Pack','€12','Las Palmas'],['🏃','Running Shoes','€65','Maspalomas'],['🧘','Yoga Mat','€18','Telde'],['💪','Protein Powder','€35','Playa del Inglés'],['🩺','Blood Pressure Mon.','€45','Las Palmas']],
  'Food Store': [['🥖','Artisan Bread Box','€12','Las Palmas'],['🧀','Local Cheese Pack','€18','Maspalomas'],['🍷','Gran Canaria Wine','€22','Telde'],['🫒','Olive Oil 5L','€28','Arucas'],['☕','Specialty Coffee','€15','Las Palmas']],
  'Retro & Vintage': [['📻','Vintage Radio','€45','Las Palmas'],['🕹️','Atari Console','€120','Maspalomas'],['👔','70s Leather Jacket','€85','Telde'],['🎸','Fender Stratocaster','€340','Las Palmas'],['📷','Film Camera','€65','Playa del Inglés']],
  'Grab It Now': [['🛍️','Flash Deal Bundle','€29','Las Palmas'],['⚡','Today Only: TV','€199','Maspalomas'],['🔥','Clearance Sofa','€95','Telde'],['💥','iPhone Deal','€299','Las Palmas'],['⏰','Last 2: Laptop','€349','Playa del Inglés']],
  'Handy Help': [['🔧','Plumber — Urgent','€35/hr','Las Palmas'],['⚡','Electrician','€40/hr','Maspalomas'],['🪣','Cleaner Available','€12/hr','Telde'],['🏗️','Builder / Painter','€25/hr','Arucas'],['🌿','Gardener','€15/hr','Las Palmas']],
  'Pet Shop': [['🐾','Golden Retriever Pup','€600','Las Palmas'],['🐱','Bengal Kitten','€450','Maspalomas'],['🦜','African Grey Parrot','€800','Telde'],['🐠','Aquarium Setup','€120','Playa del Inglés'],['🦮','Dog Walker','€10/hr','Las Palmas']],
}

const SUBCATS: Record<string, string[]> = {
  'Electronics':    ['All', 'Phones', 'Laptops', 'Audio', 'Cameras', 'Gaming', 'Wearables'],
  'Fashion':        ['All', "Women's", "Men's", "Shoes", 'Accessories', 'Vintage'],
  'Home & Garden':  ['All', 'Furniture', 'Kitchen', 'Garden', 'Decor', 'DIY'],
  'Sport':          ['All', 'Water Sports', 'Cycling', 'Football', 'Tennis', 'Gym'],
  'Property':       ['All', 'Rent', 'For Sale', 'Rooms', 'Commercial'],
}

const CARD_BKGS = ['#FFF3EE','#EEF4FF','#F0FDF4','#FEF9EE','#FDF0FF']

export default function DeptScreen() {
  const { name } = useLocalSearchParams<{ name: string }>()
  const deptName = name ? decodeURIComponent(name) : 'Listings'
  const items = DEPT_LISTINGS[deptName] || []
  const subcats = SUBCATS[deptName] || ['All']
  const [activeSub, setActiveSub] = useState('All')
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest')

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ fontSize: 20, color: colors.orange }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.heading} numberOfLines={1}>{deptName}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Subcategory chips */}
      <FlatList
        data={subcats}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
        keyExtractor={i => i}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveSub(item)}
            style={[s.chip, activeSub === item && s.chipActive]}
          >
            <Text style={[s.chipText, activeSub === item && s.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
        style={s.chipRow}
      />

      {/* Sort + count */}
      <View style={s.sortRow}>
        <Text style={s.countText}>{items.length} listings</Text>
        <View style={s.sortBtns}>
          {(['newest', 'price_asc', 'price_desc'] as const).map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setSort(opt)}
              style={[s.sortBtn, sort === opt && s.sortBtnActive]}
            >
              <Text style={[s.sortBtnText, sort === opt && s.sortBtnTextActive]}>
                {opt === 'newest' ? 'New' : opt === 'price_asc' ? '↑ Price' : '↓ Price'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={items}
        numColumns={2}
        contentContainerStyle={{ padding: 10, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: [emoji, title, price, location], index }) => (
          <TouchableOpacity
            style={[s.card, { backgroundColor: CARD_BKGS[index % CARD_BKGS.length] }]}
            onPress={() => router.push(`/listing/${encodeURIComponent(title)}`)}
          >
            <View style={s.cardThumb}>
              <Text style={{ fontSize: 36 }}>{emoji}</Text>
            </View>
            <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>
            <View style={s.cardFooter}>
              <Text style={s.cardPrice}>{price}</Text>
              <Text style={s.cardLocation} numberOfLines={1}>{location}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>😕</Text>
            <Text style={s.emptyText}>No listings in {deptName} right now.</Text>
          </View>
        }
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 10, paddingHorizontal: 14, borderBottomWidth: 1.5, borderBottomColor: colors.sand2, backgroundColor: colors.sand },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 17, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  chipRow: { backgroundColor: colors.sand, borderBottomWidth: 1, borderBottomColor: colors.sand2, flexGrow: 0 },
  chip: { backgroundColor: '#FFF3EE', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.orange },
  chipText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.orange },
  chipTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  countText: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortBtn: { backgroundColor: '#f5f5f5', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  sortBtnActive: { backgroundColor: colors.orange },
  sortBtnText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#555' },
  sortBtnTextActive: { color: '#fff' },
  card: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e0d5' },
  cardThumb: { width: '100%', aspectRatio: 1.4, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: colors.dark, paddingHorizontal: 10, paddingTop: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, paddingTop: 4 },
  cardPrice: { fontFamily: 'Georgia', fontSize: 13, fontWeight: '700', color: colors.orange },
  cardLocation: { fontFamily: 'Nunito', fontSize: 9, color: '#888', flex: 1, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
