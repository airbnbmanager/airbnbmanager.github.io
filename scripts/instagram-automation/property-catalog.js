/**
 * 🏨 THE UNIQUE HAVEN HOMES - VERIFIED PROPERTY CATALOG FOR INSTAGRAM AUTOMATION
 * Strictly verified property data for 100% authentic, accurate Instagram Reels & Posts.
 * Zero generic fluff. Every detail corresponds to the real property in Lucknow.
 */

const fs = require('fs');
const path = require('path');

// Load categorized photos
let categorizedPhotos = {};
try {
  const photosPath = path.resolve(__dirname, '../airbnb_categorized_photos.json');
  let raw = fs.readFileSync(photosPath, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
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
    landmarks: 'Lulu Mall (5 mins), Medanta Hospital, Shaheed Path, Ekana Stadium',
    capacity: '6 to 8 Guests',
    directPrice: 4299,
    airbnbPrice: 5499,
    savingsText: 'Save ₹1,200/night vs Airbnb',
    bhk: '3 BHK',
    keyFeatures: [
      '3 Spacious AC Bedrooms with Attached Balconies',
      'High-Speed 500Mbps Optical Fiber WiFi',
      'Fully Equipped Modular Kitchen & Dining',
      'Private Terrace & Garden Lounge',
      'Dedicated Car Parking & 24/7 Caretaker'
    ],
    idealFor: 'Families, Friends Getaways, Medanta Patient Attendants, Wedding Guests',
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
    bhk: '3 BHK',
    keyFeatures: [
      '3 Air-Conditioned Luxury Bedrooms',
      'Private Green Garden Lawn for Evening Tea',
      'Smart TV with Netflix & 500Mbps WiFi',
      'Full Kitchen with Refrigerator, Microwave & Gas',
      'Quiet Posh Residential Gated Colony'
    ],
    idealFor: 'Corporate Executives, Family Vacations, Long Stays',
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
    bhk: '3 BHK',
    keyFeatures: [
      '3 Panoramic View AC Bedrooms',
      'Unobstructed Green Forest & Sunrise Views',
      'Spacious Living Room with Premium Sofa Set',
      'High-Speed WiFi & Working Desk',
      '24/7 Security & Dedicated Parking'
    ],
    idealFor: 'Match Day Staycations, Airport Transit, Peace Seekers',
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
    bhk: '5 Bed Grand Villa',
    keyFeatures: [
      '5 Master Bedrooms with Attached Baths',
      'Huge Grand Living Hall for Big Families',
      'Expansive Lawn & Party Area',
      'Full Chef-Style Kitchen Setup',
      'Round-the-Clock Dedicated Caretaker'
    ],
    idealFor: 'Big Family Reunions, Wedding Stays, Group Celebrations',
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
    bhk: 'Penthouse',
    keyFeatures: [
      'Private Rooftop Terrace with City Skyline View',
      'Designer Aesthetic Interiors & Mood Lighting',
      '100% AC, Ultra-fast WiFi & Smart Entertainment',
      'Modern Kitchenette & Bar Counter',
      'Elevator Access & Secured Premises'
    ],
    idealFor: 'Couples, Anniversaries, Romantic Staycations, Creators',
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
    bhk: '4 BHK',
    keyFeatures: [
      '4 Royal Master Suites with King Beds',
      'Extravagant Living Lounge with Italian Marble Flooring',
      'Close to Lucknow\'s Biggest Shopping Hubs',
      'Complimentary High-Speed WiFi & Power Backup',
      'Dedicated Caretaker on Demand'
    ],
    idealFor: 'Shopping Trips, Luxury Vacations, VIP Guests',
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/gomti-grand-villa.html'
  },
  {
    code: 'GOM-401',
    slug: 'the-nawabi-stay',
    name: 'The Nawabi Stay',
    nickname: 'Nawabi Stay',
    type: '3BHK Aesthetic Royal Flat',
    location: 'Chinhat, Gomti Nagar Extension, Lucknow',
    landmarks: 'Gomti Nagar Extension, Near Medanta / Max Hospital',
    capacity: '6 Guests',
    directPrice: 3499,
    airbnbPrice: 4299,
    savingsText: 'Save ₹800/night vs Airbnb',
    bhk: '3 BHK',
    keyFeatures: [
      'Heritage Nawabi-Themed Cozy Interiors',
      '3 Air Conditioned Bedrooms with Clean Linens',
      'Equipped Kitchen with Gas Stove & Utensils',
      'Superfast WiFi & Workstation Desk',
      'Clean Sanitized Bathrooms with Geysers'
    ],
    idealFor: 'Value Seekers, Family Visits, Hospital Attendants',
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/the-nawabi-stay.html'
  },
  {
    code: 'GOM-102',
    slug: 'black-beauty',
    name: 'Black Beauty Luxury Suite',
    nickname: 'Black Beauty',
    type: '3BHK Modern Monochromatic Flat',
    location: 'Chinhat, Gomti Nagar, Lucknow',
    landmarks: 'Chinhat Chauraha, Gomti Nagar, Shaheed Path',
    capacity: '6 Guests',
    directPrice: 3499,
    airbnbPrice: 4299,
    savingsText: 'Save ₹800/night vs Airbnb',
    bhk: '3 BHK',
    keyFeatures: [
      'Sleek Modern Charcoal & Gold Aesthetic',
      'High-Definition Smart TV in Living Area',
      'All Rooms Air Conditioned with Spring Mattresses',
      'Fully Functional Kitchen',
      'Free Parking on Premises'
    ],
    idealFor: 'Youth, Creators, Business Travellers',
    whatsapp: '918299600709',
    bookingUrl: 'https://uniquehavenhomesstay.com/black-beauty.html'
  }
];

