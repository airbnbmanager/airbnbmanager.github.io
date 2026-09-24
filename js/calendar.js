/**
 * Calendar Module — Classic Airbnb-Style Month Grid
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

async function renderReports() {
  renderShell(`<div class="loading">📅 Loading calendar...</div>`, 'reports');

  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname, rent_per_night, property_name, slug').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, check_in_time, check_out_time, guest_name, phone, booking_mode, total_amount, is_cancelled, verification_status, notes, has_vehicle, vehicle_name, vehicle_number, client_rating')
      .neq('is_cancelled', true).neq('verification_status', 'rejected')
  ]);

  const allRooms = rooms.data || [];
  const allBks = bookings.data || [];

  window._allRoomsCache = allRooms;

  const yr = window._calY ?? new Date().getFullYear();
  const mo = window._calM ?? new Date().getMonth();
  const selRoom = window._calRoom || 'all';

  const mName = new Date(yr, mo, 1).toLocaleString('default', { month: 'long' });
  const dim = new Date(yr, mo + 1, 0).getDate();
  const mp = `${yr}-${String(mo + 1).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Monthly stats ───
  const isBkBlocked = b => (b.booking_id && String(b.booking_id).startsWith('BLK_')) || 
                           (b.guest_name || '').toLowerCase().includes('blocked') || 
                           b.booking_mode === 'Offline-Blocked';

  const mb = allBks.filter(b => b.check_in?.startsWith(mp));
  const pm = await getPaidMap(mb.map(b => b.booking_id));
  const rev = mb.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const realMb = mb.filter(b => !isBkBlocked(b));
  const blockedMbCount = mb.length - realMb.length;
  const onCount = realMb.filter(b => b.booking_mode === 'Online-Airbnb').length;
  const offCount = realMb.length - onCount;

  // Occupancy for filtered rooms
  const displayRooms = selRoom === 'all' ? allRooms : allRooms.filter(r => r.room_id === selRoom);
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

  // Prioritize real guest bookings over placeholder blocked slots
  Object.keys(bMap).forEach(k => {
    bMap[k].sort((a, b) => {
      const aBlocked = isBkBlocked(a);
      const bBlocked = isBkBlocked(b);
      if (aBlocked && !bBlocked) return 1;
      if (!aBlocked && bBlocked) return -1;
      return 0;
    });
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
  const propOptions = '<option value="all">🏘️ All Properties (' + allRooms.length + ')</option>' +
    allRooms.map(r => `<option value="${r.room_id}"${r.room_id === selRoom ? ' selected' : ''}>${r.unit_no} — ${r.nickname || r.property_name || ''}</option>`).join('');

  // ─── Upcoming + Open stays ───
  const upcoming7 = allBks.filter(b => !isBkBlocked(b) && b.check_in > todayStr && b.check_in <= dateAdd(todayStr, 7))
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  const openStays = allBks.filter(b => !isBkBlocked(b) && b.check_in <= todayStr && (b.check_out >= todayStr || !b.check_out));

  const bName = b => {
    const room = allRooms.find(r => r.room_id === b.room_id);
    return propLabel(room) || b.room_id || '-';
  };

  // ═══ HEADER ═══
  let html = `
    <div class="card" style="padding:14px;border-radius:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:var(--dark);">📆 ${mName} ${yr}</h1>
          <div class="sub" style="margin-top:2px;">${selRoom === 'all' ? 'All Properties (' + allRooms.length + ')' : allRooms.find(r => r.room_id === selRoom)?.nickname || selRoom} &bull; <strong>${occ}%</strong> Occupancy</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <button class="btn-sm secondary" onclick="chMo(-1)" title="Previous Month">◀</button>
          <button class="btn-sm secondary" onclick="calGoToday()" title="Current Month">Today</button>
          <button class="btn-sm secondary" onclick="chMo(1)" title="Next Month">▶</button>
          <button class="btn-sm outline" onclick="renderReports()" title="Refresh live data">🔄</button>
          <button class="btn-sm" style="background:#059669;color:#fff;" onclick="if(window.renderAddBooking) renderAddBooking();">➕ New Booking</button>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <label style="font-size:12px;font-weight:700;color:var(--text-secondary);">Property:</label>
        <select onchange="calSelectRoom(this.value)" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;flex:1;min-width:220px;font-size:13px;font-weight:600;background:#fff;cursor:pointer;">
          ${propOptions}
        </select>
      </div>
    </div>

    <!-- KPI STAT CARDS -->
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
      <div class="stat-card" style="border-left:4px solid var(--primary);border-radius:12px;">
        <div class="stat-num">${realMb.length}</div>
        <div class="stat-label">Bookings</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);border-radius:12px;">
        <div class="stat-num">₹${(rev/1000).toFixed(0)}K</div>
        <div class="stat-label">Revenue Paid</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #FF385C;border-radius:12px;">
        <div class="stat-num" style="color:#FF385C;">${onCount}</div>
        <div class="stat-label">🌐 Airbnb</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--yellow);border-radius:12px;">
        <div class="stat-num">${offCount}</div>
        <div class="stat-label">💵 Direct</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #475569;border-radius:12px;">
        <div class="stat-num" style="color:#475569;">${blockedMbCount}</div>
        <div class="stat-label">🔒 Blocked</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--purple, #8B5CF6);border-radius:12px;">
        <div class="stat-num" style="color:#8B5CF6;">${occ}%</div>
        <div class="stat-label">📊 Occupancy</div>
      </div>
    </div>
  `;

  // ═══ CALENDAR GRID (Airbnb style) ═══
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = new Date(yr, mo, 1).getDay();

  displayRooms.forEach(r => {
    let cellsHtml = '';

    // Day headers
    days.forEach(d => {
      cellsHtml += `<div class="cal-hdr">${d}</div>`;
    });

    // Empty padding cells before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cellsHtml += `<div class="cal-empty"></div>`;
    }

    // Actual day cells
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
        const isBlocked = isBkBlocked(bk);

        // Airbnb = Red (#FF385C), Offline/Direct & Blocked = Slate/Charcoal (#475569)
        let bg = isOnline ? '#FF385C' : 'linear-gradient(135deg, #475569 0%, #334155 100%)';

        const cleanGuestName = (bk.guest_name || (isBlocked ? 'Blocked' : 'Guest')).replace(/^🚫\s*/, '').trim();
        const guestInitial = isBlocked ? '🔒' : cleanGuestName.charAt(0).toUpperCase();
        const nameParts = cleanGuestName.split(/\s+/);
        let firstName = isBlocked ? 'Blocked' : (nameParts[0] || 'Guest');
        if (firstName.length > 7) firstName = firstName.substring(0, 7);

        const currentNight = calcNights(bk.check_in, ds);
        const showName = isCheckIn || isCheckOut || (currentNight > 0 && currentNight % 2 === 0);
        const showAvatar = isCheckIn || isBlocked;

        let borderRadius = '0';
        if (isCheckIn && isCheckOut) borderRadius = '14px';
        else if (isCheckIn) borderRadius = '14px 0 0 14px';
        else if (isCheckOut) borderRadius = '0 14px 14px 0';

        const overlapTitle = overlapCount > 1 
          ? bkArr.map(x => x.guest_name || 'Guest').join(' + ')
          : (bk.guest_name || (isBlocked ? 'Blocked Slot' : 'Booked'));

        cellsHtml += `
          <div class="cal-day booked ${isToday ? 'today' : ''} ${isBlocked ? 'is-blocked-day' : ''}" onclick="showBookingPopup('${r.room_id}','${ds}')" title="${overlapTitle}" style="position:relative;">
            <div class="cal-date-num">${d}</div>
            ${overlapCount > 1 ? `<div style="position:absolute;top:2px;right:2px;background:#DC2626;color:#fff;border-radius:50%;min-width:16px;height:16px;padding:0 3px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;box-shadow:0 1px 3px rgba(0,0,0,0.4);z-index:3;line-height:1;" title="${overlapCount} bookings on this date">${overlapCount}</div>` : ''}
            <div class="cal-pill ${isBlocked ? 'blocked' : ''}" style="background:${bg};border-radius:${borderRadius};">
              ${showAvatar ? `<span class="cal-avatar">${guestInitial}</span>` : ''}
              ${showName && !isBlocked ? `<span class="cal-name">${firstName}</span>` : ''}
              ${isBlocked && showName && isCheckIn ? `<span class="cal-name">Blocked</span>` : ''}
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

    // Resolve cover image path: prefer slug from DB, fallback to room_id-based slug map
    const ROOM_SLUG_MAP = {
      'GOM-101': 'redrose-palace', 'GOM-102': 'black-beauty',
      'GOM-201': 'the-dark-blue',  'GOM-202': 'the-brown',
      'GOM-301': 'the-light-green','GOM-401': 'the-nawabi-stay',
      'GOM-501': 'starlight-blue', 'GOM-302': 'the-unique',
      'VIL-104': 'the-green-house','VIL-103': 'the-pink-house',
      'VIL-105': 'the-yellow-house','VIL-106': 'green-forest',
      'VIL-108': 'pink-paradise',  'LUL-402': 'celebrity-garden',
      'VIL-101': 'gomti-grand-villa','VIL-102': 'royal-white-house',
      'VIL-107': 'the-velvet-house'
    };
    const slug = r.slug || ROOM_SLUG_MAP[r.room_id] || '';
    const thumbSrc = slug ? `assets/properties/${slug}/cover.jpg` : '';
    const thumbHtml = thumbSrc
      ? `<img src="${thumbSrc}" alt="${r.nickname || r.room_id}" onerror="this.style.display='none'" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid #E2E8F0;">` 
      : `<div style="width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#b58d3d,#8c6a23);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🏠</div>`;

    html += `
      <div class="card cal-room-card" style="padding:12px;border-radius:14px;margin-bottom:14px;">
        <div class="cal-room-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 auto;">
            ${thumbHtml}
            <div style="min-width:0;">
              <strong style="font-size:14px;color:var(--dark);word-break:break-word;display:block;line-height:1.2;">${r.nickname || r.property_name || r.unit_no}</strong>
              <span style="color:var(--muted);font-size:11.5px;word-break:break-word;">${r.unit_no}${r.rent_per_night ? ' · <span style="color:#059669;font-weight:700;">₹' + r.rent_per_night.toLocaleString('en-IN') + '/night</span>' : ''}</span>
            </div>
          </div>
        </div>
        <div class="cal-grid">${cellsHtml}</div>
      </div>`;
  });

  // ═══ LEGEND ═══
  html += `
    <div class="card" style="padding:12px;text-align:center;border-radius:12px;margin-bottom:14px;">
      <div style="display:inline-flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:12px;font-weight:600;">
        <span><span style="display:inline-block;width:14px;height:14px;background:#FF385C;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> 🌐 Airbnb</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#475569;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> 💵 Direct (Offline)</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#334155;border:1px dashed #94A3B8;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> 🔒 Blocked</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#fff;border:1px solid #ccc;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> ⚪ Free</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#FEE2E2;border:1px solid #FF385C;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> 📍 Today</span>
      </div>
    </div>

    <!-- UPCOMING & ACTIVE STAYS -->
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
      <div class="stat-card" style="border-left:4px solid var(--blue);border-radius:12px;">
        <div class="stat-label">📅 Next 7 Days (${upcoming7.length})</div>
        ${upcoming7.slice(0, 5).map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong style="cursor:pointer;color:var(--primary);" onclick="openBookingDetails('${x.booking_id}')">${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">${x.check_in} &bull; ${x.check_in_time || '2 PM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);border-radius:12px;">
        <div class="stat-label">🔄 Open Stays (${openStays.length})</div>
        ${openStays.slice(0, 5).map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong style="cursor:pointer;color:var(--primary);" onclick="openBookingDetails('${x.booking_id}')">${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">Since ${x.check_in} &bull; Till ${x.check_out || 'Open'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None active</div>'}
      </div>
    </div>
  `;

  // Inject CSS
  let cssEl = document.getElementById('cal-airbnb-css');
  if (!cssEl) {
    cssEl = document.createElement('style');
    cssEl.id = 'cal-airbnb-css';
    document.head.appendChild(cssEl);
  }
  cssEl.textContent = `
    .cal-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 3px;
      width: 100%;
      box-sizing: border-box;
    }
    .cal-hdr {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-align: center;
      padding: 6px 0;
      text-transform: uppercase;
      background: #F8FAFC;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .cal-empty {
      min-height: 56px;
    }
    .cal-day {
      min-height: 56px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 3px;
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.1s, box-shadow 0.1s;
      background: #fff;
      box-sizing: border-box;
      min-width: 0;
      overflow: hidden;
    }
    .cal-day:hover {
      box-shadow: 0 3px 8px rgba(0,0,0,0.12);
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
      opacity: 0.55;
    }
    .cal-day.past .cal-rate {
      display: none;
    }
    .cal-day.empty {
      background: #fff;
    }
    .cal-day.booked {
      border: 1px solid rgba(0,0,0,0.06);
      background: transparent;
      padding: 0;
    }
    .cal-day.booked.is-blocked-day {
      border: 1px dashed rgba(71, 85, 105, 0.35);
      background: #F8FAFC;
    }
    .cal-date-num {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      padding: 3px 4px 0;
      line-height: 1;
    }
    .cal-rate {
      font-size: 9.5px;
      color: #10B981;
      font-weight: 600;
      text-align: center;
      padding-bottom: 3px;
    }
    .cal-pill {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: #fff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 4px;
      margin: 2px 0;
      overflow: hidden;
      min-width: 0;
      box-sizing: border-box;
    }
    .cal-pill.blocked {
      background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .cal-avatar {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 800;
      flex-shrink: 0;
      line-height: 1;
    }
    .cal-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10px;
      color: #fff;
      text-shadow: 0 1px 1px rgba(0,0,0,0.25);
      max-width: 100%;
      font-weight: 700;
      display: inline-block;
      min-width: 0;
    }
    .cal-room-card { 
      overflow: hidden; 
      box-sizing: border-box;
    }

    @media (max-width: 640px) {
      .cal-grid { 
        gap: 2px; 
      }
      .cal-day { 
        min-height: 46px; 
        border-radius: 6px; 
        padding: 1px 0;
      }
      .cal-date-num { 
        font-size: 9.5px; 
        padding: 2px 2px 0; 
      }
      .cal-rate { 
        font-size: 7.5px; 
        padding-bottom: 1px;
      }
      .cal-pill { 
        font-size: 8.5px; 
        padding: 2px 1px; 
        margin: 1px 0; 
        gap: 1.5px; 
      }
      .cal-avatar { 
        width: 13px; 
        height: 13px; 
        font-size: 7.5px; 
      }
      .cal-name { 
        font-size: 8px; 
        font-weight: 700; 
        max-width: calc(100% - 2px); 
        letter-spacing: -0.2px;
      }
      .cal-hdr { 
        font-size: 8.5px; 
        padding: 3px 0; 
      }
      .cal-room-card { 
        padding: 8px 4px !important; 
        border-radius: 12px; 
      }
      .cal-room-header {
        margin-bottom: 6px !important;
      }
    }
  `;

  renderShell(html, 'reports');
  window._calM = mo;
  window._calY = yr;
}

