// Category-specific attributes for a listing. Each department can ask for extra
// structured details — a fashion item wants size and material, an electronics
// item wants a type and storage — and every value is chosen from a fixed list so
// it stays searchable and can't drift across spellings.
//
// Keyed by the Prisma Department enum value. Departments not listed here fall
// back to the generic brand/colour/size fields the sell form already has.

export type AttributeField = {
  key: string          // stored key, e.g. "Type"
  label: string
  options: string[]    // fixed, searchable values
  optional?: boolean
}

const COLOURS = ['Black', 'White', 'Grey', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Purple', 'Brown', 'Beige', 'Orange', 'Multi', 'Other']
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'UK 18', 'One size']
const SHOE_SIZES = ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'EU 46', 'EU 47']

export const LISTING_ATTRIBUTES: Record<string, AttributeField[]> = {
  fashion: [
    { key: 'Type', label: 'Item type', options: ['Top', 'Shirt', 'T-shirt', 'Jumper', 'Dress', 'Skirt', 'Trousers', 'Jeans', 'Shorts', 'Jacket', 'Coat', 'Suit', 'Activewear', 'Swimwear', 'Shoes', 'Boots', 'Trainers', 'Bag', 'Accessory', 'Other'] },
    { key: 'Department', label: 'For', options: ["Women's", "Men's", 'Unisex', 'Girls', 'Boys', 'Baby'] },
    { key: 'Size', label: 'Size', options: [...CLOTHING_SIZES, ...SHOE_SIZES] },
    { key: 'Colour', label: 'Colour', options: COLOURS },
    { key: 'Material', label: 'Material', options: ['Cotton', 'Wool', 'Leather', 'Denim', 'Polyester', 'Linen', 'Silk', 'Suede', 'Synthetic', 'Mixed', 'Other'], optional: true },
    { key: 'Style', label: 'Style', options: ['Casual', 'Formal', 'Sportswear', 'Vintage', 'Designer', 'Streetwear', 'Workwear', 'Other'], optional: true },
  ],
  electronics: [
    { key: 'Type', label: 'Item type', options: ['Phone', 'Laptop', 'Tablet', 'Desktop PC', 'Monitor', 'TV', 'Camera', 'Headphones', 'Speaker', 'Smartwatch', 'Console', 'Drone', 'Accessory', 'Other'] },
    { key: 'Colour', label: 'Colour', options: COLOURS, optional: true },
    { key: 'Storage', label: 'Storage', options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB+', 'N/A'], optional: true },
    { key: 'Connectivity', label: 'Connectivity', options: ['Wi-Fi', 'Wi-Fi + Cellular', '5G', '4G', 'Bluetooth', 'Wired', 'N/A'], optional: true },
  ],
  gaming: [
    { key: 'Type', label: 'Item type', options: ['Console', 'Game', 'Controller', 'Headset', 'PC part', 'Accessory', 'Other'] },
    { key: 'Platform', label: 'Platform', options: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Retro', 'Other'] },
  ],
  motors: [
    { key: 'Type', label: 'Vehicle type', options: ['Car', 'Motorbike', 'Scooter', 'Van', 'Bicycle', 'Parts', 'Accessory', 'Other'] },
    { key: 'Fuel', label: 'Fuel', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'N/A'], optional: true },
    { key: 'Transmission', label: 'Transmission', options: ['Manual', 'Automatic', 'N/A'], optional: true },
    { key: 'Colour', label: 'Colour', options: COLOURS, optional: true },
  ],
  home_garden: [
    { key: 'Type', label: 'Item type', options: ['Furniture', 'Lighting', 'Kitchenware', 'Appliance', 'Decor', 'Bedding', 'Garden furniture', 'Garden tool', 'Plant', 'Other'] },
    { key: 'Colour', label: 'Colour', options: COLOURS, optional: true },
    { key: 'Material', label: 'Material', options: ['Wood', 'Metal', 'Glass', 'Plastic', 'Fabric', 'Ceramic', 'Rattan', 'Mixed', 'Other'], optional: true },
  ],
  sport: [
    { key: 'Type', label: 'Item type', options: ['Bike', 'Water sports', 'Gym equipment', 'Football', 'Golf', 'Tennis', 'Running', 'Winter sports', 'Clothing', 'Other'] },
    { key: 'Size', label: 'Size', options: [...CLOTHING_SIZES, 'N/A'], optional: true },
    { key: 'Colour', label: 'Colour', options: COLOURS, optional: true },
  ],
  pet_shop: [
    { key: 'Type', label: 'Item type', options: ['Food', 'Bedding', 'Toy', 'Collar/Lead', 'Grooming', 'Tank/Cage', 'Accessory', 'Other'] },
    { key: 'For', label: 'For', options: ['Dog', 'Cat', 'Bird', 'Fish', 'Reptile', 'Small pet', 'Other'] },
  ],
}

/** The fields for a department, or [] if it has no category-specific ones. */
export function attributesFor(department: string): AttributeField[] {
  return LISTING_ATTRIBUTES[department] ?? []
}
