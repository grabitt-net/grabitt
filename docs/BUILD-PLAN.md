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

### Phase 1 — Switcher + banners ✅ DONE (2026-09-14)
- [x] Auto-detect on first visit (`LangBoot` in the root layout; reloads once for
      a non-EN browser, explicit choices untouched).
- [x] Footer language switcher (`LanguageSwitcher`, all 8 langs, EN/ES first) →
      `setLanguage()` + reload.
- [x] Spanish banner variants that auto-switch, fallback to default when no ES
      image is set, via `pickBannerImage(base, es)`:
      - `Banner.imageUrlEs` (ad placements / BannerSlot)
      - `HeroSlide.imageUrlEs` (homepage carousel / ParallaxHeader)
      - `HomeCategory.heroBannerEs` (category + footer page heroes, incl. Grabitt Now)
      - `Storefront.bannerUrlEs` (shop pages)
      Admin ES upload fields added in BannersView, HeroSlidesEditor, CategoriesView
      (page + category hero) and the storefront editor.

### Phase 2 — Coverage pass (interactive UI) ✅ DONE (2026-09-14)
Migrated hardcoded-English components onto `t()` and added Spanish strings.
TRANSLATIONS entries now need only `en` (+ `es`); other langs fall back.
- [x] Footer (columns, links, guarantee line, copyright)
- [x] Home strips (Featured / Just Listed / See all) + Trust strip
- [x] Selling flow: listing edit form (fully) + Sell wizard steps (photos,
      details, price, delivery, upgrades, success). Remaining in-wizard bits:
      best-practice guide items and a couple of `<strong>`-embedded lines.
- [x] Apply / checkout flow (ApplyModal fully; checkout & make-offer panels
      completed — buyer-type, delivery labels, order summary, escrow copy)
- [x] Recruitment / ATS (EmployerDashboardContent, FindStaffPanel,
      ApplicantsKanban) — cards, filters, stage board, candidate search &
      unlock flow, toasts/dialogs. Removed stray arrow glyphs from buttons.
- [x] Hub / storefront editor (StorefrontEditor, MyHub) + public shop page
      (templates, branding, categories, featured, policies, follow/share,
      owner controls) — MyHub was already translated bar account-type labels
- [→] Footer content pages (InfoPage: About, Why, Pricing, Delivery, Terms,
      Guarantee, Scam Centre, Dos, Economic) — **deferred to Phase 3**: these
      are long-form bodies best owned as CMS Spanish content, not dictionary
      strings (decision 2026-09-14).

### Phase 3 — Content translation (bigger decision, optional)
- [ ] Decide how to handle user/admin content: manual Spanish fields in the CMS,
      or an automatic machine-translation layer. Separate scoping.
- [ ] Footer content pages (InfoPage long-form bodies) — moved here from Phase 2;
      handle via the CMS Spanish-content mechanism decided above rather than the
      `t()` dictionary. The page chrome (nav, shared headings) is already on `t()`.

### Notes / decisions
- Keep reload-on-switch unless we later decide the live-update refactor (a React
  context feeding every `t()`) is worth it.
- Wider language set (de/da/sv/nl/fr/pt) already has dictionary values; the
  switcher can expose all 8, but EN/ES is the priority.
