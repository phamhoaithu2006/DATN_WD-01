export const demoTours = [
  {
    id: 1,
    title: 'Discover Ha Long Bay - 3 Days Cruise',
    slug: 'discover-ha-long-bay',
    summary: 'Sail through limestone islands, kayak quiet lagoons, and watch sunset on deck.',
    destination: 'Ha Long Bay',
    category: 'Cruises',
    travelStyle: 'Flights',
    duration: '3 days 2 nights',
    price: { base: 1099, discount: 899 },
    slots: { max: 18, available: 8 },
    rating: { average: 4.9, count: 2847 },
    image:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    discountLabel: '25% OFF',
  },
  {
    id: 2,
    title: 'Bali Paradise Escape - 7 Days',
    slug: 'bali-paradise-escape',
    summary: 'Ancient temples, tropical beaches, and peaceful resorts across Bali.',
    destination: 'Bali',
    category: 'Adventure',
    travelStyle: 'Adventure',
    duration: '7 days 6 nights',
    price: { base: 1099, discount: 899 },
    slots: { max: 15, available: 6 },
    rating: { average: 4.8, count: 1923 },
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    discountLabel: '18% OFF',
  },
  {
    id: 3,
    title: 'Tokyo & Kyoto Explorer - 6 Days',
    slug: 'tokyo-kyoto-explorer',
    summary: 'Modern city energy, old streets, temples, food alleys, and scenic train rides.',
    destination: 'Tokyo & Kyoto',
    category: 'Cultural',
    travelStyle: 'Flights',
    duration: '6 days 5 nights',
    price: { base: 2299, discount: 1899 },
    slots: { max: 12, available: 4 },
    rating: { average: 4.9, count: 3156 },
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    discountLabel: '13% OFF',
  },
  {
    id: 4,
    title: 'Maldives Island Paradise - 5 Days',
    slug: 'maldives-island-paradise',
    summary: 'Overwater villas, coral snorkeling, turquoise lagoons, and sunset dining.',
    destination: 'Maldives',
    category: 'Beach',
    travelStyle: 'Beach',
    duration: '5 days 4 nights',
    price: { base: 2499, discount: 2099 },
    slots: { max: 10, available: 3 },
    rating: { average: 4.9, count: 1876 },
    image:
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    discountLabel: '17% OFF',
  },
  {
    id: 5,
    title: 'Santorini Romantic Getaway - 5 Days',
    slug: 'santorini-romantic-getaway',
    summary: 'Whitewashed villages, blue domes, Aegean views, and cliffside evenings.',
    destination: 'Santorini',
    category: 'Beach',
    travelStyle: 'Hotels',
    duration: '5 days 4 nights',
    price: { base: 1399, discount: 1199 },
    slots: { max: 10, available: 5 },
    rating: { average: 4.7, count: 1567 },
    image:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    featured: false,
  },
  {
    id: 6,
    title: 'Dubai Luxury Experience - 4 Days',
    slug: 'dubai-luxury-experience',
    summary: 'A modern skyline, golden desert, premium shopping, and flexible hotel stays.',
    destination: 'Dubai',
    category: 'Luxury',
    travelStyle: 'Hotels',
    duration: '4 days 3 nights',
    price: { base: 999, discount: 799 },
    slots: { max: 16, available: 9 },
    rating: { average: 4.6, count: 2234 },
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
    featured: false,
    discountLabel: '20% OFF',
  },
]

export const demoDestinations = [
  {
    name: 'Vietnam',
    tours: 36,
    image:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Japan',
    tours: 52,
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Greece',
    tours: 29,
    image:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'UAE',
    tours: 23,
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Maldives',
    tours: 18,
    image:
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
  },
]

export const categoryLabels = ['All', 'Beach', 'Adventure', 'Cultural', 'Cruises', 'Luxury']

export const quickFilters = [
  { label: 'Flights', value: 'Flights', icon: 'plane' },
  { label: 'Hotels', value: 'Hotels', icon: 'hotel' },
  { label: 'Beach', value: 'Beach', icon: 'beach' },
  { label: 'Adventure', value: 'Adventure', icon: 'adventure' },
]
