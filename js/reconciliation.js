/**
 * Airbnb Reconciliation Module
 * Compare Airbnb CSV vs App bookings
 * UNIQUE HAVEN HOMES STAY
 */

async function renderAirbnbSync() {
  renderShell(`
    <div class="card">
      <h1>🔄 Airbnb Sync Check</h1>
      <div class="sub">Compare Airbnb CSV with app bookings to find missing entries</div>
    </div>

    <div class="card" style="background:#F0F7FF;border-left:4px solid var(--blue);">
      <div class="section-title">📋 How to Use</div>
      <div style="font-size:13px;line-height:2;">
        <p><strong>Step 1:</strong> Go to <a href="https://www.airbnb.co.in/earnings" target="_blank" style="color:var(--red);">Airbnb Earnings</a></p>
        <p><strong>Step 2:</strong> Click <strong>"Get CSV file"</strong> → Download</p>
        <p><strong>Step 3:</strong> Upload CSV below</p>
        <p><strong>Step 4:</strong> System will show missing bookings (from July 2026)</p>
        <p><strong>Step 5:</strong> Click <strong>"Add to App"</strong> to import them</p>
      </div>
    </div>

    <div class="card">
      <div class="form-group">
        <label>Upload Airbnb CSV File</label>
        <input type="file" id="csvFile" accept=".csv" onchange="processAirbnbCSV(this)" />
      </div>
      <div id="csvStatus"></div>
    </div>

    <div id="reconResults"></div>
  `, 'airbnb-sync');
}

