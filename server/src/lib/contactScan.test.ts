import { describe, it, expect } from 'vitest'
import { containsContactInfo } from './contactScan'

// §10.2 — messages must never carry contact info between buyer and seller.
// This scanner runs before every send; a regression here would let people
// take deals off-platform, so it stays covered.
describe('containsContactInfo (§10.2 contact scan)', () => {
  it('flags phone numbers in various formats', () => {
    expect(containsContactInfo('call me on 555 123 4567')).toBe(true)
    expect(containsContactInfo('+34 555 123 4567')).toBe(true)
    expect(containsContactInfo('(555) 123-4567')).toBe(true)
    expect(containsContactInfo('555.123.4567')).toBe(true)
  })

  it('flags email addresses', () => {
    expect(containsContactInfo('reach me at buyer@example.com')).toBe(true)
    expect(containsContactInfo('jane.doe+tag@sub.domain.co.uk')).toBe(true)
  })

  it('flags WhatsApp references and links', () => {
    expect(containsContactInfo('add me on whatsapp')).toBe(true)
    expect(containsContactInfo('https://wa.me/34555123456')).toBe(true)
    expect(containsContactInfo('WhatsApp me')).toBe(true) // case-insensitive
  })

  it('allows ordinary marketplace chat', () => {
    expect(containsContactInfo('Is this still available?')).toBe(false)
    expect(containsContactInfo('I can collect on Saturday, does 2pm work?')).toBe(false)
    expect(containsContactInfo('Would you take 45 euros for it?')).toBe(false)
  })
})
