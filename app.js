/**
 * ===================================
 * Project: The Unique Haven Homes Pvt Ltd — Property Manager
 * Developer: Praveen Singh
 * ===================================
 */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const appEl = document.getElementById("app");
const BRAND = "The UNIQUE HAVEN HOME STAY";

let SESSION = {
  userId: null, role: null, empId: null, investorId: null,
  displayName: null, currentPage: 'dashboard',
  bookingFilter: 'All', bookingPropFilter: '',
  bookingDateFilter: '', bookingDateFrom: '', bookingDateTo: ''
};

// ============ INIT ============
async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { renderLogin(); return; }
    await autoCheckout(); // Auto-free expired rooms
    await loadProfile(session.user.id);
  } catch (err) { showError("Setup incomplete. config.js check karo.", err); }
}

async function loadProfile(userId) {
  const { data: p, error } = await sb.from("profiles")
    .select("role, emp_id, investor_id, display_name")
    .eq("user_id", userId).single();
  if (error || !p) { showError("Profile nahi mila. Owner se contact karo."); return; }
  SESSION.userId = userId;
  SESSION.role = p.role;
  SESSION.empId = p.emp_id;
  SESSION.investorId = p.investor_id;
  SESSION.displayName = p.display_name || p.role;

   if (p.role === 'employee') renderEmployeeView();
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
  SESSION = { userId:null, role:null, empId:null, investorId:null,
    displayName:null, currentPage:'dashboard', bookingFilter:'All',
    bookingPropFilter:'', bookingDateFilter:'', bookingDateFrom:'', bookingDateTo:'' };
  renderLogin();
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
    btn.disabled = true; btn.textContent = 'Logging in...';
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById("err").innerHTML = `<div class="error">${error.message}</div>`;
      btn.disabled = false; btn.textContent = 'Login'; return;
    }
    await loadProfile(data.user.id);
  };
}

// ============ SHELL ============
function renderShell(content, activePage = 'dashboard') {
  // Investor with investor_id = no sidebar, read-only
  if (SESSION.investorId) { appEl.innerHTML = content; return; }
  const show = ['owner','viewer','manager'].includes(SESSION.role);
  if (!show) { appEl.innerHTML = content; return; }

  const isOwner = SESSION.role === 'owner';
  const nav = isOwner ? [
    ['dashboard','🏠 Home'],['reports','📈 Reports'],['rooms','🏠 Rooms'],
    ['flats','🛏️ Flats'],['bookings','📅 Bookings'],['employees','👥 Employees'],
    ['tasks','🧰 Tasks'],['attendance','📋 Attendance'],['att-summary','📅 Summary'],
    ['salary','💰 Salary'],['advance','💵 Advance'],['store','📦 Store'],
    ['expenses','🧾 Expenses'],['property-report','🏘️ Property Report'],['investors','🧑‍💼 Sub-Owners'],
  ] : [
    ['dashboard','🏠 Home'],['reports','📈 Reports'],['flats','🛏️ Flats'],
    ['bookings','📅 Bookings'],['att-summary','📅 Summary'],['salary','💰 Salary'],
    ['advance','💵 Advance'],['expenses','🧾 Expenses'],
    ['property-report','🏘️ Property Report'],['investors','🧑‍💼 Sub-Owners'],
  ];

  appEl.innerHTML = `
    <div class="app-container">
      <aside class="sidebar">
        <h2>
          <img src="assets/logo.png" alt="" style="width:24px;height:24px;object-fit:contain;border-radius:6px;" />
          ${BRAND}
        </h2>
        <nav>${nav.map(([k,l])=>`<a href="#" data-page="${k}" class="${activePage===k?'active':''}">${l}</a>`).join('')}</nav>
        <div class="sidebar-footer">
          <div class="logout-link" id="logoutBtn">🚪 Logout</div>
          <div class="sidebar-credit">by Praveen Singh</div>
        </div>
      </aside>
      <main class="main-content" id="mainContent">${content}</main>
    </div>`;

  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.onclick = e => { e.preventDefault(); navigate(a.dataset.page); };
  });
  document.getElementById('logoutBtn').onclick = logout;
}

function navigate(page) {
  SESSION.currentPage = page;
  const map = {
    dashboard:renderDashboard, reports:renderReports, rooms:renderManageRooms,
    flats:renderFlatsStatus, bookings:renderManageBookings, employees:renderManageEmployees,
    tasks:renderEmployeeTasks, attendance:renderAttendance, 'att-summary':renderAttendanceSummary,
    salary:renderSalaryTracker, advance:renderAdvanceTracker, store:renderStore,
    expenses:renderExpenses, 'property-report':renderPropertyReport, investors:renderManageInvestors,
  };
  (map[page] || renderDashboard)();
}

// ============ HELPERS ============
async function getPaidMap(ids) {
  if (!ids.length) return {};
  const { data } = await sb.from('payment_history').select('booking_id, amount').in('booking_id', ids);
  const m = {};
  (data||[]).forEach(p => { m[p.booking_id] = (m[p.booking_id]||0) + (p.amount||0); });
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
        if (width>height) { height = Math.round(height*(maxDim/width)); width = maxDim; }
        else { width = Math.round(width*(maxDim/height)); height = maxDim; }
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
  return {
    start: parseLocalDateTime(booking.check_in, 14, 0), // check-in 2 PM
    end: parseLocalDateTime(booking.check_out, 11, 0),  // checkout 11 AM
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
        const a = list[i], b = list[j];
        const aStart = parseLocalDateTime(a.check_in, 14, 0);
        const aEnd = parseLocalDateTime(a.check_out, 11, 0);
        const bStart = parseLocalDateTime(b.check_in, 14, 0);
        const bEnd = parseLocalDateTime(b.check_out, 11, 0);

        if (aStart < bEnd && aEnd > bStart) {
          overlaps.push({ roomId, a, b });
        }
      }
    }
  });

  return overlaps;
}


// ============ DASHBOARD ============
async function renderDashboard() {
  await autoCheckout();
  renderShell(`<div class="loading">Loading...</div>`, 'dashboard');
  const today = new Date().toISOString().slice(0,10);
  const [g, f] = await Promise.all([
    sb.from("guest_register").select("*, rooms(unit_no, nickname)"),
    sb.from("flats_status").select("room_id, status, cleaning_status"),
  ]);
  const ci = (g.data||[]).filter(x => x.check_in === today);
  const co = (g.data||[]).filter(x => x.check_out === today);
  const dirty = (f.data||[]).filter(x => x.cleaning_status==="Dirty" && x.status!=="Blocked-Maintenance");
  const nm = g2 => `${g2.rooms?.unit_no||g2.room_id}${g2.rooms?.nickname?' ('+g2.rooms.nickname+')':''}`;

  renderShell(`
    <div class="card">
      <h1>📊 Dashboard</h1>
      <div class="sub">${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    </div>
    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${ci.length}</div>
        <div class="stat-label">📥 Check-in Today</div>
        ${ci.map(x=>`<div style="font-size:12px;margin-top:4px;">${x.guest_name} — ${nm(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${co.length}</div>
        <div class="stat-label">📤 Check-out Today</div>
        ${co.map(x=>`<div style="font-size:12px;margin-top:4px;">${x.guest_name} — ${nm(x)}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">Koi nahi</div>'}
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirty.length}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
        ${dirty.map(x=>`<div style="font-size:12px;margin-top:4px;">${x.room_id}</div>`).join('')||'<div class="sub" style="margin:4px 0 0;">Sab clean ✅</div>'}
      </div>
    </div>
    <div class="card"><button onclick="renderFYSummary()">📊 Financial Summary (CA/ITR)</button></div>
  `, 'dashboard');
}

// ============ REPORTS (Calendar) ============
async function renderReports() {
  renderShell(`<div class="loading">Loading...</div>`, 'reports');
  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, guest_name, booking_mode, total_amount'),
  ]);
  const yr = window._calY ?? new Date().getFullYear();
  const mo = window._calM ?? new Date().getMonth();
  const mName = new Date(yr,mo,1).toLocaleString('default',{month:'long'});
  const dim = new Date(yr,mo+1,0).getDate();
  const fd = new Date(yr,mo,1).getDay();
  const mp = `${yr}-${String(mo+1).padStart(2,'0')}`;

  const bMap = {};
  (bookings.data||[]).forEach(b => {
    if (!b.check_in||!b.check_out) return;
    let c = b.check_in;
    while (c < b.check_out) { bMap[`${b.room_id}_${c}`] = {guest:b.guest_name,mode:b.booking_mode}; c = dateAdd(c,1); }
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
      <h1>📈 Reports — ${mName} ${yr}</h1>
      <div class="sub">Live data from bookings</div>
    </div>
    <div class="card">
      <div class="metric-row"><span class="metric-label">Bookings</span><span class="metric-value">${mb.length}</span></div>
      <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Online / Offline</span><span class="metric-value">${on} / ${off}</span></div>
      <div class="metric-row"><span class="metric-label">Occupancy</span><span class="metric-value">${occ}%</span></div>
    </div>
    <div class="card" style="text-align:center;background:var(--dark);color:#fff;">
      <h2 style="color:#fff;">📆 ${mName} ${yr}</h2>
      <div class="btn-row" style="justify-content:center;margin-top:8px;">
        <button class="secondary btn-sm" onclick="chMo(-1)">◀ Prev</button>
        <button class="secondary btn-sm" onclick="chMo(1)">Next ▶</button>
      </div>
    </div>`;

  const days = ['S','M','T','W','T','F','S'];
  const todayStr = new Date().toISOString().slice(0,10);

  (rooms.data||[]).forEach(r => {
    html += `<div class="card" style="padding:10px 12px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px;">${r.unit_no} <span style="font-weight:400;color:var(--muted);font-size:12px;">${r.nickname||''}</span></div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">`;
    days.forEach(d => { html += `<div style="font-size:10px;font-weight:600;color:var(--muted);text-align:center;">${d}</div>`; });
    for (let i=0;i<fd;i++) html += `<div style="height:36px;"></div>`;

    for (let d=1;d<=dim;d++) {
      const ds = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const k = `${r.room_id}_${ds}`;
      const bk = bMap[k];
      const isT = ds===todayStr;
      let bg = '#E8F5E9';
      let gn = '';
      if (bk) { bg = bk.mode==='Online-Airbnb'?'#E1EFFE':'#FDF6B2'; gn = bk.guest?.split(' ')[0]||'B'; }
      const cls = `cal-cell${bk?' booked':''}${isT?' today':''}`;
      const click = bk ? `onclick="showBookingPopup('${r.room_id}','${ds}')"` : '';
      const title = bk ? `title="${bk.guest||'Booked'}"` : isT ? 'title="Today"' : '';
      html += `<div class="${cls}" style="background:${bg};" ${click} ${title}>
        <div${isT?' style="color:var(--primary);"':''}>${d}${isT?' ●':''}</div>
        ${bk?`<div class="cal-guest">${gn}</div>`:''}
      </div>`;
    }
    html += `</div></div>`;
  });

  html += `<div class="card" style="text-align:center;padding:10px;">
    <span style="background:#E8F5E9;padding:3px 10px;border-radius:10px;font-size:12px;">Free</span>
    <span style="background:#E1EFFE;padding:3px 10px;border-radius:10px;font-size:12px;margin-left:6px;">Online</span>
    <span style="background:#FDF6B2;padding:3px 10px;border-radius:10px;font-size:12px;margin-left:6px;">Offline</span>
  </div>`;

  renderShell(html, 'reports');
  window._calM = mo; window._calY = yr;
}

function chMo(d) {
  let m = (window._calM??new Date().getMonth())+d;
  let y = window._calY??new Date().getFullYear();
  if (m>11){m=0;y++;} if (m<0){m=11;y--;}
  window._calM=m; window._calY=y; renderReports();
}

// Calendar click popup
async function showBookingPopup(roomId, dateStr) {
  const {data:bks} = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name)')
    .eq('room_id', roomId).lte('check_in', dateStr).gt('check_out', dateStr);
  const b = (bks||[])[0];
  if (!b) return;
  const {data:pays} = await sb.from('payment_history').select('amount').eq('booking_id', b.booking_id);
  const paid = (pays||[]).reduce((s,p)=>s+(p.amount||0),0);
  const bal = (b.total_amount||0) - paid;
  const nights = b.check_in&&b.check_out ? Math.round((new Date(b.check_out)-new Date(b.check_in))/864e5) : '-';
  const idPaths = (b.id_proof_photo_paths||b.id_proof_photo_path||'').split(',').filter(Boolean);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.innerHTML = `<div class="modal-box">
    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
    <h2>📅 Booking Details</h2>
    <div class="metric-row"><span class="metric-label">Guest</span><span class="metric-value" style="font-size:15px;">${b.guest_name||'-'}</span></div>
    <div class="metric-row"><span class="metric-label">Phone</span><span style="font-size:14px;">${b.phone||'-'}</span></div>
    <div class="metric-row"><span class="metric-label">Property</span><span style="font-size:13px;">${b.rooms?.property_name||''}<br>${b.rooms?.unit_no||''} · ${b.rooms?.nickname||''}</span></div>
    <div class="metric-row"><span class="metric-label">Mode</span><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode||'Offline'}</span></div>
    <div class="metric-row"><span class="metric-label">Booked By</span><span>${b.booked_by||'-'}</span></div>
    <div class="metric-row"><span class="metric-label">Check-in</span><span style="font-weight:600;">${b.check_in||'-'}</span></div>
    <div class="metric-row"><span class="metric-label">Check-out</span><span style="font-weight:600;">${b.check_out||'-'}</span></div>
    <div class="metric-row"><span class="metric-label">Nights</span><span class="metric-value">${nights}</span></div>
    <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount||0).toLocaleString('en-IN')}</span></div>
    <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${paid.toLocaleString('en-IN')}</span></div>
    <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal>0?' warn':''}">₹${bal.toLocaleString('en-IN')}</span></div>
    ${idPaths.length?`<div style="margin-top:10px;"><div class="section-title">ID Photos</div><div class="btn-row">${idPaths.map((p,i)=>`<button class="btn-sm outline" onclick="dlIdPhoto('${p}')">📥 Guest ${i+1}</button>`).join('')}</div></div>`:''}
    ${b.notes?`<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px;"><strong>Notes:</strong> ${b.notes}</div>`:''}
    <div class="btn-row" style="margin-top:14px;">
      <button class="btn-sm" onclick="this.closest('.modal-overlay').remove();editBooking('${b.booking_id}');">✏️ Edit</button>
      ${bal>0?`<button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove();recordPayment('${b.booking_id}');">💰 Pay</button>`:''}
      <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove();">Close</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

// ============ FY SUMMARY (CA VIEW) ============
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
  else{let fy=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;s=fy+'-04-01';e=(fy+1)+'-03-31';label=`FY ${fy}-${fy+1}`;}

  const [gs,ex,py] = await Promise.all([
    sb.from('guest_register').select('booking_id,check_in,total_amount,room_id,guest_name'),
    sb.from('expenses').select('amount,month'),
    sb.from('payment_history').select('booking_id,amount'),
  ]);

  const fg = (gs.data||[]).filter(g=>g.check_in>=s&&g.check_in<=e);
  const ids = fg.map(g=>g.booking_id);
  const pm = {};
  (py.data||[]).forEach(p=>{if(ids.includes(p.booking_id))pm[p.booking_id]=(pm[p.booking_id]||0)+(p.amount||0);});
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
    appEl.innerHTML = `<div class="ca-wrap">
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
        <button class="outline btn-sm" onclick="downloadFYData()" style="margin-top:6px;">⬇️ Download CSV</button>
      </div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Income (Received)</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${exp.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Net Profit</span><span class="metric-value" style="color:${net>=0?'var(--green)':'var(--red)'};">₹${net.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="card"><div class="section-title">Bookings (${fg.length})</div>${tbl}</div>
      <div class="card" style="text-align:center;">
        <button class="ca-logout" onclick="logout()">🚪 Logout</button>
      </div>
    </div>`;
  } else {
    renderShell(`
      <div class="card">
        <h1>📊 Financial Summary</h1>
        <div class="sub">${label} — ${s} to ${e}</div>
        <div class="btn-row">${btns}</div>
        <button class="secondary btn-sm" onclick="renderDashboard()">← Back</button>
        <button class="outline btn-sm" onclick="downloadFYData()">⬇️ Download CSV</button>
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
  d.bookings.forEach(g => { csv += `${g.booking_id},${g.guest_name},${g.room_id},${g.check_in},${d.paidMap[g.booking_id]||0}\n`; });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `Financial_${d.label}.csv`; a.click();
}


// ============ MANAGE ROOMS ============
async function renderManageRooms() {
  renderShell(`<div class="loading">Loading...</div>`, 'rooms');
  const {data:rooms,error} = await sb.from("rooms").select("*").order("room_id");
  if (error) { renderShell(`<div class="error">${error.message}</div>`, 'rooms'); return; }
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card">
      <h1>🏠 Manage Rooms</h1>
      <div class="sub">${rooms.length} properties</div>
      ${isO?`<button onclick="renderAddRoom()">➕ Add Property</button>`:''}
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Property</th><th>Unit</th><th>Nickname</th><th>Rent</th><th>Status</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${rooms.map(r=>`<tr>
        <td><strong>${r.room_id}</strong></td>
        <td style="max-width:200px;">${r.property_name||'-'}</td>
        <td>${r.unit_no||'-'}</td>
        <td>${r.nickname||'-'}</td>
        <td>₹${r.rent_per_night||0}</td>
        <td><span class="badge ${r.bookable?'green':'red'}">${r.mode||'On'}</span></td>
        ${isO?`<td class="table-actions">
          <button class="btn-sm" onclick="editRoom('${r.room_id}')">✏️ Edit</button>
          <button class="btn-sm danger" onclick="deleteRoom('${r.room_id}','${r.unit_no}')">🗑️</button>
        </td>`:''}
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'rooms');
}

function roomFormFields(r={}) {
  return `
    <div class="form-grid">
      <div class="form-group"><label>Room ID</label><input id="roomId" value="${r.room_id||''}" ${r.room_id?'readonly':''} placeholder="e.g. GOM-601" /></div>
      <div class="form-group"><label>Property Name</label><input id="propertyName" value="${r.property_name||''}" placeholder="Full Airbnb listing name" /></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Unit No</label><input id="unitNo" value="${r.unit_no||''}" placeholder="e.g. FLAT101, Villa (One)" /></div>
      <div class="form-group"><label>Nickname</label><input id="nickname" value="${r.nickname||''}" placeholder="Short name" /></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Unit Type</label><select id="unitType"><option value="Flat" ${r.unit_type==='Flat'?'selected':''}>Flat</option><option value="Villa" ${r.unit_type==='Villa'?'selected':''}>Villa</option></select></div>
      <div class="form-group"><label>Floor</label><input id="floor" value="${r.floor||''}" placeholder="1st, 2nd, ALL" /></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Rent/Night ₹</label><input id="rent" type="number" value="${r.rent_per_night||''}" /></div>
      <div class="form-group"><label>Max Guests</label><input id="maxGuests" type="number" value="${r.max_guests||''}" /></div>
    </div>
    <div class="form-group"><label>Address</label><input id="address" value="${r.address||''}" /></div>
    <div class="form-grid">
      <div class="form-group"><label>Mode</label><select id="mode"><option value="On" ${r.mode!=='Off'?'selected':''}>On</option><option value="Off" ${r.mode==='Off'?'selected':''}>Off</option></select></div>
      <div class="form-group" style="justify-content:center;">
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <input type="checkbox" id="bookable" ${r.bookable!==false?'checked':''} /> Bookable
        </label>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="notes">${r.notes||''}</textarea></div>`;
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
    rent_per_night:parseFloat(document.getElementById('rent').value)||null,
    max_guests:parseInt(document.getElementById('maxGuests').value)||null,
    mode:document.getElementById('mode').value,
    bookable:document.getElementById('bookable').checked,
    notes:document.getElementById('notes').value.trim()||null,
  };
}

