// Key skills offered per sector, and the language levels a candidate can claim.
//
// Roles say what job you do; key skills say what you can actually do inside it,
// which is what an employer filters on and what suitability scores against.
// Kept as data so the seeker form, Find Staff and the scorer all read the same
// list rather than each inventing its own.

export const SECTOR_SKILLS: Record<string, string[]> = {
  Hospitality: ['Cocktails', 'Coffee / barista', 'Table service', 'Till & cash handling', 'Food safety',
    'Kitchen prep', 'Grill', 'Pastry', 'Wine service', 'Rota planning', 'Stock control', 'Complaint handling'],
  Office: ['Microsoft Office', 'Google Workspace', 'Diary management', 'Minute taking', 'Invoicing',
    'Payroll', 'Bookkeeping', 'Data entry', 'CRM systems', 'Switchboard', 'Filing & records'],
  Legal: ['Contract drafting', 'Case management', 'Legal research', 'Court filing', 'Client interviewing',
    'Compliance checks', 'Conveyancing', 'Litigation support', 'Dictation / transcription'],
  Retail: ['Visual merchandising', 'EPOS systems', 'Stock takes', 'Loss prevention', 'Upselling',
    'Returns & refunds', 'Window displays', 'Deliveries & goods-in', 'Customer complaints'],
  Construction: ['Plastering', 'Tiling', 'Bricklaying', 'Carpentry', 'Electrics', 'Plumbing', 'Painting',
    'Scaffolding', 'Plant machinery', 'Reading plans', 'Health & safety', 'Site supervision'],
  Healthcare: ['Personal care', 'Medication support', 'Manual handling', 'First aid', 'Safeguarding',
    'Care planning', 'Dementia care', 'Physiotherapy', 'Phlebotomy', 'Record keeping'],
  Education: ['Lesson planning', 'Classroom management', 'SEN support', 'Exam invigilation', 'Safeguarding',
    'Early years', 'Tutoring', 'Curriculum design', 'Parent liaison'],
  Technology: ['JavaScript', 'Python', 'React', 'SQL', 'WordPress', 'Networking', 'Cybersecurity',
    'IT support', 'Cloud (AWS/Azure)', 'UI/UX design', 'SEO', 'Data analysis'],
  Marine: ['RYA certified', 'Powerboat handling', 'Sailing', 'Diving (PADI)', 'Engine maintenance',
    'Navigation', 'Sea survival', 'VHF radio', 'Guest handling', 'Deck work'],
  Property: ['Deep cleaning', 'Laundry & linen', 'Pool maintenance', 'Gardening', 'Key holding',
    'Guest check-in', 'Maintenance & repairs', 'Inventory checks', 'Driving'],
  'Sales & Marketing': ['Lead generation', 'Cold calling', 'Account management', 'Social media',
    'Email campaigns', 'Copywriting', 'Google Ads', 'Analytics', 'Negotiation', 'CRM systems'],
}

// Skills that apply whatever the sector.
export const GENERAL_SKILLS = ['Customer service', 'Driving licence', 'Own transport', 'Cash handling',
  'Team leadership', 'Problem solving', 'Time keeping', 'Manual handling']

export const LANGUAGE_LEVELS = ['Basic', 'Conversational', 'Fluent', 'Native'] as const
export type LanguageLevel = typeof LANGUAGE_LEVELS[number]

export type LanguageEntry = { language: string; level: LanguageLevel }

/** Skills on offer for the sectors a candidate has chosen, deduped. */
export function skillsForSectors(sectors: string[]): string[] {
  const out = new Set<string>()
  for (const s of sectors) for (const sk of SECTOR_SKILLS[s] ?? []) out.add(sk)
  for (const g of GENERAL_SKILLS) out.add(g)
  return [...out]
}

/** "English (Fluent)" — the flat form stored on languages[] and used in the CV. */
export function formatLanguage(e: LanguageEntry): string {
  return `${e.language} (${e.level})`
}

/** Parse the flat form back into structured entries. */
export function parseLanguages(flat: string[]): LanguageEntry[] {
  return flat.map(v => {
    const m = /^(.*?)\s*\((.*?)\)\s*$/.exec(v)
    const level = (LANGUAGE_LEVELS as readonly string[]).includes(m?.[2] ?? '') ? (m![2] as LanguageLevel) : 'Conversational'
    return { language: (m?.[1] ?? v).trim(), level }
  })
}
