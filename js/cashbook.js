// ═══════════════════════════════════════════════════════════
// 💰 CASH BOOK - Simple Cash Flow Tracking
// Balance = Received + Handover In - Handover Out - Expenses
// ═══════════════════════════════════════════════════════════

window.renderCashBook = async function() {
  if (!['developer', 'owner', 'admin'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'cashbook');
    return;
  }
  
  renderShell('<div class="loading">Loading Cash Book...</div>', 'cashbook');
  
  // Fetch all data
  const [{ data: holders }, { data: payments }, { data: handovers }] = await Promise.all([
    sb.from('cash_holders').select('*').eq('is_active', true),
    sb.from('payment_history').select('received_by, amount, booking_id, payment_date, payment_mode, guest_register(guest_name, rooms(nickname))').eq('payment_mode', 'Cash').neq('verification_status', 'rejected').gte('payment_date', '2026-08-19'),
    sb.from('cash_handovers').select('*').gte('handover_date', '2026-08-19').order('handover_date', { ascending: false })
  ]);
  const expenses = []; // No longer tracking expenses in Cash Book
  
  // Calculate balance for each holder
  const balances = (holders || []).map(h => {
    const received = (payments || []).filter(p => p.received_by === h.name).reduce((s, p) => s + Number(p.amount || 0), 0);
    const hoIn = (handovers || []).filter(x => x.to_person === h.name).reduce((s, x) => s + Number(x.amount || 0), 0);
    const hoOut = (handovers || []).filter(x => x.from_person === h.name).reduce((s, x) => s + Number(x.amount || 0), 0);
    const exp = (expenses || []).filter(e => e.paid_by === h.name).reduce((s, e) => s + Number(e.amount || 0), 0);
    const balance = received + hoIn - hoOut - exp;
    const receivedList = (payments || []).filter(p => p.received_by === h.name);
    return { ...h, received, hoIn, hoOut, exp, balance, receivedList };
  });
  
  // Filter: show only holders with balance OR today activity
  const today = new Date().toISOString().slice(0, 10);
  const hasActivity = (name) => {
    return (payments || []).some(p => p.received_by === name && p.payment_date >= today) ||
           (handovers || []).some(h => (h.to_person === name || h.from_person === name) && h.handover_date >= today);
  };
  
  const relevantBalances = balances.filter(h => 
    h.balance !== 0 || h.received > 0 || h.hoIn > 0 || h.hoOut > 0 || hasActivity(h.name)
  );
  
  // Group by type
  const finals = relevantBalances.filter(h => h.type === 'final');
  const managers = relevantBalances.filter(h => h.type === 'manager');
  const receivers = relevantBalances.filter(h => h.type === 'receiver');
  
  const totalPending = balances.filter(h => h.type !== 'final').reduce((s, h) => s + Math.max(h.balance, 0), 0);
  const totalInFinal = finals.reduce((s, h) => s + h.balance, 0);
  
  renderShell(`
    <div class="card">
      <h1>💰 Cash Book</h1>
      <div class="sub">Real-time cash flow across all holders</div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
        <div style="padding:16px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#92400E;font-weight:600;">CASH IN HAND (Pending)</div>
          <div style="font-size:28px;font-weight:800;color:#D97706;">₹${totalPending.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#78350F;">To be handed over to Firoz/Company</div>
        </div>
        <div style="padding:16px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#166534;font-weight:600;">WITH COMPANY/OWNERS</div>
          <div style="font-size:28px;font-weight:800;color:#059669;">₹${totalInFinal.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#166534;">Final holders</div>
        </div>
      </div>
      
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="cbAddHolder()" style="padding:10px 16px;background:#3B82F6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">➕ Add Holder</button>
        <button onclick="manageCashHolders()" style="padding:10px 16px;background:#7C3AED;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">⚙️ Manage Holders</button>
        <button onclick="cbReport()" style="padding:10px 16px;background:#DC2626;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">📊 Report</button>
      </div>
    </div>
    
    ${finals.length > 0 ? `
      <div class="card" style="border-left:4px solid #059669;">
        <div class="section-title">🏦 Final Holders (Company)</div>
        ${finals.map(h => cbCard(h)).join('')}
      </div>
    ` : ''}
    
    ${managers.length > 0 ? `
      <div class="card" style="border-left:4px solid #7C3AED;">
        <div class="section-title">👨‍💼 Manager</div>
        ${managers.map(h => cbCard(h)).join('')}
      </div>
    ` : ''}
    
    ${receivers.length > 0 ? `
      <div class="card" style="border-left:4px solid #3B82F6;">
        <div class="section-title">🧑‍💼 Staff (Cash Receivers)</div>
        ${receivers.map(h => cbCard(h)).join('')}
      </div>
    ` : ''}
  `, 'cashbook');
};