async function renderAddRoom() {
  renderShell(`<div class="card"><h1>➕ Add Property</h1><button class="secondary btn-sm" onclick="renderManageRooms()">← Back</button></div>
    <div class="card">${roomFormFields()}<button onclick="saveNewRoom()">💾 Save</button><div id="addErr"></div></div>`, 'rooms');
}

async function saveNewRoom() {
  const o = collectRoomForm();
  if (!o.room_id||!o.unit_no) { document.getElementById('addErr').innerHTML='<div class="error">Room ID & Unit No required</div>'; return; }
  const {error} = await sb.from('rooms').insert(o);
  if (error) { document.getElementById('addErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  await sb.from('flats_status').insert({room_id:o.room_id,status:'Free',cleaning_status:'Clean'});
  renderManageRooms();
}

async function editRoom(id) {
  const {data:r} = await sb.from('rooms').select('*').eq('room_id',id).single();
  if (!r) { alert('Not found'); return; }
  renderShell(`<div class="card"><h1>✏️ Edit Property</h1><button class="secondary btn-sm" onclick="renderManageRooms()">← Back</button></div>
    <div class="card">${roomFormFields(r)}<button onclick="updateRoom('${id}')">💾 Update</button><div id="editErr"></div></div>`, 'rooms');
}

async function updateRoom(id) {
  const o = collectRoomForm(); delete o.room_id;
  if (!o.unit_no) { document.getElementById('editErr').innerHTML='<div class="error">Unit No required</div>'; return; }
  const {error} = await sb.from('rooms').update(o).eq('room_id',id);
  if (error) { document.getElementById('editErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  renderManageRooms();
}

async function deleteRoom(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  await sb.from('flats_status').delete().eq('room_id',id);
  await sb.from('rooms').delete().eq('room_id',id);
  renderManageRooms();
}

// ============ FLATS STATUS ============
async function renderFlatsStatus() {
  await autoCheckout();
  renderShell(`<div class="loading">Loading...</div>`, 'flats');
  const {data:flats} = await sb.from('flats_status').select('*, rooms(unit_no, nickname, property_name)').order('room_id');
  const can = ['owner','viewer','manager'].includes(SESSION.role);
  renderShell(`
    <div class="card"><h1>🛏️ Flats Status</h1><div class="sub">${(flats||[]).length} flats</div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Property</th><th>Unit</th><th>Status</th><th>Cleaning</th><th>Issue</th>${can?'<th>Action</th>':''}</tr></thead>
      <tbody>${(flats||[]).map(f=>`<tr>
        <td>${f.rooms?.property_name||'-'}</td>
        <td><strong>${f.rooms?.unit_no||f.room_id}</strong><br><small>${f.rooms?.nickname||''}</small></td>
        <td><span class="badge ${f.status==='Free'?'green':f.status==='Booked'?'blue':'red'}">${f.status||'Free'}</span></td>
        <td><span class="badge ${f.cleaning_status==='Clean'?'green':f.cleaning_status==='In Progress'?'yellow':'red'}">${f.cleaning_status||'Clean'}</span></td>
        <td>${f.issue||'-'}</td>
        ${can?`<td><button class="btn-sm" onclick="editFlatStatus('${f.room_id}')">✏️ Edit</button></td>`:''}
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'flats');
}

async function editFlatStatus(id) {
  const {data:f} = await sb.from('flats_status').select('*, rooms(unit_no, nickname)').eq('room_id',id).single();
  if (!f) return;
  const today = new Date().toISOString().slice(0,10);
  renderShell(`
    <div class="card"><h1>✏️ Flat Status</h1><div class="sub">${f.rooms?.unit_no||id}</div>
      <button class="secondary btn-sm" onclick="renderFlatsStatus()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Status</label><select id="flatStatus">
        <option value="Free" ${f.status==='Free'?'selected':''}>Free</option>
        <option value="Booked" ${f.status==='Booked'?'selected':''}>Booked</option>
        <option value="Blocked-Maintenance" ${f.status==='Blocked-Maintenance'?'selected':''}>Blocked</option>
      </select></div>
      <div class="form-group"><label>Cleaning</label><select id="cleanSt">
        <option value="Clean" ${f.cleaning_status==='Clean'?'selected':''}>Clean</option>
        <option value="Dirty" ${f.cleaning_status==='Dirty'?'selected':''}>Dirty</option>
        <option value="In Progress" ${f.cleaning_status==='In Progress'?'selected':''}>In Progress</option>
      </select></div>
      <div class="form-group"><label>Issue</label><input id="flatIssue" value="${f.issue||''}" /></div>
      <div class="form-group"><label>Last Cleaned</label><input id="lastCleaned" type="date" value="${f.last_cleaned||today}" /></div>
      <button onclick="saveFlatStatus('${id}')">💾 Update</button><div id="flatErr"></div>
    </div>`, 'flats');
}

async function saveFlatStatus(id) {
  const {error} = await sb.from('flats_status').update({
    status:document.getElementById('flatStatus').value,
    cleaning_status:document.getElementById('cleanSt').value,
    issue:document.getElementById('flatIssue').value.trim()||null,
    last_cleaned:document.getElementById('lastCleaned').value||null,
  }).eq('room_id',id);
  if (error) { document.getElementById('flatErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
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
  (rooms || []).forEach(r => { roomMap[r.room_id] = r; });

  const overlaps = findOverlappingBookings(all || []);

  const mf=SESSION.bookingFilter||'All', pf=SESSION.bookingPropFilter||'',
    df=SESSION.bookingDateFilter||'', d1=SESSION.bookingDateFrom||'', d2=SESSION.bookingDateTo||'';

  let f = all||[];
  if (mf!=='All') f=f.filter(b=>b.booking_mode===mf);
  if (pf) f=f.filter(b=>b.room_id===pf);
  if (df) f=f.filter(b=>b.check_in===df);
  if (d1) f=f.filter(b=>b.check_in>=d1);
  if (d2) f=f.filter(b=>b.check_in<=d2);

  const pm = await getPaidMap(f.map(b=>b.booking_id));
  const canM = ['owner','viewer','manager'].includes(SESSION.role);
  const canD = SESSION.role==='owner';

  renderShell(`
    <div class="card">
      <h1>📅 Manage Bookings</h1>
      <div class="sub">${f.length} bookings</div>
      ${canM?`<button onclick="renderAddBooking()">➕ New Booking</button>`:''}
    </div>

    ${overlaps.length ? `
      <div class="card">
        <div class="error">
          <strong>⚠️ Overlapping / Duplicate Bookings Found (${overlaps.length})</strong><br><br>
          ${overlaps.slice(0, 10).map(o => `
            <div style="margin-bottom:6px;">
              <strong>${o.roomId}</strong> —
              ${o.a.guest_name || '-'} (${o.a.check_in} → ${o.a.check_out})
              overlaps with
              ${o.b.guest_name || '-'} (${o.b.check_in} → ${o.b.check_out})
            </div>
          `).join('')}
          ${overlaps.length > 10 ? `<div>...and ${overlaps.length - 10} more</div>` : ''}
        </div>
      </div>
    ` : ''}

    <div class="card">
      <div class="section-title">🔍 Filters</div>
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
          <button class="btn-sm" onclick="applyBkFilters()">🔍</button>
          <button class="btn-sm outline" onclick="clearBkFilters()">✕</button>
        </div>
      </div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>By</th><th>ID</th><th>In</th><th>Out</th><th>Total</th><th>Paid</th><th>Due</th>${canM?'<th>Actions</th>':''}</tr></thead>
      <tbody>${f.map(b=>{
        const pd=pm[b.booking_id]||0, bal=(b.total_amount||0)-pd;
        const ids=(b.id_proof_photo_paths||b.id_proof_photo_path||'').split(',').filter(Boolean);
        return `<tr>
          <td><strong>${b.guest_name||'-'}</strong><br><small>${b.phone||''}</small></td>
                      <td>
            <strong>${b.rooms?.nickname||'-'}</strong><br>
            <small>${b.rooms?.property_name||''}</small><br>
            <small style="color:var(--muted);">${b.rooms?.unit_no||b.room_id}</small>
            ${b.booking_mode==='Online-Airbnb' && b.source_room_id && b.source_room_id !== b.room_id ? `
              <br><small style="color:#2563eb;">Source Listing: ${roomMap[b.source_room_id]?.nickname || b.source_room_id}</small>
            ` : ''}
            ${b.parent_booking_id ? `
              <br><small style="color:#8A7F76;">Extension of: ${b.parent_booking_id}</small>
            ` : ''}
          </td>
          <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'Online':'Offline'}</span></td>
          <td><small>${b.booked_by||'-'}</small></td>
          <td>${ids.length?ids.map((p,i)=>`<button class="btn-sm outline" style="margin:1px;" onclick="dlIdPhoto('${p}')">📎G${i+1}</button>`).join(''):'—'}</td>
          <td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td>
          <td>₹${(b.total_amount||0).toLocaleString('en-IN')}</td>
          <td>₹${pd.toLocaleString('en-IN')}</td>
          <td><span class="${bal>0?'metric-value warn':''}">₹${bal.toLocaleString('en-IN')}</span></td>
          ${canM?`<td class="table-actions">
             <button class="btn-sm" onclick="editBooking('${b.booking_id}')" title="Edit">✏️ Edit</button>
            <button class="btn-sm secondary" onclick="recordPayment('${b.booking_id}')" title="Payment">💰 Pay</button>
            <button class="btn-sm outline" onclick="createOfflineExtension('${b.booking_id}')" title="Offline Extension">➕ Ext</button>
            ${bal>0?`<button class="btn-sm" onclick="markFullyPaid('${b.booking_id}')" title="Mark Paid">✅ Paid</button>`:''}
            ${canD?`<button class="btn-sm danger" onclick="delBooking('${b.booking_id}','${(b.guest_name||'').replace(/'/g,"\\'")}','${b.room_id}')" title="Delete">🗑️ Del</button>`:''}
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
  renderManageBookings();
}

async function dlIdPhoto(path) {
  const {data} = await sb.storage.from('id-proofs').createSignedUrl(path,300);
  if (data?.signedUrl) { const a=document.createElement('a'); a.href=data.signedUrl; a.target='_blank'; a.download=path.split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); }
  else alert('Photo load failed');
}

async function createOfflineExtension(parentBookingId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', parentBookingId).single();
  if (!b) { alert('Parent booking not found'); return; }

  window._bookingPrefill = {
    guestName: b.guest_name || '',
    guestPhone: b.phone || '',
    roomId: b.room_id || '',
    sourceRoomId: b.source_room_id || b.room_id || '',
    bookingMode: 'Offline',
    checkIn: b.check_out || '',
    checkOut: '',
    guests: b.guests || 1,
    totalAmount: '',
    advanceAmt: 0,
    advMode: '',
    idType: b.id_proof_type || 'Aadhar',
    idNo: b.id_proof_no || '',
    bkNotes: `Extension after Airbnb stay (${parentBookingId})`,
    parentBookingId: parentBookingId,
    stayGroupId: b.stay_group_id || b.booking_id
  };

  renderAddBooking();
}

// ============ ADD BOOKING (Mobile-first, Camera+Gallery, 8 Guests) ============
async function renderAddBooking() {
  const pre = window._bookingPrefill || {};
  const {data:rooms} = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name, rent_per_night, bookable, checkin_manager').order('room_id');
  window._roomsCache = rooms||[];

  let idSlots = '';
  for (let i=1;i<=8;i++) {
    idSlots += `
      <div class="id-card" id="idSlot${i}" style="display:${i===1?'block':'none'};">
        <div class="id-card-title">👤 Guest ${i}${i===1?' (Primary)':''}</div>
        <input type="text" class="id-slot-name" id="gN${i}" placeholder="Guest ${i} naam" value="${i===1?(pre.guestName||''):''}" />
        <div class="id-card-btns">
          <button type="button" class="outline" onclick="document.getElementById('gCam${i}').click()">📷 Camera</button>
          <button type="button" class="outline" onclick="document.getElementById('gGal${i}').click()">🖼️ Gallery</button>
        </div>
        <input type="file" id="gCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdPick(${i},'cam')" />
        <input type="file" id="gGal${i}" accept="image/*" style="display:none;" onchange="onIdPick(${i},'gal')" />
        <div class="file-info" id="idSt${i}"></div>
      </div>`;
  }

  renderShell(`
    <div class="card">
      <h1>➕ New Booking</h1>
      <button class="secondary btn-sm" onclick="window._bookingPrefill=null;renderManageBookings()">← Back</button>
    </div>

    <div class="card">
      <input type="hidden" id="parentBookingId" value="${pre.parentBookingId || ''}" />
      <input type="hidden" id="stayGroupId" value="${pre.stayGroupId || ''}" />

      ${pre.parentBookingId ? `
        <div class="success-msg" style="margin-bottom:10px;">
          Linked as extension of booking <strong>${pre.parentBookingId}</strong>
        </div>
      ` : ''}

      <div class="form-grid">
        <div class="form-group"><label>Guest Name *</label><input id="guestName" placeholder="Primary guest" value="${pre.guestName||''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" type="tel" placeholder="Mobile" value="${pre.guestPhone||''}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Actual Stay Property *</label>
          <select id="roomId" onchange="onRoomChg()">
            <option value="">Select</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${pre.roomId===r.room_id?'selected':''}>${r.nickname||r.unit_no} — ${(r.property_name||'').substring(0,30)}</option>`).join('')}
          </select>
          <div id="roomInfo" style="font-size:11px;color:var(--muted);margin-top:2px;"></div>
        </div>

        <div class="form-group">
          <label>Mode</label>
          <select id="bookingMode" onchange="onModeChg()">
            <option value="Offline" ${(pre.bookingMode||'Offline')==='Offline'?'selected':''}>Offline (Direct)</option>
            <option value="Online-Airbnb" ${(pre.bookingMode||'')==='Online-Airbnb'?'selected':''}>Online (Airbnb)</option>
          </select>
        </div>
      </div>

      <div id="onlineBox" style="display:none;background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="section-title">🌐 Airbnb Source Listing</div>
        <div class="sub">Airbnb booking originally kis listing pe aayi thi?</div>
        <div class="form-group">
          <label>Source / Original Airbnb Listing</label>
          <select id="sourceRoomId">
            <option value="">Select Original Listing</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${((pre.sourceRoomId||pre.roomId||'')===r.room_id)?'selected':''}>${r.nickname||r.unit_no} — ${(r.property_name||'').substring(0,30)}</option>`).join('')}
          </select>
        </div>
        <div class="sub">Agar same property hai to actual stay property hi select rahe.</div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Check-in</label><input id="checkIn" type="date" onchange="onRoomChg()" value="${pre.checkIn||''}" /></div>
        <div class="form-group"><label>Check-out</label><input id="checkOut" type="date" onchange="onRoomChg()" value="${pre.checkOut||''}" /></div>
      </div>
      <div id="nightsInfo" style="font-size:12px;color:var(--muted);margin-bottom:6px;"></div>

      <div class="form-grid">
        <div class="form-group"><label>Guests</label><input id="guests" type="number" value="${pre.guests||1}" min="1" max="8" onchange="showIdSlots()" oninput="showIdSlots()" /></div>
        <div class="form-group"><label>Total Amount ₹ * (net received for this segment)</label>
          <input id="totalAmount" type="number" placeholder="Actually kitna mila" oninput="onAmtChg()" value="${pre.totalAmount||''}" />
          <div id="sugInfo" style="font-size:11px;color:var(--muted);"></div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Advance ₹</label><input id="advanceAmt" type="number" value="${pre.advanceAmt||0}" oninput="onAmtChg()" /></div>
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
      <div id="balInfo" style="font-size:13px;font-weight:600;margin:2px 0 8px;"></div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:6px;">
        <div class="section-title">🪪 ID Proof</div>
        <div class="form-grid">
          <div class="form-group"><label>ID Type</label>
            <select id="idType">
              <option value="Aadhar" ${(pre.idType||'Aadhar')==='Aadhar'?'selected':''}>Aadhar</option>
              <option value="PAN" ${pre.idType==='PAN'?'selected':''}>PAN</option>
              <option value="DL" ${pre.idType==='DL'?'selected':''}>DL</option>
              <option value="Passport" ${pre.idType==='Passport'?'selected':''}>Passport</option>
            </select>
          </div>
          <div class="form-group"><label>ID Number</label><input id="idNo" placeholder="e.g. 1234 5678 9012" value="${pre.idNo||''}" /></div>
        </div>
        <div class="id-grid" id="idGrid">${idSlots}</div>
      </div>

      <div class="form-group" style="margin-top:10px;">
        <label>Notes</label>
        <textarea id="bkNotes" placeholder="Special notes...">${pre.bkNotes||''}</textarea>
      </div>

      <button id="saveBtn" onclick="saveBooking()" style="width:100%;padding:14px;font-size:15px;margin-top:10px;">💾 Save Booking</button>
      <div id="addBkErr"></div>
    </div>`, 'bookings');

  onModeChg();
  onRoomChg();
  showIdSlots();
}

function showIdSlots() {
  const n = Math.min(parseInt(document.getElementById('guests')?.value)||1, 8);
  for (let i=1;i<=8;i++) { const el=document.getElementById(`idSlot${i}`); if(el) el.style.display=i<=n?'block':'none'; }
}

function onIdPick(i, src) {
  const inp = document.getElementById(src==='cam'?`gCam${i}`:`gGal${i}`);
  const st = document.getElementById(`idSt${i}`);
  const slot = document.getElementById(`idSlot${i}`);
  if (inp?.files?.[0]) {
    st.textContent = `✅ ${src==='cam'?'Camera':'Gallery'}: ${inp.files[0].name.substring(0,20)}`;
    slot.classList.add('done');
  }
}

function onModeChg() {
  const m = document.getElementById('bookingMode').value;
  const onlineBox = document.getElementById('onlineBox');
  if (onlineBox) onlineBox.style.display = m==='Online-Airbnb'?'block':'none';

  // default source listing = actual stay property
  if (m === 'Online-Airbnb') {
    const roomId = document.getElementById('roomId')?.value;
    const src = document.getElementById('sourceRoomId');
    if (src && !src.value && roomId) src.value = roomId;
  }
  onAmtChg();
}

function onRoomChg() {
  const rid = document.getElementById('roomId').value;
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  const room = (window._roomsCache || []).find(r => r.room_id === rid);

  const rInfo = document.getElementById('roomInfo');
  if (room) {
    rInfo.innerHTML = `₹${room.rent_per_night || 0}/night · ${room.bookable ? '✅ Bookable' : '⚠️ Not Bookable'}`;
  } else {
    rInfo.innerHTML = '';
  }

  // NEW: agar Online-Airbnb hai aur source listing blank hai,
  // to sourceRoomId ko actual room ke same set kar do
  const mode = document.getElementById('bookingMode')?.value;
  const src = document.getElementById('sourceRoomId');
  if (mode === 'Online-Airbnb' && src && !src.value && rid) {
    src.value = rid;
  }

  const nInfo = document.getElementById('nightsInfo');
  let nights = 0;
  if (ci && co) {
    nights = Math.round((new Date(co) - new Date(ci)) / 864e5);
    nInfo.innerHTML = nights > 0
      ? `🌙 <strong>${nights} night(s)</strong>`
      : `<span style="color:var(--red);">Check-out must be after check-in</span>`;
  } else {
    nInfo.innerHTML = '';
  }

  const sInfo = document.getElementById('sugInfo');
  if (room && nights > 0) {
    sInfo.innerHTML = `💡 Ref: ₹${(room.rent_per_night * nights).toLocaleString('en-IN')}`;
  } else {
    sInfo.innerHTML = '';
  }

  onAmtChg();
}

function onAmtChg() {
  const total = parseFloat(document.getElementById('totalAmount')?.value)||0;
  const adv = parseFloat(document.getElementById('advanceAmt')?.value)||0;
  const bal = total - adv;
  const el = document.getElementById('balInfo');
  if (el) {
    if (total>0) el.innerHTML = bal>0?`<span style="color:var(--red);">💳 Balance: ₹${bal.toLocaleString('en-IN')}</span>`:`<span style="color:var(--green);">✅ Fully Paid</span>`;
    else el.innerHTML = '';
  }
}

async function uploadIdPhotos(bkId) {
  const cnt = Math.min(parseInt(document.getElementById('guests')?.value)||1, 8);
  const paths = [];
  for (let i=1;i<=cnt;i++) {
    const cam = document.getElementById(`gCam${i}`);
    const gal = document.getElementById(`gGal${i}`);
    const file = cam?.files?.[0] || gal?.files?.[0];
    if (!file) continue;
    try {
      const name = (document.getElementById(`gN${i}`)?.value?.trim()||`Guest${i}`).replace(/[^a-zA-Z0-9]/g,'_').substring(0,20);
      const comp = await compressImage(file);
      const path = `${bkId}/${Date.now()}_${name}_g${i}.jpg`;
      const {error} = await sb.storage.from('id-proofs').upload(path, comp, {contentType:'image/jpeg'});
      if (!error) paths.push(path);
    } catch(err) { console.warn(`Photo ${i} upload failed:`, err); }
  }
  return paths.length ? paths.join(',') : null;
}

async function saveBooking() {
  const btn = document.getElementById('saveBtn');
  if (btn.disabled) return;
  btn.disabled=true; btn.textContent='⏳ Saving...';

  try {
    const gn=document.getElementById('guestName').value.trim();
    const ph=document.getElementById('guestPhone').value.trim();
    const rid=document.getElementById('roomId').value; // actual stay room
    const mode=document.getElementById('bookingMode').value;
    const sourceRoomId = mode==='Online-Airbnb'
      ? (document.getElementById('sourceRoomId')?.value || rid)
      : null;
    const ci=document.getElementById('checkIn').value;
    const co=document.getElementById('checkOut').value;
    const gs=parseInt(document.getElementById('guests').value)||1;
    const tot=parseFloat(document.getElementById('totalAmount').value)||0;
    const adv=parseFloat(document.getElementById('advanceAmt').value)||0;
    const advMode=document.getElementById('advMode').value;
    const idType=document.getElementById('idType').value;
    const idNo=document.getElementById('idNo').value.trim();
    const parentBookingId=document.getElementById('parentBookingId')?.value || null;
    const stayGroupId=document.getElementById('stayGroupId')?.value || null;
    let notes=document.getElementById('bkNotes').value.trim();

    if (!gn||!rid) {
      document.getElementById('addBkErr').innerHTML='<div class="error">Guest name & actual stay property required</div>';
      btn.disabled=false; btn.textContent='💾 Save Booking'; return;
    }

    if (mode === 'Online-Airbnb' && !sourceRoomId) {
      document.getElementById('addBkErr').innerHTML='<div class="error">Source Airbnb listing required</div>';
      btn.disabled=false; btn.textContent='💾 Save Booking'; return;
    }

    if (ci&&co) {
      const {data:ex} = await sb.from('guest_register')
        .select('booking_id,guest_name,check_in,check_out')
        .eq('room_id',rid);

      const clash = (ex||[]).find(b =>
        b.check_in && b.check_out &&
        b.check_in < co && b.check_out > ci
      );

      if (clash) {
        document.getElementById('addBkErr').innerHTML=
          `<div class="error">⚠️ Actual stay property already occupied: ${clash.guest_name} (${clash.check_in} → ${clash.check_out})</div>`;
        btn.disabled=false; btn.textContent='💾 Save Booking'; return;
      }
    }

    const bkId = 'B'+Date.now();
    const finalStayGroupId = stayGroupId || bkId;
    const photos = await uploadIdPhotos(bkId);

    // Auto note builder
    const noteParts = [];
    if (notes) noteParts.push(notes);
    if (mode==='Online-Airbnb' && sourceRoomId && sourceRoomId !== rid) {
      noteParts.push(`Airbnb booked on ${sourceRoomId}, shifted to ${rid}`);
    }
    if (parentBookingId) {
      noteParts.push(`Extension after previous stay (${parentBookingId})`);
    }
    const finalNotes = noteParts.join(' | ');

    const {error} = await sb.from('guest_register').insert({
      booking_id:bkId,
      guest_name:gn,
      phone:ph||null,
      id_proof_type:idType||null,
      id_proof_no:idNo||null,
      id_proof_photo_path:photos?photos.split(',')[0]:null,
      id_proof_photo_paths:photos,
      room_id:rid,                    // actual stay room
      source_room_id:sourceRoomId,    // original Airbnb listing
      parent_booking_id:parentBookingId,
      stay_group_id:finalStayGroupId,
      booking_mode:mode,
      check_in:ci||null,
      check_out:co||null,
      guests:gs,
      total_amount:tot,
      payment_status:adv>=tot&&tot>0?'Paid':(adv>0?'Partial':'Unpaid'),
      notes:finalNotes||null,
      booked_by: SESSION.displayName || SESSION.role
    });

    if (error) {
      document.getElementById('addBkErr').innerHTML=`<div class="error">${error.message}</div>`;
      btn.disabled=false; btn.textContent='💾 Save Booking'; return;
    }

    if (adv>0) {
      await sb.from('payment_history').insert({
        booking_id:bkId,
        amount:adv,
        payment_mode:advMode||null,
        notes: parentBookingId ? `Extension / advance linked to ${parentBookingId}` : 'Advance'
      });
    }

    await sb.from('flats_status').upsert({room_id:rid,status:'Booked'});

    // WhatsApp
    const propTxt = document.getElementById('roomId').selectedOptions[0]?.text||'';
    const roomFull = (window._roomsCache||[]).find(r=>r.room_id===rid);
    const mgr = roomFull?.checkin_manager || 'Not Assigned';
    const bal = tot - adv;
    const msg = [
      `🏠 *Booking Confirmed!*`,
      ``,
      `👤 Guest: ${gn}`,
      `📞 Phone: ${ph||'N/A'}`,
      `🏡 Actual Stay: ${propTxt}`,
      ...(mode==='Online-Airbnb' && sourceRoomId && sourceRoomId !== rid ? [`🌐 Airbnb Source Listing: ${sourceRoomId}`] : []),
      ...(parentBookingId ? [`🔁 Extension Of: ${parentBookingId}`] : []),
      `👨‍💼 Check-in Manager: ${mgr}`,
      `📅 Check-in: ${ci||'N/A'}`,
      `📅 Check-out: ${co||'N/A'}`,
      `🛏️ Guests: ${gs}`,
      `💰 Total: ₹${tot.toLocaleString('en-IN')}`,
      `💵 Advance: ₹${adv.toLocaleString('en-IN')}`,
      `💳 Balance: ₹${bal.toLocaleString('en-IN')}`,
      `🔖 Mode: ${mode}`,
      `🧾 Booked By: ${SESSION.displayName||SESSION.role}`,
      ``,
      `— ${BRAND}`
    ].join('\n');
    setTimeout(()=>window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank'),400);

    window._bookingPrefill = null;
    renderManageBookings();
  } catch(err) {
    document.getElementById('addBkErr').innerHTML=`<div class="error">Error: ${err.message||err}</div>`;
    btn.disabled=false; btn.textContent='💾 Save Booking';
  }
}

// ============ EDIT BOOKING ============
async function editBooking(bkId) {
  const {data:b} = await sb.from('guest_register').select('*').eq('booking_id',bkId).single();
  if (!b) { alert('Not found'); return; }
  const {data:rooms} = await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('room_id');
  const {data:pays} = await sb.from('payment_history').select('*').eq('booking_id',bkId).order('paid_at',{ascending:false});
  const tp=(pays||[]).reduce((s,p)=>s+(p.amount||0),0);
  const bal=(b.total_amount||0)-tp;

  renderShell(`
    <div class="card"><h1>✏️ Edit Booking</h1><button class="secondary btn-sm" onclick="renderManageBookings()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Guest Name</label><input id="guestName" value="${b.guest_name||''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" value="${b.phone||''}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>ID Type</label><select id="idType">
          <option value="Aadhar" ${b.id_proof_type==='Aadhar'?'selected':''}>Aadhar</option>
          <option value="PAN" ${b.id_proof_type==='PAN'?'selected':''}>PAN</option>
          <option value="DL" ${b.id_proof_type==='DL'?'selected':''}>DL</option>
          <option value="Passport" ${b.id_proof_type==='Passport'?'selected':''}>Passport</option>
        </select></div>
        <div class="form-group"><label>ID Number</label><input id="idNo" value="${b.id_proof_no||''}" /></div>
      </div>

      <div class="form-group"><label>Replace ID Photo</label><input id="idPhoto" type="file" accept="image/*" /></div>

      <div class="form-grid">
        <div class="form-group">
          <label>Actual Stay Property</label>
          <select id="roomId">${(rooms||[]).map(r=>`<option value="${r.room_id}" ${r.room_id===b.room_id?'selected':''}>${r.nickname||r.unit_no} — ${r.property_name||''}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select id="bookingMode" onchange="toggleEditSourceBox()">
            <option value="Offline" ${b.booking_mode!=='Online-Airbnb'?'selected':''}>Offline</option>
            <option value="Online-Airbnb" ${b.booking_mode==='Online-Airbnb'?'selected':''}>Online</option>
          </select>
        </div>
      </div>

      <div id="editSourceBox" style="display:${b.booking_mode==='Online-Airbnb'?'block':'none'};background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="form-group">
          <label>Source / Original Airbnb Listing</label>
          <select id="sourceRoomId">
            <option value="">Select Original Listing</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}" ${(b.source_room_id||b.room_id)===r.room_id?'selected':''}>${r.nickname||r.unit_no} — ${r.property_name||''}</option>`).join('')}
          </select>
        </div>
      </div>

      ${b.parent_booking_id ? `<div class="sub">Extension of: <code>${b.parent_booking_id}</code></div>` : ''}
      ${b.stay_group_id ? `<div class="sub">Stay Group: <code>${b.stay_group_id}</code></div>` : ''}

      <div class="form-grid">
        <div class="form-group"><label>Check-in</label><input id="checkIn" type="date" value="${b.check_in||''}" /></div>
        <div class="form-group"><label>Check-out</label><input id="checkOut" type="date" value="${b.check_out||''}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Guests</label><input id="guests" type="number" value="${b.guests||1}" /></div>
        <div class="form-group"><label>Total ₹</label><input id="totalAmount" type="number" value="${b.total_amount||0}" /></div>
      </div>

      <div class="form-group"><label>Status</label><select id="paySt">
        <option value="Unpaid" ${b.payment_status==='Unpaid'?'selected':''}>Unpaid</option>
        <option value="Partial" ${b.payment_status==='Partial'?'selected':''}>Partial</option>
        <option value="Paid" ${b.payment_status==='Paid'?'selected':''}>Paid</option>
      </select></div>

      <div class="form-group"><label>Notes</label><textarea id="bkNotes">${b.notes||''}</textarea></div>
      <button onclick="updateBooking('${bkId}','${b.parent_booking_id||''}','${b.stay_group_id||b.booking_id}')">💾 Update</button><div id="editBkErr"></div>
    </div>

    <div class="card">
      <div class="section-title">💳 Payments</div>
      <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount||0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${tp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal>0?' warn':''}">₹${bal.toLocaleString('en-IN')}</span></div>
      ${(pays||[]).length?`<div class="table-wrap" style="margin-top:8px;"><table><thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Notes</th></tr></thead><tbody>${pays.map(p=>`<tr><td>${new Date(p.paid_at).toLocaleString('en-IN')}</td><td>₹${(p.amount||0).toLocaleString('en-IN')}</td><td>${p.payment_mode||'-'}</td><td>${p.notes||'-'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="sub">No payments yet</div>'}
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-sm" onclick="recordPayment('${bkId}')">➕ Add Payment</button>
        <button class="btn-sm outline" onclick="createOfflineExtension('${bkId}')">➕ Create Offline Extension</button>
        ${bal>0?`<button class="btn-sm secondary" onclick="markFullyPaid('${bkId}')">✅ Mark Paid</button>`:''}
      </div>
    </div>`, 'bookings');
}

async function updateBooking(bkId, parentBookingId = '', stayGroupId = '') {
  const gn=document.getElementById('guestName').value.trim();
  const rid=document.getElementById('roomId').value;
  if (!gn||!rid) { document.getElementById('editBkErr').innerHTML='<div class="error">Name & property required</div>'; return; }

  const mode = document.getElementById('bookingMode').value;
  const sourceRoomId = mode==='Online-Airbnb'
    ? (document.getElementById('sourceRoomId')?.value || rid)
    : null;

  const ci=document.getElementById('checkIn').value;
  const co=document.getElementById('checkOut').value;
  if (ci&&co) {
    const {data:ex} = await sb.from('guest_register')
      .select('booking_id,guest_name,check_in,check_out')
      .eq('room_id',rid).neq('booking_id',bkId);
    const clash = (ex||[]).find(b=>b.check_in&&b.check_out&&b.check_in<co&&b.check_out>ci);
    if (clash) { document.getElementById('editBkErr').innerHTML=`<div class="error">Clash: ${clash.guest_name}</div>`; return; }
  }

  let photoPath = null;
  const fi = document.getElementById('idPhoto');
  if (fi?.files?.[0]) {
    try {
      const comp = await compressImage(fi.files[0]);
      const path = `${bkId}/${Date.now()}_edit.jpg`;
      const {error} = await sb.storage.from('id-proofs').upload(path,comp,{contentType:'image/jpeg'});
      if (!error) photoPath = path;
    } catch(e) { console.warn('Photo upload failed',e); }
  }

  const obj = {
    guest_name:gn,
    phone:document.getElementById('guestPhone').value.trim()||null,
    id_proof_type:document.getElementById('idType').value||null,
    id_proof_no:document.getElementById('idNo').value.trim()||null,
    room_id:rid,
    source_room_id:sourceRoomId,
    parent_booking_id:parentBookingId || null,
    stay_group_id:stayGroupId || bkId,
    booking_mode:mode,
    check_in:ci||null,
    check_out:co||null,
    guests:parseInt(document.getElementById('guests').value)||1,
    total_amount:parseFloat(document.getElementById('totalAmount').value)||0,
    payment_status:document.getElementById('paySt').value,
    notes:document.getElementById('bkNotes').value.trim()||null,
  };
  if (photoPath) obj.id_proof_photo_path = photoPath;

  const {error} = await sb.from('guest_register').update(obj).eq('booking_id',bkId);
  if (error) { document.getElementById('editBkErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  renderManageBookings();
}

// ============ DELETE BOOKING (with image cleanup) ============
async function delBooking(bkId, guestName, roomId) {
  if (!confirm(`Delete booking for "${guestName}"?\nImages bhi delete hongi.`)) return;

  // Get photos first
  const {data:bk} = await sb.from('guest_register').select('room_id, id_proof_photo_paths, id_proof_photo_path').eq('booking_id',bkId).single();
  const rid = roomId || bk?.room_id;

  // Delete photos from storage
  const paths = (bk?.id_proof_photo_paths||bk?.id_proof_photo_path||'').split(',').filter(Boolean);
  if (paths.length) {
    try { await sb.storage.from('id-proofs').remove(paths); } catch(e) { console.warn('Photo delete failed',e); }
  }

  // Delete payment history
  await sb.from('payment_history').delete().eq('booking_id',bkId);
  // Delete booking
  const {error} = await sb.from('guest_register').delete().eq('booking_id',bkId);
  if (error) { alert('Error: '+error.message); return; }

  // Free room if no other active booking
  if (rid) {
    const today = new Date().toISOString().slice(0,10);
    const {data:active} = await sb.from('guest_register').select('booking_id').eq('room_id',rid).gt('check_out',today);
    if (!active||!active.length) {
      await sb.from('flats_status').update({status:'Free'}).eq('room_id',rid);
    }
  }
  renderManageBookings();
}

// ============ PAYMENTS ============
async function recordPayment(bkId) {
  const amt = prompt('Payment amount ₹?');
  if (!amt||isNaN(parseFloat(amt))) return;
  const mode = prompt('Mode? (Cash/UPI/Bank/Airbnb Payout)')||null;
  await savePay(bkId, parseFloat(amt), mode);
}

async function markFullyPaid(bkId) {
  const {data:b} = await sb.from('guest_register').select('total_amount').eq('booking_id',bkId).single();
  const {data:p} = await sb.from('payment_history').select('amount').eq('booking_id',bkId);
  const paid = (p||[]).reduce((s,x)=>s+(x.amount||0),0);
  const bal = (b?.total_amount||0)-paid;
  if (bal<=0) { alert('Already paid'); return; }
  const mode = prompt(`Balance ₹${bal.toLocaleString('en-IN')} — Mode?`);
  if (!mode) return;
  await savePay(bkId, bal, mode);
}

async function savePay(bkId, amount, mode) {
  await sb.from('payment_history').insert({booking_id:bkId,amount,payment_mode:mode});
  const {data:b} = await sb.from('guest_register').select('total_amount').eq('booking_id',bkId).single();
  const {data:p} = await sb.from('payment_history').select('amount').eq('booking_id',bkId);
  const paid = (p||[]).reduce((s,x)=>s+(x.amount||0),0);
  const st = paid>=(b?.total_amount||0)&&b?.total_amount>0?'Paid':(paid>0?'Partial':'Unpaid');
  await sb.from('guest_register').update({payment_status:st}).eq('booking_id',bkId);
  if (document.getElementById('editBkErr')) editBooking(bkId);
  else renderManageBookings();
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
      <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${(emps||[]).map(e=>`<tr>
        <td><strong>${e.name}</strong></td><td>${e.role||'-'}</td><td>${e.phone||'-'}</td>
        <td>₹${(e.monthly_salary||0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${e.status==='Active'?'green':'red'}">${e.status||'Active'}</span></td>
        ${isO?`<td class="table-actions"><button class="btn-sm" onclick="editEmp('${e.emp_id}')">✏️</button><button class="btn-sm danger" onclick="delEmp('${e.emp_id}','${e.name}')">🗑️</button></td>`:''}
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'employees');
}

async function renderAddEmp() {
  renderShell(`<div class="card"><h1>➕ Add Employee</h1><button class="secondary btn-sm" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <div class="form-grid"><div class="form-group"><label>Name</label><input id="eName" /></div><div class="form-group"><label>Phone</label><input id="ePhone" /></div></div>
      <div class="form-grid"><div class="form-group"><label>Role</label><input id="eRole" placeholder="Manager, Cleaner..." /></div><div class="form-group"><label>Salary ₹</label><input id="eSal" type="number" /></div></div>
      <div class="form-grid"><div class="form-group"><label>Join Date</label><input id="eJoin" type="date" /></div><div class="form-group"><label>Assigned Rooms</label><input id="eRooms" /></div></div>
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0;"><input type="checkbox" id="eActive" checked /> Active</label>
      <button onclick="saveEmp()">💾 Save</button><div id="empErr"></div>
    </div>`, 'employees');
}

async function saveEmp() {
  const name=document.getElementById('eName').value.trim();
  if (!name) { document.getElementById('empErr').innerHTML='<div class="error">Name required</div>'; return; }
  const {error} = await sb.from('employees').insert({
    emp_id:'E'+Date.now(), name, phone:document.getElementById('ePhone').value.trim()||null,
    role:document.getElementById('eRole').value.trim()||null,
    monthly_salary:parseFloat(document.getElementById('eSal').value)||0,
    joining_date:document.getElementById('eJoin').value||null,
    assigned_rooms:document.getElementById('eRooms').value.trim()||null,
    status:document.getElementById('eActive').checked?'Active':'Inactive',
  });
  if (error) { document.getElementById('empErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  renderManageEmployees();
}

async function editEmp(id) {
  const {data:e} = await sb.from('employees').select('*').eq('emp_id',id).single();
  if (!e) return;
  renderShell(`<div class="card"><h1>✏️ Edit Employee</h1><button class="secondary btn-sm" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <div class="form-grid"><div class="form-group"><label>Name</label><input id="eName" value="${e.name}" /></div><div class="form-group"><label>Phone</label><input id="ePhone" value="${e.phone||''}" /></div></div>
      <div class="form-grid"><div class="form-group"><label>Role</label><input id="eRole" value="${e.role||''}" /></div><div class="form-group"><label>Salary ₹</label><input id="eSal" type="number" value="${e.monthly_salary||0}" /></div></div>
      <div class="form-grid"><div class="form-group"><label>Join Date</label><input id="eJoin" type="date" value="${e.joining_date||''}" /></div><div class="form-group"><label>Rooms</label><input id="eRooms" value="${e.assigned_rooms||''}" /></div></div>
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0;"><input type="checkbox" id="eActive" ${e.status==='Active'?'checked':''} /> Active</label>
      <button onclick="updEmp('${id}')">💾 Update</button><div id="empErr"></div>
    </div>`, 'employees');
}

async function updEmp(id) {
  const name=document.getElementById('eName').value.trim();
  if (!name) { document.getElementById('empErr').innerHTML='<div class="error">Name required</div>'; return; }
  await sb.from('employees').update({
    name, phone:document.getElementById('ePhone').value.trim()||null,
    role:document.getElementById('eRole').value.trim()||null,
    monthly_salary:parseFloat(document.getElementById('eSal').value)||0,
    joining_date:document.getElementById('eJoin').value||null,
    assigned_rooms:document.getElementById('eRooms').value.trim()||null,
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
  renderShell(`<div class="card"><h1>➕ Add Task</h1><button class="secondary btn-sm" onclick="renderEmployeeTasks()">← Back</button></div>
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
  renderShell(`<div class="card"><h1>✏️ Edit Task</h1><button class="secondary btn-sm" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card"><div class="sub">${t.employees?.name||t.emp_id}</div>
      <div class="form-group"><label>Task</label><textarea id="tDesc">${t.task_description||''}</textarea></div>
      <div class="form-grid"><div class="form-group"><label>Date</label><input id="tDate" type="date" value="${t.assigned_date||''}" /></div>
      <div class="form-group"><label>Status</label><select id="tSt"><option ${t.status==='Pending'?'selected':''}>Pending</option><option ${t.status==='In Progress'?'selected':''}>In Progress</option><option ${t.status==='Completed'?'selected':''}>Completed</option></select></div></div>
      <button onclick="updTask(${id})">💾 Update</button>
    </div>`, 'tasks');
}

async function updTask(id) {
  await sb.from('employee_tasks').update({task_description:document.getElementById('tDesc').value.trim(),assigned_date:document.getElementById('tDate').value||null,status:document.getElementById('tSt').value}).eq('id',id);
  renderEmployeeTasks();
}

async function delTask(id) { if(confirm('Delete?')) { await sb.from('employee_tasks').delete().eq('id',id); renderEmployeeTasks(); } }

// ============ ATTENDANCE ============
async function renderAttendance() {
  renderShell(`<div class="loading">Loading...</div>`, 'attendance');
  const today = new Date().toISOString().slice(0,10);
  const [{data:emps},{data:att}] = await Promise.all([
    sb.from('employees').select('emp_id,name').eq('status','Active').order('name'),
    sb.from('attendance_log').select('*').eq('att_date',today)
  ]);
  const am = {}; (att||[]).forEach(a=>{am[a.emp_id]=a.status;});
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card"><h1>📋 Attendance — ${today}</h1></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Status</th>${isO?'<th>Mark</th>':''}</tr></thead>
      <tbody>${(emps||[]).map(e=>{const st=am[e.emp_id]||'Not Marked';return`<tr>
        <td><strong>${e.name}</strong></td>
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

// ============ ATTENDANCE SUMMARY ============
async function renderAttendanceSummary() {
  renderShell(`<div class="loading">Loading...</div>`, 'att-summary');
  const cm = new Date().toISOString().slice(0,7);
  const [{data:emps},{data:logs}] = await Promise.all([
    sb.from('employees').select('emp_id,name').eq('status','Active').order('name'),
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
    <div class="card"><h1>📅 Monthly Summary — ${cm}</h1><button class="secondary btn-sm" onclick="renderAttendance()">📋 Daily</button></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Present</th><th>Half</th><th>Absent</th><th>%</th></tr></thead>
      <tbody>${sum.map(s=>`<tr><td><strong>${s.name}</strong></td>
        <td><span class="badge green">${s.pr}</span></td>
        <td><span class="badge yellow">${s.hd}</span></td>
        <td><span class="badge ${s.ab>0?'red':'green'}">${s.ab}</span></td>
        <td><strong>${s.pct}%</strong></td></tr>`).join('')}</tbody>
    </table></div></div>`, 'att-summary');
}

// ============ SALARY ============
async function renderSalaryTracker() {
  renderShell(`<div class="loading">Loading...</div>`, 'salary');
  const {data:sals} = await sb.from('salary_tracker').select('*, employees(name)').order('month',{ascending:false});
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card"><h1>💰 Salary Tracker</h1>${isO?`<button onclick="renderAddSal()">➕ Add</button>`:''}</div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Month</th><th>Due</th><th>Paid</th><th>Balance</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${(sals||[]).map(s=>{const b=(s.salary_due||0)-(s.salary_paid||0);return`<tr>
        <td><strong>${s.employees?.name||s.emp_id}</strong></td><td>${s.month||'-'}</td>
        <td>₹${(s.salary_due||0).toLocaleString('en-IN')}</td><td>₹${(s.salary_paid||0).toLocaleString('en-IN')}</td>
        <td><span class="${b>0?'metric-value warn':''}">₹${b.toLocaleString('en-IN')}</span></td>
        ${isO?`<td class="table-actions"><button class="btn-sm" onclick="editSal(${s.id})">✏️</button><button class="btn-sm danger" onclick="delSal(${s.id})">🗑️</button></td>`:''}</tr>`;}).join('')}</tbody>
    </table></div></div>`, 'salary');
}

async function renderAddSal() {
  const {data:emps} = await sb.from('employees').select('emp_id,name,monthly_salary').eq('status','Active').order('name');
  window._salCache=emps||[];
  renderShell(`<div class="card"><h1>➕ Salary Record</h1><button class="secondary btn-sm" onclick="renderSalaryTracker()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Employee</label><select id="sEmp" onchange="onSalEmpChg()"><option value="">Select</option>${(emps||[]).map(e=>`<option value="${e.emp_id}">${e.name}</option>`).join('')}</select></div>
      <div id="sInfo" class="sub"></div>
      <div class="form-grid">
        <div class="form-group"><label>Month</label><input id="sMo" type="month" value="${new Date().toISOString().slice(0,7)}" /></div>
        <div class="form-group"><label>Due ₹</label><input id="sDue" type="number" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Paid ₹</label><input id="sPaid" type="number" /></div>
        <div class="form-group"><label>Date</label><input id="sDate" type="date" /></div>
      </div>
      <div class="form-group"><label>Mode</label><input id="sMode" placeholder="Cash/UPI/Bank" /></div>
      <button onclick="saveSal()">💾 Save</button><div id="salErr"></div>
    </div>`, 'salary');
}

function onSalEmpChg() {
  const e=(window._salCache||[]).find(x=>x.emp_id===document.getElementById('sEmp').value);
  if(e){document.getElementById('sInfo').innerHTML=`💡 Salary: ₹${(e.monthly_salary||0).toLocaleString('en-IN')}`;document.getElementById('sDue').value=e.monthly_salary||0;}
}

async function saveSal() {
  const eid=document.getElementById('sEmp').value, mo=document.getElementById('sMo').value;
  if(!eid||!mo){document.getElementById('salErr').innerHTML='<div class="error">Employee & month required</div>';return;}
  await sb.from('salary_tracker').insert({emp_id:eid,month:mo,salary_due:parseFloat(document.getElementById('sDue').value)||0,salary_paid:parseFloat(document.getElementById('sPaid').value)||0,payment_date:document.getElementById('sDate').value||null,payment_mode:document.getElementById('sMode').value.trim()||null});
  renderSalaryTracker();
}

async function editSal(id) {
  const {data:s} = await sb.from('salary_tracker').select('*, employees(name)').eq('id',id).single();
  if(!s)return;
  renderShell(`<div class="card"><h1>✏️ Edit Salary</h1><button class="secondary btn-sm" onclick="renderSalaryTracker()">← Back</button></div>
    <div class="card"><div class="sub">${s.employees?.name||s.emp_id}</div>
      <div class="form-grid"><div class="form-group"><label>Month</label><input id="sMo" type="month" value="${s.month||''}" /></div><div class="form-group"><label>Due</label><input id="sDue" type="number" value="${s.salary_due||0}" /></div></div>
      <div class="form-grid"><div class="form-group"><label>Paid</label><input id="sPaid" type="number" value="${s.salary_paid||0}" /></div><div class="form-group"><label>Date</label><input id="sDate" type="date" value="${s.payment_date||''}" /></div></div>
      <div class="form-group"><label>Mode</label><input id="sMode" value="${s.payment_mode||''}" /></div>
      <button onclick="updSal(${id})">💾 Update</button>
    </div>`, 'salary');
}

async function updSal(id) {
  await sb.from('salary_tracker').update({month:document.getElementById('sMo').value,salary_due:parseFloat(document.getElementById('sDue').value)||0,salary_paid:parseFloat(document.getElementById('sPaid').value)||0,payment_date:document.getElementById('sDate').value||null,payment_mode:document.getElementById('sMode').value.trim()||null}).eq('id',id);
  renderSalaryTracker();
}

async function delSal(id){if(confirm('Delete?')){await sb.from('salary_tracker').delete().eq('id',id);renderSalaryTracker();}}

// ============ ADVANCE ============
async function renderAdvanceTracker() {
  renderShell(`<div class="loading">Loading...</div>`, 'advance');
  const {data:advs} = await sb.from('advance_tracker').select('*, employees(name)').order('date_given',{ascending:false});
  const isO = SESSION.role==='owner';
  renderShell(`
    <div class="card"><h1>💵 Advance Tracker</h1>${isO?`<button onclick="renderAddAdv()">➕ Add</button>`:''}</div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Date</th><th>Amount</th><th>Repaid</th><th>Balance</th><th>Reason</th>${isO?'<th>Actions</th>':''}</tr></thead>
      <tbody>${(advs||[]).map(a=>{const b=(a.advance_amount||0)-(a.repaid_amount||0);return`<tr>
        <td><strong>${a.employees?.name||a.emp_id}</strong></td><td>${a.date_given||'-'}</td>
        <td>₹${(a.advance_amount||0).toLocaleString('en-IN')}</td><td>₹${(a.repaid_amount||0).toLocaleString('en-IN')}</td>
        <td><span class="${b>0?'metric-value warn':''}">₹${b.toLocaleString('en-IN')}</span></td><td>${a.reason||'-'}</td>
        ${isO?`<td class="table-actions"><button class="btn-sm" onclick="editAdv(${a.id})">✏️</button><button class="btn-sm danger" onclick="delAdv(${a.id})">🗑️</button></td>`:''}</tr>`;}).join('')}</tbody>
    </table></div></div>`, 'advance');
}

async function renderAddAdv() {
  const {data:emps} = await sb.from('employees').select('emp_id,name').eq('status','Active').order('name');
  renderShell(`<div class="card"><h1>➕ Advance</h1><button class="secondary btn-sm" onclick="renderAdvanceTracker()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Employee</label><select id="aEmp"><option value="">Select</option>${(emps||[]).map(e=>`<option value="${e.emp_id}">${e.name}</option>`).join('')}</select></div>
      <div class="form-grid"><div class="form-group"><label>Date</label><input id="aDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div><div class="form-group"><label>Amount ₹</label><input id="aAmt" type="number" /></div></div>
      <div class="form-group"><label>Reason</label><input id="aReason" /></div>
      <button onclick="saveAdv()">💾 Save</button><div id="advErr"></div>
    </div>`, 'advance');
}

async function saveAdv() {
  const eid=document.getElementById('aEmp').value;
  const amt=parseFloat(document.getElementById('aAmt').value)||0;
  if(!eid||amt<=0){document.getElementById('advErr').innerHTML='<div class="error">Employee & amount required</div>';return;}
  await sb.from('advance_tracker').insert({emp_id:eid,date_given:document.getElementById('aDate').value||null,advance_amount:amt,repaid_amount:0,reason:document.getElementById('aReason').value.trim()||null});
  renderAdvanceTracker();
}

async function editAdv(id) {
  const {data:a} = await sb.from('advance_tracker').select('*, employees(name)').eq('id',id).single();
  if(!a)return;
  renderShell(`<div class="card"><h1>✏️ Edit Advance</h1><button class="secondary btn-sm" onclick="renderAdvanceTracker()">← Back</button></div>
    <div class="card"><div class="sub">${a.employees?.name||a.emp_id}</div>
      <div class="form-grid"><div class="form-group"><label>Date</label><input id="aDate" type="date" value="${a.date_given||''}" /></div><div class="form-group"><label>Amount</label><input id="aAmt" type="number" value="${a.advance_amount||0}" /></div></div>
      <div class="form-grid"><div class="form-group"><label>Repaid</label><input id="aRep" type="number" value="${a.repaid_amount||0}" /></div><div class="form-group"><label>Reason</label><input id="aReason" value="${a.reason||''}" /></div></div>
      <button onclick="updAdv(${id})">💾 Update</button>
    </div>`, 'advance');
}

async function updAdv(id) {
  await sb.from('advance_tracker').update({date_given:document.getElementById('aDate').value||null,advance_amount:parseFloat(document.getElementById('aAmt').value)||0,repaid_amount:parseFloat(document.getElementById('aRep').value)||0,reason:document.getElementById('aReason').value.trim()||null}).eq('id',id);
  renderAdvanceTracker();
}

async function delAdv(id){if(confirm('Delete?')){await sb.from('advance_tracker').delete().eq('id',id);renderAdvanceTracker();}}

// ============ STORE ============
async function renderStore() {
  renderShell(`<div class="loading">Loading...</div>`, 'store');
  const [{data:items},{data:txns}] = await Promise.all([
    sb.from('store_items').select('*').order('item_name'),
    sb.from('stock_transactions').select('*, store_items(item_name,unit), rooms(unit_no)').order('txn_date',{ascending:false}).limit(50)
  ]);
  const sm = {}; (txns||[]).forEach(t=>{sm[t.item_id]=(sm[t.item_id]||0)+(t.txn_type==='In'?(t.quantity||0):-(t.quantity||0));});
  renderShell(`
    <div class="card"><h1>📦 Store</h1>
      <div class="btn-row"><button onclick="renderAddItem()">➕ Item</button><button class="secondary" onclick="renderAddTxn()">🔄 Stock In/Out</button></div></div>
    <div class="card"><div class="section-title">Items</div><div class="table-wrap"><table>
      <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Reorder</th></tr></thead>
      <tbody>${(items||[]).map(i=>{const s=sm[i.item_id]||0;return`<tr><td><strong>${i.item_name}</strong></td><td>${i.category||'-'}</td><td><span class="${s<=(i.reorder_level||0)?'metric-value warn':''}">${s}</span></td><td>${i.reorder_level||0}</td></tr>`;}).join('')}</tbody>
    </table></div></div>
    <div class="card"><div class="section-title">Recent Transactions</div><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Cost</th></tr></thead>
      <tbody>${(txns||[]).map(t=>`<tr><td>${t.txn_date}</td><td>${t.store_items?.item_name||t.item_id}</td><td><span class="badge ${t.txn_type==='In'?'green':'yellow'}">${t.txn_type}</span></td><td>${t.quantity}</td><td>₹${(t.cost||0).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody>
    </table></div></div>`, 'store');
}

async function renderAddItem() {
  renderShell(`<div class="card"><h1>➕ Store Item</h1><button class="secondary btn-sm" onclick="renderStore()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Name</label><input id="iName" /></div>
      <div class="form-grid"><div class="form-group"><label>Category</label><select id="iCat"><option>Linen</option><option>Toiletries</option><option>Cleaning</option><option>Electronics</option><option>Other</option></select></div>
      <div class="form-group"><label>Unit</label><input id="iUnit" placeholder="pcs/kg" /></div></div>
      <div class="form-group"><label>Reorder Level</label><input id="iReorder" type="number" value="0" /></div>
      <button onclick="saveItem()">💾 Save</button><div id="iErr"></div>
    </div>`, 'store');
}

async function saveItem() {
  const name=document.getElementById('iName').value.trim();
  if(!name){document.getElementById('iErr').innerHTML='<div class="error">Name required</div>';return;}
  await sb.from('store_items').insert({item_id:'ITM'+Date.now(),item_name:name,category:document.getElementById('iCat').value,unit:document.getElementById('iUnit').value.trim()||null,reorder_level:parseFloat(document.getElementById('iReorder').value)||0});
  renderStore();
}

async function renderAddTxn() {
  const [{data:items},{data:rooms}] = await Promise.all([
    sb.from('store_items').select('item_id,item_name').order('item_name'),
    sb.from('rooms').select('room_id,unit_no,property_name').order('room_id')
  ]);
  renderShell(`<div class="card"><h1>🔄 Stock In/Out</h1><button class="secondary btn-sm" onclick="renderStore()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Item</label><select id="txItem"><option value="">Select</option>${(items||[]).map(i=>`<option value="${i.item_id}">${i.item_name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Property</label><select id="txRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.unit_no}</option>`).join('')}</select></div>
      <div class="form-grid">
        <div class="form-group"><label>Type</label><select id="txType"><option value="In">Stock In</option><option value="Out">Stock Out</option></select></div>
        <div class="form-group"><label>Qty</label><input id="txQty" type="number" /></div>
      </div>
      <div class="form-grid"><div class="form-group"><label>Cost ₹</label><input id="txCost" type="number" /></div>
      <div class="form-group"><label>Date</label><input id="txDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div></div>
      <button onclick="saveTxn()">💾 Save</button><div id="txErr"></div>
    </div>`, 'store');
}

async function saveTxn() {
  const iid=document.getElementById('txItem').value, qty=parseFloat(document.getElementById('txQty').value)||0;
  if(!iid||qty<=0){document.getElementById('txErr').innerHTML='<div class="error">Item & qty required</div>';return;}
  await sb.from('stock_transactions').insert({item_id:iid,room_id:document.getElementById('txRoom').value||null,txn_type:document.getElementById('txType').value,quantity:qty,cost:parseFloat(document.getElementById('txCost').value)||0,txn_date:document.getElementById('txDate').value||null});
  renderStore();
}

// ============ EXPENSES ============
async function renderExpenses() {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');
  const cm = new Date().toISOString().slice(0,7);
  const ml = new Date().toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');
  const [{data:cats},{data:exps},{data:gs}] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').order('entry_date',{ascending:false}),
    sb.from('guest_register').select('booking_id,check_in,total_amount'),
  ]);
  const pm = await getPaidMap((gs||[]).map(g=>g.booking_id));
  const inc = (gs||[]).filter(g=>g.check_in?.startsWith(cm)).reduce((s,g)=>s+(pm[g.booking_id]||0),0);
  const mexp = (exps||[]).filter(e=>e.month===ml).reduce((s,e)=>s+(e.amount||0),0);
  const profit = inc - mexp;
  renderShell(`
    <div class="card"><h1>🧾 Expenses & Profit</h1><div class="sub">${ml}</div>
      <div class="btn-row"><button onclick="renderAddExpCat()">➕ Category</button><button class="secondary" onclick="renderAddExpEntry()">🧾 Log Expense</button></div></div>
    <div class="card">
      <div class="metric-row"><span class="metric-label">Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${mexp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div>
    </div>
    <div class="card"><div class="section-title">Categories</div><div class="table-wrap"><table>
      <thead><tr><th>Category</th><th>Default ₹</th></tr></thead>
      <tbody>${(cats||[]).map(c=>`<tr><td>${c.category_name}</td><td>₹${(c.default_monthly_amount||0).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="2" class="sub">No categories</td></tr>'}</tbody>
    </table></div></div>
    <div class="card"><div class="section-title">Entries</div><div class="table-wrap"><table>
      <thead><tr><th>Month</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
      <tbody>${(exps||[]).map(e=>`<tr><td>${e.month||'-'}</td><td>${e.expense_categories?.category_name||'-'}</td><td>₹${(e.amount||0).toLocaleString('en-IN')}</td><td>${e.entry_date||'-'}</td></tr>`).join('')||'<tr><td colspan="4" class="sub">No entries</td></tr>'}</tbody>
    </table></div></div>`, 'expenses');
}

async function renderAddExpCat() {
  renderShell(`<div class="card"><h1>➕ Expense Category</h1><button class="secondary btn-sm" onclick="renderExpenses()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Name</label><input id="cName" /></div>
      <div class="form-group"><label>Default Monthly ₹</label><input id="cAmt" type="number" /></div>
      <button onclick="saveExpCat()">💾 Save</button><div id="cErr"></div>
    </div>`, 'expenses');
}

async function saveExpCat() {
  const name=document.getElementById('cName').value.trim();
  if(!name){document.getElementById('cErr').innerHTML='<div class="error">Name required</div>';return;}
  await sb.from('expense_categories').insert({category_id:'EXP'+Date.now(),category_name:name,default_monthly_amount:parseFloat(document.getElementById('cAmt').value)||null});
  renderExpenses();
}

async function renderAddExpEntry() {
  const [{data:cats},{data:rooms}] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('rooms').select('room_id,unit_no,nickname').order('unit_no')
  ]);
  window._expCats=cats||[];
  const ml = new Date().toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');
  renderShell(`<div class="card"><h1>🧾 Log Expense</h1><button class="secondary btn-sm" onclick="renderExpenses()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Category</label><select id="exCat" onchange="onExpCatChg()"><option value="">Select</option>${(cats||[]).map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join('')}</select></div>
      <div id="exCatInfo" class="sub"></div>
      <div class="form-group"><label>Property</label><select id="exRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}</select></div>
      <div class="form-grid">
        <div class="form-group"><label>Month</label><input id="exMo" value="${ml}" /></div>
        <div class="form-group"><label>Amount ₹</label><input id="exAmt" type="number" /></div>
      </div>
      <div class="form-group"><label>Date</label><input id="exDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <button onclick="saveExpEntry()">💾 Save</button><div id="exErr"></div>
    </div>`, 'expenses');
}

function onExpCatChg() {
  const c=(window._expCats||[]).find(x=>x.category_id===document.getElementById('exCat').value);
  if(c?.default_monthly_amount){document.getElementById('exCatInfo').innerHTML=`💡 Default: ₹${c.default_monthly_amount.toLocaleString('en-IN')}`;document.getElementById('exAmt').value=c.default_monthly_amount;}
  else document.getElementById('exCatInfo').innerHTML='';
}

async function saveExpEntry() {
  const cid=document.getElementById('exCat').value, mo=document.getElementById('exMo').value.trim(), amt=parseFloat(document.getElementById('exAmt').value)||0;
  if(!cid||!mo||amt<=0){document.getElementById('exErr').innerHTML='<div class="error">Category, month & amount required</div>';return;}
  await sb.from('expenses').insert({category_id:cid,room_id:document.getElementById('exRoom').value||null,month:mo,amount:amt,entry_date:document.getElementById('exDate').value||null});
  renderExpenses();
}

// ============ PROPERTY REPORT ============
async function renderPropertyReport(roomId, range='Month') {
  renderShell(`<div class="loading">Loading...</div>`, 'property-report');
  const {data:rooms} = await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('unit_no');
  const sel = roomId||rooms?.[0]?.room_id;
  if(!sel){renderShell(`<div class="card"><h1>🏘️ No properties</h1></div>`,'property-report');return;}

  const now=new Date(); let s,e,label;
  if(range==='Month'){s=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);e=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);label=now.toLocaleString('en-IN',{month:'long',year:'numeric'});}
  else if(range==='Quarter'){const q=Math.floor(now.getMonth()/3);s=new Date(now.getFullYear(),q*3,1).toISOString().slice(0,10);e=new Date(now.getFullYear(),q*3+3,0).toISOString().slice(0,10);label=`Q${q+1} ${now.getFullYear()}`;}
  else{s=`${now.getFullYear()}-01-01`;e=`${now.getFullYear()}-12-31`;label=`${now.getFullYear()}`;}
  const ml=now.toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');

  const [{data:gs},{data:exs}] = await Promise.all([
    sb.from('guest_register').select('*').eq('room_id',sel).gte('check_in',s).lte('check_in',e),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',sel).eq('month',ml)
  ]);
  const pm = await getPaidMap((gs||[]).map(g=>g.booking_id));
  const on=(gs||[]).filter(g=>g.booking_mode==='Online-Airbnb'), off=(gs||[]).filter(g=>g.booking_mode!=='Online-Airbnb');
  const onRev=on.reduce((a,g)=>a+(pm[g.booking_id]||0),0), offRev=off.reduce((a,g)=>a+(pm[g.booking_id]||0),0);
  const totRev=onRev+offRev, totExp=(exs||[]).reduce((a,e)=>a+(e.amount||0),0), profit=totRev-totExp;
  const room=rooms.find(r=>r.room_id===sel);

  renderShell(`
    <div class="card"><h1>🏘️ Property Report</h1>
      <div class="form-group"><select id="rpRoom">${rooms.map(r=>`<option value="${r.room_id}" ${r.room_id===sel?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}</select></div>
      <div class="btn-row">
        <button class="${range==='Month'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Month')">Month</button>
        <button class="${range==='Quarter'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Quarter')">Quarter</button>
        <button class="${range==='Year'?'':'secondary'} btn-sm" onclick="renderPropertyReport('${sel}','Year')">Year</button>
      </div></div>
    <div class="card"><div class="sub">${room?.property_name||''} — ${label}</div>
      <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${totRev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${totExp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div>
    </div>
    <div class="card"><div class="section-title">Revenue Split</div><div class="table-wrap"><table>
      <thead><tr><th>Source</th><th>Revenue</th><th>%</th></tr></thead>
      <tbody>
        <tr><td>Online</td><td>₹${onRev.toLocaleString('en-IN')}</td><td>${totRev>0?Math.round(onRev/totRev*100):0}%</td></tr>
        <tr><td>Offline</td><td>₹${offRev.toLocaleString('en-IN')}</td><td>${totRev>0?Math.round(offRev/totRev*100):0}%</td></tr>
      </tbody>
    </table></div></div>
    <div class="card"><div class="section-title">Expenses (${ml})</div><div class="table-wrap"><table>
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${(exs||[]).map(e=>`<tr><td>${e.expense_categories?.category_name||'-'}</td><td>₹${(e.amount||0).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="2" class="sub">No expenses</td></tr>'}
        <tr style="font-weight:700;"><td>Total</td><td>₹${totExp.toLocaleString('en-IN')}</td></tr>
      </tbody>
    </table></div></div>`, 'property-report');
  document.getElementById('rpRoom').onchange=e=>renderPropertyReport(e.target.value,range);
}

// ============ INVESTORS ============
async function renderManageInvestors() {
  renderShell(`<div class="loading">Loading...</div>`, 'investors');
  const [{data:invs},{data:links},{data:rooms}] = await Promise.all([
    sb.from('investors').select('*').order('name'),
    sb.from('investor_properties').select('*, investors(name), rooms(unit_no,property_name,nickname)'),
    sb.from('rooms').select('room_id,unit_no,property_name,nickname').order('room_id')
  ]);
  window._invRooms=rooms||[];
  renderShell(`
    <div class="card"><h1>🧑‍💼 Sub-Owners</h1><div class="sub">${(invs||[]).length} investors</div>
      <div class="btn-row">
        <button onclick="renderAddInv()">➕ Add</button>
        <button class="secondary" onclick="renderLinkProp()">🔗 Link Property</button>
      </div></div>
    <div class="card"><div class="section-title">Mapping</div><div class="table-wrap"><table>
      <thead><tr><th>Investor</th><th>Property</th><th>Share %</th><th>Report</th></tr></thead>
      <tbody>${(links||[]).map(l=>`<tr>
        <td>${l.investors?.name||l.investor_id}</td>
        <td>${l.rooms?.nickname||l.rooms?.unit_no||l.room_id}</td>
        <td>${l.investors?.revenue_share_pct||70}%</td>
        <td><button class="btn-sm" onclick="renderInvestorReport('${l.investor_id}','${l.room_id}')">📊 Report</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>
    <div class="card"><div class="section-title">All Investors</div><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Phone</th><th>Share</th><th>ID</th></tr></thead>
      <tbody>${(invs||[]).map(i=>`<tr>
        <td><strong>${i.name}</strong></td><td>${i.phone||'-'}</td>
        <td>${i.revenue_share_pct||70}%</td>
        <td><code>${i.investor_id}</code></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`, 'investors');
}

async function renderAddInv() {
  renderShell(`<div class="card"><h1>➕ Add Investor</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Name</label><input id="invName" /></div>
      <div class="form-group"><label>Phone</label><input id="invPhone" /></div>
      <button onclick="saveInv()">💾 Save</button><div id="invErr"></div>
    </div>`, 'investors');
}

async function saveInv() {
  const name=document.getElementById('invName').value.trim();
  if(!name){document.getElementById('invErr').innerHTML='<div class="error">Name required</div>';return;}
  const id='INV'+Date.now();
  await sb.from('investors').insert({investor_id:id,name,phone:document.getElementById('invPhone').value.trim()||null});
  renderShell(`<div class="card"><h1>✅ Investor Added</h1><div class="sub">ID: <code>${id}</code></div>
    <button onclick="renderManageInvestors()">← Back</button></div>`, 'investors');
}

async function renderLinkProp() {
  const {data:invs} = await sb.from('investors').select('investor_id,name').order('name');
  renderShell(`<div class="card"><h1>🔗 Link Property</h1><button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Investor</label><select id="lInv"><option value="">Select</option>${(invs||[]).map(i=>`<option value="${i.investor_id}">${i.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Property</label><select id="lRoom"><option value="">Select</option>${(window._invRooms||[]).map(r=>`<option value="${r.room_id}">${r.unit_no} — ${r.property_name||''}</option>`).join('')}</select></div>
      <button onclick="saveLink()">💾 Link</button><div id="lErr"></div>
    </div>`, 'investors');
}

async function saveLink() {
  const inv=document.getElementById('lInv').value, room=document.getElementById('lRoom').value;
  if(!inv||!room){document.getElementById('lErr').innerHTML='<div class="error">Both required</div>';return;}
  await sb.from('investor_properties').insert({investor_id:inv,room_id:room});
  renderManageInvestors();
}

// ============ INVESTOR VIEW ============
function filterByRange(bks, range) {
  if(range==='All') return bks;
  const now=new Date(); let start;
  if(range==='Today') start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  else if(range==='Week'){start=new Date(now);start.setDate(now.getDate()-7);}
  else if(range==='Month') start=new Date(now.getFullYear(),now.getMonth(),1);
  else return bks;
  return bks.filter(b=>b.check_in&&new Date(b.check_in)>=start);
}

async function renderInvestorView(range='Month') {
  if(!SESSION.investorId){showError('No property linked. Contact owner.');return;}

  appEl.innerHTML = `<div class="wrap" style="max-width:650px;"><div class="loading">Loading your dashboard...</div></div>`;

  const {data:inv} = await sb.from('investors').select('*').eq('investor_id',SESSION.investorId).single();
  const {data:links} = await sb.from('investor_properties')
    .select('room_id, rooms(unit_no, property_name, nickname, checkin_manager)')
    .eq('investor_id', SESSION.investorId);
  const rids = (links||[]).map(l=>l.room_id);

  const {data:allBk} = rids.length
    ? await sb.from('guest_register').select('booking_id, guest_name, phone, room_id, booking_mode, check_in, check_out, total_amount, rooms(unit_no, nickname)')
        .in('room_id', rids).order('check_in',{ascending:false})
    : {data:[]};

  const bks = filterByRange(allBk||[], range);
  const pm = await getPaidMap(bks.map(b=>b.booking_id));
  const rev = bks.reduce((s,b)=>s+(pm[b.booking_id]||0),0);

  const share = inv?.revenue_share_pct || 70;
  const onRev = bks.filter(b=>b.booking_mode==='Online-Airbnb').reduce((s,b)=>s+(pm[b.booking_id]||0),0);
  const offRev = bks.filter(b=>b.booking_mode!=='Online-Airbnb').reduce((s,b)=>s+(pm[b.booking_id]||0),0);

  // Month options for report
  const now = new Date();
  const months = [];
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({
      val:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      lbl:d.toLocaleString('en-IN',{month:'short',year:'numeric'})
    });
  }

  appEl.innerHTML = `
    <div class="wrap" style="max-width:650px;">

      <!-- Header -->
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:52px;height:52px;object-fit:contain;border-radius:12px;margin-bottom:6px;" />
        <h1>${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName || inv?.name || 'Investor'}</div>
        <div class="badge blue" style="margin:4px 0;">Investor · View Only</div>
        <div style="margin-top:10px;">
          <button class="danger btn-sm" onclick="logout()">🚪 Logout</button>
        </div>
      </div>

      <!-- Period Filter -->
      <div class="card">
        <div class="form-group">
          <label>📅 Period</label>
          <select id="invRange">
            <option value="Today" ${range==='Today'?'selected':''}>Today</option>
            <option value="Week" ${range==='Week'?'selected':''}>Last 7 Days</option>
            <option value="Month" ${range==='Month'?'selected':''}>This Month</option>
            <option value="All" ${range==='All'?'selected':''}>All Time</option>
          </select>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card" style="border-left:4px solid var(--green);">
          <div class="stat-num">${(links||[]).length}</div>
          <div class="stat-label">Properties</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--primary);">
          <div class="stat-num">${bks.length}</div>
          <div class="stat-label">Bookings</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #60a5fa;">
          <div class="stat-num">₹${rev>999?Math.round(rev/1000)+'K':rev}</div>
          <div class="stat-label">Revenue</div>
        </div>
      </div>

      <!-- Revenue Summary -->
      <div class="card">
        <div class="section-title">💰 Revenue Summary (${range})</div>
        <div class="metric-row"><span class="metric-label">Total Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Online (Airbnb)</span><span class="metric-value">₹${onRev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Offline (Direct)</span><span class="metric-value">₹${offRev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Your Share (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${Math.round(rev*share/100).toLocaleString('en-IN')}</span></div>
      </div>

      <!-- My Properties (Read Only) -->
      <div class="card">
        <div class="section-title">🏠 My Properties</div>
        ${(links||[]).map(l=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--border);">
            <div style="font-weight:600;font-size:14px;">${l.rooms?.nickname||l.rooms?.unit_no||'-'}</div>
            <div style="font-size:12px;color:var(--muted);">${l.rooms?.property_name||''}</div>
            ${l.rooms?.checkin_manager ? `<div style="font-size:12px;color:var(--muted);">👨‍💼 Manager: ${l.rooms.checkin_manager}</div>` : ''}
          </div>
        `).join('')||'<div class="sub">No properties assigned</div>'}
      </div>

      <!-- Booking History (Read Only — no edit/delete buttons) -->
      <div class="card">
        <div class="section-title">📅 Booking History (${range})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>Revenue</th></tr></thead>
          <tbody>${bks.map(b=>`<tr>
            <td>${b.guest_name||'-'}</td>
            <td><small>${b.rooms?.nickname||b.rooms?.unit_no||'-'}</small></td>
            <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'Online':'Offline'}</span></td>
            <td>${b.check_in||'-'}</td>
            <td>${b.check_out||'-'}</td>
            <td>₹${(pm[b.booking_id]||0).toLocaleString('en-IN')}</td>
          </tr>`).join('')||'<tr><td colspan="6" class="sub">No bookings in this period</td></tr>'}</tbody>
        </table></div>
      </div>

      <!-- Monthly Reports (Read Only) -->
      <div class="card">
        <div class="section-title">📊 Monthly Reports</div>
        <div class="sub">Select property & month to view detailed report</div>
        ${(links||[]).map(l=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
            <span style="font-weight:600;font-size:13px;">${l.rooms?.nickname||l.rooms?.unit_no||'-'}</span>
            <select onchange="if(this.value)renderInvMonthReport('${SESSION.investorId}','${l.room_id}',this.value)" style="width:auto;padding:6px 10px;font-size:12px;margin:0;">
              <option value="">View Report →</option>
              ${months.map(m=>`<option value="${m.val}">${m.lbl}</option>`).join('')}
            </select>
          </div>
        `).join('')}
      </div>

      <!-- Footer -->
      <div class="card" style="text-align:center;">
        <div style="font-size:11px;color:var(--muted);">
          ${BRAND}<br>
          <small>Investor Dashboard — View Only · No modifications allowed</small>
        </div>
        <button class="danger btn-sm" onclick="logout()" style="margin-top:8px;">🚪 Logout</button>
      </div>

    </div>`;

  document.getElementById('invRange').onchange = e => renderInvestorView(e.target.value);
}

// ============ INVESTOR MONTHLY REPORT (Read-Only for Investor) ============
async function renderInvMonthReport(investorId, roomId, month) {
  // Reuse the main report but in investor wrap (no sidebar)
  const now = new Date();
  const selMonth = month;
  const monthStart = selMonth+'-01';
  const monthEnd = new Date(parseInt(selMonth.split('-')[0]),parseInt(selMonth.split('-')[1]),0).toISOString().slice(0,10);
  const monthLabel = new Date(selMonth+'-01').toLocaleString('en-IN',{month:'long',year:'numeric'});

  const [{data:inv},{data:room},{data:bookings},{data:defaults},{data:expenses},{data:payments}] = await Promise.all([
    sb.from('investors').select('*').eq('investor_id',investorId).single(),
    sb.from('rooms').select('*').eq('room_id',roomId).single(),
    sb.from('guest_register').select('*').eq('room_id',roomId).gte('check_in',monthStart).lte('check_in',monthEnd),
    sb.from('property_default_expenses').select('*').eq('room_id',roomId).order('expense_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',roomId),
    sb.from('payment_history').select('booking_id, amount'),
  ]);

  const share = inv?.revenue_share_pct||70;
  const companyShare = 100-share;
  const bkIds = (bookings||[]).map(b=>b.booking_id);
  const paidMap = {};
  (payments||[]).forEach(p=>{if(bkIds.includes(p.booking_id))paidMap[p.booking_id]=(paidMap[p.booking_id]||0)+(p.amount||0);});

  const calcN = b => b.check_in&&b.check_out?Math.max(Math.round((new Date(b.check_out)-new Date(b.check_in))/864e5),0):0;
  const onBks=(bookings||[]).filter(b=>b.booking_mode==='Online-Airbnb');
  const offBks=(bookings||[]).filter(b=>b.booking_mode!=='Online-Airbnb');
  const onRev=onBks.reduce((s,b)=>s+(paidMap[b.booking_id]||0),0);
  const offRev=offBks.reduce((s,b)=>s+(paidMap[b.booking_id]||0),0);
  const totalRev=onRev+offRev;
  const onN=onBks.reduce((s,b)=>s+calcN(b),0);
  const offN=offBks.reduce((s,b)=>s+calcN(b),0);

  const expMonth=new Date(selMonth+'-01').toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');
  const mExp=(expenses||[]).filter(e=>e.month===expMonth);
  const useDefaults=mExp.length===0;
  const effectiveExp=useDefaults?(defaults||[]).reduce((s,d)=>s+(d.default_amount||0),0):mExp.reduce((s,e)=>s+(e.amount||0),0);
  const profit=totalRev-effectiveExp;
  const invAmt=Math.round(profit*share/100);
  const coAmt=profit-invAmt;

  appEl.innerHTML = `
    <div class="wrap" style="max-width:650px;">
      <div class="card">
        <button class="secondary btn-sm" onclick="renderInvestorView()">← Back to Dashboard</button>
      </div>

      <div class="card" style="background:var(--dark);color:#fff;text-align:center;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.5);">Monthly Investor Report</div>
        <h1 style="color:#fff;margin:4px 0;">${BRAND}</h1>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);">${monthLabel}</div>
      </div>

      <div class="card">
        <div class="section-title">Property</div>
        <div class="metric-row"><span class="metric-label">Property</span><span style="font-weight:600;">${room?.nickname||'-'}</span></div>
        <div class="metric-row"><span class="metric-label">Listing</span><span style="font-size:12px;">${room?.property_name||'-'}</span></div>
        <div class="metric-row"><span class="metric-label">Owner</span><span style="font-weight:600;">${inv?.name||'-'}</span></div>
        <div class="metric-row"><span class="metric-label">Share</span><span>${share}% / ${companyShare}%</span></div>
      </div>

      <div class="card">
        <div class="section-title">💰 Financial Summary</div>
        <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${totalRev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${effectiveExp.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Profit</span><span class="metric-value" style="color:${profit>=0?'var(--green)':'var(--red)'};">₹${profit.toLocaleString('en-IN')}</span></div>
      </div>

      <div class="card" style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.5);margin-bottom:8px;">Your Earnings</div>
        <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
          <span style="color:rgba(255,255,255,0.8);">🏠 ${inv?.name||'Investor'} (${share}%)</span>
          <span class="metric-value" style="color:#4ade80;">₹${invAmt.toLocaleString('en-IN')}</span>
        </div>
        <div class="metric-row" style="border:none;">
          <span style="color:rgba(255,255,255,0.8);">🏢 Company (${companyShare}%)</span>
          <span class="metric-value" style="color:#60a5fa;">₹${coAmt.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div class="card">
        <div class="section-title">📊 Revenue Split</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Source</th><th>Nights</th><th>Revenue</th></tr></thead>
          <tbody>
            <tr><td>Online</td><td>${onN}</td><td>₹${onRev.toLocaleString('en-IN')}</td></tr>
            <tr><td>Offline</td><td>${offN}</td><td>₹${offRev.toLocaleString('en-IN')}</td></tr>
            <tr style="font-weight:700;"><td>Total</td><td>${onN+offN}</td><td>₹${totalRev.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table></div>
      </div>

      <div class="card">
        <div class="section-title">📅 Bookings</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Mode</th><th>In</th><th>Out</th><th>Nights</th><th>₹</th></tr></thead>
          <tbody>${(bookings||[]).map(b=>`<tr>
            <td>${b.guest_name||'-'}</td>
            <td><span class="badge ${b.booking_mode==='Online-Airbnb'?'blue':'yellow'}">${b.booking_mode==='Online-Airbnb'?'On':'Off'}</span></td>
            <td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td>
            <td>${calcN(b)}</td><td>₹${(paidMap[b.booking_id]||0).toLocaleString('en-IN')}</td>
          </tr>`).join('')||'<tr><td colspan="6" class="sub">No bookings</td></tr>'}</tbody>
        </table></div>
      </div>

      <div class="card">
        <div class="section-title">🧾 Expenses</div>
        ${useDefaults?'<div class="sub">Default amounts (not yet finalized)</div>':''}
        <div class="table-wrap"><table>
          <thead><tr><th>Category</th><th>Amount</th></tr></thead>
          <tbody>
            ${useDefaults?
              (defaults||[]).map(d=>`<tr><td>${d.expense_name}</td><td>₹${(d.default_amount||0).toLocaleString('en-IN')}</td></tr>`).join('')
              :mExp.map(e=>`<tr><td>${e.expense_categories?.category_name||'-'}</td><td>₹${(e.amount||0).toLocaleString('en-IN')}</td></tr>`).join('')}
            <tr style="font-weight:700;"><td>Total</td><td>₹${effectiveExp.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table></div>
      </div>

      <div class="card" style="text-align:center;">
        <div style="font-size:11px;color:var(--muted);">
          Prepared By: <strong>NISHA KHAN</strong><br>
          ${BRAND} · ${new Date().toLocaleDateString('en-IN')}
        </div>
        <div class="btn-row" style="justify-content:center;margin-top:8px;">
          <button class="btn-sm" onclick="window.print()">🖨️ Print</button>
          <button class="btn-sm secondary" onclick="renderInvestorView()">← Back</button>
        </div>
      </div>
    </div>`;
}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView() {
  if(!SESSION.empId){appEl.innerHTML=`<div class="wrap"><div class="card"><h1>⚠️ Error</h1><div class="error">Employee ID not set</div><button onclick="logout()">Logout</button></div></div>`;return;}
  const [{data:emp},{data:sal},{data:adv},{data:tasks},{data:att}] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id",SESSION.empId).single(),
    sb.from("salary_tracker").select("salary_due,salary_paid").eq("emp_id",SESSION.empId),
    sb.from("advance_tracker").select("advance_amount,repaid_amount").eq("emp_id",SESSION.empId),
    sb.from("employee_tasks").select("task_description,status").eq("emp_id",SESSION.empId).eq("status","Pending"),
    sb.from("attendance_log").select("status,att_date").eq("emp_id",SESSION.empId),
  ]);
  const pSal=(sal||[]).reduce((s,r)=>s+((r.salary_due||0)-(r.salary_paid||0)),0);
  const pAdv=(adv||[]).reduce((s,r)=>s+((r.advance_amount||0)-(r.repaid_amount||0)),0);
  const cm=new Date().toISOString().slice(0,7);
  const mr=(att||[]).filter(a=>a.att_date?.startsWith(cm));
  const pr=mr.filter(a=>a.status==='Present').length, ab=mr.filter(a=>a.status==='Absent').length;

  appEl.innerHTML = `<div class="wrap">
    <div class="card" style="text-align:center;">
      <img src="assets/logo.png" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-bottom:6px;" />
      <h1>${BRAND}</h1><div class="sub">👋 ${SESSION.displayName}</div>
      <button class="secondary btn-sm" onclick="logout()">🚪 Logout</button>
    </div>
    <div class="card">
      <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value" style="font-size:15px;">${emp?.name||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Role</span><span>${emp?.role||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Salary</span><span class="metric-value">₹${(emp?.monthly_salary||0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Salary Pending</span><span class="metric-value${pSal>0?' warn':''}">₹${pSal.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Advance Due</span><span class="metric-value${pAdv>0?' warn':''}">₹${pAdv.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Present</span><span class="metric-value">${pr}</span></div>
      <div class="metric-row"><span class="metric-label">Absent</span><span class="metric-value${ab>0?' warn':''}">${ab}</span></div>
    </div>
    <div class="card"><div class="section-title">📋 Pending Tasks</div>
      ${(tasks||[]).length===0?'<div class="sub">No pending tasks ✅</div>':
        (tasks||[]).map(t=>`<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join('')}
    </div>
  </div>`;
}

// ============ INVESTOR MONTHLY REPORT ============
async function renderInvestorReport(investorId, roomId, month) {
  renderShell(`<div class="loading">Generating report...</div>`, 'investors');

  // Default to current month
  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthLabel = new Date(selMonth+'-01').toLocaleString('en-IN',{month:'long',year:'numeric'});
  const monthStart = selMonth + '-01';
  const monthEnd = new Date(parseInt(selMonth.split('-')[0]), parseInt(selMonth.split('-')[1]), 0).toISOString().slice(0,10);

  // Fetch all data
  const [{data:inv},{data:room},{data:bookings},{data:defaults},{data:expenses},{data:payments}] = await Promise.all([
    sb.from('investors').select('*').eq('investor_id',investorId).single(),
    sb.from('rooms').select('*').eq('room_id',roomId).single(),
    sb.from('guest_register').select('*').eq('room_id',roomId).gte('check_in',monthStart).lte('check_in',monthEnd),
    sb.from('property_default_expenses').select('*').eq('room_id',roomId).order('expense_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id',roomId),
    sb.from('payment_history').select('booking_id, amount'),
  ]);

  const share = inv?.revenue_share_pct || 70;
  const companyShare = 100 - share;

  // Revenue calculation
  const bkIds = (bookings||[]).map(b=>b.booking_id);
  const paidMap = {};
  (payments||[]).forEach(p => {
    if(bkIds.includes(p.booking_id)) paidMap[p.booking_id] = (paidMap[p.booking_id]||0)+(p.amount||0);
  });

  const onlineBks = (bookings||[]).filter(b=>b.booking_mode==='Online-Airbnb');
  const offlineBks = (bookings||[]).filter(b=>b.booking_mode!=='Online-Airbnb');

  const calcNights = (b) => b.check_in&&b.check_out ? Math.max(Math.round((new Date(b.check_out)-new Date(b.check_in))/864e5),0) : 0;

  const onlineNights = onlineBks.reduce((s,b)=>s+calcNights(b),0);
  const offlineNights = offlineBks.reduce((s,b)=>s+calcNights(b),0);
  const onlineRev = onlineBks.reduce((s,b)=>s+(paidMap[b.booking_id]||0),0);
  const offlineRev = offlineBks.reduce((s,b)=>s+(paidMap[b.booking_id]||0),0);
  const totalRev = onlineRev + offlineRev;
  const totalNights = onlineNights + offlineNights;

  // Expenses — check if monthly expenses already logged
  const expMonth = new Date(selMonth+'-01').toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');
  const monthExpenses = (expenses||[]).filter(e=>e.month===expMonth);
  const totalExp = monthExpenses.reduce((s,e)=>s+(e.amount||0),0);

  // If no expenses logged, use defaults
  const useDefaults = monthExpenses.length === 0;
  const defaultTotal = (defaults||[]).reduce((s,d)=>s+(d.default_amount||0),0);
  const effectiveExp = useDefaults ? defaultTotal : totalExp;

  // Profit & split
  const operatingProfit = totalRev - effectiveExp;
  const investorAmount = Math.round(operatingProfit * share / 100);
  const companyAmount = operatingProfit - investorAmount;

  // Month selector — last 12 months
  const months = [];
  for (let i=0; i<12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const lbl = d.toLocaleString('en-IN',{month:'short',year:'numeric'});
    months.push({val,lbl});
  }

  renderShell(`
    <div class="card">
      <h1>📊 Monthly Investor Report</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>

    <!-- Month Selector -->
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Month</label>
          <select id="rptMonth" onchange="renderInvestorReport('${investorId}','${roomId}',this.value)">
            ${months.map(m=>`<option value="${m.val}" ${m.val===selMonth?'selected':''}>${m.lbl}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          <button class="btn-sm" onclick="window.print()">🖨️ Print / PDF</button>
        </div>
      </div>
    </div>

    <!-- Report Header -->
    <div class="card" style="background:var(--dark);color:#fff;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);">Monthly Investor Earnings Report</div>
      <h1 style="color:#fff;margin:6px 0;">${BRAND}</h1>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);">${monthLabel}</div>
    </div>

    <!-- Property & Investor Info -->
    <div class="card">
      <div class="section-title">Property Overview</div>
      <div class="metric-row"><span class="metric-label">Property Name</span><span style="font-weight:600;">${room?.nickname||room?.unit_no||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Airbnb Listing</span><span style="font-size:12px;">${room?.property_name||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Location</span><span>${room?.address||'Lucknow'}</span></div>
      <div class="metric-row"><span class="metric-label">Property Owner</span><span style="font-weight:600;">${inv?.name||'-'}</span></div>
      <div class="metric-row"><span class="metric-label">Revenue Share</span><span><span class="badge blue">${share}% Investor</span> / <span class="badge yellow">${companyShare}% Company</span></span></div>
      <div class="metric-row"><span class="metric-label">Report Period</span><span>${monthLabel}</span></div>
      <div class="metric-row"><span class="metric-label">Report Date</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>
    </div>

    <!-- Key Financial Metrics -->
    <div class="card">
      <div class="section-title">💰 Key Financial Metrics</div>
      <div class="metric-row"><span class="metric-label">Total Gross Revenue</span><span class="metric-value">₹${totalRev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Total Operating Expenses</span><span class="metric-value warn">₹${effectiveExp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Operating Profit</span><span class="metric-value" style="color:${operatingProfit>=0?'var(--green)':'var(--red)'};">₹${operatingProfit.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Investor Share (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${investorAmount.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">${BRAND} Share (${companyShare}%)</span><span class="metric-value">₹${companyAmount.toLocaleString('en-IN')}</span></div>
    </div>

    <!-- Revenue Breakdown -->
    <div class="card">
      <div class="section-title">📊 Revenue Breakdown</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Source</th><th>Nights</th><th>Revenue</th><th>%</th></tr></thead>
        <tbody>
          <tr><td>Online (Airbnb)</td><td>${onlineNights}</td><td>₹${onlineRev.toLocaleString('en-IN')}</td><td>${totalRev>0?Math.round(onlineRev/totalRev*100):0}%</td></tr>
          <tr><td>Offline (Direct)</td><td>${offlineNights}</td><td>₹${offlineRev.toLocaleString('en-IN')}</td><td>${totalRev>0?Math.round(offlineRev/totalRev*100):0}%</td></tr>
          <tr style="font-weight:700;background:#fafafa;"><td>Total</td><td>${totalNights}</td><td>₹${totalRev.toLocaleString('en-IN')}</td><td>100%</td></tr>
        </tbody>
      </table></div>
    </div>

    <!-- Booking Details -->
    <div class="card">
      <div class="section-title">📅 Booking Details</div>

      ${onlineBks.length ? `
        <div style="font-size:13px;font-weight:600;margin:8px 0 4px;">Online Bookings (Airbnb)</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>In</th><th>Out</th><th>Nights</th><th>Revenue</th></tr></thead>
          <tbody>${onlineBks.map(b=>`<tr>
            <td>${b.guest_name||'-'}</td><td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td>
            <td>${calcNights(b)}</td><td>₹${(paidMap[b.booking_id]||0).toLocaleString('en-IN')}</td>
          </tr>`).join('')}
            <tr style="font-weight:600;background:#fafafa;"><td colspan="3">Total Online</td><td>${onlineNights}</td><td>₹${onlineRev.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table></div>` : '<div class="sub">No online bookings this month</div>'}

      ${offlineBks.length ? `
        <div style="font-size:13px;font-weight:600;margin:12px 0 4px;">Offline / Direct Bookings</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>In</th><th>Out</th><th>Nights</th><th>Revenue</th></tr></thead>
          <tbody>${offlineBks.map(b=>`<tr>
            <td>${b.guest_name||'-'}</td><td>${b.check_in||'-'}</td><td>${b.check_out||'-'}</td>
            <td>${calcNights(b)}</td><td>₹${(paidMap[b.booking_id]||0).toLocaleString('en-IN')}</td>
          </tr>`).join('')}
            <tr style="font-weight:600;background:#fafafa;"><td colspan="3">Total Offline</td><td>${offlineNights}</td><td>₹${offlineRev.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table></div>` : '<div class="sub">No offline bookings this month</div>'}
    </div>

    <!-- Expense Summary -->
    <div class="card">
      <div class="section-title">🧾 Expense Summary (${monthLabel})</div>

      ${useDefaults ? `<div class="success-msg" style="margin-bottom:10px;">
        ℹ️ Is mahine ke expenses abhi log nahi hue — default amounts dikha raha hun.
        <button class="btn-sm" style="margin-left:8px;" onclick="renderExpAutoFill('${investorId}','${roomId}','${selMonth}')">📝 Log This Month's Expenses</button>
      </div>` : ''}

      <div class="table-wrap"><table>
        <thead><tr><th>Category</th><th>Amount</th><th>Type</th></tr></thead>
        <tbody>
          ${useDefaults ?
            (defaults||[]).map(d=>`<tr>
              <td>${d.expense_name}</td>
              <td>₹${(d.default_amount||0).toLocaleString('en-IN')}</td>
              <td><span class="badge ${d.is_fixed?'green':'yellow'}">${d.is_fixed?'Fixed':'Variable'}</span></td>
            </tr>`).join('')
          :
            monthExpenses.map(e=>`<tr>
              <td>${e.expense_categories?.category_name||'-'}</td>
              <td>₹${(e.amount||0).toLocaleString('en-IN')}</td>
              <td>—</td>
            </tr>`).join('')
          }
          <tr style="font-weight:700;background:#fafafa;">
            <td>Total Operating Expenses</td>
            <td>₹${effectiveExp.toLocaleString('en-IN')}</td>
            <td></td>
          </tr>
        </tbody>
      </table></div>
    </div>

    <!-- Profit Distribution -->
    <div class="card" style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.6);margin-bottom:10px;">Profit Distribution — ${monthLabel}</div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span class="metric-label" style="color:rgba(255,255,255,0.8);">Operating Profit</span>
        <span class="metric-value" style="color:#fff;">₹${operatingProfit.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border-color:rgba(255,255,255,0.15);">
        <span class="metric-label" style="color:rgba(255,255,255,0.8);">🏠 ${inv?.name||'Investor'} (${share}%)</span>
        <span class="metric-value" style="color:#4ade80;">₹${investorAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row" style="border:none;">
        <span class="metric-label" style="color:rgba(255,255,255,0.8);">🏢 ${BRAND} (${companyShare}%)</span>
        <span class="metric-value" style="color:#60a5fa;">₹${companyAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="card" style="text-align:center;">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">
                Prepared By: <strong>NISHA KHAN</strong><br>
        Operator: <strong>${BRAND}</strong><br>
        Date: ${new Date().toLocaleDateString('en-IN')}
      </div>
      <div class="btn-row" style="justify-content:center;">
        <button class="btn-sm" onclick="window.print()">🖨️ Print / Save PDF</button>
        <button class="btn-sm secondary" onclick="downloadInvestorCSV('${investorId}','${roomId}','${selMonth}')">⬇️ CSV</button>
        <button class="btn-sm outline" onclick="renderManageInvestors()">← Back</button>
      </div>
    </div>
  `, 'investors');
}

// ============ EXPENSE AUTO-FILL FROM DEFAULTS ============
async function renderExpAutoFill(investorId, roomId, month) {
  renderShell(`<div class="loading">Loading defaults...</div>`, 'investors');

  const {data:defaults} = await sb.from('property_default_expenses').select('*').eq('room_id',roomId).order('expense_name');
  const {data:room} = await sb.from('rooms').select('nickname').eq('room_id',roomId).single();
  const monthLabel = new Date(month+'-01').toLocaleString('en-IN',{month:'short',year:'numeric'}).replace(' ','-');

  let rows = '';
  (defaults||[]).forEach((d,i) => {
    rows += `<tr>
      <td>${d.expense_name}</td>
      <td><input type="number" id="expAmt${i}" value="${d.default_amount||0}" style="width:100px;padding:6px;margin:0;" /></td>
      <td><span class="badge ${d.is_fixed?'green':'yellow'}">${d.is_fixed?'Fixed':'Variable'}</span></td>
    </tr>`;
  });

  renderShell(`
    <div class="card">
      <h1>📝 Log Monthly Expenses</h1>
      <div class="sub">${room?.nickname||roomId} — ${monthLabel}</div>
      <button class="secondary btn-sm" onclick="renderInvestorReport('${investorId}','${roomId}','${month}')">← Back to Report</button>
    </div>
    <div class="card">
      <div class="section-title">Edit amounts (variable expenses change monthly)</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Expense</th><th>Amount ₹</th><th>Type</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <button onclick="saveExpAutoFill('${investorId}','${roomId}','${month}','${monthLabel}')" style="width:100%;margin-top:12px;padding:14px;">
        💾 Save All Expenses for ${monthLabel}
      </button>
      <div id="expFillErr"></div>
    </div>
  `, 'investors');
}

async function saveExpAutoFill(investorId, roomId, month, monthLabel) {
  const {data:defaults} = await sb.from('property_default_expenses').select('*').eq('room_id',roomId).order('expense_name');

  // We need expense categories — create if not exist, or use existing
  for (let i=0; i<(defaults||[]).length; i++) {
    const d = defaults[i];
    const amt = parseFloat(document.getElementById(`expAmt${i}`)?.value) || 0;
    if (amt <= 0) continue;

    // Find or create category
    let catId;
    const {data:existing} = await sb.from('expense_categories').select('category_id').eq('category_name',d.expense_name).single();
    if (existing) {
      catId = existing.category_id;
    } else {
      catId = 'EXP'+Date.now()+i;
      await sb.from('expense_categories').insert({category_id:catId, category_name:d.expense_name, default_monthly_amount:d.default_amount});
    }

    // Insert expense entry
    await sb.from('expenses').insert({
      category_id: catId,
      room_id: roomId,
      month: monthLabel,
      amount: amt,
      entry_date: new Date().toISOString().slice(0,10),
      notes: `Auto-filled for ${month}`
    });
  }

  renderInvestorReport(investorId, roomId, month);
}

// ============ INVESTOR REPORT CSV DOWNLOAD ============
function downloadInvestorCSV(investorId, roomId, month) {
  // Simple CSV from what's on screen
  const tables = document.querySelectorAll('table');
  let csv = `Investor Monthly Report\nProperty: ${roomId}\nMonth: ${month}\n\n`;

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      const line = Array.from(cells).map(c => c.textContent.trim().replace(/,/g,' ')).join(',');
      csv += line + '\n';
    });
    csv += '\n';
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `Investor_Report_${roomId}_${month}.csv`;
  a.click();
}

// ============ AUTO CHECKOUT — Free rooms where checkout <= today ============
// ============ AUTO ROOM STATUS SYNC ============
// Rule:
// - Check-in starts at 2:00 PM
// - Checkout ends at 11:00 AM
// - After checkout => room Free + Dirty
async function autoCheckout() {
  const now = new Date();

  const [{ data: allRooms }, { data: flats }, { data: bookings }] = await Promise.all([
    sb.from('rooms').select('room_id'),
    sb.from('flats_status').select('room_id, status, cleaning_status'),
    sb.from('guest_register').select('booking_id, room_id, guest_name, check_in, check_out')
  ]);

  const flatMap = {};
  (flats || []).forEach(f => { flatMap[f.room_id] = f; });

  const roomIds = (allRooms || []).map(r => r.room_id);
  for (const roomId of roomIds) {
    const currentFlat = flatMap[roomId] || {};
    const roomBookings = (bookings || []).filter(b => b.room_id === roomId);

    // Blocked maintenance ko touch mat karo
    if (currentFlat.status === 'Blocked-Maintenance') continue;

    const activeNow = roomBookings.some(b => isBookingActiveNow(b, now));
    const anyEnded = roomBookings.some(b => hasBookingEnded(b, now));

    let newStatus = currentFlat.status || 'Free';
    let newCleaning = currentFlat.cleaning_status || 'Clean';

    if (activeNow) {
      newStatus = 'Booked';
      // cleaning status ko active booking ke time force nahi kar rahe
    } else {
      newStatus = 'Free';
      if (anyEnded) {
        // room checkout ho chuka hai
        if (newCleaning !== 'In Progress') newCleaning = 'Dirty';
      }
    }

    const needsInsert = !flatMap[roomId];
    const changed =
      currentFlat.status !== newStatus ||
      currentFlat.cleaning_status !== newCleaning;

    if (needsInsert) {
      await sb.from('flats_status').insert({
        room_id: roomId,
        status: newStatus,
        cleaning_status: newCleaning
      });
    } else if (changed) {
      await sb.from('flats_status').update({
        status: newStatus,
        cleaning_status: newCleaning
      }).eq('room_id', roomId);
    }
  }
}


function toggleEditSourceBox() {
  const mode = document.getElementById('bookingMode')?.value;
  const box = document.getElementById('editSourceBox');
  if (box) box.style.display = mode === 'Online-Airbnb' ? 'block' : 'none';
}

// ============ START ============
init();