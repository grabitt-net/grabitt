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
  // Header / nav / account actions
  'Search': { en: 'Search', es: 'Buscar', de: 'Suchen', da: 'Søg', sv: 'Sök', nl: 'Zoeken', fr: 'Rechercher', pt: 'Pesquisar' },
  'Search for anything on Grabitt…': { en: 'Search for anything on Grabitt…', es: 'Busca lo que sea en Grabitt…', de: 'Suche alles auf Grabitt…', da: 'Søg efter alt på Grabitt…', sv: 'Sök efter allt på Grabitt…', nl: 'Zoek naar alles op Grabitt…', fr: 'Cherchez tout sur Grabitt…', pt: 'Pesquise tudo no Grabitt…' },
  'Alerts': { en: 'Alerts', es: 'Alertas', de: 'Hinweise', da: 'Beskeder', sv: 'Aviseringar', nl: 'Meldingen', fr: 'Alertes', pt: 'Alertas' },
  'Saved': { en: 'Saved', es: 'Guardados', de: 'Gespeichert', da: 'Gemte', sv: 'Sparade', nl: 'Opgeslagen', fr: 'Enregistrés', pt: 'Guardados' },
  'Messages': { en: 'Messages', es: 'Mensajes', de: 'Nachrichten', da: 'Beskeder', sv: 'Meddelanden', nl: 'Berichten', fr: 'Messages', pt: 'Mensagens' },
  'Account': { en: 'Account', es: 'Cuenta', de: 'Konto', da: 'Konto', sv: 'Konto', nl: 'Account', fr: 'Compte', pt: 'Conta' },
  'Login': { en: 'Login', es: 'Entrar', de: 'Anmelden', da: 'Log ind', sv: 'Logga in', nl: 'Inloggen', fr: 'Connexion', pt: 'Entrar' },
  'Help': { en: 'Help', es: 'Ayuda', de: 'Hilfe', da: 'Hjælp', sv: 'Hjälp', nl: 'Hulp', fr: 'Aide', pt: 'Ajuda' },
  'Home': { en: 'Home', es: 'Inicio', de: 'Start', da: 'Hjem', sv: 'Hem', nl: 'Home', fr: 'Accueil', pt: 'Início' },
  'Jobs': { en: 'Jobs', es: 'Empleos', de: 'Jobs', da: 'Jobs', sv: 'Jobb', nl: 'Vacatures', fr: 'Emplois', pt: 'Empregos' },
  'Property': { en: 'Property', es: 'Inmuebles', de: 'Immobilien', da: 'Ejendom', sv: 'Fastigheter', nl: 'Vastgoed', fr: 'Immobilier', pt: 'Imóveis' },
  'Your local everything': { en: 'Your local everything', es: 'Tu todo local', de: 'Dein lokales Alles', da: 'Dit lokale alt', sv: 'Ditt lokala allt', nl: 'Jouw lokale alles', fr: 'Votre tout local', pt: 'O teu tudo local' },
  'Recommended for you': { en: 'Recommended for you', es: 'Recomendado para ti', de: 'Für dich empfohlen', da: 'Anbefalet til dig', sv: 'Rekommenderat för dig', nl: 'Aanbevolen voor jou', fr: 'Recommandé pour vous', pt: 'Recomendado para ti' },
  'Recently viewed': { en: 'Recently viewed', es: 'Vistos recientemente', de: 'Zuletzt angesehen', da: 'Senest set', sv: 'Nyligen visade', nl: 'Onlangs bekeken', fr: 'Vus récemment', pt: 'Vistos recentemente' },
  'Grabitt Guides': { en: 'Grabitt Guides', es: 'Guías Grabitt', de: 'Grabitt-Ratgeber', da: 'Grabitt-guides', sv: 'Grabitt-guider', nl: 'Grabitt-gidsen', fr: 'Guides Grabitt', pt: 'Guias Grabitt' },
  'See all': { en: 'See all', es: 'Ver todo', de: 'Alle ansehen', da: 'Se alle', sv: 'Se alla', nl: 'Alles zien', fr: 'Voir tout', pt: 'Ver tudo' },
  // Homepage quick actions + Near/search
  'Sponsorship': { en: 'Sponsorship', es: 'Patrocinio', de: 'Sponsoring', da: 'Sponsorat', sv: 'Sponsring', nl: 'Sponsoring', fr: 'Parrainage', pt: 'Patrocínio' },
  'Find Work': { en: 'Find Work', es: 'Buscar trabajo', de: 'Arbeit finden', da: 'Find arbejde', sv: 'Hitta jobb', nl: 'Werk zoeken', fr: 'Trouver un emploi', pt: 'Encontrar trabalho' },
  'Find Home': { en: 'Find Home', es: 'Buscar vivienda', de: 'Zuhause finden', da: 'Find bolig', sv: 'Hitta bostad', nl: 'Woning zoeken', fr: 'Trouver un logement', pt: 'Encontrar casa' },
  'Employers': { en: 'Employers', es: 'Empleadores', de: 'Arbeitgeber', da: 'Arbejdsgivere', sv: 'Arbetsgivare', nl: 'Werkgevers', fr: 'Employeurs', pt: 'Empregadores' },
  'Business': { en: 'Business', es: 'Empresa', de: 'Unternehmen', da: 'Erhverv', sv: 'Företag', nl: 'Zakelijk', fr: 'Entreprise', pt: 'Empresa' },
  'Near': { en: 'Near', es: 'Cerca', de: 'In der Nähe', da: 'Nær', sv: 'Nära', nl: 'Dichtbij', fr: 'Près', pt: 'Perto' },
  'Search...': { en: 'Search...', es: 'Buscar...', de: 'Suchen...', da: 'Søg...', sv: 'Sök...', nl: 'Zoeken...', fr: 'Rechercher...', pt: 'Pesquisar...' },
  // Listing detail
  'Description': { en: 'Description', es: 'Descripción', de: 'Beschreibung', da: 'Beskrivelse', sv: 'Beskrivning', nl: 'Beschrijving', fr: 'Description', pt: 'Descrição' },
  'Tags': { en: 'Tags', es: 'Etiquetas', de: 'Tags', da: 'Tags', sv: 'Taggar', nl: 'Labels', fr: 'Mots-clés', pt: 'Etiquetas' },
  'Location': { en: 'Location', es: 'Ubicación', de: 'Standort', da: 'Placering', sv: 'Plats', nl: 'Locatie', fr: 'Emplacement', pt: 'Localização' },
  'Similar listings': { en: 'Similar listings', es: 'Anuncios similares', de: 'Ähnliche Anzeigen', da: 'Lignende annoncer', sv: 'Liknande annonser', nl: 'Vergelijkbare advertenties', fr: 'Annonces similaires', pt: 'Anúncios semelhantes' },
  'Recently sold — similar items': { en: 'Recently sold — similar items', es: 'Vendidos recientemente — artículos similares', de: 'Kürzlich verkauft — ähnliche Artikel', da: 'Nyligt solgt — lignende varer', sv: 'Nyligen sålda — liknande varor', nl: 'Recent verkocht — vergelijkbare items', fr: 'Vendus récemment — articles similaires', pt: 'Vendidos recentemente — artigos semelhantes' },
  'Enquire': { en: 'Enquire', es: 'Consultar', de: 'Anfragen', da: 'Forespørg', sv: 'Fråga', nl: 'Informeer', fr: 'Renseigner', pt: 'Consultar' },
  'Apply / Enquire': { en: 'Apply / Enquire', es: 'Postularse / Consultar', de: 'Bewerben / Anfragen', da: 'Ansøg / Forespørg', sv: 'Ansök / Fråga', nl: 'Solliciteer / Informeer', fr: 'Postuler / Renseigner', pt: 'Candidatar / Consultar' },
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
