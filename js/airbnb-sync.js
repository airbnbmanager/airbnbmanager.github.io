// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB CSV SYNC
// ═══════════════════════════════════════════════════════════

(function() {
  const SYNC = {
    csvData: [],
    reservations: [],
    payouts: [],
    listingMap: {},   // Airbnb listing → room_id
    rooms: [],
    existing: {}      // confirmation codes that already exist
  };

  // ─── Parse date MM/DD/YYYY → YYYY-MM-DD ───
  function parseDate(str) {
    if (!str || !str.includes('/')) return null;
    const [m, d, y] = str.split('/');
    if (!m || !d || !y) return null;
    return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
  }

  // ─── CSV parser (handles quoted fields with commas) ───
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

  // ─── Fuzzy match Airbnb listing → your room ───
  function matchListing(listing) {
    if (!listing) return null;
    const clean = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = clean(listing);
    // Exact match
    let best = SYNC.rooms.find(r => clean(r.property_name) === target);
    if (best) return best.room_id;
    // Partial: check if first 20 chars match
    best = SYNC.rooms.find(r => {
      const rClean = clean(r.property_name);
      return rClean && (target.includes(rClean.slice(0, 20)) || rClean.includes(target.slice(0, 20)));
    });
    if (best) return best.room_id;
    // Match by first 3 words
    const words = listing.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
    best = SYNC.rooms.find(r => (r.property_name || '').toLowerCase().startsWith(words.slice(0, 15)));
    return best?.room_id || null;
  }

  // ─── Main render ───
  async function renderAirbnbSync() {
    if (!['developer', 'owner'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'airbnb-sync');
      return;
    }

    // Load rooms
    const { data: rooms } = await sb.from('rooms')
      .select('room_id, unit_no, nickname, property_name')
      .order('unit_no');
    SYNC.rooms = rooms || [];

    // Load existing confirmation codes
    const { data: existing } = await sb.from('guest_register')
      .select('booking_id, airbnb_confirmation_code')
      .not('airbnb_confirmation_code', 'is', null);
    SYNC.existing = {};
    (existing || []).forEach(e => { SYNC.existing[e.airbnb_confirmation_code] = e.booking_id; });

    renderShell(`
      <div class="wrap">
        <h1>🔄 Airbnb CSV Sync</h1>
        <p style="color:#888;">Upload Airbnb transaction CSV to auto-import bookings + payouts</p>

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

    // Group by Confirmation Code
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
        reservationsByCode[code] = {
          confirmation_code: code,
          date: parseDate(r['Date']),
          booking_date: parseDate(r['Booking date']),
          check_in: parseDate(r['Start date']),
          check_out: parseDate(r['End date']),
          nights: parseInt(r['Nights'] || 0),
          guest_name: r['Guest'] || '',
          listing: r['Listing'] || '',
          amount: parseFloat(r['Amount'] || 0),
          gross: parseFloat(r['Gross earnings'] || 0),
          service_fee: parseFloat(r['Service fee'] || 0),
          cleaning_fee: parseFloat(r['Cleaning fee'] || 0),
          matched_room_id: matchListing(r['Listing']),
          exists: !!SYNC.existing[code]
        };
      }
    });

    SYNC.reservations = Object.values(reservationsByCode);
    SYNC.payouts = payouts;

    renderPreview();
  };

  function renderPreview() {
    const container = document.getElementById('airbnbSyncPreview');
    if (!container) return;

    const newBks = SYNC.reservations.filter(r => !r.exists);
    const skipBks = SYNC.reservations.filter(r => r.exists);

    let rows = '';
    SYNC.reservations.forEach((r, i) => {
      const isNew = !r.exists;
      const roomOptions = SYNC.rooms.map(rm =>
        '<option value="' + rm.room_id + '"' + (rm.room_id === r.matched_room_id ? ' selected' : '') + '>' +
        (rm.unit_no || '') + ' - ' + (rm.nickname || rm.property_name || '').substring(0, 40) +
        '</option>'
      ).join('');

      rows += '<tr style="' + (isNew ? '' : 'opacity:0.4;background:#f9f9f9;') + '">' +
        '<td>' + (isNew ? '✅' : '⏭️') + '</td>' +
        '<td><small><strong>' + r.confirmation_code + '</strong></small></td>' +
        '<td>' + r.guest_name + '</td>' +
        '<td><small>' + r.check_in + ' → ' + r.check_out + '<br>(' + r.nights + ' nt)</small></td>' +
        '<td><strong>₹' + r.gross.toLocaleString('en-IN') + '</strong><br><small>Net: ₹' + r.amount.toLocaleString('en-IN') + '</small></td>' +
        '<td><small>' + (r.listing || '').substring(0, 40) + '</small><br>' +
          '<select data-idx="' + i + '" class="airbnb-room-map" style="font-size:11px;padding:2px;">' +
          '<option value="">— Select Room —</option>' +
          roomOptions +
          '</select>' +
        '</td>' +
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

    container.innerHTML = `
      <div class="card" style="margin-top:20px;">
        <div class="section-title">📋 Preview: ${newBks.length} new bookings, ${skipBks.length} skipped, ${SYNC.payouts.length} payouts</div>

        <h3 style="margin-top:20px;">Bookings</h3>
        <div class="table-wrap"><table>
          <thead><tr><th></th><th>Code</th><th>Guest</th><th>Dates</th><th>Amount</th><th>Listing → Room</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>

        <h3 style="margin-top:20px;">Payouts (will create payment records for matching Airbnb bookings)</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Amount</th><th>Reference</th></tr></thead>
          <tbody>${payoutRows}</tbody>
        </table></div>

        <div style="text-align:center;margin-top:20px;">
          <button onclick="runAirbnbImport()" style="padding:14px 40px;background:#008a05;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;">
            🚀 Import ${newBks.length} Bookings
          </button>
        </div>
      </div>
    `;

    // Bind room map changes
    document.querySelectorAll('.airbnb-room-map').forEach(sel => {
      sel.onchange = () => {
        const idx = parseInt(sel.dataset.idx);
        SYNC.reservations[idx].matched_room_id = sel.value || null;
      };
    });
  }

  window.runAirbnbImport = async function() {
    const newBks = SYNC.reservations.filter(r => !r.exists);
    if (newBks.length === 0) { fsn.info('Info', 'No new bookings to import'); return; }

    const unmapped = newBks.filter(r => !r.matched_room_id);
    if (unmapped.length > 0) {
      if (!confirm(`${unmapped.length} bookings have no room mapped. Skip them and import ${newBks.length - unmapped.length}?`)) return;
    }

    let created = 0, failed = 0;
    for (const r of newBks) {
      if (!r.matched_room_id) continue;

      const bkId = 'AIR' + r.confirmation_code;
      const noteBits = ['Imported from Airbnb CSV', 'Code: ' + r.confirmation_code];
      if (r.cleaning_fee) noteBits.push('Cleaning: ₹' + r.cleaning_fee);
      if (r.service_fee) noteBits.push('Service Fee: ₹' + r.service_fee);

      const payload = {
        booking_id: bkId,
        airbnb_confirmation_code: r.confirmation_code,
        guest_name: r.guest_name,
        room_id: r.matched_room_id,
        source_room_id: r.matched_room_id,
        booking_mode: 'Online-Airbnb',
        check_in: r.check_in,
        check_out: r.check_out,
        check_in_time: '14:00',
        check_out_time: '11:00',
        checkout_confirmed: true,
        guests: 1,
        total_amount: r.gross,
        per_day_rate: r.nights > 0 ? Math.round(r.gross / r.nights) : r.gross,
        payment_status: 'Paid',
        notes: noteBits.join(' | '),
        booked_by: SESSION.displayName || 'Airbnb Sync',
        ...(typeof approvalMeta === 'function' ? approvalMeta() : {})
      };

      const { error } = await sb.from('guest_register').insert(payload);
      if (error) {
        console.warn('Import failed for ' + r.confirmation_code + ':', error.message);
        failed++;
        continue;
      }
      // Also insert payment for the amount received (net "Amount" from Airbnb)
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

    fsn.success('Import Complete',
      `✅ ${created} bookings created\n` +
      (failed > 0 ? `❌ ${failed} failed\n` : '') +
      `⏭️ ${SYNC.reservations.length - newBks.length} already existed`
    );

    setTimeout(() => renderAirbnbSync(), 1500);
  };

  window.renderAirbnbSync = renderAirbnbSync;
})();
