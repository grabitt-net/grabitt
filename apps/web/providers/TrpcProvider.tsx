'use client'

// The app talks to tRPC through the vanilla client (getTrpcClient) in each
// component — it does not use the tRPC React Query hooks. Mounting
// trpc.Provider/QueryClientProvider here added no behaviour and crashed at
// runtime (undefined Symbol(trpc_untypedClient) from a duplicate @trpc copy
// in the client bundle), which cascaded into hydration errors. Keep this as a
// passthrough so the layout is unchanged; reintroduce the providers only if we
// start using the tRPC React hooks.
export function TrpcProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
