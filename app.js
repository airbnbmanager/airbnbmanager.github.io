/**
 * ===================================
 * Project: The Unique Haven Homes Pvt Ltd — Property Manager
 * Developer: Praveen Singh
 * ===================================
 */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const appEl = document.getElementById("app");
const BRAND = "UNIQUE HAVEN HOME STAY PVT LTD";

let SESSION = {
  userId: null, role: null, empId: null, investorId: null,
  displayName: null, currentPage: 'dashboard', bookingFilter: 'All'
};

// ============ INIT ============
async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { renderLogin(); }
    else { await loadProfile(session.user.id); }
  } catch (err) {
    showError("Setup abhi incomplete hai. config.js check karo.", err);
  }
}

async function loadProfile(userId) {
  const { data: profile, error } = await sb
    .from("profiles").select("role, emp_id, investor_id, display_name")
    .eq("user_id", userId).single();

  if (error || !profile) { showError("Profile nahi mila. Owner se contact karo."); return; }

  SESSION.userId = userId;
  SESSION.role = profile.role;
  SESSION.empId = profile.emp_id;
  SESSION.investorId = profile.investor_id;
  SESSION.displayName = profile.display_name || profile.role;

  if (profile.role === 'employee') renderEmployeeView();
  else if (profile.role === 'investor') renderInvestorView();
  else renderDashboard();
}

function showError(msg, err = null) {
  appEl.innerHTML = `<div class="wrap"><div class="card">
    <h1>⚠️ Error</h1><div class="error">${msg}${err ? '<br><br>' + err.message : ''}</div>
  </div></div>`;
}

async function logout() {
  await sb.auth.signOut();
  SESSION = { userId:null, role:null, empId:null, investorId:null, displayName:null, currentPage:'dashboard', bookingFilter:'All' };
  renderLogin();
}

