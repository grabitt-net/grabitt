import { z } from 'zod'

export const UserGrade = z.enum(['grabber', 'dealer', 'trader', 'pro'])
export type UserGrade = z.infer<typeof UserGrade>

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(2).max(50),
  avatar: z.string().url().nullable(),
  grade: UserGrade.default('grabber'),
  salesCount: z.number().int().min(0).default(0),
  avgRating: z.number().min(0).max(5).nullable(),
  credits: z.number().int().min(0).default(50),
  isBusiness: z.boolean().default(false),
  businessVerified: z.boolean().default(false),
  businessTrialEnds: z.date().nullable(),
  locale: z.enum(['en', 'es', 'de']).default('en'),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type User = z.infer<typeof UserSchema>

export const ExecUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['super_admin', 'admin', 'support']),
  createdAt: z.date(),
})
export type ExecUser = z.infer<typeof ExecUserSchema>

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
  locale: z.enum(['en', 'es', 'de']).default('en'),
})
export type RegisterInput = z.infer<typeof RegisterInputSchema>

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})
export type LoginInput = z.infer<typeof LoginInputSchema>
