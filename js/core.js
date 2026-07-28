/**
 * ===================================
 * UNIQUE HAVEN HOMES STAY — Core Module
 * Developer: Praveen Singh
 * ===================================
 */

// ============ PROPERTY DISPLAY HELPER ============
// Shows: "The Red (101)" instead of just "The Red"
// Use everywhere: dashboards, filters, dropdowns, reports
function propLabel(r) {
  if (!r) return '-';
  const nick = r.nickname || '';
  const unit = r.unit_no || '';
  if (nick && unit) return nick + ' (' + unit + ')';
  return nick || unit || r.room_id || '-';
}
window.propLabel = propLabel;

// ═══════════════════════════════════════════════════════════
// 🔐 ROLE PERMISSION HELPERS
// ═══════════════════════════════════════════════════════════
window.canDelete = function() {
  return SESSION.role === 'developer';
};

window.canEdit = function() {
  return ['developer', 'owner', 'admin', 'moderator'].includes(SESSION.role);
};

window.canView = function() {
  return ['developer', 'owner', 'admin', 'moderator', 'subowner', 'booking_staff', 'viewer'].includes(SESSION.role);
};

window.isReadOnly = function() {
  return ['subowner', 'viewer'].includes(SESSION.role);
};

window.canModerate = function() {
  // Booking, ID upload, attendance, WhatsApp
  return ['developer', 'owner', 'admin', 'moderator'].includes(SESSION.role);
};

window.canManageUsers = function() {
  return ['developer', 'admin'].includes(SESSION.role);
};

window.canManageFinance = function() {
  return ['developer', 'owner', 'admin'].includes(SESSION.role);
};

window.canManageStaff = function() {
  return ['developer', 'owner', 'admin'].includes(SESSION.role);
};



// ═══════════════════════════════════════════════════════════
// 📊 PAGE VISIT TRACKER — for smart bottom nav
// ═══════════════════════════════════════════════════════════
window.trackPageVisit = function(page) {
  if (!page) return;
  const skip = ['dashboard']; // don't track dashboard (always in nav)
  if (skip.includes(page)) return;
  try {
    const visits = JSON.parse(localStorage.getItem('uh_page_visits') || '{}');
    visits[page] = (visits[page] || 0) + 1;
    localStorage.setItem('uh_page_visits', JSON.stringify(visits));
  } catch(e) {}
};

window.getRecentPages = function(limit) {
  limit = limit || 3;
  try {
    const visits = JSON.parse(localStorage.getItem('uh_page_visits') || '{}');
    const sorted = Object.entries(visits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([page]) => page);
    return sorted;
  } catch(e) { return []; }
};




const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

