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
    <div class="card no-print" style="margin-bottom:20px;padding:16px 22px;border:1px solid var(--border);box-shadow:var(--shadow-sm);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:10px;background:#EEF2FF;color:#4F46E5;display:flex;align-items:center;justify-content:center;font-size:20px;">
            📊
          </div>
          <div>
            <h1 style="font-size:18px;font-weight:800;color:var(--text);margin:0;line-height:1.2;">Daily Operations Report</h1>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">Real-time check-ins, check-outs, collections & dues overview</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;font-weight:600;color:var(--muted);">Select Date:</label>
            <select onchange="renderDailyReport(this.value)" style="padding:7px 12px;font-size:13px;border-radius:8px;border:1px solid var(--border);background:#fff;min-width:180px;height:38px;font-weight:600;color:var(--text);">
              ${dates.map(d => `<option value="${d}" ${d === repDate ? 'selected' : ''}>${new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}${d === today ? ' (Today)' : ''}</option>`).join('')}
            </select>
          </div>
          <button onclick="printDailyReportWindow()" class="btn-sm" style="background:#0F172A;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;height:38px;box-shadow:0 1px 3px rgba(15,23,42,0.15);">
            🖨️ Print / PDF
          </button>
          <button onclick="whatsappDailyReport('${repDate}')" class="btn-sm" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;height:38px;box-shadow:0 1px 3px rgba(5,150,105,0.2);">
            📱 WhatsApp
          </button>
        </div>
      </div>
    </div>

    <div class="card report-doc" style="max-width:920px;margin:0 auto;padding:32px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-md);">
      
      <!-- Executive Letterhead Header -->
      <div style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);color:#fff;padding:26px 28px;border-radius:12px;text-align:center;margin:-32px -32px 24px -32px;border-bottom:3px solid #4F46E5;box-shadow:0 4px 15px rgba(15,23,42,0.08);">
        <div style="display:inline-block;padding:3px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;font-size:10.5px;letter-spacing:1.8px;font-weight:700;color:#94A3B8;margin-bottom:8px;text-transform:uppercase;">
          ${brand.toUpperCase()}
        </div>
        <h1 style="margin:2px 0 6px;font-size:23px;font-weight:800;letter-spacing:0.5px;color:#FFFFFF;">
          📊 DAILY OPERATIONS REPORT
        </h1>
        <div style="font-size:13px;color:#CBD5E1;font-weight:500;">
          🗓️ ${dateFormatted}
        </div>
      </div>

      <!-- Primary Operational Highlights -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px;margin-bottom:12px;">
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #4F46E5;padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">📥 Check-ins</div>
          <div style="font-size:24px;font-weight:800;color:#0F172A;margin-top:2px;">${checkins.length}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">₹${newBookingTotal.toLocaleString('en-IN')} value</div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #64748B;padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">📤 Check-outs</div>
          <div style="font-size:24px;font-weight:800;color:#0F172A;margin-top:2px;">${checkouts.length}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">Rooms freeing up</div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #059669;padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">💰 Collections</div>
          <div style="font-size:24px;font-weight:800;color:#059669;margin-top:2px;">₹${totalPayments.toLocaleString('en-IN')}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">${todayPaymentTransactions} transaction${todayPaymentTransactions===1?'':'s'}</div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #7C3AED;padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">📈 Occupancy</div>
          <div style="font-size:24px;font-weight:800;color:#0F172A;margin-top:2px;">${staying.length}/${totalRooms}</div>
          <div style="font-size:11.5px;color:#7C3AED;font-weight:600;margin-top:2px;">${occupancyPct}% occupied</div>
        </div>
      </div>

      <!-- Secondary Status Overview -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px;margin-bottom:22px;">
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid ${totalDueOverall > 0 ? '#DC2626' : '#059669'};padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">⚠️ Total Pending Dues</div>
          <div style="font-size:24px;font-weight:800;color:${totalDueOverall > 0 ? '#DC2626' : '#059669'};margin-top:2px;">₹${totalDueOverall.toLocaleString('en-IN')}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">Active guest accounts</div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #0284C7;padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">🏠 Currently Staying</div>
          <div style="font-size:24px;font-weight:800;color:#0F172A;margin-top:2px;">${staying.length} guests</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">In-house right now</div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #0D9488;padding:14px 16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:10.5px;color:#64748B;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">✨ Available Rooms</div>
          <div style="font-size:24px;font-weight:800;color:#0F172A;margin-top:2px;">${totalRooms - staying.length}</div>
          <div style="font-size:11.5px;color:#0D9488;font-weight:600;margin-top:2px;">Ready to book</div>
        </div>
      </div>

      ${checkoutsDue.length > 0 || totalDueOverall > 0 ? `
      <div style="margin-bottom:22px;background:#FFFDF7;border:1px solid #FDE68A;border-left:4px solid #D97706;border-radius:8px;padding:14px 18px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
        <div style="font-size:13px;font-weight:700;color:#92400E;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span>⚠️</span> Priority Actions Required (Pending Settlements)
        </div>
        <ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.8;color:#78350F;">
          ${checkoutsDue.map(b => {
            const due = Math.max((b.total_amount||0) - (paidMapFull[b.booking_id]||0), 0);
            return `<li><strong style="color:#DC2626;">Collect ₹${due.toLocaleString('en-IN')}</strong> from <strong>${b.guest_name}</strong> (${b.rooms?.nickname || b.room_id}) — checking out today ${b.guest_phone ? '📞 '+b.guest_phone : ''}</li>`;
          }).join('')}
          ${totalDueOverall > 0 ? `<li>Total pending balance across active guests: <strong style="color:#B45309;">₹${totalDueOverall.toLocaleString('en-IN')}</strong></li>` : ''}
        </ul>
      </div>` : ''}

      <!-- Section: Check-ins Today -->
      <div style="margin-bottom:22px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="background:#0F172A;color:#fff;padding:10px 16px;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>📥</span> Check-ins Today
          </div>
          <span style="background:rgba(255,255,255,0.16);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${checkins.length}</span>
        </div>
        <div>
          ${checkins.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:24px;font-size:13px;">No check-ins scheduled for this date</div>' :
            `<table style="width:100%;font-size:12.5px;border-collapse:collapse;">
              <thead style="background:#F8FAFC;color:#475569;border-bottom:1px solid #E2E8F0;">
                <tr>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Guest</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Property</th>
                  <th style="padding:9px 12px;text-align:center;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Nights</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Contact</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Time</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Paid</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${checkins.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  const nights = b.check_in && b.check_out ? Math.max(1, Math.ceil((new Date(b.check_out) - new Date(b.check_in))/86400000)) : '-';
                  return `<tr style="border-bottom:1px solid #F1F5F9;">
                    <td style="padding:10px 12px;"><strong>${b.guest_name}</strong>${b.is_review_booking ? ' <span style="background:#7C3AED;color:#fff;padding:2px 7px;border-radius:10px;font-size:9.5px;font-weight:700;">REVIEW</span>' : ''}</td>
                    <td style="padding:10px 12px;color:#334155;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:10px 12px;text-align:center;color:#64748B;">${nights}</td>
                    <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${b.guest_phone || '-'}</td>
                    <td style="padding:10px 12px;color:#64748B;">${b.check_in_time || '2 PM'}</td>
                    <td style="padding:10px 12px;text-align:right;font-weight:600;">₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:10px 12px;text-align:right;color:#059669;font-weight:600;">₹${paid.toLocaleString('en-IN')}</td>
                    <td style="padding:10px 12px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};font-weight:700;">₹${due.toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Section: Check-outs Today -->
      <div style="margin-bottom:22px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="background:#0F172A;color:#fff;padding:10px 16px;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>📤</span> Check-outs Today
          </div>
          <span style="background:rgba(255,255,255,0.16);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${checkouts.length}</span>
        </div>
        <div>
          ${checkouts.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:24px;font-size:13px;">No check-outs scheduled for this date</div>' :
            `<table style="width:100%;font-size:12.5px;border-collapse:collapse;">
              <thead style="background:#F8FAFC;color:#475569;border-bottom:1px solid #E2E8F0;">
                <tr>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Guest</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Property</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Contact</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Time</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Paid</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${checkouts.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  return `<tr style="border-bottom:1px solid #F1F5F9;${due > 0 ? 'background:#FEF2F2;' : ''}">
                    <td style="padding:10px 12px;"><strong>${b.guest_name}</strong></td>
                    <td style="padding:10px 12px;color:#334155;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${b.guest_phone || '-'}</td>
                    <td style="padding:10px 12px;color:#64748B;">${b.check_out_time || '11 AM'}</td>
                    <td style="padding:10px 12px;text-align:right;font-weight:600;">₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:10px 12px;text-align:right;color:#059669;font-weight:600;">₹${paid.toLocaleString('en-IN')}</td>
                    <td style="padding:10px 12px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};font-weight:700;">₹${due.toLocaleString('en-IN')}${due>0?' ⚠️':''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Section: Currently In-House -->
      <div style="margin-bottom:22px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="background:#0F172A;color:#fff;padding:10px 16px;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>🏠</span> Currently In-House
          </div>
          <span style="background:rgba(255,255,255,0.16);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${staying.length}</span>
        </div>
        <div>
          ${staying.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:24px;font-size:13px;">No guests currently in-house</div>' :
            `<table style="width:100%;font-size:12.5px;border-collapse:collapse;">
              <thead style="background:#F8FAFC;color:#475569;border-bottom:1px solid #E2E8F0;">
                <tr>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Guest</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Property</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Check-in</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Check-out</th>
                  <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Contact</th>
                  <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${staying.map(b => {
                  const paid = paidMapFull[b.booking_id] || 0;
                  const due = Math.max((b.total_amount || 0) - paid, 0);
                  return `<tr style="border-bottom:1px solid #F1F5F9;">
                    <td style="padding:10px 12px;"><strong>${b.guest_name}</strong></td>
                    <td style="padding:10px 12px;color:#334155;">${b.rooms?.nickname || b.room_id}</td>
                    <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${b.check_in || '-'}</td>
                    <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${b.check_out || '-'}</td>
                    <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${b.guest_phone || '-'}</td>
                    <td style="padding:10px 12px;text-align:right;color:${due > 0 ? '#DC2626' : '#059669'};font-weight:700;">₹${due.toLocaleString('en-IN')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Section: Payments Received -->
      <div style="margin-bottom:22px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="background:#0F172A;color:#fff;padding:10px 16px;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>💰</span> Payments Received Today
          </div>
          <span style="background:rgba(255,255,255,0.16);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">₹${totalPayments.toLocaleString('en-IN')} (${(allPays || []).length} txn)</span>
        </div>
        <div style="padding:14px;">
          ${(allPays || []).length === 0 ? '<div style="color:var(--muted);text-align:center;padding:16px;font-size:13px;">No payments recorded for this date</div>' :
            `<div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
                ${Object.entries(paymentByMode).map(([mode, amt]) => 
                  `<span style="display:inline-block;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:4px 10px;border-radius:16px;font-size:11.5px;font-weight:600;">${mode}: ₹${amt.toLocaleString('en-IN')}</span>`
                ).join('')}
              </div>
              <table style="width:100%;font-size:12.5px;border-collapse:collapse;">
                <thead style="background:#F8FAFC;color:#475569;border-bottom:1px solid #E2E8F0;">
                  <tr>
                    <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Guest</th>
                    <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Property</th>
                    <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Mode</th>
                    <th style="padding:9px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Ref / Notes</th>
                    <th style="padding:9px 12px;text-align:right;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(allPays || []).map(p => {
                    const bk = (allBks || []).find(b => b.booking_id === p.booking_id);
                    return `<tr style="border-bottom:1px solid #F1F5F9;">
                      <td style="padding:10px 12px;"><strong>${bk?.guest_name || 'Unknown'}</strong></td>
                      <td style="padding:10px 12px;color:#334155;">${bk?.rooms?.nickname || bk?.room_id || '-'}</td>
                      <td style="padding:10px 12px;"><span style="background:#F1F5F9;padding:2px 8px;border-radius:4px;font-size:11.5px;font-weight:600;color:#334155;">${p.payment_mode || '-'}</span></td>
                      <td style="padding:10px 12px;font-size:11.5px;color:#64748B;">${p.reference_no || p.notes || '-'}</td>
                      <td style="padding:10px 12px;text-align:right;color:#059669;font-weight:700;">₹${(p.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`
          }
        </div>
      </div>

      ${checkins.length > 0 ? `
      <!-- Section: Channel Source Breakdown -->
      <div style="margin-bottom:22px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="background:#0F172A;color:#fff;padding:10px 16px;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>📊</span> Check-in Channel Breakdown
          </div>
          <span style="background:rgba(255,255,255,0.16);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${checkins.length} Total</span>
        </div>
        <div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:10px 14px;"><strong>🌐 Online (Airbnb)</strong></td>
              <td style="padding:10px 14px;text-align:center;color:#64748B;">${onlineBks.length} bookings</td>
              <td style="padding:10px 14px;text-align:right;font-weight:700;color:#0F172A;">₹${onlineBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:10px 14px;"><strong>🏠 Offline (Direct / Phone)</strong></td>
              <td style="padding:10px 14px;text-align:center;color:#64748B;">${offlineBks.length} bookings</td>
              <td style="padding:10px 14px;text-align:right;font-weight:700;color:#0F172A;">₹${offlineBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')}</td>
            </tr>
            ${reviewBks.length > 0 ? `<tr style="background:#F5F3FF;">
              <td style="padding:10px 14px;"><strong style="color:#6D28D9;">⭐ Review Bookings</strong></td>
              <td style="padding:10px 14px;text-align:center;color:#6D28D9;">${reviewBks.length} bookings</td>
              <td style="padding:10px 14px;text-align:right;color:#6D28D9;font-weight:700;">₹${reviewBks.reduce((s,b) => s+(b.total_amount||0), 0).toLocaleString('en-IN')} (own money)</td>
            </tr>` : ''}
          </table>
        </div>
      </div>` : ''}

      <!-- Executive Footer -->
      <div style="background:#0F172A;color:#94A3B8;padding:22px 24px;margin:24px -32px -32px -32px;border-radius:0 0 12px 12px;text-align:center;border-top:1px solid #1E293B;">
        <div style="font-size:11px;letter-spacing:1.8px;color:#E2E8F0;font-weight:800;margin-bottom:4px;text-transform:uppercase;">${brand.toUpperCase()}</div>
        <div style="font-size:11.5px;color:#94A3B8;">CIN: U68101UP2026PTC244837 &bull; GSTIN: 09ABECT9843K1Z7 &bull; Lucknow, Uttar Pradesh</div>
        <div style="font-size:11px;color:#64748B;margin-top:4px;">Report Generated: ${new Date().toLocaleString('en-IN', {dateStyle:'medium', timeStyle:'short'})} &bull; 🌐 uniquehavenhomesstay.com</div>
        <div style="font-size:11px;font-weight:600;margin-top:6px;color:#94A3B8;">⚡ Hospitality Operations Management System</div>
      </div>
    </div>

    <style>
      @media print {
        @page { size: A4; margin: 0; }
        body { padding: 8mm 10mm !important; }
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
