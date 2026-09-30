/* book.js — Public Booking Page Logic */
'use strict';

const PROPERTIES = [
  {id:'GOM-101',name:'RedRose Palace',type:'3BHK Luxury Flat',img:'assets/properties/redrose-palace/cover.jpg',price:2999,airbnb:3599,guests:8,wa:'919450055554'},
  {id:'GOM-102',name:'Black Beauty',type:'3BHK Luxury Flat',img:'assets/properties/black-beauty/cover.jpg',price:2999,airbnb:3599,guests:8,wa:'919450055554'},
  {id:'GOM-201',name:'The Dark Blue',type:'3BHK Luxury Flat',img:'assets/properties/the-dark-blue/cover.jpg',price:3499,airbnb:4199,guests:10,wa:'919450055554'},
  {id:'GOM-202',name:'The Brown',type:'3BHK Luxury Flat',img:'assets/properties/the-brown/cover.jpg',price:3499,airbnb:4199,guests:10,wa:'919450055554'},
  {id:'GOM-301',name:'The Light Green',type:'3BHK Luxury Flat',img:'assets/properties/the-light-green/cover.jpg',price:3499,airbnb:4199,guests:8,wa:'919450055554'},
  {id:'GOM-401',name:'The Nawabi Stay',type:'3BHK Luxury Flat',img:'assets/properties/the-nawabi-stay/cover.jpg',price:3999,airbnb:4799,guests:10,wa:'918299600709'},
  {id:'GOM-501',name:'Starlight Blue Penthouse',type:'Top-Floor Penthouse',img:'assets/properties/starlight-blue/cover.jpg',price:4199,airbnb:4999,guests:12,wa:'919450055554'},
  {id:'VIL-101',name:'The Pink House',type:'3BHK Luxury Flat',img:'assets/properties/the-pink-house/cover.jpg',price:3499,airbnb:4199,guests:8,wa:'918299600709'},
  {id:'VIL-102',name:'The Yellow House',type:'3BHK Luxury Flat',img:'assets/properties/the-yellow-house/cover.jpg',price:3499,airbnb:4199,guests:8,wa:'918299600709'},
  {id:'VIL-103',name:'Green Forest',type:'3BHK Luxury Flat',img:'assets/properties/green-forest/cover.jpg',price:3499,airbnb:4199,guests:8,wa:'918299600709'},
  {id:'VIL-104',name:'Blossom Skyline',type:'Boutique Stay',img:'assets/properties/blossom-skyline/cover.jpg',price:3999,airbnb:4799,guests:8,wa:'919450055554'},
  {id:'LUL-402',name:'Celebrity Garden',type:'5-Bed Luxury Villa',img:'assets/properties/celebrity-garden/cover.jpg',price:5999,airbnb:7499,guests:16,wa:'919450055554'},
  {id:'VIL-105',name:'The Medanta Suite',type:'3BHK Luxury Flat',img:'assets/properties/the-medanta-suite/cover.jpg',price:3499,airbnb:4199,guests:8,wa:'918299600709'},
  {id:'VIL-106',name:'The Velvet House',type:'Luxury Villa',img:'assets/properties/the-velvet-house/cover.jpg',price:4999,airbnb:5999,guests:12,wa:'919450055554'},
  {id:'VIL-107',name:'Gomti Grand Villa',type:'Private Villa',img:'assets/properties/gomti-grand-villa/cover.jpg',price:6999,airbnb:8499,guests:20,wa:'919450055554'},
  {id:'VIL-108',name:'Royal White House',type:'Luxury Villa',img:'assets/properties/royal-white-house/cover.jpg',price:5499,airbnb:6599,guests:14,wa:'919450055554'},
  {id:'GOM-302',name:'Pink Paradise',type:'3BHK Flat',img:'assets/properties/pink-paradise/cover.jpg',price:2999,airbnb:3599,guests:8,wa:'918299600709'},
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

let calViewDate = new Date();
let selectedProp = null;
let bookedDates = [];
let sb = null;

// ── INIT ──
function init() {
  if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  const sel = document.getElementById('propSelect');
  PROPERTIES.forEach(function(p) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + ' — ' + p.type;
    sel.appendChild(opt);
  });

  const today = new Date().toISOString().slice(0,10);
  document.getElementById('checkIn').min = today;
  document.getElementById('checkOut').min = today;

  const params = new URLSearchParams(window.location.search);
  const pid = params.get('property') || params.get('p');
  if (pid) { sel.value = pid; onPropertyChange(); }

  renderMiniCal();
}

