/**
 * Calendar Module v2 — Airbnb-Style
 * UNIQUE HAVEN HOMES STAY
 */

async function renderReports() {
  renderShell(`<div class="loading">📅 Loading calendar...</div>`, 'reports');

  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname, rent_per_night, property_name').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, check_in_time, check_out_time, guest_name, phone, booking_mode, total_amount, is_cancelled, verification_status')
      .neq('is_cancelled', true).neq('verification_status', 'rejected')
  ]);

  const allRooms = rooms.data || [];
  const allBks = bookings.data || [];

  const yr = window._calY ?? new Date().getFullYear();
  const mo = window._calM ?? new Date().getMonth();
  const selRoom = window._calRoom || 'all';

  const mName = new Date(yr, mo, 1).toLocaleString('default', { month: 'long' });
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
  const bMap = {};
  allBks.forEach(b => {
    if (!b.check_in || !b.check_out || !b.room_id) return;
    let c = b.check_in;
    while (c < b.check_out) {
      bMap[`${b.room_id}_${c}`] = b;
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

  // ─── Property selector ───
  const propOptions = '<option value="all">🏘️ All Properties</option>' +
    allRooms.map(r => `<option value="${r.room_id}"${r.room_id === selRoom ? ' selected' : ''}>${r.unit_no} — ${r.nickname || r.property_name || ''}</option>`).join('');

  // ─── Upcoming + Open stays ───
  const upcoming7 = allBks.filter(b => b.check_in > todayStr && b.check_in <= dateAdd(todayStr, 7))
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  const openStays = allBks.filter(b => b.checkout_confirmed === false && b.check_in <= todayStr && (b.check_out >= todayStr || !b.check_out));

  const bName = b => {
    const room = allRooms.find(r => r.room_id === b.room_id);
    return propLabel(room) || b.room_id || '-';
  };

  // ═══ HEADER ═══
  let html = `
    <div class="card" style="padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="margin:0;font-size:22px;">📆 ${mName} ${yr}</h1>
          <div class="sub">${selRoom === 'all' ? 'All Properties' : allRooms.find(r => r.room_id === selRoom)?.nickname || selRoom} · ${occ}% occupancy</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <button class="btn-sm secondary" onclick="chMo(-1)">◀</button>
          <button class="btn-sm secondary" onclick="calGoToday()">Today</button>
          <button class="btn-sm secondary" onclick="chMo(1)">▶</button>
        </div>
      </div>

      <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <label style="font-size:12px;">Property:</label>
        <select onchange="calSelectRoom(this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;flex:1;min-width:200px;">
          ${propOptions}
        </select>
      </div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));">
      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${mb.length}</div>
        <div class="stat-label">Bookings</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">₹${(rev/1000).toFixed(0)}K</div>
        <div class="stat-label">Revenue Paid</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${onCount}</div>
        <div class="stat-label">🌐 Online</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--yellow);">
        <div class="stat-num">${offCount}</div>
        <div class="stat-label">💵 Offline</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--purple, #8B5CF6);">
        <div class="stat-num">${occ}%</div>
        <div class="stat-label">📊 Occupancy</div>
      </div>
    </div>
  `;

  // ═══ CALENDAR GRID (Airbnb style) ═══
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = new Date(yr, mo, 1).getDay();

  displayRooms.forEach(r => {
    // Build day cells
    let cellsHtml = '';

    // Day header
    days.forEach(d => {
      cellsHtml += `<div class="cal-hdr">${d}</div>`;
    });

    // Empty cells before first
    for (let i = 0; i < firstDayOfMonth; i++) {
      cellsHtml += `<div class="cal-empty"></div>`;
    }

    // Actual day cells
    for (let d = 1; d <= dim; d++) {
      const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const k = `${r.room_id}_${ds}`;
      const bk = bMap[k];
      const isToday = ds === todayStr;
      const isPast = ds < todayStr;

      if (bk) {
        const isCheckIn = bk.check_in === ds;
        const isCheckOut = dateAdd(ds, 1) === bk.check_out;
        const isOnline = bk.booking_mode === 'Online-Airbnb';
        const bg = isOnline ? '#FF385C' : '#F59E0B';
        const guestInitial = (bk.guest_name || 'G').charAt(0).toUpperCase();
        // Smart name: full first name if short, truncate if long
        const nameParts = (bk.guest_name || 'Guest').trim().split(/\s+/);
        let firstName = nameParts[0] || 'G';
        // If too long, truncate; CSS ellipsis will handle rest
        if (firstName.length > 8) {
          firstName = firstName.substring(0, 8);
        }

        // Calculate day of the booking span (for repeating name every 3-4 cells)
        const totalNights = calcNights(bk.check_in, bk.check_out);
        const currentNight = calcNights(bk.check_in, ds);
        // Show name on: first day, every 2nd day, last day (max visibility)
        const showName = isCheckIn || isCheckOut || (currentNight > 0 && currentNight % 2 === 0);
        const showAvatar = isCheckIn;

        // Pill style: rounded left on check-in, rounded right on check-out
        let borderRadius = '0';
        if (isCheckIn && isCheckOut) borderRadius = '16px';
        else if (isCheckIn) borderRadius = '16px 0 0 16px';
        else if (isCheckOut) borderRadius = '0 16px 16px 0';

        cellsHtml += `
          <div class="cal-day booked ${isToday ? 'today' : ''}" onclick="showBookingPopup('${r.room_id}','${ds}')" title="${bk.guest_name || 'Booked'}">
            <div class="cal-date-num">${d}</div>
            <div class="cal-pill" style="background:${bg};border-radius:${borderRadius};">
              ${showAvatar ? `<span class="cal-avatar">${guestInitial}</span>` : ''}
              ${showName ? `<span class="cal-name">${firstName}</span>` : ''}
            </div>
          </div>`;
      } else {
        const rate = r.rent_per_night || 0;
        cellsHtml += `
          <div class="cal-day empty ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" onclick="calCreateBooking('${r.room_id}','${ds}')" title="Free — Click to book">
            <div class="cal-date-num">${d}</div>
            ${rate > 0 && !isPast ? `<div class="cal-rate">₹${(rate/1000).toFixed(1)}K</div>` : ''}
          </div>`;
      }
    }

    html += `
      <div class="card cal-room-card" style="padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <strong style="font-size:14px;">${r.unit_no}</strong>
            <span style="color:var(--muted);font-size:12px;margin-left:6px;">${r.nickname || r.property_name || ''}</span>
          </div>
          ${r.rent_per_night ? `<span style="font-size:11px;color:var(--muted);">Base: ₹${r.rent_per_night.toLocaleString('en-IN')}/night</span>` : ''}
        </div>
        <div class="cal-grid">${cellsHtml}</div>
      </div>`;
  });

  // ═══ LEGEND ═══
  html += `
    <div class="card" style="padding:12px;text-align:center;">
      <div style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:12px;">
        <span><span style="display:inline-block;width:14px;height:14px;background:#FF385C;border-radius:3px;vertical-align:middle;"></span> Airbnb</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#F59E0B;border-radius:3px;vertical-align:middle;"></span> Direct</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#fff;border:1px solid #ddd;border-radius:3px;vertical-align:middle;"></span> Free</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#FEE2E2;border-radius:3px;vertical-align:middle;"></span> Today</span>
      </div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));">
      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-label">📅 Next 7 Days (${upcoming7.length})</div>
        ${upcoming7.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:4px;padding:3px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">${x.check_in} · ${x.check_in_time || '2 PM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-label">🔄 Open Stays (${openStays.length})</div>
        ${openStays.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:4px;padding:3px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">Since ${x.check_in}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>
  `;

  // Inject CSS
  if (!document.getElementById('cal-airbnb-css')) {
    const css = document.createElement('style');
    css.id = 'cal-airbnb-css';
    css.textContent = `
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .cal-hdr {
        font-size: 10px;
        font-weight: 700;
        color: var(--muted);
        text-align: center;
        padding: 4px 0;
        text-transform: uppercase;
      }
      .cal-empty {
        min-height: 56px;
      }
      .cal-day {
        min-height: 56px;
        border: 1px solid #eee;
        border-radius: 6px;
        padding: 4px;
        cursor: pointer;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform 0.1s, box-shadow 0.1s;
      }
      .cal-day:hover {
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        transform: translateY(-1px);
        z-index: 2;
      }
      .cal-day.today {
        background: #FEE2E2 !important;
        border-color: #FF385C;
      }
      .cal-day.today .cal-date-num {
        color: #FF385C;
        font-weight: 800;
      }
      .cal-day.past {
        opacity: 0.5;
      }
      .cal-day.past .cal-rate {
        display: none;
      }
      .cal-day.empty {
        background: #fff;
      }
      .cal-day.booked {
        border: none;
        background: transparent;
        padding: 0;
      }
      .cal-date-num {
        font-size: 12px;
        font-weight: 600;
        color: #333;
        padding: 4px 4px 0;
      }
      .cal-rate {
        font-size: 10px;
        color: #888;
        text-align: center;
        padding-bottom: 4px;
      }
      .cal-pill {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 6px;
        margin: 2px 0;
        overflow: hidden;
      }
      .cal-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .cal-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 11px;
        color: #fff;
        text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        max-width: 100%;
        font-weight: 700;
      }
      .cal-pill { 
        overflow: hidden;
        min-width: 0;
      }
      .cal-day.booked {
        min-width: 0;
        overflow: hidden;
      }
      @media (max-width: 640px) {
        .cal-grid { gap: 1px; }
        .cal-day { min-height: 46px; }
        .cal-date-num { font-size: 10px; padding: 1px 2px 0; }
        .cal-rate { font-size: 8px; }
        .cal-pill { font-size: 9px; padding: 1px 2px; margin: 1px 0; }
        .cal-avatar { width: 14px; height: 14px; font-size: 8px; }
        .cal-name { font-size: 9px; font-weight: 700; }
        .cal-hdr { font-size: 9px; padding: 2px 0; }
      }
      .cal-room-card { overflow: hidden; }
      @media (max-width: 640px) {
        .cal-room-card { padding: 8px 6px !important; }
      }
    `;
    document.head.appendChild(css);
  }

  renderShell(html, 'reports');
  window._calM = mo;
  window._calY = yr;
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

function calCreateBooking(roomId, dateStr) {
  if (!confirm('Create new booking for this date?\n\nRoom: ' + roomId + '\nDate: ' + dateStr)) return;
  window._bookingPrefill = {
    roomId: roomId,
    sourceRoomId: roomId,
    checkIn: dateStr,
    bookingMode: 'Offline',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    checkoutConfirmed: 'yes',
    guests: 1
  };
  if (window.renderAddBooking) renderAddBooking();
}

// ============ BOOKING POPUP (Calendar Click) ============
async function showBookingPopup(roomId, dateStr) {
  const { data: bks } = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name)')
    .eq('room_id', roomId)
    .lte('check_in', dateStr)
    .gt('check_out', dateStr);

  const b = (bks || [])[0];
  if (!b) return;

  const { data: pays } = await sb.from('payment_history').select('amount, verification_status').eq('booking_id', b.booking_id).neq('verification_status', 'rejected');
  const paid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const bal = (b.total_amount || 0) - paid;
  const nights = b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : '-';
  const idPaths = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📅 Booking Details</h2>

      <div class="metric-row"><span class="metric-label">Guest</span><span class="metric-value" style="font-size:15px;">${b.guest_name || '-'}</span></div>
      <div class="metric-row"><span class="metric-label">Phone</span><span>${b.phone || '-'}</span></div>
      <div class="metric-row"><span class="metric-label">Property</span><span>${propLabel(b.rooms) || ''}</span></div>
      <div class="metric-row"><span class="metric-label">Mode</span>
        <span class="badge ${b.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${b.booking_mode === 'Online-Airbnb' ? 'Online' : 'Offline'}</span>
      </div>
      <div class="metric-row"><span class="metric-label">Check-in</span><span>${b.check_in || '-'} ${b.check_in_time || ''}</span></div>
      <div class="metric-row"><span class="metric-label">Check-out</span><span>${b.check_out || '-'} ${b.check_out_time || ''}</span></div>
      <div class="metric-row"><span class="metric-label">Nights</span><span class="metric-value">${nights}</span></div>
      <div class="metric-row"><span class="metric-label">Rate/Day</span><span>${b.per_day_rate ? '₹' + b.per_day_rate : '-'}</span></div>
      <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${paid.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal > 0 ? ' warn' : ''}">₹${bal.toLocaleString('en-IN')}</span></div>

      ${b.has_vehicle ? `<div class="metric-row"><span class="metric-label">Vehicle</span><span>${b.vehicle_name || '-'} · ${b.vehicle_number || '-'}</span></div>` : ''}

      ${idPaths.length ? `<div style="margin-top:10px;"><div class="section-title">ID Photos</div>
        <div class="btn-row">${idPaths.map((p, i) => `<button class="btn-sm outline" onclick="dlIdPhoto('${p}')">📥 Guest ${i + 1}</button>`).join('')}</div>
      </div>` : ''}

      ${b.notes ? `<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px;"><strong>Notes:</strong> ${b.notes}</div>` : ''}

      <div class="btn-row" style="margin-top:14px;">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove(); editBooking('${b.booking_id}');">✏️ Edit</button>
        <button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove(); showPaymentModal('${b.booking_id}');">💰 Pay</button>
        <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove(); shareBookingWhatsApp('${b.booking_id}');">📱 Share</button>
        <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove();">Close</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

// ============ FINANCIAL SUMMARY (unchanged) ============
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
    sb.from('guest_register').select('booking_id,check_in,total_amount,room_id,guest_name,booking_mode'),
    sb.from('expenses').select('amount,month'),
    sb.from('payment_history').select('booking_id,amount'),
  ]);

  let fg = (gs.data || []).filter(g => g.check_in >= s && g.check_in <= e);
  fg = fg.filter(g => g.guest_name && g.guest_name.toLowerCase().trim() !== 'pending');
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
      ${!isCA ? `<button class="secondary btn-sm" onclick="renderDashboard()">← Back</button>` : ''}
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
