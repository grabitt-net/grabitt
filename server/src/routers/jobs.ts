import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const jobsRouter = router({
  list: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).optional(),
      remote: z.boolean().optional(),
      minSalary: z.number().optional(),
      location: z.string().optional(),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.jobListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.remote !== undefined && { remote: input.remote }),
          // Keep jobs whose top-of-range pay meets the threshold.
          ...(input.minSalary && { salaryMax: { gte: input.minSalary } }),
          ...(input.query && {
            OR: [
              { jobTitle: { contains: input.query, mode: 'insensitive' } },
              { company: { contains: input.query, mode: 'insensitive' } },
            ],
          }),
          listing: {
            status: 'active',
            ...(input.location && { location: { contains: input.location, mode: 'insensitive' } }),
          },
        },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),

  // Employer's applications board: their job listings with applicants.
  employerApplications: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await ctx.prisma.jobListing.findMany({
      where: { employerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { applicant: { select: { id: true, displayName: true } } },
        },
      },
    })
    return jobs.map(j => ({
      id: j.id,
      jobTitle: j.jobTitle,
      company: j.company,
      applications: j.applications.map(a => ({
        id: a.id,
        status: a.status,
        coverNote: a.coverNote,
        applicant: a.applicant.displayName,
        createdAt: a.createdAt,
      })),
    }))
  }),
})
