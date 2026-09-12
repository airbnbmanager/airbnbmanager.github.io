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

  // ─── Date D/M/YYYY or DD/MM/YYYY → YYYY-MM-DD ───
  function parseDate(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        let [d, m, y] = parts.map(p => p.trim());
        if (y.length === 4) {
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
        <p style="color:#888;">Upload the Airbnb Reservations CSV — details and payouts will be parsed, compared and auto-enriched into the system.</p>

        <div class="card" style="border-left:4px solid #3B82F6;background:#EFF6FF;">
          <div class="section-title">📖 HOW TO USE</div>
          <div style="line-height:1.9;font-size:13px;">
            <div><strong>Step 1:</strong> Go to <a href="https://www.airbnb.co.in/hosting/reservations/all" target="_blank" style="color:#FF385C;font-weight:600;">Airbnb Reservations ↗</a></div>
            <div><strong>Step 2:</strong> Click <strong>"Export" / "Download CSV"</strong></div>
            <div><strong>Step 3:</strong> Upload CSV below — auto-detects all confirmed, hosting, & past guest bookings</div>
            <div><strong>Step 4:</strong> Click "Add All" to sync missing bookings, or "Fix" to update amounts!</div>
          </div>
        </div>

        <div class="card">
          <div class="section-title">📁 Upload Airbnb CSV File</div>
          <input type="file" id="airbnbCsvFile" accept=".csv" onchange="handleAirbnbCSV(this)" style="width:100%;padding:12px;border:2px dashed #3B82F6;border-radius:8px;cursor:pointer;background:#fafafa;" />
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
    console.log("📊 Airbnb CSV Auto-Detected:", isNewTransactionCSV ? "NEW Transaction/Payout CSV" : "OLD Reservation CSV");

    const reservationsByCode = {};
    let autoEnrichedCount = 0;

    if (isNewTransactionCSV) {
      // Pass 1: Aggregate Tax Withholdings per Confirmation Code
      const taxWithholdingMap = {};
      rows.forEach(r => {
        const type = (r['Type'] || '').trim();
        const code = (r['Confirmation Code'] || r['Confirmation code'] || '').trim();
        const amtStr = (r['Amount'] || '0').replace(/,/g, '');
        const amt = parseFloat(amtStr) || 0;

        if (code && type.toLowerCase().includes('tax withholding')) {
          taxWithholdingMap[code] = (taxWithholdingMap[code] || 0) + amt;
        }
      });

      // Pass 2: Parse Reservations
      rows.forEach(r => {
        const type = (r['Type'] || '').trim();
        const code = (r['Confirmation Code'] || r['Confirmation code'] || '').trim();

        if (type !== 'Reservation' || !code) return;

        const sDate = r['Start date'] || r['Start Date'];
        const eDate = r['End date'] || r['End Date'];
        const guest = (r['Guest'] || r['Guest name'] || 'Airbnb Guest').trim();
        const listing = (r['Listing'] || r['Property'] || '').trim();

        const checkIn = parseDate(sDate);
        const checkOut = parseDate(eDate);

        const gross = parseFloat((r['Gross earnings'] || '0').replace(/,/g, '')) || 0;
        const amount = parseFloat((r['Amount'] || '0').replace(/,/g, '')) || 0;

        const taxAdj = taxWithholdingMap[code] || 0;
        const netPayout = amount + taxAdj > 0 ? (amount + taxAdj) : amount;
        const finalYouEarn = netPayout > 0 ? netPayout : gross;

        const nights = parseInt(r['Nights'] || '1') || (checkIn && checkOut ? Math.max(Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000), 1) : 1);
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
            amount: gross > 0 ? gross : finalYouEarn,
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

        const checkIn = parseDate(sDate);
        const checkOut = parseDate(eDate);

        const rawEarn = r['Earnings'] || r['Paid out'] || r['Paid Out'] || r['Net Earnings'] || r['Amount'] || r['Total Payout'] || '0';
        const cleanEarn = parseFloat(String(rawEarn).replace(/[^0-9\.]/g, '')) || 0;

        const adults = parseInt(r['# of adults'] || '1') || 1;
        const children = parseInt(r['# of children'] || '0') || 0;
        const nights = parseInt(r['# of nights'] || '1') || (checkIn && checkOut ? Math.max(Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000), 1) : 1);

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

    // Auto-Enrich Supabase DB (fill missing details for matching check_in & room_id)
    for (let r of SYNC.allReservations) {
      if (!r.check_in || !r.matched_room_id) continue;

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
          await sb.from('guest_register').update({
            guest_name: (isTempName && r.guest_name) ? r.guest_name : matchedDb.guest_name,
            phone: (missingPhone && r.phone) ? r.phone : matchedDb.phone,
            total_amount: (isTempAmount && r.you_earn > 0) ? r.you_earn : matchedDb.total_amount,
            guests: r.guests || 1,
            booking_mode: 'Online-Airbnb',
            airbnb_confirmation_code: r.confirmation_code || matchedDb.airbnb_confirmation_code,
            notes: 'CSV Auto-Enriched: Details & Payout Updated'
          }).eq('booking_id', matchedDb.booking_id);
          autoEnrichedCount++;
        }
      }
    }

    if (autoEnrichedCount > 0 && window.fsn?.success) {
      fsn.success('Auto-Enriched', `✅ Auto-filled details for ${autoEnrichedCount} bookings!`);
    }

    // Classify: New, Conflict, or Matched
    classifyReservations();
    renderPreview();
  };

  function classifyReservations() {
    SYNC.reservations = SYNC.allReservations.map(r => {
      const dbBk = SYNC.existingByCode[r.confirmation_code] || 
        SYNC.existingByGuest.find(e => e.room_id === r.matched_room_id && e.check_in === r.check_in);

      if (!dbBk) {
        return { ...r, matchStatus: 'new', issues: [] };
      }

      const issues = [];
      if (r.guest_name && dbBk.guest_name && !dbBk.guest_name.toLowerCase().includes(r.guest_name.toLowerCase()) && !dbBk.guest_name.includes('Airbnb Guest')) {
        issues.push({ field: 'guest_name', label: 'Name', csv: r.guest_name, db: dbBk.guest_name });
      }
      if (Math.abs(r.you_earn - (dbBk.total_amount || 0)) > 15) {
        issues.push({ field: 'amount', label: 'Amount', csv: r.you_earn, db: dbBk.total_amount || 0 });
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
          <div class="section-title" style="color:#92400E;">⚠️ Details Mismatch (${conflicts.length})</div>
          <div class="table-wrap"><table>
            <thead><tr><th>Code</th><th>Guest</th><th>Issue</th><th>Current (DB)</th><th>Correct (CSV)</th><th>Action</th></tr></thead>
            <tbody>
              ${conflicts.map(r => r.issues.map(i => `
                <tr>
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
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r) return;

    const roomSelect = document.getElementById('room-' + code);
    const roomId = roomSelect?.value || r.matched_room_id;

    if (!roomId) {
      alert('Please select a property for this booking!');
      return;
    }

    const bookingId = 'AIR' + r.confirmation_code;
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
      alert('Error adding booking: ' + error.message);
      return;
    }

    if (r.you_earn > 0) {
      await sb.from('payment_history').insert({
        booking_id: bookingId,
        amount: r.you_earn,
        payment_mode: 'Airbnb Payout',
        payment_date: r.check_out || r.check_in,
        received_by: 'Firoz',
        handover_status: 'handed_over',
        verification_status: 'verified',
        notes: 'Auto-created from Airbnb CSV'
      });
    }

    if (window.fsn) fsn.success('Added', `✅ ${r.guest_name} added successfully!`);
    SYNC.reservations = SYNC.reservations.filter(x => x.confirmation_code !== code);
    renderPreview();
  };

  window.instantFixField = async function(code, field) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r || !r.dbBk) return;

    const updates = {};
    if (field === 'guest_name') updates.guest_name = r.guest_name;
    if (field === 'amount') {
      updates.total_amount = r.you_earn;
      updates.per_day_rate = r.nights > 0 ? Math.round(r.you_earn / r.nights) : r.you_earn;
    }

    const { error } = await sb.from('guest_register').update(updates).eq('booking_id', r.dbBk.booking_id);
    if (error) {
      alert('Fix failed: ' + error.message);
      return;
    }

    if (window.fsn) fsn.success('Fixed', '✅ Updated successfully!');
    r.issues = (r.issues || []).filter(i => i.field !== field);
    if (r.issues.length === 0) r.matchStatus = 'match';
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
  const newBookings = (window.SYNC?.reservations || []).filter(r => r.matchStatus === 'new');
  if (!newBookings.length) {
    alert('No new bookings to add!');
    return;
  }

  if (!confirm(`Add all ${newBookings.length} bookings?`)) return;

  let added = 0;
  for (let r of newBookings) {
    const roomId = r.matched_room_id;
    if (!roomId) continue;

    const bookingId = 'AIR' + r.confirmation_code;
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

    if (!error) {
      if (r.you_earn > 0) {
        await sb.from('payment_history').insert({
          booking_id: bookingId,
          amount: r.you_earn,
          payment_mode: 'Airbnb Payout',
          payment_date: r.check_out || r.check_in,
          received_by: 'Firoz',
          handover_status: 'handed_over',
          verification_status: 'verified',
          notes: 'Auto-created from Airbnb CSV'
        });
      }
      added++;
    }
  }

  alert(`✅ Successfully added ${added} bookings!`);
  if (window.renderAirbnbSync) renderAirbnbSync();
};

console.log('✅ Airbnb Sync Module loaded successfully!');
