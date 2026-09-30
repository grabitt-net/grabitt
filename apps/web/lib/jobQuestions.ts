// An employer-defined screening question attached to a job listing.
export type JobQuestionType = 'short' | 'long' | 'choice' | 'boolean' | 'number'

export type JobQuestion = {
  id: string
  label: string
  type: JobQuestionType
  required: boolean
  options?: string[]
}

export const QUESTION_TYPE_LABEL: Record<JobQuestionType, string> = {
  short: 'Short text',
  long: 'Paragraph',
  choice: 'Multiple choice',
  boolean: 'Yes / No',
  number: 'Number',
}

// Ready-made screening questions the advertiser can drop in with one tap, then
// edit or mark required as they like. Common checks for hiring in the Canaries.
export const PRESET_QUESTIONS: { label: string; type: JobQuestionType; options?: string[] }[] = [
  { label: 'Do you have a full and valid driving licence?', type: 'boolean' },
  { label: 'Do you have authorisation to work in Spain?', type: 'boolean' },
  { label: 'Do you have an NIE / TIE number?', type: 'boolean' },
  { label: 'Do you have your own vehicle?', type: 'boolean' },
  { label: 'Are you available for weekend and evening shifts?', type: 'boolean' },
  { label: 'How many years of experience do you have in this role?', type: 'number' },
  { label: 'When are you available to start?', type: 'short' },
  { label: 'What are your salary expectations?', type: 'short' },
  { label: 'What languages do you speak, and to what level?', type: 'long' },
  { label: 'Do you hold any relevant certifications or qualifications for this role?', type: 'long' },
]
