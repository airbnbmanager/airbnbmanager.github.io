/**
 * ===================================
 * UNIQUE HAVEN HOMES STAY — Core Module
 * Developer: Praveen Singh
 * ===================================
 */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const appEl = document.getElementById("app");
const BRAND = "The UNIQUE HAVEN HOME STAY";
const APP_VERSION = "v15";

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
    await swUpdateCheck();
    versionNotice();

    const { data: { session } } = await sb.auth.getSession();
    if (!session) { renderLogin(); return; }
    await loadProfile(session.user.id);
  } catch (err) {
    showError("Setup incomplete. config.js check karo.", err);
  }
}

async function swUpdateCheck() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (e) { console.warn('SW update failed', e); }
}

function versionNotice() {
  try {
    const old = localStorage.getItem('uh_ver');
    if (old && old !== APP_VERSION) window._showUpdate = true;
    localStorage.setItem('uh_ver', APP_VERSION);
  } catch (e) {}
}

function updateNoticeHTML() {
  if (!window._showUpdate) return '';
  return `
    <div class="card" style="border-left:4px solid var(--primary);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div><strong>🔄 New update available</strong><br><small style="color:var(--muted);">Refresh for latest version</small></div>
        <button class="btn-sm" onclick="window._showUpdate=false;location.reload();">Refresh</button>
      </div>
    </div>`;
}

function syncInfoHTML() {
  const last = window._lastSync || '';
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div><strong>🔄 Room Status Sync</strong>
          <div style="font-size:11px;color:var(--muted);">${last ? 'Last: ' + last : 'Sync after booking changes'}</div>
        </div>
        <button class="btn-sm" onclick="manualSync()">Run Sync</button>
      </div>
    </div>`;
}

async function manualSync() {
  if (!confirm('Room status sync karna hai?')) return;
  try {
    await autoCheckout();
    window._lastSync = new Date().toLocaleString('en-IN');
    alert('✅ Synced!');
    if (SESSION.currentPage === 'dashboard') renderDashboard();
    else if (SESSION.currentPage === 'flats') renderFlatsStatus();
  } catch (e) { alert('❌ Failed: ' + e.message); }
}

// ============ AUTH ============
async function loadProfile(userId) {
  const { data: p, error } = await sb.from("profiles")
    .select("role, emp_id, investor_id, display_name, is_approved")
    .eq("user_id", userId).single();

  if (error || !p) {
    // Check if pending user (Google login first time)
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await handleNewGoogleUser(user);
      return;
    }
    showError("Profile nahi mila. Admin se contact karo.");
    return;
  }

  if (p.is_approved === false) {
    appEl.innerHTML = `
      <div class="wrap">
        <div class="card" style="text-align:center;">
          <img src="assets/logo.png" alt="" style="width:64px;height:64px;border-radius:14px;margin-bottom:8px;" />
          <h1>${BRAND}</h1>
          <div style="margin:16px 0;padding:16px;background:#FDF6B2;border-radius:10px;">
            <div style="font-size:18px;margin-bottom:6px;">⏳</div>
            <strong>Account Pending Approval</strong><br>
            <small style="color:var(--muted);">Admin aapka account approve karega. Thodi der me try karo.</small>
          </div>
          <div class="sub">Logged in as: ${p.display_name || 'User'}</div>
          <button onclick="logout()">🚪 Logout</button>
        </div>
      </div>`;
    return;
  }

  SESSION.userId = userId;
  SESSION.role = p.role;
  SESSION.empId = p.emp_id;
  SESSION.investorId = p.investor_id;
  SESSION.displayName = p.display_name || p.role;

  if (p.role === 'employee') renderEmployeeView();
  else if (p.role === 'investor' || (p.role === 'viewer' && p.investor_id)) renderInvestorView();
  else if (p.role === 'ca') renderFYSummary();
    else {
    const lastPage = localStorage.getItem('uh_last_page');
    if (lastPage && typeof window[`render${lastPage}`] !== 'undefined') {
      navigate(lastPage);
    } else {
      renderDashboard();
    }
  }
}

async function handleNewGoogleUser(user) {
  const email = user.email || '';
  const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
  const avatar = user.user_metadata?.avatar_url || '';

  // Check if already in pending
  const { data: existing } = await sb.from('pending_users').select('id').eq('user_id', user.id).single();
  if (!existing) {
    await sb.from('pending_users').insert({
      user_id: user.id,
      email: email,
      full_name: name,
      auth_provider: 'google',
      status: 'Pending'
    });
  }

  // Also create profile with is_approved = false
  const { data: profExists } = await sb.from('profiles').select('user_id').eq('user_id', user.id).single();
  if (!profExists) {
    await sb.from('profiles').insert({
      user_id: user.id,
      role: 'viewer',
      display_name: name,
      auth_provider: 'google',
      avatar_url: avatar,
      is_approved: false
    });
  }

  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:64px;height:64px;border-radius:14px;margin-bottom:8px;" />
        <h1>${BRAND}</h1>
        ${avatar ? `<img src="${avatar}" style="width:48px;height:48px;border-radius:50%;margin:8px auto;" />` : ''}
        <div style="margin:16px 0;padding:16px;background:#FDF6B2;border-radius:10px;">
          <div style="font-size:18px;margin-bottom:6px;">⏳</div>
          <strong>Welcome ${name}!</strong><br>
          <small style="color:var(--muted);">Aapka request admin ko bhej diya gaya hai. Approve hone ke baad access milega.</small>
        </div>
        <div class="sub">${email}</div>
        <button onclick="logout()">🚪 Logout</button>
      </div>
    </div>`;
}

