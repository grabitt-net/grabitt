// Re-export from the shared package so web components import from one place.
export { trpc, createTrpcClient } from '@grabitt/api-client'
export type { AppRouter } from '@grabitt/api-client'

// The app router has grown large enough that TypeScript exceeds its type
// instantiation limit when inferring some call sites off the full client
// ("Type instantiation is excessively deep"). This returns the same client with
// its type erased, for the handful of pages that trip the limit. Prefer
// createTrpcClient(); reach for this only when the compiler forces you to, and
// cast the result to the shape the page expects so the data stays typed.
import { createTrpcClient as _createTrpcClient } from '@grabitt/api-client'

type LooseClient = Record<string, Record<string, {
  query: (input?: unknown) => Promise<unknown>
  mutate: (input?: unknown) => Promise<unknown>
}>>

export function createLooseTrpcClient(): LooseClient {
  return _createTrpcClient() as unknown as LooseClient
}
