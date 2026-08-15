window.renderMyLedger = async function() {
  const userName = SESSION.userName || SESSION.name || 'Praveen';
  renderShell('<div class="card"><h1>💼 My Cash Ledger — ' + userName + '</h1><div class="loading">Loading...</div></div>', 'my-ledger');
  
  const [
    { data: handoversIn },
    { data: handoversOut },
    { data: paymentsReceived },
    { data: expenses },
    { data: dailyExps }
  ] = await Promise.all([
    sb.from('cash_handovers').select('*').eq('to_person', userName).order('handover_date', { ascending: false }),
    sb.from('cash_handovers').select('*').eq('from_person', userName).order('handover_date', { ascending: false }),
    sb.from('payment_history').select('*, guest_register(guest_name, rooms(nickname,unit_no))').eq('received_by', userName).eq('payment_mode', 'Cash').neq('verification_status', 'rejected').order('payment_date', { ascending: false }),
    sb.from('cash_expenses').select('*').eq('paid_by', userName).order('expense_date', { ascending: false }),
    sb.from('expenses').select('*, expense_categories(category_name), rooms(nickname,unit_no)').eq('paid_by', userName).order('entry_date', { ascending: false })
  ]);
  
  const totalHOIn = (handoversIn || []).reduce((s, h) => s + Number(h.amount || 0), 0);
  const totalHOOut = (handoversOut || []).reduce((s, h) => s + Number(h.amount || 0), 0);
  const totalReceived = (paymentsReceived || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalDailyExps = (dailyExps || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalIn = totalHOIn + totalReceived;
  const totalOut = totalHOOut + totalExpenses + totalDailyExps;
  const balance = totalIn - totalOut;
  
  const expByCategory = {};
  (expenses || []).forEach(e => {
    const cat = e.category || 'other';
    if (!expByCategory[cat]) expByCategory[cat] = { total: 0, items: [] };
    expByCategory[cat].total += Number(e.amount || 0);
    expByCategory[cat].items.push(e);
  });
  
  const catIcons = { salary: '💵', advance: '🎁', maintenance: '🔧', reimbursement: '🧾', other: '📌' };
  const balColor = balance >= 0 ? '#059669' : '#DC2626';
  const balBg = balance >= 0 ? '#D1FAE5' : '#FEE2E2';
  
  let html = '<div class="card"><h1>💼 My Cash Ledger</h1><div style="font-size:14px;color:#666;">' + userName + ' · Complete cash flow history</div></div>';
  
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:16px 0;">';
  html += '<div style="background:#D1FAE5;padding:16px;border-radius:12px;border-left:4px solid #059669;"><div style="font-size:11px;color:#065F46;font-weight:700;">💰 TOTAL IN</div><div style="font-size:22px;font-weight:800;color:#059669;margin-top:6px;">₹' + totalIn.toLocaleString('en-IN') + '</div><div style="font-size:11px;color:#065F46;margin-top:4px;">Handover: ₹' + totalHOIn.toLocaleString('en-IN') + ' · Guest: ₹' + totalReceived.toLocaleString('en-IN') + '</div></div>';
  html += '<div style="background:#FEE2E2;padding:16px;border-radius:12px;border-left:4px solid #DC2626;"><div style="font-size:11px;color:#991B1B;font-weight:700;">💸 TOTAL OUT</div><div style="font-size:22px;font-weight:800;color:#DC2626;margin-top:6px;">₹' + totalOut.toLocaleString('en-IN') + '</div><div style="font-size:11px;color:#991B1B;margin-top:4px;">Expenses: ₹' + totalExpenses.toLocaleString('en-IN') + ' · Handover: ₹' + totalHOOut.toLocaleString('en-IN') + '</div></div>';
  html += '<div style="background:' + balBg + ';padding:16px;border-radius:12px;border-left:4px solid ' + balColor + ';"><div style="font-size:11px;color:' + balColor + ';font-weight:700;">📊 BALANCE</div><div style="font-size:26px;font-weight:800;color:' + balColor + ';margin-top:6px;">₹' + balance.toLocaleString('en-IN') + '</div><div style="font-size:11px;color:' + balColor + ';margin-top:4px;">' + (balance >= 0 ? '✅ Cash in hand' : '⚠️ Deficit') + '</div></div>';
  html += '</div>';
  
  // Money IN section
  html += '<div class="card" style="border-top:4px solid #059669;"><h2 style="color:#059669;">📥 Money IN (₹' + totalIn.toLocaleString('en-IN') + ')</h2>';
  
  if ((handoversIn || []).length > 0) {
    html += '<div style="margin:16px 0;"><div style="font-weight:700;font-size:13px;color:#666;margin-bottom:8px;">🔄 Handovers Received (' + handoversIn.length + ')</div>';
    html += '<table style="width:100%;font-size:13px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:8px;">Date</th><th>From</th><th>Amount</th><th>Notes</th></tr></thead><tbody>';
    handoversIn.forEach(h => {
      html += '<tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:8px;">' + h.handover_date + '</td><td style="text-align:center;font-weight:600;">' + h.from_person + '</td><td style="text-align:right;color:#059669;font-weight:700;">₹' + Number(h.amount).toLocaleString('en-IN') + '</td><td style="font-size:12px;color:#666;">' + (h.notes || '-') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  
  if ((paymentsReceived || []).length > 0) {
    html += '<div style="margin:16px 0;"><div style="font-weight:700;font-size:13px;color:#666;margin-bottom:8px;">🏨 Guest Cash Payments (' + paymentsReceived.length + ')</div>';
    html += '<table style="width:100%;font-size:13px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:8px;">Date</th><th>Guest</th><th>Room</th><th>Amount</th></tr></thead><tbody>';
    paymentsReceived.forEach(p => {
      html += '<tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:8px;">' + p.payment_date + '</td><td>' + (p.guest_register?.guest_name || '-') + '</td><td style="font-size:11px;">' + (p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || '-') + '</td><td style="text-align:right;color:#059669;font-weight:700;">₹' + Number(p.amount).toLocaleString('en-IN') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  
  if (totalIn === 0) html += '<div style="color:#999;text-align:center;padding:20px;">No incoming cash yet</div>';
  html += '</div>';
  
  // Money OUT section
  html += '<div class="card" style="border-top:4px solid #DC2626;"><h2 style="color:#DC2626;">📤 Money OUT (₹' + totalOut.toLocaleString('en-IN') + ')</h2>';
  
  Object.keys(expByCategory).forEach(cat => {
    const info = expByCategory[cat];
    html += '<div style="margin:16px 0;"><div style="font-weight:700;font-size:13px;color:#666;margin-bottom:8px;">' + (catIcons[cat] || '📌') + ' ' + cat.toUpperCase() + ' <span style="color:#DC2626;">₹' + info.total.toLocaleString('en-IN') + '</span> <span style="color:#999;font-weight:400;">(' + info.items.length + ' entries)</span></div>';
    html += '<table style="width:100%;font-size:13px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:8px;">Date</th><th>Paid To</th><th>Amount</th><th>Notes</th></tr></thead><tbody>';
    info.items.forEach(e => {
      html += '<tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:8px;">' + e.expense_date + '</td><td style="text-align:center;font-weight:600;">' + (e.paid_to || '-') + '</td><td style="text-align:right;color:#DC2626;font-weight:700;">₹' + Number(e.amount).toLocaleString('en-IN') + '</td><td style="font-size:11px;color:#666;">' + (e.notes || '').slice(0, 60) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  });
  
  // Daily Expenses Section
  if ((dailyExps || []).length > 0) {
    html += '<div style="margin:16px 0;"><div style="font-weight:700;font-size:13px;color:#666;margin-bottom:8px;">📋 DAILY EXPENSES <span style="color:#DC2626;">₹' + totalDailyExps.toLocaleString('en-IN') + '</span> <span style="color:#999;font-weight:400;">(' + dailyExps.length + ' entries)</span></div>';
    html += '<table style="width:100%;font-size:13px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:8px;">Date</th><th>Category</th><th>Room</th><th>Amount</th><th>Notes</th></tr></thead><tbody>';
    dailyExps.forEach(e => {
      html += '<tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:8px;">' + e.entry_date + '</td><td style="font-weight:600;">' + (e.expense_categories?.category_name || '-') + '</td><td style="font-size:11px;">' + (e.rooms?.nickname || e.rooms?.unit_no || '-') + '</td><td style="text-align:right;color:#DC2626;font-weight:700;">₹' + Number(e.amount).toLocaleString('en-IN') + '</td><td style="font-size:11px;color:#666;">' + (e.notes || '').slice(0, 60) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  
  if ((handoversOut || []).length > 0) {
    html += '<div style="margin:16px 0;"><div style="font-weight:700;font-size:13px;color:#666;margin-bottom:8px;">🔄 Handovers Given <span style="color:#DC2626;">₹' + totalHOOut.toLocaleString('en-IN') + '</span></div>';
    html += '<table style="width:100%;font-size:13px;"><thead><tr style="background:#F3F4F6;"><th style="text-align:left;padding:8px;">Date</th><th>To</th><th>Amount</th><th>Notes</th></tr></thead><tbody>';
    handoversOut.forEach(h => {
      html += '<tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:8px;">' + h.handover_date + '</td><td style="text-align:center;font-weight:600;">' + h.to_person + '</td><td style="text-align:right;color:#DC2626;font-weight:700;">₹' + Number(h.amount).toLocaleString('en-IN') + '</td><td style="font-size:11px;color:#666;">' + (h.notes || '-') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  
  if (totalOut === 0) html += '<div style="color:#999;text-align:center;padding:20px;">No outgoing cash yet</div>';
  html += '</div>';
  
  html += '<div class="card"><div style="text-align:center;font-size:12px;color:#999;">📊 Complete history · Last updated: ' + new Date().toLocaleString('en-IN') + '</div></div>';
  
  renderShell(html, 'my-ledger');
};

console.log('✅ My Cash Ledger module loaded');
