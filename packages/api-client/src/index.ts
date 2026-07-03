import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../server/src/index'

export type { AppRouter }

export const trpc = createTRPCReact<AppRouter>()

// The tRPC API is served by the Next.js app itself at /api/trpc (same origin).
// NEXT_PUBLIC_API_URL is only needed if you run the standalone Express server.
function trpcUrl() {
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
