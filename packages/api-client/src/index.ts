import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../server/src/index'

export type { AppRouter }

export const trpc = createTRPCReact<AppRouter>()

// Web: the tRPC API is same-origin (/api/trpc). Mobile (Expo/React Native) has
// no origin, so it must use an absolute URL — EXPO_PUBLIC_API_URL points at the
// deployed app (e.g. https://www.grabitt.net). NEXT_PUBLIC_API_URL supports the
// standalone Express server if ever used.
function trpcUrl() {
  const abs = process.env.EXPO_PUBLIC_API_URL
  if (abs) return `${abs.replace(/\/$/, '')}/api/trpc`
  const base = process.env.NEXT_PUBLIC_API_URL
  return base ? `${base}/trpc` : '/api/trpc'
}

export function createTrpcClient(token?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: trpcUrl(),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    ],
  })
}
