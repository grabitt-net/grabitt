import { z } from 'zod'
import { router, publicProcedure, execProcedure } from '../trpc'
import {
  defaultAccountLevels,
  getAccountLevels,
  type AccountLevelsData,
  type BusinessLevelConfig,
  type PersonalLevelConfig,
  type StatusLevelConfig,
} from '../lib/accountLevels'

const personalLevelSchema = z.object({
  label: z.string().min(1).max(40),
  feePct: z.number().min(0).max(100),
  listingCap: z.number().int().min(0).max(999999),
  criteriaSales: z.number().int().min(0).max(1000000),
  criteriaRating: z.number().min(0).max(5),
})

const businessLevelSchema = z.object({
  label: z.string().min(1).max(40),
  feePct: z.number().min(0).max(100),
  caps: z.object({
    items: z.number().int().min(0).max(100000),
    jobs: z.number().int().min(0).max(10000),
    property: z.number().int().min(0).max(10000),
  }),
  criteriaSales90d: z.number().int().min(0).max(1000000),
  criteriaRating: z.number().min(0).max(5),
})

const statusLevelSchema = z.object({
  label: z.string().min(1).max(40),
  badge: z.string().max(8),
  feeDiscountPct: z.number().min(0).max(100),
  listingCap: z.number().int().min(0).max(100000).nullable(),
  freeBusiness: z.boolean(),
  evidence: z.string().max(300),
  blurb: z.string().max(300),
})

const configSchema = z.object({
  personal: z.object({
    grabber: personalLevelSchema,
    dealer: personalLevelSchema,
    trader: personalLevelSchema,
    pro: personalLevelSchema,
  }),
  business: z.object({
    dealer: businessLevelSchema,
    trader: businessLevelSchema,
    pro: businessLevelSchema,
  }),
  statuses: z.object({
    student: statusLevelSchema,
    blue_light: statusLevelSchema,
    charity: statusLevelSchema,
  }),
})

export const accountLevelsRouter = router({
  /** Public catalogue for seller/business dashboards — no secrets. */
  catalog: publicProcedure.query(({ ctx }) => getAccountLevels(ctx.prisma)),

  defaults: execProcedure.query(() => defaultAccountLevels()),

  config: execProcedure.query(({ ctx }) => getAccountLevels(ctx.prisma)),

  saveConfig: execProcedure
    .input(configSchema)
    .mutation(({ ctx, input }) =>
      ctx.prisma.accountLevelsConfig.upsert({
        where: { id: 'default' },
        create: { id: 'default', data: input as unknown as AccountLevelsData },
        update: { data: input as unknown as AccountLevelsData },
      })
    ),
})

export type { PersonalLevelConfig, BusinessLevelConfig, StatusLevelConfig, AccountLevelsData }
