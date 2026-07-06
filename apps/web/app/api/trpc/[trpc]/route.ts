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
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? null
      const userAgent = req.headers.get('user-agent') ?? null
      return buildContext(token, { ip, userAgent })
    },
  })
}

export { handler as GET, handler as POST }
