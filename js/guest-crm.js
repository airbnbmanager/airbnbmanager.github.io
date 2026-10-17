/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES (UHHS) — GUEST CRM & CLIENT PROFILES
 * Inspired by Luxury Hospitality & Enterprise Salon CRM Systems
 * Safe & Read-Only aggregation over guest_register & payment_history
 * =====================================================================
 */

window._guestCRMState = {
  activeTab: 'all',          // 'all', 'platinum', 'gold', 'silver', 'bronze', 'due', 'inhouse'
  searchQuery: '',
  propertyFilter: '',
  sortBy: 'stays_desc',      // 'stays_desc', 'spend_desc', 'recent', 'due_desc', 'name_asc'
  cachedGuests: [],
  isLoading: false
};

/**
 * Aggregate guest profiles from guest_register and payment_history.
 * No data is modified or deleted.
 */
window.fetchGuestCRMData = async function() {
  window._guestCRMState.isLoading = true;
  try {
    const [{ data: bookings, error: bErr }, { data: payments, error: pErr }, { data: rooms }] = await Promise.all([
      sb.from('guest_register')
        .select('*, rooms(unit_no, nickname, property_name)')
        .order('check_in', { ascending: false }),
      sb.from('payment_history')
        .select('booking_id, amount, payment_date, verification_status')
        .neq('verification_status', 'rejected'),
      sb.from('rooms')
        .select('room_id, unit_no, nickname, property_name')
        .order('unit_no')
    ]);

    if (bErr) throw bErr;

    const paidMap = {};
    (payments || []).forEach(p => {
      paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (Number(p.amount) || 0);
    });

    const roomMap = {};
    (rooms || []).forEach(r => { roomMap[r.room_id] = r; });
    window._guestCRMRooms = rooms || [];

    // Aggregate by Normalized Phone (fallback to lowercase Name)
    const guestMap = {};
    const today = new Date().toISOString().slice(0, 10);

    (bookings || []).forEach(b => {
      const rawPhone = (b.phone || '').trim();
      const normPhone = rawPhone.replace(/\D/g, '').slice(-10); // Standardize 10-digit Indian mobile
      const rawName = (b.guest_name || 'Guest').trim();
      const guestKey = normPhone ? `phone_${normPhone}` : `name_${rawName.toLowerCase()}`;

      if (!guestMap[guestKey]) {
        guestMap[guestKey] = {
          key: guestKey,
          name: rawName,
          phone: rawPhone || '-',
          normPhone: normPhone || '',
          idProofType: b.id_proof_type || '',
          idProofNo: b.id_proof_no || '',
          totalStays: 0,
          completedStays: 0,
          cancelledStays: 0,
          totalSpend: 0,
          totalPaid: 0,
          totalDue: 0,
          firstStayDate: b.check_in,
          lastStayDate: b.check_in,
          lastProperty: b.rooms?.nickname || roomMap[b.room_id]?.nickname || b.room_id || 'Villa',
          lastRoomId: b.room_id,
          isCurrentlyInHouse: false,
          bookingHistory: [],
          channels: new Set(),
          notes: []
        };
      }

      const g = guestMap[guestKey];

      // Keep most descriptive name if available
      if (rawName && rawName !== 'Guest' && (g.name === 'Guest' || g.name.length < rawName.length)) {
        g.name = rawName;
      }
      if (rawPhone && g.phone === '-') g.phone = rawPhone;
      if (b.id_proof_no && !g.idProofNo) {
        g.idProofNo = b.id_proof_no;
        g.idProofType = b.id_proof_type || 'ID';
      }

      const isCancelled = Boolean(b.is_cancelled || b.verification_status === 'rejected');
      if (isCancelled) {
        g.cancelledStays += 1;
      } else {
        g.totalStays += 1;
        const tot = Number(b.total_amount) || 0;
        const pd = paidMap[b.booking_id] || 0;
        const due = Math.max(0, tot - pd);

        g.totalSpend += tot;
        g.totalPaid += pd;
        g.totalDue += due;

        if (b.check_out && b.check_out < today) {
          g.completedStays += 1;
        }

        // Currently in-house check
        if (b.check_in <= today && (b.check_out > today || (!b.check_out && b.checkout_confirmed === false))) {
          g.isCurrentlyInHouse = true;
        }
      }

      if (b.booking_mode) g.channels.add(b.booking_mode);
      if (b.notes && b.notes.trim()) g.notes.push(b.notes.trim());

      // Date track
      if (b.check_in) {
        if (!g.firstStayDate || b.check_in < g.firstStayDate) g.firstStayDate = b.check_in;
        if (!g.lastStayDate || b.check_in > g.lastStayDate) {
          g.lastStayDate = b.check_in;
          g.lastProperty = b.rooms?.nickname || roomMap[b.room_id]?.nickname || b.room_id || 'Villa';
          g.lastRoomId = b.room_id;
        }
      }

      g.bookingHistory.push({
        bookingId: b.booking_id,
        checkIn: b.check_in,
        checkOut: b.check_out,
        roomId: b.room_id,
        roomName: b.rooms?.nickname || roomMap[b.room_id]?.nickname || 'Villa',
        amount: Number(b.total_amount) || 0,
        paid: paidMap[b.booking_id] || 0,
        due: Math.max(0, (Number(b.total_amount) || 0) - (paidMap[b.booking_id] || 0)),
        mode: b.booking_mode,
        isCancelled
      });
    });

    const guestList = Object.values(guestMap).map(g => {
      // Assign loyalty tier based on active stays
      const tierInfo = window.getLoyaltyTier ? window.getLoyaltyTier(g.totalStays) : { tier: 'Bronze', icon: '🥉', color: '#B45309', discount: 0 };
      const avgSpend = g.totalStays > 0 ? Math.round(g.totalSpend / g.totalStays) : 0;
      return {
        ...g,
        tier: tierInfo.tier,
        tierIcon: tierInfo.icon,
        tierColor: tierInfo.color,
        tierDiscount: tierInfo.discount,
        avgSpend,
        channelList: Array.from(g.channels)
      };
    });

    window._guestCRMState.cachedGuests = guestList;
    return guestList;
  } catch (err) {
    console.error('Failed to load Guest CRM data:', err);
    if (window.fsn) fsn.error('CRM Error', 'Could not load guest data: ' + err.message);
    return [];
  } finally {
    window._guestCRMState.isLoading = false;
  }
};

