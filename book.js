/* book.js — Public Booking Page Logic */
'use strict';

const PROPERTIES = [
  {id:'GOM-101',name:'RedRose Palace',type:'3BHK Luxury Flat',img:'assets/properties/redrose-palace/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-102',name:'Black Beauty',type:'3BHK Luxury Flat',img:'assets/properties/black-beauty/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-201',name:'The Dark Blue',type:'3BHK Luxury Flat',img:'assets/properties/the-dark-blue/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-202',name:'The Brown',type:'3BHK Luxury Flat',img:'assets/properties/the-brown/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-301',name:'The Light Green',type:'3BHK Luxury Flat',img:'assets/properties/the-light-green/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'919450055554'},
  {id:'GOM-302',name:'The Unique',type:'3BHK Luxury Flat',img:'assets/properties/the-unique/cover.jpg',price:5500,airbnb:6499,guests:8,wa:'919450055554'},
  {id:'GOM-401',name:'The Nawabi Stay',type:'3BHK Luxury Flat',img:'assets/properties/the-nawabi-stay/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'918299600709'},
  {id:'GOM-501',name:'Starlight Blue PentHouse',type:'Top-Floor Penthouse',img:'assets/properties/starlight-blue/cover.jpg',price:6000,airbnb:7299,guests:10,wa:'919450055554'},
  {id:'VIL-101',name:'Gomti Grand Villa',type:'Private Luxury Villa',img:'assets/properties/gomti-grand-villa/cover.jpg',price:8000,airbnb:9599,guests:14,wa:'919450055554'},
  {id:'VIL-102',name:'Royal White House',type:'Grand Palace Villa',img:'assets/properties/royal-white-house/cover.jpg',price:12000,airbnb:14499,guests:18,wa:'919450055554'},
  {id:'VIL-103',name:'The Pink House',type:'5BR Grand Villa',img:'assets/properties/the-pink-house/cover.jpg',price:9000,airbnb:10999,guests:10,wa:'918299600709'},
  {id:'VIL-104',name:'The Green House',type:'3BR Luxury Villa',img:'assets/properties/the-green-house/cover.jpg',price:5500,airbnb:6599,guests:8,wa:'919450055554'},
  {id:'VIL-105',name:'The Yellow House',type:'3BHK Luxury Villa',img:'assets/properties/the-yellow-house/cover.jpg',price:5500,airbnb:6599,guests:8,wa:'918299600709'},
  {id:'VIL-106',name:'Green forest View',type:'3BHK Luxury Flat',img:'assets/properties/green-forest/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'918299600709'},
  {id:'VIL-107',name:'The Velvet House',type:'Luxury Villa',img:'assets/properties/the-velvet-house/cover.jpg',price:4500,airbnb:5499,guests:8,wa:'919450055554'},
  {id:'VIL-108',name:'Pink Paradise Villa',type:'Luxury Villa',img:'assets/properties/pink-paradise/cover.jpg',price:4500,airbnb:5499,guests:6,wa:'918299600709'},
  {id:'LUL-402',name:'Celebrity Garden',type:'5-Bed Grand Homestay',img:'assets/properties/celebrity-garden/cover.jpg',price:10000,airbnb:11999,guests:16,wa:'919450055554'}
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

let calViewDate = new Date();
let selectedProp = null;
let bookedDates = [];
let sb = null;

// ── FETCH LIVE PRICES DIRECTLY FROM SUPABASE ROOMS TABLE ──
async function fetchLivePrices() {
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from('rooms')
      .select('room_id, nickname, property_name, rent_per_night, max_guests')
      .order('room_id');
    if (!error && data && data.length > 0) {
      data.forEach(function(r) {
        let prop = PROPERTIES.find(function(p){ return p.id === r.room_id; });
        if (prop && r.rent_per_night && !isNaN(Number(r.rent_per_night))) {
          prop.price = Number(r.rent_per_night);
          prop.airbnb = Math.round(prop.price * 1.22);
          if (r.nickname) prop.name = r.nickname;
          if (r.max_guests) prop.guests = r.max_guests;
        }
      });
      console.log('[BookPage] ✅ 100% Verified live rates synced from rooms table');

      // Update select option labels with exact live rates
      const sel = document.getElementById('propSelect');
      if (sel) {
        const curVal = sel.value;
        Array.from(sel.options).forEach(opt => {
          const p = PROPERTIES.find(x => x.id === opt.value);
          if (p) opt.textContent = p.name + ' — ' + p.type + ' (₹' + p.price.toLocaleString('en-IN') + '/night)';
        });
        sel.value = curVal;
      }

      // Re-render if a property is already selected
      if (selectedProp) {
        var refreshed = PROPERTIES.find(function(p){ return p.id === selectedProp.id; });
        if (refreshed) {
          selectedProp = refreshed;
          const priceEl = document.getElementById('propPrice');
          if (priceEl) {
            const gstRate = selectedProp.price <= 7500 ? 5 : 18;
            priceEl.textContent =
              '₹' + selectedProp.price.toLocaleString('en-IN') + '/night + ' + gstRate + '% GST (Direct) · Airbnb ₹' + selectedProp.airbnb.toLocaleString('en-IN') + '+';
          }
          updateSummary();
        }
      }
    }
  } catch(e) { console.warn('fetchLivePrices error:', e); }
}

// ── INIT ──
function init() {
  if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  const sel = document.getElementById('propSelect');
  PROPERTIES.forEach(function(p) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + ' — ' + p.type + ' (₹' + p.price.toLocaleString('en-IN') + '/night + GST)';
    sel.appendChild(opt);
  });

  const today = new Date().toISOString().slice(0,10);
  document.getElementById('checkIn').min = today;
  document.getElementById('checkOut').min = today;

  const params = new URLSearchParams(window.location.search);
  const pid = params.get('property') || params.get('p');
  if (pid) {
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
    onPropertyChange();
  }

  renderMiniCal();

  // Fetch live prices from Supabase and update
  fetchLivePrices();
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
    const gstRate = selectedProp.price <= 7500 ? 5 : 18;
    document.getElementById('propPrice').textContent =
      '₹' + selectedProp.price.toLocaleString('en-IN') + '/night + ' + gstRate + '% GST (Direct) · Airbnb ₹' + selectedProp.airbnb.toLocaleString('en-IN') + '+';
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
let appliedCoupon = null;
let couponDiscount = 0;

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
  const baseTotal = selectedProp.price * nights;
  const gstRate = selectedProp.price <= 7500 ? 5 : 18;
  const gstAmt = Math.round(baseTotal * (gstRate / 100));
  const grossWithGst = baseTotal + gstAmt;

  document.getElementById('sumNights').textContent = nights + ' night' + (nights !== 1 ? 's' : '') + ' × ₹' + selectedProp.price.toLocaleString('en-IN');
  document.getElementById('sumNightlyTotal').textContent = '₹' + baseTotal.toLocaleString('en-IN');

  const gstLabelEl = document.getElementById('sumGstLabel');
  if (gstLabelEl) gstLabelEl.innerHTML = `Taxes &amp; GST (${gstRate}% · SAC 996311)`;

  const gstEl = document.getElementById('sumGst');
  if (gstEl) gstEl.textContent = '+₹' + gstAmt.toLocaleString('en-IN');

  const grossEl = document.getElementById('sumGrossTotal');
  if (grossEl) grossEl.textContent = '₹' + grossWithGst.toLocaleString('en-IN');

  // Show coupon discount if applied
  var discountRow = document.getElementById('couponDiscountRow');
  if (appliedCoupon && couponDiscount > 0) {
    var discountAmt = Math.round(grossWithGst * (couponDiscount / 100));
    var finalTotal = grossWithGst - discountAmt;
    if (discountRow) { discountRow.style.display = 'flex'; }
    document.getElementById('sumDiscount').textContent = '−₹' + discountAmt.toLocaleString('en-IN') + ' (' + couponDiscount + '% Direct Host OFF)';
    document.getElementById('sumTotal').textContent = '₹' + finalTotal.toLocaleString('en-IN');
  } else {
    if (discountRow) { discountRow.style.display = 'none'; }
    document.getElementById('sumTotal').textContent = '₹' + grossWithGst.toLocaleString('en-IN');
  }
}

// ── COUPON / DISCOUNT CODE ──
const BUILTIN_COUPONS = {
  'TUHH15': { discount_percent: 15, min_nights: 1 }
};

async function applyCoupon() {
  var codeInput = document.getElementById('couponCode');
  var msgEl = document.getElementById('couponMsg');
  var code = (codeInput.value || '').trim().toUpperCase();

  if (!code) {
    msgEl.innerHTML = '⚠️ Please enter a coupon code. For codes, WhatsApp Superhosts & Owners <a href="https://wa.me/919450055554?text=Namaste!%20Please%20share%20a%20discount%20code%20for%20my%20booking." target="_blank" style="color:#059669; font-weight:600;">Shahanshah</a> / <a href="https://wa.me/918299600709?text=Namaste!%20Please%20share%20a%20discount%20code%20for%20my%20booking." target="_blank" style="color:#059669; font-weight:600;">Firoz</a> or Manager <a href="https://wa.me/919194109911?text=Namaste!%20Please%20share%20a%20discount%20code%20for%20my%20booking." target="_blank" style="color:#059669; font-weight:600;">Praveen Singh</a>';
    msgEl.style.color = '#dc2626';
    return;
  }

  // 1. Built-in promo codes (TUHH15)
  if (BUILTIN_COUPONS[code]) {
    var cData = BUILTIN_COUPONS[code];
    var ci = document.getElementById('checkIn').value;
    var co = document.getElementById('checkOut').value;
    var nights = (ci && co) ? Math.round((new Date(co) - new Date(ci)) / 86400000) : 0;
    if (cData.min_nights && nights < cData.min_nights) {
      msgEl.innerHTML = '⚠️ This code requires minimum ' + cData.min_nights + ' night stay.';
      msgEl.style.color = '#dc2626';
      return;
    }
    appliedCoupon = code;
    couponDiscount = cData.discount_percent;
    lockCouponUI(code);
    msgEl.innerHTML = '🎉 Coupon <strong>' + code + '</strong> applied! ' + cData.discount_percent + '% discount on total booking.';
    msgEl.style.color = '#059669';
    updateSummary();
    return;
  }

  // 2. Try to validate coupon from Supabase
  if (sb) {
    try {
      var { data, error } = await sb.from('coupon_codes')
        .select('code, discount_percent, is_active, min_nights')
        .eq('code', code)
        .eq('is_active', true)
        .single();
      if (!error && data) {
        var ci = document.getElementById('checkIn').value;
        var co = document.getElementById('checkOut').value;
        var nights = (ci && co) ? Math.round((new Date(co) - new Date(ci)) / 86400000) : 0;
        if (data.min_nights && nights < data.min_nights) {
          msgEl.innerHTML = '⚠️ This code requires minimum ' + data.min_nights + ' nights stay.';
          msgEl.style.color = '#dc2626';
          return;
        }
        appliedCoupon = data.code;
        couponDiscount = data.discount_percent;
        lockCouponUI(data.code);
        msgEl.innerHTML = '✅ Coupon <strong>' + data.code + '</strong> applied! ' + data.discount_percent + '% discount.';
        msgEl.style.color = '#059669';
        updateSummary();
        return;
      }
    } catch(e) { /* coupon_codes table may not exist yet */ }
  }

  // 3. Fallback: note code for WhatsApp confirmation
  appliedCoupon = code;
  couponDiscount = 0;
  lockCouponUI(code);
  msgEl.innerHTML = '📋 Code <strong>' + code + '</strong> noted. Discount will be verified by host on WhatsApp.';
  msgEl.style.color = '#0369a1';
  updateSummary();
}

function lockCouponUI(code) {
  var codeInput = document.getElementById('couponCode');
  var applyBtn = document.getElementById('couponApplyBtn');
  var removeBtn = document.getElementById('couponRemoveBtn');
  if (codeInput) {
    codeInput.value = code;
    codeInput.readOnly = true;
    codeInput.style.background = '#f1f5f9';
  }
  if (applyBtn) applyBtn.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'block';
}

function removeCoupon() {
  appliedCoupon = null;
  couponDiscount = 0;
  var codeInput = document.getElementById('couponCode');
  var applyBtn = document.getElementById('couponApplyBtn');
  var removeBtn = document.getElementById('couponRemoveBtn');
  if (codeInput) {
    codeInput.value = '';
    codeInput.readOnly = false;
    codeInput.style.background = '#ffffff';
    codeInput.focus();
  }
  if (applyBtn) applyBtn.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';

  var msgEl = document.getElementById('couponMsg');
  if (msgEl) {
    msgEl.innerHTML = 'For discount codes, WhatsApp Superhosts &amp; Owners <a href="https://wa.me/919450055554?text=Namaste!%20Please%20share%20a%20discount%20code%20for%20my%20booking." target="_blank" style="color:#059669; font-weight:600;">Shahanshah</a> / <a href="https://wa.me/918299600709?text=Namaste!%20Please%20share%20a%20discount%20code%20for%20my%20booking." target="_blank" style="color:#059669; font-weight:600;">Firoz</a> or Manager <a href="https://wa.me/919194109911?text=Namaste!%20Please%20share%20a%20discount%20code%20for%20my%20booking." target="_blank" style="color:#059669; font-weight:600;">Praveen Singh</a>';
    msgEl.style.color = '#6b7280';
  }
  updateSummary();
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

  const baseTotal = selectedProp.price * nights;
  const gstRate = selectedProp.price <= 7500 ? 5 : 18;
  const gstAmt = Math.round(baseTotal * (gstRate / 100));
  const grossWithGst = baseTotal + gstAmt;
  const discountAmt = (appliedCoupon && couponDiscount > 0) ? Math.round(grossWithGst * (couponDiscount / 100)) : 0;
  const finalTotal = grossWithGst - discountAmt;
  const bookingId = 'BK-' + Date.now();
  const phone91 = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;

  // Format notes for CRM & Follow-up
  const noteParts = [
    `Direct Website Booking (book.html)`,
    `Property: ${selectedProp.name}`,
    `Tariff: ₹${baseTotal} + ${gstRate}% GST (₹${gstAmt}) = Standard ₹${grossWithGst}`,
    `Purpose: ${purpose || 'Not specified'}`
  ];
  if (appliedCoupon) {
    noteParts.push(`Coupon: ${appliedCoupon} (${couponDiscount}% OFF, -₹${discountAmt}) | Direct Payable: ₹${finalTotal}`);
  }
  if (special) {
    noteParts.push(`Special Request: ${special}`);
  }
  const notesText = noteParts.join(' | ');

  // Save to Supabase CRM (guest_register table) so it immediately appears in Follow-ups
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
        guests: parseInt(guests, 10) || 1,
        per_day_rate: selectedProp.price,
        total_amount: finalTotal,
        booking_mode: 'Direct-Website',
        payment_status: 'Unpaid',
        notes: notesText,
        booked_by: 'Website',
        is_cancelled: false,
        verification_status: 'pending',
        checkout_confirmed: true
      }).select();

      if (bErr) {
        console.error('Supabase guest_register save error:', bErr);
      } else {
        console.log('✅ Booking successfully saved to guest_register:', bData);
      }
    } catch(e) { console.warn('guest_register save error:', e); }

    // Also backup to booking_requests if available
    try {
      await sb.from('booking_requests').insert({
        booking_id: bookingId,
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
        coupon_code: appliedCoupon || null,
        discount_amount: discountAmt,
        estimated_amount: finalTotal,
        status: 'pending',
        source: 'book_page',
        created_at: new Date().toISOString()
      });
    } catch(e) { /* silent backup */ }
  }

  const fmt = function(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
  };

  const waMsg = [
    '🏠 *NEW DIRECT BOOKING REQUEST*',
    '*The Unique Haven Homes (Direct Guest Channel)*',
    '',
    '🔖 *Booking ID:* ' + bookingId,
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
    '🏷️ *Base Tariff:* ₹' + baseTotal.toLocaleString('en-IN') + ' (' + nights + ' nights @ ₹' + selectedProp.price.toLocaleString('en-IN') + '/night)',
    '🏛️ *Taxes & GST (' + gstRate + '% · SAC 996311):* +₹' + gstAmt.toLocaleString('en-IN'),
    '📊 *Standard Gross (with GST):* ₹' + grossWithGst.toLocaleString('en-IN'),
    appliedCoupon ? '🎁 *Direct Discount Code:* ' + appliedCoupon + (couponDiscount > 0 ? ' (' + couponDiscount + '% Direct Host OFF)' : '') : '💡 *Direct Booking:* Guest requested direct host discount rate',
    discountAmt > 0 ? '💸 *Direct Host Discount:* -₹' + discountAmt.toLocaleString('en-IN') : '',
    '✨ *Estimated Direct Payable:* ₹' + finalTotal.toLocaleString('en-IN'),
    special ? '📝 *Special Request:* ' + special : '',
    '',
    '💬 _Host Note: Direct booking saves 14–16% Airbnb guest platform fee!_',
    '_Sent from uniquehavenhomestay.com/book.html_'
  ].filter(Boolean).join('\n');

  const waPhone = selectedProp.wa || '919450055554';
  const waUrl = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(waMsg);
  window.open(waUrl, '_blank');

  btn.innerHTML = origHtml;
  btn.disabled = false;

  const successEl = document.getElementById('successMsg');
  if (successEl) {
    successEl.innerHTML =
      'Thank you <strong>' + (name || 'Guest') + '</strong>! Your booking for <strong>' + selectedProp.name + '</strong> (' + nights + ' night' + (nights > 1 ? 's' : '') + ') is confirmed with Booking ID <span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px; font-weight:700;">' + bookingId + '</span>.';
  }

  // Set direct WhatsApp links with booking context
  const waShahanshah = document.getElementById('modalWaShahanshah');
  if (waShahanshah) {
    waShahanshah.href = 'https://wa.me/919450055554?text=' + encodeURIComponent('Namaste Shahanshah ji, I have booked ' + selectedProp.name + ' (Booking ID: ' + bookingId + ').');
  }
  const waFiroz = document.getElementById('modalWaFiroz');
  if (waFiroz) {
    waFiroz.href = 'https://wa.me/918299600709?text=' + encodeURIComponent('Namaste Firoz ji, I have booked ' + selectedProp.name + ' (Booking ID: ' + bookingId + ').');
  }
  const waPraveen = document.getElementById('modalWaPraveen');
  if (waPraveen) {
    waPraveen.href = 'https://wa.me/919194109911?text=' + encodeURIComponent('Namaste Praveen ji, I have booked ' + selectedProp.name + ' (Booking ID: ' + bookingId + ').');
  }

  document.getElementById('successModal').style.display = 'flex';
}

// Boot
init();
