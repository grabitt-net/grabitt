import { z } from 'zod'

export const PipelineStage = z.enum(['lead', 'qual', 'pitch', 'close', 'won', 'lost', 'nurture'])
export type PipelineStage = z.infer<typeof PipelineStage>

export const CrmContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  stage: PipelineStage,
  value: z.number().min(0).default(0),
  assignedTo: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type CrmContact = z.infer<typeof CrmContactSchema>

export const BannerSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().nullable(),
  active: z.boolean(),
  position: z.enum(['home_top', 'home_mid', 'category', 'checkout']),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  createdAt: z.date(),
})
export type Banner = z.infer<typeof BannerSchema>

export const EshotSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  bodyHtml: z.string(),
  segment: z.enum(['all', 'grabber', 'dealer', 'trader', 'pro', 'business', 'inactive']),
  sentAt: z.date().nullable(),
  openCount: z.number().int().default(0),
  clickCount: z.number().int().default(0),
  createdAt: z.date(),
})
export type Eshot = z.infer<typeof EshotSchema>
