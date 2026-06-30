import { Text, View } from 'react-native'

// Phase 5 — Mobile app scaffold
// Full implementation follows Phase 2-4 web completion
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontFamily: 'Comfortaa', fontSize: 28, color: '#FF4500', fontWeight: '700' }}>
        Grabitt!
      </Text>
      <Text style={{ fontSize: 14, color: '#777', marginTop: 8 }}>
        Your Local Everything — Mobile
      </Text>
    </View>
  )
}
