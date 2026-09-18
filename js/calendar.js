/**
 * Calendar Module — Classic Airbnb-Style Month Grid
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

async function renderReports() {
  renderShell(`<div class="loading">📅 Loading calendar...</div>`, 'reports');

  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname, rent_per_night, property_name').order('unit_no'),
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

  // ─── Property selector ───
  const propOptions = '<option value="all">🏘️ All Properties (' + allRooms.length + ')</option>' +
    allRooms.map(r => `<option value="${r.room_id}"${r.room_id === selRoom ? ' selected' : ''}>${r.unit_no} — ${r.nickname || r.property_name || ''}</option>`).join('');

  // ─── Upcoming + Open stays ───
  const upcoming7 = allBks.filter(b => b.check_in > todayStr && b.check_in <= dateAdd(todayStr, 7))
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  const openStays = allBks.filter(b => b.check_in <= todayStr && (b.check_out >= todayStr || !b.check_out));

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
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
      <div class="stat-card" style="border-left:4px solid var(--primary);border-radius:12px;">
        <div class="stat-num">${mb.length}</div>
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
        const isBlocked = (bk.guest_name || '').toLowerCase().includes('blocked') || bk.booking_mode === 'Offline-Blocked';

        let bg = isOnline ? '#FF385C' : '#6C5CE0';
        if (isBlocked) bg = '#DC2626';

        const guestInitial = (bk.guest_name || 'G').charAt(0).toUpperCase();
        const nameParts = (bk.guest_name || 'Guest').trim().split(/\s+/);
        let firstName = nameParts[0] || 'G';
        if (firstName.length > 8) firstName = firstName.substring(0, 8);

        const currentNight = calcNights(bk.check_in, ds);
        const showName = isCheckIn || isCheckOut || (currentNight > 0 && currentNight % 2 === 0);
        const showAvatar = isCheckIn;

        let borderRadius = '0';
        if (isCheckIn && isCheckOut) borderRadius = '16px';
        else if (isCheckIn) borderRadius = '16px 0 0 16px';
        else if (isCheckOut) borderRadius = '0 16px 16px 0';

        const overlapTitle = overlapCount > 1 
          ? bkArr.map(x => x.guest_name || 'Guest').join(' + ')
          : (bk.guest_name || 'Booked');

        cellsHtml += `
          <div class="cal-day booked ${isToday ? 'today' : ''}" onclick="showBookingPopup('${r.room_id}','${ds}')" title="${overlapTitle}" style="position:relative;">
            <div class="cal-date-num">${d}</div>
            ${overlapCount > 1 ? `<div style="position:absolute;top:3px;right:3px;background:#DC2626;color:#fff;border-radius:50%;min-width:18px;height:18px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;box-shadow:0 2px 4px rgba(0,0,0,0.4);z-index:3;line-height:1;" title="${overlapCount} bookings on this date">${overlapCount}</div>` : ''}
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
      <div class="card cal-room-card" style="padding:12px;border-radius:14px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <strong style="font-size:14.5px;color:var(--dark);">${r.unit_no}</strong>
            <span style="color:var(--muted);font-size:12.5px;margin-left:6px;">${r.nickname || r.property_name || ''}</span>
          </div>
          ${r.rent_per_night ? `<span style="font-size:11.5px;color:#059669;font-weight:700;">Base: ₹${r.rent_per_night.toLocaleString('en-IN')}/night</span>` : ''}
        </div>
        <div class="cal-grid">${cellsHtml}</div>
      </div>`;
  });

  // ═══ LEGEND ═══
  html += `
    <div class="card" style="padding:12px;text-align:center;border-radius:12px;margin-bottom:14px;">
      <div style="display:inline-flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:12px;font-weight:600;">
        <span><span style="display:inline-block;width:14px;height:14px;background:#FF385C;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> Airbnb</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#6C5CE0;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> Direct</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#DC2626;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> Blocked</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#fff;border:1px solid #ccc;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> Free</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:#FEE2E2;border:1px solid #FF385C;border-radius:4px;vertical-align:middle;margin-right:4px;"></span> Today</span>
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
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }
    .cal-hdr {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--muted);
      text-align: center;
      padding: 5px 0;
      text-transform: uppercase;
      background: #F8FAFC;
      border-radius: 4px;
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
    .cal-date-num {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      padding: 3px 4px 0;
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
      font-size: 11px;
      font-weight: 700;
      padding: 3px 5px;
      margin: 2px 0;
      overflow: hidden;
      min-width: 0;
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
      font-size: 10.5px;
      color: #fff;
      text-shadow: 0 1px 1px rgba(0,0,0,0.2);
      max-width: 100%;
      font-weight: 700;
    }
    .cal-room-card { overflow: hidden; }

    @media (max-width: 640px) {
      .cal-grid { gap: 2px; }
      .cal-day { min-height: 48px; border-radius: 6px; }
      .cal-date-num { font-size: 10px; padding: 2px 2px 0; }
      .cal-rate { font-size: 8px; }
      .cal-pill { font-size: 9px; padding: 2px 2px; margin: 1px 0; }
      .cal-avatar { width: 14px; height: 14px; font-size: 8px; }
      .cal-name { font-size: 9px; font-weight: 700; }
      .cal-hdr { font-size: 9px; padding: 3px 0; }
      .cal-room-card { padding: 10px 6px !important; border-radius: 12px; }
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
              ${statusBadges.join(' ')}
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
        
        ${b.notes ? `<div style="font-size:11px;color:#666;padding:6px;background:#FEF3C7;border-radius:4px;margin-bottom:8px;"><strong>Notes:</strong> ${b.notes}</div>` : ''}
        
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-sm" onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="flex:1;">✏️ Edit</button>
          <button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove(); if(window.openAddPaymentModal) openAddPaymentModal('${b.booking_id}'); else if(window.showPaymentModal) showPaymentModal('${b.booking_id}');" style="flex:1;">💰 Pay</button>
          <button class="btn-sm" style="background:#25D366;color:#fff;flex:1;" onclick="calOpenWhatsApp('${b.booking_id}', this);">📱 WhatsApp</button>
          <button class="btn-sm danger" onclick="calDeleteBooking('${b.booking_id}', '${(b.guest_name || 'Booking').replace(/'/g, "\\'")}', '${b.room_id}');" style="background:#DC2626;color:#fff;flex:1;">🗑️ Delete</button>
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

  const isBlocked = b.guest_name && (b.guest_name.includes('Blocked') || b.booking_mode === 'Offline-Blocked');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px;padding:22px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin-top:0;margin-bottom:12px;font-size:18px;">${isBlocked ? '🛑 Airbnb Blocked Slot' : '📅 Booking Details'}</h2>

      <div style="background:${isBlocked ? '#FEE2E2' : '#F8FAFC'};padding:14px;border-radius:12px;border:1px solid ${isBlocked ? '#FCA5A5' : 'var(--border)'};margin-bottom:14px;font-size:13px;line-height:1.8;">
        <div><strong>Guest Name:</strong> ${b.guest_name || '-'} ${typeof getRatingBadge === 'function' ? getRatingBadge(b.client_rating) : ''}</div>
        ${b.phone ? `<div><strong>Phone:</strong> <a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;">${b.phone}</a></div>` : ''}
        <div><strong>Property:</strong> ${propLabel(b.rooms) || b.room_id}</div>
        <div><strong>Channel Mode:</strong> <span style="font-weight:700;color:${b.booking_mode==='Online-Airbnb'?'#2563EB':'#D97706'}">${b.booking_mode}</span></div>
        <div><strong>Dates:</strong> 🗓️ ${b.check_in} ➔ ${b.check_out} (<strong>${nights}</strong> Night${nights>1?'s':''})</div>
        <div><strong>Total Amount:</strong> ₹${(b.total_amount||0).toLocaleString('en-IN')} | <strong>Paid:</strong> ₹${totalPaid.toLocaleString('en-IN')} | <strong style="color:${due>0?'#DC2626':'#059669'}">Due: ₹${due.toLocaleString('en-IN')}</strong></div>
        ${b.has_vehicle ? `<div style="margin-top:2px;font-size:12px;color:var(--muted);">🚗 Vehicle: ${(b.vehicle_name || '') + ' ' + (b.vehicle_number || '')}</div>` : ''}
        ${b.notes ? `<div style="font-size:12px;color:#6B7280;margin-top:4px;"><strong>Notes:</strong> ${b.notes}</div>` : ''}
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
          <button onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="padding:11px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;grid-column:span 2;">
            ➕ Convert & Fill Guest Details
          </button>
        ` : `
          <button onclick="this.closest('.modal-overlay').remove(); if(window.editBooking) editBooking('${b.booking_id}');" style="padding:10px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            ✏️ Edit Booking
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.openAddPaymentModal) openAddPaymentModal('${b.booking_id}'); else if(window.showPaymentModal) showPaymentModal('${b.booking_id}');" style="padding:10px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            💵 Add Payment
          </button>
          <button onclick="this.closest('.modal-overlay').remove(); if(window.duplicateBooking) duplicateBooking('${b.booking_id}');" style="padding:10px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
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
