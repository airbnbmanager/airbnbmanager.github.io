/**
 * Universal Claims Manager (v8 MASTER FIXED)
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

window._claimsState = {
  fromDate: '2026-09-12',
  fromTime: '00:00',
  toDate: '2026-09-30',
  toTime: '23:59',
  moduleFilter: 'all',
  statusFilter: 'all',
  paidByFilter: 'all',
  selectedIds: new Set(),
  allData: [],
  empMap: {}
};

// 1. Normalizers
function normalizePaymentSource(rawVal) {
  if (!rawVal) return 'OTHER';
  const s = String(rawVal).trim().toUpperCase();
  if (s === 'FIROZ') return 'FIROZ';
  if (s === 'COMPANY') return 'COMPANY';
  if (s === 'UHHS-OD' || s === 'UHHS_OD' || s === 'UHHS OD') return 'UHHS-OD';
  return 'OTHER'; // legacy/unmapped values (own_money, split, company_advance, Shahenshah, etc.)
                   // — shown as OTHER instead of silently counted as UHHS-OD
}

function normalizeStatus(st) {
  if (!st) return 'unclaimed';
  const s = String(st).trim().toLowerCase();
  if (s === 'received' || s === 'settled' || s === 'reconciled') return 'received';
  if (s === 'claimed') return 'claimed';
  return 'unclaimed'; // pending, unclaimed -> unclaimed
}

// 2. Main Claims Manager Render
window.addEventListener('uhhs:dataChanged', () => {
  if (document.getElementById('claimsTableContainer') && typeof loadClaimsData === 'function') {
    loadClaimsData();
  }
});

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
            <option value="OTHER" ${window._claimsState.paidByFilter==='OTHER'?'selected':''}>⚠️ OTHER / Unmapped (old data)</option>
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
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:11px;font-weight:700;color:#64748B;">Quick Presets:</span>
          <button type="button" onclick="setClaimsQuickDate('2026-09-12', '2026-09-26')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📅 12-Sep to 26-Sep</button>
          <button type="button" onclick="setClaimsQuickDate('2026-09-01', '2026-09-30')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📅 Sep Full Month</button>
          <button type="button" onclick="setClaimsQuickDate('2026-09-12', '${new Date().toISOString().slice(0, 10)}')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📅 Checkpoint to Today</button>
          <button type="button" onclick="setClaimsQuickDate('', '')" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">🌐 All Dates</button>
        </div>
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
          <div id="statAdvancesAmt" style="font-size:20px;font-weight:800;color:#991B1B;">₹0</div>
          <div style="font-size:11px;color:#666;">👥 Staff Advances (included above)</div>
        </div>
        <div style="text-align:center;padding:12px;background:#D1FAE5;border-radius:8px;">
          <div id="statNetPayableAmt" style="font-size:20px;font-weight:800;color:#065F46;">₹0</div>
          <div style="font-size:11px;color:#666;">💵 NET PAYABLE TO PAYER (all modules)</div>
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

    <!-- ⚡ ONE-CLICK BULK ACTIONS FOR FILTERED RANGE -->
    <div class="card" style="background:linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);color:#fff;padding:16px 20px;border-radius:12px;box-shadow:0 4px 15px rgba(49,46,129,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#A5B4FC;font-weight:700;">⚡ Bulk Action on All Items in Filtered Range</div>
          <div style="font-size:16px;font-weight:800;margin-top:2px;">
            Range: <span id="bulkRangeLabel" style="color:#FDE047;">${window._claimsState.fromDate || 'All'} to ${window._claimsState.toDate || 'All'}</span>
            — <span id="bulkRangeCount" style="color:#67E8F9;">0</span> items (<span id="bulkRangePendingCount" style="color:#FCA5A5;">0 pending</span>) · Total: <span style="color:#86EFAC;">₹</span><span id="bulkRangeTotal" style="color:#86EFAC;">0</span>
          </div>
          <div style="font-size:11px;color:#C7D2FE;margin-top:2px;">Settle or claim all transactions matching the selected date range at once — no need to tick individual checkboxes!</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="bulkUpdateRange('claimed')" style="background:#F59E0B;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2);transition:0.2s;">
            📤 Claim All in Range
          </button>
          <button onclick="bulkUpdateRange('received')" style="background:#10B981;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2);transition:0.2s;">
            ✅ Settle All in Range
          </button>
        </div>
      </div>
    </div>

    <!-- SELECTION ACTIONS & TABLE -->
    <div class="card" style="padding:12px 20px;background:#EEF2FF;border:1px solid #C7D2FE;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div style="font-size:13px;color:#3730A3;">
          Selected via Checkboxes: <strong id="selectedCountText">0 items</strong> · 
          Payable: <strong id="selectedAmountText" style="font-size:16px;">₹0</strong>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="bulkUpdateClaims('claimed')" class="btn-sm" style="background:#F59E0B;color:#fff;padding:6px 12px;font-weight:600;">📤 Mark Claimed (Selected)</button>
          <button onclick="bulkUpdateClaims('received')" class="btn-sm" style="background:#10B981;color:#fff;padding:6px 12px;font-weight:600;">✅ Mark Settled (Selected)</button>
          <button onclick="bulkUpdateClaims('unclaimed')" class="btn-sm" style="background:#6B7280;color:#fff;padding:6px 12px;font-weight:600;">↩️ Revert Pending</button>
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

window.setClaimsQuickDate = function(f, t) {
  const fEl = document.getElementById('cfFromDate');
  const tEl = document.getElementById('cfToDate');
  if (fEl) fEl.value = f;
  if (tEl) tEl.value = t;
  window._claimsState.fromDate = f;
  window._claimsState.toDate = t;
  window._claimsState.statusFilter = 'all';
  const sEl = document.getElementById('cfStatus');
  if (sEl) sEl.value = 'all';
  window.updateClaimsFilter();
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
      sb.from('advance_tracker').select('*, employees(name)').order('date_given', { ascending: false }),
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

    // D. Staff Advances (from advance_tracker — the module actually used under Advance)
    (aData || []).forEach(adv => {
      const realName = adv.employees?.name || empMap[adv.emp_id] || 'Staff';
      const bal = Number(adv.advance_amount || 0) - Number(adv.repaid_amount || 0);
      const nStr = String(adv.notes || '');

      let st = 'unclaimed';
      if (adv.claim_status) {
        st = adv.claim_status;
      } else if (nStr.includes('[CLAIM: received]') || nStr.includes('[CLAIM: settled]') || adv.is_deducted || (Number(adv.repaid_amount || 0) >= Number(adv.advance_amount || 0) && Number(adv.advance_amount || 0) > 0)) {
        st = 'received';
      } else if (nStr.includes('[CLAIM: claimed]')) {
        st = 'claimed';
      } else if (bal <= 0) {
        st = 'received';
      }

      combined.push({
        uniqKey: `adv_${adv.id}`,
        module: 'advances',
        moduleLabel: '💰 Staff Advance',
        id: adv.id,
        dateStr: adv.date_given || (adv.created_at || '').slice(0, 10),
        description: `Advance to ${realName}: ${adv.reason || 'Given'}`,
        vendorOrStaff: realName,
        paidBy: normalizePaymentSource(adv.paid_by),
        amount: Number(adv.advance_amount || 0),
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

  window._claimsState.filteredKeys = filtered.map(item => item.uniqKey);

  // Calculate Summaries — Staff Advances are also paid FROM the UHHS-OD account
  // (just like expenses/maintenance/laundry), so they ADD to the claimable total,
  // they are never subtracted from it.
  let totalExps = 0;
  let totalClaimed = 0;
  let totalAdvances = 0;
  const empAdvMap = {};

  filtered.forEach(item => {
    totalExps += item.amount;
    if (item.status === 'claimed' || item.status === 'received') {
      totalClaimed += item.amount;
    }
    if (item.module === 'advances') {
      totalAdvances += item.amount;
      const staffName = item.vendorOrStaff || 'Staff';
      empAdvMap[staffName] = (empAdvMap[staffName] || 0) + item.amount;
    }
  });

  const netPayable = totalExps;

  // Update Stat Cards UI
  document.getElementById('statTotalAmt').innerText = `₹${totalExps.toLocaleString('en-IN')}`;
  document.getElementById('statClaimedAmt').innerText = `₹${totalClaimed.toLocaleString('en-IN')}`;
  document.getElementById('statAdvancesAmt').innerText = `₹${totalAdvances.toLocaleString('en-IN')}`;
  document.getElementById('statNetPayableAmt').innerText = `₹${netPayable.toLocaleString('en-IN')}`;

  // Update Bulk Banner Counters
  const rLabel = document.getElementById('bulkRangeLabel');
  const rCount = document.getElementById('bulkRangeCount');
  const rPendingCount = document.getElementById('bulkRangePendingCount');
  const rTotal = document.getElementById('bulkRangeTotal');
  const pendingCount = filtered.filter(i => i.status !== 'received').length;
  if (rLabel) rLabel.innerText = `${fromDate || 'All'} to ${toDate || 'All'}`;
  if (rCount) rCount.innerText = `${filtered.length}`;
  if (rPendingCount) rPendingCount.innerText = `${pendingCount} pending`;
  if (rTotal) rTotal.innerText = `${totalExps.toLocaleString('en-IN')}`;

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
          <th style="padding:10px;text-align:center;">ACTIONS</th>
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
              <td style="padding:10px;text-align:right;font-weight:700;color:#0F172A;">
                ₹${item.amount.toLocaleString('en-IN')}
              </td>
              <td style="padding:10px;text-align:center;">
                <span style="padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;${badgeClass}">${badgeLabel}</span>
              </td>
              <td style="padding:10px;text-align:center;">
                ${item.photo ? `<button onclick="dlIdPhoto('${item.photo.includes('/id-proofs/') ? item.photo.split('/id-proofs/')[1] : item.photo}')" class="btn-sm" style="background:#3B82F6;color:#fff;padding:2px 6px;font-size:10px;">💳 View</button>` : '-'}
              </td>
              <td style="padding:10px;text-align:center;white-space:nowrap;">
                ${item.status !== 'claimed' ? `
                  <button onclick="updateSingleClaim('${item.uniqKey}', 'claimed')" class="btn-sm" style="background:#F59E0B;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;margin-right:4px;" title="Mark as Claimed">📤 Claim</button>
                ` : ''}
                ${item.status !== 'received' ? `
                  <button onclick="updateSingleClaim('${item.uniqKey}', 'received')" class="btn-sm" style="background:#10B981;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;margin-right:4px;" title="Mark as Settled (Received)">✅ Settle</button>
                ` : ''}
                ${item.status !== 'unclaimed' ? `
                  <button onclick="updateSingleClaim('${item.uniqKey}', 'unclaimed')" class="btn-sm" style="background:#64748B;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;" title="Revert to Pending">↩️</button>
                ` : ''}
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
  const { selectedIds, filteredKeys } = window._claimsState;
  if (masterCb.checked) {
    (filteredKeys || []).forEach(k => selectedIds.add(k));
  } else {
    (filteredKeys || []).forEach(k => selectedIds.delete(k));
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

// 6. Universal Updater and Bulk Handlers (Mark Claimed, Mark Received, Revert Pending)
async function updateItemClaimStatus(item, targetStatus, today = new Date().toISOString().slice(0, 10)) {
  const nowIso = new Date().toISOString();

  if (item.module === 'reimbursements') {
    const dbStatus = targetStatus === 'received' ? 'Received' : targetStatus === 'claimed' ? 'Claimed' : 'Pending';
    const payload = { status: dbStatus };
    if (targetStatus === 'claimed') {
      payload.claimed_date = today;
      payload.claimed_at = nowIso;
    } else if (targetStatus === 'received') {
      payload.received_date = today;
      payload.received_at = nowIso;
    } else {
      payload.claimed_date = null;
      payload.received_date = null;
      payload.claimed_at = null;
      payload.received_at = null;
    }
    const { error } = await sb.from('reimbursements').update(payload).eq('id', item.id);
    if (error) throw error;
    return true;
  }

  if (item.module === 'maintenance') {
    const payload = { claim_status: targetStatus };
    if (targetStatus === 'claimed') payload.claimed_at = nowIso;
    else if (targetStatus === 'received') payload.received_at = nowIso;
    else { payload.claimed_at = null; payload.received_at = null; }

    const { error } = await sb.from('maintenance_log').update(payload).eq('id', item.id);
    if (error) throw error;
    return true;
  }

  if (item.module === 'laundry') {
    const dbStatus = targetStatus === 'unclaimed' ? 'not_claimed' : targetStatus;
    const payload = { claim_status: dbStatus };
    if (targetStatus === 'claimed') {
      payload.claim_date = today;
      payload.claimed_at = nowIso;
    } else if (targetStatus === 'received') {
      payload.claim_received_date = today;
      payload.received_at = nowIso;
    } else {
      payload.claim_date = null;
      payload.claim_received_date = null;
      payload.claimed_at = null;
      payload.received_at = null;
    }
    const { error } = await sb.from('laundry_payments').update(payload).eq('id', item.id);
    if (error) throw error;
    return true;
  }

  if (item.module === 'advances') {
    const oldNotes = (item.raw?.notes || '').replace(/\[CLAIM:\s*\w+\]/g, '').trim();
    if (targetStatus === 'received') {
      const newNotes = oldNotes ? `${oldNotes} [CLAIM: received]` : '[CLAIM: received]';
      const { error } = await sb.from('advance_tracker').update({
        is_deducted: true,
        repaid_amount: Number(item.amount || 0),
        repaid_date: today,
        notes: newNotes
      }).eq('id', item.id);
      if (error) throw error;
    } else if (targetStatus === 'claimed') {
      const newNotes = oldNotes ? `${oldNotes} [CLAIM: claimed]` : '[CLAIM: claimed]';
      const { error } = await sb.from('advance_tracker').update({
        notes: newNotes
      }).eq('id', item.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('advance_tracker').update({
        is_deducted: false,
        repaid_amount: 0,
        repaid_date: null,
        notes: oldNotes || null
      }).eq('id', item.id);
      if (error) throw error;
    }
    return true;
  }

  return false;
}

// Single-item action toggle
window.updateSingleClaim = async function(uniqKey, targetStatus) {
  const item = (window._claimsState.allData || []).find(i => i.uniqKey === uniqKey);
  if (!item) return;
  const label = targetStatus === 'received' ? 'Settled (Received)' : targetStatus === 'claimed' ? 'Claimed' : 'Pending';
  try {
    await updateItemClaimStatus(item, targetStatus);
    if (window.fsn?.success) {
      fsn.success('Updated', `✅ Item marked as ${label}!`);
    }
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    await loadClaimsData();
  } catch (err) {
    alert('❌ Error updating item: ' + err.message);
  }
};

// Checkbox selection action handler
window.bulkUpdateClaims = async function(targetStatus) {
  const { selectedIds, allData } = window._claimsState;
  if (selectedIds.size === 0) {
    alert('⚠️ Please select at least 1 item using checkboxes, or click "Claim All in Range" / "Settle All in Range" above to update the whole date range at once!');
    return;
  }

  const label = targetStatus === 'received' ? 'Settled (Received)' : targetStatus === 'claimed' ? 'Claimed' : 'Pending';
  const today = new Date().toISOString().slice(0, 10);
  let updatedCount = 0;
  let failCount = 0;

  for (const item of allData) {
    if (selectedIds.has(item.uniqKey)) {
      try {
        await updateItemClaimStatus(item, targetStatus, today);
        updatedCount++;
      } catch (err) {
        console.error('Error updating item:', item, err);
        failCount++;
      }
    }
  }

  selectedIds.clear();
  if (window.fsn?.success) {
    fsn.success('Updated', `✅ Updated status for ${updatedCount} selected items!`);
  } else {
    alert(`✅ Updated status for ${updatedCount} items!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
  }

  if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
  await loadClaimsData();
};

// ⚡ Range Bulk Updater (Claim All / Settle All across selected date range)
window.bulkUpdateRange = async function(targetStatus) {
  const { fromDate, toDate, allData, moduleFilter, paidByFilter } = window._claimsState;

  const matchingItems = (allData || []).filter(item => {
    if (fromDate && item.dateStr < fromDate) return false;
    if (toDate && item.dateStr > toDate) return false;
    if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;
    if (paidByFilter !== 'all' && item.paidBy !== paidByFilter) return false;
    return true;
  });

  if (matchingItems.length === 0) {
    alert(`⚠️ No transactions found matching the selected range (${fromDate || 'all'} to ${toDate || 'all'})!`);
    return;
  }

  const label = targetStatus === 'received' ? 'Settled (Received)' : targetStatus === 'claimed' ? 'Claimed' : 'Pending';
  const totalAmt = matchingItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const ok = confirm(
    `⚡ BULK ACTION CONFIRMATION\n\n` +
    `Mark ALL ${matchingItems.length} transactions in date range as "${label}"?\n\n` +
    `📅 Date Range: ${fromDate || 'Start'} to ${toDate || 'End'}\n` +
    `💰 Total Amount: ₹${totalAmt.toLocaleString('en-IN')}\n\n` +
    `Click OK to proceed with bulk update.`
  );
  if (!ok) return;

  const today = new Date().toISOString().slice(0, 10);
  let successCount = 0;
  let failCount = 0;

  const container = document.getElementById('claimsTableContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:50px 20px;">
        <div style="font-size:32px;margin-bottom:12px;">⏳</div>
        <h3 style="color:#312E81;margin:0 0 8px;font-size:18px;">Updating ${matchingItems.length} records to "${label}"...</h3>
        <p style="color:#64748B;font-size:13px;margin:0;">Please wait while the database records are safely updated.</p>
      </div>
    `;
  }

  for (const item of matchingItems) {
    try {
      await updateItemClaimStatus(item, targetStatus, today);
      successCount++;
    } catch (err) {
      console.error('Failed to update item in range:', item, err);
      failCount++;
    }
  }

  if (window._claimsState.selectedIds) window._claimsState.selectedIds.clear();

  if (window.fsn?.success) {
    fsn.success('Success', `✅ Successfully marked ${successCount} transactions as "${label}"!`);
  } else {
    alert(`✅ Successfully marked ${successCount} transactions as "${label}"!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
  }

  if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
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
      sb.from('advance_tracker').select('*, employees(name)')
    ]);

    const txns = [];

    // Deposits (+)
    (deposits || []).forEach(d => {
      txns.push({
        id: d.id,
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
        id: e.id,
        source: 'reimbursements',
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
      const aDate = a.date_given || (a.created_at || '').slice(0, 10);
      if (aDate < fDate || aDate > tDate) return false;
      return normalizePaymentSource(a.paid_by) === 'UHHS-OD';
    }).forEach(a => {
      const realName = a.employees?.name || 'Staff';
      txns.push({
        date: a.date_given || a.created_at?.slice(0, 10),
        type: 'EXPENSE',
        desc: `💸 Staff Advance (${realName}): ${a.reason || 'Given from OD'}`,
        amount: Number(a.advance_amount || 0),
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
              <th style="padding:8px;text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${txns.length === 0 ? '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94A3B8;">No transactions found in selected period</td></tr>' : ''}
            ${txns.map(t => `
              <tr style="border-bottom:1px solid #E2E8F0;">
                <td style="padding:8px;">${t.date || '-'}</td>
                <td style="padding:8px;"><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${t.isDep?'#DCFCE7':'#FEE2E2'};color:${t.isDep?'#15803D':'#B91C1C'};">${t.isDep ? '📥 DEPOSIT' : '📤 EXPENSE'}</span></td>
                <td style="padding:8px;">${t.desc}</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:${t.isDep?'#15803D':'#B91C1C'};">${t.isDep ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}</td>
                <td style="padding:8px;text-align:center;white-space:nowrap;">
                  ${t.isDep ? `
                    <button onclick="window.cbEditODDeposit('${t.id}')" class="btn-sm" style="background:#3B82F6;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;margin-right:4px;">✏️ Edit</button>
                    <button onclick="window.cbDeleteODDeposit('${t.id}')" class="btn-sm" style="background:#DC2626;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;">🗑️ Delete</button>
                  ` : (t.source === 'reimbursements' && t.id ? `
                    <button onclick="document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());window.editReimbursement('${t.id}');" class="btn-sm" style="background:#3B82F6;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;margin-right:4px;" title="Edit Daily Expense">✏️ Edit</button>
                    <button onclick="if(confirm('Delete this daily expense?')){window.deleteReimbursement('${t.id}');}" class="btn-sm" style="background:#DC2626;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;" title="Delete Daily Expense">🗑️ Delete</button>
                  ` : '<span style="color:#94A3B8;font-size:11px;">Auto</span>')}
                </td>
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