// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB CSV SYNC — Robust & Fixed Version
// ═══════════════════════════════════════════════════════════

(function() {
  const SYNC = window.SYNC = {
    csvData: [],
    reservations: [],
    allReservations: [],
    payouts: [],
    rooms: [],
    existingByCode: {},
    existingByGuest: [],
    possiblyCancelled: [],
    fromDate: '2026-07-01',
    toDate: new Date().toISOString().slice(0, 10)
  };

  // Persistent booking store — survives JS reloads, keyed by confirmation_code
  window._csvBookings = window._csvBookings || {};

  // ─── Date parser — handles MM/DD/YYYY (Airbnb standard) and DD/MM/YYYY ───
  let _detectedCsvDateFormat = 'MM/DD/YYYY';

  function parseDate(str, preferredFormat = null) {
    if (!str) return null;
    str = String(str).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        let [a, b, y] = parts.map(p => p.trim());
        const aNum = parseInt(a, 10), bNum = parseInt(b, 10);
        if (y.length === 4) {
          let d, m;
          const fmt = preferredFormat || _detectedCsvDateFormat || 'MM/DD/YYYY';
          if (bNum > 12) {
            // b > 12: b must be Day, a is Month (MM/DD/YYYY)
            d = b; m = a;
          } else if (aNum > 12) {
            // a > 12: a must be Day, b is Month (DD/MM/YYYY)
            d = a; m = b;
          } else if (fmt === 'DD/MM/YYYY') {
            d = a; m = b;
          } else {
            // Default Airbnb CSV format is MM/DD/YYYY: a is Month, b is Day
            d = b; m = a;
          }
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return str;
  }

  // Cross-checks check-in and check-out with nights count to prevent day/month flips
  function parseDatePair(sDateStr, eDateStr, nightsHint = 0) {
    let checkIn = parseDate(sDateStr);
    let checkOut = parseDate(eDateStr);

    if (checkIn && checkOut && nightsHint > 0) {
      const diffDays = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
      if (diffDays !== nightsHint) {
        const altIn = parseDate(sDateStr, _detectedCsvDateFormat === 'MM/DD/YYYY' ? 'DD/MM/YYYY' : 'MM/DD/YYYY');
        const altOut = parseDate(eDateStr, _detectedCsvDateFormat === 'MM/DD/YYYY' ? 'DD/MM/YYYY' : 'MM/DD/YYYY');
        const altDiff = Math.round((new Date(altOut) - new Date(altIn)) / 86400000);
        if (altDiff === nightsHint) {
          checkIn = altIn;
          checkOut = altOut;
        }
      }
    }
    return { checkIn, checkOut };
  }

  function fmtNum(n) {
    return (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function fmtDate(d) {
    if (!d) return '-';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Calculate Net "You Earn" from CSV Earnings (after 3% fee & 5% TDS)
  function csvEarningsToYouEarn(earnings) {
    const e = Number(earnings) || 0;
    if (e <= 0) return 0;
    return Math.round(e * 0.92 / 0.97 * 100) / 100;
  }

  // ─── Proper CSV parser (handles commas inside quotes & ₹ symbols) ───
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const parseLine = (line) => {
      const out = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    };
    const headers = parseLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, '').replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const row = {};
      headers.forEach((h, i) => { 
        row[h] = (values[i] || '').trim().replace(/^"|"$/g, ''); 
      });
      return row;
    });
  }

  // ─── Match Airbnb listing → your room_id ───
  SYNC.getRoomIdByListing = function(listingName) {
    if (!listingName) return null;
    const l = listingName.toLowerCase();
    if (l.includes('pink paradise') || l.includes('vil-108')) return 'VIL-108';
    if (l.includes('yellow house') || l.includes('vil-105')) return 'VIL-105';
    if (l.includes('green forest') || l.includes('vil-106')) return 'VIL-106';
    if (l.includes('celebrity') || l.includes('lul-402')) return 'LUL-402';
    if (l.includes('unique') || l.includes('gom-302')) return 'GOM-302';
    if (l.includes('light green') || l.includes('gom-301')) return 'GOM-301';
    if (l.includes('starlight') || l.includes('penthouse') || l.includes('gom-501')) return 'GOM-501';
    if (l.includes('black beauty') || l.includes('gom-102')) return 'GOM-102';
    if (l.includes('nawabi') || l.includes('gom-401')) return 'GOM-401';
    if (l.includes('gomti grand') || l.includes('vil-101')) return 'VIL-101';
    if (l.includes('green house') || l.includes('vil-104')) return 'VIL-104';
    if (l.includes('pink house') || l.includes('vil-103')) return 'VIL-103';
    if (l.includes('brown') || l.includes('gom-202')) return 'GOM-202';
    if (l.includes('velvet') || l.includes('vil-107')) return 'VIL-107';
    if (l.includes('royal white') || l.includes('vil-102')) return 'VIL-102';
    if (l.includes('dark blue') || l.includes('gom-201')) return 'GOM-201';
    if (l.includes('redrose') || l.includes('gom-101')) return 'GOM-101';
    return null;
  };

  let _activeSyncTab = 'reservations'; // 'reservations' | 'payouts'

  window.setAirbnbSyncTab = function(tab) {
    _activeSyncTab = tab;
    renderAirbnbSync(tab);
  };

  // ─── Main render ───
  async function renderAirbnbSync(tab = _activeSyncTab) {
    _activeSyncTab = tab;
    window._airbnbTabsHtml = `
      <div class="card" style="padding:10px;margin-bottom:14px;border:1px solid #E2E8F0;background:#FFFFFF;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="setAirbnbSyncTab('reservations')" style="flex:1;min-width:160px;padding:9px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;background:${tab==='reservations'?'#2563EB':'#F8FAFC'};color:${tab==='reservations'?'#fff':'#334155'};border:1.5px solid ${tab==='reservations'?'#1D4ED8':'#CBD5E1'};">📁 Reservations CSV</button>
          <button onclick="setAirbnbSyncTab('payouts')" style="flex:1;min-width:210px;padding:9px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;background:${tab==='payouts'?'#059669':'#F8FAFC'};color:${tab==='payouts'?'#fff':'#334155'};border:1.5px solid ${tab==='payouts'?'#047857':'#CBD5E1'};">💰 Monthly Payouts / Payment Updater</button>
          <button onclick="renderIcalSync()" class="secondary" style="flex:1;min-width:140px;padding:9px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">📅 iCal Auto-Sync</button>
        </div>
      </div>`;
    
    if (!['developer', 'owner'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'airbnb-sync');
      return;
    }

    const { data: rooms } = await sb.from('rooms')
      .select('room_id, unit_no, nickname, property_name')
      .order('unit_no');
    SYNC.rooms = rooms || [];

    const { data: existing } = await sb.from('guest_register')
      .select('booking_id, airbnb_confirmation_code, guest_name, check_in, check_out, total_amount, room_id, booking_mode, payment_status, is_cancelled, rooms(unit_no, nickname)')
      .order('check_in', { ascending: false })
      .limit(1500);

    SYNC.existingByCode = {};
    SYNC.existingByGuest = existing || [];
    (existing || []).forEach(e => {
      if (e.airbnb_confirmation_code) SYNC.existingByCode[e.airbnb_confirmation_code] = e;
    });

    if (tab === 'payouts') {
      renderShell(`
        ${window._airbnbTabsHtml || ''}
        <div class="wrap">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <h1 style="margin:0;font-size:22px;color:#0F172A;">💰 Airbnb Monthly Payouts & Net Earnings Updater</h1>
          </div>
          <p style="color:#64748B;font-size:13px;margin-top:2px;">
            Upload your official <strong>Monthly Payouts / Tax CSV</strong> from Airbnb (e.g. <code>airbnb_09_2026-09_2026.csv</code>).
            The system will automatically calculate the exact bank settlement after <strong>Host Service Fees (15.5%)</strong> and <strong>Indian Income Tax (5% Section 194-O TDS)</strong>, and update all CRM booking amounts to the exact rupee.
          </p>

          <div class="card" style="border-left:4px solid #059669;background:#ECFDF5;margin-bottom:14px;">
            <div class="section-title" style="color:#065F46;font-size:14px;font-weight:800;margin-bottom:6px;">📖 HOW TO EXPORT FROM AIRBNB</div>
            <div style="line-height:1.9;font-size:12.5px;color:#064E3B;">
              <div><strong>Step 1:</strong> Go to <a href="https://www.airbnb.co.in/hosting/earnings" target="_blank" style="color:#059669;font-weight:800;text-decoration:underline;">Airbnb Hosting ➔ Earnings ↗</a></div>
              <div><strong>Step 2:</strong> Under <strong>"Completed payouts"</strong>, select the target month (e.g. September 2026) and click <strong>"Export CSV"</strong>.</div>
              <div><strong>Step 3:</strong> Upload the downloaded CSV below — all reservation amounts, TDS withholdings, and host fees will be matched with CRM bookings.</div>
              <div><strong>Step 4:</strong> Click <strong>"⚡ Update All Payments"</strong> to sync exact net earnings across your bookings and payment ledger!</div>
            </div>
          </div>

          <div class="card" style="margin-bottom:14px;">
            <div class="section-title" style="font-size:14px;font-weight:700;margin-bottom:8px;">📁 Upload Monthly Payouts CSV (e.g. airbnb_09_2026-09_2026.csv)</div>
            <input type="file" id="airbnbPayoutCsvFile" accept=".csv" onchange="handleAirbnbCSV(this)" style="width:100%;padding:14px;border:2px dashed #059669;border-radius:8px;cursor:pointer;background:#F0FDF4;font-size:13px;" />
          </div>

          <div id="airbnbSyncPreview"></div>
        </div>
      `, 'airbnb-sync');
      return;
    }

    renderShell(`
      ${window._airbnbTabsHtml || ''}
      <div class="wrap">
        <h1 style="margin:0 0 6px 0;font-size:22px;">🔄 Airbnb Reservations CSV Sync</h1>
        <p style="color:#64748B;font-size:13px;margin-top:2px;">Upload the Airbnb Reservations CSV — details and payouts will be parsed, compared and auto-enriched into the system.</p>

        <div class="card" style="border-left:4px solid #3B82F6;background:#EFF6FF;margin-bottom:14px;">
          <div class="section-title" style="color:#1E40AF;font-size:14px;font-weight:800;margin-bottom:6px;">📖 HOW TO USE</div>
          <div style="line-height:1.9;font-size:12.5px;color:#1E3A8A;">
            <div><strong>Step 1:</strong> Go to <a href="https://www.airbnb.co.in/hosting/reservations/all" target="_blank" style="color:#FF385C;font-weight:800;text-decoration:underline;">Airbnb Reservations ↗</a></div>
            <div><strong>Step 2:</strong> Click <strong>"Export" / "Download CSV"</strong></div>
            <div><strong>Step 3:</strong> Upload CSV below — auto-detects all confirmed, hosting, & past guest bookings</div>
            <div><strong>Step 4:</strong> Click "Add All" to sync missing bookings, or "Fix" to update amounts!</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="section-title" style="font-size:14px;font-weight:700;margin-bottom:8px;">📁 Upload Airbnb CSV File</div>
          <input type="file" id="airbnbCsvFile" accept=".csv" onchange="handleAirbnbCSV(this)" style="width:100%;padding:12px;border:2px dashed #3B82F6;border-radius:8px;cursor:pointer;background:#fafafa;font-size:13px;" />
        </div>

        <div id="airbnbSyncPreview"></div>
      </div>
    `, 'airbnb-sync');
  }

  window.handleAirbnbCSV = async function(fileInput) {
    const file = fileInput?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);
    SYNC.csvData = rows;

    if (!rows || rows.length === 0) {
      if (window.fsn?.error) fsn.error('Error', 'Invalid or empty CSV file');
      return;
    }

    // Detect CSV Format by inspecting keys of first row
    const sampleKeys = Object.keys(rows[0] || {}).map(k => k.toLowerCase());
    const isNewTransactionCSV = sampleKeys.includes('gross earnings') || sampleKeys.includes('arriving by date') || sampleKeys.includes('paid out');
    SYNC.isNewTransactionCSV = isNewTransactionCSV;
    console.log("📊 Airbnb CSV Auto-Detected:", isNewTransactionCSV ? "NEW Transaction/Payout CSV" : "OLD Reservation CSV");

    // Detect CSV date format globally by inspecting all slash dates
    let hasSecondGt12 = false;
    let hasFirstGt12 = false;
    rows.forEach(r => {
      Object.values(r).forEach(val => {
        if (typeof val === 'string' && val.includes('/')) {
          const parts = val.trim().split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            const p1 = parseInt(parts[0], 10);
            const p2 = parseInt(parts[1], 10);
            if (p2 > 12) hasSecondGt12 = true;
            if (p1 > 12) hasFirstGt12 = true;
          }
        }
      });
    });
    _detectedCsvDateFormat = (hasFirstGt12 && !hasSecondGt12) ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
    console.log("📅 Airbnb CSV Date Format Auto-Detected:", _detectedCsvDateFormat);

    const reservationsByCode = {};
    let autoEnrichedCount = 0;

    if (isNewTransactionCSV) {
      // Collect Tax Withholding for India Income (Section 194-O TDS) per confirmation code
      const taxWithholdingMap = {};
      rows.forEach(r => {
        const type = (r['Type'] || '').trim().toLowerCase();
        const code = (r['Confirmation Code'] || r['Confirmation code'] || '').trim();
        if (code && (type.includes('tax withholding') || type.includes('withheld') || type.includes('tds'))) {
          const amt = parseFloat((r['Amount'] || '0').replace(/,/g, '')) || 0;
          taxWithholdingMap[code] = (taxWithholdingMap[code] || 0) + amt; // negative number, e.g. -188.01
        }
      });

      // Parse Reservations only
      rows.forEach(r => {
        const type = (r['Type'] || '').trim();
        const code = (r['Confirmation Code'] || r['Confirmation code'] || '').trim();

        if (type !== 'Reservation' || !code) return;

        const sDate = r['Start date'] || r['Start Date'];
        const eDate = r['End date'] || r['End Date'];
        const guest = (r['Guest'] || r['Guest name'] || 'Airbnb Guest').trim();
        const listing = (r['Listing'] || r['Property'] || '').trim();

        const nights = parseInt(r['Nights'] || '1', 10) || 1;
        const { checkIn, checkOut } = parseDatePair(sDate, eDate, nights);

        // Gross earnings = total guest charges before fees & taxes
        const gross = parseFloat((r['Gross earnings'] || r['Gross Earnings'] || '0').replace(/,/g, '')) || 0;
        // Amount = reservation amount after host service fee, but BEFORE TDS
        const resAmount = parseFloat((r['Amount'] || '0').replace(/,/g, '')) || 0;
        // Paid out = direct bank settlement amount if column exists
        const paidOutCol = parseFloat((r['Paid out'] || r['Paid Out'] || '0').replace(/,/g, '')) || 0;
        // Host Service Fee (approx 15% or 15.5%)
        const hostFeeCol = parseFloat((r['Host Fee'] || r['Host fee'] || r['Service Fee'] || r['Service fee'] || '0').replace(/,/g, '')) || 0;
        const calculatedHostFee = Math.abs(hostFeeCol) > 0 ? Math.abs(hostFeeCol) : (gross > resAmount ? Math.round((gross - resAmount) * 100) / 100 : 0);
        // Tax Withheld (Section 194-O 5% TDS)
        const taxWithheld = Math.abs(taxWithholdingMap[code] || 0);

        // Net host earnings ("You Earn"): Payout after host fee AND TDS
        let finalYouEarn = paidOutCol > 0 ? paidOutCol : (resAmount > 0 ? (resAmount - taxWithheld) : gross);
        if (finalYouEarn <= 0) finalYouEarn = gross;
        const matchedRoomId = SYNC.getRoomIdByListing(listing);

        if (checkIn && code) {
          reservationsByCode[code] = {
            confirmation_code: code,
            guest_name: guest || 'Airbnb Guest',
            phone: null,
            check_in: checkIn,
            check_out: checkOut,
            nights: nights,
            guests: 1,
            matched_room_id: matchedRoomId,
            listing_name: listing,
            gross: gross > 0 ? gross : (resAmount + calculatedHostFee),
            amount: gross > 0 ? gross : resAmount,
            host_fee: calculatedHostFee,
            tax_withheld: taxWithheld,
            you_earn: Math.round(finalYouEarn * 100) / 100,
            status: 'Confirmed',
            raw: r
          };
        }
      });
    } else {
      // OLD RESERVATIONS CSV PARSING
      rows.forEach(r => {
        const status = (r['Status'] || r['Type'] || '').trim();
        const code = (r['Confirmation code'] || r['Confirmation Code'] || r['Code'] || '').trim();
        
        if (status.toLowerCase().includes('cancelled') || !code) return;

        const sDate = r['Start date'] || r['Start Date'] || r['Check-in'] || r['Check in'];
        const eDate = r['End date'] || r['End Date'] || r['Check-out'] || r['Check out'];
        const guest = (r['Guest name'] || r['Guest'] || r['Contact Name'] || '').trim();
        const phone = (r['Contact'] || r['Phone'] || r['Guest Phone'] || '').trim();
        const listing = (r['Listing'] || r['Property'] || r['Room'] || '').trim();

        const nights = parseInt(r['# of nights'] || r['Nights'] || '1', 10) || 1;
        const { checkIn, checkOut } = parseDatePair(sDate, eDate, nights);

        const rawEarn = r['Earnings'] || r['Paid out'] || r['Paid Out'] || r['Net Earnings'] || r['Amount'] || r['Total Payout'] || '0';
        const cleanEarn = parseFloat(String(rawEarn).replace(/[^0-9\.]/g, '')) || 0;

        const adults = parseInt(r['# of adults'] || '1', 10) || 1;
        const children = parseInt(r['# of children'] || '0', 10) || 0;

        const matchedRoomId = SYNC.getRoomIdByListing(listing);

        if (checkIn && code) {
          reservationsByCode[code] = {
            confirmation_code: code,
            guest_name: guest || 'Airbnb Guest',
            phone: phone && phone.length > 5 ? phone : null,
            check_in: checkIn,
            check_out: checkOut,
            nights: nights,
            guests: adults + children,
            matched_room_id: matchedRoomId,
            listing_name: listing,
            amount: cleanEarn,
            you_earn: csvEarningsToYouEarn(cleanEarn),
            status: status,
            raw: r
          };
        }
      });
    }

    SYNC.allReservations = Object.values(reservationsByCode);

    // Auto-Enrich Supabase DB (fill missing details for matching online Airbnb bookings ONLY)
    // 🛡️ CRITICAL RULE: NEVER touch, modify, or overwrite offline / direct / manual bookings!
    for (let r of SYNC.allReservations) {
      if (!r.check_in || !r.matched_room_id) continue;

      let matchedDb = null;

      // 1. Try finding by airbnb_confirmation_code first
      if (r.confirmation_code) {
        const { data } = await sb.from('guest_register')
          .select('booking_id, guest_name, phone, total_amount, airbnb_confirmation_code, booking_mode, payment_status')
          .eq('airbnb_confirmation_code', r.confirmation_code)
          .maybeSingle();
        matchedDb = data;
      }

      // 2. Fallback: match by room & check_in ONLY if booking_mode is Online-Airbnb or temp placeholder
      if (!matchedDb) {
        const { data } = await sb.from('guest_register')
          .select('booking_id, guest_name, phone, total_amount, airbnb_confirmation_code, booking_mode, payment_status')
          .eq('room_id', r.matched_room_id)
          .eq('check_in', r.check_in)
          .maybeSingle();

        if (data) {
          const mode = (data.booking_mode || '').toLowerCase();
          const isOffline = mode.includes('offline') || mode.includes('direct') || mode.includes('walk-in') || mode.includes('manual');
          const isTemp = !data.guest_name || data.guest_name.includes('Airbnb Guest') || data.guest_name.includes('Blocked');
          // ONLY match if it is an online Airbnb booking or temp placeholder — NEVER touch genuine offline bookings!
          if (!isOffline || isTemp) {
            matchedDb = data;
          }
        }
      }

      if (matchedDb) {
        const isTempName = !matchedDb.guest_name || matchedDb.guest_name.includes('Airbnb Guest') || matchedDb.guest_name.includes('Blocked');
        const isTempAmount = !matchedDb.total_amount || matchedDb.total_amount <= 0;
        const missingPhone = !matchedDb.phone && r.phone;
        const needsPaid = matchedDb.payment_status !== 'Paid';

        const amountMismatch = matchedDb.total_amount !== r.you_earn && r.you_earn > 0;
        if (isTempName || isTempAmount || missingPhone || needsPaid || amountMismatch) {
          await sb.from('guest_register').update({
            guest_name: (isTempName && r.guest_name) ? r.guest_name : matchedDb.guest_name,
            phone: (missingPhone && r.phone) ? r.phone : matchedDb.phone,
            total_amount: r.you_earn > 0 ? r.you_earn : matchedDb.total_amount,
            per_day_rate: r.nights > 0 ? Math.round(r.you_earn / r.nights) : (matchedDb.per_day_rate || 0),
            guests: r.guests || 1,
            booking_mode: 'Online-Airbnb',
            payment_status: 'Paid',
            airbnb_confirmation_code: r.confirmation_code || matchedDb.airbnb_confirmation_code,
            notes: 'CSV Auto-Enriched: Details & Paid Status Updated'
          }).eq('booking_id', matchedDb.booking_id);
          autoEnrichedCount++;

          // Ensure payment_history has full paid record matching net payout
          if (r.you_earn > 0) {
            const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', matchedDb.booking_id);
            const totalPaid = (payList || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
            if (totalPaid < r.you_earn) {
              await sb.from('payment_history').insert({
                booking_id: matchedDb.booking_id,
                amount: Math.round((r.you_earn - totalPaid) * 100) / 100,
                payment_mode: 'Airbnb Payout',
                payment_date: r.check_out || r.check_in,
                received_by: 'Firoz',
                received_by_type: 'employee',
                handover_status: 'handed_over',
                verification_status: 'verified',
                notes: 'Auto-created from Airbnb CSV'
              });
            } else if (totalPaid > r.you_earn && (payList || []).length > 0) {
              await sb.from('payment_history').update({
                amount: r.you_earn,
                notes: 'Auto-updated to net payout from Airbnb CSV'
              }).eq('id', payList[0].id);
            }
          }
        }
      }
    }

    if (autoEnrichedCount > 0 && window.fsn?.success) {
      fsn.success('Auto-Enriched', `✅ Auto-filled details & Paid status for ${autoEnrichedCount} bookings!`);
    }

    // Classify: New, Conflict, or Matched
    classifyReservations();

    // Save new bookings to persistent map so Add buttons work after JS reload
    window._csvBookings = {};
    SYNC.reservations.forEach(r => { window._csvBookings[r.confirmation_code] = r; });

    renderPreview();
  };

  function classifyReservations() {
    SYNC.reservations = SYNC.allReservations.map(r => {
      // 1. Match by confirmation code FIRST
      let dbBk = SYNC.existingByCode[r.confirmation_code];

      // 2. If not found by code, match by room & check_in ONLY IF it is Online-Airbnb or temp placeholder
      // 🛡️ NEVER match genuine offline / direct / manual bookings!
      if (!dbBk) {
        dbBk = SYNC.existingByGuest.find(e => {
          if (e.room_id !== r.matched_room_id || e.check_in !== r.check_in) return false;
          const mode = (e.booking_mode || '').toLowerCase();
          const isOffline = mode.includes('offline') || mode.includes('direct') || mode.includes('walk-in') || mode.includes('manual');
          const isTemp = !e.guest_name || e.guest_name.includes('Airbnb Guest') || e.guest_name.includes('Blocked');
          return (!isOffline || isTemp);
        });
      }

      if (!dbBk) {
        return { ...r, matchStatus: 'new', issues: [] };
      }

      const issues = [];
      if (r.guest_name && dbBk.guest_name && !dbBk.guest_name.toLowerCase().includes(r.guest_name.toLowerCase()) && !dbBk.guest_name.includes('Airbnb Guest')) {
        issues.push({ field: 'guest_name', label: 'Name', csv: r.guest_name, db: dbBk.guest_name });
      }
      if (Math.abs(r.you_earn - (dbBk.total_amount || 0)) > 1) {
        issues.push({ field: 'amount', label: 'Amount', csv: r.you_earn, db: dbBk.total_amount || 0 });
      }
      if (dbBk.payment_status !== 'Paid') {
        issues.push({ field: 'payment_status', label: 'Payment Status', csv: 'Paid', db: dbBk.payment_status || 'Unpaid' });
      }

      return {
        ...r,
        matchStatus: issues.length > 0 ? 'conflict' : 'match',
        issues,
        dbBk
      };
    });
  }

  function renderPreview() {
    const container = document.getElementById('airbnbSyncPreview');
    if (!container) return;

    const newBookings = SYNC.reservations.filter(r => r.matchStatus === 'new');
    const conflicts = SYNC.reservations.filter(r => r.matchStatus === 'conflict');
    const matched = SYNC.reservations.filter(r => r.matchStatus === 'match');

    const isPayoutMode = SYNC.isNewTransactionCSV || _activeSyncTab === 'payouts';

    if (isPayoutMode) {
      const totalGross = SYNC.allReservations.reduce((s, r) => s + (r.gross || r.amount || 0), 0);
      const totalHostFee = SYNC.allReservations.reduce((s, r) => s + (r.host_fee || 0), 0);
      const totalTds = SYNC.allReservations.reduce((s, r) => s + (r.tax_withheld || 0), 0);
      const totalNetPayout = SYNC.allReservations.reduce((s, r) => s + (r.you_earn || 0), 0);

      container.innerHTML = `
        <div class="card" style="margin-top:16px;background:#0F172A;color:#fff;border-radius:12px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
            <div>
              <div style="font-size:18px;font-weight:800;color:#38BDF8;">📊 Monthly Airbnb Payout Summary</div>
              <div style="font-size:12px;color:#94A3B8;">Auto-calculated from CSV with 15.5% Host Service Fees and 5% Section 194-O TDS.</div>
            </div>
            ${conflicts.length > 0 ? `
              <button onclick="fixAllConflicts()" id="fixAllBtn" style="background:#059669;color:#fff;padding:10px 22px;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(5,150,105,0.4);">
                ⚡ Update All ${conflicts.length} Mismatched Payments to Net Payouts
              </button>
            ` : `
              <div style="background:#065F46;color:#A7F3D0;padding:6px 14px;border-radius:6px;font-weight:700;font-size:12px;">
                ✅ All ${matched.length} Bookings In Sync with Bank Payouts!
              </div>
            `}
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;">
            <div style="padding:10px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:#94A3B8;">Total Bookings</div>
              <div style="font-size:20px;font-weight:800;color:#fff;margin-top:2px;">${SYNC.allReservations.length}</div>
            </div>
            <div style="padding:10px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:#94A3B8;">Gross Earnings</div>
              <div style="font-size:20px;font-weight:800;color:#60A5FA;margin-top:2px;">₹${fmtNum(totalGross)}</div>
            </div>
            <div style="padding:10px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:#F87171;">Host Fees (15.5%)</div>
              <div style="font-size:20px;font-weight:800;color:#EF4444;margin-top:2px;">-₹${fmtNum(totalHostFee)}</div>
            </div>
            <div style="padding:10px;background:rgba(255,255,255,0.06);border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:#FBBF24;">TDS (5% Sec 194-O)</div>
              <div style="font-size:20px;font-weight:800;color:#F59E0B;margin-top:2px;">-₹${fmtNum(totalTds)}</div>
            </div>
            <div style="padding:10px;background:rgba(16,185,129,0.15);border:1px solid #059669;border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:#6EE7B7;font-weight:700;">Net Bank Payouts</div>
              <div style="font-size:20px;font-weight:800;color:#34D399;margin-top:2px;">₹${fmtNum(totalNetPayout)}</div>
            </div>
            <div style="padding:10px;background:${conflicts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'};border:${conflicts.length > 0 ? '1px solid #DC2626' : 'none'};border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:${conflicts.length > 0 ? '#FCA5A5' : '#94A3B8'};font-weight:700;">Payment Mismatches</div>
              <div style="font-size:20px;font-weight:800;color:${conflicts.length > 0 ? '#F87171' : '#A7F3D0'};margin-top:2px;">${conflicts.length}</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <div>
              <strong style="font-size:16px;color:#0F172A;">📋 Monthly Payouts Reconciliation Table</strong>
              <div style="font-size:12px;color:#64748B;">Compare each reservation's breakdown and click "Update" to sync exact net earnings.</div>
            </div>
          </div>

          <div class="table-wrap" style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#F1F5F9;text-align:left;">
                  <th style="padding:8px;">Status</th>
                  <th style="padding:8px;">Code & Guest</th>
                  <th style="padding:8px;">Dates & Room</th>
                  <th style="padding:8px;text-align:right;">Gross (₹)</th>
                  <th style="padding:8px;text-align:right;">Host Fee (15.5%)</th>
                  <th style="padding:8px;text-align:right;">TDS 5%</th>
                  <th style="padding:8px;text-align:right;color:#059669;">Net Payout (You Earn)</th>
                  <th style="padding:8px;text-align:right;">CRM Amount</th>
                  <th style="padding:8px;text-align:right;">Difference</th>
                  <th style="padding:8px;text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${SYNC.reservations.map(r => {
                  const dbAmt = r.dbBk ? Number(r.dbBk.total_amount || 0) : null;
                  const diff = dbAmt !== null ? (r.you_earn - dbAmt) : null;
                  const isMatch = dbAmt !== null && Math.abs(diff) <= 1;
                  const isMissing = !r.dbBk;

                  return `
                    <tr style="border-bottom:1px solid #E2E8F0;background:${!isMatch && !isMissing ? '#FFFBEB' : ''};" id="conflict-row-${r.confirmation_code}-amount">
                      <td style="padding:8px;">
                        ${isMissing ? '<span style="background:#E2E8F0;color:#475569;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">⚪ Missing</span>' :
                          (isMatch ? '<span style="background:#DCFCE7;color:#166534;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">✅ Matched</span>' :
                          '<span style="background:#FEF3C7;color:#92400E;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">⚠️ Mismatch</span>')}
                      </td>
                      <td style="padding:8px;">
                        <code>${r.confirmation_code}</code><br>
                        <strong>${r.guest_name}</strong>
                      </td>
                      <td style="padding:8px;">
                        ${fmtDate(r.check_in)} → ${fmtDate(r.check_out)} (${r.nights}n)<br>
                        <small style="color:#64748B;">${r.matched_room_id || r.listing_name || '-'}</small>
                      </td>
                      <td style="padding:8px;text-align:right;">₹${fmtNum(r.gross || r.amount)}</td>
                      <td style="padding:8px;text-align:right;color:#DC2626;">-₹${fmtNum(r.host_fee || 0)}</td>
                      <td style="padding:8px;text-align:right;color:#D97706;">-₹${fmtNum(r.tax_withheld || 0)}</td>
                      <td style="padding:8px;text-align:right;font-weight:800;color:#059669;">₹${(r.you_earn || 0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      <td style="padding:8px;text-align:right;font-weight:700;color:${dbAmt === null ? '#94A3B8' : (isMatch ? '#334155' : '#DC2626')};">
                        ${dbAmt !== null ? '₹' + dbAmt.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}
                      </td>
                      <td style="padding:8px;text-align:right;font-weight:700;color:${diff === null ? '#94A3B8' : (diff === 0 ? '#10B981' : (diff > 0 ? '#059669' : '#DC2626'))};">
                        ${diff !== null ? (diff >= 0 ? '+' : '') + '₹' + diff.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}
                      </td>
                      <td style="padding:8px;text-align:center;white-space:nowrap;">
                        ${isMissing ? `
                          <button class="btn-sm green-btn" onclick="instantAddBooking('${r.confirmation_code}')">➕ Add to CRM</button>
                        ` : (isMatch ? `
                          <span style="color:#059669;font-weight:700;font-size:11px;">✓ Synced</span>
                        ` : `
                          <button class="btn-sm" style="background:#059669;color:#fff;font-weight:700;" onclick="instantFixField('${r.confirmation_code}', 'amount')">⚡ Update Payment</button>
                        `)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      return;
    }

    const roomOpts = (selected) => '<option value="">— Select property —</option>' + SYNC.rooms.map(rm =>
      '<option value="' + rm.room_id + '"' + (rm.room_id === selected ? ' selected' : '') + '>' +
      (rm.unit_no || '') + ' — ' + ((rm.nickname || rm.property_name || '').substring(0, 30)) +
      '</option>'
    ).join('');

    let newHtml = '';
    if (newBookings.length > 0) {
      newHtml = `
        <div class="card" style="margin-top:16px;border-left:4px solid #10B981;background:#F0FDF4;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <div>
              <strong style="font-size:16px;color:#065F46;">🆕 Missing in System (${newBookings.length})</strong>
              <div style="font-size:12px;color:#047857;">These bookings are in the CSV but not yet in your database.</div>
            </div>
            <button onclick="addAllNewBookings()" style="background:#059669;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-weight:700;cursor:pointer;">➕ Add All ${newBookings.length} Bookings</button>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Code</th><th>Guest</th><th>Dates</th><th>Property</th><th>Payout (You Earn)</th><th>Action</th></tr></thead>
            <tbody>
              ${newBookings.map(r => `
                <tr>
                  <td><code>${r.confirmation_code}</code></td>
                  <td><strong>${r.guest_name}</strong><br><small style="color:#666;">${r.phone || ''}</small></td>
                  <td>${fmtDate(r.check_in)} → ${fmtDate(r.check_out)} (${r.nights}n)</td>
                  <td>
                    <select id="room-${r.confirmation_code}" style="padding:4px 8px;font-size:12px;">
                      ${roomOpts(r.matched_room_id)}
                    </select>
                  </td>
                  <td><strong style="color:#059669;">₹${fmtNum(r.you_earn)}</strong><br><small style="color:#666;">gross: ₹${fmtNum(r.amount)}</small></td>
                  <td><button class="btn-sm green-btn" onclick="instantAddBooking('${r.confirmation_code}')">➕ Add</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        </div>
      `;
    }

    let conflictHtml = '';
    if (conflicts.length > 0) {
      conflictHtml = `
        <div class="card" style="margin-top:16px;border-left:4px solid #F59E0B;background:#FFFBEB;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <div>
              <strong style="font-size:16px;color:#92400E;">⚠️ Details Mismatch (${conflicts.length})</strong>
              <div style="font-size:12px;color:#B45309;">These bookings have a different amount in your database vs the CSV.</div>
            </div>
            <button onclick="fixAllConflicts()" id="fixAllBtn" style="background:#3B82F6;color:#fff;padding:8px 18px;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">✓ Fix All ${conflicts.length}</button>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Code</th><th>Guest</th><th>Issue</th><th>Current (DB)</th><th>Correct (CSV)</th><th>Action</th></tr></thead>
            <tbody>
              ${conflicts.map(r => r.issues.map(i => `
                <tr id="conflict-row-${r.confirmation_code}-${i.field}">
                  <td><code>${r.confirmation_code}</code></td>
                  <td>${r.guest_name}</td>
                  <td><strong>${i.label}</strong></td>
                  <td style="color:#DC2626;text-decoration:line-through;">${i.field === 'amount' ? '₹' + fmtNum(i.db) : i.db}</td>
                  <td style="color:#16A34A;font-weight:700;">${i.field === 'amount' ? '₹' + fmtNum(i.csv) : i.csv}</td>
                  <td><button class="btn-sm" style="background:#3B82F6;color:#fff;" onclick="instantFixField('${r.confirmation_code}', '${i.field}')">✓ Fix</button></td>
                </tr>
              `).join('')).join('')}
            </tbody>
          </table></div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card" style="margin-top:16px;background:#1E293B;color:#fff;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
          <div style="padding:10px;background:rgba(255,255,255,0.08);border-radius:8px;">
            <div style="font-size:24px;font-weight:800;color:#34D399;">${newBookings.length}</div>
            <div style="font-size:11px;color:#94A3B8;">🆕 To Add</div>
          </div>
          <div style="padding:10px;background:rgba(255,255,255,0.08);border-radius:8px;">
            <div style="font-size:24px;font-weight:800;color:#FBBF24;">${conflicts.length}</div>
            <div style="font-size:11px;color:#94A3B8;">⚠️ Conflicts</div>
          </div>
          <div style="padding:10px;background:rgba(255,255,255,0.08);border-radius:8px;">
            <div style="font-size:24px;font-weight:800;color:#60A5FA;">${matched.length}</div>
            <div style="font-size:11px;color:#94A3B8;">✅ Already Synced</div>
          </div>
        </div>
      </div>
      ${newHtml}
      ${conflictHtml}
      ${matched.length > 0 ? `<div class="card" style="margin-top:16px;"><div class="section-title">✅ Perfectly Synced Bookings (${matched.length})</div><div style="font-size:12px;color:#64748B;">These match completely with your database.</div></div>` : ''}
    `;
  }

  window.instantAddBooking = async function(code) {
    // Read from SYNC first, fallback to persistent _csvBookings map
    let r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r) r = window._csvBookings?.[code];
    if (!r) {
      alert('Booking data not found. Please re-upload the CSV and try again.');
      return;
    }

    const roomSelect = document.getElementById('room-' + code);
    const roomId = roomSelect?.value || r.matched_room_id;

    if (!roomId) {
      alert('Please select a property for this booking!');
      return;
    }

    // Check if an online Airbnb booking already exists for this code or (roomId & check_in)
    let existingOnline = null;
    if (code) {
      const { data } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code')
        .eq('airbnb_confirmation_code', code)
        .maybeSingle();
      existingOnline = data;
    }
    if (!existingOnline) {
      const { data } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code')
        .eq('room_id', roomId)
        .eq('check_in', r.check_in)
        .eq('booking_mode', 'Online-Airbnb')
        .maybeSingle();
      existingOnline = data;
    }

    let bookingId;
    if (existingOnline) {
      // MERGE into existing booking — NEVER create a duplicate!
      bookingId = existingOnline.booking_id;
      console.log('🔄 Merging into existing booking:', bookingId);
      const { error } = await sb.from('guest_register').update({
        guest_name: r.guest_name,
        phone: r.phone || null,
        total_amount: r.you_earn,
        per_day_rate: r.nights > 0 ? Math.round(r.you_earn / r.nights) : r.you_earn,
        gross_amount: r.amount,
        payment_status: 'Paid',
        airbnb_confirmation_code: code,
        notes: `CSV Enriched: Details & Paid Status Updated`
      }).eq('booking_id', bookingId);

      if (error) {
        if (btn) { btn.disabled = false; btn.textContent = '➕ Add'; }
        alert('Error updating booking:\n' + error.message);
        return;
      }
    } else {
      // Insert new booking
      bookingId = 'B' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      console.log('📝 Adding booking:', code, 'as', bookingId, 'room:', roomId);

      const { error } = await sb.from('guest_register').insert({
        booking_id: bookingId,
        guest_name: r.guest_name,
        phone: r.phone,
        room_id: roomId,
        source_room_id: roomId,
        check_in: r.check_in,
        check_out: r.check_out,
        check_in_time: '14:00',
        check_out_time: '11:00',
        checkout_confirmed: true,
        total_amount: r.you_earn,
        per_day_rate: r.nights > 0 ? Math.round(r.you_earn / r.nights) : r.you_earn,
        gross_amount: r.amount,
        booking_mode: 'Online-Airbnb',
        payment_status: 'Paid',
        verification_status: 'verified',
        airbnb_confirmation_code: r.confirmation_code,
        guests: r.guests || 1,
        notes: `Imported from CSV (${r.status})`
      });

      if (error) {
        console.error('❌ Add booking error:', code, error);
        if (btn) { btn.disabled = false; btn.textContent = '➕ Add'; }
        alert('Error adding booking:\n' + (error.message || JSON.stringify(error)));
        return;
      }
    }

    console.log('✅ Booking synced:', bookingId);

    if (r.you_earn > 0) {
      const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', bookingId);
      const totalPaid = (payList || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      if (totalPaid < r.you_earn) {
        await sb.from('payment_history').insert({
          booking_id: bookingId,
          amount: Math.round((r.you_earn - totalPaid) * 100) / 100,
          payment_mode: 'Airbnb Payout',
          payment_date: r.check_out || r.check_in,
          received_by: 'Firoz',
          received_by_type: 'employee',
          handover_status: 'handed_over',
          verification_status: 'verified',
          notes: 'Auto-synced from Airbnb CSV'
        });
      } else if (totalPaid > r.you_earn && (payList || []).length > 0) {
        await sb.from('payment_history').update({
          amount: r.you_earn,
          notes: 'Auto-updated to net payout from Airbnb CSV'
        }).eq('id', payList[0].id);
      }
    }

    // Remove from persistent store so it won't re-appear
    if (window._csvBookings) delete window._csvBookings[code];
    SYNC.existingByCode[code] = { booking_id: bookingId, ...r };

    if (window.fsn) fsn.success('Added', `✅ ${r.guest_name} added successfully!`);
    if (window.notifyDataChanged) window.notifyDataChanged();
    classifyReservations();
    renderPreview();
  };

  window.instantFixField = async function(code, field) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r || !r.dbBk) return;

    const updates = {};
    let syncPay = false;
    if (field === 'guest_name') updates.guest_name = r.guest_name;
    if (field === 'amount') {
      updates.total_amount = r.you_earn;
      updates.per_day_rate = r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn;
      if (r.gross) updates.gross_amount = r.gross;
      if (r.host_fee) {
        updates.platform_fee = r.host_fee;
        updates.airbnb_service_fee = r.host_fee;
      }
      if (r.tax_withheld) updates.airbnb_tax_withheld = r.tax_withheld;
      updates.airbnb_net_payout = r.you_earn;
      updates.payment_status = 'Paid';
      syncPay = true;
    }
    if (field === 'payment_status') {
      updates.payment_status = 'Paid';
      syncPay = true;
    }

    const { error } = await sb.from('guest_register').update(updates).eq('booking_id', r.dbBk.booking_id);
    if (error) {
      alert('Fix failed: ' + error.message);
      return;
    }

    if (syncPay && r.you_earn > 0) {
      const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', r.dbBk.booking_id);
      if (payList && payList.length > 0) {
        await sb.from('payment_history').update({
          amount: r.you_earn,
          payment_mode: 'Online-Airbnb',
          notes: `Net payout synced from Airbnb CSV (${r.confirmation_code})`
        }).eq('id', payList[0].id);
      } else {
        await sb.from('payment_history').insert({
          booking_id: r.dbBk.booking_id,
          amount: r.you_earn,
          payment_mode: 'Online-Airbnb',
          payment_date: r.check_out || r.check_in,
          received_by: 'Firoz',
          received_by_type: 'employee',
          handover_status: 'handed_over',
          verification_status: 'verified',
          notes: `Net payout synced from Airbnb CSV (${r.confirmation_code})`
        });
      }
    }

    if (window.fsn) fsn.success('Fixed', '✅ Updated successfully!');
    if (window.notifyDataChanged) window.notifyDataChanged();
    r.issues = (r.issues || []).filter(i => i.field !== field);
    if (r.issues.length === 0) r.matchStatus = 'match';
    renderPreview();
  };

  window.fixAllConflicts = async function() {
    const conflicts = (window.SYNC?.reservations || []).filter(r => r.matchStatus === 'conflict');
    if (!conflicts.length) {
      alert('No conflicts to fix!');
      return;
    }

    const totalIssues = conflicts.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    if (!confirm(`Fix all ${totalIssues} mismatches across ${conflicts.length} bookings?`)) return;

    const btn = document.getElementById('fixAllBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Fixing...'; }

    let fixed = 0;
    let failed = 0;

    for (const r of conflicts) {
      if (!r.dbBk) continue;
      const updates = {};
      let needsPaySync = false;
      for (const issue of (r.issues || [])) {
        if (issue.field === 'guest_name') updates.guest_name = r.guest_name;
        if (issue.field === 'amount') {
          updates.total_amount = r.you_earn;
          updates.per_day_rate = r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn;
          if (r.gross) updates.gross_amount = r.gross;
          if (r.host_fee) {
            updates.platform_fee = r.host_fee;
            updates.airbnb_service_fee = r.host_fee;
          }
          if (r.tax_withheld) updates.airbnb_tax_withheld = r.tax_withheld;
          updates.airbnb_net_payout = r.you_earn;
          updates.payment_status = 'Paid';
          needsPaySync = true;
        }
        if (issue.field === 'payment_status') {
          updates.payment_status = 'Paid';
          needsPaySync = true;
        }
      }
      if (!Object.keys(updates).length) continue;

      const { error } = await sb.from('guest_register').update(updates).eq('booking_id', r.dbBk.booking_id);
      if (error) {
        console.error('Fix all error for', r.confirmation_code, error);
        failed++;
      } else {
        if (needsPaySync && r.you_earn > 0) {
          const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', r.dbBk.booking_id);
          if (payList && payList.length > 0) {
            await sb.from('payment_history').update({
              amount: r.you_earn,
              payment_mode: 'Online-Airbnb',
              notes: `Net payout synced from Airbnb CSV (${r.confirmation_code})`
            }).eq('id', payList[0].id);
          } else {
            await sb.from('payment_history').insert({
              booking_id: r.dbBk.booking_id,
              amount: r.you_earn,
              payment_mode: 'Online-Airbnb',
              payment_date: r.check_out || r.check_in,
              received_by: 'Firoz',
              received_by_type: 'employee',
              handover_status: 'handed_over',
              verification_status: 'verified',
              notes: `Net payout synced from Airbnb CSV (${r.confirmation_code})`
            });
          }
        }
        fixed++;
        r.issues = [];
        r.matchStatus = 'match';
        const rows = document.querySelectorAll(`[id^="conflict-row-${r.confirmation_code}"]`);
        rows.forEach(row => { row.style.background = '#F0FDF4'; row.style.opacity = '0.5'; });
      }
    }

    if (failed === 0) {
      if (window.fsn) fsn.success('Done', `✅ Fixed all ${fixed} mismatches!`);
    } else {
      if (window.fsn) fsn.warning('Partial', `✅ Fixed ${fixed}, ❌ Failed ${failed}`);
    }
    if (window.notifyDataChanged) window.notifyDataChanged();
    renderPreview();
  };

  window.renderAirbnbSync = renderAirbnbSync;
})();

window.clearDummyBlocks = async function() {
  if (!confirm("Clear all auto-generated 'Blocked' slots?")) return;
  try {
    const { data: blocks } = await sb.from('guest_register')
      .select('booking_id')
      .or('booking_id.ilike.BLK_%,booking_mode.eq.Offline-Blocked,guest_name.ilike.%Blocked%');

    if (!blocks || blocks.length === 0) {
      alert('ℹ️ No dummy blocked slots found!');
      return;
    }

    for (let b of blocks) {
      await sb.from('guest_register').delete().eq('booking_id', b.booking_id);
    }

    alert(`✅ Successfully cleared ${blocks.length} dummy blocked slots!`);
    if (window.renderAirbnbSync) renderAirbnbSync();
  } catch(e) {
    alert('❌ Error clearing blocks: ' + e.message);
  }
};

window.addAllNewBookings = async function() {
  let newBookings = (window.SYNC?.reservations || []).filter(r => r.matchStatus === 'new');
  if (!newBookings.length && window._csvBookings) {
    newBookings = Object.values(window._csvBookings).filter(r => r.matchStatus === 'new');
  }

  if (!newBookings.length) {
    alert('No new bookings to add!\n\nIf you see bookings listed above, please re-upload your CSV file (the data was cleared by a page reload).');
    return;
  }

  if (!confirm(`Add all ${newBookings.length} bookings to database?`)) return;

  const addAllBtn = document.querySelector('button[onclick="addAllNewBookings()"]');
  if (addAllBtn) { addAllBtn.disabled = true; addAllBtn.textContent = '⏳ Adding...'; }

  let added = 0;
  let failed = 0;
  const failedNames = [];

  for (let i = 0; i < newBookings.length; i++) {
    const r = newBookings[i];
    const roomSelect = document.getElementById('room-' + r.confirmation_code);
    const roomId = roomSelect?.value || r.matched_room_id;

    if (!roomId) {
      failed++;
      failedNames.push(r.guest_name + ' (no property selected)');
      continue;
    }

    // Check if an online Airbnb booking already exists for this code or (roomId & check_in)
    let existingOnline = null;
    if (r.confirmation_code) {
      const { data } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code')
        .eq('airbnb_confirmation_code', r.confirmation_code)
        .maybeSingle();
      existingOnline = data;
    }
    if (!existingOnline) {
      const { data } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code')
        .eq('room_id', roomId)
        .eq('check_in', r.check_in)
        .eq('booking_mode', 'Online-Airbnb')
        .maybeSingle();
      existingOnline = data;
    }

    let bookingId;
    let isMerge = false;
    let opError = null;

    if (existingOnline) {
      // MERGE into existing booking — NEVER create a duplicate!
      bookingId = existingOnline.booking_id;
      isMerge = true;
      console.log('🔄 Merging into existing booking:', bookingId);
      const { error } = await sb.from('guest_register').update({
        guest_name: r.guest_name,
        phone: r.phone || null,
        total_amount: r.you_earn,
        per_day_rate: r.nights > 0 ? Math.round(r.you_earn / r.nights) : r.you_earn,
        gross_amount: r.amount,
        payment_status: 'Paid',
        airbnb_confirmation_code: r.confirmation_code,
        notes: `CSV Enriched: Details & Paid Status Updated`
      }).eq('booking_id', bookingId);
      opError = error;
    } else {
      bookingId = 'B' + (Date.now() + i) + '_' + Math.random().toString(36).substring(2, 6);
      console.log('📝 Adding booking:', r.confirmation_code, 'as', bookingId, 'room:', roomId);

      const { error } = await sb.from('guest_register').insert({
        booking_id: bookingId,
        guest_name: r.guest_name,
        phone: r.phone,
        room_id: roomId,
        source_room_id: roomId,
        check_in: r.check_in,
        check_out: r.check_out,
        check_in_time: '14:00',
        check_out_time: '11:00',
        checkout_confirmed: true,
        total_amount: r.you_earn,
        per_day_rate: r.nights > 0 ? Math.round(r.you_earn / r.nights) : r.you_earn,
        gross_amount: r.amount,
        booking_mode: 'Online-Airbnb',
        payment_status: 'Paid',
        verification_status: 'verified',
        airbnb_confirmation_code: r.confirmation_code,
        guests: r.guests || 1,
        notes: `Imported from CSV (${r.status})`
      });
      opError = error;
    }

    if (!opError) {
      console.log('✅ Synced:', r.confirmation_code, isMerge ? '(merged)' : '(created)');
      if (r.you_earn > 0) {
        const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', bookingId);
        const totalPaid = (payList || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (totalPaid < r.you_earn) {
          await sb.from('payment_history').insert({
            booking_id: bookingId,
            amount: Math.round((r.you_earn - totalPaid) * 100) / 100,
            payment_mode: 'Airbnb Payout',
            payment_date: r.check_out || r.check_in,
            received_by: 'Firoz',
            received_by_type: 'employee',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: isMerge ? 'Auto-updated from Airbnb CSV' : 'Auto-created from Airbnb CSV'
          });
        } else if (totalPaid > r.you_earn && (payList || []).length > 0) {
          await sb.from('payment_history').update({
            amount: r.you_earn,
            notes: 'Auto-updated to net payout from Airbnb CSV'
          }).eq('id', payList[0].id);
        }
      }
      if (window._csvBookings) delete window._csvBookings[r.confirmation_code];
      SYNC.existingByCode[r.confirmation_code] = { booking_id: bookingId, ...r };
      added++;
    } else {
      console.error('❌ Failed:', r.confirmation_code, opError);
      failed++;
      failedNames.push(r.guest_name + ': ' + opError.message);
    }
  }

  if (addAllBtn) { addAllBtn.disabled = false; addAllBtn.textContent = '➕ Add All Bookings'; }

  if (added > 0) {
    if (window.fsn) fsn.success('Success', `✅ Added ${added} new bookings!`);
    if (window.notifyDataChanged) window.notifyDataChanged();
  }
  if (failed > 0) {
    alert(`⚠️ ${failed} bookings could not be added:\n` + failedNames.join('\n'));
  }

  classifyReservations();
  renderPreview();
};

console.log('✅ Airbnb Sync Module loaded successfully!');
