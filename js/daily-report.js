/**
 * Daily Report Generator - UPGRADED
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

async function renderDailyReport(selectedDate) {
  const today = new Date().toISOString().slice(0, 10);
  const repDate = selectedDate || today;
  const endDate = repDate;
  
  renderShell(`<div class="loading">Generating report for ${repDate}...</div>`, 'daily-report');

  const [
    { data: allBks },
    { data: allPays },
    { data: rooms },
    { data: cfg }
  ] = await Promise.all([
    sb.from('guest_register').select('*, rooms(nickname, unit_no)'),
    sb.from('payment_history').select('*').gte('payment_date', repDate).lte('payment_date', endDate).neq('verification_status', 'rejected'),
    sb.from('rooms').select('room_id, nickname, unit_no'),
    sb.from('company_config').select('*').eq('id', 1).single()
  ]);

  const checkins = (allBks || []).filter(b => (b.check_in >= repDate && b.check_in <= endDate) && !b.is_cancelled);
  const checkouts = (allBks || []).filter(b => (b.check_out >= repDate && b.check_out <= endDate) && !b.is_cancelled);
  const newBookings = checkins;
  
  const staying = (allBks || []).filter(b => 
    b.check_in && b.check_in <= repDate && 
    (!b.check_out || b.check_out > repDate) &&
    !b.is_cancelled &&
    b.verification_status !== 'rejected'
  );

  const totalPayments = (allPays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const paymentByMode = {};
  (allPays || []).forEach(p => {
    const mode = p.payment_mode || 'Unknown';
    paymentByMode[mode] = (paymentByMode[mode] || 0) + (p.amount || 0);
  });

  const newBookingTotal = newBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const onlineBks = newBookings.filter(b => b.booking_mode === 'Online-Airbnb');
  const offlineBks = newBookings.filter(b => b.booking_mode !== 'Online-Airbnb');
  const reviewBks = newBookings.filter(b => b.is_review_booking === true);

  const { data: allPaysFull } = await sb.from('payment_history')
    .select('booking_id, amount').neq('verification_status', 'rejected');
  
  const paidMapFull = {};
  (allPaysFull || []).forEach(p => {
    paidMapFull[p.booking_id] = (paidMapFull[p.booking_id] || 0) + (p.amount || 0);
  });

  // PENDING DUES FIXED: Only calculate for currently active guests (Staying + Today Check-ins/outs)
  const activeBookingIds = new Set([
    ...(staying || []).map(b => b.booking_id),
    ...(checkouts || []).map(b => b.booking_id),
    ...(checkins || []).map(b => b.booking_id)
  ]);

  const totalDueOverall = (allBks || []).reduce((s, b) => {
    if (b.is_cancelled || b.verification_status === 'rejected') return s;
    if (!activeBookingIds.has(b.booking_id)) return s;
    const paid = paidMapFull[b.booking_id] || 0;
    const due = Math.max((b.total_amount || 0) - paid, 0);
    return s + (due > 1 ? due : 0);
  }, 0);

  const todayPaymentTransactions = (allPays || []).length;

  const totalRooms = (rooms || []).length;
  const occupancyPct = totalRooms > 0 ? Math.round(staying.length / totalRooms * 100) : 0;

  const dates = [];
  for (let i = 0; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const brand = cfg?.company_name || window.COMPANY_LEGAL_NAME || 'THE UNIQUE HAVEN HOMES PRIVATE LIMITED';
  const dateFormatted = new Date(repDate).toLocaleDateString('en-IN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const checkoutsDue = checkouts.filter(b => Math.max((b.total_amount||0) - (paidMapFull[b.booking_id]||0), 0) > 0);

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
          <button onclick="printDailyReportWindow()" class="btn-sm">🖨️ Print / PDF</button>
          <button onclick="whatsappDailyReport('${repDate}')" class="btn-sm" style="background:#25D366;color:#fff;margin-left:6px;">📱 WhatsApp</button>
        </div>
      </div>
    </div>

    <div class="card report-doc" style="max-width:900px;margin:0 auto;padding:30px;">
      
      <div style="background:linear-gradient(135deg,#FF5A5F 0%,#FC642D 100%);color:#fff;padding:24px;border-radius:12px;text-align:center;margin:-30px -30px 20px;">
        <div style="font-size:12px;letter-spacing:2px;opacity:0.9;">${brand.toUpperCase()}</div>
        <h1 style="margin:8px 0;font-size:24px;">📊 DAILY REPORT</h1>
        <div style="font-size:14px;opacity:0.95;">${dateFormatted}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;margin-bottom:12px;">
        <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-left:4px solid #3B82F6;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Check-ins</div>
          <div style="font-size:26px;font-weight:800;color:#3B82F6;">${checkins.length}</div>
          <div style="font-size:11px;color:var(--muted);">₹${newBookingTotal.toLocaleString('en-IN')} value</div>
        </div>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-left:4px solid #EF4444;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Check-outs</div>
          <div style="font-size:26px;font-weight:800;color:#EF4444;">${checkouts.length}</div>
          <div style="font-size:11px;color:var(--muted);">Rooms freeing up</div>
        </div>
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-left:4px solid #10B981;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Collections</div>
          <div style="font-size:26px;font-weight:800;color:#10B981;">₹${totalPayments.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:var(--muted);">${todayPaymentTransactions} txn${todayPaymentTransactions===1?'':'s'}</div>
        </div>
        <div style="background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.25);border-left:4px solid #EC4899;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Occupancy</div>
          <div style="font-size:26px;font-weight:800;color:#EC4899;">${staying.length}/${totalRooms}</div>
          <div style="font-size:11px;color:var(--muted);">${occupancyPct}% occupied</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:20px;">
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-left:4px solid #F59E0B;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Total Pending Dues</div>
          <div style="font-size:22px;font-weight:800;color:#F59E0B;">₹${totalDueOverall.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;color:var(--muted);">All active bookings</div>
        </div>
        <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-left:4px solid #8B5CF6;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Currently Staying</div>
          <div style="font-size:22px;font-weight:800;color:#8B5CF6;">${staying.length} guests</div>
          <div style="font-size:11px;color:var(--muted);">In-house right now</div>
        </div>
        <div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-left:4px solid #0EA5E9;padding:14px;border-radius:8px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:600;">Available Rooms</div>
          <div style="font-size:22px;font-weight:800;color:#0EA5E9;">${totalRooms - staying.length}</div>
          <div style="font-size:11px;color:var(--muted);">Ready to book</div>
        </div>
      </div>

      ${checkoutsDue.length > 0 || totalDueOverall > 0 ? `
      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#DC2626,#F59E0B);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          ⚠️ Action Required
        </div>
        <div style="border:1px solid rgba(239,68,68,0.3);border-top:none;border-radius:0 0 6px 6px;padding:12px;background:rgba(239,68,68,0.06);">
          <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:var(--text);">
            ${checkoutsDue.map(b => {
              const due = Math.max((b.total_amount||0) - (paidMapFull[b.booking_id]||0), 0);
              return `<li><strong style="color:#DC2626;">Collect ₹${due.toLocaleString('en-IN')}</strong> from <strong>${b.guest_name}</strong> (${b.rooms?.nickname || b.room_id}) — checking out today ${b.guest_phone ? '📞 '+b.guest_phone : ''}</li>`;
            }).join('')}
            ${totalDueOverall > 0 ? `<li>Total pending dues to follow up: <strong style="color:#F59E0B;">₹${totalDueOverall.toLocaleString('en-IN')}</strong></li>` : ''}
          </ul>
        </div>
      </div>` : ''}

      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#059669,#10B981);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          📥 Check-ins Today (${checkins.length})
        </div>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${checkins.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:20px;">No check-ins today</div>' :
            `<table style="width:100%;font-size:12px;">
              <thead style="background:var(--bg-tertiary);color:var(--text);">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:center;">Nights</th>
                  <th style="padding:8px;text-align:left;">Contact</th>
                  <th style="padding:8px;text-align:left;">Time</th>
                  <th style="padding:8px;text-align:right;">Total</th>
                  <th style="padding:8px;text-align:right;">Paid</th>
                  <th style="padding:8px;text-align:right;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${checkins.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  const nights = b.check_in && b.check_out ? Math.max(1, Math.ceil((new Date(b.check_out) - new Date(b.check_in))/86400000)) : '-';
                  return `<tr style="border-top:1px solid var(--border);">
                    <td style="padding:8px;"><strong>${b.guest_name}</strong>${b.is_review_booking ? ' <span style="background:#722ED1;color:#fff;padding:1px 6px;border-radius:8px;font-size:10px;">REVIEW</span>' : ''}</td>
                    <td style="padding:8px;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:8px;text-align:center;">${nights}</td>
                    <td style="padding:8px;font-size:11px;">${b.guest_phone || '-'}</td>
                    <td style="padding:8px;">${b.check_in_time || '2 PM'}</td>
                    <td style="padding:8px;text-align:right;">₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#059669;">₹${paid.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};font-weight:700;">₹${due.toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#DC2626,#EF4444);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          📤 Check-outs Today (${checkouts.length})
        </div>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${checkouts.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:20px;">No check-outs today</div>' :
            `<table style="width:100%;font-size:12px;">
              <thead style="background:var(--bg-tertiary);color:var(--text);">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:left;">Contact</th>
                  <th style="padding:8px;text-align:left;">Time</th>
                  <th style="padding:8px;text-align:right;">Total</th>
                  <th style="padding:8px;text-align:right;">Paid</th>
                  <th style="padding:8px;text-align:right;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${checkouts.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  return `<tr style="border-top:1px solid var(--border);${due > 0 ? 'background:rgba(239,68,68,0.06);' : ''}">
                    <td style="padding:8px;"><strong>${b.guest_name}</strong></td>
                    <td style="padding:8px;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:8px;font-size:11px;">${b.guest_phone || '-'}</td>
                    <td style="padding:8px;">${b.check_out_time || '11 AM'}</td>
                    <td style="padding:8px;text-align:right;">₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#059669;">₹${paid.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};font-weight:700;">₹${due.toLocaleString('en-IN')}${due>0?' ⚠️':''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#7C3AED,#8B5CF6);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          🏠 Currently In-House (${staying.length})
        </div>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${staying.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:20px;">No guests in-house</div>' :
            `<table style="width:100%;font-size:12px;">
              <thead style="background:var(--bg-tertiary);color:var(--text);">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:left;">Check-in</th>
                  <th style="padding:8px;text-align:left;">Check-out</th>
                  <th style="padding:8px;text-align:left;">Contact</th>
                  <th style="padding:8px;text-align:right;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${staying.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  return `<tr style="border-top:1px solid var(--border);">
                    <td style="padding:8px;"><strong>${b.guest_name}</strong></td>
                    <td style="padding:8px;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:8px;font-size:11px;">${b.check_in || '-'}</td>
                    <td style="padding:8px;font-size:11px;">${b.check_out || '-'}</td>
                    <td style="padding:8px;font-size:11px;">${b.guest_phone || '-'}</td>
                    <td style="padding:8px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};font-weight:700;">₹${due.toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#059669,#10B981);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          💰 Payments Received (${(allPays || []).length}) — Total ₹${totalPayments.toLocaleString('en-IN')}
        </div>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          ${(allPays || []).length === 0 ? '<div style="color:var(--muted);text-align:center;padding:20px;">No payments today</div>' :
            `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
              ${Object.entries(paymentByMode).map(([mode, amt]) => 
                `<span style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#10B981;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${mode}: ₹${amt.toLocaleString('en-IN')}</span>`
              ).join('')}
            </div>
            <table style="width:100%;font-size:12px;">
              <thead style="background:var(--bg-tertiary);color:var(--text);">
                <tr>
                  <th style="padding:8px;text-align:left;">Guest</th>
                  <th style="padding:8px;text-align:left;">Property</th>
                  <th style="padding:8px;text-align:left;">Mode</th>
                  <th style="padding:8px;text-align:left;">Ref/Notes</th>
                  <th style="padding:8px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(allPays || []).map(p => {
                  const bk = (allBks || []).find(b => b.booking_id === p.booking_id);
                  return `<tr style="border-top:1px solid var(--border);">
                    <td style="padding:8px;">${bk?.guest_name || 'Unknown'}</td>
                    <td style="padding:8px;">${bk?.rooms?.nickname || bk?.room_id || '-'}</td>
                    <td style="padding:8px;">${p.payment_mode || '-'}</td>
                    <td style="padding:8px;font-size:11px;color:var(--muted);">${p.reference_no || p.notes || '-'}</td>
                    <td style="padding:8px;text-align:right;color:#059669;font-weight:700;">₹${(p.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      ${checkins.length > 0 ? `<div style="margin-bottom:20px;">
        <div style="background:linear-gradient(90deg,#7C3AED,#8B5CF6);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:700;">
          📊 Today's Check-ins — Source Breakdown
        </div>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;padding:12px;">
          <table style="width:100%;font-size:13px;">
            <tr style="background:var(--bg-tertiary);">
              <td style="padding:8px;"><strong>🌐 Online (Airbnb)</strong></td>
              <td style="padding:8px;text-align:center;">${onlineBks.length} bookings</td>
              <td style="padding:8px;text-align:right;">₹${onlineBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding:8px;"><strong>🏠 Offline (Direct)</strong></td>
              <td style="padding:8px;text-align:center;">${offlineBks.length} bookings</td>
              <td style="padding:8px;text-align:right;">₹${offlineBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')}</td>
            </tr>
            ${reviewBks.length > 0 ? `<tr style="background:rgba(124,58,237,0.1);">
              <td style="padding:8px;"><strong>⭐ Review Bookings</strong></td>
              <td style="padding:8px;text-align:center;">${reviewBks.length} bookings</td>
              <td style="padding:8px;text-align:right;color:#8B5CF6;font-weight:700;">₹${reviewBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')} (own money)</td>
            </tr>` : ''}
          </table>
        </div>
      </div>` : ''}

      <div style="background:linear-gradient(135deg,#1F2937,#374151);color:#fff;padding:16px;margin:20px -30px -30px;border-radius:0 0 12px 12px;text-align:center;">
        <div style="font-size:11px;opacity:0.7;letter-spacing:2px;margin-bottom:6px;">${brand.toUpperCase()}</div>
        <div style="font-size:12px;opacity:0.9;">Report generated: ${new Date().toLocaleString('en-IN')} &bull; 🌐 uniquehavenhomesstay.com</div>
        <div style="font-size:11.5px;font-weight:700;margin-top:4px;color:#F8FAFC;">⚡ Developed by Praveen Singh</div>
      </div>
    </div>

    <style>
      @media print {
        @page { size: A4; margin: 0; }
        body { padding: 10mm 12mm !important; }
      }
    </style>
  `, 'daily-report');
}

function printDailyReportWindow() {
  const reportEl = document.querySelector('.report-doc');
  if (!reportEl) { alert('Report not loaded'); return; }
  const html = reportEl.outerHTML;
  const w = window.open('', '_blank', 'width=1000,height=800');
  if (!w) { alert('Popup blocked! Please allow popups.'); return; }
  w.document.title = 'Daily Operations Report - The Unique Haven Homes';
  w.document.write(
    '<!DOCTYPE html><html><head><title>Daily Operations Report - The Unique Haven Homes</title>' +
    '<meta charset="utf-8">' +
    '<style>' +
    '@page { size: A4; margin: 0; }' +
    '* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }' +
    'html, body { margin: 0; padding: 10mm 12mm; background: #fff; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 13px; }' +
    '.report-doc { max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; background: #fff !important; display: block !important; visibility: visible !important; }' +
    '.report-doc * { visibility: visible !important; }' +
    'table { width: 100%; border-collapse: collapse; }' +
    'th, td { padding: 6px 8px; }' +
    'h1, h2, h3 { margin: 6px 0; }' +
    '</style></head><body>' +
    html +
    '<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };<\/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}
window.printDailyReportWindow = printDailyReportWindow;

async function whatsappDailyReport(date) {
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
  msg += '_THE UNIQUE HAVEN HOMES PRIVATE LIMITED_' + NL;
  msg += '🌐 uniquehavenhomesstay.com' + NL;
  msg += '⚡ Developed by Praveen Singh';

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
