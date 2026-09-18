
function isEmployeeActive(e) {
  if (!e) return false;
  const st = String(e.status || '').trim().toLowerCase();
  if (st === 'inactive' || st === 'disabled' || st === 'fired' || st === 'terminated' || e.is_active === false) return false;
  return st === 'active' || e.is_active === true;
}

// ============ STORAGE USAGE CHECK ============
async function checkStorageUsage() {
  try {
    const { data, error } = await sb.storage.from('id-proofs').list('', { limit: 1000 });
    if (error) return { used: 0, total: 1073741824, error: error.message };
    const countFiles = (data || []).length;
    return { files: countFiles, total: 1073741824, label: '1 GB (Free Plan)' };
  } catch(e) {
    return { files: 0, total: 1073741824, label: '1 GB', error: e.message };
  }
}

/**
 * Employees Module
 * Employees, Tasks, Attendance, Salary, Advance
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

// ============ EMPLOYEE SUB-NAVIGATION ============
function renderEmployeeSubNav(activeTab = 'employees') {
  const tabs = [
    { id: 'employees', label: '👥 Staff Directory', fn: 'navigate("employees")' },
    { id: 'attendance', label: '📋 Attendance', fn: 'navigate("attendance")' },
    { id: 'salary', label: '💵 Salary Tracker', fn: 'navigate("salary")' },
    { id: 'advance', label: '🎁 Advances', fn: 'navigate("advance")' },
    { id: 'employee-ledger', label: '📒 Staff Ledger', fn: 'navigate("employee-ledger")' },
    { id: 'tasks', label: '🧰 Staff Tasks', fn: 'navigate("tasks")' },
    { id: 'emp-expenses', label: '💸 Daily Spends', fn: 'navigate("emp-expenses")' },
  ];
  return `
    <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px;-webkit-overflow-scrolling:touch;" class="hide-scrollbar">
      ${tabs.map(t => `
        <button class="${activeTab === t.id ? '' : 'secondary'} btn-sm" onclick="${t.fn}" style="white-space:nowrap;font-size:12.5px;padding:7px 14px;border-radius:20px;${activeTab === t.id ? 'font-weight:700;box-shadow:0 2px 8px rgba(79,70,229,0.25);' : ''}">
          ${t.label}
        </button>
      `).join('')}
    </div>
  `;
}
window.renderEmployeeSubNav = renderEmployeeSubNav;

function getEmpRoleBadge(role) {
  const r = String(role || 'Other').trim();
  const lower = r.toLowerCase();
  let bg = '#F1F5F9', color = '#475569', border = '#CBD5E1', icon = '👤';
  
  if (lower.includes('manager')) {
    bg = '#EFF6FF'; color = '#1D4ED8'; border = '#BFDBFE'; icon = '👑';
  } else if (lower.includes('caretaker') || lower.includes('care taker')) {
    bg = '#ECFDF5'; color = '#047857'; border = '#A7F3D0'; icon = '🛡️';
  } else if (lower.includes('clean') || lower.includes('housekeep')) {
    bg = '#FAF5FF'; color = '#7E22CE'; border = '#E9D5FF'; icon = '🧹';
  } else if (lower.includes('maid')) {
    bg = '#FDF2F8'; color = '#BE185D'; border = '#FBCFE8'; icon = '🌸';
  } else if (lower.includes('cook')) {
    bg = '#FFFBEB'; color = '#B45309'; border = '#FDE68A'; icon = '🍳';
  } else if (lower.includes('maintenance')) {
    bg = '#FEF2F2'; color = '#B91C1C'; border = '#FECACA'; icon = '🔧';
  } else if (lower.includes('driver')) {
    bg = '#F0FDF4'; color = '#15803D'; border = '#BBF7D0'; icon = '🚗';
  }
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:700;background:${bg};color:${color};border:1px solid ${border};">${icon} ${r}</span>`;
}
window.getEmpRoleBadge = getEmpRoleBadge;

// ============ EMPLOYEES DIRECTORY ============
window._empFilterStatus = window._empFilterStatus || 'Active';
window._empRoleFilter = window._empRoleFilter || 'All';
window._empSearchQuery = window._empSearchQuery || '';
window._empViewMode = window._empViewMode || (window.innerWidth < 768 ? 'cards' : 'table');

async function renderManageEmployees() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');

  renderShell(`<div class="loading">Loading staff directory...</div>`, 'employees');
  
  const [{ data: emps, error: empErr }, { data: rooms }, storageInfo] = await Promise.all([
    sb.from("employees").select("*").order("name"),
    sb.from("rooms").select("room_id, nickname, unit_no").order("room_id"),
    checkStorageUsage()
  ]);

  if (empErr) {
    renderShell(`<div class="card"><div class="error">Failed to load employees: ${empErr.message}</div></div>`, 'employees');
    return;
  }

  window._allEmployees = emps || [];
  window._allRooms = rooms || [];

  const roomMap = {};
  (rooms || []).forEach(r => {
    roomMap[r.room_id] = propLabel(r);
  });
  window._empRoomMap = roomMap;

  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role);
  const statusFilter = window._empFilterStatus;
  const roleFilter = window._empRoleFilter;
  const searchQuery = (window._empSearchQuery || '').toLowerCase().trim();
  const viewMode = window._empViewMode;

  // Counts
  const totalCount = (emps || []).length;
  const activeCount = (emps || []).filter(isEmployeeActive).length;
  const inactiveCount = totalCount - activeCount;
  const caretakersCount = (emps || []).filter(e => isEmployeeActive(e) && /caretaker/i.test(e.role || '')).length;
  const cleanersCount = (emps || []).filter(e => isEmployeeActive(e) && /(clean|housekeep)/i.test(e.role || '')).length;
  const maidsCount = (emps || []).filter(e => isEmployeeActive(e) && /maid/i.test(e.role || '')).length;
  const managersCount = (emps || []).filter(e => isEmployeeActive(e) && /manager/i.test(e.role || '')).length;

  // Filtered employees
  const filteredEmps = (emps || []).filter(e => {
    const isActive = isEmployeeActive(e);
    if (statusFilter === 'Active' && !isActive) return false;
    if (statusFilter === 'Inactive' && isActive) return false;

    if (roleFilter !== 'All') {
      const r = (e.role || '').toLowerCase();
      if (roleFilter === 'Caretaker' && !r.includes('caretaker')) return false;
      if (roleFilter === 'Cleaning Staff' && !r.includes('clean') && !r.includes('housekeep')) return false;
      if (roleFilter === 'Maid' && !r.includes('maid')) return false;
      if (roleFilter === 'Manager' && !r.includes('manager')) return false;
    }

    if (searchQuery) {
      const name = (e.name || '').toLowerCase();
      const phone = (e.phone || '').toLowerCase();
      const role = (e.role || '').toLowerCase();
      const assigned = (e.assigned_rooms || '').toLowerCase();
      if (!name.includes(searchQuery) && !phone.includes(searchQuery) && !role.includes(searchQuery) && !assigned.includes(searchQuery)) {
        return false;
      }
    }
    return true;
  });

  renderShell(`
    ${renderEmployeeSubNav('employees')}

    <!-- KPI Ribbon -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:14px;">
      <div class="card" onclick="window._empFilterStatus='All';window._empRoleFilter='All';renderManageEmployees()" style="padding:12px;cursor:pointer;border-left:4px solid #4F46E5;transition:all 0.15s;${statusFilter==='All'&&roleFilter==='All'?'box-shadow:0 0 0 2px #4F46E5;':''}">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">👥 Total Staff</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);margin-top:2px;">${totalCount}</div>
        <div style="font-size:10.5px;color:var(--muted);">All registered</div>
      </div>

      <div class="card" onclick="window._empFilterStatus='Active';window._empRoleFilter='All';renderManageEmployees()" style="padding:12px;cursor:pointer;border-left:4px solid #059669;transition:all 0.15s;${statusFilter==='Active'&&roleFilter==='All'?'box-shadow:0 0 0 2px #059669;':''}">
        <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;">🟢 Active</div>
        <div style="font-size:22px;font-weight:800;color:#059669;margin-top:2px;">${activeCount}</div>
        <div style="font-size:10.5px;color:var(--muted);">On-duty / live</div>
      </div>

      <div class="card" onclick="window._empFilterStatus='Active';window._empRoleFilter='Caretaker';renderManageEmployees()" style="padding:12px;cursor:pointer;border-left:4px solid #10B981;transition:all 0.15s;${roleFilter==='Caretaker'?'box-shadow:0 0 0 2px #10B981;':''}">
        <div style="font-size:11px;font-weight:700;color:#047857;text-transform:uppercase;">🛡️ Caretakers</div>
        <div style="font-size:22px;font-weight:800;color:#047857;margin-top:2px;">${caretakersCount}</div>
        <div style="font-size:10.5px;color:var(--muted);">On-ground care</div>
      </div>

      <div class="card" onclick="window._empFilterStatus='Active';window._empRoleFilter='Cleaning Staff';renderManageEmployees()" style="padding:12px;cursor:pointer;border-left:4px solid #8B5CF6;transition:all 0.15s;${roleFilter==='Cleaning Staff'?'box-shadow:0 0 0 2px #8B5CF6;':''}">
        <div style="font-size:11px;font-weight:700;color:#7E22CE;text-transform:uppercase;">🧹 Cleaning Staff</div>
        <div style="font-size:22px;font-weight:800;color:#7E22CE;margin-top:2px;">${cleanersCount}</div>
        <div style="font-size:10.5px;color:var(--muted);">Housekeeping</div>
      </div>

      <div class="card" onclick="window._empFilterStatus='Active';window._empRoleFilter='Maid';renderManageEmployees()" style="padding:12px;cursor:pointer;border-left:4px solid #EC4899;transition:all 0.15s;${roleFilter==='Maid'?'box-shadow:0 0 0 2px #EC4899;':''}">
        <div style="font-size:11px;font-weight:700;color:#BE185D;text-transform:uppercase;">🌸 Maids</div>
        <div style="font-size:22px;font-weight:800;color:#BE185D;margin-top:2px;">${maidsCount}</div>
        <div style="font-size:10.5px;color:var(--muted);">Daily turnover</div>
      </div>

      <div class="card" onclick="window._empFilterStatus='Inactive';window._empRoleFilter='All';renderManageEmployees()" style="padding:12px;cursor:pointer;border-left:4px solid #DC2626;transition:all 0.15s;${statusFilter==='Inactive'?'box-shadow:0 0 0 2px #DC2626;':''}">
        <div style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;">🔴 Inactive / Off</div>
        <div style="font-size:22px;font-weight:800;color:#DC2626;margin-top:2px;">${inactiveCount}</div>
        <div style="font-size:10.5px;color:var(--muted);">Deactivated</div>
      </div>
    </div>

    <!-- Main Header Card & Controls -->
    <div class="card" style="margin-bottom:14px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;">
            <h1 style="margin:0;font-size:20px;font-weight:800;">👥 Team & Staff Directory</h1>
            <span style="font-size:12px;padding:3px 10px;border-radius:20px;background:var(--card-sub-bg,#F1F5F9);color:var(--muted);font-weight:700;">
              ${filteredEmps.length} visible
            </span>
          </div>
          <div class="sub" style="margin-top:4px;">
            Sole Property Manager: <strong>Praveen Singh</strong> &bull; On-ground operational staff: Caretakers, Cleaning Staff & Maids
          </div>
          ${SESSION.role === 'developer' ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">ID Proof Storage: ${(storageInfo?.files || 0)} files &bull; Limit: ${storageInfo?.label || '1 GB'}</div>` : ''}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <!-- View Switcher -->
          <div style="display:inline-flex;background:var(--card-sub-bg,#F1F5F9);padding:3px;border-radius:10px;border:1px solid var(--border,#E2E8F0);">
            <button class="btn-sm" onclick="window._empViewMode='cards';renderManageEmployees()" style="border:none;border-radius:7px;padding:5px 10px;font-size:12px;${viewMode==='cards'?'background:var(--primary,#4F46E5);color:#fff;font-weight:700;':'background:transparent;color:var(--text);'}">
              📱 Cards
            </button>
            <button class="btn-sm" onclick="window._empViewMode='table';renderManageEmployees()" style="border:none;border-radius:7px;padding:5px 10px;font-size:12px;${viewMode==='table'?'background:var(--primary,#4F46E5);color:#fff;font-weight:700;':'background:transparent;color:var(--text);'}">
              📋 Table
            </button>
          </div>

          ${isO ? `<button onclick="renderAddEmp()" style="background:#059669;color:#fff;font-weight:700;padding:8px 16px;border-radius:10px;box-shadow:0 2px 8px rgba(5,150,105,0.25);">➕ Add Employee</button>` : ''}
        </div>
      </div>

      <!-- Search & Filters -->
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;align-items:center;">
        <!-- Live Search -->
        <div style="flex:1;min-width:240px;position:relative;">
          <input 
            type="text" 
            id="empSearchInput"
            placeholder="🔍 Search staff by name, phone, role, property..." 
            value="${escapeHtml(window._empSearchQuery || '')}"
            oninput="window._empSearchQuery=this.value;window.debounceFilterEmployees && window.debounceFilterEmployees()"
            style="width:100%;padding:9px 12px 9px 34px;border-radius:10px;font-size:13px;"
          />
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:0.5;">🔍</span>
          ${window._empSearchQuery ? `
            <button onclick="window._empSearchQuery='';renderManageEmployees()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;">✕</button>
          ` : ''}
        </div>

        <!-- Status Filter Chips -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="${statusFilter === 'Active' ? '' : 'secondary'} btn-sm" onclick="window._empFilterStatus='Active';renderManageEmployees()" style="${statusFilter === 'Active' ? 'background:#059669;color:#fff;font-weight:700;' : ''}">🟢 Active (${activeCount})</button>
          <button class="${statusFilter === 'Inactive' ? '' : 'secondary'} btn-sm" onclick="window._empFilterStatus='Inactive';renderManageEmployees()" style="${statusFilter === 'Inactive' ? 'background:#DC2626;color:#fff;font-weight:700;' : ''}">🔴 Inactive (${inactiveCount})</button>
          <button class="${statusFilter === 'All' ? '' : 'secondary'} btn-sm" onclick="window._empFilterStatus='All';renderManageEmployees()" style="${statusFilter === 'All' ? 'background:#4F46E5;color:#fff;font-weight:700;' : ''}">📋 All (${totalCount})</button>
        </div>

        <!-- Role Filter Dropdown -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11.5px;font-weight:600;color:var(--muted);">Role:</span>
          <select onchange="window._empRoleFilter=this.value;renderManageEmployees()" style="padding:7px 10px;border-radius:10px;font-size:12.5px;font-weight:600;">
            <option value="All" ${roleFilter==='All'?'selected':''}>All Roles</option>
            <option value="Caretaker" ${roleFilter==='Caretaker'?'selected':''}>🛡️ Caretaker</option>
            <option value="Cleaning Staff" ${roleFilter==='Cleaning Staff'?'selected':''}>🧹 Cleaning Staff</option>
            <option value="Maid" ${roleFilter==='Maid'?'selected':''}>🌸 Maid</option>
            <option value="Manager" ${roleFilter==='Manager'?'selected':''}>👑 Manager</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Staff Listing: Cards or Table -->
    ${filteredEmps.length === 0 ? `
      <div class="card" style="text-align:center;padding:48px 16px;">
        <div style="font-size:36px;margin-bottom:10px;">👥</div>
        <h3 style="margin:0 0 6px 0;">No employees found</h3>
        <p class="sub" style="margin:0;">No staff members match the selected search or filter criteria.</p>
        <button class="secondary btn-sm" onclick="window._empSearchQuery='';window._empFilterStatus='All';window._empRoleFilter='All';renderManageEmployees()" style="margin-top:14px;">
          Reset Filters
        </button>
      </div>
    ` : (viewMode === 'cards' ? renderEmployeeCardsView(filteredEmps, isO, roomMap) : renderEmployeeTableView(filteredEmps, isO, roomMap))}
  `, 'employees');
}

// 📱 Responsive Cards View (Mobile & Grid friendly)
function renderEmployeeCardsView(emps, isO, roomMap) {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:14px;">
      ${emps.map(e => {
        const isActive = isEmployeeActive(e);
        const assignedArr = (e.assigned_rooms || '').split(',').map(s => s.trim()).filter(Boolean);
        const cleanPhone = (e.phone || '').replace(/\D/g, '');
        const whatsappPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        const initial = (e.name || 'S').trim().charAt(0).toUpperCase();

        return `
          <div class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;border-top:3px solid ${isActive ? '#10B981' : '#EF4444'};position:relative;">
            <!-- Top Header: Avatar + Name + Badges -->
            <div>
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;box-shadow:0 2px 6px rgba(79,70,229,0.3);">
                    ${initial}
                  </div>
                  <div>
                    <h3 style="margin:0;font-size:15px;font-weight:800;color:var(--text);line-height:1.2;">
                      ${escapeHtml(e.name)}
                    </h3>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
                      ${getEmpRoleBadge(e.role)}
                      <span class="badge ${isActive ? 'green' : 'red'}" style="font-size:10px;padding:2px 7px;">
                        ${isActive ? 'Active' : (e.status || 'Disabled')}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Salary Tag -->
                <div style="text-align:right;">
                  <div style="font-size:15px;font-weight:800;color:#DC2626;">
                    ₹${(e.monthly_salary || 0).toLocaleString('en-IN')}
                  </div>
                  <div style="font-size:10px;color:var(--muted);font-weight:600;">per month</div>
                </div>
              </div>

              <!-- Quick Communication Bar -->
              <div style="display:flex;gap:8px;margin-bottom:12px;">
                ${cleanPhone ? `
                  <a href="tel:${escapeHtml(e.phone)}" class="btn-sm" style="flex:1;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--card-sub-bg,#F1F5F9);color:var(--text);border:1px solid var(--border,#CBD5E1);border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;">
                    📞 Call
                  </a>
                  <a href="https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hello ${e.name}, from The Unique Haven Homes:`)}" target="_blank" class="btn-sm" style="flex:1;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#25D366;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;box-shadow:0 2px 6px rgba(37,211,102,0.3);">
                    💬 WhatsApp
                  </a>
                ` : `
                  <div style="font-size:11.5px;color:var(--muted);padding:6px 0;">No phone number registered</div>
                `}
              </div>

              <!-- Assigned Properties -->
              <div style="background:var(--card-sub-bg,#F8FAFC);padding:10px;border-radius:8px;border:1px solid var(--border,#E2E8F0);margin-bottom:10px;">
                <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
                  🏢 Assigned Properties (${assignedArr.length})
                </div>
                ${assignedArr.length === 0 ? `
                  <div style="font-size:12px;color:var(--muted);font-style:italic;">No properties assigned</div>
                ` : (assignedArr.length >= 16 ? `
                  <span style="display:inline-block;padding:3px 8px;border-radius:6px;font-size:11.5px;background:#EFF6FF;color:#1D4ED8;font-weight:700;border:1px solid #BFDBFE;">
                    ✨ All Properties Assigned (17 Units)
                  </span>
                ` : `
                  <div style="display:flex;flex-wrap:wrap;gap:5px;">
                    ${assignedArr.map(roomId => `
                      <span style="font-size:11px;padding:2px 7px;border-radius:6px;background:var(--card-bg,#fff);border:1px solid var(--border,#CBD5E1);color:var(--text);font-weight:600;">
                        ${escapeHtml(roomMap[roomId] || roomId)}
                      </span>
                    `).join('')}
                  </div>
                `)}
              </div>

              <!-- Details Row -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;color:var(--muted);margin-bottom:12px;">
                <div>
                  <span style="font-weight:600;">Joined:</span> ${e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'Not set'}
                </div>
                <div>
                  <span style="font-weight:600;">ID Proof:</span> 
                  ${e.id_proof_type ? `<span style="font-weight:700;color:var(--text);">${e.id_proof_type}</span>` : 'None'}
                </div>
                ${e.emergency_contact ? `
                  <div style="grid-column:1/-1;">
                    <span style="font-weight:600;">Emergency:</span> ${escapeHtml(e.emergency_contact)}
                  </div>
                ` : ''}
              </div>

              <!-- ID Photos Preview -->
              ${(e.id_proof_photo_front || e.id_proof_photo_back) ? `
                <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center;">
                  <span style="font-size:11px;font-weight:600;color:var(--muted);">ID Photos:</span>
                  ${e.id_proof_photo_front ? `<button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_front}')" style="font-size:11px;padding:3px 8px;">📄 Front</button>` : ''}
                  ${e.id_proof_photo_back ? `<button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_back}')" style="font-size:11px;padding:3px 8px;">📄 Back</button>` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Card Actions Footer -->
            ${isO ? `
              <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border,#E2E8F0);margin-top:auto;">
                <button class="btn-sm secondary" onclick="editEmp('${e.emp_id}')" style="flex:1;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:5px;">
                  ✏️ Edit
                </button>
                <button class="btn-sm ${isActive ? 'danger' : 'green-btn'}" onclick="toggleEmpStatus('${e.emp_id}', '${escapeHtml(e.name)}', ${isActive})" style="flex:1;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:5px;">
                  ${isActive ? '🚫 Deactivate' : '🟢 Activate'}
                </button>
                ${window.canDelete && window.canDelete() ? `
                  <button class="btn-sm danger" onclick="delEmp('${e.emp_id}','${escapeHtml(e.name)}')" title="Permanently Delete" style="padding:6px 10px;">
                    🗑️
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 📋 Detailed Table View (Desktop friendly)
function renderEmployeeTableView(emps, isO, roomMap) {
  return `
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap" style="margin:0;">
        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Role</th>
              <th>Contact</th>
              <th>Assigned Properties</th>
              <th>Salary</th>
              <th>ID Proof</th>
              <th>Status</th>
              ${isO ? '<th style="text-align:right;">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${emps.map(e => {
              const isActive = isEmployeeActive(e);
              const assignedArr = (e.assigned_rooms || '').split(',').map(s => s.trim()).filter(Boolean);
              const cleanPhone = (e.phone || '').replace(/\D/g, '');
              const whatsappPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
              const initial = (e.name || 'S').trim().charAt(0).toUpperCase();

              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">
                        ${initial}
                      </div>
                      <div>
                        <strong>${escapeHtml(e.name)}</strong>
                        ${e.joining_date ? `<div style="font-size:10.5px;color:var(--muted);">Since ${e.joining_date}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>${getEmpRoleBadge(e.role)}</td>
                  <td>
                    ${cleanPhone ? `
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span>${escapeHtml(e.phone)}</span>
                        <a href="https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hello ${e.name}, from The Unique Haven Homes:`)}" target="_blank" style="text-decoration:none;font-size:14px;" title="Chat on WhatsApp">💬</a>
                        <a href="tel:${escapeHtml(e.phone)}" style="text-decoration:none;font-size:14px;" title="Call">📞</a>
                      </div>
                    ` : '<span style="color:var(--muted);">-</span>'}
                  </td>
                  <td style="max-width:200px;">
                    ${assignedArr.length === 0 ? '<span style="color:var(--muted);font-size:11px;">None</span>' : (
                      assignedArr.length >= 16 ? '<span style="font-size:11px;font-weight:700;color:#1D4ED8;">All 17 Properties</span>' : `
                        <div style="font-size:11.5px;line-height:1.4;white-space:normal;">
                          ${assignedArr.map(id => escapeHtml(roomMap[id] || id)).join(', ')}
                        </div>
                      `
                    )}
                  </td>
                  <td style="color:#DC2626;font-weight:700;">
                    ₹${(e.monthly_salary || 0).toLocaleString('en-IN')}
                  </td>
                  <td>
                    ${(e.id_proof_photo_front || e.id_proof_photo_back) ? `
                      <div style="display:flex;gap:4px;">
                        ${e.id_proof_photo_front ? `<button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_front}')" title="Front Photo">📄 F</button>` : ''}
                        ${e.id_proof_photo_back ? `<button class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_back}')" title="Back Photo">📄 B</button>` : ''}
                      </div>
                    ` : `<span style="font-size:11px;color:var(--muted);">${e.id_proof_type || '-'}</span>`}
                  </td>
                  <td>
                    <span class="badge ${isActive ? 'green' : 'red'}">
                      ${isActive ? 'Active' : (e.status || 'Disabled')}
                    </span>
                  </td>
                  ${isO ? `
                    <td class="table-actions" style="text-align:right;">
                      <button class="btn-sm" onclick="editEmp('${e.emp_id}')" title="Edit Staff Member">✏️</button>
                      <button class="btn-sm ${isActive ? 'danger' : 'green-btn'}" onclick="toggleEmpStatus('${e.emp_id}', '${escapeHtml(e.name)}', ${isActive})" title="${isActive ? 'Deactivate' : 'Activate'}">
                        ${isActive ? '🚫' : '🟢'}
                      </button>
                      ${window.canDelete && window.canDelete() ? `
                        <button class="btn-sm danger" onclick="delEmp('${e.emp_id}','${escapeHtml(e.name)}')" title="Permanently Delete">🗑️</button>
                      ` : ''}
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Live Search Debounce
let _empSearchTimeout = null;
window.debounceFilterEmployees = function() {
  clearTimeout(_empSearchTimeout);
  _empSearchTimeout = setTimeout(() => {
    renderManageEmployees();
  }, 250);
};

window.toggleEmpStatus = async function(empId, name, currentlyActive) {
  const newStatus = currentlyActive ? 'Inactive' : 'Active';
  const actionText = currentlyActive ? 'DEACTIVATE' : 'ACTIVATE';

  if (!confirm(`Are you sure you want to ${actionText} employee "${name}"?\n\n${currentlyActive ? '• Will NOT show in Advance, Salary, Attendance, or active property forms.\n• Past history and records will remain safely preserved.' : '• Will be active and visible again in all operational forms.'}`)) {
    return;
  }

  const updatePayload = {
    status: newStatus,
    is_active: !currentlyActive
  };
  if (currentlyActive) {
    updatePayload.in_whatsapp_template = false;
  }

  const { error } = await sb.from('employees').update(updatePayload).eq('emp_id', empId);

  if (error) {
    if (window.fsn) fsn.error('Error', error.message);
    else alert('Error: ' + error.message);
    return;
  }

  if (window.fsn) fsn.success('Success', `✅ ${name} marked as ${newStatus}`);
  renderManageEmployees();
};

function employeeRoleOptions(selected = '') {
  const roles = [
    'Caretaker',
    'Cleaning Staff',
    'Maid',
    'Manager',
    'Cook',
    'Maintenance',
    'Driver',
    'Other'
  ];
  const list = roles.includes(selected) || !selected ? roles : [selected, ...roles];
  return list.map(r => `<option value="${r}" ${r === selected ? 'selected' : ''}>${r}</option>`).join('');
}

function employeePropertyRoleOptions(selected = 'Caretaker') {
  const roles = ['Caretaker', 'Cleaning Staff', 'Maid', 'Manager'];
  const list = roles.includes(selected) || !selected ? roles : [selected, ...roles];
  return list.map(r => `<option value="${r}" ${r === selected ? 'selected' : ''}>${r}</option>`).join('');
}

// Interactive Property Multi-Picker Helpers
window.toggleAllEmpRooms = function(mode) {
  const cbs = document.querySelectorAll('.prop-chip-checkbox');
  cbs.forEach(cb => {
    if (mode === 'all') cb.checked = true;
    else if (mode === 'none') cb.checked = false;
    else if (mode === 'gomti') cb.checked = cb.value.startsWith('GOM') || cb.value.startsWith('LUL');
    else if (mode === 'villas') cb.checked = cb.value.startsWith('VIL');
    
    const pill = document.getElementById('prop_pill_' + cb.value);
    if (pill) {
      if (cb.checked) {
        pill.style.background = 'var(--primary, #4F46E5)';
        pill.style.color = '#fff';
        pill.style.borderColor = 'var(--primary, #4F46E5)';
      } else {
        pill.style.background = 'var(--card-bg, #fff)';
        pill.style.color = 'var(--text, #1E293B)';
        pill.style.borderColor = 'var(--border, #CBD5E1)';
      }
    }
  });
  updateEmpRoomsCount();
};

window.toggleEmpRoomPill = function(roomId) {
  const cb = document.getElementById('prop_cb_' + roomId);
  if (!cb) return;
  cb.checked = !cb.checked;
  const pill = document.getElementById('prop_pill_' + roomId);
  if (pill) {
    if (cb.checked) {
      pill.style.background = 'var(--primary, #4F46E5)';
      pill.style.color = '#fff';
      pill.style.borderColor = 'var(--primary, #4F46E5)';
    } else {
      pill.style.background = 'var(--card-bg, #fff)';
      pill.style.color = 'var(--text, #1E293B)';
      pill.style.borderColor = 'var(--border, #CBD5E1)';
    }
  }
  updateEmpRoomsCount();
};

window.updateEmpRoomsCount = function() {
  const cnt = document.querySelectorAll('.prop-chip-checkbox:checked').length;
  const el = document.getElementById('empRoomsCountText');
  if (el) el.textContent = `${cnt} property(s) selected`;
};

function getSelectedRoomsFromUI() {
  const cbs = document.querySelectorAll('.prop-chip-checkbox:checked');
  if (cbs.length > 0) {
    return Array.from(cbs).map(c => c.value).join(',');
  }
  const sel = document.getElementById('eRooms');
  if (sel && sel.selectedOptions) {
    return Array.from(sel.selectedOptions).map(o => o.value).join(',');
  }
  return '';
}

async function renderAddEmp() {
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');

  renderShell(`
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h1 style="margin:0;font-size:20px;font-weight:800;">➕ Add New Staff Member</h1>
        <button class="secondary btn-sm" onclick="renderManageEmployees()">← Back to Staff</button>
      </div>
    </div>

    <!-- Manager Specification Note -->
    <div class="card" style="background:#EFF6FF;border:1px solid #BFDBFE;margin-bottom:14px;padding:12px 16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;">ℹ️</span>
        <div style="font-size:12.5px;color:#1E3A8A;line-height:1.4;">
          <strong>Manager Note:</strong> <strong>Praveen Singh</strong> is the sole General Manager across all properties. On-ground staff roles should be assigned as <strong>Caretaker</strong>, <strong>Cleaning Staff</strong>, or <strong>Maid</strong>.
        </div>
      </div>
    </div>

    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Full Name *</label><input id="eName" placeholder="e.g. Ramesh Kumar" /></div>
        <div class="form-group"><label>Phone Number</label><input id="ePhone" type="tel" placeholder="e.g. 9876543210" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Primary Role</label>
          <select id="eRole">${employeeRoleOptions('Caretaker')}</select>
        </div>
        <div class="form-group">
          <label>On-Site Property Role</label>
          <select id="ePropertyRole">${employeePropertyRoleOptions('Caretaker')}</select>
        </div>
      </div>

      <div class="form-group">
        <label>Monthly Salary ₹</label>
        <input id="eSal" type="number" placeholder="e.g. 12000" />
      </div>

      <!-- Touch-friendly Assigned Properties Picker -->
      <div class="form-group" style="background:var(--card-sub-bg,#F8FAFC);padding:14px;border-radius:10px;border:1px solid var(--border,#CBD5E1);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <label style="margin:0;font-weight:700;">Assigned Properties</label>
            <div id="empRoomsCountText" style="font-size:11.5px;color:var(--muted);margin-top:2px;">0 property(s) selected</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('all')" style="font-size:11px;padding:4px 8px;">✅ Select All</button>
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('gomti')" style="font-size:11px;padding:4px 8px;">🏢 Gomti Units</button>
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('villas')" style="font-size:11px;padding:4px 8px;">🏡 Villas</button>
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('none')" style="font-size:11px;padding:4px 8px;">❌ Clear</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:8px;">
          ${(rooms || []).map(r => `
            <div 
              id="prop_pill_${r.room_id}"
              onclick="toggleEmpRoomPill('${r.room_id}')"
              style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--card-bg,#fff);border:1px solid var(--border,#CBD5E1);border-radius:8px;cursor:pointer;user-select:none;transition:all 0.15s;"
            >
              <input type="checkbox" id="prop_cb_${r.room_id}" class="prop-chip-checkbox" value="${r.room_id}" style="pointer-events:none;margin:0;" />
              <span style="font-size:12px;font-weight:600;line-height:1.2;">${escapeHtml(propLabel(r))}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Joining Date</label><input id="eJoin" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
        <div class="form-group">
          <label>ID Document Type</label>
          <select id="eIdType">
            <option value="Aadhar">Aadhar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="DL">Driving License</option>
            <option value="Passport">Passport</option>
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>ID Number</label><input id="eIdNo" placeholder="Document ID / Aadhar number" /></div>
        <div class="form-group"><label>Residential Address</label><input id="eAddr" placeholder="Permanent / local address" /></div>
      </div>

      <div class="form-group">
        <label>Emergency Contact & Relation</label>
        <input id="eEmergency" placeholder="e.g. Brother: 9876543210" />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>ID Proof (Front Photo)</label>
          <input id="eIdFront" type="file" accept="image/*" />
        </div>
        <div class="form-group">
          <label>ID Proof (Back Photo)</label>
          <input id="eIdBack" type="file" accept="image/*" />
        </div>
      </div>

      <label style="display:flex;align-items:center;gap:8px;margin:12px 0;font-weight:600;cursor:pointer;">
        <input type="checkbox" id="eActive" checked style="width:18px;height:18px;" /> Active & on-duty
      </label>

      <div class="form-group">
        <label>Internal Notes</label>
        <textarea id="eNotes" placeholder="Additional background, uniforms, keys issued, bank details..."></textarea>
      </div>

      <button onclick="saveEmp()" style="width:100%;padding:12px;font-size:15px;font-weight:700;border-radius:10px;background:var(--primary,#4F46E5);color:#fff;">
        💾 Save Staff Member
      </button>
      <div id="empErr" style="margin-top:10px;"></div>
    </div>
  `, 'employees');
}

async function saveEmp() {
  const _btn = document.querySelector('button[onclick="saveEmp()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const name = document.getElementById('eName').value.trim();
  if (!name) { 
    document.getElementById('empErr').innerHTML = '<div class="error">Name is required</div>';
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Staff Member'; }
    return; 
  }

  const selectedRooms = getSelectedRoomsFromUI();
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

  const isActive = document.getElementById('eActive').checked;

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
    status: isActive ? 'Active' : 'Inactive',
    is_active: isActive,
    notes: document.getElementById('eNotes').value.trim() || null,
  });

  if (error) { 
    document.getElementById('empErr').innerHTML = `<div class="error">${error.message}</div>`;
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Staff Member'; }
    return; 
  }
  
  if (window.fsn) fsn.success('Added', `Staff member ${name} added successfully`);
  renderManageEmployees();
}

async function editEmp(id) {
  const { data: e } = await sb.from('employees').select('*').eq('emp_id', id).single();
  if (!e) return;
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');
  const assignedArr = (e.assigned_rooms || '').split(',').map(s => s.trim()).filter(Boolean);

  renderShell(`
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h1 style="margin:0;font-size:20px;font-weight:800;">✏️ Edit Staff Member: ${escapeHtml(e.name)}</h1>
        <button class="secondary btn-sm" onclick="renderManageEmployees()">← Back to Staff</button>
      </div>
    </div>

    <!-- Manager Note -->
    <div class="card" style="background:#EFF6FF;border:1px solid #BFDBFE;margin-bottom:14px;padding:12px 16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;">ℹ️</span>
        <div style="font-size:12.5px;color:#1E3A8A;line-height:1.4;">
          <strong>Manager Note:</strong> <strong>Praveen Singh</strong> is the sole General Manager across all properties. On-ground staff roles should be assigned as <strong>Caretaker</strong>, <strong>Cleaning Staff</strong>, or <strong>Maid</strong>.
        </div>
      </div>
    </div>

    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Full Name *</label><input id="eName" value="${escapeHtml(e.name)}" /></div>
        <div class="form-group"><label>Phone Number</label><input id="ePhone" value="${escapeHtml(e.phone || '')}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Primary Role</label>
          <select id="eRole">${employeeRoleOptions(e.role || '')}</select>
        </div>
        <div class="form-group">
          <label>On-Site Property Role</label>
          <select id="ePropertyRole">${employeePropertyRoleOptions(e.property_role || 'Caretaker')}</select>
        </div>
      </div>

      <div class="form-group">
        <label>Monthly Salary ₹</label>
        <input id="eSal" type="number" value="${e.monthly_salary || 0}" />
      </div>

      <!-- Touch-friendly Assigned Properties Picker -->
      <div class="form-group" style="background:var(--card-sub-bg,#F8FAFC);padding:14px;border-radius:10px;border:1px solid var(--border,#CBD5E1);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <label style="margin:0;font-weight:700;">Assigned Properties</label>
            <div id="empRoomsCountText" style="font-size:11.5px;color:var(--muted);margin-top:2px;">
              ${assignedArr.length} property(s) selected
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('all')" style="font-size:11px;padding:4px 8px;">✅ Select All</button>
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('gomti')" style="font-size:11px;padding:4px 8px;">🏢 Gomti Units</button>
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('villas')" style="font-size:11px;padding:4px 8px;">🏡 Villas</button>
            <button type="button" class="btn-sm secondary" onclick="toggleAllEmpRooms('none')" style="font-size:11px;padding:4px 8px;">❌ Clear</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:8px;">
          ${(rooms || []).map(r => {
            const isAssigned = assignedArr.includes(r.room_id);
            return `
              <div 
                id="prop_pill_${r.room_id}"
                onclick="toggleEmpRoomPill('${r.room_id}')"
                style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:${isAssigned ? 'var(--primary,#4F46E5)' : 'var(--card-bg,#fff)'};color:${isAssigned ? '#fff' : 'var(--text,#1E293B)'};border:1px solid ${isAssigned ? 'var(--primary,#4F46E5)' : 'var(--border,#CBD5E1)'};border-radius:8px;cursor:pointer;user-select:none;transition:all 0.15s;"
              >
                <input type="checkbox" id="prop_cb_${r.room_id}" class="prop-chip-checkbox" value="${r.room_id}" ${isAssigned ? 'checked' : ''} style="pointer-events:none;margin:0;" />
                <span style="font-size:12px;font-weight:600;line-height:1.2;">${escapeHtml(propLabel(r))}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Joining Date</label><input id="eJoin" type="date" value="${e.joining_date || ''}" /></div>
        <div class="form-group">
          <label>ID Document Type</label>
          <select id="eIdType">
            <option value="Aadhar" ${e.id_proof_type === 'Aadhar' ? 'selected' : ''}>Aadhar Card</option>
            <option value="PAN" ${e.id_proof_type === 'PAN' ? 'selected' : ''}>PAN Card</option>
            <option value="DL" ${e.id_proof_type === 'DL' ? 'selected' : ''}>Driving License</option>
            <option value="Passport" ${e.id_proof_type === 'Passport' ? 'selected' : ''}>Passport</option>
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>ID Number</label><input id="eIdNo" value="${escapeHtml(e.id_proof_no || '')}" /></div>
        <div class="form-group"><label>Residential Address</label><input id="eAddr" value="${escapeHtml(e.address || '')}" /></div>
      </div>

      <div class="form-group">
        <label>Emergency Contact</label>
        <input id="eEmergency" value="${escapeHtml(e.emergency_contact || '')}" />
      </div>

      <div class="form-group">
        <label>Status</label>
        <select id="eStatus">
          <option value="Active" ${e.status === 'Active' ? 'selected' : ''}>🟢 Active (On-duty)</option>
          <option value="Inactive" ${e.status === 'Inactive' ? 'selected' : ''}>🔴 Inactive (Disabled / Off)</option>
          <option value="Fired" ${e.status === 'Fired' ? 'selected' : ''}>⛔ Fired / Terminated</option>
        </select>
      </div>

      <!-- ID Photos Section -->
      <div style="background:var(--card-sub-bg,#F8FAFC);padding:14px;border-radius:10px;border:1px solid var(--border,#CBD5E1);margin-bottom:14px;">
        <div style="font-weight:700;margin-bottom:10px;">📄 ID Document Photos</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Front Photo</label>
            ${e.id_proof_photo_front ? `
              <div style="margin-bottom:8px;">
                <button type="button" class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_front}')">📥 View Current Front</button>
              </div>
            ` : '<div class="sub" style="margin-bottom:6px;">Not uploaded</div>'}
            <input id="eIdFront" type="file" accept="image/*" />
          </div>

          <div class="form-group">
            <label>Back Photo</label>
            ${e.id_proof_photo_back ? `
              <div style="margin-bottom:8px;">
                <button type="button" class="btn-sm outline" onclick="dlIdPhoto('${e.id_proof_photo_back}')">📥 View Current Back</button>
              </div>
            ` : '<div class="sub" style="margin-bottom:6px;">Not uploaded</div>'}
            <input id="eIdBack" type="file" accept="image/*" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Internal Notes</label>
        <textarea id="eNotes">${escapeHtml(e.notes || '')}</textarea>
      </div>

      <button onclick="updEmp('${id}')" style="width:100%;padding:12px;font-size:15px;font-weight:700;border-radius:10px;background:var(--primary,#4F46E5);color:#fff;">
        💾 Save & Update Staff Member
      </button>
      <div id="empErr" style="margin-top:10px;"></div>
    </div>
  `, 'employees');
}

async function updEmp(id) {
  const _btn = document.querySelector('button[onclick^="updEmp"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Updating...'; }
  const name = document.getElementById('eName').value.trim();
  if (!name) { 
    document.getElementById('empErr').innerHTML = '<div class="error">Name is required</div>';
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save & Update Staff Member'; }
    return; 
  }

  const selectedRooms = getSelectedRoomsFromUI();
  const statusVal = document.getElementById('eStatus')?.value || 'Active';
  const isActive = statusVal === 'Active';

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
    status: statusVal,
    is_active: isActive,
    notes: document.getElementById('eNotes').value.trim() || null,
  };
  if (!isActive) {
    obj.in_whatsapp_template = false;
  }

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

  const { error } = await sb.from('employees').update(obj).eq('emp_id', id);
  if (error) {
    document.getElementById('empErr').innerHTML = `<div class="error">${error.message}</div>`;
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save & Update Staff Member'; }
    return;
  }

  if (window.fsn) fsn.success('Updated', `Staff member ${name} updated successfully`);
  renderManageEmployees();
}

async function delEmp(id, name) {
  if (!confirm(`Permanently delete "${name}" and all historical records?`)) return;
  await sb.from('employee_tasks').delete().eq('emp_id', id);
  await sb.from('attendance_log').delete().eq('emp_id', id);
  await sb.from('salary_tracker').delete().eq('emp_id', id);
  await sb.from('advance_tracker').delete().eq('emp_id', id);
  await sb.from('profiles').delete().eq('emp_id', id);
  await sb.from('employees').delete().eq('emp_id', id);
  renderManageEmployees();
}

// ============ TASKS ============
async function renderEmployeeTasks(viewMode) {
  viewMode = viewMode || 'list';
  renderShell('<div class="loading">Loading...</div>', 'tasks');

  const { data: tasks } = await sb.from('employee_tasks')
    .select('*').order('assigned_date', { ascending: false });
  const { data: emps } = await sb.from('employees').select('emp_id, name');
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname');

  const empMap = {};
  (emps || []).forEach(e => { empMap[e.emp_id] = e.name; });
  const roomMap2 = {};
  (rooms || []).forEach(r => { roomMap2[r.room_id] = r.nickname; });

  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role);
  const allMonths = [...new Set((tasks||[]).map(t => (t.assigned_date||'').slice(0,7)).filter(Boolean))].sort().reverse();
  const currentMonth = new Date().toISOString().slice(0,7);
  const selectedMonth = window._taskMonth || currentMonth;
  const filteredTasks = (tasks||[]).filter(t => (t.assigned_date||'').startsWith(selectedMonth));
  const isByEmp = viewMode === 'byEmployee';

  const empGroups = {};
  filteredTasks.forEach(t => {
    const eName = empMap[t.emp_id] || t.emp_id;
    if (!empGroups[eName]) empGroups[eName] = { tasks: [], props: {} };
    empGroups[eName].tasks.push(t);
    const prop = roomMap2[t.room_id] || 'General/All';
    empGroups[eName].props[prop] = (empGroups[eName].props[prop] || 0) + 1;
  });

  const monthOpts = allMonths.map(m =>
    `<option value="${m}" ${m===selectedMonth?'selected':''}>${m}</option>`
  ).join('');

  let tableHTML = '';
  if (isByEmp) {
    tableHTML += '<thead><tr><th>Employee / Property</th><th>Total</th><th>Completed ✅</th><th>Pending ⏳</th><th>In Progress 🔄</th></tr></thead><tbody>';
    Object.entries(empGroups).forEach(([eName, d]) => {
      const done = d.tasks.filter(t => t.status==='Completed').length;
      const pend = d.tasks.filter(t => t.status==='Pending').length;
      const prog = d.tasks.filter(t => t.status==='In Progress').length;
      tableHTML += `<tr style="background:var(--card-bg);border-top:2px solid var(--border)">
        <td><strong>👤 ${eName}</strong></td>
        <td><span class="badge blue">${d.tasks.length}</span></td>
        <td><span class="badge green">${done}</span></td>
        <td><span class="badge ${pend>0?'red':'green'}">${pend}</span></td>
        <td><span class="badge ${prog>0?'yellow':'green'}">${prog}</span></td>
      </tr>`;
      Object.entries(d.props).forEach(([prop, cnt]) => {
        tableHTML += `<tr style="background:var(--bg)">
          <td style="padding-left:24px;color:var(--muted);font-size:13px">↳ ${prop}</td>
          <td><span class="badge blue">${cnt}</span></td>
          <td>-</td><td>-</td><td>-</td>
        </tr>`;
      });
    });
    if (!Object.keys(empGroups).length) tableHTML += '<tr><td colspan="5" class="sub">No tasks this month</td></tr>';
    tableHTML += '</tbody>';
  } else {
    tableHTML += `<thead><tr><th>Employee</th><th>Property</th><th>Type</th><th>Task</th><th>Priority</th><th>Date</th><th>Status</th>${isO?'<th>Actions</th>':''}</tr></thead><tbody>`;
    if (filteredTasks.length) {
      filteredTasks.forEach(t => {
        const priC = t.priority==='Urgent'?'red':t.priority==='High'?'yellow':'green';
        const stC  = t.status==='Completed'?'green':t.status==='In Progress'?'yellow':'red';
        tableHTML += `<tr>
          <td><strong>${empMap[t.emp_id]||t.emp_id}</strong></td>
          <td>${roomMap2[t.room_id]||'-'}</td>
          <td><span class="badge blue">${t.task_type||'Other'}</span></td>
          <td>${t.task_description||'-'}</td>
          <td><span class="badge ${priC}">${t.priority||'Normal'}</span></td>
          <td>${t.assigned_date||'-'}</td>
          <td><span class="badge ${stC}">${t.status||'Pending'}</span></td>
          ${isO?`<td class="table-actions"><button class="btn-sm" onclick="editTask(${t.id})">✏️</button>${window.canDelete&&window.canDelete()?`<button class="btn-sm danger" onclick="delTask(${t.id})">🗑️</button>`:''}</td>`:''}
        </tr>`;
      });
    } else {
      tableHTML += '<tr><td colspan="8" class="sub">No tasks this month</td></tr>';
    }
    tableHTML += '</tbody>';
  }

  // Build By-Date view
  let byDateHTML = '';
  if (viewMode === 'byDate') {
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const tasksByDate = {};
    filteredTasks.forEach(t => {
      const d = t.assigned_date;
      if (!d) return;
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(t);
    });

    const rows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2,'0')}`;
      const dTasks = tasksByDate[dateStr] || [];
      const count = dTasks.length;
      if (count === 0) continue;
      const dObj = new Date(dateStr);
      const dayName = dayNames[dObj.getDay()];

      const empGroupsDate = {};
      dTasks.forEach(t => {
        const eName = empMap[t.emp_id] || t.emp_id;
        if (!empGroupsDate[eName]) empGroupsDate[eName] = [];
        empGroupsDate[eName].push(t);
      });

      let expandHTML = '';
      Object.entries(empGroupsDate).forEach(([eName, arr]) => {
        expandHTML += `<div style="margin:8px 0 4px 12px;"><strong>👤 ${eName}</strong></div>`;
        arr.forEach(t => {
          const prop = roomMap2[t.room_id] || 'General/All';
          const stC = t.status==='Completed'?'green':t.status==='In Progress'?'yellow':'red';
          expandHTML += `<div style="margin-left:32px;padding:4px 0;color:var(--muted);font-size:13px;">
            ↳ ${prop} — <span class="badge blue">${t.task_type||'Task'}</span>
            <span style="color:var(--fg);">${t.task_description||'-'}</span>
            <span class="badge ${stC}">${t.status||'Pending'}</span>
          </div>`;
        });
      });

      const isToday = dateStr === new Date().toISOString().slice(0,10);
      const bgColor = isToday ? 'background:var(--primary-fade,rgba(100,150,255,0.1));' : '';

      rows.push(`
        <div style="border-bottom:1px solid var(--border);padding:12px;${bgColor}cursor:${count>0?'pointer':'default'};"
             ${count>0 ? `onclick="toggleTaskDate('${dateStr}')"` : ''}>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span id="arrow-${dateStr}" style="display:inline-block;width:20px;">${count>0?'▼':'·'}</span>
              <strong>📅 ${dateStr} (${dayName})</strong>
              ${isToday ? '<span class="badge yellow" style="margin-left:8px;">Today</span>' : ''}
            </div>
            <div>
              <span class="badge ${count>0?'green':'red'}">${count} tasks</span>
            </div>
          </div>
          ${count>0 ? `<div id="date-${dateStr}" style="display:block;margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);">${expandHTML}</div>` : ''}
        </div>
      `);
    }
    byDateHTML = rows.join('');
  }

  renderShell(`
    <div class="card">
      <h1>🧰 Tasks</h1>
      <div class="sub">${filteredTasks.length} tasks — ${selectedMonth}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        ${isO ? '<button onclick="renderAddTask()">➕ Add Task</button>' : ''}
        <button class="${!isByEmp?'':'secondary'} btn-sm" onclick="window._taskMonth='${selectedMonth}';renderEmployeeTasks('list')">📋 All Tasks</button>
        <button class="${isByEmp?'':'secondary'} btn-sm" onclick="window._taskMonth='${selectedMonth}';renderEmployeeTasks('byEmployee')">👤 By Employee</button>
        <button class="${viewMode==='byDate'?'':'secondary'} btn-sm" onclick="window._taskMonth='${selectedMonth}';renderEmployeeTasks('byDate')">📅 By Date</button>
        <select onchange="window._taskMonth=this.value;renderEmployeeTasks('${viewMode}')" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);">
          ${monthOpts}
        </select>
      </div>
    </div>
    <div class="card">${viewMode==='byDate' ? byDateHTML : `<div class="table-wrap"><table>${tableHTML}</table></div>`}</div>
  `, 'tasks');
}

window.toggleTaskDate = function(dateKey) {
  const el = document.getElementById('date-' + dateKey);
  const arrow = document.getElementById('arrow-' + dateKey);
  if (el) {
    const hidden = el.style.display === 'none';
    el.style.display = hidden ? 'block' : 'none';
    if (arrow) arrow.textContent = hidden ? '▼' : '▶';
  }
};

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
            ${(rooms || []).map(r => `<option value="${r.room_id}">${propLabel(r)}</option>`).join('')}
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
  const _btn = document.querySelector('button[onclick="saveTask()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
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
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id === t.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
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
async function renderAttendance(selectedDate) {
  const _renderAttendanceTabs = (active) => `
    <div class="card" style="padding:8px;margin-bottom:12px;">
      <div style="display:flex;gap:8px;">
        <button onclick="renderAttendance()" class="${active==='mark'?'':'secondary'}" style="flex:1;">📋 Mark Today</button>
        <button onclick="renderAttendanceSummary()" class="${active==='report'?'':'secondary'}" style="flex:1;">📊 Reports</button>
      </div>
    </div>`;
  window._attTabsHtml = _renderAttendanceTabs('mark');

  renderShell(`${window._attTabsHtml || ""}
    <div class="loading">Loading...</div>`, 'attendance');
  const today = new Date().toISOString().slice(0, 10);
  const attDate = selectedDate || today;

  const [{ data: emps }, { data: att }] = await Promise.all([
    sb.from('employees').select('emp_id,name,role').eq('status', 'Active').order('name'),
    sb.from('attendance_log').select('*').eq('att_date', attDate)
  ]);
  const am = {};
  (att || []).forEach(a => { am[a.emp_id] = a.status; });
  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role);

  const dateLabel = new Date(attDate).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const isToday = attDate === today;

  renderShell(`${window._attTabsHtml || ""}
    <div class="card">
      <h1>📋 Attendance</h1>
      <div class="sub">${dateLabel} ${isToday ? '(Today)' : '(Back-dated)'}</div>

      <div class="form-grid" style="margin-top:12px;">
        <div class="form-group">
          <label>Select Date (Back-dated allowed)</label>
          <input type="date" id="attDatePicker" value="${attDate}" max="${today}"
            onchange="renderAttendance(this.value)" />
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          ${!isToday ? `<button class="btn-sm" onclick="renderAttendance('${today}')">📅 Back to Today</button>` : ''}
        </div>
      </div>

      <div class="sub">${(emps || []).length} active employees</div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Role</th><th>Status</th>${isO ? '<th>Mark</th>' : ''}</tr></thead>
      <tbody>${(emps || []).map(e => {
        const st = am[e.emp_id] || 'Not Marked';
        return `<tr>
          <td><strong>${e.name}</strong></td>
          <td style="font-size:12px;">${e.role || '-'}</td>
          <td><span class="badge ${st === 'Present' ? 'green' : st === 'Absent' ? 'red' : st === 'Half Day' ? 'yellow' : 'yellow'}">${st}</span></td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm green-btn" onclick="markAtt('${e.emp_id}','Present','${attDate}')">✅ P</button>
            <button class="btn-sm danger" onclick="markAtt('${e.emp_id}','Absent','${attDate}')">❌ A</button>
            <button class="btn-sm secondary" onclick="markAtt('${e.emp_id}','Half Day','${attDate}')">½</button>
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'attendance');
}

async function markAtt(eid, st, dateStr) {
  const attDate = dateStr || new Date().toISOString().slice(0, 10);
  const { data: ex } = await sb.from('attendance_log').select('id').eq('emp_id', eid).eq('att_date', attDate).single();
  if (ex) await sb.from('attendance_log').update({ status: st }).eq('id', ex.id);
  else await sb.from('attendance_log').insert({ emp_id: eid, att_date: attDate, status: st });
  renderAttendance(attDate);
}

// ============ ATTENDANCE SUMMARY ============
async function renderAttendanceSummary() {
  const _renderTabsRep = () => `
    <div class="card" style="padding:8px;margin-bottom:12px;">
      <div style="display:flex;gap:8px;">
        <button onclick="renderAttendance()" class="secondary" style="flex:1;">📋 Mark Today</button>
        <button style="flex:1;">📊 Reports</button>
      </div>
    </div>`;
  window._attTabsHtmlRep = _renderTabsRep();

  renderShell(`${window._attTabsHtmlRep || ""}
    <div class="loading">Loading...</div>`, 'att-summary');
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

  renderShell(`${window._attTabsHtmlRep || ""}
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
  const [{ data: sals }, { data: advs }, { data: genExps }] = await Promise.all([
    sb.from('salary_tracker').select('*, employees(name)').order('month', { ascending: false }),
    sb.from('advance_tracker').select('emp_id, advance_amount, repaid_amount'),
    sb.from('daily_expenses').select('emp_id, amount')
  ]);
  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role);

  const advMap = {};
  (advs || []).forEach(a => {
    advMap[a.emp_id] = (advMap[a.emp_id] || 0) + ((a.advance_amount || 0) - (a.repaid_amount || 0));
  });

  const genMap = {};
  (genExps || []).forEach(e => {
    genMap[e.emp_id] = (genMap[e.emp_id] || 0) + (e.amount || 0);
  });

  renderShell(`
    <div class="card">
      <h1>💰 Payroll</h1>
      <div class="sub">${(sals || []).length} records</div>
      ${isO ? `<button onclick="renderAddSal()">➕ Add Record</button>` : ''}
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Employee</th><th>Month</th><th>Due ₹</th><th>Paid ₹</th><th>Balance ₹</th>
        <th>Advance ₹</th><th>Staff Exp ₹</th>
        ${isO ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${(sals || []).map(s => {
        const bal = (s.salary_due || 0) - (s.salary_paid || 0);
        return `<tr>
          <td><strong style="color:var(--primary);cursor:pointer;text-decoration:underline;" onclick="showEmpDetailModal('${s.emp_id}')">${s.employees?.name || s.emp_id}</strong></td>
          <td>${s.month || '-'}</td>
          <td style="color:var(--red);">₹${(s.salary_due || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--green);">₹${(s.salary_paid || 0).toLocaleString('en-IN')}</td>
          <td style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'};">₹${bal.toLocaleString('en-IN')}</td>
          <td style="color:var(--red);">₹${(advMap[s.emp_id] || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--blue);">₹${(genMap[s.emp_id] || 0).toLocaleString('en-IN')}</td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm" onclick="editSal(${s.id})">✏️</button>
            ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="delSal(${s.id})">🗑️</button>` : ''}
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
  const _btn = document.querySelector('button[onclick="saveSal()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
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
window._advTrackerFilter = window._advTrackerFilter || { empId: 'all', fromDate: '', toDate: '' };

async function renderAdvanceTracker() {
  renderShell(`<div class="loading">Loading advances...</div>`, 'advance');
  const [{ data: advs }, { data: emps }] = await Promise.all([
    sb.from('advance_tracker').select('*, employees(name)').order('date_given', { ascending: false }),
    sb.from('employees').select('emp_id, name').order('name')
  ]);
  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role);

  const filter = window._advTrackerFilter;
  const currMonth = new Date().toISOString().slice(0, 7);

  // Filter advances
  const filtered = (advs || []).filter(a => {
    if (filter.empId && filter.empId !== 'all' && a.emp_id !== filter.empId) return false;
    const d = a.date_given || (a.created_at || '').slice(0, 10);
    if (filter.fromDate && d < filter.fromDate) return false;
    if (filter.toDate && d > filter.toDate) return false;
    return true;
  });

  // 1. Total All Time (for selected employee or all)
  const empAllAdvs = (advs || []).filter(a => filter.empId === 'all' || a.emp_id === filter.empId);
  const totalAllTimeGiven = empAllAdvs.reduce((s, a) => s + Number(a.advance_amount || 0), 0);
  const totalAllTimeRepaid = empAllAdvs.reduce((s, a) => s + Number(a.repaid_amount || 0), 0);
  const totalAllTimeBalance = totalAllTimeGiven - totalAllTimeRepaid;

  // 2. Monthly Given (Current Month)
  const totalMonthlyGiven = empAllAdvs
    .filter(a => (a.date_given || (a.created_at || '')).slice(0, 7) === currMonth)
    .reduce((s, a) => s + Number(a.advance_amount || 0), 0);

  // 3. Between Range Given
  const totalBetweenGiven = filtered.reduce((s, a) => s + Number(a.advance_amount || 0), 0);
  const totalBetweenRepaid = filtered.reduce((s, a) => s + Number(a.repaid_amount || 0), 0);
  const totalBetweenBalance = totalBetweenGiven - totalBetweenRepaid;

  renderShell(`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="margin:0;">💵 Staff Advances Tracker</h1>
          <div class="sub">${filtered.length} records shown (Total ${advs?.length || 0} in system)</div>
        </div>
        ${isO ? `<button onclick="renderAddAdv()" style="background:#0F766E;color:#fff;font-weight:700;">➕ Give Advance</button>` : ''}
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="card" style="background:#F8FAFC;border:1px solid #E2E8F0;padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#334155;">🔍 Filter by Employee &amp; Date Range</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;align-items:end;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">👤 Employee</label>
          <select id="advEmpFilter" onchange="updateAdvTrackerFilter()" style="width:100%;padding:7px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;background:#fff;">
            <option value="all" ${filter.empId==='all'?'selected':''}>All Employees</option>
            ${(emps || []).map(e => `<option value="${e.emp_id}" ${filter.empId===e.emp_id?'selected':''}>${e.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">📅 Between: From Date</label>
          <input id="advFromDate" type="date" value="${filter.fromDate}" onchange="updateAdvTrackerFilter()" style="width:100%;padding:6px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">📅 Between: To Date</label>
          <input id="advToDate" type="date" value="${filter.toDate}" onchange="updateAdvTrackerFilter()" style="width:100%;padding:6px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;box-sizing:border-box;">
        </div>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="font-size:10.5px;color:#64748B;font-weight:700;">Quick Presets:</span>
        <button type="button" onclick="setAdvTrackerDates('${currMonth}-01', '${new Date().toISOString().slice(0, 10)}')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">📅 This Month</button>
        <button type="button" onclick="setAdvTrackerDates('2026-09-17', '${new Date().toISOString().slice(0, 10)}')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">⚡ Post-Checkpoint (17-Sep)</button>
        <button type="button" onclick="setAdvTrackerDates('', '')" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">🌐 All Dates</button>
      </div>
    </div>

    <!-- METRICS BREAKDOWN -->
    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;">
        <div style="text-align:center;padding:12px;background:#FEF2F2;border:1px solid #FECDD3;border-radius:8px;">
          <div style="font-size:11px;color:#991B1B;font-weight:700;">💰 TOTAL ALL-TIME</div>
          <div style="font-size:20px;font-weight:800;color:#991B1B;margin-top:2px;">₹${totalAllTimeGiven.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#666;">All historical advances</div>
        </div>
        <div style="text-align:center;padding:12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
          <div style="font-size:11px;color:#1E40AF;font-weight:700;">📅 MONTHLY (${currMonth})</div>
          <div style="font-size:20px;font-weight:800;color:#1D4ED8;margin-top:2px;">₹${totalMonthlyGiven.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#666;">In current month</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;">
          <div style="font-size:11px;color:#92400E;font-weight:700;">⏳ BETWEEN DATES</div>
          <div style="font-size:20px;font-weight:800;color:#B45309;margin-top:2px;">₹${totalBetweenGiven.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#666;">In selected date range</div>
        </div>
        <div style="text-align:center;padding:12px;background:${totalAllTimeBalance > 0 ? '#FEF2F2' : '#F0FDF4'};border:1px solid ${totalAllTimeBalance > 0 ? '#FCA5A5' : '#86EFAC'};border-radius:8px;">
          <div style="font-size:11px;color:${totalAllTimeBalance > 0 ? '#991B1B' : '#166534'};font-weight:700;">⚖️ OUTSTANDING BALANCE</div>
          <div style="font-size:20px;font-weight:800;color:${totalAllTimeBalance > 0 ? '#DC2626' : '#059669'};margin-top:2px;">₹${totalAllTimeBalance.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#666;">Repaid: ₹${totalAllTimeRepaid.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Employee</th><th>Date</th><th>Given ₹</th>
        <th>Repaid ₹</th><th>Repaid On</th><th>Balance ₹</th>
        <th>Account</th><th>Mode</th><th>Reason</th>
        ${isO ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${filtered.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:24px;color:#94A3B8;">No advance records found for this filter</td></tr>' : filtered.map(a => {
        const bal = (a.advance_amount || 0) - (a.repaid_amount || 0);
        return `<tr>
          <td><strong style="color:var(--primary);cursor:pointer;text-decoration:underline;" onclick="showEmpDetailModal('${a.emp_id}')">${a.employees?.name || a.emp_id}</strong></td>
          <td style="font-size:12px;">${a.date_given || '-'}</td>
          <td style="color:var(--red);font-weight:700;">₹${(a.advance_amount || 0).toLocaleString('en-IN')}</td>
          <td style="color:var(--green);">₹${(a.repaid_amount || 0).toLocaleString('en-IN')}</td>
          <td style="font-size:12px;">${a.repaid_date || '-'}</td>
          <td style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'};font-weight:700;">₹${bal.toLocaleString('en-IN')}</td>
          <td>${window.UHHSODManager ? UHHSODManager.getBadge(a.paid_by) : (a.paid_by || '-')}</td>
          <td style="font-size:12px;">${a.payment_mode || '-'}</td>
          <td style="font-size:12px;">${a.reason || '-'}</td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm" onclick="editAdv(${a.id})">✏️</button>
            ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="delAdv(${a.id})">🗑️</button>` : ''}
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'advance');
}

window.updateAdvTrackerFilter = function() {
  window._advTrackerFilter.empId = document.getElementById('advEmpFilter')?.value || 'all';
  window._advTrackerFilter.fromDate = document.getElementById('advFromDate')?.value || '';
  window._advTrackerFilter.toDate = document.getElementById('advToDate')?.value || '';
  renderAdvanceTracker();
};

window.setAdvTrackerDates = function(f, t) {
  window._advTrackerFilter.fromDate = f;
  window._advTrackerFilter.toDate = t;
  renderAdvanceTracker();
};

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
        <div class="form-group">
          <label>Payment Source / Account *</label>
          <select id="aPaidBy" style="border: 1.5px solid #0d6efd; font-weight: 600;">
            <option value="COMPANY">🏢 COMPANY (Guest Rent / Cash in Hand)</option>
            <option value="UHHS-OD" selected>🏦 UHHS-OD (Overdraft Account)</option>
            <option value="FIROZ">👤 FIROZ (Direct Personal)</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Reason</label><input id="aReason" /></div>
      <button onclick="saveAdv()" style="width:100%;">💾 Save</button>
      <div id="advErr"></div>
    </div>
  `, 'advance');
}

async function saveAdv() {
  const _btn = document.querySelector('button[onclick="saveAdv()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const eid = document.getElementById('aEmp').value;
  const amt = parseFloat(document.getElementById('aAmt').value) || 0;
  if (!eid || amt <= 0) {
    document.getElementById('advErr').innerHTML = '<div class="error">Employee & amount required</div>';
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Advance'; }
    return;
  }
  const paidByVal = document.getElementById('aPaidBy')?.value || 'UHHS-OD';
  const dateVal = document.getElementById('aDate').value || null;

  // 🚨 DUPLICATE ADVANCE CHECK
  if (dateVal) {
    const { data: existingAdv } = await sb.from('advance_tracker')
      .select('id, emp_id, advance_amount, date_given')
      .eq('emp_id', eid)
      .eq('advance_amount', amt)
      .eq('date_given', dateVal)
      .limit(1);

    if (existingAdv && existingAdv.length > 0) {
      const ok = confirm(
        `⚠️ DUPLICATE ADVANCE WARNING!\n\n` +
        `Is employee ke liye date ${dateVal} par already ₹${amt.toLocaleString('en-IN')} ka advance recorded hai.\n\n` +
        `Kya aap sach me duplicate advance add karna chahte hain?`
      );
      if (!ok) {
        if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Advance'; }
        return;
      }
    }
  }

  const { error } = await sb.from('advance_tracker').insert({
    emp_id: eid,
    date_given: dateVal,
    advance_amount: amt,
    repaid_amount: 0,
    payment_mode: document.getElementById('aMode').value || null,
    paid_by: paidByVal,
    reason: document.getElementById('aReason').value.trim() || null,
    claim_status: 'unclaimed',
    is_deducted: false
  });
  if (error) {
    document.getElementById('advErr').innerHTML = `<div class="error">${error.message}</div>`;
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Advance'; }
    return;
  }
  if (window.notifyDataChanged) window.notifyDataChanged();
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
        <div class="form-group"><label>Payment Source / Account *</label>
          <select id="aPaidBy" style="border: 1.5px solid #0d6efd; font-weight: 600;">
            <option value="COMPANY" ${a.paid_by === 'COMPANY' ? 'selected' : ''}>🏢 COMPANY (Guest Rent / Cash in Hand)</option>
            <option value="UHHS-OD" ${a.paid_by === 'UHHS-OD' || !a.paid_by ? 'selected' : ''}>🏦 UHHS-OD (Overdraft Account)</option>
            <option value="FIROZ" ${a.paid_by === 'FIROZ' ? 'selected' : ''}>👤 FIROZ (Direct Personal)</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Reason</label><input id="aReason" value="${a.reason || ''}" /></div>
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
    paid_by: document.getElementById('aPaidBy')?.value || 'UHHS-OD',
    reason: document.getElementById('aReason').value.trim() || null
  }).eq('id', id);
  if (window.notifyDataChanged) window.notifyDataChanged();
  renderAdvanceTracker();
}

async function delAdv(id) {
  if (confirm('Delete?')) {
    await sb.from('advance_tracker').delete().eq('id', id);
    if (window.notifyDataChanged) window.notifyDataChanged();
    renderAdvanceTracker();
  }
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
            ${['🧹 Cleaning Supplies','🛒 Grocery/Food','🚗 Travel/Fuel','🔧 Maintenance','💡 Utilities','📱 Recharge/Internet','🎁 Guest Requests','📦 Other']
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
  const isO = ['owner','admin','moderator','developer'].includes(SESSION.role) || SESSION.role === 'manager';

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
                  ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="delEmpExpense(${e.id})">🗑️</button>` : ''}
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
            ${['🧹 Cleaning Supplies','🛒 Grocery/Food','🚗 Travel/Fuel','🔧 Maintenance','💡 Utilities','📱 Recharge/Internet','🎁 Guest Requests','📦 Other']
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
              `<option value="${r.room_id}">${propLabel(r)}</option>`
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
  const _btn = document.querySelector('button[onclick="saveEmpExpense()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }

  const empId = document.getElementById('eeEmp').value;
  const date  = document.getElementById('eeDate').value;
  const cat   = document.getElementById('eeCat').value;
  const amt   = parseFloat(document.getElementById('eeAmt').value) || 0;
  const desc  = document.getElementById('eeDesc').value.trim();

  if (!empId || !date || !cat || amt <= 0 || !desc) {
    document.getElementById('eeErr').innerHTML =
      '<div class="error">Employee, Date, Category, Amount & Description required</div>';
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Expense'; }
    return;
  }

  // 🚨 DUPLICATE DAILY EXPENSE CHECK
  const { data: existingEmpExps } = await sb.from('daily_expenses')
    .select('id, emp_id, expense_date, category, amount, description')
    .eq('emp_id', empId)
    .eq('expense_date', date)
    .eq('category', cat)
    .eq('amount', amt)
    .limit(1);

  if (existingEmpExps && existingEmpExps.length > 0) {
    const ok = confirm(
      `⚠️ DUPLICATE EXPENSE WARNING!\n\n` +
      `Date: ${date}\n` +
      `Category: ${cat}\n` +
      `Amount: ₹${amt.toLocaleString('en-IN')}\n` +
      `Description: "${existingEmpExps[0].description || desc}"\n\n` +
      `Is employee ke liye same date aur category me ₹${amt.toLocaleString('en-IN')} ka expense pehle se recorded hai.\n\n` +
      `Kya aap sach me duplicate expense add karna chahte hain?`
    );
    if (!ok) {
      if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Expense'; }
      return;
    }
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
    if (_btn) { _btn.disabled = false; _btn.textContent = '💾 Save Expense'; }
    return;
  }

  fsn.success('Success', '✅ Expense saved!');
  renderEmpExpenses();
}

async function editEmpExpense(id) {
  const { data: ex } = await sb.from('daily_expenses').select('*').eq('id', id).single();
  if (!ex) { fsn.error('Error', 'Not found'); return; }

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
            ${['🧹 Cleaning Supplies','🛒 Grocery/Food','🚗 Travel/Fuel','🔧 Maintenance','💡 Utilities','📱 Recharge/Internet','🎁 Guest Requests','📦 Other']
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
              `<option value="${r.room_id}" ${r.room_id === ex.room_id ? 'selected' : ''}>${propLabel(r)}</option>`
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

  fsn.success('Success', '✅ Updated!');
  renderEmpExpenses();
}

async function delEmpExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await sb.from('daily_expenses').delete().eq('id', id);
  if (error) { fsn.error('Error', '❌ ' + error.message); return; }
  fsn.success('Success', '✅ Deleted');
  renderEmpExpenses();
}

// ============ EMPLOYEE DETAIL MODAL ============
async function showEmpDetailModal(empId) {
  const [{ data: emp }, { data: sals }, { data: advs }, { data: exps }, { data: att }, { data: tasks }] = await Promise.all([
    sb.from('employees').select('*').eq('emp_id', empId).single(),
    sb.from('salary_tracker').select('*').eq('emp_id', empId).order('month', { ascending: false }),
    sb.from('advance_tracker').select('*').eq('emp_id', empId).order('date_given', { ascending: false }),
    sb.from('daily_expenses').select('*').eq('emp_id', empId).order('expense_date', { ascending: false }).limit(50),
    sb.from('attendance_log').select('status, att_date').eq('emp_id', empId).gte('att_date', new Date().toISOString().slice(0,7) + '-01'),
    sb.from('employee_tasks').select('*').eq('emp_id', empId).order('assigned_date', { ascending: false }).limit(20)
  ]);

  if (!emp) { fsn.error('Error', 'Employee not found'); return; }

  const totalDue = (sals || []).reduce((s, r) => s + (r.salary_due || 0), 0);
  const totalPaid = (sals || []).reduce((s, r) => s + (r.salary_paid || 0), 0);
  const salBalance = totalDue - totalPaid;

  const totalAdvGiven = (advs || []).reduce((s, r) => s + (r.advance_amount || 0), 0);
  const totalAdvRepaid = (advs || []).reduce((s, r) => s + (r.repaid_amount || 0), 0);
  const advBalance = totalAdvGiven - totalAdvRepaid;

  const totalGenExp = (exps || []).reduce((s, r) => s + (r.amount || 0), 0);

  const presentDays = (att || []).filter(a => a.status === 'Present').length;
  const absentDays = (att || []).filter(a => a.status === 'Absent').length;

  const pendingTasks = (tasks || []).filter(t => t.status === 'Pending').length;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:700px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>👤 ${emp.name}</h2>
      <div class="sub">${emp.role || '-'} · 📞 ${emp.phone || '-'} · <span class="badge ${(emp.status === 'Active' || emp.is_active === true) ? 'green' : 'red'}">${(emp.status === 'Active' || emp.is_active === true) ? 'Active' : 'Disabled'}</span></div>

      <div class="stat-grid" style="margin-top:12px;">
        <div class="stat-card" style="border-left:4px solid var(--red);">
          <div class="stat-num" style="color:var(--red);font-size:18px;">₹${salBalance.toLocaleString('en-IN')}</div>
          <div class="stat-label">Salary Pending</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--red);">
          <div class="stat-num" style="color:var(--red);font-size:18px;">₹${advBalance.toLocaleString('en-IN')}</div>
          <div class="stat-label">Advance Due</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--blue);">
          <div class="stat-num" style="color:var(--blue);font-size:18px;">₹${totalGenExp.toLocaleString('en-IN')}</div>
          <div class="stat-label">Staff Expense</div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card" style="border-left:4px solid var(--green);">
          <div class="stat-num" style="color:var(--green);">${presentDays}</div>
          <div class="stat-label">Present (${new Date().toISOString().slice(0,7)})</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--red);">
          <div class="stat-num" style="color:var(--red);">${absentDays}</div>
          <div class="stat-label">Absent</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--yellow);">
          <div class="stat-num" style="color:var(--yellow);">${pendingTasks}</div>
          <div class="stat-label">Pending Tasks</div>
        </div>
      </div>

      <div class="section-title" style="margin-top:14px;">💰 Salary History</div>
      ${(sals || []).length === 0 ? '<div class="sub">No records</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Month</th><th>Due</th><th>Paid</th><th>Balance</th></tr></thead>
          <tbody>${sals.map(r => {
            const b = (r.salary_due || 0) - (r.salary_paid || 0);
            return `<tr>
              <td>${r.month || '-'}</td>
              <td style="color:var(--red);">₹${(r.salary_due || 0).toLocaleString('en-IN')}</td>
              <td style="color:var(--green);">₹${(r.salary_paid || 0).toLocaleString('en-IN')}</td>
              <td style="color:${b > 0 ? 'var(--red)' : 'var(--green)'};">₹${b.toLocaleString('en-IN')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`}

      <div class="section-title" style="margin-top:14px;">💵 Advance History</div>
      ${(advs || []).length === 0 ? '<div class="sub">No advances</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Given</th><th>Repaid</th><th>Balance</th><th>Reason</th></tr></thead>
          <tbody>${advs.map(r => {
            const b = (r.advance_amount || 0) - (r.repaid_amount || 0);
            return `<tr>
              <td style="font-size:12px;">${r.date_given || '-'}</td>
              <td style="color:var(--red);">₹${(r.advance_amount || 0).toLocaleString('en-IN')}</td>
              <td style="color:var(--green);">₹${(r.repaid_amount || 0).toLocaleString('en-IN')}</td>
              <td style="color:${b > 0 ? 'var(--red)' : 'var(--green)'};">₹${b.toLocaleString('en-IN')}</td>
              <td style="font-size:12px;">${r.reason || '-'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`}

      <div class="section-title" style="margin-top:14px;">🧾 Staff Expenses</div>
      ${(exps || []).length === 0 ? '<div class="sub">No expenses</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Category</th><th>Property</th><th>Amount</th><th>Description</th></tr></thead>
          <tbody>${exps.map(r => `
            <tr>
              <td style="font-size:12px;">${r.expense_date || '-'}</td>
              <td><span class="badge yellow">${r.category || '-'}</span></td>
              <td style="font-size:12px;">${r.room_id || 'General'}</td>
              <td style="color:var(--red);">₹${(r.amount || 0).toLocaleString('en-IN')}</td>
              <td style="font-size:12px;max-width:150px;">${r.description || '-'}</td>
            </tr>
          `).join('')}</tbody>
        </table></div>`}

      <div class="btn-row" style="margin-top:12px;">
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

console.log("✅ Employees Module v7 loaded");
