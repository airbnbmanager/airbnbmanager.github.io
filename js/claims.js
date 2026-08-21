// ═══════════════════════════════════════════════════════════
// 📤 CLAIMS MANAGER ENGINE v5 (Employee Name Mapping + Staff Advance Grouping)
// ═══════════════════════════════════════════════════════════

window._claimsState = {
  fromDate: '2026-08-17',
  fromTime: '20:35',
  toDate: new Date().toISOString().slice(0, 10),
  toTime: '23:59',
  moduleFilter: 'all',
  statusFilter: 'claimed',
  paidByFilter: 'all',
  selectedIds: new Set(),
  allData: [],
  empMap: {}
};

function claimsStatusBadge(st) {
  if (st === 'claimed') return { bg: '#FEF3C7', color: '#92400E', text: '📤 Claimed' };
  if (st === 'received') return { bg: '#D1FAE5', color: '#065F46', text: '✅ Settled' };
  return { bg: '#FEE2E2', color: '#991B1B', text: '⏳ Pending' };
}

function mapReimbStatus(raw) {
  const s = (raw || 'Pending').toString().toLowerCase();
  if (s === 'claimed') return 'claimed';
  if (s === 'received') return 'received';
  return 'unclaimed';
}

function mapLaundryMaintStatus(raw) {
  const s = (raw || 'not_claimed').toString().toLowerCase();
  if (s === 'claimed') return 'claimed';
  if (s === 'received') return 'received';
  return 'unclaimed';
}

async function renderClaims() {
  renderShell(`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="margin:0;font-size:22px;">📤 Universal Claims Manager</h1>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">
            Checkpoint: <strong>17-Aug-2026 8:35 PM</strong> · Auto Employee Lookup · Grouped Staff Advances
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="generateClaimReport()" style="background:#8B5CF6;color:#fff;font-weight:600;">📊 Claim Report Statement</button>
          <button onclick="copyClaimWhatsAppText()" style="background:#25D366;color:#fff;font-weight:600;">📱 WhatsApp Summary</button>
        </div>
      </div>
    </div>

    <div class="card" style="background:#F8FAFC;border:1px solid #E2E8F0;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#334155;">🔍 Filters</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">📅 FROM Date</label>
          <input id="cfFromDate" type="date" value="${window._claimsState.fromDate}" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">🕐 FROM Time</label>
          <input id="cfFromTime" type="time" value="${window._claimsState.fromTime}" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">📅 TO Date</label>
          <input id="cfToDate" type="date" value="${window._claimsState.toDate}" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">🕐 TO Time</label>
          <input id="cfToTime" type="time" value="${window._claimsState.toTime}" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">👤 Paid By (Payer)</label>
          <select id="cfPaidBy" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
            <option value="all">All Payers</option>
            <option value="praveen" selected>Praveen Only</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">📁 Module</label>
          <select id="cfModule" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
            <option value="all">All Modules</option>
            <option value="reimbursements">💸 Daily Expenses</option>
            <option value="maintenance">🔧 Maintenance</option>
            <option value="laundry">🧺 Laundry</option>
            <option value="advances">💰 Staff Advances</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">🏷️ Status</label>
          <select id="cfStatus" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
            <option value="claimed" selected>📤 Claimed (paisa lena baaki)</option>
            <option value="unclaimed">⏳ Pending (unclaimed)</option>
            <option value="received">✅ Received (settled)</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px;">
        <button onclick="loadClaimsData()" style="background:#4F46E5;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">🔄 Refresh Data</button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="card" id="claimsStatCards">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
        <div style="text-align:center;padding:12px;background:#EEF2FF;border-radius:8px;">
          <div id="statTotalAmt" style="font-size:20px;font-weight:800;color:#3730A3;">₹0</div>
          <div style="font-size:11px;color:#666;">Total Expenses</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEF3C7;border-radius:8px;">
          <div id="statClaimedAmt" style="font-size:20px;font-weight:800;color:#92400E;">₹0</div>
          <div style="font-size:11px;color:#666;">📤 Claimed Expenses</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEE2E2;border-radius:8px;">
          <div id="statAdvancesAmt" style="font-size:20px;font-weight:800;color:#991B1B;">-₹0</div>
          <div style="font-size:11px;color:#666;">🔻 Less Staff Advances Given</div>
        </div>
        <div style="text-align:center;padding:12px;background:#D1FAE5;border-radius:8px;">
          <div id="statNetPayableAmt" style="font-size:20px;font-weight:800;color:#065F46;">₹0</div>
          <div style="font-size:11px;color:#666;">💵 NET PAYABLE TO PAYER</div>
        </div>
      </div>
    </div>

    <!-- STAFF ADVANCES GROUPED BREAKDOWN CARD -->
    <div class="card" style="background:#FFF5F5;border:1px solid #FECDD3;">
      <div style="font-size:13px;font-weight:700;color:#991B1B;margin-bottom:8px;">👥 Staff Advances Breakdown (Grouped by Employee)</div>
      <div id="staffAdvancesBreakdownContainer" style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px;">
        <div style="color:#666;">Loading staff advance totals...</div>
      </div>
    </div>

    <div class="card" style="padding:12px 20px;background:#EEF2FF;border:1px solid #C7D2FE;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div style="font-size:13px;color:#3730A3;">
          Selected: <strong id="selectedCountText">0 items</strong> · 
          Net Payable: <strong id="selectedAmountText" style="font-size:16px;">₹0</strong>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="bulkUpdateClaims('claimed')" class="btn-sm" style="background:#F59E0B;color:#fff;">📤 Mark Claimed</button>
          <button onclick="bulkUpdateClaims('received')" class="btn-sm" style="background:#10B981;color:#fff;">✅ Mark Received (Settled)</button>
          <button onclick="bulkUpdateClaims('unclaimed')" class="btn-sm" style="background:#6B7280;color:#fff;">↩️ Revert Pending</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div id="claimsTableContainer" style="overflow-x:auto;">
        <div style="text-align:center;padding:30px;color:#666;">Loading...</div>
      </div>
    </div>
  `, 'claims');

  setTimeout(() => {
    const m = document.getElementById('cfModule');
    const s = document.getElementById('cfStatus');
    const pb = document.getElementById('cfPaidBy');
    if (m) m.value = window._claimsState.moduleFilter;
    if (s) s.value = window._claimsState.statusFilter;
    if (pb) pb.value = window._claimsState.paidByFilter;
  }, 50);

  await loadClaimsData();
}

