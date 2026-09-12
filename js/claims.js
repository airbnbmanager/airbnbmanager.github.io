/**
 * Universal Claims Manager (v8 MASTER FIXED)
 * Unique Haven Homes Stay
 */

window._claimsState = {
  fromDate: '2026-09-12',
  fromTime: '00:00',
  toDate: new Date().toISOString().slice(0, 10),
  toTime: '23:59',
  moduleFilter: 'all',
  statusFilter: 'unclaimed',
  paidByFilter: 'all',
  selectedIds: new Set(),
  allData: [],
  empMap: {}
};

// 1. Normalizers
function normalizePaymentSource(rawVal) {
  if (!rawVal) return 'UHHS-OD';
  const s = String(rawVal).trim().toUpperCase();
  if (s.includes('FIROZ')) return 'FIROZ';
  if (s.includes('COMPANY') && !s.includes('PRAVEEN') && !s.includes('OD')) return 'COMPANY';
  return 'UHHS-OD'; // Praveen, own_money, OD, UHHS -> UHHS-OD
}

function normalizeStatus(st) {
  if (!st) return 'unclaimed';
  const s = String(st).trim().toLowerCase();
  if (s === 'received' || s === 'settled' || s === 'reconciled') return 'received';
  if (s === 'claimed') return 'claimed';
  return 'unclaimed'; // pending, unclaimed -> unclaimed
}

// 2. Main Claims Manager Render
window.renderClaims = async function() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');

  renderShell(`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h1>⚖️ Universal Claims Manager</h1>
          <div class="sub">Checkpoint: <strong>11-Sep-2026 11:19 PM (Settled)</strong> · UHHS-OD Engine</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="openUhhsDepositModal()" style="background:#0284C7;color:#fff;font-weight:700;">📥 Deposit Entry (UHHS-OD)</button>
          <button onclick="showUhhsStatementModal()" style="background:#0F766E;color:#fff;font-weight:600;">📜 UHHS Ledger</button>
          <button onclick="generateClaimReport()" style="background:#8B5CF6;color:#fff;font-weight:600;">📊 Claim Report Statement</button>
          <button onclick="copyClaimWhatsAppText()" style="background:#25D366;color:#fff;font-weight:600;">📱 WhatsApp Summary</button>
        </div>
      </div>
    </div>

    <!-- UHHS-OD LIVE ACCOUNT BANNER -->
    <div class="card" style="background:#F0FDF4;border:1.5px solid #86EFAC;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="font-size:15px;color:#15803D;">🏦 UHHS-OD Account (Online Balance)</strong>
          <div style="font-size:11px;color:#64748B;">Money received online from Firoz & spent via UHHS-OD</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#64748B;">Running Balance</div>
          <div style="font-size:24px;font-weight:900;color:#15803D;" id="claims-od-banner-bal" class="claims-od-bal-value">₹0</div>
        </div>
      </div>
    </div>

    <!-- FILTERS BAR -->
    <div class="card" style="background:#F8FAFC;border:1px solid #E2E8F0;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#334155;">🔍 Filters</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">📅 FROM Date</label>
          <input id="cfFromDate" type="date" value="${window._claimsState.fromDate}" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">📅 TO Date</label>
          <input id="cfToDate" type="date" value="${window._claimsState.toDate}" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">👤 Paid By (Payer)</label>
          <select id="cfPaidBy" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
            <option value="all" ${window._claimsState.paidByFilter==='all'?'selected':''}>All Payers / Sources</option>
            <option value="UHHS-OD" ${window._claimsState.paidByFilter==='UHHS-OD'?'selected':''}>🏦 UHHS-OD Account</option>
            <option value="COMPANY" ${window._claimsState.paidByFilter==='COMPANY'?'selected':''}>🏢 COMPANY</option>
            <option value="FIROZ" ${window._claimsState.paidByFilter==='FIROZ'?'selected':''}>👤 FIROZ</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">📁 Module</label>
          <select id="cfModule" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
            <option value="all" ${window._claimsState.moduleFilter==='all'?'selected':''}>All Modules</option>
            <option value="reimbursements" ${window._claimsState.moduleFilter==='reimbursements'?'selected':''}>💸 Daily Expenses</option>
            <option value="maintenance" ${window._claimsState.moduleFilter==='maintenance'?'selected':''}>🔧 Maintenance</option>
            <option value="laundry" ${window._claimsState.moduleFilter==='laundry'?'selected':''}>🧺 Laundry</option>
            <option value="advances" ${window._claimsState.moduleFilter==='advances'?'selected':''}>💰 Staff Advances</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:#64748B;">🏷️ Status</label>
          <select id="cfStatus" onchange="updateClaimsFilter()" style="padding:6px;font-size:12px;width:100%;">
            <option value="unclaimed" ${window._claimsState.statusFilter==='unclaimed'?'selected':''}>⏳ Pending (unclaimed)</option>
            <option value="claimed" ${window._claimsState.statusFilter==='claimed'?'selected':''}>📤 Claimed (paisa lena baaki)</option>
            <option value="received" ${window._claimsState.statusFilter==='received'?'selected':''}>✅ Received (settled)</option>
            <option value="all" ${window._claimsState.statusFilter==='all'?'selected':''}>All Statuses</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px;">
        <button onclick="loadClaimsData()" style="background:#4F46E5;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">🔄 Refresh Data</button>
      </div>
    </div>

    <!-- SUMMARY CARDS -->
    <div class="card" id="claimsStatCards">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;">
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

    <!-- STAFF ADVANCES BREAKDOWN -->
    <div class="card" style="background:#FFF5F5;border:1px solid #FECDD3;">
      <div style="font-size:13px;font-weight:700;color:#991B1B;margin-bottom:8px;">👥 Staff Advances Breakdown</div>
      <div id="staffAdvancesBreakdownContainer" style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px;">
        <div style="color:#666;">Loading staff advances...</div>
      </div>
    </div>

    <!-- ACTIONS & TABLE -->
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
        <div style="text-align:center;padding:30px;color:#666;">Loading claims data...</div>
      </div>
    </div>
  `, 'claims');

  await loadClaimsData();
};