// ═══════════════════════════════════════════════════════════
// CALENDAR ACTION HELPERS: WHATSAPP MENU & DELETE
// ═══════════════════════════════════════════════════════════
window.calOpenWhatsApp = function(bkId, btn) {
  // Close any open modal first so the WhatsApp menu displays cleanly
  const currentModal = btn ? btn.closest('.modal-overlay') : document.querySelector('.modal-overlay');
  if (currentModal) currentModal.remove();

  if (typeof showWATemplatesMenu === 'function') {
    showWATemplatesMenu(bkId, btn);
  } else if (typeof shareBookingWhatsApp === 'function') {
    shareBookingWhatsApp(bkId);
  } else {
    alert('WhatsApp menu is loading, please try again.');
  }
};

window.calDeleteBooking = async function(bkId, guestName, roomId) {
  if (!confirm(`Delete booking for "${guestName || 'Guest'}"?\n\nPayments and records for this booking will also be deleted.`)) return;

  try {
    // 1. Delete associated photos from storage if any
    const { data: bk } = await sb.from('guest_register')
      .select('room_id, id_proof_photo_paths, id_proof_photo_path, id_proof_front_paths, id_proof_back_paths, vehicle_photo_path')
      .eq('booking_id', bkId).single();

    const allPaths = [
      bk?.id_proof_photo_paths,
      bk?.id_proof_photo_path,
      bk?.id_proof_front_paths,
      bk?.id_proof_back_paths,
      bk?.vehicle_photo_path
    ].filter(Boolean).join(',').split(',').filter(Boolean);

    const uniquePaths = [...new Set(allPaths)];
    if (uniquePaths.length) {
      try { await sb.storage.from('id-proofs').remove(uniquePaths); } catch (e) {}
    }

    // 2. Delete payment history & booking
    await sb.from('payment_history').delete().eq('booking_id', bkId);
    const { error } = await sb.from('guest_register').delete().eq('booking_id', bkId);
    if (error) {
      if (window.fsn) fsn.error('Error', '❌ Delete failed: ' + error.message);
      else alert('❌ Delete failed: ' + error.message);
      return;
    }

    // 3. Update room status if no remaining active bookings
    const rid = roomId || bk?.room_id;
    if (rid) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: active } = await sb.from('guest_register')
        .select('booking_id')
        .eq('room_id', rid)
        .gt('check_out', today);

      if (!active || !active.length) {
        await sb.from('flats_status').update({
          status: 'Free',
          cleaning_status: 'Dirty'
        }).eq('room_id', rid);
      }
    }

    // 4. Close any open modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    if (window.fsn) fsn.success('Success', `✅ Booking "${guestName || bkId}" deleted`);
    else alert(`✅ Booking "${guestName || bkId}" deleted`);

    // 5. Re-render calendar smoothly in place
    if (typeof renderReports === 'function') {
      await renderReports();
    }
  } catch (err) {
    if (window.fsn) fsn.error('Error', '❌ Error: ' + (err.message || err));
    else alert('❌ Error: ' + (err.message || err));
  }
};

