/**
 * Showcase Data & Dynamic CMS Layer
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'uhhs_showcase_data_v1';

  // Baseline Curated Data for All 17 Properties
  const BASELINE_PROPERTIES = {
    'GOM-201': {
      id: 'GOM-201',
      slug: 'the-dark-blue',
      name: 'The Dark Blue',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 201, 2nd Floor, Vikalp Khand, Gomti Nagar, Chinhat, Lucknow',
      rating: 4.93,
      reviews: 46,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds + Extra Mattresses on request',
      base_price: 3499,
      airbnb_price: 4199,
      cover_image: 'assets/properties/the-dark-blue/cover.jpg',
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // customizable
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: [
          'assets/properties/the-dark-blue/cover.jpg',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80'
        ],
        bathrooms: [
          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80',
          'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80'
        ],
        living_hall: [
          'assets/properties/the-dark-blue/cover.jpg',
          'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80'
        ],
        kitchen: [
          'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'
        ],
        balcony: [
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80'
        ]
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker', 'Power Backup', 'Smart TV with OTT', 'Balcony View'],
      landmarks: [
        { name: 'Max Super Specialty Hospital', time: '5 min' },
        { name: 'Chinhat Tiraha', time: '2 min' },
        { name: 'Lulu Mall', time: '15 min' },
        { name: 'Ekana Cricket Stadium', time: '15 min' },
        { name: 'Lucknow Airport (CCS)', time: '25 min' }
      ],
      description: 'A serene, blue-accented luxury 3BHK flat in prime Vikalp Khand, Gomti Nagar. Complete with spacious air-conditioned bedrooms, modular kitchen, smart entertainment, and 24/7 on-site caretaker assistance.'
    },

    'GOM-302': {
      id: 'GOM-302',
      slug: 'the-unique',
      name: 'The Unique',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 302, 3rd Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.92,
      reviews: 39,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3599,
      airbnb_price: 4299,
      cover_image: 'assets/properties/the-unique/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-unique/cover.jpg', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-unique/cover.jpg', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker', 'Power Backup', 'Smart TV'],
      landmarks: [
        { name: 'Max Hospital', time: '5 min' },
        { name: 'Lulu Mall', time: '15 min' },
        { name: 'Ekana Stadium', time: '15 min' }
      ],
      description: 'Signature luxury flat with curated golden and velvet aesthetics, private balcony overlooking green foliage, and complete home comforts.'
    },

    'GOM-102': {
      id: 'GOM-102',
      slug: 'black-beauty',
      name: 'Black Beauty',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 102, 1st Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.92,
      reviews: 38,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3499,
      airbnb_price: 4199,
      cover_image: 'assets/properties/black-beauty/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/black-beauty/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/black-beauty/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker', 'Power Backup'],
      landmarks: [{ name: 'Max Hospital', time: '5 min' }, { name: 'Lulu Mall', time: '15 min' }],
      description: 'Bold modern interiors with monochrome touches, spacious rooms, and peaceful residential ambience in Gomti Nagar.'
    },

    'GOM-101': {
      id: 'GOM-101',
      slug: 'redrose-palace',
      name: 'RedRose Palace',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 101, 1st Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.90,
      reviews: 41,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3499,
      airbnb_price: 4199,
      cover_image: 'assets/properties/redrose-palace/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/redrose-palace/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/redrose-palace/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker', 'Power Backup'],
      landmarks: [{ name: 'Max Hospital', time: '5 min' }, { name: 'Lulu Mall', time: '15 min' }],
      description: 'Elegantly furnished 3BHK flat featuring rosewood tones, warm ambient lighting, and welcoming family atmosphere.'
    },

    'GOM-202': {
      id: 'GOM-202',
      slug: 'the-brown',
      name: 'The Brown',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 202, 2nd Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.89,
      reviews: 34,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3399,
      airbnb_price: 3999,
      cover_image: 'assets/properties/the-brown/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-brown/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-brown/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Max Hospital', time: '5 min' }, { name: 'Lulu Mall', time: '15 min' }],
      description: 'Earthy brown decor, serene bedrooms with plush mattresses, and hassle-free self check-in assistance.'
    },

    'GOM-301': {
      id: 'GOM-301',
      slug: 'the-light-green',
      name: 'The Light Green',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 301, 3rd Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.89,
      reviews: 27,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3399,
      airbnb_price: 3999,
      cover_image: 'assets/properties/the-light-green/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-light-green/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-light-green/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Max Hospital', time: '5 min' }, { name: 'Lulu Mall', time: '15 min' }],
      description: 'Fresh light green pastel accents, airy open balconies, and quiet surroundings for peaceful workcations or family visits.'
    },

    'GOM-401': {
      id: 'GOM-401',
      slug: 'the-nawabi-stay',
      name: 'The Nawabi Stay',
      type: '3BHK Luxury Flat',
      category: 'flat',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Flat 401, 4th Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.96,
      reviews: 48,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3699,
      airbnb_price: 4399,
      cover_image: 'assets/properties/the-nawabi-stay/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-nawabi-stay/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-nawabi-stay/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker', 'Elevator', 'Power Backup'],
      landmarks: [{ name: 'Max Hospital', time: '5 min' }, { name: 'Lulu Mall', time: '15 min' }],
      description: 'Awadhi royal hospitality infused with modern luxury conveniences. Elevator access and panoramic skyline views.'
    },

    'GOM-501': {
      id: 'GOM-501',
      slug: 'starlight-blue-penthouse',
      name: 'Starlight Blue PentHouse',
      type: 'Luxury PentHouse',
      category: 'penthouse',
      area: 'vikalp',
      area_name: 'Vikalp Khand, Gomti Nagar',
      address: 'Penthouse 501, 5th Floor, Vikalp Khand, Gomti Nagar, Lucknow',
      rating: 4.91,
      reviews: 29,
      max_guests: 12,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds + Terrace Lounge',
      base_price: 4199,
      airbnb_price: 4999,
      cover_image: 'assets/properties/starlight-blue/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vikalp+Khand+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vikalp+Khand+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/starlight-blue/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/starlight-blue/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Private Rooftop Terrace', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Designated Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Max Hospital', time: '5 min' }, { name: 'Lulu Mall', time: '15 min' }],
      description: 'Exclusive top-floor penthouse featuring a private open-air terrace, night skyline views of Lucknow, and lavish lounge furnishings.'
    },

    'VIL-105': {
      id: 'VIL-105',
      slug: 'the-yellow-house',
      name: 'The Yellow House',
      type: 'Independent Villa',
      category: 'villa',
      area: 'vishesh',
      area_name: 'Vishesh Khand 3, Gomti Nagar',
      address: 'Villa 105, Vishesh Khand 3, Gomti Nagar, Lucknow',
      rating: 4.87,
      reviews: 39,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds + Lawn',
      base_price: 3999,
      airbnb_price: 4799,
      cover_image: 'assets/properties/the-yellow-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vishesh+Khand+3+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vishesh+Khand+3+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-yellow-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-yellow-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Private Lawn / Garden', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Private Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Gomti Nagar Railway Station', time: '8 min' }, { name: 'Phoenix Palassio', time: '12 min' }],
      description: 'Charming standalone 3BHK villa with sunlit lawn, quiet upscale neighborhood, and direct garden access.'
    },

    'VIL-104': {
      id: 'VIL-104',
      slug: 'the-green-house',
      name: 'The Green House',
      type: 'Independent Villa',
      category: 'villa',
      area: 'vishesh',
      area_name: 'Vishesh Khand 3, Gomti Nagar',
      address: 'Villa 104, Vishesh Khand 3, Gomti Nagar, Lucknow',
      rating: 4.87,
      reviews: 31,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3899,
      airbnb_price: 4599,
      cover_image: 'assets/properties/the-green-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vishesh+Khand+3+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vishesh+Khand+3+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-green-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-green-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Green Garden', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', 'Private Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Gomti Nagar Railway Station', time: '8 min' }, { name: 'Phoenix Palassio', time: '12 min' }],
      description: 'Lush greenery and serene tranquility right in the heart of Vishesh Khand. Ideal for long-term stays and private family events.'
    },

    'VIL-103': {
      id: 'VIL-103',
      slug: 'the-pink-house',
      name: 'The Pink House',
      type: 'Grand Villa (5BR)',
      category: 'villa',
      area: 'vishesh',
      area_name: 'Vishesh Khand 3, Gomti Nagar',
      address: 'Villa 103, Vishesh Khand 3, Gomti Nagar, Lucknow',
      rating: 4.88,
      reviews: 33,
      max_guests: 15,
      bedrooms: 5,
      bathrooms: 5,
      beds: '5 King Beds',
      base_price: 6499,
      airbnb_price: 7699,
      cover_image: 'assets/properties/the-pink-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vishesh+Khand+3+Gomti+Nagar+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vishesh+Khand+3+Gomti+Nagar+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-pink-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-pink-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['5 Master Bedrooms', 'Large Living Hall', 'Private Courtyard', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water', '24/7 Caretaker'],
      landmarks: [{ name: 'Gomti Nagar Station', time: '8 min' }, { name: 'Lulu Mall', time: '14 min' }],
      description: 'Expansive 5-bedroom luxury estate built for wedding families, delegates, and VIP group gatherings with expansive halls.'
    },

    'VIL-101': {
      id: 'VIL-101',
      slug: 'gomti-grand-villa',
      name: 'Gomti Grand Villa',
      type: 'Luxury Villa (4BHK)',
      category: 'villa',
      area: 'shaheed',
      area_name: 'Geetapuri Colony, Near Lulu Mall',
      address: 'Villa One, Geetapuri Colony, Near Lulu & Palassio Mall, Lucknow',
      rating: 4.95,
      reviews: 52,
      max_guests: 14,
      bedrooms: 4,
      bathrooms: 4,
      beds: '4 King Beds',
      base_price: 5499,
      airbnb_price: 6499,
      cover_image: 'assets/properties/gomti-grand-villa/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Geetapuri+Colony+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Geetapuri+Colony+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/gomti-grand-villa/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/gomti-grand-villa/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Near Lulu & Palassio', '4 Master Bedrooms', 'Spacious Parking', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', '24/7 Caretaker'],
      landmarks: [{ name: 'Lulu Mall', time: '4 min' }, { name: 'Phoenix Palassio', time: '5 min' }, { name: 'Ekana Stadium', time: '6 min' }],
      description: 'Prime 4BHK villa located seconds away from Lulu Mall & Shaheed Path expressway. Ultimate luxury for shopping & match weekends.'
    },

    'VIL-102': {
      id: 'VIL-102',
      slug: 'royal-white-house',
      name: 'Royal White House',
      type: 'Royal Villa',
      category: 'villa',
      area: 'shaheed',
      area_name: 'Near Lulu Mall & Airport',
      address: 'Omaxe City / Shaheed Path, Lucknow',
      rating: 4.94,
      reviews: 36,
      max_guests: 12,
      bedrooms: 4,
      bathrooms: 4,
      beds: '4 King Beds',
      base_price: 5199,
      airbnb_price: 6199,
      cover_image: 'assets/properties/royal-white-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Shaheed+Path+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Shaheed+Path+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/royal-white-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/royal-white-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['White Marble Architecture', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Private Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Lulu Mall', time: '6 min' }, { name: 'Lucknow Airport', time: '18 min' }],
      description: 'Immaculate white-marble villa with modern classical interiors, opulent living areas, and direct airport highway connectivity.'
    },

    'LUL-402': {
      id: 'LUL-402',
      slug: 'celebrity-garden',
      name: 'Celebrity Garden',
      type: '3BHK Premium Flat',
      category: 'flat',
      area: 'shaheed',
      area_name: 'Near Lulu Mall, Shaheed Path',
      address: 'Celebrity Greens, Sushant Golf City, Near Lulu Mall, Lucknow',
      rating: 4.88,
      reviews: 45,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3699,
      airbnb_price: 4399,
      cover_image: 'assets/properties/celebrity-garden/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Sushant+Golf+City+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Sushant+Golf+City+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/celebrity-garden/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/celebrity-garden/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Gated Society Security', 'Swimming Pool & Clubhouse View', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Dedicated Parking'],
      landmarks: [{ name: 'Lulu Mall', time: '5 min' }, { name: 'Medanta Hospital', time: '6 min' }, { name: 'Ekana Stadium', time: '8 min' }],
      description: 'Resort-style gated highrise apartment overlooking manicured gardens, with full access to secure complex amenities.'
    },

    'VIL-107': {
      id: 'VIL-107',
      slug: 'the-velvet-house',
      name: 'The Velvet House',
      type: 'Designer Villa',
      category: 'villa',
      area: 'shaheed',
      area_name: 'Near Lulu Mall & Medanta',
      address: 'Shaheed Path, Near Medanta Hospital, Lucknow',
      rating: 4.91,
      reviews: 35,
      max_guests: 12,
      bedrooms: 4,
      bathrooms: 4,
      beds: '4 King Beds',
      base_price: 4899,
      airbnb_price: 5799,
      cover_image: 'assets/properties/the-velvet-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Medanta+Hospital+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Medanta+Hospital+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-velvet-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-velvet-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Velvet Luxury Furniture', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Private Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Medanta Hospital', time: '4 min' }, { name: 'Lulu Mall', time: '7 min' }],
      description: 'Plush velvet textures, custom ambient lighting, and bespoke interior finishes crafted for guests seeking refined opulence.'
    },

    'VIL-106': {
      id: 'VIL-106',
      slug: 'green-forest',
      name: 'Green Forest View',
      type: 'Boutique Villa',
      category: 'villa',
      area: 'vishesh',
      area_name: 'Vishesh Khand / Chinhat',
      address: 'Vishesh Khand, Gomti Nagar, Lucknow',
      rating: 4.90,
      reviews: 28,
      max_guests: 8,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3499,
      airbnb_price: 4199,
      cover_image: 'assets/properties/the-green-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vishesh+Khand+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vishesh+Khand+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-green-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-green-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Forest/Garden Facing', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Private Parking'],
      landmarks: [{ name: 'Chinhat Lake', time: '5 min' }, { name: 'Max Hospital', time: '8 min' }],
      description: 'Surrounded by tranquil greenery, a peaceful boutique villa designed for quiet relaxation and family downtime.'
    },

    'VIL-108': {
      id: 'VIL-108',
      slug: 'pink-paradise',
      name: 'Pink Paradise Villa',
      type: 'Luxury Villa',
      category: 'villa',
      area: 'vishesh',
      area_name: 'Vishesh Khand, Gomti Nagar',
      address: 'Vishesh Khand, Gomti Nagar, Lucknow',
      rating: 4.91,
      reviews: 26,
      max_guests: 10,
      bedrooms: 3,
      bathrooms: 3,
      beds: '3 King Beds',
      base_price: 3799,
      airbnb_price: 4499,
      cover_image: 'assets/properties/the-pink-house/cover.jpg',
      video_url: '',
      map_link: 'https://maps.google.com/?q=Vishesh+Khand+Lucknow',
      map_embed: 'https://www.google.com/maps?q=Vishesh+Khand+Lucknow&output=embed',
      photos: {
        bedrooms: ['assets/properties/the-pink-house/cover.jpg'],
        bathrooms: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80'],
        living_hall: ['assets/properties/the-pink-house/cover.jpg'],
        kitchen: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
        balcony: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80']
      },
      amenities: ['Aesthetic Pastel Decor', 'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Private Parking', '24/7 Caretaker'],
      landmarks: [{ name: 'Gomti Nagar Station', time: '8 min' }, { name: 'Lulu Mall', time: '14 min' }],
      description: 'Photogenic luxury villa with chic pastel accents, spacious indoor living, and dedicated host support.'
    }
  };

  // Get merged properties (Baseline + LocalStorage + Database cache)
  function getShowcaseProperties() {
    let custom = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) custom = JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading showcase cache:', e);
    }

    const merged = {};
    Object.keys(BASELINE_PROPERTIES).forEach(id => {
      merged[id] = Object.assign({}, BASELINE_PROPERTIES[id], custom[id] || {});
    });
    // Add any completely new custom properties
    Object.keys(custom).forEach(id => {
      if (!merged[id]) merged[id] = custom[id];
    });

    return merged;
  }

  function getShowcaseProperty(idOrSlug) {
    if (!idOrSlug) return null;
    const all = getShowcaseProperties();
    if (all[idOrSlug]) return all[idOrSlug];
    const clean = String(idOrSlug).toLowerCase().replace(/\.html$/, '').replace(/^\/+/, '');
    const found = Object.values(all).find(p => {
      if (!p) return false;
      if (p.id && p.id.toLowerCase() === clean) return true;
      if (p.slug && p.slug.toLowerCase() === clean) return true;
      if (p.slug && clean.includes(p.slug.toLowerCase())) return true;
      return false;
    });
    return found || null;
  }

  // Save property updates
  async function saveShowcaseProperty(id, data) {
    let custom = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) custom = JSON.parse(raw);
    } catch (e) {}

    const existing = getShowcaseProperty(id) || {};
    const updated = Object.assign({}, existing, data, { updatedAt: new Date().toISOString() });
    custom[id] = updated;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // Also persist to Supabase rooms table if available
    if (window.sb) {
      try {
        const payload = {
          rent_per_night: updated.base_price || null,
          max_guests: updated.max_guests || null,
          map_link: updated.map_link || null,
          floor_info: JSON.stringify({
            photos: updated.photos || {},
            video_url: updated.video_url || '',
            amenities: updated.amenities || [],
            landmarks: updated.landmarks || [],
            bedrooms: updated.bedrooms || 3,
            bathrooms: updated.bathrooms || 3,
            beds: updated.beds || '',
            airbnb_price: updated.airbnb_price || null,
            map_embed: updated.map_embed || ''
          })
        };
        await window.sb.from('rooms').update(payload).eq('room_id', id);
      } catch (err) {
        console.warn('Supabase rooms sync warning:', err);
      }
    }

    return updated;
  }

  // Fetch dynamic sync from Supabase rooms table
  async function syncShowcaseFromDatabase() {
    if (!window.sb) return;
    try {
      const { data: rooms, error } = await window.sb.from('rooms').select('*');
      if (error || !rooms) return;

      let custom = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) custom = JSON.parse(raw);
      } catch (e) {}

      let hasChanges = false;
      rooms.forEach(r => {
        if (!r.room_id) return;
        let info = {};
        if (r.floor_info) {
          try {
            info = typeof r.floor_info === 'string' ? JSON.parse(r.floor_info) : r.floor_info;
          } catch (e) {}
        }

        const updates = {};
        if (r.rent_per_night) updates.base_price = Number(r.rent_per_night);
        if (r.max_guests) updates.max_guests = Number(r.max_guests);
        if (r.map_link) updates.map_link = r.map_link;
        if (info.photos) updates.photos = info.photos;
        if (info.video_url) updates.video_url = info.video_url;
        if (info.amenities) updates.amenities = info.amenities;
        if (info.bedrooms) updates.bedrooms = info.bedrooms;
        if (info.bathrooms) updates.bathrooms = info.bathrooms;
        if (info.beds) updates.beds = info.beds;
        if (info.airbnb_price) updates.airbnb_price = info.airbnb_price;
        if (info.map_embed) updates.map_embed = info.map_embed;

        if (Object.keys(updates).length > 0) {
          custom[r.room_id] = Object.assign({}, BASELINE_PROPERTIES[r.room_id] || {}, custom[r.room_id] || {}, updates);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
      }
    } catch (e) {
      console.warn('syncShowcaseFromDatabase error:', e);
    }
  }

  // Expose API globally
  window.ShowcaseData = {
    getProperties: getShowcaseProperties,
    getProperty: getShowcaseProperty,
    saveProperty: saveShowcaseProperty,
    syncFromDatabase: syncShowcaseFromDatabase,
    BASELINE: BASELINE_PROPERTIES
  };

})(window);
