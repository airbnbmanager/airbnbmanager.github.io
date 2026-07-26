/**
 * Bookings Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ GUEST LEDGER ============
async function showGuestLedger(guestName) {
  const {data:bookings} = await sb.from('guest_register')
    .select('*, rooms(nickname, unit_no)')
    .ilike('guest_name', `%${guestName}%`)
    .order('check_in', {ascending:false});

  if (!bookings || !bookings.length) { fsn.info('Info', 'No bookings found for: ' + guestName); return; }

  const bkIds = bookings.map(b => b.booking_id);
  const {data:payments} = await sb.from('payment_history')
    .select('booking_id, amount, payment_mode, payment_date')
    .in('booking_id', bkIds);

  const payMap = {};
  (payments || []).forEach(p => { payMap[p.booking_id] = (payMap[p.booking_id] || 0) + (p.amount || 0); });

  const totalAmount = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + (payMap[b.booking_id] || 0), 0);
  const totalDue = totalAmount - totalPaid;
  const totalNights = bookings.reduce((s, b) => {
    if (b.check_in && b.check_out) return s + calcNights(b.check_in, b.check_out);
    return s;
  }, 0);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>👤 Guest Ledger — ${guestName}</h2>
      <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);margin:12px 0;">
        <div class="stat-card" style="border-left:4px solid var(--blue);"><div class="stat-num">${bookings.length}</div><div class="stat-label">Stays</div></div>
        <div class="stat-card" style="border-left:4px solid var(--green);"><div class="stat-num">${totalNights}</div><div class="stat-label">Nights</div></div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--border);margin:0 0 12px;">
        <div class="metric-row"><span class="metric-label">Total Billed</span><span class="metric-value">₹${totalAmount.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Total Paid</span><span class="metric-value" style="color:var(--green);">₹${totalPaid.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Total Due</span><span class="metric-value${totalDue > 0 ? ' warn' : ''}">₹${totalDue.toLocaleString('en-IN')}</span></div>
        ${totalDue > 0
          ? `<div style="margin-top:8px;padding:8px;background:#FDE8E8;border-radius:8px;font-size:12px;color:var(--red);">⚠️ ₹${totalDue.toLocaleString('en-IN')} pending</div>`
          : `<div style="margin-top:8px;padding:8px;background:#DEF7EC;border-radius:8px;font-size:12px;color:var(--green);">✅ All clear</div>`}
      </div>
      <div class="section-title">Booking History</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
        <tbody>${bookings.map(b => {
          const pd = payMap[b.booking_id] || 0;
          const due = (b.total_amount || 0) - pd;
          return `<tr>
            <td>${propLabel(b.rooms) || b.room_id || '-'}</td>
            <td><span class="badge ${b.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${b.booking_mode === 'Online-Airbnb' ? 'On' : 'Off'}</span></td>
            <td>${b.check_in || '-'}</td><td>${b.check_out || '-'}</td>
            <td>₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
            <td style="color:var(--green);">₹${pd.toLocaleString('en-IN')}</td>
            <td class="${due > 0 ? 'metric-value warn' : ''}">₹${due.toLocaleString('en-IN')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="section-title" style="margin-top:12px;">Payment Log</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th></tr></thead>
        <tbody>${(payments || []).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')).map(p => `<tr>
          <td>${p.payment_date || '-'}</td>
          <td>₹${(p.amount || 0).toLocaleString('en-IN')}</td>
          <td>${p.payment_mode || '-'}</td>
        </tr>`).join('') || '<tr><td colspan="3" class="sub">No payments</td></tr>'}</tbody>
      </table></div>
      <div class="btn-row" style="margin-top:12px;">
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ============ ID BUTTON BUILDER ============
function buildIdButtons(b) {
  const fp = parseIdPathArray(b.id_proof_front_paths).filter(Boolean);
  const bp = parseIdPathArray(b.id_proof_back_paths).filter(Boolean);
  const ap = [...new Set((b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean))];
  const seen = new Set();
  const allPhotos = [...fp, ...bp, ...ap].filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });

  if (!allPhotos.length) return '<small style="color:var(--red);">❌ No ID</small>';

  const count = allPhotos.length;
  // Count front/back per guest
  const frontCount = {};
  const backCount = {};

  return `<span style="font-size:10px;color:var(--green);font-weight:600;">✅ ${count}</span> ` +
    allPhotos.map((p, i) => {
      let label;
      if (fp.includes(p)) {
        const idx = fp.indexOf(p) + 1;
        label = 'F' + idx;
      } else if (bp.includes(p)) {
        const idx = bp.indexOf(p) + 1;
        label = 'B' + idx;
      } else {
        label = 'ID' + (i + 1);
      }
      return `<button class="btn-sm outline" style="padding:1px 5px;font-size:9px;min-height:20px;margin:1px;" onclick="dlIdPhoto('${p}')">${label}</button>`;
    }).join('');
}

// ============ MANAGE BOOKINGS ============
async function renderManageBookings() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');

  // For caretaker/checkin_manager - filter to only their properties
  if (['caretaker', 'checkin_manager'].includes(SESSION.role) && SESSION.empId) {
    const { data: emp } = await sb.from('employees')
      .select('assigned_rooms')
      .eq('emp_id', SESSION.empId).single();
    if (emp?.assigned_rooms) {
      window._myAssignedRooms = emp.assigned_rooms.split(',').map(r => r.trim()).filter(Boolean);
    }
  }

  // Fetch payments for filter
  const { data: allPays } = await sb.from('payment_history').select('booking_id, amount, payment_date');
  const paidMap = {};
  (allPays || []).forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });
  window._bkPaidMap = paidMap;

  renderShell(`<div class="loading">Loading...</div>`, 'bookings');

  const {data:all, error} = await sb.from("guest_register")
    .select("*, rooms(unit_no, nickname, property_name)").order("check_in", {ascending:false});
  if (error) { renderShell(`<div class="error">${error.message}</div>`, 'bookings'); return; }

  const {data:rooms} = await sb.from('rooms').select('room_id, unit_no, nickname, property_name').order('unit_no');
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r; });

  const mf = SESSION.bookingFilter || 'All';
  const pf = SESSION.bookingPropFilter || '';
  const df = SESSION.bookingDateFilter || '';
  const d1 = SESSION.bookingDateFrom || '';
  const d2 = SESSION.bookingDateTo || '';
  const sq = SESSION.bookingSearch || '';

  let f = all || [];
  // Filter for caretaker - only their properties
  if (window._myAssignedRooms && window._myAssignedRooms.length) {
    f = f.filter(b => window._myAssignedRooms.includes(b.room_id));
  }

  if (mf !== 'All') f = f.filter(b => b.booking_mode === mf);
  if (pf) f = f.filter(b => b.room_id === pf);
  if (df) f = f.filter(b => b.check_in === df);
  if (d1) f = f.filter(b => b.check_in >= d1);
  if (d2) f = f.filter(b => b.check_in <= d2);
  if (sq) f = f.filter(b => (b.guest_name || '').toLowerCase().includes(sq.toLowerCase()) || (b.phone || '').includes(sq));

  // Period filter
  const period = SESSION.bookingPeriod;
  if (period) {
    const now = new Date();
    let ps, pe;
    if (period === 'thisMonth') {
      ps = new Date(now.getFullYear(), now.getMonth(), 1);
      pe = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'lastMonth') {
      ps = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      pe = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'thisQtr') {
      const q = Math.floor(now.getMonth() / 3);
      ps = new Date(now.getFullYear(), q * 3, 1);
      pe = new Date(now.getFullYear(), q * 3 + 3, 0);
    } else if (period === 'lastQtr') {
      const q = Math.floor(now.getMonth() / 3) - 1;
      const y = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const qq = q < 0 ? 3 : q;
      ps = new Date(y, qq * 3, 1);
      pe = new Date(y, qq * 3 + 3, 0);
    } else if (period === 'thisYear') {
      ps = new Date(now.getFullYear(), 0, 1);
      pe = new Date(now.getFullYear(), 11, 31);
    } else if (period === 'lastYear') {
      ps = new Date(now.getFullYear() - 1, 0, 1);
      pe = new Date(now.getFullYear() - 1, 11, 31);
    }
    if (ps && pe) {
      const psStr = ps.toISOString().slice(0, 10);
      const peStr = pe.toISOString().slice(0, 10);
      f = f.filter(b => b.check_in >= psStr && b.check_in <= peStr);
    }
  }

  // Payment date filter (from dashboard KPI click)
  if (SESSION._filterByPaymentDate) {
    const payDate = SESSION._filterByPaymentDate;
    const paidMap2 = window._bkPaidMap || {};
    // Get booking IDs that received payment on this date
    const paymentDateBkIds = new Set();
    (allPays || []).forEach(p => {
      if (p.payment_date === payDate) paymentDateBkIds.add(p.booking_id);
    });
    f = f.filter(b => paymentDateBkIds.has(b.booking_id));
    SESSION._filterByPaymentDate = null; // Clear after use
  }

  // Payment filter
  const payFilter = SESSION.bookingPayFilter;
  // No ID filter (from dashboard KPI)
  if (SESSION._filterNoId) {
    f = f.filter(b => {
      const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
      return !hasId;
    });
    SESSION._filterNoId = null;
  }

  if (payFilter) {
    // Get all payments for these bookings
    const bookingIds = f.map(b => b.booking_id);
    const paidMap = window._bkPaidMap || {};

    if (payFilter === 'zero') {
      f = f.filter(b => (b.total_amount || 0) === 0);
    } else if (payFilter === 'unpaid') {
      f = f.filter(b => (paidMap[b.booking_id] || 0) === 0 && (b.total_amount || 0) > 0);
    } else if (payFilter === 'partial') {
      f = f.filter(b => {
        const paid = paidMap[b.booking_id] || 0;
        const total = b.total_amount || 0;
        return paid > 0 && paid < total;
      });
    } else if (payFilter === 'paid') {
      f = f.filter(b => {
        const paid = paidMap[b.booking_id] || 0;
        const total = b.total_amount || 0;
        return total > 0 && paid >= total;
      });
    } else if (payFilter === 'due') {
      f = f.filter(b => {
        const paid = paidMap[b.booking_id] || 0;
        const total = b.total_amount || 0;
        return total > 0 && (total - paid) > 0;
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  f.sort((a, b2) => {
    const aA = a.check_in <= today && a.check_out > today;
    const bA = b2.check_in <= today && b2.check_out > today;
    const aT = a.check_out === today, bT = b2.check_out === today;
    const aF = a.check_in > today, bF = b2.check_in > today;
    if (aA && !bA) return -1; if (!aA && bA) return 1;
    if (aT && !bT) return -1; if (!aT && bT) return 1;
    if (aF && !bF) return -1; if (!aF && bF) return 1;
    return (b2.check_in || '').localeCompare(a.check_in || '');
  });

  const overlaps = findOverlappingBookings(all || []);
  const pm = await getPaidMap(f.map(b => b.booking_id));
  const canM = ['owner','admin','viewer','manager','moderator','developer'].includes(SESSION.role);
  const canD = ['developer'].includes(SESSION.role);

  renderShell(`
    <div class="card">
      <h1>📅 Bookings</h1>
      <div class="sub">${f.length} bookings ${sq ? 'matching "' + sq + '"' : ''}</div>
      ${canM ? `<button onclick="renderAddBooking()">➕ New Booking</button>` : ''}
    </div>

    ${overlaps.length ? `<div class="card"><div class="error"><strong>⚠️ Overlapping (${overlaps.length})</strong><br>
      ${overlaps.slice(0, 5).map(o => `<div style="margin:4px 0;font-size:12px;"><strong>${o.roomId}</strong> — ${o.a.guest_name || '-'} ↔ ${o.b.guest_name || '-'}</div>`).join('')}
    </div></div>` : ''}

    <div class="card">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="bkSearch" placeholder="Search guest name or phone..." value="${sq}"
          oninput="SESSION.bookingSearch=this.value; clearTimeout(window._searchTimer); window._searchTimer=setTimeout(()=>renderManageBookings(),600);" />
        ${sq ? `<button class="outline btn-sm" onclick="SESSION.bookingSearch='';renderManageBookings();" style="min-height:30px;padding:4px 8px;">✕</button>` : ''}
      </div>
      <div class="section-title">Filters</div>
      <div class="filter-bar">
        <div class="filter-item"><label>Period</label>
          <select id="fPeriod" onchange="onPeriodChg()">
            <option value="">Custom</option>
            <option value="thisMonth" ${SESSION.bookingPeriod === 'thisMonth' ? 'selected' : ''}>This Month</option>
            <option value="lastMonth" ${SESSION.bookingPeriod === 'lastMonth' ? 'selected' : ''}>Last Month</option>
            <option value="thisQtr" ${SESSION.bookingPeriod === 'thisQtr' ? 'selected' : ''}>This Quarter</option>
            <option value="lastQtr" ${SESSION.bookingPeriod === 'lastQtr' ? 'selected' : ''}>Last Quarter</option>
            <option value="thisYear" ${SESSION.bookingPeriod === 'thisYear' ? 'selected' : ''}>This Year</option>
            <option value="lastYear" ${SESSION.bookingPeriod === 'lastYear' ? 'selected' : ''}>Last Year</option>
          </select>
        </div>
        <div class="filter-item"><label>Payment</label>
          <select id="fPayStatus">
            <option value="">All Payments</option>
            <option value="unpaid" ${SESSION.bookingPayFilter === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
            <option value="partial" ${SESSION.bookingPayFilter === 'partial' ? 'selected' : ''}>⚠️ Partial</option>
            <option value="paid" ${SESSION.bookingPayFilter === 'paid' ? 'selected' : ''}>✅ Fully Paid</option>
            <option value="zero" ${SESSION.bookingPayFilter === 'zero' ? 'selected' : ''}>🔴 ₹0 Amount</option>
            <option value="due" ${SESSION.bookingPayFilter === 'due' ? 'selected' : ''}>💰 Has Balance Due</option>
          </select>
        </div>
        <div class="filter-item"><label>Mode</label><select id="fMode">
          <option value="All" ${mf === 'All' ? 'selected' : ''}>All</option>
          <option value="Online-Airbnb" ${mf === 'Online-Airbnb' ? 'selected' : ''}>Online</option>
          <option value="Offline" ${mf === 'Offline' ? 'selected' : ''}>Offline</option>
        </select></div>
        <div class="filter-item"><label>Property</label><select id="fProp">
          <option value="">All</option>
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${pf === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
        </select></div>
        <div class="filter-item"><label>Date</label><input type="date" id="fDate" value="${df}" /></div>
        <div class="filter-item"><label>From</label><input type="date" id="fFrom" value="${d1}" /></div>
        <div class="filter-item"><label>To</label><input type="date" id="fTo" value="${d2}" /></div>
        <div class="filter-item" style="flex-direction:row;gap:4px;align-items:flex-end;">
          <button class="btn-sm" onclick="applyBkFilters()">Apply</button>
          <button class="btn-sm" style="background:#00A699;" onclick="exportBookingsPDF()">📄 Export PDF</button>
          <button class="btn-sm outline" onclick="clearBkFilters()">Clear</button>
        </div>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Status</th><th>Guest</th><th>Property</th><th>Mode</th>
        <th>In</th><th>Out</th><th>ID</th><th>Total</th><th>Paid</th><th>Due</th>
        ${canM ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${f.map(b => {
        const pd = pm[b.booking_id] || 0;
        const bal = (b.total_amount || 0) - pd;
        const isActive = b.check_in <= today && b.check_out > today;
        const isCheckoutToday = b.check_out === today;
        const isPast = b.check_out < today;
        const isOpenEnded = b.checkout_confirmed === false;

        const statusBadge = isActive
          ? (isOpenEnded ? '<span class="badge yellow">🔄 Open</span>' : '<span class="badge green">🟢 Active</span>')
          : isCheckoutToday ? '<span class="badge yellow">📤 Today</span>'
          : isPast ? '<span class="badge" style="background:#F3F4F6;color:#6B7280;">Done</span>'
          : '<span class="badge blue">Upcoming</span>';

        const rowBg = isActive ? 'background:#f0fff4;' : isCheckoutToday ? 'background:#fffbeb;' : '';

        return `<tr style="${rowBg}">
          <td>${statusBadge}</td>
          <td>
            <strong style="cursor:pointer;text-decoration:underline;color:var(--blue);"
              onclick="showGuestLedger('${(b.guest_name || '').replace(/'/g, "\\'")}')">${b.guest_name || '-'}</strong><br>
            <small style="color:var(--muted);">${b.phone || ''}</small>
            ${b.has_vehicle ? `<br><small>🚗 ${b.vehicle_name || ''} ${b.vehicle_number || ''}${b.vehicle_photo_path ? ` <button class="btn-sm green-btn" style="padding:1px 6px;font-size:9px;min-height:18px;" onclick="dlIdPhoto('${b.vehicle_photo_path}')">📷</button>` : ''}</small>` : ''}
          </td>
          <td>
            <strong>${propLabel(b.rooms) || '-'}</strong><br>
            <small style="color:var(--muted);">${b.rooms?.unit_no || b.room_id}</small>
            ${b.source_room_id && b.source_room_id !== b.room_id
              ? `<br><small style="color:var(--blue);font-size:10px;">📍 ${propLabel(roomMap[b.source_room_id]) || b.source_room_id}</small>`
              : ''}
          </td>
          <td><span class="badge ${b.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${b.booking_mode === 'Online-Airbnb' ? 'On' : 'Off'}</span></td>
          <td><small>${b.check_in || '-'}</small></td>
          <td><small>${b.check_out || '-'}</small></td>
          <td>${buildIdButtons(b)}</td>
          <td><strong>₹${(b.total_amount || 0).toLocaleString('en-IN')}</strong></td>
          <td style="color:var(--green);">₹${pd.toLocaleString('en-IN')}</td>
          <td><strong class="${bal > 0.99 ? 'metric-value warn' : ''}">₹${Math.abs(bal) < 1 ? '0' : bal.toLocaleString('en-IN')}</strong></td>
          ${canM ? `<td class="table-actions">
            <button class="btn-sm" onclick="editBooking('${b.booking_id}')">✏️</button>
            <button class="btn-sm secondary" onclick="showPaymentModal('${b.booking_id}')">💰</button>
            <button class="btn-sm outline" onclick="createOfflineExtension('${b.booking_id}')">➕</button>
            ${isActive ? `<button class="btn-sm secondary" onclick="quickCheckout('${b.booking_id}','${b.room_id}')">📤</button>` : ''}
            ${isCheckoutToday ? `<button class="btn-sm" style="background:#f59e0b;" onclick="sendCheckoutReminder('${b.booking_id}')">🔔</button>` : ''}
            <button class="btn-sm outline" onclick="shareBookingWhatsApp('${b.booking_id}')" title="Welcome">📱</button>
            <button class="btn-sm" style="background:#128C7E;color:#fff;" onclick="showWATemplatesMenu('${b.booking_id}',this)" title="Templates">💬</button>
            <button class="btn-sm" style="background:#FFB800;color:#fff;" onclick="requestGuestID('${b.booking_id}')" title="Request ID">🪪</button>
            <button class="btn-sm" style="background:#00A699;color:#fff;" onclick="sendCheckinReminder('${b.booking_id}')" title="Check-in reminder">📅</button>
            <button class="btn-sm" style="background:${b.booking_mode === 'Online-Airbnb' ? '#FF385C' : '#4285F4'};color:#fff;" onclick="requestReview('${b.booking_id}')" title="${b.booking_mode === 'Online-Airbnb' ? 'Airbnb Review ⭐' : 'Google Review ⭐'}">⭐</button>
            ${canD ? `<button class="btn-sm danger" onclick="delBooking('${b.booking_id}','${(b.guest_name || '').replace(/'/g, "\\'")}','${b.room_id}')">🗑️</button>` : ''}
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'bookings');
}

function applyBkFilters() {
  SESSION.bookingPeriod = document.getElementById('fPeriod')?.value || '';
  SESSION.bookingPayFilter = document.getElementById('fPayStatus')?.value || '';
  SESSION.bookingFilter = document.getElementById('fMode').value;
  SESSION.bookingPropFilter = document.getElementById('fProp').value;
  SESSION.bookingDateFilter = document.getElementById('fDate').value;
  SESSION.bookingDateFrom = document.getElementById('fFrom').value;
  SESSION.bookingDateTo = document.getElementById('fTo').value;
  renderManageBookings();
}

function clearBkFilters() {
  SESSION.bookingFilter = 'All'; SESSION.bookingPropFilter = '';
  SESSION.bookingPeriod = ''; SESSION.bookingPayFilter = '';
  SESSION.bookingDateFilter = ''; SESSION.bookingDateFrom = ''; SESSION.bookingDateTo = '';
  SESSION.bookingSearch = '';
  renderManageBookings();
}

// ============ ADD BOOKING ============
async function renderAddBooking() {
  const pre = window._bookingPrefill || {};
  const {data:rooms} = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name, bookable, checkin_manager, caretaker_phone, map_link')
    .order('room_id');
  window._roomsCache = rooms || [];

  let idSlots = '';
  for (let i = 1; i <= 8; i++) {
    idSlots += `
      <div style="padding:10px;margin-bottom:8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;">
          👤 Guest ${i} ${i === 1 ? '(Primary)' : ''}
        </div>
        <input type="text" id="gN${i}" placeholder="Guest ${i} naam"
          value="${i === 1 ? (pre.guestName || '') : ''}"
          style="font-size:13px;min-height:36px;margin-bottom:8px;width:100%;" />
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Front</div>
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('idFrontCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('idFrontGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="idFrontCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdFileSelect(this,${i},'front')" />
            <input type="file" id="idFrontGal${i}" accept="image/*" style="display:none;" onchange="onIdFileSelect(this,${i},'front')" />
            <div id="previewFront${i}" style="margin-top:4px;"></div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Back</div>
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('idBackCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('idBackGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="idBackCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdFileSelect(this,${i},'back')" />
            <input type="file" id="idBackGal${i}" accept="image/*" style="display:none;" onchange="onIdFileSelect(this,${i},'back')" />
            <div id="previewBack${i}" style="margin-top:4px;"></div>
          </div>
        </div>
      </div>`;
  }

  const idSummaryHtml = '<div id="idUploadSummary"></div>';

  renderShell(`
    <div class="card">
      <h1>➕ New Booking</h1>
      <button class="secondary btn-sm" onclick="window._bookingPrefill=null;renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <input type="hidden" id="parentBookingId" value="${pre.parentBookingId || ''}" />
      <input type="hidden" id="stayGroupId" value="${pre.stayGroupId || ''}" />
      ${pre.parentBookingId ? `<div class="success-msg" style="margin-bottom:10px;">Extension of <strong>${pre.parentBookingId}</strong></div>` : ''}

      <div class="form-grid">
        <div class="form-group"><label>Guest Name *</label><input id="guestName" placeholder="Guest ka naam" value="${pre.guestName || ''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" type="tel" placeholder="Mobile" value="${pre.guestPhone || ''}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Property *</label>
          <select id="roomId" onchange="onRoomChg()">
            <option value="">Select</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${pre.roomId === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
          <div id="roomInfo" style="font-size:11px;color:var(--muted);margin-top:2px;"></div>
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select id="bookingMode" onchange="onModeChg()">
            <option value="Offline" ${(pre.bookingMode || 'Offline') === 'Offline' ? 'selected' : ''}>Offline</option>
            <option value="Online-Airbnb" ${(pre.bookingMode || '') === 'Online-Airbnb' ? 'selected' : ''}>Online (Airbnb)</option>
          </select>
        </div>
      </div>

      <div id="onlineBox" style="display:none;background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="section-title">🌐 Source Listing</div>
        <div class="form-group">
          <label>Original Listing (agar shift hua)</label>
          <select id="sourceRoomId">
            <option value="">Same as actual</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${(pre.sourceRoomId || '') === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Check-in Date</label><input id="checkIn" type="date" onchange="onRoomChg()" value="${pre.checkIn || ''}" /></div>
        <div class="form-group"><label>Check-in Time</label><input id="checkInTime" type="time" value="${pre.checkInTime || '14:00'}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Check-out Date</label><input id="checkOut" type="date" onchange="onRoomChg()" value="${pre.checkOut || ''}" /></div>
        <div class="form-group"><label>Check-out Time</label><input id="checkOutTime" type="time" value="${pre.checkOutTime || '11:00'}" /></div>
      </div>
      <div id="nightsInfo" style="font-size:12px;color:var(--muted);margin-bottom:6px;"></div>

      <div class="form-grid">
        <div class="form-group">
          <label>Checkout Type</label>
          <select id="checkoutConfirmed">
            <option value="yes" ${(pre.checkoutConfirmed || 'yes') === 'yes' ? 'selected' : ''}>Fixed Date</option>
            <option value="no" ${pre.checkoutConfirmed === 'no' ? 'selected' : ''}>Open — Per Day</option>
          </select>
        </div>
        <div class="form-group"><label>Guests</label>
          <input id="guests" type="number" value="${pre.guests || 1}" min="1" max="8"
            onchange="showIdSlots()" oninput="showIdSlots()" />
        </div>
      </div>

      <!-- OFFLINE: Total Amount + per day auto calc -->
      <div id="offlineAmtBox">
        <div class="form-grid">
          <div class="form-group">
            <label>Total Amount ₹ *</label>
            <input id="totalAmount" type="number" placeholder="Total kitne me book hua"
              oninput="onAmtChg()" value="${pre.totalAmount || ''}" />
            <div id="sugInfo" style="font-size:11px;color:var(--muted);"></div>
          </div>
          <div class="form-group">
            <label>Per Day Rate ₹ (auto)</label>
            <input id="perDayRate" type="number" placeholder="Auto from total ÷ nights" readonly
              style="background:#f5f5f5;color:var(--muted);" value="${pre.perDayRate || ''}" />
          </div>
        </div>
      </div>

      <!-- ONLINE: Total Amount + per day auto calc -->
      <div id="onlineAmtBox" style="display:none;">
        <div class="form-grid">
          <div class="form-group">
            <label>Total Amount ₹ * (Net Payout)</label>
            <input id="totalAmountOnline" type="number" placeholder="Jo bank me aaya"
              oninput="onAmtChg()" value="${pre.totalAmount || ''}" />
          </div>
          <div class="form-group">
            <label>Per Day Rate ₹ (auto)</label>
            <input id="perDayRateOnline" type="number" placeholder="Auto calc" readonly
              style="background:#f5f5f5;color:var(--muted);" value="${pre.perDayRate || ''}" />
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Advance ₹</label>
          <input id="advanceAmt" type="number" value="${pre.advanceAmt || 0}" oninput="onAmtChg()" />
        </div>
        <div class="form-group"><label>Advance Mode</label>
          <select id="advMode">
            <option value="">--</option>
            <option value="Cash" ${pre.advMode === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="UPI" ${pre.advMode === 'UPI' ? 'selected' : ''}>UPI</option>
            <option value="Bank" ${pre.advMode === 'Bank' ? 'selected' : ''}>Bank</option>
            <option value="Airbnb Payout" ${pre.advMode === 'Airbnb Payout' ? 'selected' : ''}>Airbnb Payout</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Advance Date</label>
        <input id="advDate" type="date" value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <div id="balInfo" style="font-size:13px;font-weight:600;margin:2px 0 8px;"></div>

      <!-- VEHICLE -->
      <div class="form-grid">
        <div class="form-group">
          <label>Vehicle?</label>
          <select id="hasVehicle" onchange="toggleVehicle()">
            <option value="false" ${pre.hasVehicle ? '' : 'selected'}>No</option>
            <option value="true" ${pre.hasVehicle ? 'selected' : ''}>Yes</option>
          </select>
        </div>
      </div>
      <div id="vehicleBox" style="display:${pre.hasVehicle ? 'block' : 'none'};">
        <div class="form-grid">
          <div class="form-group"><label>Vehicle Name</label>
            <input id="vehicleName" placeholder="e.g. Swift Dzire" value="${pre.vehicleName || ''}" />
          </div>
          <div class="form-group"><label>Registration No.</label>
            <input id="vehicleNumber" placeholder="e.g. UP32 XX 1234" value="${pre.vehicleNumber || ''}" />
          </div>
        </div>
        <div class="form-group">
          <label>Vehicle Photo (Optional)</label>
          <input type="file" id="vehiclePhoto" accept="image/*" capture="environment"
            style="font-size:12px;" onchange="onVehiclePhotoSelect(this)" />
          <div id="vehiclePhotoPreview" style="margin:4px 0;"></div>
        </div>
      </div>

      <!-- ID PROOF -->
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:6px;">
        <div class="section-title">🪪 ID Proof (Front & Back)</div>
        <div class="form-grid">
          <div class="form-group"><label>ID Type</label>
            <select id="idType">
              <option value="Aadhar" selected>Aadhar</option>
              <option value="PAN">PAN</option>
              <option value="DL">DL</option>
              <option value="Passport">Passport</option>
            </select>
          </div>
          <div class="form-group"><label>ID Number</label>
            <input id="idNo" placeholder="e.g. 1234 5678 9012" value="${pre.idNo || ''}" />
          </div>
        </div>
        <div class="id-grid">${idSlots}</div>
      </div>

      <div class="form-group" style="margin-top:10px;">
        <label>Notes</label>
        <textarea id="bkNotes" placeholder="Special notes...">${pre.bkNotes || ''}</textarea>
      </div>
      <button id="saveBtn" onclick="saveBooking()" style="width:100%;padding:14px;font-size:15px;margin-top:10px;">
        💾 Save Booking
      </button>
      <div id="addBkErr"></div>
    </div>
  `, 'bookings');

  onModeChg(); onRoomChg(); showIdSlots();
}

// ============ BOOKING HELPERS ============
function showIdSlots() {
  const n = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  for (let i = 1; i <= 8; i++) {
    const el = document.getElementById(`idSlot${i}`);
    if (el) el.style.display = i <= n ? 'block' : 'none';
  }
}

function showEditIdSlots() {
  const n = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  for (let i = 1; i <= 8; i++) {
    const el = document.getElementById(`editIdSlot${i}`);
    if (el) el.style.display = i <= n ? 'block' : 'none';
  }
}


// ============ VEHICLE PHOTO HANDLER ============
function onVehiclePhotoPick(src, mode = 'new') {
  const prefix = mode === 'edit' ? 'editVehicle' : 'vehicle';
  const inp = document.getElementById(src === 'cam' ? `${prefix}PhotoCam` : `${prefix}PhotoGal`);
  const preview = document.getElementById('vehiclePhotoPreview');
  if (!inp?.files?.[0] || !preview) return;

  openCropModal(inp.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    inp.files = dt.files;
    const url = URL.createObjectURL(croppedFile);
    const sizeMB = (croppedFile.size / 1024 / 1024).toFixed(1);
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:6px 0;">
        <img src="${url}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;" />
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--green);font-weight:700;">✅ Ready</div>
          <div style="font-size:10px;color:var(--muted);">${sizeMB} MB</div>
        </div>
        <button type="button" class="btn-sm outline" style="padding:4px 10px;font-size:11px;"
          onclick="onVehiclePhotoPick('gal','${mode}')">✂️ Re-crop</button>
        <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
          onclick="document.getElementById('${prefix}PhotoCam').value='';document.getElementById('${prefix}PhotoGal').value='';document.getElementById('vehiclePhotoPreview').innerHTML='';">🗑️</button>
      </div>`;
  });
}

function toggleVehicle() {
  const hasV = document.getElementById('hasVehicle')?.value === 'true';
  const box = document.getElementById('vehicleBox');
  if (box) box.style.display = hasV ? 'block' : 'none';
}

function onModeChg() {
  const m = document.getElementById('bookingMode')?.value;
  const isOnline = m === 'Online-Airbnb';

  // Toggle source listing box
  const onlineBox = document.getElementById('onlineBox');
  if (onlineBox) onlineBox.style.display = isOnline ? 'block' : 'none';

  // Toggle amount boxes
  const offBox = document.getElementById('offlineAmtBox');
  const onBox = document.getElementById('onlineAmtBox');
  if (offBox) offBox.style.display = isOnline ? 'none' : 'block';
  if (onBox) onBox.style.display = isOnline ? 'block' : 'none';

  if (isOnline) {
    const rid = document.getElementById('roomId')?.value;
    const src = document.getElementById('sourceRoomId');
    if (src && !src.value && rid) src.value = rid;
    // Online: auto fill advance = total
    const tot = parseFloat(document.getElementById('totalAmountOnline')?.value) || 0;
    if (tot > 0) {
      const advEl = document.getElementById('advanceAmt');
      if (advEl) advEl.value = tot;
    }
  }
  onAmtChg();
}

function onRoomChg() {
  const rid = document.getElementById('roomId')?.value;
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const room = (window._roomsCache || []).find(r => r.room_id === rid);
  const rInfo = document.getElementById('roomInfo');
  if (room) rInfo.innerHTML = `${room.bookable ? '✅' : '⚠️'} · ${room.checkin_manager || 'No manager'}`;
  else if (rInfo) rInfo.innerHTML = '';

  const mode = document.getElementById('bookingMode')?.value;
  const src = document.getElementById('sourceRoomId');
  if (mode === 'Online-Airbnb' && src && !src.value && rid) src.value = rid;

  const nInfo = document.getElementById('nightsInfo');
  if (ci && co) {
    const nights = calcNights(ci, co);
    if (nInfo) nInfo.innerHTML = nights > 0
      ? `🌙 <strong>${nights} night(s)</strong>`
      : `<span style="color:var(--red);">Invalid dates</span>`;
  } else if (nInfo) nInfo.innerHTML = '';

  onAmtChg();
}

function onRateChg() {
  // Not used directly — kept for compatibility
}

function onAmtChg() {
  const mode = document.getElementById('bookingMode')?.value;
  const isOnline = mode === 'Online-Airbnb';

  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = calcNights(ci, co);

  let total = 0;

  if (isOnline) {
    // Online: user enters total (net payout) → per day auto calc → advance = total
    total = parseFloat(document.getElementById('totalAmountOnline')?.value) || 0;
    const rateEl = document.getElementById('perDayRateOnline');
    if (rateEl && total > 0 && nights > 0) {
      rateEl.value = Math.round(total / nights);
    }
    const advEl = document.getElementById('advanceAmt');
    if (advEl && total > 0) advEl.value = total;

  } else {
    // Offline: user enters total → per day auto calc
    total = parseFloat(document.getElementById('totalAmount')?.value) || 0;
    const rateEl = document.getElementById('perDayRate');
    if (rateEl && total > 0 && nights > 0) {
      rateEl.value = Math.round(total / nights);
    }
  }

  const adv = parseFloat(document.getElementById('advanceAmt')?.value) || 0;
  const bal = total - adv;
  const el = document.getElementById('balInfo');
  if (el) {
    if (total > 0) el.innerHTML = bal > 0
      ? `<span style="color:var(--red);">💳 Balance: ₹${bal.toLocaleString('en-IN')}</span>`
      : `<span style="color:var(--green);">✅ Fully Paid</span>`;
    else el.innerHTML = '';
  }

  // Update sugInfo for offline
  if (!isOnline && total > 0 && nights > 0) {
    const rate = Math.round(total / nights);
    const sugInfo = document.getElementById('sugInfo');
    if (sugInfo) sugInfo.innerHTML = `💡 ₹${rate.toLocaleString('en-IN')}/night × ${nights} nights = ₹${total.toLocaleString('en-IN')}`;
  }
}

// ============ ROBUST FILE UPLOAD HELPERS ============


// ═══════════════════════════════════════════════════════════
// 🔒 STABLE - DO NOT MODIFY (ID Upload Fixed 2026-07-26)
// Uses window._editIdFiles map + maxGuestWithFile loop
// Works for all 8 guests, mobile crop, DataTransfer fallback
// ═══════════════════════════════════════════════════════════
function onEditIdFileSelect(input, guestNum, side) {
  if (!input.files || !input.files[0]) return;
  const originalFile = input.files[0];

  openCropModal(originalFile, (croppedFile) => {
    if (!window._editIdFiles) window._editIdFiles = {};
    const key = `${side}_${guestNum}`;
    window._editIdFiles[key] = croppedFile;

    try {
      const dt = new DataTransfer();
      dt.items.add(croppedFile);
      input.files = dt.files;
    } catch(e) {}

    showEditPreview(input, guestNum, side);
  });
}

function showEditPreview(input, guestNum, side) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const sideLabel = side === 'front' ? 'Front' : 'Back';
  const previewEl = document.getElementById(`ePreview${sideLabel}${guestNum}`);
  const reader = new FileReader();
  reader.onload = function(e) {
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:4px 0;">
          <img src="${e.target.result}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-size:11px;color:var(--green);font-weight:700;">✅ New ${sideLabel} Ready</div>
            <div style="font-size:10px;color:var(--muted);">${sizeMB} MB · Save to upload</div>
          </div>
        </div>`;
    }
  };
  reader.readAsDataURL(file);
}

function onIdFileSelect(input, guestNum, side) {
  const previewEl = document.getElementById(`preview${side === 'front' ? 'Front' : 'Back'}${guestNum}`);
  const slot = document.getElementById(`idSlot${guestNum}`);

  if (!input.files || !input.files[0]) {
    if (previewEl) previewEl.innerHTML = '';
    return;
  }

  // Open crop modal
  openCropModal(input.files[0], (croppedFile) => {
    // Replace input's file with cropped version
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    input.files = dt.files;
    showIdPreview(input, guestNum, side);
  });
}

function showIdPreview(input, guestNum, side) {
  const previewEl = document.getElementById(`preview${side === 'front' ? 'Front' : 'Back'}${guestNum}`);
  const slot = document.getElementById(`idSlot${guestNum}`);
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const sideLabel = side === 'front' ? 'Front' : 'Back';

  const reader = new FileReader();
  reader.onload = function(e) {
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:4px 0;">
          <img src="${e.target.result}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-size:11px;color:var(--green);font-weight:700;">✅ ${sideLabel} Ready</div>
            <div style="font-size:10px;color:var(--muted);">${sizeMB} MB · Will compress on upload</div>
          </div>
          <button type="button" class="btn-sm danger" style="min-height:24px;padding:2px 8px;font-size:10px;"
            onclick="clearIdFile(${guestNum},'${side}')">✕</button>
        </div>`;
    }
    if (slot) {
      slot.classList.add('done');
      slot.style.borderColor = 'var(--green)';
    }
    updateIdUploadSummary();
  };
  reader.readAsDataURL(file);
}

function clearIdFile(guestNum, side) {
  const prefix = side === 'front' ? 'idFront' : 'idBack';
  const cam = document.getElementById(`${prefix}Cam${guestNum}`);
  const gal = document.getElementById(`${prefix}Gal${guestNum}`);
  const previewId = `preview${side === 'front' ? 'Front' : 'Back'}${guestNum}`;
  if (cam) cam.value = '';
  if (gal) gal.value = '';
  const preview = document.getElementById(previewId);
  if (preview) preview.innerHTML = '';
  updateIdUploadSummary();
}

function updateIdUploadSummary() {
  const el = document.getElementById('idUploadSummary');
  if (!el) return;
  const cnt = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  let ready = 0, total = 0;
  for (let i = 1; i <= 8; i++) {
    const fc = document.getElementById(`idFrontCam${i}`);
    const fg = document.getElementById(`idFrontGal${i}`);
    const bc = document.getElementById(`idBackCam${i}`);
    const bg = document.getElementById(`idBackGal${i}`);
    total += 2;
    if (fc?.files?.length || fg?.files?.length) ready++;
    if (bc?.files?.length || bg?.files?.length) ready++;
  }
  const pct = total > 0 ? Math.round(ready / total * 100) : 0;
  const color = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--yellow)' : 'var(--red)';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg);border-radius:8px;margin:8px 0;">
      <div style="flex:1;">
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
        </div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${color};">${ready}/${total} photos · ${pct}%</span>
    </div>`;
}

function onVehiclePhotoSelect(input) {
  const previewEl = document.getElementById('vehiclePhotoPreview');
  if (!input.files || !input.files[0]) {
    if (previewEl) previewEl.innerHTML = '';
    return;
  }

  openCropModal(input.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    input.files = dt.files;
    showVehiclePreview(input);
  });
}

function showVehiclePreview(input) {
  const previewEl = document.getElementById('vehiclePhotoPreview');
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const reader = new FileReader();
  reader.onload = function(e) {
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:6px 0;">
          <img src="${e.target.result}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-size:12px;color:var(--green);font-weight:700;">✅ Vehicle Photo Ready</div>
            <div style="font-size:10px;color:var(--muted);">${sizeMB} MB</div>
          </div>
          <button type="button" class="btn-sm outline" style="padding:4px 10px;font-size:11px;"
            onclick="reCropVehicle()">✂️ Re-crop</button>
          <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
            onclick="clearVehiclePhoto()">🗑️ Delete</button>
        </div>`;
    }
  };
  reader.readAsDataURL(file);
}

function clearVehiclePhoto() {
  const inp = document.getElementById('vehiclePhoto');
  const preview = document.getElementById('vehiclePhotoPreview');
  if (inp) inp.value = '';
  if (preview) preview.innerHTML = '';
}

function reCropVehicle() {
  const inp = document.getElementById('vehiclePhoto');
  if (!inp?.files?.[0]) return;
  openCropModal(inp.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    inp.files = dt.files;
    showVehiclePreview(inp);
  });
}

function parseIdPathArray(val) {
  if (!val) return [];
  const txt = String(val).trim();
  if (!txt) return [];
  if (txt.startsWith('[')) {
    try {
      const arr = JSON.parse(txt);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {}
  }
  return txt.split(',').filter(Boolean);
}

function stringifyIdPathArray(arr) {
  return JSON.stringify((arr || []).map(x => x || null));
}

// ============ ROBUST UPLOAD WITH RETRY & PROGRESS ============

async function robustUpload(path, blob, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await sb.storage.from('id-proofs').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600'
      });
      if (!error) return { success: true, path };
      lastError = error;
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, attempt * 800));
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, attempt * 800));
    }
  }
  return { success: false, error: lastError?.message || 'Upload failed after 3 attempts' };
}

async function smartCompress(file, targetSizeKB = 300) {
  // Progressive compression - reduces quality until under target size
  let quality = 0.8;
  let maxDim = 1200;

  // Large files get more aggressive compression
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > 5) { quality = 0.6; maxDim = 1000; }
  if (sizeMB > 10) { quality = 0.5; maxDim = 800; }

  try {
    return await compressImage(file, maxDim, quality);
  } catch (e) {
    console.warn('Compression failed, using original:', e);
    return file;
  }
}

async function uploadIdPhotos(bkId) {
  const cnt = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  const frontPaths = Array(cnt).fill(null);
  const backPaths = Array(cnt).fill(null);
  const allPaths = [];
  const failedUploads = [];

  // Collect all files to upload
  const uploadQueue = [];
  for (let i = 1; i <= cnt; i++) {
    const guestName = (document.getElementById(`gN${i}`)?.value?.trim() || `Guest${i}`)
      .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);

    const frontFile = document.getElementById(`idFrontCam${i}`)?.files?.[0]
      || document.getElementById(`idFrontGal${i}`)?.files?.[0];
    if (frontFile) uploadQueue.push({ file: frontFile, side: 'front', guestNum: i, guestName });

    const backFile = document.getElementById(`idBackCam${i}`)?.files?.[0]
      || document.getElementById(`idBackGal${i}`)?.files?.[0];
    if (backFile) uploadQueue.push({ file: backFile, side: 'back', guestNum: i, guestName });
  }

  const totalFiles = uploadQueue.length;
  if (totalFiles === 0) {
    return { frontPaths: null, backPaths: null, allPaths: null, firstPath: null };
  }

  const progressEl = document.getElementById('idUploadSummary') || document.getElementById('addBkErr');

  const renderProgress = (currentIdx, currentFile, status) => {
    if (!progressEl) return;
    const pct = totalFiles > 0 ? Math.round((currentIdx / totalFiles) * 100) : 0;

    let queueList = '';
    uploadQueue.forEach((item, i) => {
      let icon = '⏳';
      let color = '#B0B0B0';
      if (i < currentIdx) { icon = '✅'; color = '#00A699'; }
      if (i === currentIdx) { icon = status || '📤'; color = '#FF385C'; }
      queueList += `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:${i === currentIdx ? '#FFF0F3' : 'transparent'};border-radius:4px;font-size:11px;">
          <span style="color:${color};font-weight:700;">${icon}</span>
          <span style="color:${color};">Guest ${item.guestNum} ${item.side === 'front' ? 'Front' : 'Back'}</span>
          <span style="color:var(--muted);font-size:10px;margin-left:auto;">${(item.file.size/1024/1024).toFixed(1)}MB</span>
        </div>`;
    });

    progressEl.innerHTML = `
      <div style="padding:14px;background:#fff;border:2px solid #FF385C;border-radius:12px;margin:8px 0;box-shadow:0 4px 12px rgba(255,56,92,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:700;color:var(--dark);">
            📤 Uploading ID Photos...
          </div>
          <div style="font-size:13px;font-weight:700;color:#FF385C;">${currentIdx}/${totalFiles}</div>
        </div>
        <div style="height:8px;background:#EBEBEB;border-radius:4px;overflow:hidden;margin-bottom:12px;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#FF385C,#E00B41);border-radius:4px;transition:width 0.3s;"></div>
        </div>
        <div style="max-height:200px;overflow-y:auto;">
          ${queueList}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;text-align:center;">
          ${pct}% complete · Please don't close this window
        </div>
      </div>`;
  };

  for (let i = 0; i < uploadQueue.length; i++) {
    const item = uploadQueue[i];
    renderProgress(i, item, '📤');

    try {
      // Compress
      const compressed = await smartCompress(item.file);

      // Upload with retry
      const timestamp = Date.now();
      const path = `${bkId}/${timestamp}_${item.guestName}_${item.side}.jpg`;
      const result = await robustUpload(path, compressed, 3);

      if (result.success) {
        if (item.side === 'front') {
          frontPaths[item.guestNum - 1] = path;
        } else {
          backPaths[item.guestNum - 1] = path;
        }
        allPaths.push(path);
        renderProgress(i + 1, item, '✅');
      } else {
        failedUploads.push({ ...item, error: result.error });
        renderProgress(i + 1, item, '❌');
        console.warn(`Failed: Guest ${item.guestNum} ${item.side}:`, result.error);
      }
    } catch (e) {
      failedUploads.push({ ...item, error: e.message });
      console.error(`Error uploading Guest ${item.guestNum} ${item.side}:`, e);
    }
  }

  // Final summary
  if (progressEl) {
    const successCount = allPaths.length;
    const isPerfect = failedUploads.length === 0;

    progressEl.innerHTML = `
      <div style="padding:14px;background:${isPerfect ? '#f0fff4' : '#FFF5F5'};border:2px solid ${isPerfect ? '#00A699' : '#FF385C'};border-radius:12px;margin:8px 0;">
        <div style="font-size:15px;font-weight:800;color:${isPerfect ? '#00A699' : '#FF385C'};margin-bottom:6px;">
          ${isPerfect ? '✅ All Photos Uploaded Successfully!' : '⚠️ Upload Completed with Errors'}
        </div>
        <div style="font-size:13px;color:var(--dark);">
          <strong>${successCount}</strong> of <strong>${totalFiles}</strong> photos uploaded
          ${failedUploads.length > 0 ? `<br><span style="color:var(--red);">❌ ${failedUploads.length} failed - please retry</span>` : ''}
        </div>
        <div style="height:8px;background:#EBEBEB;border-radius:4px;overflow:hidden;margin-top:8px;">
          <div style="height:100%;width:100%;background:${isPerfect ? '#00A699' : '#FF385C'};border-radius:4px;"></div>
        </div>
      </div>`;
  }

  return {
    frontPaths: stringifyIdPathArray(frontPaths),
    backPaths: stringifyIdPathArray(backPaths),
    allPaths: allPaths.length ? allPaths.join(',') : null,
    firstPath: allPaths[0] || null,
    failedCount: failedUploads.length
  };
}

async function uploadVehiclePhoto(bkId) {
  const input = document.getElementById('vehiclePhoto');
  if (!input?.files?.[0]) return null;

  try {
    const compressed = await smartCompress(input.files[0]);
    const path = `${bkId}/${Date.now()}_vehicle.jpg`;
    const result = await robustUpload(path, compressed, 3);
    if (result.success) return path;
    console.warn('Vehicle photo failed:', result.error);
  } catch (e) {
    console.warn('Vehicle photo failed:', e);
  }
  return null;
}
// ============ SAVE BOOKING ============
async function saveBooking() {
  const btn = document.getElementById('saveBtn');
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = '⏳ Saving...';

  try {
    const gn = document.getElementById('guestName').value.trim();
    const ph = document.getElementById('guestPhone').value.trim();
    const rid = document.getElementById('roomId').value;
    const mode = document.getElementById('bookingMode').value;
    const isOnline = mode === 'Online-Airbnb';
    const sourceRoomId = isOnline ? (document.getElementById('sourceRoomId')?.value || rid) : null;
    const ci = document.getElementById('checkIn').value;
    const co = document.getElementById('checkOut').value;
    const checkInTime = document.getElementById('checkInTime')?.value || '14:00';
    const checkOutTime = document.getElementById('checkOutTime')?.value || '11:00';
    const checkoutConfirmed = document.getElementById('checkoutConfirmed')?.value === 'yes';
    const gs = Math.min(Math.max(parseInt(document.getElementById('guests').value) || 1, 1), 8);
    const nights = calcNights(ci, co);

    // Get total from correct field
    let tot = isOnline
      ? parseFloat(document.getElementById('totalAmountOnline')?.value) || 0
      : parseFloat(document.getElementById('totalAmount')?.value) || 0;

    // Per day rate
    const perDayRate = nights > 0 && tot > 0 ? Math.round(tot / nights) : 0;

    // Advance: online = tot, offline = whatever entered
    let adv = isOnline ? tot : (parseFloat(document.getElementById('advanceAmt').value) || 0);

    const advMode = document.getElementById('advMode').value;
    const advDate = document.getElementById('advDate')?.value || new Date().toISOString().slice(0, 10);
    const idType = document.getElementById('idType').value;
    const idNo = document.getElementById('idNo').value.trim();
    const parentBookingId = document.getElementById('parentBookingId')?.value || null;
    const stayGroupId = document.getElementById('stayGroupId')?.value || null;
    const hasVehicle = document.getElementById('hasVehicle')?.value === 'true';
    const vehicleName = hasVehicle ? (document.getElementById('vehicleName')?.value.trim() || null) : null;
    const vehicleNumber = hasVehicle ? (document.getElementById('vehicleNumber')?.value.trim() || null) : null;
    let notes = document.getElementById('bkNotes').value.trim();

    if (!gn || !rid) {
      document.getElementById('addBkErr').innerHTML = '<div class="error">Guest name & property required</div>';
      btn.disabled = false; btn.textContent = '💾 Save Booking'; return;
    }

    if (tot === 0) {
      const proceed = confirm('⚠️ Total amount ₹0 hai. Save karna hai?');
      if (!proceed) { btn.disabled = false; btn.textContent = '💾 Save Booking'; return; }
    }

    // Clash check
    if (ci && co) {
      const { data: ex } = await sb.from('guest_register')
        .select('booking_id,guest_name,check_in,check_out').eq('room_id', rid);
      const clash = (ex || []).find(b => b.check_in && b.check_out && b.check_in < co && b.check_out > ci);
      if (clash) {
        document.getElementById('addBkErr').innerHTML =
          `<div class="error">⚠️ Clash: ${clash.guest_name} (${clash.check_in}→${clash.check_out})</div>`;
        btn.disabled = false; btn.textContent = '💾 Save Booking'; return;
      }
    }

    const bkId = 'B' + Date.now();
    const finalStayGroupId = stayGroupId || bkId;
    const photos = await uploadIdPhotos(bkId);
    const vehiclePhotoPath = hasVehicle ? await uploadVehiclePhoto(bkId) : null;
    

    const noteParts = [];
    if (notes) noteParts.push(notes);
    if (isOnline && sourceRoomId && sourceRoomId !== rid) noteParts.push(`Airbnb booked on ${sourceRoomId}, shifted to ${rid}`);
    if (parentBookingId) noteParts.push(`Extension after previous stay (${parentBookingId})`);
    if (!checkoutConfirmed) noteParts.push('Open-ended stay — per day basis');
    const finalNotes = noteParts.join(' | ');

    const payStatus = isOnline ? 'Paid' : (adv >= tot && tot > 0 ? 'Paid' : (adv > 0 ? 'Partial' : 'Unpaid'));

    const { error } = await sb.from('guest_register').insert({
      booking_id: bkId, guest_name: gn, phone: ph || null,
      id_proof_type: idType || null, id_proof_no: idNo || null,
      id_proof_photo_path: photos.firstPath, id_proof_photo_paths: photos.allPaths,
      id_proof_front_paths: photos.frontPaths, id_proof_back_paths: photos.backPaths,
      room_id: rid, source_room_id: sourceRoomId,
      parent_booking_id: parentBookingId, stay_group_id: finalStayGroupId,
      booking_mode: mode, check_in: ci || null, check_out: co || null,
      check_in_time: checkInTime, check_out_time: checkOutTime,
      checkout_confirmed: checkoutConfirmed,
      guests: gs, per_day_rate: perDayRate, total_amount: tot,
      has_vehicle: hasVehicle, vehicle_name: vehicleName, vehicle_number: vehicleNumber,
      vehicle_photo_path: vehiclePhotoPath,
      payment_status: payStatus, notes: finalNotes || null,
      booked_by: SESSION.displayName || SESSION.role
    });

    if (error) {
      document.getElementById('addBkErr').innerHTML = `<div class="error">${error.message}</div>`;
      btn.disabled = false; btn.textContent = '💾 Save Booking'; return;
    }

    if (adv > 0) {
      await sb.from('payment_history').insert({
        booking_id: bkId, amount: adv, payment_mode: advMode || null,
        payment_date: advDate, notes: isOnline ? 'Airbnb Payout' : 'Advance'
      });
    }
    await sb.from('flats_status').upsert({ room_id: rid, status: 'Booked' });

    window._bookingPrefill = null;

    // Success feedback
    fsn.success('Success', '✅ Booking saved successfully!\n\nGuest: ' + gn + '\nProperty: ' + (document.getElementById('roomId').selectedOptions[0]?.text || rid));

    // WhatsApp share option
    if (confirm('📱 WhatsApp message share karna hai?')) {
      shareBookingWhatsApp(bkId);
    }

    renderManageBookings();

  } catch (err) {
    document.getElementById('addBkErr').innerHTML = `<div class="error">${err.message || err}</div>`;
    btn.disabled = false; btn.textContent = '💾 Save Booking';
  }
}

// ============ EXTENSION ============
async function createOfflineExtension(parentBookingId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', parentBookingId).single();
  if (!b) { fsn.error('Error', 'Not found'); return; }
  const today = new Date().toISOString().slice(0, 10);
  if (b.check_out >= today) {
    await sb.from('guest_register').update({
      check_out: today,
      notes: (b.notes ? b.notes + ' | ' : '') + 'Auto-closed: extended on ' + today
    }).eq('booking_id', parentBookingId);
  }
  if (b.room_id) {
    await sb.from('flats_status').update({ 
      status: 'Free', 
      cleaning_status: 'Dirty',
      last_checkout: today
    }).eq('room_id', b.room_id);
  }
  window._bookingPrefill = {
    guestName: b.guest_name || '', guestPhone: b.phone || '',
    roomId: b.room_id || '', sourceRoomId: b.source_room_id || b.room_id || '',
    bookingMode: 'Offline', checkIn: today, checkOut: '',
    checkInTime: '14:00', checkOutTime: '11:00', checkoutConfirmed: 'no',
    guests: b.guests || 1, totalAmount: '', advanceAmt: 0, advMode: '',
    perDayRate: b.per_day_rate || '',
    hasVehicle: b.has_vehicle || false, vehicleName: b.vehicle_name || '',
    vehicleNumber: b.vehicle_number || '',
    idType: b.id_proof_type || 'Aadhar', idNo: b.id_proof_no || '',
    bkNotes: `Extension after previous stay (${parentBookingId})`,
    parentBookingId: parentBookingId, stayGroupId: b.stay_group_id || b.booking_id
  };
  renderAddBooking();
}

// ============ QUICK CHECKOUT ============
async function quickCheckout(bkId, roomId) {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const { data: bk } = await sb.from('guest_register')
    .select('guest_name,check_in,per_day_rate,total_amount,notes').eq('booking_id', bkId).single();
  if (!bk) { fsn.error('Error', 'Not found'); return; }
  const nights = Math.max(calcNights(bk.check_in, today), 1);
  const calcTotal = bk.per_day_rate ? bk.per_day_rate * nights : bk.total_amount;
  if (!confirm(`Quick Checkout for ${bk.guest_name}?\n\nNights: ${nights}\nTotal: ₹${calcTotal.toLocaleString('en-IN')}\n\nProceed?`)) return;
  await sb.from('guest_register').update({
    check_out: today, check_out_time: nowTime, total_amount: calcTotal,
    checkout_confirmed: true,
    notes: (bk.notes ? bk.notes + ' | ' : '') + `Quick checkout ${today} ${nowTime}. ${nights} nights.`
  }).eq('booking_id', bkId);
  if (roomId) await sb.from('flats_status').update({ 
    status: 'Free', 
    cleaning_status: 'Dirty',
    last_checkout: today
  }).eq('room_id', roomId);
  fsn.success(`Success`, `✅ ${bk.guest_name} checked out! Total: ₹${calcTotal.toLocaleString('en-IN')}`);
  renderManageBookings();
}

// ============ EDIT BOOKING ============
async function editBooking(bkId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', bkId).single();
  if (!b) { fsn.error('Error', 'Not found'); return; }
  const { data: rooms } = await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('room_id');
  const { data: pays } = await sb.from('payment_history').select('*').eq('booking_id', bkId).order('paid_at', { ascending: false });
  const tp = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const bal = Math.round(((b.total_amount || 0) - tp) * 100) / 100;

  const frontPaths = parseIdPathArray(b.id_proof_front_paths);
  const backPaths = parseIdPathArray(b.id_proof_back_paths);
  const guestCountForUI = Math.min(Math.max(parseInt(b.guests || 1) || 1, 1), 8);

  let idSlots = '';
  for (let i = 1; i <= 8; i++) {
    const fp = frontPaths[i - 1] || null;
    const bp = backPaths[i - 1] || null;
    idSlots += `
      <div style="padding:10px;margin-bottom:8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;">👤 Guest ${i}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Front</div>
            ${fp ? `<div style="padding:6px;background:#f0fff4;border:1.5px solid var(--green);border-radius:8px;margin-bottom:6px;">
              <div style="font-size:11px;color:var(--green);font-weight:700;">✅ Uploaded</div>
              <div class="btn-row" style="margin-top:4px;">
                <button class="btn-sm green-btn" onclick="dlIdPhoto('${fp}')">📥 View</button>
                <button class="btn-sm danger" onclick="deleteIdPhoto('${bkId}','${fp}','front',${i - 1})">🗑️</button>
              </div>
            </div>` : '<div style="font-size:11px;color:var(--red);margin-bottom:4px;">⚠️ No photo</div>'}
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('eFrontCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('eFrontGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="eFrontCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onEditIdFileSelect(this,${i},'front')" />
            <input type="file" id="eFrontGal${i}" accept="image/*" style="display:none;" onchange="onEditIdFileSelect(this,${i},'front')" />
            <div id="ePreviewFront${i}" style="margin-top:4px;"></div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Back</div>
            ${bp ? `<div style="padding:6px;background:#f0fff4;border:1.5px solid var(--green);border-radius:8px;margin-bottom:6px;">
              <div style="font-size:11px;color:var(--green);font-weight:700;">✅ Uploaded</div>
              <div class="btn-row" style="margin-top:4px;">
                <button class="btn-sm green-btn" onclick="dlIdPhoto('${bp}')">📥 View</button>
                <button class="btn-sm danger" onclick="deleteIdPhoto('${bkId}','${bp}','back',${i - 1})">🗑️</button>
              </div>
            </div>` : '<div style="font-size:11px;color:var(--red);margin-bottom:4px;">⚠️ No photo</div>'}
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('eBackCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('eBackGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="eBackCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onEditIdFileSelect(this,${i},'back')" />
            <input type="file" id="eBackGal${i}" accept="image/*" style="display:none;" onchange="onEditIdFileSelect(this,${i},'back')" />
            <div id="ePreviewBack${i}" style="margin-top:4px;"></div>
          </div>
        </div>
      </div>`;
  }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Booking</h1>
      <button class="secondary btn-sm" onclick="renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Guest Name</label><input id="guestName" value="${b.guest_name || ''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" value="${b.phone || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>ID Type</label>
          <select id="idType">
            <option value="Aadhar" ${b.id_proof_type === 'Aadhar' ? 'selected' : ''}>Aadhar</option>
            <option value="PAN" ${b.id_proof_type === 'PAN' ? 'selected' : ''}>PAN</option>
            <option value="DL" ${b.id_proof_type === 'DL' ? 'selected' : ''}>DL</option>
            <option value="Passport" ${b.id_proof_type === 'Passport' ? 'selected' : ''}>Passport</option>
          </select>
        </div>
        <div class="form-group"><label>ID Number</label><input id="idNo" value="${b.id_proof_no || ''}" /></div>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin:8px 0;">
        <div class="section-title">🪪 ID Photos (Front & Back)</div>
        <div class="id-grid">${idSlots}</div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="roomId">
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id === b.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Mode</label>
          <select id="bookingMode" onchange="toggleEditSourceBox()">
            <option value="Offline" ${b.booking_mode !== 'Online-Airbnb' ? 'selected' : ''}>Offline</option>
            <option value="Online-Airbnb" ${b.booking_mode === 'Online-Airbnb' ? 'selected' : ''}>Online</option>
          </select>
        </div>
      </div>

      <div id="editSourceBox" style="display:${b.booking_mode === 'Online-Airbnb' ? 'block' : 'none'};background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="form-group"><label>Source Listing</label>
          <select id="sourceRoomId"><option value="">Same</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${(b.source_room_id || b.room_id) === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${b.parent_booking_id ? `<div class="sub">Extension of: <code>${b.parent_booking_id}</code></div>` : ''}

      <div class="form-grid">
        <div class="form-group"><label>Check-in Date</label><input id="checkIn" type="date" value="${b.check_in || ''}" /></div>
        <div class="form-group"><label>Check-in Time</label><input id="checkInTime" type="time" value="${b.check_in_time || '14:00'}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Check-out Date</label><input id="checkOut" type="date" value="${b.check_out || ''}" /></div>
        <div class="form-group"><label>Check-out Time</label><input id="checkOutTime" type="time" value="${b.check_out_time || '11:00'}" /></div>
      </div>
      <div class="form-group"><label>Checkout Type</label>
        <select id="checkoutConfirmed">
          <option value="yes" ${b.checkout_confirmed !== false ? 'selected' : ''}>Fixed Date</option>
          <option value="no" ${b.checkout_confirmed === false ? 'selected' : ''}>Open — Per Day</option>
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Guests</label><input id="guests" type="number" value="${guestCountForUI}" min="1" max="8" onchange="showEditIdSlots()" oninput="showEditIdSlots()" /></div>
        <div class="form-group"><label>Per Day Rate ₹</label><input id="perDayRate" type="number" value="${b.per_day_rate || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Total ₹</label><input id="totalAmount" type="number" value="${b.total_amount || 0}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="paySt">
            <option value="Unpaid" ${b.payment_status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option value="Partial" ${b.payment_status === 'Partial' ? 'selected' : ''}>Partial</option>
            <option value="Paid" ${b.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Vehicle?</label>
          <select id="hasVehicle" onchange="toggleVehicle()">
            <option value="false" ${b.has_vehicle ? '' : 'selected'}>No</option>
            <option value="true" ${b.has_vehicle ? 'selected' : ''}>Yes</option>
          </select>
        </div>
      </div>
      <div id="vehicleBox" style="display:${b.has_vehicle ? 'block' : 'none'};">
        <div class="form-grid">
          <div class="form-group"><label>Vehicle Name</label><input id="vehicleName" value="${b.vehicle_name || ''}" /></div>
          <div class="form-group"><label>Registration No.</label><input id="vehicleNumber" value="${b.vehicle_number || ''}" /></div>
        </div>
        <div class="form-group">
          <label>Vehicle Photo</label>
          ${b.vehicle_photo_path
            ? `<div class="btn-row" style="margin:4px 0;">
                <button class="btn-sm green-btn" onclick="dlIdPhoto('${b.vehicle_photo_path}')">📥 View Photo</button>
                <button class="btn-sm danger" onclick="deleteVehiclePhoto('${bkId}','${b.vehicle_photo_path}')">🗑️ Delete</button>
                <span style="font-size:10px;color:var(--green);">✅ Uploaded</span>
              </div>`
            : '<div style="font-size:11px;color:var(--muted);margin-bottom:6px;">No photo yet</div>'}
          <div class="id-card-btns">
            <button type="button" class="outline" onclick="document.getElementById('vehiclePhotoCam').click()">📷 Camera</button>
            <button type="button" class="outline" onclick="document.getElementById('vehiclePhotoGal').click()">🖼️ Gallery</button>
          </div>
          <input type="file" id="vehiclePhotoCam" accept="image/*" capture="environment" style="display:none;" onchange="onEditVehiclePick(this)" />
          <input type="file" id="vehiclePhotoGal" accept="image/*" style="display:none;" onchange="onEditVehiclePick(this)" />
          <div id="vehiclePhotoPreview"></div>
        </div>
      </div>

      <div class="form-group"><label>Notes</label><textarea id="bkNotes">${b.notes || ''}</textarea></div>
      <button onclick="updateBooking('${bkId}','${b.parent_booking_id || ''}','${b.stay_group_id || b.booking_id}')">💾 Update</button>
      <div id="editBkErr"></div>
    </div>

    <div class="card">
      <div class="section-title">💳 Payment History</div>
      <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${tp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal > 0 ? ' warn' : ''}">₹${bal.toLocaleString('en-IN')}</span></div>
      ${(pays || []).length ? `<div class="table-wrap" style="margin-top:8px;"><table>
        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>${pays.map(p => `<tr>
          <td>${p.payment_date || new Date(p.paid_at).toLocaleDateString('en-IN')}</td>
          <td>₹${(p.amount || 0).toLocaleString('en-IN')}</td>
          <td>${p.payment_mode || '-'}</td>
          <td>${p.notes || '-'}</td>
          <td class="table-actions">
            <button class="btn-sm" onclick="editPayment(${p.id},'${bkId}')">✏️</button>
            <button class="btn-sm danger" onclick="delPayment(${p.id},'${bkId}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="sub">No payments</div>'}
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-sm" onclick="showPaymentModal('${bkId}')">➕ Payment</button>
        <button class="btn-sm outline" onclick="createOfflineExtension('${bkId}')">➕ Extension</button>
        <button class="btn-sm outline" onclick="shareBookingWhatsApp('${bkId}')">📱 Share</button>
        ${bal > 0 ? `<button class="btn-sm secondary" onclick="markFullyPaid('${bkId}')">✅ Paid</button>` : ''}
      </div>
    </div>
  `, 'bookings');
}

function toggleEditSourceBox() {
  const mode = document.getElementById('bookingMode')?.value;
  const box = document.getElementById('editSourceBox');
  if (box) box.style.display = mode === 'Online-Airbnb' ? 'block' : 'none';
}

// ============ DELETE ID PHOTO ============
async function deleteIdPhoto(bkId, path, side, index) {
  if (!confirm('Delete this photo?')) return;
  try {
    await sb.storage.from('id-proofs').remove([path]);

    const { data: bk } = await sb.from('guest_register')
      .select('id_proof_front_paths, id_proof_back_paths, id_proof_photo_paths, id_proof_photo_path')
      .eq('booking_id', bkId).single();
    if (!bk) return;

    const updateObj = {};
    const frontArr = parseIdPathArray(bk.id_proof_front_paths);
    const backArr = parseIdPathArray(bk.id_proof_back_paths);

    if (side === 'front') {
      while (frontArr.length <= index) frontArr.push(null);
      frontArr[index] = null;
      updateObj.id_proof_front_paths = stringifyIdPathArray(frontArr);
    } else {
      while (backArr.length <= index) backArr.push(null);
      backArr[index] = null;
      updateObj.id_proof_back_paths = stringifyIdPathArray(backArr);
    }

    const allArr = (bk.id_proof_photo_paths || '')
      .split(',')
      .filter(Boolean)
      .filter(x => x !== path);

    updateObj.id_proof_photo_paths = allArr.join(',') || null;
    updateObj.id_proof_photo_path = allArr[0] || null;

    await sb.from('guest_register').update(updateObj).eq('booking_id', bkId);

    fsn.success('Success', '✅ Photo deleted');
    editBooking(bkId);
  } catch (e) {
    fsn.error('Error', '❌ Delete failed: ' + e.message);
  }
}

// ============ UPDATE BOOKING ============
async function updateBooking(bkId, parentBookingId = '', stayGroupId = '') {
  const gn = document.getElementById('guestName').value.trim();
  const rid = document.getElementById('roomId').value;
  if (!gn || !rid) { document.getElementById('editBkErr').innerHTML = '<div class="error">Name & property required</div>'; return; }

  const mode = document.getElementById('bookingMode').value;
  const sourceRoomId = mode === 'Online-Airbnb' ? (document.getElementById('sourceRoomId')?.value || rid) : null;
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  const hasVehicle = document.getElementById('hasVehicle')?.value === 'true';

  if (ci && co) {
    const { data: ex } = await sb.from('guest_register')
      .select('booking_id,guest_name,check_in,check_out').eq('room_id', rid).neq('booking_id', bkId);
    const clash = (ex || []).find(b => b.check_in && b.check_out && b.check_in < co && b.check_out > ci);
    if (clash) { document.getElementById('editBkErr').innerHTML = `<div class="error">Clash: ${clash.guest_name}</div>`; return; }
  }

  const gc = Math.min(Math.max(parseInt(document.getElementById('guests')?.value) || 1, 1), 8);
  const { data: oldBk } = await sb.from('guest_register')
    .select('id_proof_front_paths, id_proof_back_paths, id_proof_photo_paths')
    .eq('booking_id', bkId).single();

  const existFront = parseIdPathArray(oldBk?.id_proof_front_paths);
  const existBack  = parseIdPathArray(oldBk?.id_proof_back_paths);
  const fArr = existFront.length ? existFront.slice() : Array(gc).fill(null);
  const bArr = existBack.length  ? existBack.slice()  : Array(gc).fill(null);
  const aArr = [...new Set((oldBk?.id_proof_photo_paths || '').split(',').filter(Boolean))];
  // Find max guest index with pending files
  let maxGuestWithFile = gc;
  if (window._editIdFiles) {
    Object.keys(window._editIdFiles).forEach(key => {
      const num = parseInt(key.split('_')[1]);
      if (num > maxGuestWithFile) maxGuestWithFile = num;
    });
  }
  // Also check DOM inputs
  for (let i = 1; i <= 8; i++) {
    if (document.getElementById(`eFrontCam${i}`)?.files?.[0] ||
        document.getElementById(`eFrontGal${i}`)?.files?.[0] ||
        document.getElementById(`eBackCam${i}`)?.files?.[0] ||
        document.getElementById(`eBackGal${i}`)?.files?.[0]) {
      if (i > maxGuestWithFile) maxGuestWithFile = i;
    }
  }
  for (let i = 1; i <= maxGuestWithFile; i++) {
    const fFile = (window._editIdFiles && window._editIdFiles[`front_${i}`]) 
      || document.getElementById(`eFrontCam${i}`)?.files?.[0] 
      || document.getElementById(`eFrontGal${i}`)?.files?.[0];
    if (fFile) {
      try {
        const c = await smartCompress(fFile);
        const p = `${bkId}/${Date.now()}_g${i}_front.jpg`;
        const result = await robustUpload(p, c, 3);
        if (result.success) { while(fArr.length < i) fArr.push(null); fArr[i-1] = p; aArr.push(p); }
        else console.warn('Front upload failed:', result.error);
      } catch (e) { console.warn('Front upload error:', e); }
    }
    const bFile = (window._editIdFiles && window._editIdFiles[`back_${i}`])
      || document.getElementById(`eBackCam${i}`)?.files?.[0] 
      || document.getElementById(`eBackGal${i}`)?.files?.[0];
    if (bFile) {
      try {
        const c = await smartCompress(bFile);
        const p = `${bkId}/${Date.now()}_g${i}_back.jpg`;
        const result = await robustUpload(p, c, 3);
        if (result.success) { while(bArr.length < i) bArr.push(null); bArr[i-1] = p; aArr.push(p); }
        else console.warn('Back upload failed:', result.error);
      } catch (e) { console.warn('Back upload error:', e); }
    }
  }


  const totVal = parseFloat(document.getElementById('totalAmount').value) || 0;
  const nights = calcNights(ci, co);
  const perDay = nights > 0 && totVal > 0 ? Math.round(totVal / nights) : parseFloat(document.getElementById('perDayRate')?.value) || 0;

  const obj = {
    guest_name: gn, phone: document.getElementById('guestPhone').value.trim() || null,
    id_proof_type: document.getElementById('idType').value || null,
    id_proof_no: document.getElementById('idNo').value.trim() || null,
    room_id: rid, source_room_id: sourceRoomId,
    parent_booking_id: parentBookingId || null, stay_group_id: stayGroupId || bkId,
    booking_mode: mode, check_in: ci || null, check_out: co || null,
    check_in_time: document.getElementById('checkInTime')?.value || '14:00',
    check_out_time: document.getElementById('checkOutTime')?.value || '11:00',
    checkout_confirmed: document.getElementById('checkoutConfirmed')?.value === 'yes',
    guests: gc, per_day_rate: perDay, total_amount: totVal,
    payment_status: document.getElementById('paySt').value,
    has_vehicle: hasVehicle,
    vehicle_name: hasVehicle ? (document.getElementById('vehicleName')?.value.trim() || null) : null,
    vehicle_number: hasVehicle ? (document.getElementById('vehicleNumber')?.value.trim() || null) : null,
    notes: document.getElementById('bkNotes').value.trim() || null,
  };
  obj.id_proof_front_paths = stringifyIdPathArray(fArr);
  obj.id_proof_back_paths  = stringifyIdPathArray(bArr);
  const uniqA = [...new Set(aArr.filter(Boolean))];
  if (uniqA.length) { obj.id_proof_photo_paths = uniqA.join(','); obj.id_proof_photo_path = uniqA[0]; }

  // Vehicle photo upload
  if (obj.has_vehicle) {
    const vFile = document.getElementById('vehiclePhotoCam')?.files?.[0]
      || document.getElementById('vehiclePhotoGal')?.files?.[0] || document.getElementById('vehiclePhoto')?.files?.[0];
    if (vFile) {
      try {
        const vc = await smartCompress(vFile);
        const vp = `${bkId}/vehicle_${Date.now()}.jpg`;
        const result = await robustUpload(vp, vc, 3);
        if (result.success) obj.vehicle_photo_path = vp;
        else console.warn('Vehicle upload failed:', result.error);
      } catch (e) { console.warn('Vehicle photo update failed', e); }
    }
  }

  const { error } = await sb.from('guest_register').update(obj).eq('booking_id', bkId);
  if (error) { document.getElementById('editBkErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  window._editIdFiles = {}; // Clear cache
  renderManageBookings();
}

// ============ DELETE BOOKING ============
async function delBooking(bkId, guestName, roomId) {
  if (!confirm(`Delete "${guestName}" booking?\nPayments + photos bhi delete hongi.`)) return;
  try {
    const { data: bk } = await sb.from('guest_register')
      .select('room_id, id_proof_photo_paths, id_proof_photo_path, id_proof_front_paths, id_proof_back_paths, vehicle_photo_path')
      .eq('booking_id', bkId).single();

    const allPaths = [
      bk?.id_proof_photo_paths,
      bk?.id_proof_photo_path,
      bk?.id_proof_front_paths,
      bk?.id_proof_back_paths,
      bk?.vehicle_photo_path
    ]
      .filter(Boolean)
      .join(',')
      .split(',')
      .filter(Boolean);

    const uniquePaths = [...new Set(allPaths)];

    if (uniquePaths.length) {
      try { await sb.storage.from('id-proofs').remove(uniquePaths); } catch (e) {}
    }

    await sb.from('payment_history').delete().eq('booking_id', bkId);
    const { error } = await sb.from('guest_register').delete().eq('booking_id', bkId);
    if (error) { fsn.error('Error', '❌ Delete failed: ' + error.message); return; }

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

    fsn.success('Success', '✅ Booking deleted');
    renderManageBookings();
  } catch (err) {
    fsn.error('Error', '❌ Error: ' + (err.message || err));
  }
}

// ============ PAYMENT MODAL ============
function showPaymentModal(bkId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💰 Add Payment</h2>
      <div class="form-group"><label>Amount ₹ *</label><input id="payAmt" type="number" placeholder="Amount" /></div>
      <div class="form-group"><label>Mode</label>
        <select id="payMode">
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank Transfer</option>
          <option value="Airbnb Payout">Airbnb Payout</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input id="payDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="form-group"><label>Notes</label><input id="payNotes" placeholder="Optional" /></div>
      <button onclick="savePaymentModal('${bkId}')" style="width:100%;margin-top:10px;">💾 Save Payment</button>
      <div id="payErr"></div>
    </div>`;
  document.body.appendChild(modal);
}

async function savePaymentModal(bkId) {
  const amt = parseFloat(document.getElementById('payAmt')?.value) || 0;
  if (amt <= 0) { document.getElementById('payErr').innerHTML = '<div class="error">Amount required</div>'; return; }
  const { error } = await sb.from('payment_history').insert({
    booking_id: bkId, amount: amt,
    payment_mode: document.getElementById('payMode')?.value,
    payment_date: document.getElementById('payDate')?.value,
    notes: document.getElementById('payNotes')?.value?.trim() || null
  });
  if (error) { document.getElementById('payErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  await recalcPaymentStatus(bkId);
  document.querySelector('.modal-overlay')?.remove();
  if (document.getElementById('editBkErr')) editBooking(bkId);
  else renderManageBookings();
}

async function addPaymentWithDate(bkId) { showPaymentModal(bkId); }

async function editPayment(payId, bkId) {
  const { data: pay } = await sb.from('payment_history').select('*').eq('id', payId).single();
  if (!pay) { fsn.error('Error', 'Not found'); return; }
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>✏️ Edit Payment</h2>
      <div class="form-group"><label>Amount ₹</label><input id="editPayAmt" type="number" value="${pay.amount}" /></div>
      <div class="form-group"><label>Mode</label>
        <select id="editPayMode">
          <option value="Cash" ${pay.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
          <option value="UPI" ${pay.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
          <option value="Bank" ${pay.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
          <option value="Airbnb Payout" ${pay.payment_mode === 'Airbnb Payout' ? 'selected' : ''}>Airbnb Payout</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input id="editPayDate" type="date" value="${pay.payment_date || ''}" /></div>
      <div class="form-group"><label>Notes</label><input id="editPayNotes" value="${pay.notes || ''}" /></div>
      <button onclick="saveEditPayment(${payId},'${bkId}')" style="width:100%;margin-top:10px;">💾 Update</button>
    </div>`;
  document.body.appendChild(modal);
}

async function saveEditPayment(payId, bkId) {
  await sb.from('payment_history').update({
    amount: parseFloat(document.getElementById('editPayAmt')?.value) || 0,
    payment_mode: document.getElementById('editPayMode')?.value,
    payment_date: document.getElementById('editPayDate')?.value || null,
    notes: document.getElementById('editPayNotes')?.value?.trim() || null
  }).eq('id', payId);
  await recalcPaymentStatus(bkId);
  document.querySelector('.modal-overlay')?.remove();
  editBooking(bkId);
}

async function delPayment(payId, bkId) {
  if (!confirm('Delete this payment?')) return;
  await sb.from('payment_history').delete().eq('id', payId);
  await recalcPaymentStatus(bkId);
  editBooking(bkId);
}

async function markFullyPaid(bkId) {
  const { data: b } = await sb.from('guest_register').select('total_amount').eq('booking_id', bkId).single();
  const { data: p } = await sb.from('payment_history').select('amount').eq('booking_id', bkId);
  const paid = (p || []).reduce((s, x) => s + (x.amount || 0), 0);
  const bal = (b?.total_amount || 0) - paid;
  if (bal <= 0) { fsn.info('Info', 'Already paid'); return; }
  showPaymentModal(bkId);
}

async function recalcPaymentStatus(bkId) {
  const { data: b } = await sb.from('guest_register').select('total_amount').eq('booking_id', bkId).single();
  const { data: p } = await sb.from('payment_history').select('amount').eq('booking_id', bkId);
  const paid = (p || []).reduce((s, x) => s + (x.amount || 0), 0);
  const st = paid >= (b?.total_amount || 0) && b?.total_amount > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
  await sb.from('guest_register').update({ payment_status: st }).eq('booking_id', bkId);
}

function onPeriodChg() {
  SESSION.bookingPeriod = document.getElementById('fPeriod')?.value || '';
  renderManageBookings();
}


// ============ EXPORT FILTERED BOOKINGS TO PDF ============
async function exportBookingsPDF() {
  // Get current filtered bookings from displayed table
  const rows = document.querySelectorAll('.table-wrap table tbody tr');
  if (!rows.length) { fsn.info('Info', 'No bookings to export'); return; }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const filterInfo = [];

  const period = SESSION.bookingPeriod || '';
  const payFilter = SESSION.bookingPayFilter || '';
  const mode = SESSION.bookingFilter || '';
  const prop = SESSION.bookingPropFilter || '';
  const search = SESSION.bookingSearch || '';

  if (period) filterInfo.push(`Period: ${period}`);
  if (payFilter) filterInfo.push(`Payment: ${payFilter}`);
  if (mode && mode !== 'All') filterInfo.push(`Mode: ${mode}`);
  if (prop) filterInfo.push(`Property: ${prop}`);
  if (search) filterInfo.push(`Search: ${search}`);

  // Build print HTML
  let tableRows = '';
  let totalDue = 0, totalAmount = 0, totalPaid = 0;

  rows.forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length < 8) return;

    const guest = cells[1]?.innerText?.trim() || '';
    const property = cells[2]?.innerText?.trim() || '';
    const mode2 = cells[3]?.innerText?.trim() || '';
    const checkIn = cells[4]?.innerText?.trim() || '';
    const checkOut = cells[5]?.innerText?.trim() || '';
    const total = cells[7]?.innerText?.trim() || '';
    const paid = cells[8]?.innerText?.trim() || '';
    const due = cells[9]?.innerText?.trim() || '';

    // Parse amounts
    const totalNum = parseFloat(total.replace(/[₹,]/g, '')) || 0;
    const paidNum = parseFloat(paid.replace(/[₹,]/g, '')) || 0;
    const dueNum = parseFloat(due.replace(/[₹,]/g, '')) || 0;

    totalAmount += totalNum;
    totalPaid += paidNum;
    totalDue += dueNum;

    tableRows += `
      <tr>
        <td>${guest}</td>
        <td>${property}</td>
        <td>${mode2}</td>
        <td>${checkIn}</td>
        <td>${checkOut}</td>
        <td style="text-align:right;">${total}</td>
        <td style="text-align:right;color:#0A7D1A;">${paid}</td>
        <td style="text-align:right;color:#FF385C;font-weight:700;">${due}</td>
      </tr>`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Bookings Report - ${dateStr}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: -apple-system, sans-serif; color: #222; margin: 0; padding: 20px; }
  .header { background: linear-gradient(135deg,#FF385C,#E00B41); color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 6px 0; font-size: 22px; }
  .header .meta { font-size: 13px; opacity: 0.9; }
  .filters { background: #FEF3C7; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
  .filters strong { color: #B45309; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #222; color: #fff; padding: 10px 8px; text-align: left; font-weight: 700; }
  td { padding: 8px; border-bottom: 1px solid #EBEBEB; }
  tr:nth-child(even) { background: #FAFAFA; }
  .totals { margin-top: 20px; background: #F7F7F7; padding: 16px; border-radius: 8px; display: flex; justify-content: space-around; }
  .totals div { text-align: center; }
  .totals .label { font-size: 11px; color: #717171; text-transform: uppercase; letter-spacing: 1px; }
  .totals .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #717171; border-top: 1px solid #EBEBEB; padding-top: 12px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>📅 Bookings Report</h1>
    <div class="meta">${BRAND} · Generated ${dateStr}</div>
  </div>

  ${filterInfo.length ? `
  <div class="filters">
    <strong>🔍 Filters Applied:</strong> ${filterInfo.join(' | ')}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Guest</th>
        <th>Property</th>
        <th>Mode</th>
        <th>Check-in</th>
        <th>Check-out</th>
        <th style="text-align:right;">Total</th>
        <th style="text-align:right;">Paid</th>
        <th style="text-align:right;">Due</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="totals">
    <div>
      <div class="label">Total Bookings</div>
      <div class="value">${rows.length}</div>
    </div>
    <div>
      <div class="label">Total Amount</div>
      <div class="value">₹${totalAmount.toLocaleString('en-IN')}</div>
    </div>
    <div>
      <div class="label">Total Paid</div>
      <div class="value" style="color:#0A7D1A;">₹${totalPaid.toLocaleString('en-IN')}</div>
    </div>
    <div>
      <div class="label">Total Due</div>
      <div class="value" style="color:#FF385C;">₹${totalDue.toLocaleString('en-IN')}</div>
    </div>
  </div>

  <div class="footer">
    ${BRAND} · Contact: Mr. Shahanshah 9450055554 · Mr. Firoz Khan 8299600709<br>
    Generated from UHHS Admin System
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:12px 32px;background:#FF385C;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:15px;">🖨️ Print / Save as PDF</button>
  </div>

  <script>
    setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}


// ============ CROP MODAL ============
function openCropModal(file, callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';

  modal.innerHTML = `
    <div class="modal-box" style="max-width:700px;padding:16px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>✂️ Crop Image</h2>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">
        Drag corners to select area. Click Save when done.
      </div>

      <div style="position:relative;overflow:hidden;background:#000;border-radius:8px;">
        <canvas id="cropCanvas" style="display:block;max-width:100%;cursor:crosshair;"></canvas>
        <div id="cropOverlay" style="position:absolute;border:2px dashed #FF385C;background:rgba(255,56,92,0.15);pointer-events:none;display:none;"></div>
      </div>

      <div class="btn-row" style="margin-top:12px;justify-content:center;">
        <button class="btn-sm" onclick="applyCrop()" style="background:#00A699;">✂️ Apply Crop</button>
        <button class="btn-sm outline" onclick="resetCrop()">↻ Reset</button>
        <button class="btn-sm" onclick="saveCroppedImage()" style="background:#FF385C;">💾 Save</button>
        <button class="btn-sm secondary" onclick="skipCrop()">⏭️ Use Original</button>
      </div>

      <div id="cropInfo" style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const canvas = document.getElementById('cropCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('cropOverlay');
  const info = document.getElementById('cropInfo');

  const img = new Image();
  img.onload = () => {
    // Fit image to max 600px width
    const maxW = 600;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    info.innerHTML = `Original: ${img.width}×${img.height} · Displayed: ${Math.round(canvas.width)}×${Math.round(canvas.height)}`;

    window._cropData = {
      img, canvas, ctx, scale,
      originalFile: file,
      callback,
      selection: null,
      startX: 0, startY: 0,
      isDragging: false
    };

    // Mouse events
    canvas.onmousedown = startCropSelect;
    canvas.onmousemove = updateCropSelect;
    canvas.onmouseup = endCropSelect;
    canvas.ontouchstart = e => { e.preventDefault(); startCropSelect(e.touches[0]); };
    canvas.ontouchmove = e => { e.preventDefault(); updateCropSelect(e.touches[0]); };
    canvas.ontouchend = e => { e.preventDefault(); endCropSelect(); };
  };
  img.src = URL.createObjectURL(file);
}

function startCropSelect(e) {
  const cd = window._cropData;
  if (!cd) return;
  const rect = cd.canvas.getBoundingClientRect();
  cd.startX = e.clientX - rect.left;
  cd.startY = e.clientY - rect.top;
  cd.isDragging = true;
}

function updateCropSelect(e) {
  const cd = window._cropData;
  if (!cd || !cd.isDragging) return;
  const rect = cd.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const overlay = document.getElementById('cropOverlay');
  const canvas = cd.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const canvasOffsetX = canvas.offsetLeft;
  const canvasOffsetY = canvas.offsetTop;

  const left = Math.min(cd.startX, x);
  const top = Math.min(cd.startY, y);
  const width = Math.abs(x - cd.startX);
  const height = Math.abs(y - cd.startY);

  cd.selection = { x: left, y: top, w: width, h: height };

  overlay.style.display = 'block';
  overlay.style.left = (canvas.offsetLeft + left) + 'px';
  overlay.style.top = (canvas.offsetTop + top) + 'px';
  overlay.style.width = width + 'px';
  overlay.style.height = height + 'px';

  document.getElementById('cropInfo').innerHTML =
    `Selection: ${Math.round(width)}×${Math.round(height)}px`;
}

function endCropSelect() {
  const cd = window._cropData;
  if (cd) cd.isDragging = false;
}

function applyCrop() {
  const cd = window._cropData;
  if (!cd || !cd.selection || cd.selection.w < 10 || cd.selection.h < 10) {
    fsn.info('Info', 'Please select an area first (drag on image)');
    return;
  }
  const { canvas, ctx, img, scale, selection } = cd;
  // Get cropped area
  const sx = selection.x / scale;
  const sy = selection.y / scale;
  const sw = selection.w / scale;
  const sh = selection.h / scale;

  // Draw cropped image
  canvas.width = selection.w;
  canvas.height = selection.h;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, selection.w, selection.h);

  cd.selection = null;
  document.getElementById('cropOverlay').style.display = 'none';
  document.getElementById('cropInfo').innerHTML = `✅ Cropped to ${Math.round(canvas.width)}×${Math.round(canvas.height)}`;
}

function resetCrop() {
  const cd = window._cropData;
  if (!cd) return;
  const { img } = cd;
  const maxW = 600;
  const scale = Math.min(1, maxW / img.width);
  cd.canvas.width = img.width * scale;
  cd.canvas.height = img.height * scale;
  cd.scale = scale;
  cd.ctx.drawImage(img, 0, 0, cd.canvas.width, cd.canvas.height);
  cd.selection = null;
  document.getElementById('cropOverlay').style.display = 'none';
  document.getElementById('cropInfo').innerHTML = `Reset · ${img.width}×${img.height}`;
}

function saveCroppedImage() {
  const cd = window._cropData;
  if (!cd) return;
  cd.canvas.toBlob(blob => {
    const croppedFile = new File([blob], cd.originalFile.name, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    cd.callback(croppedFile);
    document.querySelector('.modal-overlay').remove();
    window._cropData = null;
  }, 'image/jpeg', 0.9);
}

function skipCrop() {
  const cd = window._cropData;
  if (!cd) return;
  cd.callback(cd.originalFile);
  document.querySelector('.modal-overlay').remove();
  window._cropData = null;
}


async function deleteVehiclePhoto(bkId, path) {
  if (!confirm('Delete vehicle photo?')) return;
  try {
    await sb.storage.from('id-proofs').remove([path]);
    await sb.from('guest_register').update({ vehicle_photo_path: null }).eq('booking_id', bkId);
    fsn.success('Success', '✅ Vehicle photo deleted');
    editBooking(bkId);
  } catch (e) {
    fsn.error('Error', '❌ ' + e.message);
  }
}

function onEditVehiclePick(input) {
  if (!input.files || !input.files[0]) return;
  openCropModal(input.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    input.files = dt.files;
    const url = URL.createObjectURL(croppedFile);
    const sizeMB = (croppedFile.size / 1024 / 1024).toFixed(1);
    document.getElementById('vehiclePhotoPreview').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:6px 0;">
        <img src="${url}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;" />
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--green);font-weight:700;">✅ New Photo Ready</div>
          <div style="font-size:10px;color:var(--muted);">${sizeMB} MB · Save to upload</div>
        </div>
        <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
          onclick="document.getElementById('vehiclePhotoCam').value='';document.getElementById('vehiclePhotoGal').value='';document.getElementById('vehiclePhotoPreview').innerHTML='';">🗑️</button>
      </div>`;
  });
}

// Fix updateBooking to use new input IDs


function showWATemplatesMenu(bkId, btn) {
  document.querySelectorAll('.wa-templates-menu').forEach(el => el.remove());
  const menu = document.createElement('div');
  menu.className = 'wa-templates-menu';
  menu.style.cssText = 'position:fixed;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:8px;z-index:9999;min-width:220px;';
  const rect = btn.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.max(10, rect.left - 100) + 'px';
  menu.innerHTML = `
    <div style="font-size:11px;color:#717171;padding:4px 8px;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Templates</div>
    <button class="wa-tpl-btn" onclick="sendBookingFormat('${bkId}');closeWAMenu()">📋 Booking Format</button>
    <button class="wa-tpl-btn" onclick="sendCaretakerFormat('${bkId}');closeWAMenu()">🏠 Caretaker Update</button>
    <button class="wa-tpl-btn" onclick="sendPaymentFormat('${bkId}');closeWAMenu()">💳 Payment Update</button>
    <button class="wa-tpl-btn" onclick="sendIDGroupFormat('${bkId}');closeWAMenu()">🪪 ID Upload</button>
  `;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', closeWAMenuOnClickOutside), 100);
}

function closeWAMenu() {
  document.querySelectorAll('.wa-templates-menu').forEach(el => el.remove());
  document.removeEventListener('click', closeWAMenuOnClickOutside);
}

function closeWAMenuOnClickOutside(e) {
  if (!e.target.closest('.wa-templates-menu') && !e.target.closest('[onclick*=showWATemplates]')) {
    closeWAMenu();
  }
}
