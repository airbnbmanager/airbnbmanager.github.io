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

      return {
        checkIn,
        checkOut,
        summary,
        uid,
        isBlocked: summary.toLowerCase().includes('not available') || summary.toLowerCase().includes('blocked'),
        isFuture: checkIn > today,
        isBeforeMonth: checkIn < monthStart
      };
    }).filter(e => {
      // Must have valid dates + uid
      if (!e.checkIn || !e.checkOut || !e.uid) return false;
      // Import EVERYTHING: past + future + blocked
      // Blocked dates → Pending booking (fill details later)
      // Future bookings → advance planning
      return true;
    });
  },
  
  // Sync single property
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
    
    if (!room.airbnb_ical_url) {
      result.errors.push('No iCal URL configured');
      return result;
    }
    
    try {
      const icalText = await this.fetchIcal(room.airbnb_ical_url);
      // Count total events (before filter)
      const totalEvents = icalText.split('BEGIN:VEVENT').length - 1;
      result.totalInIcal = totalEvents;
      const events = this.parseIcal(icalText);
      result.fetched = events.length;
      result.skippedFuture = totalEvents - events.length;
      
      // Get existing UIDs AND date-range bookings to prevent duplicates
      const { data: existing } = await sb.from('guest_register')
        .select('ical_uid, check_in, check_out, booking_mode, is_cancelled')
        .eq('room_id', room.room_id);
      const existingUids = new Set((existing || [])
        .filter(e => e.ical_uid)
        .map(e => e.ical_uid));
      
      // Also check by date+mode (Airbnb bookings on same dates = duplicate)
      const existingDateRanges = new Set(
        (existing || [])
          .filter(e => !e.is_cancelled && e.booking_mode === 'Online-Airbnb')
          .map(e => `${e.check_in}|${e.check_out}`)
      );

      // Also get ALL bookings (any mode) for overlap check
      const { data: allExisting } = await sb.from('guest_register')
        .select('check_in, check_out, booking_mode')
        .eq('room_id', room.room_id)
        .eq('is_cancelled', false);
      
      for (const event of events) {
        // Skip if UID already synced
        if (existingUids.has(event.uid)) {
          result.skipped++;
          continue;
        }
        // Skip if manual Airbnb entry already exists for same dates
        if (existingDateRanges.has(`${event.checkIn}|${event.checkOut}`)) {
          result.skipped++;
          continue;
        }
        // Skip if ANY overlap exists (manual block or booking)
        const hasOverlap = (allExisting || []).some(e => 
          e.check_in <= event.checkOut && e.check_out >= event.checkIn
        );
        if (hasOverlap) {
          result.skipped++;
          continue;
        }
        
        // Create placeholder booking (blocked vs real)
        const bookingId = 'BK' + Date.now() + Math.floor(Math.random() * 1000);
        const isBlocked = event.isBlocked;
        const isFuture = event.isFuture;
        
        const guestName = isBlocked 
          ? '🚫 Blocked (Fill Details)' 
          : '🏨 Airbnb Guest (Fill Details)';
        
        const bookingNotes = isBlocked
          ? `⚠️ BLOCKED on Airbnb (${event.summary}). Owner may have offline booking here. Fill guest details when confirmed.`
          : `Airbnb reservation auto-synced. Original summary: ${event.summary}. Waiting for guest details (name, phone, amount).`;
        
        const { error } = await sb.from('guest_register').insert({
          booking_id: bookingId,
          room_id: room.room_id,
          guest_name: guestName,
          check_in: event.checkIn,
          check_out: event.checkOut,
          total_amount: 0,
          booking_mode: isBlocked ? 'Offline-Blocked' : 'Online-Airbnb',
          payment_status: 'Unpaid',
          verification_status: 'pending_details',
          guests: 1,
          ical_uid: event.uid,
          synced_from_ical: true,
          notes: bookingNotes
        });
        
        if (error) {
          // Silently skip duplicate UIDs (already synced from another source)
          if (error.message.includes('duplicate key') || error.message.includes('guest_register_ical_uid')) {
            result.skipped++;
          } else {
            result.errors.push(`${event.checkIn}: ${error.message}`);
          }
        } else {
          result.created++;
        }
      }
    } catch (err) {
      result.errors.push(err.message);
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
    .select('room_id, unit_no, nickname, airbnb_ical_url')
    .order('unit_no');
  
  const configured = (rooms || []).filter(r => r.airbnb_ical_url);
  const notConfigured = (rooms || []).filter(r => !r.airbnb_ical_url);
  
  renderShell(`
    ${window._airbnbTabsHtml || ''}
    <div class="card">
      <h1>🔄 Airbnb iCal Auto-Sync</h1>
      <div class="sub">Real-time calendar sync from Airbnb (every property)</div>
      <div style="margin-top:12px;padding:10px;background:${ICAL_AUTO_SYNC.isEnabled()?'#F0FDF4':'#FEF2F2'};border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="color:${ICAL_AUTO_SYNC.isEnabled()?'#059669':'#DC2626'};">
            ${ICAL_AUTO_SYNC.isEnabled() ? '✅ Auto-Sync: ENABLED' : '⏸️ Auto-Sync: DISABLED'}
          </strong>
          <div style="font-size:11px;color:#666;margin-top:2px;">
            ${ICAL_AUTO_SYNC.isEnabled() ? 'Runs every 5 minutes automatically' : 'Only manual sync works'}
          </div>
        </div>
        <button onclick="toggleIcalAutoSync()" style="padding:6px 14px;background:${ICAL_AUTO_SYNC.isEnabled()?'#DC2626':'#059669'};color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          ${ICAL_AUTO_SYNC.isEnabled() ? '⏸️ Disable' : '▶️ Enable'}
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

    <div class="card" style="border-left:4px solid #10B981;background:#F0FDF4;">
      <div class="section-title">📖 HOW TO SETUP</div>
      <div style="line-height:1.9;font-size:13px;">
        <div><strong>Step 1:</strong> Airbnb Host Dashboard → Calendar → Select property</div>
        <div><strong>Step 2:</strong> Availability Settings ⚙️ → Sync Calendars</div>
        <div><strong>Step 3:</strong> "Export Calendar" → Copy URL (ends with .ics)</div>
        <div><strong>Step 4:</strong> Paste in property below → Save</div>
        <div><strong>Step 5:</strong> Click "Sync All" — bookings auto-import!</div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong>${configured.length} configured</strong> / ${(rooms||[]).length} properties
        </div>
        <div>
          <button onclick="runIcalSyncAll()" ${configured.length===0?'disabled':''}>
            🔄 Sync All Now (${configured.length})
          </button>
        </div>
      </div>
    </div>

    <div id="icalSyncResults"></div>

    <div class="card">
      <div class="section-title">🏢 Configured Properties (${configured.length})</div>
      ${configured.length === 0 ? '<div class="sub">No properties configured yet. Add iCal URL below.</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>Property</th><th>iCal URL</th><th>Actions</th></tr></thead>
          <tbody>
            ${configured.map(r => `
              <tr>
                <td><strong>${r.nickname || r.unit_no}</strong></td>
                <td style="font-size:11px;font-family:monospace;color:var(--muted);word-break:break-all;">
                  ${r.airbnb_ical_url.substring(0, 60)}...
                </td>
                <td>
                  <button class="btn-sm" onclick="testIcalUrl('${r.room_id}')">🧪 Test</button>
                  <button class="btn-sm" onclick="syncSingleProperty('${r.room_id}')">🔄 Sync</button>
                  <button class="btn-sm danger" onclick="removeIcalUrl('${r.room_id}')">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      `}
    </div>

    <div class="card">
      <div class="section-title">➕ Add iCal URL</div>
      <div class="form-group">
        <label>Property</label>
        <select id="icalRoom">
          <option value="">-- Select Property --</option>
          ${notConfigured.map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`).join('')}
          ${configured.map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no} (update existing)</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Airbnb iCal URL (must end with .ics)</label>
        <input id="icalUrl" type="url" placeholder="https://www.airbnb.co.in/calendar/ical/XXXXX.ics?s=YYYYY" style="font-family:monospace;font-size:12px;" />
      </div>
      <button onclick="saveIcalUrl()" style="width:100%;">💾 Save iCal URL</button>
    </div>
  `, 'ical-sync');
};

window.saveIcalUrl = async function() {
  const roomId = document.getElementById('icalRoom').value;
  const url = document.getElementById('icalUrl').value.trim();
  
  if (!roomId) { fsn.error('Error', 'Select property'); return; }
  if (!url) { fsn.error('Error', 'Enter iCal URL'); return; }
  if (!url.includes('.ics')) { fsn.error('Error', 'URL must contain .ics'); return; }
  
  const { error } = await sb.from('rooms').update({ airbnb_ical_url: url }).eq('room_id', roomId);
  if (error) { fsn.error('Error', error.message); return; }
  
  fsn.success('Success', '✅ iCal URL saved!');
  renderIcalSync();
};

window.removeIcalUrl = async function(roomId) {
  if (!confirm('Remove iCal URL? Sync will stop for this property.')) return;
  await sb.from('rooms').update({ airbnb_ical_url: null }).eq('room_id', roomId);
  fsn.success('Success', '✅ Removed');
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
  INTERVAL_MS: 5 * 60 * 1000,  // 2 hours
  MIN_GAP_MS: 10 * 60 * 1000,        // 30 min minimum between syncs
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
      const minsLeft = Math.round((this.MIN_GAP_MS - gap) / 60000);
      console.log('⏭️ iCal sync too soon, next in ' + minsLeft + ' min');
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
          fsn.success('iCal Sync', '✅ ' + totalCreated + ' new bookings imported');
        }
      } else {
        console.log('✅ iCal auto-sync: no new bookings');
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
    if (!['owner', 'admin', 'developer'].includes(window.SESSION?.role)) {
      console.log('⏭️ iCal auto-sync: not authorized for role');
      return;
    }
    
    console.log('🔄 iCal auto-sync scheduler started (every 5 minutes)');
    
    // Run once after 30 seconds (initial delay)
    setTimeout(() => this.runSilent(), 30000);
    
    // Then every 5 minutes
    this.timer = setInterval(() => this.runSilent(), this.INTERVAL_MS);
  },
  
  enable() {
    localStorage.setItem('ical_auto_sync_enabled', 'true');
    this.start();
    if (window.fsn?.success) fsn.success('Auto-Sync', '✅ Enabled — runs every 5 minutes');
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
