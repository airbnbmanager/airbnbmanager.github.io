/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES (UHHS) — SMART BOOKING SYSTEM (Next-Gen)
 * Developer: Praveen Singh
 * Zero-Error, Fast, Mobile-First Booking Engine & Command Center
 * =====================================================================
 */

window._sbkState = {
  activeTab: 'today',        // 'today', 'upcoming', 'inhouse', 'all', 'arrivals', 'departures', 'due', 'pending', 'airbnb', 'direct'
  viewMode: (function() {
    try {
      const saved = localStorage.getItem('sbk_view_mode');
      if (saved && ['airbnb', 'cards', 'table'].includes(saved)) return saved;
    } catch(e) {}
    return 'airbnb';
  })(),
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

function formatDate(dStr) {
  if (!dStr) return '';
  try {
    const p = String(dStr).split('-');
    if (p.length === 3) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
      const mIdx = parseInt(p[1], 10) - 1;
      return `${parseInt(p[2], 10)} ${months[mIdx] || p[1]} ${p[0]}`;
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? String(dStr) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dStr);
  }
}

window.computeFilteredBookings = function(all, paidMap, today) {
  let filtered = [...(all || [])];
  if (window._myAssignedRooms?.length) {
    filtered = filtered.filter(b => window._myAssignedRooms.includes(b.room_id));
  }

  const sq = (window._sbkState.searchQuery || '').trim().toLowerCase();
  const tab = window._sbkState.activeTab || 'today';

  if (sq) {
    const rawTokens = sq.split(/\s+/).filter(Boolean);
    const sqDigits = sq.replace(/\D/g, '');

    filtered = filtered.filter(b => {
      // 1. Robust Phone matching (+91, 91, 0, spaces, dashes)
      if (window.matchPhoneSearch && window.matchPhoneSearch(sq, b.phone)) return true;

      // 2. Digits matching (Aadhaar/ID, Booking ID, Amount)
      const bPhoneDigits = String(b.phone || '').replace(/\D/g, '');
      const bIdDigits = String(b.id_proof_no || '').replace(/\D/g, '');
      const bBookingIdDigits = String(b.booking_id || '').replace(/\D/g, '');

      if (sqDigits.length >= 3) {
        if (bPhoneDigits.includes(sqDigits)) return true;
        if (bIdDigits.includes(sqDigits)) return true;
        if (bBookingIdDigits.includes(sqDigits)) return true;
      }

      // 3. Fallback room data lookup if rooms foreign object is missing
      const roomObj = b.rooms || window._roomsCache?.find(r => r.room_id === b.room_id) || {};

      // 4. Comprehensive text bundle for this booking
      const textBundle = [
        b.guest_name || '',
        b.phone || '',
        b.booking_id || '',
        b.stay_group_id || '',
        b.airbnb_confirmation_code || '',
        b.id_proof_no || '',
        b.id_proof_type || '',
        b.notes || '',
        b.vehicle_name || '',
        b.vehicle_number || '',
        b.booked_by || '',
        b.room_id || '',
        roomObj.nickname || '',
        roomObj.unit_no || '',
        roomObj.property_name || '',
        roomObj.address || '',
        b.check_in || '',
        b.check_out || '',
        formatDate(b.check_in),
        formatDate(b.check_out),
        b.booking_mode || '',
        b.payment_status || '',
        String(b.total_amount || '')
      ].join(' ').toLowerCase();

      // If full query is in the bundle
      if (textBundle.includes(sq)) return true;

      // Or if all space-separated tokens match inside the bundle
      if (rawTokens.length > 1 && rawTokens.every(tok => textBundle.includes(tok))) {
        return true;
      }

      return false;
    });

    // Chronological sort for search results (latest stays first)
    filtered.sort((a, b) => (b.check_in || '').localeCompare(a.check_in || ''));
  } else {
    // Normal Tab-based filtering when NOT searching
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
      filtered.sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
    } else if (tab === 'inhouse') {
      filtered = filtered.filter(b => b.check_in <= today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false)) && !b.is_cancelled);
      filtered.sort((a, b) => (a.check_out || '').localeCompare(b.check_out || ''));
    } else if (tab === 'all') {
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
      filtered = filtered.filter(b => {
        const s = window.getBookingSource ? window.getBookingSource(b) : null;
        return s ? s.type === 'airbnb' : (b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code);
      });
    } else if (window._sbkState.channelFilter === 'bookingcom') {
      filtered = filtered.filter(b => {
        const s = window.getBookingSource ? window.getBookingSource(b) : null;
        return s ? s.type === 'booking_com' : (b.booking_mode || '').toLowerCase().includes('booking.com');
      });
    } else if (window._sbkState.channelFilter === 'direct') {
      filtered = filtered.filter(b => {
        const s = window.getBookingSource ? window.getBookingSource(b) : null;
        return s ? s.type === 'direct' : (b.booking_mode !== 'Online-Airbnb' && !b.airbnb_confirmation_code);
      });
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

    if (window._sbkState.propertyFilter) {
      filtered = filtered.filter(b => b.room_id === window._sbkState.propertyFilter);
    }
  }

  return filtered;
};

window.getSbkHeroTitle = function(count, sq, tab) {
  if (sq) {
    return `${count} reservation${count === 1 ? '' : 's'} matching "${escapeHtml(sq)}"`;
  } else if (tab === 'today') {
    return `You have ${count} reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'upcoming') {
    return `You have ${count} upcoming reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'inhouse') {
    return `You have ${count} in-house stay${count === 1 ? '' : 's'}`;
  } else if (tab === 'all') {
    return `All Guests & Reservations (${count})`;
  } else if (tab === 'due') {
    return `You have ${count} reservation${count === 1 ? '' : 's'} with balance due`;
  } else if (tab === 'arrivals') {
    return `You have ${count} check-in${count === 1 ? '' : 's'} today`;
  } else if (tab === 'departures') {
    return `You have ${count} checkout${count === 1 ? '' : 's'} today`;
  } else if (tab === 'pending') {
    return `You have ${count} pending booking${count === 1 ? '' : 's'} awaiting approval`;
  } else if (tab === 'airbnb') {
    return `You have ${count} Airbnb reservation${count === 1 ? '' : 's'}`;
  } else if (tab === 'direct') {
    return `You have ${count} Direct reservation${count === 1 ? '' : 's'}`;
  } else {
    return `You have ${count} reservation${count === 1 ? '' : 's'}`;
  }
};

