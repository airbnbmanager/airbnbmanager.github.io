/**
 * Store / Inventory Module
 * UNIQUE HAVEN HOMES STAY
 */

async function renderStore() {
  renderShell(`<div class="loading">Loading...</div>`, 'store');
  const [{data:items},{data:txns}] = await Promise.all([
    sb.from('store_items').select('*').order('item_name'),
    sb.from('stock_transactions').select('*, store_items(item_name,unit), rooms(unit_no)').order('txn_date',{ascending:false}).limit(50)
  ]);
  const sm = {};
  (txns||[]).forEach(t=>{sm[t.item_id]=(sm[t.item_id]||0)+(t.txn_type==='In'?(t.quantity||0):-(t.quantity||0));});

  renderShell(`
    <div class="card">
      <h1>📦 Inventory</h1>
      <div class="sub">${(items||[]).length} items</div>
      <div class="btn-row">
        <button onclick="renderAddItem()">➕ Add Item</button>
        <button class="secondary" onclick="renderAddTxn()">🔄 Stock In/Out</button>
      </div>
    </div>
    <div class="card"><div class="section-title">Current Stock</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Reorder</th></tr></thead>
        <tbody>${(items||[]).map(i=>{const s=sm[i.item_id]||0;return`<tr>
          <td><strong>${i.item_name}</strong></td><td>${i.category||'-'}</td>
          <td><span class="${s<=(i.reorder_level||0)?'metric-value warn':''}">${s} ${i.unit||''}</span></td>
          <td>${i.reorder_level||0}</td>
        </tr>`;}).join('')}</tbody>
      </table></div>
    </div>
    <div class="card"><div class="section-title">Recent Transactions</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Item</th><th>Property</th><th>Type</th><th>By</th><th>Qty</th><th>Cost</th></tr></thead>
        <tbody>${(txns||[]).map(t=>`<tr>
          <td>${t.txn_date||'-'}</td>
          <td>${t.store_items?.item_name||'-'}</td>
          <td>${t.rooms?.unit_no||'General'}</td>
          <td><span class="badge ${t.txn_type==='In'?'green':'yellow'}">${t.txn_type}</span></td>
          <td>${t.received_by||'-'}</td>
          <td>${t.quantity} ${t.store_items?.unit||''}</td>
          <td>₹${(t.cost||0).toLocaleString('en-IN')}</td>
        </tr>`).join('')||'<tr><td colspan="7" class="sub">None</td></tr>'}</tbody>
      </table></div>
    </div>
  `, 'store');
}

async function renderAddItem() {
  renderShell(`
    <div class="card"><h1>➕ Add Item</h1><button class="secondary btn-sm" onclick="renderStore()">← Back</button></div>
    <div class="card">
      <div class="form-group"><label>Name *</label><input id="iName" /></div>
      <div class="form-grid">
        <div class="form-group"><label>Category</label>
          <select id="iCat"><option>Linen</option><option>Toiletries</option><option>Cleaning</option><option>Electronics</option><option>Kitchen</option><option>Other</option></select>
        </div>
        <div class="form-group"><label>Unit</label><input id="iUnit" placeholder="pcs/kg/liter" /></div>
      </div>
      <div class="form-group"><label>Reorder Level</label><input id="iReorder" type="number" value="0" /></div>
      <button onclick="saveItem()" style="width:100%;">💾 Save</button><div id="iErr"></div>
    </div>
  `, 'store');
}

async function saveItem() {
  const name=document.getElementById('iName').value.trim();
  if(!name){document.getElementById('iErr').innerHTML='<div class="error">Name required</div>';return;}
  await sb.from('store_items').insert({item_id:'ITM'+Date.now(),item_name:name,category:document.getElementById('iCat').value,unit:document.getElementById('iUnit').value.trim()||null,reorder_level:parseFloat(document.getElementById('iReorder').value)||0});
  renderStore();
}

async function renderAddTxn() {
  const [{data:items},{data:rooms},{data:emps}] = await Promise.all([
    sb.from('store_items').select('item_id,item_name,unit').order('item_name'),
    sb.from('rooms').select('room_id,unit_no,nickname').order('room_id'),
    sb.from('employees').select('emp_id,name').eq('status','Active').order('name')
  ]);

  renderShell(`
    <div class="card"><h1>🔄 Stock In/Out</h1><button class="secondary btn-sm" onclick="renderStore()">← Back</button></div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Item *</label>
          <select id="txItem"><option value="">Select</option>
            ${(items||[]).map(i=>`<option value="${i.item_id}">${i.item_name} (${i.unit||'pcs'})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Type *</label>
          <select id="txType">
            <option value="In">Stock In (Purchase)</option>
            <option value="Out">Stock Out (Used)</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="txRoom">
            <option value="">General / All</option>
            ${(rooms||[]).map(r=>`<option value="${r.room_id}">${r.nickname||r.unit_no}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Received / Given By</label>
          <select id="txReceivedBy">
            <option value="">-- Select --</option>
            ${(emps||[]).map(e=>`<option value="${e.name}">${e.name}</option>`).join('')}
            <option value="Vendor">Vendor</option>
            <option value="Owner">Owner</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Quantity *</label><input id="txQty" type="number" placeholder="e.g. 10" /></div>
        <div class="form-group"><label>Cost ₹ (total)</label><input id="txCost" type="number" value="0" /></div>
      </div>
      <div class="form-group"><label>Date</label><input id="txDate" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div class="form-group"><label>Notes</label><input id="txNotes" placeholder="Optional" /></div>
      <button onclick="saveTxn()" style="width:100%;">💾 Save</button>
      <div id="txErr"></div>
    </div>
  `, 'store');
}

async function saveTxn() {
  const iid = document.getElementById('txItem').value;
  const qty = parseFloat(document.getElementById('txQty').value) || 0;
  if (!iid || qty <= 0) { document.getElementById('txErr').innerHTML='<div class="error">Item & qty required</div>'; return; }

  const { error } = await sb.from('stock_transactions').insert({
    item_id: iid,
    room_id: document.getElementById('txRoom').value || null,
    txn_type: document.getElementById('txType').value,
    quantity: qty,
    cost: parseFloat(document.getElementById('txCost').value) || 0,
    txn_date: document.getElementById('txDate').value || null,
    received_by: document.getElementById('txReceivedBy').value || null,
    notes: document.getElementById('txNotes').value.trim() || null
  });

  if (error) { document.getElementById('txErr').innerHTML=`<div class="error">${error.message}</div>`; return; }
  renderStore();
}

async function saveTxn() {
  const iid=document.getElementById('txItem').value, qty=parseFloat(document.getElementById('txQty').value)||0;
  if(!iid||qty<=0){document.getElementById('txErr').innerHTML='<div class="error">Item & qty required</div>';return;}
  await sb.from('stock_transactions').insert({item_id:iid,room_id:document.getElementById('txRoom').value||null,txn_type:document.getElementById('txType').value,quantity:qty,cost:parseFloat(document.getElementById('txCost').value)||0,txn_date:document.getElementById('txDate').value||null});
  renderStore();
}