// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB CSV SYNC — Instant One-Click Fix Version
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
    toDate: new Date().toISOString().slice(0, 10)  // auto = today
  };

  // ─── Date MM/DD/YYYY → YYYY-MM-DD ───
  function parseDate(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        let [d, m, y] = parts.map(p => p.trim());
        if (y.length === 4) {
          // If first number > 12, it's definitely DD/MM/YYYY
          if (parseInt(d) > 12) {
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
          // Default Airbnb India export: DD/MM/YYYY
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return str;
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

  // ─── CSV parser ───
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
    const headers = parseLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
      return row;
    });
  }

  // ─── Fuzzy string match (0-100) ───
  function fuzzyMatch(a, b) {
    if (!a || !b) return 0;
    a = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    b = b.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (a === b) return 100;
    if (!a.length || !b.length) return 0;
    if (a.includes(b) || b.includes(a)) return 90;
    let common = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) common++; else break;
    }
    const prefScore = (common / Math.max(a.length, b.length)) * 100;
    const aw = new Set(a.match(/[a-z0-9]+/g) || []);
    const bw = new Set(b.match(/[a-z0-9]+/g) || []);
    let overlap = 0;
    aw.forEach(w => { if (bw.has(w)) overlap++; });
    const wordScore = (overlap / Math.max(aw.size, bw.size, 1)) * 100;
    return Math.max(prefScore, wordScore);
  }

  // ─── Match Airbnb listing → your room ───
  function matchListing(listing) {
    if (!listing) return { room_id: null, confidence: 0 };
    let best = { room_id: null, confidence: 0 };
    SYNC.rooms.forEach(r => {
      const score = Math.max(
        fuzzyMatch(listing, r.property_name || ''),
        fuzzyMatch(listing, r.nickname || '')
      );
      if (score > best.confidence) {
        best = { room_id: r.room_id, confidence: Math.round(score) };
      }
    });
    return best;
  }

  // ─── Find matching DB booking by guest name + dates (fallback) ───
  function findFuzzyMatch(csvBk) {
    return SYNC.existingByGuest.find(db => {
      if (db.airbnb_confirmation_code) return false;
      if (db.check_in !== csvBk.check_in) return false;
      const nameScore = fuzzyMatch(csvBk.guest_name || '', db.guest_name || '');
      return nameScore >= 60;
    });
  }

  // ─── Compare Airbnb reservation vs existing system booking ───
  function compareBooking(csvBk, dbBk) {
    const issues = [];
    let matchedByFallback = false;
    if (!dbBk) {
      dbBk = findFuzzyMatch(csvBk);
      if (dbBk) matchedByFallback = true;
    }
    if (!dbBk) return { status: 'new', issues };

    if (matchedByFallback) {
      issues.push({ field: 'code', label: 'Airbnb Code', csv: csvBk.confirmation_code, db: '(missing)' });
    }
    if (csvBk.guest_name && dbBk.guest_name && fuzzyMatch(csvBk.guest_name, dbBk.guest_name) < 70) {
      issues.push({ field: 'guest_name', label: 'Name', csv: csvBk.guest_name, db: dbBk.guest_name });
    }
    if (csvBk.check_in !== dbBk.check_in) {
      issues.push({ field: 'check_in', label: 'Check-in', csv: csvBk.check_in, db: dbBk.check_in });
    }
    if (csvBk.check_out !== dbBk.check_out) {
      issues.push({ field: 'check_out', label: 'Check-out', csv: csvBk.check_out, db: dbBk.check_out });
    }
    if (Math.abs((csvBk.amount || 0) - (dbBk.total_amount || 0)) > 10) {
      issues.push({ field: 'amount', label: 'Amount', csv: csvBk.amount, db: dbBk.total_amount || 0 });
    }
    if (csvBk.matched_room_id && dbBk.room_id && csvBk.matched_room_id !== dbBk.room_id) {
      issues.push({ field: 'room', label: 'Property', csv: csvBk.matched_room_id, db: dbBk.room_id });
    }
    if (dbBk.booking_mode && dbBk.booking_mode !== 'Online-Airbnb') {
      issues.push({ field: 'mode', label: 'Mode', csv: 'Online-Airbnb', db: dbBk.booking_mode });
    }

    return { status: issues.length > 0 ? 'conflict' : 'match', issues, dbBk };
  }

  // ─── Main render ───
  async function renderAirbnbSync() {
    window._airbnbTabsHtml = `
      <div class="card" style="padding:8px;margin-bottom:12px;">
        <div style="display:flex;gap:8px;">
          <button style="flex:1;">📁 CSV Import</button>
          <button onclick="renderIcalSync()" class="secondary" style="flex:1;">📅 iCal Auto-Sync</button>
          <button onclick="clearDummyBlocks()" style="background:#EF4444;color:#fff;padding:8px 12px;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;flex:1;" title="Clear auto-generated dummy blocks">🧹 Clear Dummy Blocks</button>
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
      .select('booking_id, airbnb_confirmation_code, guest_name, check_in, check_out, total_amount, room_id, booking_mode, is_cancelled, rooms(unit_no, nickname)')
      .order('check_in', { ascending: false })
      .limit(500);

    SYNC.existingByCode = {};
    SYNC.existingByGuest = existing || [];
    (existing || []).forEach(e => {
      if (e.airbnb_confirmation_code) SYNC.existingByCode[e.airbnb_confirmation_code] = e;
    });

    renderShell(`
      ${window._airbnbTabsHtml || ''}
      <div class="wrap">
        <h1>🔄 Airbnb CSV Sync</h1>
        <p style="color:#888;">Upload the CSV — wrong names, dates &amp; amounts get flagged with a one-click fix. Missing bookings show up as one-click adds.</p>

        <div class="card" style="border-left:4px solid #3B82F6;background:#EFF6FF;">
          <div class="section-title">📖 HOW TO USE</div>
          <div style="line-height:1.9;font-size:13px;">
            <div><strong>Step 1:</strong> Go to <a href="https://www.airbnb.co.in/hosting/reservations/all" target="_blank" style="color:#FF385C;font-weight:600;">Airbnb Earnings ↗</a></div>
            <div><strong>Step 2:</strong> Click <strong>"Get CSV file"</strong> → Download</div>
            <div><strong>Step 3:</strong> Upload CSV below — auto-checks 1 Jul to today</div>
            <div><strong>Step 4:</strong> Click "Fix" next to any wrong field, or "+ Add" for a missing booking — applies instantly</div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">📁 Upload Airbnb CSV File</div>
          <input type="file" id="airbnbCsvFile" accept=".csv" onchange="handleAirbnbCSV(this)" style="width:100%;padding:12px;border:2px dashed #ddd;border-radius:8px;cursor:pointer;background:#fafafa;" />
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

    const reservationsByCode = {};
    const payouts = [];
    const netAmountByCode = {};

    // 1. Calculate net amounts or read direct Earnings/Amount
    rows.forEach(r => {
      const type = (r['Type'] || r['Status'] || '').trim();
      const code = (r['Confirmation Code'] || r['Confirmation code'] || r['Code'] || '').trim();
      if (type.toLowerCase().includes('payout') || !code) return;

      const rawAmt = r['Earnings'] || r['Paid out'] || r['Paid Out'] || r['Net Earnings'] || r['Amount'] || r['Total Payout'] || '0';
      const numAmt = parseFloat(String(rawAmt).replace(/[^0-9\.]/g, '')) || 0;
      netAmountByCode[code] = (netAmountByCode[code] || 0) + numAmt;
    });

    // 2. Parse all reservation rows (Handles Reservation CSV & Transaction History CSV)
    rows.forEach(r => {
      const type = (r['Type'] || r['Status'] || 'Reservation').trim();
      const code = (r['Confirmation Code'] || r['Confirmation code'] || r['Code'] || '').trim();

      if (type.toLowerCase().includes('payout') && !code) {
        payouts.push({
          date: parseDate(r['Date'] || r['Start date']),
          amount: parseFloat(String(r['Paid out'] || r['Amount'] || 0).replace(/[^0-9\.]/g, '')),
          reference: r['Details'] || r['Reference code'] || ''
        });
        return;
      }

      // Skip cancelled
      if (type.toLowerCase().includes('cancelled')) return;

      const sDate = r['Start date'] || r['Start Date'] || r['Check-in'] || r['Check in'];
      const eDate = r['End date'] || r['End Date'] || r['Check-out'] || r['Check out'];
      const guest = (r['Guest'] || r['Guest name'] || r['Contact Name'] || '').trim();
      const phone = (r['Contact'] || r['Phone'] || r['Guest Phone'] || '').trim();
      const listing = r['Listing'] || r['Property'] || r['Room'] || '';

      const checkIn = parseDate(sDate);
      const checkOut = parseDate(eDate);

      if (checkIn && (code || guest)) {
        const matchedRoomId = SYNC.getRoomIdByListing ? SYNC.getRoomIdByListing(listing) : matchListing(listing);
        const nights = checkIn && checkOut ? Math.max(Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000), 1) : 1;
        
        const rawEarn = r['Earnings'] || r['Paid out'] || r['Paid Out'] || r['Net Earnings'] || r['Amount'] || r['Total Payout'] || '0';
        const netAmt = netAmountByCode[code] || parseFloat(String(rawEarn).replace(/[^0-9\.]/g, '')) || 0;

        const adults = parseInt(r['# of adults'] || '1') || 1;
        const children = parseInt(r['# of children'] || '0') || 0;

        reservationsByCode[code || ('NO_CODE_' + guest + '_' + checkIn)] = {
          confirmation_code: code,
          guest_name: guest || 'Airbnb Guest',
          phone: phone && phone.length > 5 ? phone : null,
          check_in: checkIn,
          check_out: checkOut,
          nights: nights,
          guests: adults + children,
          matched_room_id: matchedRoomId,
          listing_name: listing,
          amount: netAmt,
          raw: r
        };
      }
    });

    SYNC.allReservations = Object.values(reservationsByCode);
    SYNC.payouts = payouts;

    // 3. AUTO-ENRICH SUPABASE DATABASE (Fill blank details in existing iCal bookings)
    let autoFilledCount = 0;
    for (let r of SYNC.allReservations) {
      if (!r.check_in || !r.matched_room_id) continue;

      // Find existing booking in DB for same room & check-in
      const { data: matchedDb } = await sb.from('guest_register')
        .select('booking_id, guest_name, phone, total_amount, airbnb_confirmation_code')
        .eq('room_id', r.matched_room_id)
        .eq('check_in', r.check_in)
        .maybeSingle();

      if (matchedDb) {
        const isTempName = !matchedDb.guest_name || matchedDb.guest_name.includes('Airbnb Guest') || matchedDb.guest_name.includes('Blocked');
        const isTempAmount = !matchedDb.total_amount || matchedDb.total_amount <= 0;
        const missingPhone = !matchedDb.phone && r.phone;

        if (isTempName || isTempAmount || missingPhone) {
          const updates = {
            guest_name: (isTempName && r.guest_name) ? r.guest_name : matchedDb.guest_name,
            phone: (missingPhone && r.phone) ? r.phone : matchedDb.phone,
            total_amount: (isTempAmount && r.amount > 0) ? r.amount : matchedDb.total_amount,
            guests: r.guests || 1,
            booking_mode: 'Online-Airbnb',
            airbnb_confirmation_code: r.confirmation_code || matchedDb.airbnb_confirmation_code,
            notes: 'CSV Enriched: Details & Payout Auto-filled'
          };

          await sb.from('guest_register').update(updates).eq('booking_id', matchedDb.booking_id);
          autoFilledCount++;
          console.log(`✅ Auto-filled DB details for ${r.guest_name} (${r.check_in})`);
        }
      }
    }

    if (autoFilledCount > 0 && window.fsn?.success) {
      fsn.success('Auto-Filled', `✅ Auto-filled details for ${autoFilledCount} bookings in DB!`);
    }

    // Filter and render preview
    if (typeof filterReservations === 'function') {
      filterReservations();
    } else {
      SYNC.reservations = SYNC.allReservations || [];
    }
    renderPreview();
  };

  function applyDateFilter() {
    SYNC.reservations = SYNC.allReservations.filter(r =>
      !r.check_in || ((!SYNC.fromDate || r.check_in >= SYNC.fromDate) && (!SYNC.toDate || r.check_in <= SYNC.toDate))
    );
  }

  function computePossiblyCancelled() {
    const csvCodes = new Set(SYNC.allReservations.map(r => r.confirmation_code));
    SYNC.possiblyCancelled = SYNC.existingByGuest.filter(e =>
      e.airbnb_confirmation_code &&
      e.booking_mode === 'Online-Airbnb' &&
      !e.is_cancelled &&
      !csvCodes.has(e.airbnb_confirmation_code) &&
      (!SYNC.fromDate || (e.check_in && e.check_in >= SYNC.fromDate)) &&
      (!SYNC.toDate || (e.check_in && e.check_in <= SYNC.toDate))
    );
  }

  window.setDateRange = function(which, value) {
    if (which === 'from') SYNC.fromDate = value;
    else SYNC.toDate = value;
    applyDateFilter();
    computePossiblyCancelled();
    renderPreview();
  };

  window.setRoomMap = function(code, roomId) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (r) { r.matched_room_id = roomId; r.match_confidence = 100; }
  };

  // ─── INSTANT actions — every click writes to Supabase right away ───

  window.instantAddBooking = async function(code) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r) return;
    if (!r.matched_room_id) { fsn.error('Pick a property first', 'Select which property this booking belongs to, then click Add again.'); return; }

    const btn = document.getElementById('add-' + code);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Adding...'; }

    const noteBits = ['Airbnb Code: ' + r.confirmation_code];
    if (r.cleaning_fee) noteBits.push('Clean: ₹' + r.cleaning_fee);
    if (r.service_fee) noteBits.push('Fee: ₹' + r.service_fee);

    const bkId = 'AIR' + r.confirmation_code;
    const payload = {
      guest_name: r.guest_name,
      room_id: r.matched_room_id,
      source_room_id: r.matched_room_id,
      booking_mode: 'Online-Airbnb',
      check_in: r.check_in,
      check_out: r.check_out,
      check_in_time: '14:00',
      check_out_time: '11:00',
      checkout_confirmed: true,
      total_amount: r.amount,
      per_day_rate: r.nights > 0 ? Math.round(r.amount / r.nights) : r.amount,
      gross_amount: r.gross,
      platform_fee: (r.gross || 0) - (r.amount || 0),
      airbnb_service_fee: r.service_fee || 0,
      airbnb_cleaning_fee: r.cleaning_fee || 0,
      airbnb_net_payout: r.amount,
      payment_status: 'Paid',
      notes: noteBits.join(' | '),
      booking_id: bkId,
      airbnb_confirmation_code: r.confirmation_code,
      guests: 1,
      booked_by: SESSION.displayName || 'Airbnb Sync',
      ...(typeof approvalMeta === 'function' ? approvalMeta() : {})
    };

    const { error } = await sb.from('guest_register').insert(payload);
    if (error) {
      fsn.error('Add failed', error.message);
      if (btn) { btn.disabled = false; btn.textContent = '➕ Add Booking'; }
      return;
    }
    if (r.amount > 0) {
      await sb.from('payment_history').insert({
        booking_id: bkId,
        amount: r.amount,
        payment_mode: 'Airbnb Payout',
        payment_date: r.date || r.check_out,
        notes: 'Auto-imported from Airbnb CSV',
        received_by: "Firoz",
        handover_status: "handed_over",
        ...(typeof approvalMeta === 'function' ? approvalMeta() : {})
      });
    }
    fsn.success('Added', r.guest_name + ' — booking added ✅');
    // Remove from the new-bookings list live
    SYNC.reservations = SYNC.reservations.filter(x => x.confirmation_code !== code);
    SYNC.allReservations = SYNC.allReservations.filter(x => x.confirmation_code !== code);
    renderPreview();
  };

  window.instantFixField = async function(code, field) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r || !r.dbBk) return;
    const issue = (r.issues || []).find(i => i.field === field);
    if (!issue) return;

    const btn = document.getElementById('fix-' + code + '-' + field);
    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }

    let updateFields = {};
    if (field === 'guest_name') updateFields.guest_name = r.guest_name;
    if (field === 'check_in') updateFields.check_in = r.check_in;
    if (field === 'check_out') updateFields.check_out = r.check_out;
    if (field === 'amount') {
      updateFields.total_amount = r.amount;
      updateFields.per_day_rate = r.nights > 0 ? Math.round(r.amount / r.nights) : r.amount;
    }
    if (field === 'room') { updateFields.room_id = r.matched_room_id; updateFields.source_room_id = r.matched_room_id; }
    if (field === 'mode') updateFields.booking_mode = 'Online-Airbnb';
    if (field === 'code') updateFields.airbnb_confirmation_code = r.confirmation_code;

    const { error } = await sb.from('guest_register').update(updateFields).eq('booking_id', r.dbBk.booking_id);
    if (error) {
      fsn.error('Fix failed', error.message);
      if (btn) { btn.disabled = false; btn.textContent = '✓ Fix'; }
      return;
    }

    // Reflect the fix locally, remove that one issue, re-render
    Object.assign(r.dbBk, updateFields);
    r.issues = (r.issues || []).filter(i => i.field !== field);
    if (r.issues.length === 0) {
      SYNC.reservations = SYNC.reservations.filter(x => x.confirmation_code !== code);
    }
    fsn.success('Fixed', issue.label + ' corrected ✅');
    renderPreview();
  };

  window.instantFixAll = async function(code) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r) return;
    const fields = (r.issues || []).map(i => i.field);
    for (const f of fields) {
      await window.instantFixField(code, f);
    }
  };

  function statusBadge(s) {
    if (s === 'new') return '<span class="badge green">🆕 NEW</span>';
    if (s === 'conflict') return '<span class="badge yellow">⚠️ CONFLICT</span>';
    return '<span class="badge blue">✅ MATCH</span>';
  }

  function renderPreview() {
    const container = document.getElementById('airbnbSyncPreview');
    if (!container) return;

    const newBookings = SYNC.reservations.filter(r => r.status === 'new');
    const conflicts = SYNC.reservations.filter(r => r.status === 'conflict');
    const matched = SYNC.reservations.filter(r => r.status === 'match');

    const roomOpts = (selected) => '<option value="">— Select property —</option>' + SYNC.rooms.map(rm =>
      '<option value="' + rm.room_id + '"' + (rm.room_id === selected ? ' selected' : '') + '>' +
      (rm.unit_no || '') + ' — ' + ((rm.nickname || rm.property_name || '').substring(0, 30)) +
      '</option>'
    ).join('');

    // ─── 🆕 New bookings — one click to add ───
    let newHtml = '';
    if (newBookings.length > 0) {
      newHtml = '<div class="card" style="margin-top:16px;border-left:4px solid var(--green);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
          '<div class="section-title" style="margin:0;">🆕 New Bookings — Not in Your System (' + newBookings.length + ')</div>' +
          '<button onclick="addAllNewBookings()" style="background:#059669;color:#fff;padding:10px 20px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">➕ Add All ' + newBookings.length + ' Bookings</button>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">These are on Airbnb but you haven\u2019t entered them yet. Pick the property (if not auto-matched) and click Add.</div>' +
        newBookings.map(r => `
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--green-bg);">
            <div style="flex:1;min-width:160px;">
              <strong>${r.guest_name}</strong><br>
              <small style="color:var(--muted);">${fmtDate(r.check_in)} → ${fmtDate(r.check_out)} · ${r.nights} nt</small>
            </div>
            <div style="min-width:120px;">
              <strong>₹${fmtNum(r.amount)}</strong><br><small style="color:var(--muted);">net payout</small>
            </div>
            <div style="min-width:200px;">
              <select onchange="setRoomMap('${r.confirmation_code}', this.value)" style="width:100%;padding:6px;font-size:12px;">
                ${roomOpts(r.matched_room_id)}
              </select>
              ${r.matched_room_id ? '<small style="color:var(--green);">✓ ' + r.match_confidence + '% match</small>' : '<small style="color:var(--red);">⚠️ pick property</small>'}
            </div>
            <button id="add-${r.confirmation_code}" class="btn-sm" style="background:var(--green);color:#fff;font-weight:700;" onclick="instantAddBooking('${r.confirmation_code}')">➕ Add Booking</button>
          </div>
        `).join('') +
      '</div>';
    }

    // ─── ⚠️ Conflicts — one click per field to fix ───
    let conflictHtml = '';
    if (conflicts.length > 0) {
      conflictHtml = '<div class="card" style="margin-top:16px;border-left:4px solid var(--yellow);">' +
        '<div class="section-title">✏️ Wrong Details — Click to Correct (' + conflicts.length + ')</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Left = what\u2019s in your app now. Right = what Airbnb actually shows. Click Fix to correct that one field instantly.</div>' +
        conflicts.map(r => `
          <div style="padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--gold-bg);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong>${r.guest_name}</strong>
              <small style="color:var(--muted);">${r.confirmation_code}</small>
            </div>
            ${(r.issues || []).map(i => `
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:1px solid rgba(0,0,0,0.06);">
                <span style="min-width:80px;font-weight:700;font-size:12px;">${i.label}:</span>
                <span style="text-decoration:line-through;color:var(--red);font-size:13px;">${i.field === 'amount' ? '₹' + fmtNum(i.db) : (i.field === 'check_in' || i.field === 'check_out' ? fmtDate(i.db) : i.db)}</span>
                <span>→</span>
                <span style="color:var(--green);font-weight:700;font-size:13px;">${i.field === 'amount' ? '₹' + fmtNum(i.csv) : (i.field === 'check_in' || i.field === 'check_out' ? fmtDate(i.csv) : i.csv)}</span>
                <button id="fix-${r.confirmation_code}-${i.field}" class="btn-sm" style="background:var(--primary);color:#fff;margin-left:auto;" onclick="instantFixField('${r.confirmation_code}','${i.field}')">✓ Fix</button>
              </div>
            `).join('')}
            ${(r.issues || []).length > 1 ? `<div style="text-align:right;margin-top:8px;"><button class="btn-sm outline" onclick="instantFixAll('${r.confirmation_code}')">✓ Fix All ${r.issues.length} Above</button></div>` : ''}
          </div>
        `).join('') +
      '</div>';
    }

    // ─── Possibly cancelled ───
    let cancelledHtml = '';
    if (SYNC.possiblyCancelled.length > 0) {
      cancelledHtml =
        '<div class="card" style="margin-top:16px;border-left:4px solid #DC2626;background:#FEF2F2;">' +
          '<div class="section-title" style="color:#991B1B;">🔴 Possibly Cancelled on Airbnb (' + SYNC.possiblyCancelled.length + ')</div>' +
          '<div style="font-size:12px;color:#7F1D1D;margin-bottom:10px;">Tagged Airbnb in your register but not in this CSV. Verify on Airbnb before marking cancelled.</div>' +
          '<div class="table-wrap"><table><thead><tr><th>Guest</th><th>Property</th><th>Check-in</th><th>Amount</th><th>Action</th></tr></thead><tbody>' +
          SYNC.possiblyCancelled.map(e =>
            '<tr>' +
              '<td>' + (e.guest_name || '-') + '</td>' +
              '<td><small>' + (e.rooms?.unit_no || '') + ' ' + (e.rooms?.nickname || '') + '</small></td>' +
              '<td>' + fmtDate(e.check_in) + '</td>' +
              '<td>₹' + fmtNum(e.total_amount) + '</td>' +
              '<td>' +
                '<button class="btn-sm" style="background:var(--yellow);color:#fff;" onclick="cancelBooking(\'' + e.booking_id + '\',\'' + (e.guest_name || '').replace(/'/g, "\\'") + '\')">🚫 Mark Cancelled</button> ' +
                '<button class="btn-sm outline" onclick="editBooking(\'' + e.booking_id + '\')">👁️ View</button>' +
              '</td>' +
            '</tr>'
          ).join('') +
          '</tbody></table></div>' +
        '</div>';
    }

    const inAppCount = SYNC.existingByGuest.filter(g => g.booking_mode === 'Online-Airbnb').length;
    const inAppRev = SYNC.existingByGuest.filter(g => g.booking_mode === 'Online-Airbnb').reduce((s, g) => s + (g.total_amount || 0), 0);
    const onAirbnbCount = SYNC.reservations.length;
    const onAirbnbRev = SYNC.reservations.reduce((s, r) => s + (r.gross || 0), 0);
    const syncRate = onAirbnbCount > 0 ? Math.round((inAppCount / onAirbnbCount) * 100) : 0;
    const revDiff = Math.abs(inAppRev - onAirbnbRev);
    const syncLabel = syncRate === 100 ? '✅ Perfectly Synced' : syncRate > 100 ? '⚠️ Extra in App' : syncRate > 90 ? '⚠️ Nearly Synced' : '🔴 Needs Sync';

    let payoutRows = '';
    SYNC.payouts.forEach(p => {
      payoutRows += '<tr><td>' + fmtDate(p.date) + '</td><td><strong style="color:#0A7D1A;">₹' + fmtNum(p.amount) + '</strong></td><td><small>' + (p.reference || '').substring(0, 60) + '</small></td></tr>';
    });

    container.innerHTML =
      '<div class="card" style="margin-top:20px;background:linear-gradient(135deg,#FF385C,#E00B41);color:#fff;border:none;">' +
        '<div class="section-title" style="color:#fff;border:none;">📊 SYNC STATUS · ' + fmtDate(SYNC.fromDate) + ' → ' + fmtDate(SYNC.toDate) + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:10px;">' +
          '<div style="background:rgba(255,255,255,0.15);padding:14px;border-radius:10px;text-align:center;"><div style="font-size:26px;font-weight:800;">' + newBookings.length + '</div><div style="font-size:11px;opacity:0.9;">🆕 TO ADD</div></div>' +
          '<div style="background:rgba(255,255,255,0.15);padding:14px;border-radius:10px;text-align:center;"><div style="font-size:26px;font-weight:800;">' + conflicts.length + '</div><div style="font-size:11px;opacity:0.9;">✏️ TO FIX</div></div>' +
          '<div style="background:rgba(255,255,255,0.15);padding:14px;border-radius:10px;text-align:center;"><div style="font-size:26px;font-weight:800;">' + matched.length + '</div><div style="font-size:11px;opacity:0.9;">✅ ALREADY OK</div></div>' +
          '<div style="background:rgba(255,255,255,0.15);padding:14px;border-radius:10px;text-align:center;"><div style="font-size:20px;font-weight:800;">₹' + fmtNum(revDiff) + '</div><div style="font-size:11px;opacity:0.9;">💰 REV DIFF</div><div style="font-size:11px;margin-top:2px;">' + syncLabel + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="card" style="margin-top:16px;">' +
        '<div class="section-title">📅 Date Range (auto: 1 Jul → today)</div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
          '<label>From: <input type="date" value="' + SYNC.fromDate + '" onchange="setDateRange(\'from\',this.value)" style="padding:6px 10px;border:1px solid #ccc;border-radius:6px;" /></label>' +
          '<label>To: <input type="date" value="' + SYNC.toDate + '" onchange="setDateRange(\'to\',this.value)" style="padding:6px 10px;border:1px solid #ccc;border-radius:6px;" /></label>' +
          '<span style="color:#666;font-size:12px;">Showing ' + SYNC.reservations.length + ' of ' + SYNC.allReservations.length + ' total in CSV</span>' +
        '</div>' +
      '</div>' +

      newHtml + conflictHtml + cancelledHtml +

      (matched.length > 0 ? '<div class="card" style="margin-top:16px;"><div class="section-title">✅ Already Correct (' + matched.length + ')</div><div style="font-size:12px;color:var(--muted);">No action needed — these match perfectly.</div></div>' : '') +

      (SYNC.payouts.length > 0 ?
        '<div class="card" style="margin-top:16px;"><h3 style="margin-top:0;">💰 Payouts (' + SYNC.payouts.length + ')</h3>' +
          '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Reference</th></tr></thead><tbody>' + payoutRows + '</tbody></table></div>' +
        '</div>'
      : '');
  }

  window.renderAirbnbSync = renderAirbnbSync;
})();

