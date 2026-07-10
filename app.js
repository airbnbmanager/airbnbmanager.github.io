const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const appEl = document.getElementById("app");

async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      renderLogin();
    } else {
      renderLoading();
      await routeByRole(session.user.id);
    }
  } catch (err) {
    appEl.innerHTML = `
      <div class="wrap">
        <div class="card">
          <h1>⚠️ Setup abhi baaki hai</h1>
          <div class="sub">
            config.js mein Supabase URL/key abhi placeholder hain, ya galat hain.
            README.md ke Step 1-2 follow karo: Supabase project banao, schema.sql
            run karo, phir Project Settings → API se URL aur anon key copy karke
            config.js mein daalo.
          </div>
          <div class="error">${err.message || err}</div>
        </div>
      </div>`;
  }
}

function renderLoading() {
  appEl.innerHTML = `<div class="wrap"><div class="card">Loading...</div></div>`;
}

function renderLogin() {
  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <h1>🏡 [Aapka Business Name]</h1>
        <div class="sub">Login karo apna email/password se</div>
        <input id="email" type="email" placeholder="Email" />
        <input id="password" type="password" placeholder="Password" />
        <button id="loginBtn">Login</button>
        <div class="error" id="err"></div>
      </div>
    </div>`;
  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById("err").textContent = error.message;
      return;
    }
    renderLoading();
    await routeByRole(data.user.id);
  };
}

async function routeByRole(userId) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, emp_id")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
      appEl.innerHTML = `<div class="wrap"><div class="card">
        Profile nahi mila. Owner se contact karo (Supabase 'profiles' table mein entry chahiye).
        <div class="error">${error ? error.message : ""}</div>
        </div></div>`;
      return;
    }

    if (profile.role === "owner") {
      await renderOwnerDashboard();
    } else {
      await renderEmployeeView(profile.emp_id);
    }
  } catch (err) {
    appEl.innerHTML = `<div class="wrap"><div class="card">
      <h1>⚠️ Kuch galat hua</h1>
      <div class="error">${err.message || err}</div>
      </div></div>`;
  }
}

function logoutBar() {
  return `<div class="logout"><a id="logoutLink">Logout</a></div>`;
}

function bindLogout() {
  document.getElementById("logoutLink").onclick = async () => {
    await sb.auth.signOut();
    renderLogin();
  };
}

// ---------------- OWNER DASHBOARD ----------------
async function renderOwnerDashboard() {
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

  const totalRooms = rooms.data?.length || 0;
  const notBookable = rooms.data?.filter(r => r.bookable === false).length || 0;
  const free = flats.data?.filter(f => f.status === "Free").length || 0;
  const booked = flats.data?.filter(f => f.status === "Booked").length || 0;
  const dirty = flats.data?.filter(f => f.cleaning_status === "Dirty").length || 0;
  const totalEmp = employees.data?.length || 0;

  const pendingSalary = (salary.data || []).reduce((s, r) => s + ((r.salary_due || 0) - (r.salary_paid || 0)), 0);
  const pendingAdvance = (advance.data || []).reduce((s, r) => s + ((r.advance_amount || 0) - (r.repaid_amount || 0)), 0);
  const guestBalance = (guests.data || []).reduce((s, r) => s + ((r.total_amount || 0) - (r.advance_paid || 0)), 0);

  const today = new Date().toISOString().slice(0, 10);
  const presentToday = (attendance.data || []).filter(a => a.att_date === today && a.status === "Present").length;
  const absentToday = (attendance.data || []).filter(a => a.att_date === today && a.status === "Absent").length;
  const pendingTasks = (tasks.data || []).filter(t => t.status === "Pending").length;

  const rows = [
    ["Total Rooms", totalRooms, false],
    ["Rooms Not Bookable (Out of Service)", notBookable, notBookable > 0],
    ["Rooms Free Now", free, false],
    ["Rooms Booked Now", booked, false],
    ["Rooms Dirty / Need Cleaning", dirty, dirty > 0],
    ["Total Employees", totalEmp, false],
    ["Total Pending Salary (₹)", pendingSalary.toLocaleString("en-IN"), pendingSalary > 0],
    ["Total Advance Outstanding (₹)", pendingAdvance.toLocaleString("en-IN"), pendingAdvance > 0],
    ["Total Guest Balance Due (₹)", guestBalance.toLocaleString("en-IN"), guestBalance > 0],
    ["Present Today", presentToday, false],
    ["Absent Today", absentToday, absentToday > 0],
    ["Pending Employee Tasks", pendingTasks, pendingTasks > 0],
  ];

  appEl.innerHTML = `
    <div class="wrap">
      ${logoutBar()}
      <div class="card">
        <h1>🏡 [Aapka Business Name]</h1>
        <div class="sub">Owner Dashboard — live data</div>
      </div>
      <div class="card">
        ${rows.map(([label, val, warn]) => `
          <div class="metric-row">
            <span class="metric-label">${label}</span>
            <span class="metric-value ${warn ? "warn" : ""}">${val}</span>
          </div>`).join("")}
      </div>
      <div class="card sub">
        Naya data (rooms, employees, bookings) add/edit karne ke liye abhi Supabase
        Table Editor use karo (Project → Table Editor). Full add/edit forms yahan
        agla step mein add kiye ja sakte hain.
      </div>
    </div>`;
  bindLogout();
}

// ---------------- EMPLOYEE SELF-VIEW ----------------
async function renderEmployeeView(empId) {
  if (!empId) {
    appEl.innerHTML = `<div class="wrap"><div class="card">
      Aapka Emp ID profile mein set nahi hai. Owner se contact karo.
      </div></div>`;
    return;
  }

  const [emp, salary, advance, tasks, attendance] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id", empId).single(),
    sb.from("salary_tracker").select("salary_due, salary_paid").eq("emp_id", empId),
    sb.from("advance_tracker").select("advance_amount, repaid_amount").eq("emp_id", empId),
    sb.from("employee_tasks").select("task_description, status").eq("emp_id", empId).eq("status", "Pending"),
    sb.from("attendance_log").select("status, att_date").eq("emp_id", empId),
  ]);

  const pendingSalary = (salary.data || []).reduce((s, r) => s + ((r.salary_due || 0) - (r.salary_paid || 0)), 0);
  const pendingAdvance = (advance.data || []).reduce((s, r) => s + ((r.advance_amount || 0) - (r.repaid_amount || 0)), 0);

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const monthRows = (attendance.data || []).filter(a => a.att_date?.startsWith(thisMonth));
  const present = monthRows.filter(a => a.status === "Present").length;
  const absent = monthRows.filter(a => a.status === "Absent").length;

  const name = emp.data?.name || "-";
  const role = emp.data?.role || "-";
  const monthlySalary = emp.data?.monthly_salary || 0;

  appEl.innerHTML = `
    <div class="wrap">
      ${logoutBar()}
      <div class="card">
        <h1>🏡 [Aapka Business Name]</h1>
        <div class="sub">Employee Self-View</div>
      </div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value">${name}</span></div>
        <div class="metric-row"><span class="metric-label">Role</span><span class="metric-value">${role}</span></div>
        <div class="metric-row"><span class="metric-label">Monthly Salary (₹)</span><span class="metric-value">${monthlySalary.toLocaleString("en-IN")}</span></div>
        <div class="metric-row"><span class="metric-label">Salary Pending (₹)</span><span class="metric-value ${pendingSalary > 0 ? "warn" : ""}">${pendingSalary.toLocaleString("en-IN")}</span></div>
        <div class="metric-row"><span class="metric-label">Advance Pending (₹)</span><span class="metric-value ${pendingAdvance > 0 ? "warn" : ""}">${pendingAdvance.toLocaleString("en-IN")}</span></div>
        <div class="metric-row"><span class="metric-label">This Month Present</span><span class="metric-value">${present}</span></div>
        <div class="metric-row"><span class="metric-label">This Month Absent</span><span class="metric-value ${absent > 0 ? "warn" : ""}">${absent}</span></div>
      </div>
      <div class="card">
        <div class="sub" style="margin-bottom:8px;">Pending Tasks</div>
        ${(tasks.data || []).length === 0
          ? `<div class="metric-row"><span class="metric-label">Koi pending task nahi ✅</span></div>`
          : tasks.data.map(t => `<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join("")}
      </div>
    </div>`;
  bindLogout();
}

init();
