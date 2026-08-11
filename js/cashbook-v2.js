// ═══════════════════════════════════════════════════════════
// 💰 CASH BOOK V2 - Multi-Level Cash Flow Management
// Tracks: Receivers → Manager → Final Holders + Expenses
// ═══════════════════════════════════════════════════════════

window.CASHBOOK_V2 = {
  
  // Get all cash holders
  async getHolders() {
    const { data } = await sb.from('cash_holders')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('name');
    return data || [];
  },
  
  // Calculate balance for each holder
  // Balance = (payments received) + (handovers IN) - (handovers OUT) - (expenses)
  async calculateBalances() {
    const holders = await this.getHolders();
    
    // 1. Cash payments received (from payment_history)
    const { data: cashPayments } = await sb.from('payment_history')
      .select('received_by, amount')
      .eq('payment_mode', 'Cash')
      .neq('verification_status', 'rejected');
    
    // 2. Handovers
    const { data: handovers } = await sb.from('cash_handovers')
      .select('from_person, to_person, amount');
    
    // 3. Expenses
    const { data: expenses } = await sb.from('cash_expenses')
      .select('paid_by, amount');
    
    // 4. Reimbursements (Praveen's own money spent for company)
    const { data: reimbursements } = await sb.from('reimbursements')
      .select('paid_by, amount');
    
    return holders.map(holder => {
      // Cash received directly (from guests)
      const received = (cashPayments || [])
        .filter(p => p.received_by === holder.name || p.received_by === holder.name + ' Singh')
        .reduce((s, p) => s + (p.amount || 0), 0);
      
      // Handovers IN
      const handoversIn = (handovers || [])
        .filter(h => h.to_person === holder.name)
        .reduce((s, h) => s + (h.amount || 0), 0);
      
      // Handovers OUT
      const handoversOut = (handovers || [])
        .filter(h => h.from_person === holder.name)
        .reduce((s, h) => s + (h.amount || 0), 0);
      
      // Reimbursements (own money spent for company)
      const totalReimbursements = (reimbursements || [])
        .filter(r => r.paid_by === holder.name)
        .reduce((s, r) => s + (r.amount || 0), 0);
      
      // Balance: positive = has cash, negative = company owes them
      // NOTE: Salary excluded (tracked in Employee Ledger separately)
      const balance = received + handoversIn - handoversOut - totalReimbursements;
      
      return {
        ...holder,
        received,
        handoversIn,
        handoversOut,
        reimbursements: totalReimbursements,
        balance
      };
    });
  }
};

// ═══════════════════════════════════════════════════════════
// UI: Render Cash Book V2
// ═══════════════════════════════════════════════════════════

window.renderCashBookV2 = async function() {
  if (!['developer', 'owner', 'admin'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'cashbook-v2');
    return;
  }
  
  renderShell('<div class="loading">Loading Cash Book...</div>', 'cashbook-v2');
  
  const balances = await CASHBOOK_V2.calculateBalances();
  const holders = balances;
  
  // Group by type
  const receivers = holders.filter(h => h.type === 'receiver');
  const managers = holders.filter(h => h.type === 'manager');
  const finals = holders.filter(h => h.type === 'final');
  
  const totalCashInSystem = holders.reduce((s, h) => s + Math.max(h.balance, 0), 0);
  
  renderShell(`
    <div class="card">
      <h1>💰 Cash Book</h1>
      <div class="sub">Real-time cash flow across all holders</div>
      
      <div style="margin-top:14px;padding:16px;background:linear-gradient(135deg, #FEF3C7, #FDE68A);border-radius:12px;">
        <div style="font-size:11px;color:#92400E;font-weight:600;">TOTAL CASH IN SYSTEM</div>
        <div style="font-size:32px;font-weight:800;color:#D97706;margin-top:4px;">₹${totalCashInSystem.toLocaleString('en-IN')}</div>
      </div>
      
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="showReceivePaymentModal()" style="padding:10px 16px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          💰 Record Cash Received
        </button>
        <button onclick="showHandoverModal()" style="padding:10px 16px;background:#7C3AED;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          📤 Handover Cash
        </button>
        <button onclick="showAddHolderModal()" style="padding:10px 16px;background:#3B82F6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          ➕ Add Holder
        </button>
        <button onclick="showDailyReport()" style="padding:10px 16px;background:#DC2626;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          📊 Daily Report
        </button>
      </div>
    </div>
    
    <!-- FINAL HOLDERS (Company Accounts) -->
    <div class="card" style="border-left:4px solid #059669;">
      <div class="section-title">🏦 Final Holders (Company)</div>
      ${finals.map(h => renderHolderCard(h, '#DCFCE7', '#059669')).join('')}
    </div>
    
    <!-- MANAGER -->
    <div class="card" style="border-left:4px solid #7C3AED;">
      <div class="section-title">👨‍💼 Manager</div>
      ${managers.map(h => renderHolderCard(h, '#EDE9FE', '#7C3AED')).join('')}
    </div>
    
    <!-- RECEIVERS -->
    <div class="card" style="border-left:4px solid #3B82F6;">
      <div class="section-title">🧑‍💼 Cash Receivers (Staff)</div>
      ${receivers.length === 0 ? '<div class="sub">No receivers yet</div>' : receivers.map(h => renderHolderCard(h, '#DBEAFE', '#3B82F6')).join('')}
    </div>
  `, 'cashbook-v2');
};

