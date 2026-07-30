/**
 * Dashboard Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderDashboard() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('metrics');

  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const activeUsers = await getActiveUsers();

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
    sb.from("maintenance_log").select("*").neq('status', 'Resolved'),
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
  const activeDue = allBookings.filter(b => b.check_out >= today || !b.check_out).reduce((s, b) => {
      const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
      return s + (due > 1 ? due : 0);
    }, 0);
  const pastDue = allBookings.filter(b => b.check_out && b.check_out < today).reduce((s, b) => {
      const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
      return s + (due > 1 ? due : 0);
    }, 0);
  const pendingBalance = activeDue + pastDue;

  // This month bookings
  const monthBookings = allBookings.filter(b => (b.check_in || '') >= monthStart).length;

  // Upcoming 7 days
  const upcoming7 = allBookings
    .filter(b => b.check_in > today && b.check_in <= day7)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

  // Overdue checkouts (past checkout, still active)
  const overdue = allBookings.filter(b =>
    b.check_out && b.check_out < today && false
  );

  // Active stays
  const activeNow = allBookings.filter(b => b.check_in <= today && (b.check_out > today || !b.check_out));

  // Attendance today
  const presentToday = (attendance || []).filter(a => a.status === 'Present').length;
  const totalEmps = (emps || []).length;

  // Pending tasks
  const urgentTasks = (tasks || []).filter(t => t.priority === 'Urgent').length;

  // Occupancy %
  const occupancyPct = totalProps > 0 ? Math.round(bookedNow.length / totalProps * 100) : 0;

  const maintPending = (maint || []).length;

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

  const bName = b => `${propLabel(b.rooms) || b.room_id}`;
  const fName = fl => `${propLabel(fl.rooms) || fl.room_id}`;

  renderShell(`
    ${updateNoticeHTML()}
    ${['owner','admin'].includes(SESSION.role) ? syncInfoHTML() : ''}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <h1>📊 Dashboard</h1>
          <div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        ${SESSION.role === 'developer' ? `
        <div style="text-align:right;cursor:pointer;" onclick="showActiveUsersModal()" title="Click to see online users">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;">Online Now</div>
          <div style="font-size:20px;font-weight:800;color:#00A699;display:flex;align-items:center;gap:6px;justify-content:flex-end;">
            <span style="width:10px;height:10px;background:#00A699;border-radius:50%;display:inline-block;animation:pulse-dot 1.5s ease-in-out infinite;"></span>
            ${activeUsers.length} ${activeUsers.length === 1 ? 'user' : 'users'}
          </div>
        </div>
        ` : ''}
      </div>
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
      <div class="stat-card" style="border-left:4px solid var(--green);cursor:pointer;" onclick="filterAndShowBookings('todayRevenue')">
        <div class="stat-num" style="color:var(--green);font-size:22px;">₹${todayRevenue.toLocaleString('en-IN')}</div>
        <div class="stat-label">💰 Today's Revenue</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--blue);cursor:pointer;" onclick="filterAndShowBookings('thisMonth')">
        <div class="stat-num" style="color:var(--blue);font-size:22px;">₹${monthRevenue.toLocaleString('en-IN')}</div>
        <div class="stat-label">📈 This Month</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #FF385C;cursor:pointer;" onclick="filterAndShowBookings('activeDue')">
        <div class="stat-num" style="color:#FF385C;font-size:20px;">₹${activeDue.toLocaleString('en-IN')}</div>
        <div class="stat-label">🔴 Active Due</div>
        <div style="font-size:10px;color:var(--muted);">Current + Upcoming guests</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #FFB800;cursor:pointer;" onclick="filterAndShowBookings('pastDue')">
        <div class="stat-num" style="color:#FFB800;font-size:20px;">₹${pastDue.toLocaleString('en-IN')}</div>
        <div class="stat-label">⏳ Past Due</div>
        <div style="font-size:10px;color:var(--muted);">Checked out but unpaid</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);cursor:pointer;" onclick="filterAndShowBookings('due')">
        <div class="stat-num" style="color:var(--red);font-size:20px;">₹${pendingBalance.toLocaleString('en-IN')}</div>
        <div class="stat-label">💳 Total Pending</div>
        <div style="font-size:10px;color:var(--muted);">All unpaid combined</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #FFB800;cursor:pointer;" onclick="filterAndShowBookings('noId')">
        <div class="stat-num" style="color:#FFB800;font-size:20px;">${allBookings.filter(b => {
          if (b.check_in > today) return false;
          if (b.check_out < dateAdd(today, -7)) return false;
          return !(b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length;
        }).length}</div>
        <div class="stat-label">🪪 ID Pending</div>
        <div style="font-size:10px;color:var(--muted);">Active + last 7 days</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #722ED1;cursor:pointer;" onclick="filterAndShowBookings('review')">
        <div class="stat-num" style="color:#722ED1;font-size:20px;">${allBookings.filter(b => b.is_review_booking === true).length}</div>
        <div class="stat-label">⭐ Review Bookings</div>
        <div style="font-size:10px;color:var(--muted);">Fake Airbnb for reviews</div>
      </div>
    </div>

    <!-- Online vs Offline Bookings -->
    ${(() => {
      const now = new Date();
      const todayD = now.toISOString().slice(0, 10);
      const weekAgo = dateAdd(todayD, -7);
      const monthStart2 = todayD.slice(0, 7) + '-01';

      const onlineToday = allBookings.filter(b => b.booking_mode === 'Online-Airbnb' && b.check_in === todayD);
      const offlineToday = allBookings.filter(b => b.booking_mode !== 'Online-Airbnb' && b.check_in === todayD);
      const onlineWeek = allBookings.filter(b => b.booking_mode === 'Online-Airbnb' && b.check_in >= weekAgo && b.check_in <= todayD);
      const offlineWeek = allBookings.filter(b => b.booking_mode !== 'Online-Airbnb' && b.check_in >= weekAgo && b.check_in <= todayD);
      const onlineMonth = allBookings.filter(b => b.booking_mode === 'Online-Airbnb' && b.check_in >= monthStart2);
      const offlineMonth = allBookings.filter(b => b.booking_mode !== 'Online-Airbnb' && b.check_in >= monthStart2);

      const rev = arr => arr.reduce((s,b) => s + (b.total_amount || 0), 0);

      return `
      <div class="card">
        <div class="section-title">📊 Online vs Offline Bookings</div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Period</th>
            <th style="color:#1E429F;">🌐 Online (Airbnb)</th>
            <th style="color:#B45309;">🏠 Offline (Direct)</th>
            <th>Total</th>
          </tr></thead>
          <tbody>
            <tr style="cursor:pointer;" onclick="filterBookingsByMode('Online-Airbnb','today')">
              <td><strong>Today</strong></td>
              <td style="color:#1E429F;">${onlineToday.length} · ₹${rev(onlineToday).toLocaleString('en-IN')}</td>
              <td style="color:#B45309;" onclick="event.stopPropagation();filterBookingsByMode('Offline','today')">${offlineToday.length} · ₹${rev(offlineToday).toLocaleString('en-IN')}</td>
              <td onclick="event.stopPropagation();filterBookingsByMode('All','today')"><strong>${onlineToday.length + offlineToday.length}</strong> · ₹${(rev(onlineToday) + rev(offlineToday)).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="cursor:pointer;" onclick="filterBookingsByMode('Online-Airbnb','week')">
              <td><strong>This Week</strong></td>
              <td style="color:#1E429F;">${onlineWeek.length} · ₹${rev(onlineWeek).toLocaleString('en-IN')}</td>
              <td style="color:#B45309;" onclick="event.stopPropagation();filterBookingsByMode('Offline','week')">${offlineWeek.length} · ₹${rev(offlineWeek).toLocaleString('en-IN')}</td>
              <td onclick="event.stopPropagation();filterBookingsByMode('All','week')"><strong>${onlineWeek.length + offlineWeek.length}</strong> · ₹${(rev(onlineWeek) + rev(offlineWeek)).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="cursor:pointer;" onclick="filterBookingsByMode('Online-Airbnb','month')">
              <td><strong>This Month</strong></td>
              <td style="color:#1E429F;">${onlineMonth.length} · ₹${rev(onlineMonth).toLocaleString('en-IN')}</td>
              <td style="color:#B45309;" onclick="event.stopPropagation();filterBookingsByMode('Offline','month')">${offlineMonth.length} · ₹${rev(offlineMonth).toLocaleString('en-IN')}</td>
              <td onclick="event.stopPropagation();filterBookingsByMode('All','month')"><strong>${onlineMonth.length + offlineMonth.length}</strong> · ₹${(rev(onlineMonth) + rev(offlineMonth)).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table></div>
      </div>
      `;
    })()}

    <!-- Operations Row 1 -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${realCheckins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        <div style="max-height:200px;overflow-y:auto;">
        ${realCheckins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
        </div>
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${realCheckouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        <div style="max-height:200px;overflow-y:auto;">
        ${realCheckouts.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">📞 ${x.phone || '-'} · 🕐 ${x.check_out_time || '11 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
        </div>
      </div>

      <div class="stat-card" style="border-left:4px solid #60a5fa;cursor:pointer;" onclick="filterAndShowBookings('currentStay')">
        <div class="stat-num">${activeNow.length}/${totalProps}</div>
        <div class="stat-label">🛏️ Occupied (${Math.round(activeNow.length/totalProps*100) || 0}%)</div>
        <div style="max-height:180px;overflow-y:auto;">
        ${activeNow.map(x => `<div style="font-size:11px;margin-top:2px;padding:2px 0;border-bottom:1px dashed #eee;"><strong>${x.guest_name}</strong> — ${bName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All free</div>'}
        </div>
        ${activeNow.length > 0 ? `<div style="font-size:10px;color:var(--primary);margin-top:6px;text-align:right;">→ View all bookings</div>` : ''}
      </div>
    </div>

    <!-- Operations Row 2 -->
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);cursor:pointer;" onclick="navigate('flats')">
        <div class="stat-num">${freeClean.length}</div>
        <div class="stat-label">✅ Ready to Book</div>
        <div style="max-height:180px;overflow-y:auto;">
        ${freeClean.map(x => `<div style="font-size:11px;margin-top:2px;padding:2px 0;border-bottom:1px dashed #eee;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
        </div>
      </div>

      <div class="stat-card" style="border-left:4px solid var(--red);cursor:pointer;" onclick="navigate('flats')">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        <div style="max-height:180px;overflow-y:auto;">
        ${dirty.map(x => `<div style="font-size:11px;margin-top:2px;padding:2px 0;border-bottom:1px dashed #eee;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
        </div>
      </div>

      <div class="stat-card" style="border-left:4px solid var(--blue);cursor:pointer;" onclick="filterAndShowBookings('currentStay')">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Currently Staying</div>
        <div style="max-height:180px;overflow-y:auto;">
        ${activeNow.map(x => `<div style="font-size:11px;margin-top:2px;padding:2px 0;border-bottom:1px dashed #eee;"><strong>${x.guest_name}</strong> — ${bName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
        </div>
        ${activeNow.length > 0 ? `<div style="font-size:10px;color:var(--primary);margin-top:6px;text-align:right;">→ View all</div>` : ''}
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
            ${m.room_id || 'General'}: ${m.description?.slice(0, 30) || '-'}
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
            <td style="font-size:12px;">${propLabel(ext.rooms) || ext.room_id}</td>
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

    <!-- WhatsApp Tasks Today -->
    ${(() => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const tomorrow = dateAdd(todayDate, 1);
      const yesterday = dateAdd(todayDate, -1);

      // Tomorrow's check-ins → send check-in reminder today
      const checkinReminders = allBookings.filter(b =>
        b.check_in === tomorrow && b.phone
      );

      // Today's check-ins arriving in next 2 hours → send arrival details
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const arrivingSoon = allBookings.filter(b => {
        if (!b.phone || b.check_in !== todayDate) return false;
        // parse check_in_time like "14:00" or "2:00 PM"
        const t = (b.check_in_time || '14:00').toString();
        let mins = 14 * 60; // default 2 PM
        const m24 = t.match(/^(\d{1,2}):(\d{2})/);
        if (m24) mins = parseInt(m24[1]) * 60 + parseInt(m24[2]);
        // Arriving in next 2 hours OR arrived in last 30 min (not yet checked in via actual_checkin)
        const diff = mins - nowMinutes;
        return diff >= -30 && diff <= 120;
      });

      // Today's checkouts → send checkout reminder (only if not past)
      const checkoutReminders = allBookings.filter(b => {
        if (!b.phone || !b.check_out) return false;
        if (b.check_out !== todayDate) return false;
        // Only if guest is still active (checked in already)
        return b.check_in <= todayDate;
      });

      // Yesterday's checkouts → request review (only recent 7 days)
      const reviewRequests = allBookings.filter(b => {
        if (!b.phone || !b.check_out) return false;
        // Only past week
        const sevenDaysAgo = dateAdd(todayDate, -7);
        return b.check_out >= sevenDaysAgo && b.check_out < todayDate;
      });

      // Bookings without ID → request ID
      const noIdBookings = allBookings.filter(b => {
        if (!b.phone) return false;
        if (b.check_in > todayDate) return false; // Not yet checked in
        if (b.check_out < todayDate) return false; // Already left
        const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
        return !hasId;
      });

      const totalTasks = checkinReminders.length + arrivingSoon.length + checkoutReminders.length + reviewRequests.length + noIdBookings.length;
      if (totalTasks === 0) return '';

      return `
      <div class="card" style="border-left:4px solid #25D366;background:#F0FFF4;">
        <div class="section-title" style="color:#128C7E;">
          📱 WhatsApp Tasks Today (${totalTasks})
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">
          Click each button to send personalized message via WhatsApp
        </div>

        ${checkinReminders.length ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#00A699;margin-bottom:8px;">
            📅 Check-in Reminder (${checkinReminders.length}) — Guests arriving tomorrow
          </div>
          ${checkinReminders.map(b => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
              <div style="flex:1;">
                <strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}
                <br><small style="color:var(--muted);">📞 ${b.phone} · Check-in: ${b.check_in} ${b.check_in_time || ''}</small>
              </div>
              <button class="btn-sm" style="background:#00A699;color:#fff;" onclick="sendCheckinReminder('${b.booking_id}')">📅 Reminder</button>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${arrivingSoon.length ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#E2725B;margin-bottom:8px;">
            ⏰ Arriving Soon (${arrivingSoon.length}) — Send WiFi + Key details
          </div>
          ${arrivingSoon.map(b => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
              <div style="flex:1;">
                <strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}
                <br><small style="color:var(--muted);">📞 ${b.phone} · Check-in: ${b.check_in_time || '14:00'}</small>
              </div>
              <button class="btn-sm" style="background:#E2725B;color:#fff;" onclick="sendArrivalDetails('${b.booking_id}')">⏰ Send Keys+WiFi</button>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${checkoutReminders.length ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#FF385C;margin-bottom:8px;">
            📤 Checkout Reminder (${checkoutReminders.length}) — Leaving today
          </div>
          ${checkoutReminders.map(b => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
              <div style="flex:1;">
                <strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}
                <br><small style="color:var(--muted);">📞 ${b.phone} · Checkout: ${b.check_out_time || '11:00 AM'}</small>
              </div>
              <button class="btn-sm" style="background:#FF385C;color:#fff;" onclick="sendCheckoutReminder('${b.booking_id}')">🔔 Checkout Alert</button>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${noIdBookings.length ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#FFB800;margin-bottom:8px;">
            🪪 ID Missing (${noIdBookings.length}) — Currently staying without ID
          </div>
          ${noIdBookings.map(b => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
              <div style="flex:1;">
                <strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}
                <br><small style="color:var(--muted);">📞 ${b.phone} · Guests: ${b.guests || 1}</small>
              </div>
              <button class="btn-sm" style="background:#FFB800;color:#fff;" onclick="requestGuestID('${b.booking_id}')">🪪 Ask ID</button>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${reviewRequests.length ? `
        <div style="margin-bottom:8px;">
          <div style="font-size:13px;font-weight:700;color:#722ED1;margin-bottom:8px;">
            ⭐ Review Request (${reviewRequests.length}) — Checked out yesterday
          </div>
          ${reviewRequests.map(b => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
              <div style="flex:1;">
                <strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}
                <br><small style="color:var(--muted);">📞 ${b.phone} · Stay: ${b.check_in} → ${b.check_out}</small>
              </div>
              <button class="btn-sm" style="background:#722ED1;color:#fff;" onclick="requestReview('${b.booking_id}')">⭐ Review Link</button>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
          💡 Tip: Only send reviews to happy guests (5★ potential)
        </div>
      </div>
      `;
    })()}

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

  const bName = b => `${propLabel(b.rooms) || b.room_id}`;
  const fName = fl => `${propLabel(fl.rooms) || fl.room_id}`;

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
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️ No Properties</h1><div class="error">No properties assigned. Contact admin.</div><button onclick="logout()">Logout</button></div></div>`;
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
      <h1>🏠 My Properties</h1>
      <div class="sub">👋 ${emp.name} — ${myRoomIds.length} properties assigned</div>
      <div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${checkins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${checkins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
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
            <strong>${x.guest_name}</strong> — ${bName(x)}<br>
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

    <div class="card" style="background:#F7F7F7;">
      <div class="section-title">🏠 My Assigned Properties</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${allFlats.map(f => `
          <span class="badge ${f.status === 'Booked' ? 'blue' : 'green'}">
            ${fName(f)} - ${f.status}
          </span>
        `).join('')}
      </div>
    </div>
  `, 'dashboard');
}


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
    // Show bookings that received payment today (not by check-in date)
    SESSION.bookingDateFilter = '';
    SESSION.bookingPayFilter = '';
    SESSION.bookingSearch = '';
    SESSION.bookingPeriod = '';
    // Set flag to filter by payment date
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
