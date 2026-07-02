// ── Grabitt Multilingual — 8 languages ────────────────────────────────────────
export const LANGS = ['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt'] as const
export type Lang = typeof LANGS[number]

const LANG_LABELS: Record<Lang, string> = {
  en: '🇬🇧 English', es: '🇪🇸 Español', de: '🇩🇪 Deutsch',
  da: '🇩🇰 Dansk', sv: '🇸🇪 Svenska', nl: '🇳🇱 Nederlands',
  fr: '🇫🇷 Français', pt: '🇵🇹 Português',
}

export const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  'Browse': { en: 'Browse', es: 'Explorar', de: 'Stöbern', da: 'Gennemse', sv: 'Bläddra', nl: 'Bladeren', fr: 'Parcourir', pt: 'Navegar' },
  'Sell': { en: 'Sell', es: 'Vender', de: 'Verkaufen', da: 'Sælg', sv: 'Sälj', nl: 'Verkopen', fr: 'Vendre', pt: 'Vender' },
  'Search Gran Canaria...': { en: 'Search Gran Canaria...', es: 'Buscar en Gran Canaria...', de: 'Gran Canaria suchen...', da: 'Søg Gran Canaria...', sv: 'Sök Gran Canaria...', nl: 'Zoek Gran Canaria...', fr: 'Chercher Gran Canaria...', pt: 'Pesquisar Gran Canaria...' },
  'Buy Now': { en: 'Buy Now', es: 'Comprar ahora', de: 'Jetzt kaufen', da: 'Køb nu', sv: 'Köp nu', nl: 'Nu kopen', fr: 'Acheter maintenant', pt: 'Comprar agora' },
  'Make Offer': { en: 'Make Offer', es: 'Hacer oferta', de: 'Angebot machen', da: 'Giv tilbud', sv: 'Ge bud', nl: 'Bod doen', fr: 'Faire une offre', pt: 'Fazer oferta' },
  'Log in': { en: 'Log in', es: 'Iniciar sesión', de: 'Anmelden', da: 'Log ind', sv: 'Logga in', nl: 'Inloggen', fr: 'Se connecter', pt: 'Entrar' },
  'Register': { en: 'Register', es: 'Registrarse', de: 'Registrieren', da: 'Tilmeld', sv: 'Registrera', nl: 'Registreren', fr: "S'inscrire", pt: 'Registar' },
  'Featured': { en: 'Featured', es: 'Destacado', de: 'Empfohlen', da: 'Fremhævet', sv: 'Utvald', nl: 'Uitgelicht', fr: 'En vedette', pt: 'Destaque' },
  'Just Listed': { en: 'Just Listed', es: 'Recién publicado', de: 'Neu eingestellt', da: 'Netop oprettet', sv: 'Precis listad', nl: 'Zojuist geplaatst', fr: 'Vient d\'être listé', pt: 'Recém-listado' },
  'Near Me': { en: 'Near Me', es: 'Cerca de mí', de: 'In meiner Nähe', da: 'Tæt på mig', sv: 'Nära mig', nl: 'Dichtbij mij', fr: 'Près de moi', pt: 'Perto de mim' },
  'Contact': { en: 'Contact', es: 'Contactar', de: 'Kontakt', da: 'Kontakt', sv: 'Kontakt', nl: 'Contact', fr: 'Contact', pt: 'Contacto' },
  'Collection': { en: 'Collection', es: 'Recogida', de: 'Abholung', da: 'Afhentning', sv: 'Upphämtning', nl: 'Ophalen', fr: 'Enlèvement', pt: 'Recolha' },
  'Delivery': { en: 'Delivery', es: 'Entrega', de: 'Lieferung', da: 'Levering', sv: 'Leverans', nl: 'Bezorging', fr: 'Livraison', pt: 'Entrega' },
  'Condition': { en: 'Condition', es: 'Condición', de: 'Zustand', da: 'Stand', sv: 'Skick', nl: 'Staat', fr: 'État', pt: 'Estado' },
  'Price': { en: 'Price', es: 'Precio', de: 'Preis', da: 'Pris', sv: 'Pris', nl: 'Prijs', fr: 'Prix', pt: 'Preço' },
  'Free': { en: 'Free', es: 'Gratis', de: 'Kostenlos', da: 'Gratis', sv: 'Gratis', nl: 'Gratis', fr: 'Gratuit', pt: 'Grátis' },
  'Save': { en: 'Save', es: 'Guardar', de: 'Speichern', da: 'Gem', sv: 'Spara', nl: 'Opslaan', fr: 'Sauvegarder', pt: 'Guardar' },
  'Report': { en: 'Report', es: 'Denunciar', de: 'Melden', da: 'Rapporter', sv: 'Rapportera', nl: 'Rapporteren', fr: 'Signaler', pt: 'Denunciar' },
  'Share': { en: 'Share', es: 'Compartir', de: 'Teilen', da: 'Del', sv: 'Dela', nl: 'Delen', fr: 'Partager', pt: 'Partilhar' },
  'Loading...': { en: 'Loading...', es: 'Cargando...', de: 'Lädt...', da: 'Indlæser...', sv: 'Laddar...', nl: 'Laden...', fr: 'Chargement...', pt: 'A carregar...' },
  'No results found': { en: 'No results found', es: 'No se encontraron resultados', de: 'Keine Ergebnisse', da: 'Ingen resultater', sv: 'Inga resultat', nl: 'Geen resultaten', fr: 'Aucun résultat', pt: 'Sem resultados' },
}

let _lang: Lang = 'en'

export function detectBrowserLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const nav = navigator.language?.slice(0, 2) as Lang
  return LANGS.includes(nav) ? nav : 'en'
}

export function setLanguage(lang: Lang) {
  _lang = lang
  if (typeof window !== 'undefined') localStorage.setItem('grabitt_lang', lang)
}

export function getLanguage(): Lang {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('grabitt_lang') as Lang
    if (stored && LANGS.includes(stored)) return stored
  }
  return _lang
}

export function t(key: string): string {
  const lang = getLanguage()
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.['en'] ?? key
}

export function langLabel(lang: Lang): string {
  return LANG_LABELS[lang]
}
