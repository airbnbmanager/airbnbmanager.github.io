/**
 * 🧠 TUHH KNOWLEDGE BASE & SMART RAG ENGINE
 * Fast context retrieval for WhatsApp AI Concierge (Nisha)
 * Supports all 19 properties, check-in policies, WiFi, caretakers, locations & FAQs.
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vxxmigdzimnrbbmkjzoa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F';

// Master Embedded Knowledge (19 Verified Properties)
const STATIC_PROPERTIES = [
  {
    roomId: 'Flat 402',
    name: 'The Tehzeeb Nest',
    type: '3BHK Luxury Flat (Blossom Skyline)',
    area: 'Vikalp Khand, Gomti Nagar',
    rent: 5200,
    maxGuests: 10,
    wifi: { ssid: 'UniqueHaven_Tehzeeb', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman Commandar', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: '4th Floor, elevator, 3 AC bedrooms, modular kitchen, reserved parking'
  },
  {
    roomId: 'GOM-101',
    name: 'RedRose Palace',
    type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar / Chinhat',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_RedRose', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284 / 8957725081' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: '3 AC bedrooms, living hall, modular kitchen with gas & RO, lift, parking'
  },
  {
    roomId: 'GOM-102',
    name: 'Black Beauty',
    type: '3BHK Luxury Flat (Black & Gold Theme)',
    area: 'Vikalp Khand, Gomti Nagar / Chinhat',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_BlackBeauty', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Mood lighting, 3 AC master rooms, modular kitchen, couple friendly'
  },
  {
    roomId: 'GOM-201',
    name: 'The Dark Blue',
    type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar / Chinhat',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_DarkBlue', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Oceanic blue theme, 3 AC bedrooms, kitchen with gas/fridge, balcony'
  },
  {
    roomId: 'GOM-202',
    name: 'The Brown',
    type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar / Chinhat',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_Brown', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Earthy wood interiors, 3 AC rooms, high-speed WiFi, lift, parking'
  },
  {
    roomId: 'GOM-301',
    name: 'The Light Green',
    type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar / Chinhat',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_LightGreen', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Nature aesthetic, peaceful, 3 AC rooms, kitchen with cookware'
  },
  {
    roomId: 'GOM-302',
    name: 'The Unique',
    type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar / Chinhat',
    rent: 6300,
    maxGuests: 8,
    wifi: { ssid: 'UniqueHaven_Unique', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Spacious 8-guest flat, premium furnishings, 3 AC rooms, lift'
  },
  {
    roomId: 'GOM-401',
    name: 'The Nawabi Stay',
    type: '3BHK Luxury Flat',
    area: 'Near Max Hospital, Vikalp Khand, Gomti Nagar',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_Nawabi', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Awadhi royal ambiance, 3 AC bedrooms, kitchen, high-speed WiFi'
  },
  {
    roomId: 'GOM-501',
    name: 'Starlight Blue PentHouse',
    type: '4BHK Top-Floor Penthouse',
    area: 'Near Max Hospital, Vikalp Khand, Gomti Nagar',
    rent: 6900,
    maxGuests: 10,
    wifi: { ssid: 'UniqueHaven_Starlight', pass: 'Airbnb.in1' },
    caretaker: { name: 'Arman & Shuaib', phone: '8467080284' },
    map: 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA',
    features: 'Private terrace with city view, 4 AC bedrooms, 10-guest capacity'
  },
  {
    roomId: 'VIL-103',
    name: 'The Pink House',
    type: '5BR Duplex Villa (2nd & 3rd Floor)',
    area: '3/64 Vishesh Khand 3, Gomti Nagar',
    rent: 10350,
    maxGuests: 12,
    wifi: { ssid: 'UniqueHaven_PinkHouse', pass: 'Airbnb.in1' },
    caretaker: { name: 'Aniket', phone: '9214246820' },
    map: 'https://maps.app.goo.gl/pCGigAPQGHjcfadQ8',
    features: '5 large AC bedrooms, 2 levels, private terrace, ideal for weddings and family events'
  },
  {
    roomId: 'VIL-104',
    name: 'The Green House',
    type: '3BHK Villa 1st Floor',
    area: '3/64 Vishesh Khand 3, Gomti Nagar',
    rent: 6300,
    maxGuests: 8,
    wifi: { ssid: 'UniqueHaven_GreenHouse', pass: 'Airbnb.in1' },
    caretaker: { name: 'Aniket', phone: '9214246820' },
    map: 'https://maps.app.goo.gl/pCGigAPQGHjcfadQ8',
    features: 'Serene 1st floor villa, lush green neighborhood, private balcony, modular kitchen'
  },
  {
    roomId: 'VIL-105',
    name: 'The Yellow House',
    type: '3BHK Ground Floor Villa (Lawn Access)',
    area: '3/64 Vishesh Khand 3, Gomti Nagar',
    rent: 6300,
    maxGuests: 8,
    wifi: { ssid: 'UniqueHaven_YellowHouse', pass: 'Airbnb.in1' },
    caretaker: { name: 'Aniket', phone: '9214246820' },
    map: 'https://maps.app.goo.gl/pCGigAPQGHjcfadQ8',
    features: 'Ground floor, direct lawn access, zero stairs (senior-citizen & kids friendly)'
  },
  {
    roomId: 'VIL-101',
    name: 'Gomti Grand Villa',
    type: '4BHK Private Estate',
    area: 'Geetapuri Colony near Lulu Mall & Shaheed Path',
    rent: 9200,
    maxGuests: 12,
    wifi: { ssid: 'UniqueHaven_GrandVilla', pass: 'Airbnb.in1' },
    caretaker: { name: 'Host Concierge', phone: '9450055554' },
    map: 'https://maps.app.goo.gl/qQRbCANwvez7mnD3A',
    features: 'Gated 4BHK private bungalow, private parking for 3 cars, large living hall'
  },
  {
    roomId: 'VIL-102',
    name: 'Royal White House',
    type: 'Presidential Estate Villa',
    area: 'Omax City near Lulu Mall & Airport Flyover',
    rent: 13800,
    maxGuests: 18,
    wifi: { ssid: 'UniqueHaven_RoyalWhite', pass: 'Airbnb.in1' },
    caretaker: { name: 'Kanchan', phone: '9194109911' },
    map: 'https://maps.app.goo.gl/uniquehavenhomes',
    features: 'Flagship palatial villa, grand classical facade, accommodates 18 guests'
  },
  {
    roomId: 'LUL-101',
    name: 'The Luxe Haven',
    type: '1BHK Luxury Flat',
    area: 'Golf City, 3 mins from Lulu Mall & Medanta Hospital',
    rent: 2650,
    maxGuests: 3,
    wifi: { ssid: 'UniqueHaven_Luxe', pass: 'Airbnb.in1' },
    caretaker: { name: 'Shrwan', phone: '8858034382' },
    map: 'https://maps.app.goo.gl/b8YjBduoQxa98QhT6',
    features: 'Cozy 1BHK, modular kitchen, elevator, walk to Lulu Mall'
  },
  {
    roomId: 'LUL-402',
    name: 'Celebrity Garden',
    type: '5-Bedroom Luxury Estate',
    area: 'Golf City Sector B, Behind Lulu Mall / Medanta / Ekana',
    rent: 11500,
    maxGuests: 15,
    wifi: { ssid: 'UniqueHaven_Celebrity', pass: 'Airbnb.in1' },
    caretaker: { name: 'Sarvan', phone: '8858034382' },
    map: 'https://maps.app.goo.gl/b8YjBduoQxa98QhT6',
    features: 'Massive 5-bedroom private villa, lush gardens, outdoor sit-out, ample parking'
  },
  {
    roomId: 'VIL-106',
    name: 'Green Forest View',
    type: '3BHK Luxury Floor (2nd Floor)',
    area: 'Near Lulu Mall & Shaheed Path',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_GreenForest', pass: 'Airbnb.in1' },
    caretaker: { name: 'Sarvan', phone: '8858034382' },
    map: 'https://maps.app.goo.gl/b8YjBduoQxa98QhT6',
    features: 'Scenic greenery view, 3 AC bedrooms, kitchen with gas, lift'
  },
  {
    roomId: 'VIL-107',
    name: 'The Velvet House',
    type: '3BHK Luxury Floor (1st Floor)',
    area: 'Near Lulu Mall & Medanta',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_Velvet', pass: 'Airbnb.in1' },
    caretaker: { name: 'Sarvan', phone: '8858034382' },
    map: 'https://maps.app.goo.gl/b8YjBduoQxa98QhT6',
    features: 'Plush velvet decor, 3 AC bedrooms, modular kitchen'
  },
  {
    roomId: 'VIL-108',
    name: 'Pink Paradise Villa',
    type: '3BHK Luxury Floor (3rd Floor)',
    area: 'Near Lulu Mall & Medanta Hospital',
    rent: 5200,
    maxGuests: 6,
    wifi: { ssid: 'UniqueHaven_PinkParadise', pass: 'Airbnb.in1' },
    caretaker: { name: 'Sarvan', phone: '8858034382' },
    map: 'https://maps.app.goo.gl/b8YjBduoQxa98QhT6',
    features: 'Top floor with terrace view, 3 AC bedrooms, high-speed WiFi'
  }
];

// Global FAQs
const GLOBAL_FAQS = [
  {
    topic: 'Check-in & Check-out',
    keywords: ['checkin', 'check in', 'checkout', 'check out', 'timing', 'early', 'late'],
    answer: 'Standard Check-in is at 02:00 PM and Standard Check-out is at 11:00 AM. Early check-in or late check-out is complimentary subject to room availability.'
  },
  {
    topic: 'Couple Friendly & ID Policy',
    keywords: ['couple', 'unmarried', 'safe', 'id', 'aadhaar', 'local', 'rules', 'pan'],
    answer: 'All our properties are 100% couple-friendly, private, and safe for married and unmarried couples. All adult guests must present a valid Government Photo ID (Aadhaar Card, Driving License, Voter ID, or Passport). PAN Card is not accepted as address proof.'
  },
  {
    topic: 'Kitchen & Cooking',
    keywords: ['kitchen', 'cooking', 'gas', 'ro', 'fridge', 'cookware', 'food', 'bartan'],
    answer: 'Every apartment and villa comes with a fully equipped modular kitchen including an LPG gas stove, RO drinking water purifier, double-door refrigerator, electric kettle, and complete cookware/cutlery. Cooking is 100% free!'
  },
  {
    topic: 'Wi-Fi & Internet',
    keywords: ['wifi', 'wi-fi', 'internet', 'password', 'speed', 'net'],
    answer: 'High-speed 200 Mbps fiber Wi-Fi is available in all rooms with 100% power backup. Default Wi-Fi Password across all properties is: Airbnb.in1'
  },
  {
    topic: 'Direct Discount & Advance',
    keywords: ['discount', 'save', 'rate', 'price', 'advance', 'payment', 'direct', 'airbnb'],
    answer: 'Booking directly saves 15% to 20% compared to Airbnb/OTAs! A 30% to 50% advance locks your reservation via UPI (Google Pay, PhonePe, Paytm). Website: https://uniquehavenhomesstay.com/properties.html'
  },
  {
    topic: 'Location & Nearby Distances',
    keywords: ['location', 'distance', 'lulu', 'medanta', 'ekana', 'airport', 'charbagh', 'station'],
    answer: 'Strategic Lucknow locations: 5 mins to Lulu Mall & Medanta Hospital, 7 mins to Ekana Cricket Stadium & Phoenix Palassio, 12 mins to Charbagh Railway Station, and 20 mins to Lucknow International Airport via Shaheed Path.'
  }
];

/**
 * 🔍 Smart RAG Keyword Matcher
 * Returns relevant property info + FAQs based on user query
 */