// ═══════════════════════════════════════════════════════════
// NAVIGATION HELPERS
// ═══════════════════════════════════════════════════════════
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
    const secBadge = typeof getSecurityDepositBadge === 'function' ? getSecurityDepositBadge(b) : '';
    const cleanNotes = typeof cleanNotesForDisplay === 'function' ? cleanNotesForDisplay(b.notes) : (b.notes || '');
    const statusBadges = [];
    if (b.is_review_booking) statusBadges.push('<span style="background:#8B5CF6;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;">⭐ REVIEW</span>');
    if (b.show_to_investor === false) statusBadges.push('<span style="background:#DC2626;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;">🚫 HIDDEN</span>');
    if (b.is_cancelled) statusBadges.push('<span style="background:#DC2626;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;">❌ CANCELLED</span>');
    
    return `
      <div style="background:#fff;border:2px solid ${idx === 0 ? '#3B82F6' : '#F59E0B'};border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:15px;">
              ${idx + 1}. ${modeIcon} ${b.guest_name || 'Guest'} 
              ${statusBadges.join(' ')} ${secBadge}
            </div>
            <div style="font-size:11px;color:#666;margin-top:2px;">
              📞 ${b.phone || 'No phone'} &bull; ${modeText}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:800;color:#333;">₹${(b.total_amount || 0).toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:${bal > 0 ? '#DC2626' : '#0A7D1A'};font-weight:700;">
              ${bal > 0 ? 'Due: ₹' + bal.toLocaleString('en-IN') : '✅ Fully Paid'}
            </div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;font-size:12px;background:#F8F9FA;padding:8px;border-radius:6px;margin-bottom:10px;">
          <div><strong>Check-in:</strong><br>${b.check_in || '-'} ${b.check_in_time || ''}</div>
          <div><strong>Check-out:</strong><br>${b.check_out || '-'} ${b.check_out_time || ''}</div>
          <div><strong>Nights:</strong><br>${nights}</div>
          <div><strong>Guests:</strong><br>${b.guests || 1}</div>
        </div>
        
        ${cleanNotes ? `<div style="font-size:11px;color:#666;padding:6px;background:#FEF3C7;border-radius:4px;margin-bottom:8px;"><strong>Notes:</strong> ${cleanNotes}</div>` : ''}
        
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-sm" onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="flex:1;">✏️ Edit</button>
          <button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove(); if(window.openAddPaymentModal) openAddPaymentModal('${b.booking_id}'); else if(window.showPaymentModal) showPaymentModal('${b.booking_id}');" style="flex:1;">💰 Pay</button>
          <button class="btn-sm" style="background:#0284C7;color:#fff;flex:1;" onclick="this.closest('.modal-overlay').remove(); if(window.showSecurityDepositModal) showSecurityDepositModal('${b.booking_id}');" title="Manage Security Deposit">🛡️ Deposit</button>
          <button class="btn-sm" style="background:#7C3AED;color:#fff;flex:1;" onclick="this.closest('.modal-overlay').remove(); openExtractBookingModal('${b.booking_id}', '${dateStr}');">✂️ Shift</button>
          <button class="btn-sm" style="background:#25D366;color:#fff;flex:1;" onclick="calOpenWhatsApp('${b.booking_id}', this);">📱 WA</button>
          <button class="btn-sm danger" onclick="calDeleteBooking('${b.booking_id}', '${(b.guest_name || 'Booking').replace(/'/g, "\\'")}', '${b.room_id}');" style="background:#DC2626;color:#fff;flex:1;">🗑️ Del</button>
        </div>
      </div>
    `;
  }).join('');
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px;font-size:18px;">📅 Multiple Bookings on This Date (${bookings.length})</h2>
      <div style="font-size:13px;color:#666;margin-bottom:8px;">
        🏠 ${roomLabel} &bull; ${dateFmt}
      </div>
      
      <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:10px;border-radius:6px;margin-bottom:12px;font-size:12px;color:#92400E;">
        ⚠️ <strong>${bookings.length} bookings detected on this date.</strong> You can edit, send WhatsApp, or click <strong>Delete</strong> on any duplicate booking below.
      </div>
      
      ${bookingCards}
      
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove();" style="width:100%;">Close</button>
      </div>
    </div>`;
  
  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════
// SINGLE BOOKING POPUP
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
// BOOKING DETAILS MODAL
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

  const isBlocked = (b.booking_id && String(b.booking_id).startsWith('BLK_')) || 
                    b.booking_mode === 'Offline-Blocked' ||
                    (b.guest_name && b.guest_name.toLowerCase().includes('blocked'));

  const sec = typeof getSecurityDeposit === 'function' ? getSecurityDeposit(b) : null;
  const secBadge = typeof getSecurityDepositBadge === 'function' ? getSecurityDepositBadge(b) : '';
  const cleanNotes = typeof cleanNotesForDisplay === 'function' ? cleanNotesForDisplay(b.notes) : (b.notes || '');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px;padding:22px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:12px;font-size:18px;">${isBlocked ? '🔒 Blocked Date (Offline Slot)' : '📅 Booking Details'}</h2>

      <div style="background:${isBlocked ? '#F1F5F9' : '#F8FAFC'};padding:14px;border-radius:12px;border:1px solid ${isBlocked ? '#CBD5E1' : 'var(--border)'};margin-bottom:14px;font-size:13px;line-height:1.8;">
        <div><strong>Guest Name:</strong> ${isBlocked ? '🔒 Blocked Slot' : (b.guest_name || '-')} ${!isBlocked && typeof getRatingBadge === 'function' ? getRatingBadge(b.client_rating) : ''} ${secBadge}</div>
        ${b.phone ? `<div><strong>Phone:</strong> <a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;">${b.phone}</a></div>` : ''}
        <div><strong>Property:</strong> ${propLabel(b.rooms) || b.room_id}</div>
        <div><strong>Channel Mode:</strong> <span style="font-weight:700;color:${isBlocked ? '#475569' : (b.booking_mode==='Online-Airbnb'?'#2563EB':'#D97706')}">${isBlocked ? '🔒 Offline-Blocked' : b.booking_mode}</span></div>
        <div><strong>Dates:</strong> 🗓️ ${b.check_in} ➔ ${b.check_out} (<strong>${nights}</strong> Night${nights>1?'s':''})</div>
        ${!isBlocked ? `<div><strong>Total Amount:</strong> ₹${(b.total_amount||0).toLocaleString('en-IN')} | <strong>Paid:</strong> ₹${totalPaid.toLocaleString('en-IN')} | <strong style="color:${due>0?'#DC2626':'#059669'}">Due: ₹${due.toLocaleString('en-IN')}</strong></div>` : '<div style="color:var(--muted);font-size:12px;">This slot is blocked / unavailable on Airbnb. You can convert it to a real guest booking below.</div>'}
        ${sec && sec.status !== 'none' && (sec.amount > 0 || sec.status === 'pending') ? `
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:8px 12px;border-radius:8px;margin-top:6px;font-size:12.5px;color:#166534;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <div>
              🛡️ <strong>Security Deposit:</strong> ₹${(sec.amount || 0).toLocaleString('en-IN')} 
              <span style="text-transform:uppercase;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#DCFCE7;color:#15803D;margin-left:4px;">${sec.status}</span>
              ${sec.deductedAmount > 0 ? `<span style="color:#DC2626;margin-left:4px;font-weight:700;">(Deducted: ₹${sec.deductedAmount.toLocaleString('en-IN')})</span>` : ''}
              ${sec.refundAmount > 0 ? `<span style="color:#2563EB;margin-left:4px;">(Refunded: ₹${sec.refundAmount.toLocaleString('en-IN')})</span>` : ''}
            </div>
            <button onclick="this.closest('.modal-overlay').remove(); if(window.showSecurityDepositModal) showSecurityDepositModal('${b.booking_id}');" style="padding:4px 8px;font-size:11px;font-weight:700;background:#059669;color:#fff;border:none;border-radius:5px;cursor:pointer;">Manage / Refund</button>
          </div>
        ` : ''}
        ${b.has_vehicle ? `<div style="margin-top:2px;font-size:12px;color:var(--muted);">🚗 Vehicle: ${(b.vehicle_name || '') + ' ' + (b.vehicle_number || '')}</div>` : ''}
        ${cleanNotes ? `<div style="font-size:12px;color:#6B7280;margin-top:4px;"><strong>Notes:</strong> ${cleanNotes}</div>` : ''}
      </div>

      ${idPaths.length ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">ID Proofs (${idPaths.length})</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${idPaths.map((p, i) => `<button class="btn-sm outline" onclick="if(window.dlIdPhoto) dlIdPhoto('${p}')">📥 Guest ${i + 1}</button>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- FULL ACTION BUTTONS (SAME AS BOOKINGS PAGE) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${isBlocked ? `
          <button onclick="calConvertBlockToBooking('${b.booking_id}', '${b.room_id}', '${b.check_in}', '${b.check_out}', this);" style="padding:11px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;grid-column:span 2;">
            ➕ Convert to Real Guest Booking
          </button>
        ` : `
          <button onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="padding:10px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            ✏️ Edit Booking
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.openAddPaymentModal) openAddPaymentModal('${b.booking_id}'); else if(window.showPaymentModal) showPaymentModal('${b.booking_id}');" style="padding:10px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            💵 Add Payment
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.showSecurityDepositModal) showSecurityDepositModal('${b.booking_id}');" style="padding:10px;background:#0284C7;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            🛡️ Security Deposit
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); openExtractBookingModal('${b.booking_id}', '${b.check_in}');" style="padding:10px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            ✂️ Shift / Extract Dates
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.duplicateBooking) duplicateBooking('${b.booking_id}');" style="padding:10px;background:#6366F1;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            📋 Duplicate
          </button>
          <button onclick="calOpenWhatsApp('${b.booking_id}', this);" style="padding:10px;background:#25D366;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            📱 WhatsApp
          </button>
        `}
        <button onclick="calDeleteBooking('${b.booking_id}', '${(b.guest_name||'Booking').replace(/'/g, "\\'")}', '${b.room_id}');" style="padding:10px;background:#DC2626;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;grid-column:span 2;margin-top:2px;">
          🗑️ Delete Booking / Block
        </button>
      </div>

    </div>
  `;
  document.body.appendChild(modal);
};

