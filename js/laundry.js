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
  
  const [{ data: records }, { data: items }, { data: rooms }, { data: recItems }, { data: allPayments }] = await Promise.all([
    sb.from('laundry_records').select('*').gte('record_date', monthStart).lte('record_date', monthEnd).order('record_date', { ascending: false }),
    sb.from('laundry_items').select('*').eq('active', true).order('item_name'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no'),
    sb.from('laundry_record_items').select('*, laundry_items(item_name)'),
    sb.from('laundry_payments').select('*').order('payment_date', { ascending: false })
  ]);
  
  // Group payments by record_id + recalculate paid amount from payments table
  const paymentsByRecord = {};
  (allPayments || []).forEach(p => {
    if (!paymentsByRecord[p.record_id]) paymentsByRecord[p.record_id] = [];
    paymentsByRecord[p.record_id].push(p);
  });
  
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r.nickname || r.unit_no; });
  
  const itemsByRecord = {};
  (recItems || []).forEach(ri => {
    if (!itemsByRecord[ri.record_id]) itemsByRecord[ri.record_id] = [];
    itemsByRecord[ri.record_id].push(ri);
  });
  
  const totalAmount = (records || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPaid = Object.values(paymentsByRecord).flat().reduce((s, p) => s + Number(p.amount || 0), 0);
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
            const recPayments = paymentsByRecord[r.id] || [];
            const recPaid = recPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const total = Number(r.total_amount || 0);
            const due = total - recPaid;
            const status = due <= 0 ? 'green' : (recPaid > 0 ? 'yellow' : 'red');
            const statusText = due <= 0 ? 'Paid ✅' : (recPaid > 0 ? `Partial (₹${due.toLocaleString('en-IN')} due)` : 'Unpaid');
            return `<tr>
              <td>${r.record_date}</td>
              <td>${roomMap[r.room_id] || 'General'}</td>
              <td><strong>${r.vendor_name || '-'}</strong></td>
              <td style="font-size:11px;color:#666;max-width:250px;">${itemsSummary || '-'}</td>
              <td style="text-align:right;">
                <strong>₹${total.toLocaleString('en-IN')}</strong>
                ${recPaid > 0 ? `<div style="font-size:10px;color:#059669;">Paid: ₹${recPaid.toLocaleString('en-IN')}</div>` : ''}
              </td>
              <td>
                <span class="badge ${status}">${statusText}</span>
                ${recPayments.length > 0 ? `<div style="font-size:10px;color:#666;margin-top:2px;cursor:pointer;" onclick="showLaundryPayments(${r.id})">📜 ${recPayments.length} payment${recPayments.length>1?'s':''}</div>` : ''}
              </td>
              <td class="table-actions">
                ${due > 0 ? `<button class="btn-sm" style="background:#10B981;color:#fff;" onclick="addLaundryPayment(${r.id}, ${due})">💰 Pay</button>` : ''}
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
  const [{ data: items }, { data: rooms }, { data: vendors }] = await Promise.all([
    sb.from('laundry_items').select('*').eq('active', true).order('item_name'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no'),
    sb.from('laundry_vendors').select('*').eq('active', true).order('vendor_name')
  ]);
  
  window._laundryItemsList = items || [];
  window._laundryRoomsList = rooms || [];
  window._laundryVendorsList = vendors || [];
  
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
        <label>Vendor *</label>
        <select id="lVendor" onchange="handleVendorChange(this)">
          <option value="">-- Select Vendor --</option>
          ${(vendors || []).map(v => `<option value="${v.vendor_name}">${v.vendor_name}${v.phone ? ' (' + v.phone + ')' : ''}</option>`).join('')}
          <option value="__new__" style="color:#059669;font-weight:700;">➕ Add New Vendor...</option>
        </select>
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
      <input type="number" class="laundry-subtotal" value="0" min="0" oninput="reverseCalcRate(this)" style="background:#FEF3C7;" title="Enter total to auto-calculate per-piece rate">
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

window.reverseCalcRate = function(input) {
  const row = input.closest('.laundry-item-row');
  const qty = parseFloat(row.querySelector('.laundry-qty').value) || 0;
  const total = parseFloat(input.value) || 0;
  if (qty > 0 && total > 0) {
    const rate = (total / qty).toFixed(2);
    row.querySelector('.laundry-rate').value = rate;
  }
  updateGrandTotalOnly();
};

window.updateGrandTotalOnly = function() {
  let grandTotal = 0;
  document.querySelectorAll('.laundry-item-row').forEach(row => {
    const subtotal = parseFloat(row.querySelector('.laundry-subtotal').value) || 0;
    grandTotal += subtotal;
  });
  document.getElementById('laundryGrandTotal').textContent = '₹' + grandTotal.toLocaleString('en-IN');
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
  if (vendor === '__new__') {
    document.getElementById('lErr').innerHTML = '<div class="error">Please select a vendor</div>';
    return;
  }
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
  renderShell('<div class="loading">Loading...</div>', 'laundry');
  
  const [{ data: rec }, { data: recItems }, { data: items }, { data: rooms }, { data: vendors }] = await Promise.all([
    sb.from('laundry_records').select('*').eq('id', id).single(),
    sb.from('laundry_record_items').select('*').eq('record_id', id),
    sb.from('laundry_items').select('*').eq('active', true).order('item_name'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no'),
    sb.from('laundry_vendors').select('*').eq('active', true).order('vendor_name')
  ]);
  
  if (!rec) {
    fsn.error('Error', 'Record not found');
    renderLaundry();
    return;
  }
  
  window._laundryItemsList = items || [];
  window._laundryEditId = id;
  window._laundryVendorsList = vendors || [];
  
  // Check if vendor exists in list, else add it as option
  const vendorInList = (vendors || []).some(v => v.vendor_name === rec.vendor_name);
  const vendorOpts = (vendors || []).map(v => 
    `<option value="${v.vendor_name}" ${v.vendor_name === rec.vendor_name ? 'selected' : ''}>${v.vendor_name}${v.phone ? ' (' + v.phone + ')' : ''}</option>`
  ).join('');
  
  renderShell(`
    <div class="card">
      <h1>✏️ Edit Laundry Record</h1>
      <button class="secondary btn-sm" onclick="renderLaundry()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Date *</label>
          <input id="lDate" type="date" value="${rec.record_date}">
        </div>
        <div class="form-group">
          <label>Property</label>
          <select id="lRoom">
            <option value="">General / All</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id === rec.room_id ? 'selected' : ''}>${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Vendor *</label>
        <select id="lVendor" onchange="handleVendorChange(this)">
          <option value="">-- Select Vendor --</option>
          ${!vendorInList && rec.vendor_name ? `<option value="${rec.vendor_name}" selected>${rec.vendor_name}</option>` : ''}
          ${vendorOpts}
          <option value="__new__" style="color:#059669;font-weight:700;">➕ Add New Vendor...</option>
        </select>
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
            <option ${rec.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
            <option ${rec.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
            <option ${rec.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
          </select>
        </div>
        <div class="form-group">
          <label>Paid Amount</label>
          <input id="lPaidAmt" type="number" value="${rec.paid_amount || 0}" min="0">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="lNotes" rows="2">${rec.notes || ''}</textarea>
      </div>
      <button onclick="updateLaundry()" style="width:100%;">💾 Update Record</button>
      <div id="lErr"></div>
    </div>
  `, 'laundry');
  
  // Pre-populate items
  (recItems || []).forEach(ri => {
    addLaundryItemRow();
    const lastRow = document.querySelectorAll('.laundry-item-row').length - 1;
    const rows = document.querySelectorAll('.laundry-item-row');
    const row = rows[lastRow];
    row.querySelector('.laundry-item-select').value = ri.item_id;
    row.querySelector('.laundry-qty').value = ri.quantity;
    row.querySelector('.laundry-rate').value = ri.rate;
  });
  updateLaundryTotal();
};

window.updateLaundry = async function() {
  const id = window._laundryEditId;
  const date = document.getElementById('lDate').value;
  const room = document.getElementById('lRoom').value || null;
  const vendor = document.getElementById('lVendor').value.trim();
  const payMode = document.getElementById('lPayMode').value;
  const paidAmt = parseFloat(document.getElementById('lPaidAmt').value) || 0;
  const notes = document.getElementById('lNotes').value.trim();
  
  if (!date || !vendor || vendor === '__new__') {
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
    if (itemId && itemId !== '__new__' && qty > 0 && rate > 0) {
      items.push({ record_id: id, item_id: parseInt(itemId), quantity: qty, rate });
      total += qty * rate;
    }
  });
  
  if (items.length === 0) {
    document.getElementById('lErr').innerHTML = '<div class="error">Add at least 1 item</div>';
    return;
  }
  
  const paymentStatus = paidAmt >= total ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Pending');
  
  // Update master record
  const { error: e1 } = await sb.from('laundry_records').update({
    record_date: date,
    room_id: room,
    vendor_name: vendor,
    total_amount: total,
    payment_mode: payMode,
    payment_status: paymentStatus,
    paid_amount: paidAmt,
    notes: notes
  }).eq('id', id);
  
  if (e1) {
    document.getElementById('lErr').innerHTML = '<div class="error">' + e1.message + '</div>';
    return;
  }
  
  // Delete old items, insert new
  await sb.from('laundry_record_items').delete().eq('record_id', id);
  const { error: e2 } = await sb.from('laundry_record_items').insert(items);
  
  if (e2) {
    document.getElementById('lErr').innerHTML = '<div class="error">Items: ' + e2.message + '</div>';
    return;
  }
  
  fsn.success('Success', '✅ Updated!');
  renderLaundry();
};

window.handleVendorChange = async function(select) {
  if (select.value !== '__new__') return;
  
  const name = prompt('New vendor name:');
  if (!name || !name.trim()) { select.value = ''; return; }
  
  const phone = prompt('Vendor phone (optional):') || null;
  
  const { data, error } = await sb.from('laundry_vendors').insert({
    vendor_name: name.trim(),
    phone: phone
  }).select().single();
  
  if (error) {
    alert('Error: ' + error.message);
    select.value = '';
    return;
  }
  
  // Add new option to dropdown
  const newOpt = document.createElement('option');
  newOpt.value = data.vendor_name;
  newOpt.textContent = data.vendor_name + (data.phone ? ' (' + data.phone + ')' : '');
  const addNewOpt = select.querySelector('option[value="__new__"]');
  select.insertBefore(newOpt, addNewOpt);
  
  // Auto-select
  select.value = data.vendor_name;
  
  // Update cache
  window._laundryVendorsList = [...(window._laundryVendorsList || []), data];
  
  fsn.success('Added', '✅ Vendor ' + name + ' added');
};

window.addLaundryPayment = async function(recordId, dueAmount) {
  const { data: rec } = await sb.from('laundry_records').select('*').eq('id', recordId).single();
  if (!rec) { fsn.error('Error', 'Record not found'); return; }
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div class="modal-box" style="background:#fff;border-radius:12px;padding:20px;max-width:450px;width:90%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2 style="margin:0;">💰 Add Payment</h2>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      <div style="background:#F0FDF4;padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;">
        <div><strong>${rec.vendor_name}</strong> — ${rec.record_date}</div>
        <div style="color:#DC2626;margin-top:4px;">Due: <strong>₹${dueAmount.toLocaleString('en-IN')}</strong></div>
      </div>
      <div class="form-group"><label>Amount ₹ *</label><input id="lpAmt" type="number" value="${dueAmount}" min="0"></div>
      <div class="form-group"><label>Payment Date *</label><input id="lpDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label>Mode</label>
        <select id="lpMode">
          <option>Cash</option><option>UPI</option><option>Bank</option>
        </select>
      </div>
      <div class="form-group"><label>Notes</label><input id="lpNotes" type="text" placeholder="Optional"></div>
      <button onclick="saveLaundryPayment(${recordId})" style="width:100%;background:#10B981;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:700;cursor:pointer;">💾 Save Payment</button>
      <div id="lpErr" style="margin-top:8px;"></div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveLaundryPayment = async function(recordId) {
  const amount = parseFloat(document.getElementById('lpAmt').value) || 0;
  const date = document.getElementById('lpDate').value;
  const mode = document.getElementById('lpMode').value;
  const notes = document.getElementById('lpNotes').value.trim();
  
  if (amount <= 0 || !date) {
    document.getElementById('lpErr').innerHTML = '<div class="error">Amount and Date required</div>';
    return;
  }
  
  const { error } = await sb.from('laundry_payments').insert({
    record_id: recordId,
    amount, payment_date: date, payment_mode: mode, notes
  });
  
  if (error) {
    document.getElementById('lpErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  // Update record's paid_amount + status
  const { data: allPays } = await sb.from('laundry_payments').select('amount').eq('record_id', recordId);
  const totalPaid = (allPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const { data: rec } = await sb.from('laundry_records').select('total_amount').eq('id', recordId).single();
  const total = Number(rec?.total_amount || 0);
  const status = totalPaid >= total ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
  
  await sb.from('laundry_records').update({
    paid_amount: totalPaid,
    payment_status: status
  }).eq('id', recordId);
  
  document.querySelector('.modal-overlay')?.remove();
  fsn.success('Success', '✅ Payment added!');
  renderLaundry();
};

window.showLaundryPayments = async function(recordId) {
  const { data: payments } = await sb.from('laundry_payments')
    .select('*').eq('record_id', recordId).order('payment_date', { ascending: false });
  const { data: rec } = await sb.from('laundry_records').select('*').eq('id', recordId).single();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div class="modal-box" style="background:#fff;border-radius:12px;padding:20px;max-width:600px;width:90%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2 style="margin:0;">📜 Payment History</h2>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      <div style="background:#F0FDF4;padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;">
        <strong>${rec?.vendor_name}</strong> — ${rec?.record_date} — Total: ₹${Number(rec?.total_amount||0).toLocaleString('en-IN')}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;">Date</th>
          <th style="padding:8px;text-align:left;">Mode</th>
          <th style="padding:8px;text-align:right;">Amount</th>
          <th style="padding:8px;">Notes</th>
          <th style="padding:8px;">Action</th>
        </tr></thead>
        <tbody>
          ${(payments || []).map(p => `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px;">${p.payment_date}</td>
            <td style="padding:8px;">${p.payment_mode}</td>
            <td style="padding:8px;text-align:right;"><strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
            <td style="padding:8px;font-size:11px;color:#666;">${p.notes || '-'}</td>
            <td style="padding:8px;"><button class="btn-sm danger" onclick="deleteLaundryPayment(${p.id}, ${recordId})">🗑️</button></td>
          </tr>`).join('') || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#999;">No payments</td></tr>'}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:10px;padding-top:10px;border-top:2px solid #eee;">
        <strong>Total Paid: ₹${(payments || []).reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString('en-IN')}</strong>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.deleteLaundryPayment = async function(paymentId, recordId) {
  if (!confirm('Delete this payment?')) return;
  await sb.from('laundry_payments').delete().eq('id', paymentId);
  
  // Recalculate record status
  const { data: allPays } = await sb.from('laundry_payments').select('amount').eq('record_id', recordId);
  const totalPaid = (allPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const { data: rec } = await sb.from('laundry_records').select('total_amount').eq('id', recordId).single();
  const total = Number(rec?.total_amount || 0);
  const status = totalPaid >= total ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
  
  await sb.from('laundry_records').update({
    paid_amount: totalPaid,
    payment_status: status
  }).eq('id', recordId);
  
  document.querySelector('.modal-overlay')?.remove();
  fsn.success('Success', '✅ Payment deleted');
  renderLaundry();
};

console.log('✅ Laundry module loaded');
