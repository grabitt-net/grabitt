// Towns and villages of Gran Canaria — mobile mirror of apps/web/lib/gcTowns.ts.
// Keep in sync with the web list so listing/apply location pickers match.
const GC_PLACES: string[] = [
  'La Aldea de San Nicolás', 'Agaete', 'Puerto de las Nieves',
  'Gáldar', 'Sardina del Norte', 'Santa María de Guía', 'Moya', 'Fontanales',
  'Arucas', 'Bañaderos', 'Cardones', 'San Andrés', 'Firgas', 'Teror',
  'Las Palmas de Gran Canaria', 'Vegueta', 'Triana', 'Ciudad Alta', 'Schamann',
  'Escaleritas', 'La Isleta', 'Guanarteme', 'Las Canteras', 'Tamaraceite',
  'San Lorenzo', 'Tafira', 'Tenoya',
  'Santa Brígida', 'La Atalaya', 'Vega de San Mateo', 'Valleseco',
  'Tejeda', 'Artenara', 'Cruz de Tejeda',
  'Telde', 'Jinámar', 'La Garita', 'Melenara', 'Salinetas',
  'Valle de los Nueve', 'San Francisco de Asís', 'Las Remudas',
  'Valsequillo', 'Tenteniguada',
  'Ingenio', 'Carrizal', 'Agüimes', 'Arinaga', 'Cruce de Arinaga', 'Playa de Arinaga',
  'Santa Lucía de Tirajana', 'Vecindario', 'El Doctoral', 'Sardina del Sur',
  'Pozo Izquierdo',
  'San Bartolomé de Tirajana', 'Maspalomas', 'Playa del Inglés', 'San Agustín',
  'San Fernando de Maspalomas', 'El Tablero', 'Bahía Feliz', 'Sonnenland',
  'Meloneras', 'Fataga', 'Tunte', 'Ayagaures', 'Aldea Blanca',
  'Mogán', 'Puerto de Mogán', 'Playa de Mogán', 'Arguineguín', 'Puerto Rico',
  'Amadores', 'Tauro', 'Taurito', 'Pátalavaca', 'Veneguera', 'Playa del Cura',
]

// Alphabetical (Spanish locale), duplicates removed.
export const GC_TOWNS: string[] = Array.from(new Set(GC_PLACES)).sort((a, b) => a.localeCompare(b, 'es'))
