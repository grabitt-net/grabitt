// §10.2 — scan message text for contact info BEFORE sending, so buyers and
// sellers can't take deals off-platform. Pure + dependency-free so it can be
// unit tested in isolation (see messages.test.ts).

const CONTACT_PATTERNS = [
  /\b(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, // phone
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,             // email
  /wa\.me\/\d+|whatsapp/i,                                       // WhatsApp links
]

export function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some(p => p.test(text))
}
