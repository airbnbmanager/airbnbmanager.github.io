/**
 * Maintenance Module (v2)
 * UNIQUE HAVEN HOMES STAY
 */

const MAINT_TYPES = [
  '🔌 Electrical', '🚿 Plumbing', '🪑 Furniture', '📱 Appliance',
  '🎨 Painting', '🧹 Cleaning', '🌡️ AC/Heater', '📶 WiFi/Internet',
  '🔑 Locks/Keys', '💡 Lighting', '🛁 Bathroom', '🍽️ Kitchen', '📦 Other'
];

const MAINT_PRIORITIES = ['🔴 Urgent', '🟡 High', '🟢 Normal', '🔵 Low'];
const MAINT_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Verified'];

async function renderMaintenanceLog() {
  renderShell(`<div class="loading">Loading...</div>`, 'maintenance');
  
  const monthFilter = window._maintMonth || 'All';
  const statusFilter = window._maintStatus || 'All';
  const propFilter = window._maintProp || 'All';
  const priorityFilter = window._maintPriority || 'All';
  
  const [{ data: logs }, { data: rooms }, { data: emps }] = await Promise.all([
    sb.from('maintenance_log').select('*').order('reported_date', { ascending: false }),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('employees').select('emp_id, name').eq('status', 'Active')
  ]);
  
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r; });
  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e.name; });
  
  // Apply filters
  let filtered = logs || [];
  if (monthFilter !== 'All') filtered = filtered.filter(l => (l.reported_date || '').startsWith(monthFilter));
  if (statusFilter !== 'All') filtered = filtered.filter(l => (l.status || 'Pending') === statusFilter);
  if (propFilter !== 'All') filtered = filtered.filter(l => l.room_id === propFilter);
  if (priorityFilter !== 'All') filtered = filtered.filter(l => (l.priority || 'Normal') === priorityFilter);
  
  // Stats
  const totalCost = filtered.reduce((s, l) => s + Number(l.cost || 0), 0);
  const pending = filtered.filter(l => (l.status || 'Pending') === 'Pending').length;
  const inProgress = filtered.filter(l => l.status === 'In Progress').length;
  const resolved = filtered.filter(l => l.status === 'Resolved' || l.status === 'Verified').length;
  const urgent = filtered.filter(l => l.priority === '🔴 Urgent' && (l.status || 'Pending') !== 'Resolved' && l.status !== 'Verified').length;
  
  // Month options (from data)
  const months = [...new Set((logs || []).map(l => (l.reported_date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  
  renderShell(`
    <div class="card">
      <h1>🔧 Maintenance</h1>
      <div class="sub">${filtered.length} of ${(logs||[]).length} entries</div>
      <button onclick="renderAddMaintenance()">➕ Add Issue</button>
    </div>

    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
        <div style="text-align:center;padding:12px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#1E40AF;">₹${totalCost.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">Total Cost</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEF2F2;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#DC2626;">${pending}</div>
          <div style="font-size:11px;color:#666;">⏳ Pending</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEF3C7;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#B45309;">${inProgress}</div>
          <div style="font-size:11px;color:#666;">🔧 In Progress</div>
        </div>
        <div style="text-align:center;padding:12px;background:#F0FDF4;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#059669;">${resolved}</div>
          <div style="font-size:11px;color:#666;">✅ Resolved</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEE2E2;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#991B1B;">${urgent}</div>
          <div style="font-size:11px;color:#666;">🔴 Urgent</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔍 Filters</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
        <select onchange="window._maintMonth=this.value;renderMaintenanceLog()">
          <option value="All" ${monthFilter==='All'?'selected':''}>📅 All Months</option>
          ${months.map(m => `<option value="${m}" ${monthFilter===m?'selected':''}>${m}</option>`).join('')}
        </select>
        <select onchange="window._maintStatus=this.value;renderMaintenanceLog()">
          <option value="All" ${statusFilter==='All'?'selected':''}>📊 All Status</option>
          ${MAINT_STATUSES.map(s => `<option value="${s}" ${statusFilter===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <select onchange="window._maintProp=this.value;renderMaintenanceLog()">
          <option value="All" ${propFilter==='All'?'selected':''}>🏠 All Properties</option>
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${propFilter===r.room_id?'selected':''}>${r.nickname || r.unit_no}</option>`).join('')}
        </select>
        <select onchange="window._maintPriority=this.value;renderMaintenanceLog()">
          <option value="All" ${priorityFilter==='All'?'selected':''}>⚡ All Priority</option>
          ${MAINT_PRIORITIES.map(p => `<option value="${p}" ${priorityFilter===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Priority</th><th>Property</th><th>Type</th><th>Description</th>
        <th>Assigned</th><th>Cost</th><th>Status</th><th>Date</th><th>Photo</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${filtered.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:20px;color:#999;">No entries found</td></tr>' : ''}
        ${filtered.map(l => {
          const status = l.status || 'Pending';
          const statusClass = status === 'Resolved' || status === 'Verified' ? 'green' : status === 'In Progress' ? 'yellow' : 'red';
          const priority = l.priority || 'Normal';
          return `<tr>
            <td><span class="badge" style="font-size:10px;">${priority.startsWith('🔴')?'🔴':priority.startsWith('🟡')?'🟡':priority.startsWith('🟢')?'🟢':'🔵'}</span></td>
            <td>${propLabel(roomMap[l.room_id]) || l.room_id || 'General'}</td>
            <td><span class="badge blue" style="font-size:10px;">${l.issue_type || '-'}</span></td>
            <td style="max-width:200px;font-size:12px;">${l.description || '-'}</td>
            <td style="font-size:11px;">${empMap[l.assigned_to] || l.vendor_name || '-'}</td>
            <td>₹${Number(l.cost || 0).toLocaleString('en-IN')}</td>
            <td><span class="badge ${statusClass}" style="font-size:10px;">${status}</span></td>
            <td style="font-size:11px;">${l.reported_date || '-'}</td>
            <td>${l.photo_after ? `<a href="${l.photo_after}" target="_blank"><img src="${l.photo_after}" style="width:35px;height:35px;object-fit:cover;border-radius:4px;"></a>` : (l.photo_before ? `<a href="${l.photo_before}" target="_blank"><img src="${l.photo_before}" style="width:35px;height:35px;object-fit:cover;border-radius:4px;border:2px solid #F59E0B;" title="Before photo"></a>` : '-')}</td>
            <td class="table-actions">
              <button class="btn-sm" onclick="editMaintenance(${l.id})">✏️</button>
              ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="delMaintenance(${l.id})">🗑️</button>` : ''}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div></div>
  `, 'maintenance');
}

async function renderAddMaintenance() {
  const [{ data: rooms }, { data: emps }] = await Promise.all([
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name')
  ]);
  
  renderShell(`
    <div class="card"><h1>➕ Add Maintenance Issue</h1><button class="secondary btn-sm" onclick="renderMaintenanceLog()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Property</label>
          <select id="mRoom">
            <option value="">General</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${propLabel(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Priority *</label>
          <select id="mPriority">
            ${MAINT_PRIORITIES.map(p => `<option value="${p}" ${p==='🟢 Normal'?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Issue Type *</label>
        <select id="mType" onchange="handleMaintTypeChange(this)">
          ${MAINT_TYPES.map(t => `<option>${t}</option>`).join('')}
          <option value="__custom__" style="color:#059669;font-weight:700;">✏️ Custom (type your own)...</option>
        </select>
        <input id="mTypeCustom" type="text" placeholder="Enter custom type..." style="display:none;margin-top:8px;">
      </div>
      <div class="form-group">
        <label>Description *</label>
        <textarea id="mDesc" rows="3" placeholder="What happened? Details..."></textarea>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Cost ₹</label>
          <input id="mCost" type="number" value="0">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input id="mDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Assigned To (Employee)</label>
          <select id="mAssigned">
            <option value="">-- None --</option>
            ${(emps || []).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Vendor Name (external)</label>
          <input id="mVendor" type="text" placeholder="e.g. ABC Electrician">
        </div>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="mStatus">
          ${MAINT_STATUSES.map(s => `<option>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>📸 Photo (before repair)</label>
        <input id="mPhoto" type="file" accept="image/*" capture="environment">
        <div id="mPhotoPreview" style="margin-top:8px;"></div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="mNotes" rows="2" placeholder="Additional notes..."></textarea>
      </div>
      <button onclick="saveMaintenance()" style="width:100%;">💾 Save Issue</button>
      <div id="mErr"></div>
    </div>
  `, 'maintenance');
  
  document.getElementById('mPhoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('mPhotoPreview');
    preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
    try {
      const compressed = await maintCompressImage(file);
      window._maintPhotoBlob = compressed;
      const url = URL.createObjectURL(compressed);
      preview.innerHTML = `<img src="${url}" style="max-width:150px;border-radius:8px;border:1px solid #ddd;">
        <div style="font-size:11px;color:#666;">Size: ${Math.round(compressed.size/1024)}KB</div>`;
    } catch (err) {
      preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
    }
  });
}

async function maintCompressImage(file, maxWidth = 800, quality = 0.7) {
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

window.handleMaintTypeChange = function(select) {
  const customInput = document.getElementById('mTypeCustom');
  if (select.value === '__custom__') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = '';
  }
};

function getMaintType() {
  const sel = document.getElementById('mType');
  if (sel.value === '__custom__') {
    return document.getElementById('mTypeCustom').value.trim() || 'Other';
  }
  return sel.value;
}

async function saveMaintenance() {
  const desc = document.getElementById('mDesc').value.trim();
  if (!desc) {
    document.getElementById('mErr').innerHTML = '<div class="error">Description required</div>';
    return;
  }
  
  let photoUrl = null;
  if (window._maintPhotoBlob) {
    try {
      const path = `maintenance/${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._maintPhotoBlob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      photoUrl = sb.storage.from('id-proofs').getPublicUrl(path).data.publicUrl;
    } catch (err) {
      document.getElementById('mErr').innerHTML = '<div class="error">Photo: ' + err.message + '</div>';
      return;
    }
  }
  
  const { error } = await sb.from('maintenance_log').insert({
    room_id: document.getElementById('mRoom').value || null,
    issue_type: getMaintType(),
    priority: document.getElementById('mPriority').value,
    description: desc,
    cost: parseFloat(document.getElementById('mCost').value) || 0,
    reported_date: document.getElementById('mDate').value,
    assigned_to: document.getElementById('mAssigned').value || null,
    vendor_name: document.getElementById('mVendor').value.trim() || null,
    status: document.getElementById('mStatus').value,
    photo_before: photoUrl,
    notes: document.getElementById('mNotes').value.trim() || null
  });
  
  if (error) {
    document.getElementById('mErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  window._maintPhotoBlob = null;
  fsn.success('Success', '✅ Issue saved!');
  renderMaintenanceLog();
}

async function editMaintenance(id) {
  const [{ data: m }, { data: rooms }, { data: emps }] = await Promise.all([
    sb.from('maintenance_log').select('*').eq('id', id).single(),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name')
  ]);
  
  if (!m) { fsn.error('Error', 'Not found'); return; }
  window._maintEditId = id;
  window._maintEditPhotoBefore = m.photo_before;
  window._maintEditPhotoAfter = m.photo_after;
  
  renderShell(`
    <div class="card"><h1>✏️ Edit Issue</h1><button class="secondary btn-sm" onclick="renderMaintenanceLog()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Property</label>
          <select id="mRoom">
            <option value="">General</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id===m.room_id?'selected':''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="mPriority">
            ${MAINT_PRIORITIES.map(p => `<option value="${p}" ${p===(m.priority||'🟢 Normal')?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Issue Type</label>
        <select id="mType" onchange="handleMaintTypeChange(this)">
          ${MAINT_TYPES.map(t => `<option ${t===m.issue_type?'selected':''}>${t}</option>`).join('')}
          ${m.issue_type && !MAINT_TYPES.includes(m.issue_type) ? `<option value="${m.issue_type}" selected>${m.issue_type}</option>` : ''}
          <option value="__custom__" style="color:#059669;font-weight:700;">✏️ Custom (type your own)...</option>
        </select>
        <input id="mTypeCustom" type="text" placeholder="Enter custom type..." style="display:none;margin-top:8px;">
      </div>
      <div class="form-group">
        <label>Description *</label>
        <textarea id="mDesc" rows="3">${m.description || ''}</textarea>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Cost ₹</label>
          <input id="mCost" type="number" value="${m.cost || 0}">
        </div>
        <div class="form-group">
          <label>Reported Date</label>
          <input id="mDate" type="date" value="${m.reported_date || ''}">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Assigned To</label>
          <select id="mAssigned">
            <option value="">-- None --</option>
            ${(emps || []).map(e => `<option value="${e.emp_id}" ${e.emp_id===m.assigned_to?'selected':''}>${e.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Vendor Name</label>
          <input id="mVendor" type="text" value="${m.vendor_name || ''}">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Status</label>
          <select id="mStatus">
            ${MAINT_STATUSES.map(s => `<option ${s===(m.status||'Pending')?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Resolved Date</label>
          <input id="mResolvedDate" type="date" value="${m.resolved_date || ''}">
        </div>
      </div>
      
      ${m.photo_before ? `<div class="form-group">
        <label>📸 Before Photo (existing)</label>
        <div><img src="${m.photo_before}" style="max-width:150px;border-radius:6px;"></div>
      </div>` : ''}
      
      <div class="form-group">
        <label>📸 After Photo (post-repair)</label>
        ${m.photo_after ? `<div style="margin-bottom:8px;"><img src="${m.photo_after}" style="max-width:150px;border-radius:6px;"></div>` : ''}
        <input id="mPhotoAfter" type="file" accept="image/*" capture="environment">
        <div id="mPhotoAfterPreview" style="margin-top:8px;"></div>
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <textarea id="mNotes" rows="2">${m.notes || ''}</textarea>
      </div>
      <button onclick="updateMaintenance()" style="width:100%;">💾 Update Issue</button>
      <div id="mErr"></div>
    </div>
  `, 'maintenance');
  
  document.getElementById('mPhotoAfter').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('mPhotoAfterPreview');
    preview.innerHTML = '<div style="color:#666;">Compressing...</div>';
    try {
      const compressed = await maintCompressImage(file);
      window._maintAfterPhotoBlob = compressed;
      const url = URL.createObjectURL(compressed);
      preview.innerHTML = `<img src="${url}" style="max-width:150px;border-radius:8px;border:1px solid #ddd;">`;
    } catch (err) {
      preview.innerHTML = '<div style="color:#DC2626;">Error: ' + err.message + '</div>';
    }
  });
}

async function updateMaintenance() {
  const id = window._maintEditId;
  const desc = document.getElementById('mDesc').value.trim();
  if (!desc) {
    document.getElementById('mErr').innerHTML = '<div class="error">Description required</div>';
    return;
  }
  
  let photoAfterUrl = window._maintEditPhotoAfter;
  if (window._maintAfterPhotoBlob) {
    try {
      const path = `maintenance/${Date.now()}_after.jpg`;
      const { error: upErr } = await sb.storage.from('id-proofs').upload(path, window._maintAfterPhotoBlob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      photoAfterUrl = sb.storage.from('id-proofs').getPublicUrl(path).data.publicUrl;
    } catch (err) {
      document.getElementById('mErr').innerHTML = '<div class="error">Photo: ' + err.message + '</div>';
      return;
    }
  }
  
  const status = document.getElementById('mStatus').value;
  const updateObj = {
    room_id: document.getElementById('mRoom').value || null,
    issue_type: getMaintType(),
    priority: document.getElementById('mPriority').value,
    description: desc,
    cost: parseFloat(document.getElementById('mCost').value) || 0,
    reported_date: document.getElementById('mDate').value,
    resolved_date: document.getElementById('mResolvedDate').value || null,
    assigned_to: document.getElementById('mAssigned').value || null,
    vendor_name: document.getElementById('mVendor').value.trim() || null,
    status,
    photo_after: photoAfterUrl,
    notes: document.getElementById('mNotes').value.trim() || null
  };
  
  // Auto-set resolved date if status changed to resolved
  if ((status === 'Resolved' || status === 'Verified') && !updateObj.resolved_date) {
    updateObj.resolved_date = new Date().toISOString().slice(0, 10);
  }
  
  const { error } = await sb.from('maintenance_log').update(updateObj).eq('id', id);
  if (error) {
    document.getElementById('mErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  window._maintAfterPhotoBlob = null;
  fsn.success('Success', '✅ Updated!');
  renderMaintenanceLog();
}

async function delMaintenance(id) {
  if (!confirm('Delete this maintenance record?')) return;
  await sb.from('maintenance_log').delete().eq('id', id);
  fsn.success('Success', '✅ Deleted');
  renderMaintenanceLog();
}