function updateClaimsFilter() {
  window._claimsState.fromDate = document.getElementById('cfFromDate').value;
  window._claimsState.fromTime = document.getElementById('cfFromTime').value;
  window._claimsState.toDate = document.getElementById('cfToDate').value;
  window._claimsState.toTime = document.getElementById('cfToTime').value;
  window._claimsState.moduleFilter = document.getElementById('cfModule').value;
  window._claimsState.statusFilter = document.getElementById('cfStatus').value;
  window._claimsState.paidByFilter = document.getElementById('cfPaidBy')?.value || 'all';
  window._claimsState.selectedIds.clear();
}

async function loadClaimsData() {
  updateClaimsFilter();
  const st = window._claimsState;
  const fromDate = st.fromDate;
  const toDate = st.toDate;

  const container = document.getElementById('claimsTableContainer');
  if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:#666;">Loading claims and advances data...</div>';

  try {
    const [eRes, mRes, lRes, aRes, empRes] = await Promise.all([
      sb.from('reimbursements')
        .select('*')
        .gte('expense_date', fromDate)
        .lte('expense_date', toDate)
        .order('expense_date', { ascending: false }),
      sb.from('maintenance_log')
        .select('*')
        .gte('reported_date', fromDate)
        .lte('reported_date', toDate)
        .gt('cost', 0)
        .order('reported_date', { ascending: false }),
      sb.from('laundry_payments')
        .select('*, laundry_records(vendor_name, record_date)')
        .gte('payment_date', fromDate)
        .lte('payment_date', toDate)
        .order('payment_date', { ascending: false }),
      sb.from('advance_tracker')
        .select('*')
        .gte('date_given', fromDate)
        .lte('date_given', toDate)
        .order('date_given', { ascending: false }),
      sb.from('employees').select('id, name, emp_id')
    ]);

    // Build comprehensive Employee Name Lookup Map (supporting both id and emp_id string)
    const empMap = {};
    (empRes.data || []).forEach(e => {
      if (e.id) empMap[e.id] = e.name;
      if (e.emp_id) empMap[e.emp_id] = e.name;
    });
    window._claimsState.empMap = empMap;

    const combined = [];
    const empAdvanceSum = {};

    // 1. Daily Expenses / Reimbursements
    (eRes.data || []).forEach(r => {
      combined.push({
        uniqKey: `reimb_${r.id}`,
        module: 'reimbursements',
        moduleLabel: '💸 Expense',
        id: r.id,
        sortDate: r.expense_date || r.created_at,
        dateStr: r.expense_date || (r.created_at || '').slice(0, 10),
        description: r.description || r.notes || 'Daily Expense',
        vendorOrStaff: r.paid_to || '-',
        paidBy: r.paid_by || r.paid_to || 'Praveen',
        amount: Number(r.amount || 0),
        status: mapReimbStatus(r.status),
        photo: r.receipt_photo,
        raw: r
      });
    });

    // 2. Maintenance
    (mRes.data || []).forEach(m => {
      combined.push({
        uniqKey: `maint_${m.id}`,
        module: 'maintenance',
        moduleLabel: '🔧 Maintenance',
        id: m.id,
        sortDate: m.reported_date || m.created_at,
        dateStr: m.reported_date || (m.created_at || '').slice(0, 10),
        description: `${m.issue_type || 'Repair'}: ${(m.description || '').slice(0, 80)}`,
        vendorOrStaff: m.vendor_name || m.assigned_to || '-',
        paidBy: m.paid_by || 'Praveen',
        amount: Number(m.cost || 0),
        status: mapLaundryMaintStatus(m.claim_status),
        photo: m.payment_photo || m.photo_before,
        raw: m
      });
    });

    // 3. Laundry
    (lRes.data || []).forEach(lp => {
      const vName = lp.laundry_records?.vendor_name || 'Laundry Vendor';
      combined.push({
        uniqKey: `laundry_${lp.id}`,
        module: 'laundry',
        moduleLabel: '🧺 Laundry',
        id: lp.id,
        sortDate: lp.payment_date || lp.created_at,
        dateStr: lp.payment_date || (lp.created_at || '').slice(0, 10),
        description: `Laundry Payment (${vName})`,
        vendorOrStaff: vName,
        paidBy: lp.paid_by || 'Praveen',
        amount: Number(lp.amount || 0),
        status: mapLaundryMaintStatus(lp.claim_status),
        photo: lp.payment_photo || lp.bill_photo,
        raw: lp
      });
    });

    // 4. Staff Advances (advance_tracker with Employee Name Resolution)
    (aRes.data || []).forEach(adv => {
      const empName = empMap[adv.emp_id] || adv.emp_id || 'Staff';
      const isDeducted = adv.is_deducted === true || adv.is_deducted === 'true';
      const st = isDeducted ? 'received' : 'claimed';
      const advAmt = Number(adv.advance_amount || 0);

      // Track individual employee advance sum
      if (!isDeducted) {
        empAdvanceSum[empName] = (empAdvanceSum[empName] || 0) + advAmt;
      }

      combined.push({
        uniqKey: `advance_${adv.id}`,
        module: 'advances',
        moduleLabel: '💰 Staff Advance',
        id: adv.id,
        sortDate: adv.date_given || adv.created_at,
        dateStr: adv.date_given || (adv.created_at || '').slice(0, 10),
        description: `Advance to ${empName}: ${adv.reason || adv.notes || 'Given'}`,
        vendorOrStaff: `👤 ${empName}`,
        paidBy: adv.paid_by || 'Praveen', // Default to Praveen if null!
        amount: -Math.abs(advAmt), // Negative to offset claim
        status: st,
        photo: null,
        raw: adv
      });
    });

    combined.sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)));
    window._claimsState.allData = combined;

    // Calculate Summary Totals
    let expTotal = 0, claimedTotal = 0, advTotal = 0;
    combined.forEach(i => {
      if (i.amount > 0) {
        expTotal += i.amount;
        if (i.status === 'claimed') claimedTotal += i.amount;
      } else {
        if (i.status !== 'received') advTotal += Math.abs(i.amount);
      }
    });

    const netDue = Math.max(0, claimedTotal - advTotal);

    const el = id => document.getElementById(id);
    if (el('statTotalAmt')) el('statTotalAmt').textContent = '₹' + expTotal.toLocaleString('en-IN');
    if (el('statClaimedAmt')) el('statClaimedAmt').textContent = '₹' + claimedTotal.toLocaleString('en-IN');
    if (el('statAdvancesAmt')) el('statAdvancesAmt').textContent = '-₹' + advTotal.toLocaleString('en-IN');
    if (el('statNetPayableAmt')) el('statNetPayableAmt').textContent = '₹' + netDue.toLocaleString('en-IN');

    // Render Staff Advances Breakdown Badges
    const empBreakdownContainer = document.getElementById('staffAdvancesBreakdownContainer');
    if (empBreakdownContainer) {
      const empEntries = Object.entries(empAdvanceSum);
      if (empEntries.length === 0) {
        empBreakdownContainer.innerHTML = '<span style="color:#059669;font-weight:600;">✅ No active staff advances in selected period.</span>';
      } else {
        empBreakdownContainer.innerHTML = empEntries.map(([name, sum]) => `
          <div style="padding:6px 12px;background:#fff;border:1px solid #FDA4AF;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <strong style="color:#991B1B;">👤 ${name}:</strong> <span style="font-weight:700;color:#DC2626;">₹${sum.toLocaleString('en-IN')}</span>
          </div>
        `).join('');
      }
    }

    renderClaimsTable();
  } catch (err) {
    console.error('Claims load failed:', err);
    if (container) container.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  }
}

