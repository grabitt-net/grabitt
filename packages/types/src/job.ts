import { z } from 'zod'

export const JobType = z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer'])
export type JobType = z.infer<typeof JobType>

export const JobListingSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  employerId: z.string().uuid(),
  jobTitle: z.string().max(100),
  company: z.string().max(100),
  type: JobType,
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  remote: z.boolean().default(false),
  skills: z.array(z.string()),
  applyUrl: z.string().url().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
})
export type JobListing = z.infer<typeof JobListingSchema>
