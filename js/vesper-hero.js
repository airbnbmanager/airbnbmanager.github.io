/**
 * Vesper Hero Showcase Controller — All 17 Luxe Properties
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

(function() {
  'use strict';

  // 17 Curated Stays Catalog with Editorial Headlines & Descriptions
  const PROPERTIES_METADATA = [
    {
      slug: 'royal-white-house',
      name: 'Royal White House',
      type: 'Royal Villa · Shaheed Path',
      headline: 'Come find your royal quiet.',
      desc: 'The entire white-marble villa, exclusively yours. 4 luxury suites, private lawn, and 24/7 caretaker near Lulu Mall & Airport.',
      specs: ['👥 Sleeps 12', '🛏️ 4 King Suites', '❄️ 100% AC', '🚗 Free Parking', '✨ Save 15% Direct'],
      price: '₹12,000 / night',
      spaces: [
        { num: '01', name: 'Grand Marble Hall', desc: 'High ceiling, plush seating & chandeliers', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b018acc7-5ccb-440e-8bc0-afbfbb9fb2a0.jpeg?im_w=1200' },
        { num: '02', name: 'Royal Master Suite', desc: 'King bed with warm ambient cove lighting', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b0aaece7-bd13-44a2-a040-1af26e035314.jpeg?im_w=1200' },
        { num: '03', name: 'Regal Guest Suite', desc: 'Spacious second suite with curated art', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/000de00d-6a12-43af-b11b-7fee2265d162.jpeg?im_w=1200' },
        { num: '04', name: 'Designer Marble Bath', desc: 'Glass cubicle & premium chrome fittings', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/05e0ca85-6bbb-4ab3-a47a-1e0f7da73583.jpeg?im_w=1200' },
        { num: '05', name: 'Sunset Terrace & Lawn', desc: 'Open sky panoramic views & lawn', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/7ee5b490-e361-4270-9d5c-516e594f4698.jpeg?im_w=1200' }
      ]
    },
    {
      slug: 'black-beauty',
      name: 'Black Beauty',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Step into bold modern sophistication.',
      desc: 'Monochromatic black-and-wood luxury in Vikalp Khand. Plush leather lounge, smart mood lighting, and curated comforts.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '❄️ 100% AC', '📶 100 Mbps Wi-Fi', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Obsidian Living Lounge', desc: 'Plush sofa suite & ambient lighting' },
        { num: '02', name: 'Executive Master Bedroom', desc: 'King bed with charcoal acoustic wall' },
        { num: '03', name: 'Contemporary Guest Suite', desc: 'Cozy modern bedroom with work desk' },
        { num: '04', name: 'Luxury En-Suite Bath', desc: 'Polished tiles & walk-in shower' },
        { num: '05', name: 'Private Green Balcony', desc: 'Airy balcony overlooking quiet greens' }
      ]
    },
    {
      slug: 'starlight-blue-penthouse',
      name: 'Starlight Blue Penthouse',
      type: '4BHK Panoramic Penthouse · Gomti Nagar',
      headline: 'Elevate your stay above the skyline.',
      desc: 'Opulent top-floor penthouse with sprawling terrace, panoramic city views, and designer starry lighting.',
      specs: ['👥 Sleeps 14', '🛏️ 4 King Suites', '🌆 Panoramic Terrace', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹6,000 / night',
      spaces: [
        { num: '01', name: 'Sky High Grand Living', desc: 'Spacious lounge with city skyline views' },
        { num: '02', name: 'Panorama Master Suite', desc: 'King bed with floor-to-ceiling glass' },
        { num: '03', name: 'Starry Ceiling Suite', desc: 'Ambient starlight cove lighting' },
        { num: '04', name: 'Luxury Spa Bathroom', desc: 'Designer vanity & glass cubicle' },
        { num: '05', name: 'Open Sky Terrace', desc: 'Private rooftop terrace for evening chai' }
      ]
    },
    {
      slug: 'gomti-grand-villa',
      name: 'Gomti Grand Villa',
      type: '4BHK Royal Villa · Gomti Nagar',
      headline: 'Regal sprawling grandeur in Gomti Nagar.',
      desc: 'Expansive private villa with lush courtyards, lavish traditional seating, and unmatched Nawabi hospitality.',
      specs: ['👥 Sleeps 14', '🛏️ 4 Luxury Bedrooms', '🌳 Private Courtyard', '🚗 Dedicated Parking', '✨ Save 15% Direct'],
      price: '₹8,000 / night',
      spaces: [
        { num: '01', name: 'Grand Diwan Living', desc: 'Lavish high-ceiling family lounge' },
        { num: '02', name: 'Maharajah Master Bedroom', desc: 'King size bed with heritage touches' },
        { num: '03', name: 'Royal Guest Room', desc: 'Plush bedding with classic decor' },
        { num: '04', name: 'Classic En-Suite Bath', desc: 'Spacious tiled bath with hot shower' },
        { num: '05', name: 'Green Courtyard Lawn', desc: 'Private front garden & verandah' }
      ]
    },
    {
      slug: 'celebrity-garden',
      name: 'Celebrity Garden',
      type: 'Luxury Farmhouse & Villa · Shaheed Path',
      headline: 'Private garden sanctuary in Lucknow.',
      desc: 'Private estate enveloped in lush greenery, outdoor lawn seating, and complete privacy for families and celebrations.',
      specs: ['👥 Sleeps 15', '🏡 Private Lawn & Gazebo', '🛏️ 4 Bedrooms', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹10,000 / night',
      spaces: [
        { num: '01', name: 'Garden View Living', desc: 'Glass-walled lounge overlooking gardens' },
        { num: '02', name: 'Garden Master Suite', desc: 'King bed with serene lawn vistas' },
        { num: '03', name: 'Verandah Bedroom', desc: 'Cool breeze & garden-facing windows' },
        { num: '04', name: 'Luxury Washroom', desc: 'Clean modern bathroom with amenities' },
        { num: '05', name: 'Outdoor Gazebo & Lawn', desc: 'Expansive grass lawn & sitting area' }
      ]
    },
    {
      slug: 'the-dark-blue',
      name: 'The Dark Blue',
      type: '3BHK Luxury Flat · Vikalp Khand',
      headline: 'Deep oceanic calm in the heart of the city.',
      desc: 'Signature navy and velvet styled apartment with fast Wi-Fi, modular kitchen, and quiet leafy balcony.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '🍳 Modular Kitchen', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Deep Blue Salon', desc: 'Navy blue velvet couch & smart TV' },
        { num: '02', name: 'King Suite Bedroom', desc: 'Plush king bed with warm lamps' },
        { num: '03', name: 'Calming Blue Suite', desc: 'Serene guest bedroom with AC' },
        { num: '04', name: 'Modern Bathroom', desc: 'Spotless tiled bathroom with geyser' },
        { num: '05', name: 'Skyline Balcony', desc: 'Balcony with outdoor seating' }
      ]
    },
    {
      slug: 'the-yellow-house',
      name: 'The Yellow House (Ground Floor)',
      type: '3BHK Flat · Ground Floor · Vishesh Khand',
      headline: 'Warm golden sunshine & soulful comfort.',
      desc: 'Ground floor residence in Vishesh Khand 3 with private green lawn access, sun-drenched interiors, and cheerful aesthetics.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '🏡 Ground Floor Lawn', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹5,500 / night',
      spaces: [
        { num: '01', name: 'Sunlit Yellow Lounge', desc: 'Cheerful yellow sofas & warm vibes' },
        { num: '02', name: 'Golden Glow Bedroom', desc: 'Bright king bedroom with fresh linen' },
        { num: '03', name: 'Family Guest Suite', desc: 'Spacious second bedroom with AC' },
        { num: '04', name: 'Clean Modern Bath', desc: 'Well-appointed bathroom & vanity' },
        { num: '05', name: 'Ground Floor Verandah', desc: 'Quiet sit-out overlooking private greens' }
      ]
    },
    {
      slug: 'the-green-house',
      name: 'The Green House (1st Floor)',
      type: '3BHK Flat · 1st Floor · Vishesh Khand',
      headline: 'Botanical oasis & serene indoor greens.',
      desc: 'First floor residence in Vishesh Khand 3 with earthy tones, natural indoor foliage, peaceful plant balcony, and zen ambiance.',
      specs: ['👥 Sleeps 10', '🌿 Botanical Decor', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹5,500 / night',
      spaces: [
        { num: '01', name: 'Botanical Living Hall', desc: 'Lush potted greenery & soothing decor' },
        { num: '02', name: 'Zen Forest Bedroom', desc: 'Calming king suite with garden art' },
        { num: '03', name: 'Emerald Guest Suite', desc: 'Comfortable air-conditioned bedroom' },
        { num: '04', name: 'Modern Bath', desc: 'Sparkling clean bathroom with hot water' },
        { num: '05', name: 'Plant Lover Balcony', desc: 'Green corner balcony with fresh air' }
      ]
    },
    {
      slug: 'the-pink-house',
      name: 'The Pink House (2nd & 3rd Floor)',
      type: '5BR Duplex Penthouse · Vishesh Khand',
      headline: 'Blush pastels, bohemian charm & romance.',
      desc: 'Exclusive 2-level Duplex Penthouse across 2nd & 3rd floors in Vishesh Khand 3. 5 king suites, boho lounge, and open sky sunset balcony.',
      specs: ['👥 Sleeps 15', '🏛️ 5 King Suites', '🌸 Duplex Penthouse', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹9,000 / night',
      spaces: [
        { num: '01', name: 'Blush Velvet Salon', desc: 'Rose gold lighting & pastel lounge' },
        { num: '02', name: 'Pastel Dream Bedroom', desc: 'Romantic king suite with soft hues' },
        { num: '03', name: 'Cozy Reading Suite', desc: 'Quiet aesthetic bedroom for rest' },
        { num: '04', name: 'Marble Bathroom', desc: 'Clean fittings & ambient mirror' },
        { num: '05', name: 'Rooftop Sunset Balcony', desc: 'Elevated terrace view of Vishesh Khand' }
      ]
    },
    {
      slug: 'the-light-green',
      name: 'The Light Green',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Fresh sage breeze & minimalist tranquility.',
      desc: 'Clean Scandinavian lines paired with soft sage tones and airy spacious rooms in Chinhat.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '❄️ 100% AC', '📶 100 Mbps Wi-Fi', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Sage Minimalist Hall', desc: 'Airy open living with soft tones' },
        { num: '02', name: 'Peaceful King Suite', desc: 'Uncluttered master bedroom' },
        { num: '03', name: 'Nordic Guest Suite', desc: 'Second queen suite with desk' },
        { num: '04', name: 'Clean Washroom', desc: 'Spotless bathroom with shower' },
        { num: '05', name: 'Fresh Air Balcony', desc: 'Overlooking quiet neighborhood' }
      ]
    },
    {
      slug: 'the-velvet-house',
      name: 'The Velvet House (1st Floor)',
      type: '3BHK Flat · 1st Floor · Near Lulu Mall & Medanta',
      headline: 'Plush royal textures & evening elegance.',
      desc: 'Rich velvet furnishings, deep mood lighting, and supreme comfort in Gomti Nagar.',
      specs: ['👥 Sleeps 10', '🛋️ Velvet Lounge', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Velvet Lounge Salon', desc: 'Plush royal velvet upholstery' },
        { num: '02', name: 'Royale Master Suite', desc: 'Deep comfort king size bed' },
        { num: '03', name: 'Velvet Guest Suite', desc: 'Curated cozy guest bedroom' },
        { num: '04', name: 'Designer Bath', desc: 'Polished bathroom with amenities' },
        { num: '05', name: 'Evening Balcony', desc: 'Cozy balcony for twilight coffee' }
      ]
    },
    {
      slug: 'redrose-palace',
      name: 'Redrose Palace',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Opulent palace grandeur & timeless romance.',
      desc: 'Rich crimson accents, grand chandeliers, and regal Nawabi comfort for memorable stays.',
      specs: ['👥 Sleeps 10', '🌹 Palace Interiors', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Crimson Palace Hall', desc: 'Chandelier lit regal lounge' },
        { num: '02', name: 'Royal Rose Bedroom', desc: 'King bed with plush red accents' },
        { num: '03', name: 'Classic Guest Suite', desc: 'Spacious second bedroom with AC' },
        { num: '04', name: 'Marble Bath', desc: 'Spotless tiled bathroom' },
        { num: '05', name: 'Grand Balcony', desc: 'Open terrace view of the city' }
      ]
    },
    {
      slug: 'the-nawabi-stay',
      name: 'The Nawabi Stay',
      type: '3BHK Heritage Flat · Gomti Nagar',
      headline: 'Authentic royal Awadhi heritage hospitality.',
      desc: 'Experience traditional Lakhnawi art, heritage architecture, and warm personalized care.',
      specs: ['👥 Sleeps 10', '👑 Awadhi Heritage', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Awadhi Heritage Baithak', desc: 'Traditional royal diwan seating' },
        { num: '02', name: 'Nawabi Diwan Bedroom', desc: 'Ornate king suite with heritage art' },
        { num: '03', name: 'Shahi Guest Suite', desc: 'Comfortable guest bedroom with AC' },
        { num: '04', name: 'Clean Modern Bath', desc: 'Modern bathroom with hot water' },
        { num: '05', name: 'Courtyard View Balcony', desc: 'Peaceful balcony with tree views' }
      ]
    },
    {
      slug: 'the-unique',
      name: 'The Unique',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Our signature original boutique home.',
      desc: 'The pioneer flat of The Unique Haven Homes, impeccably maintained with 4.9+ rating.',
      specs: ['👥 Sleeps 10', '⭐ 4.9+ Top Rated', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹5,500 / night',
      spaces: [
        { num: '01', name: 'Signature Living Room', desc: 'Timeless comfort with smart TV' },
        { num: '02', name: 'Prime Master Bedroom', desc: 'Generous king bed & wardrobe' },
        { num: '03', name: 'Curated Guest Suite', desc: 'Bright second bedroom with AC' },
        { num: '04', name: 'Modern Bathroom', desc: 'Spotless vanity & glass partition' },
        { num: '05', name: 'Sunset Balcony', desc: 'Open view facing west sunset' }
      ]
    },
    {
      slug: 'the-brown',
      name: 'The Brown',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Warm teakwood warmth & timeless luxury.',
      desc: 'Rich walnut and teakwood accents, earthy textures, and an ultra-cozy ambiance.',
      specs: ['👥 Sleeps 10', '🪵 Teakwood Interiors', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Teakwood Living Salon', desc: 'Warm wooden panelling & soft sofa' },
        { num: '02', name: 'Warm Walnut Bedroom', desc: 'Wood accented king suite' },
        { num: '03', name: 'Earthy Guest Suite', desc: 'Minimal cozy second suite' },
        { num: '04', name: 'Modern Bath', desc: 'Tiled bathroom with instant geyser' },
        { num: '05', name: 'Relaxing Balcony', desc: 'Quiet evening sit-out balcony' }
      ]
    },
    {
      slug: 'green-forest',
      name: 'Green Forest (2nd Floor)',
      type: '3BHK Flat · 2nd Floor · Near Lulu Mall & Medanta',
      headline: 'Deep woodland tranquility & fresh greenery.',
      desc: 'Surrounded by green treetops, offering quiet bird songs and serene family living.',
      specs: ['👥 Sleeps 10', '🌲 Forest Vibe', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Pine Living Lounge', desc: 'Natural forest hues & calm ambiance' },
        { num: '02', name: 'Canopy Master Suite', desc: 'Tree-facing master bedroom' },
        { num: '03', name: 'Woodland Bedroom', desc: 'Comfortable guest bedroom with AC' },
        { num: '04', name: 'Fresh Bath', desc: 'Clean modern bathroom' },
        { num: '05', name: 'Tree Canopy Balcony', desc: 'Balcony tucked in green treetops' }
      ]
    },
    {
      slug: 'pink-paradise',
      name: 'Pink Paradise (3rd Floor)',
      type: '3BHK Flat · 3rd Floor · Near Lulu Mall & Medanta',
      headline: 'Soft pastel dreams & joyful celebration.',
      desc: 'Candy pastels, photogenic selfie corners, and relaxed lounge seating for group trips.',
      specs: ['👥 Sleeps 10', '📸 Highly Photogenic', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Paradise Pink Living', desc: 'Vibrant pastel lounge with photo spots' },
        { num: '02', name: 'Dreamy Pastel Bedroom', desc: 'Playful pastel master bedroom' },
        { num: '03', name: 'Candy Guest Suite', desc: 'Air-conditioned cozy guest room' },
        { num: '04', name: 'Clean Bath', desc: 'Fresh bathroom with modern amenities' },
        { num: '05', name: 'Skyline Balcony', desc: 'Open sky balcony with fresh breeze' }
      ]
    },
    {
      slug: 'the-luxe-haven',
      name: 'The Luxe Haven',
      type: '1BHK Luxury Flat · Near Lulu Mall & Medanta',
      headline: 'Chic modern comfort near Lulu Mall.',
      desc: 'Designer 1BHK apartment in Sushant Golf City, Shaheed Path. 3 mins from Lulu Mall & Medanta Hospital. Perfect for couples, solos & medical visits.',
      specs: ['👥 Sleeps 3', '🛍️ Near Lulu Mall', '🛏️ 1 Queen Bed', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹2,650 / night',
      spaces: [
        { num: '01', name: 'Luxe Living Lounge', desc: 'Plush sofa, smart TV and ambient lighting', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/9e54eada-f3d7-4094-bf87-e46248f6b907.jpeg?im_w=1200' },
        { num: '02', name: 'Master Bedroom Suite', desc: 'Serene queen bed with acoustic panel', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/230e0bec-09da-4aa3-bdeb-952ffaf16a95.jpeg?im_w=1200' },
        { num: '03', name: 'Modular Kitchenette', desc: 'Equipped kitchen with cooktop & fridge', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/b307b002-96f8-4527-8ebf-2199960f4f97.jpeg?im_w=1200' },
        { num: '04', name: 'Designer En-Suite Bath', desc: 'Spotless tiled bathroom with geyser', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/cfa21df6-ee64-4a66-a975-2348ea78b978.jpeg?im_w=1200' },
        { num: '05', name: 'Golf City Balcony', desc: 'Open airy balcony overlooking greens', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/57006148-e8a8-4b3e-ae49-86fe3194f290.jpeg?im_w=1200' }
      ]
    }
  ];

  let currentProperty = PROPERTIES_METADATA[0]; // Default: Royal White House
  let currentRoomIndex = 0;
  let autoTimer = null;
  let activeRoomData = [];

    const STATIC_HERO_CDN_MAP = {
  "royal-white-house": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b018acc7-5ccb-440e-8bc0-afbfbb9fb2a0.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b0aaece7-bd13-44a2-a040-1af26e035314.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/000de00d-6a12-43af-b11b-7fee2265d162.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/05e0ca85-6bbb-4ab3-a47a-1e0f7da73583.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/7ee5b490-e361-4270-9d5c-516e594f4698.jpeg"
  ],
  "black-beauty": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1676840617430941240/original/326ef6d2-fcf2-4f91-816a-324b20f17c90.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1676840617430941240/original/40a7542e-49e3-4795-9c52-722ece22d507.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1676840617430941240/original/54e75f1f-f1d0-4d26-a837-6456d65733e0.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1676840617430941240/original/6b5a0b95-49ba-4bdf-8bfc-a04099cb3bcf.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1676840617430941240/original/855cdc0b-9518-422c-901b-55eb52fcd17e.jpeg"
  ],
  "starlight-blue-penthouse": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718385679817913835/original/36832290-6cd4-411c-9dc4-3a226c4996aa.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718385679817913835/original/ba78dacc-e830-43e4-814b-9b61f69aa30f.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718385679817913835/original/1de3151e-4017-4e66-931a-bf5c6d82e279.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718385679817913835/original/694c0249-5067-4cf5-9ff7-dbe246ad2f12.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1718385679817913835/original/5a32ad11-e0cb-4acd-a843-459e64ff02c8.jpeg"
  ],
  "gomti-grand-villa": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1721732716374002170/original/629f9f69-b45c-448a-adf5-c3f3c90e473f.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1721732716374002170/original/b691bd0f-5484-4072-8f72-a27f291245fe.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1721732716374002170/original/10d718f9-00e1-4b21-83cb-3dfdaaf9716d.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1721732716374002170/original/13872656-cf94-465a-b86e-3e0852acd64c.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1721732716374002170/original/cb775969-8b4f-4518-86fb-abd5c7706316.jpeg"
  ],
  "celebrity-garden": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1606514664948608755/original/0b9b2824-4c0b-4d3f-a9dd-9617a5fe9fef.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1606514664948608755/original/2af43354-2ddd-4517-bc22-eabe3918c757.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1606514664948608755/original/ae60a91c-7f09-45a5-b90a-435ecdcb1586.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1606514664948608755/original/6b80309a-9f1e-456c-beed-115f5f63dbd0.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1606514664948608755/original/31b3837b-8da7-4775-aadf-9a1613480600.jpeg"
  ],
  "the-dark-blue": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/c84e509a-1192-4491-891b-8dda32439a38.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/b7c18bba-6858-4a28-9b7c-e3e4b82bf286.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/fbf2311b-453f-43e1-9bb2-c84d0fa21f5a.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/47377480-37cd-4620-b209-953945268f66.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/52098d91-6014-4e46-aa45-38b655a54ce2.jpeg"
  ],
  "the-yellow-house": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729918855637425/original/f9826cd1-b559-468f-bc68-754a745af7a2.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729918855637425/original/b7b73c4b-426f-449e-9425-69512952e4f0.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729918855637425/original/0755b1e1-a906-4580-8e58-22a60483dbd7.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729918855637425/original/b9253007-a9fe-42b5-be12-c0b3e387fa00.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729918855637425/original/25fa1513-8849-4271-b31c-4f59460b2e14.jpeg"
  ],
  "the-green-house": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1593461780265937816/original/e4aeba29-3327-4d9d-947d-027276431158.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1593461780265937816/original/d3b5c132-d78c-4f77-bbf8-9a732284c534.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1593461780265937816/original/5dc1db8f-c752-4bbf-914e-559035d2c438.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1593461780265937816/original/ce72d226-e2ee-4069-82e6-9618d2843a42.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1593461780265937816/original/fb03da06-543e-4106-997e-8d9e8c1cd7e4.png"
  ],
  "the-pink-house": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729438969718723/original/5eed388d-c76b-4210-b6be-67ff8128e6c3.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729438969718723/original/09bcdb15-c559-42a5-885e-2c50cfb23729.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729438969718723/original/246d18d9-17c8-4621-84e3-91b1f2267320.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729438969718723/original/56973972-20fb-47ea-b3b4-90334ac09fed.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1592729438969718723/original/8cbc5cc4-f36f-4a65-a97a-859536cc2e3d.jpeg"
  ],
  "the-nawabi-stay": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1723434530455939144/original/b26d5cbe-e200-4dab-b5de-1df652648823.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1723434530455939144/original/19d0bbce-0c98-492e-952b-c10553d393cb.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1723434530455939144/original/d52d2aca-344d-4ea4-a0e6-f5eb65d8f70d.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1723434530455939144/original/c25903a0-7522-421f-8e74-f90b65fa98b4.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1723434530455939144/original/bf98e041-4eec-430a-aca2-1ca45f5555a9.jpeg"
  ],
  "redrose-palace": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835347/original/cbc0aaab-4039-4892-ba03-f18c24a603c9.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835347/original/c1c97684-85a2-4cfd-91ad-a4b9bde801e2.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835347/original/830194ad-c826-4256-be97-b95e378a43e7.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835347/original/4b431516-76cd-44d9-b592-a1b671be2d4f.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835347/original/24d293ba-2ba4-45b9-b142-d3e903cd3806.jpeg"
  ],
  "the-unique": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679190202218939181/original/e7e05026-ef33-4d97-bc0c-67d6511ec019.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679190202218939181/original/b24326d2-da74-4ede-a819-03c13711978c.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679190202218939181/original/7c4c5b8e-bb36-42d8-b66e-0f01fe126206.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679190202218939181/original/14e4b185-29b1-49ef-afa2-df288635f99c.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679190202218939181/original/71429765-3683-48e7-86c4-8065f9f31bc8.jpeg"
  ],
  "the-light-green": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679155811558485410/original/449695a8-7535-445c-8d6d-c2d521b559cb.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679155811558485410/original/fdd3f5b8-bc23-4f63-af9b-c211e2bd56db.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679155811558485410/original/5eebbf39-3db8-4f9f-8c2d-bf30aa316c44.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679155811558485410/original/a1da7e9e-f06c-4ad7-bdc6-2c6ab095f64c.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1679155811558485410/original/a8e2716f-5ffa-4978-87f3-b35477505acd.jpeg"
  ],
  "the-brown": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1660898784168880636/original/607ac848-e36e-467b-b476-36d273fff7a3.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1660898784168880636/original/34ae28d7-de47-4692-be5c-2cdd24191f8f.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1660898784168880636/original/a1609d3d-630e-4ac4-9195-9d8b397182e9.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1660898784168880636/original/ec1ddb72-c95e-4ca3-b47b-f4c931a15dc1.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1660898784168880636/original/8bf16db1-7d33-4c70-9252-d518f403af7f.jpeg"
  ],
  "green-forest": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1739254108962193705/original/d21e46f9-ae62-44f7-b6b7-b06e40bbca2a.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1739254108962193705/original/ca222e0a-c45b-498d-ad12-d498cad8f27c.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1739254108962193705/original/05f853fb-9c77-40e9-9d10-6c318bbbcc1e.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1739254108962193705/original/2838a976-bb30-4d6d-a9e2-234b5e2e2514.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1739254108962193705/original/cebfeea0-d729-4e33-aadd-c779ab5478a5.jpeg"
  ],
  "pink-paradise": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1756799939825259443/original/9a60a7dc-d6ee-47f5-84e2-7437cbe5cfeb.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1756799939825259443/original/7cb934c8-1e83-4e07-b6a9-d0ba8ca10dd5.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1756799939825259443/original/326708dd-c9e6-42d6-9a3d-d02fee8593c8.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1756799939825259443/original/cb269593-f3a3-4058-a10b-b293e6cd25fc.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1756799939825259443/original/936ceb8b-aebc-4cfb-9d45-700bf5f9f6d9.jpeg"
  ],
  "the-velvet-house": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1727830063287100082/original/5b61ab54-ed1d-4610-90b7-91a9ae4390a3.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1727830063287100082/original/e3213846-072d-45fb-9c3b-4d01825ed1d6.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1727830063287100082/original/499e1288-0607-44aa-90d1-549a1cc27af3.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1727830063287100082/original/36fec03e-1a44-45e3-bbe3-39ec1acd1122.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1727830063287100082/original/86d87e7a-1c45-43ba-8c20-d4966a591dbd.jpeg"
  ],
  "the-luxe-haven": [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/9e54eada-f3d7-4094-bf87-e46248f6b907.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/230e0bec-09da-4aa3-bdeb-952ffaf16a95.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/5a7c9c80-dae3-4fe0-a770-21b32900d277.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/cfa21df6-ee64-4a66-a975-2348ea78b978.jpeg",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-1798067011361845302/original/6c7c38f8-e523-4e4e-bbdc-cfbf6b699ef5.jpeg"
  ]
};

  function getPropertyImages(slug) {
    const db = window.UHH_PHOTO_DB && window.UHH_PHOTO_DB[slug];
    const localCover = `assets/properties/${slug}/cover.jpg`;

    if (db && db.categories) {
      const living = (db.categories.living_hall && db.categories.living_hall[0]) || localCover;
      const bed1 = (db.categories.bedrooms && db.categories.bedrooms[0]) || living;
      const bed2 = (db.categories.bedrooms && db.categories.bedrooms[1]) || bed1;
      const bath = (db.categories.bathrooms && db.categories.bathrooms[0]) || bed1;
      const balcony = (db.categories.balcony && db.categories.balcony[0]) || (db.photos && db.photos[4]) || living;
      return [living, bed1, bed2, bath, balcony];
    }

    if (STATIC_HERO_CDN_MAP[slug]) {
      return STATIC_HERO_CDN_MAP[slug];
    }

    return [localCover, localCover, localCover, localCover, localCover];
  }

  function loadProperty(propSlug) {
    const prop = PROPERTIES_METADATA.find(p => p.slug === propSlug) || PROPERTIES_METADATA[0];
    currentProperty = prop;
    currentRoomIndex = 0;

    // Check if live CRM rate is available
    let displayPrice = prop.price;
    if (window.UHH_LIVE_RATES) {
      const live = window.UHH_LIVE_RATES[prop.slug];
      if (live && live.base_price) {
        displayPrice = '₹' + Number(live.base_price).toLocaleString('en-IN') + ' / night';
      }
    }

    const images = getPropertyImages(prop.slug);
    const localCover = `assets/properties/${prop.slug}/cover.jpg`;

    activeRoomData = prop.spaces.map((sp, idx) => ({
      num: sp.num,
      name: sp.name,
      desc: sp.desc,
      image: sp.image || images[idx] || localCover,
      fallback: localCover
    }));

    // Update Editorial Text
    const headlineEl = document.querySelector('.vesper-headline');
    if (headlineEl) {
      headlineEl.innerHTML = prop.headline.replace(/(\b[a-zA-Z]+[.?!]?$)/, '<em>$1</em>');
    }

    const subcopyEl = document.querySelector('.vesper-subcopy');
    if (subcopyEl) {
      subcopyEl.innerHTML = `${prop.desc} <strong>From ${displayPrice}</strong> (Save 15% via direct booking).`;
    }

    // Update Specs Pills
    const specRow = document.querySelector('.vesper-spec-row');
    if (specRow) {
      specRow.innerHTML = prop.specs.map(s => {
        const isHighlight = s.includes('Save 15%');
        return `<span class="vesper-pill ${isHighlight ? 'highlight' : ''}">${s}</span>`;
      }).join('');
    }

    // Update Action Buttons
    const btnExplore = document.getElementById('vesperExploreVillaBtn') || document.querySelector('.vesper-btn-secondary');
    if (btnExplore) {
      btnExplore.href = `${prop.slug}.html`;
      btnExplore.innerHTML = `🏛️ ${prop.name} Details`;
    }

    const navBookBtn = document.querySelector('.vesper-btn-book');
    if (navBookBtn) {
      navBookBtn.href = `book.html?property=${prop.slug}`;
    }

    if (typeof updateBookingWidgetLink === 'function') {
      updateBookingWidgetLink();
    }

    // Render Background Slides
    const viewport = document.getElementById('vesperBgViewport');
    if (viewport) {
      viewport.innerHTML = '';
      activeRoomData.forEach((room, idx) => {
        const slide = document.createElement('div');
        slide.className = `vesper-bg-slide ${idx === 0 ? 'active' : ''}`;
        slide.id = `vesperSlide_${idx}`;
        slide.style.backgroundImage = `url('${room.image}')`;
        if (room.fallback && room.fallback !== room.image) {
          const testImg = new Image();
          testImg.src = room.image;
          testImg.onerror = () => {
            slide.style.backgroundImage = `url('${room.fallback}')`;
          };
        }
        viewport.appendChild(slide);
      });
    }

    // Render Flight Stepper Items
    const stepsList = document.getElementById('vesperStepsList');
    if (stepsList) {
      stepsList.innerHTML = '';
      activeRoomData.forEach((room, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `vesper-step-item ${idx === 0 ? 'active' : ''}`;
        btn.setAttribute('aria-label', `Navigate to ${room.name}`);
        btn.onclick = () => {
          goToRoom(idx);
          restartTimer();
        };

        btn.innerHTML = `
          <div class="vesper-step-bullet">${room.num}</div>
          <div class="vesper-step-info">
            <span class="vesper-step-name">${room.name}</span>
            <span class="vesper-step-desc">${room.desc}</span>
          </div>
        `;
        stepsList.appendChild(btn);
      });
    }

    // Reset Counter
    const activeNumEl = document.getElementById('vesperActiveNum');
    if (activeNumEl) {
      activeNumEl.textContent = '01';
    }

    restartTimer();
  }

  function goToRoom(index) {
    if (index < 0 || index >= activeRoomData.length) return;
    currentRoomIndex = index;

    // Update slides
    const slides = document.querySelectorAll('.vesper-bg-slide');
    slides.forEach((s, idx) => {
      if (idx === index) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    // Update stepper buttons
    const steps = document.querySelectorAll('.vesper-step-item');
    steps.forEach((st, idx) => {
      if (idx === index) {
        st.classList.add('active');
      } else {
        st.classList.remove('active');
      }
    });

    // Update Counter
    const activeNumEl = document.getElementById('vesperActiveNum');
    if (activeNumEl && activeRoomData[index]) {
      activeNumEl.textContent = activeRoomData[index].num;
    }
  }

  function startAutoCycle() {
    stopAutoCycle();
    autoTimer = setInterval(() => {
      if (activeRoomData.length === 0) return;
      const next = (currentRoomIndex + 1) % activeRoomData.length;
      goToRoom(next);
    }, 6000);
  }

  function stopAutoCycle() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function restartTimer() {
    stopAutoCycle();
    startAutoCycle();
  }

  function initVesperHero() {
    // 1. Populate Property Picker Dropdown in Tag Bar
    const tagWrap = document.querySelector('.vesper-tag-bar') || document.querySelector('.vesper-tag');
    if (tagWrap) {
      tagWrap.className = 'vesper-tag-bar';
      tagWrap.innerHTML = `
        <span class="vesper-tag-label">⭐ FEATURED STAY:</span>
        <select id="vesperPropertySelect" class="vesper-property-picker" aria-label="Select Villa Showcase">
          ${PROPERTIES_METADATA.map(p => `
            <option value="${p.slug}" ${p.slug === 'royal-white-house' ? 'selected' : ''}>
              ${p.name} (${p.type.split('·')[0].trim()})
            </option>
          `).join('')}
        </select>
      `;

      const selectEl = document.getElementById('vesperPropertySelect');
      if (selectEl) {
        selectEl.addEventListener('change', function(e) {
          loadProperty(e.target.value);
        });
      }
    }

    // 2. Connect Search Input to Directory Filters
    const vesperInput = document.getElementById('vesperSearchInput');
    const mainSearchInput = document.getElementById('propertySearchInput');
    if (vesperInput && mainSearchInput) {
      vesperInput.addEventListener('input', function(e) {
        mainSearchInput.value = e.target.value;
        if (typeof window.applyFilters === 'function') {
          window.applyFilters();
        }
      });
      vesperInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          scrollToDirectory();
        }
      });
    }

    // 3. Connect Location Selector
    const vesperLocation = document.getElementById('vesperLocationSelect');
    const mainLocation = document.getElementById('locationSelect');
    if (vesperLocation && mainLocation) {
      vesperLocation.addEventListener('change', function(e) {
        mainLocation.value = e.target.value;
        if (typeof window.applyFilters === 'function') {
          window.applyFilters();
        }
        scrollToDirectory();
      });
    }

    // 4. Initial load with Royal White House
    loadProperty('royal-white-house');

    // 5. Initialize Advanced Motion & Interactivity
    initBookingWidget();
    initTypewriter();
    initScrollReveal();
    initSpacesLightbox();
    initSpacesProgressBar();
    initHeroImageExpansionBlend();
    initStickyScrollRooms();
    initCollectionFilter();
    initStickyMobileBar();
    initClickableMedia();
    initOmniSearch();
  }

  // ── Centralized Booking Widget Sync (Zero Duplicates) ──
  function updateBookingWidgetLink() {
    const submitBtn = document.getElementById('vesperSubmitBtn');
    const ciInput = document.getElementById('vesperCheckIn');
    const coInput = document.getElementById('vesperCheckOut');
    const guestSelect = document.getElementById('vesperGuests');
    const propSelect = document.getElementById('vesperPropertySelect');

    const prop = propSelect ? propSelect.value : 'royal-white-house';
    const ci = ciInput ? ciInput.value : '';
    const co = coInput ? coInput.value : '';
    const guests = guestSelect ? guestSelect.value : '12';

    if (submitBtn) {
      submitBtn.href = `book.html?property=${encodeURIComponent(prop)}&checkin=${encodeURIComponent(ci)}&checkout=${encodeURIComponent(co)}&guests=${encodeURIComponent(guests)}`;
    }
  }

  function initBookingWidget() {
    const ciInput = document.getElementById('vesperCheckIn');
    const coInput = document.getElementById('vesperCheckOut');
    const guestSelect = document.getElementById('vesperGuests');
    const propSelect = document.getElementById('vesperPropertySelect');

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = tmrw.toISOString().slice(0, 10);

    if (ciInput) {
      ciInput.min = todayStr;
      if (!ciInput.value) ciInput.value = todayStr;
      ciInput.addEventListener('change', function() {
        if (coInput && coInput.value <= ciInput.value) {
          const nextDay = new Date(ciInput.value);
          nextDay.setDate(nextDay.getDate() + 1);
          coInput.value = nextDay.toISOString().slice(0, 10);
          coInput.min = nextDay.toISOString().slice(0, 10);
        }
        updateBookingWidgetLink();
      });
    }

    if (coInput) {
      coInput.min = tmrwStr;
      if (!coInput.value) coInput.value = tmrwStr;
      coInput.addEventListener('change', updateBookingWidgetLink);
    }

    if (guestSelect) guestSelect.addEventListener('change', updateBookingWidgetLink);
    if (propSelect) propSelect.addEventListener('change', updateBookingWidgetLink);

    updateBookingWidgetLink();
  }

  // ── 5. TYPEWRITER EFFECT (Company Branding & 17 Stays) ──
  const TYPEWRITER_PHRASES = [
    "The Unique Haven Homes · 17 Curated Stays in Lucknow.",
    "Presidential Villas, Skyline Penthouses & 3BHK Suites.",
    "Save 15% booking direct with verified Superhosts.",
    "Royal White House · Flagship presidential residence."
  ];

  function initTypewriter() {
    const el = document.getElementById('vesperTypewriter');
    if (!el) return;
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function typeLoop() {
      const currentPhrase = TYPEWRITER_PHRASES[phraseIdx];
      if (isDeleting) {
        el.textContent = currentPhrase.substring(0, charIdx - 1);
        charIdx--;
      } else {
        el.textContent = currentPhrase.substring(0, charIdx + 1);
        charIdx++;
      }

      let speed = isDeleting ? 28 : 55;

      if (!isDeleting && charIdx === currentPhrase.length) {
        speed = 2200; // Pause at end of sentence
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % TYPEWRITER_PHRASES.length;
        speed = 450;
      }

      setTimeout(typeLoop, speed);
    }
    typeLoop();
  }

  // ── 6. SCROLL REVEAL INTERSECTION OBSERVER ──
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.vesper-reveal');
    if (!reveals.length) return;

    if (!('IntersectionObserver' in window)) {
      reveals.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.12
    });

    reveals.forEach(el => observer.observe(el));
  }

  // ── 7. INTERACTIVE LIGHTBOX MODAL (Airbnb / 21st.dev Style) ──
  let lightboxPhotos = [];
  let currentLightboxIdx = 0;

  function initSpacesLightbox() {
    const cards = document.querySelectorAll('.vesper-space-card');
    if (!cards.length) return;

    lightboxPhotos = Array.from(cards).map(card => {
      const img = card.querySelector('img');
      const tag = card.querySelector('.vesper-space-tag')?.textContent || 'SPACE';
      const name = card.querySelector('.vesper-space-name')?.textContent || 'Villa Suite';
      return {
        src: img ? img.src : '',
        tag: tag,
        name: name
      };
    });

    cards.forEach((card, idx) => {
      card.addEventListener('click', () => openLightbox(idx));
      const media = card.querySelector('.vesper-space-media');
      if (media && !media.querySelector('.vesper-space-zoom-hint')) {
        const hint = document.createElement('div');
        hint.className = 'vesper-space-zoom-hint';
        hint.innerHTML = '<span>🔍 View Photo</span>';
        media.appendChild(hint);
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      const lb = document.getElementById('vesperLightbox');
      if (!lb || !lb.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
    });
  }

  function openLightbox(index) {
    let lb = document.getElementById('vesperLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'vesperLightbox';
      lb.className = 'vesper-lightbox';
      lb.innerHTML = `
        <div class="vesper-lightbox-header">
          <div class="vesper-lightbox-title-wrap">
            <span class="vesper-lightbox-tag" id="lbTag">THE SPACES</span>
            <h3 class="vesper-lightbox-title" id="lbTitle">Villa Walkthrough</h3>
          </div>
          <button class="vesper-lightbox-close" onclick="closeLightbox()" aria-label="Close photo viewer">✕</button>
        </div>
        <div class="vesper-lightbox-stage">
          <button class="vesper-lightbox-nav-btn vesper-lightbox-prev" onclick="prevLightbox()" aria-label="Previous photo">‹</button>
          <img id="lbImg" class="vesper-lightbox-img" src="" alt="Villa Space High-Res">
          <button class="vesper-lightbox-nav-btn vesper-lightbox-next" onclick="nextLightbox()" aria-label="Next photo">›</button>
        </div>
        <div class="vesper-lightbox-footer">
          <div class="vesper-lightbox-counter" id="lbCounter">01 / 05</div>
          <a class="vesper-lightbox-btn-book" href="book.html?property=royal-white-house">⚡ Reserve This Villa</a>
        </div>
      `;
      document.body.appendChild(lb);

      lb.addEventListener('click', (e) => {
        if (e.target === lb || e.target.classList.contains('vesper-lightbox-stage')) {
          closeLightbox();
        }
      });
    }

    currentLightboxIdx = index;
    updateLightboxUI();
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function updateLightboxUI() {
    if (!lightboxPhotos.length) return;
    const item = lightboxPhotos[currentLightboxIdx];
    const imgEl = document.getElementById('lbImg');
    const tagEl = document.getElementById('lbTag');
    const titleEl = document.getElementById('lbTitle');
    const counterEl = document.getElementById('lbCounter');

    if (imgEl) {
      imgEl.style.opacity = '0';
      imgEl.src = item.src;
      setTimeout(() => { imgEl.style.opacity = '1'; }, 80);
    }
    if (tagEl) tagEl.textContent = item.tag;
    if (titleEl) titleEl.textContent = item.name;
    if (counterEl) counterEl.textContent = `0${currentLightboxIdx + 1} / 0${lightboxPhotos.length}`;
  }

  function nextLightbox() {
    currentLightboxIdx = (currentLightboxIdx + 1) % lightboxPhotos.length;
    updateLightboxUI();
  }

  function prevLightbox() {
    currentLightboxIdx = (currentLightboxIdx - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightboxUI();
  }

  function closeLightbox() {
    const lb = document.getElementById('vesperLightbox');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;
  window.nextLightbox = nextLightbox;
  window.prevLightbox = prevLightbox;

  // ── 8. SYNC PROGRESS BAR WITH SPACES SCROLL ──
  function initSpacesProgressBar() {
    const grid = document.querySelector('.vesper-spaces-grid');
    const fill = document.querySelector('.vesper-spaces-progress-fill');
    if (!grid || !fill) return;

    grid.addEventListener('scroll', () => {
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      if (maxScroll <= 0) {
        fill.style.width = '100%';
        return;
      }
      const pct = Math.min(100, Math.max(20, (grid.scrollLeft / maxScroll) * 100));
      fill.style.width = pct + '%';
    });
  }

  // ── 9. FAST CLIENT-SIDE FILTERING FOR 17 LUXURY STAYS ──
  function initCollectionFilter() {
    const filterBtns = document.querySelectorAll('.vesper-filter-btn');
    const stayCards = document.querySelectorAll('.vesper-stay-card');
    if (!filterBtns.length || !stayCards.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter') || 'all';

        stayCards.forEach(card => {
          const category = card.getAttribute('data-category') || '';
          if (filter === 'all' || category === filter || category.includes(filter)) {
            card.style.display = '';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // ── 10. TACTILE STICKY MOBILE BOOKING BAR ──
  function initStickyMobileBar() {
    const bar = document.getElementById('vesperMobileStickyBar');
    if (!bar) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 300) {
            bar.classList.add('visible');
          } else {
            bar.classList.remove('visible');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ── 10A. MAKE CARD THUMBNAILS 100% CLICKABLE ON ALL DEVICES (LAPTOP / MOBILE) ──
  function initClickableMedia() {
    document.querySelectorAll('.vesper-stay-card').forEach(card => {
      const slug = card.getAttribute('data-slug');
      if (!slug) return;
      const media = card.querySelector('.vesper-stay-media');
      if (!media) return;

      // If it's a native anchor tag, ensure href is set and let browser handle naturally
      if (media.tagName === 'A') {
        if (!media.getAttribute('href')) {
          media.setAttribute('href', slug + '.html');
        }
        media.style.cursor = 'pointer';
        return;
      }

      if (media.dataset.boundClick) return;
      media.dataset.boundClick = 'true';
      media.style.cursor = 'pointer';
      if (!media.getAttribute('role')) media.setAttribute('role', 'link');
      if (!media.getAttribute('tabindex')) media.setAttribute('tabindex', '0');

      const targetUrl = slug + '.html';

      const navigateToStay = function(e) {
        if (e.target.tagName === 'A' && e.target !== media) return;
        window.location.href = targetUrl;
      };

      media.addEventListener('click', navigateToStay);
      media.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToStay(e);
        }
      });
    });
  }

  // ── 10B. OMNI SEARCH & DYNAMIC DATES SYNC ──
  function initOmniSearch() {
    const omniCi = document.getElementById('omniCheckIn');
    const omniCo = document.getElementById('omniCheckOut');
    const omniGuests = document.getElementById('omniGuests');
    const omniCat = document.getElementById('omniCategory');

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = tmrw.toISOString().slice(0, 10);

    if (omniCi) {
      omniCi.min = todayStr;
      if (!omniCi.value) omniCi.value = todayStr;
      omniCi.addEventListener('change', () => {
        if (omniCo && omniCo.value <= omniCi.value) {
          const next = new Date(omniCi.value);
          next.setDate(next.getDate() + 1);
          omniCo.value = next.toISOString().slice(0, 10);
          omniCo.min = next.toISOString().slice(0, 10);
        }
        syncOmniDatesToCards();
      });
    }

    if (omniCo) {
      omniCo.min = tmrwStr;
      if (!omniCo.value) omniCo.value = tmrwStr;
      omniCo.addEventListener('change', syncOmniDatesToCards);
    }

    if (omniGuests) omniGuests.addEventListener('change', syncOmniDatesToCards);

    window.onOmniFilterChange = function() {
      const cat = omniCat ? omniCat.value : 'all';
      const targetBtn = document.querySelector(`.vesper-filter-btn[data-filter="${cat}"]`);
      if (targetBtn) {
        targetBtn.click();
      }
      syncOmniDatesToCards();
    };

    window.executeOmniSearch = function() {
      if (window.onOmniFilterChange) window.onOmniFilterChange();
      const collectionEl = document.getElementById('vesperStaysGrid');
      if (collectionEl) {
        collectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    syncOmniDatesToCards();
  }

  function syncOmniDatesToCards() {
    const omniCi = document.getElementById('omniCheckIn') || document.getElementById('vesperCheckIn');
    const omniCo = document.getElementById('omniCheckOut') || document.getElementById('vesperCheckOut');
    const omniGuests = document.getElementById('omniGuests') || document.getElementById('vesperGuests');

    const ci = omniCi ? omniCi.value : '';
    const co = omniCo ? omniCo.value : '';
    const g = omniGuests ? omniGuests.value : '6';

    // Update all card booking links & WhatsApp links
    document.querySelectorAll('.vesper-stay-card').forEach(card => {
      const slug = card.getAttribute('data-slug');
      const title = card.querySelector('.vesper-stay-title a')?.textContent || slug;
      const bookBtn = card.querySelector('.vesper-btn-stay-book');
      const waBtn = card.querySelector('.vesper-btn-stay-wa');

      if (bookBtn && slug) {
        bookBtn.href = `book.html?property=${encodeURIComponent(slug)}&checkin=${encodeURIComponent(ci)}&checkout=${encodeURIComponent(co)}&guests=${encodeURIComponent(g)}`;
      }

      if (waBtn && title) {
        const dateNote = ci && co ? ` from ${ci} to ${co} for ${g} guests` : '';
        const msg = `Namaste! I would like to book ${title} in Lucknow${dateNote} directly with The Unique Haven Homes (Direct Guest Rate).`;
        waBtn.href = `https://wa.me/919450055554?text=${encodeURIComponent(msg)}`;
      }
    });
  }

  // ── 11. REACTIVE CRM PRICE EVENT LISTENER ──
  window.addEventListener('uhh:pricesSynced', () => {
    if (currentProperty && window.UHH_LIVE_RATES) {
      const live = window.UHH_LIVE_RATES[currentProperty.slug];
      if (live && live.base_price) {
        const subcopyEl = document.querySelector('.vesper-subcopy');
        if (subcopyEl) {
          const formatted = '₹' + Number(live.base_price).toLocaleString('en-IN') + ' / night';
          subcopyEl.innerHTML = `${currentProperty.desc} <strong>From ${formatted}</strong> (Save 15% via direct booking).`;
        }
      }
    }
  });

  // ── 12. CLAUDE CODE TOOLKIT: HERO IMAGE EXPANSION & TEXT BLEND (21:09 - 22:40) ──
  function initHeroImageExpansionBlend() {
    const heroEl = document.getElementById('flagship-hero');
    const bgViewport = document.getElementById('vesperBgViewport');
    const heroLeft = document.querySelector('.vesper-left');
    const bookingWidget = document.querySelector('.vesper-booking-widget');
    if (!heroEl || !bgViewport) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Responsive touch guard: Disable text fadeout on mobile touchscreens (<=768px)
          if (window.innerWidth <= 768) {
            bgViewport.style.transform = 'none';
            bgViewport.style.filter = 'none';
            if (heroLeft) {
              heroLeft.style.opacity = '1';
              heroLeft.style.transform = 'none';
            }
            ticking = false;
            return;
          }

          const scrollY = window.scrollY;
          const heroHeight = heroEl.offsetHeight || 800;

          if (scrollY <= heroHeight * 1.2) {
            const progress = Math.min(1, Math.max(0, scrollY / (heroHeight * 0.85)));

            // Image expansion: background expands smoothly on desktop
            const scale = 1 + progress * 0.12;
            const brightness = Math.max(0.68, 1 - progress * 0.22);
            bgViewport.style.transform = `scale(${scale})`;
            bgViewport.style.filter = `brightness(${brightness})`;

            // Text blend: hero text softly translates up, fades and blends with mask
            if (heroLeft) {
              const textOpacity = Math.max(0, 1 - progress * 1.55);
              const textTranslate = progress * -40;
              heroLeft.style.opacity = textOpacity;
              heroLeft.style.transform = `translateY(${textTranslate}px)`;
            }

            // Desktop booking card fade
            if (bookingWidget && window.innerWidth > 960) {
              const widgetOpacity = Math.max(0, 1 - progress * 1.4);
              const widgetTranslate = progress * -25;
              bookingWidget.style.opacity = widgetOpacity;
              bookingWidget.style.transform = `translateY(${widgetTranslate}px)`;
            }
          } else {
            if (heroLeft && heroLeft.style.opacity !== '0') {
              heroLeft.style.opacity = '0';
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Handle screen resize
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        bgViewport.style.transform = 'none';
        bgViewport.style.filter = 'none';
        if (heroLeft) {
          heroLeft.style.opacity = '1';
          heroLeft.style.transform = 'none';
        }
      }
    }, { passive: true });
  }

  // ── 13. CLAUDE CODE TOOLKIT: STICKY SCROLL ROOMS SHOWCASE (31:07 - 32:20 & 35:12 - 35:29) ──
  function initStickyScrollRooms() {
    const cards = document.querySelectorAll('.vesper-narrative-card');
    const stickyImg = document.getElementById('vesperStickyImg');
    const stickyPill = document.getElementById('vesperStickyPill');
    const stickyTagline = document.getElementById('vesperStickyTagline');
    const prevBtn = document.getElementById('vesperStickyPrev');
    const nextBtn = document.getElementById('vesperStickyNext');

    if (!cards.length || !stickyImg) return;

    let activeIdx = 0;

    function activateRoom(index, smoothScroll) {
      if (index < 0 || index >= cards.length) return;
      activeIdx = index;

      cards.forEach((c, idx) => {
        if (idx === index) {
          c.classList.add('active');
          if (smoothScroll && window.innerWidth > 860) {
            c.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          c.classList.remove('active');
        }
      });

      const card = cards[index];
      const newImg = card.getAttribute('data-img');
      const newPill = card.getAttribute('data-pill');
      const newTagline = card.getAttribute('data-tagline');

      if (newImg && stickyImg.getAttribute('src') !== newImg) {
        stickyImg.style.opacity = '0.35';
        stickyImg.style.transform = 'scale(0.98)';
        setTimeout(() => {
          stickyImg.src = newImg;
          stickyImg.style.opacity = '1';
          stickyImg.style.transform = 'scale(1)';
        }, 120);
      }

      if (stickyPill && newPill) stickyPill.textContent = newPill;
      if (stickyTagline && newTagline) stickyTagline.textContent = newTagline;
    }

    // Click on card to activate
    cards.forEach((card, idx) => {
      card.addEventListener('click', () => {
        activateRoom(idx, false);
      });
    });

    // Prev / Next button controls (Touch-friendly on mobile & tablet)
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prev = (activeIdx - 1 + cards.length) % cards.length;
        activateRoom(prev, true);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = (activeIdx + 1) % cards.length;
        activateRoom(next, true);
      });
    }

    // Scroll spy on desktop and tablet (Observer ignored on mobile to allow natural finger scrolling)
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (window.innerWidth <= 860) return; // Touchscreens use tap/button navigation
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute('data-index'), 10);
            if (!isNaN(idx)) {
              activateRoom(idx, false);
            }
          }
        });
      }, {
        root: null,
        rootMargin: '-25% 0px -35% 0px',
        threshold: 0.15
      });

      cards.forEach(card => observer.observe(card));
    }
  }

  function scrollToDirectory() {
    const grid = document.getElementById('collection') || document.getElementById('spaces') || document.getElementById('directory-grid') || document.querySelector('.airnest-cat-nav') || document.getElementById('filterPills');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth' });
    }
  }

  window.scrollToDirectory = scrollToDirectory;
  window.goToRoom = goToRoom;
  window.loadVesperProperty = loadProperty;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVesperHero);
  } else {
    initVesperHero();
  }
})();
