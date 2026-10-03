/**
 * 🏨 THE UNIQUE HAVEN HOMES - VERIFIED PROPERTY CATALOG
 * Accurate, verified metadata for all properties in Lucknow.
 */

const fs = require('fs');
const path = require('path');

let categorizedPhotos = {};
try {
  const photosPath = path.resolve(__dirname, '../airbnb_categorized_photos.json');
  let raw = fs.readFileSync(photosPath, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  categorizedPhotos = JSON.parse(raw);
} catch (e) {
  console.warn('Warning: airbnb_categorized_photos.json not loaded:', e.message);
}

const PROPERTIES = [
  {
    code: 'VIL-108',
    slug: 'pink-paradise',
    name: 'Pink Paradise Villa',
    nickname: 'Pink Paradise',
    type: '3BHK Luxury Boutique Villa',
    location: 'Near Lulu Mall & Medanta Hospital, Lucknow',
    landmarks: 'Lulu Mall (5 mins), Medanta Hospital, Shaheed Path',
    capacity: '6 to 8 Guests',
    directPrice: 4299,
    airbnbPrice: 5499,
    savingsText: 'Save ₹1,200/night vs Airbnb',
    keyFeatures: [
      '3 Spacious AC Bedrooms with Attached Balconies',
      'High-Speed 500Mbps Optical Fiber WiFi',
      'Fully Equipped Modular Kitchen & Dining',
      'Private Terrace & Garden Lounge',
      'Dedicated Car Parking & 24/7 Caretaker'
    ],
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/pink-paradise.html'
  },
  {
    code: 'VIL-105',
    slug: 'the-yellow-house',
    name: 'The Yellow House',
    nickname: 'Yellow House',
    type: '3BHK Luxury Villa with Private Lawn',
    location: 'Vishesh Khand 3, Gomti Nagar, Lucknow',
    landmarks: 'Gomti Nagar Main Hub, Wave Mall, Patrakarpuram',
    capacity: '6 to 9 Guests',
    directPrice: 3999,
    airbnbPrice: 4799,
    savingsText: 'Save ₹800/night vs Airbnb',
    keyFeatures: [
      '3 Air-Conditioned Luxury Bedrooms',
      'Private Green Garden Lawn for Evening Tea',
      'Smart TV with Netflix & 500Mbps WiFi',
      'Full Kitchen with Refrigerator, Microwave & Gas',
      'Quiet Posh Residential Gated Colony'
    ],
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/the-yellow-house.html'
  },
  {
    code: 'VIL-106',
    slug: 'green-forest',
    name: 'Green Forest View Villa',
    nickname: 'Green Forest',
    type: '3BHK Villa with Serene Forest View',
    location: 'Near Lulu Mall & Ekana Stadium, Shaheed Path',
    landmarks: 'Ekana Cricket Stadium, Lulu Mall, Airport (15 mins)',
    capacity: '6 to 8 Guests',
    directPrice: 3999,
    airbnbPrice: 4899,
    savingsText: 'Save ₹900/night vs Airbnb',
    keyFeatures: [
      '3 Panoramic View AC Bedrooms',
      'Unobstructed Green Forest & Sunrise Views',
      'Spacious Living Room with Premium Sofa Set',
      'High-Speed WiFi & Working Desk',
      '24/7 Security & Dedicated Parking'
    ],
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/green-forest.html'
  },
  {
    code: 'LUL-402',
    slug: 'celebrity-garden',
    name: 'Celebrity Garden Luxury Estate',
    nickname: 'Celebrity Garden',
    type: '5 Bed Luxury Grand Villa',
    location: 'Near Lulu Mall, Medanta & Ekana, Lucknow',
    landmarks: 'Lulu Mall (3 mins), Medanta Hospital, Ekana Stadium',
    capacity: '10 to 14 Guests',
    directPrice: 4999,
    airbnbPrice: 6499,
    savingsText: 'Save ₹1,500/night vs Airbnb',
    keyFeatures: [
      '5 Master Bedrooms with Attached Baths',
      'Huge Grand Living Hall for Big Families',
      'Expansive Lawn & Party Area',
      'Full Chef-Style Kitchen Setup',
      'Round-the-Clock Dedicated Caretaker'
    ],
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/celebrity-garden.html'
  },
  {
    code: 'GOM-501',
    slug: 'starlight-blue',
    name: 'Starlight Blue PentHouse',
    nickname: 'Starlight Blue',
    type: 'Sky Penthouse with Private Rooftop',
    location: 'Shaheed Path / Near Max Hospital, Lucknow',
    landmarks: 'Max Hospital, Shaheed Path, Ekana, Airport Route',
    capacity: '4 to 6 Guests',
    directPrice: 3999,
    airbnbPrice: 4999,
    savingsText: 'Save ₹1,000/night vs Airbnb',
    keyFeatures: [
      'Private Rooftop Terrace with City Skyline View',
      'Designer Aesthetic Interiors & Mood Lighting',
      '100% AC, Ultra-fast WiFi & Smart Entertainment',
      'Modern Kitchenette & Bar Counter',
      'Elevator Access & Secured Premises'
    ],
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/starlight-blue.html'
  },
  {
    code: 'VIL-101',
    slug: 'gomti-grand-villa',
    name: 'Gomti Grand Villa',
    nickname: 'Gomti Grand',
    type: '4BHK Palatial Villa',
    location: 'Near Lulu Mall & Phoenix Palassio, Lucknow',
    landmarks: 'Phoenix Palassio, Lulu Mall, Ekana Stadium',
    capacity: '8 to 10 Guests',
    directPrice: 4999,
    airbnbPrice: 6299,
    savingsText: 'Save ₹1,300/night vs Airbnb',
    keyFeatures: [
      '4 Royal Master Suites with King Beds',
      'Extravagant Living Lounge with Italian Marble Flooring',
      'Close to Lucknow\'s Biggest Shopping Hubs',
      'Complimentary High-Speed WiFi & Power Backup',
      'Dedicated Caretaker on Demand'
    ],
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/gomti-grand-villa.html'
  }
];

// Helper: Audit and select the 3 best photos for the 3 cinema shots
function auditPropertyPhotos(code) {
  const cat = categorizedPhotos[code]?.rawCategories || {};
  const shots = [];

  // Shot 1: The Dolly Shot -> Living Room wide angle
  const livingPhotos = cat['Living room'] || [];
  if (livingPhotos.length > 0) {
    shots.push({
      shotType: 'DOLLY',
      roomName: 'Living Room',
      url: livingPhotos[0],
      cameraMovement: 'Cinematic slow dolly forward into luxury villa living room, steadycam, architectural film, 4k, hyper-realistic'
    });
  }

  // Shot 2: The Orbit Shot -> Master Bedroom
  const bedPhotos = cat['Bedroom 1'] || cat['Bedroom 2'] || [];
  if (bedPhotos.length > 0) {
    shots.push({
      shotType: 'ORBIT',
      roomName: 'Master Bedroom',
      url: bedPhotos[0],
      cameraMovement: 'Slow smooth 3D orbit around the plush master bed, elegant camera arc, ambient warm interior lighting, luxury boutique hotel commercial, 4k'
    });
  }

  // Shot 3: The Crane / Axis Lock -> Kitchen or Balcony or Dining
  const kitchenPhotos = cat['Full kitchen'] || cat['Dining area'] || cat['Balcony'] || [];
  if (kitchenPhotos.length > 0) {
    shots.push({
      shotType: 'CRANE',
      roomName: 'Modular Kitchen & Dining',
      url: kitchenPhotos[0],
      cameraMovement: 'Steady vertical crane tilt-up revealing the modern modular kitchen and dining setup, crisp clean straight line tracking, warm evening lighting, 4k'
    });
  }

  return shots;
}

module.exports = {
  PROPERTIES,
  auditPropertyPhotos,
  getPropertyByCode: (code) => PROPERTIES.find(p => p.code === code) || PROPERTIES[0]
};
