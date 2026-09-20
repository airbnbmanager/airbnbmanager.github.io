// ═══════════════════════════════════════════════════════════
// 📷 Image compression for laundry photos
// ═══════════════════════════════════════════════════════════
async function laundryCompressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = h * (maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

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
  const [lYear, lMon] = currentMonth.split('-').map(Number);
  const lastDayNum = new Date(lYear, lMon, 0).getDate();
  const monthEnd = `${currentMonth}-${String(lastDayNum).padStart(2, '0')}`;
  
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
  
  const monthRecordIds = new Set((records || []).map(r => r.id));
  const monthPayments = (allPayments || []).filter(p => monthRecordIds.has(p.record_id));
  
  const totalAmount = (records || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPaid = monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  
  // Claim totals for this month's records
  const unclaimedPays = monthPayments.filter(p => !p.claim_status || p.claim_status === 'not_claimed' || p.claim_status === 'unclaimed');
  const claimedPays = monthPayments.filter(p => p.claim_status === 'claimed');
  const receivedPays = monthPayments.filter(p => p.claim_status === 'received');
  const totalUnclaimed = unclaimedPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalClaimed = claimedPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalReceived = receivedPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDue = Math.max(0, totalAmount - totalPaid);
  const totalAdvance = Math.max(0, totalPaid - totalAmount);
  
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

  // Vendor-wise stats
  const vendorStats = {};
  (records || []).forEach(r => {
    const v = (r.vendor_name || 'Unknown').trim();
    if (!vendorStats[v]) vendorStats[v] = { count: 0, total: 0, paid: 0, due: 0 };
    vendorStats[v].count++;
    vendorStats[v].total += Number(r.total_amount || 0);
    const rPaid = (paymentsByRecord[r.id] || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    vendorStats[v].paid += rPaid;
    const rDue = Math.max(0, Number(r.total_amount || 0) - rPaid);
    vendorStats[v].due += rDue;
  });

  const vendorStatsHTML = Object.entries(vendorStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, s]) => `<tr>
      <td><strong style="color:var(--dark);font-size:13px;">${name}</strong></td>
      <td style="text-align:center;"><span class="badge blue">${s.count} orders</span></td>
      <td style="text-align:right;font-weight:700;">₹${s.total.toLocaleString('en-IN')}</td>
      <td style="text-align:right;color:#059669;font-weight:600;">₹${s.paid.toLocaleString('en-IN')}</td>
      <td style="text-align:right;">
        ${s.due > 0 ? `<span class="badge red" style="font-weight:700;">₹${s.due.toLocaleString('en-IN')} Due</span>` : `<span class="badge green">✓ Clear</span>`}
      </td>
      <td style="text-align:center;">
        <button onclick="printVendorLaundryReport('${name}', '${currentMonth}')" class="dash-pill-btn" style="background:#2563EB;color:#fff;border:none;padding:4px 10px;font-size:11px;cursor:pointer;border-radius:6px;font-weight:600;">
          📄 Print PDF
        </button>
      </td>
    </tr>`).join('');
  
  renderShell(`
    <div class="card">
      <h1>🧺 Laundry Tracker</h1>
      <div class="sub">${(records||[]).length} records — ${currentMonth}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button onclick="renderAddLaundry()">➕ Add Laundry</button>
        <button onclick="showLaundryReport()" style="background:#8B5CF6;color:#fff;">📊 Report</button>
        <button onclick="openVendorReportModal()" style="background:#059669;color:#fff;">📄 Vendor PDF</button>
        <input type="month" value="${currentMonth}" onchange="window._laundryMonth=this.value;renderLaundry()" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);">
      </div>
    </div>

    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
        <div class="kpi-tile" style="border-left:4px solid #3B82F6;background:rgba(59,130,246,0.08);">
          <div class="kpi-num" style="color:#3B82F6;">₹${totalAmount.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">Total Amount</div>
        </div>
        <div class="kpi-tile" style="border-left:4px solid #10B981;background:rgba(16,185,129,0.08);">
          <div class="kpi-num" style="color:#10B981;">₹${totalPaid.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">Paid</div>
        </div>
        ${totalAdvance > 0 ? `
        <div class="kpi-tile" style="border-left:4px solid #10B981;background:rgba(16,185,129,0.08);">
          <div class="kpi-num" style="color:#10B981;">₹${totalAdvance.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">Advance to Vendor</div>
        </div>
        ` : `
        <div class="kpi-tile" style="border-left:4px solid ${totalDue > 0 ? '#EF4444' : '#10B981'};background:${totalDue > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'};">
          <div class="kpi-num" style="color:${totalDue > 0 ? '#EF4444' : '#10B981'};">₹${totalDue.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">Due</div>
        </div>
        `}
        <div class="kpi-tile" style="border-left:4px solid #F59E0B;background:rgba(245,158,11,0.08);">
          <div class="kpi-num" style="color:#F59E0B;">₹${totalUnclaimed.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">⏳ Unclaimed (${unclaimedPays.length})</div>
        </div>
        <div class="kpi-tile" style="border-left:4px solid #6366F1;background:rgba(99,102,241,0.08);">
          <div class="kpi-num" style="color:#6366F1;">₹${totalClaimed.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">📤 Claimed (${claimedPays.length})</div>
        </div>
        <div class="kpi-tile" style="border-left:4px solid #059669;background:rgba(5,150,105,0.08);">
          <div class="kpi-num" style="color:#059669;">₹${totalReceived.toLocaleString('en-IN')}</div>
          <div class="kpi-sub">✅ Received (${receivedPays.length})</div>
        </div>
      </div>
    </div>

    <!-- VENDOR-WISE REPORT & ITEM-WISE CONSUMPTION DUAL GRID -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:16px;">
      ${Object.keys(vendorStats).length > 0 ? `
      <div class="card" style="margin-bottom:0;">
        <div class="section-title">🏆 Vendor-wise Report (${currentMonth})</div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Vendor</th>
            <th style="text-align:center;">Orders</th>
            <th style="text-align:right;">Billed</th>
            <th style="text-align:right;">Paid</th>
            <th style="text-align:right;">Balance</th>
            <th style="text-align:center;">Statement PDF</th>
          </tr></thead>
          <tbody>${vendorStatsHTML}</tbody>
        </table></div>
      </div>` : ''}

      ${Object.keys(itemStats).length > 0 ? `
      <div class="card" style="margin-bottom:0;">
        <div class="section-title">📊 Item-wise Consumption (${currentMonth})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>${itemStatsHTML}</tbody>
        </table></div>
      </div>` : ''}
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <div class="section-title" style="margin:0;">📋 Laundry Records</div>
        <input type="text" id="laundrySearchInput" placeholder="🔍 Filter property, vendor, item..." onkeyup="filterLaundryRecords()" style="max-width:260px;padding:6px 10px;font-size:12px;" />
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th><th>Property</th><th>Vendor</th><th>Items</th>
          <th style="text-align:right;">Total</th><th>Status</th><th>📷 Photos</th><th>Actions</th>
        </tr></thead>
        <tbody id="laundryTableBody">
          ${(records || []).length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted);">No laundry records this month</td></tr>' : ''}
          ${(records || []).map(r => {
            const rItems = itemsByRecord[r.id] || [];
            const itemsSummary = rItems.map(ri => `${ri.quantity} ${ri.laundry_items?.item_name || '?'}`).join(', ');
            const recPayments = paymentsByRecord[r.id] || [];
            const recPaid = recPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const total = Number(r.total_amount || 0);
            const due = total - recPaid;
            const status = due <= 0 ? 'green' : (recPaid > 0 ? 'yellow' : 'red');
            const statusText = due <= 0 ? 'Paid ✅' : (recPaid > 0 ? `Partial (₹${due.toLocaleString('en-IN')} due)` : 'Unpaid');
            const searchKey = `${r.record_date} ${roomMap[r.room_id] || ''} ${r.vendor_name || ''} ${itemsSummary}`.toLowerCase();
            return `<tr class="laundry-row" data-search="${searchKey}">
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
                ${(() => {
                  const unclaimed = recPayments.filter(p => (p.claim_status || 'not_claimed') === 'not_claimed');
                  const claimed = recPayments.filter(p => p.claim_status === 'claimed');
                  const unclaimedAmt = unclaimed.reduce((s, p) => s + Number(p.amount || 0), 0);
                  const claimedAmt = claimed.reduce((s, p) => s + Number(p.amount || 0), 0);
                  const parts = [];
                  if (unclaimedAmt > 0) parts.push(`<div style="font-size:10px;color:#92400E;margin-top:2px;">⏳ Unclaimed: ₹${unclaimedAmt.toLocaleString('en-IN')}</div>`);
                  if (claimedAmt > 0) parts.push(`<div style="font-size:10px;color:#1E40AF;">📤 Claimed: ₹${claimedAmt.toLocaleString('en-IN')}</div>`);
                  return parts.join('');
                })()}
              </td>
              <td>
                ${(() => {
                  const getPath = (p) => p.includes('/id-proofs/') ? p.split('/id-proofs/')[1] : p;
                  const btns = [];
                  if (r.bill_photo) {
                    btns.push(`<button class="btn-sm" style="background:#F59E0B;color:#fff;padding:3px 8px;font-size:10px;margin:1px 0;display:block;width:100%;" onclick="dlIdPhoto('${getPath(r.bill_photo)}')" title="View Bill Photo">🧾 Bill</button>`);
                  }
                  const paysWithPhoto = recPayments.filter(p => p.payment_photo);
                  if (paysWithPhoto.length > 0) {
                    btns.push(`<button class="btn-sm" style="background:#3B82F6;color:#fff;padding:3px 8px;font-size:10px;margin:1px 0;display:block;width:100%;" onclick="showLaundryPayments(${r.id})" title="View Payment Screenshots">💳 Pay (${paysWithPhoto.length})</button>`);
                  }
                  return btns.length ? btns.join('') : '<span style="color:#999;font-size:11px;">-</span>';
                })()}
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

window.filterLaundryRecords = function() {
  const query = (document.getElementById('laundrySearchInput')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.laundry-row').forEach(row => {
    const search = row.getAttribute('data-search') || '';
    row.style.display = search.includes(query) ? '' : 'none';
  });
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
          <label>Payment Source / Account <span class="warn">*</span></label>
          <select id="lPaymentSource" style="border: 1.5px solid #0d6efd; font-weight: 600;">
            <option value="COMPANY">🏢 COMPANY (Guest Rent / Cash in Hand)</option>
            <option value="UHHS-OD" selected>🏦 UHHS-OD (Overdraft Account)</option>
            <option value="FIROZ">👤 FIROZ (Direct Personal)</option>
          </select>
        </div>
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
        <label>🧾 Bill Photo (Vendor Bill)</label>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button type="button" class="btn-sm" style="background:#F59E0B;color:#fff;padding:8px 14px;" onclick="document.getElementById('lBillCam').click()">📷 Camera</button>
          <button type="button" class="btn-sm" style="background:#6B7280;color:#fff;padding:8px 14px;" onclick="document.getElementById('lBillGal').click()">🖼️ Gallery</button>
        </div>
        <input id="lBillCam" type="file" accept="image/*" capture="environment" style="display:none;">
        <input id="lBillGal" type="file" accept="image/*,image/heic,image/heif,.heic,.heif" style="display:none;">
        <div id="lBillPreview" style="margin-top:8px;"></div>
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
  
  // Reset previous blob
  window._laundryBillBlob = null;
  
  // Attach bill photo handlers
  ['lBillCam', 'lBillGal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const preview = document.getElementById('lBillPreview');
      preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
      try {
        const compressed = await laundryCompressImage(file);
        window._laundryBillBlob = compressed;
        const url = URL.createObjectURL(compressed);
        preview.innerHTML = `<img src="${url}" style="max-width:150px;border-radius:8px;border:1px solid #ddd;">
          <div style="font-size:11px;color:#666;">Size: ${Math.round(compressed.size/1024)}KB</div>`;
      } catch (err) {
        preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
      }
    });
  });
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
    const itemIdRaw = row.querySelector('.laundry-item-select').value;
    const qty = parseInt(row.querySelector('.laundry-qty').value) || 0;
    let rate = parseFloat(row.querySelector('.laundry-rate').value) || 0;
    const subtotalInput = parseFloat(row.querySelector('.laundry-subtotal').value) || 0;
    // If user typed only subtotal (bill mode), derive rate
    if (rate === 0 && qty > 0 && subtotalInput > 0) rate = subtotalInput / qty;
    const subtotal = subtotalInput > 0 ? subtotalInput : (qty * rate);
    if (itemIdRaw && itemIdRaw !== '__new__' && qty > 0 && subtotal > 0) {
      items.push({ item_id: parseInt(itemIdRaw), quantity: qty, rate: rate });
      total += subtotal;
    }
  });
  
  console.log('[Laundry Save] items:', items, 'total:', total);
  
  if (items.length === 0) {
    document.getElementById('lErr').innerHTML = '<div class="error">Add at least 1 valid item (item, qty, rate/total required)</div>';
    return;
  }
  
  const paymentStatus = paidAmt >= total ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Pending');
  
  // Upload bill photo if provided
  let billPhotoPath = null;
  if (window._laundryBillBlob) {
    try {
      const path = `laundry/bill_${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._laundryBillBlob, { contentType: window._laundryBillBlob.type || 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      billPhotoPath = path;
    } catch (err) {
      document.getElementById('lErr').innerHTML = '<div class="error">Bill photo: ' + err.message + '</div>';
      return;
    }
  }
  
  const { data: rec, error: e1 } = await sb.from('laundry_records').insert({
    record_date: date,
    room_id: room,
    vendor_name: vendor,
    total_amount: total,
    payment_mode: payMode,
    payment_status: paymentStatus,
    payment_source: document.getElementById('lPaymentSource')?.value || 'UHHS-OD',
    paid_amount: paidAmt,
    notes: notes,
    bill_photo: billPhotoPath
  }).select().single();
  
  if (e1) {
    console.error('[Laundry] record insert failed:', e1);
    document.getElementById('lErr').innerHTML = '<div class="error">Record: ' + e1.message + '</div>';
    return;
  }
  
  const itemsToInsert = items.map(i => ({ ...i, record_id: rec.id }));
  console.log('[Laundry] inserting items:', itemsToInsert);
  const { error: e2 } = await sb.from('laundry_record_items').insert(itemsToInsert);
  
  if (e2) {
    console.error('[Laundry] items insert failed:', e2, itemsToInsert);
    // rollback record so it doesn't orphan
    await sb.from('laundry_records').delete().eq('id', rec.id);
    document.getElementById('lErr').innerHTML = '<div class="error">Items: ' + e2.message + '</div>';
    return;
  }
  
  window._laundryBillBlob = null;
  fsn.success('Success', '✅ Laundry saved!');
  if (window.notifyDataChanged) window.notifyDataChanged();
  renderLaundry();
};

window.deleteLaundry = async function(id) {
  if (!confirm('Delete this laundry record?')) return;
  await sb.from('laundry_records').delete().eq('id', id);
  fsn.success('Success', '✅ Deleted');
  if (window.notifyDataChanged) window.notifyDataChanged();
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
          <label>Payment Source / Account <span class="warn">*</span></label>
          <select id="lPaymentSourceEdit" style="border: 1.5px solid #0d6efd; font-weight: 600;">
            <option value="COMPANY" ${rec.payment_source === 'COMPANY' ? 'selected' : ''}>🏢 COMPANY (Guest Rent / Cash in Hand)</option>
            <option value="UHHS-OD" ${rec.payment_source === 'UHHS-OD' || !rec.payment_source ? 'selected' : ''}>🏦 UHHS-OD (Overdraft Account)</option>
            <option value="FIROZ" ${rec.payment_source === 'FIROZ' ? 'selected' : ''}>👤 FIROZ (Direct Personal)</option>
          </select>
        </div>
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
        <label>🧾 Bill Photo (Vendor Bill)</label>
        ${rec.bill_photo ? `<div style="margin-bottom:8px;padding:8px;background:#FFFBEB;border-radius:6px;">
          <button type="button" class="btn-sm" style="background:#F59E0B;color:#fff;padding:6px 12px;" onclick="dlIdPhoto('${rec.bill_photo.includes('/id-proofs/') ? rec.bill_photo.split('/id-proofs/')[1] : rec.bill_photo}')">🧾 View Existing Bill</button>
          <span style="font-size:11px;color:#666;margin-left:8px;">Upload new to replace</span>
        </div>` : ''}
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button type="button" class="btn-sm" style="background:#F59E0B;color:#fff;padding:8px 14px;" onclick="document.getElementById('lBillCam').click()">📷 Camera</button>
          <button type="button" class="btn-sm" style="background:#6B7280;color:#fff;padding:8px 14px;" onclick="document.getElementById('lBillGal').click()">🖼️ Gallery</button>
        </div>
        <input id="lBillCam" type="file" accept="image/*" capture="environment" style="display:none;">
        <input id="lBillGal" type="file" accept="image/*,image/heic,image/heif,.heic,.heif" style="display:none;">
        <div id="lBillPreview" style="margin-top:8px;"></div>
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
  
  // Store existing bill photo path + reset blob
  window._laundryEditBillPath = rec.bill_photo || null;
  window._laundryBillBlob = null;
  
  // Attach bill photo handlers (same as add form)
  ['lBillCam', 'lBillGal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const preview = document.getElementById('lBillPreview');
      preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
      try {
        const compressed = await laundryCompressImage(file);
        window._laundryBillBlob = compressed;
        const url = URL.createObjectURL(compressed);
        preview.innerHTML = `<img src="${url}" style="max-width:150px;border-radius:8px;border:1px solid #ddd;">
          <div style="font-size:11px;color:#666;">New photo ready · Size: ${Math.round(compressed.size/1024)}KB</div>`;
      } catch (err) {
        preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
      }
    });
  });
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
    const itemIdRaw = row.querySelector('.laundry-item-select').value;
    const qty = parseInt(row.querySelector('.laundry-qty').value) || 0;
    let rate = parseFloat(row.querySelector('.laundry-rate').value) || 0;
    const subtotalInput = parseFloat(row.querySelector('.laundry-subtotal').value) || 0;
    if (rate === 0 && qty > 0 && subtotalInput > 0) rate = subtotalInput / qty;
    const subtotal = subtotalInput > 0 ? subtotalInput : (qty * rate);
    if (itemIdRaw && itemIdRaw !== '__new__' && qty > 0 && subtotal > 0) {
      items.push({ record_id: id, item_id: parseInt(itemIdRaw), quantity: qty, rate: rate });
      total += subtotal;
    }
  });
  
  if (items.length === 0) {
    document.getElementById('lErr').innerHTML = '<div class="error">Add at least 1 item</div>';
    return;
  }
  
  const paymentStatus = paidAmt >= total ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Pending');
  
  // Upload new bill photo if provided (and delete old)
  let billPhotoPath = window._laundryEditBillPath;
  if (window._laundryBillBlob) {
    try {
      const path = `laundry/bill_${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._laundryBillBlob, { contentType: window._laundryBillBlob.type || 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      // Delete old photo if existed
      if (window._laundryEditBillPath) {
        try {
          const oldP = window._laundryEditBillPath.includes('/id-proofs/') ? window._laundryEditBillPath.split('/id-proofs/')[1] : window._laundryEditBillPath;
          if (oldP) await sb.storage.from('id-proofs').remove([oldP]);
        } catch (e) {}
      }
      billPhotoPath = path;
    } catch (err) {
      document.getElementById('lErr').innerHTML = '<div class="error">Bill photo: ' + err.message + '</div>';
      return;
    }
  }
  
  // Update master record
  const { error: e1 } = await sb.from('laundry_records').update({
    record_date: date,
    room_id: room,
    vendor_name: vendor,
    total_amount: total,
    payment_mode: payMode,
    payment_status: paymentStatus,
    payment_source: document.getElementById('lPaymentSourceEdit')?.value || 'UHHS-OD',
    paid_amount: paidAmt,
    notes: notes,
    bill_photo: billPhotoPath
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
  
  window._laundryBillBlob = null;
  window._laundryEditBillPath = null;
  fsn.success('Success', '✅ Updated!');
  if (window.notifyDataChanged) window.notifyDataChanged();
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
            <div class="form-group"><label>Payment Source / Account *</label>
        <select id="lpPaymentSource" style="border: 1.5px solid #0d6efd; font-weight: 600;">
          <option value="COMPANY">🏢 COMPANY (Guest Rent / Cash in Hand)</option>
          <option value="UHHS-OD" selected>🏦 UHHS-OD (Overdraft Account)</option>
          <option value="FIROZ">👤 FIROZ (Direct Personal)</option>
        </select>
      </div>
      <div class="form-group"><label>Amount ₹ *</label><input id="lpAmt" type="number" value="${dueAmount}" min="0"></div>
      <div class="form-group"><label>Payment Date *</label><input id="lpDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label>Mode</label>
        <select id="lpMode">
          <option>Cash</option><option>UPI</option><option>Bank</option>
        </select>
      </div>
      <div class="form-group"><label>Notes</label><input id="lpNotes" type="text" placeholder="Optional"></div>
      <div class="form-group">
        <label>💳 Payment Screenshot</label>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button type="button" class="btn-sm" style="background:#10B981;color:#fff;padding:8px 14px;" onclick="document.getElementById('lpPayCam').click()">📷 Camera</button>
          <button type="button" class="btn-sm" style="background:#6B7280;color:#fff;padding:8px 14px;" onclick="document.getElementById('lpPayGal').click()">🖼️ Gallery</button>
        </div>
        <input id="lpPayCam" type="file" accept="image/*" capture="environment" style="display:none;">
        <input id="lpPayGal" type="file" accept="image/*,image/heic,image/heif,.heic,.heif" style="display:none;">
        <div id="lpPayPreview" style="margin-top:8px;"></div>
      </div>
      <button onclick="saveLaundryPayment(${recordId})" style="width:100%;background:#10B981;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:700;cursor:pointer;">💾 Save Payment</button>
      <div id="lpErr" style="margin-top:8px;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Reset previous blob + attach payment photo handlers
  window._laundryPayBlob = null;
  ['lpPayCam', 'lpPayGal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const preview = document.getElementById('lpPayPreview');
      preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
      try {
        const compressed = await laundryCompressImage(file);
        window._laundryPayBlob = compressed;
        const url = URL.createObjectURL(compressed);
        preview.innerHTML = `<img src="${url}" style="max-width:150px;border-radius:8px;border:1px solid #ddd;">
          <div style="font-size:11px;color:#666;">Size: ${Math.round(compressed.size/1024)}KB</div>`;
      } catch (err) {
        preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
      }
    });
  });
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
  
  // Upload payment screenshot if provided
  let paymentPhotoPath = null;
  if (window._laundryPayBlob) {
    try {
      const path = `laundry/pay_${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._laundryPayBlob, { contentType: window._laundryPayBlob.type || 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      paymentPhotoPath = path;
    } catch (err) {
      document.getElementById('lpErr').innerHTML = '<div class="error">Payment photo: ' + err.message + '</div>';
      return;
    }
  }
  
  const { error } = await sb.from('laundry_payments').insert({
    record_id: recordId,
    amount, payment_date: date, payment_mode: mode, notes,
    payment_source: document.getElementById('lpPaymentSource')?.value || 'UHHS-OD',
    payment_photo: paymentPhotoPath,
    claim_status: 'unclaimed'
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
  window._laundryPayBlob = null;
  fsn.success('Success', '✅ Payment added!');
  if (window.notifyDataChanged) window.notifyDataChanged();
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
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:6px;text-align:left;">Date</th>
          <th style="padding:6px;text-align:left;">Mode</th>
          <th style="padding:6px;text-align:right;">Amount</th>
          <th style="padding:6px;">📷</th>
          <th style="padding:6px;">Claim Status</th>
          <th style="padding:6px;">Actions</th>
        </tr></thead>
        <tbody>
          ${(payments || []).map(p => {
            const getPath = (pt) => pt.includes('/id-proofs/') ? pt.split('/id-proofs/')[1] : pt;
            const cs = p.claim_status || 'not_claimed';
            let claimBadge = '', claimBtns = '';
            if (cs === 'not_claimed') {
              claimBadge = '<span style="background:#FEF3C7;color:#92400E;padding:2px 6px;border-radius:4px;font-size:10px;">⏳ Not Claimed</span>';
              claimBtns = `<button class="btn-sm" style="background:#3B82F6;color:#fff;padding:3px 6px;font-size:10px;" onclick="markLaundryClaimed(${p.id}, ${recordId})" title="Mark as Claimed">📤 Claim</button>`;
            } else if (cs === 'claimed') {
              const cd = p.claim_date ? ` (${p.claim_date})` : '';
              claimBadge = `<span style="background:#DBEAFE;color:#1E40AF;padding:2px 6px;border-radius:4px;font-size:10px;">📤 Claimed${cd}</span>`;
              claimBtns = `<button class="btn-sm" style="background:#10B981;color:#fff;padding:3px 6px;font-size:10px;" onclick="markLaundryReceived(${p.id}, ${recordId})" title="Mark as Received">✅ Received</button>
                <button class="btn-sm" style="background:#F59E0B;color:#fff;padding:3px 6px;font-size:10px;" onclick="undoLaundryClaim(${p.id}, ${recordId})" title="Undo Claim">↩️</button>`;
            } else if (cs === 'received') {
              const rd = p.claim_received_date ? ` (${p.claim_received_date})` : '';
              claimBadge = `<span style="background:#D1FAE5;color:#065F46;padding:2px 6px;border-radius:4px;font-size:10px;">✅ Received${rd}</span>`;
              claimBtns = `<button class="btn-sm" style="background:#F59E0B;color:#fff;padding:3px 6px;font-size:10px;" onclick="undoLaundryClaim(${p.id}, ${recordId})" title="Undo">↩️</button>`;
            }
            return `<tr style="border-bottom:1px solid #eee;" id="lpay-row-${p.id}">
              <td style="padding:6px;">${p.payment_date}</td>
              <td style="padding:6px;">${p.payment_mode}</td>
              <td style="padding:6px;text-align:right;"><strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
              <td style="padding:6px;">${p.payment_photo ? `<button class="btn-sm" style="background:#3B82F6;color:#fff;padding:2px 6px;font-size:10px;" onclick="dlIdPhoto('${getPath(p.payment_photo)}')" title="View">💳</button>` : '<span style="color:#999;">-</span>'}</td>
              <td style="padding:6px;">${claimBadge}</td>
              <td style="padding:6px;white-space:nowrap;">
                ${claimBtns}
                <button class="btn-sm" onclick="editLaundryPayment(${p.id}, ${recordId})" title="Edit">✏️</button>
                <button class="btn-sm danger" onclick="deleteLaundryPayment(${p.id}, ${recordId})" title="Delete">🗑️</button>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#999;">No payments</td></tr>'}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:10px;padding-top:10px;border-top:2px solid #eee;">
        <strong>Total Paid: ₹${(payments || []).reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString('en-IN')}</strong>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.editLaundryPayment = async function(paymentId, recordId) {
  const { data: pay } = await sb.from('laundry_payments').select('*').eq('id', paymentId).single();
  if (!pay) { fsn.error('Error', 'Payment not found'); return; }
  
  // Close existing modal
  document.querySelector('.modal-overlay')?.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div class="modal-box" style="background:#fff;border-radius:12px;padding:20px;max-width:450px;width:90%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2 style="margin:0;">✏️ Edit Payment</h2>
        <button onclick="this.closest('.modal-overlay').remove();showLaundryPayments(${recordId});" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
            <div class="form-group"><label>Payment Source / Account *</label>
        <select id="lpPaymentSource" style="border: 1.5px solid #0d6efd; font-weight: 600;">
          <option value="COMPANY" ${pay.payment_source === 'COMPANY' ? 'selected' : ''}>🏢 COMPANY (Guest Rent / Cash in Hand)</option>
          <option value="UHHS-OD" ${pay.payment_source === 'UHHS-OD' || !pay.payment_source ? 'selected' : ''}>🏦 UHHS-OD (Overdraft Account)</option>
          <option value="FIROZ" ${pay.payment_source === 'FIROZ' ? 'selected' : ''}>👤 FIROZ (Direct Personal)</option>
        </select>
      </div>
      <div class="form-group"><label>Amount ₹ *</label><input id="lpEditAmt" type="number" value="${pay.amount}" min="0"></div>
      <div class="form-group"><label>Payment Date *</label><input id="lpEditDate" type="date" value="${pay.payment_date}"></div>
      <div class="form-group"><label>Mode</label>
        <select id="lpEditMode">
          <option ${pay.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
          <option ${pay.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
          <option ${pay.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
        </select>
      </div>
      <div class="form-group"><label>Notes</label><input id="lpEditNotes" type="text" value="${pay.notes || ''}"></div>
      <div style="display:flex;gap:8px;">
        <button onclick="updateLaundryPayment(${paymentId}, ${recordId})" style="flex:1;background:#3B82F6;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:700;cursor:pointer;">💾 Update</button>
        <button onclick="this.closest('.modal-overlay').remove();showLaundryPayments(${recordId});" style="flex:1;background:#6B7280;color:#fff;padding:10px;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
      </div>
      <div id="lpEditErr" style="margin-top:8px;"></div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.updateLaundryPayment = async function(paymentId, recordId) {
  const amount = parseFloat(document.getElementById('lpEditAmt').value) || 0;
  const date = document.getElementById('lpEditDate').value;
  const mode = document.getElementById('lpEditMode').value;
  const notes = document.getElementById('lpEditNotes').value.trim();
  
  if (amount <= 0 || !date) {
    document.getElementById('lpEditErr').innerHTML = '<div class="error">Amount and Date required</div>';
    return;
  }
  
  const paymentSource = document.getElementById('lpPaymentSource')?.value || 'UHHS-OD';

  const { error } = await sb.from('laundry_payments').update({
    amount, payment_date: date, payment_mode: mode, notes,
    payment_source: paymentSource
  }).eq('id', paymentId);
  
  if (error) {
    document.getElementById('lpEditErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
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
  fsn.success('Success', '✅ Payment updated!');
  if (window.notifyDataChanged) window.notifyDataChanged();
  
  // Refresh main list AND reopen history
  await renderLaundry();
  setTimeout(() => showLaundryPayments(recordId), 300);
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
  if (window.notifyDataChanged) window.notifyDataChanged();
  await renderLaundry();
  // Reopen history modal
  const { data: remaining } = await sb.from('laundry_payments').select('*').eq('record_id', recordId).limit(1);
  if (remaining && remaining.length > 0) {
    setTimeout(() => showLaundryPayments(recordId), 300);
  }
};

console.log('✅ Laundry module loaded');

// ═══════════════════════════════════════════════════════════
// 📤 CLAIM MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════

window.markLaundryClaimed = async function(paymentId, recordId) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from('laundry_payments')
    .update({ claim_status: 'claimed', claim_date: today })
    .eq('id', paymentId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Claimed', '📤 Marked as claimed');
  if (window.notifyDataChanged) window.notifyDataChanged();
  document.querySelector('.modal-overlay')?.remove();
  setTimeout(() => showLaundryPayments(recordId), 200);
};

window.markLaundryReceived = async function(paymentId, recordId) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from('laundry_payments')
    .update({ claim_status: 'received', claim_received_date: today })
    .eq('id', paymentId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Received', '✅ Marked as received');
  if (window.notifyDataChanged) window.notifyDataChanged();
  document.querySelector('.modal-overlay')?.remove();
  setTimeout(() => { showLaundryPayments(recordId); renderLaundry(); }, 200);
};

window.undoLaundryClaim = async function(paymentId, recordId) {
  if (!confirm('Undo claim status? It will revert to Not Claimed.')) return;
  const { error } = await sb.from('laundry_payments')
    .update({ claim_status: 'not_claimed', claim_date: null, claim_received_date: null })
    .eq('id', paymentId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Reverted', '↩️ Claim reverted');
  if (window.notifyDataChanged) window.notifyDataChanged();
  document.querySelector('.modal-overlay')?.remove();
  setTimeout(() => { showLaundryPayments(recordId); renderLaundry(); }, 200);
};

// ═══════════════════════════════════════════════════════════
// 📊 LAUNDRY REPORT MODAL
// ═══════════════════════════════════════════════════════════
window.showLaundryReport = async function() {
  const currentMonth = window._laundryMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const monthEnd = currentMonth + '-31';
  
  const [{ data: records }, { data: recItems }, { data: allPayments }, { data: items }] = await Promise.all([
    sb.from('laundry_records').select('*').gte('record_date', monthStart).lte('record_date', monthEnd),
    sb.from('laundry_record_items').select('*'),
    sb.from('laundry_payments').select('*').gte('payment_date', monthStart).lte('payment_date', monthEnd),
    sb.from('laundry_items').select('*')
  ]);
  
  const itemsMap = {};
  (items || []).forEach(i => itemsMap[i.id] = i.item_name);
  
  const recordIds = (records || []).map(r => r.id);
  const monthItems = (recItems || []).filter(ri => recordIds.includes(ri.record_id));
  
  // Financial summary
  const totalAmount = (records || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDue = totalAmount - totalPaid;
  
  // Claim breakdown
  const unclaimed = (allPayments || []).filter(p => (p.claim_status || 'not_claimed') === 'not_claimed');
  const claimed = (allPayments || []).filter(p => p.claim_status === 'claimed');
  const received = (allPayments || []).filter(p => p.claim_status === 'received');
  const unclaimedAmt = unclaimed.reduce((s, p) => s + Number(p.amount || 0), 0);
  const claimedAmt = claimed.reduce((s, p) => s + Number(p.amount || 0), 0);
  const receivedAmt = received.reduce((s, p) => s + Number(p.amount || 0), 0);
  
  // Vendor breakdown
  const vendorMap = {};
  (records || []).forEach(r => {
    const v = r.vendor_name || 'Unknown';
    if (!vendorMap[v]) vendorMap[v] = { count: 0, amount: 0, paid: 0, due: 0 };
    vendorMap[v].count++;
    vendorMap[v].amount += Number(r.total_amount || 0);
    const rPaid = (allPayments || []).filter(p => p.record_id === r.id).reduce((s, p) => s + Number(p.amount || 0), 0);
    vendorMap[v].paid += rPaid;
    vendorMap[v].due += Math.max(0, Number(r.total_amount || 0) - rPaid);
  });
  const vendorList = Object.entries(vendorMap).sort((a,b) => b[1].amount - a[1].amount);
  
  // Item consumption
  const itemStats = {};
  monthItems.forEach(ri => {
    const name = itemsMap[ri.item_id] || 'Unknown';
    if (!itemStats[name]) itemStats[name] = { qty: 0, amount: 0 };
    itemStats[name].qty += Number(ri.quantity || 0);
    itemStats[name].amount += Number(ri.subtotal || (ri.quantity * ri.rate) || 0);
  });
  const itemList = Object.entries(itemStats).sort((a,b) => b[1].qty - a[1].qty);
  
  // Payment mode breakdown
  const modeMap = {};
  (allPayments || []).forEach(p => {
    const m = p.payment_mode || 'Cash';
    if (!modeMap[m]) modeMap[m] = { count: 0, amount: 0 };
    modeMap[m].count++;
    modeMap[m].amount += Number(p.amount || 0);
  });
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div class="modal-box" style="background:#fff;border-radius:12px;padding:24px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:2px solid #eee;padding-bottom:12px;">
        <div>
          <h2 style="margin:0;">📊 Laundry Report</h2>
          <div style="font-size:12px;color:#666;margin-top:2px;">${currentMonth} · ${(records||[]).length} records · ${(allPayments||[]).length} payments</div>
        </div>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">✕</button>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
        <div style="padding:12px;background:#EFF6FF;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#1E40AF;">₹${totalAmount.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Total Amount</div>
        </div>
        <div style="padding:12px;background:#F0FDF4;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#059669;">₹${totalPaid.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Paid (${(allPayments||[]).length})</div>
        </div>
        <div style="padding:12px;background:${totalDue > 0 ? '#FEF2F2' : '#F0FDF4'};border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:${totalDue > 0 ? '#DC2626' : '#059669'};">₹${totalDue.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Due</div>
        </div>
      </div>
      
      <div style="margin-bottom:20px;padding:14px;background:#FFFBEB;border-radius:8px;border-left:4px solid #F59E0B;">
        <div style="font-weight:700;margin-bottom:8px;">📤 Claim Status</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;">
          <div><span style="color:#92400E;">⏳ Unclaimed:</span> <strong>₹${unclaimedAmt.toLocaleString('en-IN')}</strong> (${unclaimed.length})</div>
          <div><span style="color:#1E40AF;">📤 Claimed:</span> <strong>₹${claimedAmt.toLocaleString('en-IN')}</strong> (${claimed.length})</div>
          <div><span style="color:#065F46;">✅ Received:</span> <strong>₹${receivedAmt.toLocaleString('en-IN')}</strong> (${received.length})</div>
        </div>
      </div>
      
      <div style="margin-bottom:20px;">
        <div style="font-weight:700;margin-bottom:8px;">🏆 Vendor Breakdown</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f5f5f5;">
            <th style="padding:6px;text-align:left;">Vendor</th>
            <th style="padding:6px;text-align:center;">Orders</th>
            <th style="padding:6px;text-align:right;">Billed</th>
            <th style="padding:6px;text-align:right;">Paid</th>
            <th style="padding:6px;text-align:right;">Due</th>
            <th style="padding:6px;text-align:right;">%</th>
          </tr></thead>
          <tbody>
            ${vendorList.map(([name, data]) => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px;"><strong>${name}</strong></td>
                <td style="padding:6px;text-align:center;">${data.count}</td>
                <td style="padding:6px;text-align:right;font-weight:700;">₹${data.amount.toLocaleString('en-IN')}</td>
                <td style="padding:6px;text-align:right;color:#059669;font-weight:600;">₹${data.paid.toLocaleString('en-IN')}</td>
                <td style="padding:6px;text-align:right;">
                  ${data.due > 0 ? `<span style="color:#DC2626;font-weight:700;">₹${data.due.toLocaleString('en-IN')} Due</span>` : `<span style="color:#059669;">✓ Clear</span>`}
                </td>
                <td style="padding:6px;text-align:right;">${totalAmount > 0 ? Math.round(data.amount / totalAmount * 100) : 0}%</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#999;">No data</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div style="margin-bottom:20px;">
        <div style="font-weight:700;margin-bottom:8px;">📊 Top Items Consumed</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f5f5f5;">
            <th style="padding:6px;text-align:left;">Item</th>
            <th style="padding:6px;text-align:center;">Qty</th>
            <th style="padding:6px;text-align:right;">Amount</th>
          </tr></thead>
          <tbody>
            ${itemList.slice(0, 10).map(([name, data]) => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px;">${name}</td>
                <td style="padding:6px;text-align:center;"><strong>${data.qty}</strong></td>
                <td style="padding:6px;text-align:right;">₹${data.amount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#999;">No data</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div style="margin-bottom:12px;">
        <div style="font-weight:700;margin-bottom:8px;">💳 Payment Modes</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${Object.entries(modeMap).map(([mode, data]) => `
            <div style="padding:8px 12px;background:#f5f5f5;border-radius:6px;font-size:12px;">
              <strong>${mode}</strong>: ₹${data.amount.toLocaleString('en-IN')} <span style="color:#666;">(${data.count})</span>
            </div>
          `).join('') || '<div style="color:#999;">No payments yet</div>'}
        </div>
      </div>
      
      <div style="text-align:right;padding-top:12px;border-top:1px solid #eee;">
        <button onclick="this.closest('.modal-overlay').remove()" style="background:#6B7280;color:#fff;padding:8px 20px;border:none;border-radius:6px;cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ═══════════════════════════════════════════════════════════
// 📄 VENDOR-WISE DATE STATEMENT PDF GENERATOR
// ═══════════════════════════════════════════════════════════

window.openVendorReportModal = async function() {
  const currentMonth = window._laundryMonth || new Date().toISOString().slice(0, 7);
  const { data: records } = await sb.from('laundry_records').select('vendor_name').order('vendor_name');
  const vendors = Array.from(new Set((records || []).map(r => (r.vendor_name || '').trim()).filter(Boolean))).sort();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div class="modal-box" style="background:#fff;border-radius:12px;padding:24px;max-width:440px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:10px;">
        <h3 style="margin:0;font-size:18px;color:#1F2937;">📄 Vendor Statement PDF</h3>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;font-weight:700;color:#4B5563;margin-bottom:6px;">Select Vendor:</label>
        <select id="vReportVendor" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #D1D5DB;font-size:14px;">
          <option value="All">All Vendors (Consolidated Statement)</option>
          ${vendors.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:12px;font-weight:700;color:#4B5563;margin-bottom:6px;">Select Month:</label>
        <input type="month" id="vReportMonth" value="${currentMonth}" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #D1D5DB;font-size:14px;" />
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="this.closest('.modal-overlay').remove()" style="background:#F3F4F6;color:#374151;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Cancel</button>
        <button id="btnGenVReport" style="background:#059669;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:700;">
          🖨️ Generate PDF
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#btnGenVReport').onclick = () => {
    const vName = modal.querySelector('#vReportVendor').value;
    const mStr = modal.querySelector('#vReportMonth').value;
    modal.remove();
    printVendorLaundryReport(vName, mStr);
  };
};

window.printVendorLaundryReport = async function(vendorName, monthYear) {
  const currentMonth = monthYear || window._laundryMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const [lYear, lMon] = currentMonth.split('-').map(Number);
  const lastDayNum = new Date(lYear, lMon, 0).getDate();
  const monthEnd = `${currentMonth}-${String(lastDayNum).padStart(2, '0')}`;

  let query = sb.from('laundry_records').select('*')
    .gte('record_date', monthStart)
    .lte('record_date', monthEnd)
    .order('record_date', { ascending: true });
  
  if (vendorName && vendorName !== 'All') {
    query = query.eq('vendor_name', vendorName);
  }

  const [{ data: records }, { data: recItems }, { data: allPayments }, { data: rooms }] = await Promise.all([
    query,
    sb.from('laundry_record_items').select('*, laundry_items(item_name)'),
    sb.from('laundry_payments').select('*').order('payment_date', { ascending: true }),
    sb.from('rooms').select('room_id, nickname, unit_no')
  ]);

  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r.nickname || r.unit_no; });

  const recordIds = new Set((records || []).map(r => r.id));
  const monthItemsByRec = {};
  (recItems || []).forEach(ri => {
    if (recordIds.has(ri.record_id)) {
      if (!monthItemsByRec[ri.record_id]) monthItemsByRec[ri.record_id] = [];
      monthItemsByRec[ri.record_id].push(ri);
    }
  });

  const vendorPayments = (allPayments || []).filter(p => recordIds.has(p.record_id));
  const paymentsByRec = {};
  vendorPayments.forEach(p => {
    if (!paymentsByRec[p.record_id]) paymentsByRec[p.record_id] = [];
    paymentsByRec[p.record_id].push(p);
  });

  const totalBilled = (records || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPaid = vendorPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalDue = Math.max(0, totalBilled - totalPaid);
  const totalAdvance = Math.max(0, totalPaid - totalBilled);

  // Month date title
  const monthDate = new Date(currentMonth + '-01');
  const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const vendorTitle = (vendorName && vendorName !== 'All') ? vendorName : 'All Laundry Vendors';

  // WhatsApp summary text
  const waText = encodeURIComponent(
    `*The Unique Haven Homes — Laundry Vendor Statement*\n` +
    `Vendor: ${vendorTitle}\n` +
    `Period: ${monthName}\n` +
    `Total Orders: ${(records||[]).length}\n` +
    `Total Billed: ₹${totalBilled.toLocaleString('en-IN')}\n` +
    `Total Paid: ₹${totalPaid.toLocaleString('en-IN')}\n` +
    `Balance Due: ₹${totalDue.toLocaleString('en-IN')}\n` +
    `Generated on: ${todayStr}`
  );

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${vendorTitle} - Laundry Statement (${monthName})</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #1e293b; line-height: 1.4; }
    .page-container { max-width: 850px; margin: 0 auto; background: #fff; padding: 32px 36px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
    
    /* Letterhead Header */
    .doc-head { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .doc-brand h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .doc-brand p { margin: 3px 0 0; font-size: 12px; color: #64748b; }
    .doc-badge { background: #f1f5f9; padding: 8px 14px; border-radius: 6px; text-align: right; border: 1px solid #e2e8f0; }
    .doc-badge .title { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .doc-badge .meta { font-size: 11px; color: #64748b; margin-top: 2px; }
    
    /* Meta bar */
    .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
    .meta-item label { font-size: 10.5px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 700; color: #0f172a; }

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-box { padding: 12px 14px; border-radius: 6px; border-left: 4px solid #cbd5e1; background: #f8fafc; }
    .kpi-box.blue { border-color: #2563eb; background: #eff6ff; }
    .kpi-box.green { border-color: #059669; background: #ecfdf5; }
    .kpi-box.red { border-color: #dc2626; background: #fef2f2; }
    .kpi-box.amber { border-color: #d97706; background: #fffbeb; }
    .kpi-box .val { font-size: 18px; font-weight: 800; color: #0f172a; }
    .kpi-box .lbl { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-top: 2px; }

    /* Tables */
    .section-title { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid #2563eb; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: top; }
    tr:nth-child(even) { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; }
    .badge.green { background: #dcfce7; color: #15803d; }
    .badge.red { background: #fee2e2; color: #b91c1c; }
    .badge.blue { background: #dbeafe; color: #1d4ed8; }

    /* Signatures */
    .sign-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .sign-box { border-top: 1px dashed #94a3b8; padding-top: 6px; text-align: center; font-size: 11.5px; color: #475569; }

    /* Action bar */
    .no-print { position: sticky; top: 10px; max-width: 850px; margin: 0 auto 16px; background: #0f172a; padding: 10px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .no-print .btn { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .no-print .btn.green { background: #059669; }
    .no-print .btn.gray { background: #475569; }

    @media print {
      body { background: #fff; padding: 0; }
      .page-container { box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      @page { size: A4 portrait; margin: 12mm 15mm; }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar -->
  <div class="no-print">
    <div style="color:#fff;font-size:13px;font-weight:700;">
      📄 ${vendorTitle} — ${monthName} Statement
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <a class="btn green" href="https://api.whatsapp.com/send?text=${waText}" target="_blank" style="text-decoration:none;">📱 WhatsApp</a>
      <button class="btn gray" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="doc-head">
      <div class="doc-brand">
        <h1>THE UNIQUE HAVEN HOMES</h1>
        <p>Luxury Serviced Apartments & Villas &bull; Gomti Nagar & Shaheed Path, Lucknow</p>
        <p style="font-size:11px;color:#94a3b8;">CIN: U68101UP2026PTC244837 | Caretaker & Laundry Management</p>
      </div>
      <div class="doc-badge">
        <div class="title">LAUNDRY STATEMENT</div>
        <div class="meta">${monthName}</div>
      </div>
    </div>

    <!-- Metadata Bar -->
    <div class="meta-bar">
      <div class="meta-item">
        <label>Vendor Name</label>
        <span>${vendorTitle}</span>
      </div>
      <div class="meta-item">
        <label>Billing Period</label>
        <span>${monthName}</span>
      </div>
      <div class="meta-item">
        <label>Statement Date</label>
        <span>${todayStr}</span>
      </div>
      <div class="meta-item">
        <label>Account Status</label>
        <span style="color:${totalDue > 0 ? '#DC2626' : '#059669'};">${totalDue > 0 ? '₹' + totalDue.toLocaleString('en-IN') + ' Due' : 'All Clear ✓'}</span>
      </div>
    </div>

    <!-- KPI Summary Strip -->
    <div class="kpi-strip">
      <div class="kpi-box blue">
        <div class="val">${(records || []).length}</div>
        <div class="lbl">Total Dispatches</div>
      </div>
      <div class="kpi-box">
        <div class="val">₹${totalBilled.toLocaleString('en-IN')}</div>
        <div class="lbl">Total Billed</div>
      </div>
      <div class="kpi-box green">
        <div class="val">₹${totalPaid.toLocaleString('en-IN')}</div>
        <div class="lbl">Amount Paid</div>
      </div>
      <div class="kpi-box ${totalDue > 0 ? 'red' : 'green'}">
        <div class="val">₹${totalDue > 0 ? totalDue.toLocaleString('en-IN') : (totalAdvance > 0 ? totalAdvance.toLocaleString('en-IN') + ' (Adv)' : '0')}</div>
        <div class="lbl">${totalDue > 0 ? 'Balance Due' : (totalAdvance > 0 ? 'Advance Paid' : 'Balance')}</div>
      </div>
    </div>

    <!-- Table 1: Date-wise Linen Dispatches -->
    <div class="section-title">
      <span>📦 Date-wise Laundry Dispatches</span>
      <span style="font-size:11px;font-weight:600;color:#64748b;">${(records||[]).length} orders</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:85px;">Date</th>
          <th style="width:65px;">Order #</th>
          <th>Property / Apartment</th>
          <th>Linen Items Dispatched</th>
          <th style="text-align:right;width:75px;">Billed</th>
          <th style="text-align:right;width:75px;">Paid</th>
          <th style="text-align:center;width:75px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${(records || []).map(r => {
          const rDate = new Date(r.record_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          const propName = roomMap[r.room_id] || 'General / Central';
          const rItems = monthItemsByRec[r.id] || [];
          const itemsDesc = rItems.map(ri => `${ri.quantity}x ${ri.laundry_items?.item_name || 'Item'}`).join(', ') || 'Standard linen wash';
          const rPays = paymentsByRec[r.id] || [];
          const rPaid = rPays.reduce((s, p) => s + Number(p.amount || 0), 0);
          const rBilled = Number(r.total_amount || 0);
          const isFullPaid = rPaid >= rBilled && rBilled > 0;
          return `<tr>
            <td><strong>${rDate}</strong></td>
            <td>#${r.id}</td>
            <td>${propName}</td>
            <td style="color:#475569;font-size:11.5px;">${itemsDesc}</td>
            <td style="text-align:right;font-weight:700;">₹${rBilled.toLocaleString('en-IN')}</td>
            <td style="text-align:right;color:#059669;font-weight:600;">₹${rPaid.toLocaleString('en-IN')}</td>
            <td style="text-align:center;">
              <span class="badge ${isFullPaid ? 'green' : 'red'}">${isFullPaid ? 'Paid' : 'Pending'}</span>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:16px;">No dispatches found</td></tr>'}
      </tbody>
    </table>

    <!-- Table 2: Date-wise Payment Settlements -->
    ${vendorPayments.length > 0 ? `
    <div class="section-title" style="margin-top:24px;">
      <span>💳 Payment Settlements & Receipts</span>
      <span style="font-size:11px;font-weight:600;color:#64748b;">${vendorPayments.length} payments &bull; ₹${totalPaid.toLocaleString('en-IN')}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:90px;">Payment Date</th>
          <th>Order Ref</th>
          <th>Payment Mode</th>
          <th style="text-align:right;">Amount Paid</th>
          <th style="text-align:center;">Claim Status</th>
        </tr>
      </thead>
      <tbody>
        ${vendorPayments.map(p => {
          const pDate = new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const clm = p.claim_status === 'received' ? '✅ Received' : (p.claim_status === 'claimed' ? '📤 Claimed' : '⏳ Unclaimed');
          return `<tr>
            <td><strong>${pDate}</strong></td>
            <td>Order #${p.record_id || 'Direct'}</td>
            <td>${p.payment_mode || 'Cash'}</td>
            <td style="text-align:right;font-weight:700;color:#059669;">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
            <td style="text-align:center;"><span class="badge ${p.claim_status === 'received' ? 'green' : 'blue'}">${clm}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- Signatures Strip -->
    <div class="sign-strip">
      <div class="sign-box">
        Vendor Signature / Stamp<br>
        <strong>(${vendorTitle})</strong>
      </div>
      <div class="sign-box">
        Authorized Signatory<br>
        <strong>The Unique Haven Homes Pvt Ltd</strong>
      </div>
    </div>

    <div style="text-align:center;font-size:10px;color:#94a3b8;margin-top:24px;">
      This is an official computer-generated statement issued by The Unique Haven Homes Operations & Accounting.
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) {
          window.print();
        }
      }, 400);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    alert('Please allow popups in your browser to print the PDF statement.');
  }
};


