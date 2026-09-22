/**
 * Universal Claims Manager (v8 MASTER FIXED)
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

window._claimsState = {
  fromDate: '2026-09-17',
  fromTime: '00:00',
  toDate: '2026-09-30',
  toTime: '23:59',
  moduleFilter: 'all',
  statusFilter: 'all',
  paidByFilter: 'all',
  employeeFilter: 'all',
  selectedIds: new Set(),
  allData: [],
  allAdvs: [],
  empMap: {}
};

// 1. Normalizers
function normalizePaymentSource(rawVal) {
  if (!rawVal) return 'OTHER';
  const s = String(rawVal).trim().toUpperCase();
  if (s === 'FIROZ') return 'FIROZ';
  if (s === 'COMPANY') return 'COMPANY';
  if (s.includes('OD') || s.includes('UHHS') || s.includes('OVERDRAFT')) return 'UHHS-OD';
  return 'OTHER';
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
          <div class="sub">Checkpoint: <strong>16-Sep-2026 11:59 PM (Settled)</strong> · UHHS-OD Engine</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="openUhhsDepositModal()" style="background:#0284C7;color:#fff;font-weight:700;">📥 Deposit Entry (UHHS-OD)</button>
          <button onclick="showUhhsStatementModal()" style="background:#0F766E;color:#fff;font-weight:600;">📜 UHHS Ledger</button>
          <button onclick="showCompanyLedgerModal()" style="background:#7C3AED;color:#fff;font-weight:600;">🏢 Company Ledger</button>
          <button onclick="generateClaimReport()" style="background:#8B5CF6;color:#fff;font-weight:600;">📊 Claim Report Statement</button>
          <button onclick="copyClaimWhatsAppText()" style="background:#25D366;color:#fff;font-weight:600;">📱 WhatsApp Summary</button>
        </div>
      </div>
    </div>

    <!-- UHHS-OD LIVE ACCOUNT BANNER -->
    <div class="card" style="background:#F0FDF4;border:1.5px solid #86EFAC;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">🏦</span>
            <strong style="font-size:16px;color:#15803D;">UHHS-OD Account (Online Balance)</strong>
          </div>
          <div style="font-size:12px;color:#64748B;margin-top:2px;">
            Money received online from Firoz &amp; spent via UHHS-OD (Post-Checkpoint: 17-Sep onwards · Opening Balance: ₹0)
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
          <div style="text-align:right;">
            <div style="font-size:11px;color:#64748B;font-weight:700;">📥 TOTAL DEPOSITED</div>
            <div style="font-size:18px;font-weight:800;color:#059669;" id="claims-od-inflow">₹0</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#64748B;font-weight:700;">📤 TOTAL SPENT</div>
            <div style="font-size:18px;font-weight:800;color:#DC2626;" id="claims-od-outflow">₹0</div>
          </div>
          <div style="text-align:right;padding-left:14px;border-left:1.5px solid #CBD5E1;">
            <div style="font-size:11px;color:#64748B;font-weight:700;">NET RUNNING BALANCE</div>
            <div style="font-size:24px;font-weight:900;" id="claims-od-banner-bal" class="claims-od-bal-value">₹0</div>
          </div>
          <button onclick="openUhhsDepositModal()" style="padding:8px 14px;background:#10B981;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 2px 6px rgba(16,185,129,0.3);">
            📥 + Deposit Funds
          </button>
        </div>
      </div>
    </div>

    <!-- FILTERS BAR -->
    <div class="card" style="background:#F8FAFC;border:1px solid #E2E8F0;padding:14px;">
      <style>
        .claims-filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }
        .claims-filter-grid > div {
          min-width: 0;
          box-sizing: border-box;
        }
        .claims-filter-grid select,
        .claims-filter-grid input {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          padding: 7px 8px !important;
          font-size: 12px !important;
          border-radius: 6px !important;
          border: 1px solid #CBD5E1 !important;
          background: #fff !important;
        }
        @media (max-width: 640px) {
          .claims-filter-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .claims-filter-grid > div {
            width: 100% !important;
          }
        }
      </style>
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#334155;">🔍 Filters</div>
      <div class="claims-filter-grid">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">📅 FROM Date</label>
          <input id="cfFromDate" type="date" value="${window._claimsState.fromDate}" onchange="updateClaimsFilter()">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">📅 TO Date</label>
          <input id="cfToDate" type="date" value="${window._claimsState.toDate}" onchange="updateClaimsFilter()">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">👤 Paid By (Payer)</label>
          <select id="cfPaidBy" onchange="updateClaimsFilter()">
            <option value="all" ${window._claimsState.paidByFilter==='all'?'selected':''}>All Payers</option>
            <option value="UHHS-OD" ${window._claimsState.paidByFilter==='UHHS-OD'?'selected':''}>🏦 UHHS-OD</option>
            <option value="COMPANY" ${window._claimsState.paidByFilter==='COMPANY'?'selected':''}>🏢 COMPANY</option>
            <option value="FIROZ" ${window._claimsState.paidByFilter==='FIROZ'?'selected':''}>👤 FIROZ</option>
            <option value="OTHER" ${window._claimsState.paidByFilter==='OTHER'?'selected':''}>⚠️ OTHER</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">📁 Module</label>
          <select id="cfModule" onchange="updateClaimsFilter()">
            <option value="all" ${window._claimsState.moduleFilter==='all'?'selected':''}>All Modules</option>
            <option value="reimbursements" ${window._claimsState.moduleFilter==='reimbursements'?'selected':''}>💸 Daily Expenses</option>
            <option value="maintenance" ${window._claimsState.moduleFilter==='maintenance'?'selected':''}>🔧 Maintenance</option>
            <option value="laundry" ${window._claimsState.moduleFilter==='laundry'?'selected':''}>🧺 Laundry</option>
            <option value="advances" ${window._claimsState.moduleFilter==='advances'?'selected':''}>💰 Staff Advances</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">🏷️ Status</label>
          <select id="cfStatus" onchange="updateClaimsFilter()">
            <option value="unclaimed" ${window._claimsState.statusFilter==='unclaimed'?'selected':''}>⏳ Pending</option>
            <option value="claimed" ${window._claimsState.statusFilter==='claimed'?'selected':''}>📤 Claimed</option>
            <option value="received" ${window._claimsState.statusFilter==='received'?'selected':''}>✅ Settled</option>
            <option value="all" ${window._claimsState.statusFilter==='all'?'selected':''}>All Statuses</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:3px;">🧑‍💼 Staff / Employee</label>
          <select id="cfEmployee" onchange="updateClaimsFilter()">
            <option value="all">All Staff / Anyone</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:11px;font-weight:700;color:#64748B;">Quick Presets:</span>
          <button type="button" onclick="setClaimsQuickDate('2026-09-17', '2026-09-17')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">⚡ Today (17-Sep)</button>
          <button type="button" onclick="setClaimsQuickDate('2026-09-17', '${new Date().toISOString().slice(0, 10)}')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🏁 Checkpoint (17-Sep) to Today</button>
          <button type="button" onclick="setClaimsQuickDate('2026-09-12', '2026-09-16')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📅 12-Sep to 16-Sep (Settled)</button>
          <button type="button" onclick="setClaimsQuickDate('2026-09-01', '2026-09-30')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📅 Sep Full Month</button>
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
          <div style="font-size:11px;color:#666;" id="statNetPayableLabel">💵 Pending to Settle (Unpaid)</div>
        </div>
      </div>
    </div>

    <!-- STAFF ADVANCES BREAKDOWN -->
    <div class="card" style="background:#FFF5F5;border:1.5px solid #FECDD3;padding:14px;border-radius:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:800;color:#991B1B;">👥 Staff Advances Breakdown &amp; Analysis</div>
        <button type="button" onclick="window.showEmployeeAdvanceAnalysisModal()" style="background:#B91C1C;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 4px rgba(185,28,28,0.3);">
          🔍 Detailed Advance Analysis (Total, Monthly &amp; Range)
        </button>
      </div>
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
  const eF = document.getElementById('cfEmployee')?.value;

  if (fD) window._claimsState.fromDate = fD;
  if (tD) window._claimsState.toDate = tD;
  if (mF) window._claimsState.moduleFilter = mF;
  if (sF) window._claimsState.statusFilter = sF;
  if (pF) window._claimsState.paidByFilter = pF;
  if (eF) window._claimsState.employeeFilter = eF;

  window._claimsState.selectedIds.clear();
  renderClaimsTable();

  // Sync OD Top Banner to match active date range
  if (window.UHHSODManager) {
    window.UHHSODManager.calculateBalance(sb, window._claimsState.fromDate, window._claimsState.toDate);
  }
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
      sb.from('employees').select('emp_id, name').order('name')
    ]);

    const empMap = {};
    (empData || []).forEach(e => { if (e.emp_id) empMap[e.emp_id] = e.name; });
    window._claimsState.empMap = empMap;
    window._claimsState.empList = empData || [];
    window._claimsState.allAdvs = aData || [];

    // Populate Employee select dropdown if element exists
    const empSelect = document.getElementById('cfEmployee');
    if (empSelect) {
      const currEmp = window._claimsState.employeeFilter || 'all';
      empSelect.innerHTML = `<option value="all">All Staff / Anyone</option>` +
        (empData || []).map(e => `<option value="${e.name}" ${currEmp === e.name ? 'selected' : ''}>👤 ${e.name}</option>`).join('');
    }

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
        staffName: r.paid_to || '-',
        empId: r.created_by,
        paidBy: normalizePaymentSource(r.payment_source || r.paid_by),
        amount: Number(r.amount || 0),
        status: normalizeStatus(r.status),
        photo: r.receipt_photo,
        raw: r
      });
    });

    // B. Maintenance
    (mData || []).forEach(m => {
      const staffName = empMap[m.assigned_to] || m.assigned_to || m.vendor_name || '-';
      combined.push({
        uniqKey: `maint_${m.id}`,
        module: 'maintenance',
        moduleLabel: '🔧 Maintenance',
        id: m.id,
        dateStr: m.reported_date || (m.created_at || '').slice(0, 10),
        description: `${m.issue_type || 'Repair'}: ${(m.description || '').slice(0, 80)}`,
        vendorOrStaff: m.vendor_name || staffName,
        staffName: staffName,
        empId: m.assigned_to,
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
        staffName: vName,
        empId: null,
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
        staffName: realName,
        empId: adv.emp_id,
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
      await window.UHHSODManager.calculateBalance(sb, window._claimsState?.fromDate, window._claimsState?.toDate);
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

  const { fromDate, toDate, moduleFilter, statusFilter, paidByFilter, employeeFilter, selectedIds, allData, empMap } = window._claimsState;

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

    // Employee filter
    if (employeeFilter && employeeFilter !== 'all') {
      const matchEmp = (item.staffName === employeeFilter) ||
                       (item.vendorOrStaff === employeeFilter) ||
                       (item.empId === employeeFilter) ||
                       (empMap[item.empId] === employeeFilter);
      if (!matchEmp) return false;
    }

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

  const pendingPayable = Math.max(0, totalExps - totalClaimed);

  // Update Stat Cards UI
  document.getElementById('statTotalAmt').innerText = `₹${totalExps.toLocaleString('en-IN')}`;
  document.getElementById('statClaimedAmt').innerText = `₹${totalClaimed.toLocaleString('en-IN')}`;
  document.getElementById('statAdvancesAmt').innerText = `₹${totalAdvances.toLocaleString('en-IN')}`;
  const netEl = document.getElementById('statNetPayableAmt');
  if (netEl) {
    if (pendingPayable === 0) {
      netEl.innerHTML = `<span style="color:#059669;">₹0 (All Settled)</span>`;
    } else {
      netEl.innerText = `₹${pendingPayable.toLocaleString('en-IN')}`;
      netEl.style.color = '#B45309';
    }
  }

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
        <span onclick="window.showEmployeeAdvanceAnalysisModal('${name.replace(/'/g, "\\'")}')" style="background:#FFE4E6;color:#991B1B;padding:6px 12px;border-radius:6px;font-weight:700;cursor:pointer;border:1px solid #FDA4AF;transition:0.15s;display:inline-flex;align-items:center;gap:5px;" title="Click to view Total, Monthly & Between-dates breakdown for ${name}">
          👤 ${name}: ₹${amt.toLocaleString('en-IN')} <span style="font-size:10px;opacity:0.8;">📊 Click</span>
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

window.closeUhhsStatementModal = function() {
  const m = document.getElementById('uhhsLedgerModalOverlay');
  if (m) m.remove();
};

window.showUhhsStatementModal = async function() {
  try {
    const { fromDate, toDate } = window._claimsState || {};
    const fDate = fromDate || '2026-09-17';
    const tDate = toDate || new Date().toISOString().slice(0, 10);

    let ledger = null;
    if (window.UHHSODManager && window.UHHSODManager.getLedgerData) {
      ledger = await window.UHHSODManager.getLedgerData(sb, fDate, tDate);
    }

    const txns = ledger ? (ledger.txns || []) : [];
    const totalInflow = ledger ? Number(ledger.totalInflow || 0) : 0;
    const totalOutflow = ledger ? Number(ledger.totalOutflow || 0) : 0;
    const netBalance = ledger ? Number(ledger.netBalance || 0) : 0;

    // Immediately synchronize Claims Manager Top Banner with exact same numbers
    const bEl = document.getElementById('claims-od-banner-bal');
    if (bEl) {
      const prefix = netBalance < 0 ? '-₹' : '₹';
      const absVal = Math.abs(netBalance).toLocaleString('en-IN');
      bEl.innerText = `${prefix}${absVal}`;
      bEl.style.color = netBalance >= 0 ? '#15803D' : '#DC2626';
    }
    const inEl = document.getElementById('claims-od-inflow');
    if (inEl) inEl.innerText = `₹${totalInflow.toLocaleString('en-IN')}`;
    const outEl = document.getElementById('claims-od-outflow');
    if (outEl) outEl.innerText = `₹${totalOutflow.toLocaleString('en-IN')}`;

    // Remove any existing instance
    window.closeUhhsStatementModal();

    const modal = document.createElement('div');
    modal.id = 'uhhsLedgerModalOverlay';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:80000;padding:12px;box-sizing:border-box;backdrop-filter:blur(2px);';
    modal.onclick = e => { if (e.target === modal) window.closeUhhsStatementModal(); };

    window._currentUhhsStatementData = { fDate, tDate, totalInflow, totalOutflow, netBalance, txns };

    modal.innerHTML = `
      <div class="modal-box" style="background:#fff;border-radius:12px;width:100%;max-width:850px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.35);margin:auto;" onclick="event.stopPropagation()">
        <!-- STICKY HEADER -->
        <div style="padding:14px 18px;border-bottom:1.5px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:#F8FAFC;">
          <div>
            <h2 style="margin:0;color:#0F766E;font-size:17px;font-weight:800;display:flex;align-items:center;gap:6px;">
              📜 UHHS-OD Account Statement / Ledger
            </h2>
            <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
              Period: <strong>${fDate}</strong> → <strong>${tDate}</strong> · Total Transactions: <strong>${txns.length}</strong>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button onclick="openUhhsDepositModal()" style="padding:6px 12px;background:#10B981;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;">📥 + Add Deposit</button>
            <button onclick="window.exportUhhsLedgerPDF()" style="padding:6px 12px;background:#0F172A;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;">📄 Export PDF</button>
            <button onclick="window.closeUhhsStatementModal()" style="background:#EF4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:800;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 3px rgba(239,68,68,0.3);">✕ Close</button>
          </div>
        </div>

        <!-- SCROLLABLE BODY -->
        <div style="padding:14px 18px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;flex:1;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-bottom:14px;">
            <div style="padding:10px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;text-align:center;">
              <div style="font-size:10px;color:#166534;font-weight:700;">TOTAL DEPOSITED (+)</div>
              <div style="font-size:18px;font-weight:800;color:#059669;margin-top:2px;">₹${totalInflow.toLocaleString('en-IN')}</div>
            </div>
            <div style="padding:10px;background:#FEF2F2;border:1px solid #FECDD3;border-radius:8px;text-align:center;">
              <div style="font-size:10px;color:#991B1B;font-weight:700;">TOTAL SPENT (-)</div>
              <div style="font-size:18px;font-weight:800;color:#DC2626;margin-top:2px;">₹${totalOutflow.toLocaleString('en-IN')}</div>
            </div>
            <div style="padding:10px;background:${netBalance>=0?'#ECFDF5':'#FFF1F2'};border:1px solid ${netBalance>=0?'#A7F3D0':'#FDA4AF'};border-radius:8px;text-align:center;">
              <div style="font-size:10px;color:${netBalance>=0?'#065F46':'#9F1239'};font-weight:700;">NET RUNNING BALANCE</div>
              <div style="font-size:18px;font-weight:800;color:${netBalance>=0?'#059669':'#DC2626'};margin-top:2px;">₹${netBalance.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:540px;">
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
                ${txns.length === 0 ? '<tr><td colspan="5" style="padding:24px;text-align:center;color:#94A3B8;">No transactions found in selected period</td></tr>' : ''}
                ${txns.map(t => `
                  <tr style="border-bottom:1px solid #E2E8F0;">
                    <td style="padding:8px;white-space:nowrap;">${t.date || '-'}</td>
                    <td style="padding:8px;"><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${t.isDep?'#DCFCE7':'#FEE2E2'};color:${t.isDep?'#15803D':'#B91C1C'};">${t.isDep ? '📥 DEPOSIT' : '📤 EXPENSE'}</span></td>
                    <td style="padding:8px;">${t.desc}</td>
                    <td style="padding:8px;text-align:right;font-weight:700;color:${t.isDep?'#15803D':'#B91C1C'};white-space:nowrap;">${t.isDep ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:center;white-space:nowrap;">
                      ${t.isDep ? `
                        <button onclick="window.cbEditODDeposit('${t.id}')" class="btn-sm" style="background:#3B82F6;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;margin-right:4px;">✏️ Edit</button>
                        <button onclick="window.cbDeleteODDeposit('${t.id}')" class="btn-sm" style="background:#DC2626;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;">🗑️ Delete</button>
                      ` : (t.source === 'reimbursements' && t.id ? `
                        <button onclick="window.openReimbursementEditModal('${t.id}')" class="btn-sm" style="background:#3B82F6;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;margin-right:4px;" title="Edit Daily Expense">✏️ Edit</button>
                        <button onclick="window.deleteReimbursementFromLedger('${t.id}')" class="btn-sm" style="background:#DC2626;color:#fff;padding:3px 8px;font-size:10px;border:none;border-radius:4px;cursor:pointer;" title="Delete Daily Expense">🗑️ Delete</button>
                      ` : '<span style="color:#94A3B8;font-size:11px;">Auto</span>')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- STICKY FOOTER -->
        <div style="padding:10px 18px;border-top:1px solid #E2E8F0;background:#F8FAFC;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="font-size:12px;color:#64748B;">
            Period Net Balance: <strong style="color:${netBalance>=0?'#059669':'#DC2626'};">₹${netBalance.toLocaleString('en-IN')}</strong>
          </div>
          <button type="button" onclick="window.closeUhhsStatementModal()" style="background:#64748B;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">
            ✕ Close Ledger
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Escape key handler
    const escHandler = e => {
      if (e.key === 'Escape') {
        window.closeUhhsStatementModal();
        window.removeEventListener('keydown', escHandler);
      }
    };
    window.addEventListener('keydown', escHandler);
  } catch (err) {
    alert('Error loading ledger: ' + err.message);
  }
};

// 7b. In-Place Daily Expense Edit Modal for Ledger (z-index 9999999 so it never appears in background)
window.openReimbursementEditModal = async function(id) {
  const oldModal = document.getElementById('reimbEditModalOverlay');
  if (oldModal) oldModal.remove();

  try {
    const { data: rec, error } = await sb.from('reimbursements').select('*').eq('id', id).single();
    if (error || !rec) {
      alert('❌ Expense record not found!');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'reimbEditModalOverlay';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999999;padding:16px;box-sizing:border-box;backdrop-filter:blur(3px);';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="background:#fff;border-radius:12px;padding:22px;max-width:480px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,0.25);" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #eee;padding-bottom:10px;">
          <h3 style="margin:0;font-size:17px;color:#1E293B;font-weight:800;display:flex;align-items:center;gap:6px;">
            ✏️ Edit Daily Expense (ID: ${rec.id})
          </h3>
          <button onclick="document.getElementById('reimbEditModalOverlay')?.remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;">✕</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <label style="font-weight:600;font-size:12px;display:block;margin-bottom:4px;">Date *</label>
            <input id="ledgerEditDate" type="date" value="${rec.expense_date || ''}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-weight:600;font-size:12px;display:block;margin-bottom:4px;">Amount (₹) *</label>
            <input id="ledgerEditAmt" type="number" min="1" value="${rec.amount || ''}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:15px;font-weight:700;box-sizing:border-box;">
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label style="font-weight:600;font-size:12px;display:block;margin-bottom:4px;">Category *</label>
          <select id="ledgerEditCat" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
            ${['🛒 Grocery/Food', '🧹 Cleaning Supplies', '🚚 Delivery/Transport', '💡 Utilities', '🎁 Guest Requests', '📦 Other'].map(c =>
              `<option value="${c}" ${(rec.category || '').includes(c.slice(2).trim()) ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>

        <div style="margin-bottom:12px;">
          <label style="font-weight:600;font-size:12px;display:block;margin-bottom:4px;">Description / Item Name *</label>
          <input id="ledgerEditDesc" type="text" value="${(rec.description || '').replace(/"/g, '&quot;')}" placeholder="e.g. CNG, Breakfast, Groceries" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-weight:700;font-size:12.5px;color:#0F172A;display:block;margin-bottom:4px;">💳 Payment Account / Source *</label>
          <select id="ledgerEditSource" style="width:100%;padding:8px;border:1.5px solid #0D6EFD;border-radius:6px;font-weight:600;background:#F8FAFC;box-sizing:border-box;">
            <option value="UHHS-OD" ${rec.payment_source === 'UHHS-OD' || !rec.payment_source ? 'selected' : ''}>🏦 UHHS-OD (Overdraft Account)</option>
            <option value="COMPANY" ${rec.payment_source === 'COMPANY' ? 'selected' : ''}>🏢 COMPANY (Guest Rent / Cash in Hand)</option>
            <option value="FIROZ" ${rec.payment_source === 'FIROZ' ? 'selected' : ''}>👤 FIROZ (Direct Personal)</option>
          </select>
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-weight:600;font-size:12px;display:block;margin-bottom:4px;">Notes / Remarks</label>
          <input id="ledgerEditNotes" type="text" value="${(rec.notes || '').replace(/"/g, '&quot;')}" placeholder="Optional notes" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        </div>

        <div style="display:flex;gap:10px;">
          <button id="btnSaveLedgerEdit" onclick="window.saveReimbursementFromLedger('${rec.id}')" style="flex:2;padding:11px;background:#10B981;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
            💾 Save Expense Changes
          </button>
          <button onclick="document.getElementById('reimbEditModalOverlay')?.remove()" style="flex:1;padding:11px;background:#64748B;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
            Cancel
          </button>
        </div>
        <div id="ledgerEditErr" style="margin-top:10px;color:#DC2626;font-size:12px;font-weight:600;text-align:center;"></div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (e) {
    alert('Error loading expense: ' + e.message);
  }
};

window.saveReimbursementFromLedger = async function(id) {
  const btn = document.getElementById('btnSaveLedgerEdit');
  const errEl = document.getElementById('ledgerEditErr');
  const date = document.getElementById('ledgerEditDate')?.value;
  const amt = parseFloat(document.getElementById('ledgerEditAmt')?.value) || 0;
  const cat = document.getElementById('ledgerEditCat')?.value;
  const desc = document.getElementById('ledgerEditDesc')?.value?.trim();
  const paymentSource = document.getElementById('ledgerEditSource')?.value || 'UHHS-OD';
  const notes = document.getElementById('ledgerEditNotes')?.value?.trim();

  if (!date || amt <= 0 || !desc) {
    if (errEl) errEl.innerText = '⚠️ Please fill date, positive amount, and description!';
    return;
  }

  if (btn) { btn.disabled = true; btn.innerText = '⏳ Saving...'; }

  try {
    const { error } = await sb.from('reimbursements').update({
      expense_date: date,
      amount: amt,
      category: cat,
      description: desc,
      payment_source: paymentSource,
      notes: notes
    }).eq('id', id);

    if (error) throw error;

    document.getElementById('reimbEditModalOverlay')?.remove();
    if (window.fsn?.success) fsn.success('Saved', '✅ Expense updated!');
    else alert('✅ Expense updated!');

    // Refresh UI seamlessly
    if (typeof window.showUhhsStatementModal === 'function') window.showUhhsStatementModal();
    if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
    if (window.UHHSODManager) window.UHHSODManager.calculateBalance(sb);
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
  } catch (err) {
    if (errEl) errEl.innerText = '❌ ' + err.message;
    if (btn) { btn.disabled = false; btn.innerText = '💾 Save Expense Changes'; }
  }
};

window.deleteReimbursementFromLedger = async function(id) {
  if (!confirm('🗑️ Are you sure you want to delete this daily expense record?')) return;
  try {
    const { error } = await sb.from('reimbursements').delete().eq('id', id);
    if (error) throw error;

    if (window.fsn?.success) fsn.success('Deleted', '✅ Expense deleted!');
    else alert('✅ Expense deleted!');

    // Refresh UI
    if (typeof window.showUhhsStatementModal === 'function') window.showUhhsStatementModal();
    if (typeof window.loadClaimsData === 'function') window.loadClaimsData();
    if (window.UHHSODManager) window.UHHSODManager.calculateBalance(sb);
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
  } catch (err) {
    alert('❌ Error deleting expense: ' + err.message);
  }
};

// ══════════════════════════════════════════════════════════════════
// 8. INTERACTIVE EMPLOYEE ADVANCE ANALYSIS MODAL (TOTAL, MONTHLY & BETWEEN)
// ══════════════════════════════════════════════════════════════════
window.closeEmployeeAdvanceModal = function() {
  const m = document.getElementById('empAdvModalOverlay');
  if (m) m.remove();
};

window.showEmployeeAdvanceAnalysisModal = async function(preselectedEmp = null) {
  try {
    let allAdvs = window._claimsState.allAdvs || [];
    let empList = window._claimsState.empList || [];

    // If not loaded yet, fetch from supabase
    if (allAdvs.length === 0 || empList.length === 0) {
      const [{ data: aData }, { data: eData }] = await Promise.all([
        sb.from('advance_tracker').select('*, employees(name)').order('date_given', { ascending: false }),
        sb.from('employees').select('emp_id, name').order('name')
      ]);
      allAdvs = aData || [];
      empList = eData || [];
      window._claimsState.allAdvs = allAdvs;
      window._claimsState.empList = empList;
    }

    const modal = document.createElement('div');
    modal.id = 'empAdvModalOverlay';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:999999;padding:12px;box-sizing:border-box;backdrop-filter:blur(2px);';
    modal.onclick = e => { if (e.target === modal) window.closeEmployeeAdvanceModal(); };

    // Default dates from current filter state or current month
    const curFrom = window._claimsState.fromDate || new Date().toISOString().slice(0, 7) + '-01';
    const curTo = window._claimsState.toDate || new Date().toISOString().slice(0, 10);
    const curMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    modal.innerHTML = `
      <div class="modal-box" style="background:#fff;border-radius:12px;width:100%;max-width:850px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.35);margin:auto;" onclick="event.stopPropagation()">
        <!-- STICKY HEADER -->
        <div style="padding:14px 18px;border-bottom:1.5px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:#FFF5F5;">
          <div>
            <h2 style="margin:0;color:#991B1B;font-size:17px;font-weight:800;display:flex;align-items:center;gap:6px;">
              👥 Employee Advance Tracker &amp; Analysis
            </h2>
            <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
              Total, Monthly, and Between-Dates breakdown for staff advances
            </div>
          </div>
          <button type="button" onclick="window.closeEmployeeAdvanceModal()" style="background:#EF4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:800;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 3px rgba(239,68,68,0.3);">
            ✕ Close
          </button>
        </div>

        <!-- CONTROLS: EMPLOYEE & BETWEEN DATES -->
        <div style="padding:12px 18px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;align-items:end;">
            <div>
              <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">👤 Select Employee</label>
              <select id="modalAdvEmp" onchange="updateEmpAdvModalView()" style="width:100%;padding:7px 8px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;background:#fff;">
                <option value="all">👥 All Employees (Entire Staff)</option>
                ${(empList || []).map(e => `<option value="${e.name}" ${preselectedEmp === e.name ? 'selected' : ''}>👤 ${e.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">📅 Between: From Date</label>
              <input id="modalAdvFrom" type="date" value="${curFrom}" onchange="updateEmpAdvModalView()" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">📅 Between: To Date</label>
              <input id="modalAdvTo" type="date" value="${curTo}" onchange="updateEmpAdvModalView()" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;box-sizing:border-box;">
            </div>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:10.5px;color:#64748B;font-weight:700;">Quick Date Range:</span>
            <button type="button" onclick="setModalAdvRange('${curMonth}-01', '${curTo}')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">📅 This Month (${curMonth})</button>
            <button type="button" onclick="setModalAdvRange('2026-09-17', '${curTo}')" style="background:#E0E7FF;color:#3730A3;border:1px solid #C7D2FE;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">⚡ Post-Checkpoint (17-Sep Onwards)</button>
            <button type="button" onclick="setModalAdvRange('', '')" style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">🌐 All Time</button>
          </div>
        </div>

        <!-- DYNAMIC STATS & TABLE CONTENT -->
        <div id="modalAdvDynamicContent" style="padding:14px 18px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;flex:1;">
          <!-- Rendered by updateEmpAdvModalView -->
        </div>

        <!-- FOOTER -->
        <div style="padding:10px 18px;border-top:1px solid #E2E8F0;background:#F8FAFC;display:flex;justify-content:flex-end;">
          <button type="button" onclick="window.closeEmployeeAdvanceModal()" style="background:#64748B;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">
            ✕ Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    window.setModalAdvRange = function(f, t) {
      const fEl = document.getElementById('modalAdvFrom');
      const tEl = document.getElementById('modalAdvTo');
      if (fEl) fEl.value = f;
      if (tEl) tEl.value = t;
      updateEmpAdvModalView();
    };

    window.updateEmpAdvModalView = function() {
      const empVal = document.getElementById('modalAdvEmp')?.value || 'all';
      const fVal = document.getElementById('modalAdvFrom')?.value || '';
      const tVal = document.getElementById('modalAdvTo')?.value || '';
      const container = document.getElementById('modalAdvDynamicContent');
      if (!container) return;

      const currMonthPrefix = new Date().toISOString().slice(0, 7);

      // Filter advances for selected employee
      const matching = (allAdvs || []).filter(a => {
        const aName = a.employees?.name || window._claimsState.empMap[a.emp_id] || 'Staff';
        if (empVal !== 'all' && aName !== empVal) return false;
        return true;
      });

      // 1. Total Advance (All-Time)
      const totalAllTime = matching.reduce((s, a) => s + Number(a.advance_amount || 0), 0);
      const totalRepaid = matching.reduce((s, a) => s + Number(a.repaid_amount || 0), 0);
      const outstandingBal = totalAllTime - totalRepaid;

      // 2. Monthly Advance (Current Month)
      const monthlyTotal = matching
        .filter(a => (a.date_given || (a.created_at || '')).slice(0, 7) === currMonthPrefix)
        .reduce((s, a) => s + Number(a.advance_amount || 0), 0);

      // 3. Between Dates Advance
      const betweenMatching = matching.filter(a => {
        const d = a.date_given || (a.created_at || '').slice(0, 10);
        if (fVal && d < fVal) return false;
        if (tVal && d > tVal) return false;
        return true;
      });
      const betweenTotal = betweenMatching.reduce((s, a) => s + Number(a.advance_amount || 0), 0);

      container.innerHTML = `
        <!-- 4 SUMMARY CARDS -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;margin-bottom:16px;">
          <div style="padding:12px;background:#FEF2F2;border:1px solid #FECDD3;border-radius:8px;text-align:center;">
            <div style="font-size:10.5px;color:#991B1B;font-weight:700;">💰 TOTAL ALL-TIME</div>
            <div style="font-size:20px;font-weight:800;color:#991B1B;margin-top:2px;">₹${totalAllTime.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:#64748B;">All dates combined</div>
          </div>
          <div style="padding:12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;text-align:center;">
            <div style="font-size:10.5px;color:#1E40AF;font-weight:700;">📅 MONTHLY (${currMonthPrefix})</div>
            <div style="font-size:20px;font-weight:800;color:#1D4ED8;margin-top:2px;">₹${monthlyTotal.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:#64748B;">In current month</div>
          </div>
          <div style="padding:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;text-align:center;">
            <div style="font-size:10.5px;color:#92400E;font-weight:700;">⏳ BETWEEN DATES</div>
            <div style="font-size:20px;font-weight:800;color:#B45309;margin-top:2px;">₹${betweenTotal.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:#64748B;">${fVal || 'Start'} to ${tVal || 'End'}</div>
          </div>
          <div style="padding:12px;background:${outstandingBal > 0 ? '#FEF2F2' : '#F0FDF4'};border:1px solid ${outstandingBal > 0 ? '#FCA5A5' : '#86EFAC'};border-radius:8px;text-align:center;">
            <div style="font-size:10.5px;color:${outstandingBal > 0 ? '#991B1B' : '#166534'};font-weight:700;">⚖️ NET OUTSTANDING</div>
            <div style="font-size:20px;font-weight:800;color:${outstandingBal > 0 ? '#DC2626' : '#059669'};margin-top:2px;">₹${outstandingBal.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:#64748B;">Repaid: ₹${totalRepaid.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- TRANSACTIONS TABLE -->
        <div style="font-size:13px;font-weight:800;color:#334155;margin-bottom:8px;">
          📋 Advance Records in Selected Range (${betweenMatching.length} items)
        </div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:580px;">
            <thead>
              <tr style="background:#F1F5F9;text-align:left;">
                <th style="padding:8px;">Date</th>
                <th style="padding:8px;">Staff Name</th>
                <th style="padding:8px;text-align:right;">Amount (₹)</th>
                <th style="padding:8px;">Payment Source</th>
                <th style="padding:8px;">Mode</th>
                <th style="padding:8px;">Reason / Notes</th>
                <th style="padding:8px;text-align:center;">Claim Status</th>
              </tr>
            </thead>
            <tbody>
              ${betweenMatching.length === 0 ? '<tr><td colspan="7" style="padding:24px;text-align:center;color:#94A3B8;">No advance entries found in this date range</td></tr>' : ''}
              ${betweenMatching.map(a => {
                const sName = a.employees?.name || window._claimsState.empMap[a.emp_id] || 'Staff';
                const st = a.claim_status || (a.is_deducted ? 'received' : 'unclaimed');
                const stBadge = st === 'received' ? '<span style="background:#DCFCE7;color:#15803D;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">✅ Settled</span>'
                  : st === 'claimed' ? '<span style="background:#FEF3C7;color:#92400E;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">📤 Claimed</span>'
                  : '<span style="background:#FEE2E2;color:#B91C1C;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">⏳ Pending</span>';

                return `
                  <tr style="border-bottom:1px solid #E2E8F0;">
                    <td style="padding:8px;white-space:nowrap;">${a.date_given || (a.created_at || '').slice(0, 10)}</td>
                    <td style="padding:8px;font-weight:700;color:#1E293B;">${sName}</td>
                    <td style="padding:8px;text-align:right;font-weight:800;color:#B91C1C;white-space:nowrap;">₹${Number(a.advance_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;">${window.UHHSODManager ? UHHSODManager.getBadge(a.paid_by) : (a.paid_by || '-')}</td>
                    <td style="padding:8px;">${a.payment_mode || '-'}</td>
                    <td style="padding:8px;max-width:200px;">${a.reason || '-'}</td>
                    <td style="padding:8px;text-align:center;">${stBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    updateEmpAdvModalView();

    // Escape handler
    const escHandler = e => {
      if (e.key === 'Escape') {
        window.closeEmployeeAdvanceModal();
        window.removeEventListener('keydown', escHandler);
      }
    };
    window.addEventListener('keydown', escHandler);

  } catch (err) {
    alert('Error loading advance analysis: ' + err.message);
  }
};

window.exportUhhsLedgerPDF = function(fDate, tDate, totalInflow, totalOutflow, netBalance, txnsJson) {
  let txns = [];
  if ((!fDate || typeof fDate !== 'string') && window._currentUhhsStatementData) {
    fDate = window._currentUhhsStatementData.fDate;
    tDate = window._currentUhhsStatementData.tDate;
    totalInflow = window._currentUhhsStatementData.totalInflow;
    totalOutflow = window._currentUhhsStatementData.totalOutflow;
    netBalance = window._currentUhhsStatementData.netBalance;
    txns = window._currentUhhsStatementData.txns || [];
  } else if (Array.isArray(txnsJson)) {
    txns = txnsJson;
  } else if (typeof txnsJson === 'string') {
    try {
      txns = JSON.parse(decodeURIComponent(txnsJson));
    } catch (e) {
      try { txns = JSON.parse(txnsJson); } catch (e2) { txns = []; }
    }
  } else if (window._currentUhhsStatementData?.txns) {
    txns = window._currentUhhsStatementData.txns;
  }

  const safeFDate = fDate || '-';
  const safeTDate = tDate || '-';
  const safeInflow = Number(totalInflow) || 0;
  const safeOutflow = Number(totalOutflow) || 0;
  const safeBalance = Number(netBalance) || 0;

  const printWin = window.open('', '_blank');
  if (!printWin) { alert('Popup blocked! Please allow popups.'); return; }

  const escapeHtml = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const title = `UHHS-OD Ledger Statement (${safeFDate} to ${safeTDate})`;
  printWin.document.title = title;
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 12mm 15mm; margin: 0; color: #1e293b; background: #fff; }
        .toolbar { display: flex; justify-content: space-between; align-items: center; background: #0F172A; color: #fff; padding: 10px 16px; border-radius: 8px; margin-bottom: 20px; }
        .toolbar button { background: #10B981; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; }
        .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 16px; }
        h1 { margin: 0; color: #0f766e; font-size: 20px; font-weight: 800; }
        .sub { color: #64748b; font-size: 11px; margin-top: 4px; }
        .cards { display: flex; gap: 10px; margin-bottom: 18px; }
        .card { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #cbd5e1; }
        .card-in { background: #f0fdf4; border-color: #86efac; }
        .card-out { background: #fef2f2; border-color: #fca5a5; }
        .card-bal { background: ${safeBalance >= 0 ? '#ecfdf5' : '#fff1f2'}; border-color: ${safeBalance >= 0 ? '#6ee7b7' : '#fecdd3'}; }
        .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .val { font-size: 18px; font-weight: 800; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
        td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
        .dep { background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
        .exp { background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
        @media print {
          body { padding: 0; }
          .toolbar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar no-print">
        <span style="font-weight:700;">📄 ${title}</span>
        <div style="display:flex;gap:8px;">
          <button onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()" style="background:#EF4444;">✕ Close</button>
        </div>
      </div>

      <div class="header">
        <h1>📜 UHHS-OD Account Statement / Ledger</h1>
        <div class="sub">Period: <strong>${safeFDate}</strong> → <strong>${safeTDate}</strong> | Generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>

      <div class="cards">
        <div class="card card-in">
          <div class="lbl" style="color:#166534;">TOTAL DEPOSITED (+)</div>
          <div class="val" style="color:#059669;">₹${safeInflow.toLocaleString('en-IN')}</div>
        </div>
        <div class="card card-out">
          <div class="lbl" style="color:#991b1b;">TOTAL SPENT (-)</div>
          <div class="val" style="color:#dc2626;">₹${safeOutflow.toLocaleString('en-IN')}</div>
        </div>
        <div class="card card-bal">
          <div class="lbl" style="color:${safeBalance>=0?'#065f46':'#9f1239'};">NET RUNNING BALANCE</div>
          <div class="val" style="color:${safeBalance>=0?'#059669':'#dc2626'};">₹${safeBalance.toLocaleString('en-IN')}</div>
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
              <td>${escapeHtml(t.desc)}</td>
              <td style="text-align:right;font-weight:700;color:${t.isDep?'#15803d':'#b91c1c'};">${t.isDep ? '+' : '-'}₹${(Number(t.amount) || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${typeof window.getOfficialReportFooterHTML === 'function' ? window.getOfficialReportFooterHTML() : `
        <div style="margin-top:24px;padding-top:12px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#64748b;">
          <strong>THE UNIQUE HAVEN HOMES PRIVATE LIMITED</strong> &bull; uniquehavenhomesstay.com<br>
          ⚡ Developed by Praveen Singh
        </div>
      `}

      <script>
        window.onload = function() {
          setTimeout(function(){ window.print(); }, 400);
        };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
};

// ══════════════════════════════════════════════════════════════════
// 9. CLAIM REPORT STATEMENT & WHATSAPP SUMMARY
// ══════════════════════════════════════════════════════════════════
function getFilteredClaimsItems() {
  const { fromDate, toDate, moduleFilter, statusFilter, paidByFilter, employeeFilter, allData, empMap } = window._claimsState || {};
  return (allData || []).filter(item => {
    if (fromDate && item.dateStr < fromDate) return false;
    if (toDate && item.dateStr > toDate) return false;
    if (moduleFilter && moduleFilter !== 'all' && item.module !== moduleFilter) return false;
    if (paidByFilter && paidByFilter !== 'all' && item.paidBy !== paidByFilter) return false;
    if (statusFilter && statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (employeeFilter && employeeFilter !== 'all') {
      const matchEmp = (item.staffName === employeeFilter) ||
                       (item.vendorOrStaff === employeeFilter) ||
                       (item.empId === employeeFilter) ||
                       (empMap && empMap[item.empId] === employeeFilter);
      if (!matchEmp) return false;
    }
    return true;
  });
}

window.generateClaimReport = function() {
  const items = getFilteredClaimsItems();
  if (!items || items.length === 0) {
    if (window.fsn?.warn) fsn.warn('No Data', 'No claim items found matching current filters.');
    else alert('No claim items found matching current filters.');
    return;
  }

  const { fromDate, toDate, paidByFilter } = window._claimsState || {};
  const fDate = fromDate || 'Start';
  const tDate = toDate || 'Present';
  const payerLabel = paidByFilter === 'all' ? 'All Payers' : paidByFilter;

  let totalAmt = 0;
  let claimedAmt = 0;
  let advancesAmt = 0;

  items.forEach(i => {
    totalAmt += (i.amount || 0);
    if (i.status === 'claimed' || i.status === 'received') {
      claimedAmt += (i.amount || 0);
    }
    if (i.module === 'advances') {
      advancesAmt += (i.amount || 0);
    }
  });

  const pendingAmt = Math.max(0, totalAmt - claimedAmt);

  // Remove existing modal if any
  document.getElementById('claimReportModalOverlay')?.remove();

  const modal = document.createElement('div');
  modal.id = 'claimReportModalOverlay';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:90000;padding:12px;box-sizing:border-box;backdrop-filter:blur(2px);';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="background:#fff;border-radius:12px;width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.35);margin:auto;" onclick="event.stopPropagation()">
      <!-- HEADER -->
      <div style="padding:14px 18px;border-bottom:1.5px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:#F8FAFC;">
        <div>
          <h2 style="margin:0;color:#6D28D9;font-size:17px;font-weight:800;display:flex;align-items:center;gap:6px;">
            📊 Claim Settlement Statement Report
          </h2>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
            Payer: <strong>${payerLabel}</strong> · Period: <strong>${fDate}</strong> → <strong>${tDate}</strong> · Total Items: <strong>${items.length}</strong>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <button onclick="window.printClaimReportStatement()" style="padding:6px 12px;background:#0F172A;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;">🖨️ Print / PDF</button>
          <button onclick="window.copyClaimWhatsAppText()" style="padding:6px 12px;background:#25D366;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;">📱 Copy WhatsApp</button>
          <button onclick="document.getElementById('claimReportModalOverlay')?.remove()" style="background:#EF4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:800;font-size:12.5px;cursor:pointer;">✕ Close</button>
        </div>
      </div>

      <!-- BODY -->
      <div style="padding:14px 18px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;flex:1;">
        <!-- METRICS -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-bottom:14px;">
          <div style="padding:10px;background:#EEF2FF;border:1px solid #C7D2FE;border-radius:8px;text-align:center;">
            <div style="font-size:10px;color:#4338CA;font-weight:700;">TOTAL EXPENSES</div>
            <div style="font-size:18px;font-weight:800;color:#3730A3;margin-top:2px;">₹${totalAmt.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:10px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;text-align:center;">
            <div style="font-size:10px;color:#92400E;font-weight:700;">CLAIMED / SETTLED</div>
            <div style="font-size:18px;font-weight:800;color:#B45309;margin-top:2px;">₹${claimedAmt.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:10px;background:#FEE2E2;border:1px solid #FECDD3;border-radius:8px;text-align:center;">
            <div style="font-size:10px;color:#991B1B;font-weight:700;">STAFF ADVANCES</div>
            <div style="font-size:18px;font-weight:800;color:#DC2626;margin-top:2px;">₹${advancesAmt.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:10px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;text-align:center;">
            <div style="font-size:10px;color:#065F46;font-weight:700;">PENDING TO SETTLE</div>
            <div style="font-size:18px;font-weight:800;color:#059669;margin-top:2px;">₹${pendingAmt.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:600px;">
            <thead>
              <tr style="background:#F1F5F9;text-align:left;">
                <th style="padding:8px;">Date</th>
                <th style="padding:8px;">Module</th>
                <th style="padding:8px;">Description</th>
                <th style="padding:8px;">Staff / Vendor</th>
                <th style="padding:8px;">Paid By</th>
                <th style="padding:8px;text-align:right;">Amount (₹)</th>
                <th style="padding:8px;text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr style="border-bottom:1px solid #E2E8F0;">
                  <td style="padding:8px;white-space:nowrap;">${i.dateStr || '-'}</td>
                  <td style="padding:8px;white-space:nowrap;"><span style="font-size:11px;font-weight:700;color:#475569;">${i.moduleLabel || i.module}</span></td>
                  <td style="padding:8px;">${i.description || '-'}</td>
                  <td style="padding:8px;white-space:nowrap;">${i.vendorOrStaff || '-'}</td>
                  <td style="padding:8px;white-space:nowrap;"><span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#E0E7FF;color:#3730A3;">${i.paidBy}</span></td>
                  <td style="padding:8px;text-align:right;font-weight:700;color:#0F172A;white-space:nowrap;">₹${(i.amount || 0).toLocaleString('en-IN')}</td>
                  <td style="padding:8px;text-align:center;white-space:nowrap;">
                    <span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${i.status==='received'?'#DCFCE7':i.status==='claimed'?'#FEF3C7':'#F1F5F9'};color:${i.status==='received'?'#15803D':i.status==='claimed'?'#92400E':'#475569'};">
                      ${i.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="padding:10px 18px;border-top:1px solid #E2E8F0;background:#F8FAFC;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="font-size:12px;color:#64748B;">
          Pending Payable: <strong style="color:${pendingAmt>0?'#B45309':'#059669'};">₹${pendingAmt.toLocaleString('en-IN')}</strong>
        </div>
        <button type="button" onclick="document.getElementById('claimReportModalOverlay')?.remove()" style="background:#64748B;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">
          ✕ Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};

window.printClaimReportStatement = function() {
  const items = getFilteredClaimsItems();
  if (!items || items.length === 0) return;

  const { fromDate, toDate, paidByFilter } = window._claimsState || {};
  const fDate = fromDate || 'Start';
  const tDate = toDate || 'Present';
  const payerLabel = paidByFilter === 'all' ? 'All Payers' : paidByFilter;

  let totalAmt = 0;
  let claimedAmt = 0;
  let advancesAmt = 0;

  items.forEach(i => {
    totalAmt += (i.amount || 0);
    if (i.status === 'claimed' || i.status === 'received') claimedAmt += (i.amount || 0);
    if (i.module === 'advances') advancesAmt += (i.amount || 0);
  });
  const pendingAmt = Math.max(0, totalAmt - claimedAmt);

  const printWin = window.open('', '_blank');
  if (!printWin) { alert('Popup blocked! Please allow popups.'); return; }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Claim Statement (${payerLabel} - ${fDate} to ${tDate})</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #1e293b; background: #fff; font-size: 11px; }
        .header { border-bottom: 2px solid #6d28d9; padding-bottom: 8px; margin-bottom: 14px; }
        h1 { margin: 0; color: #6d28d9; font-size: 18px; font-weight: 800; }
        .sub { color: #64748b; font-size: 11px; margin-top: 3px; }
        .cards { display: flex; gap: 8px; margin-bottom: 14px; }
        .card { flex: 1; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1; }
        .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
        .val { font-size: 16px; font-weight: 800; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        th { background: #f1f5f9; padding: 6px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⚖️ UNIVERSAL CLAIM STATEMENT REPORT</h1>
        <div class="sub">Payer: <strong>${payerLabel}</strong> | Period: <strong>${fDate}</strong> → <strong>${tDate}</strong> | Generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>
      <div class="cards">
        <div class="card" style="background:#eef2ff;">
          <div class="lbl">Total Expenses</div>
          <div class="val" style="color:#3730a3;">₹${totalAmt.toLocaleString('en-IN')}</div>
        </div>
        <div class="card" style="background:#fef3c7;">
          <div class="lbl">Claimed / Settled</div>
          <div class="val" style="color:#b45309;">₹${claimedAmt.toLocaleString('en-IN')}</div>
        </div>
        <div class="card" style="background:#fee2e2;">
          <div class="lbl">Staff Advances</div>
          <div class="val" style="color:#dc2626;">₹${advancesAmt.toLocaleString('en-IN')}</div>
        </div>
        <div class="card" style="background:#ecfdf5;">
          <div class="lbl">Pending to Settle</div>
          <div class="val" style="color:#059669;">₹${pendingAmt.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Module</th>
            <th>Description</th>
            <th>Staff / Vendor</th>
            <th>Paid By</th>
            <th style="text-align:right;">Amount (₹)</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td>${i.dateStr || '-'}</td>
              <td>${i.moduleLabel || i.module}</td>
              <td>${i.description || '-'}</td>
              <td>${i.vendorOrStaff || '-'}</td>
              <td>${i.paidBy}</td>
              <td style="text-align:right;font-weight:700;">₹${(i.amount||0).toLocaleString('en-IN')}</td>
              <td style="text-align:center;">${i.status.toUpperCase()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${window.getOfficialReportFooterHTML ? window.getOfficialReportFooterHTML() : `
        <div style="margin-top:24px;padding-top:10px;border-top:1px solid #cbd5e1;text-align:center;font-size:10px;color:#64748b;">
          <strong>THE UNIQUE HAVEN HOMES PRIVATE LIMITED</strong> &bull; uniquehavenhomesstay.com
        </div>
      `}
      <script>window.onload = function() { setTimeout(function(){ window.print(); }, 400); };</script>
    </body>
    </html>
  `);
  printWin.document.close();
};

window.copyClaimWhatsAppText = function() {
  const items = getFilteredClaimsItems();
  if (!items || items.length === 0) {
    alert('No claim items found to summarize.');
    return;
  }

  const { fromDate, toDate, paidByFilter } = window._claimsState || {};
  const fDate = fromDate || 'Start';
  const tDate = toDate || 'Present';
  const payerLabel = paidByFilter === 'all' ? 'ALL PAYERS' : paidByFilter.toUpperCase();

  let totalAmt = 0;
  let claimedAmt = 0;
  let advancesAmt = 0;
  let listText = '';

  items.slice(0, 40).forEach((i, idx) => {
    totalAmt += (i.amount || 0);
    if (i.status === 'claimed' || i.status === 'received') claimedAmt += (i.amount || 0);
    if (i.module === 'advances') advancesAmt += (i.amount || 0);
    const emoji = i.module === 'reimbursements' ? '💸' : i.module === 'maintenance' ? '🔧' : i.module === 'laundry' ? '🧺' : '💰';
    listText += `${idx + 1}. ${emoji} *${i.description || i.module}* (${i.dateStr})\n   👤 ${i.vendorOrStaff || i.paidBy} → ₹${(i.amount||0).toLocaleString('en-IN')}\n`;
  });

  if (items.length > 40) {
    items.slice(40).forEach(i => {
      totalAmt += (i.amount || 0);
      if (i.status === 'claimed' || i.status === 'received') claimedAmt += (i.amount || 0);
      if (i.module === 'advances') advancesAmt += (i.amount || 0);
    });
    listText += `\n...and ${items.length - 40} more items (see statement report)\n`;
  }

  const pendingAmt = Math.max(0, totalAmt - claimedAmt);

  const text = `⚖️ *UNIVERSAL CLAIM STATEMENT (${payerLabel})*\n📅 Period: *${fDate}* → *${tDate}*\n📦 Total Items: *${items.length}*\n\n*ITEMIZED BREAKDOWN:*\n${listText}\n━━━━━━━━━━━━━━━━━━\n💰 *Total Expenses:* ₹${totalAmt.toLocaleString('en-IN')}\n✅ *Claimed / Settled:* ₹${claimedAmt.toLocaleString('en-IN')}\n👥 *Staff Advances:* ₹${advancesAmt.toLocaleString('en-IN')}\n💵 *NET PENDING TO SETTLE: ₹${pendingAmt.toLocaleString('en-IN')}*\n━━━━━━━━━━━━━━━━━━\n_The Unique Haven Homes CRM_`;

  navigator.clipboard.writeText(text).then(() => {
    if (window.fsn?.success) fsn.success('Copied', '📱 WhatsApp Claim Summary copied to clipboard!');
    else alert('✅ Copied! WhatsApp Claim Summary copied to clipboard. Paste directly into WhatsApp.');
  }).catch(err => {
    prompt('Copy this summary:', text);
  });
};

console.log("✅ Claims Manager v8 MASTER LOADED!");

// ═══════════════════════════════════════════════════════════
// 🏢 COMPANY LEDGER — Statement of Company-Paid Expenses
// ═══════════════════════════════════════════════════════════

window.showCompanyLedgerModal = function() {
  const old = document.getElementById('companyLedgerModalOverlay');
  if (old) old.remove();

  const state = window._claimsState || {};
  const fDate = state.fromDate || new Date().toISOString().slice(0, 10);
  const tDate = state.toDate || new Date().toISOString().slice(0, 10);

  const overlay = document.createElement('div');
  overlay.id = 'companyLedgerModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9000000;display:flex;align-items:center;justify-content:center;padding:16px;';

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden;">
      <div style="background:#7C3AED;color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:17px;font-weight:800;">🏢 Company Ledger</div>
          <div style="font-size:12px;opacity:0.85;margin-top:2px;">Statement of all Company-paid expenses</div>
        </div>
        <button onclick="document.getElementById('companyLedgerModalOverlay').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:4px;">📅 FROM DATE</label>
            <input type="date" id="compLedgerFrom" value="${fDate}" style="width:100%;padding:8px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748B;display:block;margin-bottom:4px;">📅 TO DATE</label>
            <input type="date" id="compLedgerTo" value="${tDate}" style="width:100%;padding:8px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;">
          </div>
        </div>
        <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:#5B21B6;">
          ℹ️ Generates a <strong>PDF statement</strong> of all expenses paid via <strong>Company funds</strong> (guest rent / cash in hand) in the selected period.
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="window.exportCompanyLedgerPDF(document.getElementById('compLedgerFrom').value,document.getElementById('compLedgerTo').value)" style="flex:1;padding:12px;background:#7C3AED;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;">
            📄 Generate PDF Statement
          </button>
          <button onclick="document.getElementById('companyLedgerModalOverlay').remove()" style="padding:12px 18px;background:#F1F5F9;color:#475569;border:1.5px solid #E2E8F0;border-radius:10px;font-weight:600;cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
};

window.exportCompanyLedgerPDF = function(fDate, tDate) {
  document.getElementById('companyLedgerModalOverlay')?.remove();

  const allData = window._claimsState?.allData || [];

  // Filter: COMPANY paid, within date range
  const items = allData.filter(item => {
    if (item.paidBy !== 'COMPANY') return false;
    if (fDate && item.dateStr && item.dateStr < fDate) return false;
    if (tDate && item.dateStr && item.dateStr > tDate) return false;
    return true;
  }).sort((a, b) => (a.dateStr || '').localeCompare(b.dateStr || ''));

  const totalAmt = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const settledAmt = items.filter(i => i.status === 'received').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const pendingAmt = totalAmt - settledAmt;

  // Category breakdown
  const catMap = {};
  items.forEach(i => { const c = i.moduleLabel || 'Other'; catMap[c] = (catMap[c] || 0) + (Number(i.amount) || 0); });

  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const title = 'Company Payments Statement (' + (fDate||'-') + ' to ' + (tDate||'-') + ')';

  const printWin = window.open('', '_blank');
  if (!printWin) { alert('Popup blocked! Please allow popups.'); return; }

  printWin.document.title = title;
  printWin.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
    '@page{size:A4;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:10mm 14mm;margin:0;color:#1e293b;background:#fff}' +
    '.toolbar{display:flex;justify-content:space-between;align-items:center;background:#7C3AED;color:#fff;padding:10px 16px;border-radius:8px;margin-bottom:20px}' +
    '.toolbar button{background:#fff;color:#7C3AED;border:none;padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px}' +
    '.tbtn-close{background:#EF4444!important;color:#fff!important}' +
    '.header{border-bottom:2px solid #7C3AED;padding-bottom:10px;margin-bottom:16px}' +
    'h1{margin:0;color:#7C3AED;font-size:20px;font-weight:800}.sub{color:#64748b;font-size:11px;margin-top:4px}' +
    '.cards{display:flex;gap:10px;margin-bottom:18px}.card{flex:1;padding:12px;border-radius:8px;text-align:center;border:1px solid #cbd5e1}' +
    '.c-total{background:#F5F3FF;border-color:#C4B5FD}.c-settled{background:#f0fdf4;border-color:#86efac}.c-pending{background:#fef2f2;border-color:#fca5a5}' +
    '.lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}.val{font-size:18px;font-weight:800;margin-top:2px}' +
    '.cat-box{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.cat-chip{background:#F5F3FF;border:1px solid #DDD6FE;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;color:#5B21B6}' +
    'table{width:100%;border-collapse:collapse;font-size:11px}th{background:#F5F3FF;padding:8px;text-align:left;border-bottom:2px solid #C4B5FD;font-weight:700;color:#5B21B6}' +
    'td{padding:7px 8px;border-bottom:1px solid #EDE9FE}' +
    '.bs{background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-weight:700;font-size:9px}' +
    '.bc{background:#fef9c3;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:700;font-size:9px}' +
    '.bp{background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-weight:700;font-size:9px}' +
    '.tr-total{background:#F5F3FF;font-weight:800}' +
    '@media print{body{padding:0}.toolbar{display:none!important}}' +
    '</style></head><body>' +
    '<div class="toolbar"><span style="font-weight:700;">🏢 ' + title + '</span>' +
    '<div style="display:flex;gap:8px;"><button onclick="window.print()">🖨️ Print / Save as PDF</button>' +
    '<button class="tbtn-close" onclick="window.close()">✕ Close</button></div></div>' +
    '<div class="header"><h1>🏢 Company Payments Ledger</h1>' +
    '<div class="sub">Period: <strong>' + (fDate||'-') + '</strong> → <strong>' + (tDate||'-') + '</strong> · Paid via: COMPANY (Guest Rent / Cash in Hand) · Generated: ' + new Date().toLocaleString('en-IN') + '</div></div>' +
    '<div class="cards">' +
    '<div class="card c-total"><div class="lbl" style="color:#5B21B6;">TOTAL COMPANY PAID</div><div class="val" style="color:#7C3AED;">₹' + totalAmt.toLocaleString('en-IN') + '</div><div style="font-size:10px;color:#64748b;margin-top:2px;">' + items.length + ' transactions</div></div>' +
    '<div class="card c-settled"><div class="lbl" style="color:#166534;">SETTLED / RECEIVED</div><div class="val" style="color:#059669;">₹' + settledAmt.toLocaleString('en-IN') + '</div></div>' +
    '<div class="card c-pending"><div class="lbl" style="color:#991b1b;">PENDING TO SETTLE</div><div class="val" style="color:#dc2626;">₹' + pendingAmt.toLocaleString('en-IN') + '</div></div>' +
    '</div>' +
    '<div style="font-size:11px;font-weight:700;color:#5B21B6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Category Breakdown</div>' +
    '<div class="cat-box">' + Object.entries(catMap).map(([c,a]) => '<div class="cat-chip">' + c + ': ₹' + a.toLocaleString('en-IN') + '</div>').join('') + '</div>' +
    '<table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Description</th><th>Vendor / Staff</th><th>Status</th><th style="text-align:right;">Amount (₹)</th></tr></thead><tbody>' +
    (items.length === 0
      ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748B;">No COMPANY-paid expenses found in this date range.</td></tr>'
      : items.map((item, idx) =>
          '<tr>' +
          '<td style="color:#64748B;">' + (idx+1) + '</td>' +
          '<td>' + (item.dateStr||'-') + '</td>' +
          '<td>' + (item.moduleLabel||'-') + '</td>' +
          '<td>' + esc(item.description) + '</td>' +
          '<td style="color:#475569;">' + esc(item.vendorOrStaff) + '</td>' +
          '<td><span class="' + (item.status==='received'?'bs':item.status==='claimed'?'bc':'bp') + '">' + (item.status==='received'?'✅ SETTLED':item.status==='claimed'?'⏳ CLAIMED':'🔴 PENDING') + '</span></td>' +
          '<td style="text-align:right;font-weight:700;color:#7C3AED;">₹' + (Number(item.amount)||0).toLocaleString('en-IN') + '</td>' +
          '</tr>'
        ).join('') +
        '<tr class="tr-total"><td colspan="6" style="text-align:right;padding:10px 8px;font-size:13px;">🏢 TOTAL COMPANY PAID</td>' +
        '<td style="text-align:right;font-size:14px;font-weight:800;color:#7C3AED;padding:10px 8px;">₹' + totalAmt.toLocaleString('en-IN') + '</td></tr>'
    ) +
    '</tbody></table>' +
    '<div style="margin-top:24px;padding-top:12px;border-top:1px solid #DDD6FE;text-align:center;font-size:11px;color:#64748b;">' +
    '<strong>THE UNIQUE HAVEN HOMES PRIVATE LIMITED</strong> · uniquehavenhomesstay.com<br>⚡ Developed by Praveen Singh</div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>' +
    '</body></html>'
  );
  printWin.document.close();
};