function cbCard(h) {
  const isPositive = h.balance > 0;
  const balanceColor = isPositive ? '#D97706' : h.balance < 0 ? '#DC2626' : '#6B7280';
  const balanceBg = isPositive ? '#FEF3C7' : h.balance < 0 ? '#FEE2E2' : '#F3F4F6';
  
  return `
    <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#111827;">${h.name}</div>
          <div style="font-size:10px;color:#6B7280;text-transform:uppercase;">${h.type}</div>
        </div>
        <div style="padding:8px 14px;background:${balanceBg};border-radius:8px;text-align:right;">
          <div style="font-size:10px;color:${balanceColor};font-weight:600;">BALANCE</div>
          <div style="font-size:22px;font-weight:800;color:${balanceColor};">₹${h.balance.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;">
        <div style="padding:6px;background:#F0FDF4;border-radius:5px;text-align:center;">
          <div style="color:#166534;font-size:10px;">Received</div>
          <div style="font-weight:700;">₹${h.received.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:6px;background:#EFF6FF;border-radius:5px;text-align:center;">
          <div style="color:#1E40AF;font-size:10px;">HO In</div>
          <div style="font-weight:700;">₹${h.hoIn.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:6px;background:#FEF3C7;border-radius:5px;text-align:center;">
          <div style="color:#92400E;font-size:10px;">HO Out</div>
          <div style="font-weight:700;">₹${h.hoOut.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:6px;background:#FEE2E2;border-radius:5px;text-align:center;">
          <div style="color:#991B1B;font-size:10px;">Expenses</div>
          <div style="font-weight:700;">₹${h.exp.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      ${h.balance > 0 && h.type !== 'final' ? `
        <button onclick="cbHandover('${h.name}', ${h.balance})" style="width:100%;margin-top:8px;padding:8px;background:#059669;color:#fff;border:none;border-radius:5px;font-weight:600;cursor:pointer;">
          📤 Handover ₹${h.balance.toLocaleString('en-IN')}
        </button>
      ` : ''}
      
      ${h.receivedList && h.receivedList.length > 0 ? `
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;font-size:11px;color:#6B7280;">▸ View ${h.receivedList.length} payments</summary>
          <div style="margin-top:6px;">
            ${h.receivedList.map(p => `
              <div style="padding:6px;background:#F9FAFB;border-radius:4px;margin-bottom:3px;font-size:11px;display:flex;justify-content:space-between;">
                <div>
                  <strong>${p.guest_register?.guest_name || 'Manual'}</strong>
                  <span style="color:#6B7280;"> · ${p.guest_register?.rooms?.nickname || ''} · ${p.payment_date}</span>
                </div>
                <div style="font-weight:700;color:#059669;">₹${Number(p.amount).toLocaleString('en-IN')}</div>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// HANDOVER
// ═══════════════════════════════════════════════════════════

window.cbHandover = async function(fromPerson, maxAmount) {
  const { data: holders } = await sb.from('cash_holders').select('name, type').eq('is_active', true);
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:450px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📤 Handover Cash</h2>
      <div style="padding:10px;background:#EFF6FF;border-radius:6px;margin-bottom:12px;font-size:13px;">
        <strong>${fromPerson}</strong> has <strong>₹${maxAmount.toLocaleString('en-IN')}</strong>
      </div>
      
      <div class="form-group">
        <label>Handover To *</label>
        <select id="cbToPerson">
          <option value="">-- Select --</option>
          ${(holders || []).filter(h => h.name !== fromPerson).map(h => `<option value="${h.name}">${h.name} (${h.type})</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Amount ₹ *</label>
        <input id="cbAmount" type="number" value="${maxAmount}" max="${maxAmount}" />
      </div>
      
      <div class="form-group">
        <label>Date</label>
        <input id="cbDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      
      <div class="form-group">
        <label>Notes</label>
        <input id="cbNotes" type="text" placeholder="Optional" />
      </div>
      
      <div id="cbErr"></div>
      
      <button onclick="cbSaveHandover('${fromPerson}')" style="width:100%;padding:10px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Save Handover
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.cbSaveHandover = async function(fromPerson) {
  const to = document.getElementById('cbToPerson').value;
  const amount = parseFloat(document.getElementById('cbAmount').value) || 0;
  const date = document.getElementById('cbDate').value;
  const notes = document.getElementById('cbNotes').value.trim() || null;
  
  if (!to) { document.getElementById('cbErr').innerHTML = '<div class="error">Select recipient</div>'; return; }
  if (amount <= 0) { document.getElementById('cbErr').innerHTML = '<div class="error">Enter amount</div>'; return; }
  
  const { error } = await sb.from('cash_handovers').insert({
    from_person: fromPerson,
    to_person: to,
    amount, handover_date: date, notes,
    created_by: SESSION.userId
  });
  
  if (error) { document.getElementById('cbErr').innerHTML = '<div class="error">' + error.message + '</div>'; return; }
  
  fsn.success('Done', `✅ ₹${amount} handed over ${fromPerson} → ${to}`);
  document.querySelector('.modal-overlay').remove();
  renderCashBook();
};

// ═══════════════════════════════════════════════════════════
// ADD HOLDER
// ═══════════════════════════════════════════════════════════

window.cbAddHolder = function() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>➕ Add Cash Holder</h2>
      
      <div class="form-group">
        <label>Name *</label>
        <input id="cbHName" type="text" placeholder="e.g., Ram" />
      </div>
      
      <div class="form-group">
        <label>Type *</label>
        <select id="cbHType">
          <option value="receiver">Receiver (Staff)</option>
          <option value="manager">Manager</option>
          <option value="final">Final (Company/Owner)</option>
        </select>
      </div>
      
      <div id="cbHErr"></div>
      
      <button onclick="cbSaveHolder()" style="width:100%;padding:10px;background:#3B82F6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
        💾 Add
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.cbSaveHolder = async function() {
  const name = document.getElementById('cbHName').value.trim();
  const type = document.getElementById('cbHType').value;
  
  if (!name) { document.getElementById('cbHErr').innerHTML = '<div class="error">Enter name</div>'; return; }
  
  const { error } = await sb.from('cash_holders').insert({ name, type, spending_limit: type === 'final' ? 999999 : 0 });
  
  if (error) { document.getElementById('cbHErr').innerHTML = '<div class="error">' + error.message + '</div>'; return; }
  
  fsn.success('Added', `✅ ${name} added`);
  document.querySelector('.modal-overlay').remove();
  renderCashBook();
};

// ═══════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════

window.cbReport = async function() {
  const today = new Date().toISOString().slice(0, 10);
  
  const [{ data: holders }, { data: payments }, { data: handovers }] = await Promise.all([
    sb.from('cash_holders').select('*').eq('is_active', true),
    sb.from('payment_history').select('booking_id, amount, received_by, payment_date, guest_register(guest_name, rooms(nickname))').eq('payment_mode', 'Cash').neq('verification_status', 'rejected').gte('payment_date', '2026-08-19'),
    sb.from('cash_handovers').select('*').gte('handover_date', '2026-08-19').order('handover_date', { ascending: false })
  ]);
  const expenses = []; // No longer tracking expenses in Cash Book
  
  // Only pending (non-final holders with balance > 0)
  const balances = (holders || []).map(h => {
    const received = (payments || []).filter(p => p.received_by === h.name).reduce((s, p) => s + Number(p.amount || 0), 0);
    const hoIn = (handovers || []).filter(x => x.to_person === h.name).reduce((s, x) => s + Number(x.amount || 0), 0);
    const hoOut = (handovers || []).filter(x => x.from_person === h.name).reduce((s, x) => s + Number(x.amount || 0), 0);
    const exp = (expenses || []).filter(e => e.paid_by === h.name).reduce((s, e) => s + Number(e.amount || 0), 0);
    return { ...h, received, hoIn, hoOut, exp, balance: received + hoIn - hoOut - exp };
  });
  
  const pending = balances.filter(h => h.balance > 0 && h.type !== 'final');
  const totalPending = pending.reduce((s, h) => s + h.balance, 0);
  
  // WhatsApp text
  let wa = `📊 *CASH SUMMARY — ${new Date(today).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}*\n\n`;
  
  pending.forEach(h => {
    wa += `👤 *${h.name}* (${h.type})\n`;
    const rcvd = (payments || []).filter(p => p.received_by === h.name);
    if (rcvd.length > 0) {
      wa += `💰 Received:\n`;
      rcvd.forEach(p => {
        wa += `  • ₹${p.amount} ${p.guest_register?.guest_name || 'Manual'}${p.guest_register?.rooms?.nickname ? ' ('+p.guest_register.rooms.nickname+')' : ''} - ${p.payment_date}\n`;
      });
    }
    const hosIn = (handovers || []).filter(x => x.to_person === h.name);
    if (hosIn.length > 0) {
      wa += `📥 Handover In:\n`;
      hosIn.forEach(x => wa += `  • ₹${x.amount} from ${x.from_person}\n`);
    }
    const hosOut = (handovers || []).filter(x => x.from_person === h.name);
    if (hosOut.length > 0) {
      wa += `📤 Handover Out:\n`;
      hosOut.forEach(x => wa += `  • ₹${x.amount} to ${x.to_person}\n`);
    }
    const exps = (expenses || []).filter(e => e.paid_by === h.name);
    if (exps.length > 0) {
      wa += `💸 Expenses:\n`;
      exps.forEach(e => wa += `  • ₹${e.amount} ${e.paid_to} (${e.category})\n`);
    }
    wa += `\n*Balance: ₹${h.balance}*\n\n`;
  });
  
  wa += `━━━━━━━━━━━━━━\n📊 *TOTAL CASH IN HAND: ₹${totalPending}*`;
  
  window._cbReportText = wa;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:700px;max-height:90vh;overflow-y:auto;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📊 Cash Report</h2>
      
      ${pending.length === 0 ? `
        <div style="text-align:center;padding:30px;">
          <div style="font-size:48px;">✅</div>
          <div style="font-weight:700;margin-top:8px;">All cash settled!</div>
        </div>
      ` : pending.map(h => `
        <div style="padding:14px;background:#FEF3C7;border-radius:10px;margin-bottom:10px;border-left:4px solid #D97706;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <div style="font-weight:700;font-size:15px;">${h.name}</div>
            <div style="font-weight:800;color:#D97706;font-size:18px;">₹${h.balance.toLocaleString('en-IN')}</div>
          </div>
          
          ${(payments || []).filter(p => p.received_by === h.name).map(p => `
            <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;font-size:12px;display:flex;justify-content:space-between;">
              <div>💰 ${p.guest_register?.guest_name || 'Manual'} ${p.guest_register?.rooms?.nickname ? '('+p.guest_register.rooms.nickname+')' : ''} - ${p.payment_date}</div>
              <div style="font-weight:700;color:#059669;">₹${p.amount}</div>
            </div>
          `).join('')}
          
          ${(handovers || []).filter(x => x.to_person === h.name).map(x => `
            <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;font-size:12px;display:flex;justify-content:space-between;">
              <div>📥 From ${x.from_person} - ${x.handover_date}</div>
              <div style="font-weight:700;color:#2563EB;">₹${x.amount}</div>
            </div>
          `).join('')}
          
          ${(handovers || []).filter(x => x.from_person === h.name).map(x => `
            <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;font-size:12px;display:flex;justify-content:space-between;">
              <div>📤 To ${x.to_person} - ${x.handover_date}</div>
              <div style="font-weight:700;color:#92400E;">-₹${x.amount}</div>
            </div>
          `).join('')}
          
          ${(expenses || []).filter(e => e.paid_by === h.name).map(e => `
            <div style="padding:6px 8px;background:#fff;border-radius:5px;margin-bottom:3px;font-size:12px;display:flex;justify-content:space-between;">
              <div>💸 ${e.paid_to} (${e.category}) - ${e.expense_date}</div>
              <div style="font-weight:700;color:#DC2626;">-₹${e.amount}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
      
      <div style="padding:16px;background:linear-gradient(135deg,#059669,#047857);color:#fff;border-radius:10px;text-align:center;margin-top:14px;">
        <div style="font-size:11px;opacity:0.9;">TOTAL CASH IN HAND</div>
        <div style="font-size:32px;font-weight:800;">₹${totalPending.toLocaleString('en-IN')}</div>
      </div>
      
      <div style="display:flex;gap:6px;margin-top:12px;">
        <button onclick="navigator.clipboard.writeText(window._cbReportText); alert('✅ Copied! Paste in WhatsApp');" style="flex:1;padding:12px;background:#25D366;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          📋 Copy for WhatsApp
        </button>
        <button onclick="cbPrintReport()" style="flex:1;padding:12px;background:#374151;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          🖨️ Print
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// Print report as PDF-ready page
window.cbPrintReport = function() {
  const text = window._cbReportText || 'No report';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cash Report - ${new Date().toLocaleDateString('en-IN')}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 700px; margin: 0 auto; color: #111827; }
        h1 { color: #D97706; border-bottom: 3px solid #FEF3C7; padding-bottom: 10px; margin-bottom: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #E5E7EB; font-size: 11px; color: #6B7280; }
        pre { background: #F9FAFB; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6; border-left: 4px solid #D97706; }
        .brand { font-size: 12px; color: #6B7280; }
        @media print {
          body { padding: 15px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💰 Cash Book Report</h1>
        <div class="brand">The Unique Haven Home Stay</div>
        <div class="brand">Generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>
      <pre>${text.replace(/\*/g, '')}</pre>
      <div class="footer">
        Prepared by Praveen Singh · UHHS Lucknow
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
    </body>
    </html>
  `;
  
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(html);
  win.document.close();
};

console.log('✅ Cash Book loaded (fresh)');
