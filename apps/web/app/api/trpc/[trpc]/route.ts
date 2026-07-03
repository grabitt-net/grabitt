import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from 'server/src/router'
import { buildContext } from 'server/src/context'

// The whole tRPC API runs here, inside the Next.js app on Vercel — no separate
// server to host. The web client calls /api/trpc (same origin).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => {
      const auth = req.headers.get('authorization')
      const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
      return buildContext(token)
    },
  })
}

export { handler as GET, handler as POST }
