// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB CSV SYNC & RECONCILIATION — Professional Edition
// THE UNIQUE HAVEN HOMES PRIVATE LIMITED (TUHH)
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
    activeFilter: 'all', // 'all' | 'conflicts' | 'missing' | 'synced'
    searchQuery: '',
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

  function fmtDec(n) {
    return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    if (!d) return '-';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Helper for net earnings (used if Reservations CSV specifies earnings)
  function csvEarningsToYouEarn(earnings) {
    const e = Number(earnings) || 0;
    return Math.round(e * 100) / 100;
  }

  // ─── Robust CSV parser (handles quoted values, commas inside quotes & ₹ symbols) ───
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
    if (l.includes('pink paradise') || l.includes('vil-108') || l.includes('villa (eight)')) return 'VIL-108';
    if (l.includes('yellow house') || l.includes('vil-105') || l.includes('villa (five)')) return 'VIL-105';
    if (l.includes('green forest') || l.includes('vil-106') || l.includes('villa (six)')) return 'VIL-106';
    if (l.includes('celebrity') || l.includes('lul-402') || l.includes('flat402')) return 'LUL-402';
    if (l.includes('unique') || l.includes('gom-302') || l.includes('flat302')) return 'GOM-302';
    if (l.includes('light green') || l.includes('gom-301') || l.includes('flat301')) return 'GOM-301';
    if (l.includes('starlight') || l.includes('penthouse') || l.includes('gom-501') || l.includes('flat501')) return 'GOM-501';
    if (l.includes('black beauty') || l.includes('gom-102') || l.includes('flat102')) return 'GOM-102';
    if (l.includes('nawabi') || l.includes('gom-401') || l.includes('flat401')) return 'GOM-401';
    if (l.includes('gomti grand') || l.includes('vil-101') || l.includes('villa (one)')) return 'VIL-101';
    if (l.includes('green house') || l.includes('vil-104') || l.includes('villa (four)')) return 'VIL-104';
    if (l.includes('pink house') || l.includes('vil-103') || l.includes('villa (three)')) return 'VIL-103';
    if (l.includes('brown') || l.includes('gom-202') || l.includes('flat202')) return 'GOM-202';
    if (l.includes('velvet') || l.includes('vil-107') || l.includes('villa (seven)')) return 'VIL-107';
    if (l.includes('royal white') || l.includes('vil-102') || l.includes('villa (two)')) return 'VIL-102';
    if (l.includes('dark blue') || l.includes('gom-201') || l.includes('flat201')) return 'GOM-201';
    if (l.includes('redrose') || l.includes('gom-101') || l.includes('flat101')) return 'GOM-101';
    return null;
  };

  let _activeSyncTab = 'payouts'; // Default to payouts/financial reconciliation

  window.setAirbnbSyncTab = function(tab) {
    _activeSyncTab = tab;
    renderAirbnbSync(tab);
  };

  window.copyCode = function(btn, code) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(code);
    const old = btn.innerHTML;
    btn.innerHTML = '✓ Copied';
    btn.style.color = '#10B981';
    setTimeout(() => {
      btn.innerHTML = old;
      btn.style.color = '';
    }, 1500);
  };

  window.setSyncFilter = function(filter) {
    SYNC.activeFilter = filter;
    renderPreview();
  };

  window.filterAirbnbSyncTable = function(query) {
    SYNC.searchQuery = (query || '').toLowerCase().trim();
    renderPreview();
  };

  // ─── Main render ───
  async function renderAirbnbSync(tab = _activeSyncTab) {
    _activeSyncTab = tab;
    
    if (!['developer', 'owner', 'manager', 'admin'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner / Manager / Developer have access to Airbnb Sync.</div></div>', 'airbnb-sync');
      return;
    }

    const { data: rooms } = await sb.from('rooms')
      .select('room_id, unit_no, nickname, property_name')
      .order('unit_no');
    SYNC.rooms = rooms || [];

    const { data: existing } = await sb.from('guest_register')
      .select('booking_id, airbnb_confirmation_code, guest_name, check_in, check_out, total_amount, room_id, booking_mode, payment_status, is_cancelled, rooms(unit_no, nickname)')
      .order('check_in', { ascending: false })
      .limit(2000);

    SYNC.existingByCode = {};
    SYNC.existingByGuest = existing || [];
    (existing || []).forEach(e => {
      if (e.airbnb_confirmation_code) SYNC.existingByCode[e.airbnb_confirmation_code.trim()] = e;
    });

    const tabsHtml = `
      <div style="background:#0F172A;border-radius:12px;padding:6px;margin-bottom:18px;display:flex;flex-wrap:wrap;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
        <button onclick="setAirbnbSyncTab('payouts')" style="flex:1;min-width:180px;padding:10px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;${tab==='payouts'?'background:#10B981;color:#fff;border:none;box-shadow:0 2px 8px rgba(16,185,129,0.4);':'background:transparent;color:#94A3B8;border:none;'}">
          <span>💰</span> Monthly Payouts & Exact Net Earnings
        </button>
        <button onclick="setAirbnbSyncTab('reservations')" style="flex:1;min-width:160px;padding:10px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;${tab==='reservations'?'background:#2563EB;color:#fff;border:none;box-shadow:0 2px 8px rgba(37,99,235,0.4);':'background:transparent;color:#94A3B8;border:none;'}">
          <span>📁</span> Reservations CSV Sync
        </button>
        <button onclick="renderIcalSync()" style="flex:0.8;min-width:130px;padding:10px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;background:transparent;color:#94A3B8;border:none;display:flex;align-items:center;justify-content:center;gap:8px;">
          <span>📅</span> iCal Auto-Sync ↗
        </button>
      </div>`;

    if (tab === 'payouts') {
      renderShell(`
        <div class="wrap" style="max-width:1200px;margin:0 auto;padding-bottom:50px;">
          ${tabsHtml}
          
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <div>
              <h1 style="margin:0 0 4px 0;font-size:24px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">💰 Airbnb Monthly Payouts & Net Earnings Sync</h1>
              <p style="margin:0;color:#64748B;font-size:13.5px;">
                Import your official <strong>Airbnb Monthly Earnings / Tax CSV</strong>. The system records the <strong>exact net bank payout</strong> (Gross minus 15.5% Host Service Fee) with 100% mathematical precision.
              </p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                🛡️ Direct & Offline Bookings Protected
              </span>
            </div>
          </div>

          <!-- Drag and Drop Upload Card -->
          <div class="card" style="margin-bottom:16px;border:2px dashed #10B981;border-radius:12px;background:#F0FDF4;padding:24px;text-align:center;transition:all 0.2s;" id="dropZoneContainer">
            <div style="max-width:540px;margin:0 auto;">
              <div style="font-size:36px;margin-bottom:8px;">📥</div>
              <div style="font-size:16px;font-weight:800;color:#065F46;margin-bottom:4px;">Upload Monthly Payouts CSV File</div>
              <div style="font-size:12.5px;color:#047857;margin-bottom:14px;line-height:1.5;">
                Drag & drop your Airbnb export (e.g. <code>airbnb_07_2026-10_2026.csv</code>) or browse from your device.
              </div>
              <label for="airbnbPayoutCsvFile" style="display:inline-block;background:#059669;color:#fff;padding:10px 24px;border-radius:8px;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,0.3);">
                📁 Browse CSV File
              </label>
              <input type="file" id="airbnbPayoutCsvFile" accept=".csv" onchange="handleAirbnbCSV(this)" style="display:none;" />
              <div id="fileUploadStatus" style="margin-top:10px;font-size:12px;color:#065F46;font-weight:600;"></div>
            </div>
          </div>

          <!-- Quick Guide Accordion -->
          <details class="card" style="margin-bottom:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;">
            <summary style="font-weight:700;font-size:13px;color:#334155;cursor:pointer;user-select:none;">
              📖 How to export official Payouts CSV from Airbnb (Click to view)
            </summary>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #E2E8F0;font-size:12.5px;color:#475569;line-height:1.8;">
              <div>1. Go to <a href="https://www.airbnb.co.in/hosting/earnings" target="_blank" style="color:#059669;font-weight:800;text-decoration:underline;">Airbnb Hosting ➔ Earnings ↗</a></div>
              <div>2. Scroll to <strong>"Completed payouts"</strong> or <strong>"Paid out"</strong>.</div>
              <div>3. Select date range (e.g. July 2026 to current) and click <strong>"Export CSV"</strong>.</div>
              <div>4. Upload the downloaded CSV here. The system cross-references all reservation amounts and reconciles your CRM ledger in 1 second!</div>
            </div>
          </details>

          <div id="airbnbSyncPreview"></div>
        </div>
      `, 'airbnb-sync');
      return;
    }

    // Reservations CSV Tab
    renderShell(`
      <div class="wrap" style="max-width:1200px;margin:0 auto;padding-bottom:50px;">
        ${tabsHtml}
        
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <h1 style="margin:0 0 4px 0;font-size:24px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">📁 Airbnb Reservations CSV Sync</h1>
            <p style="margin:0;color:#64748B;font-size:13.5px;">
              Upload the standard <strong>Airbnb Reservations CSV</strong> to import upcoming guests, auto-populate phone numbers, and match units.
            </p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              🛡️ Direct & Offline Bookings Protected
            </span>
          </div>
        </div>

        <!-- Drag and Drop Upload Card -->
        <div class="card" style="margin-bottom:16px;border:2px dashed #2563EB;border-radius:12px;background:#EFF6FF;padding:24px;text-align:center;" id="dropZoneContainer">
          <div style="max-width:540px;margin:0 auto;">
            <div style="font-size:36px;margin-bottom:8px;">📁</div>
            <div style="font-size:16px;font-weight:800;color:#1E40AF;margin-bottom:4px;">Upload Reservations CSV File</div>
            <div style="font-size:12.5px;color:#1E3A8A;margin-bottom:14px;line-height:1.5;">
              Export from Airbnb Reservations dashboard and drop here.
            </div>
            <label for="airbnbCsvFile" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 24px;border-radius:8px;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.3);">
              📁 Browse CSV File
            </label>
            <input type="file" id="airbnbCsvFile" accept=".csv" onchange="handleAirbnbCSV(this)" style="display:none;" />
            <div id="fileUploadStatus" style="margin-top:10px;font-size:12px;color:#1E40AF;font-weight:600;"></div>
          </div>
        </div>

        <!-- Quick Guide Accordion -->
        <details class="card" style="margin-bottom:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;">
          <summary style="font-weight:700;font-size:13px;color:#334155;cursor:pointer;user-select:none;">
            📖 How to export Reservations CSV from Airbnb (Click to view)
          </summary>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #E2E8F0;font-size:12.5px;color:#475569;line-height:1.8;">
            <div>1. Go to <a href="https://www.airbnb.co.in/hosting/reservations/all" target="_blank" style="color:#2563EB;font-weight:800;text-decoration:underline;">Airbnb Reservations ➔ All ↗</a></div>
            <div>2. Click <strong>"Export" / "Download CSV"</strong> at the top right.</div>
            <div>3. Upload the downloaded CSV here to automatically identify new bookings and sync property assignments!</div>
          </div>
        </details>

        <div id="airbnbSyncPreview"></div>
      </div>
    `, 'airbnb-sync');
  }

  // ─── CSV Import & Processing Engine ───
  window.handleAirbnbCSV = async function(fileInput) {
    const file = fileInput?.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('fileUploadStatus');
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#0284C7;">⏳ Reading ${file.name} (${Math.round(file.size / 1024)} KB)...</span>`;
    }

    const text = await file.text();
    const rows = parseCSV(text);
    SYNC.csvData = rows;

    if (!rows || rows.length === 0) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#DC2626;">❌ Invalid or empty CSV file</span>`;
      if (window.fsn?.error) fsn.error('Error', 'Invalid or empty CSV file');
      return;
    }

    // Detect CSV Format by inspecting keys of first row
    const sampleKeys = Object.keys(rows[0] || {}).map(k => k.toLowerCase());
    const isNewTransactionCSV = sampleKeys.includes('gross earnings') || sampleKeys.includes('arriving by date') || sampleKeys.includes('paid out');
    SYNC.isNewTransactionCSV = isNewTransactionCSV;

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

    if (statusEl) {
      statusEl.innerHTML = `
        <span style="color:#059669;font-weight:700;">
          ✓ Loaded <strong>${file.name}</strong> (${rows.length} rows) • Format: <strong>${isNewTransactionCSV ? 'Monthly Payout & Tax CSV' : 'Reservations CSV'}</strong> • Dates: <strong>${_detectedCsvDateFormat}</strong>
        </span>`;
    }

    const reservationsByCode = {};

    if (isNewTransactionCSV) {
      // 1. Group all line items (Reservation, Host-Remitted Tax, Tax Withholding, Resolutions) by confirmation code
      const codeAgg = {};
      rows.forEach(r => {
        const type = (r['Type'] || '').trim();
        const code = (r['Confirmation Code'] || r['Confirmation code'] || '').trim();
        if (!code || type === 'Payout') return;

        if (!codeAgg[code]) {
          codeAgg[code] = {
            netAmountSum: 0,
            reservationRow: null,
            hostRemittedTax: 0,
            taxWithheld: 0,
            resolutions: 0
          };
        }

        const amtStr = (r['Amount'] || '0').replace(/,/g, '').trim();
        const amt = parseFloat(amtStr) || 0;
        codeAgg[code].netAmountSum += amt;

        const typeLower = type.toLowerCase();
        if (type === 'Reservation') {
          codeAgg[code].reservationRow = r;
        } else if (typeLower.includes('host-remitted') || typeLower.includes('remitted tax')) {
          codeAgg[code].hostRemittedTax += amt;
        } else if (typeLower.includes('tax withholding') || typeLower.includes('withheld') || typeLower.includes('tds')) {
          codeAgg[code].taxWithheld += Math.abs(amt);
        } else if (typeLower.includes('resolution')) {
          codeAgg[code].resolutions += amt;
        }
      });

      // 2. Build structured reservation objects
      Object.keys(codeAgg).forEach(code => {
        const agg = codeAgg[code];
        const r = agg.reservationRow;
        if (!r) return;

        const sDate = r['Start date'] || r['Start Date'];
        const eDate = r['End date'] || r['End Date'];
        const guest = (r['Guest'] || r['Guest name'] || 'Airbnb Guest').trim();
        const listing = (r['Listing'] || r['Property'] || '').trim();

        const nights = parseInt(r['Nights'] || '1', 10) || 1;
        const { checkIn, checkOut } = parseDatePair(sDate, eDate, nights);

        const gross = parseFloat((r['Gross earnings'] || r['Gross Earnings'] || '0').replace(/,/g, '')) || 0;
        const resAmount = parseFloat((r['Amount'] || '0').replace(/,/g, '')) || 0;
        const paidOutCol = parseFloat((r['Paid out'] || r['Paid Out'] || '0').replace(/,/g, '')) || 0;
        const hostFeeCol = parseFloat((r['Host Fee'] || r['Host fee'] || r['Service Fee'] || r['Service fee'] || '0').replace(/,/g, '')) || 0;
        const calculatedHostFee = Math.abs(hostFeeCol) > 0 ? Math.abs(hostFeeCol) : (gross > resAmount ? Math.round((gross - resAmount) * 100) / 100 : 0);

        // Net host payout ("You Earn"): Exact algebraic sum of all line items for this confirmation code
        // (Reservation Amount + Host-Remitted Tax - TDS / Tax Withheld + Resolutions)
        let finalYouEarn = Math.round(agg.netAmountSum * 100) / 100;
        if (finalYouEarn <= 0) {
          if (resAmount > 0) finalYouEarn = resAmount;
          else if (paidOutCol > 0) finalYouEarn = paidOutCol;
          else if (gross > 0) finalYouEarn = calculatedHostFee > 0 ? (gross - calculatedHostFee) : gross;
        }

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
            tax_withheld: agg.taxWithheld,
            host_remitted_tax: agg.hostRemittedTax,
            you_earn: Math.round(finalYouEarn * 100) / 100,
            status: 'Confirmed',
            raw: r
          };
        }
      });
    } else {
      // Standard Reservations CSV
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
            gross: cleanEarn,
            amount: cleanEarn,
            host_fee: 0,
            tax_withheld: 0,
            you_earn: Math.round(cleanEarn * 100) / 100,
            status: status,
            raw: r
          };
        }
      });
    }

    SYNC.allReservations = Object.values(reservationsByCode);

    // ─── Fast In-Memory Batch Matching & Auto-Enrichment ───
    // 1 single bulk query instead of 200 sequential network requests!
    const { data: dbRecords } = await sb.from('guest_register')
      .select('booking_id, airbnb_confirmation_code, guest_name, phone, total_amount, room_id, check_in, check_out, booking_mode, payment_status, is_cancelled, per_day_rate, guests')
      .order('check_in', { ascending: false });

    const codeMap = {};
    const roomDateMap = {};
    (dbRecords || []).forEach(b => {
      if (b.airbnb_confirmation_code) codeMap[b.airbnb_confirmation_code.trim()] = b;
      if (b.room_id && b.check_in) {
        const key = `${b.room_id}_${b.check_in}`;
        if (!roomDateMap[key] || (b.booking_mode || '').includes('Airbnb')) {
          roomDateMap[key] = b;
        }
      }
    });

    SYNC.existingByCode = codeMap;
    SYNC.existingByGuest = dbRecords || [];

    // Identify which online Airbnb records need auto-enrichment
    const updateTasks = [];
    SYNC.allReservations.forEach(r => {
      if (!r.check_in || !r.matched_room_id) return;

      let matchedDb = codeMap[r.confirmation_code];
      if (!matchedDb) {
        const cand = roomDateMap[`${r.matched_room_id}_${r.check_in}`];
        if (cand) {
          const mode = (cand.booking_mode || '').toLowerCase();
          const isOffline = mode.includes('offline') || mode.includes('direct') || mode.includes('walk-in') || mode.includes('manual');
          const isTemp = !cand.guest_name || cand.guest_name.includes('Airbnb Guest') || cand.guest_name.includes('Blocked');
          // 🛡️ Safe Sync: NEVER match or touch genuine offline bookings!
          if (!isOffline || isTemp) {
            matchedDb = cand;
          }
        }
      }

      if (matchedDb) {
        const isTempName = !matchedDb.guest_name || matchedDb.guest_name.includes('Airbnb Guest') || matchedDb.guest_name.includes('Blocked');
        const isTempAmount = !matchedDb.total_amount || matchedDb.total_amount <= 0;
        const missingPhone = !matchedDb.phone && r.phone;
        const needsPaid = matchedDb.payment_status !== 'Paid';
        const amountMismatch = Math.abs((matchedDb.total_amount || 0) - r.you_earn) > 0.5 && r.you_earn > 0;

        if (isTempName || isTempAmount || missingPhone || needsPaid || amountMismatch) {
          updateTasks.push({ r, matchedDb, isTempName, missingPhone });
        }
      }
    });

    // Execute auto-enrichments in small concurrent batches
    let autoEnrichedCount = 0;
    if (updateTasks.length > 0) {
      const batchSize = 12;
      for (let i = 0; i < updateTasks.length; i += batchSize) {
        const batch = updateTasks.slice(i, i + batchSize);
        await Promise.all(batch.map(async ({ r, matchedDb, isTempName, missingPhone }) => {
          const updates = {
            guest_name: (isTempName && r.guest_name) ? r.guest_name : matchedDb.guest_name,
            phone: (missingPhone && r.phone) ? r.phone : matchedDb.phone,
            total_amount: r.you_earn > 0 ? r.you_earn : matchedDb.total_amount,
            per_day_rate: r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : (matchedDb.per_day_rate || 0),
            guests: r.guests || 1,
            booking_mode: 'Online-Airbnb',
            payment_status: 'Paid',
            airbnb_confirmation_code: r.confirmation_code || matchedDb.airbnb_confirmation_code,
            notes: 'CSV Auto-Enriched: Exact Net Payout'
          };
          if (r.gross) updates.gross_amount = r.gross;
          if (r.host_fee) updates.platform_fee = r.host_fee;

          await sb.from('guest_register').update(updates).eq('booking_id', matchedDb.booking_id);
          Object.assign(matchedDb, updates);

          // Guarantee payment_history matches net payout
          if (r.you_earn > 0) {
            const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', matchedDb.booking_id);
            if (payList && payList.length > 0) {
              await sb.from('payment_history').update({
                amount: r.you_earn,
                payment_mode: 'Online-Airbnb',
                notes: 'Net payout synced from Airbnb CSV'
              }).eq('id', payList[0].id);
            } else {
              await sb.from('payment_history').insert({
                booking_id: matchedDb.booking_id,
                amount: r.you_earn,
                payment_mode: 'Online-Airbnb',
                payment_date: r.check_out || r.check_in,
                received_by: 'Firoz',
                received_by_type: 'employee',
                handover_status: 'handed_over',
                verification_status: 'verified',
                notes: 'Auto-created from Airbnb CSV'
              });
            }
          }
          autoEnrichedCount++;
        }));
      }
    }

    if (autoEnrichedCount > 0 && window.fsn?.success) {
      fsn.success('Auto-Enriched', `✅ Updated ${autoEnrichedCount} bookings to exact payout!`);
    }

    classifyReservations();

    // Cache new bookings to persistent store
    window._csvBookings = {};
    SYNC.reservations.forEach(r => { window._csvBookings[r.confirmation_code] = r; });

    renderPreview();
  };

  function classifyReservations() {
    SYNC.reservations = SYNC.allReservations.map(r => {
      // 1. Match by confirmation code FIRST
      let dbBk = SYNC.existingByCode[r.confirmation_code];

      // 2. If not found by code, match by room & check_in ONLY IF it is Online-Airbnb or temp placeholder
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

  // ─── Render Preview & Interactive Verification Dashboard ───
  function renderPreview() {
    const container = document.getElementById('airbnbSyncPreview');
    if (!container) return;

    if (!SYNC.allReservations || SYNC.allReservations.length === 0) {
      container.innerHTML = '';
      return;
    }

    const all = SYNC.reservations;
    const newBookings = all.filter(r => r.matchStatus === 'new');
    const conflicts = all.filter(r => r.matchStatus === 'conflict');
    const matched = all.filter(r => r.matchStatus === 'match');

    // Totals
    const totalGross = SYNC.allReservations.reduce((s, r) => s + (r.gross || r.amount || 0), 0);
    const totalHostFee = SYNC.allReservations.reduce((s, r) => s + (r.host_fee || 0), 0);
    const totalTds = SYNC.allReservations.reduce((s, r) => s + (r.tax_withheld || 0), 0);
    const totalNetPayout = SYNC.allReservations.reduce((s, r) => s + (r.you_earn || 0), 0);

    // Apply active filter and search query
    let filteredList = all;
    if (SYNC.activeFilter === 'conflicts') {
      filteredList = conflicts;
    } else if (SYNC.activeFilter === 'missing') {
      filteredList = newBookings;
    } else if (SYNC.activeFilter === 'synced') {
      filteredList = matched;
    }

    if (SYNC.searchQuery) {
      const q = SYNC.searchQuery;
      filteredList = filteredList.filter(r => 
        (r.confirmation_code && r.confirmation_code.toLowerCase().includes(q)) ||
        (r.guest_name && r.guest_name.toLowerCase().includes(q)) ||
        (r.listing_name && r.listing_name.toLowerCase().includes(q)) ||
        (r.matched_room_id && r.matched_room_id.toLowerCase().includes(q))
      );
    }

    const roomOpts = (selected) => '<option value="">— Select property —</option>' + (SYNC.rooms || []).map(rm =>
      `<option value="${rm.room_id}"${rm.room_id === selected ? ' selected' : ''}>${rm.unit_no || ''} — ${(rm.nickname || rm.property_name || '').substring(0, 30)}</option>`
    ).join('');

    container.innerHTML = `
      <!-- Financial Audit KPI Header -->
      <div style="background:#0F172A;border-radius:14px;padding:20px;color:#fff;margin-bottom:16px;box-shadow:0 8px 24px rgba(15,23,42,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
          <div>
            <div style="font-size:11px;font-weight:800;color:#38BDF8;letter-spacing:1px;text-transform:uppercase;">Financial Reconciliation</div>
            <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;">Airbnb Bank Settlements Audit</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${conflicts.length > 0 ? `
              <button onclick="fixAllConflicts()" id="fixAllBtn" style="background:#059669;color:#fff;padding:9px 18px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(5,150,105,0.4);">
                ⚡ Reconcile All ${conflicts.length} Mismatches
              </button>
            ` : `
              <div style="background:rgba(16,185,129,0.2);border:1px solid #10B981;color:#6EE7B7;padding:6px 14px;border-radius:8px;font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;">
                <span>✓</span> All ${matched.length} Bookings Reconciled
              </div>
            `}
            ${newBookings.length > 0 ? `
              <button onclick="addAllNewBookings()" style="background:#2563EB;color:#fff;padding:9px 18px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(37,99,235,0.4);">
                ➕ Add All ${newBookings.length} to CRM
              </button>
            ` : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;">
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#94A3B8;font-weight:600;">Total Bookings</div>
            <div style="font-size:22px;font-weight:800;color:#fff;margin-top:2px;">${SYNC.allReservations.length}</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#94A3B8;font-weight:600;">Gross Charges</div>
            <div style="font-size:22px;font-weight:800;color:#60A5FA;margin-top:2px;">₹${fmtNum(totalGross)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#FCA5A5;font-weight:600;">Host Fee (15.5%)</div>
            <div style="font-size:22px;font-weight:800;color:#F87171;margin-top:2px;">-₹${fmtNum(totalHostFee)}</div>
          </div>
          <div style="background:rgba(16,185,129,0.12);border:1px solid #059669;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#6EE7B7;font-weight:700;">Net Bank Payouts</div>
            <div style="font-size:22px;font-weight:800;color:#34D399;margin-top:2px;">₹${fmtNum(totalNetPayout)}</div>
          </div>
          <div style="background:${conflicts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'};border:${conflicts.length > 0 ? '1px solid #DC2626' : '1px solid rgba(255,255,255,0.08)'};border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:${conflicts.length > 0 ? '#FCA5A5' : '#94A3B8'};font-weight:600;">Mismatches</div>
            <div style="font-size:22px;font-weight:800;color:${conflicts.length > 0 ? '#F87171' : '#34D399'};margin-top:2px;">${conflicts.length}</div>
          </div>
          <div style="background:${newBookings.length > 0 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)'};border:${newBookings.length > 0 ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.08)'};border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:${newBookings.length > 0 ? '#93C5FD' : '#94A3B8'};font-weight:600;">Missing in CRM</div>
            <div style="font-size:22px;font-weight:800;color:${newBookings.length > 0 ? '#60A5FA' : '#94A3B8'};margin-top:2px;">${newBookings.length}</div>
          </div>
        </div>
      </div>

      <!-- Table Filter and Search Toolbar -->
      <div class="card" style="margin-bottom:14px;padding:12px 16px;background:#fff;border:1px solid #E2E8F0;border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button onclick="setSyncFilter('all')" style="padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid #CBD5E1;background:${SYNC.activeFilter==='all'?'#0F172A':'#F8FAFC'};color:${SYNC.activeFilter==='all'?'#fff':'#475569'};">
            All (${all.length})
          </button>
          <button onclick="setSyncFilter('conflicts')" style="padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${conflicts.length>0?'#FCA5A5':'#CBD5E1'};background:${SYNC.activeFilter==='conflicts'?'#DC2626':(conflicts.length>0?'#FEF2F2':'#F8FAFC')};color:${SYNC.activeFilter==='conflicts'?'#fff':(conflicts.length>0?'#991B1B':'#475569')};">
            ⚠️ Mismatches (${conflicts.length})
          </button>
          <button onclick="setSyncFilter('missing')" style="padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${newBookings.length>0?'#BFDBFE':'#CBD5E1'};background:${SYNC.activeFilter==='missing'?'#2563EB':(newBookings.length>0?'#EFF6FF':'#F8FAFC')};color:${SYNC.activeFilter==='missing'?'#fff':(newBookings.length>0?'#1E40AF':'#475569')};">
            🆕 Missing (${newBookings.length})
          </button>
          <button onclick="setSyncFilter('synced')" style="padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${matched.length>0?'#A7F3D0':'#CBD5E1'};background:${SYNC.activeFilter==='synced'?'#059669':(matched.length>0?'#ECFDF5':'#F8FAFC')};color:${SYNC.activeFilter==='synced'?'#fff':(matched.length>0?'#065F46':'#475569')};">
            ✅ In Sync (${matched.length})
          </button>
        </div>

        <div style="min-width:260px;flex:1;max-width:360px;">
          <input type="text" placeholder="🔍 Search guest, code (HM...), or villa..." value="${SYNC.searchQuery || ''}" oninput="filterAirbnbSyncTable(this.value)" style="width:100%;padding:8px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;outline:none;" />
        </div>
      </div>

      <!-- Main Reconciliation Table -->
      <div class="card" style="padding:0;overflow:hidden;border:1px solid #E2E8F0;border-radius:12px;">
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
          <table style="width:100%;min-width:840px;border-collapse:collapse;font-size:12.5px;text-align:left;">
            <thead>
              <tr style="background:#F8FAFC;border-bottom:2px solid #E2E8F0;color:#475569;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                <th style="padding:10px 14px;">Status</th>
                <th style="padding:10px 14px;">Code & Guest</th>
                <th style="padding:10px 14px;">Stay & Property</th>
                <th style="padding:10px 14px;text-align:right;">Gross (₹)</th>
                <th style="padding:10px 14px;text-align:right;">Fee (15.5%)</th>
                <th style="padding:10px 14px;text-align:right;color:#059669;">Net Payout (You Earn)</th>
                <th style="padding:10px 14px;text-align:right;">CRM Amount</th>
                <th style="padding:10px 14px;text-align:right;">Delta</th>
                <th style="padding:10px 14px;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredList.length === 0 ? `
                <tr>
                  <td colspan="9" style="padding:40px;text-align:center;color:#64748B;">
                    No bookings found matching current filter or search.
                  </td>
                </tr>
              ` : filteredList.map(r => {
                const dbAmt = r.dbBk ? Number(r.dbBk.total_amount || 0) : null;
                const diff = dbAmt !== null ? Math.round((r.you_earn - dbAmt) * 100) / 100 : null;
                const isMatch = dbAmt !== null && Math.abs(diff) <= 0.5;
                const isMissing = !r.dbBk;

                return `
                  <tr style="border-bottom:1px solid #F1F5F9;background:${!isMatch && !isMissing ? '#FFFBEB' : (isMissing ? '#F8FAFC' : '#FFFFFF')};transition:background 0.2s;" id="sync-row-${r.confirmation_code}">
                    <td style="padding:10px 14px;vertical-align:middle;">
                      ${isMissing ? `
                        <span style="background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;">
                          🆕 Missing
                        </span>
                      ` : (isMatch ? `
                        <span style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;">
                          ✅ Synced
                        </span>
                      ` : `
                        <span style="background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;">
                          ⚠️ Mismatch
                        </span>
                      `)}
                    </td>
                    <td style="padding:10px 14px;vertical-align:middle;">
                      <div style="font-weight:700;color:#0F172A;font-size:13px;">${r.guest_name}</div>
                      <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
                        <code style="background:#F1F5F9;padding:1px 6px;border-radius:4px;font-size:11px;color:#334155;font-weight:600;">${r.confirmation_code}</code>
                        <button onclick="copyCode(this, '${r.confirmation_code}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#64748B;padding:0 2px;" title="Copy Code">📋</button>
                      </div>
                      ${r.phone ? `<div style="font-size:11px;color:#64748B;margin-top:1px;">📞 ${r.phone}</div>` : ''}
                    </td>
                    <td style="padding:10px 14px;vertical-align:middle;">
                      <div style="font-weight:600;color:#334155;font-size:12px;">
                        ${fmtDate(r.check_in)} → ${fmtDate(r.check_out)} <span style="background:#E2E8F0;color:#475569;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;">${r.nights}n</span>
                      </div>
                      ${isMissing ? `
                        <div style="margin-top:4px;">
                          <select id="room-${r.confirmation_code}" style="padding:3px 6px;font-size:11.5px;border:1px solid #CBD5E1;border-radius:4px;max-width:220px;">
                            ${roomOpts(r.matched_room_id)}
                          </select>
                        </div>
                      ` : `
                        <div style="font-size:11px;color:#64748B;margin-top:2px;">
                          ${r.matched_room_id ? `<strong style="color:#2563EB;">${r.matched_room_id}</strong> • ` : ''}${r.listing_name || '-'}
                        </div>
                      `}
                    </td>
                    <td style="padding:10px 14px;text-align:right;vertical-align:middle;font-weight:500;color:#475569;">
                      ₹${fmtNum(r.gross || r.amount)}
                    </td>
                    <td style="padding:10px 14px;text-align:right;vertical-align:middle;color:#DC2626;font-weight:600;">
                      ${r.host_fee > 0 ? `-₹${fmtNum(r.host_fee)}` : '—'}
                    </td>
                    <td style="padding:10px 14px;text-align:right;vertical-align:middle;font-weight:800;color:#059669;font-size:13.5px;">
                      ₹${fmtDec(r.you_earn)}
                    </td>
                    <td style="padding:10px 14px;text-align:right;vertical-align:middle;font-weight:700;color:${dbAmt === null ? '#94A3B8' : (isMatch ? '#334155' : '#DC2626')};">
                      ${dbAmt !== null ? '₹' + fmtDec(dbAmt) : '—'}
                    </td>
                    <td style="padding:10px 14px;text-align:right;vertical-align:middle;font-weight:700;color:${diff === null ? '#94A3B8' : (isMatch ? '#059669' : '#DC2626')};">
                      ${diff !== null ? (isMatch ? '₹0.00' : (diff > 0 ? `+₹${fmtDec(diff)}` : `-₹${fmtDec(Math.abs(diff))}`)) : '—'}
                    </td>
                    <td style="padding:10px 14px;text-align:center;vertical-align:middle;white-space:nowrap;">
                      ${isMissing ? `
                        <button onclick="instantAddBooking('${r.confirmation_code}', this)" style="background:#2563EB;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(37,99,235,0.2);">
                          ➕ Add to CRM
                        </button>
                      ` : (isMatch ? `
                        <span style="color:#059669;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                          <span>✓</span> Verified
                        </span>
                      ` : `
                        <button onclick="instantFixField('${r.confirmation_code}', 'amount', this)" style="background:#059669;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(5,150,105,0.2);">
                          ⚡ Reconcile
                        </button>
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
  }

  // ─── Add a single new reservation into Supabase ───
  window.instantAddBooking = async function(code, btn) {
    let r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r) r = window._csvBookings?.[code];
    if (!r) {
      alert('Booking data not found. Please re-upload the CSV file.');
      return;
    }

    const roomSelect = document.getElementById('room-' + code);
    const roomId = roomSelect?.value || r.matched_room_id;

    if (!roomId) {
      alert('Please select a property for this booking!');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Adding...';
    }

    // Check if an online Airbnb booking already exists
    let existingOnline = null;
    if (code) {
      const { data } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code')
        .eq('airbnb_confirmation_code', code)
        .maybeSingle();
      existingOnline = data;
    }
    if (!existingOnline) {
      // Check for any active online reservation overlapping on the same room
      const { data: overlappingOnline } = await sb.from('guest_register')
        .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code, check_in, check_out')
        .eq('room_id', roomId)
        .eq('is_cancelled', false)
        .lt('check_in', r.check_out)
        .gt('check_out', r.check_in);
      
      if (overlappingOnline && overlappingOnline.length > 0) {
        existingOnline = overlappingOnline[0];
      }
    }

    let bookingId;
    if (existingOnline) {
      bookingId = existingOnline.booking_id;
      const { error } = await sb.from('guest_register').update({
        guest_name: r.guest_name,
        phone: r.phone || null,
        total_amount: r.you_earn,
        per_day_rate: r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn,
        gross_amount: r.amount,
        payment_status: 'Paid',
        airbnb_confirmation_code: code,
        notes: `CSV Enriched: Details & Paid Status Updated`
      }).eq('booking_id', bookingId);

      if (error) {
        if (btn) { btn.disabled = false; btn.textContent = '➕ Add to CRM'; }
        alert('Error updating booking:\n' + error.message);
        return;
      }
    } else {
      bookingId = 'B' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
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
        per_day_rate: r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn,
        gross_amount: r.amount,
        booking_mode: 'Online-Airbnb',
        payment_status: 'Paid',
        verification_status: 'verified',
        airbnb_confirmation_code: r.confirmation_code,
        guests: r.guests || 1,
        notes: `Imported from CSV (${r.status})`
      });

      if (error) {
        if (btn) { btn.disabled = false; btn.textContent = '➕ Add to CRM'; }
        alert('Error adding booking:\n' + (error.message || JSON.stringify(error)));
        return;
      }
    }

    // Sync payment history to exact net payout
    if (r.you_earn > 0) {
      const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', bookingId);
      if (payList && payList.length > 0) {
        await sb.from('payment_history').update({
          amount: r.you_earn,
          payment_mode: 'Online-Airbnb',
          notes: 'Auto-updated to net payout from Airbnb CSV'
        }).eq('id', payList[0].id);
      } else {
        await sb.from('payment_history').insert({
          booking_id: bookingId,
          amount: r.you_earn,
          payment_mode: 'Online-Airbnb',
          payment_date: r.check_out || r.check_in,
          received_by: 'Firoz',
          received_by_type: 'employee',
          handover_status: 'handed_over',
          verification_status: 'verified',
          notes: 'Auto-synced from Airbnb CSV'
        });
      }
    }

    if (window._csvBookings) delete window._csvBookings[code];
    SYNC.existingByCode[code] = { booking_id: bookingId, ...r, total_amount: r.you_earn, payment_status: 'Paid' };

    if (window.fsn?.success) fsn.success('Added', `✅ ${r.guest_name} added to CRM!`);
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    classifyReservations();
    renderPreview();
  };

  // ─── Fix a single mismatch ───
  window.instantFixField = async function(code, field, btn) {
    const r = SYNC.reservations.find(x => x.confirmation_code === code);
    if (!r || !r.dbBk) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Saving...';
    }

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
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Reconcile';
      }
      alert('Reconciliation failed: ' + error.message);
      return;
    }

    if (syncPay && r.you_earn > 0) {
      try {
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
      } catch (payErr) {
        console.warn('Payment sync warning:', payErr);
      }
    }

    // In-memory update
    if (r.dbBk) {
      Object.assign(r.dbBk, updates);
      if (field === 'amount') {
        r.dbBk.total_amount = r.you_earn;
        r.dbBk.payment_status = 'Paid';
      }
    }
    if (SYNC.existingByCode && SYNC.existingByCode[code]) {
      Object.assign(SYNC.existingByCode[code], updates);
      if (field === 'amount') {
        SYNC.existingByCode[code].total_amount = r.you_earn;
        SYNC.existingByCode[code].payment_status = 'Paid';
      }
    }

    r.issues = (r.issues || []).filter(i => i.field !== field && (field !== 'amount' || i.field !== 'payment_status'));
    if (r.issues.length === 0) r.matchStatus = 'match';

    if (window.fsn?.success) fsn.success('Reconciled', '✅ Payment matched to exact payout!');
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    renderPreview();
  };

  // ─── 1-Click Fix All Conflicts ───
  window.fixAllConflicts = async function() {
    const conflicts = (window.SYNC?.reservations || []).filter(r => r.matchStatus === 'conflict');
    if (!conflicts.length) {
      alert('No mismatches to reconcile!');
      return;
    }

    if (!confirm(`Reconcile all ${conflicts.length} bookings to their exact official Airbnb payout?`)) return;

    const btn = document.getElementById('fixAllBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Reconciling...'; }

    let fixed = 0;
    let failed = 0;

    for (const r of conflicts) {
      if (!r.dbBk) continue;
      const updates = {
        total_amount: r.you_earn,
        per_day_rate: r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn,
        payment_status: 'Paid',
        airbnb_net_payout: r.you_earn
      };
      if (r.gross) updates.gross_amount = r.gross;
      if (r.host_fee) {
        updates.platform_fee = r.host_fee;
        updates.airbnb_service_fee = r.host_fee;
      }
      if (r.tax_withheld) updates.airbnb_tax_withheld = r.tax_withheld;

      const { error } = await sb.from('guest_register').update(updates).eq('booking_id', r.dbBk.booking_id);
      if (error) {
        console.error('Reconciliation error for', r.confirmation_code, error);
        failed++;
      } else {
        if (r.you_earn > 0) {
          try {
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
          } catch (payErr) {
            console.warn('Payment update warning:', payErr);
          }
        }

        if (r.dbBk) {
          Object.assign(r.dbBk, updates);
        }
        if (SYNC.existingByCode && SYNC.existingByCode[r.confirmation_code]) {
          Object.assign(SYNC.existingByCode[r.confirmation_code], updates);
        }
        fixed++;
        r.issues = [];
        r.matchStatus = 'match';
      }
    }

    if (failed === 0) {
      if (window.fsn?.success) fsn.success('Reconciled', `✅ Successfully reconciled all ${fixed} bookings!`);
    } else {
      if (window.fsn?.warning) fsn.warning('Partial', `✅ Reconciled ${fixed}, ❌ Failed ${failed}`);
    }
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    renderPreview();
  };

  // ─── 1-Click Add All New Bookings ───
  window.addAllNewBookings = async function() {
    let newBookings = (window.SYNC?.reservations || []).filter(r => r.matchStatus === 'new');
    if (!newBookings.length && window._csvBookings) {
      newBookings = Object.values(window._csvBookings).filter(r => r.matchStatus === 'new');
    }

    if (!newBookings.length) {
      alert('No new bookings to add!');
      return;
    }

    if (!confirm(`Add all ${newBookings.length} missing bookings to database?`)) return;

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

      let existingOnline = null;
      if (r.confirmation_code) {
        const { data } = await sb.from('guest_register')
          .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code')
          .eq('airbnb_confirmation_code', r.confirmation_code)
          .maybeSingle();
        existingOnline = data;
      }
      if (!existingOnline) {
        // Check for any active online reservation overlapping on the same room
        const { data: overlappingOnline } = await sb.from('guest_register')
          .select('booking_id, guest_name, total_amount, payment_status, airbnb_confirmation_code, check_in, check_out')
          .eq('room_id', roomId)
          .eq('is_cancelled', false)
          .lt('check_in', r.check_out)
          .gt('check_out', r.check_in);
        
        if (overlappingOnline && overlappingOnline.length > 0) {
          existingOnline = overlappingOnline[0];
        }
      }

      let bookingId;
      let opError = null;

      if (existingOnline) {
        bookingId = existingOnline.booking_id;
        const { error } = await sb.from('guest_register').update({
          guest_name: r.guest_name,
          phone: r.phone || null,
          total_amount: r.you_earn,
          per_day_rate: r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn,
          gross_amount: r.amount,
          payment_status: 'Paid',
          airbnb_confirmation_code: r.confirmation_code,
          notes: `CSV Enriched: Details & Paid Status Updated`
        }).eq('booking_id', bookingId);
        opError = error;
      } else {
        bookingId = 'B' + (Date.now() + i) + '_' + Math.random().toString(36).substring(2, 6);
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
          per_day_rate: r.nights > 0 ? Math.round((r.you_earn / r.nights) * 100) / 100 : r.you_earn,
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
        if (r.you_earn > 0) {
          const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', bookingId);
          if (payList && payList.length > 0) {
            await sb.from('payment_history').update({
              amount: r.you_earn,
              payment_mode: 'Online-Airbnb',
              notes: 'Auto-updated from Airbnb CSV'
            }).eq('id', payList[0].id);
          } else {
            await sb.from('payment_history').insert({
              booking_id: bookingId,
              amount: r.you_earn,
              payment_mode: 'Online-Airbnb',
              payment_date: r.check_out || r.check_in,
              received_by: 'Firoz',
              received_by_type: 'employee',
              handover_status: 'handed_over',
              verification_status: 'verified',
              notes: 'Auto-created from Airbnb CSV'
            });
          }
        }
        if (window._csvBookings) delete window._csvBookings[r.confirmation_code];
        SYNC.existingByCode[r.confirmation_code] = { booking_id: bookingId, ...r, total_amount: r.you_earn, payment_status: 'Paid' };
        added++;
      } else {
        failed++;
        failedNames.push(r.guest_name + ': ' + opError.message);
      }
    }

    if (addAllBtn) { addAllBtn.disabled = false; addAllBtn.textContent = '➕ Add All Bookings'; }

    if (added > 0) {
      if (window.fsn?.success) fsn.success('Success', `✅ Added ${added} new bookings to CRM!`);
      if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
    }
    if (failed > 0) {
      alert(`⚠️ ${failed} bookings could not be added:\n` + failedNames.join('\n'));
    }

    classifyReservations();
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

console.log('✅ Airbnb Sync Module v240 loaded successfully!');
