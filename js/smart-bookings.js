/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES (UHHS) — SMART BOOKING SYSTEM (Next-Gen)
 * Developer: Praveen Singh
 * Zero-Error, Fast, Mobile-First Booking Engine & Command Center
 * =====================================================================
 */

window._sbkState = {
  activeTab: 'today',        // 'today', 'upcoming', 'inhouse', 'all', 'arrivals', 'departures', 'due', 'pending', 'airbnb', 'direct'
  viewMode: 'airbnb',        // 'airbnb' (default!) | 'cards' | 'table'
  searchQuery: '',
  propertyFilter: '',
  channelFilter: '',         // '', 'airbnb', 'direct'
  paymentFilter: '',         // '', 'due', 'paid'
  showFilters: false,        // boolean toggle for filter tray
  periodFilter: 'all',       // 'today', 'thisMonth', 'all'
  drawerBookingId: null,
  cachedBookings: [],
  cachedRooms: [],
  cachedPaidMap: {},
  classicMode: false         // toggleable if classic view is ever desired
};

// =====================================================================
// 1. MAIN COMMAND CENTER: RENDER MANAGE BOOKINGS (Airbnb Host Style)
// =====================================================================
async function renderSmartManageBookings() {
  if (window._sbkState.classicMode && typeof window.renderClassicManageBookings === 'function') {
    return window.renderClassicManageBookings();
  }

  const today = new Date().toISOString().slice(0, 10);
  renderShell(`<div class="loading" style="padding:40px;text-align:center;"><div class="spinner"></div><div style="margin-top:10px;font-weight:600;color:var(--muted);">Loading UHHS Bookings Command Center...</div></div>`, 'bookings');

  // Preload helpers
  if (typeof preloadUserNames === 'function') await preloadUserNames();
  if (typeof preloadGuestStays === 'function') await preloadGuestStays();

  // Role assigned rooms for caretaker
  if (['caretaker', 'checkin_manager'].includes(SESSION.role) && SESSION.empId) {
    const { data: emp } = await sb.from('employees').select('assigned_rooms').eq('emp_id', SESSION.empId).single();
    if (emp?.assigned_rooms) {
      window._myAssignedRooms = emp.assigned_rooms.split(',').map(r => r.trim()).filter(Boolean);
    }
  }

  // Fetch payments map
  const { data: allPays } = await sb.from('payment_history')
    .select('booking_id, amount, payment_date, verification_status')
    .neq('verification_status', 'rejected');
  
  const paidMap = {};
  (allPays || []).forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });
  window._bkPaidMap = paidMap;
  window._sbkState.cachedPaidMap = paidMap;

  // Fetch all bookings
  const { data: all, error } = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name)')
    .order('check_in', { ascending: false });

  if (error) {
    renderShell(`<div class="card"><div class="error">❌ Error loading bookings: ${escapeHtml(error.message)}</div></div>`, 'bookings');
    return;
  }

  // Fetch rooms
  const { data: rooms } = await sb.from('rooms').select('room_id, unit_no, nickname, property_name, rent_per_night').order('unit_no');
  window._roomsCache = rooms || [];
  window._sbkState.cachedRooms = rooms || [];
  window._allBookings = all || [];
  window._sbkState.cachedBookings = all || [];

  // Compute operational KPIs
  let activeBookings = (all || []).filter(b => !b.is_cancelled && b.verification_status !== 'rejected');
  if (window._myAssignedRooms?.length) {
    activeBookings = activeBookings.filter(b => window._myAssignedRooms.includes(b.room_id));
  }

  const arrivalsCount = activeBookings.filter(b => b.check_in === today).length;
  const departuresCount = activeBookings.filter(b => b.check_out === today && b.checkout_confirmed !== false).length;
  // Real in-house stays: check_in <= today AND checkout is strictly in the future (or open-ended without checkout date)
  const inHouseCount = activeBookings.filter(b => b.check_in <= today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false))).length;

  // Active reservations for Today: Departures today + Arrivals today + Ongoing stays spanning today
  const todayCount = activeBookings.filter(b => {
    const isArrival = b.check_in === today;
    const isDeparture = b.check_out === today;
    const isStaying = b.check_in < today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false));
    return isArrival || isDeparture || isStaying;
  }).length;

  const upcomingCount = activeBookings.filter(b => b.check_in > today).length;
  
  let totalBalanceDue = 0;
  let dueCount = 0;
  activeBookings.forEach(b => {
    const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
    if (isOnline && (b.total_amount === 0 || b.payment_status === 'Pending CSV Payout')) return;
    const pd = paidMap[b.booking_id] || 0;
    const tot = b.total_amount || 0;
    const due = tot - pd;
    if (due > 0.99) {
      totalBalanceDue += due;
      dueCount++;
    }
  });

  const pendingApprovalsCount = (all || []).filter(b => b.verification_status === 'pending').length;

  // Apply filters
  let filtered = [...(all || [])];
  if (window._myAssignedRooms?.length) {
    filtered = filtered.filter(b => window._myAssignedRooms.includes(b.room_id));
  }

  const tab = window._sbkState.activeTab || 'today';
  if (tab === 'today') {
    filtered = filtered.filter(b => {
      if (b.is_cancelled) return false;
      const isArrival = b.check_in === today;
      const isDeparture = b.check_out === today;
      const isStaying = b.check_in < today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false));
      return isArrival || isDeparture || isStaying;
    });
    // Sort today: Departures first (checkout at 11am), then In-House (all day), then Arrivals (2pm)
    filtered.sort((a, b) => {
      const aScore = a.check_out === today ? 0 : (a.check_in === today ? 2 : 1);
      const bScore = b.check_out === today ? 0 : (b.check_in === today ? 2 : 1);
      return aScore - bScore;
    });
  } else if (tab === 'upcoming') {
    filtered = filtered.filter(b => b.check_in > today && !b.is_cancelled);
    // Chronological ascending sort (nearest upcoming stay first)
    filtered.sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  } else if (tab === 'inhouse') {
    filtered = filtered.filter(b => b.check_in <= today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false)) && !b.is_cancelled);
    filtered.sort((a, b) => (a.check_out || '').localeCompare(b.check_out || ''));
  } else if (tab === 'all') {
    // All stays
    filtered.sort((a, b) => (b.check_in || '').localeCompare(a.check_in || ''));
  } else if (tab === 'arrivals') {
    filtered = filtered.filter(b => b.check_in === today && !b.is_cancelled);
  } else if (tab === 'departures') {
    filtered = filtered.filter(b => b.check_out === today && b.checkout_confirmed !== false && !b.is_cancelled);
  } else if (tab === 'due') {
    filtered = filtered.filter(b => {
      if (b.is_cancelled) return false;
      const pd = paidMap[b.booking_id] || 0;
      return (b.total_amount || 0) - pd > 0.99;
    });
  } else if (tab === 'pending') {
    filtered = filtered.filter(b => b.verification_status === 'pending');
  } else if (tab === 'airbnb') {
    filtered = filtered.filter(b => b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code);
  } else if (tab === 'direct') {
    filtered = filtered.filter(b => b.booking_mode !== 'Online-Airbnb' && !b.airbnb_confirmation_code);
  }

  // Secondary filters (from filter tray)
  if (window._sbkState.channelFilter === 'airbnb') {
    filtered = filtered.filter(b => b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code);
  } else if (window._sbkState.channelFilter === 'direct') {
    filtered = filtered.filter(b => b.booking_mode !== 'Online-Airbnb' && !b.airbnb_confirmation_code);
  }

  if (window._sbkState.paymentFilter === 'due') {
    filtered = filtered.filter(b => {
      if (b.is_cancelled) return false;
      const pd = paidMap[b.booking_id] || 0;
      return (b.total_amount || 0) - pd > 0.99;
    });
  } else if (window._sbkState.paymentFilter === 'paid') {
    filtered = filtered.filter(b => {
      if (b.is_cancelled) return false;
      const pd = paidMap[b.booking_id] || 0;
      return (b.total_amount || 0) - pd <= 0.99;
    });
  }

  // Property filter
  if (window._sbkState.propertyFilter) {
    filtered = filtered.filter(b => b.room_id === window._sbkState.propertyFilter);
  }

  // Search filter
  const sq = (window._sbkState.searchQuery || '').trim().toLowerCase();
  if (sq) {
    filtered = filtered.filter(b => 
      (b.guest_name || '').toLowerCase().includes(sq) ||
      (b.phone || '').includes(sq) ||
      (b.booking_id && String(b.booking_id).toLowerCase().includes(sq)) ||
      (b.airbnb_confirmation_code && b.airbnb_confirmation_code.toLowerCase().includes(sq)) ||
      (b.rooms?.nickname && b.rooms.nickname.toLowerCase().includes(sq)) ||
      (b.rooms?.unit_no && String(b.rooms.unit_no).toLowerCase().includes(sq)) ||
      (b.rooms?.property_name && b.rooms.property_name.toLowerCase().includes(sq))
    );
  }

  const canM = ['owner','admin','manager','moderator','developer'].includes(SESSION.role);

  // Active filter count for badge
  let activeFilterCount = 0;
  if (window._sbkState.propertyFilter) activeFilterCount++;
  if (window._sbkState.channelFilter) activeFilterCount++;
  if (window._sbkState.paymentFilter) activeFilterCount++;

  // Determine hero heading like Airbnb
  let heroTitle = '';
  const count = filtered.length;
  if (sq) {
    heroTitle = `${count} reservation${count === 1 ? '' : 's'} matching "${escapeHtml(sq)}"`;
  } else if (tab === 'today') {
    heroTitle = `You have ${count} reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'upcoming') {
    heroTitle = `You have ${count} upcoming reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'inhouse') {
    heroTitle = `You have ${count} in-house stay${count === 1 ? '' : 's'}`;
  } else if (tab === 'all') {
    heroTitle = `You have ${count} reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'due') {
    heroTitle = `You have ${count} reservation${count === 1 ? '' : 's'} with balance due`;
  } else if (tab === 'arrivals') {
    heroTitle = `You have ${count} check-in${count === 1 ? '' : 's'} today`;
  } else if (tab === 'departures') {
    heroTitle = `You have ${count} checkout${count === 1 ? '' : 's'} today`;
  } else if (tab === 'airbnb') {
    heroTitle = `You have ${count} Airbnb reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'direct') {
    heroTitle = `You have ${count} Direct reservation${count === 1 ? '' : 's'}`;
  } else {
    heroTitle = `You have ${count} reservation${count === 1 ? '' : 's'}`;
  }

  // Render View HTML
  const html = `
    <div class="airbnb-host-wrap">
      <!-- Centered Pill Bar & Filter Actions (Matches Airbnb Mobile Header) -->
      <div class="airbnb-header-bar">
        <div class="airbnb-pills-center">
          <button class="airbnb-pill ${tab === 'today' ? 'active' : ''}" onclick="window.setBookingTab('today')">
            Today <span class="airbnb-pill-num">${todayCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'upcoming' ? 'active' : ''}" onclick="window.setBookingTab('upcoming')">
            Upcoming <span class="airbnb-pill-num">${upcomingCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'inhouse' ? 'active' : ''}" onclick="window.setBookingTab('inhouse')">
            In-House <span class="airbnb-pill-num">${inHouseCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'all' ? 'active' : ''}" onclick="window.setBookingTab('all')">
            All <span class="airbnb-pill-num">${all?.length || 0}</span>
          </button>
        </div>

        <div class="airbnb-header-actions">
          <button class="airbnb-filter-trigger ${window._sbkState.showFilters ? 'active' : ''}" onclick="window.toggleAirbnbFilter()" title="Filter Bookings">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            <span class="airbnb-filter-text">Filter</span>
            ${activeFilterCount > 0 ? `<span class="airbnb-pill-num">${activeFilterCount}</span>` : ''}
          </button>

          <div class="airbnb-view-switch">
            <button class="airbnb-view-btn ${window._sbkState.viewMode === 'airbnb' ? 'active' : ''}" onclick="window.toggleViewMode('airbnb')" title="Airbnb Style View">
              🏠 Airbnb
            </button>
            <button class="airbnb-view-btn ${window._sbkState.viewMode === 'cards' ? 'active' : ''}" onclick="window.toggleViewMode('cards')" title="Grid Cards View">
              🗂️ Cards
            </button>
            <button class="airbnb-view-btn ${window._sbkState.viewMode === 'table' ? 'active' : ''}" onclick="window.toggleViewMode('table')" title="Table View">
              📑 Table
            </button>
          </div>
        </div>
      </div>

      <!-- Slide-Down Filter Tray -->
      ${window._sbkState.showFilters ? `
        <div class="airbnb-filter-tray">
          <div class="airbnb-filter-item">
            <label>Property / Unit</label>
            <select onchange="window.handlePropertyFilter(this.value)">
              <option value="">🏠 All Properties (${rooms?.length || 0})</option>
              ${(rooms || []).map(r => `
                <option value="${r.room_id}" ${window._sbkState.propertyFilter === r.room_id ? 'selected' : ''}>
                  ${propLabel(r)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="airbnb-filter-item">
            <label>Booking Channel</label>
            <select onchange="window.handleChannelFilter(this.value)">
              <option value="">All Channels</option>
              <option value="airbnb" ${window._sbkState.channelFilter === 'airbnb' ? 'selected' : ''}>🌐 Airbnb Only</option>
              <option value="direct" ${window._sbkState.channelFilter === 'direct' ? 'selected' : ''}>🏠 Direct Booking Only</option>
            </select>
          </div>
          <div class="airbnb-filter-item">
            <label>Payment Balance</label>
            <select onchange="window.handlePaymentFilter(this.value)">
              <option value="">All Payment States</option>
              <option value="due" ${window._sbkState.paymentFilter === 'due' ? 'selected' : ''}>⚠️ Balance Due Only (${dueCount})</option>
              <option value="paid" ${window._sbkState.paymentFilter === 'paid' ? 'selected' : ''}>✅ Fully Paid Only</option>
            </select>
          </div>
          <div class="airbnb-filter-item" style="display:flex;align-items:flex-end;">
            <button class="btn-sm outline" style="width:100%;height:38px;border-radius:10px;font-weight:700;" onclick="window.resetBookingFilters()">
              ✕ Reset Filters
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Big Hero Headline (Identical to Airbnb) -->
      <h1 class="airbnb-hero-heading">${heroTitle}</h1>
      ${tab === 'today' && !sq ? `
        <div style="font-size:13.5px;color:#64748B;text-align:center;margin:-12px 0 22px 0;font-weight:500;">
          ${departuresCount} check-outs • ${arrivalsCount} check-ins • ${Math.max(0, inHouseCount - arrivalsCount)} continuing stays
        </div>
      ` : ''}

      <!-- Clean Airbnb Search Input with Manual Trigger -->
      <div class="airbnb-search-bar" style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;color:#64748B;">🔍</span>
        <input type="text" id="sbkLiveSearch" placeholder="Search guest name, phone, reservation code, unit..."
          value="${escapeHtml(window._sbkState.searchQuery)}"
          onkeydown="if(event.key==='Enter'){window.handleManualSearch();}" />
        <button type="button" class="btn-sm" onclick="window.handleManualSearch();" style="padding:6px 14px;background:#0F172A;color:#fff;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;border:none;flex-shrink:0;">Search</button>
        ${window._sbkState.searchQuery ? `
          <button type="button" onclick="window.clearSearch();" 
            style="background:#F1F5F9;border:1px solid #CBD5E1;border-radius:8px;cursor:pointer;color:#64748B;font-weight:700;padding:6px 10px;font-size:13px;flex-shrink:0;">✕ Clear</button>
        ` : ''}
      </div>

      <!-- Reservation Presentation -->
      ${filtered.length === 0 ? `
        <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;text-align:center;padding:50px 20px;max-width:560px;margin:0 auto;">
          <div style="font-size:36px;margin-bottom:12px;">🏡</div>
          <div style="font-size:17px;font-weight:800;color:#0F172A;">No reservations found</div>
          <div style="font-size:13px;color:#64748B;margin-top:4px;">
            ${tab === 'today' ? 'There are no check-ins, check-outs, or stays scheduled for today.' : 'No reservations matched your current filter or search criteria.'}
          </div>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
            ${tab === 'today' ? `
              <button class="btn-sm" style="background:#222222;color:#fff;border-radius:20px;font-weight:700;padding:7px 18px;border:none;" onclick="window.setBookingTab('upcoming')">
                View Upcoming (${upcomingCount})
              </button>
            ` : ''}
            <button class="btn-sm outline" style="border-radius:20px;font-weight:700;padding:7px 18px;" onclick="window.resetBookingFilters()">
              Clear Filters
            </button>
          </div>
        </div>
      ` : window._sbkState.viewMode === 'table' ? renderBookingTableHtml(filtered, paidMap, canM, today) : window._sbkState.viewMode === 'cards' ? renderBookingCardsHtml(filtered, paidMap, canM, today) : renderAirbnbReservationsHtml(filtered, paidMap, canM, today)}

      <!-- Airbnb-Style Floating Operations Banner (Matches bottom banner in screenshot) -->
      <div class="airbnb-notice-card" onclick="renderAddBooking()" style="cursor:pointer;">
        <div class="airbnb-notice-icon">✏️</div>
        <div class="airbnb-notice-content">
          <div class="airbnb-notice-title" style="color:#222222;font-size:14px;font-weight:700;">Host Operations Hub</div>
          <div class="airbnb-notice-desc" style="color:#717171;font-size:12.5px;font-weight:500;">17 Luxury Homestays &bull; iCal Channel Sync &amp; WhatsApp Active</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${canM ? `
            <button class="btn-sm" onclick="event.stopPropagation();renderAddBooking()" style="background:#222222;color:#fff;border-radius:20px;font-weight:700;padding:6px 14px;border:none;font-size:12px;">
              + New
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Your follow-ups Section (like Airbnb screenshot) -->
      ${renderAirbnbFollowupsHtml(all, paidMap, canM, today)}

      <!-- Slide-Over Drawer Container (Dynamic) -->
      <div id="sbkDrawerContainer"></div>
    </div>
  `;

  renderShell(html, 'bookings');
}

// =====================================================================
// 1.5. AIRBNB HOST DASHBOARD RENDERING ENGINE (Matches airbnb.co.in/hosting)
// =====================================================================

function formatAirbnbDateRange(ci, co) {
  if (!ci) return '-';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  const p1 = ci.split('-');
  if (p1.length < 3) return ci;
  const d1 = new Date(Number(p1[0]), Number(p1[1]) - 1, Number(p1[2]));
  
  if (!co) {
    return `${d1.getDate()} ${months[d1.getMonth()]}`;
  }
  
  const p2 = co.split('-');
  if (p2.length < 3) return `${d1.getDate()} ${months[d1.getMonth()]}`;
  const d2 = new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]));
  
  const m1 = d1.getMonth();
  const m2 = d2.getMonth();
  const day1 = d1.getDate();
  const day2 = d2.getDate();
  
  if (m1 === m2) {
    return `${day1}–${day2} ${months[m1]}`;
  } else {
    return `${day1} ${months[m1]} – ${day2} ${months[m2]}`;
  }
}

function getAirbnbHeadline(b, today) {
  const isBlocked = (b.guest_name || '').toLowerCase().includes('blocked');
  if (isBlocked) {
    return `Blocked Slot • ${b.rooms?.nickname || b.room_id || 'Unit Hold'}`;
  }
  
  let rawName = (b.guest_name || 'Guest').trim();
  // Remove parenthesized content
  let name = rawName.split('(')[0].split(',')[0].trim();
  if (!name) name = 'Guest';
  
  // Determine guest count
  let count = b.adults ? (Number(b.adults) + Number(b.children || 0)) : (b.num_guests || b.guests || null);
  if (!count) {
    const m = rawName.match(/(\d+)\s*(guest|pax|person|people)/i);
    if (m) count = parseInt(m[1]);
  }
  if (!count) {
    count = (b.rooms?.nickname || '').toLowerCase().includes('villa') ? 6 : (b.rooms?.nickname || '').toLowerCase().includes('3bhk') ? 5 : 4;
  }
  
  const groupLabel = `${name}'s group of ${count}`;
  const isOpenEnded = !b.check_out && b.checkout_confirmed === false;
  const isLeavingToday = b.check_out === today;
  const isArrivingToday = b.check_in === today;
  const isStaying = b.check_in < today && (b.check_out > today || isOpenEnded);
  
  if (isLeavingToday) {
    return `${groupLabel} checks out`;
  }
  if (isArrivingToday) {
    return `${groupLabel} checks in today`;
  }
  if (isStaying) {
    if (isOpenEnded) {
      const elapsed = Math.max(1, Math.ceil((new Date(today) - new Date(b.check_in)) / 86400000));
      return `${groupLabel} stays (day ${elapsed})`;
    }
    const daysLeft = Math.max(1, Math.ceil((new Date(b.check_out) - new Date(today)) / 86400000));
    return `${groupLabel} stays for ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'}`;
  }
  if (b.check_in > today) {
    return groupLabel;
  }
  return `${groupLabel} (Completed)`;
}

function getAirbnbPropertySubtitle(b) {
  const r = b.rooms;
  const nick = r?.nickname || '';
  const unit = r?.unit_no || '';
  const prop = r?.property_name || '';
  
  const parts = [];
  if (nick) parts.push(nick);
  if (unit && !nick.includes(unit)) parts.push(unit);
  if (prop && prop !== nick) parts.push(prop);
  
  return parts.length ? parts.join(' / ') : (b.room_id || 'Homestay');
}

const AIRBNB_AVATAR_COLORS = [
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#ECFDF5', text: '#047857' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#FDF2F8', text: '#BE185D' },
  { bg: '#F3E8FF', text: '#7E22CE' },
  { bg: '#E0F2FE', text: '#0369A1' },
  { bg: '#FFF7ED', text: '#C2410C' },
];

function getGuestAvatarInfo(guestName) {
  const clean = (guestName || 'G').trim().replace(/[^a-zA-Z0-9 ]/g, '');
  const initial = (clean[0] || 'G').toUpperCase();
  const charCode = initial.charCodeAt(0) || 0;
  const color = AIRBNB_AVATAR_COLORS[charCode % AIRBNB_AVATAR_COLORS.length];
  return { initial, bg: color.bg, text: color.text };
}

function getPropertyCoverThumb(b) {
  if (window.ShowcaseData && typeof window.ShowcaseData.getProperty === 'function') {
    const p = window.ShowcaseData.getProperty(b.room_id);
    if (p && p.cover_image) return p.cover_image;
  }
  return 'assets/logo.png';
}

function renderAirbnbReservationsHtml(bookings, paidMap, canM, today) {
  return `
    <div class="airbnb-reservations-list">
      ${bookings.map(b => {
        const pd = paidMap[b.booking_id] || 0;
        const isOpenEnded = !b.check_out && b.checkout_confirmed === false;
        const cin = b.check_in || today;
        const elapsedDays = Math.max(1, Math.ceil((new Date(today) - new Date(cin)) / 86400000));
        const dailyRate = b.per_day_rate || 0;
        const dynamicTotal = (isOpenEnded && dailyRate > 0) ? (elapsedDays * dailyRate) : (b.total_amount || 0);
        const bal = dynamicTotal - pd;

        const isCheckoutToday = b.check_out === today;
        const isArrivalToday = b.check_in === today;
        const isStayingAllDay = b.check_in < today && (b.check_out > today || isOpenEnded);
        const isUpcoming = b.check_in > today;
        const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
        const nights = (b.check_in && b.check_out) ? Math.max(calcNights(b.check_in, b.check_out), 1) : 1;

        // Left Time Column Content
        let timeMain = '';
        let timeSub = '';
        if (isCheckoutToday) {
          timeMain = b.check_out_time || '11:00 am';
          timeSub = 'Checkout today';
        } else if (isArrivalToday) {
          timeMain = b.check_in_time || '2:00 pm';
          timeSub = 'Check-in today';
        } else if (isStayingAllDay) {
          timeMain = 'All day';
          timeSub = isOpenEnded ? `Day ${elapsedDays} (Open)` : 'In-House stay';
        } else if (isUpcoming) {
          timeMain = formatAirbnbDateRange(b.check_in, b.check_out);
          timeSub = `${nights} ${nights === 1 ? 'night' : 'nights'}`;
        } else {
          timeMain = formatAirbnbDateRange(b.check_in, b.check_out);
          timeSub = 'Past stay';
        }

        const headline = getAirbnbHeadline(b, today);
        const propertySub = getAirbnbPropertySubtitle(b);
        const avatarInfo = getGuestAvatarInfo(b.guest_name);
        const propThumb = getPropertyCoverThumb(b);
        const hasId = !!(b.id_proof_photo_paths || b.id_proof_photo_path);

        const guestPhoto = b.guest_photo || (b.id_proof_photo_path && b.id_proof_photo_path.startsWith('http') ? b.id_proof_photo_path : null);

        return `
          <div class="airbnb-res-card" id="abCard_${b.booking_id}" onclick="window.openBookingDrawer('${b.booking_id}')">
            <!-- Top Row: Time + Title on Left, Avatar Combo on Right -->
            <div class="airbnb-card-top-header">
              <div class="airbnb-card-title-col">
                <div class="airbnb-card-time-line">
                  <span class="airbnb-time-main">${escapeHtml(timeMain)}</span>
                  ${timeSub ? `<span class="airbnb-time-sub">${escapeHtml(timeSub)}</span>` : ''}
                </div>
                <div class="airbnb-guest-headline" title="${escapeHtml(headline)}">
                  ${escapeHtml(headline)}
                </div>
              </div>

              <div class="airbnb-avatar-group" title="${escapeHtml(b.guest_name || 'Guest')}">
                ${guestPhoto ? `
                  <img src="${guestPhoto}" class="airbnb-guest-avatar-img" alt="${escapeHtml(b.guest_name || 'Guest')}" onerror="this.outerHTML='<div class=\\'airbnb-guest-avatar-img\\' style=\\'background:${avatarInfo.bg};color:${avatarInfo.text};\\'>${escapeHtml(avatarInfo.initial)}</div>';" />
                ` : `
                  <div class="airbnb-guest-avatar-img" style="background:${avatarInfo.bg};color:${avatarInfo.text};">
                    ${escapeHtml(avatarInfo.initial)}
                  </div>
                `}
                <img src="${propThumb}" class="airbnb-property-thumb-badge" alt="Property" onerror="this.src='assets/logo.png'"/>
              </div>
            </div>

            <!-- Property Subtitle / Location -->
            <div class="airbnb-property-sub" title="${escapeHtml(propertySub)}">
              ${escapeHtml(propertySub)}
            </div>

            <!-- Card Bottom: Status Chips & Quick Actions -->
            <div class="airbnb-card-footer-row">
              <div class="airbnb-chips-row">
                ${isOnline ? `
                  <span class="airbnb-chip airbnb">
                    🌐 Airbnb ${b.airbnb_confirmation_code ? `· ${escapeHtml(b.airbnb_confirmation_code)}` : ''}
                  </span>
                ` : `
                  <span class="airbnb-chip direct">🏠 Direct</span>
                `}
                
                ${bal > 0.99 ? `
                  <span class="airbnb-chip due">⚠️ ₹${Math.round(bal).toLocaleString('en-IN')} Due</span>
                ` : `
                  <span class="airbnb-chip paid">✅ Paid ₹${dynamicTotal.toLocaleString('en-IN')}</span>
                `}

                ${hasId ? `
                  <span class="airbnb-chip id">🪪 ID Verified</span>
                ` : `
                  <span class="airbnb-chip id missing" onclick="event.stopPropagation();window.openBookingIdUploadModal('${b.booking_id}')" title="Click to upload ID proof">
                    🪪 Upload ID
                  </span>
                `}

                ${b.verification_status === 'pending' ? `
                  <span class="airbnb-chip pending">🟡 Verification Pending</span>
                ` : ''}
              </div>

              <div class="airbnb-card-actions" onclick="event.stopPropagation()">
                ${b.phone ? `
                  <button class="airbnb-action-circle wa" onclick="window.drawerOpenWhatsApp('${b.booking_id}', '${b.phone}', '${escapeHtml(b.guest_name)}', this)" title="Chat on WhatsApp">
                    💬
                  </button>
                  <a href="tel:${b.phone}" class="airbnb-action-circle call" title="Call Guest">
                    📞
                  </a>
                ` : ''}

                <button class="airbnb-action-circle" onclick="window.openBookingDrawer('${b.booking_id}')" title="View Booking Details">
                  ⚡
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAirbnbFollowupsHtml(allBookings, paidMap, canM, today) {
  const followups = [];

  (allBookings || []).forEach(b => {
    if (b.is_cancelled) return;
    const pd = paidMap[b.booking_id] || 0;
    const tot = b.total_amount || 0;
    const bal = tot - pd;
    const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;

    // 1. Balance Due
    if (bal > 0.99 && (!isOnline || tot > 0)) {
      followups.push({
        type: 'due',
        title: `Collect ₹${Math.round(bal).toLocaleString('en-IN')} balance`,
        subtitle: `${b.guest_name || 'Guest'} • ${b.rooms?.nickname || b.room_id || 'Room'}`,
        actionText: '💰 Collect',
        bookingId: b.booking_id
      });
    }

    // 2. Pending Verification
    if (b.verification_status === 'pending') {
      followups.push({
        type: 'approval',
        title: `Pending booking approval`,
        subtitle: `${b.guest_name || 'Guest'} • ${b.check_in || 'Upcoming'}`,
        actionText: '🟡 Verify',
        bookingId: b.booking_id
      });
    }

    // 3. Missing ID proof for in-house or today's arrivals
    const hasId = !!(b.id_proof_photo_paths || b.id_proof_photo_path);
    const isTodayOrInHouse = (b.check_in === today) || (b.check_in < today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false)));
    if (!hasId && isTodayOrInHouse && !b.guest_name?.toLowerCase().includes('blocked')) {
      followups.push({
        type: 'id',
        title: `Upload ID proof for ${b.guest_name || 'Guest'}`,
        subtitle: `${b.rooms?.nickname || b.room_id || 'Unit'} • Arrived / In-house`,
        actionText: '🪪 Upload',
        bookingId: b.booking_id
      });
    }

    // 4. Overdue checkout (scheduled checkout date was in the past, but checkout wasn't confirmed)
    if (b.check_out && b.check_out < today && b.checkout_confirmed === false) {
      followups.push({
        type: 'checkout',
        title: `Confirm checkout for ${b.guest_name || 'Guest'}`,
        subtitle: `${b.rooms?.nickname || b.room_id || 'Unit'} • Scheduled: ${b.check_out}`,
        actionText: '📤 Checkout',
        bookingId: b.booking_id
      });
    }
  });

  if (followups.length === 0) return '';

  const displayFollowups = followups.slice(0, 6);

  return `
    <div class="airbnb-followups-section">
      <h2 class="airbnb-followups-title">Your follow-ups (${followups.length})</h2>
      <div class="airbnb-followups-grid">
        ${displayFollowups.map(f => `
          <div class="airbnb-followup-card" onclick="window.openBookingDrawer('${f.bookingId}')">
            <div>
              <div style="font-size:14px;font-weight:700;color:#0F172A;">${escapeHtml(f.title)}</div>
              <div style="font-size:12.5px;color:#64748B;margin-top:2px;">${escapeHtml(f.subtitle)}</div>
            </div>
            <button class="btn-sm outline" style="border-radius:20px;font-weight:700;padding:5px 12px;font-size:12px;" onclick="event.stopPropagation();window.openBookingDrawer('${f.bookingId}')">
              ${f.actionText}
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// =====================================================================
// 2. CARDS VIEW COMPONENT (Mobile & Touch Friendly)
// =====================================================================
function renderBookingCardsHtml(bookings, paidMap, canM, today) {
  return `
    <div class="sbk-cards-grid">
      ${bookings.map(b => {
        const pd = paidMap[b.booking_id] || 0;
        const isOpenEnded = b.checkout_confirmed === false;
        const cin = b.check_in || today;
        const elapsedDays = Math.max(1, Math.ceil((new Date(today) - new Date(cin)) / 86400000));
        const dailyRate = b.per_day_rate || 0;
        const dynamicTotal = (isOpenEnded && dailyRate > 0) ? (elapsedDays * dailyRate) : (b.total_amount || 0);
        const bal = dynamicTotal - pd;

        const isActive = b.check_in <= today && (isOpenEnded || b.check_out > today);
        const isCheckoutToday = !isOpenEnded && b.check_out === today;
        const isArrivalToday = b.check_in === today;
        const isPast = !isOpenEnded && b.check_out < today;
        const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;

        let statusClass = 'upcoming-border';
        let statusBadge = '<span class="sbk-status-badge upcoming">⏳ Upcoming</span>';

        if (b.is_cancelled) {
          statusClass = 'cancelled-border';
          statusBadge = '<span class="sbk-status-badge cancelled">🚫 Cancelled</span>';
        } else if (isActive) {
          statusClass = 'inhouse-border';
          statusBadge = isOpenEnded 
            ? `<span class="sbk-status-badge open">🔄 Open Stay (Day ${elapsedDays})</span>`
            : '<span class="sbk-status-badge active">🟢 In-House</span>';
        } else if (isCheckoutToday) {
          statusClass = 'checkout-today-border';
          statusBadge = '<span class="sbk-status-badge today">📤 Leaving Today</span>';
        } else if (isArrivalToday) {
          statusClass = 'upcoming-border';
          statusBadge = '<span class="sbk-status-badge upcoming">📥 Arriving Today</span>';
        } else if (isPast) {
          statusClass = 'past-border';
          statusBadge = '<span class="sbk-status-badge completed">✅ Completed</span>';
        }

        const nights = (b.check_in && b.check_out) ? Math.max(calcNights(b.check_in, b.check_out), 1) : 1;
        const guestInitials = (b.guest_name || 'G').trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const hasId = !!(b.id_proof_photo_paths || b.id_proof_photo_path);

        return `
          <div class="sbk-card ${statusClass}" id="bkCard_${b.booking_id}">
            <!-- Card Top: Guest & Status -->
            <div class="sbk-card-top">
              <div class="sbk-guest-meta">
                <div class="sbk-guest-avatar">${guestInitials}</div>
                <div>
                  <div class="sbk-guest-name" onclick="window.openBookingDrawer('${b.booking_id}')">
                    ${escapeHtml(b.guest_name || 'Guest')}
                  </div>
                  <div class="sbk-guest-phone">
                    <span>📞 ${escapeHtml(b.phone || 'No phone')}</span>
                    ${b.phone ? `
                      <a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;font-weight:700;">Call</a>
                    ` : ''}
                  </div>
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <!-- Stay Info: Property & Dates -->
            <div class="sbk-stay-info">
              <div>
                <div class="sbk-room-tag">
                  <span>🏠</span>
                  <span>${escapeHtml(propLabel(b.rooms) || b.room_id)}</span>
                </div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                  ${isOnline ? `<span style="color:#FF385C;font-weight:700;">Airbnb (${b.airbnb_confirmation_code || 'Online'})</span>` : 'Direct Booking'}
                  ${b.verification_status === 'pending' ? ' · <span style="color:#D97706;font-weight:700;">🟡 Pending Approval</span>' : ''}
                </div>
              </div>
              <div class="sbk-dates-tag">
                <div style="font-weight:700;color:var(--dark);">
                  ${b.check_in || '-'} → ${isOpenEnded ? 'Open' : (b.check_out || '-')}
                </div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                  ${isOpenEnded ? `Day ${elapsedDays} so far` : `${nights} ${nights === 1 ? 'Night' : 'Nights'}`}
                </div>
              </div>
            </div>

            <!-- Financial Summary Bar -->
            <div class="sbk-finance-bar">
              <div>
                <span style="font-size:11px;color:var(--muted);text-transform:uppercase;">Total</span><br>
                <strong style="color:var(--dark);">₹${dynamicTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style="font-size:11px;color:var(--muted);text-transform:uppercase;">Paid</span><br>
                <strong style="color:#059669;">₹${pd.toLocaleString('en-IN')}</strong>
              </div>
              <div style="text-align:right;">
                <span style="font-size:11px;color:var(--muted);text-transform:uppercase;">Balance</span><br>
                <strong class="sbk-amt-pill ${bal > 0.99 ? 'due' : 'paid'}">
                  ${bal > 0.99 ? `₹${Math.round(bal).toLocaleString('en-IN')} Due` : '✅ Paid'}
                </strong>
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div class="sbk-card-actions">
              ${b.phone ? `
                <button class="sbk-action-btn wa" onclick="window.sendWhatsAppToGuest('${b.phone}', '${escapeHtml(b.guest_name)}', '${b.booking_id}')" title="Chat on WhatsApp">
                  💬
                </button>
                <a href="tel:${b.phone}" class="sbk-action-btn call" title="Call Guest">
                  📞
                </a>
              ` : ''}

              <button class="sbk-action-btn primary" onclick="window.openBookingDrawer('${b.booking_id}')">
                ⚡ Details
              </button>

              ${bal > 0.99 && canM ? `
                <button class="sbk-action-btn" onclick="showPaymentModal('${b.booking_id}')" style="background:#ECFDF5;border-color:#10B981;color:#047857;">
                  💰 Collect ₹${Math.round(bal).toLocaleString('en-IN')}
                </button>
              ` : ''}

              ${isActive && canM ? `
                <button class="sbk-action-btn" onclick="quickCheckout('${b.booking_id}', '${b.room_id}')" title="Check Out Guest">
                  📤 Checkout
                </button>
              ` : ''}

              <button class="sbk-action-btn" onclick="window.openBookingIdUploadModal('${b.booking_id}')" title="Guest ID Proofs">
                🪪 ${hasId ? 'IDs' : 'Upload ID'}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// =====================================================================
// 3. TABLE VIEW COMPONENT (Clean & Spacious Desktop Experience)
// =====================================================================
function renderBookingTableHtml(bookings, paidMap, canM, today) {
  return `
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table style="width:100%;margin:0;border-collapse:collapse;">
          <thead style="background:#F8FAFC;border-bottom:1px solid var(--border);">
            <tr>
              <th style="padding:12px 16px;text-align:left;">Status</th>
              <th style="padding:12px 16px;text-align:left;">Guest &amp; Phone</th>
              <th style="padding:12px 16px;text-align:left;">Property</th>
              <th style="padding:12px 16px;text-align:left;">Channel</th>
              <th style="padding:12px 16px;text-align:left;">Stay Dates</th>
              <th style="padding:12px 16px;text-align:right;">Total</th>
              <th style="padding:12px 16px;text-align:right;">Paid</th>
              <th style="padding:12px 16px;text-align:right;">Balance</th>
              <th style="padding:12px 16px;text-align:center;">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => {
              const pd = paidMap[b.booking_id] || 0;
              const isOpenEnded = b.checkout_confirmed === false;
              const cin = b.check_in || today;
              const elapsedDays = Math.max(1, Math.ceil((new Date(today) - new Date(cin)) / 86400000));
              const dailyRate = b.per_day_rate || 0;
              const dynamicTotal = (isOpenEnded && dailyRate > 0) ? (elapsedDays * dailyRate) : (b.total_amount || 0);
              const bal = dynamicTotal - pd;

              const isActive = b.check_in <= today && (isOpenEnded || b.check_out > today);
              const isCheckoutToday = !isOpenEnded && b.check_out === today;
              const isArrivalToday = b.check_in === today;
              const isPast = !isOpenEnded && b.check_out < today;
              const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;

              let statusBadge = '<span class="sbk-status-badge upcoming">Upcoming</span>';
              if (b.is_cancelled) statusBadge = '<span class="sbk-status-badge cancelled">Cancelled</span>';
              else if (isActive) statusBadge = isOpenEnded ? `<span class="sbk-status-badge open">Open (${elapsedDays}d)</span>` : '<span class="sbk-status-badge active">In-House</span>';
              else if (isCheckoutToday) statusBadge = '<span class="sbk-status-badge today">Leave Today</span>';
              else if (isArrivalToday) statusBadge = '<span class="sbk-status-badge upcoming">Arrive Today</span>';
              else if (isPast) statusBadge = '<span class="sbk-status-badge completed">Done</span>';

              const rowBg = isActive ? 'background:#F0FDF4;' : (isCheckoutToday ? 'background:#FFFBEB;' : '');

              return `
                <tr style="${rowBg}border-bottom:1px solid var(--border-light);">
                  <td style="padding:12px 16px;">${statusBadge}</td>
                  <td style="padding:12px 16px;">
                    <strong style="color:var(--primary);cursor:pointer;" onclick="window.openBookingDrawer('${b.booking_id}')">
                      ${escapeHtml(b.guest_name || 'Guest')}
                    </strong><br>
                    <small style="color:var(--muted);">${escapeHtml(b.phone || '')}</small>
                  </td>
                  <td style="padding:12px 16px;">
                    <strong>${escapeHtml(propLabel(b.rooms) || b.room_id)}</strong>
                  </td>
                  <td style="padding:12px 16px;">
                    <span class="channel-badge ${isOnline ? 'channel-airbnb' : 'channel-direct'}">
                      ${isOnline ? 'Airbnb' : 'Direct'}
                    </span>
                    ${b.airbnb_confirmation_code ? `<br><small style="color:#FF385C;font-family:monospace;font-weight:700;">${b.airbnb_confirmation_code}</small>` : ''}
                  </td>
                  <td style="padding:12px 16px;">
                    <span style="font-weight:600;">${b.check_in || '-'}</span> → 
                    <span style="font-weight:600;">${isOpenEnded ? 'Open' : (b.check_out || '-')}</span>
                  </td>
                  <td style="padding:12px 16px;text-align:right;font-weight:700;">
                    ₹${dynamicTotal.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:12px 16px;text-align:right;font-weight:700;color:#059669;">
                    ₹${pd.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:12px 16px;text-align:right;">
                    <strong class="${bal > 0.99 ? 'sbk-amt-pill due' : 'sbk-amt-pill paid'}">
                      ${bal > 0.99 ? `₹${Math.round(bal).toLocaleString('en-IN')}` : '0'}
                    </strong>
                  </td>
                  <td style="padding:12px 16px;text-align:center;">
                    <div style="display:flex;justify-content:center;gap:6px;">
                      <button class="btn-sm" onclick="window.openBookingDrawer('${b.booking_id}')" title="Details &amp; Actions">
                        ⚡ Details
                      </button>
                      ${bal > 0.99 ? `
                        <button class="btn-sm" style="background:#10B981;color:#fff;" onclick="showPaymentModal('${b.booking_id}')" title="Record Payment">
                          💰
                        </button>
                      ` : ''}
                      <button class="btn-sm" style="background:#0D9488;color:#fff;" onclick="window.openBookingIdUploadModal('${b.booking_id}')" title="ID Proofs">
                        🪪
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =====================================================================
// 4. SLIDE-OVER BOOKING DETAILS DRAWER
// =====================================================================
window.openBookingDrawer = async function(bookingId) {
  const all = window._sbkState.cachedBookings || [];
  const b = all.find(x => x.booking_id === bookingId);
  if (!b) return;
  window._currentDrawerBooking = b;

  const pd = (window._sbkState.cachedPaidMap || {})[b.booking_id] || 0;
  const tot = b.total_amount || 0;
  const bal = tot - pd;
  const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
  const canM = ['owner','admin','manager','moderator','developer'].includes(SESSION.role);
  const canD = ['developer','owner','admin'].includes(SESSION.role);

  // Fetch individual payments for this booking
  const { data: payments } = await sb.from('payment_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('payment_date', { ascending: true });

  const container = document.getElementById('sbkDrawerContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="sbk-drawer-overlay" onclick="if(event.target===this) window.closeBookingDrawer()">
      <div class="sbk-drawer">
        <div class="sbk-drawer-header">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">
              Booking Reference: ${escapeHtml(b.booking_id)}
            </div>
            <div style="font-size:18px;font-weight:800;color:var(--dark);margin-top:2px;">
              ${escapeHtml(b.guest_name || 'Guest')}
            </div>
          </div>
          <button onclick="window.closeBookingDrawer()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);padding:4px 8px;">✕</button>
        </div>

        <div class="sbk-drawer-body">
          <!-- Top Contact & Communication Card -->
          <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:12px;color:var(--muted);font-weight:600;">Guest Phone</div>
              <div style="font-size:16px;font-weight:700;color:var(--dark);">${escapeHtml(b.phone || 'No phone')}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="sbk-action-btn wa" onclick="window.drawerOpenWhatsApp('${b.booking_id}', '${escapeHtml(b.phone || '')}', '${escapeHtml(b.guest_name || '')}', this)" style="height:36px;padding:0 12px;border-radius:8px;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;border:none;cursor:pointer;font-weight:700;" title="WhatsApp Guest">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.55 1.36 5.09L2 22l5.25-1.38c1.48.8 3.13 1.23 4.79 1.23h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.37c.01-4.54 3.7-8.23 8.25-8.23M8.53 6.98c-.16 0-.43.06-.65.31s-.85.83-.85 2.02.87 2.35.99 2.51c.12.17 1.71 2.75 4.28 3.72 2.12.8 2.55.64 3.01.6.46-.05 1.5-.61 1.71-1.2.21-.59.21-1.09.15-1.19s-.23-.16-.48-.28-1.5-.74-1.73-.82c-.23-.08-.4-.12-.57.13s-.65.82-.8.99c-.15.17-.29.19-.55.06-.26-.13-1.09-.4-2.08-1.29-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.31.4-.47.13-.16.17-.27.26-.45.09-.18.04-.34-.02-.47-.06-.13-.57-1.37-.78-1.87s-.42-.42-.57-.43z"/></svg>
                ${b.phone ? 'WhatsApp' : 'Add Phone & WA'}
              </button>
              ${b.phone ? `
                <a href="tel:${b.phone}" class="sbk-action-btn call" style="width:36px;height:36px;border-radius:8px;font-size:16px;display:inline-flex;align-items:center;justify-content:center;background:#E2E8F0;text-decoration:none;" title="Call Guest">
                  📞
                </a>
              ` : ''}
            </div>
          </div>

          <!-- Stay Overview -->
          <div style="border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="font-size:13px;font-weight:700;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
              <span>🏠 Property &amp; Dates</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
              <div>
                <span style="color:var(--muted);font-size:11px;">Property:</span><br>
                <strong>${escapeHtml(propLabel(b.rooms) || b.room_id)}</strong>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Channel:</span><br>
                <strong>${isOnline ? `Airbnb (${b.airbnb_confirmation_code || 'Online'})` : 'Direct Booking'}</strong>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Check-In:</span><br>
                <strong>${b.check_in || '-'} ${b.check_in_time ? `(${b.check_in_time})` : ''}</strong>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Check-Out:</span><br>
                <strong>${b.check_out || '-'} ${b.check_out_time ? `(${b.check_out_time})` : ''}</strong>
              </div>
            </div>
            ${b.notes ? `
              <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);font-size:12.5px;color:var(--text-secondary);">
                <strong>Notes:</strong> ${escapeHtml(b.notes)}
              </div>
            ` : ''}
          </div>

          <!-- Financial Breakdown & Payment History -->
          <div style="border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div style="font-size:13px;font-weight:700;color:var(--dark);">💰 Payment Ledger</div>
              <div style="display:flex;gap:6px;align-items:center;">
                <button class="btn-sm" onclick="window.openGSTInvoiceModal('${b.booking_id}')" style="background:#B45309;color:#fff;border:none;padding:4px 9px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;" title="Generate or View GST Invoice">🧾 GST Bill</button>
                ${canM ? `<button class="btn-sm" onclick="showPaymentModal('${b.booking_id}')" style="background:#10B981;color:#fff;border:none;padding:4px 10px;font-size:11.5px;">+ Add Payment</button>` : ''}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;background:#F8FAFC;padding:10px;border-radius:8px;margin-bottom:12px;">
              <div>
                <span style="font-size:11px;color:var(--muted);">Total Bill</span><br>
                <strong style="font-size:14px;">₹${tot.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style="font-size:11px;color:var(--muted);">Total Paid</span><br>
                <strong style="font-size:14px;color:#059669;">₹${pd.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style="font-size:11px;color:var(--muted);">Balance Due</span><br>
                <strong style="font-size:14px;color:${bal > 0 ? '#DC2626' : '#059669'};">₹${Math.max(0, Math.round(bal)).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            ${(payments && payments.length > 0) ? `
              <div style="font-size:12px;">
                <div style="font-weight:600;color:var(--muted);margin-bottom:6px;">Transactions:</div>
                ${payments.map(p => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light);">
                    <div>
                      <span style="font-weight:700;color:var(--dark);">₹${(p.amount || 0).toLocaleString('en-IN')}</span>
                      <span style="color:var(--muted);margin-left:6px;">${p.payment_mode || 'Payment'}</span>
                    </div>
                    <div style="color:var(--muted);font-size:11px;">
                      ${p.payment_date || ''} · ${escapeHtml(p.received_by || '')}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0;">No individual payments recorded yet.</div>'}
          </div>

          <!-- Guest IDs & Documents -->
          <div style="border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:13px;font-weight:700;color:var(--dark);">🪪 ID Proof Documents</div>
              <button class="btn-sm outline" onclick="window.openBookingIdUploadModal('${b.booking_id}')" style="padding:4px 8px;font-size:11px;">
                Upload / Manage
              </button>
            </div>
            <div>
              ${buildIdButtons(b)}
            </div>
          </div>

          <!-- Operational Actions Group -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">
            <button class="btn-sm" style="background:#25D366;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.drawerOpenWhatsApp('${b.booking_id}', '${escapeHtml(b.phone || '')}', '${escapeHtml(b.guest_name || '')}', this)" title="Open WhatsApp Menu &amp; Templates">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.55 1.36 5.09L2 22l5.25-1.38c1.48.8 3.13 1.23 4.79 1.23h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.37c.01-4.54 3.7-8.23 8.25-8.23M8.53 6.98c-.16 0-.43.06-.65.31s-.85.83-.85 2.02.87 2.35.99 2.51c.12.17 1.71 2.75 4.28 3.72 2.12.8 2.55.64 3.01.6.46-.05 1.5-.61 1.71-1.2.21-.59.21-1.09.15-1.19s-.23-.16-.48-.28-1.5-.74-1.73-.82c-.23-.08-.4-.12-.57.13s-.65.82-.8.99c-.15.17-.29.19-.55.06-.26-.13-1.09-.4-2.08-1.29-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.31.4-.47.13-.16.17-.27.26-.45.09-.18.04-.34-.02-.47-.06-.13-.57-1.37-.78-1.87s-.42-.42-.57-.43z"/></svg>
              💬 WhatsApp
            </button>
            <button class="btn-sm" style="background:#6366F1;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.drawerDuplicateBooking('${b.booking_id}')" title="Duplicate this booking">
              📋 Duplicate
            </button>
            <button class="btn-sm" style="background:#0284C7;color:#fff;padding:10px;" onclick="showSecurityDepositModal('${b.booking_id}')">
              🛡️ Security Deposit
            </button>
            <button class="btn-sm" style="background:#8B5CF6;color:#fff;padding:10px;" onclick="quickExtend('${b.booking_id}')">
              ⏭️ Extend Stay
            </button>
            ${canM ? `
              <button class="btn-sm" style="background:var(--primary);color:#fff;padding:10px;" onclick="editBooking('${b.booking_id}')">
                ✏️ Edit Booking
              </button>
            ` : ''}
            <button class="btn-sm outline" style="padding:10px;" onclick="showGuestLedger('${escapeHtml(b.guest_name || '')}', '${b.booking_id}', '${b.phone || ''}', '${b.airbnb_confirmation_code || ''}')">
              📑 Guest Ledger
            </button>
            <button class="btn-sm" style="background:#B45309;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.openGSTInvoiceModal('${b.booking_id}')" title="Generate GST Tax Invoice">
              🧾 GST Invoice
            </button>
            ${canM ? `
              <button class="btn-sm" style="background:#EF4444;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.drawerDeleteBooking()" title="Delete this booking">
                🗑️ Delete Booking
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
};

window.drawerDuplicateBooking = function(bookingId) {
  window.closeBookingDrawer();
  if (typeof window.duplicateBooking === 'function') {
    window.duplicateBooking(bookingId);
  } else {
    alert('Duplicate booking function is unavailable.');
  }
};

window.drawerDeleteBooking = async function() {
  const b = window._currentDrawerBooking;
  if (!b) return;
  const bookingId = b.booking_id;
  const guestName = b.guest_name || 'Guest';
  const roomId = b.room_id || '';

  const fn = window.delBooking || window.deleteBooking || (typeof delBooking === 'function' ? delBooking : null);
  if (typeof fn === 'function') {
    await fn(bookingId, guestName, roomId);
    window.closeBookingDrawer();
    if (typeof window.renderManageBookings === 'function') {
      window.renderManageBookings();
    }
  } else {
    alert('Delete booking function is unavailable.');
  }
};

window.drawerOpenWhatsApp = async function(bookingId, phone, guestName, btn) {
  if (phone && phone.trim()) {
    if (typeof showWATemplatesMenu === 'function') {
      showWATemplatesMenu(bookingId, btn);
    } else if (typeof shareBookingWhatsApp === 'function') {
      shareBookingWhatsApp(bookingId);
    } else {
      window.sendWhatsAppToGuest(phone, guestName, bookingId);
    }
    return;
  }
  // Phone is missing
  const entered = prompt(`Guest "${guestName || 'Guest'}" ka phone number enter karein WhatsApp send karne ke liye:`, '');
  if (!entered || !entered.trim()) return;
  const clean = entered.replace(/[^0-9]/g, '');
  if (clean.length < 10) {
    alert('Kripya valid 10-digit mobile number enter karein.');
    return;
  }
  try {
    if (window.sb) {
      await window.sb.from('guest_register').update({ phone: clean }).eq('booking_id', bookingId);
      if (window.fsn?.success) window.fsn.success('Saved', 'Phone number updated successfully');
    }
  } catch (e) {
    console.warn('Could not update phone in db:', e);
  }
  if (typeof showWATemplatesMenu === 'function') {
    showWATemplatesMenu(bookingId, btn);
  } else {
    window.sendWhatsAppToGuest(clean, guestName, bookingId);
  }
};

window.closeBookingDrawer = function() {
  const container = document.getElementById('sbkDrawerContainer');
  if (container) container.innerHTML = '';
};

// =====================================================================
// 5. LIVE CONTROLS & EVENT HANDLERS
// =====================================================================
window.setBookingTab = function(tab) {
  window._sbkState.activeTab = tab;
  renderSmartManageBookings();
};

window.handleManualSearch = function() {
  const input = document.getElementById('sbkLiveSearch');
  const val = input ? input.value.trim() : '';
  window._sbkState.searchQuery = val;
  renderSmartManageBookings();
};

window.clearSearch = function() {
  const input = document.getElementById('sbkLiveSearch');
  if (input) input.value = '';
  window._sbkState.searchQuery = '';
  renderSmartManageBookings();
};

window.handleSearchInput = function(val) {
  // Sets query without instant re-render; manual click triggers render
  window._sbkState.searchQuery = (val || '').trim();
};

window.handlePropertyFilter = function(propId) {
  window._sbkState.propertyFilter = propId;
  renderSmartManageBookings();
};

window.toggleAirbnbFilter = function() {
  window._sbkState.showFilters = !window._sbkState.showFilters;
  renderSmartManageBookings();
};

window.handleChannelFilter = function(val) {
  window._sbkState.channelFilter = val;
  renderSmartManageBookings();
};

window.handlePaymentFilter = function(val) {
  window._sbkState.paymentFilter = val;
  renderSmartManageBookings();
};

window.toggleViewMode = function(mode) {
  window._sbkState.viewMode = mode;
  renderSmartManageBookings();
};

window.resetBookingFilters = function() {
  window._sbkState.activeTab = 'today';
  window._sbkState.searchQuery = '';
  window._sbkState.propertyFilter = '';
  window._sbkState.channelFilter = '';
  window._sbkState.paymentFilter = '';
  window._sbkState.showFilters = false;
  renderSmartManageBookings();
};

window.toggleClassicBookingView = function() {
  window._sbkState.classicMode = !window._sbkState.classicMode;
  if (window._sbkState.classicMode && typeof window.renderClassicManageBookings === 'function') {
    window.renderClassicManageBookings();
  } else {
    renderSmartManageBookings();
  }
};

window.sendWhatsAppToGuest = function(phone, name, bookingId) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const target = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const msg = encodeURIComponent(`Hi ${name || 'Guest'}, greetings from The Unique Haven Homes (UHHS Lucknow)! We are pleased to host you. Please let us know if you need any assistance with your stay.`);
  window.open(`https://wa.me/${target}?text=${msg}`, '_blank');
};

// =====================================================================
// 6. ZERO-ERROR SPEED ADD BOOKING WIZARD
// =====================================================================
async function renderSmartAddBooking() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const pre = window._bookingPrefill || {};

  renderShell(`<div class="loading" style="padding:40px;text-align:center;"><div class="spinner"></div><div style="margin-top:10px;font-weight:600;color:var(--muted);">Loading Instant Booking Wizard...</div></div>`, 'bookings');

  // Load rooms and recent bookings for conflict checking
  const [{ data: rooms }, { data: existingBookings }] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname, property_name, rent_per_night, bookable').order('unit_no'),
    sb.from('guest_register').select('booking_id, guest_name, phone, room_id, check_in, check_out, is_cancelled, booking_mode, total_amount')
      .gte('check_out', today).neq('is_cancelled', true)
  ]);

  window._roomsCache = rooms || [];
  window._smartRecentBookings = existingBookings || [];

  const defaultRoom = pre.roomId || (rooms && rooms[0]?.room_id) || '';
  const defaultCheckIn = pre.checkIn || today;
  const defaultCheckOut = pre.checkOut || tomorrow;

  const html = `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <h1 style="font-size:20px;font-weight:800;color:var(--dark);margin:0;display:flex;align-items:center;gap:8px;">
          <span>⚡ Fast &amp; Zero-Error Booking</span>
        </h1>
        <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">
          Instant availability radar, repeat guest lookup &amp; live rate calculator.
        </div>
      </div>
      <button class="secondary btn-sm" onclick="window._bookingPrefill=null;renderSmartManageBookings()">
        ← Back to Bookings
      </button>
    </div>

    <div class="card" style="max-width:880px;margin:0 auto;">
      <!-- Hidden inputs for parent booking / group -->
      <input type="hidden" id="parentBookingId" value="${pre.parentBookingId || ''}" />
      <input type="hidden" id="stayGroupId" value="${pre.stayGroupId || ''}" />

      <!-- SECTION 1: GUEST DETAILS & SMART PHONE LOOKUP -->
      <div style="margin-bottom:18px;">
        <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>👤 1. Guest Information</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label style="font-weight:700;">Mobile Phone * <small style="color:var(--muted);">(10 Digits)</small></label>
            <input id="guestPhone" type="tel" placeholder="e.g. 9876543210" value="${pre.guestPhone || ''}"
              oninput="window.onSmartPhoneInput(this.value)" style="font-size:14px;font-weight:600;" />
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Guest Name *</label>
            <input id="guestName" placeholder="Full name of guest" value="${pre.guestName || ''}"
              style="font-size:14px;font-weight:600;" />
          </div>
        </div>

        <!-- Repeat Guest Detected Banner (Dynamic) -->
        <div id="repeatGuestBanner"></div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

      <!-- SECTION 2: STAY DATES & LIVE ROOM RADAR -->
      <div style="margin-bottom:18px;">
        <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>🏠 2. Property &amp; Dates</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label style="font-weight:700;">Select Property *</label>
            <select id="roomId" onchange="window.triggerLiveRadarCheck()" style="font-weight:700;font-size:14px;">
              <option value="">-- Choose Homestay --</option>
              ${(rooms || []).map(r => `
                <option value="${r.room_id}" ${defaultRoom === r.room_id ? 'selected' : ''}>
                  ${propLabel(r)} (₹${r.rent_per_night || 3499}/night)
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Number of Guests</label>
            <input id="guests" type="number" min="1" max="8" value="${pre.guests || 2}" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label style="font-weight:700;">Check-In Date *</label>
            <input id="checkIn" type="date" value="${defaultCheckIn}" onchange="window.onSmartDateChange('checkIn')" />
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Check-Out Date *</label>
            <input id="checkOut" type="date" value="${defaultCheckOut}" onchange="window.onSmartDateChange('checkOut')" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Check-In Time</label>
            <input id="checkInTime" type="time" value="${pre.checkInTime || '14:00'}" />
          </div>
          <div class="form-group">
            <label>Check-Out Time</label>
            <input id="checkOutTime" type="time" value="${pre.checkOutTime || '11:00'}" />
          </div>
        </div>

        <div class="form-group">
          <label style="font-weight:600;">Stay Type</label>
          <select id="checkoutConfirmed" onchange="window.onSmartCheckoutTypeChange(this.value)">
            <option value="yes" ${pre.checkoutConfirmed !== 'no' ? 'selected' : ''}>Fixed Date (Standard Stay)</option>
            <option value="no" ${pre.checkoutConfirmed === 'no' ? 'selected' : ''}>Open-Ended Stay (Per Day Basis)</option>
          </select>
        </div>

        <!-- ⚡ LIVE ROOM AVAILABILITY RADAR BANNER -->
        <div id="liveRadarBanner"></div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

      <!-- SECTION 3: PRICING & ADVANCE PAYMENT (AUTO-CALCULATED) -->
      <div style="margin-bottom:18px;">
        <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>💰 3. Financials &amp; Payments</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label style="font-weight:700;">Total Stay Amount ₹ *</label>
            <input id="totalAmount" type="number" placeholder="Enter total amount"
              value="${pre.totalAmount || ''}" oninput="window.recalcSmartPrice()" style="font-size:15px;font-weight:700;" />
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Advance Paid ₹</label>
            <input id="advanceAmt" type="number" placeholder="0" value="${pre.advanceAmt || 0}"
              oninput="window.recalcSmartPrice()" style="font-size:15px;font-weight:700;color:#059669;" />
          </div>
        </div>

        <!-- Advance details (Mode & Receiver) -->
        <div class="form-grid" id="smartAdvDetailsRow" style="display:${(pre.advanceAmt || 0) > 0 ? 'grid' : 'none'};">
          <div class="form-group">
            <label style="font-weight:700;">Advance Payment Mode *</label>
            <select id="advMode" onchange="window.onSmartAdvModeChange(this.value)">
              <option value="UPI" ${pre.advMode === 'UPI' ? 'selected' : ''}>📱 UPI</option>
              <option value="Cash" ${pre.advMode === 'Cash' ? 'selected' : ''}>💵 Cash</option>
              <option value="Bank" ${pre.advMode === 'Bank' ? 'selected' : ''}>🏦 Bank Account</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight:700;" id="smartAdvReceivedByLabel">💰 Received By *</label>
            <select id="advReceivedBy" style="font-weight:600;">
              <option value="">-- Select Team Member --</option>
            </select>
          </div>
        </div>

        <!-- Live Price & Balance Breakdown Box -->
        <div class="sbk-price-summary-box">
          <div class="sbk-price-row">
            <span style="color:var(--muted);">Calculated Duration:</span>
            <strong id="smartNightsSummary">1 Night</strong>
          </div>
          <div class="sbk-price-row">
            <span style="color:var(--muted);">Advance Received:</span>
            <strong id="smartAdvanceSummary" style="color:#059669;">₹0</strong>
          </div>
          <div class="sbk-price-row total">
            <span>Total Bill:</span>
            <span id="smartTotalSummary">₹0</span>
          </div>
          <div class="sbk-price-row balance" id="smartBalanceRow">
            <span>Balance to Collect at Check-in:</span>
            <span id="smartBalanceSummary">₹0</span>
          </div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

      <!-- SECTION 4: PROGRESSIVE DISCLOSURE ACCORDIONS (Clean & Uncluttered) -->
      <div>
        <!-- Accordion 1: ID Proofs -->
        <div class="sbk-accordion-card">
          <div class="sbk-accordion-header" onclick="window.toggleAccordion('accIdProofs')">
            <span>🪪 Guest ID Proofs (Front &amp; Back)</span>
            <span id="accIdProofsIcon">▼</span>
          </div>
          <div class="sbk-accordion-body" id="accIdProofs" style="display:none;">
            <div class="form-grid">
              <div class="form-group">
                <label>ID Document Type</label>
                <select id="idType">
                  <option value="Aadhar" selected>Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="DL">Driving License</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>
              <div class="form-group">
                <label>ID Document Number</label>
                <input id="idNo" placeholder="e.g. 1234 5678 9012" value="${pre.idNo || ''}" />
              </div>
            </div>

            <!-- Guest 1 Front & Back upload -->
            <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:10px;">
              <div style="font-weight:700;font-size:13px;margin-bottom:8px;">Guest 1 Photo ID</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:4px;">Front Side</div>
                  <div class="id-card-btns">
                    <button type="button" class="outline btn-sm" onclick="document.getElementById('idFrontCam1').click()">📷 Camera</button>
                    <button type="button" class="outline btn-sm" onclick="document.getElementById('idFrontGal1').click()">🖼️ Gallery</button>
                  </div>
                  <input type="file" id="idFrontCam1" accept="image/*" capture="environment" style="display:none;" onchange="onIdFileSelect(this,1,'front')" />
                  <input type="file" id="idFrontGal1" accept="image/*" style="display:none;" onchange="onIdFileSelect(this,1,'front')" />
                  <div id="previewFront1" style="margin-top:4px;"></div>
                </div>
                <div>
                  <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:4px;">Back Side</div>
                  <div class="id-card-btns">
                    <button type="button" class="outline btn-sm" onclick="document.getElementById('idBackCam1').click()">📷 Camera</button>
                    <button type="button" class="outline btn-sm" onclick="document.getElementById('idBackGal1').click()">🖼️ Gallery</button>
                  </div>
                  <input type="file" id="idBackCam1" accept="image/*" capture="environment" style="display:none;" onchange="onIdFileSelect(this,1,'back')" />
                  <input type="file" id="idBackGal1" accept="image/*" style="display:none;" onchange="onIdFileSelect(this,1,'back')" />
                  <div id="previewBack1" style="margin-top:4px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordion 2: Security Deposit -->
        <div class="sbk-accordion-card">
          <div class="sbk-accordion-header" onclick="window.toggleAccordion('accSecurity')">
            <span>🛡️ Security Deposit (Refundable Liability)</span>
            <span id="accSecurityIcon">▼</span>
          </div>
          <div class="sbk-accordion-body" id="accSecurity" style="display:none;">
            <label style="display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:10px;cursor:pointer;">
              <input type="checkbox" id="hasSecurityDeposit" onchange="document.getElementById('secDepositFields').style.display=this.checked?'block':'none'" />
              <span>Collect Security Deposit from this guest?</span>
            </label>
            <div id="secDepositFields" style="display:none;">
              <div class="form-grid">
                <div class="form-group">
                  <label>Deposit Amount ₹</label>
                  <input id="secAmount" type="number" placeholder="2000" value="2000" />
                </div>
                <div class="form-group">
                  <label>Mode</label>
                  <select id="secMode">
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordion 3: Vehicle & Special Notes -->
        <div class="sbk-accordion-card">
          <div class="sbk-accordion-header" onclick="window.toggleAccordion('accVehicle')">
            <span>🚗 Vehicle Details &amp; Notes</span>
            <span id="accVehicleIcon">▼</span>
          </div>
          <div class="sbk-accordion-body" id="accVehicle" style="display:none;">
            <div class="form-grid">
              <div class="form-group">
                <label>Vehicle Name / Model</label>
                <input id="vehicleName" placeholder="e.g. Swift Dzire / Creta" />
              </div>
              <div class="form-group">
                <label>Vehicle Registration No.</label>
                <input id="vehicleNumber" placeholder="e.g. UP32 XX 1234" />
              </div>
            </div>
            <div class="form-group" style="margin-top:10px;">
              <label>Special Notes / Guest Preferences</label>
              <textarea id="bkNotes" placeholder="Any special requests or instructions..."></textarea>
            </div>
          </div>
        </div>

        <!-- Accordion 4: Booking Channel & Channel Code (Airbnb / OTA) -->
        <div class="sbk-accordion-card">
          <div class="sbk-accordion-header" onclick="window.toggleAccordion('accChannel')">
            <span>🌐 Booking Channel (Direct vs Airbnb)</span>
            <span id="accChannelIcon">▼</span>
          </div>
          <div class="sbk-accordion-body" id="accChannel" style="display:none;">
            <div class="form-grid">
              <div class="form-group">
                <label>Channel</label>
                <select id="bookingMode" onchange="document.getElementById('airbnbCodeRow').style.display=(this.value==='Online-Airbnb')?'block':'none'">
                  <option value="Offline">Direct / Phone / Walk-in</option>
                  <option value="Online-Airbnb">Online (Airbnb)</option>
                </select>
              </div>
              <div class="form-group" id="airbnbCodeRow" style="display:none;">
                <label>Airbnb Confirmation Code</label>
                <input id="airbnbCode" placeholder="e.g. HMXYZ12345" />
              </div>
            </div>
            <div style="margin-top:8px;">
              <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;">
                <input type="checkbox" id="isReviewBooking" />
                <span>Review / Duplicate stay (skip revenue calculations)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Button & Errors -->
      <div id="smartAddBkErr" style="margin-top:14px;"></div>
      <button id="smartSaveBtn" onclick="window.saveSmartBooking()" 
        style="width:100%;padding:14px;font-size:16px;font-weight:800;background:var(--primary);color:#fff;border:none;border-radius:12px;cursor:pointer;margin-top:10px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
        💾 Confirm &amp; Save Booking
      </button>
    </div>
  `;

  renderShell(html, 'bookings');

  // Initialize helpers
  window.triggerLiveRadarCheck();
  window.recalcSmartPrice();
  window.loadSmartReceivers();
}

// =====================================================================
// 7. REAL-TIME RADAR & CLASH DETECTION (Zero-Error Guarantee)
// =====================================================================
window.triggerLiveRadarCheck = function() {
  const roomId = document.getElementById('roomId')?.value;
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const banner = document.getElementById('liveRadarBanner');
  if (!banner) return;

  if (!roomId || !ci || !co) {
    banner.innerHTML = '';
    return;
  }

  const existing = window._smartRecentBookings || [];
  const clashes = existing.filter(b => 
    b.room_id === roomId &&
    !b.is_cancelled &&
    b.check_in && b.check_out &&
    b.check_in < co && b.check_out > ci
  );

  if (clashes.length > 0) {
    // Find free rooms for the same dates
    const allRooms = window._roomsCache || [];
    const busyRoomIds = new Set(
      existing.filter(b => !b.is_cancelled && b.check_in && b.check_out && b.check_in < co && b.check_out > ci)
        .map(b => b.room_id)
    );
    const freeRooms = allRooms.filter(r => !busyRoomIds.has(r.room_id) && r.room_id !== roomId);

    banner.innerHTML = `
      <div class="sbk-radar-box sbk-radar-conflict">
        <div style="font-weight:700;display:flex;align-items:center;gap:6px;">
          <span>⚠️ Conflict Warning:</span>
          <span>Room already booked for: <strong>${escapeHtml(clashes[0].guest_name || 'Guest')}</strong> (${clashes[0].check_in} → ${clashes[0].check_out})</span>
        </div>
        ${freeRooms.length > 0 ? `
          <div style="margin-top:6px;font-size:12px;">
            <strong>💡 Available alternatives for these dates:</strong>
            <div class="sbk-alt-rooms-bar">
              ${freeRooms.slice(0, 5).map(fr => `
                <button type="button" class="sbk-alt-room-btn" onclick="window.selectAlternativeRoom('${fr.room_id}')">
                  + Switch to ${propLabel(fr)}
                </button>
              `).join('')}
            </div>
          </div>
        ` : '<div style="margin-top:4px;font-size:11.5px;">All homestays in this category are occupied for these dates.</div>'}
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div class="sbk-radar-box sbk-radar-available">
        <span style="font-size:16px;">✅</span>
        <div>
          <strong>100% Available!</strong> No booking conflicts detected for this homestay on selected dates.
        </div>
      </div>
    `;
  }

  window.suggestDefaultPrice();
};

window.selectAlternativeRoom = function(roomId) {
  const sel = document.getElementById('roomId');
  if (sel) {
    sel.value = roomId;
    window.triggerLiveRadarCheck();
    window.suggestDefaultPrice();
  }
};

window.onSmartDateChange = function(source) {
  const ci = document.getElementById('checkIn')?.value;
  let co = document.getElementById('checkOut')?.value;

  if (ci && co && co <= ci) {
    const nextDate = new Date(new Date(ci).getTime() + 86400000).toISOString().slice(0, 10);
    document.getElementById('checkOut').value = nextDate;
  }

  window.triggerLiveRadarCheck();
  window.recalcSmartPrice();
};

window.suggestDefaultPrice = function() {
  const roomId = document.getElementById('roomId')?.value;
  const totInput = document.getElementById('totalAmount');
  if (!roomId || !totInput) return;

  const room = (window._roomsCache || []).find(r => r.room_id === roomId);
  const baseRate = room?.rent_per_night || 3499;

  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = (ci && co) ? Math.max(calcNights(ci, co), 1) : 1;

  if (!totInput.value || totInput.dataset.autoFilled === 'true') {
    totInput.value = baseRate * nights;
    totInput.dataset.autoFilled = 'true';
    window.recalcSmartPrice();
  }
};

window.recalcSmartPrice = function() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = (ci && co) ? Math.max(calcNights(ci, co), 1) : 1;

  const tot = parseFloat(document.getElementById('totalAmount')?.value) || 0;
  const adv = parseFloat(document.getElementById('advanceAmt')?.value) || 0;
  const bal = Math.max(0, tot - adv);

  const nSummary = document.getElementById('smartNightsSummary');
  if (nSummary) nSummary.textContent = `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;

  const tSummary = document.getElementById('smartTotalSummary');
  if (tSummary) tSummary.textContent = `₹${tot.toLocaleString('en-IN')}`;

  const aSummary = document.getElementById('smartAdvanceSummary');
  if (aSummary) aSummary.textContent = `₹${adv.toLocaleString('en-IN')}`;

  const bSummary = document.getElementById('smartBalanceSummary');
  const bRow = document.getElementById('smartBalanceRow');
  if (bSummary) bSummary.textContent = `₹${Math.round(bal).toLocaleString('en-IN')}`;

  if (bRow) {
    if (bal <= 0 && tot > 0) {
      bRow.className = 'sbk-price-row balance zero';
      bSummary.textContent = '✅ Fully Paid in Advance';
    } else {
      bRow.className = 'sbk-price-row balance';
    }
  }

  // Show/hide advance details
  const advRow = document.getElementById('smartAdvDetailsRow');
  if (advRow) {
    advRow.style.display = adv > 0 ? 'grid' : 'none';
  }
};

window.onSmartPhoneInput = async function(val) {
  const clean = (val || '').replace(/[^0-9]/g, '');
  const banner = document.getElementById('repeatGuestBanner');
  if (!banner) return;

  if (clean.length === 10) {
    const { data: pastStays } = await sb.from('guest_register')
      .select('guest_name, check_in, check_out, total_amount, id_proof_photo_paths, id_proof_photo_path, client_rating')
      .eq('phone', clean)
      .neq('is_cancelled', true)
      .order('check_in', { ascending: false });

    if (pastStays && pastStays.length > 0) {
      const mostRecent = pastStays[0];
      const gNameInput = document.getElementById('guestName');
      if (gNameInput && !gNameInput.value) {
        gNameInput.value = mostRecent.guest_name || '';
      }

      banner.innerHTML = `
        <div class="sbk-repeat-guest-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="color:var(--primary);font-size:13.5px;">🌟 Repeat Guest: ${escapeHtml(mostRecent.guest_name)}</strong>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
                Stayed ${pastStays.length} time${pastStays.length > 1 ? 's' : ''} previously at UHHS homestays.
              </div>
            </div>
            ${mostRecent.id_proof_photo_paths ? `
              <button type="button" class="btn-sm" style="background:var(--primary);color:#fff;font-size:11px;padding:4px 10px;" 
                onclick="window.reusePastGuestIds('${clean}')">
                ♻️ Reuse Saved IDs
              </button>
            ` : ''}
          </div>
        </div>
      `;
      return;
    }
  }
  banner.innerHTML = '';
};

window.reusePastGuestIds = async function(phone) {
  const { data: past } = await sb.from('guest_register')
    .select('id_proof_photo_paths, id_proof_photo_path, id_proof_front_paths, id_proof_back_paths, id_proof_type, id_proof_no')
    .eq('phone', phone)
    .not('id_proof_photo_paths', 'is', null)
    .limit(1)
    .single();

  if (past) {
    window._rebookedGuestData = past;
    const typeEl = document.getElementById('idType');
    const noEl = document.getElementById('idNo');
    if (typeEl && past.id_proof_type) typeEl.value = past.id_proof_type;
    if (noEl && past.id_proof_no) noEl.value = past.id_proof_no;
    alert('✅ Previous ID proofs linked successfully! No need to re-upload.');
  }
};

window.loadSmartReceivers = async function() {
  const sel = document.getElementById('advReceivedBy');
  if (!sel) return;

  if (typeof loadReceiveByHolders === 'function') {
    const data = await loadReceiveByHolders();
    const allReceivers = [...(data.owners || []), ...(data.manager || []), ...(data.employees || [])];
    const unique = [...new Set(allReceivers)];
    sel.innerHTML = '<option value="">-- Select Team Member --</option>' +
      unique.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  } else {
    sel.innerHTML = `
      <option value="">-- Select Team Member --</option>
      <option value="Shahenshah">👑 Shahenshah (Owner)</option>
      <option value="Firoz">👑 Firoz (Owner)</option>
      <option value="Manager">👔 Manager</option>
      <option value="Caretaker">🧹 Caretaker</option>
    `;
  }
};

window.onSmartAdvModeChange = function(mode) {
  const label = document.getElementById('smartAdvReceivedByLabel');
  if (!label) return;
  if (mode === 'Cash') label.innerHTML = '💵 Cash Handed Over To *';
  else if (mode === 'UPI') label.innerHTML = '📱 UPI Received In *';
  else label.innerHTML = '💰 Received By *';
};

window.toggleAccordion = function(id) {
  const body = document.getElementById(id);
  const icon = document.getElementById(id + 'Icon');
  if (body) {
    const isClosed = body.style.display === 'none';
    body.style.display = isClosed ? 'block' : 'none';
    if (icon) icon.textContent = isClosed ? '▲' : '▼';
  }
};

window.saveSmartBooking = async function() {
  const btn = document.getElementById('smartSaveBtn');
  const errDiv = document.getElementById('smartAddBkErr');
  errDiv.innerHTML = '';

  const gn = document.getElementById('guestName')?.value?.trim();
  const ph = document.getElementById('guestPhone')?.value?.trim();
  const rid = document.getElementById('roomId')?.value;
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const tot = parseFloat(document.getElementById('totalAmount')?.value) || 0;
  const adv = parseFloat(document.getElementById('advanceAmt')?.value) || 0;
  const advMode = document.getElementById('advMode')?.value || 'UPI';
  const receivedBy = document.getElementById('advReceivedBy')?.value || null;

  // Validations
  if (!gn) {
    errDiv.innerHTML = '<div class="error">⚠️ Guest Name is required.</div>';
    document.getElementById('guestName')?.focus();
    return;
  }
  if (!rid) {
    errDiv.innerHTML = '<div class="error">⚠️ Please select a homestay property.</div>';
    document.getElementById('roomId')?.focus();
    return;
  }
  if (!ci || !co) {
    errDiv.innerHTML = '<div class="error">⚠️ Check-in and Check-out dates are required.</div>';
    return;
  }
  if (adv > 0 && !receivedBy) {
    errDiv.innerHTML = '<div class="error">⚠️ Since advance payment was taken, please select who received it.</div>';
    document.getElementById('advReceivedBy')?.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Saving & Locking Booking...';

  try {
    const bkId = 'B' + Date.now();
    const nights = Math.max(calcNights(ci, co), 1);
    const perDayRate = Math.round(tot / nights);
    const checkoutConfirmed = document.getElementById('checkoutConfirmed')?.value !== 'no';
    const isOnline = document.getElementById('bookingMode')?.value === 'Online-Airbnb';
    const airbnbCode = document.getElementById('airbnbCode')?.value?.trim() || null;
    const isReview = document.getElementById('isReviewBooking')?.checked || false;

    // Photos
    let photos = { firstPath: null, allPaths: null, frontPaths: null, backPaths: null };
    if (window._rebookedGuestData) {
      photos = {
        firstPath: window._rebookedGuestData.id_proof_photo_path,
        allPaths: window._rebookedGuestData.id_proof_photo_paths,
        frontPaths: window._rebookedGuestData.id_proof_front_paths,
        backPaths: window._rebookedGuestData.id_proof_back_paths
      };
    } else if (typeof uploadIdPhotos === 'function') {
      photos = await uploadIdPhotos(bkId);
    }

    const payStatus = isOnline ? 'Paid' : (adv >= tot && tot > 0 ? 'Paid' : (adv > 0 ? 'Partial' : 'Unpaid'));

    const insertObj = {
      booking_id: bkId,
      guest_name: gn,
      phone: ph || null,
      room_id: rid,
      check_in: ci,
      check_out: co,
      check_in_time: document.getElementById('checkInTime')?.value || '14:00',
      check_out_time: document.getElementById('checkOutTime')?.value || '11:00',
      checkout_confirmed: checkoutConfirmed,
      guests: parseInt(document.getElementById('guests')?.value) || 2,
      booking_mode: isOnline ? 'Online-Airbnb' : 'Offline',
      airbnb_confirmation_code: airbnbCode,
      is_review_booking: isReview,
      total_amount: tot,
      per_day_rate: perDayRate,
      payment_status: payStatus,
      id_proof_type: document.getElementById('idType')?.value || 'Aadhar',
      id_proof_no: document.getElementById('idNo')?.value?.trim() || null,
      id_proof_photo_path: photos.firstPath,
      id_proof_photo_paths: photos.allPaths,
      id_proof_front_paths: photos.frontPaths,
      id_proof_back_paths: photos.backPaths,
      has_vehicle: !!(document.getElementById('vehicleNumber')?.value?.trim()),
      vehicle_name: document.getElementById('vehicleName')?.value?.trim() || null,
      vehicle_number: document.getElementById('vehicleNumber')?.value?.trim() || null,
      notes: document.getElementById('bkNotes')?.value?.trim() || null,
      booked_by: SESSION.displayName || SESSION.role || 'Staff'
    };

    const { error: insErr } = await sb.from('guest_register').insert(insertObj);
    if (insErr) throw insErr;

    // Record payment if advance > 0
    if (adv > 0) {
      await sb.from('payment_history').insert({
        booking_id: bkId,
        amount: adv,
        payment_mode: advMode,
        payment_date: ci,
        received_by: receivedBy,
        handover_status: advMode === 'Cash' ? 'in_hand' : 'handed_over',
        notes: 'Advance booking deposit',
        created_by: SESSION.userId || null
      });
    }

    // Automated WhatsApp Operations: Direct Guest Booking Pass & Booking Group Alert
    try {
      const roomSelectEl = document.getElementById('roomId');
      const roomText = roomSelectEl?.selectedOptions[0]?.text || insertObj.room_id;
      const bkPayload = {
        booking_id: bkId,
        guest_name: insertObj.guest_name,
        phone: insertObj.phone,
        room_id: insertObj.room_id,
        room_name: roomText,
        booking_mode: insertObj.booking_mode,
        check_in: insertObj.check_in,
        check_out: insertObj.check_out,
        check_in_time: insertObj.check_in_time || '14:00',
        check_out_time: insertObj.check_out_time || '11:00',
        total_amount: insertObj.total_amount,
        advance: adv,
        payment_status: insertObj.payment_status
      };
      if (typeof window.triggerGuestBookingPass === 'function') {
        window.triggerGuestBookingPass(bkPayload).catch(err => console.warn('Guest booking pass error:', err));
      }
      if (typeof window.triggerBookingGroupAlert === 'function') {
        window.triggerBookingGroupAlert(bkPayload).catch(err => console.warn('Booking group alert error:', err));
      }
      if (typeof window.triggerInvestorBookingAlert === 'function') {
        window.triggerInvestorBookingAlert(bkPayload).catch(err => console.warn('Investor booking alert error:', err));
      }
    } catch(e) { console.warn('WhatsApp trigger error in smart bookings:', e); }

    if (window.fsn?.toast) {
      fsn.toast('🎉 Booking Saved Successfully!');
    } else {
      alert('🎉 Booking Saved Successfully!');
    }

    // Refresh and navigate to bookings list
    window._bookingPrefill = null;
    renderSmartManageBookings();

  } catch (err) {
    console.error('Error saving booking:', err);
    errDiv.innerHTML = `<div class="error">❌ Failed to save booking: ${escapeHtml(err.message)}</div>`;
    btn.disabled = false;
    btn.textContent = '💾 Confirm & Save Booking';
  }
};

// =====================================================================
// 8. BACKWARD COMPATIBILITY & OVERRIDES
// =====================================================================
// Preserve original references for graceful fallback
if (typeof window.renderManageBookings === 'function' && !window.renderClassicManageBookings) {
  window.renderClassicManageBookings = window.renderManageBookings;
}
if (typeof window.renderAddBooking === 'function' && !window.renderClassicAddBooking) {
  window.renderClassicAddBooking = window.renderAddBooking;
}

// Override with Smart Next-Gen Views
window.renderManageBookings = renderSmartManageBookings;
window.renderAddBooking = renderSmartAddBooking;
