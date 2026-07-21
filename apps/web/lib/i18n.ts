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
  // Auth panel (login / register)
  'Buy, sell & connect on the island': { en: 'Buy, sell & connect on the island', es: 'Compra, vende y conecta en la isla', de: 'Kaufen, verkaufen & vernetzen auf der Insel', da: 'Køb, sælg & forbind på øen', sv: 'Köp, sälj & anslut på ön', nl: 'Koop, verkoop & verbind op het eiland', fr: 'Achetez, vendez et connectez sur l\'île', pt: 'Compra, vende e conecta na ilha' },
  'Continue with Google': { en: 'Continue with Google', es: 'Continuar con Google', de: 'Mit Google fortfahren', da: 'Fortsæt med Google', sv: 'Fortsätt med Google', nl: 'Doorgaan met Google', fr: 'Continuer avec Google', pt: 'Continuar com Google' },
  'or': { en: 'or', es: 'o', de: 'oder', da: 'eller', sv: 'eller', nl: 'of', fr: 'ou', pt: 'ou' },
  'Log in with email': { en: 'Log in with email', es: 'Entrar con correo', de: 'Mit E-Mail anmelden', da: 'Log ind med e-mail', sv: 'Logga in med e-post', nl: 'Inloggen met e-mail', fr: 'Se connecter par e-mail', pt: 'Entrar com e-mail' },
  'Create account': { en: 'Create account', es: 'Crear cuenta', de: 'Konto erstellen', da: 'Opret konto', sv: 'Skapa konto', nl: 'Account aanmaken', fr: 'Créer un compte', pt: 'Criar conta' },
  'Create Account': { en: 'Create Account', es: 'Crear cuenta', de: 'Konto erstellen', da: 'Opret konto', sv: 'Skapa konto', nl: 'Account aanmaken', fr: 'Créer un compte', pt: 'Criar conta' },
  'Email address': { en: 'Email address', es: 'Correo electrónico', de: 'E-Mail-Adresse', da: 'E-mailadresse', sv: 'E-postadress', nl: 'E-mailadres', fr: 'Adresse e-mail', pt: 'Endereço de e-mail' },
  'Password': { en: 'Password', es: 'Contraseña', de: 'Passwort', da: 'Adgangskode', sv: 'Lösenord', nl: 'Wachtwoord', fr: 'Mot de passe', pt: 'Palavra-passe' },
  'Forgot password?': { en: 'Forgot password?', es: '¿Olvidaste tu contraseña?', de: 'Passwort vergessen?', da: 'Glemt adgangskode?', sv: 'Glömt lösenord?', nl: 'Wachtwoord vergeten?', fr: 'Mot de passe oublié ?', pt: 'Esqueceste a palavra-passe?' },
  'Log In': { en: 'Log In', es: 'Entrar', de: 'Anmelden', da: 'Log ind', sv: 'Logga in', nl: 'Inloggen', fr: 'Se connecter', pt: 'Entrar' },
  'No account?': { en: 'No account?', es: '¿Sin cuenta?', de: 'Kein Konto?', da: 'Ingen konto?', sv: 'Inget konto?', nl: 'Geen account?', fr: 'Pas de compte ?', pt: 'Sem conta?' },
  'Create one': { en: 'Create one', es: 'Crea una', de: 'Erstellen', da: 'Opret en', sv: 'Skapa ett', nl: 'Maak er een', fr: 'Créez-en un', pt: 'Cria uma' },
  'Full name': { en: 'Full name', es: 'Nombre completo', de: 'Vollständiger Name', da: 'Fulde navn', sv: 'Fullständigt namn', nl: 'Volledige naam', fr: 'Nom complet', pt: 'Nome completo' },
  'Phone (optional)': { en: 'Phone (optional)', es: 'Teléfono (opcional)', de: 'Telefon (optional)', da: 'Telefon (valgfrit)', sv: 'Telefon (valfritt)', nl: 'Telefoon (optioneel)', fr: 'Téléphone (facultatif)', pt: 'Telefone (opcional)' },
  'Create password (min 8 chars)': { en: 'Create password (min 8 chars)', es: 'Crear contraseña (mín. 8 caracteres)', de: 'Passwort erstellen (min. 8 Zeichen)', da: 'Opret adgangskode (min. 8 tegn)', sv: 'Skapa lösenord (min 8 tecken)', nl: 'Wachtwoord aanmaken (min. 8 tekens)', fr: 'Créer un mot de passe (min. 8 caractères)', pt: 'Criar palavra-passe (mín. 8 caracteres)' },
  "Welcome back to Gran Canaria's marketplace.": { en: "Welcome back to Gran Canaria's marketplace.", es: 'Bienvenido de nuevo al mercado de Gran Canaria.', de: 'Willkommen zurück auf dem Marktplatz von Gran Canaria.', da: 'Velkommen tilbage til Gran Canarias markedsplads.', sv: 'Välkommen tillbaka till Gran Canarias marknad.', nl: 'Welkom terug op de marktplaats van Gran Canaria.', fr: 'Bon retour sur le marché de Gran Canaria.', pt: 'Bem-vindo de volta ao mercado de Gran Canaria.' },
  // Preferences / account hub
  'My interests': { en: 'My interests', es: 'Mis intereses', de: 'Meine Interessen', da: 'Mine interesser', sv: 'Mina intressen', nl: 'Mijn interesses', fr: 'Mes centres d\'intérêt', pt: 'Os meus interesses' },
  'Language': { en: 'Language', es: 'Idioma', de: 'Sprache', da: 'Sprog', sv: 'Språk', nl: 'Taal', fr: 'Langue', pt: 'Idioma' },
  'Save preferences': { en: 'Save preferences', es: 'Guardar preferencias', de: 'Einstellungen speichern', da: 'Gem indstillinger', sv: 'Spara inställningar', nl: 'Voorkeuren opslaan', fr: 'Enregistrer les préférences', pt: 'Guardar preferências' },
  'Saving…': { en: 'Saving…', es: 'Guardando…', de: 'Speichern…', da: 'Gemmer…', sv: 'Sparar…', nl: 'Opslaan…', fr: 'Enregistrement…', pt: 'A guardar…' },
  'My Sales': { en: 'My Sales', es: 'Mis ventas', de: 'Meine Verkäufe', da: 'Mine salg', sv: 'Mina försäljningar', nl: 'Mijn verkopen', fr: 'Mes ventes', pt: 'As minhas vendas' },
  'My Listings': { en: 'My Listings', es: 'Mis anuncios', de: 'Meine Anzeigen', da: 'Mine annoncer', sv: 'Mina annonser', nl: 'Mijn advertenties', fr: 'Mes annonces', pt: 'Os meus anúncios' },
  'My Purchases & Handovers': { en: 'My Purchases & Handovers', es: 'Mis compras y entregas', de: 'Meine Käufe & Übergaben', da: 'Mine køb & overdragelser', sv: 'Mina köp & överlämningar', nl: 'Mijn aankopen & overdrachten', fr: 'Mes achats et remises', pt: 'As minhas compras e entregas' },
  'Log out': { en: 'Log out', es: 'Cerrar sesión', de: 'Abmelden', da: 'Log ud', sv: 'Logga ut', nl: 'Uitloggen', fr: 'Se déconnecter', pt: 'Terminar sessão' },
  // Make an offer panel
  'Your offer amount (€)': { en: 'Your offer amount (€)', es: 'Importe de tu oferta (€)', de: 'Dein Angebotsbetrag (€)', da: 'Dit tilbudsbeløb (€)', sv: 'Ditt budbelopp (€)', nl: 'Jouw bodbedrag (€)', fr: 'Montant de votre offre (€)', pt: 'Valor da tua oferta (€)' },
  'Message to seller (optional)': { en: 'Message to seller (optional)', es: 'Mensaje al vendedor (opcional)', de: 'Nachricht an Verkäufer (optional)', da: 'Besked til sælger (valgfrit)', sv: 'Meddelande till säljare (valfritt)', nl: 'Bericht aan verkoper (optioneel)', fr: 'Message au vendeur (facultatif)', pt: 'Mensagem ao vendedor (opcional)' },
  'Send Offer': { en: 'Send Offer', es: 'Enviar oferta', de: 'Angebot senden', da: 'Send tilbud', sv: 'Skicka bud', nl: 'Bod versturen', fr: 'Envoyer l\'offre', pt: 'Enviar oferta' },
  'Listed at': { en: 'Listed at', es: 'Precio', de: 'Angeboten für', da: 'Prissat til', sv: 'Listat till', nl: 'Vermeld voor', fr: 'Au prix de', pt: 'Anunciado a' },
  'Offers are binding if accepted. Payment is processed via Stripe escrow.': { en: 'Offers are binding if accepted. Payment is processed via Stripe escrow.', es: 'Las ofertas son vinculantes si se aceptan. El pago se procesa mediante depósito de Stripe.', de: 'Angebote sind bei Annahme verbindlich. Zahlung erfolgt über Stripe-Treuhand.', da: 'Tilbud er bindende ved accept. Betaling behandles via Stripe-deponering.', sv: 'Bud är bindande om de accepteras. Betalning sker via Stripe-deposition.', nl: 'Biedingen zijn bindend indien geaccepteerd. Betaling via Stripe-escrow.', fr: 'Les offres sont contraignantes si acceptées. Paiement via séquestre Stripe.', pt: 'As ofertas são vinculativas se aceites. Pagamento processado via garantia Stripe.' },
  // Sell / create-listing panel
  'Title': { en: 'Title', es: 'Título', de: 'Titel', da: 'Titel', sv: 'Titel', nl: 'Titel', fr: 'Titre', pt: 'Título' },
  'Department': { en: 'Department', es: 'Departamento', de: 'Kategorie', da: 'Kategori', sv: 'Kategori', nl: 'Categorie', fr: 'Catégorie', pt: 'Departamento' },
  'Price (€)': { en: 'Price (€)', es: 'Precio (€)', de: 'Preis (€)', da: 'Pris (€)', sv: 'Pris (€)', nl: 'Prijs (€)', fr: 'Prix (€)', pt: 'Preço (€)' },
  'Quantity available': { en: 'Quantity available', es: 'Cantidad disponible', de: 'Verfügbare Menge', da: 'Antal tilgængeligt', sv: 'Tillgängligt antal', nl: 'Beschikbare hoeveelheid', fr: 'Quantité disponible', pt: 'Quantidade disponível' },
  'This item is free / give-away': { en: 'This item is free / give-away', es: 'Este artículo es gratis / regalo', de: 'Dieser Artikel ist kostenlos / Verschenken', da: 'Denne vare er gratis / foræres væk', sv: 'Denna vara är gratis / skänkes', nl: 'Dit item is gratis / weggeefactie', fr: 'Cet article est gratuit / à donner', pt: 'Este artigo é grátis / oferta' },
  'Add photos': { en: 'Add photos', es: 'Añadir fotos', de: 'Fotos hinzufügen', da: 'Tilføj billeder', sv: 'Lägg till bilder', nl: 'Foto\'s toevoegen', fr: 'Ajouter des photos', pt: 'Adicionar fotos' },
  'Item details': { en: 'Item details', es: 'Detalles del artículo', de: 'Artikeldetails', da: 'Varedetaljer', sv: 'Varuuppgifter', nl: 'Itemdetails', fr: 'Détails de l\'article', pt: 'Detalhes do artigo' },
  'Price & options': { en: 'Price & options', es: 'Precio y opciones', de: 'Preis & Optionen', da: 'Pris & valg', sv: 'Pris & alternativ', nl: 'Prijs & opties', fr: 'Prix et options', pt: 'Preço e opções' },
  'Preview': { en: 'Preview', es: 'Vista previa', de: 'Vorschau', da: 'Forhåndsvisning', sv: 'Förhandsvisning', nl: 'Voorbeeld', fr: 'Aperçu', pt: 'Pré-visualização' },
  'Continue': { en: 'Continue', es: 'Continuar', de: 'Weiter', da: 'Fortsæt', sv: 'Fortsätt', nl: 'Doorgaan', fr: 'Continuer', pt: 'Continuar' },
  'Publish Listing': { en: 'Publish Listing', es: 'Publicar anuncio', de: 'Anzeige veröffentlichen', da: 'Udgiv annonce', sv: 'Publicera annons', nl: 'Advertentie plaatsen', fr: 'Publier l\'annonce', pt: 'Publicar anúncio' },
  // Listing detail panel
  'views today': { en: 'views today', es: 'visitas hoy', de: 'Aufrufe heute', da: 'visninger i dag', sv: 'visningar idag', nl: 'weergaven vandaag', fr: 'vues aujourd\'hui', pt: 'visualizações hoje' },
  'watching': { en: 'watching', es: 'siguiendo', de: 'beobachten', da: 'følger', sv: 'bevakar', nl: 'volgen', fr: 'suivent', pt: 'a seguir' },
  'sales': { en: 'sales', es: 'ventas', de: 'Verkäufe', da: 'salg', sv: 'försäljningar', nl: 'verkopen', fr: 'ventes', pt: 'vendas' },
  'Message': { en: 'Message', es: 'Mensaje', de: 'Nachricht', da: 'Besked', sv: 'Meddelande', nl: 'Bericht', fr: 'Message', pt: 'Mensagem' },
  'Protected by the Grabitt Guarantee · Funds held until you confirm': { en: 'Protected by the Grabitt Guarantee · Funds held until you confirm', es: 'Protegido por la Garantía Grabitt · Los fondos se retienen hasta que confirmes', de: 'Geschützt durch die Grabitt-Garantie · Geld wird bis zu deiner Bestätigung einbehalten', da: 'Beskyttet af Grabitt-garantien · Beløbet holdes, indtil du bekræfter', sv: 'Skyddas av Grabitt-garantin · Pengarna hålls tills du bekräftar', nl: 'Beschermd door de Grabitt-garantie · Bedrag wordt vastgehouden tot je bevestigt', fr: 'Protégé par la Garantie Grabitt · Les fonds sont bloqués jusqu\'à votre confirmation', pt: 'Protegido pela Garantia Grabitt · Os fundos ficam retidos até confirmares' },
  'Report this Listing': { en: 'Report this Listing', es: 'Denunciar este anuncio', de: 'Diese Anzeige melden', da: 'Anmeld denne annonce', sv: 'Rapportera denna annons', nl: 'Deze advertentie melden', fr: 'Signaler cette annonce', pt: 'Denunciar este anúncio' },
  'Share this Listing': { en: 'Share this Listing', es: 'Compartir este anuncio', de: 'Diese Anzeige teilen', da: 'Del denne annonce', sv: 'Dela denna annons', nl: 'Deze advertentie delen', fr: 'Partager cette annonce', pt: 'Partilhar este anúncio' },
  'Save to favourites': { en: 'Save to favourites', es: 'Guardar en favoritos', de: 'Zu Favoriten hinzufügen', da: 'Gem i favoritter', sv: 'Spara i favoriter', nl: 'Opslaan in favorieten', fr: 'Ajouter aux favoris', pt: 'Guardar nos favoritos' },
  'Add to cart': { en: 'Add to cart', es: 'Añadir al carrito', de: 'In den Warenkorb', da: 'Læg i kurv', sv: 'Lägg i kundvagn', nl: 'In winkelwagen', fr: 'Ajouter au panier', pt: 'Adicionar ao carrinho' },
  'Added to cart': { en: 'Added to cart', es: 'Añadido al carrito', de: 'Zum Warenkorb hinzugefügt', da: 'Lagt i kurven', sv: 'Tillagd i kundvagnen', nl: 'Toegevoegd aan winkelwagen', fr: 'Ajouté au panier', pt: 'Adicionado ao carrinho' },
  'Open a saved listing to favourite it': { en: 'Open a saved listing to favourite it', es: 'Abre un anuncio guardado para añadirlo a favoritos', de: 'Öffne eine gespeicherte Anzeige, um sie zu favorisieren', da: 'Åbn en gemt annonce for at føje den til favoritter', sv: 'Öppna en sparad annons för att favoritmarkera den', nl: 'Open een opgeslagen advertentie om deze als favoriet te markeren', fr: 'Ouvrez une annonce enregistrée pour l\'ajouter aux favoris', pt: 'Abre um anúncio guardado para o adicionar aos favoritos' },
  'Updated your favourites': { en: 'Updated your favourites', es: 'Favoritos actualizados', de: 'Favoriten aktualisiert', da: 'Favoritter opdateret', sv: 'Favoriter uppdaterade', nl: 'Favorieten bijgewerkt', fr: 'Favoris mis à jour', pt: 'Favoritos atualizados' },
  'Please log in to save favourites': { en: 'Please log in to save favourites', es: 'Inicia sesión para guardar favoritos', de: 'Melde dich an, um Favoriten zu speichern', da: 'Log ind for at gemme favoritter', sv: 'Logga in för att spara favoriter', nl: 'Log in om favorieten op te slaan', fr: 'Connectez-vous pour enregistrer des favoris', pt: 'Inicia sessão para guardar favoritos' },
  'Open a real listing to message the seller': { en: 'Open a real listing to message the seller', es: 'Abre un anuncio real para escribir al vendedor', de: 'Öffne eine echte Anzeige, um dem Verkäufer zu schreiben', da: 'Åbn en rigtig annonce for at skrive til sælgeren', sv: 'Öppna en riktig annons för att meddela säljaren', nl: 'Open een echte advertentie om de verkoper te berichten', fr: 'Ouvrez une vraie annonce pour contacter le vendeur', pt: 'Abre um anúncio real para contactar o vendedor' },
  'That’s your own listing': { en: 'That’s your own listing', es: 'Ese es tu propio anuncio', de: 'Das ist deine eigene Anzeige', da: 'Det er din egen annonce', sv: 'Det är din egen annons', nl: 'Dat is je eigen advertentie', fr: 'C\'est votre propre annonce', pt: 'Esse é o teu próprio anúncio' },
  'Could not start the chat': { en: 'Could not start the chat', es: 'No se pudo iniciar el chat', de: 'Chat konnte nicht gestartet werden', da: 'Kunne ikke starte chatten', sv: 'Kunde inte starta chatten', nl: 'Kon de chat niet starten', fr: 'Impossible de démarrer la discussion', pt: 'Não foi possível iniciar o chat' },
  // Checkout panel  ({amount} is replaced at render with the euro value)
  'Secure Checkout': { en: 'Secure Checkout', es: 'Pago seguro', de: 'Sicherer Checkout', da: 'Sikker betaling', sv: 'Säker kassa', nl: 'Veilig afrekenen', fr: 'Paiement sécurisé', pt: 'Pagamento seguro' },
  'Payment confirmed': { en: 'Payment confirmed', es: 'Pago confirmado', de: 'Zahlung bestätigt', da: 'Betaling bekræftet', sv: 'Betalning bekräftad', nl: 'Betaling bevestigd', fr: 'Paiement confirmé', pt: 'Pagamento confirmado' },
  'Payment held in escrow!': { en: 'Payment held in escrow!', es: '¡Pago retenido en depósito!', de: 'Zahlung treuhänderisch gehalten!', da: 'Betaling holdt i depot!', sv: 'Betalning hålls i deposition!', nl: 'Betaling in escrow vastgehouden!', fr: 'Paiement bloqué sous séquestre !', pt: 'Pagamento retido em garantia!' },
  'Your {amount} is safely held by Grabitt. Arrange collection with the seller, then confirm handover to release payment.': { en: 'Your {amount} is safely held by Grabitt. Arrange collection with the seller, then confirm handover to release payment.', es: 'Tus {amount} están retenidos de forma segura por Grabitt. Coordina la recogida con el vendedor y luego confirma la entrega para liberar el pago.', de: 'Deine {amount} werden sicher von Grabitt verwahrt. Vereinbare die Abholung mit dem Verkäufer und bestätige dann die Übergabe, um die Zahlung freizugeben.', da: 'Dine {amount} holdes sikkert af Grabitt. Aftal afhentning med sælgeren, og bekræft derefter overdragelsen for at frigive betalingen.', sv: 'Dina {amount} hålls säkert av Grabitt. Kom överens om upphämtning med säljaren och bekräfta sedan överlämningen för att frigöra betalningen.', nl: 'Jouw {amount} wordt veilig door Grabitt vastgehouden. Regel het ophalen met de verkoper en bevestig daarna de overdracht om de betaling vrij te geven.', fr: 'Vos {amount} sont conservés en sécurité par Grabitt. Convenez de l\'enlèvement avec le vendeur, puis confirmez la remise pour libérer le paiement.', pt: 'Os teus {amount} estão retidos em segurança pela Grabitt. Combina a recolha com o vendedor e depois confirma a entrega para libertar o pagamento.' },
  'Next steps': { en: 'Next steps', es: 'Próximos pasos', de: 'Nächste Schritte', da: 'Næste trin', sv: 'Nästa steg', nl: 'Volgende stappen', fr: 'Prochaines étapes', pt: 'Próximos passos' },
  'Message the seller to arrange pickup': { en: 'Message the seller to arrange pickup', es: 'Escribe al vendedor para coordinar la recogida', de: 'Schreibe dem Verkäufer, um die Abholung zu vereinbaren', da: 'Skriv til sælgeren for at aftale afhentning', sv: 'Meddela säljaren för att ordna upphämtning', nl: 'Bericht de verkoper om het ophalen te regelen', fr: 'Contactez le vendeur pour organiser l\'enlèvement', pt: 'Contacta o vendedor para combinar a recolha' },
  'Meet in a safe public place': { en: 'Meet in a safe public place', es: 'Quedad en un lugar público y seguro', de: 'Trefft euch an einem sicheren öffentlichen Ort', da: 'Mødes på et sikkert offentligt sted', sv: 'Träffas på en säker offentlig plats', nl: 'Ontmoet op een veilige openbare plek', fr: 'Rencontrez-vous dans un lieu public sûr', pt: 'Encontrem-se num local público seguro' },
  'Inspect the item carefully': { en: 'Inspect the item carefully', es: 'Inspecciona el artículo con cuidado', de: 'Prüfe den Artikel sorgfältig', da: 'Undersøg varen grundigt', sv: 'Granska varan noggrant', nl: 'Inspecteer het item zorgvuldig', fr: 'Inspectez l\'article attentivement', pt: 'Inspeciona o artigo com cuidado' },
  'Confirm handover in the app to release payment': { en: 'Confirm handover in the app to release payment', es: 'Confirma la entrega en la app para liberar el pago', de: 'Bestätige die Übergabe in der App, um die Zahlung freizugeben', da: 'Bekræft overdragelsen i appen for at frigive betalingen', sv: 'Bekräfta överlämningen i appen för att frigöra betalningen', nl: 'Bevestig de overdracht in de app om de betaling vrij te geven', fr: 'Confirmez la remise dans l\'app pour libérer le paiement', pt: 'Confirma a entrega na app para libertar o pagamento' },
  'Confirm Handover': { en: 'Confirm Handover', es: 'Confirmar entrega', de: 'Übergabe bestätigen', da: 'Bekræft overdragelse', sv: 'Bekräfta överlämning', nl: 'Overdracht bevestigen', fr: 'Confirmer la remise', pt: 'Confirmar entrega' },
  'Back to browsing': { en: 'Back to browsing', es: 'Volver a explorar', de: 'Zurück zum Stöbern', da: 'Tilbage til at gennemse', sv: 'Tillbaka till bläddring', nl: 'Terug naar bladeren', fr: 'Retour à la navigation', pt: 'Voltar a navegar' },
  'Processing payment…': { en: 'Processing payment…', es: 'Procesando pago…', de: 'Zahlung wird verarbeitet…', da: 'Behandler betaling…', sv: 'Behandlar betalning…', nl: 'Betaling verwerken…', fr: 'Traitement du paiement…', pt: 'A processar pagamento…' },
  'Please don\'t close this window': { en: 'Please don\'t close this window', es: 'Por favor, no cierres esta ventana', de: 'Bitte schließe dieses Fenster nicht', da: 'Luk venligst ikke dette vindue', sv: 'Stäng inte det här fönstret', nl: 'Sluit dit venster niet', fr: 'Ne fermez pas cette fenêtre', pt: 'Por favor, não feches esta janela' },
  'Payments are not configured yet.': { en: 'Payments are not configured yet.', es: 'Los pagos aún no están configurados.', de: 'Zahlungen sind noch nicht eingerichtet.', da: 'Betalinger er endnu ikke konfigureret.', sv: 'Betalningar är inte konfigurerade ännu.', nl: 'Betalingen zijn nog niet geconfigureerd.', fr: 'Les paiements ne sont pas encore configurés.', pt: 'Os pagamentos ainda não estão configurados.' },
  'Pay {amount} Securely': { en: 'Pay {amount} Securely', es: 'Paga {amount} de forma segura', de: 'Zahle {amount} sicher', da: 'Betal {amount} sikkert', sv: 'Betala {amount} säkert', nl: 'Betaal {amount} veilig', fr: 'Payez {amount} en toute sécurité', pt: 'Paga {amount} com segurança' },
  'Quantity': { en: 'Quantity', es: 'Cantidad', de: 'Menge', da: 'Antal', sv: 'Antal', nl: 'Aantal', fr: 'Quantité', pt: 'Quantidade' },
  'free': { en: 'free', es: 'gratis', de: 'kostenlos', da: 'gratis', sv: 'gratis', nl: 'gratis', fr: 'gratuit', pt: 'grátis' },
  'the seller delivers in person; scan the QR code on arrival to release funds.': { en: 'the seller delivers in person; scan the QR code on arrival to release funds.', es: 'el vendedor entrega en persona; escanea el código QR al llegar para liberar los fondos.', de: 'der Verkäufer liefert persönlich; scanne bei Ankunft den QR-Code, um das Geld freizugeben.', da: 'sælgeren leverer personligt; scan QR-koden ved ankomst for at frigive beløbet.', sv: 'säljaren levererar personligen; skanna QR-koden vid ankomst för att frigöra pengarna.', nl: 'de verkoper levert persoonlijk; scan de QR-code bij aankomst om het bedrag vrij te geven.', fr: 'le vendeur livre en personne ; scannez le code QR à l\'arrivée pour libérer les fonds.', pt: 'o vendedor entrega em pessoa; digitaliza o código QR à chegada para libertar os fundos.' },
  'sent by tracked courier; funds release once tracking shows the item in transit.': { en: 'sent by tracked courier; funds release once tracking shows the item in transit.', es: 'enviado por mensajería con seguimiento; los fondos se liberan cuando el seguimiento muestra el artículo en tránsito.', de: 'per verfolgtem Kurier versendet; das Geld wird freigegeben, sobald die Sendungsverfolgung den Artikel als unterwegs anzeigt.', da: 'sendt med sporet kurer; beløbet frigives, når sporingen viser varen undervejs.', sv: 'skickas med spårad budtjänst; pengarna frigörs när spårningen visar varan under transport.', nl: 'verzonden via track & trace-koerier; het bedrag komt vrij zodra tracking het item onderweg toont.', fr: 'expédié par coursier suivi ; les fonds sont libérés dès que le suivi indique l\'article en transit.', pt: 'enviado por correio com rastreamento; os fundos são libertados quando o rastreamento mostra o artigo em trânsito.' },
  'scan the QR code at handover to release funds.': { en: 'scan the QR code at handover to release funds.', es: 'escanea el código QR en la entrega para liberar los fondos.', de: 'scanne bei der Übergabe den QR-Code, um das Geld freizugeben.', da: 'scan QR-koden ved overdragelsen for at frigive beløbet.', sv: 'skanna QR-koden vid överlämningen för att frigöra pengarna.', nl: 'scan de QR-code bij de overdracht om het bedrag vrij te geven.', fr: 'scannez le code QR lors de la remise pour libérer les fonds.', pt: 'digitaliza o código QR na entrega para libertar os fundos.' },
  'Order summary': { en: 'Order summary', es: 'Resumen del pedido', de: 'Bestellübersicht', da: 'Ordreoversigt', sv: 'Ordersammanfattning', nl: 'Besteloverzicht', fr: 'Récapitulatif de commande', pt: 'Resumo do pedido' },
  'Item price': { en: 'Item price', es: 'Precio del artículo', de: 'Artikelpreis', da: 'Varepris', sv: 'Varupris', nl: 'Artikelprijs', fr: 'Prix de l\'article', pt: 'Preço do artigo' },
  'Platform fee': { en: 'Platform fee', es: 'Comisión de la plataforma', de: 'Plattformgebühr', da: 'Platformsgebyr', sv: 'Plattformsavgift', nl: 'Platformkosten', fr: 'Frais de plateforme', pt: 'Taxa da plataforma' },
  'Paid by seller': { en: 'Paid by seller', es: 'Pagada por el vendedor', de: 'Vom Verkäufer bezahlt', da: 'Betales af sælger', sv: 'Betalas av säljaren', nl: 'Betaald door verkoper', fr: 'Payés par le vendeur', pt: 'Paga pelo vendedor' },
  'You pay': { en: 'You pay', es: 'Tú pagas', de: 'Du zahlst', da: 'Du betaler', sv: 'Du betalar', nl: 'Jij betaalt', fr: 'Vous payez', pt: 'Tu pagas' },
  'Your payment is held in': { en: 'Your payment is held in', es: 'Tu pago se retiene en', de: 'Deine Zahlung wird gehalten in', da: 'Din betaling holdes i', sv: 'Din betalning hålls i', nl: 'Je betaling wordt vastgehouden in', fr: 'Votre paiement est bloqué sous', pt: 'O teu pagamento fica retido em' },
  'Stripe escrow': { en: 'Stripe escrow', es: 'depósito de Stripe', de: 'Stripe-Treuhand', da: 'Stripe-depot', sv: 'Stripe-deposition', nl: 'Stripe-escrow', fr: 'séquestre Stripe', pt: 'garantia Stripe' },
  'and only released to the seller after you confirm receipt.': { en: 'and only released to the seller after you confirm receipt.', es: 'y solo se libera al vendedor después de que confirmes la recepción.', de: 'und erst an den Verkäufer freigegeben, nachdem du den Erhalt bestätigt hast.', da: 'og frigives først til sælgeren, når du har bekræftet modtagelsen.', sv: 'och frigörs till säljaren först när du bekräftat mottagandet.', nl: 'en wordt pas aan de verkoper vrijgegeven nadat je de ontvangst bevestigt.', fr: 'et n\'est libéré au vendeur qu\'après votre confirmation de réception.', pt: 'e só é libertado ao vendedor depois de confirmares a receção.' },
  'Continue to Payment': { en: 'Continue to Payment', es: 'Continuar al pago', de: 'Weiter zur Zahlung', da: 'Fortsæt til betaling', sv: 'Fortsätt till betalning', nl: 'Doorgaan naar betaling', fr: 'Continuer vers le paiement', pt: 'Continuar para o pagamento' },
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
