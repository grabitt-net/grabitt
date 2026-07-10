import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Card } from './listingMap'

// Client-side "recently viewed" ring buffer (parity with web). Stores compact
// cards so the home strip renders with no extra network calls.
const KEY = 'grabitt_recent'
const MAX = 12

export async function pushView(card: Card) {
  if (!card?.ref) return
  try {
    const list = (await getViews()).filter(c => c.ref !== card.ref)
    list.unshift(card)
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch { /* ignore */ }
}

export async function getViews(): Promise<Card[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') } catch { return [] }
}
