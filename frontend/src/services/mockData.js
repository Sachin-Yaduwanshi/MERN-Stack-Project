// Temporary mock data for Phase 2 UI development
// Will be replaced by real MongoDB/Express API responses in Phase 5 and Phase 6

export const MOCK_USERS = [
  {
    id: 'user-guest-1',
    name: 'Rohit Kumar Singh',
    email: 'rohit@example.com',
    role: 'GUEST',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    phone: '+91 98765 43210',
    createdAt: '2026-01-15'
  },
  {
    id: 'user-owner-1',
    name: 'Amit Sharma',
    email: 'amit@staypulse.com',
    role: 'PROPERTY_OWNER',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    avatarVisibleToGuests: true,
    phone: '+91 98111 22334',
    createdAt: '2026-01-10'
  },
  {
    id: 'user-owner-2',
    name: 'Priya Patel',
    email: 'priya@staypulse.com',
    role: 'PROPERTY_OWNER',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    avatarVisibleToGuests: false,
    phone: '+91 98222 33445',
    createdAt: '2026-02-01'
  },
  {
    id: 'user-admin-1',
    name: 'Sachin Yaduwanshi',
    email: 'admin@staypulse.com',
    role: 'PLATFORM_ADMIN',
    avatar: '',
    phone: '+91 99000 00000',
    createdAt: '2026-01-01'
  }
];

export const MOCK_HOTELS = [
  {
    id: 'hotel-1',
    ownerId: 'user-owner-1',
    ownerName: 'Amit Sharma',
    ownerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    ownerAvatarVisible: true,
    name: 'The Grand Heritage Palace',
    tagline: 'Royal Rajasthani hospitality amidst marble courtyards',
    description: 'Immerse yourself in authentic royal Rajasthani heritage. Built with traditional sandstone carvings, fountains, and lush gardens, this heritage hotel offers bespoke service, world-class dining, and rooftop sunset views of the Pink City.',
    city: 'Jaipur',
    state: 'Rajasthan',
    address: '14 Palace Road, Civil Lines',
    status: 'ACTIVE',
    startingPrice: 4200,
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'
    ],
    amenities: ['Free High-Speed WiFi', 'Swimming Pool', 'Multi-Cuisine Dining', 'Valet Parking', 'Air Conditioning', 'Spa & Wellness'],
    rating: null // Omitted to respect prompt rules against inventing fake customer reviews
  },
  {
    id: 'hotel-2',
    ownerId: 'user-owner-1',
    ownerName: 'Amit Sharma',
    ownerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    ownerAvatarVisible: true,
    name: 'Azure Palms Beach Resort',
    tagline: 'Direct private beach access along the Arabian coast',
    description: 'Wake up to the rhythm of ocean waves. Azure Palms offers breezy beachside cottages, sunset deck cocktails, fresh seafood grills, and an infinity pool overlooking the Arabian Sea in vibrant North Goa.',
    city: 'Goa',
    state: 'Goa',
    address: '88 Beachfront Lane, Calangute',
    status: 'ACTIVE',
    startingPrice: 3800,
    coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'
    ],
    amenities: ['Beachfront Access', 'Infinity Pool', 'Seafood Restaurant', 'Cocktail Bar', 'Free WiFi', 'Water Sports Desk'],
    rating: null
  },
  {
    id: 'hotel-3',
    ownerId: 'user-owner-2',
    ownerName: 'Priya Patel',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    ownerAvatarVisible: false, // Hidden by owner preference
    name: 'Silver Pine Valley Resort',
    tagline: 'Peaceful mountain sanctuary with cedar wood chalets',
    description: 'Nestled on apple orchard hills overlooking snowcapped peaks. Features cozy cedar chalets, stone fireplaces, herbal tea gardens, and daily guided nature trails.',
    city: 'Manali',
    state: 'Himachal Pradesh',
    address: '22 Apple Grove Road, Old Manali',
    status: 'ACTIVE',
    startingPrice: 3100,
    coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80'
    ],
    amenities: ['Mountain View Balcony', 'Wood Fireplace', 'Heated Rooms', 'Organic Dining', 'Free Parking', 'Trekking Concierge'],
    rating: null
  },
  {
    id: 'hotel-4',
    ownerId: 'user-owner-2',
    ownerName: 'Priya Patel',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    ownerAvatarVisible: false,
    name: 'Lake Breeze Luxury Suites',
    tagline: 'Tranquil boutique suites with panoramic lake views',
    description: 'Situated on the banks of Lake Pichola. Enjoy serene waterside candlelit dinners, hand-painted frescoes, and personalized concierge services in romantic Udaipur.',
    city: 'Udaipur',
    state: 'Rajasthan',
    address: '5 Pichola Shore Way',
    status: 'ACTIVE',
    startingPrice: 5500,
    coverImage: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'
    ],
    amenities: ['Lake View', 'Rooftop Terrace', 'Boat Transfer', 'Free Breakfast', 'Free WiFi', 'Butler Service'],
    rating: null
  }
];

