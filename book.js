/* ═══════════════════════════════════════════════════════════════════════════
   THE UNIQUE HAVEN HOMES — PUBLIC BOOKING ENGINE (book.js)
   Airbnb DLS Clone Engine with Real-Time Availability & Direct Reservation
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const PROPERTIES = [
  {id:'VIL-102',name:'Royal White House',type:'Grand Palace Villa',img:'assets/properties/royal-white-house/cover.jpg',price:12000,airbnb:14499,guests:18,wa:'919450055554'},
  {id:'VIL-101',name:'Gomti Grand Villa',type:'Private Luxury Villa',img:'assets/properties/gomti-grand-villa/cover.jpg',price:8000,airbnb:9599,guests:14,wa:'919450055554'},
  {id:'GOM-101',name:'RedRose Palace',type:'3BHK Luxury Flat',img:'assets/properties/redrose-palace/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-102',name:'Black Beauty',type:'3BHK Luxury Flat',img:'assets/properties/black-beauty/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-201',name:'The Dark Blue',type:'3BHK Luxury Flat',img:'assets/properties/the-dark-blue/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-202',name:'The Brown',type:'3BHK Luxury Flat',img:'assets/properties/the-brown/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-301',name:'The Light Green',type:'3BHK Luxury Flat',img:'assets/properties/the-light-green/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-302',name:'The Unique',type:'3BHK Luxury Flat',img:'assets/properties/the-unique/cover.jpg',price:5500,airbnb:6499,guests:8,wa:'919450055554'},
  {id:'GOM-401',name:'The Nawabi Stay',type:'3BHK Luxury Flat',img:'assets/properties/the-nawabi-stay/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'918299600709'},
  {id:'GOM-501',name:'Starlight Blue PentHouse',type:'Top-Floor Penthouse',img:'assets/properties/starlight-blue/cover.jpg',price:6000,airbnb:7299,guests:10,wa:'919450055554'},
  {id:'VIL-103',name:'The Pink House',type:'5BR Duplex (2nd & 3rd Floor)',img:'assets/properties/the-pink-house/cover.jpg',price:9000,airbnb:10999,guests:10,wa:'918299600709'},
  {id:'VIL-104',name:'The Green House',type:'3BHK 1st Floor',img:'assets/properties/the-green-house/cover.jpg',price:5500,airbnb:6599,guests:8,wa:'919450055554'},
  {id:'VIL-105',name:'The Yellow House',type:'3BHK Ground Floor',img:'assets/properties/the-yellow-house/cover.jpg',price:5500,airbnb:6599,guests:8,wa:'918299600709'},
  {id:'VIL-107',name:'The Velvet House',type:'3BHK 1st Floor',img:'assets/properties/the-velvet-house/cover.jpg',price:4500,airbnb:5499,guests:8,wa:'919450055554'},
  {id:'VIL-106',name:'Green Forest',type:'3BHK 2nd Floor',img:'assets/properties/green-forest/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'918299600709'},
  {id:'VIL-108',name:'Pink Paradise',type:'3BHK 3rd Floor',img:'assets/properties/pink-paradise/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'918299600709'},
  {id:'LUL-101',name:'The Luxe Haven',type:'1BHK Luxury Flat',img:'assets/properties/the-luxe-haven/cover.jpg',price:2650,airbnb:2981,guests:3,wa:'919450055554'},
  {id:'LUL-402',name:'Celebrity Garden',type:'5-Bed Grand Homestay',img:'assets/properties/celebrity-garden/cover.jpg',price:10000,airbnb:11999,guests:16,wa:'919450055554'}
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

// Built-in VIP Coupons
const BUILTIN_COUPONS = {
  'REPEAT10': { discount_percent: 10, min_nights: 1 },
  'HAVEN10': { discount_percent: 10, min_nights: 1 },
  'REPEATGUEST': { discount_percent: 10, min_nights: 1 },
  'ROYAL15': { discount_percent: 15, min_nights: 2 },
  'DIRECT10': { discount_percent: 10, min_nights: 1 },
  'DIRECT15': { discount_percent: 15, min_nights: 2 },
  'WELCOME10': { discount_percent: 10, min_nights: 1 }
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
    headingEl.textContent = `Entire ${selectedProp.type} hosted by Firoz & Shahanshah`;
  }

  const specsEl = document.getElementById('hostSpecsLine');
  if (specsEl) {
    const maxG = showData?.max_guests || selectedProp.guests || 10;
    const beds = showData?.bedrooms || (selectedProp.type.includes('3BHK') ? 3 : 4);
    specsEl.textContent = `Up to ${maxG} guests · ${beds} bedrooms · Dedicated Caretaker · Free Parking`;
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
    cell.textContent = d;

    if (ds === todayStr) cell.classList.add('today');
    if (isDatePast(ds)) {
      cell.classList.add('past');
    } else if (isDateBooked(ds)) {
      cell.classList.add('booked');
      cell.title = 'Date is already booked';
    } else {
      cell.onclick = () => onCalendarDateClick(ds);
    }

    if (ci && ds === ci) cell.classList.add('selected');
    if (co && ds === co) cell.classList.add('selected');
    if (ci && co && ds > ci && ds < co) cell.classList.add('range-in');

    grid.appendChild(cell);
  }
}

function changeCalMonth(delta) {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + delta, 1);
  renderCalendar();
  fetchBookedDates();
}

function onCalendarDateClick(ds) {
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
    } else {
      coInput.value = ds;
    }
  }
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
}

// ─── COUPON HANDLING ───
async function applyCoupon() {
  const codeInput = document.getElementById('couponCode');
  const msgEl = document.getElementById('couponMsg');
  if (!codeInput) return;
  const code = codeInput.value.trim().toUpperCase();
  if (!code) return;

  if (BUILTIN_COUPONS[code]) {
    appliedCoupon = code;
    couponDiscount = BUILTIN_COUPONS[code].discount_percent;
    lockCouponUI(code);
    if (msgEl) {
      msgEl.innerHTML = `🎉 Code <strong>${code}</strong> applied! <strong>${couponDiscount}% Direct Host Discount</strong> added.`;
      msgEl.style.color = '#059669';
    }
    updateSummary();
    return;
  }

  if (sb) {
    try {
      const { data } = await sb.from('coupon_codes').select('*').eq('code', code).eq('is_active', true).maybeSingle();
      if (data) {
        appliedCoupon = code;
        couponDiscount = Number(data.discount_percent || 10);
        lockCouponUI(code);
        if (msgEl) {
          msgEl.innerHTML = `🎉 Code <strong>${code}</strong> applied! <strong>${couponDiscount}% OFF</strong> added.`;
          msgEl.style.color = '#059669';
        }
        updateSummary();
        return;
      }
    } catch(e) { console.warn('Coupon lookup error:', e); }
  }

  // Not recognized fallback
  if (msgEl) {
    msgEl.innerHTML = `⚠️ Code <strong>${code}</strong> noted. Will be verified directly by host.`;
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
  couponDiscount = 0;
  const codeInput = document.getElementById('couponCode');
  const applyBtn = document.getElementById('couponApplyBtn');
  const removeBtn = document.getElementById('couponRemoveBtn');
  const msgEl = document.getElementById('couponMsg');
  if (codeInput) {
    codeInput.value = '';
    codeInput.readOnly = false;
    codeInput.style.background = '#ffffff';
    codeInput.focus();
  }
  if (applyBtn) applyBtn.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  if (msgEl) {
    msgEl.innerHTML = `Want a special discount code? <a href="https://wa.me/919450055554?text=Namaste%20Mr.%20Firoz%20Khan%20%26%20Mr.%20Shahanshah!%20I%20am%20booking%20a%20stay%20with%20The%20Unique%20Haven%20Homes%20and%20would%20like%20to%20request%20a%20special%20discount%20promo%20code." target="_blank" rel="noopener" style="color:#059669; font-weight:700; text-decoration:underline;">💬 Ask owners Firoz &amp; Shahanshah directly for extra discount on WhatsApp ➔</a>`;
    msgEl.style.color = '#717171';
  }
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
