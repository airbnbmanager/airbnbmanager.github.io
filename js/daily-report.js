/**
 * Daily Report Generator
 * UNIQUE HAVEN HOMES STAY
 */

async function renderDailyReport(selectedDate) {
  const today = new Date().toISOString().slice(0, 10);
  const repDate = selectedDate || today;
  
  renderShell(`<div class="loading">Generating report for ${repDate}...</div>`, 'daily-report');

  // Fetch all data for the date
  const [
    { data: allBks },
    { data: allPays },
    { data: rooms },
    { data: cfg }
  ] = await Promise.all([
    sb.from('guest_register').select('*, rooms(nickname, unit_no)'),
    sb.from('payment_history').select('*').eq('payment_date', repDate).neq('verification_status', 'rejected'),
    sb.from('rooms').select('room_id, nickname, unit_no'),
    sb.from('company_config').select('*').eq('id', 1).single()
  ]);

  // Today's activity
  const checkins = (allBks || []).filter(b => b.check_in === repDate && !b.is_cancelled);
  const checkouts = (allBks || []).filter(b => b.check_out === repDate && !b.is_cancelled);
  const newBookings = (allBks || []).filter(b => {
    if (!b.created_at) return false;
    return b.created_at.startsWith(repDate);
  });

  // Currently staying
  const staying = (allBks || []).filter(b => 
    b.check_in && b.check_in <= repDate && 
    (!b.check_out || b.check_out > repDate) &&
    !b.is_cancelled &&
    b.verification_status !== 'rejected'
  );

  // Payment breakdown
  const paidMap = {};
  (allPays || []).forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });

  const totalPayments = (allPays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const paymentByMode = {};
  (allPays || []).forEach(p => {
    const mode = p.payment_mode || 'Unknown';
    paymentByMode[mode] = (paymentByMode[mode] || 0) + (p.amount || 0);
  });

  // Booking totals for today's checkins
  const newBookingTotal = newBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const newBookingUnpaid = newBookings.reduce((s, b) => {
    const paid = paidMap[b.booking_id] || 0;
    return s + Math.max((b.total_amount || 0) - paid, 0);
  }, 0);

  // Online vs Offline
  const onlineBks = newBookings.filter(b => b.booking_mode === 'Online-Airbnb');
  const offlineBks = newBookings.filter(b => b.booking_mode !== 'Online-Airbnb');
  const reviewBks = newBookings.filter(b => b.is_review_booking === true);

  // All pending dues (till today)
  const allDues = (allBks || []).reduce((s, b) => {
    if (b.is_cancelled) return s;
    if (b.check_in > repDate) return s;
    const { data: bkPays } = { data: [] };
    return s;
  }, 0);

  // Get all payments (not just today) for dues calculation
  const { data: allPaysFull } = await sb.from('payment_history')
    .select('booking_id, amount')
    .neq('verification_status', 'rejected');
  
  const paidMapFull = {};
  (allPaysFull || []).forEach(p => {
    paidMapFull[p.booking_id] = (paidMapFull[p.booking_id] || 0) + (p.amount || 0);
  });

  const totalDueOverall = (allBks || []).reduce((s, b) => {
    if (b.is_cancelled) return s;
    if (b.check_in > repDate) return s;  // Future bookings
    const paid = paidMapFull[b.booking_id] || 0;
    const due = Math.max((b.total_amount || 0) - paid, 0);
    return s + (due > 1 ? due : 0);
  }, 0);

  // Property occupancy
  const totalRooms = (rooms || []).length;
  const occupancyPct = totalRooms > 0 ? Math.round(staying.length / totalRooms * 100) : 0;

  // Available dates for dropdown
  const dates = [];
  for (let i = 0; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const brand = cfg?.company_name || 'UNIQUE HAVEN HOMES STAY';
  const dateFormatted = new Date(repDate).toLocaleDateString('en-IN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  renderShell(`
    <div class="card no-print">
      <h1>📊 Daily Report</h1>
      <div class="form-grid" style="margin-top:12px;">
        <div class="form-group">
          <label>Select Date</label>
          <select onchange="renderDailyReport(this.value)">
            ${dates.map(d => `<option value="${d}" ${d === repDate ? 'selected' : ''}>${new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}${d === today ? ' (Today)' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          <button onclick="window.print()" class="btn-sm">🖨️ Print / PDF</button>
          <button onclick="whatsappDailyReport('${repDate}')" class="btn-sm" style="background:#25D366;color:#fff;margin-left:6px;">📱 WhatsApp</button>
        </div>
      </div>
    </div>

    <div class="card report-doc" style="max-width:900px;margin:0 auto;padding:30px;">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#FF5A5F 0%,#FC642D 100%);color:#fff;padding:24px;border-radius:12px;text-align:center;margin:-30px -30px 20px;">
        <div style="font-size:12px;letter-spacing:2px;opacity:0.9;">${brand.toUpperCase()}</div>
        <h1 style="margin:8px 0;font-size:24px;">📊 DAILY REPORT</h1>
        <div style="font-size:14px;opacity:0.95;">${dateFormatted}</div>
      </div>

      <!-- Summary Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
        <div style="background:#E6F7FF;padding:14px;border-radius:8px;border-left:4px solid #1E429F;">
          <div style="font-size:11px;color:#666;text-transform:uppercase;">New Bookings</div>
          <div style="font-size:26px;font-weight:800;color:#1E429F;">${newBookings.length}</div>
          <div style="font-size:11px;color:#666;">₹${newBookingTotal.toLocaleString('en-IN')} total value</div>
        </div>
        <div style="background:#E6FFED;padding:14px;border-radius:8px;border-left:4px solid #059669;">
          <div style="font-size:11px;color:#666;text-transform:uppercase;">Payments Received</div>
          <div style="font-size:26px;font-weight:800;color:#059669;">₹${totalPayments.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">${(allPays || []).length} transactions</div>
        </div>
        <div style="background:#FEF3C7;padding:14px;border-radius:8px;border-left:4px solid #B45309;">
          <div style="font-size:11px;color:#666;text-transform:uppercase;">Total Pending Due</div>
          <div style="font-size:26px;font-weight:800;color:#B45309;">₹${totalDueOverall.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:#666;">All active bookings</div>
        </div>
        <div style="background:#FCE7F3;padding:14px;border-radius:8px;border-left:4px solid #BE185D;">
          <div style="font-size:11px;color:#666;text-transform:uppercase;">Occupancy</div>
          <div style="font-size:26px;font-weight:800;color:#BE185D;">${staying.length}/${totalRooms}</div>
          <div style="font-size:11px;color:#666;">${occupancyPct}% occupied</div>
        </div>
      </div>

      <!-- Check-ins -->
      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#059669,#10B981);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          📥 Check-ins Today (${checkins.length})
        </div>
        <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${checkins.length === 0 ? '<div style="color:#999;text-align:center;padding:20px;">No check-ins today</div>' :
            `<table style="width:100%;font-size:13px;">
              <thead style="background:#F9FAFB;">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:left;">Time</th>
                  <th style="padding:8px;text-align:right;">Amount</th>
                  <th style="padding:8px;text-align:right;">Paid</th>
                  <th style="padding:8px;text-align:right;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${checkins.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  return `<tr style="border-top:1px solid #E5E7EB;">
                    <td style="padding:8px;"><strong>${b.guest_name}</strong>${b.is_review_booking ? ' <span style="background:#722ED1;color:#fff;padding:1px 6px;border-radius:8px;font-size:10px;">REVIEW</span>' : ''}</td>
                    <td style="padding:8px;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:8px;">${b.check_in_time || '2 PM'}</td>
                    <td style="padding:8px;text-align:right;">₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#059669;">₹${paid.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};">₹${due.toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Check-outs -->
      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#DC2626,#EF4444);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          📤 Check-outs Today (${checkouts.length})
        </div>
        <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${checkouts.length === 0 ? '<div style="color:#999;text-align:center;padding:20px;">No check-outs today</div>' :
            `<table style="width:100%;font-size:13px;">
              <thead style="background:#F9FAFB;">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:left;">Time</th>
                  <th style="padding:8px;text-align:right;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${checkouts.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  return `<tr style="border-top:1px solid #E5E7EB;">
                    <td style="padding:8px;"><strong>${b.guest_name}</strong></td>
                    <td style="padding:8px;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:8px;">${b.check_out_time || '11 AM'}</td>
                    <td style="padding:8px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};">₹${due.toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Payments Received -->
      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#059669,#10B981);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          💰 Payments Received (${(allPays || []).length}) — ₹${totalPayments.toLocaleString('en-IN')}
        </div>
        <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${(allPays || []).length === 0 ? '<div style="color:#999;text-align:center;padding:20px;">No payments today</div>' :
            `<div style="margin-bottom:12px;">
              ${Object.entries(paymentByMode).map(([mode, amt]) => 
                `<span style="display:inline-block;background:#F0FDF4;border:1px solid #059669;color:#065F46;padding:4px 10px;border-radius:20px;margin-right:6px;font-size:12px;font-weight:600;">${mode}: ₹${amt.toLocaleString('en-IN')}</span>`
              ).join('')}
            </div>
            <table style="width:100%;font-size:13px;">
              <thead style="background:#F9FAFB;">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:left;">Mode</th>
                  <th style="padding:8px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(allPays || []).map(p => {
                  const bk = (allBks || []).find(b => b.booking_id === p.booking_id);
                  return `<tr style="border-top:1px solid #E5E7EB;">
                    <td style="padding:8px;">${bk?.guest_name || 'Unknown'}</td>
                    <td style="padding:8px;">${bk?.rooms?.nickname || bk?.room_id || '-'}</td>
                    <td style="padding:8px;">${p.payment_mode || '-'}</td>
                    <td style="padding:8px;text-align:right;color:#059669;font-weight:700;">₹${(p.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Booking Mode Breakdown -->
      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#7C3AED,#8B5CF6);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          📊 New Bookings Breakdown
        </div>
        <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          <table style="width:100%;font-size:13px;">
            <tr style="background:#F9FAFB;">
              <td style="padding:8px;"><strong>🌐 Online (Airbnb)</strong></td>
              <td style="padding:8px;text-align:center;">${onlineBks.length} bookings</td>
              <td style="padding:8px;text-align:right;">₹${onlineBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding:8px;"><strong>🏠 Offline (Direct)</strong></td>
              <td style="padding:8px;text-align:center;">${offlineBks.length} bookings</td>
              <td style="padding:8px;text-align:right;">₹${offlineBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')}</td>
            </tr>
            ${reviewBks.length > 0 ? `<tr style="background:#F3E8FF;">
              <td style="padding:8px;"><strong>⭐ Review Bookings</strong></td>
              <td style="padding:8px;text-align:center;">${reviewBks.length} bookings</td>
              <td style="padding:8px;text-align:right;color:#7C3AED;">₹${reviewBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')} (own money)</td>
            </tr>` : ''}
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:linear-gradient(135deg,#1F2937,#374151);color:#fff;padding:16px;margin:20px -30px -30px;border-radius:0 0 12px 12px;text-align:center;">
        <div style="font-size:11px;opacity:0.7;letter-spacing:2px;margin-bottom:6px;">${brand.toUpperCase()}</div>
        <div style="font-size:12px;opacity:0.9;">Report generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>
    </div>

    <style>
      @media print {
        @page { size: A4; margin: 15mm; }
        .sidebar, .no-print { display: none !important; }
        .main-content { margin: 0 !important; padding: 0 !important; }
        .card { border: none !important; box-shadow: none !important; }
      }
    </style>
  `, 'daily-report');
}

async function whatsappDailyReport(date) {
  // Get same data
  const [
    { data: allBks },
    { data: allPays }
  ] = await Promise.all([
    sb.from('guest_register').select('*, rooms(nickname)'),
    sb.from('payment_history').select('*').eq('payment_date', date).neq('verification_status', 'rejected')
  ]);

  const { data: allPaysFull } = await sb.from('payment_history')
    .select('booking_id, amount').neq('verification_status', 'rejected');
  
  const paidMap = {};
  (allPaysFull || []).forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });

  const checkins = (allBks || []).filter(b => b.check_in === date && !b.is_cancelled);
  const checkouts = (allBks || []).filter(b => b.check_out === date && !b.is_cancelled);
  const totalPay = (allPays || []).reduce((s,p) => s + (p.amount||0), 0);
  const totalDue = (allBks || []).reduce((s, b) => {
    if (b.is_cancelled || b.check_in > date) return s;
    const paid = paidMap[b.booking_id] || 0;
    const due = Math.max((b.total_amount || 0) - paid, 0);
    return s + (due > 1 ? due : 0);
  }, 0);

  const NL = String.fromCharCode(10);
  const dateStr = new Date(date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
  
  let msg = '*📊 DAILY REPORT*' + NL + '*' + dateStr + '*' + NL + NL;
  msg += '━━━━━━━━━━━━━━━━━' + NL;
  msg += '*📥 Check-ins:* ' + checkins.length + NL;
  msg += '*📤 Check-outs:* ' + checkouts.length + NL;
  msg += '*💰 Payments:* Rs.' + totalPay.toLocaleString('en-IN') + NL;
  msg += '*⚠️ Total Due:* Rs.' + totalDue.toLocaleString('en-IN') + NL;
  msg += '━━━━━━━━━━━━━━━━━' + NL + NL;

  if (checkins.length > 0) {
    msg += '*📥 CHECK-INS:*' + NL;
    checkins.forEach((b, i) => {
      const paid = paidMap[b.booking_id] || 0;
      const due = Math.max((b.total_amount||0) - paid, 0);
      msg += (i+1) + '. ' + b.guest_name + NL;
      msg += '   ' + (b.rooms?.nickname || b.room_id) + NL;
      msg += '   Total: Rs.' + (b.total_amount||0).toLocaleString('en-IN');
      if (due > 0) msg += ' (Due: Rs.' + due.toLocaleString('en-IN') + ')';
      msg += NL + NL;
    });
  }

  if (checkouts.length > 0) {
    msg += '*📤 CHECK-OUTS:*' + NL;
    checkouts.forEach((b, i) => {
      msg += (i+1) + '. ' + b.guest_name + ' — ' + (b.rooms?.nickname || b.room_id) + NL;
    });
    msg += NL;
  }

  msg += '━━━━━━━━━━━━━━━━━' + NL;
  msg += '_UNIQUE HAVEN HOMES STAY_';

  // Show modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  const q = String.fromCharCode(39);
  modal.innerHTML = 
    '<div class="modal-box" style="max-width:600px;">' +
      '<button class="modal-close" onclick="this.closest(' + q + '.modal-overlay' + q + ').remove()">✕</button>' +
      '<h2>📱 Daily Report — WhatsApp</h2>' +
      '<textarea id="dailyMsg" style="width:100%;height:400px;font-family:monospace;font-size:12px;padding:10px;border:1px solid #ddd;border-radius:8px;">' + msg + '</textarea>' +
      '<div class="btn-row" style="margin-top:12px;">' +
        '<button style="background:#128C7E;color:#fff;" onclick="window.open(' + q + 'https://wa.me/?text=' + q + '+encodeURIComponent(document.getElementById(' + q + 'dailyMsg' + q + ').value),' + q + '_blank' + q + ')">📤 Share on WhatsApp</button>' +
        '<button class="outline" onclick="navigator.clipboard.writeText(document.getElementById(' + q + 'dailyMsg' + q + ').value);fsn.success(' + q + 'Copied' + q + ',' + q + 'Message copied' + q + ')">📋 Copy</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

window.renderDailyReport = renderDailyReport;
window.whatsappDailyReport = whatsappDailyReport;
