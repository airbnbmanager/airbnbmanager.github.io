// ═══════════════════════════════════════════════════════════
// 🔄 AIRBNB iCAL AUTO-SYNC MODULE
// ═══════════════════════════════════════════════════════════

window.ICAL_SYNC = {
  // Multiple CORS proxies for fallback (if one fails, try next)
  // Own Supabase Edge Function (primary) + public proxies (fallback)
  CORS_PROXIES: [
    'https://vxxmigdzimnrbbmkjzoa.supabase.co/functions/v1/ical-proxy?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url='
  ],
  
  // Fetch iCal data via CORS proxy (with fallback)
  async fetchIcal(url) {
    let lastError = null;
    for (let i = 0; i < this.CORS_PROXIES.length; i++) {
      try {
        const proxy = this.CORS_PROXIES[i];
        const proxyUrl = proxy + encodeURIComponent(url);
        const res = await fetch(proxyUrl, { 
          method: 'GET',
          headers: { 'Accept': 'text/calendar, text/plain, */*' }
        });
        if (!res.ok) {
          lastError = 'Proxy ' + (i+1) + ' returned ' + res.status;
          continue;
        }
        const text = await res.text();
        if (!text.includes('BEGIN:VCALENDAR')) {
          lastError = 'Proxy ' + (i+1) + ' returned invalid data';
          continue;
        }
        console.log('✅ iCal fetched via proxy ' + (i+1));
        return text;
      } catch (err) {
        lastError = 'Proxy ' + (i+1) + ' error: ' + err.message;
        continue;
      }
    }
    throw new Error('All proxies failed. Last: ' + lastError);
  },
  
  // Parse iCal to booking events (with filtering)
  parseIcal(icalText) {
    const events = icalText.split('BEGIN:VEVENT').slice(1);
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + '01';

    return events.map(ev => {
      const start = ev.match(/DTSTART[^:]*:(\d{8})/)?.[1];
      const end = ev.match(/DTEND[^:]*:(\d{8})/)?.[1];
      const summary = ev.match(/SUMMARY:(.+)/)?.[1]?.trim() || 'Reserved';
      const uid = ev.match(/UID:(.+)/)?.[1]?.trim();
      const fmt = d => d ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : null;

      const checkIn = fmt(start);
      const checkOut = fmt(end);

      // Extract confirmation code and phone last 4 digits if present
      const codeMatch = ev.match(/\b(HM[A-Z0-9]{8,12})\b/);
      const confirmationCode = codeMatch ? codeMatch[1] : null;
      const phoneMatch = ev.match(/Phone Number[^:]*:\s*([0-9]{4})/i);
      const phoneEnd = phoneMatch ? phoneMatch[1] : null;

      return {
        checkIn,
        checkOut,
        summary,
        uid,
        confirmationCode,
        phoneEnd,
        isBlocked: summary.toLowerCase().includes('not available') || summary.toLowerCase().includes('unavailable') || summary.toLowerCase().includes('blocked'),
        isFuture: checkIn > today,
        isBeforeMonth: checkIn < monthStart
      };
    }).filter(e => {
      // Must have valid dates + uid
      if (!e.checkIn || !e.checkOut || !e.uid) return false;
      // Import EVERYTHING: past + future + blocked
      return true;
    });
  },
  
  // Get Booking.com iCal URL for a room
  getBookingComUrl(room) {
    if (!room) return null;
    const match = (room.notes || '').match(/\[BOOKING_ICAL:\s*([^\]]+)\]/);
    if (match) return match[1].trim();
    return localStorage.getItem('tuhh_booking_com_ical_' + room.room_id) || null;
  },

  // Outbound 2-Way Calendar Feed Generator (.ics)
  async generateOutboundIcal(roomId) {
    const { data: bookings } = await sb.from('guest_register')
      .select('booking_id, check_in, check_out, guest_name, booking_mode, is_cancelled')
      .eq('room_id', roomId)
      .neq('is_cancelled', true);
    
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Unique Haven Homes//TUHH Multi-Channel Master 2.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:TUHH Master ${roomId}`
    ];

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

    (bookings || []).forEach(b => {
      if (!b.check_in || !b.check_out) return;
      const start = b.check_in.replace(/-/g, '');
      const end = b.check_out.replace(/-/g, '');
      const uid = `tuhh-${b.booking_id}@uniquehavenhomes.com`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowStr}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:TUHH Reserved (${b.booking_mode || 'Direct'})`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  },

  // Sync individual channel URL (Airbnb or Booking.com)
  async syncChannelUrl(room, icalUrl, channelName, result) {
    if (!icalUrl) return;
    try {
      const icalText = await this.fetchIcal(icalUrl);
      const totalEvents = icalText.split('BEGIN:VEVENT').length - 1;
      result.totalInIcal += totalEvents;
      const events = this.parseIcal(icalText);
      result.fetched += events.length;

      // Fetch ALL active bookings for this room in DB (not just online channels)
      const { data: existing } = await sb.from('guest_register')
        .select('booking_id, ical_uid, airbnb_confirmation_code, check_in, check_out, booking_mode, is_cancelled, guest_name, total_amount')
        .eq('room_id', room.room_id)
        .neq('is_cancelled', true);
      
      const existingUids = new Set((existing || []).filter(e => e.ical_uid).map(e => e.ical_uid));
      const existingCodes = new Set((existing || []).filter(e => e.airbnb_confirmation_code).map(e => e.airbnb_confirmation_code));

      const isBcom = channelName === 'Booking.com';
      const bookingMode = isBcom ? 'Online-Booking.com' : 'Online-Airbnb';
      const channelTag = isBcom ? '🔵 Booking.com' : '🏨 Airbnb';

      for (const event of events) {
        if (!event.checkIn || !event.checkOut) continue;

        // 1. Check if ANY REAL BOOKING (with revenue or real guest details) overlaps this date range
        const realOverlap = (existing || []).find(b => {
          if (!b.check_in || !b.check_out) return false;
          const isReal = (Number(b.total_amount) > 0 || (b.guest_name && !b.guest_name.includes('Blocked') && !b.guest_name.includes('Fill Details')));
          return isReal && (b.check_in < event.checkOut && b.check_out > event.checkIn);
        });

        // If a REAL booking already exists for these dates:
        if (realOverlap) {
          // If this iCal event is a block, DO NOT insert dummy block over a real booking!
          if (event.isBlocked) {
            // Also clean up any lingering dummy block for this date if present
            const dummyToPurge = (existing || []).find(b => 
              (b.booking_id.startsWith('BLK_') || b.booking_mode === 'Offline-Blocked' || b.guest_name === '🔒 Blocked Slot') &&
              (b.check_in < event.checkOut && b.check_out > event.checkIn)
            );
            if (dummyToPurge) {
              await sb.from('guest_register').delete().eq('booking_id', dummyToPurge.booking_id);
            }
            result.skipped++;
            continue;
          }

          // If this is an actual online reservation, link the confirmation code to the real booking if missing
          if (event.confirmationCode && !realOverlap.airbnb_confirmation_code) {
            await sb.from('guest_register').update({
              airbnb_confirmation_code: event.confirmationCode,
              ical_uid: event.uid || realOverlap.ical_uid
            }).eq('booking_id', realOverlap.booking_id);
          }
          result.skipped++;
          continue;
        }

        // 2. Already synced check
        if (existingUids.has(event.uid)) { result.skipped++; continue; }
        if (event.confirmationCode && existingCodes.has(event.confirmationCode)) { result.skipped++; continue; }

        // 3. Handle Blocked slots (ONLY when NO real booking exists)
        if (event.isBlocked) {
          if (event.checkIn < '2026-08-01') continue;
          const deterministicId = `BLK_${room.room_id}_${event.checkIn.replace(/-/g, '')}`;
          
          // Check if this exact block already exists
          const existingBlock = (existing || []).find(b => b.booking_id === deterministicId);
          if (existingBlock) { result.skipped++; continue; }

          await sb.from('guest_register').upsert({
            booking_id: deterministicId,
            guest_name: '🔒 Blocked Slot',
            room_id: room.room_id,
            check_in: event.checkIn,
            check_out: event.checkOut,
            booking_mode: 'Offline-Blocked',
            payment_status: 'Unpaid',
            total_amount: 0,
            notes: `Blocked on ${channelName} (${event.summary}). Offline slot reserved.`
          }, { onConflict: 'booking_id' });
          result.created++;
          continue;
        }

        // 4. Handle REALTIME Online Booking (Fill with real room rate instead of ₹0!)
        const nights = Math.max(1, Math.round((new Date(event.checkOut) - new Date(event.checkIn)) / (1000 * 60 * 60 * 24)));
        const rentPerNight = Number(room.rent_per_night) || 4500;
        const totalAmount = rentPerNight * nights;

        // Use deterministic booking ID so repeat syncs NEVER create duplicate rows!
        const bookingId = event.confirmationCode 
          ? `BK_ABNB_${event.confirmationCode}`
          : `BK_SYNC_${room.room_id}_${event.checkIn.replace(/-/g, '')}`;

        const guestName = event.confirmationCode ? `${channelTag} (${event.confirmationCode})` : `${channelTag} Guest`;
        const bookingNotes = `${channelName} reservation auto-synced.${event.confirmationCode ? ` Code: ${event.confirmationCode}.` : ''} Rate: ₹${rentPerNight}/night × ${nights} nights.`;

        const { error } = await sb.from('guest_register').upsert({
          booking_id: bookingId,
          room_id: room.room_id,
          guest_name: guestName,
          check_in: event.checkIn,
          check_out: event.checkOut,
          total_amount: totalAmount,
          per_day_rate: rentPerNight,
          booking_mode: bookingMode,
          payment_status: 'Paid',
          verification_status: 'approved',
          guests: room.max_guests || 6,
          ical_uid: event.uid,
          airbnb_confirmation_code: event.confirmationCode || null,
          phone: event.phoneEnd ? `+91 XXXXX ${event.phoneEnd}` : null,
          synced_from_ical: true,
          notes: bookingNotes
        }, { onConflict: 'booking_id' });

        if (!error) {
          result.created++;
          existingCodes.add(event.confirmationCode);
          existingUids.add(event.uid);
        } else {
          result.skipped++;
        }
      }
    } catch(err) {
      result.errors.push(`${channelName}: ${err.message}`);
    }
  },

  // Sync single property (both Airbnb and Booking.com)
  async syncProperty(room) {
    const result = {
      room: room.nickname || room.unit_no,
      roomId: room.room_id,
      totalInIcal: 0,
      fetched: 0,
      created: 0,
      skipped: 0,
      skippedFuture: 0,
      errors: []
    };
    
    const bcomUrl = this.getBookingComUrl(room);
    if (!room.airbnb_ical_url && !bcomUrl) {
      result.errors.push('No iCal URL configured');
      return result;
    }
    
    if (room.airbnb_ical_url) {
      await this.syncChannelUrl(room, room.airbnb_ical_url, 'Airbnb', result);
    }
    if (bcomUrl) {
      await this.syncChannelUrl(room, bcomUrl, 'Booking.com', result);
    }
    
    return result;
  },
  
  // Auto-cleanup: Remove stale placeholder bookings
  async cleanupStalePlaceholders() {
    // Delete "Fill Details" bookings that:
    // 1. Are older than 7 days (past checkouts, never got real data)
    // 2. Have 0 amount
    // 3. Are synced from iCal
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    
    const { data: stale, error } = await sb.from('guest_register')
      .select('booking_id')
      .lt('check_out', cutoffStr)
      .eq('total_amount', 0)
      .eq('synced_from_ical', true);
    
    if (stale && stale.length > 0) {
      const ids = stale.map(s => s.booking_id);
      await sb.from('guest_register').delete().in('booking_id', ids);
      console.log('🧹 Cleaned', stale.length, 'stale placeholder bookings');
      return stale.length;
    }
    return 0;
  },
  
  // Sync all properties
  async syncAll() {
    // Auto-cleanup first
    const cleaned = await this.cleanupStalePlaceholders();
    if (cleaned > 0) console.log('✅ Cleanup:', cleaned, 'stale removed');
    
    const { data: rooms } = await sb.from('rooms')
      .select('room_id, unit_no, nickname, airbnb_ical_url')
      .not('airbnb_ical_url', 'is', null);
    
    if (!rooms || !rooms.length) {
      return { total: 0, results: [] };
    }
    
    const results = [];
    for (const room of rooms) {
      const r = await this.syncProperty(room);
      results.push(r);
    }
    
    return { total: rooms.length, results };
  }
};

// ═══════════════════════════════════════════════════════════
// UI: Render iCal Sync Panel
// ═══════════════════════════════════════════════════════════

window.renderIcalSync = async function() {
  window._airbnbTabsHtml = `
    <div class="card" style="padding:8px;margin-bottom:12px;">
      <div style="display:flex;gap:8px;">
        <button onclick="renderAirbnbSync()" class="secondary" style="flex:1;">📁 CSV Import</button>
        <button style="flex:1;">📅 iCal Auto-Sync</button>
      </div>
    </div>`;
  
  if (!['developer', 'owner'].includes(SESSION.role)) {
    renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'ical-sync');
    return;
  }
  
  renderShell('<div class="loading">Loading...</div>', 'ical-sync');
  
  const { data: rooms } = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name, airbnb_ical_url, notes')
    .order('unit_no');
  
  const configured = (rooms || []).filter(r => r.airbnb_ical_url || ICAL_SYNC.getBookingComUrl(r));
  const notConfigured = (rooms || []).filter(r => !r.airbnb_ical_url && !ICAL_SYNC.getBookingComUrl(r));
  
  renderShell(`
    ${window._airbnbTabsHtml || ''}
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="margin:0;">🔄 Multi-Channel OTA Sync (Airbnb &amp; Booking.com)</h1>
          <div class="sub">2-Way Calendar Sync: Auto-import bookings + Auto-block dates across channels</div>
        </div>
        <button onclick="window.AIRBNB_IMPORTER.openModal()" 
                style="padding:9px 16px;background:#FF385C;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 3px 10px rgba(255,56,92,0.3);">
          📥 Import Airbnb Footage &amp; Listing
        </button>
      </div>

      <div style="margin-top:14px;padding:12px;background:${ICAL_AUTO_SYNC.isEnabled()?'#F0FDF4':'#FEF2F2'};border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border:1px solid ${ICAL_AUTO_SYNC.isEnabled()?'#BBF7D0':'#FECACA'};">
        <div>
          <strong style="color:${ICAL_AUTO_SYNC.isEnabled()?'#059669':'#DC2626'};font-size:14px;">
            ${ICAL_AUTO_SYNC.isEnabled() ? '✅ Realtime Auto-Sync: ACTIVE (Every 5 mins)' : '⏸️ Realtime Auto-Sync: PAUSED'}
          </strong>
          <div style="font-size:12px;color:#666;margin-top:2px;">
            Airbnb aur Booking.com dono se calendar auto-poll hota hai aur zero double-booking ensure hoti hai.
          </div>
        </div>
        <button onclick="toggleIcalAutoSync()" style="padding:7px 16px;background:${ICAL_AUTO_SYNC.isEnabled()?'#DC2626':'#059669'};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
          ${ICAL_AUTO_SYNC.isEnabled() ? '⏸️ Pause Auto-Sync' : '▶️ Enable Auto-Sync'}
        </button>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--muted);">
        Last sync: <span id="lastSyncTime">${(() => {
          const t = parseInt(localStorage.getItem('ical_last_sync') || '0');
          if (!t) return 'Never';
          const mins = Math.round((Date.now() - t) / 60000);
          if (mins < 1) return 'Just now';
          if (mins < 60) return mins + ' min ago';
          const hrs = Math.round(mins / 60);
          return hrs + ' hour' + (hrs > 1 ? 's' : '') + ' ago';
        })()}</span>
      </div>
    </div>

    <!-- 2-WAY SYNC EXPLANATION BANNER -->
    <div class="card" style="border-left:4px solid #2563EB;background:#EFF6FF;">
      <div class="section-title" style="color:#1E40AF;">🔄 2-WAY CALENDAR SYNC (DOUBLE BOOKING PREVENTION)</div>
      <div style="line-height:1.8;font-size:13px;color:#1E3A8A;">
        <div><strong>1. Import to TUHH:</strong> Neeche har flat me Airbnb iCal link aur Booking.com iCal link daal kar save karein.</div>
        <div><strong>2. Export to OTAs:</strong> Har flat ka <strong>🟢 Master Calendar Feed</strong> copy karke Airbnb aur Booking.com ke "Import Calendar" me paste karein.</div>
        <div><strong>Result:</strong> Kisi bhi channel par booking aane se baki sab jagah dates instant auto-block ho jayengi!</div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong>${configured.length} properties connected</strong> / ${(rooms||[]).length} total flats
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="runIcalSyncAll()" ${configured.length===0?'disabled':''} style="background:#2563EB;color:#fff;font-weight:700;">
            🔄 Sync All Channels Now (${configured.length})
          </button>
        </div>
      </div>
    </div>

    <div id="icalSyncResults"></div>

    <div class="card">
      <div class="section-title">🏢 Connected Properties (${configured.length})</div>
      ${configured.length === 0 ? '<div class="sub">No properties configured yet. Add iCal URLs below.</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Property</th><th>Channels Configured</th><th>2-Way Master Export Feed</th><th>Actions</th></tr></thead>
          <tbody>
            ${configured.map(r => {
              const bcom = ICAL_SYNC.getBookingComUrl(r);
              const abnb = r.airbnb_ical_url;
              const exportFeed = `https://airbnbmanager.github.io/calendar.html?export_ical=${r.room_id}`;
              return `
              <tr>
                <td>
                  <strong>${r.nickname || r.unit_no}</strong>
                  <div style="font-size:11px;color:#6B7280;">${r.room_id}</div>
                </td>
                <td>
                  <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;">
                    ${abnb ? `
                      <span style="color:#DC2626;font-weight:700;display:flex;align-items:center;gap:4px;">
                        🔴 Airbnb: Connected (${abnb.slice(0, 35)}...)
                      </span>
                    ` : '<span style="color:#9CA3AF;">🔴 Airbnb: Not set</span>'}
                    ${bcom ? `
                      <span style="color:#1D4ED8;font-weight:700;display:flex;align-items:center;gap:4px;">
                        🔵 Booking.com: Connected (${bcom.slice(0, 35)}...)
                      </span>
                    ` : '<span style="color:#9CA3AF;">🔵 Booking.com: Not set</span>'}
                  </div>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <input readonly value="${exportFeed}" style="font-size:11px;font-family:monospace;max-width:180px;background:#F9FAFB;" />
                    <button class="btn-sm" style="background:#166534;color:#fff;font-weight:700;" 
                            onclick="navigator.clipboard.writeText('${exportFeed}');fsn.success('Copied','Master export feed copied!');">
                      📋 Copy Feed
                    </button>
                  </div>
                </td>
                <td>
                  <button class="btn-sm" onclick="syncSingleProperty('${r.room_id}')">🔄 Sync</button>
                  <button class="btn-sm" onclick="testIcalUrl('${r.room_id}')">🧪 Test</button>
                  <button class="btn-sm danger" onclick="removeIcalUrl('${r.room_id}')">🗑️</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      `}
    </div>

    <div class="card">
      <div class="section-title">➕ Add / Update OTA iCal URLs</div>
      <div class="form-group">
        <label style="font-weight:700;">Property *</label>
        <select id="icalRoom" onchange="window.onIcalRoomSelect(this.value)">
          <option value="">-- Select Property --</option>
          ${(rooms || []).map(r => `<option value="${r.room_id}">${r.room_id} (${r.nickname || r.unit_no})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label style="font-weight:700;color:#DC2626;">🔴 Airbnb iCal URL (Exported from Airbnb)</label>
        <input id="icalUrl" type="url" placeholder="https://www.airbnb.co.in/calendar/ical/XXXXX.ics?s=YYYYY" style="font-family:monospace;font-size:12px;" />
      </div>
      <div class="form-group">
        <label style="font-weight:700;color:#1D4ED8;">🔵 Booking.com iCal URL (Exported from Booking.com Extranet)</label>
        <input id="bcomIcalUrl" type="url" placeholder="https://admin.booking.com/hotel/hoteladmin/ical.html?t=..." style="font-family:monospace;font-size:12px;" />
      </div>
      <button onclick="saveIcalUrl()" style="width:100%;padding:12px;background:#2563EB;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:14px;cursor:pointer;">
        💾 Save OTA Calendar URLs
      </button>
    </div>
  `, 'ical-sync');

  window._allRoomsCacheForIcal = rooms || [];
};

window.onIcalRoomSelect = function(roomId) {
  const rooms = window._allRoomsCacheForIcal || [];
  const r = rooms.find(x => x.room_id === roomId);
  const airbnbInput = document.getElementById('icalUrl');
  const bcomInput = document.getElementById('bcomIcalUrl');
  if (r) {
    if (airbnbInput) airbnbInput.value = r.airbnb_ical_url || '';
    if (bcomInput) bcomInput.value = ICAL_SYNC.getBookingComUrl(r) || '';
  }
};

window.saveIcalUrl = async function() {
  const roomId = document.getElementById('icalRoom').value;
  const abnbUrl = document.getElementById('icalUrl').value.trim();
  const bcomUrl = document.getElementById('bcomIcalUrl').value.trim();
  
  if (!roomId) { fsn.error('Error', 'Please select a property'); return; }
  if (!abnbUrl && !bcomUrl) { fsn.error('Error', 'Enter at least one iCal URL (Airbnb or Booking.com)'); return; }

  // 1. Update Airbnb URL in DB
  const { data: currentRoom } = await sb.from('rooms').select('notes').eq('room_id', roomId).single();
  let notesVal = currentRoom?.notes || '';

  // Update Booking.com link inside notes
  if (bcomUrl) {
    localStorage.setItem('tuhh_booking_com_ical_' + roomId, bcomUrl);
    if (notesVal.includes('[BOOKING_ICAL:')) {
      notesVal = notesVal.replace(/\[BOOKING_ICAL:\s*[^\]]+\]/, `[BOOKING_ICAL: ${bcomUrl}]`).trim();
    } else {
      notesVal = (notesVal ? notesVal + '\n' : '') + `[BOOKING_ICAL: ${bcomUrl}]`;
    }
  } else if (notesVal.includes('[BOOKING_ICAL:')) {
    localStorage.removeItem('tuhh_booking_com_ical_' + roomId);
    notesVal = notesVal.replace(/\[BOOKING_ICAL:\s*[^\]]+\]/, '').trim();
  }

  const { error } = await sb.from('rooms').update({
    airbnb_ical_url: abnbUrl || null,
    notes: notesVal || null
  }).eq('room_id', roomId);

  if (error) { fsn.error('Error', error.message); return; }
  
  fsn.success('Saved', '✅ OTA Calendar URLs saved successfully!');
  renderIcalSync();
};

window.removeIcalUrl = async function(roomId) {
  if (!confirm('Remove OTA iCal URLs? Sync will stop for this property.')) return;
  const { data: currentRoom } = await sb.from('rooms').select('notes').eq('room_id', roomId).single();
  let notesVal = (currentRoom?.notes || '').replace(/\[BOOKING_ICAL:\s*[^\]]+\]/, '').trim();
  localStorage.removeItem('tuhh_booking_com_ical_' + roomId);

  await sb.from('rooms').update({
    airbnb_ical_url: null,
    notes: notesVal || null
  }).eq('room_id', roomId);

  fsn.success('Success', '✅ URLs removed');
  renderIcalSync();
};

