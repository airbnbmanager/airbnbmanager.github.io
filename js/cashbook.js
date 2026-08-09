/**
 * 💰 Cash Book Module
 * Track who received what, handovers, reconciliation
 */

// Fixed people who receive UPI (final money holders)
const CASH_FINAL_HOLDERS = ['Firoz', 'Shahenshah'];

window.renderCashBook = async function() {
  if (!['owner', 'admin', 'developer', 'manager'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'cashbook');
    return;
  }
  
  const tab = window._cbTab || 'inhand';
  const tabs = `
    <div class="card" style="padding:8px;margin-bottom:12px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button onclick="window._cbTab='inhand';renderCashBook()" class="${tab==='inhand'?'':'secondary'}" style="flex:1;min-width:120px;">💰 Cash In Hand</button>
        <button onclick="window._cbTab='handover';renderCashBook()" class="${tab==='handover'?'':'secondary'}" style="flex:1;min-width:120px;">🤝 Handover</button>
        <button onclick="window._cbTab='daily';renderCashBook()" class="${tab==='daily'?'':'secondary'}" style="flex:1;min-width:120px;">📅 Daily Summary</button>
        <button onclick="window._cbTab='history';renderCashBook()" class="${tab==='history'?'':'secondary'}" style="flex:1;min-width:120px;">📜 History</button>
      </div>
    </div>`;
  
  if (tab === 'inhand') return renderCBInHand(tabs);
  if (tab === 'handover') return renderCBHandover(tabs);
  if (tab === 'daily') return renderCBDaily(tabs);
  if (tab === 'history') return renderCBHistory(tabs);
};

