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
            const propLabel = r.from_property && r.to_property 
              ? `${roomMap[r.from_property] || r.from_property} → ${roomMap[r.to_property] || r.to_property}`
              : (r.from_property ? roomMap[r.from_property] || 'General' : 'General');
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
      <div class="section-title">📍 Property (Optional)</div>
      <div class="form-grid">
        <div class="form-group">
          <label>From Property</label>
          <select id="rFromProp">
            <option value="">-- Select --</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>To Property (if delivery)</label>
          <select id="rToProp">
            <option value="">-- Same as From --</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="form-group">
        <label>Paid By</label>
        <input id="rPaidBy" type="text" value="${SESSION.displayName || SESSION.role || ''}" placeholder="Your name">
      </div>
      <div class="form-group">
        <label>📸 Receipt Photo (auto-compressed)</label>
        <input id="rPhoto" type="file" accept="image/*" capture="environment">
        <div id="rPhotoPreview" style="margin-top:8px;"></div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="rNotes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
      <button onclick="saveReimbursement()" style="width:100%;">💾 Save Expense</button>
      <div id="rErr"></div>
    </div>
  `, 'reimbursements');
  
  // Preview + compress on file select
  document.getElementById('rPhoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('rPhotoPreview');
    preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
    try {
      const compressed = await compressImage(file);
      window._reimbPhotoBlob = compressed;
      const url = URL.createObjectURL(compressed);
      preview.innerHTML = `<img src="${url}" style="max-width:150px;max-height:150px;border-radius:8px;border:1px solid #ddd;">
        <div style="font-size:11px;color:#666;margin-top:4px;">Size: ${Math.round(compressed.size/1024)}KB</div>`;
    } catch (err) {
      preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
    }
  });
};

// Image compression (max 800px width, 70% quality)
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.saveReimbursement = async function() {
  const date = document.getElementById('rDate').value;
  const cat = document.getElementById('rCat').value;
  const desc = document.getElementById('rDesc').value.trim();
  const amt = parseFloat(document.getElementById('rAmt').value) || 0;
  const fromProp = document.getElementById('rFromProp').value || null;
  const toProp = document.getElementById('rToProp').value || null;
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
  
  const { error } = await sb.from('reimbursements').insert({
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
  
  window._reimbPhotoBlob = null;
  fsn.success('Success', '✅ Expense saved!');
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
  fsn.info('Info', 'Edit coming soon — delete and re-add for now');
};

window.deleteReimbursement = async function(id) {
  if (!confirm('Delete this expense?')) return;
  await sb.from('reimbursements').delete().eq('id', id);
  fsn.success('Success', '✅ Deleted');
  renderReimbursements();
};

console.log('✅ Reimbursements module loaded');
