import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './router'
import { createContext } from './context'
import { initJobs } from './jobs'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true }))
app.use(express.json())

// tRPC
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))

// Stripe webhook (raw body required — mount before json middleware in production)
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const { stripeWebhookHandler } = await import('./webhooks/stripe')
  return stripeWebhookHandler(req, res)
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`)
  initJobs()
})

export type AppRouter = typeof appRouter
