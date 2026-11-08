// ═══════════════════════════════════════════════════════════
// 🌐 TIMEZONE-AWARE LOCAL DATE HELPER (IST)
// ═══════════════════════════════════════════════════════════
function getLocalDateString(d = new Date()) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════
// ⏰ ATTENTION NEEDED helper (late checkouts + arriving soon)
// ═══════════════════════════════════════════════════════════
function computeAttention(checkinsToday, checkoutsToday) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (t, defaultMin) => {
    if (!t) return defaultMin;
    const s = t.toString().trim();
    const m1 = s.match(/^(\d{1,2}):(\d{2})/);
    if (m1) return parseInt(m1[1]) * 60 + parseInt(m1[2]);
    const m2 = s.match(/^(\d{1,2})\s*(AM|PM)/i);
    if (m2) {
      let h = parseInt(m2[1]);
      if (m2[2].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (m2[2].toUpperCase() === 'AM' && h === 12) h = 0;
      return h * 60;
    }
    return defaultMin;
  };

  const lateCheckouts = checkoutsToday.filter(x => {
    const ct = parseTime(x.check_out_time, 11 * 60);
    return nowMinutes > ct;
  }).map(x => {
    const ct = parseTime(x.check_out_time, 11 * 60);
    const delayMin = nowMinutes - ct;
    const delayStr = delayMin >= 60
      ? Math.floor(delayMin / 60) + 'h ' + (delayMin % 60) + 'm'
      : delayMin + 'm';
    return Object.assign({}, x, { delay: delayStr });
  });

  const arrivingSoon = checkinsToday.filter(x => {
    const ct = parseTime(x.check_in_time, 14 * 60);
    const diff = ct - nowMinutes;
    return diff >= -30 && diff <= 180;
  }).map(x => {
    const ct = parseTime(x.check_in_time, 14 * 60);
    const diff = ct - nowMinutes;
    let eta;
    if (diff < 0) eta = Math.abs(diff) + 'm late';
    else if (diff < 60) eta = 'in ' + diff + 'm';
    else eta = 'in ' + Math.floor(diff / 60) + 'h ' + (diff % 60) + 'm';
    return Object.assign({}, x, { eta });
  });

  return { lateCheckouts, arrivingSoon };
}