function renderHolderCard(h, bgColor, textColor) {
  const isPositive = h.balance > 0;
  return `
    <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:700;color:#111827;">${h.name}</div>
          <div style="font-size:11px;color:#6B7280;text-transform:uppercase;">${h.type}</div>
        </div>
        <div style="text-align:right;padding:8px 14px;background:${bgColor};border-radius:8px;">
          <div style="font-size:10px;color:${textColor};font-weight:600;">BALANCE</div>
          <div style="font-size:20px;font-weight:800;color:${isPositive ? textColor : '#DC2626'};">₹${h.balance.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;">
        <div style="padding:6px;background:#F0FDF4;border-radius:6px;text-align:center;">
          <div style="color:#166534;">Received</div>
          <div style="font-weight:700;">₹${h.received.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:6px;background:#EFF6FF;border-radius:6px;text-align:center;">
          <div style="color:#1E40AF;">Handover In</div>
          <div style="font-weight:700;">₹${h.handoversIn.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:6px;background:#FEF3C7;border-radius:6px;text-align:center;">
          <div style="color:#92400E;">Handover Out</div>
          <div style="font-weight:700;">₹${h.handoversOut.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:6px;background:#F3E8FF;border-radius:6px;text-align:center;">
          <div style="color:#7C3AED;">Reimburse</div>
          <div style="font-weight:700;">₹${(h.reimbursements||0).toLocaleString('en-IN')}</div>
        </div>
      </div>
      ${h.balance < 0 ? `<div style="margin-top:8px;padding:8px;background:#FEE2E2;border-left:4px solid #DC2626;border-radius:6px;font-size:12px;color:#991B1B;"><strong>💰 Company Owes:</strong> ₹${Math.abs(h.balance).toLocaleString('en-IN')} (reimbursement due)</div>` : ''}
      
      ${h.balance > 0 ? `
        <div style="margin-top:8px;display:flex;gap:6px;">
          <button onclick="showHandoverModal('${h.name}')" style="flex:1;padding:6px;background:${textColor};color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">📤 Handover</button>
        </div>
      ` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// MODAL: Add New Holder
// ═══════════════════════════════════════════════════════════

window.showAddHolderModal = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>➕ Add Cash Holder</h2>
      
      <div class="form-group" style="margin-top:12px;">
        <label>Name *</label>
        <input id="ahName" type="text" placeholder="e.g., Ram, Shyam" />
      </div>
      
      <div class="form-group">
        <label>Type *</label>
        <select id="ahType">
          <option value="receiver">Receiver (Staff who takes cash from guests)</option>
          <option value="manager">Manager (Can spend cash)</option>
          <option value="final">Final (Company/Owner account)</option>
        </select>
      </div>
      
      <div id="ahErr"></div>
      
      <button onclick="saveNewHolder()" style="width:100%;margin-top:10px;background:#3B82F6;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Add Holder
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveNewHolder = async function() {
  const name = document.getElementById('ahName').value.trim();
  const type = document.getElementById('ahType').value;
  
  if (!name) { document.getElementById('ahErr').innerHTML = '<div class="error">Enter name</div>'; return; }
  
  const { error } = await sb.from('cash_holders').insert({
    name, type,
    spending_limit: type === 'final' ? 999999 : type === 'manager' ? 50000 : 0
  });
  
  if (error) {
    document.getElementById('ahErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }
  
  fsn.success('Added', '✅ ' + name + ' added as ' + type);
  document.querySelector('.modal-overlay').remove();
  renderCashBookV2();
};

// ═══════════════════════════════════════════════════════════
// MODAL: Record Cash Received (from guest)
// ═══════════════════════════════════════════════════════════

window.showReceivePaymentModal = async function() {
  const holders = await CASHBOOK_V2.getHolders();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💰 Record Cash Received</h2>
      <div class="sub">Cash received from guest (any holder)</div>
      
      <div class="form-group" style="margin-top:12px;">
        <label>Received By *</label>
        <select id="rpReceivedBy">
          <option value="">-- Select --</option>
          <optgroup label="Final (Company)">
            ${holders.filter(h => h.type === 'final').map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
          </optgroup>
          <optgroup label="Manager">
            ${holders.filter(h => h.type === 'manager').map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
          </optgroup>
          <optgroup label="Staff (Receivers)">
            ${holders.filter(h => h.type === 'receiver').map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
          </optgroup>
        </select>
        <button onclick="quickAddHolder()" style="margin-top:6px;padding:4px 10px;background:#F3F4F6;border:1px dashed #9CA3AF;border-radius:4px;font-size:11px;cursor:pointer;">+ Add New Receiver</button>
      </div>
      
      <div class="form-group">
        <label>Booking ID (optional)</label>
        <input id="rpBookingId" type="text" placeholder="e.g., B1786347430576" />
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="rpAmount" type="number" placeholder="Amount" />
      </div>
      
      <div class="form-group">
        <label>Payment Date *</label>
        <input id="rpDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <input id="rpNotes" type="text" placeholder="Optional" />
      </div>
      
      <div id="rpErr"></div>
      
      <button onclick="saveReceivedPayment()" style="width:100%;margin-top:10px;background:#059669;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Record Payment
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.quickAddHolder = async function() {
  const name = prompt('Enter new receiver name:');
  if (!name || !name.trim()) return;
  
  const { error } = await sb.from('cash_holders').insert({
    name: name.trim(), type: 'receiver', spending_limit: 0
  });
  
  if (error) { alert('Error: ' + error.message); return; }
  
  fsn.success('Added', '✅ ' + name + ' added');
  document.querySelector('.modal-overlay').remove();
  showReceivePaymentModal();
};

window.saveReceivedPayment = async function() {
  const receivedBy = document.getElementById('rpReceivedBy').value;
  const bookingId = document.getElementById('rpBookingId').value.trim();
  const amount = parseFloat(document.getElementById('rpAmount').value) || 0;
  const date = document.getElementById('rpDate').value;
  const notes = document.getElementById('rpNotes').value.trim() || null;
  
  if (!receivedBy) { document.getElementById('rpErr').innerHTML = '<div class="error">Select receiver</div>'; return; }
  if (amount <= 0) { document.getElementById('rpErr').innerHTML = '<div class="error">Enter amount</div>'; return; }
  
  // Determine handover status
  const finalHolders = ['Firoz', 'Shahenshah', 'Company'];
  const handoverStatus = finalHolders.includes(receivedBy) ? 'handed_over' : 'in_hand';
  
  const { error } = await sb.from('payment_history').insert({
    booking_id: bookingId || 'MANUAL-' + Date.now(),
    amount,
    payment_mode: 'Cash',
    payment_date: date,
    received_by: receivedBy,
    handover_status: handoverStatus,
    notes: notes || 'Cash received via Cash Book',
    created_by: SESSION.userId
  });
  
  if (error) { document.getElementById('rpErr').innerHTML = '<div class="error">' + error.message + '</div>'; return; }
  
  fsn.success('Recorded', '✅ ₹' + amount + ' received by ' + receivedBy);
  document.querySelector('.modal-overlay').remove();
  renderCashBookV2();
};

// ═══════════════════════════════════════════════════════════
// MODAL: Handover Cash
// ═══════════════════════════════════════════════════════════

window.showHandoverModal = async function(fromHolder) {
  const holders = await CASHBOOK_V2.getHolders();
  const balances = await CASHBOOK_V2.calculateBalances();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📤 Handover Cash</h2>
      
      <div class="form-group" style="margin-top:12px;">
        <label>From *</label>
        <select id="hoFrom" onchange="updateHandoverBalance()">
          <option value="">-- Select --</option>
          ${balances.filter(h => h.balance > 0).map(h => 
            `<option value="${h.name}" ${fromHolder === h.name ? 'selected' : ''}>${h.name} (₹${h.balance.toLocaleString('en-IN')} available)</option>`
          ).join('')}
        </select>
      </div>
      
      <div id="hoAvailable" style="padding:8px;background:#EFF6FF;border-radius:6px;margin-bottom:10px;font-size:12px;color:#1E40AF;display:none;"></div>
      
      <div class="form-group">
        <label>To *</label>
        <select id="hoTo">
          <option value="">-- Select --</option>
          ${holders.map(h => `<option value="${h.name}">${h.name} (${h.type})</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="hoAmount" type="number" placeholder="Amount" />
      </div>
      
      <div class="form-group">
        <label>Date *</label>
        <input id="hoDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <input id="hoNotes" type="text" placeholder="Optional" />
      </div>
      
      <div id="hoErr"></div>
      
      <button onclick="saveHandover()" style="width:100%;margin-top:10px;background:#7C3AED;color:#fff;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Record Handover
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  if (fromHolder) setTimeout(() => updateHandoverBalance(), 100);
};

