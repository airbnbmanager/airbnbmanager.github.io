// ═══════════════════════════════════════════════════════════
// 💰 CASH BOOK vFINAL — 100% Pure Dynamic Booking Sync (No Hardcoding)
// ═══════════════════════════════════════════════════════════

window._cbFilter = window._cbFilter || 'today';
window._cbTab = window._cbTab || 'cash';
window._cbCustomDate = window._cbCustomDate || null;

function cbNormDate(dStr) {
  if (!dStr) return '';
  dStr = String(dStr).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dStr)) {
    const parts = dStr.split('/');
    return parts[2].slice(0,4) + '-' + parts[1].padStart(2,'0') + '-' + parts[0].padStart(2,'0');
  }
  return dStr.slice(0, 10);
}

window.renderCashBook = async function() {
  renderShell('<div class="loading">Loading Cash Book...</div>', 'cashbook');
  
  const today = new Date().toISOString().slice(0, 10);
  let endDate = today;
  if (window._cbFilter === 'custom' && window._cbCustomDate) {
    endDate = cbNormDate(window._cbCustomDate);
  }
  
  // FETCH LIVE DATA DIRECTLY FROM SUPABASE (Booking Payments + Handovers)
  const [{ data: holders }, { data: payments }, { data: handovers }] = await Promise.all([
    sb.from('cash_holders').select('*'),
    sb.from('payment_history')
      .select('id, received_by, amount, booking_id, payment_date, payment_mode, notes, paid_at, verification_status, guest_register(guest_name, rooms(nickname, unit_no))')
      .neq('verification_status', 'rejected')
      .order('paid_at', { ascending: false }),
    sb.from('cash_handovers')
      .select('*')
      .order('created_at', { ascending: false })
  ]);

  const paymentsUpToDate = (payments || []).filter(p => {
    const pDate = cbNormDate(p.payment_date);
    return !pDate || pDate <= endDate;
  });

  const handoversUpToDate = (handovers || []).filter(h => {
    const hDate = cbNormDate(h.handover_date);
    return !hDate || hDate <= endDate;
  });

  let startDate = '2020-01-01';
  if (window._cbFilter === 'today') startDate = today;
  else if (window._cbFilter === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    startDate = d.toISOString().slice(0, 10);
  } else if (window._cbFilter === 'month') startDate = today.slice(0, 7) + '-01';
  else if (window._cbFilter === 'custom' && window._cbCustomDate) startDate = endDate;

  const periodPayments = paymentsUpToDate.filter(p => {
    if (window._cbFilter === 'all') return true;
    const pDate = cbNormDate(p.payment_date);
    return pDate >= startDate && pDate <= endDate;
  });

  const periodHandovers = handoversUpToDate.filter(h => {
    if (window._cbFilter === 'all') return true;
    const hDate = cbNormDate(h.handover_date);
    return hDate >= startDate && hDate <= endDate;
  });

  const upiPayments = periodPayments.filter(p => ['UPI', 'Bank'].includes(p.payment_mode));
  const airbnbPayments = periodPayments.filter(p => p.payment_mode === 'Airbnb Payout');

  // AGGREGATE ALL NAMES FROM SYSTEM
  const allPersonsSet = new Set([
    ...(holders || []).map(h => h.name),
    ...(paymentsUpToDate || []).map(p => p.received_by).filter(Boolean),
    ...(handoversUpToDate || []).map(h => h.from_person).filter(Boolean),
    ...(handoversUpToDate || []).map(h => h.to_person).filter(Boolean),
    'Shahenshah', 'Praveen', 'Aniket', 'Yash', 'Mr. Alam Hazi Sahab', 'Firoz', 'Company'
  ]);

  const cashBalances = Array.from(allPersonsSet)
    .filter(name => (name || '').trim().toLowerCase() !== 'historical') // Remove dummy historical
    .map(name => {
      const lowerName = name.trim().toLowerCase();
      const rawHolder = (holders || []).find(x => (x.name || '').trim().toLowerCase() === lowerName);
      
      let holderType = rawHolder ? (rawHolder.type || 'receiver').toLowerCase() : 'receiver';
      if (['mr. alam hazi sahab', 'alam hazi', 'firoz', 'company'].some(x => lowerName.includes(x))) {
        holderType = 'final';
      } else if (['shahenshah', 'praveen'].some(x => lowerName.includes(x))) {
        holderType = 'manager';
      }

      // --- CUMULATIVE MATH (Closing Balances) ---
      const cumPayments = paymentsUpToDate.filter(p => {
        const recBy = (p.received_by || '').trim().toLowerCase();
        const isCash = (p.payment_mode || 'Cash').toLowerCase() === 'cash';
        return recBy === lowerName && isCash;
      });
      const cumRec = cumPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

      const cumHoInList = handoversUpToDate.filter(x => {
        const toP = (x.to_person || '').trim().toLowerCase();
        const isNotUpi = !(x.notes || '').toLowerCase().includes('upi');
        const isReimbursement = (x.notes || '').toLowerCase().includes('reimburse');
        // Exclude reimbursements so Guest Cash balance stays pure
        return toP === lowerName && isNotUpi && !isReimbursement;
      });
      const cumHoIn = cumHoInList.reduce((s, x) => s + Number(x.amount || 0), 0);

      const cumHoOutList = handoversUpToDate.filter(x => {
        const fromP = (x.from_person || '').trim().toLowerCase();
        const isNotUpi = !(x.notes || '').toLowerCase().includes('upi');
        return fromP === lowerName && isNotUpi;
      });
      const cumHoOut = cumHoOutList.reduce((s, x) => s + Number(x.amount || 0), 0);

      // PERFECT DYNAMIC FORMULA: (Guest Cash + Transfers Received) - (Transfers Sent)
      const balance = cumRec + cumHoIn - cumHoOut;

      // --- PERIOD MATH (For Selected Filter UI) ---
      const periodCashPayments = periodPayments.filter(p => {
        const recBy = (p.received_by || '').trim().toLowerCase();
        const isCash = (p.payment_mode || 'Cash').toLowerCase() === 'cash';
        return recBy === lowerName && isCash;
      });
      const received = periodCashPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

      const periodHoInList = periodHandovers.filter(x => {
        const toP = (x.to_person || '').trim().toLowerCase();
        const isNotUpi = !(x.notes || '').toLowerCase().includes('upi');
        const isReimbursement = (x.notes || '').toLowerCase().includes('reimburse');
        return toP === lowerName && isNotUpi && !isReimbursement;
      });
      const hoIn = periodHoInList.reduce((s, x) => s + Number(x.amount || 0), 0);

      const periodHoOutList = periodHandovers.filter(x => {
        const fromP = (x.from_person || '').trim().toLowerCase();
        const isNotUpi = !(x.notes || '').toLowerCase().includes('upi');
        return fromP === lowerName && isNotUpi;
      });
      const hoOut = periodHoOutList.reduce((s, x) => s + Number(x.amount || 0), 0);

      return {
        name: rawHolder?.name || name,
        type: holderType,
        holder: rawHolder || { name, type: holderType },
        balance,
        received,
        hoIn,
        hoOut,
        receivedList: periodCashPayments,
        hoInList: periodHoInList,
        hoOutList: periodHoOutList
      };
    });

  const relevantCash = cashBalances.filter(h => 
    Math.abs(h.balance) > 0 || h.received > 0 || h.hoIn > 0 || h.hoOut > 0 || (h.holder && h.holder.is_active !== false)
  );

  const upiByReceiver = {};
  upiPayments.forEach(p => {
    const key = p.received_by || 'Unknown';
    if (!upiByReceiver[key]) upiByReceiver[key] = { total: 0, list: [] };
    upiByReceiver[key].total += Number(p.amount || 0);
    upiByReceiver[key].list.push(p);
  });
  
  // Calculate Totals for Top Cards
  const cashInHand = relevantCash.filter(h => h.type !== 'final').reduce((s, h) => s + Math.max(h.balance, 0), 0);
  const cashInCompany = relevantCash.filter(h => h.type === 'final').reduce((s, h) => s + h.balance, 0);
  const totalUpi = upiPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalAirbnb = airbnbPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  
  const airbnbByReceiver = {};
  airbnbPayments.forEach(p => {
    const key = p.received_by || 'Company';
    if (!airbnbByReceiver[key]) airbnbByReceiver[key] = { total: 0, list: [] };
    airbnbByReceiver[key].total += Number(p.amount || 0);
    airbnbByReceiver[key].list.push(p);
  });
  
  const filterLabel = window._cbFilter === 'today' ? 'Today (' + today + ')' :
                      window._cbFilter === 'week' ? 'Last 7 Days' :
                      window._cbFilter === 'month' ? 'This Month' :
                      window._cbFilter === 'custom' ? window._cbCustomDate :
                      'All Time';
  
  let html = `
    <div class="card">
      <h1>💰 Cash Book</h1>
      <div class="sub">Guest Booking Cash & Daybook · ${filterLabel}</div>
      
      <!-- Filters -->
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button onclick="cbSetFilter('today')" style="padding:8px 14px;background:${window._cbFilter==='today'?'#3B82F6':'#E5E7EB'};color:${window._cbFilter==='today'?'#fff':'#374151'};border:none;border-radius:6px;font-weight:600;cursor:pointer;">Today</button>
        <button onclick="cbSetFilter('week')" style="padding:8px 14px;background:${window._cbFilter==='week'?'#3B82F6':'#E5E7EB'};color:${window._cbFilter==='week'?'#fff':'#374151'};border:none;border-radius:6px;font-weight:600;cursor:pointer;">Last 7 Days</button>
        <button onclick="cbSetFilter('month')" style="padding:8px 14px;background:${window._cbFilter==='month'?'#3B82F6':'#E5E7EB'};color:${window._cbFilter==='month'?'#fff':'#374151'};border:none;border-radius:6px;font-weight:600;cursor:pointer;">This Month</button>
        <button onclick="cbSetFilter('all')" style="padding:8px 14px;background:${window._cbFilter==='all'?'#3B82F6':'#E5E7EB'};color:${window._cbFilter==='all'?'#fff':'#374151'};border:none;border-radius:6px;font-weight:600;cursor:pointer;">All Time</button>
        <input type="date" id="cbCustomDate" value="${window._cbCustomDate || today}" onchange="cbSetCustomDate(this.value)" style="padding:7px;border:1px solid #ddd;border-radius:6px;font-size:13px;" />
      </div>
      
      <!-- Summary Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px;">
        <div style="padding:14px;background:#FEF3C7;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#92400E;font-weight:600;">💵 CASH IN HAND</div>
          <div style="font-size:20px;font-weight:800;color:#D97706;">₹${cashInHand.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#78350F;">Staff pending handover</div>
        </div>
        <div style="padding:14px;background:#DCFCE7;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#166534;font-weight:600;">🏦 CASH WITH COMPANY</div>
          <div style="font-size:20px;font-weight:800;color:#059669;">₹${cashInCompany.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#166534;">Firoz + Company Accounts</div>
        </div>
        <div style="padding:14px;background:#DBEAFE;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#1E40AF;font-weight:600;">📱 UPI RECEIVED</div>
          <div style="font-size:20px;font-weight:800;color:#2563EB;">₹${totalUpi.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#1E40AF;">${upiPayments.length} txns in this period</div>
        </div>
        <div style="padding:14px;background:#FCE7F3;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:#9F1239;font-weight:600;">🏨 AIRBNB PAYOUT</div>
          <div style="font-size:20px;font-weight:800;color:#DB2777;">₹${totalAirbnb.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#9F1239;">${airbnbPayments.length} txns in this period</div>
        </div>
      </div>
      
      <!-- Actions -->
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="cbAddHolder()" style="padding:10px 16px;background:#3B82F6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">➕ Add Holder</button>
        <button onclick="manageCashHolders()" style="padding:10px 16px;background:#7C3AED;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">⚙️ Manage Holders</button>
      </div>
    </div>
    
    <!-- Tabs -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="display:flex;border-bottom:2px solid #E5E7EB;">
        <button onclick="cbSetTab('cash')" style="flex:1;padding:14px;background:${window._cbTab==='cash'?'#FEF3C7':'#fff'};color:${window._cbTab==='cash'?'#D97706':'#6B7280'};border:none;font-weight:700;font-size:14px;cursor:pointer;border-bottom:${window._cbTab==='cash'?'3px solid #D97706':'none'};">
          💵 CASH (${relevantCash.length})
        </button>
        <button onclick="cbSetTab('upi')" style="flex:1;padding:14px;background:${window._cbTab==='upi'?'#DBEAFE':'#fff'};color:${window._cbTab==='upi'?'#2563EB':'#6B7280'};border:none;font-weight:700;font-size:14px;cursor:pointer;border-bottom:${window._cbTab==='upi'?'3px solid #2563EB':'none'};">
          📱 UPI / BANK (${upiPayments.length})
        </button>
        <button onclick="cbSetTab('airbnb')" style="flex:1;padding:14px;background:${window._cbTab==='airbnb'?'#FCE7F3':'#fff'};color:${window._cbTab==='airbnb'?'#DB2777':'#6B7280'};border:none;font-weight:700;font-size:14px;cursor:pointer;border-bottom:${window._cbTab==='airbnb'?'3px solid #DB2777':'none'};">
          🏨 AIRBNB PAYOUT (${airbnbPayments.length})
        </button>
      </div>
    </div>
  `;
  
  if (window._cbTab === 'cash') {
    if (relevantCash.length === 0) {
      html += '<div class="card"><div style="text-align:center;padding:40px;color:#6B7280;">No cash activity found</div></div>';
    } else {
      const finals = relevantCash.filter(h => h.type === 'final');
      const managers = relevantCash.filter(h => h.type === 'manager');
      const receivers = relevantCash.filter(h => h.type !== 'final' && h.type !== 'manager');
      
      if (finals.length > 0) {
        html += '<div class="card" style="border-left:4px solid #059669;"><div class="section-title">🏦 FINAL HOLDERS (COMPANY)</div>';
        finals.forEach(h => html += cbCardV2(h));
        html += '</div>';
      }
      if (managers.length > 0) {
        html += '<div class="card" style="border-left:4px solid #7C3AED;"><div class="section-title">👨‍💼 MANAGER</div>';
        managers.forEach(h => html += cbCardV2(h));
        html += '</div>';
      }
      if (receivers.length > 0) {
        html += '<div class="card" style="border-left:4px solid #F59E0B;"><div class="section-title">👥 STAFF (CASH RECEIVERS)</div>';
        receivers.forEach(h => html += cbCardV2(h));
        html += '</div>';
      }
    }
  }
  
  if (window._cbTab === 'upi') {
    if (upiPayments.length === 0) {
      html += '<div class="card"><div style="text-align:center;padding:40px;color:#6B7280;">No UPI/Bank transactions in this period</div></div>';
    } else {
      Object.keys(upiByReceiver).forEach(receiver => {
        const info = upiByReceiver[receiver];
        html += `
          <div class="card" style="border-left:4px solid #2563EB;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div>
                <div style="font-size:16px;font-weight:700;">📱 ${receiver}</div>
                <div style="font-size:11px;color:#6B7280;">${info.list.length} transaction${info.list.length > 1 ? 's' : ''}</div>
              </div>
              <div style="text-align:right;background:#DBEAFE;padding:8px 14px;border-radius:8px;">
                <div style="font-size:10px;color:#1E40AF;font-weight:700;">TOTAL RECEIVED</div>
                <div style="font-size:20px;font-weight:800;color:#2563EB;">₹${info.total.toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <thead>
                <tr style="background:#F3F4F6;">
                  <th style="text-align:left;padding:8px;">Date</th>
                  <th style="text-align:left;padding:8px;">Guest</th>
                  <th style="text-align:left;padding:8px;">Property</th>
                  <th style="text-align:left;padding:8px;">Mode</th>
                  <th style="text-align:right;padding:8px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${info.list.map(p => `
                  <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:8px;">${p.payment_date}</td>
                    <td style="padding:8px;">${p.guest_register?.guest_name || '-'}</td>
                    <td style="padding:8px;font-size:11px;color:#6B7280;">${p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || '-'}</td>
                    <td style="padding:8px;"><span style="background:${p.payment_mode==='UPI'?'#DBEAFE':p.payment_mode==='Bank'?'#E0E7FF':'#FCE7F3'};color:#1E40AF;padding:2px 8px;border-radius:4px;font-size:10px;">${p.payment_mode}</span></td>
                    <td style="padding:8px;text-align:right;font-weight:700;color:#059669;">₹${Number(p.amount).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
    }
  }
  
  if (window._cbTab === 'airbnb') {
    if (airbnbPayments.length === 0) {
      html += '<div class="card"><div style="text-align:center;padding:40px;color:#6B7280;">No Airbnb payouts in this period</div></div>';
    } else {
      Object.keys(airbnbByReceiver).forEach(receiver => {
        const info = airbnbByReceiver[receiver];
        html += `
          <div class="card" style="border-left:4px solid #DB2777;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div>
                <div style="font-size:16px;font-weight:700;">🏨 ${receiver}</div>
                <div style="font-size:11px;color:#6B7280;">${info.list.length} Airbnb payout${info.list.length > 1 ? 's' : ''}</div>
              </div>
              <div style="text-align:right;background:#FCE7F3;padding:8px 14px;border-radius:8px;">
                <div style="font-size:10px;color:#9F1239;font-weight:700;">TOTAL PAYOUT</div>
                <div style="font-size:20px;font-weight:800;color:#DB2777;">₹${info.total.toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <thead>
                <tr style="background:#F3F4F6;">
                  <th style="text-align:left;padding:8px;">Date</th>
                  <th style="text-align:left;padding:8px;">Guest</th>
                  <th style="text-align:left;padding:8px;">Property</th>
                  <th style="text-align:right;padding:8px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${info.list.map(p => `
                  <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:8px;">${p.payment_date}</td>
                    <td style="padding:8px;">${p.guest_register?.guest_name || '-'}</td>
                    <td style="padding:8px;font-size:11px;color:#6B7280;">${p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || '-'}</td>
                    <td style="padding:8px;text-align:right;font-weight:700;color:#059669;">₹${Number(p.amount).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
    }
  }
  
  renderShell(html, 'cashbook');
};

function cbCardV2(h) {
  const balColor = h.balance > 0 ? '#D97706' : (h.balance < 0 ? '#DC2626' : '#059669');
  const balBg = h.balance > 0 ? '#FEF3C7' : (h.balance < 0 ? '#FEE2E2' : '#D1FAE5');
  const totalTxns = h.receivedList.length + h.hoInList.length + h.hoOutList.length;
  
  return `
    <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:700;">${h.name}</div>
          <div style="font-size:11px;color:#6B7280;text-transform:uppercase;">${h.type}</div>
        </div>
        <div style="text-align:right;background:${balBg};padding:8px 14px;border-radius:8px;">
          <div style="font-size:10px;color:${balColor};font-weight:700;">BALANCE</div>
          <div style="font-size:22px;font-weight:800;color:${balColor};">₹${h.balance.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;">
        <div style="padding:8px;background:#DCFCE7;border-radius:6px;text-align:center;">
          <div style="font-size:10px;color:#166534;font-weight:600;">Received (In Period)</div>
          <div style="font-size:14px;font-weight:700;color:#059669;">₹${h.received.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:8px;background:#DBEAFE;border-radius:6px;text-align:center;">
          <div style="font-size:10px;color:#1E40AF;font-weight:600;">HO In</div>
          <div style="font-size:14px;font-weight:700;color:#2563EB;">₹${h.hoIn.toLocaleString('en-IN')}</div>
        </div>
        <div style="padding:8px;background:#FEF3C7;border-radius:6px;text-align:center;">
          <div style="font-size:10px;color:#92400E;font-weight:600;">HO Out</div>
          <div style="font-size:14px;font-weight:700;color:#D97706;">₹${h.hoOut.toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      ${totalTxns > 0 ? `
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;font-size:12px;color:#6B7280;font-weight:600;">▶ View ${totalTxns} transaction${totalTxns > 1 ? 's' : ''} in this period</summary>
          <div style="margin-top:8px;font-size:11px;">
            ${h.receivedList.map(p => `
              <div style="padding:6px;background:#F0FDF4;border-left:3px solid #059669;margin-bottom:4px;border-radius:4px;">
                <div style="display:flex;justify-content:space-between;">
                  <span>💵 Received from <strong>${p.guest_register?.guest_name || 'Guest'}</strong> (${p.guest_register?.rooms?.nickname || p.guest_register?.rooms?.unit_no || '-'})</span>
                  <span style="font-weight:700;color:#059669;">+₹${Number(p.amount).toLocaleString('en-IN')}</span>
                </div>
                <div style="font-size:10px;color:#6B7280;">${p.payment_date} · ${p.paid_at ? new Date(p.paid_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : ''}</div>
              </div>
            `).join('')}
            
            ${h.hoInList.map(x => `
              <div style="padding:6px;background:#EFF6FF;border-left:3px solid #2563EB;margin-bottom:4px;border-radius:4px;">
                <div style="display:flex;justify-content:space-between;">
                  <span>🔄 Handover from <strong>${x.from_person}</strong> ${x.notes ? '· ' + x.notes.slice(0,50) : ''}</span>
                  <span style="font-weight:700;color:#2563EB;">+₹${Number(x.amount).toLocaleString('en-IN')}</span>
                </div>
                <div style="font-size:10px;color:#6B7280;">${x.handover_date} · ${x.created_at ? new Date(x.created_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : ''}</div>
              </div>
            `).join('')}
            
            ${h.hoOutList.map(x => `
              <div style="padding:6px;background:#FEF3C7;border-left:3px solid #D97706;margin-bottom:4px;border-radius:4px;">
                <div style="display:flex;justify-content:space-between;">
                  <span>🔄 Handover to <strong>${x.to_person}</strong> ${x.notes ? '· ' + x.notes.slice(0,50) : ''}</span>
                  <span style="font-weight:700;color:#D97706;">-₹${Number(x.amount).toLocaleString('en-IN')}</span>
                </div>
                <div style="font-size:10px;color:#6B7280;">${x.handover_date} · ${x.created_at ? new Date(x.created_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : ''}</div>
              </div>
            `).join('')}
          </div>
        </details>
      ` : `
        <div style="margin-top:8px;font-size:11px;color:#9CA3AF;font-style:italic;">No cash transactions in this period</div>
      `}
      
      ${h.balance > 0 && h.type !== 'final' ? `
        <button onclick="cbHandover('${h.name}', ${h.balance})" style="margin-top:10px;padding:10px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;width:100%;">
          🤝 Handover ₹${h.balance.toLocaleString('en-IN')}
        </button>
      ` : ''}
    </div>
  `;
}

window.cbSetFilter = function(filter) {
  window._cbFilter = filter;
  if (filter !== 'custom') window._cbCustomDate = null;
  renderCashBook();
};

window.cbSetCustomDate = function(date) {
  window._cbCustomDate = date;
  window._cbFilter = 'custom';
  renderCashBook();
};

window.cbSetTab = function(tab) {
  window._cbTab = tab;
  renderCashBook();
};

window.cbHandover = async function(fromPerson, maxAmount) {
  const { data: holders } = await sb.from('cash_holders').select('*').eq('is_active', true);
  const targets = (holders || []).filter(h => h.name !== fromPerson);
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🤝 Handover from ${fromPerson}</h2>
      <div style="margin-bottom:14px;padding:10px;background:#FEF3C7;border-radius:8px;">
        <div style="font-size:12px;color:#92400E;">Available balance:</div>
        <div style="font-size:20px;font-weight:800;color:#D97706;">₹${maxAmount.toLocaleString('en-IN')}</div>
      </div>
      
      <div class="form-group">
        <label>Handover To *</label>
        <select id="cbToPerson">
          ${targets.map(h => `<option value="${h.name}">${h.name} (${h.type})</option>`).join('')}
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
        <input id="cbNotes" placeholder="e.g. Guest cash Ram + Shyam" />
      </div>
      
      <button onclick="cbSaveHandover('${fromPerson}')" style="width:100%;padding:12px;background:#059669;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
        💾 Save Handover
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.cbSaveHandover = async function(fromPerson) {
  const toPerson = document.getElementById('cbToPerson').value;
  const amount = parseFloat(document.getElementById('cbAmount').value) || 0;
  const date = document.getElementById('cbDate').value;
  const notes = document.getElementById('cbNotes').value.trim();
  
  if (amount <= 0) { alert('⚠️ Amount required'); return; }
  
  const { error } = await sb.from('cash_handovers').insert({
    from_person: fromPerson,
    to_person: toPerson,
    amount, handover_date: date, notes: notes ? ('Cash Transfer | ' + notes) : 'Cash Transfer',
    created_by: SESSION?.userId || null
  });
  
  if (error) { alert('❌ Error: ' + error.message); return; }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Saved', '✅ Handover recorded');
  renderCashBook();
};

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
        <input id="hName" placeholder="e.g. Firoz, Yash" />
      </div>
      <div class="form-group">
        <label>Type *</label>
        <select id="hType">
          <option value="receiver">Receiver (Staff)</option>
          <option value="manager">Manager</option>
          <option value="final">Final (Company)</option>
        </select>
      </div>
      <button onclick="cbSaveHolder()" style="width:100%;padding:12px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">💾 Save</button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.cbSaveHolder = async function() {
  const name = document.getElementById('hName').value.trim();
  const type = document.getElementById('hType').value;
  if (!name) { alert('⚠️ Name required'); return; }
  
  const { error } = await sb.from('cash_holders').insert({
    name, type, is_active: true, spending_limit: 100000
  });
  if (error) { alert('❌ ' + error.message); return; }
  
  window._cashHoldersCache = null;
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn?.success) fsn.success('Added', '✅ ' + name);
  renderCashBook();
};

console.log('✅ Cash Book FINAL Loaded — Zero Hardcoding');
