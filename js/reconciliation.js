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

    // Convert CSV date MM/DD/YYYY to YYYY-MM-DD
    const convertDate = (d) => {
      if (!d) return '';
      const parts = d.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
      }
      return d;
    };

    // Fuzzy match: first 3-4 chars + date + amount tolerance
    const fuzzyMatch = (name1, name2) => {
      if (!name1 || !name2) return false;
      const n1 = name1.toLowerCase().replace(/[^a-z]/g, '');
      const n2 = name2.toLowerCase().replace(/[^a-z]/g, '');
      if (n1 === n2) return true;
      // Check if first 4 chars match (handles Prashant/Prashantkumar, Vikash/Vikas)
      if (n1.length >= 4 && n2.length >= 4) {
        if (n1.substring(0, 4) === n2.substring(0, 4)) return true;
      }
      // Check if one contains the other
      if (n1.includes(n2) || n2.includes(n1)) return true;
      return false;
    };

    // Amount tolerance (within ₹5 = match)
    const amountMatch = (a, b) => Math.abs((a || 0) - (b || 0)) < 5;

    // Preprocess app bookings
    const appList = (appBookings || []).map(b => ({
      ...b,
      _matched: false
    }));

    // For each CSV booking, find match in app
    const missing = [];
    const matched = [];

    const nameMismatches = [];

    airbnbBookings.forEach(ab => {
      const cdate = convertDate(ab.startDate);
      if (cdate < '2026-07-01') return;
      ab.startDateNorm = cdate;
      ab.endDateNorm = convertDate(ab.endDate);

      // Try to find match by date + fuzzy name + amount
      const match = appList.find(b => {
        if (b._matched) return false;
        if (b.check_in !== cdate) return false;
        // Prefer name+amount match
        if (fuzzyMatch(ab.guest, b.guest_name)) return true;
        // Fallback: amount match on same date
        if (amountMatch(ab.amount, b.total_amount)) return true;
        return false;
      });

      if (match) {
        match._matched = true;
        matched.push(ab);
        if (match.guest_name !== ab.guest) {
          nameMismatches.push({
            bookingId: match.booking_id,
            oldName: match.guest_name,
            newName: ab.guest,
            checkIn: cdate,
            amount: ab.amount
          });
        }
      } else {
        missing.push(ab);
      }
    });

    window._nameMismatches = nameMismatches;

    // Extra in app = un-matched app bookings
    const extraInApp = appList.filter(b => !b._matched);

    window._reconData = { missing, matched, extraInApp, airbnbBookings };

    // Calculate current month stats
    const now = new Date();
    const curMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    const appThisMonth = (appBookings || []).filter(b =>
      b.check_in && b.check_in.startsWith(curMonth)
    );
    const csvThisMonth = airbnbBookings.filter(ab => {
      const cdate = convertDate(ab.startDate);
      return cdate.startsWith(curMonth);
    });

    const appMonthRev = appThisMonth.reduce((s2,b) => s2 + (b.total_amount || 0), 0);
    const csvMonthRev = csvThisMonth.reduce((s2,ab) => s2 + (ab.amount || 0), 0);
    const diff = Math.abs(appMonthRev - csvMonthRev);
    const monthName = now.toLocaleString('en-IN', {month: 'long', year: 'numeric'});
    const syncPercent = csvThisMonth.length > 0
      ? Math.round((appThisMonth.length / csvThisMonth.length) * 100)
      : 100;

    document.getElementById('reconResults').innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#FF385C,#E00B41);color:#fff;">
        <div class="section-title" style="color:#fff;border:none;">
          📊 ${monthName} — Sync Status
        </div>
        <div class="stat-grid" style="margin-top:12px;">
          <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fff;">${appThisMonth.length}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;margin-top:4px;">📱 In App</div>
            <div style="font-size:14px;color:#fff;margin-top:6px;font-weight:600;">₹${appMonthRev.toLocaleString('en-IN')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fff;">${csvThisMonth.length}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;margin-top:4px;">🌐 On Airbnb</div>
            <div style="font-size:14px;color:#fff;margin-top:6px;font-weight:600;">₹${csvMonthRev.toLocaleString('en-IN')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:${syncPercent === 100 ? '#4ade80' : '#fef08a'};">${syncPercent}%</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;margin-top:4px;">🔄 Sync Rate</div>
            <div style="font-size:14px;color:#fff;margin-top:6px;font-weight:600;">
              ${syncPercent === 100 ? '✅ Perfect' : appThisMonth.length < csvThisMonth.length ? '⚠️ Missing entries' : 'Extra in app'}
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:${diff < 100 ? '#4ade80' : '#fca5a5'};">₹${diff.toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;margin-top:4px;">💰 Revenue Diff</div>
            <div style="font-size:14px;color:#fff;margin-top:6px;font-weight:600;">
              ${diff < 100 ? '✅ Match' : '⚠️ Check'}
            </div>
          </div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card" style="border-left:4px solid var(--green);">
          <div class="stat-num" style="color:var(--green);">${matched.length}</div>
          <div class="stat-label">✅ Matched (All Time)</div>
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

      ${nameMismatches.length > 0 ? `
      <div class="card" style="border-left:4px solid var(--yellow);background:#FFF9E6;">
        <div class="section-title">
          ✏️ Name Mismatches (${nameMismatches.length}) — Update to Airbnb official names
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">
          These bookings match by date+amount but names differ. Click "Fix" to update app with Airbnb name.
        </div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>App Name (Current)</th><th>Airbnb Name (Official)</th><th>Date</th><th>Amount</th><th>Action</th>
          </tr></thead>
          <tbody>
            ${nameMismatches.map((nm, i) => `
              <tr>
                <td style="color:var(--red);">${nm.oldName}</td>
                <td style="color:var(--green);font-weight:700;">${nm.newName}</td>
                <td style="font-size:12px;">${nm.checkIn}</td>
                <td>₹${nm.amount.toLocaleString('en-IN')}</td>
                <td><button class="btn-sm green-btn" onclick="fixNameMismatch(${i})">✏️ Fix Name</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
        <button class="btn-sm" style="margin-top:10px;background:var(--green);" onclick="fixAllNameMismatches()">
          ✅ Fix All ${nameMismatches.length} Names
        </button>
      </div>
      ` : ''}

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
                <td style="font-size:12px;">${propLabel(b.rooms) || b.room_id}</td>
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
  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, unit_no, property_name');
  const listing = (m.listing || '').toLowerCase();
  const matchedRoom = (rooms || []).find(r =>
    listing.includes((r.nickname || '').toLowerCase()) ||
    listing.includes((r.property_name || '').toLowerCase())
  );

  if (!matchedRoom) {
    fsn.warning(`Warning`, `⚠️ Property not auto-detected for: ${m.listing}\n\nPlease add manually from Bookings page.`);
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

  fsn.success(`Success`, `✅ Added: ${m.guest} at ${matchedRoom.nickname}`);

  // Refresh
  document.querySelector('input[type="file"]').dispatchEvent(new Event('change'));
}


async function fixNameMismatch(index) {
  const nm = window._nameMismatches?.[index];
  if (!nm) return;

  const { error } = await sb.from('guest_register')
    .update({ guest_name: nm.newName })
    .eq('booking_id', nm.bookingId);

  if (error) { alert('❌ ' + error.message); return; }
  fsn.success(`Success`, `✅ Updated: ${nm.oldName} → ${nm.newName}`);
  document.querySelector('input[type="file"]').dispatchEvent(new Event('change'));
}

async function fixAllNameMismatches() {
  const list = window._nameMismatches || [];
  if (!list.length) return;
  if (!confirm(`Update ${list.length} guest names to Airbnb official names?`)) return;

  let success = 0, failed = 0;
  for (const nm of list) {
    const { error } = await sb.from('guest_register')
      .update({ guest_name: nm.newName })
      .eq('booking_id', nm.bookingId);
    if (error) failed++;
    else success++;
  }
  fsn.success(`Success`, `✅ Updated ${success} names\n❌ Failed: ${failed}`);
  document.querySelector('input[type="file"]').dispatchEvent(new Event('change'));
}
