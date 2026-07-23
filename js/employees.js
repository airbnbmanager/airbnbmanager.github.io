/**
 * Employees Module
 * Employees, Tasks, Attendance, Salary, Advance
 * UNIQUE HAVEN HOMES STAY
 */

// ============ EMPLOYEES ============
async function renderManageEmployees() {
  renderShell(`<div class="loading">Loading...</div>`, 'employees');
  const { data: emps } = await sb.from("employees").select("*").order("name");
  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>👥 Employees</h1>
      <div class="sub">${(emps || []).length} total</div>
      ${isO ? `<button onclick="renderAddEmp()">➕ Add Employee</button>` : ''}
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Name</th><th>Role</th><th>Phone</th><th>Properties</th>
        <th>Salary</th><th>ID</th><th>Status</th>${isO ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${(emps || []).map(e => `<tr>
        <td><strong>${e.name}</strong></td>
        <td>${e.role || '-'}</td>
        <td>${e.phone || '-'}</td>
        <td style="font-size:11px;max-width:120px;">${e.assigned_rooms || '-'}</td>
        <td style="color:var(--red);">₹${(e.monthly_salary || 0).toLocaleString('en-IN')}</td>
        <td>
          ${e.id_proof_photo_front ? `<button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_front}')">📄 F</button>` : ''}
          ${e.id_proof_photo_back ? `<button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_back}')">📄 B</button>` : ''}
          ${!e.id_proof_photo_front && !e.id_proof_photo_back ? '-' : ''}
        </td>
        <td><span class="badge ${e.status === 'Active' ? 'green' : 'red'}">${e.status || 'Active'}</span></td>
        ${isO ? `<td class="table-actions">
          <button class="btn-sm" onclick="editEmp('${e.emp_id}')">✏️</button>
          <button class="btn-sm danger" onclick="delEmp('${e.emp_id}','${e.name}')">🗑️</button>
        </td>` : ''}
      </tr>`).join('')}</tbody>
    </table></div></div>
  `, 'employees');
}

function employeeRoleOptions(selected = '') {
  const roles = [
    'Caretaker',
    'Check-in Manager',
    'Cleaner',
    'Housekeeping',
    'Maid',
    'Laundry',
    'Maintenance',
    'Inventory',
    'Driver',
    'Supervisor',
    'Admin & Developer',
    'Other'
  ];
  const list = roles.includes(selected) || !selected ? roles : [selected, ...roles];
  return list.map(r => `<option value="${r}" ${r === selected ? 'selected' : ''}>${r}</option>`).join('');
}

function employeePropertyRoleOptions(selected = 'Staff') {
  const roles = ['Staff', 'Caretaker', 'Check-in Manager'];
  const list = roles.includes(selected) || !selected ? roles : [selected, ...roles];
  return list.map(r => `<option value="${r}" ${r === selected ? 'selected' : ''}>${r}</option>`).join('');
}

async function renderAddEmp() {
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname').order('room_id');
  renderShell(`
    <div class="card"><h1>➕ Add Employee</h1><button class="secondary btn-sm" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="eName" /></div>
        <div class="form-group"><label>Phone</label><input id="ePhone" type="tel" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Role</label>
          <select id="eRole">${employeeRoleOptions('')}</select>
        </div>
        <div class="form-group"><label>Property Contact Role</label>
          <select id="ePropertyRole">${employeePropertyRoleOptions('Staff')}</select>
        </div>
      </div>
      <div class="form-group"><label>Monthly Salary ₹</label><input id="eSal" type="number" /></div>
      <div class="form-group">
        <label>Assigned Properties</label>
        <select id="eRooms" multiple style="min-height:120px;">
          ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.room_id}</option>`).join('')}
        </select>
        <small style="color:var(--muted);">Hold Ctrl/Cmd to select multiple</small>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Join Date</label><input id="eJoin" type="date" /></div>
        <div class="form-group"><label>ID Type</label>
          <select id="eIdType">
            <option value="Aadhar">Aadhar</option><option value="PAN">PAN</option>
            <option value="DL">DL</option><option value="Passport">Passport</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>ID Number</label><input id="eIdNo" /></div>
        <div class="form-group"><label>Address</label><input id="eAddr" /></div>
      </div>
      <div class="form-group"><label>Emergency Contact</label><input id="eEmergency" /></div>
      <div class="form-grid">
        <div class="form-group"><label>ID Front Photo</label><input id="eIdFront" type="file" accept="image/*" /></div>
        <div class="form-group"><label>ID Back Photo</label><input id="eIdBack" type="file" accept="image/*" /></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0;">
        <input type="checkbox" id="eActive" checked /> Active
      </label>
      <div class="form-group"><label>Notes</label><textarea id="eNotes"></textarea></div>
      <button onclick="saveEmp()" style="width:100%;">💾 Save Employee</button>
      <div id="empErr"></div>
    </div>
  `, 'employees');
}

async function saveEmp() {
  const name = document.getElementById('eName').value.trim();
  if (!name) { document.getElementById('empErr').innerHTML = '<div class="error">Name required</div>'; return; }

  const roomsSelect = document.getElementById('eRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o => o.value).join(',') : '';

  let frontPath = null, backPath = null;
  const empId = 'E' + Date.now();

  const frontFile = document.getElementById('eIdFront')?.files?.[0];
  if (frontFile) {
    try {
      const comp = await compressImage(frontFile);
      const path = `employees/${empId}_front.jpg`;
      const { error } = await sb.storage.from('id-proofs').upload(path, comp, { contentType: 'image/jpeg' });
      if (!error) frontPath = path;
    } catch (e) { console.warn('Front upload failed', e); }
  }

  const backFile = document.getElementById('eIdBack')?.files?.[0];
  if (backFile) {
    try {
      const comp = await compressImage(backFile);
      const path = `employees/${empId}_back.jpg`;
      const { error } = await sb.storage.from('id-proofs').upload(path, comp, { contentType: 'image/jpeg' });
      if (!error) backPath = path;
    } catch (e) { console.warn('Back upload failed', e); }
  }

  const { error } = await sb.from('employees').insert({
    emp_id: empId,
    name,
    phone: document.getElementById('ePhone').value.trim() || null,
    role: document.getElementById('eRole').value || null,
    property_role: document.getElementById('ePropertyRole').value || 'Staff',
    monthly_salary: parseFloat(document.getElementById('eSal').value) || 0,
    joining_date: document.getElementById('eJoin').value || null,
    assigned_rooms: selectedRooms || null,
    id_proof_type: document.getElementById('eIdType').value || null,
    id_proof_no: document.getElementById('eIdNo').value.trim() || null,
    address: document.getElementById('eAddr').value.trim() || null,
    emergency_contact: document.getElementById('eEmergency').value.trim() || null,
    id_proof_photo_front: frontPath,
    id_proof_photo_back: backPath,
    status: document.getElementById('eActive').checked ? 'Active' : 'Inactive',
    notes: document.getElementById('eNotes').value.trim() || null,
  });

  if (error) { document.getElementById('empErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderManageEmployees();
}

async function editEmp(id) {
  const { data: e } = await sb.from('employees').select('*').eq('emp_id', id).single();
  if (!e) return;
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname').order('room_id');
  const assignedArr = (e.assigned_rooms || '').split(',').map(s => s.trim()).filter(Boolean);

  renderShell(`
    <div class="card"><h1>✏️ Edit Employee</h1><button class="secondary btn-sm" onclick="renderManageEmployees()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name</label><input id="eName" value="${e.name}" /></div>
        <div class="form-group"><label>Phone</label><input id="ePhone" value="${e.phone || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Role</label>
          <select id="eRole">${employeeRoleOptions(e.role || '')}</select>
        </div>
        <div class="form-group"><label>Property Contact Role</label>
          <select id="ePropertyRole">${employeePropertyRoleOptions(e.property_role || 'Staff')}</select>
        </div>
      </div>
      <div class="form-group"><label>Salary ₹</label><input id="eSal" type="number" value="${e.monthly_salary || 0}" /></div>
      <div class="form-group">
        <label>Assigned Properties</label>
        <select id="eRooms" multiple style="min-height:120px;">
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${assignedArr.includes(r.room_id) ? 'selected' : ''}>${r.nickname || r.room_id}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Join Date</label><input id="eJoin" type="date" value="${e.joining_date || ''}" /></div>
        <div class="form-group"><label>ID Type</label>
          <select id="eIdType">
            <option value="Aadhar" ${e.id_proof_type === 'Aadhar' ? 'selected' : ''}>Aadhar</option>
            <option value="PAN" ${e.id_proof_type === 'PAN' ? 'selected' : ''}>PAN</option>
            <option value="DL" ${e.id_proof_type === 'DL' ? 'selected' : ''}>DL</option>
            <option value="Passport" ${e.id_proof_type === 'Passport' ? 'selected' : ''}>Passport</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>ID Number</label><input id="eIdNo" value="${e.id_proof_no || ''}" /></div>
        <div class="form-group"><label>Address</label><input id="eAddr" value="${e.address || ''}" /></div>
      </div>
      <div class="form-group"><label>Emergency Contact</label><input id="eEmergency" value="${e.emergency_contact || ''}" /></div>
      <div class="section-title" style="margin-top:12px;">📄 ID Photos</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Front</label>
          ${e.id_proof_photo_front ? `<div class="btn-row"><button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_front}')">📥 View Front</button></div>` : '<div class="sub">Not uploaded</div>'}
          <input id="eIdFront" type="file" accept="image/*" />
        </div>
        <div class="form-group">
          <label>Back</label>
          ${e.id_proof_photo_back ? `<div class="btn-row"><button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_back}')">📥 View Back</button></div>` : '<div class="sub">Not uploaded</div>'}
          <input id="eIdBack" type="file" accept="image/*" />
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin:8px 0;">
        <input type="checkbox" id="eActive" ${e.status === 'Active' ? 'checked' : ''} /> Active
      </label>
      <div class="form-group"><label>Notes</label><textarea id="eNotes">${e.notes || ''}</textarea></div>
      <button onclick="updEmp('${id}')" style="width:100%;">💾 Update</button>
      <div id="empErr"></div>
    </div>
  `, 'employees');
}

async function updEmp(id) {
  const name = document.getElementById('eName').value.trim();
  if (!name) { document.getElementById('empErr').innerHTML = '<div class="error">Name required</div>'; return; }

  const roomsSelect = document.getElementById('eRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o => o.value).join(',') : '';

  const obj = {
    name,
    phone: document.getElementById('ePhone').value.trim() || null,
    role: document.getElementById('eRole').value || null,
    property_role: document.getElementById('ePropertyRole').value || 'Staff',
    monthly_salary: parseFloat(document.getElementById('eSal').value) || 0,
    joining_date: document.getElementById('eJoin').value || null,
    assigned_rooms: selectedRooms || null,
    id_proof_type: document.getElementById('eIdType').value || null,
    id_proof_no: document.getElementById('eIdNo').value.trim() || null,
    address: document.getElementById('eAddr').value.trim() || null,
    emergency_contact: document.getElementById('eEmergency').value.trim() || null,
    status: document.getElementById('eActive').checked ? 'Active' : 'Inactive',
    notes: document.getElementById('eNotes').value.trim() || null,
  };

  const frontFile = document.getElementById('eIdFront')?.files?.[0];
  if (frontFile) {
    try {
      const comp = await compressImage(frontFile);
      const path = `employees/${id}_front_${Date.now()}.jpg`;
      const { error } = await sb.storage.from('id-proofs').upload(path, comp, { contentType: 'image/jpeg' });
      if (!error) obj.id_proof_photo_front = path;
    } catch (e) { console.warn('Front upload failed', e); }
  }

  const backFile = document.getElementById('eIdBack')?.files?.[0];
  if (backFile) {
    try {
      const comp = await compressImage(backFile);
      const path = `employees/${id}_back_${Date.now()}.jpg`;
      const { error } = await sb.storage.from('id-proofs').upload(path, comp, { contentType: 'image/jpeg' });
      if (!error) obj.id_proof_photo_back = path;
    } catch (e) { console.warn('Back upload failed', e); }
  }

  await sb.from('employees').update(obj).eq('emp_id', id);


  renderManageEmployees();
}


async function delEmp(id, name) {
  if (!confirm(`Delete "${name}" & all records?`)) return;
  await sb.from('employee_tasks').delete().eq('emp_id', id);
  await sb.from('attendance_log').delete().eq('emp_id', id);
  await sb.from('salary_tracker').delete().eq('emp_id', id);
  await sb.from('advance_tracker').delete().eq('emp_id', id);
  await sb.from('profiles').delete().eq('emp_id', id);
  await sb.from('employees').delete().eq('emp_id', id);
  renderManageEmployees();
}

// ============ TASKS ============
async function renderEmployeeTasks() {
  renderShell(`<div class="loading">Loading...</div>`, 'tasks');

  const { data: tasks } = await sb.from('employee_tasks')
    .select('*')
    .order('assigned_date', { ascending: false });

  const { data: emps } = await sb.from('employees').select('emp_id, name');
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname');

  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e.name; });
  const roomMap2 = {};
  (rooms || []).forEach(r => { roomMap2[r.room_id] = r.nickname; });

  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>🧰 Tasks</h1>
      <div class="sub">${(tasks || []).length} tasks</div>
      ${isO ? `<button onclick="renderAddTask()">➕ Add Task</button>` : ''}
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Employee</th><th>Property</th><th>Type</th><th>Task</th>
        <th>Priority</th><th>Date</th><th>Status</th>
        ${isO ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${(tasks || []).map(t => `<tr>
        <td><strong>${empMap[t.emp_id] || t.emp_id}</strong></td>
        <td>${roomMap2[t.room_id] || '-'}</td>
        <td><span class="badge blue">${t.task_type || 'Other'}</span></td>
        <td>${t.task_description || '-'}</td>
        <td><span class="badge ${t.priority === 'Urgent' ? 'red' : t.priority === 'High' ? 'yellow' : 'green'}">${t.priority || 'Normal'}</span></td>
        <td>${t.assigned_date || '-'}</td>
        <td><span class="badge ${t.status === 'Completed' ? 'green' : t.status === 'In Progress' ? 'yellow' : 'red'}">${t.status || 'Pending'}</span></td>
        ${isO ? `<td class="table-actions">
          <button class="btn-sm" onclick="editTask(${t.id})">✏️</button>
          <button class="btn-sm danger" onclick="delTask(${t.id})">🗑️</button>
        </td>` : ''}
      </tr>`).join('') || '<tr><td colspan="8" class="sub">No tasks</td></tr>'}</tbody>
    </table></div></div>
  `, 'tasks');
}

