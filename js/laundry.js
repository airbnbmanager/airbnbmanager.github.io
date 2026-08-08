// ═══════════════════════════════════════════════════════════
// 🧺 LAUNDRY TRACKER MODULE
// ═══════════════════════════════════════════════════════════

window.renderLaundry = async function() {
  if (!['owner', 'admin', 'moderator', 'developer', 'manager'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'laundry');
    return;
  }
  
  renderShell('<div class="loading">Loading...</div>', 'laundry');
  
  const currentMonth = window._laundryMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const monthEnd = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().slice(0, 10);
  
  const [{ data: records }, { data: items }, { data: rooms }, { data: recItems }] = await Promise.all([
    sb.from('laundry_records').select('*').gte('record_date', monthStart).lte('record_date', monthEnd).order('record_date', { ascending: false }),
    sb.from('laundry_items').select('*').eq('active', true).order('item_name'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no'),
    sb.from('laundry_record_items').select('*, laundry_items(item_name)')
  ]);
  
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r.nickname || r.unit_no; });
  
  const itemsByRecord = {};
  (recItems || []).forEach(ri => {
    if (!itemsByRecord[ri.record_id]) itemsByRecord[ri.record_id] = [];
    itemsByRecord[ri.record_id].push(ri);
  });
  
  const totalAmount = (records || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPaid = (records || []).reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const totalDue = totalAmount - totalPaid;
  
  // Item-wise consumption
  const itemStats = {};
  (recItems || []).forEach(ri => {
    const recDate = (records || []).find(r => r.id === ri.record_id)?.record_date;
    if (!recDate || recDate < monthStart || recDate > monthEnd) return;
    const name = ri.laundry_items?.item_name || 'Unknown';
    if (!itemStats[name]) itemStats[name] = { qty: 0, amount: 0 };
    itemStats[name].qty += Number(ri.quantity || 0);
    itemStats[name].amount += Number(ri.subtotal || 0);
  });
  
  const itemStatsHTML = Object.entries(itemStats)
    .sort((a,b) => b[1].amount - a[1].amount)
    .map(([name, s]) => `<tr>
      <td>${name}</td>
      <td style="text-align:center;"><span class="badge blue">${s.qty}</span></td>
      <td style="text-align:right;">₹${s.amount.toLocaleString('en-IN')}</td>
    </tr>`).join('');
  
  renderShell(`
    <div class="card">
      <h1>🧺 Laundry Tracker</h1>
      <div class="sub">${(records||[]).length} records — ${currentMonth}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button onclick="renderAddLaundry()">➕ Add Laundry</button>
        <input type="month" value="${currentMonth}" onchange="window._laundryMonth=this.value;renderLaundry()" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);">
      </div>
    </div>

    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#1E40AF;">₹${totalAmount.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Total Amount</div>
        </div>
        <div style="text-align:center;padding:14px;background:#F0FDF4;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#059669;">₹${totalPaid.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Paid</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FEF2F2;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:${totalDue > 0 ? '#DC2626' : '#059669'};">₹${totalDue.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Due</div>
        </div>
      </div>
    </div>

    ${Object.keys(itemStats).length > 0 ? `
    <div class="card">
      <div class="section-title">📊 Item-wise Consumption (${currentMonth})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Amount</th></tr></thead>
        <tbody>${itemStatsHTML}</tbody>
      </table></div>
    </div>` : ''}

    <div class="card">
      <div class="section-title">📋 Laundry Records</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th><th>Property</th><th>Vendor</th><th>Items</th>
          <th style="text-align:right;">Total</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${(records || []).length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">No laundry records this month</td></tr>' : ''}
          ${(records || []).map(r => {
            const rItems = itemsByRecord[r.id] || [];
            const itemsSummary = rItems.map(ri => `${ri.quantity} ${ri.laundry_items?.item_name || '?'}`).join(', ');
            const due = Number(r.total_amount || 0) - Number(r.paid_amount || 0);
            const status = due <= 0 ? 'green' : (r.paid_amount > 0 ? 'yellow' : 'red');
            const statusText = due <= 0 ? 'Paid ✅' : (r.paid_amount > 0 ? `Partial (₹${due} due)` : 'Unpaid');
            return `<tr>
              <td>${r.record_date}</td>
              <td>${roomMap[r.room_id] || 'General'}</td>
              <td><strong>${r.vendor_name || '-'}</strong></td>
              <td style="font-size:11px;color:#666;max-width:250px;">${itemsSummary || '-'}</td>
              <td style="text-align:right;"><strong>₹${Number(r.total_amount || 0).toLocaleString('en-IN')}</strong></td>
              <td><span class="badge ${status}">${statusText}</span></td>
              <td class="table-actions">
                <button class="btn-sm" onclick="editLaundry(${r.id})">✏️</button>
                <button class="btn-sm danger" onclick="deleteLaundry(${r.id})">🗑️</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
  `, 'laundry');
};

window.renderAddLaundry = async function() {
  const [{ data: items }, { data: rooms }] = await Promise.all([
    sb.from('laundry_items').select('*').eq('active', true).order('item_name'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no')
  ]);
  
  window._laundryItemsList = items || [];
  window._laundryRoomsList = rooms || [];
  
  renderShell(`
    <div class="card">
      <h1>➕ Add Laundry Record</h1>
      <button class="secondary btn-sm" onclick="renderLaundry()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Date *</label>
          <input id="lDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="form-group">
          <label>Property</label>
          <select id="lRoom">
            <option value="">General / All</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Vendor Name *</label>
        <input id="lVendor" type="text" placeholder="e.g. Aayush Laundry">
      </div>
    </div>
    
    <div class="card">
      <div class="section-title">🧺 Items</div>
      <div id="laundryItemsRows"></div>
      <button onclick="addLaundryItemRow()" class="btn-sm" style="margin-top:8px;">➕ Add Item</button>
      
      <div style="margin-top:16px;padding:12px;background:#F0FDF4;border-radius:8px;text-align:right;">
        <span style="font-size:14px;color:#666;">Grand Total: </span>
        <span id="laundryGrandTotal" style="font-size:20px;font-weight:800;color:#059669;">₹0</span>
      </div>
    </div>
    
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Payment Mode</label>
          <select id="lPayMode">
            <option>Cash</option><option>UPI</option><option>Bank</option>
          </select>
        </div>
        <div class="form-group">
          <label>Paid Amount</label>
          <input id="lPaidAmt" type="number" value="0" min="0">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="lNotes" rows="2"></textarea>
      </div>
      <button onclick="saveLaundry()" style="width:100%;">💾 Save Laundry Record</button>
      <div id="lErr"></div>
    </div>
  `, 'laundry');
  
  addLaundryItemRow();
};

window.addLaundryItemRow = function() {
  const container = document.getElementById('laundryItemsRows');
  const idx = container.children.length;
  const items = window._laundryItemsList || [];
  
  const row = document.createElement('div');
  row.className = 'laundry-item-row';
  row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;';
  row.innerHTML = `
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Item</label>
      <select class="laundry-item-select" onchange="updateItemRate(this)">
        <option value="">-- Select --</option>
        ${items.map(i => `<option value="${i.id}" data-rate="${i.default_rate}">${i.item_name}</option>`).join('')}
        <option value="__new__" style="color:#059669;font-weight:700;">➕ Add New Item...</option>
      </select>
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Qty</label>
      <input type="number" class="laundry-qty" value="1" min="0" oninput="updateLaundryTotal()">
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Rate ₹</label>
      <input type="number" class="laundry-rate" value="0" min="0" oninput="updateLaundryTotal()">
    </div>
    <div class="form-group" style="margin:0;">
      <label style="font-size:11px;">Total ₹</label>
      <input type="number" class="laundry-subtotal" value="0" readonly style="background:#f5f5f5;">
    </div>
    <button class="btn-sm danger" onclick="this.parentElement.remove();updateLaundryTotal();">🗑️</button>
  `;
  container.appendChild(row);
  updateLaundryTotal();
};

window.updateItemRate = async function(select) {
  if (select.value === '__new__') {
    const name = prompt('New item name:');
    if (!name) { select.value = ''; return; }
    const rate = parseFloat(prompt('Default rate per piece (₹):') || '0');
    
    const { data, error } = await sb.from('laundry_items').insert({
      item_name: name.trim(),
      default_rate: rate,
      active: true
    }).select().single();
    
    if (error) {
      alert('Error: ' + error.message);
      select.value = '';
      return;
    }
    
    // Add new option to all dropdowns
    document.querySelectorAll('.laundry-item-select').forEach(sel => {
      const newOpt = document.createElement('option');
      newOpt.value = data.id;
      newOpt.dataset.rate = data.default_rate;
      newOpt.textContent = data.item_name;
      // Insert before "+ Add New"
      const addNewOpt = sel.querySelector('option[value="__new__"]');
      sel.insertBefore(newOpt, addNewOpt);
    });
    
    // Refresh cache
    window._laundryItemsList = [...(window._laundryItemsList || []), data];
    
    // Auto-select new item in current row
    select.value = data.id;
    const row = select.closest('.laundry-item-row');
    row.querySelector('.laundry-rate').value = data.default_rate;
    updateLaundryTotal();
    
    fsn.success('Added', '✅ ' + name + ' added to items');
    return;
  }
  
  const opt = select.options[select.selectedIndex];
  const rate = opt?.dataset?.rate || 0;
  const row = select.closest('.laundry-item-row');
  row.querySelector('.laundry-rate').value = rate;
  updateLaundryTotal();
};

window.updateLaundryTotal = function() {
  let grandTotal = 0;
  document.querySelectorAll('.laundry-item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.laundry-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.laundry-rate').value) || 0;
    const subtotal = qty * rate;
    row.querySelector('.laundry-subtotal').value = subtotal;
    grandTotal += subtotal;
  });
  document.getElementById('laundryGrandTotal').textContent = '₹' + grandTotal.toLocaleString('en-IN');
};

window.saveLaundry = async function() {
  const date = document.getElementById('lDate').value;
  const room = document.getElementById('lRoom').value || null;
  const vendor = document.getElementById('lVendor').value.trim();
  const payMode = document.getElementById('lPayMode').value;
  const paidAmt = parseFloat(document.getElementById('lPaidAmt').value) || 0;
  const notes = document.getElementById('lNotes').value.trim();
  
  if (!date || !vendor) {
    document.getElementById('lErr').innerHTML = '<div class="error">Date and Vendor required</div>';
    return;
  }
  
  const rows = document.querySelectorAll('.laundry-item-row');
  const items = [];
  let total = 0;
  
  rows.forEach(row => {
    const itemId = row.querySelector('.laundry-item-select').value;
    const qty = parseInt(row.querySelector('.laundry-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.laundry-rate').value) || 0;
    if (itemId && qty > 0 && rate > 0) {
      items.push({ item_id: parseInt(itemId), quantity: qty, rate });
      total += qty * rate;
    }
  });
  
  if (items.length === 0) {
    document.getElementById('lErr').innerHTML = '<div class="error">Add at least 1 item</div>';
    return;
  }
  
  const paymentStatus = paidAmt >= total ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Pending');
  
  const { data: rec, error: e1 } = await sb.from('laundry_records').insert({
    record_date: date,
    room_id: room,
    vendor_name: vendor,
    total_amount: total,
    payment_mode: payMode,
    payment_status: paymentStatus,
    paid_amount: paidAmt,
    notes: notes
  }).select().single();
  
  if (e1) {
    document.getElementById('lErr').innerHTML = '<div class="error">' + e1.message + '</div>';
    return;
  }
  
  const itemsToInsert = items.map(i => ({ ...i, record_id: rec.id }));
  const { error: e2 } = await sb.from('laundry_record_items').insert(itemsToInsert);
  
  if (e2) {
    document.getElementById('lErr').innerHTML = '<div class="error">Items: ' + e2.message + '</div>';
    return;
  }
  
  fsn.success('Success', '✅ Laundry saved!');
  renderLaundry();
};

window.deleteLaundry = async function(id) {
  if (!confirm('Delete this laundry record?')) return;
  await sb.from('laundry_records').delete().eq('id', id);
  fsn.success('Success', '✅ Deleted');
  renderLaundry();
};

window.editLaundry = async function(id) {
  fsn.info('Info', 'Edit coming soon — delete and re-add for now');
};

console.log('✅ Laundry module loaded');
