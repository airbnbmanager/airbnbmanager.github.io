/**
 * Expenses & P&L Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ MAIN EXPENSES VIEW ============
async function renderExpenses() {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');

  const cm = new Date().toISOString().slice(0, 7);
  const ml = new Date()
    .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    .replace(' ', '-');

  const [{ data: cats }, { data: exps }, { data: gs }, { data: rooms }] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('expenses')
      .select('*, expense_categories(category_name), rooms(nickname,unit_no)')
      .order('entry_date', { ascending: false }),
    sb.from('guest_register').select('booking_id, check_in, total_amount'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no')
  ]);

  const pm = await getPaidMap((gs || []).map(g => g.booking_id));
  const inc = (gs || [])
    .filter(g => g.check_in?.startsWith(cm))
    .reduce((s, g) => s + (pm[g.booking_id] || 0), 0);
  const mexp = (exps || [])
    .filter(e => e.month === ml)
    .reduce((s, e) => s + (e.amount || 0), 0);
  const profit = inc - mexp;

  // Store for filters
  window._expCats = cats || [];
  window._expRooms = rooms || [];
  window._allExps = exps || [];
  window._currentML = ml;

  renderShell(`
    <div class="card">
      <h1>💹 Expenses & P&L</h1>
      <div class="sub">${ml}</div>
      <div class="btn-row">
        <button onclick="renderAddExpEntry()">🧾 Log Expense</button>
        <button class="secondary" onclick="renderAddExpCat()">➕ Category</button>
        <button class="secondary" onclick="renderDefaultExpenses()">⚙️ Defaults</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📊 This Month — ${ml}</div>
      <div class="metric-row">
        <span class="metric-label">Income</span>
        <span class="metric-value" style="color:var(--green);">
          ₹${inc.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Expenses</span>
        <span class="metric-value warn">₹${mexp.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Profit</span>
        <span class="metric-value"
          style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};">
          ₹${profit.toLocaleString('en-IN')}
        </span>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔍 Filter Expenses</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Month</label>
          <input type="month" id="expMonthFilter"
            value="${cm}"
            onchange="applyExpenseFilters()" />
        </div>
        <div class="form-group">
          <label>Property</label>
          <select id="expRoomFilter" onchange="applyExpenseFilters()">
            <option value="">All Properties</option>
            ${(rooms || []).map(r =>
              `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="expCatFilter" onchange="applyExpenseFilters()">
            <option value="">All Categories</option>
            ${(cats || []).map(c =>
              `<option value="${c.category_id}">${c.category_name}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    </div>

    <div id="expTableWrap"></div>

    <div class="card">
      <div class="section-title">📂 Categories</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Category</th>
          <th>Default ₹/month</th>
        </tr></thead>
        <tbody>
          ${(cats || []).map(c => `
            <tr>
              <td>${c.category_name}</td>
              <td>₹${(c.default_monthly_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('') || '<tr><td colspan="2" class="sub">None</td></tr>'}
        </tbody>
      </table></div>
    </div>
  `, 'expenses');

  // Render table with all expenses by default
  applyExpenseFilters();
}

// ============ FILTER + TABLE ============
function applyExpenseFilters() {
  const wrap = document.getElementById('expTableWrap');
  if (!wrap) return;

  const monthVal = document.getElementById('expMonthFilter')?.value || '';
  const roomVal  = document.getElementById('expRoomFilter')?.value || '';
  const catVal   = document.getElementById('expCatFilter')?.value || '';

  // Convert YYYY-MM → "Mon-YYYY"
  let monthLabel = '';
  if (monthVal) {
    monthLabel = new Date(monthVal + '-01')
      .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
      .replace(' ', '-');
  }

  let filtered = (window._allExps || []);
  if (monthLabel) filtered = filtered.filter(e => e.month === monthLabel);
  if (roomVal)    filtered = filtered.filter(e => e.room_id === roomVal);
  if (catVal)     filtered = filtered.filter(e => e.category_id === catVal);

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const isO = ['owner','admin'].includes(SESSION.role) || SESSION.role === 'manager';

  wrap.innerHTML = `
    <div class="card">
      <div class="section-title">
        🧾 Entries — ${monthLabel || 'All'}
        <span class="badge red" style="float:right;">
          ₹${total.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Month</th>
          <th>Category</th>
          <th>Property</th>
          <th>Amount</th>
          <th>Date</th>
          <th>Notes</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.length === 0
            ? '<tr><td colspan="7" class="sub" style="text-align:center;">No expenses found</td></tr>'
            : filtered.map(e => `
                <tr>
                  <td style="font-size:12px;">${e.month || '-'}</td>
                  <td>
                    <span class="badge ${getCategoryBadge(e.expense_categories?.category_name)}">
                      ${e.expense_categories?.category_name || '-'}
                    </span>
                  </td>
                  <td style="font-size:12px;">
                    ${e.rooms?.nickname || e.rooms?.unit_no || e.room_id || 'General'}
                  </td>
                  <td style="color:var(--red);font-weight:700;">
                    ₹${(e.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style="font-size:12px;">${e.entry_date || '-'}</td>
                  <td style="font-size:12px;max-width:140px;">
                    ${e.notes || '-'}
                  </td>
                  <td class="table-actions">
                    <button class="btn-sm" onclick="editExpense(${e.id})">✏️</button>
                    <button class="btn-sm danger" onclick="delExpense(${e.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')}
        </tbody>
        ${filtered.length > 0 ? `
        <tfoot>
          <tr style="font-weight:700;background:#fafafa;">
            <td colspan="3">Total</td>
            <td style="color:var(--red);">₹${total.toLocaleString('en-IN')}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>` : ''}
      </table></div>
    </div>
  `;
}

// ============ CATEGORY BADGE COLOR ============
function getCategoryBadge(catName) {
  if (!catName) return 'yellow';
  const n = catName.toLowerCase();
  if (n.includes('salary') || n.includes('wage'))       return 'blue';
  if (n.includes('electric') || n.includes('utility'))  return 'yellow';
  if (n.includes('repair') || n.includes('maintenance'))return 'red';
  if (n.includes('grocery') || n.includes('food'))      return 'green';
  if (n.includes('laundry') || n.includes('wash'))      return 'blue';
  if (n.includes('tax') || n.includes('govt'))          return 'red';
  return 'yellow';
}

// ============ ADD CATEGORY ============
async function renderAddExpCat() {
  renderShell(`
    <div class="card">
      <h1>➕ Add Category</h1>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Category Name *</label>
        <input id="cName" placeholder="e.g. Electricity, Salary, WiFi" />
      </div>
      <div class="form-group">
        <label>Default Monthly ₹</label>
        <input id="cAmt" type="number" placeholder="Optional" />
      </div>
      <button onclick="saveExpCat()" style="width:100%;margin-top:10px;">
        💾 Save Category
      </button>
      <div id="cErr"></div>
    </div>
  `, 'expenses');
}

async function saveExpCat() {
  const _btn = document.querySelector('button[onclick="saveExpCat()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const name = document.getElementById('cName').value.trim();
  if (!name) {
    document.getElementById('cErr').innerHTML =
      '<div class="error">Name required</div>';
    return;
  }
  const amt = parseFloat(document.getElementById('cAmt').value) || null;

  const { error } = await sb.from('expense_categories').insert({
    category_id: 'CAT' + Date.now(),
    category_name: name,
    default_monthly_amount: amt
  });

  if (error) {
    document.getElementById('cErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }
  alert('✅ Category saved!');
  renderExpenses();
}

// ============ LOG EXPENSE ============
async function renderAddExpEntry() {
  const [{ data: cats }, { data: rooms }] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no')
  ]);
  window._expCats = cats || [];

  const ml = new Date()
    .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    .replace(' ', '-');
  const today = new Date().toISOString().slice(0, 10);

  renderShell(`
    <div class="card">
      <h1>🧾 Log Expense</h1>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Category *</label>
        <select id="exCat" onchange="onExpCatChg()">
          <option value="">Select</option>
          ${(cats || []).map(c =>
            `<option value="${c.category_id}">${c.category_name}</option>`
          ).join('')}
        </select>
      </div>
      <div id="exCatInfo" class="sub" style="margin-bottom:8px;"></div>
      <div class="form-group">
        <label>Property</label>
        <select id="exRoom">
          <option value="">General / All</option>
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Month *</label>
          <input id="exMo" value="${ml}" placeholder="e.g. Jun-2025" />
        </div>
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="exAmt" type="number" placeholder="0" />
        </div>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input id="exDate" type="date" value="${today}" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="exNotes" placeholder="Optional details..."></textarea>
      </div>
      <button onclick="saveExpEntry()" style="width:100%;margin-top:10px;">
        💾 Save Expense
      </button>
      <div id="exErr"></div>
    </div>
  `, 'expenses');
}

function onExpCatChg() {
  const c = (window._expCats || [])
    .find(x => x.category_id === document.getElementById('exCat').value);
  if (c?.default_monthly_amount) {
    document.getElementById('exCatInfo').innerHTML =
      `💡 Default: ₹${c.default_monthly_amount.toLocaleString('en-IN')}`;
    document.getElementById('exAmt').value = c.default_monthly_amount;
  } else {
    document.getElementById('exCatInfo').innerHTML = '';
  }
}

async function saveExpEntry() {
  const btn = document.querySelector('button[onclick="saveExpEntry()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const cid    = document.getElementById('exCat').value;
  const mo     = document.getElementById('exMo').value.trim();
  const amt    = parseFloat(document.getElementById('exAmt').value) || 0;
  const roomId = document.getElementById('exRoom').value || null;
  const date   = document.getElementById('exDate').value || null;
  const notes  = document.getElementById('exNotes').value.trim() || null;

  if (!cid || !mo || amt <= 0) {
    document.getElementById('exErr').innerHTML =
      '<div class="error">Category, month & amount required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
    return;
  }

  const { error } = await sb.from('expenses').insert({
    category_id: cid,
    room_id: roomId,
    month: mo,
    amount: amt,
    entry_date: date,
    notes: notes
  });

  if (error) {
    document.getElementById('exErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
    return;
  }

  alert('✅ Expense saved!');
  renderExpenses();
}

// ============ EDIT EXPENSE ============
async function editExpense(id) {
  const [{ data: exp }, { data: cats }, { data: rooms }] = await Promise.all([
    sb.from('expenses').select('*').eq('id', id).single(),
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no')
  ]);

  if (!exp) { alert('Expense not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Expense</h1>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Category *</label>
        <select id="exCat">
          <option value="">Select</option>
          ${(cats || []).map(c =>
            `<option value="${c.category_id}"
              ${c.category_id === exp.category_id ? 'selected' : ''}>
              ${c.category_name}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Property</label>
        <select id="exRoom">
          <option value="">General / All</option>
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}"
              ${r.room_id === exp.room_id ? 'selected' : ''}>
              ${r.nickname || r.unit_no}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Month *</label>
          <input id="exMo" value="${exp.month || ''}" />
        </div>
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="exAmt" type="number" value="${exp.amount || 0}" />
        </div>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input id="exDate" type="date" value="${exp.entry_date || ''}" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="exNotes">${exp.notes || ''}</textarea>
      </div>
      <button onclick="updateExpense(${id})" style="width:100%;margin-top:10px;">
        💾 Update Expense
      </button>
      <div id="exErr"></div>
    </div>
  `, 'expenses');
}

async function updateExpense(id) {
  const cid    = document.getElementById('exCat').value;
  const mo     = document.getElementById('exMo').value.trim();
  const amt    = parseFloat(document.getElementById('exAmt').value) || 0;
  const roomId = document.getElementById('exRoom').value || null;
  const date   = document.getElementById('exDate').value || null;
  const notes  = document.getElementById('exNotes').value.trim() || null;

  if (!cid || !mo || amt <= 0) {
    document.getElementById('exErr').innerHTML =
      '<div class="error">Category, month & amount required</div>';
    return;
  }

  const { error } = await sb.from('expenses').update({
    category_id: cid,
    room_id: roomId,
    month: mo,
    amount: amt,
    entry_date: date,
    notes: notes
  }).eq('id', id);

  if (error) {
    document.getElementById('exErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }

  alert('✅ Expense updated!');
  renderExpenses();
}

// ============ DELETE EXPENSE ============
async function delExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await sb.from('expenses').delete().eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  alert('✅ Deleted');
  renderExpenses();
}

// ============ PROPERTY REPORT ============
async function renderPropertyReport(roomId, range = 'Month') {
  renderShell(`<div class="loading">Loading...</div>`, 'property-report');

  const { data: rooms } = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name')
    .order('unit_no');

  const sel = roomId || rooms?.[0]?.room_id;
  if (!sel) {
    renderShell(
      `<div class="card"><h1>No properties</h1></div>`,
      'property-report'
    );
    return;
  }

  const now = new Date();
  let s, e, label;

  if (range === 'Month') {
    s = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);
    label = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } else if (range === 'Quarter') {
    const q = Math.floor(now.getMonth() / 3);
    s = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
    e = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10);
    label = `Q${q + 1} ${now.getFullYear()}`;
  } else {
    s = `${now.getFullYear()}-01-01`;
    e = `${now.getFullYear()}-12-31`;
    label = `${now.getFullYear()}`;
  }

  const ml = now
    .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    .replace(' ', '-');

  const [{ data: gs }, { data: exs }] = await Promise.all([
    sb.from('guest_register')
      .select('*')
      .eq('room_id', sel)
      .gte('check_in', s)
      .lte('check_in', e),
    sb.from('expenses')
      .select('*, expense_categories(category_name)')
      .eq('room_id', sel)
      .eq('month', ml)
  ]);

  const pm = await getPaidMap((gs || []).map(g => g.booking_id));
  const onBks  = (gs || []).filter(g => g.booking_mode === 'Online-Airbnb');
  const offBks = (gs || []).filter(g => g.booking_mode !== 'Online-Airbnb');
  const onRev  = onBks.reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const offRev = offBks.reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const totRev = onRev + offRev;
  const totExp = (exs || []).reduce((a, ex) => a + (ex.amount || 0), 0);
  const profit = totRev - totExp;
  const room   = rooms.find(r => r.room_id === sel);

  renderShell(`
    <div class="card">
      <h1>🏘️ Property Report</h1>
      <div class="form-group" style="margin-top:8px;">
        <select id="rpRoom">
          ${rooms.map(r =>
            `<option value="${r.room_id}"
              ${r.room_id === sel ? 'selected' : ''}>
              ${r.nickname || r.unit_no}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="btn-row">
        <button
          class="${range === 'Month' ? '' : 'secondary'} btn-sm"
          onclick="renderPropertyReport(document.getElementById('rpRoom').value,'Month')">
          Month
        </button>
        <button
          class="${range === 'Quarter' ? '' : 'secondary'} btn-sm"
          onclick="renderPropertyReport(document.getElementById('rpRoom').value,'Quarter')">
          Quarter
        </button>
        <button
          class="${range === 'Year' ? '' : 'secondary'} btn-sm"
          onclick="renderPropertyReport(document.getElementById('rpRoom').value,'Year')">
          Year
        </button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">${room?.property_name || room?.nickname || ''}</div>
      <div class="sub" style="margin-bottom:12px;">${label}</div>
      <div class="metric-row">
        <span class="metric-label">Total Revenue</span>
        <span class="metric-value">₹${totRev.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Online (Airbnb)</span>
        <span class="metric-value" style="color:var(--blue);">
          ₹${onRev.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Offline (Direct)</span>
        <span class="metric-value" style="color:var(--yellow);">
          ₹${offRev.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Expenses (${ml})</span>
        <span class="metric-value warn">₹${totExp.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Net Profit</span>
        <span class="metric-value"
          style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};">
          ₹${profit.toLocaleString('en-IN')}
        </span>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📋 Bookings — ${label}</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Guest</th><th>Mode</th><th>In</th><th>Out</th><th>₹</th>
        </tr></thead>
        <tbody>
          ${(gs || []).length === 0
            ? '<tr><td colspan="5" class="sub">No bookings</td></tr>'
            : (gs || []).map(g => `
                <tr>
                  <td>${g.guest_name || '-'}</td>
                  <td>
                    <span class="badge ${g.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">
                      ${g.booking_mode === 'Online-Airbnb' ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td style="font-size:12px;">${g.check_in || '-'}</td>
                  <td style="font-size:12px;">${g.check_out || '-'}</td>
                  <td style="color:var(--green);font-weight:600;">
                    ₹${(pm[g.booking_id] || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              `).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">🧾 Expenses — ${ml}</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Category</th><th>Amount</th><th>Date</th><th>Notes</th>
        </tr></thead>
        <tbody>
          ${(exs || []).length === 0
            ? '<tr><td colspan="4" class="sub">No expenses</td></tr>'
            : (exs || []).map(ex => `
                <tr>
                  <td>${ex.expense_categories?.category_name || '-'}</td>
                  <td style="color:var(--red);font-weight:600;">
                    ₹${(ex.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style="font-size:12px;">${ex.entry_date || '-'}</td>
                  <td style="font-size:12px;">${ex.notes || '-'}</td>
                </tr>
              `).join('')}
        </tbody>
      </table></div>
    </div>
  `, 'property-report');

  document.getElementById('rpRoom').onchange = ev =>
    renderPropertyReport(ev.target.value, range);
}

// ============ DEFAULT EXPENSES ============
async function renderDefaultExpenses() {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');

  const [{ data: defaults }, { data: rooms }] = await Promise.all([
    sb.from('property_default_expenses')
      .select('*, rooms(nickname, unit_no)')
      .order('room_id'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id')
  ]);

  // Group by room
  const byRoom = {};
  (defaults || []).forEach(d => {
    const k = d.room_id;
    if (!byRoom[k]) byRoom[k] = { room: d.rooms, items: [] };
    byRoom[k].items.push(d);
  });

  renderShell(`
    <div class="card">
      <h1>⚙️ Default Expenses</h1>
      <div class="sub">
        Per-property monthly defaults.<br>
        Used in investor reports when actuals not logged.
      </div>
      <div class="btn-row">
        <button onclick="renderAddDefaultExpense()">➕ Add Default</button>
        <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
      </div>
    </div>

    ${Object.entries(byRoom).length === 0
      ? `<div class="card"><div class="sub">No defaults configured</div></div>`
      : Object.entries(byRoom).map(([roomId, g]) => `
          <div class="card">
            <div class="section-title">
              🏠 ${g.room?.nickname || g.room?.unit_no || roomId}
              <span class="badge red" style="float:right;">
                ₹${g.items
                  .reduce((s, i) => s + (i.default_amount || 0), 0)
                  .toLocaleString('en-IN')}/mo
              </span>
            </div>
            <div class="table-wrap"><table>
              <thead><tr>
                <th>Expense</th><th>Amount</th><th>Type</th><th>Actions</th>
              </tr></thead>
              <tbody>
                ${g.items.map(item => `
                  <tr>
                    <td>${item.expense_name}</td>
                    <td style="color:var(--red);font-weight:600;">
                      ₹${(item.default_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span class="badge ${item.is_fixed ? 'green' : 'yellow'}">
                        ${item.is_fixed ? 'Fixed' : 'Variable'}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button class="btn-sm"
                        onclick="editDefaultExpense('${item.id}')">✏️</button>
                      <button class="btn-sm danger"
                        onclick="deleteDefaultExpense('${item.id}','${item.expense_name}')">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>
          </div>
        `).join('')}
  `, 'expenses');
}

// ============ ADD DEFAULT EXPENSE ============
async function renderAddDefaultExpense() {
  const { data: rooms } = await sb.from('rooms')
    .select('room_id, nickname, unit_no').order('room_id');

  renderShell(`
    <div class="card">
      <h1>➕ Add Default Expense</h1>
      <button class="secondary btn-sm" onclick="renderDefaultExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Property *</label>
        <select id="defRoom">
          <option value="">Select Property</option>
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Expense Name *</label>
        <input id="defName" placeholder="e.g. Electricity, WiFi, Housekeeping" />
      </div>
      <div class="form-group">
        <label>Default Amount ₹/month *</label>
        <input id="defAmount" type="number" min="0" placeholder="e.g. 3000" />
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="defFixed">
          <option value="true">Fixed (same every month)</option>
          <option value="false">Variable (changes monthly)</option>
        </select>
      </div>
      <button onclick="saveDefaultExpense()" style="width:100%;margin-top:10px;">
        💾 Save Default
      </button>
      <div id="defErr"></div>
    </div>
  `, 'expenses');
}

async function saveDefaultExpense() {
  const _btn = document.querySelector('button[onclick="saveDefaultExpense()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const roomId  = document.getElementById('defRoom').value;
  const name    = document.getElementById('defName').value.trim();
  const amount  = parseFloat(document.getElementById('defAmount').value);
  const isFixed = document.getElementById('defFixed').value === 'true';

  if (!roomId || !name || !amount) {
    document.getElementById('defErr').innerHTML =
      '<div class="error">All fields required</div>';
    return;
  }

  const { error } = await sb.from('property_default_expenses').insert({
    room_id: roomId,
    expense_name: name,
    default_amount: amount,
    is_fixed: isFixed
  });

  if (error) {
    document.getElementById('defErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }
  alert('✅ Default expense added!');
  renderDefaultExpenses();
}

// ============ EDIT DEFAULT EXPENSE ============
async function editDefaultExpense(id) {
  const [{ data: def }, { data: rooms }] = await Promise.all([
    sb.from('property_default_expenses').select('*').eq('id', id).single(),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id')
  ]);

  if (!def) { alert('Not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Default Expense</h1>
      <button class="secondary btn-sm" onclick="renderDefaultExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Property *</label>
        <select id="defRoom">
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}"
              ${r.room_id === def.room_id ? 'selected' : ''}>
              ${r.nickname || r.unit_no}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Expense Name *</label>
        <input id="defName" value="${def.expense_name || ''}" />
      </div>
      <div class="form-group">
        <label>Default Amount ₹/month *</label>
        <input id="defAmount" type="number" value="${def.default_amount || ''}" />
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="defFixed">
          <option value="true"  ${def.is_fixed ? 'selected' : ''}>Fixed</option>
          <option value="false" ${!def.is_fixed ? 'selected' : ''}>Variable</option>
        </select>
      </div>
      <button onclick="updateDefaultExpense('${id}')" style="width:100%;margin-top:10px;">
        💾 Update
      </button>
      <div id="defErr"></div>
    </div>
  `, 'expenses');
}

async function updateDefaultExpense(id) {
  const roomId  = document.getElementById('defRoom').value;
  const name    = document.getElementById('defName').value.trim();
  const amount  = parseFloat(document.getElementById('defAmount').value);
  const isFixed = document.getElementById('defFixed').value === 'true';

  if (!roomId || !name || !amount) {
    document.getElementById('defErr').innerHTML =
      '<div class="error">All fields required</div>';
    return;
  }

  const { error } = await sb.from('property_default_expenses').update({
    room_id: roomId,
    expense_name: name,
    default_amount: amount,
    is_fixed: isFixed
  }).eq('id', id);

  if (error) {
    document.getElementById('defErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }
  alert('✅ Updated!');
  renderDefaultExpenses();
}

// ============ DELETE DEFAULT EXPENSE ============
async function deleteDefaultExpense(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  const { error } = await sb.from('property_default_expenses')
    .delete().eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  alert('✅ Deleted');
  renderDefaultExpenses();
}

// ============ MONTHLY PROPERTY EXPENSE MANAGER ============
async function renderMonthlyExpenses(roomId, month) {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');

  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = new Date(selMonth + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

  // Previous month
  const prevDate = new Date(selMonth + '-01');
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthLabel = prevDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

  const [{ data: rooms }, { data: cats }, { data: defaults }] = await Promise.all([
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('property_default_expenses').select('*')
  ]);

  const selRoom = roomId || rooms?.[0]?.room_id;
  const room = (rooms || []).find(r => r.room_id === selRoom);

  // Load current month expenses for this room
  const { data: currentExps } = await sb.from('expenses')
    .select('*, expense_categories(category_name)')
    .eq('room_id', selRoom)
    .eq('month', monthLabel);

  // Load previous month for auto-copy option
  const { data: prevExps } = await sb.from('expenses')
    .select('*, expense_categories(category_name)')
    .eq('room_id', selRoom)
    .eq('month', prevMonthLabel);

  // Get property defaults
  const roomDefaults = (defaults || []).filter(d => d.room_id === selRoom);

  // Build combined expense list
  const expenseMap = {};

  // Start with defaults
  roomDefaults.forEach(d => {
    expenseMap[d.expense_name] = {
      name: d.expense_name,
      defaultAmount: d.default_amount || 0,
      currentAmount: 0,
      prevAmount: 0,
      currentId: null,
      isFixed: d.is_fixed
    };
  });

  // Add previous month amounts
  (prevExps || []).forEach(e => {
    const catName = e.expense_categories?.category_name || 'Other';
    if (!expenseMap[catName]) {
      expenseMap[catName] = { name: catName, defaultAmount: 0, currentAmount: 0, prevAmount: 0, currentId: null, isFixed: false };
    }
    expenseMap[catName].prevAmount = e.amount || 0;
    expenseMap[catName].categoryId = e.category_id;
  });

  // Add current month amounts (override)
  (currentExps || []).forEach(e => {
    const catName = e.expense_categories?.category_name || 'Other';
    if (!expenseMap[catName]) {
      expenseMap[catName] = { name: catName, defaultAmount: 0, currentAmount: 0, prevAmount: 0, currentId: null, isFixed: false };
    }
    expenseMap[catName].currentAmount = e.amount || 0;
    expenseMap[catName].currentId = e.id;
    expenseMap[catName].categoryId = e.category_id;
  });

  // Add categories that don't exist yet
  (cats || []).forEach(c => {
    if (!expenseMap[c.category_name]) {
      expenseMap[c.category_name] = {
        name: c.category_name,
        defaultAmount: c.default_monthly_amount || 0,
        currentAmount: 0,
        prevAmount: 0,
        currentId: null,
        isFixed: false,
        categoryId: c.category_id
      };
    } else if (!expenseMap[c.category_name].categoryId) {
      expenseMap[c.category_name].categoryId = c.category_id;
    }
  });

  const expList = Object.values(expenseMap);
  const totalCurrent = expList.reduce((s, e) => s + (e.currentAmount || 0), 0);
  const totalPrev = expList.reduce((s, e) => s + (e.prevAmount || 0), 0);
  const totalDefault = expList.reduce((s, e) => s + (e.defaultAmount || 0), 0);

  // Month options (last 12)
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    });
  }

  window._monthlyExpData = { selRoom, selMonth, monthLabel, prevMonthLabel, expList, cats: cats || [] };

  renderShell(`
    <div class="card">
      <h1>📅 Monthly Property Expenses</h1>
      <div class="sub">Simple month-end expense entry per property</div>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back to All</button>
    </div>

    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Property *</label>
          <select onchange="renderMonthlyExpenses(this.value, '${selMonth}')">
            ${(rooms || []).map(r =>
              `<option value="${r.room_id}" ${r.room_id === selRoom ? 'selected' : ''}>${r.nickname || r.unit_no}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Month *</label>
          <select onchange="renderMonthlyExpenses('${selRoom}', this.value)">
            ${months.map(m =>
              `<option value="${m.val}" ${m.val === selMonth ? 'selected' : ''}>${m.lbl}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="btn-row">
        ${(prevExps || []).length > 0 ? `<button class="btn-sm outline" onclick="copyPrevMonthExpenses()">📋 Copy from ${prevMonthLabel}</button>` : ''}
        <button class="btn-sm outline" onclick="applyDefaultExpenses()">⚙️ Apply Defaults</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        🏠 ${room?.nickname || selRoom} — ${monthLabel}
        <span class="badge red" style="float:right;">Total: ₹${totalCurrent.toLocaleString('en-IN')}</span>
      </div>

      <div class="table-wrap"><table>
        <thead><tr>
          <th>Expense</th>
          <th>Default</th>
          <th>${prevMonthLabel}</th>
          <th>Current Month ₹</th>
          <th>Action</th>
        </tr></thead>
        <tbody>
          ${expList.map((e, i) => `
            <tr>
              <td><strong>${e.name}</strong></td>
              <td style="color:var(--muted);font-size:12px;">₹${e.defaultAmount.toLocaleString('en-IN')}</td>
              <td style="color:var(--muted);font-size:12px;">₹${e.prevAmount.toLocaleString('en-IN')}</td>
              <td>
                <input type="number" id="expInput_${i}"
                  value="${e.currentAmount || ''}"
                  placeholder="0"
                  style="width:100%;font-size:13px;padding:6px 8px;"
                  data-cat="${e.categoryId || ''}"
                  data-name="${e.name}"
                  data-id="${e.currentId || ''}" />
              </td>
              <td>
                ${e.prevAmount > 0 && !e.currentAmount ?
                  `<button class="btn-sm outline" onclick="document.getElementById('expInput_${i}').value = ${e.prevAmount}">↺ Prev</button>` :
                  ''}
                ${e.defaultAmount > 0 && !e.currentAmount ?
                  `<button class="btn-sm outline" onclick="document.getElementById('expInput_${i}').value = ${e.defaultAmount}">↺ Default</button>` :
                  ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fafafa;">
            <td>Total</td>
            <td style="color:var(--muted);">₹${totalDefault.toLocaleString('en-IN')}</td>
            <td style="color:var(--muted);">₹${totalPrev.toLocaleString('en-IN')}</td>
            <td style="color:var(--red);">₹${totalCurrent.toLocaleString('en-IN')}</td>
            <td></td>
          </tr>
        </tfoot>
      </table></div>

      <button onclick="saveMonthlyExpenses()" style="width:100%;margin-top:12px;padding:14px;">
        💾 Save All Expenses for ${monthLabel}
      </button>
      <div id="monthlyExpErr"></div>
    </div>

    <div class="card" style="background:#f0f7ff;border-left:4px solid var(--blue);">
      <div class="section-title">💡 How to Use</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>1.</strong> Property + Month select karo</p>
        <p><strong>2.</strong> "Copy from Prev" — pichle mahine ke amounts copy karo</p>
        <p><strong>3.</strong> "Apply Defaults" — property defaults apply karo</p>
        <p><strong>4.</strong> Har expense ka amount enter/edit karo</p>
        <p><strong>5.</strong> "↺ Prev" ya "↺ Default" button se quick fill</p>
        <p><strong>6.</strong> 💾 Save All — sab expenses ek saath save honge</p>
      </div>
    </div>
  `, 'expenses');
}

async function copyPrevMonthExpenses() {
  const d = window._monthlyExpData;
  d.expList.forEach((e, i) => {
    if (e.prevAmount > 0) {
      const input = document.getElementById(`expInput_${i}`);
      if (input) input.value = e.prevAmount;
    }
  });
  alert(`✅ Copied from ${d.prevMonthLabel}`);
}

async function applyDefaultExpenses() {
  const d = window._monthlyExpData;
  d.expList.forEach((e, i) => {
    if (e.defaultAmount > 0) {
      const input = document.getElementById(`expInput_${i}`);
      if (input) input.value = e.defaultAmount;
    }
  });
  alert('✅ Defaults applied');
}

async function saveMonthlyExpenses() {
  const btn = document.querySelector('button[onclick="saveMonthlyExpenses()"]');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const d = window._monthlyExpData;
  const inputs = document.querySelectorAll('input[id^="expInput_"]');

  const errors = [];
  let saved = 0;

  for (const input of inputs) {
    const amount = parseFloat(input.value) || 0;
    const catId = input.dataset.cat;
    const name = input.dataset.name;
    const existingId = input.dataset.id;

    // Skip if no amount and no existing record
    if (amount === 0 && !existingId) continue;

    try {
      if (amount === 0 && existingId) {
        // Delete existing if amount is 0
        await sb.from('expenses').delete().eq('id', existingId);
        saved++;
      } else if (existingId) {
        // Update existing
        await sb.from('expenses').update({
          amount,
          category_id: catId || null,
          month: d.monthLabel,
          room_id: d.selRoom
        }).eq('id', existingId);
        saved++;
      } else if (catId) {
        // Insert new
        await sb.from('expenses').insert({
          category_id: catId,
          room_id: d.selRoom,
          month: d.monthLabel,
          amount,
          entry_date: new Date().toISOString().slice(0, 10),
          notes: `Monthly bulk entry`
        });
        saved++;
      } else {
        errors.push(`${name}: category missing`);
      }
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }

  if (errors.length) {
    document.getElementById('monthlyExpErr').innerHTML =
      `<div class="error">${errors.join('<br>')}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save All Expenses'; }
  } else {
    alert(`✅ ${saved} expenses saved for ${d.monthLabel}`);
    renderMonthlyExpenses(d.selRoom, d.selMonth);
  }
}