async function renderAddTask() {
  const [{ data: emps }, { data: rooms }] = await Promise.all([
    sb.from('employees').select('emp_id,name').eq('status', 'Active').order('name'),
    sb.from('rooms').select('room_id,nickname').order('room_id')
  ]);

  renderShell(`
    <div class="card"><h1>➕ Add Task</h1><button class="secondary btn-sm" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Employee *</label>
          <select id="tEmp"><option value="">Select</option>
            ${(emps || []).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Property</label>
          <select id="tRoom"><option value="">General</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.room_id}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Task Type</label>
          <select id="tType">
            <option value="Cleaning">Cleaning</option>
            <option value="Dusting">Dusting</option>
            <option value="Laundry">Laundry</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Guest Check-in">Guest Check-in</option>
            <option value="Guest Check-out">Guest Check-out</option>
            <option value="Inventory">Inventory</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group"><label>Priority</label>
          <select id="tPriority">
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Task Description *</label><textarea id="tDesc" placeholder="Details..."></textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Date</label><input id="tDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="tSt"><option>Pending</option><option>In Progress</option><option>Completed</option></select>
        </div>
      </div>
      <button onclick="saveTask()" style="width:100%;">💾 Save Task</button>
      <div id="tErr"></div>
    </div>
  `, 'tasks');
}

