/**
 * 💵 Company Advances Module
 * Manager (Praveen) takes advance from owners (Firoz/Shahenshah)
 * Links expenses to advances, tracks reconciliation
 */

const CA_OWNERS = ['Firoz', 'Shahenshah'];

window.renderCompanyAdvances = async function() {
  if (!['owner', 'admin', 'developer', 'manager'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'company-advances');
    return;
  }
  
  const tab = window._caTab || 'active';
  const tabs = `
    <div class="card" style="padding:8px;margin-bottom:12px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button onclick="window._caTab='active';renderCompanyAdvances()" class="${tab==='active'?'':'secondary'}" style="flex:1;min-width:120px;">💰 Active</button>
        <button onclick="window._caTab='new';renderCompanyAdvances()" class="${tab==='new'?'':'secondary'}" style="flex:1;min-width:120px;">➕ Take New</button>
        <button onclick="window._caTab='spending';renderCompanyAdvances()" class="${tab==='spending'?'':'secondary'}" style="flex:1;min-width:120px;">📊 Spending</button>
        <button onclick="window._caTab='history';renderCompanyAdvances()" class="${tab==='history'?'':'secondary'}" style="flex:1;min-width:120px;">📜 History</button>
      </div>
    </div>`;
  
  if (tab === 'active') return renderCAActive(tabs);
  if (tab === 'new') return renderCANew(tabs);
  if (tab === 'spending') return renderCASpending(tabs);
  if (tab === 'history') return renderCAHistory(tabs);
};

// Auto-update spent amounts from linked reimbursements
async function refreshAdvanceSpending() {
  const { data: advances } = await sb.from('company_advances').select('id, amount_given').eq('status', 'Active');
  for (const adv of (advances || [])) {
    const { data: exps } = await sb.from('reimbursements').select('amount').eq('company_advance_id', adv.id);
    const spent = (exps || []).reduce((s, e) => s + Number(e.amount || 0), 0);
    await sb.from('company_advances').update({ amount_spent: spent }).eq('id', adv.id);
  }
}

// ═══ TAB 1: ACTIVE ADVANCES ═══
async function renderCAActive(tabs) {
  renderShell(`${tabs}<div class="loading">Loading...</div>`, 'company-advances');
  
  await refreshAdvanceSpending();
  
  const { data: advances } = await sb.from('company_advances')
    .select('*')
    .eq('status', 'Active')
    .order('advance_date', { ascending: false });
  
  const totalGiven = (advances || []).reduce((s, a) => s + Number(a.amount_given || 0), 0);
  const totalSpent = (advances || []).reduce((s, a) => s + Number(a.amount_spent || 0), 0);
  const totalBalance = totalGiven - totalSpent;
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>💰 Active Advances</h1>
      <div class="sub">${(advances||[]).length} active advance${(advances||[]).length!==1?'s':''}</div>
    </div>
    
    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#1E40AF;">₹${totalGiven.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total Received</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FEF3C7;border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:#B45309;">₹${totalSpent.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total Spent</div>
        </div>
        <div style="text-align:center;padding:14px;background:${totalBalance>0?'#F0FDF4':'#FEF2F2'};border-radius:8px;">
          <div style="font-size:22px;font-weight:800;color:${totalBalance>0?'#059669':'#DC2626'};">₹${totalBalance.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Balance ${totalBalance>=0?'(in hand)':'(over-spent!)'}</div>
        </div>
      </div>
    </div>
    
    ${(advances||[]).length === 0 ? `
      <div class="card">
        <div style="text-align:center;padding:20px;color:#999;">
          No active advances. <button onclick="window._caTab='new';renderCompanyAdvances()" style="color:#3B82F6;background:none;border:none;cursor:pointer;text-decoration:underline;">➕ Take new advance</button>
        </div>
      </div>
    ` : (advances || []).map(a => {
      const balance = Number(a.amount_given || 0) - Number(a.amount_spent || 0);
      return `
      <div class="card" style="border-left:4px solid ${balance>0?'#059669':'#DC2626'};">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <strong>💵 ₹${Number(a.amount_given).toLocaleString('en-IN')} from ${a.given_by}</strong>
            <div style="font-size:12px;color:#666;margin-top:2px;">
              📅 ${a.advance_date} · To: ${a.given_to}${a.purpose ? ' · ' + a.purpose : ''}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#666;">Spent: ₹${Number(a.amount_spent||0).toLocaleString('en-IN')}</div>
            <div style="font-size:18px;font-weight:800;color:${balance>0?'#059669':'#DC2626'};">
              Balance: ₹${balance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-sm" onclick="viewAdvanceExpenses(${a.id})" style="background:#3B82F6;color:#fff;">📋 View Expenses</button>
          <button class="btn-sm" onclick="reconcileAdvance(${a.id})" style="background:#059669;color:#fff;">✅ Reconcile</button>
          <button class="btn-sm danger" onclick="deleteAdvance(${a.id})">🗑️</button>
        </div>
      </div>`;
    }).join('')}
  `, 'company-advances');
}

// ═══ TAB 2: TAKE NEW ADVANCE ═══
async function renderCANew(tabs) {
  const { data: emps } = await sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name');
  const currentUser = SESSION.displayName || 'Praveen';
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>➕ Take New Advance</h1>
      <div class="sub">Log advance received from owner</div>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>Given By (Owner) *</label>
          <select id="caGivenBy">
            ${CA_OWNERS.map(o => `<option value="${o}">${o}</option>`).join('')}
            <option value="__custom__">✏️ Other...</option>
          </select>
          <input id="caGivenByCustom" type="text" placeholder="Type name..." style="display:none;margin-top:6px;">
        </div>
        <div class="form-group">
          <label>Given To *</label>
          <select id="caGivenTo">
            <option value="${currentUser}" selected>${currentUser} (Me)</option>
            ${(emps || []).map(e => e.name !== currentUser ? `<option value="${e.name}">${e.name}</option>` : '').join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="caAmount" type="number" placeholder="e.g. 10000">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input id="caDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>
      <div class="form-group">
        <label>Purpose / Notes</label>
        <textarea id="caPurpose" rows="2" placeholder="e.g. Weekly expenses, Maintenance work, etc."></textarea>
      </div>
      <button onclick="saveNewAdvance()" style="width:100%;">💾 Save Advance</button>
      <div id="caErr"></div>
    </div>
  `, 'company-advances');
  
  document.getElementById('caGivenBy').addEventListener('change', e => {
    const custom = document.getElementById('caGivenByCustom');
    custom.style.display = e.target.value === '__custom__' ? 'block' : 'none';
    if (e.target.value === '__custom__') custom.focus();
  });
}

