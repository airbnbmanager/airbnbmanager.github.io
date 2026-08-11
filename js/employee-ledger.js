// ═══════════════════════════════════════════════════════════
// 👥 EMPLOYEE LEDGER MODULE
// Tracks: Salary earned, paid, advances, opening balance
// ═══════════════════════════════════════════════════════════

window.EMPLOYEE_LEDGER = {
  
  // Calculate salary earned using ATTENDANCE_LOG (attendance-based)
  async calculateEarned(empId, joiningDate, monthlySalary, asOnDate) {
    const rolloutDate = '2026-07-01';
    const startDate = joiningDate && joiningDate > rolloutDate ? joiningDate : rolloutDate;
    const endDate = asOnDate;
    
    if (startDate > endDate) return 0;
    
    const { data: attendance } = await sb.from('attendance_log')
      .select('att_date, status')
      .eq('emp_id', empId)
      .gte('att_date', startDate)
      .lte('att_date', endDate);
    
    let workDays = 0;
    (attendance || []).forEach(a => {
      if (a.status === 'Present') workDays += 1;
      else if (a.status === 'Half Day') workDays += 0.5;
    });
    
    const dailyRate = monthlySalary / 30;
    return Math.round(dailyRate * workDays);
  },

  // Get full ledger for all employees
  async getLedger(asOnDate) {
    const today = asOnDate || new Date().toISOString().slice(0, 10);
    
    // 1. All active employees
    const { data: emps } = await sb.from('employees')
      .select('emp_id, name, role, monthly_salary, joining_date, status')
      .eq('status', 'Active')
      .order('name');
    
    // 2. All salary_tracker entries
    const { data: salaries } = await sb.from('salary_tracker')
      .select('*');
    
    // 3. All advances (from advance_tracker)
    const { data: advances } = await sb.from('advance_tracker')
      .select('*');
    
    // Build ledger for each employee (async because of attendance fetch)
    const ledger = await Promise.all((emps || []).map(async (emp) => {
      // Salary earned from attendance
      const earned = await this.calculateEarned(emp.emp_id, emp.joining_date, emp.monthly_salary, today);
      
      // Opening balance (if any)
      const opening = (salaries || [])
        .filter(s => s.emp_id === emp.emp_id && s.is_opening_balance)
        .reduce((sum, s) => sum + (s.salary_due - s.salary_paid), 0);
      
      // Regular salary payments (non-opening)
      const paid = (salaries || [])
        .filter(s => s.emp_id === emp.emp_id && !s.is_opening_balance)
        .reduce((sum, s) => sum + (s.salary_paid || 0), 0);
      
      // Advances taken (unrepaid portion)
      const empAdvances = (advances || []).filter(a => a.emp_id === emp.emp_id);
      const totalAdvance = empAdvances.reduce((sum, a) => sum + (a.advance_amount || 0), 0);
      const advanceRepaid = empAdvances.reduce((sum, a) => sum + (a.repaid_amount || 0), 0);
      const advanceOutstanding = totalAdvance - advanceRepaid;
      
      // Net balance = Opening + Earned - Paid - Advance Outstanding
      const balance = opening + earned - paid - advanceOutstanding;
      
      return {
        ...emp,
        earned,
        opening,
        paid,
        advanceOutstanding,
        balance, // positive = company owes, negative = employee owes
        status: balance > 0 ? 'company_owes' : balance < 0 ? 'employee_owes' : 'settled'
      };
    }));
    
    return ledger;
  },
  
  // Get totals
  getTotals(ledger) {
    const companyOwes = ledger.filter(e => e.balance > 0).reduce((s, e) => s + e.balance, 0);
    const owedToCompany = ledger.filter(e => e.balance < 0).reduce((s, e) => s + Math.abs(e.balance), 0);
    return { companyOwes, owedToCompany, net: companyOwes - owedToCompany };
  }
};

// ═══════════════════════════════════════════════════════════
// UI: Render Employee Ledger
// ═══════════════════════════════════════════════════════════

