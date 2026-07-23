/**
 * SOP Module — Complete Guide
 * UNIQUE HAVEN HOMES STAY
 */

function renderSOPPage() {
  window._sopPage = window._sopPage || 0;
  renderSOPTab(window._sopPage);
}

function renderSOPTab(page) {
  window._sopPage = page;

  const pages = [
    { icon: '🏠', title: 'Overview' },
    { icon: '📊', title: 'Dashboard' },
    { icon: '📅', title: 'Booking' },
    { icon: '💰', title: 'Payments' },
    { icon: '🛏️', title: 'Flats Status' },
    { icon: '🏘️', title: 'Properties' },
    { icon: '🕐', title: 'Shifts' },
    { icon: '👥', title: 'Employees' },
    { icon: '🧰', title: 'Tasks' },
    { icon: '📋', title: 'Attendance' },
    { icon: '💰', title: 'Payroll' },
    { icon: '💵', title: 'Advances' },
    { icon: '🧾', title: 'Staff Expenses' },
    { icon: '💹', title: 'Expenses & P&L' },
    { icon: '📦', title: 'Inventory' },
    { icon: '🔧', title: 'Maintenance' },
    { icon: '📱', title: 'WhatsApp' },
    { icon: '🧑‍💼', title: 'Investors' },
    { icon: '⚠️', title: 'Rules & Don\'ts' },
  ];

  const contents = [

    // ============ PAGE 0 — OVERVIEW ============
    `<div class="card">
      <div class="section-title">🏠 System Overview</div>
      <div style="font-size:13px;line-height:1.8;">
        <p><strong>${BRAND}</strong> — Complete property management system.</p>
        <p>Ye guide aapko har module ka <strong>step-by-step</strong> use sikhayega.</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">👥 Team</div>
      <div class="metric-row"><span class="metric-label">Mr. Shahanshah</span><span class="badge green">Owner · 9450055554</span></div>
      <div class="metric-row"><span class="metric-label">Mr. Firoz Khan</span><span class="badge green">Owner · 8299600709</span></div>
      <div class="metric-row"><span class="metric-label">Praveen Singh</span><span class="badge blue">Admin & Developer</span></div>
    </div>

    <div class="card">
      <div class="section-title">🔐 Role Permissions</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Role</th><th>Access</th></tr></thead>
        <tbody>
          <tr><td><span class="badge green">Owner</span></td><td>View + Add + Edit ✅ | Delete ❌</td></tr>
          <tr><td><span class="badge blue">Admin</span></td><td>Full Access ✅</td></tr>
          <tr><td><span class="badge yellow">Manager</span></td><td>Bookings + Flats ✅</td></tr>
          <tr><td><span class="badge blue">Investor</span></td><td>Own property read-only ✅</td></tr>
          <tr><td><span class="badge yellow">CA</span></td><td>Financial reports only ✅</td></tr>
          <tr><td><span class="badge red">Employee</span></td><td>Self view only ✅</td></tr>
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">⏰ Standard Timings</div>
      <div style="font-size:14px;line-height:2.2;">
        <p>🕑 <strong>Check-in:</strong> 2:00 PM</p>
        <p>🕚 <strong>Check-out:</strong> 11:00 AM</p>
        <p>☀️ <strong>Day Shift:</strong> 8:00 AM - 8:00 PM</p>
        <p>🌙 <strong>Night Shift:</strong> 8:00 PM - 8:00 AM</p>
      </div>
    </div>`,

    // ============ PAGE 1 — DASHBOARD ============
    `<div class="card">
      <div class="section-title">📊 Dashboard Kaise Use Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Dashboard</strong> aapko ek jhalak me sab status dikhata hai:</p>
        <p>• 💰 <strong>Today's Revenue</strong> — Aaj kitna paisa aaya</p>
        <p>• 📈 <strong>This Month</strong> — Is mahine ki total kamai</p>
        <p>• 💳 <strong>Pending Balance</strong> — Total unpaid amount</p>
        <p>• 📥 <strong>Check-in Today</strong> — Aaj ke arrivals</p>
        <p>• 📤 <strong>Check-out Today</strong> — Aaj ke departures</p>
        <p>• 🛏️ <strong>Occupied</strong> — Kitne rooms bhare hain</p>
        <p>• ✅ <strong>Ready to Book</strong> — Free + clean rooms</p>
        <p>• 🧹 <strong>Need Cleaning</strong> — Cleaning pending</p>
        <p>• 👥 <strong>Staff Present</strong> — Aaj kitne staff aaye</p>
        <p>• 🧰 <strong>Pending Tasks</strong> — Baaki kaam</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔄 Extended Stays</div>
      <div style="font-size:13px;line-height:2;">
        <p>Ye card dikhata hai jinke checkout date past ka hai but ab bhi ruke hain.</p>
        <p><strong>Action:</strong> Guest se baat karo — ya to extension confirm karo, ya checkout mark karo.</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔁 Room Shifts</div>
      <div style="font-size:13px;line-height:2;">
        <p>Ye card dikhata hai jo guest ek room se doosre me shift hue.</p>
        <p><strong>From → To</strong> format me clear dikhega.</p>
      </div>
    </div>`,

    // ============ PAGE 2 — BOOKING ============
    `<div class="card">
      <div class="section-title">📅 New Booking Kaise Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> Side menu se 📅 <strong>Bookings</strong> click karo</p>
        <p><strong>Step 2:</strong> ➕ <strong>New Booking</strong> button dabao</p>
        <p><strong>Step 3:</strong> Guest ka naam + phone daalo</p>
        <p><strong>Step 4:</strong> Property select karo</p>
        <p><strong>Step 5:</strong> Mode choose karo:</p>
        <p style="margin-left:16px;">🟢 <strong>Online</strong> — Airbnb booking</p>
        <p style="margin-left:16px;">🟡 <strong>Offline</strong> — Direct booking</p>
        <p><strong>Step 6:</strong> Check-in + Check-out date + time</p>
        <p><strong>Step 7:</strong> Total amount daalo (per day rate auto calc)</p>
        <p><strong>Step 8:</strong> Advance amount (agar liya hai)</p>
        <p><strong>Step 9:</strong> Vehicle info (agar car hai)</p>
        <p><strong>Step 10:</strong> ID photos upload — 8 guests tak</p>
        <p><strong>Step 11:</strong> 💾 <strong>Save Booking</strong></p>
        <p><strong>Step 12:</strong> WhatsApp message auto generate hoga — bhejo!</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">✏️ Edit Booking</div>
      <div style="font-size:13px;line-height:2;">
        <p>• Booking list me ✏️ icon click karo</p>
        <p>• Sab fields edit ho sakti hain</p>
        <p>• Purani ID photos preserved rahengi</p>
        <p>• Nayi ID photo add karo ya delete karo</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔄 Extension</div>
      <div style="font-size:13px;line-height:2;">
        <p>Guest extend karna chahta hai to:</p>
        <p>1. Edit booking me jao</p>
        <p>2. ➕ <strong>Extension</strong> button click karo</p>
        <p>3. Naya booking ban jayega automatically</p>
        <p>4. Purana booking closed ho jayega</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">⚡ Quick Checkout</div>
      <div style="font-size:13px;line-height:2;">
        <p>Guest ne early checkout kiya:</p>
        <p>• 📤 <strong>Checkout</strong> button click karo</p>
        <p>• Nights auto calc honge</p>
        <p>• Total auto adjust hoga</p>
      </div>
    </div>`,

    // ============ PAGE 3 — PAYMENTS ============
    `<div class="card">
      <div class="section-title">💰 Payment Log Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> Booking list me 💰 icon click karo</p>
        <p><strong>Step 2:</strong> Amount daalo</p>
        <p><strong>Step 3:</strong> Payment mode select karo:</p>
        <p style="margin-left:16px;">💵 Cash</p>
        <p style="margin-left:16px;">📱 UPI</p>
        <p style="margin-left:16px;">🏦 Bank Transfer</p>
        <p style="margin-left:16px;">🌐 Airbnb Payout</p>
        <p><strong>Step 4:</strong> Date select karo</p>
        <p><strong>Step 5:</strong> Notes optional</p>
        <p><strong>Step 6:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📊 Payment Status Colors</div>
      <div style="font-size:13px;line-height:2;">
        <p>🟢 <strong style="color:var(--green);">Green</strong> = Paid / Received</p>
        <p>🟡 <strong style="color:var(--yellow);">Yellow</strong> = Partial</p>
        <p>🔴 <strong style="color:var(--red);">Red</strong> = Balance Due / Debit</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📝 Payment Rules</div>
      <div style="font-size:13px;line-height:2;">
        <p>✅ Online (Airbnb): Payout amount enter karo</p>
        <p>✅ Offline: Actual collected amount</p>
        <p>✅ Partial payments allowed</p>
        <p>⚠️ Same day me enter karo</p>
        <p>❌ Fake amounts mat daalo</p>
      </div>
    </div>`,

    // ============ PAGE 4 — FLATS STATUS ============
    `<div class="card">
      <div class="section-title">🛏️ Flats Status Manage Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>3 statuses:</strong></p>
        <p>🟢 <strong>Free</strong> — Available for booking</p>
        <p>🔵 <strong>Booked</strong> — Guest ka hai</p>
        <p>🔴 <strong>Blocked</strong> — Maintenance ke liye</p>
        <p><br><strong>3 cleaning statuses:</strong></p>
        <p>✅ <strong>Clean</strong> — Ready for guest</p>
        <p>🧹 <strong>Dirty</strong> — Cleaning pending</p>
        <p>🔄 <strong>In Progress</strong> — Ho rahi hai</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔄 Auto Status Flow</div>
      <div style="font-size:13px;line-height:2;">
        <p>1. Guest checkout hote hi → <strong>Free + Dirty</strong> auto</p>
        <p>2. Safai ke baad → ✅ Manual mark <strong>Clean</strong></p>
        <p>3. Check-in hote hi → <strong>Booked + Clean</strong></p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">⚡ Quick Actions</div>
      <div style="font-size:13px;line-height:2;">
        <p>• 🧹 Dirty se ✅ Clean karne ka button</p>
        <p>• 🔄 In Progress ka option</p>
        <p>• ✏️ Full edit for issues/notes</p>
      </div>
    </div>`,

    // ============ PAGE 5 — PROPERTIES ============
    `<div class="card">
      <div class="section-title">🏘️ Property Add Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🏠 Properties → ➕ Add Property</p>
        <p><strong>Step 2:</strong> Basic info:</p>
        <p style="margin-left:16px;">• Room ID (unique)</p>
        <p style="margin-left:16px;">• Property name (Airbnb listing)</p>
        <p style="margin-left:16px;">• Unit no, Nickname</p>
        <p style="margin-left:16px;">• Max guests</p>
        <p><strong>Step 3:</strong> Contacts:</p>
        <p style="margin-left:16px;">• Caretaker (employee dropdown)</p>
        <p style="margin-left:16px;">• Check-in Manager (employee dropdown)</p>
        <p><strong>Step 4:</strong> Location:</p>
        <p style="margin-left:16px;">• Address, Google Map link</p>
        <p style="margin-left:16px;">• Directions, Landmarks</p>
        <p><strong>Step 5:</strong> Lock type + Key number</p>
        <p><strong>Step 6:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">⚙️ Property Modes</div>
      <div style="font-size:13px;line-height:2;">
        <p>🟢 <strong>On (Listed)</strong> — Bookable</p>
        <p>🔴 <strong>Off (Unlisted)</strong> — Not shown to guests</p>
      </div>
    </div>`,

    // ============ PAGE 6 — SHIFTS ============
    `<div class="card">
      <div class="section-title">🕐 Property Shifts Setup</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Purpose:</strong> Har property pe day/night shift ke contact define karo — WhatsApp me automatic aayenge.</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">➕ Shift Add Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🕐 Shifts click karo</p>
        <p><strong>Step 2:</strong> Property select karo</p>
        <p><strong>Step 3:</strong> ➕ Add Shift</p>
        <p><strong>Step 4:</strong> Employee select karo (sirf assigned employees dikhenge)</p>
        <p><strong>Step 5:</strong> Shift type:</p>
        <p style="margin-left:16px;">☀️ Day (8 AM - 8 PM)</p>
        <p style="margin-left:16px;">🌙 Night (8 PM - 8 AM)</p>
        <p style="margin-left:16px;">🔄 All Day</p>
        <p><strong>Step 6:</strong> Contact role:</p>
        <p style="margin-left:16px;">• Caretaker</p>
        <p style="margin-left:16px;">• Check-in Manager</p>
        <p style="margin-left:16px;">• Manager</p>
        <p><strong>Step 7:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📋 All Properties Overview</div>
      <div style="font-size:13px;line-height:2;">
        <p>Neeche scroll karke sabhi properties ka shift overview dekh sakte ho.</p>
        <p>⚠️ <strong>Properties Without Shifts</strong> section me un properties ki list hoti hai jinme shift set nahi hai.</p>
      </div>
    </div>`,

    // ============ PAGE 7 — EMPLOYEES ============
    `<div class="card">
      <div class="section-title">👥 Employee Add Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 👥 Employees → ➕ Add Employee</p>
        <p><strong>Step 2:</strong> Name + Phone</p>
        <p><strong>Step 3:</strong> Role select karo (dropdown):</p>
        <p style="margin-left:16px;">Caretaker, Check-in Manager, Cleaner, Maid, etc.</p>
        <p><strong>Step 4:</strong> Property Contact Role:</p>
        <p style="margin-left:16px;">Staff / Caretaker / Check-in Manager</p>
        <p><strong>Step 5:</strong> Monthly Salary</p>
        <p><strong>Step 6:</strong> Assigned Properties (multi-select)</p>
        <p><strong>Step 7:</strong> Join date, ID proof</p>
        <p><strong>Step 8:</strong> ID photos upload (front + back)</p>
        <p><strong>Step 9:</strong> Emergency contact</p>
        <p><strong>Step 10:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">💡 Important</div>
      <div style="font-size:13px;line-height:2;">
        <p>• Employee ka naam <strong>WhatsApp messages me use hota hai</strong></p>
        <p>• "Mr." prefix auto lagta hai</p>
        <p>• Assigned property ke Shifts me hi dikhega dropdown me</p>
      </div>
    </div>`,

    // ============ PAGE 8 — TASKS ============
    `<div class="card">
      <div class="section-title">🧰 Task Assign Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🧰 Tasks → ➕ Add Task</p>
        <p><strong>Step 2:</strong> Employee select karo</p>
        <p><strong>Step 3:</strong> Property (agar specific hai)</p>
        <p><strong>Step 4:</strong> Task type:</p>
        <p style="margin-left:16px;">Cleaning, Dusting, Laundry, Maintenance, Check-in, Inventory, etc.</p>
        <p><strong>Step 5:</strong> Priority:</p>
        <p style="margin-left:16px;">🟢 Normal · 🟡 High · 🔴 Urgent</p>
        <p><strong>Step 6:</strong> Description likhо</p>
        <p><strong>Step 7:</strong> Date + Status</p>
        <p><strong>Step 8:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">✅ Task Update</div>
      <div style="font-size:13px;line-height:2;">
        <p>Task complete hone par:</p>
        <p>• ✏️ Edit → Status → <strong>Completed</strong></p>
        <p>• Dashboard me auto update hoga</p>
      </div>
    </div>`,

    // ============ PAGE 9 — ATTENDANCE ============
    `<div class="card">
      <div class="section-title">📋 Attendance Mark Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Roz karna hai!</strong></p>
        <p><strong>Step 1:</strong> 📋 Attendance click karo</p>
        <p><strong>Step 2:</strong> Aaj ki date auto load hogi</p>
        <p><strong>Step 3:</strong> Har employee ke saamne button dikhe:</p>
        <p style="margin-left:16px;">✅ <strong>P</strong> — Present</p>
        <p style="margin-left:16px;">❌ <strong>A</strong> — Absent</p>
        <p style="margin-left:16px;">½ <strong>Half Day</strong></p>
        <p><strong>Step 4:</strong> Click karke mark karo</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📊 Attendance Report</div>
      <div style="font-size:13px;line-height:2;">
        <p>📊 <strong>Attendance Report</strong> me:</p>
        <p>• Monthly summary</p>
        <p>• Present / Absent / Half day count</p>
        <p>• Effective days</p>
        <p>• Salary calculation (per day × days)</p>
        <p>• Deduction if absent</p>
      </div>
    </div>`,

    // ============ PAGE 10 — PAYROLL ============
    `<div class="card">
      <div class="section-title">💰 Salary Record Add Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 💰 Payroll → ➕ Add Record</p>
        <p><strong>Step 2:</strong> Employee select karo</p>
        <p><strong>Step 3:</strong> Month select karo</p>
        <p><strong>Step 4:</strong> Due amount (auto from employee salary)</p>
        <p><strong>Step 5:</strong> Paid amount</p>
        <p><strong>Step 6:</strong> Date + Payment mode</p>
        <p><strong>Step 7:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">👆 Employee Detail Click</div>
      <div style="font-size:13px;line-height:2;">
        <p>Payroll table me employee ke naam pe click karo — <strong>complete detail modal</strong> khulega:</p>
        <p>• Salary pending</p>
        <p>• Advance due</p>
        <p>• Staff expenses</p>
        <p>• Attendance (this month)</p>
        <p>• Pending tasks</p>
        <p>• Complete history</p>
      </div>
    </div>`,

    // ============ PAGE 11 — ADVANCES ============
    `<div class="card">
      <div class="section-title">💵 Advance Dena</div>
      <div style="font-size:13px;line-height:2;">
        <p>Employee ko paisa udhar diya:</p>
        <p><strong>Step 1:</strong> 💵 Advances → ➕ Add</p>
        <p><strong>Step 2:</strong> Employee select karo</p>
        <p><strong>Step 3:</strong> Date + Amount</p>
        <p><strong>Step 4:</strong> Payment mode</p>
        <p><strong>Step 5:</strong> Reason (kyu diya)</p>
        <p><strong>Step 6:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">✅ Advance Repay</div>
      <div style="font-size:13px;line-height:2;">
        <p>Jab employee wapas kare ya salary se katega:</p>
        <p>• ✏️ Edit karo</p>
        <p>• Repaid amount daalo</p>
        <p>• Repaid date set karo</p>
        <p>• Balance auto calc hoga</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📊 Payroll Integration</div>
      <div style="font-size:13px;line-height:2;">
        <p>Advance amount <strong>Payroll table me alag column me dikhta hai</strong> — pata chalega kis employee ka kitna outstanding hai.</p>
      </div>
    </div>`,

    // ============ PAGE 12 — STAFF EXPENSES ============
    `<div class="card">
      <div class="section-title">🧾 Staff Expenses</div>
      <div style="font-size:13px;line-height:2;">
        <p>Employee ne company ke liye kharcha kiya:</p>
        <p><strong>Difference:</strong></p>
        <p>• 💵 <strong>Advance</strong> = Personal loan (wapas aayega)</p>
        <p>• 🧾 <strong>Staff Expense</strong> = Company kharcha (wapas nahi)</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">➕ Log Expense</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🧾 Staff Expenses → ➕ Log Expense</p>
        <p><strong>Step 2:</strong> Employee select karo</p>
        <p><strong>Step 3:</strong> Date + Category:</p>
        <p style="margin-left:16px;">Cleaning Supplies, Grocery, Transport, Maintenance, Laundry, Utilities, Other</p>
        <p><strong>Step 4:</strong> Amount</p>
        <p><strong>Step 5:</strong> Description (kya kharcha kiya)</p>
        <p><strong>Step 6:</strong> Property (agar specific ke liye)</p>
        <p><strong>Step 7:</strong> Paid To (vendor name)</p>
        <p><strong>Step 8:</strong> Payment mode</p>
        <p><strong>Step 9:</strong> 💾 Save</p>
      </div>
    </div>`,

    // ============ PAGE 13 — EXPENSES ============
    `<div class="card">
      <div class="section-title">💹 Expenses & P&L</div>
      <div style="font-size:13px;line-height:2;">
        <p>Monthly income vs expenses ka calculation.</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">➕ Category Add</div>
      <div style="font-size:13px;line-height:2;">
        <p>Pehli baar setup:</p>
        <p><strong>Step 1:</strong> ➕ Category button</p>
        <p><strong>Step 2:</strong> Name (Electricity, WiFi, Rent, etc.)</p>
        <p><strong>Step 3:</strong> Default monthly amount (optional)</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🧾 Log Expense</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🧾 Log Expense</p>
        <p><strong>Step 2:</strong> Category select karo</p>
        <p><strong>Step 3:</strong> Property (agar specific)</p>
        <p><strong>Step 4:</strong> Month, Amount, Date</p>
        <p><strong>Step 5:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">⚙️ Default Expenses</div>
      <div style="font-size:13px;line-height:2;">
        <p>Har property ke fixed monthly expenses set karo:</p>
        <p>• Electricity, WiFi, Salary etc.</p>
        <p>• Investor report me use hote hain</p>
      </div>
    </div>`,

    // ============ PAGE 14 — INVENTORY ============
    `<div class="card">
      <div class="section-title">📦 Inventory Management</div>
      <div style="font-size:13px;line-height:2;">
        <p>Stock tracking of items — bedsheets, toiletries, cleaning supplies, etc.</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">➕ Add Item</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 📦 Inventory → ➕ Add Item</p>
        <p><strong>Step 2:</strong> Item name + Category</p>
        <p><strong>Step 3:</strong> Unit (pcs / kg / liter)</p>
        <p><strong>Step 4:</strong> Reorder level (alert threshold)</p>
        <p><strong>Step 5:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📥 Stock In (Purchase)</div>
      <div style="font-size:13px;line-height:2;">
        <p>Naya stock aaya:</p>
        <p>• 📥 Stock In button</p>
        <p>• Item + Quantity + Cost</p>
        <p>• Purchased by (employee/owner/vendor)</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📤 Stock Out (Used)</div>
      <div style="font-size:13px;line-height:2;">
        <p>Stock use hua:</p>
        <p>• 📤 Stock Out button</p>
        <p>• Purpose select karo:</p>
        <p style="margin-left:16px;">Property Use / Guest Request / Replacement / Staff Personal / Damaged</p>
        <p>• Property + Given To</p>
      </div>
    </div>`,

    // ============ PAGE 15 — MAINTENANCE ============
    `<div class="card">
      <div class="section-title">🔧 Maintenance Log</div>
      <div style="font-size:13px;line-height:2;">
        <p>Repairs, damages, issues track karo.</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">➕ Report Issue</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🔧 Repairs → ➕ Add Issue</p>
        <p><strong>Step 2:</strong> Property select karo</p>
        <p><strong>Step 3:</strong> Issue type:</p>
        <p style="margin-left:16px;">Plumbing, Electrical, Furniture, Appliance, Painting, Cleaning</p>
        <p><strong>Step 4:</strong> Description</p>
        <p><strong>Step 5:</strong> Cost + Status</p>
        <p><strong>Step 6:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">✅ Mark Resolved</div>
      <div style="font-size:13px;line-height:2;">
        <p>Issue fix hone pe:</p>
        <p>• ✏️ Edit</p>
        <p>• Status → <strong>Resolved</strong></p>
        <p>• Resolved date + Payment status</p>
      </div>
    </div>`,

    // ============ PAGE 16 — WHATSAPP ============
    `<div class="card">
      <div class="section-title">📱 WhatsApp Welcome Message</div>
      <div style="font-size:13px;line-height:2;">
        <p>Booking save hote hi auto message generate hota hai.</p>
        <p><strong>Contains:</strong></p>
        <p>• Property name + address</p>
        <p>• Map link + directions</p>
        <p>• Check-in/out timings</p>
        <p>• <strong>Day + Night shift caretaker</strong> auto</p>
        <p>• Vehicle parking instructions (if car)</p>
        <p>• House rules</p>
        <p>• Owner contacts as backup</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📲 Checkout Reminder</div>
      <div style="font-size:13px;line-height:2;">
        <p>Checkout se pehle bhejo:</p>
        <p><strong>Step 1:</strong> Booking list me 🔔 icon (checkout wale din auto highlight)</p>
        <p><strong>Step 2:</strong> Message auto generate</p>
        <p><strong>Step 3:</strong> Guest ko WhatsApp bhejo</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔄 Anytime Send</div>
      <div style="font-size:13px;line-height:2;">
        <p>Booking list me 📱 Share button — kabhi bhi WhatsApp message generate kar sakte ho.</p>
      </div>
    </div>`,

    // ============ PAGE 17 — INVESTORS ============
    `<div class="card">
      <div class="section-title">🧑‍💼 Investor Add Karein</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> 🧑‍💼 Investors → ➕ Add Investor</p>
        <p><strong>Step 2:</strong> Name + Phone + Email</p>
        <p><strong>Step 3:</strong> Revenue share % (default 70%)</p>
        <p><strong>Step 4:</strong> Assign properties (multi-select)</p>
        <p><strong>Step 5:</strong> 💾 Save</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📊 Investor Report</div>
      <div style="font-size:13px;line-height:2;">
        <p>📊 icon click karke:</p>
        <p>• Monthly revenue breakdown</p>
        <p>• Online vs Offline income</p>
        <p>• Expenses (actual or default)</p>
        <p>• Net profit calculation</p>
        <p>• Investor share auto calc</p>
        <p>• Print/PDF option</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔗 Link/Unlink Property</div>
      <div style="font-size:13px;line-height:2;">
        <p>• 🔗 Link Property button</p>
        <p>• Investor + Property select</p>
        <p>• Mapping table me dikhega</p>
        <p>• 🗑️ Remove karke unlink</p>
      </div>
    </div>`,

    // ============ PAGE 18 — RULES & DON'TS ============
    `<div class="card" style="border-left:4px solid var(--red);">
      <div class="section-title" style="color:var(--red);">❌ Strictly Prohibited</div>
      <div style="font-size:13px;line-height:2;">
        <p>🚫 Ek room me 2 bookings same dates</p>
        <p>🚫 Online aur Offline mix karna</p>
        <p>🚫 Fake names ya fake amounts</p>
        <p>🚫 Random DB changes</p>
        <p>🚫 Guest ID collect kiye bina checkin</p>
        <p>🚫 Payment receive karke app me update na karna</p>
        <p>🚫 Cleaning skip karna between guests</p>
        <p>🚫 Keys guest ko dena caretaker ke bina</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">⚠️ Important Notes</div>
      <div style="font-size:13px;line-height:2;">
        <p>• Koi bhi issue = pehle owner ko batao</p>
        <p>• Guest complaint = screenshot + report</p>
        <p>• Damage = photo + note mandatory</p>
        <p>• Cash handling = same day app me update</p>
        <p>• Sensitive info kabhi share mat karo</p>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🎨 Color Coding</div>
      <div style="font-size:13px;line-height:2;">
        <p style="color:var(--green);">🟢 <strong>Green</strong> = Credit / Received / Paid / Success</p>
        <p style="color:var(--red);">🔴 <strong>Red</strong> = Debit / Due / Balance / Error / Alert</p>
        <p style="color:var(--yellow);">🟡 <strong>Yellow</strong> = Partial / Warning / Pending</p>
        <p style="color:var(--blue);">🔵 <strong>Blue</strong> = Info / Booked / Online</p>
      </div>
    </div>

    <div class="card" style="text-align:center;background:var(--dark);color:#fff;">
      <div style="font-size:12px;color:rgba(255,255,255,0.6);">${BRAND}</div>
      <div style="margin:8px 0;">
        <strong style="color:#fff;">System by Praveen Singh</strong><br>
        <small style="color:rgba(255,255,255,0.6);">Build ${APP_VERSION} · ${new Date().toLocaleDateString('en-IN')}</small>
      </div>
      <button class="btn-sm" onclick="window.print()">🖨️ Print SOP</button>
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
