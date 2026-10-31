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
      ? Math.floor(delayMin/60) + 'h ' + (delayMin%60) + 'm'
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
    else eta = 'in ' + Math.floor(diff/60) + 'h ' + (diff%60) + 'm';
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
window.getRatingBadge = function(rating) {
  if (rating === 'good') return ' <span title="Trusted guest" style="font-size:12px;">⭐</span>';
  if (rating === 'bad') return ' <span title="Bad rating - see notes" style="font-size:12px;color:#DC2626;">⚠️</span>';
  if (rating === 'normal') return ' <span title="Normal guest" style="font-size:10px;opacity:0.6;">😐</span>';
  return '';
};

window.openBookingFromDashboard = function(bkId) {
  if (typeof editBooking === 'function') {
    editBooking(bkId);
  } else if (typeof navigate === 'function') {
    navigate('bookings');
    setTimeout(() => {
      if (typeof highlightEntity === 'function') highlightEntity(bkId, 'booking');
    }, 800);
  }
};

// WhatsApp action fallbacks if undefined in whatsapp.js
window.sendCheckinReminder = window.sendCheckinReminder || function(bkId) {
  if (typeof shareBookingWhatsApp === 'function') shareBookingWhatsApp(bkId);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('WhatsApp', 'Opening message templates');
};

window.requestGuestID = window.requestGuestID || function(bkId) {
  if (typeof showPendingIdModal === 'function') showPendingIdModal(0);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('ID Request', 'Opening ID Modal');
};

window.requestReview = window.requestReview || function(bkId) {
  if (typeof requestGoogleReview === 'function') requestGoogleReview(bkId);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('Review', 'Opening review template');
};