// ============ LOGIN ============
function renderLogin() {
  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <h1>🏡 ${BRAND}</h1>
        <div class="sub">Login karo apne credentials se</div>
        <input id="email" type="email" placeholder="Email" />
        <input id="password" type="password" placeholder="Password" />
        <button id="loginBtn">Login</button>
        <div id="err"></div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;">
          Developed by <strong style="color:#666;">Praveen Singh</strong>
        </div>
      </div>
    </div>`;

  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { document.getElementById("err").innerHTML = `<div class="error">${error.message}</div>`; return; }
    await loadProfile(data.user.id);
  };
}

// ============ SHELL (sidebar) ============
function renderShell(content, activePage = 'dashboard') {
  const isOwnerOrViewer = SESSION.role === 'owner' || SESSION.role === 'viewer';
  if (!isOwnerOrViewer) { appEl.innerHTML = content; return; }

  const isOwner = SESSION.role === 'owner';
  const navItems = [
    ['dashboard', '📊 Dashboard'],
    ['reports', '📈 Reports'],
    ['rooms', '🏠 Manage Rooms'],
    ['flats', '🛏️ Flats Status'],
    ['bookings', '📅 Manage Bookings'],
    ['employees', '👥 Manage Employees'],
    ['tasks', '🧰 Employee Tasks'],
    ['attendance', '📋 Attendance'],
    ['att-summary', '📅 Monthly Summary'],
    ['salary', '💰 Salary Tracker'],
    ['advance', '💵 Advance Tracker'],
  ];
  if (isOwner) {
    navItems.push(['store', '📦 Manage Store']);
    navItems.push(['investors', '🧑‍💼 Sub-Owners']);
  }

  appEl.innerHTML = `
    <div class="app-container">
      <aside class="sidebar">
        <h2>🏡 ${BRAND}</h2>
        <div class="sub" style="padding:0 20px 12px;color:rgba(255,255,255,0.7);">
          👋 ${SESSION.displayName} <span class="badge blue">${SESSION.role}</span>
        </div>
        <nav>
          ${navItems.map(([key,label]) => `
            <a href="#" data-page="${key}" class="${activePage===key?'active':''}">${label}</a>`).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="logout-link" id="logoutBtn">🚪 Logout</div>
          <div class="sidebar-credit">⚡ Developed by<br><strong style="color:rgba(255,255,255,0.75);">Praveen Singh</strong></div>
        </div>
      </aside>
      <main class="main-content" id="mainContent">${content}</main>
    </div>`;

  document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.onclick = (e) => { e.preventDefault(); SESSION.currentPage = e.target.dataset.page; navigate(e.target.dataset.page); };
  });
  document.getElementById('logoutBtn').onclick = logout;
}

function navigate(page) {
  switch(page) {
    case 'dashboard':   renderDashboard(); break;
    case 'reports':     renderReports(); break;
    case 'rooms':       renderManageRooms(); break;
    case 'flats':       renderFlatsStatus(); break;
    case 'bookings':    renderManageBookings(); break;
    case 'employees':   renderManageEmployees(); break;
    case 'tasks':       renderEmployeeTasks(); break;
    case 'attendance':  renderAttendance(); break;
    case 'att-summary': renderAttendanceSummary(); break;
    case 'salary':      renderSalaryTracker(); break;
    case 'advance':     renderAdvanceTracker(); break;
    case 'store':       renderManageStore(); break;
    case 'investors':   renderManageInvestors(); break;
    default:            renderDashboard();
  }
}

// helper: fetch every booking's total paid (sum of payment_history) in one query
async function getPaidMap(bookingIds) {
  if (!bookingIds.length) return {};
  const { data } = await sb.from('payment_history').select('booking_id, amount').in('booking_id', bookingIds);
  const map = {};
  (data || []).forEach(p => { map[p.booking_id] = (map[p.booking_id] || 0) + (p.amount || 0); });
  return map;
}

// ============ DASHBOARD ============
async function renderDashboard() {
  renderShell(`<div class="loading">Loading dashboard...</div>`, 'dashboard');

  const [rooms, flats, employees, salary, advance, guests, attendance, tasks] = await Promise.all([
    sb.from("rooms").select("room_id, bookable"),
    sb.from("flats_status").select("status, cleaning_status"),
    sb.from("employees").select("emp_id"),
    sb.from("salary_tracker").select("salary_due, salary_paid"),
    sb.from("advance_tracker").select("advance_amount, repaid_amount"),
    sb.from("guest_register").select("booking_id, total_amount, booking_mode"),
    sb.from("attendance_log").select("status, att_date"),
    sb.from("employee_tasks").select("status"),
  ]);

  const filter = SESSION.bookingFilter || 'All';
  const guestRows = (guests.data || []).filter(g => filter === 'All' || g.booking_mode === filter);
  const paidMap = await getPaidMap(guestRows.map(g => g.booking_id));
  const guestBalance = guestRows.reduce((s,g) => s + ((g.total_amount||0) - (paidMap[g.booking_id]||0)), 0);
  const totalRevenue = guestRows.reduce((s,g) => s + (paidMap[g.booking_id]||0), 0);

  const totalRooms  = rooms.data?.length || 0;
  const notBookable = rooms.data?.filter(r => r.bookable === false).length || 0;
  const free        = flats.data?.filter(f => f.status === "Free").length || 0;
  const booked      = flats.data?.filter(f => f.status === "Booked").length || 0;
  const dirty       = flats.data?.filter(f => f.cleaning_status === "Dirty").length || 0;
  const totalEmp    = employees.data?.length || 0;

  const pendingSalary  = (salary.data||[]).reduce((s,r)=>s+((r.salary_due||0)-(r.salary_paid||0)),0);
  const pendingAdvance = (advance.data||[]).reduce((s,r)=>s+((r.advance_amount||0)-(r.repaid_amount||0)),0);

  const today        = new Date().toISOString().slice(0,10);
  const presentToday  = (attendance.data||[]).filter(a=>a.att_date===today&&a.status==="Present").length;
  const absentToday   = (attendance.data||[]).filter(a=>a.att_date===today&&a.status==="Absent").length;
  const pendingTasks  = (tasks.data||[]).filter(t=>t.status==="Pending").length;

  const metrics = [
    ["Total Rooms", totalRooms, false],
    ["Rooms Not Bookable", notBookable, notBookable>0],
    ["Rooms Free Now", free, false],
    ["Rooms Booked Now", booked, false],
    ["Rooms Dirty", dirty, dirty>0],
    ["Total Employees", totalEmp, false],
    [`Revenue Received (${filter}) (₹)`, totalRevenue.toLocaleString("en-IN"), false],
    [`Guest Balance Due (${filter}) (₹)`, guestBalance.toLocaleString("en-IN"), guestBalance>0],
    ["Pending Salary (₹)", pendingSalary.toLocaleString("en-IN"), pendingSalary>0],
    ["Advance Outstanding (₹)", pendingAdvance.toLocaleString("en-IN"), pendingAdvance>0],
    ["Present Today", presentToday, false],
    ["Absent Today", absentToday, absentToday>0],
    ["Pending Tasks", pendingTasks, pendingTasks>0],
  ];

  const content = `
    <div class="card">
      <h1>📊 Dashboard</h1>
      <div class="sub">Live data — ${BRAND}</div>
      <label style="font-size:13px;color:#445;">Booking Filter</label>
      <select id="bookingFilterSel">
        <option value="All" ${filter==='All'?'selected':''}>Sab (Online + Offline)</option>
        <option value="Online-Airbnb" ${filter==='Online-Airbnb'?'selected':''}>Online (Airbnb)</option>
        <option value="Offline" ${filter==='Offline'?'selected':''}>Offline (Direct)</option>
      </select>
    </div>
    <div class="card">
      ${metrics.map(([label,val,warn]) => `
        <div class="metric-row"><span class="metric-label">${label}</span>
        <span class="metric-value ${warn?'warn':''}">${val}</span></div>`).join("")}
    </div>`;

  renderShell(content, 'dashboard');
  document.getElementById('bookingFilterSel').onchange = (e) => {
    SESSION.bookingFilter = e.target.value; renderDashboard();
  };
}

// ============ REPORTS (charts) ============
async function renderReports() {
  renderShell(`<div class="loading">Building reports...</div>`, 'reports');

  const [guests, flats, attendance] = await Promise.all([
    sb.from('guest_register').select('booking_id, booking_mode, check_in, total_amount'),
    sb.from('flats_status').select('status'),
    sb.from('attendance_log').select('emp_id, status, att_date, employees(name)'),
  ]);

  const bookingIds = (guests.data||[]).map(g=>g.booking_id);
  const paidMap = await getPaidMap(bookingIds);

  const months = [];
  const now = new Date();
  for (let i=5;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toISOString().slice(0,7));
  }
  const monthlyOnline = months.map(m => (guests.data||[])
    .filter(g => g.check_in?.startsWith(m) && g.booking_mode==='Online-Airbnb')
    .reduce((s,g)=>s+(paidMap[g.booking_id]||0),0));
  const monthlyOffline = months.map(m => (guests.data||[])
    .filter(g => g.check_in?.startsWith(m) && g.booking_mode!=='Online-Airbnb')
    .reduce((s,g)=>s+(paidMap[g.booking_id]||0),0));

  const onlineCount  = (guests.data||[]).filter(g=>g.booking_mode==='Online-Airbnb').length;
  const offlineCount = (guests.data||[]).filter(g=>g.booking_mode!=='Online-Airbnb').length;

  const free    = (flats.data||[]).filter(f=>f.status==='Free').length;
  const booked  = (flats.data||[]).filter(f=>f.status==='Booked').length;
  const blocked = (flats.data||[]).filter(f=>f.status==='Blocked-Maintenance').length;

  const thisMonth = new Date().toISOString().slice(0,7);
  const empNames = [...new Set((attendance.data||[]).map(a => a.employees?.name).filter(Boolean))];
  const attPct = empNames.map(name => {
    const rows = (attendance.data||[]).filter(a => a.employees?.name===name && a.att_date?.startsWith(thisMonth));
    const present = rows.filter(r=>r.status==='Present').length;
    const half = rows.filter(r=>r.status==='Half Day').length;
    const total = rows.length;
    return total>0 ? Math.round(((present+half*0.5)/total)*100) : 0;
  });

  renderShell(`
    <div class="card"><h1>📈 Reports & Analysis</h1><div class="sub">${BRAND}</div></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">Revenue by Month (₹) — Online vs Offline</h2>
      <canvas id="chartRevenue" height="180"></canvas></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">Bookings: Online vs Offline</h2>
      <canvas id="chartBookings" height="180"></canvas></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">Room Occupancy Right Now</h2>
      <canvas id="chartOccupancy" height="180"></canvas></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">This Month's Attendance % by Employee</h2>
      <canvas id="chartAttendance" height="180"></canvas></div>
  `, 'reports');

  new Chart(document.getElementById('chartRevenue'), {
    type: 'bar',
    data: { labels: months, datasets: [
      { label:'Online (Airbnb)', data: monthlyOnline, backgroundColor:'#E2725B' },
      { label:'Offline', data: monthlyOffline, backgroundColor:'#F0B79A' },
    ]},
    options: { responsive:true, scales:{ x:{stacked:true}, y:{stacked:true} } }
  });

  new Chart(document.getElementById('chartBookings'), {
    type: 'doughnut',
    data: { labels:['Online (Airbnb)','Offline'], datasets:[{ data:[onlineCount, offlineCount], backgroundColor:['#E2725B','#F0B79A'] }] },
    options: { responsive:true }
  });

  new Chart(document.getElementById('chartOccupancy'), {
    type: 'pie',
    data: { labels:['Free','Booked','Blocked/Maintenance'], datasets:[{ data:[free,booked,blocked], backgroundColor:['#DCEFDC','#E1EEF0','#FBE0DD'] }] },
    options: { responsive:true }
  });

  new Chart(document.getElementById('chartAttendance'), {
    type: 'bar',
    data: { labels: empNames, datasets:[{ label:'Attendance %', data: attPct, backgroundColor:'#E2725B' }] },
    options: { responsive:true, indexAxis:'y', scales:{ x:{ max:100 } } }
  });
}

// ============ MANAGE ROOMS ============
async function renderManageRooms() {
  renderShell(`<div class="loading">Loading rooms...</div>`, 'rooms');
  const { data: rooms, error } = await sb.from("rooms").select("*").order("room_id");
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'rooms'); return; }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>🏠 Manage Rooms</h1>
      <div class="sub">${rooms.length} properties total</div>
      ${isOwner ? `<button onclick="renderAddRoom()">➕ Add New Property</button>` : ''}
    </div>
    <div class="card">
      <div style="overflow-x:auto;">
      <table>
        <thead><tr>
          <th>Flat ID</th><th>Property</th><th>Unit</th><th>Floor</th><th>Nickname</th>
          <th>Rent/Night</th><th>Max Guests</th><th>Mode</th><th>Bookable</th>
          ${isOwner ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${rooms.map(r => `
            <tr>
              <td><strong>${r.room_id}</strong></td>
              <td>${r.property_name||'-'}</td>
              <td>${r.unit_type||'-'} · ${r.unit_no||'-'}</td>
              <td>${r.floor||'-'}</td>
              <td>${r.nickname||'-'}</td>
              <td>₹${r.rent_per_night||0}</td>
              <td>${r.max_guests||'-'}</td>
              <td><span class="badge ${r.mode==='On'?'green':'yellow'}">${r.mode||'On'}</span></td>
              <td><span class="badge ${r.bookable?'green':'red'}">${r.bookable?'Yes':'No'}</span></td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editRoom('${r.room_id}')">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteRoom('${r.room_id}','${r.unit_no}')">🗑️ Delete</button>
                </td>` : ''}
            </tr>`).join("")}
        </tbody>
      </table>
      </div>
    </div>`;
  renderShell(content, 'rooms');
}

function roomFormFields(r = {}) {
  return `
    <input id="roomId" value="${r.room_id||''}" placeholder="Flat ID (e.g. GOM-601)" ${r.room_id?'readonly':''} />
    <input id="propertyName" value="${r.property_name||''}" placeholder="Property/Building Name" />
    <input id="address" value="${r.address||''}" placeholder="Address" />
    <select id="unitType">
      <option value="Flat" ${r.unit_type==='Flat'?'selected':''}>Flat</option>
      <option value="Villa" ${r.unit_type==='Villa'?'selected':''}>Villa</option>
    </select>
    <input id="unitNo" value="${r.unit_no||''}" placeholder="Unit No (e.g. FLAT101, Villa (One))" />
    <input id="floor" value="${r.floor||''}" placeholder="Floor (e.g. 1st, 2nd, ALL)" />
    <input id="nickname" value="${r.nickname||''}" placeholder="Nickname (e.g. Red Rose)" />
    <input id="rent" type="number" value="${r.rent_per_night||''}" placeholder="Rent per Night (₹)" />
    <input id="maxGuests" type="number" value="${r.max_guests||''}" placeholder="Max Guests" />
    <select id="mode">
      <option value="On" ${r.mode!=='Off'?'selected':''}>On (Listed)</option>
      <option value="Off" ${r.mode==='Off'?'selected':''}>Off (Not listed)</option>
    </select>
    <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
      <input type="checkbox" id="bookable" ${r.bookable!==false?'checked':''} style="width:auto;" />
      <span>Bookable</span>
    </label>
    <textarea id="notes" placeholder="Notes">${r.notes||''}</textarea>`;
}

async function renderAddRoom() {
  renderShell(`
    <div class="card"><h1>➕ Add New Property</h1>
      <button class="secondary" onclick="renderManageRooms()">← Back</button></div>
    <div class="card">${roomFormFields()}
      <button onclick="saveNewRoom()">💾 Save Property</button>
      <div id="addErr"></div>
    </div>`, 'rooms');
}

function collectRoomForm() {
  return {
    room_id: document.getElementById('roomId').value.trim(),
    property_name: document.getElementById('propertyName').value.trim() || null,
    address: document.getElementById('address').value.trim() || null,
    unit_type: document.getElementById('unitType').value,
    unit_no: document.getElementById('unitNo').value.trim(),
    floor: document.getElementById('floor').value.trim() || null,
    nickname: document.getElementById('nickname').value.trim() || null,
    rent_per_night: parseFloat(document.getElementById('rent').value) || null,
    max_guests: parseInt(document.getElementById('maxGuests').value) || null,
    mode: document.getElementById('mode').value,
    bookable: document.getElementById('bookable').checked,
    notes: document.getElementById('notes').value.trim() || null,
  };
}

async function saveNewRoom() {
  const obj = collectRoomForm();
  if (!obj.room_id || !obj.unit_no) {
    document.getElementById('addErr').innerHTML = '<div class="error">Flat ID aur Unit No required hai</div>';
    return;
  }
  const { error } = await sb.from('rooms').insert(obj);
  if (error) { document.getElementById('addErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  await sb.from('flats_status').insert({ room_id: obj.room_id, status:'Free', cleaning_status:'Clean' });
  renderManageRooms();
}

async function editRoom(roomId) {
  const { data: room, error } = await sb.from('rooms').select('*').eq('room_id', roomId).single();
  if (error || !room) { alert('Room not found'); return; }
  renderShell(`
    <div class="card"><h1>✏️ Edit Property</h1>
      <button class="secondary" onclick="renderManageRooms()">← Back</button></div>
    <div class="card">${roomFormFields(room)}
      <button onclick="updateRoom('${roomId}')">💾 Update Property</button>
      <div id="editErr"></div>
    </div>`, 'rooms');
}

async function updateRoom(roomId) {
  const obj = collectRoomForm();
  delete obj.room_id;
  if (!obj.unit_no) { document.getElementById('editErr').innerHTML = '<div class="error">Unit No required</div>'; return; }
  const { error } = await sb.from('rooms').update(obj).eq('room_id', roomId);
  if (error) { document.getElementById('editErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageRooms();
}

async function deleteRoom(roomId, unitNo) {
  if (!confirm(`Delete property "${unitNo}"? This cannot be undone.`)) return;
  await sb.from('flats_status').delete().eq('room_id', roomId);
  const { error } = await sb.from('rooms').delete().eq('room_id', roomId);
  if (error) { alert('Error: ' + error.message); return; }
  renderManageRooms();
}

// ============ FLATS STATUS ============
async function renderFlatsStatus() {
  renderShell(`<div class="loading">Loading flats status...</div>`, 'flats');
  const { data: flats, error } = await sb.from('flats_status')
    .select('*, rooms(unit_no, nickname, property_name)').order('room_id');
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'flats'); return; }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card"><h1>🛏️ Flats Status (Live)</h1><div class="sub">${flats.length} flats total</div></div>
    <div class="card"><div style="overflow-x:auto;">
      <table>
        <thead><tr><th>Property</th><th>Unit</th><th>Nickname</th><th>Status</th>
          <th>Cleaning</th><th>Issue</th><th>Last Cleaned</th>${isOwner?'<th>Actions</th>':''}</tr></thead>
        <tbody>
          ${flats.map(f => `
            <tr>
              <td>${f.rooms?.property_name||'-'}</td>
              <td><strong>${f.rooms?.unit_no || f.room_id}</strong></td>
              <td>${f.rooms?.nickname||'-'}</td>
              <td><span class="badge ${f.status==='Free'?'green':f.status==='Booked'?'blue':'red'}">${f.status||'Free'}</span></td>
              <td><span class="badge ${f.cleaning_status==='Clean'?'green':f.cleaning_status==='In Progress'?'yellow':'red'}">${f.cleaning_status||'Clean'}</span></td>
              <td>${f.issue||'-'}</td>
              <td>${f.last_cleaned||'-'}</td>
              ${isOwner ? `<td><button class="btn-sm" onclick="editFlatStatus('${f.room_id}')">✏️ Edit</button></td>` : ''}
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  renderShell(content, 'flats');
}

