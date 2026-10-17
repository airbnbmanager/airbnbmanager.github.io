/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES (UHHS) — EXPRESS FRONT-DESK POS TERMINAL
 * Inspired by Enterprise Salon & Hotel Front-Desk Systems (Video Architecture)
 * Walk-In Bookings, Split Payments, Security Deposits & Instant Invoicing
 * =====================================================================
 */

window._posState = {
  selectedGuest: null,
  selectedRoomId: '',
  checkIn: new Date().toISOString().slice(0, 10),
  checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  cartItems: [],
  securityDeposit: 0,
  securityStatus: 'collected', // 'collected', 'none'
  paymentSplits: [{ method: 'UPI', amount: 0, reference: '' }],
  activeCatalogTab: 'all',
  discountAmount: 0,
  staffAttribution: 'Staff'
};

window.POS_CATALOG = [
  { id: 'exp_bbq', category: 'experiences', name: 'Charcoal BBQ & Grill Setup', price: 1500, icon: '🥩', desc: 'Outdoor grill, coal, skewers, and chef-ready setup.' },
  { id: 'exp_bonfire', category: 'experiences', name: 'Evening Bonfire & Music', price: 2000, icon: '🔥', desc: 'Wood logs, safety fire pit, and ambient speaker.' },
  { id: 'exp_chef', category: 'dining', name: 'Private In-House Chef (1 Day)', price: 3500, icon: '👨‍🍳', desc: 'Personal cook for lunch & dinner in villa kitchen.' },
  { id: 'exp_decor', category: 'celebration', name: 'Birthday / Anniversary Decor', price: 2500, icon: '🎈', desc: 'Balloons, flower arrangement, and welcome banner.' },
  { id: 'exp_cab', category: 'concierge', name: 'Airport / Station Luxury Cab', price: 1200, icon: '🚗', desc: 'Chauffeur pickup in clean AC sedan/SUV.' },
  { id: 'exp_linen', category: 'amenities', name: 'Extra Premium Linen & Towels', price: 500, icon: '🧺', desc: 'Set of 4 plush bath sheets and duvet covers.' },
  { id: 'exp_mattress', category: 'amenities', name: 'Extra Premium Floor Mattress', price: 800, icon: '🛏️', desc: 'Comfortable fold-out mattress with pillow & quilt.' },
  { id: 'exp_breakfast', category: 'dining', name: 'Gourmet Breakfast Hamper (4 Pax)', price: 1200, icon: '☕', desc: 'Farm eggs, fresh bread, butter, juice, and tea kit.' }
];

/**
 * Open the Fullscreen POS Modal / Terminal
 */
window.openPOSTerminal = async function(prefillData = null) {
  // Pre-load rooms if needed
  if (!window._globalRoomsList || !window._globalRoomsList.length) {
    if (typeof window.loadGlobalRoomsCache === 'function') await window.loadGlobalRoomsCache();
  }
  const rooms = window._globalRoomsList || [];

  // Default to global selected room or first room
  const globalProp = (typeof window.getGlobalSelectedProperty === 'function') ? window.getGlobalSelectedProperty() : '';
  window._posState.selectedRoomId = prefillData?.room_id || globalProp || (rooms[0]?.room_id || '');

  // Reset cart
  window._posState.cartItems = [];
  window._posState.paymentSplits = [{ method: 'UPI', amount: 0, reference: '' }];
  window._posState.discountAmount = 0;
  window._posState.securityDeposit = 2000; // standard refundable deposit

  if (prefillData?.guest_name || prefillData?.phone) {
    window._posState.selectedGuest = {
      name: prefillData.guest_name || '',
      phone: prefillData.phone || '',
      tier: 'Bronze',
      stays: 1
    };
  }

  // Add room stay as first line item
  window.recalculatePOSRoomItem();

  window.renderPOSModal();
};

/**
 * Calculate room stay price and add to cart
 */
