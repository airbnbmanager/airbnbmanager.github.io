// ═══════════════════════════════════════════════════════════
// 👥 EMPLOYEE LEDGER — TUHH Clean HRMS & Payroll System
// Month filter + Salary Calculation (Fixed / Per Flat) + Advance Tracker
// ═══════════════════════════════════════════════════════════

window.EMPLOYEE_LEDGER = {
  
  // Get days in month + days elapsed till today
  getMonthInfo(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
    return { daysInMonth, daysElapsed, isCurrentMonth };
  },

  // Check if an employee is cleaning / per-flat staff
  isPerFlatStaff(emp) {
    if (!emp) return false;
    // Explicit override in localStorage
    const savedType = localStorage.getItem('tuhh_emp_type_' + emp.emp_id);
    if (savedType === 'per_flat') return true;
    if (savedType === 'monthly') return false;

    // Database employee_type
    if (emp.employee_type === 'per_flat') return true;

    // Specific known cleaning staff (e.g. Shalu at Vikalp Khand, Laxmi Sharma)
    const name = (emp.name || '').trim();
    if (name === 'Shalu' || name === 'Laxmi Sharma') return true;

    // Maid assigned to specific flat clusters
    const role = (emp.role || '').toLowerCase();
    const rooms = (emp.assigned_rooms || '');
    if (role === 'maid' && (rooms.includes('VIL') || rooms.includes('GOM'))) return true;

    return false;
  },

  // Get configured per-flat rate and flat count for an employee
  getPerFlatConfig(emp) {
    const isCleaner = this.isPerFlatStaff(emp);
    
    // Assigned rooms count
    const assignedRooms = (emp.assigned_rooms || '').split(',').map(s => s.trim()).filter(Boolean);
    const savedFlats = Number(localStorage.getItem('tuhh_cleaner_flats_' + emp.emp_id));
    const flatsCount = savedFlats > 0 ? savedFlats : (assignedRooms.length > 0 ? assignedRooms.length : 1);

    // Rate: Default ₹4,000 per flat per month (user standard: 4000/30 per day per flat)
    const savedRate = Number(localStorage.getItem('tuhh_cleaner_rate_' + emp.emp_id));
    let flatMonthlyRate = 4000;
    if (savedRate > 0) {
      flatMonthlyRate = savedRate;
    } else if (emp.per_flat_rate >= 500) {
      flatMonthlyRate = emp.per_flat_rate;
    } else if (emp.per_flat_rate > 0) {
      flatMonthlyRate = Math.round(emp.per_flat_rate * 30);
    }

    const dailyPerFlat = flatMonthlyRate / 30; // e.g. 4000/30 = 133.33
    return {
      isCleaner,
      flatsCount,
      flatMonthlyRate,
      dailyPerFlat,
      assignedRooms
    };
  },

  // Calculate salary earned for given month
  async calculateSalaryEarned(emp, monthStr) {
    const { daysInMonth, daysElapsed } = this.getMonthInfo(monthStr);
    const monthStart = monthStr + '-01';
    const monthEnd = monthStr + '-' + String(daysInMonth).padStart(2, '0');
    
    // Get attendance for month
    let attendance = [];
    try {
      const { data } = await sb.from('attendance_log')
        .select('att_date, status')
        .eq('emp_id', emp.emp_id)
        .gte('att_date', monthStart)
        .lte('att_date', monthEnd);
      attendance = data || [];
    } catch(e) {
      console.warn('Attendance fetch warning:', e);
    }
    
    const present = attendance.filter(a => a.status === 'Present').length;
    const half = attendance.filter(a => a.status === 'Half Day').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const workedDays = present + (half * 0.5);
    const hasAttendance = attendance.length > 0;
    
    let earned = 0;
    let breakdown = '';
    let calculationType = 'fixed_monthly';
    const flatConfig = this.getPerFlatConfig(emp);

    if (flatConfig.isCleaner) {
      // ═══════════════════════════════════════════════════════════
      // 🧹 CLEANING STAFF (e.g. Vikalp Khand / Maid / Flat-based)
      // Per flat rate: e.g. ₹4000/month per flat = ₹4000/30 per day per flat
      // ═══════════════════════════════════════════════════════════
      calculationType = 'per_flat';
      const { flatsCount, flatMonthlyRate, dailyPerFlat } = flatConfig;
      const totalMonthly = flatsCount * flatMonthlyRate;
      const dailyTotal = flatsCount * dailyPerFlat;

      if (hasAttendance && (absent > 0 || half > 0)) {
        // Deduct only for absent / half-days
        const deduction = Math.round((absent * dailyTotal) + (half * 0.5 * dailyTotal));
        earned = Math.max(0, totalMonthly - deduction);
        breakdown = `${flatsCount} flat(s) @ ₹${flatMonthlyRate.toLocaleString('en-IN')}/mo (₹${dailyPerFlat.toFixed(1)}/day/flat) · ${absent} absent (-₹${deduction.toLocaleString('en-IN')})`;
      } else if (hasAttendance) {
        earned = totalMonthly;
        breakdown = `${flatsCount} flat(s) @ ₹${flatMonthlyRate.toLocaleString('en-IN')}/mo (₹${dailyPerFlat.toFixed(1)}/day · Full month)`;
      } else {
        // Full month fixed per flat
        earned = totalMonthly;
        breakdown = `${flatsCount} flat(s) @ ₹${flatMonthlyRate.toLocaleString('en-IN')}/mo (Fixed Full Month)`;
      }

    } else if (emp.employee_type === 'per_day' && emp.daily_wage > 0) {
      // Per Day Wage
      calculationType = 'per_day';
      earned = Math.round(workedDays * emp.daily_wage);
      breakdown = `${workedDays} days × ₹${emp.daily_wage}/day`;

    } else {
      // ═══════════════════════════════════════════════════════════
      // 💼 MAXIMUM EMPLOYEES: FIXED MONTHLY SALARY
      // Caretaker, Manager, Field staff, etc.
      // ═══════════════════════════════════════════════════════════
      calculationType = 'fixed_monthly';
      const monthlySalary = Number(emp.monthly_salary || 0);
      const dailyRate = monthlySalary / 30;

      if (hasAttendance && (absent > 0 || half > 0)) {
        // Deduct strictly for absent or half days from fixed monthly salary
        const deduction = Math.round((absent * dailyRate) + (half * 0.5 * dailyRate));
        earned = Math.max(0, monthlySalary - deduction);
        breakdown = `Fixed ₹${monthlySalary.toLocaleString('en-IN')}/mo · ${absent} absent (-₹${deduction.toLocaleString('en-IN')})`;
      } else if (hasAttendance) {
        earned = monthlySalary;
        breakdown = `Fixed ₹${monthlySalary.toLocaleString('en-IN')}/mo (Full Month — 0 leaves)`;
      } else {
        earned = monthlySalary;
        breakdown = `Fixed ₹${monthlySalary.toLocaleString('en-IN')}/mo (Full Month)`;
      }
    }
    
    return { 
      earned, 
      present, 
      half, 
      absent, 
      workedDays, 
      hasAttendance,
      breakdown, 
      daysInMonth, 
      daysElapsed,
      calculationType,
      flatConfig
    };
  },

  // Get salary paid in month
  async getSalaryPaid(empId, monthStr) {
    const monthStart = monthStr + '-01';
    const [y, m] = monthStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = monthStr + '-' + String(lastDay).padStart(2, '0');
    
    try {
      const { data } = await sb.from('salary_tracker')
        .select('salary_paid')
        .eq('emp_id', empId)
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);
      
      return (data || []).reduce((s, r) => s + Number(r.salary_paid || 0), 0);
    } catch(e) {
      console.warn('Salary paid fetch error:', e);
      return 0;
    }
  },

  // Get pending advances (outstanding balance that employee has taken)
  async getPendingAdvances(empId, monthStr) {
    const [y, m] = monthStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = monthStr + '-' + String(lastDay).padStart(2, '0');
    
    try {
      // Fetch all advances given up to month end that are NOT yet deducted
      const { data } = await sb.from('advance_tracker')
        .select('*')
        .eq('emp_id', empId)
        .lte('date_given', monthEnd)
        .eq('is_deducted', false);
      
      const advances = (data || []).map(a => {
        const advAmt = Number(a.advance_amount || 0);
        const repAmt = Number(a.repaid_amount || 0);
        const pendingAmt = Math.max(0, advAmt - repAmt);
        return {
          ...a,
          advance_amount: advAmt,
          repaid_amount: repAmt,
          pending_amount: pendingAmt
        };
      }).filter(a => a.pending_amount > 0);

      return advances;
    } catch(e) {
      console.warn('Pending advances fetch error:', e);
      return [];
    }
  },

  // Get opening balance (previous months pending salary)
  async getOpeningBalance(empId, monthStr) {
    const monthStart = monthStr + '-01';
    try {
      const { data } = await sb.from('salary_tracker')
        .select('salary_due, salary_paid')
        .eq('emp_id', empId)
        .lt('payment_date', monthStart);
      
      const totalDue = (data || []).reduce((s, r) => s + Number(r.salary_due || 0), 0);
      const totalPaid = (data || []).reduce((s, r) => s + Number(r.salary_paid || 0), 0);
      return totalDue - totalPaid;
    } catch(e) {
      return 0;
    }
  }
};