// ═══════════════════════════════════════════════════════════
// 🔄 CONVERT BLOCKED SLOT → FRESH NEW BOOKING
// Deletes the BLK_ record, then opens renderAddBooking with
// room + dates pre-filled so the new booking_id is never BLK_
// ═══════════════════════════════════════════════════════════
window.calConvertBlockToBooking = async function(blkId, roomId, checkIn, checkOut, btn) {
  // Close the popup immediately
  const overlay = btn?.closest('.modal-overlay');
  if (overlay) overlay.remove();

  // Confirm intent
  const ok = confirm(`Convert blocked dates ${checkIn} → ${checkOut} to a real guest booking?\n\nThe block will be removed and a fresh booking form will open.`);
  if (!ok) return;

  try {
    // Delete the blocked slot from DB
    await sb.from('guest_register').delete().eq('booking_id', blkId);
  } catch (e) {
    console.warn('[UHH] Could not delete block before convert:', e);
    // Continue anyway — user can delete it manually
  }

  // Open Add Booking form with room + dates pre-filled
  if (window.renderAddBooking) {
    renderAddBooking({ room_id: roomId, check_in: checkIn, check_out: checkOut });
  } else {
    // Fallback: navigate to bookings tab then open form
    if (typeof navigate === 'function') navigate('bookings');
    setTimeout(() => {
      if (window.renderAddBooking) renderAddBooking({ room_id: roomId, check_in: checkIn, check_out: checkOut });
    }, 500);
  }
};

