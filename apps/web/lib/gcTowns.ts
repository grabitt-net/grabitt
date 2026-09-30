// Towns and villages of Gran Canaria, offered as a single flat, alphabetically
// sorted list for the "where do you live" field on a job application. Covers the
// 21 municipalities and their main localities. (Other islands can be added later
// when the marketplace expands beyond Gran Canaria.)
const GC_PLACES: string[] = [
  // La Aldea / Agaete / Gáldar / Guía / Moya (north-west)
  'La Aldea de San Nicolás', 'Agaete', 'Puerto de las Nieves',
  'Gáldar', 'Sardina del Norte', 'Santa María de Guía', 'Moya', 'Fontanales',
  // Arucas / Firgas / Teror (north)
  'Arucas', 'Bañaderos', 'Cardones', 'San Andrés', 'Firgas', 'Teror',
  // Las Palmas de Gran Canaria and its districts
  'Las Palmas de Gran Canaria', 'Vegueta', 'Triana', 'Ciudad Alta', 'Schamann',
  'Escaleritas', 'La Isleta', 'Guanarteme', 'Las Canteras', 'Tamaraceite',
  'San Lorenzo', 'Tafira', 'Tenoya',
  // Santa Brígida / San Mateo / Valleseco / interior highlands
  'Santa Brígida', 'La Atalaya', 'Vega de San Mateo', 'Valleseco',
  'Tejeda', 'Artenara', 'Cruz de Tejeda',
  // Telde and its surroundings
  'Telde', 'Jinámar', 'La Garita', 'Melenara', 'Salinetas',
  'Valle de los Nueve', 'San Francisco de Asís', 'Las Remudas',
  // Valsequillo
  'Valsequillo', 'Tenteniguada',
  // Ingenio / Agüimes (east)
  'Ingenio', 'Carrizal', 'Agüimes', 'Arinaga', 'Cruce de Arinaga', 'Playa de Arinaga',
  // Santa Lucía de Tirajana (south-east)
  'Santa Lucía de Tirajana', 'Vecindario', 'El Doctoral', 'Sardina del Sur',
  'Pozo Izquierdo',
  // San Bartolomé de Tirajana (south)
  'San Bartolomé de Tirajana', 'Maspalomas', 'Playa del Inglés', 'San Agustín',
  'San Fernando de Maspalomas', 'El Tablero', 'Bahía Feliz', 'Sonnenland',
  'Meloneras', 'Fataga', 'Tunte', 'Ayagaures', 'Aldea Blanca',
  // Mogán (south-west)
  'Mogán', 'Puerto de Mogán', 'Playa de Mogán', 'Arguineguín', 'Puerto Rico',
  'Amadores', 'Tauro', 'Taurito', 'Pátalavaca', 'Veneguera', 'Playa del Cura',
]

// Alphabetical (Spanish locale), duplicates removed.
export const GC_TOWNS: string[] = Array.from(new Set(GC_PLACES)).sort((a, b) => a.localeCompare(b, 'es'))
