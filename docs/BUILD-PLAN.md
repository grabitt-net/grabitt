# Grabitt — Build Plan

Living document for planned/deferred work. Each section is a feature area with
its current state, scope, and phased tasks. Add new sections as they're agreed.

---

## Language & Translation (deferred — revisit)

**Goal:** a self-switching EN/ES site (with the wider language set already
scaffolded), including Spanish versions of banners that switch with the language.

### Current state (audit, 2026-09)
- i18n engine exists: `apps/web/lib/i18n.ts` — hand-maintained `TRANSLATIONS`
  dictionary for 8 languages incl. Spanish; `t('key')` lookup falls back to
  English then the raw key. ~401 phrases translated; `t()` used in ~1,112 places
  across ~31 files.
- Language stored in `localStorage.grabitt_lang`; changed today only via the
  Profile/Preferences locale picker, which saves the locale and **reloads**.
- `detectBrowserLang()` is written but **not wired up** — no auto-detection.
- **No footer language switcher.**
- **Not fully translated:** many components bypass `t()` and are hardcoded
  English (Footer, `InfoPage` footer pages, home hero/sections, ATS/recruitment
  — `EmployerDashboardContent`, `FindStaffPanel`, `ApplicantsKanban` —
  `ApplyModal`, `InboxClient`, `SeekerInvites`, delivery options, storefront
  editor, job-pack chooser, etc.).
- **User/admin content is untranslated by nature** (listing titles/descriptions,
  job adverts, help articles, CMS page content, category names, messages).

### Phase 1 — Switcher + banners (≈1 day)
- [ ] Auto-detect on first visit: on app bootstrap, if no `grabitt_lang`, set it
      from `detectBrowserLang()`.
- [ ] Footer language switcher (EN/ES toggle, or dropdown of the 8) → `setLanguage()`
      then reload (keep the reload approach; `t()` isn't reactive).
- [ ] Spanish banner variants that auto-switch, with fallback to the default when
      no Spanish image is set. Add an optional per-language image + a "Spanish
      version (optional)" upload in each admin editor:
      - `Banner.imageUrl` (ad placements / BannerSlot)
      - `HeroSlide.imageUrl` (homepage carousel)
      - `HomeCategory.heroBanner` (category + footer page heroes, incl. Grabitt Now)
      - `Storefront.bannerUrl` (shop pages)

### Phase 2 — Coverage pass (larger, iterative)
- [ ] Migrate hardcoded-English components onto `t()` and add Spanish strings,
      highest-traffic first: Footer → InfoPage/footer pages → home → checkout/apply
      → recruitment/ATS → hub/storefront.

### Phase 3 — Content translation (bigger decision, optional)
- [ ] Decide how to handle user/admin content: manual Spanish fields in the CMS,
      or an automatic machine-translation layer. Separate scoping.

### Notes / decisions
- Keep reload-on-switch unless we later decide the live-update refactor (a React
  context feeding every `t()`) is worth it.
- Wider language set (de/da/sv/nl/fr/pt) already has dictionary values; the
  switcher can expose all 8, but EN/ES is the priority.
