/**
 * Dashboard Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderDashboard() {
  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const today = new Date().toISOString().slice(0, 10);
  const day7 = dateAdd(today, 7);
  const monthStart = today.slice(0, 7) + '-01';

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
    sb.from("maintenance_log").select("*, rooms(nickname)").neq('status', 'Resolved'),
    sb.from("attendance_log").select("emp_id, status").eq('att_date', today),
    sb.from("employees").select("emp_id, name").eq('status', 'Active')
  ]);

  const allBookings = bookings || [];
  const allFlats = flats || [];
  const allPayments = payments || [];

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
  const totalProps = allFlats.length;

  // Financial KPIs
  const paidMap = {};
  allPayments.forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });

  // Today's revenue (payments received today)
  const todayRevenue = allPayments
    .filter(p => p.payment_date === today)
    .reduce((s, p) => s + (p.amount || 0), 0);

  // This month revenue
  const monthRevenue = allPayments
    .filter(p => (p.payment_date || '') >= monthStart)
    .reduce((s, p) => s + (p.amount || 0), 0);

  // Total pending balance (all active bookings)
  const pendingBalance = allBookings
    .filter(b => b.check_out >= today || !b.check_out)
    .reduce((s, b) => s + Math.max((b.total_amount || 0) - (paidMap[b.booking_id] || 0), 0), 0);

  // This month bookings
  const monthBookings = allBookings.filter(b => (b.check_in || '') >= monthStart).length;

  // Upcoming 7 days
  const upcoming7 = allBookings
    .filter(b => b.check_in > today && b.check_in <= day7)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

  // Overdue checkouts (past checkout, still active)
  const overdue = allBookings.filter(b =>
    b.check_out && b.check_out < today && b.checkout_confirmed !== false
  );

  // Active stays
  const activeNow = allBookings.filter(b => b.check_in <= today && (b.check_out > today || !b.check_out));

  // Attendance today
  const presentToday = (attendance || []).filter(a => a.status === 'Present').length;
  const totalEmps = (emps || []).length;

  // Pending tasks
  const urgentTasks = (tasks || []).filter(t => t.priority === 'Urgent').length;

  // Maintenance
  const maintPending = (maint || []).length;

  // Occupancy %
  const occupancyPct = totalProps > 0 ? Math.round(bookedNow.length / totalProps * 100) : 0;

  const bName = b => `${b.rooms?.nickname || b.rooms?.unit_no || b.room_id}`;
  const fName = fl => `${fl.rooms?.nickname || fl.rooms?.unit_no || fl.room_id}`;

  renderShell(`
    ${updateNoticeHTML()}
    ${SESSION.role === 'owner' ? syncInfoHTML() : ''}

    <div class="card">
      <h1>📊 Dashboard</h1>
      <div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    ${overdue.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--red);background:#FEF2F2;">
      <div class="section-title" style="color:var(--red);">⚠️ Overdue Checkouts (${overdue.length})</div>
      ${overdue.slice(0, 3).map(x => `
        <div style="font-size:12px;padding:4px 0;">
          <strong>${x.guest_name}</strong> — ${bName(x)}
          <br><small style="color:var(--muted);">Was due: ${x.check_out}</small>
        </div>
      `).join('')}
      ${overdue.length > 3 ? `<div style="font-size:11px;color:var(--primary);cursor:pointer;" onclick="navigate('bookings')">View all →</div>` : ''}
    </div>
    ` : ''}

    <!-- Financial Row -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);cursor:pointer;" onclick="navigate('financial')">
        <div class="stat-num" style="color:var(--green);font-size:22px;">₹${todayRevenue.toLocaleString('en-IN')}</div>
        <div class="stat-label">💰 Today's Revenue</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--blue);cursor:pointer;" onclick="navigate('financial')">
        <div class="stat-num" style="color:var(--blue);font-size:22px;">₹${monthRevenue.toLocaleString('en-IN')}</div>
        <div class="stat-label">📈 This Month</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);cursor:pointer;" onclick="navigate('bookings')">
        <div class="stat-num" style="color:var(--red);font-size:22px;">₹${pendingBalance.toLocaleString('en-IN')}</div>
        <div class="stat-label">💳 Pending Balance</div>
      </div>
    </div>

    <!-- Operations Row 1 -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${realCheckins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${realCheckins.slice(0, 3).map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${realCheckouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${realCheckouts.slice(0, 3).map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid #60a5fa;cursor:pointer;" onclick="navigate('flats')">
        <div class="stat-num">${bookedNow.length}/${totalProps}</div>
        <div class="stat-label">🛏️ Occupied (${occupancyPct}%)</div>
        ${bookedNow.slice(0, 4).map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All free</div>'}
      </div>
    </div>

    <!-- Operations Row 2 -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);cursor:pointer;" onclick="navigate('flats')">
        <div class="stat-num">${freeClean.length}</div>
        <div class="stat-label">✅ Ready to Book</div>
        ${freeClean.slice(0, 4).map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--red);cursor:pointer;" onclick="navigate('flats')">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        ${dirty.slice(0, 4).map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--blue);cursor:pointer;" onclick="navigate('bookings')">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Currently Staying</div>
        ${activeNow.slice(0, 3).map(x => `<div style="font-size:11px;margin-top:2px;">${x.guest_name} — ${bName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <!-- Staff & Alerts Row -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);cursor:pointer;" onclick="navigate('attendance')">
        <div class="stat-num" style="color:var(--green);">${presentToday}/${totalEmps}</div>
        <div class="stat-label">👥 Staff Present</div>
      </div>

      <div class="stat-card" style="border-left:4px solid ${urgentTasks > 0 ? 'var(--red)' : 'var(--yellow)'};cursor:pointer;" onclick="navigate('tasks')">
        <div class="stat-num" style="color:${urgentTasks > 0 ? 'var(--red)' : 'var(--yellow)'};">${(tasks || []).length}</div>
        <div class="stat-label">🧰 Pending Tasks ${urgentTasks > 0 ? `(${urgentTasks} urgent)` : ''}</div>
        ${(tasks || []).slice(0, 3).map(t => `
          <div style="font-size:11px;margin-top:2px;">
            ${t.employees?.name || '-'}: ${t.task_description?.slice(0, 30) || '-'}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">All done ✅</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid ${maintPending > 0 ? 'var(--red)' : 'var(--green)'};cursor:pointer;" onclick="navigate('maintenance')">
        <div class="stat-num" style="color:${maintPending > 0 ? 'var(--red)' : 'var(--green)'};">${maintPending}</div>
        <div class="stat-label">🔧 Maintenance</div>
        ${(maint || []).slice(0, 3).map(m => `
          <div style="font-size:11px;margin-top:2px;">
            ${m.rooms?.nickname || 'General'}: ${m.description?.slice(0, 30) || '-'}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">No issues ✅</div>'}
      </div>
    </div>

    <!-- Upcoming Row -->
    <div class="card">
      <div class="section-title">📅 Next 7 Days (${upcoming7.length} bookings)</div>
      ${upcoming7.length === 0 ? '<div class="sub">No upcoming bookings</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Guest</th><th>Property</th><th>Phone</th><th>Amount</th></tr></thead>
          <tbody>${upcoming7.slice(0, 10).map(x => `
            <tr>
              <td style="font-size:12px;">${x.check_in} · ${x.check_in_time || '2 PM'}</td>
              <td><strong>${x.guest_name}</strong></td>
              <td style="font-size:12px;">${bName(x)}</td>
              <td style="font-size:12px;">${x.phone || '-'}</td>
              <td style="color:var(--green);">₹${(x.total_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}</tbody>
        </table></div>`}
    </div>

    <!-- Extended Stays -->
    ${extendedWithParent.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--yellow);">
      <div class="section-title">
        🔄 Extended Stays (${extendedWithParent.length})
        <span class="badge yellow" style="float:right;">Last 30 days</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Guest</th><th>Property</th><th>Original Out</th><th>Extended Till</th><th>Amount</th>
        </tr></thead>
        <tbody>${extendedWithParent.slice(0, 10).map(({ext, parent}) => `
          <tr>
            <td>
              <strong>${ext.guest_name}</strong>
              ${ext.phone ? `<br><small style="color:var(--muted);">📞 ${ext.phone}</small>` : ''}
            </td>
            <td style="font-size:12px;">${ext.rooms?.nickname || ext.room_id}</td>
            <td style="font-size:12px;color:var(--muted);">${parent?.check_out || '-'}</td>
            <td style="font-size:12px;color:var(--green);"><strong>${ext.check_out || 'Open'}</strong></td>
            <td style="color:var(--green);">₹${(ext.total_amount || 0).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>
    ` : ''}

    <!-- Guest Shifts -->
    ${allShifts.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--blue);">
      <div class="section-title">
        🔁 Room Shifts (${allShifts.length})
        <span class="badge blue" style="float:right;">Last 30 days</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Guest</th><th>From</th><th>To</th><th>Shift Date</th><th>Phone</th>
        </tr></thead>
        <tbody>${allShifts.slice(0, 10).map(sh => `
          <tr>
            <td><strong>${sh.guest}</strong></td>
            <td style="font-size:12px;color:var(--red);">${sh.fromRoom}</td>
            <td style="font-size:12px;color:var(--green);"><strong>→ ${sh.toRoom}</strong></td>
            <td style="font-size:12px;">${sh.shiftDate}</td>
            <td style="font-size:12px;">${sh.phone || '-'}</td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>
    ` : ''}

    <!-- Monthly Summary -->
    <div class="card" style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.5);margin-bottom:10px;">
        This Month Summary — ${new Date().toLocaleString('en-IN', {month:'long', year:'numeric'})}
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">Bookings</span>
        <span class="metric-value" style="color:#fff;">${monthBookings}</span>
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">Revenue</span>
        <span class="metric-value" style="color:#4ade80;">₹${monthRevenue.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span style="color:rgba(255,255,255,0.8);">Occupancy</span>
        <span class="metric-value" style="color:#60a5fa;">${occupancyPct}%</span>
      </div>
      <div class="metric-row" style="border:none;">
        <span style="color:rgba(255,255,255,0.8);">Pending Balance</span>
        <span class="metric-value" style="color:#ef4444;">₹${pendingBalance.toLocaleString('en-IN')}</span>
      </div>
    </div>

  `, 'dashboard');
}

// ============ CHECKIN MANAGER VIEW ============
async function renderCheckinManagerView() {
  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

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

  const bName = b => `${b.rooms?.nickname || b.rooms?.unit_no || b.room_id}`;
  const fName = fl => `${fl.rooms?.nickname || fl.rooms?.unit_no || fl.room_id}`;

  renderShell(`
    <div class="card">
      <h1>👨‍💼 Check-in Manager</h1>
      <div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
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
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${checkouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${checkouts.map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11:00 AM'}</small>
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
        <div class="stat-label">🛏️ Occupied</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Cleaning</div>
        ${dirty.map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Active</div>
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
