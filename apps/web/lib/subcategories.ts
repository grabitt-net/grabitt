// Fixed subcategory lists per department (keyed by the Department enum slug).
// Used by the Sell wizard, the edit form and the category page so the options
// stay in sync everywhere. Lists do NOT include an "All" entry — callers that
// need it (the category page filter bar) prepend their own.
export const SUBCATEGORIES: Record<string, string[]> = {
  electronics: ['Phones', 'Laptops & Mac', 'TVs', 'Cameras', 'Audio', 'Gaming', 'Tablets', 'Accessories'],
  fashion: ['Womens Clothing', 'Mens Clothing', 'Shoes', 'Bags', 'Jewellery', 'Kids Fashion', 'Vintage', 'Accessories', 'Sportswear', 'Fancy Dress', 'Uniforms'],
  home_garden: ['Soft Furnishings', 'Furniture', 'Wall Art', 'Ceramics', 'Home Office', 'Lighting', 'Kitchenware', 'Kitchen Electricals', 'Household Electricals', 'Dining Utensils', 'Bathroom', 'Flooring', 'Bedroom', 'Plants', 'Garden Furniture', 'Garden Equipment'],
  sport: ['Cycling', 'Water Sports', 'Football', 'Golf', 'Gym & Fitness', 'Running', 'Tennis', 'Winter Sports', 'Volleyball', 'Sportswear', 'Basketball'],
  gaming: ['PlayStation', 'Xbox', 'Nintendo', 'PC Gaming', 'Board Games', 'Trading Cards', 'Instruments', 'Drones'],
  food_store: ['Wine & Spirits', 'International Food', 'Coffee & Tea', 'Organic', 'BBQ', 'Cheese', 'Craft Beer', 'Oils & Sauces'],
  gift_ideas: ['Jewellery', 'Watches', 'Art', 'Candles & Scents', 'Gift Boxes', 'Ceramics', 'Handmade', 'Crystals'],
  kids_baby: ['Toys', 'Baby Gear', 'Kids Bikes', 'Clothes 0-3', 'Clothes 4-12', 'Books', 'School Supplies', 'Games'],
  health_fitness: ['Skincare', 'Vitamins', 'Fitness', 'Equipment', 'Massage', 'Yoga', 'Dental', 'Optical', 'Hair Care', 'Beauty', 'Muscle Care'],
  retro_vintage: ['Mid Century', 'Funky Stuff!', 'Vintage Clothing', 'Antiques', 'Furniture', 'Electrical', 'Kitchenware', 'Ceramics', 'Glassware', 'Records', 'Office'],
  pet_shop: ['Dog Food', 'Cat Food', 'Toys', 'Bedding', 'Collars', 'Treats', 'Accessories', 'Fish tanks'],
  hobbies_crafts: ['Wool & Yarn', 'Fabric & Sewing', 'Art Supplies', 'Model Making', 'Scrapbooking', 'Beads & Jewellery', 'Tools'],
  motors: ['Cars', 'Motorbikes', 'Scooters', 'Vans', 'Parts', 'Accessories', 'Bicycles'],
  collectables: ['Coins', 'Stamps', 'Trading Cards', 'Memorabilia', 'Antiques', 'Art', 'Militaria'],
  handy_help: ['Plumbers', 'Carpenter', 'Sewing', 'Metalwork', 'Gardening', 'Cleaning', 'Roofing', 'Electrics', 'Building', 'Windows & Doors', 'Car Repair', 'Removals & Storage', 'Translation Services', 'Personal Assist'],
  grab_it_now: ['Electronics', 'Furniture', 'Fashion', 'Sport', 'Other'],
}

export function subcategoriesForSlug(slug: string): string[] {
  return SUBCATEGORIES[slug] ?? []
}
