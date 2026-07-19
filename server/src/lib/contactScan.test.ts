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

  // Regression: the original scanner only matched the US 3-3-4 shape, so every
  // Spanish number — the ones that actually matter on a Gran Canaria
  // marketplace — passed straight through to the recipient.
  it('flags Spanish phone numbers', () => {
    expect(containsContactInfo('+34 622 100 201')).toBe(true)
    expect(containsContactInfo('622 100 201')).toBe(true)
    expect(containsContactInfo('llamame al 655443322')).toBe(true)
    expect(containsContactInfo('my number is 600 12 34 56')).toBe(true)
    expect(containsContactInfo('0034611300402')).toBe(true)
  })

  it('flags email addresses, including obfuscated ones', () => {
    expect(containsContactInfo('reach me at buyer@example.com')).toBe(true)
    expect(containsContactInfo('jane.doe+tag@sub.domain.co.uk')).toBe(true)
    expect(containsContactInfo('john at gmail dot com')).toBe(true)
    expect(containsContactInfo('maria (at) hotmail (dot) es')).toBe(true)
  })

  it('flags messaging apps and social handles', () => {
    expect(containsContactInfo('add me on whatsapp')).toBe(true)
    expect(containsContactInfo('https://wa.me/34555123456')).toBe(true)
    expect(containsContactInfo('WhatsApp me')).toBe(true) // case-insensitive
    expect(containsContactInfo('find me on telegram')).toBe(true)
    expect(containsContactInfo('instagram: mystore')).toBe(true)
    expect(containsContactInfo('follow @mystore_gc')).toBe(true)
  })

  it('flags invitations to move off-platform', () => {
    expect(containsContactInfo('just call me instead')).toBe(true)
    expect(containsContactInfo('email me and we can sort it')).toBe(true)
    expect(containsContactInfo('escríbeme y lo hablamos')).toBe(true)
  })

  it('allows ordinary marketplace chat', () => {
    expect(containsContactInfo('Is this still available?')).toBe(false)
    expect(containsContactInfo('I can collect on Saturday, does 2pm work?')).toBe(false)
    expect(containsContactInfo('Would you take 45 euros for it?')).toBe(false)
    expect(containsContactInfo('See you at 10:30 by the marina')).toBe(false)
  })

  // Prices and references must not be mistaken for phone numbers — property
  // listings routinely quote six- and seven-figure sums.
  it('does not flag prices, years or references', () => {
    expect(containsContactInfo('Asking 150000 euros, negotiable')).toBe(false)
    expect(containsContactInfo('It cost me 1200 new in 2024')).toBe(false)
    expect(containsContactInfo('Order ref GC-10000')).toBe(false)
    expect(containsContactInfo('The flat is 85 m2 and built in 1998')).toBe(false)
  })
})
