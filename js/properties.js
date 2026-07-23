/**
 * Properties & Flats Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ PROPERTIES (ROOMS) ============
async function renderManageRooms() {
  renderShell(`<div class="loading">Loading...</div>`, 'rooms');
  const [{ data: rooms, error }, { data: emps }] = await Promise.all([
    sb.from("rooms").select("*").order("room_id"),
    sb.from("employees").select("emp_id,name,phone,property_role,role,status").eq("status", "Active").order("name")
  ]);
  if (error) { renderShell(`<div class="card"><div class="error">${error.message}</div></div>`, 'rooms'); return; }

  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e; });
  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>🏠 Properties</h1>
      <div class="sub">${(rooms || []).length} properties</div>
      ${isO ? `<button onclick="renderAddRoom()">➕ Add Property</button>` : ''}
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr>
          <th>ID</th><th>Property</th><th>Nickname</th><th>Unit</th>
          <th>Contacts</th><th>Lock</th><th>Map</th><th>Status</th>
          ${isO ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>${(rooms || []).map(r => {
          const mgr = empMap[r.checkin_manager_emp_id];
          const care = empMap[r.caretaker_emp_id];
          const mgrName = mgr?.name || r.checkin_manager || '-';
          const mgrPhone = mgr?.phone || '';
          const careName = care?.name || r.caretaker_name || '-';
          const carePhone = care?.phone || r.caretaker_phone || '';
          return `<tr>
            <td><strong>${r.room_id}</strong></td>
            <td style="max-width:200px;font-size:12px;">${r.property_name || '-'}</td>
            <td>${r.nickname || '-'}</td>
            <td>${r.unit_no || '-'}</td>
            <td style="font-size:12px;">
              <strong>Caretaker:</strong> ${careName}
              ${carePhone ? `<br><small>📞 ${carePhone}</small>` : ''}
              <br><strong>Manager:</strong> ${mgrName}
              ${mgrPhone ? `<br><small>📞 ${mgrPhone}</small>` : ''}
            </td>
            <td>
              <span class="badge ${r.lock_type === 'Smart' ? 'blue' : 'yellow'}">${r.lock_type || 'Physical'}</span>
              ${r.key_number ? `<br><small>🔑 ${r.key_number}</small>` : ''}
            </td>
            <td>${r.map_link ? `<a href="${r.map_link}" target="_blank">📍</a>` : '-'}</td>
            <td><span class="badge ${r.bookable ? 'green' : 'red'}">${r.mode || 'On'}</span></td>
            ${isO ? `<td class="table-actions">
              <button class="btn-sm" onclick="editRoom('${r.room_id}')">✏️</button>
              <button class="btn-sm danger" onclick="deleteRoom('${r.room_id}','${r.unit_no}')">🗑️</button>
            </td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
  `, 'rooms');
}

function roomContactOptions(emps, selectedId, allowedRoles = ['Caretaker', 'Check-in Manager']) {
  const matchRole = (e, roleName) => {
    const txt = `${e.property_role || ''} ${e.role || ''}`.toLowerCase();
    if (roleName === 'Caretaker') return txt.includes('caretaker') || txt.includes('care taker');
    if (roleName === 'Check-in Manager') return txt.includes('check-in manager') || txt.includes('checkin manager');
    return false;
  };

  let list = (emps || []).filter(e => allowedRoles.some(r => matchRole(e, r)));
  const cur = (emps || []).find(e => e.emp_id === selectedId);
  if (cur && !list.find(e => e.emp_id === selectedId)) list = [cur, ...list];

  return `<option value="">-- Select --</option>` + list.map(e => {
    const labelRole = e.property_role || e.role || 'Staff';
    return `<option value="${e.emp_id}" ${e.emp_id === selectedId ? 'selected' : ''}>${e.name} (${labelRole})</option>`;
  }).join('');
}

function roomFormFields(r = {}, emps = []) {
  return `
    <div class="form-grid">
      <div class="form-group"><label>Room ID *</label><input id="roomId" value="${r.room_id || ''}" ${r.room_id ? 'readonly' : ''} placeholder="e.g. GOM-101" /></div>
      <div class="form-group"><label>Airbnb Listing Name</label><input id="propertyName" value="${r.property_name || ''}" placeholder="Full listing name" /></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Unit No</label><input id="unitNo" value="${r.unit_no || ''}" placeholder="e.g. FLAT101" /></div>
      <div class="form-group"><label>Nickname *</label><input id="nickname" value="${r.nickname || ''}" placeholder="Short name" /></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Unit Type</label>
        <select id="unitType">
          <option value="Flat" ${r.unit_type === 'Flat' ? 'selected' : ''}>Flat</option>
          <option value="Villa" ${r.unit_type === 'Villa' ? 'selected' : ''}>Villa</option>
        </select>
      </div>
      <div class="form-group"><label>Floor</label><input id="floor" value="${r.floor || ''}" placeholder="1st, 2nd, ALL" /></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Max Guests</label><input id="maxGuests" type="number" value="${r.max_guests || ''}" /></div>
      <div class="form-group"><label>Building Name</label><input id="buildingName" value="${r.building_name || ''}" placeholder="e.g. Mehadi Park" /></div>
    </div>

    <div class="section-title" style="margin-top:12px;">👨‍💼 Property Contacts</div>
    <div class="form-grid">
      <div class="form-group"><label>Caretaker</label>
        <select id="caretakerEmp">
          ${roomContactOptions(emps, r.caretaker_emp_id || '', ['Caretaker', 'Check-in Manager'])}
        </select>
      </div>
      <div class="form-group"><label>Check-in Manager</label>
        <select id="checkinMgrEmp">
          ${roomContactOptions(emps, r.checkin_manager_emp_id || '', ['Caretaker', 'Check-in Manager'])}
        </select>
      </div>
    </div>

    <div class="section-title" style="margin-top:12px;">📍 Location</div>
    <div class="form-group"><label>Address</label><input id="address" value="${r.address || ''}" placeholder="Full address" /></div>
    <div class="form-group"><label>Google Map Link</label><input id="mapLink" value="${r.map_link || ''}" placeholder="https://maps.app.goo.gl/..." /></div>
    <div class="form-group"><label>Directions</label><textarea id="directions" placeholder="Chaurahe se kaise aana hai, kahan mudna hai...">${r.directions || ''}</textarea></div>
    <div class="form-group"><label>Nearby Landmarks</label><input id="landmarks" value="${r.landmarks || ''}" placeholder="Lulu Mall 10 min, Max Hospital 5 min" /></div>
    <div class="form-group"><label>Floor Info (for guest)</label><input id="floorInfo" value="${r.floor_info || ''}" placeholder="e.g. Property located on 2nd floor" /></div>

    <div class="section-title" style="margin-top:12px;">🔐 Lock & Key</div>
    <div class="form-grid">
      <div class="form-group"><label>Lock Type</label>
        <select id="lockType">
          <option value="Physical" ${r.lock_type !== 'Smart' ? 'selected' : ''}>Physical Key</option>
          <option value="Smart" ${r.lock_type === 'Smart' ? 'selected' : ''}>Smart Lock</option>
        </select>
      </div>
      <div class="form-group"><label>Key Number / Code</label><input id="keyNumber" value="${r.key_number || ''}" placeholder="Key no or lock code" /></div>
    </div>

    <div class="section-title" style="margin-top:12px;">⚙️ Settings</div>
    <div class="form-grid">
      <div class="form-group"><label>Mode</label>
        <select id="mode">
          <option value="On" ${r.mode !== 'Off' ? 'selected' : ''}>On (Listed)</option>
          <option value="Off" ${r.mode === 'Off' ? 'selected' : ''}>Off (Unlisted)</option>
        </select>
      </div>
      <div class="form-group" style="justify-content:center;">
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <input type="checkbox" id="bookable" ${r.bookable !== false ? 'checked' : ''} />
          Bookable
        </label>
      </div>
    </div>

    <div class="form-group"><label>Notes</label><textarea id="notes">${r.notes || ''}</textarea></div>
  `;
}

function collectRoomForm() {
  const emps = window._roomEmpCache || [];
  const caretakerEmpId = document.getElementById('caretakerEmp')?.value || null;
  const checkinMgrEmpId = document.getElementById('checkinMgrEmp')?.value || null;

  const caretaker = emps.find(e => e.emp_id === caretakerEmpId) || null;
  const manager = emps.find(e => e.emp_id === checkinMgrEmpId) || null;

  return {
    room_id: document.getElementById('roomId').value.trim(),
    property_name: document.getElementById('propertyName').value.trim() || null,
    address: document.getElementById('address').value.trim() || null,
    unit_type: document.getElementById('unitType').value,
    unit_no: document.getElementById('unitNo').value.trim(),
    floor: document.getElementById('floor').value.trim() || null,
    nickname: document.getElementById('nickname').value.trim() || null,
    max_guests: parseInt(document.getElementById('maxGuests').value) || null,
    building_name: document.getElementById('buildingName').value.trim() || null,
    checkin_manager_emp_id: checkinMgrEmpId,
    caretaker_emp_id: caretakerEmpId,
    checkin_manager: manager?.name || null,
    caretaker_name: caretaker?.name || null,
    caretaker_phone: caretaker?.phone?.trim() || null,
    map_link: document.getElementById('mapLink').value.trim() || null,
    directions: document.getElementById('directions').value.trim() || null,
    landmarks: document.getElementById('landmarks').value.trim() || null,
    floor_info: document.getElementById('floorInfo').value.trim() || null,
    lock_type: document.getElementById('lockType').value,
    key_number: document.getElementById('keyNumber').value.trim() || null,
    mode: document.getElementById('mode').value,
    bookable: document.getElementById('bookable').checked,
    notes: document.getElementById('notes').value.trim() || null,
  };
}

async function renderAddRoom() {
  const { data: emps } = await sb.from('employees')
    .select('emp_id,name,phone,property_role,role,status')
    .eq('status', 'Active').order('name');
  window._roomEmpCache = emps || [];
  renderShell(`
    <div class="card">
      <h1>➕ Add Property</h1>
      <button class="secondary btn-sm" onclick="renderManageRooms()">← Back</button>
    </div>
    <div class="card">
      ${roomFormFields({}, window._roomEmpCache)}
      <button onclick="saveNewRoom()" style="width:100%;margin-top:12px;">💾 Save Property</button>
      <div id="addErr"></div>
    </div>`, 'rooms');
}

async function saveNewRoom() {
  const o = collectRoomForm();
  if (!o.room_id || !o.unit_no) {
    document.getElementById('addErr').innerHTML = '<div class="error">Room ID & Unit No required</div>';
    return;
  }
  const { error } = await sb.from('rooms').insert(o);
  if (error) { document.getElementById('addErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  await sb.from('flats_status').insert({ room_id: o.room_id, status: 'Free', cleaning_status: 'Clean' });
  renderManageRooms();
}

async function editRoom(id) {
  const [{ data: r }, { data: emps }] = await Promise.all([
    sb.from('rooms').select('*').eq('room_id', id).single(),
    sb.from('employees').select('emp_id,name,phone,property_role,role,status').eq('status', 'Active').order('name')
  ]);
  if (!r) { alert('Not found'); return; }
  window._roomEmpCache = emps || [];
  renderShell(`
    <div class="card">
      <h1>✏️ Edit Property</h1>
      <button class="secondary btn-sm" onclick="renderManageRooms()">← Back</button>
    </div>
    <div class="card">
      ${roomFormFields(r, window._roomEmpCache)}
      <button onclick="updateRoom('${id}')" style="width:100%;margin-top:12px;">💾 Update Property</button>
      <div id="editErr"></div>
    </div>`, 'rooms');
}

async function updateRoom(id) {
  const o = collectRoomForm();
  delete o.room_id;
  if (!o.unit_no) { document.getElementById('editErr').innerHTML = '<div class="error">Unit No required</div>'; return; }
  const { error } = await sb.from('rooms').update(o).eq('room_id', id);
  if (error) { document.getElementById('editErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageRooms();
}

async function deleteRoom(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  await sb.from('flats_status').delete().eq('room_id', id);
  await sb.from('rooms').delete().eq('room_id', id);
  renderManageRooms();
}

// ============ FLATS STATUS ============
async function renderFlatsStatus() {
  renderShell(`<div class="loading">Loading...</div>`, 'flats');

  const { data: flats, error } = await sb.from('flats_status')
    .select('*, rooms(unit_no, nickname, property_name)')
    .order('room_id');

  if (error) { renderShell(`<div class="card"><div class="error">${error.message}</div></div>`, 'flats'); return; }

  const can = ['owner', 'viewer', 'manager', 'checkin_manager'].includes(SESSION.role);
  const freeCount = (flats || []).filter(f => f.status === 'Free').length;
  const bookedCount = (flats || []).filter(f => f.status === 'Booked').length;
  const dirtyCount = (flats || []).filter(f => f.cleaning_status === 'Dirty').length;

  renderShell(`
    ${updateNoticeHTML()}
    ${SESSION.role === 'owner' ? syncInfoHTML() : ''}

    <div class="card">
      <h1>🛏️ Flats Status</h1>
      <div class="sub">${(flats || []).length} properties</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--green);">
        <div class="stat-num">${freeCount}</div>
        <div class="stat-label">Free</div>
      </div>
      <div class="stat-card" style="border-left:4px solid #60a5fa;">
        <div class="stat-num">${bookedCount}</div>
        <div class="stat-label">Booked</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--red);">
        <div class="stat-num">${dirtyCount}</div>
        <div class="stat-label">Need Cleaning</div>
      </div>
    </div>

    <div class="card">
      <div id="flatActionMsg"></div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Property</th><th>Unit</th><th>Status</th><th>Cleaning</th>
          <th>Quick Action</th>${can ? '<th>Edit</th>' : ''}
        </tr></thead>
        <tbody>${(flats || []).map(f => {
          const isDirty = f.cleaning_status === 'Dirty';
          const isClean = f.cleaning_status === 'Clean';
          const isProgress = f.cleaning_status === 'In Progress';

          return `<tr>
            <td><strong>${f.rooms?.nickname || f.room_id}</strong></td>
            <td>${f.rooms?.unit_no || ''}</td>
            <td><span class="badge ${f.status === 'Free' ? 'green' : f.status === 'Booked' ? 'blue' : 'red'}">${f.status || 'Free'}</span></td>
            <td><span class="badge ${isClean ? 'green' : isProgress ? 'yellow' : 'red'}">${f.cleaning_status || 'Clean'}</span></td>
            <td class="table-actions">
              ${isDirty ? `<button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean',this)">✅ Clean</button>` : ''}
              ${isDirty ? `<button class="btn-sm secondary" onclick="quickClean('${f.room_id}','In Progress',this)">🔄</button>` : ''}
              ${isProgress ? `<button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean',this)">✅ Done</button>` : ''}
              ${isClean ? `<button class="btn-sm danger" onclick="quickClean('${f.room_id}','Dirty',this)">🧹</button>` : ''}
            </td>
            ${can ? `<td><button class="btn-sm outline" onclick="editFlatStatus('${f.room_id}')">✏️</button></td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
  `, 'flats');
}

async function quickClean(roomId, newStatus, btnEl = null) {
  const msgEl = document.getElementById('flatActionMsg');
  try {
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳'; }
    const updates = { cleaning_status: newStatus };
    if (newStatus === 'Clean') updates.last_cleaned = new Date().toISOString().slice(0, 10);
    const { error } = await sb.from('flats_status').update(updates).eq('room_id', roomId);
    if (error) throw error;
    if (msgEl) msgEl.innerHTML = `<div class="success-msg">✅ ${roomId} → ${newStatus}</div>`;
    setTimeout(() => renderFlatsStatus(), 300);
  } catch (err) {
    if (msgEl) msgEl.innerHTML = `<div class="error">❌ Failed: ${err.message}</div>`;
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Retry'; }
  }
}

async function editFlatStatus(id) {
  const { data: f } = await sb.from('flats_status')
    .select('*, rooms(unit_no, nickname)')
    .eq('room_id', id).single();
  if (!f) { alert('Not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Flat Status</h1>
      <div class="sub">${f.rooms?.nickname || id} (${f.rooms?.unit_no || ''})</div>
      <button class="secondary btn-sm" onclick="renderFlatsStatus()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Status</label>
          <select id="flatStatus">
            <option value="Free" ${f.status === 'Free' ? 'selected' : ''}>Free</option>
            <option value="Booked" ${f.status === 'Booked' ? 'selected' : ''}>Booked</option>
            <option value="Blocked-Maintenance" ${f.status === 'Blocked-Maintenance' ? 'selected' : ''}>Blocked</option>
          </select>
        </div>
        <div class="form-group"><label>Cleaning</label>
          <select id="cleanSt">
            <option value="Clean" ${f.cleaning_status === 'Clean' ? 'selected' : ''}>Clean</option>
            <option value="Dirty" ${f.cleaning_status === 'Dirty' ? 'selected' : ''}>Dirty</option>
            <option value="In Progress" ${f.cleaning_status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Issue</label><input id="flatIssue" value="${f.issue || ''}" placeholder="Maintenance note" /></div>
      <div class="form-group"><label>Last Cleaned</label><input id="lastCleaned" type="date" value="${f.last_cleaned || ''}" /></div>
      <button onclick="saveFlatStatus('${id}')">💾 Update</button>
      <div id="flatErr"></div>
    </div>
  `, 'flats');
}

async function saveFlatStatus(id) {
  const { error } = await sb.from('flats_status').update({
    status: document.getElementById('flatStatus')?.value,
    cleaning_status: document.getElementById('cleanSt')?.value,
    issue: document.getElementById('flatIssue')?.value?.trim() || null,
    last_cleaned: document.getElementById('lastCleaned')?.value || null,
  }).eq('room_id', id);
  if (error) { document.getElementById('flatErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderFlatsStatus();
}