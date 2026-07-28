// ═══════════════════════════════════════════════════════════
// 📊 ANALYTICS DASHBOARD v2 — with Insights + Online/Offline
// ═══════════════════════════════════════════════════════════

(function() {
  const AN = {
    period: 30,
    revenueMode: 'both'
  };

  window.setAnalyticsPeriod = function(days) {
    AN.period = parseInt(days) || 30;
    renderAnalytics();
  };

  window.setRevenueMode = function(mode) {
    AN.revenueMode = mode;
    renderAnalytics();
  };

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function formatK(n) {
    n = Number(n) || 0;
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Math.round(n);
  }

  function fmt(n) {
    return (Number(n) || 0).toLocaleString('en-IN');
  }

  function calcNights(a, b) {
    if (!a || !b) return 0;
    const d = (new Date(b) - new Date(a)) / 86400000;
    return Math.max(0, Math.round(d));
  }

  // ═══ AUTO INSIGHTS ENGINE ═══
  function generateInsights(data) {
    const insights = { critical: [], opportunities: [], wins: [] };
    const { bookings, payments, pendingBookings, totalRevenue, prevRevenue,
            onlineRev, offlineRev, propMap, guests, occupancy, pendingDue } = data;

    // ─ CRITICAL ─
    // High pending dues
    const highDuePeople = Object.values(guests)
      .filter(g => g.due > 20000)
      .sort((a, b) => b.due - a.due)
      .slice(0, 3);
    highDuePeople.forEach(g => {
      insights.critical.push({
        icon: '⚠️',
        title: (g.name || 'Guest') + ' has ' + formatK(g.due) + ' pending',
        detail: g.stays + ' stay(s) · ' + (g.phone || 'no phone'),
        action: g.phone ? { label: '📱 WhatsApp', fn: "window.open('https://wa.me/91" + g.phone.replace(/[^0-9]/g,'') + "?text=' + encodeURIComponent('Reminder: ₹" + fmt(g.due) + " payment pending for your recent stay. Please clear at earliest.'), '_blank')" } : null
      });
    });

    // Pending approvals
    if (pendingBookings > 5) {
      insights.critical.push({
        icon: '🟡',
        title: pendingBookings + ' bookings awaiting approval',
        detail: 'Some may be > 24hrs old',
        action: { label: 'Review Now →', fn: "window.navigate('pendingApprovals')" }
      });
    }

    // ─ OPPORTUNITIES ─
    // High occupancy + low revenue (underpriced)
    Object.values(propMap).forEach(p => {
      const occ = (p.nights / AN.period) * 100;
      const avg = p.count > 0 ? p.revenue / p.count : 0;
      if (occ > 70 && avg < 3000 && p.count >= 3) {
        insights.opportunities.push({
          icon: '💡',
          title: p.name + ': ' + occ.toFixed(0) + '% occupancy but only ' + formatK(avg) + '/booking',
          detail: 'Looks underpriced — consider +30% rate',
          action: null
        });
      }
    });

    // Airbnb heavy — push direct
    const onlineShare = totalRevenue > 0 ? (onlineRev / totalRevenue * 100) : 0;
    if (onlineShare > 60) {
      const commission = Math.round(onlineRev * 0.15);
      insights.opportunities.push({
        icon: '💡',
        title: onlineShare.toFixed(0) + '% revenue from Airbnb (~' + formatK(commission) + ' commission)',
        detail: 'Push direct bookings — repeat WhatsApp campaign',
        action: null
      });
    }

    // Weekday gap
    let weekdayNights = 0, weekendNights = 0;
    bookings.forEach(b => {
      if (!b.check_in || !b.check_out) return;
      const start = new Date(b.check_in);
      const nights = calcNights(b.check_in, b.check_out);
      for (let i = 0; i < nights; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const day = d.getDay();
        if (day === 0 || day === 6 || day === 5) weekendNights++;
        else weekdayNights++;
      }
    });
    if (weekdayNights > 0 && weekendNights > weekdayNights * 1.5) {
      insights.opportunities.push({
        icon: '💡',
        title: 'Weekdays underutilized',
        detail: 'Weekend ' + weekendNights + ' nights vs Weekday ' + weekdayNights + ' — try Mon-Wed 20% discount',
        action: null
      });
    }

    // 100% dependent property (all online OR all offline)
    Object.values(propMap).forEach(p => {
      if (p.count < 2) return;
      if (p.onlineCount === p.count && p.count >= 3) {
        insights.opportunities.push({
          icon: '⚠️',
          title: p.name + ' is 100% Airbnb-dependent',
          detail: 'Diversify — promote for direct bookings',
          action: null
        });
      }
    });

        // ─ DATA QUALITY WARNINGS ─
    const badNames = bookings.filter(b => {
      const n = (b.guest_name || '').toLowerCase().trim();
      return ['pending', 'tbd', 'unknown', '', 'guest'].includes(n);
    });
    if (badNames.length > 0) {
      insights.critical.push({
        icon: '📝',
        title: badNames.length + ' bookings have placeholder guest names',
        detail: 'Fix names for accurate reports',
        action: { label: 'View →', fn: "window.navigate('bookings')" }
      });
    }

    // ─ WINS ─
    if (prevRevenue > 0) {
      const change = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
      if (change > 5 && change < 300) {
        insights.wins.push({
          icon: '📈',
          title: 'Revenue up ' + change.toFixed(0) + '% vs previous period',
          detail: 'Total: ' + formatK(totalRevenue),
          action: null
        });
      } else if (change >= 300) {
        insights.wins.push({
          icon: '🚀',
          title: 'Revenue skyrocketed! (>' + change.toFixed(0) + '%)',
          detail: 'Previous period had low activity — huge growth this month',
          action: null
        });
      }
    }

    // Star property (100% occupancy)
    Object.values(propMap).forEach(p => {
      const occ = (p.nights / AN.period) * 100;
      if (occ >= 90) {
        insights.wins.push({
          icon: '🥇',
          title: p.name + ': ' + occ.toFixed(0) + '% occupancy!',
          detail: 'Star performer — consider premium pricing',
          action: null
        });
      }
    });

    return insights;
  }

  // ═══ DONUT CHART SVG ═══
  function donutChart(segments, size = 160) {
    // segments: [{ label, value, color }]
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const cx = size / 2, cy = size / 2, r = size * 0.35, sw = size * 0.15;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const parts = segments.map(seg => {
      const frac = seg.value / total;
      const dash = frac * circ;
      const el = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + seg.color + '" stroke-width="' + sw + '" stroke-dasharray="' + dash + ' ' + (circ - dash) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" />';
      offset += dash;
      return el;
    }).join('');

    return '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:' + size + 'px;height:' + size + 'px;">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#f0f0f0" stroke-width="' + sw + '" />' +
      parts +
      '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#222">' + formatK(total) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="10" fill="#888">Total</text>' +
    '</svg>';
  }

  // ═══ MAIN RENDER ═══
  async function renderAnalytics() {
    if (!['developer', 'owner'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'analytics');
      return;
    }

    renderShell('<div class="loading">📊 Crunching numbers...</div>', 'analytics');

    const fromDate = daysAgo(AN.period);
    const prevFromDate = daysAgo(AN.period * 2);

    const [bkRes, payRes, roomsRes, prevBkRes, pendingRes] = await Promise.all([
      sb.from('guest_register')
        .select('booking_id, guest_name, phone, room_id, check_in, check_out, total_amount, booking_mode, created_by, booked_by, rooms(unit_no, nickname, property_name)')
        .gte('check_in', fromDate)
        .neq('verification_status', 'rejected'),
      sb.from('payment_history')
        .select('id, booking_id, amount, payment_mode, payment_date, verification_status')
        .gte('payment_date', fromDate)
        .neq('verification_status', 'rejected'),
      sb.from('rooms').select('room_id, unit_no, nickname, property_name'),
      sb.from('guest_register')
        .select('total_amount, booking_mode')
        .gte('check_in', prevFromDate)
        .lt('check_in', fromDate)
        .neq('verification_status', 'rejected'),
      sb.from('guest_register').select('booking_id', { count: 'exact', head: true })
        .eq('verification_status', 'pending')
    ]);

    const bookings = bkRes.data || [];
    const payments = payRes.data || [];
    const rooms = roomsRes.data || [];
    const prevBookings = prevBkRes.data || [];
    const pendingBookings = pendingRes.count || 0;

    // ─── Core metrics ───
    const totalRevenue = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const prevRevenue = prevBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const revChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

    const onlineBks = bookings.filter(b => b.booking_mode === 'Online-Airbnb');
    const offlineBks = bookings.filter(b => b.booking_mode !== 'Online-Airbnb');
    const onlineRev = onlineBks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const offlineRev = offlineBks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const commissionEst = Math.round(onlineRev * 0.15); // ~15% Airbnb takes

    // ─── Occupancy (capped at 100%) ───
    let totalNights = 0;
    bookings.forEach(b => {
      totalNights += Math.min(calcNights(b.check_in, b.check_out), AN.period);
    });
    const totalRoomNights = rooms.length * AN.period;
    const occupancy = Math.min(100, totalRoomNights > 0 ? (totalNights / totalRoomNights * 100) : 0);
    const avgStay = bookings.length > 0 ? totalNights / bookings.length : 0;

    // ─── Payments (guest map with dues) ───
    const paidByBk = {};
    payments.forEach(p => { paidByBk[p.booking_id] = (paidByBk[p.booking_id] || 0) + (p.amount || 0); });

    const guestMap = {};
    bookings.forEach(b => {
      const key = (b.phone || b.guest_name || '').trim();
      if (!key) return;
      // Skip placeholder names
      const nameLower = (b.guest_name || '').toLowerCase().trim();
      if (['pending', 'tbd', 'unknown', 'guest', 'test'].includes(nameLower)) return;
      if (!guestMap[key]) guestMap[key] = { name: b.guest_name, phone: b.phone, revenue: 0, stays: 0, due: 0, online: 0, offline: 0 };
      const bkPaid = paidByBk[b.booking_id] || 0;
      const bkDue = Math.max(0, (b.total_amount || 0) - bkPaid);
      guestMap[key].revenue += b.total_amount || 0;
      guestMap[key].due += bkDue;
      guestMap[key].stays++;
      if (b.booking_mode === 'Online-Airbnb') guestMap[key].online += b.total_amount || 0;
      else guestMap[key].offline += b.total_amount || 0;
    });
    const topGuests = Object.values(guestMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const pendingDue = Object.values(guestMap).reduce((s, g) => s + g.due, 0);

    // ─── Property performance with online/offline split ───
    const propMap = {};
    bookings.forEach(b => {
      const key = b.room_id;
      if (!propMap[key]) propMap[key] = {
        name: propLabel(b.rooms) || b.room_id, revenue: 0, count: 0, nights: 0,
        onlineRev: 0, offlineRev: 0, onlineCount: 0, offlineCount: 0
      };
      const p = propMap[key];
      const rev = b.total_amount || 0;
      p.revenue += rev;
      p.count++;
      p.nights += Math.min(calcNights(b.check_in, b.check_out), AN.period);
      if (b.booking_mode === 'Online-Airbnb') { p.onlineRev += rev; p.onlineCount++; }
      else { p.offlineRev += rev; p.offlineCount++; }
    });
    const topProps = Object.values(propMap).sort((a, b) => b.revenue - a.revenue);

    // ─── Payment mode breakdown ───
    const modeTotals = {};
    payments.forEach(p => {
      const m = (p.payment_mode || 'Other').trim();
      modeTotals[m] = (modeTotals[m] || 0) + (p.amount || 0);
    });
    const modeArr = Object.entries(modeTotals).sort((a, b) => b[1] - a[1]);

    // ─── Daily revenue (online vs offline) ───
    const dailyOn = {}, dailyOff = {};
    for (let i = 0; i < AN.period; i++) {
      const d = daysAgo(AN.period - 1 - i);
      dailyOn[d] = 0; dailyOff[d] = 0;
    }
    payments.forEach(p => {
      if (!p.payment_date || dailyOn[p.payment_date] === undefined) return;
      // Check if payment mode is online (Airbnb Payout) or offline
      const bk = bookings.find(b => b.booking_id === p.booking_id);
      const isOnline = bk?.booking_mode === 'Online-Airbnb' || p.payment_mode === 'Airbnb Payout';
      if (isOnline) dailyOn[p.payment_date] += p.amount || 0;
      else dailyOff[p.payment_date] += p.amount || 0;
    });

    // ─── Generate insights ───
    const insights = generateInsights({
      bookings, payments, pendingBookings, totalRevenue, prevRevenue,
      onlineRev, offlineRev, propMap, guests: guestMap, occupancy, pendingDue
    });

    // ═══ BUILD HTML ═══

    // Insights card
    const insightCard = (i, colorBg) =>
      '<div style="background:' + colorBg + ';border-radius:8px;padding:12px;margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:start;gap:10px;">' +
          '<div style="flex:1;">' +
            '<div style="font-weight:700;font-size:13px;">' + i.icon + ' ' + i.title + '</div>' +
            (i.detail ? '<div style="font-size:11px;color:#555;margin-top:4px;">' + i.detail + '</div>' : '') +
          '</div>' +
          (i.action ? '<button class="btn-sm" style="background:#222;color:#fff;font-size:11px;white-space:nowrap;" onclick="' + i.action.fn + '">' + i.action.label + '</button>' : '') +
        '</div>' +
      '</div>';

    const insightsHtml =
      (insights.critical.length + insights.opportunities.length + insights.wins.length) === 0
      ? '<div style="text-align:center;padding:20px;color:#888;">All systems running smoothly 🎉</div>'
      :
      (insights.critical.length > 0
        ? '<div style="margin-bottom:12px;"><strong style="color:#DC2626;">🚨 CRITICAL (' + insights.critical.length + ')</strong></div>' +
          insights.critical.map(i => insightCard(i, '#FEE2E2')).join('')
        : '') +
      (insights.opportunities.length > 0
        ? '<div style="margin:12px 0;"><strong style="color:#B45309;">💰 OPPORTUNITIES (' + insights.opportunities.length + ')</strong></div>' +
          insights.opportunities.map(i => insightCard(i, '#FEF3C7')).join('')
        : '') +
      (insights.wins.length > 0
        ? '<div style="margin:12px 0;"><strong style="color:#0A7D1A;">⭐ WINS (' + insights.wins.length + ')</strong></div>' +
          insights.wins.map(i => insightCard(i, '#D1FAE5')).join('')
        : '');

    // Metric card
    const metricCard = (label, value, sub, color) =>
      '<div style="background:#fff;padding:14px;border-radius:10px;border-left:4px solid ' + color + ';box-shadow:0 2px 4px rgba(0,0,0,0.05);">' +
        '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;">' + label + '</div>' +
        '<div style="font-size:22px;font-weight:800;margin-top:4px;color:' + color + ';">' + value + '</div>' +
        (sub ? '<div style="font-size:10px;color:#666;margin-top:2px;">' + sub + '</div>' : '') +
      '</div>';

    // Revenue trend chart (dual line)
    const chartW = 800, chartH = 220, padL = 55, padB = 30, padT = 10;
    const onValues = Object.values(dailyOn);
    const offValues = Object.values(dailyOff);
    const bothValues = onValues.map((v, i) => v + offValues[i]);
    const dates = Object.keys(dailyOn);
    const maxV = Math.max(...bothValues, ...onValues, ...offValues, 1);
    const stepX = (chartW - padL - 10) / Math.max(dates.length - 1, 1);
    const y = v => chartH - padB - (v / maxV) * (chartH - padB - padT);

    const linePts = (vals) => vals.map((v, i) => (padL + i * stepX) + ',' + y(v)).join(' ');

    const trendChart =
      '<svg viewBox="0 0 ' + chartW + ' ' + chartH + '" style="width:100%;height:auto;background:#fafafa;border-radius:8px;">' +
        [0, 0.25, 0.5, 0.75, 1].map(f =>
          '<line x1="' + padL + '" y1="' + y(maxV * f) + '" x2="' + (chartW - 10) + '" y2="' + y(maxV * f) + '" stroke="#eee" />' +
          '<text x="' + (padL - 5) + '" y="' + (y(maxV * f) + 4) + '" font-size="10" fill="#888" text-anchor="end">' + formatK(maxV * f) + '</text>'
        ).join('') +
        (AN.revenueMode === 'both' || AN.revenueMode === 'online' ?
          '<polyline points="' + linePts(onValues) + '" fill="none" stroke="#FF385C" stroke-width="2.5" />' +
          onValues.map((v, i) => '<circle cx="' + (padL + i * stepX) + '" cy="' + y(v) + '" r="2.5" fill="#FF385C"><title>Online ' + dates[i] + ': ' + formatK(v) + '</title></circle>').join('')
        : '') +
        (AN.revenueMode === 'both' || AN.revenueMode === 'offline' ?
          '<polyline points="' + linePts(offValues) + '" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="6 3" />' +
          offValues.map((v, i) => '<circle cx="' + (padL + i * stepX) + '" cy="' + y(v) + '" r="2.5" fill="#F59E0B"><title>Offline ' + dates[i] + ': ' + formatK(v) + '</title></circle>').join('')
        : '') +
        dates.filter((_, i) => i % Math.ceil(dates.length / 8) === 0).map((d) => {
          const idx = dates.indexOf(d);
          return '<text x="' + (padL + idx * stepX) + '" y="' + (chartH - 8) + '" font-size="10" fill="#888" text-anchor="middle">' + d.slice(5) + '</text>';
        }).join('') +
      '</svg>' +
      '<div style="display:flex;justify-content:center;gap:20px;margin-top:8px;font-size:12px;">' +
        '<span><span style="display:inline-block;width:14px;height:3px;background:#FF385C;vertical-align:middle;"></span> Online (Airbnb): ' + formatK(onlineRev) + '</span>' +
        '<span><span style="display:inline-block;width:14px;height:3px;background:#F59E0B;vertical-align:middle;border-top:1px dashed #F59E0B;"></span> Offline (Direct): ' + formatK(offlineRev) + '</span>' +
      '</div>';

    // Donut: Payment modes
    const modeColors = { 'Cash': '#0A7D1A', 'UPI': '#8B5CF6', 'Bank Transfer': '#3B82F6', 'Bank': '#3B82F6', 'Airbnb Payout': '#FF385C', 'Other': '#888' };
    const modeSegments = modeArr.map(([m, v]) => ({ label: m, value: v, color: modeColors[m] || '#666' }));
    const modeDonut = donutChart(modeSegments, 160);
    const modeLegend = modeArr.map(([m, v]) => {
      const pct = totalRevenue > 0 ? ((v / modeArr.reduce((s, [, x]) => s + x, 0)) * 100).toFixed(1) : 0;
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;">' +
        '<span><span style="display:inline-block;width:10px;height:10px;background:' + (modeColors[m] || '#666') + ';border-radius:2px;margin-right:6px;"></span>' + m + '</span>' +
        '<span><strong>' + formatK(v) + '</strong> <small style="color:#888;">(' + pct + '%)</small></span>' +
      '</div>';
    }).join('');

    // Donut: Booking source (online/offline count)
    const sourceSegments = [
      { label: 'Airbnb', value: onlineBks.length, color: '#FF385C' },
      { label: 'Direct', value: offlineBks.length, color: '#F59E0B' }
    ];
    const sourceDonut = donutChart(sourceSegments, 160);

    // Top properties with online/offline split
    const maxPropRev = topProps[0]?.revenue || 1;
    const propRows = topProps.slice(0, 8).map((p, i) => {
      const occ = Math.min(100, (p.nights / AN.period) * 100).toFixed(0);
      const pct = (p.revenue / maxPropRev * 100).toFixed(0);
      const onPct = p.revenue > 0 ? (p.onlineRev / p.revenue * 100).toFixed(0) : 0;
      const offPct = 100 - onPct;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '·';
      return '<div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">' +
          '<span>' + medal + ' <strong>' + p.name + '</strong> <small style="color:#888;">' + p.count + ' bk · ' + occ + '% occ</small></span>' +
          '<strong>' + formatK(p.revenue) + '</strong>' +
        '</div>' +
        '<div style="background:#f0f0f0;border-radius:4px;height:16px;overflow:hidden;display:flex;">' +
          '<div style="background:#FF385C;height:100%;width:' + (pct * onPct / 100) + '%;" title="Online: ' + formatK(p.onlineRev) + '"></div>' +
          '<div style="background:#F59E0B;height:100%;width:' + (pct * offPct / 100) + '%;" title="Offline: ' + formatK(p.offlineRev) + '"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-top:3px;">' +
          '<span>🌐 ' + formatK(p.onlineRev) + ' (' + p.onlineCount + ')</span>' +
          '<span>💵 ' + formatK(p.offlineRev) + ' (' + p.offlineCount + ')</span>' +
        '</div>' +
      '</div>';
    }).join('');

    // Monthly comparison placeholder (loaded async)
    const monthlyCompHtml =
      '<div class="card" style="margin-top:16px;">' +
        '<div class="section-title">📅 Monthly Comparison (Last 12 Months)</div>' +
        '<div id="monthlyCompContainer"><div class="loading">Loading monthly data...</div></div>' +
      '</div>';

    // Staff performance placeholder (loaded async)
    const staffPerfHtml =
      '<div class="card" style="margin-top:16px;">' +
        '<div class="section-title">👤 Staff Performance (Last ' + AN.period + ' Days)</div>' +
        '<div id="staffPerfContainer"><div class="loading">Loading staff stats...</div></div>' +
      '</div>';

    // Predictions placeholder (loaded async)
    const predictHtml =
      '<div class="card" style="margin-top:16px;border:2px solid #8B5CF6;">' +
        '<div class="section-title">🔮 Predictions & Forecasts</div>' +
        '<div id="predictContainer"><div class="loading">Analyzing trends...</div></div>' +
      '</div>';

    // Top guests
    const guestRows = topGuests.map((g, i) => {
      const isOnline = g.online > g.offline;
      const src = isOnline ? '🌐 Airbnb' : '💵 Direct';
      const dueBadge = g.due > 0 ? '<span class="badge red" style="font-size:10px;">Due: ' + formatK(g.due) + '</span>' : '';
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #eee;">' +
        '<div>' +
          '<strong>#' + (i + 1) + ' ' + (g.name || 'Guest') + '</strong> ' + dueBadge + '<br>' +
          '<small style="color:#888;">' + (g.phone || '') + ' · ' + g.stays + ' stay(s) · ' + src + '</small>' +
        '</div>' +
        '<strong style="color:#0A7D1A;">' + formatK(g.revenue) + '</strong>' +
      '</div>';
    }).join('') || '<div style="text-align:center;color:#888;padding:20px;">No guests</div>';

    // ═══ Assemble ═══
    const html =
      '<div class="wrap">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
          '<h1>📊 Analytics Dashboard</h1>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
          '<button onclick="printAnalytics()" class="btn-sm" style="background:#0A7D1A;color:#fff;padding:8px 14px;">🖨️ Print / PDF</button>' +
          '<select onchange="setAnalyticsPeriod(this.value)" style="padding:8px 12px;border:1px solid #ccc;border-radius:6px;">' +
            [7, 30, 60, 90, 180, 365].map(d =>
              '<option value="' + d + '"' + (AN.period === d ? ' selected' : '') + '>Last ' + (d >= 365 ? '1 year' : d >= 180 ? '6 months' : d + ' days') + '</option>'
            ).join('') +
          '</select>' +
          '</div>' +
        '</div>' +

        // Insights card
        '<div class="card" style="border:2px solid #FF385C;margin-top:16px;">' +
          '<div class="section-title">🎯 SMART INSIGHTS (Auto-Generated)</div>' +
          insightsHtml +
        '</div>' +

        // Main metrics row
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0;">' +
          metricCard('💰 Total Revenue', formatK(totalRevenue), revChange !== 0 ? (revChange >= 0 ? '↑' : '↓') + ' ' + (Math.abs(revChange) > 999 ? '999+' : Math.abs(revChange).toFixed(0)) + '% vs prev' : null, '#FF385C') +
          metricCard('🌐 Online (Airbnb)', formatK(onlineRev), onlineBks.length + ' bookings · ~' + formatK(commissionEst) + ' fees', '#8B5CF6') +
          metricCard('💵 Offline (Direct)', formatK(offlineRev), offlineBks.length + ' bookings · zero fees ✅', '#F59E0B') +
          metricCard('📊 Occupancy', occupancy.toFixed(0) + '%', totalNights + ' room-nights', '#3B82F6') +
          metricCard('📅 Bookings', bookings.length, 'Avg ' + avgStay.toFixed(1) + ' nights', '#0A7D1A') +
          metricCard('⚠️ Pending Due', formatK(pendingDue), Object.values(guestMap).filter(g => g.due > 0).length + ' guests', '#DC2626') +
        '</div>' +

        // Revenue chart
        '<div class="card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
            '<div class="section-title" style="margin:0;">📈 Revenue Trend — Online vs Offline</div>' +
            '<div>' +
              '<button class="btn-sm ' + (AN.revenueMode === 'both' ? '' : 'outline') + '" onclick="setRevenueMode(\'both\')">Both</button> ' +
              '<button class="btn-sm ' + (AN.revenueMode === 'online' ? '' : 'outline') + '" onclick="setRevenueMode(\'online\')">Online</button> ' +
              '<button class="btn-sm ' + (AN.revenueMode === 'offline' ? '' : 'outline') + '" onclick="setRevenueMode(\'offline\')">Offline</button>' +
            '</div>' +
          '</div>' +
          trendChart +
        '</div>' +

        // Donuts row
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">' +
          '<div class="card">' +
            '<div class="section-title">🍩 Payment Modes</div>' +
            '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">' +
              '<div>' + modeDonut + '</div>' +
              '<div style="flex:1;min-width:180px;">' + modeLegend + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="section-title">🍩 Booking Source</div>' +
            '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">' +
              '<div>' + sourceDonut + '</div>' +
              '<div style="flex:1;min-width:180px;">' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;"><span><span style="display:inline-block;width:10px;height:10px;background:#FF385C;border-radius:2px;margin-right:6px;"></span>Airbnb</span><span><strong>' + onlineBks.length + '</strong> (' + formatK(onlineRev) + ')</span></div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;"><span><span style="display:inline-block;width:10px;height:10px;background:#F59E0B;border-radius:2px;margin-right:6px;"></span>Direct</span><span><strong>' + offlineBks.length + '</strong> (' + formatK(offlineRev) + ')</span></div>' +
                '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#888;">' +
                  '💡 Estimated commission: ' + formatK(commissionEst) + '<br>' +
                  '💡 If all direct: +' + formatK(commissionEst) + ' profit' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Property + Guests
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">' +
          '<div class="card">' +
            '<div class="section-title">🏠 Top Properties (Online 🌐 / Offline 💵)</div>' +
            propRows +
          '</div>' +
          '<div class="card">' +
            '<div class="section-title">👤 Top 5 Guests</div>' +
            guestRows +
          '</div>' +
        '</div>' +

        // Monthly comparison
        monthlyCompHtml +

        // Staff performance
        staffPerfHtml +

        // Predictions
        predictHtml +

      '</div>';

    renderShell(html, 'analytics');

    // Load async sections (after main render)
    loadMonthlyComparison();
    loadStaffPerformance();
    loadPredictions();
  }

  // ═══ MONTHLY COMPARISON ═══
  async function loadMonthlyComparison() {
    const container = document.getElementById('monthlyCompContainer');
    if (!container) return;

    // Fetch last 12 months of data
    const now = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const fromStr = yearAgo.toISOString().slice(0, 10);

    const { data: allBks } = await sb.from('guest_register')
      .select('booking_id, check_in, total_amount, booking_mode')
      .gte('check_in', fromStr)
      .neq('verification_status', 'rejected');

    if (!allBks || allBks.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">No data available</div>';
      return;
    }

    // Group by month
    const monthMap = {};
    allBks.forEach(b => {
      if (!b.check_in) return;
      const month = b.check_in.slice(0, 7); // YYYY-MM
      if (!monthMap[month]) monthMap[month] = { online: 0, offline: 0, count: 0 };
      const rev = b.total_amount || 0;
      monthMap[month].count++;
      if (b.booking_mode === 'Online-Airbnb') monthMap[month].online += rev;
      else monthMap[month].offline += rev;
    });

    // Sort by month desc
    const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a)).slice(0, 12);

    // Calculate growth
    let bestMonth = { key: '', total: 0 };
    let bestGrowth = { key: '', pct: -999 };

    const rows = sortedMonths.map((m, i) => {
      const d = monthMap[m];
      const total = d.online + d.offline;
      const prev = sortedMonths[i + 1] ? monthMap[sortedMonths[i + 1]] : null;
      const prevTotal = prev ? (prev.online + prev.offline) : 0;
      const growth = prevTotal > 0 ? ((total - prevTotal) / prevTotal * 100) : null;

      if (total > bestMonth.total) bestMonth = { key: m, total };
      if (growth !== null && growth > bestGrowth.pct) bestGrowth = { key: m, pct: growth };

      const monthName = new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const growthDisplay = growth === null ? '<span style="color:#888;">—</span>' :
        growth >= 0 
          ? '<span style="color:#0A7D1A;font-weight:700;">↑ +' + growth.toFixed(0) + '%</span>'
          : '<span style="color:#DC2626;font-weight:700;">↓ ' + growth.toFixed(0) + '%</span>';

      const isBest = m === bestMonth.key;

      return '<tr style="' + (isBest ? 'background:#FEF3C7;' : '') + '">' +
        '<td style="font-weight:700;">' + monthName + (isBest ? ' 🏆' : '') + '</td>' +
        '<td style="text-align:right;color:#FF385C;">' + formatK(d.online) + '</td>' +
        '<td style="text-align:right;color:#F59E0B;">' + formatK(d.offline) + '</td>' +
        '<td style="text-align:right;font-weight:700;">' + formatK(total) + '</td>' +
        '<td style="text-align:center;">' + d.count + '</td>' +
        '<td style="text-align:right;">' + growthDisplay + '</td>' +
        '</tr>';
    }).join('');

    // Mini bar chart of monthly totals
    const monthTotals = sortedMonths.slice().reverse().map(m => monthMap[m].online + monthMap[m].offline);
    const maxT = Math.max(...monthTotals, 1);
    const barChart = monthTotals.map((v, i) => {
      const h = (v / maxT) * 100;
      const monthKey = sortedMonths.slice().reverse()[i];
      const monthShort = new Date(monthKey + '-01').toLocaleDateString('en-IN', { month: 'short' });
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
        '<div style="width:100%;height:100px;display:flex;align-items:flex-end;">' +
          '<div style="width:100%;background:linear-gradient(180deg,#FF385C,#E00B41);border-radius:4px 4px 0 0;height:' + h + '%;transition:height 0.5s;" title="' + monthShort + ': ' + formatK(v) + '"></div>' +
        '</div>' +
        '<div style="font-size:10px;margin-top:4px;color:#666;">' + monthShort + '</div>' +
      '</div>';
    }).join('');

    const bestGrowthMonth = bestGrowth.key ? new Date(bestGrowth.key + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '-';
    const bestMonthName = bestMonth.key ? new Date(bestMonth.key + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '-';

    container.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
        '<div style="background:#FEF3C7;padding:12px;border-radius:8px;">' +
          '<div style="font-size:11px;color:#888;text-transform:uppercase;">🏆 Best Month</div>' +
          '<div style="font-size:18px;font-weight:800;color:#B45309;">' + bestMonthName + '</div>' +
          '<div style="font-size:13px;">' + formatK(bestMonth.total) + ' total revenue</div>' +
        '</div>' +
        '<div style="background:#D1FAE5;padding:12px;border-radius:8px;">' +
          '<div style="font-size:11px;color:#888;text-transform:uppercase;">📈 Best Growth</div>' +
          '<div style="font-size:18px;font-weight:800;color:#0A7D1A;">' + bestGrowthMonth + '</div>' +
          '<div style="font-size:13px;">+' + bestGrowth.pct.toFixed(0) + '% vs previous</div>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:4px;height:130px;margin-bottom:16px;padding:10px;background:#fafafa;border-radius:8px;">' +
        barChart +
      '</div>' +

      '<div class="table-wrap"><table style="font-size:13px;">' +
        '<thead><tr style="background:#222;color:#fff;">' +
          '<th>Month</th>' +
          '<th style="text-align:right;">🌐 Online</th>' +
          '<th style="text-align:right;">💵 Offline</th>' +
          '<th style="text-align:right;">Total</th>' +
          '<th style="text-align:center;">Bookings</th>' +
          '<th style="text-align:right;">vs Prev</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  }


  
  // ═══ STAFF PERFORMANCE ═══
  async function loadStaffPerformance() {
    const container = document.getElementById('staffPerfContainer');
    if (!container) return;

    const fromDate = daysAgo(AN.period);

    const [profRes, bkRes, payRes] = await Promise.all([
      sb.from('profiles').select('user_id, display_name, role').eq('is_approved', true),
      sb.from('guest_register')
        .select('booking_id, total_amount, created_by, booked_by, verification_status')
        .gte('check_in', fromDate)
        .neq('verification_status', 'rejected'),
      sb.from('payment_history')
        .select('id, amount, created_by, verification_status')
        .gte('payment_date', fromDate)
        .neq('verification_status', 'rejected')
    ]);

    const profiles = profRes.data || [];
    const bookings = bkRes.data || [];
    const payments = payRes.data || [];

    const profMap = {};
    profiles.forEach(p => { profMap[p.user_id] = p; });

    // Aggregate stats per user
    const staffStats = {};
    bookings.forEach(b => {
      const uid = b.created_by;
      if (!uid) return;
      if (!staffStats[uid]) staffStats[uid] = {
        name: profMap[uid]?.display_name || b.booked_by || 'Unknown',
        role: profMap[uid]?.role || 'unknown',
        bookings: 0, bookingRev: 0, pending: 0,
        payments: 0, paymentRev: 0
      };
      staffStats[uid].bookings++;
      staffStats[uid].bookingRev += b.total_amount || 0;
      if (b.verification_status === 'pending') staffStats[uid].pending++;
    });

    payments.forEach(p => {
      const uid = p.created_by;
      if (!uid) return;
      if (!staffStats[uid]) staffStats[uid] = {
        name: profMap[uid]?.display_name || 'Unknown',
        role: profMap[uid]?.role || 'unknown',
        bookings: 0, bookingRev: 0, pending: 0,
        payments: 0, paymentRev: 0
      };
      staffStats[uid].payments++;
      staffStats[uid].paymentRev += p.amount || 0;
    });

    const staffArr = Object.values(staffStats)
      .filter(s => s.bookings > 0 || s.payments > 0)
      .sort((a, b) => (b.bookingRev + b.paymentRev) - (a.bookingRev + a.paymentRev));

    if (staffArr.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">No staff activity in this period</div>';
      return;
    }

    const roleColors = {
      developer: '#8B5CF6', owner: '#FF385C',
      moderator: '#F59E0B', viewer: '#888'
    };

    const rows = staffArr.map((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤';
      const verifyRate = s.bookings > 0 ? Math.round(((s.bookings - s.pending) / s.bookings) * 100) : 100;
      const rateColor = verifyRate === 100 ? '#0A7D1A' : verifyRate >= 90 ? '#F59E0B' : '#DC2626';
      const roleColor = roleColors[s.role] || '#666';

      return '<div style="border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<div>' +
            '<span style="font-size:20px;">' + medal + '</span> ' +
            '<strong style="font-size:15px;">' + s.name + '</strong> ' +
            '<span style="background:' + roleColor + ';color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;">' + s.role + '</span>' +
          '</div>' +
          '<div style="font-size:18px;font-weight:800;color:#0A7D1A;">' + formatK(s.bookingRev + s.paymentRev) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;font-size:12px;">' +
          '<div>📅 <strong>' + s.bookings + '</strong> bookings<br>' +
            '<small style="color:#888;">' + formatK(s.bookingRev) + ' revenue</small></div>' +
          '<div>💰 <strong>' + s.payments + '</strong> payments<br>' +
            '<small style="color:#888;">' + formatK(s.paymentRev) + ' collected</small></div>' +
          '<div>' +
            (s.pending > 0
              ? '<span style="color:#F59E0B;">⚠️ <strong>' + s.pending + '</strong> pending</span>'
              : '<span style="color:#0A7D1A;">✅ All verified</span>') +
            '<br><small style="color:' + rateColor + ';">' + verifyRate + '% verify rate</small>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = rows;
  }

  
  // ═══ PRINT ANALYTICS AS PDF ═══
  window.printAnalytics = function() {
    const originalTitle = document.title;
    const dateStr = new Date().toLocaleDateString('en-IN');
    document.title = 'UHHS Analytics — ' + dateStr;

    // Inject print styles
    const printCSS = document.createElement('style');
    printCSS.id = 'analytics-print-css';
    printCSS.textContent = `
      @media print {
        body * { visibility: hidden; }
        #mainContent, #mainContent * { visibility: visible; }
        #mainContent { position: absolute; left: 0; top: 0; width: 100%; }
        .drawer, #drawer, .bottom-nav, #bottomNav, .top-bar, #topBar,
        button, select, .btn-sm, .no-print { display: none !important; }
        .card { box-shadow: none !important; border: 1px solid #ddd; page-break-inside: avoid; }
        h1 { color: #FF385C; border-bottom: 2px solid #FF385C; padding-bottom: 8px; }
        .section-title { color: #222; border-bottom: 1px solid #eee; }
        table { font-size: 11px !important; }
        @page { margin: 12mm; size: A4; }
      }
    `;
    document.head.appendChild(printCSS);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        printCSS.remove();
      }, 1000);
    }, 300);
  };

  
  // ═══ PREDICTIONS & FORECASTS ═══
  async function loadPredictions() {
    const container = document.getElementById('predictContainer');
    if (!container) return;

    // Fetch last 90 days for prediction
    const from90 = daysAgo(90);
    const today = new Date().toISOString().slice(0, 10);

    const [bkRes, roomsRes] = await Promise.all([
      sb.from('guest_register')
        .select('booking_id, check_in, check_out, total_amount, booking_mode')
        .gte('check_in', from90)
        .neq('verification_status', 'rejected'),
      sb.from('rooms').select('room_id')
    ]);

    const bookings = bkRes.data || [];
    const rooms = roomsRes.data || [];
    const totalRooms = rooms.length;

    if (bookings.length < 5) {
      container.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">Not enough data for predictions (need 5+ bookings)</div>';
      return;
    }

    // ─── Calculate daily averages by day-of-week ───
    const dowStats = [[], [], [], [], [], [], []]; // Sun-Sat
    bookings.forEach(b => {
      if (!b.check_in) return;
      const dow = new Date(b.check_in).getDay();
      dowStats[dow].push(b.total_amount || 0);
    });
    const dowAvg = dowStats.map(arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

    // ─── Next 7 days projection ───
    let projected7d = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      projected7d += dowAvg[d.getDay()] * 1.2; // ~1.2 bookings per day heuristic
    }

    // ─── Next 30 days projection based on recent trend ───
    const last30 = daysAgo(30);
    const prev30 = daysAgo(60);
    const last30Bks = bookings.filter(b => b.check_in >= last30);
    const prev30Bks = bookings.filter(b => b.check_in >= prev30 && b.check_in < last30);
    const last30Rev = last30Bks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const prev30Rev = prev30Bks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const growthRate = prev30Rev > 0 ? (last30Rev - prev30Rev) / prev30Rev : 0;
    const projected30d = Math.round(last30Rev * (1 + Math.min(growthRate, 0.5))); // cap growth at 50%

    // ─── Occupancy projection ───
    let last30Nights = 0;
    last30Bks.forEach(b => {
      last30Nights += Math.min(calcNights(b.check_in, b.check_out), 30);
    });
    const last30Occ = totalRooms > 0 ? (last30Nights / (totalRooms * 30) * 100) : 0;
    const projected30Occ = Math.min(100, Math.round(last30Occ * (1 + growthRate * 0.5)));

    // ─── Best/worst days of week ───
    const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let bestDow = 0, worstDow = 0;
    for (let i = 0; i < 7; i++) {
      if (dowAvg[i] > dowAvg[bestDow]) bestDow = i;
      if (dowAvg[i] < dowAvg[worstDow] && dowAvg[i] > 0) worstDow = i;
    }

    // ─── Seasonality: this month vs same month prev quarter ───
    const currentMonth = new Date().getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // ─── Booked-in advance ratio ───
    const nowStr = today;
    const futureBks = bookings.filter(b => b.check_in > nowStr).length;

    // ─── Render ───
    const trendIcon = growthRate > 0.05 ? '📈' : growthRate < -0.05 ? '📉' : '➡️';
    const trendColor = growthRate > 0.05 ? '#0A7D1A' : growthRate < -0.05 ? '#DC2626' : '#F59E0B';

    container.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">' +

        '<div style="background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;padding:16px;border-radius:12px;">' +
          '<div style="font-size:11px;opacity:0.9;">📅 NEXT 7 DAYS</div>' +
          '<div style="font-size:26px;font-weight:800;margin-top:4px;">' + formatK(projected7d) + '</div>' +
          '<div style="font-size:11px;opacity:0.9;">Projected revenue</div>' +
        '</div>' +

        '<div style="background:linear-gradient(135deg,#3B82F6,#1E40AF);color:#fff;padding:16px;border-radius:12px;">' +
          '<div style="font-size:11px;opacity:0.9;">📊 NEXT 30 DAYS</div>' +
          '<div style="font-size:26px;font-weight:800;margin-top:4px;">' + formatK(projected30d) + '</div>' +
          '<div style="font-size:11px;opacity:0.9;">' + trendIcon + ' ' + (growthRate >= 0 ? '+' : '') + (growthRate * 100).toFixed(0) + '% growth trend</div>' +
        '</div>' +

        '<div style="background:linear-gradient(135deg,#0A7D1A,#065F17);color:#fff;padding:16px;border-radius:12px;">' +
          '<div style="font-size:11px;opacity:0.9;">🏠 EXPECTED OCCUPANCY</div>' +
          '<div style="font-size:26px;font-weight:800;margin-top:4px;">' + projected30Occ + '%</div>' +
          '<div style="font-size:11px;opacity:0.9;">Next 30 days</div>' +
        '</div>' +

        '<div style="background:linear-gradient(135deg,#F59E0B,#B45309);color:#fff;padding:16px;border-radius:12px;">' +
          '<div style="font-size:11px;opacity:0.9;">📅 FUTURE BOOKINGS</div>' +
          '<div style="font-size:26px;font-weight:800;margin-top:4px;">' + futureBks + '</div>' +
          '<div style="font-size:11px;opacity:0.9;">Already booked ahead</div>' +
        '</div>' +

      '</div>' +

      '<div style="margin-top:16px;padding:14px;background:#F3F4F6;border-radius:10px;">' +
        '<div style="font-weight:700;margin-bottom:10px;">📈 Day-of-Week Performance</div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">' +
          [0,1,2,3,4,5,6].map(i => {
            const isMax = i === bestDow;
            const isMin = i === worstDow && dowAvg[i] > 0;
            const bg = isMax ? '#D1FAE5' : isMin ? '#FEE2E2' : '#fff';
            const border = isMax ? '2px solid #0A7D1A' : isMin ? '2px solid #DC2626' : '1px solid #ddd';
            return '<div style="background:' + bg + ';border:' + border + ';padding:10px;border-radius:8px;text-align:center;">' +
              '<div style="font-size:10px;color:#888;">' + dowNames[i].slice(0,3) + '</div>' +
              '<div style="font-size:14px;font-weight:700;">' + formatK(dowAvg[i]) + '</div>' +
              (isMax ? '<div style="font-size:9px;color:#0A7D1A;">🏆 BEST</div>' : '') +
              (isMin ? '<div style="font-size:9px;color:#DC2626;">⚠️ LOW</div>' : '') +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div style="margin-top:14px;padding:12px;background:#EDE9FE;border-radius:8px;border-left:4px solid #8B5CF6;">' +
        '<strong>💡 Insight:</strong> ' +
        (growthRate > 0.15
          ? 'Strong growth momentum! Consider raising prices 5-10%.'
          : growthRate < -0.1
          ? 'Revenue declining — check pricing, marketing, competitors.'
          : 'Steady performance. Best day: ' + dowNames[bestDow] + '. Boost ' + dowNames[worstDow] + ' with weekday discount.') +
      '</div>';
  }

  window.renderAnalytics = renderAnalytics;
})();
