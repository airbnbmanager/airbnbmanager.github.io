// ═══════════════════════════════════════════════════════════
// 💸 DAILY EXPENSES (REIMBURSEMENTS) MODULE
// ═══════════════════════════════════════════════════════════

const REIMB_CATEGORIES = ['🚚 Delivery/Transport', '🛒 Grocery/Food', '📦 Other'];

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
  
  // Category-wise
  const catStats = {};
  (reimbs || []).forEach(r => {
    if (!catStats[r.category]) catStats[r.category] = 0;
    catStats[r.category] += Number(r.amount || 0);
  });
  
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

    ${Object.keys(catStats).length > 0 ? `
    <div class="card">
      <div class="section-title">📊 Category Breakdown</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        ${Object.entries(catStats).map(([cat, amt]) => `
          <div style="padding:12px;background:#F9FAFB;border-radius:8px;text-align:center;">
            <div style="font-size:13px;color:#666;">${cat}</div>
            <div style="font-size:18px;font-weight:700;">₹${amt.toLocaleString('en-IN')}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="section-title">📋 Records (${filtered.length})</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th><th>Category</th><th>Description</th>
          <th>Property</th><th style="text-align:right;">Amount</th>
          <th>Receipt</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:20px;color:#999;">No expenses found</td></tr>' : ''}
          ${filtered.map(r => {
            const statusColor = r.status === 'Received' ? 'green' : (r.status === 'Claimed' ? 'yellow' : 'red');
            const fromLbl = r.from_property ? (roomMap[r.from_property] || r.from_property) : '';
            const toLbl = r.to_property ? (roomMap[r.to_property] || r.to_property) : '';
            const propLabel = fromLbl && toLbl ? `${fromLbl} → ${toLbl}` : (fromLbl || toLbl || 'General');
            return `<tr>
              <td>${r.expense_date}</td>
              <td><span class="badge blue">${r.category}</span></td>
              <td style="max-width:200px;">${r.description || '-'}</td>
              <td style="font-size:11px;">${propLabel}</td>
              <td style="text-align:right;"><strong>₹${Number(r.amount || 0).toLocaleString('en-IN')}</strong></td>
              <td>${r.receipt_photo ? `<a href="${r.receipt_photo}" target="_blank"><img src="${r.receipt_photo}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;"></a>` : '-'}</td>
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
        <textarea id="rDesc" rows="2" placeholder="Kya kharcha kiya... e.g. Zepto se khana Aayush ke liye"></textarea>
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
        <option value="Big Bazaar">
        <option value="Local Market">
        <option value="Office">
        <option value="Home">
      </datalist>
      <div style="font-size:11px;color:#666;margin-top:4px;">
        💡 Type property name OR any location (e.g. "Big Bazaar", "Local Market")
      </div>
    </div>
    
    <div class="card">
      <div class="form-group">
        <label>Paid By</label>
        <input id="rPaidBy" type="text" value="${SESSION.displayName || SESSION.role || ''}" placeholder="Your name">
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
        <label style="font-weight:600;">💵 Payment Source</label>
        <div id="cashInfo" style="margin:8px 0;padding:10px;background:#fff;border-radius:6px;font-size:13px;">
          <div style="color:#666;">Loading available cash...</div>
        </div>
        <div style="margin-top:6px;" id="paySourceOptions">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;">
            <input type="radio" name="paySource" value="own_money" checked onchange="onPaySourceChange()"> 
            <span>💰 My Money (will claim later)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;" id="splitOption" style="display:none;">
            <input type="radio" name="paySource" value="split" onchange="onPaySourceChange()"> 
            <span>🔀 Split: Company cash + Own money</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px;" id="companyCashOption" style="display:none;">
            <input type="radio" name="paySource" value="company_cash" onchange="onPaySourceChange()"> 
            <span>🏢 Company Cash (from my in-hand)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="paySource" value="company_advance" onchange="onPaySourceChange()">
            <span>🏦 Company Advance</span>
          </label>
        </div>
        <div id="splitPreview" style="display:none;margin-top:10px;padding:10px;background:#FEF3C7;border-radius:6px;font-size:12px;">
          <!-- Split calculation shown here -->
        </div>
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
  
  // Preview + compress on file select (mobile safe)
  setupReimbPhotoInput('rPhotoCam', 'rPhotoGal', 'rPhotoPreview');
};

// Image compression (max 800px width, 70% quality)
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    // Check file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File too large (max 10MB)'));
      return;
    }
    
    const reader = new FileReader();
    const timeout = setTimeout(() => {
      reject(new Error('Read timeout — file may be corrupt'));
    }, 30000);
    
    reader.onload = e => {
      clearTimeout(timeout);
      const img = new Image();
      const imgTimeout = setTimeout(() => {
        reject(new Error('Image load timeout — HEIC not supported? Try JPEG'));
      }, 15000);
      
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
            else reject(new Error('Compression failed — try smaller image'));
          }, 'image/jpeg', quality);
        } catch (err) {
          reject(new Error('Canvas error: ' + err.message));
        }
      };
      img.onerror = () => {
        clearTimeout(imgTimeout);
        reject(new Error('Cannot read image (HEIC not supported in browser). Please convert to JPEG.'));
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('File read failed'));
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
  const paidBy = document.getElementById('rPaidBy').value.trim();
  const notes = document.getElementById('rNotes').value.trim();
  
  if (!date || !cat || !desc || amt <= 0) {
    document.getElementById('rErr').innerHTML = '<div class="error">Date, Category, Description, Amount required</div>';
    return;
  }
  
  // Upload photo if any
  let photoUrl = null;
  if (window._reimbPhotoBlob) {
    try {
      const path = `reimbursements/${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._reimbPhotoBlob, {
        contentType: 'image/jpeg'
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = sb.storage.from('id-proofs').getPublicUrl(path);
      photoUrl = publicUrl;
    } catch (err) {
      document.getElementById('rErr').innerHTML = '<div class="error">Photo upload: ' + err.message + '</div>';
      return;
    }
  }
  
  const paySource = document.querySelector('input[name="paySource"]:checked')?.value || 'own_money';
  const advanceId = paySource === 'company_advance' ? (parseInt(document.getElementById('rAdvanceId')?.value) || null) : null;
  const currentUser = SESSION.displayName || 'Praveen Singh';
  
  // Handle company_cash and split sources
  let finalSource = paySource;
  let companyPortionAmt = 0;
  let ownPortionAmt = amt;
  let paymentIdsToConsume = [];
  
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
    
    // FIFO consume payments
    let toConsume = companyPortionAmt;
    for (const pmt of data.payments) {
      if (toConsume <= 0) break;
      paymentIdsToConsume.push(pmt.id);
      toConsume -= Number(pmt.amount);
    }
  }
  
  const { error } = await sb.from('reimbursements').insert({
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
    status: 'Pending',
    created_by: SESSION.empId || null
  });
  
  if (error) {
    document.getElementById('rErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  // Mark consumed payments as handed_over
  if (paymentIdsToConsume.length > 0) {
    await sb.from('payment_history')
      .update({ handover_status: 'handed_over' })
      .in('id', paymentIdsToConsume);
    
    // Create handover record
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
  fsn.success('Success', '✅ Expense saved!' + (companyPortionAmt>0?` (₹${companyPortionAmt} from company cash)`:''));
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
        <label>Paid By</label>
        <input id="rPaidBy" type="text" value="${rec.paid_by || ''}">
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
        ${rec.receipt_photo ? `<div style="margin-bottom:8px;"><img src="${rec.receipt_photo}" style="max-width:150px;border-radius:6px;"><br><button class="btn-sm danger" onclick="removeExistingPhoto()">🗑️ Remove Photo</button></div>` : ''}
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
        <label style="font-weight:600;">💵 Payment Source</label>
        <div style="margin-top:6px;">
          <label><input type="radio" name="paySource" value="own_money" ${!rec.company_advance_id ? 'checked':''} onchange="toggleAdvanceDropdown(false)"> 💰 My Money</label><br>
          <label><input type="radio" name="paySource" value="company_advance" ${rec.company_advance_id ? 'checked':''} onchange="toggleAdvanceDropdown(true)"> 🏦 Company Advance</label>
        </div>
        <div id="advanceDropdownWrap" style="display:${rec.company_advance_id?'block':'none'};margin-top:10px;">
          <select id="rAdvanceId" style="width:100%;padding:8px;"><option value="">-- Loading --</option></select>
        </div>
      </div>
      <button onclick="updateReimbursement()" style="width:100%;">💾 Update Expense</button>
      <div id="rErr"></div>
    </div>
  `, 'reimbursements');
  
  // Photo change handler (mobile safe)
  setupReimbPhotoInput('rPhotoCam', 'rPhotoGal', 'rPhotoPreview');
};

window.removeExistingPhoto = async function() {
  if (!confirm('Remove existing photo? (Will delete from storage on Update)')) return;
  const oldPath = window._reimbEditPhoto;
  window._reimbEditPhoto = null;
  window._reimbDeleteOldPhoto = oldPath;
  // Hide preview immediately
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
  const paidBy = document.getElementById('rPaidBy').value.trim();
  const status = document.getElementById('rStatus').value;
  const notes = document.getElementById('rNotes').value.trim();
  
  if (!date || !cat || !desc || amt <= 0) {
    document.getElementById('rErr').innerHTML = '<div class="error">Date, Category, Description, Amount required</div>';
    return;
  }
  
  // Delete old photo if user removed it
  if (window._reimbDeleteOldPhoto) {
    try {
      const oldUrl = window._reimbDeleteOldPhoto;
      const oldPath = oldUrl.split('/id-proofs/')[1];
      if (oldPath) await sb.storage.from('id-proofs').remove([oldPath]);
    } catch (e) { console.warn('Old photo delete failed:', e); }
    window._reimbDeleteOldPhoto = null;
  }

  // Upload new photo if any
  let photoUrl = window._reimbEditPhoto;
  if (window._reimbPhotoBlob) {
    try {
      const path = `reimbursements/${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._reimbPhotoBlob, {
        contentType: window._reimbPhotoBlob.type || 'image/jpeg',
        upsert: false
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = sb.storage.from('id-proofs').getPublicUrl(path);
      photoUrl = publicUrl;
      // Also delete old if replacing
      if (window._reimbEditPhoto) {
        try {
          const oldPath = window._reimbEditPhoto.split('/id-proofs/')[1];
          if (oldPath) await sb.storage.from('id-proofs').remove([oldPath]);
        } catch (e) {}
      }
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
  
  // Auto-set claimed/received dates
  if (status === 'Claimed' && !window._reimbEditPhoto) updateObj.claimed_date = new Date().toISOString().slice(0,10);
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

console.log('✅ Reimbursements module loaded');


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



// ═══════════════════════════════════════════════════════════
// 💰 SMART CASH MANAGEMENT
// ═══════════════════════════════════════════════════════════

window._companyCashData = null;

window.loadAvailableCash = async function() {
  const currentUser = SESSION.displayName || 'Praveen Singh';
  
  // Get all in_hand payments for current user
  const { data: payments } = await sb.from('payment_history')
    .select('id, amount, payment_date, payment_mode')
    .eq('received_by', currentUser)
    .eq('handover_status', 'in_hand')
    .neq('verification_status', 'rejected')
    .order('payment_date', { ascending: true });  // FIFO - oldest first
  
  const totalCash = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  
  // Get pending own_money expenses (already claimed against this cash)
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

window.updateCashInfo = function() {
  const data = window._companyCashData;
  if (!data) return;
  
  const infoEl = document.getElementById('cashInfo');
  const amtInput = document.getElementById('rAmount');
  const enteredAmt = parseFloat(amtInput?.value) || 0;
  
  const shortBy = enteredAmt - data.netAvailable;
  
  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span>💰 <strong>${data.user}</strong> has:</span>
      <strong style="color:${data.netAvailable>0?'#059669':'#999'};font-size:16px;">₹${data.netAvailable.toLocaleString('en-IN')}</strong>
    </div>
    <div style="font-size:11px;color:#666;margin-top:2px;">
      (Received ₹${data.totalCash.toLocaleString('en-IN')} - Already claimed ₹${data.alreadySpent.toLocaleString('en-IN')})
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
  
  // Show/hide options based on availability
  const companyCashOpt = document.getElementById('companyCashOption');
  const splitOpt = document.getElementById('splitOption');
  
  if (data.netAvailable > 0) {
    if (enteredAmt > 0 && enteredAmt <= data.netAvailable) {
      // Full company cash available
      if (companyCashOpt) companyCashOpt.style.display = 'flex';
      if (splitOpt) splitOpt.style.display = 'none';
    } else if (enteredAmt > data.netAvailable) {
      // Split needed
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
  
  // Update split preview
  updateSplitPreview();
};

window.updateSplitPreview = function() {
  const source = document.querySelector('input[name="paySource"]:checked')?.value;
  const preview = document.getElementById('splitPreview');
  if (!preview) return;
  
  if (source === 'split') {
    const data = window._companyCashData;
    const amt = parseFloat(document.getElementById('rAmount')?.value) || 0;
    const fromCompany = Math.min(amt, data?.netAvailable || 0);
    const fromOwn = amt - fromCompany;
    
    preview.style.display = 'block';
    preview.innerHTML = `
      <strong>🔀 Split Payment Breakdown:</strong><br>
      🏢 From Company Cash: <strong>₹${fromCompany.toLocaleString('en-IN')}</strong><br>
      💰 From Own Money: <strong>₹${fromOwn.toLocaleString('en-IN')}</strong> <span style="color:#666;">(will be added to reimbursement)</span>
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
  
  updateSplitPreview();
};

// Watch amount input changes
document.addEventListener('input', e => {
  if (e.target?.id === 'rAmount') {
    updateCashInfo();
  }
});


// ═══════════════════════════════════════════════════════════
// 📷 MOBILE SAFE PHOTO UPLOAD HELPER
// ═══════════════════════════════════════════════════════════

function setupReimbPhotoInput(camId, galId, previewId) {
  const camEl = document.getElementById(camId);
  const galEl = document.getElementById(galId);
  const previewEl = document.getElementById(previewId);
  if (!camEl || !galEl || !previewEl) return;

  function handleFile(file) {
    if (!file) return;
    // Use booking's openCropModal
    if (typeof openCropModal === 'function') {
      openCropModal(file, (croppedFile) => {
        window._reimbPhotoBlob = croppedFile;
        showReimbPreview(croppedFile, previewEl);
      });
    } else {
      // Fallback: no crop, just use file
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

// ═══════════════════════════════════════════════════════════
// 📊 DAILY EXPENSES REPORT
// ═══════════════════════════════════════════════════════════

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

  // Person wise
  const byPerson = {};
  all.forEach(r => {
    const p = r.paid_by || 'Unknown';
    if (!byPerson[p]) byPerson[p] = { pending: 0, claimed: 0, received: 0, total: 0 };
    byPerson[p].total += Number(r.amount || 0);
    if (r.status === 'Pending') byPerson[p].pending += Number(r.amount || 0);
    else if (r.status === 'Claimed') byPerson[p].claimed += Number(r.amount || 0);
    else if (r.status === 'Received') byPerson[p].received += Number(r.amount || 0);
  });

  // Category wise
  const byCat = {};
  all.forEach(r => {
    const c = r.category || 'Other';
    if (!byCat[c]) byCat[c] = 0;
    byCat[c] += Number(r.amount || 0);
  });

  // WhatsApp text
  const waText = `💸 *Daily Expenses Report — ${currentMonth}*
━━━━━━━━━━━━━━━━━━━━
📊 *Summary*
Total Entries: ${all.length}
Total Amount: ₹${totalAmt.toLocaleString('en-IN')}
⏳ Pending: ₹${totalPending.toLocaleString('en-IN')} (${pending.length})
📤 Claimed: ₹${totalClaimed.toLocaleString('en-IN')} (${claimed.length})
✅ Received: ₹${totalReceived.toLocaleString('en-IN')} (${received.length})

👤 *Person-wise Dues*
${Object.entries(byPerson).map(([p, v]) => 
  `${p}: ₹${v.total.toLocaleString('en-IN')} (Pending: ₹${v.pending.toLocaleString('en-IN')})`
).join('\n')}

📂 *Category-wise*
${Object.entries(byCat).map(([c, a]) => 
  `${c}: ₹${a.toLocaleString('en-IN')}`
).join('\n')}
━━━━━━━━━━━━━━━━━━━━
UHHS — The Unique Haven Home Stay`;

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

      <div style="margin-bottom:16px;">
        <div style="font-weight:700;margin-bottom:8px;">👤 Person-wise Dues</div>
        ${Object.entries(byPerson).map(([p, v]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#F9FAFB;border-radius:6px;margin-bottom:4px;">
            <span><strong>${p}</strong></span>
            <span>₹${v.total.toLocaleString('en-IN')} <span style="color:#DC2626;">(Due: ₹${(v.pending + v.claimed).toLocaleString('en-IN')})</span></span>
          </div>`).join('')}
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-weight:700;margin-bottom:8px;">📂 Category-wise</div>
        ${Object.entries(byCat).map(([c, a]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#F9FAFB;border-radius:6px;margin-bottom:4px;">
            <span>${c}</span>
            <strong>₹${a.toLocaleString('en-IN')}</strong>
          </div>`).join('')}
      </div>

      <div style="display:flex;gap:10px;">
        <button onclick="
          navigator.clipboard.writeText(\`${waText.replace(/`/g, '\\`')}\`);
          fsn.success('Copied!','📋 WhatsApp text copied');
        " style="flex:1;background:#25D366;color:#fff;padding:10px;">📋 Copy WhatsApp</button>
        <button onclick="window.print()" style="flex:1;background:#3B82F6;color:#fff;padding:10px;">🖨️ Print</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

// ═══════════════════════════════════════════════════════════
// 💰 CLAIM ALL PENDING
// ═══════════════════════════════════════════════════════════

window.claimAllPending = async function() {
  const currentMonth = window._reimbMonth || new Date().toISOString().slice(0, 7);
  const monthStart = currentMonth + '-01';
  const monthEnd = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().slice(0, 10);

  const { data: pending } = await sb.from('reimbursements')
    .select('id, amount, paid_by, description')
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

  if (error) {
    fsn.error('Error', error.message);
    return;
  }

  fsn.success('Done!', `✅ ${pending.length} expenses claimed — ₹${total.toLocaleString('en-IN')}`);
  renderReimbursements();
};