// ═══════════════════════════════════════════════════════════
// ➕ ADD ALL NEW BOOKINGS AT ONCE
// ═══════════════════════════════════════════════════════════
window.addAllNewBookings = async function() {
  const newBookings = (window.SYNC?.reservations || []).filter(r => r.status === 'new');
  if (newBookings.length === 0) {
    fsn.info('No New', 'Koi new booking nahi hai');
    return;
  }
  
  if (!confirm('➕ Add all ' + newBookings.length + ' bookings to system?')) return;
  
  let success = 0;
  let failed = 0;
  const errors = [];
  
  const btnAll = document.querySelector('[onclick="addAllNewBookings()"]');
  if (btnAll) { btnAll.disabled = true; }
  
  for (let i = 0; i < newBookings.length; i++) {
    const r = newBookings[i];
    if (btnAll) btnAll.textContent = '⏳ Adding ' + (i+1) + '/' + newBookings.length + '...';
    
    try {
      const roomSelect = document.getElementById('room-' + r.confirmation_code);
      const roomId = roomSelect?.value || r.matched_room_id;
      
      if (!roomId) {
        failed++;
        errors.push(r.guest_name + ': No property matched');
        continue;
      }
      
      // Check for existing "Airbnb Guest" or "Blocked" placeholder on same date+room
      const { data: existing } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount')
        .eq('room_id', roomId)
        .eq('check_in', r.check_in)
        .eq('check_out', r.check_out)
        .in('booking_mode', ['Online-Airbnb', 'Offline-Blocked'])
        .limit(1);
      
      const netAmount = r.amount || 0;
      const grossAmount = r.gross || r.gross_earnings || netAmount;
      // Calculate per-day rate
      const checkInDate = new Date(r.check_in);
      const checkOutDate = new Date(r.check_out);
      const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
      const perDayRate = Math.round(netAmount / nights);  // Rate based on total_amount (matches Total field)
      
      const bookingUpdate = {
        guest_name: r.guest_name,
        guests: r.guests || 1,
        total_amount: netAmount,
        gross_amount: grossAmount,
        per_day_rate: perDayRate,
        airbnb_net_payout: netAmount,
        airbnb_service_fee: r.service_fee || 0,
        airbnb_cleaning_fee: r.cleaning_fee || 0,
        airbnb_tax_withheld: r.tax_withheld || 0,
        airbnb_confirmation_code: r.confirmation_code,
        booking_mode: 'Online-Airbnb',
        payment_status: 'Paid',
        verification_status: 'verified',
        notes: 'CSV import ' + new Date().toISOString().slice(0,10) + ' — filled from Airbnb data'
      };
      
      let bookingId;
      let isUpdate = false;
      
      if (existing && existing.length > 0) {
        // UPDATE existing placeholder
        bookingId = existing[0].booking_id;
        const { error: upErr } = await sb.from('guest_register')
          .update(bookingUpdate)
          .eq('booking_id', bookingId);
        if (upErr) {
          failed++;
          errors.push(r.guest_name + ' (update): ' + upErr.message);
          continue;
        }
        isUpdate = true;
      } else {
        // INSERT new
        bookingId = 'BK' + Date.now() + Math.floor(Math.random() * 1000);
        bookingUpdate.booking_id = bookingId;
        bookingUpdate.room_id = roomId;
        bookingUpdate.check_in = r.check_in;
        bookingUpdate.check_out = r.check_out;
        const { error: insErr } = await sb.from('guest_register').insert(bookingUpdate);
        if (insErr) {
          failed++;
          errors.push(r.guest_name + ': ' + (insErr.message.includes('duplicate') ? 'Already exists' : insErr.message));
          continue;
        }
      }
      
      // Auto-create Airbnb payout entry in payment_history (if amount > 0)
      if (netAmount > 0) {
        const { data: existingPay } = await sb.from('payment_history')
          .select('id').eq('booking_id', bookingId).limit(1);
        if (!existingPay || existingPay.length === 0) {
          await sb.from('payment_history').insert({
            booking_id: bookingId,
            amount: netAmount,
            payment_date: r.check_out || r.check_in,
            paid_at: new Date().toISOString(),
            payment_mode: 'Airbnb Payout',
            received_by: 'Firoz',
            received_by_type: 'final',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: 'Auto-created from CSV import (Airbnb payout to Firoz)'
          });
        }
      }
      
      success++;
    } catch (err) {
      failed++;
      errors.push(r.guest_name + ': ' + err.message);
    }
  }
  
  let msg = '✅ ' + success + ' added';
  if (failed > 0) msg += '\n❌ ' + failed + ' failed\n\n' + errors.slice(0, 5).join('\n');
  alert(msg);
  
  if (window.renderAirbnbSync) renderAirbnbSync();
};

