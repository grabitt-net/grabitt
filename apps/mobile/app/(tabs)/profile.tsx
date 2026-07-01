import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '@grabitt/design-tokens'

const MENU = [
  { icon: '📋', label: 'My Listings' },
  { icon: '🛒', label: 'Purchases' },
  { icon: '💰', label: 'Offers' },
  { icon: '❤️', label: 'Favourites' },
  { icon: '🔖', label: 'Saved Searches' },
  { icon: '💶', label: 'Credits & Rewards' },
  { icon: '🛡️', label: 'Safety Shield' },
  { icon: '⚙️', label: 'Settings' },
]

export default function ProfileScreen() {
  return (
    <View style={s.screen}>
      <View style={s.hero}>
        <View style={s.avatar}><Text style={{ fontSize: 36 }}>👤</Text></View>
        <Text style={s.name}>Guest User</Text>
        <TouchableOpacity style={s.loginBtn}>
          <Text style={s.loginBtnText}>Log In / Join</Text>
        </TouchableOpacity>
      </View>
      <View style={s.menu}>
        {MENU.map(item => (
          <TouchableOpacity key={item.label} style={s.menuRow}>
            <Text style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.icon}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={{ color: '#ccc', fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  hero: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1.5, borderBottomColor: colors.sand2 },
  avatar: { width: 72, height: 72, backgroundColor: colors.sand, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name: { fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 12 },
  loginBtn: { backgroundColor: colors.orange, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 10 },
  loginBtnText: { color: '#fff', fontFamily: 'Nunito', fontSize: 14, fontWeight: '900' },
  menu: { paddingHorizontal: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuLabel: { flex: 1, fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
})