// ═══════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════
window.renderEmployeeLedger = async function() {
  if (!['developer', 'owner', 'admin', 'manager'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'employee-ledger');
    return;
  }
  
  // Selected month (default: current)
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const selectedMonth = window._empLedgerMonth || currentMonth;
  // Filter toggle: 'all' or 'advance_only'
  const filterMode = window._empLedgerFilter || 'all';
  
  renderShell('<div class="loading">Loading employee ledger & payroll...</div>', 'employee-ledger');
  
  // Fetch active employees
  const { data: emps, error: empErr } = await sb.from('employees')
    .select('*')
    .eq('status', 'Active')
    .order('name');
  
  if (empErr || !emps || emps.length === 0) {
    renderShell('<div class="card"><h1>📒 Employee Ledger</h1><div class="sub">No active employees found</div></div>', 'employee-ledger');
    return;
  }
  
  // Build ledger data for each employee
  const ledger = [];
  for (const emp of emps) {
    const earnedData = await EMPLOYEE_LEDGER.calculateSalaryEarned(emp, selectedMonth);
    const paid = await EMPLOYEE_LEDGER.getSalaryPaid(emp.emp_id, selectedMonth);
    const advances = await EMPLOYEE_LEDGER.getPendingAdvances(emp.emp_id, selectedMonth);
    const opening = await EMPLOYEE_LEDGER.getOpeningBalance(emp.emp_id, selectedMonth);
    const advanceTotal = advances.reduce((s, a) => s + a.pending_amount, 0);
    const netPayable = opening + earnedData.earned - paid - advanceTotal;
    
    ledger.push({
      ...emp,
      earnedData,
      paid,
      advances,
      advanceTotal,
      hasAdvance: advanceTotal > 0,
      opening,
      netPayable
    });
  }
  
  // Sort: employees with advance first or highest payable
  ledger.sort((a, b) => {
    if (filterMode === 'advance_only') {
      return b.advanceTotal - a.advanceTotal;
    }
    return b.netPayable - a.netPayable;
  });
  
  // Filter by user preference
  const advanceOnlyList = ledger.filter(e => e.advanceTotal > 0);
  const displayList = filterMode === 'advance_only' ? advanceOnlyList : ledger;
  
  // Month options (last 6 months + next 1)
  const monthOptions = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }
  
  const totalPayable = ledger.reduce((s, e) => s + Math.max(e.netPayable, 0), 0);
  const totalAdvanceOut = ledger.reduce((s, e) => s + e.advanceTotal, 0);
  
  // Build HTML
  let html = `
    <div class="card" style="box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 14px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
        <div>
          <h1 style="margin:0; font-size:24px; font-weight:800; color:#111827;">📒 Employee Ledger &amp; Advance Tracker</h1>
          <div class="sub" style="margin-top:4px; font-size:13px; color:#6B7280;">
            Fixed Monthly Staff + Per-Flat Cleaning Staff (Vikalp Khand) + Active Advance Monitoring
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button onclick="window.giveAdvanceModal('','')" 
                  style="padding:9px 16px; background:#D97706; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(217,119,6,0.3);">
            🎁 Give Advance
          </button>
        </div>
      </div>
      
      <!-- Controls Bar: Month + Filter Pills -->
      <div style="display:flex; gap:14px; align-items:center; justify-content:space-between; margin-top:16px; flex-wrap:wrap; background:#F9FAFB; padding:12px; border-radius:10px; border:1px solid #E5E7EB;">
        <div style="display:flex; gap:10px; align-items:center;">
          <label style="font-size:13px; font-weight:700; color:#374151;">📅 Month:</label>
          <select onchange="window._empLedgerMonth=this.value;renderEmployeeLedger();" 
                  style="padding:8px 14px; border:1.5px solid #D1D5DB; border-radius:8px; font-size:14px; font-weight:700; background:#fff; cursor:pointer;">
            ${monthOptions.map(m => 
              '<option value="' + m.val + '"' + (m.val === selectedMonth ? ' selected' : '') + '>' + m.label + '</option>'
            ).join('')}
          </select>
        </div>

        <!-- Filter Pills: All Staff vs Only Advance Taken -->
        <div style="display:flex; gap:8px; align-items:center; background:#E5E7EB; padding:3px; border-radius:8px;">
          <button onclick="window._empLedgerFilter='all';renderEmployeeLedger();" 
                  style="padding:6px 14px; border:none; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; ${filterMode === 'all' ? 'background:#fff; color:#111827; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent; color:#6B7280;'}">
            👥 All Staff (${ledger.length})
          </button>
          <button onclick="window._empLedgerFilter='advance_only';renderEmployeeLedger();" 
                  style="padding:6px 14px; border:none; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; ${filterMode === 'advance_only' ? 'background:#DC2626; color:#fff; box-shadow:0 2px 6px rgba(220,38,38,0.3);' : 'background:transparent; color:#991B1B;'}">
            🎁 Advance Taken Only (${advanceOnlyList.length})
          </button>
        </div>
      </div>
      
      <!-- Metric Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; margin-top:14px;">
        <div style="padding:14px 16px; background:#FEF3C7; border-left:4px solid #D97706; border-radius:10px;">
          <div style="font-size:11px; color:#92400E; font-weight:700; letter-spacing:0.5px;">💰 TOTAL SALARY PAYABLE</div>
          <div style="font-size:24px; font-weight:900; color:#D97706; margin-top:4px;">₹${totalPayable.toLocaleString('en-IN')}</div>
          <div style="font-size:11px; color:#B45309; margin-top:2px;">Net payable across active staff</div>
        </div>
        
        <div onclick="window._empLedgerFilter='advance_only';renderEmployeeLedger();" 
             style="padding:14px 16px; background:#FEE2E2; border-left:4px solid #DC2626; border-radius:10px; cursor:pointer; transition:transform 0.15s;"
             title="Click to view employees with advance">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#991B1B; font-weight:700; letter-spacing:0.5px;">🎁 ADVANCE OUTSTANDING</span>
            <span style="background:#DC2626; color:#fff; font-size:10px; font-weight:800; padding:2px 8px; border-radius:12px;">${advanceOnlyList.length} STAFF</span>
          </div>
          <div style="font-size:24px; font-weight:900; color:#DC2626; margin-top:4px;">₹${totalAdvanceOut.toLocaleString('en-IN')}</div>
          <div style="font-size:11px; color:#B91C1C; margin-top:2px;">👉 Click to show advance holders only</div>
        </div>

        <div style="padding:14px 16px; background:#EFF6FF; border-left:4px solid #2563EB; border-radius:10px;">
          <div style="font-size:11px; color:#1E40AF; font-weight:700; letter-spacing:0.5px;">👥 ACTIVE STAFF</div>
          <div style="font-size:24px; font-weight:900; color:#2563EB; margin-top:4px;">${ledger.length}</div>
          <div style="font-size:11px; color:#1D4ED8; margin-top:2px;">Fixed Monthly &amp; Cleaning</div>
        </div>
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════
  // ADVANCE SUMMARY TABLE BANNER (If any advances exist)
  // Shows list of employees who took advance and how much is due
  // ═══════════════════════════════════════════════════════════
  if (advanceOnlyList.length > 0) {
    html += `
      <div class="card" style="margin-top:16px; background:#FFF5F5; border:1.5px solid #FEB2B2; border-radius:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:15px; font-weight:800; color:#991B1B; display:flex; align-items:center; gap:6px;">
              🎁 Active Advance Balance Summary (${advanceOnlyList.length} Employees)
            </div>
            <div style="font-size:12px; color:#7F1D1D; margin-top:2px;">
              Yeh employees company se advance liye hue hain — salary me se auto-deduct hoga:
            </div>
          </div>
          <div style="font-size:16px; font-weight:900; color:#DC2626; background:#fff; padding:6px 14px; border-radius:8px; border:1px solid #FECACA;">
            Total Due: ₹${totalAdvanceOut.toLocaleString('en-IN')}
          </div>
        </div>

        <div style="margin-top:12px; overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#FEE2E2; text-align:left;">
                <th style="padding:8px 12px; border-radius:6px 0 0 6px;">Employee</th>
                <th style="padding:8px 12px;">Role</th>
                <th style="padding:8px 12px; text-align:right;">Advance Taken</th>
                <th style="padding:8px 12px; text-align:right;">Repaid</th>
                <th style="padding:8px 12px; text-align:right; color:#DC2626;">Outstanding Due</th>
                <th style="padding:8px 12px;">Latest Reason &amp; Date</th>
                <th style="padding:8px 12px; text-align:center; border-radius:0 6px 6px 0;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${advanceOnlyList.map(e => {
                const totalTaken = e.advances.reduce((s, a) => s + a.advance_amount, 0);
                const totalRepaid = e.advances.reduce((s, a) => s + a.repaid_amount, 0);
                const latest = e.advances[0] || {};
                return `
                  <tr style="border-bottom:1px solid #FED7D7; background:#fff;">
                    <td style="padding:8px 12px; font-weight:700; color:#111827;">${escapeHtml(e.name)}</td>
                    <td style="padding:8px 12px; color:#4B5563; font-size:12px;">${escapeHtml(e.role || '-')}</td>
                    <td style="padding:8px 12px; text-align:right; font-weight:600; color:#4B5563;">₹${totalTaken.toLocaleString('en-IN')}</td>
                    <td style="padding:8px 12px; text-align:right; font-weight:600; color:#059669;">₹${totalRepaid.toLocaleString('en-IN')}</td>
                    <td style="padding:8px 12px; text-align:right; font-weight:900; color:#DC2626; font-size:14px;">₹${e.advanceTotal.toLocaleString('en-IN')}</td>
                    <td style="padding:8px 12px; font-size:12px; color:#4B5563;">
                      ${escapeHtml(latest.reason || 'Advance')} (${latest.date_given || '-'})
                    </td>
                    <td style="padding:8px 12px; text-align:center;">
                      <button onclick="window.paySalaryModal('${e.emp_id}','${escapeHtml(e.name).replace(/'/g,"\\'")}',${e.netPayable})"
                              style="padding:5px 10px; background:#059669; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
                        💵 Pay &amp; Settle
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Notice if filtering by advance only
  if (filterMode === 'advance_only') {
    html += `
      <div style="margin:16px 0 8px; display:flex; justify-content:space-between; align-items:center; background:#FEF2F2; padding:10px 16px; border-radius:8px; border:1px solid #FCA5A5;">
        <span style="font-size:13px; font-weight:700; color:#991B1B;">
          🔍 Showing only employees with active advance (${displayList.length})
        </span>
        <button onclick="window._empLedgerFilter='all';renderEmployeeLedger();" 
                style="background:none; border:none; color:#DC2626; font-weight:700; font-size:13px; cursor:pointer; text-decoration:underline;">
          Show All Employees ✕
        </button>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE CARDS
  // ═══════════════════════════════════════════════════════════
  if (displayList.length === 0) {
    html += `
      <div class="card" style="text-align:center; padding:30px; margin-top:16px;">
        <div style="font-size:32px;">🎉</div>
        <div style="font-size:16px; font-weight:700; color:#111827; margin-top:8px;">No Pending Advances!</div>
        <div style="font-size:13px; color:#6B7280; margin-top:4px;">No active employees have taken advance for this period.</div>
        <button onclick="window._empLedgerFilter='all';renderEmployeeLedger();" 
                style="margin-top:14px; padding:8px 16px; background:#2563EB; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer;">
          View All Employees
        </button>
      </div>
    `;
  }

  for (const emp of displayList) {
    const bal = emp.netPayable;
    const balColor = bal > 0 ? '#D97706' : (bal < 0 ? '#DC2626' : '#059669');
    const balBg = bal > 0 ? '#FEF3C7' : (bal < 0 ? '#FEE2E2' : '#D1FAE5');
    const status = bal > 0 ? 'COMPANY OWES' : (bal < 0 ? 'EMPLOYEE OWES' : 'SETTLED');
    const isCleaner = emp.earnedData.calculationType === 'per_flat';
    const flatCfg = emp.earnedData.flatConfig || {};
    
    html += `
      <div class="card" style="margin-top:14px; border-left:5px solid ${emp.advanceTotal > 0 ? '#DC2626' : balColor}; border-radius:12px; box-shadow:0 3px 12px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div style="flex:1; min-width:220px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:18px; font-weight:800; color:#111827;">${escapeHtml(emp.name)}</span>
              ${isCleaner ? `
                <span style="background:#E0E7FF; color:#3730A3; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                  🧹 Cleaning Staff (${flatCfg.flatsCount} Flats @ ₹${flatCfg.flatMonthlyRate}/mo)
                </span>
              ` : `
                <span style="background:#F3F4F6; color:#374151; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                  💼 Fixed Monthly (₹${(emp.monthly_salary || 0).toLocaleString('en-IN')}/mo)
                </span>
              `}
              ${emp.advanceTotal > 0 ? `
                <span style="background:#FEE2E2; color:#DC2626; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px; border:1px solid #FCA5A5;">
                  🎁 Advance: ₹${emp.advanceTotal.toLocaleString('en-IN')}
                </span>
              ` : ''}
            </div>
            
            <div style="font-size:12px; color:#6B7280; margin-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>Role: <strong>${escapeHtml(emp.role || 'Staff')}</strong></span>
              <span>•</span>
              ${isCleaner ? `
                <span>Flats: <strong>${flatCfg.flatsCount}</strong> (${escapeHtml(emp.assigned_rooms || 'Assigned')})</span>
                <span>•</span>
                <span style="color:#4338CA; font-weight:700;">Rate: ₹${flatCfg.flatMonthlyRate}/30 = ₹${flatCfg.dailyPerFlat.toFixed(1)}/day per flat</span>
              ` : `
                <span>Salary: <strong>₹${(emp.monthly_salary || 0).toLocaleString('en-IN')}/month</strong></span>
              `}
              <button onclick="window.setPerFlatRateModal('${emp.emp_id}','${escapeHtml(emp.name).replace(/'/g,"\\'")}',${isCleaner},${flatCfg.flatMonthlyRate || 4000},${flatCfg.flatsCount || 1})"
                      style="background:#F3F4F6; border:1px solid #D1D5DB; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:700; color:#374151; cursor:pointer;">
                ⚙️ Rate Settings
              </button>
            </div>
          </div>

          <div style="text-align:right; background:${balBg}; padding:10px 18px; border-radius:10px; min-width:140px;">
            <div style="font-size:10px; color:${balColor}; font-weight:800; letter-spacing:0.5px;">${status}</div>
            <div style="font-size:24px; font-weight:900; color:${balColor};">₹${Math.abs(bal).toLocaleString('en-IN')}</div>
            <div style="font-size:11px; color:${balColor}; font-weight:600;">Net Payable</div>
          </div>
        </div>
        
        <!-- PROMINENT ADVANCE BOX (If advance taken) -->
        ${emp.advanceTotal > 0 ? `
          <div style="margin-top:12px; padding:12px 14px; background:#FFF1F2; border:1.5px solid #FCA5A5; border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
              <span style="font-size:13px; font-weight:800; color:#991B1B; display:flex; align-items:center; gap:6px;">
                🎁 ADVANCE LIYA HAI (OUTSTANDING BALANCE):
              </span>
              <span style="font-size:18px; font-weight:900; color:#DC2626;">
                ₹${emp.advanceTotal.toLocaleString('en-IN')}
              </span>
            </div>
            
            <div style="background:#fff; border-radius:8px; padding:8px 12px; border:1px solid #FECDD3;">
              ${emp.advances.map(a => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:4px 0; border-bottom:1px dashed #FEE2E2;">
                  <div>
                    <span style="font-weight:700; color:#374151;">📅 ${a.date_given}</span>
                    <span style="color:#6B7280; margin:0 4px;">•</span>
                    <span style="color:#111827;">${escapeHtml(a.reason || 'Advance')}</span>
                    <span style="color:#9CA3AF; font-size:11px;">(${a.payment_mode || 'Cash'})</span>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-weight:800; color:#DC2626;">₹${a.pending_amount.toLocaleString('en-IN')}</span>
                    ${a.repaid_amount > 0 ? `
                      <span style="font-size:11px; color:#6B7280; margin-left:4px;">(₹${a.advance_amount} - ₹${a.repaid_amount} paid)</span>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="font-size:11px; color:#991B1B; margin-top:6px; font-weight:600;">
              💡 Note: Yeh ₹${emp.advanceTotal.toLocaleString('en-IN')} salary me se deduct ho chuka hai (Net Payable = ₹${bal.toLocaleString('en-IN')}).
            </div>
          </div>
        ` : `
          <div style="margin-top:10px; font-size:12px; color:#059669; font-weight:600;">
            ✅ Advance: ₹0 (No active advance taken)
          </div>
        `}

        <!-- Breakdown Details -->
        <div style="margin-top:12px; padding:12px; background:#F9FAFB; border-radius:10px; border:1px solid #E5E7EB;">
          ${emp.opening !== 0 ? `
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px; color:#6B7280;">📅 Opening balance (previous months)</span>
            <span style="font-size:13px; font-weight:700; color:${emp.opening > 0 ? '#059669' : '#DC2626'};">
              ${emp.opening > 0 ? '+' : ''}₹${emp.opening.toLocaleString('en-IN')}
            </span>
          </div>
          ` : ''}
          
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px; color:#059669; font-weight:600;">💵 Salary earned (${emp.earnedData.breakdown})</span>
            <span style="font-size:14px; font-weight:800; color:#059669;">+₹${emp.earnedData.earned.toLocaleString('en-IN')}</span>
          </div>
          
          ${emp.paid > 0 ? `
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px; color:#DC2626;">💸 Salary paid this month</span>
            <span style="font-size:14px; font-weight:700; color:#DC2626;">-₹${emp.paid.toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          
          ${emp.advanceTotal > 0 ? `
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px; color:#DC2626; font-weight:700;">🎁 Advance deducted (${emp.advances.length} entries)</span>
            <span style="font-size:14px; font-weight:800; color:#DC2626;">-₹${emp.advanceTotal.toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          
          <div style="display:flex; justify-content:space-between; padding:8px 0 4px; border-top:2px solid #E5E7EB; margin-top:6px;">
            <span style="font-size:14px; font-weight:800; color:#111827;">💰 Net Payable</span>
            <span style="font-size:17px; font-weight:900; color:${balColor};">₹${bal.toLocaleString('en-IN')}</span>
          </div>
          
          <div style="font-size:11px; color:#6B7280; margin-top:6px;">
            ${emp.earnedData.hasAttendance ? `
              📋 Attendance: ✅ ${emp.earnedData.present} Present · 🕐 ${emp.earnedData.half} Half Day · ❌ ${emp.earnedData.absent} Absent
            ` : `
              📋 Attendance: No daily attendance logs marked — Full standard salary calculated
            `}
          </div>
        </div>
        
        <!-- Action buttons -->
        <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
          <button onclick="window.paySalaryModal('${emp.emp_id}','${escapeHtml(emp.name).replace(/'/g,"\\'")}',${bal})" 
                  style="flex:1; min-width:140px; padding:10px; background:#059669; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
            💵 Pay Salary
          </button>
          <button onclick="window.giveAdvanceModal('${emp.emp_id}','${escapeHtml(emp.name).replace(/'/g,"\\'")}')" 
                  style="flex:1; min-width:140px; padding:10px; background:#D97706; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
            🎁 Give Advance
          </button>
          <button onclick="window.viewEmpHistory('${emp.emp_id}','${escapeHtml(emp.name).replace(/'/g,"\\'")}')" 
                  style="padding:10px 14px; background:#4B5563; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
            📊 History
          </button>
        </div>
      </div>
    `;
  }
  
  renderShell(html, 'employee-ledger');
};

// ═══════════════════════════════════════════════════════════
// SET PER-FLAT RATE & CALCULATION MODAL
// Allows owner to set flat rate (e.g. 4000/30 per flat) & flat count
// ═══════════════════════════════════════════════════════════
window.setPerFlatRateModal = function(empId, empName, isCleaner, currentRate, currentFlats) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px; border-radius:14px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px; font-size:19px; font-weight:800; color:#111827;">⚙️ Salary &amp; Rate Settings</h2>
      <div style="font-size:13px; color:#6B7280; margin-bottom:16px;">Configure calculation mode for <strong>${escapeHtml(empName)}</strong></div>
      
      <div class="form-group" style="margin-bottom:14px;">
        <label style="font-size:13px; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Calculation Type *</label>
        <select id="setCalcType" onchange="window.toggleRateModalFields()" style="width:100%; padding:9px 12px; border:1.5px solid #D1D5DB; border-radius:8px; font-size:14px; font-weight:600;">
          <option value="per_flat" ${isCleaner ? 'selected' : ''}>🧹 Cleaning Staff (Per-Flat Rate e.g. Vikalp Khand)</option>
          <option value="monthly" ${!isCleaner ? 'selected' : ''}>💼 Fixed Monthly Salary (Caretaker, Manager, etc.)</option>
        </select>
      </div>

      <!-- Per Flat Fields -->
      <div id="perFlatFields" style="display:${isCleaner ? 'block' : 'none'}; background:#EEF2FF; padding:14px; border-radius:10px; border:1px solid #C7D2FE; margin-bottom:14px;">
        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-size:12px; font-weight:700; color:#3730A3;">Per-Flat Monthly Rate ₹ *</label>
          <input id="setFlatMonthlyRate" type="number" value="${currentRate || 4000}" 
                 oninput="window.calcDailyRateHelper()"
                 style="width:100%; padding:8px 12px; border:1px solid #A5B4FC; border-radius:6px; font-size:15px; font-weight:700;" />
          <div id="dailyRateHelper" style="font-size:12px; color:#4338CA; margin-top:4px; font-weight:600;">
            💡 Daily rate = ₹${Math.round((currentRate || 4000) / 30)}/day per flat (₹${currentRate || 4000} / 30)
          </div>
        </div>

        <div class="form-group" style="margin-bottom:6px;">
          <label style="font-size:12px; font-weight:700; color:#3730A3;">Assigned Flats Count *</label>
          <input id="setFlatsCount" type="number" value="${currentFlats || 1}" 
                 oninput="window.calcDailyRateHelper()"
                 style="width:100%; padding:8px 12px; border:1px solid #A5B4FC; border-radius:6px; font-size:15px; font-weight:700;" />
        </div>

        <div id="monthlyTotalHelper" style="font-size:13px; font-weight:800; color:#312E81; margin-top:8px; padding-top:6px; border-top:1px dashed #C7D2FE;">
          Total Monthly Salary = ₹${((currentRate || 4000) * (currentFlats || 1)).toLocaleString('en-IN')}
        </div>
      </div>

      <!-- Fixed Monthly Fields -->
      <div id="fixedMonthlyFields" style="display:${!isCleaner ? 'block' : 'none'}; background:#F3F4F6; padding:14px; border-radius:10px; border:1px solid #E5E7EB; margin-bottom:14px;">
        <div class="form-group">
          <label style="font-size:12px; font-weight:700; color:#374151;">Fixed Monthly Salary ₹ *</label>
          <input id="setFixedMonthlySalary" type="number" placeholder="Enter fixed monthly salary"
                 style="width:100%; padding:8px 12px; border:1px solid #D1D5DB; border-radius:6px; font-size:15px; font-weight:700;" />
          <div style="font-size:12px; color:#6B7280; margin-top:4px;">
            Full salary is paid every month. Absents are deducted at ₹Salary / 30 per day.
          </div>
        </div>
      </div>

      <button onclick="window.savePerFlatRate('${empId}')" 
              style="width:100%; padding:12px; background:#2563EB; color:#fff; border:none; border-radius:8px; font-weight:800; font-size:15px; cursor:pointer;">
        💾 Save &amp; Apply Rate
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  // Prefill fixed monthly salary if applicable
  const emp = (window._empListCache || []).find(e => e.emp_id === empId);
  const fixInput = document.getElementById('setFixedMonthlySalary');
  if (fixInput && emp) {
    fixInput.value = emp.monthly_salary || 0;
  }
};

window.toggleRateModalFields = function() {
  const type = document.getElementById('setCalcType')?.value;
  const pf = document.getElementById('perFlatFields');
  const fm = document.getElementById('fixedMonthlyFields');
  if (pf) pf.style.display = type === 'per_flat' ? 'block' : 'none';
  if (fm) fm.style.display = type === 'monthly' ? 'block' : 'none';
};

window.calcDailyRateHelper = function() {
  const rate = parseFloat(document.getElementById('setFlatMonthlyRate')?.value) || 0;
  const flats = parseInt(document.getElementById('setFlatsCount')?.value) || 1;
  const dailyHelper = document.getElementById('dailyRateHelper');
  const totalHelper = document.getElementById('monthlyTotalHelper');
  
  if (dailyHelper) {
    dailyHelper.innerHTML = `💡 Daily rate = ₹${(rate / 30).toFixed(1)}/day per flat (₹${rate} / 30)`;
  }
  if (totalHelper) {
    totalHelper.innerHTML = `Total Monthly Salary = ₹${(rate * flats).toLocaleString('en-IN')}`;
  }
};

window.savePerFlatRate = async function(empId) {
  const type = document.getElementById('setCalcType').value;
  
  if (type === 'per_flat') {
    const rate = parseFloat(document.getElementById('setFlatMonthlyRate').value) || 4000;
    const flats = parseInt(document.getElementById('setFlatsCount').value) || 1;
    const dailyRate = Math.round(rate / 30);
    const totalMonthly = rate * flats;
    
    // Save to localStorage
    localStorage.setItem('tuhh_emp_type_' + empId, 'per_flat');
    localStorage.setItem('tuhh_cleaner_rate_' + empId, String(rate));
    localStorage.setItem('tuhh_cleaner_flats_' + empId, String(flats));
    
    // Update Supabase
    try {
      await sb.from('employees').update({
        employee_type: 'per_flat',
        per_flat_rate: dailyRate,
        monthly_salary: totalMonthly
      }).eq('emp_id', empId);
    } catch(e) {
      console.warn('Could not update employees table:', e);
    }
  } else {
    const fixSal = parseFloat(document.getElementById('setFixedMonthlySalary').value) || 0;
    localStorage.setItem('tuhh_emp_type_' + empId, 'monthly');
    localStorage.removeItem('tuhh_cleaner_rate_' + empId);
    localStorage.removeItem('tuhh_cleaner_flats_' + empId);
    
    try {
      await sb.from('employees').update({
        employee_type: 'Monthly',
        per_flat_rate: 0,
        monthly_salary: fixSal
      }).eq('emp_id', empId);
    } catch(e) {
      console.warn('Could not update employees table:', e);
    }
  }

  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Rate Saved', '✅ Rate & calculation updated');
  renderEmployeeLedger();
};

// ═══════════════════════════════════════════════════════════
// PAY SALARY MODAL
// Includes option to auto-settle pending advances
// ═══════════════════════════════════════════════════════════
window.paySalaryModal = function(empId, empName, suggestedAmount) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px; border-radius:14px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px; font-size:20px; font-weight:800; color:#111827;">💵 Pay Salary — ${escapeHtml(empName)}</h2>
      <div style="margin:12px 0 14px; padding:12px; background:#FEF3C7; border-radius:10px; border:1px solid #FDE68A;">
        <div style="font-size:12px; color:#92400E; font-weight:600;">💡 Suggested Net Payable:</div>
        <div style="font-size:24px; font-weight:900; color:#D97706; margin-top:2px;">₹${suggestedAmount.toLocaleString('en-IN')}</div>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Amount ₹ *</label>
        <input id="paySalAmt" type="number" value="${suggestedAmount > 0 ? suggestedAmount : ''}" placeholder="Enter amount" />
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Payment Mode *</label>
        <select id="paySalMode">
          <option value="UPI">UPI (Google Pay / PhonePe)</option>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank Transfer (NEFT/IMPS)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Paid By *</label>
        <select id="paySalBy">
          <option value="Company">🏢 TUHH Company Account</option>
          <option value="Praveen">🔵 Praveen Singh (Personal)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Payment Date *</label>
        <input id="paySalDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>

      <div style="margin:14px 0; background:#FFFBEB; padding:10px 12px; border-radius:8px; border:1px solid #FCD34D;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:700; color:#92400E;">
          <input id="autoSettleAdvCheck" type="checkbox" checked style="width:16px; height:16px; cursor:pointer;" />
          <span>Auto-deduct &amp; settle outstanding advances for this employee</span>
        </label>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Notes (optional)</label>
        <input id="paySalNotes" placeholder="e.g. September Salary settlement" />
      </div>
      
      <button onclick="window.savePaySalary('${empId}','${escapeHtml(empName).replace(/'/g,"\\'")}')" 
              style="width:100%; padding:12px; background:#059669; color:#fff; border:none; border-radius:8px; font-weight:800; font-size:15px; cursor:pointer;">
        💾 Save Salary Payment
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.savePaySalary = async function(empId, empName) {
  const amt = parseFloat(document.getElementById('paySalAmt').value) || 0;
  const mode = document.getElementById('paySalMode').value;
  const paidBy = document.getElementById('paySalBy').value;
  const date = document.getElementById('paySalDate').value;
  const notes = document.getElementById('paySalNotes').value.trim();
  const settleAdvances = document.getElementById('autoSettleAdvCheck')?.checked;
  
  if (amt <= 0) { alert('⚠️ Valid amount required'); return; }
  
  const monthStr = date.slice(0, 7);
  
  // 1. Save salary payment
  const { error } = await sb.from('salary_tracker').insert({
    emp_id: empId,
    month: monthStr,
    salary_due: 0,
    salary_paid: amt,
    payment_date: date,
    payment_mode: mode,
    paid_by: paidBy,
    notes: notes || null
  });
  
  if (error) { alert('❌ Error saving salary: ' + error.message); return; }

  // 2. If settle advances checked, mark pending advances as deducted
  if (settleAdvances) {
    try {
      const { data: pendingAdvs } = await sb.from('advance_tracker')
        .select('*')
        .eq('emp_id', empId)
        .eq('is_deducted', false);
      
      if (pendingAdvs && pendingAdvs.length > 0) {
        for (const adv of pendingAdvs) {
          await sb.from('advance_tracker').update({
            is_deducted: true,
            repaid_amount: adv.advance_amount,
            repaid_date: date,
            deducted_in_month: monthStr
          }).eq('id', adv.id);
        }
      }
    } catch(e) {
      console.warn('Could not auto-settle advances:', e);
    }
  }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Payment Saved', '✅ ₹' + amt.toLocaleString('en-IN') + ' paid to ' + empName);
  renderEmployeeLedger();
};

// ═══════════════════════════════════════════════════════════
// GIVE ADVANCE MODAL
// ═══════════════════════════════════════════════════════════
window.giveAdvanceModal = async function(empId, empName) {
  // If empId is empty, allow selecting employee
  let empSelectHtml = '';
  if (!empId) {
    const { data: emps } = await sb.from('employees').select('emp_id, name, role').eq('status', 'Active').order('name');
    empSelectHtml = `
      <div class="form-group">
        <label style="font-weight:700;">Select Employee *</label>
        <select id="advEmpSelect" style="width:100%; padding:9px 12px; border:1.5px solid #D1D5DB; border-radius:8px; font-size:14px; font-weight:700;">
          ${(emps || []).map(e => `<option value="${e.emp_id}" data-name="${escapeHtml(e.name)}">${escapeHtml(e.name)} (${e.role || 'Staff'})</option>`).join('')}
        </select>
      </div>
    `;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px; border-radius:14px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px; font-size:20px; font-weight:800; color:#111827;">🎁 Give Advance ${empName ? '— ' + escapeHtml(empName) : ''}</h2>
      <div style="margin:12px 0 14px; padding:10px 14px; background:#FEE2E2; border-radius:10px; font-size:12px; color:#991B1B; border:1px solid #FECACA;">
        ⚠️ Yeh advance employee ke ledger me dikhega aur unki salary se deduct hoga.
      </div>

      ${empSelectHtml}
      
      <div class="form-group">
        <label style="font-weight:700;">Amount ₹ *</label>
        <input id="advAmt" type="number" placeholder="Enter amount" autofocus />
        <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">
          ${[100, 200, 500, 1000, 2000, 4000].map(v => `
            <button type="button" onclick="document.getElementById('advAmt').value=${v}"
                    style="padding:4px 10px; background:#F3F4F6; border:1px solid #D1D5DB; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
              ₹${v}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Reason *</label>
        <input id="advReason" placeholder="e.g. Medicine, Petrol, Emergency, Biryani, Room Rent" />
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Payment Mode *</label>
        <select id="advMode">
          <option value="Cash">Cash</option>
          <option value="UPI">UPI (Google Pay / PhonePe)</option>
          <option value="Bank">Bank Transfer</option>
        </select>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Given By *</label>
        <select id="advBy">
          <option value="COMPANY">🏢 TUHH Company Account</option>
          <option value="UHHS-OD">🔵 Praveen Singh (Personal)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">Date *</label>
        <input id="advDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <button onclick="window.saveGiveAdvance('${empId}','${escapeHtml(empName).replace(/'/g,"\\'")}')" 
              style="width:100%; padding:12px; background:#D97706; color:#fff; border:none; border-radius:8px; font-weight:800; font-size:15px; cursor:pointer;">
        💾 Save Advance
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveGiveAdvance = async function(empId, empName) {
  let finalEmpId = empId;
  let finalEmpName = empName;
  
  if (!finalEmpId) {
    const sel = document.getElementById('advEmpSelect');
    finalEmpId = sel?.value;
    finalEmpName = sel?.options[sel.selectedIndex]?.getAttribute('data-name') || 'Staff';
  }

  const amt = parseFloat(document.getElementById('advAmt').value) || 0;
  const reason = document.getElementById('advReason').value.trim();
  const mode = document.getElementById('advMode').value;
  const paidBy = document.getElementById('advBy').value;
  const date = document.getElementById('advDate').value;
  
  if (amt <= 0) { alert('⚠️ Valid advance amount required'); return; }
  if (!reason) { alert('⚠️ Advance reason required'); return; }
  if (!finalEmpId) { alert('⚠️ Please select an employee'); return; }
  
  const { error } = await sb.from('advance_tracker').insert({
    emp_id: finalEmpId,
    date_given: date,
    advance_amount: amt,
    repaid_amount: 0,
    reason: reason,
    payment_mode: mode,
    paid_by: paidBy,
    is_deducted: false
  });
  
  if (error) { alert('❌ Error saving advance: ' + error.message); return; }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Advance Recorded', '✅ ₹' + amt.toLocaleString('en-IN') + ' advance to ' + finalEmpName);
  renderEmployeeLedger();
};

// ═══════════════════════════════════════════════════════════
// VIEW HISTORY MODAL
// ═══════════════════════════════════════════════════════════
window.viewEmpHistory = async function(empId, empName) {
  const [{ data: salaries }, { data: advances }] = await Promise.all([
    sb.from('salary_tracker').select('*').eq('emp_id', empId).order('payment_date', { ascending: false }),
    sb.from('advance_tracker').select('*').eq('emp_id', empId).order('date_given', { ascending: false })
  ]);
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  let html = `
    <div class="modal-box" style="max-width:720px; max-height:85vh; overflow-y:auto; border-radius:14px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px; font-size:20px; font-weight:800; color:#111827;">📊 History — ${escapeHtml(empName)}</h2>
      <div style="font-size:12px; color:#6B7280; margin-bottom:14px;">Complete salary payments &amp; advance transaction ledger</div>
      
      <!-- Salary Payments -->
      <div style="margin-top:14px;">
        <div style="font-weight:800; font-size:14px; color:#059669; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          💵 Salary Payments (${(salaries || []).length})
        </div>
        ${(salaries || []).length === 0 ? '<div style="color:#9CA3AF; font-size:12px; padding:10px; background:#F9FAFB; border-radius:8px;">No salary payment records found</div>' :
          '<div style="overflow-x:auto;"><table style="width:100%; font-size:12px; border-collapse:collapse;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left; padding:8px;">Date</th><th style="text-align:right; padding:8px;">Amount</th><th style="padding:8px;">Mode</th><th style="padding:8px;">Paid By</th><th style="padding:8px; text-align:left;">Notes</th></tr></thead><tbody>' +
          (salaries || []).map(s => 
            '<tr style="border-bottom:1px solid #E5E7EB;">' +
            '<td style="padding:8px; font-weight:600;">' + (s.payment_date || s.month) + '</td>' +
            '<td style="text-align:right; color:#059669; font-weight:800; padding:8px;">₹' + Number(s.salary_paid).toLocaleString('en-IN') + '</td>' +
            '<td style="padding:8px; text-align:center;">' + (s.payment_mode || '-') + '</td>' +
            '<td style="padding:8px; text-align:center;">' + (s.paid_by || '-') + '</td>' +
            '<td style="font-size:11px; padding:8px; color:#4B5563;">' + escapeHtml(s.notes || '-') + '</td>' +
            '</tr>'
          ).join('') + '</tbody></table></div>'
        }
      </div>
      
      <!-- Advances -->
      <div style="margin-top:22px;">
        <div style="font-weight:800; font-size:14px; color:#D97706; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          🎁 Advances Taken (${(advances || []).length})
        </div>
        ${(advances || []).length === 0 ? '<div style="color:#9CA3AF; font-size:12px; padding:10px; background:#F9FAFB; border-radius:8px;">No advance entries found</div>' :
          '<div style="overflow-x:auto;"><table style="width:100%; font-size:12px; border-collapse:collapse;"><thead><tr style="background:#FEF3C7;"><th style="text-align:left; padding:8px;">Date</th><th style="text-align:right; padding:8px;">Amount</th><th style="text-align:right; padding:8px;">Repaid</th><th style="padding:8px; text-align:left;">Reason</th><th style="padding:8px;">Mode</th><th style="padding:8px; text-align:center;">Status</th></tr></thead><tbody>' +
          (advances || []).map(a => {
            const isDed = a.is_deducted || (Number(a.repaid_amount || 0) >= Number(a.advance_amount || 0));
            return (
              '<tr style="border-bottom:1px solid #E5E7EB;">' +
              '<td style="padding:8px; font-weight:600;">' + a.date_given + '</td>' +
              '<td style="text-align:right; color:#D97706; font-weight:800; padding:8px;">₹' + Number(a.advance_amount).toLocaleString('en-IN') + '</td>' +
              '<td style="text-align:right; color:#059669; font-weight:600; padding:8px;">₹' + Number(a.repaid_amount || 0).toLocaleString('en-IN') + '</td>' +
              '<td style="padding:8px; font-size:12px; color:#374151;">' + escapeHtml(a.reason || '-') + '</td>' +
              '<td style="padding:8px; text-align:center;">' + (a.payment_mode || '-') + '</td>' +
              '<td style="padding:8px; text-align:center;">' + (isDed ? '<span style="color:#059669; font-weight:700;">✅ Settled</span>' : '<span style="color:#DC2626; font-weight:800;">⏳ Due</span>') + '</td>' +
              '</tr>'
            );
          }).join('') + '</tbody></table></div>'
        }
      </div>
    </div>
  `;
  modal.innerHTML = html;
  document.body.appendChild(modal);
};

console.log('✅ Employee Ledger v3 (TUHH Clean HRMS + Per-Flat Cleaning + Advance Tracker) loaded');
