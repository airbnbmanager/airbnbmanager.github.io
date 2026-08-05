// ═══════════════════════════════════════════════════════════
// 📊 ANALYTICS DASHBOARD v3.0 BEST — Complete Business Intelligence
// Features: Month/Quarter/Year + Property Performance + Insights + Cash Flow
// ═══════════════════════════════════════════════════════════

(function() {
  const AN = {
    viewType: 'month',
    periodKey: null,
    compareKey: null
  };

  function initDefaults() {
    const now = new Date();
    AN.periodKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    AN.compareKey = getPreviousPeriod(AN.viewType, AN.periodKey);
  }

  // ═══ DATE UTILITIES ═══
  function getDateRange(viewType, periodKey) {
    if (viewType === 'month') {
      const [year, month] = periodKey.split('-');
      const from = year + '-' + month + '-01';
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const to = year + '-' + month + '-' + String(lastDay).padStart(2, '0');
      return { from, to, label: new Date(from).toLocaleString('en-IN', {month: 'long', year: 'numeric'}), days: lastDay };
    }
    if (viewType === 'quarter') {
      const [year, q] = periodKey.split('-Q');
      const startMonth = (parseInt(q) - 1) * 3;
      const from = year + '-' + String(startMonth + 1).padStart(2, '0') + '-01';
      const endMonth = startMonth + 3;
      const lastDay = new Date(parseInt(year), endMonth, 0).getDate();
      const to = year + '-' + String(endMonth).padStart(2, '0') + '-' + lastDay;
      const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
      return { from, to, label: 'Q' + q + ' ' + year, days };
    }
    if (viewType === 'year') {
      return { from: periodKey + '-01-01', to: periodKey + '-12-31', label: 'Year ' + periodKey, days: 365 };
    }
  }

  function getPreviousPeriod(viewType, periodKey) {
    if (viewType === 'month') {
      const [year, month] = periodKey.split('-').map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return prevYear + '-' + String(prevMonth).padStart(2, '0');
    }
    if (viewType === 'quarter') {
      const [year, q] = periodKey.split('-Q').map(Number);
      const prevQ = q === 1 ? 4 : q - 1;
      const prevYear = q === 1 ? year - 1 : year;
      return prevYear + '-Q' + prevQ;
    }
    return String(parseInt(periodKey) - 1);
  }

  function getMonthOptions(count) {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        label: d.toLocaleString('en-IN', {month: 'long', year: 'numeric'})
      });
    }
    return opts;
  }

  function getQuarterOptions(count) {
    const opts = [];
    const now = new Date();
    let year = now.getFullYear();
    let q = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 0; i < count; i++) {
      opts.push({
        key: year + '-Q' + q,
        label: 'Q' + q + ' ' + year + ' (' + ['Jan-Mar','Apr-Jun','Jul-Sep','Oct-Dec'][q-1] + ')'
      });
      q--;
      if (q === 0) { q = 4; year--; }
    }
    return opts;
  }

  function getYearOptions(count) {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      opts.push({ key: String(now.getFullYear() - i), label: 'Year ' + (now.getFullYear() - i) });
    }
    return opts;
  }

  // ═══ FORMATTERS ═══
  function formatK(n) {
    n = Number(n) || 0;
    if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Math.round(n);
  }

  function calcNights(a, b) {
    if (!a || !b) return 0;
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
  }

  function changeDisplay(current, previous) {
    if (!previous || Math.abs(previous) < 100) return { text: 'N/A', color: '#999', icon: '' };
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const icon = pct > 5 ? '📈' : pct < -5 ? '📉' : '➡️';
    const color = pct > 5 ? '#0A7D1A' : pct < -5 ? '#DC2626' : '#666';
    const sign = pct > 0 ? '+' : '';
    return { text: sign + pct.toFixed(1) + '%', color, icon };
  }

  function getMonthKeysInRange(range) {
    const keys = [];
    let curr = new Date(new Date(range.from).getFullYear(), new Date(range.from).getMonth(), 1);
    const end = new Date(range.to);
    while (curr <= end) {
      keys.push(curr.toLocaleString('en-IN', {month: 'short', year: 'numeric'}).replace(' ', '-'));
      curr.setMonth(curr.getMonth() + 1);
    }
    return keys;
  }

  // ═══ CONTROL HANDLERS ═══
  window.setV2ViewType = function(type) {
    AN.viewType = type;
    const now = new Date();
    if (type === 'month') AN.periodKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    else if (type === 'quarter') AN.periodKey = now.getFullYear() + '-Q' + (Math.floor(now.getMonth() / 3) + 1);
    else AN.periodKey = String(now.getFullYear());
    AN.compareKey = getPreviousPeriod(AN.viewType, AN.periodKey);
    renderAnalytics();
  };

  window.setV2Period = function(key) {
    AN.periodKey = key;
    AN.compareKey = getPreviousPeriod(AN.viewType, AN.periodKey);
    renderAnalytics();
  };

  window.setV2Compare = function(key) {
    AN.compareKey = key;
    renderAnalytics();
  };

  window.printAnalytics = function() { window.print(); };

  // ═══ MAIN RENDER ═══
  async function renderAnalytics() {
    if (!['developer', 'owner', 'admin'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">Only Owner/Developer/Admin</div></div>', 'analytics');
      return;
    }

    if (!AN.periodKey) initDefaults();

    renderShell('<div class="loading">📊 Crunching business intelligence...</div>', 'analytics');

    const currentRange = getDateRange(AN.viewType, AN.periodKey);
    const compareRange = getDateRange(AN.viewType, AN.compareKey);

    const [currentData, compareData, roomsRes, allExpensesRes, investorLinksRes, paymentsRes] = await Promise.all([
      fetchPeriodData(currentRange),
      fetchPeriodData(compareRange),
      sb.from('rooms').select('room_id, unit_no, nickname, property_name'),
      sb.from('expenses').select('room_id, amount, month'),
      sb.from('investor_properties').select('room_id, share_percent, investors(name, investor_id)'),
      sb.from('payment_history').select('booking_id, amount, payment_date, payment_mode').gte('payment_date', currentRange.from).lte('payment_date', currentRange.to).neq('verification_status', 'rejected')
    ]);

    const rooms = roomsRes.data || [];
    const allExpenses = allExpensesRes.data || [];
    const investorLinks = investorLinksRes.data || [];
    const payments = paymentsRes.data || [];

    const current = calculateMetrics(currentData, rooms, allExpenses, currentRange, payments);
    const compare = calculateMetrics(compareData, rooms, allExpenses, compareRange, []);
    const propPerf = calculatePropertyPerformance(currentData, rooms, allExpenses, investorLinks, currentRange);
    const insights = generateInsights(current, compare, propPerf, currentData, currentRange);
    const cashFlow = calculateCashFlow(currentData, payments, current);

    const html = buildDashboardHTML(current, compare, currentRange, compareRange, propPerf, insights, cashFlow, currentData);
    renderShell(html, 'analytics');
  }

  async function fetchPeriodData(range) {
    const [bkRes, pendingRes] = await Promise.all([
      sb.from('guest_register')
        .select('booking_id, guest_name, phone, room_id, check_in, check_out, total_amount, booking_mode, is_review_booking, show_to_investor, rooms(unit_no, nickname, property_name)')
        .gte('check_in', range.from).lte('check_in', range.to)
        .neq('verification_status', 'rejected'),
      sb.from('guest_register').select('booking_id', { count: 'exact', head: true }).eq('verification_status', 'pending')
    ]);
    return { bookings: bkRes.data || [], pendingCount: pendingRes.count || 0 };
  }

  function calculateMetrics(data, rooms, allExpenses, range, payments) {
    const validBks = data.bookings.filter(b => b.show_to_investor !== false);
    const onlineBks = validBks.filter(b => b.booking_mode === 'Online-Airbnb' && !b.is_review_booking);
    const offlineBks = validBks.filter(b => b.booking_mode !== 'Online-Airbnb' && !b.is_review_booking);
    const reviewBks = validBks.filter(b => b.is_review_booking === true);

    const onlineRev = onlineBks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const offlineRev = offlineBks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const reviewRev = reviewBks.reduce((s, b) => s + (b.total_amount || 0), 0);
    const totalRevenue = onlineRev + offlineRev + reviewRev;

    let totalNights = 0;
    validBks.forEach(b => { totalNights += calcNights(b.check_in, b.check_out); });
    const totalRoomNights = rooms.length * range.days;
    const occupancy = totalRoomNights > 0 ? Math.min(100, (totalNights / totalRoomNights * 100)) : 0;

    // ═══ SMART PRORATION LOGIC ═══
    const isIncomplete = new Date(range.to) > new Date();
    const now = new Date();
    const start = new Date(range.from);
    const daysCompleted = isIncomplete
      ? Math.max(1, Math.min(range.days, Math.floor((now - start) / 86400000) + 1))
      : range.days;

    const monthKeys = getMonthKeysInRange(range);
    const fullExpenses = allExpenses.filter(e => monthKeys.includes(e.month)).reduce((s, e) => s + (e.amount || 0), 0);
    
    // Prorate expenses if period is incomplete (current month/quarter/year)
    const totalExpenses = isIncomplete && range.days > 0
      ? Math.round((fullExpenses / range.days) * daysCompleted)
      : fullExpenses;

    const totalCollected = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0;

    return {
      totalRevenue, onlineRev, offlineRev, reviewRev,
      totalBookings: validBks.length,
      onlineBks: onlineBks.length, offlineBks: offlineBks.length, reviewBks: reviewBks.length,
      occupancy, totalNights, totalRoomNights,
      totalExpenses, netProfit: totalRevenue - totalExpenses,
      fullExpenses, isProrated: isIncomplete, daysCompleted, daysInPeriod: range.days,
      totalCollected, profitMargin,
      avgNights: validBks.length > 0 ? totalNights / validBks.length : 0,
      avgBookingValue: validBks.length > 0 ? totalRevenue / validBks.length : 0
    };
  }

  function calculatePropertyPerformance(data, rooms, allExpenses, investorLinks, range) {
    const monthKeys = getMonthKeysInRange(range);
    // Same proration logic for consistency
    const isIncomplete = new Date(range.to) > new Date();
    const now = new Date();
    const start = new Date(range.from);
    const daysCompleted = isIncomplete
      ? Math.max(1, Math.min(range.days, Math.floor((now - start) / 86400000) + 1))
      : range.days;
    
    return rooms.map(room => {
      const roomBks = data.bookings.filter(b => b.room_id === room.room_id && b.show_to_investor !== false);
      const roomOnline = roomBks.filter(b => b.booking_mode === 'Online-Airbnb' && !b.is_review_booking);
      const roomOffline = roomBks.filter(b => b.booking_mode !== 'Online-Airbnb' && !b.is_review_booking);
      const roomReview = roomBks.filter(b => b.is_review_booking === true);
      const roomOnlineRev = roomOnline.reduce((s, b) => s + (b.total_amount || 0), 0);
      const roomOfflineRev = roomOffline.reduce((s, b) => s + (b.total_amount || 0), 0);
      const roomReviewRev = roomReview.reduce((s, b) => s + (b.total_amount || 0), 0);
      const roomRevenue = roomOnlineRev + roomOfflineRev + roomReviewRev;
      const roomFullExpenses = allExpenses.filter(e => e.room_id === room.room_id && monthKeys.includes(e.month)).reduce((s, e) => s + (e.amount || 0), 0);
      // Apply same proration for property-level analysis
      const roomExpenses = isIncomplete && range.days > 0
        ? Math.round((roomFullExpenses / range.days) * daysCompleted)
        : roomFullExpenses;
      const profit = roomRevenue - roomExpenses;
      const bookedNights = roomBks.reduce((s, b) => s + calcNights(b.check_in, b.check_out), 0);
      const occupancyPct = range.days > 0 ? Math.min(100, (bookedNights / range.days) * 100) : 0;
      const vacantDays = range.days - bookedNights;

      let status;
      if (profit < 0) status = 'CRITICAL';
      else if (profit < 5000 || occupancyPct < 30) status = 'WARNING';
      else if (profit > 10000 && occupancyPct > 60) status = 'HEALTHY';
      else status = 'NEUTRAL';

      const avgOfflineRate = roomOffline.length > 0
        ? Math.round(roomOfflineRev / Math.max(1, roomOffline.reduce((s, b) => s + calcNights(b.check_in, b.check_out), 0)))
        : 3000;

      let recommendation;
      if (profit < 0) {
        const daysNeeded = Math.ceil(Math.abs(profit) / avgOfflineRate);
        recommendation = 'Book ' + daysNeeded + ' more offline days @ ₹' + avgOfflineRate.toLocaleString('en-IN') + ' to break even';
      } else if (occupancyPct < 30) recommendation = 'Low occupancy (' + Math.round(occupancyPct) + '%) — push offline bookings';
      else if (occupancyPct > 80) recommendation = 'High demand — consider raising rates';
      else recommendation = 'Performing well';

      const invLink = investorLinks.find(l => l.room_id === room.room_id);
      const investorName = invLink && invLink.investors ? invLink.investors.name : 'Unassigned';

      return {
        room, status, revenue: roomRevenue, onlineRev: roomOnlineRev, offlineRev: roomOfflineRev, reviewRev: roomReviewRev,
        onlineBks: roomOnline.length, offlineBks: roomOffline.length, reviewBks: roomReview.length,
        expenses: roomExpenses, profit, occupancyPct, bookedNights, vacantDays,
        recommendation, investorName
      };
    }).sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, NEUTRAL: 2, HEALTHY: 3 };
      return order[a.status] - order[b.status] || a.profit - b.profit;
    });
  }

  function generateInsights(current, compare, propPerf, currentData, range) {
    const insights = { critical: [], opportunities: [], wins: [] };
    const critical = propPerf.filter(p => p.status === 'CRITICAL');
    const healthy = propPerf.filter(p => p.status === 'HEALTHY');

    if (critical.length > 0) {
      insights.critical.push({
        icon: '🔴',
        text: critical.length + ' propert' + (critical.length > 1 ? 'ies' : 'y') + ' making losses',
        detail: 'Immediate action needed. Total loss: ₹' + Math.abs(critical.reduce((s, p) => s + p.profit, 0)).toLocaleString('en-IN')
      });
    }

    if (currentData.pendingCount > 0) {
      insights.critical.push({
        icon: '⚠️',
        text: currentData.pendingCount + ' booking' + (currentData.pendingCount > 1 ? 's' : '') + ' pending approval',
        detail: 'Review needed for verification'
      });
    }

    const onlinePct = current.totalRevenue > 0 ? (current.onlineRev / current.totalRevenue * 100) : 0;
    if (onlinePct > 80) {
      insights.opportunities.push({
        icon: '💡',
        text: 'Over-reliance on Airbnb (' + Math.round(onlinePct) + '%)',
        detail: 'Push direct bookings to save ~15% commission'
      });
    }

    const lowOccProperties = propPerf.filter(p => p.occupancyPct < 30 && p.status !== 'HEALTHY');
    if (lowOccProperties.length > 0) {
      insights.opportunities.push({
        icon: '📊',
        text: lowOccProperties.length + ' propert' + (lowOccProperties.length > 1 ? 'ies' : 'y') + ' with <30% occupancy',
        detail: 'Vacancy opportunity: total ' + lowOccProperties.reduce((s, p) => s + p.vacantDays, 0) + ' vacant days'
      });
    }

    if (current.totalRevenue > compare.totalRevenue && compare.totalRevenue > 1000) {
      const growth = ((current.totalRevenue - compare.totalRevenue) / compare.totalRevenue * 100);
      insights.wins.push({
        icon: '🚀',
        text: 'Revenue up ' + growth.toFixed(1) + '% vs previous',
        detail: 'Great momentum — keep it going!'
      });
    }

    healthy.slice(0, 3).forEach(p => {
      if (p.occupancyPct > 80) {
        insights.wins.push({
          icon: '🏆',
          text: (p.room.nickname || p.room.unit_no) + ': ' + Math.round(p.occupancyPct) + '% occupancy',
          detail: 'Star performer — consider premium pricing'
        });
      }
    });

    return insights;
  }

  function calculateCashFlow(currentData, payments, current) {
    const pendingDue = current.totalRevenue - current.totalCollected;
    // Cash Flow uses FULL expenses (actual cash requirement, not prorated)
    const cashOut = current.fullExpenses !== undefined ? current.fullExpenses : current.totalExpenses;
    return {
      cashIn: current.totalCollected,
      cashOut: cashOut,
      netCash: current.totalCollected - cashOut,
      pending: Math.max(0, pendingDue),
      revenueBooked: current.totalRevenue
    };
  }

  // ═══ UI BUILDERS ═══
  function buildDashboardHTML(current, compare, currentRange, compareRange, propPerf, insights, cashFlow, currentData) {
    const monthOpts = getMonthOptions(6);
    const quarterOpts = getQuarterOptions(4);
    const yearOpts = getYearOptions(3);
    const opts = AN.viewType === 'month' ? monthOpts : AN.viewType === 'quarter' ? quarterOpts : yearOpts;

    const isIncomplete = new Date(currentRange.to) > new Date();
    let daysCompleted = currentRange.days;
    if (isIncomplete) {
      const now = new Date();
      const start = new Date(currentRange.from);
      daysCompleted = Math.max(1, Math.min(currentRange.days, Math.floor((now - start) / 86400000) + 1));
    }
    const projected = isIncomplete && daysCompleted > 0 ? (current.totalRevenue / daysCompleted) * currentRange.days : null;

    return '<div class="wrap">' +
      buildFilterCard(opts) +
      buildBusinessHealthCard(current, compare, propPerf) +
      buildInsightsCard(insights) +
      buildComparisonCard(current, compare, currentRange, compareRange, isIncomplete, daysCompleted, projected) +
      buildCashFlowCard(cashFlow, current) +
      buildPropertyPerfCard(propPerf, currentRange) +
      buildTopPropertiesCard(propPerf, currentRange) +
      buildStyles() +
    '</div>';
  }

  function buildStyles() {
    return '<style>@media print{.no-print{display:none!important;}body{background:#fff;}.card{break-inside:avoid;}}</style>';
  }

  function buildFilterCard(opts) {
    const btnStyle = 'margin:0;border-radius:0;padding:8px 14px;';
    return '<div class="card no-print">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
        '<h1 style="margin:0;">📊 Analytics Dashboard</h1>' +
        '<div><button class="btn-sm outline" onclick="renderAnalytics()">🔄 Refresh</button> ' +
        '<button class="btn-sm" onclick="printAnalytics()">🖨️ Print</button></div>' +
      '</div>' +
      '<div style="margin-top:16px;padding:14px;background:#F8F9FA;border-radius:8px;">' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;">' +
          '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:4px;">📊 View By</label>' +
            '<div style="display:inline-flex;background:#fff;border-radius:6px;border:1px solid #ddd;overflow:hidden;">' +
              '<button class="btn-sm ' + (AN.viewType === 'month' ? '' : 'outline') + '" onclick="setV2ViewType(\'month\')" style="' + btnStyle + '">Month</button>' +
              '<button class="btn-sm ' + (AN.viewType === 'quarter' ? '' : 'outline') + '" onclick="setV2ViewType(\'quarter\')" style="' + btnStyle + '">Quarter</button>' +
              '<button class="btn-sm ' + (AN.viewType === 'year' ? '' : 'outline') + '" onclick="setV2ViewType(\'year\')" style="' + btnStyle + '">Year</button>' +
            '</div></div>' +
          '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:4px;">📅 Period</label>' +
            '<select onchange="setV2Period(this.value)" style="padding:8px 12px;border-radius:6px;border:1px solid #ddd;">' +
              opts.map(o => '<option value="' + o.key + '" ' + (o.key === AN.periodKey ? 'selected' : '') + '>' + o.label + '</option>').join('') +
            '</select></div>' +
          '<div><label style="font-size:11px;color:#666;display:block;margin-bottom:4px;">🔄 Compare With</label>' +
            '<select onchange="setV2Compare(this.value)" style="padding:8px 12px;border-radius:6px;border:1px solid #ddd;">' +
              opts.filter(o => o.key !== AN.periodKey).map(o => '<option value="' + o.key + '" ' + (o.key === AN.compareKey ? 'selected' : '') + '>' + o.label + '</option>').join('') +
            '</select></div>' +
        '</div></div></div>';
  }

  function buildBusinessHealthCard(current, compare, propPerf) {
    const critical = propPerf.filter(p => p.status === 'CRITICAL').length;
    const warning = propPerf.filter(p => p.status === 'WARNING').length;
    const healthy = propPerf.filter(p => p.status === 'HEALTHY').length;
    
    let overallHealth, healthColor, healthIcon;
    if (critical > propPerf.length * 0.3) { overallHealth = 'Critical'; healthColor = '#DC2626'; healthIcon = '🔴'; }
    else if (critical > 0 || warning > propPerf.length * 0.4) { overallHealth = 'Needs Attention'; healthColor = '#F59E0B'; healthIcon = '🟡'; }
    else { overallHealth = 'Healthy'; healthColor = '#0A7D1A'; healthIcon = '🟢'; }

    const revGrowth = compare.totalRevenue > 100 ? ((current.totalRevenue - compare.totalRevenue) / compare.totalRevenue * 100) : 0;

    return '<div class="card" style="background:linear-gradient(135deg,' + healthColor + '15,' + healthColor + '05);border-left:5px solid ' + healthColor + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
        '<div><div style="font-size:12px;color:#666;">💼 BUSINESS HEALTH</div>' +
          '<div style="font-size:24px;font-weight:800;color:' + healthColor + ';">' + healthIcon + ' ' + overallHealth + '</div></div>' +
        '<div style="display:flex;gap:20px;flex-wrap:wrap;">' +
          '<div style="text-align:center;"><div style="font-size:11px;color:#666;">Revenue Growth</div><div style="font-size:20px;font-weight:700;color:' + (revGrowth >= 0 ? '#0A7D1A' : '#DC2626') + ';">' + (revGrowth >= 0 ? '📈 +' : '📉 ') + revGrowth.toFixed(1) + '%</div></div>' +
          '<div style="text-align:center;"><div style="font-size:11px;color:#666;">Profit Margin</div><div style="font-size:20px;font-weight:700;color:' + (current.profitMargin >= 0 ? '#0A7D1A' : '#DC2626') + ';">' + current.profitMargin.toFixed(1) + '%</div></div>' +
          '<div style="text-align:center;"><div style="font-size:11px;color:#666;">Occupancy</div><div style="font-size:20px;font-weight:700;color:#3B82F6;">' + Math.round(current.occupancy) + '%</div></div>' +
        '</div>' +
      '</div></div>';
  }

  function buildInsightsCard(insights) {
    if (insights.critical.length === 0 && insights.opportunities.length === 0 && insights.wins.length === 0) {
      return '<div class="card"><div class="section-title">🎯 Smart Insights</div><div style="text-align:center;color:#999;padding:20px;">No insights available yet</div></div>';
    }
    let html = '<div class="card"><div class="section-title">🎯 Smart Insights (Auto-Generated)</div>';
    if (insights.critical.length > 0) {
      html += '<div style="color:#DC2626;font-weight:700;margin-top:8px;">🔴 CRITICAL (' + insights.critical.length + ')</div>';
      insights.critical.forEach(i => {
        html += '<div style="background:#FEF2F2;border-left:3px solid #DC2626;padding:10px;margin:6px 0;border-radius:4px;">' +
          '<div style="font-weight:600;font-size:13px;">' + i.icon + ' ' + i.text + '</div>' +
          '<div style="font-size:11px;color:#666;">' + i.detail + '</div></div>';
      });
    }
    if (insights.opportunities.length > 0) {
      html += '<div style="color:#F59E0B;font-weight:700;margin-top:12px;">💡 OPPORTUNITIES (' + insights.opportunities.length + ')</div>';
      insights.opportunities.forEach(i => {
        html += '<div style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:10px;margin:6px 0;border-radius:4px;">' +
          '<div style="font-weight:600;font-size:13px;">' + i.icon + ' ' + i.text + '</div>' +
          '<div style="font-size:11px;color:#666;">' + i.detail + '</div></div>';
      });
    }
    if (insights.wins.length > 0) {
      html += '<div style="color:#0A7D1A;font-weight:700;margin-top:12px;">⭐ WINS (' + insights.wins.length + ')</div>';
      insights.wins.forEach(i => {
        html += '<div style="background:#F0FDF4;border-left:3px solid #22C55E;padding:10px;margin:6px 0;border-radius:4px;">' +
          '<div style="font-weight:600;font-size:13px;">' + i.icon + ' ' + i.text + '</div>' +
          '<div style="font-size:11px;color:#666;">' + i.detail + '</div></div>';
      });
    }
    html += '</div>';
    return html;
  }

  function buildComparisonCard(current, compare, currentRange, compareRange, isIncomplete, daysCompleted, projected) {
    return '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
        '<div><div style="font-size:18px;font-weight:700;color:#333;">📊 ' + currentRange.label + '</div>' +
        '<div style="font-size:12px;color:#666;">vs ' + compareRange.label + '</div></div>' +
        (isIncomplete ? '<div style="background:#FFF7E6;border:1px solid #F59E0B;padding:6px 12px;border-radius:6px;font-size:12px;color:#F59E0B;">⏳ ' + daysCompleted + '/' + currentRange.days + ' days • Projected: ' + (projected ? formatK(projected) : 'N/A') + ' • <strong>Expenses prorated</strong></div>' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' +
        metricCard('💰 Total Revenue', current.totalRevenue, compare.totalRevenue, '#FF385C') +
        metricCardWithProration('💸 Total Expenses', current.totalExpenses, compare.totalExpenses, '#DC2626', current.isProrated, current.fullExpenses, current.daysCompleted, current.daysInPeriod) +
        metricCard('📈 Net Profit', current.netProfit, compare.netProfit, current.netProfit >= 0 ? '#0A7D1A' : '#DC2626') +
        metricCard('🌐 Online (Airbnb)', current.onlineRev, compare.onlineRev, '#8B5CF6') +
        metricCard('🏠 Offline (Direct)', current.offlineRev, compare.offlineRev, '#F59E0B') +
        occupancyCard(current.occupancy, compare.occupancy, current.totalNights, current.totalRoomNights) +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:12px;">' +
        statBox('📅 Bookings', current.totalBookings, 'vs ' + compare.totalBookings) +
        statBox('🌙 Avg Nights', current.avgNights.toFixed(1), 'per booking') +
        statBox('💵 Avg Value', formatK(current.avgBookingValue), '') +
        statBox('⭐ Review', current.reviewBks, formatK(current.reviewRev), '#722ED1') +
      '</div>' +
    '</div>';
  }

  function statBox(label, value, sub, color) {
    return '<div style="padding:10px;background:#F8F9FA;border-radius:6px;text-align:center;">' +
      '<div style="font-size:11px;color:#666;">' + label + '</div>' +
      '<div style="font-size:18px;font-weight:700;color:' + (color || '#333') + ';">' + value + '</div>' +
      (sub ? '<div style="font-size:10px;color:#888;">' + sub + '</div>' : '') +
    '</div>';
  }

  function metricCard(label, current, previous, color) {
    const change = changeDisplay(current, previous);
    return '<div style="padding:14px;background:#fff;border:1px solid #eee;border-left:4px solid ' + color + ';border-radius:8px;">' +
      '<div style="font-size:11px;color:#666;margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:22px;font-weight:800;color:' + color + ';">' + formatK(current) + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:4px;">vs ' + formatK(previous) + ' <span style="color:' + change.color + ';font-weight:600;">' + change.icon + ' ' + change.text + '</span></div>' +
    '</div>';
  }

  function occupancyCard(current, previous, nights, roomNights) {
    const change = changeDisplay(current, previous);
    return '<div style="padding:14px;background:#fff;border:1px solid #eee;border-left:4px solid #3B82F6;border-radius:8px;">' +
      '<div style="font-size:11px;color:#666;margin-bottom:4px;">📊 Occupancy</div>' +
      '<div style="font-size:22px;font-weight:800;color:#3B82F6;">' + Math.round(current) + '%</div>' +
      '<div style="font-size:11px;color:#888;margin-top:4px;">vs ' + Math.round(previous) + '% <span style="color:' + change.color + ';font-weight:600;">' + change.icon + ' ' + change.text + '</span></div>' +
      '<div style="font-size:10px;color:#999;margin-top:2px;">' + nights + '/' + roomNights + ' room-nights</div>' +
    '</div>';
  }

  function buildCashFlowCard(cashFlow, current) {
    return '<div class="card"><div class="section-title">💰 Cash Flow</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">' +
        '<div style="padding:14px;background:#F0FDF4;border-radius:8px;border-left:4px solid #22C55E;">' +
          '<div style="font-size:11px;color:#666;">💵 Cash IN (Collected)</div>' +
          '<div style="font-size:20px;font-weight:800;color:#0A7D1A;">' + formatK(cashFlow.cashIn) + '</div>' +
        '</div>' +
        '<div style="padding:14px;background:#FEF2F2;border-radius:8px;border-left:4px solid #DC2626;">' +
          '<div style="font-size:11px;color:#666;">💸 Cash OUT (Expenses)</div>' +
          '<div style="font-size:20px;font-weight:800;color:#DC2626;">' + formatK(cashFlow.cashOut) + '</div>' +
        '</div>' +
        '<div style="padding:14px;background:' + (cashFlow.netCash >= 0 ? '#F0FDF4' : '#FEF2F2') + ';border-radius:8px;border-left:4px solid ' + (cashFlow.netCash >= 0 ? '#22C55E' : '#DC2626') + ';">' +
          '<div style="font-size:11px;color:#666;">📊 Net Cash Flow</div>' +
          '<div style="font-size:20px;font-weight:800;color:' + (cashFlow.netCash >= 0 ? '#0A7D1A' : '#DC2626') + ';">' + formatK(cashFlow.netCash) + '</div>' +
        '</div>' +
        '<div style="padding:14px;background:#FFF7E6;border-radius:8px;border-left:4px solid #F59E0B;">' +
          '<div style="font-size:11px;color:#666;">⏳ Pending Collection</div>' +
          '<div style="font-size:20px;font-weight:800;color:#F59E0B;">' + formatK(cashFlow.pending) + '</div>' +
        '</div>' +
      '</div></div>';
  }

  function buildPropertyPerfCard(propPerf, range) {
    const critical = propPerf.filter(p => p.status === 'CRITICAL');
    const warning = propPerf.filter(p => p.status === 'WARNING');
    const healthy = propPerf.filter(p => p.status === 'HEALTHY');
    const neutral = propPerf.filter(p => p.status === 'NEUTRAL');

    let html = '<div class="card"><div class="section-title">🏠 Property Performance — ' + range.label + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;">' +
        '<div style="background:#FEF2F2;border:2px solid #DC2626;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#DC2626;">' + critical.length + '</div><div style="font-size:11px;color:#666;">🔴 Loss Making</div></div>' +
        '<div style="background:#FFFBEB;border:2px solid #F59E0B;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#F59E0B;">' + warning.length + '</div><div style="font-size:11px;color:#666;">🟡 Warning</div></div>' +
        '<div style="background:#F0FDF4;border:2px solid #22C55E;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#0A7D1A;">' + healthy.length + '</div><div style="font-size:11px;color:#666;">🟢 Healthy</div></div>' +
        '<div style="background:#F5F5F5;border:2px solid #999;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#666;">' + neutral.length + '</div><div style="font-size:11px;color:#666;">⚪ Neutral</div></div>' +
      '</div>';

    if (critical.length > 0) {
      html += '<div style="font-weight:700;color:#DC2626;margin:16px 0 8px;font-size:14px;">🚨 CRITICAL — Immediate Action (' + critical.length + ')</div>';
      html += critical.map(p =>
        '<div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:10px;padding:16px;margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">' +
            '<div><div style="font-weight:700;font-size:16px;color:#DC2626;">🔴 ' + (p.room.nickname || p.room.unit_no) + '</div>' +
            '<div style="font-size:12px;color:#666;">👤 ' + p.investorName + '</div></div>' +
            '<div style="text-align:right;"><div style="font-size:20px;font-weight:800;color:#DC2626;">LOSS: -₹' + Math.abs(p.profit).toLocaleString('en-IN') + '</div>' +
            '<div style="font-size:11px;color:#666;">Occ: ' + Math.round(p.occupancyPct) + '% | Vacant: ' + p.vacantDays + 'd</div></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;font-size:12px;margin-bottom:10px;">' +
            '<div style="background:#fff;padding:8px;border-radius:6px;"><div style="color:#666;font-size:10px;">Revenue</div><div style="font-weight:700;">₹' + p.revenue.toLocaleString('en-IN') + '</div><div style="font-size:10px;color:#888;">🌐' + p.onlineBks + ' 🏠' + p.offlineBks + ' ⭐' + p.reviewBks + '</div></div>' +
            '<div style="background:#fff;padding:8px;border-radius:6px;"><div style="color:#666;font-size:10px;">Expenses</div><div style="font-weight:700;color:#DC2626;">₹' + p.expenses.toLocaleString('en-IN') + '</div></div>' +
          '</div>' +
          '<div style="background:#FFF7E6;padding:10px;border-left:3px solid #F59E0B;border-radius:4px;font-size:12px;"><strong>💡 ACTION:</strong> ' + p.recommendation + '</div>' +
        '</div>'
      ).join('');
    }

    if (warning.length > 0) {
      html += '<div style="font-weight:700;color:#F59E0B;margin:16px 0 8px;font-size:14px;">⚠️ WARNING (' + warning.length + ')</div>';
      html += warning.map(p =>
        '<div style="background:#FFFBEB;border:1px solid #F59E0B;border-radius:8px;padding:12px;margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
            '<div><strong style="color:#F59E0B;">🟡 ' + (p.room.nickname || p.room.unit_no) + '</strong>' +
            '<span style="font-size:11px;color:#666;margin-left:8px;">👤 ' + p.investorName + '</span></div>' +
            '<div style="font-size:13px;">Rev: <strong>₹' + p.revenue.toLocaleString('en-IN') + '</strong> | Profit: <strong style="color:' + (p.profit < 0 ? '#DC2626' : '#F59E0B') + ';">₹' + p.profit.toLocaleString('en-IN') + '</strong> | Occ: <strong>' + Math.round(p.occupancyPct) + '%</strong></div>' +
          '</div>' +
          '<div style="font-size:11px;color:#666;margin-top:4px;font-style:italic;">💡 ' + p.recommendation + '</div>' +
        '</div>'
      ).join('');
    }

    if (healthy.length > 0) {
      html += '<div style="font-weight:700;color:#0A7D1A;margin:16px 0 8px;font-size:14px;">🏆 TOP PERFORMERS (Top 5)</div>';
      html += healthy.slice(0, 5).map((p, i) =>
        '<div style="background:#F0FDF4;border:1px solid #22C55E;border-radius:8px;padding:10px;margin-bottom:6px;">' +
          '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
            '<div><strong>' + (i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🟢') + ' ' + (p.room.nickname || p.room.unit_no) + '</strong>' +
            '<span style="font-size:11px;color:#666;margin-left:6px;">👤 ' + p.investorName + '</span></div>' +
            '<div style="font-size:13px;"><strong style="color:#0A7D1A;">₹' + p.profit.toLocaleString('en-IN') + '</strong> profit | <strong>' + Math.round(p.occupancyPct) + '%</strong> occ</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    html += '</div>';
    return html;
  }

  function buildTopPropertiesCard(propPerf, range) {
    const sorted = [...propPerf].sort((a, b) => b.revenue - a.revenue);
    const maxRev = Math.max(...sorted.map(p => p.revenue), 1);
    return '<div class="card"><div class="section-title">📊 Revenue Breakdown — ' + range.label + '</div>' +
      sorted.map(p => {
        const onlinePct = p.revenue > 0 ? (p.onlineRev / p.revenue * 100) : 0;
        const offlinePct = p.revenue > 0 ? (p.offlineRev / p.revenue * 100) : 0;
        const totalPct = (p.revenue / maxRev * 100);
        return '<div style="padding:10px 0;border-bottom:1px solid #eee;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
            '<strong>' + (p.room.nickname || p.room.unit_no) + '</strong>' +
            '<span style="font-weight:700;">' + formatK(p.revenue) + '</span></div>' +
          '<div style="display:flex;height:8px;background:#F5F5F5;border-radius:4px;overflow:hidden;">' +
            '<div style="background:#FF385C;width:' + (totalPct * onlinePct / 100) + '%;"></div>' +
            '<div style="background:#F59E0B;width:' + (totalPct * offlinePct / 100) + '%;"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-top:3px;">' +
            '<span>🌐 ' + formatK(p.onlineRev) + ' (' + p.onlineBks + ')</span>' +
            '<span>🏠 ' + formatK(p.offlineRev) + ' (' + p.offlineBks + ')</span>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  window.renderAnalytics = renderAnalytics;
})();