const appEl = document.getElementById("app");
const BRAND = "The UNIQUE HAVEN HOME STAY";
const APP_VERSION = "v20";

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
window.SESSION = SESSION;


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
    fsn.success('Success', '✅ Synced!');
    if (SESSION.currentPage === 'dashboard') renderDashboard();
    else if (SESSION.currentPage === 'flats') renderFlatsStatus();
  } catch (e) { fsn.error('Error', '❌ Failed: ' + e.message); }
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
  startHeartbeat();

  if (p.role === 'employee') renderEmployeeView();
  else if (p.role === 'investor' || (p.role === 'viewer' && p.investor_id)) renderInvestorView();
  else if (p.role === 'ca') renderFYSummary();
  else if (p.role === 'checkin_manager' || p.role === 'caretaker') renderCheckinManagerViewNew();
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
  const show = ['developer', 'admin', 'owner', 'moderator', 'subowner', 'viewer', 'booking_staff', 'manager', 'checkin_manager', 'caretaker'].includes(SESSION.role);
  const isCheckinMgr = SESSION.role === 'checkin_manager' || SESSION.role === 'caretaker';
  if (!show) { appEl.innerHTML = content; return; }

  const isAdmin = SESSION.role === 'admin' || SESSION.role === 'developer';
  const isOwner = SESSION.role === 'owner' || isAdmin;
  const isBookingStaff = SESSION.role === 'booking_staff';
  const isViewer = (SESSION.role === 'viewer' || SESSION.role === 'subowner') && !SESSION.investorId;
  const isCheckin = SESSION.role === 'checkin_manager';

  let nav;

  // Settings visible only to admin
  const showSettings = isAdmin;

  // Viewer: 5 items view-only (with chat)
  if (SESSION.role === 'viewer') {
    nav = [
      { section: 'MAIN' },
      ['dashboard', '🏠 Dashboard'],
      ['reports', '📆 Calendar'],
      { section: 'GUESTS' },
      ['bookings', '📅 Bookings'],
      ['flats', '🛏️ Flats Status'],
      { section: 'COMMUNICATION' },
      ['chat', '💬 Team Chat'],
    ];
  } else if (SESSION.role === 'moderator') {
    nav = [
      { section: 'MAIN' },
      ['dashboard', '🏠 Dashboard'],
      ['reports', '📆 Calendar'],
      { section: 'GUESTS' },
      ['bookings', '📅 Bookings'],
      ['flats', '🛏️ Flats Status'],
      { section: 'TEAM' },
      ['attendance', '📋 Attendance'],
      { section: 'COMMUNICATION' },
      ['chat', '💬 Team Chat'],
    ];
  } else if (isCheckinMgr) {
    nav = [
      { section: 'MY PROPERTIES' },
      ['dashboard', '🏠 My Dashboard'],
      ['bookings', '📅 My Bookings'],
      ['flats', '🛏️ Flats Status'],
      { section: 'HELP' },
      ['sop', '📘 SOP Guide'],
    ];
  } else if (isViewer) {
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
      ['financial-sheet', '📈 Financial Sheet'],
      ...(isAdmin ? [['airbnb-sync', '🔄 Airbnb Sync']] : []),
      ['property-report', '🏘️ Property Reports'],
      ['investors', '🧑‍💼 Investors'],

      { section: 'STORE' },
      ['store', '📦 Inventory'],

      { section: 'COMMUNICATION' },
      ['chat', '💬 Team Chat'],

      { section: 'ADMIN' },
      ...(isAdmin ? [['user-mgmt', '👤 User Management']] : []),
      ...(showSettings ? [['settings', '⚙️ Settings']] : []),
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

  const roleLabel = ({
    'developer': '🔴 Developer',
    'admin': 'Admin',
    'owner': '🟠 Owner',
    'moderator': '🟡 Moderator',
    'viewer': '👁️ Viewer',
    'subowner': '🟢 Sub-owner',
    'booking_staff': 'Staff',
    'caretaker': 'Caretaker',
    'checkin_manager': 'Check-in Mgr',
    'viewer': 'Viewer',
    'investor': 'Investor',
    'employee': 'Employee',
    'ca': 'CA'
  })[SESSION.role] || SESSION.role;
  const shortName = (SESSION.displayName || '').split('(')[0].trim().split(' ')[0];

  // Custom badge overrides (per user)
  const CUSTOM_BADGES = {
    'c6343844-a307-4668-9b16-1947a0c0f8fa': 'Manager',      // praveensinghaws@gmail.com
    'e3717cbd-da9a-495e-a940-2995021e8ca2': 'Developer',    // admin@uniquehavenhomesstay.com
  };
  const displayBadge = CUSTOM_BADGES[SESSION.userId] || roleLabel;

  appEl.innerHTML = `
    <div class="app-container">
      <aside class="sidebar" id="sidebarEl">
        <!-- Row 1: Logo + User + Logout -->
        <div class="sidebar-top">
          <div class="sidebar-brand" onclick="navigate('dashboard')" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <img src="assets/logo.png" alt="" style="width:28px;height:28px;border-radius:6px;object-fit:contain;" />
            <span style="font-size:14px;font-weight:800;color:#fff;">UHHS</span>
          </div>
          <div class="sidebar-user" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <div style="display:flex;flex-direction:column;flex:1;min-width:0;">
              <span class="sidebar-username" style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${shortName}</span>
              <span class="sidebar-role" style="font-size:9px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.5px;">${displayBadge}</span>
            </div>
            <button class="sidebar-bell" id="notifBellBtn" onclick="event.stopPropagation();window.notifications&&window.notifications.openPanel();" style="background:transparent;border:none;color:#fff;padding:4px 6px;position:relative;cursor:pointer;font-size:16px;flex-shrink:0;">
              🔔<span class="notif-bell-badge" style="display:none;position:absolute;top:0;right:0;background:#FF3B30;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;align-items:center;justify-content:center;padding:0 4px;"></span>
            </button>
            <button class="sidebar-logout" id="logoutBtn" style="background:#FF5A5F;color:#fff;border:none;padding:5px 12px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0;white-space:nowrap;">Logout</button>
          </div>
        </div>

        <!-- Row 2: Navigation -->
        <div class="drawer-search">
          <input type="text" id="drawerSearchInput" placeholder="🔍 Search menu..." />
          <button onclick="window.openPreferences && window.openPreferences()" style="width:100%;margin-top:8px;padding:10px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;">⚙️ Preferences</button>
        </div>
        
        <nav class="sidebar-nav">
          ${nav.map(item => {
            if (item.section) {
              return `<div class="nav-section-heading">${item.section}</div>`;
            }
            const [k, l] = item;
            return `<a href="#" data-page="${k}" class="${activePage === k ? 'active' : ''}">${l}</a>`;
          }).join('')}
        </nav>
      </aside>
      <main class="main-content" id="mainContent">${content}</main>

      <!-- Mobile Bottom Navigation (Smart/Recent) -->
      <nav class="bottom-nav" id="bottomNav">
        ${(() => {
          // Page metadata: [key, icon, label]
          const PAGES = {
            dashboard:  ['🏠', 'Home'],
            bookings:   ['📅', 'Bookings'],
            flats:      ['🛏️', 'Flats'],
            rooms:      ['🏘️', 'Property'],
            shifts:     ['🕐', 'Shifts'],
            reports:    ['📆', 'Calendar'],
            maintenance:['🔧', 'Maintain'],
            employees:  ['👥', 'Team'],
            tasks:      ['🧰', 'Tasks'],
            attendance: ['📋', 'Attend'],
            salary:     ['💰', 'Payroll'],
            expenses:   ['💹', 'Expenses'],
            store:      ['📦', 'Store'],
            investors:  ['🧑‍💼', 'Invest'],
            sop:        ['📘', 'SOP']
          };
          // Get 3 most-visited (or defaults)
          let recent = (window.getRecentPages ? window.getRecentPages(3) : []);
          const defaults = ['bookings', 'flats', 'rooms'];
          // Fill with defaults if not enough recent
          for (const d of defaults) {
            if (recent.length >= 3) break;
            if (!recent.includes(d)) recent.push(d);
          }
          recent = recent.slice(0, 3);

          // Home first
          let html = `<a href="#" data-page="dashboard" class="${activePage === 'dashboard' ? 'active' : ''}"><span class="bn-icon">🏠</span><span class="bn-label">Home</span></a>`;
          // 3 recent
          for (const p of recent) {
            const meta = PAGES[p];
            if (!meta) continue;
            html += `<a href="#" data-page="${p}" class="${activePage === p ? 'active' : ''}"><span class="bn-icon">${meta[0]}</span><span class="bn-label">${meta[1]}</span></a>`;
          }
          // More last
          html += `<a href="#" id="bottomNavMore"><span class="bn-icon">☰</span><span class="bn-label">More</span></a>`;
          return html;
        })()}
      </nav>
    </div>`;

  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.onclick = e => { e.preventDefault(); navigate(a.dataset.page); };
  });
  document.getElementById('logoutBtn').onclick = logout;

  // Bottom Nav handlers (mobile only)
  document.querySelectorAll('.bottom-nav a[data-page]').forEach(a => {
    a.onclick = e => { e.preventDefault(); navigate(a.dataset.page); };
  });
  const moreBtn = document.getElementById('bottomNavMore');
  if (moreBtn) {
    moreBtn.onclick = e => {
      e.preventDefault();
      const sb = document.getElementById('sidebarEl');
      if (sb) {
        sb.classList.toggle('mobile-drawer-open');
        if (sb.classList.contains('mobile-drawer-open')) {
          setTimeout(() => {
            if (typeof initDrawerSearch === 'function') initDrawerSearch();
            const inp = document.getElementById('drawerSearchInput');
            if (inp) inp.value = '';
          }, 50);
        }
      }
    };
  }
}