// =====================================================================
// 1. MAIN COMMAND CENTER: RENDER MANAGE BOOKINGS (Airbnb Host Style)
// =====================================================================
async function renderSmartManageBookings(forceRefresh = false) {
  if (window._sbkState.classicMode && typeof window.renderClassicManageBookings === 'function') {
    return window.renderClassicManageBookings();
  }

  const today = new Date().toISOString().slice(0, 10);

  // If we already have cached bookings & rooms in memory and not forcing refresh,
  // we do NOT show a loading screen or query Supabase over network (instant 0ms response!)
  const hasCachedData = !forceRefresh && 
    window._sbkState.cachedBookings && 
    window._sbkState.cachedBookings.length > 0 && 
    window._sbkState.cachedRooms && 
    window._sbkState.cachedRooms.length > 0;

  if (!hasCachedData) {
    renderShell(`<div class="loading" style="padding:40px;text-align:center;"><div class="spinner"></div><div style="margin-top:10px;font-weight:600;color:var(--muted);">Loading TUHH Bookings Command Center...</div></div>`, 'bookings');

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
  }

  const all = window._sbkState.cachedBookings || [];
  const rooms = window._sbkState.cachedRooms || [];
  const paidMap = window._sbkState.cachedPaidMap || window._bkPaidMap || {};

  // Compute guest phone frequencies to detect multi-stay / group guests even without stay_group_id
  const phoneCounts = {};
  (all || []).forEach(x => {
    if (x.phone && !x.is_cancelled && x.verification_status !== 'rejected') {
      const p = String(x.phone).replace(/\D/g, '').slice(-10);
      if (p.length === 10) phoneCounts[p] = (phoneCounts[p] || 0) + 1;
    }
  });
  window._sbkState.phoneCounts = phoneCounts;

  // Compute operational KPIs
  const globalProp = (typeof window.getGlobalSelectedProperty === 'function') ? window.getGlobalSelectedProperty() : '';
  const curPropFilter = (globalProp !== '') ? globalProp : (window._sbkState.propertyFilter || '');
  window._sbkState.propertyFilter = curPropFilter;

  let rawActive = (all || []).filter(b => !b.is_cancelled && b.verification_status !== 'rejected');

  // STRICT PROTECTION: Deduplicate overlapping online channel bookings on the same physical room
  // (Prevents duplicate Airbnb/Booking.com reservations on the same room for overlapping dates)
  const toCancelGhostIds = new Set();
  const keptOnlineMap = [];

  const scoreBooking = (b) => {
    let score = 0;
    const isOnline = (b.booking_mode || '').includes('Online') || !!b.airbnb_confirmation_code;
    if (!isOnline) return 9999;
    const gName = (b.guest_name || '').trim().toLowerCase();
    // Real guest name scores much higher than placeholder 'Airbnb's group of...'
    if (gName && !gName.startsWith('airbnb') && !gName.startsWith("airbnb's")) score += 50;
    if (Number(b.total_amount || 0) > 0) score += 40;
    if (b.phone && String(b.phone).trim().length >= 8) score += 20;
    if (b.id_proof_url) score += 15;
    if (b.client_rating) score += 5;
    return score;
  };

  const sortedCandidates = [...rawActive].sort((a, b) => scoreBooking(b) - scoreBooking(a));

  for (const b of sortedCandidates) {
    const isOnline = (b.booking_mode || '').includes('Online') || !!b.airbnb_confirmation_code;
    if (!isOnline) {
      keptOnlineMap.push(b);
      continue;
    }

    const bIn = b.check_in || '';
    const bOut = b.check_out || b.check_in || '';

    // Check if an existing online booking already claimed this physical room on overlapping dates
    const overlaps = keptOnlineMap.some(existing => {
      const existingIsOnline = (existing.booking_mode || '').includes('Online') || !!existing.airbnb_confirmation_code;
      if (!existingIsOnline) return false;
      if (existing.room_id !== b.room_id) return false;
      const eIn = existing.check_in || '';
      const eOut = existing.check_out || existing.check_in || '';
      return (bIn < eOut && bOut > eIn);
    });

    if (overlaps) {
      toCancelGhostIds.add(b.booking_id);
    } else {
      keptOnlineMap.push(b);
    }
  }

  // Auto-cancel ghost duplicate bookings in Supabase asynchronously
  if (toCancelGhostIds.size > 0 && typeof sb !== 'undefined') {
    const ghostList = Array.from(toCancelGhostIds);
    console.warn('[SmartBookings] Auto-purging duplicate online bookings on same room:', ghostList);
    sb.from('guest_register')
      .update({ is_cancelled: true, notes: 'Auto-cancelled: Duplicate online booking collision detected on same room' })
      .in('booking_id', ghostList)
      .then(({ error }) => {
        if (error) console.error('[SmartBookings] Failed auto-cancelling duplicate online booking:', error);
      });
  }

  let activeBookings = keptOnlineMap;
  if (window._myAssignedRooms?.length) {
    activeBookings = activeBookings.filter(b => window._myAssignedRooms.includes(b.room_id));
  }
  if (curPropFilter) {
    activeBookings = activeBookings.filter(b => b.room_id === curPropFilter);
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

  // Sync global search if present
  if (window.SESSION?.bookingSearch && !window._sbkState.searchQuery) {
    window._sbkState.searchQuery = window.SESSION.bookingSearch;
  }

  const tab = window._sbkState.activeTab || 'today';
  const sq = (window._sbkState.searchQuery || '').trim().toLowerCase();

  // Apply filters via shared fast compute function
  const filtered = window.computeFilteredBookings(all, paidMap, today);

  const canM = ['owner','admin','manager','moderator','developer'].includes(SESSION.role);

  // Active filter count for badge
  let activeFilterCount = 0;
  if (window._sbkState.propertyFilter) activeFilterCount++;
  if (window._sbkState.channelFilter) activeFilterCount++;
  if (window._sbkState.paymentFilter) activeFilterCount++;

  // Determine hero heading like Airbnb
  let heroTitle = window.getSbkHeroTitle(filtered.length, sq, tab);

  // Render View HTML
  const html = `
    <div class="airbnb-host-wrap">
      ${pendingApprovalsCount > 0 ? `
        <div class="website-pending-alert-banner" onclick="window.setBookingTab ? window.setBookingTab('pending') : navigate('pendingApprovals')" style="cursor:pointer;background:linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);border:2px solid #F59E0B;border-radius:14px;padding:12px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;box-shadow:0 3px 12px rgba(245,158,11,0.15);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:26px;line-height:1;">🌐</div>
            <div>
              <div style="font-weight:800;color:#92400E;font-size:14px;">
                🔔 ${pendingApprovalsCount} Website Booking Request${pendingApprovalsCount > 1 ? 's' : ''} Awaiting Approval!
              </div>
              <div style="font-size:12px;color:#78350F;margin-top:2px;">
                Direct booking from website — Click to review guest details, verify & approve.
              </div>
            </div>
          </div>
          <button class="btn-sm" style="background:#0F172A;color:#fff;border-radius:20px;font-weight:700;padding:6px 16px;border:none;cursor:pointer;font-size:12px;" onclick="event.stopPropagation();navigate('pendingApprovals')">
            🟡 Open Approvals (${pendingApprovalsCount}) ➔
          </button>
        </div>
      ` : ''}
      <!-- Centered Pill Bar & Filter Actions (Matches Airbnb Mobile Header) -->
      <div class="airbnb-header-bar">
        <div class="airbnb-pills-center" id="sbkPillsRow">
          <button class="airbnb-pill ${tab === 'today' ? 'active' : ''}" onclick="window.setBookingTab('today')" id="sbkTabToday">
            Today <span class="airbnb-pill-num">${todayCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'upcoming' ? 'active' : ''}" onclick="window.setBookingTab('upcoming')" id="sbkTabUpcoming">
            Upcoming <span class="airbnb-pill-num">${upcomingCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'inhouse' ? 'active' : ''}" onclick="window.setBookingTab('inhouse')" id="sbkTabInhouse">
            In-House <span class="airbnb-pill-num">${inHouseCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'due' ? 'active' : ''}" onclick="window.setBookingTab('due')" id="sbkTabDue" style="${dueCount > 0 ? 'background:#FEF2F2;color:#991B1B;border-color:#EF4444;font-weight:700;' : ''}">
            💰 Balance Due <span class="airbnb-pill-num" style="${dueCount > 0 ? 'background:#EF4444;color:#fff;' : ''}">${dueCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'pending' ? 'active' : ''}" onclick="window.setBookingTab('pending')" id="sbkTabPending" style="${pendingApprovalsCount > 0 ? 'background:#FEF3C7;color:#92400E;border-color:#F59E0B;font-weight:700;' : ''}">
            🟡 Pending <span class="airbnb-pill-num" style="${pendingApprovalsCount > 0 ? 'background:#F59E0B;color:#fff;' : ''}">${pendingApprovalsCount}</span>
          </button>
          <button class="airbnb-pill ${tab === 'all' ? 'active' : ''}" onclick="window.setBookingTab('all')" id="sbkTabAll" title="View all reservations / guests">
            All Guests <span class="airbnb-pill-num">${curPropFilter ? (all || []).filter(b => b.room_id === curPropFilter).length : (all?.length || 0)}</span>
          </button>
        </div>

        <div class="airbnb-header-actions">
          <button type="button" class="airbnb-filter-trigger" onclick="window.renderSmartManageBookings(true)" title="Refresh bookings from server" style="gap:4px;">
            <span>🔄</span>
            <span class="airbnb-filter-text">Refresh</span>
          </button>
          <button class="airbnb-filter-trigger ${window._sbkState.showFilters ? 'active' : ''}" onclick="window.toggleAirbnbFilter()" title="Filter Bookings">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            <span class="airbnb-filter-text">Filter</span>
            ${activeFilterCount > 0 ? `<span class="airbnb-pill-num">${activeFilterCount}</span>` : ''}
          </button>

          <div class="airbnb-view-switch" role="group" aria-label="View Mode">
            <button type="button" class="airbnb-view-btn ${window._sbkState.viewMode === 'airbnb' ? 'active' : ''}" onclick="window.toggleViewMode('airbnb')" title="Airbnb Style View">
              <span>🏠</span> <span>Airbnb</span>
            </button>
            <button type="button" class="airbnb-view-btn ${window._sbkState.viewMode === 'cards' ? 'active' : ''}" onclick="window.toggleViewMode('cards')" title="Grid Cards View">
              <span>🗂️</span> <span>Cards</span>
            </button>
            <button type="button" class="airbnb-view-btn ${window._sbkState.viewMode === 'table' ? 'active' : ''}" onclick="window.toggleViewMode('table')" title="Table View">
              <span>📑</span> <span>Table</span>
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
              <option value="bookingcom" ${window._sbkState.channelFilter === 'bookingcom' ? 'selected' : ''}>🏨 Booking.com Only</option>
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

      <!-- Streamlined Executive Header: Title & Subtitle Left, Search Right -->
      <div class="sbk-streamlined-bar" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:12px 0 16px 0;padding-bottom:12px;border-bottom:1px solid #E2E8F0;">
        <div>
          <h2 style="font-size:18px;font-weight:800;color:#0F172A;margin:0;letter-spacing:-0.2px;" id="sbkHeroHeading">
            ${heroTitle}
          </h2>
          <div id="sbkHeroSubheading" style="font-size:12.5px;color:#64748B;margin-top:2px;font-weight:500;">
            ${tab === 'today' && !sq ? `${departuresCount} check-outs • ${arrivalsCount} check-ins • ${Math.max(0, inHouseCount - arrivalsCount)} in-house` : `Showing ${filtered.length} stay${filtered.length === 1 ? '' : 's'}`}
          </div>
        </div>

        <!-- Integrated Search Bar -->
        <div style="display:flex;align-items:center;gap:8px;background:#ffffff;border:1.5px solid #CBD5E1;border-radius:24px;padding:5px 14px;box-shadow:0 1px 4px rgba(0,0,0,0.04);max-width:360px;flex:1;min-width:220px;">
          <span style="font-size:14px;color:#94A3B8;">🔍</span>
          <input type="text" id="sbkLiveSearch" placeholder="Search guest, phone, unit..."
            value="${escapeHtml(window._sbkState.searchQuery)}"
            style="border:none;outline:none;font-size:13px;color:#0F172A;width:100%;background:transparent;"
            oninput="window.handleSearchInput(this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();window.handleManualSearch();}" />
          ${window._sbkState.searchQuery ? `
            <button type="button" onclick="window.clearSearch();" style="border:none;background:transparent;cursor:pointer;color:#94A3B8;font-size:12px;padding:2px 4px;font-weight:700;" title="Clear search">✕</button>
          ` : ''}
        </div>
      </div>

      <!-- Reservation Presentation Container -->
      <div id="sbkReservationsContainer">
        ${tab === 'today' && !sq ? renderAirbnbFollowupsHtml(all, paidMap, canM, today) : ''}
        ${filtered.length === 0 ? `
          <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;text-align:center;padding:50px 20px;max-width:560px;margin:0 auto;">
            <div style="font-size:36px;margin-bottom:12px;">🏡</div>
            <div style="font-size:17px;font-weight:800;color:#0F172A;">No reservations found</div>
            <div style="font-size:13px;color:#64748B;margin-top:4px;">
              ${sq ? `No reservations matched "${escapeHtml(sq)}".` : (tab === 'today' ? 'There are no check-ins, check-outs, or stays scheduled for today.' : 'No reservations matched your current filter or search criteria.')}
            </div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
              ${tab === 'today' ? `
                <button class="btn-sm" style="background:#222222;color:#fff;border-radius:20px;font-weight:700;padding:7px 18px;border:none;" onclick="window.setBookingTab('upcoming')">
                  View Upcoming (${upcomingCount})
                </button>
              ` : ''}
              <button class="btn-sm outline" style="border-radius:20px;font-weight:700;padding:7px 18px;" onclick="${sq ? 'window.clearSearch()' : 'window.resetBookingFilters()'}">
                ${sq ? 'Clear Search' : 'Clear Filters'}
              </button>
            </div>
          </div>
        ` : window._sbkState.viewMode === 'table' ? renderBookingTableHtml(filtered, paidMap, canM, today) : window._sbkState.viewMode === 'cards' ? renderBookingCardsHtml(filtered, paidMap, canM, today) : renderAirbnbReservationsHtml(filtered, paidMap, canM, today)}
      </div>

      <!-- Airbnb-Style Floating Operations Banner (Matches bottom banner in screenshot) -->
      <div class="airbnb-notice-card" onclick="renderAddBooking()" style="cursor:pointer;">
        <div class="airbnb-notice-icon">✏️</div>
        <div class="airbnb-notice-content">
          <div class="airbnb-notice-title" style="color:#222222;font-size:14px;font-weight:700;">Host Operations Hub</div>
          <div class="airbnb-notice-desc" style="color:#717171;font-size:12.5px;font-weight:500;">17 Luxury Homestays &bull; iCal Channel Sync &amp; WhatsApp Active</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          ${canM ? `
            <button class="btn-sm" onclick="event.stopPropagation();if(window.openInvestorBookingBroadcastModal)window.openInvestorBookingBroadcastModal();else if(window.renderWhatsAppHub)window.renderWhatsAppHub();" style="background:#0F172A;color:#fff;border-radius:20px;font-weight:700;padding:6px 14px;border:none;font-size:12px;cursor:pointer;" title="Send date-wise booking updates to all property investors for any date range (from 1 Sep to today or custom)">
              📢 Broadcast to Investors
            </button>
            <button class="btn-sm" onclick="event.stopPropagation();window.renderMultiPropertyBooking()" style="background:#4F46E5;color:#fff;border-radius:20px;font-weight:700;padding:6px 14px;border:none;font-size:12px;cursor:pointer;" title="Book multiple homestays in one go for groups, family or wedding stays">
              🏢 + Multi-Property
            </button>
            <button class="btn-sm" onclick="event.stopPropagation();window.switchBookingWizardMode('single');renderAddBooking()" style="background:#222222;color:#fff;border-radius:20px;font-weight:700;padding:6px 14px;border:none;font-size:12px;cursor:pointer;">
              + New Single
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  renderShell(html, 'bookings');

  // Auto scroll active pill into view on mobile so current selection is always centered
  setTimeout(() => {
    const activePill = document.querySelector('.airbnb-pill.active');
    if (activePill && window.innerWidth <= 768) {
      activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 40);
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
  
  // Determine guest count (prioritize explicit guests field)
  let count = b.guests || b.num_guests || (b.adults ? (Number(b.adults) + Number(b.children || 0)) : null);
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
    return `${groupLabel} checks in`;
  }
  if (isStaying) {
    if (isOpenEnded) {
      const elapsed = Math.max(1, Math.ceil((new Date(today) - new Date(b.check_in)) / 86400000));
      return `${groupLabel} stays for one more day`;
    }
    const daysLeft = Math.max(1, Math.ceil((new Date(b.check_out) - new Date(today)) / 86400000));
    return `${groupLabel} stays for ${daysLeft === 1 ? 'one more day' : `${daysLeft} more days`}`;
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

const ROOM_COVER_FALLBACKS = {
  'GOM-201': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/3a24b7e0-b326-4061-8762-5b19ca4aa009.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-302': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1679190202218939181/original/2b71df14-f53a-42d4-88e7-44dc6c9542fe.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-102': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1676840617430941243/original/6c857410-b98a-40a2-aa55-e408ec21360d.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-101': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835345/original/40c49740-4cb6-411a-85d7-e075ebf91fc1.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-202': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1660898784168880630/original/ee9f92dc-201b-4171-888e-aee6e6bb2552.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-301': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1679155811558485419/original/40cf20ea-d2f1-4dfd-b0fc-40ff15f8c85c.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-401': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1723434530455939148/original/9157436b-67ee-45a0-9753-4876ec438965.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'GOM-501': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718385679817913833/original/d69e46a7-d86b-4e60-84a2-e64e528b18ec.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-105': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1592729918855637425/original/f9826cd1-b559-468f-bc68-754a745af7a2.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-104': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1593461780265937810/original/71a2e9b0-96f3-4d40-beec-df0df57e1c16.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-103': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1592729438969718728/original/6ea4b638-31ea-42f0-911e-ec2136e053f3.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-101': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1721732716374002179/original/d2a3330d-85fa-44a6-9818-bc1c271ea048.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-102': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636687/original/3aa9bf2b-8a20-4389-a292-b88d3ca34015.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'LUL-402': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1606514664948608757/original/ce8c48a7-e74f-4d0d-bc01-9f939e6a9f02.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-107': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1727830063287100080/original/8cf7a521-5a21-419b-ab00-e79ecb059db6.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-106': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1739254108962193708/original/b3c7cf4c-5f6d-495d-b2a1-1c3905cbb206.jpeg?im_w=720&width=720&quality=70&auto=webp',
  'VIL-108': 'https://a0.muscache.com/im/pictures/hosting/Hosting-1756799939825259445/original/606da0ba-d28f-4aa7-920d-e2518e3881df.jpeg?im_w=720&width=720&quality=70&auto=webp'
};

function getPropertyCoverThumb(b) {
  const roomId = (b?.room_id || b?.source_room_id || '').trim();
  if (window.ShowcaseData && typeof window.ShowcaseData.getProperty === 'function') {
    const p = window.ShowcaseData.getProperty(roomId) ||
              (b.rooms?.nickname && window.ShowcaseData.getProperty(b.rooms.nickname)) ||
              (b.rooms?.property_name && window.ShowcaseData.getProperty(b.rooms.property_name));
    if (p && p.cover_image) return p.cover_image;
  }
  if (roomId && ROOM_COVER_FALLBACKS[roomId]) {
    return ROOM_COVER_FALLBACKS[roomId];
  }
  const nick = (b?.rooms?.nickname || b?.rooms?.property_name || '').toLowerCase();
  for (const [rid, url] of Object.entries(ROOM_COVER_FALLBACKS)) {
    if (nick && nick.includes(rid.toLowerCase())) return url;
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
        const isPast = !isOpenEnded && b.check_out < today;
        const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
        const bSrc = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
        const nights = (b.check_in && b.check_out) ? Math.max((typeof calcNights === 'function' ? calcNights(b.check_in, b.check_out) : Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000)), 1) : 1;

        // Left Time Column Content
        let timeMain = '';
        let timeSub = '';
        if (isCheckoutToday) {
          timeMain = (b.check_out_time ? b.check_out_time.replace(/:\d\d$/, '') : '11:00').replace(/\s*[ap]m/i, '');
          timeSub = '';
        } else if (isArrivalToday) {
          timeMain = (b.check_in_time ? b.check_in_time.replace(/:\d\d$/, '') : '14:00').replace(/\s*[ap]m/i, '');
          timeSub = '';
        } else if (isStayingAllDay) {
          timeMain = 'All day';
          timeSub = '';
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
        const isBlocked = b.booking_mode === 'Offline-Blocked' || b.guest_name === '🔒 Blocked Slot';

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

              <div class="airbnb-avatar-group" title="${isBlocked ? 'Blocked Slot' : escapeHtml(b.guest_name || 'Guest')} · ${escapeHtml(propertySub)}">
                ${isBlocked ? `
                  <img src="${propThumb}" class="airbnb-guest-avatar-img" alt="Property" onerror="this.outerHTML='<div class=\\'airbnb-guest-avatar-img\\' style=\\'background:#F3E8FF;color:#7E22CE;\\'>🔒</div>';" />
                  <div class="airbnb-property-thumb-badge" style="background:#0F172A;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;" title="Blocked Slot">
                    🔒
                  </div>
                ` : `
                  ${guestPhoto ? `
                    <img src="${guestPhoto}" class="airbnb-guest-avatar-img" alt="${escapeHtml(b.guest_name || 'Guest')}" onerror="this.outerHTML='<div class=\\'airbnb-guest-avatar-img\\' style=\\'background:${avatarInfo.bg};color:${avatarInfo.text};\\'>${escapeHtml(avatarInfo.initial)}</div>';" />
                  ` : `
                    <div class="airbnb-guest-avatar-img" style="background:${avatarInfo.bg};color:${avatarInfo.text};">
                      ${escapeHtml(avatarInfo.initial)}
                    </div>
                  `}
                  <img src="${propThumb}" class="airbnb-property-thumb-badge" alt="${escapeHtml(propertySub)}" title="${escapeHtml(propertySub)}" onerror="this.src='assets/logo.png'"/>
                `}
              </div>
            </div>

            <!-- Property Subtitle / Location -->
            <div class="airbnb-property-sub" title="${escapeHtml(propertySub)}">
              ${escapeHtml(propertySub)}
            </div>

            <!-- Card Bottom: Status Chips & Quick Actions -->
            <div class="airbnb-card-footer-row">
              <div class="airbnb-chips-row">
                <span class="airbnb-chip ${bSrc ? bSrc.chipClass : (isOnline ? 'airbnb' : 'direct')}">
                  ${bSrc ? bSrc.badge : (isOnline ? '🌐 Airbnb' : '🏠 Direct')}
                </span>
                
                ${bal > 0.99 ? `
                  <span class="airbnb-chip due">⚠️ ₹${Math.round(bal).toLocaleString('en-IN')} Due</span>
                ` : (isOnline && (dynamicTotal === 0 || b.payment_status === 'Pending CSV Payout')) ? `
                  <span class="airbnb-chip" style="background:#FEF3C7;color:#92400E;font-weight:700;border:1px solid #FDE68A;">⏳ Awaiting Airbnb Payout</span>
                ` : `
                  <span class="airbnb-chip paid">✅ Paid ₹${dynamicTotal.toLocaleString('en-IN')}</span>
                `}

                ${(b.stay_group_id || (b.phone && (window._sbkState?.phoneCounts?.[String(b.phone).replace(/\D/g, '').slice(-10)] || 0) > 1)) ? `
                  <span class="airbnb-chip" style="background:#EEF2FF;color:#4F46E5;font-weight:800;cursor:pointer;" onclick="event.stopPropagation();window.openMultiPropertyReceiptModal('${b.stay_group_id || b.phone || b.booking_id}')" title="Multi-Property Group Booking · Click to view combined receipt">
                    🏢 Group Stay${(!b.stay_group_id && b.phone && (window._sbkState?.phoneCounts?.[String(b.phone).replace(/\D/g, '').slice(-10)] || 0) > 1) ? ` (${window._sbkState.phoneCounts[String(b.phone).replace(/\D/g, '').slice(-10)]})` : ''}
                  </span>
                ` : ''}

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

                ${canM ? `
                  <button class="airbnb-action-circle delete" onclick="event.stopPropagation();if(window.delBooking) window.delBooking('${b.booking_id}','${escapeHtml(b.guest_name || 'Guest').replace(/'/g, "\\'")}','${b.room_id || ''}');" title="Delete Booking" style="background:#FEF2F2;border:1px solid #FECACA;font-size:12px;color:#DC2626;cursor:pointer;">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAirbnbFollowupsHtml(allBookings, paidMap, canM, today) {
  const approvals = [];
  const urgentOps = [];
  const balanceDue = [];

  (allBookings || []).forEach(b => {
    if (b.is_cancelled) return;
    const isToday = (b.check_in === today) || (b.check_out === today);
    const isInHouse = b.check_in < today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false));
    if (!isToday && !isInHouse) return; // Declutter: strictly focus on today's active tasks, not historical logs!

    const pd = paidMap[b.booking_id] || 0;
    const tot = b.total_amount || 0;
    const bal = tot - pd;
    const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;

    // 1. Pending Verification (Top Priority — Direct Website & Staff Bookings)
    if (b.verification_status === 'pending') {
      approvals.push({
        type: 'approval',
        title: `Pending booking approval`,
        subtitle: `${b.guest_name || 'Guest'} • ${b.rooms?.nickname || b.room_id || 'Room'} • Check-in: ${b.check_in || 'Upcoming'}`,
        actionText: '🟡 Verify',
        bookingId: b.booking_id
      });
    }

    // 2. Missing ID proof for in-house or today's arrivals
    const hasId = !!(b.id_proof_photo_paths || b.id_proof_photo_path);
    const isTodayOrInHouse = (b.check_in === today) || (b.check_in < today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false)));
    if (!hasId && isTodayOrInHouse && !b.guest_name?.toLowerCase().includes('blocked')) {
      urgentOps.push({
        type: 'id',
        title: `Upload ID proof for ${b.guest_name || 'Guest'}`,
        subtitle: `${b.rooms?.nickname || b.room_id || 'Unit'} • Arrived / In-house`,
        actionText: '🪪 Upload',
        bookingId: b.booking_id
      });
    }

    // 3. Overdue checkout (scheduled checkout date was in the past, but checkout wasn't confirmed)
    if (b.check_out && b.check_out < today && b.checkout_confirmed === false) {
      urgentOps.push({
        type: 'checkout',
        title: `Confirm checkout for ${b.guest_name || 'Guest'}`,
        subtitle: `${b.rooms?.nickname || b.room_id || 'Unit'} • Scheduled: ${b.check_out}`,
        actionText: '📤 Checkout',
        bookingId: b.booking_id
      });
    }

    // 4. Balance Due
    if (bal > 0.99 && (!isOnline || tot > 0)) {
      balanceDue.push({
        type: 'due',
        title: `Collect ₹${Math.round(bal).toLocaleString('en-IN')} balance`,
        subtitle: `${b.guest_name || 'Guest'} • ${b.rooms?.nickname || b.room_id || 'Room'}`,
        actionText: '💰 Collect',
        bookingId: b.booking_id
      });
    }
  });

  const followups = [...approvals, ...urgentOps, ...balanceDue];
  if (followups.length === 0) return '';

  const isExpanded = window._sbkState.expandFollowups || false;
  const displayFollowups = isExpanded ? followups.slice(0, 16) : followups.slice(0, 3);

  return `
    <div class="airbnb-followups-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;">
        <h2 class="airbnb-followups-title" style="margin:0;">Your follow-ups (${followups.length})</h2>
        ${followups.length > 3 ? `
          <button type="button" class="btn-sm outline" style="border-radius:16px;padding:4px 10px;font-size:11.5px;font-weight:700;cursor:pointer;" onclick="window.toggleFollowupsExpanded()">
            ${isExpanded ? '▴ Show Less' : `▾ View All (${followups.length})`}
          </button>
        ` : ''}
      </div>
      <div class="airbnb-followups-grid">
        ${displayFollowups.map(f => `
          <div class="airbnb-followup-card" onclick="window.openBookingDrawer('${f.bookingId}')">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13.5px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(f.title)}</div>
              <div style="font-size:12px;color:#64748B;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(f.subtitle)}</div>
            </div>
            <button class="btn-sm outline" style="border-radius:20px;font-weight:700;padding:5px 12px;font-size:12px;flex-shrink:0;" onclick="event.stopPropagation();window.openBookingDrawer('${f.bookingId}')">
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
        const isOpenEnded = !b.check_out && b.checkout_confirmed === false;
        const cin = b.check_in || today;
        const elapsedDays = Math.max(1, Math.ceil((new Date(today) - new Date(cin)) / 86400000));
        const dailyRate = b.per_day_rate || 0;
        const dynamicTotal = (isOpenEnded && dailyRate > 0) ? (elapsedDays * dailyRate) : (b.total_amount || 0);
        const bal = dynamicTotal - pd;

        const isActive = b.check_in <= today && (isOpenEnded || b.check_out > today);
        const isCheckoutToday = !isOpenEnded && b.check_out === today;
        const isArrivalToday = b.check_in === today;
        const isUpcoming = b.check_in > today;
        const isPast = !isOpenEnded && b.check_out < today;
        const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
        const bSrc = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;

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
                <div style="min-width:0;flex:1;">
                  <div class="sbk-guest-name" onclick="window.openBookingDrawer('${b.booking_id}')" title="${escapeHtml(b.guest_name || 'Guest')}">
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
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                ${statusBadge}
                ${(b.stay_group_id || (b.phone && (window._sbkState?.phoneCounts?.[String(b.phone).replace(/\D/g, '').slice(-10)] || 0) > 1)) ? `
                  <span class="sbk-status-badge" style="background:#EEF2FF;color:#4F46E5;cursor:pointer;font-weight:800;" onclick="event.stopPropagation();window.openMultiPropertyReceiptModal('${b.stay_group_id || b.phone || b.booking_id}')" title="Multi-Property Group Booking · Click for receipt">
                    🏢 Group Stay
                  </span>
                ` : ''}
              </div>
            </div>

            <!-- Stay Info: Property & Dates -->
            <div class="sbk-stay-info">
              <div style="min-width:0;flex:1;">
                <div class="sbk-room-tag">
                  <span>🏠</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(propLabel(b.rooms) || b.room_id)}</span>
                </div>
                <div style="font-size:11px;margin-top:2px;display:flex;align-items:center;gap:6px;">
                  <span class="channel-badge ${bSrc ? bSrc.badgeClass : (isOnline ? 'channel-airbnb' : 'channel-direct')}" style="font-size:11px;padding:2px 8px;">
                    ${bSrc ? bSrc.badge : (isOnline ? '🌐 Airbnb' : '🏠 Direct')}
                  </span>
                  ${b.verification_status === 'pending' ? '<span style="color:#D97706;font-weight:700;">🟡 Pending Approval</span>' : ''}
                </div>
                <div style="font-size:10.5px;color:#64748B;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span>👤 ${escapeHtml(b.booked_by || window._userNameCache?.[b.created_by] || 'Staff')}</span>
                  ${(window.getBookingTimestamp ? window.getBookingTimestamp(b) : b.created_at) && window.formatDateTimeStamp ? `<span title="Booking Timestamp">🕒 ${window.formatDateTimeStamp(window.getBookingTimestamp ? window.getBookingTimestamp(b) : b.created_at)}</span>` : ''}
                </div>
              </div>
              <div class="sbk-dates-tag" style="flex-shrink:0;text-align:right;">
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
            <div class="sbk-card-actions" style="flex-wrap:wrap;">
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
                <button class="sbk-action-btn" onclick="showPaymentModal('${b.booking_id}')" style="background:#ECFDF5;border-color:#10B981;color:#047857;flex:1 1 auto;font-weight:700;">
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
    <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;margin-bottom:24px;">
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;">
        <table class="sbk-custom-table" style="width:100%;min-width:1080px;margin:0;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
              <th style="padding:13px 16px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;width:120px;">Status</th>
              <th style="padding:13px 16px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;min-width:180px;">Guest &amp; Phone</th>
              <th style="padding:13px 16px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;min-width:170px;">Property</th>
              <th style="padding:13px 16px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;width:130px;">Channel</th>
              <th style="padding:13px 16px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;min-width:170px;">Stay Dates</th>
              <th style="padding:13px 16px;text-align:right;font-weight:700;color:#475569;white-space:nowrap;width:100px;">Total</th>
              <th style="padding:13px 16px;text-align:right;font-weight:700;color:#475569;white-space:nowrap;width:100px;">Paid</th>
              <th style="padding:13px 16px;text-align:right;font-weight:700;color:#475569;white-space:nowrap;width:110px;">Balance</th>
              <th style="padding:13px 16px;text-align:center;font-weight:700;color:#475569;white-space:nowrap;min-width:170px;">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => {
              const pd = paidMap[b.booking_id] || 0;
              const isOpenEnded = !b.check_out && b.checkout_confirmed === false;
              const nights = (b.check_in && b.check_out) ? Math.max((typeof calcNights === 'function' ? calcNights(b.check_in, b.check_out) : Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000)), 1) : 1;
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
              const bSrc = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
              const hasId = !!(b.id_proof_photo_paths || b.id_proof_photo_path);

              let statusBadge = '<span class="sbk-status-badge upcoming" style="white-space:nowrap;">Upcoming</span>';
              if (b.is_cancelled) statusBadge = '<span class="sbk-status-badge cancelled" style="white-space:nowrap;">Cancelled</span>';
              else if (isActive) statusBadge = isOpenEnded ? `<span class="sbk-status-badge open" style="white-space:nowrap;">Open (${elapsedDays}d)</span>` : '<span class="sbk-status-badge active" style="white-space:nowrap;">In-House</span>';
              else if (isCheckoutToday) statusBadge = '<span class="sbk-status-badge today" style="white-space:nowrap;">Leave Today</span>';
              else if (isArrivalToday) statusBadge = '<span class="sbk-status-badge upcoming" style="white-space:nowrap;">Arrive Today</span>';
              else if (isPast) statusBadge = '<span class="sbk-status-badge completed" style="white-space:nowrap;">Done</span>';

              const rowBg = isActive ? 'background:#F0FDF4;' : (isCheckoutToday ? 'background:#FFFBEB;' : '');

              return `
                <tr style="${rowBg}border-bottom:1px solid #F1F5F9;transition:background 0.15s ease;">
                  <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">${statusBadge}</td>
                  <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">
                    <div style="font-weight:700;color:var(--dark);cursor:pointer;" onclick="window.openBookingDrawer('${b.booking_id}')">
                      ${escapeHtml(b.guest_name || 'Guest')}
                    </div>
                    ${b.phone ? `
                      <div style="font-size:12px;color:var(--muted);margin-top:2px;display:flex;align-items:center;gap:6px;">
                        <span>📞 ${escapeHtml(b.phone)}</span>
                        <a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;font-weight:700;">Call</a>
                      </div>
                    ` : ''}
                    <div style="font-size:10.5px;color:#64748B;margin-top:2px;display:flex;align-items:center;gap:5px;">
                      <span>👤 ${escapeHtml(b.booked_by || window._userNameCache?.[b.created_by] || 'Staff')}</span>
                      ${(window.getBookingTimestamp ? window.getBookingTimestamp(b) : b.created_at) && window.formatDateTimeStamp ? `<span title="Booking Timestamp">· 🕒 ${window.formatDateTimeStamp(window.getBookingTimestamp ? window.getBookingTimestamp(b) : b.created_at)}</span>` : ''}
                    </div>
                  </td>
                  <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">
                    <div style="font-weight:700;color:var(--dark);">${escapeHtml(propLabel(b.rooms) || b.room_id)}</div>
                    <div style="font-size:11px;color:var(--muted);">${escapeHtml(b.rooms?.property_name || b.room_id)}</div>
                  </td>
                  <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">
                    <span class="channel-badge ${bSrc ? bSrc.badgeClass : (isOnline ? 'channel-airbnb' : 'channel-direct')}" style="white-space:nowrap;display:inline-flex;">
                      ${bSrc ? bSrc.badge : (isOnline ? 'Airbnb' : 'Direct')}
                    </span>
                    ${b.airbnb_confirmation_code ? `<div style="color:#FF385C;font-family:monospace;font-size:11px;font-weight:700;margin-top:3px;white-space:nowrap;">${escapeHtml(b.airbnb_confirmation_code)}</div>` : ''}
                  </td>
                  <td style="padding:12px 16px;white-space:nowrap;vertical-align:middle;">
                    <div style="font-weight:600;color:var(--dark);">
                      ${b.check_in || '-'} <span style="color:var(--muted);">→</span> ${isOpenEnded ? 'Open' : (b.check_out || '-')}
                    </div>
                    <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                      ${isOpenEnded ? `Day ${elapsedDays} so far` : `${nights} ${nights === 1 ? 'Night' : 'Nights'}`}
                    </div>
                  </td>
                  <td style="padding:12px 16px;text-align:right;font-weight:700;white-space:nowrap;vertical-align:middle;color:var(--dark);">
                    ₹${dynamicTotal.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:12px 16px;text-align:right;font-weight:700;color:#059669;white-space:nowrap;vertical-align:middle;">
                    ₹${pd.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:12px 16px;text-align:right;white-space:nowrap;vertical-align:middle;">
                    <strong class="${bal > 0.99 ? 'sbk-amt-pill due' : 'sbk-amt-pill paid'}" style="white-space:nowrap;">
                      ${bal > 0.99 ? `₹${Math.round(bal).toLocaleString('en-IN')} Due` : '✅ Paid'}
                    </strong>
                  </td>
                  <td style="padding:12px 16px;text-align:center;white-space:nowrap;vertical-align:middle;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">
                      <button class="btn-sm" onclick="window.openBookingDrawer('${b.booking_id}')" style="padding:6px 12px;font-weight:600;" title="Details &amp; Actions">
                        ⚡ Details
                      </button>
                      ${b.phone ? `
                        <button class="btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;padding:6px 9px;" onclick="window.sendWhatsAppToGuest('${b.phone}', '${escapeHtml(b.guest_name)}', '${b.booking_id}')" title="Chat on WhatsApp">
                          💬
                        </button>
                      ` : ''}
                      ${bal > 0.99 && canM ? `
                        <button class="btn-sm" style="background:#ECFDF5;border-color:#10B981;color:#047857;padding:6px 10px;font-weight:700;" onclick="showPaymentModal('${b.booking_id}')" title="Record Payment">
                          💰 Collect
                        </button>
                      ` : ''}
                      <button class="btn-sm" style="background:#F1F5F9;border-color:#CBD5E1;color:#334155;padding:6px 9px;" onclick="window.openBookingIdUploadModal('${b.booking_id}')" title="ID Proofs">
                        🪪 ${hasId ? 'IDs' : 'Upload'}
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
  if (!bookingId) return;
  if (!window._sbkState) window._sbkState = { cachedBookings: [], cachedPaidMap: {} };

  let all = window._sbkState.cachedBookings || [];
  let b = all.find(x => x.booking_id === bookingId);
  if (!b) {
    const { data: dbBooking } = await sb.from('guest_register')
      .select('*, rooms(nickname, unit_no, property_name)')
      .eq('booking_id', bookingId)
      .single();
    if (!dbBooking) {
      if (window.fsn) fsn.error('Not Found', 'Booking record not found.');
      else alert('Booking not found');
      return;
    }
    b = dbBooking;
    if (!window._sbkState.cachedBookings) window._sbkState.cachedBookings = [];
    window._sbkState.cachedBookings.push(b);
  }
  window._currentDrawerBooking = b;
  window._currentDrawerBookingId = b.booking_id;
  if (window._sbkState) window._sbkState.drawerBookingId = b.booking_id;

  // Fetch individual payments for this booking
  const { data: payments } = await sb.from('payment_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('payment_date', { ascending: true });

  let pd = (window._sbkState.cachedPaidMap || {})[b.booking_id];
  if (pd === undefined) {
    pd = (payments || []).filter(p => p.verification_status !== 'rejected').reduce((s, p) => s + (p.amount || 0), 0);
    if (!window._sbkState.cachedPaidMap) window._sbkState.cachedPaidMap = {};
    window._sbkState.cachedPaidMap[b.booking_id] = pd;
  }
  const tot = b.total_amount || 0;
  const bal = tot - pd;
  const isOnline = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
  const bSrc = (typeof window.getBookingSource === 'function') ? window.getBookingSource(b) : null;
  const canM = ['owner','admin','manager','moderator','developer'].includes(SESSION.role);
  const canD = ['developer','owner','admin'].includes(SESSION.role);

  let container = document.getElementById('sbkDrawerContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'sbkDrawerContainer';
    document.body.appendChild(container);
  } else if (container.parentElement !== document.body) {
    document.body.appendChild(container);
  }

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

          <!-- Direct Website Pending Approval Banner -->
          ${b.verification_status === 'pending' ? `
            <div style="background:linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);border:2px solid #F59E0B;border-radius:12px;padding:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;box-shadow:0 4px 12px rgba(245,158,11,0.15);">
              <div>
                <div style="font-size:13.5px;font-weight:800;color:#92400E;display:flex;align-items:center;gap:6px;">
                  <span>🟡</span> Direct Website Booking &mdash; Pending Approval
                </div>
                <div style="font-size:12px;color:#B45309;margin-top:2px;">
                  Review availability &amp; tariff. Click approve to confirm this booking into the active register.
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn-sm" onclick="window.approveBooking('${b.booking_id}')" style="background:#059669;color:#fff;border:none;padding:8px 16px;font-size:12.5px;font-weight:800;border-radius:8px;cursor:pointer;box-shadow:0 2px 6px rgba(5,150,105,0.3);">
                  ✅ Approve Booking
                </button>
                <button type="button" class="btn-sm" onclick="window.rejectBooking('${b.booking_id}')" style="background:#DC2626;color:#fff;border:none;padding:8px 14px;font-size:12.5px;font-weight:700;border-radius:8px;cursor:pointer;">
                  ❌ Reject
                </button>
              </div>
            </div>
          ` : ''}

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
              <button class="sbk-action-btn" onclick="window.openGuestPassModal('${b.booking_id}', '${escapeHtml(b.phone || '')}', '${escapeHtml(b.guest_name || '')}')" style="height:36px;padding:0 10px;border-radius:8px;font-size:12px;display:inline-flex;align-items:center;gap:5px;background:#0F172A;color:#fff;border:none;cursor:pointer;font-weight:700;" title="Digital Guest Pass">
                🪪 Pass
              </button>
              ${b.phone ? `
                <a href="tel:${b.phone}" class="sbk-action-btn call" style="width:36px;height:36px;border-radius:8px;font-size:16px;display:inline-flex;align-items:center;justify-content:center;background:#E2E8F0;text-decoration:none;" title="Call Guest">
                  📞
                </a>
              ` : ''}
            </div>
          </div>

          <!-- Prominent Security Deposit Notification (If present) -->
          ${(() => {
            const sec = (typeof getSecurityDeposit === 'function' ? getSecurityDeposit(b) : (typeof window.getSecurityDeposit === 'function' ? window.getSecurityDeposit(b) : null)) || (b.notes && b.notes.includes('[SECURITY_DEPOSIT:') ? (() => { try { return JSON.parse(b.notes.match(/\[SECURITY_DEPOSIT:([\s\S]*?)\]/i)[1]); } catch(e){ return null; } })() : null);
            const secAmt = parseFloat(sec?.amount || b.security_deposit_amount) || 0;
            if (secAmt > 0) {
              const isHeld = (sec?.status || b.security_deposit_status) === 'collected';
              const isRef = (sec?.status || b.security_deposit_status) === 'refunded';
              return `
                <div style="background:${isHeld ? '#EFF6FF' : (isRef ? '#F0FDF4' : '#FFFBEB')};border:2px solid ${isHeld ? '#3B82F6' : (isRef ? '#10B981' : '#F59E0B')};border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:24px;">🛡️</span>
                    <div>
                      <div style="font-size:11px;font-weight:800;color:${isHeld ? '#1E40AF' : (isRef ? '#166534' : '#92400E')};text-transform:uppercase;letter-spacing:0.5px;">Security Deposit (Refundable)</div>
                      <div style="font-size:16px;font-weight:900;color:#0F172A;">
                        ₹${secAmt.toLocaleString('en-IN')} 
                        <span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:12px;background:${isHeld ? '#DBEAFE' : (isRef ? '#DCFCE7' : '#FEF3C7')};color:${isHeld ? '#1D4ED8' : (isRef ? '#15803D' : '#B45309')};margin-left:4px;">
                          ${isHeld ? '✅ Deposit Held (जमा है)' : (isRef ? '🟢 Refunded' : '🟡 Pending Collection')}
                        </span>
                      </div>
                      ${sec?.mode || sec?.receivedBy ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">Received via <strong>${sec.mode || 'UPI'}</strong>${sec.receivedBy ? ' by <strong>' + escapeHtml(sec.receivedBy) + '</strong>' : ''}${sec.receivedDate ? ' on ' + sec.receivedDate : ''}</div>` : ''}
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" class="btn-sm" style="background:${isHeld ? '#2563EB' : '#059669'};color:#fff;border:none;padding:6px 12px;font-size:12px;font-weight:700;border-radius:6px;cursor:pointer;" onclick="if(window.showSecurityDepositModal) showSecurityDepositModal('${b.booking_id}')">
                      🛡️ Manage Deposit
                    </button>
                  </div>
                </div>
              `;
            }
            return '';
          })()}

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
                <span class="channel-badge ${bSrc ? bSrc.badgeClass : (isOnline ? 'channel-airbnb' : 'channel-direct')}" style="margin-top:2px;">
                  ${bSrc ? bSrc.badge : (isOnline ? 'Airbnb' : 'Direct Booking')}
                </span>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Check-In:</span><br>
                <strong>${b.check_in || '-'} ${b.check_in_time ? `(${b.check_in_time})` : ''}</strong>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Check-Out:</span><br>
                <strong>${b.check_out || '-'} ${b.check_out_time ? `(${b.check_out_time})` : ''}</strong>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Guests:</span><br>
                <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                  <strong style="color:var(--dark);font-size:14px;">👥 ${b.guests || 1} Guests</strong>
                  ${canM ? `<button type="button" class="btn-sm" onclick="window.quickEditGuestCount('${b.booking_id}', ${b.guests || 1})" style="padding:2px 8px;font-size:11px;background:#EEF2F6;border:1px solid #CBD5E1;border-radius:6px;cursor:pointer;font-weight:700;" title="Change number of guests">✏️ Change</button>` : ''}
                </div>
              </div>
              <div>
                <span style="color:var(--muted);font-size:11px;">Duration:</span><br>
                <strong>${b.check_in && b.check_out ? (calcNights(b.check_in, b.check_out) + ' Nights') : '-'}</strong>
              </div>
            </div>
            <div style="margin-top:10px;padding:8px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <div style="font-size:12px;color:#334155;">
                <span style="color:var(--muted);font-size:11px;">Booked By:</span><br>
                <strong style="color:var(--dark);">👤 ${escapeHtml(b.booked_by || window._userNameCache?.[b.created_by] || 'Admin / Staff')}</strong>
              </div>
              <div style="font-size:12px;color:#334155;text-align:right;">
                <span style="color:var(--muted);font-size:11px;">Booking Timestamp:</span><br>
                <strong style="color:var(--dark);">🕒 ${window.formatDateTimeStamp ? window.formatDateTimeStamp(window.getBookingTimestamp ? window.getBookingTimestamp(b) : (b.created_at || '')) : 'N/A'}</strong>
              </div>
            </div>
            ${(() => {
              const displayNotes = typeof cleanNotesForDisplay === 'function' ? cleanNotesForDisplay(b.notes) : (b.notes || '').replace(/\[SECURITY_DEPOSIT:[\s\S]*?\]/gi, '').trim();
              return displayNotes ? `
                <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);font-size:12.5px;color:var(--text-secondary);">
                  <strong>Notes:</strong> ${escapeHtml(displayNotes)}
                </div>
              ` : '';
            })()}
          </div>

          <!-- Financial Breakdown & Payment History -->
          <div style="border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div style="font-size:13px;font-weight:700;color:var(--dark);">💰 Payment Ledger</div>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <button class="btn-sm" onclick="window.openCustomPaymentQRModal({ guestName: '${escapeHtml(b.guest_name || '')}', phone: '${escapeHtml(b.phone || '')}', roomId: '${b.room_id || ''}', amount: ${bal > 0 ? Math.round(bal) : 0} })" style="background:linear-gradient(135deg, #4F46E5, #6366F1);color:#fff;border:none;padding:4px 10px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Generate & Send Branded Payment QR for this Booking">💳 Send QR</button>
                <button class="btn-sm" onclick="window.openBookingReceiptModal('${b.booking_id}')" style="background:#0F172A;color:#fff;border:none;padding:4px 9px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;" title="Booking Confirmation & Advance Voucher (No GST)">📄 Receipt</button>
                <button class="btn-sm" onclick="window.openMultiPropertyReceiptModal('${b.stay_group_id || b.phone || b.booking_id}')" style="background:#4F46E5;color:#fff;border:none;padding:4px 9px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;" title="View Combined Multi-Property Group Receipt">🏢 Group Receipt</button>
                <button class="btn-sm" onclick="window.openGSTInvoiceModal('${b.booking_id}')" style="background:#B45309;color:#fff;border:none;padding:4px 9px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;" title="Generate or View GST Invoice">🧾 GST Bill</button>
                <button class="btn-sm" onclick="window.openPOSTerminal && window.openPOSTerminal({ room_id: '${b.room_id}', guest_name: '${escapeHtml(b.guest_name || '')}', phone: '${escapeHtml(b.phone || '')}' })" style="background:#0F172A;color:#fff;border:none;padding:4px 9px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;" title="Add Concierge Services / Add-Ons for this Stay">🛎️ Add-Ons</button>
                ${canM ? `<button class="btn-sm" onclick="showPaymentModal('${b.booking_id}')" style="background:#10B981;color:#fff;border:none;padding:4px 10px;font-size:11.5px;">+ Add Payment</button>` : ''}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;background:#F8FAFC;padding:10px;border-radius:8px;margin-bottom:12px;">
              <div>
                <span style="font-size:11px;color:var(--muted);">Total Bill</span><br>
                <strong style="font-size:14px;">${(isOnline && tot === 0) ? '<span style="color:#B45309;font-size:12.5px;">⏳ Pending Payout</span>' : `₹${tot.toLocaleString('en-IN')}`}</strong>
              </div>
              <div>
                <span style="font-size:11px;color:var(--muted);">Total Paid</span><br>
                <strong style="font-size:14px;color:#059669;">${(isOnline && tot === 0 && pd === 0) ? '<span style="color:#4F46E5;font-size:12.5px;">Via Channel</span>' : `₹${pd.toLocaleString('en-IN')}`}</strong>
              </div>
              <div>
                <span style="font-size:11px;color:var(--muted);">Balance Due</span><br>
                <strong style="font-size:14px;color:${bal > 0 ? '#DC2626' : '#059669'};">₹${Math.max(0, Math.round(bal)).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            ${(() => {
              const sec = (typeof getSecurityDeposit === 'function' ? getSecurityDeposit(b) : (typeof window.getSecurityDeposit === 'function' ? window.getSecurityDeposit(b) : null)) || (b.notes && b.notes.includes('[SECURITY_DEPOSIT:') ? (() => { try { return JSON.parse(b.notes.match(/\[SECURITY_DEPOSIT:([\s\S]*?)\]/i)[1]); } catch(e){ return null; } })() : null);
              const secAmt = parseFloat(sec?.amount || b.security_deposit_amount) || 0;
              if (secAmt > 0) {
                const isHeld = (sec?.status || b.security_deposit_status) === 'collected';
                const isRef = (sec?.status || b.security_deposit_status) === 'refunded';
                return `
                  <div style="margin-bottom:12px;background:${isHeld ? '#EFF6FF' : (isRef ? '#F0FDF4' : '#FFFBEB')};border:1.5px solid ${isHeld ? '#93C5FD' : (isRef ? '#86EFAC' : '#FDE68A')};border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:18px;">🛡️</span>
                      <div>
                        <div style="font-size:11px;font-weight:700;color:${isHeld ? '#1E40AF' : (isRef ? '#166534' : '#92400E')};text-transform:uppercase;letter-spacing:0.5px;">Security Deposit (Refundable)</div>
                        <div style="font-size:14px;font-weight:900;color:#0F172A;">₹${secAmt.toLocaleString('en-IN')} <span style="font-size:11px;font-weight:600;color:${isHeld ? '#2563EB' : (isRef ? '#16A34A' : '#D97706')};">(${isHeld ? 'Deposit Held / जमा है' : (isRef ? 'Refunded' : 'Pending Collection')})</span></div>
                      </div>
                    </div>
                    <button type="button" class="btn-sm" style="background:${isHeld ? '#2563EB' : '#059669'};color:#fff;border:none;padding:5px 12px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;" onclick="if(window.showSecurityDepositModal) showSecurityDepositModal('${b.booking_id}')">
                      🛡️ Manage Deposit
                    </button>
                  </div>
                `;
              }
              return '';
            })()}

            ${(payments && payments.length > 0) ? `
              <div style="font-size:12px;">
                <div style="font-weight:700;color:var(--muted);margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Payment Audit &amp; Transactions:</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                ${payments.map(p => {
                  const timeStr = window.formatDateTimeStamp ? window.formatDateTimeStamp(p.paid_at || p.created_at || p.payment_date, { withSeconds: true }) : (p.payment_date || '');
                  const loggedBy = window._userNameCache?.[p.created_by] || (p.created_by ? 'Staff' : 'System');
                  const isOD = (p.received_by || '').includes('OD') || (p.received_by || '').includes('UHHS');
                  return `
                    <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                      <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                          <span style="font-weight:800;font-size:14px;color:var(--dark);">₹${(p.amount || 0).toLocaleString('en-IN')}</span>
                          <span style="font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;background:#E2E8F0;color:#334155;">via ${escapeHtml(p.payment_mode || 'Payment')}</span>
                          <span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;background:${isOD ? '#EFF6FF' : '#ECFDF5'};color:${isOD ? '#1D4ED8' : '#047857'};border:1px solid ${isOD ? '#BFDBFE' : '#A7F3D0'};">
                            ${isOD ? '🏦' : '💰'} Recd: ${escapeHtml(p.received_by || 'Staff')}
                          </span>
                        </div>
                        <div style="color:#64748B;font-size:11px;margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                          <span style="display:inline-flex;align-items:center;gap:3px;" title="Payment Creation / Audit Timestamp">
                            🕒 <strong>${timeStr}</strong>
                          </span>
                          <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;padding:1px 6px;border-radius:4px;font-weight:600;display:inline-flex;align-items:center;gap:3px;" title="User who entered this payment">
                            ✍️ Logged by: <strong>${escapeHtml(loggedBy)}</strong>
                          </span>
                          ${p.verification_status === 'pending' ? '<span class="badge yellow" style="font-size:9.5px;padding:1px 6px;">🟡 Verification Pending</span>' : ''}
                        </div>
                        ${p.notes ? `<div style="font-size:11px;color:#64748B;margin-top:4px;background:#FFFFFF;border-left:2px solid #CBD5E1;padding:2px 6px;border-radius:2px;font-style:italic;">"${escapeHtml(p.notes)}"</div>` : ''}
                      </div>
                      ${canM ? `
                        <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
                          <button type="button" class="btn-sm" onclick="if(window.editPayment) window.editPayment(${p.id}, '${escapeHtml(b.booking_id)}'); else if(typeof editPayment==='function') editPayment(${p.id}, '${escapeHtml(b.booking_id)}');" title="Edit Payment / Change Receiver" style="background:#FFFFFF;border:1px solid #CBD5E1;padding:4px 8px;font-size:11px;border-radius:6px;cursor:pointer;font-weight:600;color:#334155;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                            ✏️ Edit
                          </button>
                          ${canD ? `
                            <button type="button" class="btn-sm" onclick="if(window.delPayment) window.delPayment(${p.id}, '${escapeHtml(b.booking_id)}'); else if(typeof delPayment==='function') delPayment(${p.id}, '${escapeHtml(b.booking_id)}');" title="Delete Payment" style="background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;padding:4px 8px;font-size:11px;border-radius:6px;cursor:pointer;font-weight:700;">
                              🗑️
                            </button>
                          ` : ''}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
                </div>
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
              ${typeof buildIdButtons === 'function' ? buildIdButtons(b) : (typeof window.buildIdButtons === 'function' ? window.buildIdButtons(b) : '')}
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
              <button class="btn-sm" style="background:var(--primary);color:#fff;padding:10px;" onclick="window.drawerEditBooking('${b.booking_id}')">
                ✏️ Edit Booking
              </button>
            ` : ''}
            <button class="btn-sm" style="background:#0F766E;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.openBookingIdUploadModal('${b.booking_id}')" title="Upload, View or Delete Guest ID Documents">
              🪪 Manage IDs
            </button>
            <button class="btn-sm outline" style="padding:10px;" onclick="showGuestLedger('${escapeHtml(b.guest_name || '')}', '${b.booking_id}', '${b.phone || ''}', '${b.airbnb_confirmation_code || ''}')">
              📑 Guest Ledger
            </button>
            <button class="btn-sm" style="background:#0F172A;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.openBookingReceiptModal('${b.booking_id}')" title="Generate Booking Confirmation & Advance Receipt (Without GST)">
              📄 Booking Receipt
            </button>
            <button class="btn-sm" style="background:#4F46E5;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.openMultiPropertyReceiptModal('${b.stay_group_id || b.phone || b.booking_id}')" title="View Combined Multi-Property Receipt for this group or guest">
              🏢 Group Receipt
            </button>
            ${canM ? `
              <button class="btn-sm" style="background:#8B5CF6;color:#fff;padding:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="if(window.showGroupBookingModal) window.showGroupBookingModal('${b.booking_id}');" title="Group Booking Manager (Link or Merge Related Group Bookings)">
                🎊 Group Manager
              </button>
            ` : ''}
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

window.drawerEditBooking = function(bookingId) {
  window.closeBookingDrawer();
  if (typeof window.editBooking === 'function') {
    window.editBooking(bookingId);
  } else if (typeof editBooking === 'function') {
    editBooking(bookingId);
  } else {
    alert('Edit booking function is unavailable.');
  }
};

window.drawerDuplicateBooking = function(bookingId) {
  window.closeBookingDrawer();
  if (typeof window.duplicateBooking === 'function') {
    window.duplicateBooking(bookingId);
  } else {
    alert('Duplicate booking function is unavailable.');
  }
};

window.drawerMarkReview = async function(bookingId, guestName) {
  if (!bookingId) return;
  if (!confirm(`Mark 5-Star Review received on Airbnb for "${guestName || 'this guest'}"?`)) return;

  const { error } = await sb.from('guest_register').update({
    client_rating: 5,
    rating_notes: '⭐ 5-Star Review Verified on Airbnb',
    rated_at: new Date().toISOString()
  }).eq('booking_id', bookingId);

  if (error) {
    alert('Failed to mark review: ' + error.message);
    return;
  }

  if (typeof window.saveReviewFollowupRecord === 'function') {
    await window.saveReviewFollowupRecord(bookingId, {
      status: 'review_received',
      rating: 5,
      notes: 'Review confirmed and verified on Airbnb',
      reviewReceivedAt: new Date().toISOString()
    });
  }

  if (window.fsn?.success) fsn.success('Review Verified', '⭐ 5-Star Review marked and updated live!');
  if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
  if (typeof window.openBookingDrawer === 'function') window.openBookingDrawer(bookingId);
};

window.quickEditGuestCount = async function(bookingId, currentGuests) {
  const currentVal = parseInt(currentGuests, 10) || 1;
  const rawInput = prompt('👥 Enter updated number of guests for this booking:', currentVal);
  if (rawInput === null) return;
  const newCount = parseInt(rawInput, 10);
  if (isNaN(newCount) || newCount < 1 || newCount > 50) {
    if (typeof fsn !== 'undefined' && fsn.error) {
      fsn.error('Invalid Guest Count', 'Please enter a valid number of guests between 1 and 50.');
    } else {
      alert('Please enter a valid number of guests between 1 and 50.');
    }
    return;
  }

  try {
    if (typeof fsn !== 'undefined' && fsn.info) {
      fsn.info('Updating...', 'Saving new guest count...');
    }

    const { error } = await sb.from('guest_register').update({ guests: newCount }).eq('booking_id', bookingId);
    if (error) throw error;

    // Update in memory caches
    if (window._sbkState && window._sbkState.cachedBookings) {
      const bk = window._sbkState.cachedBookings.find(x => x.booking_id === bookingId);
      if (bk) { bk.guests = newCount; bk.adults = newCount; }
    }
    if (window._cachedBookings) {
      const bk = window._cachedBookings.find(x => x.booking_id === bookingId);
      if (bk) { bk.guests = newCount; bk.adults = newCount; }
    }
    if (window._allBookings) {
      const bk = window._allBookings.find(x => x.booking_id === bookingId);
      if (bk) { bk.guests = newCount; bk.adults = newCount; }
    }
    if (window._currentDrawerBooking && window._currentDrawerBooking.booking_id === bookingId) {
      window._currentDrawerBooking.guests = newCount;
      window._currentDrawerBooking.adults = newCount;
    }

    if (typeof fsn !== 'undefined' && fsn.success) {
      fsn.success('Guests Updated', `✅ Guest count updated to ${newCount} guests!`);
    }

    // Refresh drawer
    window.openBookingDrawer(bookingId);

    // Refresh smart booking list/cards
    if (typeof window.renderSmartManageBookings === 'function') {
      window.renderSmartManageBookings();
    }
  } catch (err) {
    console.error('Failed to update guest count:', err);
    if (typeof fsn !== 'undefined' && fsn.error) {
      fsn.error('Update Failed', err.message || 'Could not update guest count.');
    } else {
      alert('Failed to update guests: ' + (err.message || 'Error'));
    }
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
    window.closeBookingDrawer();
    await fn(bookingId, guestName, roomId);
    if (typeof window.renderSmartManageBookings === 'function') {
      await window.renderSmartManageBookings(true);
    } else if (typeof window.renderManageBookings === 'function') {
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
  window._currentDrawerBooking = null;
  window._currentDrawerBookingId = null;
  if (window._sbkState) window._sbkState.drawerBookingId = null;
};

// =====================================================================
// 5. LIVE CONTROLS & EVENT HANDLERS
// =====================================================================
// =====================================================================
// 5. LIVE CONTROLS & EVENT HANDLERS (Instant In-Memory Performance)
// =====================================================================
window.renderSmartBookingsResultsOnly = function() {
  const container = document.getElementById('sbkReservationsContainer');
  if (!container || !window._sbkState.cachedBookings?.length) {
    return renderSmartManageBookings(false);
  }

  const all = window._sbkState.cachedBookings || [];
  const rooms = window._sbkState.cachedRooms || [];
  const paidMap = window._sbkState.cachedPaidMap || window._bkPaidMap || {};
  const today = new Date().toISOString().slice(0, 10);
  const canM = ['owner','admin','manager','moderator','developer'].includes(SESSION.role);
  const tab = window._sbkState.activeTab || 'today';
  const sq = (window._sbkState.searchQuery || '').trim().toLowerCase();

  // Fast in-memory compute (1-2ms)
  const filtered = window.computeFilteredBookings(all, paidMap, today);
  const count = filtered.length;

  // Update clear button visibility
  const clearBtn = document.getElementById('sbkClearBtn');
  if (clearBtn) clearBtn.style.display = sq ? 'inline-block' : 'none';

  // Update hero title
  const heading = document.getElementById('sbkHeroHeading');
  if (heading) heading.innerText = window.getSbkHeroTitle(count, sq, tab);

  // Update subheading
  const subHeading = document.getElementById('sbkHeroSubheading');
  if (subHeading) {
    if (tab === 'today' && !sq) {
      let activeBookings = (all || []).filter(b => !b.is_cancelled && b.verification_status !== 'rejected');
      const curProp = window._sbkState.propertyFilter || (typeof window.getGlobalSelectedProperty === 'function' ? window.getGlobalSelectedProperty() : '');
      if (curProp) {
        activeBookings = activeBookings.filter(b => b.room_id === curProp);
      }
      const arrivalsCount = activeBookings.filter(b => b.check_in === today).length;
      const departuresCount = activeBookings.filter(b => b.check_out === today && b.checkout_confirmed !== false).length;
      const inHouseCount = activeBookings.filter(b => b.check_in <= today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false))).length;
      subHeading.innerHTML = `
        <div style="font-size:13.5px;color:#64748B;text-align:center;margin:-12px 0 22px 0;font-weight:500;">
          ${departuresCount} check-out${departuresCount === 1 ? '' : 's'} • ${arrivalsCount} check-in${arrivalsCount === 1 ? '' : 's'} • ${Math.max(0, inHouseCount - arrivalsCount)} continuing stay${Math.max(0, inHouseCount - arrivalsCount) === 1 ? '' : 's'}
        </div>`;
    } else {
      subHeading.innerHTML = '';
    }
  }

  // Update view mode buttons state in case view changed
  document.querySelectorAll('.airbnb-view-btn').forEach(btn => {
    const isTarget = btn.getAttribute('onclick')?.includes(window._sbkState.viewMode);
    if (isTarget) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Render view content instantly
  let contentHtml = '';
  if (tab === 'today' && !sq) {
    contentHtml += renderAirbnbFollowupsHtml(all, paidMap, canM, today);
  }

  if (filtered.length === 0) {
    const upcomingCount = (all || []).filter(b => !b.is_cancelled && b.verification_status !== 'rejected' && b.check_in > today).length;
    contentHtml += `
      <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;text-align:center;padding:50px 20px;max-width:560px;margin:0 auto;">
        <div style="font-size:36px;margin-bottom:12px;">🏡</div>
        <div style="font-size:17px;font-weight:800;color:#0F172A;">No reservations found</div>
        <div style="font-size:13px;color:#64748B;margin-top:4px;">
          ${sq ? `No reservations matched "${escapeHtml(sq)}".` : (tab === 'today' ? 'There are no check-ins, check-outs, or stays scheduled for today.' : 'No reservations matched your current filter or search criteria.')}
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
          ${tab === 'today' && !sq ? `
            <button class="btn-sm" style="background:#222222;color:#fff;border-radius:20px;font-weight:700;padding:7px 18px;border:none;" onclick="window.setBookingTab('upcoming')">
              View Upcoming (${upcomingCount})
            </button>
          ` : ''}
          <button class="btn-sm outline" style="border-radius:20px;font-weight:700;padding:7px 18px;" onclick="${sq ? 'window.clearSearch()' : 'window.resetBookingFilters()'}">
            ${sq ? 'Clear Search' : 'Clear Filters'}
          </button>
        </div>
      </div>`;
  } else if (window._sbkState.viewMode === 'table') {
    contentHtml += renderBookingTableHtml(filtered, paidMap, canM, today);
  } else if (window._sbkState.viewMode === 'cards') {
    contentHtml += renderBookingCardsHtml(filtered, paidMap, canM, today);
  } else {
    contentHtml += renderAirbnbReservationsHtml(filtered, paidMap, canM, today);
  }

  container.innerHTML = contentHtml;
};

window.setBookingTab = function(tab) {
  window._sbkState.activeTab = tab;
  // If user clicks a tab while a search query was active, clear search so they view tab's reservations cleanly
  if (window._sbkState.searchQuery) {
    window._sbkState.searchQuery = '';
    if (window.SESSION) window.SESSION.bookingSearch = '';
    const input = document.getElementById('sbkLiveSearch');
    if (input) input.value = '';
    const clearBtn = document.getElementById('sbkClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
  }
  renderSmartManageBookings(false);
  setTimeout(() => {
    const activePill = document.querySelector('.airbnb-pill.active');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 40);
};

window.toggleFollowupsExpanded = function() {
  window._sbkState.expandFollowups = !window._sbkState.expandFollowups;
  window.renderSmartBookingsResultsOnly();
};

let _sbkDebounceTimer = null;
window.handleSearchInput = function(val) {
  clearTimeout(_sbkDebounceTimer);
  _sbkDebounceTimer = setTimeout(() => {
    const q = (val || '').trim();
    window._sbkState.searchQuery = q;
    if (window.SESSION) window.SESSION.bookingSearch = q;
    window.renderSmartBookingsResultsOnly();
  }, 120);
};

window.handleManualSearch = function() {
  clearTimeout(_sbkDebounceTimer);
  const input = document.getElementById('sbkLiveSearch');
  const val = input ? input.value.trim() : '';
  window._sbkState.searchQuery = val;
  if (window.SESSION) window.SESSION.bookingSearch = val;
  window.renderSmartBookingsResultsOnly();
};

window.clearSearch = function() {
  clearTimeout(_sbkDebounceTimer);
  const input = document.getElementById('sbkLiveSearch');
  if (input) input.value = '';
  window._sbkState.searchQuery = '';
  if (window.SESSION) window.SESSION.bookingSearch = '';
  window.renderSmartBookingsResultsOnly();
};

window.handlePropertyFilter = function(propId) {
  window._sbkState.propertyFilter = propId;
  window.renderSmartBookingsResultsOnly();
};

window.toggleAirbnbFilter = function() {
  window._sbkState.showFilters = !window._sbkState.showFilters;
  renderSmartManageBookings(false);
};

window.handleChannelFilter = function(val) {
  window._sbkState.channelFilter = val;
  window.renderSmartBookingsResultsOnly();
};

window.handlePaymentFilter = function(val) {
  window._sbkState.paymentFilter = val;
  window.renderSmartBookingsResultsOnly();
};

window.toggleViewMode = function(mode) {
  window._sbkState.viewMode = mode;
  try { localStorage.setItem('sbk_view_mode', mode); } catch (e) {}
  window.renderSmartBookingsResultsOnly();
};

window.resetBookingFilters = function() {
  window._sbkState.activeTab = 'today';
  window._sbkState.searchQuery = '';
  window._sbkState.propertyFilter = '';
  window._sbkState.channelFilter = '';
  window._sbkState.paymentFilter = '';
  window._sbkState.showFilters = false;
  if (window.SESSION) window.SESSION.bookingSearch = '';
  const input = document.getElementById('sbkLiveSearch');
  if (input) input.value = '';
  renderSmartManageBookings(false);
};

window.toggleClassicBookingView = function() {
  window._sbkState.classicMode = !window._sbkState.classicMode;
  if (window._sbkState.classicMode && typeof window.renderClassicManageBookings === 'function') {
    window.renderClassicManageBookings();
  } else {
    renderSmartManageBookings(false);
  }
};

window.sendWhatsAppToGuest = function(phone, name, bookingId) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const target = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const msg = encodeURIComponent(`Hi ${name || 'Guest'}, greetings from The Unique Haven Homes (TUHH Lucknow)! We are pleased to host you. Please let us know if you need any assistance with your stay.`);
  window.open(`https://wa.me/${target}?text=${msg}`, '_blank');
};

// =====================================================================
// 6. ZERO-ERROR SPEED ADD BOOKING WIZARD
// =====================================================================
async function renderSmartAddBooking(prefillOpts) {
  if (prefillOpts && typeof prefillOpts === 'object') {
    const pIn = prefillOpts.check_in || prefillOpts.checkIn || window._bookingPrefill?.checkIn;
    const pOut = prefillOpts.check_out || prefillOpts.checkOut || (pIn && typeof dateAdd === 'function' ? dateAdd(pIn, 1) : window._bookingPrefill?.checkOut);
    window._bookingPrefill = Object.assign({}, window._bookingPrefill || {}, {
      roomId: prefillOpts.room_id || prefillOpts.roomId || window._bookingPrefill?.roomId,
      checkIn: pIn,
      checkOut: pOut,
      guestName: prefillOpts.guest_name || prefillOpts.guestName || window._bookingPrefill?.guestName,
      guestPhone: prefillOpts.phone || prefillOpts.guestPhone || window._bookingPrefill?.guestPhone
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const pre = window._bookingPrefill || {};

  renderShell(`<div class="loading" style="padding:40px;text-align:center;"><div class="spinner"></div><div style="margin-top:10px;font-weight:600;color:var(--muted);">Loading Instant Booking Wizard...</div></div>`, 'bookings');

  // Load rooms and recent bookings for conflict checking
  const [{ data: rooms }, { data: existingBookings }] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname, property_name, rent_per_night, bookable').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, guest_name, is_cancelled').gte('check_out', today).order('check_in', { ascending: true })
  ]);

  window._roomsCache = rooms || [];
  window._cachedRooms = rooms || [];
  window._cachedBookings = existingBookings || [];

  const targetRoom = pre.roomId;
  const matchedRoom = (rooms || []).find(r => r.room_id === targetRoom || r.unit_no === targetRoom);
  const defaultRoom = matchedRoom ? matchedRoom.room_id : (rooms && rooms[0]?.room_id) || '';
  const defaultCheckIn = pre.checkIn || today;
  const defaultCheckOut = pre.checkOut || (typeof dateAdd === 'function' && defaultCheckIn ? dateAdd(defaultCheckIn, 1) : tomorrow);
  const wizardMode = window._sbkWizardMode || 'single';
  const nDays = Math.max(calcNights(defaultCheckIn, defaultCheckOut), 1);

  const html = `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <h1 style="font-size:20px;font-weight:800;color:var(--dark);margin:0;display:flex;align-items:center;gap:8px;">
          <span>⚡ Fast &amp; Zero-Error Booking</span>
        </h1>
        <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">
          ${wizardMode === 'multi' ? 'Book multiple properties in one go with unified advance receipt &amp; WhatsApp statement.' : 'Instant availability radar, repeat guest lookup &amp; live rate calculator.'}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="secondary btn-sm" onclick="window._bookingPrefill=null;window._sbkWizardMode='single';renderSmartManageBookings()">
          ← Back to Bookings
        </button>
      </div>
    </div>

    <div class="card" style="max-width:900px;margin:0 auto;">
      <!-- Hidden inputs for parent booking / group -->
      <input type="hidden" id="parentBookingId" value="${pre.parentBookingId || ''}" />
      <input type="hidden" id="stayGroupId" value="${pre.stayGroupId || ''}" />

      <!-- 🏢 BOOKING MODE SWITCHER TABS -->
      <div style="background:#F1F5F9;padding:6px;border-radius:12px;display:flex;gap:6px;margin-bottom:18px;border:1.5px solid #E2E8F0;">
        <button type="button" class="btn-sm" style="flex:1;padding:10px 14px;font-weight:800;border-radius:8px;border:none;background:${wizardMode === 'single' ? '#0F172A' : 'transparent'};color:${wizardMode === 'single' ? '#fff' : '#64748B'};cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;" onclick="window.switchBookingWizardMode('single')">
          <span>🏠 Single Homestay Stay</span>
        </button>
        <button type="button" class="btn-sm" style="flex:1;padding:10px 14px;font-weight:800;border-radius:8px;border:none;background:${wizardMode === 'multi' ? '#4F46E5' : 'transparent'};color:${wizardMode === 'multi' ? '#fff' : '#64748B'};cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;" onclick="window.switchBookingWizardMode('multi')">
          <span>🏢 Multi-Property / Group Booking (एक साथ कई प्रॉपर्टी)</span>
          <span style="background:${wizardMode === 'multi' ? '#F59E0B' : '#E2E8F0'};color:${wizardMode === 'multi' ? '#0F172A' : '#475569'};font-size:10px;padding:2px 7px;border-radius:10px;">PRO</span>
        </button>
      </div>

      <!-- SECTION 1: GUEST DETAILS & SMART PHONE LOOKUP -->
      <div style="margin-bottom:18px;">
        <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>👤 1. Guest Information</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label style="font-weight:700;">Mobile Phone * <small style="color:var(--muted);">(10 Digits)</small></label>
            <input id="guestPhone" type="tel" placeholder="e.g. 9560172711" value="${pre.guestPhone || ''}"
              oninput="window.onSmartPhoneInput(this.value)" style="font-size:14px;font-weight:600;" />
          </div>
          <div class="form-group">
            <label style="font-weight:700;">Guest Name *</label>
            <input id="guestName" placeholder="Full name of guest (e.g. Praveen Singh)" value="${pre.guestName || ''}"
              style="font-size:14px;font-weight:600;" />
          </div>
        </div>

        ${wizardMode === 'multi' ? `
          <div class="form-group" style="margin-top:10px;">
            <label style="font-weight:600;font-size:12.5px;">Occasion / Group Tag (Optional)</label>
            <select id="groupTag" style="font-size:13px;padding:8px 10px;">
              <option value="Family Trip" ${pre.groupTag === 'Family Trip' ? 'selected' : ''}>👨‍👩‍👧 Family Trip / Holiday</option>
              <option value="Wedding" ${pre.groupTag === 'Wedding' ? 'selected' : ''}>💒 Wedding / Celebration Guests</option>
              <option value="Corporate" ${pre.groupTag === 'Corporate' ? 'selected' : ''}>💼 Corporate / Business Group</option>
              <option value="Friends" ${pre.groupTag === 'Friends' ? 'selected' : ''}>👥 Friends Group</option>
              <option value="Multi-Stay" ${!pre.groupTag || pre.groupTag === 'Multi-Stay' ? 'selected' : ''}>🏢 Multi-Property Reservation</option>
            </select>
          </div>
        ` : ''}

        <!-- Repeat Guest Detected Banner (Dynamic) -->
        <div id="repeatGuestBanner"></div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

      ${wizardMode === 'multi' ? `
        <!-- ════════════ MULTI-PROPERTY MODE ════════════ -->

        <!-- SECTION 2: MASTER STAY SCHEDULE -->
        <div style="margin-bottom:18px;">
          <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span>📅 2. Stay Dates &amp; Times (All Selected Homestays)</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label style="font-weight:700;">Check-In Date *</label>
              <input id="checkIn" type="date" value="${defaultCheckIn}" onchange="window.onMultiDateChange()" />
            </div>
            <div class="form-group">
              <label style="font-weight:700;">Check-Out Date *</label>
              <input id="checkOut" type="date" value="${defaultCheckOut}" onchange="window.onMultiDateChange()" />
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
        </div>

        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

        <!-- SECTION 3: MULTI-PROPERTY SELECTOR -->
        <div style="margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:14px;font-weight:800;color:var(--dark);display:flex;align-items:center;gap:6px;">
                <span>🏢 3. Select Homestays (${rooms?.length || 0} Total Available)</span>
              </div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                Check all homestays needed for this guest. Guests count and stay amounts are customizable per unit.
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn-sm" style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;font-weight:700;font-size:11.5px;" onclick="window.selectAllAvailableRooms()">
                ✔ Select All Free
              </button>
              <button type="button" class="btn-sm outline" style="font-size:11.5px;font-weight:700;" onclick="window.clearMultiRoomsSelection()">
                ✕ Clear
              </button>
            </div>
          </div>

          <!-- Property Cards Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;" id="multiPropertyCardsGrid">
            ${(rooms || []).map(r => {
              const clash = (existingBookings || []).find(b => b.room_id === r.room_id && !b.is_cancelled && b.check_in && b.check_out && b.check_in < defaultCheckOut && b.check_out > defaultCheckIn);
              const isClash = !!clash;
              const standardAmt = (r.rent_per_night || 3499) * nDays;

              return `
                <div id="propCard_${r.room_id}" class="multi-prop-card" style="border:1.5px solid ${isClash ? '#FECACA' : '#E2E8F0'};border-radius:10px;padding:11px 13px;background:#fff;transition:all 0.15s;position:relative;">
                  <div style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" class="multi-room-cb" id="cb_${r.room_id}" data-rid="${r.room_id}" onchange="window.onMultiRoomCheckChange('${r.room_id}')" style="width:19px;height:19px;margin-top:2px;cursor:pointer;" />
                    <div style="flex:1;">
                      <div style="font-weight:800;font-size:13px;color:#0F172A;line-height:1.3;">
                        ${escapeHtml(r.nickname || r.property_name || r.room_id)}
                      </div>
                      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                        Unit ${escapeHtml(r.unit_no || '-')} · ₹${(r.rent_per_night || 3499).toLocaleString('en-IN')}/night
                      </div>
                      <div style="margin-top:5px;">
                        <span id="radarBadge_${r.room_id}" style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;background:${isClash ? '#FEF2F2' : '#F0FDF4'};color:${isClash ? '#DC2626' : '#15803D'};display:inline-block;">
                          ${isClash ? `⚠️ Busy (${escapeHtml(clash.guest_name || 'Booked')})` : '✅ Available'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Custom config when selected -->
                  <div id="config_${r.room_id}" style="display:none;margin-top:10px;padding-top:8px;border-top:1px dashed #CBD5E1;gap:8px;align-items:center;">
                    <div style="flex:1;">
                      <label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:2px;">Guests</label>
                      <input id="guests_${r.room_id}" type="number" min="1" max="50" value="2" oninput="window.recalcMultiTotals()" style="width:100%;padding:4px 6px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;" />
                    </div>
                    <div style="flex:1.5;">
                      <label style="font-size:10px;font-weight:700;color:var(--muted);display:block;margin-bottom:2px;">Rate ₹</label>
                      <input id="amt_${r.room_id}" type="number" value="${standardAmt}" oninput="this.dataset.customized='true';window.recalcMultiTotals(true)" style="width:100%;padding:4px 6px;font-size:12px;font-weight:700;border:1px solid #CBD5E1;border-radius:6px;" />
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Sticky live selection summary pill -->
          <div style="background:#F8FAFC;border:1.5px solid #CBD5E1;border-radius:10px;padding:10px 14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:12px;font-size:12.5px;">
              <span>🏢 <strong id="multiSummaryCount" style="color:#4F46E5;">0 Homestays</strong></span>
              <span>👥 <strong id="multiSummaryGuests">0 Guests</strong></span>
              <span>🌙 <strong id="multiSummaryNights">${nDays} Nights</strong></span>
            </div>
            <div style="font-size:12px;color:var(--muted);">
              Check properties above to add them to this reservation
            </div>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

        <!-- SECTION 4: CONSOLIDATED FINANCIALS & ADVANCE -->
        <div style="margin-bottom:18px;">
          <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span>💰 4. Consolidated Financials &amp; Advance Payment</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label style="font-weight:700;">Grand Total Stay Amount ₹ *</label>
              <input id="multiTotalAmount" type="number" placeholder="0" value="0" oninput="window.recalcMultiTotals(true)" style="font-size:16px;font-weight:800;" />
            </div>
            <div class="form-group">
              <label style="font-weight:700;">Total Advance Received ₹</label>
              <input id="multiAdvanceAmt" type="number" placeholder="0" value="${pre.advanceAmt || 0}" oninput="window.recalcMultiTotals(true)" style="font-size:16px;font-weight:800;color:#059669;" />
            </div>
          </div>

          <div class="form-grid">
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

          <!-- Consolidated Price Breakdown Card -->
          <div class="sbk-price-summary-box" style="margin-top:10px;">
            <div class="sbk-price-row">
              <span style="color:var(--muted);">Total Group Bill:</span>
              <strong id="multiSummaryTotal">₹0</strong>
            </div>
            <div class="sbk-price-row">
              <span style="color:var(--muted);">Total Advance Paid:</span>
              <strong id="multiSummaryAdvance" style="color:#059669;">₹0</strong>
            </div>
            <div class="sbk-price-row balance" id="multiBalanceRow">
              <span>Balance Due at Check-in:</span>
              <strong id="multiSummaryBalance" style="color:#DC2626;">₹0</strong>
            </div>
          </div>
        </div>

      ` : `
        <!-- ════════════ SINGLE PROPERTY MODE ════════════ -->

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
              <input id="guests" type="number" min="1" max="50" value="${pre.guests || 2}" />
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
      `}

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

      <!-- SECTION 5: PROGRESSIVE DISCLOSURE ACCORDIONS -->
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
              <div style="font-weight:700;font-size:13px;margin-bottom:8px;">Primary Guest Photo ID</div>
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
                <input id="vehicleName" placeholder="e.g. Swift Dzire / Innova" />
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

        ${wizardMode === 'single' ? `
          <!-- Accordion 4: Booking Channel (Direct vs Airbnb) -->
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
        ` : ''}
      </div>

      <!-- Action Button & Errors -->
      <div id="smartAddBkErr" style="margin-top:14px;"></div>

      ${wizardMode === 'multi' ? `
        <button id="btnSaveMultiBooking" onclick="window.saveMultiSmartBooking()" 
          style="width:100%;padding:14px;font-size:16px;font-weight:800;background:#4F46E5;color:#fff;border:none;border-radius:12px;cursor:pointer;margin-top:10px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
          💾 Confirm &amp; Save Multi-Property Booking (0 Homestays)
        </button>
      ` : `
        <button id="smartSaveBtn" onclick="window.saveSmartBooking()" 
          style="width:100%;padding:14px;font-size:16px;font-weight:800;background:var(--primary);color:#fff;border:none;border-radius:12px;cursor:pointer;margin-top:10px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
          💾 Confirm &amp; Save Booking
        </button>
      `}
    </div>
  `;

  renderShell(html, 'bookings');

  // Initialize helpers
  if (wizardMode === 'multi') {
    window.onMultiDateChange();
    window.loadSmartReceivers();
  } else {
    window.triggerLiveRadarCheck();
    window.suggestDefaultPrice();
    window.recalcSmartPrice();
    window.loadSmartReceivers();
  }
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
  const baseRate = (room && room.rent_per_night && !isNaN(Number(room.rent_per_night)))
    ? Number(room.rent_per_night)
    : 4500;

  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = (ci && co) ? Math.max(calcNights(ci, co), 1) : 1;

  let pricing = null;
  if (window.UHH_SEASONAL && typeof window.UHH_SEASONAL.calculateStayPricing === 'function' && ci && co) {
    pricing = window.UHH_SEASONAL.calculateStayPricing(baseRate, ci, co);
  }
  const calcTotal = pricing ? pricing.totalBase : (baseRate * nights);
  const calcPerDay = pricing ? pricing.effectiveNightlyRate : baseRate;

  if (!totInput.value || totInput.dataset.autoFilled === 'true' || totInput.dataset.autofilled === 'true') {
    totInput.value = calcTotal;
    totInput.dataset.autoFilled = 'true';
    totInput.dataset.autofilled = 'true';
    const perDayInp = document.getElementById('perDayRate');
    if (perDayInp) {
      perDayInp.value = calcPerDay;
      perDayInp.dataset.autofilled = 'true';
    }
    window.recalcSmartPrice();
  }
};

window.recalcSmartPrice = function() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = (ci && co) ? Math.max(calcNights(ci, co), 1) : 1;

  let pricing = null;
  if (window.UHH_SEASONAL && typeof window.UHH_SEASONAL.calculateStayPricing === 'function' && ci && co) {
    const roomId = document.getElementById('roomId')?.value;
    const room = (window._roomsCache || []).find(r => r.room_id === roomId);
    const base = Number(room?.rent_per_night) || 4500;
    pricing = window.UHH_SEASONAL.calculateStayPricing(base, ci, co);
  }

  const tot = parseFloat(document.getElementById('totalAmount')?.value) || 0;
  const adv = parseFloat(document.getElementById('advanceAmt')?.value) || 0;
  const bal = Math.max(0, tot - adv);

  const nSummary = document.getElementById('smartNightsSummary');
  if (nSummary) {
    nSummary.textContent = `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
  }

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
  const pNorm = window.normalizePhone ? window.normalizePhone(val) : { core10: String(val).replace(/\D/g, '').slice(-10) };
  const clean = pNorm.core10 || '';
  const banner = document.getElementById('repeatGuestBanner') || document.getElementById('guestRatingWarning');
  if (!banner) return;

  if (clean.length === 10) {
    const { data: pastStays, error } = await sb.from('guest_register')
      .select('guest_name, phone, check_in, check_out, total_amount, id_proof_photo_paths, id_proof_photo_path, id_proof_front_paths, id_proof_back_paths, id_proof_type, id_proof_no, client_rating, rating_notes, rooms(nickname, property_name)')
      .or(`phone.ilike.%${clean}%,phone.eq.${clean},phone.eq.+91${clean},phone.eq.91${clean},phone.eq.0${clean}`)
      .neq('is_cancelled', true)
      .order('check_in', { ascending: false });

    if (!error && pastStays && pastStays.length > 0) {
      window._allReturningGuestStays = pastStays;
      const mostRecent = pastStays[0];
      const gNameInput = document.getElementById('guestName');
      if (gNameInput && !gNameInput.value) {
        gNameInput.value = mostRecent.guest_name || '';
      }

      const totalStays = pastStays.length;
      const totalSpent = pastStays.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
      const goodRatings = pastStays.filter(p => p.client_rating === 'good' || Number(p.client_rating) >= 4).length;
      const badRatings = pastStays.filter(p => p.client_rating === 'bad' || (p.client_rating && Number(p.client_rating) <= 2)).length;
      
      let ratingTagClass = 'normal';
      let ratingTagLabel = '⭐ Returning Guest';
      if (badRatings > 0) {
        ratingTagClass = 'warning';
        ratingTagLabel = `⚠️ Caution (${badRatings} Bad Flag)`;
      } else if (goodRatings > 0 || totalStays >= 2) {
        ratingTagClass = 'trusted';
        ratingTagLabel = '🌟 5-Star VIP Guest';
      }

      const lastProp = mostRecent.rooms?.nickname || mostRecent.rooms?.property_name || 'UHH Homestay';

      banner.innerHTML = `
        <div class="repeat-guest-card">
          <div class="rg-header">
            <span class="rg-badge">🌟 RETURNING GUEST DETECTED</span>
            <span class="rg-stays">📅 Stayed ${totalStays} time${totalStays > 1 ? 's' : ''} previously</span>
          </div>
          <div class="rg-body">
            <div class="rg-name">
              <span>${escapeHtml(mostRecent.guest_name || 'Guest')}</span>
              <span class="rg-rating-tag ${ratingTagClass}">${ratingTagLabel}</span>
            </div>
            <div class="rg-meta">
              💰 Lifetime Revenue: <strong>₹${totalSpent.toLocaleString('en-IN')}</strong> · 
              🏡 Last Stay: <strong>${escapeHtml(lastProp)}</strong> (${escapeHtml(mostRecent.check_in || '-')})
            </div>
          </div>
          <div class="rg-actions">
            <button type="button" class="rg-btn primary" onclick="window.autoFillReturningGuestDetails ? window.autoFillReturningGuestDetails('${clean}') : window.reusePastGuestIds('${clean}')" title="Fill name, IDs, and link saved documents">
              ⚡ 1-Click Auto-Fill (Name &amp; Saved IDs)
            </button>
            <button type="button" class="rg-btn outline" onclick="if(window.viewGuestStayHistory) window.viewGuestStayHistory('${clean}')" title="View all past bookings">
              📜 View Stay History (${totalStays})
            </button>
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
  btn.textContent = '⏳ Checking Conflicts...';

  try {
    // 🚨 DUPLICATE & OVERLAP CHECK (Room + Dates)
    const isReview = document.getElementById('isReviewBooking')?.checked || false;
    if (!isReview && window.sb) {
      const { data: exBookings, error: chkErr } = await sb.from('guest_register')
        .select('booking_id, guest_name, phone, room_id, check_in, check_out, booking_mode, total_amount, is_cancelled, is_review_booking')
        .eq('room_id', rid)
        .neq('is_cancelled', true);

      if (!chkErr && exBookings && exBookings.length > 0) {
        const clashes = exBookings.filter(b => {
          if (b.is_review_booking) return false;
          const bIn = b.check_in;
          const bOut = b.check_out || b.check_in;
          return bIn < co && bOut > ci;
        });

        if (clashes.length > 0) {
          const cleanGn = gn.toLowerCase();
          const cleanPh = (ph || '').replace(/\D/g, '');
          const exactDupes = clashes.filter(c => {
            const matchName = c.guest_name && c.guest_name.trim().toLowerCase() === cleanGn;
            const cPh = (c.phone || '').replace(/\D/g, '');
            const matchPhone = cleanPh.length >= 10 && cPh.length >= 10 && cleanPh === cPh;
            return matchName || matchPhone;
          });

          let warningTitle = '⚠️ DOUBLE BOOKING / OVERLAP WARNING!';
          let warningDetails = '';
          if (exactDupes.length > 0) {
            warningTitle = '🚨 EXACT DUPLICATE BOOKING WARNING!';
            warningDetails = `Guest "${gn}" ${ph ? '(' + ph + ') ' : ''}ke liye is property par already booking exist karti hai!\n\n`;
          }

          const clashList = clashes.map(c => {
            const modeLabel = c.booking_mode === 'Online-Airbnb' ? '🌐 Airbnb' : '🏠 Direct';
            return `• ${c.guest_name || 'Guest'} (${c.check_in} → ${c.check_out}) — ${modeLabel} — ₹${(c.total_amount || 0).toLocaleString('en-IN')}`;
          }).join('\n');

          const confirmMsg = `${warningTitle}\n\n` +
            warningDetails +
            `Property: ${rid}\n` +
            `Dates: ${ci} → ${co}\n\n` +
            `Existing Booking(s):\n${clashList}\n\n` +
            `Kya aap sach me duplicate / double booking save karna chahte hain?\n\n` +
            `• OK = Save Anyway (Double Booking confirm)\n` +
            `• Cancel = Ruko aur cancel karo`;

          const ok = confirm(confirmMsg);
          if (!ok) {
            btn.disabled = false;
            btn.textContent = '💾 Save Booking';
            errDiv.innerHTML = `<div class="error" style="background:#FEF2F2;border:1.5px solid #EF4444;color:#B91C1C;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.5;margin-top:10px;">` +
              `❌ <strong>Booking Cancelled:</strong> Is property par in dates (${ci} → ${co}) par pehle se booking exist karti hai (${escapeHtml(clashes[0].guest_name || 'Guest')}).` +
              `</div>`;
            return;
          }
        }
      }
    }

    btn.textContent = '⏳ Saving & Locking Booking...';
    const bkId = 'B' + Date.now();
    const nights = Math.max(calcNights(ci, co), 1);
    const perDayRate = Math.round(tot / nights);
    const checkoutConfirmed = document.getElementById('checkoutConfirmed')?.value !== 'no';
    const isOnline = document.getElementById('bookingMode')?.value === 'Online-Airbnb';
    const airbnbCode = document.getElementById('airbnbCode')?.value?.trim() || null;
    // isReview already checked above

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
      booked_by: window.getCurrentUserAuditName ? window.getCurrentUserAuditName() : (SESSION.displayName || SESSION.role || 'Staff')
    };

    const { error: insErr } = window.safeDbInsert ? await window.safeDbInsert('guest_register', insertObj) : await sb.from('guest_register').insert(insertObj);
    if (insErr) throw insErr;

    // Record payment if advance > 0
    if (adv > 0) {
      const payObj = {
        booking_id: bkId,
        amount: adv,
        payment_mode: advMode,
        payment_date: ci,
        paid_at: new Date().toISOString(),
        received_by: receivedBy,
        handover_status: advMode === 'Cash' ? 'in_hand' : 'handed_over',
        notes: 'Advance booking deposit',
        created_by: SESSION.userId || null
      };
      if (window.safeDbInsert) {
        await window.safeDbInsert('payment_history', payObj);
      } else {
        await sb.from('payment_history').insert(payObj);
      }
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
// 7.5 MULTI-PROPERTY WIZARD CONTROLLER & COMBINED RECEIPT GENERATOR
// =====================================================================

window.switchBookingWizardMode = function(mode) {
  window._sbkWizardMode = mode;
  const currentData = {
    guestName: document.getElementById('guestName')?.value || '',
    guestPhone: document.getElementById('guestPhone')?.value || '',
    checkIn: document.getElementById('checkIn')?.value || '',
    checkOut: document.getElementById('checkOut')?.value || '',
    checkInTime: document.getElementById('checkInTime')?.value || '14:00',
    checkOutTime: document.getElementById('checkOutTime')?.value || '11:00',
    advanceAmt: Number(document.getElementById(mode === 'multi' ? 'advanceAmt' : 'multiAdvanceAmt')?.value || 0),
    advMode: document.getElementById('advMode')?.value || 'UPI',
    advReceivedBy: document.getElementById('advReceivedBy')?.value || '',
    idType: document.getElementById('idType')?.value || 'Aadhar',
    idNo: document.getElementById('idNo')?.value || ''
  };
  renderSmartAddBooking(currentData);
};

window.renderMultiPropertyBooking = function(prefill = {}) {
  window._sbkWizardMode = 'multi';
  renderSmartAddBooking(prefill);
};

window.onMultiDateChange = function() {
  const ciEl = document.getElementById('checkIn');
  const coEl = document.getElementById('checkOut');
  if (!ciEl || !coEl) return;
  const ci = ciEl.value;
  const co = coEl.value;
  if (!ci || !co) return;

  const d1 = new Date(ci);
  const d2 = new Date(co);
  const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));

  const nightsEl = document.getElementById('multiSummaryNights');
  if (nightsEl) nightsEl.textContent = `${diffDays} Night${diffDays > 1 ? 's' : ''}`;

  const bookings = window._cachedBookings || [];
  const rooms = window._cachedRooms || [];

  rooms.forEach(r => {
    const card = document.getElementById(`propCard_${r.room_id}`);
    const badge = document.getElementById(`radarBadge_${r.room_id}`);
    const amtInput = document.getElementById(`amt_${r.room_id}`);

    const clash = bookings.find(b => b.room_id === r.room_id && !b.is_cancelled && b.check_in && b.check_out && b.check_in < co && b.check_out > ci);
    const isClash = !!clash;

    if (badge) {
      badge.style.background = isClash ? '#FEF2F2' : '#F0FDF4';
      badge.style.color = isClash ? '#DC2626' : '#15803D';
      badge.textContent = isClash ? `⚠️ Busy (${escapeHtml(clash.guest_name || 'Booked')})` : '✅ Available';
    }

    if (card) {
      const cb = document.getElementById(`cb_${r.room_id}`);
      if (!cb || !cb.checked) {
        card.style.borderColor = isClash ? '#FECACA' : '#E2E8F0';
        card.style.background = isClash ? '#FFFDFD' : '#FFFFFF';
      }
    }

    if (amtInput && !amtInput.dataset.customized) {
      amtInput.value = (r.rent_per_night || 3499) * diffDays;
    }
  });

  window.recalcMultiTotals();
};

window.onMultiRoomCheckChange = function(rid) {
  const cb = document.getElementById(`cb_${rid}`);
  const card = document.getElementById(`propCard_${rid}`);
  const config = document.getElementById(`config_${rid}`);
  if (!cb || !card) return;

  if (cb.checked) {
    card.style.borderColor = '#4F46E5';
    card.style.background = '#F5F3FF';
    card.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.12)';
    if (config) config.style.display = 'flex';
  } else {
    card.style.borderColor = '#E2E8F0';
    card.style.background = '#FFFFFF';
    card.style.boxShadow = 'none';
    if (config) config.style.display = 'none';
  }

  window.recalcMultiTotals();
};

window.recalcMultiTotals = function(manualTotal = false) {
  const checkedBoxes = Array.from(document.querySelectorAll('.multi-room-cb:checked'));
  const count = checkedBoxes.length;

  let totalGuests = 0;
  let autoCalculatedTotal = 0;

  checkedBoxes.forEach(cb => {
    const rid = cb.dataset.rid;
    const gVal = Number(document.getElementById(`guests_${rid}`)?.value || 2);
    const aVal = Number(document.getElementById(`amt_${rid}`)?.value || 0);
    totalGuests += gVal;
    autoCalculatedTotal += aVal;
  });

  const countEl = document.getElementById('multiSummaryCount');
  if (countEl) countEl.textContent = `${count} Homestay${count !== 1 ? 's' : ''}`;

  const guestsEl = document.getElementById('multiSummaryGuests');
  if (guestsEl) guestsEl.textContent = `${totalGuests} Guests`;

  const totalInput = document.getElementById('multiTotalAmount');
  if (totalInput && !manualTotal) {
    totalInput.value = autoCalculatedTotal;
  }

  const grandTotal = Number(totalInput?.value || 0);
  const advInput = document.getElementById('multiAdvanceAmt');
  const advance = Number(advInput?.value || 0);
  const balance = Math.max(0, grandTotal - advance);

  const sumTotalEl = document.getElementById('multiSummaryTotal');
  if (sumTotalEl) sumTotalEl.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

  const sumAdvEl = document.getElementById('multiSummaryAdvance');
  if (sumAdvEl) sumAdvEl.textContent = `₹${advance.toLocaleString('en-IN')}`;

  const sumBalEl = document.getElementById('multiSummaryBalance');
  if (sumBalEl) sumBalEl.textContent = `₹${balance.toLocaleString('en-IN')}`;

  const btn = document.getElementById('btnSaveMultiBooking');
  if (btn) {
    btn.textContent = `💾 Confirm & Save Multi-Property Booking (${count} Homestay${count !== 1 ? 's' : ''})`;
  }
};

window.selectAllAvailableRooms = function() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const bookings = window._cachedBookings || [];

  document.querySelectorAll('.multi-room-cb').forEach(cb => {
    const rid = cb.dataset.rid;
    const clash = bookings.find(b => b.room_id === rid && !b.is_cancelled && b.check_in && b.check_out && b.check_in < co && b.check_out > ci);
    if (!clash) {
      cb.checked = true;
      window.onMultiRoomCheckChange(rid);
    }
  });
  window.recalcMultiTotals();
};

window.clearMultiRoomsSelection = function() {
  document.querySelectorAll('.multi-room-cb').forEach(cb => {
    cb.checked = false;
    window.onMultiRoomCheckChange(cb.dataset.rid);
  });
  window.recalcMultiTotals();
};

window.saveMultiSmartBooking = async function() {
  const errDiv = document.getElementById('smartAddBkErr');
  const btn = document.getElementById('btnSaveMultiBooking');
  if (errDiv) errDiv.innerHTML = '';

  const guestName = document.getElementById('guestName')?.value?.trim();
  const rawPhone = document.getElementById('guestPhone')?.value?.trim();
  const cleanPhone = (rawPhone || '').replace(/\D/g, '').slice(-10);
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const checkInTime = document.getElementById('checkInTime')?.value || '14:00';
  const checkOutTime = document.getElementById('checkOutTime')?.value || '11:00';

  if (!guestName) {
    errDiv.innerHTML = '<div class="error" style="color:#DC2626;background:#FEF2F2;padding:10px;border-radius:8px;">⚠️ Please enter the Guest Name.</div>';
    document.getElementById('guestName')?.focus();
    return;
  }
  if (!cleanPhone || cleanPhone.length !== 10) {
    errDiv.innerHTML = '<div class="error" style="color:#DC2626;background:#FEF2F2;padding:10px;border-radius:8px;">⚠️ Please enter a valid 10-digit mobile number for WhatsApp receipts.</div>';
    document.getElementById('guestPhone')?.focus();
    return;
  }
  if (!ci || !co) {
    errDiv.innerHTML = '<div class="error" style="color:#DC2626;background:#FEF2F2;padding:10px;border-radius:8px;">⚠️ Please select Check-in and Check-out dates.</div>';
    return;
  }

  const checkedBoxes = Array.from(document.querySelectorAll('.multi-room-cb:checked'));
  if (checkedBoxes.length === 0) {
    errDiv.innerHTML = '<div class="error" style="color:#DC2626;background:#FEF2F2;padding:10px;border-radius:8px;">⚠️ Please select at least one homestay property for this booking.</div>';
    return;
  }

  // Clash check confirmation
  const bookings = window._cachedBookings || [];
  const clashedNames = [];
  checkedBoxes.forEach(cb => {
    const rid = cb.dataset.rid;
    const clash = bookings.find(b => b.room_id === rid && !b.is_cancelled && b.check_in && b.check_out && b.check_in < co && b.check_out > ci);
    if (clash) {
      const room = (window._cachedRooms || []).find(r => r.room_id === rid);
      clashedNames.push(room?.nickname || room?.property_name || rid);
    }
  });

  if (clashedNames.length > 0) {
    const ok = confirm(`⚠️ Warning: The following homestay(s) already have existing bookings during these dates:\n• ${clashedNames.join('\n• ')}\n\nDo you want to proceed and save anyway?`);
    if (!ok) return;
  }

  const grandTotal = Number(document.getElementById('multiTotalAmount')?.value || 0);
  const totalAdvance = Number(document.getElementById('multiAdvanceAmt')?.value || 0);
  const advMode = document.getElementById('advMode')?.value || 'UPI';
  const advReceivedBy = document.getElementById('advReceivedBy')?.value || '';

  if (totalAdvance > 0 && !advReceivedBy) {
    errDiv.innerHTML = '<div class="error" style="color:#DC2626;background:#FEF2F2;padding:10px;border-radius:8px;">⚠️ Since advance payment was received, please select who received it.</div>';
    document.getElementById('advReceivedBy')?.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Creating Multi-Property Reservation...';

  try {
    const cleanGuestSlug = guestName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const stayGroupId = `GRP-${cleanGuestSlug}-${cleanPhone.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const idType = document.getElementById('idType')?.value || 'Aadhar';
    const idNo = document.getElementById('idNo')?.value?.trim() || null;
    const vehicleName = document.getElementById('vehicleName')?.value?.trim() || null;
    const vehicleNumber = document.getElementById('vehicleNumber')?.value?.trim() || null;
    const notes = document.getElementById('bkNotes')?.value?.trim() || '';

    // Calculate individual properties and advance allocation
    const roomItems = checkedBoxes.map(cb => {
      const rid = cb.dataset.rid;
      const room = (window._cachedRooms || []).find(r => r.room_id === rid);
      const guests = parseInt(document.getElementById(`guests_${rid}`)?.value) || 2;
      const amt = Number(document.getElementById(`amt_${rid}`)?.value || 0);
      return {
        room_id: rid,
        room_name: room?.nickname || room?.property_name || rid,
        unit_no: room?.unit_no || '',
        guests: guests,
        total_amount: amt
      };
    });

    const sumRoomTotals = roomItems.reduce((acc, r) => acc + r.total_amount, 0);

    // Proportionate advance split
    let remainingAdv = totalAdvance;
    const roomAdvMap = {};
    const roomInserts = roomItems.map((r, idx) => {
      let roomAdv = 0;
      if (totalAdvance > 0) {
        if (idx === roomItems.length - 1) {
          roomAdv = remainingAdv;
        } else if (sumRoomTotals > 0) {
          roomAdv = Math.round(totalAdvance * (r.total_amount / sumRoomTotals));
          remainingAdv -= roomAdv;
        }
      }

      const bkId = 'B' + Date.now() + '_' + (idx + 1);
      roomAdvMap[r.room_id] = roomAdv;
      const payStatus = totalAdvance >= grandTotal && grandTotal > 0 ? 'Paid' : (roomAdv > 0 ? 'Partial' : 'Unpaid');

      return {
        booking_id: bkId,
        guest_name: guestName,
        phone: cleanPhone,
        room_id: r.room_id,
        check_in: ci,
        check_out: co,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        checkout_confirmed: 'yes',
        guests: r.guests,
        booking_mode: 'Offline',
        total_amount: r.total_amount,
        payment_status: payStatus,
        stay_group_id: stayGroupId,
        id_proof_type: idType,
        id_proof_no: idNo,
        has_vehicle: !!vehicleNumber,
        vehicle_name: vehicleName,
        vehicle_number: vehicleNumber,
        notes: `Multi-Property Booking (${roomItems.length} Homestays: ${roomItems.map(x => x.room_name).join(', ')}). ${notes}`.trim(),
        booked_by: window.getCurrentUserAuditName ? window.getCurrentUserAuditName() : (SESSION?.displayName || SESSION?.role || 'Staff')
      };
    });

    // Batch insert bookings
    let createdBookings = null;
    let insErr = null;
    if (window.safeDbInsert) {
      const bRes = await window.safeDbInsert('guest_register', roomInserts);
      createdBookings = bRes?.data;
      insErr = bRes?.error;
    } else {
      const bRes = await sb.from('guest_register').insert(roomInserts).select();
      createdBookings = bRes?.data;
      insErr = bRes?.error;
    }
    if (insErr) throw insErr;

    // Update flats status
    for (const r of roomItems) {
      try {
        await sb.from('flats_status').upsert({
          room_id: r.room_id,
          status: 'Booked',
          updated_at: new Date().toISOString()
        });
      } catch (fsErr) {
        console.warn('Flats status update warning:', fsErr);
      }
    }

    // Record advance in payment_history for all booked homestays
    if (totalAdvance > 0) {
      const bksToProcess = (createdBookings && createdBookings.length > 0) ? createdBookings : roomInserts;
      const payDate = ci || new Date().toISOString().slice(0, 10);
      const handoverStatus = (advMode === 'Cash' && !['Firoz', 'Shahenshah'].includes(advReceivedBy)) ? 'in_hand' : 'handed_over';
      const meta = typeof approvalMeta === 'function' ? approvalMeta() : {};

      for (const cbk of bksToProcess) {
        const roomAdv = roomAdvMap[cbk.room_id] || 0;
        if (roomAdv > 0) {
          const roomObj = roomItems.find(x => x.room_id === cbk.room_id);
          const payPayload = {
            booking_id: cbk.booking_id,
            amount: roomAdv,
            payment_mode: advMode,
            received_by: advReceivedBy,
            payment_date: payDate,
            paid_at: new Date().toISOString(),
            handover_status: handoverStatus,
            notes: `Advance for ${roomObj?.room_name || cbk.room_id} (Group: ${stayGroupId})`,
            created_by: SESSION?.userId || null,
            ...meta
          };

          const pRes = window.safeDbInsert ? await window.safeDbInsert('payment_history', payPayload) : await sb.from('payment_history').insert(payPayload);
          if (pRes?.error) {
            console.warn('Payment insert with meta warning:', pRes.error.message);
            delete payPayload.verification_status;
            delete payPayload.verified_by;
            delete payPayload.verified_at;
            const retryRes = window.safeDbInsert ? await window.safeDbInsert('payment_history', payPayload) : await sb.from('payment_history').insert(payPayload);
            if (retryRes?.error) {
              console.error('CRITICAL: Payment history insert failed:', retryRes.error);
            }
          }

          if (typeof recalcPaymentStatus === 'function') {
            await recalcPaymentStatus(cbk.booking_id);
          }
        }
      }
    }

    // Show celebratory multi-booking success modal with instant receipts
    window.showMultiBookingSuccessModal({
      guestName: guestName,
      phone: cleanPhone,
      stayGroupId: stayGroupId,
      checkIn: ci,
      checkOut: co,
      rooms: roomItems,
      grandTotal: grandTotal,
      advancePaid: totalAdvance,
      balanceDue: Math.max(0, grandTotal - totalAdvance),
      advMode: advMode,
      advReceivedBy: advReceivedBy
    });

  } catch (err) {
    console.error('Error saving multi-property booking:', err);
    errDiv.innerHTML = `<div class="error" style="color:#DC2626;background:#FEF2F2;padding:10px;border-radius:8px;">❌ Failed to save multi-property booking: ${escapeHtml(err.message)}</div>`;
    btn.disabled = false;
    btn.textContent = `💾 Confirm & Save Multi-Property Booking (${checkedBoxes.length} Homestays)`;
  }
};

window.showMultiBookingSuccessModal = function(data) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '99999';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:560px;border-radius:18px;text-align:center;padding:28px 24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
      <div style="font-size:46px;margin-bottom:8px;">🎉</div>
      <h2 style="font-size:22px;font-weight:900;color:#0F172A;margin:0 0 6px;">Multi-Property Booking Confirmed!</h2>
      <div style="font-size:13px;color:#64748B;margin-bottom:18px;">
        Successfully booked <strong>${data.rooms.length} homestays</strong> for <strong>${escapeHtml(data.guestName)}</strong>
      </div>

      <!-- Details Summary Card -->
      <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:14px;padding:16px;text-align:left;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px dashed #CBD5E1;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Group ID</div>
            <code style="font-size:13px;font-weight:800;color:#4F46E5;">${escapeHtml(data.stayGroupId)}</code>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Dates</div>
            <div style="font-size:13px;font-weight:800;color:#0F172A;">${data.checkIn} → ${data.checkOut}</div>
          </div>
        </div>

        <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:6px;">Homestays Included:</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
          ${data.rooms.map((r, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;font-size:12.5px;">
              <span style="font-weight:700;color:#0F172A;">${i + 1}. ${escapeHtml(r.room_name)} ${r.unit_no ? `(Unit ${escapeHtml(r.unit_no)})` : ''}</span>
              <span style="font-weight:800;color:#059669;">₹${r.total_amount.toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:#EEF2FF;border-radius:10px;padding:12px;text-align:center;">
          <div>
            <div style="font-size:11px;color:#4338CA;font-weight:600;">Total Bill</div>
            <div style="font-size:15px;font-weight:900;color:#312E81;">₹${data.grandTotal.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#047857;font-weight:600;">Advance Paid</div>
            <div style="font-size:15px;font-weight:900;color:#065F46;">₹${data.advancePaid.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style="font-size:11px;color:#B91C1C;font-weight:600;">Balance Due</div>
            <div style="font-size:15px;font-weight:900;color:#991B1B;">₹${data.balanceDue.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button type="button" style="width:100%;padding:14px;background:#4F46E5;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(79,70,229,0.35);"
          onclick="this.closest('.modal-overlay').remove(); window.openMultiPropertyReceiptModal('${escapeHtml(data.stayGroupId)}');">
          🏢 View / Print Combined Group Receipt
        </button>

        <button type="button" style="width:100%;padding:12px;background:#25D366;color:#fff;border:none;border-radius:12px;font-size:14.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"
          onclick="this.closest('.modal-overlay').remove(); window.openMultiPropertyReceiptModal('${escapeHtml(data.stayGroupId)}');">
          📱 Send WhatsApp Multi-Property Voucher
        </button>

        <button type="button" class="outline" style="width:100%;padding:11px;border-radius:10px;font-weight:700;font-size:13px;"
          onclick="this.closest('.modal-overlay').remove(); renderSmartManageBookings();">
          📋 Back to Bookings List
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
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

// ═══ DIGITAL GUEST PASS MODAL ═══
window.openGuestPassModal = function(bookingId, phone, guestName) {
  const origin = window.location.origin;
  const passUrl = `${origin}/guest.html?id=${encodeURIComponent(bookingId)}`;
  const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
  const waMsg = encodeURIComponent(`Namaste ${guestName || 'Guest'}! 🙏\n\nHere is your Digital Stay Pass for Unique Haven Homes:\n👉 ${passUrl}\n\n• High-Speed WiFi credentials\n• Live Google Maps navigation\n• 1-Tap Housekeeping concierge\n• Digital Aadhaar / ID check-in\n\nLooking forward to hosting you!`);
  const waLink = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${waMsg}` : '';

  let overlay = document.getElementById('guestPassModalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'guestPassModalOverlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)document.getElementById('guestPassModalOverlay').innerHTML=''">
      <div style="width:100%;max-width:520px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:uhhPageEntrance 0.22s ease-out;">
        <div style="padding:16px 20px;background:#0F172A;color:#fff;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;">
            <span>🪪</span> Digital Guest Pass
          </div>
          <button onclick="document.getElementById('guestPassModalOverlay').innerHTML=''" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
          <div style="font-size:13px;color:#475569;">
            Send this digital stay pass to <strong>${escapeHtml(guestName || 'Guest')}</strong> (#${bookingId}). They can access WiFi, Google Maps directions, upload ID proofs, and request housekeeping without downloading any app!
          </div>

          <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="font-family:monospace;font-size:12.5px;color:#0F172A;word-break:break-all;">
              ${passUrl}
            </div>
            <button class="btn-sm" onclick="navigator.clipboard.writeText('${passUrl}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000);" style="flex-shrink:0;background:#0F172A;color:#fff;font-weight:700;">
              Copy
            </button>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
            <a href="${passUrl}" target="_blank" class="btn" style="flex:1;background:#2563EB;color:#fff;text-align:center;text-decoration:none;padding:10px;border-radius:10px;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
              👁️ Preview Guest Pass
            </a>
            ${waLink ? `
              <a href="${waLink}" target="_blank" class="btn" style="flex:1;background:#25D366;color:#fff;text-align:center;text-decoration:none;padding:10px;border-radius:10px;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
                💬 Send via WhatsApp
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
};

