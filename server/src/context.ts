import { inferAsyncReturnType } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { prisma } from './db'
import { verifyConsumerJwt, verifyExecJwt } from './middleware/auth'

export async function createContext({ req }: CreateExpressContextOptions) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let user: { id: string; grade: string } | null = null
  let execUser: { id: string; role: string } | null = null

  if (token) {
    const consumer = verifyConsumerJwt(token)
    if (consumer) user = consumer

    const exec = verifyExecJwt(token)
    if (exec) execUser = exec
  }

  return { prisma, user, execUser, req }
}

export type Context = inferAsyncReturnType<typeof createContext>
