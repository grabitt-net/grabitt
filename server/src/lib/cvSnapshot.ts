// The CV as captured at apply time. Stored on JobApplication.cvSnapshot so the
// recruiter always sees what was submitted, not a version the candidate edited
// afterwards. Contact fields are held here but only rendered once the candidate
// is revealed (shortlisted/hired or unlocked).
export type CvSnapshot = {
  name: string
  email: string | null
  phone: string | null
  location: string | null
  headline: string | null
  summary: string | null
  skills: string[]
  keyStrengths: string[]
  certifications: string[]
  languages: string[]
  availability: string | null
  rightToWork: string | null
  experienceMonths: number
  workExperience: unknown[]
  education: unknown[]
}

type UserLite = { displayName: string; email: string | null; phone: string | null }
type ProfileLite = {
  headline: string | null; summary: string | null; skills: string[]; keyStrengths: string[]
  certifications: string[]; languages: string[]; availability: string | null; rightToWork: string | null
  location: string | null; experienceMonths: number; workExperience: unknown; education: unknown
} | null

export function buildCvSnapshot(user: UserLite, profile: ProfileLite): CvSnapshot {
  return {
    name: user.displayName,
    email: user.email,
    phone: user.phone,
    location: profile?.location ?? null,
    headline: profile?.headline ?? null,
    summary: profile?.summary ?? null,
    skills: profile?.skills ?? [],
    keyStrengths: profile?.keyStrengths ?? [],
    certifications: profile?.certifications ?? [],
    languages: profile?.languages ?? [],
    availability: profile?.availability ?? null,
    rightToWork: profile?.rightToWork ?? null,
    experienceMonths: profile?.experienceMonths ?? 0,
    workExperience: Array.isArray(profile?.workExperience) ? profile!.workExperience as unknown[] : [],
    education: Array.isArray(profile?.education) ? profile!.education as unknown[] : [],
  }
}
