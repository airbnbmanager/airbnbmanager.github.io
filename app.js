const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const appEl = document.getElementById("app");

let SESSION = {
  userId: null,
  role: null,
  empId: null,
  currentPage: 'dashboard'
};

// ============ INITIALIZATION ============
async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      renderLogin();
    } else {
      await loadProfile(session.user.id);
    }
  } catch (err) {
    showError("Setup abhi incomplete hai. config.js check karo.", err);
  }
}

async function loadProfile(userId) {
  const { data: profile, error } = await sb
    .from("profiles")
    .select("role, emp_id")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    showError("Profile nahi mila. Owner se contact karo.");
    return;
  }

  SESSION.userId = userId;
  SESSION.role = profile.role;
  SESSION.empId = profile.emp_id;

  if (profile.role === 'employee') {
    renderEmployeeView();
  } else {
    renderDashboard();
  }
}

function showError(msg, err = null) {
  appEl.innerHTML = `
    <div class="wrap">
      <div class="card">
        <h1>⚠️ Error</h1>
        <div class="error">${msg}${err ? '<br><br>' + err.message : ''}</div>
      </div>
    </div>`;
}

// ============ LOGIN ============
function renderLogin() {
  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <h1>🏡 Airbnb Manager</h1>
        <div class="sub">Login karo apne credentials se</div>
        <input id="email" type="email" placeholder="Email" />
        <input id="password" type="password" placeholder="Password" />
        <button id="loginBtn">Login</button>
        <div id="err"></div>
      </div>
    </div>`;

  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById("err").innerHTML = `<div class="error">${error.message}</div>`;
      return;
    }
    await loadProfile(data.user.id);
  };
}

async function logout() {
  await sb.auth.signOut();
  SESSION = { userId: null, role: null, empId: null, currentPage: 'dashboard' };
  renderLogin();
}

// ============ LAYOUT SHELL ============
function renderShell(content, activePage = 'dashboard') {
  const isOwnerOrViewer = SESSION.role === 'owner' || SESSION.role === 'viewer';

  if (!isOwnerOrViewer) {
    appEl.innerHTML = content;
    return;
  }

  appEl.innerHTML = `
    <div class="app-container">
      <aside class="sidebar">
        <h2>🏡 Airbnb Manager</h2>
        <nav>
          <a href="#" data-page="dashboard"    class="${activePage === 'dashboard'    ? 'active' : ''}">📊 Dashboard</a>
          <a href="#" data-page="rooms"        class="${activePage === 'rooms'        ? 'active' : ''}">🏠 Manage Rooms</a>
          <a href="#" data-page="flats"        class="${activePage === 'flats'        ? 'active' : ''}">🛏️ Flats Status</a>
          <a href="#" data-page="bookings"     class="${activePage === 'bookings'     ? 'active' : ''}">📅 Manage Bookings</a>
          <a href="#" data-page="employees"    class="${activePage === 'employees'    ? 'active' : ''}">👥 Manage Employees</a>
          <a href="#" data-page="tasks"        class="${activePage === 'tasks'        ? 'active' : ''}">🧰 Employee Tasks</a>
          <a href="#" data-page="attendance"   class="${activePage === 'attendance'   ? 'active' : ''}">📋 Attendance</a>
          <a href="#" data-page="att-summary"  class="${activePage === 'att-summary'  ? 'active' : ''}">📅 Monthly Summary</a>
          <a href="#" data-page="salary"       class="${activePage === 'salary'       ? 'active' : ''}">💰 Salary Tracker</a>
          <a href="#" data-page="advance"      class="${activePage === 'advance'      ? 'active' : ''}">💵 Advance Tracker</a>
        </nav>
        <div class="logout-link" id="logoutBtn">🚪 Logout</div>
      </aside>
      <main class="main-content" id="mainContent">
        ${content}
      </main>
    </div>`;

  document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      SESSION.currentPage = page;
      navigate(page);
    };
  });

  document.getElementById('logoutBtn').onclick = logout;
}

// ============ NAVIGATE ============
function navigate(page) {
  switch(page) {
    case 'dashboard':   renderDashboard(); break;
    case 'rooms':       renderManageRooms(); break;
    case 'flats':       renderFlatsStatus(); break;
    case 'bookings':    renderManageBookings(); break;
    case 'employees':   renderManageEmployees(); break;
    case 'tasks':       renderEmployeeTasks(); break;
    case 'attendance':  renderAttendance(); break;
    case 'att-summary': renderAttendanceSummary(); break;
    case 'salary':      renderSalaryTracker(); break;
    case 'advance':     renderAdvanceTracker(); break;
    default:            renderDashboard();
  }
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
    sb.from("guest_register").select("total_amount, advance_paid"),
    sb.from("attendance_log").select("status, att_date"),
    sb.from("employee_tasks").select("status"),
  ]);

  const totalRooms    = rooms.data?.length || 0;
  const notBookable   = rooms.data?.filter(r => r.bookable === false).length || 0;
  const free          = flats.data?.filter(f => f.status === "Free").length || 0;
  const booked        = flats.data?.filter(f => f.status === "Booked").length || 0;
  const dirty         = flats.data?.filter(f => f.cleaning_status === "Dirty").length || 0;
  const totalEmp      = employees.data?.length || 0;

  const pendingSalary  = (salary.data  || []).reduce((s,r) => s + ((r.salary_due||0)-(r.salary_paid||0)), 0);
  const pendingAdvance = (advance.data || []).reduce((s,r) => s + ((r.advance_amount||0)-(r.repaid_amount||0)), 0);
  const guestBalance   = (guests.data  || []).reduce((s,r) => s + ((r.total_amount||0)-(r.advance_paid||0)), 0);

  const today        = new Date().toISOString().slice(0, 10);
  const presentToday = (attendance.data||[]).filter(a => a.att_date===today && a.status==="Present").length;
  const absentToday  = (attendance.data||[]).filter(a => a.att_date===today && a.status==="Absent").length;
  const pendingTasks = (tasks.data||[]).filter(t => t.status==="Pending").length;

  const metrics = [
    ["Total Rooms",              totalRooms,                                  false],
    ["Rooms Not Bookable",       notBookable,                                 notBookable > 0],
    ["Rooms Free Now",           free,                                        false],
    ["Rooms Booked Now",         booked,                                      false],
    ["Rooms Dirty",              dirty,                                       dirty > 0],
    ["Total Employees",          totalEmp,                                    false],
    ["Pending Salary (₹)",       pendingSalary.toLocaleString("en-IN"),       pendingSalary > 0],
    ["Advance Outstanding (₹)",  pendingAdvance.toLocaleString("en-IN"),      pendingAdvance > 0],
    ["Guest Balance Due (₹)",    guestBalance.toLocaleString("en-IN"),        guestBalance > 0],
    ["Present Today",            presentToday,                                false],
    ["Absent Today",             absentToday,                                 absentToday > 0],
    ["Pending Tasks",            pendingTasks,                                pendingTasks > 0],
  ];

  const content = `
    <div class="card">
      <h1>📊 Dashboard</h1>
      <div class="sub">Live data from Supabase</div>
    </div>
    <div class="card">
      ${metrics.map(([label, val, warn]) => `
        <div class="metric-row">
          <span class="metric-label">${label}</span>
          <span class="metric-value ${warn ? 'warn' : ''}">${val}</span>
        </div>`).join("")}
    </div>`;

  renderShell(content, 'dashboard');
}

// ============ MANAGE ROOMS ============
async function renderManageRooms() {
  renderShell(`<div class="loading">Loading rooms...</div>`, 'rooms');

  const { data: rooms, error } = await sb
    .from("rooms").select("*").order("room_no");

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'rooms');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>🏠 Manage Rooms</h1>
      <div class="sub">${rooms.length} rooms total</div>
      ${isOwner ? `<button onclick="renderAddRoom()">➕ Add New Room</button>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Room No</th><th>Type</th><th>Rent/Night</th>
            <th>Max Guests</th><th>Bookable</th>
            ${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${rooms.map(room => `
            <tr>
              <td><strong>${room.room_no}</strong></td>
              <td>${room.room_type || '-'}</td>
              <td>₹${room.rent_per_night || 0}</td>
              <td>${room.max_guests || '-'}</td>
              <td><span class="badge ${room.bookable ? 'green' : 'red'}">
                ${room.bookable ? 'Yes' : 'No'}</span></td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editRoom('${room.room_id}')">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteRoom('${room.room_id}','${room.room_no}')">🗑️ Delete</button>
                </td>` : ''}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'rooms');
}

async function renderAddRoom() {
  const content = `
    <div class="card">
      <h1>➕ Add New Room</h1>
      <button class="secondary" onclick="renderManageRooms()">← Back</button>
    </div>
    <div class="card">
      <input id="roomNo" placeholder="Room Number (e.g., 101)" />
      <input id="address" placeholder="Address" />
      <input id="roomType" placeholder="Type (e.g., Blue, Green)" />
      <input id="rent" type="number" placeholder="Rent per Night (₹)" />
      <input id="maxGuests" type="number" placeholder="Max Guests" />
      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <input type="checkbox" id="bookable" checked style="width:auto;" />
        <span>Bookable</span>
      </label>
      <textarea id="notes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewRoom()">💾 Save Room</button>
      <div id="addErr"></div>
    </div>`;
  renderShell(content, 'rooms');
}

async function saveNewRoom() {
  const roomNo    = document.getElementById('roomNo').value.trim();
  const address   = document.getElementById('address').value.trim();
  const roomType  = document.getElementById('roomType').value.trim();
  const rent      = parseFloat(document.getElementById('rent').value) || 0;
  const maxGuests = parseInt(document.getElementById('maxGuests').value) || 0;
  const bookable  = document.getElementById('bookable').checked;
  const notes     = document.getElementById('notes').value.trim();

  if (!roomNo) {
    document.getElementById('addErr').innerHTML = '<div class="error">Room number required</div>';
    return;
  }

  const roomId = 'R' + Date.now();
  const { error } = await sb.from('rooms').insert({
    room_id: roomId, room_no: roomNo, address: address||null,
    room_type: roomType||null, rent_per_night: rent,
    max_guests: maxGuests, bookable, notes: notes||null
  });

  if (error) {
    document.getElementById('addErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }

  await sb.from('flats_status').insert({
    room_id: roomId, status: 'Free', cleaning_status: 'Clean'
  });

  renderManageRooms();
}

async function editRoom(roomId) {
  const { data: room, error } = await sb
    .from('rooms').select('*').eq('room_id', roomId).single();
  if (error || !room) { alert('Room not found'); return; }

  const content = `
    <div class="card">
      <h1>✏️ Edit Room</h1>
      <button class="secondary" onclick="renderManageRooms()">← Back</button>
    </div>
    <div class="card">
      <input id="roomNo" value="${room.room_no}" placeholder="Room Number" />
      <input id="address" value="${room.address||''}" placeholder="Address" />
      <input id="roomType" value="${room.room_type||''}" placeholder="Type" />
      <input id="rent" type="number" value="${room.rent_per_night||0}" />
      <input id="maxGuests" type="number" value="${room.max_guests||0}" />
      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <input type="checkbox" id="bookable" ${room.bookable?'checked':''} style="width:auto;" />
        <span>Bookable</span>
      </label>
      <textarea id="notes">${room.notes||''}</textarea>
      <button onclick="updateRoom('${roomId}')">💾 Update Room</button>
      <div id="editErr"></div>
    </div>`;
  renderShell(content, 'rooms');
}

async function updateRoom(roomId) {
  const roomNo    = document.getElementById('roomNo').value.trim();
  const address   = document.getElementById('address').value.trim();
  const roomType  = document.getElementById('roomType').value.trim();
  const rent      = parseFloat(document.getElementById('rent').value) || 0;
  const maxGuests = parseInt(document.getElementById('maxGuests').value) || 0;
  const bookable  = document.getElementById('bookable').checked;
  const notes     = document.getElementById('notes').value.trim();

  if (!roomNo) {
    document.getElementById('editErr').innerHTML = '<div class="error">Room number required</div>';
    return;
  }

  const { error } = await sb.from('rooms').update({
    room_no: roomNo, address: address||null, room_type: roomType||null,
    rent_per_night: rent, max_guests: maxGuests, bookable, notes: notes||null
  }).eq('room_id', roomId);

  if (error) {
    document.getElementById('editErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderManageRooms();
}

async function deleteRoom(roomId, roomNo) {
  if (!confirm(`Delete room "${roomNo}"? This cannot be undone.`)) return;
  await sb.from('flats_status').delete().eq('room_id', roomId);
  const { error } = await sb.from('rooms').delete().eq('room_id', roomId);
  if (error) { alert('Error: ' + error.message); return; }
  renderManageRooms();
}

// ============ FLATS STATUS ============
async function renderFlatsStatus() {
  renderShell(`<div class="loading">Loading flats status...</div>`, 'flats');

  const { data: flats, error } = await sb
    .from('flats_status')
    .select('*, rooms(room_no, room_type)')
    .order('room_id');

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'flats');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>🛏️ Flats Status (Live)</h1>
      <div class="sub">${flats.length} flats total</div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Room No</th><th>Type</th><th>Status</th>
            <th>Cleaning</th><th>Issue</th><th>Last Cleaned</th>
            ${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${flats.map(f => `
            <tr>
              <td><strong>${f.rooms?.room_no || f.room_id}</strong></td>
              <td>${f.rooms?.room_type || '-'}</td>
              <td><span class="badge ${
                f.status === 'Free' ? 'green' :
                f.status === 'Booked' ? 'blue' : 'red'}">
                ${f.status || 'Free'}</span></td>
              <td><span class="badge ${
                f.cleaning_status === 'Clean' ? 'green' :
                f.cleaning_status === 'In Progress' ? 'yellow' : 'red'}">
                ${f.cleaning_status || 'Clean'}</span></td>
              <td>${f.issue || '-'}</td>
              <td>${f.last_cleaned || '-'}</td>
              ${isOwner ? `
                <td>
                  <button class="btn-sm" onclick="editFlatStatus('${f.room_id}')">✏️ Edit</button>
                </td>` : ''}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'flats');
}

async function editFlatStatus(roomId) {
  const { data: flat, error } = await sb
    .from('flats_status')
    .select('*, rooms(room_no, room_type)')
    .eq('room_id', roomId).single();
  if (error || !flat) { alert('Flat not found'); return; }

  const today = new Date().toISOString().slice(0, 10);
  const content = `
    <div class="card">
      <h1>✏️ Update Flat Status</h1>
      <div class="sub">Room: <strong>${flat.rooms?.room_no || roomId}</strong> (${flat.rooms?.room_type || '-'})</div>
      <button class="secondary" onclick="renderFlatsStatus()">← Back</button>
    </div>
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
    </div>`;
  renderShell(content, 'flats');
}

async function updateFlatStatus(roomId) {
  const status   = document.getElementById('flatStatus').value;
  const cleaning = document.getElementById('cleaningStatus').value;
  const issue    = document.getElementById('flatIssue').value.trim();
  const cleaned  = document.getElementById('lastCleaned').value;
  const notes    = document.getElementById('flatNotes').value.trim();

  const { error } = await sb.from('flats_status').update({
    status, cleaning_status: cleaning,
    issue: issue||null, last_cleaned: cleaned||null, notes: notes||null
  }).eq('room_id', roomId);

  if (error) {
    document.getElementById('flatErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderFlatsStatus();
}

// ============ MANAGE BOOKINGS ============
async function renderManageBookings() {
  renderShell(`<div class="loading">Loading bookings...</div>`, 'bookings');

  const { data: bookings, error } = await sb
    .from("guest_register").select("*")
    .order("check_in", { ascending: false });

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'bookings');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>📅 Manage Bookings</h1>
      <div class="sub">${bookings.length} bookings total</div>
      ${isOwner ? `<button onclick="renderAddBooking()">➕ Add New Booking</button>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Guest</th><th>Room</th><th>Check-in</th>
            <th>Check-out</th><th>Total</th><th>Paid</th>
            <th>Status</th>${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => {
            const balance = (b.total_amount||0) - (b.advance_paid||0);
            return `
            <tr>
              <td><strong>${b.guest_name||'-'}</strong><br><small>${b.phone||''}</small></td>
              <td>${b.room_id||'-'}</td>
              <td>${b.check_in||'-'}</td>
              <td>${b.check_out||'-'}</td>
              <td>₹${(b.total_amount||0).toLocaleString("en-IN")}</td>
              <td>₹${(b.advance_paid||0).toLocaleString("en-IN")}</td>
              <td>
                <span class="badge ${b.payment_status==='Paid'?'green':b.payment_status==='Partial'?'yellow':'red'}">
                  ${b.payment_status||'Unpaid'}</span>
                ${balance > 0 ? `<br><small class="warn">Due: ₹${balance.toLocaleString("en-IN")}</small>` : ''}
              </td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editBooking('${b.booking_id}')">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteBooking('${b.booking_id}','${b.guest_name}')">🗑️ Delete</button>
                </td>` : ''}
            </tr>`}).join("")}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'bookings');
}

async function renderAddBooking() {
  const { data: rooms } = await sb.from('rooms').select('room_id, room_no').order('room_no');
  const content = `
    <div class="card">
      <h1>➕ Add New Booking</h1>
      <button class="secondary" onclick="renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <input id="guestName" placeholder="Guest Name" />
      <input id="guestPhone" placeholder="Phone Number" />
      <input id="guestId" placeholder="ID Proof (Aadhar/PAN)" />
      <select id="roomId">
        <option value="">Select Room</option>
        ${(rooms||[]).map(r => `<option value="${r.room_id}">${r.room_no}</option>`).join('')}
      </select>
      <input id="checkIn" type="date" />
      <input id="checkOut" type="date" />
      <input id="guests" type="number" placeholder="Number of Guests" />
      <input id="totalAmount" type="number" placeholder="Total Amount (₹)" />
      <input id="advancePaid" type="number" placeholder="Advance Paid (₹)" />
      <select id="paymentStatus">
        <option value="Unpaid">Unpaid</option>
        <option value="Partial">Partial</option>
        <option value="Paid">Paid</option>
      </select>
      <textarea id="bookingNotes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewBooking()">💾 Save Booking</button>
      <div id="addBookingErr"></div>
    </div>`;
  renderShell(content, 'bookings');
}

async function saveNewBooking() {
  const guestName   = document.getElementById('guestName').value.trim();
  const guestPhone  = document.getElementById('guestPhone').value.trim();
  const guestId     = document.getElementById('guestId').value.trim();
  const roomId      = document.getElementById('roomId').value;
  const checkIn     = document.getElementById('checkIn').value;
  const checkOut    = document.getElementById('checkOut').value;
  const guests      = parseInt(document.getElementById('guests').value) || 1;
  const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
  const advancePaid = parseFloat(document.getElementById('advancePaid').value) || 0;
  const payStatus   = document.getElementById('paymentStatus').value;
  const notes       = document.getElementById('bookingNotes').value.trim();

  if (!guestName || !roomId) {
    document.getElementById('addBookingErr').innerHTML =
      '<div class="error">Guest name aur room required hai</div>';
    return;
  }

  const bookingId = 'B' + Date.now();
  const { error } = await sb.from('guest_register').insert({
    booking_id: bookingId, guest_name: guestName,
    phone: guestPhone||null, id_proof: guestId||null,
    room_id: roomId, check_in: checkIn||null, check_out: checkOut||null,
    guests, total_amount: totalAmount, advance_paid: advancePaid,
    payment_status: payStatus, notes: notes||null
  });

  if (error) {
    document.getElementById('addBookingErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }

  await sb.from('flats_status').upsert({ room_id: roomId, status: 'Booked' });
  renderManageBookings();
}

async function editBooking(bookingId) {
  const { data: booking, error } = await sb
    .from('guest_register').select('*').eq('booking_id', bookingId).single();
  if (error || !booking) { alert('Booking not found'); return; }

  const { data: rooms } = await sb.from('rooms').select('room_id, room_no').order('room_no');
  const content = `
    <div class="card">
      <h1>✏️ Edit Booking</h1>
      <button class="secondary" onclick="renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <input id="guestName" value="${booking.guest_name||''}" placeholder="Guest Name" />
      <input id="guestPhone" value="${booking.phone||''}" placeholder="Phone" />
      <input id="guestId" value="${booking.id_proof||''}" placeholder="ID Proof" />
      <select id="roomId">
        ${(rooms||[]).map(r => `
          <option value="${r.room_id}" ${r.room_id===booking.room_id?'selected':''}>
            ${r.room_no}</option>`).join('')}
      </select>
      <input id="checkIn" type="date" value="${booking.check_in||''}" />
      <input id="checkOut" type="date" value="${booking.check_out||''}" />
      <input id="guests" type="number" value="${booking.guests||1}" />
      <input id="totalAmount" type="number" value="${booking.total_amount||0}" />
      <input id="advancePaid" type="number" value="${booking.advance_paid||0}" />
      <select id="paymentStatus">
        <option value="Unpaid"  ${booking.payment_status==='Unpaid' ?'selected':''}>Unpaid</option>
        <option value="Partial" ${booking.payment_status==='Partial'?'selected':''}>Partial</option>
        <option value="Paid"    ${booking.payment_status==='Paid'   ?'selected':''}>Paid</option>
      </select>
      <textarea id="bookingNotes">${booking.notes||''}</textarea>
      <button onclick="updateBooking('${bookingId}')">💾 Update Booking</button>
      <div id="editBookingErr"></div>
    </div>`;
  renderShell(content, 'bookings');
}

async function updateBooking(bookingId) {
  const guestName   = document.getElementById('guestName').value.trim();
  const guestPhone  = document.getElementById('guestPhone').value.trim();
  const guestId     = document.getElementById('guestId').value.trim();
  const roomId      = document.getElementById('roomId').value;
  const checkIn     = document.getElementById('checkIn').value;
  const checkOut    = document.getElementById('checkOut').value;
  const guests      = parseInt(document.getElementById('guests').value) || 1;
  const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
  const advancePaid = parseFloat(document.getElementById('advancePaid').value) || 0;
  const payStatus   = document.getElementById('paymentStatus').value;
  const notes       = document.getElementById('bookingNotes').value.trim();

  if (!guestName || !roomId) {
    document.getElementById('editBookingErr').innerHTML =
      '<div class="error">Guest name aur room required hai</div>';
    return;
  }

  const { error } = await sb.from('guest_register').update({
    guest_name: guestName, phone: guestPhone||null, id_proof: guestId||null,
    room_id: roomId, check_in: checkIn||null, check_out: checkOut||null,
    guests, total_amount: totalAmount, advance_paid: advancePaid,
    payment_status: payStatus, notes: notes||null
  }).eq('booking_id', bookingId);

  if (error) {
    document.getElementById('editBookingErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderManageBookings();
}

async function deleteBooking(bookingId, guestName) {
  if (!confirm(`Delete booking for "${guestName}"?`)) return;
  const { error } = await sb.from('guest_register').delete().eq('booking_id', bookingId);
  if (error) { alert('Error: ' + error.message); return; }
  renderManageBookings();
}

// ============ MANAGE EMPLOYEES ============
async function renderManageEmployees() {
  renderShell(`<div class="loading">Loading employees...</div>`, 'employees');

  const { data: employees, error } = await sb
    .from("employees").select("*").order("name");

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'employees');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>👥 Manage Employees</h1>
      <div class="sub">${employees.length} employees total</div>
      ${isOwner ? `<button onclick="renderAddEmployee()">➕ Add New Employee</button>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Role</th><th>Phone</th>
            <th>Monthly Salary</th><th>Status</th>
            ${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${employees.map(emp => `
            <tr>
              <td><strong>${emp.name}</strong></td>
              <td>${emp.role||'-'}</td>
              <td>${emp.phone||'-'}</td>
              <td>₹${emp.monthly_salary?.toLocaleString("en-IN")||0}</td>
              <td><span class="badge ${emp.status==='Active'?'green':'red'}">
                ${emp.status||'Active'}</span></td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editEmployee('${emp.emp_id}')">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteEmployee('${emp.emp_id}','${emp.name}')">🗑️ Delete</button>
                </td>` : ''}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'employees');
}

async function renderAddEmployee() {
  const content = `
    <div class="card">
      <h1>➕ Add New Employee</h1>
      <button class="secondary" onclick="renderManageEmployees()">← Back</button>
    </div>
    <div class="card">
      <input id="empName" placeholder="Full Name" />
      <input id="empPhone" placeholder="Phone Number" />
      <input id="empRole" placeholder="Role (e.g., Manager, Cleaner)" />
      <input id="empSalary" type="number" placeholder="Monthly Salary (₹)" />
      <input id="empJoinDate" type="date" />
      <input id="empRooms" placeholder="Assigned Rooms (comma separated)" />
      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <input type="checkbox" id="empActive" checked style="width:auto;" />
        <span>Active</span>
      </label>
      <textarea id="empNotes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewEmployee()">💾 Save Employee</button>
      <div id="addEmpErr"></div>
    </div>`;
  renderShell(content, 'employees');
}

async function saveNewEmployee() {
  const name     = document.getElementById('empName').value.trim();
  const phone    = document.getElementById('empPhone').value.trim();
  const role     = document.getElementById('empRole').value.trim();
  const salary   = parseFloat(document.getElementById('empSalary').value) || 0;
  const joinDate = document.getElementById('empJoinDate').value;
  const rooms    = document.getElementById('empRooms').value.trim();
  const active   = document.getElementById('empActive').checked;
  const notes    = document.getElementById('empNotes').value.trim();

  if (!name) {
    document.getElementById('addEmpErr').innerHTML = '<div class="error">Name required</div>';
    return;
  }

  const empId = 'E' + Date.now();
  const { error } = await sb.from('employees').insert({
    emp_id: empId, name, phone: phone||null, role: role||null,
    assigned_rooms: rooms||null, joining_date: joinDate||null,
    monthly_salary: salary, status: active?'Active':'Inactive', notes: notes||null
  });

  if (error) {
    document.getElementById('addEmpErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderManageEmployees();
}

async function editEmployee(empId) {
  const { data: emp, error } = await sb
    .from('employees').select('*').eq('emp_id', empId).single();
  if (error || !emp) { alert('Employee not found'); return; }

  const content = `
    <div class="card">
      <h1>✏️ Edit Employee</h1>
      <button class="secondary" onclick="renderManageEmployees()">← Back</button>
    </div>
    <div class="card">
      <input id="empName" value="${emp.name}" placeholder="Full Name" />
      <input id="empPhone" value="${emp.phone||''}" placeholder="Phone Number" />
      <input id="empRole" value="${emp.role||''}" placeholder="Role" />
      <input id="empSalary" type="number" value="${emp.monthly_salary||0}" />
      <input id="empJoinDate" type="date" value="${emp.joining_date||''}" />
      <input id="empRooms" value="${emp.assigned_rooms||''}" placeholder="Assigned Rooms" />
      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <input type="checkbox" id="empActive" ${emp.status==='Active'?'checked':''} style="width:auto;" />
        <span>Active</span>
      </label>
      <textarea id="empNotes">${emp.notes||''}</textarea>
      <button onclick="updateEmployee('${empId}')">💾 Update Employee</button>
      <div id="editEmpErr"></div>
    </div>`;
  renderShell(content, 'employees');
}

async function updateEmployee(empId) {
  const name     = document.getElementById('empName').value.trim();
  const phone    = document.getElementById('empPhone').value.trim();
  const role     = document.getElementById('empRole').value.trim();
  const salary   = parseFloat(document.getElementById('empSalary').value) || 0;
  const joinDate = document.getElementById('empJoinDate').value;
  const rooms    = document.getElementById('empRooms').value.trim();
  const active   = document.getElementById('empActive').checked;
  const notes    = document.getElementById('empNotes').value.trim();

  if (!name) {
    document.getElementById('editEmpErr').innerHTML = '<div class="error">Name required</div>';
    return;
  }

  const { error } = await sb.from('employees').update({
    name, phone: phone||null, role: role||null,
    assigned_rooms: rooms||null, joining_date: joinDate||null,
    monthly_salary: salary, status: active?'Active':'Inactive', notes: notes||null
  }).eq('emp_id', empId);

  if (error) {
    document.getElementById('editEmpErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
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

  const { data: tasks, error } = await sb
    .from('employee_tasks')
    .select('*, employees(name)')
    .order('assigned_date', { ascending: false });

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'tasks');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>🧰 Employee Tasks</h1>
      <div class="sub">${tasks.length} tasks total</div>
      ${isOwner ? `<button onclick="renderAddTask()">➕ Add New Task</button>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Task</th><th>Assigned Date</th>
            <th>Status</th>${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${tasks.map(t => `
            <tr>
              <td><strong>${t.employees?.name || t.emp_id}</strong></td>
              <td>${t.task_description||'-'}</td>
              <td>${t.assigned_date||'-'}</td>
              <td><span class="badge ${
                t.status==='Completed' ? 'green' :
                t.status==='In Progress' ? 'yellow' : 'red'}">
                ${t.status||'Pending'}</span></td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editTask(${t.id})">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteTask(${t.id})">🗑️ Delete</button>
                </td>` : ''}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'tasks');
}

async function renderAddTask() {
  const { data: employees } = await sb
    .from('employees').select('emp_id, name').eq('status','Active').order('name');
  const today = new Date().toISOString().slice(0, 10);

  const content = `
    <div class="card">
      <h1>➕ Add New Task</h1>
      <button class="secondary" onclick="renderEmployeeTasks()">← Back</button>
    </div>
    <div class="card">
      <select id="taskEmpId">
        <option value="">Select Employee</option>
        ${(employees||[]).map(e =>
          `<option value="${e.emp_id}">${e.name}</option>`).join('')}
      </select>
      <textarea id="taskDesc" placeholder="Task Description"></textarea>
      <input id="taskDate" type="date" value="${today}" />
      <select id="taskStatus">
        <option value="Pending">Pending</option>
        <option value="In Progress">In Progress</option>
        <option value="Completed">Completed</option>
      </select>
      <textarea id="taskNotes" placeholder="Notes (optional)"></textarea>
      <button onclick="saveNewTask()">💾 Save Task</button>
      <div id="addTaskErr"></div>
    </div>`;
  renderShell(content, 'tasks');
}

async function saveNewTask() {
  const empId  = document.getElementById('taskEmpId').value;
  const desc   = document.getElementById('taskDesc').value.trim();
  const date   = document.getElementById('taskDate').value;
  const status = document.getElementById('taskStatus').value;
  const notes  = document.getElementById('taskNotes').value.trim();

  if (!empId || !desc) {
    document.getElementById('addTaskErr').innerHTML =
      '<div class="error">Employee aur task description required hai</div>';
    return;
  }

  const { error } = await sb.from('employee_tasks').insert({
    emp_id: empId, task_description: desc,
    assigned_date: date||null, status, notes: notes||null
  });

  if (error) {
    document.getElementById('addTaskErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderEmployeeTasks();
}

async function editTask(id) {
  const { data: task, error } = await sb
    .from('employee_tasks').select('*, employees(name)').eq('id', id).single();
  if (error || !task) { alert('Task not found'); return; }

  const content = `
    <div class="card">
      <h1>✏️ Edit Task</h1>
      <button class="secondary" onclick="renderEmployeeTasks()">← Back</button>
    </div>
    <div class="card">
      <div class="sub"><strong>Employee:</strong> ${task.employees?.name || task.emp_id}</div>
      <textarea id="taskDesc">${task.task_description||''}</textarea>
      <input id="taskDate" type="date" value="${task.assigned_date||''}" />
      <select id="taskStatus">
        <option value="Pending"     ${task.status==='Pending'    ?'selected':''}>Pending</option>
        <option value="In Progress" ${task.status==='In Progress'?'selected':''}>In Progress</option>
        <option value="Completed"   ${task.status==='Completed'  ?'selected':''}>Completed</option>
      </select>
      <textarea id="taskNotes">${task.notes||''}</textarea>
      <button onclick="updateTask(${id})">💾 Update Task</button>
      <div id="editTaskErr"></div>
    </div>`;
  renderShell(content, 'tasks');
}

async function updateTask(id) {
  const desc   = document.getElementById('taskDesc').value.trim();
  const date   = document.getElementById('taskDate').value;
  const status = document.getElementById('taskStatus').value;
  const notes  = document.getElementById('taskNotes').value.trim();

  const { error } = await sb.from('employee_tasks').update({
    task_description: desc, assigned_date: date||null,
    status, notes: notes||null
  }).eq('id', id);

  if (error) {
    document.getElementById('editTaskErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
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

  const today = new Date().toISOString().slice(0, 10);
  const [employees, attendance] = await Promise.all([
    sb.from('employees').select('emp_id, name').eq('status','Active').order('name'),
    sb.from('attendance_log').select('*').eq('att_date', today)
  ]);

  const isOwner = SESSION.role === 'owner';
  const attMap  = {};
  (attendance.data||[]).forEach(a => { attMap[a.emp_id] = a.status; });

  const content = `
    <div class="card">
      <h1>📋 Attendance — ${today}</h1>
      <div class="sub">${employees.data?.length||0} active employees</div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Status</th>
            ${isOwner ? '<th>Mark</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${(employees.data||[]).map(emp => {
            const status = attMap[emp.emp_id] || 'Not Marked';
            return `
            <tr>
              <td><strong>${emp.name}</strong></td>
              <td><span class="badge ${
                status==='Present' ? 'green' :
                status==='Absent'  ? 'red'   : 'yellow'}">
                ${status}</span></td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="markAttendance('${emp.emp_id}','Present')">✅ Present</button>
                  <button class="btn-sm danger" onclick="markAttendance('${emp.emp_id}','Absent')">❌ Absent</button>
                  <button class="btn-sm secondary" onclick="markAttendance('${emp.emp_id}','Half Day')">½ Half Day</button>
                </td>` : ''}
            </tr>`}).join("")}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'attendance');
}

async function markAttendance(empId, status) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await sb
    .from('attendance_log').select('id')
    .eq('emp_id', empId).eq('att_date', today).single();

  if (existing) {
    await sb.from('attendance_log').update({ status }).eq('id', existing.id);
  } else {
    await sb.from('attendance_log').insert({ emp_id: empId, att_date: today, status });
  }
  renderAttendance();
}

// ============ MONTHLY ATTENDANCE SUMMARY ============
async function renderAttendanceSummary() {
  renderShell(`<div class="loading">Loading summary...</div>`, 'att-summary');

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [employees, logs] = await Promise.all([
    sb.from('employees').select('emp_id, name').eq('status','Active').order('name'),
    sb.from('attendance_log').select('emp_id, att_date, status')
      .like('att_date', `${currentMonth}%`)
  ]);

  const summary = (employees.data||[]).map(emp => {
    const empLogs  = (logs.data||[]).filter(l => l.emp_id === emp.emp_id);
    const present  = empLogs.filter(l => l.status === 'Present').length;
    const absent   = empLogs.filter(l => l.status === 'Absent').length;
    const halfDay  = empLogs.filter(l => l.status === 'Half Day').length;
    const leave    = empLogs.filter(l =>
      l.status === 'Paid Leave' || l.status === 'Unpaid Leave').length;
    const total    = present + absent + halfDay + leave;
    const pct      = total > 0
      ? ((present + halfDay * 0.5) / total * 100).toFixed(1) : '0.0';
    return { ...emp, present, absent, halfDay, leave, pct };
  });

  const content = `
    <div class="card">
      <h1>📅 Monthly Attendance Summary</h1>
      <div class="sub">Month: <strong>${currentMonth}</strong></div>
      <button class="secondary" onclick="renderAttendance()">📋 Daily Log</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Present</th><th>Half Days</th>
            <th>Absent</th><th>Leave</th><th>Attendance %</th>
          </tr>
        </thead>
        <tbody>
          ${summary.map(s => `
            <tr>
              <td><strong>${s.name}</strong></td>
              <td><span class="badge green">${s.present}</span></td>
              <td><span class="badge yellow">${s.halfDay}</span></td>
              <td><span class="badge ${s.absent > 0 ? 'red' : 'green'}">${s.absent}</span></td>
              <td><span class="badge blue">${s.leave}</span></td>
              <td><strong class="${parseFloat(s.pct) < 75 ? 'warn' : ''}">${s.pct}%</strong></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'att-summary');
}

// ============ SALARY TRACKER ============
async function renderSalaryTracker() {
  renderShell(`<div class="loading">Loading salary data...</div>`, 'salary');

  const { data: salaries, error } = await sb
    .from('salary_tracker')
    .select('*, employees(name)')
    .order('month', { ascending: false });

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'salary');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>💰 Salary Tracker</h1>
      <div class="sub">${salaries.length} salary records</div>
      ${isOwner ? `<button onclick="renderAddSalary()">➕ Add Salary Record</button>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Month</th><th>Due</th>
            <th>Paid</th><th>Balance</th><th>Payment Date</th>
            ${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${salaries.map(s => {
            const balance = (s.salary_due||0) - (s.salary_paid||0);
            return `
            <tr>
              <td><strong>${s.employees?.name || s.emp_id}</strong></td>
              <td>${s.month||'-'}</td>
              <td>₹${(s.salary_due||0).toLocaleString("en-IN")}</td>
              <td>₹${(s.salary_paid||0).toLocaleString("en-IN")}</td>
              <td><span class="${balance > 0 ? 'warn' : ''}">
                ₹${balance.toLocaleString("en-IN")}</span></td>
              <td>${s.payment_date||'-'}</td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editSalary(${s.id})">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteSalary(${s.id})">🗑️ Delete</button>
                </td>` : ''}
            </tr>`}).join("")}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'salary');
}

async function renderAddSalary() {
  const { data: employees } = await sb
    .from('employees').select('emp_id, name').eq('status','Active').order('name');
  const currentMonth = new Date().toISOString().slice(0, 7);

  const content = `
    <div class="card">
      <h1>➕ Add Salary Record</h1>
      <button class="secondary" onclick="renderSalaryTracker()">← Back</button>
    </div>
    <div class="card">
      <select id="salEmpId">
        <option value="">Select Employee</option>
        ${(employees||[]).map(e =>
          `<option value="${e.emp_id}">${e.name}</option>`).join('')}
      </select>
      <input id="salMonth" type="month" value="${currentMonth}" />
      <input id="salDue" type="number" placeholder="Salary Due (₹)" />
      <input id="salPaid" type="number" placeholder="Salary Paid (₹)" />
      <input id="salPayDate" type="date" />
      <input id="salPayMode" placeholder="Payment Mode (Cash/UPI/Bank)" />
      <textarea id="salNotes" placeholder="Notes"></textarea>
      <button onclick="saveNewSalary()">💾 Save Salary Record</button>
      <div id="addSalErr"></div>
    </div>`;
  renderShell(content, 'salary');
}

async function saveNewSalary() {
  const empId   = document.getElementById('salEmpId').value;
  const month   = document.getElementById('salMonth').value;
  const due     = parseFloat(document.getElementById('salDue').value) || 0;
  const paid    = parseFloat(document.getElementById('salPaid').value) || 0;
  const payDate = document.getElementById('salPayDate').value;
  const payMode = document.getElementById('salPayMode').value.trim();
  const notes   = document.getElementById('salNotes').value.trim();

  if (!empId || !month) {
    document.getElementById('addSalErr').innerHTML =
      '<div class="error">Employee aur month required hai</div>';
    return;
  }

  const { error } = await sb.from('salary_tracker').insert({
    emp_id: empId, month, salary_due: due, salary_paid: paid,
    payment_date: payDate||null, payment_mode: payMode||null, notes: notes||null
  });

  if (error) {
    document.getElementById('addSalErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderSalaryTracker();
}

async function editSalary(id) {
  const { data: salary, error } = await sb
    .from('salary_tracker').select('*, employees(name)').eq('id', id).single();
  if (error || !salary) { alert('Record not found'); return; }

  const content = `
    <div class="card">
      <h1>✏️ Edit Salary Record</h1>
      <button class="secondary" onclick="renderSalaryTracker()">← Back</button>
    </div>
    <div class="card">
      <div class="sub"><strong>Employee:</strong> ${salary.employees?.name || salary.emp_id}</div>
      <input id="salMonth" type="month" value="${salary.month||''}" />
      <input id="salDue" type="number" value="${salary.salary_due||0}" />
      <input id="salPaid" type="number" value="${salary.salary_paid||0}" />
      <input id="salPayDate" type="date" value="${salary.payment_date||''}" />
      <input id="salPayMode" value="${salary.payment_mode||''}" placeholder="Payment Mode" />
      <textarea id="salNotes">${salary.notes||''}</textarea>
      <button onclick="updateSalary(${id})">💾 Update Record</button>
      <div id="editSalErr"></div>
    </div>`;
  renderShell(content, 'salary');
}

async function updateSalary(id) {
  const month   = document.getElementById('salMonth').value;
  const due     = parseFloat(document.getElementById('salDue').value) || 0;
  const paid    = parseFloat(document.getElementById('salPaid').value) || 0;
  const payDate = document.getElementById('salPayDate').value;
  const payMode = document.getElementById('salPayMode').value.trim();
  const notes   = document.getElementById('salNotes').value.trim();

  const { error } = await sb.from('salary_tracker').update({
    month, salary_due: due, salary_paid: paid,
    payment_date: payDate||null, payment_mode: payMode||null, notes: notes||null
  }).eq('id', id);

  if (error) {
    document.getElementById('editSalErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
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

  const { data: advances, error } = await sb
    .from('advance_tracker')
    .select('*, employees(name)')
    .order('date_given', { ascending: false });

  if (error) {
    renderShell(`<div class="error">Error: ${error.message}</div>`, 'advance');
    return;
  }

  const isOwner = SESSION.role === 'owner';
  const content = `
    <div class="card">
      <h1>💵 Advance Tracker</h1>
      <div class="sub">${advances.length} advance records</div>
      ${isOwner ? `<button onclick="renderAddAdvance()">➕ Add Advance Record</button>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Date Given</th><th>Amount</th>
            <th>Repaid</th><th>Balance</th><th>Reason</th>
            ${isOwner ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${advances.map(a => {
            const balance = (a.advance_amount||0) - (a.repaid_amount||0);
            return `
            <tr>
              <td><strong>${a.employees?.name || a.emp_id}</strong></td>
              <td>${a.date_given||'-'}</td>
              <td>₹${(a.advance_amount||0).toLocaleString("en-IN")}</td>
              <td>₹${(a.repaid_amount||0).toLocaleString("en-IN")}</td>
              <td><span class="${balance > 0 ? 'warn' : ''}">
                ₹${balance.toLocaleString("en-IN")}</span></td>
              <td>${a.reason||'-'}</td>
              ${isOwner ? `
                <td class="table-actions">
                  <button class="btn-sm" onclick="editAdvance(${a.id})">✏️ Edit</button>
                  <button class="btn-sm danger" onclick="deleteAdvance(${a.id})">🗑️ Delete</button>
                </td>` : ''}
            </tr>`}).join("")}
        </tbody>
      </table>
    </div>`;

  renderShell(content, 'advance');
}

async function renderAddAdvance() {
  const { data: employees } = await sb
    .from('employees').select('emp_id, name').eq('status','Active').order('name');
  const today = new Date().toISOString().slice(0, 10);

  const content = `
    <div class="card">
      <h1>➕ Add Advance Record</h1>
      <button class="secondary" onclick="renderAdvanceTracker()">← Back</button>
    </div>
    <div class="card">
      <select id="advEmpId">
        <option value="">Select Employee</option>
        ${(employees||[]).map(e =>
          `<option value="${e.emp_id}">${e.name}</option>`).join('')}
      </select>
      <input id="advDate" type="date" value="${today}" />
      <input id="advAmount" type="number" placeholder="Advance Amount (₹)" />
      <input id="advRepaid" type="number" placeholder="Repaid Amount (₹)" value="0" />
      <input id="advReason" placeholder="Reason" />
      <textarea id="advNotes" placeholder="Notes"></textarea>
      <button onclick="saveNewAdvance()">💾 Save Advance Record</button>
      <div id="addAdvErr"></div>
    </div>`;
  renderShell(content, 'advance');
}

async function saveNewAdvance() {
  const empId  = document.getElementById('advEmpId').value;
  const date   = document.getElementById('advDate').value;
  const amount = parseFloat(document.getElementById('advAmount').value) || 0;
  const repaid = parseFloat(document.getElementById('advRepaid').value) || 0;
  const reason = document.getElementById('advReason').value.trim();
  const notes  = document.getElementById('advNotes').value.trim();

  if (!empId || amount <= 0) {
    document.getElementById('addAdvErr').innerHTML =
      '<div class="error">Employee aur valid amount required hai</div>';
    return;
  }

  const { error } = await sb.from('advance_tracker').insert({
    emp_id: empId, date_given: date||null,
    advance_amount: amount, repaid_amount: repaid,
    reason: reason||null, notes: notes||null
  });

  if (error) {
    document.getElementById('addAdvErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderAdvanceTracker();
}

async function editAdvance(id) {
  const { data: adv, error } = await sb
    .from('advance_tracker').select('*, employees(name)').eq('id', id).single();
  if (error || !adv) { alert('Record not found'); return; }

  const content = `
    <div class="card">
      <h1>✏️ Edit Advance Record</h1>
      <button class="secondary" onclick="renderAdvanceTracker()">← Back</button>
    </div>
    <div class="card">
      <div class="sub"><strong>Employee:</strong> ${adv.employees?.name || adv.emp_id}</div>
      <input id="advDate" type="date" value="${adv.date_given||''}" />
      <input id="advAmount" type="number" value="${adv.advance_amount||0}" />
      <input id="advRepaid" type="number" value="${adv.repaid_amount||0}" />
      <input id="advReason" value="${adv.reason||''}" placeholder="Reason" />
      <textarea id="advNotes">${adv.notes||''}</textarea>
      <button onclick="updateAdvance(${id})">💾 Update Record</button>
      <div id="editAdvErr"></div>
    </div>`;
  renderShell(content, 'advance');
}

async function updateAdvance(id) {
  const date   = document.getElementById('advDate').value;
  const amount = parseFloat(document.getElementById('advAmount').value) || 0;
  const repaid = parseFloat(document.getElementById('advRepaid').value) || 0;
  const reason = document.getElementById('advReason').value.trim();
  const notes  = document.getElementById('advNotes').value.trim();

  const { error } = await sb.from('advance_tracker').update({
    date_given: date||null, advance_amount: amount,
    repaid_amount: repaid, reason: reason||null, notes: notes||null
  }).eq('id', id);

  if (error) {
    document.getElementById('editAdvErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  renderAdvanceTracker();
}

async function deleteAdvance(id) {
  if (!confirm('Delete this advance record?')) return;
  await sb.from('advance_tracker').delete().eq('id', id);
  renderAdvanceTracker();
}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView() {
  if (!SESSION.empId) {
    appEl.innerHTML = `
      <div class="wrap">
        <div class="card">
          <h1>⚠️ Error</h1>
          <div class="error">Aapka employee ID set nahi hai. Owner se contact karo.</div>
          <button onclick="logout()">Logout</button>
        </div>
      </div>`;
    return;
  }

  const [emp, salary, advance, tasks, attendance] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id", SESSION.empId).single(),
    sb.from("salary_tracker").select("salary_due, salary_paid").eq("emp_id", SESSION.empId),
    sb.from("advance_tracker").select("advance_amount, repaid_amount").eq("emp_id", SESSION.empId),
    sb.from("employee_tasks").select("task_description, status").eq("emp_id", SESSION.empId).eq("status","Pending"),
    sb.from("attendance_log").select("status, att_date").eq("emp_id", SESSION.empId),
  ]);

  const pendingSalary  = (salary.data||[]).reduce((s,r) => s+((r.salary_due||0)-(r.salary_paid||0)),0);
  const pendingAdvance = (advance.data||[]).reduce((s,r) => s+((r.advance_amount||0)-(r.repaid_amount||0)),0);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRows = (attendance.data||[]).filter(a => a.att_date?.startsWith(thisMonth));
  const present   = monthRows.filter(a => a.status==="Present").length;
  const absent    = monthRows.filter(a => a.status==="Absent").length;

  appEl.innerHTML = `
    <div class="wrap">
      <div class="card">
        <h1>🏡 Airbnb Manager</h1>
        <div class="sub">Employee Dashboard</div>
        <button onclick="logout()" class="secondary">🚪 Logout</button>
      </div>
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
        ${(tasks.data||[]).length === 0
          ? `<div class="sub">Koi pending task nahi ✅</div>`
          : tasks.data.map(t => `
              <div class="metric-row">
                <span class="metric-label">${t.task_description}</span>
                <span class="badge red">Pending</span>
              </div>`).join("")}
      </div>
    </div>`;
}

// ============ START APP ============
init();