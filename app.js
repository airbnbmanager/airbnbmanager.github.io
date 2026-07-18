/**
 * ===================================
 * Project: The Unique Haven Homes Pvt Ltd — Property Manager
 * Developer: Praveen Singh
 * ===================================
 */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const appEl = document.getElementById("app");
const BRAND = "The UNIQUE HAVEN HOME STAY";
const APP_VERSION = "v11";

let SESSION = {
  userId: null,
  role: null,
  empId: null,
  investorId: null,
  displayName: null,
  currentPage: 'dashboard',
  bookingFilter: 'All',
  bookingPropFilter: '',
  bookingDateFilter: '',
  bookingDateFrom: '',
  bookingDateTo: '',
  bookingSearch: ''
};

// ============ INIT ============
async function init() {
  try {
    await forceServiceWorkerUpdateCheck();
    showVersionNotice();

    const { data: { session } } = await sb.auth.getSession();
    if (!session) { renderLogin(); return; }

    // IMPORTANT: autoCheckout removed from auto-load
    // to avoid stale cached clients mutating DB.
    await loadProfile(session.user.id);
  } catch (err) {
    showError("Setup incomplete. config.js check karo.", err);
  }
}

async function forceServiceWorkerUpdateCheck() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (e) {
    console.warn('SW update check failed', e);
  }
}

function showVersionNotice() {
  try {
    const oldVersion = localStorage.getItem('uh_app_version');
    if (oldVersion && oldVersion !== APP_VERSION) {
      window._showUpdateNotice = true;
    }
    localStorage.setItem('uh_app_version', APP_VERSION);
  } catch (e) {
    console.warn('Version storage failed', e);
  }
}

function getUpdateNoticeHTML() {
  if (!window._showUpdateNotice) return '';
  return `
    <div class="card" style="border-left:4px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div>
          <strong>🔄 New update loaded</strong><br>
          <small style="color:var(--muted);">Please refresh once if old screen is showing.</small>
        </div>
        <button class="btn-sm" onclick="window._showUpdateNotice=false; location.reload();">Refresh</button>
      </div>
    </div>
  `;
}

