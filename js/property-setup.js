/**
 * Property Setup Costs Module
 * Track initial costs when starting new property
 */

window.renderPropertySetup = async function() {
  if (!['owner', 'admin', 'developer', 'manager'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'property-setup');
    return;
  }
  
  const tab = window._psetupTab || 'list';
  const tabs = `
    <div class="card" style="padding:8px;margin-bottom:12px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button onclick="window._psetupTab='list';renderPropertySetup()" class="${tab==='list'?'':'secondary'}" style="flex:1;min-width:120px;">📋 All Expenses</button>
        <button onclick="window._psetupTab='add';renderPropertySetup()" class="${tab==='add'?'':'secondary'}" style="flex:1;min-width:120px;">➕ Add Expense</button>
        <button onclick="window._psetupTab='report';renderPropertySetup()" class="${tab==='report'?'':'secondary'}" style="flex:1;min-width:120px;">📊 Reports</button>
        <button onclick="window._psetupTab='cats';renderPropertySetup()" class="${tab==='cats'?'':'secondary'}" style="flex:1;min-width:120px;">⚙️ Categories</button>
      </div>
    </div>`;
  
  if (tab === 'list') return renderPSList(tabs);
  if (tab === 'add') return renderPSAdd(tabs);
  if (tab === 'report') return renderPSReport(tabs);
  if (tab === 'cats') return renderPSCategories(tabs);
};

