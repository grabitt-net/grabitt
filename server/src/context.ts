import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { prisma } from './db'
import { verifyConsumerJwt, verifyExecJwt } from './middleware/auth'

// Adapter-agnostic context: given a bearer token, resolve the consumer/exec
// identity. Used by both the Express server and the Next.js fetch route handler.
export function buildContext(token: string | null, meta?: { ip?: string | null; userAgent?: string | null }) {
  let user: { id: string; grade: string } | null = null
  let execUser: { id: string; role: string } | null = null

  if (token) {
    const consumer = verifyConsumerJwt(token)
    if (consumer) user = consumer
    const exec = verifyExecJwt(token)
    if (exec) execUser = exec
  }

  return { prisma, user, execUser, ip: meta?.ip ?? null, userAgent: meta?.userAgent ?? null }
}

// Express adapter (standalone server)
export async function createContext({ req }: CreateExpressContextOptions) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const fwd = req.headers['x-forwarded-for']
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
    ?? (req.headers['x-real-ip'] as string | undefined)
    ?? req.socket?.remoteAddress
    ?? null
  const userAgent = (req.headers['user-agent'] as string | undefined) ?? null
  return buildContext(token, { ip, userAgent })
}

export type Context = ReturnType<typeof buildContext>
