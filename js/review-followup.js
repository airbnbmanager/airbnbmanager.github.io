/**
 * ═══════════════════════════════════════════════════════════════════
 *  THE UNIQUE HAVEN HOMES — Airbnb Review & Call Follow-up Radar
 *  Real-Time 14-Day Post-Checkout Review Tracking & Call Logs Engine
 * ═══════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // 17 Property Airbnb Listing IDs
  const AIRBNB_LISTING_MAP = {
    'GOM-101': '1654261872286835347',
    'GOM-102': '1676840617430941240',
    'GOM-201': '1655969170448425308',
    'GOM-202': '1660898784168880636',
    'GOM-301': '1679155811558485410',
    'GOM-401': '1723434530455939144',
    'GOM-501': '1718385679817913835',
    'GOM-302': '1679190202218939181',
    'VIL-104': '1593461780265937816',
    'VIL-103': '1592729438969718723',
    'VIL-105': '1592729918855637425',
    'VIL-106': '1739254108962193705',
    'VIL-108': '1756799939825259443',
    'LUL-402': '1606514664948608755',
    'VIL-101': '1721732716374002170',
    'VIL-102': '1718315215180636685',
    'VIL-107': '1727830063287100082'
  };

  window._reviewFollowupState = {
    filterTab: 'active', // active | urgent | needs_call | promised | retry | received | expired
    propertyFilter: 'all',
    searchQuery: '',
    cachedMap: null
  };

  // ── HELPER: GET AIRBNB REVIEW LINK ──────────────────────────────
  window.getAirbnbReviewLink = function(roomId) {
    const abId = AIRBNB_LISTING_MAP[roomId];
    if (abId) {
      return `https://www.airbnb.co.in/rooms/${abId}`;
    }
    return 'https://www.airbnb.co.in/users/reviews';
  };

  // ── STORAGE: FETCH & SYNC REVIEW FOLLOWUP DATA ─────────────────
  window.fetchReviewFollowupMap = async function() {
    if (window._reviewFollowupState.cachedMap) {
      return window._reviewFollowupState.cachedMap;
    }

    let map = {};
    // 1. Try localStorage
    try {
      const local = localStorage.getItem('uh_airbnb_review_followups');
      if (local) map = JSON.parse(local);
    } catch(e) {}

    // 2. Try Supabase app_settings
    try {
      if (window.sb) {
        const { data } = await sb.from('app_settings').select('value').eq('key', 'airbnb_review_followups').single();
        if (data && data.value) {
          const remote = JSON.parse(data.value);
          map = { ...map, ...remote };
        }
      }
    } catch(e) {}

    window._reviewFollowupState.cachedMap = map;
    return map;
  };

  window.saveReviewFollowupRecord = async function(bookingId, updateObj) {
    if (!bookingId) return;
    const map = await window.fetchReviewFollowupMap();
    const existing = map[bookingId] || {
      status: 'pending',
      callLogs: [],
      rating: null,
      notes: '',
      lastCallAt: null,
      callerName: null,
      whatsappSentAt: null,
      reviewReceivedAt: null
    };

    const updated = {
      ...existing,
      ...updateObj,
      updatedAt: new Date().toISOString()
    };

    if (updateObj.newCallLog) {
      updated.callLogs = updated.callLogs || [];
      updated.callLogs.unshift(updateObj.newCallLog);
    }

    map[bookingId] = updated;
    window._reviewFollowupState.cachedMap = map;

    // Save locally
    try {
      localStorage.setItem('uh_airbnb_review_followups', JSON.stringify(map));
    } catch(e) {}

    // Sync to Supabase app_settings
    try {
      if (window.sb) {
        await sb.from('app_settings').upsert({
          key: 'airbnb_review_followups',
          value: JSON.stringify(map),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        // If rating was provided, also sync to guest_register
        if (updateObj.rating) {
          await sb.from('guest_register').update({
            client_rating: updateObj.rating,
            rating_notes: updateObj.notes || 'Recorded via Review Radar',
            rated_at: new Date().toISOString(),
            rated_by: SESSION?.displayName || 'Admin'
          }).eq('booking_id', bookingId);
        }
      }
    } catch(e) {}

    return updated;
  };

  // ── 14-DAY REVIEW WINDOW MATH ───────────────────────────────────
  function getReviewWindowInfo(checkOutStr) {
    if (!checkOutStr) return { daysPassed: 0, daysRemaining: 0, isExpired: false, isUrgent: false, label: '-' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const coDate = new Date(checkOutStr);
    coDate.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - coDate.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysRemaining = 14 - daysPassed;

    if (daysPassed < 0) {
      return {
        daysPassed,
        daysRemaining: 14,
        isFuture: true,
        isExpired: false,
        isUrgent: false,
        label: `Checkout in ${Math.abs(daysPassed)} day(s)`,
        badgeClass: 'gray'
      };
    }

    if (daysRemaining <= 0) {
      return {
        daysPassed,
        daysRemaining: 0,
        isExpired: true,
        isUrgent: false,
        label: '⏱️ Window Expired (14+ Days)',
        badgeClass: 'gray'
      };
    }

    if (daysRemaining <= 3) {
      return {
        daysPassed,
        daysRemaining,
        isExpired: false,
        isUrgent: true,
        label: `🚨 URGENT: ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Left`,
        badgeClass: 'red'
      };
    }

    if (daysRemaining <= 7) {
      return {
        daysPassed,
        daysRemaining,
        isExpired: false,
        isUrgent: false,
        label: `⏳ ${daysRemaining} Days Left`,
        badgeClass: 'yellow'
      };
    }

    return {
      daysPassed,
      daysRemaining,
      isExpired: false,
      isUrgent: false,
      label: `🟢 ${daysRemaining} Days Left (Fresh)`,
      badgeClass: 'green'
    };
  }

  // ── STATUS BADGE HELPER ─────────────────────────────────────────
  function getFollowupStatusBadge(status, winInfo) {
    if (status === 'review_received') {
      return `<span class="badge green" style="font-weight:700;">⭐ Review Received</span>`;
    }
    if (status === 'called_promised') {
      return `<span class="badge" style="background:#DBEAFE;color:#1E40AF;border:1px solid #93C5FD;font-weight:700;">📞 Promised 5-Star</span>`;
    }
    if (status === 'called_busy') {
      return `<span class="badge yellow" style="font-weight:700;">🟡 Not Picked / Busy</span>`;
    }
    if (status === 'called_issue') {
      return `<span class="badge red" style="font-weight:700;">🔴 Had Issue / Resolved</span>`;
    }
    if (status === 'whatsapp_sent') {
      return `<span class="badge" style="background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;font-weight:700;">💬 WhatsApp Sent</span>`;
    }
    if (status === 'not_interested') {
      return `<span class="badge gray">⚪ Declined Review</span>`;
    }
    if (winInfo.isExpired) {
      return `<span class="badge gray">⏱️ Expired Window</span>`;
    }
    return `<span class="badge yellow" style="font-weight:700;">⏳ Needs Follow-up</span>`;
  }

  // ── 1-CLICK WHATSAPP REVIEW REQUEST ─────────────────────────────
  window.sendReviewFollowupWhatsApp = async function(bookingId, guestName, phone, roomId, propName) {
    if (!phone) {
      alert('Guest phone number not available.');
      return;
    }

    const reviewLink = window.getAirbnbReviewLink(roomId);
    const cleanPhone = String(phone).replace(/[^\d]/g, '');
    const intlPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const pName = propName || 'The Unique Haven Homes';

    const msg = `Namaste ${guestName || 'Guest'} ji! 🙏✨\n\nThank you for choosing *${pName}* (The Unique Haven Homes) for your recent stay! We hope you and your companions had a truly memorable and 5-star experience. 🌸\n\nAgar aapko hamari hospitality aur service pasand aayi, to kripya 1 minute nikal kar Airbnb par apna *5-Star Review* zaroor share karein. Aapka review hamari poori hosting team ke liye bohot anmol hai! ⭐⭐⭐⭐⭐\n\n👉 *Click here to leave your review:* \n${reviewLink}\n\nLooking forward to hosting you again soon!\nWarm Regards,\n*The Unique Haven Homes Private Limited*\n📞 Support: +91 9194109911`;

    const waUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // Auto update status to whatsapp_sent if still pending
    await window.saveReviewFollowupRecord(bookingId, {
      status: 'whatsapp_sent',
      whatsappSentAt: new Date().toISOString(),
      newCallLog: {
        timestamp: new Date().toISOString(),
        caller: SESSION?.displayName || 'Staff',
        action: 'whatsapp_sent',
        notes: 'Sent 5-Star Review Request via WhatsApp'
      }
    });

    if (window.fsn) fsn.success('WhatsApp Sent', 'Review request WhatsApp link opened & logged!');
    if (SESSION?.currentPage === 'reviews-followup') renderReviewFollowupHub();
  };

  // ── CALL LOG MODAL ──────────────────────────────────────────────
  window.openReviewCallLogModal = async function(bookingId) {
    const { data: b } = await sb.from('guest_register')
      .select('*, rooms(unit_no, nickname, property_name)')
      .eq('booking_id', bookingId)
      .single();

    if (!b) { alert('Booking not found'); return; }

    const map = await window.fetchReviewFollowupMap();
    const rec = map[bookingId] || {};
    const winInfo = getReviewWindowInfo(b.check_out);
    const pLabel = (typeof propLabel === 'function') ? propLabel(b.rooms) : (b.room_id || '');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:520px;padding:24px;border-radius:16px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="width:40px;height:40px;border-radius:10px;background:#EDE9FE;color:#6D28D9;display:flex;align-items:center;justify-content:center;font-size:20px;">
            📞
          </div>
          <div>
            <h2 style="margin:0;font-size:18px;color:#111827;">Log Follow-up Call & Review Status</h2>
            <div style="font-size:12px;color:#6B7280;margin-top:2px;">
              ${escapeHtml(b.guest_name || 'Guest')} &bull; ${escapeHtml(pLabel)}
            </div>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px;">
          <div>
            <span style="color:#64748B;">Guest Phone:</span><br>
            <strong><a href="tel:${b.phone || ''}" style="color:#2563EB;text-decoration:none;">📞 ${b.phone || 'No phone'}</a></strong>
          </div>
          <div>
            <span style="color:#64748B;">Checkout Date:</span><br>
            <strong>${b.check_out || '-'}</strong>
          </div>
          <div>
            <span style="color:#64748B;">14-Day Window:</span><br>
            <strong style="color:${winInfo.isUrgent ? '#DC2626' : '#059669'};">${winInfo.label}</strong>
          </div>
          <div>
            <span style="color:#64748B;">Platform Channel:</span><br>
            <span class="channel-badge ${(window.getBookingSource ? window.getBookingSource(b).badgeClass : 'channel-airbnb')}">
              ${window.getBookingSource ? window.getBookingSource(b).badge : (b.airbnb_confirmation_code || 'Online OTA')}
            </span>
          </div>
        </div>

        <form id="callLogForm" onsubmit="event.preventDefault(); submitCallLog('${bookingId}');">
          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#374151;">
              Call Outcome / Status *
            </label>
            <select id="callOutcomeSel" style="width:100%;padding:9px;border:1px solid #D1D5DB;border-radius:8px;font-size:13.5px;background:#fff;" required>
              <option value="called_promised" ${rec.status === 'called_promised' ? 'selected' : ''}>🟢 Call Done — Promised 5-Star Review</option>
              <option value="called_busy" ${rec.status === 'called_busy' ? 'selected' : ''}>🟡 Call Busy / Not Picked (Followup Tomorrow)</option>
              <option value="called_issue" ${rec.status === 'called_issue' ? 'selected' : ''}>🔴 Had Service Issues (Resolved / Needs Action)</option>
              <option value="review_received" ${rec.status === 'review_received' ? 'selected' : ''}>⭐ Review Received on Airbnb (Verified)</option>
              <option value="whatsapp_sent" ${rec.status === 'whatsapp_sent' ? 'selected' : ''}>💬 WhatsApp Request Sent</option>
              <option value="not_interested" ${rec.status === 'not_interested' ? 'selected' : ''}>⚪ Guest Declined / Not Interested</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#374151;">
              Rating Expected / Given (1 - 5 Stars)
            </label>
            <select id="callRatingSel" style="width:100%;padding:9px;border:1px solid #D1D5DB;border-radius:8px;font-size:13.5px;background:#fff;">
              <option value="">-- No rating specified --</option>
              <option value="5" ${rec.rating === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ 5 Stars (Delighted / Superhost)</option>
              <option value="4" ${rec.rating === 4 ? 'selected' : ''}>⭐⭐⭐⭐ 4 Stars (Good)</option>
              <option value="3" ${rec.rating === 3 ? 'selected' : ''}>⭐⭐⭐ 3 Stars (Average)</option>
              <option value="2" ${rec.rating === 2 ? 'selected' : ''}>⭐⭐ 2 Stars (Poor)</option>
              <option value="1" ${rec.rating === 1 ? 'selected' : ''}>⭐ 1 Star (Critical)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#374151;">
              Call Notes & Feedback Details
            </label>
            <textarea id="callNotesInput" rows="3" placeholder="e.g. Spoke with guest, they loved the balcony view. Promised to leave 5 stars tonight..."
              style="width:100%;padding:9px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;box-sizing:border-box;">${escapeHtml(rec.notes || '')}</textarea>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#374151;">
              Caller Staff Name
            </label>
            <input type="text" id="callerNameInput" value="${escapeHtml(SESSION?.displayName || 'Staff')}"
              style="width:100%;padding:8px 10px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;box-sizing:border-box;" />
          </div>

          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn-sm" style="flex:1;background:#059669;color:#fff;border:none;padding:11px;font-weight:700;border-radius:8px;cursor:pointer;font-size:14px;">
              💾 Save Call Log &amp; Update
            </button>
            <button type="button" class="btn-sm outline" onclick="this.closest('.modal-overlay').remove()" style="padding:11px 16px;">
              Cancel
            </button>
          </div>
        </form>

        <!-- Previous Call History -->
        ${(rec.callLogs && rec.callLogs.length > 0) ? `
          <div style="margin-top:18px;padding-top:14px;border-top:1px solid #E5E7EB;">
            <div style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:8px;">
              📜 Call &amp; Follow-up History (${rec.callLogs.length})
            </div>
            <div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
              ${rec.callLogs.map(l => `
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:8px 10px;font-size:12px;">
                  <div style="display:flex;justify-content:space-between;color:#6B7280;">
                    <strong>${escapeHtml(l.caller || 'Staff')} &bull; ${escapeHtml(l.action || l.outcome || '')}</strong>
                    <span>${l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : '-'}</span>
                  </div>
                  ${l.notes ? `<div style="color:#374151;margin-top:4px;">${escapeHtml(l.notes)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);
  };

  window.submitCallLog = async function(bookingId) {
    const outcome = document.getElementById('callOutcomeSel').value;
    const ratingVal = document.getElementById('callRatingSel').value;
    const notes = document.getElementById('callNotesInput').value.trim();
    const caller = document.getElementById('callerNameInput').value.trim() || SESSION?.displayName || 'Staff';
    const rating = ratingVal ? parseInt(ratingVal) : null;

    await window.saveReviewFollowupRecord(bookingId, {
      status: outcome,
      rating,
      notes,
      callerName: caller,
      lastCallAt: new Date().toISOString(),
      newCallLog: {
        timestamp: new Date().toISOString(),
        caller,
        outcome,
        rating,
        notes
      }
    });

    document.querySelector('.modal-overlay')?.remove();
    if (window.fsn) fsn.success('Logged', '✅ Call record saved & status updated live!');
    if (SESSION?.currentPage === 'reviews-followup') renderReviewFollowupHub();
  };

  // ── QUICK TOGGLE REVIEW RECEIVED ────────────────────────────────
  window.markReviewReceived = async function(bookingId, guestName) {
    if (!confirm(`Mark review as RECEIVED for "${guestName}"?`)) return;

    await window.saveReviewFollowupRecord(bookingId, {
      status: 'review_received',
      reviewReceivedAt: new Date().toISOString(),
      newCallLog: {
        timestamp: new Date().toISOString(),
        caller: SESSION?.displayName || 'Admin',
        action: 'review_received',
        notes: 'Review confirmed and verified on Airbnb'
      }
    });

    if (window.fsn) fsn.success('Verified', '⭐ Review marked as received!');
    if (SESSION?.currentPage === 'reviews-followup') renderReviewFollowupHub();
  };

  // ═════════════════════════════════════════════════════════════════
  // MAIN BOARD: RENDER AIRBNB REVIEW & CALL FOLLOW-UP RADAR
  // ═════════════════════════════════════════════════════════════════
  window.renderReviewFollowupHub = async function() {
    renderShell(`<div class="loading">Loading Airbnb Review & Call Follow-up Radar...</div>`, 'reviews-followup');

    // Fetch checkout bookings from last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [{ data: bks }, { data: allRooms }, followupMap] = await Promise.all([
      sb.from('guest_register')
        .select('booking_id, guest_name, phone, room_id, check_in, check_out, booking_mode, total_amount, airbnb_confirmation_code, client_rating, is_cancelled, rooms(nickname, unit_no, property_name)')
        .gte('check_out', thirtyDaysAgo)
        .order('check_out', { ascending: false }),
      sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
      window.fetchReviewFollowupMap()
    ]);

    window._reviewFollowupState = window._reviewFollowupState || { filterTab: 'active', propertyFilter: 'all', channelFilter: 'all_online', searchQuery: '' };

    // Strictly keep records for Online bookings (Airbnb and Booking.com) as requested
    const bookings = (bks || []).filter(b => {
      if (b.is_cancelled) return false;
      const src = window.getBookingSource ? window.getBookingSource(b) : null;
      return src ? src.isOnline : (b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code);
    });
    const rooms = allRooms || [];

    // Calculate metrics
    let totalEligible = 0;
    let reviewsReceivedCount = 0;
    let calledPromisedCount = 0;
    let urgentCount = 0;
    let needsCallCount = 0;
    let airbnbCount = 0;
    let bookingComCount = 0;

    bookings.forEach(b => {
      const src = window.getBookingSource ? window.getBookingSource(b) : null;
      if (src && src.type === 'booking_com') bookingComCount++;
      else airbnbCount++;

      const win = getReviewWindowInfo(b.check_out);
      const rec = followupMap[b.booking_id] || {};
      const status = rec.status || (b.client_rating >= 4 ? 'review_received' : 'pending');

      if (!win.isFuture && !win.isExpired) {
        totalEligible++;
        if (status === 'review_received') reviewsReceivedCount++;
        else if (status === 'called_promised') calledPromisedCount++;
        else if (win.isUrgent) urgentCount++;
        else if (status === 'pending') needsCallCount++;
      }
    });

    const activeFilterTab = window._reviewFollowupState.filterTab || 'active';
    const activePropFilter = window._reviewFollowupState.propertyFilter || 'all';
    const activeChannelFilter = window._reviewFollowupState.channelFilter || 'all_online';
    const sq = (window._reviewFollowupState.searchQuery || '').toLowerCase().trim();

    // Apply filtering
    let filtered = bookings.filter(b => {
      const src = window.getBookingSource ? window.getBookingSource(b) : null;
      const win = getReviewWindowInfo(b.check_out);
      const rec = followupMap[b.booking_id] || {};
      const status = rec.status || (b.client_rating >= 4 ? 'review_received' : 'pending');

      // Channel Filter (Airbnb vs Booking.com vs All Online)
      if (activeChannelFilter === 'airbnb' && src && src.type !== 'airbnb') return false;
      if (activeChannelFilter === 'booking_com' && src && src.type !== 'booking_com') return false;

      // Property filter
      if (activePropFilter !== 'all' && b.room_id !== activePropFilter) return false;

      // Tab filter
      if (activeFilterTab === 'active') return !win.isFuture && !win.isExpired;
      if (activeFilterTab === 'urgent') return win.isUrgent && status !== 'review_received';
      if (activeFilterTab === 'needs_call') return (!rec.lastCallAt && status === 'pending' && !win.isExpired);
      if (activeFilterTab === 'promised') return status === 'called_promised';
      if (activeFilterTab === 'retry') return status === 'called_busy';
      if (activeFilterTab === 'received') return status === 'review_received';
      if (activeFilterTab === 'expired') return win.isExpired && status !== 'review_received';
      return true;
    });

    if (sq) {
      filtered = filtered.filter(b => {
        const name = (b.guest_name || '').toLowerCase();
        const ph = (b.phone || '').toLowerCase();
        const code = (b.airbnb_confirmation_code || '').toLowerCase();
        const rm = (b.room_id || '').toLowerCase();
        return name.includes(sq) || ph.includes(sq) || code.includes(sq) || rm.includes(sq);
      });
    }

    renderShell(`
      <!-- HEADER -->
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
        <div>
          <h1 style="margin:0;font-size:22px;display:flex;align-items:center;gap:8px;">
            <span>⭐ Online Reviews &amp; Call Follow-up Radar</span>
          </h1>
          <div class="sub" style="margin:4px 0 0;">
            Real-time 14-day post-checkout review tracking, guest call logs &amp; 1-click WhatsApp review reminders for Online Guests.
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button class="btn-sm" onclick="window.openGmailReviewSyncModal()" style="background:#0F172A;color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:6px;border:none;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#EA4335"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <span>Gmail Auto-Sync</span>
          </button>
          <button class="btn-sm outline" onclick="renderReviewFollowupHub()">
            🔁 Refresh Radar
          </button>
          <button class="btn-sm" onclick="navigate('bookings')" style="background:#F3F4F6;color:#374151;border:1px solid #D1D5DB;">
            ← Stay &amp; Bookings
          </button>
        </div>
      </div>

      <!-- ONLINE OTA MODE BANNER WITH FILTER PILLS -->
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:12px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="font-size:13px;color:#9F1239;font-weight:600;display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">🌐</span>
          <span><strong>Online OTA Review Mode</strong>: Keeping records exclusively for online guest reviews (Airbnb &amp; Booking.com). Offline/direct stays are excluded.</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="btn-sm" onclick="window._reviewFollowupState.channelFilter='all_online';renderReviewFollowupHub();"
            style="${activeChannelFilter === 'all_online' ? 'background:#0F172A;color:#fff;' : 'background:#fff;color:#0F172A;border:1px solid #CBD5E1;'}font-weight:700;padding:6px 12px;border-radius:8px;">
            All Online (${bookings.length})
          </button>
          <button type="button" class="btn-sm" onclick="window._reviewFollowupState.channelFilter='airbnb';renderReviewFollowupHub();"
            style="${activeChannelFilter === 'airbnb' ? 'background:#FF385C;color:#fff;' : 'background:#fff;color:#E11D48;border:1px solid #FECDD3;'}font-weight:700;padding:6px 12px;border-radius:8px;">
            🌐 Airbnb (${airbnbCount})
          </button>
          <button type="button" class="btn-sm" onclick="window._reviewFollowupState.channelFilter='booking_com';renderReviewFollowupHub();"
            style="${activeChannelFilter === 'booking_com' ? 'background:#003580;color:#fff;' : 'background:#fff;color:#003580;border:1px solid #BFDBFE;'}font-weight:700;padding:6px 12px;border-radius:8px;">
            🏨 Booking.com (${bookingComCount})
          </button>
        </div>
      </div>

      <!-- KPI METRIC RIBBON -->
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-bottom:14px;">
        <div class="stat-card" onclick="setReviewTab('active')" style="cursor:pointer;border-left:4px solid #3B82F6;${activeFilterTab === 'active' ? 'background:#EFF6FF;box-shadow:0 0 0 2px #3B82F6;' : ''}">
          <div class="stat-num" style="color:#1D4ED8;">${totalEligible}</div>
          <div class="stat-label">🎯 Active in 14-Day Window</div>
        </div>
        <div class="stat-card" onclick="setReviewTab('received')" style="cursor:pointer;border-left:4px solid #10B981;${activeFilterTab === 'received' ? 'background:#ECFDF5;box-shadow:0 0 0 2px #10B981;' : ''}">
          <div class="stat-num" style="color:#047857;">${reviewsReceivedCount}</div>
          <div class="stat-label">⭐ Reviews Received</div>
        </div>
        <div class="stat-card" onclick="setReviewTab('promised')" style="cursor:pointer;border-left:4px solid #6366F1;${activeFilterTab === 'promised' ? 'background:#EEF2FF;box-shadow:0 0 0 2px #6366F1;' : ''}">
          <div class="stat-num" style="color:#4338CA;">${calledPromisedCount}</div>
          <div class="stat-label">📞 Call Done &amp; Promised</div>
        </div>
        <div class="stat-card" onclick="setReviewTab('urgent')" style="cursor:pointer;border-left:4px solid #EF4444;${activeFilterTab === 'urgent' ? 'background:#FEF2F2;box-shadow:0 0 0 2px #EF4444;' : ''}">
          <div class="stat-num" style="color:#B91C1C;${urgentCount > 0 ? 'animation:pulse 2s infinite;' : ''}">${urgentCount}</div>
          <div class="stat-label">🚨 Urgent (1-3 Days Left!)</div>
        </div>
        <div class="stat-card" onclick="setReviewTab('needs_call')" style="cursor:pointer;border-left:4px solid #F59E0B;${activeFilterTab === 'needs_call' ? 'background:#FFFBEB;box-shadow:0 0 0 2px #F59E0B;' : ''}">
          <div class="stat-num" style="color:#B45309;">${needsCallCount}</div>
          <div class="stat-label">⏳ Needs First Call / WA</div>
        </div>
      </div>

      <!-- FILTER CONTROLS & SEARCH -->
      <div class="card" style="margin-bottom:14px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <!-- Pill Filters -->
          <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;">
            <button type="button" class="btn-sm" onclick="setReviewTab('active')" style="${activeFilterTab === 'active' ? 'background:var(--primary);color:#fff;' : 'background:#F3F4F6;color:#374151;border:none;'}">14-Day Active</button>
            <button type="button" class="btn-sm" onclick="setReviewTab('urgent')" style="${activeFilterTab === 'urgent' ? 'background:#DC2626;color:#fff;' : 'background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;'}">🚨 Urgent (${urgentCount})</button>
            <button type="button" class="btn-sm" onclick="setReviewTab('needs_call')" style="${activeFilterTab === 'needs_call' ? 'background:#F59E0B;color:#fff;' : 'background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;'}">⏳ Needs Call</button>
            <button type="button" class="btn-sm" onclick="setReviewTab('promised')" style="${activeFilterTab === 'promised' ? 'background:var(--primary);color:#fff;' : 'background:#F3F4F6;color:#374151;border:none;'}">📞 Promised 5★</button>
            <button type="button" class="btn-sm" onclick="setReviewTab('retry')" style="${activeFilterTab === 'retry' ? 'background:var(--primary);color:#fff;' : 'background:#F3F4F6;color:#374151;border:none;'}">🟡 Busy / Retry</button>
            <button type="button" class="btn-sm" onclick="setReviewTab('received')" style="${activeFilterTab === 'received' ? 'background:#059669;color:#fff;' : 'background:#ECFDF5;color:#047857;border:1px solid #6EE7B7;'}">⭐ Received</button>
            <button type="button" class="btn-sm" onclick="setReviewTab('expired')" style="${activeFilterTab === 'expired' ? 'background:var(--primary);color:#fff;' : 'background:#F3F4F6;color:#374151;border:none;'}">⏱️ Expired</button>
          </div>

          <!-- Property & Search Input -->
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select onchange="window._reviewFollowupState.propertyFilter = this.value; renderReviewFollowupHub();"
              style="padding:7px 10px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;background:#fff;">
              <option value="all">🏢 All Properties</option>
              ${rooms.map(r => `
                <option value="${r.room_id}" ${activePropFilter === r.room_id ? 'selected' : ''}>${r.nickname || r.room_id} (${r.unit_no || ''})</option>
              `).join('')}
            </select>

            <div style="position:relative;min-width:180px;">
              <input type="text" value="${sq}" placeholder="🔍 Search guest, phone, code..."
                oninput="window._reviewFollowupState.searchQuery = this.value; renderReviewFollowupHub();"
                style="width:100%;padding:7px 10px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;box-sizing:border-box;" />
              ${sq ? `<span onclick="window._reviewFollowupState.searchQuery='';renderReviewFollowupHub();" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#999;font-weight:bold;">✕</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- RADAR LIST TABLE & CARDS -->
      ${filtered.length === 0 ? `
        <div class="card" style="text-align:center;padding:48px 20px;color:var(--muted);">
          <div style="font-size:42px;margin-bottom:8px;">⭐</div>
          <div style="font-size:16px;font-weight:700;color:#374151;">No online guest follow-ups found in this view</div>
          <div style="font-size:13px;margin-top:4px;">Try switching channel filters (Airbnb/Booking.com) or selecting All Properties.</div>
        </div>
      ` : `
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Online Guest / Channel</th>
                  <th>Checkout Date</th>
                  <th>14-Day Review Window</th>
                  <th>Follow-up Status</th>
                  <th>Last Call Log</th>
                  <th style="text-align:right;">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(b => {
                  const win = getReviewWindowInfo(b.check_out);
                  const rec = followupMap[b.booking_id] || {};
                  const status = rec.status || (b.client_rating >= 4 ? 'review_received' : 'pending');
                  const pLabel = (typeof propLabel === 'function') ? propLabel(b.rooms) : (b.room_id || '');
                  const src = window.getBookingSource ? window.getBookingSource(b) : { badge: 'Online', badgeClass: 'channel-airbnb', bgColor: '#FFF1F2', color: '#FF385C', borderColor: '#FECDD3' };

                  return `
                    <tr style="${win.isUrgent && status !== 'review_received' ? 'background:#FEF2F2;' : ''}">
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          <div style="width:34px;height:34px;border-radius:50%;background:${src.bgColor};color:${src.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:1px solid ${src.borderColor};flex-shrink:0;">
                            ${(b.guest_name || 'G').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style="font-weight:700;font-size:14px;color:#111827;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                              <span>${escapeHtml(b.guest_name || 'Guest')}</span>
                              <span class="channel-badge ${src.badgeClass}" style="font-size:10.5px;padding:2px 8px;">
                                ${src.badge}
                              </span>
                            </div>
                            <div style="font-size:12px;color:#6B7280;margin-top:2px;">
                              🏠 ${escapeHtml(pLabel)} &bull; 📞 ${escapeHtml(b.phone || 'No phone')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style="font-weight:700;font-size:13px;color:#374151;">${b.check_out || '-'}</div>
                        <div style="font-size:11px;color:#9CA3AF;">In: ${b.check_in || '-'}</div>
                      </td>
                      <td>
                        <span class="badge ${win.badgeClass}" style="font-size:11.5px;font-weight:700;">
                          ${win.label}
                        </span>
                      </td>
                      <td>
                        ${getFollowupStatusBadge(status, win)}
                        ${rec.rating ? ` <span style="font-size:11px;color:#B45309;font-weight:700;">${'⭐'.repeat(rec.rating)}</span>` : ''}
                      </td>
                      <td>
                        ${rec.lastCallAt ? `
                          <div style="font-size:12px;font-weight:600;color:#111827;">
                            ${escapeHtml(rec.callerName || 'Staff')}
                          </div>
                          <div style="font-size:11px;color:#6B7280;">
                            ${new Date(rec.lastCallAt).toLocaleDateString('en-IN', { month:'short', day:'numeric' })} &bull; ${escapeHtml(rec.notes ? rec.notes.slice(0, 30) + '...' : 'No notes')}
                          </div>
                        ` : `
                          <span style="font-size:11px;color:#9CA3AF;">No calls logged yet</span>
                        `}
                      </td>
                      <td class="table-actions" style="text-align:right;white-space:nowrap;">
                        <div style="display:inline-flex;gap:5px;align-items:center;justify-content:flex-end;">
                          ${b.phone ? `
                            <a href="tel:${b.phone}" class="btn-sm" onclick="window.openReviewCallLogModal('${b.booking_id}')"
                              style="background:#2563EB;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:5px 8px;font-size:11.5px;font-weight:700;border-radius:6px;" title="Call Guest">
                              📞 Call
                            </a>
                            <button class="btn-sm" onclick="window.sendReviewFollowupWhatsApp('${b.booking_id}', '${escapeHtml(b.guest_name||'')}', '${b.phone}', '${b.room_id}', '${escapeHtml(pLabel)}')"
                              style="background:#25D366;color:#fff;font-weight:700;border:none;padding:5px 8px;font-size:11.5px;border-radius:6px;" title="Send WhatsApp Review Request Link">
                              💬 WA
                            </button>
                          ` : ''}
                          <button class="btn-sm" onclick="window.openReviewCallLogModal('${b.booking_id}')" 
                            style="background:#F3F4F6;color:#374151;border:1px solid #D1D5DB;font-weight:600;padding:5px 8px;font-size:11.5px;border-radius:6px;" title="Log Call Outcome">
                            📝 Log
                          </button>
                          ${status !== 'review_received' ? `
                            <button class="btn-sm" onclick="window.markReviewReceived('${b.booking_id}', '${escapeHtml(b.guest_name||'')}')" 
                              style="background:#10B981;color:#fff;border:none;font-weight:700;padding:5px 8px;font-size:11.5px;border-radius:6px;" title="Confirm Review Received">
                              ⭐ Received
                            </button>
                          ` : ''}
                          <button class="btn-sm" onclick="if(window.openBookingDrawer) window.openBookingDrawer('${b.booking_id}');" 
                            style="background:#0F172A;color:#fff;border:none;padding:5px 7px;font-size:11.5px;border-radius:6px;" title="View Booking Details Drawer">
                            📋
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `, 'reviews-followup');
  };

  window.openGmailReviewSyncModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:580px;padding:24px;border-radius:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h2 style="margin:0;font-size:18px;display:flex;align-items:center;gap:8px;">
            <span>📧 Gmail Airbnb Review Auto-Sync</span>
          </h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>

        <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:12px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;color:#166534;line-height:1.6;">
          <strong>⚡ 24/7 Gmail Auto-Sync is Active:</strong><br>
          Airbnb aapke Gmail (<code>theuniquehavenhomes@gmail.com</code>) par <em>"[Guest Name] wrote you a review"</em> email bhejta hai. Hamara Google Apps Script background me chal kar guest ko CRM me match karta hai aur yahan <strong>⭐ Review Received</strong> auto-mark kar deta hai!
        </div>

        <div style="border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:16px;background:#F8FAFC;">
          <label style="display:block;font-size:13px;font-weight:700;color:#1E293B;margin-bottom:6px;">
            📥 Instant Email Paste &amp; Verify (Test Matcher)
          </label>
          <div style="font-size:12px;color:#64748B;margin-bottom:8px;">
            Email Subject (e.g. <em>"Sparsh wrote you a review"</em>) ya Confirmation Code (e.g. <em>"HMKADZT8JQ"</em>) paste karein:
          </div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="gmailReviewInput" placeholder="e.g. Sparsh wrote you a review OR HMKADZT8JQ"
              style="flex:1;padding:9px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;" />
            <button type="button" class="btn-sm" onclick="matchPastedReviewEmail()"
              style="background:#10B981;color:#fff;font-weight:700;padding:9px 14px;border:none;border-radius:8px;cursor:pointer;">
              ⚡ Verify Review
            </button>
          </div>
          <div id="gmailMatchResult" style="margin-top:8px;font-size:12.5px;font-weight:600;"></div>
        </div>

        <div style="background:#FFFBEB;border:1px solid #FDE68A;padding:10px 14px;border-radius:10px;font-size:12px;color:#92400E;line-height:1.5;">
          <strong>Tip:</strong> Apps Script me <code>syncAirbnbReviewsFromGmail()</code> function shamil ho chuka hai jo har 10 minute me Gmail scan karke review received ko auto-update karta hai.
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    window.matchPastedReviewEmail = async function() {
      const val = (document.getElementById('gmailReviewInput')?.value || '').trim();
      const resEl = document.getElementById('gmailMatchResult');
      if (!val) {
        if (resEl) resEl.innerHTML = '<span style="color:#DC2626;">⚠️ Please enter email subject or confirmation code.</span>';
        return;
      }

      // Extract HM code or first name
      const codeMatch = val.match(/\b(HM[A-Z0-9]{8,12})\b/i);
      const confCode = codeMatch ? codeMatch[1].toUpperCase() : null;

      let guestName = null;
      const subMatch1 = val.match(/^([A-Za-z\s]+?)\s+wrote\s+(you\s+)?a\s+review/i);
      const subMatch2 = val.match(/^Read\s+([A-Za-z\s]+?)'s\s+review/i);
      const subMatch3 = val.match(/^New\s+review\s+from\s+([A-Za-z\s]+)/i);
      if (subMatch1) guestName = subMatch1[1].trim();
      else if (subMatch2) guestName = subMatch2[1].trim();
      else if (subMatch3) guestName = subMatch3[1].trim();
      else if (!confCode) guestName = val.split(' ')[0].trim();

      const { data: bks } = await sb.from('guest_register')
        .select('booking_id, guest_name, airbnb_confirmation_code, check_out')
        .order('check_out', { ascending: false })
        .limit(100);

      let matched = null;
      if (confCode) {
        matched = (bks || []).find(b => (b.airbnb_confirmation_code || '').toUpperCase() === confCode);
      }
      if (!matched && guestName) {
        const cleanTarget = guestName.toLowerCase();
        matched = (bks || []).find(b => (b.guest_name || '').toLowerCase().includes(cleanTarget));
      }

      if (matched) {
        if (resEl) resEl.innerHTML = `<span style="color:#059669;">✅ Matched: <strong>${escapeHtml(matched.guest_name)}</strong> (${matched.airbnb_confirmation_code || matched.booking_id})! Marking review received...</span>`;
        await window.markReviewReceived(matched.booking_id, matched.guest_name);
        setTimeout(() => {
          modal.remove();
          renderReviewFollowupHub();
        }, 1200);
      } else {
        if (resEl) resEl.innerHTML = `<span style="color:#DC2626;">❌ No recent booking matched for "${val}". Please check name or code.</span>`;
      }
    };
  };

})();