// ═══ TAB 1: CASH IN HAND ═══
async function renderCBInHand(tabs) {
  renderShell(`${tabs}<div class="loading">Loading...</div>`, 'cashbook');
  
  const [{ data: payments }, { data: emps }] = await Promise.all([
    sb.from('payment_history')
      .select('id, booking_id, amount, payment_date, payment_mode, received_by, handover_status, guest_register(guest_name, rooms(nickname, unit_no))')
      .eq('handover_status', 'in_hand')
      .neq('verification_status', 'rejected')
      .order('payment_date', { ascending: false }),
    sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name')
  ]);
  
  // Group by received_by
  const byPerson = {};
  (payments || []).forEach(p => {
    const person = p.received_by || 'Unknown';
    if (!byPerson[person]) byPerson[person] = { total: 0, count: 0, payments: [] };
    byPerson[person].total += Number(p.amount || 0);
    byPerson[person].count++;
    byPerson[person].payments.push(p);
  });
  
  const totalInHand = Object.values(byPerson).reduce((s, p) => s + p.total, 0);
  const totalCount = Object.values(byPerson).reduce((s, p) => s + p.count, 0);
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>💰 Cash In Hand</h1>
      <div class="sub">Payments received but not yet handed over</div>
    </div>
    
    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#FEF3C7;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#B45309;">₹${totalInHand.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total Floating</div>
        </div>
        <div style="text-align:center;padding:14px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#1E40AF;">${totalCount}</div>
          <div style="font-size:11px;">Payments Pending Handover</div>
        </div>
      </div>
    </div>
    
    ${Object.keys(byPerson).length === 0 ? `
      <div class="card">
        <div style="text-align:center;padding:20px;color:#059669;font-size:15px;">
          ✅ All cash handed over! No pending payments.
        </div>
      </div>
    ` : Object.entries(byPerson).sort((a,b) => b[1].total - a[1].total).map(([person, data]) => `
      <div class="card" style="border-left:4px solid ${CASH_FINAL_HOLDERS.includes(person)?'#059669':'#F59E0B'};">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin:0;">👤 ${person}${CASH_FINAL_HOLDERS.includes(person)?' <span style="font-size:11px;background:#059669;color:#fff;padding:2px 8px;border-radius:10px;">Final Holder</span>':''}</h3>
            <div style="font-size:12px;color:#666;margin-top:4px;">${data.count} payment${data.count>1?'s':''} received</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:800;color:#B45309;">₹${data.total.toLocaleString('en-IN')}</div>
            ${!CASH_FINAL_HOLDERS.includes(person) ? `<button onclick="startHandover('${person}',${data.total})" style="margin-top:6px;background:#059669;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">🤝 Handover Now</button>` : ''}
          </div>
        </div>
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;font-size:12px;color:#666;">View ${data.count} payment${data.count>1?'s':''}</summary>
          <div style="margin-top:8px;">
            ${data.payments.map(p => {
              const guest = p.guest_register?.guest_name || p.booking_id;
              const room = p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || '';
              return `
              <div style="padding:8px 10px;background:#fafafa;border-radius:6px;margin-bottom:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <strong>${guest}</strong>
                    ${room ? `<span style="color:#666;"> · 🏠 ${room}</span>` : ''}
                  </div>
                  <strong style="color:#059669;">₹${Number(p.amount).toLocaleString('en-IN')}</strong>
                </div>
                <div style="font-size:10px;color:#999;margin-top:2px;">
                  ${p.payment_date} · ${p.payment_mode} · ${p.booking_id}
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </details>
      </div>
    `).join('')}
  `, 'cashbook');
}

// ═══ TAB 2: HANDOVER ═══
window.startHandover = function(fromPerson, amount) {
  window._cbHandoverFrom = fromPerson;
  window._cbHandoverAmount = amount;
  window._cbTab = 'handover';
  renderCashBook();
};

async function renderCBHandover(tabs) {
  const fromPerson = window._cbHandoverFrom || '';
  const preAmount = window._cbHandoverAmount || 0;
  
  const { data: payments } = await sb.from('payment_history')
    .select('id, booking_id, amount, payment_date, payment_mode')
    .eq('handover_status', 'in_hand')
    .eq('received_by', fromPerson)
    .neq('verification_status', 'rejected');
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>🤝 Cash Handover</h1>
      <div class="sub">Transfer cash from one person to another</div>
    </div>
    
    <div class="card">
      <div class="form-grid">
        <div class="form-group">
          <label>From *</label>
          <input id="hFrom" type="text" value="${fromPerson}" placeholder="Employee name">
        </div>
        <div class="form-group">
          <label>To *</label>
          <select id="hTo">
            <option value="">-- Select --</option>
            ${CASH_FINAL_HOLDERS.map(p => `<option value="${p}">${p} (Final Holder)</option>`).join('')}
            <option value="__custom__">✏️ Other (type name)</option>
          </select>
          <input id="hToCustom" type="text" placeholder="Type name..." style="display:none;margin-top:6px;">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Amount ₹ *</label>
          <input id="hAmount" type="number" value="${preAmount}">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input id="hDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="hNotes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
      
      ${payments && payments.length > 0 ? `
        <div class="form-group" style="padding:10px;background:#F0FDF4;border-radius:8px;">
          <label style="font-weight:600;display:block;margin-bottom:8px;">☑️ Select payments to hand over:</label>
          <div style="max-height:200px;overflow-y:auto;">
            ${payments.map(p => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px;background:#fff;border-radius:4px;margin-bottom:4px;cursor:pointer;">
                <input type="checkbox" class="hPaymentCheck" data-id="${p.id}" data-amount="${p.amount}" checked onchange="updateHandoverAmount()">
                <span style="flex:1;font-size:12px;">${p.payment_date} · ${p.payment_mode} · <strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></span>
              </label>
            `).join('')}
          </div>
          <div style="margin-top:8px;padding:6px;background:#DBEAFE;border-radius:4px;font-size:12px;text-align:right;">
            Selected total: <strong id="selectedTotal">₹${payments.reduce((s,p)=>s+Number(p.amount||0),0).toLocaleString('en-IN')}</strong>
          </div>
        </div>
      ` : ''}
      
      <button onclick="saveHandover()" style="width:100%;">💾 Save Handover</button>
      <div id="hErr"></div>
    </div>
  `, 'cashbook');
  
  document.getElementById('hTo').addEventListener('change', e => {
    const custom = document.getElementById('hToCustom');
    if (e.target.value === '__custom__') {
      custom.style.display = 'block';
      custom.focus();
    } else {
      custom.style.display = 'none';
    }
  });
}

