// Lightweight Gran Canaria geocoder — maps a town/area name to coordinates so we
// can plot job pins on a map without any geocoding API or key. Matches by
// case-insensitive substring, so "Playa del Inglés, Maspalomas" still resolves.

export const GC_CENTER: [number, number] = [27.96, -15.6]

const TOWNS: [string, [number, number]][] = [
  ['las palmas', [28.1235, -15.4363]],
  ['playa del ingl', [27.7574, -15.5720]],
  ['maspalomas', [27.7606, -15.5860]],
  ['puerto de mog', [27.8155, -15.7660]],
  ['puerto rico', [27.7876, -15.7100]],
  ['arguineg', [27.7620, -15.6820]],
  ['mog', [27.8880, -15.7250]],
  ['telde', [27.9985, -15.4197]],
  ['vecindario', [27.8380, -15.4430]],
  ['santa luc', [27.9110, -15.5410]],
  ['ag_imes', [27.9060, -15.4460]], // Agüimes (u with diaeresis normalised below)
  ['aguimes', [27.9060, -15.4460]],
  ['ingenio', [27.9200, -15.4400]],
  ['san bartolom', [27.9250, -15.5730]],
  ['arucas', [28.1190, -15.5230]],
  ['g_ldar', [28.1440, -15.6560]],
  ['galdar', [28.1440, -15.6560]],
  ['gu_a', [28.1400, -15.6320]],
  ['guia', [28.1400, -15.6320]],
  ['moya', [28.1100, -15.5820]],
  ['teror', [28.0600, -15.5460]],
  ['firgas', [28.1030, -15.5610]],
  ['tejeda', [27.9950, -15.6150]],
  ['tenteniguada', [27.9800, -15.5200]],
  ['valsequillo', [27.9860, -15.5030]],
  ['san mateo', [28.0100, -15.5330]],
  ['vega de san mateo', [28.0100, -15.5330]],
  ['santa br_gida', [28.0300, -15.5060]],
  ['santa brigida', [28.0300, -15.5060]],
  ['tafira', [28.0680, -15.4640]],
  ['carrizal', [27.8600, -15.4300]],
  ['sardina', [27.8250, -15.7180]],
  ['tauro', [27.7900, -15.6900]],
  ['melon', [27.7830, -15.6700]],
  ['amadores', [27.7830, -15.7250]],
]

export function geocodeGC(location?: string | null): [number, number] | null {
  if (!location) return null
  const q = location.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [key, coords] of TOWNS) {
    const k = key.replace('_', '').replace(/[̀-ͯ]/g, '')
    if (q.includes(k)) return coords
  }
  return null
}
