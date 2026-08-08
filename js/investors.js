/**
 * Investors Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ MANAGE INVESTORS ============
async function renderManageInvestors() {
  renderShell(`<div class="loading">Loading...</div>`, 'investors');

  const [{data:invs}, {data:links}, {data:rooms}] = await Promise.all([
    sb.from('investors').select('*').order('name'),
    sb.from('investor_properties').select('investor_id, room_id, share_percent, is_active, investors(name), rooms(unit_no, property_name, nickname)'),
    sb.from('rooms').select('room_id, unit_no, property_name, nickname').order('room_id')
  ]);
  window._invRooms = rooms || [];

  const invPropMap = {};
  (links || []).forEach(l => {
    if (!invPropMap[l.investor_id]) invPropMap[l.investor_id] = [];
    invPropMap[l.investor_id].push(l);
  });

  const isO = ['developer','admin'].includes(SESSION.role);

  renderShell(`
    <div class="card">
      <h1>🧑‍💼 Investors</h1>
      <div class="sub">${(invs || []).length} investors</div>
      <div class="btn-row">
        <button onclick="renderAddInv()">➕ Add Investor</button>
        <button class="secondary" onclick="renderLinkProp()">🔗 Link Property</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">All Investors</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Properties & Shares</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>${(invs || []).map(i => {
          const iLinks = invPropMap[i.investor_id] || [];
          const propBadges = iLinks.length === 0 
            ? '<span class="sub">No properties</span>'
            : iLinks.map(l => {
                const share = l.share_percent || 0;
                const shareColor = share === 100 ? 'green' : share >= 50 ? 'blue' : share > 0 ? 'yellow' : 'red';
                return `<div style="display:inline-block;margin:2px;padding:4px 8px;background:#f8f8f8;border-radius:6px;font-size:12px;">
                  🏠 <strong>${propLabel(l.rooms) || l.room_id}</strong>
                  <span class="badge ${shareColor}" style="margin-left:4px;">${share}%</span>
                </div>`;
              }).join('');
          return `<tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.phone || '-'}</td>
            <td style="font-size:12px;">${propBadges}</td>
            <td class="table-actions" style="white-space:nowrap;">
              ${iLinks.map(l => `<button class="btn-sm" title="Report ${l.room_id}" onclick="renderInvestorReport('${i.investor_id}','${l.room_id}')">📊</button>`).join('')}
              ${i.phone ? `<button class="btn-sm" style="background:#25D366;color:#fff;" title="Send WhatsApp" onclick="quickWhatsAppInvestor('${i.investor_id}')">📱</button>` : ''}
              ${isO ? `<button class="btn-sm" title="Edit" onclick="editInvestor('${i.investor_id}')">✏️</button>` : ''}
              ${isO ? `<button class="btn-sm danger" title="Delete" onclick="deleteInvestor('${i.investor_id}','${i.name}')">🗑️</button>` : ''}
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">Property → Investor Mapping</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Property</th><th>Investor</th><th>Share</th><th>Remove</th></tr></thead>
        <tbody>${(links || []).map(l => {
          const share = l.share_percent || 0;
          const shareColor = share === 100 ? 'green' : share >= 50 ? 'blue' : share > 0 ? 'yellow' : 'red';
          return `<tr>
            <td><strong>${propLabel(l.rooms) || l.room_id}</strong><br><small style="color:var(--muted);">${l.rooms?.unit_no || ''}</small></td>
            <td>${l.investors?.name || l.investor_id}</td>
            <td><span class="badge ${shareColor}">${share}%</span></td>
            <td class="table-actions">
              <button class="btn-sm" onclick="editShareInline('${l.investor_id}','${l.room_id}',${share})" title="Edit Share">✏️</button>
              <button class="btn-sm danger" onclick="unlinkProperty('${l.investor_id}','${l.room_id}')" title="Remove">🗑️</button>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="4" class="sub">No mappings</td></tr>'}</tbody>
      </table></div>
    </div>
  `, 'investors');
}

// ============ ADD INVESTOR ============
async function renderAddInv() {
  const {data:rooms} = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');

  renderShell(`
    <div class="card">
      <h1>➕ Add Investor</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="invName" placeholder="e.g. Papa Ammi" /></div>
        <div class="form-group"><label>Phone</label><input id="invPhone" type="tel" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Revenue Share %</label><input id="invShare" type="number" value="70" min="0" max="100" /></div>
        <div class="form-group"><label>Email</label><input id="invEmail" type="email" placeholder="For future login" /></div>
      </div>
      <div class="form-group">
        <label>Assign Properties</label>
        <select id="invRooms" multiple style="min-height:120px;">
          ${(rooms || []).map(r => `<option value="${r.room_id}">${propLabel(r)}</option>`).join('')}
        </select>
        <small style="color:var(--muted);">Hold Ctrl/Cmd to select multiple</small>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="invNotes" placeholder="Optional"></textarea></div>
      <button onclick="saveInvSafe()" style="width:100%;margin-top:10px;">💾 Save Investor</button>
      <div id="invErr"></div>
    </div>
  `, 'investors');
}

async function saveInvSafe() {
  const btn = document.querySelector('button[onclick="saveInvSafe()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  const name = document.getElementById('invName').value.trim();
  if (!name) {
    document.getElementById('invErr').innerHTML = '<div class="error">Name required</div>';
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Investor'; }
    return;
  }

  const phone = document.getElementById('invPhone').value.trim();
  const share = parseFloat(document.getElementById('invShare').value) || 70;
  const email = document.getElementById('invEmail').value.trim();
  const notes = document.getElementById('invNotes').value.trim();
  const roomsSelect = document.getElementById('invRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o => o.value) : [];

  try {
    const investorId = 'INV' + Date.now();
    const { error } = await sb.from('investors').insert({
      investor_id: investorId,
      name,
      phone: phone || null,
      revenue_share_pct: share,
      notes: [notes, email ? `Email: ${email}` : ''].filter(Boolean).join(' | ') || null
    });
    if (error) throw new Error(error.message);

    if (selectedRooms.length > 0) {
      const links = selectedRooms.map(rid => ({ investor_id: investorId, room_id: rid }));
      const { error: linkErr } = await sb.from('investor_properties').insert(links);
      if (linkErr) throw new Error(linkErr.message);
    }

    fsn.success(`Success`, `✅ Investor "${name}" added successfully!`);
    renderManageInvestors();
  } catch (err) {
    document.getElementById('invErr').innerHTML = `<div class="error">${err.message}</div>`;
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Investor'; }
  }
}

// ============ EDIT INVESTOR ============
async function editInvestor(investorId) {
  const { data: inv } = await sb.from('investors').select('*').eq('investor_id', investorId).single();
  if (!inv) { fsn.error('Error', 'Not found'); return; }

  const { data: links } = await sb.from('investor_properties').select('room_id').eq('investor_id', investorId);
  const linkedRooms = (links || []).map(l => l.room_id);

  const { data: rooms } = await sb.from('rooms').select('room_id, nickname, unit_no').order('room_id');

  // Extract email from notes if stored
  const emailMatch = (inv.notes || '').match(/Email:\s*(\S+)/);
  const email = emailMatch ? emailMatch[1] : '';
  const cleanNotes = (inv.notes || '').replace(/\s*\|\s*Email:\s*\S+/, '').trim();

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Investor</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Name *</label><input id="invName" value="${inv.name}" /></div>
        <div class="form-group"><label>Phone</label><input id="invPhone" value="${inv.phone || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Revenue Share %</label><input id="invShare" type="number" value="${inv.revenue_share_pct || 70}" min="0" max="100" /></div>
        <div class="form-group"><label>Email</label><input id="invEmail" type="email" value="${email}" /></div>
      </div>
      <div class="form-group">
        <label>Assigned Properties</label>
        <select id="invRooms" multiple style="min-height:120px;">
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${linkedRooms.includes(r.room_id) ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
        </select>
        <small style="color:var(--muted);">Hold Ctrl/Cmd to select multiple. Deselect to remove link.</small>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="invNotes">${cleanNotes}</textarea></div>
      <button onclick="updateInvestor('${investorId}')" style="width:100%;margin-top:10px;">💾 Update Investor</button>
      <div id="invErr"></div>
    </div>
  `, 'investors');
}

async function updateInvestor(investorId) {
  const name = document.getElementById('invName').value.trim();
  if (!name) { document.getElementById('invErr').innerHTML = '<div class="error">Name required</div>'; return; }

  const phone = document.getElementById('invPhone').value.trim();
  const share = parseFloat(document.getElementById('invShare').value) || 70;
  const email = document.getElementById('invEmail').value.trim();
  const notes = document.getElementById('invNotes').value.trim();

  const roomsSelect = document.getElementById('invRooms');
  const selectedRooms = roomsSelect ? Array.from(roomsSelect.selectedOptions).map(o => o.value) : [];

  try {
    // Update investor details
    const { error } = await sb.from('investors').update({
      name,
      phone: phone || null,
      revenue_share_pct: share,
      notes: [notes, email ? `Email: ${email}` : ''].filter(Boolean).join(' | ') || null
    }).eq('investor_id', investorId);
    if (error) throw new Error(error.message);

    // SMART UPDATE: preserve share_percent for existing links
    // Get current links with their share_percent
    const { data: currentLinks } = await sb.from('investor_properties')
      .select('room_id, share_percent, is_active')
      .eq('investor_id', investorId);
    
    const currentRoomIds = (currentLinks || []).map(l => l.room_id);
    
    // Rooms to ADD (in selected but not in current)
    const toAdd = selectedRooms.filter(rid => !currentRoomIds.includes(rid));
    // Rooms to REMOVE (in current but not in selected)
    const toRemove = currentRoomIds.filter(rid => !selectedRooms.includes(rid));
    
    // Remove only unselected ones (preserves share_percent for others!)
    if (toRemove.length > 0) {
      await sb.from('investor_properties')
        .delete()
        .eq('investor_id', investorId)
        .in('room_id', toRemove);
    }
    
    // Add new ones with default 100% share (user can edit later)
    if (toAdd.length > 0) {
      const newLinks = toAdd.map(rid => ({ 
        investor_id: investorId, 
        room_id: rid,
        share_percent: 100,
        is_active: true
      }));
      const { error: linkErr } = await sb.from('investor_properties').insert(newLinks);
      if (linkErr) throw new Error(linkErr.message);
    }

    fsn.success(`Success`, `✅ Investor "${name}" updated!`);
    renderManageInvestors();
  } catch (err) {
    document.getElementById('invErr').innerHTML = `<div class="error">${err.message}</div>`;
  }
}

// ============ DELETE INVESTOR ============
async function deleteInvestor(investorId, name) {
  if (!confirm(`⚠️ Delete investor "${name}"?\n\nProperty links bhi remove ho jayengi.`)) return;

  try {
    console.log('🗑️ Deleting investor:', investorId);

    // Step 1: Remove property links with select() for verification
    const linkResult = await sb.from('investor_properties').delete().eq('investor_id', investorId).select();
    console.log('Link delete result:', linkResult);

    // Step 2: Remove investor with select() for verification
    const invResult = await sb.from('investors').delete().eq('investor_id', investorId).select();
    console.log('Investor delete result:', invResult);

    if (invResult.error) throw new Error(invResult.error.message);

    // Verify actually deleted
    if (!invResult.data || invResult.data.length === 0) {
      throw new Error('BACKEND BLOCKED: 0 rows deleted. Supabase RLS policy issue. Check SQL Editor.');
    }

    fsn.success(`Success`, `✅ Investor "${name}" deleted (${invResult.data.length} row)`);
    renderManageInvestors();
  } catch (err) {
    console.error('Delete error:', err);
    fsn.error('Error', '❌ Delete failed: ' + err.message);
  }
}

// ============ LINK / UNLINK PROPERTY ============
async function renderLinkProp() {
  const { data: invs } = await sb.from('investors').select('investor_id, name').order('name');

  renderShell(`
    <div class="card">
      <h1>🔗 Link Property to Investor</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group"><label>Investor *</label>
        <select id="lInv"><option value="">Select Investor</option>
          ${(invs || []).map(i => `<option value="${i.investor_id}">${i.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Property *</label>
        <select id="lRoom"><option value="">Select Property</option>
          ${(window._invRooms || []).map(r => `<option value="${r.room_id}">${propLabel(r)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Share % for this Property *</label>
        <input id="lShare" type="number" min="0" max="100" step="0.01" 
          value="100" placeholder="e.g. 50 for 50%" />
        <small style="color:var(--muted);">
          Agar property ke multiple investors hain to divide karo.<br>
          Example: 2 investors = 50 each, 3 investors = 33.33 each
        </small>
      </div>
      <button onclick="saveLink()" style="width:100%;">💾 Link Property</button>
      <div id="lErr"></div>
    </div>
  `, 'investors');
}

async function saveLink() {
  const inv = document.getElementById('lInv').value;
  const room = document.getElementById('lRoom').value;
  const share = parseFloat(document.getElementById('lShare')?.value) || 100;
  
  if (!inv || !room) {
    document.getElementById('lErr').innerHTML = '<div class="error">Investor & property required</div>';
    return;
  }
  
  if (share < 0 || share > 100) {
    document.getElementById('lErr').innerHTML = '<div class="error">Share % must be between 0 and 100</div>';
    return;
  }

  // Check if already linked
  const { data: existing } = await sb.from('investor_properties')
    .select('investor_id').eq('investor_id', inv).eq('room_id', room).single();

  if (existing) {
    document.getElementById('lErr').innerHTML = '<div class="error">Already linked! Use Edit Share instead.</div>';
    return;
  }

  const { error } = await sb.from('investor_properties').insert({ 
    investor_id: inv, 
    room_id: room,
    share_percent: share,
    is_active: true
  });
  if (error) { document.getElementById('lErr').innerHTML = `<div class="error">${error.message}</div>`; return; }

  fsn.success('Success', `✅ Property linked with ${share}% share!`);
  renderManageInvestors();
}

async function unlinkProperty(inv, room) {
  if (!confirm('Remove this property link?')) return;
  await sb.from('investor_properties').delete().eq('investor_id', inv).eq('room_id', room);
  fsn.success('Success', '✅ Property unlinked');
  renderManageInvestors();
}

// ============ INVESTOR REPORT ============
async function renderInvestorReport(investorId, roomId, month) {
  renderShell(`<div class="loading">Generating report...</div>`, 'investors');

  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthDate = new Date(selMonth + '-01');
  const monthName = monthDate.toLocaleString('en-IN', { month: 'long' }).toUpperCase();
  const monthYear = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const monthStart = selMonth + '-01';
  const monthEnd = new Date(parseInt(selMonth.split('-')[0]), parseInt(selMonth.split('-')[1]), 0).toISOString().slice(0, 10);
  const monthShort = monthDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', '-');

  const [{data:inv}, {data:room}, {data:bookings}, {data:defaults}, {data:expenses}, {data:payments}, {data:link}] = await Promise.all([
    sb.from('investors').select('*').eq('investor_id', investorId).single(),
    sb.from('rooms').select('*').eq('room_id', roomId).single(),
    sb.from('guest_register').select('*').eq('room_id', roomId).gte('check_in', monthStart).lte('check_in', monthEnd).order('check_in'),
    sb.from('property_default_expenses').select('*').eq('room_id', roomId).order('expense_name'),
    sb.from('expenses').select('*, expense_categories(category_name)').eq('room_id', roomId).eq('month', monthShort),
    sb.from('payment_history').select('booking_id, amount'),
    sb.from('investor_properties').select('share_percent').eq('investor_id', investorId).eq('room_id', roomId).maybeSingle(),
  ]);

  // Filter out complimentary/friends bookings + REVIEW bookings (fake Airbnb)
  const excludeKeywords = ['(friends)', '(complimentary)', '(comp)', '(free)', '(owner)', '(family)', 'friends)', 'complimentary)', 'comp)', 'free)', 'owner)', 'family)'];
  const isExcluded = (b) => {
    const name = (b.guest_name || '').toLowerCase().replace(/\s+/g, ' ');
    const notes = (b.notes || '').toLowerCase();
    // NEW: Only exclude if admin marked as hidden from investor
    if (b.show_to_investor === false) return true;
    // Legacy: Also exclude if guest name contains "friends", "complimentary" etc.
    return excludeKeywords.some(k => name.includes(k) || notes.includes(k));
  };

  const excludedBookings = (bookings || []).filter(b => isExcluded(b));
  const activeBookings = (bookings || []).filter(b => !isExcluded(b));
  
  // NEW: Count hidden bookings (for footer transparency)
  const hiddenCount = (bookings || []).filter(b => b.show_to_investor === false).length;

  // NEW MULTI-INVESTOR FORMULA:
  // Company: FIXED 30%
  // Investor Pool: 70% of profit
  // This investor's share: pool × (link.share_percent / 100)
  const COMPANY_PCT = 30;
  const INVESTOR_POOL_PCT = 70;
  const investorPoolShare = link?.share_percent || 100;  // % of pool for THIS investor
  const share = INVESTOR_POOL_PCT;      // for display "70% investor pool"
  const cs = COMPANY_PCT;                // for display "30% company"
  const bkIds = activeBookings.map(b => b.booking_id);
  const pm = {};
  (payments || []).forEach(p => { if (bkIds.includes(p.booking_id)) pm[p.booking_id] = (pm[p.booking_id] || 0) + (p.amount || 0); });

  const cn = b => b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : 0;
  // NEW: 3-way split — Online, Offline, Review
  const reviewBks = activeBookings.filter(b => b.is_review_booking === true);
  const onBks = activeBookings.filter(b => b.booking_mode === 'Online-Airbnb' && !b.is_review_booking);
  const offBks = activeBookings.filter(b => b.booking_mode !== 'Online-Airbnb' && !b.is_review_booking);

  const onNights = onBks.reduce((s, b) => s + cn(b), 0);
  const offNights = offBks.reduce((s, b) => s + cn(b), 0);
  const reviewNights = reviewBks.reduce((s, b) => s + cn(b), 0);
  const totalNights = onNights + offNights + reviewNights;

  const onRev = onBks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const offRev = offBks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const reviewRev = reviewBks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  const totalRev = onRev + offRev + reviewRev;

  const useDefaults = (expenses || []).length === 0;
  const expList = useDefaults ? (defaults || []) : (expenses || []);
  const totalExp = useDefaults
    ? (defaults || []).reduce((s, d) => s + (d.default_amount || 0), 0)
    : (expenses || []).reduce((s, e) => s + (e.amount || 0), 0);

  const profit = totalRev - totalExp;
  // Company always gets 30%
  const companyAmount = Math.round(profit * COMPANY_PCT / 100);
  // Investor pool = 70% of profit
  const investorPool = profit - companyAmount;
  // THIS specific investor's share of the pool
  const investorAmount = Math.round(investorPool * investorPoolShare / 100);
  // For UI clarity
  const otherInvestorsAmount = investorPool - investorAmount;
  
  // ===== SPLIT INVESTOR NAME BY "&" =====
  // Handles "Firoz & Shahenshah" → ["Firoz", "Shahenshah"]
  // Or single "Ammy papa" → ["Ammy papa"]
  const investorNames = (inv?.name || 'Investor')
    .split('&')
    .map(n => n.trim())
    .filter(n => n.length > 0);
  const personCount = investorNames.length;
  const perPersonAmount = personCount > 0 ? Math.round(investorPool / personCount) : investorPool;
  const isMultiPerson = personCount > 1;

  const onlinePct = totalRev > 0 ? Math.round(onRev * 100 / totalRev) : 0;
  const offlinePct = totalRev > 0 ? Math.round(offRev * 100 / totalRev) : 0;

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    });
  }

  const today = new Date().toLocaleDateString('en-GB');

  renderShell(`
    <div class="card no-print">
      <h1>📊 Investor Report</h1>
      <button class="secondary btn-sm" onclick="renderManageInvestors()">← Back</button>
      <div class="form-grid" style="margin-top:8px;">
        <div class="form-group">
          <label>Month</label>
          <select onchange="renderInvestorReport('${investorId}','${roomId}',this.value)">
            ${months.map(m => `<option value="${m.val}" ${m.val === selMonth ? 'selected' : ''}>${m.lbl}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          <button class="btn-sm" onclick="printInvestorReport('${inv?.name || 'Investor'}','${room?.nickname || roomId}','${monthYear}')">🖨️ Print / Save PDF</button>
          
          ${excludedBookings.length > 0 ? `<button class="btn-sm outline" style="margin-left:6px;" onclick="renderFriendsReport('${investorId}','${roomId}','${selMonth}')">🎁 Friends Report (${excludedBookings.length})</button>` : ''}
        </div>
      </div>
    </div>

    <div class="card report-doc" style="max-width:800px;margin:0 auto;padding:30px;background:#fff;box-shadow:0 8px 32px rgba(255,90,95,0.15);border:1px solid #FFEBEC;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF5A5F 0%,#FC642D 100%);color:#fff;padding:28px 20px;border-radius:12px 12px 0 0;text-align:center;margin:-30px -30px 20px -30px;">
        <img src="assets/logo.png" alt="Logo" style="width:60px;height:60px;border-radius:12px;background:#fff;padding:6px;margin-bottom:8px;" />
        <div style="font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.7);margin-bottom:4px;">${BRAND.toUpperCase()}</div>
        <h1 style="font-size:22px;margin:4px 0;letter-spacing:2px;color:#fff;font-weight:800;">MONTHLY INVESTOR EARNINGS</h1>
        <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:6px;">${monthYear}</div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#FF5A5F,#FC642D);color:#fff;border-radius:6px;">🏠 Property Overview</div>
        <div style="line-height:2;font-size:14px;">
          <div><strong>Property Owner Name:</strong> ${inv?.name || '-'}</div>
          <div><strong>Property Name:</strong> ${room?.nickname || room?.property_name || '-'}</div>
          <div><strong>Location:</strong> ${room?.address || 'Lucknow'}</div>
          <div><strong>Reporting Period:</strong> ${monthYear}</div>
          <div><strong>Report Date:</strong> ${today}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#484848,#767676);color:#fff;border-radius:6px;">📋 Executive Summary</div>
        <p style="font-size:13px;line-height:1.8;text-align:justify;margin:8px 0;">
          This report outlines the financial and operational performance of <strong>${room?.nickname}</strong>, Lucknow for ${monthYear}.
          The property generated revenue through <strong>Airbnb platform bookings</strong> along with <strong>direct offline reservations</strong> during the reporting period.
        </p>
        <p style="font-size:13px;line-height:1.8;text-align:justify;margin:8px 0;">
          Operational expenses included rent, housekeeping, supplies, transportation, and maintenance-related items.
          After deducting all operational costs, the remaining profit has been distributed according to the
          <strong>${INVESTOR_POOL_PCT}% investor pool and ${COMPANY_PCT}% ${BRAND}</strong> revenue-sharing model${investorPoolShare < 100 ? ` (this investor holds ${investorPoolShare}% of the investor pool)` : ''}.
        </p>
        <p style="font-size:13px;line-height:1.8;text-align:justify;margin:8px 0;">
          All financial figures have been verified and recalculated.
        </p>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#00A699,#007A87);color:#fff;border-radius:6px;">💰 Key Financial Metrics</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tbody>
            <tr><td style="padding:8px;border:1px solid #ccc;"><strong>Total Gross Revenue</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalRev.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ccc;"><strong>Total Operating Expenses</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalExp.toLocaleString('en-IN')}</td></tr>
            <tr style="background:linear-gradient(90deg,#FFEBEC,#FFE4D6);"><td style="padding:8px;border:1px solid #FF5A5F;"><strong>Operating Profit</strong></td><td style="padding:8px;border:1px solid #ccc;text-align:right;"><strong>₹${profit.toLocaleString('en-IN')}</strong></td></tr>
            <tr style="background:#E6F2F4;"><td style="padding:8px;border:1px solid #007A87;"><strong>${BRAND} Share (${COMPANY_PCT}%)</strong></td><td style="padding:8px;border:1px solid #007A87;text-align:right;color:#007A87;font-weight:700;font-size:14px;">₹${companyAmount.toLocaleString('en-IN')}</td></tr>
            <tr style="background:#E0F5F3;"><td style="padding:8px;border:2px solid #00A699;"><strong>Total Investor Pool ${isMultiPerson ? `(${inv?.name || ''})` : `(${INVESTOR_POOL_PCT}%)`}</strong></td><td style="padding:8px;border:2px solid #00A699;text-align:right;color:#00A699;font-weight:700;font-size:16px;">₹${investorPool.toLocaleString('en-IN')}</td></tr>
            ${isMultiPerson ? investorNames.map(n => `<tr style="background:#F0FAF9;"><td style="padding:8px;border:1px solid #ccc;padding-left:24px;">↳ ${n} Share (${(100/personCount).toFixed(2)}%)</td><td style="padding:8px;border:1px solid #ccc;text-align:right;color:#00A699;font-weight:600;">₹${perPersonAmount.toLocaleString('en-IN')}</td></tr>`).join('') : ''}
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#007A87,#00A699);color:#fff;border-radius:6px;">📈 Revenue Breakdown</div>

        <div style="font-size:14px;font-weight:600;margin:10px 0 4px;">🌐 Online Bookings (Airbnb)</div>
        <div style="font-size:13px;margin-left:12px;">
          ${onBks.length === 0 
            ? '<div style="padding:8px;color:#999;font-style:italic;">🌙 No online bookings this month</div>'
            : `<div>Nights Booked: <strong>${onNights}</strong></div>
               <div>Revenue: <strong>₹${onRev.toLocaleString('en-IN')}</strong></div>`}
        </div>

        <div style="font-size:14px;font-weight:600;margin:14px 0 4px;">🏠 Offline / Direct Bookings</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">
          <thead>
            <tr style="background:#F7F7F7;border-bottom:2px solid #FF5A5F;">
              <th style="padding:6px;border:1px solid #ccc;">Guest</th>
              <th style="padding:6px;border:1px solid #ccc;">Check-in</th>
              <th style="padding:6px;border:1px solid #ccc;">Check-out</th>
              <th style="padding:6px;border:1px solid #ccc;">Nights</th>
              <th style="padding:6px;border:1px solid #ccc;text-align:right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${offBks.length === 0 ? '<tr><td colspan="5" style="padding:12px;border:1px solid #ccc;text-align:center;color:#999;font-style:italic;">🌙 No offline bookings this month</td></tr>' : ''}
            ${offBks.map(b => `
              <tr>
                <td style="padding:6px;border:1px solid #ccc;">${b.guest_name || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;">${b.check_in || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;">${b.check_out || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cn(b)}</td>
                <td style="padding:6px;border:1px solid #ccc;text-align:right;">₹${(pm[b.booking_id] || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="padding:8px;text-align:center;color:#999;border:1px solid #ccc;">No offline bookings</td></tr>'}
            <tr style="background:#FFF0F0;font-weight:700;color:#484848;">
              <td colspan="3" style="padding:6px;border:1px solid #ccc;text-align:right;">Total Offline:</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:center;">${offNights}</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:right;">₹${offRev.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        ${reviewBks.length > 0 ? `
        <div style="font-size:14px;font-weight:600;margin:14px 0 4px;color:#722ED1;">⭐ Review Bookings (Airbnb Reviews)</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">
          <thead>
            <tr style="background:#F5F0FF;border-bottom:2px solid #722ED1;">
              <th style="padding:6px;border:1px solid #ccc;">Guest</th>
              <th style="padding:6px;border:1px solid #ccc;">Check-in</th>
              <th style="padding:6px;border:1px solid #ccc;">Check-out</th>
              <th style="padding:6px;border:1px solid #ccc;">Nights</th>
              <th style="padding:6px;border:1px solid #ccc;text-align:right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${reviewBks.map(b => `
              <tr>
                <td style="padding:6px;border:1px solid #ccc;">${b.guest_name || '-'} <span style="background:#722ED1;color:#fff;padding:1px 4px;border-radius:3px;font-size:9px;">REVIEW</span></td>
                <td style="padding:6px;border:1px solid #ccc;">${b.check_in || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;">${b.check_out || '-'}</td>
                <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cn(b)}</td>
                <td style="padding:6px;border:1px solid #ccc;text-align:right;">₹${(pm[b.booking_id] || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr style="background:#F5F0FF;font-weight:700;">
              <td colspan="3" style="padding:6px;border:1px solid #ccc;">Review Bookings Total</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:center;">${reviewNights}</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:right;">₹${reviewRev.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:11px;color:#666;margin-top:4px;font-style:italic;">
          💡 Review bookings help build Airbnb ratings and visibility
        </div>
        ` : ''}
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#FC642D,#FF5A5F);color:#fff;border-radius:6px;">📊 Total Revenue Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F7F7F7;border-bottom:2px solid #FF5A5F;">
              <th style="padding:8px;border:1px solid #ccc;">Source</th>
              <th style="padding:8px;border:1px solid #ccc;">Nights</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right;">Revenue</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:center;">% Contribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">Airbnb</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${onNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${onRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${onlinePct}%</td>
            </tr>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">Offline</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${offNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${offRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${offlinePct}%</td>
            </tr>
            ${reviewBks.length > 0 ? `<tr style="background:#F5F0FF;">
              <td style="padding:8px;border:1px solid #ccc;">⭐ Review</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${reviewNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${reviewRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${totalRev > 0 ? Math.round(reviewRev * 100 / totalRev) : 0}%</td>
            </tr>` : ''}
            <tr style="background:#FFF0F0;font-weight:700;color:#484848;">
              <td style="padding:8px;border:1px solid #ccc;">Total</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${totalNights}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalRev.toLocaleString('en-IN')}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#FF5A5F,#484848);color:#fff;border-radius:6px;">💸 Expense Summary (${monthName} ${selMonth.split('-')[0]})</div>
        ${useDefaults ? '<div style="font-size:11px;color:#666;font-style:italic;margin-bottom:6px;">ℹ️ Showing default expenses (actual not logged)</div>' : ''}
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F7F7F7;border-bottom:2px solid #FF5A5F;">
              <th style="padding:8px;border:1px solid #ccc;">Expense Category</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${useDefaults
              ? (defaults || []).map(d => `
                <tr>
                  <td style="padding:8px;border:1px solid #ccc;">${d.expense_name}</td>
                  <td style="padding:8px;border:1px solid #ccc;text-align:right;">${(d.default_amount || 0) === 0 ? 'Free' : '₹' + d.default_amount.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')
              : (expenses || []).map(e => `
                <tr>
                  <td style="padding:8px;border:1px solid #ccc;">${e.expense_categories?.category_name || '-'}</td>
                  <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            <tr style="background:#FFF0F0;font-weight:700;color:#484848;">
              <td style="padding:8px;border:1px solid #ccc;">Total Operating Expenses</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${totalExp.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#FC642D,#FF5A5F);color:#fff;border-radius:6px;">💹 Profitability Calculation</div>
        <div style="font-size:13px;line-height:2;padding:10px;background:#f9f9f9;border:1px solid #ccc;">
          <div>Total Revenue: ₹${totalRev.toLocaleString('en-IN')}</div>
          <div>Total Expenses: − ₹${totalExp.toLocaleString('en-IN')}</div>
          <div style="border-top:1px solid #999;margin-top:4px;padding-top:4px;"><strong>Operating Profit = ₹${profit.toLocaleString('en-IN')}</strong></div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#484848,#FF5A5F);color:#fff;border-radius:6px;">🎯 Profit Distribution – ${monthYear}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F7F7F7;border-bottom:2px solid #FF5A5F;">
              <th style="padding:8px;border:1px solid #ccc;">Stakeholder</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:center;">Share</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px;border:1px solid #ccc;">${BRAND} (Company Share)</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${COMPANY_PCT}%</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;color:#0a5599;font-weight:700;">₹${companyAmount.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="background:#E0F5F3;">
              <td style="padding:8px;border:2px solid #00A699;"><strong>Total Investor Pool — ${inv?.name || '-'}</strong></td>
              <td style="padding:8px;border:2px solid #00A699;text-align:center;">${INVESTOR_POOL_PCT}%</td>
              <td style="padding:8px;border:2px solid #00A699;text-align:right;color:#00A699;font-weight:700;font-size:14px;">₹${investorPool.toLocaleString('en-IN')}</td>
            </tr>
            ${isMultiPerson ? investorNames.map(n => `<tr style="background:#F0FAF9;">
              <td style="padding:8px;border:1px solid #ccc;padding-left:24px;">↳ ${n}</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">${(100/personCount).toFixed(2)}% of pool</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;color:#00A699;font-weight:600;">₹${perPersonAmount.toLocaleString('en-IN')}</td>
            </tr>`).join('') : ''}
            <tr style="background:#FFF0F0;font-weight:700;color:#484848;">
              <td style="padding:8px;border:1px solid #ccc;">Total Distributed Profit</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:center;">100%</td>
              <td style="padding:8px;border:1px solid #ccc;text-align:right;">₹${profit.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#484848,#767676);color:#fff;border-radius:6px;">🏛️ Ownership & Operating Structure</div>
        <div style="font-size:13px;line-height:2;">
          <div><strong>Property Ownership:</strong> ${inv?.name || '-'}</div>
          <div><strong>Property Operator:</strong> ${BRAND}</div>
          <div style="margin-top:8px;"><strong>Revenue Sharing Model:</strong></div>
          <div style="margin-left:16px;">• ${BRAND} (Company): ${COMPANY_PCT}%</div>
          <div style="margin-left:16px;">• Investor Pool: ${INVESTOR_POOL_PCT}%</div>
          ${isMultiPerson ? `<div style="margin-top:8px;"><strong>Investor Split (${personCount} people):</strong></div>` + investorNames.map(n => `<div style="margin-left:32px;color:#00A699;">↳ ${n}: ${(100/personCount).toFixed(2)}% of investor pool</div>`).join('') : ''}
        </div>
      </div>

      ${hiddenCount > 0 ? `
      <div style="margin-bottom:20px;padding:14px;background:#FFF7E6;border-left:4px solid #FF9500;border-radius:6px;">
        <div style="font-size:13px;color:#666;">
          <strong>📝 Note:</strong> ${hiddenCount} booking${hiddenCount > 1 ? 's' : ''} marked as internal — not included in this report.
        </div>
      </div>
      ` : ''}
      
      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#00A699,#007A87);color:#fff;border-radius:6px;">📝 Management Commentary</div>
        <p style="font-size:13px;line-height:1.8;text-align:justify;">
          <strong>${room?.nickname}</strong> maintained ${totalRev > 50000 ? 'strong' : totalRev > 20000 ? 'stable' : 'moderate'} booking performance during ${monthYear}
          with the majority of revenue generated through
          ${onRev > offRev ? '<strong>Airbnb</strong>' : '<strong>direct offline</strong>'} bookings.
          While the property operates under a rental cost structure, the overall expense levels remained controlled,
          allowing the property to generate a ${profit >= 0 ? 'positive' : 'negative'} operating margin.
        </p>
        <p style="font-size:13px;line-height:1.8;text-align:justify;">
          With continued booking demand and optimized pricing strategies, the property is expected to maintain
          stable performance and improve profitability in the coming months.
        </p>
      </div>

      <div style="background:linear-gradient(135deg,#484848,#767676);color:#fff;padding:20px;margin:20px -30px -30px -30px;border-radius:0 0 12px 12px;text-align:center;">
        <img src="assets/logo.png" alt="Logo" style="width:40px;height:40px;border-radius:8px;background:#fff;padding:4px;margin-bottom:6px;" />
        <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;margin-bottom:8px;">${BRAND.toUpperCase()}</div>
        <div style="font-size:12px;line-height:1.8;color:rgba(255,255,255,0.9);">
          <div><strong style="color:#fff;">Prepared By:</strong> NISHA KHAN</div>
          <div><strong style="color:#fff;">Operator:</strong> ${BRAND}</div>
          <div><strong style="color:#fff;">Report Date:</strong> ${today}</div>
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:8px;">
          🌐 uniquehavenhomesstay.com
        </div>
      </div>
    </div>

    <style>
      @media print {
        @page {
          size: A4;
          margin: 15mm 12mm;
        }
        .sidebar, .no-print, button, .bottom-nav, #bottomNav, .top-bar, #topBar, .drawer, #drawer, nav[class*="bottom"] { display: none !important; }
        .app-container { display: block !important; }
        .main-content { margin: 0 !important; padding: 0 !important; }
        .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
        body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .report-doc {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 11pt;
        }
        .report-doc h1 { font-size: 16pt !important; }
        .report-doc div[style*="font-size:16px"] { font-size: 13pt !important; }
        .report-doc table { page-break-inside: avoid; }
        .report-doc tr { page-break-inside: avoid; }
        .report-doc > div { page-break-inside: avoid; margin-bottom: 12px !important; }
      }
    </style>
  `, 'investors');
}

// ============ INVESTOR VIEW (Read-Only) ============
function filterByRange(bks, range) {
  if (range === 'All') return bks;
  const now = new Date();
  let start;
  if (range === 'Today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === 'Week') { start = new Date(now); start.setDate(now.getDate() - 7); }
  else if (range === 'Month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else return bks;
  return bks.filter(b => b.check_in && new Date(b.check_in) >= start);
}

async function renderInvestorView(range = 'Month') {
  if (!SESSION.investorId) { showError('No property linked.'); return; }
  appEl.innerHTML = `<div class="wrap" style="max-width:650px;"><div class="loading">Loading...</div></div>`;

  const { data: inv } = await sb.from('investors').select('*').eq('investor_id', SESSION.investorId).single();
  const { data: links } = await sb.from('investor_properties')
    .select('room_id, share_percent, rooms(unit_no, property_name, nickname, checkin_manager)')
    .eq('investor_id', SESSION.investorId);
  const rids = (links || []).map(l => l.room_id);

  const { data: allBk } = rids.length
    ? await sb.from('guest_register')
        .select('booking_id, guest_name, room_id, booking_mode, check_in, check_out, total_amount, rooms(unit_no, nickname)')
        .in('room_id', rids).order('check_in', { ascending: false })
    : { data: [] };

  const bks = filterByRange(allBk || [], range);
  const pm = await getPaidMap(bks.map(b => b.booking_id));
  const rev = bks.reduce((s, b) => s + (pm[b.booking_id] || 0), 0);
  
  // NEW: Use investor_properties.share_percent (per property)
  // For dashboard view (multiple properties), calculate weighted avg amount
  const COMPANY_PCT = 30;
  const INVESTOR_POOL_PCT = 70;
  // Estimate investor amount using pool logic (no expenses here - just revenue view)
  const investorPool = rev * INVESTOR_POOL_PCT / 100;
  // Average share % across all linked properties
  const avgShare = (links && links.length > 0)
    ? links.reduce((s, l) => s + (l.share_percent || 100), 0) / links.length
    : 100;
  const investorAmountEstimated = Math.round(investorPool * avgShare / 100);
  const share = INVESTOR_POOL_PCT;  // for display

  appEl.innerHTML = `
    <div class="wrap" style="max-width:650px;">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:52px;height:52px;border-radius:12px;margin-bottom:6px;" />
        <h1>${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName || inv?.name || 'Investor'}</div>
        <div class="badge blue">Investor · View Only</div>
        <div style="margin-top:10px;"><button class="danger btn-sm" onclick="logout()">🚪 Logout</button></div>
      </div>

      <div class="card">
        <div class="form-group"><label>Period</label>
          <select id="invRange">
            <option value="Today" ${range === 'Today' ? 'selected' : ''}>Today</option>
            <option value="Week" ${range === 'Week' ? 'selected' : ''}>Week</option>
            <option value="Month" ${range === 'Month' ? 'selected' : ''}>Month</option>
            <option value="All" ${range === 'All' ? 'selected' : ''}>All</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="metric-row"><span class="metric-label">Total Revenue</span><span class="metric-value">₹${rev.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">${BRAND} Share (${COMPANY_PCT}%)</span><span class="metric-value" style="color:#007A87;">₹${Math.round(rev * COMPANY_PCT / 100).toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Investor Pool (${INVESTOR_POOL_PCT}%)</span><span class="metric-value" style="color:var(--green);">₹${Math.round(investorPool).toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Your Estimated Share</span><span class="metric-value" style="color:var(--green);font-weight:700;">₹${investorAmountEstimated.toLocaleString('en-IN')}</span></div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;">
          💡 Note: This is revenue-based estimate. Actual share depends on expenses. See detailed report for accurate breakdown.
        </div>
      </div>

      <div class="card">
        <div class="section-title">Properties</div>
        ${(links || []).map(l => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);">
            <strong>${propLabel(l.rooms) || '-'}</strong><br>
            <small style="color:var(--muted);">${l.rooms?.property_name || ''}</small>
          </div>
        `).join('') || '<div class="sub">None</div>'}
      </div>

      <div class="card">
        <div class="section-title">Bookings (${range})</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Guest</th><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>₹</th></tr></thead>
          <tbody>${bks.map(b => `<tr>
            <td>${b.guest_name || '-'}</td>
            <td>${propLabel(b.rooms) || '-'}</td>
            <td><span class="channel-badge ${b.booking_mode === 'Online-Airbnb' ? 'channel-airbnb' : 'channel-direct'}">${b.booking_mode === 'Online-Airbnb' ? '🌐' : '🏠'}</span></td>
            <td>${b.check_in || '-'}</td>
            <td>${b.check_out || '-'}</td>
            <td style="color:var(--green);">₹${(pm[b.booking_id] || 0).toLocaleString('en-IN')}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="sub">None</td></tr>'}</tbody>
        </table></div>
      </div>

      <div class="card" style="text-align:center;">
        <button class="danger btn-sm" onclick="logout()">🚪 Logout</button>
      </div>
    </div>`;

  document.getElementById('invRange').onchange = e => renderInvestorView(e.target.value);
}

// ============ EMPLOYEE VIEW ============
async function renderEmployeeView() {
  if (!SESSION.empId) {
    appEl.innerHTML = `<div class="wrap"><div class="card"><h1>⚠️</h1><div class="error">Employee ID not set</div><button onclick="logout()">Logout</button></div></div>`;
    return;
  }

  const [{data:emp}, {data:sal}, {data:adv}, {data:tasks}, {data:att}] = await Promise.all([
    sb.from("employees").select("*").eq("emp_id", SESSION.empId).single(),
    sb.from("salary_tracker").select("salary_due, salary_paid").eq("emp_id", SESSION.empId),
    sb.from("advance_tracker").select("advance_amount, repaid_amount").eq("emp_id", SESSION.empId),
    sb.from("employee_tasks").select("task_description, status").eq("emp_id", SESSION.empId).eq("status", "Pending"),
    sb.from("attendance_log").select("status, att_date").eq("emp_id", SESSION.empId),
  ]);

  const pSal = (sal || []).reduce((s, r) => s + ((r.salary_due || 0) - (r.salary_paid || 0)), 0);
  const pAdv = (adv || []).reduce((s, r) => s + ((r.advance_amount || 0) - (r.repaid_amount || 0)), 0);
  const cm = new Date().toISOString().slice(0, 7);
  const mr = (att || []).filter(a => a.att_date?.startsWith(cm));
  const pr = mr.filter(a => a.status === 'Present').length;
  const ab = mr.filter(a => a.status === 'Absent').length;

  appEl.innerHTML = `
    <div class="wrap">
      <div class="card" style="text-align:center;">
        <img src="assets/logo.png" alt="" style="width:48px;height:48px;border-radius:10px;margin-bottom:6px;" />
        <h1>${BRAND}</h1>
        <div class="sub">👋 ${SESSION.displayName}</div>
        <button class="secondary btn-sm" onclick="logout()">🚪 Logout</button>
      </div>
      <div class="card">
        <div class="metric-row"><span class="metric-label">Name</span><span class="metric-value" style="font-size:15px;">${emp?.name || '-'}</span></div>
        <div class="metric-row"><span class="metric-label">Role</span><span>${emp?.role || '-'}</span></div>
        <div class="metric-row"><span class="metric-label">Salary</span><span class="metric-value">₹${(emp?.monthly_salary || 0).toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Salary Pending</span><span class="metric-value${pSal > 0 ? ' warn' : ''}" style="color:${pSal > 0 ? 'var(--red)' : 'var(--green)'};">₹${pSal.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Advance Due</span><span class="metric-value${pAdv > 0 ? ' warn' : ''}" style="color:${pAdv > 0 ? 'var(--red)' : 'var(--green)'};">₹${pAdv.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Present</span><span class="metric-value" style="color:var(--green);">${pr}</span></div>
        <div class="metric-row"><span class="metric-label">Absent</span><span class="metric-value${ab > 0 ? ' warn' : ''}" style="color:${ab > 0 ? 'var(--red)' : 'var(--green)'};">${ab}</span></div>
      </div>
      <div class="card">
        <div class="section-title">Pending Tasks</div>
        ${(tasks || []).length === 0
          ? '<div class="sub">No tasks ✅</div>'
          : (tasks || []).map(t => `<div class="metric-row"><span class="metric-label">${t.task_description}</span><span class="badge red">Pending</span></div>`).join('')}
      </div>
    </div>`;
}

// ============ PRINT WITH AUTO FILENAME ============

// ═══ WHATSAPP INVESTOR REPORT ═══
window.whatsappInvestorReport = async function(investorId, roomId, monthYear) {
  // If no monthYear passed, prompt user to select
  if (!monthYear) {
    const now = new Date();
    const monthOpts = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleString('en-IN', {month: 'long', year: 'numeric'});
      monthOpts.push({ key, label });
    }
    let promptMsg = '📱 Send WhatsApp Report\n\nSelect month number:\n';
    monthOpts.forEach((o, i) => {
      const marker = i === 0 ? ' (current)' : i === 1 ? ' ⭐' : '';
      promptMsg += (i + 1) + '. ' + o.label + marker + '\n';
    });
    promptMsg += '\nEnter number:';
    const choice = prompt(promptMsg, '2');
    if (choice === null) return;
    const idx = parseInt(choice) - 1;
    if (isNaN(idx) || idx < 0 || idx >= monthOpts.length) return;
    monthYear = monthOpts[idx].label;
  }
  try {
    // Fetch investor details
    const { data: inv } = await sb.from('investors').select('*').eq('investor_id', investorId).single();
    if (!inv) { fsn.error('Error', 'Investor not found'); return; }

    // Fetch room
    const { data: room } = await sb.from('rooms').select('*').eq('room_id', roomId).single();

    // Calculate month range
    const [year, month] = monthYear.split('-');
    const startDate = year + '-' + month.padStart(2, '0') + '-01';
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = year + '-' + month.padStart(2, '0') + '-' + lastDay;

    // Fetch bookings + payments for this room in the month
    const { data: bookings } = await sb.from('guest_register')
      .select('booking_id, guest_name, check_in, check_out, total_amount, booking_mode')
      .eq('room_id', roomId)
      .gte('check_in', startDate)
      .lte('check_in', endDate)
      .neq('is_cancelled', true)
      .neq('verification_status', 'rejected');

    const bks = bookings || [];
    const totalRevenue = bks.reduce((s, b) => s + (b.total_amount || 0), 0);
    
    // NEW MULTI-INVESTOR FORMULA
    // Fetch this investor's share % for this specific property
    const { data: propLink } = await sb.from('investor_properties')
      .select('share_percent')
      .eq('investor_id', investorId)
      .eq('room_id', roomId)
      .maybeSingle();
    const poolSharePct = propLink?.share_percent || 100;
    
    // Fetch expenses for accurate profit calc
    const monthShortWA = new Date(startDate).toLocaleString('en-IN', {month:'short', year:'numeric'}).replace(' ','-');
    const { data: monthExps } = await sb.from('expenses')
      .select('amount').eq('room_id', roomId).eq('month', monthShortWA);
    const totalExpensesWA = (monthExps || []).reduce((s, e) => s + (e.amount || 0), 0);
    
    const profitWA = totalRevenue - totalExpensesWA;
    const houseAmount = Math.round(profitWA * 0.30);  // Company 30%
    const investorPoolWA = profitWA - houseAmount;    // Pool 70%
    const investorAmount = Math.round(investorPoolWA * poolSharePct / 100);
    const investorShare = poolSharePct;  // for display
    
    // Split combined names for cleaner display
    const invNames = (inv.name || 'Investor').split('&').map(n => n.trim()).filter(n => n);
    const isMulti = invNames.length > 1;
    const perPerson = isMulti ? Math.round(investorPoolWA / invNames.length) : investorAmount;

    const NL = String.fromCharCode(10);
    const monthName = new Date(startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const roomName = room ? (room.nickname || room.property_name || roomId) : roomId;

    let bkList = '';
    bks.forEach((b, i) => {
      const mode = b.booking_mode === 'Online-Airbnb' ? 'Airbnb' : 'Direct';
      bkList += (i + 1) + '. ' + b.guest_name + NL +
        '   ' + b.check_in + ' → ' + b.check_out + ' (' + mode + ')' + NL +
        '   Rs.' + (b.total_amount || 0).toLocaleString('en-IN') + NL + NL;
    });

    const msg = '*UNIQUE HAVEN HOMES STAY*' + NL +
      '*Investor Report — ' + monthName + '*' + NL + NL +
      '👤 Investor: *' + inv.name + '*' + NL +
      '🏠 Property: *' + roomName + '*' + NL + NL +
      '━━━━━━━━━━━━━━━━━━━━' + NL +
      '*💰 SUMMARY*' + NL +
      '━━━━━━━━━━━━━━━━━━━━' + NL +
      'Total Bookings: ' + bks.length + NL +
      'Total Revenue: Rs.' + totalRevenue.toLocaleString('en-IN') + NL +
      'Total Expenses: Rs.' + totalExpensesWA.toLocaleString('en-IN') + NL +
      'Operating Profit: Rs.' + profitWA.toLocaleString('en-IN') + NL + NL +
      '🏢 House Share (30%): Rs.' + houseAmount.toLocaleString('en-IN') + NL +
      '👥 Investor Pool (70%): Rs.' + investorPoolWA.toLocaleString('en-IN') + NL +
      (isMulti 
        ? invNames.map(n => '   ↳ ' + n + ' (' + (100/invNames.length).toFixed(2) + '%): Rs.' + perPerson.toLocaleString('en-IN')).join(NL) + NL
        : '   ↳ *Your Share: Rs.' + investorAmount.toLocaleString('en-IN') + '*' + NL) + NL +
      (bks.length > 0 ? '*📅 BOOKINGS:*' + NL + bkList : '_No bookings this month_' + NL + NL) +
      '━━━━━━━━━━━━━━━━━━━━' + NL +
      '📞 Contact:' + NL +
      'Mr. Shahanshah - 9450055554' + NL +
      'Mr. Firoz Khan - 8299600709';

    const phone = (inv.phone || '').replace(/[^0-9]/g, '');
    const shareModal = document.createElement('div');
    shareModal.className = 'modal-overlay';
    shareModal.onclick = e => { if (e.target === shareModal) shareModal.remove(); };

    const q = String.fromCharCode(39);
    const sendBtn = phone
      ? '<button style="background:#25D366;color:#fff;" onclick="window.open(' + q + 'https://wa.me/91' + phone + '?text=' + q + '+encodeURIComponent(document.getElementById(' + q + 'waInvMsg' + q + ').value),' + q + '_blank' + q + ')">📱 Send to ' + inv.name + '</button>'
      : '';

    shareModal.innerHTML =
      '<div class="modal-box" style="max-width:600px;">' +
        '<button class="modal-close" onclick="this.closest(' + q + '.modal-overlay' + q + ').remove()">✕</button>' +
        '<h2>📱 WhatsApp Investor Report</h2>' +
        '<textarea id="waInvMsg" style="width:100%;height:400px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">' + msg + '</textarea>' +
        '<div class="btn-row" style="margin-top:12px;">' +
          sendBtn +
          '<button style="background:#128C7E;color:#fff;" onclick="window.open(' + q + 'https://wa.me/?text=' + q + '+encodeURIComponent(document.getElementById(' + q + 'waInvMsg' + q + ').value),' + q + '_blank' + q + ')">📤 Share</button>' +
          '<button class="outline" onclick="navigator.clipboard.writeText(document.getElementById(' + q + 'waInvMsg' + q + ').value);fsn.success(' + q + 'Copied' + q + ',' + q + 'Message copied' + q + ')">📋 Copy</button>' +
          '<button class="outline" onclick="this.closest(' + q + '.modal-overlay' + q + ').remove()">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(shareModal);
  } catch (e) {
    fsn.error('Error', e.message || 'Failed to generate report');
  }
};

function printInvestorReport(investorName, propertyName, monthYear) {
  const cleanName = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanName(investorName)}_${cleanName(propertyName)}_${cleanName(monthYear)}_Report`;

  // Get the report element from current page
  const reportEl = document.querySelector('.report-doc');
  if (!reportEl) {
    alert('Report not found. Please try again.');
    return;
  }

  const reportHTML = reportEl.outerHTML;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Build clean HTML for new window
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    @page { size: A4; margin: 15mm 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #fff;
      color: #222;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-doc {
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
    }
    table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
    tr { page-break-inside: avoid; }
    h1 { font-size: 20pt; margin: 0 0 8px; }
    h2 { font-size: 14pt; margin: 12px 0 6px; }
    .footer-brand {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${reportHTML}
  <div class="footer-brand">
    Report generated on ${today} · Website developed by Praveen Singh
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked! Please allow popups for this site.');
    return;
  }
  win.document.title = filename;
  win.document.write(html);
  win.document.close();
}


// ============ FRIENDS/COMPLIMENTARY STAYS REPORT ============
async function renderFriendsReport(investorId, roomId, month) {
  renderShell(`<div class="loading">Generating friends report...</div>`, 'investors');

  const now = new Date();
  const selMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthDate = new Date(selMonth + '-01');
  const monthYear = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const monthStart = selMonth + '-01';
  const monthEnd = new Date(parseInt(selMonth.split('-')[0]), parseInt(selMonth.split('-')[1]), 0).toISOString().slice(0, 10);

  const [{data:inv}, {data:room}, {data:bookings}] = await Promise.all([
    sb.from('investors').select('*').eq('investor_id', investorId).single(),
    sb.from('rooms').select('*').eq('room_id', roomId).single(),
    sb.from('guest_register').select('*').eq('room_id', roomId).gte('check_in', monthStart).lte('check_in', monthEnd).order('check_in'),
  ]);

  // Only friends bookings
  const excludeKeywords = ['(friends)', '(complimentary)', '(comp)', '(free)', '(owner)', '(family)'];
  const friendsBookings = (bookings || []).filter(b => {
    const name = (b.guest_name || '').toLowerCase();
    const notes = (b.notes || '').toLowerCase();
    return excludeKeywords.some(k => name.includes(k) || notes.includes(k));
  });

  const cn = b => b.check_in && b.check_out ? calcNights(b.check_in, b.check_out) : 0;
  const totalNights = friendsBookings.reduce((s, b) => s + cn(b), 0);

  const today = new Date().toLocaleDateString('en-GB');

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      lbl: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    });
  }

  renderShell(`
    <div class="card no-print">
      <h1>🎁 Complimentary / Friends Report</h1>
      <button class="secondary btn-sm" onclick="renderInvestorReport('${investorId}','${roomId}','${selMonth}')">← Back to Main Report</button>
      <div class="form-grid" style="margin-top:8px;">
        <div class="form-group">
          <label>Month</label>
          <select onchange="renderFriendsReport('${investorId}','${roomId}',this.value)">
            ${months.map(m => `<option value="${m.val}" ${m.val === selMonth ? 'selected' : ''}>${m.lbl}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="justify-content:flex-end;">
          <button class="btn-sm" onclick="printInvestorReport('${inv?.name || 'Investor'}','${room?.nickname || roomId}_Friends','${monthYear}')">🖨️ Print / Save PDF</button>
        </div>
      </div>
    </div>

    <div class="card report-doc" style="max-width:800px;margin:0 auto;padding:30px;background:#fff;box-shadow:0 8px 32px rgba(255,90,95,0.15);border:1px solid #FFEBEC;border-radius:12px;overflow:hidden;">

      <div style="background:linear-gradient(135deg,#FFB800 0%,#FC642D 100%);color:#fff;padding:28px 20px;border-radius:12px 12px 0 0;text-align:center;margin:-30px -30px 20px -30px;">
        <img src="assets/logo.png" alt="Logo" style="width:60px;height:60px;border-radius:12px;background:#fff;padding:6px;margin-bottom:8px;" />
        <div style="font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.8);margin-bottom:4px;">${BRAND.toUpperCase()}</div>
        <h1 style="font-size:22px;margin:4px 0;letter-spacing:2px;color:#fff;font-weight:800;">🎁 COMPLIMENTARY STAYS REPORT</h1>
        <div style="font-size:13px;color:rgba(255,255,255,0.95);margin-top:6px;">${monthYear}</div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#FF5A5F,#FC642D);color:#fff;border-radius:6px;">🏠 Property Details</div>
        <div style="line-height:2;font-size:14px;padding:10px;">
          <div><strong>Property:</strong> ${room?.nickname || room?.property_name || '-'}</div>
          <div><strong>Owner:</strong> ${inv?.name || '-'}</div>
          <div><strong>Location:</strong> ${room?.address || 'Lucknow'}</div>
          <div><strong>Reporting Period:</strong> ${monthYear}</div>
          <div><strong>Report Date:</strong> ${today}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:10px;padding:8px 12px;background:linear-gradient(90deg,#FFB800,#FC642D);color:#fff;border-radius:6px;">🎁 Complimentary / Friends Stays</div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#FFF9E6;border-bottom:2px solid #FFB800;">
              <th style="padding:8px;border:1px solid #FFB800;">Guest Name</th>
              <th style="padding:8px;border:1px solid #FFB800;">Phone</th>
              <th style="padding:8px;border:1px solid #FFB800;">Check-in</th>
              <th style="padding:8px;border:1px solid #FFB800;">Check-out</th>
              <th style="padding:8px;border:1px solid #FFB800;text-align:center;">Nights</th>
              <th style="padding:8px;border:1px solid #FFB800;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${friendsBookings.map(b => {
              const name = (b.guest_name || '').toLowerCase();
              let type = 'Complimentary';
              if (name.includes('(friends)')) type = 'Friends';
              else if (name.includes('(owner)')) type = 'Owner';
              else if (name.includes('(family)')) type = 'Family';
              else if (name.includes('(comp)') || name.includes('(complimentary)')) type = 'Complimentary';
              else if (name.includes('(free)')) type = 'Free';

              return `
                <tr>
                  <td style="padding:8px;border:1px solid #FFB800;"><strong>${b.guest_name || '-'}</strong></td>
                  <td style="padding:8px;border:1px solid #FFB800;font-size:12px;">${b.phone || '-'}</td>
                  <td style="padding:8px;border:1px solid #FFB800;">${b.check_in || '-'}</td>
                  <td style="padding:8px;border:1px solid #FFB800;">${b.check_out || '-'}</td>
                  <td style="padding:8px;border:1px solid #FFB800;text-align:center;font-weight:700;">${cn(b)}</td>
                  <td style="padding:8px;border:1px solid #FFB800;"><span style="background:#FFB800;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${type}</span></td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" style="padding:14px;text-align:center;color:#767676;border:1px solid #FFB800;">No complimentary stays this month</td></tr>'}
            ${friendsBookings.length > 0 ? `
            <tr style="background:#FFF0F0;font-weight:700;">
              <td colspan="4" style="padding:10px;border:1px solid #FFB800;text-align:right;">Total Complimentary Nights:</td>
              <td style="padding:10px;border:1px solid #FFB800;text-align:center;font-size:15px;color:#FF5A5F;">${totalNights}</td>
              <td style="padding:10px;border:1px solid #FFB800;text-align:center;color:#767676;font-size:11px;">Not counted in revenue</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      ${friendsBookings.length > 0 ? `
      <div style="margin-bottom:20px;padding:14px;background:#FFF9E6;border-left:4px solid #FFB800;border-radius:6px;font-size:13px;line-height:1.8;">
        <strong style="color:#FC642D;">📌 Note:</strong>
        <div style="margin-top:6px;color:#484848;">
          These bookings are complimentary stays and are NOT included in the revenue calculation of the main investor report.
          They are documented here for transparency and record-keeping purposes only.
        </div>
      </div>
      ` : ''}

      <div style="background:linear-gradient(135deg,#484848,#767676);color:#fff;padding:20px;margin:20px -30px -30px -30px;border-radius:0 0 12px 12px;text-align:center;">
        <img src="assets/logo.png" alt="Logo" style="width:40px;height:40px;border-radius:8px;background:#fff;padding:4px;margin-bottom:6px;" />
        <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;margin-bottom:8px;">${BRAND.toUpperCase()}</div>
        <div style="font-size:12px;line-height:1.8;color:rgba(255,255,255,0.9);">
          <div><strong style="color:#fff;">Prepared By:</strong> NISHA KHAN</div>
          <div><strong style="color:#fff;">Operator:</strong> ${BRAND}</div>
          <div><strong style="color:#fff;">Report Date:</strong> ${today}</div>
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:8px;">
          🌐 uniquehavenhomesstay.com
        </div>
      </div>
    </div>

    <style>
      @media print {
        @page { size: A4; margin: 15mm 12mm; }
        .sidebar, .no-print, button, .bottom-nav, #bottomNav, .top-bar, #topBar, .drawer, #drawer, nav[class*="bottom"] { display: none !important; }
        .app-container { display: block !important; }
        .main-content { margin: 0 !important; padding: 0 !important; }
        .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
        body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .report-doc { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
      }
    </style>
  `, 'investors');
}



// ═══ QUICK ACTIONS — Professional WhatsApp + Email ═══
// ═══ SHOW MONTH SELECTOR MODAL BEFORE SENDING ═══
window.quickWhatsAppInvestor = async function(investorId) {
  // Check investor first
  const { data: inv } = await sb.from('investors').select('name, phone').eq('investor_id', investorId).single();
  if (!inv || !inv.phone) {
    fsn.error('Error', 'Investor not found or no phone number');
    return;
  }
  
  // SIMPLE PROMPT for month selection (works reliably)
  const now = new Date();
  const monthOpts = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleString('en-IN', {month: 'long', year: 'numeric'});
    monthOpts.push({ key, label });
  }
  
  // Build prompt message
  let promptMsg = '📱 Send WhatsApp to ' + inv.name + '\n\n';
  promptMsg += 'Select month number:\n';
  monthOpts.forEach((o, i) => {
    const marker = i === 0 ? ' (current — incomplete)' : i === 1 ? ' ⭐ RECOMMENDED' : '';
    promptMsg += (i + 1) + '. ' + o.label + marker + '\n';
  });
  promptMsg += '\nEnter number (1-6):';
  
  const choice = prompt(promptMsg, '2');  // Default: 2 (last month)
  if (choice === null) return;  // Cancelled
  
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= monthOpts.length) {
    fsn.error('Invalid', 'Please enter number 1-6');
    return;
  }
  
  const selected = monthOpts[idx];
  const [year, month] = selected.key.split('-').map(Number);
  
  // Store for use
  window._waSelectedMonth = {
    year, month,
    monthName: selected.label,
    key: selected.key
  };
  
  await _originalQuickWhatsAppInvestor(investorId);
};

// Old modal code (unused)
async function _unusedModalFunction(investorId) {
  const { data: inv } = await sb.from('investors').select('name, phone').eq('investor_id', investorId).single();
  const monthOpts = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleString('en-IN', {month: 'long', year: 'numeric'});
    monthOpts.push({ key, label });
  }
  
  // Show modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;">
      <h2 style="margin:0 0 8px;font-size:20px;">📱 Send WhatsApp Report</h2>
      <div style="font-size:13px;color:#666;margin-bottom:16px;">
        To: <strong>${inv.name}</strong> (${inv.phone})
      </div>
      
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">📅 Select Report Month:</label>
        <select id="waMonthSelect" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
          ${monthOpts.map((o, i) => `<option value="${o.key}" ${i === 1 ? 'selected' : ''}>${o.label}${i === 0 ? ' (Current — incomplete)' : i === 1 ? ' ⭐ (Recommended)' : ''}</option>`).join('')}
        </select>
        <div style="font-size:11px;color:#888;margin-top:4px;">
          💡 Last month is usually the correct choice for monthly reports
        </div>
      </div>
      
      <div style="margin-bottom:16px;padding:12px;background:#F0F7FF;border-radius:8px;border-left:3px solid #3B82F6;font-size:12px;">
        <strong>Message will include:</strong><br>
        • Investor name<br>
        • Selected month<br>
        • Properties list<br>
        • Investor pool share (70%)<br>
        • Individual split (if multi-investor)
      </div>
      
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="this.closest('.modal-overlay').remove()" 
          style="padding:10px 20px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;">
          Cancel
        </button>
        <button onclick="sendInvestorWhatsAppWithMonth('${investorId}', document.getElementById('waMonthSelect').value)" 
          style="padding:10px 20px;background:#25D366;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
          📱 Send WhatsApp
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// ═══ ACTUAL SEND FUNCTION (called from modal) ═══
window.sendInvestorWhatsAppWithMonth = async function(investorId, selectedMonthKey) {
  // Close modal first
  document.querySelector('.modal-overlay')?.remove();
  
  // Parse selected month
  const [year, month] = selectedMonthKey.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, 1);
  const monthName = selectedDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  
  // Store for the original function to use
  window._waSelectedMonth = { year, month, monthName, key: selectedMonthKey };
  
  // Call original send logic
  await _originalQuickWhatsAppInvestor(investorId);
};

// ═══ ORIGINAL SEND LOGIC (renamed) ═══
async function _originalQuickWhatsAppInvestor(investorId) {
  try {
    // Fetch investor + linked properties
    const { data: inv } = await sb.from('investors').select('*').eq('investor_id', investorId).single();
    if (!inv) { fsn.error('Error', 'Investor not found'); return; }
    if (!inv.phone) { fsn.error('Error', 'Phone number not available'); return; }
    
    // Get linked properties
    const { data: links } = await sb.from('investor_properties')
      .select('room_id, rooms(nickname, property_name)')
      .eq('investor_id', investorId);
    
    const propNames = (links || []).map(l => 
      l.rooms?.nickname || l.rooms?.property_name || l.room_id
    ).join(', ') || 'your properties';
    
    // Format phone (add 91 if 10 digits)
    const phone = inv.phone.replace(/[^0-9]/g, '');
    const finalPhone = phone.length === 10 ? '91' + phone : phone;
    
    // Get current month name
    // Use SELECTED month from prompt (or current if none)
    const selectedM = window._waSelectedMonth;
    const now = selectedM ? new Date(selectedM.year, selectedM.month - 1, 1) : new Date();
    const monthName = selectedM ? selectedM.monthName : now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    console.log('📅 WhatsApp using month:', monthName, selectedM ? '(from prompt)' : '(current)');
    // NEW: Use pool logic (70% investor pool, split among multi-investors)
    const invNamesArr = (inv.name || 'Investor').split('&').map(n => n.trim()).filter(n => n);
    const isMultiInv = invNamesArr.length > 1;
    const perInvestorPct = (100 / invNamesArr.length).toFixed(2);
    
    // Professional WhatsApp message
    const NL = String.fromCharCode(10);
    const message = 
      '🏨 *UNIQUE HAVEN HOMES STAY*' + NL + NL +
      'Namaste ' + inv.name + ' ji 🙏' + NL + NL +
      'Umeed hai aap kushal honge.' + NL + NL +
      '📅 *' + monthName + '* ki monthly report attached hai (PDF).' + NL + NL +
      '🏠 *Property:* ' + propNames + NL +
      '📊 *Investor Pool Share:* 70% of profit' + NL +
      (isMultiInv 
        ? invNamesArr.map(n => '   ↳ ' + n + ': ' + perInvestorPct + '% of pool').join(NL) + NL
        : '') + NL +
      'Kripya PDF check karein aur koi query ho toh batayein.' + NL + NL +
      '───────────────' + NL +
      '*Regards,*' + NL +
      'Team UHHS' + NL +
      '📞 Mr. Shahanshah: 9450055554' + NL +
      '📞 Mr. Firoz Khan: 8299600709' + NL +
      '🌐 uniquehavenhomesstay.com';
    
    const url = 'https://wa.me/' + finalPhone + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank');
    
    if (typeof fsn !== 'undefined') fsn.success('Opening WhatsApp', 'Message ready for ' + inv.name);
  } catch (e) {
    console.error('WhatsApp error:', e);
    if (typeof fsn !== 'undefined') fsn.error('Error', e.message);
  }
};

window.quickEmailInvestor = async function(investorId) {
  // Show options dialog
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  const q = String.fromCharCode(39);
  
  modal.innerHTML = 
    '<div class="modal-box" style="max-width:450px;">' +
      '<button class="modal-close" onclick="this.closest(' + q + '.modal-overlay' + q + ').remove()">✕</button>' +
      '<h2>📧 Send Email to Investor</h2>' +
      '<p style="color:#666;font-size:13px;margin:10px 0;">Email attachment browser se nahi ja sakti. Do options:</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">' +
        '<button onclick="generateReportPDFThenEmail(' + q + investorId + q + ');this.closest(' + q + '.modal-overlay' + q + ').remove()" style="background:#4285F4;color:#fff;padding:14px;border:none;border-radius:8px;cursor:pointer;font-size:14px;text-align:left;">' +
          '<div style="font-weight:700;">📄 Generate PDF + Open Email</div>' +
          '<div style="font-size:11px;opacity:0.9;margin-top:4px;">Report PDF download hoga, phir email draft khulega. PDF manually attach karo.</div>' +
        '</button>' +
        '<button onclick="sendPlainEmail(' + q + investorId + q + ');this.closest(' + q + '.modal-overlay' + q + ').remove()" style="background:#059669;color:#fff;padding:14px;border:none;border-radius:8px;cursor:pointer;font-size:14px;text-align:left;">' +
          '<div style="font-weight:700;">📝 Plain Email (No Attachment)</div>' +
          '<div style="font-size:11px;opacity:0.9;margin-top:4px;">Sirf summary text with numbers. No PDF.</div>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
};

window.generateReportPDFThenEmail = async function(investorId) {
  try {
    const { data: inv } = await sb.from('investors').select('*').eq('investor_id', investorId).single();
    if (!inv) return;
    
    const { data: links } = await sb.from('investor_properties')
      .select('room_id')
      .eq('investor_id', investorId);
    
    if (!links || links.length === 0) {
      fsn.error('Error', 'No property linked to this investor');
      return;
    }
    
    // Open report page in new window
    const roomId = links[0].room_id;
    const now = new Date();
    const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    // Navigate to report first
    fsn.success('Step 1', 'Opening report — please Print/Save as PDF from browser');
    setTimeout(() => {
      renderInvestorReport(investorId, roomId, monthStr);
      setTimeout(() => {
        if (confirm('Report tayyar hai! Print/PDF save karke ready ho? OK dabao email draft kholne ke liye.')) {
          sendPlainEmail(investorId);
        }
      }, 1500);
    }, 500);
  } catch (e) {
    fsn.error('Error', e.message);
  }
};

window.sendPlainEmail = async function(investorId) {
  try {
    // Fetch investor + linked properties
    const { data: inv } = await sb.from('investors').select('*').eq('investor_id', investorId).single();
    if (!inv) { fsn.error('Error', 'Not found'); return; }
    
    // Extract email from notes
    const emailMatch = (inv.notes || '').match(/Email:\s*(\S+)/);
    const email = emailMatch ? emailMatch[1] : '';
    
    if (!email) {
      fsn.error('Error', 'Email not set. Edit investor and add Email in profile.');
      return;
    }
    
    // Get linked properties
    const { data: links } = await sb.from('investor_properties')
      .select('room_id, rooms(nickname, property_name)')
      .eq('investor_id', investorId);
    
    const propNames = (links || []).map(l => 
      l.rooms?.nickname || l.rooms?.property_name || l.room_id
    ).join(', ') || 'your properties';
    
    // Use SELECTED month (from prompt) instead of current
    const selected = window._waSelectedMonth;
    let now, monthName;
    if (selected) {
      now = new Date(selected.year, selected.month - 1, 1);
      monthName = selected.monthName;
      console.log('📅 Using selected month:', monthName);
    } else {
      now = new Date();
      monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      console.log('⚠️  No selection, using current month:', monthName);
    }
    // NEW: Multi-investor aware
    const invNamesEmail = (inv.name || 'Investor').split('&').map(n => n.trim()).filter(n => n);
    const isMultiEmail = invNamesEmail.length > 1;
    const perPersonPct = (100 / invNamesEmail.length).toFixed(2);
    
    const subject = monthName + ' Monthly Report - ' + propNames + ' - UHHS';
    
    const body = 
      'Namaste ' + inv.name + ' ji,\n\n' +
      'Umeed hai aap kushal honge.\n\n' +
      'Aapki property "' + propNames + '" ki monthly financial summary ke liye ye email hai.\n\n' +
      '📅 Reporting Period: ' + monthName + '\n' +
      '📊 Revenue Sharing Model: 70% Investor Pool, 30% UHHS\n' +
      (isMultiEmail 
        ? '👥 Investor Split:\n' + invNamesEmail.map(n => '   - ' + n + ': ' + perPersonPct + '% of investor pool').join('\n') + '\n\n'
        : '\n') +
      'Complete detailed report attached mein bheji ja rahi hai. Isme included hai:\n' +
      '• Total revenue breakdown\n' +
      '• Online (Airbnb) vs Offline bookings\n' +
      '• Operating expenses\n' +
      '• Your share calculation\n' +
      '• Booking-wise details\n\n' +
      'Kripya report review karein aur koi query ho toh niche diye number pe contact karein.\n\n' +
      'Aapka support hamesha appreciated hai. Dhanyawad!\n\n' +
      '───────────────────────\n' +
      'Warm regards,\n\n' +
      'Team UHHS\n' +
      'UNIQUE HAVEN HOMES STAY\n' +
      '📞 +91 9450055554\n' +
      '📧 uniquehavenhomesstay@gmail.com\n' +
      '🌐 uniquehavenhomesstay.com\n' +
      '───────────────────────';
    
    const url = 'mailto:' + email + 
                '?subject=' + encodeURIComponent(subject) + 
                '&body=' + encodeURIComponent(body);
    window.location.href = url;
    
    if (typeof fsn !== 'undefined') fsn.success('Opening Email', 'Ready to send to ' + email);
  } catch (e) {
    console.error('Email error:', e);
    if (typeof fsn !== 'undefined') fsn.error('Error', e.message);
  }
};


// ============ INLINE EDIT SHARE % ============
async function editShareInline(investorId, roomId, currentShare) {
  const newShare = prompt(
    `Edit share % for this investor-property link:\n\nCurrent: ${currentShare}%\n\nEnter new share % (0-100):`,
    currentShare
  );
  
  if (newShare === null) return; // cancelled
  
  const share = parseFloat(newShare);
  if (isNaN(share) || share < 0 || share > 100) {
    fsn.error('Invalid', '❌ Share % must be between 0 and 100');
    return;
  }
  
  const { error } = await sb.from('investor_properties')
    .update({ share_percent: share })
    .eq('investor_id', investorId)
    .eq('room_id', roomId);
  
  if (error) {
    fsn.error('Error', '❌ ' + error.message);
    return;
  }
  
  fsn.success('Success', `✅ Share updated to ${share}%`);
  renderManageInvestors();
}
