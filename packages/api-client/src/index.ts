import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../server/src/index'

export type { AppRouter }

export const trpc = createTRPCReact<AppRouter>()

export function createTrpcClient(token?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/trpc`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    ],
  })
}
