/* ══════════════════════════════════════════════════════════════
   THE UNIQUE HAVEN HOMES — WEBSITE SYNC
   1. Leaflet Map: All 17 property pins in Gomti Nagar
   2. Live Availability: Supabase bookings → card badges
   ══════════════════════════════════════════════════════════════ */

// ─── PROPERTY DATA: All 17 Properties with GPS Coordinates ───
const PROPERTY_PINS = [
  // ─── 8 FLATS IN VIKALP KHAND (GOMTI NAGAR / CHINHAT) ───
  {
    roomId: 'GOM-101', slug: 'redrose-palace',
    name: 'RedRose Palace', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹4,500', lat: 26.8732, lng: 81.0012,
    url: 'redrose-palace.html'
  },
  {
    roomId: 'GOM-102', slug: 'black-beauty',
    name: 'Black Beauty', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹4,500', lat: 26.8720, lng: 80.9992,
    url: 'black-beauty.html'
  },
  {
    roomId: 'GOM-201', slug: 'the-dark-blue',
    name: 'The Dark Blue', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹4,500', lat: 26.8744, lng: 81.0028,
    url: 'the-dark-blue.html'
  },
  {
    roomId: 'GOM-202', slug: 'the-brown',
    name: 'The Brown', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹4,500', lat: 26.8753, lng: 81.0006,
    url: 'the-brown.html'
  },
  {
    roomId: 'GOM-301', slug: 'the-light-green',
    name: 'The Light Green', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹4,500', lat: 26.8715, lng: 81.0024,
    url: 'the-light-green.html'
  },
  {
    roomId: 'GOM-302', slug: 'the-unique',
    name: 'The Unique', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹5,500', lat: 26.8738, lng: 80.9978,
    url: 'the-unique.html'
  },
  {
    roomId: 'GOM-401', slug: 'the-nawabi-stay',
    name: 'The Nawabi Stay', type: '3BHK Luxury Flat',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹4,500', lat: 26.8702, lng: 81.0038,
    url: 'the-nawabi-stay.html'
  },
  {
    roomId: 'GOM-501', slug: 'starlight-blue-penthouse',
    name: 'Starlight Blue Penthouse', type: '4BHK Penthouse',
    area: 'Vikalp Khand, Gomti Nagar',
    price: '₹6,000', lat: 26.8762, lng: 81.0022,
    url: 'starlight-blue-penthouse.html'
  },

  // ─── 3 FLATS / VILLAS IN VISHESH KHAND (GOMTI NAGAR) ───
  {
    roomId: 'VIL-103', slug: 'the-pink-house',
    name: 'The Pink House', type: '5BR Luxury Villa',
    area: 'Vishesh Khand 3, Gomti Nagar',
    price: '₹9,000', lat: 26.8546, lng: 81.0015,
    url: 'the-pink-house.html'
  },
  {
    roomId: 'VIL-104', slug: 'the-green-house',
    name: 'The Green House', type: '3BHK Luxury Villa',
    area: 'Vishesh Khand 3, Gomti Nagar',
    price: '₹5,500', lat: 26.8532, lng: 80.9988,
    url: 'the-green-house.html'
  },
  {
    roomId: 'VIL-105', slug: 'the-yellow-house',
    name: 'The Yellow House', type: '3BHK Luxury Villa',
    area: 'Vishesh Khand 3, Gomti Nagar',
    price: '₹5,500', lat: 26.8562, lng: 81.0038,
    url: 'the-yellow-house.html'
  },

  // ─── 6 PROPERTIES NEAR LULU MALL / SHAHEED PATH / MEDANTA / EKANA ───
  {
    roomId: 'LUL-402', slug: 'celebrity-garden',
    name: 'Celebrity Garden', type: '4BHK Grand Homestay',
    area: 'Sushant Golf City, Near Lulu Mall',
    price: '₹10,000', lat: 26.7792, lng: 81.0028,
    url: 'celebrity-garden.html'
  },
  {
    roomId: 'VIL-107', slug: 'the-velvet-house',
    name: 'The Velvet House', type: 'Luxury Villa',
    area: 'Shaheed Path, Near Medanta & Lulu Mall',
    price: '₹4,500', lat: 26.7918, lng: 80.9865,
    url: 'the-velvet-house.html'
  },
  {
    roomId: 'VIL-101', slug: 'gomti-grand-villa',
    name: 'Gomti Grand Villa', type: 'Private Villa',
    area: 'Geetapuri Colony, Near Lulu & Palassio',
    price: '₹8,000', lat: 26.8042, lng: 81.0048,
    url: 'gomti-grand-villa.html'
  },
  {
    roomId: 'VIL-102', slug: 'royal-white-house',
    name: 'Royal White House', type: 'Luxury Villa',
    area: 'Omaxe City, Near Lulu Mall & Airport',
    price: '₹12,000', lat: 26.7854, lng: 80.9825,
    url: 'royal-white-house.html'
  },
  {
    roomId: 'VIL-106', slug: 'green-forest',
    name: 'Green Forest View', type: '3BHK Boutique Villa',
    area: 'Ansal Golf City, Near Lulu & Ekana',
    price: '₹4,500', lat: 26.7885, lng: 81.0115,
    url: 'green-forest.html'
  },
  {
    roomId: 'VIL-108', slug: 'pink-paradise',
    name: 'Pink Paradise Villa', type: '3BHK Boutique Villa',
    area: 'Shaheed Path, Near Lulu Mall & Medanta',
    price: '₹4,500', lat: 26.7958, lng: 80.9912,
    url: 'pink-paradise.html'
  }
];

// Expose on window for price-sync.js and other modules
window.PROPERTY_PINS = PROPERTY_PINS;