window.saveHandover = async function() {
  const from = document.getElementById('hFrom').value.trim();
  let to = document.getElementById('hTo').value;
  if (to === '__custom__') to = document.getElementById('hToCustom').value.trim();
  const amount = parseFloat(document.getElementById('hAmount').value) || 0;
  const date = document.getElementById('hDate').value;
  const notes = document.getElementById('hNotes').value.trim();

  
  if (!from || !to || amount <= 0) {
    document.getElementById('hErr').innerHTML = '<div class="error">From, To, Amount required</div>';
    return;
  }
  
  // Get selected payment IDs from checkboxes
  const paymentIds = [];
  document.querySelectorAll('.hPaymentCheck:checked').forEach(cb => {
    paymentIds.push(String(cb.dataset.id));
  });
  
  // Insert handover record
  const { error: e1 } = await sb.from('cash_handovers').insert({
    handover_date: date,
    from_person: from,
    to_person: to,
    amount,
    payment_ids: paymentIds,
    notes
  });
  
  if (e1) {
    document.getElementById('hErr').innerHTML = '<div class="error">' + e1.message + '</div>';
    return;
  }
  
  // Update selected payment statuses
  if (paymentIds.length > 0) {
    await sb.from('payment_history')
      .update({ 
        handover_status: 'handed_over',
        received_by: to
      })
      .in('id', paymentIds.map(id => parseInt(id)));
  }
  
  window._cbHandoverFrom = null;
  window._cbHandoverAmount = null;
  fsn.success('Success', '✅ Handover saved!');
  window._cbTab = 'inhand';
  renderCashBook();
};

