// ═══════════════════════════════════════════════════════════
// 👥 EMPLOYEE LEDGER — Clean HRMS System
// Month filter + Salary + Advance auto-deduct
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

  // Calculate salary earned for given month
  async calculateSalaryEarned(emp, monthStr) {
    const { daysInMonth, daysElapsed } = this.getMonthInfo(monthStr);
    const monthStart = monthStr + '-01';
    const monthEnd = monthStr + '-' + String(daysInMonth).padStart(2, '0');
    
    // Get attendance for month
    const { data: attendance } = await sb.from('attendance_log')
      .select('att_date, status')
      .eq('emp_id', emp.emp_id)
      .gte('att_date', monthStart)
      .lte('att_date', monthEnd);
    
    const present = (attendance || []).filter(a => a.status === 'Present').length;
    const half = (attendance || []).filter(a => a.status === 'Half Day').length;
    const absent = (attendance || []).filter(a => a.status === 'Absent').length;
    const workedDays = present + (half * 0.5);
    
    let earned = 0;
    let breakdown = '';
    
    if (emp.employee_type === 'per_flat' && emp.per_flat_rate > 0) {
      // Laxmi type: per flat cleaning
      // TODO: fetch flats_cleaned from log — for now use present days × 3 flats
      const flatsCleaned = present * 3;
      earned = flatsCleaned * emp.per_flat_rate;
      breakdown = flatsCleaned + ' flats × ₹' + emp.per_flat_rate;
    } else if (emp.employee_type === 'per_day' && emp.daily_wage > 0) {
      earned = workedDays * emp.daily_wage;
      breakdown = workedDays + ' days × ₹' + emp.daily_wage;
    } else {
      // Monthly (default)
      const dailyRate = emp.monthly_salary / 30;
      earned = Math.round(workedDays * dailyRate);
      breakdown = workedDays + ' days × ₹' + Math.round(dailyRate) + '/day';
    }
    
    return { earned, present, half, absent, workedDays, breakdown, daysInMonth, daysElapsed };
  },

  // Get salary paid in month
  async getSalaryPaid(empId, monthStr) {
    const monthStart = monthStr + '-01';
    const [y, m] = monthStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = monthStr + '-' + String(lastDay).padStart(2, '0');
    
    const { data } = await sb.from('salary_tracker')
      .select('salary_paid')
      .eq('emp_id', empId)
      .gte('payment_date', monthStart)
      .lte('payment_date', monthEnd);
    
    return (data || []).reduce((s, r) => s + Number(r.salary_paid || 0), 0);
  },

  // Get advances given in month (not yet deducted)
  async getPendingAdvances(empId, monthStr) {
    const monthStart = monthStr + '-01';
    const [y, m] = monthStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = monthStr + '-' + String(lastDay).padStart(2, '0');
    
    const { data } = await sb.from('advance_tracker')
      .select('*')
      .eq('emp_id', empId)
      .gte('date_given', monthStart)
      .lte('date_given', monthEnd)
      .eq('is_deducted', false);
    
    return data || [];
  },

  // Get opening balance (previous months pending)
  async getOpeningBalance(empId, monthStr) {
    const monthStart = monthStr + '-01';
    const { data } = await sb.from('salary_tracker')
      .select('salary_due, salary_paid')
      .eq('emp_id', empId)
      .lt('payment_date', monthStart);
    
    const totalDue = (data || []).reduce((s, r) => s + Number(r.salary_due || 0), 0);
    const totalPaid = (data || []).reduce((s, r) => s + Number(r.salary_paid || 0), 0);
    return totalDue - totalPaid;
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
  
  renderShell('<div class="loading">Loading ledger...</div>', 'employee-ledger');
  
  // Fetch active employees
  const { data: emps } = await sb.from('employees')
    .select('*')
    .eq('status', 'Active')
    .order('name');
  
  if (!emps || emps.length === 0) {
    renderShell('<div class="card"><h1>📒 Employee Ledger</h1><div class="sub">No active employees</div></div>', 'employee-ledger');
    return;
  }
  
  // Build ledger data for each employee
  const ledger = [];
  for (const emp of emps) {
    const earnedData = await EMPLOYEE_LEDGER.calculateSalaryEarned(emp, selectedMonth);
    const paid = await EMPLOYEE_LEDGER.getSalaryPaid(emp.emp_id, selectedMonth);
    const advances = await EMPLOYEE_LEDGER.getPendingAdvances(emp.emp_id, selectedMonth);
    const opening = await EMPLOYEE_LEDGER.getOpeningBalance(emp.emp_id, selectedMonth);
    const advanceTotal = advances.reduce((s, a) => s + Number(a.advance_amount || 0), 0);
    const netPayable = opening + earnedData.earned - paid - advanceTotal;
    
    ledger.push({
      ...emp,
      earnedData,
      paid,
      advances,
      advanceTotal,
      opening,
      netPayable
    });
  }
  
  // Sort: highest owed first
  ledger.sort((a, b) => b.netPayable - a.netPayable);
  
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
    <div class="card">
      <h1>📒 Employee Ledger</h1>
      <div class="sub">Salary + Advance tracking (attendance-based)</div>
      
      <div style="display:flex;gap:12px;align-items:center;margin-top:14px;flex-wrap:wrap;">
        <label style="font-size:13px;font-weight:600;">📅 Month:</label>
        <select onchange="window._empLedgerMonth=this.value;renderEmployeeLedger();" 
                style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;font-weight:600;">
          ${monthOptions.map(m => 
            '<option value="' + m.val + '"' + (m.val === selectedMonth ? ' selected' : '') + '>' + m.label + '</option>'
          ).join('')}
        </select>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:14px;">
        <div style="padding:14px;background:#FEF3C7;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#92400E;font-weight:600;">💰 TOTAL PAYABLE</div>
          <div style="font-size:22px;font-weight:800;color:#D97706;margin-top:4px;">₹${totalPayable.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:14px;background:#FEE2E2;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#991B1B;font-weight:600;">🎁 ADVANCE OUTSTANDING</div>
          <div style="font-size:22px;font-weight:800;color:#DC2626;margin-top:4px;">₹${totalAdvanceOut.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:14px;background:#DBEAFE;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#1E40AF;font-weight:600;">👥 EMPLOYEES</div>
          <div style="font-size:22px;font-weight:800;color:#2563EB;margin-top:4px;">${ledger.length}</div>
        </div>
      </div>
    </div>
  `;
  
  // Employee cards
  for (const emp of ledger) {
    const bal = emp.netPayable;
    const balColor = bal > 0 ? '#D97706' : (bal < 0 ? '#DC2626' : '#059669');
    const balBg = bal > 0 ? '#FEF3C7' : (bal < 0 ? '#FEE2E2' : '#D1FAE5');
    const status = bal > 0 ? 'COMPANY OWES' : (bal < 0 ? 'EMPLOYEE OWES' : 'SETTLED');
    
    html += `
      <div class="card" style="border-left:4px solid ${balColor};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
          <div style="flex:1;min-width:200px;">
            <div style="font-size:17px;font-weight:700;color:#111827;">${emp.name}</div>
            <div style="font-size:12px;color:#6B7280;margin-top:4px;">
              ${emp.role} · ${emp.employee_type === 'per_flat' ? '₹' + emp.per_flat_rate + '/flat' : (emp.employee_type === 'per_day' ? '₹' + emp.daily_wage + '/day' : '₹' + emp.monthly_salary.toLocaleString('en-IN') + '/mo')}
            </div>
          </div>
          <div style="text-align:right;background:${balBg};padding:10px 16px;border-radius:10px;">
            <div style="font-size:10px;color:${balColor};font-weight:700;letter-spacing:0.5px;">${status}</div>
            <div style="font-size:24px;font-weight:800;color:${balColor};">₹${Math.abs(bal).toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        <!-- Breakdown -->
        <div style="margin-top:14px;padding:12px;background:#F9FAFB;border-radius:8px;">
          
          ${emp.opening !== 0 ? `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px;color:#6B7280;">📅 Opening balance (previous months)</span>
            <span style="font-size:14px;font-weight:700;color:${emp.opening > 0 ? '#059669' : '#DC2626'};">
              ${emp.opening > 0 ? '+' : ''}₹${emp.opening.toLocaleString('en-IN')}
            </span>
          </div>
          ` : ''}
          
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px;color:#059669;">💵 Salary earned (${emp.earnedData.breakdown})</span>
            <span style="font-size:14px;font-weight:700;color:#059669;">+₹${emp.earnedData.earned.toLocaleString('en-IN')}</span>
          </div>
          
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px;color:#DC2626;">💸 Salary paid this month</span>
            <span style="font-size:14px;font-weight:700;color:#DC2626;">-₹${emp.paid.toLocaleString('en-IN')}</span>
          </div>
          
          ${emp.advanceTotal > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #E5E7EB;">
            <span style="font-size:13px;color:#DC2626;">🎁 Advance given (${emp.advances.length} entries)</span>
            <span style="font-size:14px;font-weight:700;color:#DC2626;">-₹${emp.advanceTotal.toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          
          <div style="display:flex;justify-content:space-between;padding:10px 0 4px;border-top:2px solid #E5E7EB;margin-top:6px;">
            <span style="font-size:14px;font-weight:700;color:#111827;">💰 Net Payable</span>
            <span style="font-size:16px;font-weight:800;color:${balColor};">₹${bal.toLocaleString('en-IN')}</span>
          </div>
          
          <div style="font-size:10px;color:#6B7280;margin-top:6px;">
            ✅ ${emp.earnedData.present} Present · 🕐 ${emp.earnedData.half} Half · ❌ ${emp.earnedData.absent} Absent (out of ${emp.earnedData.daysElapsed} days)
          </div>
        </div>
        
        <!-- Advance entries detail (if any) -->
        ${emp.advances.length > 0 ? `
        <div style="margin-top:10px;padding:10px;background:#FEF3C7;border-radius:8px;">
          <div style="font-size:11px;font-weight:700;color:#92400E;margin-bottom:6px;">🎁 ADVANCES THIS MONTH:</div>
          ${emp.advances.map(a => `
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
              <span>${a.date_given} · ${a.reason || 'Advance'} (${a.payment_mode})</span>
              <span style="font-weight:700;">₹${Number(a.advance_amount).toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <!-- Action buttons -->
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="window.paySalaryModal('${emp.emp_id}','${emp.name.replace(/'/g,"\\'")}',${bal})" 
                  style="flex:1;min-width:140px;padding:10px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            💵 Pay Salary
          </button>
          <button onclick="window.giveAdvanceModal('${emp.emp_id}','${emp.name.replace(/'/g,"\\'")}')" 
                  style="flex:1;min-width:140px;padding:10px;background:#F59E0B;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            🎁 Give Advance
          </button>
          <button onclick="window.viewEmpHistory('${emp.emp_id}','${emp.name.replace(/'/g,"\\'")}')" 
                  style="padding:10px 14px;background:#6B7280;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            📊 History
          </button>
        </div>
      </div>
    `;
  }
  
  renderShell(html, 'employee-ledger');
};

// ═══════════════════════════════════════════════════════════
// PAY SALARY MODAL
// ═══════════════════════════════════════════════════════════
window.paySalaryModal = function(empId, empName, suggestedAmount) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💵 Pay Salary — ${empName}</h2>
      <div style="margin-bottom:14px;padding:10px;background:#FEF3C7;border-radius:8px;">
        <div style="font-size:12px;color:#92400E;">💡 Suggested amount (Net Payable):</div>
        <div style="font-size:20px;font-weight:800;color:#D97706;">₹${suggestedAmount.toLocaleString('en-IN')}</div>
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="paySalAmt" type="number" value="${suggestedAmount > 0 ? suggestedAmount : ''}" placeholder="Enter amount" />
      </div>
      
      <div class="form-group">
        <label>Payment Mode *</label>
        <select id="paySalMode">
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank Transfer</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Paid By *</label>
        <select id="paySalBy">
          <option value="Praveen">🔵 Praveen (my pocket)</option>
          <option value="Company">🏢 Company (company account)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Date</label>
        <input id="paySalDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <div class="form-group">
        <label>Notes (optional)</label>
        <input id="paySalNotes" placeholder="e.g. July salary balance" />
      </div>
      
      <button onclick="window.savePaySalary('${empId}','${empName.replace(/'/g,"\\'")}')" 
              style="width:100%;padding:12px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">
        💾 Save Payment
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
  
  if (amt <= 0) { alert('⚠️ Amount required'); return; }
  
  const monthStr = date.slice(0, 7);
  
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
  
  if (error) { alert('❌ Error: ' + error.message); return; }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Payment Saved', '✅ ₹' + amt + ' paid to ' + empName);
  renderEmployeeLedger();
};

// ═══════════════════════════════════════════════════════════
// GIVE ADVANCE MODAL
// ═══════════════════════════════════════════════════════════
window.giveAdvanceModal = function(empId, empName) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🎁 Give Advance — ${empName}</h2>
      <div style="margin-bottom:14px;padding:10px;background:#FEE2E2;border-radius:8px;font-size:12px;color:#991B1B;">
        ⚠️ This advance will be auto-deducted from employee's salary this month.
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="advAmt" type="number" placeholder="Enter amount" autofocus />
      </div>
      
      <div class="form-group">
        <label>Reason *</label>
        <input id="advReason" placeholder="e.g. Medicine, Petrol, Emergency" />
      </div>
      
      <div class="form-group">
        <label>Payment Mode *</label>
        <select id="advMode">
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Given By *</label>
        <select id="advBy">
          <option value="Praveen">🔵 Praveen (my pocket)</option>
          <option value="Company">🏢 Company (company account)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Date</label>
        <input id="advDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <button onclick="window.saveGiveAdvance('${empId}','${empName.replace(/'/g,"\\'")}')" 
              style="width:100%;padding:12px;background:#F59E0B;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">
        💾 Give Advance
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveGiveAdvance = async function(empId, empName) {
  const amt = parseFloat(document.getElementById('advAmt').value) || 0;
  const reason = document.getElementById('advReason').value.trim();
  const mode = document.getElementById('advMode').value;
  const paidBy = document.getElementById('advBy').value;
  const date = document.getElementById('advDate').value;
  
  if (amt <= 0) { alert('⚠️ Amount required'); return; }
  if (!reason) { alert('⚠️ Reason required'); return; }
  
  const { error } = await sb.from('advance_tracker').insert({
    emp_id: empId,
    date_given: date,
    advance_amount: amt,
    repaid_amount: 0,
    reason: reason,
    payment_mode: mode,
    paid_by: paidBy,
    is_deducted: false
  });
  
  if (error) { alert('❌ Error: ' + error.message); return; }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Advance Given', '✅ ₹' + amt + ' advance to ' + empName);
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
    <div class="modal-box" style="max-width:700px;max-height:80vh;overflow-y:auto;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📊 History — ${empName}</h2>
      
      <div style="margin-top:14px;">
        <div style="font-weight:700;font-size:14px;color:#059669;margin-bottom:8px;">💵 Salary Payments (${(salaries || []).length})</div>
        ${(salaries || []).length === 0 ? '<div style="color:#999;">No payments</div>' :
          '<table style="width:100%;font-size:12px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:6px;">Date</th><th>Amount</th><th>Mode</th><th>Paid By</th><th>Notes</th></tr></thead><tbody>' +
          (salaries || []).map(s => 
            '<tr style="border-bottom:1px solid #E5E7EB;">' +
            '<td style="padding:6px;">' + (s.payment_date || s.month) + '</td>' +
            '<td style="text-align:right;color:#059669;font-weight:700;">₹' + Number(s.salary_paid).toLocaleString('en-IN') + '</td>' +
            '<td>' + (s.payment_mode || '-') + '</td>' +
            '<td>' + (s.paid_by || '-') + '</td>' +
            '<td style="font-size:11px;">' + (s.notes || '-') + '</td>' +
            '</tr>'
          ).join('') + '</tbody></table>'
        }
      </div>
      
      <div style="margin-top:20px;">
        <div style="font-weight:700;font-size:14px;color:#F59E0B;margin-bottom:8px;">🎁 Advances (${(advances || []).length})</div>
        ${(advances || []).length === 0 ? '<div style="color:#999;">No advances</div>' :
          '<table style="width:100%;font-size:12px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:6px;">Date</th><th>Amount</th><th>Reason</th><th>Mode</th><th>Status</th></tr></thead><tbody>' +
          (advances || []).map(a => 
            '<tr style="border-bottom:1px solid #E5E7EB;">' +
            '<td style="padding:6px;">' + a.date_given + '</td>' +
            '<td style="text-align:right;color:#F59E0B;font-weight:700;">₹' + Number(a.advance_amount).toLocaleString('en-IN') + '</td>' +
            '<td>' + (a.reason || '-') + '</td>' +
            '<td>' + (a.payment_mode || '-') + '</td>' +
            '<td>' + (a.is_deducted ? '✅ Deducted' : '⏳ Pending') + '</td>' +
            '</tr>'
          ).join('') + '</tbody></table>'
        }
      </div>
    </div>
  `;
  modal.innerHTML = html;
  document.body.appendChild(modal);
};

console.log('✅ Employee Ledger v2 (Clean HRMS) loaded');