// ─── 1. INIT LEAFLET MAP ───────────────────────────────────────
function initMapSection() {
  const mapEl = document.getElementById('propertyMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Avoid duplicate initialization
  if (mapEl._leaflet_id) return;

  // Initial center on Lucknow Gomti Nagar - Shaheed Path corridor
  const map = L.map('propertyMap', {
    center: [26.828, 81.000],
    zoom: 12,
    scrollWheelZoom: false,
    zoomControl: true
  });

  // OpenStreetMap tiles (no API key required)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Custom gold marker icon (Flats)
  const goldIcon = L.divIcon({
    className: 'uhh-map-marker',
    html: `<div style="
      width: 34px; height: 34px;
      background: linear-gradient(135deg, #b58d3d, #8c6a23);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #fff;
      box-shadow: 0 3px 12px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); color: #fff; font-size: 14px; display: block; line-height: 1;">🏢</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -38]
  });

  // Custom green marker icon (Villas)
  const villaIcon = L.divIcon({
    className: 'uhh-map-marker',
    html: `<div style="
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #1fa463, #166a42);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #fff;
      box-shadow: 0 3px 14px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); color: #fff; font-size: 16px; display: block; line-height: 1;">🏡</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -42]
  });

  // Custom purple marker icon (Penthouse)
  const penthouseIcon = L.divIcon({
    className: 'uhh-map-marker',
    html: `<div style="
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #6366f1, #4338ca);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #fff;
      box-shadow: 0 3px 14px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); color: #fff; font-size: 16px; display: block; line-height: 1;">🌟</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -42]
  });

  const markers = [];
  window._propertyMarkers = window._propertyMarkers || {};

  PROPERTY_PINS.forEach(prop => {
    const isVilla = prop.type.toLowerCase().includes('villa');
    const isPenthouse = prop.type.toLowerCase().includes('penthouse');
    const icon = isPenthouse ? penthouseIcon : (isVilla ? villaIcon : goldIcon);

    const marker = L.marker([prop.lat, prop.lng], { icon }).addTo(map);
    markers.push(marker);

    marker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-area" style="display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#b58d3d;background:#fbf7ee;border:1px solid rgba(181,141,61,0.25);padding:2px 6px;border-radius:4px;margin-bottom:5px;">📍 ${prop.area}</div>
        <div class="map-popup-name">${prop.name}</div>
        <div class="map-popup-type">${prop.type}</div>
        <div class="map-popup-price">${prop.price} / night</div>
        <a class="map-popup-link" href="${prop.url}">Explore ↗</a>
      </div>
    `, { maxWidth: 240 });

    window._propertyMarkers[prop.roomId] = { marker, prop };
  });

  // Fit bounds nicely so all 17 properties across Lucknow are framed cleanly
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// ─── 2. LIVE AVAILABILITY SYNC FROM SUPABASE ──────────────────
async function loadLiveAvailability() {
  try {
    // Get or create Supabase client
    let sbClient = window.sb;
    if (!sbClient && typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      sbClient = window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    if (!sbClient) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch active bookings that cover today from guest_register
    const { data: bookings, error } = await sbClient
      .from('guest_register')
      .select('room_id, guest_name, check_in, check_out, is_cancelled')
      .lte('check_in', todayStr)
      .gt('check_out', todayStr)
      .eq('is_cancelled', false);

    if (error) {
      // Table error or network issue - fail silently
      return;
    }

    // Build a set of booked room IDs for today
    const bookedRoomIds = new Set((bookings || []).map(b => b.room_id));

    // Update each property card
    const allCards = document.querySelectorAll('.dir-card[data-room-id]');
    allCards.forEach(card => {
      const roomId = card.dataset.roomId;
      const availBadge = card.querySelector('.dir-avail-badge');
      if (!availBadge) return;

      if (bookedRoomIds.has(roomId)) {
        availBadge.textContent = '🔴 Booked Today';
        availBadge.className = 'dir-avail-badge dir-avail-booked';
        card.setAttribute('data-availability', 'booked');
      } else {
        availBadge.textContent = '🟢 Available';
        availBadge.className = 'dir-avail-badge dir-avail-free';
        card.setAttribute('data-availability', 'available');
      }
    });

    // Update map markers too
    if (window._propertyMarkers) {
      Object.entries(window._propertyMarkers).forEach(([roomId, { marker, prop }]) => {
        const isBooked = bookedRoomIds.has(roomId);
        const statusText = isBooked ? '🔴 Booked Today' : '🟢 Available Now';
        marker.getPopup().setContent(`
          <div class="map-popup-card">
            <div class="map-popup-area" style="display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#b58d3d;background:#fbf7ee;border:1px solid rgba(181,141,61,0.25);padding:2px 6px;border-radius:4px;margin-bottom:5px;">📍 ${prop.area}</div>
            <div class="map-popup-name">${prop.name}</div>
            <div class="map-popup-type">${prop.type}</div>
            <div style="font-size:12px;font-weight:700;margin:4px 0;color:${isBooked ? '#dc2626' : '#16a34a'};">${statusText}</div>
            <div class="map-popup-price">${prop.price} / night</div>
            <a class="map-popup-link" href="${prop.url}">Explore ↗</a>
          </div>
        `);
      });
    }

    console.log(`[UHH] Availability synced: ${bookedRoomIds.size} booked, ${allCards.length - bookedRoomIds.size} available today`);

  } catch (err) {
    console.warn('[UHH] Availability sync failed silently:', err);
  }
}

// ─── 3. BOOT ON DOM READY ─────────────────────────────────────
function initWebsiteSync() {
  initMapSection();
  loadLiveAvailability();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWebsiteSync);
} else {
  initWebsiteSync();
}