function showError(msg, err = null) {
  appEl.innerHTML = `<div class="wrap"><div class="card">
    <h1>⚠️ Error</h1>
    <div class="error">${msg}${err ? '<br>' + err.message : ''}</div>
    <button onclick="logout()" style="margin-top:10px;">🚪 Logout</button>
  </div></div>`;
}

async function logout() {
  await sb.auth.signOut();
  SESSION = {
    userId: null, role: null, empId: null, investorId: null,
    displayName: null, currentPage: 'dashboard',
    bookingFilter: 'All', bookingPropFilter: '', bookingDateFilter: '',
    bookingDateFrom: '', bookingDateTo: '', bookingSearch: ''
  };
  renderLogin();
}

// ============ LOGIN ============
function renderLogin() {
  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="Logo" style="width:80px;height:80px;object-fit:contain;margin-bottom:10px;border-radius:14px;" />
        <h1>${BRAND}</h1>
        <div class="sub">Property Management System</div>

        <!-- Google Login -->
        <button onclick="loginWithGoogle()" style="width:100%;margin-top:16px;padding:14px;background:#fff;color:#333;border:1.5px solid var(--border);font-size:15px;">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;" />
          Sign in with Google
        </button>

        <div style="margin:16px 0;display:flex;align-items:center;gap:10px;">
          <div style="flex:1;height:1px;background:var(--border);"></div>
          <span style="font-size:12px;color:var(--muted);">OR</span>
          <div style="flex:1;height:1px;background:var(--border);"></div>
        </div>

        <!-- Email Login -->
        <input id="email" type="email" placeholder="Email" autocomplete="email" />
        <input id="password" type="password" placeholder="Password" autocomplete="current-password" style="margin-top:8px;" />
        <button id="loginBtn" onclick="loginWithEmail()" style="width:100%;margin-top:10px;padding:12px;">Login with Email</button>

        <div id="loginErr"></div>

        <div style="margin-top:20px;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:#999;">
          Developed by <strong style="color:#666;">Praveen Singh</strong> · Build ${APP_VERSION}
        </div>
      </div>
    </div>`;
}

async function loginWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://uniquehavenhomesstay.com/admin.html'
    }
  });
  if (error) {
    document.getElementById('loginErr').innerHTML = `<div class="error">${error.message}</div>`;
  }
}

async function loginWithEmail() {
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("loginErr").innerHTML = `<div class="error">${error.message}</div>`;
    btn.disabled = false;
    btn.textContent = 'Login with Email';
    return;
  }
  await loadProfile(data.user.id);
}

// ============ SHELL ============
function renderShell(content, activePage = 'dashboard') {
  if (SESSION.investorId) { appEl.innerHTML = content; return; }
  const show = ['admin', 'owner', 'viewer', 'booking_staff', 'manager', 'checkin_manager'].includes(SESSION.role);
  if (!show) { appEl.innerHTML = content; return; }

  const isAdmin = SESSION.role === 'admin';
  const isOwner = SESSION.role === 'owner' || isAdmin;
  const isBookingStaff = SESSION.role === 'booking_staff';
  const isViewer = SESSION.role === 'viewer' && !SESSION.investorId;
  const isCheckin = SESSION.role === 'checkin_manager';

  let nav;

  if (isViewer) {
    nav = [
      { section: 'MAIN' },
      ['dashboard', '🏠 Dashboard'],
      ['bookings', '📅 Today Bookings'],
      ['flats', '🛏️ Flats Status'],
      { section: 'HELP' },
      ['sop', '📘 SOP Guide'],
    ];
  } else if (isBookingStaff) {
    nav = [
      { section: 'MAIN' },
      ['dashboard', '🏠 Dashboard'],
      ['reports', '📆 Calendar'],
      { section: 'GUESTS' },
      ['bookings', '📅 Bookings'],
      ['flats', '🛏️ Flats Status'],
      { section: 'PROPERTIES' },
      ['rooms', '🏠 Properties'],
      ['shifts', '🕐 Shifts'],
      { section: 'HELP' },
      ['sop', '📘 SOP Guide'],
    ];
  } else if (isOwner) {
    nav = [
      { section: 'MAIN' },
      ['dashboard', '🏠 Dashboard'],
      ['reports', '📆 Calendar'],

      { section: 'GUESTS' },
      ['bookings', '📅 Bookings'],
      ['flats', '🛏️ Flats Status'],

      { section: 'PROPERTIES' },
      ['rooms', '🏠 Properties'],
      ['shifts', '🕐 Shifts'],
      ['maintenance', '🔧 Maintenance'],

      { section: 'TEAM' },
      ['employees', '👥 Employees'],
      ['tasks', '🧰 Tasks'],
      ['attendance', '📋 Attendance'],
      ['att-summary', '📊 Attendance Report'],
      ['salary', '💰 Payroll'],
      ['advance', '💵 Advances'],
      ['emp-expenses', '🧾 Staff Expenses'],

      { section: 'FINANCE' },
      ['expenses', '💹 Expenses & P&L'],
      ['monthly-expenses', '📅 Monthly Expenses'],
      ['financial', '📊 Financial Summary'],
      ['property-report', '🏘️ Property Reports'],
      ['investors', '🧑‍💼 Investors'],

      { section: 'STORE' },
      ['store', '📦 Inventory'],

      { section: 'ADMIN' },
      ['user-mgmt', '👤 User Management'],
      ['sop', '📘 SOP Guide'],
    ];
  } else if (isCheckin) {
    nav = [
      ['dashboard', '🏠 Dashboard'],
      ['reports', '📆 Calendar'],
      ['bookings', '📅 Bookings'],
      ['flats', '🛏️ Flats Status'],
      ['sop', '📘 SOP Guide'],
    ];
  } else {
    nav = [
      { section: 'MAIN' },
      ['dashboard', '🏠 Dashboard'],
      ['reports', '📆 Calendar'],

      { section: 'GUESTS' },
      ['bookings', '📅 Bookings'],
      ['flats', '🛏️ Flats Status'],

      { section: 'PROPERTIES' },
      ['maintenance', '🔧 Maintenance'],

      { section: 'TEAM' },
      ['employees', '👥 Employees'],
      ['att-summary', '📊 Attendance Report'],
      ['salary', '💰 Payroll'],
      ['advance', '💵 Advances'],
      ['emp-expenses', '🧾 Staff Expenses'],

      { section: 'FINANCE' },
      ['expenses', '💹 Expenses & P&L'],
      ['financial', '📊 Financial Summary'],
      ['property-report', '🏘️ Property Reports'],
      ['investors', '🧑‍💼 Investors'],

      { section: 'STORE' },
      ['store', '📦 Inventory'],

      { section: 'HELP' },
      ['sop', '📘 SOP Guide'],
    ];
  }

  const roleLabel = SESSION.role === 'admin' ? 'Admin' : SESSION.role === 'owner' ? 'Owner' : SESSION.role === 'booking_staff' ? 'Staff' : SESSION.role === 'viewer' ? 'Viewer' : SESSION.role;
  const shortName = (SESSION.displayName || '').split('(')[0].trim().split(' ')[0];

  appEl.innerHTML = `
    <div class="app-container">
      <aside class="sidebar" id="sidebarEl">
        <!-- Row 1: Logo + User + Logout -->
        <div class="sidebar-top">
          <div class="sidebar-brand" onclick="navigate('dashboard')">
            <img src="assets/logo.png" alt="" />
            <span>UHHS</span>
          </div>
          <div class="sidebar-user">
            <span class="sidebar-username">${shortName}</span>
            <span class="badge blue sidebar-role">${roleLabel}</span>
            <button class="sidebar-logout" id="logoutBtn" style="background:#FF5A5F;color:#fff;border:none;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;line-height:1;height:20px;min-height:20px;max-height:20px;box-sizing:border-box;">Logout</button>
          </div>
        </div>

        <!-- Row 2: Navigation -->
        <nav class="sidebar-nav">
          ${nav.map(item => {
            if (item.section) {
              return `<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:1.5px;padding:12px 12px 4px;margin-top:4px;">${item.section}</div>`;
            }
            const [k, l] = item;
            return `<a href="#" data-page="${k}" class="${activePage === k ? 'active' : ''}">${l}</a>`;
          }).join('')}
        </nav>
      </aside>
      <main class="main-content" id="mainContent">${content}</main>
    </div>`;

  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.onclick = e => { e.preventDefault(); navigate(a.dataset.page); };
  });
  document.getElementById('logoutBtn').onclick = logout;
}

function navigate(page) {
  SESSION.currentPage = page;
  try { localStorage.setItem('uh_last_page', page); } catch(e) {}
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
    'emp-expenses': renderEmpExpenses,
    'monthly-expenses': renderMonthlyExpenses,
    store: renderStore,
    expenses: renderExpenses,
    'property-report': renderPropertyReport,
    'shifts': renderPropertyShifts,
    'financial': () => renderFYSummary('Month'),
    investors: renderManageInvestors,
    maintenance: renderMaintenanceLog,
    'user-mgmt': renderUserManagement,
    sop: renderSOPPage,
  };
  (map[page] || renderDashboard)();
}

// ============ HELPERS ============
async function getPaidMap(ids) {
  if (!ids.length) return {};
  const { data } = await sb.from('payment_history').select('booking_id, amount').in('booking_id', ids);
  const m = {};
  (data || []).forEach(p => { m[p.booking_id] = (m[p.booking_id] || 0) + (p.amount || 0); });
  return m;
}

function dateAdd(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(Math.round((new Date(checkOut) - new Date(checkIn)) / 864e5), 0);
}

function compressImage(file, maxDim = 800, quality = 0.5) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; };
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
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
  const [y, m, d] = dateStr.split('-').map(Number);
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
    const list = grouped[roomId].sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b2 = list[j];
        const aS = parseLocalDateTime(a.check_in, 14, 0);
        const aE = parseLocalDateTime(a.check_out, 11, 0);
        const bS = parseLocalDateTime(b2.check_in, 14, 0);
        const bE = parseLocalDateTime(b2.check_out, 11, 0);
        if (aS < bE && aE > bS) overlaps.push({ roomId, a, b: b2 });
      }
    }
  });
  return overlaps;
}

// ============ AUTO ROOM STATUS ============
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
    const cf = flatMap[roomId] || {};
    const rb = (bookings || []).filter(b => b.room_id === roomId);
    if (cf.status === 'Blocked-Maintenance') continue;

    const activeNow = rb.some(b => isBookingActiveNow(b, now));
    const ended = rb.filter(b => hasBookingEnded(b, now)).sort((a, b) => (b.check_out || '').localeCompare(a.check_out || ''));
    const latest = ended[0] || null;

    let newS = cf.status || 'Free';
    let newC = cf.cleaning_status || 'Clean';

    if (activeNow) {
      newS = 'Booked';
      newC = 'Clean';
    } else {
      newS = 'Free';
      if (latest) {
        const lc = cf.last_cleaned || null;
        const co = latest.check_out || null;
        if (!(lc && co && lc >= co) && newC !== 'In Progress') newC = 'Dirty';
      }
    }

    const needsInsert = !flatMap[roomId];
    const changed = cf.status !== newS || cf.cleaning_status !== newC;

    if (needsInsert) {
      await sb.from('flats_status').insert({ room_id: roomId, status: newS, cleaning_status: newC });
    } else if (changed) {
      await sb.from('flats_status').update({ status: newS, cleaning_status: newC }).eq('room_id', roomId);
    }
  }
}

// ============ PHOTO VIEWER ============
async function dlIdPhoto(path) {
  const { data } = await sb.storage.from('id-proofs').createSignedUrl(path, 600);
  if (!data?.signedUrl) { alert('⚠️ Photo load failed'); return; }
  showPhotoViewer(data.signedUrl, path);
}

function showPhotoViewer(url, path) {
  document.querySelectorAll('.photo-viewer-overlay').forEach(el => el.remove());
  const fileName = path ? path.split('/').pop() : 'Photo';
  const overlay = document.createElement('div');
  overlay.className = 'photo-viewer-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <button class="photo-viewer-close" onclick="this.closest('.photo-viewer-overlay').remove()">✕</button>
    <img src="${url}" alt="Photo" onerror="this.style.display='none';" />
    <div class="photo-viewer-info">📄 ${fileName}</div>
    <div class="photo-viewer-nav">
      <button onclick="const a=document.createElement('a');a.href='${url}';a.download='${fileName}';a.target='_blank';document.body.appendChild(a);a.click();a.remove();">📥 Download</button>
      <button onclick="window.open('${url}','_blank')">🔗 New Tab</button>
      <button onclick="this.closest('.photo-viewer-overlay').remove()">✕ Close</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ============ USER MANAGEMENT (Admin Only) ============
async function renderUserManagement() {
  renderShell(`<div class="loading">Loading...</div>`, 'user-mgmt');

  const [{ data: profiles }, { data: pending }] = await Promise.all([
    sb.from('profiles').select('user_id, role, display_name, auth_provider, is_approved, avatar_url').order('display_name'),
    sb.from('pending_users').select('*').eq('status', 'Pending').order('requested_at', { ascending: false })
  ]);

  renderShell(`
    <div class="card">
      <h1>👤 User Management</h1>
      <div class="sub">Manage users, approve requests, assign roles</div>
    </div>

    ${(pending || []).length ? `
      <div class="card" style="border-left:4px solid var(--yellow);">
        <div class="section-title">⏳ Pending Approval (${pending.length})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Requested</th><th>Actions</th></tr></thead>
          <tbody>${pending.map(p => `<tr>
            <td><strong>${p.full_name || '-'}</strong></td>
            <td>${p.email || '-'}</td>
            <td><span class="badge blue">${p.auth_provider || 'email'}</span></td>
            <td>${p.requested_at ? new Date(p.requested_at).toLocaleDateString('en-IN') : '-'}</td>
            <td class="table-actions">
              <button class="btn-sm green-btn" onclick="approveUser('${p.user_id}','${(p.full_name || '').replace(/'/g, "\\'")}')">✅ Approve</button>
              <button class="btn-sm danger" onclick="rejectUser('${p.user_id}')">❌ Reject</button>
            </td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>
    ` : ''}

    <div class="card">
      <div class="section-title">All Users (${(profiles || []).length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Role</th><th>Provider</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${(profiles || []).map(p => `<tr>
          <td>
            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:6px;" />` : ''}
            <strong>${p.display_name || '-'}</strong>
          </td>
          <td><span class="badge ${p.role === 'owner' ? 'green' : p.role === 'manager' ? 'blue' : 'yellow'}">${p.role}</span></td>
          <td>${p.auth_provider || 'email'}</td>
          <td><span class="badge ${p.is_approved ? 'green' : 'yellow'}">${p.is_approved ? 'Active' : 'Pending'}</span></td>
          <td class="table-actions">
            <button class="btn-sm" onclick="changeUserRole('${p.user_id}','${p.display_name || ''}')">🔧 Role</button>
            <button class="btn-sm danger" onclick="deleteUser('${p.user_id}','${p.display_name || ''}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  `, 'user-mgmt');
}

