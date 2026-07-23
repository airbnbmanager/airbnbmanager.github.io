/**
 * SOP Module
 * UNIQUE HAVEN HOMES STAY
 */

function renderSOPPage() {
  window._sopPage = window._sopPage || 0;
  renderSOPTab(window._sopPage);
}

function renderSOPTab(page) {
  window._sopPage = page;

  const pages = [
    { icon: '👥', title: 'Team & Roles' },
    { icon: '🔐', title: 'Permissions' },
    { icon: '📋', title: 'Booking Rules' },
    { icon: '💰', title: 'Payments' },
    { icon: '🧹', title: 'Cleaning' },
    { icon: '🧰', title: 'Daily SOP' },
    { icon: '👤', title: 'Check-in' },
    { icon: '🚪', title: 'Check-out' },
    { icon: '💵', title: 'Expenses' },
    { icon: '❌', title: "Don'ts" },
    { icon: '🖥️', title: 'System' },
  ];

  const contents = [

    // PAGE 0 — Team & Roles
    `<div class="card">
      <div class="section-title">👥 Team & Roles</div>
      <div class="metric-row"><span class="metric-label">Mr. Shahanshah</span><span class="badge green">Owner</span></div>
      <div class="metric-row"><span class="metric-label">Mr. Firoz Khan</span><span class="badge green">Owner</span></div>
      <div class="metric-row"><span class="metric-label">Praveen Singh</span><span class="badge blue">Admin & Developer</span></div>
      <div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px;line-height:1.8;">
        📞 <strong>Shahanshah:</strong> 9450055554<br>
        📞 <strong>Firoz:</strong> 8299600709<br>
        🛠️ <strong>Praveen:</strong> System Admin
      </div>
    </div>
    <div class="card">
      <div class="section-title">🏠 Properties</div>
      <div style="font-size:13px;line-height:2;">
        <p>• 15 Properties managed</p>
        <p>• Lucknow, India</p>
        <p>• Online (Airbnb) + Offline (Direct)</p>
        <p>• Each property = unique room_id in system</p>
      </div>
    </div>`,

    // PAGE 1 — Permissions
    `<div class="card">
      <div class="section-title">🔐 Role Permissions</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Role</th><th>Access</th></tr></thead>
        <tbody>
          <tr><td><span class="badge green">Owner</span></td><td>View + Add + Edit ✅ | Delete ❌</td></tr>
          <tr><td><span class="badge blue">Admin</span></td><td>Full Access ✅ (All + Delete)</td></tr>
          <tr><td><span class="badge yellow">Manager</span></td><td>Dashboard + Calendar + Bookings + Flats ✅</td></tr>
          <tr><td><span class="badge blue">Investor</span></td><td>Own property read-only ✅</td></tr>
          <tr><td><span class="badge yellow">CA</span></td><td>Financial reports only ✅</td></tr>
          <tr><td><span class="badge red">Employee</span></td><td>Own tasks + attendance ✅</td></tr>
        </tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="section-title">🔑 Login</div>
      <div style="font-size:13px;line-height:2;">
        <p>• Google Auth — Owners/Admin/CA</p>
        <p>• Email/Password — Staff login</p>
        <p>• Investor login — linked to investor_id</p>
        <p>• Session = profiles table se role decide hota hai</p>
      </div>
    </div>`,

    // PAGE 2 — Booking Rules
    `<div class="card">
      <div class="section-title">📋 Booking Rules</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>✅ <strong>1.</strong> Register = final truth — jo app me hai wahi sahi</p>
        <p>✅ <strong>2.</strong> Actual room save karo — listing room nahi</p>
        <p>✅ <strong>3.</strong> Shift = source listing note me likhо</p>
        <p>✅ <strong>4.</strong> Extension = new booking banao</p>
        <p>✅ <strong>5.</strong> No fake names — real guest name only</p>
        <p>✅ <strong>6.</strong> Same day entry mandatory</p>
        <p>⚠️ <strong>7.</strong> Zero amount = warning — reason note karo</p>
        <p>⚠️ <strong>8.</strong> Overlap check karo before booking</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">⏰ Default Timings</div>
      <div style="font-size:14px;line-height:2.2;">
        <p>🕑 <strong>Check-in:</strong> 2:00 PM</p>
        <p>🕚 <strong>Check-out:</strong> 11:00 AM</p>
        <p>🔄 Early/Late = availability check + owner approval</p>
      </div>
    </div>`,

    // PAGE 3 — Payments
    `<div class="card">
      <div class="section-title">💰 Payment Rules</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>🟢 <strong>Online (Airbnb):</strong> Airbnb payout verify karke enter karo</p>
        <p>🟡 <strong>Offline (Direct):</strong> Register ke hisab se — actual collected amount</p>
        <p>✅ <strong>Partial payment</strong> allowed — balance track hota hai</p>
        <p>✅ <strong>Edit/Delete</strong> — genuine cases me hi karo</p>
        <p>⚠️ <strong>Balance pending</strong> = red me dikhega — followup karo</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">💳 Payment Modes</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>• Cash</p>
        <p>• UPI (PhonePe / GPay / Paytm)</p>
        <p>• Bank Transfer</p>
        <p>• Airbnb Payout (Online only)</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">📊 Colors</div>
      <div style="font-size:13px;line-height:2.2;">
        <p style="color:var(--green);">🟢 Green = Credit / Received / Paid</p>
        <p style="color:var(--red);">🔴 Red = Debit / Due / Balance Pending</p>
      </div>
    </div>`,

    // PAGE 4 — Cleaning
    `<div class="card">
      <div class="section-title">🧹 Cleaning SOP</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>1️⃣ <strong>Checkout hone par:</strong> Status → Free + Dirty (auto)</p>
        <p>2️⃣ <strong>Safai ke baad:</strong> Status → Clean (manual mark)</p>
        <p>3️⃣ <strong>Check-in se pehle:</strong> Confirm Clean hai</p>
        <p>4️⃣ <strong>New booking:</strong> Status → Booked + Clean</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">🧺 Cleaning Checklist</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>☐ Bed sheets + pillow covers change</p>
        <p>☐ Bathroom clean + fresh towels</p>
        <p>☐ Floor mop + dust</p>
        <p>☐ Kitchen — utensils, gas, fridge</p>
        <p>☐ AC filter check</p>
        <p>☐ Windows + doors check</p>
        <p>☐ Inventory check — missing items note</p>
        <p>☐ Garbage disposal</p>
      </div>
    </div>`,

    // PAGE 5 — Daily SOP
    `<div class="card">
      <div class="section-title">🧰 Daily Operations</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>🌅 <strong>Morning:</strong></p>
        <p>• Attendance mark karo</p>
        <p>• Aaj ke checkouts confirm karo</p>
        <p>• Aaj ke checkins ready karo</p>
        <p><br>🌇 <strong>Evening:</strong></p>
        <p>• Payments update karo</p>
        <p>• Cleaning status update karo</p>
        <p>• Koi naya booking register karo</p>
        <p><br>🌙 <strong>Night:</strong></p>
        <p>• Tomorrow ke checkins check karo</p>
        <p>• Pending balances dekho</p>
        <p>• Expenses log karo</p>
      </div>
    </div>`,

    // PAGE 6 — Check-in
    `<div class="card">
      <div class="section-title">👤 Guest Check-in Process</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>1️⃣ Guest ka naam + phone verify karo</p>
        <p>2️⃣ Govt ID collect karo (Aadhar/DL/Passport)</p>
        <p>3️⃣ ID photo app me upload karo</p>
        <p>4️⃣ Room ke baare me brief karo</p>
        <p>5️⃣ Keys hand over karo</p>
        <p>6️⃣ App me booking confirm karo</p>
        <p>7️⃣ Welcome WhatsApp message bhejo</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">📱 Welcome Message</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>• App → Booking → WhatsApp button</p>
        <p>• Property details auto fill hoti hai</p>
        <p>• Map link + caretaker number include hota hai</p>
        <p>• House rules included</p>
      </div>
    </div>`,

    // PAGE 7 — Check-out
    `<div class="card">
      <div class="section-title">🚪 Guest Check-out Process</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>1️⃣ <strong>1 din pehle:</strong> Checkout reminder WhatsApp bhejo</p>
        <p>2️⃣ Keys return confirm karo</p>
        <p>3️⃣ Room inspection karo</p>
        <p>4️⃣ Koi damage = photo lo + note karo</p>
        <p>5️⃣ Pending balance collect karo</p>
        <p>6️⃣ App me payment update karo</p>
        <p>7️⃣ Room status → Dirty mark karo</p>
        <p>8️⃣ Cleaning task assign karo</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">📱 Checkout Reminder</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>• App → Booking → Checkout Reminder button</p>
        <p>• Checkout time + date auto fill</p>
        <p>• Extension offer included</p>
        <p>• Caretaker contact included</p>
      </div>
    </div>`,

    // PAGE 8 — Expenses
    `<div class="card">
      <div class="section-title">💵 Expense Logging</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>✅ <strong>Same day</strong> expense log karo</p>
        <p>✅ <strong>Category</strong> select karo (Electricity, Salary, WiFi...)</p>
        <p>✅ <strong>Property</strong> assign karo jis property ka expense hai</p>
        <p>✅ <strong>Receipt/Bill</strong> photo lo aur note me add karo</p>
        <p>✅ <strong>Month</strong> sahi enter karo</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">📊 Expense Categories</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>• Electricity Bill</p>
        <p>• WiFi / Internet</p>
        <p>• Housekeeping / Cleaning</p>
        <p>• Laundry</p>
        <p>• Maintenance / Repair</p>
        <p>• Salary</p>
        <p>• Grocery / Supplies</p>
        <p>• Miscellaneous</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">🧾 Investor Report</div>
      <div style="font-size:13px;line-height:1.8;">
        <p>• Investors → Report button</p>
        <p>• Revenue - Expenses = Net Profit</p>
        <p>• Investor share % automatically calculate</p>
        <p>• Print button available</p>
      </div>
    </div>`,

    // PAGE 9 — Don'ts
    `<div class="card">
      <div class="section-title">❌ Strictly Prohibited</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>🚫 Ek room me 2 bookings same dates</p>
        <p>🚫 Online aur Offline mix karna</p>
        <p>🚫 Fake names ya fake amounts</p>
        <p>🚫 Random DB changes without approval</p>
        <p>🚫 Guest ID collect kiye bina checkin</p>
        <p>🚫 Payment receive karke app me update na karna</p>
        <p>🚫 Cleaning skip karna between guests</p>
        <p>🚫 Keys guest ko dena caretaker ke bina</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">⚠️ Important Notes</div>
      <div style="font-size:13px;line-height:2.2;">
        <p>• Koi bhi issue = pehle owner ko batao</p>
        <p>• Guest complaint = screenshot lo + report karo</p>
        <p>• Damage = photo + note mandatory</p>
        <p>• Cash handling = same day app me update</p>
      </div>
    </div>`,

    // PAGE 10 — System
    `<div class="card" style="background:var(--dark);color:#fff;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.5);margin-bottom:8px;">System Status</div>
      <div style="font-size:13px;line-height:2;color:rgba(255,255,255,0.9);">
        <p>✅ Google Auth — Active</p>
        <p>✅ Bookings — Working</p>
        <p>✅ Payments — Working</p>
        <p>✅ Calendar — Working</p>
        <p>✅ Investors — Working</p>
        <p>✅ Employees — Working</p>
        <p>✅ Expenses — Working</p>
        <p>✅ Inventory — Working</p>
        <p>✅ WhatsApp — Working</p>
        <p>✅ PWA / Offline — Active</p>
      </div>
    </div>
    <div class="card">
      <div class="section-title">🛠️ Tech Stack</div>
      <div style="font-size:13px;line-height:2;">
        <p>• Frontend: Vanilla JS + HTML + CSS</p>
        <p>• Backend: Supabase (PostgreSQL)</p>
        <p>• Auth: Supabase Google Auth</p>
        <p>• Storage: Supabase Storage (ID proofs)</p>
        <p>• Hosting: GitHub Pages</p>
        <p>• PWA: Service Worker enabled</p>
      </div>
    </div>
    <div class="card" style="text-align:center;">
      <div style="font-size:12px;color:var(--muted);">
        ${BRAND}<br>
        <strong>System by Praveen Singh</strong><br>
        Build ${APP_VERSION} · ${new Date().toLocaleDateString('en-IN')}
      </div>
      <button class="btn-sm" onclick="window.print()" style="margin-top:8px;">🖨️ Print</button>
    </div>`,

  ];

  const tabs = pages.map((p, i) =>
    `<button
      onclick="renderSOPTab(${i})"
      style="
        padding:6px 12px;
        border-radius:20px;
        border:none;
        cursor:pointer;
        font-size:12px;
        font-weight:${i === page ? '700' : '400'};
        background:${i === page ? 'var(--primary)' : 'var(--bg)'};
        color:${i === page ? '#fff' : 'var(--text)'};
        white-space:nowrap;
      ">
      ${p.icon} ${p.title}
    </button>`
  ).join('');

  const prevBtn = page > 0
    ? `<button class="secondary btn-sm" onclick="renderSOPTab(${page - 1})">◀ Prev</button>`
    : `<button class="secondary btn-sm" disabled style="opacity:0.3;">◀ Prev</button>`;

  const nextBtn = page < pages.length - 1
    ? `<button class="btn-sm" onclick="renderSOPTab(${page + 1})">Next ▶</button>`
    : `<button class="btn-sm" disabled style="opacity:0.3;">Next ▶</button>`;

  renderShell(`
    <div class="card">
      <h1>📘 SOP Guide</h1>
      <div class="sub">${BRAND} — Page ${page + 1} of ${pages.length}</div>
    </div>

    <div class="card" style="padding:10px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;overflow-x:auto;padding-bottom:4px;">
        ${tabs}
      </div>
    </div>

    <div class="card" style="padding:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        ${prevBtn}
        <span style="font-size:13px;color:var(--muted);font-weight:600;">
          ${pages[page].icon} ${pages[page].title}
        </span>
        ${nextBtn}
      </div>
    </div>

    ${contents[page]}

    <div class="card" style="padding:10px;">
      <div style="display:flex;justify-content:space-between;">
        ${prevBtn}
        ${nextBtn}
      </div>
    </div>
  `, 'sop');
}
