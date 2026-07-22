/**
 * Store / Inventory Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderStore() {
  renderShell(`<div class="loading">Loading...</div>`, 'store');

  const [{data:items}, {data:txns}] = await Promise.all([
    sb.from('store_items').select('*').order('item_name'),
    sb.from('stock_transactions').select('*, store_items(item_name, unit)')
      .order('txn_date', {ascending:false}).limit(100)
  ]);

  // Calculate current stock per item
  const stockMap = {};
  (txns || []).forEach(t => {
    const key = t.item_id;
    stockMap[key] = (stockMap[key] || 0) + (t.txn_type === 'In' ? (t.quantity || 0) : -(t.quantity || 0));
  });

  const isO = SESSION.role === 'owner';

  renderShell(`
    <div class="card">
      <h1>📦 Inventory</h1>
      <div class="sub">${(items || []).length} items</div>
      <div class="btn-row">
        <button onclick="renderAddItem()">➕ Add Item</button>
        <button class="green-btn" onclick="renderStockIn()">📥 Stock In</button>
        <button class="secondary" onclick="renderStockOut()">📤 Stock Out</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Current Stock</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Item</th><th>Category</th><th>Stock</th><th>Reorder</th><th>Status</th>
          ${isO ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>${(items || []).map(item => {
          const stock = stockMap[item.item_id] || 0;
          const low = stock <= (item.reorder_level || 0);
          return `<tr>
            <td><strong>${item.item_name}</strong></td>
            <td>${item.category || '-'}</td>
            <td><strong class="${low ? 'metric-value warn' : ''}">${stock} ${item.unit || 'pcs'}</strong></td>
            <td>${item.reorder_level || 0}</td>
            <td>${low ? '<span class="badge red">Low Stock</span>' : '<span class="badge green">OK</span>'}</td>
            ${isO ? `<td class="table-actions">
              <button class="btn-sm" onclick="editItem('${item.item_id}')">✏️</button>
              <button class="btn-sm danger" onclick="delItem('${item.item_id}','${item.item_name}')">🗑️</button>
            </td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="section-title">Recent Transactions</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Date</th><th>Item</th><th>Type</th><th>Qty</th>
          <th>Purpose</th><th>By</th><th>Cost</th>
          ${isO ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>${(txns || []).map(t => `<tr>
          <td>${t.txn_date || '-'}</td>
          <td>${t.store_items?.item_name || '-'}</td>
          <td><span class="badge ${t.txn_type === 'In' ? 'green' : 'yellow'}">${t.txn_type === 'In' ? '📥 In' : '📤 Out'}</span></td>
          <td>${t.quantity} ${t.store_items?.unit || ''}</td>
          <td>${t.purpose || t.notes || '-'}</td>
          <td>${t.received_by || '-'}</td>
          <td>${t.cost ? '₹' + t.cost.toLocaleString('en-IN') : '-'}</td>
          ${isO ? `<td class="table-actions">
            <button class="btn-sm" onclick="editTxn(${t.id})">✏️</button>
            <button class="btn-sm danger" onclick="delTxn(${t.id})">🗑️</button>
          </td>` : ''}
        </tr>`).join('') || '<tr><td colspan="8" class="sub">No transactions</td></tr>'}</tbody>
      </table></div>
    </div>
  `, 'store');
}

// ============ ADD ITEM ============
async function renderAddItem() {
  renderShell(`
    <div class="card"><h1>➕ Add Item</h1>
      <button class="secondary btn-sm" onclick="renderStore()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group"><label>Item Name *</label><input id="iName" placeholder="e.g. Bedsheet, Towel" /></div>
      <div class="form-grid">
        <div class="form-group"><label>Category</label>
          <select id="iCat">
            <option>Linen</option><option>Toiletries</option><option>Cleaning</option>
            <option>Kitchen</option><option>Electronics</option><option>Other</option>
          </select>
        </div>
        <div class="form-group"><label>Unit</label><input id="iUnit" placeholder="pcs / kg / liter" /></div>
      </div>
      <div class="form-group"><label>Reorder Level</label><input id="iReorder" type="number" value="5" /></div>
      <button onclick="saveItem()" style="width:100%;">💾 Save Item</button>
      <div id="iErr"></div>
    </div>
  `, 'store');
}

async function saveItem() {
  const name = document.getElementById('iName').value.trim();
  if (!name) { document.getElementById('iErr').innerHTML = '<div class="error">Name required</div>'; return; }
  const { error } = await sb.from('store_items').insert({
    item_id: 'ITM' + Date.now(),
    item_name: name,
    category: document.getElementById('iCat').value,
    unit: document.getElementById('iUnit').value.trim() || 'pcs',
    reorder_level: parseFloat(document.getElementById('iReorder').value) || 5
  });
  if (error) { document.getElementById('iErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  renderStore();
}

// ============ EDIT ITEM ============
async function editItem(itemId) {
  const { data: item } = await sb.from('store_items').select('*').eq('item_id', itemId).single();
  if (!item) { alert('Not found'); return; }

  renderShell(`
    <div class="card"><h1>✏️ Edit Item</h1>
      <button class="secondary btn-sm" onclick="renderStore()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group"><label>Item Name</label><input id="iName" value="${item.item_name}" /></div>
      <div class="form-grid">
        <div class="form-group"><label>Category</label>
          <select id="iCat">
            ${['Linen','Toiletries','Cleaning','Kitchen','Electronics','Other'].map(c =>
              `<option ${c === item.category ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group"><label>Unit</label><input id="iUnit" value="${item.unit || 'pcs'}" /></div>
      </div>
      <div class="form-group"><label>Reorder Level</label><input id="iReorder" type="number" value="${item.reorder_level || 5}" /></div>
      <button onclick="updateItem('${itemId}')" style="width:100%;">💾 Update</button>
      <div id="iErr"></div>
    </div>
  `, 'store');
}

async function updateItem(itemId) {
  const name = document.getElementById('iName').value.trim();
  if (!name) { document.getElementById('iErr').innerHTML = '<div class="error">Name required</div>'; return; }
  await sb.from('store_items').update({
    item_name: name,
    category: document.getElementById('iCat').value,
    unit: document.getElementById('iUnit').value.trim() || 'pcs',
    reorder_level: parseFloat(document.getElementById('iReorder').value) || 5
  }).eq('item_id', itemId);
  renderStore();
}

async function delItem(itemId, name) {
  if (!confirm(`Delete "${name}"? All transactions for this item will remain.`)) return;
  await sb.from('store_items').delete().eq('item_id', itemId);
  renderStore();
}

// ============ STOCK IN ============
async function renderStockIn() {
  const [{data:items}, {data:emps}] = await Promise.all([
    sb.from('store_items').select('item_id, item_name, unit').order('item_name'),
    sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name')
  ]);

  renderShell(`
    <div class="card"><h1>📥 Stock In (Purchase)</h1>
      <button class="secondary btn-sm" onclick="renderStore()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group"><label>Item *</label>
        <select id="txItem"><option value="">Select Item</option>
          ${(items || []).map(i => `<option value="${i.item_id}">${i.item_name} (${i.unit || 'pcs'})</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Quantity *</label><input id="txQty" type="number" placeholder="e.g. 10" /></div>
        <div class="form-group"><label>Total Cost ₹</label><input id="txCost" type="number" placeholder="e.g. 5000" /></div>
      </div>
      <div class="form-group"><label>Purchased By</label>
        <select id="txBy">
          <option value="">-- Select --</option>
          ${(emps || []).map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
          <option value="Owner">Owner</option>
          <option value="Vendor">Vendor Direct</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input id="txDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div class="form-group"><label>Notes</label><input id="txNotes" placeholder="Optional — vendor name, bill no." /></div>
      <button onclick="saveStockIn()" style="width:100%;">💾 Save Stock In</button>
      <div id="txErr"></div>
    </div>
  `, 'store');
}

async function saveStockIn() {
  const itemId = document.getElementById('txItem').value;
  const qty = parseFloat(document.getElementById('txQty').value) || 0;
  if (!itemId || qty <= 0) { document.getElementById('txErr').innerHTML = '<div class="error">Item & quantity required</div>'; return; }

  const { error } = await sb.from('stock_transactions').insert({
    item_id: itemId,
    txn_type: 'In',
    quantity: qty,
    cost: parseFloat(document.getElementById('txCost').value) || 0,
    received_by: document.getElementById('txBy').value || null,
    txn_date: document.getElementById('txDate').value || null,
    purpose: 'Purchase',
    notes: document.getElementById('txNotes').value.trim() || null
  });
  if (error) { document.getElementById('txErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  alert('✅ Stock In saved');
  renderStore();
}

// ============ STOCK OUT ============
async function renderStockOut() {
  const [{data:items}, {data:rooms}, {data:emps}] = await Promise.all([
    sb.from('store_items').select('item_id, item_name, unit').order('item_name'),
    sb.from('rooms').select('room_id, nickname, unit_no').order('room_id'),
    sb.from('employees').select('emp_id, name').eq('status', 'Active').order('name')
  ]);

  renderShell(`
    <div class="card"><h1>📤 Stock Out (Used)</h1>
      <button class="secondary btn-sm" onclick="renderStore()">← Back</button>
    </div>
    <div class="card">
      <div class="form-group"><label>Item *</label>
        <select id="txItem"><option value="">Select Item</option>
          ${(items || []).map(i => `<option value="${i.item_id}">${i.item_name} (${i.unit || 'pcs'})</option>`).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Quantity *</label><input id="txQty" type="number" placeholder="e.g. 2" /></div>
        <div class="form-group"><label>Purpose</label>
          <select id="txPurpose">
            <option value="Property Use">Property Use</option>
            <option value="Guest Request">Guest Request</option>
            <option value="Replacement">Replacement</option>
            <option value="Staff Personal">Staff Personal</option>
            <option value="Damaged/Waste">Damaged / Waste</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="txRoom">
            <option value="">General / All</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}">${r.nickname || r.unit_no}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Given To / Received By</label>
          <select id="txBy">
            <option value="">-- Select --</option>
            ${(emps || []).map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
            <option value="Guest">Guest</option>
            <option value="External">External Person</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Date</label><input id="txDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div class="form-group"><label>Notes</label><input id="txNotes" placeholder="Optional details" /></div>
      <button onclick="saveStockOut()" style="width:100%;">💾 Save Stock Out</button>
      <div id="txErr"></div>
    </div>
  `, 'store');
}

async function saveStockOut() {
  const itemId = document.getElementById('txItem').value;
  const qty = parseFloat(document.getElementById('txQty').value) || 0;
  if (!itemId || qty <= 0) { document.getElementById('txErr').innerHTML = '<div class="error">Item & quantity required</div>'; return; }

  const { error } = await sb.from('stock_transactions').insert({
    item_id: itemId,
    room_id: document.getElementById('txRoom').value || null,
    txn_type: 'Out',
    quantity: qty,
    cost: 0,
    received_by: document.getElementById('txBy').value || null,
    txn_date: document.getElementById('txDate').value || null,
    purpose: document.getElementById('txPurpose').value || 'Property Use',
    notes: document.getElementById('txNotes').value.trim() || null
  });
  if (error) { document.getElementById('txErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  alert('✅ Stock Out saved');
  renderStore();
}

// ============ EDIT TRANSACTION ============
async function editTxn(txnId) {
  const { data: t } = await sb.from('stock_transactions').select('*, store_items(item_name)').eq('id', txnId).single();
  if (!t) { alert('Not found'); return; }

  renderShell(`
    <div class="card"><h1>✏️ Edit Transaction</h1>
      <button class="secondary btn-sm" onclick="renderStore()">← Back</button>
    </div>
    <div class="card">
      <div class="sub">${t.store_items?.item_name || t.item_id} — ${t.txn_type}</div>
      <div class="form-grid">
        <div class="form-group"><label>Quantity</label><input id="txQty" type="number" value="${t.quantity || 0}" /></div>
        <div class="form-group"><label>Cost ₹</label><input id="txCost" type="number" value="${t.cost || 0}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Purpose</label>
          <select id="txPurpose">
            ${['Purchase','Property Use','Guest Request','Replacement','Staff Personal','Damaged/Waste','Other']
              .map(p => `<option ${p === (t.purpose || '') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>By</label><input id="txBy" value="${t.received_by || ''}" /></div>
      </div>
      <div class="form-group"><label>Date</label><input id="txDate" type="date" value="${t.txn_date || ''}" /></div>
      <div class="form-group"><label>Notes</label><input id="txNotes" value="${t.notes || ''}" /></div>
      <button onclick="updateTxn(${txnId})" style="width:100%;">💾 Update</button>
    </div>
  `, 'store');
}

async function updateTxn(txnId) {
  await sb.from('stock_transactions').update({
    quantity: parseFloat(document.getElementById('txQty').value) || 0,
    cost: parseFloat(document.getElementById('txCost').value) || 0,
    purpose: document.getElementById('txPurpose').value || null,
    received_by: document.getElementById('txBy').value.trim() || null,
    txn_date: document.getElementById('txDate').value || null,
    notes: document.getElementById('txNotes').value.trim() || null
  }).eq('id', txnId);
  renderStore();
}

async function delTxn(txnId) {
  if (!confirm('Delete this transaction?')) return;
  await sb.from('stock_transactions').delete().eq('id', txnId);
  renderStore();
}

// ============ OLD FUNCTIONS (kept for compatibility) ============
async function renderAddTxn() { renderStockIn(); }
async function saveTxn() { saveStockIn(); }