function getRelevantContext(userQuery = '') {
  const q = String(userQuery).toLowerCase().trim();
  const contextChunks = [];

  // 1. Property-specific matching
  let matchedProp = null;
  for (const p of STATIC_PROPERTIES) {
    const pName = p.name.toLowerCase();
    const pRoom = p.roomId.toLowerCase();

    if (q.includes(pName) || q.includes(pRoom)) {
      matchedProp = p;
      break;
    }
  }

  // Check specific property keywords
  if (!matchedProp) {
    if (q.includes('yellow')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-105');
    } else if (q.includes('pink house')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-103');
    } else if (q.includes('green house')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-104');
    } else if (q.includes('pink paradise')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-108');
    } else if (q.includes('black beauty')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-102');
    } else if (q.includes('redrose') || q.includes('red rose')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-101');
    } else if (q.includes('dark blue')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-201');
    } else if (q.includes('brown')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-202');
    } else if (q.includes('light green')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-301');
    } else if (q.includes('starlight')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-501');
    } else if (q.includes('nawabi')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-401');
    } else if (q.includes('tehzeeb') || q.includes('blossom')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'Flat 402');
    } else if (q.includes('celebrity')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'LUL-402');
    } else if (q.includes('royal white') || q.includes('white house')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-102');
    } else if (q.includes('gomti grand') || q.includes('grand villa')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-101');
    } else if (q.includes('luxe haven') || q.includes('luxe')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'LUL-101');
    } else if (q.includes('velvet')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-107');
    } else if (q.includes('forest')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'VIL-106');
    } else if (q.includes('unique')) {
      matchedProp = STATIC_PROPERTIES.find(p => p.roomId === 'GOM-302');
    }
  }

  if (matchedProp) {
    contextChunks.push(
      `[PROPERTY DETAILS: ${matchedProp.name} (${matchedProp.roomId})]\n` +
      `• Type: ${matchedProp.type} | Max Capacity: ${matchedProp.maxGuests} guests\n` +
      `• Location: ${matchedProp.area} (Map: ${matchedProp.map})\n` +
      `• Direct Rate: ₹${matchedProp.rent}/night (15% cheaper than Airbnb)\n` +
      `• Wi-Fi Network: "${matchedProp.wifi.ssid}" | Password: "${matchedProp.wifi.pass}"\n` +
      `• Caretaker: ${matchedProp.caretaker.name} (Phone: ${matchedProp.caretaker.phone})\n` +
      `• Key Highlights: ${matchedProp.features}`
    );
  }

  // 2. FAQ & Policy Matching
  for (const faq of GLOBAL_FAQS) {
    const isMatch = faq.keywords.some(k => q.includes(k));
    if (isMatch) {
      contextChunks.push(`[POLICY - ${faq.topic.toUpperCase()}]: ${faq.answer}`);
    }
  }

  // 3. Fallback context if general query
  if (contextChunks.length === 0) {
    contextChunks.push(
      `[GENERAL OVERVIEW]: The Unique Haven Homes manages 19 luxury homestay apartments and private villas across Gomti Nagar and Shaheed Path (near Lulu Mall & Medanta), Lucknow. Standard Check-in is 2:00 PM, Check-out is 11:00 AM. 100% Couple-Friendly, High-Speed WiFi (Airbnb.in1), Modular Kitchens, and Free Parking included. Direct booking saves 15% vs Airbnb.`
    );
  }

  return contextChunks.join('\n\n');
}

module.exports = {
  STATIC_PROPERTIES,
  GLOBAL_FAQS,
  getRelevantContext
};
