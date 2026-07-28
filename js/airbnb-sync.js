// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB CSV SYNC — Enhanced Compare Version
// ═══════════════════════════════════════════════════════════

(function() {
  const SYNC = {
    csvData: [],
    reservations: [],
    payouts: [],
    rooms: [],
    existingByCode: {},   // confirmation_code → booking record
    existingByGuest: [],  // for fuzzy dupe detection
    filter: 'all'
  };

  // ─── Date MM/DD/YYYY → YYYY-MM-DD ───
  function parseDate(str) {
    if (!str || !str.includes('/')) return null;
    const [m, d, y] = str.split('/');
    if (!m || !d || !y) return null;
    return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
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
    const headers = parseLine(lines[0]).map(h => h.trim());
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
    // Common prefix
    let common = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) common++; else break;
    }
    const prefScore = (common / Math.max(a.length, b.length)) * 100;
    // Word overlap
    const aw = new Set(a.match(/[a-z0-9]+/g) || []);
    const bw = new Set(b.match(/[a-z0-9]+/g) || []);
    let overlap = 0;
    aw.forEach(w => { if (bw.has(w)) overlap++; });
    const wordScore = (overlap / Math.max(aw.size, bw.size, 1)) * 100;
    return Math.max(prefScore, wordScore);
  }

  // ─── Match Airbnb listing → your room (returns { room_id, confidence }) ───
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

  // ─── Compare Airbnb reservation vs existing system booking ───
  function compareBooking(csvBk, dbBk) {
    const issues = [];
    if (!dbBk) return { status: 'new', issues };

    // Guest name check
    if (csvBk.guest_name && dbBk.guest_name && fuzzyMatch(csvBk.guest_name, dbBk.guest_name) < 70) {
      issues.push({ field: 'Guest', csv: csvBk.guest_name, db: dbBk.guest_name });
    }
    // Check-in
    if (csvBk.check_in !== dbBk.check_in) {
      issues.push({ field: 'Check-in', csv: csvBk.check_in, db: dbBk.check_in });
    }
    // Check-out
    if (csvBk.check_out !== dbBk.check_out) {
      issues.push({ field: 'Check-out', csv: csvBk.check_out, db: dbBk.check_out });
    }
    // Amount (tolerance ₹10)
    if (Math.abs((csvBk.gross || 0) - (dbBk.total_amount || 0)) > 10) {
      issues.push({ field: 'Amount', csv: '₹' + csvBk.gross, db: '₹' + (dbBk.total_amount || 0) });
    }
    // Room
    if (csvBk.matched_room_id && dbBk.room_id && csvBk.matched_room_id !== dbBk.room_id) {
      issues.push({ field: 'Room', csv: csvBk.matched_room_id, db: dbBk.room_id });
    }

    return {
      status: issues.length > 0 ? 'conflict' : 'match',
      issues,
      dbBk
    };
  }

  // ─── Main render ───
  async function renderAirbnbSync() {
    if (!['developer', 'owner'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'airbnb-sync');
      return;
    }

    const { data: rooms } = await sb.from('rooms')
      .select('room_id, unit_no, nickname, property_name')
      .order('unit_no');
    SYNC.rooms = rooms || [];

    // Load ALL existing bookings for fuzzy comparison
    const { data: existing } = await sb.from('guest_register')
      .select('booking_id, airbnb_confirmation_code, guest_name, check_in, check_out, total_amount, room_id, booking_mode, rooms(unit_no, nickname)')
      .order('check_in', { ascending: false })
      .limit(500);

    SYNC.existingByCode = {};
    SYNC.existingByGuest = existing || [];
    (existing || []).forEach(e => {
      if (e.airbnb_confirmation_code) SYNC.existingByCode[e.airbnb_confirmation_code] = e;
    });

    renderShell(`
      <div class="wrap">
        <h1>🔄 Airbnb CSV Sync</h1>
        <p style="color:#888;">Upload Airbnb transaction CSV to compare + import bookings</p>

        <div class="card" style="text-align:center;padding:30px;">
          <input type="file" id="airbnbCsvFile" accept=".csv" style="display:none;" onchange="handleAirbnbCSV(this)" />
          <label for="airbnbCsvFile" style="display:inline-block;padding:16px 32px;background:#FF385C;color:#fff;border-radius:8px;cursor:pointer;font-weight:600;">
            📁 Upload Airbnb CSV
          </label>
          <p style="color:#888;margin-top:12px;font-size:12px;">
            Airbnb → Reservations → Transaction history → Export CSV
          </p>
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
          amount: parseFloat(r['Amount'] || 0),
          gross: parseFloat(r['Gross earnings'] || 0),
          service_fee: parseFloat(r['Service fee'] || 0),
          cleaning_fee: parseFloat(r['Cleaning fee'] || 0),
          matched_room_id: match.room_id,
          match_confidence: match.confidence,
        };
        // Compare with DB
        const dbBk = SYNC.existingByCode[code];
        const cmp = compareBooking(csvBk, dbBk);
        csvBk.status = cmp.status;
        csvBk.issues = cmp.issues;
        csvBk.dbBk = cmp.dbBk;
        csvBk.action = cmp.status === 'new' ? 'import' : (cmp.status === 'conflict' ? 'update' : 'skip');
        reservationsByCode[code] = csvBk;
      }
    });

    SYNC.reservations = Object.values(reservationsByCode);
    SYNC.payouts = payouts;
    SYNC.filter = 'all';

    renderPreview();
  };

  window.setSyncFilter = function(f) {
    SYNC.filter = f;
    renderPreview();
  };

  window.setRowAction = function(idx, action) {
    if (SYNC.reservations[idx]) SYNC.reservations[idx].action = action;
    renderPreview();
  };

  window.setRoomMap = function(idx, roomId) {
    if (SYNC.reservations[idx]) {
      SYNC.reservations[idx].matched_room_id = roomId;
      SYNC.reservations[idx].match_confidence = 100; // manual
    }
  };

  window.editReservationField = function(idx, field, value) {
    if (SYNC.reservations[idx]) {
      if (field === 'gross' || field === 'amount') value = parseFloat(value) || 0;
      SYNC.reservations[idx][field] = value;
    }
  };

  function statusBadge(s) {
    if (s === 'new') return '<span class="badge green">🆕 NEW</span>';
    if (s === 'match') return '<span class="badge blue">✅ MATCH</span>';
    if (s === 'conflict') return '<span class="badge yellow">⚠️ CONFLICT</span>';
    return '<span class="badge">-</span>';
  }

  function renderPreview() {
    const container = document.getElementById('airbnbSyncPreview');
    if (!container) return;

    const counts = {
      all: SYNC.reservations.length,
      new: SYNC.reservations.filter(r => r.status === 'new').length,
      match: SYNC.reservations.filter(r => r.status === 'match').length,
      conflict: SYNC.reservations.filter(r => r.status === 'conflict').length,
      unmapped: SYNC.reservations.filter(r => !r.matched_room_id).length,
    };

    let filtered = SYNC.reservations;
    if (SYNC.filter === 'new') filtered = filtered.filter(r => r.status === 'new');
    else if (SYNC.filter === 'match') filtered = filtered.filter(r => r.status === 'match');
    else if (SYNC.filter === 'conflict') filtered = filtered.filter(r => r.status === 'conflict');
    else if (SYNC.filter === 'unmapped') filtered = filtered.filter(r => !r.matched_room_id);

    const roomOpts = (selected) => SYNC.rooms.map(rm =>
      '<option value="' + rm.room_id + '"' + (rm.room_id === selected ? ' selected' : '') + '>' +
      (rm.unit_no || '') + ' — ' + ((rm.nickname || rm.property_name || '').substring(0, 30)) +
      '</option>'
    ).join('');

    let rows = '';
    filtered.forEach(r => {
      const idx = SYNC.reservations.indexOf(r);
      const dbRoom = r.dbBk?.rooms ? (r.dbBk.rooms.unit_no + ' ' + (r.dbBk.rooms.nickname || '')) : '';
      const confidence = r.match_confidence >= 80 ? 'green' : r.match_confidence >= 50 ? 'orange' : 'red';

      // Issue diff visualization
      let issueHtml = '';
      if (r.issues && r.issues.length > 0) {
        issueHtml = '<div style="background:#FEF3C7;padding:8px;border-radius:6px;margin-top:6px;font-size:11px;">' +
          '<strong>⚠️ Differences:</strong><br>' +
          r.issues.map(i =>
            '<div>' + i.field + ': <span style="color:#DC2626;text-decoration:line-through;">' + i.db + '</span> → <span style="color:#0A7D1A;font-weight:600;">' + i.csv + '</span></div>'
          ).join('') +
          '</div>';
      }

      // Action buttons based on status
      let actions = '';
      if (r.status === 'new') {
        actions =
          '<button class="btn-sm ' + (r.action === 'import' ? 'green-btn' : 'outline') + '" onclick="setRowAction(' + idx + ',\\\'import\\\')">✅ Import</button> ' +
          '<button class="btn-sm ' + (r.action === 'skip' ? 'danger' : 'outline') + '" onclick="setRowAction(' + idx + ',\\\'skip\\\')">🚫 Skip</button>';
      } else if (r.status === 'conflict') {
        actions =
          '<button class="btn-sm ' + (r.action === 'update' ? 'green-btn' : 'outline') + '" onclick="setRowAction(' + idx + ',\\\'update\\\')">🔄 Update</button> ' +
          '<button class="btn-sm ' + (r.action === 'skip' ? 'danger' : 'outline') + '" onclick="setRowAction(' + idx + ',\\\'skip\\\')">🚫 Skip</button> ' +
          '<button class="btn-sm outline" onclick="editBooking(\\\'' + (r.dbBk?.booking_id || '') + '\\\')">👁️ View</button>';
      } else {
        actions = '<button class="btn-sm outline" onclick="editBooking(\\\'' + (r.dbBk?.booking_id || '') + '\\\')">👁️ View</button>';
      }

      const guestFuzzy = r.dbBk ? fuzzyMatch(r.guest_name, r.dbBk.guest_name || '') : 100;
      const guestWarn = guestFuzzy < 90 && r.dbBk ? ' <span style="color:#F59E0B;font-size:10px;" title="Possible name mismatch">⚠️</span>' : '';

      rows +=
        '<tr style="border-top:2px solid #eee;">' +
          '<td>' + statusBadge(r.status) + '</td>' +
          '<td><small><strong>' + r.confirmation_code + '</strong></small></td>' +
          '<td>' +
            '<input type="text" value="' + r.guest_name + '" onchange="editReservationField(' + idx + ',\\\'guest_name\\\',this.value)" style="width:110px;font-size:12px;padding:2px 4px;" />' +
            guestWarn +
            (r.dbBk?.guest_name && guestFuzzy < 100 ? '<br><small style="color:#888;">DB: ' + r.dbBk.guest_name + '</small>' : '') +
          '</td>' +
          '<td><small>' + r.check_in + '<br>→ ' + r.check_out + '<br>(' + r.nights + ' nt)</small></td>' +
          '<td>' +
            '<input type="number" value="' + r.gross + '" onchange="editReservationField(' + idx + ',\\\'gross\\\',this.value)" style="width:80px;font-size:12px;padding:2px 4px;" />' +
            '<br><small>Net: ₹' + r.amount.toLocaleString('en-IN') + '</small>' +
          '</td>' +
          '<td>' +
            '<small style="color:#888;">' + (r.listing || '').substring(0, 35) + '</small><br>' +
            '<select onchange="setRoomMap(' + idx + ',this.value)" style="font-size:11px;padding:2px;max-width:180px;">' +
              '<option value="">— Select —</option>' +
              roomOpts(r.matched_room_id) +
            '</select>' +
            (r.matched_room_id ? ' <span style="color:' + confidence + ';font-size:10px;font-weight:700;">' + r.match_confidence + '%</span>' : ' <span style="color:#DC2626;font-size:10px;">❌</span>') +
          '</td>' +
          '<td>' + actions + issueHtml + '</td>' +
        '</tr>';
    });

    let payoutRows = '';
    SYNC.payouts.forEach(p => {
      payoutRows += '<tr>' +
        '<td>' + p.date + '</td>' +
        '<td><strong style="color:#0A7D1A;">₹' + p.amount.toLocaleString('en-IN') + '</strong></td>' +
        '<td><small>' + (p.reference || '').substring(0, 60) + '</small></td>' +
        '</tr>';
    });

    const totalActions = SYNC.reservations.filter(r => r.action === 'import' || r.action === 'update').length;

    container.innerHTML =
      '<div class="card" style="margin-top:20px;">' +

        '<div class="section-title">📊 CSV Summary</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:10px 0;">' +
          '<div class="stat-card" style="background:#fff;border:2px solid #eee;text-align:center;padding:10px;"><div style="font-size:24px;font-weight:800;">' + counts.all + '</div><div style="font-size:11px;color:#888;">Total</div></div>' +
          '<div class="stat-card" style="background:#D1FAE5;text-align:center;padding:10px;cursor:pointer;" onclick="setSyncFilter(\\\'new\\\')"><div style="font-size:24px;font-weight:800;color:#0A7D1A;">' + counts.new + '</div><div style="font-size:11px;">🆕 New</div></div>' +
          '<div class="stat-card" style="background:#DBEAFE;text-align:center;padding:10px;cursor:pointer;" onclick="setSyncFilter(\\\'match\\\')"><div style="font-size:24px;font-weight:800;color:#1E40AF;">' + counts.match + '</div><div style="font-size:11px;">✅ Match</div></div>' +
          '<div class="stat-card" style="background:#FEF3C7;text-align:center;padding:10px;cursor:pointer;" onclick="setSyncFilter(\\\'conflict\\\')"><div style="font-size:24px;font-weight:800;color:#B45309;">' + counts.conflict + '</div><div style="font-size:11px;">⚠️ Conflict</div></div>' +
          '<div class="stat-card" style="background:#FEE2E2;text-align:center;padding:10px;cursor:pointer;" onclick="setSyncFilter(\\\'unmapped\\\')"><div style="font-size:24px;font-weight:800;color:#DC2626;">' + counts.unmapped + '</div><div style="font-size:11px;">🔴 Unmapped</div></div>' +
        '</div>' +

        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;align-items:center;">' +
          '<strong>Filter:</strong> ' +
          '<button class="btn-sm ' + (SYNC.filter === 'all' ? '' : 'outline') + '" onclick="setSyncFilter(\\\'all\\\')">All (' + counts.all + ')</button>' +
          '<button class="btn-sm ' + (SYNC.filter === 'new' ? 'green-btn' : 'outline') + '" onclick="setSyncFilter(\\\'new\\\')">🆕 New (' + counts.new + ')</button>' +
          '<button class="btn-sm ' + (SYNC.filter === 'conflict' ? '' : 'outline') + '" style="' + (SYNC.filter === 'conflict' ? 'background:#F59E0B;color:#fff;' : '') + '" onclick="setSyncFilter(\\\'conflict\\\')">⚠️ Conflicts (' + counts.conflict + ')</button>' +
          '<button class="btn-sm ' + (SYNC.filter === 'match' ? '' : 'outline') + '" onclick="setSyncFilter(\\\'match\\\')">✅ Matched (' + counts.match + ')</button>' +
          '<button class="btn-sm ' + (SYNC.filter === 'unmapped' ? 'danger' : 'outline') + '" onclick="setSyncFilter(\\\'unmapped\\\')">🔴 Unmapped (' + counts.unmapped + ')</button>' +
        '</div>' +

        '<div class="table-wrap"><table style="font-size:12px;">' +
          '<thead><tr style="background:#222;color:#fff;">' +
            '<th>Status</th><th>Code</th><th>Guest</th><th>Dates</th><th>Amount</th><th>Listing → Room</th><th>Actions</th>' +
          '</tr></thead>' +
          '<tbody>' + (rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">No rows match filter</td></tr>') + '</tbody>' +
        '</table></div>' +

        (SYNC.payouts.length > 0 ?
          '<h3 style="margin-top:20px;">💰 Payouts (' + SYNC.payouts.length + ')</h3>' +
          '<div class="table-wrap"><table>' +
            '<thead><tr><th>Date</th><th>Amount</th><th>Reference</th></tr></thead>' +
            '<tbody>' + payoutRows + '</tbody>' +
          '</table></div>'
        : '') +

        '<div style="text-align:center;margin-top:20px;padding:16px;background:#F3F4F6;border-radius:8px;">' +
          '<div style="margin-bottom:10px;color:#374151;">Will process <strong>' + totalActions + '</strong> bookings (skips will be ignored)</div>' +
          '<button onclick="runAirbnbImport()" style="padding:14px 40px;background:#008a05;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;">' +
            '🚀 Process ' + totalActions + ' Bookings' +
          '</button>' +
        '</div>' +

      '</div>';
  }

  window.runAirbnbImport = async function() {
    const toProcess = SYNC.reservations.filter(r => r.action === 'import' || r.action === 'update');
    if (toProcess.length === 0) { fsn.info('Info', 'Nothing to process'); return; }

    const unmapped = toProcess.filter(r => !r.matched_room_id);
    if (unmapped.length > 0) {
      if (!confirm(unmapped.length + ' rows have no room mapped. Continue and skip them?')) return;
    }

    if (!confirm('Process ' + toProcess.length + ' bookings? This will create/update records in database.')) return;

    let created = 0, updated = 0, failed = 0;

    for (const r of toProcess) {
      if (!r.matched_room_id) { failed++; continue; }

      const noteBits = ['Airbnb Code: ' + r.confirmation_code];
      if (r.cleaning_fee) noteBits.push('Clean: ₹' + r.cleaning_fee);
      if (r.service_fee) noteBits.push('Fee: ₹' + r.service_fee);

      const commonFields = {
        guest_name: r.guest_name,
        room_id: r.matched_room_id,
        source_room_id: r.matched_room_id,
        booking_mode: 'Online-Airbnb',
        check_in: r.check_in,
        check_out: r.check_out,
        check_in_time: '14:00',
        check_out_time: '11:00',
        checkout_confirmed: true,
        total_amount: r.gross,
        per_day_rate: r.nights > 0 ? Math.round(r.gross / r.nights) : r.gross,
        payment_status: 'Paid',
        notes: noteBits.join(' | ')
      };

      if (r.action === 'update' && r.dbBk) {
        // UPDATE existing
        const { error } = await sb.from('guest_register').update(commonFields).eq('booking_id', r.dbBk.booking_id);
        if (error) { console.warn('Update failed:', error.message); failed++; continue; }
        updated++;
      } else {
        // INSERT new
        const bkId = 'AIR' + r.confirmation_code;
        const payload = {
          ...commonFields,
          booking_id: bkId,
          airbnb_confirmation_code: r.confirmation_code,
          guests: 1,
          booked_by: SESSION.displayName || 'Airbnb Sync',
          ...(typeof approvalMeta === 'function' ? approvalMeta() : {})
        };
        const { error } = await sb.from('guest_register').insert(payload);
        if (error) { console.warn('Insert failed:', error.message); failed++; continue; }
        // Also insert Airbnb payment for the net amount
        if (r.amount > 0) {
          await sb.from('payment_history').insert({
            booking_id: bkId,
            amount: r.amount,
            payment_mode: 'Airbnb Payout',
            payment_date: r.date || r.check_out,
            notes: 'Auto-imported from Airbnb CSV',
            ...(typeof approvalMeta === 'function' ? approvalMeta() : {})
          });
        }
        created++;
      }
    }

    fsn.success('Sync Complete',
      '✅ ' + created + ' created\n' +
      '🔄 ' + updated + ' updated\n' +
      (failed > 0 ? '❌ ' + failed + ' failed' : '')
    );

    setTimeout(() => renderAirbnbSync(), 1500);
  };

  window.renderAirbnbSync = renderAirbnbSync;
})();