// ── PROPERTY CHANGE ──
function onPropertyChange() {
  const pid = document.getElementById('propSelect').value;
  selectedProp = PROPERTIES.find(function(p){ return p.id === pid; }) || null;

  const info = document.getElementById('propInfo');
  if (selectedProp) {
    info.style.display = 'flex';
    document.getElementById('propThumb').src = selectedProp.img;
    document.getElementById('propName').textContent = selectedProp.name;
    document.getElementById('propType').textContent = selectedProp.type + ' · Up to ' + selectedProp.guests + ' guests';
    document.getElementById('propPrice').textContent =
      '₹' + selectedProp.price.toLocaleString('en-IN') + '/night (Direct) · Airbnb ₹' + selectedProp.airbnb.toLocaleString('en-IN');
    bookedDates = [];
    renderMiniCal();
    fetchBookedDates();
  } else {
    info.style.display = 'none';
    bookedDates = [];
    renderMiniCal();
  }
  updateSummary();
}

// ── FETCH BOOKED DATES ──
async function fetchBookedDates() {
  if (!sb || !selectedProp) return;
  try {
    const from = new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1).toISOString().slice(0,10);
    const to   = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 3, 0).toISOString().slice(0,10);
    const { data } = await sb.from('guest_register')
      .select('check_in, check_out')
      .eq('room_id', selectedProp.id)
      .neq('is_cancelled', true)
      .gte('check_out', from)
      .lte('check_in', to);
    bookedDates = data || [];
  } catch(e) { console.warn('fetchBookedDates:', e); }
  renderMiniCal();
  checkAvailability();
}

function isDateBooked(ds) {
  return bookedDates.some(function(b){ return b.check_in <= ds && b.check_out > ds; });
}
function isDatePast(ds) {
  return ds < new Date().toISOString().slice(0,10);
}

// ── MINI CALENDAR ──
function renderMiniCal() {
  const y = calViewDate.getFullYear();
  const m = calViewDate.getMonth();
  document.getElementById('miniCalLabel').textContent = MONTHS[m] + ' ' + y;

  const firstDay = new Date(y, m, 1).getDay();
  const dim = new Date(y, m+1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;

  const grid = document.getElementById('miniCalGrid');
  grid.innerHTML = '';

  DOWS.forEach(function(d) {
    const el = document.createElement('div');
    el.className = 'mc-dow'; el.textContent = d; grid.appendChild(el);
  });
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div'); el.className = 'mc-day empty'; grid.appendChild(el);
  }
  for (let d = 1; d <= dim; d++) {
    const ds = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const el = document.createElement('div');
    el.textContent = d;
    let cls = 'mc-day';
    if (ds === todayStr) cls += ' today';
    if (isDatePast(ds)) { cls += ' past'; }
    else if (isDateBooked(ds)) { cls += ' booked'; }
    else { (function(date){ el.onclick = function(){ onCalDayClick(date); }; })(ds); }
    if (ci && co && ds > ci && ds < co) cls += ' in-range';
    if (ci && ds === ci) { cls += ' sel rng-s'; }
    if (co && ds === co) { cls += ' sel rng-e'; }
    el.className = cls;
    grid.appendChild(el);
  }
}

function onCalDayClick(ds) {
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;

  if (!ci || (ci && co)) {
    document.getElementById('checkIn').value = ds;
    document.getElementById('checkOut').value = '';
  } else {
    if (ds <= ci) {
      document.getElementById('checkIn').value = ds;
      document.getElementById('checkOut').value = '';
    } else {
      let blocked = false;
      const c = new Date(ci); c.setDate(c.getDate() + 1);
      const e = new Date(ds);
      while (c < e) {
        if (isDateBooked(c.toISOString().slice(0,10))) { blocked = true; break; }
        c.setDate(c.getDate() + 1);
      }
      if (blocked) {
        alert('Some dates in this range are already booked. Please choose different dates.');
      } else {
        document.getElementById('checkOut').value = ds;
      }
    }
  }
  renderMiniCal();
  onDateChange();
}

function changeCalMonth(delta) {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + delta, 1);
  renderMiniCal();
  if (selectedProp) fetchBookedDates();
}

// ── DATE CHANGE ──
function onDateChange() {
  const ci = document.getElementById('checkIn').value;
  if (ci) {
    const nd = new Date(ci); nd.setDate(nd.getDate() + 1);
    document.getElementById('checkOut').min = nd.toISOString().slice(0,10);
  }
  renderMiniCal();
  checkAvailability();
  updateSummary();
}

