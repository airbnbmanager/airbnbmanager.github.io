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
// ============ PROPERTY SHIFTS MANAGEMENT ============
async function renderPropertyShifts(roomId) {
  renderShell(`<div class="loading">Loading...</div>`, 'shifts');

  const [{ data: rooms }, { data: emps }, { data: allShifts, error: shiftErr }] = await Promise.all([
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('employees')
      .select('emp_id, name, phone, property_role, role')
      .eq('status', 'Active')
      .order('name'),
    sb.from('property_shifts')
      .select('*')
      .eq('is_active', true)
      .order('room_id')
  ]);

  if (shiftErr) {
    renderShell(`<div class="card"><div class="error">Shifts load failed: ${shiftErr.message}</div></div>`, 'shifts');
    return;
  }

  const selRoom = roomId || '';
  window._shiftEmps = emps || [];

  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e; });

  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r; });

  const shiftsHydrated = (allShifts || []).map(sh => ({
    ...sh,
    employees: empMap[sh.emp_id] || null,
    rooms: roomMap[sh.room_id] || null
  }));

  const filteredShifts = selRoom
    ? shiftsHydrated.filter(s => s.room_id === selRoom)
    : [];

  const room = (rooms || []).find(r => r.room_id === selRoom);

  const byRoom = {};
  shiftsHydrated.forEach(sh => {
    if (!byRoom[sh.room_id]) byRoom[sh.room_id] = { room: sh.rooms, shifts: [] };
    byRoom[sh.room_id].shifts.push(sh);
  });

  const noShiftRooms = (rooms || []).filter(r => !byRoom[r.room_id]);

  renderShell(`
    <div class="card">
      <h1>🕐 Property Shifts</h1>
      <div class="sub">Manage day/night shift contacts for each property</div>
    </div>

    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Select Property to Edit</label>
          <select id="shiftPropSel" onchange="renderPropertyShifts(this.value)">
            <option value="">-- All Properties Overview --</option>
            ${(rooms || []).map(r =>
              `<option value="${r.room_id}" ${r.room_id === selRoom ? 'selected' : ''}>
                ${r.nickname || r.unit_no}
              </option>`
            ).join('')}
          </select>
        </div>
        ${selRoom ? `
        <div class="form-group" style="justify-content:flex-end;">
          <button onclick="renderAddShift('${selRoom}')" style="margin-top:20px;">
            ➕ Add Shift
          </button>
        </div>` : ''}
      </div>
    </div>

    ${selRoom ? `
    <div class="card">
      <div class="section-title">
        🏠 ${room?.nickname || selRoom} — Shift Contacts
      </div>
      ${filteredShifts.length === 0
        ? '<div class="sub">No shifts configured for this property.</div>'
        : `<div class="table-wrap"><table>
            <thead><tr>
              <th>Employee</th>
              <th>Shift</th>
              <th>Time</th>
              <th>Role</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${filteredShifts.map(sh => `
                <tr>
                  <td>
                    <strong>${sh.employees?.name || sh.emp_id}</strong>
                    ${sh.employees?.phone
                      ? `<br><small style="color:var(--muted);">📞 ${sh.employees.phone}</small>`
                      : ''}
                  </td>
                  <td>
                    <span class="badge ${sh.shift_type === 'Day' ? 'yellow' : sh.shift_type === 'Night' ? 'blue' : 'green'}">
                      ${sh.shift_type === 'Day' ? '☀️ Day' : sh.shift_type === 'Night' ? '🌙 Night' : '🔄 All Day'}
                    </span>
                  </td>
                  <td style="font-size:12px;">
                    ${sh.shift_start || '-'} → ${sh.shift_end || '-'}
                  </td>
                  <td>
                    <span class="badge green">${sh.contact_role || 'Caretaker'}</span>
                  </td>
                  <td class="table-actions">
                    <button class="btn-sm" onclick="editShift(${sh.id},'${selRoom}')">✏️</button>
                    <button class="btn-sm danger" onclick="deleteShift(${sh.id},'${selRoom}')">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>`}
    </div>
    ` : ''}

    <div class="card">
      <div class="section-title">📋 All Properties — Shift Overview</div>
      ${Object.keys(byRoom).length === 0
        ? '<div class="sub">No shifts configured for any property.</div>'
        : Object.entries(byRoom).map(([rid, g]) => {
          const dayS = g.shifts.filter(s => s.shift_type === 'Day');
          const nightS = g.shifts.filter(s => s.shift_type === 'Night');
          const allDayS = g.shifts.filter(s => s.shift_type === 'All Day');
          return `
            <div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:10px;border:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="font-size:14px;">🏠 ${g.room?.nickname || g.room?.unit_no || rid}</strong>
                <button class="btn-sm outline" onclick="renderPropertyShifts('${rid}')">✏️ Edit</button>
              </div>
              ${dayS.length ? `
                <div style="margin:4px 0;">
                  <span style="font-size:12px;font-weight:600;color:var(--yellow);">☀️ Day (${dayS[0]?.shift_start || '08:00'} - ${dayS[0]?.shift_end || '20:00'})</span>
                  ${dayS.map(s => `
                    <div style="font-size:12px;margin:2px 0 2px 16px;">
                      📞 <strong>${s.employees?.name || '-'}</strong>
                      ${s.employees?.phone ? `— ${s.employees.phone}` : ''}
                      <span class="badge green" style="font-size:10px;padding:1px 6px;">${s.contact_role || '-'}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              ${nightS.length ? `
                <div style="margin:4px 0;">
                  <span style="font-size:12px;font-weight:600;color:var(--blue);">🌙 Night (${nightS[0]?.shift_start || '20:00'} - ${nightS[0]?.shift_end || '08:00'})</span>
                  ${nightS.map(s => `
                    <div style="font-size:12px;margin:2px 0 2px 16px;">
                      📞 <strong>${s.employees?.name || '-'}</strong>
                      ${s.employees?.phone ? `— ${s.employees.phone}` : ''}
                      <span class="badge green" style="font-size:10px;padding:1px 6px;">${s.contact_role || '-'}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              ${allDayS.length ? `
                <div style="margin:4px 0;">
                  <span style="font-size:12px;font-weight:600;color:var(--green);">🔄 All Day</span>
                  ${allDayS.map(s => `
                    <div style="font-size:12px;margin:2px 0 2px 16px;">
                      📞 <strong>${s.employees?.name || '-'}</strong>
                      ${s.employees?.phone ? `— ${s.employees.phone}` : ''}
                      <span class="badge green" style="font-size:10px;padding:1px 6px;">${s.contact_role || '-'}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
    </div>

    ${noShiftRooms.length ? `
    <div class="card">
      <div class="section-title" style="color:var(--red);">⚠️ Properties Without Shifts (${noShiftRooms.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${noShiftRooms.map(r => `
          <button class="btn-sm outline" onclick="renderPropertyShifts('${r.room_id}')">
            ${r.nickname || r.unit_no} ➕
          </button>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `, 'shifts');
}

async function renderAddShift(roomId) {
  const emps = window._shiftEmps || [];

  renderShell(`
    <div class="card">
      <h1>➕ Add Shift Contact</h1>
      <button class="secondary btn-sm" onclick="renderPropertyShifts('${roomId}')">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Employee *</label>
        <select id="shEmp">
          <option value="">Select Employee</option>
          ${emps.map(e => {
            const role = e.property_role || e.role || 'Staff';
            return `<option value="${e.emp_id}">${e.name} (${role})</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Shift Type</label>
          <select id="shType">
            <option value="Day">☀️ Day Shift</option>
            <option value="Night">🌙 Night Shift</option>
            <option value="All Day">🔄 All Day</option>
          </select>
        </div>
        <div class="form-group">
          <label>Contact Role</label>
          <select id="shRole">
            <option value="Caretaker">Caretaker</option>
            <option value="Check-in Manager">Check-in Manager</option>
            <option value="Manager">Manager</option>
            <option value="Manager & Check-in">Manager & Check-in</option>
            <option value="Supervisor">Supervisor</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Shift Start</label>
          <input id="shStart" type="time" value="08:00" />
        </div>
        <div class="form-group">
          <label>Shift End</label>
          <input id="shEnd" type="time" value="20:00" />
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input id="shNotes" placeholder="Optional" />
      </div>
      <button onclick="saveShift('${roomId}')" style="width:100%;margin-top:10px;">
        💾 Save Shift
      </button>
      <div id="shErr"></div>
    </div>
  `, 'rooms');
}

async function saveShift(roomId) {
  const btn = document.querySelector('button[onclick^="saveShift"]');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const empId = document.getElementById('shEmp').value;
  if (!empId) {
    document.getElementById('shErr').innerHTML = '<div class="error">Employee required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Shift'; }
    return;
  }

  const { error } = await sb.from('property_shifts').insert({
    room_id: roomId,
    emp_id: empId,
    shift_type: document.getElementById('shType').value,
    contact_role: document.getElementById('shRole').value,
    shift_start: document.getElementById('shStart').value,
    shift_end: document.getElementById('shEnd').value,
    notes: document.getElementById('shNotes').value.trim() || null,
    is_active: true
  });

  if (error) {
    document.getElementById('shErr').innerHTML = `<div class="error">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Shift'; }
    return;
  }

  alert('✅ Shift saved!');
  renderPropertyShifts(roomId);
}

async function editShift(id, roomId) {
  const [{ data: sh }, emps] = await Promise.all([
    sb.from('property_shifts').select('*').eq('id', id).single(),
    Promise.resolve(window._shiftEmps || [])
  ]);

  if (!sh) { alert('Not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Shift</h1>
      <button class="secondary btn-sm" onclick="renderPropertyShifts('${roomId}')">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Employee *</label>
        <select id="shEmp">
          ${emps.map(e => {
            const role = e.property_role || e.role || 'Staff';
            return `<option value="${e.emp_id}" ${e.emp_id === sh.emp_id ? 'selected' : ''}>
              ${e.name} (${role})
            </option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Shift Type</label>
          <select id="shType">
            <option value="Day" ${sh.shift_type === 'Day' ? 'selected' : ''}>☀️ Day Shift</option>
            <option value="Night" ${sh.shift_type === 'Night' ? 'selected' : ''}>🌙 Night Shift</option>
            <option value="All Day" ${sh.shift_type === 'All Day' ? 'selected' : ''}>🔄 All Day</option>
          </select>
        </div>
        <div class="form-group">
          <label>Contact Role</label>
          <select id="shRole">
            ${['Caretaker','Check-in Manager','Manager','Manager & Check-in','Supervisor'].map(r =>
              `<option value="${r}" ${r === sh.contact_role ? 'selected' : ''}>${r}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Shift Start</label>
          <input id="shStart" type="time" value="${sh.shift_start || '08:00'}" />
        </div>
        <div class="form-group">
          <label>Shift End</label>
          <input id="shEnd" type="time" value="${sh.shift_end || '20:00'}" />
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input id="shNotes" value="${sh.notes || ''}" />
      </div>
      <button onclick="updateShift(${id},'${roomId}')" style="width:100%;margin-top:10px;">
        💾 Update Shift
      </button>
      <div id="shErr"></div>
    </div>
  `, 'rooms');
}

async function updateShift(id, roomId) {
  const { error } = await sb.from('property_shifts').update({
    emp_id: document.getElementById('shEmp').value,
    shift_type: document.getElementById('shType').value,
    contact_role: document.getElementById('shRole').value,
    shift_start: document.getElementById('shStart').value,
    shift_end: document.getElementById('shEnd').value,
    notes: document.getElementById('shNotes').value.trim() || null
  }).eq('id', id);

  if (error) {
    document.getElementById('shErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }

  alert('✅ Updated!');
  renderPropertyShifts(roomId);
}

async function deleteShift(id, roomId) {
  if (!confirm('Remove this shift contact?')) return;
  const { error } = await sb.from('property_shifts').delete().eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  alert('✅ Shift removed');
  renderPropertyShifts(roomId);
}