async function editFlatStatus(roomId) {
  const { data: flat, error } = await sb.from('flats_status')
    .select('*, rooms(unit_no, nickname)').eq('room_id', roomId).single();
  if (error || !flat) { alert('Flat not found'); return; }
  const today = new Date().toISOString().slice(0,10);
  renderShell(`
    <div class="card"><h1>✏️ Update Flat Status</h1>
      <div class="sub"><strong>${flat.rooms?.unit_no||roomId}</strong> (${flat.rooms?.nickname||'-'})</div>
      <button class="secondary" onclick="renderFlatsStatus()">← Back</button></div>
    <div class="card">
      <label style="font-size:13px;color:#445;">Room Status</label>
      <select id="flatStatus">
        <option value="Free" ${flat.status==='Free'?'selected':''}>Free</option>
        <option value="Booked" ${flat.status==='Booked'?'selected':''}>Booked</option>
        <option value="Blocked-Maintenance" ${flat.status==='Blocked-Maintenance'?'selected':''}>Blocked-Maintenance</option>
      </select>
      <label style="font-size:13px;color:#445;">Cleaning Status</label>
      <select id="cleaningStatus">
        <option value="Clean" ${flat.cleaning_status==='Clean'?'selected':''}>Clean</option>
        <option value="Dirty" ${flat.cleaning_status==='Dirty'?'selected':''}>Dirty</option>
        <option value="In Progress" ${flat.cleaning_status==='In Progress'?'selected':''}>In Progress</option>
      </select>
      <input id="flatIssue" value="${flat.issue||''}" placeholder="Current Issue / Maintenance" />
      <input id="lastCleaned" type="date" value="${flat.last_cleaned||today}" />
      <textarea id="flatNotes">${flat.notes||''}</textarea>
      <button onclick="updateFlatStatus('${roomId}')">💾 Update Status</button>
      <div id="flatErr"></div>
    </div>`, 'flats');
}

