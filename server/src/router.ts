import { router } from './trpc'
import { authRouter } from './routers/auth'
import { listingsRouter } from './routers/listings'
import { transactionsRouter } from './routers/transactions'
import { offersRouter } from './routers/offers'
import { messagesRouter } from './routers/messages'
import { usersRouter } from './routers/users'
import { creditsRouter } from './routers/credits'
import { notificationsRouter } from './routers/notifications'
import { wishlistRouter } from './routers/wishlist'
import { savedSearchesRouter } from './routers/savedSearches'
import { disputesRouter } from './routers/disputes'
import { jobsRouter } from './routers/jobs'
import { propertyRouter } from './routers/property'
import { handyRouter } from './routers/handy'
import { crmRouter } from './routers/crm'
import { eshotsRouter } from './routers/eshots'
import { bannersRouter } from './routers/banners'
import { financialsRouter } from './routers/financials'
import { subscriptionsRouter } from './routers/subscriptions'
import { complianceRouter } from './routers/compliance'
import { homepageRouter } from './routers/homepage'

export const appRouter = router({
  auth: authRouter,
  listings: listingsRouter,
  transactions: transactionsRouter,
  offers: offersRouter,
  messages: messagesRouter,
  users: usersRouter,
  credits: creditsRouter,
  notifications: notificationsRouter,
  wishlist: wishlistRouter,
  savedSearches: savedSearchesRouter,
  disputes: disputesRouter,
  jobs: jobsRouter,
  property: propertyRouter,
  handy: handyRouter,
  crm: crmRouter,
  eshots: eshotsRouter,
  banners: bannersRouter,
  financials: financialsRouter,
  subscriptions: subscriptionsRouter,
  compliance: complianceRouter,
  homepage: homepageRouter,
})

export type AppRouter = typeof appRouter