// ═══ TAB 1: LIST ═══
async function renderPSList(tabs) {
  renderShell(`${tabs}<div class="loading">Loading...</div>`, 'property-setup');
  
  const [{ data: expenses }, { data: rooms }, { data: cats }] = await Promise.all([
    sb.from('property_setup_expenses').select('*').order('expense_date', { ascending: false }),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('property_setup_categories').select('*')
  ]);
  
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r.nickname || r.unit_no; });
  const catMap = {};
  (cats || []).forEach(c => { catMap[c.id] = c; });
  
  const propFilter = window._psetupPropFilter || 'All';
  const statusFilter = window._psetupStatusFilter || 'All';
  
  let filtered = expenses || [];
  if (propFilter !== 'All') filtered = filtered.filter(e => e.room_id === propFilter);
  if (statusFilter !== 'All') filtered = filtered.filter(e => e.payment_status === statusFilter);
  
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  const paid = filtered.reduce((s, e) => s + Number(e.paid_amount || 0), 0);
  const due = total - paid;
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>🏗️ Property Setup Costs</h1>
      <div class="sub">${filtered.length} of ${(expenses||[]).length} entries</div>
    </div>

    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="text-align:center;padding:12px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#1E40AF;">₹${total.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total Setup Cost</div>
        </div>
        <div style="text-align:center;padding:12px;background:#F0FDF4;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#059669;">₹${paid.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Paid</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEF2F2;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:${due>0?'#DC2626':'#059669'};">₹${due.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Due</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔍 Filters</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <select onchange="window._psetupPropFilter=this.value;renderPropertySetup()">
          <option value="All">🏠 All Properties</option>
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${propFilter===r.room_id?'selected':''}>${r.nickname||r.unit_no}</option>`).join('')}
        </select>
        <select onchange="window._psetupStatusFilter=this.value;renderPropertySetup()">
          <option value="All">📊 All Status</option>
          <option value="Pending" ${statusFilter==='Pending'?'selected':''}>⏳ Pending</option>
          <option value="Partial" ${statusFilter==='Partial'?'selected':''}>🟡 Partial</option>
          <option value="Paid" ${statusFilter==='Paid'?'selected':''}>✅ Paid</option>
        </select>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Date</th><th>Property</th><th>Category</th><th>Vendor</th>
        <th style="text-align:right;">Amount</th><th style="text-align:right;">Paid</th>
        <th>Status</th><th>Warranty</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${filtered.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:20px;color:#999;">No expenses. Click ➕ Add Expense tab.</td></tr>' : ''}
        ${filtered.map(e => {
          const cat = catMap[e.category_id];
          const statusColor = e.payment_status === 'Paid' ? 'green' : (e.payment_status === 'Partial' ? 'yellow' : 'red');
          const warrantyLeft = e.warranty_expires ? Math.round((new Date(e.warranty_expires) - new Date()) / (1000*60*60*24)) : null;
          return `<tr>
            <td>${e.expense_date}</td>
            <td>${roomMap[e.room_id] || e.room_id}</td>
            <td><span class="badge blue">${cat?cat.icon:'📦'} ${cat?cat.category_name:'?'}</span></td>
            <td>${e.vendor_name || '-'}</td>
            <td style="text-align:right;"><strong>₹${Number(e.amount).toLocaleString('en-IN')}</strong></td>
            <td style="text-align:right;color:#059669;">₹${Number(e.paid_amount||0).toLocaleString('en-IN')}</td>
            <td><span class="badge ${statusColor}">${e.payment_status}</span></td>
            <td style="font-size:11px;">${warrantyLeft !== null ? (warrantyLeft > 0 ? `${warrantyLeft} days` : '<span style="color:#DC2626;">Expired</span>') : '-'}</td>
            <td class="table-actions">
              <button class="btn-sm" onclick="editPSExpense(${e.id})">✏️</button>
              <button class="btn-sm danger" onclick="delPSExpense(${e.id})">🗑️</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div></div>
  `, 'property-setup');
}

// ═══ TAB 2: ADD ═══
async function renderPSAdd(tabs) {
  const [{ data: rooms }, { data: cats }] = await Promise.all([
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('property_setup_categories').select('*').eq('active', true).order('sort_order')
  ]);
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>➕ Add Setup Expense</h1>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Property *</label>
          <select id="psRoom">
            <option value="">-- Select --</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select id="psCategory">
            <option value="">-- Select --</option>
            ${(cats || []).map(c => `<option value="${c.id}">${c.icon} ${c.category_name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Date *</label>
          <input id="psDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="psAmount" type="number" placeholder="0">
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <input id="psDesc" type="text" placeholder="e.g. 2 King size beds from XYZ Furniture">
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Vendor Name</label>
          <input id="psVendor" type="text" placeholder="Shop/Company name">
        </div>
        <div class="form-group">
          <label>Payment Mode</label>
          <select id="psPayMode">
            <option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Paid Amount ₹</label>
          <input id="psPaid" type="number" value="0">
        </div>
        <div class="form-group">
          <label>Warranty (months)</label>
          <input id="psWarranty" type="number" value="0" placeholder="For appliances">
        </div>
      </div>
      <div class="form-group">
        <label>📸 Receipt Photo (compressed)</label>
        <input id="psPhoto" type="file" accept="image/*" capture="environment">
        <div id="psPhotoPreview" style="margin-top:8px;"></div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="psNotes" rows="2" placeholder="Additional details..."></textarea>
      </div>
      <button onclick="savePSExpense()" style="width:100%;">💾 Save Expense</button>
      <div id="psErr"></div>
    </div>
  `, 'property-setup');
  
  document.getElementById('psPhoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('psPhotoPreview');
    preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
    try {
      const compressed = await psCompressImage(file);
      window._psPhotoBlob = compressed;
      const url = URL.createObjectURL(compressed);
      preview.innerHTML = `<img src="${url}" style="max-width:150px;border-radius:8px;"><div style="font-size:11px;color:#666;">Size: ${Math.round(compressed.size/1024)}KB</div>`;
    } catch (err) {
      preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
    }
  });
}

async function psCompressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.savePSExpense = async function() {
  const room = document.getElementById('psRoom').value;
  const catId = document.getElementById('psCategory').value;
  const amount = parseFloat(document.getElementById('psAmount').value) || 0;
  const paid = parseFloat(document.getElementById('psPaid').value) || 0;
  
  if (!room || !catId || amount <= 0) {
    document.getElementById('psErr').innerHTML = '<div class="error">Property, Category, Amount required</div>';
    return;
  }
  
  let photoUrl = null;
  if (window._psPhotoBlob) {
    try {
      const path = `property-setup/${Date.now()}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._psPhotoBlob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      photoUrl = sb.storage.from('id-proofs').getPublicUrl(path).data.publicUrl;
    } catch (err) {
      document.getElementById('psErr').innerHTML = '<div class="error">Photo: ' + err.message + '</div>';
      return;
    }
  }
  
  const warrantyMonths = parseInt(document.getElementById('psWarranty').value) || 0;
  const expenseDate = document.getElementById('psDate').value;
  let warrantyExpires = null;
  if (warrantyMonths > 0) {
    const d = new Date(expenseDate);
    d.setMonth(d.getMonth() + warrantyMonths);
    warrantyExpires = d.toISOString().slice(0, 10);
  }
  
  const status = paid >= amount ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
  
  const { error } = await sb.from('property_setup_expenses').insert({
    room_id: room,
    category_id: parseInt(catId),
    expense_date: expenseDate,
    amount, paid_amount: paid,
    vendor_name: document.getElementById('psVendor').value.trim() || null,
    payment_mode: document.getElementById('psPayMode').value,
    payment_status: status,
    description: document.getElementById('psDesc').value.trim() || null,
    warranty_months: warrantyMonths,
    warranty_expires: warrantyExpires,
    receipt_photo: photoUrl,
    notes: document.getElementById('psNotes').value.trim() || null
  });
  
  if (error) {
    document.getElementById('psErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  window._psPhotoBlob = null;
  fsn.success('Success', '✅ Setup expense saved!');
  window._psetupTab = 'list';
  renderPropertySetup();
};

// ═══ TAB 3: REPORTS ═══
async function renderPSReport(tabs) {
  const [{ data: expenses }, { data: rooms }, { data: cats }] = await Promise.all([
    sb.from('property_setup_expenses').select('*'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('property_setup_categories').select('*')
  ]);
  
  const catMap = {};
  (cats || []).forEach(c => { catMap[c.id] = c; });
  
  // Group by property
  const propStats = {};
  (rooms || []).forEach(r => {
    propStats[r.room_id] = {
      name: r.nickname || r.unit_no,
      total: 0, paid: 0, categories: {}
    };
  });
  
  (expenses || []).forEach(e => {
    const p = propStats[e.room_id];
    if (!p) return;
    p.total += Number(e.amount || 0);
    p.paid += Number(e.paid_amount || 0);
    const catName = catMap[e.category_id]?.category_name || 'Unknown';
    p.categories[catName] = (p.categories[catName] || 0) + Number(e.amount || 0);
  });
  
  const grandTotal = Object.values(propStats).reduce((s, p) => s + p.total, 0);
  const grandPaid = Object.values(propStats).reduce((s, p) => s + p.paid, 0);
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>📊 Property-wise Setup Reports</h1>
    </div>
    
    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#1E40AF;">₹${grandTotal.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">All Properties Total</div>
        </div>
        <div style="text-align:center;padding:14px;background:#F0FDF4;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#059669;">₹${grandPaid.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total Paid</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FEF2F2;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:${(grandTotal-grandPaid)>0?'#DC2626':'#059669'};">₹${(grandTotal-grandPaid).toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total Due</div>
        </div>
      </div>
    </div>
    
    ${Object.entries(propStats).filter(([_, p]) => p.total > 0).map(([roomId, p]) => `
      <div class="card" style="border-left:4px solid #3B82F6;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div><h3 style="margin:0;">🏠 ${p.name}</h3></div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:800;">₹${p.total.toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:#666;">Paid: ₹${p.paid.toLocaleString('en-IN')} · Due: ₹${(p.total-p.paid).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div style="margin-top:12px;">
          <div class="section-title" style="font-size:12px;">Category Breakdown:</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
            ${Object.entries(p.categories).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => `
              <div style="padding:8px;background:#F9FAFB;border-radius:6px;">
                <div style="font-size:11px;color:#666;">${cat}</div>
                <div style="font-weight:700;">₹${amt.toLocaleString('en-IN')}</div>
                <div style="font-size:10px;color:#999;">${((amt/p.total)*100).toFixed(1)}%</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('') || '<div class="card"><div style="text-align:center;padding:20px;color:#999;">No expenses yet</div></div>'}
  `, 'property-setup');
}

// ═══ TAB 4: CATEGORIES ═══
async function renderPSCategories(tabs) {
  const { data: cats } = await sb.from('property_setup_categories').select('*').order('sort_order');
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>⚙️ Manage Categories</h1>
      <div class="sub">${(cats||[]).length} categories</div>
    </div>
    
    <div class="card">
      <div class="section-title">➕ Add New Category</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Icon (emoji)</label>
          <input id="newCatIcon" type="text" placeholder="📦" maxlength="4" value="📦">
        </div>
        <div class="form-group">
          <label>Category Name *</label>
          <input id="newCatName" type="text" placeholder="e.g. Fire Safety">
        </div>
      </div>
      <button onclick="addPSCategory()" style="width:100%;">➕ Add Category</button>
    </div>
    
    <div class="card">
      <div class="section-title">📋 All Categories</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Icon</th><th>Name</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          ${(cats || []).map(c => `<tr>
            <td style="font-size:18px;">${c.icon}</td>
            <td><strong>${c.category_name}</strong></td>
            <td><span class="badge ${c.active?'green':'red'}">${c.active?'Active':'Hidden'}</span></td>
            <td class="table-actions">
              <button class="btn-sm" onclick="togglePSCategory(${c.id},${!c.active})">${c.active?'🚫 Hide':'✅ Show'}</button>
              <button class="btn-sm" onclick="editPSCategory(${c.id})">✏️</button>
              <button class="btn-sm danger" onclick="delPSCategory(${c.id})">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  `, 'property-setup');
}

window.addPSCategory = async function() {
  const icon = document.getElementById('newCatIcon').value.trim() || '📦';
  const name = document.getElementById('newCatName').value.trim();
  if (!name) { fsn.error('Error', 'Name required'); return; }
  
  const { error } = await sb.from('property_setup_categories').insert({
    category_name: name, icon, sort_order: 50
  });
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Added', '✅ Category added');
  renderPropertySetup();
};

window.togglePSCategory = async function(id, active) {
  await sb.from('property_setup_categories').update({ active }).eq('id', id);
  renderPropertySetup();
};

window.editPSCategory = async function(id) {
  const { data: c } = await sb.from('property_setup_categories').select('*').eq('id', id).single();
  if (!c) return;
  const newName = prompt('Category name:', c.category_name);
  if (!newName) return;
  const newIcon = prompt('Icon (emoji):', c.icon) || c.icon;
  await sb.from('property_setup_categories').update({
    category_name: newName.trim(), icon: newIcon
  }).eq('id', id);
  fsn.success('Updated', '✅');
  renderPropertySetup();
};

window.delPSCategory = async function(id) {
  if (!confirm('Delete this category? Existing expenses will keep referring to it.')) return;
  await sb.from('property_setup_categories').delete().eq('id', id);
  fsn.success('Deleted', '✅');
  renderPropertySetup();
};

window.delPSExpense = async function(id) {
  if (!confirm('Delete this expense record?')) return;
  await sb.from('property_setup_expenses').delete().eq('id', id);
  fsn.success('Deleted', '✅');
  renderPropertySetup();
};

window.editPSExpense = async function(id) {
  const [{ data: e }, { data: rooms }, { data: cats }] = await Promise.all([
    sb.from('property_setup_expenses').select('*').eq('id', id).single(),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('property_setup_categories').select('*').eq('active', true).order('sort_order')
  ]);
  
  if (!e) { fsn.error('Error', 'Not found'); return; }
  window._psEditId = id;
  window._psEditPhoto = e.receipt_photo;
  
  const tab = window._psetupTab = 'edit';
  renderShell(`
    <div class="card">
      <h1>✏️ Edit Setup Expense</h1>
      <button class="secondary btn-sm" onclick="window._psetupTab='list';renderPropertySetup()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Property *</label>
          <select id="psRoom">
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id===e.room_id?'selected':''}>${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Category *</label>
          <select id="psCategory">
            ${(cats || []).map(c => `<option value="${c.id}" ${c.id===e.category_id?'selected':''}>${c.icon} ${c.category_name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Date</label><input id="psDate" type="date" value="${e.expense_date}"></div>
        <div class="form-group"><label>Amount ₹ *</label><input id="psAmount" type="number" value="${e.amount}"></div>
      </div>
      <div class="form-group"><label>Description</label><input id="psDesc" type="text" value="${e.description||''}"></div>
      <div class="form-grid">
        <div class="form-group"><label>Vendor</label><input id="psVendor" type="text" value="${e.vendor_name||''}"></div>
        <div class="form-group"><label>Payment Mode</label>
          <select id="psPayMode">
            <option ${e.payment_mode==='Cash'?'selected':''}>Cash</option>
            <option ${e.payment_mode==='UPI'?'selected':''}>UPI</option>
            <option ${e.payment_mode==='Bank'?'selected':''}>Bank</option>
            <option ${e.payment_mode==='Cheque'?'selected':''}>Cheque</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Paid ₹</label><input id="psPaid" type="number" value="${e.paid_amount||0}"></div>
        <div class="form-group"><label>Warranty (months)</label><input id="psWarranty" type="number" value="${e.warranty_months||0}"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="psNotes" rows="2">${e.notes||''}</textarea></div>
      <button onclick="updatePSExpense()" style="width:100%;">💾 Update</button>
      <div id="psErr"></div>
    </div>
  `, 'property-setup');
};

window.updatePSExpense = async function() {
  const id = window._psEditId;
  const amount = parseFloat(document.getElementById('psAmount').value) || 0;
  const paid = parseFloat(document.getElementById('psPaid').value) || 0;
  const status = paid >= amount ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
  
  const warrantyMonths = parseInt(document.getElementById('psWarranty').value) || 0;
  const expenseDate = document.getElementById('psDate').value;
  let warrantyExpires = null;
  if (warrantyMonths > 0) {
    const d = new Date(expenseDate);
    d.setMonth(d.getMonth() + warrantyMonths);
    warrantyExpires = d.toISOString().slice(0, 10);
  }
  
  const { error } = await sb.from('property_setup_expenses').update({
    room_id: document.getElementById('psRoom').value,
    category_id: parseInt(document.getElementById('psCategory').value),
    expense_date: expenseDate,
    amount, paid_amount: paid, payment_status: status,
    vendor_name: document.getElementById('psVendor').value.trim() || null,
    payment_mode: document.getElementById('psPayMode').value,
    description: document.getElementById('psDesc').value.trim() || null,
    warranty_months: warrantyMonths,
    warranty_expires: warrantyExpires,
    notes: document.getElementById('psNotes').value.trim() || null
  }).eq('id', id);
  
  if (error) { document.getElementById('psErr').innerHTML='<div class="error">'+error.message+'</div>'; return; }
  fsn.success('Success', '✅ Updated!');
  window._psetupTab = 'list';
  renderPropertySetup();
};

console.log('✅ Property Setup module loaded');
