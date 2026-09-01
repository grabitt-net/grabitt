// Feature flags. Flip to re-activate a feature whose code is kept in place.

// Property-agent profile (standalone agent accounts that list property only).
// Steve paused this — the code stays, but every entry point (signup button,
// Sell chooser option, property Agent tab, Agent Hub, admin queue) is gated on
// this. Set to true to re-activate.
export const AGENTS_ENABLED = false