// Helper to get verified photos for any property
function getPropertyPhotos(code) {
  const cat = categorizedPhotos[code]?.rawCategories || {};
  const photos = [];

  // Pick 1 Living Room photo
  if (cat['Living room'] && cat['Living room'].length > 0) {
    photos.push({ category: 'Living Room', url: cat['Living room'][0] });
  }

  // Pick 1 Bedroom photo
  if (cat['Bedroom 1'] && cat['Bedroom 1'].length > 0) {
    photos.push({ category: 'Master Bedroom', url: cat['Bedroom 1'][0] });
  } else if (cat['Bedroom 2'] && cat['Bedroom 2'].length > 0) {
    photos.push({ category: 'Bedroom', url: cat['Bedroom 2'][0] });
  }

  // Pick 1 Kitchen / Dining / Balcony / Exterior
  if (cat['Full kitchen'] && cat['Full kitchen'].length > 0) {
    photos.push({ category: 'Modular Kitchen', url: cat['Full kitchen'][0] });
  } else if (cat['Dining area'] && cat['Dining area'].length > 0) {
    photos.push({ category: 'Dining Area', url: cat['Dining area'][0] });
  } else if (cat['Balcony'] && cat['Balcony'].length > 0) {
    photos.push({ category: 'Private Balcony', url: cat['Balcony'][0] });
  } else if (cat['Exterior'] && cat['Exterior'].length > 0) {
    photos.push({ category: 'Exterior', url: cat['Exterior'][0] });
  }

  // Fallback to whatever photos exist
  if (photos.length < 3) {
    for (const [k, arr] of Object.entries(cat)) {
      if (arr && arr[0] && !photos.find(p => p.url === arr[0])) {
        photos.push({ category: k, url: arr[0] });
      }
      if (photos.length >= 3) break;
    }
  }

  return photos;
}

module.exports = {
  PROPERTIES,
  getPropertyPhotos,
  getPropertyByCode: (code) => PROPERTIES.find(p => p.code === code) || PROPERTIES[0]
};