window.recalculatePOSRoomItem = function() {
  const rooms = window._globalRoomsList || [];
  const room = rooms.find(r => r.room_id === window._posState.selectedRoomId);
  const rate = room?.rent_per_night || 4500;

  const d1 = new Date(window._posState.checkIn);
  const d2 = new Date(window._posState.checkOut);
  const diffTime = Math.max(86400000, d2 - d1);
  const nights = Math.max(1, Math.round(diffTime / 86400000));

  // Remove existing room line item
  window._posState.cartItems = window._posState.cartItems.filter(item => !item.isRoomStay);

  // Add new room stay item
  window._posState.cartItems.unshift({
    id: `stay_${window._posState.selectedRoomId}`,
    isRoomStay: true,
    name: `${room?.nickname || 'Luxury Villa'} (${nights} Night${nights > 1 ? 's' : ''})`,
    price: rate * nights,
    qty: 1,
    unitPrice: rate,
    nights: nights,
    icon: '🏡'
  });

  window.syncPOSSplitAmounts();
};

/**
 * Sync Split Amounts to Match Grand Total
 */
window.syncPOSSplitAmounts = function() {
  const grandTotal = window.getPOSGrandTotal();
  if (window._posState.paymentSplits.length === 1) {
    window._posState.paymentSplits[0].amount = grandTotal;
  }
};

window.getPOSSubtotal = function() {
  return window._posState.cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
};

window.getPOSGrandTotal = function() {
  const subtotal = window.getPOSSubtotal();
  const disc = window._posState.discountAmount || 0;
  const sec = (window._posState.securityStatus === 'collected') ? (Number(window._posState.securityDeposit) || 0) : 0;
  return Math.max(0, subtotal - disc + sec);
};

/**
 * Render the POS Modal UI
 */
