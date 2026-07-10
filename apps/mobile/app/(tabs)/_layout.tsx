import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
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
      <Tabs.Screen name="index"    options={{ title: 'Browse',   tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="sell"     options={{ title: 'Sell',     tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={21} color={color} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} /> }} />
      {/* Admin/CRM is a web-only product — hide the placeholder Exec tab. */}
      <Tabs.Screen name="exec"     options={{ href: null }} />
    </Tabs>
  )
}