window.updateClaimsFilter = function() {
  const fD = document.getElementById('cfFromDate')?.value;
  const tD = document.getElementById('cfToDate')?.value;
  const mF = document.getElementById('cfModule')?.value;
  const sF = document.getElementById('cfStatus')?.value;
  const pF = document.getElementById('cfPaidBy')?.value;

  if (fD) window._claimsState.fromDate = fD;
  if (tD) window._claimsState.toDate = tD;
  if (mF) window._claimsState.moduleFilter = mF;
  if (sF) window._claimsState.statusFilter = sF;
  if (pF) window._claimsState.paidByFilter = pF;

  window._claimsState.selectedIds.clear();
  renderClaimsTable();
};

// 3. Load All Data & Apply Filters Dynamically
async function loadClaimsData() {
  const container = document.getElementById('claimsTableContainer');
  if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:#666;">Loading claims and advances data...</div>';

  try {
    const [{ data: eData }, { data: mData }, { data: lData }, { data: aData }, { data: empData }] = await Promise.all([
      sb.from('reimbursements').select('*').order('expense_date', { ascending: false }),
      sb.from('maintenance_log').select('*').gt('cost', 0).order('reported_date', { ascending: false }),
      sb.from('laundry_payments').select('*, laundry_records(vendor_name)').order('payment_date', { ascending: false }),
      sb.from('company_advances').select('*').order('created_at', { ascending: false }),
      sb.from('employees').select('emp_id, name')
    ]);

    const empMap = {};
    (empData || []).forEach(e => { if (e.emp_id) empMap[e.emp_id] = e.name; });
    window._claimsState.empMap = empMap;

    const combined = [];

    // A. Daily Expenses
    (eData || []).forEach(r => {
      combined.push({
        uniqKey: `reimb_${r.id}`,
        module: 'reimbursements',
        moduleLabel: '💸 Expense',
        id: r.id,
        dateStr: r.expense_date || (r.created_at || '').slice(0, 10),
        description: r.description || r.notes || 'Daily Expense',
        vendorOrStaff: r.paid_to || '-',
        paidBy: normalizePaymentSource(r.payment_source || r.paid_by),
        amount: Number(r.amount || 0),
        status: normalizeStatus(r.status),
        photo: r.receipt_photo,
        raw: r
      });
    });

    // B. Maintenance
    (mData || []).forEach(m => {
      combined.push({
        uniqKey: `maint_${m.id}`,
        module: 'maintenance',
        moduleLabel: '🔧 Maintenance',
        id: m.id,
        dateStr: m.reported_date || (m.created_at || '').slice(0, 10),
        description: `${m.issue_type || 'Repair'}: ${(m.description || '').slice(0, 80)}`,
        vendorOrStaff: m.vendor_name || m.assigned_to || '-',
        paidBy: normalizePaymentSource(m.payment_source || m.paid_by),
        amount: Number(m.cost || 0),
        status: normalizeStatus(m.claim_status || m.status),
        photo: m.payment_photo || m.photo_before,
        raw: m
      });
    });

    // C. Laundry
    (lData || []).forEach(lp => {
      const vName = lp.laundry_records?.vendor_name || 'Laundry Vendor';
      combined.push({
        uniqKey: `laundry_${lp.id}`,
        module: 'laundry',
        moduleLabel: '🧺 Laundry',
        id: lp.id,
        dateStr: lp.payment_date || (lp.created_at || '').slice(0, 10),
        description: `Laundry Payment (${vName})`,
        vendorOrStaff: vName,
        paidBy: normalizePaymentSource(lp.payment_source || lp.paid_by),
        amount: Number(lp.amount || 0),
        status: normalizeStatus(lp.claim_status),
        photo: lp.payment_photo || lp.bill_photo,
        raw: lp
      });
    });

    // D. Staff Advances
    (aData || []).forEach(adv => {
      const realName = empMap[adv.emp_id] || adv.given_to || 'Staff';
      const isDeducted = adv.status === 'Reconciled' || adv.is_deducted === true;
      const st = adv.claim_status || (isDeducted ? 'received' : 'unclaimed');
      const advAmt = Number(adv.amount_given || adv.advance_amount || 0);

      combined.push({
        uniqKey: `adv_${adv.id}`,
        module: 'advances',
        moduleLabel: '💰 Staff Advance',
        id: adv.id,
        dateStr: adv.advance_date || (adv.created_at || '').slice(0, 10),
        description: `Advance to ${realName}: ${adv.purpose || 'Given'}`,
        vendorOrStaff: realName,
        paidBy: normalizePaymentSource(adv.payment_source || adv.given_by),
        amount: advAmt,
        status: normalizeStatus(st),
        photo: null,
        raw: adv
      });
    });

    window._claimsState.allData = combined;

    // Trigger OD Top Banner Balance Calculation
    if (window.UHHSODManager) {
      const res = await window.UHHSODManager.calculateBalance(sb);
      const bEl = document.getElementById('claims-od-banner-bal');
      if (bEl) {
        bEl.innerText = `₹${res.balance.toLocaleString('en-IN')}`;
        bEl.style.color = res.balance >= 0 ? '#15803D' : '#DC2626';
      }
    }

    renderClaimsTable();
  } catch (err) {
    if (container) container.innerHTML = `<div style="color:#DC2626;padding:20px;text-align:center;">Error loading claims: ${err.message}</div>`;
  }
}