console.log('✅ addAllNewBookings loaded');


  SYNC.parseRows = function(text) {
    const rawRows = parseCSV(text);
    if (!rawRows || rawRows.length === 0) return [];

    const reservations = [];
    rawRows.forEach(row => {
      const type = (row['Type'] || row['Status'] || '').trim();

      // In Transaction History CSV, skip Payout, Tax, etc. Keep only Reservation or Confirmed rows
      if (type && !['Reservation', 'Confirmed', 'Currently hosting', 'Arriving', 'Review guest'].some(t => type.toLowerCase().includes(t.toLowerCase()))) {
        return;
      }

      const code = (row['Confirmation Code'] || row['Confirmation code'] || row['Code'] || '').trim();
      const guest = (row['Guest'] || row['Guest name'] || row['Contact Name'] || '').trim();
      const phone = (row['Contact'] || row['Phone'] || row['Guest Phone'] || '').trim();
      const listing = (row['Listing'] || row['Property'] || row['Room'] || '').trim();

      const sDate = row['Start date'] || row['Start Date'] || row['Check-in'] || row['Check in'];
      const eDate = row['End date'] || row['End Date'] || row['Check-out'] || row['Check out'];

      const grossAmt = parseFloat((row['Gross earnings'] || row['Gross Earnings'] || row['Amount'] || row['Total Payout'] || '0').replace(/[^0-9\.]/g, '')) || 0;
      const netAmt = parseFloat((row['Amount'] || row['Paid out'] || row['Total Payout'] || '0').replace(/[^0-9\.]/g, '')) || grossAmt;

      const parsedStart = parseDate(sDate);
      const parsedEnd = parseDate(eDate);

      if (parsedStart && (guest || code)) {
        reservations.push({
          type: type || 'Reservation',
          confirmation_code: code,
          guest_name: guest || 'Airbnb Guest',
          phone: phone || null,
          listing_name: listing,
          check_in: parsedStart,
          check_out: parsedEnd,
          amount: netAmt,
          gross_amount: grossAmt,
          raw: row
        });
      }
    });

    console.log(`✅ Parsed ${reservations.length} reservation rows from CSV!`);
    return reservations;
  };


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


  // RESERVATIONS CSV PARSER & AUTO-ENRICHER (Handles Airbnb India Reservations CSV)
  SYNC.parseReservationsCSV = function(text) {
    const rawRows = parseCSV(text);
    if (!rawRows || rawRows.length === 0) return [];

    const parsedList = [];
    rawRows.forEach(row => {
      const status = (row['Status'] || row['Type'] || '').trim();
      
      // Skip cancelled bookings
      if (status.toLowerCase().includes('cancelled')) return;

      const code = (row['Confirmation code'] || row['Confirmation Code'] || row['Code'] || '').trim();
      const guest = (row['Guest name'] || row['Guest'] || '').trim();
      const phone = (row['Contact'] || row['Phone'] || row['Guest Phone'] || '').trim();
      const listing = (row['Listing'] || row['Property'] || '').trim();
      const sDate = row['Start date'] || row['Start Date'] || row['Check-in'];
      const eDate = row['End date'] || row['End Date'] || row['Check-out'];
      const rawEarn = row['Earnings'] || row['Amount'] || row['Total Payout'] || '0';
      const earnings = parseFloat(String(rawEarn).replace(/[^0-9\.]/g, '')) || 0;
      
      const adults = parseInt(row['# of adults'] || '1') || 1;
      const children = parseInt(row['# of children'] || '0') || 0;
      const guestCount = adults + children;

      const checkIn = parseDate(sDate);
      const checkOut = parseDate(eDate);
      const roomId = SYNC.getRoomIdByListing ? SYNC.getRoomIdByListing(listing) : null;

      if (checkIn && (code || guest)) {
        parsedList.push({
          confirmation_code: code,
          guest_name: guest || 'Airbnb Guest',
          phone: phone && phone.length > 5 ? phone : null,
          check_in: checkIn,
          check_out: checkOut,
          room_id: roomId,
          listing_name: listing,
          total_amount: earnings,
          guests: guestCount,
          status: status
        });
      }
    });

    console.log(`✅ Parsed ${parsedList.length} valid confirmed bookings from reservations.csv!`);
    return parsedList;
  };

  // OVERRIDE CSV PROCESSOR TO AUTOMATICALLY DETECT AND PARSE RESERVATIONS.CSV
  if (!SYNC._origParseRows) {
    SYNC._origParseRows = SYNC.parseRows;
    SYNC.parseRows = function(text) {
      if (text.includes('Confirmation code') || text.includes('# of adults') || text.includes('Earnings')) {
        return SYNC.parseReservationsCSV(text);
      }
      return SYNC._origParseRows ? SYNC._origParseRows(text) : parseCSV(text);
    };
  }