window.renderEmployeeLedger = async function() {
  if (!['developer', 'owner', 'admin'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Only Owner/Admin/Developer</div></div>', 'employee-ledger');
    return;
  }
  
  renderShell('<div class="loading">Loading ledger...</div>', 'employee-ledger');
  
  const today = new Date().toISOString().slice(0, 10);
  const ledger = await EMPLOYEE_LEDGER.getLedger(today);
  const totals = EMPLOYEE_LEDGER.getTotals(ledger);
  
  // Sort: company_owes first, then settled, then employee_owes
  ledger.sort((a, b) => b.balance - a.balance);
  
  renderShell(`
    <div class="card">
      <h1>👥 Employee Ledger</h1>
      <div class="sub">As on ${new Date(today).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px;">
        <div style="padding:14px;background:#FEF3C7;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#92400E;font-weight:600;">Company Owes</div>
          <div style="font-size:22px;font-weight:800;color:#D97706;margin-top:4px;">₹${totals.companyOwes.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:14px;background:#DCFCE7;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#166534;font-weight:600;">Owed to Company</div>
          <div style="font-size:22px;font-weight:800;color:#16A34A;margin-top:4px;">₹${totals.owedToCompany.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:14px;background:#DBEAFE;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#1E40AF;font-weight:600;">Net Liability</div>
          <div style="font-size:22px;font-weight:800;color:#2563EB;margin-top:4px;">₹${totals.net.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="showOpeningBalanceModal()" style="padding:8px 14px;background:#7C3AED;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          📝 Set Opening Balance
        </button>
        <button onclick="showPaySalaryModal()" style="padding:8px 14px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          💰 Pay Salary
        </button>
      </div>
    </div>
    
    <div class="card">
      <div class="section-title">Employee Balances</div>
      
      ${ledger.map(emp => {
        const bal = emp.balance;
        const isPositive = bal > 0;
        const isZero = bal === 0;
        const color = isPositive ? '#D97706' : isZero ? '#6B7280' : '#DC2626';
        const bgColor = isPositive ? '#FEF3C7' : isZero ? '#F3F4F6' : '#FEE2E2';
        const statusLabel = isPositive ? 'Company Owes' : isZero ? 'Settled' : 'Owes Company';
        
        return `
          <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">
            <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:16px;font-weight:700;color:#111827;">${emp.name}</div>
                <div style="font-size:11px;color:#6B7280;margin-top:2px;">
                  ${emp.role} · ₹${emp.monthly_salary.toLocaleString('en-IN')}/mo
                  ${emp.joining_date ? ' · Joined ' + new Date(emp.joining_date).toLocaleDateString('en-IN', {day:'numeric', month:'short'}) : ''}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:10px;color:${color};font-weight:600;text-transform:uppercase;">${statusLabel}</div>
                <div style="font-size:22px;font-weight:800;color:${color};">₹${Math.abs(bal).toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #E5E7EB;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;">
              <div>
                <div style="color:#6B7280;">Opening</div>
                <div style="font-weight:700;color:#111827;">₹${emp.opening.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style="color:#6B7280;">Earned</div>
                <div style="font-weight:700;color:#111827;">₹${emp.earned.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style="color:#6B7280;">Paid</div>
                <div style="font-weight:700;color:#059669;">₹${emp.paid.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style="color:#6B7280;">Advance Due</div>
                <div style="font-weight:700;color:#DC2626;">₹${emp.advanceOutstanding.toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <div style="margin-top:8px;display:flex;gap:6px;">
              <button onclick="showPaySalaryModal('${emp.emp_id}')" style="flex:1;padding:6px;background:#059669;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">💰 Pay</button>
              <button onclick="showEmployeeHistory('${emp.emp_id}', '${emp.name}')" style="flex:1;padding:6px;background:#6366F1;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">📊 History</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `, 'employee-ledger');
};

// ═══════════════════════════════════════════════════════════
// Opening Balance Modal
// ═══════════════════════════════════════════════════════════

window.showOpeningBalanceModal = async function() {
  const { data: emps } = await sb.from('employees')
    .select('emp_id, name').eq('status', 'Active').order('name');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📝 Set Opening Balance</h2>
      <div class="sub">Pending amount as of a specific date (before rollout)</div>
      
      <div class="form-group" style="margin-top:12px;">
        <label>Effective Date *</label>
        <input id="obDate" type="date" value="2026-07-31" />
      </div>
      
      <div class="form-group">
        <label>Employee *</label>
        <select id="obEmp">
          <option value="">-- Select Employee --</option>
          ${(emps || []).map(e => `<option value="${e.emp_id}">${e.name}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Type *</label>
        <select id="obType">
          <option value="company_owes">Company owes Employee (pending salary)</option>
          <option value="employee_owes">Employee owes Company (advance)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="obAmount" type="number" placeholder="Amount" />
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <input id="obNotes" type="text" placeholder="e.g., Pending from July" />
      </div>
      
      <div id="obErr"></div>
      
      <button onclick="saveOpeningBalance()" style="width:100%;margin-top:10px;background:#7C3AED;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Save Opening Balance
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveOpeningBalance = async function() {
  const empId = document.getElementById('obEmp').value;
  const type = document.getElementById('obType').value;
  const amount = parseFloat(document.getElementById('obAmount').value) || 0;
  const date = document.getElementById('obDate').value;
  const notes = document.getElementById('obNotes').value.trim() || 'Opening balance';
  
  if (!empId) { document.getElementById('obErr').innerHTML = '<div class="error">Select employee</div>'; return; }
  if (amount <= 0) { document.getElementById('obErr').innerHTML = '<div class="error">Enter amount</div>'; return; }
  
  // For "company_owes" → salary_due = amount, salary_paid = 0
  // For "employee_owes" → salary_paid = amount, salary_due = 0 (like advance)
  const record = {
    emp_id: empId,
    month: 'OPENING-' + date,
    salary_due: type === 'company_owes' ? amount : 0,
    salary_paid: type === 'employee_owes' ? amount : 0,
    payment_date: date,
    is_opening_balance: true,
    notes: notes + ' (as on ' + date + ')'
  };
  
  const { error } = await sb.from('salary_tracker').insert(record);
  
  if (error) {
    document.getElementById('obErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  fsn.success('Saved', '✅ Opening balance recorded');
  document.querySelector('.modal-overlay').remove();
  renderEmployeeLedger();
};

// ═══════════════════════════════════════════════════════════
// Pay Salary Modal
// ═══════════════════════════════════════════════════════════

window.showPaySalaryModal = async function(preSelectedEmpId) {
  const { data: emps } = await sb.from('employees')
    .select('emp_id, name, monthly_salary').eq('status', 'Active').order('name');
  
  const { data: holders } = await sb.from('cash_holders')
    .select('name').eq('is_active', true).order('name');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💰 Pay Salary</h2>
      
      <div class="form-group" style="margin-top:12px;">
        <label>Employee *</label>
        <select id="psEmp">
          <option value="">-- Select Employee --</option>
          ${(emps || []).map(e => `<option value="${e.emp_id}" ${preSelectedEmpId === e.emp_id ? 'selected' : ''}>${e.name} (₹${e.monthly_salary}/mo)</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="psAmount" type="number" placeholder="Amount paid" />
      </div>
      
      <div class="form-group">
        <label>Payment Date *</label>
        <input id="psDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <div class="form-group">
        <label>Payment Mode *</label>
        <select id="psMode">
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank Transfer</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Paid By (Cash Holder) *</label>
        <select id="psPaidBy">
          <option value="">-- Select --</option>
          ${(holders || []).map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <input id="psNotes" type="text" placeholder="Optional notes" />
      </div>
      
      <div id="psErr"></div>
      
      <button onclick="savePaySalary()" style="width:100%;margin-top:10px;background:#059669;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Record Payment
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.savePaySalary = async function() {
  const empId = document.getElementById('psEmp').value;
  const amount = parseFloat(document.getElementById('psAmount').value) || 0;
  const date = document.getElementById('psDate').value;
  const mode = document.getElementById('psMode').value;
  const paidBy = document.getElementById('psPaidBy').value;
  const notes = document.getElementById('psNotes').value.trim() || null;
  
  if (!empId) { document.getElementById('psErr').innerHTML = '<div class="error">Select employee</div>'; return; }
  if (amount <= 0) { document.getElementById('psErr').innerHTML = '<div class="error">Enter amount</div>'; return; }
  if (!paidBy) { document.getElementById('psErr').innerHTML = '<div class="error">Select who paid</div>'; return; }
  
  const empData = (await sb.from('employees').select('name').eq('emp_id', empId).single()).data;
  const monthStr = date.slice(0, 7); // YYYY-MM
  
  // Insert into salary_tracker
  const { data: salRecord, error: salErr } = await sb.from('salary_tracker').insert({
    emp_id: empId,
    month: monthStr,
    salary_due: 0,
    salary_paid: amount,
    payment_date: date,
    payment_mode: mode,
    paid_by: paidBy,
    is_opening_balance: false,
    notes: notes
  }).select().single();
  
  if (salErr) {
    document.getElementById('psErr').innerHTML = '<div class="error">' + salErr.message + '</div>';
    return;
  }
  
  // Also insert into cash_expenses (deducts from paid_by's balance)
  if (mode === 'Cash') {
    await sb.from('cash_expenses').insert({
      paid_by: paidBy,
      amount: amount,
      category: 'salary',
      linked_id: salRecord.id,
      linked_type: 'salary_tracker',
      paid_to: empData?.name || empId,
      expense_date: date,
      notes: 'Salary payment: ' + (notes || ''),
      created_by: SESSION.userId
    });
  }
  
  fsn.success('Paid', '✅ Salary payment recorded');
  document.querySelector('.modal-overlay').remove();
  renderEmployeeLedger();
};

// ═══════════════════════════════════════════════════════════
// Employee History Modal
// ═══════════════════════════════════════════════════════════

window.showEmployeeHistory = async function(empId, empName) {
  const { data: salaries } = await sb.from('salary_tracker')
    .select('*').eq('emp_id', empId).order('payment_date', { ascending: false });
  
  const { data: advances } = await sb.from('advance_tracker')
    .select('*').eq('emp_id', empId).order('date_given', { ascending: false });
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;max-height:80vh;overflow-y:auto;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📊 ${empName} — History</h2>
      
      <div class="section-title" style="margin-top:14px;">Salary Records</div>
      ${(salaries || []).length === 0 ? '<div class="sub">No salary records yet</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Month</th><th>Due</th><th>Paid</th><th>By</th><th>Notes</th></tr></thead>
          <tbody>
            ${salaries.map(s => `
              <tr>
                <td style="font-size:11px;">${s.payment_date || '-'}</td>
                <td style="font-size:11px;">${s.month}${s.is_opening_balance ? ' 🔹' : ''}</td>
                <td>₹${(s.salary_due||0).toLocaleString('en-IN')}</td>
                <td style="color:#059669;">₹${(s.salary_paid||0).toLocaleString('en-IN')}</td>
                <td style="font-size:11px;">${s.paid_by || '-'}</td>
                <td style="font-size:10px;color:#6B7280;">${s.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `}
      
      <div class="section-title" style="margin-top:14px;">Advance Records</div>
      ${(advances || []).length === 0 ? '<div class="sub">No advance records</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Amount</th><th>Repaid</th><th>Mode</th><th>Reason</th></tr></thead>
          <tbody>
            ${advances.map(a => `
              <tr>
                <td style="font-size:11px;">${a.date_given}</td>
                <td>₹${(a.advance_amount||0).toLocaleString('en-IN')}</td>
                <td style="color:#059669;">₹${(a.repaid_amount||0).toLocaleString('en-IN')}</td>
                <td style="font-size:11px;">${a.payment_mode || '-'}</td>
                <td style="font-size:11px;">${a.reason || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `}
    </div>
  `;
  document.body.appendChild(modal);
};

console.log('✅ Employee Ledger module loaded');
