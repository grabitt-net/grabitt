import { Tabs } from 'expo-router'
import { colors } from '@grabitt/design-tokens'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: '#9E8F7A',
        tabBarStyle: {
          backgroundColor: colors.sand,
          borderTopColor: colors.sand2,
          borderTopWidth: 1.5,
          paddingBottom: 8,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito',
          fontSize: 10,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Browse',   tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }} />
      <Tabs.Screen name="sell"     options={{ title: 'Sell',     tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tabs>
  )
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 22, opacity: color === colors.orange ? 1 : 0.6 }}>{emoji}</Text>
}