// ═══ TAB 3: DAILY SUMMARY ═══
async function renderCBDaily(tabs) {
  const date = window._cbDailyDate || new Date().toISOString().slice(0, 10);
  
  const [{ data: payments }, { data: handovers }] = await Promise.all([
    sb.from('payment_history')
      .select('*, guest_register(guest_name, rooms(nickname))')
      .eq('payment_date', date)
      .neq('verification_status', 'rejected')
      .order('paid_at', { ascending: false }),
    sb.from('cash_handovers')
      .select('*')
      .eq('handover_date', date)
  ]);
  
  const cashPayments = (payments || []).filter(p => p.payment_mode === 'Cash');
  const upiPayments = (payments || []).filter(p => p.payment_mode === 'UPI' || p.payment_mode === 'Airbnb Payout');
  const otherPayments = (payments || []).filter(p => !['Cash','UPI','Airbnb Payout'].includes(p.payment_mode));
  
  const cashTotal = cashPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const upiTotal = upiPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const otherTotal = otherPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const total = cashTotal + upiTotal + otherTotal;
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>📅 Daily Cash Summary</h1>
      <input type="date" value="${date}" onchange="window._cbDailyDate=this.value;renderCashBook()" style="padding:6px;border-radius:6px;border:1px solid var(--border);">
    </div>
    
    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="text-align:center;padding:12px;background:#EFF6FF;border-radius:8px;">
          <div style="font-size:20px;font-weight:800;color:#1E40AF;">₹${total.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">Total</div>
        </div>
        <div style="text-align:center;padding:12px;background:#F0FDF4;border-radius:8px;">
          <div style="font-size:20px;font-weight:800;color:#059669;">₹${cashTotal.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">💵 Cash</div>
        </div>
        <div style="text-align:center;padding:12px;background:#EDE9FE;border-radius:8px;">
          <div style="font-size:20px;font-weight:800;color:#6D28D9;">₹${upiTotal.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">📱 UPI/Airbnb</div>
        </div>
        <div style="text-align:center;padding:12px;background:#FEF3C7;border-radius:8px;">
          <div style="font-size:20px;font-weight:800;color:#B45309;">₹${otherTotal.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;">🏦 Other</div>
        </div>
      </div>
    </div>
    
    ${cashPayments.length > 0 ? `
    <div class="card">
      <div class="section-title">💵 Cash Payments (${cashPayments.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Guest</th><th>Property</th><th>Amount</th><th>Received By</th><th>Status</th></tr></thead>
        <tbody>
          ${cashPayments.map(p => `<tr>
            <td>${p.guest_register?.guest_name || p.booking_id}</td>
            <td>${p.guest_register?.rooms?.nickname || '-'}</td>
            <td><strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
            <td>${p.received_by || '<span style="color:#DC2626;">Not set</span>'}</td>
            <td><span class="badge ${p.handover_status==='handed_over'?'green':'yellow'}">${p.handover_status==='handed_over'?'✅ Done':'⏳ Pending'}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>` : ''}
    
    ${handovers && handovers.length > 0 ? `
    <div class="card">
      <div class="section-title">🤝 Handovers Today (${handovers.length})</div>
      <div class="table-wrap"><table>
        <thead><tr><th>From</th><th>To</th><th>Amount</th><th>Payments</th><th>Notes</th></tr></thead>
        <tbody>
          ${handovers.map(h => `<tr>
            <td><strong>${h.from_person}</strong></td>
            <td>→ <strong>${h.to_person}</strong></td>
            <td>₹${Number(h.amount).toLocaleString('en-IN')}</td>
            <td>${h.payment_ids?.length || 0}</td>
            <td style="font-size:11px;color:#666;">${h.notes || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>` : ''}
    
    ${payments && payments.length === 0 ? `
      <div class="card"><div style="text-align:center;padding:20px;color:#999;">No payments on ${date}</div></div>
    ` : ''}
  `, 'cashbook');
}

// ═══ TAB 4: HISTORY ═══
async function renderCBHistory(tabs) {
  const { data: handovers } = await sb.from('cash_handovers')
    .select('*')
    .order('handover_date', { ascending: false })
    .limit(100);
  
  renderShell(`
    ${tabs}
    <div class="card">
      <h1>📜 Handover History</h1>
      <div class="sub">Last 100 handovers</div>
    </div>
    
    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Date</th><th>From</th><th>To</th><th style="text-align:right;">Amount</th>
        <th>Payments</th><th>Notes</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${(handovers || []).length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">No handover history yet</td></tr>' : ''}
        ${(handovers || []).map(h => `<tr>
          <td>${h.handover_date}</td>
          <td><strong>${h.from_person}</strong></td>
          <td>→ <strong>${h.to_person}</strong></td>
          <td style="text-align:right;"><strong>₹${Number(h.amount).toLocaleString('en-IN')}</strong></td>
          <td>${h.payment_ids?.length || 0}</td>
          <td style="font-size:11px;color:#666;">${h.notes || '-'}</td>
          <td><button class="btn-sm danger" onclick="deleteHandover(${h.id})">🗑️</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>
  `, 'cashbook');
}

window.deleteHandover = async function(id) {
  if (!confirm('Delete this handover? Payments will be marked in_hand again.')) return;
  
  const { data: h } = await sb.from('cash_handovers').select('*').eq('id', id).single();
  if (h && h.payment_ids && h.payment_ids.length > 0) {
    // Revert payments to in_hand + original receiver
    await sb.from('payment_history')
      .update({ 
        handover_status: 'in_hand',
        received_by: h.from_person
      })
      .in('id', h.payment_ids.map(x => parseInt(x)));
  }
  
  await sb.from('cash_handovers').delete().eq('id', id);
  fsn.success('Deleted', '✅ Handover reversed');
  renderCashBook();
};

window.updateHandoverAmount = function() {
  let total = 0;
  document.querySelectorAll('.hPaymentCheck:checked').forEach(cb => {
    total += Number(cb.dataset.amount || 0);
  });
  const totalEl = document.getElementById('selectedTotal');
  if (totalEl) totalEl.innerHTML = '₹' + total.toLocaleString('en-IN');
  const amtInput = document.getElementById('hAmount');
  if (amtInput) amtInput.value = total;
};

console.log('✅ Cash Book module loaded');