// ==========================================
// 1-CLICK CLEAR DUMMY BLOCKS FUNCTION
// ==========================================
window.clearDummyBlocks = async function() {
  if (!confirm('Clear all auto-generated "Blocked (Fill Details)" slots from database?')) return;
  try {
    const { data: blocks } = await sb.from('guest_register')
      .select('booking_id')
      .or('booking_id.ilike.BLK_%,booking_mode.eq.Offline-Blocked,guest_name.ilike.%Blocked%');

    if (!blocks || blocks.length === 0) {
      if (window.fsn?.info) fsn.info('Clean', 'No dummy blocked slots found in database!');
      else alert('ℹ️ No dummy blocked slots found in database!');
      return;
    }

    let deleted = 0;
    for (let b of blocks) {
      await sb.from('guest_register').delete().eq('booking_id', b.booking_id);
      deleted++;
    }

    if (window.fsn?.success) fsn.success('Cleared', `✅ Successfully cleared ${deleted} dummy blocked slots!`);
    else alert(`✅ Successfully cleared ${deleted} dummy blocked slots!`);
    
    if (window.renderReports) renderReports();
    if (window.renderManageBookings) renderManageBookings();
    if (window.renderAirbnbSync) renderAirbnbSync();
  } catch(e) {
    alert('❌ Error clearing blocks: ' + e.message);
  }
};
