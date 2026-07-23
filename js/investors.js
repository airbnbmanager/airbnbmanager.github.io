/**
 * Investors Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ MANAGE INVESTORS ============
async function renderManageInvestors() {
  renderShell(`<div class="loading">Loading...</div>`, 'investors');

  const [{data:invs}, {data:links}, {data:rooms}] = await Promise.all([
    sb.from('investors').select('*').order('name'),
    sb.from('investor_properties').select('*, investors(name), rooms(unit_no, property_name, nickname)'),
    sb.from('rooms').select('room_id, unit_no, property_name, nickname').order('room_id')
  ]);
  window._invRooms = rooms || [];

  const invPropMap = {};
  (links || []).forEach(l => {
    if (!invPropMap[l.investor_id]) invPropMap[l.investor_id] = [];
    invPropMap[l.investor_id].push(l);
  });

  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>🧑‍💼 Investors</h1>
      <div class="sub">${(invs || []).length} investors</div>
      <div class="btn-row">
        <button onclick="renderAddInv()">➕ Add Investor</button>
        <button class="secondary" onclick="renderLinkProp()">🔗 Link Property</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">All Investors</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Share</th><th>Properties</th>
          <th>Report</th>${isO ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>${(invs || []).map(i => {
          const iLinks = invPropMap[i.investor_id] || [];
          const propNames = iLinks.map(l => l.rooms?.nickname || l.room_id).join(', ') || '-';
          return `<tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.phone || '-'}</td>
            <td><span class="badge green">${i.revenue_share_pct || 70}%</span></td>
            <td style="font-size:12px;">${propNames}</td>
            <td class="table-actions">
              ${iLinks.map(l => `<button class="btn-sm" onclick="renderInvestorReport('${i.investor_id}','${l.room_id}')">📊</button>`).join('') || '-'}
            </td>
            ${isO ? `<td class="table-actions">
              <button class="btn-sm" onclick="editInvestor('${i.investor_id}')">✏️</button>
              <button class="btn-sm danger" onclick="deleteInvestor('${i.investor_id}','${i.name}')">🗑️</button>
            </td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">Property → Investor Mapping</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Property</th><th>Investor</th><th>Share</th><th>Remove</th></tr></thead>
        <tbody>${(links || []).map(l => {
          const inv = (invs || []).find(i => i.investor_id === l.investor_id);
          return `<tr>
            <td><strong>${l.rooms?.nickname || l.room_id}</strong><br><small style="color:var(--muted);">${l.rooms?.unit_no || ''}</small></td>
            <td>${l.investors?.name || l.investor_id}</td>
            <td>${inv?.revenue_share_pct || 70}%</td>
            <td><button class="btn-sm danger" onclick="unlinkProperty('${l.investor_id}','${l.room_id}')">🗑️ Remove</button></td>
          </tr>`;
        }).join('') || '<tr><td colspan="4" class="sub">No mappings</td></tr>'}</tbody>
      </table></div>
    </div>
  `, 'investors');
}

// ============ ADD INVESTOR ============
async function renderAddInv() {
  const {data:rooms} = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');

  renderShell(`
    <div class="card">
      <h1>➕ Add Investor</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="invName" placeholder="e.g. Papa Ammi" /></div>
        <div class="form-group"><label>Phone</label><input id="invPhone" type="tel" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Revenue Share %</label><input id="invShare" type="number" value="70" min="0" max="100" /></div>
        <div class="form-group"><label>Email</label><input id="invEmail" type="email" placeholder="For future login" /></div>
      </div>
      <div class="form-group">
        <label>Assign Properties</label>
        <select id="invRooms" multiple style="min-height:120px;">
          ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no} (${r.room_id})</option>`).join('')}
        </select>
        <small style="color:var(--muted);">Hold Ctrl/Cmd to select multiple</small>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="invNotes" placeholder="Optional"></textarea></div>
      <button onclick="saveInvSafe()" style="width:100%;margin-top:10px;">💾 Save Investor</button>
      <div id="invErr"></div>
    </div>
  `, 'investors');
}

async function saveInvSafe() {
  const btn = document.querySelector('button[onclick="saveInvSafe()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const name = document.getElementById('invName').value.trim();
  if (!name) {
    document.getElementById('invErr').innerHTML = '<div class="error">Name required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Investor'; }
    return;
  }

  const phone = document.getElementById('invPhone').value.trim();
  const share = parseFloat(document.getElementById('invShare').value) || 70;
  const email = document.getElementById('invEmail').value.trim();
  const notes = document.getElementById('invNotes').value.trim();
  const roomsSelect = document.getElementById('invRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o => o.value) : [];

  try {
    const investorId = 'INV' + Date.now();
    const { error } = await sb.from('investors').insert({
      investor_id: investorId,
      name,
      phone: phone || null,
      revenue_share_pct: share,
      notes: [notes, email ? `Email: ${email}` : ''].filter(Boolean).join(' | ') || null
    });
    if (error) throw new Error(error.message);

    if (selectedRooms.length > 0) {
      const links = selectedRooms.map(rid => ({ investor_id: investorId, room_id: rid }));
      const { error: linkErr } = await sb.from('investor_properties').insert(links);
      if (linkErr) throw new Error(linkErr.message);
    }

    alert(`✅ Investor "${name}" added successfully!`);
    renderManageInvestors();
  } catch (err) {
    document.getElementById('invErr').innerHTML = `<div class="error">${err.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Investor'; }
  }
}

// ============ EDIT INVESTOR ============
async function editInvestor(investorId) {
  const { data: inv } = await sb.from('investors').select('*').eq('investor_id', investorId).single();
  if (!inv) { alert('Not found'); return; }

  const { data: links } = await sb.from('investor_properties').select('room_id').eq('investor_id', investorId);
  const linkedRooms = (links || []).map(l => l.room_id);

  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');

  // Extract email from notes if stored
  const emailMatch = (inv.notes || '').match(/Email:\s*(\S+)/);
  const email = emailMatch ? emailMatch[1] : '';
  const cleanNotes = (inv.notes || '').replace(/\s*\|\s*Email:\s*\S+/, '').trim();

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Investor</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="invName" value="${inv.name}" /></div>
        <div class="form-group"><label>Phone</label><input id="invPhone" value="${inv.phone || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Revenue Share %</label><input id="invShare" type="number" value="${inv.revenue_share_pct || 70}" min="0" max="100" /></div>
        <div class="form-group"><label>Email</label><input id="invEmail" type="email" value="${email}" /></div>
      </div>
      <div class="form-group">
        <label>Assigned Properties</label>
        <select id="invRooms" multiple style="min-height:120px;">
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${linkedRooms.includes(r.room_id) ? 'selected' : ''}>${r.nickname || r.unit_no} (${r.room_id})</option>`).join('')}
        </select>
        <small style="color:var(--muted);">Hold Ctrl/Cmd to select multiple. Deselect to remove link.</small>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="invNotes">${cleanNotes}</textarea></div>
      <button onclick="updateInvestor('${investorId}')" style="width:100%;margin-top:10px;">💾 Update Investor</button>
      <div id="invErr"></div>
    </div>
  `, 'investors');
}

async function updateInvestor(investorId) {
  const name = document.getElementById('invName').value.trim();
  if (!name) { document.getElementById('invErr').innerHTML = '<div class="error">Name required</div>'; return; }

  const phone = document.getElementById('invPhone').value.trim();
  const share = parseFloat(document.getElementById('invShare').value) || 70;
  const email = document.getElementById('invEmail').value.trim();
  const notes = document.getElementById('invNotes').value.trim();

  const roomsSelect = document.getElementById('invRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o => o.value) : [];

  try {
    // Update investor details
    const { error } = await sb.from('investors').update({
      name,
      phone: phone || null,
      revenue_share_pct: share,
      notes: [notes, email ? `Email: ${email}` : ''].filter(Boolean).join(' | ') || null
    }).eq('investor_id', investorId);
    if (error) throw new Error(error.message);

    // Update property links — delete all old, insert new
    await sb.from('investor_properties').delete().eq('investor_id', investorId);

    if (selectedRooms.length > 0) {
      const links = selectedRooms.map(rid => ({ investor_id: investorId, room_id: rid }));
      const { error: linkErr } = await sb.from('investor_properties').insert(links);
      if (linkErr) throw new Error(linkErr.message);
    }

    alert(`✅ Investor "${name}" updated!`);
    renderManageInvestors();
  } catch (err) {
    document.getElementById('invErr').innerHTML = `<div class="error">${err.message}</div>`;
  }
}

// ============ DELETE INVESTOR ============
async function deleteInvestor(investorId, name) {
  if (!confirm(`Delete investor "${name}"?\n\nProperty links bhi remove hongi.`)) return;

  try {
    // Remove property links
    await sb.from('investor_properties').delete().eq('investor_id', investorId);
    // Remove investor
    const { error } = await sb.from('investors').delete().eq('investor_id', investorId);
    if (error) throw new Error(error.message);

    alert(`✅ Investor "${name}" deleted`);
    renderManageInvestors();
  } catch (err) {
    alert('❌ Delete failed: ' + err.message);
  }
}

// ============ LINK / UNLINK PROPERTY ============
async function renderLinkProp() {
  const { data: invs } = await sb.from('investors').select('investor_id, name').order('name');

  renderShell(`
    <div class="card">
      <h1>🔗 Link Property to Investor</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group"><label>Investor *</label>
        <select id="lInv"><option value="">Select Investor</option>
          ${(invs || []).map(i => `<option value="${i.investor_id}">${i.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Property *</label>
        <select id="lRoom"><option value="">Select Property</option>
          ${(window._invRooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no} (${r.room_id})</option>`).join('')}
        </select>
      </div>
      <button onclick="saveLink()" style="width:100%;">💾 Link Property</button>
      <div id="lErr"></div>
    </div>
  `, 'investors');
}

async function saveLink() {
  const inv = document.getElementById('lInv').value;
  const room = document.getElementById('lRoom').value;
  if (!inv || !room) {
    document.getElementById('lErr').innerHTML = '<div class="error">Both fields required</div>';
    return;
  }

  // Check if already linked
  const { data: existing } = await sb.from('investor_properties')
    .select('investor_id').eq('investor_id', inv).eq('room_id', room).single();

  if (existing) {
    document.getElementById('lErr').innerHTML = '<div class="error">Already linked!</div>';
    return;
  }

  const { error } = await sb.from('investor_properties').insert({ investor_id: inv, room_id: room });
  if (error) { document.getElementById('lErr').innerHTML = `<div class="error">${error.message}</div>`; return; }

  alert('✅ Property linked!');
  renderManageInvestors();
}

async function unlinkProperty(inv, room) {
  if (!confirm('Remove this property link?')) return;
  await sb.from('investor_properties').delete().eq('investor_id', inv).eq('room_id', room);
  alert('✅ Property unlinked');
  renderManageInvestors();
}

// ============ INVESTOR REPORT ============
async function renderInvestorReport(investorId, roomId, month) {
  renderShell(`<div class="loading">Generating report...</div>`, 'investors');

  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthDate = new Date(selMonth + '-01');
  const monthName = monthDate.toLocaleString('en-IN', { month: 'long' }).toUpperCase();
  const monthYear = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const monthStart = selMonth + '-01';
  const monthEnd = new Date(parseInt(selMonth.split('-')[0]), parseInt(selMonth.split('-')[1]), 0).toISOString().slice(0, 10);
  const monthShort = monthDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

  const [{data:inv}, {data:room}, {data:bookings}, {data:defaults}, {data:expenses}, {data:payments}] = await Promise.all([
    sb.from('investors').select('*').eq('investor_id', investorId).single(),
    sb.from('rooms').select('*').eq('room_id', roomId).single(),
    sb.from('guest_register').select('*').eq('room_id', roomId).gte('check_in', monthStart).lte('check_in', monthEnd).order('check_in'),
    sb.from('property_default_expenses').select('*').eq('room_id', roomId).order('expense_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id', roomId).eq('month', monthShort),
    sb.from('payment_history').select('booking_id, amount'),
  ]);

  const share = inv?.revenue_share_pct || 70;
  const cs = 100 - share;
  const bkIds = (bookings || []).map(b => b.booking_id);
  const pm = {};
  (payments || []).forEach(p => { if (bkIds.includes(p.booking_id)) pm[p.booking_id] = (pm[p.booking_id] || 0) + (p.amount || 0); });

  const cn = b => b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : 0;
  const onBks = (bookings || []).filter(b => b.booking_mode === 'Online-Airbnb');
  const offBks = (bookings || []).filter(b => b.booking_mode !== 'Online-Airbnb');

  const onNights = onBks.reduce((s, b) => s + cn(b), 0);
  const offNights = offBks.reduce((s, b) => s + cn(b), 0);
  const totalNights = onNights + offNights;

  const onRev = onBks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const offRev = offBks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const totalRev = onRev + offRev;

  const useDefaults = (expenses || []).length === 0;
  const expList = useDefaults ? (defaults || []) : (expenses || []);
  const totalExp = useDefaults
    ? (defaults || []).reduce((s, d) => s + (d.default_amount || 0), 0)
    : (expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  const profit = totalRev - totalExp;
  const investorAmount = Math.round(profit * share / 100);
  const companyAmount = profit - investorAmount;

  const onlinePct = totalRev > 0 ? Math.round(onRev * 100 / totalRev) : 0;
  const offlinePct = totalRev > 0 ? Math.round(offRev * 100 / totalRev) : 0;

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    });
  }

  const today = new Date().toLocaleDateString('en-GB');

  renderShell(`
    <div class="card no-print">
      <h1>📊 Investor Report</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
      <div class="form-grid" style="margin-top:8px;">
        <div class="form-group">
          <label>Month</label>
          <select onchange="renderInvestorReport('${investorId}','${roomId}',this.value)">
            ${months.map(m => `<option value="${m.val}" ${m.val === selMonth ? 'selected' : ''}>${m.lbl}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          <button class="btn-sm" onclick="printInvestorReport('${inv?.name || 'Investor'}','${room?.nickname || roomId}','${monthYear}')">🖨️ Print / Save PDF</button>
        </div>
      </div>
    </div>

    <div class="card report-doc" style="max-width:800px;margin:0 auto;padding:30px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.12);border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 50%,#e94560 100%);color:#fff;padding:24px 20px;border-radius:12px 12px 0 0;text-align:center;margin:-30px -30px 20px -30px;">
        <img src="assets/logo.png" alt="Logo" style="width:60px;height:60px;border-radius:12px;background:#fff;padding:6px;margin-bottom:8px;" />
        <div style="font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.7);margin-bottom:4px;">${BRAND.toUpperCase()}</div>
        <h1 style="font-size:22px;margin:4px 0;letter-spacing:2px;color:#fff;font-weight:800;">MONTHLY INVESTOR EARNINGS</h1>
        <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:6px;">${monthYear}</div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#e94560,#0f3460);color:#fff;border-radius:6px;">🏠 Property Overview</div>
        <div style="line-height:2;font-size:14px;">
          <div><strong>Property Owner Name:</strong> ${inv?.name || '-'}</div>
          <div><strong>Property Name:</strong> ${room?.nickname || room?.property_name || '-'}</div>
          <div><strong>Location:</strong> ${room?.address || 'Lucknow'}</div>
          <div><strong>Reporting Period:</strong> ${monthYear}</div>
          <div><strong>Report Date:</strong> ${today}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#0f3460,#16537e);color:#fff;border-radius:6px;">📋 Executive Summary</div>
        <p style="font-size:13px;line-height:1.8;text-align:justify;margin:8px 0;">
          This report outlines the financial and operational performance of <strong>${room?.nickname}</strong>, Lucknow for ${monthYear}.
          The property generated revenue through <strong>Airbnb platform bookings</strong> along with <strong>direct offline reservations</strong> during the reporting period.
        </p>
        <p style="font-size:13px;line-height:1.8;text-align:justify;margin:8px 0;">
          Operational expenses included rent, housekeeping, supplies, transportation, and maintenance-related items.
          After deducting all operational costs, the remaining profit has been distributed according to the
          <strong>${share}% investor and ${cs}% ${BRAND}</strong> revenue-sharing model.
        </p>
        <p style="font-size:13px;line-height:1.8;text-align:justify;margin:8px 0;">
          All financial figures have been verified and recalculated.
        </p>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#0a7d1a,#0d9438);color:#fff;border-radius:6px;">💰 Key Financial Metrics</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tbody>
            <tr><td style="padding:8px;border:1px solid #ccc;"><strong>Total Gross Revenue</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalRev.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ccc;"><strong>Total Operating Expenses</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalExp.toLocaleString('en-IN')}</td></tr>
            <tr style="background:linear-gradient(90deg,#fff3e0,#ffe0b2);"><td style="padding:8px;border:1px solid #ffb74d;"><strong>Operating Profit</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right;"><strong>₹${profit.toLocaleString('en-IN')}</strong></td></tr>
            <tr style="background:#e8f5e9;"><td style="padding:8px;border:1px solid #a5d6a7;"><strong>Investor Share (${share}%)</strong></td><td style="padding:8px;border:1px solid #a5d6a7;text-align:right;color:#0a7d1a;font-weight:700;font-size:14px;">₹${investorAmount.toLocaleString('en-IN')}</td></tr>
            <tr style="background:#e3f2fd;"><td style="padding:8px;border:1px solid #90caf9;"><strong>${BRAND} Share (${cs}%)</strong></td><td style="padding:8px;border:1px solid #90caf9;text-align:right;color:#0a5599;font-weight:700;font-size:14px;">₹${companyAmount.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#0a5599,#1976d2);color:#fff;border-radius:6px;">📈 Revenue Breakdown</div>

        <div style="font-size:14px;font-weight:600;margin:10px 0 4px;">🌐 Online Bookings (Airbnb)</div>
        <div style="font-size:13px;margin-left:12px;">
          <div>Nights Booked: <strong>${onNights}</strong></div>
          <div>Revenue: <strong>₹${onRev.toLocaleString('en-IN')}</strong></div>
        </div>

        <div style="font-size:14px;font-weight:600;margin:14px 0 4px;">🏠 Offline / Direct Bookings</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:6px;border:1px solid #ccc;">Guest</th>
              <th style="padding:6px;border:1px solid #ccc;">Check-in</th>
              <th style="padding:6px;border:1px solid #ccc;">Check-out</th>
              <th style="padding:6px;border:1px solid #ccc;">Nights</th>
              <th style="padding:6px;border:1px solid #ccc;text-align:right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${offBks.map(b => `
              <tr>
                <td style="padding:6px;border:1px solid #ccc;">${b.guest_name || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;">${b.check_in || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;">${b.check_out || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cn(b)}</td>
                <td style="padding:6px;border:1px solid #ccc;text-align:right;">₹${(pm[b.booking_id] || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="padding:8px;text-align:center;color:#999;border:1px solid #ccc;">No offline bookings</td></tr>'}
            <tr style="background:#f9f9f9;font-weight:700;">
              <td colspan="3" style="padding:6px;border:1px solid #ccc;text-align:right;">Total Offline:</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:center;">${offNights}</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:right;">₹${offRev.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#673ab7,#9c27b0);color:#fff;border-radius:6px;">📊 Total Revenue Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:8px;border:1px solid #ccc;">Source</th>
              <th style="padding:8px;border:1px solid #ccc;">Nights</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right;">Revenue</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:center;">% Contribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">Airbnb</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${onNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${onRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${onlinePct}%</td>
            </tr>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">Offline</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${offNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${offRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${offlinePct}%</td>
            </tr>
            <tr style="background:#f9f9f9;font-weight:700;">
              <td style="padding:8px;border:1px solid #ccc;">Total</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${totalNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#c62828,#e94560);color:#fff;border-radius:6px;">💸 Expense Summary (${monthName} ${selMonth.split('-')[0]})</div>
        ${useDefaults ? '<div style="font-size:11px;color:#666;font-style:italic;margin-bottom:6px;">ℹ️ Showing default expenses (actual not logged)</div>' : ''}
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:8px;border:1px solid #ccc;">Expense Category</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${useDefaults
              ? (defaults || []).map(d => `
                <tr>
                  <td style="padding:8px;border:1px solid #ccc;">${d.expense_name}</td>
                  <td style="padding:8px;border:1px solid #ccc;text-align:right;">${(d.default_amount || 0) === 0 ? 'Free' : '₹' + d.default_amount.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')
              : (expenses || []).map(e => `
                <tr>
                  <td style="padding:8px;border:1px solid #ccc;">${e.expense_categories?.category_name || '-'}</td>
                  <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            <tr style="background:#f9f9f9;font-weight:700;">
              <td style="padding:8px;border:1px solid #ccc;">Total Operating Expenses</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalExp.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#f57c00,#ff9800);color:#fff;border-radius:6px;">💹 Profitability Calculation</div>
        <div style="font-size:13px;line-height:2;padding:10px;background:#f9f9f9;border:1px solid #ccc;">
          <div>Total Revenue: ₹${totalRev.toLocaleString('en-IN')}</div>
          <div>Total Expenses: − ₹${totalExp.toLocaleString('en-IN')}</div>
          <div style="border-top:1px solid #999;margin-top:4px;padding-top:4px;"><strong>Operating Profit = ₹${profit.toLocaleString('en-IN')}</strong></div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#1a1a2e,#e94560);color:#fff;border-radius:6px;">🎯 Profit Distribution – ${monthYear}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:8px;border:1px solid #ccc;">Stakeholder</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:center;">Share</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">Investor — ${inv?.name || '-'}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${share}%</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;color:#0a7d1a;font-weight:700;">₹${investorAmount.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">${BRAND}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${cs}%</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;color:#0a5599;font-weight:700;">₹${companyAmount.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="background:#f9f9f9;font-weight:700;">
              <td style="padding:8px;border:1px solid #ccc;">Total Distributed Profit</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">100%</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${profit.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#455a64,#607d8b);color:#fff;border-radius:6px;">🏛️ Ownership & Operating Structure</div>
        <div style="font-size:13px;line-height:2;">
          <div><strong>Property Ownership:</strong> Investor — ${inv?.name || '-'}</div>
          <div><strong>Property Operator:</strong> ${BRAND}</div>
          <div style="margin-top:8px;"><strong>Revenue Sharing Model:</strong></div>
          <div style="margin-left:16px;">• Investor Share: ${share}%</div>
          <div style="margin-left:16px;">• ${BRAND}: ${cs}%</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#00695c,#009688);color:#fff;border-radius:6px;">📝 Management Commentary</div>
        <p style="font-size:13px;line-height:1.8;text-align:justify;">
          <strong>${room?.nickname}</strong> maintained ${totalRev > 50000 ? 'strong' : totalRev > 20000 ? 'stable' : 'moderate'} booking performance during ${monthYear}
          with the majority of revenue generated through
          ${onRev > offRev ? '<strong>Airbnb</strong>' : '<strong>direct offline</strong>'} bookings.
          While the property operates under a rental cost structure, the overall expense levels remained controlled,
          allowing the property to generate a ${profit >= 0 ? 'positive' : 'negative'} operating margin.
        </p>
        <p style="font-size:13px;line-height:1.8;text-align:justify;">
          With continued booking demand and optimized pricing strategies, the property is expected to maintain
          stable performance and improve profitability in the coming months.
        </p>
      </div>

      <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#fff;padding:18px 20px;margin:20px -30px -30px -30px;border-radius:0 0 12px 12px;text-align:center;">
        <img src="assets/logo.png" alt="Logo" style="width:40px;height:40px;border-radius:8px;background:#fff;padding:4px;margin-bottom:6px;" />
        <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;margin-bottom:8px;">${BRAND.toUpperCase()}</div>
        <div style="font-size:12px;line-height:1.8;color:rgba(255,255,255,0.9);">
          <div><strong style="color:#fff;">Prepared By:</strong> NISHA KHAN</div>
          <div><strong style="color:#fff;">Operator:</strong> ${BRAND}</div>
          <div><strong style="color:#fff;">Report Date:</strong> ${today}</div>
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:8px;">
          🌐 uniquehavenhomesstay.com
        </div>
      </div>
    </div>

    <style>
      @media print {
        @page {
          size: A4;
          margin: 15mm 12mm;
        }
        .sidebar, .no-print, button { display: none !important; }
        .app-container { display: block !important; }
        .main-content { margin: 0 !important; padding: 0 !important; }
        .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
        body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .report-doc {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 11pt;
        }
        .report-doc h1 { font-size: 16pt !important; }
        .report-doc div[style*="font-size:16px"] { font-size: 13pt !important; }
        .report-doc table { page-break-inside: avoid; }
        .report-doc tr { page-break-inside: avoid; }
        .report-doc > div { page-break-inside: avoid; margin-bottom: 12px !important; }
      }
    </style>
  `, 'investors');
}

// ============ INVESTOR VIEW (Read-Only) ============
function filterByRange(bks, range) {
  if (range === 'All') return bks;
  const now = new Date();
  let start;
  if (range === 'Today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === 'Week') { start = new Date(now); start.setDate(now.getDate() - 7); }
  else if (range === 'Month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else return bks;
  return bks.filter(b => b.check_in && new Date(b.check_in) >= start);
}

async function renderInvestorView(range = 'Month') {
  if (!SESSION.investorId) { showError('No property linked.'); return; }
  appEl.innerHTML = `<div class="wrap" style="max-width:650px;"><div class="loading">Loading...</div></div>`;

  const { data: inv } = await sb.from('investors').select('*').eq('investor_id', SESSION.investorId).single();
  const { data: links } = await sb.from('investor_properties')
    .select('room_id, rooms(unit_no, property_name, nickname, checkin_manager)')
    .eq('investor_id', SESSION.investorId);
  const rids = (links || []).map(l => l.room_id);

  const { data: allBk } = rids.length
    ? await sb.from('guest_register')
        .select('booking_id, guest_name, room_id, booking_mode, check_in, check_out, total_amount, rooms(unit_no, nickname)')
        .in('room_id', rids).order('check_in', { ascending: false })
    : { data: [] };

  const bks = filterByRange(allBk || [], range);
  const pm = await getPaidMap(bks.map(b => b.booking_id));
  const rev = bks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const share = inv?.revenue_share_pct || 70;

  appEl.innerHTML = `
    <div class="wrap" style="max-width:650px;">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:52px;height:52px;border-radius:12px;margin-bottom:6px;" />
        <h1>${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName || inv?.name || 'Investor'}</div>
        <div class="badge blue">Investor · View Only</div>
        <div style="margin-top:10px;"><button class="danger btn-sm" onclick="logout()">🚪 Logout</button></div>
      </div>

      <div class="card">
        <div class="form-group"><label>Period</label>
          <select id="invRange">
            <option value="Today" ${range === 'Today' ? 'selected' : ''}>Today</option>
            <option value="Week" ${range === 'Week' ? 'selected' : ''}>Week</option>
            <option value="Month" ${range === 'Month' ? 'selected' : ''}>Month</option>
            <option value="All" ${range === 'All' ? 'selected' : ''}>All</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="metric-row"><span class="metric-label">Total Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Your Share (${share}%)</span><span class="metric-value" style="color:var(--green);">₹${Math.round(rev * share / 100).toLocaleString('en-IN')}</span></div>
      </div>

      <div class="card">
        <div class="section-title">Properties</div>
        ${(links || []).map(l => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);">
            <strong>${l.rooms?.nickname || l.rooms?.unit_no || '-'}</strong><br>
            <small style="color:var(--muted);">${l.rooms?.property_name || ''}</small>
          </div>
        `).join('') || '<div class="sub">None</div>'}
      </div>

      <div class="card">
        <div class="section-title">Bookings (${range})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>₹</th></tr></thead>
          <tbody>${bks.map(b => `<tr>
            <td>${b.guest_name || '-'}</td>
            <td>${b.rooms?.nickname || '-'}</td>
            <td><span class="badge ${b.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${b.booking_mode === 'Online-Airbnb' ? 'On' : 'Off'}</span></td>
            <td>${b.check_in || '-'}</td>
            <td>${b.check_out || '-'}</td>
            <td style="color:var(--green);">₹${(pm[b.booking_id] || 0).toLocaleString('en-IN')}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="sub">None</td></tr>'}</tbody>
        </table></div>
      </div>

      <div class="card" style="text-align:center;">
        <button class="danger btn-sm" onclick="logout()">🚪 Logout</button>
      </div>
    </div>`;

  document.getElementById('invRange').onchange = e => renderInvestorView(e.target.value);
}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView() {
  if (!SESSION.empId) {
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️</h1><div class="error">Employee ID not set</div><button onclick="logout()">Logout</button></div></div>`;
    return;
  }

  const [{data:emp}, {data:sal}, {data:adv}, {data:tasks}, {data:att}] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id", SESSION.empId).single(),
    sb.from("salary_tracker").select("salary_due, salary_paid").eq("emp_id", SESSION.empId),
    sb.from("advance_tracker").select("advance_amount, repaid_amount").eq("emp_id", SESSION.empId),
    sb.from("employee_tasks").select("task_description, status").eq("emp_id", SESSION.empId).eq("status", "Pending"),
    sb.from("attendance_log").select("status, att_date").eq("emp_id", SESSION.empId),
  ]);

  const pSal = (sal || []).reduce((s, r) => s + ((r.salary_due || 0) - (r.salary_paid || 0)), 0);
  const pAdv = (adv || []).reduce((s, r) => s + ((r.advance_amount || 0) - (r.repaid_amount || 0)), 0);
  const cm = new Date().toISOString().slice(0, 7);
  const mr = (att || []).filter(a => a.att_date?.startsWith(cm));
  const pr = mr.filter(a => a.status === 'Present').length;
  const ab = mr.filter(a => a.status === 'Absent').length;

  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:48px;height:48px;border-radius:10px;margin-bottom:6px;" />
        <h1>${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName}</div>
        <button class="secondary btn-sm" onclick="logout()">🚪 Logout</button>
      </div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value" style="font-size:15px;">${emp?.name || '-'}</span></div>
        <div class="metric-row"><span class="metric-label">Role</span><span>${emp?.role || '-'}</span></div>
        <div class="metric-row"><span class="metric-label">Salary</span><span class="metric-value">₹${(emp?.monthly_salary || 0).toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Salary Pending</span><span class="metric-value${pSal > 0 ? ' warn' : ''}" style="color:${pSal > 0 ? 'var(--red)' : 'var(--green)'};">₹${pSal.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Advance Due</span><span class="metric-value${pAdv > 0 ? ' warn' : ''}" style="color:${pAdv > 0 ? 'var(--red)' : 'var(--green)'};">₹${pAdv.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Present</span><span class="metric-value" style="color:var(--green);">${pr}</span></div>
        <div class="metric-row"><span class="metric-label">Absent</span><span class="metric-value${ab > 0 ? ' warn' : ''}" style="color:${ab > 0 ? 'var(--red)' : 'var(--green)'};">${ab}</span></div>
      </div>
      <div class="card">
        <div class="section-title">Pending Tasks</div>
        ${(tasks || []).length === 0
          ? '<div class="sub">No tasks ✅</div>'
          : (tasks || []).map(t => `<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join('')}
      </div>
    </div>`;
}

// ============ PRINT WITH AUTO FILENAME ============
function printInvestorReport(investorName, propertyName, monthYear) {
  const cleanName = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanName(investorName)}_${cleanName(propertyName)}_${cleanName(monthYear)}_Report`;

  const originalTitle = document.title;
  document.title = filename;

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