// ── AVAILABILITY CHECK ──
function checkAvailability() {
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  const el = document.getElementById('availStatus');
  const btn = document.getElementById('bookBtn');

  if (!ci || !co || !selectedProp) {
    el.style.display = 'none'; btn.disabled = true; return;
  }
  el.style.display = 'flex';
  el.className = 'avail-status checking';
  el.innerHTML = '<span class="spin"></span> <span>Checking availability…</span>';
  btn.disabled = true;

  let conflict = false;
  const c = new Date(ci), end = new Date(co);
  const cc = new Date(c);
  while (cc < end) {
    if (isDateBooked(cc.toISOString().slice(0,10))) { conflict = true; break; }
    cc.setDate(cc.getDate() + 1);
  }
  setTimeout(function() {
    const nights = Math.round((end - c) / 86400000);
    if (conflict) {
      el.className = 'avail-status unavailable';
      el.innerHTML = '❌ <span>Not available for these dates. Please choose different dates.</span>';
      btn.disabled = true;
    } else {
      el.className = 'avail-status available';
      el.innerHTML = '✅ <span><strong>' + nights + ' night' + (nights !== 1 ? 's' : '') + '</strong> available at ' + selectedProp.name + '!</span>';
      btn.disabled = false;
    }
  }, 500);
}

// ── PRICE SUMMARY ──
function updateSummary() {
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  const empty = document.getElementById('summaryEmpty');
  const content = document.getElementById('summaryContent');

  if (!ci || !co || !selectedProp) {
    empty.style.display = 'block'; content.style.display = 'none'; return;
  }
  const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0) { empty.style.display = 'block'; content.style.display = 'none'; return; }

  empty.style.display = 'none'; content.style.display = 'block';
  const total = selectedProp.price * nights;
  const saving = (selectedProp.airbnb - selectedProp.price) * nights;
  document.getElementById('sumNights').textContent = nights + ' night' + (nights !== 1 ? 's' : '') + ' × ₹' + selectedProp.price.toLocaleString('en-IN');
  document.getElementById('sumNightlyTotal').textContent = '₹' + (selectedProp.airbnb * nights).toLocaleString('en-IN');
  document.getElementById('sumDiscount').textContent = '−₹' + saving.toLocaleString('en-IN');
  document.getElementById('sumTotal').textContent = '₹' + total.toLocaleString('en-IN');
}

// ── SUBMIT ──
async function submitBookingRequest() {
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  const name = document.getElementById('guestName').value.trim();
  const rawPhone = document.getElementById('guestPhone').value.trim().replace(/\D/g,'');
  const guests = document.getElementById('guestCount').value;
  const purpose = document.getElementById('stayPurpose').value;
  const special = document.getElementById('specialReq').value.trim();

  if (!selectedProp) { alert('Please select a property.'); return; }
  if (!ci || !co)    { alert('Please select your check-in and check-out dates.'); return; }
  if (!name)         { alert('Please enter your full name.'); return; }
  if (!rawPhone || rawPhone.length < 10) { alert('Please enter a valid 10-digit WhatsApp number.'); return; }

  const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0)   { alert('Check-out must be after check-in.'); return; }

  const btn = document.getElementById('bookBtn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Sending…';

  // Save to Supabase booking_requests (non-blocking)
  if (sb) {
    try {
      await sb.from('booking_requests').insert({
        property_id: selectedProp.id,
        property_name: selectedProp.name,
        guest_name: name,
        guest_phone: rawPhone,
        check_in: ci,
        check_out: co,
        nights: nights,
        guests: parseInt(guests, 10),
        purpose: purpose,
        special_requests: special || null,
        estimated_amount: selectedProp.price * nights,
        status: 'pending',
        source: 'book_page',
        created_at: new Date().toISOString()
      });
    } catch(e) { console.warn('booking_requests save:', e); }
  }

  const fmt = function(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
  };

  const total = (selectedProp.price * nights).toLocaleString('en-IN');
  const phone91 = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
  const waMsg = [
    '🏠 *NEW BOOKING REQUEST*',
    '*The Unique Haven Homes*',
    '',
    '👤 *Guest:* ' + name,
    '📱 *Phone:* +' + phone91,
    '🏡 *Property:* ' + selectedProp.name,
    '📍 *Type:* ' + selectedProp.type,
    '',
    '📅 *Check-in:* ' + fmt(ci),
    '📅 *Check-out:* ' + fmt(co),
    '🌙 *Nights:* ' + nights,
    '👥 *Guests:* ' + guests,
    '🎯 *Purpose:* ' + purpose,
    '💰 *Est. Amount:* ₹' + total,
    special ? '📝 *Special:* ' + special : '',
    '',
    '_Sent from uniquehavenhomestay.com/book.html_'
  ].filter(Boolean).join('\n');

  const waPhone = selectedProp.wa || '919450055554';
  const waUrl = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(waMsg);
  window.open(waUrl, '_blank');

  btn.innerHTML = origHtml;
  btn.disabled = false;

  document.getElementById('successMsg').textContent =
    'Your request for ' + selectedProp.name + ' (' + nights + ' nights) has been sent to our host team. We will confirm on WhatsApp within a few minutes!';
  document.getElementById('successModal').style.display = 'flex';
}

// Boot
init();