/**
 * Filter & Sort helper
 */
window.computeFilteredGuests = function(guests) {
  let list = [...(guests || [])];
  const { activeTab, searchQuery, propertyFilter, sortBy } = window._guestCRMState;

  // Search Query Filter
  const sq = (searchQuery || '').trim().toLowerCase();
  if (sq) {
    const sqDigits = sq.replace(/\D/g, '');
    list = list.filter(g => {
      if (g.name.toLowerCase().includes(sq)) return true;
      if (g.phone.includes(sq) || (sqDigits && g.normPhone.includes(sqDigits))) return true;
      if (g.lastProperty.toLowerCase().includes(sq)) return true;
      if (g.idProofNo && g.idProofNo.toLowerCase().includes(sq)) return true;
      return false;
    });
  }

  // Property Filter
  if (propertyFilter) {
    list = list.filter(g => g.lastRoomId === propertyFilter || g.bookingHistory.some(b => b.roomId === propertyFilter));
  }

  // Tab Pipeline Filter
  if (activeTab === 'platinum') {
    list = list.filter(g => g.tier === 'Platinum');
  } else if (activeTab === 'gold') {
    list = list.filter(g => g.tier === 'Gold');
  } else if (activeTab === 'silver') {
    list = list.filter(g => g.tier === 'Silver');
  } else if (activeTab === 'bronze') {
    list = list.filter(g => g.tier === 'Bronze');
  } else if (activeTab === 'due') {
    list = list.filter(g => g.totalDue > 0.99);
  } else if (activeTab === 'inhouse') {
    list = list.filter(g => g.isCurrentlyInHouse);
  } else if (activeTab === 'repeat') {
    list = list.filter(g => g.totalStays >= 2);
  }

  // Sorting
  list.sort((a, b) => {
    if (sortBy === 'stays_desc') return b.totalStays - a.totalStays || b.totalSpend - a.totalSpend;
    if (sortBy === 'spend_desc') return b.totalSpend - a.totalSpend;
    if (sortBy === 'due_desc') return b.totalDue - a.totalDue;
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'recent') return (b.lastStayDate || '').localeCompare(a.lastStayDate || '');
    return 0;
  });

  return list;
};