window.renderPOSModal = function() {
  const existing = document.getElementById('posTerminalOverlay');
  if (existing) existing.remove();

  const rooms = window._globalRoomsList || [];
  const subtotal = window.getPOSSubtotal();
  const grandTotal = window.getPOSGrandTotal();

  const activeTab = window._posState.activeCatalogTab;
  const filteredCatalog = activeTab === 'all' 
    ? window.POS_CATALOG 
    : window.POS_CATALOG.filter(c => c.category === activeTab);

  const modalHtml = `
    <div class="pos-modal-overlay" id="posTerminalOverlay" style="position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;">
      <div class="pos-terminal-card" style="background:#FFFFFF;width:100%;max-width:1200px;height:92vh;border-radius:20px;display:grid;grid-template-columns:1.35fr 1fr;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden;border:1px solid #CBD5E1;">
        
        <!-- ─── LEFT: CATALOG, ROOM & GUEST SELECTOR ─── -->
        <div style="display:flex;flex-direction:column;border-right:1px solid #E2E8F0;background:#F8FAFC;overflow-y:auto;">
          
          <!-- POS Terminal Header -->
          <div style="padding:14px 20px;background:#0F172A;color:#FFFFFF;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:22px;">⚡</span>
              <div>
                <div style="font-size:15px;font-weight:800;letter-spacing:0.3px;">EXPRESS FRONT-DESK POS TERMINAL</div>
                <div style="font-size:11px;color:#94A3B8;">Walk-In Check-In • Add-On Billing • Split Payment Engine</div>
              </div>
            </div>
            <button type="button" onclick="document.getElementById('posTerminalOverlay').remove()" style="background:rgba(255,255,255,0.1);color:#fff;border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
          </div>

          <!-- Guest Lookup & Stay Configuration Strip -->
          <div style="padding:14px 20px;background:#FFFFFF;border-bottom:1px solid #E2E8F0;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Guest Name</label>
                <input type="text" id="posGuestName" placeholder="Guest Full Name" 
                  value="${escapeHtml(window._posState.selectedGuest?.name || '')}"
                  oninput="window._posState.selectedGuest = window._posState.selectedGuest || {}; window._posState.selectedGuest.name = this.value;"
                  style="width:100%;padding:8px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;font-weight:600;margin-top:4px;" />
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Mobile / WhatsApp Phone</label>
                <input type="tel" id="posGuestPhone" placeholder="10-digit Phone" 
                  value="${escapeHtml(window._posState.selectedGuest?.phone || '')}"
                  oninput="window._posState.selectedGuest = window._posState.selectedGuest || {}; window._posState.selectedGuest.phone = this.value;"
                  style="width:100%;padding:8px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;font-weight:600;margin-top:4px;" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Property / Villa</label>
                <select onchange="window._posState.selectedRoomId = this.value; window.recalculatePOSRoomItem(); window.renderPOSModal();" style="width:100%;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:700;margin-top:4px;background:#fff;cursor:pointer;">
                  ${rooms.map(r => `
                    <option value="${r.room_id}" ${window._posState.selectedRoomId === r.room_id ? 'selected' : ''}>
                      ${escapeHtml(r.nickname || r.room_id)} (${r.unit_no || '-'})
                    </option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Check-In</label>
                <input type="date" value="${window._posState.checkIn}" 
                  onchange="window._posState.checkIn = this.value; window.recalculatePOSRoomItem(); window.renderPOSModal();"
                  style="width:100%;padding:7px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;margin-top:4px;" />
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Check-Out</label>
                <input type="date" value="${window._posState.checkOut}" 
                  onchange="window._posState.checkOut = this.value; window.recalculatePOSRoomItem(); window.renderPOSModal();"
                  style="width:100%;padding:7px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;margin-top:4px;" />
              </div>
            </div>
          </div>

          <!-- Catalog Filter Tabs -->
          <div style="padding:12px 20px 8px 20px;display:flex;gap:8px;overflow-x:auto;">
            <button class="crm-pipeline-pill ${activeTab === 'all' ? 'active' : ''}" onclick="window._posState.activeCatalogTab = 'all'; window.renderPOSModal();">
              All Add-Ons
            </button>
            <button class="crm-pipeline-pill ${activeTab === 'experiences' ? 'active' : ''}" onclick="window._posState.activeCatalogTab = 'experiences'; window.renderPOSModal();">
              🔥 Experiences
            </button>
            <button class="crm-pipeline-pill ${activeTab === 'dining' ? 'active' : ''}" onclick="window._posState.activeCatalogTab = 'dining'; window.renderPOSModal();">
              👨‍🍳 Dining &amp; Chef
            </button>
            <button class="crm-pipeline-pill ${activeTab === 'celebration' ? 'active' : ''}" onclick="window._posState.activeCatalogTab = 'celebration'; window.renderPOSModal();">
              🎈 Celebration Decor
            </button>
            <button class="crm-pipeline-pill ${activeTab === 'amenities' ? 'active' : ''}" onclick="window._posState.activeCatalogTab = 'amenities'; window.renderPOSModal();">
              🛏️ Extra Linen / Bed
            </button>
            <button class="crm-pipeline-pill ${activeTab === 'concierge' ? 'active' : ''}" onclick="window._posState.activeCatalogTab = 'concierge'; window.renderPOSModal();">
              🚗 Airport Cab
            </button>
          </div>

          <!-- Catalog Item Tiles Grid -->
          <div style="padding:12px 20px;display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;flex:1;overflow-y:auto;">
            ${filteredCatalog.map(item => `
              <div onclick="window.addPOSItem('${item.id}')" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px;cursor:pointer;transition:all 0.15s ease;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <div>
                  <div style="font-size:24px;margin-bottom:6px;">${item.icon}</div>
                  <div style="font-size:13px;font-weight:800;color:#0F172A;line-height:1.3;">${escapeHtml(item.name)}</div>
                  <div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.3;">${escapeHtml(item.desc)}</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid #F1F5F9;">
                  <div style="font-size:14px;font-weight:800;color:#059669;">₹${item.price.toLocaleString('en-IN')}</div>
                  <button type="button" style="background:#0F172A;color:#fff;border:none;width:24px;height:24px;border-radius:6px;font-weight:800;font-size:14px;cursor:pointer;">+</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ─── RIGHT: CURRENT SALE CART, SPLIT PAYMENTS & CHECKOUT ─── -->
        <div style="display:flex;flex-direction:column;background:#FFFFFF;overflow-y:auto;padding:18px 22px;">
          
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #E2E8F0;">
            <div style="font-size:16px;font-weight:800;color:#0F172A;display:flex;align-items:center;gap:6px;">
              <span>🛒</span> Current Bill &amp; Settlement
            </div>
            <div style="font-size:12px;color:#64748B;font-weight:600;">
              ${window._posState.cartItems.length} Line Item${window._posState.cartItems.length === 1 ? '' : 's'}
            </div>
          </div>

          <!-- Line Items List -->
          <div style="flex:1;overflow-y:auto;max-height:240px;margin-bottom:12px;padding-right:4px;">
            ${window._posState.cartItems.map((item, idx) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:#F8FAFC;margin-bottom:6px;border:1px solid #E2E8F0;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12.5px;font-weight:800;color:#0F172A;display:flex;align-items:center;gap:6px;">
                    <span>${item.icon || '📦'}</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.name)}</span>
                  </div>
                  <div style="font-size:11px;color:#64748B;margin-top:2px;">
                    ₹${item.price.toLocaleString('en-IN')} × ${item.qty}
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                  ${!item.isRoomStay ? `
                    <button type="button" onclick="window.updatePOSItemQty(${idx}, -1)" style="width:22px;height:22px;background:#E2E8F0;border:none;border-radius:4px;cursor:pointer;font-weight:800;">-</button>
                    <span style="font-size:12px;font-weight:800;">${item.qty}</span>
                    <button type="button" onclick="window.updatePOSItemQty(${idx}, 1)" style="width:22px;height:22px;background:#E2E8F0;border:none;border-radius:4px;cursor:pointer;font-weight:800;">+</button>
                    <button type="button" onclick="window.removePOSItem(${idx})" style="color:#EF4444;background:none;border:none;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
                  ` : `
                    <span style="font-size:11px;color:#64748B;font-weight:600;">Villa Stay</span>
                  `}
                  <div style="font-size:13px;font-weight:800;color:#0F172A;min-width:65px;text-align:right;">
                    ₹${(item.price * item.qty).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Security Deposit & Discounts -->
          <div style="background:#F1F5F9;padding:12px;border-radius:12px;margin-bottom:14px;border:1px solid #CBD5E1;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="font-size:12px;font-weight:700;color:#0F172A;display:flex;align-items:center;gap:5px;">
                <span>🛡️</span> Refundable Security Deposit:
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <input type="number" value="${window._posState.securityDeposit}" 
                  oninput="window._posState.securityDeposit = Number(this.value)||0; window.syncPOSSplitAmounts(); window.renderPOSModal();"
                  style="width:90px;padding:4px 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;font-weight:700;text-align:right;" />
                <select onchange="window._posState.securityStatus = this.value; window.syncPOSSplitAmounts(); window.renderPOSModal();" style="padding:4px 6px;border-radius:6px;border:1px solid #CBD5E1;font-size:11px;font-weight:700;">
                  <option value="collected" ${window._posState.securityStatus === 'collected' ? 'selected' : ''}>Collected</option>
                  <option value="none" ${window._posState.securityStatus === 'none' ? 'selected' : ''}>Waived / None</option>
                </select>
              </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="font-size:12px;font-weight:700;color:#0F172A;display:flex;align-items:center;gap:5px;">
                <span>🏷️</span> Discount / Coupon (₹):
              </div>
              <input type="number" value="${window._posState.discountAmount}" 
                oninput="window._posState.discountAmount = Number(this.value)||0; window.syncPOSSplitAmounts(); window.renderPOSModal();"
                style="width:90px;padding:4px 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;font-weight:700;text-align:right;" />
            </div>
          </div>

          <!-- Split Payment Section (Salon ERP Pattern) -->
          <div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="font-size:12.5px;font-weight:800;color:#0F172A;text-transform:uppercase;letter-spacing:0.4px;">
                Payment Method &amp; Splits
              </div>
              <button type="button" onclick="window.addPOSPaymentSplit()" style="background:#E2E8F0;color:#0F172A;border:none;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;">
                + Add Split
              </button>
            </div>

            ${window._posState.paymentSplits.map((split, sIdx) => `
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                <select onchange="window._posState.paymentSplits[${sIdx}].method = this.value;" style="padding:6px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;font-weight:700;">
                  <option value="UPI" ${split.method === 'UPI' ? 'selected' : ''}>📱 UPI / GPay</option>
                  <option value="Cash" ${split.method === 'Cash' ? 'selected' : ''}>💵 Cash</option>
                  <option value="Card" ${split.method === 'Card' ? 'selected' : ''}>💳 Card / POS</option>
                  <option value="Bank" ${split.method === 'Bank' ? 'selected' : ''}>🏦 Bank Transfer</option>
                </select>
                <input type="number" value="${split.amount}" 
                  oninput="window._posState.paymentSplits[${sIdx}].amount = Number(this.value)||0;"
                  placeholder="Amount" style="flex:1;padding:6px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:700;text-align:right;" />
                <input type="text" value="${escapeHtml(split.reference || '')}" 
                  oninput="window._posState.paymentSplits[${sIdx}].reference = this.value;"
                  placeholder="Ref/Txn No." style="width:110px;padding:6px 8px;border:1px solid #CBD5E1;border-radius:8px;font-size:11.5px;" />
                ${window._posState.paymentSplits.length > 1 ? `
                  <button type="button" onclick="window.removePOSPaymentSplit(${sIdx})" style="color:#EF4444;background:none;border:none;font-weight:800;cursor:pointer;">✕</button>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Total Calculation Banner -->
          <div style="background:#0F172A;color:#FFFFFF;padding:14px 18px;border-radius:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;font-weight:700;">Total Settlement Due</div>
              <div style="font-size:11px;color:#34D399;margin-top:2px;">Subtotal ₹${subtotal.toLocaleString('en-IN')} + Sec ₹${window._posState.securityStatus === 'collected' ? window._posState.securityDeposit : 0}</div>
            </div>
            <div style="font-size:26px;font-weight:900;color:#38BDF8;">
              ₹${grandTotal.toLocaleString('en-IN')}
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button type="button" onclick="window.executePOSCheckIn(true)" style="background:#059669;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <span>💾</span> Save &amp; Check In
            </button>
            <button type="button" onclick="window.executePOSCheckIn(false)" style="background:#25D366;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <span>📱</span> Check In &amp; WhatsApp
            </button>
          </div>
          
          <div style="font-size:10.5px;color:#94A3B8;text-align:center;margin-top:8px;">
            Shortcuts: Press <strong>Esc</strong> to close modal
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.addPOSItem = function(itemId) {
  const item = window.POS_CATALOG.find(i => i.id === itemId);
  if (!item) return;

  const existing = window._posState.cartItems.find(i => i.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    window._posState.cartItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
      icon: item.icon
    });
  }
  window.syncPOSSplitAmounts();
  window.renderPOSModal();
};

window.updatePOSItemQty = function(idx, delta) {
  const item = window._posState.cartItems[idx];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    window._posState.cartItems.splice(idx, 1);
  }
  window.syncPOSSplitAmounts();
  window.renderPOSModal();
};

window.removePOSItem = function(idx) {
  window._posState.cartItems.splice(idx, 1);
  window.syncPOSSplitAmounts();
  window.renderPOSModal();
};

window.addPOSPaymentSplit = function() {
  window._posState.paymentSplits.push({ method: 'Cash', amount: 0, reference: '' });
  window.renderPOSModal();
};

window.removePOSPaymentSplit = function(idx) {
  window._posState.paymentSplits.splice(idx, 1);
  window.renderPOSModal();
};

/**
 * Save Walk-In / Express POS Check-In to Supabase
 */
window.executePOSCheckIn = async function(sendWhatsApp = false) {
  const sbClient = window.sb || (typeof sb !== 'undefined' ? sb : null);
  if (!sbClient) {
    alert('Database client not ready. Please refresh.');
    return;
  }

  const guestName = (document.getElementById('posGuestName')?.value || '').trim();
  const guestPhone = (document.getElementById('posGuestPhone')?.value || '').trim();
  const roomId = window._posState.selectedRoomId;

  if (!guestName) {
    alert('Please enter guest name');
    return;
  }
  if (!guestPhone) {
    alert('Please enter guest phone number');
    return;
  }
  if (!roomId) {
    alert('Please select a property/villa');
    return;
  }

  const grandTotal = window.getPOSGrandTotal();
  const totalPaid = window._posState.paymentSplits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  // Generate unique booking ID
  const bookingId = `POS_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;

  // Compile Add-on notes
  const addOns = window._posState.cartItems.filter(i => !i.isRoomStay);
  const addOnNotes = addOns.length 
    ? `\nAdd-ons: ${addOns.map(i => `${i.name} × ${i.qty}`).join(', ')}`
    : '';

  const paymentNotes = window._posState.paymentSplits
    .map(s => `${s.method}: ₹${s.amount}${s.reference ? ` (Ref: ${s.reference})` : ''}`)
    .join(' | ');

  try {
    // 1. Insert into guest_register
    const { error: bErr } = await sbClient.from('guest_register').insert([{
      booking_id: bookingId,
      guest_name: guestName,
      phone: guestPhone,
      room_id: roomId,
      check_in: window._posState.checkIn,
      check_out: window._posState.checkOut,
      booking_mode: 'Offline-WalkIn',
      total_amount: grandTotal,
      security_deposit_amount: window._posState.securityDeposit,
      security_deposit_status: window._posState.securityStatus,
      payment_status: totalPaid >= grandTotal ? 'Paid' : 'Partial',
      notes: `Express POS Walk-In${addOnNotes}\nPayments: ${paymentNotes}`,
      created_by: window.SESSION?.userId || null,
      verification_status: 'verified'
    }]);

    if (bErr) throw bErr;

    // 2. Insert payments into payment_history
    for (const split of window._posState.paymentSplits) {
      if (split.amount > 0) {
        await sbClient.from('payment_history').insert([{
          booking_id: bookingId,
          amount: split.amount,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_mode: split.method,
          reference_no: split.reference || 'POS Express',
          verification_status: 'verified'
        }]);
      }
    }

    if (window.fsn) {
      fsn.success('Check-In Successful', `✅ Booking ${bookingId} created & verified!`);
    }

    // WhatsApp receipt trigger
    if (sendWhatsApp) {
      const normPhone = guestPhone.replace(/\D/g, '').slice(-10);
      const rooms = window._globalRoomsList || [];
      const room = rooms.find(r => r.room_id === roomId);
      const waMsg = encodeURIComponent(
        `*THE UNIQUE HAVEN HOMES — BOOKING RECEIPT*\n\n` +
        `Dear ${guestName},\n` +
        `Welcome to *${room?.nickname || 'Our Villa'}*!\n` +
        `📅 Dates: ${window._posState.checkIn} to ${window._posState.checkOut}\n` +
        `💰 Total Bill: ₹${grandTotal.toLocaleString('en-IN')}\n` +
        `✅ Amount Paid: ₹${totalPaid.toLocaleString('en-IN')}\n` +
        `🛡️ Security Deposit: ₹${window._posState.securityDeposit} (${window._posState.securityStatus})\n\n` +
        `Have a pleasant & memorable stay with us!`
      );
      window.open(`https://wa.me/91${normPhone}?text=${waMsg}`, '_blank');
    }

    // Close modal
    document.getElementById('posTerminalOverlay')?.remove();

    // Refresh active view
    if (typeof window.renderSmartManageBookings === 'function') {
      window.renderSmartManageBookings(true);
    }
  } catch (err) {
    console.error('POS Checkout Error:', err);
    alert('Error completing checkout: ' + err.message);
  }
};

// Global escape listener for POS Modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const el = document.getElementById('posTerminalOverlay');
    if (el) el.remove();
  }
});