async function saveTask() {
  const eid = document.getElementById('tEmp').value;
  const desc = document.getElementById('tDesc').value.trim();
  if (!eid || !desc) { document.getElementById('tErr').innerHTML = '<div class="error">Employee & task required</div>'; return; }
  await sb.from('employee_tasks').insert({
    emp_id: eid,
    room_id: document.getElementById('tRoom').value || null,
    task_type: document.getElementById('tType').value,
    task_description: desc,
    assigned_date: document.getElementById('tDate').value || null,
    status: document.getElementById('tSt').value,
    priority: document.getElementById('tPriority')?.value || 'Normal',
  });
  renderEmployeeTasks();
}

async function editTask(id) {
  const { data: t } = await sb.from('employee_tasks').select('*, employees(name)').eq('id', id).single();
  if (!t) return;
  const { data: rooms } = await sb.from('rooms').select('room_id,nickname').order('room_id');

  renderShell(`
    <div class="card"><h1>✏️ Edit Task</h1><button class="secondary btn-sm" onclick="renderEmployeeTasks()">← Back</button></div>
    <div class="card">
      <div class="sub">${t.employees?.name || t.emp_id}</div>
      <div class="form-group"><label>Property</label>
        <select id="tRoom">
          <option value="">General</option>
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id === t.room_id ? 'selected' : ''}>${r.nickname || r.room_id}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Type</label>
          <select id="tType">
            ${['Cleaning','Dusting','Laundry','Maintenance','Guest Check-in','Guest Check-out','Inventory','Other']
              .map(tp => `<option ${tp === t.task_type ? 'selected' : ''}>${tp}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Priority</label>
          <select id="tPriority">
            ${['Normal','High','Urgent'].map(p => `<option ${p === (t.priority || 'Normal') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Task</label><textarea id="tDesc">${t.task_description || ''}</textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Date</label><input id="tDate" type="date" value="${t.assigned_date || ''}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="tSt">
            <option ${t.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option ${t.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      </div>
      <button onclick="updTask(${id})" style="width:100%;">💾 Update</button>
    </div>
  `, 'tasks');
}

async function updTask(id) {
  await sb.from('employee_tasks').update({
    room_id: document.getElementById('tRoom').value || null,
    task_type: document.getElementById('tType').value,
    task_description: document.getElementById('tDesc').value.trim(),
    assigned_date: document.getElementById('tDate').value || null,
    status: document.getElementById('tSt').value,
    priority: document.getElementById('tPriority')?.value || 'Normal',
  }).eq('id', id);
  renderEmployeeTasks();
}

async function delTask(id) {
  if (confirm('Delete task?')) {
    await sb.from('employee_tasks').delete().eq('id', id);
    renderEmployeeTasks();
  }
}

// ============ ATTENDANCE ============
async function renderAttendance() {
  renderShell(`<div class="loading">Loading...</div>`, 'attendance');
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: emps }, { data: att }] = await Promise.all([
    sb.from('employees').select('emp_id,name,role').eq('status', 'Active').order('name'),
    sb.from('attendance_log').select('*').eq('att_date', today)
  ]);
  const am = {};
  (att || []).forEach(a => { am[a.emp_id] = a.status; });
  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>📋 Attendance — ${today}</h1>
      <div class="sub">${(emps || []).length} active employees</div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Role</th><th>Status</th>${isO ? '<th>Mark</th>' : ''}</tr></thead>
      <tbody>${(emps || []).map(e => {
        const st = am[e.emp_id] || 'Not Marked';
        return `<tr>
          <td><strong>${e.name}</strong></td>
          <td style="font-size:12px;">${e.role || '-'}</td>
          <td><span class="badge ${st === 'Present' ? 'green' : st === 'Absent' ? 'red' : 'yellow'}">${st}</span></td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm green-btn" onclick="markAtt('${e.emp_id}','Present')">✅ P</button>
            <button class="btn-sm danger" onclick="markAtt('${e.emp_id}','Absent')">❌ A</button>
            <button class="btn-sm secondary" onclick="markAtt('${e.emp_id}','Half Day')">½</button>
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'attendance');
}

async function markAtt(eid, st) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: ex } = await sb.from('attendance_log').select('id').eq('emp_id', eid).eq('att_date', today).single();
  if (ex) await sb.from('attendance_log').update({ status: st }).eq('id', ex.id);
  else await sb.from('attendance_log').insert({ emp_id: eid, att_date: today, status: st });
  renderAttendance();
}

// ============ ATTENDANCE SUMMARY ============
async function renderAttendanceSummary() {
  renderShell(`<div class="loading">Loading...</div>`, 'att-summary');
  const cm = new Date().toISOString().slice(0, 7);
  const daysInMonth = new Date(parseInt(cm.split('-')[0]), parseInt(cm.split('-')[1]), 0).getDate();

  const [{ data: emps }, { data: logs }] = await Promise.all([
    sb.from('employees').select('emp_id,name,role,monthly_salary').eq('status', 'Active').order('name'),
    sb.from('attendance_log').select('emp_id,status,att_date').gte('att_date', `${cm}-01`).lte('att_date', `${cm}-31`)
  ]);

  const sum = (emps || []).map(e => {
    const el = (logs || []).filter(l => l.emp_id === e.emp_id);
    const pr = el.filter(l => l.status === 'Present').length;
    const ab = el.filter(l => l.status === 'Absent').length;
    const hd = el.filter(l => l.status === 'Half Day').length;
    const totalMarked = pr + ab + hd;
    const effectiveDays = pr + (hd * 0.5);
    const pct = totalMarked > 0 ? ((effectiveDays / totalMarked) * 100).toFixed(1) : '0.0';
    const perDay = e.monthly_salary > 0 ? Math.round(e.monthly_salary / daysInMonth) : 0;
    const earnedSalary = Math.round(effectiveDays * perDay);
    const deduction = (e.monthly_salary || 0) - earnedSalary;
    return { ...e, pr, ab, hd, totalMarked, effectiveDays, pct, perDay, earnedSalary, deduction };
  });

  renderShell(`
    <div class="card">
      <h1>📊 Attendance Report — ${cm}</h1>
      <div class="sub">Days in month: ${daysInMonth}</div>
      <button class="secondary btn-sm" onclick="renderAttendance()">📋 Mark Today</button>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Employee</th><th>Role</th><th>Present</th><th>Half</th><th>Absent</th>
        <th>Effective</th><th>%</th><th>Per Day ₹</th><th>Earned ₹</th><th>Deduction ₹</th>
      </tr></thead>
      <tbody>${sum.map(s => `<tr>
        <td><strong>${s.name}</strong></td>
        <td style="font-size:11px;">${s.role || '-'}</td>
        <td><span class="badge green">${s.pr}</span></td>
        <td><span class="badge yellow">${s.hd}</span></td>
        <td><span class="badge ${s.ab > 0 ? 'red' : 'green'}">${s.ab}</span></td>
        <td><strong>${s.effectiveDays}</strong></td>
        <td><strong class="${parseFloat(s.pct) < 75 ? 'metric-value warn' : ''}">${s.pct}%</strong></td>
        <td style="color:var(--red);">₹${s.perDay.toLocaleString('en-IN')}</td>
        <td style="color:var(--green);">₹${s.earnedSalary.toLocaleString('en-IN')}</td>
        <td style="color:${s.deduction > 0 ? 'var(--red)' : 'var(--green)'};">₹${s.deduction.toLocaleString('en-IN')}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>
  `, 'att-summary');
}

// ============ SALARY TRACKER ============
async function renderSalaryTracker() {
  renderShell(`<div class="loading">Loading...</div>`, 'salary');
  const { data: sals } = await sb.from('salary_tracker').select('*, employees(name)').order('month', { ascending: false });
  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>💰 Payroll</h1>
      <div class="sub">${(sals || []).length} records</div>
      ${isO ? `<button onclick="renderAddSal()">➕ Add Record</button>` : ''}
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Employee</th><th>Month</th><th>Due ₹</th><th>Paid ₹</th><th>Balance ₹</th>
        ${isO ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${(sals || []).map(s => {
        const bal = (s.salary_due || 0) - (s.salary_paid || 0);
        return `<tr>
          <td><strong>${s.employees?.name || s.emp_id}</strong></td>
          <td>${s.month || '-'}</td>
          <td style="color:var(--red);">₹${(s.salary_due || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--green);">₹${(s.salary_paid || 0).toLocaleString('en-IN')}</td>
          <td style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'};">₹${bal.toLocaleString('en-IN')}</td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm" onclick="editSal(${s.id})">✏️</button>
            <button class="btn-sm danger" onclick="delSal(${s.id})">🗑️</button>
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'salary');
}

async function renderAddSal() {
  const { data: emps } = await sb.from('employees').select('emp_id,name,monthly_salary').eq('status', 'Active').order('name');
  window._salCache = emps || [];

  renderShell(`
    <div class="card"><h1>➕ Salary Record</h1><button class="secondary btn-sm" onclick="renderSalaryTracker()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Employee *</label>
        <select id="sEmp" onchange="onSalEmpChg()"><option value="">Select</option>
          ${(emps || []).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}
        </select>
      </div>
      <div id="sInfo" class="sub"></div>
      <div class="form-grid">
        <div class="form-group"><label>Month</label><input id="sMo" type="month" value="${new Date().toISOString().slice(0, 7)}" /></div>
        <div class="form-group"><label>Due ₹</label><input id="sDue" type="number" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Paid ₹</label><input id="sPaid" type="number" /></div>
        <div class="form-group"><label>Date</label><input id="sDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
      </div>
      <div class="form-group"><label>Payment Mode</label>
        <select id="sMode">
          <option value="">--</option>
          <option>Cash</option><option>UPI</option><option>Bank</option>
        </select>
      </div>
      <button onclick="saveSal()" style="width:100%;">💾 Save</button>
      <div id="salErr"></div>
    </div>
  `, 'salary');
}

function onSalEmpChg() {
  const e = (window._salCache || []).find(x => x.emp_id === document.getElementById('sEmp').value);
  if (e) {
    document.getElementById('sInfo').innerHTML = `💡 Monthly Salary: ₹${(e.monthly_salary || 0).toLocaleString('en-IN')}`;
    document.getElementById('sDue').value = e.monthly_salary || 0;
  }
}

async function saveSal() {
  const eid = document.getElementById('sEmp').value;
  const mo = document.getElementById('sMo').value;
  if (!eid || !mo) { document.getElementById('salErr').innerHTML = '<div class="error">Employee & month required</div>'; return; }
  await sb.from('salary_tracker').insert({
    emp_id: eid,
    month: mo,
    salary_due: parseFloat(document.getElementById('sDue').value) || 0,
    salary_paid: parseFloat(document.getElementById('sPaid').value) || 0,
    payment_date: document.getElementById('sDate').value || null,
    payment_mode: document.getElementById('sMode').value || null,
  });
  renderSalaryTracker();
}

async function editSal(id) {
  const { data: s } = await sb.from('salary_tracker').select('*, employees(name)').eq('id', id).single();
  if (!s) return;

  renderShell(`
    <div class="card"><h1>✏️ Edit Salary</h1><button class="secondary btn-sm" onclick="renderSalaryTracker()">← Back</button></div>
    <div class="card">
      <div class="sub">${s.employees?.name || s.emp_id}</div>
      <div class="form-grid">
        <div class="form-group"><label>Month</label><input id="sMo" type="month" value="${s.month || ''}" /></div>
        <div class="form-group"><label>Due ₹</label><input id="sDue" type="number" value="${s.salary_due || 0}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Paid ₹</label><input id="sPaid" type="number" value="${s.salary_paid || 0}" /></div>
        <div class="form-group"><label>Date</label><input id="sDate" type="date" value="${s.payment_date || ''}" /></div>
      </div>
      <div class="form-group"><label>Payment Mode</label>
        <select id="sMode">
          <option value="" ${!s.payment_mode ? 'selected' : ''}>--</option>
          <option ${s.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
          <option ${s.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
          <option ${s.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
        </select>
      </div>
      <button onclick="updSal(${id})" style="width:100%;">💾 Update</button>
    </div>
  `, 'salary');
}

async function updSal(id) {
  await sb.from('salary_tracker').update({
    month: document.getElementById('sMo').value,
    salary_due: parseFloat(document.getElementById('sDue').value) || 0,
    salary_paid: parseFloat(document.getElementById('sPaid').value) || 0,
    payment_date: document.getElementById('sDate').value || null,
    payment_mode: document.getElementById('sMode').value?.trim() || null,
  }).eq('id', id);
  renderSalaryTracker();
}

async function delSal(id) {
  if (confirm('Delete?')) { await sb.from('salary_tracker').delete().eq('id', id); renderSalaryTracker(); }
}

// ============ ADVANCE TRACKER ============
async function renderAdvanceTracker() {
  renderShell(`<div class="loading">Loading...</div>`, 'advance');
  const { data: advs } = await sb.from('advance_tracker').select('*, employees(name)').order('date_given', { ascending: false });
  const isO = SESSION.role === 'owner';

  const totalGiven   = (advs || []).reduce((s, a) => s + (a.advance_amount || 0), 0);
  const totalRepaid  = (advs || []).reduce((s, a) => s + (a.repaid_amount || 0), 0);
  const totalBalance = totalGiven - totalRepaid;

  renderShell(`
    <div class="card">
      <h1>💵 Advances</h1>
      <div class="sub">${(advs || []).length} records</div>
      ${isO ? `<button onclick="renderAddAdv()">➕ Add</button>` : ''}
    </div>

    <div class="card">
      <div class="metric-row">
        <span class="metric-label">Total Given</span>
        <span class="metric-value" style="color:var(--red);">₹${totalGiven.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Repaid</span>
        <span class="metric-value" style="color:var(--green);">₹${totalRepaid.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Outstanding</span>
        <span class="metric-value" style="color:${totalBalance > 0 ? 'var(--red)' : 'var(--green)'};">₹${totalBalance.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Employee</th><th>Date</th><th>Given ₹</th>
        <th>Repaid ₹</th><th>Repaid On</th><th>Balance ₹</th>
        <th>Mode</th><th>Reason</th>
        ${isO ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${(advs || []).map(a => {
        const bal = (a.advance_amount || 0) - (a.repaid_amount || 0);
        return `<tr>
          <td><strong>${a.employees?.name || a.emp_id}</strong></td>
          <td style="font-size:12px;">${a.date_given || '-'}</td>
          <td style="color:var(--red);">₹${(a.advance_amount || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--green);">₹${(a.repaid_amount || 0).toLocaleString('en-IN')}</td>
          <td style="font-size:12px;">${a.repaid_date || '-'}</td>
          <td style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'};">₹${bal.toLocaleString('en-IN')}</td>
          <td style="font-size:12px;">${a.payment_mode || '-'}</td>
          <td style="font-size:12px;">${a.reason || '-'}</td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm" onclick="editAdv(${a.id})">✏️</button>
            <button class="btn-sm danger" onclick="delAdv(${a.id})">🗑️</button>
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'advance');
}

async function renderAddAdv() {
  const { data: emps } = await sb.from('employees').select('emp_id,name').eq('status', 'Active').order('name');
  renderShell(`
    <div class="card"><h1>➕ Advance</h1><button class="secondary btn-sm" onclick="renderAdvanceTracker()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Employee *</label>
        <select id="aEmp"><option value="">Select</option>
          ${(emps || []).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Date Given</label><input id="aDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
        <div class="form-group"><label>Amount ₹ *</label><input id="aAmt" type="number" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Payment Mode</label>
          <select id="aMode">
            <option value="">--</option>
            <option>Cash</option><option>UPI</option><option>Bank</option>
          </select>
        </div>
        <div class="form-group"><label>Reason</label><input id="aReason" /></div>
      </div>
      <button onclick="saveAdv()" style="width:100%;">💾 Save</button>
      <div id="advErr"></div>
    </div>
  `, 'advance');
}

async function saveAdv() {
  const eid = document.getElementById('aEmp').value;
  const amt = parseFloat(document.getElementById('aAmt').value) || 0;
  if (!eid || amt <= 0) { document.getElementById('advErr').innerHTML = '<div class="error">Employee & amount required</div>'; return; }
  const { error } = await sb.from('advance_tracker').insert({
    emp_id: eid,
    date_given: document.getElementById('aDate').value || null,
    advance_amount: amt,
    repaid_amount: 0,
    payment_mode: document.getElementById('aMode').value || null,
    reason: document.getElementById('aReason').value.trim() || null
  });
  if (error) { document.getElementById('advErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderAdvanceTracker();
}

async function editAdv(id) {
  const { data: a } = await sb.from('advance_tracker').select('*, employees(name)').eq('id', id).single();
  if (!a) return;
  renderShell(`
    <div class="card"><h1>✏️ Edit Advance</h1><button class="secondary btn-sm" onclick="renderAdvanceTracker()">← Back</button></div>
    <div class="card">
      <div class="sub" style="font-weight:600;font-size:14px;">${a.employees?.name || a.emp_id}</div>
      <div class="form-grid">
        <div class="form-group"><label>Given Date</label><input id="aDate" type="date" value="${a.date_given || ''}" /></div>
        <div class="form-group"><label>Amount ₹</label><input id="aAmt" type="number" value="${a.advance_amount || 0}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Repaid ₹</label><input id="aRep" type="number" value="${a.repaid_amount || 0}" /></div>
        <div class="form-group"><label>Repaid Date</label><input id="aRepDate" type="date" value="${a.repaid_date || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Payment Mode</label>
          <select id="aMode">
            <option value="" ${!a.payment_mode ? 'selected' : ''}>--</option>
            <option ${a.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
            <option ${a.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
            <option ${a.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
          </select>
        </div>
        <div class="form-group"><label>Reason</label><input id="aReason" value="${a.reason || ''}" /></div>
      </div>
      <button onclick="updAdv(${id})" style="width:100%;">💾 Update</button>
    </div>
  `, 'advance');
}

async function updAdv(id) {
  await sb.from('advance_tracker').update({
    date_given: document.getElementById('aDate').value || null,
    advance_amount: parseFloat(document.getElementById('aAmt').value) || 0,
    repaid_amount: parseFloat(document.getElementById('aRep').value) || 0,
    repaid_date: document.getElementById('aRepDate').value || null,
    payment_mode: document.getElementById('aMode').value || null,
    reason: document.getElementById('aReason').value.trim() || null
  }).eq('id', id);
  renderAdvanceTracker();
}

async function delAdv(id) {
  if (confirm('Delete?')) { await sb.from('advance_tracker').delete().eq('id', id); renderAdvanceTracker(); }
}

// ============ EMPLOYEE GENERAL EXPENSES ============
async function renderEmpExpenses() {
  renderShell(`<div class="loading">Loading...</div>`, 'emp-expenses');

  const [{ data: exps }, { data: emps }, { data: rooms }] = await Promise.all([
    sb.from('daily_expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .limit(200),
    sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name'),
    sb.from('rooms').select('room_id, nickname').order('room_id')
  ]);

  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e.name; });
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r.nickname; });

  const total = (exps || []).reduce((s, e) => s + (e.amount || 0), 0);
  const isO = SESSION.role === 'owner' || SESSION.role === 'manager';

  window._empExpData = exps || [];
  window._empExpEmpMap = empMap;
  window._empExpRoomMap = roomMap;
  window._empExpEmps = emps || [];
  window._empExpRooms = rooms || [];

  renderShell(`
    <div class="card">
      <h1>🧾 Employee Expenses</h1>
      <div class="sub">Daily / General expenses by staff</div>
      <div class="btn-row">
        <button onclick="renderAddEmpExpense()">➕ Log Expense</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🔍 Filter</div>
      <div class="form-grid">
        <div class="form-group"><label>Employee</label>
          <select id="eeEmpFilter" onchange="filterEmpExpenses()">
            <option value="">All Employees</option>
            ${(emps || []).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Category</label>
          <select id="eeCatFilter" onchange="filterEmpExpenses()">
            <option value="">All Categories</option>
            ${['Cleaning Supplies','Grocery','Transport','Maintenance','Laundry','Utilities','Other']
              .map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Month</label>
          <input type="month" id="eeMonthFilter"
            value="${new Date().toISOString().slice(0,7)}"
            onchange="filterEmpExpenses()" />
        </div>
      </div>
    </div>

    <div id="eeTableWrap"></div>
  `, 'emp-expenses');

  filterEmpExpenses();
}

function filterEmpExpenses() {
  const wrap = document.getElementById('eeTableWrap');
  if (!wrap) return;

  const empVal   = document.getElementById('eeEmpFilter')?.value || '';
  const catVal   = document.getElementById('eeCatFilter')?.value || '';
  const monthVal = document.getElementById('eeMonthFilter')?.value || '';

  let filtered = (window._empExpData || []);
  if (empVal)   filtered = filtered.filter(e => e.emp_id === empVal);
  if (catVal)   filtered = filtered.filter(e => e.category === catVal);
  if (monthVal) filtered = filtered.filter(e => (e.expense_date || '').startsWith(monthVal));

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const isO = SESSION.role === 'owner' || SESSION.role === 'manager';

  wrap.innerHTML = `
    <div class="card">
      <div class="section-title">
        Expenses
        <span class="badge red" style="float:right;">
          Total: ₹${total.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th><th>Employee</th><th>Category</th>
          <th>Property</th><th>Amount</th><th>Description</th>
          <th>Paid To</th><th>Mode</th>
          ${isO ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>
          ${filtered.length === 0
            ? `<tr><td colspan="${isO ? 9 : 8}" class="sub" style="text-align:center;">No expenses</td></tr>`
            : filtered.map(e => `
              <tr>
                <td style="font-size:12px;">${e.expense_date || '-'}</td>
                <td><strong>${window._empExpEmpMap[e.emp_id] || e.emp_id || '-'}</strong></td>
                <td><span class="badge yellow">${e.category || '-'}</span></td>
                <td style="font-size:12px;">${window._empExpRoomMap[e.room_id] || e.room_id || 'General'}</td>
                <td style="color:var(--red);font-weight:700;">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
                <td style="font-size:12px;max-width:160px;">${e.description || '-'}</td>
                <td style="font-size:12px;">${e.paid_to || '-'}</td>
                <td style="font-size:12px;">${e.payment_mode || '-'}</td>
                ${isO ? `<td class="table-actions">
                  <button class="btn-sm" onclick="editEmpExpense(${e.id})">✏️</button>
                  <button class="btn-sm danger" onclick="delEmpExpense(${e.id})">🗑️</button>
                </td>` : ''}
              </tr>
            `).join('')}
        </tbody>
        ${filtered.length > 0 ? `
        <tfoot>
          <tr style="font-weight:700;background:#fafafa;">
            <td colspan="4">Total</td>
            <td style="color:var(--red);">₹${total.toLocaleString('en-IN')}</td>
            <td colspan="${isO ? 4 : 3}"></td>
          </tr>
        </tfoot>` : ''}
      </table></div>
    </div>
  `;
}

async function renderAddEmpExpense() {
  const today = new Date().toISOString().slice(0, 10);

  renderShell(`
    <div class="card">
      <h1>➕ Log Employee Expense</h1>
      <button class="secondary btn-sm" onclick="renderEmpExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Employee *</label>
          <select id="eeEmp">
            <option value="">Select Employee</option>
            ${(window._empExpEmps || []).map(e =>
              `<option value="${e.emp_id}">${e.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group"><label>Date *</label>
          <input id="eeDate" type="date" value="${today}" />
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Category *</label>
          <select id="eeCat">
            <option value="">Select</option>
            ${['Cleaning Supplies','Grocery','Transport','Maintenance','Laundry','Utilities','Other']
              .map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Amount ₹ *</label>
          <input id="eeAmt" type="number" placeholder="0" />
        </div>
      </div>
      <div class="form-group"><label>Description *</label>
        <textarea id="eeDesc" placeholder="Kya kharcha kiya..."></textarea>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="eeRoom">
            <option value="">General / All</option>
            ${(window._empExpRooms || []).map(r =>
              `<option value="${r.room_id}">${r.nickname || r.room_id}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group"><label>Paid To</label>
          <input id="eePaidTo" placeholder="Vendor / Shop name" />
        </div>
      </div>
      <div class="form-group"><label>Payment Mode</label>
        <select id="eeMode">
          <option value="">--</option>
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank</option>
        </select>
      </div>
      <div class="form-group"><label>Notes</label>
        <textarea id="eeNotes" placeholder="Optional"></textarea>
      </div>
      <button onclick="saveEmpExpense()" style="width:100%;margin-top:10px;">
        💾 Save Expense
      </button>
      <div id="eeErr"></div>
    </div>
  `, 'emp-expenses');
}

async function saveEmpExpense() {
  const btn = document.querySelector('button[onclick="saveEmpExpense()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const empId = document.getElementById('eeEmp').value;
  const date  = document.getElementById('eeDate').value;
  const cat   = document.getElementById('eeCat').value;
  const amt   = parseFloat(document.getElementById('eeAmt').value) || 0;
  const desc  = document.getElementById('eeDesc').value.trim();

  if (!empId || !date || !cat || amt <= 0 || !desc) {
    document.getElementById('eeErr').innerHTML =
      '<div class="error">Employee, Date, Category, Amount & Description required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
    return;
  }

  const { error } = await sb.from('daily_expenses').insert({
    emp_id:       empId,
    expense_date: date,
    category:     cat,
    amount:       amt,
    description:  desc,
    room_id:      document.getElementById('eeRoom').value || null,
    paid_to:      document.getElementById('eePaidTo').value.trim() || null,
    payment_mode: document.getElementById('eeMode').value || null,
    notes:        document.getElementById('eeNotes').value.trim() || null,
    created_by:   SESSION.userId || null
  });

  if (error) {
    document.getElementById('eeErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
    return;
  }

  alert('✅ Expense saved!');
  renderEmpExpenses();
}

async function editEmpExpense(id) {
  const { data: ex } = await sb.from('daily_expenses').select('*').eq('id', id).single();
  if (!ex) { alert('Not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Expense</h1>
      <button class="secondary btn-sm" onclick="renderEmpExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Employee</label>
          <select id="eeEmp">
            ${(window._empExpEmps || []).map(e =>
              `<option value="${e.emp_id}" ${e.emp_id === ex.emp_id ? 'selected' : ''}>${e.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group"><label>Date</label>
          <input id="eeDate" type="date" value="${ex.expense_date || ''}" />
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Category</label>
          <select id="eeCat">
            ${['Cleaning Supplies','Grocery','Transport','Maintenance','Laundry','Utilities','Other']
              .map(c => `<option value="${c}" ${c === ex.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Amount ₹</label>
          <input id="eeAmt" type="number" value="${ex.amount || 0}" />
        </div>
      </div>
      <div class="form-group"><label>Description</label>
        <textarea id="eeDesc">${ex.description || ''}</textarea>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="eeRoom">
            <option value="">General / All</option>
            ${(window._empExpRooms || []).map(r =>
              `<option value="${r.room_id}" ${r.room_id === ex.room_id ? 'selected' : ''}>${r.nickname || r.room_id}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group"><label>Paid To</label>
          <input id="eePaidTo" value="${ex.paid_to || ''}" />
        </div>
      </div>
      <div class="form-group"><label>Payment Mode</label>
        <select id="eeMode">
          <option value="" ${!ex.payment_mode ? 'selected' : ''}>--</option>
          <option ${ex.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
          <option ${ex.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
          <option ${ex.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
        </select>
      </div>
      <div class="form-group"><label>Notes</label>
        <textarea id="eeNotes">${ex.notes || ''}</textarea>
      </div>
      <button onclick="updateEmpExpense(${id})" style="width:100%;margin-top:10px;">
        💾 Update
      </button>
      <div id="eeErr"></div>
    </div>
  `, 'emp-expenses');
}

async function updateEmpExpense(id) {
  const amt  = parseFloat(document.getElementById('eeAmt').value) || 0;
  const desc = document.getElementById('eeDesc').value.trim();
  if (!desc || amt <= 0) {
    document.getElementById('eeErr').innerHTML =
      '<div class="error">Amount & Description required</div>';
    return;
  }

  const { error } = await sb.from('daily_expenses').update({
    emp_id:       document.getElementById('eeEmp').value || null,
    expense_date: document.getElementById('eeDate').value || null,
    category:     document.getElementById('eeCat').value || null,
    amount:       amt,
    description:  desc,
    room_id:      document.getElementById('eeRoom').value || null,
    paid_to:      document.getElementById('eePaidTo').value.trim() || null,
    payment_mode: document.getElementById('eeMode').value || null,
    notes:        document.getElementById('eeNotes').value.trim() || null
  }).eq('id', id);

  if (error) {
    document.getElementById('eeErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }

  alert('✅ Updated!');
  renderEmpExpenses();
}

async function delEmpExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await sb.from('daily_expenses').delete().eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  alert('✅ Deleted');
  renderEmpExpenses();
}