window.testIcalUrl = async function(roomId) {
  const { data: room } = await sb.from('rooms').select('*').eq('room_id', roomId).single();
  if (!room?.airbnb_ical_url) { fsn.error('Error', 'No URL'); return; }
  
  fsn.info('Testing', '🔄 Fetching iCal...');
  try {
    const text = await ICAL_SYNC.fetchIcal(room.airbnb_ical_url);
    const events = ICAL_SYNC.parseIcal(text);
    alert(`✅ TEST OK\n\n${room.nickname}\nFound ${events.length} events:\n\n${events.slice(0,5).map(e => `• ${e.checkIn} → ${e.checkOut} (${e.summary})`).join('\n')}${events.length > 5 ? `\n\n...and ${events.length-5} more` : ''}`);
  } catch (err) {
    alert('❌ TEST FAILED: ' + err.message);
  }
};

window.syncSingleProperty = async function(roomId) {
  const { data: room } = await sb.from('rooms').select('*').eq('room_id', roomId).single();
  document.getElementById('icalSyncResults').innerHTML = '<div class="card"><div class="loading">🔄 Syncing ' + (room.nickname || room.unit_no) + '...</div></div>';
  
  const result = await ICAL_SYNC.syncProperty(room);
  renderSyncResults([result]);
};