// ============ ROLE PICKER MODAL ============
function showRolePickerModal(userId, name, callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🔧 Assign Role</h2>
      <div class="sub">${name}</div>
      <div class="form-group" style="margin-top:12px;">
        <label>Select Role *</label>
        <select id="rolePickerSel" style="font-size:15px;">
          <option value="">-- Select Role --</option>
          <option value="admin">🔧 Admin (Full Access + Delete)</option>
          <option value="owner">👑 Owner (View All + Book + Edit, No Delete)</option>
          <option value="booking_staff">📋 Booking Staff (Bookings + ID Upload, No Delete)</option>
          <option value="viewer">👁️ Viewer (Limited View — Today's info)</option>
          <option value="investor">📊 Investor (Own Property Only)</option>
          <option value="employee">👷 Employee (Self View Only)</option>
          <option value="ca">📋 CA / Accountant (Financial Reports)</option>
        </select>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px;padding:8px;background:var(--bg);border-radius:8px;" id="roleDesc"></div>
      <button onclick="confirmRolePicker('${userId}','${name.replace(/'/g,"\\'")}',callback_${userId.replace(/-/g,'_')})" style="width:100%;margin-top:12px;">✅ Confirm Role</button>
      <div id="rolePickerErr"></div>
    </div>`;
  document.body.appendChild(modal);

  // Store callback globally
  window[`callback_${userId.replace(/-/g,'_')}`] = callback;

  // Role description on change
  document.getElementById('rolePickerSel').onchange = function() {
    const desc = {
      admin: '🔧 Full access - can add, edit, delete everything. Only for developers/system admins.',
      owner: '👑 Property owners - view all data, add/edit bookings & payments. Cannot delete.',
      booking_staff: '📋 Trusted staff - book guests, upload IDs, edit bookings. Cannot delete.',
      viewer: '👁️ Limited view - today\'s bookings, checkouts, payments status only.',
      investor: '📊 Investor - only view their own linked property bookings and monthly reports.',
      employee: '👷 Employee - only view own attendance, salary, advances, tasks.',
      ca: '📋 CA/Accountant - financial reports and CSV downloads only.'
    };
    document.getElementById('roleDesc').textContent = desc[this.value] || '';
  };
}

async function confirmRolePicker(userId, name, callbackFn) {
  const role = document.getElementById('rolePickerSel').value;
  if (!role) { document.getElementById('rolePickerErr').innerHTML = '<div class="error">Role select karo</div>'; return; }
  document.querySelector('.modal-overlay')?.remove();
  if (typeof callbackFn === 'function') callbackFn(role);
}

// ============ APPROVE USER ============
async function approveUser(userId, name) {
  showRolePickerModal(userId, name, async (role) => {
    try {
      const { data: pending } = await sb.from('pending_users').select('*').eq('user_id', userId).single();
      const displayName = name || pending?.full_name || 'User';
      const authProvider = pending?.auth_provider || 'google';

      const { data: existing } = await sb.from('profiles').select('user_id').eq('user_id', userId).single();

      if (existing) {
        await sb.from('profiles').update({ role, display_name: displayName, is_approved: true, auth_provider: authProvider }).eq('user_id', userId);
      } else {
        await sb.from('profiles').insert({ user_id: userId, role, display_name: displayName, is_approved: true, auth_provider: authProvider });
      }

      await sb.from('pending_users').update({ status: 'Approved' }).eq('user_id', userId);
      alert(`✅ ${displayName} approved as ${role}`);
      renderUserManagement();
    } catch (err) {
      alert('❌ Approve failed: ' + (err.message || err));
    }
  });
}

// ============ CHANGE USER ROLE ============
async function changeUserRole(userId, name) {
  showRolePickerModal(userId, name, async (role) => {
    try {
      await sb.from('profiles').update({ role }).eq('user_id', userId);
      alert(`✅ Role changed to ${role}`);
      renderUserManagement();
    } catch (err) {
      alert('❌ Role change failed: ' + (err.message || err));
    }
  });
}

async function rejectUser(userId) {
  if (!confirm('Reject this user?')) return;
  await sb.from('pending_users').update({ status: 'Rejected' }).eq('user_id', userId);
  await sb.from('profiles').update({ is_approved: false }).eq('user_id', userId);
  renderUserManagement();
}



async function deleteUser(userId, name) {
  if (!confirm(`Delete user "${name}"?\n\nProfile + pending entry delete hogi. Auth user remain karega.`)) return;
  try {
    await sb.from('profiles').delete().eq('user_id', userId);
    await sb.from('pending_users').delete().eq('user_id', userId);
    alert(`✅ ${name} deleted`);
    renderUserManagement();
  } catch (err) {
    alert('❌ Delete failed: ' + (err.message || err));
  }
}
// ============ START ============
init();