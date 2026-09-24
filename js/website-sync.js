/* ══════════════════════════════════════════════════════════════
   THE UNIQUE HAVEN HOMES — WEBSITE SYNC
   1. Leaflet Map: All 17 property pins in Gomti Nagar
   2. Live Availability: Supabase bookings → card badges
   ══════════════════════════════════════════════════════════════ */

// ─── PROPERTY DATA: All 17 Properties with GPS Coordinates ───
const PROPERTY_PINS = [
  {
    roomId: 'GOM-101', slug: 'redrose-palace',
    name: 'RedRose Palace', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8721, lng: 80.9997,
    url: 'redrose-palace.html'
  },
  {
    roomId: 'GOM-102', slug: 'black-beauty',
    name: 'Black Beauty', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8718, lng: 80.9993,
    url: 'black-beauty.html'
  },
  {
    roomId: 'GOM-201', slug: 'the-dark-blue',
    name: 'The Dark Blue', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8725, lng: 81.0003,
    url: 'the-dark-blue.html'
  },
  {
    roomId: 'GOM-202', slug: 'the-brown',
    name: 'The Brown', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8730, lng: 81.0009,
    url: 'the-brown.html'
  },
  {
    roomId: 'GOM-301', slug: 'the-light-green',
    name: 'The Light Green', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8715, lng: 80.9989,
    url: 'the-light-green.html'
  },
  {
    roomId: 'GOM-401', slug: 'the-nawabi-stay',
    name: 'The Nawabi Stay', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8728, lng: 80.9985,
    url: 'the-nawabi-stay.html'
  },
  {
    roomId: 'GOM-501', slug: 'starlight-blue-penthouse',
    name: 'Starlight Blue Penthouse', type: '4BHK Penthouse',
    price: '₹5,999', lat: 26.8736, lng: 81.0014,
    url: 'starlight-blue-penthouse.html'
  },
  {
    roomId: 'GOM-302', slug: 'the-unique',
    name: 'The Unique', type: '3BHK Luxury Flat',
    price: '₹4,299', lat: 26.8640, lng: 81.0070,
    url: 'the-unique.html'
  },
  {
    roomId: 'VIL-104', slug: 'the-green-house',
    name: 'The Green House', type: '3BHK Luxury Flat',
    price: '₹4,299', lat: 26.8635, lng: 81.0065,
    url: 'the-green-house.html'
  },
  {
    roomId: 'VIL-103', slug: 'the-pink-house',
    name: 'The Pink House', type: '3BHK Luxury Flat',
    price: '₹4,299', lat: 26.8645, lng: 81.0075,
    url: 'the-pink-house.html'
  },
  {
    roomId: 'VIL-105', slug: 'the-yellow-house',
    name: 'The Yellow House', type: '3BHK Luxury Flat',
    price: '₹4,299', lat: 26.8648, lng: 81.0080,
    url: 'the-yellow-house.html'
  },
  {
    roomId: 'VIL-106', slug: 'green-forest',
    name: 'Green Forest', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8586, lng: 81.0120,
    url: 'green-forest.html'
  },
  {
    roomId: 'VIL-108', slug: 'pink-paradise',
    name: 'Pink Paradise', type: '3BHK Luxury Flat',
    price: '₹4,499', lat: 26.8590, lng: 81.0128,
    url: 'pink-paradise.html'
  },
  {
    roomId: 'LUL-402', slug: 'celebrity-garden',
    name: 'Celebrity Garden', type: '5-Bed Luxury Flat',
    price: '₹5,499', lat: 26.8330, lng: 80.9820,
    url: 'celebrity-garden.html'
  },
  {
    roomId: 'VIL-101', slug: 'gomti-grand-villa',
    name: 'Gomti Grand Villa', type: 'Private Villa',
    price: '₹7,999', lat: 26.8583, lng: 81.0100,
    url: 'gomti-grand-villa.html'
  },
  {
    roomId: 'VIL-102', slug: 'royal-white-house',
    name: 'Royal White House', type: 'Luxury Villa',
    price: '₹7,499', lat: 26.8578, lng: 81.0115,
    url: 'royal-white-house.html'
  },
  {
    roomId: 'VIL-107', slug: 'the-velvet-house',
    name: 'The Velvet House', type: 'Luxury Villa',
    price: '₹6,999', lat: 26.8325, lng: 80.9810,
    url: 'the-velvet-house.html'
  }
];

// ─── 1. INIT LEAFLET MAP ───────────────────────────────────────
function initMapSection() {
  const mapEl = document.getElementById('propertyMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Center on Gomti Nagar, Lucknow
  const map = L.map('propertyMap', {
    center: [26.862, 81.000],
    zoom: 13,
    scrollWheelZoom: false,
    zoomControl: true
  });

  // OpenStreetMap tiles (no API key required)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Custom gold marker icon
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
    "><span style="transform: rotate(45deg); color: #fff; font-size: 14px; display: block; line-height: 1;">🏠</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -38]
  });

  const villaIcon = L.divIcon({
    className: 'uhh-map-marker',
    html: `<div style="
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #1fa463, #166a42);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #fff;
      box-shadow: 0 3px 14px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); color: #fff; font-size: 16px; display: block; line-height: 1;">🏡</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -44]
  });

  PROPERTY_PINS.forEach(prop => {
    const isVilla = prop.type.toLowerCase().includes('villa');
    const icon = isVilla ? villaIcon : goldIcon;

    const marker = L.marker([prop.lat, prop.lng], { icon }).addTo(map);

    marker.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-name">${prop.name}</div>
        <div class="map-popup-type">${prop.type}</div>
        <div class="map-popup-price">${prop.price} / night</div>
        <a class="map-popup-link" href="${prop.url}">Explore ↗</a>
      </div>
    `, { maxWidth: 220 });

    // Store marker reference on window for availability updates
    window._propertyMarkers = window._propertyMarkers || {};
    window._propertyMarkers[prop.roomId] = { marker, prop };
  });
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

    // Fetch active bookings that cover today
    const { data: bookings, error } = await sbClient
      .from('bookings')
      .select('room_id, guest_name, check_in, check_out, status')
      .lte('check_in', todayStr)
      .gte('check_out', todayStr)
      .in('status', ['confirmed', 'checked_in', 'active', 'occupied']);

    if (error) {
      console.warn('[UHH] Availability sync error:', error.message);
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