window.runIcalSyncAll = async function() {
  document.getElementById('icalSyncResults').innerHTML = '<div class="card"><div class="loading">🔄 Syncing all properties... please wait</div></div>';
  
  const { total, results } = await ICAL_SYNC.syncAll();
  renderSyncResults(results);
};

function renderSyncResults(results) {
  const totalCreated = results.reduce((s, r) => s + r.created, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  
  document.getElementById('icalSyncResults').innerHTML = `
    <div class="card" style="border-left:4px solid ${totalErrors===0?'#10B981':'#F59E0B'};background:${totalErrors===0?'#F0FDF4':'#FFFBEB'};">
      <div class="section-title">📊 SYNC RESULTS</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0;">
        <div style="text-align:center;padding:12px;background:white;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#3B82F6;">${results.length}</div>
          <div style="font-size:11px;">Properties</div>
        </div>
        <div style="text-align:center;padding:12px;background:white;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#10B981;">${totalCreated}</div>
          <div style="font-size:11px;">New Bookings</div>
        </div>
        <div style="text-align:center;padding:12px;background:white;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#6B7280;">${totalSkipped}</div>
          <div style="font-size:11px;">Skipped (Duplicates)</div>
        </div>
        <div style="text-align:center;padding:12px;background:white;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:${totalErrors>0?'#EF4444':'#10B981'};">${totalErrors}</div>
          <div style="font-size:11px;">Errors</div>
        </div>
      </div>

      <div class="table-wrap"><table>
        <thead><tr><th>Property</th><th>Fetched</th><th>Created ✅</th><th>Skipped</th><th>Errors</th></tr></thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td><strong>${r.room}</strong></td>
              <td>${r.fetched}</td>
              <td><span class="badge green">${r.created}</span></td>
              <td><span class="badge">${r.skipped}</span></td>
              <td>${r.errors.length > 0 ? `<span class="badge red">${r.errors.length}</span><div class="sub" style="font-size:10px;">${r.errors.join('; ')}</div>` : '<span class="badge green">0</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  `;
}

console.log('✅ iCal Sync module loaded');


// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-SYNC SCHEDULER (every 5 minutes)
// ═══════════════════════════════════════════════════════════

window.ICAL_AUTO_SYNC = {
  INTERVAL_MS: 2.5 * 60 * 1000,  // Every 2.5 minutes
  MIN_GAP_MS: 60 * 1000,         // 1 min minimum between syncs
  timer: null,
  isRunning: false,
  
  getLastSync() {
    return parseInt(localStorage.getItem('ical_last_sync') || '0');
  },
  
  setLastSync() {
    localStorage.setItem('ical_last_sync', Date.now().toString());
  },
  
  async runSilent() {
    if (this.isRunning) {
      console.log('⏭️ iCal sync already running, skip');
      return;
    }
    
    // Check minimum gap
    const lastSync = this.getLastSync();
    const gap = Date.now() - lastSync;
    if (lastSync && gap < this.MIN_GAP_MS) {
      return;
    }
    
    this.isRunning = true;
    console.log('🔄 iCal auto-sync started at ' + new Date().toLocaleTimeString());
    
    try {
      const { total, results } = await ICAL_SYNC.syncAll();
      const totalCreated = results.reduce((s, r) => s + (r.created || 0), 0);
      const totalErrors = results.reduce((s, r) => s + (r.errors?.length || 0), 0);
      
      this.setLastSync();
      
      if (totalCreated > 0) {
        console.log('✅ iCal auto-sync: ' + totalCreated + ' new bookings');
        if (window.fsn?.success) {
          fsn.success('Airbnb Sync', `✅ ${totalCreated} new booking(s) auto-imported!`);
        }
        if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged();
        if (typeof window.renderCalendar === 'function' && window._currentView === 'calendar') window.renderCalendar();
        if (typeof window.renderBookings === 'function' && window._currentView === 'bookings') window.renderBookings();
      } else {
        console.log('✅ iCal auto-sync: up to date');
      }
      
      if (totalErrors > 0) {
        console.warn('⚠️ iCal sync errors: ' + totalErrors);
      }
    } catch (err) {
      console.error('❌ iCal auto-sync failed:', err.message);
    } finally {
      this.isRunning = false;
    }
  },
  
  isEnabled() {
    return localStorage.getItem('ical_auto_sync_enabled') !== 'false';
  },
  
  start() {
    if (this.timer) {
      console.log('⏭️ iCal scheduler already running');
      return;
    }
    
    // Check user preference
    if (!this.isEnabled()) {
      console.log('⏸️ iCal auto-sync DISABLED by user');
      return;
    }
    
    // Only for admin/owner/developer
    if (!['owner', 'admin', 'developer', 'manager'].includes(window.SESSION?.role)) {
      console.log('⏭️ iCal auto-sync: not authorized for role');
      return;
    }
    
    console.log('🔄 iCal auto-sync scheduler started (every 2.5 minutes)');
    
    // Run once quickly after 3 seconds (initial startup sync)
    setTimeout(() => this.runSilent(), 3000);
    
    // Then every 2.5 minutes
    this.timer = setInterval(() => this.runSilent(), this.INTERVAL_MS);

    // Also auto-sync whenever user switches back to CRM tab if > 90s since last check
    if (!this._focusBound && typeof window !== 'undefined') {
      this._focusBound = true;
      window.addEventListener('focus', () => {
        const lastSync = this.getLastSync();
        if (Date.now() - lastSync > 90 * 1000) {
          console.log('🔄 Tab focused: running quick Airbnb sync check...');
          this.runSilent();
        }
      });
    }
  },
  
  enable() {
    localStorage.setItem('ical_auto_sync_enabled', 'true');
    this.start();
    if (window.fsn?.success) fsn.success('Auto-Sync', '✅ Enabled — runs every 2.5 minutes');
    return true;
  },
  
  disable() {
    localStorage.setItem('ical_auto_sync_enabled', 'false');
    this.stop();
    if (window.fsn?.info) fsn.info('Auto-Sync', '⏸️ Disabled — manual sync still works');
    return false;
  },
  
  toggle() {
    return this.isEnabled() ? this.disable() : this.enable();
  },
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('⏹️ iCal auto-sync scheduler stopped');
    }
  }
};

// Auto-start when SESSION is ready
(function autoStartIcalSync() {
  const check = () => {
    if (window.SESSION?.role) {
      ICAL_AUTO_SYNC.start();
    } else {
      setTimeout(check, 2000);
    }
  };
  setTimeout(check, 3000);
})();

window.toggleIcalAutoSync = function() {
  ICAL_AUTO_SYNC.toggle();
  renderIcalSync();  // Refresh UI
};

console.log('✅ iCal Auto-Sync module ready');


// 🛑 SAFELY DISABLE AUTO-SYNC SCHEDULER
if (typeof window !== 'undefined') {
  if (window.ICAL_SYNC) window.ICAL_SYNC.startAutoSync = function() { console.log('iCal-sync disabled'); };
}
