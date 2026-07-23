/**
 * Calendar Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderReports() {
  renderShell(`<div class="loading">Loading...</div>`, 'reports');

  const [rooms, bookings] = await Promise.all([
    sb.from('rooms').select('room_id, unit_no, nickname').order('unit_no'),
    sb.from('guest_register').select('booking_id, room_id, check_in, check_out, guest_name, booking_mode, total_amount')
  ]);

  const yr = window._calY ?? new Date().getFullYear();
  const mo = window._calM ?? new Date().getMonth();
  const mName = new Date(yr, mo, 1).toLocaleString('default', { month: 'long' });
  const dim = new Date(yr, mo + 1, 0).getDate();
  const fd = new Date(yr, mo, 1).getDay();
  const mp = `${yr}-${String(mo + 1).padStart(2, '0')}`;

  // Build booking map
  const bMap = {};
  (bookings.data || []).forEach(b => {
    if (!b.check_in || !b.check_out || !b.room_id) return;
    let c = b.check_in;
    while (c < b.check_out) {
      bMap[`${b.room_id}_${c}`] = { guest: b.guest_name, mode: b.booking_mode, bookingId: b.booking_id };
      c = dateAdd(c, 1);
    }
  });

  // Monthly KPIs
  const mb = (bookings.data || []).filter(b => b.check_in?.startsWith(mp));
  const pm = await getPaidMap(mb.map(b => b.booking_id));
  const rev = mb.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const onCount = mb.filter(b => b.booking_mode === 'Online-Airbnb').length;
  const offCount = mb.length - onCount;
  const totalRoomNights = (rooms.data?.length || 0) * dim;
  const bookedNights = Object.keys(bMap).filter(k => k.includes(`_${mp}`)).length;
  const occ = totalRoomNights > 0 ? Math.round(bookedNights / totalRoomNights * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const day7 = dateAdd(today, 7);

  const upcoming7 = (bookings.data || [])
    .filter(b => b.check_in > today && b.check_in <= day7)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

  const allUpcoming = (bookings.data || [])
    .filter(b => b.check_in > today)
    .sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

  const openStays = (bookings.data || []).filter(b =>
    b.checkout_confirmed === false &&
    b.check_in <= today &&
    (b.check_out >= today || !b.check_out)
  );

  const bName = b => {
    const room = (rooms.data || []).find(r => r.room_id === b.room_id);
    return room?.nickname || room?.unit_no || b.room_id || '-';
  };

  let html = `
    <div class="card">
      <h1>📆 Calendar — ${mName} ${yr}</h1>
      <div class="sub">Occupancy overview</div>
    </div>

    <div class="card">
      <div class="metric-row"><span class="metric-label">Bookings</span><span class="metric-value">${mb.length}</span></div>
      <div class="metric-row"><span class="metric-label">Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Online / Offline</span><span class="metric-value">${onCount} / ${offCount}</span></div>
      <div class="metric-row"><span class="metric-label">Occupancy</span><span class="metric-value">${occ}%</span></div>
    </div>

    <div class="stat-grid">
      <div class="stat-card" style="border-left:4px solid var(--blue);">
        <div class="stat-num">${upcoming7.length}</div>
        <div class="stat-label">📅 Next 7 Days</div>
        ${upcoming7.slice(0, 6).map(x => `
          <div style="font-size:11px;margin-top:3px;padding:2px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">${x.check_in || '-'} · ${x.check_in_time || '2 PM'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--primary);">
        <div class="stat-num">${openStays.length}</div>
        <div class="stat-label">🔄 Open Stays</div>
        ${openStays.slice(0, 6).map(x => `
          <div style="font-size:11px;margin-top:3px;padding:2px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">Since ${x.check_in || '-'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>

      <div class="stat-card" style="border-left:4px solid var(--yellow);">
        <div class="stat-num">${allUpcoming.length}</div>
        <div class="stat-label">📆 All Upcoming</div>
        ${allUpcoming.slice(0, 6).map(x => `
          <div style="font-size:11px;margin-top:3px;padding:2px 0;border-bottom:1px solid var(--border);">
            <strong>${x.guest_name || '-'}</strong> — ${bName(x)}<br>
            <small style="color:var(--muted);">${x.check_in || '-'}</small>
          </div>
        `).join('') || '<div class="sub" style="margin:4px 0 0;">None</div>'}
      </div>
    </div>

    <div class="card" style="text-align:center;background:var(--dark);color:#fff;">
      <h2 style="color:#fff;">📆 ${mName} ${yr}</h2>
      <div class="btn-row" style="justify-content:center;">
        <button class="secondary btn-sm" onclick="chMo(-1)">◀ Prev</button>
        <button class="secondary btn-sm" onclick="chMo(1)">Next ▶</button>
      </div>
    </div>`;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayStr = new Date().toISOString().slice(0, 10);

  (rooms.data || []).forEach(r => {
    html += `
      <div class="card" style="padding:10px 12px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;">
          ${r.unit_no}
          <span style="font-weight:400;color:var(--muted);font-size:12px;">${r.nickname || ''}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">`;

    // Day headers
    days.forEach(d => {
      html += `<div style="font-size:10px;font-weight:600;color:var(--muted);text-align:center;">${d}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < fd; i++) html += `<div style="height:42px;"></div>`;

    // Date cells
    for (let d = 1; d <= dim; d++) {
      const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const k = `${r.room_id}_${ds}`;
      const bk = bMap[k];
      const isT = ds === todayStr;

      let bg = '#E8F5E9'; // free
      let gn = '';
      if (bk) {
        bg = bk.mode === 'Online-Airbnb' ? '#E1EFFE' : '#FDF6B2';
        gn = bk.guest?.split(' ')[0] || 'B';
      }

      const cls = `cal-cell${bk ? ' booked' : ''}${isT ? ' today' : ''}`;
      const click = bk ? `onclick="showBookingPopup('${r.room_id}','${ds}')"` : '';
      const title = bk ? `title="${bk.guest || 'Booked'}"` : isT ? `title="Today"` : '';

      html += `
        <div class="${cls}" style="background:${bg};" ${click} ${title}>
          <div class="cal-date"${isT ? ' style="color:var(--primary);"' : ''}>${d}${isT ? ' ●' : ''}</div>
          ${bk ? `<div class="cal-guest">${gn}</div>` : ''}
        </div>`;
    }

    html += `</div></div>`;
  });

  // Legend
  html += `
    <div class="card" style="text-align:center;padding:10px;">
      <span style="background:#E8F5E9;padding:3px 10px;border-radius:10px;font-size:12px;">Free</span>
      <span style="background:#E1EFFE;padding:3px 10px;border-radius:10px;font-size:12px;margin-left:6px;">Online</span>
      <span style="background:#FDF6B2;padding:3px 10px;border-radius:10px;font-size:12px;margin-left:6px;">Offline</span>
    </div>`;

  renderShell(html, 'reports');
  window._calM = mo;
  window._calY = yr;
}

function chMo(d) {
  let m = (window._calM ?? new Date().getMonth()) + d;
  let y = window._calY ?? new Date().getFullYear();
  if (m > 11) { m = 0; y++; }
  if (m < 0) { m = 11; y--; }
  window._calM = m;
  window._calY = y;
  renderReports();
}

// ============ BOOKING POPUP (Calendar Click) ============
async function showBookingPopup(roomId, dateStr) {
  const { data: bks } = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name)')
    .eq('room_id', roomId)
    .lte('check_in', dateStr)
    .gt('check_out', dateStr);

  const b = (bks || [])[0];
  if (!b) return;

  const { data: pays } = await sb.from('payment_history').select('amount').eq('booking_id', b.booking_id);
  const paid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const bal = (b.total_amount || 0) - paid;
  const nights = b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : '-';
  const idPaths = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📅 Booking Details</h2>

      <div class="metric-row">
        <span class="metric-label">Guest</span>
        <span class="metric-value" style="font-size:15px;">${b.guest_name || '-'}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Phone</span>
        <span>${b.phone || '-'}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Property</span>
        <span>${b.rooms?.nickname || ''} · ${b.rooms?.unit_no || ''}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Mode</span>
        <span class="badge ${b.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">
          ${b.booking_mode === 'Online-Airbnb' ? 'Online' : 'Offline'}
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Check-in</span>
        <span>${b.check_in || '-'} ${b.check_in_time || ''}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Check-out</span>
        <span>${b.check_out || '-'} ${b.check_out_time || ''}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Nights</span>
        <span class="metric-value">${nights}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Rate/Day</span>
        <span>${b.per_day_rate ? '₹' + b.per_day_rate : '-'}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total</span>
        <span class="metric-value">₹${(b.total_amount || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Paid</span>
        <span class="metric-value" style="color:var(--green);">₹${paid.toLocaleString('en-IN')}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Balance</span>
        <span class="metric-value${bal > 0 ? ' warn' : ''}">₹${bal.toLocaleString('en-IN')}</span>
      </div>

      ${b.has_vehicle ? `
        <div class="metric-row">
          <span class="metric-label">Vehicle</span>
          <span>${b.vehicle_name || '-'} · ${b.vehicle_number || '-'}</span>
        </div>` : ''}

      ${idPaths.length ? `
        <div style="margin-top:10px;">
          <div class="section-title">ID Photos</div>
          <div class="btn-row">
            ${idPaths.map((p, i) => `
              <button class="btn-sm outline" onclick="dlIdPhoto('${p}')">📥 Guest ${i + 1}</button>
            `).join('')}
          </div>
        </div>` : ''}

      ${b.notes ? `
        <div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px;">
          <strong>Notes:</strong> ${b.notes}
        </div>` : ''}

      <div class="btn-row" style="margin-top:14px;">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove(); editBooking('${b.booking_id}');">✏️ Edit</button>
        <button class="btn-sm secondary" onclick="this.closest('.modal-overlay').remove(); showPaymentModal('${b.booking_id}');">💰 Pay</button>
        <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove(); shareBookingWhatsApp('${b.booking_id}');">📱 Share</button>
        <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove();">Close</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

// ============ FINANCIAL SUMMARY ============
async function renderFYSummary(range = 'FY') {
  const isCA = SESSION.role === 'ca';
  if (!isCA) renderShell(`<div class="loading">Loading...</div>`, 'dashboard');

  const now = new Date(), today = now.toISOString().slice(0, 10);
  let s, e, label;

  if (range === 'Today') { s = today; e = today; label = 'Today'; }
  else if (range === 'Week') { let d = new Date(now); d.setDate(now.getDate() - 7); s = d.toISOString().slice(0, 10); e = today; label = 'Last 7 Days'; }
  else if (range === 'Month') { s = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01'; e = today; label = 'This Month'; }
  else if (range === 'Quarter') { let q = Math.floor(now.getMonth() / 3) * 3; s = now.getFullYear() + '-' + String(q + 1).padStart(2, '0') + '-01'; e = today; label = 'This Quarter'; }
  else if (range === 'YTD') { s = now.getFullYear() + '-04-01'; e = today; label = 'YTD'; }
  else { let fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; s = fy + '-04-01'; e = (fy + 1) + '-03-31'; label = `FY ${fy}-${fy + 1}`; }

  const [gs, ex, py] = await Promise.all([
    sb.from('guest_register').select('booking_id,check_in,total_amount,room_id,guest_name,booking_mode'),
    sb.from('expenses').select('amount,month'),
    sb.from('payment_history').select('booking_id,amount'),
  ]);

  const fg = (gs.data || []).filter(g => g.check_in >= s && g.check_in <= e);
  const ids = fg.map(g => g.booking_id);
  const pm = {};
  (py.data || []).forEach(p => { if (ids.includes(p.booking_id)) pm[p.booking_id] = (pm[p.booking_id] || 0) + (p.amount || 0); });
  const inc = fg.reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const exp = (ex.data || []).reduce((a, x) => a + (x.amount || 0), 0);
  const net = inc - exp;

  const onlineInc = fg.filter(g => g.booking_mode === 'Online-Airbnb').reduce((a, g) => a + (pm[g.booking_id] || 0), 0);
  const offlineInc = inc - onlineInc;

  const btns = ['Today', 'Week', 'Month', 'Quarter', 'YTD', 'FY'].map(r =>
    `<button class="${r === range ? '' : 'secondary'} btn-sm" onclick="renderFYSummary('${r}')">${r}</button>`
  ).join('');

  const tbl = `<div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Guest</th><th>Room</th><th>Mode</th><th>Check-in</th><th>Received</th></tr></thead>
    <tbody>${fg.map(g => `<tr>
      <td style="font-size:11px;">${g.booking_id}</td>
      <td>${g.guest_name}</td>
      <td>${g.room_id}</td>
      <td><span class="badge ${g.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${g.booking_mode === 'Online-Airbnb' ? 'On' : 'Off'}</span></td>
      <td>${g.check_in}</td>
      <td>₹${(pm[g.booking_id] || 0).toLocaleString('en-IN')}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;

  window._fyData = { label, startDate: s, endDate: e, totalIncome: inc, totalExpenses: exp, netProfit: net, bookings: fg, paidMap: pm };

  const summaryContent = `
    <div class="card">
      <h1>📊 Financial Summary</h1>
      <div class="sub">${label} — ${s} to ${e}</div>
      <div class="btn-row">${btns}</div>
      ${!isCA ? `<button class="secondary btn-sm" onclick="renderDashboard()">← Back</button>` : ''}
      <button class="outline btn-sm" onclick="downloadFYData()">⬇️ CSV</button>
    </div>

    <div class="card">
      <div class="metric-row"><span class="metric-label">Total Income</span><span class="metric-value">₹${inc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Online Income</span><span class="metric-value" style="color:var(--blue);">₹${onlineInc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Offline Income</span><span class="metric-value" style="color:var(--yellow);">₹${offlineInc.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Expenses</span><span class="metric-value warn">₹${exp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Net Profit</span><span class="metric-value" style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'};">₹${net.toLocaleString('en-IN')}</span></div>
    </div>

    <div class="card">
      <div class="section-title">Bookings (${fg.length})</div>
      ${tbl}
    </div>`;

  if (isCA) {
    appEl.innerHTML = `
      <div class="ca-wrap">
        <div class="ca-header">
          <img src="assets/logo.png" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-bottom:6px;" />
          <h1>${BRAND}</h1>
          <div class="sub">👋 ${SESSION.displayName || 'CA'} — Accountant</div>
          <button class="ca-logout" onclick="logout()">🚪 Logout</button>
        </div>
        ${summaryContent}
        <div class="card" style="text-align:center;">
          <button class="ca-logout" onclick="logout()">🚪 Logout</button>
        </div>
      </div>`;
  } else {
    renderShell(summaryContent, 'dashboard');
  }
}

function downloadFYData() {
  const d = window._fyData;
  if (!d) return;
  let csv = `Period,${d.label}\nFrom,${d.startDate}\nTo,${d.endDate}\nIncome,${d.totalIncome}\nExpenses,${d.totalExpenses}\nProfit,${d.netProfit}\n\nBooking ID,Guest,Room,Check-in,Received\n`;
  d.bookings.forEach(g => {
    csv += `${g.booking_id},${g.guest_name},${g.room_id},${g.check_in},${d.paidMap[g.booking_id] || 0}\n`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `Financial_${d.label}.csv`;
  a.click();
}