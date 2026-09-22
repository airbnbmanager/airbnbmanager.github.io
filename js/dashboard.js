// ═══════════════════════════════════════════════════════════
// ⏰ ATTENTION NEEDED helper (late checkouts + arriving soon)
// ═══════════════════════════════════════════════════════════
function computeAttention(checkinsToday, checkoutsToday) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  const parseTime = (t, defaultMin) => {
    if (!t) return defaultMin;
    const s = t.toString().trim();
    const m1 = s.match(/^(\d{1,2}):(\d{2})/);
    if (m1) return parseInt(m1[1]) * 60 + parseInt(m1[2]);
    const m2 = s.match(/^(\d{1,2})\s*(AM|PM)/i);
    if (m2) {
      let h = parseInt(m2[1]);
      if (m2[2].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (m2[2].toUpperCase() === 'AM' && h === 12) h = 0;
      return h * 60;
    }
    return defaultMin;
  };
  
  const lateCheckouts = checkoutsToday.filter(x => {
    const ct = parseTime(x.check_out_time, 11 * 60);
    return nowMinutes > ct;
  }).map(x => {
    const ct = parseTime(x.check_out_time, 11 * 60);
    const delayMin = nowMinutes - ct;
    const delayStr = delayMin >= 60 
      ? Math.floor(delayMin/60) + 'h ' + (delayMin%60) + 'm'
      : delayMin + 'm';
    return Object.assign({}, x, { delay: delayStr });
  });
  
  const arrivingSoon = checkinsToday.filter(x => {
    const ct = parseTime(x.check_in_time, 14 * 60);
    const diff = ct - nowMinutes;
    return diff >= -30 && diff <= 180;
  }).map(x => {
    const ct = parseTime(x.check_in_time, 14 * 60);
    const diff = ct - nowMinutes;
    let eta;
    if (diff < 0) eta = Math.abs(diff) + 'm late';
    else if (diff < 60) eta = 'in ' + diff + 'm';
    else eta = 'in ' + Math.floor(diff/60) + 'h ' + (diff%60) + 'm';
    return Object.assign({}, x, { eta });
  });
  
  return { lateCheckouts, arrivingSoon };
}