window.updateHandoverBalance = async function() {
  const from = document.getElementById('hoFrom').value;
  const availBox = document.getElementById('hoAvailable');
  if (!from) { availBox.style.display = 'none'; return; }
  
  const balances = await CASHBOOK_V2.calculateBalances();
  const holder = balances.find(h => h.name === from);
  if (holder) {
    availBox.style.display = 'block';
    availBox.innerHTML = `💰 Available: <strong>₹${holder.balance.toLocaleString('en-IN')}</strong>`;
  }
};

window.saveHandover = async function() {
  const from = document.getElementById('hoFrom').value;
  const to = document.getElementById('hoTo').value;
  const amount = parseFloat(document.getElementById('hoAmount').value) || 0;
  const date = document.getElementById('hoDate').value;
  const notes = document.getElementById('hoNotes').value.trim() || null;
  
  if (!from || !to) { document.getElementById('hoErr').innerHTML = '<div class="error">Select both parties</div>'; return; }
  if (from === to) { document.getElementById('hoErr').innerHTML = '<div class="error">Cannot handover to self</div>'; return; }
  if (amount <= 0) { document.getElementById('hoErr').innerHTML = '<div class="error">Enter amount</div>'; return; }
  
  const { error } = await sb.from('cash_handovers').insert({
    from_person: from,
    to_person: to,
    amount,
    handover_date: date,
    notes,
    created_by: SESSION.userId
  });
  
  if (error) { document.getElementById('hoErr').innerHTML = '<div class="error">' + error.message + '</div>'; return; }
  
  fsn.success('Done', '✅ ₹' + amount + ' handed over ' + from + ' → ' + to);
  document.querySelector('.modal-overlay').remove();
  renderCashBookV2();
};

