import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@grabitt/design-tokens'

export default function MessagesScreen() {
  return (
    <View style={s.screen}>
      <Text style={s.heading}>💬 Messages</Text>
      <View style={s.empty}>
        <Text style={{ fontSize: 52, marginBottom: 14 }}>💬</Text>
        <Text style={s.emptyTitle}>No messages yet</Text>
        <Text style={s.emptySub}>When you contact a seller or buyer, your conversations appear here.</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: colors.sand2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'Nunito', fontSize: 16, fontWeight: '900', color: colors.dark, marginBottom: 8 },
  emptySub: { fontFamily: 'Nunito', fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
})
