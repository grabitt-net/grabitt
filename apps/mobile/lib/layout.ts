import { Platform, StatusBar } from 'react-native'

// Android draws content under the status bar (edge-to-edge), and on some devices
// react-native-safe-area-context reports a 0 top inset, leaving headers hidden
// behind the clock. StatusBar.currentHeight is the reliable Android status-bar
// height; iOS relies on SafeAreaView for the notch, so this is 0 there.
export const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0