async function processAirbnbCSV(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const statusEl = document.getElementById('csvStatus');
  statusEl.innerHTML = '<div class="loading">Processing CSV...</div>';

  const reader = new FileReader();
  reader.onload = async function(e) {
    const csvText = e.target.result;
    const airbnbBookings = parseAirbnbCSV(csvText);

    if (airbnbBookings.length === 0) {
      statusEl.innerHTML = '<div class="error">❌ No valid bookings found in CSV</div>';
      return;
    }

    statusEl.innerHTML = `<div class="success-msg">✅ Loaded ${airbnbBookings.length} bookings from CSV</div>`;

    // Fetch app bookings (Airbnb mode only, from July 2026)
    const { data: appBookings } = await sb.from('guest_register')
      .select('booking_id, guest_name, check_in, check_out, room_id, total_amount, notes, booking_mode, rooms(nickname, unit_no)')
      .eq('booking_mode', 'Online-Airbnb')
      .gte('check_in', '2026-07-01')
      .order('check_in');

    // Build match map from app: guest+checkin as key
    const appMap = {};
    (appBookings || []).forEach(b => {
      const key = normalizeKey(b.guest_name, b.check_in);
      appMap[key] = b;
    });

    // Convert CSV date to YYYY-MM-DD format
    const convertDate = (d) => {
      if (!d) return '';
      // MM/DD/YYYY or DD/MM/YYYY format from Airbnb
      const parts = d.split('/');
      if (parts.length === 3) {
        // Airbnb uses MM/DD/YYYY
        return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
      }
      return d;
    };

    // Build multiple index for app bookings (by first name + date, and full name + date)
    const appMapAlt = {};
    (appBookings || []).forEach(b => {
      const key1 = normalizeKey(b.guest_name, b.check_in);
      const key2 = normalizeKeyAlt(b.guest_name, b.check_in);
      appMap[key1] = b;
      appMapAlt[key2] = b;
      // Also try by date only for close match
      const dateKey = 'date_' + b.check_in;
      if (!appMap[dateKey]) appMap[dateKey] = [];
      if (Array.isArray(appMap[dateKey])) appMap[dateKey].push(b);
    });

    // Find missing (in CSV but not in app)
    const missing = airbnbBookings.filter(ab => {
      const cdate = convertDate(ab.startDate);
      if (cdate < '2026-07-01') return false;
      ab.startDateNorm = cdate;
      ab.endDateNorm = convertDate(ab.endDate);
      const key = normalizeKey(ab.guest, cdate);
      const keyAlt = normalizeKeyAlt(ab.guest, cdate);
      return !appMap[key] && !appMapAlt[keyAlt];
    });

    // Find matched
    const matched = airbnbBookings.filter(ab => {
      const cdate = convertDate(ab.startDate);
      if (cdate < '2026-07-01') return false;
      const key = normalizeKey(ab.guest, cdate);
      const keyAlt = normalizeKeyAlt(ab.guest, cdate);
      return !!appMap[key] || !!appMapAlt[keyAlt];
    });

    // Extra in app (not in CSV)
    const csvMap = {};
    const csvMapAlt = {};
    airbnbBookings.forEach(ab => {
      const cdate = convertDate(ab.startDate);
      csvMap[normalizeKey(ab.guest, cdate)] = ab;
      csvMapAlt[normalizeKeyAlt(ab.guest, cdate)] = ab;
    });
    const extraInApp = (appBookings || []).filter(b => {
      const key = normalizeKey(b.guest_name, b.check_in);
      const keyAlt = normalizeKeyAlt(b.guest_name, b.check_in);
      return !csvMap[key] && !csvMapAlt[keyAlt];
    });

    window._reconData = { missing, matched, extraInApp, airbnbBookings };

    document.getElementById('reconResults').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card" style="border-left:4px solid var(--green);">
          <div class="stat-num" style="color:var(--green);">${matched.length}</div>
          <div class="stat-label">✅ Matched</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--red);">
          <div class="stat-num" style="color:var(--red);">${missing.length}</div>
          <div class="stat-label">❌ Missing in App</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--yellow);">
          <div class="stat-num" style="color:var(--yellow);">${extraInApp.length}</div>
          <div class="stat-label">⚠️ Extra in App</div>
        </div>
      </div>

      ${missing.length > 0 ? `
      <div class="card" style="border-left:4px solid var(--red);">
        <div class="section-title">
          ❌ Missing Bookings (${missing.length}) — Need to add
        </div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Guest</th><th>Property</th><th>Check-in</th><th>Check-out</th>
            <th>Nights</th><th>Amount</th><th>Action</th>
          </tr></thead>
          <tbody>
            ${missing.map((m, i) => `
              <tr>
                <td><strong>${m.guest || '-'}</strong></td>
                <td style="font-size:12px;">${m.listing || '-'}</td>
                <td>${m.startDateNorm || m.startDate || '-'}</td>
                <td>${m.endDateNorm || m.endDate || '-'}</td>
                <td>${m.nights || 0}</td>
                <td style="color:var(--green);font-weight:700;">₹${(m.amount || 0).toLocaleString('en-IN')}</td>
                <td><button class="btn-sm" onclick="quickAddMissing(${i})">➕ Add</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
      ` : `
      <div class="card" style="background:#DEF7EC;border-left:4px solid var(--green);">
        <strong>🎉 All Airbnb bookings are synced!</strong>
      </div>
      `}

      ${extraInApp.length > 0 ? `
      <div class="card" style="border-left:4px solid var(--yellow);">
        <div class="section-title">⚠️ In App but not in Airbnb CSV (${extraInApp.length})</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">
          These might be older bookings, manual entries, or need CSV re-download
        </div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Guest</th><th>Property</th><th>Check-in</th><th>Check-out</th><th>Amount</th>
          </tr></thead>
          <tbody>
            ${extraInApp.slice(0, 20).map(b => `
              <tr>
                <td>${b.guest_name || '-'}</td>
                <td style="font-size:12px;">${b.rooms?.nickname || b.room_id}</td>
                <td>${b.check_in || '-'}</td>
                <td>${b.check_out || '-'}</td>
                <td>₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
      ` : ''}
    `;
  };
  reader.readAsText(file);
}

function normalizeKey(name, date) {
  if (!name || !date) return '';
  // Use first name (before space) + date - handles "Nitesh Vishwakarma" vs "Nitesh"
  const firstName = name.toString().trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${firstName}_${date}`;
}

function normalizeKeyAlt(name, date) {
  if (!name || !date) return '';
  // Alternative: full cleaned name (in case first name matches multiple guests)
  const cleanName = name.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${date}`;
}

function parseAirbnbCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseCSVLine = (line) => {
    const result = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { result.push(curr.trim()); curr = ''; }
      else curr += ch;
    }
    result.push(curr.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const findCol = (name) => headers.findIndex(h => h.includes(name.toLowerCase()));

  const idx = {
    type: findCol('type'),
    guest: findCol('guest'),
    listing: findCol('listing'),
    startDate: findCol('start date'),
    endDate: findCol('end date'),
    nights: findCol('nights'),
    amount: findCol('amount'),
    confirmCode: findCol('confirmation'),
    grossEarnings: findCol('gross earnings'),
  };

  const bookings = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const type = (cols[idx.type] || '').toLowerCase();

    // Only reservations
    if (!type.includes('reservation')) continue;

    const amt = parseFloat((cols[idx.amount] || '0').replace(/[₹,\s]/g, '')) || 0;

    bookings.push({
      type: cols[idx.type],
      guest: cols[idx.guest],
      listing: cols[idx.listing],
      startDate: cols[idx.startDate],
      endDate: cols[idx.endDate],
      nights: parseInt(cols[idx.nights]) || 0,
      amount: amt,
      confirmCode: cols[idx.confirmCode],
      grossEarnings: parseFloat((cols[idx.grossEarnings] || '0').replace(/[₹,\s]/g, '')) || 0,
    });
  }

  return bookings;
}

async function quickAddMissing(index) {
  const m = window._reconData?.missing?.[index];
  if (!m) return;

  // Try to auto-match property from listing name
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, property_name');
  const listing = (m.listing || '').toLowerCase();
  const matchedRoom = (rooms || []).find(r =>
    listing.includes((r.nickname || '').toLowerCase()) ||
    listing.includes((r.property_name || '').toLowerCase())
  );

  if (!matchedRoom) {
    alert(`⚠️ Property not auto-detected for: ${m.listing}\n\nPlease add manually from Bookings page.`);
    return;
  }

  const bkId = 'B' + Date.now();
  const { error } = await sb.from('guest_register').insert({
    booking_id: bkId,
    guest_name: m.guest,
    room_id: matchedRoom.room_id,
    booking_mode: 'Online-Airbnb',
    check_in: m.startDateNorm || m.startDate,
    check_out: m.endDateNorm || m.endDate,
    check_in_time: '14:00',
    check_out_time: '11:00',
    checkout_confirmed: true,
    guests: 1,
    per_day_rate: m.nights > 0 ? Math.round(m.amount / m.nights) : 0,
    total_amount: m.amount,
    payment_status: 'Paid',
    notes: `Auto-imported from Airbnb CSV. Confirmation: ${m.confirmCode}`,
    booked_by: SESSION.displayName || 'Auto Sync'
  });

  if (error) { alert('❌ Failed: ' + error.message); return; }

  // Also add payment
  await sb.from('payment_history').insert({
    booking_id: bkId,
    amount: m.amount,
    payment_mode: 'Airbnb Payout',
    payment_date: m.startDateNorm || m.startDate,
    notes: 'Airbnb Auto Sync'
  });

  alert(`✅ Added: ${m.guest} at ${matchedRoom.nickname}`);

  // Refresh
  document.querySelector('input[type="file"]').dispatchEvent(new Event('change'));
}
