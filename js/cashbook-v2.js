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
      
      // Expenses
      const totalExpenses = (expenses || [])
        .filter(e => e.paid_by === holder.name)
        .reduce((s, e) => s + (e.amount || 0), 0);
      
      const balance = received + handoversIn - handoversOut - totalExpenses;
      
      return {
        ...holder,
        received,
        handoversIn,
        handoversOut,
        expenses: totalExpenses,
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
      
      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;">
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
        <div style="padding:6px;background:#FEE2E2;border-radius:6px;text-align:center;">
          <div style="color:#991B1B;">Expenses</div>
          <div style="font-weight:700;">₹${h.expenses.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
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

console.log('✅ Cash Book V2 module loaded');
