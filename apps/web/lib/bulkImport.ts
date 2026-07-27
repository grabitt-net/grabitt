// Bulk listing import for Business accounts. The seller prepares a CSV (one row
// per listing) and we parse, validate, and map each row to the same shape the
// single-listing create expects. Kept deliberately small and dependency-free.

export type ParsedRow = {
  index: number                 // 0-based row number (excluding header)
  raw: Record<string, string>
  mapped?: BulkListing          // present when the row is valid
  errors: string[]              // human-readable problems; empty when valid
}

export type BulkListing = {
  title: string
  description: string
  price: number
  department: string
  condition: string
  images: string[]
  location: string
  stock: number
  brand?: string
  colour?: string
  size?: string
  deliveryFee: number
  deliveryMethod?: 'courier' | 'in_person'
  autoAcceptMin?: number
}

// Column order for the downloadable template. Header names are matched
// case-insensitively and trimmed, so a seller's own casing still works.
export const IMPORT_COLUMNS = [
  'title', 'description', 'price', 'department', 'condition',
  'images', 'location', 'stock', 'brand', 'colour', 'size',
  'deliveryFee', 'deliveryMethod', 'autoAcceptMin',
] as const

// Human label → Prisma enum for the two constrained fields. Accept both the
// label and the raw enum value so either works in the sheet.
const DEPARTMENTS: Record<string, string> = {
  'electronics': 'electronics', 'fashion': 'fashion', 'home & garden': 'home_garden', 'home_garden': 'home_garden',
  'sport': 'sport', 'sport & leisure': 'sport', 'gaming': 'gaming', 'pet shop': 'pet_shop', 'pet_shop': 'pet_shop',
  'motors': 'motors', 'kids & baby': 'kids_baby', 'kids_baby': 'kids_baby', 'health, fitness & diet': 'health_fitness',
  'health_fitness': 'health_fitness', 'food store': 'food_store', 'food_store': 'food_store', 'gift ideas': 'gift_ideas',
  'gift_ideas': 'gift_ideas', 'retro & vintage': 'retro_vintage', 'retro_vintage': 'retro_vintage',
  'handy help': 'handy_help', 'handy_help': 'handy_help', 'property': 'property',
}
const CONDITIONS: Record<string, string> = {
  'new': 'new', 'like new': 'like_new', 'like_new': 'like_new', 'good': 'good',
  'fair': 'fair', 'for parts': 'spares', 'spares': 'spares',
}

export const DEPARTMENT_HINT = 'Electronics, Fashion, Home & Garden, Sport, Gaming, Pet Shop, Motors, Kids & Baby, Health Fitness & Diet, Food Store, Gift Ideas, Retro & Vintage, Handy Help, Property'
export const CONDITION_HINT = 'New, Like New, Good, Fair, For Parts'

// A minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes
// ("") and commas/newlines inside quotes. Returns an array of string arrays.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  const s = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  // flush last field/row unless the file ended on a clean newline
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

// The example CSV the seller downloads — header plus one filled example row.
export function templateCsv(): string {
  const header = IMPORT_COLUMNS.join(',')
  const example = [
    'Refurbished iPhone 13 128GB',
    '"Grade A refurbished, boxed with charger. 12-month warranty."',
    '399',
    'Electronics',
    'Like New',
    'https://example.com/iphone-front.jpg|https://example.com/iphone-back.jpg',
    'Las Palmas',
    '5',
    'Apple',
    'Blue',
    '128GB',
    '0',
    'courier',
    '360',
  ].join(',')
  return `${header}\n${example}\n`
}

// Validate + map every data row. `text` is the whole CSV including the header.
export function validateRows(text: string): { rows: ParsedRow[]; headerOk: boolean; missingColumns: string[] } {
  const grid = parseCsv(text)
  if (grid.length === 0) return { rows: [], headerOk: false, missingColumns: [...IMPORT_COLUMNS] }

  const header = grid[0].map(h => h.trim().toLowerCase())
  const colIndex: Record<string, number> = {}
  for (const col of IMPORT_COLUMNS) colIndex[col] = header.indexOf(col.toLowerCase())
  const required = ['title', 'description', 'price', 'department', 'condition', 'images', 'location'] as const
  const missingColumns = required.filter(c => colIndex[c] === -1)
  const headerOk = missingColumns.length === 0

  const rows: ParsedRow[] = grid.slice(1).map((cells, i) => {
    const get = (col: string) => { const idx = colIndex[col]; return idx >= 0 ? (cells[idx] ?? '').trim() : '' }
    const raw: Record<string, string> = {}
    for (const col of IMPORT_COLUMNS) raw[col] = get(col)
    const errors: string[] = []

    if (!headerOk) return { index: i, raw, errors: [`Missing column(s): ${missingColumns.join(', ')}`] }

    const title = get('title')
    const description = get('description')
    const priceStr = get('price')
    const deptRaw = get('department')
    const condRaw = get('condition')
    const imagesRaw = get('images')
    const location = get('location')

    if (title.length < 4) errors.push('Title must be at least 4 characters')
    if (!description) errors.push('Description is required')
    const price = Number(priceStr)
    if (!Number.isFinite(price) || price < 0) errors.push(`Price "${priceStr}" is not a valid number`)
    const department = DEPARTMENTS[deptRaw.toLowerCase()]
    if (!department) errors.push(`Unknown department "${deptRaw}"`)
    const condition = CONDITIONS[condRaw.toLowerCase()]
    if (!condition) errors.push(`Unknown condition "${condRaw}"`)
    const images = imagesRaw.split('|').map(u => u.trim()).filter(Boolean)
    if (images.length === 0) errors.push('At least one image URL is required (separate multiple with |)')
    else if (images.some(u => !/^https?:\/\//i.test(u))) errors.push('Image URLs must start with http:// or https://')
    if (!location) errors.push('Location is required')

    const stockStr = get('stock')
    const stock = stockStr ? Math.max(1, Math.min(999, parseInt(stockStr) || 1)) : 1
    const deliveryFeeStr = get('deliveryFee')
    const deliveryFee = deliveryFeeStr ? Math.max(0, Number(deliveryFeeStr) || 0) : 0
    const dmRaw = get('deliveryMethod').toLowerCase()
    const deliveryMethod = dmRaw === 'courier' || dmRaw === 'in_person' ? dmRaw : undefined
    const autoStr = get('autoAcceptMin')
    const autoAcceptMin = autoStr && Number(autoStr) > 0 ? Number(autoStr) : undefined

    const mapped: BulkListing | undefined = errors.length === 0 ? {
      title, description, price, department, condition, images, location, stock,
      brand: get('brand') || undefined,
      colour: get('colour') || undefined,
      size: get('size') || undefined,
      deliveryFee,
      deliveryMethod: deliveryMethod as BulkListing['deliveryMethod'],
      autoAcceptMin,
    } : undefined

    return { index: i, raw, mapped, errors }
  })

  return { rows, headerOk, missingColumns }
}