/**
 * Main Render Function for Guest CRM
 */
window.renderGuestCRM = async function(forceRefresh = false) {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');

  // Preload if not already in state
  let allGuests = window._guestCRMState.cachedGuests;
  if (!allGuests || !allGuests.length || forceRefresh) {
    allGuests = await window.fetchGuestCRMData();
  }

  // Sync global property filter if active
  const globalProp = window.getGlobalSelectedProperty ? window.getGlobalSelectedProperty() : '';
  if (globalProp && !window._guestCRMState.propertyFilter) {
    window._guestCRMState.propertyFilter = globalProp;
  }

  const filtered = window.computeFilteredGuests(allGuests);
  const rooms = window._guestCRMRooms || [];

  // Metrics
  const totalGuestsCount = allGuests.length;
  const repeatGuestsCount = allGuests.filter(g => g.totalStays >= 2).length;
  const repeatRate = totalGuestsCount > 0 ? Math.round((repeatGuestsCount / totalGuestsCount) * 100) : 0;
  const totalSpendAll = allGuests.reduce((acc, g) => acc + g.totalSpend, 0);
  const totalDueAll = allGuests.reduce((acc, g) => acc + g.totalDue, 0);

  // Tab counters
  const platinumCount = allGuests.filter(g => g.tier === 'Platinum').length;
  const goldCount = allGuests.filter(g => g.tier === 'Gold').length;
  const silverCount = allGuests.filter(g => g.tier === 'Silver').length;
  const bronzeCount = allGuests.filter(g => g.tier === 'Bronze').length;
  const dueCount = allGuests.filter(g => g.totalDue > 0.99).length;
  const inhouseCount = allGuests.filter(g => g.isCurrentlyInHouse).length;

  const currentTab = window._guestCRMState.activeTab;

  const html = `
    <div class="guest-crm-container" style="max-width:1400px;margin:0 auto;padding-bottom:50px;">
      
      <!-- ─── TOP KPI METRICS ROW ─── -->
      <div class="crm-metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:20px;">
        <div class="card crm-kpi-card" style="padding:16px 20px;border-left:4px solid #4F46E5;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Registered Guests</div>
          <div style="font-size:26px;font-weight:800;color:var(--dark);margin-top:6px;">${totalGuestsCount.toLocaleString('en-IN')}</div>
          <div style="font-size:12px;color:#10B981;font-weight:600;margin-top:4px;">👥 Verified Client Database</div>
        </div>

        <div class="card crm-kpi-card" style="padding:16px 20px;border-left:4px solid #F59E0B;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Repeat Guests</div>
          <div style="font-size:26px;font-weight:800;color:var(--dark);margin-top:6px;">${repeatRate}% <span style="font-size:14px;font-weight:600;color:#64748B;">(${repeatGuestsCount} guests)</span></div>
          <div style="font-size:12px;color:#D97706;font-weight:600;margin-top:4px;">🔁 High Brand Loyalty</div>
        </div>

        <div class="card crm-kpi-card" style="padding:16px 20px;border-left:4px solid #10B981;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Customer Spend</div>
          <div style="font-size:26px;font-weight:800;color:var(--dark);margin-top:6px;">₹${Math.round(totalSpendAll).toLocaleString('en-IN')}</div>
          <div style="font-size:12px;color:#059669;font-weight:600;margin-top:4px;">💰 Lifetime Rental Value</div>
        </div>

        <div class="card crm-kpi-card" style="padding:16px 20px;border-left:4px solid ${totalDueAll > 0 ? '#EF4444' : '#10B981'};">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Outstanding Dues</div>
          <div style="font-size:26px;font-weight:800;color:${totalDueAll > 0 ? '#EF4444' : '#10B981'};margin-top:6px;">₹${Math.round(totalDueAll).toLocaleString('en-IN')}</div>
          <div style="font-size:12px;color:${totalDueAll > 0 ? '#DC2626' : '#059669'};font-weight:600;margin-top:4px;">${dueCount} guests with unpaid balances</div>
        </div>
      </div>

      <!-- ─── PIPELINE STATUS FILTER PILLS (LIKE SALON ERP) ─── -->
      <div class="card" style="padding:14px 18px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:800;color:var(--dark);">Guest Segments &amp; Loyalty Tiers</div>
          <button class="btn-sm outline" onclick="window.renderGuestCRM(true)" style="padding:4px 12px;font-size:12px;display:flex;align-items:center;gap:5px;">
            <span>🔄</span> Refresh CRM
          </button>
        </div>

        <div class="pipeline-pills-row" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch;">
          <button class="crm-pipeline-pill ${currentTab === 'all' ? 'active' : ''}" onclick="window.setGuestCRMTab('all')">
            All Guests <span class="pill-count">${totalGuestsCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'inhouse' ? 'active' : ''}" onclick="window.setGuestCRMTab('inhouse')" style="${inhouseCount > 0 ? 'border-color:#10B981;' : ''}">
            🟢 In-House <span class="pill-count" style="${inhouseCount > 0 ? 'background:#10B981;color:#fff;' : ''}">${inhouseCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'repeat' ? 'active' : ''}" onclick="window.setGuestCRMTab('repeat')">
            🔁 Repeat (2+) <span class="pill-count">${repeatGuestsCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'platinum' ? 'active' : ''}" onclick="window.setGuestCRMTab('platinum')" style="border-left:3px solid #8B5CF6;">
            💎 Platinum <span class="pill-count" style="background:#8B5CF6;color:#fff;">${platinumCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'gold' ? 'active' : ''}" onclick="window.setGuestCRMTab('gold')" style="border-left:3px solid #F59E0B;">
            🥇 Gold <span class="pill-count" style="background:#F59E0B;color:#fff;">${goldCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'silver' ? 'active' : ''}" onclick="window.setGuestCRMTab('silver')" style="border-left:3px solid #6B7280;">
            🥈 Silver <span class="pill-count">${silverCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'bronze' ? 'active' : ''}" onclick="window.setGuestCRMTab('bronze')">
            🥉 Bronze <span class="pill-count">${bronzeCount}</span>
          </button>
          <button class="crm-pipeline-pill ${currentTab === 'due' ? 'active' : ''}" onclick="window.setGuestCRMTab('due')" style="${dueCount > 0 ? 'background:#FEF2F2;color:#991B1B;border-color:#EF4444;font-weight:700;' : ''}">
            ⚠️ Due Balance <span class="pill-count" style="${dueCount > 0 ? 'background:#EF4444;color:#fff;' : ''}">${dueCount}</span>
          </button>
        </div>

        <!-- ─── SEARCH & FILTER CONTROLS BAR ─── -->
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
          <div style="position:relative;flex:1;min-width:240px;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;color:#94A3B8;">🔍</span>
            <input type="text" id="guestSearchInput" placeholder="Search by guest name, phone, or ID proof..." 
              value="${escapeHtml(window._guestCRMState.searchQuery)}"
              oninput="window.handleGuestCRMSearch(this.value)"
              style="width:100%;padding:8px 12px 8px 36px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);" />
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="crmPropFilter" onchange="window.handleGuestCRMProperty(this.value)" style="padding:8px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);">
              <option value="">All Properties (17)</option>
              ${rooms.map(r => `
                <option value="${r.room_id}" ${window._guestCRMState.propertyFilter === r.room_id ? 'selected' : ''}>
                  ${escapeHtml(r.nickname || r.room_id)} (${r.unit_no || '-'})
                </option>
              `).join('')}
            </select>

            <select id="crmSortSelect" onchange="window.handleGuestCRMSort(this.value)" style="padding:8px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);">
              <option value="stays_desc" ${window._guestCRMState.sortBy === 'stays_desc' ? 'selected' : ''}>Most Stays (Top Guests)</option>
              <option value="spend_desc" ${window._guestCRMState.sortBy === 'spend_desc' ? 'selected' : ''}>Highest Lifetime Spend</option>
              <option value="due_desc" ${window._guestCRMState.sortBy === 'due_desc' ? 'selected' : ''}>Highest Balance Due</option>
              <option value="recent" ${window._guestCRMState.sortBy === 'recent' ? 'selected' : ''}>Most Recent Stay</option>
              <option value="name_asc" ${window._guestCRMState.sortBy === 'name_asc' ? 'selected' : ''}>Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ─── GUEST DIRECTORY GRID ─── -->
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;padding:0 4px;">
        <div style="font-size:14px;font-weight:700;color:var(--text-muted);">
          Showing ${filtered.length} of ${totalGuestsCount} guests
        </div>
        <div style="font-size:12px;color:#64748B;">
          💡 Tip: Click WhatsApp to send a personalized greeting or Statement to download Khata.
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="card" style="text-align:center;padding:60px 20px;">
          <div style="font-size:40px;margin-bottom:12px;">👤</div>
          <div style="font-size:18px;font-weight:800;color:var(--dark);">No Guest Profiles Found</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">No guests matched your current search or segment filters.</div>
          <button class="btn-sm" onclick="window.resetGuestCRMFilters()" style="margin-top:16px;border-radius:20px;padding:6px 18px;">
            Clear Filters
          </button>
        </div>
      ` : `
        <div class="guest-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:16px;">
          ${filtered.map(g => window.renderGuestCardHtml(g)).join('')}
        </div>
      `}
    </div>
  `;

  renderShell(html, 'guest-crm');
};

/**
 * Individual Guest Profile Card (Rich Craft UI)
 */
window.renderGuestCardHtml = function(g) {
  const cleanPhone = g.phone && g.phone !== '-' ? g.phone : '';
  const waPhone = g.normPhone ? `91${g.normPhone}` : '';
  const waMsg = encodeURIComponent(`Hello ${g.name}! Greetings from The Unique Haven Homes. We would love to welcome you back for your next luxury stay.`);
  const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : '#';

  const initials = g.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'G';

  return `
    <div class="card guest-crm-card" style="padding:18px;border-radius:16px;display:flex;flex-direction:column;justify-content:space-between;transition:transform 0.15s ease, box-shadow 0.15s ease;border:1px solid var(--border);position:relative;">
      
      <!-- Card Top: Avatar, Name & Loyalty Tier -->
      <div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg, #1E293B, #0F172A);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;border:2px solid ${g.tierColor};flex-shrink:0;">
              ${initials}
            </div>
            <div>
              <div style="font-size:16px;font-weight:800;color:var(--dark);line-height:1.2;display:flex;align-items:center;gap:6px;">
                ${escapeHtml(g.name)}
                ${g.isCurrentlyInHouse ? '<span style="background:#ECFDF5;color:#065F46;border:1px solid #10B981;font-size:9.5px;padding:1px 6px;border-radius:6px;font-weight:700;">IN-HOUSE</span>' : ''}
              </div>
              <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:6px;">
                <span>📞 ${escapeHtml(g.phone)}</span>
              </div>
            </div>
          </div>

          <div style="background:${g.tierColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800;white-space:nowrap;display:flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
            <span>${g.tierIcon}</span> <span>${g.tier}</span>
          </div>
        </div>

        <!-- Metrics Chips Bar -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:var(--bg-tertiary);padding:10px 12px;border-radius:12px;margin-bottom:14px;">
          <div style="text-align:center;">
            <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Stays</div>
            <div style="font-size:15px;font-weight:800;color:var(--dark);margin-top:2px;">${g.totalStays}</div>
          </div>
          <div style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);">
            <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Total Spend</div>
            <div style="font-size:15px;font-weight:800;color:#059669;margin-top:2px;">₹${Math.round(g.totalSpend).toLocaleString('en-IN')}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Balance Due</div>
            <div style="font-size:15px;font-weight:800;color:${g.totalDue > 0 ? '#EF4444' : '#10B981'};margin-top:2px;">
              ${g.totalDue > 0 ? `₹${Math.round(g.totalDue).toLocaleString('en-IN')}` : '✅ Clean'}
            </div>
          </div>
        </div>

        <!-- Last Stay & Channel Info -->
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.4;">
          <div>🏡 <strong>Last Stay:</strong> ${escapeHtml(g.lastProperty)} (${g.lastStayDate || 'Past'})</div>
          ${g.idProofNo ? `<div style="margin-top:2px;">🪪 <strong>ID Proof:</strong> ${escapeHtml(g.idProofType)} (${escapeHtml(g.idProofNo)})</div>` : ''}
          ${g.tierDiscount > 0 ? `<div style="margin-top:2px;color:${g.tierColor};font-weight:700;">🎁 ${g.tierDiscount}% Loyalty VIP Discount applicable</div>` : ''}
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div style="display:flex;gap:6px;align-items:center;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap;">
        ${waPhone ? `
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn-sm" style="background:#25D366;color:#fff;border:none;font-weight:700;padding:6px 12px;border-radius:8px;font-size:11.5px;text-decoration:none;display:flex;align-items:center;gap:4px;">
            <span>💬</span> WhatsApp
          </a>
        ` : ''}

        <button type="button" class="btn-sm outline" onclick="window.openGuestStatementModal ? window.openGuestStatementModal('${escapeHtml(g.phone)}') : fsn.info('Khata', 'Statement modal loading...')" style="padding:6px 11px;border-radius:8px;font-size:11.5px;display:flex;align-items:center;gap:4px;">
          <span>📑</span> Khata
        </button>

        <button type="button" class="btn-sm" onclick="window.quickBookForGuest('${escapeHtml(g.name)}', '${escapeHtml(g.phone)}', '${escapeHtml(g.lastRoomId || '')}')" style="background:var(--dark);color:#fff;border:none;font-weight:700;padding:6px 11px;border-radius:8px;font-size:11.5px;display:flex;align-items:center;gap:4px;margin-left:auto;">
          <span>➕</span> Book Stay
        </button>
      </div>
    </div>
  `;
};

/**
 * Quick Actions Handlers
 */
window.setGuestCRMTab = function(tab) {
  window._guestCRMState.activeTab = tab;
  window.renderGuestCRM(false);
};

let _guestSearchDebounce = null;
window.handleGuestCRMSearch = function(val) {
  clearTimeout(_guestSearchDebounce);
  _guestSearchDebounce = setTimeout(() => {
    window._guestCRMState.searchQuery = val;
    window.renderGuestCRM(false);
  }, 200);
};

window.handleGuestCRMProperty = function(val) {
  window._guestCRMState.propertyFilter = val;
  window.renderGuestCRM(false);
};

window.handleGuestCRMSort = function(val) {
  window._guestCRMState.sortBy = val;
  window.renderGuestCRM(false);
};

window.resetGuestCRMFilters = function() {
  window._guestCRMState.activeTab = 'all';
  window._guestCRMState.searchQuery = '';
  window._guestCRMState.propertyFilter = '';
  window._guestCRMState.sortBy = 'stays_desc';
  window.renderGuestCRM(false);
};

window.quickBookForGuest = function(name, phone, roomId) {
  if (typeof window.renderAddBooking === 'function') {
    window._bookingPrefill = {
      guest_name: name,
      phone: phone,
      room_id: roomId
    };
    window.renderAddBooking();
  } else {
    navigate('bookings');
  }
};