/**
 * Dashboard Module
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

// ═══════════════════════════════════════════════════════════
// 🏷️ Rating Badge & Modal Helpers
// ═══════════════════════════════════════════════════════════
window.getRatingBadge = function(rating) {
  if (rating === 'good') return ' <span title="Trusted guest" style="font-size:12px;">⭐</span>';
  if (rating === 'bad') return ' <span title="Bad rating - see notes" style="font-size:12px;color:#DC2626;">⚠️</span>';
  if (rating === 'normal') return ' <span title="Normal guest" style="font-size:10px;opacity:0.6;">😐</span>';
  return '';
};

window.openBookingFromDashboard = function(bkId) {
  if (typeof editBooking === 'function') {
    editBooking(bkId);
  } else if (typeof navigate === 'function') {
    navigate('bookings');
    setTimeout(() => {
      if (typeof highlightEntity === 'function') highlightEntity(bkId, 'booking');
    }, 800);
  }
};

// WhatsApp action fallbacks if undefined in whatsapp.js
window.sendCheckinReminder = window.sendCheckinReminder || function(bkId) {
  if (typeof shareBookingWhatsApp === 'function') shareBookingWhatsApp(bkId);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('WhatsApp', 'Opening message templates');
};

window.requestGuestID = window.requestGuestID || function(bkId) {
  if (typeof showPendingIdModal === 'function') showPendingIdModal(0);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('ID Request', 'Opening ID Modal');
};

window.requestReview = window.requestReview || function(bkId) {
  if (typeof requestGoogleReview === 'function') requestGoogleReview(bkId);
  else if (typeof showWATemplatesMenu === 'function') showWATemplatesMenu(bkId);
  else if (window.fsn) fsn.info('Review', 'Opening review template');
};

// Interactive Tab State
window._activeDashTab = window._activeDashTab || 'flow';
window.switchDashTab = function(tabKey, btn) {
  window._activeDashTab = tabKey;
  document.querySelectorAll('.dash-nav-tab').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const el = document.querySelector(`.dash-nav-tab[data-tab="${tabKey}"]`);
    if (el) el.classList.add('active');
  }
  document.querySelectorAll('.dash-tab-pane').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('dash-tab-' + tabKey);
  if (target) target.classList.add('active');
};

// Interactive Room Status Matrix Filter
window.filterRoomMatrix = function(status, btn) {
  const container = document.getElementById('dashRoomMatrix');
  if (!container) return;
  document.querySelectorAll('.room-matrix-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const items = container.querySelectorAll('.room-matrix-item');
  items.forEach(it => {
    if (status === 'all' || it.dataset.status === status) {
      it.style.display = 'flex';
    } else {
      it.style.display = 'none';
    }
  });
};

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD RENDER
// ═══════════════════════════════════════════════════════════
async function renderDashboard() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('metrics');
  renderShell(`<div class="loading">Loading dashboard...</div>`, 'dashboard');
  
  // 🔧 AUTO Payment Overflow Fix (silent, runs on every dashboard load)
  try {
    if (typeof window.autoFixOverflowPayments === 'function') {
      await window.autoFixOverflowPayments(true);
    }
  } catch(e) { console.warn('Auto overflow fix failed:', e); }

  const activeUsers = await getActiveUsers();

  const today = new Date().toISOString().slice(0, 10);
  const day7 = dateAdd(today, 7);
  const monthStart = today.slice(0, 7) + '-01';
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = today.slice(0, 7) + '-' + String(lastDay).padStart(2, '0');

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
  const maintUnits = allFlats.filter(x => x.status === 'Blocked-Maintenance');
  const totalProps = allFlats.length;

  // Financial KPIs
  const paidMap = {};
  allPayments.forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });

  const todayCheckinBookings = allBookings.filter(b => b.check_in === today);
  const todayRevenue = todayCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const todayCollected = todayCheckinBookings.reduce((s, b) => s + (paidMap[b.booking_id] || 0), 0);
  const todayPending = todayRevenue - todayCollected;

  const todayPaymentsReceived = allPayments
    .filter(p => p.payment_date === today)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const monthCheckinBookings = allBookings.filter(b => {
    const ci = b.check_in || '';
    return ci >= monthStart && ci <= monthEnd && !b.is_cancelled;
  });
  const monthRevenue = monthCheckinBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const monthCollected = monthCheckinBookings.reduce((s, b) => s + (paidMap[b.booking_id] || 0), 0);

  const pendingBalance = monthCheckinBookings.reduce((s, b) => {
    const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
    return s + (due > 0 ? due : 0);
  }, 0);

  const monthBookings = monthCheckinBookings.length;

  const upcoming7 = allBookings
    .filter(b => b.check_in > today && b.check_in <= day7)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

  // Active stays
  const activeNow = allBookings.filter(b => b.check_in <= today && (b.check_out > today || !b.check_out));

  // Attendance today
  const presentToday = (attendance || []).filter(a => a.status === 'Present').length;
  const totalEmps = (emps || []).length;

  // Pending tasks
  const urgentTasks = (tasks || []).filter(t => t.priority === 'Urgent').length;
  const maintPending = (maint || []).length;

  // Occupancy %
  const occupancyPct = totalProps > 0 ? Math.round(bookedNow.length / totalProps * 100) : 0;

  // Extended Stays & Shifts
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

  const bName = b => `${propLabel(b.rooms) || b.room_id || '-'}`;
  const fName = fl => `${propLabel(fl.rooms) || fl.room_id || '-'}`;

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : (hour < 17 ? 'Good Afternoon' : 'Good Evening');
  const userName = SESSION.name || (SESSION.role ? (SESSION.role.charAt(0).toUpperCase() + SESSION.role.slice(1)) : 'Host');

  // WhatsApp Tasks Computation
  const tomorrow = dateAdd(today, 1);
  const yesterday = dateAdd(today, -1);

  const checkinReminders = allBookings.filter(b => b.check_in === tomorrow && b.phone);
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const arrivingSoonWA = allBookings.filter(b => {
    if (!b.phone || b.check_in !== today) return false;
    const t = (b.check_in_time || '14:00').toString();
    let mins = 14 * 60;
    const m24 = t.match(/^(\d{1,2}):(\d{2})/);
    if (m24) mins = parseInt(m24[1]) * 60 + parseInt(m24[2]);
    const diff = mins - nowMinutes;
    return diff >= -30 && diff <= 120;
  });

  const checkoutReminders = allBookings.filter(b => {
    if (!b.phone || !b.check_out) return false;
    return b.check_out === today && b.check_in <= today;
  });

  const sevenDaysAgo = dateAdd(today, -7);
  const reviewRequests = allBookings.filter(b => {
    if (!b.phone || !b.check_out) return false;
    return b.check_out >= sevenDaysAgo && b.check_out < today;
  });

  const noIdBookings = allBookings.filter(b => {
    if (!b.phone) return false;
    if (b.check_in > today || b.check_out < today) return false;
    const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
    return !hasId;
  });

  const totalWATasks = checkinReminders.length + arrivingSoonWA.length + checkoutReminders.length + reviewRequests.length + noIdBookings.length;
  const { lateCheckouts, arrivingSoon } = computeAttention(realCheckins, realCheckouts);
  const totalAttention = lateCheckouts.length + arrivingSoon.length;

  renderShell(`
    <style id="dash-custom-styles">
      .dash-wrap { max-width: 1360px; margin: 0 auto; padding: 0 4px; }
      .dash-hero {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        box-shadow: var(--shadow);
        margin-bottom: 20px;
      }
      .dash-hero-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      .dash-title-group { flex: 1; min-width: 250px; }
      .dash-greeting {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dash-heading {
        font-size: 22px;
        font-weight: 800;
        color: var(--text);
        margin: 4px 0 2px;
        letter-spacing: -0.3px;
      }
      .dash-date-str {
        font-size: 13px;
        color: var(--muted);
        font-weight: 500;
      }
      .dash-hero-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .dash-online-badge {
        cursor: pointer;
        padding: 6px 12px;
        background: var(--green-light);
        border: 1px solid var(--green);
        border-radius: 10px;
        transition: all 0.2s ease;
      }
      .dash-online-lbl {
        font-size: 9px;
        color: var(--green);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .dash-online-val {
        font-size: 13px;
        font-weight: 800;
        color: var(--green);
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .dash-online-dot {
        width: 7px;
        height: 7px;
        background: var(--green);
        border-radius: 50%;
        display: inline-block;
        animation: pulse-dot 1.5s ease-in-out infinite;
      }
      .dash-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--text);
        user-select: none;
      }
      .dash-pill-btn:hover {
        background: var(--bg);
        border-color: var(--primary);
        color: var(--primary);
        transform: translateY(-1px);
      }
      .dash-pill-btn.primary {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 2px 6px var(--primary-glow);
      }
      .dash-pill-btn.primary:hover {
        background: var(--primary-dark);
        border-color: var(--primary-dark);
        color: #FFFFFF;
      }

      /* Room Matrix Section */
      .dash-matrix-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin: 18px 0 12px;
        padding-top: 16px;
        border-top: 1px solid var(--border-light);
      }
      .dash-matrix-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--muted);
        letter-spacing: 0.5px;
      }
      .room-matrix-tabs {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
      }
      .room-matrix-tabs::-webkit-scrollbar { display: none; }
      .room-matrix-tab {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--muted);
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .room-matrix-tab:hover {
        color: var(--text);
        border-color: var(--primary);
      }
      .room-matrix-tab.active {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 0 10px var(--primary-glow);
      }
      .room-matrix-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
        gap: 8px;
      }
      .room-matrix-item {
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-light);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        transition: all 0.2s ease;
        background: var(--card);
      }
      .room-matrix-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08);
      }
      .room-matrix-item.status-ready { background: #ECFDF5; border-color: #A7F3D0; }
      .room-matrix-item.status-ready span { color: #065F46; }
      .room-matrix-item.status-booked { background: #F0F9FF; border-color: #BAE6FD; }
      .room-matrix-item.status-booked span { color: #075985; }
      .room-matrix-item.status-dirty { background: #FFFBEB; border-color: #FDE68A; }
      .room-matrix-item.status-dirty span { color: #92400E; }
      .room-matrix-item.status-maint { background: #FEF2F2; border-color: #FECACA; }
      .room-matrix-item.status-maint span { color: #991B1B; }

      /* Hero KPI Ribbon */
      .dash-kpi-ribbon {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 14px;
        margin-bottom: 22px;
      }
      .dash-kpi-card {
        background: var(--card);
        border-radius: 16px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      .dash-kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-hover);
        border-color: var(--primary);
      }
      .dash-kpi-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 4px;
      }
      .dash-kpi-card.occupancy::before { background: var(--blue); }
      .dash-kpi-card.checkins::before { background: var(--green); }
      .dash-kpi-card.checkouts::before { background: var(--primary); }
      .dash-kpi-card.revenue::before { background: #10B981; }

      .dash-kpi-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .dash-kpi-label {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--muted);
      }
      .dash-kpi-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .dash-kpi-icon.occupancy { background: var(--blue-light); color: var(--blue); }
      .dash-kpi-icon.checkins { background: var(--green-light); color: var(--green); }
      .dash-kpi-icon.checkouts { background: var(--primary-light); color: var(--primary); }
      .dash-kpi-icon.revenue { background: var(--green-light); color: #10B981; }

      .dash-kpi-num {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
        line-height: 1.1;
        letter-spacing: -0.5px;
      }
      .dash-kpi-sub {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dash-progress-bar {
        height: 5px;
        background: var(--border-light);
        border-radius: 4px;
        margin-top: 10px;
        overflow: hidden;
      }
      .dash-progress-fill {
        height: 100%;
        background: var(--blue);
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      /* Segmented Tab Navigation */
      .dash-nav-bar {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 8px;
        margin-bottom: 18px;
        border-bottom: 1px solid var(--border);
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .dash-nav-bar::-webkit-scrollbar { display: none; }
      .dash-nav-tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border-radius: 12px;
        font-size: 13.5px;
        font-weight: 700;
        background: var(--card);
        color: var(--muted);
        border: 1px solid var(--border);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
        user-select: none;
      }
      .dash-nav-tab:hover {
        color: var(--text);
        border-color: var(--primary);
      }
      .dash-nav-tab.active {
        background: var(--primary);
        color: #FFFFFF;
        border-color: var(--primary);
        box-shadow: 0 4px 14px var(--primary-glow);
      }
      .dash-tab-badge {
        font-size: 11px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 20px;
        background: rgba(0,0,0,0.08);
        color: inherit;
      }
      .dash-nav-tab.active .dash-tab-badge {
        background: rgba(255,255,255,0.25);
        color: #FFFFFF;
      }

      /* Tab Content Panels */
      .dash-tab-pane {
        display: none;
        animation: fadeIn 0.2s ease-in-out;
      }
      .dash-tab-pane.active {
        display: block;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Attention Banner */
      .dash-attention-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-left: 5px solid var(--primary);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 18px;
        box-shadow: var(--shadow);
      }
      .dash-attention-card.all-clear {
        border-left-color: var(--green);
        background: var(--green-light);
        border-color: var(--green);
      }
      .dash-attention-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .dash-attention-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Operational Cards Grid */
      .dash-ops-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .dash-panel-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px;
        box-shadow: var(--shadow);
      }
      .dash-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border-light);
      }
      .dash-panel-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dash-panel-count {
        font-size: 11.5px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 20px;
        background: var(--bg);
        color: var(--muted);
      }
      .dash-panel-count.green { background: var(--green-light); color: var(--green); }
      .dash-panel-count.blue { background: var(--blue-light); color: var(--blue); }
      .dash-panel-count.primary { background: var(--primary-light); color: var(--primary); }
      .dash-panel-count.yellow { background: var(--yellow-light); color: var(--yellow); }
      .dash-panel-count.red { background: var(--red-light); color: var(--red); }

      /* Guest Card Items */
      .dash-guest-item {
        padding: 12px;
        border-radius: 12px;
        background: var(--bg);
        border: 1px solid var(--border-light);
        margin-bottom: 10px;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .dash-guest-item:hover {
        background: var(--card);
        border-color: var(--primary);
        box-shadow: var(--shadow);
      }
      .dash-guest-info { flex: 1; min-width: 0; }
      .dash-guest-primary {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .dash-guest-name {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--primary);
        cursor: pointer;
        text-decoration: none;
      }
      .dash-guest-name:hover { text-decoration: underline; }
      .dash-unit-chip {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        background: var(--primary-light);
        color: var(--primary);
        white-space: nowrap;
      }
      .dash-guest-meta {
        font-size: 12px;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .dash-guest-meta a {
        color: inherit;
        text-decoration: none;
      }
      .dash-guest-meta a:hover {
        color: var(--primary);
        text-decoration: underline;
      }
      .dash-action-icons {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .dash-icon-btn {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--text);
        cursor: pointer;
        text-decoration: none;
        transition: all 0.15s ease;
      }
      .dash-icon-btn:hover {
        background: var(--bg);
        border-color: var(--primary);
        transform: scale(1.05);
      }
      .dash-icon-btn.wa {
        background: #DCFCE7;
        color: #166534;
        border-color: #BBF7D0;
      }
      .dash-icon-btn.wa:hover {
        background: #22C55E;
        color: #FFFFFF;
        border-color: #22C55E;
      }

      /* Clean Empty States */
      .dash-empty-state {
        text-align: center;
        padding: 24px 12px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 500;
      }

      /* Monthly Dark Aesthetic Financial Card */
      .dash-month-card {
        background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
        border-radius: 18px;
        padding: 22px;
        color: #FFFFFF;
        margin-top: 24px;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
      }
      .dash-month-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        margin-bottom: 18px;
      }
      .dash-month-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.6);
      }
      .dash-month-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 16px;
      }
      .dash-month-item {
        background: rgba(255, 255, 255, 0.04);
        padding: 14px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .dash-month-lbl {
        font-size: 11.5px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.65);
        margin-bottom: 6px;
      }
      .dash-month-val {
        font-size: 20px;
        font-weight: 800;
        line-height: 1.2;
      }

      /* Responsive rules */
      @media (max-width: 768px) {
        .dash-hero { padding: 14px; }
        .dash-heading { font-size: 19px; }
        .dash-kpi-ribbon { grid-template-columns: 1fr 1fr; gap: 10px; }
        .dash-kpi-card { padding: 12px 14px; }
        .dash-kpi-num { font-size: 22px; }
        .dash-ops-grid { grid-template-columns: 1fr; }
        .room-matrix-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
        .dash-guest-item { flex-direction: column; align-items: flex-start; gap: 8px; }
        .dash-action-icons { width: 100%; justify-content: flex-end; }
        .dash-month-grid { grid-template-columns: 1fr 1fr; }
      }
      @media (max-width: 480px) {
        .dash-kpi-ribbon { grid-template-columns: 1fr; }
        .dash-month-grid { grid-template-columns: 1fr; }
      }
    </style>

    <div class="dash-wrap">
      ${updateNoticeHTML()}
      ${['owner','admin'].includes(SESSION.role) ? syncInfoHTML() : ''}

      <!-- HERO HEADER -->
      <div class="dash-hero">
        <div class="dash-hero-top">
          <div class="dash-title-group">
            <div class="dash-greeting">
              <span>👋</span> ${greeting}, ${userName}
            </div>
            <div class="dash-heading">Operations Dashboard</div>
            <div class="dash-date-str">
              ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              &bull; <strong>${bookedNow.length}</strong>/${totalProps} Units Occupied (${occupancyPct}%)
            </div>
          </div>

          <div class="dash-hero-actions">
            ${SESSION.role === 'developer' ? `
            <div class="dash-online-badge" onclick="showActiveUsersModal()" title="Click to see online users">
              <div class="dash-online-lbl">Online Now</div>
              <div class="dash-online-val">
                <span class="dash-online-dot"></span>
                ${activeUsers.length} online
              </div>
            </div>
            ` : ''}
            <button class="dash-pill-btn" onclick="renderDashboard()" title="Refresh live data">🔄 Refresh</button>
            <button class="dash-pill-btn" onclick="navigate('flats')">🛏️ Flats Status</button>
            <button class="dash-pill-btn" onclick="navigate('bookings')">📅 Bookings</button>
            ${canModerate() ? `<button class="dash-pill-btn primary" onclick="renderAddBooking && renderAddBooking()">➕ New Booking</button>` : ''}
          </div>
        </div>

        <!-- QUICK ROOM STATUS MATRIX -->
        <div class="dash-matrix-header">
          <div class="dash-matrix-title">All Properties At-A-Glance (${allFlats.length})</div>
          <div class="room-matrix-tabs">
            <button class="room-matrix-tab active" onclick="filterRoomMatrix('all', this)">All (${allFlats.length})</button>
            <button class="room-matrix-tab" onclick="filterRoomMatrix('ready', this)">Ready (${freeClean.length})</button>
            <button class="room-matrix-tab" onclick="filterRoomMatrix('booked', this)">Booked (${bookedNow.length})</button>
            <button class="room-matrix-tab" onclick="filterRoomMatrix('dirty', this)">Cleaning (${dirty.length})</button>
            ${maintUnits.length > 0 ? `<button class="room-matrix-tab" onclick="filterRoomMatrix('maint', this)">Maint (${maintUnits.length})</button>` : ''}
          </div>
        </div>

        <div class="room-matrix-grid" id="dashRoomMatrix">
          ${allFlats.map(fl => {
            const isBooked = fl.status === 'Booked';
            const isDirty = fl.cleaning_status === 'Dirty';
            const isMaint = fl.status === 'Blocked-Maintenance';
            let dotColor = '#10B981';
            let label = 'Ready';
            let filterType = 'ready';

            if (isMaint) { dotColor = '#EF4444'; label = 'Maint'; filterType = 'maint'; }
            else if (isBooked) { dotColor = '#0EA5E9'; label = 'Booked'; filterType = 'booked'; }
            else if (isDirty) { dotColor = '#F59E0B'; label = 'Dirty'; filterType = 'dirty'; }

            return `
              <div class="room-matrix-item status-${filterType}" data-status="${filterType}" onclick="navigate('flats')" title="${fName(fl)}: ${label}">
                <span style="font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fName(fl)}</span>
                <span style="display:flex;align-items:center;gap:4px;">
                  <span style="font-size:10px;font-weight:600;opacity:0.85;">${label}</span>
                  <span style="width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;"></span>
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- HERO KPI RIBBON (4 CORE METRICS) -->
      <div class="dash-kpi-ribbon">
        <!-- KPI 1: Occupancy -->
        <div class="dash-kpi-card occupancy" onclick="filterAndShowFlats('occupied')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Live Occupancy</span>
            <div class="dash-kpi-icon occupancy">🛏️</div>
          </div>
          <div class="dash-kpi-num">${occupancyPct}%</div>
          <div class="dash-kpi-sub">${bookedNow.length} of ${totalProps} flats booked</div>
          <div class="dash-progress-bar">
            <div class="dash-progress-fill" style="width:${occupancyPct}%;"></div>
          </div>
        </div>

        <!-- KPI 2: Today's Check-ins -->
        <div class="dash-kpi-card checkins" onclick="filterAndShowBookings('checkinToday')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Today's Check-ins</span>
            <div class="dash-kpi-icon checkins">📥</div>
          </div>
          <div class="dash-kpi-num">${realCheckins.length}</div>
          <div class="dash-kpi-sub">${realCheckins.filter(x => x.actual_checkin).length} already checked-in &bull; ${realCheckins.filter(x => !x.actual_checkin).length} pending</div>
        </div>

        <!-- KPI 3: Today's Check-outs -->
        <div class="dash-kpi-card checkouts" onclick="filterAndShowBookings('checkoutToday')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Today's Check-outs</span>
            <div class="dash-kpi-icon checkouts">📤</div>
          </div>
          <div class="dash-kpi-num">${realCheckouts.length}</div>
          <div class="dash-kpi-sub">${realCheckouts.filter(x => x.actual_checkout).length} departed &bull; ${realCheckouts.filter(x => !x.actual_checkout).length} remaining</div>
        </div>

        <!-- KPI 4: Today's Financial Flow -->
        <div class="dash-kpi-card revenue" onclick="filterAndShowBookings('todayRevenue')">
          <div class="dash-kpi-top">
            <span class="dash-kpi-label">Today's Booking Value</span>
            <div class="dash-kpi-icon revenue">💰</div>
          </div>
          <div class="dash-kpi-num">₹${todayRevenue.toLocaleString('en-IN')}</div>
          <div class="dash-kpi-sub" style="color:var(--text-secondary);">
            Collected: <strong style="color:var(--green);">₹${todayCollected.toLocaleString('en-IN')}</strong> &bull; Due: <strong style="color:var(--red);">₹${todayPending.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      <!-- SEGMENTED NAVIGATION TABS -->
      <div class="dash-nav-bar">
        <button class="dash-nav-tab ${window._activeDashTab === 'flow' ? 'active' : ''}" data-tab="flow" onclick="switchDashTab('flow', this)">
          🛎️ Guest Flow <span class="dash-tab-badge">${realCheckins.length + realCheckouts.length}</span>
        </button>
        <button class="dash-nav-tab ${window._activeDashTab === 'rooms' ? 'active' : ''}" data-tab="rooms" onclick="switchDashTab('rooms', this)">
          🛏️ Rooms & Care <span class="dash-tab-badge">${dirty.length + freeClean.length}</span>
        </button>
        <button class="dash-nav-tab ${window._activeDashTab === 'ops' ? 'active' : ''}" data-tab="ops" onclick="switchDashTab('ops', this)">
          👥 Staff & Tasks <span class="dash-tab-badge">${presentToday}/${totalEmps}</span>
        </button>
        <button class="dash-nav-tab ${window._activeDashTab === 'wa' ? 'active' : ''}" data-tab="wa" onclick="switchDashTab('wa', this)">
          📱 WhatsApp Tasks <span class="dash-tab-badge">${totalWATasks}</span>
        </button>
      </div>

      <!-- TAB 1: GUEST FLOW (CHECK-INS, CHECK-OUTS, ATTENTION, ACTIVE STAYS) -->
      <div class="dash-tab-pane ${window._activeDashTab === 'flow' ? 'active' : ''}" id="dash-tab-flow">
        <!-- Attention Needed Box (Late checkouts / Arriving soon / Laundry reminders) -->
        <div class="dash-attention-card ${totalAttention === 0 ? 'all-clear' : ''}" id="dashAttentionCard">
          <div class="dash-attention-header">
            <div class="dash-attention-title">
              <span>⏰</span> Attention Needed (<span style="color:var(--primary);font-weight:900;">${totalAttention}</span>)
            </div>
            ${totalAttention > 0 ? `<span class="badge yellow" style="font-size:11px;">Immediate Action Required</span>` : `<span class="badge green" style="font-size:11px;">All on track ✅</span>`}
          </div>
          <div id="dashAttentionContent" style="max-height:260px;overflow-y:auto;">
            ${lateCheckouts.length > 0 ? `
              <div style="margin-bottom:12px;">
                <div style="font-size:12px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  🚨 Late Check-outs (${lateCheckouts.length})
                </div>
                ${lateCheckouts.map(x => `
                  <div class="dash-guest-item alert-late">
                    <div class="dash-guest-info">
                      <div class="dash-guest-primary">
                        <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                        ${getRatingBadge(x.client_rating)}
                        <span class="dash-unit-chip">${bName(x)}</span>
                      </div>
                      <div class="dash-guest-meta" style="color:var(--red);">
                        <strong>⚠️ ${x.delay} late</strong> &bull; Scheduled checkout: ${x.check_out_time || '11:00 AM'}
                        ${x.phone ? `&bull; 📞 <a href="tel:${x.phone}">${x.phone}</a>` : ''}
                      </div>
                    </div>
                    <div class="dash-action-icons">
                      ${x.phone ? `<a href="tel:${x.phone}" class="dash-icon-btn" title="Call Guest">📞</a>` : ''}
                      ${x.phone ? `<button class="dash-icon-btn wa" onclick="sendCheckoutReminder('${x.booking_id}')" title="Send WhatsApp Checkout Alert">💬</button>` : ''}
                      <button class="dash-pill-btn" style="padding:5px 10px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">View</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${arrivingSoon.length > 0 ? `
              <div style="margin-top:8px;">
                <div style="font-size:12px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  ⏳ Arriving Soon (${arrivingSoon.length})
                </div>
                ${arrivingSoon.map(x => `
                  <div class="dash-guest-item alert-arriving">
                    <div class="dash-guest-info">
                      <div class="dash-guest-primary">
                        <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                        ${getRatingBadge(x.client_rating)}
                        <span class="dash-unit-chip">${bName(x)}</span>
                      </div>
                      <div class="dash-guest-meta" style="color:var(--blue);">
                        <strong>🕐 Expected ${x.eta}</strong> (${x.check_in_time || '2:00 PM'})
                        ${x.phone ? `&bull; 📞 <a href="tel:${x.phone}">${x.phone}</a>` : ''}
                      </div>
                    </div>
                    <div class="dash-action-icons">
                      ${x.phone ? `<button class="dash-pill-btn primary" style="padding:5px 10px;font-size:11px;" onclick="sendArrivalDetails('${x.booking_id}')">🔑 Send Keys+WiFi</button>` : ''}
                      <button class="dash-pill-btn" style="padding:5px 10px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">View</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${totalAttention === 0 ? `
              <div class="sub" style="margin:4px 0 0;color:var(--green);font-size:13px;font-weight:600;">✅ All check-ins and check-outs are running smoothly on schedule.</div>
            ` : ''}
          </div>
        </div>

        <!-- 2 Column Operational Flow -->
        <div class="dash-ops-grid">
          <!-- Today's Check-ins -->
          <div class="dash-panel-card" style="border-top:4px solid var(--green);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>📥</span> Check-ins Today
              </div>
              <span class="dash-panel-count green">${realCheckins.length} Expected</span>
            </div>
            <div>
              ${realCheckins.length === 0 ? `<div class="dash-empty-state">No check-ins scheduled for today</div>` :
                realCheckins.map(x => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <div class="dash-guest-primary">
                        <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                        ${getRatingBadge(x.client_rating)}
                        <span class="dash-unit-chip">${bName(x)}</span>
                      </div>
                      <div class="dash-guest-meta">
                        <span>🕒 ${x.check_in_time || '2:00 PM'}</span>
                        ${x.phone ? `<span>📞 <a href="tel:${x.phone}">${x.phone}</a></span>` : ''}
                        ${x.has_vehicle ? `<span>🚗 ${(x.vehicle_name || '') + ' ' + (x.vehicle_number || '')}</span>` : ''}
                        ${x.actual_checkin ? `<span class="badge green" style="font-size:10px;">Arrived</span>` : ''}
                      </div>
                    </div>
                    <div class="dash-action-icons">
                      ${x.phone ? `<a href="tel:${x.phone}" class="dash-icon-btn" title="Call Guest">📞</a>` : ''}
                      ${x.phone ? `<button class="dash-icon-btn wa" onclick="shareBookingWhatsApp('${x.booking_id}')" title="Send WhatsApp Message">💬</button>` : ''}
                      <button class="dash-pill-btn" style="padding:5px 9px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">Open</button>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>

          <!-- Today's Check-outs -->
          <div class="dash-panel-card" style="border-top:4px solid var(--primary);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>📤</span> Check-outs Today
              </div>
              <span class="dash-panel-count primary">${realCheckouts.length} Scheduled</span>
            </div>
            <div>
              ${realCheckouts.length === 0 ? `<div class="dash-empty-state">No check-outs scheduled for today</div>` :
                realCheckouts.map(x => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <div class="dash-guest-primary">
                        <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                        ${getRatingBadge(x.client_rating)}
                        <span class="dash-unit-chip">${bName(x)}</span>
                      </div>
                      <div class="dash-guest-meta">
                        <span>🕒 ${x.check_out_time || '11:00 AM'}</span>
                        ${x.phone ? `<span>📞 <a href="tel:${x.phone}">${x.phone}</a></span>` : ''}
                        ${x.actual_checkout ? `<span class="badge green" style="font-size:10px;">Departed</span>` : ''}
                      </div>
                    </div>
                    <div class="dash-action-icons">
                      ${x.phone ? `<a href="tel:${x.phone}" class="dash-icon-btn" title="Call Guest">📞</a>` : ''}
                      ${x.phone ? `<button class="dash-icon-btn wa" onclick="sendCheckoutReminder('${x.booking_id}')" title="Send Checkout Reminder">🔔</button>` : ''}
                      <button class="dash-pill-btn" style="padding:5px 9px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">Open</button>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>

        <!-- Currently Staying Guests -->
        <div class="dash-panel-card">
          <div class="dash-panel-head">
            <div class="dash-panel-title">
              <span>🟢</span> Currently Staying (${activeNow.length} Active Stays)
            </div>
            <button class="dash-pill-btn" style="padding:4px 10px;font-size:11.5px;" onclick="filterAndShowBookings('currentStay')">View in Bookings →</button>
          </div>
          <div style="max-height:280px;overflow-y:auto;">
            ${activeNow.length === 0 ? `<div class="dash-empty-state">No guests currently staying</div>` :
              activeNow.map(x => `
                <div class="dash-guest-item" style="padding:10px 12px;">
                  <div class="dash-guest-info">
                    <div class="dash-guest-primary">
                      <span class="dash-guest-name" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</span>
                      ${getRatingBadge(x.client_rating)}
                      <span class="dash-unit-chip">${bName(x)}</span>
                    </div>
                    <div class="dash-guest-meta">
                      <span>Stay: <strong>${x.check_in}</strong> → <strong>${x.check_out || 'Open'}</strong></span>
                      ${x.phone ? `<span>📞 <a href="tel:${x.phone}">${x.phone}</a></span>` : ''}
                    </div>
                  </div>
                  <div class="dash-action-icons">
                    ${x.phone ? `<a href="tel:${x.phone}" class="dash-icon-btn" title="Call">📞</a>` : ''}
                    <button class="dash-pill-btn" style="padding:4px 9px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">Details</button>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>

      <!-- TAB 2: ROOMS & HOUSEKEEPING -->
      <div class="dash-tab-pane ${window._activeDashTab === 'rooms' ? 'active' : ''}" id="dash-tab-rooms">
        <div class="dash-ops-grid">
          <!-- Ready to Book -->
          <div class="dash-panel-card" style="border-top:4px solid var(--green);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>✅</span> Ready to Book
              </div>
              <span class="dash-panel-count green">${freeClean.length} Clean & Free</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
              ${freeClean.length === 0 ? `<div class="dash-empty-state">No clean, free flats available right now</div>` :
                freeClean.map(x => `
                  <div class="dash-guest-item status-ready" onclick="navigate('flats')" style="cursor:pointer;">
                    <div>
                      <strong style="color:var(--green);font-size:13px;">${fName(x)}</strong>
                      <div style="font-size:11px;color:var(--muted);">Clean & Ready for Guest</div>
                    </div>
                    <span class="badge green">Ready</span>
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="filterAndShowFlats('clean')">Open Flats Manager →</button>
          </div>

          <!-- Need Cleaning -->
          <div class="dash-panel-card" style="border-top:4px solid var(--yellow);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>🧹</span> Housekeeping Required
              </div>
              <span class="dash-panel-count yellow">${dirty.length} Dirty</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
              ${dirty.length === 0 ? `<div class="dash-empty-state">All flats are sparkling clean! 🎉</div>` :
                dirty.map(x => `
                  <div class="dash-guest-item status-dirty" onclick="navigate('flats')" style="cursor:pointer;">
                    <div>
                      <strong style="color:var(--yellow);font-size:13px;">${fName(x)}</strong>
                      <div style="font-size:11px;color:var(--muted);">Needs Turnover / Cleaning</div>
                    </div>
                    <span class="badge yellow">Needs Cleaning</span>
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="filterAndShowFlats('dirty')">Assign Cleaning →</button>
          </div>

          <!-- Maintenance Tickets -->
          <div class="dash-panel-card" style="border-top:4px solid var(--red);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>🔧</span> Active Maintenance
              </div>
              <span class="dash-panel-count red">${maintPending} Issues</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
              ${(maint || []).length === 0 ? `<div class="dash-empty-state">No pending maintenance issues! ✅</div>` :
                (maint || []).map(m => `
                  <div class="dash-guest-item status-maint" onclick="navigate('maintenance')" style="cursor:pointer;">
                    <div>
                      <strong style="color:var(--red);font-size:13px;">${m.room_id || 'General'}</strong>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${m.description?.slice(0, 45) || '-'}</div>
                    </div>
                    <span class="badge red" style="font-size:10px;">${m.priority || 'Pending'}</span>
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="navigate('maintenance')">Open Maintenance Hub →</button>
          </div>
        </div>
      </div>

      <!-- TAB 3: STAFF & TASKS -->
      <div class="dash-tab-pane ${window._activeDashTab === 'ops' ? 'active' : ''}" id="dash-tab-ops">
        <div class="dash-ops-grid">
          <!-- Staff Attendance Card -->
          <div class="dash-panel-card" style="border-top:4px solid var(--green);">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>👥</span> Staff Attendance Today
              </div>
              <span class="dash-panel-count green">${presentToday}/${totalEmps} Present</span>
            </div>
            <div style="padding:14px 0;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:var(--text);">${presentToday} <span style="font-size:18px;color:var(--muted);font-weight:500;">/ ${totalEmps}</span></div>
              <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Team members checked-in for duty today</div>
            </div>
            <button class="dash-pill-btn" style="width:100%;justify-content:center;" onclick="filterAndShowAttendance('present')">View Attendance Log →</button>
          </div>

          <!-- Pending Employee Tasks -->
          <div class="dash-panel-card" style="border-top:4px solid ${urgentTasks > 0 ? 'var(--red)' : 'var(--yellow)'};">
            <div class="dash-panel-head">
              <div class="dash-panel-title">
                <span>🧰</span> Pending Tasks
              </div>
              <span class="dash-panel-count yellow">${(tasks || []).length} Open</span>
            </div>
            <div style="max-height:260px;overflow-y:auto;">
              ${(tasks || []).length === 0 ? `<div class="dash-empty-state">All tasks completed! 👍</div>` :
                (tasks || []).slice(0, 5).map(t => `
                  <div class="dash-guest-item" onclick="navigate('tasks')" style="cursor:pointer;">
                    <div>
                      <strong style="font-size:12.5px;color:var(--text);">${t.employees?.name || 'Unassigned'}</strong>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${t.task_description?.slice(0, 45) || '-'}</div>
                    </div>
                    ${t.priority === 'Urgent' ? `<span class="badge red">Urgent</span>` : `<span class="badge yellow">Normal</span>`}
                  </div>
                `).join('')
              }
            </div>
            <button class="dash-pill-btn" style="width:100%;margin-top:10px;justify-content:center;" onclick="navigate('tasks')">Manage Tasks →</button>
          </div>
        </div>

        <!-- Extended Stays & Room Shifts -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
          ${extendedWithParent.length > 0 ? `
            <div class="dash-panel-card" style="border-left:4px solid var(--yellow);">
              <div class="dash-panel-head">
                <div class="dash-panel-title">
                  <span>🔄</span> Extended Stays (${extendedWithParent.length})
                </div>
                <span class="badge yellow">Last 30 Days</span>
              </div>
              <div style="max-height:260px;overflow-y:auto;">
                ${extendedWithParent.slice(0, 6).map(({ext, parent}) => `
                  <div class="dash-guest-item">
                    <div>
                      <strong style="color:var(--primary);cursor:pointer;" onclick="openBookingFromDashboard('${ext.booking_id}')">${ext.guest_name}</strong>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                        ${propLabel(ext.rooms) || ext.room_id} &bull; Extended till: <strong style="color:var(--green);">${ext.check_out || 'Open'}</strong>
                      </div>
                    </div>
                    <div style="font-weight:700;color:var(--green);font-size:12px;">₹${(ext.total_amount || 0).toLocaleString('en-IN')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>

      <!-- TAB 4: WHATSAPP QUICK ACTIONS -->
      <div class="dash-tab-pane ${window._activeDashTab === 'wa' ? 'active' : ''}" id="dash-tab-wa">
        <div class="dash-panel-card" style="border-top:4px solid #25D366;">
          <div class="dash-panel-head">
            <div class="dash-panel-title" style="color:#128C7E;">
              <span>📱</span> WhatsApp Communication Tasks (${totalWATasks})
            </div>
            <span class="badge green">One-Tap Action</span>
          </div>

          ${totalWATasks === 0 ? `
            <div class="dash-empty-state" style="padding:40px 20px;">
              <div style="font-size:32px;margin-bottom:8px;">🎉</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);">All WhatsApp communications up to date!</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:4px;">No pending reminders, key deliveries, or ID requests for today.</div>
            </div>
          ` : `
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;">
              Click any button below to prepare and send personalized WhatsApp updates directly to guests.
            </div>

            ${checkinReminders.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#00A699;text-transform:uppercase;margin-bottom:8px;">
                  📅 Check-in Reminders (${checkinReminders.length}) &bull; Guests arriving tomorrow
                </div>
                ${checkinReminders.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Check-in: ${b.check_in} ${b.check_in_time || ''}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#00A699;border-color:#00A699;font-size:11.5px;padding:6px 12px;" onclick="sendCheckinReminder('${b.booking_id}')">
                      📅 Send Reminder
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${arrivingSoonWA.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#E2725B;text-transform:uppercase;margin-bottom:8px;">
                  🔑 Arrival Details (${arrivingSoonWA.length}) &bull; Send WiFi & Key details
                </div>
                ${arrivingSoonWA.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Check-in: ${b.check_in_time || '14:00'}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#E2725B;border-color:#E2725B;font-size:11.5px;padding:6px 12px;" onclick="sendArrivalDetails('${b.booking_id}')">
                      🔑 Send Keys + WiFi
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${checkoutReminders.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#FF385C;text-transform:uppercase;margin-bottom:8px;">
                  📤 Checkout Alerts (${checkoutReminders.length}) &bull; Leaving today
                </div>
                ${checkoutReminders.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Checkout: ${b.check_out_time || '11:00 AM'}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#FF385C;border-color:#FF385C;font-size:11.5px;padding:6px 12px;" onclick="sendCheckoutReminder('${b.booking_id}')">
                      🔔 Checkout Alert
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${noIdBookings.length ? `
              <div style="margin-bottom:18px;">
                <div style="font-size:12.5px;font-weight:800;color:#D97706;text-transform:uppercase;margin-bottom:8px;">
                  🪪 ID Missing (${noIdBookings.length}) &bull; Currently staying without ID proof
                </div>
                ${noIdBookings.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Guests: ${b.guests || 1}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#D97706;border-color:#D97706;font-size:11.5px;padding:6px 12px;" onclick="requestGuestID('${b.booking_id}')">
                      🪪 Request ID
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${reviewRequests.length ? `
              <div style="margin-bottom:12px;">
                <div style="font-size:12.5px;font-weight:800;color:#7C3AED;text-transform:uppercase;margin-bottom:8px;">
                  ⭐ Review Requests (${reviewRequests.length}) &bull; Checked out recently
                </div>
                ${reviewRequests.map(b => `
                  <div class="dash-guest-item">
                    <div class="dash-guest-info">
                      <strong style="color:var(--text);">${b.guest_name}</strong> — <span class="dash-unit-chip">${propLabel(b.rooms) || b.room_id}</span>
                      <div class="dash-guest-meta" style="margin-top:2px;">
                        <span>📞 ${b.phone}</span> &bull; <span>Stayed: ${b.check_in} → ${b.check_out}</span>
                      </div>
                    </div>
                    <button class="dash-pill-btn primary" style="background:#7C3AED;border-color:#7C3AED;font-size:11.5px;padding:6px 12px;" onclick="requestReview('${b.booking_id}')">
                      ⭐ Request Review
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          `}
        </div>
      </div>

      <!-- NEXT 7 DAYS BOOKINGS (ALWAYS VISIBLE OVERVIEW) -->
      <div class="dash-panel-card" style="margin-top:20px;">
        <div class="dash-panel-head">
          <div class="dash-panel-title">
            <span>📅</span> Upcoming Arrivals (Next 7 Days &bull; ${upcoming7.length} Bookings)
          </div>
          <button class="dash-pill-btn" style="padding:4px 10px;font-size:11.5px;" onclick="navigate('bookings')">All Bookings →</button>
        </div>
        ${upcoming7.length === 0 ? `<div class="dash-empty-state">No upcoming bookings in the next 7 days</div>` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Check-in</th>
                  <th>Guest Name</th>
                  <th>Property</th>
                  <th>Contact</th>
                  <th style="text-align:right;">Amount</th>
                  <th style="text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${upcoming7.slice(0, 10).map(x => `
                  <tr>
                    <td style="font-size:12.5px;white-space:nowrap;">
                      <strong>${x.check_in}</strong>
                      <div style="font-size:11px;color:var(--muted);">${x.check_in_time || '2:00 PM'}</div>
                    </td>
                    <td>
                      <strong style="cursor:pointer;color:var(--primary);" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>
                      ${getRatingBadge(x.client_rating)}
                    </td>
                    <td style="font-size:12px;"><span class="dash-unit-chip">${bName(x)}</span></td>
                    <td style="font-size:12px;">
                      ${x.phone ? `<a href="tel:${x.phone}" style="color:var(--text-secondary);text-decoration:none;">📞 ${x.phone}</a>` : '-'}
                    </td>
                    <td style="text-align:right;font-weight:700;color:#059669;font-size:13px;">
                      ₹${(x.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style="text-align:center;">
                      <button class="dash-pill-btn" style="padding:3px 8px;font-size:11px;" onclick="openBookingFromDashboard('${x.booking_id}')">View</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- MONTHLY DARK FINANCIAL CARD -->
      <div class="dash-month-card">
        <div class="dash-month-head">
          <div class="dash-month-title">
            Month Financial Performance &bull; ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
          <button class="dash-pill-btn" style="background:rgba(255,255,255,0.1);color:#FFFFFF;border-color:rgba(255,255,255,0.2);font-size:11.5px;padding:5px 12px;" onclick="filterAndShowBookings('thisMonth')">
            Financial Details →
          </button>
        </div>
        <div class="dash-month-grid">
          <div class="dash-month-item">
            <div class="dash-month-lbl">Total Bookings</div>
            <div class="dash-month-val" style="color:#FFFFFF;">${monthBookings}</div>
          </div>
          <div class="dash-month-item">
            <div class="dash-month-lbl">Total Revenue</div>
            <div class="dash-month-val" style="color:#4ADE80;">₹${monthRevenue.toLocaleString('en-IN')}</div>
          </div>
          <div class="dash-month-item">
            <div class="dash-month-lbl">Amount Collected</div>
            <div class="dash-month-val" style="color:#38BDF8;">₹${monthCollected.toLocaleString('en-IN')}</div>
          </div>
          <div class="dash-month-item">
            <div class="dash-month-lbl">Average Occupancy</div>
            <div class="dash-month-val" style="color:#A78BFA;">${occupancyPct}%</div>
          </div>
          <div class="dash-month-item">
            <div class="dash-month-lbl">Pending Balance</div>
            <div class="dash-month-val" style="color:#F87171;">₹${pendingBalance.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>
    </div>
  `, 'dashboard');
}

// ============ CHECKIN MANAGER VIEW ============
async function renderCheckinManagerView() {
  renderShell(`<div class="loading">Loading check-in manager dashboard...</div>`, 'dashboard');

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
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="font-size:22px;margin:0;">👨‍💼 Check-in Manager Dashboard</h1>
          <div class="sub" style="margin-top:2px;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button class="btn-sm" onclick="renderCheckinManagerView()">🔄 Refresh</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${checkins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${checkins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
            <small>📞 ${x.phone || '-'} · 🕐 ${x.check_in_time || '2:00 PM'}</small>
            ${x.has_vehicle ? `<br><small>🚗 ${x.vehicle_name || ''} ${x.vehicle_number || ''}</small>` : ''}
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${checkouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${checkouts.map(x => `
          <div style="font-size:12px;margin-top:4px;">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
            <small>🕐 ${x.check_out_time || '11:00 AM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming.length}</div>
        <div class="stat-label">📅 Next 7 Days</div>
        ${upcoming.slice(0, 5).map(x => `
          <div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bName(x)} (${x.check_in})</div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None scheduled</div>'}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedNow.length}/${allFlats.length}</div>
        <div class="stat-label">🛏️ Occupied Flats</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Needs Cleaning</div>
        ${dirty.map(x => `<div style="font-size:11px;margin-top:2px;">${fName(x)}</div>`).join('') || '<div class="sub" style="margin:4px 0 0;">All clean ✅</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${activeNow.length}</div>
        <div class="stat-label">🟢 Currently Staying</div>
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
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️ No Properties</h1><div class="error">No properties assigned to ${emp.name}. Contact admin.</div><button onclick="logout()">Logout</button></div></div>`;
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
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="font-size:22px;margin:0;">🏠 My Assigned Properties</h1>
          <div class="sub" style="margin-top:2px;">👋 ${emp.name} &bull; ${myRoomIds.length} properties assigned &bull; ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button class="btn-sm" onclick="renderCheckinManagerViewNew()">🔄 Refresh</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${checkins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${checkins.map(x => `
          <div style="font-size:12px;margin-top:4px;padding:4px 0;border-bottom:1px solid var(--border);">
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
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
            <strong style="cursor:pointer;color:var(--blue);text-decoration:underline;" onclick="openBookingFromDashboard('${x.booking_id}')">${x.guest_name}</strong>${getRatingBadge(x.client_rating)} — ${bName(x)}<br>
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

    <div class="card" style="background:#F8FAFC;">
      <div class="section-title">🏠 My Assigned Properties (${allFlats.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${allFlats.map(f => `
          <span class="badge ${f.status === 'Booked' ? 'blue' : (f.cleaning_status === 'Dirty' ? 'yellow' : 'green')}">
            ${fName(f)} &bull; ${f.status} (${f.cleaning_status})
          </span>
        `).join('')}
      </div>
    </div>
  `, 'dashboard');
}

// ═══════════════════════════════════════════════════════════
// FILTER NAVIGATION ACTIONS
// ═══════════════════════════════════════════════════════════
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
    SESSION.bookingDateFilter = '';
    SESSION.bookingPayFilter = '';
    SESSION.bookingSearch = '';
    SESSION.bookingPeriod = '';
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

function filterAndShowFlats(type) {
  SESSION._filterFlatsStatus = type; // 'clean', 'dirty', 'occupied'
  navigate('flats');
}

function filterAndShowAttendance(type) {
  SESSION._filterAttendanceType = type; // 'present', 'absent'
  navigate('attendance');
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

// ═══════════════════════════════════════════════════════════
// PENDING ID MODAL & SHARING
// ═══════════════════════════════════════════════════════════
async function showPendingIdModal(days) {
  const daysBack = days !== undefined ? days : 0;
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = daysBack > 0 ? dateAdd(today, -daysBack) : today;

  const { data: bks } = await sb.from('guest_register').select('*, rooms(nickname, unit_no)');

  const filtered = (bks || []).filter(b => {
    if (b.is_cancelled) return false;
    if ((b.guest_name || '').toLowerCase().includes('(friend')) return false;
    if (b.check_in > today) return false;
    if (b.check_out < fromDate) return false;
    const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
    return !hasId;
  }).sort((a,b) => (b.check_in || '').localeCompare(a.check_in || ''));

  window._pendingIdCache = filtered;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const rangeOptions = [
    { label: 'Currently Staying Only', val: 0 },
    { label: 'Last 7 days', val: 7 },
    { label: 'Last 15 days', val: 15 },
    { label: 'Last 30 days', val: 30 },
    { label: 'Last 60 days', val: 60 },
    { label: 'Last 90 days', val: 90 }
  ];

  const rowsHtml = filtered.length === 0
    ? '<div style="padding:30px;text-align:center;color:#999;">✅ No pending IDs</div>'
    : '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
      '<thead style="background:#F9FAFB;position:sticky;top:0;">' +
      '<tr>' +
      '<th style="padding:8px;text-align:left;">Booking ID</th>' +
      '<th style="padding:8px;text-align:left;">Guest</th>' +
      '<th style="padding:8px;text-align:left;">Flat</th>' +
      '<th style="padding:8px;text-align:left;">Check-in</th>' +
      '<th style="padding:8px;text-align:left;">Check-out</th>' +
      '<th style="padding:8px;text-align:left;">Phone</th>' +
      '<th style="padding:8px;text-align:left;">Vehicle</th>' +
      '</tr></thead><tbody>' +
      filtered.map(b => {
        const veh = b.has_vehicle ? ((b.vehicle_name || '') + ' ' + (b.vehicle_number || '')).trim() : '';
        return '<tr style="border-top:1px solid var(--border);">' +
          '<td style="padding:8px;font-family:monospace;font-size:11px;">' + b.booking_id + '</td>' +
          '<td style="padding:8px;"><strong>' + (b.guest_name || '-') + '</strong></td>' +
          '<td style="padding:8px;">' + (b.rooms?.nickname || b.room_id || '-') + '</td>' +
          '<td style="padding:8px;font-size:11px;">' + (b.check_in || '-') + '</td>' +
          '<td style="padding:8px;font-size:11px;">' + (b.check_out || '-') + '</td>' +
          '<td style="padding:8px;font-size:11px;">' + (b.phone || '-') + '</td>' +
          '<td style="padding:8px;font-size:11px;">' + (veh || '-') + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

  const optionsHtml = rangeOptions.map(o =>
    '<option value="' + o.val + '"' + (o.val === daysBack ? ' selected' : '') + '>' + o.label + '</option>'
  ).join('');

  modal.innerHTML =
    '<div class="modal-box" style="max-width:900px;">' +
      '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>' +
      '<h2>🪪 ID Pending (' + filtered.length + ')</h2>' +
      '<div class="sub">Guests without ID proof · Excludes cancelled & (Friends)</div>' +
      '<div style="margin:16px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
        '<label style="font-size:12px;font-weight:600;">Date Range:</label>' +
        '<select onchange="this.closest(\'.modal-overlay\').remove();showPendingIdModal(parseInt(this.value))" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;">' +
          optionsHtml +
        '</select>' +
        '<button class="btn-sm" style="background:#25D366;color:#fff;" onclick="shareIdPendingWhatsApp(' + daysBack + ')">📱 Share on WhatsApp</button>' +
        '<button class="btn-sm outline" onclick="copyIdPendingText(' + daysBack + ')">📋 Copy Text</button>' +
      '</div>' +
      '<div style="max-height:60vh;overflow:auto;border:1px solid var(--border);border-radius:8px;">' + rowsHtml + '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

function buildIdPendingMessage(daysBack) {
  const list = window._pendingIdCache || [];
  const today = new Date().toISOString().slice(0, 10);
  const NL = String.fromCharCode(10);
  const rangeLabel = daysBack === 0 ? 'Currently Staying' : ('Last ' + daysBack + ' days');

  let msg = '*🪪 ID PENDING REPORT*' + NL;
  msg += '*' + rangeLabel + ' · ' + new Date(today).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) + '*' + NL;
  msg += '━━━━━━━━━━━━━━━━━' + NL + NL;

  if (list.length === 0) {
    msg += '✅ No pending IDs' + NL;
  } else {
    msg += '*Total Pending:* ' + list.length + NL + NL;
    list.forEach((b, i) => {
      msg += (i + 1) + '. *' + (b.guest_name || 'Unknown') + '*' + NL;
      msg += '   🏠 Flat: ' + (b.rooms?.nickname || b.room_id || '-') + NL;
      msg += '   🆔 Booking: ' + b.booking_id + NL;
      msg += '   📅 ' + (b.check_in || '?') + ' → ' + (b.check_out || '?') + NL;
      if (b.phone) msg += '   📞 ' + b.phone + NL;
      const veh = b.has_vehicle ? ((b.vehicle_name || '') + ' ' + (b.vehicle_number || '')).trim() : '';
      if (veh) msg += '   🚗 Vehicle: ' + veh + NL;
      msg += NL;
    });
  }

  if (typeof window.getOfficialReportFooterText === 'function') {
    msg += window.getOfficialReportFooterText();
  } else {
    msg += '━━━━━━━━━━━━━━━━━' + NL;
    msg += '_THE UNIQUE HAVEN HOMES PRIVATE LIMITED_' + NL;
    msg += 'uniquehavenhomesstay.com' + NL;
    msg += '*Developed by Praveen Singh*';
  }
  return msg;
}

function shareIdPendingWhatsApp(daysBack) {
  const msg = buildIdPendingMessage(daysBack);
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function copyIdPendingText(daysBack) {
  const msg = buildIdPendingMessage(daysBack);
  navigator.clipboard.writeText(msg).then(() => {
    if (window.fsn) fsn.success('Copied', 'ID pending list copied');
    else alert('Copied to clipboard');
  });
}

window.showPendingIdModal = showPendingIdModal;
window.shareIdPendingWhatsApp = shareIdPendingWhatsApp;
window.copyIdPendingText = copyIdPendingText;

// ═══════════════════════════════════════════════════════════
// ONLINE USERS MODAL
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 🔔 LAUNDRY REMINDERS - Async loader for dashboard
// Runs after main dashboard render, injects into Attention card
// ═══════════════════════════════════════════════════════════
async function loadLaundryReminders() {
  try {
    const { data: payments } = await sb.from('laundry_payments')
      .select('id, amount, payment_date, claim_date, claim_status, record_id');
    
    if (!payments || payments.length === 0) return;
    
    const today = new Date();
    const daysAgo = (dateStr) => {
      if (!dateStr) return 0;
      return Math.floor((today - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    };
    
    // Unclaimed > 7 days
    const oldUnclaimed = payments.filter(p => 
      (p.claim_status || 'not_claimed') === 'not_claimed' && 
      daysAgo(p.payment_date) > 7
    );
    
    // Claimed but not received > 15 days
    const oldClaimed = payments.filter(p => 
      p.claim_status === 'claimed' && 
      p.claim_date && 
      daysAgo(p.claim_date) > 15
    );
    
    if (oldUnclaimed.length === 0 && oldClaimed.length === 0) return;
    
    const unclaimedAmt = oldUnclaimed.reduce((s, p) => s + Number(p.amount || 0), 0);
    const claimedAmt = oldClaimed.reduce((s, p) => s + Number(p.amount || 0), 0);
    
    // Find the Attention card
    const targetCard = document.getElementById('dashAttentionCard') || document.querySelector('.dash-attention-card');
    if (!targetCard) return;
    
    const contentDiv = document.getElementById('dashAttentionContent') || targetCard.querySelector('div[style*="max-height"]');
    if (!contentDiv) return;
    
    // Build reminder HTML
    let html = '';
    
    if (oldUnclaimed.length > 0) {
      const oldest = Math.max(...oldUnclaimed.map(p => daysAgo(p.payment_date)));
      html += `
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #ddd;">
          <strong style="font-size:11.5px;color:#92400E;">💰 UNCLAIMED LAUNDRY (${oldUnclaimed.length})</strong>
          <div style="font-size:12px;margin-top:4px;padding:8px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;cursor:pointer;" onclick="navigateTo('laundry')">
            <strong style="color:#92400E;">₹${unclaimedAmt.toLocaleString('en-IN')}</strong> not claimed
            <div style="font-size:10.5px;color:#78350F;margin-top:2px;">Oldest: ${oldest} days ago · Click to view in Laundry</div>
          </div>
        </div>`;
    }
    
    if (oldClaimed.length > 0) {
      const oldest = Math.max(...oldClaimed.map(p => daysAgo(p.claim_date)));
      html += `
        <div style="margin-top:8px;padding-top:6px;">
          <strong style="font-size:11.5px;color:#1E40AF;">📤 PENDING RECEIVED (${oldClaimed.length})</strong>
          <div style="font-size:12px;margin-top:4px;padding:8px;background:#DBEAFE;border:1px solid #BFDBFE;border-radius:8px;cursor:pointer;" onclick="navigateTo('laundry')">
            <strong style="color:#1E40AF;">₹${claimedAmt.toLocaleString('en-IN')}</strong> waiting from company
            <div style="font-size:10.5px;color:#1E3A8A;margin-top:2px;">Oldest: ${oldest} days ago · Follow up needed</div>
          </div>
        </div>`;
    }
    
    contentDiv.insertAdjacentHTML('beforeend', html);
    
    const allTrackDiv = contentDiv.querySelector('.sub');
    if (allTrackDiv && allTrackDiv.textContent.includes('All check-ins and check-outs')) {
      allTrackDiv.style.display = 'none';
    }
    
    targetCard.style.borderLeftColor = 'var(--orange, #F97316)';
    targetCard.style.background = '#FFF7ED';
    
    const statNum = targetCard.querySelector('.stat-num');
    if (statNum) {
      const currentNum = parseInt(statNum.textContent) || 0;
      statNum.textContent = currentNum + oldUnclaimed.length + oldClaimed.length;
    }
    
  } catch (e) {
    console.warn('Laundry reminders load failed:', e);
  }
}

// Auto-run when dashboard renders
window._laundryReminderInterval = setInterval(() => {
  if (window.location.hash === '#dashboard' || window.location.hash === '' || window.location.hash === '#') {
    const attention = document.getElementById('dashAttentionCard') || document.querySelector('.dash-attention-card');
    if (attention && !document.body.dataset.reminderLoaded) {
      document.body.dataset.reminderLoaded = 'true';
      loadLaundryReminders().then(() => {
        setTimeout(() => { delete document.body.dataset.reminderLoaded; }, 60000);
      });
    }
  }
}, 2000);

console.log('✅ Modern Dashboard module loaded');
