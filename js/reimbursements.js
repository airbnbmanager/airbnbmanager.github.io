// ═══════════════════════════════════════════════════════════
// 💸 DAILY EXPENSES (REIMBURSEMENTS) MODULE v7
// ═══════════════════════════════════════════════════════════

const REIMB_CATEGORIES = ['🧹 Cleaning Supplies', '🚚 Delivery/Transport', '🛒 Grocery/Food', '🔧 Maintenance', '💡 Utilities', '📱 Recharge/Internet', '🎁 Guest Requests', '📦 Other'];

window.renderReimbursements = async function() {
  if (!['owner', 'admin', 'moderator', 'developer', 'manager'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'reimbursements');
    return;
  }
  
  renderShell('<div class="loading">Loading...</div>', 'reimbursements');
  
  const currentMonth = window._reimbMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const monthEnd = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().slice(0, 10);
  const statusFilter = window._reimbStatus || 'All';
  
  const [{ data: reimbs }, { data: rooms }] = await Promise.all([
    sb.from('reimbursements').select('*').gte('expense_date', monthStart).lte('expense_date', monthEnd).order('expense_date', { ascending: false }),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no')
  ]);
  
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r.nickname || r.unit_no; });
  
  const filtered = statusFilter === 'All' 
    ? (reimbs || []) 
    : (reimbs || []).filter(r => r.status === statusFilter);
  
  const totalAmount = (reimbs || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPending = (reimbs || []).filter(r => r.status === 'Pending').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalClaimed = (reimbs || []).filter(r => r.status === 'Claimed').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalReceived = (reimbs || []).filter(r => r.status === 'Received').reduce((s, r) => s + Number(r.amount || 0), 0);
  
  renderShell(`
    <div class="card">
      <h1>💸 Daily Expenses (Reimbursements)</h1>
      <div class="sub">${(reimbs||[]).length} entries — ${currentMonth}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button onclick="renderAddReimbursement()">➕ Add Expense</button>
        <button onclick="showReimbReport()" style="background:#7C3AED;color:#fff;">📊 Report</button>
        <button onclick="claimAllPending()" style="background:#DC2626;color:#fff;">💰 Claim All Pending</button>
        <input type="month" value="${currentMonth}" onchange="window._reimbMonth=this.value;renderReimbursements()" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);">
        <select onchange="window._reimbStatus=this.value;renderReimbursements()" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);">
          <option value="All" ${statusFilter==='All'?'selected':''}>All Status</option>
          <option value="Pending" ${statusFilter==='Pending'?'selected':''}>⏳ Pending</option>
          <option value="Claimed" ${statusFilter==='Claimed'?'selected':''}>📤 Claimed</option>
          <option value="Received" ${statusFilter==='Received'?'selected':''}>✅ Received</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#1E40AF;">₹${totalAmount.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Total</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FEF2F2;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#DC2626;">₹${totalPending.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">⏳ Pending</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FEF3C7;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#B45309;">₹${totalClaimed.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">📤 Claimed</div>
        </div>
        <div style="text-align:center;padding:14px;background:#F0FDF4;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#059669;">₹${totalReceived.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">✅ Received</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">📋 Records (${filtered.length})</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th><th>Category</th><th>Description</th>
          <th>Property</th><th>Payment Source</th><th style="text-align:right;">Amount</th>
          <th>Receipt</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:20px;color:#999;">No expenses found</td></tr>' : ''}
          ${filtered.map(r => {
            const statusColor = r.status === 'Received' ? 'green' : (r.status === 'Claimed' ? 'yellow' : 'red');
            const fromLbl = r.from_property ? (roomMap[r.from_property] || r.from_property) : '';
            const toLbl = r.to_property ? (roomMap[r.to_property] || r.to_property) : '';
            const propLabel = fromLbl && toLbl ? `${fromLbl} → ${toLbl}` : (fromLbl || toLbl || 'General');
            
            let sourceBadge = '💰 Personal';
            if (r.payment_source === 'uhhs_od') sourceBadge = '🏦 UHHS-OD';
            else if (r.payment_source === 'company_cash') sourceBadge = '💵 Co. Cash';
            else if (r.payment_source === 'company_upi') sourceBadge = '📱 Co. UPI';
            else if (r.company_advance_id) sourceBadge = '🏦 Co. Advance';

            return `<tr>
              <td>${r.expense_date}</td>
              <td><span class="badge blue">${r.category}</span></td>
              <td style="max-width:200px;">${r.description || '-'}</td>
              <td style="font-size:11px;">${propLabel}</td>
              <td><span class="badge ${r.payment_source === 'uhhs_od' ? 'blue' : (r.payment_source?.startsWith('company') ? 'yellow' : 'green')}">${sourceBadge}</span></td>
              <td style="text-align:right;"><strong>₹${Number(r.amount || 0).toLocaleString('en-IN')}</strong></td>
              <td>${r.receipt_photo ? `<button class="btn-sm" style="background:#3B82F6;color:#fff;padding:4px 10px;" onclick="dlIdPhoto('${r.receipt_photo.includes('/id-proofs/') ? r.receipt_photo.split('/id-proofs/')[1] : r.receipt_photo}')">📷 View</button>` : '-'}</td>
              <td><span class="badge ${statusColor}">${r.status}</span></td>
              <td class="table-actions">
                ${r.status === 'Pending' ? `<button class="btn-sm" style="background:#F59E0B;color:#fff;" onclick="markReimbClaimed(${r.id})" title="Mark as Claimed">📤</button>` : ''}
                ${r.status !== 'Received' ? `<button class="btn-sm" style="background:#10B981;color:#fff;" onclick="markReimbReceived(${r.id})" title="Mark as Received">✅</button>` : ''}
                <button class="btn-sm" onclick="editReimbursement(${r.id})">✏️</button>
                <button class="btn-sm danger" onclick="deleteReimbursement(${r.id})">🗑️</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
  `, 'reimbursements');
};

window.renderAddReimbursement = async function() {
  window._companyCashData = null;
  setTimeout(() => window.loadAvailableCash && window.loadAvailableCash(), 200);

  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no');
  
  renderShell(`
    <div class="card">
      <h1>➕ Add Daily Expense</h1>
      <button class="secondary btn-sm" onclick="renderReimbursements()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Date *</label>
          <input id="rDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select id="rCat">
            ${REIMB_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Description *</label>
        <textarea id="rDesc" rows="2" placeholder="Kya kharcha kiya... e.g. Gas cylinder refill"></textarea>
      </div>
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="rAmt" type="number" placeholder="0">
      </div>
    </div>
    
    <div class="card">
      <div class="section-title">📍 From / To Location (Optional)</div>
      <div class="form-grid">
        <div class="form-group">
          <label>From</label>
          <input id="rFromText" type="text" list="propList" placeholder="Property name OR any location...">
        </div>
        <div class="form-group">
          <label>To</label>
          <input id="rToText" type="text" list="propList" placeholder="Property name OR any location...">
        </div>
      </div>
      <datalist id="propList">
        ${(rooms || []).map(r => `<option value="${r.nickname || r.unit_no}">`).join('')}
      </datalist>
    </div>
    
    <div class="card">
      <div class="form-group">
        <label>💰 Paid By</label>
        <div id="rPaidByWrap"></div>
      </div>
      <div class="form-group">
          <label>📸 Receipt Photo</label>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <button type="button" class="btn-sm" style="background:#3B82F6;color:#fff;padding:8px 14px;" onclick="document.getElementById('rPhotoCam').click()">📷 Camera</button>
            <button type="button" class="btn-sm" style="background:#6B7280;color:#fff;padding:8px 14px;" onclick="document.getElementById('rPhotoGal').click()">🖼️ Gallery</button>
          </div>
          <input id="rPhotoCam" type="file" accept="image/*" capture="environment" style="display:none;">
          <input id="rPhotoGal" type="file" accept="image/*,image/heic,image/heif,.heic,.heif" style="display:none;">
        <div id="rPhotoPreview" style="margin-top:8px;"></div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="rNotes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
      
      <div id="cashAvailabilityBox" class="form-group" style="padding:12px;background:#F0F7FF;border-radius:8px;border:1px solid #3B82F6;">
        <label style="font-weight:600;">💵 Payment Source Selection</label>
        <div id="cashInfo" style="margin:8px 0;padding:10px;background:#fff;border-radius:6px;font-size:13px;">
          <div style="color:#666;">Loading available cash...</div>
        </div>
        <div style="margin-top:6px;" id="paySourceOptions">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="radio" name="paySource" value="own_money" checked onchange="onPaySourceChange()"> 
            <span>💰 My Pocket (will claim later)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="radio" name="paySource" value="uhhs_od" onchange="onPaySourceChange()"> 
            <span>🏦 UHHS-OD Account (Online Balance)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;" id="splitOption">
            <input type="radio" name="paySource" value="split" onchange="onPaySourceChange()"> 
            <span>🔀 Split: Company cash + Own money</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;" id="companyCashOption">
            <input type="radio" name="paySource" value="company_cash" onchange="onPaySourceChange()"> 
            <span>🏢 Company Cash (from my in-hand)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="radio" name="paySource" value="company_upi" onchange="onPaySourceChange()"> 
            <span>📱 Company UPI</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="paySource" value="company_advance" onchange="onPaySourceChange()">
            <span>🏦 Company Advance</span>
          </label>
        </div>
        <div id="splitPreview" style="display:none;margin-top:10px;padding:10px;background:#FEF3C7;border-radius:6px;font-size:12px;"></div>
        <div id="advanceDropdownWrap" style="display:none;margin-top:10px;">
          <select id="rAdvanceId" style="width:100%;padding:8px;">
            <option value="">-- Select active advance --</option>
          </select>
        </div>
      </div>
      <button onclick="saveReimbursement()" style="width:100%;">💾 Save Expense</button>
      <div id="rErr"></div>
    </div>
  `, 'reimbursements');
  
  setupReimbPhotoInput('rPhotoCam', 'rPhotoGal', 'rPhotoPreview');
  const defaultPaidBy = SESSION.displayName || SESSION.role || '';
  window.renderCashHolderDropdown('rPaidBy', defaultPaidBy).then(html => {
    const wrap = document.getElementById('rPaidByWrap');
    if (wrap) wrap.innerHTML = html;
  });
};

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File too large (max 10MB)'));
      return;
    }
    
    const reader = new FileReader();
    const timeout = setTimeout(() => { reject(new Error('Read timeout')); }, 30000);
    
    reader.onload = e => {
      clearTimeout(timeout);
      const img = new Image();
      const imgTimeout = setTimeout(() => { reject(new Error('Image load timeout')); }, 15000);
      
      img.onload = () => {
        clearTimeout(imgTimeout);
        try {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          }, 'image/jpeg', quality);
        } catch (err) { reject(new Error('Canvas error: ' + err.message)); }
      };
      img.onerror = () => { clearTimeout(imgTimeout); reject(new Error('Image parse failed')); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

window.saveReimbursement = async function() {
  const date = document.getElementById('rDate').value;
  const cat = document.getElementById('rCat').value;
  const desc = document.getElementById('rDesc').value.trim();
  const amt = parseFloat(document.getElementById('rAmt').value) || 0;
  const fromProp = document.getElementById('rFromText').value.trim() || null;
  const toProp = document.getElementById('rToText').value.trim() || null;
  const paidBy = await window.getCashHolderValue('rPaidBy');
  const notes = document.getElementById('rNotes').value.trim();
  
  if (!date || !cat || !desc || amt <= 0) {
    document.getElementById('rErr').innerHTML = '<div class="error">Date, Category, Description, Amount required</div>';
    return;
  }
  
  let photoUrl = null;
  if (window._reimbPhotoBlob) {
    try {
      const path = `reimbursements/${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._reimbPhotoBlob, {
        contentType: window._reimbPhotoBlob.type || 'image/jpeg',
        upsert: false
      });
      if (upErr) throw upErr;
      photoUrl = path;
    } catch (err) {
      document.getElementById('rErr').innerHTML = '<div class="error">Photo upload: ' + err.message + '</div>';
      return;
    }
  }
  
  const paySource = document.querySelector('input[name="paySource"]:checked')?.value || 'own_money';
  const advanceId = paySource === 'company_advance' ? (parseInt(document.getElementById('rAdvanceId')?.value) || null) : null;
  const currentUser = SESSION.displayName || 'Praveen Singh';
  
  let finalSource = paySource;
  let companyPortionAmt = 0;
  let ownPortionAmt = amt;
  let paymentIdsToConsume = [];
  
  // Directly Paid sources (No Claim needed)
  const isDirectCompanyFund = (paySource === 'uhhs_od' || paySource === 'company_upi');
  const initialStatus = isDirectCompanyFund ? 'Received' : 'Pending';

  if (paySource === 'company_cash' || paySource === 'split') {
    const data = window._companyCashData;
    if (!data || data.netAvailable <= 0) {
      document.getElementById('rErr').innerHTML = '<div class="error">No company cash available</div>';
      return;
    }
    
    if (paySource === 'company_cash') {
      if (amt > data.netAvailable) {
        document.getElementById('rErr').innerHTML = `<div class="error">Amount ₹${amt} exceeds available ₹${data.netAvailable}. Use Split option.</div>`;
        return;
      }
      companyPortionAmt = amt;
      ownPortionAmt = 0;
      finalSource = 'company_cash';
    } else {
      companyPortionAmt = Math.min(amt, data.netAvailable);
      ownPortionAmt = amt - companyPortionAmt;
      finalSource = 'split';
    }
    
    let toConsume = companyPortionAmt;
    for (const pmt of data.payments) {
      if (toConsume <= 0) break;
      paymentIdsToConsume.push(pmt.id);
      toConsume -= Number(pmt.amount);
    }
  } else if (isDirectCompanyFund) {
    companyPortionAmt = amt;
    ownPortionAmt = 0;
  }
  
  const { data: newR, error } = await sb.from('reimbursements').insert({
    payment_source: finalSource,
    company_advance_id: advanceId,
    consumed_payment_ids: paymentIdsToConsume.length > 0 ? paymentIdsToConsume.map(String) : null,
    company_portion: companyPortionAmt,
    own_portion: ownPortionAmt,
    expense_date: date,
    category: cat,
    description: desc,
    amount: amt,
    paid_by: paidBy,
    claim_from: 'Owner',
    from_property: fromProp,
    to_property: toProp,
    receipt_photo: photoUrl,
    notes,
    status: initialStatus,
    created_by: SESSION.empId || null
  }).select().single();
  
  if (error) {
    document.getElementById('rErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  // ── Auto-record transaction in account_transactions ──
  if (paySource === 'uhhs_od') {
    await sb.from('account_transactions').insert({
      account_type: 'UHHS_OD',
      transaction_type: 'EXPENSE',
      amount: amt,
      txn_date: date,
      description: `Expense: ${desc} (${cat})`,
      created_by: SESSION.displayName || 'Praveen'
    });
  } else if (paySource === 'company_upi') {
    await sb.from('account_transactions').insert({
      account_type: 'COMPANY_UPI',
      transaction_type: 'EXPENSE',
      amount: amt,
      txn_date: date,
      description: `UPI Spent: ${desc} (${cat})`,
      created_by: SESSION.displayName || 'Praveen'
    });
  }
  
  // Handover state update for Smart cash
  if (paymentIdsToConsume.length > 0) {
    await sb.from('payment_history')
      .update({ handover_status: 'handed_over' })
      .in('id', paymentIdsToConsume);
    
    await sb.from('cash_handovers').insert({
      handover_date: date,
      from_person: currentUser,
      to_person: 'Expense: ' + desc.substring(0,50),
      amount: companyPortionAmt,
      payment_ids: paymentIdsToConsume.map(String),
      notes: 'Auto-created from expense: ' + cat
    });
  }
  
  window._reimbPhotoBlob = null;
  fsn.success('Success', '✅ Expense saved!' + (companyPortionAmt>0?` (₹${companyPortionAmt} from company funds)`:''));
  renderReimbursements();
};

window.markReimbClaimed = async function(id) {
  await sb.from('reimbursements').update({
    status: 'Claimed',
    claimed_date: new Date().toISOString().slice(0,10)
  }).eq('id', id);
  fsn.success('Success', '📤 Marked as Claimed');
  renderReimbursements();
};

window.markReimbReceived = async function(id) {
  await sb.from('reimbursements').update({
    status: 'Received',
    received_date: new Date().toISOString().slice(0,10)
  }).eq('id', id);
  fsn.success('Success', '✅ Marked as Received');
  renderReimbursements();
};

window.editReimbursement = async function(id) {
  const [{ data: rec }, { data: rooms }] = await Promise.all([
    sb.from('reimbursements').select('*').eq('id', id).single(),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no')
  ]);
  
  if (!rec) { fsn.error('Error', 'Record not found'); return; }
  window._reimbEditId = id;
  window._reimbEditPhoto = rec.receipt_photo;
  
  renderShell(`
    <div class="card">
      <h1>✏️ Edit Daily Expense</h1>
      <button class="secondary btn-sm" onclick="renderReimbursements()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Date *</label>
          <input id="rDate" type="date" value="${rec.expense_date}">
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select id="rCat">
            ${REIMB_CATEGORIES.map(c => `<option value="${c}" ${c === rec.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Description *</label>
        <textarea id="rDesc" rows="2">${rec.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="rAmt" type="number" value="${rec.amount}">
      </div>
    </div>
    
    <div class="card">
      <div class="section-title">📍 From / To Location (Optional)</div>
      <div class="form-grid">
        <div class="form-group">
          <label>From</label>
          <input id="rFromText" type="text" list="propList" value="${rec.from_property || ''}" placeholder="Property or location">
        </div>
        <div class="form-group">
          <label>To</label>
          <input id="rToText" type="text" list="propList" value="${rec.to_property || ''}" placeholder="Property or location">
        </div>
      </div>
      <datalist id="propList">
        ${(rooms || []).map(r => `<option value="${r.nickname || r.unit_no}">`).join('')}
      </datalist>
    </div>
    
    <div class="card">
      <div class="form-group">
        <label>💰 Paid By</label>
        <div id="rPaidByWrap"></div>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="rStatus">
          <option value="Pending" ${rec.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="Claimed" ${rec.status === 'Claimed' ? 'selected' : ''}>📤 Claimed</option>
          <option value="Received" ${rec.status === 'Received' ? 'selected' : ''}>✅ Received</option>
        </select>
      </div>
      <div class="form-group">
        <label>📸 Receipt Photo</label>
        ${rec.receipt_photo ? `<div id="existingPhotoBox" style="margin-bottom:8px;padding:8px;background:#F0F7FF;border-radius:6px;">
            <div style="font-size:12px;color:#666;margin-bottom:6px;">📎 Existing receipt attached</div>
            <button type="button" class="btn-sm" style="background:#3B82F6;color:#fff;padding:6px 12px;" onclick="dlIdPhoto('${rec.receipt_photo.includes('/id-proofs/') ? rec.receipt_photo.split('/id-proofs/')[1] : rec.receipt_photo}')">📷 View</button>
            <button type="button" class="btn-sm danger" style="padding:6px 12px;" onclick="removeExistingPhoto()">🗑️ Remove Photo</button>
          </div>` : ''}
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <button type="button" class="btn-sm" style="background:#3B82F6;color:#fff;padding:8px 14px;" onclick="document.getElementById('rPhotoCam').click()">📷 Camera</button>
            <button type="button" class="btn-sm" style="background:#6B7280;color:#fff;padding:8px 14px;" onclick="document.getElementById('rPhotoGal').click()">🖼️ Gallery</button>
          </div>
          <input id="rPhotoCam" type="file" accept="image/*" capture="environment" style="display:none;">
          <input id="rPhotoGal" type="file" accept="image/*,image/heic,image/heif,.heic,.heif" style="display:none;">
        <div id="rPhotoPreview" style="margin-top:8px;"></div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="rNotes" rows="2">${rec.notes || ''}</textarea>
      </div>
      <div class="form-group" style="padding:12px;background:#F0F7FF;border-radius:8px;border:1px solid #3B82F6;">
        <label style="font-weight:600;">💵 Payment Source Selection</label>
        <div style="margin-top:6px;">
          <label><input type="radio" name="paySource" value="own_money" ${rec.payment_source === 'own_money' ? 'checked':''} onchange="onPaySourceChange()"> 💰 My Pocket</label><br>
          <label><input type="radio" name="paySource" value="uhhs_od" ${rec.payment_source === 'uhhs_od' ? 'checked':''} onchange="onPaySourceChange()"> 🏦 UHHS-OD (Online)</label><br>
          <label><input type="radio" name="paySource" value="company_cash" ${rec.payment_source === 'company_cash' ? 'checked':''} onchange="onPaySourceChange()"> 🏢 Company Cash</label><br>
          <label><input type="radio" name="paySource" value="company_upi" ${rec.payment_source === 'company_upi' ? 'checked':''} onchange="onPaySourceChange()"> 📱 Company UPI</label><br>
          <label><input type="radio" name="paySource" value="company_advance" ${rec.company_advance_id ? 'checked':''} onchange="onPaySourceChange()"> 🏦 Company Advance</label>
        </div>
        <div id="advanceDropdownWrap" style="display:${rec.company_advance_id?'block':'none'};margin-top:10px;">
          <select id="rAdvanceId" style="width:100%;padding:8px;"><option value="">-- Loading --</option></select>
        </div>
      </div>
      <button onclick="updateReimbursement()" style="width:100%;">💾 Update Expense</button>
      <div id="rErr"></div>
    </div>
  `, 'reimbursements');
  
  setupReimbPhotoInput('rPhotoCam', 'rPhotoGal', 'rPhotoPreview');
  window.renderCashHolderDropdown('rPaidBy', rec.paid_by || '').then(html => {
    const wrap = document.getElementById('rPaidByWrap');
    if (wrap) wrap.innerHTML = html;
  });
};

window.removeExistingPhoto = async function() {
  if (!confirm('Remove existing photo? (Will delete from storage on Update)')) return;
  const oldPath = window._reimbEditPhoto;
  window._reimbEditPhoto = null;
  window._reimbDeleteOldPhoto = oldPath;
  const previewImg = document.querySelector('[onclick*="removeExistingPhoto"]');
  if (previewImg) previewImg.parentElement.style.display = 'none';
  fsn.info('Info', '🗑️ Photo will be removed when you click Update');
};

window.updateReimbursement = async function() {
  const id = window._reimbEditId;
  const date = document.getElementById('rDate').value;
  const cat = document.getElementById('rCat').value;
  const desc = document.getElementById('rDesc').value.trim();
  const amt = parseFloat(document.getElementById('rAmt').value) || 0;
  const fromProp = document.getElementById('rFromText').value.trim() || null;
  const toProp = document.getElementById('rToText').value.trim() || null;
  const paidBy = await window.getCashHolderValue('rPaidBy');
  const status = document.getElementById('rStatus').value;
  const notes = document.getElementById('rNotes').value.trim();
  
  if (!date || !cat || !desc || amt <= 0) {
    document.getElementById('rErr').innerHTML = '<div class="error">Date, Category, Description, Amount required</div>';
    return;
  }
  
  if (window._reimbDeleteOldPhoto) {
    try {
      const oldUrl = window._reimbDeleteOldPhoto;
      const oldPath = oldUrl.includes('/id-proofs/') ? oldUrl.split('/id-proofs/')[1] : oldUrl;
      if (oldPath) await sb.storage.from('id-proofs').remove([oldPath]);
    } catch (e) { console.warn('Old photo delete failed:', e); }
    window._reimbDeleteOldPhoto = null;
  }

  let photoUrl = window._reimbEditPhoto;
  if (window._reimbPhotoBlob) {
    try {
      const path = `reimbursements/${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._reimbPhotoBlob, {
        contentType: window._reimbPhotoBlob.type || 'image/jpeg',
        upsert: false
      });
      if (upErr) throw upErr;
      photoUrl = path;
    } catch (err) {
      document.getElementById('rErr').innerHTML = '<div class="error">Photo upload failed: ' + err.message + '</div>';
      return;
    }
  }
  
  const paySource = document.querySelector('input[name="paySource"]:checked')?.value || 'own_money';
  const advanceId = paySource === 'company_advance' ? (parseInt(document.getElementById('rAdvanceId')?.value) || null) : null;
  
  const updateObj = {
    payment_source: paySource,
    company_advance_id: advanceId,
    expense_date: date,
    category: cat,
    description: desc,
    amount: amt,
    paid_by: paidBy,
    from_property: fromProp,
    to_property: toProp,
    receipt_photo: photoUrl,
    notes,
    status
  };
  
  if (status === 'Claimed') updateObj.claimed_date = new Date().toISOString().slice(0,10);
  if (status === 'Received') updateObj.received_date = new Date().toISOString().slice(0,10);
  
  const { error } = await sb.from('reimbursements').update(updateObj).eq('id', id);
  
  if (error) {
    document.getElementById('rErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  window._reimbPhotoBlob = null;
  window._reimbEditPhoto = null;
  fsn.success('Success', '✅ Updated!');
  renderReimbursements();
};

window.deleteReimbursement = async function(id) {
  if (!confirm('Delete this expense?')) return;
  await sb.from('reimbursements').delete().eq('id', id);
  fsn.success('Success', '✅ Deleted');
  renderReimbursements();
};

window.toggleAdvanceDropdown = async function(show) {
  const wrap = document.getElementById('advanceDropdownWrap');
  if (!wrap) return;
  wrap.style.display = show ? 'block' : 'none';
  if (show) {
    const sel = document.getElementById('rAdvanceId');
    if (sel && !sel.dataset.loaded) {
      const { data: advances } = await sb.from('company_advances')
        .select('*').eq('status', 'Active').order('advance_date', { ascending: false });
      sel.innerHTML = '<option value="">-- Select active advance --</option>' + 
        (advances || []).map(a => {
          const bal = Number(a.amount_given) - Number(a.amount_spent||0);
          return `<option value="${a.id}">₹${Number(a.amount_given).toLocaleString('en-IN')} from ${a.given_by} (${a.advance_date}) — Balance: ₹${bal.toLocaleString('en-IN')}</option>`;
        }).join('');
      sel.dataset.loaded = '1';
    }
  }
};

// ─── SMART CASH HANDOVER LOGIC ───
window._companyCashData = null;

window.loadAvailableCash = function() { return; }; window._old_loadAvailableCash = async function() {
  const currentUser = SESSION.displayName || 'Praveen Singh';
  
  const { data: payments } = await sb.from('payment_history')
    .select('id, amount, payment_date, payment_mode')
    .eq('received_by', currentUser)
    .eq('handover_status', 'in_hand')
    .neq('verification_status', 'rejected')
    .order('payment_date', { ascending: true });
  
  const totalCash = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  
  const { data: pendingExp } = await sb.from('reimbursements')
    .select('amount')
    .eq('paid_by', currentUser)
    .eq('payment_source', 'own_money')
    .neq('status', 'Received');
  
  const alreadySpent = (pendingExp || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const netAvailable = Math.max(0, totalCash - alreadySpent);
  
  window._companyCashData = {
    user: currentUser,
    totalCash,
    alreadySpent,
    netAvailable,
    payments: payments || []
  };
  
  updateCashInfo();
};

window.updateCashInfo = function() { return; }; window._old_updateCashInfo = function() {
  const data = window._companyCashData;
  if (!data) return;
  
  const infoEl = document.getElementById('cashInfo');
  const amtInput = document.getElementById('rAmt');
  const enteredAmt = parseFloat(amtInput?.value) || 0;
  
  const shortBy = enteredAmt - data.netAvailable;
  
  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span>💰 <strong>${data.user}</strong> has cash:</span>
      <strong style="color:${data.netAvailable>0?'#059669':'#999'};font-size:16px;">₹${data.netAvailable.toLocaleString('en-IN')}</strong>
    </div>
    <div style="font-size:11px;color:#666;margin-top:2px;">
      (Received ₹${data.totalCash.toLocaleString('en-IN')} - Pending claims ₹${data.alreadySpent.toLocaleString('en-IN')})
    </div>
  `;
  
  if (enteredAmt > 0) {
    if (shortBy > 0 && data.netAvailable > 0) {
      html += `
        <div style="margin-top:8px;padding:6px;background:#FEF3C7;border-radius:4px;font-size:12px;">
          ⚠️ Amount ₹${enteredAmt.toLocaleString('en-IN')} > Available ₹${data.netAvailable.toLocaleString('en-IN')}<br>
          <strong>Short by: ₹${shortBy.toLocaleString('en-IN')}</strong>
        </div>
      `;
    } else if (enteredAmt <= data.netAvailable && data.netAvailable > 0) {
      html += `
        <div style="margin-top:8px;padding:6px;background:#F0FDF4;border-radius:4px;font-size:12px;color:#059669;">
          ✅ Enough company cash available
        </div>
      `;
    }
  }
  
  infoEl.innerHTML = html;
  
  const companyCashOpt = document.getElementById('companyCashOption');
  const splitOpt = document.getElementById('splitOption');
  
  if (data.netAvailable > 0) {
    if (enteredAmt > 0 && enteredAmt <= data.netAvailable) {
      if (companyCashOpt) companyCashOpt.style.display = 'flex';
      if (splitOpt) splitOpt.style.display = 'none';
    } else if (enteredAmt > data.netAvailable) {
      if (companyCashOpt) companyCashOpt.style.display = 'none';
      if (splitOpt) splitOpt.style.display = 'flex';
    } else {
      if (companyCashOpt) companyCashOpt.style.display = 'flex';
      if (splitOpt) splitOpt.style.display = 'flex';
    }
  } else {
    if (companyCashOpt) companyCashOpt.style.display = 'none';
    if (splitOpt) splitOpt.style.display = 'none';
  }
  
  updateSplitPreview();
};

window.updateSplitPreview = function() {
  const source = document.querySelector('input[name="paySource"]:checked')?.value;
  const preview = document.getElementById('splitPreview');
  if (!preview) return;
  
  if (source === 'split') {
    const data = window._companyCashData;
    const amt = parseFloat(document.getElementById('rAmt')?.value) || 0;
    const fromCompany = Math.min(amt, data?.netAvailable || 0);
    const fromOwn = amt - fromCompany;
    
    preview.style.display = 'block';
    preview.innerHTML = `
      <strong>🔀 Split Payment Breakdown:</strong><br>
      🏢 From Company Cash: <strong>₹${fromCompany.toLocaleString('en-IN')}</strong><br>
      💰 From Own Money: <strong>₹${fromOwn.toLocaleString('en-IN')}</strong>
    `;
  } else {
    preview.style.display = 'none';
  }
};

window.onPaySourceChange = function() {
  const source = document.querySelector('input[name="paySource"]:checked')?.value;
  const advWrap = document.getElementById('advanceDropdownWrap');
  
  if (advWrap) advWrap.style.display = source === 'company_advance' ? 'block' : 'none';
  if (source === 'company_advance') {
    toggleAdvanceDropdown(true);
  }
  
  const hint = document.getElementById('uhhsOdHint');
  if (hint) hint.style.display = source === 'uhhs_od' ? 'block' : 'none';

  updateSplitPreview();
};

// Amount input tracking
document.addEventListener('input', e => {
  if (e.target?.id === 'rAmt') {
    updateCashInfo();
  }
});

function setupReimbPhotoInput(camId, galId, previewId) {
  const camEl = document.getElementById(camId);
  const galEl = document.getElementById(galId);
  const previewEl = document.getElementById(previewId);
  if (!camEl || !galEl || !previewEl) return;

  function handleFile(file) {
    if (!file) return;
    if (typeof openCropModal === 'function') {
      openCropModal(file, (croppedFile) => {
        window._reimbPhotoBlob = croppedFile;
        showReimbPreview(croppedFile, previewEl);
      });
    } else {
      window._reimbPhotoBlob = file;
      showReimbPreview(file, previewEl);
    }
  }

  camEl.addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });
  galEl.addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });
}

function showReimbPreview(file, previewEl) {
  const url = URL.createObjectURL(file);
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  previewEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid #10B981;margin:6px 0;">
      <img src="${url}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;" />
      <div style="flex:1;">
        <div style="font-size:12px;color:#059669;font-weight:700;">✅ Photo Ready</div>
        <div style="font-size:10px;color:#666;">${sizeMB} MB · Save to upload</div>
      </div>
      <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
        onclick="window._reimbPhotoBlob=null;this.parentElement.parentElement.innerHTML='';">🗑️</button>
    </div>`;
}

window.showReimbReport = async function() {
  const currentMonth = window._reimbMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const monthEnd = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().slice(0, 10);

  const { data: reimbs } = await sb.from('reimbursements')
    .select('*')
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd)
    .order('expense_date', { ascending: true });

  const all = reimbs || [];
  const totalAmt = all.reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = all.filter(r => r.status === 'Pending');
  const claimed = all.filter(r => r.status === 'Claimed');
  const received = all.filter(r => r.status === 'Received');

  const totalPending = pending.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalClaimed = claimed.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalReceived = received.reduce((s, r) => s + Number(r.amount || 0), 0);

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;">📊 Expenses Report</h2>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:16px;">Month: ${currentMonth}</div>

      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px;">
        <div style="padding:12px;background:#EFF6FF;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#1E40AF;">₹${totalAmt.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Total (${all.length})</div>
        </div>
        <div style="padding:12px;background:#FEF2F2;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#DC2626;">₹${totalPending.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">⏳ Pending (${pending.length})</div>
        </div>
        <div style="padding:12px;background:#FEF3C7;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#B45309;">₹${totalClaimed.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">📤 Claimed (${claimed.length})</div>
        </div>
        <div style="padding:12px;background:#F0FDF4;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#059669;">₹${totalReceived.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">✅ Received (${received.length})</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;">
        <button onclick="window.print()" style="flex:1;background:#3B82F6;color:#fff;padding:10px;border:none;border-radius:6px;cursor:pointer;">🖨️ Print</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;background:#64748B;color:#fff;padding:10px;border:none;border-radius:6px;cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.claimAllPending = async function() {
  const currentMonth = window._reimbMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const monthEnd = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().slice(0, 10);

  const { data: pending } = await sb.from('reimbursements')
    .select('id, amount')
    .eq('status', 'Pending')
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd);

  if (!pending || pending.length === 0) {
    fsn.info('No Pending', 'Koi pending expense nahi hai is month me');
    return;
  }

  const total = pending.reduce((s, r) => s + Number(r.amount || 0), 0);
  if (!confirm(`💰 ${pending.length} pending expenses ko "Claimed" mark karein?\nTotal: ₹${total.toLocaleString('en-IN')}`)) return;

  const ids = pending.map(r => r.id);
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await sb.from('reimbursements')
    .update({ status: 'Claimed', claimed_date: today })
    .in('id', ids);

  if (error) { fsn.error('Error', error.message); return; }

  fsn.success('Done!', `✅ ${pending.length} expenses claimed — ₹${total.toLocaleString('en-IN')}`);
  renderReimbursements();
};

console.log('✅ Reimbursements module v7 loaded (UHHS-OD / Company Cash / UPI)');
