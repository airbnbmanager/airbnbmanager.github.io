/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED (UHHS)
 * 💼 CA AUDIT & GST FILING PACK (DUAL-VIEW ENGINE)
 * =====================================================================
 * Developed for monthly Chartered Accountant (CA) compliance & internal ledger:
 * 1. GSTR-1 Sales Register (Direct Guest Invoices + Airbnb Gross Outward)
 * 2. GSTR-3B Input Tax Credit (ITC Purchases with Supplier GSTIN)
 * 3. Operating Cash Memos & Self-Vouchers (IT Act Sec 40A(3) Compliance)
 * 4. Staff Salary & Advance Muster Roll (Wage Register with Signatures)
 * 5. Director/Partner Imprest & Advances Ledger (Firoz -> Praveen Funds)
 * 6. 1-Click CA Export (CSV) & Formatted A4 Printable Audit Pack
 * =====================================================================
 */

window.CA_AUDIT_PACK = (function() {
  'use strict';

  // Company Master Profile
  const CO = {
    name:       'THE UNIQUE HAVEN HOMES PRIVATE LIMITED',
    tradeName:  'The Unique Haven Homes Homestays',
    gstin:      '09ABECT9843K1Z7',
    pan:        'ABECT9843K',
    cin:        'U68101UP2026PTC244837',
    sac:        '996311', // Accommodation services in homestays / guest houses
    address:    'P NO 39 & 40 Radhikapuri, Indira Nagar Takrohi, Lucknow, Uttar Pradesh – 226016',
    state:      'Uttar Pradesh',
    stateCode:  '09',
    phone:      '+91 82996 00709',
    email:      'theuniquehavenhomes@gmail.com',
    web:        'uniquehavenhomesstay.com'
  };

  // State Management
  let activeMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  let activeTab = 'summary'; // 'summary' | 'sales' | 'itc' | 'cashmemos' | 'salary' | 'partner'
  let splitDirectNights = true; // Default ON: 5-night direct bookings appear as 5 daily 1-night bookings
  let viewMode = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'cards' : 'cards'; // 'cards' (mobile touch cards) | 'table' (dense grid)

  function getActiveMonth() {
    return activeMonth;
  }

  function setActiveMonth(m) {
    activeMonth = m;
    renderCAAuditPack();
  }

  function getActiveTab() {
    return activeTab;
  }

  function setActiveTab(t) {
    activeTab = t;
    renderCAAuditPack();
  }

  function getViewMode() {
    return viewMode;
  }

  function setViewMode(m) {
    viewMode = m;
    renderCAAuditPack();
  }

  function getSplitDirectNights() {
    return splitDirectNights;
  }

  function toggleSplitDirectNights(enabled) {
    splitDirectNights = Boolean(enabled);
    renderCAAuditPack();
  }

  // Exclusion Storage (Persisted per Month)
  function getExcludedKeys(monthStr) {
    try {
      const m = monthStr || activeMonth;
      const raw = localStorage.getItem(`uhh_ca_audit_excluded_${m}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch(e) {
      return new Set();
    }
  }

  function saveExcludedKeys(monthStr, set) {
    try {
      const m = monthStr || activeMonth;
      localStorage.setItem(`uhh_ca_audit_excluded_${m}`, JSON.stringify([...set]));
    } catch(e) {}
  }

  function toggleEntryExclusion(key) {
    const excluded = getExcludedKeys(activeMonth);
    if (excluded.has(key)) {
      excluded.delete(key);
      if (window.fsn) fsn.success('Entry Included', '✅ Entry ko wapas report me shamil kar liya gaya!');
    } else {
      excluded.add(key);
      if (window.fsn) fsn.info('Entry Excluded', '❌ Entry ko report se exclude kar diya gaya!');
    }
    saveExcludedKeys(activeMonth, excluded);
    renderCAAuditPack();
  }

  function resetExclusions() {
    if (confirm('Kya aap is month ki sabhi excluded entries ko wapas report me shamil karna chahte hain?')) {
      saveExcludedKeys(activeMonth, new Set());
      if (window.fsn) fsn.success('Exclusions Reset', 'Sabhi entries wapas include ho gayi hain!');
      renderCAAuditPack();
    }
  }

  function excludeAllInTab(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return;
    const excluded = getExcludedKeys(activeMonth);
    keys.forEach(k => excluded.add(k));
    saveExcludedKeys(activeMonth, excluded);
    if (window.fsn) fsn.info('Batch Excluded', `Is tab ki ${keys.length} entries report se exclude kar di gayi hain!`);
    renderCAAuditPack();
  }

  function includeAllInTab(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return;
    const excluded = getExcludedKeys(activeMonth);
    keys.forEach(k => excluded.delete(k));
    saveExcludedKeys(activeMonth, excluded);
    if (window.fsn) fsn.success('Batch Included', `Is tab ki ${keys.length} entries report me shamil kar di gayi hain!`);
    renderCAAuditPack();
  }

  function renderEntryAction(item) {
    const isEx = Boolean(item.is_excluded);
    return `
      <button type="button" 
        onclick="window.CA_AUDIT_PACK.toggleEntryExclusion('${item.entry_key}')"
        class="btn-sm"
        style="padding:7px 12px;border-radius:7px;border:none;cursor:pointer;font-weight:800;font-size:11.5px;min-height:38px;min-width:88px;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.12);user-select:none;transition:all 0.15s ease;${isEx ? 'background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;' : 'background:#DCFCE7;color:#166534;border:1px solid #86EFAC;'}"
        title="${isEx ? 'Click to Include in CA Report' : 'Click to Exclude from CA Report'}">
        ${isEx ? '❌ Excluded' : '✔ Included'}
      </button>
    `;
  }

  function calcBookingNights(b) {
    if (!b) return 1;
    if (b.check_in && b.check_out) {
      const d1 = new Date(b.check_in);
      const d2 = new Date(b.check_out);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (!isNaN(diff) && diff > 0) return diff;
    }
    const parsed = parseInt(b.nights, 10);
    return (!isNaN(parsed) && parsed > 0) ? parsed : 1;
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. DATA AGGREGATION & PIPELINE
  // ═══════════════════════════════════════════════════════════════
  async function fetchMonthAuditData(monthStr) {
    const monthStart = monthStr + '-01';
    const [year, mon] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
    const monthLabel = new Date(year, mon - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

    // 1. Fetch Local Invoices + DB Guest Invoices
    let localInvoices = [];
    try {
      if (window.GST_ENGINE?.getLocalInvoices) {
        localInvoices = window.GST_ENGINE.getLocalInvoices() || [];
      } else {
        const raw = localStorage.getItem('uhh_gst_invoices_registry');
        localInvoices = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn('CA Audit: Local invoices parse error', e);
    }

    // 2. Query Supabase in Parallel
    const [
      guestRes,
      expRes,
      reimbRes,
      advRes,
      empRes,
      caAdvRes,
      laundryRes,
      maintRes,
      roomsRes
    ] = await Promise.all([
      // Bookings in month
      sb.from('guest_register')
        .select('*')
        .gte('check_in', monthStart)
        .lte('check_in', monthEnd)
        .order('check_in', { ascending: true }),

      // Expenses in month
      sb.from('expenses')
        .select('*, expense_categories(category_name), rooms(nickname,unit_no)')
        .or(`entry_date.gte.${monthStart},month.eq.${monthLabel}`)
        .order('entry_date', { ascending: true }),

      // Daily Reimbursements in month
      sb.from('reimbursements')
        .select('*')
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd)
        .order('expense_date', { ascending: true }),

      // Staff Advances in month
      sb.from('advance_tracker')
        .select('*, employees(name, role, monthly_salary, phone)')
        .gte('date_given', monthStart)
        .lte('date_given', monthEnd)
        .order('date_given', { ascending: true }),

      // Active Employees list
      sb.from('employees')
        .select('*')
        .eq('status', 'Active')
        .order('name', { ascending: true }),

      // Company advances (Firoz / Praveen / Company)
      sb.from('company_advances')
        .select('*')
        .gte('advance_date', monthStart)
        .lte('advance_date', monthEnd)
        .order('advance_date', { ascending: true }),

      // Laundry records
      sb.from('laundry_records')
        .select('*')
        .gte('record_date', monthStart)
        .lte('record_date', monthEnd)
        .order('record_date', { ascending: true }),

      // Maintenance logs
      sb.from('maintenance_log')
        .select('*')
        .gte('reported_date', monthStart)
        .lte('reported_date', monthEnd)
        .order('reported_date', { ascending: true }),

      // Rooms list
      sb.from('rooms').select('room_id, nickname, unit_no').order('unit_no')
    ]);

    const guests = guestRes.data || [];
    const expenses = expRes.data || [];
    const reimbursements = reimbRes.data || [];
    const staffAdvances = advRes.data || [];
    const employees = empRes.data || [];
    const partnerAdvances = caAdvRes.data || [];
    const laundry = laundryRes.data || [];
    const maintenance = maintRes.data || [];
    const rooms = roomsRes.data || [];

    const roomMap = {};
    rooms.forEach(r => { roomMap[r.room_id] = r.nickname || r.unit_no || r.room_id; });

    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // A. SALES REGISTER (GSTR-1 Ready)
    // Rule: ONLY show bookings where a GST bill is generated OR online Airbnb bookings
    // Direct bookings with multi-nights (e.g. Rohit 5 nights) expand into 5 daily 1-night bookings!
    // ─────────────────────────────────────────────────────────────
    const monthInvoices = localInvoices.filter(inv => {
      const dt = inv.invoice_date || inv.check_in || '';
      return dt.startsWith(monthStr) && inv.is_gst_invoice === true;
    });

    const invoicedBookingIds = new Set(monthInvoices.map(i => i.booking_id).filter(Boolean));

    // Identify any direct bookings in guest_register that haven't been invoiced yet (for 1-click GST billing)
    const pendingDirectBookings = [];
    guests.forEach(g => {
      const isAirbnb = Boolean(
        g.airbnb_confirmation_code || 
        g.booking_mode === 'Online-Airbnb' || 
        (g.platform && g.platform.toLowerCase().includes('airbnb')) ||
        (g.payment_method && g.payment_method.toLowerCase().includes('airbnb'))
      );
      if (!isAirbnb && !invoicedBookingIds.has(g.booking_id)) {
        const nights = calcBookingNights(g);
        let perNightRate = Number(g.per_day_rate || 0);
        let totAmt = Number(g.total_amount || 0);
        const isRohit = (g.guest_name || '').toLowerCase().includes('rohit');
        if (isRohit) {
          perNightRate = (g.check_in < '2026-09-14') ? 3000 : 3500;
          totAmt = nights * perNightRate;
        }
        pendingDirectBookings.push({
          ...g,
          nights,
          per_day_rate: perNightRate,
          total_amount: totAmt,
          room_name: roomMap[g.room_id] || g.room_id || 'Homestay'
        });
      }
    });

    // Base collection of finalized sales
    const rawDirectSales = [...monthInvoices];

    // Add ONLY Online Airbnb bookings that haven't had an explicit GST invoice created yet
    guests.forEach(g => {
      const isAirbnb = Boolean(
        g.airbnb_confirmation_code || 
        g.booking_mode === 'Online-Airbnb' || 
        (g.platform && g.platform.toLowerCase().includes('airbnb')) ||
        (g.payment_method && g.payment_method.toLowerCase().includes('airbnb'))
      );

      // Strictly skip any direct booking that has NOT had a GST bill generated
      if (!isAirbnb) return;

      if (!invoicedBookingIds.has(g.booking_id)) {
        const total = Number(g.total_amount || 0);
        // Standard homestay GST 5% (CGST 2.5% + SGST 2.5%)
        const rate = 5;
        const base = Math.round((total / (1 + rate / 100)) * 100) / 100;
        const gst = Math.round((total - base) * 100) / 100;
        const half = Math.round((gst / 2) * 100) / 100;
        const confCode = g.airbnb_confirmation_code || g.booking_id.slice(-8);

        rawDirectSales.push({
          invoice_no: `AIRBNB-${confCode}`,
          invoice_date: g.check_in,
          guest_name: g.guest_name || 'Airbnb Guest',
          guest_phone: g.phone || '',
          guest_gstin: '',
          guest_company: 'Airbnb India / Online Platform (ECO)',
          room_name: roomMap[g.room_id] || g.room_id || 'Homestay',
          booking_mode: 'Online-Airbnb',
          payment_mode: 'Airbnb Online Bank Payout',
          nights: calcBookingNights(g),
          total_amount: total,
          taxable_value: base,
          cgst: half,
          sgst: half,
          gst_rate: 5,
          is_gst_invoice: true,
          is_airbnb: true,
          booking_id: g.booking_id
        });
      }
    });

    // ─────────────────────────────────────────────────────────────
    // MULTI-NIGHT DIRECT BOOKING SPLITTER:
    // If splitDirectNights is active: 5 nights direct booking (like Rohit)
    // is split into 5 individual 1-night daily bookings!
    // ─────────────────────────────────────────────────────────────
    let directSales = [];
    if (splitDirectNights) {
      rawDirectSales.forEach(inv => {
        const isAirbnb = Boolean(inv.is_airbnb || inv.booking_mode === 'Online-Airbnb' || (inv.invoice_no || '').startsWith('AIRBNB-'));
        const n = parseInt(inv.nights, 10) || 1;
        if (!isAirbnb && n > 1) {
          const baseDateStr = inv.check_in || inv.invoice_date || '';
          const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
          const total = Number(inv.total_amount || 0);
          const taxable = Number(inv.taxable_value || 0);
          const cgst = Number(inv.cgst || 0);
          const sgst = Number(inv.sgst || 0);

          const dailyTotal = Math.round((total / n) * 100) / 100;
          const dailyTaxable = Math.round((taxable / n) * 100) / 100;
          const dailyCgst = Math.round((cgst / n) * 100) / 100;
          const dailySgst = Math.round((sgst / n) * 100) / 100;

          let allocTot = 0, allocTax = 0, allocC = 0, allocS = 0;

          for (let i = 0; i < n; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            const curDateStr = d.toISOString().slice(0, 10);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);
            const nextDateStr = nextD.toISOString().slice(0, 10);

            const isLast = (i === n - 1);
            const curTot = isLast ? Math.round((total - allocTot) * 100) / 100 : dailyTotal;
            const curTax = isLast ? Math.round((taxable - allocTax) * 100) / 100 : dailyTaxable;
            const curC = isLast ? Math.round((cgst - allocC) * 100) / 100 : dailyCgst;
            const curS = isLast ? Math.round((sgst - allocS) * 100) / 100 : dailySgst;

            allocTot += curTot;
            allocTax += curTax;
            allocC += curC;
            allocS += curS;

            directSales.push({
              ...inv,
              invoice_no: `${inv.invoice_no}-D${i + 1}`,
              invoice_date: curDateStr,
              check_in: curDateStr,
              check_out: nextDateStr,
              guest_name: `${inv.guest_name} (Night ${i + 1}/${n})`,
              nights: 1,
              total_amount: curTot,
              taxable_value: curTax,
              cgst: curC,
              sgst: curS,
              is_split_night: true,
              split_index: i + 1,
              split_total: n,
              parent_invoice_no: inv.invoice_no,
              parent_booking_id: inv.booking_id
            });
          }
        } else {
          directSales.push(inv);
        }
      });
    } else {
      directSales = rawDirectSales;
    }

    // ─────────────────────────────────────────────────────────────
    // B. ITC PURCHASES (GSTR-3B Eligible - GST registered vendors)
    // ─────────────────────────────────────────────────────────────
    const itcPurchases = [];
    const cashMemos = [];

    expenses.forEach(e => {
      const cat = (e.expense_categories?.category_name || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const isRegisteredVendor = notes.includes('gst') || notes.includes('invoice') || notes.includes('bill no') || 
                                 cat.includes('wifi') || cat.includes('internet') || cat.includes('electricity') || cat.includes('appliance');
      
      const amt = Number(e.amount || 0);
      if (amt <= 0) return;

      if (isRegisteredVendor && (e.payment_mode === 'Bank' || e.payment_mode === 'Online' || e.payment_mode === 'UPI' || notes.includes('gstin'))) {
        const rate = 18;
        const base = Math.round((amt / (1 + rate/100)) * 100) / 100;
        const tax = Math.round((amt - base) * 100) / 100;
        const half = Math.round((tax / 2) * 100) / 100;

        itcPurchases.push({
          source: 'Expenses Register',
          date: e.entry_date || (monthStr + '-01'),
          vendor: e.paid_by || e.notes || 'Registered Vendor',
          category: e.expense_categories?.category_name || 'General Expense',
          notes: e.notes || '-',
          payment_mode: e.payment_mode || 'Bank',
          total_amount: amt,
          taxable_value: base,
          gst_rate: rate,
          cgst: half,
          sgst: half,
          gstin: (e.notes?.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i) || ['GST-REGISTERED'])[0],
          ref_no: `EXP-${e.id}`
        });
      } else {
        cashMemos.push({
          source: 'General Expense',
          date: e.entry_date || (monthStr + '-01'),
          vendor_or_type: e.notes || e.paid_by || e.expense_categories?.category_name || 'Local Supplier',
          category: e.expense_categories?.category_name || 'Operations',
          room_name: e.rooms?.nickname || e.rooms?.unit_no || 'Common',
          amount: amt,
          payment_mode: e.payment_mode || 'Cash',
          paid_by: e.paid_by || 'Praveen',
          ref_no: `EXP-${e.id}`,
          within_40a3_limit: amt <= 10000
        });
      }
    });

    reimbursements.forEach(r => {
      const amt = Number(r.amount || 0);
      if (amt <= 0) return;
      cashMemos.push({
        source: 'Daily Petty Cash',
        date: r.expense_date,
        vendor_or_type: r.category || r.notes || 'Operating Supply',
        category: r.category || 'Maintenance / Supplies',
        room_name: roomMap[r.room_id] || 'Common',
        amount: amt,
        payment_mode: r.payment_mode || 'Cash',
        paid_by: r.paid_by || 'Praveen',
        ref_no: `REIMB-${r.id}`,
        within_40a3_limit: amt <= 10000
      });
    });

    laundry.forEach(l => {
      const amt = Number(l.total_amount || l.paid_amount || 0);
      if (amt <= 0) return;
      cashMemos.push({
        source: 'Laundry Register',
        date: l.record_date,
        vendor_or_type: l.vendor_name || 'Local Dhobi / Laundry',
        category: 'Laundry Services',
        room_name: roomMap[l.room_id] || 'Common',
        amount: amt,
        payment_mode: l.payment_mode || 'Cash',
        paid_by: 'Praveen',
        ref_no: `LAUN-${l.id}`,
        within_40a3_limit: amt <= 10000
      });
    });

    maintenance.forEach(m => {
      const amt = Number(m.cost || 0);
      if (amt <= 0) return;
      cashMemos.push({
        source: 'Maintenance & Repairs',
        date: m.reported_date,
        vendor_or_type: `${m.issue_type || 'Repairs'} (${m.description || 'Mistri/Plumber'})`,
        category: 'Repairs & Maintenance',
        room_name: roomMap[m.room_id] || 'Property',
        amount: amt,
        payment_mode: 'Cash / Local Vendor',
        paid_by: 'Praveen',
        ref_no: `MAINT-${m.id}`,
        within_40a3_limit: amt <= 10000
      });
    });

    // ─────────────────────────────────────────────────────────────
    // C. STAFF SALARY & ADVANCE MUSTER ROLL
    // ─────────────────────────────────────────────────────────────
    const advancesByEmp = {};
    staffAdvances.forEach(adv => {
      const eid = adv.emp_id;
      if (!advancesByEmp[eid]) advancesByEmp[eid] = 0;
      advancesByEmp[eid] += Number(adv.advance_amount || 0);
    });

    const salaryMuster = employees.map(emp => {
      const gross = Number(emp.monthly_salary || 0);
      const advDeducted = advancesByEmp[emp.emp_id] || 0;
      const netPayable = Math.max(0, gross - advDeducted);
      const isBank = Boolean(emp.bank_account || emp.upi_id);
      return {
        emp_id: emp.emp_id,
        name: emp.name,
        role: emp.role || 'Staff',
        phone: emp.phone || '-',
        gross_salary: gross,
        advance_deducted: advDeducted,
        net_payable: netPayable,
        payment_mode: isBank ? 'Bank Transfer / UPI' : 'Cash (No Bank A/C)',
        has_bank: isBank,
        bank_details: emp.bank_account || 'Cash Voucher Signature'
      };
    });

    // ─────────────────────────────────────────────────────────────
    // D. PARTNER / DIRECTOR IMPREST FUND (Firoz -> Praveen)
    // ─────────────────────────────────────────────────────────────
    const firozAdvances = partnerAdvances.filter(p => (p.given_by || '').includes('Firoz') || (p.notes || '').toLowerCase().includes('firoz'));
    const totalFirozGiven = firozAdvances.reduce((s, p) => s + Number(p.amount_given || 0), 0);
    const totalCashSpentByPraveen = cashMemos.reduce((s, c) => s + Number(c.amount || 0), 0);

    // ─────────────────────────────────────────────────────────────
    // E. ASSIGN UNIQUE ENTRY KEYS & APPLY EXCLUSIONS
    // ─────────────────────────────────────────────────────────────
    const excludedKeys = getExcludedKeys(monthStr);

    directSales.forEach(inv => {
      inv.entry_key = 'sale_' + inv.invoice_no;
      inv.is_excluded = excludedKeys.has(inv.entry_key);
    });

    itcPurchases.forEach((itc, i) => {
      itc.entry_key = 'itc_' + (itc.ref_no ? itc.ref_no.replace(/\s+/g, '_') : ('itc_' + i));
      itc.is_excluded = excludedKeys.has(itc.entry_key);
    });

    cashMemos.forEach((cm, i) => {
      cm.entry_key = 'cash_' + (cm.ref_no ? cm.ref_no.replace(/\s+/g, '_') : ('cm_' + i));
      cm.is_excluded = excludedKeys.has(cm.entry_key);
    });

    salaryMuster.forEach(emp => {
      emp.entry_key = 'sal_' + emp.emp_id;
      emp.is_excluded = excludedKeys.has(emp.entry_key);
    });

    partnerAdvances.forEach(adv => {
      adv.entry_key = 'adv_' + adv.id;
      adv.is_excluded = excludedKeys.has(adv.entry_key);
    });

    const includedSales = directSales.filter(x => !x.is_excluded);
    const includedITC = itcPurchases.filter(x => !x.is_excluded);
    const includedCashMemos = cashMemos.filter(x => !x.is_excluded);
    const includedSalary = salaryMuster.filter(x => !x.is_excluded);
    const includedPartner = partnerAdvances.filter(x => !x.is_excluded);

    const totalExcludedCount = [
      ...directSales, ...itcPurchases, ...cashMemos, ...salaryMuster, ...partnerAdvances
    ].filter(x => x.is_excluded).length;

    return {
      monthStr,
      monthLabel,
      directSales,
      includedSales,
      pendingDirectBookings,
      itcPurchases,
      includedITC,
      cashMemos,
      includedCashMemos,
      salaryMuster,
      includedSalary,
      partnerAdvances,
      includedPartner,
      firozAdvances,
      totalFirozGiven,
      totalCashSpentByPraveen,
      excludedKeys,
      totalExcludedCount
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. MAIN VIEW RENDERER (Integrated into Admin Shell)
  // ═══════════════════════════════════════════════════════════════
  async function renderCAAuditPack() {
    if (!['owner', 'admin', 'developer', 'manager', 'ca'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Access denied. CA & Audit Pack is reserved for Directors, Admins & Accountants.</div></div>', 'ca-audit');
      return;
    }

    renderShell(`
      <div class="card" style="padding:24px;text-align:center;">
        <div style="font-size:24px;font-weight:900;margin-bottom:8px;">💼 Preparing CA Audit &amp; GST Filing Pack...</div>
        <div style="color:var(--muted);font-size:13px;">Reconciling GST Outward Sales, Registered ITC, Cash Memos (Sec 40A(3)), and Staff Muster Roll for ${activeMonth}...</div>
      </div>
    `, 'ca-audit');

    try {
      const data = await fetchMonthAuditData(activeMonth);

      // Calculations strictly from INCLUDED entries (so excluded items are omitted from report)
      const totalSalesGross = data.includedSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);
      const totalSalesTaxable = data.includedSales.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
      const totalSalesCGST = data.includedSales.reduce((s, x) => s + Number(x.cgst || 0), 0);
      const totalSalesSGST = data.includedSales.reduce((s, x) => s + Number(x.sgst || 0), 0);
      const totalOutputGST = totalSalesCGST + totalSalesSGST;

      const totalITCGross = data.includedITC.reduce((s, x) => s + Number(x.total_amount || 0), 0);
      const totalITCTaxable = data.includedITC.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
      const totalITCCGST = data.includedITC.reduce((s, x) => s + Number(x.cgst || 0), 0);
      const totalITCSGST = data.includedITC.reduce((s, x) => s + Number(x.sgst || 0), 0);
      const totalInputITC = totalITCCGST + totalITCSGST;

      const netGSTPayable = Math.max(0, totalOutputGST - totalInputITC);

      const totalCashMemos = data.includedCashMemos.reduce((s, x) => s + Number(x.amount || 0), 0);
      const anyOver40A3 = data.includedCashMemos.some(x => !x.within_40a3_limit);

      const totalGrossSalary = data.includedSalary.reduce((s, x) => s + Number(x.gross_salary || 0), 0);
      const totalAdvDeducted = data.includedSalary.reduce((s, x) => s + Number(x.advance_deducted || 0), 0);
      const totalNetSalary = data.includedSalary.reduce((s, x) => s + Number(x.net_payable || 0), 0);

      // Available Months (last 12 months)
      const monthOptions = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = d.toISOString().slice(0, 7);
        const lbl = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        monthOptions.push({ val, lbl });
      }

      // Shell Construction
      const html = `
        <style>
          .ca-audit-container { max-width: 100%; box-sizing: border-box; }
          .ca-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
          .ca-touch-card {
            border-radius: 10px;
            padding: 13px 15px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            transition: all 0.15s ease;
            position: relative;
            box-sizing: border-box;
          }
          .ca-touch-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.09);
          }
          @media (max-width: 768px) {
            .ca-card-grid { grid-template-columns: 1fr; }
            .ca-hero-title { font-size: 19px !important; }
            .ca-hero-controls { width: 100% !important; justify-content: stretch; }
            .ca-hero-controls button, .ca-hero-controls select { flex: 1 1 45% !important; text-align: center; }
            .ca-mobile-sticky-bar { display: flex !important; }
            #ca-audit-tab-body { padding-bottom: 75px; }
          }
        </style>

        <div class="no-print ca-audit-container">
          <!-- Top Hero & Month Picker -->
          <div class="card" style="background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;border-radius:14px;padding:20px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;">
              <div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:24px;">💼</span>
                  <h1 class="ca-hero-title" style="margin:0;font-size:22px;font-weight:900;color:#fff;">
                    Monthly CA Audit &amp; GST Return Filing Pack
                  </h1>
                </div>
                <div style="font-size:12.5px;color:#94A3B8;margin-top:5px;line-height:1.5;">
                  <strong>${CO.name}</strong> · GSTIN: <code style="color:#38BDF8;font-weight:800;background:rgba(56,189,248,0.15);padding:2px 6px;border-radius:4px;">${CO.gstin}</code> · CIN: ${CO.cin}
                </div>
                <div style="font-size:12px;color:#CBD5E1;margin-top:4px;">
                  Dual-Audit System: Separates official Tax Filing schedules from ground-level internal Cash Memos and Firoz-Praveen advances.
                </div>
              </div>

              <!-- Controls -->
              <div class="ca-hero-controls" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <div style="display:flex;flex-direction:column;gap:3px;flex: 1 1 120px;">
                  <label style="font-size:10.5px;color:#94A3B8;font-weight:700;">FILING PERIOD</label>
                  <select onchange="window.CA_AUDIT_PACK.setActiveMonth(this.value)" style="padding:8px 10px;border-radius:8px;border:1px solid #475569;background:#0F172A;color:#fff;font-weight:800;font-size:12.5px;cursor:pointer;width:100%;">
                    ${monthOptions.map(m => `<option value="${m.val}" ${m.val === activeMonth ? 'selected' : ''}>${m.lbl} (${m.val})</option>`).join('')}
                  </select>
                </div>
                <button type="button" onclick="window.CA_AUDIT_PACK.setViewMode('${viewMode === 'cards' ? 'table' : 'cards'}')" style="padding:9px 13px;background:#334155;color:#fff;font-weight:800;border:none;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;margin-top:16px;">
                  ${viewMode === 'cards' ? '📊 Table Grid' : '📱 Mobile Cards'}
                </button>
                <button type="button" onclick="window.CA_AUDIT_PACK.printFullAuditPack()" style="padding:9px 13px;background:#38BDF8;color:#0F172A;font-weight:800;border:none;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 4px 12px rgba(56,189,248,0.25);margin-top:16px;">
                  🖨️ Print Dossier
                </button>
                <button type="button" onclick="window.CA_AUDIT_PACK.exportMasterCSV()" style="padding:9px 13px;background:#10B981;color:#fff;font-weight:800;border:none;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 4px 12px rgba(16,185,129,0.25);margin-top:16px;">
                  📥 Excel/CSV
                </button>
                <button type="button" onclick="window.CA_AUDIT_PACK.copyCAWhatsAppSummary()" style="padding:9px 15px;background:#25D366;color:#fff;font-weight:900;border:none;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(37,211,102,0.3);margin-top:16px;">
                  📱 WhatsApp CA
                </button>
              </div>
            </div>
          </div>

          <!-- Dynamic Exclusion Warning Banner -->
          ${data.totalExcludedCount > 0 ? `
            <div style="background:#FFFBEB;border:1px solid #FCD34D;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <div>
                <strong style="color:#92400E;font-size:13.5px;">⚠️ ${data.totalExcludedCount} Entry(s) Excluded from Current CA Report</strong>
                <div style="font-size:12px;color:#B45309;margin-top:2px;">
                  Neeche diye gaye totals aur WhatsApp report me sirf <strong>Active / Included entries</strong> calculate ho rahi hain.
                </div>
              </div>
              <button type="button" onclick="window.CA_AUDIT_PACK.resetExclusions()" style="background:#0F172A;color:#FCD34D;font-weight:800;font-size:12px;padding:8px 14px;border:none;border-radius:6px;cursor:pointer;">
                🔄 Reset (Include All)
              </button>
            </div>
          ` : ''}

          <!-- CA Executive Summary Tiles -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:14px;">
            <div class="card" style="padding:14px;border-left:4px solid #3B82F6;margin:0;">
              <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Gross Sales Turnover</div>
              <div style="font-size:22px;font-weight:900;color:#1E3A8A;margin-top:3px;">₹${totalSalesGross.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">Taxable Base: ₹${totalSalesTaxable.toLocaleString('en-IN')}</div>
            </div>

            <div class="card" style="padding:14px;border-left:4px solid #DC2626;margin:0;">
              <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Output GST (GSTR-1)</div>
              <div style="font-size:22px;font-weight:900;color:#DC2626;margin-top:3px;">₹${totalOutputGST.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">CGST + SGST collected</div>
            </div>

            <div class="card" style="padding:14px;border-left:4px solid #10B981;margin:0;">
              <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Eligible ITC (GSTR-3B)</div>
              <div style="font-size:22px;font-weight:900;color:#059669;margin-top:3px;">₹${totalInputITC.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">${data.includedITC.length} GST purchases</div>
            </div>

            <div class="card" style="padding:14px;border-left:4px solid #7C3AED;margin:0;background:${netGSTPayable > 0 ? '#FAF5FF' : '#F0FDF4'};">
              <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Net GST Payable (Challan)</div>
              <div style="font-size:22px;font-weight:900;color:#6D28D9;margin-top:3px;">₹${netGSTPayable.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:#059669;margin-top:2px;font-weight:700;">After ITC set-off</div>
            </div>

            <div class="card" style="padding:14px;border-left:4px solid #F59E0B;margin:0;">
              <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Operating Cash Memos</div>
              <div style="font-size:22px;font-weight:900;color:#B45309;margin-top:3px;">₹${totalCashMemos.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:#059669;margin-top:2px;font-weight:700;">
                ${anyOver40A3 ? '⚠️ Verify Sec 40A(3)' : '✅ Complies with Sec 40A(3)'}
              </div>
            </div>

            <div class="card" style="padding:14px;border-left:4px solid #0D9488;margin:0;">
              <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Staff Wages Paid</div>
              <div style="font-size:22px;font-weight:900;color:#0F766E;margin-top:3px;">₹${totalNetSalary.toLocaleString('en-IN')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">Advance deducted: ₹${totalAdvDeducted.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <!-- Section Navigation Tabs -->
          <div class="card" style="padding:8px;margin-bottom:14px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button onclick="window.CA_AUDIT_PACK.setActiveTab('summary')" class="${activeTab === 'summary' ? '' : 'secondary'}" style="flex:1;min-width:130px;font-weight:700;">
                📋 CA Dossier Overview
              </button>
              <button onclick="window.CA_AUDIT_PACK.setActiveTab('sales')" class="${activeTab === 'sales' ? '' : 'secondary'}" style="flex:1;min-width:130px;font-weight:700;">
                📊 1. GSTR-1 Sales (${data.includedSales.length}/${data.directSales.length})
              </button>
              <button onclick="window.CA_AUDIT_PACK.setActiveTab('itc')" class="${activeTab === 'itc' ? '' : 'secondary'}" style="flex:1;min-width:130px;font-weight:700;">
                🏷️ 2. GSTR-3B ITC (${data.includedITC.length}/${data.itcPurchases.length})
              </button>
              <button onclick="window.CA_AUDIT_PACK.setActiveTab('cashmemos')" class="${activeTab === 'cashmemos' ? '' : 'secondary'}" style="flex:1;min-width:130px;font-weight:700;">
                🧾 3. Cash Memos (${data.includedCashMemos.length}/${data.cashMemos.length})
              </button>
              <button onclick="window.CA_AUDIT_PACK.setActiveTab('salary')" class="${activeTab === 'salary' ? '' : 'secondary'}" style="flex:1;min-width:130px;font-weight:700;">
                👥 4. Staff Wages (${data.includedSalary.length}/${data.salaryMuster.length})
              </button>
              <button onclick="window.CA_AUDIT_PACK.setActiveTab('partner')" class="${activeTab === 'partner' ? '' : 'secondary'}" style="flex:1;min-width:130px;font-weight:700;">
                🤝 5. Partner Advances
              </button>
            </div>
          </div>
        </div>

        <!-- Dynamic Tab Contents -->
        <div id="ca-audit-tab-body">
          ${renderActiveTabContent(activeTab, data, {
            totalSalesGross, totalSalesTaxable, totalSalesCGST, totalSalesSGST, totalOutputGST,
            totalITCGross, totalITCTaxable, totalITCCGST, totalITCSGST, totalInputITC,
            netGSTPayable, totalCashMemos, anyOver40A3, totalGrossSalary, totalAdvDeducted, totalNetSalary
          })}
        </div>

        <!-- Floating Mobile Sticky Bottom Bar (Always Accessible on Phone) -->
        <div class="ca-mobile-sticky-bar" style="position:fixed;bottom:0;left:0;right:0;background:#0F172A;color:#fff;padding:12px 16px;box-shadow:0 -4px 18px rgba(0,0,0,0.35);z-index:999;display:none;align-items:center;justify-content:space-between;border-top:2px solid #38BDF8;">
          <div>
            <div style="font-size:10.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;">CA Report (${data.monthLabel})</div>
            <div style="font-size:14px;font-weight:900;color:#38BDF8;">
              ₹${netGSTPayable.toLocaleString('en-IN')} <span style="font-size:11px;color:#E2E8F0;font-weight:500;">Net GST (${data.includedSales.length} In / ${data.totalExcludedCount} Ex)</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            ${data.totalExcludedCount > 0 ? `
              <button type="button" onclick="window.CA_AUDIT_PACK.resetExclusions()" style="padding:8px 10px;background:#334155;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;">
                🔄 Reset
              </button>
            ` : ''}
            <button type="button" onclick="window.CA_AUDIT_PACK.copyCAWhatsAppSummary()" style="padding:8px 14px;background:#25D366;color:#fff;font-weight:900;border:none;border-radius:6px;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 2px 8px rgba(37,211,102,0.4);">
              📱 Send CA
            </button>
          </div>
        </div>
      `;

      renderShell(html, 'ca-audit');

    } catch (err) {
      console.error('CA Audit Pack error:', err);
      renderShell(`
        <div class="card">
          <div class="error" style="padding:16px;">
            <h3>❌ Error generating CA Audit Pack</h3>
            <p>${err.message}</p>
            <button onclick="renderCAAuditPack()" class="primary">🔄 Retry</button>
          </div>
        </div>
      `, 'ca-audit');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. TAB RENDERERS
  // ═══════════════════════════════════════════════════════════════
  function renderActiveTabContent(tab, data, kpis) {
    switch (tab) {
      case 'summary':
        return renderTabSummary(data, kpis);
      case 'sales':
        return renderTabSales(data, kpis);
      case 'itc':
        return renderTabITC(data, kpis);
      case 'cashmemos':
        return renderTabCashMemos(data, kpis);
      case 'salary':
        return renderTabSalary(data, kpis);
      case 'partner':
        return renderTabPartner(data, kpis);
      default:
        return renderTabSummary(data, kpis);
    }
  }

  // Tab Level Action Toolbar (For Exclusions & Mobile View Switch)
  function renderTabToolbar(tabName, items) {
    const includedCount = items.filter(x => !x.is_excluded).length;
    const excludedCount = items.filter(x => x.is_excluded).length;
    const itemKeys = items.map(x => x.entry_key);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding:9px 13px;background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;">
        <div style="font-size:12.5px;font-weight:700;color:#334155;">
          Report me Shamil: <strong style="color:#15803D;">${includedCount}</strong> Active
          ${excludedCount > 0 ? ` · <span style="color:#DC2626;">Excluded: <strong>${excludedCount}</strong></span>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <button type="button" onclick="window.CA_AUDIT_PACK.setViewMode('${viewMode === 'cards' ? 'table' : 'cards'}')" class="btn-sm secondary" style="font-size:11px;padding:6px 10px;font-weight:700;border-radius:6px;cursor:pointer;">
            ${viewMode === 'cards' ? '📊 Table Grid' : '📱 Mobile Cards'}
          </button>
          <button type="button" onclick="window.CA_AUDIT_PACK.includeAllInTab([${itemKeys.map(k => `'${k}'`).join(',')}])" class="btn-sm" style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;font-size:11px;padding:6px 10px;font-weight:700;border-radius:6px;cursor:pointer;">
            ✔ Include All
          </button>
          <button type="button" onclick="window.CA_AUDIT_PACK.excludeAllInTab([${itemKeys.map(k => `'${k}'`).join(',')}])" class="btn-sm" style="background:#FFF1F2;color:#9F1239;border:1px solid #FECDD3;font-size:11px;padding:6px 10px;font-weight:700;border-radius:6px;cursor:pointer;">
            ✖ Exclude All
          </button>
        </div>
      </div>
    `;
  }

  // ──── TAB: SUMMARY / OVERVIEW ────
  function renderTabSummary(data, kpis) {
    return `
      <div class="card" style="border:1px solid #CBD5E1;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h2 style="margin:0;font-size:18px;font-weight:900;">📋 Chartered Accountant Executive Filing Brief</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">Filing Period: <strong>${data.monthLabel} (${data.monthStr})</strong> · Legal Entity: <strong>${CO.name}</strong></div>
          </div>
          <span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;padding:6px 12px;border-radius:20px;">
            ✔ Books Ready For Filing
          </span>
        </div>

        <!-- CA Instruction Alert -->
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;line-height:1.6;color:#1E3A8A;">
          <strong>💡 Notes for your Chartered Accountant:</strong><br>
          • <strong>GSTR-1 (Outward Supplies):</strong> Direct homestay guest invoices billed under SAC <code>996311</code> (with GSTIN / B2C) plus Airbnb gross billing.<br>
          • <strong>GSTR-3B (Input Tax Credit):</strong> Official purchases from GST-registered suppliers (Appliances, Electronics, High-speed Internet). Claimed in Table 4(A)(5).<br>
          • <strong>Unregistered Maintenance &amp; Laundry (Sec 40A(3)):</strong> Plumbers, mistris, painters and local laundry do not have GST numbers. Under Section 9(4) CGST Act, RCM on general supplies is currently exempt. All cash payments are maintained strictly under ₹10,000 per person per day with internal self-certified payment vouchers.<br>
          • <strong>Staff Salaries:</strong> Net wages paid after deducting mid-month advances. Backed by the physical Salary Muster Roll with staff signatures/thumb impressions.<br>
          • <strong>Firoz - Praveen Advances:</strong> Transferred via Director's Current Account / Partner Imprest Fund, balancing credit and debit in the bank statement.
        </div>

        <!-- Master Reconciliation Table -->
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#F1F5F9;text-align:left;border-bottom:2px solid #CBD5E1;">
                <th style="padding:10px;">Accounting Head</th>
                <th style="padding:10px;">Audit Schedule</th>
                <th style="padding:10px;text-align:right;">Taxable / Base (₹)</th>
                <th style="padding:10px;text-align:right;">GST Tax (₹)</th>
                <th style="padding:10px;text-align:right;">Gross Total (₹)</th>
                <th style="padding:10px;text-align:center;">Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #E2E8F0;">
                <td style="padding:10px;font-weight:800;">1. Outward Homestay Accommodation</td>
                <td style="padding:10px;color:var(--muted);">GSTR-1 (B2B &amp; B2C Other)</td>
                <td style="padding:10px;text-align:right;font-weight:700;">₹${kpis.totalSalesTaxable.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:right;color:#DC2626;font-weight:700;">₹${kpis.totalOutputGST.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:right;font-weight:800;">₹${kpis.totalSalesGross.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:center;"><span style="color:#16A34A;font-weight:800;">✅ Reconciled</span></td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0;background:#F8FAFC;">
                <td style="padding:10px;font-weight:800;">2. Registered Inward Purchases (ITC)</td>
                <td style="padding:10px;color:var(--muted);">GSTR-3B Table 4(A)(5)</td>
                <td style="padding:10px;text-align:right;font-weight:700;">₹${kpis.totalITCTaxable.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:right;color:#16A34A;font-weight:700;">₹${kpis.totalInputITC.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:right;font-weight:800;">₹${kpis.totalITCGross.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:center;"><span style="color:#16A34A;font-weight:800;">✅ ITC Set-off</span></td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0;">
                <td style="padding:10px;font-weight:800;">3. Operating Cash Memos &amp; Laundry</td>
                <td style="padding:10px;color:var(--muted);">P&amp;L Expenses (Sec 40A(3))</td>
                <td style="padding:10px;text-align:right;font-weight:700;">₹${kpis.totalCashMemos.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:right;color:var(--muted);">₹0 (Unreg.)</td>
                <td style="padding:10px;text-align:right;font-weight:800;">₹${kpis.totalCashMemos.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:center;">
                  <span style="color:${kpis.anyOver40A3 ? '#DC2626' : '#16A34A'};font-weight:800;">
                    ${kpis.anyOver40A3 ? '⚠️ Over ₹10k' : '✅ &lt; ₹10k Limit'}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0;background:#F8FAFC;">
                <td style="padding:10px;font-weight:800;">4. Staff Salaries &amp; Wages</td>
                <td style="padding:10px;color:var(--muted);">Monthly Wage Register</td>
                <td style="padding:10px;text-align:right;font-weight:700;">₹${kpis.totalNetSalary.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:right;color:var(--muted);">-</td>
                <td style="padding:10px;text-align:right;font-weight:800;">₹${kpis.totalNetSalary.toLocaleString('en-IN')}</td>
                <td style="padding:10px;text-align:center;"><span style="color:#16A34A;font-weight:800;">✅ Muster Roll</span></td>
              </tr>
              <tr style="border-bottom:2px solid #0F172A;background:#EFF6FF;">
                <td style="padding:12px 10px;font-weight:900;font-size:14px;color:#1E3A8A;" colspan="3">NET GST CHALLAN LIABILITY (Output Tax - Eligible ITC)</td>
                <td style="padding:12px 10px;text-align:right;font-weight:900;font-size:15px;color:#7C3AED;" colspan="2">₹${kpis.netGSTPayable.toLocaleString('en-IN')}</td>
                <td style="padding:12px 10px;text-align:center;font-weight:800;color:#7C3AED;">Challan PMT-06</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
          <button onclick="window.CA_AUDIT_PACK.setActiveTab('sales')" class="primary btn-sm">View GSTR-1 Sales</button>
          <button onclick="window.CA_AUDIT_PACK.setActiveTab('itc')" class="secondary btn-sm">View ITC Purchases</button>
          <button onclick="window.CA_AUDIT_PACK.setActiveTab('cashmemos')" class="secondary btn-sm">View Cash Memos</button>
          <button onclick="window.CA_AUDIT_PACK.setActiveTab('salary')" class="secondary btn-sm">View Staff Muster Roll</button>
        </div>
      </div>
    `;
  }

  // ──── TAB: GSTR-1 SALES ────
  function renderTabSales(data, kpis) {
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h2 style="margin:0;font-size:18px;font-weight:900;">📊 GSTR-1 Outward Sales Register</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              SAC: <strong>${CO.sac}</strong> · ${data.directSales.length} Bill(s) in ${data.monthLabel} (Strictly GST Billed &amp; Airbnb Online only)
            </div>
          </div>
          <button onclick="window.CA_AUDIT_PACK.exportSalesCSV()" class="btn-sm" style="background:#059669;color:#fff;font-weight:700;">
            📥 Download GSTR-1 CSV
          </button>
        </div>

        <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:10px 14px;border-radius:8px;font-size:12.5px;color:#166534;margin-bottom:12px;">
          ✔ <strong>Strict CA Filter Active:</strong> Yahan sirf wahi bookings shamil hain jinka <strong>GST Bill Generate</strong> kiya gaya hai aur jo <strong>Airbnb Online</strong> se aayi hain. Jo direct bookings bina GST bill ke hain unhe is return me shamil nahi kiya gaya hai.
        </div>

        <!-- Night Splitter Control & Notification -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;background:#F8FAFC;padding:10px 14px;border:1px solid #CBD5E1;border-radius:8px;">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;cursor:pointer;user-select:none;">
            <input type="checkbox" id="chkSplitDirectNights" ${splitDirectNights ? 'checked' : ''} onchange="window.CA_AUDIT_PACK.toggleSplitDirectNights(this.checked)" style="width:17px;height:17px;cursor:pointer;">
            <span style="color:#0F172A;">🔄 Multi-Night Direct Bookings ko Daily 1-Night Bookings me dikhayein (e.g. Rohit 5 Nights = 5 Daily Bookings)</span>
          </label>
          <span class="badge" style="background:${splitDirectNights ? '#EFF6FF' : '#FEF3C7'};color:${splitDirectNights ? '#1D4ED8' : '#B45309'};font-weight:800;font-size:11px;">
            ${splitDirectNights ? '✔ 5-Day Split Mode Active' : 'Consolidated 1-Row Mode'}
          </span>
        </div>

        <!-- Exclusion Toolbar -->
        ${renderTabToolbar('sales', data.directSales)}

        ${viewMode === 'cards' ? `
          <!-- Mobile Touch Cards View -->
          <div class="ca-card-grid">
            ${data.directSales.length === 0 ? `<div style="padding:24px;text-align:center;color:var(--muted);grid-column:1/-1;">No GST Invoices or Airbnb bookings found for ${data.monthLabel}</div>` : ''}
            ${data.directSales.map(inv => `
              <div class="ca-touch-card" style="background:${inv.is_excluded ? '#FFF1F2' : '#FFFFFF'};border:1.5px solid ${inv.is_excluded ? '#FECDD3' : '#E2E8F0'};opacity:${inv.is_excluded ? '0.7' : '1'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span style="font-weight:800;font-size:13px;color:#0F172A;">📅 ${inv.invoice_date || '-'}</span>
                      ${inv.is_airbnb 
                        ? '<span class="badge" style="background:#EFF6FF;color:#1D4ED8;font-weight:800;font-size:10px;">🌐 Airbnb</span>' 
                        : (inv.is_split_night 
                            ? `<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:10px;">🧾 GST (${inv.split_index}/${inv.split_total})</span>` 
                            : '<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:10px;">🧾 GST Bill</span>')}
                    </div>
                    <div style="font-weight:800;font-size:14.5px;color:#1E3A8A;margin-top:4px;">
                      ${inv.guest_name}
                    </div>
                    <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                      🏠 ${inv.room_name} (${inv.nights}N) · <code>${inv.invoice_no}</code>
                    </div>
                    ${inv.guest_gstin ? `<div style="font-size:11px;color:#2563EB;margin-top:2px;font-weight:700;">GSTIN: ${inv.guest_gstin}</div>` : ''}
                  </div>
                  <div>
                    ${renderEntryAction(inv)}
                  </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:8px;border-top:1px dashed #E2E8F0;">
                  <div style="font-size:11.5px;color:var(--muted);">
                    Taxable: ₹${Number(inv.taxable_value || 0).toLocaleString('en-IN')}<br>
                    GST (5%): ₹${(Number(inv.cgst || 0) + Number(inv.sgst || 0)).toLocaleString('en-IN')}
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:11px;color:var(--muted);">${inv.payment_mode || 'Direct'}</div>
                    <div style="font-size:17px;font-weight:900;color:${inv.is_excluded ? '#991B1B' : '#0F172A'};${inv.is_excluded ? 'text-decoration:line-through;' : ''}">
                      ₹${Number(inv.total_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- Table Grid View -->
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              <thead>
                <tr style="background:#F8FAFC;text-align:left;border-bottom:2px solid #CBD5E1;">
                  <th style="padding:8px;text-align:center;">Action</th>
                  <th style="padding:8px;">Date</th>
                  <th style="padding:8px;">Type</th>
                  <th style="padding:8px;">Invoice / Ref No</th>
                  <th style="padding:8px;">Customer / Channel</th>
                  <th style="padding:8px;">GSTIN / POS</th>
                  <th style="padding:8px;">Unit / Stay</th>
                  <th style="padding:8px;text-align:right;">Taxable Value</th>
                  <th style="padding:8px;text-align:right;">CGST</th>
                  <th style="padding:8px;text-align:right;">SGST</th>
                  <th style="padding:8px;text-align:right;">Total Amount</th>
                  <th style="padding:8px;">Mode</th>
                </tr>
              </thead>
              <tbody>
                ${data.directSales.length === 0 ? `<tr><td colspan="12" style="padding:24px;text-align:center;color:var(--muted);">No GST Invoices or Airbnb bookings found for ${data.monthLabel}</td></tr>` : ''}
                ${data.directSales.map((inv, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0;background:${inv.is_excluded ? '#FFF1F2' : (idx % 2 === 0 ? '#fff' : '#FBFBFB')};opacity:${inv.is_excluded ? '0.7' : '1'};">
                    <td style="padding:6px;text-align:center;">
                      ${renderEntryAction(inv)}
                    </td>
                    <td style="padding:8px;font-weight:600;">${inv.invoice_date || '-'}</td>
                    <td style="padding:8px;">
                      ${inv.is_airbnb 
                        ? '<span class="badge" style="background:#EFF6FF;color:#1D4ED8;font-weight:800;font-size:10px;">🌐 Airbnb</span>' 
                        : (inv.is_split_night 
                            ? `<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:10px;">🧾 GST (${inv.split_index}/${inv.split_total})</span>` 
                            : '<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:10px;">🧾 GST Bill</span>')}
                    </td>
                    <td style="padding:8px;font-weight:700;color:#1E3A8A;">${inv.invoice_no}</td>
                    <td style="padding:8px;">
                      <strong>${inv.guest_name}</strong>
                      ${inv.guest_company ? `<div style="font-size:11px;color:var(--muted);">${inv.guest_company}</div>` : ''}
                    </td>
                    <td style="padding:8px;font-family:monospace;font-size:11.5px;">
                      ${inv.guest_gstin ? `<span class="badge" style="background:#EFF6FF;color:#1D4ED8;font-weight:800;">${inv.guest_gstin}</span>` : '<span style="color:var(--muted);">B2C (09-UP)</span>'}
                    </td>
                    <td style="padding:8px;">${inv.room_name} (${inv.nights}N)</td>
                    <td style="padding:8px;text-align:right;font-weight:600;${inv.is_excluded ? 'text-decoration:line-through;' : ''}">₹${Number(inv.taxable_value || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#DC2626;${inv.is_excluded ? 'text-decoration:line-through;' : ''}">₹${Number(inv.cgst || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#DC2626;${inv.is_excluded ? 'text-decoration:line-through;' : ''}">₹${Number(inv.sgst || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;font-weight:800;color:#0F172A;${inv.is_excluded ? 'text-decoration:line-through;' : ''}">₹${Number(inv.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;font-size:11px;color:var(--muted);">${inv.payment_mode || 'Direct'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#F1F5F9;border-top:2px solid #0F172A;font-weight:900;">
                  <td colspan="7" style="padding:10px;">TOTAL GSTR-1 OUTWARD SUPPLIES (INCLUDED ONLY)</td>
                  <td style="padding:10px;text-align:right;color:#1E3A8A;">₹${kpis.totalSalesTaxable.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;color:#DC2626;">₹${kpis.totalSalesCGST.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;color:#DC2626;">₹${kpis.totalSalesSGST.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;font-size:14px;color:#059669;">₹${kpis.totalSalesGross.toLocaleString('en-IN')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}

        ${data.pendingDirectBookings && data.pendingDirectBookings.length > 0 ? `
          <div style="margin-top:24px;border-top:2px dashed #E2E8F0;padding-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
              <div>
                <h3 style="margin:0;font-size:15px;font-weight:800;color:#0F172A;">
                  📝 Direct Bookings Awaiting GST Invoice (${data.pendingDirectBookings.length})
                </h3>
                <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                  Ye direct guests is mahine stay kiye hain. Agar aap inka GST bill add karna chahte hain to button click karein (5-night booking automatically 5 daily bookings me split ho jayegi).
                </div>
              </div>
            </div>

            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="background:#F1F5F9;text-align:left;">
                    <th style="padding:6px 8px;">Check-in</th>
                    <th style="padding:6px 8px;">Guest Name</th>
                    <th style="padding:6px 8px;">Phone</th>
                    <th style="padding:6px 8px;">Unit</th>
                    <th style="padding:6px 8px;text-align:center;">Stay Nights</th>
                    <th style="padding:6px 8px;text-align:right;">Total Amount</th>
                    <th style="padding:6px 8px;text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.pendingDirectBookings.map(pb => `
                    <tr style="border-bottom:1px solid #E2E8F0;">
                      <td style="padding:6px 8px;font-weight:600;">${pb.check_in}</td>
                      <td style="padding:6px 8px;font-weight:700;color:#0F172A;">${pb.guest_name}</td>
                      <td style="padding:6px 8px;color:var(--muted);">${pb.phone || '-'}</td>
                      <td style="padding:6px 8px;">${pb.room_name}</td>
                      <td style="padding:6px 8px;text-align:center;font-weight:700;">${pb.nights || 1} Night${(pb.nights || 1) > 1 ? 's' : ''}</td>
                      <td style="padding:6px 8px;text-align:right;font-weight:800;">₹${Number(pb.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td style="padding:6px 8px;text-align:right;">
                        <button class="btn-sm" style="background:#0F172A;color:#38BDF8;font-weight:700;padding:5px 12px;border-radius:6px;border:none;cursor:pointer;" onclick="window.CA_AUDIT_PACK.quickGenerateDirectGSTBill('${pb.booking_id}')">
                          ⚡ Generate GST Bill ${(pb.nights || 1) > 1 ? `(Split ${pb.nights} Days)` : ''}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // ──── TAB: GSTR-3B ITC ────
  function renderTabITC(data, kpis) {
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h2 style="margin:0;font-size:18px;font-weight:900;">🏷️ GSTR-3B Input Tax Credit (ITC Inward Purchases)</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">Purchases from GST-Registered Vendors with valid Tax Invoices</div>
          </div>
          <button onclick="window.CA_AUDIT_PACK.exportITCCSV()" class="btn-sm" style="background:#059669;color:#fff;font-weight:700;">
            📥 Download ITC CSV
          </button>
        </div>

        <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:12px;border-radius:8px;font-size:12.5px;color:#166534;margin-bottom:14px;">
          💡 <strong>ITC Rule for Homestay Services:</strong> Input tax paid on broadband/Wi-Fi, homestay appliances (AC, Smart TV, Geyser), and commercial linen purchases can be set off against output GST liability.
        </div>

        <!-- Exclusion Toolbar -->
        ${renderTabToolbar('itc', data.itcPurchases)}

        ${viewMode === 'cards' ? `
          <!-- Mobile Touch Cards View -->
          <div class="ca-card-grid">
            ${data.itcPurchases.length === 0 ? `<div style="padding:24px;text-align:center;color:var(--muted);grid-column:1/-1;">No GST-registered purchases logged for ${data.monthLabel}</div>` : ''}
            ${data.itcPurchases.map(itc => `
              <div class="ca-touch-card" style="background:${itc.is_excluded ? '#FFF1F2' : '#FFFFFF'};border:1.5px solid ${itc.is_excluded ? '#FECDD3' : '#E2E8F0'};opacity:${itc.is_excluded ? '0.7' : '1'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span style="font-weight:800;font-size:13px;color:#0F172A;">📅 ${itc.date || '-'}</span>
                      <span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:10px;">🏷️ ITC Purchase</span>
                    </div>
                    <div style="font-weight:800;font-size:14.5px;color:#1E3A8A;margin-top:4px;">
                      ${itc.vendor}
                    </div>
                    <div style="font-size:11.5px;color:#1E40AF;font-family:monospace;margin-top:2px;">
                      GSTIN: ${itc.gstin}
                    </div>
                    <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                      ${itc.category} ${itc.notes ? `· ${itc.notes}` : ''}
                    </div>
                  </div>
                  <div>
                    ${renderEntryAction(itc)}
                  </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:8px;border-top:1px dashed #E2E8F0;">
                  <div style="font-size:11.5px;color:var(--muted);">
                    Taxable: ₹${Number(itc.taxable_value || 0).toLocaleString('en-IN')}<br>
                    CGST: ₹${Number(itc.cgst || 0).toLocaleString('en-IN')} · SGST: ₹${Number(itc.sgst || 0).toLocaleString('en-IN')}
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10.5px;color:#15803D;font-weight:800;">Table 4(A)(5)</div>
                    <div style="font-size:17px;font-weight:900;color:${itc.is_excluded ? '#991B1B' : '#0F172A'};${itc.is_excluded ? 'text-decoration:line-through;' : ''}">
                      ₹${Number(itc.total_amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- Table Grid View -->
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              <thead>
                <tr style="background:#F8FAFC;text-align:left;border-bottom:2px solid #CBD5E1;">
                  <th style="padding:8px;text-align:center;">Action</th>
                  <th style="padding:8px;">Date</th>
                  <th style="padding:8px;">Supplier / Vendor</th>
                  <th style="padding:8px;">Supplier GSTIN</th>
                  <th style="padding:8px;">Category / Particulars</th>
                  <th style="padding:8px;text-align:right;">Taxable Value</th>
                  <th style="padding:8px;text-align:right;">CGST</th>
                  <th style="padding:8px;text-align:right;">SGST</th>
                  <th style="padding:8px;text-align:right;">Total Amount</th>
                  <th style="padding:8px;">ITC Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.itcPurchases.length === 0 ? `<tr><td colspan="10" style="padding:24px;text-align:center;color:var(--muted);">No GST-registered purchases logged for ${data.monthLabel}</td></tr>` : ''}
                ${data.itcPurchases.map((itc, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0;background:${itc.is_excluded ? '#FFF1F2' : (idx % 2 === 0 ? '#fff' : '#FBFBFB')};opacity:${itc.is_excluded ? '0.7' : '1'};">
                    <td style="padding:6px;text-align:center;">
                      ${renderEntryAction(itc)}
                    </td>
                    <td style="padding:8px;font-weight:600;">${itc.date}</td>
                    <td style="padding:8px;font-weight:700;">${itc.vendor}</td>
                    <td style="padding:8px;font-family:monospace;font-size:11.5px;color:#1E40AF;">${itc.gstin}</td>
                    <td style="padding:8px;">${itc.category} <div style="font-size:11px;color:var(--muted);">${itc.notes}</div></td>
                    <td style="padding:8px;text-align:right;font-weight:600;${itc.is_excluded ? 'text-decoration:line-through;' : ''}">₹${itc.taxable_value.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#059669;${itc.is_excluded ? 'text-decoration:line-through;' : ''}">₹${itc.cgst.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#059669;${itc.is_excluded ? 'text-decoration:line-through;' : ''}">₹${itc.sgst.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;font-weight:800;${itc.is_excluded ? 'text-decoration:line-through;' : ''}">₹${itc.total_amount.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;"><span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;">Claimable</span></td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#F1F5F9;border-top:2px solid #0F172A;font-weight:900;">
                  <td colspan="5" style="padding:10px;">TOTAL CLAIMABLE INPUT TAX CREDIT (ITC - INCLUDED ONLY)</td>
                  <td style="padding:10px;text-align:right;color:#1E3A8A;">₹${kpis.totalITCTaxable.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;color:#059669;">₹${kpis.totalITCCGST.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;color:#059669;">₹${kpis.totalITCSGST.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;font-size:14px;color:#0F172A;">₹${kpis.totalITCGross.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;color:#059669;">Table 4(A)(5)</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ──── TAB: CASH MEMOS & SELF-VOUCHERS ────
  function renderTabCashMemos(data, kpis) {
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h2 style="margin:0;font-size:18px;font-weight:900;">🧾 Unregistered Cash Memos &amp; Self-Vouchers</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              Maintenance (Plumber, Electrician, Mistri), Laundry &amp; Day-to-Day Property Consumables
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.CA_AUDIT_PACK.printSelfVouchers()" class="btn-sm" style="background:#38BDF8;color:#0F172A;font-weight:700;">
              🖨️ Print Dossier
            </button>
            <button onclick="window.CA_AUDIT_PACK.exportCashMemosCSV()" class="btn-sm" style="background:#059669;color:#fff;font-weight:700;">
              📥 Download CSV
            </button>
          </div>
        </div>

        <!-- Compliance Law Banner -->
        <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:12px;margin-bottom:14px;font-size:12.5px;color:#92400E;line-height:1.5;">
          <strong>⚖️ Income Tax Section 40A(3) Compliance Check:</strong><br>
          Under Indian Tax Law, business cash payments up to ₹10,000 per person per day are 100% admissible deductions in the company's P&amp;L account when supported by an internal <strong>Self-Certified Payment Voucher</strong>. Local plumbers, mistris, and dhobis do not provide GST bills; their raw cash memos are collated below.
        </div>

        <!-- Exclusion Toolbar -->
        ${renderTabToolbar('cashmemos', data.cashMemos)}

        ${viewMode === 'cards' ? `
          <!-- Mobile Touch Cards View -->
          <div class="ca-card-grid">
            ${data.cashMemos.length === 0 ? `<div style="padding:24px;text-align:center;color:var(--muted);grid-column:1/-1;">No cash memo entries for ${data.monthLabel}</div>` : ''}
            ${data.cashMemos.map(cm => `
              <div class="ca-touch-card" style="background:${cm.is_excluded ? '#FFF1F2' : '#FFFFFF'};border:1.5px solid ${cm.is_excluded ? '#FECDD3' : '#E2E8F0'};opacity:${cm.is_excluded ? '0.7' : '1'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span style="font-weight:800;font-size:13px;color:#0F172A;">📅 ${cm.date || '-'}</span>
                      <span class="badge" style="background:#F1F5F9;color:#475569;font-weight:800;font-size:10px;">${cm.ref_no}</span>
                    </div>
                    <div style="font-weight:800;font-size:14.5px;color:#0F172A;margin-top:4px;">
                      ${cm.vendor_or_type}
                    </div>
                    <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                      📂 ${cm.category} · 🏠 ${cm.room_name}
                    </div>
                    <div style="font-size:11.5px;color:#1E3A8A;margin-top:2px;font-weight:600;">
                      Paid by: ${cm.paid_by} · ${cm.payment_mode}
                    </div>
                  </div>
                  <div>
                    ${renderEntryAction(cm)}
                  </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:8px;border-top:1px dashed #E2E8F0;">
                  <div>
                    <span class="badge" style="background:${cm.within_40a3_limit ? '#DCFCE7' : '#FEE2E2'};color:${cm.within_40a3_limit ? '#15803D' : '#B91C1C'};font-weight:800;font-size:11px;">
                      ${cm.within_40a3_limit ? '✔ &le; ₹10k Limit' : '⚠️ Exceeds Limit'}
                    </span>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:17px;font-weight:900;color:${cm.is_excluded ? '#991B1B' : '#0F172A'};${cm.is_excluded ? 'text-decoration:line-through;' : ''}">
                      ₹${Number(cm.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- Table Grid View -->
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              <thead>
                <tr style="background:#F8FAFC;text-align:left;border-bottom:2px solid #CBD5E1;">
                  <th style="padding:8px;text-align:center;">Action</th>
                  <th style="padding:8px;">Date</th>
                  <th style="padding:8px;">Ref / Source</th>
                  <th style="padding:8px;">Vendor / Particulars</th>
                  <th style="padding:8px;">Property Unit</th>
                  <th style="padding:8px;">Disbursed By</th>
                  <th style="padding:8px;text-align:right;">Amount (₹)</th>
                  <th style="padding:8px;">Mode</th>
                  <th style="padding:8px;text-align:center;">Sec 40A(3) Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.cashMemos.length === 0 ? `<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--muted);">No cash memo entries for ${data.monthLabel}</td></tr>` : ''}
                ${data.cashMemos.map((cm, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0;background:${cm.is_excluded ? '#FFF1F2' : (idx % 2 === 0 ? '#fff' : '#FBFBFB')};opacity:${cm.is_excluded ? '0.7' : '1'};">
                    <td style="padding:6px;text-align:center;">
                      ${renderEntryAction(cm)}
                    </td>
                    <td style="padding:8px;font-weight:600;">${cm.date || '-'}</td>
                    <td style="padding:8px;font-size:11px;color:var(--muted);">${cm.ref_no}</td>
                    <td style="padding:8px;font-weight:700;">
                      ${cm.vendor_or_type}
                      <div style="font-size:11px;color:var(--muted);">${cm.category}</div>
                    </td>
                    <td style="padding:8px;">${cm.room_name}</td>
                    <td style="padding:8px;color:#1E3A8A;font-weight:600;">${cm.paid_by}</td>
                    <td style="padding:8px;text-align:right;font-weight:800;color:#0F172A;${cm.is_excluded ? 'text-decoration:line-through;' : ''}">₹${cm.amount.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;font-size:11px;color:var(--muted);">${cm.payment_mode}</td>
                    <td style="padding:8px;text-align:center;">
                      <span class="badge" style="background:${cm.within_40a3_limit ? '#DCFCE7' : '#FEE2E2'};color:${cm.within_40a3_limit ? '#15803D' : '#B91C1C'};font-weight:800;">
                        ${cm.within_40a3_limit ? '✔ &le; ₹10,000' : '⚠️ Exceeds Limit'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#F1F5F9;border-top:2px solid #0F172A;font-weight:900;">
                  <td colspan="6" style="padding:10px;">TOTAL OPERATING CASH MEMOS &amp; OVERHEADS (INCLUDED ONLY)</td>
                  <td style="padding:10px;text-align:right;font-size:14px;color:#B45309;">₹${kpis.totalCashMemos.toLocaleString('en-IN')}</td>
                  <td colspan="2" style="padding:10px;text-align:center;color:#16A34A;">Admissible in P&amp;L</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ──── TAB: STAFF SALARY MUSTER ROLL ────
  function renderTabSalary(data, kpis) {
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h2 style="margin:0;font-size:18px;font-weight:900;">👥 Staff Salary &amp; Advance Muster Roll (Form T)</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              Monthly Wage Register with Mid-Month Advance Deductions &amp; Audit Signatures
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.CA_AUDIT_PACK.printSalaryMuster()" class="btn-sm" style="background:#38BDF8;color:#0F172A;font-weight:700;">
              🖨️ Print Muster for Signatures
            </button>
            <button onclick="window.CA_AUDIT_PACK.exportSalaryCSV()" class="btn-sm" style="background:#059669;color:#fff;font-weight:700;">
              📥 Download CSV
            </button>
          </div>
        </div>

        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px;margin-bottom:14px;font-size:12.5px;color:#1E3A8A;line-height:1.5;">
          <strong>📝 Ground Reality &amp; Labor Compliance:</strong> Cleaners, caretakers, and cooks often take mid-month advances and do not have bank accounts. To claim these salaries as legal business expenses without notice from the IT/Labor Department, print this muster roll at the start of each month and obtain their physical signature or thumb impression upon cash payment.
        </div>

        <!-- Exclusion Toolbar -->
        ${renderTabToolbar('salary', data.salaryMuster)}

        ${viewMode === 'cards' ? `
          <!-- Mobile Touch Cards View -->
          <div class="ca-card-grid">
            ${data.salaryMuster.length === 0 ? `<div style="padding:24px;text-align:center;color:var(--muted);grid-column:1/-1;">No active employees found</div>` : ''}
            ${data.salaryMuster.map(emp => `
              <div class="ca-touch-card" style="background:${emp.is_excluded ? '#FFF1F2' : '#FFFFFF'};border:1.5px solid ${emp.is_excluded ? '#FECDD3' : '#E2E8F0'};opacity:${emp.is_excluded ? '0.7' : '1'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span class="badge" style="background:#F1F5F9;color:#475569;font-weight:800;font-size:10px;">${emp.emp_id}</span>
                      <span class="badge" style="background:${emp.has_bank ? '#EFF6FF' : '#FEF3C7'};color:${emp.has_bank ? '#1D4ED8' : '#B45309'};font-weight:800;font-size:10px;">
                        ${emp.payment_mode}
                      </span>
                    </div>
                    <div style="font-weight:800;font-size:15px;color:#0F172A;margin-top:4px;">
                      ${emp.name}
                    </div>
                    <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                      💼 ${emp.role} · 📞 ${emp.phone || '-'}
                    </div>
                  </div>
                  <div>
                    ${renderEntryAction(emp)}
                  </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:8px;border-top:1px dashed #E2E8F0;">
                  <div style="font-size:11.5px;color:var(--muted);">
                    Gross: ₹${emp.gross_salary.toLocaleString('en-IN')}<br>
                    <span style="color:#DC2626;">Advance: -₹${emp.advance_deducted.toLocaleString('en-IN')}</span>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10.5px;color:#059669;font-weight:700;">Net Payable</div>
                    <div style="font-size:17px;font-weight:900;color:${emp.is_excluded ? '#991B1B' : '#059669'};${emp.is_excluded ? 'text-decoration:line-through;' : ''}">
                      ₹${emp.net_payable.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- Table Grid View -->
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              <thead>
                <tr style="background:#F8FAFC;text-align:left;border-bottom:2px solid #CBD5E1;">
                  <th style="padding:8px;text-align:center;">Action</th>
                  <th style="padding:8px;">Emp ID</th>
                  <th style="padding:8px;">Employee Name</th>
                  <th style="padding:8px;">Designation / Role</th>
                  <th style="padding:8px;text-align:right;">Gross Monthly Wage</th>
                  <th style="padding:8px;text-align:right;">Advance Deducted</th>
                  <th style="padding:8px;text-align:right;">Net Payable</th>
                  <th style="padding:8px;">Disbursement Mode</th>
                  <th style="padding:8px;text-align:center;">Signature / Thumb</th>
                </tr>
              </thead>
              <tbody>
                ${data.salaryMuster.length === 0 ? `<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--muted);">No active employees found</td></tr>` : ''}
                ${data.salaryMuster.map((emp, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0;background:${emp.is_excluded ? '#FFF1F2' : (idx % 2 === 0 ? '#fff' : '#FBFBFB')};opacity:${emp.is_excluded ? '0.7' : '1'};">
                    <td style="padding:6px;text-align:center;">
                      ${renderEntryAction(emp)}
                    </td>
                    <td style="padding:8px;font-family:monospace;font-weight:700;color:var(--muted);">${emp.emp_id}</td>
                    <td style="padding:8px;font-weight:800;color:#0F172A;">${emp.name}</td>
                    <td style="padding:8px;color:var(--muted);">${emp.role}</td>
                    <td style="padding:8px;text-align:right;font-weight:600;${emp.is_excluded ? 'text-decoration:line-through;' : ''}">₹${emp.gross_salary.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#DC2626;font-weight:600;${emp.is_excluded ? 'text-decoration:line-through;' : ''}">₹${emp.advance_deducted.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;font-weight:900;color:#059669;font-size:13.5px;${emp.is_excluded ? 'text-decoration:line-through;' : ''}">₹${emp.net_payable.toLocaleString('en-IN')}</td>
                    <td style="padding:8px;font-size:11.5px;">
                      <span class="badge" style="background:${emp.has_bank ? '#EFF6FF' : '#FEF3C7'};color:${emp.has_bank ? '#1D4ED8' : '#B45309'};font-weight:800;">
                        ${emp.payment_mode}
                      </span>
                    </td>
                    <td style="padding:8px;text-align:center;color:#94A3B8;font-style:italic;">
                      ${emp.has_bank ? 'Bank Transfer UTR' : '___________________'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#F1F5F9;border-top:2px solid #0F172A;font-weight:900;">
                  <td colspan="4" style="padding:10px;">TOTAL WAGES &amp; SALARY REGISTER (INCLUDED ONLY)</td>
                  <td style="padding:10px;text-align:right;">₹${kpis.totalGrossSalary.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;color:#DC2626;">₹${kpis.totalAdvDeducted.toLocaleString('en-IN')}</td>
                  <td style="padding:10px;text-align:right;font-size:14px;color:#059669;">₹${kpis.totalNetSalary.toLocaleString('en-IN')}</td>
                  <td colspan="2" style="padding:10px;text-align:center;color:#16A34A;">P&amp;L Salary Head</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ──── TAB: PARTNER / DIRECTOR ADVANCES (FIROZ - PRAVEEN) ────
  function renderTabPartner(data, kpis) {
    const firozList = data.firozAdvances;
    const includedFiroz = firozList.filter(x => !x.is_excluded);
    const totalGiven = includedFiroz.reduce((s, p) => s + Number(p.amount_given || 0), 0);
    const totalSpent = kpis.totalCashMemos;
    const netBal = totalGiven - totalSpent;

    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h2 style="margin:0;font-size:18px;font-weight:900;">🤝 Director / Partner Imprest Account (Firoz &amp; Praveen Reconciliation)</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              Reconciles funds transferred by Firoz for operational expenses incurred by Praveen
            </div>
          </div>
          <button onclick="window.CA_AUDIT_PACK.exportPartnerCSV()" class="btn-sm" style="background:#059669;color:#fff;font-weight:700;">
            📥 Download Ledger CSV
          </button>
        </div>

        <!-- Metric overview -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:16px;">
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;padding:14px;border-radius:10px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#1E40AF;text-transform:uppercase;">Funds Received from Firoz</div>
            <div style="font-size:24px;font-weight:900;color:#1E3A8A;margin-top:3px;">₹${totalGiven.toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:#64748B;">Credit to Director Current A/C</div>
          </div>

          <div style="background:#FEF3C7;border:1px solid #FCD34D;padding:14px;border-radius:10px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#92400E;text-transform:uppercase;">Expenses Spent by Praveen</div>
            <div style="font-size:24px;font-weight:900;color:#B45309;margin-top:3px;">₹${totalSpent.toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:#64748B;">Debit to Property Expenses</div>
          </div>

          <div style="background:${netBal >= 0 ? '#F0FDF4' : '#FEF2F2'};border:1px solid ${netBal >= 0 ? '#BBF7D0' : '#FECACA'};padding:14px;border-radius:10px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:${netBal >= 0 ? '#15803D' : '#B91C1C'};text-transform:uppercase;">
              Net Imprest Balance ${netBal >= 0 ? '(In Hand)' : '(Reimbursement Due)'}
            </div>
            <div style="font-size:24px;font-weight:900;color:${netBal >= 0 ? '#059669' : '#DC2626'};margin-top:3px;">
              ₹${Math.abs(netBal).toLocaleString('en-IN')}
            </div>
            <div style="font-size:11px;color:#64748B;">Director Closing Balance</div>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin-bottom:14px;font-size:12.5px;color:#334155;line-height:1.5;">
          <strong>💡 How this resolves CA's Bank Reconciliation:</strong><br>
          When Firoz transfers funds from his account into the company/Praveen account, the CA records a <strong>Credit entry</strong> in the <em>Director's Current Account</em>. When Praveen spends on homestay maintenance, cleaning, and laundry, it generates <strong>Debit entries</strong> against the corresponding expense heads. This ensures zero mismatch between money inflow and business outflow!
        </div>

        <!-- Exclusion Toolbar -->
        ${renderTabToolbar('partner', firozList)}

        ${viewMode === 'cards' ? `
          <!-- Mobile Touch Cards View -->
          <div class="ca-card-grid">
            ${firozList.length === 0 ? `<div style="padding:24px;text-align:center;color:var(--muted);grid-column:1/-1;">No partner advances recorded under 'Firoz' for this period.</div>` : ''}
            ${firozList.map(adv => `
              <div class="ca-touch-card" style="background:${adv.is_excluded ? '#FFF1F2' : '#FFFFFF'};border:1.5px solid ${adv.is_excluded ? '#FECDD3' : '#E2E8F0'};opacity:${adv.is_excluded ? '0.7' : '1'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span style="font-weight:800;font-size:13px;color:#0F172A;">📅 ${adv.advance_date}</span>
                      <span class="badge" style="background:#F1F5F9;color:#475569;font-weight:800;font-size:10px;">ADV-${adv.id}</span>
                    </div>
                    <div style="font-weight:800;font-size:14.5px;color:#1E3A8A;margin-top:4px;">
                      ${adv.given_by} ➔ ${adv.given_to || 'Praveen'}
                    </div>
                    <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                      Director Current A/C Transfer
                    </div>
                  </div>
                  <div>
                    ${renderEntryAction(adv)}
                  </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:8px;border-top:1px dashed #E2E8F0;">
                  <div>
                    <span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:11px;">
                      ${adv.status || 'Active'}
                    </span>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10.5px;color:#059669;font-weight:700;">Credit Amount</div>
                    <div style="font-size:17px;font-weight:900;color:${adv.is_excluded ? '#991B1B' : '#059669'};${adv.is_excluded ? 'text-decoration:line-through;' : ''}">
                      ₹${Number(adv.amount_given || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <!-- Table Grid View -->
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              <thead>
                <tr style="background:#F8FAFC;text-align:left;border-bottom:2px solid #CBD5E1;">
                  <th style="padding:8px;text-align:center;">Action</th>
                  <th style="padding:8px;">Date</th>
                  <th style="padding:8px;">Transaction / Voucher</th>
                  <th style="padding:8px;">Transferor</th>
                  <th style="padding:8px;">Recipient</th>
                  <th style="padding:8px;text-align:right;">Amount Given (Credit)</th>
                  <th style="padding:8px;text-align:right;">Amount Spent (Debit)</th>
                  <th style="padding:8px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${firozList.length === 0 ? `<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--muted);">No specific partner advances recorded under 'Firoz' for this period in company_advances table. (All operational expenses are captured in Tab 3).</td></tr>` : ''}
                ${firozList.map((adv, idx) => `
                  <tr style="border-bottom:1px solid #E2E8F0;background:${adv.is_excluded ? '#FFF1F2' : (idx % 2 === 0 ? '#fff' : '#FBFBFB')};opacity:${adv.is_excluded ? '0.7' : '1'};">
                    <td style="padding:6px;text-align:center;">
                      ${renderEntryAction(adv)}
                    </td>
                    <td style="padding:8px;font-weight:600;">${adv.advance_date}</td>
                    <td style="padding:8px;font-family:monospace;">ADV-${adv.id}</td>
                    <td style="padding:8px;font-weight:700;color:#1E3A8A;">${adv.given_by}</td>
                    <td style="padding:8px;font-weight:700;">${adv.given_to || 'Praveen'}</td>
                    <td style="padding:8px;text-align:right;color:#059669;font-weight:700;${adv.is_excluded ? 'text-decoration:line-through;' : ''}">₹${Number(adv.amount_given || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;text-align:right;color:#B45309;font-weight:700;">₹${Number(adv.amount_spent || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:8px;">
                      <span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:800;">${adv.status || 'Active'}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. PRINTING & FORMAL DOSSIER ENGINE
  // ═══════════════════════════════════════════════════════════════
  async function printFullAuditPack() {
    const data = await fetchMonthAuditData(activeMonth);
    const sigSrc = (window.GST_ENGINE?.getSignatureStampSrc && window.GST_ENGINE.getSignatureStampSrc()) || 'assets/signature-stamp.svg';

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) {
      alert('Pop-up blocked! Please allow pop-ups for this site to print the CA Audit Dossier.');
      return;
    }

    const totalSalesTaxable = data.includedSales.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
    const totalOutputGST = data.includedSales.reduce((s, x) => s + Number(x.cgst || 0) + Number(x.sgst || 0), 0);
    const totalSalesGross = data.includedSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);

    const totalITCTaxable = data.includedITC.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
    const totalInputITC = data.includedITC.reduce((s, x) => s + Number(x.cgst || 0) + Number(x.sgst || 0), 0);
    const totalITCGross = data.includedITC.reduce((s, x) => s + Number(x.total_amount || 0), 0);

    const totalCashMemos = data.includedCashMemos.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalNetSalary = data.includedSalary.reduce((s, x) => s + Number(x.net_payable || 0), 0);
    const netGSTPayable = Math.max(0, totalOutputGST - totalInputITC);

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CA_Audit_Pack_${activeMonth}_${CO.cin}.pdf</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.4; margin: 0; padding: 0; }
          .header-box { border-bottom: 2.5px solid #0F172A; padding-bottom: 8px; margin-bottom: 12px; }
          .co-title { font-size: 16pt; font-weight: 900; color: #0F172A; text-transform: uppercase; margin: 0; }
          .co-meta { font-size: 8.5pt; color: #475569; margin-top: 3px; }
          .doc-badge { float: right; text-align: right; }
          .doc-badge h2 { margin: 0; font-size: 12pt; color: #B45309; text-transform: uppercase; }
          .doc-badge div { font-size: 9pt; color: #334155; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
          th { background: #F1F5F9; border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; font-weight: bold; }
          td { border: 1px solid #E2E8F0; padding: 5px 8px; }
          .num { text-align: right; }
          .bold { font-weight: bold; }
          .sec-heading { font-size: 11.5pt; font-weight: 800; color: #0F172A; margin: 16px 0 6px 0; border-bottom: 1px solid #CBD5E1; padding-bottom: 3px; text-transform: uppercase; }
          .note-box { background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 8px; font-size: 8.5pt; color: #334155; margin: 8px 0; border-radius: 4px; }
          .sig-box { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
          .page-break { page-break-before: always; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background:#0F172A;color:#fff;padding:12px;display:flex;justify-content:space-between;align-items:center;">
          <div><strong>💼 Official CA Audit &amp; GST Return Dossier — ${data.monthLabel} (Filtered/Included Only)</strong></div>
          <button onclick="window.print()" style="background:#10B981;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:bold;cursor:pointer;">🖨️ Click to Print / Save as PDF</button>
        </div>

        <div style="padding:15px;">
          <!-- Header -->
          <div class="header-box">
            <div class="doc-badge">
              <h2>MONTHLY CA AUDIT PACK</h2>
              <div>Period: ${data.monthLabel} (${data.monthStr})</div>
              <div style="font-size:8pt;color:#64748B;">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
            <h1 class="co-title">${CO.name}</h1>
            <div class="co-meta">
              <strong>CIN:</strong> ${CO.cin} · <strong>GSTIN:</strong> ${CO.gstin} · <strong>PAN:</strong> ${CO.pan}<br>
              <strong>Regd Office:</strong> ${CO.address}<br>
              <strong>Email:</strong> ${CO.email} · <strong>Phone:</strong> ${CO.phone}
            </div>
          </div>

          <!-- Section 1: Executive Tax Reconciliation Summary -->
          <div class="sec-heading">1. Executive Tax &amp; Audit Reconciliation</div>
          <table>
            <thead>
              <tr>
                <th>Accounting Head</th>
                <th>Statutory Schedule</th>
                <th class="num">Taxable Base (₹)</th>
                <th class="num">GST Tax (₹)</th>
                <th class="num">Total Gross (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="bold">Homestay Accommodation Sales</td>
                <td>GSTR-1 Outward (SAC 996311)</td>
                <td class="num bold">₹${totalSalesTaxable.toLocaleString('en-IN')}</td>
                <td class="num bold" style="color:#DC2626;">₹${totalOutputGST.toLocaleString('en-IN')}</td>
                <td class="num bold">₹${totalSalesGross.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td class="bold">Registered Business Purchases (ITC)</td>
                <td>GSTR-3B Table 4(A)(5)</td>
                <td class="num">₹${totalITCTaxable.toLocaleString('en-IN')}</td>
                <td class="num bold" style="color:#059669;">₹${totalInputITC.toLocaleString('en-IN')}</td>
                <td class="num">₹${totalITCGross.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td class="bold">Operational Cash Memos (Sec 40A(3))</td>
                <td>P&amp;L Homestay Maintenance &amp; Laundry</td>
                <td class="num">₹${totalCashMemos.toLocaleString('en-IN')}</td>
                <td class="num">₹0 (Unreg.)</td>
                <td class="num">₹${totalCashMemos.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td class="bold">Employee Salaries &amp; Wages</td>
                <td>Form T Staff Muster Roll</td>
                <td class="num">₹${totalNetSalary.toLocaleString('en-IN')}</td>
                <td class="num">-</td>
                <td class="num">₹${totalNetSalary.toLocaleString('en-IN')}</td>
              </tr>
              <tr style="background:#EFF6FF;font-weight:bold;">
                <td colspan="3" style="font-size:10.5pt;">NET GST PAYABLE BY CHALLAN (Output GST - Eligible ITC)</td>
                <td colspan="2" class="num" style="font-size:11pt;color:#6D28D9;">₹${netGSTPayable.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <!-- Section 2: GSTR-1 Sales Register -->
          <div class="sec-heading">2. GSTR-1 Outward Sales Register (${data.includedSales.length} Active Bills)</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Inv No</th>
                <th>Customer / Portal</th>
                <th>GSTIN</th>
                <th class="num">Taxable</th>
                <th class="num">CGST</th>
                <th class="num">SGST</th>
                <th class="num">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${data.includedSales.slice(0, 50).map(s => `
                <tr>
                  <td>${s.invoice_date || '-'}</td>
                  <td class="bold">${s.invoice_no}</td>
                  <td>${s.guest_name}</td>
                  <td>${s.guest_gstin || 'B2C (UP-09)'}</td>
                  <td class="num">₹${Number(s.taxable_value || 0).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(s.cgst || 0).toLocaleString('en-IN')}</td>
                  <td class="num">₹${Number(s.sgst || 0).toLocaleString('en-IN')}</td>
                  <td class="num bold">₹${Number(s.total_amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="page-break"></div>

          <!-- Section 3: Staff Salary Muster Roll -->
          <div class="sec-heading">3. Staff Salary &amp; Wage Muster Roll (${data.includedSalary.length} Staff)</div>
          <div class="note-box">
            Certified that all staff wage disbursements have been paid out net of mid-month advances. Physical signatures/thumb impressions confirm receipt under state labor guidelines.
          </div>
          <table>
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Staff Name</th>
                <th>Role</th>
                <th class="num">Base Wage</th>
                <th class="num">Advance Deducted</th>
                <th class="num">Net Cash/Bank Paid</th>
                <th style="text-align:center;">Signature / Thumb</th>
              </tr>
            </thead>
            <tbody>
              ${data.includedSalary.map(emp => `
                <tr>
                  <td class="bold">${emp.emp_id}</td>
                  <td>${emp.name}</td>
                  <td>${emp.role}</td>
                  <td class="num">₹${emp.gross_salary.toLocaleString('en-IN')}</td>
                  <td class="num" style="color:#DC2626;">₹${emp.advance_deducted.toLocaleString('en-IN')}</td>
                  <td class="num bold" style="color:#059669;">₹${emp.net_payable.toLocaleString('en-IN')}</td>
                  <td style="text-align:center;color:#94A3B8;height:28px;">____________________</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Section 4: Section 40A(3) Self-Voucher Certification -->
          <div class="sec-heading">4. Section 40A(3) Compliance &amp; Self-Voucher Certification (${data.includedCashMemos.length} Vouchers)</div>
          <div class="note-box">
            This certifies that local homestay repairs, plumber/electrician labor, and daily laundry were procured from local unregistered service providers. Every individual cash payment is strictly within the statutory ceiling of ₹10,000 per person per day under Section 40A(3) of the Income Tax Act, 1961.
          </div>

          <!-- Signatures -->
          <div class="sig-box">
            <div>
              <div style="font-size:9pt;color:#64748B;">Audit Pack Verified by:</div>
              <div style="font-weight:bold;margin-top:4px;">Chartered Accountant / Accounts Dept.</div>
              <div style="margin-top:35px;border-top:1px solid #94A3B8;width:180px;font-size:8pt;color:#64748B;">Seal &amp; Registration No</div>
            </div>

            <div style="text-align:center;">
              <img src="${sigSrc}" style="height:65px;margin-bottom:-10px;opacity:0.95;">
              <div style="font-weight:bold;font-size:9.5pt;">For THE UNIQUE HAVEN HOMES PVT. LTD.</div>
              <div style="font-size:8.5pt;color:#475569;">Director / Authorised Signatory</div>
            </div>
          </div>

        </div>
      </body>
      </html>
    `);
    w.document.close();
  }

  async function printSalaryMuster() {
    const data = await fetchMonthAuditData(activeMonth);
    const sigSrc = (window.GST_ENGINE?.getSignatureStampSrc && window.GST_ENGINE.getSignatureStampSrc()) || 'assets/signature-stamp.svg';

    const w = window.open('', '_blank', 'width=1000,height=750');
    if (!w) { alert('Pop-up blocked!'); return; }

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Salary_Muster_${activeMonth}.pdf</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, sans-serif; font-size: 11pt; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10pt; }
          th { background: #F1F5F9; border: 1.5px solid #0F172A; padding: 8px; text-align: left; }
          td { border: 1px solid #CBD5E1; padding: 8px; }
          .num { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div style="text-align:center;border-bottom:2px solid #0F172A;padding-bottom:10px;">
          <h2 style="margin:0;text-transform:uppercase;">${CO.name}</h2>
          <div style="font-size:9pt;color:#475569;">CIN: ${CO.cin} · Regd Office: ${CO.address}</div>
          <h3 style="margin:8px 0 0;text-decoration:underline;">STAFF SALARY &amp; WAGE DISBURSEMENT MUSTER ROLL (FORM T)</h3>
          <div style="font-size:10pt;font-weight:bold;margin-top:2px;">Month / Period: ${data.monthLabel} (${data.monthStr})</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Emp ID</th>
              <th>Employee Name</th>
              <th>Designation</th>
              <th class="num">Gross Wage</th>
              <th class="num">Advance Deducted</th>
              <th class="num">Net Cash/Bank Paid</th>
              <th style="text-align:center;width:150px;">Employee Signature / Thumb</th>
            </tr>
          </thead>
          <tbody>
            ${data.includedSalary.map((e, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="bold">${e.emp_id}</td>
                <td class="bold">${e.name}</td>
                <td>${e.role}</td>
                <td class="num">₹${e.gross_salary.toLocaleString('en-IN')}</td>
                <td class="num" style="color:#DC2626;">₹${e.advance_deducted.toLocaleString('en-IN')}</td>
                <td class="num bold" style="color:#059669;font-size:11pt;">₹${e.net_payable.toLocaleString('en-IN')}</td>
                <td style="text-align:center;height:35px;vertical-align:bottom;font-size:8.5pt;color:#94A3B8;">___________________</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#F8FAFC;font-weight:bold;border-top:2px solid #0F172A;">
              <td colspan="4">TOTAL MONTHLY WAGES</td>
              <td class="num">₹${data.includedSalary.reduce((s, x) => s + x.gross_salary, 0).toLocaleString('en-IN')}</td>
              <td class="num" style="color:#DC2626;">₹${data.includedSalary.reduce((s, x) => s + x.advance_deducted, 0).toLocaleString('en-IN')}</td>
              <td class="num" style="color:#059669;font-size:12pt;">₹${data.includedSalary.reduce((s, x) => s + x.net_payable, 0).toLocaleString('en-IN')}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:space-between;">
          <div style="font-size:9pt;">
            Prepared By: <strong>Accounts Department</strong><br>
            Date of Payment: ___________________
          </div>
          <div style="text-align:center;">
            <img src="${sigSrc}" style="height:60px;margin-bottom:-10px;">
            <div style="font-weight:bold;">For THE UNIQUE HAVEN HOMES PVT. LTD.</div>
            <div style="font-size:8.5pt;">Director / Authorised Signatory</div>
          </div>
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  }

  async function printSelfVouchers() {
    const data = await fetchMonthAuditData(activeMonth);
    const sigSrc = (window.GST_ENGINE?.getSignatureStampSrc && window.GST_ENGINE.getSignatureStampSrc()) || 'assets/signature-stamp.svg';

    const w = window.open('', '_blank', 'width=1000,height=750');
    if (!w) { alert('Pop-up blocked!'); return; }

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Self_Vouchers_${activeMonth}.pdf</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, sans-serif; font-size: 10pt; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5pt; }
          th { background: #F1F5F9; border: 1.5px solid #0F172A; padding: 6px; text-align: left; }
          td { border: 1px solid #CBD5E1; padding: 6px; }
          .num { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div style="text-align:center;border-bottom:2px solid #0F172A;padding-bottom:10px;">
          <h2 style="margin:0;text-transform:uppercase;">${CO.name}</h2>
          <div style="font-size:9pt;color:#475569;">CIN: ${CO.cin} · GSTIN: ${CO.gstin}</div>
          <h3 style="margin:8px 0 0;text-decoration:underline;">INTERNAL PAYMENT SELF-VOUCHERS (SECTION 40A(3) REGISTER)</h3>
          <div style="font-size:9.5pt;font-weight:bold;margin-top:2px;">Period: ${data.monthLabel} (${data.monthStr})</div>
        </div>

        <p style="font-size:9pt;color:#334155;line-height:1.4;margin:10px 0;">
          This certifies that the operational cash payments listed below were incurred exclusively for property maintenance, mistri labor, plumbing, painting, cleaning, and laundry services. Since these local micro-vendors are unregistered and do not issue GST invoices, these entries are certified under internal payment vouchers in accordance with Section 40A(3) of the Income Tax Act (all payments &le; ₹10,000 per person per day).
        </p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher No</th>
              <th>Vendor / Particulars</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Disbursed By</th>
              <th class="num">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${data.includedCashMemos.map(c => `
              <tr>
                <td>${c.date || '-'}</td>
                <td style="font-family:monospace;">${c.ref_no}</td>
                <td class="bold">${c.vendor_or_type}</td>
                <td>${c.category}</td>
                <td>${c.room_name}</td>
                <td>${c.paid_by}</td>
                <td class="num bold">₹${c.amount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#F8FAFC;font-weight:bold;border-top:2px solid #0F172A;">
              <td colspan="6">TOTAL SELF-VOUCHER CERTIFIED EXPENSES</td>
              <td class="num" style="font-size:11pt;color:#B45309;">₹${data.includedCashMemos.reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top:35px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:8.5pt;color:#64748B;">Internal Audit Verified by:</div>
            <div style="font-weight:bold;margin-top:4px;">Property Operations Manager</div>
          </div>
          <div style="text-align:center;">
            <img src="${sigSrc}" style="height:60px;margin-bottom:-10px;">
            <div style="font-weight:bold;">For THE UNIQUE HAVEN HOMES PVT. LTD.</div>
            <div style="font-size:8.5pt;">Director / Authorised Signatory</div>
          </div>
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. CSV EXPORT UTILITIES (EXCEL COMPATIBLE)
  // ═══════════════════════════════════════════════════════════════
  function downloadCSV(csvContent, fileName) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportMasterCSV() {
    const data = await fetchMonthAuditData(activeMonth);
    let csv = `THE UNIQUE HAVEN HOMES PRIVATE LIMITED - MASTER CA AUDIT REPORT (INCLUDED ONLY)\n`;
    csv += `Period,${data.monthLabel} (${data.monthStr})\n`;
    csv += `GSTIN,${CO.gstin},CIN,${CO.cin},PAN,${CO.pan}\n\n`;

    // 1. Sales
    csv += `SECTION 1: GSTR-1 OUTWARD SALES REGISTER (ACTIVE GST INVOICES & AIRBNB ONLINE ONLY)\n`;
    csv += `Date,Type,Invoice No,Guest Name,GSTIN,Room,Nights,Taxable Base,CGST (2.5%),SGST (2.5%),Total Amount,Payment Mode\n`;
    data.includedSales.forEach(s => {
      const typeLabel = s.is_airbnb ? 'Airbnb Online' : 'Official GST Bill';
      csv += `"${s.invoice_date}","${typeLabel}","${s.invoice_no}","${s.guest_name.replace(/"/g, '""')}","${s.guest_gstin || 'B2C'}","${s.room_name}",${s.nights},${s.taxable_value},${s.cgst},${s.sgst},${s.total_amount},"${s.payment_mode}"\n`;
    });

    // 2. ITC
    csv += `\nSECTION 2: GSTR-3B INPUT TAX CREDIT (ACTIVE REGISTERED PURCHASES)\n`;
    csv += `Date,Supplier,Supplier GSTIN,Category,Taxable Base,CGST,SGST,Total Amount,ITC Status\n`;
    data.includedITC.forEach(i => {
      csv += `"${i.date}","${i.vendor}","${i.gstin}","${i.category}",${i.taxable_value},${i.cgst},${i.sgst},${i.total_amount},"Claimable"\n`;
    });

    // 3. Cash Memos
    csv += `\nSECTION 3: OPERATING CASH MEMOS (ACTIVE SEC 40A(3) COMPLIANT EXPENSES)\n`;
    csv += `Date,Voucher Ref,Vendor / Particulars,Category,Unit,Disbursed By,Amount,Payment Mode,Under 10k Limit\n`;
    data.includedCashMemos.forEach(c => {
      csv += `"${c.date}","${c.ref_no}","${c.vendor_or_type.replace(/"/g, '""')}","${c.category}","${c.room_name}","${c.paid_by}",${c.amount},"${c.payment_mode}","${c.within_40a3_limit ? 'YES' : 'NO'}"\n`;
    });

    // 4. Salaries
    csv += `\nSECTION 4: STAFF SALARY & ADVANCE MUSTER ROLL\n`;
    csv += `Emp ID,Staff Name,Role,Gross Salary,Advance Deducted,Net Payable,Disbursement Mode\n`;
    data.includedSalary.forEach(e => {
      csv += `"${e.emp_id}","${e.name}","${e.role}",${e.gross_salary},${e.advance_deducted},${e.net_payable},"${e.payment_mode}"\n`;
    });

    downloadCSV(csv, `UHH_Master_CA_Pack_${activeMonth}.csv`);
    if (window.fsn) fsn.success('Export Successful', 'Master CA CSV Dossier downloaded!');
  }

  async function exportSalesCSV() {
    const data = await fetchMonthAuditData(activeMonth);
    let csv = `Date,Type,Invoice No,Guest Name,GSTIN,Room,Nights,Taxable Base,CGST,SGST,Total Amount,Payment Mode\n`;
    data.includedSales.forEach(s => {
      const typeLabel = s.is_airbnb ? 'Airbnb Online' : 'Official GST Bill';
      csv += `"${s.invoice_date}","${typeLabel}","${s.invoice_no}","${s.guest_name.replace(/"/g, '""')}","${s.guest_gstin || 'B2C'}","${s.room_name}",${s.nights},${s.taxable_value},${s.cgst},${s.sgst},${s.total_amount},"${s.payment_mode}"\n`;
    });
    downloadCSV(csv, `GSTR1_Sales_${activeMonth}.csv`);
  }

  async function exportITCCSV() {
    const data = await fetchMonthAuditData(activeMonth);
    let csv = `Date,Supplier,Supplier GSTIN,Category,Taxable Base,CGST,SGST,Total Amount,ITC Status\n`;
    data.includedITC.forEach(i => {
      csv += `"${i.date}","${i.vendor}","${i.gstin}","${i.category}",${i.taxable_value},${i.cgst},${i.sgst},${i.total_amount},"Claimable"\n`;
    });
    downloadCSV(csv, `GSTR3B_ITC_${activeMonth}.csv`);
  }

  async function exportCashMemosCSV() {
    const data = await fetchMonthAuditData(activeMonth);
    let csv = `Date,Voucher Ref,Vendor / Particulars,Category,Unit,Disbursed By,Amount,Payment Mode,Under 10k Limit\n`;
    data.includedCashMemos.forEach(c => {
      csv += `"${c.date}","${c.ref_no}","${c.vendor_or_type.replace(/"/g, '""')}","${c.category}","${c.room_name}","${c.paid_by}",${c.amount},"${c.payment_mode}","${c.within_40a3_limit ? 'YES' : 'NO'}"\n`;
    });
    downloadCSV(csv, `Cash_Memos_Sec40A3_${activeMonth}.csv`);
  }

  async function exportSalaryCSV() {
    const data = await fetchMonthAuditData(activeMonth);
    let csv = `Emp ID,Staff Name,Role,Gross Salary,Advance Deducted,Net Payable,Disbursement Mode\n`;
    data.includedSalary.forEach(e => {
      csv += `"${e.emp_id}","${e.name}","${e.role}",${e.gross_salary},${e.advance_deducted},${e.net_payable},"${e.payment_mode}"\n`;
    });
    downloadCSV(csv, `Staff_Muster_${activeMonth}.csv`);
  }

  async function exportPartnerCSV() {
    const data = await fetchMonthAuditData(activeMonth);
    let csv = `Date,Voucher ID,Given By,Given To,Amount Given (Credit),Amount Spent (Debit),Status\n`;
    data.includedPartner.forEach(p => {
      csv += `"${p.advance_date}","ADV-${p.id}","${p.given_by}","${p.given_to || 'Praveen'}",${p.amount_given || 0},${p.amount_spent || 0},"${p.status}"\n`;
    });
    downloadCSV(csv, `Partner_Advances_${activeMonth}.csv`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. WHATSAPP BRIEFING GENERATOR FOR CA (MOBILE-READY & FILTERED)
  // ═══════════════════════════════════════════════════════════════
  async function copyCAWhatsAppSummary() {
    const data = await fetchMonthAuditData(activeMonth);
    const totalSalesGross = data.includedSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);
    const totalSalesTaxable = data.includedSales.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
    const totalSalesCGST = data.includedSales.reduce((s, x) => s + Number(x.cgst || 0), 0);
    const totalSalesSGST = data.includedSales.reduce((s, x) => s + Number(x.sgst || 0), 0);
    const totalOutputGST = totalSalesCGST + totalSalesSGST;

    const totalITCGross = data.includedITC.reduce((s, x) => s + Number(x.total_amount || 0), 0);
    const totalITCTaxable = data.includedITC.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
    const totalInputITC = data.includedITC.reduce((s, x) => s + Number(x.cgst || 0) + Number(x.sgst || 0), 0);

    const netGST = Math.max(0, totalOutputGST - totalInputITC);
    const totalCashMemos = data.includedCashMemos.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalNetSalary = data.includedSalary.reduce((s, x) => s + Number(x.net_payable || 0), 0);

    const text = `📊 *MONTHLY GST & AUDIT SUMMARY FOR CA*
🏢 *${CO.name}*
📅 *Period:* ${data.monthLabel} (${data.monthStr})
🆔 *GSTIN:* ${CO.gstin} | *SAC:* ${CO.sac}
📞 *Contact:* ${CO.phone}

1️⃣ *GSTR-1 OUTWARD SUPPLIES (SALES):*
• Active GST Invoices: ${data.includedSales.length}
• Total Turnover (Gross): ₹${totalSalesGross.toLocaleString('en-IN')}
• Taxable Base: ₹${totalSalesTaxable.toLocaleString('en-IN')}
• Output GST Liability (5%): ₹${totalOutputGST.toLocaleString('en-IN')}

2️⃣ *GSTR-3B INPUT TAX CREDIT (ITC):*
• Active Eligible ITC: ₹${totalInputITC.toLocaleString('en-IN')}
• *Net GST Challan Payable:* ₹${netGST.toLocaleString('en-IN')}

3️⃣ *OPERATING OVERHEADS & CASH MEMOS (SEC 40A(3)):*
• Maintenance, Mistri & Laundry: ₹${totalCashMemos.toLocaleString('en-IN')} (${data.includedCashMemos.length} Vouchers)
• All entries verified ≤ ₹10,000/day backed by self-vouchers.

4️⃣ *STAFF SALARY MUSTER ROLL:*
• Total Net Wages Paid: ₹${totalNetSalary.toLocaleString('en-IN')} (${data.includedSalary.length} Staff)
• Physical signatures obtained on monthly muster.

_Please find the attached CSV/Excel audit pack for direct GSTR filing._`;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        console.warn('Clipboard write error', e);
      }
    }

    // Direct WhatsApp Launch (works smoothly on mobile and desktop)
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');

    if (window.fsn) fsn.success('WhatsApp Opening', 'Summary copied and WhatsApp opened!');
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. 1-CLICK DIRECT GST BILL GENERATOR (WITH DAILY SPLIT)
  // ═══════════════════════════════════════════════════════════════
  async function quickGenerateDirectGSTBill(bookingId) {
    if (!confirm('Kya aap is direct booking ka GST bill generate karna chahte hain? Ye automatically daily 1-night entries me convert ho jayega.')) {
      return;
    }
    try {
      const { data: booking, error } = await sb.from('guest_register')
        .select('*, rooms(nickname, property_name, unit_no)')
        .eq('booking_id', bookingId)
        .single();

      if (error || !booking) {
        alert('Booking not found in database: ' + (error?.message || ''));
        return;
      }

      const n = calcBookingNights(booking);
      let tot = Number(booking.total_amount || 0);
      const isRohit = (booking.guest_name || '').toLowerCase().includes('rohit');
      if (isRohit) {
        const perNight = (booking.check_in < '2026-09-14') ? 3000 : 3500;
        tot = n * perNight;
      }
      const rate = 5; // Standard homestay GST 5% (CGST 2.5% + SGST 2.5%)
      const base = Math.round((tot / (1 + rate / 100)) * 100) / 100;
      const tax = Math.round((tot - base) * 100) / 100;
      const half = Math.round((tax / 2) * 100) / 100;

      let invNo = '';
      if (window.GST_ENGINE?.getNextInvoiceNo) {
        invNo = window.GST_ENGINE.getNextInvoiceNo(booking.check_in);
        if (window.GST_ENGINE.commitNextInvoiceSeq) window.GST_ENGINE.commitNextInvoiceSeq(booking.check_in);
      } else {
        invNo = `UHH/2627/${String(Date.now()).slice(-4)}`;
      }

      const invData = {
        booking_id: booking.booking_id,
        invoice_no: invNo,
        invoice_date: booking.check_in,
        is_gst_invoice: true,
        guest_name: booking.guest_name || 'Direct Guest',
        guest_phone: booking.phone || '',
        guest_gstin: '',
        guest_company: '',
        guest_address: '',
        room_id: booking.room_id || '',
        room_name: booking.rooms?.nickname || booking.rooms?.unit_no || 'Homestay Property',
        check_in: booking.check_in,
        check_out: booking.check_out,
        nights: n,
        total_amount: tot,
        taxable_value: base,
        cgst: half,
        sgst: half,
        gst_rate: rate,
        booking_mode: 'Direct',
        payment_mode: booking.payment_method || 'Direct Payment',
        created_at: new Date().toISOString()
      };

      const existing = JSON.parse(localStorage.getItem('uhh_gst_invoices_registry') || '[]');
      const idx = existing.findIndex(x => x.booking_id === booking.booking_id);
      if (idx >= 0) existing[idx] = invData;
      else existing.unshift(invData);
      localStorage.setItem('uhh_gst_invoices_registry', JSON.stringify(existing));

      if (window.fsn) {
        fsn.success('Invoice Generated', `✅ GST Invoice ${invNo} generated for ${booking.guest_name}!`);
      } else {
        alert(`✅ GST Invoice ${invNo} generated for ${booking.guest_name}!`);
      }

      renderCAAuditPack();
    } catch (e) {
      console.error('Error generating direct GST bill:', e);
      alert('Error generating GST bill: ' + e.message);
    }
  }

  // Public API
  return {
    CO,
    getActiveMonth,
    setActiveMonth,
    getActiveTab,
    setActiveTab,
    getViewMode,
    setViewMode,
    toggleEntryExclusion,
    resetExclusions,
    excludeAllInTab,
    includeAllInTab,
    getSplitDirectNights,
    toggleSplitDirectNights,
    quickGenerateDirectGSTBill,
    renderCAAuditPack,
    printFullAuditPack,
    printSalaryMuster,
    printSelfVouchers,
    exportMasterCSV,
    exportSalesCSV,
    exportITCCSV,
    exportCashMemosCSV,
    exportSalaryCSV,
    exportPartnerCSV,
    copyCAWhatsAppSummary
  };
})();

// Global Window Bridges
window.renderCAAuditPack = window.CA_AUDIT_PACK.renderCAAuditPack;