async function updateFlatStatus(roomId) {
  const status = document.getElementById('flatStatus').value;
  const cleaning = document.getElementById('cleaningStatus').value;
  const issue = document.getElementById('flatIssue').value.trim();
  const cleaned = document.getElementById('lastCleaned').value;
  const notes = document.getElementById('flatNotes').value.trim();
  const { error } = await sb.from('flats_status').update({
    status, cleaning_status: cleaning, issue: issue||null, last_cleaned: cleaned||null, notes: notes||null
  }).eq('room_id', roomId);
  if (error) { document.getElementById('flatErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderFlatsStatus();
}

// ============ MANAGE BOOKINGS ============
async function renderManageBookings() {
  renderShell(`<div class="loading">Loading bookings...</div>`, 'bookings');
  const { data: bookings, error } = await sb.from("guest_register")
    .select("*, rooms(unit_no, nickname, property_name)").order("check_in", { ascending:false });
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'bookings'); return; }

  const filter = SESSION.bookingFilter || 'All';
  const filtered = bookings.filter(b => filter==='All' || b.booking_mode===filter);
  const paidMap = await getPaidMap(filtered.map(b=>b.booking_id));

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>📅 Manage Bookings</h1>
      <div class="sub">${filtered.length} bookings (${filter})</div>
      <select id="bkFilterSel">
        <option value="All" ${filter==='All'?'selected':''}>Sab</option>
        <option value="Online-Airbnb" ${filter==='Online-Airbnb'?'selected':''}>Online (Airbnb)</option>
        <option value="Offline" ${filter==='Offline'?'selected':''}>Offline</option>
      </select>
      ${isOwner ? `<button onclick="renderAddBooking()">➕ Add New Booking</button>` : ''}
    </div>
    <div class="card"><div style="overflow-x:auto;">
      <table>
        <thead><tr><th>Guest</th><th>Property/Unit</th><th>Mode</th><th>Check-in</th><th>Check-out</th>
          <th>Total</th><th>Paid</th><th>Balance</th>${isOwner?'<th>Actions</th>':''}</tr></thead>
        <tbody>
          ${filtered.map(b => {
            const paid = paidMap[b.booking_id] || 0;
            const balance = (b.total_amount||0) - paid;
            return `
            <tr>
              <td><strong>${b.guest_name||'-'}</strong><br><small>${b.phone||''}</small></td>
              <td>${b.rooms?.property_name||'-'}<br><small>${b.rooms?.unit_no||b.room_id} · ${b.rooms?.nickname||''}</small></td>
              <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode||'Offline'}</span></td>
              <td>${b.check_in||'-'}</td>
              <td>${b.check_out||'-'}</td>
              <td>₹${(b.total_amount||0).toLocaleString("en-IN")}</td>
              <td>₹${paid.toLocaleString("en-IN")}</td>
              <td><span class="${balance>0?'warn':''}">₹${balance.toLocaleString("en-IN")}</span></td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editBooking('${b.booking_id}')">✏️ Edit</button>
                  <button class="btn-sm" onclick="recordPayment('${b.booking_id}')">➕ Payment</button>
                  <button class="btn-sm danger" onclick="deleteBooking('${b.booking_id}','${b.guest_name}')">🗑️</button>
                </td>` : ''}
            </tr>`;}).join("")}
        </tbody>
      </table></div>
    </div>`;
  renderShell(content, 'bookings');
  document.getElementById('bkFilterSel').onchange = (e) => { SESSION.bookingFilter = e.target.value; renderManageBookings(); };
}

async function renderAddBooking() {
  const { data: rooms } = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name, rent_per_night, bookable').order('room_id');
  window.BOOKING_ROOMS_CACHE = rooms || [];

  renderShell(`
    <div class="card"><h1>➕ Add New Booking</h1>
      <button class="secondary" onclick="renderManageBookings()">← Back</button></div>
    <div class="card">
      <input id="guestName" placeholder="Guest Name" />
      <input id="guestPhone" placeholder="Phone Number" />
      <select id="idProofType">
        <option value="">ID Proof Type</option>
        <option value="Aadhar">Aadhar</option><option value="PAN">PAN</option>
        <option value="DL">Driving License</option><option value="Passport">Passport</option>
      </select>
      <input id="guestIdNo" placeholder="ID Proof Number" />
      <label style="font-size:13px;color:#445;">ID Proof Photo (optional)</label>
      <input id="idPhoto" type="file" accept="image/*" />

      <select id="roomId" onchange="onBookingRoomChange()">
        <option value="">Select Property</option>
        ${(rooms||[]).map(r => `<option value="${r.room_id}">${r.property_name||''} — ${r.unit_no} (${r.nickname||''})</option>`).join('')}
      </select>
      <div id="roomInfo" class="sub" style="margin-top:-6px;"></div>

      <select id="bookingMode" onchange="onBookingModeChange()">
        <option value="Offline">Offline (Direct)</option>
        <option value="Online-Airbnb">Online (Airbnb)</option>
      </select>

      <div id="onlineFields" style="display:none;">
        <input id="grossAmount" type="number" placeholder="Gross Amount (guest paid on Airbnb) ₹" oninput="onBookingAmountChange()" />
        <input id="platformFee" type="number" placeholder="Airbnb Commission/Fee (₹)" oninput="onBookingAmountChange()" />
      </div>

      <input id="checkIn" type="date" onchange="onBookingRoomChange()" />
      <input id="checkOut" type="date" onchange="onBookingRoomChange()" />
      <div id="nightsInfo" class="sub" style="margin-top:-6px;"></div>

      <input id="guests" type="number" placeholder="Number of Guests" value="1" />

      <input id="totalAmount" type="number" placeholder="Total Amount We Receive (₹)" oninput="onBookingAmountChange()" />
      <div id="suggestedInfo" class="sub" style="margin-top:-6px;"></div>

      <input id="initialPayment" type="number" placeholder="Initial Payment Received Now (₹, optional)" value="0" />
      <input id="paymentMode" placeholder="Payment Mode (Cash/UPI/Bank/Airbnb Payout)" />

      <textarea id="bookingNotes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewBooking()">💾 Save Booking</button>
      <div id="addBookingErr"></div>
    </div>`, 'bookings');
}

function onBookingModeChange() {
  const mode = document.getElementById('bookingMode').value;
  document.getElementById('onlineFields').style.display = mode === 'Online-Airbnb' ? 'block' : 'none';
  onBookingAmountChange();
}

function onBookingRoomChange() {
  const roomId = document.getElementById('roomId').value;
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const room = (window.BOOKING_ROOMS_CACHE||[]).find(r => r.room_id === roomId);

  const roomInfoEl = document.getElementById('roomInfo');
  if (room) {
    const bookableTxt = room.bookable ? '<span style="color:#256029;">✅ Bookable</span>' : '<span style="color:#c00000;">⚠️ NOT Bookable (out of service)</span>';
    roomInfoEl.innerHTML = `Rent: <strong>₹${room.rent_per_night||0}/night</strong> · ${bookableTxt}`;
  } else { roomInfoEl.innerHTML = ''; }

  const nightsInfoEl = document.getElementById('nightsInfo');
  let nights = 0;
  if (checkIn && checkOut) {
    nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    nightsInfoEl.innerHTML = nights > 0 ? `🌙 <strong>${nights} night(s)</strong>` : `<span style="color:#c00000;">Check-out check-in ke baad ka hona chahiye</span>`;
  } else { nightsInfoEl.innerHTML = ''; }

  const suggestedEl = document.getElementById('suggestedInfo');
  if (room && nights > 0 && document.getElementById('bookingMode').value !== 'Online-Airbnb') {
    const suggested = room.rent_per_night * nights;
    suggestedEl.innerHTML = `💡 Suggested Amount: ₹${suggested.toLocaleString("en-IN")} (${room.rent_per_night} × ${nights} nights)`;
    const totalEl = document.getElementById('totalAmount');
    if (!totalEl.value || totalEl.dataset.autofilled === 'true') {
      totalEl.value = suggested; totalEl.dataset.autofilled = 'true';
    }
  } else { suggestedEl.innerHTML = ''; }

  onBookingAmountChange();
}

function onBookingAmountChange() {
  const mode = document.getElementById('bookingMode')?.value;
  if (mode === 'Online-Airbnb') {
    const gross = parseFloat(document.getElementById('grossAmount')?.value) || 0;
    const fee = parseFloat(document.getElementById('platformFee')?.value) || 0;
    const net = gross - fee;
    const totalEl = document.getElementById('totalAmount');
    totalEl.value = net;
    totalEl.readOnly = true;
  } else {
    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.readOnly = false;
  }
  document.getElementById('totalAmount').oninput = function() { this.dataset.autofilled='false'; };
}

async function uploadIdPhotoIfAny(bookingId) {
  const fileInput = document.getElementById('idPhoto');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) return null;
  const file = fileInput.files[0];
  const path = `${bookingId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from('id-proofs').upload(path, file);
  if (error) { console.error('Photo upload failed:', error.message); return null; }
  return path;
}

async function saveNewBooking() {
  const guestName = document.getElementById('guestName').value.trim();
  const guestPhone = document.getElementById('guestPhone').value.trim();
  const idProofType = document.getElementById('idProofType').value;
  const guestIdNo = document.getElementById('guestIdNo').value.trim();
  const roomId = document.getElementById('roomId').value;
  const bookingMode = document.getElementById('bookingMode').value;
  const grossAmount = bookingMode==='Online-Airbnb' ? (parseFloat(document.getElementById('grossAmount').value)||0) : null;
  const platformFee = bookingMode==='Online-Airbnb' ? (parseFloat(document.getElementById('platformFee').value)||0) : 0;
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const guests = parseInt(document.getElementById('guests').value) || 1;
  const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
  const initialPayment = parseFloat(document.getElementById('initialPayment').value) || 0;
  const paymentMode = document.getElementById('paymentMode').value.trim();
  const notes = document.getElementById('bookingNotes').value.trim();

  if (!guestName || !roomId) {
    document.getElementById('addBookingErr').innerHTML = '<div class="error">Guest name aur property required hai</div>';
    return;
  }

  const bookingId = 'B' + Date.now();
  const photoPath = await uploadIdPhotoIfAny(bookingId);

  const { error } = await sb.from('guest_register').insert({
    booking_id: bookingId, guest_name: guestName, phone: guestPhone||null,
    id_proof_type: idProofType||null, id_proof_no: guestIdNo||null, id_proof_photo_path: photoPath,
    room_id: roomId, booking_mode: bookingMode, gross_amount: grossAmount, platform_fee: platformFee,
    check_in: checkIn||null, check_out: checkOut||null, guests, total_amount: totalAmount,
    payment_status: initialPayment >= totalAmount && totalAmount>0 ? 'Paid' : (initialPayment>0 ? 'Partial' : 'Unpaid'),
    notes: notes||null
  });

  if (error) { document.getElementById('addBookingErr').innerHTML = `<div class="error">${error.message}</div>`; return; }

  if (initialPayment > 0) {
    await sb.from('payment_history').insert({
      booking_id: bookingId, amount: initialPayment, payment_mode: paymentMode||null, notes: 'Initial payment at booking'
    });
  }

  await sb.from('flats_status').upsert({ room_id: roomId, status: 'Booked' });
  renderManageBookings();
}

async function editBooking(bookingId) {
  const { data: booking, error } = await sb.from('guest_register').select('*').eq('booking_id', bookingId).single();
  if (error || !booking) { alert('Booking not found'); return; }
  const { data: rooms } = await sb.from('rooms').select('room_id, unit_no, nickname, property_name, rent_per_night, bookable').order('room_id');
  const { data: payments } = await sb.from('payment_history').select('*').eq('booking_id', bookingId).order('paid_at', { ascending:false });
  window.BOOKING_ROOMS_CACHE = rooms || [];

  const totalPaid = (payments||[]).reduce((s,p)=>s+(p.amount||0),0);
  const balance = (booking.total_amount||0) - totalPaid;

  let photoUrl = null;
  if (booking.id_proof_photo_path) {
    const { data: signed } = await sb.storage.from('id-proofs').createSignedUrl(booking.id_proof_photo_path, 300);
    photoUrl = signed?.signedUrl || null;
  }

  renderShell(`
    <div class="card"><h1>✏️ Edit Booking</h1>
      <button class="secondary" onclick="renderManageBookings()">← Back</button></div>
    <div class="card">
      <input id="guestName" value="${booking.guest_name||''}" placeholder="Guest Name" />
      <input id="guestPhone" value="${booking.phone||''}" placeholder="Phone" />
      <select id="idProofType">
        <option value="">ID Proof Type</option>
        <option value="Aadhar"  ${booking.id_proof_type==='Aadhar'?'selected':''}>Aadhar</option>
        <option value="PAN"     ${booking.id_proof_type==='PAN'?'selected':''}>PAN</option>
        <option value="DL"      ${booking.id_proof_type==='DL'?'selected':''}>Driving License</option>
        <option value="Passport"${booking.id_proof_type==='Passport'?'selected':''}>Passport</option>
      </select>
      <input id="guestIdNo" value="${booking.id_proof_no||''}" placeholder="ID Proof Number" />
      ${photoUrl ? `<div class="sub">📎 <a href="${photoUrl}" target="_blank">Uploaded ID photo dekho</a></div>` : ''}
      <label style="font-size:13px;color:#445;">Naya ID Proof Photo upload karo (replace)</label>
      <input id="idPhoto" type="file" accept="image/*" />

      <select id="roomId">${(rooms||[]).map(r => `<option value="${r.room_id}" ${r.room_id===booking.room_id?'selected':''}>${r.property_name||''} — ${r.unit_no}</option>`).join('')}</select>
      <select id="bookingMode">
        <option value="Offline" ${booking.booking_mode!=='Online-Airbnb'?'selected':''}>Offline (Direct)</option>
        <option value="Online-Airbnb" ${booking.booking_mode==='Online-Airbnb'?'selected':''}>Online (Airbnb)</option>
      </select>
      <input id="checkIn" type="date" value="${booking.check_in||''}" />
      <input id="checkOut" type="date" value="${booking.check_out||''}" />
      <input id="guests" type="number" value="${booking.guests||1}" />
      <input id="totalAmount" type="number" value="${booking.total_amount||0}" />
      <select id="paymentStatus">
        <option value="Unpaid"  ${booking.payment_status==='Unpaid' ?'selected':''}>Unpaid</option>
        <option value="Partial" ${booking.payment_status==='Partial'?'selected':''}>Partial</option>
        <option value="Paid"    ${booking.payment_status==='Paid'   ?'selected':''}>Paid</option>
      </select>
      <textarea id="bookingNotes">${booking.notes||''}</textarea>
      <button onclick="updateBooking('${bookingId}')">💾 Update Booking</button>
      <div id="editBookingErr"></div>
    </div>
    <div class="card">
      <h2 style="font-size:15px;margin-bottom:10px;">💳 Payment History</h2>
      <div class="metric-row"><span class="metric-label">Total Amount</span><span class="metric-value">₹${(booking.total_amount||0).toLocaleString("en-IN")}</span></div>
      <div class="metric-row"><span class="metric-label">Total Paid</span><span class="metric-value">₹${totalPaid.toLocaleString("en-IN")}</span></div>
      <div class="metric-row"><span class="metric-label">Balance Due</span><span class="metric-value ${balance>0?'warn':''}">₹${balance.toLocaleString("en-IN")}</span></div>
      ${(payments||[]).length ? `<table style="margin-top:12px;"><thead><tr><th>Date/Time</th><th>Amount</th><th>Mode</th><th>Notes</th></tr></thead>
        <tbody>${payments.map(p => `<tr><td>${new Date(p.paid_at).toLocaleString('en-IN')}</td><td>₹${(p.amount||0).toLocaleString("en-IN")}</td><td>${p.payment_mode||'-'}</td><td>${p.notes||'-'}</td></tr>`).join('')}</tbody></table>` : `<div class="sub">Koi payment record nahi hai abhi.</div>`}
      <button onclick="recordPayment('${bookingId}')">➕ Naya Payment Add Karo</button>
    </div>`, 'bookings');
}

async function updateBooking(bookingId) {
  const guestName = document.getElementById('guestName').value.trim();
  const guestPhone = document.getElementById('guestPhone').value.trim();
  const idProofType = document.getElementById('idProofType').value;
  const guestIdNo = document.getElementById('guestIdNo').value.trim();
  const roomId = document.getElementById('roomId').value;
  const bookingMode = document.getElementById('bookingMode').value;
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const guests = parseInt(document.getElementById('guests').value) || 1;
  const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
  const paymentStatus = document.getElementById('paymentStatus').value;
  const notes = document.getElementById('bookingNotes').value.trim();

  if (!guestName || !roomId) { document.getElementById('editBookingErr').innerHTML = '<div class="error">Guest name aur property required hai</div>'; return; }

  const photoPath = await uploadIdPhotoIfAny(bookingId);
  const updateObj = {
    guest_name: guestName, phone: guestPhone||null, id_proof_type: idProofType||null, id_proof_no: guestIdNo||null,
    room_id: roomId, booking_mode: bookingMode, check_in: checkIn||null, check_out: checkOut||null,
    guests, total_amount: totalAmount, payment_status: paymentStatus, notes: notes||null
  };
  if (photoPath) updateObj.id_proof_photo_path = photoPath;

  const { error } = await sb.from('guest_register').update(updateObj).eq('booking_id', bookingId);
  if (error) { document.getElementById('editBookingErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageBookings();
}

async function deleteBooking(bookingId, guestName) {
  if (!confirm(`Delete booking for "${guestName}"?`)) return;
  await sb.from('payment_history').delete().eq('booking_id', bookingId);
  const { error } = await sb.from('guest_register').delete().eq('booking_id', bookingId);
  if (error) { alert('Error: ' + error.message); return; }
  renderManageBookings();
}

async function recordPayment(bookingId) {
  const amount = prompt('Kitna payment mila? (₹)');
  if (!amount || isNaN(parseFloat(amount))) return;
  const mode = prompt('Payment mode? (Cash/UPI/Bank/Airbnb Payout)') || null;
  const { error } = await sb.from('payment_history').insert({
    booking_id: bookingId, amount: parseFloat(amount), payment_mode: mode
  });
  if (error) { alert('Error: ' + error.message); return; }

  const { data: booking } = await sb.from('guest_register').select('total_amount').eq('booking_id', bookingId).single();
  const { data: payments } = await sb.from('payment_history').select('amount').eq('booking_id', bookingId);
  const totalPaid = (payments||[]).reduce((s,p)=>s+(p.amount||0),0);
  const status = totalPaid >= (booking?.total_amount||0) && booking?.total_amount>0 ? 'Paid' : (totalPaid>0 ? 'Partial' : 'Unpaid');
  await sb.from('guest_register').update({ payment_status: status }).eq('booking_id', bookingId);

  editBooking(bookingId);
}

// ============ MANAGE EMPLOYEES ============
async function renderManageEmployees() {
  renderShell(`<div class="loading">Loading employees...</div>`, 'employees');
  const { data: employees, error } = await sb.from("employees").select("*").order("name");
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'employees'); return; }
  const isOwner = SESSION.role === 'owner';
  renderShell(`
    <div class="card"><h1>👥 Manage Employees</h1><div class="sub">${employees.length} employees total</div>
      ${isOwner ? `<button onclick="renderAddEmployee()">➕ Add New Employee</button>` : ''}</div>
    <div class="card"><div style="overflow-x:auto;"><table>
      <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Monthly Salary</th><th>Status</th>${isOwner?'<th>Actions</th>':''}</tr></thead>
      <tbody>${employees.map(emp => `
        <tr><td><strong>${emp.name}</strong></td><td>${emp.role||'-'}</td><td>${emp.phone||'-'}</td>
          <td>₹${(emp.monthly_salary||0).toLocaleString("en-IN")}</td>
          <td><span class="badge ${emp.status==='Active'?'green':'red'}">${emp.status||'Active'}</span></td>
          ${isOwner ? `<td class="table-actions">
            <button class="btn-sm" onclick="editEmployee('${emp.emp_id}')">✏️ Edit</button>
            <button class="btn-sm danger" onclick="deleteEmployee('${emp.emp_id}','${emp.name}')">🗑️ Delete</button></td>` : ''}
        </tr>`).join("")}</tbody>
    </table></div></div>`, 'employees');
}

async function renderAddEmployee() {
  renderShell(`
    <div class="card"><h1>➕ Add New Employee</h1><button class="secondary" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <input id="empName" placeholder="Full Name" />
      <input id="empPhone" placeholder="Phone Number" />
      <input id="empRole" placeholder="Role (e.g., Manager, Cleaner)" />
      <input id="empSalary" type="number" placeholder="Monthly Salary (₹)" />
      <input id="empJoinDate" type="date" />
      <input id="empRooms" placeholder="Assigned Properties (comma separated)" />
      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <input type="checkbox" id="empActive" checked style="width:auto;" /><span>Active</span></label>
      <textarea id="empNotes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewEmployee()">💾 Save Employee</button>
      <div id="addEmpErr"></div>
    </div>`, 'employees');
}

async function saveNewEmployee() {
  const name = document.getElementById('empName').value.trim();
  const phone = document.getElementById('empPhone').value.trim();
  const role = document.getElementById('empRole').value.trim();
  const salary = parseFloat(document.getElementById('empSalary').value) || 0;
  const joinDate = document.getElementById('empJoinDate').value;
  const rooms = document.getElementById('empRooms').value.trim();
  const active = document.getElementById('empActive').checked;
  const notes = document.getElementById('empNotes').value.trim();
  if (!name) { document.getElementById('addEmpErr').innerHTML = '<div class="error">Name required</div>'; return; }
  const empId = 'E' + Date.now();
  const { error } = await sb.from('employees').insert({
    emp_id: empId, name, phone: phone||null, role: role||null, assigned_rooms: rooms||null,
    joining_date: joinDate||null, monthly_salary: salary, status: active?'Active':'Inactive', notes: notes||null
  });
  if (error) { document.getElementById('addEmpErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageEmployees();
}

async function editEmployee(empId) {
  const { data: emp, error } = await sb.from('employees').select('*').eq('emp_id', empId).single();
  if (error || !emp) { alert('Employee not found'); return; }
  renderShell(`
    <div class="card"><h1>✏️ Edit Employee</h1><button class="secondary" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <input id="empName" value="${emp.name}" placeholder="Full Name" />
      <input id="empPhone" value="${emp.phone||''}" placeholder="Phone Number" />
      <input id="empRole" value="${emp.role||''}" placeholder="Role" />
      <input id="empSalary" type="number" value="${emp.monthly_salary||0}" />
      <input id="empJoinDate" type="date" value="${emp.joining_date||''}" />
      <input id="empRooms" value="${emp.assigned_rooms||''}" placeholder="Assigned Properties" />
      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <input type="checkbox" id="empActive" ${emp.status==='Active'?'checked':''} style="width:auto;" /><span>Active</span></label>
      <textarea id="empNotes">${emp.notes||''}</textarea>
      <button onclick="updateEmployee('${empId}')">💾 Update Employee</button>
      <div id="editEmpErr"></div>
    </div>`, 'employees');
}

async function updateEmployee(empId) {
  const name = document.getElementById('empName').value.trim();
  const phone = document.getElementById('empPhone').value.trim();
  const role = document.getElementById('empRole').value.trim();
  const salary = parseFloat(document.getElementById('empSalary').value) || 0;
  const joinDate = document.getElementById('empJoinDate').value;
  const rooms = document.getElementById('empRooms').value.trim();
  const active = document.getElementById('empActive').checked;
  const notes = document.getElementById('empNotes').value.trim();
  if (!name) { document.getElementById('editEmpErr').innerHTML = '<div class="error">Name required</div>'; return; }
  const { error } = await sb.from('employees').update({
    name, phone: phone||null, role: role||null, assigned_rooms: rooms||null, joining_date: joinDate||null,
    monthly_salary: salary, status: active?'Active':'Inactive', notes: notes||null
  }).eq('emp_id', empId);
  if (error) { document.getElementById('editEmpErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageEmployees();
}

async function deleteEmployee(empId, empName) {
  if (!confirm(`Delete "${empName}"? Unke saare records bhi delete ho jayenge.`)) return;
  await sb.from('employee_tasks').delete().eq('emp_id', empId);
  await sb.from('attendance_log').delete().eq('emp_id', empId);
  await sb.from('salary_tracker').delete().eq('emp_id', empId);
  await sb.from('advance_tracker').delete().eq('emp_id', empId);
  await sb.from('profiles').delete().eq('emp_id', empId);
  const { error } = await sb.from('employees').delete().eq('emp_id', empId);
  if (error) { alert('Error: ' + error.message); return; }
  renderManageEmployees();
}

// ============ EMPLOYEE TASKS ============
async function renderEmployeeTasks() {
  renderShell(`<div class="loading">Loading tasks...</div>`, 'tasks');
  const { data: tasks, error } = await sb.from('employee_tasks').select('*, employees(name)').order('assigned_date', { ascending:false });
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'tasks'); return; }
  const isOwner = SESSION.role === 'owner';
  renderShell(`
    <div class="card"><h1>🧰 Employee Tasks</h1><div class="sub">${tasks.length} tasks total</div>
      ${isOwner ? `<button onclick="renderAddTask()">➕ Add New Task</button>` : ''}</div>
    <div class="card"><div style="overflow-x:auto;"><table>
      <thead><tr><th>Employee</th><th>Task</th><th>Assigned Date</th><th>Status</th>${isOwner?'<th>Actions</th>':''}</tr></thead>
      <tbody>${tasks.map(t => `
        <tr><td><strong>${t.employees?.name || t.emp_id}</strong></td><td>${t.task_description||'-'}</td>
          <td>${t.assigned_date||'-'}</td>
          <td><span class="badge ${t.status==='Completed'?'green':t.status==='In Progress'?'yellow':'red'}">${t.status||'Pending'}</span></td>
          ${isOwner ? `<td class="table-actions">
            <button class="btn-sm" onclick="editTask(${t.id})">✏️ Edit</button>
            <button class="btn-sm danger" onclick="deleteTask(${t.id})">🗑️ Delete</button></td>` : ''}
        </tr>`).join('')}</tbody>
    </table></div></div>`, 'tasks');
}

async function renderAddTask() {
  const { data: employees } = await sb.from('employees').select('emp_id, name').eq('status','Active').order('name');
  const today = new Date().toISOString().slice(0,10);
  renderShell(`
    <div class="card"><h1>➕ Add New Task</h1><button class="secondary" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card">
      <select id="taskEmpId"><option value="">Select Employee</option>
        ${(employees||[]).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}</select>
      <textarea id="taskDesc" placeholder="Task Description"></textarea>
      <input id="taskDate" type="date" value="${today}" />
      <select id="taskStatus"><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select>
      <textarea id="taskNotes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewTask()">💾 Save Task</button>
      <div id="addTaskErr"></div>
    </div>`, 'tasks');
}

async function saveNewTask() {
  const empId = document.getElementById('taskEmpId').value;
  const desc = document.getElementById('taskDesc').value.trim();
  const date = document.getElementById('taskDate').value;
  const status = document.getElementById('taskStatus').value;
  const notes = document.getElementById('taskNotes').value.trim();
  if (!empId || !desc) { document.getElementById('addTaskErr').innerHTML = '<div class="error">Employee aur task description required hai</div>'; return; }
  const { error } = await sb.from('employee_tasks').insert({ emp_id: empId, task_description: desc, assigned_date: date||null, status, notes: notes||null });
  if (error) { document.getElementById('addTaskErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderEmployeeTasks();
}

async function editTask(id) {
  const { data: task, error } = await sb.from('employee_tasks').select('*, employees(name)').eq('id', id).single();
  if (error || !task) { alert('Task not found'); return; }
  renderShell(`
    <div class="card"><h1>✏️ Edit Task</h1><button class="secondary" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card">
      <div class="sub"><strong>Employee:</strong> ${task.employees?.name || task.emp_id}</div>
      <textarea id="taskDesc">${task.task_description||''}</textarea>
      <input id="taskDate" type="date" value="${task.assigned_date||''}" />
      <select id="taskStatus">
        <option value="Pending" ${task.status==='Pending'?'selected':''}>Pending</option>
        <option value="In Progress" ${task.status==='In Progress'?'selected':''}>In Progress</option>
        <option value="Completed" ${task.status==='Completed'?'selected':''}>Completed</option>
      </select>
      <textarea id="taskNotes">${task.notes||''}</textarea>
      <button onclick="updateTask(${id})">💾 Update Task</button>
      <div id="editTaskErr"></div>
    </div>`, 'tasks');
}

async function updateTask(id) {
  const desc = document.getElementById('taskDesc').value.trim();
  const date = document.getElementById('taskDate').value;
  const status = document.getElementById('taskStatus').value;
  const notes = document.getElementById('taskNotes').value.trim();
  const { error } = await sb.from('employee_tasks').update({ task_description: desc, assigned_date: date||null, status, notes: notes||null }).eq('id', id);
  if (error) { document.getElementById('editTaskErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderEmployeeTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await sb.from('employee_tasks').delete().eq('id', id);
  renderEmployeeTasks();
}

// ============ ATTENDANCE ============
async function renderAttendance() {
  renderShell(`<div class="loading">Loading attendance...</div>`, 'attendance');
  const today = new Date().toISOString().slice(0,10);
  const [employees, attendance] = await Promise.all([
    sb.from('employees').select('emp_id, name').eq('status','Active').order('name'),
    sb.from('attendance_log').select('*').eq('att_date', today)
  ]);
  const isOwner = SESSION.role === 'owner';
  const attMap = {};
  (attendance.data||[]).forEach(a => { attMap[a.emp_id] = a.status; });
  renderShell(`
    <div class="card"><h1>📋 Attendance — ${today}</h1><div class="sub">${employees.data?.length||0} active employees</div></div>
    <div class="card"><div style="overflow-x:auto;"><table>
      <thead><tr><th>Employee</th><th>Status</th>${isOwner?'<th>Mark</th>':''}</tr></thead>
      <tbody>${(employees.data||[]).map(emp => {
        const status = attMap[emp.emp_id] || 'Not Marked';
        return `<tr><td><strong>${emp.name}</strong></td>
          <td><span class="badge ${status==='Present'?'green':status==='Absent'?'red':'yellow'}">${status}</span></td>
          ${isOwner ? `<td class="table-actions">
            <button class="btn-sm" onclick="markAttendance('${emp.emp_id}','Present')">✅ Present</button>
            <button class="btn-sm danger" onclick="markAttendance('${emp.emp_id}','Absent')">❌ Absent</button>
            <button class="btn-sm secondary" onclick="markAttendance('${emp.emp_id}','Half Day')">½ Half Day</button></td>` : ''}
        </tr>`;}).join("")}</tbody>
    </table></div></div>`, 'attendance');
}

async function markAttendance(empId, status) {
  const today = new Date().toISOString().slice(0,10);
  const { data: existing } = await sb.from('attendance_log').select('id').eq('emp_id', empId).eq('att_date', today).single();
  if (existing) await sb.from('attendance_log').update({ status }).eq('id', existing.id);
  else await sb.from('attendance_log').insert({ emp_id: empId, att_date: today, status });
  renderAttendance();
}

// ============ MONTHLY ATTENDANCE SUMMARY ============
async function renderAttendanceSummary() {
  renderShell(`<div class="loading">Loading summary...</div>`, 'att-summary');
  const currentMonth = new Date().toISOString().slice(0,7);
  const [employees, logs] = await Promise.all([
    sb.from('employees').select('emp_id, name').eq('status','Active').order('name'),
    sb.from('attendance_log').select('emp_id, att_date, status').like('att_date', `${currentMonth}%`)
  ]);
  const summary = (employees.data||[]).map(emp => {
    const empLogs = (logs.data||[]).filter(l => l.emp_id === emp.emp_id);
    const present = empLogs.filter(l => l.status === 'Present').length;
    const absent = empLogs.filter(l => l.status === 'Absent').length;
    const halfDay = empLogs.filter(l => l.status === 'Half Day').length;
    const leave = empLogs.filter(l => l.status === 'Paid Leave' || l.status === 'Unpaid Leave').length;
    const total = present + absent + halfDay + leave;
    const pct = total > 0 ? ((present + halfDay*0.5) / total * 100).toFixed(1) : '0.0';
    return { ...emp, present, absent, halfDay, leave, pct };
  });
  renderShell(`
    <div class="card"><h1>📅 Monthly Attendance Summary</h1><div class="sub">Month: <strong>${currentMonth}</strong></div>
      <button class="secondary" onclick="renderAttendance()">📋 Daily Log</button></div>
    <div class="card"><div style="overflow-x:auto;"><table>
      <thead><tr><th>Employee</th><th>Present</th><th>Half Days</th><th>Absent</th><th>Leave</th><th>Attendance %</th></tr></thead>
      <tbody>${summary.map(s => `
        <tr><td><strong>${s.name}</strong></td><td><span class="badge green">${s.present}</span></td>
          <td><span class="badge yellow">${s.halfDay}</span></td>
          <td><span class="badge ${s.absent>0?'red':'green'}">${s.absent}</span></td>
          <td><span class="badge blue">${s.leave}</span></td>
          <td><strong class="${parseFloat(s.pct)<75?'warn':''}">${s.pct}%</strong></td></tr>`).join('')}</tbody>
    </table></div></div>`, 'att-summary');
}

// ============ SALARY TRACKER ============
async function renderSalaryTracker() {
  renderShell(`<div class="loading">Loading salary data...</div>`, 'salary');
  const { data: salaries, error } = await sb.from('salary_tracker').select('*, employees(name)').order('month', { ascending:false });
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'salary'); return; }
  const isOwner = SESSION.role === 'owner';
  renderShell(`
    <div class="card"><h1>💰 Salary Tracker</h1><div class="sub">${salaries.length} salary records</div>
      ${isOwner ? `<button onclick="renderAddSalary()">➕ Add Salary Record</button>` : ''}</div>
    <div class="card"><div style="overflow-x:auto;"><table>
      <thead><tr><th>Employee</th><th>Month</th><th>Due</th><th>Paid</th><th>Balance</th><th>Payment Date</th>${isOwner?'<th>Actions</th>':''}</tr></thead>
      <tbody>${salaries.map(s => {
        const balance = (s.salary_due||0) - (s.salary_paid||0);
        return `<tr><td><strong>${s.employees?.name || s.emp_id}</strong></td><td>${s.month||'-'}</td>
          <td>₹${(s.salary_due||0).toLocaleString("en-IN")}</td><td>₹${(s.salary_paid||0).toLocaleString("en-IN")}</td>
          <td><span class="${balance>0?'warn':''}">₹${balance.toLocaleString("en-IN")}</span></td><td>${s.payment_date||'-'}</td>
          ${isOwner ? `<td class="table-actions">
            <button class="btn-sm" onclick="editSalary(${s.id})">✏️ Edit</button>
            <button class="btn-sm danger" onclick="deleteSalary(${s.id})">🗑️ Delete</button></td>` : ''}
        </tr>`;}).join("")}</tbody>
    </table></div></div>`, 'salary');
}

async function renderAddSalary() {
  const { data: employees } = await sb.from('employees').select('emp_id, name, monthly_salary').eq('status','Active').order('name');
  window.SALARY_EMP_CACHE = employees || [];
  const currentMonth = new Date().toISOString().slice(0,7);
  renderShell(`
    <div class="card"><h1>➕ Add Salary Record</h1><button class="secondary" onclick="renderSalaryTracker()">← Back</button></div>
    <div class="card">
      <select id="salEmpId" onchange="onSalaryEmpChange()"><option value="">Select Employee</option>
        ${(employees||[]).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}</select>
      <div id="salEmpInfo" class="sub" style="margin-top:-6px;"></div>
      <input id="salMonth" type="month" value="${currentMonth}" />
      <input id="salDue" type="number" placeholder="Salary Due (₹)" />
      <input id="salPaid" type="number" placeholder="Salary Paid (₹)" oninput="onSalaryAmountChange()" />
      <div id="salPendingInfo" class="sub" style="margin-top:-6px;font-weight:600;"></div>
      <input id="salPayDate" type="date" />
      <input id="salPayMode" placeholder="Payment Mode (Cash/UPI/Bank)" />
      <textarea id="salNotes" placeholder="Notes"></textarea>
      <button onclick="saveNewSalary()">💾 Save Salary Record</button>
      <div id="addSalErr"></div>
    </div>`, 'salary');
}

function onSalaryEmpChange() {
  const empId = document.getElementById('salEmpId').value;
  const emp = (window.SALARY_EMP_CACHE||[]).find(e => e.emp_id === empId);
  const infoEl = document.getElementById('salEmpInfo');
  const dueEl = document.getElementById('salDue');
  if (emp) { infoEl.innerHTML = `💡 Suggested Salary Due: ₹${(emp.monthly_salary||0).toLocaleString("en-IN")}`; dueEl.value = emp.monthly_salary || 0; }
  else { infoEl.innerHTML = ''; }
  onSalaryAmountChange();
}

function onSalaryAmountChange() {
  const due = parseFloat(document.getElementById('salDue').value) || 0;
  const paid = parseFloat(document.getElementById('salPaid').value) || 0;
  const pending = due - paid;
  const el = document.getElementById('salPendingInfo');
  el.innerHTML = due > 0 ? (pending > 0 ? `<span class="warn">Pending: ₹${pending.toLocaleString("en-IN")}</span>` : `<span style="color:#256029;">✅ Fully Paid</span>`) : '';
}

async function saveNewSalary() {
  const empId = document.getElementById('salEmpId').value;
  const month = document.getElementById('salMonth').value;
  const due = parseFloat(document.getElementById('salDue').value) || 0;
  const paid = parseFloat(document.getElementById('salPaid').value) || 0;
  const payDate = document.getElementById('salPayDate').value;
  const payMode = document.getElementById('salPayMode').value.trim();
  const notes = document.getElementById('salNotes').value.trim();
  if (!empId || !month) { document.getElementById('addSalErr').innerHTML = '<div class="error">Employee aur month required hai</div>'; return; }
  const { error } = await sb.from('salary_tracker').insert({ emp_id: empId, month, salary_due: due, salary_paid: paid, payment_date: payDate||null, payment_mode: payMode||null, notes: notes||null });
  if (error) { document.getElementById('addSalErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderSalaryTracker();
}

async function editSalary(id) {
  const { data: salary, error } = await sb.from('salary_tracker').select('*, employees(name, monthly_salary)').eq('id', id).single();
  if (error || !salary) { alert('Record not found'); return; }
  renderShell(`
    <div class="card"><h1>✏️ Edit Salary Record</h1><button class="secondary" onclick="renderSalaryTracker()">← Back</button></div>
    <div class="card">
      <div class="sub"><strong>Employee:</strong> ${salary.employees?.name || salary.emp_id}</div>
      <input id="salMonth" type="month" value="${salary.month||''}" />
      <input id="salDue" type="number" value="${salary.salary_due||0}" />
      <input id="salPaid" type="number" value="${salary.salary_paid||0}" oninput="onSalaryAmountChange()" />
      <div id="salPendingInfo" class="sub" style="margin-top:-6px;font-weight:600;"></div>
      <input id="salPayDate" type="date" value="${salary.payment_date||''}" />
      <input id="salPayMode" value="${salary.payment_mode||''}" placeholder="Payment Mode" />
      <textarea id="salNotes">${salary.notes||''}</textarea>
      <button onclick="updateSalary(${id})">💾 Update Record</button>
      <div id="editSalErr"></div>
    </div>`, 'salary');
  setTimeout(() => onSalaryAmountChange(), 100);
}

async function updateSalary(id) {
  const month = document.getElementById('salMonth').value;
  const due = parseFloat(document.getElementById('salDue').value) || 0;
  const paid = parseFloat(document.getElementById('salPaid').value) || 0;
  const payDate = document.getElementById('salPayDate').value;
  const payMode = document.getElementById('salPayMode').value.trim();
  const notes = document.getElementById('salNotes').value.trim();
  const { error } = await sb.from('salary_tracker').update({ month, salary_due: due, salary_paid: paid, payment_date: payDate||null, payment_mode: payMode||null, notes: notes||null }).eq('id', id);
  if (error) { document.getElementById('editSalErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderSalaryTracker();
}

async function deleteSalary(id) {
  if (!confirm('Delete this salary record?')) return;
  await sb.from('salary_tracker').delete().eq('id', id);
  renderSalaryTracker();
}

// ============ ADVANCE TRACKER ============
async function renderAdvanceTracker() {
  renderShell(`<div class="loading">Loading advance data...</div>`, 'advance');
  const { data: advances, error } = await sb.from('advance_tracker').select('*, employees(name)').order('date_given', { ascending:false });
  if (error) { renderShell(`<div class="error">Error: ${error.message}</div>`, 'advance'); return; }
  const isOwner = SESSION.role === 'owner';
  renderShell(`
    <div class="card"><h1>💵 Advance Tracker</h1><div class="sub">${advances.length} advance records</div>
      ${isOwner ? `<button onclick="renderAddAdvance()">➕ Add Advance Record</button>` : ''}</div>
    <div class="card"><div style="overflow-x:auto;"><table>
      <thead><tr><th>Employee</th><th>Date Given</th><th>Amount</th><th>Repaid</th><th>Balance</th><th>Reason</th>${isOwner?'<th>Actions</th>':''}</tr></thead>
      <tbody>${advances.map(a => {
        const balance = (a.advance_amount||0) - (a.repaid_amount||0);
        return `<tr><td><strong>${a.employees?.name || a.emp_id}</strong></td><td>${a.date_given||'-'}</td>
          <td>₹${(a.advance_amount||0).toLocaleString("en-IN")}</td><td>₹${(a.repaid_amount||0).toLocaleString("en-IN")}</td>
          <td><span class="${balance>0?'warn':''}">₹${balance.toLocaleString("en-IN")}</span></td><td>${a.reason||'-'}</td>
          ${isOwner ? `<td class="table-actions">
            <button class="btn-sm" onclick="editAdvance(${a.id})">✏️ Edit</button>
            <button class="btn-sm danger" onclick="deleteAdvance(${a.id})">🗑️ Delete</button></td>` : ''}
        </tr>`;}).join("")}</tbody>
    </table></div></div>`, 'advance');
}

async function renderAddAdvance() {
  const { data: employees } = await sb.from('employees').select('emp_id, name').eq('status','Active').order('name');
  const today = new Date().toISOString().slice(0,10);
  renderShell(`
    <div class="card"><h1>➕ Add Advance Record</h1><button class="secondary" onclick="renderAdvanceTracker()">← Back</button></div>
    <div class="card">
      <select id="advEmpId"><option value="">Select Employee</option>
        ${(employees||[]).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}</select>
      <input id="advDate" type="date" value="${today}" />
      <input id="advAmount" type="number" placeholder="Advance Amount (₹)" />
      <input id="advRepaid" type="number" placeholder="Repaid Amount (₹)" value="0" />
      <input id="advReason" placeholder="Reason" />
      <textarea id="advNotes" placeholder="Notes"></textarea>
      <button onclick="saveNewAdvance()">💾 Save Advance Record</button>
      <div id="addAdvErr"></div>
    </div>`, 'advance');
}

async function saveNewAdvance() {
  const empId = document.getElementById('advEmpId').value;
  const date = document.getElementById('advDate').value;
  const amount = parseFloat(document.getElementById('advAmount').value) || 0;
  const repaid = parseFloat(document.getElementById('advRepaid').value) || 0;
  const reason = document.getElementById('advReason').value.trim();
  const notes = document.getElementById('advNotes').value.trim();
  if (!empId || amount <= 0) { document.getElementById('addAdvErr').innerHTML = '<div class="error">Employee aur valid amount required hai</div>'; return; }
  const { error } = await sb.from('advance_tracker').insert({ emp_id: empId, date_given: date||null, advance_amount: amount, repaid_amount: repaid, reason: reason||null, notes: notes||null });
  if (error) { document.getElementById('addAdvErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderAdvanceTracker();
}

async function editAdvance(id) {
  const { data: adv, error } = await sb.from('advance_tracker').select('*, employees(name)').eq('id', id).single();
  if (error || !adv) { alert('Record not found'); return; }
  renderShell(`
    <div class="card"><h1>✏️ Edit Advance Record</h1><button class="secondary" onclick="renderAdvanceTracker()">← Back</button></div>
    <div class="card">
      <div class="sub"><strong>Employee:</strong> ${adv.employees?.name || adv.emp_id}</div>
      <input id="advDate" type="date" value="${adv.date_given||''}" />
      <input id="advAmount" type="number" value="${adv.advance_amount||0}" />
      <input id="advRepaid" type="number" value="${adv.repaid_amount||0}" />
      <input id="advReason" value="${adv.reason||''}" placeholder="Reason" />
      <textarea id="advNotes">${adv.notes||''}</textarea>
      <button onclick="updateAdvance(${id})">💾 Update Record</button>
      <div id="editAdvErr"></div>
    </div>`, 'advance');
}

async function updateAdvance(id) {
  const date = document.getElementById('advDate').value;
  const amount = parseFloat(document.getElementById('advAmount').value) || 0;
  const repaid = parseFloat(document.getElementById('advRepaid').value) || 0;
  const reason = document.getElementById('advReason').value.trim();
  const notes = document.getElementById('advNotes').value.trim();
  const { error } = await sb.from('advance_tracker').update({ date_given: date||null, advance_amount: amount, repaid_amount: repaid, reason: reason||null, notes: notes||null }).eq('id', id);
  if (error) { document.getElementById('editAdvErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderAdvanceTracker();
}

async function deleteAdvance(id) {
  if (!confirm('Delete this advance record?')) return;
  await sb.from('advance_tracker').delete().eq('id', id);
  renderAdvanceTracker();
}

// ============ MANAGE STORE / INVENTORY (owner only) ============
async function renderManageStore() {
  renderShell(`<div class="loading">Loading store...</div>`, 'store');
  const [items, txns] = await Promise.all([
    sb.from('store_items').select('*').order('item_name'),
    sb.from('stock_transactions').select('*, store_items(item_name, unit), rooms(unit_no, nickname)').order('txn_date', { ascending:false }).limit(50)
  ]);
  const stockMap = {};
  (txns.data||[]).forEach(t => {
    const key = t.item_id;
    stockMap[key] = (stockMap[key]||0) + (t.txn_type==='In' ? (t.quantity||0) : -(t.quantity||0));
  });

  renderShell(`
    <div class="card"><h1>📦 Manage Store / Inventory</h1><div class="sub">${items.data?.length||0} items</div>
      <button onclick="renderAddStoreItem()">➕ Add New Item</button>
      <button class="secondary" onclick="renderAddStockTxn()">🔄 Log Stock In/Out</button></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">Items & Current Stock</h2><div style="overflow-x:auto;"><table>
      <thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Current Stock (est.)</th><th>Reorder Level</th></tr></thead>
      <tbody>${(items.data||[]).map(it => {
        const stock = stockMap[it.item_id] || 0;
        return `<tr><td><strong>${it.item_name}</strong></td><td>${it.category||'-'}</td><td>${it.unit||'-'}</td>
          <td><span class="${stock <= (it.reorder_level||0) ? 'warn' : ''}">${stock}</span></td><td>${it.reorder_level||0}</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">Recent Stock Transactions</h2><div style="overflow-x:auto;"><table>
      <thead><tr><th>Date</th><th>Item</th><th>Property</th><th>Type</th><th>Qty</th><th>Cost</th></tr></thead>
      <tbody>${(txns.data||[]).map(t => `
        <tr><td>${t.txn_date}</td><td>${t.store_items?.item_name||t.item_id}</td>
          <td>${t.rooms?.unit_no||'General'}</td>
          <td><span class="badge ${t.txn_type==='In'?'green':'yellow'}">${t.txn_type}</span></td>
          <td>${t.quantity} ${t.store_items?.unit||''}</td><td>₹${(t.cost||0).toLocaleString("en-IN")}</td></tr>`).join('')}</tbody>
    </table></div></div>`, 'store');
}

async function renderAddStoreItem() {
  renderShell(`
    <div class="card"><h1>➕ Add Store Item</h1><button class="secondary" onclick="renderManageStore()">← Back</button></div>
    <div class="card">
      <input id="itemName" placeholder="Item Name (e.g. Bedsheet)" />
      <select id="itemCategory">
        <option value="Linen">Linen</option><option value="Toiletries">Toiletries</option>
        <option value="Cleaning">Cleaning</option><option value="Electronics">Electronics</option>
        <option value="Furniture">Furniture</option><option value="Other">Other</option>
      </select>
      <input id="itemUnit" placeholder="Unit (pcs / kg / liter)" />
      <input id="itemReorder" type="number" placeholder="Reorder Level" value="0" />
      <textarea id="itemNotes" placeholder="Notes"></textarea>
      <button onclick="saveStoreItem()">💾 Save Item</button>
      <div id="itemErr"></div>
    </div>`, 'store');
}

async function saveStoreItem() {
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value;
  const unit = document.getElementById('itemUnit').value.trim();
  const reorder = parseFloat(document.getElementById('itemReorder').value) || 0;
  const notes = document.getElementById('itemNotes').value.trim();
  if (!name) { document.getElementById('itemErr').innerHTML = '<div class="error">Item name required</div>'; return; }
  const itemId = 'ITM' + Date.now();
  const { error } = await sb.from('store_items').insert({ item_id: itemId, item_name: name, category, unit: unit||null, reorder_level: reorder, notes: notes||null });
  if (error) { document.getElementById('itemErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageStore();
}

async function renderAddStockTxn() {
  const [items, rooms] = await Promise.all([
    sb.from('store_items').select('item_id, item_name').order('item_name'),
    sb.from('rooms').select('room_id, unit_no, property_name').order('room_id')
  ]);
  const today = new Date().toISOString().slice(0,10);
  renderShell(`
    <div class="card"><h1>🔄 Log Stock In/Out</h1><button class="secondary" onclick="renderManageStore()">← Back</button></div>
    <div class="card">
      <select id="txnItem"><option value="">Select Item</option>
        ${(items.data||[]).map(i => `<option value="${i.item_id}">${i.item_name}</option>`).join('')}</select>
      <select id="txnRoom"><option value="">General Stock (no specific property)</option>
        ${(rooms.data||[]).map(r => `<option value="${r.room_id}">${r.property_name||''} — ${r.unit_no}</option>`).join('')}</select>
      <select id="txnType"><option value="In">Stock In (Purchase)</option><option value="Out">Stock Out (Used)</option></select>
      <input id="txnQty" type="number" placeholder="Quantity" />
      <input id="txnCost" type="number" placeholder="Cost (₹, only for purchase)" />
      <input id="txnDate" type="date" value="${today}" />
      <textarea id="txnNotes" placeholder="Notes"></textarea>
      <button onclick="saveStockTxn()">💾 Save Transaction</button>
      <div id="txnErr"></div>
    </div>`, 'store');
}

async function saveStockTxn() {
  const itemId = document.getElementById('txnItem').value;
  const roomId = document.getElementById('txnRoom').value || null;
  const txnType = document.getElementById('txnType').value;
  const qty = parseFloat(document.getElementById('txnQty').value) || 0;
  const cost = parseFloat(document.getElementById('txnCost').value) || 0;
  const date = document.getElementById('txnDate').value;
  const notes = document.getElementById('txnNotes').value.trim();
  if (!itemId || qty <= 0) { document.getElementById('txnErr').innerHTML = '<div class="error">Item aur valid quantity required hai</div>'; return; }
  const { error } = await sb.from('stock_transactions').insert({ item_id: itemId, room_id: roomId, txn_type: txnType, quantity: qty, cost, txn_date: date||null, notes: notes||null });
  if (error) { document.getElementById('txnErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageStore();
}

// ============ INVESTORS (owner only) ============
async function renderManageInvestors() {
  renderShell(`<div class="loading">Loading investors...</div>`, 'investors');
  const [investors, links, rooms] = await Promise.all([
    sb.from('investors').select('*').order('name'),
    sb.from('investor_properties').select('*, investors(name), rooms(unit_no, property_name)'),
    sb.from('rooms').select('room_id, unit_no, property_name').order('room_id')
  ]);
  window.INVESTOR_ROOMS_CACHE = rooms.data || [];

  renderShell(`
    <div class="card"><h1>🧑‍💼 Sub-Owners</h1><div class="sub">${investors.data?.length||0} sub-owners linked</div>
      <button onclick="renderAddInvestor()">➕ Add Sub-Owner</button>
      <button class="secondary" onclick="renderLinkProperty()">🔗 Link Property to Sub-Owner</button></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">Sub-Owner → Property Mapping</h2><div style="overflow-x:auto;"><table>
      <thead><tr><th>Sub-Owner</th><th>Property</th></tr></thead>
      <tbody>${(links.data||[]).map(l => `<tr><td>${l.investors?.name||l.investor_id}</td><td>${l.rooms?.property_name||''} — ${l.rooms?.unit_no||l.room_id}</td></tr>`).join('')}</tbody>
    </table></div></div>
    <div class="card"><h2 style="font-size:15px;margin-bottom:10px;">All Sub-Owners</h2><div style="overflow-x:auto;"><table>
      <thead><tr><th>Name</th><th>Phone</th><th>Sub-Owner ID (use for their login profile)</th></tr></thead>
      <tbody>${(investors.data||[]).map(i => `<tr><td>${i.name}</td><td>${i.phone||'-'}</td><td><code>${i.investor_id}</code></td></tr>`).join('')}</tbody>
    </table></div></div>`, 'investors');
}

async function renderAddInvestor() {
  renderShell(`
    <div class="card"><h1>➕ Add Sub-Owner</h1><button class="secondary" onclick="renderManageInvestors()">← Back</button></div>
    <div class="card">
      <input id="invName" placeholder="Sub-Owner Name" />
      <input id="invPhone" placeholder="Phone Number" />
      <textarea id="invNotes" placeholder="Notes"></textarea>
      <button onclick="saveInvestor()">💾 Save Sub-Owner</button>
      <div id="invErr"></div>
    </div>`, 'investors');
}

async function saveInvestor() {
  const name = document.getElementById('invName').value.trim();
  const phone = document.getElementById('invPhone').value.trim();
  const notes = document.getElementById('invNotes').value.trim();
  if (!name) { document.getElementById('invErr').innerHTML = '<div class="error">Name required</div>'; return; }
  const investorId = 'INV' + Date.now();
  const { error } = await sb.from('investors').insert({ investor_id: investorId, name, phone: phone||null, notes: notes||null });
  if (error) { document.getElementById('invErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderShell(`<div class="card"><h1>✅ Sub-Owner Added</h1>
    <div class="sub">Sub-Owner ID: <code>${investorId}</code></div>
    <div class="sub">Ab Authentication mein iska login banao, aur profiles table mein role='investor', investor_id='${investorId}' set karo.</div>
    <button onclick="renderManageInvestors()">← Sub-Owners pe wapas jao</button></div>`, 'investors');
}

async function renderLinkProperty() {
  const { data: investors } = await sb.from('investors').select('investor_id, name').order('name');
  const rooms = window.INVESTOR_ROOMS_CACHE || [];
  renderShell(`
    <div class="card"><h1>🔗 Link Property to Sub-Owner</h1><button class="secondary" onclick="renderManageInvestors()">← Back</button></div>
    <div class="card">
      <select id="linkInvestor"><option value="">Select Sub-Owner</option>
        ${(investors||[]).map(i => `<option value="${i.investor_id}">${i.name}</option>`).join('')}</select>
      <select id="linkRoom"><option value="">Select Property</option>
        ${rooms.map(r => `<option value="${r.room_id}">${r.property_name||''} — ${r.unit_no}</option>`).join('')}</select>
      <button onclick="saveLink()">💾 Link Property</button>
      <div id="linkErr"></div>
    </div>`, 'investors');
}

async function saveLink() {
  const investorId = document.getElementById('linkInvestor').value;
  const roomId = document.getElementById('linkRoom').value;
  if (!investorId || !roomId) { document.getElementById('linkErr').innerHTML = '<div class="error">Dono select karo</div>'; return; }
  const { error } = await sb.from('investor_properties').insert({ investor_id: investorId, room_id: roomId });
  if (error) { document.getElementById('linkErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageInvestors();
}

// ============ SUB-OWNER VIEW (formerly "Investor" — no sidebar, simple, read-only) ============
function filterBookingsByRange(bookings, range) {
  if (range === 'All') return bookings;
  const now = new Date();
  let start;
  if (range === 'Today') { start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
  else if (range === 'Week') { start = new Date(now); start.setDate(now.getDate() - 7); }
  else if (range === 'Month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else { return bookings; }
  return bookings.filter(b => b.check_in && new Date(b.check_in) >= start);
}

async function renderInvestorView(range = 'Month') {
  if (!SESSION.investorId) { showError('Aapka profile kisi property se link nahi hai. Owner se contact karo.'); return; }

  const { data: links } = await sb.from('investor_properties').select('room_id, rooms(unit_no, property_name, nickname)').eq('investor_id', SESSION.investorId);
  const roomIds = (links||[]).map(l => l.room_id);

  const { data: allBookings } = roomIds.length
    ? await sb.from('guest_register').select('*, rooms(unit_no, property_name)').in('room_id', roomIds).order('check_in', { ascending:false })
    : { data: [] };

  const bookings = filterBookingsByRange(allBookings||[], range);
  const paidMap = await getPaidMap(bookings.map(b=>b.booking_id));
  const totalRevenue = bookings.reduce((s,b)=>s+(paidMap[b.booking_id]||0),0);

  appEl.innerHTML = `
    <div class="wrap" style="max-width:700px;">
      <div class="card">
        <h1>🏡 ${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName} — Sub-Owner Dashboard</div>
        <button onclick="logout()" class="secondary">🚪 Logout</button>
      </div>
      <div class="card">
        <label style="font-size:13px;color:#445;">Period</label>
        <select id="subOwnerRange">
          <option value="Today" ${range==='Today'?'selected':''}>Aaj (Daily)</option>
          <option value="Week" ${range==='Week'?'selected':''}>Pichle 7 din (Weekly)</option>
          <option value="Month" ${range==='Month'?'selected':''}>Is mahine (Monthly)</option>
          <option value="All" ${range==='All'?'selected':''}>Sab (All Time)</option>
        </select>
      </div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Aapki Properties</span><span class="metric-value">${(links||[]).length}</span></div>
        <div class="metric-row"><span class="metric-label">Bookings (${range})</span><span class="metric-value">${bookings.length}</span></div>
        <div class="metric-row"><span class="metric-label">Revenue Received (${range}) (₹)</span><span class="metric-value">${totalRevenue.toLocaleString("en-IN")}</span></div>
      </div>
      <div class="card">
        <h2 style="font-size:15px;margin-bottom:10px;">Aapki Properties</h2>
        ${(links||[]).map(l => `<div class="metric-row"><span class="metric-label">${l.rooms?.property_name||''} — ${l.rooms?.unit_no}</span><span class="metric-value">${l.rooms?.nickname||''}</span></div>`).join('') || '<div class="sub">Koi property link nahi hai</div>'}
      </div>
      <div class="card">
        <h2 style="font-size:15px;margin-bottom:10px;">Booking History (${range})</h2>
        <div style="overflow-x:auto;"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>Check-in</th><th>Check-out</th><th>Received (₹)</th></tr></thead>
          <tbody>${bookings.map(b => `
            <tr><td>${b.guest_name||'-'}</td><td>${b.rooms?.unit_no||'-'}</td>
              <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode||'Offline'}</span></td>
              <td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td>
              <td>₹${(paidMap[b.booking_id]||0).toLocaleString("en-IN")}</td></tr>`).join('') || '<tr><td colspan="6" class="sub">Is period mein koi booking nahi mili</td></tr>'}</tbody>
        </table></div>
      </div>
    </div>`;
  document.getElementById('subOwnerRange').onchange = (e) => renderInvestorView(e.target.value);
}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView() {
  if (!SESSION.empId) {
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️ Error</h1>
      <div class="error">Aapka employee ID set nahi hai. Owner se contact karo.</div>
      <button onclick="logout()">Logout</button></div></div>`;
    return;
  }
  const [emp, salary, advance, tasks, attendance] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id", SESSION.empId).single(),
    sb.from("salary_tracker").select("salary_due, salary_paid").eq("emp_id", SESSION.empId),
    sb.from("advance_tracker").select("advance_amount, repaid_amount").eq("emp_id", SESSION.empId),
    sb.from("employee_tasks").select("task_description, status").eq("emp_id", SESSION.empId).eq("status","Pending"),
    sb.from("attendance_log").select("status, att_date").eq("emp_id", SESSION.empId),
  ]);
  const pendingSalary = (salary.data||[]).reduce((s,r)=>s+((r.salary_due||0)-(r.salary_paid||0)),0);
  const pendingAdvance = (advance.data||[]).reduce((s,r)=>s+((r.advance_amount||0)-(r.repaid_amount||0)),0);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthRows = (attendance.data||[]).filter(a => a.att_date?.startsWith(thisMonth));
  const present = monthRows.filter(a=>a.status==="Present").length;
  const absent = monthRows.filter(a=>a.status==="Absent").length;

  appEl.innerHTML = `
    <div class="wrap">
      <div class="card"><h1>🏡 ${BRAND}</h1><div class="sub">👋 ${SESSION.displayName} — Employee Dashboard</div>
        <button onclick="logout()" class="secondary">🚪 Logout</button></div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value">${emp.data?.name||'-'}</span></div>
        <div class="metric-row"><span class="metric-label">Role</span><span class="metric-value">${emp.data?.role||'-'}</span></div>
        <div class="metric-row"><span class="metric-label">Monthly Salary</span><span class="metric-value">₹${(emp.data?.monthly_salary||0).toLocaleString("en-IN")}</span></div>
        <div class="metric-row"><span class="metric-label">Salary Pending</span><span class="metric-value ${pendingSalary>0?'warn':''}">₹${pendingSalary.toLocaleString("en-IN")}</span></div>
        <div class="metric-row"><span class="metric-label">Advance Pending</span><span class="metric-value ${pendingAdvance>0?'warn':''}">₹${pendingAdvance.toLocaleString("en-IN")}</span></div>
        <div class="metric-row"><span class="metric-label">Present This Month</span><span class="metric-value">${present}</span></div>
        <div class="metric-row"><span class="metric-label">Absent This Month</span><span class="metric-value ${absent>0?'warn':''}">${absent}</span></div>
      </div>
      <div class="card">
        <h2 style="font-size:16px;margin-bottom:12px;">📋 Pending Tasks</h2>
        ${(tasks.data||[]).length === 0 ? `<div class="sub">Koi pending task nahi ✅</div>` :
          tasks.data.map(t => `<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join("")}
      </div>
    </div>`;
}

// ============ START APP ============
init();