function navigate(page) {
  SESSION.currentPage = page;
  try { localStorage.setItem('uh_last_page', page); } catch(e) {}
  if (window.trackPageVisit) window.trackPageVisit(page);
  const map = {
    dashboard: renderDashboard,
    chat: renderChat,
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
    'financial-sheet': renderFinancialSheet,
    'airbnb-sync': renderAirbnbSync,
    'settings': renderSettings,
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
      // Don't change cleaning if it's already Dirty (guest may have complained)
      if (newC !== 'Dirty' && newC !== 'In Progress') newC = 'Clean';
    } else {
      newS = 'Free';
      if (latest) {
        const lc = cf.last_cleaned || null;
        const co = latest.check_out || null;
        // Mark dirty if cleaned before last checkout
        if (!(lc && co && lc >= co) && newC !== 'In Progress') {
          newC = 'Dirty';
        }
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
  if (!data?.signedUrl) { fsn.error('Error', '⚠️ Photo load failed'); return; }
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
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <div class="section-title" style="margin:0;">All Users (${(profiles || []).length})</div>
        ${window.canDelete && window.canDelete() ? `
          <button class="btn-sm danger" onclick="forceLogoutAll()" style="background:#dc2626;">🚪 Logout All Users</button>
        ` : ''}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Role</th><th>Provider</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${(profiles || []).map(p => `<tr>
          <td>
            ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:6px;" />` : ''}
            <strong>${p.display_name || '-'}</strong>
          </td>
          <td><span class="badge ${p.role === 'owner' ? 'green' : p.role === 'manager' ? 'blue' : 'yellow'}">${(({
              'c6343844-a307-4668-9b16-1947a0c0f8fa': 'Manager',
              'e3717cbd-da9a-495e-a940-2995021e8ca2': 'Developer'
            })[p.user_id]) || p.role}</span></td>
          <td>${p.auth_provider || 'email'}</td>
          <td><span class="badge ${p.is_approved ? 'green' : 'yellow'}">${p.is_approved ? 'Active' : 'Pending'}</span></td>
          <td class="table-actions">
            <button class="btn-sm" onclick="changeUserRole('${p.user_id}','${p.display_name || ''}')">🔧 Role</button>
            ${window.canDelete && window.canDelete() && p.user_id !== SESSION.userId ? `
              <button class="btn-sm" style="background:#f59e0b;color:#fff;" onclick="forceLogoutUser('${p.user_id}','${p.display_name || ''}')" title="Force logout this user">🚪</button>
            ` : ''}
            ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="deleteUser('${p.user_id}','${p.display_name || ''}')">🗑️</button>` : ''}
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
          <option value="developer">🔴 Developer (Full + Delete)</option>
          <option value="owner">🟠 Owner (Full, No Delete)</option>
          <option value="moderator">🟡 Moderator (Booking + ID + WhatsApp)</option>
          <option value="viewer">👁️ Viewer (View Only - 4 items)</option>
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
      caretaker: '🏠 Caretaker - view own assigned property bookings, guests, checkins. Report to Manager.',
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
      fsn.success(`Success`, `✅ ${displayName} approved as ${role}`);
      renderUserManagement();
    } catch (err) {
      fsn.error('Error', '❌ Approve failed: ' + (err.message || err));
    }
  });
}

// ============ CHANGE USER ROLE ============
async function changeUserRole(userId, name) {
  showRolePickerModal(userId, name, async (role) => {
    try {
      const { error: updErr } = await sb.from('profiles').update({ role }).eq('user_id', userId);
      if (updErr) { fsn.error('Role Change Failed', updErr.message); return; }
      fsn.success(`Success`, `✅ Role changed to ${role}`);
      renderUserManagement();
    } catch (err) {
      fsn.error('Error', '❌ Role change failed: ' + (err.message || err));
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
  if (window.canDelete && !window.canDelete()) { fsn.error('Denied', 'Only Super Admin can delete users'); return; }
  if (!confirm(`Delete user "${name}"?\n\nProfile + pending entry delete hogi. Auth user remain karega.`)) return;
  try {
    const { error: delErr } = await sb.from('profiles').delete().eq('user_id', userId);
    if (delErr) { fsn.error('Delete Failed', delErr.message); return; }
    await sb.from('pending_users').delete().eq('user_id', userId);
    fsn.success(`Success`, `✅ ${name} deleted`);
    renderUserManagement();
  } catch (err) {
    fsn.error('Error', '❌ Delete failed: ' + (err.message || err));
  }
}


// ============ FINANCIAL GOOGLE SHEET ============
function renderFinancialSheet() {
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1eOwfIghwul5W-JObh7SRkA1_xFy97CxUJmsO8b6K3K8/edit?usp=sharing';
  const embedUrl = 'https://docs.google.com/spreadsheets/d/1eOwfIghwul5W-JObh7SRkA1_xFy97CxUJmsO8b6K3K8/preview';

  renderShell(`
    <div class="card">
      <h1>📈 Financial Sheet</h1>
      <div class="sub">Live Google Sheet — internal financial records</div>
      <div class="btn-row" style="margin-top:8px;">
        <a href="${sheetUrl}" target="_blank" class="btn-sm">🔗 Open in Google Sheets</a>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <iframe
        src="${embedUrl}"
        style="width:100%;height:80vh;border:none;display:block;"
        allowfullscreen>
      </iframe>
    </div>
  `, 'financial-sheet');
}
// ============ START ============
init();

// ============ APP SETTINGS ============
async function renderSettings() {
  renderShell(`<div class="loading">Loading settings...</div>`, 'settings');

  const { data: settings } = await sb.from('app_settings').select('*').order('key');

  renderShell(`
    <div class="card">
      <h1>⚙️ App Settings</h1>
      <div class="sub">Manage brand info, links, phone numbers, and defaults</div>
    </div>

    <div class="card">
      <div class="section-title">🔧 All Settings</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th style="width:200px;">Key</th>
          <th>Value</th>
          <th>Description</th>
          <th style="width:100px;">Action</th>
        </tr></thead>
        <tbody>
          ${(settings || []).map(s => `
            <tr>
              <td><strong>${s.key}</strong></td>
              <td>
                <input type="text" id="set_${s.key}" value="${(s.value || '').replace(/"/g, '&quot;')}"
                  style="width:100%;font-size:12px;padding:6px 8px;" />
              </td>
              <td style="font-size:12px;color:var(--muted);">${s.description || '-'}</td>
              <td>
                <button class="btn-sm green-btn" onclick="saveSetting('${s.key}')">💾 Save</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">➕ Add New Setting</div>
      <div class="form-grid">
        <div class="form-group"><label>Key</label><input id="newSetKey" placeholder="e.g. instagram_url" /></div>
        <div class="form-group"><label>Value</label><input id="newSetValue" placeholder="e.g. https://..." /></div>
      </div>
      <div class="form-group"><label>Description</label><input id="newSetDesc" placeholder="Optional" /></div>
      <button onclick="addSetting()" style="width:100%;margin-top:10px;">💾 Add Setting</button>
      <div id="settingErr"></div>
    </div>

    <div class="card" style="background:#FFF9E6;border-left:4px solid #FFB800;">
      <div class="section-title">💡 Where these are used:</div>
      <ul style="font-size:13px;line-height:2;padding-left:20px;">
        <li><strong>airbnb_review_link</strong> — Review request WhatsApp (Airbnb guests)</li>
        <li><strong>google_review_link</strong> — Review request WhatsApp (Offline guests)</li>
        <li><strong>owner_phone_1/2</strong> — All WhatsApp messages fallback contact</li>
        <li><strong>checkin_time/checkout_time</strong> — Default times in new bookings</li>
        <li><strong>website_url</strong> — Website link in all messages</li>
        <li><strong>brand_name</strong> — Displayed everywhere as brand</li>
      </ul>
    </div>
  `, 'settings');
}

async function saveSetting(key) {
  const value = document.getElementById(`set_${key}`).value.trim();
  const { error } = await sb.from('app_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    fsn.error('Error', '❌ ' + error.message);
    return;
  }
  fsn.success(`Success`, `✅ Updated: ${key}`);
  // Clear cache so new value picks up
  window._appSettings = null;
}

async function addSetting() {
  const key = document.getElementById('newSetKey').value.trim();
  const value = document.getElementById('newSetValue').value.trim();
  const desc = document.getElementById('newSetDesc').value.trim();

  if (!key || !value) {
    document.getElementById('settingErr').innerHTML = '<div class="error">Key and value required</div>';
    return;
  }

  const { error } = await sb.from('app_settings').insert({
    key, value, description: desc || null
  });

  if (error) {
    document.getElementById('settingErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }

  fsn.success(`Success`, `✅ Added: ${key}`);
  window._appSettings = null;
  renderSettings();
}

// Helper: Get setting value (cached)
async function getSetting(key, fallback = '') {
  if (!window._appSettings) {
    const { data } = await sb.from('app_settings').select('key, value');
    window._appSettings = {};
    (data || []).forEach(s => { window._appSettings[s.key] = s.value; });
  }
  return window._appSettings[key] || fallback;
}


async function startHeartbeat() {
  if (!SESSION.userId) return;
  // Update immediately
  await sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', SESSION.userId);
  // Then every 30 seconds
  setInterval(async () => {
    if (SESSION.userId) {
      await sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', SESSION.userId);
    }
  }, 30000);
}

async function getActiveUsers() {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await sb.from('profiles')
    .select('display_name, role, last_seen')
    .gte('last_seen', twoMinAgo)
    .order('last_seen', { ascending: false });
  return data || [];
}

// ═══════════════════════════════════════════════════════════
// 🎯 FULL SCREEN NOTIFICATION (fsn)
// Use: fsn.success('Saved!', 'Booking confirmed'); fsn.error('Failed'); etc.
// ═══════════════════════════════════════════════════════════
(function(){
  function show(type, title, message, autoClose) {
    // Remove any existing
    const existing = document.querySelector('.fsn-overlay');
    if (existing) existing.remove();

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '!' };
    const overlay = document.createElement('div');
    overlay.className = 'fsn-overlay';
    overlay.innerHTML = `
      <div class="fsn-card">
        <div class="fsn-icon ${type}">${icons[type] || 'ℹ'}</div>
        <div class="fsn-title">${title || ''}</div>
        ${message ? `<div class="fsn-message">${message}</div>` : ''}
        <button class="fsn-btn" data-fsn-close>OK</button>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('[data-fsn-close]').onclick = close;
    overlay.onclick = e => { if (e.target === overlay) close(); };

    // Haptic feedback on notification
    try {
      if (type === 'success') window.haptic && window.haptic.success();
      else if (type === 'error') window.haptic && window.haptic.error();
      else window.haptic && window.haptic.light();
    } catch(e) {}

    if (autoClose) setTimeout(close, autoClose);
    return close;
  }

  window.fsn = {
    success: (title, msg, auto) => show('success', title, msg, auto || 2500),
    error:   (title, msg, auto) => show('error',   title, msg, auto),
    info:    (title, msg, auto) => show('info',    title, msg, auto),
    warning: (title, msg, auto) => show('warning', title, msg, auto)
  };
})();

// ═══════════════════════════════════════════════════════════
/* DISABLED - causing refresh issues
// 🎯 PULL TO REFRESH — Mobile only
// ═══════════════════════════════════════════════════════════
(function(){
  if (window.matchMedia('(min-width: 769px)').matches) return;

  let startY = 0, currentY = 0, isPulling = false, isRefreshing = false;
  const THRESHOLD = 70;

  // Create indicator
  const indicator = document.createElement('div');
  indicator.className = 'ptr-indicator';
  indicator.innerHTML = '<div class="ptr-spinner"></div>';
  document.body.appendChild(indicator);

  function getScrollableParent() {
    const main = document.getElementById('mainContent');
    return main || document.scrollingElement || document.documentElement;
  }

  document.addEventListener('touchstart', e => {
    if (isRefreshing) return;
    const scroller = getScrollableParent();
    if (scroller.scrollTop > 5) return;
    startY = e.touches[0].clientY;
    isPulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!isPulling || isRefreshing) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0 && diff < 150) {
      indicator.style.top = Math.min(20, -60 + diff * 0.6) + 'px';
      indicator.querySelector('.ptr-spinner').style.transform = `rotate(${diff * 3}deg)`;
      if (diff > THRESHOLD) indicator.classList.add('ptr-pulling');
      else indicator.classList.remove('ptr-pulling');
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isPulling) return;
    isPulling = false;
    const diff = currentY - startY;
    if (diff > THRESHOLD && !isRefreshing) {
      isRefreshing = true;
      indicator.classList.remove('ptr-pulling');
      indicator.classList.add('ptr-refreshing');
      // Re-render current page
      setTimeout(() => {
        try {
          const currentPage = SESSION.currentPage || 'dashboard';
          if (typeof navigate === 'function') navigate(currentPage);
        } catch(e) { console.warn('PTR refresh failed', e); }
        setTimeout(() => {
          indicator.classList.remove('ptr-refreshing');
          indicator.style.top = '-60px';
          isRefreshing = false;
        }, 500);
      }, 300);
    } else {
      indicator.style.top = '-60px';
      indicator.classList.remove('ptr-pulling');
    }
  }, { passive: true });
})();
*/

// ═══════════════════════════════════════════════════════════
// 🎯 SPLASH SCREEN — Hide after app boots
// ═══════════════════════════════════════════════════════════
(function(){
  function hideSplash() {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  }
  // Hide after DOM ready + minimum 800ms for branding
  if (document.readyState === 'complete') {
    setTimeout(hideSplash, 800);
  } else {
    window.addEventListener('load', () => setTimeout(hideSplash, 800));
  }
  // Failsafe — hide after 5s no matter what
  setTimeout(hideSplash, 5000);
})();

// ═══════════════════════════════════════════════════════════
// 🎯 HAPTIC FEEDBACK — Vibrate on tap (Android)
// ═══════════════════════════════════════════════════════════
window.haptic = {
  light:  () => { try { navigator.vibrate && navigator.vibrate(10); } catch(e) {} },
  medium: () => { try { navigator.vibrate && navigator.vibrate(20); } catch(e) {} },
  heavy:  () => { try { navigator.vibrate && navigator.vibrate([30, 10, 30]); } catch(e) {} },
  success:() => { try { navigator.vibrate && navigator.vibrate([15, 30, 15]); } catch(e) {} },
  error:  () => { try { navigator.vibrate && navigator.vibrate([50, 30, 50]); } catch(e) {} }
};

// Auto-trigger haptic on nav clicks (mobile only)
document.addEventListener('click', (e) => {
  if (!window.matchMedia('(max-width: 768px)').matches) return;
  const t = e.target.closest('.bottom-nav a, .sidebar-nav a, .btn-sm, button.btn');
  if (t) window.haptic.light();
}, true);

// ═══════════════════════════════════════════════════════════
// 🎯 DRAWER SEARCH — Filter menu items live
// ═══════════════════════════════════════════════════════════
function initDrawerSearch() {
  const input = document.getElementById('drawerSearchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const nav = document.querySelector('aside.sidebar.mobile-drawer-open .sidebar-nav');
    if (!nav) return;
    const items = nav.querySelectorAll('a[data-page]');
    const sections = nav.querySelectorAll('.nav-section-heading');

    items.forEach(a => {
      const txt = (a.textContent || '').toLowerCase();
      if (!q || txt.includes(q)) a.classList.remove('filter-hidden');
      else a.classList.add('filter-hidden');
    });

    // Hide section if all its items hidden
    sections.forEach(sec => {
      let next = sec.nextElementSibling;
      let hasVisible = false;
      while (next && !next.classList.contains('nav-section-heading')) {
        if (next.tagName === 'A' && !next.classList.contains('filter-hidden')) {
          hasVisible = true; break;
        }
        next = next.nextElementSibling;
      }
      if (!hasVisible && q) sec.classList.add('filter-hidden');
      else sec.classList.remove('filter-hidden');
    });
  });
}
window.initDrawerSearch = initDrawerSearch;

// ═══════════════════════════════════════════════════════════
// 🎯 SKELETON LOADER HELPER
// Usage: showSkeleton(elementId, 'cards' | 'table' | 'list')
// ═══════════════════════════════════════════════════════════
window.showSkeleton = function(target, type = 'cards', count = 5) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  let html = '<div class="skeleton-loading">';
  if (type === 'cards') {
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton skeleton-line title"></div>
          <div class="skeleton skeleton-line lg"></div>
          <div class="skeleton skeleton-line md"></div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <div class="skeleton skeleton-badge"></div>
            <div class="skeleton skeleton-btn"></div>
          </div>
        </div>`;
    }
  } else if (type === 'table') {
    html += '<div class="skeleton-card">';
    for (let i = 0; i < count; i++) {
      html += `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0;">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex:1;">
          <div class="skeleton skeleton-line md"></div>
          <div class="skeleton skeleton-line sm"></div>
        </div>
        <div class="skeleton skeleton-badge"></div>
      </div>`;
    }
    html += '</div>';
  } else { // list
    html += '<div class="skeleton-card">';
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton skeleton-line lg"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 🎨 EMPTY STATE HELPER
// ═══════════════════════════════════════════════════════════
window.emptyState = function(config) {
  const c = config || {};
  const onclick = c.btnAction ? `onclick="${c.btnAction}"` : '';
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${c.icon || '📭'}</div>
      <div class="empty-state-title">${c.title || 'Nothing here yet'}</div>
      ${c.message ? `<div class="empty-state-message">${c.message}</div>` : ''}
      ${c.btnText ? `<button class="empty-state-btn" ${onclick}>${c.btnText}</button>` : ''}
    </div>`;
};

// ═══════════════════════════════════════════════════════════
// 💀 IMPROVED SKELETON HELPERS
// ═══════════════════════════════════════════════════════════
window.skeletonMetrics = function(count) {
  count = count || 4;
  let html = '<div class="skeleton-page-header"><div class="skeleton skeleton-line title" style="width:200px;"></div><div class="skeleton skeleton-line sm" style="margin-top:8px;"></div></div>';
  html += '<div class="skeleton-metrics">';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-metric-card">
        <div class="skeleton skeleton-line sm" style="margin-bottom:8px;"></div>
        <div class="skeleton skeleton-line" style="height:28px;width:70%;"></div>
        <div class="skeleton skeleton-line sm" style="margin-top:6px;"></div>
      </div>`;
  }
  html += '</div>';
  return html;
};

window.skeletonList = function(count) {
  count = count || 5;
  let html = '<div class="skeleton-page-header"><div class="skeleton skeleton-line title" style="width:180px;"></div></div>';
  html += '<div class="skeleton-card" style="background:#fff;border-radius:12px;padding:12px;">';
  for (let i = 0; i < count; i++) {
    html += `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f5f5f5;">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1;">
        <div class="skeleton skeleton-line md"></div>
        <div class="skeleton skeleton-line sm" style="margin-top:6px;"></div>
      </div>
      <div class="skeleton skeleton-badge"></div>
    </div>`;
  }
  html += '</div>';
  return html;
};

// Show skeleton in main area (auto-detects)
window.showLoadingSkeleton = function(type) {
  const target = document.getElementById('mainContent') || document.getElementById('app');
  if (!target) return;
  const wrapper = '<div class="wrap">' +
    (type === 'metrics' ? window.skeletonMetrics(6) : window.skeletonList(6)) +
    '</div>';
  target.innerHTML = wrapper;
};

// ═══════════════════════════════════════════════════════════
// 🌙 DARK MODE MANAGER
// ═══════════════════════════════════════════════════════════
window.themeManager = (function() {
  const KEY = 'uh_theme';

  function get() {
    return localStorage.getItem(KEY) || 'light';
  }

  function apply(theme) {
    // Only allow light/dark
    if (theme !== 'light' && theme !== 'dark') {
      theme = 'light';
      localStorage.setItem(KEY, 'light');
    }
    document.documentElement.setAttribute('data-theme', theme);
    // Update theme-color meta for status bar
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0f1419' : '#E2725B');
    }
    // Update all toggle UIs
    document.querySelectorAll('.theme-toggle').forEach(el => {
      if (theme === 'dark') el.classList.add('active');
      else el.classList.remove('active');
    });
  }

  function toggle() {
    const current = get();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
    if (window.haptic) window.haptic.medium();
    return next;
  }

  function init() {
    apply(get());
  }

  // Apply immediately on load
  init();

  function set(theme) {
    localStorage.setItem(KEY, theme);
    apply(theme);
    if (window.haptic) window.haptic.medium();
  }
  return { get, apply, toggle, init, set };
})();

// ═══════════════════════════════════════════════════════════
// ⚙️ PREFERENCES PANEL — Theme + Notifications settings
// ═══════════════════════════════════════════════════════════
window.openPreferences = function() {
  const overlay = document.createElement('div');
  overlay.className = 'notif-panel-overlay show';
  const currentTheme = window.themeManager?.get() || 'light';
  overlay.innerHTML = `
    <div class="notif-panel" style="max-width:420px;">
      <div class="notif-panel-header">
        <h3>⚙️ Preferences</h3>
        <button class="notif-panel-close">×</button>
      </div>
      <div style="padding:20px;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:12px;">Appearance</div>

        <label style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--bg-tertiary,#f5f5f5);border-radius:10px;margin-bottom:8px;cursor:pointer;">
          <span style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
            <span>
              <div style="font-weight:600;">Dark Mode</div>
              <div style="font-size:12px;opacity:0.6;">Switch between light and dark themes</div>
            </span>
          </span>
          <div class="theme-toggle ${currentTheme === 'dark' ? 'active' : ''}" onclick="window.themeManager.toggle();this.classList.toggle('active');event.stopPropagation();">
            <div class="theme-toggle-switch"></div>
          </div>
        </label>

        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin:24px 0 12px;">Notifications</div>

        <button onclick="if(window.notifSettings){window.notifSettings.openSettings();document.querySelector('.notif-panel-overlay')?.remove();}" style="width:100%;padding:14px;background:var(--bg-tertiary,#f5f5f5);border:none;border-radius:10px;text-align:left;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">🔔</span>
          <span>
            <div style="font-weight:600;">Notification Settings</div>
            <div style="font-size:12px;opacity:0.6;">Choose what alerts to receive</div>
          </span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 250); };
  overlay.onclick = e => { if (e.target === overlay) close(); };
  overlay.querySelector('.notif-panel-close').onclick = close;
};


// ═══════════════════════════════════════════════════════════
// 📴 OFFLINE MODE MANAGER
// ═══════════════════════════════════════════════════════════
window.offlineManager = (function() {
  let banner = null;

  function createBanner() {
    if (banner) return banner;
    banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.innerHTML = '<span class="dot"></span><span class="msg">Offline — Showing cached data</span>';
    document.body.appendChild(banner);
    return banner;
  }

  function showOffline() {
    createBanner();
    banner.classList.remove('online');
    banner.querySelector('.msg').textContent = 'Offline — Showing cached data';
    banner.classList.add('show');
    document.body.classList.add('has-offline-banner');
    if (window.haptic) window.haptic.error();
  }

  function showOnline() {
    if (!banner) return;
    banner.classList.add('online');
    banner.querySelector('.msg').textContent = '✓ Back online';
    banner.classList.add('show');
    if (window.haptic) window.haptic.success();
    setTimeout(() => {
      banner.classList.remove('show');
      document.body.classList.remove('has-offline-banner');
    }, 2500);
  }

  function init() {
    if (!navigator.onLine) showOffline();

    window.addEventListener('online', () => {
      console.log('📶 Back online');
      showOnline();
      // Trigger current page refresh
      setTimeout(() => {
        try {
          if (typeof navigate === 'function' && SESSION.currentPage) {
            navigate(SESSION.currentPage);
          }
        } catch(e) {}
      }, 500);
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline');
      showOffline();
    });
  }

  return { init, showOffline, showOnline };
})();

// Init offline manager on load
if (document.readyState === 'complete') {
  window.offlineManager.init();
} else {
  window.addEventListener('load', () => window.offlineManager.init());
}

// ═══════════════════════════════════════════════════════════
// 📊 CHARTS HELPER (Chart.js)
// Usage: renderChart('canvasId', 'bar', { labels: [...], values: [...] })
// ═══════════════════════════════════════════════════════════
window.renderChart = function(canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return null;

  // Destroy previous instance
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f0f0f0' : '#333';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const defaultColors = ['#E2725B', '#16a34a', '#2563eb', '#d97706', '#8b5cf6', '#0891b2'];

  const config = {
    type: type,
    data: {
      labels: data.labels || [],
      datasets: [{
        label: data.label || '',
        data: data.values || [],
        backgroundColor: type === 'line' ? 'rgba(226,114,91,0.15)' :
                          type === 'doughnut' || type === 'pie' ? defaultColors :
                          '#E2725B',
        borderColor: type === 'line' ? '#E2725B' : (type === 'doughnut' || type === 'pie' ? defaultColors : '#E2725B'),
        borderWidth: type === 'line' ? 3 : 1,
        fill: type === 'line',
        tension: 0.35,
        borderRadius: type === 'bar' ? 6 : 0
      }]
    },
    options: Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type === 'doughnut' || type === 'pie',
          labels: { color: textColor, font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          backgroundColor: isDark ? '#0f1419' : '#1a1a1a',
          titleFont: { family: 'Inter', weight: 600 },
          bodyFont: { family: 'Inter' },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: (type === 'doughnut' || type === 'pie') ? {} : {
        y: {
          beginAtZero: true,
          ticks: { color: textColor, font: { family: 'Inter' } },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor, font: { family: 'Inter' } },
          grid: { display: false }
        }
      }
    }, options || {})
  };

  return new Chart(canvas, config);
};

// Quick chart HTML wrapper
window.chartCard = function(canvasId, title, height) {
  return `
    <div class="card" style="padding:16px;margin:12px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;">${title}</h3>
      <div style="position:relative;height:${height || 260}px;">
        <canvas id="${canvasId}"></canvas>
      </div>
    </div>`;
};

// ═══════════════════════════════════════════════════════════
// 🔙 BACK BUTTON HANDLER (PWA)
// Prevents app close on back press — navigates back through pages
// ═══════════════════════════════════════════════════════════
(function() {
  const NAV_HISTORY = [];

  // Wrap navigate() to track history
  if (typeof navigate === 'function' && !window._navigateWrapped) {
    const _origNavigate = window.navigate || navigate;
    window.navigate = function(page) {
      const current = SESSION.currentPage || 'dashboard';
      if (current !== page) {
        NAV_HISTORY.push(current);
        // Push state to browser history
        try {
          history.pushState({ page: current }, '', '#' + page);
        } catch(e) {}
      }
      return _origNavigate.apply(this, arguments);
    };
    window._navigateWrapped = true;
  }

  // Handle browser back button
  window.addEventListener('popstate', function(e) {
    if (NAV_HISTORY.length > 0) {
      const prevPage = NAV_HISTORY.pop();
      if (typeof _origNavigate === 'function') {
        _origNavigate(prevPage);
      } else if (typeof navigate === 'function') {
        // Direct call without wrapping
        SESSION.currentPage = prevPage;
        const map = window._navigateMap;
        if (map && map[prevPage]) map[prevPage]();
      }
    } else {
      // No history — go to dashboard instead of closing
      try { history.pushState({ page: 'dashboard' }, '', '#dashboard'); } catch(e) {}
      if (typeof navigate === 'function' && SESSION.currentPage !== 'dashboard') {
        navigate('dashboard');
      }
    }
  });

  // Push initial state
  try {
    history.replaceState({ page: 'dashboard' }, '', '#dashboard');
  } catch(e) {}

  console.log('🔙 Back button handler ready');
})();

// ═══════════════════════════════════════════════════════════
// 🔙 BACK BUTTON HANDLER (PWA)
// Prevents app close on back press — navigates back through pages
// ═══════════════════════════════════════════════════════════
(function() {
  const NAV_HISTORY = [];

  // Wrap navigate() to track history
  if (typeof navigate === 'function' && !window._navigateWrapped) {
    const _origNavigate = window.navigate || navigate;
    window.navigate = function(page) {
      const current = SESSION.currentPage || 'dashboard';
      if (current !== page) {
        NAV_HISTORY.push(current);
        // Push state to browser history
        try {
          history.pushState({ page: current }, '', '#' + page);
        } catch(e) {}
      }
      return _origNavigate.apply(this, arguments);
    };
    window._navigateWrapped = true;
  }

  // Handle browser back button
  window.addEventListener('popstate', function(e) {
    if (NAV_HISTORY.length > 0) {
      const prevPage = NAV_HISTORY.pop();
      if (typeof _origNavigate === 'function') {
        _origNavigate(prevPage);
      } else if (typeof navigate === 'function') {
        // Direct call without wrapping
        SESSION.currentPage = prevPage;
        const map = window._navigateMap;
        if (map && map[prevPage]) map[prevPage]();
      }
    } else {
      // No history — go to dashboard instead of closing
      try { history.pushState({ page: 'dashboard' }, '', '#dashboard'); } catch(e) {}
      if (typeof navigate === 'function' && SESSION.currentPage !== 'dashboard') {
        navigate('dashboard');
      }
    }
  });

  // Push initial state
  try {
    history.replaceState({ page: 'dashboard' }, '', '#dashboard');
  } catch(e) {}

  console.log('🔙 Back button handler ready');
})();

// ═══════════════════════════════════════════════════════════
// 📱 AUTO CARD LABELS — Add data-label from <th> to <td> for mobile card view
// ═══════════════════════════════════════════════════════════
(function() {
  function addTableLabels() {
    document.querySelectorAll('table').forEach(table => {
      const headers = Array.from(table.querySelectorAll('thead th')).map(th =>
        th.textContent.trim()
      );
      if (headers.length === 0) return;
      table.querySelectorAll('tbody tr').forEach(tr => {
        tr.querySelectorAll('td').forEach((td, i) => {
          if (headers[i] && !td.hasAttribute('data-label')) {
            td.setAttribute('data-label', headers[i]);
          }
        });
      });
    });
  }

  // Run on any DOM change (SPA)
  const observer = new MutationObserver(addTableLabels);
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTableLabels);
  } else {
    addTableLabels();
  }
})();


// ═══════════════════════════════════════════════════════════
// 🚪 FORCE LOGOUT — Developer only
// ═══════════════════════════════════════════════════════════
window.forceLogoutUser = async function(userId, name) {
  if (!window.canDelete || !window.canDelete()) {
    if (window.fsn) fsn.error('Denied', 'Only Developer can force logout users');
    return;
  }
  if (userId === SESSION.userId) {
    if (window.fsn) fsn.warning('Cannot', 'You cannot force-logout yourself');
    return;
  }
  if (!confirm('Force logout "' + name + '"?\n\nThey will be immediately logged out.')) return;

  try {
    const { error } = await sb.from('profiles').update({ is_approved: false }).eq('user_id', userId);
    if (error) throw error;
    setTimeout(async () => {
      await sb.from('profiles').update({ is_approved: true }).eq('user_id', userId);
    }, 3000);
    if (window.fsn) fsn.success('Success', name + ' has been logged out');
    if (typeof renderUserManagement === 'function') renderUserManagement();
  } catch (e) {
    if (window.fsn) fsn.error('Failed', e.message);
  }
};

window.forceLogoutAll = async function() {
  if (!window.canDelete || !window.canDelete()) {
    if (window.fsn) fsn.error('Denied', 'Only Developer can force logout users');
    return;
  }
  if (!confirm('Force logout ALL users (except yourself)?\n\nEveryone will need to login again.')) return;

  try {
    const { data: users } = await sb.from('profiles').select('user_id, display_name').neq('user_id', SESSION.userId);
    if (!users || users.length === 0) {
      if (window.fsn) fsn.info('Info', 'No other users');
      return;
    }
    const userIds = users.map(u => u.user_id);
    const { error } = await sb.from('profiles').update({ is_approved: false }).in('user_id', userIds);
    if (error) throw error;
    setTimeout(async () => {
      await sb.from('profiles').update({ is_approved: true }).in('user_id', userIds);
    }, 3000);
    if (window.fsn) fsn.success('Success', users.length + ' users logged out');
    if (typeof renderUserManagement === 'function') renderUserManagement();
  } catch (e) {
    if (window.fsn) fsn.error('Failed', e.message);
  }
};

// ═══════════════════════════════════════════════════════════
// 🔒 AUTO LOGOUT WATCHER — Check if force-logged-out by admin
// ═══════════════════════════════════════════════════════════
(function() {
  let logoutCheckTimer = null;

  function startLogoutWatch() {
    if (logoutCheckTimer) clearInterval(logoutCheckTimer);
    if (!SESSION.userId) return;

    logoutCheckTimer = setInterval(async () => {
      if (!SESSION.userId || !sb) return;
      try {
        const { data, error } = await sb.from('profiles')
          .select('is_approved')
          .eq('user_id', SESSION.userId)
          .single();

        if (error) return;

        if (data && data.is_approved === false) {
          clearInterval(logoutCheckTimer);
          console.log('🚪 Force logout detected by admin');
          if (window.fsn) {
            fsn.warning('Logged Out', 'You have been logged out by admin');
          }
          setTimeout(() => {
            if (typeof logout === 'function') logout();
            else location.reload();
          }, 2000);
        }
      } catch(e) {}
    }, 10000); // Check every 10 seconds
  }

  // Start when SESSION ready
  const checkTimer = setInterval(() => {
    if (window.SESSION && window.SESSION.userId && window.sb) {
      clearInterval(checkTimer);
      startLogoutWatch();
      console.log('🔒 Logout watcher active (checks every 10s)');
    }
  }, 1000);

  window.addEventListener('beforeunload', () => {
    if (logoutCheckTimer) clearInterval(logoutCheckTimer);
  });
})();


// Expose autoCheckout globally for auto-sync after checkout
if (typeof autoCheckout === 'function') {
  window.autoCheckout = autoCheckout;
}