window.saveNewAdvance = async function() {
  let givenBy = document.getElementById('caGivenBy').value;
  if (givenBy === '__custom__') givenBy = document.getElementById('caGivenByCustom').value.trim();
  const givenTo = document.getElementById('caGivenTo').value;
  const amount = parseFloat(document.getElementById('caAmount').value) || 0;
  const date = document.getElementById('caDate').value;
  const purpose = document.getElementById('caPurpose').value.trim();
  
  if (!givenBy || !givenTo || amount <= 0) {
    document.getElementById('caErr').innerHTML = '<div class="error">All required fields must be filled</div>';
    return;
  }
  
  const { error } = await sb.from('company_advances').insert({
    advance_date: date,
    amount_given: amount,
    given_by: givenBy,
    given_to: givenTo,
    purpose: purpose || null,
    status: 'Active'
  });
  
  if (error) { document.getElementById('caErr').innerHTML = '<div class="error">'+error.message+'</div>'; return; }
  
  fsn.success('Success', '✅ Advance recorded!');
  window._caTab = 'active';
  renderCompanyAdvances();
};

// ═══ TAB 3: SPENDING REPORT ═══
async function renderCASpending(tabs) {
  const { data: advances } = await sb.from('company_advances').select('*').order('advance_date', { ascending: false });
  
  // Get all expenses linked to advances
  const advIds = (advances || []).map(a => a.id);
  const { data: expenses } = advIds.length ? await sb.from('reimbursements')
    .select('*, company_advance_id')
    .in('company_advance_id', advIds)
    .order('expense_date', { ascending: false }) : { data: [] };
  
  // Group by advance
  const byAdvance = {};
  (advances || []).forEach(a => {
    byAdvance[a.id] = { advance: a, expenses: [] };
  });
  (expenses || []).forEach(e => {
    if (byAdvance[e.company_advance_id]) byAdvance[e.company_advance_id].expenses.push(e);
  });
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>📊 Advance Spending Report</h1>
      <div class="sub">See how each advance was spent</div>
    </div>
    
    ${Object.values(byAdvance).length === 0 ? `
      <div class="card"><div style="text-align:center;padding:20px;color:#999;">No advances yet</div></div>
    ` : Object.values(byAdvance).map(({ advance, expenses }) => {
      const spent = expenses.reduce((s,e) => s + Number(e.amount||0), 0);
      const balance = Number(advance.amount_given) - spent;
      return `
      <div class="card" style="border-left:4px solid ${advance.status==='Active'?'#3B82F6':'#6B7280'};">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <strong>💵 ₹${Number(advance.amount_given).toLocaleString('en-IN')} from ${advance.given_by}</strong>
            <div style="font-size:11px;color:#666;">${advance.advance_date} · ${advance.status}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:#666;">Spent: ₹${spent.toLocaleString('en-IN')}</div>
            <div style="font-weight:700;color:${balance>=0?'#059669':'#DC2626'};">Balance: ₹${balance.toLocaleString('en-IN')}</div>
          </div>
        </div>
        ${expenses.length > 0 ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #ddd;">
            <div class="section-title" style="font-size:12px;">Expenses (${expenses.length}):</div>
            ${expenses.map(e => `
              <div style="padding:6px 8px;background:#fafafa;border-radius:4px;margin-bottom:4px;font-size:12px;display:flex;justify-content:space-between;">
                <span><strong>${e.category}</strong> · ${e.description || '-'} <span style="color:#999;">(${e.expense_date})</span></span>
                <strong>₹${Number(e.amount).toLocaleString('en-IN')}</strong>
              </div>
            `).join('')}
          </div>
        ` : '<div style="margin-top:8px;font-size:12px;color:#999;">No expenses linked yet</div>'}
      </div>`;
    }).join('')}
  `, 'company-advances');
}

// ═══ TAB 4: HISTORY ═══
async function renderCAHistory(tabs) {
  const { data: advances } = await sb.from('company_advances').select('*').order('advance_date', { ascending: false });
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>📜 Advance History</h1>
      <div class="sub">All advances (${(advances||[]).length})</div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>From</th><th>To</th><th>Given ₹</th><th>Spent ₹</th><th>Returned ₹</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${(advances||[]).length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:20px;color:#999;">No history</td></tr>' : ''}
        ${(advances||[]).map(a => `<tr>
          <td>${a.advance_date}</td>
          <td><strong>${a.given_by}</strong></td>
          <td>${a.given_to}</td>
          <td>₹${Number(a.amount_given).toLocaleString('en-IN')}</td>
          <td>₹${Number(a.amount_spent||0).toLocaleString('en-IN')}</td>
          <td>₹${Number(a.amount_returned||0).toLocaleString('en-IN')}</td>
          <td><span class="badge ${a.status==='Reconciled'?'green':'yellow'}">${a.status}</span></td>
          <td><button class="btn-sm danger" onclick="deleteAdvance(${a.id})">🗑️</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>
  `, 'company-advances');
}

// ═══ ACTIONS ═══
window.viewAdvanceExpenses = async function(id) {
  const { data: exps } = await sb.from('reimbursements')
    .select('*').eq('company_advance_id', id).order('expense_date', {ascending: false});
  const { data: adv } = await sb.from('company_advances').select('*').eq('id', id).single();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:20px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2 style="margin:0;">📋 Expenses from Advance</h2>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      <div style="padding:10px;background:#F0FDF4;border-radius:8px;margin-bottom:12px;font-size:13px;">
        <strong>Advance:</strong> ₹${Number(adv?.amount_given||0).toLocaleString('en-IN')} from ${adv?.given_by} on ${adv?.advance_date}
      </div>
      ${(exps||[]).length === 0 ? '<div style="text-align:center;padding:20px;color:#999;">No expenses linked yet</div>' : `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">Date</th><th style="padding:8px;text-align:left;">Category</th><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${(exps||[]).map(e => `<tr style="border-bottom:1px solid #eee;">
              <td style="padding:8px;font-size:12px;">${e.expense_date}</td>
              <td style="padding:8px;font-size:12px;">${e.category}</td>
              <td style="padding:8px;font-size:12px;">${e.description||'-'}</td>
              <td style="padding:8px;text-align:right;"><strong>₹${Number(e.amount).toLocaleString('en-IN')}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>`}
    </div>
  `;
  document.body.appendChild(modal);
};

window.reconcileAdvance = async function(id) {
  const { data: adv } = await sb.from('company_advances').select('*').eq('id', id).single();
  if (!adv) return;
  
  const spent = Number(adv.amount_spent || 0);
  const given = Number(adv.amount_given);
  const balance = given - spent;
  
  const msg = balance > 0 
    ? `Balance: ₹${balance} left. Returning to ${adv.given_by}?`
    : balance < 0 
    ? `Over-spent by ₹${Math.abs(balance)}. Need extra from ${adv.given_by}?`
    : 'Exact match! Mark as reconciled?';
  
  if (!confirm(msg + '\n\nProceed?')) return;
  
  await sb.from('company_advances').update({
    status: 'Reconciled',
    amount_returned: balance > 0 ? balance : 0,
    reconciled_date: new Date().toISOString().slice(0,10)
  }).eq('id', id);
  
  fsn.success('Reconciled', '✅ Advance closed');
  renderCompanyAdvances();
};

window.deleteAdvance = async function(id) {
  if (!confirm('Delete this advance? Linked expenses will be unlinked.')) return;
  await sb.from('reimbursements').update({ company_advance_id: null }).eq('company_advance_id', id);
  await sb.from('company_advances').delete().eq('id', id);
  fsn.success('Deleted', '✅');
  renderCompanyAdvances();
};

console.log('✅ Company Advances module loaded');