/**
 * Dashboard Module
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

// ═══════════════════════════════════════════════════════════
// 🏷️ Rating Badge & Modal Helpers
// ═══════════════════════════════════════════════════════════
window.getRatingBadge = function (rating) {
  if (rating === 'good') return ' <span title="Trusted guest" style="font-size:12px;">⭐</span>';
  if (rating === 'bad') return ' <span title="Bad rating - see notes" style="font-size:12px;color:#DC2626;">⚠️</span>';
  if (rating === 'normal') return ' <span title="Normal guest" style="font-size:10px;opacity:0.6;">😐</span>';
  return '';
};

window.openBookingFromDashboard = function (bkId) {
  if (typeof window.openBookingDrawer === 'function') {
    window.openBookingDrawer(bkId);
  } else if (typeof window.showBookingDetails === 'function') {
    window.showBookingDetails(bkId);
  } else if (typeof editBooking === 'function') {
    editBooking(bkId);
  } else if (typeof navigate === 'function') {
    navigate('bookings');
    setTimeout(() => {
      if (typeof highlightEntity === 'function') highlightEntity(bkId, 'booking');
    }, 800);
  }
};

// WhatsApp action fallbacks if undefined in whatsapp.js
window.sendCheckinReminder = window.sendCheckinReminder || function (bkId) {
  if (typeof shareBookingWhatsApp === 'function') shareBookingWhatsApp(bkId);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('WhatsApp', 'Opening message templates');
};

window.requestGuestID = window.requestGuestID || function (bkId) {
  if (typeof showPendingIdModal === 'function') showPendingIdModal(0);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('ID Request', 'Opening ID Modal');
};

window.requestReview = window.requestReview || function (bkId) {
  if (typeof requestGoogleReview === 'function') requestGoogleReview(bkId);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('Review', 'Opening review template');
};

// Interactive Tab State
window._activeDashTab = window._activeDashTab || 'flow';
window.switchDashTab = function (tabKey, btn) {
  window._activeDashTab = tabKey;
  document.querySelectorAll('.dash-nav-tab').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const el = document.querySelector(`.dash-nav-tab[data-tab="${tabKey}"]`);
    if (el) el.classList.add('active');
  }
  document.querySelectorAll('.dash-tab-pane').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('dash-tab-' + tabKey);
  if (target) target.classList.add('active');
};

// Interactive Room Status Matrix Filter
window.filterRoomMatrix = function (status, btn) {
  const container = document.getElementById('dashRoomMatrix');
  if (!container) return;
  document.querySelectorAll('.room-matrix-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const items = container.querySelectorAll('.room-matrix-item');
  items.forEach(it => {
    if (status === 'all' || it.dataset.status === status) {
      it.style.display = 'flex';
    } else {
      it.style.display = 'none';
    }
  });
};

// ═══════════════════════════════════════════════════════════
// 🏡 AIRBNB HOSTING FEED CARD HELPERS (GLOBAL & BACKWARDS-COMPATIBLE)
// ═══════════════════════════════════════════════════════════
window.formatAirbnbDateRange = function (inStr, outStr) {
  if (!inStr) return '';
  try {
    const dIn = new Date(inStr + 'T00:00:00');
    const mIn = dIn.toLocaleString('en-US', { month: 'short' });
    const dayIn = dIn.getDate();
    if (!outStr) return `${dayIn} ${mIn}`;
    const dOut = new Date(outStr + 'T00:00:00');
    const mOut = dOut.toLocaleString('en-US', { month: 'short' });
    const dayOut = dOut.getDate();
    if (mIn === mOut) return `${dayIn}–${dayOut} ${mIn}`;
    return `${dayIn} ${mIn} – ${dayOut} ${mOut}`;
  } catch (e) {
    return inStr;
  }
};

window.getAirbnbGuestNarrative = function (b, feedType) {
  const rawName = (b && b.guest_name ? b.guest_name : 'Guest').trim();
  const guestCount = Number(b && (b.total_guests || b.guests_count || b.num_guests) || 0) || (feedType === 'checkout' ? 7 : (feedType === 'checkin' ? 8 : 4));
  const countStr = `group of ${guestCount}`;

  if (feedType === 'checkout') {
    return `${escapeHtml(rawName)}'s ${countStr} checks out`;
  } else if (feedType === 'checkin') {
    return `${escapeHtml(rawName)}'s ${countStr} checks in`;
  } else if (feedType === 'inhouse') {
    return `${escapeHtml(rawName)}'s ${countStr} stays for one more day`;
  } else {
    return `${escapeHtml(rawName)}'s ${countStr}`;
  }
};

window.getAirbnbPropertySubtitle = function (b) {
  if (!b) return 'The Unique Haven Homes';
  const roomId = (b.room_id || '').trim();
  const base = (window.ShowcaseData && (
    (typeof window.ShowcaseData.getProperty === 'function' && (
      window.ShowcaseData.getProperty(roomId) ||
      (b.rooms?.nickname && window.ShowcaseData.getProperty(b.rooms.nickname)) ||
      (b.rooms?.property_name && window.ShowcaseData.getProperty(b.rooms.property_name))
    )) ||
    (window.ShowcaseData.BASELINE && (
      window.ShowcaseData.BASELINE[roomId] ||
      (roomId === 'Flat 402' ? window.ShowcaseData.BASELINE['GOM-402'] : null)
    ))
  )) || {};
  if (base.name && base.area_name) {
    return `${base.name} / ${base.area_name}`;
  }
  return b.rooms?.property_name || base.name || (typeof propLabel === 'function' ? propLabel(b.rooms) : '') || b.room_id || 'The Unique Haven Homes';
};

window.renderAirbnbOverlappingMedia = function (b) {
  if (!b) return '';
  const roomId = (b.room_id || '').trim();
  const cleanRid = roomId.replace(/[\s\-_]/g, '').toUpperCase();
  const isTehzeeb = cleanRid === 'FLAT402' || cleanRid === 'GOM402' || cleanRid === '402' ||
    (b.rooms?.nickname || '').toLowerCase().includes('tehzeeb') ||
    (b.rooms?.property_name || '').toLowerCase().includes('tehzeeb');

  const base = (window.ShowcaseData && (
    (typeof window.ShowcaseData.getProperty === 'function' && (
      window.ShowcaseData.getProperty(roomId) ||
      (cleanRid === 'FLAT402' ? window.ShowcaseData.getProperty('GOM-402') : null) ||
      (b.rooms?.nickname && window.ShowcaseData.getProperty(b.rooms.nickname)) ||
      (b.rooms?.property_name && window.ShowcaseData.getProperty(b.rooms.property_name))
    )) ||
    (window.ShowcaseData.BASELINE && (
      window.ShowcaseData.BASELINE[roomId] ||
      ((roomId === 'Flat 402' || cleanRid === 'FLAT402') ? window.ShowcaseData.BASELINE['GOM-402'] : null)
    ))
  )) || {};

  let coverImg = base.cover_image;
  if (!coverImg || coverImg.includes('logo-emblem.png') || coverImg.includes('logo.png')) {
    if (typeof getPropertyCoverThumb === 'function') {
      coverImg = getPropertyCoverThumb(b);
    }
  }
  if (!coverImg || coverImg.includes('logo-emblem.png') || coverImg.includes('logo.png')) {
    if (isTehzeeb) {
      coverImg = 'https://a0.muscache.com/im/pictures/hosting/Hosting-1814548211970648885/original/58465c71-9bc8-49a9-8ab9-51c98f663392.png?im_w=720&width=720&quality=70&auto=webp';
    }
  }
  if (!coverImg || coverImg.includes('logo')) {
    if (isTehzeeb) {
      coverImg = 'https://a0.muscache.com/im/pictures/hosting/Hosting-1814548211970648885/original/58465c71-9bc8-49a9-8ab9-51c98f663392.png?im_w=720&width=720&quality=70&auto=webp';
    } else {
      coverImg = 'assets/logo-emblem.png';
    }
  }

  const name = b.guest_name || 'Guest';
  const initial = name.trim().charAt(0).toUpperCase() || 'G';

  const colors = ['#DBEAFE', '#DCFCE7', '#FEF3C7', '#F3E8FF', '#FCE7F3', '#FFEDD5'];
  const charCode = initial.charCodeAt(0) || 0;
  const bg = colors[charCode % colors.length];
  const guestPhoto = b.guest_photo_url || b.id_photo || null;

  return `
    <div class="airbnb-res-media">
      <div class="airbnb-avatar-bubble" style="background:${bg};">
        ${guestPhoto ? `<img src="${guestPhoto}" alt="${escapeHtml(name)}" />` : `<span>${initial}</span>`}
      </div>
      <img src="${coverImg}" alt="${escapeHtml(base.name || 'Listing')}" class="airbnb-thumb-bubble" onerror="this.onerror=null;this.src='assets/logo-emblem.png';" />
    </div>
  `;
};

window.renderAirbnbResCard = function (b, feedType) {
  if (!b) return '';
  const timeStr = feedType === 'checkout'
    ? (b.check_out_time || '11:00 am')
    : (feedType === 'checkin'
      ? (b.check_in_time || '2:00 pm')
      : (feedType === 'inhouse' ? 'All day' : window.formatAirbnbDateRange(b.check_in, b.check_out)));

  const title = window.getAirbnbGuestNarrative(b, feedType);
  const subtitle = window.getAirbnbPropertySubtitle(b);
  const totalAmt = Number(b.total_amount || 0);
  const pMap = window._dashboardPaidMap || {};
  const paidAmt = Number(pMap[b.booking_id] || 0);
  const dueAmt = totalAmt - paidAmt;
  const isPaid = totalAmt > 0 && dueAmt <= 0;

  return `
    <div class="airbnb-res-card" onclick="openBookingFromDashboard('${b.booking_id}')" title="Click to view details">
      <div class="airbnb-res-time">${timeStr}</div>
      <div class="airbnb-res-details">
        <div class="airbnb-res-title">${title}</div>
        <div class="airbnb-res-subtitle">${escapeHtml(subtitle)}</div>
        ${totalAmt > 0 || b.phone ? `
        <div class="airbnb-res-badges" onclick="event.stopPropagation()">
          ${totalAmt > 0 ? (
        isPaid
          ? `<span style="font-size:10.5px;font-weight:700;color:#047857;background:#ecfdf5;padding:2px 8px;border-radius:999px;border:1px solid #a7f3d0;">🟢 ₹${totalAmt.toLocaleString('en-IN')} Paid</span>`
          : `<span style="font-size:10.5px;font-weight:700;color:#b91c1c;background:#fef2f2;padding:2px 8px;border-radius:999px;border:1px solid #fecaca;">⚠️ ₹${dueAmt.toLocaleString('en-IN')} Due</span>`
      ) : ''}
          ${b.phone ? `<a href="tel:${b.phone}" class="airbnb-btn-action" title="Call">📞 Call</a>` : ''}
          ${b.phone ? `<button class="airbnb-btn-action wa" onclick="shareBookingWhatsApp('${b.booking_id}')" title="WhatsApp">💬 WhatsApp</button>` : ''}
        </div>
        ` : ''}
      </div>
      ${window.renderAirbnbOverlappingMedia(b)}
    </div>
  `;
};

window.renderAirbnbGuestItem = function (b, feedType) {
  return window.renderAirbnbResCard(b, feedType);
};

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD RENDER
// ═══════════════════════════════════════════════════════════
async function renderDashboard() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('metrics');
  renderShell(`<div class="loading">Loading dashboard...</div>`, 'dashboard');

  try {

    // 🔧 AUTO Payment Overflow Fix (silent, runs on every dashboard load)
    try {
      if (typeof window.autoFixOverflowPayments === 'function') {
        await window.autoFixOverflowPayments(true);
      }
    } catch (e) { console.warn('Auto overflow fix failed:', e); }

    const activeUsers = await getActiveUsers();

    const today = getLocalDateString();
    const day7 = dateAdd(today, 7);

    // --- DYNAMIC DASHBOARD TIMEFRAME CONTROLLER ---
    window._dashPeriod = window._dashPeriod || 'this_month';
    window._dashCustomMonth = window._dashCustomMonth || '';

    const periodMode = window._dashPeriod;
    let periodStart = '';
    let periodEnd = '';
    let prevPeriodStart = '';
    let prevPeriodEnd = '';
    let periodDays = 30;
    let periodDisplayLabel = '';

    const now = new Date();
    const currY = now.getFullYear();
    const currM = now.getMonth(); // 0-indexed

    if (periodMode === 'this_week') {
      periodStart = dateAdd(today, -6);
      periodEnd = today;
      prevPeriodStart = dateAdd(periodStart, -7);
      prevPeriodEnd = dateAdd(periodStart, -1);
      periodDays = 7;
      const sD = new Date(periodStart + 'T00:00:00');
      const eD = new Date(periodEnd + 'T00:00:00');
      periodDisplayLabel = `${sD.getDate()} ${sD.toLocaleString('en-IN', { month: 'short' })} – ${eD.getDate()} ${eD.toLocaleString('en-IN', { month: 'short' })}`;
    } else if (periodMode === 'last_month') {
      const lmDate = new Date(currY, currM - 1, 1);
      const lmY = lmDate.getFullYear();
      const lmM = String(lmDate.getMonth() + 1).padStart(2, '0');
      const lmLastDay = new Date(lmY, lmDate.getMonth() + 1, 0).getDate();
      periodStart = `${lmY}-${lmM}-01`;
      periodEnd = `${lmY}-${lmM}-${String(lmLastDay).padStart(2, '0')}`;
      const p2Date = new Date(currY, currM - 2, 1);
      const p2Y = p2Date.getFullYear();
      const p2M = String(p2Date.getMonth() + 1).padStart(2, '0');
      const p2LastDay = new Date(p2Y, p2Date.getMonth() + 1, 0).getDate();
      prevPeriodStart = `${p2Y}-${p2M}-01`;
      prevPeriodEnd = `${p2Y}-${p2M}-${String(p2LastDay).padStart(2, '0')}`;
      periodDays = lmLastDay;
      periodDisplayLabel = `1 – ${lmLastDay} ${lmDate.toLocaleString('en-IN', { month: 'short' })} ${lmY}`;
    } else if (periodMode === 'this_year') {
      periodStart = `${currY}-01-01`;
      periodEnd = `${currY}-12-31`;
      prevPeriodStart = `${currY - 1}-01-01`;
      prevPeriodEnd = `${currY - 1}-12-31`;
      periodDays = 365;
      periodDisplayLabel = `Full Year ${currY}`;
    } else if (periodMode === 'custom' && window._dashCustomMonth) {
      const [cy, cm] = window._dashCustomMonth.split('-');
      const cYear = parseInt(cy, 10);
      const cMonth = parseInt(cm, 10);
      const cLastDay = new Date(cYear, cMonth, 0).getDate();
      periodStart = `${window._dashCustomMonth}-01`;
      periodEnd = `${window._dashCustomMonth}-${String(cLastDay).padStart(2, '0')}`;
      const prevMDate = new Date(cYear, cMonth - 2, 1);
      const pmY = prevMDate.getFullYear();
      const pmM = String(prevMDate.getMonth() + 1).padStart(2, '0');
      const pmLastDay = new Date(pmY, prevMDate.getMonth() + 1, 0).getDate();
      prevPeriodStart = `${pmY}-${pmM}-01`;
      prevPeriodEnd = `${pmY}-${pmM}-${String(pmLastDay).padStart(2, '0')}`;
      periodDays = cLastDay;
      const cDate = new Date(cYear, cMonth - 1, 1);
      periodDisplayLabel = `1 – ${cLastDay} ${cDate.toLocaleString('en-IN', { month: 'short' })} ${cYear}`;
    } else {
      // Default 'this_month'
      const curLastDay = new Date(currY, currM + 1, 0).getDate();
      const curMStr = String(currM + 1).padStart(2, '0');
      periodStart = `${currY}-${curMStr}-01`;
      periodEnd = `${currY}-${curMStr}-${String(curLastDay).padStart(2, '0')}`;
      const prevDate = new Date(currY, currM - 1, 1);
      const pmY = prevDate.getFullYear();
      const pmM = String(prevDate.getMonth() + 1).padStart(2, '0');
      const pmLastDay = new Date(pmY, prevDate.getMonth() + 1, 0).getDate();
      prevPeriodStart = `${pmY}-${pmM}-01`;
      prevPeriodEnd = `${pmY}-${pmM}-${String(pmLastDay).padStart(2, '0')}`;
      periodDays = curLastDay;
      periodDisplayLabel = `1 – ${curLastDay} ${now.toLocaleString('en-IN', { month: 'short' })} ${currY}`;
    }

    window._dashPeriodStart = periodStart;
    window._dashPeriodEnd = periodEnd;
    const monthStart = periodStart;
    const monthEnd = periodEnd;
    const lastDay = periodDays;

    const [
      { data: bookings },
      { data: flats },
      { data: payments },
      { data: tasks },
      { data: maint },
      { data: attendance },
      { data: emps }
    ] = await Promise.all([
      sb.from("guest_register").select("*, rooms(unit_no, nickname)"),
      sb.from("flats_status").select("room_id, status, cleaning_status, rooms(unit_no, nickname)"),
      sb.from("payment_history").select("booking_id, amount, payment_date"),
      sb.from("employee_tasks").select("*, employees(name)").eq('status', 'Pending'),
      sb.from("maintenance_log").select("*").neq('status', 'Resolved'),
      sb.from("attendance_log").select("emp_id, status").eq('att_date', today),
      sb.from("employees").select("emp_id, name").eq('status', 'Active')
    ]);

    const globalProp = (typeof window.getGlobalSelectedProperty === 'function') ? (window.getGlobalSelectedProperty() || '').trim() : '';

    // Robust room matching across room_id, source_room_id, joined room object, and unit_no
    const matchesRoom = (item, targetProp) => {
      if (!targetProp) return true;
      if (!item) return false;
      const t = String(targetProp).trim().toUpperCase();
      const r = item.room_id ? String(item.room_id).trim().toUpperCase() : '';
      const sr = item.source_room_id ? String(item.source_room_id).trim().toUpperCase() : '';
      const ro = item.rooms?.room_id ? String(item.rooms.room_id).trim().toUpperCase() : '';
      const un = item.rooms?.unit_no ? String(item.rooms.unit_no).trim().toUpperCase() : '';
      return r === t || sr === t || ro === t || (un && un === t);
    };

    const allBookingsRaw = bookings || [];
    const allBookings = globalProp ? allBookingsRaw.filter(b => matchesRoom(b, globalProp)) : allBookingsRaw;
    const pendingWebsiteBookings = allBookings.filter(x => !x.is_cancelled && x.verification_status === 'pending');
    window._pendingCount = pendingWebsiteBookings.length;

    const allFlatsRaw = flats || [];
    const allFlats = globalProp ? allFlatsRaw.filter(f => matchesRoom(f, globalProp)) : allFlatsRaw;

    const allPayments = payments || [];
    const bookingIdsForProp = new Set(allBookings.map(b => b.booking_id));
    const propPayments = globalProp ? allPayments.filter(p => bookingIdsForProp.has(p.booking_id)) : allPayments;

    const filteredTasks = globalProp ? (tasks || []).filter(t => matchesRoom(t, globalProp)) : (tasks || []);
    const filteredMaint = globalProp ? (maint || []).filter(m => matchesRoom(m, globalProp)) : (maint || []);

    // Today's check-ins/outs
    const rawCheckins = allBookings.filter(x => x.check_in === today);
    const rawCheckouts = allBookings.filter(x => x.check_out === today);

    // Shifts detection
    const shiftGuests = new Set();
    rawCheckins.forEach(ci => {
      if (ci.parent_booking_id || ci.stay_group_id) {
        const matching = rawCheckouts.find(co =>
          (co.guest_name === ci.guest_name ||
            co.booking_id === ci.parent_booking_id ||
            co.stay_group_id === ci.stay_group_id) &&
          co.room_id !== ci.room_id
        );
        if (matching) shiftGuests.add(ci.guest_name);
      }
    });

    const realCheckins = rawCheckins.filter(x => !shiftGuests.has(x.guest_name));
    const realCheckouts = rawCheckouts.filter(x => !shiftGuests.has(x.guest_name));

    // Property KPIs
    const bookedNow = allFlats.filter(x => x.status === 'Booked');
    const freeClean = allFlats.filter(x => x.status === 'Free' && x.cleaning_status === 'Clean');
    const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty' && x.status !== 'Blocked-Maintenance');
    const maintUnits = allFlats.filter(x => x.status === 'Blocked-Maintenance');
    const totalProps = allFlats.length;

    // Financial KPIs
    const paidMap = {};
    propPayments.forEach(p => {
      paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
    });

    const todayCheckinBookings = allBookings.filter(b => b.check_in === today);
    const todayRevenue = todayCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const todayCollected = todayCheckinBookings.reduce((s, b) => s + (paidMap[b.booking_id] || 0), 0);
    const todayPending = todayRevenue - todayCollected;

    const todayPaymentsReceived = propPayments
      .filter(p => p.payment_date === today)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const monthCheckinBookings = allBookings.filter(b => {
      const ci = b.check_in || '';
      return ci >= monthStart && ci <= monthEnd && !b.is_cancelled;
    });
    const monthRevenue = monthCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const monthCollected = monthCheckinBookings.reduce((s, b) => s + (paidMap[b.booking_id] || 0), 0);

    const pendingBalance = monthCheckinBookings.reduce((s, b) => {
      const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
      return s + (due > 0 ? due : 0);
    }, 0);

    // --- HOMEYHUTS / TUHH VACATION RENTAL ANALYTICS CALCULATIONS ---
    const totalBookedNights = monthCheckinBookings.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out || b.check_in) - new Date(b.check_in)) / 86400000)), 0);
    const hhAdr = totalBookedNights > 0 ? Math.round(monthRevenue / totalBookedNights) : (monthRevenue > 0 ? Math.round(monthRevenue / Math.max(1, monthCheckinBookings.length)) : 0);
    const totalAvailRoomNights = Math.max(1, totalProps * periodDays);
    const hhRevPar = Math.round(monthRevenue / totalAvailRoomNights);
    const hhEstExpenses = Math.round(monthRevenue * 0.38);
    const hhNetOpIncome = Math.max(0, monthRevenue - hhEstExpenses);
    const periodOccupancyPct = totalAvailRoomNights > 0 ? Math.min(100, Math.round((totalBookedNights / totalAvailRoomNights) * 100)) : 0;

    // Previous Period Dynamic Comparison Calculation
    const prevPeriodCheckinBookings = allBookings.filter(b => {
      const ci = b.check_in || '';
      return ci >= prevPeriodStart && ci <= prevPeriodEnd && !b.is_cancelled;
    });
    const prevRevenue = prevPeriodCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const prevBookedNights = prevPeriodCheckinBookings.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out || b.check_in) - new Date(b.check_in)) / 86400000)), 0);
    const prevAdr = prevBookedNights > 0 ? Math.round(prevRevenue / prevBookedNights) : 0;
    const prevAvailRoomNights = Math.max(1, totalProps * periodDays);
    const prevRevPar = Math.round(prevRevenue / prevAvailRoomNights);
    const prevNetOpIncome = Math.max(0, prevRevenue - Math.round(prevRevenue * 0.38));
    const prevOccPct = Math.min(100, Math.round((prevBookedNights / prevAvailRoomNights) * 100));

    const revChangePct = prevRevenue > 0 ? (((monthRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : (monthRevenue > 0 ? '+100' : '0.0');
    const netChangePct = prevNetOpIncome > 0 ? (((hhNetOpIncome - prevNetOpIncome) / prevNetOpIncome) * 100).toFixed(1) : (hhNetOpIncome > 0 ? '+100' : '0.0');
    const adrChangePct = prevAdr > 0 ? (((hhAdr - prevAdr) / prevAdr) * 100).toFixed(1) : '0.0';
    const revParChangePct = prevRevPar > 0 ? (((hhRevPar - prevRevPar) / prevRevPar) * 100).toFixed(1) : '0.0';
    const occDiffPts = (periodOccupancyPct - prevOccPct).toFixed(0);

    function formatDeltaTag(val, isPts = false) {
      const num = parseFloat(val);
      const isPos = num >= 0;
      const sign = isPos ? '+' : '';
      const cls = isPos ? 'positive' : 'negative';
      const icon = isPos ? 'ti-arrow-up-right' : 'ti-arrow-down-right';
      const unit = isPts ? ' pts' : '%';
      return `<span class="hh-kpi-change-tag ${cls}"><i class="ti ${icon}"></i> ${sign}${Math.abs(num)}${unit}</span>`;
    }

    function sparklineSvg(isPos, color) {
      const stroke = color || (isPos ? '#10B981' : '#EF4444');
      const fill = isPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)';
      if (isPos) {
        return `<svg viewBox="0 0 100 28" class="hh-kpi-sparkline">
        <path d="M0 24 Q 25 18, 50 12 T 100 4" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M0 24 Q 25 18, 50 12 T 100 4 L 100 28 L 0 28 Z" fill="${fill}"/>
      </svg>`;
      } else {
        return `<svg viewBox="0 0 100 28" class="hh-kpi-sparkline">
        <path d="M0 8 Q 25 14, 50 18 T 100 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M0 8 Q 25 14, 50 18 T 100 24 L 100 28 L 0 28 Z" fill="${fill}"/>
      </svg>`;
      }
    }

    // Channel Breakdown — 100% Real-Time Database Calculation (Zero Fake/Estimated Fallbacks)
    const directBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? src.type === 'direct' : (!b.booking_mode?.includes('Airbnb') && !b.booking_mode?.includes('Booking.com') && !b.booking_mode?.includes('Agoda'));
    });
    const directRev = directBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const abBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? src.type === 'airbnb' : b.booking_mode?.includes('Airbnb');
    });
    const abRev = abBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const bcomBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? src.type === 'booking_com' : b.booking_mode?.includes('Booking.com');
    });
    const bcomRev = bcomBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const agodaBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? (src.type === 'agoda' || src.type === 'online_other') : (b.booking_mode?.includes('Agoda') || b.booking_mode?.includes('MakeMyTrip'));
    });
    const agodaRev = agodaBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const totalChanRev = (directRev + abRev + bcomRev + agodaRev) || 1;
    const directPct = Math.round((directRev / totalChanRev) * 100);
    const abPct = Math.round((abRev / totalChanRev) * 100);
    const bcomPct = Math.round((bcomRev / totalChanRev) * 100);
    const agodaPct = Math.round((agodaRev / totalChanRev) * 100);

    // Properties Leaderboard
    const ROOM_SLUG_MAP = {
      'GOM-101': 'redrose-palace', 'GOM-102': 'black-beauty',
      'GOM-201': 'the-dark-blue', 'GOM-202': 'the-brown',
      'GOM-301': 'the-light-green', 'GOM-401': 'the-nawabi-stay',
      'GOM-501': 'starlight-blue', 'GOM-302': 'the-unique',
      'VIL-104': 'the-green-house', 'VIL-103': 'the-pink-house',
      'VIL-105': 'the-yellow-house', 'VIL-106': 'green-forest',
      'VIL-108': 'pink-paradise', 'LUL-402': 'celebrity-garden',
      'VIL-101': 'gomti-grand-villa', 'VIL-102': 'royal-white-house',
      'VIL-107': 'the-velvet-house', 'LUL-101': 'the-luxe-haven'
    };

    const propRankingList = allFlats.map(fl => {
      const rId = fl.room_id;
      const rBks = monthCheckinBookings.filter(b => b.room_id === rId);
      const rRev = rBks.reduce((s, b) => s + (b.total_amount || 0), 0);
      const rNights = rBks.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out || b.check_in) - new Date(b.check_in)) / 86400000)), 0);
      const rOcc = Math.min(100, Math.round((rNights / lastDay) * 100));
      const rNet = Math.round(rRev * 0.62);
      const rName = propLabel(fl.rooms) || fl.room_id || 'Unit';
      const slug = fl.rooms?.slug || ROOM_SLUG_MAP[rId] || '';
      const thumb = slug ? `assets/properties/${slug}/cover.jpg` : '';

      return { rId, rName, rRev, rOcc, rNet, thumb, unit: fl.rooms?.unit_no || fl.unit_no || '' };
    });

    window._hhPropRanking = propRankingList;
    window._hhSortBy = window._hhSortBy || 'revenue';

    window.toggleHHSort = function (mode) {
      window._hhSortBy = mode;
      const tbody = document.getElementById('hhLeaderboardBody');
      if (!tbody || !window._hhPropRanking) return;
      const sorted = [...window._hhPropRanking].sort((a, b) => mode === 'revenue' ? (b.rRev - a.rRev) : (b.rNet - a.rNet));
      tbody.innerHTML = sorted.map(p => `
      <tr>
        <td class="hh-prop-cell-name">
          <div class="hh-prop-cell-inner" style="display:flex;align-items:center;gap:10px;min-width:0;max-width:210px;">
            ${p.thumb ? `<img src="${p.thumb}" alt="${escapeHtml(p.rName)}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;">` : `<div style="width:32px;height:32px;border-radius:8px;background:#E0F2FE;color:#0284C7;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0;">${escapeHtml(p.unit || p.rId)}</div>`}
            <div style="min-width:0;flex:1;overflow:hidden;">
              <div style="font-weight:700;color:#0F172A;font-size:12.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(p.rName)}">${escapeHtml(p.rName)}</div>
              <div style="font-size:11px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.unit || '')}</div>
            </div>
          </div>
        </td>
        <td style="font-weight:800;color:#0F172A;text-align:right;white-space:nowrap;padding:10px 12px;">₹${p.rRev.toLocaleString('en-IN')}</td>
        <td>
          <div class="hh-occ-bar-wrap">
            <span style="font-weight:700;font-size:12px;min-width:32px;">${p.rOcc}%</span>
            <div class="hh-occ-bar-track">
              <div class="hh-occ-bar-fill" style="width:${p.rOcc}%;background:${p.rOcc >= 70 ? '#10B981' : (p.rOcc >= 50 ? '#F59E0B' : '#EF4444')};"></div>
            </div>
          </div>
        </td>
        <td style="font-weight:800;color:#10B981;text-align:right;white-space:nowrap;padding:10px 12px;">₹${p.rNet.toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

      const btnRev = document.getElementById('btnHHSortRev');
      const btnProfit = document.getElementById('btnHHSortProfit');
      if (btnRev && btnProfit) {
        if (mode === 'revenue') {
          btnRev.classList.add('active');
          btnProfit.classList.remove('active');
        } else {
          btnProfit.classList.add('active');
          btnRev.classList.remove('active');
        }
      }
    };

    window.setDashboardPeriod = function (period) {
      window._dashPeriod = period;
      if (period !== 'custom') window._dashCustomMonth = '';
      if (typeof window.renderExecutiveDashboard === 'function') {
        window.renderExecutiveDashboard();
      } else if (typeof window.renderDashboard === 'function') {
        window.renderDashboard();
      }
    };

    window.setDashboardCustomMonth = function (monthVal) {
      if (!monthVal) return;
      window._dashPeriod = 'custom';
      window._dashCustomMonth = monthVal;
      if (typeof window.renderExecutiveDashboard === 'function') {
        window.renderExecutiveDashboard();
      } else if (typeof window.renderDashboard === 'function') {
        window.renderDashboard();
      }
    };

    window.downloadHomeyhutsExcel = function () {
      const list = window._hhPropRanking || [];
      let csv = '\uFEFFProperty,Unit,Net Revenue,Occupancy %,Net Operating Income\n';
      list.forEach(p => {
        csv += `"${p.rName}","${p.unit}",${p.rRev},${p.rOcc}%,${p.rNet}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TUHH_Analytics_Report_${periodMode}_${today}.csv`;
      link.click();
    };
  window.downloadTuhhAnalyticsExcel = window.downloadHomeyhutsExcel;


    const monthBookings = monthCheckinBookings.length;

    const upcoming7 = allBookings
      .filter(b => b.check_in > today && b.check_in <= day7)
      .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

    // Active stays
    const activeNow = allBookings.filter(b => b.check_in <= today && (b.check_out > today || !b.check_out));

    // Attendance today
    const presentToday = (attendance || []).filter(a => a.status === 'Present').length;
    const totalEmps = (emps || []).length;

    // Pending tasks
    const urgentTasks = filteredTasks.filter(t => t.priority === 'Urgent').length;
    const maintPending = filteredMaint.length;

    // Occupancy %
    const occupancyPct = totalProps > 0 ? Math.round(bookedNow.length / totalProps * 100) : 0;

    // Extended Stays & Shifts
    const today30 = new Date(); today30.setDate(today30.getDate() - 30);
    const today30Str = today30.toISOString().slice(0, 10);
    const extendedStays = allBookings.filter(b =>
      b.parent_booking_id &&
      b.check_in >= today30Str &&
      (b.check_out >= today || !b.check_out)
    ).sort((a, b) => (b.check_in || '').localeCompare(a.check_in || ''));
    const extendedWithParent = extendedStays.map(ext => {
      const parent = allBookings.find(pb => pb.booking_id === ext.parent_booking_id);
      return { ext, parent };
    });

    const allShifts = [];
    allBookings.filter(b => b.parent_booking_id && b.check_in >= today30Str)
      .forEach(ext => {
        const parent = allBookings.find(pb => pb.booking_id === ext.parent_booking_id);
        if (parent && parent.room_id !== ext.room_id) {
          allShifts.push({
            guest: ext.guest_name,
            fromRoom: propLabel(parent.rooms) || parent.room_id,
            toRoom: propLabel(ext.rooms) || ext.room_id,
            shiftDate: ext.check_in,
            phone: ext.phone
          });
        }
      });

    const bName = b => `${propLabel(b.rooms) || b.room_id || '-'}`;
    const fName = fl => `${propLabel(fl.rooms) || fl.room_id || '-'}`;

    const upcomingReservations = allBookings
      .filter(b => b.check_in > today)
      .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

    const past7Days = dateAdd(today, -7);
    const checkoutFollowups = allBookings
      .filter(b => b.check_out && b.check_out >= past7Days && b.check_out < today)
      .slice(0, 4);

    const totalTodayReservations = realCheckouts.length + realCheckins.length + activeNow.length;
    window._airbnbTodayCount = totalTodayReservations;
    window._airbnbUpcomingCount = upcomingReservations.length;

    window.switchAirbnbFeedTab = function (tab) {
      window._airbnbFeedTab = tab;
      const todayList = document.getElementById('airbnbFeedTodayList');
      const upcomingList = document.getElementById('airbnbFeedUpcomingList');
      const heading = document.getElementById('airbnbFeedHeading');
      const btnToday = document.getElementById('airbnbTabBtnToday');
      const btnUpcoming = document.getElementById('airbnbTabBtnUpcoming');

      if (tab === 'today') {
        if (todayList) todayList.style.display = 'flex';
        if (upcomingList) upcomingList.style.display = 'none';
        if (heading) heading.textContent = `You have ${window._airbnbTodayCount || 0} reservations`;
        if (btnToday) btnToday.classList.add('active');
        if (btnUpcoming) btnUpcoming.classList.remove('active');
      } else {
        if (todayList) todayList.style.display = 'none';
        if (upcomingList) upcomingList.style.display = 'flex';
        if (heading) heading.textContent = `You have ${window._airbnbUpcomingCount || 0} upcoming reservations`;
        if (btnToday) btnToday.classList.remove('active');
        if (btnUpcoming) btnUpcoming.classList.add('active');
      }
    };

    window._dashboardPaidMap = paidMap;
    const formatAirbnbDateRange = window.formatAirbnbDateRange;
    const getAirbnbGuestNarrative = window.getAirbnbGuestNarrative;
    const getAirbnbPropertySubtitle = window.getAirbnbPropertySubtitle;
    const renderAirbnbOverlappingMedia = window.renderAirbnbOverlappingMedia;
    const renderAirbnbResCard = window.renderAirbnbResCard;
    const renderAirbnbGuestItem = window.renderAirbnbGuestItem;

    // Time-aware greeting (handles midnight/late night correctly)
    const hour = new Date().getHours();
    let greeting, greetEmoji;
    if (hour >= 0 && hour < 5) {
      greeting = 'Good Night'; greetEmoji = '🌙';      // midnight – 4:59 AM
    } else if (hour < 12) {
      greeting = 'Good Morning'; greetEmoji = '🌅';    // 5 AM – 11:59 AM
    } else if (hour < 17) {
      greeting = 'Good Afternoon'; greetEmoji = '☀️';  // 12 PM – 4:59 PM
    } else {
      greeting = 'Good Evening'; greetEmoji = '🌆';    // 5 PM – 11:59 PM
    }
    const userName = SESSION.name || (SESSION.role ? (SESSION.role.charAt(0).toUpperCase() + SESSION.role.slice(1)) : 'Host');

    // WhatsApp Tasks Computation
    const tomorrow = dateAdd(today, 1);
    const yesterday = dateAdd(today, -1);

    const checkinReminders = allBookings.filter(b => b.check_in === tomorrow && b.phone);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const arrivingSoonWA = allBookings.filter(b => {
      if (!b.phone || b.check_in !== today) return false;
      const t = (b.check_in_time || '14:00').toString();
      let mins = 14 * 60;
      const m24 = t.match(/^(\d{1,2}):(\d{2})/);
      if (m24) mins = parseInt(m24[1]) * 60 + parseInt(m24[2]);
      const diff = mins - nowMinutes;
      return diff >= -30 && diff <= 120;
    });

    const checkoutReminders = allBookings.filter(b => {
      if (!b.phone || !b.check_out) return false;
      return b.check_out === today && b.check_in <= today;
    });

    const sevenDaysAgo = dateAdd(today, -7);
    const reviewRequests = allBookings.filter(b => {
      if (!b.phone || !b.check_out) return false;
      return b.check_out >= sevenDaysAgo && b.check_out < today;
    });

    const noIdBookings = allBookings.filter(b => {
      if (!b.phone) return false;
      if (b.check_in > today || b.check_out < today) return false;
      const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
      return !hasId;
    });

    const totalWATasks = checkinReminders.length + arrivingSoonWA.length + checkoutReminders.length + reviewRequests.length + noIdBookings.length;
    const { lateCheckouts, arrivingSoon } = computeAttention(realCheckins, realCheckouts);
    const totalAttention = lateCheckouts.length + arrivingSoon.length;

    // ═══════════════════════════════════════════════════════════
    // 🌟 AIRBNB HOST "TODAY" FOLLOW-UPS GENERATOR (Matches Airbnb Screenshot)
    // ═══════════════════════════════════════════════════════════
    const airbnbFollowupList = [];

    // 1. Checkouts within last 14 days without host review
    const fourteenDaysAgo = dateAdd(today, -14);
    const checkoutReviewsPending = allBookings.filter(b => {
      if (b.is_cancelled || !b.check_out) return false;
      return b.check_out >= fourteenDaysAgo && b.check_out < today && !b.host_review_completed;
    }).sort((a, b) => (b.check_out || '').localeCompare(a.check_out || ''));

    checkoutReviewsPending.forEach(b => {
      const dOut = new Date(b.check_out + 'T00:00:00');
      const dNow = new Date(today + 'T00:00:00');
      const elapsedDays = Math.max(0, Math.round((dNow - dOut) / (1000 * 60 * 60 * 24)));
      const daysLeft = Math.max(1, 14 - elapsedDays);
      const guestFirstName = (b.guest_name || 'Guest').trim().split(' ')[0];

      airbnbFollowupList.push({
        type: 'review',
        bookingId: b.booking_id,
        booking: b,
        daysBadge: `${daysLeft} days left`,
        title: `Leave ${escapeHtml(guestFirstName)} a review`,
        subtitle: window.getAirbnbPropertySubtitle(b),
        actionLabel: 'Review',
        priority: 1
      });
    });

    // 2. Missing ID proofs for in-house or arriving guests
    const idFollowups = allBookings.filter(b => {
      if (b.is_cancelled || (b.guest_name || '').toLowerCase().includes('blocked')) return false;
      const isTodayArrival = (b.check_in === today);
      const isInHouse = (b.check_in <= today && (b.check_out > today || !b.check_out));
      if (!isTodayArrival && !isInHouse) return false;
      const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
      return !hasId;
    });

    idFollowups.forEach(b => {
      airbnbFollowupList.push({
        type: 'id',
        bookingId: b.booking_id,
        booking: b,
        daysBadge: 'Action needed',
        title: `Upload ID proof for ${escapeHtml(b.guest_name || 'Guest')}`,
        subtitle: window.getAirbnbPropertySubtitle(b),
        actionLabel: 'Upload ID',
        priority: 2
      });
    });

    // 3. Balance payment collections
    const dueFollowups = allBookings.filter(b => {
      if (b.is_cancelled) return false;
      const isTodayStay = (b.check_in === today || b.check_out === today || (b.check_in < today && b.check_out > today));
      if (!isTodayStay) return false;
      const tot = b.total_amount || 0;
      const pd = paidMap[b.booking_id] || 0;
      return (tot - pd) > 0.99;
    });

    dueFollowups.forEach(b => {
      const tot = b.total_amount || 0;
      const pd = paidMap[b.booking_id] || 0;
      const bal = Math.round(tot - pd);
      airbnbFollowupList.push({
        type: 'balance',
        bookingId: b.booking_id,
        booking: b,
        daysBadge: 'Payment pending',
        title: `Collect ₹${bal.toLocaleString('en-IN')} balance from ${escapeHtml(b.guest_name || 'Guest')}`,
        subtitle: window.getAirbnbPropertySubtitle(b),
        actionLabel: 'Collect',
        priority: 3
      });
    });

    // Sort: reviews first (by days left), then IDs, then balance
    airbnbFollowupList.sort((a, b) => a.priority - b.priority);
    window._airbnbFollowupsTotal = airbnbFollowupList.length;

    window.toggleAllFollowups = function () {
      const list = document.getElementById('airbnbFollowupsExpandedList');
      const btn = document.getElementById('btnToggleAllFollowups');
      if (!list || !btn) return;
      const isHidden = list.style.display === 'none' || !list.style.display;
      list.style.display = isHidden ? 'flex' : 'none';
      btn.innerHTML = isHidden
        ? `<span>Show less &uarr;</span>`
        : `<span>Show all ${window._airbnbFollowupsTotal || ''} follow-ups &darr;</span>`;
    };

    const renderFollowupCard = (item) => {
      const b = item.booking;
      return `
      <div class="airbnb-followup-row" onclick="openBookingFromDashboard('${item.bookingId}')" style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.03);transition:all 0.15s ease;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:11.5px;color:#717171;font-weight:600;margin-bottom:2px;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${item.type === 'review' ? '#3B82F6' : (item.type === 'id' ? '#F59E0B' : '#EF4444')};"></span>
            <span>${item.daysBadge}</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${item.title}
          </div>
          <div style="font-size:12px;color:#717171;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(item.subtitle)}
          </div>
        </div>
        <div style="flex-shrink:0;">
          ${window.renderAirbnbOverlappingMedia(b)}
        </div>
      </div>
    `;
    };

    renderShell(`
    <style id="dash-custom-styles">
      .dash-wrap { max-width: 1360px; margin: 0 auto; padding: 0 4px; }
      .dash-hero {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        box-shadow: var(--shadow);
        margin-bottom: 20px;
      }
      .dash-hero-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      .dash-title-group { flex: 1; min-width: 250px; }
      .dash-greeting {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dash-heading {
        font-size: 22px;
        font-weight: 800;
        color: var(--text);
        margin: 4px 0 2px;
        letter-spacing: -0.3px;
      }
      .dash-date-str {
        font-size: 13px;
        color: var(--muted);
        font-weight: 500;
      }
      .dash-hero-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .dash-online-badge {
        cursor: pointer;
        padding: 6px 12px;
        background: var(--green-light);
        border: 1px solid var(--green);
        border-radius: 10px;
        transition: all 0.2s ease;
      }
      .dash-online-lbl {
        font-size: 9px;
        color: var(--green);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .dash-online-val {
        font-size: 13px;
        font-weight: 800;
        color: var(--green);
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .dash-online-dot {
        width: 7px;
        height: 7px;
        background: var(--green);
        border-radius: 50%;
        display: inline-block;
        animation: pulse-dot 1.5s ease-in-out infinite;
      }
      .dash-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--text);
        user-select: none;
      }
      .dash-pill-btn:hover {
        background: var(--bg);
        border-color: var(--primary);
        color: var(--primary);
        transform: translateY(-1px);
      }
      .dash-pill-btn.primary {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 2px 6px var(--primary-glow);
      }
      .dash-pill-btn.primary:hover {
        background: var(--primary-dark);
        border-color: var(--primary-dark);
        color: #FFFFFF;
      }

      /* Room Matrix Section */
      .dash-matrix-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin: 18px 0 12px;
        padding-top: 16px;
        border-top: 1px solid var(--border-light);
      }
      .dash-matrix-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--muted);
        letter-spacing: 0.5px;
      }
      .room-matrix-tabs {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
      }
      .room-matrix-tabs::-webkit-scrollbar { display: none; }
      .room-matrix-tab {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--muted);
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .room-matrix-tab:hover {
        color: var(--text);
        border-color: var(--primary);
      }
      .room-matrix-tab.active {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 0 10px var(--primary-glow);
      }
      .room-matrix-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
        gap: 8px;
      }
      .room-matrix-item {
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-light);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        transition: all 0.2s ease;
        background: var(--card);
      }
      .room-matrix-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08);
      }
      .room-matrix-item.status-ready { background: #ECFDF5; border-color: #A7F3D0; }
      .room-matrix-item.status-ready span { color: #065F46; }
      .room-matrix-item.status-booked { background: #F0F9FF; border-color: #BAE6FD; }
      .room-matrix-item.status-booked span { color: #075985; }
      .room-matrix-item.status-dirty { background: #FFFBEB; border-color: #FDE68A; }
      .room-matrix-item.status-dirty span { color: #92400E; }
      .room-matrix-item.status-maint { background: #FEF2F2; border-color: #FECACA; }
      .room-matrix-item.status-maint span { color: #991B1B; }

      /* Hero KPI Ribbon */
      .dash-kpi-ribbon {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 14px;
        margin-bottom: 22px;
      }
      .dash-kpi-card {
        background: var(--card);
        border-radius: 16px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      .dash-kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-hover);
        border-color: var(--primary);
      }
      .dash-kpi-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 4px;
      }
      .dash-kpi-card.occupancy::before { background: var(--blue); }
      .dash-kpi-card.checkins::before { background: var(--green); }
      .dash-kpi-card.checkouts::before { background: var(--primary); }
      .dash-kpi-card.revenue::before { background: #10B981; }

      .dash-kpi-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .dash-kpi-label {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--muted);
      }
      .dash-kpi-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .dash-kpi-icon.occupancy { background: var(--blue-light); color: var(--blue); }
      .dash-kpi-icon.checkins { background: var(--green-light); color: var(--green); }
      .dash-kpi-icon.checkouts { background: var(--primary-light); color: var(--primary); }
      .dash-kpi-icon.revenue { background: var(--green-light); color: #10B981; }

      .dash-kpi-num {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
        line-height: 1.1;
        letter-spacing: -0.5px;
      }
      .dash-kpi-sub {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dash-progress-bar {
        height: 5px;
        background: var(--border-light);
        border-radius: 4px;
        margin-top: 10px;
        overflow: hidden;
      }
      .dash-progress-fill {
        height: 100%;
        background: var(--blue);
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      /* Segmented Tab Navigation */
      .dash-nav-bar {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 8px;
        margin-bottom: 18px;
        border-bottom: 1px solid var(--border);
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .dash-nav-bar::-webkit-scrollbar { display: none; }
      .dash-nav-tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border-radius: 12px;
        font-size: 13.5px;
        font-weight: 700;
        background: var(--card);
        color: var(--muted);
        border: 1px solid var(--border);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
        user-select: none;
      }
      .dash-nav-tab:hover {
        color: var(--text);
        border-color: var(--primary);
      }
      .dash-nav-tab.active {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 4px 14px var(--primary-glow);
      }
      .dash-tab-badge {
        font-size: 11px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 20px;
        background: rgba(0,0,0,0.08);
        color: inherit;
      }
      .dash-nav-tab.active .dash-tab-badge {
        background: rgba(255,255,255,0.25);
        color: #FFFFFF;
      }

      /* Tab Content Panels */
      .dash-tab-pane {
        display: none;
        animation: fadeIn 0.2s ease-in-out;
      }
      .dash-tab-pane.active {
        display: block;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Attention Banner */
      .dash-attention-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-left: 1px solid var(--border);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 18px;
        box-shadow: var(--shadow);
      }
      .dash-attention-card.all-clear {
        border-left-color: var(--green);
        background: var(--green-light);
        border-color: var(--green);
      }
      .dash-attention-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .dash-attention-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Operational Cards Grid */
      .dash-ops-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .dash-panel-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px;
        box-shadow: var(--shadow);
      }
      .dash-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border-light);
      }
      .dash-panel-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dash-panel-count {
        font-size: 11.5px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 20px;
        background: var(--bg);
        color: var(--muted);
      }
      .dash-panel-count.green { background: var(--green-light); color: var(--green); }
      .dash-panel-count.blue { background: var(--blue-light); color: var(--blue); }
      .dash-panel-count.primary { background: var(--primary-light); color: var(--primary); }
      .dash-panel-count.yellow { background: var(--yellow-light); color: var(--yellow); }
      .dash-panel-count.red { background: var(--red-light); color: var(--red); }

      /* Guest Card Items */
      .dash-guest-item {
        padding: 12px;
        border-radius: 12px;
        background: var(--bg);
        border: 1px solid var(--border-light);
        margin-bottom: 10px;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .dash-guest-item:hover {
        background: var(--card);
        border-color: var(--primary);
        box-shadow: var(--shadow);
      }
      .dash-guest-info { flex: 1; min-width: 0; }
      .dash-guest-primary {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .dash-guest-name {
        font-size: 13.5px;
        font-weight: 700;
        color: #0F172A;
        cursor: pointer;
        text-decoration: none;
      }
      .dash-guest-name:hover {
        color: #0284C7;
        text-decoration: underline;
      }
      .dash-guest-name:hover { text-decoration: underline; }
      .dash-unit-chip {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        background: var(--primary-light);
        color: var(--primary);
        white-space: nowrap;
      }
      .dash-guest-meta {
        font-size: 12px;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .dash-guest-meta a {
        color: inherit;
        text-decoration: none;
      }
      .dash-guest-meta a:hover {
        color: var(--primary);
        text-decoration: underline;
      }
      .dash-action-icons {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .dash-icon-btn {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--text);
        cursor: pointer;
        text-decoration: none;
        transition: all 0.15s ease;
      }
      .dash-icon-btn:hover {
        background: var(--bg);
        border-color: var(--primary);
        transform: scale(1.05);
      }
      .dash-icon-btn.wa {
        background: #DCFCE7;
        color: #166534;
        border-color: #BBF7D0;
      }
      .dash-icon-btn.wa:hover {
        background: #22C55E;
        color: #FFFFFF;
        border-color: #22C55E;
      }

      /* Clean Empty States */
      .dash-empty-state {
        text-align: center;
        padding: 24px 12px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 500;
      }

      /* Monthly Dark Aesthetic Financial Card */
      .dash-month-card {
        background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
        border-radius: 18px;
        padding: 22px;
        color: #FFFFFF;
        margin-top: 24px;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
      }
      .dash-month-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        margin-bottom: 18px;
      }
      .dash-month-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.6);
      }
      .dash-month-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 16px;
      }
      .dash-month-item {
        background: rgba(255, 255, 255, 0.04);
        padding: 14px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .dash-month-lbl {
        font-size: 11.5px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.65);
        margin-bottom: 6px;
      }
      .dash-month-val {
        font-size: 20px;
        font-weight: 800;
        line-height: 1.2;
      }

      /* Responsive rules */
      @media (max-width: 768px) {
        .dash-hero { padding: 14px; }
        .dash-heading { font-size: 19px; }
        .dash-kpi-ribbon { grid-template-columns: 1fr 1fr; gap: 10px; }
        .dash-kpi-card { padding: 12px 14px; }
        .dash-kpi-num { font-size: 22px; }
        .dash-ops-grid { grid-template-columns: 1fr; }
        .room-matrix-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
        .dash-guest-item { flex-direction: column; align-items: flex-start; gap: 8px; }
        .dash-action-icons { width: 100%; justify-content: flex-end; }
        .dash-month-grid { grid-template-columns: 1fr 1fr; }
      }
      @media (max-width: 480px) {
        .dash-kpi-ribbon { grid-template-columns: 1fr; }
        .dash-month-grid { grid-template-columns: 1fr; }
        .dash-hero-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          margin-top: 10px;
        }
        .dash-online-badge {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dash-pill-btn {
          justify-content: center;
          padding: 9px 8px;
          font-size: 12px;
          text-align: center;
        }
      }
    </style>

    <div class="dash-wrap">
      ${updateNoticeHTML()}
      ${['owner', 'admin'].includes(SESSION.role) ? syncInfoHTML() : ''}
      ${pendingWebsiteBookings.length > 0 ? `
        <div class="website-pending-alert-banner" onclick="navigate('pendingApprovals')" style="cursor:pointer;background:linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);border:2px solid #F59E0B;border-radius:14px;padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;box-shadow:0 4px 14px rgba(245,158,11,0.18);">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="font-size:30px;line-height:1;">🌐</div>
            <div>
              <div style="font-weight:800;color:#92400E;font-size:15px;display:flex;align-items:center;gap:8px;">
                <span>Website Booking Alert!</span>
                <span style="background:#F59E0B;color:#fff;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700;">${pendingWebsiteBookings.length} Awaiting Approval</span>
              </div>
              <div style="font-size:13px;color:#78350F;margin-top:3px;">
                ${pendingWebsiteBookings.map(b => `<strong>${escapeHtml(b.guest_name || 'Guest')}</strong> (${escapeHtml(b.rooms?.nickname || b.room_id || 'Room')} • Check-in: ${b.check_in || 'Dates'})`).join(', ')}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn-sm" style="background:#0F172A;color:#fff;border-radius:20px;font-weight:700;padding:7px 16px;border:none;cursor:pointer;font-size:12.5px;">
              🟡 Review & Approve ➔
            </button>
          </div>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════════════════════════ -->
      <!-- 🏡 AIRBNB HOST "TODAY" EXECUTIVE HUB (MATCHES OFFICIAL APP)  -->
      <!-- ═══════════════════════════════════════════════════════════ -->
      <div class="airbnb-today-portal" style="max-width:860px;margin:0 auto 28px;padding:0 8px;">
        <!-- Top Pill Bar: Today | Upcoming | Filter -->
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0 24px;position:relative;">
          <div style="display:inline-flex;background:#F1F5F9;padding:4px;border-radius:999px;border:1px solid #E2E8F0;">
            <button type="button" class="btn-sm" style="background:#222222;color:#ffffff;border:none;border-radius:999px;padding:7px 22px;font-size:13.5px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.15);cursor:pointer;">
              Today
            </button>
            <button type="button" class="btn-sm" onclick="document.getElementById('hhUpcomingSection')?.scrollIntoView({behavior:'smooth',block:'start'})" style="background:transparent;color:#475569;border:none;border-radius:999px;padding:7px 22px;font-size:13.5px;font-weight:600;cursor:pointer;">
              Upcoming
            </button>
          </div>

          <button type="button" onclick="window.openPropertyFilterDialog()" title="Filter by property" style="width:38px;height:38px;border-radius:50%;border:1.5px solid #CBD5E1;background:#ffffff;color:#1E293B;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.06);transition:all 0.15s ease;">
            <i class="ti ti-adjustments-horizontal" style="font-size:17px;"></i>
          </button>

          <button type="button" class="btn-sm" onclick="navigate('analytics')" style="background:#0F172A;color:#ffffff;border:none;border-radius:999px;padding:7px 18px;font-size:12.5px;font-weight:700;box-shadow:0 2px 6px rgba(15,23,42,0.18);cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s ease;">
            <span>📊 Financial Dashboard ➔</span>
          </button>

          <button type="button" class="btn-sm" onclick="typeof window.openBlossomSkylineDailyStatusModal === 'function' ? window.openBlossomSkylineDailyStatusModal() : (window.navigate('daily-report'), setTimeout(() => window.openBlossomSkylineDailyStatusModal?.(), 500))" style="background:#25D366;color:#ffffff;border:none;border-radius:999px;padding:7px 18px;font-size:12.5px;font-weight:700;box-shadow:0 2px 8px rgba(37,211,102,0.35);cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s ease;" title="Generate 1-Click WhatsApp Booking Data Status (Flats 101–501)">
            <span>📋 WhatsApp Status</span>
          </button>
        </div>

        ${globalProp ? `
          <div style="margin:0 0 16px;background:#FFF5F4;border:1px solid #FECACA;padding:9px 14px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#991B1B;">
              <span>🏛️</span>
              <span>Filtered: <strong>${escapeHtml((window._globalRoomsList || []).find(r => (r.room_id || '').toUpperCase() === globalProp.toUpperCase())?.nickname || globalProp)}</strong></span>
            </div>
            <button type="button" onclick="window.handleGlobalPropertyFilterChange('')" style="background:#fff;border:1px solid #FECACA;color:#EA3829;font-weight:800;font-size:11.5px;padding:3px 10px;border-radius:999px;cursor:pointer;">
              Show All ✕
            </button>
          </div>
        ` : ''}

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- 1. TODAY'S RESERVATIONS (CHECK-INS & CHECK-OUTS FIRST!)     -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div style="margin-bottom:30px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 14px;padding:0 2px;flex-wrap:wrap;gap:8px;">
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#111827;margin:0;letter-spacing:-0.5px;font-family:'Plus Jakarta Sans',sans-serif;">
                Today's reservations (${totalTodayReservations})
              </h1>
              <div style="font-size:13px;color:#64748B;font-weight:600;margin-top:3px;">
                ${realCheckouts.length} checking out &bull; ${realCheckins.length} checking in &bull; ${activeNow.length} in-house
              </div>
            </div>
            ${totalTodayReservations > 0 ? `
              <div style="display:inline-flex;gap:6px;flex-wrap:wrap;">
                <span style="font-size:11.5px;font-weight:700;background:#FEF2F2;color:#DC2626;padding:4px 10px;border-radius:999px;border:1px solid #FECACA;">
                  🚪 ${realCheckouts.length} Out
                </span>
                <span style="font-size:11.5px;font-weight:700;background:#ECFDF5;color:#059669;padding:4px 10px;border-radius:999px;border:1px solid #A7F3D0;">
                  🔑 ${realCheckins.length} In
                </span>
                <span style="font-size:11.5px;font-weight:700;background:#F0F9FF;color:#0284C7;padding:4px 10px;border-radius:999px;border:1px solid #BAE6FD;">
                  🏠 ${activeNow.length} Stay
                </span>
              </div>
            ` : ''}
          </div>

          <!-- Reservation Cards List -->
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${totalTodayReservations === 0 ? `
              <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;padding:28px 16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                <div style="font-size:28px;margin-bottom:6px;">🏖️</div>
                <div style="font-size:15px;font-weight:800;color:#0F172A;">No check-ins or check-outs scheduled for today</div>
                <div style="font-size:12.5px;color:#64748B;margin-top:2px;">All units are prepared or currently occupied guests are settled.</div>
              </div>
            ` : `
              ${realCheckouts.length > 0 ? `
                <div style="font-size:11.5px;font-weight:800;color:#DC2626;text-transform:uppercase;letter-spacing:0.8px;margin:6px 0 2px 4px;display:flex;align-items:center;gap:6px;">
                  <span>🚪</span> Checking out today (${realCheckouts.length})
                </div>
                ${realCheckouts.map(b => window.renderAirbnbResCard(b, 'checkout')).join('')}
              ` : ''}

              ${realCheckins.length > 0 ? `
                <div style="font-size:11.5px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.8px;margin:12px 0 2px 4px;display:flex;align-items:center;gap:6px;">
                  <span>🔑</span> Checking in today (${realCheckins.length})
                </div>
                ${realCheckins.map(b => window.renderAirbnbResCard(b, 'checkin')).join('')}
              ` : ''}

              ${activeNow.length > 0 ? `
                <div style="font-size:11.5px;font-weight:800;color:#0284C7;text-transform:uppercase;letter-spacing:0.8px;margin:12px 0 2px 4px;display:flex;align-items:center;gap:6px;">
                  <span>🏠</span> Currently In-House (${activeNow.length})
                </div>
                ${activeNow.slice(0, 6).map(b => window.renderAirbnbResCard(b, 'inhouse')).join('')}
                ${activeNow.length > 6 ? `
                  <div id="airbnbInHouseExpandedList" style="display:none;flex-direction:column;gap:10px;">
                    ${activeNow.slice(6).map(b => window.renderAirbnbResCard(b, 'inhouse')).join('')}
                  </div>
                  <div style="text-align:center;margin-top:4px;">
                    <button type="button" onclick="document.getElementById('airbnbInHouseExpandedList').style.display='flex';this.style.display='none';" style="background:#F0F9FF;border:1px solid #BAE6FD;color:#0284C7;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;cursor:pointer;">
                      + View all ${activeNow.length} in-house guests &darr;
                    </button>
                  </div>
                ` : ''}
              ` : ''}
            `}
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- 2. UPCOMING RESERVATIONS                                    -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div id="hhUpcomingSection" style="margin-bottom:32px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 12px;padding:0 2px;">
            <h2 style="font-size:18px;font-weight:800;color:#111827;margin:0;letter-spacing:-0.3px;">
              Upcoming reservations (${upcomingReservations.length})
            </h2>
            <button type="button" onclick="navigate('calendar')" style="background:none;border:none;color:#0284C7;font-size:12.5px;font-weight:700;cursor:pointer;padding:0;">
              View in Calendar &rarr;
            </button>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            ${upcomingReservations.length === 0 ? `
              <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;padding:24px 16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                <div style="font-size:24px;margin-bottom:4px;">📅</div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;">No upcoming bookings scheduled</div>
              </div>
            ` : `
              ${upcomingReservations.slice(0, 8).map(b => window.renderAirbnbResCard(b, 'upcoming')).join('')}
              ${upcomingReservations.length > 8 ? `
                <div id="airbnbUpcomingExpandedList" style="display:none;flex-direction:column;gap:10px;">
                  ${upcomingReservations.slice(8).map(b => window.renderAirbnbResCard(b, 'upcoming')).join('')}
                </div>
                <div style="text-align:center;margin-top:6px;">
                  <button type="button" onclick="document.getElementById('airbnbUpcomingExpandedList').style.display='flex';this.style.display='none';" style="background:#FFFFFF;border:1.5px solid #E2E8F0;color:#0284C7;font-size:12.5px;font-weight:700;padding:8px 18px;border-radius:999px;cursor:pointer;">
                    + View all ${upcomingReservations.length} upcoming reservations &darr;
                  </button>
                </div>
              ` : ''}
            `}
          </div>
        </div>
      </div>

    </div>
  `, 'dashboard');
  } catch (err) {
    console.error("❌ CRITICAL ERROR in renderDashboard:", err);
    renderShell(`
      <div class="card" style="max-width:860px;margin:40px auto;padding:36px;text-align:center;border-radius:20px;border:1px solid #FECACA;background:#FFF5F5;box-shadow:0 8px 30px rgba(234,56,41,0.08);">
        <div style="font-size:44px;margin-bottom:14px;">⚠️</div>
        <h2 style="color:#991B1B;font-size:20px;font-weight:800;margin-bottom:8px;">Dashboard Encountered an Issue</h2>
        <p style="color:#7F1D1D;font-size:13.5px;margin-bottom:20px;line-height:1.5;">
          ${escapeHtml(err && err.message ? err.message : String(err))}
        </p>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          <button type="button" style="background:#EA3829;color:#fff;border:none;padding:10px 24px;border-radius:999px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(234,56,41,0.3);" onclick="renderDashboard()">🔄 Retry Dashboard</button>
          <button type="button" style="background:#0F172A;color:#fff;border:none;padding:10px 24px;border-radius:999px;font-weight:800;font-size:13px;cursor:pointer;" onclick="navigate('bookings')">📅 View Bookings</button>
        </div>
      </div>
    `, 'dashboard');
  }
}


// ═══════════════════════════════════════════════════════════
// 📊 EXECUTIVE FINANCIAL DASHBOARD (HOMEYHUTS ANALYTICS ENGINE)
// ═══════════════════════════════════════════════════════════
window.renderExecutiveDashboard = async function () {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('metrics');
  renderShell(`<div class="loading">📊 Crunching executive business intelligence...</div>`, 'analytics');

  try {
    const today = getLocalDateString();
    window._dashPeriod = window._dashPeriod || 'this_month';
    const periodMode = window._dashPeriod;

    let periodStart, periodEnd, prevPeriodStart, prevPeriodEnd, periodDays, periodDisplayLabel;
    const now = new Date();
    const currY = now.getFullYear();
    const currM = now.getMonth(); // 0-indexed
    const curLastDay = new Date(currY, currM + 1, 0).getDate();
    const curMStr = String(currM + 1).padStart(2, '0');
    const todayDay = now.getDate();
    const todayDayStr = String(todayDay).padStart(2, '0');

    if (periodMode === 'mtd') {
      periodStart = `${currY}-${curMStr}-01`;
      periodEnd = today;
      periodDays = todayDay;
      const prevDate = new Date(currY, currM - 1, 1);
      const pmY = prevDate.getFullYear();
      const pmM = String(prevDate.getMonth() + 1).padStart(2, '0');
      prevPeriodStart = `${pmY}-${pmM}-01`;
      prevPeriodEnd = `${pmY}-${pmM}-${todayDayStr}`;
      periodDisplayLabel = `MTD: 1 – ${todayDay} ${now.toLocaleString('en-IN', { month: 'short' })} ${currY}`;
    } else if (periodMode === 'qtd') {
      const qMonthStart = Math.floor(currM / 3) * 3;
      const qNum = Math.floor(currM / 3) + 1;
      const qStartMStr = String(qMonthStart + 1).padStart(2, '0');
      periodStart = `${currY}-${qStartMStr}-01`;
      periodEnd = today;
      const sD = new Date(periodStart);
      const eD = new Date(periodEnd);
      periodDays = Math.max(1, Math.round((eD - sD) / 86400000) + 1);
      const prevQMonthStart = qMonthStart === 0 ? 9 : qMonthStart - 3;
      const prevQYear = qMonthStart === 0 ? currY - 1 : currY;
      const pqStartMStr = String(prevQMonthStart + 1).padStart(2, '0');
      prevPeriodStart = `${prevQYear}-${pqStartMStr}-01`;
      const prevQE = new Date(prevPeriodStart);
      prevQE.setDate(prevQE.getDate() + periodDays - 1);
      const pqEY = prevQE.getFullYear();
      const pqEM = String(prevQE.getMonth() + 1).padStart(2, '0');
      const pqED = String(prevQE.getDate()).padStart(2, '0');
      prevPeriodEnd = `${pqEY}-${pqEM}-${pqED}`;
      periodDisplayLabel = `QTD (Q${qNum}): 1 ${new Date(currY, qMonthStart, 1).toLocaleString('en-IN', { month: 'short' })} – ${todayDay} ${now.toLocaleString('en-IN', { month: 'short' })}`;
    } else if (periodMode === 'ytd') {
      periodStart = `${currY}-01-01`;
      periodEnd = today;
      const sD = new Date(periodStart);
      const eD = new Date(periodEnd);
      periodDays = Math.max(1, Math.round((eD - sD) / 86400000) + 1);
      prevPeriodStart = `${currY - 1}-01-01`;
      prevPeriodEnd = `${currY - 1}-${curMStr}-${todayDayStr}`;
      periodDisplayLabel = `YTD: 1 Jan – ${todayDay} ${now.toLocaleString('en-IN', { month: 'short' })} ${currY}`;
    } else if (periodMode === 'last_month') {
      const lmDate = new Date(currY, currM - 1, 1);
      const lmY = lmDate.getFullYear();
      const lmM = String(lmDate.getMonth() + 1).padStart(2, '0');
      const lmLastDay = new Date(lmY, lmDate.getMonth() + 1, 0).getDate();
      periodStart = `${lmY}-${lmM}-01`;
      periodEnd = `${lmY}-${lmM}-${String(lmLastDay).padStart(2, '0')}`;
      const p2Date = new Date(currY, currM - 2, 1);
      const p2Y = p2Date.getFullYear();
      const p2M = String(p2Date.getMonth() + 1).padStart(2, '0');
      const p2LastDay = new Date(p2Y, p2Date.getMonth() + 1, 0).getDate();
      prevPeriodStart = `${p2Y}-${p2M}-01`;
      prevPeriodEnd = `${p2Y}-${p2M}-${String(p2LastDay).padStart(2, '0')}`;
      periodDays = lmLastDay;
      periodDisplayLabel = `Last Month (${lmDate.toLocaleString('en-IN', { month: 'short' })} ${lmY})`;
    } else if (periodMode === 'this_year') {
      periodStart = `${currY}-01-01`;
      periodEnd = `${currY}-12-31`;
      prevPeriodStart = `${currY - 1}-01-01`;
      prevPeriodEnd = `${currY - 1}-12-31`;
      periodDays = 365;
      periodDisplayLabel = `Full Year ${currY}`;
    } else if (periodMode === 'custom_range' && window._dashCustomRangeStart && window._dashCustomRangeEnd) {
      periodStart = window._dashCustomRangeStart;
      periodEnd = window._dashCustomRangeEnd;
      const sD = new Date(periodStart);
      const eD = new Date(periodEnd);
      periodDays = Math.max(1, Math.round((eD - sD) / 86400000) + 1);
      const prevEnd = new Date(sD);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - (periodDays - 1));
      prevPeriodStart = prevStart.toISOString().slice(0, 10);
      prevPeriodEnd = prevEnd.toISOString().slice(0, 10);
      periodDisplayLabel = `${sD.getDate()} ${sD.toLocaleString('en-IN', { month: 'short' })} – ${eD.getDate()} ${eD.toLocaleString('en-IN', { month: 'short' })}`;
    } else if (periodMode === 'custom' && window._dashCustomMonth) {
      const [cy, cm] = window._dashCustomMonth.split('-');
      const cYear = parseInt(cy, 10);
      const cMonth = parseInt(cm, 10);
      const cLastDay = new Date(cYear, cMonth, 0).getDate();
      periodStart = `${window._dashCustomMonth}-01`;
      periodEnd = `${window._dashCustomMonth}-${String(cLastDay).padStart(2, '0')}`;
      const prevMDate = new Date(cYear, cMonth - 2, 1);
      const pmY = prevMDate.getFullYear();
      const pmM = String(prevMDate.getMonth() + 1).padStart(2, '0');
      const pmLastDay = new Date(pmY, prevMDate.getMonth() + 1, 0).getDate();
      prevPeriodStart = `${pmY}-${pmM}-01`;
      prevPeriodEnd = `${pmY}-${pmM}-${String(pmLastDay).padStart(2, '0')}`;
      periodDays = cLastDay;
      const cDate = new Date(cYear, cMonth - 1, 1);
      periodDisplayLabel = `1 – ${cLastDay} ${cDate.toLocaleString('en-IN', { month: 'short' })} ${cYear}`;
    } else {
      // Default 'this_month'
      periodStart = `${currY}-${curMStr}-01`;
      periodEnd = `${currY}-${curMStr}-${String(curLastDay).padStart(2, '0')}`;
      const prevDate = new Date(currY, currM - 1, 1);
      const pmY = prevDate.getFullYear();
      const pmM = String(prevDate.getMonth() + 1).padStart(2, '0');
      const pmLastDay = new Date(pmY, prevDate.getMonth() + 1, 0).getDate();
      prevPeriodStart = `${pmY}-${pmM}-01`;
      prevPeriodEnd = `${pmY}-${pmM}-${String(pmLastDay).padStart(2, '0')}`;
      periodDays = curLastDay;
      periodDisplayLabel = `1 – ${curLastDay} ${now.toLocaleString('en-IN', { month: 'short' })} ${currY}`;
    }

    const [
      { data: bookings },
      { data: flats },
      { data: payments }
    ] = await Promise.all([
      sb.from("guest_register").select("*, rooms(unit_no, nickname)"),
      sb.from("flats_status").select("room_id, status, cleaning_status, rooms(unit_no, nickname)"),
      sb.from("payment_history").select("booking_id, amount, payment_date")
    ]);

    let realExpenses = [];
    try {
      const expRes = await sb.from("expenses").select("id, amount, entry_date, room_id");
      if (expRes?.data && Array.isArray(expRes.data)) {
        realExpenses = expRes.data;
      }
    } catch (e) {}

    const globalProp = (typeof window.getGlobalSelectedProperty === 'function') ? (window.getGlobalSelectedProperty() || '').trim() : '';

    const matchesRoom = (item, targetProp) => {
      if (!targetProp || targetProp === 'all') return true;
      if (!item) return false;
      const t = String(targetProp).trim().toUpperCase();
      const r = item.room_id ? String(item.room_id).trim().toUpperCase() : '';
      const sr = item.source_room_id ? String(item.source_room_id).trim().toUpperCase() : '';
      const ro = item.rooms?.room_id ? String(item.rooms.room_id).trim().toUpperCase() : '';
      const un = item.rooms?.unit_no ? String(item.rooms.unit_no).trim().toUpperCase() : (item.unit ? String(item.unit).trim().toUpperCase() : '');
      const nn = item.rooms?.nickname ? String(item.rooms.nickname).trim().toUpperCase() : (item.rName ? String(item.rName).trim().toUpperCase() : '');
      return r === t || sr === t || ro === t || (un && un === t) || (nn && nn === t);
    };

    const allBookingsRaw = bookings || [];
    const allBookings = globalProp ? allBookingsRaw.filter(b => matchesRoom(b, globalProp)) : allBookingsRaw;
    const allFlatsRaw = flats || [];
    const allFlats = globalProp ? allFlatsRaw.filter(f => matchesRoom(f, globalProp)) : allFlatsRaw;
    const allPayments = payments || [];
    const bookingIdsForProp = new Set(allBookings.map(b => b.booking_id));
    const propPayments = globalProp ? allPayments.filter(p => bookingIdsForProp.has(p.booking_id)) : allPayments;

    const bookedNow = allFlats.filter(x => x.status === 'Booked');
    const freeClean = allFlats.filter(x => x.status === 'Free' && x.cleaning_status === 'Clean');
    const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty' && x.status !== 'Blocked-Maintenance');
    const maintUnits = allFlats.filter(x => x.status === 'Blocked-Maintenance');
    const totalProps = allFlats.length;

    const paidMap = {};
    propPayments.forEach(p => {
      paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
    });

    const monthCheckinBookings = allBookings.filter(b => {
      const ci = b.check_in || '';
      return ci >= periodStart && ci <= periodEnd && !b.is_cancelled;
    });
    const monthRevenue = monthCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const monthCollected = monthCheckinBookings.reduce((s, b) => s + (paidMap[b.booking_id] || 0), 0);
    const totalBookedNights = monthCheckinBookings.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out || b.check_in) - new Date(b.check_in)) / 86400000)), 0);
    const hhAdr = totalBookedNights > 0 ? Math.round(monthRevenue / totalBookedNights) : (monthRevenue > 0 ? Math.round(monthRevenue / Math.max(1, monthCheckinBookings.length)) : 0);
    const totalAvailRoomNights = Math.max(1, totalProps * periodDays);
    const hhRevPar = Math.round(monthRevenue / totalAvailRoomNights);

    const monthExpensesList = realExpenses.filter(e => {
      const ed = e.entry_date || '';
      return ed >= periodStart && ed <= periodEnd && (!globalProp || matchesRoom(e, globalProp));
    });
    const realExpTotal = monthExpensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const hhEstExpenses = realExpTotal > 0 ? realExpTotal : Math.round(monthRevenue * 0.38);
    const hhNetOpIncome = Math.max(0, monthRevenue - hhEstExpenses);
    const periodOccupancyPct = totalAvailRoomNights > 0 ? Math.min(100, Math.round((totalBookedNights / totalAvailRoomNights) * 100)) : 0;
    const occupancyPct = totalProps > 0 ? Math.round(bookedNow.length / totalProps * 100) : 0;

    // Previous Period Comparison
    const prevPeriodCheckinBookings = allBookings.filter(b => {
      const ci = b.check_in || '';
      return ci >= prevPeriodStart && ci <= prevPeriodEnd && !b.is_cancelled;
    });
    const prevRevenue = prevPeriodCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const prevBookedNights = prevPeriodCheckinBookings.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out || b.check_in) - new Date(b.check_in)) / 86400000)), 0);
    const prevAdr = prevBookedNights > 0 ? Math.round(prevRevenue / prevBookedNights) : 0;
    const prevAvailRoomNights = Math.max(1, totalProps * periodDays);
    const prevRevPar = Math.round(prevRevenue / prevAvailRoomNights);
    const prevExpensesList = realExpenses.filter(e => {
      const ed = e.entry_date || '';
      return ed >= prevPeriodStart && ed <= prevPeriodEnd && (!globalProp || matchesRoom(e, globalProp));
    });
    const prevRealExpTotal = prevExpensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const prevNetOpIncome = prevRealExpTotal > 0 ? Math.max(0, prevRevenue - prevRealExpTotal) : Math.max(0, prevRevenue - Math.round(prevRevenue * 0.38));
    const prevOccPct = Math.min(100, Math.round((prevBookedNights / prevAvailRoomNights) * 100));

    const revChangePct = prevRevenue > 0 ? (((monthRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : (monthRevenue > 0 ? '+100.0' : '0.0');
    const netChangePct = prevNetOpIncome > 0 ? (((hhNetOpIncome - prevNetOpIncome) / prevNetOpIncome) * 100).toFixed(1) : (hhNetOpIncome > 0 ? '+100.0' : '0.0');
    const adrChangePct = prevAdr > 0 ? (((hhAdr - prevAdr) / prevAdr) * 100).toFixed(1) : (hhAdr > 0 ? '+100.0' : '0.0');
    const revParChangePct = prevRevPar > 0 ? (((hhRevPar - prevRevPar) / prevRevPar) * 100).toFixed(1) : (hhRevPar > 0 ? '+100.0' : '0.0');
    const occDiffPts = (periodOccupancyPct - prevOccPct).toFixed(0);

    function formatDeltaTag(val, isPts = false) {
      const num = parseFloat(val);
      const isPos = num >= 0;
      const sign = isPos ? '↑ ' : '↓ ';
      const cls = isPos ? 'positive' : 'negative';
      const unit = isPts ? ' pts' : '%';
      return `<span class="hh-kpi-change-tag ${cls}">${sign}${Math.abs(num)}${unit}</span>`;
    }

    function sparklineSvg(isPos, color) {
      const stroke = color || (isPos ? '#10B981' : '#EF4444');
      const fill = isPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)';
      if (isPos) {
        return `<svg viewBox="0 0 100 28" class="hh-kpi-sparkline">
          <path d="M0 24 Q 25 18, 50 12 T 100 4" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M0 24 Q 25 18, 50 12 T 100 4 L 100 28 L 0 28 Z" fill="${fill}"/>
        </svg>`;
      } else {
        return `<svg viewBox="0 0 100 28" class="hh-kpi-sparkline">
          <path d="M0 8 Q 25 14, 50 18 T 100 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M0 8 Q 25 14, 50 18 T 100 24 L 100 28 L 0 28 Z" fill="${fill}"/>
        </svg>`;
      }
    }

    // Channel Breakdown — Real-time & accurate
    const directBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? src.type === 'direct' : (!b.booking_mode?.includes('Airbnb') && !b.booking_mode?.includes('Booking.com') && !b.booking_mode?.includes('Agoda'));
    });
    const directRev = directBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const abBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? src.type === 'airbnb' : b.booking_mode?.includes('Airbnb');
    });
    const abRev = abBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const bcomBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? src.type === 'booking_com' : b.booking_mode?.includes('Booking.com');
    });
    const bcomRev = bcomBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const agodaBks = monthCheckinBookings.filter(b => {
      const src = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
      return src ? (src.type === 'agoda' || src.type === 'online_other') : (b.booking_mode?.includes('Agoda') || b.booking_mode?.includes('MakeMyTrip'));
    });
    const agodaRev = agodaBks.reduce((s, b) => s + (b.total_amount || 0), 0);

    const totalChanRev = (directRev + abRev + bcomRev + agodaRev) || 1;
    const directPct = Math.round((directRev / totalChanRev) * 100);
    const abPct = Math.round((abRev / totalChanRev) * 100);
    const bcomPct = Math.round((bcomRev / totalChanRev) * 100);
    const agodaPct = Math.round((agodaRev / totalChanRev) * 100);

    // Properties Leaderboard
    const ROOM_SLUG_MAP = {
      'GOM-101': 'redrose-palace', 'GOM-102': 'black-beauty',
      'GOM-201': 'the-dark-blue', 'GOM-202': 'the-brown',
      'GOM-301': 'the-light-green', 'GOM-401': 'the-nawabi-stay',
      'GOM-501': 'starlight-blue', 'GOM-302': 'the-unique',
      'VIL-104': 'the-green-house', 'VIL-103': 'the-pink-house',
      'VIL-105': 'the-yellow-house', 'VIL-106': 'green-forest',
      'VIL-108': 'pink-paradise', 'LUL-402': 'celebrity-garden',
      'VIL-101': 'gomti-grand-villa', 'VIL-102': 'royal-white-house',
      'VIL-107': 'the-velvet-house', 'LUL-101': 'the-luxe-haven'
    };

    const propRankingList = allFlatsRaw.map(fl => {
      const rId = fl.room_id;
      const rBks = allBookingsRaw.filter(b => b.room_id === rId && !b.is_cancelled);
      const rMonthBks = rBks.filter(b => {
        const ci = b.check_in || '';
        return ci >= periodStart && ci <= periodEnd;
      });
      const rRev = rMonthBks.reduce((s, b) => s + (b.total_amount || 0), 0);
      const rNights = rMonthBks.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out || b.check_in) - new Date(b.check_in)) / 86400000)), 0);
      const rOcc = Math.min(100, Math.round((rNights / periodDays) * 100));

      const propExps = realExpenses.filter(e => matchesRoom(e, rId) && e.entry_date >= periodStart && e.entry_date <= periodEnd);
      const propExpSum = propExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const rNet = propExpSum > 0 ? Math.max(0, rRev - propExpSum) : Math.round(rRev * 0.62);

      const rName = propLabel(fl.rooms) || fl.room_id || 'Unit';
      const slug = fl.rooms?.slug || ROOM_SLUG_MAP[rId] || '';
      const thumb = slug ? `assets/properties/${slug}/cover.jpg` : '';

      return { rId, rName, rRev, rOcc, rNet, thumb, unit: fl.rooms?.unit_no || fl.unit_no || '' };
    });

    window._hhPropRanking = propRankingList;
    window._hhSortBy = window._hhSortBy || 'revenue';

    function renderLeaderboardRows(list, sortBy = 'revenue') {
      const sorted = [...list].sort((a, b) => sortBy === 'revenue' ? (b.rRev - a.rRev) : (b.rNet - a.rNet));
      return sorted.map((p, idx) => {
        const isCurSelected = globalProp && matchesRoom(p, globalProp);
        return `
          <tr onclick="window.setAnalyticsPropertyFilter('${escapeHtml(p.rId)}')" style="cursor:pointer;background:${isCurSelected ? '#EFF6FF' : 'transparent'};transition:background 0.15s ease;" title="Click to filter analytics to ${escapeHtml(p.rName)}">
            <td class="hh-prop-cell-name">
              <div class="hh-prop-cell-inner" style="display:flex;align-items:center;gap:10px;min-width:0;max-width:210px;">
                ${p.thumb ? `<img src="${p.thumb}" alt="${escapeHtml(p.rName)}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;">` : `<div style="width:32px;height:32px;border-radius:8px;background:${isCurSelected ? '#BFDBFE' : '#F1F5F9'};color:#0F172A;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0;">${escapeHtml(p.unit || p.rId)}</div>`}
                <div style="min-width:0;flex:1;overflow:hidden;">
                  <div style="font-weight:700;color:#0F172A;font-size:12.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(p.rName)}">${escapeHtml(p.rName)}</div>
                  <div style="font-size:11px;color:#64748B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">
                    <span>${escapeHtml(p.unit || '')}</span>
                    ${isCurSelected ? `<span style="background:#2563EB;color:#ffffff;font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:4px;">FILTERED</span>` : ''}
                  </div>
                </div>
              </div>
            </td>
            <td style="font-weight:800;color:${sortBy === 'revenue' ? '#059669' : '#0F172A'};text-align:right;white-space:nowrap;padding:10px 12px;">₹${p.rRev.toLocaleString('en-IN')}</td>
            <td>
              <div class="hh-occ-bar-wrap" style="display:flex;align-items:center;gap:8px;">
                <div class="hh-occ-bar-track" style="flex:1;height:6px;background:#E2E8F0;border-radius:999px;overflow:hidden;">
                  <div class="hh-occ-bar-fill" style="width:${p.rOcc}%;height:100%;background:${p.rOcc >= 70 ? '#10B981' : (p.rOcc >= 45 ? '#F59E0B' : '#EF4444')};border-radius:999px;"></div>
                </div>
                <span style="font-weight:700;font-size:11.5px;color:#64748B;min-width:28px;">${p.rOcc}%</span>
              </div>
            </td>
            <td style="font-weight:800;color:${sortBy === 'profit' ? '#4F46E5' : '#0F172A'};text-align:right;white-space:nowrap;padding:10px 12px;">
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
                <span>₹${p.rNet.toLocaleString('en-IN')}</span>
                ${idx === 0 ? `<span style="background:#DCFCE7;color:#166534;font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;">#1 Top</span>` : (p.rOcc < 45 && p.rOcc > 0 ? `<span style="background:#FEE2E2;color:#991B1B;font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;">Occ -${50 - p.rOcc}%</span>` : '')}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    window.toggleHHSort = function (mode) {
      window._hhSortBy = mode;
      const btnRev = document.getElementById('btnHHSortRev');
      const btnProfit = document.getElementById('btnHHSortProfit');
      if (btnRev && btnProfit) {
        if (mode === 'revenue') {
          btnRev.classList.add('active');
          btnProfit.classList.remove('active');
        } else {
          btnProfit.classList.add('active');
          btnRev.classList.remove('active');
        }
      }

      const tbody = document.getElementById('hhLeaderboardBody');
      if (tbody && window._hhPropRanking) {
        tbody.innerHTML = renderLeaderboardRows(window._hhPropRanking, mode);
      }

      if (typeof window.updatePropBarChart === 'function') {
        window.updatePropBarChart(mode);
      }
    };

    window.setAnalyticsPropertyFilter = function (propId) {
      const cleanId = (propId || '').trim();
      if (typeof window.handleGlobalPropertyFilterChange === 'function') {
        window.handleGlobalPropertyFilterChange(cleanId);
      } else {
        try { localStorage.setItem('uhhs_global_prop_filter', cleanId); } catch(e){}
        if (typeof window.renderExecutiveDashboard === 'function') {
          window.renderExecutiveDashboard();
        }
      }
    };

    window.setDashboardPeriod = function (period) {
      window._dashPeriod = period;
      if (period !== 'custom') window._dashCustomMonth = '';
      if (period !== 'custom_range') {
        window._dashCustomRangeStart = '';
        window._dashCustomRangeEnd = '';
      }
      if (typeof window.renderExecutiveDashboard === 'function') {
        window.renderExecutiveDashboard();
      }
    };

    window.setDashboardCustomMonth = function (monthVal) {
      if (!monthVal) return;
      window._dashPeriod = 'custom';
      window._dashCustomMonth = monthVal;
      window._dashCustomRangeStart = '';
      window._dashCustomRangeEnd = '';
      if (typeof window.renderExecutiveDashboard === 'function') {
        window.renderExecutiveDashboard();
      }
    };

    window.toggleDashboardCustomDateRangeModal = function (forceOpen) {
      const drawer = document.getElementById('dashCustomRangeDrawer');
      if (!drawer) return;
      const isHidden = drawer.style.display === 'none' || !drawer.style.display;
      const nextState = forceOpen !== undefined ? forceOpen : isHidden;
      drawer.style.display = nextState ? 'flex' : 'none';
    };

    window.applyDashboardCustomDateRange = function () {
      const sInput = document.getElementById('dashRangeStartInput');
      const eInput = document.getElementById('dashRangeEndInput');
      if (!sInput || !eInput || !sInput.value || !eInput.value) {
        alert('Please choose both Start Date and End Date.');
        return;
      }
      if (sInput.value > eInput.value) {
        alert('Start Date cannot be after End Date.');
        return;
      }
      window._dashPeriod = 'custom_range';
      window._dashCustomRangeStart = sInput.value;
      window._dashCustomRangeEnd = eInput.value;
      window._dashCustomMonth = '';
      if (typeof window.renderExecutiveDashboard === 'function') {
        window.renderExecutiveDashboard();
      }
    };

    // Filter Property display label & select options
    let selectedPropDisplay = `All properties · ${allFlatsRaw.length}`;
    if (globalProp) {
      const matched = allFlatsRaw.find(f => matchesRoom(f, globalProp));
      if (matched) {
        const un = matched.rooms?.unit_no || matched.unit_no || '';
        const nn = matched.rooms?.nickname || '';
        selectedPropDisplay = un ? `${un} – ${nn || matched.room_id}` : (nn || matched.room_id);
      } else {
        selectedPropDisplay = globalProp;
      }
    }

    const flatsSkyline = allFlatsRaw.filter(f => {
      const u = (f.rooms?.unit_no || f.unit_no || '').toLowerCase();
      const r = (f.room_id || '').toLowerCase();
      return r.includes('gom') || u.includes('flat') || /^\d{3}$/.test(u);
    });
    const villasAndOthers = allFlatsRaw.filter(f => !flatsSkyline.includes(f));

    function formatPropOpt(f) {
      const pid = f.room_id;
      const un = f.rooms?.unit_no || f.unit_no || '';
      const nn = f.rooms?.nickname || '';
      const label = un ? `${un} – ${nn || pid}` : (nn || pid);
      const isSel = globalProp && matchesRoom(f, globalProp);
      return `<option value="${escapeHtml(pid)}" ${isSel ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }

    const sortedByRev = [...propRankingList].sort((a, b) => b.rRev - a.rRev);
    const sortedByOcc = [...propRankingList].sort((a, b) => a.rOcc - b.rOcc);
    const topEarner = sortedByRev[0] || { rName: 'The Tehzeeb Nest', rRev: 85200, rOcc: 86, rId: 'Flat 402' };
    const topOpportunity = sortedByOcc.find(p => p.rOcc > 0) || sortedByOcc[0] || { rName: 'Gomti Grand Villa', rRev: 42000, rOcc: 38, rId: 'VIL-101' };

    window.downloadHomeyhutsExcel = function () {
      const list = window._hhPropRanking || [];
      let csv = '\uFEFFProperty,Unit,Net Revenue,Occupancy %,Net Operating Income\n';
      list.forEach(p => {
        csv += `"${p.rName}","${p.unit}",${p.rRev},${p.rOcc}%,${p.rNet}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TUHH_Analytics_Report_${periodMode}_${today}.csv`;
      link.click();
    };
    window.downloadTuhhAnalyticsExcel = window.downloadHomeyhutsExcel;

    renderShell(`
      <div style="max-width:1440px;margin:0 auto;padding:6px 4px 30px;">
        <!-- 💎 HOMEYHUTS LUXURY MAC WINDOW MOCKUP -->
        <div class="hh-mac-window">
          <!-- macOS Titlebar -->
          <div class="hh-mac-titlebar">
            <div class="hh-mac-dots">
              <span class="hh-mac-dot red"></span>
              <span class="hh-mac-dot yellow"></span>
              <span class="hh-mac-dot green"></span>
            </div>
            <div class="hh-mac-title" style="display:flex;align-items:center;gap:7px;">
              <img src="assets/logo-emblem.png?v=393" alt="TUHH" style="width:17px;height:17px;border-radius:4px;object-fit:cover;" onerror="this.outerHTML='🏠'" />
              <span>The Unique Haven Homes · Analytics</span>
            </div>
            <div class="hh-mac-live-badge">
              <span class="hh-mac-live-dot"></span> Live data
            </div>
          </div>

          <!-- Window Body: Full-Width Luxury Analytics Suite -->
          <div class="hh-window-body">
            <!-- TOP FILTER BAR -->
              <div class="hh-analytics-filter-bar" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
                <div class="hh-analytics-filters-left" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  
                  <!-- Dynamic Property Selector Pill -->
                  <div class="hh-analytics-pill-select ${globalProp ? 'active-filter' : ''}" style="position:relative;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:${globalProp ? '#EFF6FF' : '#F8FAFC'};border:1px solid ${globalProp ? '#3B82F6' : '#CBD5E1'};padding:6px 14px;border-radius:999px;" title="Filter analytics by specific property or view all">
                    <span style="color:${globalProp ? '#2563EB' : '#0284C7'};font-weight:900;">@</span>
                    <span style="font-weight:700;color:${globalProp ? '#1E40AF' : '#0F172A'};max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(selectedPropDisplay)}</span>
                    <i class="ti ti-chevron-down" style="font-size:12px;color:#64748B;"></i>
                    <select onchange="window.setAnalyticsPropertyFilter(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:3;">
                      <option value="" ${!globalProp ? 'selected' : ''}>All Properties (${allFlatsRaw.length})</option>
                      <optgroup label="🏢 Blossom Skyline Flats">
                        ${flatsSkyline.map(formatPropOpt).join('')}
                      </optgroup>
                      <optgroup label="🏡 Luxury Villas & Estates">
                        ${villasAndOthers.map(formatPropOpt).join('')}
                      </optgroup>
                    </select>
                  </div>

                  ${globalProp ? `
                    <button type="button" onclick="window.setAnalyticsPropertyFilter('')" title="Reset to All Properties" style="background:#FEE2E2;border:1px solid #FECACA;color:#991B1B;border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s ease;">
                      ✕ All Properties
                    </button>
                  ` : ''}

                  <!-- 🚀 FAST PERIOD SWITCHER PILLS (MTD, This Month, Last Month, QTD, YTD, 2026 Year) -->
                  <div style="display:inline-flex;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:999px;padding:3px;gap:2px;flex-wrap:wrap;">
                    <button type="button" onclick="window.setDashboardPeriod('mtd')" style="background:${periodMode === 'mtd' ? '#0F172A' : 'transparent'};color:${periodMode === 'mtd' ? '#FFFFFF' : '#475569'};border:none;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:${periodMode === 'mtd' ? '800' : '700'};cursor:pointer;transition:all 0.15s ease;" title="Month to Date (1 Nov to Today)">
                      ⚡ MTD
                    </button>
                    <button type="button" onclick="window.setDashboardPeriod('this_month')" style="background:${periodMode === 'this_month' ? '#0F172A' : 'transparent'};color:${periodMode === 'this_month' ? '#FFFFFF' : '#475569'};border:none;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:${periodMode === 'this_month' ? '800' : '700'};cursor:pointer;transition:all 0.15s ease;" title="Full Current Month (1 - 30 Nov 2026)">
                      This Month
                    </button>
                    <button type="button" onclick="window.setDashboardPeriod('last_month')" style="background:${periodMode === 'last_month' ? '#0F172A' : 'transparent'};color:${periodMode === 'last_month' ? '#FFFFFF' : '#475569'};border:none;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:${periodMode === 'last_month' ? '800' : '700'};cursor:pointer;transition:all 0.15s ease;" title="Last Month (October 2026)">
                      Last Month
                    </button>
                    <button type="button" onclick="window.setDashboardPeriod('qtd')" style="background:${periodMode === 'qtd' ? '#0F172A' : 'transparent'};color:${periodMode === 'qtd' ? '#FFFFFF' : '#475569'};border:none;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:${periodMode === 'qtd' ? '800' : '700'};cursor:pointer;transition:all 0.15s ease;" title="Quarter to Date (Q4: 1 Oct to Today)">
                      QTD
                    </button>
                    <button type="button" onclick="window.setDashboardPeriod('ytd')" style="background:${periodMode === 'ytd' ? '#0F172A' : 'transparent'};color:${periodMode === 'ytd' ? '#FFFFFF' : '#475569'};border:none;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:${periodMode === 'ytd' ? '800' : '700'};cursor:pointer;transition:all 0.15s ease;" title="Year to Date (1 Jan to Today)">
                      YTD
                    </button>
                    <button type="button" onclick="window.setDashboardPeriod('this_year')" style="background:${periodMode === 'this_year' ? '#0F172A' : 'transparent'};color:${periodMode === 'this_year' ? '#FFFFFF' : '#475569'};border:none;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:${periodMode === 'this_year' ? '800' : '700'};cursor:pointer;transition:all 0.15s ease;" title="Full Year 2026">
                      2026 Year
                    </button>
                  </div>

                  <!-- 📅 SPECIFIC MONTH SELECTOR DROPDOWN -->
                  <div class="hh-analytics-pill-select" style="position:relative;cursor:pointer;background:#F8FAFC;border:1px solid #CBD5E1;padding:6px 14px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;" title="Pick any specific month in 2026">
                    <i class="ti ti-calendar" style="color:#0284C7;font-size:13px;"></i>
                    <span style="font-weight:800;color:#0F172A;font-size:12px;">${escapeHtml(periodDisplayLabel)}</span>
                    <i class="ti ti-chevron-down" style="font-size:11px;color:#64748B;"></i>
                    <select onchange="window.setDashboardCustomMonth(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:3;">
                      <option value="" disabled>Select Month...</option>
                      <option value="2026-12" ${window._dashCustomMonth === '2026-12' ? 'selected' : ''}>December 2026</option>
                      <option value="2026-11" ${(!window._dashCustomMonth || window._dashCustomMonth === '2026-11') && periodMode !== 'last_month' ? 'selected' : ''}>November 2026 (Active)</option>
                      <option value="2026-10" ${window._dashCustomMonth === '2026-10' || periodMode === 'last_month' ? 'selected' : ''}>October 2026</option>
                      <option value="2026-09" ${window._dashCustomMonth === '2026-09' ? 'selected' : ''}>September 2026</option>
                      <option value="2026-08" ${window._dashCustomMonth === '2026-08' ? 'selected' : ''}>August 2026</option>
                      <option value="2026-07" ${window._dashCustomMonth === '2026-07' ? 'selected' : ''}>July 2026</option>
                      <option value="2026-06" ${window._dashCustomMonth === '2026-06' ? 'selected' : ''}>June 2026</option>
                      <option value="2026-05" ${window._dashCustomMonth === '2026-05' ? 'selected' : ''}>May 2026</option>
                      <option value="2026-04" ${window._dashCustomMonth === '2026-04' ? 'selected' : ''}>April 2026</option>
                      <option value="2026-03" ${window._dashCustomMonth === '2026-03' ? 'selected' : ''}>March 2026</option>
                      <option value="2026-02" ${window._dashCustomMonth === '2026-02' ? 'selected' : ''}>February 2026</option>
                      <option value="2026-01" ${window._dashCustomMonth === '2026-01' ? 'selected' : ''}>January 2026</option>
                    </select>
                  </div>

                  <!-- 📆 CUSTOM DATE RANGE TOGGLE BUTTON -->
                  <button type="button" onclick="window.toggleDashboardCustomDateRangeModal()" style="background:${periodMode === 'custom_range' ? '#EFF6FF' : '#FFFFFF'};border:1px solid ${periodMode === 'custom_range' ? '#3B82F6' : '#CBD5E1'};color:${periodMode === 'custom_range' ? '#1E40AF' : '#0F172A'};border-radius:999px;padding:6px 14px;font-size:11.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s ease;">
                    <i class="ti ti-adjustments-horizontal"></i>
                    <span>Custom Range</span>
                  </button>

                  <div style="background:#F1F5F9;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;color:#64748B;">
                    vs previous period
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                  <button type="button" class="hh-analytics-btn-excel" onclick="downloadTuhhAnalyticsExcel()" title="Export Analytics to Excel CSV">
                    <span>⬇</span> <span>Excel</span>
                  </button>
                  <button type="button" class="dash-pill-btn" onclick="renderExecutiveDashboard()" title="Refresh live data" style="padding:6px 12px;font-size:12px;background:#F8FAFC;border:1px solid #CBD5E1;border-radius:999px;cursor:pointer;">
                    <i class="ti ti-refresh"></i>
                  </button>
                </div>
              </div>

              <!-- 📅 CUSTOM DATE RANGE INLINE DRAWER -->
              <div id="dashCustomRangeDrawer" style="display:${periodMode === 'custom_range' ? 'flex' : 'none'};align-items:center;gap:12px;margin-bottom:18px;background:#F8FAFC;border:1.5px solid #93C5FD;border-radius:12px;padding:12px 18px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(59,130,246,0.06);">
                <div style="font-size:12px;font-weight:800;color:#1E3A8A;display:flex;align-items:center;gap:6px;">
                  <i class="ti ti-calendar-event"></i> Filter by Exact Dates:
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:12px;font-weight:700;color:#475569;">From:</span>
                  <input type="date" id="dashRangeStartInput" value="${periodStart}" style="border:1px solid #CBD5E1;border-radius:6px;padding:5px 8px;font-size:12px;font-weight:700;color:#0F172A;" />
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:12px;font-weight:700;color:#475569;">To:</span>
                  <input type="date" id="dashRangeEndInput" value="${periodEnd}" style="border:1px solid #CBD5E1;border-radius:6px;padding:5px 8px;font-size:12px;font-weight:700;color:#0F172A;" />
                </div>
                <button type="button" onclick="window.applyDashboardCustomDateRange()" style="background:#2563EB;color:#FFFFFF;border:none;border-radius:6px;padding:6px 16px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                  <span>Apply Range</span> <span>→</span>
                </button>
                <button type="button" onclick="window.toggleDashboardCustomDateRangeModal(false)" style="background:transparent;border:none;color:#64748B;font-size:12px;font-weight:700;cursor:pointer;">
                  ✕ Cancel
                </button>
              </div>

              <!-- 5 KPI SPARKLINE RIBBON WITH CLEAR DESCRIPTIONS -->
              <div class="hh-kpi-ribbon-5">
                <!-- KPI 1: Net Revenue -->
                <div class="hh-kpi-card-v2" onclick="navigate('claims')" style="cursor:pointer;" title="Gross booked guest tariff across Direct & OTA channels (after platform cancellations)">
                  <div>
                    <div class="hh-kpi-header" style="margin-bottom:2px;font-weight:800;color:#0F172A;">Net revenue</div>
                    <div style="font-size:11px;color:#64748B;font-weight:600;margin-bottom:8px;line-height:1.2;">Total confirmed booking revenue</div>
                  </div>
                  <div class="hh-kpi-val-row">
                    <div class="hh-kpi-main-val">₹${monthRevenue.toLocaleString('en-IN')}</div>
                    ${formatDeltaTag(revChangePct)}
                  </div>
                  ${sparklineSvg(parseFloat(revChangePct) >= 0)}
                </div>

                <!-- KPI 2: Net Operating Income -->
                <div class="hh-kpi-card-v2" title="Net Operating Income (NOI = Net Revenue minus actual operational & maintenance expenses)">
                  <div>
                    <div class="hh-kpi-header" style="margin-bottom:2px;font-weight:800;color:#0F172A;">Net op. income</div>
                    <div style="font-size:11px;color:#64748B;font-weight:600;margin-bottom:8px;line-height:1.2;">Revenue minus operating costs (NOI)</div>
                  </div>
                  <div class="hh-kpi-val-row">
                    <div class="hh-kpi-main-val">₹${hhNetOpIncome.toLocaleString('en-IN')}</div>
                    ${formatDeltaTag(netChangePct)}
                  </div>
                  ${sparklineSvg(parseFloat(netChangePct) >= 0)}
                </div>

                <!-- KPI 3: Occupancy -->
                <div class="hh-kpi-card-v2" onclick="navigate('flats')" style="cursor:pointer;" title="Total occupied room-nights ÷ Total available fleet room-nights (${totalBookedNights} / ${totalAvailRoomNights} nights)">
                  <div>
                    <div class="hh-kpi-header" style="margin-bottom:2px;font-weight:800;color:#0F172A;">Occupancy</div>
                    <div style="font-size:11px;color:#64748B;font-weight:600;margin-bottom:8px;line-height:1.2;">Booked nights ÷ total capacity nights</div>
                  </div>
                  <div class="hh-kpi-val-row">
                    <div class="hh-kpi-main-val">${periodOccupancyPct > 0 ? periodOccupancyPct : occupancyPct}%</div>
                    ${formatDeltaTag(occDiffPts, true)}
                  </div>
                  ${sparklineSvg(parseFloat(occDiffPts) >= 0, '#0284C7')}
                </div>

                <!-- KPI 4: ADR -->
                <div class="hh-kpi-card-v2" title="Average Daily Rate (Average room revenue earned per occupied night = Net Revenue ÷ Booked Nights)">
                  <div>
                    <div class="hh-kpi-header" style="margin-bottom:2px;font-weight:800;color:#0F172A;">ADR</div>
                    <div style="font-size:11px;color:#64748B;font-weight:600;margin-bottom:8px;line-height:1.2;">Avg daily tariff per booked room-night</div>
                  </div>
                  <div class="hh-kpi-val-row">
                    <div class="hh-kpi-main-val">₹${hhAdr.toLocaleString('en-IN')}</div>
                    ${formatDeltaTag(adrChangePct)}
                  </div>
                  ${sparklineSvg(parseFloat(adrChangePct) >= 0)}
                </div>

                <!-- KPI 5: RevPAR -->
                <div class="hh-kpi-card-v2" title="Revenue Per Available Room night across all 19 units = Net Revenue ÷ Available Capacity Nights (or ADR × Occupancy)">
                  <div>
                    <div class="hh-kpi-header" style="margin-bottom:2px;font-weight:800;color:#0F172A;">RevPAR</div>
                    <div style="font-size:11px;color:#64748B;font-weight:600;margin-bottom:8px;line-height:1.2;">Revenue per available fleet room night</div>
                  </div>
                  <div class="hh-kpi-val-row">
                    <div class="hh-kpi-main-val">₹${hhRevPar.toLocaleString('en-IN')}</div>
                    ${formatDeltaTag(revParChangePct)}
                  </div>
                  ${sparklineSvg(parseFloat(revParChangePct) >= 0)}
                </div>
              </div>

              <!-- 🌟 DUAL-CHANNEL (OFFLINE DIRECT + ONLINE AIRBNB) MONTHLY EARNINGS & PERFORMANCE MATRIX -->
              <div class="hh-chart-card" style="margin-bottom:20px;padding:20px 24px;">
                <div class="hh-chart-card-head" style="margin-bottom:14px;flex-wrap:wrap;gap:12px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span style="font-size:18px;">📈</span>
                      <h3 class="hh-chart-title" style="font-size:16px;">Performance · Monthly View (2026)</h3>
                      <span id="perfChanActiveBadge" style="background:#ECFDF5;color:#047857;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;border:1px solid #A7F3D0;">Dual-Channel: Online &amp; Offline Synchronized</span>
                    </div>
                    <div class="hh-chart-sub">Unified 12-month analytics: Direct / Walk-in bookings + Airbnb &amp; OTA payouts</div>
                  </div>

                  <!-- Channel Filter Switcher Pills & Matrix Toggle -->
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <div style="display:inline-flex;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:999px;padding:3px;gap:3px;">
                      <button type="button" id="btnPerfChanAll" onclick="window.setPerformanceChannel('all')" style="background:#0F172A;color:#FFFFFF;border:none;padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:800;cursor:pointer;transition:all 0.15s ease;">
                        🌟 All (Combined)
                      </button>
                      <button type="button" id="btnPerfChanOffline" onclick="window.setPerformanceChannel('offline')" style="background:transparent;color:#64748B;border:none;padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;transition:all 0.15s ease;">
                        🟢 Offline (Direct)
                      </button>
                      <button type="button" id="btnPerfChanOnline" onclick="window.setPerformanceChannel('online')" style="background:transparent;color:#64748B;border:none;padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;transition:all 0.15s ease;">
                        🔴 Online (Airbnb)
                      </button>
                    </div>

                    <button type="button" id="btnToggleMatrixTable" onclick="window.toggleMonthlyMatrixTable()" style="background:#FFFFFF;border:1px solid #CBD5E1;color:#0F172A;border-radius:999px;padding:5px 14px;font-size:11.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.04);transition:all 0.15s ease;">
                      <span>📋</span> <span>Monthly Matrix Breakdown</span>
                    </button>
                  </div>
                </div>

                <!-- Custom Interactive Legend -->
                <div id="perfLegendContainer" style="display:flex;align-items:center;justify-content:flex-end;gap:16px;font-size:12px;font-weight:700;flex-wrap:wrap;margin-bottom:10px;">
                  <span id="legendItemOffline" style="display:inline-flex;align-items:center;gap:6px;color:#059669;">
                    <span style="width:11px;height:11px;border-radius:3px;background:#10B981;"></span> Offline Direct
                  </span>
                  <span id="legendItemOnlinePaid" style="display:inline-flex;align-items:center;gap:6px;color:#E11D48;">
                    <span style="width:11px;height:11px;border-radius:3px;background:#E11D48;"></span> Online Paid
                  </span>
                  <span id="legendItemOnlineUpcoming" style="display:inline-flex;align-items:center;gap:6px;color:#DB2777;">
                    <span style="width:11px;height:11px;border-radius:3px;background:#FCE7F3;border:1.5px solid #F472B6;"></span> Online Upcoming
                  </span>
                </div>

                <!-- Bar Chart Canvas -->
                <div style="position:relative;height:240px;width:100%;">
                  <canvas id="dashAirbnbPerformanceChart"></canvas>
                </div>

                <!-- Dynamic Highlight Capsule (Adapts to All / Offline / Online) -->
                <div id="perfHighlightCapsule" style="margin-top:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
                  <!-- Dynamically rendered by window.setPerformanceChannel -->
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Current Month: November 2026 (Portfolio Combined)</div>
                    <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
                      <span style="font-size:22px;font-weight:900;color:#0F172A;">₹7,55,325.34</span>
                      <span style="font-size:12px;color:#64748B;font-weight:700;">Total (INR)</span>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
                    <div>
                      <div style="font-size:11.5px;color:#059669;font-weight:800;">🟢 Offline Direct</div>
                      <div style="font-size:16px;font-weight:900;color:#0F172A;">₹5,27,300.00 <span style="font-size:11px;color:#059669;font-weight:700;">(70%)</span></div>
                    </div>
                    <div>
                      <div style="font-size:11.5px;color:#E11D48;font-weight:800;">🔴 Online Airbnb</div>
                      <div style="font-size:16px;font-weight:900;color:#0F172A;">₹2,28,025.34 <span style="font-size:11px;color:#E11D48;font-weight:700;">(30%)</span></div>
                    </div>
                    <div>
                      <div style="font-size:11.5px;color:#4F46E5;font-weight:800;">💼 Net Op. Income</div>
                      <div style="font-size:16px;font-weight:900;color:#0F172A;">₹3,86,822.84</div>
                    </div>
                    <button type="button" onclick="navigate('ca-audit')" style="background:#0F172A;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity 0.15s ease;">
                      <span>CA &amp; Tax Audit</span> <span>→</span>
                    </button>
                  </div>
                </div>

                <!-- Collapsible 12-Month Matrix Breakdown Table Container -->
                <div id="perfMonthlyMatrixWrap" style="display:none;margin-top:16px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                  <!-- Injected by initExecutiveDashboardCharts -->
                </div>
              </div>

              <!-- MIDDLE ROW: CHARTS (Revenue vs Expenses/Profit + Channel Breakdown) -->
              <div class="hh-charts-row">
                <!-- Left: Revenue, Profit & Expenses Area Chart -->
                <div class="hh-chart-card">
                  <div class="hh-chart-card-head">
                    <div>
                      <h3 class="hh-chart-title">Revenue, Profit &amp; Expenses</h3>
                      <div class="hh-chart-sub">6-Month Financial Trajectory (Area &amp; Line Trends)</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;font-size:11.5px;font-weight:700;flex-wrap:wrap;">
                      <span style="display:inline-flex;align-items:center;gap:4px;color:#10B981;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#10B981;"></span> Net revenue
                      </span>
                      <span style="display:inline-flex;align-items:center;gap:4px;color:#6366F1;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#6366F1;"></span> Net profit
                      </span>
                      <span style="display:inline-flex;align-items:center;gap:4px;color:#F43F5E;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#F43F5E;"></span> Expenses
                      </span>
                    </div>
                  </div>
                  <div style="position:relative;height:210px;width:100%;">
                    <canvas id="dashRevenueExpenseChart"></canvas>
                  </div>
                </div>

                <!-- Right: Net Revenue by Channel (Donut Chart + Progress Bars) -->
                <div class="hh-chart-card">
                  <div class="hh-chart-card-head">
                    <div>
                      <h3 class="hh-chart-title">Net revenue by channel</h3>
                      <div class="hh-chart-sub">Direct vs OTAs Distribution (After Commission)</div>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;gap:18px;margin-top:6px;flex-wrap:wrap;">
                    <!-- Donut Chart -->
                    <div style="position:relative;width:115px;height:115px;flex-shrink:0;margin:0 auto;">
                      <canvas id="dashChannelDonutChart"></canvas>
                      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;">
                        <span style="font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Direct</span>
                        <span style="font-size:14px;font-weight:900;color:#10B981;">${directPct}%</span>
                      </div>
                    </div>

                    <!-- Channel Details List -->
                    <div style="flex:1;min-width:180px;">
                      <!-- Direct -->
                      <div class="hh-channel-row" style="margin-bottom:10px;">
                        <div class="hh-channel-info">
                          <span class="hh-channel-name"><span style="width:8px;height:8px;border-radius:50%;background:#10B981;display:inline-block;"></span> Direct</span>
                          <span class="hh-channel-val">₹${directRev.toLocaleString('en-IN')} <span style="font-size:11px;color:#64748B;font-weight:600;">(${directPct}%)</span></span>
                        </div>
                        <div class="hh-channel-bar-track">
                          <div class="hh-channel-bar-fill" style="width:${directPct}%;background:#10B981;"></div>
                        </div>
                      </div>

                      <!-- Airbnb -->
                      <div class="hh-channel-row" style="margin-bottom:10px;">
                        <div class="hh-channel-info">
                          <span class="hh-channel-name"><span style="width:8px;height:8px;border-radius:50%;background:#FF385C;display:inline-block;"></span> Airbnb</span>
                          <span class="hh-channel-val">₹${abRev.toLocaleString('en-IN')} <span style="font-size:11px;color:#64748B;font-weight:600;">(${abPct}%)</span></span>
                        </div>
                        <div class="hh-channel-bar-track">
                          <div class="hh-channel-bar-fill" style="width:${abPct}%;background:#FF385C;"></div>
                        </div>
                      </div>

                      <!-- Booking.com -->
                      <div class="hh-channel-row" style="margin-bottom:10px;">
                        <div class="hh-channel-info">
                          <span class="hh-channel-name"><span style="width:8px;height:8px;border-radius:50%;background:#003580;display:inline-block;"></span> Booking.com</span>
                          <span class="hh-channel-val">₹${bcomRev.toLocaleString('en-IN')} <span style="font-size:11px;color:#64748B;font-weight:600;">(${bcomPct}%)</span></span>
                        </div>
                        <div class="hh-channel-bar-track">
                          <div class="hh-channel-bar-fill" style="width:${bcomPct}%;background:#003580;"></div>
                        </div>
                      </div>

                      <!-- Agoda -->
                      <div class="hh-channel-row" style="margin-bottom:0;">
                        <div class="hh-channel-info">
                          <span class="hh-channel-name"><span style="width:8px;height:8px;border-radius:50%;background:#7C3AED;display:inline-block;"></span> Agoda / OTAs</span>
                          <span class="hh-channel-val">₹${agodaRev.toLocaleString('en-IN')} <span style="font-size:11px;color:#64748B;font-weight:600;">(${agodaPct}%)</span></span>
                        </div>
                        <div class="hh-channel-bar-track">
                          <div class="hh-channel-bar-fill" style="width:${agodaPct}%;background:#7C3AED;"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- BOTTOM ROW: PROPERTIES LEADERBOARD & COMPARATIVE BAR CHART -->
              <div class="hh-leaderboard-card">
                <div class="hh-leaderboard-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                  <div>
                    <h3 class="hh-chart-title">Properties Performance</h3>
                    <div class="hh-chart-sub">Portfolio comparison by Revenue, Profit &amp; Occupancy</div>
                  </div>
                  <div class="hh-cal-toggle-group">
                    <button type="button" id="btnHHSortRev" class="hh-cal-toggle-btn ${window._hhSortBy !== 'profit' ? 'active' : ''}" onclick="toggleHHSort('revenue')">By revenue</button>
                    <button type="button" id="btnHHSortProfit" class="hh-cal-toggle-btn ${window._hhSortBy === 'profit' ? 'active' : ''}" onclick="toggleHHSort('profit')">By profit</button>
                  </div>
                </div>

                <!-- Horizontal Bar Chart: Top Properties Comparison -->
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px 10px;margin-bottom:18px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                    <span style="font-size:12.5px;font-weight:800;color:#0F172A;" id="propBarChartTitle">📊 Top Properties by Net Revenue</span>
                    <span style="font-size:11px;color:#64748B;font-weight:600;">Click any bar or table row to filter unit</span>
                  </div>
                  <div style="position:relative;height:200px;width:100%;">
                    <canvas id="dashPropBarChart"></canvas>
                  </div>
                </div>

                <!-- Responsive Table -->
                <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;">
                  <table class="hh-leaderboard-table" style="width:100%;min-width:480px;border-collapse:collapse;">
                    <thead>
                      <tr>
                        <th style="min-width:170px;text-align:left;">PROPERTY</th>
                        <th style="min-width:110px;text-align:right;padding-right:12px;">NET REVENUE</th>
                        <th style="min-width:130px;">OCCUPANCY</th>
                        <th style="min-width:110px;text-align:right;">NET OP. INCOME</th>
                      </tr>
                    </thead>
                    <tbody id="hhLeaderboardBody">
                      ${renderLeaderboardRows(propRankingList, window._hhSortBy || 'revenue')}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        </div>
      </div>
    `, 'analytics');

    setTimeout(() => {
      if (typeof window.initExecutiveDashboardCharts === 'function') {
        window.initExecutiveDashboardCharts({
          allBookings: allBookingsRaw,
          filteredBookings: allBookings,
          propPayments,
          propRankingList,
          realExpenses,
          directRev,
          abRev,
          bcomRev,
          agodaRev,
          periodMode,
          selectedMonth: (periodMode === 'custom' && window._dashCustomMonth) ? window._dashCustomMonth : today.slice(0, 7),
          globalProp,
          bookedNow: bookedNow.length,
          freeClean: freeClean.length,
          dirty: dirty.length,
          maintUnits: maintUnits.length
        });
      }
    }, 60);

  } catch (err) {
    console.error("❌ CRITICAL ERROR in renderExecutiveDashboard:", err);
    renderShell(`
      <div class="card" style="max-width:860px;margin:40px auto;padding:36px;text-align:center;border-radius:20px;border:1px solid #FECACA;background:#FFF5F5;">
        <div style="font-size:44px;margin-bottom:14px;">⚠️</div>
        <h2 style="color:#991B1B;font-size:20px;font-weight:800;margin-bottom:8px;">Executive Dashboard Issue</h2>
        <p style="color:#7F1D1D;font-size:13.5px;margin-bottom:20px;">${escapeHtml(err?.message || String(err))}</p>
        <button type="button" style="background:#0F172A;color:#fff;border:none;padding:10px 24px;border-radius:999px;font-weight:800;cursor:pointer;" onclick="renderExecutiveDashboard()">🔄 Retry</button>
      </div>
    `, 'analytics');
  }
};

window.renderFullDashboardAnalytics = window.renderExecutiveDashboard;
window.renderAnalytics = window.renderExecutiveDashboard;


// ============ CHECKIN MANAGER VIEW ============
async function renderCheckinManagerView() {
  renderShell(`<div class="loading">Loading check-in manager dashboard...</div>`, 'dashboard');

  const today = new Date().toISOString().slice(0, 10);
  const day7 = dateAdd(today, 7);

  const [g, f] = await Promise.all([
    sb.from("guest_register").select("*, rooms(unit_no, nickname, checkin_manager, caretaker_phone)"),
    sb.from("flats_status").select("room_id, status, cleaning_status, rooms(unit_no, nickname)")
  ]);

  const allBookings = g.data || [];
  const allFlats = f.data || [];

  const checkins = allBookings.filter(x => x.check_in === today);
  const checkouts = allBookings.filter(x => x.check_out === today);
  const upcoming = allBookings.filter(b => b.check_in > today && b.check_in <= day7)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  const activeNow = allBookings.filter(b => b.check_in <= today && b.check_out > today);
  const bookedNow = allFlats.filter(x => x.status === 'Booked');
  const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty');

  const bName = b => `${propLabel(b.rooms) || b.room_id}`;
  const fName = fl => `${propLabel(fl.rooms) || fl.room_id}`;

  renderShell(`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="font-size:22px;margin:0;">👨‍💼 Check-in Manager Dashboard</h1>
          <div class="sub" style="margin-top:2px;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button class="btn-sm" onclick="renderCheckinManagerView()">🔄 Refresh</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${checkins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${checkins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
            <small>📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2:00 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${checkouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${checkouts.map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11:00 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming.length}</div>
        <div class="stat-label">📅 Next 7 Days</div>
        ${upcoming.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bName(x)} (${x.check_in})</div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedNow.length}/${allFlats.length}</div>
        <div class="stat-label">🛏️ Occupied Flats</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Needs Cleaning</div>
        ${dirty.map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Currently Staying</div>
      </div>
    </div>

    ${activeNow.length ? `
      <div class="card">
        <div class="section-title">🟢 Currently Staying</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Phone</th><th>In</th><th>Out</th><th>Vehicle</th></tr></thead>
          <tbody>${activeNow.map(b => `<tr>
            <td><strong>${b.guest_name || '-'}</strong></td>
            <td>${propLabel(b.rooms) || b.room_id}</td>
            <td>${b.phone || '-'}</td>
            <td>${b.check_in || '-'}</td>
            <td>${b.check_out || '-'}</td>
            <td>${b.has_vehicle ? `🚗 ${b.vehicle_name || ''} ${b.vehicle_number || ''}` : '-'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>
    ` : ''}
  `, 'dashboard');
}

// ============ NEW CHECKIN MANAGER VIEW (Property Filtered) ============
async function renderCheckinManagerViewNew() {
  renderShell(`<div class="loading">Loading your properties...</div>`, 'dashboard');

  const today = new Date().toISOString().slice(0, 10);
  const day7 = dateAdd(today, 7);

  // Get employee's assigned properties
  const { data: emp } = await sb.from('employees')
    .select('assigned_rooms, name')
    .eq('emp_id', SESSION.empId)
    .single();

  if (!emp) {
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️ Setup Incomplete</h1><div class="error">Employee record not linked. Contact admin.</div><button onclick="logout()">Logout</button></div></div>`;
    return;
  }

  const myRoomIds = (emp.assigned_rooms || '').split(',').map(r => r.trim()).filter(Boolean);

  if (myRoomIds.length === 0) {
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️ No Properties</h1><div class="error">No properties assigned to ${emp.name}. Contact admin.</div><button onclick="logout()">Logout</button></div></div>`;
    return;
  }

  const [g, f] = await Promise.all([
    sb.from("guest_register")
      .select("*, rooms(unit_no, nickname, checkin_manager, caretaker_phone)")
      .in('room_id', myRoomIds),
    sb.from("flats_status")
      .select("room_id, status, cleaning_status, rooms(unit_no, nickname)")
      .in('room_id', myRoomIds)
  ]);

  const allBookings = g.data || [];
  const allFlats = f.data || [];

  const checkins = allBookings.filter(x => x.check_in === today);
  const checkouts = allBookings.filter(x => x.check_out === today);
  const upcoming = allBookings.filter(b => b.check_in > today && b.check_in <= day7)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  const activeNow = allBookings.filter(b => b.check_in <= today && b.check_out > today);
  const bookedNow = allFlats.filter(x => x.status === 'Booked');
  const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty');

  const bName = b => `${propLabel(b.rooms) || b.room_id}`;
  const fName = fl => `${propLabel(fl.rooms) || fl.room_id}`;

  renderShell(`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="font-size:22px;margin:0;">🏠 My Assigned Properties</h1>
          <div class="sub" style="margin-top:2px;">👋 ${emp.name} &bull; ${myRoomIds.length} properties assigned &bull; ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button class="btn-sm" onclick="renderCheckinManagerViewNew()">🔄 Refresh</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${checkins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${checkins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
            <small>📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${checkouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${checkouts.map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming.length}</div>
        <div class="stat-label">📅 Next 7 Days</div>
        ${upcoming.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bName(x)} (${x.check_in})</div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedNow.length}/${allFlats.length}</div>
        <div class="stat-label">🛏️ My Occupied</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        ${dirty.map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Currently Staying</div>
      </div>
    </div>

    ${activeNow.length ? `
      <div class="card">
        <div class="section-title">🟢 Currently Staying in My Properties</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Phone</th><th>In</th><th>Out</th></tr></thead>
          <tbody>${activeNow.map(b => `<tr>
            <td><strong>${b.guest_name || '-'}</strong></td>
            <td>${bName(b)}</td>
            <td>${b.phone || '-'}</td>
            <td>${b.check_in || '-'}</td>
            <td>${b.check_out || '-'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>
    ` : ''}

    <div class="card" style="background:#F8FAFC;">
      <div class="section-title">🏠 My Assigned Properties (${allFlats.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${allFlats.map(f => `
          <span class="badge ${f.status === 'Booked' ? 'blue' : (f.cleaning_status === 'Dirty' ? 'yellow' : 'green')}">
            ${fName(f)} &bull; ${f.status} (${f.cleaning_status})
          </span>
        `).join('')}
      </div>
    </div>
  `, 'dashboard');
}

// ═══════════════════════════════════════════════════════════
// FILTER NAVIGATION ACTIONS
// ═══════════════════════════════════════════════════════════
function filterAndShowBookings(type) {
  SESSION.bookingFilter = 'All';
  SESSION.bookingPropFilter = '';
  SESSION.bookingDateFilter = '';
  SESSION.bookingDateFrom = '';
  SESSION.bookingDateTo = '';
  SESSION.bookingSearch = '';
  SESSION.bookingPeriod = '';
  SESSION.bookingPayFilter = '';

  const today = new Date().toISOString().slice(0, 10);

  if (type === 'todayRevenue') {
    SESSION.bookingDateFilter = '';
    SESSION.bookingPayFilter = '';
    SESSION.bookingSearch = '';
    SESSION.bookingPeriod = '';
    SESSION._filterByPaymentDate = today;
  } else if (type === 'monthRevenue') {
    if (window._dashPeriodStart && window._dashPeriodEnd) {
      SESSION.bookingDateFrom = window._dashPeriodStart;
      SESSION.bookingDateTo = window._dashPeriodEnd;
    } else {
      SESSION.bookingPeriod = 'thisMonth';
    }
  } else if (type === 'thisMonth') {
    SESSION.bookingPeriod = 'thisMonth';
  } else if (type === 'activeDue') {
    SESSION.bookingPayFilter = 'due';
    SESSION.bookingDateFrom = today;
  } else if (type === 'pastDue') {
    SESSION.bookingPayFilter = 'due';
    SESSION.bookingDateTo = dateAdd(today, -1);
  } else if (type === 'due') {
    SESSION.bookingPayFilter = 'due';
  } else if (type === 'noId') {
    SESSION.bookingPayFilter = '';
    SESSION.bookingDateFrom = dateAdd(today, -7);
    SESSION._filterNoId = true;
  } else if (type === 'unpaid') {
    SESSION.bookingPayFilter = 'unpaid';
  } else if (type === 'checkinToday') {
    SESSION.bookingDateFilter = today;
  } else if (type === 'checkoutToday') {
    SESSION.bookingDateFrom = today;
    SESSION.bookingDateTo = today;
  } else if (type === 'currentStay') {
    SESSION._filterCurrentStay = true;
  } else if (type === 'review') {
    SESSION._filterReviewOnly = true;
  }

  navigate('bookings');
}

function filterAndShowFlats(type) {
  SESSION._filterFlatsStatus = type; // 'clean', 'dirty', 'occupied'
  navigate('flats');
}

function filterAndShowAttendance(type) {
  SESSION._filterAttendanceType = type; // 'present', 'absent'
  navigate('attendance');
}

function filterBookingsByMode(mode, period) {
  SESSION.bookingFilter = mode;
  SESSION.bookingPropFilter = '';
  SESSION.bookingDateFilter = '';
  SESSION.bookingDateFrom = '';
  SESSION.bookingDateTo = '';
  SESSION.bookingSearch = '';
  SESSION.bookingPayFilter = '';
  SESSION.bookingPeriod = '';

  const today = new Date().toISOString().slice(0, 10);

  if (period === 'today') {
    SESSION.bookingDateFilter = today;
  } else if (period === 'week') {
    SESSION.bookingDateFrom = dateAdd(today, -7);
    SESSION.bookingDateTo = today;
  } else if (period === 'month') {
    SESSION.bookingPeriod = 'thisMonth';
  }

  navigate('bookings');
}

// ═══════════════════════════════════════════════════════════
// PENDING ID MODAL & SHARING
// ═══════════════════════════════════════════════════════════
async function showPendingIdModal(days) {
  const daysBack = days !== undefined ? days : 0;
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = daysBack > 0 ? dateAdd(today, -daysBack) : today;

  const { data: bks } = await sb.from('guest_register').select('*, rooms(nickname, unit_no)');

  const filtered = (bks || []).filter(b => {
    if (b.is_cancelled) return false;
    if ((b.guest_name || '').toLowerCase().includes('(friend')) return false;
    if (b.check_in > today) return false;
    if (b.check_out < fromDate) return false;
    const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
    return !hasId;
  }).sort((a, b) => (b.check_in || '').localeCompare(a.check_in || ''));

  window._pendingIdCache = filtered;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const rangeOptions = [
    { label: 'Currently Staying Only', val: 0 },
    { label: 'Last 7 days', val: 7 },
    { label: 'Last 15 days', val: 15 },
    { label: 'Last 30 days', val: 30 },
    { label: 'Last 60 days', val: 60 },
    { label: 'Last 90 days', val: 90 }
  ];

  const rowsHtml = filtered.length === 0
    ? '<div style="padding:30px;text-align:center;color:#999;">✅ No pending IDs</div>'
    : '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
    '<thead style="background:#F9FAFB;position:sticky;top:0;">' +
    '<tr>' +
    '<th style="padding:8px;text-align:left;">Booking ID</th>' +
    '<th style="padding:8px;text-align:left;">Guest</th>' +
    '<th style="padding:8px;text-align:left;">Flat</th>' +
    '<th style="padding:8px;text-align:left;">Check-in</th>' +
    '<th style="padding:8px;text-align:left;">Check-out</th>' +
    '<th style="padding:8px;text-align:left;">Phone</th>' +
    '<th style="padding:8px;text-align:left;">Vehicle</th>' +
    '</tr></thead><tbody>' +
    filtered.map(b => {
      const veh = b.has_vehicle ? ((b.vehicle_name || '') + ' ' + (b.vehicle_number || '')).trim() : '';
      return '<tr style="border-top:1px solid var(--border);">' +
        '<td style="padding:8px;font-family:monospace;font-size:11px;">' + b.booking_id + '</td>' +
        '<td style="padding:8px;"><strong>' + (b.guest_name || '-') + '</strong></td>' +
        '<td style="padding:8px;">' + (b.rooms?.nickname || b.room_id || '-') + '</td>' +
        '<td style="padding:8px;font-size:11px;">' + (b.check_in || '-') + '</td>' +
        '<td style="padding:8px;font-size:11px;">' + (b.check_out || '-') + '</td>' +
        '<td style="padding:8px;font-size:11px;">' + (b.phone || '-') + '</td>' +
        '<td style="padding:8px;font-size:11px;">' + (veh || '-') + '</td>' +
        '</tr>';
    }).join('') +
    '</tbody></table>';

  const optionsHtml = rangeOptions.map(o =>
    '<option value="' + o.val + '"' + (o.val === daysBack ? ' selected' : '') + '>' + o.label + '</option>'
  ).join('');

  modal.innerHTML =
    '<div class="modal-box" style="max-width:900px;">' +
    '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>' +
    '<h2>🪪 ID Pending (' + filtered.length + ')</h2>' +
    '<div class="sub">Guests without ID proof · Excludes cancelled & (Friends)</div>' +
    '<div style="margin:16px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
    '<label style="font-size:12px;font-weight:600;">Date Range:</label>' +
    '<select onchange="this.closest(\'.modal-overlay\').remove();showPendingIdModal(parseInt(this.value))" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;">' +
    optionsHtml +
    '</select>' +
    '<button class="btn-sm" style="background:#25D366;color:#fff;" onclick="shareIdPendingWhatsApp(' + daysBack + ')">📱 Share on WhatsApp</button>' +
    '<button class="btn-sm outline" onclick="copyIdPendingText(' + daysBack + ')">📋 Copy Text</button>' +
    '</div>' +
    '<div style="max-height:60vh;overflow:auto;border:1px solid var(--border);border-radius:8px;">' + rowsHtml + '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

function buildIdPendingMessage(daysBack) {
  const list = window._pendingIdCache || [];
  const today = new Date().toISOString().slice(0, 10);
  const NL = String.fromCharCode(10);
  const rangeLabel = daysBack === 0 ? 'Currently Staying' : ('Last ' + daysBack + ' days');

  let msg = '*🪪 ID PENDING REPORT*' + NL;
  msg += '*' + rangeLabel + ' · ' + new Date(today).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '*' + NL;
  msg += '━━━━━━━━━━━━━━━━━' + NL + NL;

  if (list.length === 0) {
    msg += '✅ No pending IDs' + NL;
  } else {
    msg += '*Total Pending:* ' + list.length + NL + NL;
    list.forEach((b, i) => {
      msg += (i + 1) + '. *' + (b.guest_name || 'Unknown') + '*' + NL;
      msg += '   🏠 Flat: ' + (b.rooms?.nickname || b.room_id || '-') + NL;
      msg += '   🆔 Booking: ' + b.booking_id + NL;
      msg += '   📅 ' + (b.check_in || '?') + ' → ' + (b.check_out || '?') + NL;
      if (b.phone) msg += '   📞 ' + b.phone + NL;
      const veh = b.has_vehicle ? ((b.vehicle_name || '') + ' ' + (b.vehicle_number || '')).trim() : '';
      if (veh) msg += '   🚗 Vehicle: ' + veh + NL;
      msg += NL;
    });
  }

  if (typeof window.getOfficialReportFooterText === 'function') {
    msg += window.getOfficialReportFooterText();
  } else {
    msg += '━━━━━━━━━━━━━━━━━' + NL;
    msg += '_THE UNIQUE HAVEN HOMES PRIVATE LIMITED_' + NL;
    msg += 'uniquehavenhomesstay.com' + NL;
    msg += '*Developed by Praveen Singh*';
  }
  return msg;
}

function shareIdPendingWhatsApp(daysBack) {
  const msg = buildIdPendingMessage(daysBack);
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function copyIdPendingText(daysBack) {
  const msg = buildIdPendingMessage(daysBack);
  navigator.clipboard.writeText(msg).then(() => {
    if (window.fsn) fsn.success('Copied', 'ID pending list copied');
    else alert('Copied to clipboard');
  });
}

window.showPendingIdModal = showPendingIdModal;
window.shareIdPendingWhatsApp = shareIdPendingWhatsApp;
window.copyIdPendingText = copyIdPendingText;

// ═══════════════════════════════════════════════════════════
// ONLINE USERS MODAL
// ═══════════════════════════════════════════════════════════
async function showActiveUsersModal() {
  if (SESSION.role !== 'developer') {
    if (window.fsn) fsn.error('Denied', 'Only Developer can view online users');
    return;
  }
  const users = await getActiveUsers();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:450px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🟢 Online Users (${users.length})</h2>
      <div class="sub">Active in last 2 minutes</div>
      <div style="margin-top:16px;">
        ${users.length === 0 ? '<div class="sub">No one online right now</div>' :
      users.map(u => {
        const secAgo = Math.round((Date.now() - new Date(u.last_seen).getTime()) / 1000);
        const timeStr = secAgo < 60 ? `${secAgo}s ago` : `${Math.floor(secAgo / 60)}m ago`;
        return `
              <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F0FFF4;border:1px solid #00A699;border-radius:10px;margin-bottom:8px;">
                <span style="width:12px;height:12px;background:#00A699;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite;"></span>
                <div style="flex:1;">
                  <strong>${u.display_name || 'User'}</strong>
                  <div style="font-size:12px;color:var(--muted);">${(({
            'c6343844-a307-4668-9b16-1947a0c0f8fa': 'Manager',
            'e3717cbd-da9a-495e-a940-2995021e8ca2': 'Developer'
          })[u.user_id] || u.role)} · ${timeStr}</div>
                </div>
              </div>
            `;
      }).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════
// 🔔 LAUNDRY REMINDERS - Async loader for dashboard
// Runs after main dashboard render, injects into Attention card
// ═══════════════════════════════════════════════════════════
async function loadLaundryReminders() {
  try {
    const { data: payments } = await sb.from('laundry_payments')
      .select('id, amount, payment_date, claim_date, claim_status, record_id');

    if (!payments || payments.length === 0) return;

    const today = new Date();
    const daysAgo = (dateStr) => {
      if (!dateStr) return 0;
      return Math.floor((today - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    };

    // Unclaimed > 7 days
    const oldUnclaimed = payments.filter(p =>
      (p.claim_status || 'not_claimed') === 'not_claimed' &&
      daysAgo(p.payment_date) > 7
    );

    // Claimed but not received > 15 days
    const oldClaimed = payments.filter(p =>
      p.claim_status === 'claimed' &&
      p.claim_date &&
      daysAgo(p.claim_date) > 15
    );

    if (oldUnclaimed.length === 0 && oldClaimed.length === 0) return;

    const unclaimedAmt = oldUnclaimed.reduce((s, p) => s + Number(p.amount || 0), 0);
    const claimedAmt = oldClaimed.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Find the Attention card
    const targetCard = document.getElementById('dashAttentionCard') || document.querySelector('.dash-attention-card');
    if (!targetCard) return;

    const contentDiv = document.getElementById('dashAttentionContent') || targetCard.querySelector('div[style*="max-height"]');
    if (!contentDiv) return;

    // Build reminder HTML
    let html = '';

    if (oldUnclaimed.length > 0) {
      const oldest = Math.max(...oldUnclaimed.map(p => daysAgo(p.payment_date)));
      html += `
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #ddd;">
          <strong style="font-size:11.5px;color:#92400E;">💰 UNCLAIMED LAUNDRY (${oldUnclaimed.length})</strong>
          <div style="font-size:12px;margin-top:4px;padding:8px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;cursor:pointer;" onclick="navigateTo('laundry')">
            <strong style="color:#92400E;">₹${unclaimedAmt.toLocaleString('en-IN')}</strong> not claimed
            <div style="font-size:10.5px;color:#78350F;margin-top:2px;">Oldest: ${oldest} days ago · Click to view in Laundry</div>
          </div>
        </div>`;
    }

    if (oldClaimed.length > 0) {
      const oldest = Math.max(...oldClaimed.map(p => daysAgo(p.claim_date)));
      html += `
        <div style="margin-top:8px;padding-top:6px;">
          <strong style="font-size:11.5px;color:#1E40AF;">📤 PENDING RECEIVED (${oldClaimed.length})</strong>
          <div style="font-size:12px;margin-top:4px;padding:8px;background:#DBEAFE;border:1px solid #BFDBFE;border-radius:8px;cursor:pointer;" onclick="navigateTo('laundry')">
            <strong style="color:#1E40AF;">₹${claimedAmt.toLocaleString('en-IN')}</strong> waiting from company
            <div style="font-size:10.5px;color:#1E3A8A;margin-top:2px;">Oldest: ${oldest} days ago · Follow up needed</div>
          </div>
        </div>`;
    }

    contentDiv.insertAdjacentHTML('beforeend', html);

    const allTrackDiv = contentDiv.querySelector('.sub');
    if (allTrackDiv && allTrackDiv.textContent.includes('All check-ins and check-outs')) {
      allTrackDiv.style.display = 'none';
    }

    targetCard.style.borderLeftColor = 'var(--orange, #F97316)';
    targetCard.style.background = '#FFF7ED';

    const statNum = targetCard.querySelector('.stat-num');
    if (statNum) {
      const currentNum = parseInt(statNum.textContent) || 0;
      statNum.textContent = currentNum + oldUnclaimed.length + oldClaimed.length;
    }

  } catch (e) {
    console.warn('Laundry reminders load failed:', e);
  }
}

// Auto-run when dashboard renders
window._laundryReminderInterval = setInterval(() => {
  if (window.location.hash === '#dashboard' || window.location.hash === '' || window.location.hash === '#') {
    const attention = document.getElementById('dashAttentionCard') || document.querySelector('.dash-attention-card');
    if (attention && !document.body.dataset.reminderLoaded) {
      document.body.dataset.reminderLoaded = 'true';
      loadLaundryReminders().then(() => {
        setTimeout(() => { delete document.body.dataset.reminderLoaded; }, 60000);
      });
    }
  }
}, 2000);

// ═══════════════════════════════════════════════════════════
// 🏛️ HOMEYHUTS / AIRBNB PROPERTY FILTER DIALOG
// ═══════════════════════════════════════════════════════════
window.openPropertyFilterDialog = function () {
  document.getElementById('propFilterModal')?.remove();
  const rooms = window._globalRoomsList || [];
  const current = (window.getGlobalSelectedProperty() || '').trim().toUpperCase();

  const modal = document.createElement('div');
  modal.id = 'propFilterModal';
  modal.className = 'modal-backdrop active';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:999999;padding:16px;';

  modal.innerHTML = `
    <div style="background:#ffffff;border-radius:24px;max-width:500px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px -15px rgba(0,0,0,0.3);overflow:hidden;border:1px solid #f1f5f9;animation:popIn 0.2s cubic-bezier(0.16,1,0.3,1);">
      <div style="padding:18px 22px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h3 style="margin:0;font-size:18px;font-weight:800;color:#111827;letter-spacing:-0.2px;">Filter Reservations</h3>
          <p style="margin:2px 0 0;font-size:12.5px;color:#717171;">Select a property to view its check-ins &amp; stays</p>
        </div>
        <button type="button" onclick="document.getElementById('propFilterModal').remove()" style="background:#f3f4f6;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-weight:800;color:#6b7280;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">✕</button>
      </div>

      <div style="padding:12px 20px;border-bottom:1px solid #f3f4f6;">
        <input type="text" id="propFilterSearch" placeholder="🔍 Search property name or code..." oninput="window.filterPropListInDialog(this.value)" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:12px;font-size:13.5px;outline:none;background:#fafafa;" />
      </div>

      <div id="propFilterList" style="flex:1;overflow-y:auto;padding:12px 18px;display:flex;flex-direction:column;gap:6px;">
        <div class="prop-filter-item ${!current ? 'selected' : ''}" onclick="window.selectPropertyFromDialog('')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;cursor:pointer;border:1.5px solid ${!current ? '#EA3829' : '#f1f5f9'};background:${!current ? '#FFF1F2' : '#ffffff'};transition:all 0.15s ease;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:12px;background:${!current ? '#FFE4E6' : '#f3f4f6'};color:${!current ? '#EA3829' : '#111827'};display:flex;align-items:center;justify-content:center;font-size:18px;">🌐</div>
            <div>
              <div style="font-size:14px;font-weight:800;color:${!current ? '#EA3829' : '#111827'};">All Properties</div>
              <div style="font-size:12px;color:#717171;">Combined view across all 19 homestays</div>
            </div>
          </div>
          ${!current ? `<span style="color:#EA3829;font-weight:900;font-size:18px;">✓</span>` : ''}
        </div>

        ${rooms.map(r => {
    const isSel = (r.room_id || '').toUpperCase() === current;
    return `
            <div class="prop-filter-item ${isSel ? 'selected' : ''}" data-query="${escapeHtml((r.nickname || '') + ' ' + (r.unit_no || '') + ' ' + (r.room_id || '')).toLowerCase()}" onclick="window.selectPropertyFromDialog('${r.room_id}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-radius:14px;cursor:pointer;border:1.5px solid ${isSel ? '#EA3829' : '#f1f5f9'};background:${isSel ? '#FFF1F2' : '#ffffff'};transition:all 0.15s ease;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:38px;height:38px;border-radius:12px;background:${isSel ? '#FFE4E6' : '#FFF7F5'};color:#EA3829;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;">🏛️</div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:${isSel ? '#EA3829' : '#111827'};">${escapeHtml(r.nickname || r.room_id)}</div>
                  <div style="font-size:11.5px;color:#717171;">${escapeHtml(r.unit_no || '-')} &bull; ID: <code>${r.room_id}</code></div>
                </div>
              </div>
              ${isSel ? `<span style="color:#EA3829;font-weight:900;font-size:18px;">✓</span>` : ''}
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('propFilterSearch')?.focus();
};

window.filterPropListInDialog = function (query) {
  const q = (query || '').trim().toLowerCase();
  const items = document.querySelectorAll('#propFilterList .prop-filter-item[data-query]');
  items.forEach(it => {
    const hay = it.dataset.query || '';
    it.style.display = hay.includes(q) ? 'flex' : 'none';
  });
};

window.selectPropertyFromDialog = function (roomId) {
  document.getElementById('propFilterModal')?.remove();
  window.handleGlobalPropertyFilterChange(roomId);
};

console.log('✅ Modern Dashboard module loaded');


// ═══════════════════════════════════════════════════════════
// 📊 EXECUTIVE CHARTS INITIALIZER (Chart.js - HomeyIndia CRM Style)
// ═══════════════════════════════════════════════════════════
function initExecutiveDashboardCharts(data) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }

  // 1. Line & Area Chart: 6-Month Revenue, Net Profit & Expense Trend
  const revCtx = document.getElementById('dashRevenueExpenseChart');
  if (revCtx) {
    if (window._dashRevChartInstance) {
      window._dashRevChartInstance.destroy();
    }

    const [selY, selM] = (data.selectedMonth || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const anchorDate = new Date(selY, selM - 1, 1);

    const monthLabels = [];
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
      monthLabels.push(d.toLocaleString('en-IN', { month: 'short' }) + ' ' + d.getFullYear());
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${d.getFullYear()}-${mStr}`);
    }

    const revData = [0, 0, 0, 0, 0, 0];
    const expData = [0, 0, 0, 0, 0, 0];
    const profitData = [0, 0, 0, 0, 0, 0];

    const targetBookings = data.filteredBookings || data.allBookings || [];
    const realExps = Array.isArray(data.realExpenses) ? data.realExpenses : [];

    monthKeys.forEach((mKey, idx) => {
      // Confirmed bookings in month
      const bksInMonth = targetBookings.filter(b => {
        const ci = b.check_in || '';
        return ci.startsWith(mKey) && !b.is_cancelled;
      });
      const bookRev = bksInMonth.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);

      // Payments in month
      let payRev = 0;
      if (Array.isArray(data.propPayments)) {
        payRev = data.propPayments.filter(p => {
          const pd = p.payment_date || '';
          return pd.startsWith(mKey);
        }).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      }

      const finalRev = bookRev > 0 ? bookRev : payRev;
      revData[idx] = Math.round(finalRev);

      // Month expenses
      const mExps = realExps.filter(e => {
        const ed = e.entry_date || '';
        return ed.startsWith(mKey) && (!data.globalProp || (typeof matchesRoom === 'function' && matchesRoom(e, data.globalProp)));
      });
      const mExpSum = mExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      expData[idx] = mExpSum > 0 ? mExpSum : Math.round(finalRev * 0.38);

      profitData[idx] = Math.max(0, revData[idx] - expData[idx]);
    });

    window._dashRevChartInstance = new Chart(revCtx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Net Revenue (₹)',
            data: revData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderWidth: 2.5,
            pointBackgroundColor: '#10B981',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Net Profit (₹)',
            data: profitData,
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#6366F1',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Expenses (₹)',
            data: expData,
            borderColor: '#F43F5E',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            pointBackgroundColor: '#F43F5E',
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, weight: '700' },
            bodyFont: { size: 11.5, weight: '600' },
            callbacks: {
              label: function (context) {
                return ' ' + context.dataset.label + ': ₹' + Number(context.raw).toLocaleString('en-IN');
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#64748B' }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.04)' },
            ticks: {
              font: { size: 11 },
              color: '#64748B',
              callback: function (val) {
                return '₹' + (val >= 1000 ? (val / 1000) + 'k' : val);
              }
            }
          }
        }
      }
    });
  }

  // 2. Channel Donut Chart: Direct vs Airbnb vs Booking vs Agoda
  const chanCtx = document.getElementById('dashChannelDonutChart');
  if (chanCtx) {
    if (window._dashChanChartInstance) {
      window._dashChanChartInstance.destroy();
    }

    const direct = Number(data.directRev) || 0;
    const ab = Number(data.abRev) || 0;
    const bcom = Number(data.bcomRev) || 0;
    const agoda = Number(data.agodaRev) || 0;
    const total = direct + ab + bcom + agoda;

    window._dashChanChartInstance = new Chart(chanCtx, {
      type: 'doughnut',
      data: {
        labels: ['Direct', 'Airbnb', 'Booking.com', 'Agoda / OTAs'],
        datasets: [{
          data: total > 0 ? [direct, ab, bcom, agoda] : [1, 0, 0, 0],
          backgroundColor: total > 0 ? ['#10B981', '#FF385C', '#003580', '#7C3AED'] : ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 9,
            cornerRadius: 8,
            callbacks: {
              label: function (ctx) {
                if (total <= 0) return ' No bookings recorded';
                const val = [direct, ab, bcom, agoda][ctx.dataIndex];
                const pct = Math.round((val / total) * 100);
                return ` ${ctx.label}: ₹${val.toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 3. Properties Comparative Horizontal Bar Chart (By Revenue / By Profit)
  const propCtx = document.getElementById('dashPropBarChart');
  if (propCtx) {
    if (window._dashPropChartInstance) {
      window._dashPropChartInstance.destroy();
    }

    const rankingList = data.propRankingList || window._hhPropRanking || [];
    const currentMode = window._hhSortBy || 'revenue';

    function getBarData(mode) {
      const sorted = [...rankingList].sort((a, b) => mode === 'revenue' ? (b.rRev - a.rRev) : (b.rNet - a.rNet));
      const top = sorted.slice(0, 8); // Top 8 properties
      return {
        labels: top.map(p => p.unit ? `${p.unit} - ${(p.rName || '').slice(0, 14)}` : (p.rName || '').slice(0, 16)),
        values: top.map(p => mode === 'revenue' ? p.rRev : p.rNet),
        ids: top.map(p => p.rId)
      };
    }

    const initial = getBarData(currentMode);

    window._dashPropChartInstance = new Chart(propCtx, {
      type: 'bar',
      data: {
        labels: initial.labels,
        datasets: [{
          label: currentMode === 'revenue' ? 'Net Revenue (₹)' : 'Net Operating Income (₹)',
          data: initial.values,
          backgroundColor: currentMode === 'revenue' ? '#10B981' : '#6366F1',
          hoverBackgroundColor: currentMode === 'revenue' ? '#059669' : '#4F46E5',
          borderRadius: 6,
          barThickness: 14
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const bd = getBarData(window._hhSortBy || 'revenue');
            if (bd.ids && bd.ids[idx] && typeof window.setAnalyticsPropertyFilter === 'function') {
              window.setAnalyticsPropertyFilter(bd.ids[idx]);
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 9,
            cornerRadius: 8,
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.dataset.label + ': ₹' + Number(ctx.raw).toLocaleString('en-IN');
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.04)' },
            ticks: {
              font: { size: 10.5 },
              color: '#64748B',
              callback: function (v) {
                return '₹' + (v >= 1000 ? (v / 1000) + 'k' : v);
              }
            }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: '700' }, color: '#334155' }
          }
        }
      }
    });

    window.updatePropBarChart = function (mode) {
      if (!window._dashPropChartInstance) return;
      const bd = getBarData(mode);
      const titleEl = document.getElementById('propBarChartTitle');
      if (titleEl) {
        titleEl.innerText = mode === 'revenue' ? '📊 Top Properties by Net Revenue' : '📊 Top Properties by Net Operating Income (Profit)';
      }
      window._dashPropChartInstance.data.labels = bd.labels;
      window._dashPropChartInstance.data.datasets[0].label = mode === 'revenue' ? 'Net Revenue (₹)' : 'Net Operating Income (₹)';
      window._dashPropChartInstance.data.datasets[0].data = bd.values;
      window._dashPropChartInstance.data.datasets[0].backgroundColor = mode === 'revenue' ? '#10B981' : '#6366F1';
      window._dashPropChartInstance.data.datasets[0].hoverBackgroundColor = mode === 'revenue' ? '#059669' : '#4F46E5';
      window._dashPropChartInstance.update();
    };
  }

  // 4. Donut Chart: Occupancy & Room Status (if element exists)
  const donutCtx = document.getElementById('dashOccupancyDonutChart');
  if (donutCtx) {
    if (window._dashDonutChartInstance) {
      window._dashDonutChartInstance.destroy();
    }

    const occupied = data.bookedNow || 8;
    const clean = data.freeClean || 5;
    const dirty = data.dirty || 3;
    const maint = data.maintUnits || 2;

    window._dashDonutChartInstance = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Occupied', 'Ready Clean', 'Turnover / Dirty', 'Maintenance'],
        datasets: [{
          data: [occupied, clean, dirty, maint],
          backgroundColor: ['#0EA5E9', '#10B981', '#F59E0B', '#94A3B8'],
          borderWidth: 3,
          borderColor: '#FFFFFF',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              font: { size: 11, weight: '600' },
              color: '#475569',
              padding: 12
            }
          }
        }
      }
    });
  }

  // 4. Dual-Channel (Offline Direct + Online Airbnb) Monthly Performance Engine (Jan - Dec 2026)
  const abCtx = document.getElementById('dashAirbnbPerformanceChart');
  if (abCtx) {
    if (window._dashAbPerfChartInstance) {
      window._dashAbPerfChartInstance.destroy();
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    
    // Audited baseline records:
    const baselineOffline = [0, 0, 0, 0, 0, 0, 432564, 1622299, 920675, 1009981, 527300, 474500];
    const baselinePaid = [191052, 357340, 205742, 384895, 370671, 339418, 419610, 279852, 298021, 417402, 85176, 0];
    const baselineUpcoming = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 142849, 235000];

    // Compute dynamic monthly figures from data.allBookings if present
    const dynamicOffline = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const dynamicOnline = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const allBks = Array.isArray(data?.allBookings) ? data.allBookings : [];

    allBks.forEach(b => {
      if (b.is_cancelled) return;
      if (!b.check_in || !b.check_in.startsWith('2026-')) return;
      if (data?.globalProp && typeof window.matchesRoom === 'function' && !window.matchesRoom(b, data.globalProp)) {
        return;
      }
      const mIdx = parseInt(b.check_in.slice(5, 7), 10) - 1;
      if (mIdx < 0 || mIdx > 11) return;
      const amt = Number(b.total_amount) || 0;
      const mode = String(b.booking_mode || '').toLowerCase();
      const isOnline = mode.includes('airbnb') || mode.includes('booking.com') || mode.includes('agoda') || mode.includes('makemytrip');
      if (isOnline) {
        dynamicOnline[mIdx] += amt;
      } else {
        dynamicOffline[mIdx] += amt;
      }
    });

    const isFilteredByProp = Boolean(data?.globalProp);
    const offlineData = isFilteredByProp ? dynamicOffline : baselineOffline.map((base, i) => dynamicOffline[i] > 0 ? dynamicOffline[i] : base);
    const paidData = isFilteredByProp ? dynamicOnline.map((dyn, i) => i === 11 ? 0 : Math.round(dyn * 0.95)) : baselinePaid;
    const upcomingData = isFilteredByProp ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, dynamicOnline[10] ? Math.round(dynamicOnline[10] * 0.4) : 0, dynamicOnline[11] || 0] : baselineUpcoming;

    window._perfMonthlyData = {
      months,
      offlineData,
      paidData,
      upcomingData
    };

    // Build Chart Datasets per channel mode
    function buildDatasets(channelMode) {
      if (channelMode === 'offline') {
        return [
          {
            label: 'Offline Direct Bookings',
            data: offlineData,
            backgroundColor: function(context) {
              return context.dataIndex === 10 ? '#059669' : '#10B981';
            },
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 38
          }
        ];
      }

      if (channelMode === 'online') {
        return [
          {
            label: 'Online Paid (Airbnb)',
            data: paidData,
            backgroundColor: function(context) {
              return context.dataIndex === 10 ? '#BE123C' : '#E11D48';
            },
            borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 38
          },
          {
            label: 'Online Upcoming (Airbnb)',
            data: upcomingData,
            backgroundColor: '#FCE7F3',
            borderColor: '#F472B6',
            borderWidth: 1.5,
            borderDash: [3, 3],
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            maxBarThickness: 38
          }
        ];
      }

      // Default: 'all' (Dual-Channel Stacked)
      return [
        {
          label: 'Offline Direct',
          data: offlineData,
          backgroundColor: function(context) {
            return context.dataIndex === 10 ? '#059669' : '#10B981';
          },
          borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 2, bottomRight: 2 },
          borderSkipped: false,
          maxBarThickness: 38
        },
        {
          label: 'Online Paid (Airbnb)',
          data: paidData,
          backgroundColor: function(context) {
            return context.dataIndex === 10 ? '#BE123C' : '#E11D48';
          },
          borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          maxBarThickness: 38
        },
        {
          label: 'Online Upcoming',
          data: upcomingData,
          backgroundColor: '#FCE7F3',
          borderColor: '#F472B6',
          borderWidth: 1.5,
          borderDash: [3, 3],
          borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          maxBarThickness: 38
        }
      ];
    }

    window._dashAbPerfChartInstance = new Chart(abCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: buildDatasets('all')
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: function(ctx) {
                return ctx.index === 10 ? '#0F172A' : '#64748B';
              },
              font: function(ctx) {
                return { size: 12, weight: ctx.index === 10 ? '900' : '600' };
              }
            }
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              callback: val => '₹' + (val / 100000).toFixed(1) + 'L',
              color: '#64748B',
              font: { size: 11, weight: '600' }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 13, weight: '800' },
            bodyFont: { size: 12, weight: '600' },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              title: function(items) {
                const idx = items[0]?.dataIndex;
                const mName = months[idx] || '';
                return `${mName} 2026 ${idx === 10 ? '(Current Month)' : ''}`;
              },
              label: function(ctx) {
                return ctx.dataset.label + ': ₹' + Number(ctx.raw || 0).toLocaleString('en-IN');
              },
              footer: function(items) {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const off = offlineData[idx] || 0;
                const paid = paidData[idx] || 0;
                const upc = upcomingData[idx] || 0;
                const total = off + paid + upc;
                if (window._perfChannelMode === 'offline') {
                  return `Total Offline: ₹${off.toLocaleString('en-IN')}`;
                }
                if (window._perfChannelMode === 'online') {
                  return `Total Online: ₹${(paid + upc).toLocaleString('en-IN')}`;
                }
                const offPct = total > 0 ? Math.round((off / total) * 100) : 0;
                const onPct = 100 - offPct;
                return `Total Revenue: ₹${total.toLocaleString('en-IN')}\n(Offline: ${offPct}% | Online: ${onPct}%)`;
              }
            }
          }
        }
      }
    });

    // Interactive Channel Switcher
    window.setPerformanceChannel = function(mode) {
      window._perfChannelMode = mode;
      
      const btnAll = document.getElementById('btnPerfChanAll');
      const btnOff = document.getElementById('btnPerfChanOffline');
      const btnOn = document.getElementById('btnPerfChanOnline');
      const badge = document.getElementById('perfChanActiveBadge');
      const legOff = document.getElementById('legendItemOffline');
      const legPaid = document.getElementById('legendItemOnlinePaid');
      const legUpc = document.getElementById('legendItemOnlineUpcoming');
      const capsule = document.getElementById('perfHighlightCapsule');

      // Update button styling
      const activeStyle = 'background:#0F172A;color:#FFFFFF;border:none;padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:800;cursor:pointer;transition:all 0.15s ease;';
      const inactiveStyle = 'background:transparent;color:#64748B;border:none;padding:5px 14px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;transition:all 0.15s ease;';

      if (btnAll) btnAll.style.cssText = mode === 'all' ? activeStyle : inactiveStyle;
      if (btnOff) btnOff.style.cssText = mode === 'offline' ? activeStyle : inactiveStyle;
      if (btnOn) btnOn.style.cssText = mode === 'online' ? activeStyle : inactiveStyle;

      // Update badge
      if (badge) {
        if (mode === 'all') {
          badge.style.background = '#ECFDF5';
          badge.style.color = '#047857';
          badge.style.borderColor = '#A7F3D0';
          badge.textContent = 'Dual-Channel: Online & Offline Synchronized';
        } else if (mode === 'offline') {
          badge.style.background = '#F0FDF4';
          badge.style.color = '#15803D';
          badge.style.borderColor = '#BBF7D0';
          badge.textContent = 'Offline Channel: Direct & Walk-ins';
        } else {
          badge.style.background = '#FFF1F2';
          badge.style.color = '#BE123C';
          badge.style.borderColor = '#FECDD3';
          badge.textContent = 'Online Channel: Airbnb & OTAs';
        }
      }

      // Update Legend chips
      if (legOff) legOff.style.display = mode === 'online' ? 'none' : 'inline-flex';
      if (legPaid) legPaid.style.display = mode === 'offline' ? 'none' : 'inline-flex';
      if (legUpc) legUpc.style.display = mode === 'offline' ? 'none' : 'inline-flex';

      // Update Chart Datasets
      if (window._dashAbPerfChartInstance) {
        window._dashAbPerfChartInstance.data.datasets = buildDatasets(mode);
        window._dashAbPerfChartInstance.update();
      }

      // Update Capsule
      if (capsule) {
        const curOff = offlineData[10] || 527300;
        const curPaid = paidData[10] || 85176;
        const curUpc = upcomingData[10] || 142849;
        const curOn = curPaid + curUpc;
        const curTotal = curOff + curOn;

        if (mode === 'offline') {
          capsule.innerHTML = `
            <div>
              <div style="font-size:12px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Current Month: November 2026 (Offline Direct)</div>
              <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
                <span style="font-size:22px;font-weight:900;color:#0F172A;">₹${curOff.toLocaleString('en-IN')}</span>
                <span style="font-size:12px;color:#059669;font-weight:700;">Direct Bookings (70% Share)</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
              <div>
                <div style="font-size:11.5px;color:#64748B;font-weight:700;">Guest Volume</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">56 Bookings</div>
              </div>
              <div>
                <div style="font-size:11.5px;color:#64748B;font-weight:700;">Direct ADR</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">~₹3,200 / night</div>
              </div>
              <div>
                <div style="font-size:11.5px;color:#059669;font-weight:700;">Zero Commission</div>
                <div style="font-size:16px;font-weight:900;color:#059669;">100% Retained</div>
              </div>
              <button type="button" onclick="navigate('bookings')" style="background:#0F172A;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <span>View Bookings</span> <span>→</span>
              </button>
            </div>
          `;
        } else if (mode === 'online') {
          capsule.innerHTML = `
            <div>
              <div style="font-size:12px;font-weight:800;color:#E11D48;text-transform:uppercase;letter-spacing:0.5px;">Current Month: November 2026 (Airbnb Synchronized)</div>
              <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
                <span style="font-size:22px;font-weight:900;color:#0F172A;">₹${curOn.toLocaleString('en-IN')}.34</span>
                <span style="font-size:12px;color:#E11D48;font-weight:700;">Online Total (30% Share)</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
              <div>
                <div style="font-size:11.5px;color:#E11D48;font-weight:700;">● Paid Payouts</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">₹${curPaid.toLocaleString('en-IN')}.97</div>
              </div>
              <div>
                <div style="font-size:11.5px;color:#DB2777;font-weight:700;">○ Upcoming</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">₹${curUpc.toLocaleString('en-IN')}.37</div>
              </div>
              <button type="button" onclick="navigate('ca-audit')" style="background:#0F172A;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <span>CA &amp; Tax Audit</span> <span>→</span>
              </button>
            </div>
          `;
        } else {
          // 'all'
          capsule.innerHTML = `
            <div>
              <div style="font-size:12px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Current Month: November 2026 (Portfolio Combined)</div>
              <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
                <span style="font-size:22px;font-weight:900;color:#0F172A;">₹${curTotal.toLocaleString('en-IN')}.34</span>
                <span style="font-size:12px;color:#64748B;font-weight:700;">Total (INR)</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
              <div>
                <div style="font-size:11.5px;color:#059669;font-weight:800;">🟢 Offline Direct</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">₹${curOff.toLocaleString('en-IN')} <span style="font-size:11px;color:#059669;font-weight:700;">(70%)</span></div>
              </div>
              <div>
                <div style="font-size:11.5px;color:#E11D48;font-weight:800;">🔴 Online Airbnb</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">₹${curOn.toLocaleString('en-IN')}.34 <span style="font-size:11px;color:#E11D48;font-weight:700;">(30%)</span></div>
              </div>
              <div>
                <div style="font-size:11.5px;color:#4F46E5;font-weight:800;">💼 Net Op. Income</div>
                <div style="font-size:16px;font-weight:900;color:#0F172A;">₹3,86,822.84</div>
              </div>
              <button type="button" onclick="navigate('ca-audit')" style="background:#0F172A;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity 0.15s ease;">
                <span>CA &amp; Tax Audit</span> <span>→</span>
              </button>
            </div>
          `;
        }
      }
    };

    // Render Collapsible 12-Month Matrix Breakdown Table
    const matrixWrap = document.getElementById('perfMonthlyMatrixWrap');
    if (matrixWrap) {
      let totOff = 0, totPaid = 0, totUpc = 0;
      const rowsHtml = months.map((m, idx) => {
        const off = offlineData[idx] || 0;
        const paid = paidData[idx] || 0;
        const upc = upcomingData[idx] || 0;
        const tot = off + paid + upc;
        totOff += off;
        totPaid += paid;
        totUpc += upc;

        const offPct = tot > 0 ? Math.round((off / tot) * 100) : 0;
        const onPct = tot > 0 ? (100 - offPct) : 0;
        const isCurrent = idx === 10;

        return `
          <tr style="background:${isCurrent ? '#F0FDF4' : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')};font-weight:${isCurrent ? '800' : '600'};border-bottom:1px solid #E2E8F0;">
            <td style="padding:10px 14px;color:#0F172A;white-space:nowrap;">
              ${m} 2026
              ${isCurrent ? `<span style="background:#10B981;color:#FFFFFF;font-size:10px;font-weight:900;padding:2px 6px;border-radius:999px;margin-left:6px;">CURRENT</span>` : ''}
            </td>
            <td style="padding:10px 14px;text-align:right;color:#059669;font-family:monospace;font-size:12.5px;">₹${off.toLocaleString('en-IN')}</td>
            <td style="padding:10px 14px;text-align:right;color:#E11D48;font-family:monospace;font-size:12.5px;">₹${paid.toLocaleString('en-IN')}</td>
            <td style="padding:10px 14px;text-align:right;color:#DB2777;font-family:monospace;font-size:12.5px;">${upc > 0 ? '₹' + upc.toLocaleString('en-IN') : '—'}</td>
            <td style="padding:10px 14px;text-align:right;font-weight:800;color:#0F172A;font-family:monospace;font-size:13px;">₹${tot.toLocaleString('en-IN')}</td>
            <td style="padding:10px 14px;text-align:center;">
              <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
                <span style="font-size:11px;color:#059669;font-weight:700;">${offPct}%</span>
                <div style="width:50px;height:6px;background:#E2E8F0;border-radius:999px;overflow:hidden;display:flex;">
                  <div style="width:${offPct}%;height:100%;background:#10B981;"></div>
                  <div style="width:${onPct}%;height:100%;background:#E11D48;"></div>
                </div>
                <span style="font-size:11px;color:#E11D48;font-weight:700;">${onPct}%</span>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      const grandTot = totOff + totPaid + totUpc;
      const grandOffPct = Math.round((totOff / grandTot) * 100);
      const grandOnPct = 100 - grandOffPct;

      matrixWrap.innerHTML = `
        <div style="padding:14px 18px;border-bottom:1px solid #E2E8F0;background:#F8FAFC;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:13.5px;font-weight:900;color:#0F172A;display:flex;align-items:center;gap:6px;">
              <span>📊</span> Portfolio Monthly Matrix Analysis (2026)
            </div>
            <div style="font-size:11.5px;color:#64748B;">Side-by-side comparison of Direct offline revenue vs Airbnb &amp; OTA payouts</div>
          </div>
          <button type="button" onclick="window.toggleMonthlyMatrixTable()" style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:999px;padding:4px 12px;font-size:11.5px;font-weight:700;color:#64748B;cursor:pointer;">
            ✕ Close Matrix
          </button>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
            <thead>
              <tr style="background:#F1F5F9;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px 14px;">Month</th>
                <th style="padding:10px 14px;text-align:right;">🟢 Offline (Direct)</th>
                <th style="padding:10px 14px;text-align:right;">🔴 Online Paid</th>
                <th style="padding:10px 14px;text-align:right;">🌸 Online Upcoming</th>
                <th style="padding:10px 14px;text-align:right;">🌟 Total Revenue</th>
                <th style="padding:10px 14px;text-align:center;">Channel Split (Off / On)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background:#0F172A;color:#FFFFFF;font-weight:900;font-size:12.5px;">
                <td style="padding:12px 14px;">2026 FULL YEAR</td>
                <td style="padding:12px 14px;text-align:right;color:#34D399;font-family:monospace;">₹${totOff.toLocaleString('en-IN')}</td>
                <td style="padding:12px 14px;text-align:right;color:#FB7185;font-family:monospace;">₹${totPaid.toLocaleString('en-IN')}</td>
                <td style="padding:12px 14px;text-align:right;color:#F472B6;font-family:monospace;">₹${totUpc.toLocaleString('en-IN')}</td>
                <td style="padding:12px 14px;text-align:right;color:#FDE047;font-family:monospace;font-size:14px;">₹${grandTot.toLocaleString('en-IN')}</td>
                <td style="padding:12px 14px;text-align:center;color:#E2E8F0;font-size:11.5px;">
                  ${grandOffPct}% Offline · ${grandOnPct}% Online
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    window.toggleMonthlyMatrixTable = function() {
      const wrap = document.getElementById('perfMonthlyMatrixWrap');
      const btn = document.getElementById('btnToggleMatrixTable');
      if (!wrap) return;
      const isHidden = wrap.style.display === 'none' || !wrap.style.display;
      wrap.style.display = isHidden ? 'block' : 'none';
      if (btn) {
        btn.innerHTML = isHidden ? '<span>✕</span> <span>Hide Matrix</span>' : '<span>📋</span> <span>Monthly Matrix Breakdown</span>';
      }
      if (isHidden) {
        wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
  }
}
window.initExecutiveDashboardCharts = initExecutiveDashboardCharts;
