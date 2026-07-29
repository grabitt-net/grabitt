# WhatsApp Blast — investigation & spec (NOT YET LIVE)

The **WhatsApp blast** add-on is offered and billed as a monthly business add-on
(`whatsapp_blast` in `BUSINESS_ADDONS`), but the **sending engine is not built**.
It is flagged `comingSoon: true` and the UI shows a "Coming soon" badge. This
document is the plan to approve before switching it on.

## What it is
Lets a business broadcast a promotional message (offer, new stock, event) to its
**opted-in** customers on WhatsApp.

## Why it can't just "send"
WhatsApp is not SMS. Sending business-initiated marketing requires the **WhatsApp
Business Platform** and has hard rules:

- **Provider / API.** Either Meta's **Cloud API** directly, or a BSP such as
  **Twilio** / **360dialog**. Cloud API is cheapest (no reseller markup) but needs
  more setup; Twilio is fastest to wire but adds per-message fees on top of Meta's.
- **WhatsApp Business Account (WABA)** + a **verified sender phone number** +
  Meta **Business Verification**.
- **Message templates.** Marketing broadcasts must use a **pre-approved template**
  (category = *Marketing*). Free-text marketing outside the 24-hour customer-service
  window is not allowed. Each template needs Meta approval (hours–days).
- **Opt-in is mandatory.** We may only message users who explicitly opted in to
  WhatsApp marketing from this business. We must capture, timestamp and store that
  consent, and honour STOP/opt-out.
- **Per-conversation pricing.** Meta bills per 24-hour *conversation*, priced by
  country + category (marketing is the priciest tier). So the €29/mo add-on must
  either cap volume or meter overage against credits.

## Proposed build (phase 2)
1. **Consent capture.** Add a WhatsApp-marketing opt-in checkbox on customer-facing
   touch-points (checkout, follow, storefront) → store `WhatsAppOptIn { userId,
   businessId, phone, consentAt, revokedAt }`.
2. **Provider.** Start with **Meta Cloud API** (needs: WABA id, phone number id,
   permanent access token, app secret — set as server env vars). Fall back to
   Twilio only if onboarding stalls.
3. **Templates.** Seed 2–3 marketing templates ("New stock", "Special offer",
   "Event") and submit for approval; store approved template ids.
4. **Blast composer** (business dashboard): pick template, fill variables, preview,
   choose audience (own opted-in customers only), see estimated cost, send.
5. **Send worker.** Queue + rate-limit sends via the provider; record delivery /
   read receipts; expose stats.
6. **Billing.** €29/mo includes an allowance of N conversations; overage draws
   listing/marketing credits. Meter per conversation from webhook receipts.
7. **Compliance.** Enforce opt-in on every recipient, honour opt-out, retain
   consent records, respect per-country quality tiers.

## Credentials needed from the business owner
- Meta Business Manager access + Business Verification
- A dedicated phone number for the WABA (not already on a personal WhatsApp)
- Approval of the marketing templates and the opt-in wording

Until the above is approved and configured, `whatsapp_blast` bills but the composer
shows "Coming soon — we'll email you when your WhatsApp sender is live."