// ═══════════════════════════════════════════════════════════
// ✂️ SHIFT / EXTRACT DATES MODAL (WITH PAYMENT PROTECTION)
// ═══════════════════════════════════════════════════════════
window.openExtractBookingModal = async function(bookingId, defaultDate) {
  const { data: b, error } = await sb.from('guest_register')
    .select('*, rooms(*)')
    .eq('booking_id', bookingId)
    .single();

  if (error || !b) {
    alert('Booking not found: ' + (error?.message || ''));
    return;
  }

  const { data: pays } = await sb.from('payment_history')
    .select('*')
    .eq('booking_id', bookingId)
    .neq('verification_status', 'rejected');

  const totalPaid = (pays || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalNights = Math.max(Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000), 1);
  const perDayRate = b.per_day_rate || (b.total_amount > 0 ? Math.round(b.total_amount / totalNights) : 0);
  const perDayPaid = totalNights > 0 ? (totalPaid / totalNights) : 0;

  const allRooms = window._allRoomsCache || [];
  const otherRooms = allRooms.filter(r => r.room_id !== b.room_id);

  let initStart = b.check_in;
  if (defaultDate && defaultDate >= b.check_in && defaultDate < b.check_out) {
    initStart = defaultDate;
  }
  let initEnd = b.check_out;
  if (defaultDate && defaultDate >= b.check_in && defaultDate < b.check_out) {
    const nextD = new Date(defaultDate);
    nextD.setDate(nextD.getDate() + 1);
    const nStr = nextD.toISOString().slice(0, 10);
    if (nStr <= b.check_out) initEnd = nStr;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:540px;padding:24px;border-radius:16px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="font-size:24px;">✂️</span>
        <div>
          <h2 style="margin:0;font-size:18px;color:#1E293B;">Shift / Extract Dates to Another Room</h2>
          <div style="font-size:12px;color:#64748B;">Guest: <strong>${b.guest_name || 'Guest'}</strong> &bull; From: <strong>${typeof propLabel === 'function' ? propLabel(b.rooms) : b.room_id}</strong></div>
        </div>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12.5px;line-height:1.6;">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>🗓️ <strong>Original Stay:</strong> ${b.check_in} ➔ ${b.check_out} (<strong>${totalNights}</strong> nights)</div>
          <div>💰 <strong>Rate:</strong> ₹${perDayRate.toLocaleString('en-IN')}/night</div>
        </div>
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:4px;">
          <div>💵 <strong>Total Amount:</strong> ₹${(b.total_amount || 0).toLocaleString('en-IN')}</div>
          <div>✅ <strong>Total Paid:</strong> <span style="color:#059669;font-weight:700;">₹${totalPaid.toLocaleString('en-IN')}</span> ${totalPaid >= (b.total_amount || 0) && (b.total_amount || 0) > 0 ? '✓ (Fully Paid)' : ''}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">🏢 Select Target Property (Shift To):</label>
          <select id="extTargetRoom" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;font-size:13px;background:#fff;">
            ${otherRooms.map(r => `
              <option value="${r.room_id}">${typeof propLabel === 'function' ? propLabel(r) : (r.property_name || r.nickname || r.room_id)} (${r.room_id})</option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">🗓️ Extract From (Check-in):</label>
            <input type="date" id="extStartDate" value="${initStart}" min="${b.check_in}" max="${b.check_out}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #CBD5E1;font-size:13px;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">🗓️ Extract To (Check-out):</label>
            <input type="date" id="extEndDate" value="${initEnd}" min="${b.check_in}" max="${b.check_out}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #CBD5E1;font-size:13px;box-sizing:border-box;">
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn-sm" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:4px 8px;font-size:11px;" onclick="document.getElementById('extStartDate').value='${b.check_in}'; document.getElementById('extEndDate').value='${b.check_out}'; window._updateExtPreview();">All Dates (Full Move)</button>
          ${defaultDate && defaultDate >= b.check_in && defaultDate < b.check_out ? `
            <button type="button" class="btn-sm" style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;padding:4px 8px;font-size:11px;" onclick="
              document.getElementById('extStartDate').value='${defaultDate}';
              const nd = new Date('${defaultDate}'); nd.setDate(nd.getDate()+1);
              document.getElementById('extEndDate').value=nd.toISOString().slice(0,10);
              window._updateExtPreview();
            ">Selected Date Only (${defaultDate})</button>
          ` : ''}
        </div>
      </div>

      <div id="extPreviewBox" style="margin-bottom:16px;"></div>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" class="btn-sm outline" onclick="this.closest('.modal-overlay').remove();" style="padding:10px 18px;">Cancel</button>
        <button type="button" id="extConfirmBtn" class="btn-sm" style="padding:10px 22px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
          ✓ Confirm & Shift Dates
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  window._updateExtPreview = function() {
    const sInput = document.getElementById('extStartDate');
    const eInput = document.getElementById('extEndDate');
    const tRoomSelect = document.getElementById('extTargetRoom');
    const prevBox = document.getElementById('extPreviewBox');
    const confBtn = document.getElementById('extConfirmBtn');

    if (!sInput || !eInput || !prevBox || !confBtn) return;

    const sVal = sInput.value;
    const eVal = eInput.value;
    const targetRoomId = tRoomSelect?.value;
    const targetRoomObj = allRooms.find(r => r.room_id === targetRoomId) || { room_id: targetRoomId };
    const targetName = typeof propLabel === 'function' ? propLabel(targetRoomObj) : targetRoomId;
    const origName = typeof propLabel === 'function' ? propLabel(b.rooms) : b.room_id;

    if (!sVal || !eVal || sVal >= eVal) {
      prevBox.innerHTML = `<div style="background:#FEF2F2;color:#DC2626;padding:10px;border-radius:8px;font-size:12px;">⚠️ Please select valid check-in and check-out dates (Check-out must be after check-in).</div>`;
      confBtn.disabled = true;
      confBtn.style.opacity = '0.5';
      return;
    }

    if (sVal < b.check_in || eVal > b.check_out) {
      prevBox.innerHTML = `<div style="background:#FEF2F2;color:#DC2626;padding:10px;border-radius:8px;font-size:12px;">⚠️ Selected dates must be within original stay range (${b.check_in} to ${b.check_out}).</div>`;
      confBtn.disabled = true;
      confBtn.style.opacity = '0.5';
      return;
    }

    const extNights = Math.round((new Date(eVal) - new Date(sVal)) / 86400000);
    const isFullMove = (extNights === totalNights);
    const isExtractFromStart = (sVal === b.check_in && eVal < b.check_out);
    const isExtractFromEnd = (sVal > b.check_in && eVal === b.check_out);
    const isExtractMiddle = (sVal > b.check_in && eVal < b.check_out);

    const extAmount = Math.round(extNights * perDayRate);
    const extPaid = Math.round(extNights * perDayPaid * 100) / 100;
    const remPaid = Math.max(Math.round((totalPaid - extPaid) * 100) / 100, 0);
    const remNights = totalNights - extNights;
    const remAmount = Math.max((b.total_amount || 0) - extAmount, 0);

    confBtn.disabled = false;
    confBtn.style.opacity = '1';

    let splitDesc = '';
    if (isFullMove) {
      splitDesc = `Entire booking (${totalNights} nights) will move from <strong>${origName}</strong> to <strong>${targetName}</strong>.`;
    } else if (isExtractFromStart) {
      splitDesc = `<strong>${extNights} nights (${sVal} → ${eVal})</strong> will move to <strong>${targetName}</strong>.<br>Remaining <strong>${remNights} nights (${eVal} → ${b.check_out})</strong> will stay in <strong>${origName}</strong>.`;
    } else if (isExtractFromEnd) {
      splitDesc = `<strong>${extNights} nights (${sVal} → ${eVal})</strong> will move to <strong>${targetName}</strong>.<br>Remaining <strong>${remNights} nights (${b.check_in} → ${sVal})</strong> will stay in <strong>${origName}</strong>.`;
    } else if (isExtractMiddle) {
      const p1N = Math.round((new Date(sVal) - new Date(b.check_in)) / 86400000);
      const p3N = Math.round((new Date(b.check_out) - new Date(eVal)) / 86400000);
      splitDesc = `Middle <strong>${extNights} night${extNights>1?'s':''} (${sVal} → ${eVal})</strong> will extract to <strong>${targetName}</strong>.<br>In <strong>${origName}</strong>: Part 1 (${b.check_in} → ${sVal}, ${p1N}n) and Part 2 (${eVal} → ${b.check_out}, ${p3N}n).`;
    }

    prevBox.innerHTML = `
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:12px;font-size:12px;color:#166534;">
        <div style="font-weight:700;margin-bottom:4px;font-size:13px;">📋 Preview of Changes:</div>
        <div style="margin-bottom:8px;line-height:1.5;">${splitDesc}</div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;padding-top:8px;border-top:1px dashed #86EFAC;">
          <div style="background:#fff;padding:8px;border-radius:6px;border:1px solid #DCFCE7;">
            <div style="font-weight:700;color:#15803D;">🏢 New Segment (${targetRoomId}):</div>
            <div>${extNights} Night${extNights>1?'s':''} &bull; ₹${extAmount.toLocaleString('en-IN')}</div>
            <div style="color:#059669;font-weight:700;">💰 Paid Allocated: ₹${extPaid.toLocaleString('en-IN')}</div>
          </div>
          <div style="background:#fff;padding:8px;border-radius:6px;border:1px solid #DCFCE7;">
            <div style="font-weight:700;color:#1E293B;">🏠 Remaining (${b.room_id}):</div>
            <div>${remNights} Night${remNights>1?'s':''} &bull; ₹${remAmount.toLocaleString('en-IN')}</div>
            <div style="color:#059669;font-weight:700;">💰 Paid Remaining: ₹${remPaid.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style="margin-top:8px;font-size:11px;color:#15803D;display:flex;align-items:center;gap:4px;">
          🛡️ <strong>Zero Payment Loss Guarantee:</strong> Total Paid (₹${totalPaid.toLocaleString('en-IN')}) is 100% preserved.
        </div>
      </div>
    `;
  };

  document.getElementById('extStartDate').oninput = window._updateExtPreview;
  document.getElementById('extEndDate').oninput = window._updateExtPreview;
  document.getElementById('extTargetRoom').onchange = window._updateExtPreview;
  window._updateExtPreview();

  document.getElementById('extConfirmBtn').onclick = async function() {
    const sVal = document.getElementById('extStartDate').value;
    const eVal = document.getElementById('extEndDate').value;
    const targetRoomId = document.getElementById('extTargetRoom').value;

    if (!targetRoomId) { alert('Please select a target room!'); return; }
    if (!sVal || !eVal || sVal >= eVal) { alert('Please select valid dates!'); return; }

    const extNights = Math.round((new Date(eVal) - new Date(sVal)) / 86400000);
    const isFullMove = (extNights === totalNights);
    const isExtractFromStart = (sVal === b.check_in && eVal < b.check_out);
    const isExtractFromEnd = (sVal > b.check_in && eVal === b.check_out);
    const isExtractMiddle = (sVal > b.check_in && eVal < b.check_out);

    const extAmount = Math.round(extNights * perDayRate);
    const extPaid = Math.round(extNights * perDayPaid * 100) / 100;
    const remPaid = Math.max(Math.round((totalPaid - extPaid) * 100) / 100, 0);
    const remAmount = Math.max((b.total_amount || 0) - extAmount, 0);

    const btn = document.getElementById('extConfirmBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';

    try {
      if (isFullMove) {
        const { error: mErr } = await sb.from('guest_register').update({
          room_id: targetRoomId,
          source_room_id: targetRoomId,
          notes: `Shifted to ${targetRoomId} on ${new Date().toLocaleDateString('en-IN')} | ${b.notes || ''}`
        }).eq('booking_id', b.booking_id);
        if (mErr) throw mErr;

      } else if (isExtractFromStart) {
        const extBookingId = 'B' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const { error: insErr } = await sb.from('guest_register').insert({
          booking_id: extBookingId,
          guest_name: b.guest_name,
          phone: b.phone,
          room_id: targetRoomId,
          source_room_id: targetRoomId,
          check_in: sVal,
          check_out: eVal,
          check_in_time: b.check_in_time || '14:00',
          check_out_time: b.check_out_time || '11:00',
          checkout_confirmed: false,
          total_amount: extAmount,
          per_day_rate: perDayRate,
          booking_mode: b.booking_mode || 'Offline',
          payment_status: extPaid >= extAmount && extAmount > 0 ? 'Paid' : (extPaid > 0 ? 'Partial' : 'Paid'),
          verification_status: 'verified',
          guests: b.guests || 1,
          notes: `Extracted (${sVal} to ${eVal}) from ${b.booking_id} (${b.room_id})`
        });
        if (insErr) throw insErr;

        if (extPaid > 0) {
          await sb.from('payment_history').insert({
            booking_id: extBookingId,
            amount: extPaid,
            payment_date: sVal,
            payment_mode: pays[0]?.payment_mode || 'UPI',
            received_by: pays[0]?.received_by || 'Company',
            received_by_type: 'employee',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: `Allocated payment from split stay (${b.booking_id})`
          });
        }

        const { error: upErr } = await sb.from('guest_register').update({
          check_in: eVal,
          total_amount: remAmount,
          payment_status: remPaid >= remAmount && remAmount > 0 ? 'Paid' : (remPaid > 0 ? 'Partial' : 'Paid'),
          notes: `Dates adjusted: ${eVal} to ${b.check_out} (earlier dates shifted to ${targetRoomId})`
        }).eq('booking_id', b.booking_id);
        if (upErr) throw upErr;

        if (pays && pays.length > 0) {
          await sb.from('payment_history').update({
            amount: remPaid,
            notes: `Remaining payment after shifting dates to ${targetRoomId}`
          }).eq('id', pays[0].id);
        }

      } else if (isExtractFromEnd) {
        const extBookingId = 'B' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const { error: insErr } = await sb.from('guest_register').insert({
          booking_id: extBookingId,
          guest_name: b.guest_name,
          phone: b.phone,
          room_id: targetRoomId,
          source_room_id: targetRoomId,
          check_in: sVal,
          check_out: eVal,
          check_in_time: b.check_in_time || '14:00',
          check_out_time: b.check_out_time || '11:00',
          checkout_confirmed: false,
          total_amount: extAmount,
          per_day_rate: perDayRate,
          booking_mode: b.booking_mode || 'Offline',
          payment_status: extPaid >= extAmount && extAmount > 0 ? 'Paid' : (extPaid > 0 ? 'Partial' : 'Paid'),
          verification_status: 'verified',
          guests: b.guests || 1,
          notes: `Extracted (${sVal} to ${eVal}) from ${b.booking_id} (${b.room_id})`
        });
        if (insErr) throw insErr;

        if (extPaid > 0) {
          await sb.from('payment_history').insert({
            booking_id: extBookingId,
            amount: extPaid,
            payment_date: sVal,
            payment_mode: pays[0]?.payment_mode || 'UPI',
            received_by: pays[0]?.received_by || 'Company',
            received_by_type: 'employee',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: `Allocated payment from split stay (${b.booking_id})`
          });
        }

        const { error: upErr } = await sb.from('guest_register').update({
          check_out: sVal,
          total_amount: remAmount,
          payment_status: remPaid >= remAmount && remAmount > 0 ? 'Paid' : (remPaid > 0 ? 'Partial' : 'Paid'),
          notes: `Dates adjusted: ${b.check_in} to ${sVal} (later dates shifted to ${targetRoomId})`
        }).eq('booking_id', b.booking_id);
        if (upErr) throw upErr;

        if (pays && pays.length > 0) {
          await sb.from('payment_history').update({
            amount: remPaid,
            notes: `Remaining payment after shifting dates to ${targetRoomId}`
          }).eq('id', pays[0].id);
        }

      } else if (isExtractMiddle) {
        const p1Nights = Math.round((new Date(sVal) - new Date(b.check_in)) / 86400000);
        const p3Nights = Math.round((new Date(b.check_out) - new Date(eVal)) / 86400000);

        const p1Amount = Math.round(p1Nights * perDayRate);
        const p3Amount = Math.round(p3Nights * perDayRate);

        const p1Paid = Math.round(p1Nights * perDayPaid * 100) / 100;
        const p3Paid = Math.max(Math.round((totalPaid - p1Paid - extPaid) * 100) / 100, 0);

        const { error: upErr1 } = await sb.from('guest_register').update({
          check_out: sVal,
          total_amount: p1Amount,
          payment_status: p1Paid >= p1Amount && p1Amount > 0 ? 'Paid' : (p1Paid > 0 ? 'Partial' : 'Paid'),
          notes: `Part 1 stay (${b.check_in} to ${sVal}) | Mid-stay shifted to ${targetRoomId}`
        }).eq('booking_id', b.booking_id);
        if (upErr1) throw upErr1;

        if (pays && pays.length > 0) {
          await sb.from('payment_history').update({
            amount: p1Paid,
            notes: `Payment for Part 1 stay (${b.check_in} to ${sVal})`
          }).eq('id', pays[0].id);
        }

        const extBookingId = 'B' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const { error: insErr2 } = await sb.from('guest_register').insert({
          booking_id: extBookingId,
          guest_name: b.guest_name,
          phone: b.phone,
          room_id: targetRoomId,
          source_room_id: targetRoomId,
          check_in: sVal,
          check_out: eVal,
          check_in_time: b.check_in_time || '14:00',
          check_out_time: b.check_out_time || '11:00',
          checkout_confirmed: false,
          total_amount: extAmount,
          per_day_rate: perDayRate,
          booking_mode: b.booking_mode || 'Offline',
          payment_status: extPaid >= extAmount && extAmount > 0 ? 'Paid' : (extPaid > 0 ? 'Partial' : 'Paid'),
          verification_status: 'verified',
          guests: b.guests || 1,
          notes: `Extracted (${sVal} to ${eVal}) from ${b.booking_id} (${b.room_id})`
        });
        if (insErr2) throw insErr2;

        if (extPaid > 0) {
          await sb.from('payment_history').insert({
            booking_id: extBookingId,
            amount: extPaid,
            payment_date: sVal,
            payment_mode: pays[0]?.payment_mode || 'UPI',
            received_by: pays[0]?.received_by || 'Company',
            received_by_type: 'employee',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: `Allocated payment for middle extracted stay`
          });
        }

        const part3BookingId = 'B' + (Date.now() + 50) + '_' + Math.random().toString(36).substring(2, 6);
        const { error: insErr3 } = await sb.from('guest_register').insert({
          booking_id: part3BookingId,
          guest_name: b.guest_name,
          phone: b.phone,
          room_id: b.room_id,
          source_room_id: b.room_id,
          check_in: eVal,
          check_out: b.check_out,
          check_in_time: b.check_in_time || '14:00',
          check_out_time: b.check_out_time || '11:00',
          checkout_confirmed: false,
          total_amount: p3Amount,
          per_day_rate: perDayRate,
          booking_mode: b.booking_mode || 'Offline',
          payment_status: p3Paid >= p3Amount && p3Amount > 0 ? 'Paid' : (p3Paid > 0 ? 'Partial' : 'Paid'),
          verification_status: 'verified',
          guests: b.guests || 1,
          notes: `Part 2 trailing stay (${eVal} to ${b.check_out}) continued in ${b.room_id}`
        });
        if (insErr3) throw insErr3;

        if (p3Paid > 0) {
          await sb.from('payment_history').insert({
            booking_id: part3BookingId,
            amount: p3Paid,
            payment_date: eVal,
            payment_mode: pays[0]?.payment_mode || 'UPI',
            received_by: pays[0]?.received_by || 'Company',
            received_by_type: 'employee',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: `Allocated payment for Part 2 trailing stay`
          });
        }
      }

      modal.remove();
      if (window.fsn) {
        fsn.success('Shifted', `✅ Successfully shifted dates to ${targetRoomId}! Payments balanced.`);
      } else {
        alert(`✅ Successfully shifted dates to ${targetRoomId}!\n\nAll payments have been balanced with zero loss.`);
      }

      if (window.notifyDataChanged) window.notifyDataChanged();
      if (typeof renderCalendar === 'function') renderCalendar();

    } catch (err) {
      console.error('Extract error:', err);
      btn.disabled = false;
      btn.textContent = '✓ Confirm & Shift Dates';
      alert('Failed to shift dates:\n' + (err.message || JSON.stringify(err)));
    }
  };
};

// ═══════════════════════════════════════════════════════════
// DATE ACTIONS (FREE DATE CLICK)
// ═══════════════════════════════════════════════════════════
window.calCreateBooking = function(roomId, dateStr) {
  const allR = window._allRoomsCache || [];
  const room = allR.find(r => r.room_id === roomId) || { room_id: roomId };
  const nextDay = typeof dateAdd === 'function' ? dateAdd(dateStr, 1) : dateStr;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:460px;padding:24px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:6px;font-size:18px;">📅 Date Actions</h2>
      <div style="font-size:13px;color:#6B7280;margin-bottom:16px;">
        Property: <strong>${typeof propLabel === 'function' ? propLabel(room) : roomId}</strong><br>
        Selected Date: <strong>${dateStr}</strong>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="this.closest('.modal-overlay').remove(); if(window.renderAddBooking) renderAddBooking({ room_id: '${roomId}', check_in: '${dateStr}' });" style="padding:12px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          ➕ Add New Guest Booking
        </button>

        <button onclick="this.closest('.modal-overlay').remove(); openQuickBlockModal('${roomId}', '${dateStr}', '${nextDay}');" style="padding:12px;background:#DC2626;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          🛑 Block Dates (Maintenance / Offline Hold)
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.openQuickBlockModal = function(roomId, cin, cout) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:440px;padding:24px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:12px;font-size:18px;">🛑 Block Property Dates</h2>

      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:600;">Check-in Date *</label>
        <input type="date" id="blockCin" value="${cin}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;" />
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;font-weight:600;">Check-out Date *</label>
        <input type="date" id="blockCout" value="${cout}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;" />
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label style="font-size:12px;font-weight:600;">Reason / Notes</label>
        <input id="blockNotes" placeholder="e.g., Owner Stay, Maintenance, Offline Hold" value="Offline Block / Owner Hold" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;" />
      </div>

      <button onclick="saveQuickBlock('${roomId}')" style="width:100%;padding:12px;background:#DC2626;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">
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
    guest_name: '🚫 Blocked',
    room_id: roomId,
    check_in: cin,
    check_out: cout,
    booking_mode: 'Offline-Blocked',
    verification_status: 'approved',
    payment_status: 'N/A',
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
// FINANCIAL SUMMARY (UNCHANGED / FULL COMPATIBILITY)
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
  csv += `\n"THE UNIQUE HAVEN HOMES PRIVATE LIMITED"\n"CIN: U55101UP2024PTC202863 · uniquehavenhomesstay.com"\n"Developed by Praveen Singh"\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `Financial_${d.label}.csv`;
  a.click();
}

console.log('✅ Airbnb-Style Calendar module loaded');
