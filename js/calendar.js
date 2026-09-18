/**
 * Calendar Module v3 — Ultra-Modern Multi-Unit Timeline & Airbnb Month Grid
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

window._calViewMode = window._calViewMode || 'timeline'; // 'timeline' or 'grid'

async function renderReports() {
  renderShell(`<div class="loading">📅 Loading calendar & reservations...</div>`, 'reports');

  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname, rent_per_night, property_name').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, check_in_time, check_out_time, guest_name, phone, booking_mode, total_amount, is_cancelled, verification_status, notes, has_vehicle, vehicle_name, vehicle_number, client_rating')
      .neq('is_cancelled', true).neq('verification_status', 'rejected')
  ]);

  const allRooms = rooms.data || [];
  const allBks = bookings.data || [];

  window._allRoomsCache = allRooms;
  window._allBookingsCache = allBks;

  const yr = window._calY ?? new Date().getFullYear();
  const mo = window._calM ?? new Date().getMonth();
  const selRoom = window._calRoom || 'all';
  const viewMode = window._calViewMode || 'timeline';

  const mName = new Date(yr, mo, 1).toLocaleString('en-IN', { month: 'long' });
  const dim = new Date(yr, mo + 1, 0).getDate();
  const mp = `${yr}-${String(mo + 1).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Monthly stats ───
  const mb = allBks.filter(b => b.check_in?.startsWith(mp));
  const pm = await getPaidMap(mb.map(b => b.booking_id));
  const rev = mb.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const onCount = mb.filter(b => b.booking_mode === 'Online-Airbnb').length;
  const offCount = mb.length - onCount;

  // Occupancy for filtered rooms
  const displayRooms = selRoom === 'all' ? allRooms : allRooms.filter(r => r.room_id === selRoom);
  
  // Date-wise booking map: key = `${room_id}_${date}` -> array of bookings
  const bMap = {};
  allBks.forEach(b => {
    if (!b.check_in || !b.check_out || !b.room_id) return;
    let c = b.check_in;
    while (c < b.check_out) {
      const _bkey = `${b.room_id}_${c}`;
      if (!bMap[_bkey]) bMap[_bkey] = [];
      bMap[_bkey].push(b);
      c = dateAdd(c, 1);
    }
  });

  const totalRoomNights = displayRooms.length * dim;
  const bookedNights = displayRooms.reduce((s, r) => {
    for (let d = 1; d <= dim; d++) {
      const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (bMap[`${r.room_id}_${ds}`]) s++;
    }
    return s;
  }, 0);
  const occ = totalRoomNights > 0 ? Math.round(bookedNights / totalRoomNights * 100) : 0;
  const vacantNights = Math.max(totalRoomNights - bookedNights, 0);

  // Property selector options
  const propOptions = '<option value="all">🏘️ All Properties (' + allRooms.length + ')</option>' +
    allRooms.map(r => `<option value="${r.room_id}"${r.room_id === selRoom ? ' selected' : ''}>${r.unit_no} — ${r.nickname || r.property_name || ''}</option>`).join('');

  // Upcoming 7 days + Open stays
  const upcoming7 = allBks.filter(b => b.check_in > todayStr && b.check_in <= dateAdd(todayStr, 7))
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  const openStays = allBks.filter(b => b.check_in <= todayStr && (b.check_out > todayStr || !b.check_out));

  const bName = b => {
    const room = allRooms.find(r => r.room_id === b.room_id);
    return propLabel(room) || b.room_id || '-';
  };

  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ═══════════════════════════════════════════════════════════
  // HTML GENERATION
  // ═══════════════════════════════════════════════════════════
  let html = `
    <style id="cal-v3-css">
      .cal-wrap { max-width: 1400px; margin: 0 auto; padding: 0 4px; }
      .cal-header-card {
        background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px 20px;
        box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
        margin-bottom: 16px;
      }
      .cal-header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 14px;
      }
      .cal-title-area h1 {
        font-size: 22px;
        font-weight: 800;
        color: var(--dark);
        margin: 0;
        letter-spacing: -0.3px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cal-title-area .sub {
        font-size: 13px;
        color: var(--muted);
        margin-top: 3px;
      }
      .cal-nav-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .cal-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid var(--border);
        background: #FFFFFF;
        color: var(--dark);
        user-select: none;
      }
      .cal-btn:hover {
        background: var(--bg);
        border-color: var(--muted);
        transform: translateY(-1px);
      }
      .cal-btn.primary {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
      }
      .cal-btn.primary:hover {
        background: var(--primary-dark);
        border-color: var(--primary-dark);
      }
      .cal-view-switcher {
        display: inline-flex;
        background: #F1F5F9;
        padding: 3px;
        border-radius: 10px;
        border: 1px solid var(--border);
      }
      .cal-view-btn {
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        border: none;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cal-view-btn.active {
        background: #FFFFFF;
        color: var(--dark);
        box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      }

      /* Controls Row */
      .cal-controls-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--border-light);
      }
      .cal-select {
        padding: 7px 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        background: #FFFFFF;
        color: var(--dark);
        min-width: 220px;
        cursor: pointer;
      }

      /* KPI Ribbon */
      .cal-kpi-ribbon {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .cal-kpi-card {
        background: #FFFFFF;
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 12px 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      .cal-kpi-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 3.5px;
      }
      .cal-kpi-card.kpi-bks::before { background: var(--primary); }
      .cal-kpi-card.kpi-rev::before { background: #10B981; }
      .cal-kpi-card.kpi-on::before { background: #FF385C; }
      .cal-kpi-card.kpi-off::before { background: #4F46E5; }
      .cal-kpi-card.kpi-occ::before { background: #8B5CF6; }

      .cal-kpi-label { font-size: 11.5px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
      .cal-kpi-num { font-size: 22px; font-weight: 800; color: var(--dark); margin: 4px 0 2px; }
      .cal-kpi-sub { font-size: 11px; color: var(--text-secondary); }

      /* ═════════════════════════════════════════════════ */
      /* TIMELINE MATRIX (GANTT VIEW)                      */
      /* ═════════════════════════════════════════════════ */
      .timeline-container {
        background: #FFFFFF;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05);
        margin-bottom: 20px;
      }
      .timeline-scroll-wrap {
        overflow-x: auto;
        overflow-y: auto;
        max-height: 72vh;
        -webkit-overflow-scrolling: touch;
        position: relative;
      }
      .timeline-table {
        border-collapse: separate;
        border-spacing: 0;
        width: 100%;
        min-width: 1100px;
        table-layout: fixed;
      }

      /* Sticky Property Header / Column */
      .timeline-col-room {
        width: 160px;
        min-width: 160px;
        max-width: 160px;
        position: sticky;
        left: 0;
        z-index: 20;
        background: #FFFFFF;
        box-shadow: 3px 0 6px -2px rgba(0,0,0,0.06);
        padding: 8px 12px;
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border-light);
        text-align: left;
      }
      .timeline-th-corner {
        position: sticky;
        top: 0;
        left: 0;
        z-index: 30;
        background: #F8FAFC;
        border-bottom: 2px solid var(--border);
        border-right: 1px solid var(--border);
        padding: 10px 12px;
        font-size: 11px;
        font-weight: 800;
        color: var(--muted);
        text-transform: uppercase;
        box-shadow: 3px 2px 6px -2px rgba(0,0,0,0.06);
      }

      /* Day Header Cells */
      .timeline-th-day {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #F8FAFC;
        border-bottom: 2px solid var(--border);
        border-right: 1px solid rgba(0,0,0,0.04);
        padding: 6px 0;
        text-align: center;
        width: 38px;
        min-width: 38px;
      }
      .timeline-th-day.today {
        background: #FEF2F2 !important;
        border-bottom-color: #EF4444;
      }
      .timeline-th-day.today .th-day-num {
        color: #EF4444;
        font-weight: 800;
      }
      .th-day-name { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
      .th-day-num { font-size: 12px; font-weight: 700; color: var(--dark); line-height: 1.2; }

      /* Property Cell in Body */
      .room-cell-info { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
      .room-cell-num { font-size: 12px; font-weight: 800; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .room-cell-name { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
      .room-cell-rate { font-size: 10px; color: #10B981; font-weight: 700; }

      /* Day Matrix Cell */
      .timeline-td {
        padding: 2px;
        border-right: 1px solid #F1F5F9;
        border-bottom: 1px solid #F1F5F9;
        height: 48px;
        max-height: 48px;
        vertical-align: middle;
        position: relative;
        background: #FFFFFF;
      }
      .timeline-td.today {
        background: #FFF5F5;
      }
      .timeline-td.free {
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .timeline-td.free:hover {
        background: #F0FDF4;
      }
      .timeline-free-dot {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #CBD5E1;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .timeline-td.free:hover .timeline-free-dot {
        opacity: 1;
        color: #10B981;
      }

      /* Booking Span Blocks */
      .timeline-bar {
        width: 100%;
        height: 38px;
        display: flex;
        align-items: center;
        padding: 0 4px;
        font-size: 10.5px;
        font-weight: 700;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        user-select: none;
        transition: all 0.15s ease;
      }
      .timeline-bar:hover {
        filter: brightness(0.95);
        transform: translateY(-1px);
        z-index: 5;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      }
      .timeline-bar.airbnb {
        background: #FFF1F2;
        color: #9F1239;
        border: 1px solid #FDA4AF;
      }
      .timeline-bar.direct {
        background: #EEF2FF;
        color: #3730A3;
        border: 1px solid #C7D2FE;
      }
      .timeline-bar.blocked {
        background: #FEF2F2;
        color: #991B1B;
        border: 1px solid #FCA5A5;
      }
      .timeline-bar.rounded-left { border-top-left-radius: 8px; border-bottom-left-radius: 8px; margin-left: 2px; }
      .timeline-bar.rounded-right { border-top-right-radius: 8px; border-bottom-right-radius: 8px; margin-right: 2px; }
      .timeline-bar.rounded-both { border-radius: 8px; margin: 0 2px; }

      .timeline-guest-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 10.5px;
        font-weight: 700;
      }
      .timeline-avatar-badge {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 800;
        background: rgba(0,0,0,0.1);
        margin-right: 4px;
        flex-shrink: 0;
      }
      .timeline-overlap-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #DC2626;
        color: #FFFFFF;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        font-size: 9px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        z-index: 6;
      }

      /* ═════════════════════════════════════════════════ */
      /* MONTH GRID VIEW (CLASSIC / SINGLE ROOM)          */
      /* ═════════════════════════════════════════════════ */
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 3px;
      }
      .cal-hdr {
        font-size: 10.5px;
        font-weight: 700;
        color: var(--muted);
        text-align: center;
        padding: 6px 0;
        text-transform: uppercase;
        background: #F8FAFC;
        border-radius: 6px;
      }
      .cal-empty { min-height: 60px; background: transparent; }
      .cal-day {
        min-height: 60px;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 5px;
        cursor: pointer;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #FFFFFF;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .cal-day:hover {
        box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        transform: translateY(-1px);
        z-index: 2;
      }
      .cal-day.today {
        background: #FEF2F2 !important;
        border-color: #FF385C;
      }
      .cal-day.today .cal-date-num {
        color: #FF385C;
        font-weight: 800;
      }
      .cal-day.past { opacity: 0.55; }
      .cal-day.booked { border-color: rgba(0,0,0,0.08); }
      .cal-date-num { font-size: 12px; font-weight: 700; color: #334155; }
      .cal-rate { font-size: 10px; color: #10B981; font-weight: 600; text-align: right; }
      .cal-pill {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 6px;
        margin: 2px 0;
        overflow: hidden;
      }
      .cal-avatar {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 9.5px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .cal-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 11px;
        font-weight: 700;
      }

      /* Legend Bar */
      .cal-legend-bar {
        background: #FFFFFF;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 16px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 18px;
      }
      .legend-item { display: inline-flex; align-items: center; gap: 6px; }
      .legend-dot { width: 12px; height: 12px; border-radius: 4px; }

      @media (max-width: 768px) {
        .cal-kpi-ribbon { grid-template-columns: 1fr 1fr; gap: 8px; }
        .timeline-col-room { width: 120px; min-width: 120px; max-width: 120px; padding: 6px 8px; }
        .room-cell-num { font-size: 11px; }
        .room-cell-name { font-size: 10px; }
        .timeline-th-day { width: 34px; min-width: 34px; }
        .timeline-bar { font-size: 9.5px; height: 34px; }
        .timeline-td { height: 42px; }
        .cal-header-card { padding: 14px; }
        .cal-title-area h1 { font-size: 19px; }
      }
    </style>

    <div class="cal-wrap">
      <!-- HEADER & CONTROLS -->
      <div class="cal-header-card">
        <div class="cal-header-top">
          <div class="cal-title-area">
            <h1>📅 ${mName} ${yr}</h1>
            <div class="sub">
              ${selRoom === 'all' ? 'All Properties (' + allRooms.length + ')' : allRooms.find(r => r.room_id === selRoom)?.nickname || selRoom}
              &bull; <strong>${occ}%</strong> Occupancy &bull; <strong>${vacantNights}</strong> Nights Available
            </div>
          </div>

          <div class="cal-nav-group">
            <div class="cal-view-switcher">
              <button class="cal-view-btn ${viewMode === 'timeline' ? 'active' : ''}" onclick="calSetViewMode('timeline')">📊 Timeline Matrix</button>
              <button class="cal-view-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="calSetViewMode('grid')">📅 Month Grid</button>
            </div>
            <button class="cal-btn" onclick="chMo(-1)" title="Previous Month">◀</button>
            <button class="cal-btn" onclick="calGoToday()" title="Current Month">Today</button>
            <button class="cal-btn" onclick="chMo(1)" title="Next Month">▶</button>
          </div>
        </div>

        <div class="cal-controls-row">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <label style="font-size:12.5px;font-weight:700;color:var(--text-secondary);">Property Filter:</label>
            <select class="cal-select" onchange="calSelectRoom(this.value)">
              ${propOptions}
            </select>
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button class="cal-btn" onclick="renderReports()" title="Refresh live bookings">🔄 Refresh</button>
            <button class="cal-btn" onclick="openQuickBlockModal('${selRoom === 'all' ? (allRooms[0]?.room_id || '') : selRoom}', '${todayStr}', '${dateAdd(todayStr, 1)}')">🛑 Quick Block</button>
            <button class="cal-btn primary" onclick="if(window.renderAddBooking) renderAddBooking();">➕ New Booking</button>
          </div>
        </div>
      </div>

      <!-- KPI METRIC RIBBON -->
      <div class="cal-kpi-ribbon">
        <div class="cal-kpi-card kpi-bks">
          <span class="cal-kpi-label">Month Bookings</span>
          <div class="cal-kpi-num">${mb.length}</div>
          <span class="cal-kpi-sub">Total reservations in ${mName}</span>
        </div>
        <div class="cal-kpi-card kpi-rev">
          <span class="cal-kpi-label">Revenue Paid</span>
          <div class="cal-kpi-num" style="color:#059669;">₹${rev.toLocaleString('en-IN')}</div>
          <span class="cal-kpi-sub">Received payments to date</span>
        </div>
        <div class="cal-kpi-card kpi-on">
          <span class="cal-kpi-label">Online (Airbnb)</span>
          <div class="cal-kpi-num" style="color:#FF385C;">${onCount}</div>
          <span class="cal-kpi-sub">${mb.length > 0 ? Math.round(onCount/mb.length*100) : 0}% of all bookings</span>
        </div>
        <div class="cal-kpi-card kpi-off">
          <span class="cal-kpi-label">Offline (Direct)</span>
          <div class="cal-kpi-num" style="color:#4F46E5;">${offCount}</div>
          <span class="cal-kpi-sub">${mb.length > 0 ? Math.round(offCount/mb.length*100) : 0}% direct bookings</span>
        </div>
        <div class="cal-kpi-card kpi-occ">
          <span class="cal-kpi-label">Portfolio Occupancy</span>
          <div class="cal-kpi-num" style="color:#8B5CF6;">${occ}%</div>
          <span class="cal-kpi-sub">${bookedNights}/${totalRoomNights} room nights</span>
        </div>
      </div>

      <!-- LEGEND BAR -->
      <div class="cal-legend-bar">
        <div class="legend-item">
          <span class="legend-dot" style="background:#FF385C;"></span>
          <span>Airbnb Online</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#4F46E5;"></span>
          <span>Direct / Offline</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#DC2626;"></span>
          <span>Maintenance / Blocked</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#FFFFFF;border:1px solid #CBD5E1;"></span>
          <span>Available to Book</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#FEF2F2;border:1px solid #EF4444;"></span>
          <span>Today's Date</span>
        </div>
      </div>
  `;

  // ═══════════════════════════════════════════════════════════
  // VIEW MODE 1: TIMELINE MATRIX (GANTT VIEW)
  // ═══════════════════════════════════════════════════════════
  if (viewMode === 'timeline') {
    html += `
      <div class="timeline-container">
        <div class="timeline-scroll-wrap" id="timelineScrollWrap">
          <table class="timeline-table">
            <thead>
              <tr>
                <th class="timeline-th-corner">Property (${displayRooms.length})</th>
                ${Array.from({ length: dim }, (_, i) => {
                  const d = i + 1;
                  const dt = new Date(yr, mo, d);
                  const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isToday = ds === todayStr;
                  const dayName = dayNamesShort[dt.getDay()];
                  return `
                    <th class="timeline-th-day ${isToday ? 'today' : ''}" title="${ds}">
                      <div class="th-day-name">${dayName}</div>
                      <div class="th-day-num">${d}</div>
                    </th>
                  `;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${displayRooms.map(r => {
                let rowCells = '';
                for (let d = 1; d <= dim; d++) {
                  const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const k = `${r.room_id}_${ds}`;
                  const bkArr = bMap[k] || [];
                  const isToday = ds === todayStr;

                  if (bkArr.length > 0) {
                    const bk = bkArr[0];
                    const overlapCount = bkArr.length;
                    const isCheckIn = bk.check_in === ds;
                    const isCheckOut = dateAdd(ds, 1) === bk.check_out;

                    const isOnline = bk.booking_mode === 'Online-Airbnb';
                    const isBlocked = (bk.guest_name || '').toLowerCase().includes('blocked') || bk.booking_mode === 'Offline-Blocked';

                    let barClass = 'direct';
                    if (isBlocked) barClass = 'blocked';
                    else if (isOnline) barClass = 'airbnb';

                    let roundClass = '';
                    if (isCheckIn && isCheckOut) roundClass = 'rounded-both';
                    else if (isCheckIn) roundClass = 'rounded-left';
                    else if (isCheckOut) roundClass = 'rounded-right';

                    const guestInitial = (bk.guest_name || 'G').charAt(0).toUpperCase();
                    const nameParts = (bk.guest_name || 'Guest').trim().split(/\s+/);
                    let firstName = nameParts[0] || 'G';
                    if (firstName.length > 8) firstName = firstName.substring(0, 8);

                    const totalNights = calcNights(bk.check_in, bk.check_out);
                    const currentNight = calcNights(bk.check_in, ds);
                    const showName = isCheckIn || (currentNight > 0 && currentNight % 3 === 0);

                    const overlapTitle = overlapCount > 1
                      ? `⚠️ ${overlapCount} Bookings: ` + bkArr.map(x => x.guest_name || 'Guest').join(' + ')
                      : `${bk.guest_name || 'Booked'} (${bk.check_in} → ${bk.check_out})`;

                    rowCells += `
                      <td class="timeline-td ${isToday ? 'today' : ''}" style="padding:0;">
                        <div class="timeline-bar ${barClass} ${roundClass}" onclick="showBookingPopup('${r.room_id}','${ds}')" title="${overlapTitle}">
                          ${overlapCount > 1 ? `<span class="timeline-overlap-badge" title="${overlapCount} bookings">${overlapCount}</span>` : ''}
                          ${isCheckIn ? `<span class="timeline-avatar-badge">${guestInitial}</span>` : ''}
                          ${showName ? `<span class="timeline-guest-name">${firstName}</span>` : ''}
                        </div>
                      </td>
                    `;
                  } else {
                    rowCells += `
                      <td class="timeline-td free ${isToday ? 'today' : ''}" onclick="calCreateBooking('${r.room_id}','${ds}')" title="Free — Click to book or block ${ds}">
                        <div class="timeline-free-dot">+</div>
                      </td>
                    `;
                  }
                }

                return `
                  <tr>
                    <td class="timeline-col-room">
                      <div class="room-cell-info">
                        <div class="room-cell-num">${r.unit_no}</div>
                        <div class="room-cell-name">${r.nickname || r.property_name || ''}</div>
                        ${r.rent_per_night ? `<div class="room-cell-rate">₹${r.rent_per_night.toLocaleString('en-IN')}/n</div>` : ''}
                      </div>
                    </td>
                    ${rowCells}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW MODE 2: MONTH GRID (AIRBNB STYLE)
  // ═══════════════════════════════════════════════════════════
  else {
    const daysHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const firstDayOfMonth = new Date(yr, mo, 1).getDay();

    displayRooms.forEach(r => {
      let cellsHtml = '';

      daysHeader.forEach(d => {
        cellsHtml += `<div class="cal-hdr">${d}</div>`;
      });

      for (let i = 0; i < firstDayOfMonth; i++) {
        cellsHtml += `<div class="cal-empty"></div>`;
      }

      for (let d = 1; d <= dim; d++) {
        const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const k = `${r.room_id}_${ds}`;
        const bkArr = bMap[k] || [];
        const bk = bkArr[0];
        const overlapCount = bkArr.length;
        const isToday = ds === todayStr;
        const isPast = ds < todayStr;

        if (bk) {
          const isCheckIn = bk.check_in === ds;
          const isCheckOut = dateAdd(ds, 1) === bk.check_out;
          const isOnline = bk.booking_mode === 'Online-Airbnb';
          const isBlocked = (bk.guest_name || '').toLowerCase().includes('blocked') || bk.booking_mode === 'Offline-Blocked';

          let bg = isOnline ? '#FF385C' : '#4F46E5';
          if (isBlocked) bg = '#DC2626';

          const guestInitial = (bk.guest_name || 'G').charAt(0).toUpperCase();
          const nameParts = (bk.guest_name || 'Guest').trim().split(/\s+/);
          let firstName = nameParts[0] || 'G';
          if (firstName.length > 8) firstName = firstName.substring(0, 8);

          const currentNight = calcNights(bk.check_in, ds);
          const showName = isCheckIn || isCheckOut || (currentNight > 0 && currentNight % 2 === 0);
          const showAvatar = isCheckIn;

          let borderRadius = '0';
          if (isCheckIn && isCheckOut) borderRadius = '14px';
          else if (isCheckIn) borderRadius = '14px 0 0 14px';
          else if (isCheckOut) borderRadius = '0 14px 14px 0';

          const overlapTitle = overlapCount > 1
            ? bkArr.map(x => x.guest_name || 'Guest').join(' + ')
            : (bk.guest_name || 'Booked');

          cellsHtml += `
            <div class="cal-day booked ${isToday ? 'today' : ''}" onclick="showBookingPopup('${r.room_id}','${ds}')" title="${overlapTitle}" style="position:relative;">
              <div class="cal-date-num">${d}</div>
              ${overlapCount > 1 ? `<div style="position:absolute;top:3px;right:3px;background:#DC2626;color:#fff;border-radius:50%;min-width:18px;height:18px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;box-shadow:0 2px 4px rgba(0,0,0,0.4);z-index:3;line-height:1;" title="${overlapCount} bookings">${overlapCount}</div>` : ''}
              <div class="cal-pill" style="background:${bg};border-radius:${borderRadius};">
                ${showAvatar ? `<span class="cal-avatar">${guestInitial}</span>` : ''}
                ${showName ? `<span class="cal-name">${firstName}</span>` : ''}
              </div>
            </div>`;
        } else {
          const rate = r.rent_per_night || 0;
          cellsHtml += `
            <div class="cal-day empty ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" onclick="calCreateBooking('${r.room_id}','${ds}')" title="Free — Click to book or block">
              <div class="cal-date-num">${d}</div>
              ${rate > 0 && !isPast ? `<div class="cal-rate">₹${(rate/1000).toFixed(1)}k</div>` : ''}
            </div>`;
        }
      }

      html += `
        <div class="card" style="padding:14px;margin-bottom:16px;border-radius:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
              <strong style="font-size:15px;color:var(--dark);">${r.unit_no}</strong>
              <span style="color:var(--muted);font-size:13px;margin-left:6px;">${r.nickname || r.property_name || ''}</span>
            </div>
            ${r.rent_per_night ? `<span style="font-size:12px;font-weight:700;color:#059669;">Base: ₹${r.rent_per_night.toLocaleString('en-IN')}/night</span>` : ''}
          </div>
          <div class="cal-grid">${cellsHtml}</div>
        </div>`;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FOOTER: UPCOMING 7 DAYS & OPEN STAYS
  // ═══════════════════════════════════════════════════════════
  html += `
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:10px;">
      <div class="card" style="border-left:4px solid var(--blue);border-radius:14px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:13.5px;color:var(--dark);">📅 Next 7 Days Arrivals (${upcoming7.length})</strong>
          <button class="cal-btn" style="padding:2px 8px;font-size:11px;" onclick="navigate('bookings')">View All →</button>
        </div>
        ${upcoming7.slice(0, 5).map(x => `
          <div style="font-size:12px;margin-top:4px;padding:5px 0;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="color:var(--primary);cursor:pointer;" onclick="openBookingDetails('${x.booking_id}')">${x.guest_name || '-'}</strong> — ${bName(x)}<br>
              <small style="color:var(--muted);">${x.check_in} &bull; ${x.check_in_time || '2:00 PM'}</small>
            </div>
            <span class="badge ${x.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}" style="font-size:10px;">
              ${x.booking_mode === 'Online-Airbnb' ? 'Airbnb' : 'Direct'}
            </span>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">No upcoming arrivals</div>'}
      </div>

      <div class="card" style="border-left:4px solid var(--primary);border-radius:14px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:13.5px;color:var(--dark);">🟢 Currently Staying (${openStays.length})</strong>
          <button class="cal-btn" style="padding:2px 8px;font-size:11px;" onclick="navigate('bookings')">View All →</button>
        </div>
        ${openStays.slice(0, 5).map(x => `
          <div style="font-size:12px;margin-top:4px;padding:5px 0;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="color:var(--primary);cursor:pointer;" onclick="openBookingDetails('${x.booking_id}')">${x.guest_name || '-'}</strong> — ${bName(x)}<br>
              <small style="color:var(--muted);">Since ${x.check_in} &bull; Till ${x.check_out || 'Open'}</small>
            </div>
            <button class="cal-btn" style="padding:2px 6px;font-size:10px;" onclick="openBookingDetails('${x.booking_id}')">Details</button>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">No active stays currently</div>'}
      </div>
    </div>
  </div>`;

  renderShell(html, 'reports');
  window._calM = mo;
  window._calY = yr;

  // Auto-scroll timeline to current date column on initial load
  setTimeout(() => {
    const scroller = document.getElementById('timelineScrollWrap');
    const todayTh = scroller?.querySelector('.timeline-th-day.today');
    if (scroller && todayTh) {
      const offset = todayTh.offsetLeft - 240;
      scroller.scrollTo({ left: Math.max(offset, 0), behavior: 'smooth' });
    }
  }, 100);
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION & VIEW SWITCHERS
// ═══════════════════════════════════════════════════════════
function calSetViewMode(mode) {
  window._calViewMode = mode;
  renderReports();
}

function chMo(d) {
  let m = (window._calM ?? new Date().getMonth()) + d;
  let y = window._calY ?? new Date().getFullYear();
  if (m > 11) { m = 0; y++; }
  if (m < 0) { m = 11; y--; }
  window._calM = m;
  window._calY = y;
  renderReports();
}

function calGoToday() {
  window._calM = new Date().getMonth();
  window._calY = new Date().getFullYear();
  renderReports();
}

function calSelectRoom(roomId) {
  window._calRoom = roomId;
  renderReports();
}

// ═══════════════════════════════════════════════════════════
// DATE ACTION DIALOG (CLICK ON EMPTY / FREE CELL)
// ═══════════════════════════════════════════════════════════
window.calCreateBooking = function(roomId, dateStr) {
  const allR = window._allRoomsCache || [];
  const room = allR.find(r => r.room_id === roomId) || { room_id: roomId };
  const nextDay = typeof dateAdd === 'function' ? dateAdd(dateStr, 1) : dateStr;
  const pName = typeof propLabel === 'function' ? propLabel(room) : (room.nickname || roomId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:440px;padding:22px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:4px;font-size:18px;">📅 Date Actions</h2>
      <div style="font-size:13px;color:var(--muted);margin-bottom:18px;">
        Property: <strong>${pName}</strong><br>
        Date Selected: <strong>${dateStr}</strong>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="this.closest('.modal-overlay').remove(); if(window.renderAddBooking) renderAddBooking({ room_id: '${roomId}', check_in: '${dateStr}' });" style="padding:12px 14px;background:#059669;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 6px rgba(5,150,105,0.25);">
          ➕ Add New Guest Booking
        </button>

        <button onclick="this.closest('.modal-overlay').remove(); openQuickBlockModal('${roomId}', '${dateStr}', '${nextDay}');" style="padding:12px 14px;background:#DC2626;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          🛑 Block Dates (Maintenance / Hold)
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ═══════════════════════════════════════════════════════════
// QUICK BLOCK MODAL
// ═══════════════════════════════════════════════════════════
window.openQuickBlockModal = function(roomId, cin, cout) {
  const allR = window._allRoomsCache || [];
  const room = allR.find(r => r.room_id === roomId) || { room_id: roomId };
  const pName = typeof propLabel === 'function' ? propLabel(room) : (room.nickname || roomId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:440px;padding:22px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:4px;font-size:18px;">🛑 Block Property Dates</h2>
      <div class="sub" style="margin-bottom:14px;">Lock dates on calendar to prevent double-booking</div>

      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:700;">Property</label>
        <div style="padding:8px 10px;background:#F1F5F9;border-radius:8px;font-weight:700;font-size:13px;color:var(--dark);">
          ${pName}
        </div>
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:700;">Check-in Date *</label>
        <input type="date" id="blockCin" value="${cin}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;" />
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:700;">Check-out Date *</label>
        <input type="date" id="blockCout" value="${cout}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;" />
      </div>

      <div class="form-group" style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:700;">Reason / Notes</label>
        <input id="blockNotes" placeholder="e.g., Owner Stay, Maintenance, Deep Clean" value="Offline Block / Owner Hold" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;" />
      </div>

      <button onclick="saveQuickBlock('${roomId}')" style="width:100%;padding:12px;background:#DC2626;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;box-shadow:0 2px 6px rgba(220,38,38,0.25);">
        💾 Lock Dates on Calendar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveQuickBlock = async function(roomId) {
  const cin = document.getElementById('blockCin').value;
  const cout = document.getElementById('blockCout').value;
  const notes = document.getElementById('blockNotes').value.trim();

  if (!cin || !cout || cout <= cin) {
    alert('⚠️ Please select valid Check-in and Check-out dates (Check-out must be after Check-in).');
    return;
  }

  const deterministicId = 'BLK_' + roomId + '_' + cin.replace(/-/g, '') + '_' + cout.replace(/-/g, '');

  const { error } = await sb.from('guest_register').upsert({
    booking_id: deterministicId,
    guest_name: '🚫 Blocked / Unavailable',
    room_id: roomId,
    check_in: cin,
    check_out: cout,
    booking_mode: 'Offline',
    payment_status: 'Unpaid',
    total_amount: 0,
    notes: notes || 'Offline Block'
  }, { onConflict: 'booking_id' });

  if (error) {
    alert('❌ Error blocking dates: ' + error.message);
    return;
  }

  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Blocked', '✅ Dates blocked on calendar');
  if (window.renderReports) renderReports();
};

// ═══════════════════════════════════════════════════════════
// MULTI-BOOKING LIST VIEW (FOR OVERLAPS ON SAME DATE)
// ═══════════════════════════════════════════════════════════
async function showMultiBookingList(bookings, roomId, dateStr) {
  const roomInfo = bookings[0].rooms || {};
  const roomLabel = propLabel(roomInfo) || roomId;
  const dateFmt = new Date(dateStr).toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});

  const bkIds = bookings.map(b => b.booking_id);
  const { data: allPays } = await sb.from('payment_history')
    .select('booking_id, amount, verification_status')
    .in('booking_id', bkIds)
    .neq('verification_status', 'rejected');

  const paidMap = {};
  (allPays || []).forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const bookingCards = bookings.map((b, idx) => {
    const paid = paidMap[b.booking_id] || 0;
    const bal = (b.total_amount || 0) - paid;
    const nights = b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : '-';
    const modeIcon = b.booking_mode === 'Online-Airbnb' ? '🌐' : '🏠';
    const modeText = b.booking_mode === 'Online-Airbnb' ? 'Airbnb' : 'Direct';

    return `
      <div style="background:#fff;border:1.5px solid ${idx === 0 ? '#3B82F6' : '#F59E0B'};border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--dark);">
              ${idx + 1}. ${modeIcon} ${b.guest_name || 'Guest'}
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              ${b.phone ? `📞 <a href="tel:${b.phone}">${b.phone}</a>` : 'No phone'} &bull; ${modeText}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:15px;font-weight:800;color:var(--dark);">₹${(b.total_amount || 0).toLocaleString('en-IN')}</div>
            <div style="font-size:11px;font-weight:700;color:${bal > 0 ? '#DC2626' : '#059669'};">
              ${bal > 0 ? 'Due: ₹' + bal.toLocaleString('en-IN') : '✅ Fully Paid'}
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;font-size:11.5px;background:#F8FAFC;padding:8px 10px;border-radius:8px;margin-bottom:10px;">
          <div><strong>Check-in:</strong><br>${b.check_in || '-'} ${b.check_in_time || ''}</div>
          <div><strong>Check-out:</strong><br>${b.check_out || '-'} ${b.check_out_time || ''}</div>
          <div><strong>Nights:</strong><br>${nights}</div>
        </div>

        ${b.notes ? `<div style="font-size:11.5px;color:#78350F;padding:6px 10px;background:#FEF3C7;border-radius:6px;margin-bottom:10px;"><strong>Notes:</strong> ${b.notes}</div>` : ''}

        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-sm" onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="flex:1;">✏️ Edit</button>
          <button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove(); if(window.openAddPaymentModal) openAddPaymentModal('${b.booking_id}'); else if(window.showPaymentModal) showPaymentModal('${b.booking_id}');" style="flex:1;">💰 Pay</button>
          ${b.phone ? `<button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove(); if(window.shareBookingWhatsApp) shareBookingWhatsApp('${b.booking_id}');" style="flex:1;">📱 WhatsApp</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal-box" style="max-width:560px;padding:22px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px;font-size:18px;">📅 Multiple Bookings on This Date</h2>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">
        🏠 ${roomLabel} &bull; ${dateFmt}
      </div>

      <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:12px;color:#92400E;">
        ⚠️ <strong>${bookings.length} bookings overlap on this date.</strong> This could be a back-to-back shift, Airbnb review placeholder, or scheduling clash.
      </div>

      ${bookingCards}

      <button class="cal-btn" onclick="this.closest('.modal-overlay').remove();" style="width:100%;justify-content:center;margin-top:4px;">Close</button>
    </div>`;

  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════
// SINGLE BOOKING POPUP (CALENDAR CLICK)
// ═══════════════════════════════════════════════════════════
async function showBookingPopup(roomId, dateStr) {
  const { data: bks } = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name)')
    .eq('room_id', roomId)
    .lte('check_in', dateStr)
    .gt('check_out', dateStr)
    .neq('verification_status', 'rejected')
    .order('check_in', { ascending: true });

  const bookings = bks || [];
  if (bookings.length === 0) return;

  if (bookings.length > 1) {
    return showMultiBookingList(bookings, roomId, dateStr);
  }

  const b = bookings[0];
  openBookingDetails(b.booking_id);
}

// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE BOOKING DETAILS MODAL
// ═══════════════════════════════════════════════════════════
window.openBookingDetails = async function(bId) {
  const { data: b } = await sb.from('guest_register')
    .select('*, rooms(nickname, unit_no, property_name)')
    .eq('booking_id', bId)
    .single();

  if (!b) { alert('Booking not found'); return; }

  const { data: pays } = await sb.from('payment_history')
    .select('amount, verification_status')
    .eq('booking_id', bId)
    .neq('verification_status', 'rejected');

  const totalPaid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const due = Math.max((b.total_amount || 0) - totalPaid, 0);
  const nights = (b.check_in && b.check_out) ? Math.max(Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000), 1) : 1;
  const idPaths = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean);

  const isBlocked = b.guest_name && (b.guest_name.includes('Blocked') || b.booking_mode === 'Offline-Blocked');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px;padding:22px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:12px;font-size:18px;">${isBlocked ? '🛑 Property Block Slot' : '📅 Booking Details'}</h2>

      <div style="background:${isBlocked ? '#FEF2F2' : '#F8FAFC'};padding:14px;border-radius:12px;border:1px solid ${isBlocked ? '#FCA5A5' : 'var(--border)'};margin-bottom:14px;font-size:13px;line-height:1.7;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div><strong>Guest:</strong> ${b.guest_name || '-'} ${typeof getRatingBadge === 'function' ? getRatingBadge(b.client_rating) : ''}</div>
          <span class="badge ${b.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${b.booking_mode}</span>
        </div>
        ${b.phone ? `<div><strong>Phone:</strong> <a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;">${b.phone}</a></div>` : ''}
        <div><strong>Property:</strong> ${propLabel(b.rooms) || b.room_id}</div>
        <div><strong>Stay:</strong> 🗓️ ${b.check_in} ➔ ${b.check_out} (<strong>${nights}</strong> Night${nights > 1 ? 's' : ''})</div>
        <div style="margin-top:4px;padding-top:6px;border-top:1px dashed var(--border);">
          <strong>Total:</strong> ₹${(b.total_amount || 0).toLocaleString('en-IN')} &bull; 
          <span style="color:#059669;"><strong>Paid:</strong> ₹${totalPaid.toLocaleString('en-IN')}</span> &bull; 
          <span style="color:${due > 0 ? '#DC2626' : '#059669'};"><strong>Due:</strong> ₹${due.toLocaleString('en-IN')}</span>
        </div>
        ${b.has_vehicle ? `<div style="margin-top:4px;font-size:12px;color:var(--muted);">🚗 Vehicle: ${(b.vehicle_name || '') + ' ' + (b.vehicle_number || '')}</div>` : ''}
        ${b.notes ? `<div style="font-size:12px;color:#78350F;margin-top:6px;padding:6px 10px;background:#FFFBEB;border-radius:6px;"><strong>Notes:</strong> ${b.notes}</div>` : ''}
      </div>

      ${idPaths.length ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">ID Proofs (${idPaths.length})</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${idPaths.map((p, i) => `<button class="cal-btn" style="padding:4px 8px;font-size:11px;" onclick="if(window.dlIdPhoto) dlIdPhoto('${p}')">🪪 Guest ID ${i + 1}</button>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- FULL ACTION BUTTONS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${isBlocked ? `
          <button onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="padding:11px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;grid-column:span 2;">
            ➕ Convert Block to Guest Booking
          </button>
        ` : `
          <button onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="padding:10px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            ✏️ Edit Booking
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.openAddPaymentModal) openAddPaymentModal('${b.booking_id}'); else if(window.showPaymentModal) showPaymentModal('${b.booking_id}');" style="padding:10px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            💵 Add Payment
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.duplicateBooking) duplicateBooking('${b.booking_id}');" style="padding:10px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            📋 Duplicate
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.shareBookingWhatsApp) shareBookingWhatsApp('${b.booking_id}');" style="padding:10px;background:#25D366;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            📱 WhatsApp
          </button>
        `}
        <button onclick="if(confirm('Delete this booking/block?')){ this.closest('.modal-overlay').remove(); if(window.delBooking) delBooking('${b.booking_id}', '${(b.guest_name||'Booking').replace(/'/g, "\\'")}', '${b.room_id}'); else if(window.deleteBooking) deleteBooking('${b.booking_id}'); }" style="padding:9px;background:#DC2626;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;grid-column:span 2;margin-top:2px;">
          🗑️ Delete Booking / Block
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ═══════════════════════════════════════════════════════════
// FINANCIAL SUMMARY (FY REPORTING & ACCOUNTANT)
// ═══════════════════════════════════════════════════════════
async function renderFYSummary(range = 'FY', propFilter = '', modeFilter = '') {
  const isCA = SESSION.role === 'ca';
  if (!isCA) renderShell(`<div class="loading">Loading...</div>`, 'dashboard');
  const { data: allRooms } = await sb.from('rooms').select('room_id, nickname, property_name').order('room_id');

  const now = new Date(), today = now.toISOString().slice(0, 10);
  let s, e, label;

  if (range === 'Today') { s = today; e = today; label = 'Today'; }
  else if (range === 'Week') { let d = new Date(now); d.setDate(now.getDate() - 7); s = d.toISOString().slice(0, 10); e = today; label = 'Last 7 Days'; }
  else if (range === 'Month') { s = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'; e = today; label = 'This Month'; }
  else if (range === 'Quarter') { let q = Math.floor(now.getMonth() / 3) * 3; s = now.getFullYear() + '-' + String(q + 1).padStart(2, '0') + '-01'; e = today; label = 'This Quarter'; }
  else if (range === 'YTD') { s = now.getFullYear() + '-04-01'; e = today; label = 'YTD'; }
  else { let fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; s = fy + '-04-01'; e = (fy + 1) + '-03-31'; label = `FY ${fy}-${fy + 1}`; }

  const [gs, ex, py] = await Promise.all([
    sb.from('guest_register').select('booking_id,check_in,total_amount,room_id,guest_name,booking_mode,is_review_booking'),
    sb.from('expenses').select('amount,month'),
    sb.from('payment_history').select('booking_id,amount'),
  ]);

  let fg = (gs.data || []).filter(g => g.check_in >= s && g.check_in <= e);
  fg = fg.filter(g => g.guest_name && g.guest_name.toLowerCase().trim() !== 'pending' && !g.is_review_booking);
  if (propFilter) fg = fg.filter(g => g.room_id === propFilter);
  if (modeFilter === 'Online') fg = fg.filter(g => g.booking_mode === 'Online-Airbnb');
  if (modeFilter === 'Offline') fg = fg.filter(g => g.booking_mode !== 'Online-Airbnb');
  const ids = fg.map(g => g.booking_id);
  const pm = {};
  (py.data || []).forEach(p => { if (ids.includes(p.booking_id)) pm[p.booking_id] = (pm[p.booking_id] || 0) + (p.amount || 0); });
  const inc = fg.reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const exp = (ex.data || []).reduce((a, x) => a + (x.amount || 0), 0);
  const net = inc - exp;
  const onlineInc = fg.filter(g => g.booking_mode === 'Online-Airbnb').reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const offlineInc = inc - onlineInc;

  const btns = ['Today', 'Week', 'Month', 'Quarter', 'YTD', 'FY'].map(r =>
    `<button class="${r === range ? '' : 'secondary'} btn-sm" onclick="renderFYSummary('${r}', '${propFilter}', '${modeFilter}')">${r}</button>`
  ).join('');

  const tbl = `<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Guest</th><th>Room</th><th>Mode</th><th>Check-in</th><th>Received</th></tr></thead>
    <tbody>${fg.map(g => `<tr>
      <td style="font-size:11px;">${g.booking_id}</td><td>${g.guest_name}</td><td>${g.room_id}</td>
      <td><span class="badge ${g.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${g.booking_mode === 'Online-Airbnb' ? 'On' : 'Off'}</span></td>
      <td>${g.check_in}</td><td>₹${(pm[g.booking_id] || 0).toLocaleString('en-IN')}</td>
    </tr>`).join('')}</tbody></table></div>`;

  window._fyData = { label, startDate: s, endDate: e, totalIncome: inc, totalExpenses: exp, netProfit: net, bookings: fg, paidMap: pm };

  const summaryContent = `
    <div class="card"><h1>📊 Financial Summary</h1><div class="sub">${label} — ${s} to ${e}</div>
      <div class="btn-row" style="flex-wrap:wrap;gap:8px;">${btns}
        <select onchange="renderFYSummary('${range}', this.value, '${modeFilter}')" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;">
          <option value="">All Properties</option>
          ${(allRooms || []).map(r => `<option value="${r.room_id}" ${propFilter === r.room_id ? 'selected' : ''}>${r.nickname || r.room_id}</option>`).join('')}
        </select>
        <select onchange="renderFYSummary('${range}', '${propFilter}', this.value)" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;">
          <option value="">All Modes</option>
          <option value="Online" ${modeFilter === 'Online' ? 'selected' : ''}>🌐 Online (Airbnb)</option>
          <option value="Offline" ${modeFilter === 'Offline' ? 'selected' : ''}>💵 Offline (Direct)</option>
        </select>
      </div>
      ${!isCA ? `<button class="secondary btn-sm" onclick="renderReports()">← Back to Calendar</button>` : ''}
      <button class="outline btn-sm" onclick="downloadFYData()">⬇️ CSV</button>
    </div>
    <div class="card">
      <div class="metric-row"><span class="metric-label">Total Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Online Income</span><span class="metric-value" style="color:var(--blue);">₹${onlineInc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Offline Income</span><span class="metric-value" style="color:var(--yellow);">₹${offlineInc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${exp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Net Profit</span><span class="metric-value" style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'};">₹${net.toLocaleString('en-IN')}</span></div>
    </div>
    <div class="card"><div class="section-title">Bookings (${fg.length})</div>${tbl}</div>`;

  if (isCA) {
    appEl.innerHTML = `<div class="ca-wrap">
      <div class="ca-header"><img src="assets/logo.png" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-bottom:6px;" />
        <h1>${BRAND}</h1><div class="sub">👋 ${SESSION.displayName || 'CA'} — Accountant</div>
        <button class="ca-logout" onclick="logout()">🚪 Logout</button></div>
      ${summaryContent}
      <div class="card" style="text-align:center;"><button class="ca-logout" onclick="logout()">🚪 Logout</button></div>
    </div>`;
  } else {
    renderShell(summaryContent, 'dashboard');
  }
}

function downloadFYData() {
  const d = window._fyData;
  if (!d) return;
  let csv = `Period,${d.label}\nFrom,${d.startDate}\nTo,${d.endDate}\nIncome,${d.totalIncome}\nExpenses,${d.totalExpenses}\nProfit,${d.netProfit}\n\nBooking ID,Guest,Room,Check-in,Received\n`;
  d.bookings.forEach(g => {
    csv += `${g.booking_id},${g.guest_name},${g.room_id},${g.check_in},${d.paidMap[g.booking_id] || 0}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `Financial_${d.label}.csv`;
  a.click();
}

console.log('✅ Ultra-Modern Calendar module loaded');
