// Suitability scoring — computed once, at apply time, from the candidate's
// profile against the advert.
//
// Two rules govern this:
//   1. The score is shown to the EMPLOYER ONLY. A candidate who sees a number
//      will contest how it was reached, and we are not the ones hiring.
//   2. It ranks, it does not filter. Nothing is rejected automatically, and the
//      breakdown travels with the score so an employer can see what drove it
//      rather than treating it as a verdict. The hiring decision — and the
//      responsibility for it — stays with them.
//
// Deliberately excluded: anything that could stand in for age, nationality,
// sex or health. Only skills, experience, language, sector and availability.

export type SuitabilityInput = {
  job: {
    sector?: string | null
    skills?: string[]
    jobTitle?: string | null
    type?: string | null
  }
  candidate: {
    sectors?: string[]
    sector?: string | null
    roles?: string[]
    skills?: string[]
    languages?: string[]
    experienceMonths?: number
    availability?: string | null
    hours?: string[]
  }
}

export type SuitabilityResult = {
  score: number                       // 0–100
  notes: { factor: string; points: number; of: number; detail: string }[]
}

const norm = (s: string) => s.toLowerCase().trim()

export function scoreSuitability({ job, candidate }: SuitabilityInput): SuitabilityResult {
  const notes: SuitabilityResult['notes'] = []

  // ── Sector match (25) ──────────────────────────────────────────────────────
  const candSectors = (candidate.sectors?.length ? candidate.sectors : [candidate.sector].filter(Boolean) as string[]).map(norm)
  const jobSector = job.sector ? norm(job.sector) : null
  let sectorPts = 0
  if (!jobSector) { sectorPts = 15; notes.push({ factor: 'Sector', points: 15, of: 25, detail: 'Advert has no sector set — scored neutral' }) }
  else if (candSectors.includes(jobSector)) { sectorPts = 25; notes.push({ factor: 'Sector', points: 25, of: 25, detail: `Works in ${job.sector}` }) }
  else { notes.push({ factor: 'Sector', points: 0, of: 25, detail: `Listed for ${candSectors.join(', ') || 'no sector'}, advert is ${job.sector}` }) }

  // ── Skills overlap (30) ────────────────────────────────────────────────────
  const wanted = (job.skills ?? []).map(norm).filter(Boolean)
  const has = [...(candidate.skills ?? []), ...(candidate.roles ?? [])].map(norm)
  let skillPts = 0
  if (wanted.length === 0) {
    skillPts = 18
    notes.push({ factor: 'Skills', points: 18, of: 30, detail: 'Advert lists no required skills — scored neutral' })
  } else {
    const matched = wanted.filter(w => has.some(h => h.includes(w) || w.includes(h)))
    skillPts = Math.round((matched.length / wanted.length) * 30)
    notes.push({ factor: 'Skills', points: skillPts, of: 30, detail: `${matched.length} of ${wanted.length} required skills: ${matched.join(', ') || 'none'}` })
  }

  // ── Experience (25) ────────────────────────────────────────────────────────
  const months = candidate.experienceMonths ?? 0
  const expPts = months >= 60 ? 25 : months >= 36 ? 21 : months >= 24 ? 17 : months >= 12 ? 13 : months >= 6 ? 8 : months > 0 ? 4 : 0
  notes.push({ factor: 'Experience', points: expPts, of: 25, detail: months >= 12 ? `${Math.floor(months / 12)} years` : `${months} months` })

  // ── Languages (10) ─────────────────────────────────────────────────────────
  const langs = candidate.languages ?? []
  const langPts = langs.length >= 3 ? 10 : langs.length === 2 ? 7 : langs.length === 1 ? 4 : 0
  notes.push({ factor: 'Languages', points: langPts, of: 10, detail: langs.join(', ') || 'None listed' })

  // ── Availability (10) ──────────────────────────────────────────────────────
  const avail = candidate.availability ? norm(candidate.availability) : ''
  const availPts = avail.includes('immediate') ? 10 : avail.includes('1 month') ? 7 : avail.includes('3 month') ? 4 : avail ? 2 : 0
  notes.push({ factor: 'Availability', points: availPts, of: 10, detail: candidate.availability || 'Not stated' })

  const score = Math.max(0, Math.min(100, sectorPts + skillPts + expPts + langPts + availPts))
  return { score, notes }
}
