// §10.2 — scan message text for contact info BEFORE sending, so buyers and
// sellers can't take deals off-platform (which would strip the payment
// protection and lose the platform its fee). Pure + dependency-free so it can
// be unit tested in isolation (see contactScan.test.ts).

// Digits-based phone detection. The previous version only matched the US
// 3-3-4 shape, so Spanish numbers — the ones that actually matter here —
// sailed through: "622 100 201" and "+34 622 100 201" were both allowed.
//
// Instead of guessing at national formats, pull out anything that looks like a
// digit run (allowing the usual separators) and judge it on digit count.
// Spanish numbers are 9 digits; international ones are longer. Nine is high
// enough that prices ("150000"), years and postcodes don't trip it.
const DIGIT_RUN = /\+?\d[\d\s().\-/]{5,}\d/g
const MIN_PHONE_DIGITS = 9

function hasPhoneNumber(text: string): boolean {
  const runs = text.match(DIGIT_RUN)
  if (!runs) return false
  return runs.some(run => run.replace(/\D/g, '').length >= MIN_PHONE_DIGITS)
}

const CONTACT_PATTERNS = [
  // Plain email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  // Obfuscated email: "name at gmail dot com", "name (at) gmail (dot) com"
  /\b[a-z0-9._%+-]+\s*[([{]?\s*(?:at|arroba)\s*[)\]}]?\s*[a-z0-9.-]+\s*[([{]?\s*(?:dot|punto)\s*[)\]}]?\s*[a-z]{2,}\b/i,
  // Messaging apps by name or link
  /wa\.me\/|whatsapp|telegram|t\.me\/|signal\s*(?:app|me)?|viber|snapchat/i,
  // Social handles people use to move off-platform
  /(?:instagram|insta|facebook|fb|tiktok)\s*[:@/]|@[a-z0-9._]{3,}\b/i,
  // Explicit invitations to go off-platform
  /\b(?:call|text|ring|phone|whatsapp|email|mail)\s+me\b/i,
  /\b(?:ll[áa]mame|escr[íi]beme|mi\s+n[úu]mero|mi\s+tel[ée]fono)\b/i,
]

export function containsContactInfo(text: string): boolean {
  if (hasPhoneNumber(text)) return true
  return CONTACT_PATTERNS.some(p => p.test(text))
}