// ═══════════════════════════════════════════════════════════
// DAILY CASH REPORT
// ═══════════════════════════════════════════════════════════

window.showDailyReport = async function(reportDate) {
  const date = reportDate || new Date().toISOString().slice(0, 10);
  
  // ═══ ALL-TIME DATA (Summary) ═══
  const balances = await CASHBOOK_V2.calculateBalances();
  
  // Reimbursements ALL (not just today)
  const { data: allReimburse } = await sb.from('reimbursements')
    .select('*').eq('paid_by', 'Praveen').order('expense_date', { ascending: false });
  const totalReimburseAll = (allReimburse || []).reduce((s, r) => s + r.amount, 0);
  
  // ═══ TODAY'S DATA ═══
  const { data: todayReceived } = await sb.from('payment_history')
    .select('id, booking_id, amount, received_by, payment_date, notes')
    .eq('payment_mode', 'Cash').eq('payment_date', date);
  
  const { data: todayHandovers } = await sb.from('cash_handovers')
    .select('*').eq('handover_date', date);
  
  const { data: todayExpenses } = await sb.from('cash_expenses')
    .select('*').eq('expense_date', date);
  
  const { data: todayReimburse } = await sb.from('reimbursements')
    .select('*').eq('expense_date', date);
  
  const tdReceived = (todayReceived || []).reduce((s, p) => s + p.amount, 0);
  const tdHandovers = (todayHandovers || []).reduce((s, h) => s + h.amount, 0);
  const tdExpenses = (todayExpenses || []).reduce((s, e) => s + e.amount, 0);
  const tdReimburse = (todayReimburse || []).reduce((s, r) => s + r.amount, 0);
  
  // Get guest names
  const bookingIds = (todayReceived || []).map(p => p.booking_id).filter(Boolean);
  let guestMap = {};
  if (bookingIds.length > 0) {
    const { data: bookings } = await sb.from('guest_register')
      .select('booking_id, guest_name').in('booking_id', bookingIds);
    (bookings || []).forEach(b => guestMap[b.booking_id] = b.guest_name);
  }
  
  // Holders with cash in hand (undelivered)
  const holdersWithCash = balances.filter(h => h.balance > 0 && h.type !== 'final');
  const holdersOwed = balances.filter(h => h.balance < 0);
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:800px;max-height:90vh;overflow-y:auto;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <h2 style="margin:0;">📊 Cash Book Report</h2>
        <input type="date" value="${date}" onchange="showDailyReport(this.value);this.closest('.modal-overlay').remove();" style="padding:6px 10px;border:1px solid #E5E7EB;border-radius:6px;">
      </div>
      
      <!-- ═══════════════════════════════ -->
      <!-- SECTION 1: PENDING (All Time) -->
      <!-- ═══════════════════════════════ -->
      
      <div style="padding:14px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:10px;margin-bottom:14px;border-left:4px solid #D97706;">
        <div style="font-weight:800;color:#92400E;margin-bottom:10px;font-size:15px;">🟡 CASH IN HAND (Undelivered)</div>
        <div style="font-size:11px;color:#78350F;margin-bottom:10px;">Ye paisa abhi tak handover nahi hua — company ka paisa staff/manager ke paas hai</div>
        
        ${holdersWithCash.length === 0 ? '<div style="padding:10px;background:#fff;border-radius:6px;font-size:12px;color:#059669;text-align:center;">✅ Sab paisa handover ho gaya!</div>' : holdersWithCash.map(h => `
          <div style="padding:10px;background:#fff;border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;color:#111827;">${h.name}</div>
              <div style="font-size:11px;color:#6B7280;">${h.type} · Received ₹${h.received.toLocaleString('en-IN')} · HO In ₹${h.handoversIn.toLocaleString('en-IN')} · HO Out ₹${h.handoversOut.toLocaleString('en-IN')}</div>
            </div>
            <div style="font-size:20px;font-weight:800;color:#D97706;">₹${h.balance.toLocaleString('en-IN')}</div>
          </div>
        `).join('')}
        
        <div style="margin-top:8px;padding:8px;background:#fff;border-radius:6px;text-align:center;font-weight:700;color:#92400E;">
          Total Undelivered: ₹${holdersWithCash.reduce((s,h) => s + h.balance, 0).toLocaleString('en-IN')}
        </div>
      </div>
      
      <!-- SECTION 2: REIMBURSEMENTS DUE -->
      <div style="padding:14px;background:linear-gradient(135deg,#F3E8FF,#E9D5FF);border-radius:10px;margin-bottom:14px;border-left:4px solid #7C3AED;">
        <div style="font-weight:800;color:#5B21B6;margin-bottom:10px;font-size:15px;">💜 REIMBURSEMENTS DUE (Total Pending)</div>
        <div style="font-size:11px;color:#4C1D95;margin-bottom:10px;">Praveen ne apne pocket se company ke liye kharch kiye — company ko wapas dena hai</div>
        
        <div style="padding:10px;background:#fff;border-radius:8px;text-align:center;margin-bottom:8px;">
          <div style="font-size:10px;color:#6B7280;font-weight:600;">TOTAL DUE TO PRAVEEN</div>
          <div style="font-size:24px;font-weight:800;color:#7C3AED;">₹${totalReimburseAll.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px;">${(allReimburse||[]).length} entries</div>
        </div>
        
        ${(allReimburse||[]).slice(0,5).map(r => `
          <div style="padding:6px 10px;background:#fff;border-radius:6px;margin-bottom:4px;display:flex;justify-content:space-between;font-size:11px;">
            <div>
              <strong>${r.category || r.description || 'Reimbursement'}</strong>
              <span style="color:#6B7280;"> · ${r.expense_date}</span>
            </div>
            <div style="font-weight:700;color:#7C3AED;">₹${r.amount.toLocaleString('en-IN')}</div>
          </div>
        `).join('')}
        ${(allReimburse||[]).length > 5 ? `<div style="text-align:center;font-size:11px;color:#6B7280;margin-top:4px;">... and ${(allReimburse||[]).length - 5} more</div>` : ''}
      </div>
      
      <!-- ═══════════════════════════════ -->
      <!-- SECTION 3: TODAY'S ACTIVITY -->
      <!-- ═══════════════════════════════ -->
      
      <div style="padding:14px;background:#EFF6FF;border-radius:10px;margin-bottom:14px;">
        <div style="font-weight:800;color:#1E40AF;margin-bottom:10px;font-size:15px;">📅 TODAY'S ACTIVITY (${new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})})</div>
        
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">
          <div style="padding:8px;background:#fff;border-radius:6px;text-align:center;">
            <div style="font-size:10px;color:#6B7280;">Cash IN</div>
            <div style="font-weight:700;color:#059669;">₹${tdReceived.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:8px;background:#fff;border-radius:6px;text-align:center;">
            <div style="font-size:10px;color:#6B7280;">Expenses</div>
            <div style="font-weight:700;color:#DC2626;">₹${tdExpenses.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:8px;background:#fff;border-radius:6px;text-align:center;">
            <div style="font-size:10px;color:#6B7280;">Reimburse</div>
            <div style="font-weight:700;color:#7C3AED;">₹${tdReimburse.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding:8px;background:#fff;border-radius:6px;text-align:center;">
            <div style="font-size:10px;color:#6B7280;">Handovers</div>
            <div style="font-weight:700;color:#2563EB;">₹${tdHandovers.toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        ${(todayReceived||[]).length > 0 ? `
          <div style="margin-top:10px;">
            <div style="font-size:12px;font-weight:700;color:#059669;margin-bottom:4px;">💰 Received:</div>
            ${(todayReceived||[]).map(p => `
              <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;display:flex;justify-content:space-between;font-size:11px;">
                <div><strong>${guestMap[p.booking_id] || 'Manual'}</strong> · by ${p.received_by}</div>
                <div style="font-weight:700;color:#059669;">₹${p.amount.toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${(todayHandovers||[]).length > 0 ? `
          <div style="margin-top:10px;">
            <div style="font-size:12px;font-weight:700;color:#2563EB;margin-bottom:4px;">📤 Handovers:</div>
            ${(todayHandovers||[]).map(h => `
              <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;display:flex;justify-content:space-between;font-size:11px;">
                <div><strong>${h.from_person}</strong> → <strong>${h.to_person}</strong></div>
                <div style="font-weight:700;color:#2563EB;">₹${h.amount.toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${(todayExpenses||[]).length > 0 ? `
          <div style="margin-top:10px;">
            <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:4px;">💸 Expenses:</div>
            ${(todayExpenses||[]).map(e => `
              <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;display:flex;justify-content:space-between;font-size:11px;">
                <div><strong>${e.paid_to}</strong> · ${e.category} (by ${e.paid_by})</div>
                <div style="font-weight:700;color:#DC2626;">₹${e.amount.toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${(todayReimburse||[]).length > 0 ? `
          <div style="margin-top:10px;">
            <div style="font-size:12px;font-weight:700;color:#7C3AED;margin-bottom:4px;">💜 Reimbursements:</div>
            ${(todayReimburse||[]).map(r => `
              <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;display:flex;justify-content:space-between;font-size:11px;">
                <div><strong>${r.category || r.description}</strong> · by ${r.paid_by}</div>
                <div style="font-weight:700;color:#7C3AED;">₹${r.amount.toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${tdReceived === 0 && tdHandovers === 0 && tdExpenses === 0 && tdReimburse === 0 ? '<div style="text-align:center;padding:10px;color:#6B7280;font-size:12px;">No activity today</div>' : ''}
      </div>
      
      <button onclick="window.print()" style="width:100%;padding:10px;background:#374151;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        🖨️ Print Report
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

console.log('✅ Cash Book V2 module loaded');
