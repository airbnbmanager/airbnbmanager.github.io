// ═══════════════════════════════════════════════════════════
// 📊 ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════

(function() {
  const AN = {
    period: 30,  // days
    data: null
  };

  window.setAnalyticsPeriod = function(days) {
    AN.period = parseInt(days) || 30;
    renderAnalytics();
  };

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function formatK(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
    return '₹' + Math.round(n);
  }

  async function renderAnalytics() {
    if (!['developer', 'owner'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'analytics');
      return;
    }

    renderShell('<div class="loading">Crunching numbers... 📊</div>', 'analytics');

    const fromDate = daysAgo(AN.period);
    const prevFromDate = daysAgo(AN.period * 2);
    const today = new Date().toISOString().slice(0, 10);

    // Fetch all data in parallel
    const [bkResult, payResult, roomsResult, prevBkResult] = await Promise.all([
      sb.from('guest_register')
        .select('booking_id, guest_name, phone, room_id, check_in, check_out, total_amount, booking_mode, verification_status, rooms(unit_no, nickname, property_name)')
        .gte('check_in', fromDate)
        .neq('verification_status', 'rejected'),
      sb.from('payment_history')
        .select('id, booking_id, amount, payment_mode, payment_date, verification_status')
        .gte('payment_date', fromDate)
        .neq('verification_status', 'rejected'),
      sb.from('rooms').select('room_id, unit_no, nickname, property_name'),
      sb.from('guest_register')
        .select('total_amount, check_in')
        .gte('check_in', prevFromDate)
        .lt('check_in', fromDate)
        .neq('verification_status', 'rejected')
    ]);

    const bookings = bkResult.data || [];
    const payments = payResult.data || [];
    const rooms = roomsResult.data || [];
    const prevBookings = prevBkResult.data || [];

    // ─── Metrics ───
    const totalRevenue = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDue = totalRevenue - totalPaid;
    const prevRevenue = prevBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const revChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

    const totalNights = bookings.reduce((s, b) => {
      if (!b.check_in || !b.check_out) return s;
      const nights = Math.max(1, (new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24));
      return s + nights;
    }, 0);

    const totalRoomNights = rooms.length * AN.period;
    const occupancy = totalRoomNights > 0 ? (totalNights / totalRoomNights * 100) : 0;

    const avgStay = bookings.length > 0 ? totalNights / bookings.length : 0;
    const avgTicket = bookings.length > 0 ? totalRevenue / bookings.length : 0;

    // ─── Daily revenue for line chart ───
    const dailyRev = {};
    for (let i = 0; i < AN.period; i++) {
      dailyRev[daysAgo(AN.period - 1 - i)] = 0;
    }
    payments.forEach(p => {
      if (p.payment_date && dailyRev[p.payment_date] !== undefined) {
        dailyRev[p.payment_date] += p.amount || 0;
      }
    });

    // ─── Top properties by revenue ───
    const propRev = {};
    bookings.forEach(b => {
      const key = b.room_id;
      if (!propRev[key]) propRev[key] = { revenue: 0, nights: 0, name: propLabel(b.rooms) || b.room_id, count: 0 };
      propRev[key].revenue += b.total_amount || 0;
      propRev[key].count++;
      if (b.check_in && b.check_out) {
        propRev[key].nights += Math.max(1, (new Date(b.check_out) - new Date(b.check_in)) / (86400000));
      }
    });
    const topProps = Object.entries(propRev)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 8);

    // ─── Payment mode breakdown ───
    const modeTotals = {};
    payments.forEach(p => {
      const m = p.payment_mode || 'Other';
      modeTotals[m] = (modeTotals[m] || 0) + (p.amount || 0);
    });
    const modeArr = Object.entries(modeTotals).sort((a, b) => b[1] - a[1]);

    // ─── Booking source ───
    const online = bookings.filter(b => b.booking_mode === 'Online-Airbnb').length;
    const offline = bookings.length - online;
    const onlineRev = bookings.filter(b => b.booking_mode === 'Online-Airbnb').reduce((s, b) => s + (b.total_amount || 0), 0);
    const offlineRev = totalRevenue - onlineRev;

    // ─── Top guests ───
    const guestMap = {};
    bookings.forEach(b => {
      const key = (b.phone || b.guest_name || '').trim();
      if (!key) return;
      if (!guestMap[key]) guestMap[key] = { name: b.guest_name, phone: b.phone, revenue: 0, stays: 0 };
      guestMap[key].revenue += b.total_amount || 0;
      guestMap[key].stays++;
    });
    const topGuests = Object.values(guestMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // ═══ BUILD HTML ═══

    // Metric card helper
    const metricCard = (label, value, change, color) =>
      '<div style="background:#fff;padding:16px;border-radius:12px;border-left:4px solid ' + color + ';box-shadow:0 2px 4px rgba(0,0,0,0.05);">' +
        '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">' + label + '</div>' +
        '<div style="font-size:26px;font-weight:800;margin-top:4px;color:' + color + ';">' + value + '</div>' +
        (change !== null ? '<div style="font-size:11px;margin-top:2px;color:' + (change >= 0 ? '#0A7D1A' : '#DC2626') + ';">' + (change >= 0 ? '↑' : '↓') + ' ' + Math.abs(change).toFixed(1) + '% vs prev period</div>' : '') +
      '</div>';

    // Line chart (revenue trend) - SVG
    const revValues = Object.values(dailyRev);
    const revDates = Object.keys(dailyRev);
    const maxRev = Math.max(...revValues, 1);
    const chartW = 800, chartH = 200, padL = 50, padB = 30;
    const stepX = (chartW - padL - 10) / Math.max(revValues.length - 1, 1);
    const pointsAttr = revValues.map((v, i) =>
      (padL + i * stepX) + ',' + (chartH - padB - (v / maxRev) * (chartH - padB - 10))
    ).join(' ');
    const areaPath = 'M' + (padL) + ',' + (chartH - padB) + ' L' + pointsAttr.split(' ').join(' L') + ' L' + (padL + (revValues.length - 1) * stepX) + ',' + (chartH - padB) + ' Z';

    const lineChart =
      '<svg viewBox="0 0 ' + chartW + ' ' + chartH + '" style="width:100%;height:auto;background:#fff;border-radius:8px;">' +
        // grid
        [0, 0.25, 0.5, 0.75, 1].map(f =>
          '<line x1="' + padL + '" y1="' + (chartH - padB - f * (chartH - padB - 10)) + '" x2="' + (chartW - 10) + '" y2="' + (chartH - padB - f * (chartH - padB - 10)) + '" stroke="#eee" />' +
          '<text x="' + (padL - 5) + '" y="' + (chartH - padB - f * (chartH - padB - 10) + 4) + '" font-size="10" fill="#888" text-anchor="end">' + formatK(maxRev * f) + '</text>'
        ).join('') +
        // area
        '<path d="' + areaPath + '" fill="rgba(255,56,92,0.15)" stroke="none" />' +
        // line
        '<polyline points="' + pointsAttr + '" fill="none" stroke="#FF385C" stroke-width="2.5" />' +
        // dots
        revValues.map((v, i) =>
          '<circle cx="' + (padL + i * stepX) + '" cy="' + (chartH - padB - (v / maxRev) * (chartH - padB - 10)) + '" r="3" fill="#FF385C">' +
            '<title>' + revDates[i] + ': ' + formatK(v) + '</title>' +
          '</circle>'
        ).join('') +
        // x-axis labels (every 5th)
        revDates.filter((_, i) => i % Math.ceil(revDates.length / 8) === 0).map((d, i) => {
          const origIdx = revDates.indexOf(d);
          return '<text x="' + (padL + origIdx * stepX) + '" y="' + (chartH - 10) + '" font-size="10" fill="#888" text-anchor="middle">' + d.slice(5) + '</text>';
        }).join('') +
      '</svg>';

    // Top properties bar chart
    const maxPropRev = topProps[0]?.[1]?.revenue || 1;
    const propBars = topProps.map(([id, p]) => {
      const pct = (p.revenue / maxPropRev * 100).toFixed(0);
      const occ = ((p.nights / AN.period) * 100).toFixed(0);
      return '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">' +
          '<span><strong>' + p.name + '</strong> <small style="color:#888;">' + p.count + ' bookings · ' + occ + '% occ</small></span>' +
          '<strong>' + formatK(p.revenue) + '</strong>' +
        '</div>' +
        '<div style="background:#f0f0f0;border-radius:4px;height:20px;overflow:hidden;">' +
          '<div style="background:linear-gradient(90deg,#FF385C,#E00B41);height:100%;width:' + pct + '%;transition:width 0.5s;"></div>' +
        '</div>' +
      '</div>';
    }).join('') || '<div style="color:#888;text-align:center;">No data</div>';

    // Payment modes bar
    const totalModes = modeArr.reduce((s, [, v]) => s + v, 0) || 1;
    const modeBars = modeArr.map(([m, v]) => {
      const pct = (v / totalModes * 100).toFixed(1);
      const colors = { 'Cash': '#0A7D1A', 'UPI': '#8B5CF6', 'Bank': '#3B82F6', 'Airbnb Payout': '#FF385C' };
      const color = colors[m] || '#666';
      return '<div style="margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;">' +
          '<span><strong>' + m + '</strong></span>' +
          '<span>' + formatK(v) + ' <small style="color:#888;">(' + pct + '%)</small></span>' +
        '</div>' +
        '<div style="background:#f0f0f0;border-radius:4px;height:8px;overflow:hidden;margin-top:2px;">' +
          '<div style="background:' + color + ';height:100%;width:' + pct + '%;"></div>' +
        '</div>' +
      '</div>';
    }).join('') || '<div style="color:#888;">No payments</div>';

    // Source pie (SVG)
    const onlinePct = bookings.length > 0 ? (online / bookings.length * 100) : 0;
    const offlinePct = 100 - onlinePct;
    const dash = (onlinePct / 100) * 251.2; // 2πr where r=40
    const pie =
      '<svg viewBox="0 0 100 100" style="width:120px;height:120px;">' +
        '<circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" stroke-width="20" />' +
        '<circle cx="50" cy="50" r="40" fill="none" stroke="#FF385C" stroke-width="20" ' +
          'stroke-dasharray="' + dash + ' 251.2" stroke-dashoffset="0" transform="rotate(-90 50 50)" />' +
      '</svg>';

    // Top guests
    const guestList = topGuests.map((g, i) =>
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #eee;">' +
        '<div>' +
          '<strong>#' + (i + 1) + ' ' + (g.name || 'Guest') + '</strong>' +
          '<div style="font-size:11px;color:#888;">' + (g.phone || '') + ' · ' + g.stays + ' stay(s)</div>' +
        '</div>' +
        '<strong style="color:#0A7D1A;">' + formatK(g.revenue) + '</strong>' +
      '</div>'
    ).join('') || '<div style="text-align:center;color:#888;padding:20px;">No guests</div>';

    // ═══ Assemble page ═══
    const html =
      '<div class="wrap">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
          '<h1>📊 Analytics Dashboard</h1>' +
          '<div>' +
            '<label>Period: </label>' +
            '<select onchange="setAnalyticsPeriod(this.value)" style="padding:6px 10px;border:1px solid #ccc;border-radius:6px;">' +
              '<option value="7"' + (AN.period === 7 ? ' selected' : '') + '>Last 7 days</option>' +
              '<option value="30"' + (AN.period === 30 ? ' selected' : '') + '>Last 30 days</option>' +
              '<option value="60"' + (AN.period === 60 ? ' selected' : '') + '>Last 60 days</option>' +
              '<option value="90"' + (AN.period === 90 ? ' selected' : '') + '>Last 90 days</option>' +
              '<option value="180"' + (AN.period === 180 ? ' selected' : '') + '>Last 6 months</option>' +
              '<option value="365"' + (AN.period === 365 ? ' selected' : '') + '>Last 1 year</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        // Metrics row
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0;">' +
          metricCard('Revenue', formatK(totalRevenue), revChange, '#FF385C') +
          metricCard('Occupancy', occupancy.toFixed(0) + '%', null, '#3B82F6') +
          metricCard('Bookings', bookings.length, null, '#8B5CF6') +
          metricCard('Avg Stay', avgStay.toFixed(1) + ' nt', null, '#0A7D1A') +
          metricCard('Avg Ticket', formatK(avgTicket), null, '#F59E0B') +
          metricCard('Total Due', formatK(totalDue), null, '#DC2626') +
        '</div>' +

        // Revenue chart
        '<div class="card">' +
          '<div class="section-title">📈 Revenue Trend (Last ' + AN.period + ' Days)</div>' +
          lineChart +
        '</div>' +

        // 2-column
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">' +
          '<div class="card">' +
            '<div class="section-title">🏠 Top Properties by Revenue</div>' +
            propBars +
          '</div>' +
          '<div class="card">' +
            '<div class="section-title">💰 Payment Modes</div>' +
            modeBars +
          '</div>' +
        '</div>' +

        // Bottom row
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">' +
          '<div class="card" style="text-align:center;">' +
            '<div class="section-title" style="text-align:left;">🌐 Booking Source</div>' +
            pie +
            '<div style="display:flex;justify-content:center;gap:20px;margin-top:10px;font-size:13px;">' +
              '<span><span style="display:inline-block;width:12px;height:12px;background:#FF385C;border-radius:2px;"></span> Airbnb: ' + online + ' (' + formatK(onlineRev) + ')</span>' +
              '<span><span style="display:inline-block;width:12px;height:12px;background:#F59E0B;border-radius:2px;"></span> Offline: ' + offline + ' (' + formatK(offlineRev) + ')</span>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="section-title">👤 Top 5 Guests</div>' +
            guestList +
          '</div>' +
        '</div>' +

      '</div>';

    renderShell(html, 'analytics');
  }

  window.renderAnalytics = renderAnalytics;
})();
