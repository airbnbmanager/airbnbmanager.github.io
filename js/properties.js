/**
 * Properties & Flats Module
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

// ============ PROPERTIES (ROOMS) ============
async function renderManageRooms() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');

  renderShell(`<div class="loading">Loading...</div>`, 'rooms');
  const [{ data: rooms, error }, { data: emps }] = await Promise.all([
    sb.from("rooms").select("*").order("room_id"),
    sb.from("employees").select("emp_id,name,phone,property_role,role,status").eq("status", "Active").order("name")
  ]);
  if (error) { renderShell(`<div class="card"><div class="error">${error.message}</div></div>`, 'rooms'); return; }

  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e; });
  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role);

  renderShell(`
    <div class="card">
      <h1>🏠 Properties</h1>
      <div class="sub">${(rooms || []).length} properties</div>
      ${isO ? `<button onclick="renderAddRoom()">➕ Add Property</button> <button onclick="navigate('showcase-admin')" class="secondary" style="margin-left:8px;background:#0F766E;color:#fff;border-color:#0F766E;">🌐 Website Showcase &amp; Media CMS</button>` : ''}
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
            <td>${propLabel(r) || '-'}</td>
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
              ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="deleteRoom('${r.room_id}','${r.unit_no}')">🗑️</button>` : ''}
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
    <div class="form-group"><label>📶 WiFi Name (SSID)</label><input id="wifiSsid" value="${r.wifi_ssid || ''}" placeholder="e.g. Airbnb.in1" /></div>
    <div class="form-group"><label>🔑 WiFi Password</label><input id="wifiPassword" value="${r.wifi_password || ''}" placeholder="WiFi password" /></div>

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
    <div class="section-title" style="margin-top:12px;">📱 WhatsApp Group (Investors)</div>
    <div class="form-group">
      <label>Group Invite Link</label>
      <input id="whatsappGroupLink" value="${r.whatsapp_group_link || ''}" placeholder="https://chat.whatsapp.com/XXXXX" />
      <small style="color:#666;font-size:11px;">WhatsApp group open karke Invite Link copy karo</small>
    </div>
    <div class="form-group">
      <label>Group Name (Optional)</label>
      <input id="whatsappGroupName" value="${r.whatsapp_group_name || ''}" placeholder="e.g. Royal White House Investors" />
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
    wifi_ssid: document.getElementById('wifiSsid')?.value.trim() || null,
    wifi_password: document.getElementById('wifiPassword')?.value.trim() || null,
    lock_type: document.getElementById('lockType').value,
    key_number: document.getElementById('keyNumber').value.trim() || null,
    mode: document.getElementById('mode').value,
    bookable: document.getElementById('bookable').checked,
    notes: document.getElementById('notes').value.trim() || null,
        whatsapp_group_link: document.getElementById('whatsappGroupLink')?.value.trim() || null,
    whatsapp_group_name: document.getElementById('whatsappGroupName')?.value.trim() || null,
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
  if (!r) { fsn.error('Error', 'Not found'); return; }
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

// ============ FLATS STATUS & HOUSEKEEPING ============
window._flatsActiveFilter = window._flatsActiveFilter || 'all';
window._flatsSearchQuery = window._flatsSearchQuery || '';
window._flatsViewMode = window._flatsViewMode || (localStorage.getItem('flats_view_mode') || 'cards');

async function renderFlatsStatus() {
  // 🎯 Dashboard filter support
  const dashFilter = SESSION._filterFlatsStatus || '';
  if (dashFilter) {
    window._flatsActiveFilter = dashFilter.toLowerCase();
    SESSION._filterFlatsStatus = null; // Clear after read
  }

  renderShell(`<div class="loading">Loading flat statuses...</div>`, 'flats');

  const today = new Date().toISOString().slice(0, 10);

  // Concurrently fetch flats, active bookings, and today's arrivals
  const [
    { data: flats, error: flatErr },
    { data: currentBks },
    { data: openBks },
    { data: todayArrivals }
  ] = await Promise.all([
    sb.from('flats_status').select('*, rooms(room_id, unit_no, nickname, property_name, checkin_manager, caretaker_phone, map_link)').order('room_id'),
    sb.from('guest_register')
      .select('booking_id, room_id, guest_name, phone, check_in, check_out, check_in_time, check_out_time, checkout_confirmed, is_cancelled')
      .neq('is_cancelled', true)
      .gte('check_out', today)
      .lte('check_in', today),
    sb.from('guest_register')
      .select('booking_id, room_id, guest_name, phone, check_in, check_out, check_in_time, check_out_time, checkout_confirmed, is_cancelled')
      .neq('is_cancelled', true)
      .eq('checkout_confirmed', false)
      .lte('check_in', today),
    sb.from('guest_register')
      .select('booking_id, room_id, guest_name, phone, check_in, check_in_time, is_cancelled')
      .neq('is_cancelled', true)
      .eq('check_in', today)
  ]);

  if (flatErr) {
    renderShell(`<div class="card"><div class="error">${flatErr.message}</div></div>`, 'flats');
    return;
  }

  // Map active stays & arrivals by room_id
  const activeBks = [...(currentBks || []), ...(openBks || [])];
  const activeBkMap = {};
  activeBks.forEach(b => { if (!activeBkMap[b.room_id]) activeBkMap[b.room_id] = b; });

  const arrivalMap = {};
  (todayArrivals || []).forEach(b => { if (!arrivalMap[b.room_id]) arrivalMap[b.room_id] = b; });

  // Attach enriched properties to each flat
  const enrichedFlats = (flats || []).map(f => {
    const activeStay = activeBkMap[f.room_id] || null;
    const todayArrival = arrivalMap[f.room_id] || null;
    const isCheckoutToday = !!(activeStay && activeStay.check_out === today && activeStay.checkout_confirmed !== false);
    const isOpenStay = !!(activeStay && activeStay.checkout_confirmed === false);
    const isDirty = f.cleaning_status === 'Dirty';
    const isTurnaround = (isCheckoutToday || isDirty) && !!todayArrival;
    return {
      ...f,
      activeStay,
      todayArrival,
      isCheckoutToday,
      isOpenStay,
      isTurnaround
    };
  });

  // Calculate metrics
  const totalCount = enrichedFlats.length;
  const dirtyCount = enrichedFlats.filter(f => f.cleaning_status === 'Dirty').length;
  const inProgressCount = enrichedFlats.filter(f => f.cleaning_status === 'In Progress').length;
  const cleanCount = enrichedFlats.filter(f => f.cleaning_status === 'Clean').length;
  const freeCount = enrichedFlats.filter(f => f.status === 'Free').length;
  const bookedCount = enrichedFlats.filter(f => f.status === 'Booked').length;
  const blockedCount = enrichedFlats.filter(f => f.status === 'Blocked-Maintenance').length;
  const turnaroundCount = enrichedFlats.filter(f => f.isTurnaround || (f.todayArrival && f.cleaning_status !== 'Clean')).length;

  // Filter application
  let filtered = [...enrichedFlats];
  const activeFilter = window._flatsActiveFilter || 'all';

  if (activeFilter === 'dirty') {
    filtered = filtered.filter(f => f.cleaning_status === 'Dirty');
  } else if (activeFilter === 'progress') {
    filtered = filtered.filter(f => f.cleaning_status === 'In Progress');
  } else if (activeFilter === 'clean') {
    filtered = filtered.filter(f => f.cleaning_status === 'Clean');
  } else if (activeFilter === 'free') {
    filtered = filtered.filter(f => f.status === 'Free');
  } else if (activeFilter === 'occupied' || activeFilter === 'booked') {
    filtered = filtered.filter(f => f.status === 'Booked');
  } else if (activeFilter === 'blocked') {
    filtered = filtered.filter(f => f.status === 'Blocked-Maintenance');
  } else if (activeFilter === 'turnaround') {
    filtered = filtered.filter(f => f.isTurnaround || (f.todayArrival && f.cleaning_status !== 'Clean'));
  }

  // Caretaker room scoping
  if (window._myAssignedRooms && window._myAssignedRooms.length) {
    filtered = filtered.filter(f => window._myAssignedRooms.includes(f.room_id));
  }

  // Search query filter
  const sq = (window._flatsSearchQuery || '').toLowerCase().trim();
  if (sq) {
    filtered = filtered.filter(f => {
      const pName = (propLabel(f.rooms) || f.room_id || '').toLowerCase();
      const unit = (f.rooms?.unit_no || '').toLowerCase();
      const staff = (f.rooms?.checkin_manager || '').toLowerCase();
      const guest = (f.activeStay?.guest_name || '').toLowerCase();
      const guestPhone = (f.activeStay?.phone || '').toLowerCase();
      const nextGuest = (f.todayArrival?.guest_name || '').toLowerCase();
      const issue = (f.issue || '').toLowerCase();
      return pName.includes(sq) || unit.includes(sq) || staff.includes(sq) ||
             guest.includes(sq) || guestPhone.includes(sq) || nextGuest.includes(sq) || issue.includes(sq);
    });
  }

  const can = ['owner','admin','manager','moderator','developer','checkin_manager'].includes(SESSION.role);
  const viewMode = window._flatsViewMode || 'cards';

  // Helper for last cleaned date string
  const formatLastCleaned = (dStr) => {
    if (!dStr) return 'Not recorded';
    if (dStr === today) return 'Today';
    try {
      const d = new Date(dStr);
      const diffDays = Math.round((new Date(today) - d) / 86400000);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays > 1) return `${diffDays}d ago`;
      return dStr;
    } catch(e) { return dStr; }
  };

  renderShell(`
    ${updateNoticeHTML()}
    ${['owner','admin','moderator','developer'].includes(SESSION.role) ? syncInfoHTML() : ''}

    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 style="margin:0;font-size:22px;">🛏️ Flats Status & Housekeeping</h1>
        <div class="sub" style="margin:4px 0 0;">
          Real-time occupancy, turnaround scheduling & cleaning management · <strong>${totalCount} properties</strong>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${can ? `
          <button class="btn-sm" onclick="cleanAllFlats(this)" style="background:#10B981;color:#fff;border:none;font-weight:700;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(16,185,129,0.25);" title="Mark all dirty and in-progress flats as Clean">
            <span>🧹</span> <span>Clean All ${dirtyCount + inProgressCount > 0 ? `(${dirtyCount + inProgressCount})` : ''}</span>
          </button>
        ` : ''}
        <button class="btn-sm" onclick="runAutoCheckoutSync(this)" title="Auto-detect clean/dirty status from booking checkout times">
          🔄 Auto-Sync
        </button>
        <button class="btn-sm outline" onclick="renderFlatsStatus()">
          🔁 Refresh
        </button>
        <div style="display:inline-flex;background:var(--border);padding:2px;border-radius:8px;">
          <button type="button" class="btn-sm" onclick="setFlatsViewMode('cards')"
            style="min-height:28px;padding:4px 10px;font-size:12px;border-radius:6px;${viewMode === 'cards' ? 'background:#fff;color:var(--dark);box-shadow:0 1px 3px rgba(0,0,0,0.1);font-weight:700;' : 'background:transparent;color:var(--muted);border:none;'}">
            📱 Cards
          </button>
          <button type="button" class="btn-sm" onclick="setFlatsViewMode('table')"
            style="min-height:28px;padding:4px 10px;font-size:12px;border-radius:6px;${viewMode === 'table' ? 'background:#fff;color:var(--dark);box-shadow:0 1px 3px rgba(0,0,0,0.1);font-weight:700;' : 'background:transparent;color:var(--muted);border:none;'}">
            📋 Table
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Filter KPI Ribbon -->
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:12px;">
      <div class="stat-card" onclick="setFlatsFilter('dirty')" style="cursor:pointer;border-left:4px solid #EF4444;${activeFilter === 'dirty' ? 'background:#FEF2F2;box-shadow:0 0 0 2px #EF4444;' : ''}">
        <div class="stat-num" style="color:#EF4444;">${dirtyCount}</div>
        <div class="stat-label">🧹 Need Cleaning</div>
      </div>
      <div class="stat-card" onclick="setFlatsFilter('progress')" style="cursor:pointer;border-left:4px solid #F59E0B;${activeFilter === 'progress' ? 'background:#FFFBEB;box-shadow:0 0 0 2px #F59E0B;' : ''}">
        <div class="stat-num" style="color:#D97706;">${inProgressCount}</div>
        <div class="stat-label">🔄 In Progress</div>
      </div>
      <div class="stat-card" onclick="setFlatsFilter('turnaround')" style="cursor:pointer;border-left:4px solid #8B5CF6;${activeFilter === 'turnaround' ? 'background:#F5F3FF;box-shadow:0 0 0 2px #8B5CF6;' : ''}">
        <div class="stat-num" style="color:#8B5CF6;">${turnaroundCount}</div>
        <div class="stat-label">⚡ Turnarounds</div>
      </div>
      <div class="stat-card" onclick="setFlatsFilter('clean')" style="cursor:pointer;border-left:4px solid #10B981;${activeFilter === 'clean' ? 'background:#ECFDF5;box-shadow:0 0 0 2px #10B981;' : ''}">
        <div class="stat-num" style="color:#10B981;">${cleanCount}</div>
        <div class="stat-label">✅ Clean & Ready</div>
      </div>
      <div class="stat-card" onclick="setFlatsFilter('occupied')" style="cursor:pointer;border-left:4px solid #3B82F6;${activeFilter === 'occupied' || activeFilter === 'booked' ? 'background:#EFF6FF;box-shadow:0 0 0 2px #3B82F6;' : ''}">
        <div class="stat-num" style="color:#3B82F6;">${bookedCount}</div>
        <div class="stat-label">🔵 Occupied</div>
      </div>
      <div class="stat-card" onclick="setFlatsFilter('free')" style="cursor:pointer;border-left:4px solid #059669;${activeFilter === 'free' ? 'background:#F0FDF4;box-shadow:0 0 0 2px #059669;' : ''}">
        <div class="stat-num" style="color:#059669;">${freeCount}</div>
        <div class="stat-label">🟢 Vacant / Free</div>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="card" style="padding:12px;margin-bottom:14px;">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;position:relative;">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);">🔍</span>
          <input type="text" id="flatsSearchInput" placeholder="Search flat, unit, guest name, phone, or caretaker..."
            value="${window._flatsSearchQuery || ''}"
            oninput="window._flatsSearchQuery=this.value;renderFlatsStatus();"
            style="width:100%;padding:9px 10px 9px 34px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;" />
        </div>
        ${window._flatsSearchQuery ? `<button class="outline btn-sm" onclick="window._flatsSearchQuery='';renderFlatsStatus();" style="padding:4px 8px;">✕ Clear</button>` : ''}
      </div>

      <!-- Filter Pills -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center;">
        <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-right:2px;">Filter:</span>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('all')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'all' ? 'background:var(--dark);color:#fff;' : 'background:var(--bg);color:var(--dark);border:1px solid var(--border);'}">
          All (${totalCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('dirty')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'dirty' ? 'background:#EF4444;color:#fff;' : 'background:var(--bg);color:#EF4444;border:1px solid #FCA5A5;'}">
          🧹 Dirty (${dirtyCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('progress')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'progress' ? 'background:#F59E0B;color:#fff;' : 'background:var(--bg);color:#D97706;border:1px solid #FCD34D;'}">
          🔄 In Progress (${inProgressCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('clean')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'clean' ? 'background:#10B981;color:#fff;' : 'background:var(--bg);color:#065F46;border:1px solid #A7F3D0;'}">
          ✅ Clean (${cleanCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('turnaround')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'turnaround' ? 'background:#8B5CF6;color:#fff;' : 'background:var(--bg);color:#7C3AED;border:1px solid #DDD6FE;'}">
          ⚡ Turnaround (${turnaroundCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('free')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'free' ? 'background:#059669;color:#fff;' : 'background:var(--bg);color:#059669;border:1px solid #A7F3D0;'}">
          🟢 Free (${freeCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('occupied')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'occupied' || activeFilter === 'booked' ? 'background:#3B82F6;color:#fff;' : 'background:var(--bg);color:#1D4ED8;border:1px solid #BFDBFE;'}">
          🔵 Occupied (${bookedCount})
        </button>
        <button type="button" class="btn-sm" onclick="setFlatsFilter('blocked')"
          style="border-radius:20px;padding:3px 12px;font-size:12px;${activeFilter === 'blocked' ? 'background:#64748B;color:#fff;' : 'background:var(--bg);color:#475569;border:1px solid #CBD5E1;'}">
          ⛔ Blocked (${blockedCount})
        </button>
      </div>
    </div>

    <div id="flatActionMsg"></div>

    <!-- Main Content: Cards or Table -->
    ${viewMode === 'cards' ? `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(295px, 1fr));gap:14px;">
        ${filtered.length === 0 ? `<div class="card" style="grid-column:1/-1;text-align:center;padding:32px;color:var(--muted);">No properties match the selected filter.</div>` : ''}
        ${filtered.map(f => {
          const isDirty = f.cleaning_status === 'Dirty';
          const isClean = f.cleaning_status === 'Clean';
          const isProgress = f.cleaning_status === 'In Progress';

          const cardBorder = isDirty ? '#FCA5A5' : isProgress ? '#FCD34D' : '#A7F3D0';
          const statusColor = f.status === 'Free' ? 'green' : f.status === 'Booked' ? 'blue' : 'red';
          const statusIcon = f.status === 'Free' ? '🟢' : f.status === 'Booked' ? '🔵' : '⛔';

          const cleanBadgeBg = isDirty ? '#FEF2F2' : isProgress ? '#FFFBEB' : '#ECFDF5';
          const cleanBadgeBorder = isDirty ? '#FCA5A5' : isProgress ? '#FCD34D' : '#86EFAC';
          const cleanBadgeText = isDirty ? '#991B1B' : isProgress ? '#92400E' : '#065F46';
          const cleanBadgeIcon = isDirty ? '🧹' : isProgress ? '🔄' : '✅';
          const cleanBadgeLabel = isDirty ? 'DIRTY — NEEDS CLEANING' : isProgress ? 'CLEANING IN PROGRESS' : 'CLEAN & READY';

          // Caretaker contact & whatsapp
          const ctName = f.rooms?.checkin_manager || 'Staff';
          const ctPhone = (f.rooms?.caretaker_phone || '').replace(/[^0-9]/g, '');
          const propTitle = propLabel(f.rooms) || f.room_id;
          const waMsg = encodeURIComponent(`*UHHS Housekeeping Update*\nFlat: ${propTitle} (Unit ${f.rooms?.unit_no || f.room_id})\nCleaning Status: ${f.cleaning_status || 'Dirty'}\nPlease inspect and prepare.`);
          const waLink = ctPhone ? `https://wa.me/91${ctPhone.slice(-10)}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;

          return `
            <div class="card" style="margin-bottom:0;padding:15px;border-radius:12px;border:1.5px solid ${cardBorder};background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
              <div>
                <!-- Property Title & Occupancy Badge -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                  <div>
                    <div style="font-size:16px;font-weight:800;color:var(--dark);line-height:1.2;">
                      ${propTitle}
                    </div>
                    <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                      Unit <strong>${f.rooms?.unit_no || f.room_id}</strong> · ${f.rooms?.property_name || ''}
                    </div>
                  </div>
                  <span class="badge ${statusColor}" style="font-weight:700;font-size:11px;white-space:nowrap;">
                    ${statusIcon} ${f.status || 'Free'}
                  </span>
                </div>

                <!-- Cleaning Status Banner -->
                <div style="padding:8px 10px;border-radius:8px;background:${cleanBadgeBg};border:1px solid ${cleanBadgeBorder};color:${cleanBadgeText};margin:6px 0 10px;display:flex;justify-content:space-between;align-items:center;">
                  <div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12px;">
                    <span>${cleanBadgeIcon}</span>
                    <span>${cleanBadgeLabel}</span>
                  </div>
                  <div style="font-size:11px;font-weight:600;opacity:0.85;">
                    ${formatLastCleaned(f.last_cleaned)}
                  </div>
                </div>

                <!-- Operational Alerts: Incoming or Active Stays -->
                ${f.isTurnaround ? `
                  <div style="padding:6px 10px;border-radius:8px;background:#FEE2E2;border:1.5px solid #EF4444;color:#991B1B;font-size:11.5px;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <span>🚨</span>
                    <span>PRIORITY TURNAROUND: Guest arriving today!</span>
                  </div>
                ` : ''}

                ${f.todayArrival ? `
                  <div style="padding:6px 10px;border-radius:8px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;font-size:12px;margin-bottom:8px;">
                    ⚡ <strong>Incoming Guest Today:</strong> ${f.todayArrival.guest_name}
                    <div style="font-size:11px;color:#3B82F6;margin-top:2px;">Check-in: ${f.todayArrival.check_in_time || '14:00'}</div>
                  </div>
                ` : ''}

                ${f.activeStay ? `
                  <div style="padding:8px 10px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:8px;font-size:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <span>👤 Guest: </span><strong style="color:var(--dark);">${f.activeStay.guest_name}</strong>
                      </div>
                      ${f.activeStay.phone ? `<a href="tel:${f.activeStay.phone}" style="color:var(--primary);text-decoration:none;font-weight:600;font-size:11px;">📞 Call</a>` : ''}
                    </div>
                    ${f.isCheckoutToday ? `
                      <div style="color:#D97706;font-weight:800;font-size:11px;margin-top:4px;">
                        📤 Check-out Today (${f.activeStay.check_out_time || '11:00 AM'})
                      </div>
                    ` : f.isOpenStay ? `
                      <div style="color:#2563EB;font-weight:700;font-size:11px;margin-top:4px;">
                        🔄 Continuous Open Stay
                      </div>
                    ` : `
                      <div style="color:var(--muted);font-size:11px;margin-top:4px;">
                        Departing: ${f.activeStay.check_out} (${f.activeStay.check_out_time || '11:00 AM'})
                      </div>
                    `}
                  </div>
                ` : ''}

                ${f.issue ? `
                  <div style="padding:6px 10px;border-radius:8px;background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;font-size:11.5px;margin-bottom:8px;">
                    <strong>⚠️ Issue:</strong> ${f.issue}
                  </div>
                ` : ''}

                ${f.cleaning_refused_reason ? `
                  <div style="padding:6px 10px;border-radius:8px;background:#FFF1F2;border:1px solid #FDA4AF;color:#9F1239;font-size:11.5px;margin-bottom:8px;">
                    <strong>🚫 Cleaning Refused:</strong> ${f.cleaning_refused_reason}
                  </div>
                ` : ''}

                <!-- Staff & Direct WhatsApp Row -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;margin-bottom:8px;border-top:1px dashed var(--border);font-size:11.5px;color:var(--muted);">
                  <div>
                    <span>Staff: </span><strong style="color:var(--dark);">${ctName}</strong>
                  </div>
                  <a href="${waLink}" target="_blank" class="btn-sm"
                    style="background:#25D366;color:#fff;padding:2px 8px;font-size:11px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;text-decoration:none;min-height:22px;"
                    title="Send cleaning update via WhatsApp">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.55 1.36 5.09L2 22l5.25-1.38c1.48.8 3.13 1.23 4.79 1.23h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.37c.01-4.54 3.7-8.23 8.25-8.23M8.53 6.98c-.16 0-.43.06-.65.31s-.85.83-.85 2.02.87 2.35.99 2.51c.12.17 1.71 2.75 4.28 3.72 2.12.8 2.55.64 3.01.6.46-.05 1.5-.61 1.71-1.2.21-.59.21-1.09.15-1.19s-.23-.16-.48-.28-1.5-.74-1.73-.82c-.23-.08-.4-.12-.57.13s-.65.82-.8.99c-.15.17-.29.19-.55.06-.26-.13-1.09-.4-2.08-1.29-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.31.4-.47.13-.16.17-.27.26-.45.09-.18.04-.34-.02-.47-.06-.13-.57-1.37-.78-1.87s-.42-.42-.57-.43z"/></svg>
                    <span>Alert</span>
                  </a>
                </div>
              </div>

              <!-- Quick Action Strip -->
              <div style="display:flex;gap:6px;align-items:center;margin-top:10px;">
                ${can ? `
                  ${isDirty ? `
                    <button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean',this)" style="flex:2;font-weight:700;font-size:12px;min-height:34px;">
                      ✅ Clean
                    </button>
                    <button class="btn-sm secondary" onclick="quickClean('${f.room_id}','In Progress',this)" style="flex:1;font-size:11.5px;min-height:34px;" title="Start Cleaning">
                      🔄 Start
                    </button>
                    <button class="btn-sm" style="background:#F59E0B;color:#fff;font-size:11.5px;min-height:34px;" onclick="showRefuseCleaningModal('${f.room_id}','${(propTitle).replace(/'/g, "\\'")}')" title="Refuse cleaning">
                      ❌ Refuse
                    </button>
                  ` : ''}

                  ${isProgress ? `
                    <button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean',this)" style="flex:3;font-weight:800;font-size:12.5px;min-height:34px;">
                      ✅ Done (Mark Clean)
                    </button>
                    <button class="btn-sm" style="background:#F59E0B;color:#fff;font-size:11.5px;min-height:34px;" onclick="showRefuseCleaningModal('${f.room_id}','${(propTitle).replace(/'/g, "\\'")}')" title="Refuse cleaning">
                      ❌ Refuse
                    </button>
                  ` : ''}

                  ${isClean ? `
                    <button class="btn-sm danger" onclick="quickClean('${f.room_id}','Dirty',this)" style="flex:3;font-size:12px;min-height:34px;">
                      🧹 Mark Dirty
                    </button>
                  ` : ''}
                ` : ''}
                <button class="btn-sm outline" onclick="showEditFlatStatusModal('${f.room_id}')" title="Edit status, maintenance note & date" style="min-height:34px;padding:4px 10px;">
                  ✏️
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>
    ` : `
      <!-- Table View -->
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Property</th><th>Unit</th><th>Occupancy</th><th>Current Guest</th><th>Turnaround</th>
            <th>Cleaning Status</th><th>Last Cleaned</th><th>Quick Actions</th>${can ? '<th>Edit</th>' : ''}
          </tr></thead>
          <tbody>${filtered.map(f => {
            const isDirty = f.cleaning_status === 'Dirty';
            const isClean = f.cleaning_status === 'Clean';
            const isProgress = f.cleaning_status === 'In Progress';
            const propTitle = propLabel(f.rooms) || f.room_id;

            return `<tr>
              <td><strong>${propTitle}</strong></td>
              <td>${f.rooms?.unit_no || ''}</td>
              <td><span class="badge ${f.status === 'Free' ? 'green' : f.status === 'Booked' ? 'blue' : 'red'}">${f.status || 'Free'}</span></td>
              <td>
                ${f.activeStay ? `<strong>${f.activeStay.guest_name}</strong><br><small style="color:var(--muted);">${f.isCheckoutToday ? '📤 Checkout Today' : 'Out: ' + f.activeStay.check_out}</small>` : '<span style="color:var(--muted);">Vacant</span>'}
              </td>
              <td>
                ${f.isTurnaround ? `<span class="badge red" style="font-size:10px;">🚨 Priority</span><br><small>${f.todayArrival?.guest_name || ''}</small>` : f.todayArrival ? `<span class="badge blue" style="font-size:10px;">⚡ Incoming</span><br><small>${f.todayArrival.guest_name}</small>` : '-'}
              </td>
              <td>
                <span class="badge ${isClean ? 'green' : isProgress ? 'yellow' : 'red'}">${f.cleaning_status || 'Clean'}</span>
                ${f.cleaning_refused_reason ? `<br><small style="color:#F59E0B;font-size:10px;">🚫 ${f.cleaning_refused_reason}</small>` : ''}
                ${f.issue ? `<br><small style="color:#D97706;font-size:10px;">⚠️ ${f.issue}</small>` : ''}
              </td>
              <td><small>${formatLastCleaned(f.last_cleaned)}</small></td>
              <td class="table-actions">
                ${can ? `
                  ${isDirty ? `<button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean',this)">✅ Clean</button>` : ''}
                  ${isDirty ? `<button class="btn-sm secondary" onclick="quickClean('${f.room_id}','In Progress',this)">🔄</button>` : ''}
                  ${isDirty ? `<button class="btn-sm" style="background:#F59E0B;color:#fff;" onclick="showRefuseCleaningModal('${f.room_id}','${(propTitle).replace(/'/g, "\\'")}')">❌ Refuse</button>` : ''}
                  ${isProgress ? `<button class="btn-sm green-btn" onclick="quickClean('${f.room_id}','Clean',this)">✅ Done</button>` : ''}
                  ${isClean ? `<button class="btn-sm danger" onclick="quickClean('${f.room_id}','Dirty',this)">🧹 Mark Dirty</button>` : ''}
                ` : '-'}
              </td>
              ${can ? `<td><button class="btn-sm outline" onclick="showEditFlatStatusModal('${f.room_id}')">✏️</button></td>` : ''}
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    `}
  `, 'flats');
}

// ═══ FILTER & VIEW HELPERS ═══
window.setFlatsFilter = function(filter) {
  window._flatsActiveFilter = filter;
  renderFlatsStatus();
};

window.setFlatsViewMode = function(mode) {
  window._flatsViewMode = mode;
  localStorage.setItem('flats_view_mode', mode);
  renderFlatsStatus();
};

window.cleanAllFlats = async function(btn) {
  try {
    let query = sb.from('flats_status')
      .select('room_id, cleaning_status')
      .or('cleaning_status.eq.Dirty,cleaning_status.eq.In Progress');

    if (window._myAssignedRooms && window._myAssignedRooms.length) {
      query = query.in('room_id', window._myAssignedRooms);
    }

    const { data: dirtyList, error: qErr } = await query;

    if (qErr) {
      if (window.fsn) fsn.error('Error', qErr.message);
      else alert('Error: ' + qErr.message);
      return;
    }

    if (!dirtyList || dirtyList.length === 0) {
      if (window.fsn) fsn.info('All Clean', '✅ All flats are already marked Clean!');
      else alert('✅ All flats are already marked Clean!');
      return;
    }

    const count = dirtyList.length;
    const ok = confirm(`Mark all ${count} flat(s) as Clean?\n\nThis will update status to "Clean" and record today as last cleaned.`);
    if (!ok) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> <span>Cleaning...</span>';
    }

    const today = new Date().toISOString().slice(0, 10);
    const roomIds = dirtyList.map(d => d.room_id);

    const { error: upErr } = await sb.from('flats_status').update({
      cleaning_status: 'Clean',
      last_cleaned: today,
      cleaning_refused_reason: null,
      cleaning_refused_by: null,
      cleaning_refused_at: null
    }).in('room_id', roomIds);

    if (upErr) throw upErr;

    if (window.fsn) fsn.success('All Cleaned', `✅ All ${count} flats marked Clean!`);
    else alert(`✅ All ${count} flats marked Clean!`);

    await renderFlatsStatus();
  } catch (err) {
    if (window.fsn) fsn.error('Error', err.message);
    else alert('Failed: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🧹</span> <span>Clean All</span>';
    }
  }
};

window.runAutoCheckoutSync = async function(btn) {
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Syncing...'; }
  try {
    if (typeof window.autoCheckout === 'function') {
      await window.autoCheckout();
      if (window.fsn) fsn.success('Synced', 'Auto room status and checkout synchronization completed!');
    }
    await renderFlatsStatus();
  } catch (err) {
    if (window.fsn) fsn.error('Error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Auto-Sync'; }
  }
};

// ═══ QUICK CLEAN ACTION ═══
async function quickClean(roomId, newStatus, btnEl = null) {
  // Clear refuse reason if marking clean
  if (newStatus === 'Clean') {
    await sb.from('flats_status').update({
      cleaning_refused_reason: null,
      cleaning_refused_by: null,
      cleaning_refused_at: null
    }).eq('room_id', roomId);
  }

  const msgEl = document.getElementById('flatActionMsg');
  try {
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳'; }
    const updates = { cleaning_status: newStatus };
    if (newStatus === 'Clean') updates.last_cleaned = new Date().toISOString().slice(0, 10);
    const { error } = await sb.from('flats_status').update(updates).eq('room_id', roomId);
    if (error) throw error;
    if (window.fsn) fsn.success('Updated', `Room ${roomId} marked ${newStatus}`);
    renderFlatsStatus();
  } catch (err) {
    if (msgEl) msgEl.innerHTML = `<div class="error">❌ Failed: ${err.message}</div>`;
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Retry'; }
  }
}

// ═══ IN-PLACE EDIT FLAT STATUS MODAL ═══
window.showEditFlatStatusModal = async function(id) {
  const { data: f } = await sb.from('flats_status')
    .select('*, rooms(unit_no, nickname, property_name)')
    .eq('room_id', id).single();
  if (!f) { fsn.error('Error', 'Not found'); return; }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <div style="font-size:18px;font-weight:800;color:var(--dark);margin-bottom:2px;">✏️ Flat Status</div>
      <div class="sub" style="margin-bottom:14px;">${propLabel(f.rooms) || id} · Unit ${f.rooms?.unit_no || id}</div>
      
      <div class="form-grid">
        <div class="form-group"><label>Occupancy Status</label>
          <select id="modalFlatStatus">
            <option value="Free" ${f.status === 'Free' ? 'selected' : ''}>🟢 Free</option>
            <option value="Booked" ${f.status === 'Booked' ? 'selected' : ''}>🔵 Booked</option>
            <option value="Blocked-Maintenance" ${f.status === 'Blocked-Maintenance' ? 'selected' : ''}>⛔ Blocked-Maintenance</option>
          </select>
        </div>
        <div class="form-group"><label>Cleaning Status</label>
          <select id="modalCleanSt">
            <option value="Clean" ${f.cleaning_status === 'Clean' ? 'selected' : ''}>✅ Clean</option>
            <option value="Dirty" ${f.cleaning_status === 'Dirty' ? 'selected' : ''}>🧹 Dirty</option>
            <option value="In Progress" ${f.cleaning_status === 'In Progress' ? 'selected' : ''}>🔄 In Progress</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Maintenance Issue / Note</label>
        <input id="modalFlatIssue" value="${(f.issue || '').replace(/"/g, '&quot;')}" placeholder="e.g. Geyser switch replaced, AC service required" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;" />
      </div>

      <div class="form-group">
        <label>Last Cleaned Date</label>
        <input id="modalLastCleaned" type="date" value="${f.last_cleaned || ''}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;" />
      </div>

      <div class="form-group">
        <label>Cleaning Refusal Reason (if any)</label>
        <input id="modalRefusalReason" value="${(f.cleaning_refused_reason || '').replace(/"/g, '&quot;')}" placeholder="Leave blank to clear refusal" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;" />
      </div>

      <button id="btnSaveModalFlat" onclick="saveFlatStatusModal('${id}')" style="width:100%;padding:12px;font-size:14px;font-weight:700;margin-top:12px;">
        💾 Save Changes
      </button>
      <div id="modalFlatErr" style="margin-top:8px;"></div>
    </div>`;
  document.body.appendChild(modal);
};

window.saveFlatStatusModal = async function(id) {
  const btn = document.getElementById('btnSaveModalFlat');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  const updates = {
    status: document.getElementById('modalFlatStatus')?.value,
    cleaning_status: document.getElementById('modalCleanSt')?.value,
    issue: document.getElementById('modalFlatIssue')?.value?.trim() || null,
    last_cleaned: document.getElementById('modalLastCleaned')?.value || null,
    cleaning_refused_reason: document.getElementById('modalRefusalReason')?.value?.trim() || null
  };
  if (updates.cleaning_status === 'Clean') {
    updates.cleaning_refused_reason = null;
    updates.cleaning_refused_by = null;
    updates.cleaning_refused_at = null;
    if (!updates.last_cleaned) updates.last_cleaned = new Date().toISOString().slice(0, 10);
  }
  const { error } = await sb.from('flats_status').update(updates).eq('room_id', id);
  if (error) {
    const errEl = document.getElementById('modalFlatErr');
    if (errEl) errEl.innerHTML = `<div class="error">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
    return;
  }
  if (window.fsn) fsn.success('Updated', `Flat ${id} updated successfully!`);
  document.querySelector('.modal-overlay')?.remove();
  renderFlatsStatus();
};

window.editFlatStatus = function(id) {
  showEditFlatStatusModal(id);
};

// ═══ CLEANING REFUSE MODAL ═══
function showRefuseCleaningModal(roomId, roomLabel) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div class="modal-box" style="max-width:450px;">' +
    '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>' +
    '<h2>❌ Refuse Cleaning</h2>' +
    '<p style="color:var(--muted);margin:0 0 12px;">Room: <strong>' + roomLabel + '</strong></p>' +
    '<div class="form-group">' +
    '<label>Reason *</label>' +
    '<select id="refuseReason">' +
    '<option value="">— Select Reason —</option>' +
    '<option value="Not enough time today">Not enough time today</option>' +
    '<option value="Cleaning supplies unavailable">Cleaning supplies unavailable</option>' +
    '<option value="Guest still in flat">Guest still in flat</option>' +
    '<option value="Staff unavailable">Staff unavailable</option>' +
    '<option value="Water/electricity issue">Water/electricity issue</option>' +
    '<option value="Other">Other (specify below)</option>' +
    '</select></div>' +
    '<div class="form-group">' +
    '<label>Additional Notes</label>' +
    '<textarea id="refuseNotes" rows="3" placeholder="Optional details..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;"></textarea>' +
    '</div>' +
    '<button onclick="saveRefuseCleaning(\'' + roomId + '\')" style="width:100%;background:#F59E0B;color:#fff;margin-top:10px;">💾 Save Refusal</button>' +
    '<div id="refuseErr"></div>' +
    '</div>';
  document.body.appendChild(modal);
}

async function saveRefuseCleaning(roomId) {
  const reason = document.getElementById('refuseReason')?.value;
  const notes = document.getElementById('refuseNotes')?.value?.trim() || '';
  if (!reason) {
    document.getElementById('refuseErr').innerHTML = '<div class="error">Please select a reason</div>';
    return;
  }

  const fullReason = notes ? (reason + ' — ' + notes) : reason;

  const { error } = await sb.from('flats_status').update({
    cleaning_refused_reason: fullReason,
    cleaning_refused_by: SESSION.userId,
    cleaning_refused_at: new Date().toISOString()
  }).eq('room_id', roomId);

  if (error) {
    document.getElementById('refuseErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }

  if (window.fsn) fsn.warning('Cleaning Refused', 'Reason logged: ' + reason);
  document.querySelector('.modal-overlay')?.remove();
  renderFlatsStatus();
  if (window.renderPropertyList) renderPropertyList();
  if (window.renderDashboard) renderDashboard();
}

// ═══ DAILY 11 AM CLEANING REMINDER ═══
async function checkDailyCleaningReminder() {
  const now = new Date();
  const currentHour = now.getHours();
  const today = now.toISOString().slice(0, 10);
  const lastReminderDate = localStorage.getItem('uh_cleaning_reminder_date');

  if (currentHour < 11 || currentHour >= 18) return;
  if (lastReminderDate === today) return;

  const { data: dirtyFlats } = await sb.from('flats_status')
    .select('room_id, cleaning_status, cleaning_refused_reason')
    .eq('cleaning_status', 'Dirty');

  const pendingCount = (dirtyFlats || []).filter(f => !f.cleaning_refused_reason).length;

  if (pendingCount > 0 && window.fsn) {
    window.fsn.warning(
      '🧹 Daily Cleaning Reminder',
      pendingCount + ' flat(s) pending cleaning today. Check Properties page.'
    );
    localStorage.setItem('uh_cleaning_reminder_date', today);
  }
}

// Auto-check on load + every 30 min
setTimeout(function(){ if(window.sb && window.SESSION?.userId) checkDailyCleaningReminder(); }, 5000);
setInterval(function(){ if(window.sb && window.SESSION?.userId) checkDailyCleaningReminder(); }, 30 * 60 * 1000);

// Expose globally
window.showRefuseCleaningModal = showRefuseCleaningModal;
window.saveRefuseCleaning = saveRefuseCleaning;
window.quickClean = quickClean;
// ============ PROPERTY SHIFTS MANAGEMENT ============
async function renderPropertyShifts(roomId) {
  renderShell(`<div class="loading">Loading...</div>`, 'shifts');

  const [{ data: rooms }, { data: emps }, { data: allShifts, error: shiftErr }] = await Promise.all([
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('employees')
      .select('emp_id, name, phone, property_role, role, assigned_rooms')
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
                ${propLabel(r)}
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
                    ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="deleteShift(${sh.id},'${selRoom}')">🗑️</button>` : ''}
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
                <strong style="font-size:14px;">🏠 ${propLabel(g.room) || rid}</strong>
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
            ${propLabel(r)} ➕
          </button>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `, 'shifts');
}

async function renderAddShift(roomId) {
  const emps = (window._shiftEmps || []).filter(e =>
    ((e.assigned_rooms || '').split(',').map(x => x.trim()).filter(Boolean)).includes(roomId)
  );

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

  fsn.success('Success', '✅ Shift saved!');
  renderPropertyShifts(roomId);
}

async function editShift(id, roomId) {
  const [{ data: sh }, allEmps] = await Promise.all([
    sb.from('property_shifts').select('*').eq('id', id).single(),
    Promise.resolve(window._shiftEmps || [])
  ]);

  const emps = (allEmps || []).filter(e => {
    const assigned = ((e.assigned_rooms || '').split(',').map(x => x.trim()).filter(Boolean));
    return assigned.includes(roomId) || e.emp_id === sh?.emp_id;
  });

  if (!sh) { fsn.error('Error', 'Not found'); return; }

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

  fsn.success('Success', '✅ Updated!');
  renderPropertyShifts(roomId);
}

async function deleteShift(id, roomId) {
  if (!confirm('Remove this shift contact?')) return;
  const { error } = await sb.from('property_shifts').delete().eq('id', id);
  if (error) { fsn.error('Error', '❌ ' + error.message); return; }
  fsn.success('Success', '✅ Shift removed');
  renderPropertyShifts(roomId);
}