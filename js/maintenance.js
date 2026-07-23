/**
 * Maintenance Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderMaintenanceLog() {
  renderShell(`<div class="loading">Loading...</div>`, 'maintenance');
  const {data:logs} = await sb.from('maintenance_log').select('*').order('reported_date',{ascending:false});
  const {data:rooms} = await sb.from('rooms').select('room_id,nickname').order('room_id');
  const roomMap = {};
  (rooms||[]).forEach(r=>{roomMap[r.room_id]=r;});

  renderShell(`
    <div class="card">
      <h1>🔧 Maintenance</h1>
      <div class="sub">${(logs||[]).length} entries</div>
      <button onclick="renderAddMaintenance()">➕ Add Issue</button>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Property</th><th>Type</th><th>Description</th><th>Cost</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${(logs||[]).map(l=>`<tr>
        <td>${roomMap[l.room_id]?.nickname||l.room_id||'General'}</td>
        <td><span class="badge blue">${l.issue_type||'-'}</span></td>
        <td style="max-width:180px;">${l.description||'-'}</td>
        <td>₹${(l.cost||0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${l.status==='Resolved'?'green':l.status==='In Progress'?'yellow':'red'}">${l.status||'Pending'}</span></td>
        <td>${l.reported_date||'-'}</td>
        <td class="table-actions">
          <button class="btn-sm" onclick="editMaintenance(${l.id})">✏️</button>
          <button class="btn-sm danger" onclick="delMaintenance(${l.id})">🗑️</button>
        </td>
      </tr>`).join('')||'<tr><td colspan="7" class="sub">No entries</td></tr>'}</tbody>
    </table></div></div>
  `, 'maintenance');
}

async function renderAddMaintenance() {
  const {data:rooms} = await sb.from('rooms').select('room_id,nickname').order('room_id');
  renderShell(`
    <div class="card"><h1>➕ Add Issue</h1><button class="secondary btn-sm" onclick="renderMaintenanceLog()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Property</label>
        <select id="mRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.room_id}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Issue Type</label>
        <select id="mType"><option>Plumbing</option><option>Electrical</option><option>Furniture</option><option>Appliance</option><option>Painting</option><option>Cleaning</option><option>Other</option></select>
      </div>
      <div class="form-group"><label>Description *</label><textarea id="mDesc" placeholder="What happened?"></textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Cost ₹</label><input id="mCost" type="number" value="0" /></div>
        <div class="form-group"><label>Status</label><select id="mStatus"><option>Pending</option><option>In Progress</option><option>Resolved</option></select></div>
      </div>
      <div class="form-group"><label>Notes</label><input id="mNotes" /></div>
      <button onclick="saveMaintenance()" style="width:100%;">💾 Save</button><div id="mErr"></div>
    </div>
  `, 'maintenance');
}

async function saveMaintenance() {
  const _btn = document.querySelector('button[onclick="saveMaintenance()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const desc = document.getElementById('mDesc').value.trim();
  if(!desc){document.getElementById('mErr').innerHTML='<div class="error">Description required</div>';return;}
  await sb.from('maintenance_log').insert({
    room_id:document.getElementById('mRoom').value||null,
    issue_type:document.getElementById('mType').value,
    description:desc,
    cost:parseFloat(document.getElementById('mCost').value)||0,
    status:document.getElementById('mStatus').value,
    notes:document.getElementById('mNotes').value.trim()||null
  });
  renderMaintenanceLog();
}

async function editMaintenance(id) {
  const {data:m} = await sb.from('maintenance_log').select('*').eq('id',id).single();
  if(!m) return;
  const {data:rooms} = await sb.from('rooms').select('room_id,nickname').order('room_id');
  renderShell(`
    <div class="card"><h1>✏️ Edit Issue</h1><button class="secondary btn-sm" onclick="renderMaintenanceLog()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Property</label>
        <select id="mRoom"><option value="">General</option>${(rooms||[]).map(r=>`<option value="${r.room_id}" ${r.room_id===m.room_id?'selected':''}>${r.nickname||r.room_id}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Type</label>
        <select id="mType">${['Plumbing','Electrical','Furniture','Appliance','Painting','Cleaning','Other'].map(t=>`<option ${t===m.issue_type?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Description</label><textarea id="mDesc">${m.description||''}</textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Cost ₹</label><input id="mCost" type="number" value="${m.cost||0}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="mStatus"><option ${m.status==='Pending'?'selected':''}>Pending</option><option ${m.status==='In Progress'?'selected':''}>In Progress</option><option ${m.status==='Resolved'?'selected':''}>Resolved</option></select>
        </div>
      </div>
      <div class="form-group"><label>Resolved Date</label><input id="mResDate" type="date" value="${m.resolved_date||''}" /></div>
      <div class="form-group"><label>Payment</label>
        <select id="mPaySt"><option ${m.paid_status==='Unpaid'?'selected':''}>Unpaid</option><option ${m.paid_status==='Paid'?'selected':''}>Paid</option></select>
      </div>
      <div class="form-group"><label>Notes</label><input id="mNotes" value="${m.notes||''}" /></div>
      <button onclick="updMaintenance(${id})" style="width:100%;">💾 Update</button>
    </div>
  `, 'maintenance');
}

async function updMaintenance(id) {
  await sb.from('maintenance_log').update({
    room_id:document.getElementById('mRoom').value||null,
    issue_type:document.getElementById('mType').value,
    description:document.getElementById('mDesc').value.trim(),
    cost:parseFloat(document.getElementById('mCost').value)||0,
    status:document.getElementById('mStatus').value,
    resolved_date:document.getElementById('mResDate').value||null,
    paid_status:document.getElementById('mPaySt').value,
    notes:document.getElementById('mNotes').value.trim()||null
  }).eq('id',id);
  renderMaintenanceLog();
}

async function delMaintenance(id) {
  if(confirm('Delete?')){await sb.from('maintenance_log').delete().eq('id',id);renderMaintenanceLog();}
}