// 4. Render Table with Strict Real-time Filtering
function renderClaimsTable() {
  const container = document.getElementById('claimsTableContainer');
  if (!container) return;

  const { fromDate, toDate, moduleFilter, statusFilter, paidByFilter, selectedIds, allData, empMap } = window._claimsState;

  // Filter items strictly
  const filtered = (allData || []).filter(item => {
    // Date filter
    if (fromDate && item.dateStr < fromDate) return false;
    if (toDate && item.dateStr > toDate) return false;

    // Module filter
    if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;

    // PaidBy filter
    if (paidByFilter !== 'all' && item.paidBy !== paidByFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    return true;
  });

  // Calculate Summaries
  let totalExps = 0;
  let totalClaimed = 0;
  let totalAdvances = 0;
  const empAdvMap = {};

  filtered.forEach(item => {
    if (item.module === 'advances') {
      totalAdvances += item.amount;
      const staffName = item.vendorOrStaff || 'Staff';
      empAdvMap[staffName] = (empAdvMap[staffName] || 0) + item.amount;
    } else {
      totalExps += item.amount;
      if (item.status === 'claimed' || item.status === 'received') {
        totalClaimed += item.amount;
      }
    }
  });

  const netPayable = totalExps - totalAdvances;

  // Update Stat Cards UI
  document.getElementById('statTotalAmt').innerText = `₹${totalExps.toLocaleString('en-IN')}`;
  document.getElementById('statClaimedAmt').innerText = `₹${totalClaimed.toLocaleString('en-IN')}`;
  document.getElementById('statAdvancesAmt').innerText = `-₹${totalAdvances.toLocaleString('en-IN')}`;
  document.getElementById('statNetPayableAmt').innerText = `₹${netPayable.toLocaleString('en-IN')}`;

  // Update Staff Advances Breakdown Chips
  const advContainer = document.getElementById('staffAdvancesBreakdownContainer');
  if (advContainer) {
    const entries = Object.entries(empAdvMap);
    if (entries.length === 0) {
      advContainer.innerHTML = '<span style="color:#059669;font-weight:600;">✅ No staff advances in selected filter.</span>';
    } else {
      advContainer.innerHTML = entries.map(([name, amt]) => `
        <span style="background:#FFE4E6;color:#991B1B;padding:4px 10px;border-radius:6px;font-weight:700;">
          👤 ${name}: ₹${amt.toLocaleString('en-IN')}
        </span>
      `).join('');
    }
  }

  // Render Table HTML
  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#64748B;">No entries match the selected filters (Module: ${moduleFilter}, Status: ${statusFilter}, PaidBy: ${paidByFilter})</div>`;
    updateSelectionText();
    return;
  }

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#F1F5F9;text-align:left;">
          <th style="padding:10px;width:30px;"><input type="checkbox" onchange="toggleSelectAllClaims(this)" /></th>
          <th style="padding:10px;">MODULE</th>
          <th style="padding:10px;">DATE</th>
          <th style="padding:10px;">DESCRIPTION</th>
          <th style="padding:10px;">VENDOR / STAFF</th>
          <th style="padding:10px;">PAID BY</th>
          <th style="padding:10px;text-align:right;">AMOUNT (₹)</th>
          <th style="padding:10px;text-align:center;">STATUS</th>
          <th style="padding:10px;text-align:center;">PROOF</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(item => {
          const isChecked = selectedIds.has(item.uniqKey);
          const badgeClass = item.status === 'received' ? 'background:#DCFCE7;color:#15803D;' : item.status === 'claimed' ? 'background:#FEF3C7;color:#92400E;' : 'background:#FEE2E2;color:#B91C1C;';
          const badgeLabel = item.status === 'received' ? '✅ Settled' : item.status === 'claimed' ? '📤 Claimed' : '⏳ Pending';
          const sourceBadge = window.UHHSODManager ? UHHSODManager.getBadge(item.paidBy) : item.paidBy;

          return `
            <tr style="border-bottom:1px solid #E2E8F0;background:${isChecked ? '#EFF6FF' : '#fff'};">
              <td style="padding:10px;"><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSelectClaim('${item.uniqKey}')" /></td>
              <td style="padding:10px;font-weight:600;">${item.moduleLabel}</td>
              <td style="padding:10px;white-space:nowrap;">${item.dateStr}</td>
              <td style="padding:10px;max-width:220px;">${item.description}</td>
              <td style="padding:10px;">${item.vendorOrStaff}</td>
              <td style="padding:10px;">${sourceBadge}</td>
              <td style="padding:10px;text-align:right;font-weight:700;color:${item.module === 'advances' ? '#DC2626' : '#0F172A'};">
                ${item.module === 'advances' ? '-' : ''}₹${item.amount.toLocaleString('en-IN')}
              </td>
              <td style="padding:10px;text-align:center;">
                <span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;${badgeClass}">${badgeLabel}</span>
              </td>
              <td style="padding:10px;text-align:center;">
                ${item.photo ? `<button onclick="dlIdPhoto('${item.photo.includes('/id-proofs/') ? item.photo.split('/id-proofs/')[1] : item.photo}')" class="btn-sm" style="background:#3B82F6;color:#fff;padding:2px 6px;font-size:10px;">💳 View</button>` : '-'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  updateSelectionText();
}

// 5. Checkbox & Selection Helpers
window.toggleSelectClaim = function(uniqKey) {
  const { selectedIds } = window._claimsState;
  if (selectedIds.has(uniqKey)) selectedIds.delete(uniqKey);
  else selectedIds.add(uniqKey);
  renderClaimsTable();
};

window.toggleSelectAllClaims = function(masterCb) {
  const { allData, selectedIds } = window._claimsState;
  if (masterCb.checked) {
    allData.forEach(item => selectedIds.add(item.uniqKey));
  } else {
    selectedIds.clear();
  }
  renderClaimsTable();
};

function updateSelectionText() {
  const { selectedIds, allData } = window._claimsState;
  let selAmt = 0;
  allData.forEach(item => {
    if (selectedIds.has(item.uniqKey)) selAmt += item.amount;
  });

  const cEl = document.getElementById('selectedCountText');
  const aEl = document.getElementById('selectedAmountText');
  if (cEl) cEl.innerText = `${selectedIds.size} items`;
  if (aEl) aEl.innerText = `₹${selAmt.toLocaleString('en-IN')}`;
}

// 6. Bulk Action Handlers (Mark Claimed, Mark Received, Revert Pending)
window.bulkUpdateClaims = async function(targetStatus) {
  const { selectedIds, allData } = window._claimsState;
  if (selectedIds.size === 0) {
    alert('⚠️ Please select at least 1 item to update!');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  let updatedCount = 0;

  for (const item of allData) {
    if (selectedIds.has(item.uniqKey)) {
      if (item.module === 'reimbursements') {
        const dbStatus = targetStatus === 'received' ? 'Received' : targetStatus === 'claimed' ? 'Claimed' : 'Pending';
        await sb.from('reimbursements').update({ status: dbStatus, claimed_date: today }).eq('id', item.id);
        updatedCount++;
      } else if (item.module === 'maintenance') {
        await sb.from('maintenance_log').update({ claim_status: targetStatus, claim_date: today }).eq('id', item.id);
        updatedCount++;
      } else if (item.module === 'laundry') {
        await sb.from('laundry_payments').update({ claim_status: targetStatus, claim_date: today }).eq('id', item.id);
        updatedCount++;
      } else if (item.module === 'advances') {
        await sb.from('company_advances').update({ claim_status: targetStatus }).eq('id', item.id);
        updatedCount++;
      }
    }
  }

  selectedIds.clear();
  if (window.fsn) fsn.success('Updated', `✅ Updated status for ${updatedCount} items!`);
  await loadClaimsData();
};

// 7. UHHS Deposit Entry Modal & Ledger Popup
window.openUhhsDepositModal = function() {
  if (window.cbDepositToODModal) window.cbDepositToODModal();
};

window.showUhhsStatementModal = async function() {
  try {
    const { fromDate, toDate } = window._claimsState || {};
    const fDate = fromDate || '2026-09-12';
    const tDate = toDate || new Date().toISOString().slice(0, 10);

    const { data: deposits } = await sb.from('uhhs_od_account')
      .select('*')
      .gte('transaction_date', fDate)
      .lte('transaction_date', tDate)
      .order('transaction_date', { ascending: false });

    const [{ data: exps }, { data: maints }, { data: launds }, { data: allAdvs }] = await Promise.all([
      sb.from('reimbursements').select('*').gte('expense_date', fDate).lte('expense_date', tDate),
      sb.from('maintenance_log').select('*').gte('reported_date', fDate).lte('reported_date', tDate),
      sb.from('laundry_payments').select('*').gte('payment_date', fDate).lte('payment_date', tDate),
      sb.from('company_advances').select('*')
    ]);

    const txns = [];

    // Deposits (+)
    (deposits || []).forEach(d => {
      txns.push({
        date: d.transaction_date,
        type: 'DEPOSIT',
        desc: d.description || `Deposit from ${d.received_from || 'Firoz/Owner'}`,
        amount: Number(d.amount || 0),
        isDep: true
      });
    });

    // Daily Expenses (-)
    (exps || []).filter(e => normalizePaymentSource(e.payment_source || e.paid_by) === 'UHHS-OD').forEach(e => {
      txns.push({
        date: e.expense_date,
        type: 'EXPENSE',
        desc: `Daily Expense: ${e.category || ''} - ${e.description || ''}`,
        amount: Number(e.amount || 0),
        isDep: false
      });
    });

    // Maintenance (-)
    (maints || []).filter(m => normalizePaymentSource(m.payment_source) === 'UHHS-OD').forEach(m => {
      txns.push({
        date: m.reported_date,
        type: 'EXPENSE',
        desc: `Maintenance: ${m.issue_type || ''} - ${m.description || ''}`,
        amount: Number(m.cost || 0),
        isDep: false
      });
    });

    // Laundry (-)
    (launds || []).filter(l => normalizePaymentSource(l.payment_source) === 'UHHS-OD').forEach(l => {
      txns.push({
        date: l.payment_date,
        type: 'EXPENSE',
        desc: `Laundry: ${l.notes || ''}`,
        amount: Number(l.amount || 0),
        isDep: false
      });
    });

    // Staff Advances given from UHHS-OD (-)
    (allAdvs || []).filter(a => {
      const aDate = a.advance_date || (a.created_at || '').slice(0, 10);
      if (aDate < fDate || aDate > tDate) return false;
      return normalizePaymentSource(a.payment_source || a.given_by) === 'UHHS-OD';
    }).forEach(a => {
      txns.push({
        date: a.advance_date || a.created_at?.slice(0, 10),
        type: 'EXPENSE',
        desc: `💸 Staff Advance (${a.given_to || 'Staff'}): ${a.purpose || 'Given from OD'}`,
        amount: Number(a.amount_given || 0),
        isDep: false
      });
    });

    txns.sort((a, b) => new Date(b.date) - new Date(a.date));

    let totalInflow = txns.filter(t => t.isDep).reduce((s, t) => s + t.amount, 0);
    let totalOutflow = txns.filter(t => !t.isDep).reduce((s, t) => s + t.amount, 0);
    let netBalance = totalInflow - totalOutflow;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="background:#fff;border-radius:12px;padding:24px;max-width:800px;width:100%;max-height:85vh;overflow-y:auto;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:2px solid #eee;padding-bottom:10px;">
          <div>
            <h2 style="margin:0;color:#0F766E;">📜 UHHS-OD Account Statement / Ledger</h2>
            <div style="font-size:12px;color:#64748B;margin-top:2px;">Period: <strong>${fDate}</strong> → <strong>${tDate}</strong></div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.exportUhhsLedgerPDF('${fDate}', '${tDate}', ${totalInflow}, ${totalOutflow}, ${netBalance}, '${encodeURIComponent(JSON.stringify(txns))}')" style="padding:6px 14px;background:#0F172A;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">📄 Export PDF / Print</button>
            <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">✕</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
          <div style="padding:12px;background:#F0FDF4;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#166534;font-weight:700;">TOTAL DEPOSITED (+)</div>
            <div style="font-size:20px;font-weight:800;color:#059669;margin-top:2px;">₹${totalInflow.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:12px;background:#FEF2F2;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#991B1B;font-weight:700;">TOTAL SPENT (-)</div>
            <div style="font-size:20px;font-weight:800;color:#DC2626;margin-top:2px;">₹${totalOutflow.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:12px;background:${netBalance>=0?'#ECFDF5':'#FFF1F2'};border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:${netBalance>=0?'#065F46':'#9F1239'};font-weight:700;">NET RUNNING BALANCE</div>
            <div style="font-size:20px;font-weight:800;color:${netBalance>=0?'#059669':'#DC2626'};margin-top:2px;">₹${netBalance.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#F1F5F9;text-align:left;">
              <th style="padding:8px;">Date</th>
              <th style="padding:8px;">Type</th>
              <th style="padding:8px;">Description</th>
              <th style="padding:8px;text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${txns.length === 0 ? '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94A3B8;">No transactions found in selected period</td></tr>' : ''}
            ${txns.map(t => `
              <tr style="border-bottom:1px solid #E2E8F0;">
                <td style="padding:8px;">${t.date || '-'}</td>
                <td style="padding:8px;"><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${t.isDep?'#DCFCE7':'#FEE2E2'};color:${t.isDep?'#15803D':'#B91C1C'};">${t.isDep ? '📥 DEPOSIT' : '📤 EXPENSE'}</span></td>
                <td style="padding:8px;">${t.desc}</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:${t.isDep?'#15803D':'#B91C1C'};">${t.isDep ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (err) {
    alert('Error loading ledger: ' + err.message);
  }
};

window.exportUhhsLedgerPDF = function(fDate, tDate, totalInflow, totalOutflow, netBalance, txnsJson) {
  const txns = JSON.parse(decodeURIComponent(txnsJson));
  const printWin = window.open('', '_blank');
  
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UHHS-OD Ledger Statement (${fDate} to ${tDate})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
        .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 16px; }
        h1 { margin: 0; color: #0f766e; font-size: 20px; font-weight: 800; }
        .sub { color: #64748b; font-size: 11px; margin-top: 4px; }
        .cards { display: flex; gap: 10px; margin-bottom: 18px; }
        .card { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #cbd5e1; }
        .card-in { background: #f0fdf4; border-color: #86efac; }
        .card-out { background: #fef2f2; border-color: #fca5a5; }
        .card-bal { background: ${netBalance >= 0 ? '#ecfdf5' : '#fff1f2'}; border-color: ${netBalance >= 0 ? '#6ee7b7' : '#fecdd3'}; }
        .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .val { font-size: 18px; font-weight: 800; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
        td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
        .dep { background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
        .exp { background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📜 UHHS-OD Account Statement / Ledger</h1>
        <div class="sub">Period: <strong>${fDate}</strong> → <strong>${tDate}</strong> | Generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>

      <div class="cards">
        <div class="card card-in">
          <div class="lbl" style="color:#166534;">TOTAL DEPOSITED (+)</div>
          <div class="val" style="color:#059669;">₹${totalInflow.toLocaleString('en-IN')}</div>
        </div>
        <div class="card card-out">
          <div class="lbl" style="color:#991b1b;">TOTAL SPENT (-)</div>
          <div class="val" style="color:#dc2626;">₹${totalOutflow.toLocaleString('en-IN')}</div>
        </div>
        <div class="card card-bal">
          <div class="lbl" style="color:${netBalance>=0?'#065f46':'#9f1239'};">NET RUNNING BALANCE</div>
          <div class="val" style="color:${netBalance>=0?'#059669':'#dc2626'};">₹${netBalance.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th style="text-align:right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${txns.map(t => `
            <tr>
              <td>${t.date || '-'}</td>
              <td><span class="${t.isDep ? 'dep' : 'exp'}">${t.isDep ? '📥 DEPOSIT' : '📤 EXPENSE'}</span></td>
              <td>${t.desc}</td>
              <td style="text-align:right;font-weight:700;color:${t.isDep?'#15803d':'#b91c1c'};">${t.isDep ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWin.document.close();
};

console.log("✅ Claims Manager v8 MASTER LOADED!");