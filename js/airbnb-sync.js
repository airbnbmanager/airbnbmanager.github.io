// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB CSV SYNC — Instant One-Click Fix Version
// ═══════════════════════════════════════════════════════════

(function() {
  const SYNC = {
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
    if (!str || !str.includes('/')) return null;
    const [m, d, y] = str.split('/');
    if (!m || !d || !y) return null;
    return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
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

    // Sum "Amount" across ALL row-types sharing a Confirmation Code —
    // Reservation + Tax Withholding for India Income + Host-Remitted Tax —
    // for the TRUE net payout (reading only the Reservation row overstates it).
    const netAmountByCode = {};
    rows.forEach(r => {
      const type = r['Type'];
      const code = r['Confirmation Code'];
      if (type === 'Payout' || !code) return;
      netAmountByCode[code] = (netAmountByCode[code] || 0) + (parseFloat(r['Amount']) || 0);
    });

    rows.forEach(r => {
      const type = r['Type'];
      const code = r['Confirmation Code'];

      if (type === 'Payout') {
        payouts.push({
          date: parseDate(r['Date']),
          amount: parseFloat(r['Paid out'] || 0),
          reference: r['Details'] || ''
        });
        return;
      }

      if (type === 'Reservation' && code) {
        const listing = r['Listing'] || '';
        const match = matchListing(listing);
        const csvBk = {
          confirmation_code: code,
          date: parseDate(r['Date']),
          booking_date: parseDate(r['Booking date']),
          check_in: parseDate(r['Start date']),
          check_out: parseDate(r['End date']),
          nights: parseInt(r['Nights'] || 0),
          guest_name: r['Guest'] || '',
          listing: listing,
          amount: Math.round((netAmountByCode[code] || parseFloat(r['Amount'] || 0)) * 100) / 100,
          gross: parseFloat(r['Gross earnings'] || 0),
          service_fee: parseFloat(r['Service fee'] || 0),
          cleaning_fee: parseFloat(r['Cleaning fee'] || 0),
          matched_room_id: match.room_id,
          match_confidence: match.confidence,
        };
        const dbBk = SYNC.existingByCode[code];
        const cmp = compareBooking(csvBk, dbBk);
        csvBk.status = cmp.status;
        csvBk.issues = cmp.issues;
        csvBk.dbBk = cmp.dbBk;
        reservationsByCode[code] = csvBk;
      }
    });

    SYNC.allReservations = Object.values(reservationsByCode);
    // Auto date-range: 1 July → today. Editable below if needed.
    applyDateFilter();
    SYNC.payouts = payouts;

    computePossiblyCancelled();
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
        '<div class="section-title">🆕 New Bookings — Not in Your System (' + newBookings.length + ')</div>' +
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