// Interactive Tab State
window._activeDashTab = window._activeDashTab || 'flow';
window.switchDashTab = function(tabKey, btn) {
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
window.filterRoomMatrix = function(status, btn) {
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
window.formatAirbnbDateRange = function(inStr, outStr) {
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
  } catch(e) {
    return inStr;
  }
};

window.getAirbnbGuestNarrative = function(b, feedType) {
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

window.getAirbnbPropertySubtitle = function(b) {
  if (!b) return 'The Unique Haven Homes';
  const base = (window.ShowcaseData && window.ShowcaseData.BASELINE && window.ShowcaseData.BASELINE[b.room_id]) || {};
  if (base.name && base.area_name) {
    return `${base.name} / ${base.area_name}`;
  }
  return b.rooms?.property_name || base.name || (typeof propLabel === 'function' ? propLabel(b.rooms) : '') || b.room_id || 'The Unique Haven Homes';
};

window.renderAirbnbOverlappingMedia = function(b) {
  if (!b) return '';
  const base = (window.ShowcaseData && window.ShowcaseData.BASELINE && window.ShowcaseData.BASELINE[b.room_id]) || {};
  const coverImg = base.cover_image || 'assets/logo-emblem.png';
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

window.renderAirbnbResCard = function(b, feedType) {
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

window.renderAirbnbGuestItem = function(b, feedType) {
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
  } catch(e) { console.warn('Auto overflow fix failed:', e); }

  const activeUsers = await getActiveUsers();

  const today = getLocalDateString();
  const day7 = dateAdd(today, 7);
  const monthStart = today.slice(0, 7) + '-01';
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = today.slice(0, 7) + '-' + String(lastDay).padStart(2, '0');

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

  window.switchAirbnbFeedTab = function(tab) {
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
        border-left: 5px solid var(--primary);
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
        color: var(--primary);
        cursor: pointer;
        text-decoration: none;
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
      ${['owner','admin'].includes(SESSION.role) ? syncInfoHTML() : ''}
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

      <!-- HERO HEADER -->
      <div class="dash-hero">
        <div class="dash-hero-top">
          <div class="dash-title-group">
            <div class="dash-greeting">
              <span>${greetEmoji}</span> ${greeting}, ${userName}
            </div>
            <div class="dash-heading" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span>Executive Dashboard</span>
              ${globalProp ? `
                <span style="font-size:12px;font-weight:700;background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;padding:2px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;">
                  🏘️ ${(window._globalRoomsList || []).find(r => r.room_id === globalProp)?.nickname || globalProp}
                  <span onclick="window.handleGlobalPropertyFilterChange('')" style="cursor:pointer;font-weight:900;color:#DC2626;padding-left:4px;" title="Clear property filter">✕</span>
                </span>
              ` : ''}
            </div>
            <div class="dash-date-str">
              ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              &bull; <strong>${bookedNow.length}</strong>/${totalProps} Units ${globalProp ? 'Booked' : `Occupied (${occupancyPct}%)`}
            </div>
          </div>

          <div class="dash-hero-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button class="dash-pill-btn" onclick="renderDashboard()" title="Refresh live data"><i class="ti ti-refresh"></i> Refresh</button>
            <button type="button" class="dash-pill-btn" style="background:#FFEBE8;color:#EA3829;border:1px solid #FECACA;border-radius:999px;font-weight:700;padding:7px 14px;display:inline-flex;align-items:center;gap:6px;" onclick="window.openCustomPaymentQRModal(${globalProp ? `{ roomId: '${globalProp}' }` : ''})" title="Create & Send Custom UPI Payment QR to Guest">
              <span><i class="ti ti-qrcode"></i></span> <span>Payment QR</span>
            </button>
            ${SESSION.role === 'developer' ? `
            <div class="dash-online-badge" onclick="showActiveUsersModal()" title="Click to see online users" style="cursor:pointer;padding:6px 12px;border-radius:999px;">
              <span class="dash-online-dot"></span>
              <span style="font-size:12px;font-weight:700;">${activeUsers.length} online</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- HERO KPI RIBBON (4 CORE METRICS) -->
      <div class="dash-kpi-ribbon">
        <!-- KPI 1: Occupancy -->
        <div class="dash-kpi-card occupancy" onclick="filterAndShowFlats('occupied')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Live Occupancy</span>
            <div class="dash-kpi-icon occupancy"><i class="ti ti-bed"></i></div>
          </div>
          <div class="dash-kpi-num">${occupancyPct}%</div>
          <div class="dash-kpi-sub">${bookedNow.length} of ${totalProps} flats booked</div>
          <div class="dash-progress-bar">
            <div class="dash-progress-fill" style="width:${occupancyPct}%;"></div>
          </div>
        </div>

        <!-- KPI 2: Today's Check-ins -->
        <div class="dash-kpi-card checkins" onclick="filterAndShowBookings('checkinToday')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Today's Check-ins</span>
            <div class="dash-kpi-icon checkins"><i class="ti ti-login"></i></div>
          </div>
          <div class="dash-kpi-num">${realCheckins.length}</div>
          <div class="dash-kpi-sub">${realCheckins.filter(x => x.actual_checkin).length} already checked-in &bull; ${realCheckins.filter(x => !x.actual_checkin).length} pending</div>
        </div>

        <!-- KPI 3: Today's Check-outs -->
        <div class="dash-kpi-card checkouts" onclick="filterAndShowBookings('checkoutToday')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Today's Check-outs</span>
            <div class="dash-kpi-icon checkouts"><i class="ti ti-logout"></i></div>
          </div>
          <div class="dash-kpi-num">${realCheckouts.length}</div>
          <div class="dash-kpi-sub">${realCheckouts.filter(x => x.actual_checkout).length} departed &bull; ${realCheckouts.filter(x => !x.actual_checkout).length} remaining</div>
        </div>

        <!-- KPI 4: Today's Financial Flow -->
        <div class="dash-kpi-card revenue" onclick="filterAndShowBookings('todayRevenue')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Today's Booking Value</span>
            <div class="dash-kpi-icon revenue"><i class="ti ti-cash"></i></div>
          </div>
          <div class="dash-kpi-num">₹${todayRevenue.toLocaleString('en-IN')}</div>
          <div class="dash-kpi-sub" style="color:var(--text-secondary);">
            Collected: <strong style="color:var(--green);">₹${todayCollected.toLocaleString('en-IN')}</strong> &bull; Due: <strong style="color:var(--red);">₹${todayPending.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      <!-- SEGMENTED NAVIGATION TABS -->
      <div class="dash-nav-bar">
        <button class="dash-nav-tab ${window._activeDashTab === 'flow' ? 'active' : ''}" data-tab="flow" onclick="switchDashTab('flow', this)">
          <i class="ti ti-bed"></i> Guest Flow <span class="dash-tab-badge">${realCheckins.length + realCheckouts.length}</span>
        </button>
        <button class="dash-nav-tab ${window._activeDashTab === 'rooms' ? 'active' : ''}" data-tab="rooms" onclick="switchDashTab('rooms', this)">
          <i class="ti ti-home-check"></i> Rooms & Care <span class="dash-tab-badge">${dirty.length + freeClean.length}</span>
        </button>
        <button class="dash-nav-tab ${window._activeDashTab === 'ops' ? 'active' : ''}" data-tab="ops" onclick="switchDashTab('ops', this)">
          <i class="ti ti-id-badge-2"></i> Staff & Tasks <span class="dash-tab-badge">${presentToday}/${totalEmps}</span>
        </button>
        <button class="dash-nav-tab ${window._activeDashTab === 'wa' ? 'active' : ''}" data-tab="wa" onclick="switchDashTab('wa', this)">
          <i class="ti ti-brand-whatsapp"></i> WhatsApp Tasks <span class="dash-tab-badge">${totalWATasks}</span>
        </button>
      </div>

      <!-- TAB 1: GUEST FLOW (CHECK-INS, CHECK-OUTS, ATTENTION, ACTIVE STAYS) -->
      <div class="dash-tab-pane ${window._activeDashTab === 'flow' ? 'active' : ''}" id="dash-tab-flow">
        <!-- Attention Needed Box (Late checkouts / Arriving soon / Laundry reminders) -->
        <div class="dash-attention-card ${totalAttention === 0 ? 'all-clear' : ''}" id="dashAttentionCard">
          <div class="dash-attention-header">
            <div class="dash-attention-title">
              <span><i class="ti ti-alert-triangle"></i></span> Attention Needed (<span style="color:var(--primary);font-weight:900;">${totalAttention}</span>)
            </div>
            ${totalAttention > 0 ? `<span class="badge yellow" style="font-size:11px;">Immediate Action Required</span>` : `<span class="badge green" style="font-size:11px;">All on track ✅</span>`}
          </div>
          <div id="dashAttentionContent" style="max-height:260px;overflow-y:auto;">
            ${lateCheckouts.length > 0 ? `
              <div style="margin-bottom:12px;">
                <div style="font-size:12px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  🚨 Late Check-outs (${lateCheckouts.length})
                </div>
                ${lateCheckouts.map(x => `
                  <div class="dash-guest-item alert-late">
                    <div class="dash-guest-info">
                      <div class="dash-guest-primary">
                        <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                        ${getRatingBadge(x.client_rating)}
                        <span class="dash-unit-chip">${bName(x)}</span>
                      </div>
                      <div class="dash-guest-meta" style="color:var(--red);">
                        <strong>⚠️ ${x.delay} late</strong> &bull; Scheduled checkout: ${x.check_out_time || '11:00 AM'}
                        ${x.phone ? `&bull; 📞 <a href="tel:${x.phone}">${x.phone}</a>` : ''}
                      </div>
                    </div>
                    <div class="dash-action-icons">
                      ${x.phone ? `<a href="tel:${x.phone}" class="dash-icon-btn" title="Call Guest">📞</a>` : ''}
                      ${x.phone ? `<button class="dash-icon-btn wa" onclick="sendCheckoutReminder('${x.booking_id}')" title="Send WhatsApp Checkout Alert">💬</button>` : ''}
                      <button class="dash-pill-btn" style="padding:5px 10px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">View</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${arrivingSoon.length > 0 ? `
              <div style="margin-top:8px;">
                <div style="font-size:12px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  ⏳ Arriving Soon (${arrivingSoon.length})
                </div>
                ${arrivingSoon.map(x => `
                  <div class="dash-guest-item alert-arriving">
                    <div class="dash-guest-info">
                      <div class="dash-guest-primary">
                        <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                        ${getRatingBadge(x.client_rating)}
                        <span class="dash-unit-chip">${bName(x)}</span>
                      </div>
                      <div class="dash-guest-meta" style="color:var(--blue);">
                        <strong>🕐 Expected ${x.eta}</strong> (${x.check_in_time || '2:00 PM'})
                        ${x.phone ? `&bull; 📞 <a href="tel:${x.phone}">${x.phone}</a>` : ''}
                      </div>
                    </div>
                    <div class="dash-action-icons">
                      ${x.phone ? `<button class="dash-pill-btn primary" style="padding:5px 10px;font-size:11px;" onclick="sendArrivalDetails('${x.booking_id}')">🔑 Send Keys+WiFi</button>` : ''}
                      <button class="dash-pill-btn" style="padding:5px 10px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">View</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${totalAttention === 0 ? `
              <div class="sub" style="margin:4px 0 0;color:var(--green);font-size:13px;font-weight:600;">✅ All check-ins and check-outs are running smoothly on schedule.</div>
            ` : ''}
          </div>
        </div>

        <!-- AIRBNB HOSTING FEED VIEW (EXACT USER SCREENSHOT SPEC) -->
        <div class="airbnb-view-toggle-bar">
          <div class="airbnb-pill-toggle">
            <button type="button" class="airbnb-toggle-btn active" id="airbnbTabBtnToday" onclick="window.switchAirbnbFeedTab('today')">Today</button>
            <button type="button" class="airbnb-toggle-btn" id="airbnbTabBtnUpcoming" onclick="window.switchAirbnbFeedTab('upcoming')">Upcoming</button>
          </div>
          <div class="airbnb-filter-wrap">
            ${globalProp ? `
              <button type="button" class="airbnb-filter-btn active" onclick="window.openPropertyFilterDialog()" title="Change or clear property filter">
                <span>🏛️ ${escapeHtml((window._globalRoomsList || []).find(r => (r.room_id||'').toUpperCase() === globalProp.toUpperCase())?.nickname || globalProp)}</span>
                <span onclick="event.stopPropagation(); window.handleGlobalPropertyFilterChange('');" style="font-weight:900;color:#DC2626;padding-left:4px;font-size:13px;" title="Clear filter">✕</span>
              </button>
            ` : `
              <button type="button" class="airbnb-filter-btn" onclick="window.openPropertyFilterDialog()" title="Filter reservations by property">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"/></svg>
                <span>Filter</span>
              </button>
            `}
          </div>
        </div>

        ${globalProp ? `
          <div style="max-width:860px;margin:0 auto 16px;background:#FFF5F4;border:1px solid #FECACA;padding:10px 16px;border-radius:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 1px 3px rgba(234,56,41,0.06);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">🏛️</span>
              <span style="font-size:13px;font-weight:700;color:#991B1B;">
                Filtered view for: <strong>${escapeHtml((window._globalRoomsList || []).find(r => (r.room_id||'').toUpperCase() === globalProp.toUpperCase())?.nickname || globalProp)}</strong>
              </span>
            </div>
            <button type="button" onclick="window.handleGlobalPropertyFilterChange('')" style="background:#fff;border:1px solid #FECACA;color:#EA3829;font-weight:800;font-size:12px;padding:4px 12px;border-radius:20px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
              Show All Properties <span>✕</span>
            </button>
          </div>
        ` : ''}

        <h2 class="airbnb-feed-heading" id="airbnbFeedHeading">You have ${totalTodayReservations} reservations</h2>

        <!-- 1. TODAY'S RESERVATIONS LIST -->
        <div class="airbnb-feed-list" id="airbnbFeedTodayList">
          ${totalTodayReservations === 0 ? `
            <div class="card" style="text-align:center;padding:48px 20px;border-radius:18px;border:1px dashed #cbd5e1;max-width:860px;margin:0 auto;width:100%;">
              <div style="font-size:36px;margin-bottom:8px;">🏖️</div>
              <div style="font-size:16px;font-weight:700;color:#1e293b;">No check-ins, check-outs, or active stays today${globalProp ? ' for this property' : ''}</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">
                ${globalProp ? `<a href="javascript:void(0)" onclick="window.handleGlobalPropertyFilterChange('')" style="color:#EA3829;font-weight:700;text-decoration:underline;">Click here to show all properties</a> or check` : 'Check'} upcoming reservations above.
              </div>
            </div>
          ` : `
            ${realCheckouts.map(b => renderAirbnbResCard(b, 'checkout')).join('')}
            ${realCheckins.map(b => renderAirbnbResCard(b, 'checkin')).join('')}
            ${activeNow.map(b => renderAirbnbResCard(b, 'inhouse')).join('')}
          `}
        </div>

        <!-- 2. UPCOMING RESERVATIONS LIST -->
        <div class="airbnb-feed-list" id="airbnbFeedUpcomingList" style="display:none;">
          ${upcomingReservations.length === 0 ? `
            <div class="card" style="text-align:center;padding:48px 20px;border-radius:18px;border:1px dashed #cbd5e1;max-width:860px;margin:0 auto;width:100%;">
              <div style="font-size:36px;margin-bottom:8px;">📅</div>
              <div style="font-size:16px;font-weight:700;color:#1e293b;">No upcoming reservations found${globalProp ? ' for this property' : ''}</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">
                ${globalProp ? `<a href="javascript:void(0)" onclick="window.handleGlobalPropertyFilterChange('')" style="color:#EA3829;font-weight:700;text-decoration:underline;">Clear filter</a> or add a new booking.` : 'Add a new booking or import from channel manager.'}
              </div>
            </div>
          ` : `
            ${upcomingReservations.map(b => renderAirbnbResCard(b, 'upcoming')).join('')}
          `}
        </div>

        <!-- 3. YOUR FOLLOW-UPS SECTION (SCREENSHOT 3) -->
        ${checkoutFollowups.length > 0 ? `
          <div class="airbnb-followups-wrap">
            <h3 style="font-size:20px;font-weight:800;color:#111827;margin-bottom:14px;letter-spacing:-0.3px;">Your follow-ups</h3>
            <div class="airbnb-followups-grid">
              ${checkoutFollowups.map(b => {
                const base = (window.ShowcaseData && window.ShowcaseData.BASELINE && window.ShowcaseData.BASELINE[b.room_id]) || {};
                const coverImg = base.cover_image || 'assets/logo-emblem.png';
                const fName = (b.guest_name || 'Guest').split(' ')[0];
                const initial = fName.charAt(0).toUpperCase() || 'G';
                const daysDiff = Math.max(1, Math.round((new Date(today) - new Date(b.check_out)) / (1000 * 60 * 60 * 24)));
                return `
                  <div class="airbnb-followup-card" onclick="if(window.openBookingFromDashboard) openBookingFromDashboard('${b.booking_id}')">
                    <div class="airbnb-followup-media">
                      <div class="airbnb-avatar-bubble" style="width:36px;height:36px;font-size:13px;">${initial}</div>
                      <img src="${coverImg}" class="airbnb-thumb-bubble" style="width:32px;height:32px;" onerror="this.onerror=null;this.src='assets/logo-emblem.png';" />
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:11px;color:#717171;font-weight:600;">${daysDiff}d ago</div>
                      <div style="font-size:13.5px;font-weight:800;color:#111827;">Leave ${escapeHtml(fName)} a review</div>
                      <div style="font-size:11.5px;color:#717171;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${escapeHtml(base.name || propLabel(b.rooms) || 'The Unique Haven Homes')}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- TAB 2: ROOMS & HOUSEKEEPING -->
      <div class="dash-tab-pane ${window._activeDashTab === 'rooms' ? 'active' : ''}" id="dash-tab-rooms">
        <div class="dash-ops-grid">
          <!-- Ready to Book -->
          <div class="dash-panel-card" style="border-top:4px solid var(--green);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>✅</span> Ready to Book
              </div>
              <span class="dash-panel-count green">${freeClean.length} Clean & Free</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
              ${freeClean.length === 0 ? `<div class="dash-empty-state">No clean, free flats available right now</div>` :
                freeClean.map(x => `
                  <div class="dash-guest-item status-ready" onclick="navigate('flats')" style="cursor:pointer;">
                    <div>
                      <strong style="color:var(--green);font-size:13px;">${fName(x)}</strong>
                      <div style="font-size:11px;color:var(--muted);">Clean & Ready for Guest</div>
                    </div>
                    <span class="badge green">Ready</span>
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="filterAndShowFlats('clean')">Open Flats Manager →</button>
          </div>

          <!-- Need Cleaning -->
          <div class="dash-panel-card" style="border-top:4px solid var(--yellow);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>🧹</span> Housekeeping Required
              </div>
              <span class="dash-panel-count yellow">${dirty.length} Dirty</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
              ${dirty.length === 0 ? `<div class="dash-empty-state">All flats are sparkling clean! 🎉</div>` :
                dirty.map(x => `
                  <div class="dash-guest-item status-dirty" onclick="navigate('flats')" style="cursor:pointer;">
                    <div>
                      <strong style="color:var(--yellow);font-size:13px;">${fName(x)}</strong>
                      <div style="font-size:11px;color:var(--muted);">Needs Turnover / Cleaning</div>
                    </div>
                    <span class="badge yellow">Needs Cleaning</span>
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="filterAndShowFlats('dirty')">Assign Cleaning →</button>
          </div>

          <!-- Maintenance Tickets -->
          <div class="dash-panel-card" style="border-top:4px solid var(--red);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>🔧</span> Active Maintenance
              </div>
              <span class="dash-panel-count red">${maintPending} Issues</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
              ${filteredMaint.length === 0 ? `<div class="dash-empty-state">No pending maintenance issues! ✅</div>` :
                filteredMaint.map(m => `
                  <div class="dash-guest-item status-maint" onclick="navigate('maintenance')" style="cursor:pointer;">
                    <div>
                      <strong style="color:var(--red);font-size:13px;">${m.room_id || 'General'}</strong>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${m.description?.slice(0, 45) || '-'}</div>
                    </div>
                    <span class="badge red" style="font-size:10px;">${m.priority || 'Pending'}</span>
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="navigate('maintenance')">Open Maintenance Hub →</button>
          </div>
        </div>
      </div>

      <!-- TAB 3: STAFF & TASKS -->
      <div class="dash-tab-pane ${window._activeDashTab === 'ops' ? 'active' : ''}" id="dash-tab-ops">
        <div class="dash-ops-grid">
          <!-- Staff Attendance Card -->
          <div class="dash-panel-card" style="border-top:4px solid var(--green);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>👥</span> Staff Attendance Today
              </div>
              <span class="dash-panel-count green">${presentToday}/${totalEmps} Present</span>
            </div>
            <div style="padding:14px 0;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:var(--text);">${presentToday} <span style="font-size:18px;color:var(--muted);font-weight:500;">/ ${totalEmps}</span></div>
              <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Team members checked-in for duty today</div>
            </div>
            <button class="dash-pill-btn" style="width:100%;justify-content:center;" onclick="filterAndShowAttendance('present')">View Attendance Log →</button>
          </div>

          <!-- Pending Employee Tasks -->
          <div class="dash-panel-card" style="border-top:4px solid ${urgentTasks > 0 ? 'var(--red)' : 'var(--yellow)'};">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>🧰</span> Pending Tasks
              </div>
              <span class="dash-panel-count yellow">${filteredTasks.length} Open</span>
            </div>
            <div style="max-height:260px;overflow-y:auto;">
              ${filteredTasks.length === 0 ? `<div class="dash-empty-state">All tasks completed! 👍</div>` :
                filteredTasks.slice(0, 5).map(t => `
                  <div class="dash-guest-item" onclick="navigate('tasks')" style="cursor:pointer;">
                    <div>
                      <strong style="font-size:12.5px;color:var(--text);">${t.employees?.name || 'Unassigned'}</strong>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${t.task_description?.slice(0, 45) || '-'}</div>
                    </div>
                    ${t.priority === 'Urgent' ? `<span class="badge red">Urgent</span>` : `<span class="badge yellow">Normal</span>`}
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="navigate('tasks')">Manage Tasks →</button>
          </div>
        </div>

        <!-- Extended Stays & Room Shifts -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
          ${extendedWithParent.length > 0 ? `
            <div class="dash-panel-card" style="border-left:4px solid var(--yellow);">
              <div class="dash-panel-head">
                <div class="dash-panel-title">
                  <span>🔄</span> Extended Stays (${extendedWithParent.length})
                </div>
                <span class="badge yellow">Last 30 Days</span>
              </div>
              <div style="max-height:260px;overflow-y:auto;">
                ${extendedWithParent.slice(0, 6).map(({ext, parent}) => `
                  <div class="dash-guest-item">
                    <div>
                      <strong style="color:var(--primary);cursor:pointer;" onclick="openBookingFromDashboard('${ext.booking_id}')">${ext.guest_name}</strong>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                        ${propLabel(ext.rooms) || ext.room_id} &bull; Extended till: <strong style="color:var(--green);">${ext.check_out || 'Open'}</strong>
                      </div>
                    </div>
                    <div style="font-weight:700;color:var(--green);font-size:12px;">₹${(ext.total_amount || 0).toLocaleString('en-IN')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>

      <!-- TAB 4: WHATSAPP QUICK ACTIONS -->
      <div class="dash-tab-pane ${window._activeDashTab === 'wa' ? 'active' : ''}" id="dash-tab-wa">
        <div class="dash-panel-card" style="border-top:4px solid #25D366;">
          <div class="dash-panel-head">
            <div class="dash-panel-title" style="color:#128C7E;">
              <span>📱</span> WhatsApp Communication Tasks (${totalWATasks})
            </div>
            <span class="badge green">One-Tap Action</span>
          </div>

          ${totalWATasks === 0 ? `
            <div class="dash-empty-state" style="padding:40px 20px;">
              <div style="font-size:32px;margin-bottom:8px;">🎉</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);">All WhatsApp communications up to date!</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:4px;">No pending reminders, key deliveries, or ID requests for today.</div>
            </div>
          ` : `
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;">
              Click any button below to prepare and send personalized WhatsApp updates directly to guests.
            </div>

            ${checkinReminders.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#00A699;text-transform:uppercase;margin-bottom:8px;">
                  📅 Check-in Reminders (${checkinReminders.length}) &bull; Guests arriving tomorrow
                </div>
                ${checkinReminders.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Check-in: ${b.check_in} ${b.check_in_time || ''}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#00A699;border-color:#00A699;font-size:11.5px;padding:6px 12px;" onclick="sendCheckinReminder('${b.booking_id}')">
                      📅 Send Reminder
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${arrivingSoonWA.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#E2725B;text-transform:uppercase;margin-bottom:8px;">
                  🔑 Arrival Details (${arrivingSoonWA.length}) &bull; Send WiFi & Key details
                </div>
                ${arrivingSoonWA.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Check-in: ${b.check_in_time || '14:00'}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#E2725B;border-color:#E2725B;font-size:11.5px;padding:6px 12px;" onclick="sendArrivalDetails('${b.booking_id}')">
                      🔑 Send Keys + WiFi
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${checkoutReminders.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#FF385C;text-transform:uppercase;margin-bottom:8px;">
                  📤 Checkout Alerts (${checkoutReminders.length}) &bull; Leaving today
                </div>
                ${checkoutReminders.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Checkout: ${b.check_out_time || '11:00 AM'}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#FF385C;border-color:#FF385C;font-size:11.5px;padding:6px 12px;" onclick="sendCheckoutReminder('${b.booking_id}')">
                      🔔 Checkout Alert
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${noIdBookings.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#D97706;text-transform:uppercase;margin-bottom:8px;">
                  🪪 ID Missing (${noIdBookings.length}) &bull; Currently staying without ID proof
                </div>
                ${noIdBookings.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Guests: ${b.guests || 1}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#D97706;border-color:#D97706;font-size:11.5px;padding:6px 12px;" onclick="requestGuestID('${b.booking_id}')">
                      🪪 Request ID
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${reviewRequests.length ? `
              <div style="margin-bottom:12px;">
                <div style="font-size:12.5px;font-weight:800;color:#7C3AED;text-transform:uppercase;margin-bottom:8px;">
                  ⭐ Review Requests (${reviewRequests.length}) &bull; Checked out recently
                </div>
                ${reviewRequests.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Stayed: ${b.check_in} → ${b.check_out}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#7C3AED;border-color:#7C3AED;font-size:11.5px;padding:6px 12px;" onclick="requestReview('${b.booking_id}')">
                      ⭐ Request Review
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          `}
        </div>
      </div>

      <!-- NEXT 7 DAYS BOOKINGS (ALWAYS VISIBLE OVERVIEW) -->
      <div class="dash-panel-card" style="margin-top:20px;">
        <div class="dash-panel-head">
          <div class="dash-panel-title">
            <span>📅</span> Upcoming Arrivals (Next 7 Days &bull; ${upcoming7.length} Bookings)
          </div>
          <button class="dash-pill-btn" style="padding:4px 10px;font-size:11.5px;" onclick="navigate('bookings')">All Bookings →</button>
        </div>
        ${upcoming7.length === 0 ? `<div class="dash-empty-state">No upcoming bookings in the next 7 days</div>` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Check-in</th>
                  <th>Guest Name</th>
                  <th>Property</th>
                  <th>Contact</th>
                  <th style="text-align:right;">Amount</th>
                  <th style="text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${upcoming7.slice(0, 10).map(x => `
                  <tr>
                    <td style="font-size:12.5px;white-space:nowrap;">
                      <strong>${x.check_in}</strong>
                      <div style="font-size:11px;color:var(--muted);">${x.check_in_time || '2:00 PM'}</div>
                    </td>
                    <td>
                      <strong style="cursor:pointer;color:var(--primary);" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>
                      ${getRatingBadge(x.client_rating)}
                    </td>
                    <td style="font-size:12px;"><span class="dash-unit-chip">${bName(x)}</span></td>
                    <td style="font-size:12px;">
                      ${x.phone ? `<a href="tel:${x.phone}" style="color:var(--text-secondary);text-decoration:none;">📞 ${x.phone}</a>` : '-'}
                    </td>
                    <td style="text-align:right;font-weight:700;color:#059669;font-size:13px;">
                      ₹${(x.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style="text-align:center;">
                      <button class="dash-pill-btn" style="padding:3px 8px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">View</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
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
  }).sort((a,b) => (b.check_in || '').localeCompare(a.check_in || ''));

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
  msg += '*' + rangeLabel + ' · ' + new Date(today).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) + '*' + NL;
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
            const timeStr = secAgo < 60 ? `${secAgo}s ago` : `${Math.floor(secAgo/60)}m ago`;
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
window.openPropertyFilterDialog = function() {
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
              <div style="font-size:12px;color:#717171;">Combined view across all 18 homestays</div>
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

window.filterPropListInDialog = function(query) {
  const q = (query || '').trim().toLowerCase();
  const items = document.querySelectorAll('#propFilterList .prop-filter-item[data-query]');
  items.forEach(it => {
    const hay = it.dataset.query || '';
    it.style.display = hay.includes(q) ? 'flex' : 'none';
  });
};

window.selectPropertyFromDialog = function(roomId) {
  document.getElementById('propFilterModal')?.remove();
  window.handleGlobalPropertyFilterChange(roomId);
};

console.log('✅ Modern Dashboard module loaded');
