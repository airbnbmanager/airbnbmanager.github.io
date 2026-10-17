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
    const sbClient = window.sb || (typeof sb !== 'undefined' ? sb : null);
    if (!sbClient) {
      console.warn('Supabase client window.sb is not ready yet');
      return [];
    }

    const [{ data: bookings, error: bErr }, { data: payments, error: pErr }, { data: rooms }] = await Promise.all([
      sbClient.from('guest_register')
        .select('*, rooms(unit_no, nickname, property_name)')
        .order('check_in', { ascending: false }),
      sbClient.from('payment_history')
        .select('booking_id, amount, payment_date, verification_status')
        .neq('verification_status', 'rejected'),
      sbClient.from('rooms')
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
  const renderFn = window.renderShell || (typeof renderShell !== 'undefined' ? renderShell : null);
  if (!renderFn) {
    console.error('renderShell not available');
    return;
  }

  // Preload if not already in state
  let allGuests = window._guestCRMState.cachedGuests;
  if (!allGuests || !allGuests.length || forceRefresh) {
    renderFn(`<div class="loading" style="padding:50px 20px;text-align:center;"><div class="spinner"></div><div style="margin-top:12px;font-weight:700;color:var(--text-secondary);font-size:15px;">Loading Verified Guest CRM Profiles...</div><div style="font-size:12.5px;color:var(--text-muted);margin-top:4px;">Aggregating guest stays, loyalty tiers &amp; balances</div></div>`, 'guest-crm');
    allGuests = await window.fetchGuestCRMData();
  }

  // Sync global property filter if active
  const globalProp = (typeof window.getGlobalSelectedProperty === 'function') ? window.getGlobalSelectedProperty() : '';
  window._guestCRMState.propertyFilter = globalProp || '';

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

  renderFn(html, 'guest-crm');
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
    <div class="card guest-crm-card" onclick="window.openGuestCRMProfileModal('${g.key}')" style="padding:18px;border-radius:16px;display:flex;flex-direction:column;justify-content:space-between;transition:transform 0.15s ease, box-shadow 0.15s ease;border:1px solid var(--border);position:relative;cursor:pointer;">
      
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

        <button type="button" class="btn-sm" onclick="event.stopPropagation();window.openGuestCRMProfileModal('${g.key}')" style="background:#0F172A;color:#fff;border:none;border-radius:8px;font-weight:700;padding:6px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;">
          <span>👤</span> 360° Profile
        </button>

        <button type="button" class="btn-sm" onclick="event.stopPropagation();window.quickBookForGuest('${escapeHtml(g.name)}', '${escapeHtml(g.phone)}', '${escapeHtml(g.lastRoomId || '')}')" style="background:#b58d3d;color:#fff;border:none;font-weight:700;padding:6px 12px;border-radius:8px;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;margin-left:auto;">
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

/**
 * ═════════════════════════════════════════════════════════════════════════
 * 👤 GUEST 360° CRM DOSSIER MODAL (INSPIRED BY VIDEO DEMO — IMAGE 3)
 * Split-view with 6 KPI boxes, Customer Profile Table, and Tabbed Stays/Timeline
 * ═════════════════════════════════════════════════════════════════════════
 */
window.openGuestCRMProfileModal = function(guestKey) {
  const g = (window._guestCRMState.cachedGuests || []).find(x => x.key === guestKey);
  if (!g) return;

  const oldModal = document.getElementById('guest360ModalOverlay');
  if (oldModal) oldModal.remove();

  const waPhone = g.normPhone ? `91${g.normPhone}` : '';
  const waMsg = encodeURIComponent(`Hello ${g.name}! Greetings from The Unique Haven Homes. We are pleased to assist you with your booking.`);
  const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : '#';

  const modal = document.createElement('div');
  modal.id = 'guest360ModalOverlay';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);display:flex;align-items:center;justify-content:center;z-index:999999;padding:16px;backdrop-filter:blur(4px);';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const initials = g.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'G';
  const customerCode = `CUS-${g.normPhone ? g.normPhone.slice(-6) : '2026'}`;
  const isReturning = g.totalStays >= 2;

  modal.innerHTML = `
    <div class="modal-box" style="background:#ffffff;border-radius:16px;width:100%;max-width:1050px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);border:1px solid #E2E8F0;" onclick="event.stopPropagation()">
      
      <!-- ─── TOP HEADER BAR (MATCHES SALON CRM VIDEO IMAGE 3) ─── -->
      <div style="background:#0F172A;color:#ffffff;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#334155,#1E293B);border:2px solid ${g.tierColor};color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0;">
            ${initials}
          </div>
          <div>
            <div style="font-size:18px;font-weight:800;display:flex;align-items:center;gap:8px;line-height:1.2;">
              ${escapeHtml(g.name)}
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:${isReturning ? '#10B981' : '#64748B'};color:#ffffff;">
                ${isReturning ? 'Returning VIP' : 'New Client'}
              </span>
              ${g.isCurrentlyInHouse ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:#3B82F6;color:#ffffff;">In-House Now</span>' : ''}
            </div>
            <div style="font-size:12px;color:#94A3B8;margin-top:3px;display:flex;align-items:center;gap:10px;">
              <span><strong>Code:</strong> ${customerCode}</span>
              <span>&bull;</span>
              <span><strong>Phone:</strong> ${escapeHtml(g.phone)}</span>
              <span>&bull;</span>
              <span><strong>Tier:</strong> ${g.tierIcon} ${g.tier}</span>
            </div>
          </div>
        </div>

        <!-- Top Right Action Buttons -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${waPhone ? `
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="background:#25D366;color:#ffffff;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:5px;">
              <span>💬</span> WhatsApp
            </a>
          ` : ''}
          ${g.phone && g.phone !== '-' ? `
            <a href="tel:${escapeHtml(g.phone)}" style="background:#334155;color:#ffffff;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:5px;">
              <span>📞</span> Call
            </a>
          ` : ''}
          <button type="button" onclick="window.editGuestProfile('${escapeHtml(g.key)}')" style="background:#475569;color:#ffffff;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Edit Guest / Booking Details">
            <span>✏️</span> Edit
          </button>
          <button type="button" onclick="window.quickBookForGuest('${escapeHtml(g.name)}', '${escapeHtml(g.phone)}', '${escapeHtml(g.lastRoomId || '')}');document.getElementById('guest360ModalOverlay')?.remove();" style="background:#b58d3d;color:#ffffff;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
            <span>➕</span> New Booking
          </button>
          <button type="button" onclick="document.getElementById('guest360ModalOverlay')?.remove()" style="background:transparent;border:none;color:#94A3B8;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;" title="Close">
            ✕
          </button>
        </div>
      </div>

      <!-- ─── MODAL BODY: 2-COLUMN SPLIT (MATCHES VIDEO IMAGE 3) ─── -->
      <div style="display:grid;grid-template-columns:340px 1fr;overflow-y:auto;flex:1;min-height:480px;background:#F8FAFC;">
        
        <!-- LEFT COLUMN: 6 KPI CARDS + PROFILE DETAILS TABLE -->
        <div style="background:#ffffff;border-right:1px solid #E2E8F0;padding:20px;overflow-y:auto;">
          
          <!-- 6 KPI Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
            <div style="background:#F1F5F9;padding:10px 12px;border-radius:10px;border-left:3px solid #0F172A;">
              <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">TOTAL VISITS</div>
              <div style="font-size:18px;font-weight:800;color:#0F172A;margin-top:2px;">${g.totalStays}</div>
            </div>

            <div style="background:#F0FDF4;padding:10px 12px;border-radius:10px;border-left:3px solid #10B981;">
              <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">LIFETIME SPEND</div>
              <div style="font-size:18px;font-weight:800;color:#15803D;margin-top:2px;">₹${Math.round(g.totalSpend).toLocaleString('en-IN')}</div>
            </div>

            <div style="background:#F8FAFC;padding:10px 12px;border-radius:10px;border-left:3px solid #0284C7;border:1px solid #E2E8F0;">
              <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;">AVG TARIFF</div>
              <div style="font-size:18px;font-weight:800;color:#0F172A;margin-top:2px;">₹${g.totalStays > 0 ? Math.round(g.totalSpend / g.totalStays).toLocaleString('en-IN') : 0}</div>
            </div>

            <div style="background:#FFFBEB;padding:10px 12px;border-radius:10px;border-left:3px solid #F59E0B;">
              <div style="font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;">LOYALTY TIER</div>
              <div style="font-size:16px;font-weight:800;color:#B45309;margin-top:2px;">${g.tierIcon} ${g.tier}</div>
            </div>

            <div style="background:${g.totalDue > 0 ? '#FEF2F2' : '#F0FDF4'};padding:10px 12px;border-radius:10px;border-left:3px solid ${g.totalDue > 0 ? '#EF4444' : '#10B981'};">
              <div style="font-size:10px;font-weight:700;color:${g.totalDue > 0 ? '#991B1B' : '#166534'};text-transform:uppercase;">OUTSTANDING</div>
              <div style="font-size:18px;font-weight:800;color:${g.totalDue > 0 ? '#DC2626' : '#15803D'};margin-top:2px;">
                ${g.totalDue > 0 ? `₹${Math.round(g.totalDue).toLocaleString('en-IN')}` : '₹0 (Clean)'}
              </div>
            </div>

            <div style="background:#F1F5F9;padding:10px 12px;border-radius:10px;border-left:3px solid #64748B;">
              <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">LAST STAY</div>
              <div style="font-size:14px;font-weight:800;color:#0F172A;margin-top:4px;">${g.lastStayDate || 'Past'}</div>
            </div>
          </div>

          <!-- Profile Info Details (Like Video Table) -->
          <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.5px;">Client Information</div>
          <table style="width:100%;font-size:12.5px;border-collapse:collapse;">
            <tbody>
              <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:7px 0;color:#64748B;font-weight:600;">Customer Code</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${customerCode}</td></tr>
              <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:7px 0;color:#64748B;font-weight:600;">Full Name</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${escapeHtml(g.name)}</td></tr>
              <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:7px 0;color:#64748B;font-weight:600;">Phone Number</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${escapeHtml(g.phone)}</td></tr>
              <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:7px 0;color:#64748B;font-weight:600;">ID Proof</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${escapeHtml(g.idProofNo || 'Not uploaded')}</td></tr>
              <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:7px 0;color:#64748B;font-weight:600;">Favorite Residence</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${escapeHtml(g.lastProperty)}</td></tr>
              <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:7px 0;color:#64748B;font-weight:600;">Channels</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${escapeHtml(g.channelList.join(', ') || 'Direct')}</td></tr>
              <tr><td style="padding:7px 0;color:#64748B;font-weight:600;">First Visit</td><td style="padding:7px 0;font-weight:700;color:#0F172A;text-align:right;">${g.firstStayDate || 'Unknown'}</td></tr>
            </tbody>
          </table>
        </div>

        <!-- RIGHT COLUMN: TABBED DOSSIER & STAY TIMELINE -->
        <div style="padding:20px;display:flex;flex-direction:column;overflow-y:auto;">
          
          <!-- Tab Navigation (Like Video Image 3) -->
          <div style="display:flex;gap:4px;border-bottom:2px solid #E2E8F0;padding-bottom:2px;margin-bottom:16px;">
            <button type="button" class="dossier-tab active" onclick="window.switchDossierTab('stays')" id="dossier-tab-stays" style="background:transparent;border:none;padding:8px 14px;font-size:13px;font-weight:700;color:#0F172A;border-bottom:2px solid #0F172A;cursor:pointer;">
              📅 Stay History (${g.bookingHistory.length})
            </button>
            <button type="button" class="dossier-tab" onclick="window.switchDossierTab('notes')" id="dossier-tab-notes" style="background:transparent;border:none;padding:8px 14px;font-size:13px;font-weight:600;color:#64748B;cursor:pointer;">
              📝 Host Notes &amp; Preferences (${g.notes.length})
            </button>
            <button type="button" class="dossier-tab" onclick="window.switchDossierTab('timeline')" id="dossier-tab-timeline" style="background:transparent;border:none;padding:8px 14px;font-size:13px;font-weight:600;color:#64748B;cursor:pointer;">
              ⏱️ Activity Timeline
            </button>
          </div>

          <!-- TAB 1: STAY HISTORY -->
          <div id="dossier-panel-stays" style="display:block;">
            ${g.bookingHistory.length === 0 ? `
              <div style="text-align:center;padding:40px;color:#64748B;">No stays recorded for this client.</div>
            ` : `
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${g.bookingHistory.map(b => `
                  <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                    <div>
                      <div style="font-weight:800;color:#0F172A;font-size:14.5px;display:flex;align-items:center;gap:6px;">
                        <span>🏡 ${escapeHtml(b.roomName)}</span>
                        <span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;background:${b.mode?.includes('Airbnb') ? '#FFE4E6' : '#E0E7FF'};color:${b.mode?.includes('Airbnb') ? '#E11D48' : '#4338CA'};">
                          ${escapeHtml(b.mode || 'Direct')}
                        </span>
                      </div>
                      <div style="font-size:12.5px;color:#64748B;margin-top:3px;">
                        📅 ${b.checkIn} &rarr; ${b.checkOut || 'Open'} &bull; Booking ID: <span style="font-family:monospace;font-weight:700;">${b.bookingId}</span>
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:15px;font-weight:800;color:#0F172A;">₹${b.amount.toLocaleString('en-IN')}</div>
                      <div style="font-size:11.5px;font-weight:700;color:${b.due > 0 ? '#EF4444' : '#10B981'};margin-top:2px;">
                        ${b.due > 0 ? `⚠️ ₹${Math.round(b.due).toLocaleString('en-IN')} Due` : '✅ Paid Full'}
                      </div>
                      <button type="button" onclick="document.getElementById('guest360ModalOverlay')?.remove(); if(window.editBooking) window.editBooking('${b.bookingId}');" class="btn-sm" style="background:#0F172A;color:#fff;border:none;padding:4px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;margin-top:6px;display:inline-flex;align-items:center;gap:4px;">
                        <span>✏️</span> Edit Stay
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- TAB 2: NOTES & PREFERENCES -->
          <div id="dossier-panel-notes" style="display:none;">
            ${g.notes.length === 0 ? `
              <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:30px;text-align:center;color:#64748B;">
                No special host notes or dietary preferences recorded yet.
              </div>
            ` : `
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${g.notes.map((note, idx) => `
                  <div style="background:#ffffff;border:1px solid #E2E8F0;border-left:3px solid #b58d3d;border-radius:10px;padding:12px 16px;">
                    <div style="font-size:11px;font-weight:700;color:#64748B;">Note #${idx+1}</div>
                    <div style="font-size:13px;color:#0F172A;margin-top:3px;line-height:1.4;">${escapeHtml(note)}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- TAB 3: TIMELINE -->
          <div id="dossier-panel-timeline" style="display:none;">
            <div style="position:relative;padding-left:24px;border-left:2px solid #E2E8F0;display:flex;flex-direction:column;gap:16px;">
              <div style="position:relative;">
                <div style="position:absolute;left:-31px;top:2px;width:12px;height:12px;border-radius:50%;background:#10B981;border:2px solid #fff;"></div>
                <div style="font-size:13px;font-weight:700;color:#0F172A;">Last Stay Recorded</div>
                <div style="font-size:12px;color:#64748B;">Checked in at ${escapeHtml(g.lastProperty)} (${g.lastStayDate || 'Recent'})</div>
              </div>
              <div style="position:relative;">
                <div style="position:absolute;left:-31px;top:2px;width:12px;height:12px;border-radius:50%;background:#3B82F6;border:2px solid #fff;"></div>
                <div style="font-size:13px;font-weight:700;color:#0F172A;">Total Stays Milestone</div>
                <div style="font-size:12px;color:#64748B;">Accumulated ${g.totalStays} completed stay(s) with ₹${Math.round(g.totalSpend).toLocaleString('en-IN')} total rental value.</div>
              </div>
              <div style="position:relative;">
                <div style="position:absolute;left:-31px;top:2px;width:12px;height:12px;border-radius:50%;background:#F59E0B;border:2px solid #fff;"></div>
                <div style="font-size:13px;font-weight:700;color:#0F172A;">Client Profile Initiated</div>
                <div style="font-size:12px;color:#64748B;">First arrival recorded on ${g.firstStayDate || 'System Start'}.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};

window.switchDossierTab = function(tabName) {
  ['stays', 'notes', 'timeline'].forEach(t => {
    const tabBtn = document.getElementById(`dossier-tab-${t}`);
    const panel = document.getElementById(`dossier-panel-${t}`);
    if (t === tabName) {
      if (tabBtn) {
        tabBtn.style.color = '#0F172A';
        tabBtn.style.borderBottom = '2px solid #0F172A';
        tabBtn.style.fontWeight = '700';
      }
      if (panel) panel.style.display = 'block';
    } else {
      if (tabBtn) {
        tabBtn.style.color = '#64748B';
        tabBtn.style.borderBottom = 'none';
        tabBtn.style.fontWeight = '600';
      }
      if (panel) panel.style.display = 'none';
    }
  });
};

/**
 * Edit Guest / Latest Stay Details directly
 */
window.editGuestProfile = function(guestKey) {
  const g = (window._guestCRMState?.cachedGuests || []).find(x => x.key === guestKey);
  const bId = g?.bookingHistory?.[0]?.bookingId;
  document.getElementById('guest360ModalOverlay')?.remove();
  if (bId && typeof window.editBooking === 'function') {
    window.editBooking(bId);
  } else {
    navigate('bookings');
  }
};

// Global Esc to close Guest 360 modal
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.getElementById('guest360ModalOverlay')?.remove();
  }
});

