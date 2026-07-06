import { trpc } from '@grabitt/api-client'
import { httpBatchLink } from '@trpc/client'

// Mobile talks to the deployed backend over an absolute URL (no same-origin).
// Override via EXPO_PUBLIC_API_URL for local/staging.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://grabitt.vercel.app').replace(/\/$/, '')

// tRPC client for React Native. Pass the consumer app JWT for protected calls.
export function apiClient(token?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_URL}/api/trpc`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    ],
  })
}