export const MOCK_ROOMS = [
  // Hotel 1 Rooms
  {
    id: 'room-101',
    hotelId: 'hotel-1',
    roomType: 'Deluxe Heritage Room',
    description: 'Traditional carved teakwood furnishings with marble ensuite bathroom and courtyard view.',
    capacity: 2,
    bedType: '1 King Bed',
    pricePerNight: 4200,
    status: 'AVAILABLE',
    images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'],
    amenities: ['King Bed', 'AC', 'Free WiFi', 'Courtyard View', 'Smart TV', 'Tea & Coffee Maker']
  },
  {
    id: 'room-102',
    hotelId: 'hotel-1',
    roomType: 'Royal Maharaja Suite',
    description: 'Expansive private living salon, four-poster bed, antique brass chandelier, and deep soaking tub.',
    capacity: 4,
    bedType: '2 King Beds',
    pricePerNight: 7500,
    status: 'AVAILABLE',
    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'],
    amenities: ['Living Room', 'Deep Soaking Tub', 'Panoramic Balcony', 'Express Check-In', 'Butler Access']
  },
  // Hotel 2 Rooms
  {
    id: 'room-201',
    hotelId: 'hotel-2',
    roomType: 'Oceanview Cabana Suite',
    description: 'Floor-to-ceiling glass doors opening onto private sand terrace with direct beach walkway.',
    capacity: 2,
    bedType: '1 Queen Bed',
    pricePerNight: 3800,
    status: 'AVAILABLE',
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'],
    amenities: ['Sea View', 'Private Deck', 'Hammock', 'AC', 'Mini Fridge']
  },
  {
    id: 'room-202',
    hotelId: 'hotel-2',
    roomType: 'Family Beach Villa',
    description: 'Two separate bedrooms, kitchenette, private plunge pool, and shaded veranda.',
    capacity: 5,
    bedType: '2 Queen Beds + 1 Sofa Bed',
    pricePerNight: 8200,
    status: 'AVAILABLE',
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'],
    amenities: ['Private Pool', 'Kitchenette', '2 Bathrooms', 'High-Speed WiFi', 'BBQ Grill']
  },
  // Hotel 3 Rooms
  {
    id: 'room-301',
    hotelId: 'hotel-3',
    roomType: 'Pine View Wooden Chalet',
    description: 'Hand-hewn cedar interiors, personal fireplace, heated bathroom tiles, and orchard views.',
    capacity: 3,
    bedType: '1 King Bed + 1 Daybed',
    pricePerNight: 3100,
    status: 'AVAILABLE',
    images: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80'],
    amenities: ['Stone Fireplace', 'Heated Flooring', 'Balcony', 'Mountain View', 'Hot Water 24/7']
  },
  // Hotel 4 Rooms
  {
    id: 'room-401',
    hotelId: 'hotel-4',
    roomType: 'Lakeside Executive Suite',
    description: 'Unobstructed view of Lake Pichola with arched jharokha window seating and handcrafted rugs.',
    capacity: 2,
    bedType: '1 King Bed',
    pricePerNight: 5500,
    status: 'AVAILABLE',
    images: ['https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80'],
    amenities: ['Lake View Jharokha', 'Bathtub', 'High-Speed WiFi', 'Breakfast Included', 'Fruit Basket']
  }
];

export const MOCK_BOOKINGS = [
  {
    id: 'bk-9021',
    bookingReference: 'SP-2026-9021',
    guestId: 'user-guest-1',
    guestName: 'Rohit Kumar Singh',
    guestEmail: 'rohit@example.com',
    guestPhone: '+91 98765 43210',
    hotelId: 'hotel-2',
    hotelName: 'Azure Palms Beach Resort',
    hotelCity: 'Goa',
    ownerId: 'user-owner-1',
    roomId: 'room-201',
    roomType: 'Oceanview Cabana Suite',
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-13',
    nights: 3,
    guestsCount: 2,
    pricePerNight: 3800,
    subtotal: 11400,
    taxes: 1368, // 12% GST
    totalPrice: 12768,
    status: 'CONFIRMED',
    createdAt: '2026-10-20'
  },
  {
    id: 'bk-8412',
    bookingReference: 'SP-2026-8412',
    guestId: 'user-guest-1',
    guestName: 'Rohit Kumar Singh',
    guestEmail: 'rohit@example.com',
    guestPhone: '+91 98765 43210',
    hotelId: 'hotel-1',
    hotelName: 'The Grand Heritage Palace',
    hotelCity: 'Jaipur',
    ownerId: 'user-owner-1',
    roomId: 'room-101',
    roomType: 'Deluxe Heritage Room',
    checkInDate: '2026-09-05',
    checkOutDate: '2026-09-08',
    nights: 3,
    guestsCount: 2,
    pricePerNight: 4200,
    subtotal: 12600,
    taxes: 1512,
    totalPrice: 14112,
    status: 'COMPLETED',
    createdAt: '2026-08-25'
  }
];
