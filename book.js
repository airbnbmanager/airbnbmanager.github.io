/* ═══════════════════════════════════════════════════════════════════════════
   THE UNIQUE HAVEN HOMES — PUBLIC BOOKING ENGINE (book.js)
   Airbnb DLS Clone Engine with Real-Time Availability & Direct Reservation
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const PROPERTIES = [
  {id:'VIL-102',name:'Royal White House',type:'Grand Palace Villa',img:'assets/properties/royal-white-house/cover.jpg',price:13800,airbnb:16284,guests:18,wa:'919450055554'},
  {id:'VIL-101',name:'Gomti Grand Villa',type:'Private Luxury Villa',img:'assets/properties/gomti-grand-villa/cover.jpg',price:9200,airbnb:10856,guests:14,wa:'919450055554'},
  {id:'GOM-101',name:'RedRose Palace',type:'3BHK Luxury Flat',img:'assets/properties/redrose-palace/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'GOM-102',name:'Black Beauty',type:'3BHK Luxury Flat',img:'assets/properties/black-beauty/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'GOM-201',name:'The Dark Blue',type:'3BHK Luxury Flat',img:'assets/properties/the-dark-blue/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'GOM-202',name:'The Brown',type:'3BHK Luxury Flat',img:'assets/properties/the-brown/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'GOM-301',name:'The Light Green',type:'3BHK Luxury Flat',img:'assets/properties/the-light-green/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'GOM-302',name:'The Unique',type:'3BHK Luxury Flat',img:'assets/properties/the-unique/cover.jpg',price:6300,airbnb:7434,guests:8,wa:'919450055554'},
  {id:'GOM-401',name:'The Nawabi Stay',type:'3BHK Luxury Flat',img:'assets/properties/the-nawabi-stay/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'GOM-501',name:'Starlight Blue PentHouse',type:'Top-Floor Penthouse',img:'assets/properties/starlight-blue/cover.jpg',price:6900,airbnb:8142,guests:10,wa:'919450055554'},
  {id:'VIL-103',name:'The Pink House',type:'5BR Duplex (2nd & 3rd Floor)',img:'assets/properties/the-pink-house/cover.jpg',price:10350,airbnb:12213,guests:10,wa:'919450055554'},
  {id:'VIL-104',name:'The Green House',type:'3BHK 1st Floor',img:'assets/properties/the-green-house/cover.jpg',price:6300,airbnb:7434,guests:8,wa:'919450055554'},
  {id:'VIL-105',name:'The Yellow House',type:'3BHK Ground Floor',img:'assets/properties/the-yellow-house/cover.jpg',price:6300,airbnb:7434,guests:8,wa:'919450055554'},
  {id:'VIL-107',name:'The Velvet House',type:'3BHK 1st Floor',img:'assets/properties/the-velvet-house/cover.jpg',price:5200,airbnb:6136,guests:8,wa:'919450055554'},
  {id:'VIL-106',name:'Green Forest',type:'3BHK 2nd Floor',img:'assets/properties/green-forest/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'VIL-108',name:'Pink Paradise',type:'3BHK 3rd Floor',img:'assets/properties/pink-paradise/cover.jpg',price:5200,airbnb:6136,guests:6,wa:'919450055554'},
  {id:'LUL-101',name:'The Luxe Haven',type:'1BHK Luxury Flat',img:'assets/properties/the-luxe-haven/cover.jpg',price:2650,airbnb:3127,guests:3,wa:'919450055554'},
  {id:'LUL-402',name:'Celebrity Garden',type:'5-Bed Grand Homestay',img:'assets/properties/celebrity-garden/cover.jpg',price:11500,airbnb:13570,guests:16,wa:'919450055554'}
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

let sb = null;
let selectedProp = null;
let currentPhotosList = [];
let lightboxIdx = 0;
let bookedDates = [];
let calViewDate = new Date();
let appliedCoupon = null;
let couponDiscount = 0;
let appliedCouponPropId = null;
let isCalDragging = false;
let calDragStart = null;
let calDragEnd = null;
let calHoverDate = null;
let justDraggedCal = false;

// Property-Specific Built-in Coupons (strictly locked to respective property)
const BUILTIN_COUPONS = {
  // 👑 Royal White House (VIL-102)
  'ROYAL10': { discount_percent: 10, property_id: 'VIL-102', title: 'Royal White House Privilege' },
  'ROYAL15': { discount_percent: 15, property_id: 'VIL-102', title: 'Royal White House Special' },
  'ROYAL20': { discount_percent: 20, property_id: 'VIL-102', title: 'Royal White House Luxury Privilege' },
  'SHAHANSHAH-ROYAL': { discount_percent: 15, property_id: 'VIL-102', title: 'Mr. Shahanshah Royal Privilege' },
  'FIROZ-ROYAL': { discount_percent: 15, property_id: 'VIL-102', title: 'Mr. Firoz Khan Royal Privilege' },

  // 👑 Celebrity Garden (LUL-402)
  'CELEBRITY10': { discount_percent: 10, property_id: 'LUL-402', title: 'Celebrity Garden Privilege' },
  'CELEBRITY15': { discount_percent: 15, property_id: 'LUL-402', title: 'Celebrity Garden Special' },
  'CELEBRITY20': { discount_percent: 20, property_id: 'LUL-402', title: 'Celebrity Garden Luxury Privilege' },
  'SHAHANSHAH-CELEBRITY': { discount_percent: 15, property_id: 'LUL-402', title: 'Mr. Shahanshah Celebrity Privilege' },
  'FIROZ-CELEBRITY': { discount_percent: 15, property_id: 'LUL-402', title: 'Mr. Firoz Khan Celebrity Privilege' },

  // 👑 Gomti Grand Villa (VIL-101)
  'GOMTI10': { discount_percent: 10, property_id: 'VIL-101', title: 'Gomti Grand Villa Privilege' },
  'GOMTI15': { discount_percent: 15, property_id: 'VIL-101', title: 'Gomti Grand Villa Special' },
  'GOMTI20': { discount_percent: 20, property_id: 'VIL-101', title: 'Gomti Grand Villa Luxury Privilege' },
  'SHAHANSHAH-GOMTI': { discount_percent: 15, property_id: 'VIL-101', title: 'Mr. Shahanshah Gomti Villa Privilege' },

  // 👑 The Pink House (VIL-103)
  'PINK10': { discount_percent: 10, property_id: 'VIL-103', title: 'The Pink House Privilege' },
  'PINK15': { discount_percent: 15, property_id: 'VIL-103', title: 'The Pink House Special' },
  'PINK20': { discount_percent: 20, property_id: 'VIL-103', title: 'The Pink House Luxury Privilege' },
  'SHAHANSHAH-PINK': { discount_percent: 15, property_id: 'VIL-103', title: 'Mr. Shahanshah Pink House Privilege' },

  // 👑 Starlight Blue PentHouse (GOM-501)
  'STARLIGHT10': { discount_percent: 10, property_id: 'GOM-501', title: 'Starlight PentHouse Privilege' },
  'STARLIGHT15': { discount_percent: 15, property_id: 'GOM-501', title: 'Starlight PentHouse Special' },
  'STARLIGHT20': { discount_percent: 20, property_id: 'GOM-501', title: 'Starlight PentHouse Luxury Privilege' },
  'SHAHANSHAH-STARLIGHT': { discount_percent: 15, property_id: 'GOM-501', title: 'Mr. Shahanshah Penthouse Privilege' },

  // 👑 The Luxe Haven (LUL-101)
  'LUXE10': { discount_percent: 10, property_id: 'LUL-101', title: 'The Luxe Haven Privilege' },
  'LUXE15': { discount_percent: 15, property_id: 'LUL-101', title: 'The Luxe Haven Special' },
  'LUXE20': { discount_percent: 20, property_id: 'LUL-101', title: 'The Luxe Haven Luxury Privilege' },
  'SHAHANSHAH-LUXE': { discount_percent: 15, property_id: 'LUL-101', title: 'Mr. Shahanshah Luxe Haven Privilege' },

  // 👑 The Unique (GOM-302)
  'UNIQUE10': { discount_percent: 10, property_id: 'GOM-302', title: 'The Unique 3BHK Privilege' },
  'UNIQUE15': { discount_percent: 15, property_id: 'GOM-302', title: 'The Unique Special' },
  'UNIQUE20': { discount_percent: 20, property_id: 'GOM-302', title: 'The Unique Luxury Privilege' },
  'SHAHANSHAH-UNIQUE': { discount_percent: 15, property_id: 'GOM-302', title: 'Mr. Shahanshah The Unique Privilege' },

  // 👑 RedRose Palace (GOM-101)
  'REDROSE10': { discount_percent: 10, property_id: 'GOM-101', title: 'RedRose Palace Privilege' },
  'REDROSE15': { discount_percent: 15, property_id: 'GOM-101', title: 'RedRose Palace Special' },
  'REDROSE20': { discount_percent: 20, property_id: 'GOM-101', title: 'RedRose Palace Luxury Privilege' },

  // 👑 Black Beauty (GOM-102)
  'BLACK10': { discount_percent: 10, property_id: 'GOM-102', title: 'Black Beauty Privilege' },
  'BLACK15': { discount_percent: 15, property_id: 'GOM-102', title: 'Black Beauty Special' },
  'BLACK20': { discount_percent: 20, property_id: 'GOM-102', title: 'Black Beauty Luxury Privilege' },

  // 👑 The Dark Blue (GOM-201)
  'DARKBLUE10': { discount_percent: 10, property_id: 'GOM-201', title: 'The Dark Blue Privilege' },
  'DARKBLUE15': { discount_percent: 15, property_id: 'GOM-201', title: 'The Dark Blue Special' },
  'DARKBLUE20': { discount_percent: 20, property_id: 'GOM-201', title: 'The Dark Blue Luxury Privilege' },

  // 👑 The Brown (GOM-202)
  'BROWN10': { discount_percent: 10, property_id: 'GOM-202', title: 'The Brown Privilege' },
  'BROWN15': { discount_percent: 15, property_id: 'GOM-202', title: 'The Brown Special' },
  'BROWN20': { discount_percent: 20, property_id: 'GOM-202', title: 'The Brown Luxury Privilege' },

  // 👑 The Light Green (GOM-301)
  'LIGHTGREEN10': { discount_percent: 10, property_id: 'GOM-301', title: 'The Light Green Privilege' },
  'LIGHTGREEN15': { discount_percent: 15, property_id: 'GOM-301', title: 'The Light Green Special' },
  'LIGHTGREEN20': { discount_percent: 20, property_id: 'GOM-301', title: 'The Light Green Luxury Privilege' },

  // 👑 The Nawabi Stay (GOM-401)
  'NAWABI10': { discount_percent: 10, property_id: 'GOM-401', title: 'The Nawabi Stay Privilege' },
  'NAWABI15': { discount_percent: 15, property_id: 'GOM-401', title: 'The Nawabi Stay Special' },
  'NAWABI20': { discount_percent: 20, property_id: 'GOM-401', title: 'The Nawabi Stay Luxury Privilege' },

  // 👑 The Green House (VIL-104)
  'GREENHOUSE10': { discount_percent: 10, property_id: 'VIL-104', title: 'The Green House Privilege' },
  'GREENHOUSE15': { discount_percent: 15, property_id: 'VIL-104', title: 'The Green House Special' },
  'GREENHOUSE20': { discount_percent: 20, property_id: 'VIL-104', title: 'The Green House Luxury Privilege' },

  // 👑 The Yellow House (VIL-105)
  'YELLOWHOUSE10': { discount_percent: 10, property_id: 'VIL-105', title: 'The Yellow House Privilege' },
  'YELLOWHOUSE15': { discount_percent: 15, property_id: 'VIL-105', title: 'The Yellow House Special' },
  'YELLOWHOUSE20': { discount_percent: 20, property_id: 'VIL-105', title: 'The Yellow House Luxury Privilege' },

  // 👑 Green Forest (VIL-106)
  'GREENFOREST10': { discount_percent: 10, property_id: 'VIL-106', title: 'Green Forest Privilege' },
  'GREENFOREST15': { discount_percent: 15, property_id: 'VIL-106', title: 'Green Forest Special' },
  'GREENFOREST20': { discount_percent: 20, property_id: 'VIL-106', title: 'Green Forest Luxury Privilege' },

  // 👑 The Velvet House (VIL-107)
  'VELVET10': { discount_percent: 10, property_id: 'VIL-107', title: 'The Velvet House Privilege' },
  'VELVET15': { discount_percent: 15, property_id: 'VIL-107', title: 'The Velvet House Special' },
  'VELVET20': { discount_percent: 20, property_id: 'VIL-107', title: 'The Velvet House Luxury Privilege' },

  // 👑 Pink Paradise (VIL-108)
  'PINKPARADISE10': { discount_percent: 10, property_id: 'VIL-108', title: 'Pink Paradise Privilege' },
  'PINKPARADISE15': { discount_percent: 15, property_id: 'VIL-108', title: 'Pink Paradise Special' },
  'PINKPARADISE20': { discount_percent: 20, property_id: 'VIL-108', title: 'Pink Paradise Luxury Privilege' }
};

// ─── INITIALIZATION ───
function init() {
  if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  // Populate Dropdown
  const sel = document.getElementById('propSelect');
  if (sel) {
    sel.innerHTML = '';
    PROPERTIES.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.type}) — ₹${p.price.toLocaleString('en-IN')}/nt`;
      sel.appendChild(opt);
    });
  }

  // Real-time tariff sync from Supabase rooms table
  if (sb) {
    sb.from('rooms').select('room_id, rent_per_night').then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        let changed = false;
        data.forEach(r => {
          if (r.rent_per_night) {
            const p = PROPERTIES.find(x => x.id === r.room_id);
            if (p && p.price !== Number(r.rent_per_night)) {
              p.price = Number(r.rent_per_night);
              p.airbnb = Math.round(p.price * 1.18);
              changed = true;
            }
          }
        });
        if (changed) {
          if (sel) {
            const cur = sel.value;
            sel.innerHTML = '';
            PROPERTIES.forEach(p => {
              const opt = document.createElement('option');
              opt.value = p.id;
              opt.textContent = `${p.name} (${p.type}) — ₹${p.price.toLocaleString('en-IN')}/nt`;
              sel.appendChild(opt);
            });
            if (cur) sel.value = cur;
          }
          if (selectedProp) {
            const up = PROPERTIES.find(x => x.id === selectedProp.id);
            if (up) selectedProp = up;
          }
          updateSummary();
        }
      }
    }).catch(e => console.warn('Realtime room tariff sync notice:', e));
  }

  // Set min dates for checkin/checkout
  const today = new Date().toISOString().slice(0, 10);
  const ciInput = document.getElementById('checkIn');
  const coInput = document.getElementById('checkOut');
  if (ciInput) ciInput.min = today;
  if (coInput) coInput.min = today;

  // URL Query Parameters parsing (?property=... &checkin=... &checkout=... &coupon=...)
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('property') || params.get('p');
  if (pid && sel) {
    const cleanPid = pid.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = PROPERTIES.find(p => 
      p.id.toLowerCase() === pid.toLowerCase() || 
      p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanPid ||
      cleanPid.includes(p.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanPid)
    );
    if (matched) {
      sel.value = matched.id;
    } else {
      sel.value = pid;
    }
  }

  // Parse Dates from URL
  const ciParam = params.get('checkin') || params.get('checkIn') || params.get('ci');
  const coParam = params.get('checkout') || params.get('checkOut') || params.get('co');
  if (ciParam && ciInput) {
    ciInput.value = ciParam;
    if (coInput) coInput.min = ciParam;
  }
  if (coParam && coInput) {
    coInput.value = coParam;
  }

  // Parse Coupon from URL
  const couponParam = params.get('coupon') || params.get('code');
  if (couponParam) {
    const couponInput = document.getElementById('couponCode');
    if (couponInput) {
      couponInput.value = couponParam.trim().toUpperCase();
      setTimeout(applyCoupon, 300);
    }
  }

  // Parse Guests from URL
  const guestsParam = params.get('guests') || params.get('guest') || params.get('g');
  if (guestsParam) {
    const guestsSelect = document.getElementById('numGuests');
    if (guestsSelect) {
      guestsSelect.value = guestsParam;
    }
  }

  if (!window._bookCalMouseUpBound) {
    window._bookCalMouseUpBound = true;
    window.addEventListener('mouseup', onBookCalMouseUp);
  }

  onPropertyChange();
  fetchLiveDbPrices();
}

// ─── PROPERTY CHANGE ───
function onPropertyChange() {
  const sel = document.getElementById('propSelect');
  if (!sel) return;
  const pid = sel.value || PROPERTIES[0].id;
  selectedProp = PROPERTIES.find(p => p.id === pid) || PROPERTIES[0];

  // Try to find rich data from ShowcaseData CMS
  let showData = null;
  if (typeof window.ShowcaseData !== 'undefined' && typeof window.ShowcaseData.getProperty === 'function') {
    showData = window.ShowcaseData.getProperty(selectedProp.id) || (window.ShowcaseData.BASELINE && window.ShowcaseData.BASELINE[selectedProp.id]);
  }

  // Update Page Header Info
  const titleEl = document.getElementById('listingTitle');
  if (titleEl) {
    titleEl.textContent = `${selectedProp.name} — ${selectedProp.type}`;
  }

  const ratingEl = document.getElementById('listingRatingReviews');
  const wRatingEl = document.getElementById('widgetRatingVal');
  const wRevEl = document.getElementById('widgetReviewsCount');
  const ratingVal = showData?.rating ? showData.rating.toFixed(2) : '4.94';
  const reviewsCount = showData?.reviews || 36;
  if (ratingEl) ratingEl.textContent = `${ratingVal} · ${reviewsCount} reviews`;
  if (wRatingEl) wRatingEl.textContent = ratingVal;
  if (wRevEl) wRevEl.textContent = `· ${reviewsCount} reviews`;

  const locEl = document.getElementById('listingLocation');
  if (locEl) {
    locEl.textContent = showData?.area_name ? `${showData.area_name}, Lucknow` : 'Gomti Nagar & near Lulu Mall, Lucknow';
  }

  // Update Host Specs & Heading
  const headingEl = document.getElementById('hostHeading');
  if (headingEl) {
    headingEl.textContent = `Entire ${selectedProp.type} hosted by Shahanshah & Firoz`;
  }

  const specsEl = document.getElementById('hostSpecsLine');
  if (specsEl) {
    const maxG = showData?.max_guests || selectedProp.guests || 10;
    const beds = showData?.bedrooms || (selectedProp.type.includes('3BHK') ? 3 : 4);
    specsEl.textContent = `Up to ${maxG} guests · ${beds} bedrooms · 24/7 Host Concierge · Free Parking`;
  }

  // Update Price in Widget
  const priceEl = document.getElementById('widgetPriceVal');
  const dockRateEl = document.getElementById('mobileDockRate');
  if (priceEl) priceEl.textContent = `₹${selectedProp.price.toLocaleString('en-IN')}`;
  if (dockRateEl) dockRateEl.textContent = `₹${selectedProp.price.toLocaleString('en-IN')} / night`;

  // Update Direct Host WhatsApp & Call CTAs
  const waBtn = document.getElementById('widgetWaBtn');
  const callBtn = document.getElementById('widgetCallBtn');
  const hostPhone = selectedProp.wa || '919450055554';
  if (waBtn) {
    waBtn.href = `https://wa.me/${hostPhone}?text=${encodeURIComponent(`Namaste! I am inquiring about booking ${selectedProp.name} directly.`)}`;
  }
  if (callBtn) {
    callBtn.href = `tel:+${hostPhone}`;
  }

  // Update Mosaic Photos from ShowcaseData
  updateMosaicPhotos(showData);

  // If a property-locked coupon was previously applied, invalidate it if it does not match this new property
  if (appliedCoupon && appliedCouponPropId && appliedCouponPropId !== selectedProp.id) {
    const prevCoupon = appliedCoupon;
    removeCoupon();
    const msgEl = document.getElementById('couponMsg');
    if (msgEl) {
      msgEl.innerHTML = `⚠️ Promo code <strong>${prevCoupon}</strong> is only applicable to its designated property and was removed for ${selectedProp.name}.`;
      msgEl.style.color = '#dc2626';
    }
  }

  // Clear booked dates and refetch
  bookedDates = [];
  renderCalendar();
  fetchBookedDates();
  checkAvailability();
  updateSummary();
}

// ─── PHOTO MOSAIC RENDER ───
function updateMosaicPhotos(showData) {
  currentPhotosList = [];
  if (showData) {
    if (showData.cover_image) currentPhotosList.push(showData.cover_image);
    if (showData.photos) {
      if (Array.isArray(showData.photos)) {
        showData.photos.forEach(url => {
          if (typeof url === 'string' && url.startsWith('http') && !currentPhotosList.includes(url)) {
            currentPhotosList.push(url);
          }
        });
      } else if (typeof showData.photos === 'object') {
        Object.values(showData.photos).forEach(val => {
          if (Array.isArray(val)) {
            val.forEach(url => {
              if (typeof url === 'string' && url.startsWith('http') && !currentPhotosList.includes(url)) {
                currentPhotosList.push(url);
              }
            });
          }
        });
      }
    }
  }

  // Fallback to property cover if empty
  if (currentPhotosList.length === 0 && selectedProp.img) {
    currentPhotosList.push(selectedProp.img);
  }

  // Assign 5 photos to mosaic
  for (let i = 0; i < 5; i++) {
    const imgEl = document.getElementById(`mosaicImg${i}`);
    if (imgEl) {
      const src = currentPhotosList[i] || currentPhotosList[i % currentPhotosList.length] || selectedProp.img;
      imgEl.src = src;
      imgEl.alt = `${selectedProp.name} — Photo ${i + 1}`;
    }
  }

  const btnText = document.getElementById('mosaicBtnText');
  if (btnText) {
    btnText.textContent = `Show all ${Math.max(currentPhotosList.length, 5)}+ photos`;
  }
}

// ─── FULLSCREEN PHOTO LIGHTBOX ───
function openPhotoLightbox(idx) {
  lightboxIdx = idx || 0;
  updateLightboxView();
  const modal = document.getElementById('photoLightboxModal');
  if (modal) modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePhotoLightbox() {
  const modal = document.getElementById('photoLightboxModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function updateLightboxView() {
  if (currentPhotosList.length === 0) return;
  if (lightboxIdx < 0) lightboxIdx = currentPhotosList.length - 1;
  if (lightboxIdx >= currentPhotosList.length) lightboxIdx = 0;

  const imgEl = document.getElementById('lightboxMainImg');
  const countEl = document.getElementById('lightboxCounter');
  if (imgEl) imgEl.src = currentPhotosList[lightboxIdx];
  if (countEl) countEl.textContent = `Photo ${lightboxIdx + 1} of ${currentPhotosList.length}`;
}

function nextLightboxPhoto() {
  lightboxIdx++;
  updateLightboxView();
}

function prevLightboxPhoto() {
  lightboxIdx--;
  updateLightboxView();
}

// ─── FETCH LIVE PRICES FROM DB ───
async function fetchLiveDbPrices() {
  if (!sb) return;
  try {
    const { data } = await sb.from('rooms').select('room_id, rent_per_night');
    if (data && data.length) {
      data.forEach(r => {
        const p = PROPERTIES.find(x => x.id === r.room_id);
        if (p && r.rent_per_night > 0) p.price = r.rent_per_night;
      });
      // Re-update current selected price
      const priceEl = document.getElementById('widgetPriceVal');
      if (priceEl && selectedProp) {
        priceEl.textContent = `₹${selectedProp.price.toLocaleString('en-IN')}`;
      }
      updateSummary();
    }
  } catch(e) { console.warn('fetchLiveDbPrices error:', e); }
}

// ─── FETCH BOOKED DATES ───
async function fetchBookedDates() {
  if (!sb || !selectedProp) return;
  try {
    const from = new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1).toISOString().slice(0, 10);
    const to   = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 3, 0).toISOString().slice(0, 10);
    const { data } = await sb.from('guest_register')
      .select('check_in, check_out')
      .eq('room_id', selectedProp.id)
      .neq('is_cancelled', true)
      .gte('check_out', from)
      .lte('check_in', to);
    bookedDates = data || [];
  } catch(e) { console.warn('fetchBookedDates error:', e); }
  renderCalendar();
  checkAvailability();
}

function isDateBooked(ds) {
  return bookedDates.some(b => b.check_in <= ds && b.check_out > ds);
}

function isDatePast(ds) {
  return ds < new Date().toISOString().slice(0, 10);
}

// ─── CALENDAR RENDER ───
function renderCalendar() {
  const y = calViewDate.getFullYear();
  const m = calViewDate.getMonth();
  const labelEl = document.getElementById('calMonthLabel');
  if (labelEl) labelEl.textContent = `${MONTHS[m]} ${y}`;

  const grid = document.getElementById('calMonthGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // DOW headers
  DOWS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow-item';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    grid.appendChild(empty);
  }

  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.setAttribute('data-date', ds);

    const numSpan = document.createElement('span');
    numSpan.className = 'cal-num';
    numSpan.textContent = d;
    cell.appendChild(numSpan);

    if (ds === todayStr) cell.classList.add('today');
    if (isDatePast(ds)) {
      cell.classList.add('past');
    } else if (isDateBooked(ds)) {
      cell.classList.add('booked');
      cell.title = 'Date is already booked';
    } else {
      cell.onmousedown = (e) => onBookCalMouseDown(ds, e);
      cell.onmouseenter = () => onBookCalMouseEnter(ds);
      cell.onclick = () => onCalendarDateClick(ds);
    }

    if (ci && co) {
      if (ds === ci) cell.classList.add('selected', 'range-start');
      else if (ds === co) cell.classList.add('selected', 'range-end');
      else if (ds > ci && ds < co) cell.classList.add('range-in');
    } else if (ci && ds === ci) {
      cell.classList.add('selected', 'solo-selected');
    }

    grid.appendChild(cell);
  }

  grid.onmouseleave = onBookCalMouseLeave;
  grid.ontouchstart = onBookCalTouchStart;
  grid.ontouchmove = onBookCalTouchMove;
  grid.ontouchend = onBookCalTouchEnd;
}

function changeCalMonth(delta) {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + delta, 1);
  renderCalendar();
  fetchBookedDates();
}

function hasBookedDatesBetween(d1, d2) {
  if (d1 >= d2) return false;
  const start = new Date(d1);
  const end = new Date(d2);
  const cur = new Date(start);
  while (cur < end) {
    if (isDateBooked(cur.toISOString().slice(0, 10))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

function onBookCalMouseDown(ds, e) {
  if (e && e.button !== 0) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (ds < todayStr || isDateBooked(ds)) return;

  isCalDragging = true;
  calDragStart = ds;
  calDragEnd = null;
  calHoverDate = null;
  justDraggedCal = false;

  const ciInput = document.getElementById('checkIn');
  const coInput = document.getElementById('checkOut');
  if (ciInput && coInput) {
    ciInput.value = ds;
    coInput.value = '';
    const nextDay = new Date(ds);
    nextDay.setDate(nextDay.getDate() + 1);
    coInput.min = nextDay.toISOString().slice(0, 10);
  }
  updateBookCalLiveClasses();
}

function onBookCalMouseEnter(ds) {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (ds < todayStr) return;

  if (isCalDragging && calDragStart) {
    if (ds > calDragStart) {
      if (!hasBookedDatesBetween(calDragStart, ds)) {
        calDragEnd = ds;
        calHoverDate = ds;
        justDraggedCal = true;
      }
    } else if (ds < calDragStart) {
      if (!hasBookedDatesBetween(ds, calDragStart) && !isDateBooked(ds)) {
        calDragEnd = calDragStart;
        calDragStart = ds;
        const ciInput = document.getElementById('checkIn');
        if (ciInput) ciInput.value = ds;
        justDraggedCal = true;
      }
    }
    updateBookCalLiveClasses();
  } else {
    const ciInput = document.getElementById('checkIn');
    const coInput = document.getElementById('checkOut');
    if (ciInput && ciInput.value && (!coInput || !coInput.value)) {
      if (ds > ciInput.value && !isDateBooked(ds) && !hasBookedDatesBetween(ciInput.value, ds)) {
        calHoverDate = ds;
      } else {
        calHoverDate = null;
      }
      updateBookCalLiveClasses();
    }
  }
}

function onBookCalMouseLeave() {
  if (isCalDragging) return;
  if (calHoverDate) {
    calHoverDate = null;
    updateBookCalLiveClasses();
  }
}

function onBookCalMouseUp() {
  if (!isCalDragging) return;
  isCalDragging = false;

  if (calDragStart && calDragEnd && calDragEnd > calDragStart) {
    const ciInput = document.getElementById('checkIn');
    const coInput = document.getElementById('checkOut');
    if (ciInput && coInput) {
      ciInput.value = calDragStart;
      coInput.value = calDragEnd;
    }
    calHoverDate = null;
    calDragStart = null;
    calDragEnd = null;
    onDateChange();
  } else {
    calHoverDate = null;
    calDragEnd = null;
    updateBookCalLiveClasses();
  }
}

function onBookCalTouchStart(e) {
  if (!e.touches || !e.touches[0]) return;
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const cell = target ? target.closest('.cal-day-cell[data-date]') : null;
  if (cell) {
    const ds = cell.getAttribute('data-date');
    const todayStr = new Date().toISOString().slice(0, 10);
    if (ds && ds >= todayStr && !cell.classList.contains('booked')) {
      isCalDragging = true;
      calDragStart = ds;
      calDragEnd = null;
      justDraggedCal = false;
      const ciInput = document.getElementById('checkIn');
      const coInput = document.getElementById('checkOut');
      if (ciInput && coInput) {
        ciInput.value = ds;
        coInput.value = '';
      }
      updateBookCalLiveClasses();
    }
  }
}

function onBookCalTouchMove(e) {
  if (!isCalDragging || !calDragStart || !e.touches || !e.touches[0]) return;
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const cell = target ? target.closest('.cal-day-cell[data-date]') : null;
  if (cell) {
    const ds = cell.getAttribute('data-date');
    if (ds && ds > calDragStart && !cell.classList.contains('booked')) {
      if (!hasBookedDatesBetween(calDragStart, ds)) {
        calDragEnd = ds;
        calHoverDate = ds;
        justDraggedCal = true;
        updateBookCalLiveClasses();
        if (e.cancelable) e.preventDefault();
      }
    }
  }
}

function onBookCalTouchEnd() {
  if (isCalDragging) {
    onBookCalMouseUp();
  }
}

function updateBookCalLiveClasses() {
  const grid = document.getElementById('calMonthGrid');
  if (!grid) return;

  const ciInput = document.getElementById('checkIn');
  const coInput = document.getElementById('checkOut');
  const activeStart = isCalDragging ? calDragStart : (ciInput ? ciInput.value : null);
  const activeEnd = isCalDragging ? calDragEnd : ((coInput && coInput.value) || calHoverDate);

  const cells = grid.querySelectorAll('.cal-day-cell[data-date]');
  cells.forEach(cell => {
    const ds = cell.getAttribute('data-date');
    if (!ds) return;

    cell.classList.remove('selected', 'range-start', 'range-end', 'range-in', 'range-hover-mid', 'range-hover-end', 'solo-selected');

    if (activeStart && !activeEnd) {
      if (ds === activeStart) {
        cell.classList.add('selected', 'solo-selected');
      }
    } else if (activeStart && activeEnd) {
      if (ds === activeStart) {
        cell.classList.add('selected', 'range-start');
      } else if (ds === activeEnd) {
        if (coInput && coInput.value) {
          cell.classList.add('selected', 'range-end');
        } else {
          cell.classList.add('range-hover-end');
        }
      } else if (ds > activeStart && ds < activeEnd) {
        if (coInput && coInput.value) {
          cell.classList.add('range-in');
        } else {
          cell.classList.add('range-hover-mid');
        }
      }
    }
  });
}

function onCalendarDateClick(ds) {
  if (justDraggedCal) {
    justDraggedCal = false;
    return;
  }
  const ciInput = document.getElementById('checkIn');
  const coInput = document.getElementById('checkOut');
  if (!ciInput || !coInput) return;

  if (!ciInput.value || (ciInput.value && coInput.value)) {
    ciInput.value = ds;
    coInput.value = '';
    const nextDay = new Date(ds);
    nextDay.setDate(nextDay.getDate() + 1);
    coInput.min = nextDay.toISOString().slice(0, 10);
  } else if (ciInput.value && !coInput.value) {
    if (ds <= ciInput.value) {
      ciInput.value = ds;
      const nextDay = new Date(ds);
      nextDay.setDate(nextDay.getDate() + 1);
      coInput.min = nextDay.toISOString().slice(0, 10);
    } else {
      if (hasBookedDatesBetween(ciInput.value, ds)) {
        alert('Selected dates ke beech property already booked hai. Kripya doosra date range chunein.');
        return;
      }
      coInput.value = ds;
    }
  }
  calHoverDate = null;
  onDateChange();
}

function onDateChange() {
  const ciInput = document.getElementById('checkIn');
  const coInput = document.getElementById('checkOut');
  if (ciInput && coInput && ciInput.value) {
    const nextDay = new Date(ciInput.value);
    nextDay.setDate(nextDay.getDate() + 1);
    coInput.min = nextDay.toISOString().slice(0, 10);
  }
  renderCalendar();
  checkAvailability();
  updateSummary();
}

// ─── AVAILABILITY CHECK ───
function checkAvailability() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const el = document.getElementById('availStatus');
  const btn = document.getElementById('bookBtn');
  const datePrompt = document.getElementById('navDatePrompt');

  if (!ci || !co || !selectedProp) {
    if (el) el.style.display = 'none';
    if (btn) btn.disabled = true;
    if (datePrompt) datePrompt.textContent = 'Add dates';
    return;
  }

  const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0) {
    if (el) {
      el.style.display = 'flex';
      el.className = 'avail-status unavailable';
      el.innerHTML = '❌ <span>Checkout date must be after check-in.</span>';
    }
    if (btn) btn.disabled = true;
    return;
  }

  if (datePrompt) {
    datePrompt.textContent = `${nights} night${nights > 1 ? 's' : ''}`;
  }

  // Check conflict
  let conflict = false;
  const start = new Date(ci), end = new Date(co);
  const cur = new Date(start);
  while (cur < end) {
    if (isDateBooked(cur.toISOString().slice(0, 10))) {
      conflict = true;
      break;
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (conflict) {
    if (el) {
      el.style.display = 'flex';
      el.className = 'avail-status unavailable';
      el.innerHTML = '❌ <span>Selected dates are booked. Please choose other dates.</span>';
    }
    if (btn) btn.disabled = true;
  } else {
    if (el) {
      el.style.display = 'flex';
      el.className = 'avail-status available';
      el.innerHTML = `✅ <span><strong>${nights} night${nights > 1 ? 's' : ''}</strong> available at ${selectedProp.name}!</span>`;
    }
    if (btn) btn.disabled = false;
  }
}

// ─── PRICING CALCULATION ───
function updateSummary() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const content = document.getElementById('summaryContent');
  const calTitle = document.getElementById('calNightsTitle');
  const calSub = document.getElementById('calSubtext');
  const dockDates = document.getElementById('mobileDockDates');

  if (!ci || !co || !selectedProp) {
    if (content) content.style.display = 'none';
    if (calTitle) calTitle.textContent = 'Select stay dates';
    if (calSub) calSub.textContent = 'Minimum stay: 1 night · Instant host confirmation';
    if (dockDates) dockDates.textContent = 'Add dates for total';
    return;
  }

  const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0) {
    if (content) content.style.display = 'none';
    return;
  }

  if (content) content.style.display = 'flex';
  if (calTitle) calTitle.textContent = `${nights} night${nights > 1 ? 's' : ''} in Lucknow`;
  if (calSub) {
    const fmtIn = new Date(ci + 'T00:00:00').toLocaleDateString('en-IN', {month:'short', day:'numeric'});
    const fmtOut = new Date(co + 'T00:00:00').toLocaleDateString('en-IN', {month:'short', day:'numeric', year:'numeric'});
    calSub.textContent = `${fmtIn} – ${fmtOut} · Direct Host Best Price Guarantee`;
  }

  // Calculate pricing
  let pricing = null;
  if (window.UHH_SEASONAL && typeof window.UHH_SEASONAL.calculateStayPricing === 'function') {
    pricing = window.UHH_SEASONAL.calculateStayPricing(selectedProp.price, ci, co);
  }

  const baseTotal = pricing ? pricing.totalBase : (selectedProp.price * nights);
  const effectiveRate = pricing ? pricing.effectiveNightlyRate : selectedProp.price;
  const gstRate = effectiveRate <= 7500 ? 5 : 18;
  const gstAmt = Math.round(baseTotal * (gstRate / 100));
  const grossWithGst = baseTotal + gstAmt;

  // Airbnb comparison
  const airbnbBaseRate = selectedProp.airbnb || Math.round(selectedProp.price * 1.2);
  const airbnbGuestFee = Math.round(airbnbBaseRate * nights * 0.15);

  // Discount calculation
  const discountAmt = (appliedCoupon && couponDiscount > 0) ? Math.round(grossWithGst * (couponDiscount / 100)) : 0;
  const finalTotal = grossWithGst - discountAmt;

  // Populate DOM breakdown
  const sumNightsEl = document.getElementById('sumNightsBreakdown');
  const sumNightlyTotalEl = document.getElementById('sumNightlyTotal');
  const sumGstLabelEl = document.getElementById('sumGstLabel');
  const sumGstEl = document.getElementById('sumGst');
  const sumFeeStrikeEl = document.getElementById('sumAirbnbFeeStrike');
  const sumTotalEl = document.getElementById('sumTotal');

  if (sumNightsEl) sumNightsEl.textContent = `₹${effectiveRate.toLocaleString('en-IN')} x ${nights} night${nights > 1 ? 's' : ''}`;
  if (sumNightlyTotalEl) sumNightlyTotalEl.textContent = `₹${baseTotal.toLocaleString('en-IN')}`;
  if (sumGstLabelEl) sumGstLabelEl.textContent = `Taxes & GST (${gstRate}% · SAC 996311)`;
  if (sumGstEl) sumGstEl.textContent = `+₹${gstAmt.toLocaleString('en-IN')}`;
  if (sumFeeStrikeEl) sumFeeStrikeEl.textContent = `₹${airbnbGuestFee.toLocaleString('en-IN')}`;
  if (sumTotalEl) sumTotalEl.textContent = `₹${finalTotal.toLocaleString('en-IN')}`;

  // Coupon discount row
  const coupRow = document.getElementById('couponDiscountRow');
  const coupVal = document.getElementById('sumDiscount');
  const coupLabel = document.getElementById('couponCodeLabel');
  if (coupRow && coupVal) {
    if (appliedCoupon && discountAmt > 0) {
      coupRow.style.display = 'flex';
      coupVal.textContent = `-₹${discountAmt.toLocaleString('en-IN')}`;
      if (coupLabel) coupLabel.textContent = `${appliedCoupon} (${couponDiscount}% OFF)`;
    } else {
      coupRow.style.display = 'none';
    }
  }

  if (dockDates) {
    dockDates.textContent = `${nights} night${nights > 1 ? 's' : ''} · ₹${finalTotal.toLocaleString('en-IN')} total`;
  }
  updateCouponWhatsAppPrompt();
}

// ─── COUPON & FOUNDER DISCOUNT HANDLING ───
function updateCouponWhatsAppPrompt() {
  const msgEl = document.getElementById('couponMsg');
  if (!msgEl || appliedCoupon) return;

  const propName = selectedProp ? selectedProp.name : 'a luxury stay';
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = (ci && co) ? Math.max(1, Math.round((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24))) : 1;
  const finalTotalEl = document.getElementById('sumTotal');
  const totalStr = finalTotalEl ? finalTotalEl.textContent : '';

  let stayText = propName;
  if (ci && co) {
    stayText += ` (${nights} night${nights > 1 ? 's' : ''}, ${ci} to ${co}`;
    if (totalStr) stayText += `, est. ${totalStr}`;
    stayText += `)`;
  }

  const promptText = encodeURIComponent(
    `Namaste Mr. Shahanshah & Mr. Firoz Khan! I am booking ${stayText} with The Unique Haven Homes. Could you please share an exclusive owner discount promo code with me?`
  );

  msgEl.innerHTML = `Need an extra discount? <a href="https://wa.me/919450055554?text=${promptText}" target="_blank" rel="noopener" style="color:#059669; font-weight:700; text-decoration:underline;">💬 Ask Founders Mr. Shahanshah &amp; Mr. Firoz Khan directly on WhatsApp for an exclusive discount code ➔</a>`;
  msgEl.style.color = '#717171';
}

async function applyCoupon() {
  const codeInput = document.getElementById('couponCode');
  const msgEl = document.getElementById('couponMsg');
  if (!codeInput) return;
  const code = codeInput.value.trim().toUpperCase();
  if (!code) return;

  if (BUILTIN_COUPONS[code]) {
    const coup = BUILTIN_COUPONS[code];
    // Strict property-lock validation: code only applies to designated property
    if (coup.property_id && (!selectedProp || coup.property_id !== selectedProp.id)) {
      const targetProp = PROPERTIES.find(p => p.id === coup.property_id);
      const targetName = targetProp ? targetProp.name : coup.property_id;
      const currentName = selectedProp ? selectedProp.name : 'this stay';
      if (msgEl) {
        msgEl.innerHTML = `⚠️ Promo code <strong>${code}</strong> is exclusively valid for <strong>${targetName}</strong>. It cannot be applied to ${currentName}.`;
        msgEl.style.color = '#dc2626';
      }
      return;
    }

    appliedCoupon = code;
    appliedCouponPropId = coup.property_id || (selectedProp ? selectedProp.id : null);
    couponDiscount = coup.discount_percent;
    lockCouponUI(code);
    if (msgEl) {
      let badge = coup.title || 'Direct Host Privilege';
      if (code.startsWith('SHAHANSHAH')) {
        badge = '👑 Mr. Shahanshah Exclusive Owner Privilege';
      } else if (code.startsWith('FIROZ')) {
        badge = '👑 Mr. Firoz Khan Exclusive Owner Privilege';
      } else if (code.startsWith('FOUNDER')) {
        badge = '👑 Founders Shahanshah & Firoz Exclusive Privilege';
      } else if (code.startsWith('VIP')) {
        badge = '⭐ VIP Direct Host Privilege';
      } else if (code.includes('REPEAT')) {
        badge = '🔁 Repeat Guest Privilege';
      }
      msgEl.innerHTML = `🎉 Code <strong>${code}</strong> applied! <strong>${couponDiscount}% OFF</strong> (${badge}) added.`;
      msgEl.style.color = '#059669';
    }
    updateSummary();
    return;
  }

  if (sb) {
    try {
      const { data } = await sb.from('coupon_codes').select('*').eq('code', code).eq('is_active', true).maybeSingle();
      if (data) {
        const propLock = data.room_id || data.property_id;
        if (propLock && (!selectedProp || propLock !== selectedProp.id)) {
          const targetProp = PROPERTIES.find(p => p.id === propLock);
          const targetName = targetProp ? targetProp.name : propLock;
          const currentName = selectedProp ? selectedProp.name : 'this stay';
          if (msgEl) {
            msgEl.innerHTML = `⚠️ Promo code <strong>${code}</strong> is exclusively valid for <strong>${targetName}</strong>. It cannot be applied to ${currentName}.`;
            msgEl.style.color = '#dc2626';
          }
          return;
        }

        appliedCoupon = code;
        appliedCouponPropId = propLock || (selectedProp ? selectedProp.id : null);
        couponDiscount = Number(data.discount_percent || 10);
        lockCouponUI(code);
        if (msgEl) {
          msgEl.innerHTML = `🎉 Code <strong>${code}</strong> applied! <strong>${couponDiscount}% OFF</strong> (${data.title || 'Special Host Privilege'}) added.`;
          msgEl.style.color = '#059669';
        }
        updateSummary();
        return;
      }
    } catch(e) { console.warn('Coupon lookup error:', e); }
  }

  // Not recognized fallback
  if (msgEl) {
    msgEl.innerHTML = `⚠️ Code <strong>${code}</strong> recorded. Founders Shahanshah &amp; Firoz will verify and apply your privilege during confirmation.`;
    msgEl.style.color = '#0284c7';
  }
}

function lockCouponUI(code) {
  const codeInput = document.getElementById('couponCode');
  const applyBtn = document.getElementById('couponApplyBtn');
  const removeBtn = document.getElementById('couponRemoveBtn');
  if (codeInput) {
    codeInput.value = code;
    codeInput.readOnly = true;
    codeInput.style.background = '#f8fafc';
  }
  if (applyBtn) applyBtn.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'block';
}

function removeCoupon() {
  appliedCoupon = null;
  appliedCouponPropId = null;
  couponDiscount = 0;
  const codeInput = document.getElementById('couponCode');
  const applyBtn = document.getElementById('couponApplyBtn');
  const removeBtn = document.getElementById('couponRemoveBtn');
  if (codeInput) {
    codeInput.value = '';
    codeInput.readOnly = false;
    codeInput.style.background = '#ffffff';
    codeInput.focus();
  }
  if (applyBtn) applyBtn.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  updateCouponWhatsAppPrompt();
  updateSummary();
}

// ─── SUBMISSION ENGINE ───
async function submitBookingRequest() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const name = document.getElementById('guestName')?.value.trim();
  const rawPhone = document.getElementById('guestPhone')?.value.trim().replace(/\D/g, '');
  const guests = document.getElementById('guestCount')?.value || 2;
  const purpose = document.getElementById('stayPurpose')?.value;
  const special = document.getElementById('specialReq')?.value.trim();

  if (!selectedProp) { alert('Please select a property.'); return; }
  if (!ci || !co) { alert('Please select your check-in and checkout dates.'); return; }
  if (!name) { alert('Please enter your full name as on Government ID.'); return; }
  if (!rawPhone || rawPhone.length < 10) { alert('Please enter a valid 10-digit mobile number.'); return; }

  const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0) { alert('Checkout date must be after check-in.'); return; }

  const btn = document.getElementById('bookBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Submitting Reservation…';

  let pricing = null;
  if (window.UHH_SEASONAL && typeof window.UHH_SEASONAL.calculateStayPricing === 'function') {
    pricing = window.UHH_SEASONAL.calculateStayPricing(selectedProp.price, ci, co);
  }

  const baseTotal = pricing ? pricing.totalBase : (selectedProp.price * nights);
  const effectiveRate = pricing ? pricing.effectiveNightlyRate : selectedProp.price;
  const gstRate = effectiveRate <= 7500 ? 5 : 18;
  const gstAmt = Math.round(baseTotal * (gstRate / 100));
  const grossWithGst = baseTotal + gstAmt;

  const discountAmt = (appliedCoupon && couponDiscount > 0) ? Math.round(grossWithGst * (couponDiscount / 100)) : 0;
  const finalTotal = grossWithGst - discountAmt;
  const bookingId = 'BK-' + Date.now();
  const phone91 = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;

  const noteParts = [
    `Direct Website Booking (Airbnb Clone Page)`,
    `Property: ${selectedProp.name} (${selectedProp.id})`,
    `Tariff: ₹${baseTotal} (${nights} nts @ ₹${effectiveRate}/nt) + ${gstRate}% GST (₹${gstAmt}) = Gross ₹${grossWithGst}`,
    `Purpose: ${purpose || 'Holiday/Leisure'}`
  ];
  if (appliedCoupon) {
    noteParts.push(`Coupon: ${appliedCoupon} (${couponDiscount}% OFF, -₹${discountAmt}) | Final Direct: ₹${finalTotal}`);
  }
  if (special) {
    noteParts.push(`Special Request: ${special}`);
  }
  const notesText = noteParts.join(' | ');

  // Direct Save into Supabase CRM guest_register table
  if (!sb && typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  if (sb) {
    try {
      const { data: bData, error: bErr } = await sb.from('guest_register').insert({
        booking_id: bookingId,
        room_id: selectedProp.id,
        guest_name: name,
        phone: phone91,
        check_in: ci,
        check_out: co,
        check_in_time: '14:00',
        check_out_time: '11:00',
        guests: parseInt(guests, 10) || 2,
        per_day_rate: effectiveRate,
        total_amount: finalTotal,
        booking_mode: 'Direct-Website',
        payment_status: 'Unpaid',
        notes: notesText,
        booked_by: 'Website Direct',
        is_cancelled: false,
        verification_status: 'pending',
        checkout_confirmed: false
      }).select();

      if (bErr) {
        console.error('Supabase guest_register save error:', bErr);
        alert('❌ Booking could not be registered automatically: ' + (bErr.message || 'Database connection issue') + '\nPlease contact host on WhatsApp or phone.');
        btn.innerHTML = origHtml;
        btn.disabled = false;
        return;
      } else {
        console.log('✅ Booking successfully saved to guest_register as pending approval:', bData);
      }
    } catch(err) {
      console.warn('guest_register save error:', err);
      alert('❌ Unexpected error: ' + (err.message || 'Server unreachable') + '\nPlease try again or contact host.');
      btn.innerHTML = origHtml;
      btn.disabled = false;
      return;
    }
  }

  // Pre-fill WhatsApp confirmation message
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
  const waMsg = [
    '🏠 *NEW DIRECT BOOKING REQUEST*',
    '*The Unique Haven Homes (Direct Guest Channel)*',
    '',
    `🔖 *Booking ID:* ${bookingId}`,
    `👤 *Guest:* ${name}`,
    `📱 *Phone:* +${phone91}`,
    `🏡 *Property:* ${selectedProp.name}`,
    `📅 *Check-in:* ${fmt(ci)} (14:00)`,
    `📅 *Check-out:* ${fmt(co)} (11:00)`,
    `🌙 *Duration:* ${nights} Night(s) · ${guests} Guest(s)`,
    `✨ *Estimated Direct Total:* ₹${finalTotal.toLocaleString('en-IN')}`,
    special ? `📝 *Special Request:* ${special}` : '',
    '',
    '_Status: Awaiting Host Verification & Allotment._',
    '_Sent from uniquehavenhomestay.com_'
  ].filter(Boolean).join('\n');

  const waPhone = selectedProp.wa || '919450055554';
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`;

  // Optional WhatsApp Button binding
  const optionalWaBtn = document.getElementById('modalOptionalWaBtn');
  if (optionalWaBtn) optionalWaBtn.href = waUrl;

  btn.innerHTML = origHtml;
  btn.disabled = false;

  // Show Success Modal
  const successEl = document.getElementById('successMsg');
  if (successEl) {
    successEl.innerHTML = `
      Thank you <strong>${name}</strong>! Your reservation request for <strong>${selectedProp.name}</strong> (${nights} night${nights > 1 ? 's' : ''}) has been registered.<br><br>
      <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; font-weight:700; color:#92400e; display:inline-block; margin-bottom:12px;">
        Booking Reference ID: ${bookingId}
      </div><br>
      <div style="font-size:13.5px; color:#059669; font-weight:600;">
        Status: 🟡 Awaiting Host Approval & Allotment &middot; Founders Mr. Firoz Khan and Mr. Shahanshah will confirm your dates shortly on +91 ${phone91.slice(-10)}.
      </div>
    `;
  }

  const modal = document.getElementById('successModal');
  if (modal) modal.style.display = 'flex';
}

// ─── SHARE & SAVE ───
function shareProperty() {
  if (navigator.share) {
    navigator.share({
      title: `${selectedProp.name} | The Unique Haven Homes`,
      text: `Check out ${selectedProp.name} in Lucknow directly on The Unique Haven Homes. Save 15% vs Airbnb!`,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('📋 Property link copied to clipboard!');
    });
  }
}

function toggleSaveProperty(btn) {
  if (!btn) return;
  const svg = btn.querySelector('svg');
  if (!svg) return;
  if (svg.getAttribute('fill') === 'currentColor') {
    svg.setAttribute('fill', 'none');
    svg.style.color = '';
  } else {
    svg.setAttribute('fill', 'currentColor');
    svg.style.color = '#FF385C';
  }
}

function scrollToReserveWidget() {
  const widget = document.querySelector('.airbnb-reserve-widget');
  if (widget) {
    widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}
