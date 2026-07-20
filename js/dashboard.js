/**
 * Dashboard Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderDashboard() {
  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const today = new Date().toISOString().slice(0, 10);
  const day3 = dateAdd(today, 3);
  const day7 = dateAdd(today, 7);

  const [g, f] = await Promise.all([
    sb.from("guest_register").select("*, rooms(unit_no, nickname)"),
    sb.from("flats_status").select("room_id, status, cleaning_status, rooms(unit_no, nickname)")
  ]);

  const allBookings = g.data || [];
  const allFlats = f.data || [];

  // Today's check-ins/outs
  const rawCheckins = allBookings.filter(x => x.check_in === today);
  const rawCheckouts = allBookings.filter(x => x.check_out === today);

  // Detect internal shifts — only when ROOM actually changed
  const shiftGuests = new Set();
  rawCheckins.forEach(ci => {
    if (ci.parent_booking_id || ci.stay_group_id) {
      const matching = rawCheckouts.find(co =>
        (co.guest_name === ci.guest_name ||
        co.booking_id === ci.parent_booking_id ||
        co.stay_group_id === ci.stay_group_id) &&
        co.room_id !== ci.room_id  // Only count as shift if room actually changed
      );
      if (matching) shiftGuests.add(ci.guest_name);
    }
  });

  const realCheckins = rawCheckins.filter(x => !shiftGuests.has(x.guest_name));
  const realCheckouts = rawCheckouts.filter(x => !shiftGuests.has(x.guest_name));
  const shiftList = rawCheckins.filter(x => shiftGuests.has(x.guest_name));

  // KPIs
  const bookedNow = allFlats.filter(x => x.status === 'Booked');
  const freeClean = allFlats.filter(x => x.status === 'Free' && x.cleaning_status === 'Clean');
  const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty' && x.status !== 'Blocked-Maintenance');
  const totalProps = allFlats.length;

  // Upcoming
  const upcoming3 = allBookings.filter(b => b.check_in > today && b.check_in <= day3);
  const upcoming7 = allBookings.filter(b => b.check_in > today && b.check_in <= day7);

  // Open stays
  const openStays = allBookings.filter(b => b.checkout_confirmed === false && b.check_in <= today && b.check_out >= today);

  const bName = b => `${b.rooms?.unit_no || b.room_id}${b.rooms?.nickname ? ' (' + b.rooms.nickname + ')' : ''}`;
  const fName = fl => `${fl.rooms?.unit_no || fl.room_id}${fl.rooms?.nickname ? ' (' + fl.rooms.nickname + ')' : ''}`;

  renderShell(`
    ${updateNoticeHTML()}
    ${SESSION.role === 'owner' ? syncInfoHTML() : ''}

    <div class="card">
      <h1>📊 Dashboard</h1>
      <div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div style="font-size:11px;color:var(--muted);">Build ${APP_VERSION}</div>
    </div>

    <!-- Row 1: Check-in, Check-out, Occupancy -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${realCheckins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${realCheckins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2:00 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${realCheckouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${realCheckouts.map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11:00 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedNow.length}/${totalProps}</div>
        <div class="stat-label">🛏️ Booked Now</div>
        ${bookedNow.map(x => `<div style="font-size:11px;margin-top:3px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <!-- Row 2: Free, Dirty, Shifts -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${freeClean.length}</div>
        <div class="stat-label">✅ Free & Ready</div>
        ${freeClean.map(x => `<div style="font-size:11px;margin-top:3px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        ${dirty.map(x => `<div style="font-size:11px;margin-top:3px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid #FDF6B2;">
        <div class="stat-num">${shiftList.length}</div>
        <div class="stat-label">🔁 Room Shifts</div>
        ${shiftList.map(x => `<div style="font-size:11px;margin-top:3px;">${x.guest_name} → ${bName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <!-- Row 3: Upcoming + Open Stays -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming3.length}</div>
        <div class="stat-label">📅 Next 3 Days</div>
        ${upcoming3.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:3px;">
            ${x.guest_name} — ${bName(x)}<br>
            <small style="color:var(--muted);">${x.check_in}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--yellow);">
        <div class="stat-num">${upcoming7.length}</div>
        <div class="stat-label">📆 Next 7 Days</div>
        ${upcoming7.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:3px;">
            ${x.guest_name} — ${bName(x)}<br>
            <small style="color:var(--muted);">${x.check_in}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${openStays.length}</div>
        <div class="stat-label">🔄 Open Stays</div>
        ${openStays.slice(0, 4).map(x => `
          <div style="font-size:11px;margin-top:3px;">
            ${x.guest_name} — ${bName(x)}<br>
            <small style="color:var(--muted);">Since ${x.check_in}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="card">
      <button onclick="renderFYSummary()">📊 Financial Summary (Reports)</button>
    </div>
  `, 'dashboard');
}

// ============ CHECKIN MANAGER VIEW ============
async function renderCheckinManagerView() {
  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const today = new Date().toISOString().slice(0, 10);
  const day3 = dateAdd(today, 3);

  const [g, f] = await Promise.all([
    sb.from("guest_register").select("*, rooms(unit_no, nickname, checkin_manager, caretaker_phone)"),
    sb.from("flats_status").select("room_id, status, cleaning_status, rooms(unit_no, nickname)")
  ]);

  const allBookings = g.data || [];
  const allFlats = f.data || [];

  const checkins = allBookings.filter(x => x.check_in === today);
  const checkouts = allBookings.filter(x => x.check_out === today);
  const upcoming = allBookings.filter(b => b.check_in > today && b.check_in <= day3);
  const activeNow = allBookings.filter(b => b.check_in <= today && b.check_out > today);
  const bookedNow = allFlats.filter(x => x.status === 'Booked');
  const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty');

  const bName = b => `${b.rooms?.unit_no || b.room_id}${b.rooms?.nickname ? ' (' + b.rooms.nickname + ')' : ''}`;
  const fName = fl => `${fl.rooms?.unit_no || fl.room_id}${fl.rooms?.nickname ? ' (' + fl.rooms.nickname + ')' : ''}`;

  renderShell(`
    <div class="card">
      <h1>👨‍💼 Check-in Manager</h1>
      <div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div style="font-size:11px;color:var(--muted);">👋 ${SESSION.displayName} · Build ${APP_VERSION}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${checkins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${checkins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small>📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2:00 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${checkouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${checkouts.map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11:00 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming.length}</div>
        <div class="stat-label">📅 Next 3 Days</div>
        ${upcoming.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bName(x)} (${x.check_in})</div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedNow.length}/${allFlats.length}</div>
        <div class="stat-label">🛏️ Occupied</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        ${dirty.map(x => `<div style="font-size:11px;margin-top:3px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Active Guests</div>
      </div>
    </div>

    ${activeNow.length ? `
      <div class="card">
        <div class="section-title">🟢 Currently Staying</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Phone</th><th>In</th><th>Out</th><th>Vehicle</th></tr></thead>
          <tbody>${activeNow.map(b => `<tr>
            <td><strong>${b.guest_name || '-'}</strong></td>
            <td>${b.rooms?.nickname || b.room_id}</td>
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