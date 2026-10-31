/**
 * Expenses & P&L Module
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

// ============ MAIN EXPENSES VIEW ============
async function renderExpenses() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');

  renderShell(`<div class="loading">Loading Unified Company Expenses &amp; Outflows...</div>`, 'expenses');

  const cm = new Date().toISOString().slice(0, 7);
  const now = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ml = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;

  // Fetch all 5 expense channels concurrently
  const [
    { data: cats },
    { data: exps },
    { data: gs },
    { data: rooms },
    { data: reimbs },
    { data: maint },
    { data: laundryPays },
    { data: advs },
    { data: emps }
  ] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('expenses').select('*, expense_categories(category_name), rooms(nickname,unit_no)').order('entry_date', { ascending: false }),
    sb.from('guest_register').select('booking_id, check_in, total_amount'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no'),
    sb.from('reimbursements').select('*').order('expense_date', { ascending: false }),
    sb.from('maintenance_log').select('*').gt('cost', 0).order('reported_date', { ascending: false }),
    sb.from('laundry_payments').select('*, laundry_records(vendor_name, room_id)').order('payment_date', { ascending: false }),
    sb.from('advance_tracker').select('*, employees(name, role)').order('date_given', { ascending: false }),
    sb.from('employees').select('emp_id, name, role, phone, salary').order('name')
  ]);

  // Employee mapping
  const empMap = {};
  (emps || []).forEach(e => { if (e.emp_id) empMap[e.emp_id] = e; });
  window._allEmployeesList = emps || [];

  // Helper normalizer for payment source (OD vs Company/Firoz)
  function normSource(raw) {
    if (!raw) return 'COMPANY';
    const s = String(raw).trim().toUpperCase();
    if (s.includes('OD') || s.includes('UHHS') || s.includes('OVERDRAFT')) return 'UHHS-OD';
    if (s.includes('FIROZ') || s.includes('DIRECT')) return 'FIROZ';
    return 'COMPANY';
  }

  // Build Master Unified Expenses Collection
  const masterList = [];

  // 1. General Expenses & Wi-Fi
  (exps || []).forEach(e => {
    const isWifi = (e.expense_categories?.category_name || '').toLowerCase().includes('wi-fi') || (e.notes || '').toLowerCase().includes('wifi');
    masterList.push({
      uniqId: 'exp_' + e.id,
      id: e.id,
      channel: isWifi ? 'maintenance' : 'general',
      channelLabel: isWifi ? '📶 Wi-Fi / Broadband' : '🧾 General Expense',
      channelBadge: isWifi ? 'badge-info' : 'badge-neutral',
      title: e.notes || e.expense_categories?.category_name || 'Expense',
      category: e.expense_categories?.category_name || 'General',
      amount: Number(e.amount || 0),
      date: e.entry_date || (e.created_at || '').slice(0, 10),
      month: e.month || (e.entry_date ? `${monthNames[parseInt(e.entry_date.slice(5,7),10)-1]}-${e.entry_date.slice(0,4)}` : ml),
      monthYm: (e.entry_date || '').slice(0, 7) || cm,
      roomId: e.room_id || null,
      roomLabel: propLabel(e.rooms) || e.room_id || 'General Business',
      staffName: e.paid_to || '-',
      empId: null,
      paidBy: normSource(e.payment_source || e.paid_by),
      isSalaryDeductible: false,
      deductionStatus: 'Company Operational',
      notes: e.notes || '',
      raw: e
    });
  });

  // 2. Laundry Expenses
  (laundryPays || []).forEach(lp => {
    const vName = lp.laundry_records?.vendor_name || 'Laundry Vendor';
    const dStr = lp.payment_date || (lp.created_at || '').slice(0, 10);
    const mYm = dStr.slice(0, 7);
    const mLabel = dStr ? `${monthNames[parseInt(dStr.slice(5,7),10)-1]}-${dStr.slice(0,4)}` : ml;
    masterList.push({
      uniqId: 'laundry_' + lp.id,
      id: lp.id,
      channel: 'laundry',
      channelLabel: '🧺 Laundry Bill',
      channelBadge: 'badge-info',
      title: `Linen Wash: ${vName}`,
      category: 'Laundry & Linen',
      amount: Number(lp.amount || 0),
      date: dStr,
      month: mLabel,
      monthYm: mYm,
      roomId: lp.laundry_records?.room_id || null,
      roomLabel: lp.laundry_records?.room_id ? (window.getRoomNickname ? window.getRoomNickname(lp.laundry_records.room_id) : lp.laundry_records.room_id) : 'All Units',
      staffName: vName,
      empId: null,
      paidBy: normSource(lp.payment_source || lp.paid_by),
      isSalaryDeductible: false,
      deductionStatus: 'Company Operational',
      notes: lp.notes || `Vendor: ${vName}`,
      raw: lp
    });
  });

  // 3. Maintenance & Property Repairs
  (maint || []).forEach(m => {
    const dStr = m.reported_date || (m.created_at || '').slice(0, 10);
    const mYm = dStr.slice(0, 7);
    const mLabel = dStr ? `${monthNames[parseInt(dStr.slice(5,7),10)-1]}-${dStr.slice(0,4)}` : ml;
    const staffObj = empMap[m.assigned_to];
    const staffName = staffObj?.name || m.assigned_to || m.vendor_name || '-';
    masterList.push({
      uniqId: 'maint_' + m.id,
      id: m.id,
      channel: 'maintenance',
      channelLabel: '🔧 Maintenance',
      channelBadge: 'badge-warning',
      title: `${m.issue_type || 'Repair'}: ${(m.description || '').slice(0, 60)}`,
      category: 'Maintenance & Repairs',
      amount: Number(m.cost || 0),
      date: dStr,
      month: mLabel,
      monthYm: mYm,
      roomId: m.room_id || null,
      roomLabel: m.room_id ? (window.getRoomNickname ? window.getRoomNickname(m.room_id) : m.room_id) : 'General',
      staffName: staffName,
      empId: m.assigned_to || null,
      paidBy: normSource(m.payment_source || m.paid_by),
      isSalaryDeductible: false,
      deductionStatus: 'Company Operational',
      notes: m.description || m.notes || '',
      raw: m
    });
  });

  // 4. Staff Advances (Salary Linked)
  (advs || []).forEach(adv => {
    const dStr = adv.date_given || (adv.created_at || '').slice(0, 10);
    const mYm = dStr.slice(0, 7);
    const mLabel = dStr ? `${monthNames[parseInt(dStr.slice(5,7),10)-1]}-${dStr.slice(0,4)}` : ml;
    const staffName = adv.employees?.name || empMap[adv.emp_id]?.name || 'Staff Member';
    const isDeducted = Boolean(adv.is_deducted);
    masterList.push({
      uniqId: 'adv_' + adv.id,
      id: adv.id,
      channel: 'advance',
      channelLabel: '🎁 Staff Advance',
      channelBadge: 'badge-primary',
      title: `Advance to ${staffName} (${adv.reason || 'Personal / General'})`,
      category: 'Staff Advance',
      amount: Number(adv.advance_amount || 0),
      date: dStr,
      month: mLabel,
      monthYm: mYm,
      roomId: null,
      roomLabel: 'Staff Account',
      staffName: staffName,
      empId: adv.emp_id,
      paidBy: normSource(adv.paid_by),
      isSalaryDeductible: true,
      deductionStatus: isDeducted ? '✅ Deducted from Salary' : '⏳ Pending Salary Deduction',
      notes: adv.reason || '',
      raw: adv
    });
  });

  // 5. Staff Other Spends (Rapido, Mobile recharge, Grocery, Delivery)
  (reimbs || []).forEach(r => {
    const dStr = r.expense_date || (r.created_at || '').slice(0, 10);
    const mYm = dStr.slice(0, 7);
    const mLabel = dStr ? `${monthNames[parseInt(dStr.slice(5,7),10)-1]}-${dStr.slice(0,4)}` : ml;
    const staffName = r.paid_to || r.paid_by || '-';
    masterList.push({
      uniqId: 'reimb_' + r.id,
      id: r.id,
      channel: 'staff_spend',
      channelLabel: '🛵 Staff Spend / Rapido',
      channelBadge: 'badge-neutral',
      title: r.description || r.notes || r.category || 'Staff Spend',
      category: r.category || 'Reimbursements',
      amount: Number(r.amount || 0),
      date: dStr,
      month: mLabel,
      monthYm: mYm,
      roomId: r.room_id || null,
      roomLabel: r.room_id ? (window.getRoomNickname ? window.getRoomNickname(r.room_id) : r.room_id) : 'General Operations',
      staffName: staffName,
      empId: r.created_by || null,
      paidBy: normSource(r.payment_source || r.paid_by),
      isSalaryDeductible: false,
      deductionStatus: 'Company Operational',
      notes: r.notes || r.description || '',
      raw: r
    });
  });

  // Sort latest first
  masterList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Calculate Running Month Totals
  const thisMonthList = masterList.filter(item => item.monthYm === cm);
  const totalMonthExp = thisMonthList.reduce((s, x) => s + x.amount, 0);
  const totalOdExp = thisMonthList.filter(x => x.paidBy === 'UHHS-OD').reduce((s, x) => s + x.amount, 0);
  const totalCompanyExp = thisMonthList.filter(x => x.paidBy !== 'UHHS-OD').reduce((s, x) => s + x.amount, 0);
  const pendingStaffAdvs = masterList.filter(x => x.channel === 'advance' && !x.raw?.is_deducted).reduce((s, x) => s + x.amount, 0);

  // Income for this month from bookings
  const pm = await getPaidMap((gs || []).map(g => g.booking_id));
  const inc = (gs || []).filter(g => g.check_in?.startsWith(cm)).reduce((s, g) => s + (pm[g.booking_id] || 0), 0);
  const profit = inc - totalMonthExp;

  // Store globally for filtering & exports
  window._expCats = cats || [];
  window._expRooms = rooms || [];
  window._masterExpensesList = masterList;
  window._currentML = ml;
  window._currentMonthYm = cm;

  // Group per staff breakdown: "Kis employee pe kitna"
  const staffExpenseMap = {};
  (emps || []).forEach(e => {
    staffExpenseMap[e.emp_id] = {
      emp_id: e.emp_id,
      name: e.name,
      role: e.role || 'Staff',
      advances: 0,
      advancesPending: 0,
      otherSpends: 0,
      odPaid: 0,
      companyPaid: 0,
      totalOutflow: 0
    };
  });

  masterList.forEach(item => {
    let matchedEmpId = item.empId;
    if (!matchedEmpId && item.staffName) {
      const match = (emps || []).find(e => e.name.toLowerCase().trim() === item.staffName.toLowerCase().trim());
      if (match) matchedEmpId = match.emp_id;
    }
    if (matchedEmpId && staffExpenseMap[matchedEmpId]) {
      const rec = staffExpenseMap[matchedEmpId];
      if (item.channel === 'advance') {
        rec.advances += item.amount;
        if (!item.raw?.is_deducted) rec.advancesPending += item.amount;
      } else {
        rec.otherSpends += item.amount;
      }
      if (item.paidBy === 'UHHS-OD') rec.odPaid += item.amount;
      else rec.companyPaid += item.amount;
      rec.totalOutflow += item.amount;
    }
  });

  const staffSummaryList = Object.values(staffExpenseMap).filter(s => s.totalOutflow > 0 || s.advancesPending > 0);

  renderShell(`
    <div id="uhhs-od-balance-display" style="margin-bottom:14px;"></div>

    <!-- ─── HEADER & PRIMARY ACTION BUTTONS ─── -->
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="margin:0;font-size:22px;font-weight:900;color:#0F172A;display:flex;align-items:center;gap:8px;">
            <span>💼</span> All Company Expenses &amp; Outflow Hub
          </h1>
          <div class="sub" style="margin-top:3px;font-size:13px;color:#64748B;">
            Unified Spending Register: Laundry · Maintenance &amp; Wi-Fi · Staff Advances · Daily Claims
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button onclick="navigate('laundry')" style="background:#0284C7;color:#fff;font-weight:700;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(2,132,199,0.25);">
            <span>🧺</span> Laundry
          </button>
          <button onclick="navigate('maintenance')" style="background:#475569;color:#fff;font-weight:700;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(71,85,105,0.25);">
            <i class="ti ti-tool"></i> Maintenance
          </button>
          <button onclick="window.openWifiRechargeModal()" style="background:#2563EB;color:#fff;font-weight:700;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <i class="ti ti-wifi"></i> Wi-Fi Recharge
          </button>
          <button onclick="window.openEmployeeTransportModal()" style="background:#D97706;color:#fff;font-weight:700;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <span>🛵</span> Rapido &amp; Travel
          </button>
          <button onclick="window.openStaffAdvanceModal()" style="background:#7C3AED;color:#fff;font-weight:700;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <span>🎁</span> Give Staff Advance
          </button>
        </div>
      </div>
    </div>

    <!-- ─── EXECUTIVE EXPENSE & SOURCE COUNTERS ─── -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin-bottom:16px;">
      <div class="card" style="padding:14px 16px;background:#FFFFFF;border-left:4px solid #0EA5E9;margin:0;">
        <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">THIS MONTH OUTFLOW (${ml})</div>
        <div style="font-size:24px;font-weight:900;color:#DC2626;margin-top:4px;">₹${totalMonthExp.toLocaleString('en-IN')}</div>
        <div style="font-size:11.5px;color:#64748B;margin-top:2px;">All channels combined (${thisMonthList.length} items)</div>
      </div>

      <div class="card" style="padding:14px 16px;background:#F0FDF4;border-left:4px solid #10B981;margin:0;">
        <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">🏦 PAID VIA TUHH-OD</div>
        <div style="font-size:24px;font-weight:900;color:#059669;margin-top:4px;">₹${totalOdExp.toLocaleString('en-IN')}</div>
        <div style="font-size:11.5px;color:#15803D;margin-top:2px;">Online OD Account Outflow</div>
      </div>

      <div class="card" style="padding:14px 16px;background:#FFFBEB;border-left:4px solid #F59E0B;margin:0;">
        <div style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;">🏢 PAID VIA COMPANY / FIROZ</div>
        <div style="font-size:24px;font-weight:900;color:#D97706;margin-top:4px;">₹${totalCompanyExp.toLocaleString('en-IN')}</div>
        <div style="font-size:11.5px;color:#B45309;margin-top:2px;">Cash in Hand / Personal Transfers</div>
      </div>

      <div class="card" style="padding:14px 16px;background:#FAF5FF;border-left:4px solid #8B5CF6;margin:0;">
        <div style="font-size:11px;font-weight:700;color:#6B21A8;text-transform:uppercase;letter-spacing:0.5px;">🎁 STAFF ADVANCES PENDING</div>
        <div style="font-size:24px;font-weight:900;color:#7C3AED;margin-top:4px;">₹${pendingStaffAdvs.toLocaleString('en-IN')}</div>
        <div style="font-size:11.5px;color:#6B21A8;margin-top:2px;">To be deducted during salary payout</div>
      </div>
    </div>

    <!-- ─── P&L MOVEMENT THIS MONTH ─── -->
    <div class="card" style="margin-bottom:16px;">
      <div class="section-title">📊 Operational P&amp;L — ${ml}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-top:10px;">
        <div style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid #E2E8F0;">
          <div style="font-size:11px;color:#64748B;font-weight:700;">TOTAL BOOKINGS REVENUE</div>
          <div style="font-size:20px;font-weight:800;color:#10B981;margin-top:2px;">₹${inc.toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid #E2E8F0;">
          <div style="font-size:11px;color:#64748B;font-weight:700;">TOTAL OPERATING EXPENSES</div>
          <div style="font-size:20px;font-weight:800;color:#DC2626;margin-top:2px;">₹${totalMonthExp.toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid #E2E8F0;">
          <div style="font-size:11px;color:#64748B;font-weight:700;">NET OPERATIONAL PROFIT</div>
          <div style="font-size:20px;font-weight:800;color:${profit >= 0 ? '#10B981' : '#DC2626'};margin-top:2px;">
            ₹${profit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>

    <!-- ─── STAFF EXPENSE & ADVANCE BREAKDOWN ("KIS EMPLOYEE PE KITNA") ─── -->
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">👥</span>
          <div>
            <div style="font-size:15px;font-weight:800;color:#0F172A;">Staff Expense &amp; Advance Breakdown</div>
            <div style="font-size:11.5px;color:#64748B;">Tracking which employee took advance (salary-linked) vs operational claims (Rapido/petrol)</div>
          </div>
        </div>
        <button onclick="window.openStaffAdvanceModal()" class="btn-sm" style="background:#7C3AED;color:#fff;font-weight:700;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;">
          ➕ Record Staff Advance
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Advance (Salary Linked)</th>
              <th>Pending Salary Deduction</th>
              <th>Other Claims (Rapido/Food)</th>
              <th>Paid Via OD</th>
              <th>Paid Via Firoz/Co.</th>
              <th>Total Staff Outflow</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${staffSummaryList.length === 0
              ? '<tr><td colspan="9" class="sub" style="text-align:center;padding:16px;">No staff expenses or advances logged this period</td></tr>'
              : staffSummaryList.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.name)}</strong></td>
                  <td style="font-size:12px;color:#64748B;">${escapeHtml(s.role)}</td>
                  <td style="font-weight:700;color:#7C3AED;">₹${s.advances.toLocaleString('en-IN')}</td>
                  <td>
                    ${s.advancesPending > 0
                      ? `<span style="background:#FEE2E2;color:#991B1B;font-weight:700;padding:2px 8px;border-radius:999px;font-size:11px;">⚠️ ₹${s.advancesPending.toLocaleString('en-IN')} (Deduct Next Salary)</span>`
                      : `<span style="color:#059669;font-size:11.5px;font-weight:600;">✓ Fully Deducted</span>`
                    }
                  </td>
                  <td style="font-weight:600;color:#0F172A;">₹${s.otherSpends.toLocaleString('en-IN')}</td>
                  <td style="font-size:12px;color:#059669;font-weight:600;">₹${s.odPaid.toLocaleString('en-IN')}</td>
                  <td style="font-size:12px;color:#D97706;font-weight:600;">₹${s.companyPaid.toLocaleString('en-IN')}</td>
                  <td style="font-weight:800;color:#DC2626;font-size:13.5px;">₹${s.totalOutflow.toLocaleString('en-IN')}</td>
                  <td>
                    <button class="btn-sm" onclick="window.filterExpensesByStaff('${escapeHtml(s.name)}')" title="Filter all entries for this staff" style="padding:4px 8px;font-size:11px;">🔍 View Entries</button>
                    <button class="btn-sm" onclick="window.openStaffAdvanceModal('${s.emp_id}')" title="Give Advance" style="padding:4px 8px;font-size:11px;background:#7C3AED;color:#fff;border:none;">+ Adv</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- ─── UNIFIED FILTER CONTROLS ─── -->
    <div class="card" style="margin-bottom:16px;">
      <div class="section-title">🔍 Filter All Company Expenses</div>
      <div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;">
        <div class="form-group">
          <label style="font-size:12px;font-weight:700;">Month</label>
          <input type="month" id="expMonthFilter" value="${cm}" onchange="applyExpenseFilters()" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;" />
        </div>

        <div class="form-group">
          <label style="font-size:12px;font-weight:700;">Channel / Expense Type</label>
          <select id="expChannelFilter" onchange="applyExpenseFilters()" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:600;">
            <option value="all">All Channels (Laundry + Maint + Adv + Spends)</option>
            <option value="laundry">🧺 Laundry Spends</option>
            <option value="maintenance">🔧 Maintenance &amp; Wi-Fi</option>
            <option value="advance">🎁 Staff Advances (Salary Linked)</option>
            <option value="staff_spend">🛵 Staff Spends (Rapido / Supplies)</option>
            <option value="general">🧾 General Business Expenses</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:12px;font-weight:700;">Payment Source / Account</label>
          <select id="expSourceFilter" onchange="applyExpenseFilters()" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:600;">
            <option value="all">All Accounts (OD + Firoz/Company)</option>
            <option value="UHHS-OD">🏦 TUHH-OD (Overdraft Account)</option>
            <option value="COMPANY">🏢 COMPANY / FIROZ</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:12px;font-weight:700;">Staff / Employee</label>
          <select id="expStaffFilter" onchange="applyExpenseFilters()" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;">
            <option value="all">All Staff / Anyone</option>
            ${(emps || []).map(e => `<option value="${escapeHtml(e.name)}">👤 ${escapeHtml(e.name)}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:12px;font-weight:700;">Property / Unit</label>
          <select id="expRoomFilter" onchange="applyExpenseFilters()" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;">
            <option value="all">All Properties (18 Available)</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${escapeHtml(propLabel(r))}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- ─── UNIFIED EXPENSE TABLE WRAPPER ─── -->
    <div id="expTableWrap"></div>
  `, 'expenses');

  if (window.UHHSODManager) { window.UHHSODManager.calculateBalance(sb); }
  applyExpenseFilters();
}

// ============ FILTER + TABLE RENDERING ============
function applyExpenseFilters() {
  const wrap = document.getElementById('expTableWrap');
  if (!wrap) return;

  const monthVal = document.getElementById('expMonthFilter')?.value || '';
  const channelVal = document.getElementById('expChannelFilter')?.value || 'all';
  const sourceVal = document.getElementById('expSourceFilter')?.value || 'all';
  const staffVal = document.getElementById('expStaffFilter')?.value || 'all';
  const roomVal = document.getElementById('expRoomFilter')?.value || 'all';

  let list = (window._masterExpensesList || []);

  if (monthVal) {
    list = list.filter(e => (e.date || '').startsWith(monthVal) || e.monthYm === monthVal);
  }
  if (channelVal !== 'all') {
    list = list.filter(e => e.channel === channelVal);
  }
  if (sourceVal !== 'all') {
    list = list.filter(e => {
      if (sourceVal === 'UHHS-OD') return e.paidBy === 'UHHS-OD';
      return e.paidBy !== 'UHHS-OD';
    });
  }
  if (staffVal !== 'all') {
    list = list.filter(e => (e.staffName || '').toLowerCase().includes(staffVal.toLowerCase()));
  }
  if (roomVal !== 'all') {
    list = list.filter(e => e.roomId === roomVal);
  }

  const total = list.reduce((s, e) => s + (e.amount || 0), 0);
  window._currentFilteredExps = list;
  window._currentExpenseMonth = monthVal || 'All';

  wrap.innerHTML = `
    <div class="card">
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span>🧾 Filtered Entries</span>
          <span style="background:#FEE2E2;color:#991B1B;font-weight:800;font-size:12.5px;padding:3px 10px;border-radius:999px;">
            Total: ₹${total.toLocaleString('en-IN')} (${list.length} entries)
          </span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button type="button" class="btn-sm" onclick="window.exportExpensesCSV()" style="background:#059669;color:#fff;font-weight:700;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">
            📥 Export CSV
          </button>
          <button type="button" class="btn-sm" onclick="window.printExpensesReport()" style="background:#4F46E5;color:#fff;font-weight:700;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">
            🖨️ Print / PDF
          </button>
          <button type="button" class="btn-sm" onclick="window.shareExpensesWhatsApp()" style="background:#16A34A;color:#fff;font-weight:700;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;" title="Share on WhatsApp">
            💬 WhatsApp
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Channel</th>
              <th>Description / Purpose</th>
              <th>Property / Flat</th>
              <th>Staff / Payee</th>
              <th>Account (Source)</th>
              <th>Amount</th>
              <th>Salary Deductible?</th>
            </tr>
          </thead>
          <tbody>
            ${list.length === 0
              ? '<tr><td colspan="8" class="sub" style="text-align:center;padding:20px;">No expenses match the selected filters</td></tr>'
              : list.map(item => `
                <tr>
                  <td style="font-size:12px;white-space:nowrap;">${item.date || '-'}</td>
                  <td>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${getChannelBg(item.channel)};color:${getChannelColor(item.channel)};border:1px solid ${getChannelBorder(item.channel)};white-space:nowrap;">
                      ${item.channelLabel}
                    </span>
                  </td>
                  <td style="font-size:12.5px;max-width:220px;word-break:break-word;">
                    <strong>${escapeHtml(item.title)}</strong>
                    ${item.notes && item.notes !== item.title ? `<div style="font-size:11px;color:#64748B;">${escapeHtml(item.notes.slice(0, 60))}</div>` : ''}
                  </td>
                  <td style="font-size:12px;white-space:nowrap;">${escapeHtml(item.roomLabel || 'General')}</td>
                  <td style="font-size:12px;font-weight:600;white-space:nowrap;">${escapeHtml(item.staffName || '-')}</td>
                  <td>
                    <span style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;background:${item.paidBy === 'UHHS-OD' ? '#E0F2FE' : '#FEF3C7'};color:${item.paidBy === 'UHHS-OD' ? '#0369A1' : '#92400E'};white-space:nowrap;">
                      ${item.paidBy === 'UHHS-OD' ? '🏦 TUHH-OD' : '🏢 COMPANY (Firoz)'}
                    </span>
                  </td>
                  <td style="font-weight:800;color:#DC2626;font-size:13.5px;white-space:nowrap;">
                    ₹${item.amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    ${item.isSalaryDeductible
                      ? `<span style="background:#FEE2E2;color:#991B1B;font-weight:700;padding:2px 8px;border-radius:999px;font-size:10.5px;white-space:nowrap;">⚠️ YES (${item.deductionStatus})</span>`
                      : `<span style="color:#059669;font-size:11px;font-weight:600;white-space:nowrap;">🛡️ No (Company Paid)</span>`
                    }
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
          ${list.length > 0 ? `
            <tfoot>
              <tr style="font-weight:800;background:#F8FAFC;">
                <td colspan="6" style="text-align:right;">Total Filtered Outflow:</td>
                <td style="color:#DC2626;font-size:15px;">₹${total.toLocaleString('en-IN')}</td>
                <td></td>
              </tr>
            </tfoot>` : ''
          }
        </table>
      </div>
    </div>
  `;
}

function getChannelBg(ch) {
  if (ch === 'laundry') return '#E0F2FE';
  if (ch === 'maintenance') return '#FEF3C7';
  if (ch === 'advance') return '#F3E8FF';
  if (ch === 'staff_spend') return '#F1F5F9';
  return '#F8FAFC';
}

function getChannelColor(ch) {
  if (ch === 'laundry') return '#0369A1';
  if (ch === 'maintenance') return '#92400E';
  if (ch === 'advance') return '#6B21A8';
  if (ch === 'staff_spend') return '#334155';
  return '#475569';
}

function getChannelBorder(ch) {
  if (ch === 'laundry') return '#BAE6FD';
  if (ch === 'maintenance') return '#FDE68A';
  if (ch === 'advance') return '#E9D5FF';
  if (ch === 'staff_spend') return '#CBD5E1';
  return '#E2E8F0';
}

window.filterExpensesByStaff = function(staffName) {
  const staffSelect = document.getElementById('expStaffFilter');
  if (staffSelect) {
    staffSelect.value = staffName;
    applyExpenseFilters();
    staffSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// ═══════════════════════════════════════════════════════════
// 🎁 QUICK STAFF ADVANCE MODAL (SALARY LINKED DEDUCTION)
// ═══════════════════════════════════════════════════════════
window.openStaffAdvanceModal = async function(preselectedEmpId = '') {
  const { data: emps } = await sb.from('employees').select('emp_id, name, role, salary').eq('status', 'Active').order('name');
  const modalId = 'staffAdvanceModal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const today = new Date().toISOString().slice(0, 10);

  const html = `
    <div id="${modalId}" class="modal-backdrop active" style="display:flex;align-items:center;justify-content:center;z-index:99999;position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);padding:16px;">
      <div class="card" style="max-width:520px;width:100%;border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;background:#fff;max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">🎁</span>
            <div>
              <h2 style="margin:0;font-size:17px;font-weight:800;color:#1e293b;">Give Advance to Staff</h2>
              <div style="font-size:12px;color:#64748b;">Linked to employee salary ledger (Deductible on payout)</div>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">✕</button>
        </div>

        <div style="background:#FAF5FF;border:1.5px solid #D8B4FE;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#6B21A8;line-height:1.45;">
          📌 <strong>SALARY LINKED ADVANCE:</strong> Ye amount employee ke record me save hoga aur jab aap uski monthly salary denge, to ye paisa <strong>automatically deduct</strong> ho jayega.
        </div>

        <form id="staffAdvanceForm" onsubmit="window.saveStaffAdvance(event)">
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12.5px;font-weight:700;">Employee *</label>
            <select id="advEmpId" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-weight:600;">
              <option value="">Select Employee</option>
              ${(emps || []).map(e => `<option value="${e.emp_id}" ${preselectedEmpId === e.emp_id ? 'selected' : ''}>${escapeHtml(e.name)} (${e.role || 'Staff'}) — Salary: ₹${Number(e.salary||0).toLocaleString('en-IN')}</option>`).join('')}
            </select>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Advance Amount ₹ *</label>
              <input id="advAmount" type="number" required placeholder="e.g. 3000" min="1" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-weight:700;" />
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Date Given *</label>
              <input id="advDate" type="date" value="${today}" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12.5px;font-weight:700;">Reason / Purpose *</label>
            <input id="advReason" required placeholder="e.g. Personal emergency, Festival advance, Rent help" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Paid From (Source) *</label>
              <select id="advPaidBy" style="width:100%;padding:9px;border:1.5px solid #0d6efd;border-radius:10px;font-weight:700;">
                <option value="UHHS-OD">🏦 TUHH-OD Account</option>
                <option value="COMPANY">🏢 COMPANY / FIROZ</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Payment Mode</label>
              <select id="advMode" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;">
                <option value="UPI / Online">📱 UPI / Online Transfer</option>
                <option value="Cash">💵 Cash in Hand</option>
                <option value="Bank Transfer">🏛️ Net Banking</option>
              </select>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button type="button" class="secondary" onclick="document.getElementById('${modalId}').remove()" style="flex:1;">Cancel</button>
            <button type="submit" id="advSubmitBtn" style="flex:2;background:#7C3AED;color:#fff;font-weight:800;border:none;border-radius:10px;padding:10px;">💾 Save &amp; Link to Salary</button>
          </div>
          <div id="advModalErr" style="margin-top:8px;"></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.saveStaffAdvance = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('advSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  try {
    const empId = document.getElementById('advEmpId').value;
    const amount = parseFloat(document.getElementById('advAmount').value) || 0;
    const date = document.getElementById('advDate').value;
    const reason = document.getElementById('advReason').value.trim();
    const paidBy = document.getElementById('advPaidBy').value;
    const mode = document.getElementById('advMode').value;

    if (!empId || amount <= 0 || !reason) {
      document.getElementById('advModalErr').innerHTML = '<div class="error">Please fill all required fields.</div>';
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Link to Salary'; }
      return;
    }

    const { error } = await sb.from('advance_tracker').insert({
      emp_id: empId,
      date_given: date,
      advance_amount: amount,
      repaid_amount: 0,
      reason: reason,
      payment_mode: mode,
      paid_by: paidBy,
      is_deducted: false
    });

    if (error) throw error;

    document.getElementById('staffAdvanceModal')?.remove();
    if (window.fsn?.success) fsn.success('Advance Saved', `✅ ₹${amount.toLocaleString('en-IN')} advance recorded. Linked to next salary payout.`);
    renderExpenses();
  } catch (err) {
    document.getElementById('advModalErr').innerHTML = `<div class="error">${err.message || 'Error saving advance'}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Link to Salary'; }
  }
};

// ═══════════════════════════════════════════════════════════
// 🧺 QUICK LAUNDRY BILL MODAL
// ═══════════════════════════════════════════════════════════
window.openLaundryQuickModal = async function() {
  const { data: rooms } = await sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no');
  const modalId = 'laundryQuickModal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const today = new Date().toISOString().slice(0, 10);

  const html = `
    <div id="${modalId}" class="modal-backdrop active" style="display:flex;align-items:center;justify-content:center;z-index:99999;position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);padding:16px;">
      <div class="card" style="max-width:520px;width:100%;border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;background:#fff;max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">🧺</span>
            <div>
              <h2 style="margin:0;font-size:17px;font-weight:800;color:#1e293b;">Log Laundry Payment</h2>
              <div style="font-size:12px;color:#64748b;">Record washerman / dry cleaning bill for properties</div>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">✕</button>
        </div>

        <form id="laundryQuickForm" onsubmit="window.saveLaundryQuick(event)">
          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Vendor / Washerman Name *</label>
              <input id="lqVendor" required placeholder="e.g. Ramesh Dhobi / Star Cleaners" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Property / Unit</label>
              <select id="lqRoomId" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;">
                <option value="">All Units / General</option>
                ${(rooms || []).map(r => `<option value="${r.room_id}">${escapeHtml(propLabel(r))}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Bill Amount ₹ *</label>
              <input id="lqAmount" type="number" required placeholder="e.g. 1450" min="1" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-weight:700;" />
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Payment Date *</label>
              <input id="lqDate" type="date" value="${today}" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Paid Via *</label>
              <select id="lqPaidBy" style="width:100%;padding:9px;border:1.5px solid #0d6efd;border-radius:10px;font-weight:700;">
                <option value="UHHS-OD">🏦 TUHH-OD Account</option>
                <option value="COMPANY">🏢 COMPANY / FIROZ</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Payment Mode</label>
              <select id="lqMode" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;">
                <option value="UPI">📱 UPI QR Transfer</option>
                <option value="Cash">💵 Cash</option>
                <option value="Bank Transfer">🏛️ Net Banking</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-size:12.5px;font-weight:700;">Notes / Description</label>
            <input id="lqNotes" placeholder="e.g. 40 Bedsheets, 60 Pillow covers washed" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
          </div>

          <div style="display:flex;gap:10px;">
            <button type="button" class="secondary" onclick="document.getElementById('${modalId}').remove()" style="flex:1;">Cancel</button>
            <button type="submit" id="lqSubmitBtn" style="flex:2;background:#0284C7;color:#fff;font-weight:800;border:none;border-radius:10px;padding:10px;">💾 Save Laundry Bill</button>
          </div>
          <div id="lqModalErr" style="margin-top:8px;"></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.saveLaundryQuick = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('lqSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  try {
    const vendor = document.getElementById('lqVendor').value.trim();
    const roomId = document.getElementById('lqRoomId').value || null;
    const amount = parseFloat(document.getElementById('lqAmount').value) || 0;
    const date = document.getElementById('lqDate').value;
    const paidBy = document.getElementById('lqPaidBy').value;
    const mode = document.getElementById('lqMode').value;
    const notes = document.getElementById('lqNotes').value.trim();

    if (!vendor || amount <= 0) {
      document.getElementById('lqModalErr').innerHTML = '<div class="error">Vendor and Amount are required.</div>';
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save Laundry Bill'; }
      return;
    }

    const { error } = await sb.from('laundry_payments').insert({
      amount: amount,
      payment_date: date,
      payment_mode: mode,
      notes: `[Vendor: ${vendor}] ${notes}`,
      payment_source: paidBy,
      claim_status: 'unclaimed'
    });

    if (error) throw error;

    document.getElementById('laundryQuickModal')?.remove();
    if (window.fsn?.success) fsn.success('Laundry Saved', `✅ ₹${amount.toLocaleString('en-IN')} laundry bill logged.`);
    renderExpenses();
  } catch (err) {
    document.getElementById('lqModalErr').innerHTML = `<div class="error">${err.message || 'Error saving laundry bill'}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Laundry Bill'; }
  }
};

// ============ EXPORT EXPENSES TO CSV / EXCEL ============
window.exportExpensesCSV = function() {
  const exps = window._currentFilteredExps || window._allExps || [];
  if (!exps.length) {
    if (window.fsn) fsn.info('Info', 'No expenses found to export.');
    return;
  }

  const mName = window._currentExpenseMonth || 'All';
  let csv = `THE UNIQUE HAVEN HOMES PRIVATE LIMITED - EXPENSES & P&L REGISTER\n`;
  csv += `Period,${mName}\n`;
  csv += `Exported On,${new Date().toLocaleString('en-IN')}\n`;
  csv += `Total Expenses Count,${exps.length}\n`;
  const totalAmt = exps.reduce((s, e) => s + (e.amount || 0), 0);
  csv += `Total Amount,Rs. ${totalAmt.toLocaleString('en-IN')}\n\n`;

  // Headers
  csv += `Month,Category,Property / Unit,Amount (INR),Date,Source / Account,Notes,Entry ID\n`;

  exps.forEach(e => {
    const m = (e.month || '').replace(/"/g, '""');
    const c = (e.expense_categories?.category_name || '-').replace(/"/g, '""');
    const p = (propLabel(e.rooms) || e.room_id || 'General').replace(/"/g, '""');
    const a = e.amount || 0;
    const d = e.entry_date || '-';
    const s = (e.payment_source || '-').replace(/"/g, '""');
    const n = (e.notes || '').replace(/"/g, '""').replace(/\n/g, ' ');
    const id = e.id || '';
    csv += `"${m}","${c}","${p}",${a},"${d}","${s}","${n}",${id}\n`;
  });

  csv += `\n"Total",,,"${totalAmt}",,,,\n`;
  csv += `\n"THE UNIQUE HAVEN HOMES PRIVATE LIMITED"\n"CIN: U55101UP2024PTC202863 · uniquehavenhomesstay.com"\n`;

  const fileName = `TUHH_Expenses_${String(mName).replace(/[\s\/-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  window.exportCSV(csv, fileName);
};

// ============ PRINT EXPENSES REPORT ============
window.printExpensesReport = function() {
  const exps = window._currentFilteredExps || window._allExps || [];
  if (!exps.length) {
    if (window.fsn) fsn.info('Info', 'No expenses to print.');
    return;
  }

  const mName = window._currentExpenseMonth || 'All Months';
  const totalAmt = exps.reduce((s, e) => s + (e.amount || 0), 0);

  // Group by category for summary
  const catMap = {};
  exps.forEach(e => {
    const c = e.expense_categories?.category_name || 'Uncategorized';
    catMap[c] = (catMap[c] || 0) + (e.amount || 0);
  });

  const catRows = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `
      <tr style="border-bottom:1px solid #CBD5E1;">
        <td style="padding:6px 10px;font-weight:600;border:1px solid #CBD5E1;">${escapeHtml(cat)}</td>
        <td style="padding:6px 10px;text-align:right;font-weight:700;color:#DC2626;white-space:nowrap;border:1px solid #CBD5E1;">₹${amt.toLocaleString('en-IN')}</td>
        <td style="padding:6px 10px;text-align:right;color:#64748B;white-space:nowrap;border:1px solid #CBD5E1;">${((amt / (totalAmt || 1)) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

  const rows = exps.map((e, idx) => `
    <tr style="border-bottom:1px solid #CBD5E1;background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
      <td style="padding:5px 6px;text-align:center;color:#64748B;font-size:11px;border:1px solid #CBD5E1;">${idx + 1}</td>
      <td style="padding:5px 6px;font-weight:600;white-space:nowrap;font-size:11px;border:1px solid #CBD5E1;">${escapeHtml(e.month || '-')}</td>
      <td style="padding:5px 6px;font-size:11px;border:1px solid #CBD5E1;">${escapeHtml(e.expense_categories?.category_name || '-')}</td>
      <td style="padding:5px 6px;font-size:11px;border:1px solid #CBD5E1;">${escapeHtml(propLabel(e.rooms) || e.room_id || 'General')}</td>
      <td style="padding:5px 6px;text-align:right;font-weight:700;color:#DC2626;white-space:nowrap;font-size:11.5px;border:1px solid #CBD5E1;">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
      <td style="padding:5px 6px;font-size:11px;color:#475569;white-space:nowrap;text-align:center;border:1px solid #CBD5E1;">${escapeHtml(e.entry_date || '-')}</td>
      <td style="padding:5px 6px;font-size:11px;color:#334155;white-space:nowrap;text-align:center;border:1px solid #CBD5E1;">${escapeHtml(e.payment_source || '-')}</td>
      <td style="padding:5px 6px;font-size:10.5px;color:#64748B;border:1px solid #CBD5E1;word-break:break-word;">${escapeHtml(e.notes || '-')}</td>
    </tr>
  `).join('');

  const html = `
    <div style="width:100%;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;line-height:1.35;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0F766E;padding-bottom:10px;margin-bottom:12px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:22px;">🏡</span>
            <div>
              <h1 style="margin:0;font-size:17px;font-weight:900;color:#0F172A;">THE UNIQUE HAVEN HOMES PRIVATE LIMITED</h1>
              <div style="font-size:11px;color:#64748B;font-weight:600;margin-top:2px;">CIN: U55101UP2024PTC202863 · Expenses &amp; Cost Disbursement Ledger</div>
            </div>
          </div>
          <div style="margin-top:6px;display:inline-block;background:#F0FDFA;border:1px solid #99F6E4;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:800;color:#0F766E;">
            📊 Period: <strong>${escapeHtml(mName)}</strong>
          </div>
        </div>
        <div style="text-align:right;background:#FEF2F2;border:1.5px solid #FCA5A5;padding:8px 14px;border-radius:8px;min-width:160px;">
          <div style="font-size:10px;color:#991B1B;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">TOTAL EXPENSES</div>
          <div style="font-size:20px;color:#DC2626;font-weight:900;margin-top:2px;">₹${totalAmt.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#64748B;">${exps.length} Total Records</div>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <h3 style="margin:0 0 6px;font-size:13px;color:#1E293B;">📊 Category-wise Expense Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;background:#F8FAFC;border:1.5px solid #CBD5E1;">
          <thead>
            <tr style="background:#0F172A;color:#fff;text-align:left;">
              <th style="padding:6px 10px;border:1px solid #334155;">Category</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #334155;">Total Spent (₹)</th>
              <th style="padding:6px 10px;text-align:right;border:1px solid #334155;">Share %</th>
            </tr>
          </thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>

      <div style="margin-bottom:14px;overflow-x:auto;">
        <h3 style="margin:0 0 6px;font-size:13px;color:#1E293B;">🧾 Itemized Expense Entries (${exps.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;border:1.5px solid #0F172A;">
          <thead>
            <tr style="background:#0F172A;color:#fff;text-align:left;">
              <th style="padding:6px 5px;text-align:center;width:26px;border:1px solid #334155;">#</th>
              <th style="padding:6px 6px;white-space:nowrap;width:65px;border:1px solid #334155;">Month</th>
              <th style="padding:6px 8px;border:1px solid #334155;">Category</th>
              <th style="padding:6px 8px;border:1px solid #334155;">Property / Unit</th>
              <th style="padding:6px 8px;text-align:right;white-space:nowrap;width:80px;border:1px solid #334155;">Amount (₹)</th>
              <th style="padding:6px 6px;text-align:center;white-space:nowrap;width:75px;border:1px solid #334155;">Date</th>
              <th style="padding:6px 6px;text-align:center;white-space:nowrap;width:75px;border:1px solid #334155;">Account</th>
              <th style="padding:6px 8px;border:1px solid #334155;">Notes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#F1F5F9;font-weight:900;border-top:2px solid #0F172A;">
              <td colspan="4" style="padding:7px 8px;text-align:right;font-size:11px;border:1px solid #CBD5E1;">GRAND TOTAL:</td>
              <td style="padding:7px 8px;text-align:right;color:#DC2626;font-size:12px;white-space:nowrap;border:1px solid #CBD5E1;">₹${totalAmt.toLocaleString('en-IN')}</td>
              <td colspan="3" style="border:1px solid #CBD5E1;"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="margin-top:14px;padding-top:8px;border-top:1px solid #E2E8F0;font-size:10px;color:#94A3B8;text-align:center;">
        THE UNIQUE HAVEN HOMES PRIVATE LIMITED · CIN: U55101UP2024PTC202863 · uniquehavenhomesstay.com
      </div>
    </div>
  `;

  window.printDocumentHTML(html, `TUHH_Expenses_Report_${String(mName).replace(/[\s\/-]/g, '_')}`);
};

// ============ WHATSAPP EXPENSES SUMMARY ============
window.shareExpensesWhatsApp = function(monthStr = null) {
  const mName = monthStr || window.CURRENT_MONTH || 'Current Month';
  const exps = window._currentFilteredExpenses || window._lastFetchedExpenses || [];
  const totalAmt = exps.reduce((s, e) => s + (e.amount || 0), 0);

  if (!exps.length) {
    if (window.fsn) fsn.info('No Data', 'Share karne ke liye koi expense data nahi mila.');
    else alert('No expenses to share.');
    return;
  }

  const byCat = {};
  exps.forEach(e => {
    const c = e.expense_categories?.category_name || 'General';
    byCat[c] = (byCat[c] || 0) + (e.amount || 0);
  });

  let msg = `*THE UNIQUE HAVEN HOMES PRIVATE LIMITED*\n`;
  msg += `*📊 Monthly Expenses & Cost Summary*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 *Period:* ${mName}\n`;
  msg += `💰 *Total Spent:* ₹${totalAmt.toLocaleString('en-IN')}\n`;
  msg += `🧾 *Total Entries:* ${exps.length}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Category Breakdown:*\n`;

  Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      const pct = ((amt / (totalAmt || 1)) * 100).toFixed(1);
      msg += `• ${cat}: ₹${amt.toLocaleString('en-IN')} (${pct}%)\n`;
    });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Hospitality Operations Financial Summary_\n`;
  msg += `🌐 uniquehavenhomesstay.com`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

// ============ CATEGORY BADGE COLOR ============
function getCategoryBadge(catName) {
  if (!catName) return 'yellow';
  const n = catName.toLowerCase();
  if (n.includes('salary') || n.includes('wage'))       return 'blue';
  if (n.includes('electric') || n.includes('utility'))  return 'yellow';
  if (n.includes('repair') || n.includes('maintenance'))return 'red';
  if (n.includes('grocery') || n.includes('food'))      return 'green';
  if (n.includes('laundry') || n.includes('wash'))      return 'blue';
  if (n.includes('tax') || n.includes('govt'))          return 'red';
  return 'yellow';
}

// ============ ADD CATEGORY ============
async function renderAddExpCat() {
  renderShell(`
    <div class="card">
      <h1>➕ Add Category</h1>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Category Name *</label>
        <input id="cName" placeholder="e.g. Electricity, Salary, WiFi" />
      </div>
      <div class="form-group">
        <label>Default Monthly ₹</label>
        <input id="cAmt" type="number" placeholder="Optional" />
      </div>
      <button onclick="saveExpCat()" style="width:100%;margin-top:10px;">
        💾 Save Category
      </button>
      <div id="cErr"></div>
    </div>
  `, 'expenses');
}

async function saveExpCat() {
  const _btn = document.querySelector('button[onclick="saveExpCat()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const name = document.getElementById('cName').value.trim();
  if (!name) {
    document.getElementById('cErr').innerHTML =
      '<div class="error">Name required</div>';
    return;
  }
  const amt = parseFloat(document.getElementById('cAmt').value) || null;

  const { error } = await sb.from('expense_categories').insert({
    category_id: 'CAT' + Date.now(),
    category_name: name,
    default_monthly_amount: amt
  });

  if (error) {
    document.getElementById('cErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }
  fsn.success('Success', '✅ Category saved!');
  renderExpenses();
}

// ============ LOG EXPENSE ============
async function renderAddExpEntry() {
  const [{ data: cats }, { data: rooms }] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no')
  ]);
  window._expCats = cats || [];

  const ml = new Date()
    .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    .replace(' ', '-');
  const today = new Date().toISOString().slice(0, 10);

  renderShell(`
    <div class="card">
      <h1>🧾 Log Expense</h1>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
    </div>

    <!-- 📸 AI SMART RECEIPT SCANNER -->
    <div class="card" style="background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 60%, #EEF2FF 100%); border: 1.5px dashed #10B981; border-radius: 14px; padding: 18px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 28px;">📸</span>
          <div>
            <div style="font-weight: 800; font-size: 15px; color: #065F46;">Smart AI Receipt &amp; Bill Scanner</div>
            <div style="font-size: 12px; color: #047857;">Grocery, plumbing, repairs, store ya utility bill ka photo upload karein — AI auto-fill kar dega!</div>
          </div>
        </div>
        <span class="badge green" style="font-weight: 700; font-size: 11px; padding: 4px 10px;">✨ 1-Tap Auto Extract</span>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; align-items: center;">
        <button type="button" onclick="document.getElementById('receiptFileInput').click()" style="background: #059669; color: #fff; font-weight: 700; border: none; padding: 10px 18px; border-radius: 8px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(5,150,105,0.25); font-size: 13px;">
          📷 Camera / Upload Bill Photo
        </button>
        <span style="font-size: 12px; color: #6B7280;">Supports JPG, PNG, WebP (Handwritten &amp; Printed)</span>
        <input type="file" id="receiptFileInput" accept="image/*" capture="environment" style="display: none;" onchange="window.handleReceiptScan(event)" />
      </div>

      <div id="receiptScanStatus" style="display: none; margin-top: 12px;"></div>
    </div>

    <div class="card">
      <div class="form-group">
        <label>Category *</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="exCat" onchange="onExpCatChg()" style="flex:1;">
            <option value="">Select</option>
            ${(cats || []).map(c =>
              `<option value="${c.category_id}">${c.category_name}</option>`
            ).join('')}
          </select>
          <button type="button" class="btn-sm secondary"
            onclick="toggleInlineCatForm()"
            style="white-space:nowrap;padding:8px 12px;">
            ➕ New
          </button>
        </div>
      </div>

      <div id="inlineCatForm" style="display:none;background:#f0f7ff;
        border-left:3px solid var(--blue);padding:12px;
        border-radius:8px;margin-bottom:8px;">
        <div style="font-weight:600;margin-bottom:8px;font-size:13px;">
          ➕ Add New Category
        </div>
        <div class="form-grid" style="margin-bottom:8px;">
          <div class="form-group" style="margin:0;">
            <input id="inlineCatName" placeholder="Category name *"
              style="font-size:13px;" />
          </div>
          <div class="form-group" style="margin:0;">
            <input id="inlineCatAmt" type="number"
              placeholder="Default ₹/month"
              style="font-size:13px;" />
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" onclick="saveInlineCategory()"
            style="flex:1;padding:8px;font-size:13px;">
            💾 Save Category
          </button>
          <button type="button" class="secondary"
            onclick="toggleInlineCatForm()"
            style="padding:8px 12px;font-size:13px;">
            ✕
          </button>
        </div>
        <div id="inlineCatErr" style="margin-top:6px;"></div>
      </div>

      <div id="exCatInfo" class="sub" style="margin-bottom:8px;"></div>
      <div class="form-group">
        <label>Property</label>
        <select id="exRoom">
          <option value="">General / All</option>
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}">${propLabel(r)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Month *</label>
          <input id="exMo" value="${ml}" placeholder="e.g. Jun-2025" />
        </div>
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="exAmt" type="number" placeholder="0" />
        </div>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input id="exDate" type="date" value="${today}" />
      </div>
      
      <!-- 💰 Payment Info -->
      <div style="padding:12px;background:#FFF9E6;border:1px solid #FCD34D;border-radius:8px;margin:8px 0;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#92400E;">💰 Payment Info</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Payment Mode *</label>
            <select id="exPayMode" onchange="onExpPayModeChange()">
              <option value="">-- Select --</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
          <div class="form-group">
            <label id="exPaidByLabel">💵 Paid By *</label>
            <select id="exPaidBy">
              <option value="">-- Select --</option>
            </select>
            <input id="exPaidByCustom" type="text" placeholder="Custom name..." style="display:none;margin-top:6px;" />
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <textarea id="exNotes" placeholder="Optional details..."></textarea>
      </div>
      <button onclick="saveExpEntry()" style="width:100%;margin-top:10px;">
        💾 Save Expense
      </button>
      <div id="exErr"></div>
    </div>
  `, 'expenses');
}

// ═══════════════════════════════════════════════════════════
// 📸 SMART AI RECEIPT & BILL SCANNER ENGINE
// ═══════════════════════════════════════════════════════════
window.handleReceiptScan = async function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('receiptScanStatus');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;color:#065F46;font-weight:600;padding:10px 14px;background:#F0FDF4;border-radius:8px;border:1px solid #A7F3D0;">
        <span class="spinner" style="width:16px;height:16px;border:2px solid #059669;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 0.8s linear infinite;"></span>
        <span>AI is scanning bill details (Vendor, Total Amount, Date, Category)...</span>
      </div>
    `;
  }

  try {
    // 1. Read file as base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        const b64 = res.split(',')[1];
        resolve({ full: res, base64: b64, mimeType: file.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    let extractedData = null;

    // 2. Try Gemini Vision AI if API key is present
    const apiKey = (typeof window !== 'undefined' && window.GEMINI_API_KEY) ||
      localStorage.getItem('uhh_gemini_api_key') ||
      sessionStorage.getItem('uhh_gemini_api_key') || '';

    if (apiKey && apiKey.length > 15) {
      try {
        const promptText = `You are an expert expense parser for The Unique Haven Homes homestays (Lucknow). Analyze this bill/receipt photo (could be handwritten, Hindi, English, cash memo, grocery kirana, plumbing, hardware, repairs, electricity, laundry).
Extract the following information and output ONLY valid JSON without markdown codeblocks:
{
  "vendor": "Name of shop, store or person (e.g. Sharma Kirana, Gupta Hardware, Plumber Rohit)",
  "amount": 1250,
  "date": "YYYY-MM-DD",
  "category_hint": "Maintenance & Repairs | Grocery & Kitchen | Housekeeping & Toiletries | Electricity & Utilities | Laundry | Staff & Salary | Miscellaneous",
  "notes": "Short itemized list of items/services"
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptText },
                { inlineData: { mimeType: base64Data.mimeType, data: base64Data.base64 } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
          })
        });

        if (resp.ok) {
          const resJson = await resp.json();
          const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && (parsed.amount || parsed.vendor)) {
            extractedData = parsed;
            console.log('🤖 Gemini Vision extracted receipt:', extractedData);
          }
        }
      } catch(err) {
        console.warn('Gemini vision API error, falling back to heuristic parser:', err);
      }
    }

    // 3. Fallback Heuristics / Fast Offline Parser
    if (!extractedData) {
      const todayIso = new Date().toISOString().slice(0, 10);
      const filename = (file.name || '').toLowerCase();
      let hintCat = 'Maintenance & Repairs';
      if (/kirana|grocery|sabzi|ration|milk|food/i.test(filename)) hintCat = 'Grocery & Kitchen';
      else if (/plumb|hardware|paint|repair|ac|pipe/i.test(filename)) hintCat = 'Maintenance & Repairs';
      else if (/toilet|soap|harpic|clean|surf|phenyl/i.test(filename)) hintCat = 'Housekeeping & Toiletries';
      else if (/bijli|electric|power|bill|uppcl/i.test(filename)) hintCat = 'Electricity & Utilities';

      extractedData = {
        vendor: 'Receipt Scan',
        amount: null,
        date: todayIso,
        category_hint: hintCat,
        notes: `Bill photo scanned (${file.name || 'Receipt'})`
      };
    }

    // 4. Auto-populate Form Fields
    if (extractedData.amount) {
      const amtInput = document.getElementById('exAmt');
      if (amtInput) amtInput.value = extractedData.amount;
    }
    if (extractedData.date) {
      const dateInput = document.getElementById('exDate');
      if (dateInput) {
        dateInput.value = extractedData.date;
        const moInput = document.getElementById('exMo');
        if (moInput && extractedData.date) {
          try {
            const d = new Date(extractedData.date);
            moInput.value = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');
          } catch(e) {}
        }
      }
    }
    if (extractedData.vendor || extractedData.notes) {
      const notesInput = document.getElementById('exNotes');
      if (notesInput) {
        const parts = [];
        if (extractedData.vendor && extractedData.vendor !== 'Receipt Scan') parts.push(extractedData.vendor);
        if (extractedData.notes) parts.push(extractedData.notes);
        notesInput.value = parts.join(' — ') || notesInput.value;
      }
    }

    // Auto-match category dropdown
    const catSelect = document.getElementById('exCat');
    if (catSelect && extractedData.category_hint) {
      const hint = extractedData.category_hint.toLowerCase();
      let matchedOpt = null;
      for (let i = 0; i < catSelect.options.length; i++) {
        const optText = catSelect.options[i].text.toLowerCase();
        if (
          (hint.includes('repair') && optText.includes('repair')) ||
          (hint.includes('maint') && optText.includes('maint')) ||
          (hint.includes('groc') && optText.includes('groc')) ||
          (hint.includes('kitchen') && optText.includes('kitchen')) ||
          (hint.includes('electr') && optText.includes('electr')) ||
          (hint.includes('clean') && optText.includes('clean')) ||
          (hint.includes('toilet') && optText.includes('toilet')) ||
          (hint.includes('laund') && optText.includes('laund'))
        ) {
          matchedOpt = catSelect.options[i].value;
          break;
        }
      }
      if (matchedOpt) {
        catSelect.value = matchedOpt;
        if (typeof onExpCatChg === 'function') onExpCatChg();
      }
    }

    // Default payment mode to Cash or UPI
    const payModeSel = document.getElementById('exPayMode');
    if (payModeSel && !payModeSel.value) {
      payModeSel.value = 'Cash';
      if (typeof onExpPayModeChange === 'function') onExpPayModeChange();
    }

    // 5. Update UI with Success Badge & Thumbnail
    if (statusEl) {
      const amtStr = extractedData.amount ? `₹${Number(extractedData.amount).toLocaleString('en-IN')}` : 'Enter amount';
      statusEl.style.display = 'block';
      statusEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;background:#ECFDF5;border:1.5px solid #10B981;border-radius:10px;padding:12px 14px;">
          <img src="${base64Data.full}" alt="Receipt" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid #6EE7B7;box-shadow:0 2px 6px rgba(0,0,0,0.1);" />
          <div style="flex:1;">
            <div style="font-weight:800;color:#065F46;font-size:14px;display:flex;align-items:center;gap:6px;">
              <span>✅ Bill Scanned Successfully!</span>
              <span class="badge green" style="font-size:12px;">${amtStr}</span>
            </div>
            <div style="font-size:12px;color:#047857;margin-top:2px;">
              <strong>${extractedData.vendor || 'Vendor'}</strong> • ${extractedData.category_hint || 'Expense'} • Date: ${extractedData.date || 'Today'}
            </div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px;">
              Details auto-filled below. Review and tap "💾 Save Expense"!
            </div>
          </div>
        </div>
      `;
    }

    if (window.fsn) fsn.success('Scanned', `✅ Bill details extracted: ${extractedData.amount ? '₹' + extractedData.amount : 'Ready to save'}`);

  } catch(err) {
    console.error('Receipt scan error:', err);
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `
        <div style="color:#DC2626;font-size:13px;padding:8px 12px;background:#FEE2E2;border-radius:8px;">
          ⚠️ Could not auto-read receipt: ${err.message}. Please enter details manually below.
        </div>
      `;
    }
  }
};

function onExpCatChg() {
  const c = (window._expCats || [])
    .find(x => x.category_id === document.getElementById('exCat').value);
  if (c?.default_monthly_amount) {
    document.getElementById('exCatInfo').innerHTML =
      `💡 Default: ₹${c.default_monthly_amount.toLocaleString('en-IN')}`;
    document.getElementById('exAmt').value = c.default_monthly_amount;
  } else {
    document.getElementById('exCatInfo').innerHTML = '';
  }
}

// ============ INLINE CATEGORY (from expense form) ============
function toggleInlineCatForm() {
  const form = document.getElementById('inlineCatForm');
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    document.getElementById('inlineCatName').focus();
    document.getElementById('inlineCatErr').innerHTML = '';
  }
}

async function saveInlineCategory() {
  const btn = document.querySelector('button[onclick="saveInlineCategory()"]');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳...'; }

  const name = (document.getElementById('inlineCatName')?.value || '').trim();
  const amt  = parseFloat(document.getElementById('inlineCatAmt')?.value) || null;

  if (!name) {
    document.getElementById('inlineCatErr').innerHTML =
      '<div class="error" style="font-size:12px;">Category name required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Category'; }
    return;
  }

  const newId = 'EXP' + Date.now();

  const { error } = await sb.from('expense_categories').insert({
    category_id: newId,
    category_name: name,
    default_monthly_amount: amt
  });

  if (error) {
    document.getElementById('inlineCatErr').innerHTML =
      `<div class="error" style="font-size:12px;">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Category'; }
    return;
  }

  // Add to window cache
  const newCat = { category_id: newId, category_name: name, default_monthly_amount: amt };
  window._expCats = [...(window._expCats || []), newCat];

  // Add to dropdown + select it
  const sel = document.getElementById('exCat');
  if (sel) {
    const opt = document.createElement('option');
    opt.value = newId;
    opt.textContent = name;
    sel.appendChild(opt);
    sel.value = newId;
  }

  // Show default hint if amt given
  if (amt) {
    document.getElementById('exCatInfo').innerHTML =
      `💡 Default: ₹${amt.toLocaleString('en-IN')}`;
    const amtInput = document.getElementById('exAmt');
    if (amtInput && !amtInput.value) amtInput.value = amt;
  }

  // Hide form + reset
  document.getElementById('inlineCatName').value = '';
  document.getElementById('inlineCatAmt').value  = '';
  document.getElementById('inlineCatErr').innerHTML = '';
  document.getElementById('inlineCatForm').style.display = 'none';

  fsn.success('Success', `✅ "${name}" category added!`);

  if (btn) { btn.disabled = false; btn.textContent = '💾 Save Category'; }
}

async function saveExpEntry() {
  if (window._isSavingExpEntry) return;
  window._isSavingExpEntry = true;

  const btn = document.querySelector('button[onclick="saveExpEntry()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const cid    = document.getElementById('exCat').value;
  const mo     = document.getElementById('exMo').value.trim();
  const amt    = parseFloat(document.getElementById('exAmt').value) || 0;
  const roomId = document.getElementById('exRoom').value || null;
  const date   = document.getElementById('exDate').value || null;
  const notes  = document.getElementById('exNotes').value.trim() || null;

  if (!cid || !mo || amt <= 0) {
    document.getElementById('exErr').innerHTML =
      '<div class="error">Category, month & amount required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
    window._isSavingExpEntry = false;
    return;
  }

  const paidBy = getExpPaidBy();
  const payMode = document.getElementById('exPayMode')?.value || null;
  
  if (!paidBy || !payMode) {
    document.getElementById('exErr').innerHTML = '<div class="error">⚠️ Payment Mode aur Paid By required hain</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
    window._isSavingExpEntry = false;
    return;
  }

  try {
    // 🚨 DUPLICATE EXPENSE CHECK
    let dupeQuery = sb.from('expenses')
      .select('id, amount, month, category_id, entry_date, notes')
      .eq('category_id', cid)
      .eq('amount', amt)
      .eq('month', mo);
    if (roomId) dupeQuery = dupeQuery.eq('room_id', roomId);
    if (date) dupeQuery = dupeQuery.eq('entry_date', date);

    const { data: existingDupes } = await dupeQuery.limit(1);
    if (existingDupes && existingDupes.length > 0) {
      const ok = confirm(
        `⚠️ DUPLICATE EXPENSE WARNING!\n\n` +
        `Amount: ₹${amt.toLocaleString('en-IN')}\n` +
        `Month: ${mo}\n` +
        (date ? `Date: ${date}\n` : '') +
        `Is category ke liye same amount (₹${amt.toLocaleString('en-IN')}) ka expense already saved hai.\n\n` +
        `Kya aap sach me duplicate expense add karna chahte hain?`
      );
      if (!ok) {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
        window._isSavingExpEntry = false;
        return;
      }
    }
    
    const { data: newExp, error } = await sb.from('expenses').insert({
      category_id: cid,
      room_id: roomId,
      month: mo,
      amount: amt,
      paid_by: paidBy,
      payment_mode: payMode,
      entry_date: date,
      notes: notes,
      created_by: SESSION.userId
    });

    if (error) {
      document.getElementById('exErr').innerHTML =
        `<div class="error">${error.message}</div>`;
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
      window._isSavingExpEntry = false;
      return;
    }

    fsn.success('Success', '✅ Expense saved!');
    renderExpenses();
  } catch (err) {
    if (window.fsn) fsn.error('Error', err.message);
    else alert('Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Expense'; }
  } finally {
    window._isSavingExpEntry = false;
  }
}

// ============ EDIT EXPENSE ============
async function editExpense(id) {
  const [{ data: exp }, { data: cats }, { data: rooms }] = await Promise.all([
    sb.from('expenses').select('*').eq('id', id).single(),
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no')
  ]);

  if (!exp) { fsn.error('Error', 'Expense not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Expense</h1>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Category *</label>
        <select id="exCat">
          <option value="">Select</option>
          ${(cats || []).map(c =>
            `<option value="${c.category_id}"
              ${c.category_id === exp.category_id ? 'selected' : ''}>
              ${c.category_name}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Property</label>
        <select id="exRoom">
          <option value="">General / All</option>
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}"
              ${r.room_id === exp.room_id ? 'selected' : ''}>
              ${propLabel(r)}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Month *</label>
          <input id="exMo" value="${exp.month || ''}" />
        </div>
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="exAmt" type="number" value="${exp.amount || 0}" />
        </div>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input id="exDate" type="date" value="${exp.entry_date || ''}" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="exNotes">${exp.notes || ''}</textarea>
      </div>
      <button onclick="updateExpense(${id})" style="width:100%;margin-top:10px;">
        💾 Update Expense
      </button>
      <div id="exErr"></div>
    </div>
  `, 'expenses');
}

async function updateExpense(id) {
  const cid    = document.getElementById('exCat').value;
  const mo     = document.getElementById('exMo').value.trim();
  const amt    = parseFloat(document.getElementById('exAmt').value) || 0;
  const roomId = document.getElementById('exRoom').value || null;
  const date   = document.getElementById('exDate').value || null;
  const notes  = document.getElementById('exNotes').value.trim() || null;

  if (!cid || !mo || amt <= 0) {
    document.getElementById('exErr').innerHTML =
      '<div class="error">Category, month & amount required</div>';
    return;
  }

  const { error } = await sb.from('expenses').update({
    category_id: cid,
    room_id: roomId,
    month: mo,
    amount: amt,
    entry_date: date,
    notes: notes
  }).eq('id', id);

  if (error) {
    document.getElementById('exErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }

  fsn.success('Success', '✅ Expense updated!');
  renderExpenses();
}

// ============ DELETE EXPENSE ============
async function delExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await sb.from('expenses').delete().eq('id', id);
  if (error) { fsn.error('Error', '❌ ' + error.message); return; }
  fsn.success('Success', '✅ Deleted');
  renderExpenses();
}

// ============ PROPERTY REPORT ============
async function renderPropertyReport(roomId, range = 'Month') {
  renderShell(`<div class="loading">Loading...</div>`, 'property-report');

  const { data: rooms } = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name')
    .order('unit_no');

  const sel = roomId || rooms?.[0]?.room_id;
  if (!sel) {
    renderShell(
      `<div class="card"><h1>No properties</h1></div>`,
      'property-report'
    );
    return;
  }

  const now = new Date();
  let s, e, label;

  if (range === 'Month') {
    s = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10);
    e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);
    label = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } else if (range === 'Quarter') {
    const q = Math.floor(now.getMonth() / 3);
    s = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
    e = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10);
    label = `Q${q + 1} ${now.getFullYear()}`;
  } else {
    s = `${now.getFullYear()}-01-01`;
    e = `${now.getFullYear()}-12-31`;
    label = `${now.getFullYear()}`;
  }

  const ml = now
    .toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    .replace(' ', '-');

  const [{ data: gs }, { data: exs }] = await Promise.all([
    sb.from('guest_register')
      .select('*')
      .eq('room_id', sel)
      .gte('check_in', s)
      .lte('check_in', e),
    sb.from('expenses')
      .select('*, expense_categories(category_name)')
      .eq('room_id', sel)
      .eq('month', ml)
  ]);

  const pm = await getPaidMap((gs || []).map(g => g.booking_id));
  const onBks  = (gs || []).filter(g => g.booking_mode === 'Online-Airbnb');
  const offBks = (gs || []).filter(g => g.booking_mode !== 'Online-Airbnb');
  const onRev  = onBks.reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const offRev = offBks.reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const totRev = onRev + offRev;
  const totExp = (exs || []).reduce((a, ex) => a + (ex.amount || 0), 0);
  const profit = totRev - totExp;
  const room   = rooms.find(r => r.room_id === sel);

  renderShell(`
    <div class="card">
      <h1>🏘️ Property Report</h1>
      <div class="form-group" style="margin-top:8px;">
        <select id="rpRoom">
          ${rooms.map(r =>
            `<option value="${r.room_id}"
              ${r.room_id === sel ? 'selected' : ''}>
              ${propLabel(r)}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="btn-row">
        <button
          class="${range === 'Month' ? '' : 'secondary'} btn-sm"
          onclick="renderPropertyReport(document.getElementById('rpRoom').value,'Month')">
          Month
        </button>
        <button
          class="${range === 'Quarter' ? '' : 'secondary'} btn-sm"
          onclick="renderPropertyReport(document.getElementById('rpRoom').value,'Quarter')">
          Quarter
        </button>
        <button
          class="${range === 'Year' ? '' : 'secondary'} btn-sm"
          onclick="renderPropertyReport(document.getElementById('rpRoom').value,'Year')">
          Year
        </button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">${room?.property_name || room?.nickname || ''}</div>
      <div class="sub" style="margin-bottom:12px;">${label}</div>
      <div class="metric-row">
        <span class="metric-label">Total Revenue</span>
        <span class="metric-value">₹${totRev.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">🌐 Online (Airbnb)</span>
        <span class="metric-value" style="color:#FF385C;">
          ₹${onRev.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">🏠 Offline (Direct)</span>
        <span class="metric-value" style="color:#6C5CE0;">
          ₹${offRev.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Expenses (${ml})</span>
        <span class="metric-value warn">₹${totExp.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Net Profit</span>
        <span class="metric-value"
          style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};">
          ₹${profit.toLocaleString('en-IN')}
        </span>
      </div>
    </div>

    <div class="card">
      <div class="section-title">💰 Revenue Breakdown by Source</div>
      <div class="stat-grid">
        <div class="stat-card" style="border-left:4px solid #FF385C;">
          <div class="stat-num" style="color:#FF385C;font-size:22px;">₹${onRev.toLocaleString('en-IN')}</div>
          <div class="stat-label">🌐 Online (Airbnb)</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${onBks.length} bookings</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #6C5CE0;">
          <div class="stat-num" style="color:#6C5CE0;font-size:22px;">₹${offRev.toLocaleString('en-IN')}</div>
          <div class="stat-label">🏠 Offline (Direct)</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${offBks.length} bookings</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--green);">
          <div class="stat-num" style="color:var(--green);font-size:22px;">₹${totRev.toLocaleString('en-IN')}</div>
          <div class="stat-label">📊 Total Revenue</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${(gs || []).length} total bookings</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">🌐 Online Bookings (Airbnb) — ${label}</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Guest</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Amount</th>
        </tr></thead>
        <tbody>
          ${onBks.length === 0
            ? '<tr><td colspan="5" class="sub">No online bookings</td></tr>'
            : onBks.map(g => `
                <tr>
                  <td><strong>${g.guest_name || '-'}</strong></td>
                  <td style="font-size:12px;">${g.check_in || '-'}</td>
                  <td style="font-size:12px;">${g.check_out || '-'}</td>
                  <td>${g.check_in && g.check_out ? calcNights(g.check_in, g.check_out) : '-'}</td>
                  <td style="color:var(--blue);font-weight:700;">
                    ₹${(pm[g.booking_id] || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              `).join('')}
          ${onBks.length > 0 ? `
          <tr style="background:#EBF5FF;font-weight:700;">
            <td colspan="3">Online Total</td>
            <td>${onBks.reduce((s,b) => s + (b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : 0), 0)}</td>
            <td style="color:var(--blue);">₹${onRev.toLocaleString('en-IN')}</td>
          </tr>` : ''}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">🏠 Offline Bookings (Direct) — ${label}</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Guest</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Amount</th>
        </tr></thead>
        <tbody>
          ${offBks.length === 0
            ? '<tr><td colspan="5" class="sub">No offline bookings</td></tr>'
            : offBks.map(g => `
                <tr>
                  <td><strong>${g.guest_name || '-'}</strong></td>
                  <td style="font-size:12px;">${g.check_in || '-'}</td>
                  <td style="font-size:12px;">${g.check_out || '-'}</td>
                  <td>${g.check_in && g.check_out ? calcNights(g.check_in, g.check_out) : '-'}</td>
                  <td style="color:var(--yellow);font-weight:700;">
                    ₹${(pm[g.booking_id] || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              `).join('')}
          ${offBks.length > 0 ? `
          <tr style="background:#FEF3C7;font-weight:700;">
            <td colspan="3">Offline Total</td>
            <td>${offBks.reduce((s,b) => s + (b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : 0), 0)}</td>
            <td style="color:var(--yellow);">₹${offRev.toLocaleString('en-IN')}</td>
          </tr>` : ''}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">🧾 Expenses — ${ml}</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Category</th><th>Amount</th><th>Date</th><th>Notes</th>
        </tr></thead>
        <tbody>
          ${(exs || []).length === 0
            ? '<tr><td colspan="4" class="sub">No expenses</td></tr>'
            : (exs || []).map(ex => `
                <tr>
                  <td>${ex.expense_categories?.category_name || '-'}</td>
                  <td style="color:var(--red);font-weight:600;">
                    ₹${(ex.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style="font-size:12px;">${ex.entry_date || '-'}</td>
                  <td style="font-size:12px;">${ex.notes || '-'}</td>
                </tr>
              `).join('')}
        </tbody>
      </table></div>
    </div>
  `, 'property-report');

  document.getElementById('rpRoom').onchange = ev =>
    renderPropertyReport(ev.target.value, range);
}

// ============ DEFAULT EXPENSES ============
async function renderDefaultExpenses() {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');

  const [{ data: defaults }, { data: rooms }] = await Promise.all([
    sb.from('property_default_expenses')
      .select('*, rooms(nickname, unit_no)')
      .order('room_id'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id')
  ]);

  // Group by room
  const byRoom = {};
  (defaults || []).forEach(d => {
    const k = d.room_id;
    if (!byRoom[k]) byRoom[k] = { room: d.rooms, items: [] };
    byRoom[k].items.push(d);
  });

  renderShell(`
    <div class="card">
      <h1>⚙️ Default Expenses</h1>
      <div class="sub">
        Per-property monthly defaults.<br>
        Used in investor reports when actuals not logged.
      </div>
      <div class="btn-row">
        <button onclick="renderAddDefaultExpense()">➕ Add Default</button>
        <button class="secondary btn-sm" onclick="renderExpenses()">← Back</button>
      </div>
    </div>

    ${Object.entries(byRoom).length === 0
      ? `<div class="card"><div class="sub">No defaults configured</div></div>`
      : Object.entries(byRoom).map(([roomId, g]) => `
          <div class="card">
            <div class="section-title">
              🏠 ${propLabel(g.room) || roomId}
              <span class="badge red" style="float:right;">
                ₹${g.items
                  .reduce((s, i) => s + (i.default_amount || 0), 0)
                  .toLocaleString('en-IN')}/mo
              </span>
            </div>
            <div class="table-wrap"><table>
              <thead><tr>
                <th>Expense</th><th>Amount</th><th>Type</th><th>Actions</th>
              </tr></thead>
              <tbody>
                ${g.items.map(item => `
                  <tr>
                    <td>${item.expense_name}</td>
                    <td style="color:var(--red);font-weight:600;">
                      ₹${(item.default_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span class="badge ${item.is_fixed ? 'green' : 'yellow'}">
                        ${item.is_fixed ? 'Fixed' : 'Variable'}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button class="btn-sm"
                        onclick="editDefaultExpense('${item.id}')">✏️</button>
                      <button class="btn-sm danger"
                        onclick="deleteDefaultExpense('${item.id}','${item.expense_name}')">
                        🗑️
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>
          </div>
        `).join('')}
  `, 'expenses');
}

// ============ ADD DEFAULT EXPENSE ============
async function renderAddDefaultExpense() {
  const { data: rooms } = await sb.from('rooms')
    .select('room_id, nickname, unit_no').order('room_id');

  renderShell(`
    <div class="card">
      <h1>➕ Add Default Expense</h1>
      <button class="secondary btn-sm" onclick="renderDefaultExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Property *</label>
        <select id="defRoom">
          <option value="">Select Property</option>
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}">${propLabel(r)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Expense Name *</label>
        <input id="defName" placeholder="e.g. Electricity, WiFi, Housekeeping" />
      </div>
      <div class="form-group">
        <label>Default Amount ₹/month *</label>
        <input id="defAmount" type="number" min="0" placeholder="e.g. 3000" />
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="defFixed">
          <option value="true">Fixed (same every month)</option>
          <option value="false">Variable (changes monthly)</option>
        </select>
      </div>
      <button onclick="saveDefaultExpense()" style="width:100%;margin-top:10px;">
        💾 Save Default
      </button>
      <div id="defErr"></div>
    </div>
  `, 'expenses');
}

async function saveDefaultExpense() {
  const _btn = document.querySelector('button[onclick="saveDefaultExpense()"]');
  if (_btn) { if (_btn.disabled) return; _btn.disabled = true; _btn.textContent = '⏳ Saving...'; }
  const roomId  = document.getElementById('defRoom').value;
  const name    = document.getElementById('defName').value.trim();
  const amount  = parseFloat(document.getElementById('defAmount').value);
  const isFixed = document.getElementById('defFixed').value === 'true';

  if (!roomId || !name || !amount) {
    document.getElementById('defErr').innerHTML =
      '<div class="error">All fields required</div>';
    return;
  }

  const expSource = document.getElementById('defPaymentSource')?.value || 'UHHS-OD';
  const { error } = await sb.from('property_default_expenses').insert({
    room_id: roomId,
    expense_name: name,
    default_amount: amount,
    payment_source: expSource,
    is_fixed: isFixed
  });

  if (error) {
    document.getElementById('defErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }
  fsn.success('Success', '✅ Default expense added!');
  renderDefaultExpenses();
}

// ============ EDIT DEFAULT EXPENSE ============
async function editDefaultExpense(id) {
  const [{ data: def }, { data: rooms }] = await Promise.all([
    sb.from('property_default_expenses').select('*').eq('id', id).single(),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id')
  ]);

  if (!def) { fsn.error('Error', 'Not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Default Expense</h1>
      <button class="secondary btn-sm" onclick="renderDefaultExpenses()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Property *</label>
        <select id="defRoom">
          ${(rooms || []).map(r =>
            `<option value="${r.room_id}"
              ${r.room_id === def.room_id ? 'selected' : ''}>
              ${propLabel(r)}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Expense Name *</label>
        <input id="defName" value="${def.expense_name || ''}" />
      </div>
      <div class="form-group">
        <label>Default Amount ₹/month *</label>
        <input id="defAmount" type="number" value="${def.default_amount || ''}" />
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="defFixed">
          <option value="true"  ${def.is_fixed ? 'selected' : ''}>Fixed</option>
          <option value="false" ${!def.is_fixed ? 'selected' : ''}>Variable</option>
        </select>
      </div>
      <button onclick="updateDefaultExpense('${id}')" style="width:100%;margin-top:10px;">
        💾 Update
      </button>
      <div id="defErr"></div>
    </div>
  `, 'expenses');
}

async function updateDefaultExpense(id) {
  const roomId  = document.getElementById('defRoom').value;
  const name    = document.getElementById('defName').value.trim();
  const amount  = parseFloat(document.getElementById('defAmount').value);
  const isFixed = document.getElementById('defFixed').value === 'true';

  if (!roomId || !name || !amount) {
    document.getElementById('defErr').innerHTML =
      '<div class="error">All fields required</div>';
    return;
  }

  const expSource = document.getElementById('editDefPaymentSource')?.value || 'UHHS-OD';
  const { error } = await sb.from('property_default_expenses').update({
    room_id: roomId,
    expense_name: name,
    default_amount: amount,
    payment_source: expSource,
    is_fixed: isFixed
  }).eq('id', id);

  if (error) {
    document.getElementById('defErr').innerHTML =
      `<div class="error">${error.message}</div>`;
    return;
  }
  fsn.success('Success', '✅ Updated!');
  renderDefaultExpenses();
}

// ============ DELETE DEFAULT EXPENSE ============
async function deleteDefaultExpense(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  const { error } = await sb.from('property_default_expenses')
    .delete().eq('id', id);
  if (error) { fsn.error('Error', '❌ ' + error.message); return; }
  fsn.success('Success', '✅ Deleted');
  renderDefaultExpenses();
}

// ============ MONTHLY PROPERTY EXPENSE MANAGER ============
async function renderMonthlyExpenses(roomId, month) {

  renderShell(`<div class="card" style="padding:8px;margin-bottom:12px;"><div style="display:flex;gap:8px;"><button onclick="renderInvestors()" class="secondary" style="flex:1;">👥 Investors List</button><button style="flex:1;">📅 Monthly Expenses</button></div></div>
    ${window._investorTabsHtml || ""}
    <div class="loading">Loading...</div>`, 'expenses');

  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = new Date(selMonth + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

  // Previous month
  const prevDate = new Date(selMonth + '-01');
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthLabel = prevDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

  const [{ data: rooms }, { data: cats }, { data: defaults }] = await Promise.all([
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('property_default_expenses').select('*')
  ]);

  const selRoom = roomId || rooms?.[0]?.room_id;
  const room = (rooms || []).find(r => r.room_id === selRoom);

  // Load current month expenses for this room
  const { data: currentExps } = await sb.from('expenses')
    .select('*, expense_categories(category_name)')
    .eq('room_id', selRoom)
    .eq('month', monthLabel);

  // Load previous month for auto-copy option
  const { data: prevExps } = await sb.from('expenses')
    .select('*, expense_categories(category_name)')
    .eq('room_id', selRoom)
    .eq('month', prevMonthLabel);

  // Get property defaults
  const roomDefaults = (defaults || []).filter(d => d.room_id === selRoom);

  // Build combined expense list
  const expenseMap = {};

  // Start with defaults
  roomDefaults.forEach(d => {
    expenseMap[d.expense_name] = {
      name: d.expense_name,
      defaultAmount: d.default_amount || 0,
      currentAmount: 0,
      prevAmount: 0,
      currentId: null,
      isFixed: d.is_fixed
    };
  });

  // Add previous month amounts
  (prevExps || []).forEach(e => {
    const catName = e.expense_categories?.category_name || 'Other';
    if (!expenseMap[catName]) {
      expenseMap[catName] = { name: catName, defaultAmount: 0, currentAmount: 0, prevAmount: 0, currentId: null, isFixed: false };
    }
    expenseMap[catName].prevAmount = e.amount || 0;
    expenseMap[catName].categoryId = e.category_id;
  });

  // Add current month amounts (override)
  (currentExps || []).forEach(e => {
    const catName = e.expense_categories?.category_name || 'Other';
    if (!expenseMap[catName]) {
      expenseMap[catName] = { name: catName, defaultAmount: 0, currentAmount: 0, prevAmount: 0, currentId: null, isFixed: false };
    }
    expenseMap[catName].currentAmount = e.amount || 0;
    expenseMap[catName].currentId = e.id;
    expenseMap[catName].categoryId = e.category_id;
  });

  // Add categories that don't exist yet
  (cats || []).forEach(c => {
    if (!expenseMap[c.category_name]) {
      expenseMap[c.category_name] = {
        name: c.category_name,
        defaultAmount: c.default_monthly_amount || 0,
        currentAmount: 0,
        prevAmount: 0,
        currentId: null,
        isFixed: false,
        categoryId: c.category_id
      };
    } else if (!expenseMap[c.category_name].categoryId) {
      expenseMap[c.category_name].categoryId = c.category_id;
    }
  });

  const expList = Object.values(expenseMap);
  const totalCurrent = expList.reduce((s, e) => s + (e.currentAmount || 0), 0);
  const totalPrev = expList.reduce((s, e) => s + (e.prevAmount || 0), 0);
  const totalDefault = expList.reduce((s, e) => s + (e.defaultAmount || 0), 0);

  // Month options (last 12)
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    });
  }

  window._monthlyExpData = { selRoom, selMonth, monthLabel, prevMonthLabel, expList, cats: cats || [] };

  renderShell(`
    <div class="card">
      <h1>📅 Monthly Property Expenses</h1>
      <div class="sub">Simple month-end expense entry per property</div>
      <button class="secondary btn-sm" onclick="renderExpenses()">← Back to All</button>
    </div>

    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Property *</label>
          <select onchange="renderMonthlyExpenses(this.value, '${selMonth}')">
            ${(rooms || []).map(r =>
              `<option value="${r.room_id}" ${r.room_id === selRoom ? 'selected' : ''}>${propLabel(r)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Month *</label>
          <select onchange="renderMonthlyExpenses('${selRoom}', this.value)">
            ${months.map(m =>
              `<option value="${m.val}" ${m.val === selMonth ? 'selected' : ''}>${m.lbl}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="btn-row">
        ${(prevExps || []).length > 0 ? `<button class="btn-sm outline" onclick="copyPrevMonthExpenses()">📋 Copy from ${prevMonthLabel}</button>` : ''}
        <button class="btn-sm outline" onclick="applyDefaultExpenses()">⚙️ Apply Defaults</button>
        <button class="btn-sm secondary" onclick="toggleMonthlyInlineCat()">➕ New Category</button>
        <button class="btn-sm secondary" onclick="renderManageCategories()">⚙️ Manage Categories</button>
      </div>

      <div id="monthlyInlineCatForm" style="display:none;background:#f0f7ff;
        border-left:3px solid var(--blue);padding:12px;
        border-radius:8px;margin-top:10px;">
        <div style="font-weight:600;margin-bottom:8px;font-size:13px;">
          ➕ Add New Expense Category
        </div>
        <div class="form-grid" style="margin-bottom:8px;">
          <div class="form-group" style="margin:0;">
            <input id="monthlyCatName" placeholder="Category name *"
              style="font-size:13px;" />
          </div>
          <div class="form-group" style="margin:0;">
            <input id="monthlyCatAmt" type="number"
              placeholder="Default ₹/month (optional)"
              style="font-size:13px;" />
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" onclick="saveMonthlyInlineCat()"
            style="flex:1;padding:8px;font-size:13px;">
            💾 Save & Add to List
          </button>
          <button type="button" class="secondary"
            onclick="toggleMonthlyInlineCat()"
            style="padding:8px 12px;font-size:13px;">
            ✕
          </button>
        </div>
        <div id="monthlyCatErr" style="margin-top:6px;"></div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        🏠 ${room?.nickname || selRoom} — ${monthLabel}
        <span class="badge red" style="float:right;">Total: ₹${totalCurrent.toLocaleString('en-IN')}</span>
      </div>

      <div class="table-wrap"><table>
        <thead><tr>
          <th>Expense</th>
          <th>Default</th>
          <th>${prevMonthLabel}</th>
          <th>Current Month ₹</th>
          <th>Action</th>
        </tr></thead>
        <tbody>
          ${expList.map((e, i) => `
            <tr>
              <td><strong>${e.name}</strong></td>
              <td style="color:var(--muted);font-size:12px;">₹${e.defaultAmount.toLocaleString('en-IN')}</td>
              <td style="color:var(--muted);font-size:12px;">₹${e.prevAmount.toLocaleString('en-IN')}</td>
              <td>
                <input type="number" id="expInput_${i}"
                  value="${e.currentAmount || ''}"
                  placeholder="0"
                  style="width:100%;font-size:13px;padding:6px 8px;"
                  data-cat="${e.categoryId || ''}"
                  data-name="${e.name}"
                  data-id="${e.currentId || ''}" />
              </td>
              <td>
                ${e.prevAmount > 0 && !e.currentAmount ?
                  `<button class="btn-sm outline" onclick="document.getElementById('expInput_${i}').value = ${e.prevAmount}">↺ Prev</button>` :
                  ''}
                ${e.defaultAmount > 0 && !e.currentAmount ?
                  `<button class="btn-sm outline" onclick="document.getElementById('expInput_${i}').value = ${e.defaultAmount}">↺ Default</button>` :
                  ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:700;background:#fafafa;">
            <td>Total</td>
            <td style="color:var(--muted);">₹${totalDefault.toLocaleString('en-IN')}</td>
            <td style="color:var(--muted);">₹${totalPrev.toLocaleString('en-IN')}</td>
            <td style="color:var(--red);">₹${totalCurrent.toLocaleString('en-IN')}</td>
            <td></td>
          </tr>
        </tfoot>
      </table></div>

      <button onclick="saveMonthlyExpenses()" style="width:100%;margin-top:12px;padding:14px;">
        💾 Save All Expenses for ${monthLabel}
      </button>
      <div id="monthlyExpErr"></div>
    </div>

    <div class="card" style="background:#f0f7ff;border-left:4px solid var(--blue);">
      <div class="section-title">💡 How to Use</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>1.</strong> Property + Month select karo</p>
        <p><strong>2.</strong> "Copy from Prev" — pichle mahine ke amounts copy karo</p>
        <p><strong>3.</strong> "Apply Defaults" — property defaults apply karo</p>
        <p><strong>4.</strong> Har expense ka amount enter/edit karo</p>
        <p><strong>5.</strong> "↺ Prev" ya "↺ Default" button se quick fill</p>
        <p><strong>6.</strong> 💾 Save All — sab expenses ek saath save honge</p>
      </div>
    </div>
  `, 'expenses');
}

async function copyPrevMonthExpenses() {
  const d = window._monthlyExpData;
  d.expList.forEach((e, i) => {
    if (e.prevAmount > 0) {
      const input = document.getElementById(`expInput_${i}`);
      if (input) input.value = e.prevAmount;
    }
  });
  fsn.success(`Success`, `✅ Copied from ${d.prevMonthLabel}`);
}

async function applyDefaultExpenses() {
  const d = window._monthlyExpData;
  d.expList.forEach((e, i) => {
    if (e.defaultAmount > 0) {
      const input = document.getElementById(`expInput_${i}`);
      if (input) input.value = e.defaultAmount;
    }
  });
  fsn.success('Success', '✅ Defaults applied');
}

async function saveMonthlyExpenses() {
  const btn = document.querySelector('button[onclick="saveMonthlyExpenses()"]');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const d = window._monthlyExpData;
  const inputs = document.querySelectorAll('input[id^="expInput_"]');

  const expSource = document.getElementById('monthlyPaymentSource')?.value || 'UHHS-OD';
  const errors = [];
  let saved = 0;

  for (const input of inputs) {
    const amount = parseFloat(input.value) || 0;
    const catId = input.dataset.cat;
    const name = input.dataset.name;
    const existingId = input.dataset.id;

    // Skip if no amount and no existing record
    if (amount === 0 && !existingId) continue;

    try {
      if (amount === 0 && existingId) {
        // Delete existing if amount is 0
        await sb.from('expenses').delete().eq('id', existingId);
        saved++;
      } else if (existingId) {
        // Update existing
        await sb.from('expenses').update({
          amount,
    payment_source: expSource,
          category_id: catId || null,
          month: d.monthLabel,
          room_id: d.selRoom
        }).eq('id', existingId);
        saved++;
      } else if (catId) {
        // Insert new
        await sb.from('expenses').insert({
          category_id: catId,
          room_id: d.selRoom,
          month: d.monthLabel,
          amount,
    payment_source: expSource,
          entry_date: new Date().toISOString().slice(0, 10),
          notes: `Monthly bulk entry`,
          created_by: SESSION.userId
        });
        saved++;
      } else {
        errors.push(`${name}: category missing`);
      }
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }

  if (errors.length) {
    document.getElementById('monthlyExpErr').innerHTML =
      `<div class="error">${errors.join('<br>')}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save All Expenses'; }
  } else {
    fsn.success(`Success`, `✅ ${saved} expenses saved for ${d.monthLabel}`);
    renderMonthlyExpenses(d.selRoom, d.selMonth);
  }
}

// ============ MONTHLY EXPENSES — INLINE CATEGORY ============
function toggleMonthlyInlineCat() {
  const form = document.getElementById('monthlyInlineCatForm');
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    document.getElementById('monthlyCatName').focus();
    document.getElementById('monthlyCatErr').innerHTML = '';
  }
}

async function saveMonthlyInlineCat() {
  const btn = document.querySelector('button[onclick="saveMonthlyInlineCat()"]');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳...'; }

  const name = (document.getElementById('monthlyCatName')?.value || '').trim();
  const amt  = parseFloat(document.getElementById('monthlyCatAmt')?.value) || null;

  if (!name) {
    document.getElementById('monthlyCatErr').innerHTML =
      '<div class="error" style="font-size:12px;">Category name required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Add to List'; }
    return;
  }

  const newId = 'EXP' + Date.now();

  const { error } = await sb.from('expense_categories').insert({
    category_id: newId,
    category_name: name,
    default_monthly_amount: amt
  });

  if (error) {
    document.getElementById('monthlyCatErr').innerHTML =
      `<div class="error" style="font-size:12px;">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Add to List'; }
    return;
  }

  fsn.success('Success', `✅ "${name}" category added!`);

  const d = window._monthlyExpData;
  if (d) {
    renderMonthlyExpenses(d.selRoom, d.selMonth);
  }
}

// ============================================================
// MANAGE CATEGORIES — Full CRUD (Add/Edit/Delete)
// ============================================================
async function renderManageCategories() {
  renderShell(`<div class="loading">Loading...</div>`, 'expenses');

  const [{ data: cats }, { data: allExps }] = await Promise.all([
    sb.from('expense_categories').select('*').order('category_name'),
    sb.from('expenses').select('category_id')
  ]);

  const usageMap = {};
  (allExps || []).forEach(e => {
    if (e.category_id) usageMap[e.category_id] = (usageMap[e.category_id] || 0) + 1;
  });

  window._allCats = cats || [];

  renderShell(`
    <div class="card">
      <h1>⚙️ Manage Categories</h1>
      <div class="sub">Add, edit or delete expense categories</div>
      <div class="btn-row">
        <button onclick="toggleAddCatForm()">➕ Add New Category</button>
        <button class="secondary btn-sm" onclick="renderExpenses()">← Back to Expenses</button>
      </div>
    </div>

    <div id="addCatFormCard" style="display:none;">
      <div class="card" style="background:#f0f7ff;border-left:4px solid var(--blue);">
        <div class="section-title">➕ New Category</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Category Name *</label>
            <input id="newCatName" placeholder="e.g. Internet, Gas" />
          </div>
          <div class="form-group">
            <label>Default ₹/month</label>
            <input id="newCatAmt" type="number" placeholder="Optional" />
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button onclick="saveNewCategory()" style="flex:1;">💾 Save</button>
          <button class="secondary" onclick="toggleAddCatForm()">✕ Cancel</button>
        </div>
        <div id="newCatErr"></div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        📂 All Categories
        <span class="badge blue" style="float:right;">${(cats || []).length} total</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Category</th>
          <th>Default ₹/month</th>
          <th>Used In</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>
          ${(cats || []).length === 0
            ? '<tr><td colspan="4" class="sub" style="text-align:center;">No categories yet</td></tr>'
            : (cats || []).map(c => {
                const count = usageMap[c.category_id] || 0;
                return `
                  <tr>
                    <td><strong>${c.category_name}</strong>
                      ${c.notes ? `<div class="sub" style="font-size:11px;">${c.notes}</div>` : ''}
                    </td>
                    <td style="color:var(--red);font-weight:600;">
                      ₹${(c.default_monthly_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span class="badge ${count > 0 ? 'green' : 'yellow'}">
                        ${count} ${count === 1 ? 'expense' : 'expenses'}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button class="btn-sm" onclick="editCategoryInline('${c.category_id}')">✏️</button>
                      <button class="btn-sm danger" onclick="deleteCategory('${c.category_id}', '${(c.category_name || '').replace(/'/g, "\\'")}', ${count})">🗑️</button>
                    </td>
                  </tr>
                `;
              }).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card" style="background:#fef3c7;border-left:4px solid var(--yellow);">
      <div class="section-title">⚠️ Important</div>
      <div style="font-size:13px;line-height:1.8;">
        <p><strong>Edit:</strong> Category name/amount change kar sakte ho. Existing expenses auto-update honge (same ID).</p>
        <p><strong>Delete:</strong> Agar expenses use kar rahi hain to delete nahi hoga. Pehle expenses delete/reassign karo.</p>
      </div>
    </div>
  `, 'expenses');
}

function toggleAddCatForm() {
  const card = document.getElementById('addCatFormCard');
  if (!card) return;
  const isHidden = card.style.display === 'none';
  card.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    document.getElementById('newCatName').focus();
    document.getElementById('newCatErr').innerHTML = '';
  }
}

async function saveNewCategory() {
  const btn = document.querySelector('button[onclick="saveNewCategory()"]');
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳...'; }

  const name = document.getElementById('newCatName').value.trim();
  const amt  = parseFloat(document.getElementById('newCatAmt').value) || null;

  if (!name) {
    document.getElementById('newCatErr').innerHTML = '<div class="error">Name required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save'; }
    return;
  }

  const { error } = await sb.from('expense_categories').insert({
    category_id: 'EXP' + Date.now(),
    category_name: name,
    default_monthly_amount: amt
  });

  if (error) {
    document.getElementById('newCatErr').innerHTML = `<div class="error">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save'; }
    return;
  }

  fsn.success('Success', `✅ "${name}" added!`);
  renderManageCategories();
}

async function editCategoryInline(catId) {
  const cat = (window._allCats || []).find(c => c.category_id === catId);
  if (!cat) { fsn.error('Error', 'Category not found'); return; }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Category</h1>
      <button class="secondary btn-sm" onclick="renderManageCategories()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Category Name *</label>
        <input id="editCatName" value="${(cat.category_name || '').replace(/"/g, '&quot;')}" />
      </div>
      <div class="form-group">
        <label>Default ₹/month</label>
        <input id="editCatAmt" type="number" value="${cat.default_monthly_amount || ''}" placeholder="Optional" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input id="editCatNotes" value="${(cat.notes || '').replace(/"/g, '&quot;')}" placeholder="Optional" />
      </div>
      <button onclick="updateCategory('${catId}')" style="width:100%;margin-top:10px;">
        💾 Update Category
      </button>
      <div id="editCatErr"></div>
    </div>

    <div class="card" style="background:#f0f7ff;">
      <div class="section-title">💡 Info</div>
      <div style="font-size:13px;line-height:1.8;">
        <p><strong>ID:</strong> <code>${cat.category_id}</code></p>
        <p>Naam badalne se existing expenses me auto-update ho jayega (same ID hai).</p>
      </div>
    </div>
  `, 'expenses');
}

async function updateCategory(catId) {
  const btn = document.querySelector(`button[onclick="updateCategory('${catId}')"]`);
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳...'; }

  const name  = document.getElementById('editCatName').value.trim();
  const amt   = parseFloat(document.getElementById('editCatAmt').value) || null;
  const notes = document.getElementById('editCatNotes').value.trim() || null;

  if (!name) {
    document.getElementById('editCatErr').innerHTML = '<div class="error">Name required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Update Category'; }
    return;
  }

  const { error } = await sb.from('expense_categories').update({
    category_name: name,
    default_monthly_amount: amt,
    notes: notes
  }).eq('category_id', catId);

  if (error) {
    document.getElementById('editCatErr').innerHTML = `<div class="error">${error.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Update Category'; }
    return;
  }

  fsn.success('Success', `✅ "${name}" updated!`);
  renderManageCategories();
}

async function deleteCategory(catId, catName, usageCount) {
  if (usageCount > 0) {
    fsn.error('Cannot Delete',
      `❌ "${catName}" is used in ${usageCount} expense(s). Delete/reassign those first.`);
    return;
  }

  if (!confirm(`Delete category "${catName}"?\n\nThis cannot be undone.`)) return;

  const { error } = await sb.from('expense_categories')
    .delete().eq('category_id', catId);

  if (error) {
    fsn.error('Error', '❌ ' + error.message);
    return;
  }

  fsn.success('Success', `✅ "${catName}" deleted`);
  renderManageCategories();
}

// ═══════════════════════════════════════════════════════════
// 💰 EXPENSES — Paid By dropdown handlers
// ═══════════════════════════════════════════════════════════
window.onExpPayModeChange = async function() {
  const mode = document.getElementById('exPayMode')?.value;
  const dropdown = document.getElementById('exPaidBy');
  const label = document.getElementById('exPaidByLabel');
  const custom = document.getElementById('exPaidByCustom');
  
  if (!dropdown) return;
  
  if (label) {
    if (mode === 'Cash') label.innerHTML = '💵 Cash Paid By *';
    else if (mode === 'UPI') label.innerHTML = '📱 UPI Paid From *';
    else if (mode === 'Bank') label.innerHTML = '🏦 Bank Account *';
    else label.innerHTML = '💵 Paid By *';
  }
  
  // Only 2 options: Praveen + Company
  let html = '<option value="">-- Select --</option>';
  html += '<option value="Praveen">🔵 Praveen (my pocket)</option>';
  html += '<option value="Company">🏢 Company (company account)</option>';
  dropdown.innerHTML = html;
  
  if (mode === 'UPI' || mode === 'Bank') {
    if (finalH.includes('Firoz')) dropdown.value = 'Firoz';
  }
  
  dropdown.onchange = function() {
    if (custom) {
      if (this.value === '__custom__') { custom.style.display = 'block'; setTimeout(() => custom.focus(), 50); }
      else { custom.style.display = 'none'; custom.value = ''; }
    }
  };
  
  if (custom) { custom.style.display = 'none'; custom.value = ''; }
};

window.getExpPaidBy = function() {
  const dropdown = document.getElementById('exPaidBy');
  if (!dropdown) return null;
  if (dropdown.value === '__custom__') {
    return document.getElementById('exPaidByCustom')?.value?.trim() || null;
  }
  return dropdown.value || null;
};

// ═══════════════════════════════════════════════════════════
// 📶 WI-FI RECHARGE & INSTALLATION TRACKER (18 HOMESTAYS)
// ═══════════════════════════════════════════════════════════
window.openWifiRechargeModal = async function() {
  const { data: rooms } = await sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no');
  const modalId = 'wifiRechargeModal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const today = new Date().toISOString().slice(0, 10);

  const html = `
    <div id="${modalId}" class="modal-backdrop active" style="display:flex;align-items:center;justify-content:center;z-index:99999;position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);padding:16px;">
      <div class="card" style="max-width:540px;width:100%;border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;background:#fff;max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">📶</span>
            <div>
              <h2 style="margin:0;font-size:17px;font-weight:800;color:#1e293b;">Wi-Fi Recharge &amp; Installation</h2>
              <div style="font-size:12px;color:#64748b;">Broadband tracking across all 18 homestays</div>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">✕</button>
        </div>

        <form id="wifiRechargeForm" onsubmit="window.saveWifiRecharge(event)">
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12.5px;font-weight:700;">Property / Flat *</label>
            <select id="wifiRoomId" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-weight:600;">
              <option value="">Select Property (18 Available)</option>
              ${(rooms || []).map(r => `<option value="${r.room_id}">${escapeHtml(propLabel(r))}</option>`).join('')}
            </select>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Action Type *</label>
              <select id="wifiActionType" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;">
                <option value="Recharge">📶 Monthly Recharge</option>
                <option value="Installation">🛠️ New Line Installation</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">ISP Provider *</label>
              <select id="wifiIsp" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;">
                <option value="Airtel Fiber">Airtel Xstream Fiber</option>
                <option value="Jio Fiber">JioFiber</option>
                <option value="ACT Fibernet">ACT Fibernet</option>
                <option value="Tata Play">Tata Play Fiber</option>
                <option value="BSNL Fiber">BSNL Bharat Fiber</option>
                <option value="Other">Other Broadband</option>
              </select>
            </div>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Account / Landline No</label>
              <input id="wifiAccountNo" placeholder="e.g. 0522-349812 / 1029384" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Plan Amount ₹ *</label>
              <input id="wifiAmount" type="number" required placeholder="e.g. 943" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Recharge / Paid Date *</label>
              <input id="wifiDate" type="date" value="${today}" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Next Cycle Due Date</label>
              <input id="wifiNextCycle" type="date" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label style="font-size:12.5px;font-weight:700;">Payment Source *</label>
            <select id="wifiPaySource" style="width:100%;padding:9px;border:1.5px solid #0d6efd;border-radius:10px;font-weight:700;">
              <option value="UHHS-OD">🏦 TUHH-OD (Overdraft Account)</option>
              <option value="COMPANY">🏢 COMPANY (Cash / QR)</option>
            </select>
          </div>

          <div style="display:flex;gap:10px;">
            <button type="button" class="secondary" onclick="document.getElementById('${modalId}').remove()" style="flex:1;">Cancel</button>
            <button type="submit" id="wifiSubmitBtn" style="flex:2;background:#EA3829;color:#fff;font-weight:800;border:none;border-radius:10px;padding:10px;">💾 Save Wi-Fi Record</button>
          </div>
          <div id="wifiModalErr" style="margin-top:8px;"></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.saveWifiRecharge = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('wifiSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  try {
    const roomId = document.getElementById('wifiRoomId').value;
    const actionType = document.getElementById('wifiActionType').value;
    const isp = document.getElementById('wifiIsp').value;
    const accountNo = document.getElementById('wifiAccountNo').value.trim();
    const amount = parseFloat(document.getElementById('wifiAmount').value) || 0;
    const dateVal = document.getElementById('wifiDate').value;
    const nextDue = document.getElementById('wifiNextCycle').value;
    const paySource = document.getElementById('wifiPaySource').value;

    if (!roomId || amount <= 0) {
      document.getElementById('wifiModalErr').innerHTML = '<div class="error">Property &amp; Amount required</div>';
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save Wi-Fi Record'; }
      return;
    }

    // Ensure category exists
    let { data: cat } = await sb.from('expense_categories')
      .select('category_id')
      .ilike('category_name', '%Wi-Fi%')
      .limit(1)
      .maybeSingle();

    if (!cat) {
      const { data: newCat } = await sb.from('expense_categories')
        .insert({ category_name: 'Wi-Fi & Internet' })
        .select()
        .single();
      cat = newCat;
    }

    const m = dateVal.slice(0, 7);
    const [y, mm] = m.split('-');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ml = `${monthNames[parseInt(mm, 10) - 1]}-${y}`;

    const note = `[WiFi ${actionType}: ${isp} • Acct: ${accountNo || '-'} • Next Due: ${nextDue || '-'}]`;

    const { error } = await sb.from('expenses').insert({
      category_id: cat?.category_id || null,
      room_id: roomId,
      amount: amount,
      entry_date: dateVal,
      month: ml,
      paid_by: paySource,
      notes: note
    });

    if (error) throw error;

    document.getElementById('wifiRechargeModal')?.remove();
    fsn.success('Wi-Fi Saved', `✅ Wi-Fi ${actionType} recorded for ₹${amount.toLocaleString('en-IN')}`);
    if (typeof renderExpenses === 'function') renderExpenses();
  } catch (err) {
    console.error('saveWifiRecharge error:', err);
    document.getElementById('wifiModalErr').innerHTML = `<div class="error">${err.message || 'Error saving'}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Wi-Fi Record'; }
  }
};

// ═══════════════════════════════════════════════════════════
// 🛵 EMPLOYEE RAPIDO & TRAVEL TRACKER (NON-DEDUCTIBLE)
// ═══════════════════════════════════════════════════════════
window.openEmployeeTransportModal = async function() {
  const { data: emps } = await sb.from('employees').select('emp_id, name, phone').eq('status', 'Active').order('name');
  const modalId = 'empTransportModal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const today = new Date().toISOString().slice(0, 10);

  const html = `
    <div id="${modalId}" class="modal-backdrop active" style="display:flex;align-items:center;justify-content:center;z-index:99999;position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);padding:16px;">
      <div class="card" style="max-width:540px;width:100%;border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;background:#fff;max-height:92vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">🛵</span>
            <div>
              <h2 style="margin:0;font-size:17px;font-weight:800;color:#1e293b;">Staff Rapido &amp; Travel Tracker</h2>
              <div style="font-size:12px;color:#64748b;">Record rides &amp; petrol allowance (Paid by Company / TUHH-OD)</div>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">✕</button>
        </div>

        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1E40AF;line-height:1.4;">
          🛡️ <strong>COMPANY OPERATIONAL EXPENSE:</strong> Ye expense company ya TUHH-OD se pay hota hai. Employee ki monthly salary se <strong>₹0 katenge</strong> (Non-deductible).
        </div>

        <form id="empTransportForm" onsubmit="window.saveEmpTransport(event)">
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12.5px;font-weight:700;">Employee *</label>
            <select id="transportEmpId" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-weight:600;">
              <option value="">Select Employee</option>
              ${(emps || []).map(e => `<option value="${e.emp_id}" data-name="${escapeHtml(e.name)}">${escapeHtml(e.name)} (${escapeHtml(e.phone || '-')})</option>`).join('')}
            </select>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Travel Mode *</label>
              <select id="transportMode" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;">
                <option value="Rapido Bike">🛵 Rapido Bike</option>
                <option value="Rapido Auto">🛺 Rapido Auto</option>
                <option value="Cab / Uber">🚕 Cab / Uber / Ola</option>
                <option value="Petrol Allowance">⛽ Staff Petrol Allowance</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Number of Rides / Trips</label>
              <input id="transportRideCount" type="number" value="1" min="1" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
          </div>

          <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Total Amount ₹ *</label>
              <input id="transportAmount" type="number" required placeholder="e.g. 180" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
            <div class="form-group">
              <label style="font-size:12.5px;font-weight:700;">Trip Date *</label>
              <input id="transportDate" type="date" value="${today}" required style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12.5px;font-weight:700;">Trip Purpose / Task Details *</label>
            <input id="transportPurpose" required placeholder="e.g. Guest linen handover at Gomti Nagar, key drop, etc." style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;" />
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label style="font-size:12.5px;font-weight:700;">Paid Via *</label>
            <select id="transportPaySource" style="width:100%;padding:9px;border:1.5px solid #0d6efd;border-radius:10px;font-weight:700;">
              <option value="UHHS-OD">🏦 TUHH-OD (Direct App Booking / Overdraft)</option>
              <option value="COMPANY">🏢 COMPANY (Reimbursement / Cash in Hand)</option>
            </select>
          </div>

          <div style="display:flex;gap:10px;">
            <button type="button" class="secondary" onclick="document.getElementById('${modalId}').remove()" style="flex:1;">Cancel</button>
            <button type="submit" id="transportSubmitBtn" style="flex:2;background:#D97706;color:#fff;font-weight:800;border:none;border-radius:10px;padding:10px;">💾 Save Travel Record</button>
          </div>
          <div id="transportModalErr" style="margin-top:8px;"></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.saveEmpTransport = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('transportSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  try {
    const empSelect = document.getElementById('transportEmpId');
    const empId = empSelect.value;
    const empName = empSelect.options[empSelect.selectedIndex]?.getAttribute('data-name') || empId;
    const travelMode = document.getElementById('transportMode').value;
    const rides = parseInt(document.getElementById('transportRideCount').value, 10) || 1;
    const amount = parseFloat(document.getElementById('transportAmount').value) || 0;
    const dateVal = document.getElementById('transportDate').value;
    const purpose = document.getElementById('transportPurpose').value.trim();
    const paySource = document.getElementById('transportPaySource').value;

    if (!empId || amount <= 0) {
      document.getElementById('transportModalErr').innerHTML = '<div class="error">Employee &amp; Amount required</div>';
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save Travel Record'; }
      return;
    }

    // Ensure category exists
    let { data: cat } = await sb.from('expense_categories')
      .select('category_id')
      .ilike('category_name', '%Travel%')
      .limit(1)
      .maybeSingle();

    if (!cat) {
      const { data: newCat } = await sb.from('expense_categories')
        .insert({ category_id: 'CAT-TRAVEL', category_name: 'Travel & Transport' })
        .select()
        .single();
      cat = newCat;
    }

    const m = dateVal.slice(0, 7);
    const [y, mm] = m.split('-');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ml = `${monthNames[parseInt(mm, 10) - 1]}-${y}`;

    const note = `[Staff Travel: ${empName} • ${rides} ${travelMode} Rides • Purpose: ${purpose} • Paid by Company - Non-deductible]`;

    const { error } = await sb.from('expenses').insert({
      category_id: cat?.category_id || null,
      amount: amount,
      entry_date: dateVal,
      month: ml,
      paid_by: paySource,
      notes: note
    });

    if (error) throw error;

    document.getElementById('empTransportModal')?.remove();
    fsn.success('Travel Logged', `✅ ${travelMode} (₹${amount.toLocaleString('en-IN')}) saved for ${empName} (Non-deductible)`);
    if (typeof renderExpenses === 'function') renderExpenses();
  } catch (err) {
    console.error('saveEmpTransport error:', err);
    document.getElementById('transportModalErr').innerHTML = `<div class="error">${err.message || 'Error saving'}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Travel Record'; }
  }
};

console.log('✅ Expenses Wi-Fi & Transport modules loaded');