function renderClaimsTable() {
  const container = document.getElementById('claimsTableContainer');
  if (!container) return;

  const { moduleFilter, statusFilter, paidByFilter, selectedIds, allData } = window._claimsState;

  const filtered = allData.filter(item => {
    if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;
    
    if (paidByFilter !== 'all') {
      const p = (item.paidBy || '').toLowerCase();
      if (!p.includes(paidByFilter.toLowerCase())) return false;
    }

    if (item.module === 'advances' && statusFilter !== 'all') {
      if (statusFilter === 'received') return item.status === 'received';
      return item.status !== 'received';
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  let selCount = 0, selAmt = 0;
  filtered.forEach(item => {
    if (selectedIds.has(item.uniqKey)) {
      selCount++;
      selAmt += item.amount;
    }
  });
  const sc = document.getElementById('selectedCountText');
  const sa = document.getElementById('selectedAmountText');
  if (sc) sc.textContent = selCount + ' items';
  if (sa) sa.textContent = '₹' + selAmt.toLocaleString('en-IN');

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8;">
      No entries found.<br>
      <small>Module: ${moduleFilter}, Status: ${statusFilter}, Paid By: ${paidByFilter}</small>
    </div>`;
    return;
  }

  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.uniqKey));
  const getPath = p => {
    if (!p) return '';
    return p.includes('/id-proofs/') ? p.split('/id-proofs/')[1] : p;
  };

  let html = `
    <div style="margin-bottom:8px;font-size:12px;color:#64748B;">Showing <strong>${filtered.length}</strong> items</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#F1F5F9;border-bottom:2px solid #CBD5E1;text-align:left;">
          <th style="padding:10px;width:30px;"><input type="checkbox" ${allSelected ? 'checked' : ''} onchange="toggleSelectAllClaims(this.checked)"></th>
          <th style="padding:10px;">Module</th>
          <th style="padding:10px;">Date</th>
          <th style="padding:10px;">Description</th>
          <th style="padding:10px;">Vendor / Staff</th>
          <th style="padding:10px;">Paid By</th>
          <th style="padding:10px;text-align:right;">Amount (₹)</th>
          <th style="padding:10px;text-align:center;">Status</th>
          <th style="padding:10px;text-align:center;">Proof</th>
        </tr>
      </thead>
      <tbody>
  `;

  filtered.forEach(item => {
    const isChecked = selectedIds.has(item.uniqKey);
    const badge = claimsStatusBadge(item.status);
    const isNeg = item.amount < 0;
    html += `
      <tr style="border-bottom:1px solid #E2E8F0;background:${isChecked ? '#F0F9FF' : (isNeg ? '#FFF5F5' : '#fff')};">
        <td style="padding:10px;"><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleClaimSelect('${item.uniqKey}')"></td>
        <td style="padding:10px;">
          <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${isNeg ? '#FEE2E2' : '#F3E8FF'};color:${isNeg ? '#991B1B' : '#6B21A8'};">
            ${item.moduleLabel}
          </span>
        </td>
        <td style="padding:10px;white-space:nowrap;color:#64748B;">${item.dateStr}</td>
        <td style="padding:10px;font-weight:600;color:#1E293B;max-width:260px;">${item.description}</td>
        <td style="padding:10px;color:#334155;font-weight:600;">${item.vendorOrStaff}</td>
        <td style="padding:10px;color:#475569;">
          <span style="padding:2px 6px;background:#F1F5F9;border-radius:4px;font-weight:600;">👤 ${item.paidBy}</span>
        </td>
        <td style="padding:10px;text-align:right;font-weight:700;color:${isNeg ? '#DC2626' : '#0F172A'};">
          ${isNeg ? '-₹' + Math.abs(item.amount).toLocaleString('en-IN') : '₹' + item.amount.toLocaleString('en-IN')}
        </td>
        <td style="padding:10px;text-align:center;">
          <span style="padding:3px 8px;border-radius:12px;font-size:10px;font-weight:600;background:${badge.bg};color:${badge.color};">${badge.text}</span>
        </td>
        <td style="padding:10px;text-align:center;">
          ${item.photo ? `<button class="btn-sm" style="background:#3B82F6;color:#fff;padding:2px 6px;font-size:10px;" onclick="dlIdPhoto('${getPath(item.photo)}')">📸</button>` : '<span style="color:#94A3B8;">-</span>'}
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleClaimSelect(uniqKey) {
  if (window._claimsState.selectedIds.has(uniqKey)) window._claimsState.selectedIds.delete(uniqKey);
  else window._claimsState.selectedIds.add(uniqKey);
  renderClaimsTable();
}

function toggleSelectAllClaims(checked) {
  const { moduleFilter, statusFilter, paidByFilter, allData } = window._claimsState;
  const filtered = allData.filter(item => {
    if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;
    if (paidByFilter !== 'all' && !(item.paidBy || '').toLowerCase().includes(paidByFilter.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });
  filtered.forEach(item => {
    if (checked) window._claimsState.selectedIds.add(item.uniqKey);
    else window._claimsState.selectedIds.delete(item.uniqKey);
  });
  renderClaimsTable();
}

async function bulkUpdateClaims(targetStatus) {
  const { selectedIds, allData } = window._claimsState;
  if (selectedIds.size === 0) {
    alert('Please select at least 1 item.');
    return;
  }
  const items = allData.filter(i => selectedIds.has(i.uniqKey));
  if (!confirm(`Update ${items.length} items → "${targetStatus.toUpperCase()}"?`)) return;

  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);
  let ok = 0, fail = 0;

  for (const item of items) {
    let error = null;
    try {
      if (item.module === 'reimbursements') {
        let dbStatus = 'Pending';
        if (targetStatus === 'claimed') dbStatus = 'Claimed';
        if (targetStatus === 'received') dbStatus = 'Received';
        const upd = { status: dbStatus };
        if (targetStatus === 'claimed') { upd.claimed_date = todayDate; upd.claimed_at = nowIso; }
        if (targetStatus === 'received') { upd.received_date = todayDate; upd.received_at = nowIso; }
        if (targetStatus === 'unclaimed') { upd.claimed_date = null; upd.received_date = null; }
        const res = await sb.from('reimbursements').update(upd).eq('id', item.id);
        error = res.error;
      } else if (item.module === 'maintenance') {
        let dbStatus = targetStatus === 'unclaimed' ? 'not_claimed' : targetStatus;
        const res = await sb.from('maintenance_log').update({
          claim_status: dbStatus,
          claimed_at: targetStatus === 'claimed' ? nowIso : null,
          received_at: targetStatus === 'received' ? nowIso : null
        }).eq('id', item.id);
        error = res.error;
      } else if (item.module === 'laundry') {
        let dbStatus = targetStatus === 'unclaimed' ? 'not_claimed' : targetStatus;
        const res = await sb.from('laundry_payments').update({
          claim_status: dbStatus,
          claim_date: targetStatus === 'claimed' ? todayDate : (targetStatus === 'unclaimed' ? null : item.raw.claim_date),
          claimed_at: targetStatus === 'claimed' ? nowIso : null,
          claim_received_date: targetStatus === 'received' ? todayDate : null,
          received_at: targetStatus === 'received' ? nowIso : null
        }).eq('id', item.id);
        error = res.error;
      } else if (item.module === 'advances') {
        const isDed = targetStatus === 'received' ? true : false;
        const res = await sb.from('advance_tracker').update({
          is_deducted: isDed,
          repaid_date: targetStatus === 'received' ? todayDate : null
        }).eq('id', item.id);
        error = res.error;
      }
    } catch (e) {
      error = e;
    }
    if (error) { fail++; console.error(item.uniqKey, error); }
    else ok++;
  }

  if (window.fsn) fsn.success('Updated', `✅ ${ok} ok` + (fail ? `, ❌ ${fail} failed` : ''));
  else alert(`Updated: ${ok} ok` + (fail ? `, ${fail} failed` : ''));
  window._claimsState.selectedIds.clear();
  await loadClaimsData();
}

function getReportItems() {
  const { selectedIds, allData, statusFilter, moduleFilter, paidByFilter } = window._claimsState;
  if (selectedIds.size > 0) return allData.filter(i => selectedIds.has(i.uniqKey));
  return allData.filter(i => {
    if (moduleFilter !== 'all' && i.module !== moduleFilter) return false;
    if (paidByFilter !== 'all' && !(i.paidBy || '').toLowerCase().includes(paidByFilter.toLowerCase())) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });
}

function generateClaimReport() {
  const items = getReportItems();
  if (items.length === 0) { alert('No items to report.'); return; }

  let totalExpenses = 0, totalAdvances = 0;
  items.forEach(i => {
    if (i.amount < 0) totalAdvances += Math.abs(i.amount);
    else totalExpenses += i.amount;
  });
  const net = totalExpenses - totalAdvances;
  const { fromDate, fromTime, toDate, toTime, paidByFilter } = window._claimsState;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:24px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;font-family:sans-serif;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #0F172A;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <h2 style="margin:0;">📜 CLAIM SETTLEMENT STATEMENT</h2>
          <div style="font-size:12px;color:#64748B;">Payer: <strong>${paidByFilter.toUpperCase()}</strong> · Period: ${fromDate} ${fromTime} → ${toDate} ${toTime} · ${items.length} items</div>
        </div>
        <button onclick="this.closest('.modal-overlay').remove()" style="border:none;background:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
        <thead><tr style="background:#F1F5F9;">
          <th style="padding:8px;text-align:left;">Type</th>
          <th style="padding:8px;text-align:left;">Date</th>
          <th style="padding:8px;text-align:left;">Description</th>
          <th style="padding:8px;text-align:left;">Vendor / Staff</th>
          <th style="padding:8px;text-align:left;">Paid By</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr></thead>
        <tbody>
          ${items.map(i => `
            <tr style="border-bottom:1px solid #E2E8F0;">
              <td style="padding:8px;">${i.moduleLabel}</td>
              <td style="padding:8px;">${i.dateStr}</td>
              <td style="padding:8px;">${i.description}</td>
              <td style="padding:8px;">${i.vendorOrStaff}</td>
              <td style="padding:8px;">👤 ${i.paidBy}</td>
              <td style="padding:8px;text-align:right;font-weight:700;color:${i.amount < 0 ? '#DC2626' : '#000'};">
                ${i.amount < 0 ? '-₹' + Math.abs(i.amount).toLocaleString('en-IN') : '₹' + i.amount.toLocaleString('en-IN')}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;font-size:13px;">
        <div style="display:flex;justify-content:space-between;"><span>Total Expenses Paid by ${paidByFilter.toUpperCase()}:</span><strong>₹${totalExpenses.toLocaleString('en-IN')}</strong></div>
        <div style="display:flex;justify-content:space-between;color:#DC2626;"><span>Less Staff Advances Given:</span><strong>-₹${totalAdvances.toLocaleString('en-IN')}</strong></div>
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid #0F172A;font-size:16px;font-weight:800;">
          <span>NET AMOUNT DUE TO PAYER (${paidByFilter.toUpperCase()}):</span><span>₹${net.toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button onclick="window.print()" style="background:#0F172A;color:#fff;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;">🖨️ Print Statement</button>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:#64748B;color:#fff;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function copyClaimWhatsAppText() {
  const items = getReportItems();
  if (items.length === 0) { alert('No items.'); return; }
  let totalExpenses = 0, totalAdvances = 0, listText = '';
  items.forEach((i, idx) => {
    if (i.amount < 0) totalAdvances += Math.abs(i.amount);
    else totalExpenses += i.amount;
    listText += `${idx + 1}. *${i.moduleLabel}* (${i.dateStr})\n   ${i.description} → ₹${Math.abs(i.amount)}\n`;
  });
  const net = totalExpenses - totalAdvances;
  const { fromDate, toDate, paidByFilter } = window._claimsState;
  const text = `📋 *EXPENSE CLAIM STATEMENT (${paidByFilter.toUpperCase()})*\n📅 Period: ${fromDate} → ${toDate}\n\n*BREAKDOWN:*\n${listText}\n————————————\n🔹 Total Expenses Paid: ₹${totalExpenses}\n🔻 Staff Advances Given: -₹${totalAdvances}\n💵 *NET DUE TO PAYER: ₹${net}*\n————————————\n_Offline Airbnb Manager_`;
  navigator.clipboard.writeText(text).then(() => alert('✅ Copied! Paste in WhatsApp.'));
}

console.log('✅ Claims Manager v5 loaded (Advance Employee Names + Staff Advances Breakdown)');
