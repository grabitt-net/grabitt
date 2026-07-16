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