function syncInfoHTML() {
  const last = window._lastManualSync
    ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;">Last sync: ${window._lastManualSync}</div>`
    : `<div style="font-size:11px;color:var(--muted);margin-top:4px;">Sync manually after booking changes</div>`;

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <strong>🔄 Manual Status Sync</strong>
          ${last}
        </div>
        <button class="btn-sm" onclick="manualSyncRoomStatus()">Run Sync</button>
      </div>
    </div>
  `;
}

async function manualSyncRoomStatus() {
  const ok = confirm(
    'Room status sync run karna hai?\n\n' +
    'Ye checkout/checkin ke hisaab se room status & cleaning sync karega.'
  );
  if (!ok) return;

  try {
    await autoCheckout();
    window._lastManualSync = new Date().toLocaleString('en-IN');
    alert('✅ Room status synced successfully');
    if (SESSION.currentPage === 'dashboard') renderDashboard();
    else if (SESSION.currentPage === 'flats') renderFlatsStatus();
  } catch (e) {
    alert('❌ Sync failed: ' + (e.message || e));
  }
}

async function loadProfile(userId) {
  const { data: p, error } = await sb.from("profiles")
    .select("role, emp_id, investor_id, display_name")
    .eq("user_id", userId).single();

  if (error || !p) {
    showError("Profile nahi mila. Owner se contact karo.");
    return;
  }

  SESSION.userId = userId;
  SESSION.role = p.role;
  SESSION.empId = p.emp_id;
  SESSION.investorId = p.investor_id;
  SESSION.displayName = p.display_name || p.role;

  if (p.role === 'employee') renderEmployeeView();
  else if (p.role === 'checkin_manager') renderCheckinManagerView();
  else if (p.role === 'investor' || (p.role === 'viewer' && p.investor_id)) renderInvestorView();
  else if (p.role === 'ca') renderFYSummary();
  else renderDashboard();
}

function showError(msg, err = null) {
  appEl.innerHTML = `<div class="wrap"><div class="card">
    <h1>⚠️ Error</h1>
    <div class="error">${msg}${err ? '<br>' + err.message : ''}</div>
  </div></div>`;
}

async function logout() {
  await sb.auth.signOut();
  SESSION = {
    userId: null,
    role: null,
    empId: null,
    investorId: null,
    displayName: null,
    currentPage: 'dashboard',
    bookingFilter: 'All',
    bookingPropFilter: '',
    bookingDateFilter: '',
    bookingDateFrom: '',
    bookingDateTo: '',
    bookingSearch: ''
  };
  renderLogin();
}

// ============ HELPERS ============
async function getPaidMap(ids) {
  if (!ids.length) return {};
  const { data } = await sb.from('payment_history').select('booking_id, amount').in('booking_id', ids);
  const m = {};
  (data || []).forEach(p => {
    m[p.booking_id] = (m[p.booking_id] || 0) + (p.amount || 0);
  });
  return m;
}

function dateAdd(s, n) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m-1, d+n)).toISOString().slice(0,10);
}

function compressImage(file, maxDim=800, quality=0.5) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; };
    img.onload = () => {
      let {width,height} = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      c.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function parseLocalDateTime(dateStr, hour = 0, minute = 0) {
  if (!dateStr) return null;
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function getBookingWindow(booking) {
  if (!booking?.check_in || !booking?.check_out) return null;
  const inTime = booking.check_in_time || '14:00';
  const outTime = booking.check_out_time || '11:00';
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);

  return {
    start: parseLocalDateTime(booking.check_in, inH || 14, inM || 0),
    end: parseLocalDateTime(booking.check_out, outH || 11, outM || 0),
  };
}

function isBookingActiveNow(booking, now = new Date()) {
  const w = getBookingWindow(booking);
  if (!w) return false;
  return now >= w.start && now < w.end;
}

function hasBookingEnded(booking, now = new Date()) {
  const w = getBookingWindow(booking);
  if (!w) return false;
  return now >= w.end;
}

function findOverlappingBookings(bookings) {
  const grouped = {};
  (bookings || []).forEach(b => {
    if (!b.room_id || !b.check_in || !b.check_out) return;
    if (!grouped[b.room_id]) grouped[b.room_id] = [];
    grouped[b.room_id].push(b);
  });

  const overlaps = [];
  Object.keys(grouped).forEach(roomId => {
    const list = grouped[roomId].sort((a,b) => (a.check_in || '').localeCompare(b.check_in || ''));
    for (let i=0; i<list.length; i++) {
      for (let j=i+1; j<list.length; j++) {
        const a = list[i], b2 = list[j];
        const aStart = parseLocalDateTime(a.check_in, 14, 0);
        const aEnd = parseLocalDateTime(a.check_out, 11, 0);
        const bStart = parseLocalDateTime(b2.check_in, 14, 0);
        const bEnd = parseLocalDateTime(b2.check_out, 11, 0);
        if (aStart < bEnd && aEnd > bStart) overlaps.push({roomId, a, b:b2});
      }
    }
  });
  return overlaps;
}

function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(Math.round((new Date(checkOut) - new Date(checkIn)) / 864e5), 0);
}

// ============ AUTO ROOM STATUS SYNC ============
async function autoCheckout() {
  const now = new Date();

  const [{ data: allRooms }, { data: flats }, { data: bookings }] = await Promise.all([
    sb.from('rooms').select('room_id'),
    sb.from('flats_status').select('room_id, status, cleaning_status, last_cleaned'),
    sb.from('guest_register').select('booking_id, room_id, guest_name, check_in, check_out, check_in_time, check_out_time')
  ]);

  const flatMap = {};
  (flats || []).forEach(f => { flatMap[f.room_id] = f; });

  const roomIds = (allRooms || []).map(r => r.room_id);

  for (const roomId of roomIds) {
    const currentFlat = flatMap[roomId] || {};
    const roomBookings = (bookings || []).filter(b => b.room_id === roomId);

    if (currentFlat.status === 'Blocked-Maintenance') continue;

    const activeNow = roomBookings.some(b => isBookingActiveNow(b, now));

    const endedBookings = roomBookings
      .filter(b => hasBookingEnded(b, now))
      .sort((a, b) => (b.check_out || '').localeCompare(a.check_out || ''));

    const latestEnded = endedBookings[0] || null;

    let newStatus = currentFlat.status || 'Free';
    let newCleaning = currentFlat.cleaning_status || 'Clean';

    if (activeNow) {
      newStatus = 'Booked';
      newCleaning = 'Clean';
    } else {
      newStatus = 'Free';
      if (latestEnded) {
        const lastCleaned = currentFlat.last_cleaned || null;
        const checkoutDate = latestEnded.check_out || null;
        const cleanedAfterCheckout = lastCleaned && checkoutDate && lastCleaned >= checkoutDate;
        if (!cleanedAfterCheckout && newCleaning !== 'In Progress') {
          newCleaning = 'Dirty';
        }
      }
    }

    const needsInsert = !flatMap[roomId];
    const changed = currentFlat.status !== newStatus || currentFlat.cleaning_status !== newCleaning;

    if (needsInsert) {
      await sb.from('flats_status').insert({
        room_id: roomId,
        status: newStatus,
        cleaning_status: newCleaning,
        last_cleaned: null
      });
    } else if (changed) {
      await sb.from('flats_status').update({
        status: newStatus,
        cleaning_status: newCleaning
      }).eq('room_id', roomId);
    }
  }
}

// ============ LOGIN ============
function renderLogin() {
  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="Logo" style="width:80px;height:80px;object-fit:contain;margin-bottom:8px;border-radius:14px;" />
        <h1>${BRAND}</h1>
        <div class="sub">Login karo apne credentials se</div>
        <input id="email" type="email" placeholder="Email" autocomplete="email" style="margin-top:12px;" />
        <input id="password" type="password" placeholder="Password" autocomplete="current-password" style="margin-top:8px;" />
        <button id="loginBtn" style="width:100%;margin-top:12px;padding:12px;">Login</button>
        <div id="err"></div>
        <div style="margin-top:20px;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:#999;">
          Developed by <strong style="color:#666;">Praveen Singh</strong>
        </div>
      </div>
    </div>`;

  document.getElementById("loginBtn").onclick = async () => {
    const btn = document.getElementById("loginBtn");
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById("err").innerHTML = `<div class="error">${error.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Login';
      return;
    }
    await loadProfile(data.user.id);
  };
}

// ============ SHELL ============
function renderShell(content, activePage = 'dashboard') {
  if (SESSION.investorId) { 
    appEl.innerHTML = content; 
    return; 
  }

  const show = ['owner','viewer','manager','checkin_manager'].includes(SESSION.role);
  if (!show) { 
    appEl.innerHTML = content; 
    return; 
  }

  const isOwner = SESSION.role === 'owner';
  const isCheckin = SESSION.role === 'checkin_manager';

  let nav;

  if (isOwner) {
    nav = [
      ['dashboard','🏠 Home'],
      ['reports','📆 Calendar'],
      ['bookings','📅 Bookings'],
      ['flats','🛏️ Flats'],
      ['rooms','🏠 Properties'],
      ['employees','👥 Employees'],
      ['tasks','🧰 Tasks'],
      ['attendance','📋 Attendance'],
      ['att-summary','📅 Attendance'],
      ['salary','💰 Salary'],
      ['advance','💵 Advance'],
      ['store','📦 Store'],
      ['expenses','💹 P&L'],
      ['property-report','🏘️ Property Report'],
      ['investors','🧑‍💼 Investors'],
      ['maintenance','🔧 Maintenance'],
      ['sop','📘 SOP'],
    ];
  } else if (isCheckin) {
    nav = [
      ['dashboard','🏠 Home'],
      ['reports','📆 Calendar'],
      ['bookings','📅 Bookings'],
      ['flats','🛏️ Flats'],
      ['sop','📘 SOP'],
    ];
  } else {
    nav = [
      ['dashboard','🏠 Home'],
      ['reports','📆 Calendar'],
      ['bookings','📅 Bookings'],
      ['flats','🛏️ Flats'],
      ['employees','👥 Employees'],
      ['att-summary','📅 Attendance'],
      ['salary','💰 Salary'],
      ['advance','💵 Advance'],
      ['expenses','💹 P&L'],
      ['property-report','🏘️ Property Report'],
      ['investors','🧑‍💼 Investors'],
      ['store','📦 Store'],
      ['maintenance','🔧 Maintenance'],
      ['sop','📘 SOP'],
    ];
  }

  appEl.innerHTML = `
    <div class="app-container">
      <aside class="sidebar">
        <h2>
          <img src="assets/logo.png" alt="" style="width:24px;height:24px;object-fit:contain;border-radius:6px;" />
          ${BRAND}
        </h2>
        <nav>
          ${nav.map(([k,l]) => `<a href="#" data-page="${k}" class="${activePage===k?'active':''}">${l}</a>`).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="logout-link" id="logoutBtn">🚪 Logout</div>
          <div class="sidebar-credit">Build ${APP_VERSION}<br>by Praveen Singh</div>
        </div>
      </aside>
      <main class="main-content" id="mainContent">${content}</main>
    </div>`;

  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.onclick = e => { 
      e.preventDefault(); 
      navigate(a.dataset.page); 
    };
  });

  document.getElementById('logoutBtn').onclick = logout;
}

function navigate(page) {
  SESSION.currentPage = page;
  const map = {
    dashboard: renderDashboard,
    reports: renderReports,
    rooms: renderManageRooms,
    flats: renderFlatsStatus,
    bookings: renderManageBookings,
    employees: renderManageEmployees,
    tasks: renderEmployeeTasks,
    attendance: renderAttendance,
    'att-summary': renderAttendanceSummary,
    salary: renderSalaryTracker,
    advance: renderAdvanceTracker,
    store: renderStore,
    expenses: renderExpenses,
    'property-report': renderPropertyReport,
    investors: renderManageInvestors,
    maintenance: renderMaintenanceLog,
    sop: renderSOPPage,
  };
  (map[page] || renderDashboard)();
}

// ============ DASHBOARD ============
async function renderDashboard() {
  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const today = new Date().toISOString().slice(0,10);
  const day3 = dateAdd(today, 3);
  const day7 = dateAdd(today, 7);

  const [g, f] = await Promise.all([
    sb.from("guest_register").select("*, rooms(unit_no, nickname)"),
    sb.from("flats_status").select("room_id, status, cleaning_status, rooms(unit_no, nickname)")
  ]);

  const allBookings = g.data || [];
  const allFlats = f.data || [];

  const rawCheckins = allBookings.filter(x => x.check_in === today);
  const rawCheckouts = allBookings.filter(x => x.check_out === today);

  const shiftGuests = new Set();
  rawCheckins.forEach(ci => {
    if (ci.parent_booking_id || ci.stay_group_id) {
      const matching = rawCheckouts.find(co =>
        co.guest_name === ci.guest_name ||
        co.booking_id === ci.parent_booking_id ||
        co.stay_group_id === ci.stay_group_id
      );
      if (matching) shiftGuests.add(ci.guest_name);
    }
  });

  const realCheckins = rawCheckins.filter(x => !shiftGuests.has(x.guest_name));
  const realCheckouts = rawCheckouts.filter(x => !shiftGuests.has(x.guest_name));
  const shiftList = rawCheckins.filter(x => shiftGuests.has(x.guest_name));

  const bookedNow = allFlats.filter(x => x.status === 'Booked');
  const freeClean = allFlats.filter(x => x.status === 'Free' && x.cleaning_status === 'Clean');
  const dirty = allFlats.filter(x => x.cleaning_status === 'Dirty' && x.status !== 'Blocked-Maintenance');
  const totalProps = allFlats.length;

  const upcoming3 = allBookings.filter(b => b.check_in > today && b.check_in <= day3);
  const upcoming7 = allBookings.filter(b => b.check_in > today && b.check_in <= day7);

  const bookingName = b => `${b.rooms?.unit_no||b.room_id}${b.rooms?.nickname?' ('+b.rooms.nickname+')':''}`;
  const flatName = fl => `${fl.rooms?.unit_no||fl.room_id}${fl.rooms?.nickname?' ('+fl.rooms.nickname+')':''}`;

  renderShell(`
    ${getUpdateNoticeHTML()}
    ${SESSION.role === 'owner' ? syncInfoHTML() : ''}

    <div class="card">
      <h1>📊 Dashboard</h1>
      <div class="sub">${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      <div style="font-size:11px;color:var(--muted);">Build: ${APP_VERSION}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${realCheckins.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${realCheckins.map(x=>`<div style="font-size:12px;margin-top:4px;">${x.guest_name} — ${bookingName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${realCheckouts.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${realCheckouts.map(x=>`<div style="font-size:12px;margin-top:4px;">${x.guest_name} — ${bookingName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedNow.length}/${totalProps}</div>
        <div class="stat-label">🛏️ Booked Now</div>
        ${bookedNow.map(x=>`<div style="font-size:11px;margin-top:3px;">${flatName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${freeClean.length}</div>
        <div class="stat-label">✅ Free & Ready</div>
        ${freeClean.map(x=>`<div style="font-size:11px;margin-top:3px;">${flatName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        ${dirty.map(x=>`<div style="font-size:11px;margin-top:3px;">${flatName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">Sab clean ✅</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid #FDF6B2;">
        <div class="stat-num">${shiftList.length}</div>
        <div class="stat-label">🔁 Room Shifts</div>
        ${shiftList.map(x=>`<div style="font-size:11px;margin-top:3px;">${x.guest_name} → ${bookingName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming3.length}</div>
        <div class="stat-label">📅 Next 3 Days</div>
        ${upcoming3.slice(0,4).map(x=>`<div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bookingName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--yellow);">
        <div class="stat-num">${upcoming7.length}</div>
        <div class="stat-label">📆 Next 7 Days</div>
        ${upcoming7.slice(0,4).map(x=>`<div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bookingName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${allBookings.filter(b=>b.checkout_confirmed===false).length}</div>
        <div class="stat-label">🔄 Open Stays</div>
        ${allBookings.filter(b=>b.checkout_confirmed===false).slice(0,4).map(x=>`<div style="font-size:11px;margin-top:3px;">${x.guest_name} — ${bookingName(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="card">
      <button onclick="renderFYSummary()">📊 Financial Summary (CA/ITR)</button>
    </div>
  `, 'dashboard');
}

// ============ REPORTS ============
async function renderReports() {
  renderShell(`<div class="loading">Loading...</div>`, 'reports');

  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, guest_name, booking_mode, total_amount')
  ]);

  const yr = window._calY ?? new Date().getFullYear();
  const mo = window._calM ?? new Date().getMonth();
  const mName = new Date(yr, mo, 1).toLocaleString('default',{month:'long'});
  const dim = new Date(yr, mo+1, 0).getDate();
  const fd = new Date(yr, mo, 1).getDay();
  const mp = `${yr}-${String(mo+1).padStart(2,'0')}`;

  const bMap = {};
  (bookings.data||[]).forEach(b => {
    if (!b.check_in || !b.check_out || !b.room_id) return;
    let c = b.check_in;
    while (c < b.check_out) {
      bMap[`${b.room_id}_${c}`] = { guest:b.guest_name, mode:b.booking_mode, bookingId:b.booking_id };
      c = dateAdd(c, 1);
    }
  });

  const mb = (bookings.data||[]).filter(b=>b.check_in?.startsWith(mp));
  const pm = await getPaidMap(mb.map(b=>b.booking_id));
  const rev = mb.reduce((s,b)=>s+(pm[b.booking_id]||0),0);
  const on = mb.filter(b=>b.booking_mode==='Online-Airbnb').length;
  const off = mb.length - on;
  const trn = (rooms.data?.length||0)*dim;
  const bn = Object.keys(bMap).filter(k=>k.includes(`_${mp}`)).length;
  const occ = trn>0?Math.round(bn/trn*100):0;

  let html = `
    <div class="card">
      <h1>📆 Calendar — ${mName} ${yr}</h1>
      <div class="sub">Live occupancy calendar</div>
    </div>

    <div class="card">
      <div class="metric-row"><span class="metric-label">Bookings</span><span class="metric-value">${mb.length}</span></div>
      <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Online / Offline</span><span class="metric-value">${on} / ${off}</span></div>
      <div class="metric-row"><span class="metric-label">Occupancy</span><span class="metric-value">${occ}%</span></div>
    </div>

    <div class="card" style="text-align:center;background:var(--dark);color:#fff;">
      <h2 style="color:#fff;">📆 ${mName} ${yr}</h2>
      <div class="btn-row" style="justify-content:center;">
        <button class="secondary btn-sm" onclick="chMo(-1)">◀ Prev</button>
        <button class="secondary btn-sm" onclick="chMo(1)">Next ▶</button>
      </div>
    </div>
  `;

  const days = ['S','M','T','W','T','F','S'];
  const todayStr = new Date().toISOString().slice(0,10);

  (rooms.data||[]).forEach(r => {
    html += `
      <div class="card" style="padding:10px 12px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;">
          ${r.unit_no} <span style="font-weight:400;color:var(--muted);font-size:12px;">${r.nickname||''}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">
    `;
    days.forEach(d => {
      html += `<div style="font-size:10px;font-weight:600;color:var(--muted);text-align:center;">${d}</div>`;
    });

    for (let i=0;i<fd;i++) html += `<div style="height:36px;"></div>`;

    for (let d=1; d<=dim; d++) {
      const ds = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const k = `${r.room_id}_${ds}`;
      const bk = bMap[k];
      const isT = ds===todayStr;
      let bg = '#E8F5E9';
      let gn = '';
      if (bk) { bg = bk.mode==='Online-Airbnb'?'#E1EFFE':'#FDF6B2'; gn = bk.guest?.split(' ')[0]||'B'; }
      const cls = `cal-cell${bk?' booked':''}${isT?' today':''}`;
      const click = bk ? `onclick="showBookingPopup('${r.room_id}','${ds}')"` : '';
      html += `<div class="${cls}" style="background:${bg};" ${click}>
        <div${isT?' style="color:var(--primary);"':''}>${d}${isT?' ●':''}</div>
        ${bk?`<div class="cal-guest">${gn}</div>`:''}
      </div>`;
    }

    html += `</div></div>`;
  });

  html += `
    <div class="card" style="text-align:center;padding:10px;">
      <span style="background:#E8F5E9;padding:3px 10px;border-radius:10px;font-size:12px;">Free</span>
      <span style="background:#E1EFFE;padding:3px 10px;border-radius:10px;font-size:12px;margin-left:6px;">Online</span>
      <span style="background:#FDF6B2;padding:3px 10px;border-radius:10px;font-size:12px;margin-left:6px;">Offline</span>
    </div>
  `;

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

async function showBookingPopup(roomId, dateStr) {
  const {data:bks} = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name)')
    .eq('room_id', roomId)
    .lte('check_in', dateStr)
    .gt('check_out', dateStr);

  const b = (bks||[])[0];
  if (!b) return;

  const {data:pays} = await sb.from('payment_history').select('amount').eq('booking_id', b.booking_id);
  const paid = (pays||[]).reduce((s,p)=>s+(p.amount||0),0);
  const bal = (b.total_amount||0) - paid;
  const nights = b.check_in&&b.check_out ? calcNights(b.check_in, b.check_out) : '-';
  const idPaths = (b.id_proof_photo_paths||b.id_proof_photo_path||'').split(',').filter(Boolean);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📅 Booking Details</h2>
      <div class="metric-row"><span class="metric-label">Guest</span><span class="metric-value" style="font-size:15px;">${b.guest_name||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Phone</span><span>${b.phone||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Property</span><span>${b.rooms?.nickname||''} · ${b.rooms?.unit_no||''}</span></div>
      <div class="metric-row"><span class="metric-label">Mode</span><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode||'Offline'}</span></div>
      <div class="metric-row"><span class="metric-label">Check-in</span><span>${b.check_in||'-'} ${b.check_in_time||''}</span></div>
      <div class="metric-row"><span class="metric-label">Check-out</span><span>${b.check_out||'-'} ${b.check_out_time||''}</span></div>
      <div class="metric-row"><span class="metric-label">Nights</span><span class="metric-value">${nights}</span></div>
      <div class="metric-row"><span class="metric-label">Rate/Day</span><span>${b.per_day_rate?'₹'+b.per_day_rate:'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount||0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${paid.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal>0?' warn':''}">₹${bal.toLocaleString('en-IN')}</span></div>
      ${b.has_vehicle ? `<div class="metric-row"><span class="metric-label">Vehicle</span><span>${b.vehicle_name||'-'} · ${b.vehicle_number||'-'}</span></div>` : ''}
      ${idPaths.length ? `<div style="margin-top:10px;"><div class="section-title">ID Photos</div><div class="btn-row">${idPaths.map((p,i)=>`<button class="btn-sm outline" onclick="dlIdPhoto('${p}')">📥 Guest ${i+1}</button>`).join('')}</div></div>` : ''}
      ${b.notes ? `<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px;"><strong>Notes:</strong> ${b.notes}</div>` : ''}
      <div class="btn-row" style="margin-top:14px;">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove(); editBooking('${b.booking_id}');">✏️ Edit</button>
        <button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove(); addPaymentWithDate('${b.booking_id}');">💰 Pay</button>
        <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove();">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ============ FINANCIAL SUMMARY ============
async function renderFYSummary(range='FY') {
  const isCA = SESSION.role === 'ca';
  if (!isCA) renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const now = new Date(), today = now.toISOString().slice(0,10);
  let s,e,label;
  if(range==='Today'){s=today;e=today;label='Today';}
  else if(range==='Week'){let d=new Date(now);d.setDate(now.getDate()-7);s=d.toISOString().slice(0,10);e=today;label='Last 7 Days';}
  else if(range==='Month'){s=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';e=today;label='This Month';}
  else if(range==='Quarter'){let q=Math.floor(now.getMonth()/3)*3;s=now.getFullYear()+'-'+String(q+1).padStart(2,'0')+'-01';e=today;label='This Quarter';}
  else if(range==='YTD'){s=now.getFullYear()+'-04-01';e=today;label='YTD';}
  else { let fy=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1; s=fy+'-04-01'; e=(fy+1)+'-03-31'; label=`FY ${fy}-${fy+1}`; }

  const [gs,ex,py] = await Promise.all([
    sb.from('guest_register').select('booking_id,check_in,total_amount,room_id,guest_name'),
    sb.from('expenses').select('amount,month'),
    sb.from('payment_history').select('booking_id,amount'),
  ]);

  const fg = (gs.data||[]).filter(g=>g.check_in>=s&&g.check_in<=e);
  const ids = fg.map(g=>g.booking_id);
  const pm = {};
  (py.data||[]).forEach(p=>{ if(ids.includes(p.booking_id)) pm[p.booking_id]=(pm[p.booking_id]||0)+(p.amount||0); });
  const inc = fg.reduce((a,g)=>a+(pm[g.booking_id]||0),0);
  const exp = (ex.data||[]).reduce((a,x)=>a+(x.amount||0),0);
  const net = inc - exp;

  const btns = ['Today','Week','Month','Quarter','YTD','FY'].map(r=>
    `<button class="${r===range?'':'secondary'} btn-sm" onclick="renderFYSummary('${r}')">${r}</button>`
  ).join('');

  const tbl = `<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Received</th></tr></thead>
    <tbody>${fg.map(g=>`<tr><td>${g.booking_id}</td><td>${g.guest_name}</td><td>${g.room_id}</td><td>${g.check_in}</td><td>₹${(pm[g.booking_id]||0).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody>
  </table></div>`;

  window._fyData = {label,startDate:s,endDate:e,totalIncome:inc,totalExpenses:exp,netProfit:net,bookings:fg,paidMap:pm};

  if (isCA) {
    appEl.innerHTML = `
      <div class="ca-wrap">
        <div class="ca-header">
          <img src="assets/logo.png" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-bottom:6px;" />
          <h1>${BRAND}</h1>
          <div class="sub">👋 ${SESSION.displayName||'CA'} — Accountant</div>
          <button class="ca-logout" onclick="logout()">🚪 Logout</button>
        </div>

        <div class="card">
          <div class="section-title">📊 Financial Summary</div>
          <div class="sub">${label} — ${s} to ${e}</div>
          <div class="btn-row">${btns}</div>
          <button class="outline btn-sm" onclick="downloadFYData()">⬇️ Download CSV</button>
        </div>

        <div class="card">
          <div class="metric-row"><span class="metric-label">Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
          <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${exp.toLocaleString('en-IN')}</span></div>
          <div class="metric-row"><span class="metric-label">Net Profit</span><span class="metric-value" style="color:${net>=0?'var(--green)':'var(--red)'};">₹${net.toLocaleString('en-IN')}</span></div>
        </div>

        <div class="card">
          <div class="section-title">Bookings (${fg.length})</div>
          ${tbl}
        </div>

        <div class="card" style="text-align:center;">
          <button class="ca-logout" onclick="logout()">🚪 Logout</button>
        </div>
      </div>
    `;
  } else {
    renderShell(`
      <div class="card">
        <h1>📊 Financial Summary</h1>
        <div class="sub">${label} — ${s} to ${e}</div>
        <div class="btn-row">${btns}</div>
        <button class="secondary btn-sm" onclick="renderDashboard()">← Back</button>
        <button class="outline btn-sm" onclick="downloadFYData()">⬇️ CSV</button>
      </div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${exp.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Net Profit</span><span class="metric-value" style="color:${net>=0?'var(--green)':'var(--red)'};">₹${net.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="card"><div class="section-title">Bookings (${fg.length})</div>${tbl}</div>
    `, 'dashboard');
  }
}

function downloadFYData() {
  const d = window._fyData; if (!d) return;
  let csv = `Period,${d.label}\nFrom,${d.startDate}\nTo,${d.endDate}\nIncome,${d.totalIncome}\nExpenses,${d.totalExpenses}\nProfit,${d.netProfit}\n\nBooking ID,Guest,Room,Check-in,Received\n`;
  d.bookings.forEach(g => {
    csv += `${g.booking_id},${g.guest_name},${g.room_id},${g.check_in},${d.paidMap[g.booking_id]||0}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `Financial_${d.label}.csv`;
  a.click();
}

// ============ PROPERTIES ============
async function renderManageRooms() {
  renderShell(`<div class="loading">Loading...</div>`, 'rooms');
  const {data:rooms,error} = await sb.from("rooms").select("*").order("room_id");
  if (error) { renderShell(`<div class="card"><div class="error">${error.message}</div></div>`,'rooms'); return; }
  const isO = SESSION.role==='owner';

  renderShell(`
    <div class="card">
      <h1>🏠 Properties</h1>
      <div class="sub">${(rooms||[]).length} properties</div>
      ${isO?`<button onclick="renderAddRoom()">➕ Add Property</button>`:''}
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr>
          <th>ID</th><th>Property</th><th>Nickname</th><th>Unit</th>
          <th>Manager</th><th>Map</th><th>Status</th>${isO?'<th>Actions</th>':''}
        </tr></thead>
        <tbody>${(rooms||[]).map(r=>`<tr>
          <td><strong>${r.room_id}</strong></td>
          <td style="max-width:220px;font-size:12px;">${r.property_name||'-'}</td>
          <td>${r.nickname||'-'}</td>
          <td>${r.unit_no||'-'}</td>
          <td>${r.checkin_manager||'-'}${r.caretaker_phone?`<br><small>${r.caretaker_phone}</small>`:''}</td>
          <td>${r.map_link?`<a href="${r.map_link}" target="_blank">📍 Open</a>`:'-'}</td>
          <td><span class="badge ${r.bookable?'green':'red'}">${r.mode||'On'}</span></td>
          ${isO?`<td class="table-actions">
            <button class="btn-sm" onclick="editRoom('${r.room_id}')">✏️</button>
            <button class="btn-sm danger" onclick="deleteRoom('${r.room_id}','${r.unit_no}')">🗑️</button>
          </td>`:''}
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  `, 'rooms');
}

function roomFormFields(r={}) {
  return `
    <div class="form-grid">
      <div class="form-group"><label>Room ID</label><input id="roomId" value="${r.room_id||''}" ${r.room_id?'readonly':''} placeholder="e.g. GOM-101" /></div>
      <div class="form-group"><label>Property Name</label><input id="propertyName" value="${r.property_name||''}" placeholder="Full listing name" /></div>
    </div>

    <div class="form-grid">
      <div class="form-group"><label>Unit No</label><input id="unitNo" value="${r.unit_no||''}" placeholder="e.g. FLAT101" /></div>
      <div class="form-group"><label>Nickname</label><input id="nickname" value="${r.nickname||''}" placeholder="Short name" /></div>
    </div>

    <div class="form-grid">
      <div class="form-group"><label>Unit Type</label>
        <select id="unitType">
          <option value="Flat" ${r.unit_type==='Flat'?'selected':''}>Flat</option>
          <option value="Villa" ${r.unit_type==='Villa'?'selected':''}>Villa</option>
        </select>
      </div>
      <div class="form-group"><label>Floor</label><input id="floor" value="${r.floor||''}" placeholder="1st, 2nd, ALL" /></div>
    </div>

    <div class="form-grid">
      <div class="form-group"><label>Max Guests</label><input id="maxGuests" type="number" value="${r.max_guests||''}" /></div>
      <div class="form-group"><label>Check-in Manager</label><input id="checkinMgr" value="${r.checkin_manager||''}" placeholder="e.g. Mr. Esha" /></div>
    </div>

    <div class="form-grid">
      <div class="form-group"><label>Caretaker Phone</label><input id="caretakerPhone" value="${r.caretaker_phone||''}" placeholder="e.g. 9876543210" /></div>
      <div class="form-group"><label>Map Link</label><input id="mapLink" value="${r.map_link||''}" placeholder="Google Maps link" /></div>
    </div>

    <div class="form-group"><label>Address</label><input id="address" value="${r.address||''}" /></div>

    <div class="form-grid">
      <div class="form-group"><label>Mode</label>
        <select id="mode">
          <option value="On" ${r.mode!=='Off'?'selected':''}>On</option>
          <option value="Off" ${r.mode==='Off'?'selected':''}>Off</option>
        </select>
      </div>
      <div class="form-group" style="justify-content:center;">
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <input type="checkbox" id="bookable" ${r.bookable!==false?'checked':''} />
          Bookable
        </label>
      </div>
    </div>

    <div class="form-group"><label>Notes</label><textarea id="notes">${r.notes||''}</textarea></div>
  `;
}

function collectRoomForm() {
  return {
    room_id:document.getElementById('roomId').value.trim(),
    property_name:document.getElementById('propertyName').value.trim()||null,
    address:document.getElementById('address').value.trim()||null,
    unit_type:document.getElementById('unitType').value,
    unit_no:document.getElementById('unitNo').value.trim(),
    floor:document.getElementById('floor').value.trim()||null,
    nickname:document.getElementById('nickname').value.trim()||null,
    max_guests:parseInt(document.getElementById('maxGuests').value)||null,
    checkin_manager:document.getElementById('checkinMgr').value.trim()||null,
    caretaker_phone:document.getElementById('caretakerPhone').value.trim()||null,
    map_link:document.getElementById('mapLink').value.trim()||null,
    mode:document.getElementById('mode').value,
    bookable:document.getElementById('bookable').checked,
    notes:document.getElementById('notes').value.trim()||null,
  };
}

async function renderAddRoom() {
  renderShell(`
    <div class="card">
      <h1>➕ Add Property</h1>
      <button class="secondary btn-sm" onclick="renderManageRooms()">← Back</button>
    </div>
    <div class="card">
      ${roomFormFields()}
      <button onclick="saveNewRoom()">💾 Save</button>
      <div id="addErr"></div>
    </div>`, 'rooms');
}

async function saveNewRoom() {
  const o = collectRoomForm();
  if (!o.room_id || !o.unit_no) {
    document.getElementById('addErr').innerHTML = '<div class="error">Room ID & Unit No required</div>';
    return;
  }
  const {error} = await sb.from('rooms').insert(o);
  if (error) {
    document.getElementById('addErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  await sb.from('flats_status').insert({room_id:o.room_id,status:'Free',cleaning_status:'Clean'});
  renderManageRooms();
}

async function editRoom(id) {
  const {data:r} = await sb.from('rooms').select('*').eq('room_id',id).single();
  if (!r) { alert('Not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Property</h1>
      <button class="secondary btn-sm" onclick="renderManageRooms()">← Back</button>
    </div>
    <div class="card">
      ${roomFormFields(r)}
      <button onclick="updateRoom('${id}')">💾 Update</button>
      <div id="editErr"></div>
    </div>`, 'rooms');
}

async function updateRoom(id) {
  const o = collectRoomForm();
  delete o.room_id;
  if (!o.unit_no) {
    document.getElementById('editErr').innerHTML = '<div class="error">Unit No required</div>';
    return;
  }
  const {error} = await sb.from('rooms').update(o).eq('room_id',id);
  if (error) {
    document.getElementById('editErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderManageRooms();
}

async function deleteRoom(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  await sb.from('flats_status').delete().eq('room_id',id);
  await sb.from('rooms').delete().eq('room_id',id);
  renderManageRooms();
}

// ============ FLATS ============
async function renderFlatsStatus() {
  renderShell(`<div class="loading">Loading flats status...</div>`, 'flats');

  const { data: flats, error } = await sb
    .from('flats_status')
    .select('*, rooms(unit_no, nickname, property_name)')
    .order('room_id');

  if (error) {
    renderShell(`<div class="card"><div class="error">${error.message}</div></div>`, 'flats');
    return;
  }

  const can = ['owner', 'viewer', 'manager', 'checkin_manager'].includes(SESSION.role);

  const freeCount = (flats || []).filter(f => f.status === 'Free').length;
  const bookedCount = (flats || []).filter(f => f.status === 'Booked').length;
  const dirtyCount = (flats || []).filter(f => f.cleaning_status === 'Dirty').length;

  renderShell(`
    ${getUpdateNoticeHTML()}
    ${SESSION.role === 'owner' ? syncInfoHTML() : ''}

    <div class="card">
      <h1>🛏️ Flats Status</h1>
      <div class="sub">${(flats || []).length} flats</div>
      <div style="font-size:11px;color:var(--muted);">Build: ${APP_VERSION}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${freeCount}</div>
        <div class="stat-label">Free</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedCount}</div>
        <div class="stat-label">Booked</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirtyCount}</div>
        <div class="stat-label">Need Cleaning</div>
      </div>
    </div>

    <div class="card">
      <div id="flatActionMsg"></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Cleaning</th>
              <th>Quick Action</th>
              ${can ? '<th>Edit</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${(flats || []).map(f => {
              const isDirty = f.cleaning_status === 'Dirty';
              const isClean = f.cleaning_status === 'Clean';
              const isProgress = f.cleaning_status === 'In Progress';

              return `
                <tr>
                  <td><strong>${f.rooms?.nickname || f.room_id}</strong></td>
                  <td>${f.rooms?.unit_no || ''}</td>
                  <td><span class="badge ${f.status === 'Free' ? 'green' : f.status === 'Booked' ? 'blue' : 'red'}">${f.status || 'Free'}</span></td>
                  <td><span class="badge ${isClean ? 'green' : isProgress ? 'yellow' : 'red'}">${f.cleaning_status || 'Clean'}</span></td>
                  <td class="table-actions">
                    ${isDirty ? `<button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean', this)">✅ Clean</button>` : ''}
                    ${isDirty ? `<button class="btn-sm secondary" onclick="quickClean('${f.room_id}','In Progress', this)">🔄 Start</button>` : ''}
                    ${isProgress ? `<button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean', this)">✅ Done</button>` : ''}
                    ${isClean ? `<button class="btn-sm danger" onclick="quickClean('${f.room_id}','Dirty', this)">🧹 Dirty</button>` : ''}
                  </td>
                  ${can ? `<td><button class="btn-sm outline" onclick="editFlatStatus('${f.room_id}')">✏️ Edit</button></td>` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `, 'flats');
}

async function quickClean(roomId, newStatus, btnEl = null) {
  const msgEl = document.getElementById('flatActionMsg');

  try {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Saving...';
    }

    const updates = { cleaning_status: newStatus };
    if (newStatus === 'Clean') {
      updates.last_cleaned = new Date().toISOString().slice(0, 10);
    }

    const { error } = await sb.from('flats_status').update(updates).eq('room_id', roomId);
    if (error) throw error;

    if (msgEl) msgEl.innerHTML = `<div class="success-msg">✅ ${roomId} marked as ${newStatus}</div>`;

    setTimeout(() => { renderFlatsStatus(); }, 250);
  } catch (err) {
    console.error('quickClean error:', err);
    if (msgEl) msgEl.innerHTML = `<div class="error">❌ Update failed: ${err.message}</div>`;
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = 'Retry';
    }
  }
}

async function editFlatStatus(id) {
  const {data:f, error} = await sb
    .from('flats_status')
    .select('*, rooms(unit_no, nickname)')
    .eq('room_id', id)
    .single();

  if (error || !f) {
    alert('Flat not found');
    return;
  }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Flat Status</h1>
      <div class="sub">${f.rooms?.nickname || id} (${f.rooms?.unit_no || ''})</div>
      <button class="secondary btn-sm" onclick="renderFlatsStatus()">← Back</button>
    </div>

    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Status</label>
          <select id="flatStatus">
            <option value="Free" ${f.status==='Free'?'selected':''}>Free</option>
            <option value="Booked" ${f.status==='Booked'?'selected':''}>Booked</option>
            <option value="Blocked-Maintenance" ${f.status==='Blocked-Maintenance'?'selected':''}>Blocked-Maintenance</option>
          </select>
        </div>

        <div class="form-group">
          <label>Cleaning</label>
          <select id="cleanSt">
            <option value="Clean" ${f.cleaning_status==='Clean'?'selected':''}>Clean</option>
            <option value="Dirty" ${f.cleaning_status==='Dirty'?'selected':''}>Dirty</option>
            <option value="In Progress" ${f.cleaning_status==='In Progress'?'selected':''}>In Progress</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Issue</label>
        <input id="flatIssue" value="${f.issue || ''}" placeholder="Optional issue / maintenance note" />
      </div>

      <div class="form-group">
        <label>Last Cleaned</label>
        <input id="lastCleaned" type="date" value="${f.last_cleaned || ''}" />
      </div>

      <button onclick="saveFlatStatus('${id}')">💾 Update</button>
      <div id="flatErr"></div>
    </div>`, 'flats');
}

async function saveFlatStatus(id) {
  const status = document.getElementById('flatStatus')?.value;
  const cleaning = document.getElementById('cleanSt')?.value;
  const issue = document.getElementById('flatIssue')?.value?.trim() || null;
  const lastCleaned = document.getElementById('lastCleaned')?.value || null;

  const { error } = await sb.from('flats_status').update({
    status,
    cleaning_status: cleaning,
    issue,
    last_cleaned: lastCleaned
  }).eq('room_id', id);

  if (error) {
    document.getElementById('flatErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderFlatsStatus();
}


// ============ MANAGE BOOKINGS ============
async function renderManageBookings() {
  renderShell(`<div class="loading">Loading...</div>`, 'bookings');
  const {data:all,error} = await sb.from("guest_register")
    .select("*, rooms(unit_no, nickname, property_name)").order("check_in",{ascending:false});
  if (error) { renderShell(`<div class="error">${error.message}</div>`,'bookings'); return; }
  const {data:rooms} = await sb.from('rooms').select('room_id, unit_no, nickname, property_name').order('unit_no');
  const roomMap = {};
  (rooms||[]).forEach(r => { roomMap[r.room_id] = r; });

  const mf=SESSION.bookingFilter||'All', pf=SESSION.bookingPropFilter||'',
    df=SESSION.bookingDateFilter||'', d1=SESSION.bookingDateFrom||'', d2=SESSION.bookingDateTo||'',
    sq=SESSION.bookingSearch||'';

  let f = all||[];
  if (mf!=='All') f=f.filter(b=>b.booking_mode===mf);
  if (pf) f=f.filter(b=>b.room_id===pf);
  if (df) f=f.filter(b=>b.check_in===df);
  if (d1) f=f.filter(b=>b.check_in>=d1);
  if (d2) f=f.filter(b=>b.check_in<=d2);
  if (sq) f=f.filter(b=>(b.guest_name||'').toLowerCase().includes(sq.toLowerCase()) || (b.phone||'').includes(sq));

  const today = new Date().toISOString().slice(0,10);
  f.sort((a,b2) => {
    const aA = a.check_in<=today && a.check_out>today;
    const bA = b2.check_in<=today && b2.check_out>today;
    const aT = a.check_out===today, bT = b2.check_out===today;
    const aF = a.check_in>today, bF = b2.check_in>today;
    if (aA&&!bA) return -1; if (!aA&&bA) return 1;
    if (aT&&!bT) return -1; if (!aT&&bT) return 1;
    if (aF&&!bF) return -1; if (!aF&&bF) return 1;
    return (b2.check_in||'').localeCompare(a.check_in||'');
  });

  const overlaps = findOverlappingBookings(all||[]);
  const pm = await getPaidMap(f.map(b=>b.booking_id));
  const canM = ['owner','viewer','manager'].includes(SESSION.role);
  const canD = SESSION.role==='owner';

  renderShell(`
    <div class="card">
      <h1>📅 Bookings</h1>
      <div class="sub">${f.length} bookings ${sq?'matching "'+sq+'"':''}</div>
      ${canM?`<button onclick="renderAddBooking()">➕ New Booking</button>`:''}
    </div>

    ${overlaps.length?`<div class="card"><div class="error"><strong>⚠️ Overlapping (${overlaps.length})</strong><br>
      ${overlaps.slice(0,5).map(o=>`<div style="margin:4px 0;font-size:12px;"><strong>${o.roomId}</strong> — ${o.a.guest_name||'-'} (${o.a.check_in}→${o.a.check_out}) ↔ ${o.b.guest_name||'-'} (${o.b.check_in}→${o.b.check_out})</div>`).join('')}
    </div></div>`:''}

    <div class="card">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="bkSearch" placeholder="Search guest name or phone..." value="${sq}"
          oninput="SESSION.bookingSearch=this.value; clearTimeout(window._searchTimer); window._searchTimer=setTimeout(()=>renderManageBookings(),600);" />
        ${sq?`<button class="outline btn-sm" onclick="SESSION.bookingSearch='';renderManageBookings();" style="min-height:30px;padding:4px 8px;">✕</button>`:''}
      </div>

      <div class="section-title">Filters</div>
      <div class="filter-bar">
        <div class="filter-item"><label>Mode</label><select id="fMode">
          <option value="All" ${mf==='All'?'selected':''}>All</option>
          <option value="Online-Airbnb" ${mf==='Online-Airbnb'?'selected':''}>Online</option>
          <option value="Offline" ${mf==='Offline'?'selected':''}>Offline</option>
        </select></div>
        <div class="filter-item"><label>Property</label><select id="fProp">
          <option value="">All</option>
          ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${pf===r.room_id?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}
        </select></div>
        <div class="filter-item"><label>Date</label><input type="date" id="fDate" value="${df}" /></div>
        <div class="filter-item"><label>From</label><input type="date" id="fFrom" value="${d1}" /></div>
        <div class="filter-item"><label>To</label><input type="date" id="fTo" value="${d2}" /></div>
        <div class="filter-item" style="flex-direction:row;gap:4px;align-items:flex-end;">
          <button class="btn-sm" onclick="applyBkFilters()">Apply</button>
          <button class="btn-sm outline" onclick="clearBkFilters()">Clear</button>
        </div>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Status</th><th>Guest</th><th>Property</th><th>Mode</th><th>By</th>
        <th>In</th><th>Out</th><th>Rate</th><th>Total</th><th>Paid</th><th>Due</th>
        ${canM?'<th>Actions</th>':''}
      </tr></thead>
      <tbody>${f.map(b=>{
        const pd=pm[b.booking_id]||0, bal=(b.total_amount||0)-pd;
        const isActive = b.check_in<=today && b.check_out>today;
        const isCheckoutToday = b.check_out===today;
        const isPast = b.check_out<today;
        const isOpenEnded = b.checkout_confirmed===false;
        const statusBadge = isActive
          ? (isOpenEnded ? '<span class="badge yellow">🔄 Open</span>' : '<span class="badge green">🟢 Active</span>')
          : isCheckoutToday ? '<span class="badge yellow">📤 Checkout</span>'
          : isPast ? '<span class="badge" style="background:#F3F4F6;color:#6B7280;">Done</span>'
          : '<span class="badge blue">Upcoming</span>';
        const ids=(b.id_proof_photo_paths||b.id_proof_photo_path||'').split(',').filter(Boolean);
        const rowBg = isActive?'background:#f0fff4;':isCheckoutToday?'background:#fffbeb;':'';
        return `<tr style="${rowBg}">
          <td>${statusBadge}</td>
          <td>
            <strong>${b.guest_name||'-'}</strong><br>
            <small style="color:var(--muted);">${b.phone||''}</small>
            ${b.has_vehicle?`<br><small>🚗 ${b.vehicle_name||''} ${b.vehicle_number||''}</small>`:''}
            ${ids.length?`<br><div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px;">${ids.map((p,i)=>`<button class="btn-sm outline" style="padding:2px 6px;font-size:10px;min-height:24px;" onclick="dlIdPhoto('${p}')">📎G${i+1}</button>`).join('')}</div>`:''}
          </td>
          <td>
            <strong>${b.rooms?.nickname||'-'}</strong><br>
            <small style="color:var(--muted);">${b.rooms?.unit_no||b.room_id}</small>
            ${b.source_room_id&&b.source_room_id!==b.room_id?`<br><small style="color:var(--blue);font-size:10px;">📍 ${roomMap[b.source_room_id]?.nickname||b.source_room_id}</small>`:''}
            ${b.parent_booking_id?`<br><small style="color:var(--muted);font-size:10px;">🔁 Ext</small>`:''}
          </td>
          <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'Online':'Offline'}</span></td>
          <td><small>${b.booked_by||'-'}</small></td>
          <td><small>${b.check_in||'-'}<br>${b.check_in_time||''}</small></td>
          <td><small>${b.check_out||'-'}<br>${b.check_out_time||''}</small></td>
          <td><small>${b.per_day_rate?'₹'+b.per_day_rate:'-'}</small></td>
          <td><strong>₹${(b.total_amount||0).toLocaleString('en-IN')}</strong></td>
          <td style="color:var(--green);">₹${pd.toLocaleString('en-IN')}</td>
          <td><strong class="${bal>0?'metric-value warn':''}">₹${bal.toLocaleString('en-IN')}</strong></td>
          ${canM?`<td class="table-actions">
            <button class="btn-sm" onclick="editBooking('${b.booking_id}')">✏️</button>
            <button class="btn-sm secondary" onclick="showPaymentModal('${b.booking_id}')">💰</button>
            <button class="btn-sm outline" onclick="createOfflineExtension('${b.booking_id}')">➕</button>
            ${isActive?`<button class="btn-sm secondary" onclick="quickCheckout('${b.booking_id}','${b.room_id}')">📤</button>`:''}
            <button class="btn-sm outline" onclick="shareBookingWhatsApp('${b.booking_id}')">📱</button>
            ${canD?`<button class="btn-sm danger" onclick="delBooking('${b.booking_id}','${(b.guest_name||'').replace(/'/g,"\\'")}','${b.room_id}')">🗑️</button>`:''}
          </td>`:''}</tr>`;}).join('')}</tbody>
    </table></div></div>`, 'bookings');
}

function applyBkFilters() {
  SESSION.bookingFilter=document.getElementById('fMode').value;
  SESSION.bookingPropFilter=document.getElementById('fProp').value;
  SESSION.bookingDateFilter=document.getElementById('fDate').value;
  SESSION.bookingDateFrom=document.getElementById('fFrom').value;
  SESSION.bookingDateTo=document.getElementById('fTo').value;
  renderManageBookings();
}

function clearBkFilters() {
  SESSION.bookingFilter='All'; SESSION.bookingPropFilter='';
  SESSION.bookingDateFilter=''; SESSION.bookingDateFrom=''; SESSION.bookingDateTo='';
  SESSION.bookingSearch='';
  renderManageBookings();
}

async function dlIdPhoto(path) {
  const {data} = await sb.storage.from('id-proofs').createSignedUrl(path, 300);
  if (!data?.signedUrl) { alert('Photo load failed'); return; }
  showPhotoViewer(data.signedUrl, path);
}

function showPhotoViewer(url, path) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-viewer-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <button class="photo-viewer-close" onclick="this.closest('.photo-viewer-overlay').remove()">✕</button>
    <img src="${url}" alt="ID Photo" onerror="this.src='';this.alt='⚠️ Photo load failed';" />
    <div class="photo-viewer-nav">
      <button onclick="window.open('${url}','_blank')">📥 Download</button>
      <button onclick="this.closest('.photo-viewer-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ============ ADD BOOKING ============
async function renderAddBooking() {
  const pre = window._bookingPrefill || {};
  const {data:rooms} = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name, bookable, checkin_manager, caretaker_phone, map_link').order('room_id');
  window._roomsCache = rooms||[];

  let idSlots = '';
  for (let i=1;i<=8;i++) {
    idSlots += `
      <div class="id-card" id="idSlot${i}" style="display:${i===1?'block':'none'};">
        <div class="id-card-title">👤 Guest ${i}${i===1?' (Primary)':''}</div>
        <input type="text" style="font-size:13px;min-height:36px;margin-bottom:4px;" id="gN${i}" placeholder="Guest ${i} naam" value="${i===1?(pre.guestName||''):''}" />
        <div style="font-size:11px;color:var(--muted);margin:4px 0;">📄 Front Side</div>
        <div class="id-card-btns">
          <button type="button" class="outline" onclick="document.getElementById('gFCam${i}').click()">📷</button>
          <button type="button" class="outline" onclick="document.getElementById('gFGal${i}').click()">🖼️</button>
        </div>
        <input type="file" id="gFCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdPick(${i},'front','cam')" />
        <input type="file" id="gFGal${i}" accept="image/*" style="display:none;" onchange="onIdPick(${i},'front','gal')" />
        <div style="font-size:11px;color:var(--muted);margin:4px 0;">📄 Back Side</div>
        <div class="id-card-btns">
          <button type="button" class="outline" onclick="document.getElementById('gBCam${i}').click()">📷</button>
          <button type="button" class="outline" onclick="document.getElementById('gBGal${i}').click()">🖼️</button>
        </div>
        <input type="file" id="gBCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdPick(${i},'back','cam')" />
        <input type="file" id="gBGal${i}" accept="image/*" style="display:none;" onchange="onIdPick(${i},'back','gal')" />
        <div class="file-info" id="idSt${i}"></div>
      </div>`;
  }

  renderShell(`
    <div class="card">
      <h1>➕ New Booking</h1>
      <button class="secondary btn-sm" onclick="window._bookingPrefill=null;renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <input type="hidden" id="parentBookingId" value="${pre.parentBookingId||''}" />
      <input type="hidden" id="stayGroupId" value="${pre.stayGroupId||''}" />
      ${pre.parentBookingId?`<div class="success-msg" style="margin-bottom:10px;">Extension of <strong>${pre.parentBookingId}</strong></div>`:''}

      <div class="form-grid">
        <div class="form-group"><label>Guest Name *</label><input id="guestName" placeholder="Guest ka naam" value="${pre.guestName||''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" type="tel" placeholder="Mobile" value="${pre.guestPhone||''}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Actual Stay Property *</label>
          <select id="roomId" onchange="onRoomChg()">
            <option value="">Select</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${pre.roomId===r.room_id?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}
          </select>
          <div id="roomInfo" style="font-size:11px;color:var(--muted);margin-top:2px;"></div>
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select id="bookingMode" onchange="onModeChg()">
            <option value="Offline" ${(pre.bookingMode||'Offline')==='Offline'?'selected':''}>Offline</option>
            <option value="Online-Airbnb" ${(pre.bookingMode||'')==='Online-Airbnb'?'selected':''}>Online</option>
          </select>
        </div>
      </div>

      <div id="onlineBox" style="display:none;background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="section-title">🌐 Airbnb Source</div>
        <div class="form-group">
          <label>Source Listing (agar shift hua)</label>
          <select id="sourceRoomId">
            <option value="">Same as actual</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${(pre.sourceRoomId||'')=== r.room_id?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Check-in Date</label><input id="checkIn" type="date" onchange="onRoomChg()" value="${pre.checkIn||''}" /></div>
        <div class="form-group"><label>Check-in Time</label><input id="checkInTime" type="time" value="${pre.checkInTime||'14:00'}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Check-out Date</label><input id="checkOut" type="date" onchange="onRoomChg()" value="${pre.checkOut||''}" /></div>
        <div class="form-group"><label>Check-out Time</label><input id="checkOutTime" type="time" value="${pre.checkOutTime||'11:00'}" /></div>
      </div>
      <div id="nightsInfo" style="font-size:12px;color:var(--muted);margin-bottom:6px;"></div>

      <div class="form-grid">
        <div class="form-group">
          <label>Checkout Confirmed?</label>
          <select id="checkoutConfirmed">
            <option value="yes" ${(pre.checkoutConfirmed||'yes')==='yes'?'selected':''}>Yes — Fixed date</option>
            <option value="no" ${pre.checkoutConfirmed==='no'?'selected':''}>No — Per day basis</option>
          </select>
        </div>
        <div class="form-group"><label>Guests</label><input id="guests" type="number" value="${pre.guests||1}" min="1" max="8" onchange="showIdSlots()" oninput="showIdSlots()" /></div>
      </div>

      <div id="offlineRateBox">
        <div class="form-grid">
          <div class="form-group"><label>Per Day Rate ₹</label>
            <input id="perDayRate" type="number" placeholder="Per night" oninput="onRateChg()" value="${pre.perDayRate||''}" />
          </div>
          <div class="form-group"><label>Total Amount ₹ *</label>
            <input id="totalAmount" type="number" placeholder="Final total" oninput="onAmtChg()" value="${pre.totalAmount||''}" />
            <div id="sugInfo" style="font-size:11px;color:var(--muted);"></div>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Advance ₹</label>
          <input id="advanceAmt" type="number" value="${pre.advanceAmt||0}" oninput="onAmtChg()" />
        </div>
        <div class="form-group"><label>Advance Mode</label>
          <select id="advMode">
            <option value="">--</option>
            <option value="Cash" ${pre.advMode==='Cash'?'selected':''}>Cash</option>
            <option value="UPI" ${pre.advMode==='UPI'?'selected':''}>UPI</option>
            <option value="Bank" ${pre.advMode==='Bank'?'selected':''}>Bank</option>
            <option value="Airbnb Payout" ${pre.advMode==='Airbnb Payout'?'selected':''}>Airbnb Payout</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Advance Date</label><input id="advDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div id="balInfo" style="font-size:13px;font-weight:600;margin:2px 0 8px;"></div>

      <div class="form-grid">
        <div class="form-group">
          <label>Vehicle?</label>
          <select id="hasVehicle" onchange="toggleVehicle()">
            <option value="false" ${pre.hasVehicle?'':'selected'}>No</option>
            <option value="true" ${pre.hasVehicle?'selected':''}>Yes</option>
          </select>
        </div>
      </div>
      <div id="vehicleBox" style="display:${pre.hasVehicle?'block':'none'};">
        <div class="form-grid">
          <div class="form-group"><label>Vehicle Name</label><input id="vehicleName" placeholder="e.g. Swift Dzire" value="${pre.vehicleName||''}" /></div>
          <div class="form-group"><label>Registration No.</label><input id="vehicleNumber" placeholder="e.g. UP32 XX 1234" value="${pre.vehicleNumber||''}" /></div>
        </div>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:6px;">
        <div class="section-title">🪪 ID Proof</div>
        <div class="form-grid">
          <div class="form-group"><label>ID Type</label>
            <select id="idType"><option value="Aadhar" selected>Aadhar</option><option value="PAN">PAN</option><option value="DL">DL</option><option value="Passport">Passport</option></select>
          </div>
          <div class="form-group"><label>ID Number</label><input id="idNo" placeholder="e.g. 1234 5678 9012" value="${pre.idNo||''}" /></div>
        </div>
        <div class="id-grid" id="idGrid">${idSlots}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;">📸 Front & Back — Camera ya Gallery se upload karo</div>
      </div>

      <div class="form-group" style="margin-top:10px;"><label>Notes</label><textarea id="bkNotes" placeholder="Special notes...">${pre.bkNotes||''}</textarea></div>
      <button id="saveBtn" onclick="saveBooking()" style="width:100%;padding:14px;font-size:15px;margin-top:10px;">💾 Save Booking</button>
      <div id="addBkErr"></div>
    </div>`, 'bookings');

  onModeChg(); onRoomChg(); showIdSlots();
}

function showIdSlots() {
  const n = Math.min(parseInt(document.getElementById('guests')?.value)||1, 8);
  for (let i=1;i<=8;i++) { const el=document.getElementById(`idSlot${i}`); if(el) el.style.display=i<=n?'block':'none'; }
}

function onIdPick(i, side, src) {
  const prefix = side==='front'?'gF':'gB';
  const inp = document.getElementById(src==='cam'?`${prefix}Cam${i}`:`${prefix}Gal${i}`);
  const st = document.getElementById(`idSt${i}`);
  const slot = document.getElementById(`idSlot${i}`);
  if (inp?.files?.[0]) {
    const prev = st.textContent || '';
    st.textContent = prev + ` ✅ ${side} (${src})`;
    slot.classList.add('done');
  }
}

function toggleVehicle() {
  const hasV = document.getElementById('hasVehicle')?.value==='true';
  const box = document.getElementById('vehicleBox');
  if (box) box.style.display = hasV?'block':'none';
}

function onModeChg() {
  const m = document.getElementById('bookingMode')?.value;
  const onlineBox = document.getElementById('onlineBox');
  const rateBox = document.getElementById('offlineRateBox');
  if (onlineBox) onlineBox.style.display = m==='Online-Airbnb'?'block':'none';

  if (m==='Online-Airbnb') {
    const rid = document.getElementById('roomId')?.value;
    const src = document.getElementById('sourceRoomId');
    if (src && !src.value && rid) src.value = rid;
  }
  onAmtChg();
}

function onRoomChg() {
  const rid = document.getElementById('roomId')?.value;
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const room = (window._roomsCache||[]).find(r=>r.room_id===rid);
  const rInfo = document.getElementById('roomInfo');
  if (room) rInfo.innerHTML = `${room.bookable?'✅':'⚠️'} · ${room.checkin_manager||'No manager'}`;
  else if (rInfo) rInfo.innerHTML = '';

  const mode = document.getElementById('bookingMode')?.value;
  const src = document.getElementById('sourceRoomId');
  if (mode==='Online-Airbnb' && src && !src.value && rid) src.value = rid;

  const nInfo = document.getElementById('nightsInfo');
  if (ci&&co) {
    const nights = calcNights(ci, co);
    if (nInfo) nInfo.innerHTML = nights>0?`🌙 <strong>${nights} night(s)</strong>`:`<span style="color:var(--red);">Invalid dates</span>`;
  } else if (nInfo) nInfo.innerHTML = '';
  onRateChg(); onAmtChg();
}

function onRateChg() {
  const rate = parseFloat(document.getElementById('perDayRate')?.value)||0;
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const sugInfo = document.getElementById('sugInfo');
  const mode = document.getElementById('bookingMode')?.value;
  if (rate>0 && ci && co && mode!=='Online-Airbnb') {
    const nights = calcNights(ci, co);
    if (nights>0) {
      const suggested = rate * nights;
      if (sugInfo) sugInfo.innerHTML = `💡 ${nights} × ₹${rate.toLocaleString('en-IN')} = ₹${suggested.toLocaleString('en-IN')}`;
      const totalEl = document.getElementById('totalAmount');
      if (totalEl && !totalEl.value) totalEl.value = suggested;
    } else if (sugInfo) sugInfo.innerHTML = '';
  } else if (sugInfo) sugInfo.innerHTML = '';
}

function onAmtChg() {
  const mode = document.getElementById('bookingMode')?.value;
  const total = parseFloat(document.getElementById('totalAmount')?.value)||0;
  const adv = parseFloat(document.getElementById('advanceAmt')?.value)||0;
  const bal = total - adv;
  const el = document.getElementById('balInfo');

  if (mode==='Online-Airbnb' && total>0) {
    const ci = document.getElementById('checkIn')?.value;
    const co = document.getElementById('checkOut')?.value;
    const nights = calcNights(ci, co);
    if (nights>0) {
      const rateEl = document.getElementById('perDayRate');
      if (rateEl) rateEl.value = Math.round(total/nights);
    }
    const advEl = document.getElementById('advanceAmt');
    if (advEl && !advEl.value) advEl.value = total;
  }

  if (el) {
    if (total>0) el.innerHTML = bal>0?`<span style="color:var(--red);">💳 Balance: ₹${bal.toLocaleString('en-IN')}</span>`:`<span style="color:var(--green);">✅ Fully Paid</span>`;
    else el.innerHTML = '';
  }
}

async function uploadIdPhotos(bkId) {
  const cnt = Math.min(parseInt(document.getElementById('guests')?.value)||1, 8);
  const frontPaths = [], backPaths = [], allPaths = [];

  for (let i=1;i<=cnt;i++) {
    const name = (document.getElementById(`gN${i}`)?.value?.trim()||`Guest${i}`).replace(/[^a-zA-Z0-9]/g,'_').substring(0,20);

    // Front
    const fCam = document.getElementById(`gFCam${i}`);
    const fGal = document.getElementById(`gFGal${i}`);
    const fFile = fCam?.files?.[0] || fGal?.files?.[0];
    if (fFile) {
      try {
        const comp = await compressImage(fFile);
        const path = `${bkId}/${Date.now()}_${name}_front.jpg`;
        const {error} = await sb.storage.from('id-proofs').upload(path, comp, {contentType:'image/jpeg'});
        if (!error) { frontPaths.push(path); allPaths.push(path); }
      } catch(e) { console.warn(`Front photo ${i} failed`, e); }
    }

    // Back
    const bCam = document.getElementById(`gBCam${i}`);
    const bGal = document.getElementById(`gBGal${i}`);
    const bFile = bCam?.files?.[0] || bGal?.files?.[0];
    if (bFile) {
      try {
        const comp = await compressImage(bFile);
        const path = `${bkId}/${Date.now()}_${name}_back.jpg`;
        const {error} = await sb.storage.from('id-proofs').upload(path, comp, {contentType:'image/jpeg'});
        if (!error) { backPaths.push(path); allPaths.push(path); }
      } catch(e) { console.warn(`Back photo ${i} failed`, e); }
    }
  }

  return {
    frontPaths: frontPaths.length?frontPaths.join(','):null,
    backPaths: backPaths.length?backPaths.join(','):null,
    allPaths: allPaths.length?allPaths.join(','):null,
    firstPath: allPaths[0]||null
  };
}

async function saveBooking() {
  const btn = document.getElementById('saveBtn');
  if (btn.disabled) return;
  btn.disabled=true; btn.textContent='⏳ Saving...';

  try {
    const gn=document.getElementById('guestName').value.trim();
    const ph=document.getElementById('guestPhone').value.trim();
    const rid=document.getElementById('roomId').value;
    const mode=document.getElementById('bookingMode').value;
    const sourceRoomId = mode==='Online-Airbnb'?(document.getElementById('sourceRoomId')?.value||rid):null;
    const ci=document.getElementById('checkIn').value;
    const co=document.getElementById('checkOut').value;
    const checkInTime=document.getElementById('checkInTime')?.value||'14:00';
    const checkOutTime=document.getElementById('checkOutTime')?.value||'11:00';
    const checkoutConfirmed=document.getElementById('checkoutConfirmed')?.value==='yes';
    const gs=parseInt(document.getElementById('guests').value)||1;
    const perDayRate=parseFloat(document.getElementById('perDayRate')?.value)||0;
    let tot=parseFloat(document.getElementById('totalAmount').value)||0;
    let adv=parseFloat(document.getElementById('advanceAmt').value)||0;
    const advMode=document.getElementById('advMode').value;
    const advDate=document.getElementById('advDate')?.value||new Date().toISOString().slice(0,10);
    const idType=document.getElementById('idType').value;
    const idNo=document.getElementById('idNo').value.trim();
    const parentBookingId=document.getElementById('parentBookingId')?.value||null;
    const stayGroupId=document.getElementById('stayGroupId')?.value||null;
    const hasVehicle=document.getElementById('hasVehicle')?.value==='true';
    const vehicleName=hasVehicle?(document.getElementById('vehicleName')?.value.trim()||null):null;
    const vehicleNumber=hasVehicle?(document.getElementById('vehicleNumber')?.value.trim()||null):null;
    let notes=document.getElementById('bkNotes').value.trim();

    if (!gn||!rid) { document.getElementById('addBkErr').innerHTML='<div class="error">Guest name & property required</div>'; btn.disabled=false; btn.textContent='💾 Save Booking'; return; }

    if (tot===0) {
      const proceed = confirm('⚠️ Total amount ₹0 hai. Save karna hai?');
      if (!proceed) { btn.disabled=false; btn.textContent='💾 Save Booking'; return; }
    }

    if (mode==='Online-Airbnb') { adv = tot; }

    if (ci&&co) {
      const {data:ex} = await sb.from('guest_register').select('booking_id,guest_name,check_in,check_out').eq('room_id',rid);
      const clash = (ex||[]).find(b=>b.check_in&&b.check_out&&b.check_in<co&&b.check_out>ci);
      if (clash) { document.getElementById('addBkErr').innerHTML=`<div class="error">⚠️ Clash: ${clash.guest_name} (${clash.check_in}→${clash.check_out})</div>`; btn.disabled=false; btn.textContent='💾 Save Booking'; return; }
    }

    const bkId = 'B'+Date.now();
    const finalStayGroupId = stayGroupId||bkId;
    const photos = await uploadIdPhotos(bkId);

    const noteParts = [];
    if (notes) noteParts.push(notes);
    if (mode==='Online-Airbnb'&&sourceRoomId&&sourceRoomId!==rid) noteParts.push(`Airbnb booked on ${sourceRoomId}, shifted to ${rid}`);
    if (parentBookingId) noteParts.push(`Extension after previous stay (${parentBookingId})`);
    if (!checkoutConfirmed) noteParts.push('Open-ended stay — per day basis');
    const finalNotes = noteParts.join(' | ');

    const payStatus = mode==='Online-Airbnb'?'Paid':(adv>=tot&&tot>0?'Paid':(adv>0?'Partial':'Unpaid'));

    const {error} = await sb.from('guest_register').insert({
      booking_id:bkId, guest_name:gn, phone:ph||null,
      id_proof_type:idType||null, id_proof_no:idNo||null,
      id_proof_photo_path:photos.firstPath,
      id_proof_photo_paths:photos.allPaths,
      id_proof_front_paths:photos.frontPaths,
      id_proof_back_paths:photos.backPaths,
      room_id:rid, source_room_id:sourceRoomId,
      parent_booking_id:parentBookingId, stay_group_id:finalStayGroupId,
      booking_mode:mode,
      check_in:ci||null, check_out:co||null,
      check_in_time:checkInTime, check_out_time:checkOutTime,
      checkout_confirmed:checkoutConfirmed,
      guests:gs, per_day_rate:perDayRate, total_amount:tot,
      has_vehicle:hasVehicle, vehicle_name:vehicleName, vehicle_number:vehicleNumber,
      payment_status:payStatus,
      notes:finalNotes||null, booked_by:SESSION.displayName||SESSION.role
    });

    if (error) { document.getElementById('addBkErr').innerHTML=`<div class="error">${error.message}</div>`; btn.disabled=false; btn.textContent='💾 Save Booking'; return; }

    if (adv>0) await sb.from('payment_history').insert({booking_id:bkId,amount:adv,payment_mode:advMode||null,payment_date:advDate,notes:mode==='Online-Airbnb'?'Airbnb Payout':'Advance'});
    await sb.from('flats_status').upsert({room_id:rid,status:'Booked'});

    // WhatsApp
    const propTxt = document.getElementById('roomId').selectedOptions[0]?.text||'';
    const roomFull = (window._roomsCache||[]).find(r=>r.room_id===rid);
    const mgr = roomFull?.checkin_manager||'Not Assigned';
    const bal = tot-adv;
    const msg = [
      `🏠 *Booking Confirmed!*`,'',`👤 Guest: ${gn}`,`📞 Phone: ${ph||'N/A'}`,
      `🏡 Property: ${propTxt}`,
      ...(mode==='Online-Airbnb'&&sourceRoomId&&sourceRoomId!==rid?[`🌐 Source: ${sourceRoomId}`]:[]),
      ...(parentBookingId?[`🔁 Extension Of: ${parentBookingId}`]:[]),
      `👨‍💼 Manager: ${mgr}`,
      `📅 ${ci||'N/A'} (${checkInTime}) → ${co||'N/A'} (${checkOutTime})`,
      `🛏️ Guests: ${gs}`,
      ...(perDayRate?[`💵 Rate: ₹${perDayRate}/night`]:[]),
      `💰 Total: ₹${tot.toLocaleString('en-IN')}`,
      `💵 Advance: ₹${adv.toLocaleString('en-IN')}`,
      `💳 Balance: ₹${bal.toLocaleString('en-IN')}`,
      ...(hasVehicle?[`🚗 Vehicle: ${vehicleName||''} ${vehicleNumber||''}`]:[]),
      `🔖 Mode: ${mode}`,
      `🧾 By: ${SESSION.displayName||SESSION.role}`,'',`— ${BRAND}`
    ].join('\n');
    setTimeout(()=>window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank'),400);

    window._bookingPrefill = null;
    renderManageBookings();
  } catch(err) {
    document.getElementById('addBkErr').innerHTML=`<div class="error">${err.message||err}</div>`;
    btn.disabled=false; btn.textContent='💾 Save Booking';
  }
}

// ============ EXTENSION ============
async function createOfflineExtension(parentBookingId) {
  const {data:b} = await sb.from('guest_register').select('*').eq('booking_id',parentBookingId).single();
  if (!b) { alert('Not found'); return; }
  const today = new Date().toISOString().slice(0,10);
  if (b.check_out>=today) {
    await sb.from('guest_register').update({check_out:today,notes:(b.notes?b.notes+' | ':'')+'Auto-closed: extended on '+today}).eq('booking_id',parentBookingId);
  }
  if (b.room_id) await sb.from('flats_status').update({status:'Free',cleaning_status:'Dirty'}).eq('room_id',b.room_id);
  window._bookingPrefill = {
    guestName:b.guest_name||'', guestPhone:b.phone||'',
    roomId:b.room_id||'', sourceRoomId:b.source_room_id||b.room_id||'',
    bookingMode:'Offline', checkIn:today, checkOut:'',
    checkInTime:'14:00', checkOutTime:'11:00', checkoutConfirmed:'no',
    guests:b.guests||1, totalAmount:'', advanceAmt:0, advMode:'',
    perDayRate:b.per_day_rate||'',
    hasVehicle:b.has_vehicle||false, vehicleName:b.vehicle_name||'', vehicleNumber:b.vehicle_number||'',
    idType:b.id_proof_type||'Aadhar', idNo:b.id_proof_no||'',
    bkNotes:`Extension after previous stay (${parentBookingId})`,
    parentBookingId:parentBookingId, stayGroupId:b.stay_group_id||b.booking_id
  };
  renderAddBooking();
}

// ============ QUICK CHECKOUT ============
async function quickCheckout(bkId, roomId) {
  const today = new Date().toISOString().slice(0,10);
  const nowTime = new Date().toTimeString().slice(0,5);
  const {data:bk} = await sb.from('guest_register').select('guest_name,check_in,per_day_rate,total_amount,notes').eq('booking_id',bkId).single();
  if (!bk) { alert('Not found'); return; }
  const nights = Math.max(calcNights(bk.check_in, today), 1);
  const calcTotal = bk.per_day_rate?bk.per_day_rate*nights:bk.total_amount;
  const msg = `Quick Checkout for ${bk.guest_name}?\n\nCheck-in: ${bk.check_in}\nCheck-out: ${today} (${nowTime})\nNights: ${nights}\n${bk.per_day_rate?'Rate: ₹'+bk.per_day_rate+'/night\n':''}Total: ₹${calcTotal.toLocaleString('en-IN')}\n\nProceed?`;
  if (!confirm(msg)) return;
  await sb.from('guest_register').update({check_out:today,check_out_time:nowTime,total_amount:calcTotal,checkout_confirmed:true,notes:(bk.notes?bk.notes+' | ':'')+`Quick checkout ${today} ${nowTime}. ${nights} nights.`}).eq('booking_id',bkId);
  if (roomId) await sb.from('flats_status').update({status:'Free',cleaning_status:'Dirty'}).eq('room_id',roomId);
  alert(`✅ ${bk.guest_name} checked out! Total: ₹${calcTotal.toLocaleString('en-IN')}`);
  renderManageBookings();
}

// ============ WHATSAPP SHARE ============
async function shareBookingWhatsApp(bkId) {
  const {data:b} = await sb.from('guest_register').select('*, rooms(unit_no, nickname, property_name, checkin_manager, caretaker_phone, map_link, address)').eq('booking_id',bkId).single();
  if (!b) { alert('Not found'); return; }
  const {data:pays} = await sb.from('payment_history').select('amount').eq('booking_id',bkId);
  const paid = (pays||[]).reduce((s,p)=>s+(p.amount||0),0);
  const bal = (b.total_amount||0)-paid;

  const msg = [
    `🏠 *${BRAND}*`,
    ``,
    `Hii ${b.guest_name}, welcome to ${BRAND}!`,
    `Thank you for booking your stay with us.`,
    ``,
    `📍 Property: ${b.rooms?.nickname||''} (${b.rooms?.unit_no||''})`,
    b.rooms?.address?`📍 Address: ${b.rooms.address}`:'',
    b.rooms?.map_link?`📌 Location: ${b.rooms.map_link}`:'',
    ``,
    `📅 Check-in: ${b.check_in||'N/A'} at ${b.check_in_time||'2:00 PM'}`,
    `📅 Check-out: ${b.check_out||'N/A'} at ${b.check_out_time||'11:00 AM'}`,
    `🛏️ Guests: ${b.guests||1}`,
    b.has_vehicle?`🚗 Vehicle: ${b.vehicle_name||''} ${b.vehicle_number||''}`:'',
    ``,
    `💰 Total: ₹${(b.total_amount||0).toLocaleString('en-IN')}`,
    `💵 Paid: ₹${paid.toLocaleString('en-IN')}`,
    bal>0?`💳 Balance: ₹${bal.toLocaleString('en-IN')}`:'✅ Fully Paid',
    ``,
    `Check-in Instructions:`,
    `Our caretaker will assist you.`,
    b.rooms?.checkin_manager?`📞 ${b.rooms.checkin_manager}${b.rooms.caretaker_phone?' ('+b.rooms.caretaker_phone+')':''}`:'',
    ``,
    `Contact:`,
    `📞 Mr Shahanshah: 9450055554`,
    `📞 Mr Firoz Khan: 8299600709`,
    ``,
    `House Rules:`,
    `⚠️ No loud music after 11 PM`,
    `⚠️ Park where caretaker instructs`,
    `⚠️ No wild parties`,
    `⚠️ Govt ID required at check-in`,
    ``,
    `— ${BRAND}`
  ].filter(Boolean).join('\n');

  // Show copy option
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📱 WhatsApp Share</h2>
      <textarea id="waMsg" style="min-height:200px;font-size:12px;">${msg}</textarea>
      <div class="btn-row" style="margin-top:10px;">
        <button onclick="navigator.clipboard.writeText(document.getElementById('waMsg').value);alert('📋 Copied!')">📋 Copy Message</button>
        <button class="green-btn" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">📱 Share on WhatsApp</button>
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ============ PAYMENT MODAL ============
function showPaymentModal(bkId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
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
      <div class="form-group"><label>Date</label><input id="payDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div class="form-group"><label>Notes</label><input id="payNotes" placeholder="Optional" /></div>
      <button onclick="savePaymentModal('${bkId}')" style="width:100%;margin-top:10px;">💾 Save Payment</button>
      <div id="payErr"></div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function savePaymentModal(bkId) {
  const amt = parseFloat(document.getElementById('payAmt')?.value)||0;
  if (amt<=0) { document.getElementById('payErr').innerHTML='<div class="error">Amount required</div>'; return; }
  const mode = document.getElementById('payMode')?.value;
  const date = document.getElementById('payDate')?.value;
  const notes = document.getElementById('payNotes')?.value?.trim()||null;
  const {error} = await sb.from('payment_history').insert({booking_id:bkId,amount:amt,payment_mode:mode,payment_date:date,notes:notes});
  if (error) { document.getElementById('payErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  await recalcPaymentStatus(bkId);
  document.querySelector('.modal-overlay')?.remove();
  if (document.getElementById('editBkErr')) editBooking(bkId);
  else renderManageBookings();
}

async function addPaymentWithDate(bkId) { showPaymentModal(bkId); }

async function editPayment(payId, bkId) {
  const {data:pay} = await sb.from('payment_history').select('*').eq('id',payId).single();
  if (!pay) { alert('Not found'); return; }
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>✏️ Edit Payment</h2>
      <div class="form-group"><label>Amount ₹</label><input id="editPayAmt" type="number" value="${pay.amount}" /></div>
      <div class="form-group"><label>Mode</label>
        <select id="editPayMode">
          <option value="Cash" ${pay.payment_mode==='Cash'?'selected':''}>Cash</option>
          <option value="UPI" ${pay.payment_mode==='UPI'?'selected':''}>UPI</option>
          <option value="Bank" ${pay.payment_mode==='Bank'?'selected':''}>Bank</option>
          <option value="Airbnb Payout" ${pay.payment_mode==='Airbnb Payout'?'selected':''}>Airbnb Payout</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input id="editPayDate" type="date" value="${pay.payment_date||''}" /></div>
      <div class="form-group"><label>Notes</label><input id="editPayNotes" value="${pay.notes||''}" /></div>
      <button onclick="saveEditPayment(${payId},'${bkId}')" style="width:100%;margin-top:10px;">💾 Update</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveEditPayment(payId, bkId) {
  await sb.from('payment_history').update({
    amount:parseFloat(document.getElementById('editPayAmt')?.value)||0,
    payment_mode:document.getElementById('editPayMode')?.value,
    payment_date:document.getElementById('editPayDate')?.value||null,
    notes:document.getElementById('editPayNotes')?.value?.trim()||null
  }).eq('id',payId);
  await recalcPaymentStatus(bkId);
  document.querySelector('.modal-overlay')?.remove();
  editBooking(bkId);
}

async function delPayment(payId, bkId) {
  if (!confirm('Delete this payment?')) return;
  await sb.from('payment_history').delete().eq('id',payId);
  await recalcPaymentStatus(bkId);
  editBooking(bkId);
}

async function markFullyPaid(bkId) {
  const {data:b} = await sb.from('guest_register').select('total_amount').eq('booking_id',bkId).single();
  const {data:p} = await sb.from('payment_history').select('amount').eq('booking_id',bkId);
  const paid = (p||[]).reduce((s,x)=>s+(x.amount||0),0);
  const bal = (b?.total_amount||0)-paid;
  if (bal<=0) { alert('Already paid'); return; }
  showPaymentModal(bkId);
}

async function recalcPaymentStatus(bkId) {
  const {data:b} = await sb.from('guest_register').select('total_amount').eq('booking_id',bkId).single();
  const {data:p} = await sb.from('payment_history').select('amount').eq('booking_id',bkId);
  const paid = (p||[]).reduce((s,x)=>s+(x.amount||0),0);
  const st = paid>=(b?.total_amount||0)&&b?.total_amount>0?'Paid':(paid>0?'Partial':'Unpaid');
  await sb.from('guest_register').update({payment_status:st}).eq('booking_id',bkId);
}

// ============ DELETE BOOKING ============
async function delBooking(bkId, guestName, roomId) {
  if (!confirm(`Delete "${guestName}" booking?\nPayments + photos bhi delete hongi.`)) return;
  try {
    const {data:bk} = await sb.from('guest_register')
      .select('room_id, id_proof_photo_paths, id_proof_photo_path, id_proof_front_paths, id_proof_back_paths')
      .eq('booking_id',bkId).single();
    const allPaths = [bk?.id_proof_photo_paths,bk?.id_proof_photo_path,bk?.id_proof_front_paths,bk?.id_proof_back_paths].filter(Boolean).join(',').split(',').filter(Boolean);
    if (allPaths.length) { try { await sb.storage.from('id-proofs').remove(allPaths); } catch(e){} }
    const {error:payErr} = await sb.from('payment_history').delete().eq('booking_id',bkId);
    if (payErr) console.warn('Payment delete:', payErr.message);
    const {error:bkErr} = await sb.from('guest_register').delete().eq('booking_id',bkId);
    if (bkErr) { alert('❌ Delete failed: '+bkErr.message); return; }
    const rid = roomId||bk?.room_id;
    if (rid) {
      const today = new Date().toISOString().slice(0,10);
      const {data:active} = await sb.from('guest_register').select('booking_id').eq('room_id',rid).gt('check_out',today);
      if (!active||!active.length) await sb.from('flats_status').update({status:'Free'}).eq('room_id',rid);
    }
    alert('✅ Booking deleted');
    renderManageBookings();
  } catch(err) { alert('❌ Error: '+(err.message||err)); }
}

// ============ EDIT BOOKING ============
async function editBooking(bkId) {
  const {data:b} = await sb.from('guest_register').select('*').eq('booking_id',bkId).single();
  if (!b) { alert('Not found'); return; }
  const {data:rooms} = await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('room_id');
  const {data:pays} = await sb.from('payment_history').select('*').eq('booking_id',bkId).order('paid_at',{ascending:false});
  const tp=(pays||[]).reduce((s,p)=>s+(p.amount||0),0);
  const bal=(b.total_amount||0)-tp;

  // Build ID photo display
  const frontPaths = (b.id_proof_front_paths||'').split(',').filter(Boolean);
  const backPaths = (b.id_proof_back_paths||'').split(',').filter(Boolean);
  const allPaths = (b.id_proof_photo_paths||b.id_proof_photo_path||'').split(',').filter(Boolean);

  let idSlots = '';
  for (let i=1;i<=8;i++) {
    idSlots += `
      <div class="id-card" id="editIdSlot${i}" style="display:${i<=Math.max(b.guests||1,1)?'block':'none'};">
        <div class="id-card-title">👤 Guest ${i}</div>
        <div style="font-size:11px;margin:4px 0;">📄 Front</div>
        ${frontPaths[i-1]?`<button class="btn-sm outline" onclick="dlIdPhoto('${frontPaths[i-1]}')">📥 View Front</button>`:''} 
        <div class="id-card-btns">
          <button type="button" class="outline" onclick="document.getElementById('eFCam${i}').click()">📷 New</button>
          <button type="button" class="outline" onclick="document.getElementById('eFGal${i}').click()">🖼️ New</button>
        </div>
        <input type="file" id="eFCam${i}" accept="image/*" capture="environment" style="display:none;" />
        <input type="file" id="eFGal${i}" accept="image/*" style="display:none;" />
        <div style="font-size:11px;margin:4px 0;">📄 Back</div>
        ${backPaths[i-1]?`<button class="btn-sm outline" onclick="dlIdPhoto('${backPaths[i-1]}')">📥 View Back</button>`:''} 
        <div class="id-card-btns">
          <button type="button" class="outline" onclick="document.getElementById('eBCam${i}').click()">📷 New</button>
          <button type="button" class="outline" onclick="document.getElementById('eBGal${i}').click()">🖼️ New</button>
        </div>
        <input type="file" id="eBCam${i}" accept="image/*" capture="environment" style="display:none;" />
        <input type="file" id="eBGal${i}" accept="image/*" style="display:none;" />
      </div>`;
  }

  renderShell(`
    <div class="card"><h1>✏️ Edit Booking</h1><button class="secondary btn-sm" onclick="renderManageBookings()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Guest Name</label><input id="guestName" value="${b.guest_name||''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" value="${b.phone||''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>ID Type</label>
          <select id="idType">
            <option value="Aadhar" ${b.id_proof_type==='Aadhar'?'selected':''}>Aadhar</option>
            <option value="PAN" ${b.id_proof_type==='PAN'?'selected':''}>PAN</option>
            <option value="DL" ${b.id_proof_type==='DL'?'selected':''}>DL</option>
            <option value="Passport" ${b.id_proof_type==='Passport'?'selected':''}>Passport</option>
          </select>
        </div>
        <div class="form-group"><label>ID Number</label><input id="idNo" value="${b.id_proof_no||''}" /></div>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin:8px 0;">
        <div class="section-title">🪪 ID Photos (Front & Back)</div>
        <div class="id-grid">${idSlots}</div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="roomId">${(rooms||[]).map(r=>`<option value="${r.room_id}" ${r.room_id===b.room_id?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Mode</label>
          <select id="bookingMode" onchange="toggleEditSourceBox()">
            <option value="Offline" ${b.booking_mode!=='Online-Airbnb'?'selected':''}>Offline</option>
            <option value="Online-Airbnb" ${b.booking_mode==='Online-Airbnb'?'selected':''}>Online</option>
          </select>
        </div>
      </div>

      <div id="editSourceBox" style="display:${b.booking_mode==='Online-Airbnb'?'block':'none'};background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="form-group"><label>Source Listing</label>
          <select id="sourceRoomId"><option value="">Same</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${(b.source_room_id||b.room_id)===r.room_id?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}
          </select>
        </div>
      </div>
      ${b.parent_booking_id?`<div class="sub">Extension of: <code>${b.parent_booking_id}</code></div>`:''}

      <div class="form-grid">
        <div class="form-group"><label>Check-in Date</label><input id="checkIn" type="date" value="${b.check_in||''}" /></div>
        <div class="form-group"><label>Check-in Time</label><input id="checkInTime" type="time" value="${b.check_in_time||'14:00'}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Check-out Date</label><input id="checkOut" type="date" value="${b.check_out||''}" /></div>
        <div class="form-group"><label>Check-out Time</label><input id="checkOutTime" type="time" value="${b.check_out_time||'11:00'}" /></div>
      </div>
      <div class="form-group"><label>Checkout Confirmed?</label>
        <select id="checkoutConfirmed">
          <option value="yes" ${b.checkout_confirmed!==false?'selected':''}>Yes — Fixed</option>
          <option value="no" ${b.checkout_confirmed===false?'selected':''}>No — Per day</option>
        </select>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Guests</label><input id="guests" type="number" value="${b.guests||1}" /></div>
        <div class="form-group"><label>Per Day Rate ₹</label><input id="perDayRate" type="number" value="${b.per_day_rate||''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Total ₹</label><input id="totalAmount" type="number" value="${b.total_amount||0}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="paySt">
            <option value="Unpaid" ${b.payment_status==='Unpaid'?'selected':''}>Unpaid</option>
            <option value="Partial" ${b.payment_status==='Partial'?'selected':''}>Partial</option>
            <option value="Paid" ${b.payment_status==='Paid'?'selected':''}>Paid</option>
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Vehicle?</label>
          <select id="hasVehicle" onchange="toggleVehicle()">
            <option value="false" ${b.has_vehicle?'':'selected'}>No</option>
            <option value="true" ${b.has_vehicle?'selected':''}>Yes</option>
          </select>
        </div>
      </div>
      <div id="vehicleBox" style="display:${b.has_vehicle?'block':'none'};">
        <div class="form-grid">
          <div class="form-group"><label>Vehicle Name</label><input id="vehicleName" value="${b.vehicle_name||''}" /></div>
          <div class="form-group"><label>Registration No.</label><input id="vehicleNumber" value="${b.vehicle_number||''}" /></div>
        </div>
      </div>

      <div class="form-group"><label>Notes</label><textarea id="bkNotes">${b.notes||''}</textarea></div>
      <button onclick="updateBooking('${bkId}','${b.parent_booking_id||''}','${b.stay_group_id||b.booking_id}')">💾 Update</button>
      <div id="editBkErr"></div>
    </div>

    <div class="card">
      <div class="section-title">💳 Payment History</div>
      <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount||0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${tp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal>0?' warn':''}">₹${bal.toLocaleString('en-IN')}</span></div>

      ${(pays||[]).length?`<div class="table-wrap" style="margin-top:8px;"><table>
        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>${pays.map(p=>`<tr>
          <td>${p.payment_date||new Date(p.paid_at).toLocaleDateString('en-IN')}</td>
          <td>₹${(p.amount||0).toLocaleString('en-IN')}</td>
          <td>${p.payment_mode||'-'}</td>
          <td>${p.notes||'-'}</td>
          <td class="table-actions">
            <button class="btn-sm" onclick="editPayment(${p.id},'${bkId}')">✏️</button>
            <button class="btn-sm danger" onclick="delPayment(${p.id},'${bkId}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`:'<div class="sub">No payments yet</div>'}

      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-sm" onclick="showPaymentModal('${bkId}')">➕ Add Payment</button>
        <button class="btn-sm outline" onclick="createOfflineExtension('${bkId}')">➕ Extension</button>
        <button class="btn-sm outline" onclick="shareBookingWhatsApp('${bkId}')">📱 Share</button>
        ${bal>0?`<button class="btn-sm secondary" onclick="markFullyPaid('${bkId}')">✅ Mark Paid</button>`:''}
      </div>
    </div>`, 'bookings');
}

function toggleEditSourceBox() {
  const mode = document.getElementById('bookingMode')?.value;
  const box = document.getElementById('editSourceBox');
  if (box) box.style.display = mode==='Online-Airbnb'?'block':'none';
}

async function updateBooking(bkId, parentBookingId='', stayGroupId='') {
  const gn=document.getElementById('guestName').value.trim();
  const rid=document.getElementById('roomId').value;
  if (!gn||!rid) { document.getElementById('editBkErr').innerHTML='<div class="error">Name & property required</div>'; return; }
  const mode=document.getElementById('bookingMode').value;
  const sourceRoomId=mode==='Online-Airbnb'?(document.getElementById('sourceRoomId')?.value||rid):null;
  const ci=document.getElementById('checkIn').value;
  const co=document.getElementById('checkOut').value;
  const hasVehicle=document.getElementById('hasVehicle')?.value==='true';
  const vehicleName=hasVehicle?(document.getElementById('vehicleName')?.value.trim()||null):null;
  const vehicleNumber=hasVehicle?(document.getElementById('vehicleNumber')?.value.trim()||null):null;

  if (ci&&co) {
    const {data:ex} = await sb.from('guest_register').select('booking_id,guest_name,check_in,check_out').eq('room_id',rid).neq('booking_id',bkId);
    const clash = (ex||[]).find(b=>b.check_in&&b.check_out&&b.check_in<co&&b.check_out>ci);
    if (clash) { document.getElementById('editBkErr').innerHTML=`<div class="error">Clash: ${clash.guest_name}</div>`; return; }
  }

  // Upload new ID photos if any
  let newFrontPaths = null, newBackPaths = null, newAllPaths = null;
  const guestCount = parseInt(document.getElementById('guests')?.value)||1;
  const fArr = [], bArr = [], aArr = [];
  for (let i=1;i<=guestCount;i++) {
    const fCam=document.getElementById(`eFCam${i}`);
    const fGal=document.getElementById(`eFGal${i}`);
    const fFile=fCam?.files?.[0]||fGal?.files?.[0];
    if (fFile) {
      try { const comp=await compressImage(fFile); const path=`${bkId}/${Date.now()}_g${i}_front.jpg`;
        const {error}=await sb.storage.from('id-proofs').upload(path,comp,{contentType:'image/jpeg'});
        if (!error) { fArr.push(path); aArr.push(path); }
      } catch(e){}
    }
    const bCam=document.getElementById(`eBCam${i}`);
    const bGal=document.getElementById(`eBGal${i}`);
    const bFile=bCam?.files?.[0]||bGal?.files?.[0];
    if (bFile) {
      try { const comp=await compressImage(bFile); const path=`${bkId}/${Date.now()}_g${i}_back.jpg`;
        const {error}=await sb.storage.from('id-proofs').upload(path,comp,{contentType:'image/jpeg'});
        if (!error) { bArr.push(path); aArr.push(path); }
      } catch(e){}
    }
  }
  if (fArr.length) newFrontPaths = fArr.join(',');
  if (bArr.length) newBackPaths = bArr.join(',');
  if (aArr.length) newAllPaths = aArr.join(',');

  const obj = {
    guest_name:gn, phone:document.getElementById('guestPhone').value.trim()||null,
    id_proof_type:document.getElementById('idType').value||null,
    id_proof_no:document.getElementById('idNo').value.trim()||null,
    room_id:rid, source_room_id:sourceRoomId,
    parent_booking_id:parentBookingId||null, stay_group_id:stayGroupId||bkId,
    booking_mode:mode,
    check_in:ci||null, check_out:co||null,
    check_in_time:document.getElementById('checkInTime')?.value||'14:00',
    check_out_time:document.getElementById('checkOutTime')?.value||'11:00',
    checkout_confirmed:document.getElementById('checkoutConfirmed')?.value==='yes',
    guests:guestCount,
    per_day_rate:parseFloat(document.getElementById('perDayRate')?.value)||0,
    total_amount:parseFloat(document.getElementById('totalAmount').value)||0,
    payment_status:document.getElementById('paySt').value,
    has_vehicle:hasVehicle, vehicle_name:vehicleName, vehicle_number:vehicleNumber,
    notes:document.getElementById('bkNotes').value.trim()||null,
  };
  if (newFrontPaths) obj.id_proof_front_paths = newFrontPaths;
  if (newBackPaths) obj.id_proof_back_paths = newBackPaths;
  if (newAllPaths) obj.id_proof_photo_paths = newAllPaths;
  if (aArr.length) obj.id_proof_photo_path = aArr[0];

  const {error} = await sb.from('guest_register').update(obj).eq('booking_id',bkId);
  if (error) { document.getElementById('editBkErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  renderManageBookings();
}

// ============ EMPLOYEES ============
async function renderManageEmployees() {
  renderShell(`<div class="loading">Loading...</div>`, 'employees');
  const {data:emps} = await sb.from("employees").select("*").order("name");
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card"><h1>👥 Employees</h1><div class="sub">${(emps||[]).length} total</div>
      ${isO?`<button onclick="renderAddEmp()">➕ Add</button>`:''}</div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Properties</th><th>Salary</th><th>Status</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${(emps||[]).map(e=>`<tr>
        <td><strong>${e.name}</strong></td><td>${e.role||'-'}</td><td>${e.phone||'-'}</td>
        <td style="font-size:11px;">${e.assigned_rooms||'-'}</td>
        <td>₹${(e.monthly_salary||0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${e.status==='Active'?'green':'red'}">${e.status||'Active'}</span></td>
        ${isO?`<td class="table-actions"><button class="btn-sm" onclick="editEmp('${e.emp_id}')">✏️</button><button class="btn-sm danger" onclick="delEmp('${e.emp_id}','${e.name}')">🗑️</button></td>`:''}
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'employees');
}

async function renderAddEmp() {
  const {data:rooms} = await sb.from('rooms').select('room_id, nickname').order('room_id');
  renderShell(`<div class="card"><h1>➕ Add Employee</h1><button class="secondary btn-sm" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="eName" /></div>
        <div class="form-group"><label>Phone</label><input id="ePhone" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Role</label><input id="eRole" placeholder="Manager, Cleaner..." /></div>
        <div class="form-group"><label>Salary ₹</label><input id="eSal" type="number" /></div>
      </div>
      <div class="form-group"><label>Assigned Properties</label>
        <select id="eRooms" multiple style="min-height:120px;">
          ${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.room_id}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Join Date</label><input id="eJoin" type="date" /></div>
        <div class="form-group"><label>ID Type</label>
          <select id="eIdType"><option value="Aadhar">Aadhar</option><option value="PAN">PAN</option><option value="DL">DL</option><option value="Passport">Passport</option></select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>ID Number</label><input id="eIdNo" /></div>
        <div class="form-group"><label>Address</label><input id="eAddr" /></div>
      </div>
      <div class="form-group"><label>Emergency Contact</label><input id="eEmergency" /></div>
      <div class="form-grid">
        <div class="form-group"><label>ID Front Photo</label><input id="eIdFront" type="file" accept="image/*" /></div>
        <div class="form-group"><label>ID Back Photo</label><input id="eIdBack" type="file" accept="image/*" /></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0;"><input type="checkbox" id="eActive" checked /> Active</label>
      <button onclick="saveEmp()">💾 Save</button><div id="empErr"></div>
    </div>`, 'employees');
}

async function saveEmp() {
  const name=document.getElementById('eName').value.trim();
  if (!name) { document.getElementById('empErr').innerHTML='<div class="error">Name required</div>'; return; }
  const roomsSelect=document.getElementById('eRooms');
  const selectedRooms=roomsSelect?Array.from(roomsSelect.selectedOptions).map(o=>o.value).join(','):'';
  const {error} = await sb.from('employees').insert({
    emp_id:'E'+Date.now(), name, phone:document.getElementById('ePhone').value.trim()||null,
    role:document.getElementById('eRole').value.trim()||null,
    monthly_salary:parseFloat(document.getElementById('eSal').value)||0,
    joining_date:document.getElementById('eJoin').value||null,
    assigned_rooms:selectedRooms||null,
    id_proof_type:document.getElementById('eIdType').value||null,
    id_proof_no:document.getElementById('eIdNo').value.trim()||null,
    address:document.getElementById('eAddr').value.trim()||null,
    emergency_contact:document.getElementById('eEmergency').value.trim()||null,
    status:document.getElementById('eActive').checked?'Active':'Inactive',
  });
  if (error) { document.getElementById('empErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  renderManageEmployees();
}

async function editEmp(id) {
  const {data:e} = await sb.from('employees').select('*').eq('emp_id',id).single();
  if (!e) return;
  const {data:rooms} = await sb.from('rooms').select('room_id, nickname').order('room_id');
  const assignedArr=(e.assigned_rooms||'').split(',').map(s=>s.trim()).filter(Boolean);
  renderShell(`<div class="card"><h1>✏️ Edit Employee</h1><button class="secondary btn-sm" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name</label><input id="eName" value="${e.name}" /></div>
        <div class="form-group"><label>Phone</label><input id="ePhone" value="${e.phone||''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Role</label><input id="eRole" value="${e.role||''}" /></div>
        <div class="form-group"><label>Salary ₹</label><input id="eSal" type="number" value="${e.monthly_salary||0}" /></div>
      </div>
      <div class="form-group"><label>Assigned Properties</label>
        <select id="eRooms" multiple style="min-height:120px;">
          ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${assignedArr.includes(r.room_id)?'selected':''}>${r.nickname||r.room_id}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Join Date</label><input id="eJoin" type="date" value="${e.joining_date||''}" /></div>
        <div class="form-group"><label>ID Type</label>
          <select id="eIdType"><option value="Aadhar" ${e.id_proof_type==='Aadhar'?'selected':''}>Aadhar</option><option value="PAN" ${e.id_proof_type==='PAN'?'selected':''}>PAN</option><option value="DL" ${e.id_proof_type==='DL'?'selected':''}>DL</option><option value="Passport" ${e.id_proof_type==='Passport'?'selected':''}>Passport</option></select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>ID Number</label><input id="eIdNo" value="${e.id_proof_no||''}" /></div>
        <div class="form-group"><label>Address</label><input id="eAddr" value="${e.address||''}" /></div>
      </div>
      <div class="form-group"><label>Emergency Contact</label><input id="eEmergency" value="${e.emergency_contact||''}" /></div>
      <div class="form-grid">
        <div class="form-group"><label>ID Front Photo</label><input id="eIdFront" type="file" accept="image/*" /></div>
        <div class="form-group"><label>ID Back Photo</label><input id="eIdBack" type="file" accept="image/*" /></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0;"><input type="checkbox" id="eActive" ${e.status==='Active'?'checked':''} /> Active</label>
      <button onclick="updEmp('${id}')">💾 Update</button><div id="empErr"></div>
    </div>`, 'employees');
}

async function updEmp(id) {
  const name=document.getElementById('eName').value.trim();
  if (!name) { document.getElementById('empErr').innerHTML='<div class="error">Name required</div>'; return; }
  const roomsSelect=document.getElementById('eRooms');
  const selectedRooms=roomsSelect?Array.from(roomsSelect.selectedOptions).map(o=>o.value).join(','):'';
  await sb.from('employees').update({
    name, phone:document.getElementById('ePhone').value.trim()||null,
    role:document.getElementById('eRole').value.trim()||null,
    monthly_salary:parseFloat(document.getElementById('eSal').value)||0,
    joining_date:document.getElementById('eJoin').value||null,
    assigned_rooms:selectedRooms||null,
    id_proof_type:document.getElementById('eIdType').value||null,
    id_proof_no:document.getElementById('eIdNo').value.trim()||null,
    address:document.getElementById('eAddr').value.trim()||null,
    emergency_contact:document.getElementById('eEmergency').value.trim()||null,
    status:document.getElementById('eActive').checked?'Active':'Inactive',
  }).eq('emp_id',id);
  renderManageEmployees();
}

async function delEmp(id,name) {
  if (!confirm(`Delete "${name}" & all records?`)) return;
  await sb.from('employee_tasks').delete().eq('emp_id',id);
  await sb.from('attendance_log').delete().eq('emp_id',id);
  await sb.from('salary_tracker').delete().eq('emp_id',id);
  await sb.from('advance_tracker').delete().eq('emp_id',id);
  await sb.from('profiles').delete().eq('emp_id',id);
  await sb.from('employees').delete().eq('emp_id',id);
  renderManageEmployees();
}

// ============ TASKS ============
async function renderEmployeeTasks() {
  renderShell(`<div class="loading">Loading...</div>`, 'tasks');
  const {data:tasks} = await sb.from('employee_tasks').select('*, employees(name)').order('assigned_date',{ascending:false});
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card"><h1>🧰 Tasks</h1><div class="sub">${(tasks||[]).length} tasks</div>
      ${isO?`<button onclick="renderAddTask()">➕ Add</button>`:''}</div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Task</th><th>Date</th><th>Status</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${(tasks||[]).map(t=>`<tr>
        <td><strong>${t.employees?.name||t.emp_id}</strong></td><td>${t.task_description||'-'}</td><td>${t.assigned_date||'-'}</td>
        <td><span class="badge ${t.status==='Completed'?'green':t.status==='In Progress'?'yellow':'red'}">${t.status||'Pending'}</span></td>
        ${isO?`<td class="table-actions"><button class="btn-sm" onclick="editTask(${t.id})">✏️</button><button class="btn-sm danger" onclick="delTask(${t.id})">🗑️</button></td>`:''}
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'tasks');
}

async function renderAddTask() {
  const {data:emps} = await sb.from('employees').select('emp_id,name').eq('status','Active').order('name');
  renderShell(`<div class="card"><h1>➕ Task</h1><button class="secondary btn-sm" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Employee</label><select id="tEmp"><option value="">Select</option>${(emps||[]).map(e=>`<option value="${e.emp_id}">${e.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Task</label><textarea id="tDesc"></textarea></div>
      <div class="form-grid"><div class="form-group"><label>Date</label><input id="tDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div class="form-group"><label>Status</label><select id="tSt"><option>Pending</option><option>In Progress</option><option>Completed</option></select></div></div>
      <button onclick="saveTask()">💾 Save</button><div id="tErr"></div>
    </div>`, 'tasks');
}
async function saveTask() {
  const eid=document.getElementById('tEmp').value, desc=document.getElementById('tDesc').value.trim();
  if (!eid||!desc) { document.getElementById('tErr').innerHTML='<div class="error">Employee & task required</div>'; return; }
  await sb.from('employee_tasks').insert({emp_id:eid,task_description:desc,assigned_date:document.getElementById('tDate').value||null,status:document.getElementById('tSt').value});
  renderEmployeeTasks();
}
async function editTask(id) {
  const {data:t} = await sb.from('employee_tasks').select('*, employees(name)').eq('id',id).single();
  if (!t) return;
  renderShell(`<div class="card"><h1>✏️ Task</h1><button class="secondary btn-sm" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card"><div class="sub">${t.employees?.name||t.emp_id}</div>
      <div class="form-group"><label>Task</label><textarea id="tDesc">${t.task_description||''}</textarea></div>
      <div class="form-grid"><div class="form-group"><label>Date</label><input id="tDate" type="date" value="${t.assigned_date||''}" /></div>
      <div class="form-group"><label>Status</label><select id="tSt"><option ${t.status==='Pending'?'selected':''}>Pending</option><option ${t.status==='In Progress'?'selected':''}>In Progress</option><option ${t.status==='Completed'?'selected':''}>Completed</option></select></div></div>
      <button onclick="updTask(${id})">💾 Update</button></div>`, 'tasks');
}
async function updTask(id) { await sb.from('employee_tasks').update({task_description:document.getElementById('tDesc').value.trim(),assigned_date:document.getElementById('tDate').value||null,status:document.getElementById('tSt').value}).eq('id',id); renderEmployeeTasks(); }
async function delTask(id) { if(confirm('Delete?')) { await sb.from('employee_tasks').delete().eq('id',id); renderEmployeeTasks(); } }

// ============ ATTENDANCE ============
async function renderAttendance() {
  renderShell(`<div class="loading">Loading...</div>`, 'attendance');
  const today = new Date().toISOString().slice(0,10);
  const [{data:emps},{data:att}] = await Promise.all([
    sb.from('employees').select('emp_id,name,role').eq('status','Active').order('name'),
    sb.from('attendance_log').select('*').eq('att_date',today)
  ]);
  const am = {}; (att||[]).forEach(a=>{am[a.emp_id]=a.status;});
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card"><h1>📋 Attendance — ${today}</h1></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Role</th><th>Status</th>${isO?'<th>Mark</th>':''}</tr></thead>
      <tbody>${(emps||[]).map(e=>{const st=am[e.emp_id]||'Not Marked';return`<tr>
        <td><strong>${e.name}</strong></td>
        <td style="font-size:12px;">${e.role||'-'}</td>
        <td><span class="badge ${st==='Present'?'green':st==='Absent'?'red':'yellow'}">${st}</span></td>
        ${isO?`<td class="table-actions">
          <button class="btn-sm" onclick="markAtt('${e.emp_id}','Present')">✅</button>
          <button class="btn-sm danger" onclick="markAtt('${e.emp_id}','Absent')">❌</button>
          <button class="btn-sm secondary" onclick="markAtt('${e.emp_id}','Half Day')">½</button>
        </td>`:''}</tr>`;}).join('')}</tbody>
    </table></div></div>`, 'attendance');
}
async function markAtt(eid,st) {
  const today=new Date().toISOString().slice(0,10);
  const {data:ex}=await sb.from('attendance_log').select('id').eq('emp_id',eid).eq('att_date',today).single();
  if(ex) await sb.from('attendance_log').update({status:st}).eq('id',ex.id);
  else await sb.from('attendance_log').insert({emp_id:eid,att_date:today,status:st});
  renderAttendance();
}
async function renderAttendanceSummary() {
  renderShell(`<div class="loading">Loading...</div>`, 'att-summary');
  const cm = new Date().toISOString().slice(0,7);
  const [{data:emps},{data:logs}] = await Promise.all([
    sb.from('employees').select('emp_id,name,role').eq('status','Active').order('name'),
    sb.from('attendance_log').select('emp_id,status').like('att_date',`${cm}%`)
  ]);
  const sum = (emps||[]).map(e=>{
    const el=(logs||[]).filter(l=>l.emp_id===e.emp_id);
    const pr=el.filter(l=>l.status==='Present').length;
    const ab=el.filter(l=>l.status==='Absent').length;
    const hd=el.filter(l=>l.status==='Half Day').length;
    const tot=pr+ab+hd;
    return {...e,pr,ab,hd,pct:tot>0?((pr+hd*0.5)/tot*100).toFixed(1):'0'};
  });
  renderShell(`
    <div class="card"><h1>📅 Attendance — ${cm}</h1><button class="secondary btn-sm" onclick="renderAttendance()">📋 Daily</button></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Role</th><th>Present</th><th>Half</th><th>Absent</th><th>%</th></tr></thead>
      <tbody>${sum.map(s=>`<tr><td><strong>${s.name}</strong></td><td style="font-size:11px;">${s.role||'-'}</td>
        <td><span class="badge green">${s.pr}</span></td><td><span class="badge yellow">${s.hd}</span></td>
        <td><span class="badge ${s.ab>0?'red':'green'}">${s.ab}</span></td><td><strong>${s.pct}%</strong></td></tr>`).join('')}</tbody>
    </table></div></div>`, 'att-summary');
}

// ============ SALARY / ADVANCE / STORE / EXPENSES / PROPERTY REPORT / INVESTORS ============
// These remain the same as current — keeping them unchanged for stability
// If you need changes to these, let me know in next batch

async function renderSalaryTracker(){renderShell(`<div class="loading">Loading...</div>`,'salary');const{data:sals}=await sb.from('salary_tracker').select('*, employees(name)').order('month',{ascending:false});const isO=SESSION.role==='owner';renderShell(`<div class="card"><h1>💰 Salary</h1>${isO?`<button onclick="renderAddSal()">➕ Add</button>`:''}</div><div class="card"><div class="table-wrap"><table><thead><tr><th>Employee</th><th>Month</th><th>Due</th><th>Paid</th><th>Balance</th>${isO?'<th>Actions</th>':''}</tr></thead><tbody>${(sals||[]).map(s=>{const b2=(s.salary_due||0)-(s.salary_paid||0);return`<tr><td><strong>${s.employees?.name||s.emp_id}</strong></td><td>${s.month||'-'}</td><td>₹${(s.salary_due||0).toLocaleString('en-IN')}</td><td>₹${(s.salary_paid||0).toLocaleString('en-IN')}</td><td><span class="${b2>0?'metric-value warn':''}">₹${b2.toLocaleString('en-IN')}</span></td>${isO?`<td class="table-actions"><button class="btn-sm" onclick="editSal(${s.id})">✏️</button><button class="btn-sm danger" onclick="delSal(${s.id})">🗑️</button></td>`:''}</tr>`;}).join('')}</tbody></table></div></div>`,'salary');}
async function renderAddSal(){const{data:emps}=await sb.from('employees').select('emp_id,name,monthly_salary').eq('status','Active').order('name');window._salCache=emps||[];renderShell(`<div class="card"><h1>➕ Salary</h1><button class="secondary btn-sm" onclick="renderSalaryTracker()">← Back</button></div><div class="card"><div class="form-group"><label>Employee</label><select id="sEmp" onchange="onSalEmpChg()"><option value="">Select</option>${(emps||[]).map(e=>`<option value="${e.emp_id}">${e.name}</option>`).join('')}</select></div><div id="sInfo" class="sub"></div><div class="form-grid"><div class="form-group"><label>Month</label><input id="sMo" type="month" value="${new Date().toISOString().slice(0,7)}" /></div><div class="form-group"><label>Due ₹</label><input id="sDue" type="number" /></div></div><div class="form-grid"><div class="form-group"><label>Paid ₹</label><input id="sPaid" type="number" /></div><div class="form-group"><label>Date</label><input id="sDate" type="date" /></div></div><div class="form-group"><label>Mode</label><input id="sMode" placeholder="Cash/UPI/Bank" /></div><button onclick="saveSal()">💾 Save</button><div id="salErr"></div></div>`,'salary');}
function onSalEmpChg(){const e=(window._salCache||[]).find(x=>x.emp_id===document.getElementById('sEmp').value);if(e){document.getElementById('sInfo').innerHTML=`💡 Salary: ₹${(e.monthly_salary||0).toLocaleString('en-IN')}`;document.getElementById('sDue').value=e.monthly_salary||0;}}
async function saveSal(){const eid=document.getElementById('sEmp').value,mo=document.getElementById('sMo').value;if(!eid||!mo){document.getElementById('salErr').innerHTML='<div class="error">Employee & month required</div>';return;}await sb.from('salary_tracker').insert({emp_id:eid,month:mo,salary_due:parseFloat(document.getElementById('sDue').value)||0,salary_paid:parseFloat(document.getElementById('sPaid').value)||0,payment_date:document.getElementById('sDate').value||null,payment_mode:document.getElementById('sMode').value.trim()||null});renderSalaryTracker();}
async function editSal(id){const{data:s}=await sb.from('salary_tracker').select('*, employees(name)').eq('id',id).single();if(!s)return;renderShell(`<div class="card"><h1>✏️ Salary</h1><button class="secondary btn-sm" onclick="renderSalaryTracker()">← Back</button></div><div class="card"><div class="sub">${s.employees?.name||s.emp_id}</div><div class="form-grid"><div class="form-group"><label>Month</label><input id="sMo" type="month" value="${s.month||''}" /></div><div class="form-group"><label>Due</label><input id="sDue" type="number" value="${s.salary_due||0}" /></div></div><div class="form-grid"><div class="form-group"><label>Paid</label><input id="sPaid" type="number" value="${s.salary_paid||0}" /></div><div class="form-group"><label>Date</label><input id="sDate" type="date" value="${s.payment_date||''}" /></div></div><div class="form-group"><label>Mode</label><input id="sMode" value="${s.payment_mode||''}" /></div><button onclick="updSal(${id})">💾 Update</button></div>`,'salary');}
async function updSal(id){await sb.from('salary_tracker').update({month:document.getElementById('sMo').value,salary_due:parseFloat(document.getElementById('sDue').value)||0,salary_paid:parseFloat(document.getElementById('sPaid').value)||0,payment_date:document.getElementById('sDate').value||null,payment_mode:document.getElementById('sMode').value.trim()||null}).eq('id',id);renderSalaryTracker();}
async function delSal(id){if(confirm('Delete?')){await sb.from('salary_tracker').delete().eq('id',id);renderSalaryTracker();}}

async function renderAdvanceTracker(){renderShell(`<div class="loading">Loading...</div>`,'advance');const{data:advs}=await sb.from('advance_tracker').select('*, employees(name)').order('date_given',{ascending:false});const isO=SESSION.role==='owner';renderShell(`<div class="card"><h1>💵 Advance</h1>${isO?`<button onclick="renderAddAdv()">➕ Add</button>`:''}</div><div class="card"><div class="table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>Amount</th><th>Repaid</th><th>Balance</th><th>Reason</th>${isO?'<th>Actions</th>':''}</tr></thead><tbody>${(advs||[]).map(a=>{const b2=(a.advance_amount||0)-(a.repaid_amount||0);return`<tr><td><strong>${a.employees?.name||a.emp_id}</strong></td><td>${a.date_given||'-'}</td><td>₹${(a.advance_amount||0).toLocaleString('en-IN')}</td><td>₹${(a.repaid_amount||0).toLocaleString('en-IN')}</td><td><span class="${b2>0?'metric-value warn':''}">₹${b2.toLocaleString('en-IN')}</span></td><td>${a.reason||'-'}</td>${isO?`<td class="table-actions"><button class="btn-sm" onclick="editAdv(${a.id})">✏️</button><button class="btn-sm danger" onclick="delAdv(${a.id})">🗑️</button></td>`:''}</tr>`;}).join('')}</tbody></table></div></div>`,'advance');}
async function renderAddAdv(){const{data:emps}=await sb.from('employees').select('emp_id,name').eq('status','Active').order('name');renderShell(`<div class="card"><h1>➕ Advance</h1><button class="secondary btn-sm" onclick="renderAdvanceTracker()">← Back</button></div><div class="card"><div class="form-group"><label>Employee</label><select id="aEmp"><option value="">Select</option>${(emps||[]).map(e=>`<option value="${e.emp_id}">${e.name}</option>`).join('')}</select></div><div class="form-grid"><div class="form-group"><label>Date</label><input id="aDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div><div class="form-group"><label>Amount ₹</label><input id="aAmt" type="number" /></div></div><div class="form-group"><label>Reason</label><input id="aReason" /></div><button onclick="saveAdv()">💾 Save</button><div id="advErr"></div></div>`,'advance');}
async function saveAdv(){const eid=document.getElementById('aEmp').value;const amt=parseFloat(document.getElementById('aAmt').value)||0;if(!eid||amt<=0){document.getElementById('advErr').innerHTML='<div class="error">Employee & amount required</div>';return;}await sb.from('advance_tracker').insert({emp_id:eid,date_given:document.getElementById('aDate').value||null,advance_amount:amt,repaid_amount:0,reason:document.getElementById('aReason').value.trim()||null});renderAdvanceTracker();}
async function editAdv(id){const{data:a}=await sb.from('advance_tracker').select('*, employees(name)').eq('id',id).single();if(!a)return;renderShell(`<div class="card"><h1>✏️ Advance</h1><button class="secondary btn-sm" onclick="renderAdvanceTracker()">← Back</button></div><div class="card"><div class="sub">${a.employees?.name||a.emp_id}</div><div class="form-grid"><div class="form-group"><label>Date</label><input id="aDate" type="date" value="${a.date_given||''}" /></div><div class="form-group"><label>Amount</label><input id="aAmt" type="number" value="${a.advance_amount||0}" /></div></div><div class="form-grid"><div class="form-group"><label>Repaid</label><input id="aRep" type="number" value="${a.repaid_amount||0}" /></div><div class="form-group"><label>Reason</label><input id="aReason" value="${a.reason||''}" /></div></div><button onclick="updAdv(${id})">💾 Update</button></div>`,'advance');}
async function updAdv(id){await sb.from('advance_tracker').update({date_given:document.getElementById('aDate').value||null,advance_amount:parseFloat(document.getElementById('aAmt').value)||0,repaid_amount:parseFloat(document.getElementById('aRep').value)||0,reason:document.getElementById('aReason').value.trim()||null}).eq('id',id);renderAdvanceTracker();}
async function delAdv(id){if(confirm('Delete?')){await sb.from('advance_tracker').delete().eq('id',id);renderAdvanceTracker();}}

// Store
async function renderStore(){renderShell(`<div class="loading">Loading...</div>`,'store');const[{data:items},{data:txns}]=await Promise.all([sb.from('store_items').select('*').order('item_name'),sb.from('stock_transactions').select('*, store_items(item_name,unit), rooms(unit_no)').order('txn_date',{ascending:false}).limit(50)]);const sm={};(txns||[]).forEach(t=>{sm[t.item_id]=(sm[t.item_id]||0)+(t.txn_type==='In'?(t.quantity||0):-(t.quantity||0));});renderShell(`<div class="card"><h1>📦 Store</h1><div class="btn-row"><button onclick="renderAddItem()">➕ Item</button><button class="secondary" onclick="renderAddTxn()">🔄 Stock In/Out</button></div></div><div class="card"><div class="section-title">Items</div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Reorder</th></tr></thead><tbody>${(items||[]).map(i=>{const s=sm[i.item_id]||0;return`<tr><td><strong>${i.item_name}</strong></td><td>${i.category||'-'}</td><td><span class="${s<=(i.reorder_level||0)?'metric-value warn':''}">${s}</span></td><td>${i.reorder_level||0}</td></tr>`;}).join('')}</tbody></table></div></div><div class="card"><div class="section-title">Recent</div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Cost</th></tr></thead><tbody>${(txns||[]).map(t=>`<tr><td>${t.txn_date}</td><td>${t.store_items?.item_name||t.item_id}</td><td><span class="badge ${t.txn_type==='In'?'green':'yellow'}">${t.txn_type}</span></td><td>${t.quantity}</td><td>₹${(t.cost||0).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table></div></div>`,'store');}
async function renderAddItem(){renderShell(`<div class="card"><h1>➕ Item</h1><button class="secondary btn-sm" onclick="renderStore()">← Back</button></div><div class="card"><div class="form-group"><label>Name</label><input id="iName" /></div><div class="form-grid"><div class="form-group"><label>Category</label><select id="iCat"><option>Linen</option><option>Toiletries</option><option>Cleaning</option><option>Electronics</option><option>Other</option></select></div><div class="form-group"><label>Unit</label><input id="iUnit" placeholder="pcs/kg" /></div></div><div class="form-group"><label>Reorder Level</label><input id="iReorder" type="number" value="0" /></div><button onclick="saveItem()">💾 Save</button><div id="iErr"></div></div>`,'store');}
async function saveItem(){const name=document.getElementById('iName').value.trim();if(!name){document.getElementById('iErr').innerHTML='<div class="error">Name required</div>';return;}await sb.from('store_items').insert({item_id:'ITM'+Date.now(),item_name:name,category:document.getElementById('iCat').value,unit:document.getElementById('iUnit').value.trim()||null,reorder_level:parseFloat(document.getElementById('iReorder').value)||0});renderStore();}
async function renderAddTxn(){const[{data:items},{data:rooms}]=await Promise.all([sb.from('store_items').select('item_id,item_name').order('item_name'),sb.from('rooms').select('room_id,unit_no').order('room_id')]);renderShell(`<div class="card"><h1>🔄 Stock</h1><button class="secondary btn-sm" onclick="renderStore()">← Back</button></div><div class="card"><div class="form-group"><label>Item</label><select id="txItem"><option value="">Select</option>${(items||[]).map(i=>`<option value="${i.item_id}">${i.item_name}</option>`).join('')}</select></div><div class="form-group"><label>Property</label><select id="txRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.unit_no}</option>`).join('')}</select></div><div class="form-grid"><div class="form-group"><label>Type</label><select id="txType"><option value="In">In</option><option value="Out">Out</option></select></div><div class="form-group"><label>Qty</label><input id="txQty" type="number" /></div></div><div class="form-grid"><div class="form-group"><label>Cost ₹</label><input id="txCost" type="number" /></div><div class="form-group"><label>Date</label><input id="txDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div></div><button onclick="saveTxn()">💾 Save</button><div id="txErr"></div></div>`,'store');}
async function saveTxn(){const iid=document.getElementById('txItem').value,qty=parseFloat(document.getElementById('txQty').value)||0;if(!iid||qty<=0){document.getElementById('txErr').innerHTML='<div class="error">Item & qty required</div>';return;}await sb.from('stock_transactions').insert({item_id:iid,room_id:document.getElementById('txRoom').value||null,txn_type:document.getElementById('txType').value,quantity:qty,cost:parseFloat(document.getElementById('txCost').value)||0,txn_date:document.getElementById('txDate').value||null});renderStore();}

// Expenses
async function renderExpenses(){renderShell(`<div class="loading">Loading...</div>`,'expenses');const cm=new Date().toISOString().slice(0,7);const ml=new Date().toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');const[{data:cats},{data:exps},{data:gs}]=await Promise.all([sb.from('expense_categories').select('*').order('category_name'),sb.from('expenses').select('*, expense_categories(category_name)').order('entry_date',{ascending:false}),sb.from('guest_register').select('booking_id,check_in,total_amount')]);const pm=await getPaidMap((gs||[]).map(g=>g.booking_id));const inc=(gs||[]).filter(g=>g.check_in?.startsWith(cm)).reduce((s,g)=>s+(pm[g.booking_id]||0),0);const mexp=(exps||[]).filter(e=>e.month===ml).reduce((s,e)=>s+(e.amount||0),0);const profit=inc-mexp;renderShell(`<div class="card"><h1>💹 P&L (Profit & Loss)</h1><div class="sub">${ml}</div><div class="btn-row"><button onclick="renderAddExpCat()">➕ Category</button><button class="secondary" onclick="renderAddExpEntry()">🧾 Log</button></div></div><div class="card"><div class="metric-row"><span class="metric-label">Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${mexp.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div></div><div class="card"><div class="section-title">Categories</div><div class="table-wrap"><table><thead><tr><th>Category</th><th>Default ₹</th></tr></thead><tbody>${(cats||[]).map(c=>`<tr><td>${c.category_name}</td><td>₹${(c.default_monthly_amount||0).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="2" class="sub">None</td></tr>'}</tbody></table></div></div><div class="card"><div class="section-title">Entries</div><div class="table-wrap"><table><thead><tr><th>Month</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead><tbody>${(exps||[]).map(e=>`<tr><td>${e.month||'-'}</td><td>${e.expense_categories?.category_name||'-'}</td><td>₹${(e.amount||0).toLocaleString('en-IN')}</td><td>${e.entry_date||'-'}</td></tr>`).join('')||'<tr><td colspan="4" class="sub">None</td></tr>'}</tbody></table></div></div>`,'expenses');}
async function renderAddExpCat(){renderShell(`<div class="card"><h1>➕ Category</h1><button class="secondary btn-sm" onclick="renderExpenses()">← Back</button></div><div class="card"><div class="form-group"><label>Name</label><input id="cName" /></div><div class="form-group"><label>Default Monthly ₹</label><input id="cAmt" type="number" /></div><button onclick="saveExpCat()">💾 Save</button><div id="cErr"></div></div>`,'expenses');}
async function saveExpCat(){const name=document.getElementById('cName').value.trim();if(!name){document.getElementById('cErr').innerHTML='<div class="error">Name required</div>';return;}await sb.from('expense_categories').insert({category_id:'EXP'+Date.now(),category_name:name,default_monthly_amount:parseFloat(document.getElementById('cAmt').value)||null});renderExpenses();}
async function renderAddExpEntry(){const[{data:cats},{data:rooms}]=await Promise.all([sb.from('expense_categories').select('*').order('category_name'),sb.from('rooms').select('room_id,unit_no,nickname').order('unit_no')]);window._expCats=cats||[];const ml=new Date().toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');renderShell(`<div class="card"><h1>🧾 Log Expense</h1><button class="secondary btn-sm" onclick="renderExpenses()">← Back</button></div><div class="card"><div class="form-group"><label>Category</label><select id="exCat" onchange="onExpCatChg()"><option value="">Select</option>${(cats||[]).map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join('')}</select></div><div id="exCatInfo" class="sub"></div><div class="form-group"><label>Property</label><select id="exRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}</select></div><div class="form-grid"><div class="form-group"><label>Month</label><input id="exMo" value="${ml}" /></div><div class="form-group"><label>Amount ₹</label><input id="exAmt" type="number" /></div></div><div class="form-group"><label>Date</label><input id="exDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div><button onclick="saveExpEntry()">💾 Save</button><div id="exErr"></div></div>`,'expenses');}
function onExpCatChg(){const c=(window._expCats||[]).find(x=>x.category_id===document.getElementById('exCat').value);if(c?.default_monthly_amount){document.getElementById('exCatInfo').innerHTML=`💡 Default: ₹${c.default_monthly_amount.toLocaleString('en-IN')}`;document.getElementById('exAmt').value=c.default_monthly_amount;}else document.getElementById('exCatInfo').innerHTML='';}
async function saveExpEntry(){const cid=document.getElementById('exCat').value,mo=document.getElementById('exMo').value.trim(),amt=parseFloat(document.getElementById('exAmt').value)||0;if(!cid||!mo||amt<=0){document.getElementById('exErr').innerHTML='<div class="error">Category, month & amount required</div>';return;}await sb.from('expenses').insert({category_id:cid,room_id:document.getElementById('exRoom').value||null,month:mo,amount:amt,entry_date:document.getElementById('exDate').value||null});renderExpenses();}

// Property Report
async function renderPropertyReport(roomId,range='Month'){renderShell(`<div class="loading">Loading...</div>`,'property-report');const{data:rooms}=await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('unit_no');const sel=roomId||rooms?.[0]?.room_id;if(!sel){renderShell(`<div class="card"><h1>🏘️ No properties</h1></div>`,'property-report');return;}const now=new Date();let s,e,label;if(range==='Month'){s=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);e=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);label=now.toLocaleString('en-IN',{month:'long',year:'numeric'});}else if(range==='Quarter'){const q=Math.floor(now.getMonth()/3);s=new Date(now.getFullYear(),q*3,1).toISOString().slice(0,10);e=new Date(now.getFullYear(),q*3+3,0).toISOString().slice(0,10);label=`Q${q+1} ${now.getFullYear()}`;}else{s=`${now.getFullYear()}-01-01`;e=`${now.getFullYear()}-12-31`;label=`${now.getFullYear()}`;}const ml=now.toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');const[{data:gs},{data:exs}]=await Promise.all([sb.from('guest_register').select('*').eq('room_id',sel).gte('check_in',s).lte('check_in',e),sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',sel).eq('month',ml)]);const pm=await getPaidMap((gs||[]).map(g=>g.booking_id));const onRev=(gs||[]).filter(g=>g.booking_mode==='Online-Airbnb').reduce((a,g)=>a+(pm[g.booking_id]||0),0);const offRev=(gs||[]).filter(g=>g.booking_mode!=='Online-Airbnb').reduce((a,g)=>a+(pm[g.booking_id]||0),0);const totRev=onRev+offRev,totExp=(exs||[]).reduce((a,e2)=>a+(e2.amount||0),0),profit=totRev-totExp;const room=rooms.find(r=>r.room_id===sel);renderShell(`<div class="card"><h1>🏘️ Property Report</h1><div class="form-group"><select id="rpRoom">${rooms.map(r=>`<option value="${r.room_id}" ${r.room_id===sel?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}</select></div><div class="btn-row"><button class="${range==='Month'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Month')">Month</button><button class="${range==='Quarter'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Quarter')">Quarter</button><button class="${range==='Year'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Year')">Year</button></div></div><div class="card"><div class="sub">${room?.property_name||''} — ${label}</div><div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${totRev.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${totExp.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div></div>`,'property-report');document.getElementById('rpRoom').onchange=e2=>renderPropertyReport(e2.target.value,range);}

// Investors - keeping existing logic
async function renderManageInvestors(){renderShell(`<div class="loading">Loading...</div>`,'investors');const[{data:invs},{data:links},{data:rooms}]=await Promise.all([sb.from('investors').select('*').order('name'),sb.from('investor_properties').select('*, investors(name), rooms(unit_no,property_name,nickname)'),sb.from('rooms').select('room_id,unit_no,property_name,nickname').order('room_id')]);window._invRooms=rooms||[];const invPropMap={};(links||[]).forEach(l=>{const iid=l.investor_id;if(!invPropMap[iid])invPropMap[iid]=[];invPropMap[iid].push(l);});renderShell(`<div class="card"><h1>🧑‍💼 Investors</h1><div class="sub">${(invs||[]).length} investors</div><div class="btn-row"><button onclick="renderAddInv()">➕ Add Investor</button><button class="secondary" onclick="renderLinkProp()">🔗 Link Property</button></div></div><div class="card"><div class="section-title">All Investors</div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Share %</th><th>Properties</th><th>Report</th></tr></thead><tbody>${(invs||[]).map(i=>{const iLinks=invPropMap[i.investor_id]||[];const propNames=iLinks.map(l=>l.rooms?.nickname||l.room_id).join(', ')||'-';return`<tr><td><strong>${i.name}</strong></td><td>${i.phone||'-'}</td><td><span class="badge green">${i.revenue_share_pct||70}%</span></td><td style="font-size:12px;">${propNames}</td><td class="table-actions">${iLinks.map(l=>`<button class="btn-sm" onclick="renderInvestorReport('${i.investor_id}','${l.room_id}')">📊</button>`).join('')||'-'}</td></tr>`;}).join('')}</tbody></table></div></div><div class="card"><div class="section-title">Property Mapping</div><div class="table-wrap"><table><thead><tr><th>Property</th><th>Investor</th><th>Remove</th></tr></thead><tbody>${(links||[]).map(l=>`<tr><td><strong>${l.rooms?.nickname||l.room_id}</strong></td><td>${l.investors?.name||l.investor_id}</td><td><button class="btn-sm danger" onclick="unlinkProperty('${l.investor_id}','${l.room_id}')">🗑️</button></td></tr>`).join('')}</tbody></table></div></div>`,'investors');}
async function unlinkProperty(inv,room){if(!confirm('Remove?'))return;await sb.from('investor_properties').delete().eq('investor_id',inv).eq('room_id',room);renderManageInvestors();}
async function renderAddInv(){const{data:rooms}=await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');renderShell(`<div class="card"><h1>➕ Add Investor</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button></div><div class="card"><div class="section-title">Investor Details</div><div class="form-grid"><div class="form-group"><label>Name *</label><input id="invName" placeholder="e.g. Papa Ammi" /></div><div class="form-group"><label>Phone</label><input id="invPhone" type="tel" /></div></div><div class="form-grid"><div class="form-group"><label>Revenue Share %</label><input id="invShare" type="number" value="70" /></div><div class="form-group"><label>Email</label><input id="invEmail" type="email" placeholder="investor@gmail.com" /></div></div><div class="form-group"><label>Assign Properties</label><select id="invRooms" multiple style="min-height:120px;">${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}</select></div><div class="form-group"><label>Notes</label><textarea id="invNotes"></textarea></div><button onclick="saveInvSafe()" style="width:100%;margin-top:12px;padding:14px;">💾 Save Investor</button><div id="invErr"></div></div>`,'investors');}
async function saveInvSafe(){const btn=document.querySelector('button[onclick="saveInvSafe()"]');if(btn){btn.disabled=true;btn.textContent='⏳ Saving...';}const name=document.getElementById('invName').value.trim();const phone=document.getElementById('invPhone').value.trim();const share=parseFloat(document.getElementById('invShare').value)||70;const email=document.getElementById('invEmail').value.trim();const notes=document.getElementById('invNotes').value.trim();const roomsSelect=document.getElementById('invRooms');const selectedRooms=roomsSelect?Array.from(roomsSelect.selectedOptions).map(o=>o.value):[];if(!name){document.getElementById('invErr').innerHTML='<div class="error">Name required</div>';if(btn){btn.disabled=false;btn.textContent='💾 Save Investor';}return;}try{const investorId='INV'+Date.now();const{error:invError}=await sb.from('investors').insert({investor_id:investorId,name,phone:phone||null,revenue_share_pct:share,notes:[notes,email?`Login Email: ${email}`:''].filter(Boolean).join(' | ')||null});if(invError)throw new Error(invError.message);if(selectedRooms.length>0){const links=selectedRooms.map(rid=>({investor_id:investorId,room_id:rid}));const{error:linkError}=await sb.from('investor_properties').insert(links);if(linkError)throw new Error(linkError.message);}renderShell(`<div class="card" style="text-align:center;"><div style="font-size:48px;margin-bottom:10px;">✅</div><h1>Investor Added</h1></div><div class="card"><div class="metric-row"><span class="metric-label">Name</span><span class="metric-value">${name}</span></div><div class="metric-row"><span class="metric-label">Share</span><span>${share}%</span></div><div class="metric-row"><span class="metric-label">ID</span><code>${investorId}</code></div></div><div class="card"><div class="btn-row"><button class="secondary" onclick="renderManageInvestors()">← Back</button></div></div>`,'investors');}catch(err){document.getElementById('invErr').innerHTML=`<div class="error">${err.message}</div>`;if(btn){btn.disabled=false;btn.textContent='💾 Save Investor';}}}
async function renderLinkProp(){const{data:invs}=await sb.from('investors').select('investor_id,name').order('name');renderShell(`<div class="card"><h1>🔗 Link</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button></div><div class="card"><div class="form-group"><label>Investor</label><select id="lInv"><option value="">Select</option>${(invs||[]).map(i=>`<option value="${i.investor_id}">${i.name}</option>`).join('')}</select></div><div class="form-group"><label>Property</label><select id="lRoom"><option value="">Select</option>${(window._invRooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}</select></div><button onclick="saveLink()">💾 Link</button><div id="lErr"></div></div>`,'investors');}
async function saveLink(){const inv=document.getElementById('lInv').value,room=document.getElementById('lRoom').value;if(!inv||!room){document.getElementById('lErr').innerHTML='<div class="error">Both required</div>';return;}await sb.from('investor_properties').insert({investor_id:inv,room_id:room});renderManageInvestors();}

// Investor Report (keeping existing)
async function renderInvestorReport(investorId,roomId,month){renderShell(`<div class="loading">Generating...</div>`,'investors');const now=new Date();const selMonth=month||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const monthLabel=new Date(selMonth+'-01').toLocaleString('en-IN',{month:'long',year:'numeric'});const monthStart=selMonth+'-01';const monthEnd=new Date(parseInt(selMonth.split('-')[0]),parseInt(selMonth.split('-')[1]),0).toISOString().slice(0,10);const[{data:inv},{data:room},{data:bookings},{data:defaults},{data:expenses},{data:payments}]=await Promise.all([sb.from('investors').select('*').eq('investor_id',investorId).single(),sb.from('rooms').select('*').eq('room_id',roomId).single(),sb.from('guest_register').select('*').eq('room_id',roomId).gte('check_in',monthStart).lte('check_in',monthEnd),sb.from('property_default_expenses').select('*').eq('room_id',roomId).order('expense_name'),sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',roomId),sb.from('payment_history').select('booking_id, amount')]);const share=inv?.revenue_share_pct||70;const cs=100-share;const bkIds=(bookings||[]).map(b=>b.booking_id);const pm={};(payments||[]).forEach(p=>{if(bkIds.includes(p.booking_id))pm[p.booking_id]=(pm[p.booking_id]||0)+(p.amount||0);});const cn=b=>b.check_in&&b.check_out?Math.max(Math.round((new Date(b.check_out)-new Date(b.check_in))/864e5),0):0;const onBks=(bookings||[]).filter(b=>b.booking_mode==='Online-Airbnb');const offBks=(bookings||[]).filter(b=>b.booking_mode!=='Online-Airbnb');const onRev=onBks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);const offRev=offBks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);const totalRev=onRev+offRev;const expMonth=new Date(selMonth+'-01').toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');const mExp=(expenses||[]).filter(e=>e.month===expMonth);const useDefaults=mExp.length===0;const effectiveExp=useDefaults?(defaults||[]).reduce((s,d)=>s+(d.default_amount||0),0):mExp.reduce((s,e)=>s+(e.amount||0),0);const profit=totalRev-effectiveExp;const investorAmount=Math.round(profit*share/100);const companyAmount=profit-investorAmount;const months=[];for(let i=0;i<12;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({val:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,lbl:d.toLocaleString('en-IN',{month:'short',year:'numeric'})});}renderShell(`<div class="card"><h1>📊 Investor Report</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button><div class="form-grid"><div class="form-group"><label>Month</label><select id="rptMonth" onchange="renderInvestorReport('${investorId}','${roomId}',this.value)">${months.map(m=>`<option value="${m.val}" ${m.val===selMonth?'selected':''}>${m.lbl}</option>`).join('')}</select></div><div class="form-group" style="justify-content:flex-end;"><button class="btn-sm" onclick="window.print()">🖨️ Print</button></div></div></div><div class="card" style="background:var(--dark);color:#fff;text-align:center;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);">Monthly Investor Report</div><h1 style="color:#fff;margin:6px 0;">${BRAND}</h1><div style="font-size:13px;color:rgba(255,255,255,0.8);">${monthLabel}</div></div><div class="card"><div class="section-title">Property</div><div class="metric-row"><span class="metric-label">Property</span><span style="font-weight:600;">${room?.nickname||'-'}</span></div><div class="metric-row"><span class="metric-label">Owner</span><span style="font-weight:600;">${inv?.name||'-'}</span></div><div class="metric-row"><span class="metric-label">Share</span><span>${share}% / ${cs}%</span></div></div><div class="card"><div class="section-title">Financial</div><div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${totalRev.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${effectiveExp.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">${inv?.name} (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${investorAmount.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">${BRAND} (${cs}%)</span><span class="metric-value">₹${companyAmount.toLocaleString('en-IN')}</span></div></div><div class="card"><div class="section-title">Bookings</div><div class="table-wrap"><table><thead><tr><th>Guest</th><th>Mode</th><th>In</th><th>Out</th><th>Nights</th><th>₹</th></tr></thead><tbody>${(bookings||[]).map(b=>`<tr><td>${b.guest_name||'-'}</td><td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'On':'Off'}</span></td><td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td><td>${cn(b)}</td><td>₹${(pm[b.booking_id]||0).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="6" class="sub">None</td></tr>'}</tbody></table></div></div><div class="card" style="text-align:center;font-size:12px;color:var(--muted);">Prepared By: <strong>NISHA KHAN</strong><br>${BRAND} · ${new Date().toLocaleDateString('en-IN')}</div>`,'investors');}

// ============ MAINTENANCE LOG ============
async function renderMaintenanceLog() {
  renderShell(`<div class="loading">Loading...</div>`, 'maintenance');
  const {data:logs} = await sb.from('maintenance_log').select('*, rooms:room_id(nickname, unit_no)').order('reported_date', {ascending:false});
  const isO = SESSION.role==='owner';

  renderShell(`
    <div class="card">
      <h1>🔧 Maintenance Log</h1>
      <div class="sub">${(logs||[]).length} entries</div>
      <button onclick="renderAddMaintenance()">➕ Add Issue</button>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Property</th><th>Issue</th><th>Description</th><th>Cost</th><th>Status</th><th>Date</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${(logs||[]).map(l=>`<tr>
        <td>${l.rooms?.nickname||l.room_id||'General'}</td>
        <td>${l.issue_type||'-'}</td>
        <td style="max-width:200px;">${l.description||'-'}</td>
        <td>₹${(l.cost||0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${l.status==='Resolved'?'green':l.status==='In Progress'?'yellow':'red'}">${l.status||'Pending'}</span></td>
        <td>${l.reported_date||'-'}</td>
        ${isO?`<td class="table-actions">
          <button class="btn-sm" onclick="editMaintenance(${l.id})">✏️</button>
          <button class="btn-sm danger" onclick="delMaintenance(${l.id})">🗑️</button>
        </td>`:''}
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'maintenance');
}

async function renderAddMaintenance() {
  const {data:rooms} = await sb.from('rooms').select('room_id,nickname').order('room_id');
  renderShell(`
    <div class="card"><h1>➕ Add Issue</h1><button class="secondary btn-sm" onclick="renderMaintenanceLog()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Property</label>
        <select id="mRoom"><option value="">General</option>
          ${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.room_id}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Issue Type</label>
        <select id="mType">
          <option>Plumbing</option><option>Electrical</option><option>Furniture</option>
          <option>Appliance</option><option>Painting</option><option>Cleaning</option>
          <option>Other</option>
        </select>
      </div>
      <div class="form-group"><label>Description</label><textarea id="mDesc" placeholder="What happened?"></textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Cost ₹</label><input id="mCost" type="number" value="0" /></div>
        <div class="form-group"><label>Status</label>
          <select id="mStatus"><option>Pending</option><option>In Progress</option><option>Resolved</option></select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><input id="mNotes" placeholder="Optional" /></div>
      <button onclick="saveMaintenance()">💾 Save</button><div id="mErr"></div>
    </div>`, 'maintenance');
}

async function saveMaintenance() {
  const desc = document.getElementById('mDesc').value.trim();
  if (!desc) { document.getElementById('mErr').innerHTML='<div class="error">Description required</div>'; return; }
  await sb.from('maintenance_log').insert({
    room_id:document.getElementById('mRoom').value||null,
    issue_type:document.getElementById('mType').value,
    description:desc,
    cost:parseFloat(document.getElementById('mCost').value)||0,
    status:document.getElementById('mStatus').value,
    notes:document.getElementById('mNotes').value.trim()||null
  });
  renderMaintenanceLog();
}

async function editMaintenance(id) {
  const {data:m} = await sb.from('maintenance_log').select('*').eq('id',id).single();
  if (!m) return;
  const {data:rooms} = await sb.from('rooms').select('room_id,nickname').order('room_id');
  renderShell(`
    <div class="card"><h1>✏️ Edit Issue</h1><button class="secondary btn-sm" onclick="renderMaintenanceLog()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Property</label>
        <select id="mRoom">
          <option value="">General</option>
          ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${r.room_id===m.room_id?'selected':''}>${r.nickname||r.room_id}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Issue Type</label>
        <select id="mType">
          ${['Plumbing','Electrical','Furniture','Appliance','Painting','Cleaning','Other'].map(t=>`<option ${t===m.issue_type?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Description</label><textarea id="mDesc">${m.description||''}</textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Cost ₹</label><input id="mCost" type="number" value="${m.cost||0}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="mStatus">
            <option ${m.status==='Pending'?'selected':''}>Pending</option>
            <option ${m.status==='In Progress'?'selected':''}>In Progress</option>
            <option ${m.status==='Resolved'?'selected':''}>Resolved</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Resolved Date</label><input id="mResDate" type="date" value="${m.resolved_date||''}" /></div>
      <div class="form-group"><label>Payment Status</label>
        <select id="mPaySt">
          <option ${m.paid_status==='Unpaid'?'selected':''}>Unpaid</option>
          <option ${m.paid_status==='Paid'?'selected':''}>Paid</option>
        </select>
      </div>
      <div class="form-group"><label>Notes</label><input id="mNotes" value="${m.notes||''}" /></div>
      <button onclick="updMaintenance(${id})">💾 Update</button>
    </div>`, 'maintenance');
}

async function updMaintenance(id) {
  await sb.from('maintenance_log').update({
    room_id:document.getElementById('mRoom').value||null,
    issue_type:document.getElementById('mType').value,
    description:document.getElementById('mDesc').value.trim(),
    cost:parseFloat(document.getElementById('mCost').value)||0,
    status:document.getElementById('mStatus').value,
    resolved_date:document.getElementById('mResDate').value||null,
    paid_status:document.getElementById('mPaySt').value,
    notes:document.getElementById('mNotes').value.trim()||null
  }).eq('id',id);
  renderMaintenanceLog();
}

async function delMaintenance(id) {
  if (!confirm('Delete?')) return;
  await sb.from('maintenance_log').delete().eq('id',id);
  renderMaintenanceLog();
}

// ============ INVESTOR VIEW (Read-Only) ============
function filterByRange(bks,range){if(range==='All')return bks;const now=new Date();let start;if(range==='Today')start=new Date(now.getFullYear(),now.getMonth(),now.getDate());else if(range==='Week'){start=new Date(now);start.setDate(now.getDate()-7);}else if(range==='Month')start=new Date(now.getFullYear(),now.getMonth(),1);else return bks;return bks.filter(b=>b.check_in&&new Date(b.check_in)>=start);}
async function renderInvestorView(range='Month'){if(!SESSION.investorId){showError('No property linked.');return;}appEl.innerHTML=`<div class="wrap" style="max-width:650px;"><div class="loading">Loading...</div></div>`;const{data:inv}=await sb.from('investors').select('*').eq('investor_id',SESSION.investorId).single();const{data:links}=await sb.from('investor_properties').select('room_id, rooms(unit_no, property_name, nickname, checkin_manager)').eq('investor_id',SESSION.investorId);const rids=(links||[]).map(l=>l.room_id);const{data:allBk}=rids.length?await sb.from('guest_register').select('booking_id, guest_name, phone, room_id, booking_mode, check_in, check_out, total_amount, per_day_rate, rooms(unit_no, nickname)').in('room_id',rids).order('check_in',{ascending:false}):{data:[]};const bks=filterByRange(allBk||[],range);const pm=await getPaidMap(bks.map(b=>b.booking_id));const rev=bks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);const share=inv?.revenue_share_pct||70;appEl.innerHTML=`<div class="wrap" style="max-width:650px;"><div class="card" style="text-align:center;"><img src="assets/logo.png" alt="" style="width:52px;height:52px;object-fit:contain;border-radius:12px;margin-bottom:6px;" /><h1>${BRAND}</h1><div class="sub">👋 ${SESSION.displayName||inv?.name||'Investor'}</div><div class="badge blue" style="margin:4px 0;">Investor · View Only</div><div style="margin-top:10px;"><button class="danger btn-sm" onclick="logout()">🚪 Logout</button></div></div><div class="card"><div class="form-group"><label>Period</label><select id="invRange"><option value="Today" ${range==='Today'?'selected':''}>Today</option><option value="Week" ${range==='Week'?'selected':''}>Week</option><option value="Month" ${range==='Month'?'selected':''}>Month</option><option value="All" ${range==='All'?'selected':''}>All</option></select></div></div><div class="stat-grid" style="grid-template-columns:repeat(3,1fr);"><div class="stat-card" style="border-left:4px solid var(--green);"><div class="stat-num">${(links||[]).length}</div><div class="stat-label">Properties</div></div><div class="stat-card" style="border-left:4px solid var(--primary);"><div class="stat-num">${bks.length}</div><div class="stat-label">Bookings</div></div><div class="stat-card" style="border-left:4px solid #60a5fa;"><div class="stat-num">₹${rev>999?Math.round(rev/1000)+'K':rev}</div><div class="stat-label">Revenue</div></div></div><div class="card"><div class="section-title">Revenue (${range})</div><div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Your Share (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${Math.round(rev*share/100).toLocaleString('en-IN')}</span></div></div><div class="card"><div class="section-title">Properties</div>${(links||[]).map(l=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);"><div style="font-weight:600;">${l.rooms?.nickname||l.rooms?.unit_no||'-'}</div><div style="font-size:12px;color:var(--muted);">${l.rooms?.property_name||''}</div></div>`).join('')||'<div class="sub">None</div>'}</div><div class="card"><div class="section-title">Bookings (${range})</div><div class="table-wrap"><table><thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>₹</th></tr></thead><tbody>${bks.map(b=>`<tr><td>${b.guest_name||'-'}</td><td><small>${b.rooms?.nickname||'-'}</small></td><td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'Online':'Offline'}</span></td><td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td><td>₹${(pm[b.booking_id]||0).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="6" class="sub">None</td></tr>'}</tbody></table></div></div><div class="card" style="text-align:center;"><div style="font-size:11px;color:var(--muted);">${BRAND}<br><small>View Only</small></div><button class="danger btn-sm" onclick="logout()" style="margin-top:8px;">🚪 Logout</button></div></div>`;document.getElementById('invRange').onchange=e=>renderInvestorView(e.target.value);}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView(){if(!SESSION.empId){appEl.innerHTML=`<div class="wrap"><div class="card"><h1>⚠️ Error</h1><div class="error">Employee ID not set</div><button onclick="logout()">Logout</button></div></div>`;return;}const[{data:emp},{data:sal},{data:adv},{data:tasks},{data:att}]=await Promise.all([sb.from("employees").select("*").eq("emp_id",SESSION.empId).single(),sb.from("salary_tracker").select("salary_due,salary_paid").eq("emp_id",SESSION.empId),sb.from("advance_tracker").select("advance_amount,repaid_amount").eq("emp_id",SESSION.empId),sb.from("employee_tasks").select("task_description,status").eq("emp_id",SESSION.empId).eq("status","Pending"),sb.from("attendance_log").select("status,att_date").eq("emp_id",SESSION.empId)]);const pSal=(sal||[]).reduce((s,r)=>s+((r.salary_due||0)-(r.salary_paid||0)),0);const pAdv=(adv||[]).reduce((s,r)=>s+((r.advance_amount||0)-(r.repaid_amount||0)),0);const cm=new Date().toISOString().slice(0,7);const mr=(att||[]).filter(a=>a.att_date?.startsWith(cm));const pr=mr.filter(a=>a.status==='Present').length,ab=mr.filter(a=>a.status==='Absent').length;appEl.innerHTML=`<div class="wrap"><div class="card" style="text-align:center;"><img src="assets/logo.png" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-bottom:6px;" /><h1>${BRAND}</h1><div class="sub">👋 ${SESSION.displayName}</div><button class="secondary btn-sm" onclick="logout()">🚪 Logout</button></div><div class="card"><div class="metric-row"><span class="metric-label">Name</span><span class="metric-value" style="font-size:15px;">${emp?.name||'-'}</span></div><div class="metric-row"><span class="metric-label">Role</span><span>${emp?.role||'-'}</span></div><div class="metric-row"><span class="metric-label">Salary</span><span class="metric-value">₹${(emp?.monthly_salary||0).toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Salary Pending</span><span class="metric-value${pSal>0?' warn':''}">₹${pSal.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Advance Due</span><span class="metric-value${pAdv>0?' warn':''}">₹${pAdv.toLocaleString('en-IN')}</span></div><div class="metric-row"><span class="metric-label">Present</span><span class="metric-value">${pr}</span></div><div class="metric-row"><span class="metric-label">Absent</span><span class="metric-value${ab>0?' warn':''}">${ab}</span></div></div><div class="card"><div class="section-title">Pending Tasks</div>${(tasks||[]).length===0?'<div class="sub">No tasks ✅</div>':(tasks||[]).map(t=>`<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join('')}</div></div>`;}

// ============ CHECKIN MANAGER VIEW ============
async function renderCheckinManagerView() {
  // Same as dashboard but limited
  renderDashboard();
}

// ============ SOP PAGE ============
function renderSOPPage(){renderShell(`<div class="card"><h1>📘 Standard Operating Procedure</h1><div class="sub">${BRAND} — System Manual</div></div><div class="card"><div class="section-title">👥 Team & Roles</div><div class="metric-row"><span class="metric-label">1. Mr. Shahanshah</span><span class="badge green">Owner</span></div><div class="metric-row"><span class="metric-label">2. Mr. Firoz Khan</span><span class="badge green">Owner</span></div><div class="metric-row"><span class="metric-label">3. Praveen Singh</span><span class="badge blue">Admin & Developer</span></div><div style="font-size:12px;color:var(--muted);margin-top:8px;padding:10px;background:var(--bg);border-radius:8px;">📞 Shahanshah: 9450055554<br>📞 Firoz Khan: 8299600709<br>🛠️ Praveen: System Admin</div></div><div class="card"><div class="section-title">🔐 Permissions</div><div style="font-size:13px;line-height:1.8;"><p><strong>Owners:</strong> View + Add + Edit ✅ | Delete ❌</p><p><strong>Admin:</strong> Full access ✅</p></div></div><div class="card"><div class="section-title">✅ Booking Rules</div><div style="font-size:13px;line-height:1.8;"><p><strong>1.</strong> Register = final truth</p><p><strong>2.</strong> Actual room = save room</p><p><strong>3.</strong> Shift = source listing note</p><p><strong>4.</strong> Extension = new booking</p><p><strong>5.</strong> No fake names</p><p><strong>6.</strong> Same day entry</p></div></div><div class="card"><div class="section-title">🌐 Online Booking</div><div style="font-size:13px;line-height:1.8;"><p>Normal: Actual = Source = same</p><p>Shifted: Actual = new, Source = original</p><p>Amount: Net payout = Total Amount</p></div></div><div class="card"><div class="section-title">💰 Payment</div><div style="font-size:13px;line-height:1.8;"><p>Online: Airbnb payout verify</p><p>Offline: Register ke hisab se</p><p>Partial allowed</p><p>Edit/Delete genuine cases only</p></div></div><div class="card"><div class="section-title">🧹 Cleaning</div><div style="font-size:13px;line-height:1.8;"><p>Checkout → Free + Dirty (auto)</p><p>Safai → Clean mark (manual)</p><p>Check-in → Booked + Clean</p></div></div><div class="card"><div class="section-title">⏰ Timings</div><div style="font-size:13px;line-height:1.8;"><p>🕑 Check-in: 2:00 PM</p><p>🕚 Check-out: 11:00 AM</p></div></div><div class="card"><div class="section-title">🧰 Daily</div><div style="font-size:13px;line-height:1.8;"><p>1. Register → App</p><p>2. Payment update</p><p>3. Cleaning update</p><p>4. Notes for shift/ext</p></div></div><div class="card"><div class="section-title">❌ Don'ts</div><div style="font-size:13px;line-height:1.8;"><p>• 2 bookings same room</p><p>• Mix online + offline</p><p>• Fake names</p><p>• Random DB changes</p></div></div><div class="card" style="background:var(--dark);color:#fff;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.5);margin-bottom:8px;">📌 System Status</div><div style="font-size:13px;line-height:1.8;color:rgba(255,255,255,0.9);"><p>✅ Logins verified</p><p>✅ Booking workflow tested</p><p>✅ Payments working</p><p>✅ Flats toggle working</p><p>✅ Dashboard KPIs verified</p><p>✅ Investor reports working</p><p>✅ Google Sheet analytics</p><p>✅ Mobile layout usable</p></div></div><div class="card" style="text-align:center;"><div style="font-size:12px;color:var(--muted);">${BRAND}<br><strong>System by Praveen Singh</strong><br>Build: ${APP_VERSION}<br>${new Date().toLocaleDateString('en-IN')}</div><div style="margin-top:8px;"><button class="btn-sm" onclick="window.print()">🖨️ Print</button></div></div>`,'sop');}

// ============ PRINT ============
// Already handled by CSS @media print

// ============ START ============
init();